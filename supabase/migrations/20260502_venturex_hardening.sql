-- ============================================================
-- VentureX: Security Hardening, Rate Limiting, Dispute System,
--           Reputation Engine, Balance Reconciliation
-- ============================================================

-- ── 1. Rate-limiting table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.venturex_rate_limits (
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action       TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count        INTEGER DEFAULT 1,
  PRIMARY KEY (user_id, action, window_start)
);
ALTER TABLE public.venturex_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rate_limits_own" ON public.venturex_rate_limits FOR ALL USING (auth.uid() = user_id);

-- ── 2. Verification records (who verified, how, when) ───────────────────────
CREATE TABLE IF NOT EXISTS public.venturex_verification_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID REFERENCES public.venturex_companies(id) ON DELETE CASCADE,
  verification_type TEXT NOT NULL,     -- 'financial' | 'identity' | 'traction'
  source            TEXT NOT NULL,     -- 'self_declared' | 'document_upload' | 'manual_review'
  verifier_id       UUID REFERENCES auth.users(id),
  document_url      TEXT,
  notes             TEXT,
  status            TEXT DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
  verified_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.venturex_verification_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "verif_read_own" ON public.venturex_verification_records FOR SELECT
  USING (company_id IN (SELECT id FROM venturex_companies WHERE user_id = auth.uid()));
CREATE POLICY "verif_insert_own" ON public.venturex_verification_records FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM venturex_companies WHERE user_id = auth.uid()));

-- ── 3. Dispute resolution columns ───────────────────────────────────────────
ALTER TABLE public.venturex_deals
  ADD COLUMN IF NOT EXISTS dispute_status        TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS dispute_notes_company  TEXT,
  ADD COLUMN IF NOT EXISTS dispute_notes_investor TEXT,
  ADD COLUMN IF NOT EXISTS dispute_resolution     TEXT,
  ADD COLUMN IF NOT EXISTS dispute_resolver_id    UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS dispute_resolved_at    TIMESTAMPTZ;

-- ── 4. Reputation columns ───────────────────────────────────────────────────
ALTER TABLE public.venturex_companies
  ADD COLUMN IF NOT EXISTS founder_score   NUMERIC DEFAULT 50,
  ADD COLUMN IF NOT EXISTS deals_completed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deals_defaulted INTEGER DEFAULT 0;

ALTER TABLE public.venturex_investors
  ADD COLUMN IF NOT EXISTS reliability_score NUMERIC DEFAULT 50,
  ADD COLUMN IF NOT EXISTS deals_funded      INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deals_completed   INTEGER DEFAULT 0;

-- ── 5. System balance reconciliation view ───────────────────────────────────
CREATE OR REPLACE VIEW public.venturex_balance_check AS
SELECT
  COALESCE((SELECT SUM(liquid_usd) FROM public.balances), 0)
    AS total_user_balances,
  COALESCE((SELECT SUM(escrow_balance) FROM public.venturex_deals
            WHERE escrow_funded = TRUE AND status NOT IN ('completed','cancelled')), 0)
    AS total_in_escrow,
  COALESCE((SELECT SUM(funds_released) FROM public.venturex_deals), 0)
    AS total_released_to_founders,
  COALESCE((SELECT COUNT(*) FROM public.venturex_deals WHERE dispute_status = 'pending'), 0)
    AS open_disputes,
  NOW() AS checked_at;

-- Grant read to authenticated users (admins query this directly)
GRANT SELECT ON public.venturex_balance_check TO authenticated;

-- ── 6. Rate-limit helper (internal, called by other functions) ───────────────
CREATE OR REPLACE FUNCTION public.venturex_check_rate(p_action TEXT, p_max_per_hour INTEGER DEFAULT 10)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  INSERT INTO venturex_rate_limits(user_id, action, window_start, count)
  VALUES(auth.uid(), p_action, date_trunc('hour', NOW()), 1)
  ON CONFLICT (user_id, action, window_start)
  DO UPDATE SET count = venturex_rate_limits.count + 1
  RETURNING count INTO v_count;
  IF v_count > p_max_per_hour THEN
    RAISE EXCEPTION 'Rate limit: max % calls/hour for %. Try again later.', p_max_per_hour, p_action;
  END IF;
