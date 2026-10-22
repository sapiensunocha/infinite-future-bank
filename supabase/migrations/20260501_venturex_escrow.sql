-- ============================================================
-- VentureX: Real Escrow + Audit + Remote Config
-- Wires into existing balances + transactions tables
-- ============================================================

-- ── Remote config (enables force-reset from Supabase dashboard) ─────────────
CREATE TABLE IF NOT EXISTS public.app_config (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT 'null',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "app_config_public_read" ON public.app_config FOR SELECT USING (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
INSERT INTO public.app_config(key, value) VALUES('force_reset_version', '"none"') ON CONFLICT DO NOTHING;

-- ── Extend venturex_deals with real escrow columns ───────────────────────────
ALTER TABLE public.venturex_deals
  ADD COLUMN IF NOT EXISTS escrow_balance  NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS escrow_funded   BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cancelled_at    TIMESTAMPTZ;

-- ── Verification flags on companies ─────────────────────────────────────────
ALTER TABLE public.venturex_companies
  ADD COLUMN IF NOT EXISTS financial_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS identity_verified  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS traction_verified  BOOLEAN DEFAULT FALSE;

-- ── Immutable audit log for all fund movements ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.venturex_audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id      UUID REFERENCES public.venturex_deals(id),
  milestone_id UUID REFERENCES public.venturex_milestones(id),
  event_type   TEXT NOT NULL,
  amount       NUMERIC DEFAULT 0,
  actor_id     UUID,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.venturex_audit_log ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "audit_log_deal_parties" ON public.venturex_audit_log FOR SELECT
    USING (deal_id IN (SELECT id FROM public.venturex_deals WHERE company_user_id = auth.uid() OR investor_user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── venturex_fund_escrow ─────────────────────────────────────────────────────
-- Investor calls this after company accepts the deal.
-- Moves real liquid_usd from investor → escrow tracked on the deal row.
CREATE OR REPLACE FUNCTION public.venturex_fund_escrow(p_deal_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_deal           venturex_deals%ROWTYPE;
  v_investor_bal   NUMERIC;
  v_commission     NUMERIC;
  v_escrow_amount  NUMERIC;
BEGIN
  SELECT * INTO v_deal FROM venturex_deals WHERE id = p_deal_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Deal not found'); END IF;
  IF v_deal.investor_user_id != auth.uid() THEN RETURN jsonb_build_object('error', 'Only the investor can fund escrow'); END IF;
  IF v_deal.status NOT IN ('accepted', 'proposed') THEN RETURN jsonb_build_object('error', 'Deal is not in a fundable state'); END IF;
  IF v_deal.escrow_funded THEN RETURN jsonb_build_object('error', 'Escrow already funded'); END IF;

  SELECT COALESCE(liquid_usd, 0) INTO v_investor_bal FROM balances WHERE user_id = v_deal.investor_user_id;
  IF v_investor_bal < v_deal.amount THEN
    RETURN jsonb_build_object('error', format('Insufficient balance. Need $%s, have $%s', v_deal.amount, v_investor_bal));
  END IF;

  v_commission    := ROUND(v_deal.amount * v_deal.ifb_commission_rate / 100, 2);
  v_escrow_amount := v_deal.amount - v_commission;

  -- Deduct full amount from investor's wallet
  UPDATE balances SET liquid_usd = liquid_usd - v_deal.amount WHERE user_id = v_deal.investor_user_id;

  -- Record investor outflow
  INSERT INTO transactions(user_id, type, amount, description, status)
  VALUES(v_deal.investor_user_id, 'venturex_escrow_lock', -v_deal.amount,
         'VentureX deal escrow locked (' || p_deal_id || ')', 'completed');

  -- Record IFB commission
  INSERT INTO transactions(user_id, type, amount, description, status)
  VALUES(v_deal.investor_user_id, 'venturex_ifb_commission', -v_commission,
         'IFB platform commission (' || v_deal.ifb_commission_rate || '%)', 'completed');

  -- Update deal record
  UPDATE venturex_deals SET
    escrow_balance = v_escrow_amount,
    escrow_funded  = TRUE,
    status         = 'active',
    updated_at     = NOW()
  WHERE id = p_deal_id;

  -- Immutable audit entry
  INSERT INTO venturex_audit_log(deal_id, event_type, amount, actor_id, notes)
  VALUES(p_deal_id, 'escrow_funded', v_deal.amount, auth.uid(),
         format('Escrow funded: $%s total, $%s to escrow, $%s IFB commission', v_deal.amount, v_escrow_amount, v_commission));

  RETURN jsonb_build_object('ok', true, 'escrow_amount', v_escrow_amount, 'commission', v_commission);
END;
$$;

-- ── release_milestone_funds — now moves REAL money ───────────────────────────
CREATE OR REPLACE FUNCTION public.release_milestone_funds(p_milestone_id UUID, p_verifier_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_milestone venturex_milestones%ROWTYPE;
  v_deal      venturex_deals%ROWTYPE;
  v_new_completed INTEGER;
BEGIN
  SELECT * INTO v_milestone FROM venturex_milestones WHERE id = p_milestone_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Milestone not found'); END IF;
  IF v_milestone.is_verified THEN RETURN jsonb_build_object('error', 'Already released'); END IF;
  IF NOT v_milestone.is_completed THEN RETURN jsonb_build_object('error', 'Milestone not completed yet'); END IF;

  SELECT * INTO v_deal FROM venturex_deals WHERE id = v_milestone.deal_id FOR UPDATE;

  IF auth.uid() != v_deal.investor_user_id THEN
    RETURN jsonb_build_object('error', 'Only the investor can release milestone funds');
  END IF;

  IF NOT v_deal.escrow_funded THEN
    RETURN jsonb_build_object('error', 'Escrow not funded yet — fund the deal first');
  END IF;

  IF v_deal.escrow_balance < v_milestone.fund_amount THEN
    RETURN jsonb_build_object('error', format('Escrow has $%s, milestone needs $%s', v_deal.escrow_balance, v_milestone.fund_amount));
  END IF;

  v_new_completed := v_deal.completed_milestones + 1;

  -- Mark milestone verified
  UPDATE venturex_milestones SET is_verified = TRUE, verified_at = NOW() WHERE id = p_milestone_id;

  -- Transfer money to company's wallet
  UPDATE balances SET liquid_usd = liquid_usd + v_milestone.fund_amount WHERE user_id = v_deal.company_user_id;

  -- Update deal escrow + counters
  UPDATE venturex_deals SET
    escrow_balance       = escrow_balance - v_milestone.fund_amount,
    funds_released       = funds_released + v_milestone.fund_amount,
    completed_milestones = v_new_completed,
    status               = CASE WHEN v_new_completed >= total_milestones THEN 'completed' ELSE status END,
    updated_at           = NOW()
  WHERE id = v_milestone.deal_id;

  -- Log company inflow
  INSERT INTO transactions(user_id, type, amount, description, status)
  VALUES(v_deal.company_user_id, 'venturex_milestone_release', v_milestone.fund_amount,
         'Milestone released: ' || v_milestone.title, 'completed');

  -- Immutable audit log
  INSERT INTO venturex_audit_log(deal_id, milestone_id, event_type, amount, actor_id, notes)
  VALUES(v_milestone.deal_id, p_milestone_id, 'milestone_released', v_milestone.fund_amount,
         auth.uid(), 'Investor verified milestone: ' || v_milestone.title);

  RETURN jsonb_build_object('ok', true, 'released', v_milestone.fund_amount, 'deal_id', v_milestone.deal_id);
END;
$$;

-- ── venturex_cancel_deal — returns escrow to investor ───────────────────────
CREATE OR REPLACE FUNCTION public.venturex_cancel_deal(p_deal_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_deal venturex_deals%ROWTYPE;
BEGIN
  SELECT * INTO v_deal FROM venturex_deals WHERE id = p_deal_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Deal not found'); END IF;

  IF auth.uid() NOT IN (v_deal.company_user_id, v_deal.investor_user_id) THEN
    RETURN jsonb_build_object('error', 'Not a party to this deal');
  END IF;

  IF v_deal.status IN ('completed', 'cancelled') THEN
    RETURN jsonb_build_object('error', 'Deal already ' || v_deal.status);
  END IF;

  -- Return escrow to investor if it was funded
  IF v_deal.escrow_funded AND v_deal.escrow_balance > 0 THEN
    UPDATE balances SET liquid_usd = liquid_usd + v_deal.escrow_balance WHERE user_id = v_deal.investor_user_id;
    INSERT INTO transactions(user_id, type, amount, description, status)
    VALUES(v_deal.investor_user_id, 'venturex_escrow_return', v_deal.escrow_balance,
           'Deal cancelled — escrow returned', 'completed');
  END IF;

  UPDATE venturex_deals SET
    status       = 'cancelled',
    escrow_balance = 0,
    cancelled_at = NOW(),
    updated_at   = NOW()
  WHERE id = p_deal_id;

  INSERT INTO venturex_audit_log(deal_id, event_type, amount, actor_id, notes)
  VALUES(p_deal_id, 'deal_cancelled', v_deal.escrow_balance, auth.uid(), 'Deal cancelled and escrow returned');

  RETURN jsonb_build_object('ok', true, 'returned', v_deal.escrow_balance);
END;
$$;