END;
$$;

-- ── 7. HARDENED venturex_fund_escrow ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.venturex_fund_escrow(p_deal_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_deal          venturex_deals%ROWTYPE;
  v_investor_bal  NUMERIC;
  v_commission    NUMERIC;
  v_escrow_amount NUMERIC;
BEGIN
  -- Hard auth check — never rely on frontend
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  -- Rate limit: 5 escrow fundings per hour
  PERFORM venturex_check_rate('fund_escrow', 5);

  SELECT * INTO v_deal FROM venturex_deals WHERE id = p_deal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Deal not found'; END IF;
  IF v_deal.investor_user_id != auth.uid() THEN RAISE EXCEPTION 'Only the investor can fund escrow'; END IF;
  IF v_deal.status NOT IN ('accepted','proposed') THEN RAISE EXCEPTION 'Deal is not in a fundable state (status: %)', v_deal.status; END IF;
  IF v_deal.escrow_funded THEN RAISE EXCEPTION 'Escrow already funded'; END IF;
  IF v_deal.amount <= 0 THEN RAISE EXCEPTION 'Invalid deal amount'; END IF;

  SELECT COALESCE(liquid_usd, 0) INTO v_investor_bal FROM balances WHERE user_id = v_deal.investor_user_id;
  IF v_investor_bal < v_deal.amount THEN
    RAISE EXCEPTION 'Insufficient balance. Have $%, need $%', ROUND(v_investor_bal,2), ROUND(v_deal.amount,2);
  END IF;

  v_commission    := ROUND(v_deal.amount * v_deal.ifb_commission_rate / 100, 2);
  v_escrow_amount := v_deal.amount - v_commission;

  -- Atomically deduct from investor
  UPDATE balances SET liquid_usd = liquid_usd - v_deal.amount WHERE user_id = v_deal.investor_user_id;

  INSERT INTO transactions(user_id, type, amount, description, status)
  VALUES(v_deal.investor_user_id, 'venturex_escrow_lock', -v_deal.amount,
         'VentureX escrow locked (' || p_deal_id || ')', 'completed');
  INSERT INTO transactions(user_id, type, amount, description, status)
  VALUES(v_deal.investor_user_id, 'venturex_ifb_commission', -v_commission,
         'IFB platform fee ' || v_deal.ifb_commission_rate || '%', 'completed');

  UPDATE venturex_deals SET
    escrow_balance = v_escrow_amount,
    escrow_funded  = TRUE,
    status         = 'active',
    updated_at     = NOW()
  WHERE id = p_deal_id;

  -- Update investor deals_funded count
  UPDATE venturex_investors SET deals_funded = COALESCE(deals_funded,0) + 1 WHERE user_id = auth.uid();

  INSERT INTO venturex_audit_log(deal_id, event_type, amount, actor_id, notes)
  VALUES(p_deal_id, 'escrow_funded', v_deal.amount, auth.uid(),
         format('$%s to escrow, $%s IFB fee', v_escrow_amount, v_commission));

  RETURN jsonb_build_object('ok', true, 'escrow_amount', v_escrow_amount, 'commission', v_commission);
END;
$$;

-- ── 8. HARDENED release_milestone_funds ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.release_milestone_funds(p_milestone_id UUID, p_verifier_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_milestone     venturex_milestones%ROWTYPE;
  v_deal          venturex_deals%ROWTYPE;
  v_new_completed INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  PERFORM venturex_check_rate('release_milestone', 20);

  SELECT * INTO v_milestone FROM venturex_milestones WHERE id = p_milestone_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Milestone not found'; END IF;
  IF v_milestone.is_verified THEN RAISE EXCEPTION 'Already released'; END IF;
  IF NOT v_milestone.is_completed THEN RAISE EXCEPTION 'Milestone not marked complete yet'; END IF;

  SELECT * INTO v_deal FROM venturex_deals WHERE id = v_milestone.deal_id FOR UPDATE;
  -- Only investor can release funds
  IF auth.uid() != v_deal.investor_user_id THEN RAISE EXCEPTION 'Only the investor can release milestone funds'; END IF;
  IF NOT v_deal.escrow_funded THEN RAISE EXCEPTION 'Escrow not funded — fund the deal first'; END IF;
  IF v_deal.dispute_status IN ('pending','under_review') THEN RAISE EXCEPTION 'Cannot release funds while dispute is open'; END IF;
  IF v_deal.escrow_balance < v_milestone.fund_amount THEN
    RAISE EXCEPTION 'Escrow has $%, milestone needs $%', ROUND(v_deal.escrow_balance,2), ROUND(v_milestone.fund_amount,2);
  END IF;

  v_new_completed := v_deal.completed_milestones + 1;

  UPDATE venturex_milestones SET is_verified = TRUE, verified_at = NOW() WHERE id = p_milestone_id;
  UPDATE balances SET liquid_usd = liquid_usd + v_milestone.fund_amount WHERE user_id = v_deal.company_user_id;
  UPDATE venturex_deals SET
    escrow_balance       = escrow_balance - v_milestone.fund_amount,
    funds_released       = funds_released + v_milestone.fund_amount,
    completed_milestones = v_new_completed,
    status               = CASE WHEN v_new_completed >= total_milestones THEN 'completed' ELSE status END,
    updated_at           = NOW()
  WHERE id = v_milestone.deal_id;

  INSERT INTO transactions(user_id, type, amount, description, status)
  VALUES(v_deal.company_user_id, 'venturex_milestone_release', v_milestone.fund_amount,
         'Milestone released: ' || v_milestone.title, 'completed');

  INSERT INTO venturex_audit_log(deal_id, milestone_id, event_type, amount, actor_id, notes)
  VALUES(v_milestone.deal_id, p_milestone_id, 'milestone_released', v_milestone.fund_amount,
         auth.uid(), 'Investor verified: ' || v_milestone.title);

  RETURN jsonb_build_object('ok', true, 'released', v_milestone.fund_amount, 'deal_id', v_milestone.deal_id);
END;
$$;

-- ── 9. HARDENED venturex_cancel_deal ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.venturex_cancel_deal(p_deal_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_deal venturex_deals%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT * INTO v_deal FROM venturex_deals WHERE id = p_deal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Deal not found'; END IF;
  IF auth.uid() NOT IN (v_deal.company_user_id, v_deal.investor_user_id) THEN
    RAISE EXCEPTION 'Not a party to this deal';
  END IF;
  IF v_deal.status IN ('completed','cancelled') THEN
    RAISE EXCEPTION 'Deal is already %', v_deal.status;
  END IF;
  -- Cannot cancel if in arbitration (must be resolved by admin)
  IF v_deal.dispute_status IN ('pending','under_review') AND
     NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','admin_l3','superadmin')) THEN
    RAISE EXCEPTION 'Cannot cancel while dispute is open — contact IFB arbitration';
  END IF;

  IF v_deal.escrow_funded AND v_deal.escrow_balance > 0 THEN
    UPDATE balances SET liquid_usd = liquid_usd + v_deal.escrow_balance WHERE user_id = v_deal.investor_user_id;
    INSERT INTO transactions(user_id, type, amount, description, status)
    VALUES(v_deal.investor_user_id, 'venturex_escrow_return', v_deal.escrow_balance,
           'Deal cancelled — escrow returned', 'completed');
  END IF;

  UPDATE venturex_deals SET
    status         = 'cancelled',
    escrow_balance = 0,
    cancelled_at   = NOW(),
    updated_at     = NOW()
  WHERE id = p_deal_id;

  INSERT INTO venturex_audit_log(deal_id, event_type, amount, actor_id, notes)
  VALUES(p_deal_id, 'deal_cancelled', v_deal.escrow_balance, auth.uid(), 'Cancelled and escrow returned');

  RETURN jsonb_build_object('ok', true, 'returned', v_deal.escrow_balance);
END;
$$;

-- ── 10. File dispute (either party, via RPC) ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.venturex_file_dispute(p_deal_id UUID, p_notes TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_deal      venturex_deals%ROWTYPE;
  v_is_comp   BOOLEAN;
  v_is_inv    BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  PERFORM venturex_check_rate('file_dispute', 3);

  SELECT * INTO v_deal FROM venturex_deals WHERE id = p_deal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Deal not found'; END IF;

  v_is_comp := (auth.uid() = v_deal.company_user_id);
  v_is_inv  := (auth.uid() = v_deal.investor_user_id);
  IF NOT (v_is_comp OR v_is_inv) THEN RAISE EXCEPTION 'Not a party to this deal'; END IF;
  IF v_deal.status NOT IN ('active','accepted') THEN RAISE EXCEPTION 'Can only dispute active deals'; END IF;
  IF v_deal.dispute_status IN ('pending','under_review') THEN RAISE EXCEPTION 'Dispute already open'; END IF;

  UPDATE venturex_deals SET
    dispute_flag           = TRUE,
    arbitration_required   = TRUE,
    dispute_status         = 'pending',
    dispute_notes_company  = CASE WHEN v_is_comp THEN p_notes ELSE dispute_notes_company END,
    dispute_notes_investor = CASE WHEN v_is_inv  THEN p_notes ELSE dispute_notes_investor END,
    updated_at             = NOW()
  WHERE id = p_deal_id;

  INSERT INTO venturex_audit_log(deal_id, event_type, actor_id, notes)
  VALUES(p_deal_id, 'dispute_filed', auth.uid(), LEFT(p_notes, 500));

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ── 11. Admin: resolve dispute ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.venturex_resolve_dispute(
  p_deal_id        UUID,
  p_resolution     TEXT,      -- 'refund' | 'partial_release' | 'cancel' | 'continue'
  p_partial_amount NUMERIC DEFAULT 0,
  p_notes          TEXT    DEFAULT ''
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_deal venturex_deals%ROWTYPE;
BEGIN
  -- Admin-only
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin','admin_l3','superadmin')
  ) THEN RAISE EXCEPTION 'Admin access required'; END IF;

  SELECT * INTO v_deal FROM venturex_deals WHERE id = p_deal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Deal not found'; END IF;
  IF v_deal.dispute_status NOT IN ('pending','under_review') THEN RAISE EXCEPTION 'No open dispute'; END IF;

  CASE p_resolution
    WHEN 'refund' THEN
      IF v_deal.escrow_funded AND v_deal.escrow_balance > 0 THEN
        UPDATE balances SET liquid_usd = liquid_usd + v_deal.escrow_balance WHERE user_id = v_deal.investor_user_id;
        INSERT INTO transactions(user_id, type, amount, description, status)
        VALUES(v_deal.investor_user_id, 'venturex_dispute_refund', v_deal.escrow_balance, 'Dispute: full refund', 'completed');
        UPDATE venturex_deals SET escrow_balance = 0 WHERE id = p_deal_id;
      END IF;
      UPDATE venturex_deals SET status = 'cancelled', cancelled_at = NOW() WHERE id = p_deal_id;

    WHEN 'partial_release' THEN
      IF p_partial_amount <= 0 OR p_partial_amount > v_deal.escrow_balance THEN
        RAISE EXCEPTION 'Invalid partial amount %', p_partial_amount;
      END IF;
      UPDATE balances SET liquid_usd = liquid_usd + p_partial_amount            WHERE user_id = v_deal.company_user_id;
      UPDATE balances SET liquid_usd = liquid_usd + (v_deal.escrow_balance - p_partial_amount) WHERE user_id = v_deal.investor_user_id;
      INSERT INTO transactions(user_id, type, amount, description, status) VALUES
        (v_deal.company_user_id,  'venturex_dispute_partial', p_partial_amount,                         'Dispute: partial release', 'completed'),
        (v_deal.investor_user_id, 'venturex_dispute_return',  v_deal.escrow_balance - p_partial_amount, 'Dispute: partial return',  'completed');
      UPDATE venturex_deals SET status = 'completed', escrow_balance = 0, funds_released = funds_released + p_partial_amount WHERE id = p_deal_id;

    WHEN 'cancel' THEN
      IF v_deal.escrow_funded AND v_deal.escrow_balance > 0 THEN
        UPDATE balances SET liquid_usd = liquid_usd + v_deal.escrow_balance WHERE user_id = v_deal.investor_user_id;
        INSERT INTO transactions(user_id, type, amount, description, status)
        VALUES(v_deal.investor_user_id, 'venturex_dispute_cancel', v_deal.escrow_balance, 'Dispute: deal cancelled', 'completed');
        UPDATE venturex_deals SET escrow_balance = 0 WHERE id = p_deal_id;
      END IF;
      UPDATE venturex_deals SET status = 'cancelled', cancelled_at = NOW() WHERE id = p_deal_id;

    WHEN 'continue' THEN
      -- Clear dispute, deal continues unchanged
      NULL;

    ELSE RAISE EXCEPTION 'Invalid resolution: %', p_resolution;
  END CASE;

  UPDATE venturex_deals SET
    dispute_flag         = FALSE,
    dispute_status       = 'resolved',
    dispute_resolution   = p_resolution,
    dispute_resolver_id  = auth.uid(),
    dispute_resolved_at  = NOW(),
    updated_at           = NOW()
  WHERE id = p_deal_id;

  INSERT INTO venturex_audit_log(deal_id, event_type, amount, actor_id, notes)
  VALUES(p_deal_id, 'dispute_resolved', p_partial_amount, auth.uid(),
         format('Resolution: %s. %s', p_resolution, p_notes));

  RETURN jsonb_build_object('ok', true, 'resolution', p_resolution);
END;
$$;

-- ── 12. Reputation trigger ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.venturex_update_reputation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE venturex_companies SET
      deals_completed = COALESCE(deals_completed,0) + 1,
      founder_score   = LEAST(100, GREATEST(0, COALESCE(founder_score,50) + 8))
    WHERE user_id = NEW.company_user_id;

    UPDATE venturex_investors SET
      deals_completed  = COALESCE(deals_completed,0) + 1,
      reliability_score = LEAST(100, GREATEST(0, COALESCE(reliability_score,50) + 8))
    WHERE user_id = NEW.investor_user_id;

    INSERT INTO venturex_audit_log(deal_id, event_type, actor_id, notes)
    VALUES(NEW.id, 'reputation_updated', NEW.company_user_id, 'Scores +8 on deal completion');
  END IF;

  IF NEW.status = 'cancelled' AND OLD.status NOT IN ('cancelled','rejected') AND OLD.escrow_funded THEN
    UPDATE venturex_companies SET
      deals_defaulted = COALESCE(deals_defaulted,0) + 1,
      founder_score   = GREATEST(0, COALESCE(founder_score,50) - 5)
    WHERE user_id = NEW.company_user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS venturex_reputation_trigger ON public.venturex_deals;
CREATE TRIGGER venturex_reputation_trigger
  AFTER UPDATE ON public.venturex_deals
  FOR EACH ROW EXECUTE FUNCTION public.venturex_update_reputation();
