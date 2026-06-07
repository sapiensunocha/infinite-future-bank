-- ============================================================
-- CRITICAL FIXES — 2026-06-07
-- 1. Fix provision_new_user (email_lower is GENERATED, can't insert)
-- 2. Create p2p_transfer RPC (was missing — all transfers were broken)
-- 3. Add failed_operations table + log_failed_operation fn
-- 4. Extend get_platform_stats with KYC breakdown
-- 5. Add minimum_balance_enforcement for new verified users ($3)
-- 6. Balance sanity cap for non-admin users
-- ============================================================

-- ─── 1. FIX provision_new_user ──────────────────────────────
-- Bug: email_lower is GENERATED ALWAYS AS (lower(email)) STORED
-- PostgreSQL refuses to INSERT into generated columns → all new signups fail
CREATE OR REPLACE FUNCTION public.provision_new_user(
  p_user_id  UUID,
  p_full_name TEXT,
  p_ref_code  TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email        TEXT;
  v_ref_user_id  UUID;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;

  -- Insert profile — do NOT include email_lower (it's GENERATED ALWAYS)
  INSERT INTO public.profiles (
    id, full_name, email,
    created_at, updated_at, role
  )
  VALUES (
    p_user_id,
    p_full_name,
    v_email,
    NOW(), NOW(), 'user'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Insert initial balance row
  INSERT INTO public.balances (
    user_id, liquid_usd, alpha_equity_usd, mysafe_digital_usd,
    afr_balance, created_at, updated_at
  )
  VALUES (p_user_id, 0, 0, 0, 0, NOW(), NOW())
  ON CONFLICT (user_id) DO NOTHING;

  -- Referral bonus
  IF p_ref_code IS NOT NULL THEN
    SELECT id INTO v_ref_user_id
    FROM public.profiles
    WHERE referral_code = p_ref_code
    LIMIT 1;

    IF v_ref_user_id IS NOT NULL THEN
      UPDATE public.balances SET afr_balance = afr_balance + 500 WHERE user_id = v_ref_user_id;
      UPDATE public.balances SET afr_balance = afr_balance + 200 WHERE user_id = p_user_id;
    END IF;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.provision_new_user(UUID, TEXT, TEXT) TO authenticated;


-- ─── 2. CREATE p2p_transfer RPC ─────────────────────────────
-- Atomically deducts from sender, credits receiver, logs both transactions
DROP FUNCTION IF EXISTS public.p2p_transfer(UUID, UUID, NUMERIC);
CREATE OR REPLACE FUNCTION public.p2p_transfer(
  sender_id       UUID,
  receiver_id     UUID,
  transfer_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_balance    NUMERIC;
  v_sender_name       TEXT;
  v_receiver_name     TEXT;
  v_transfer_fee      NUMERIC := 0;
  v_min_balance       NUMERIC := 0;
BEGIN
  -- Lock rows to prevent race conditions
  SELECT liquid_usd INTO v_sender_balance
  FROM public.balances
  WHERE user_id = sender_id
  FOR UPDATE;

  IF v_sender_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sender account not found');
  END IF;

  IF transfer_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transfer amount must be greater than zero');
  END IF;

  IF v_sender_balance < transfer_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance',
      'available', v_sender_balance, 'requested', transfer_amount);
  END IF;

  -- After transfer, sender must retain at least $0 (no overdraft)
  IF (v_sender_balance - transfer_amount) < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transfer would cause negative balance');
  END IF;

  SELECT full_name INTO v_sender_name   FROM public.profiles WHERE id = sender_id;
  SELECT full_name INTO v_receiver_name FROM public.profiles WHERE id = receiver_id;

  IF v_receiver_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recipient account not found');
  END IF;

  -- Deduct from sender
  UPDATE public.balances
  SET liquid_usd = liquid_usd - transfer_amount, updated_at = NOW()
  WHERE user_id = sender_id;

  -- Credit receiver
  UPDATE public.balances
  SET liquid_usd = liquid_usd + transfer_amount, updated_at = NOW()
  WHERE user_id = receiver_id;

  -- Log sender debit transaction
  INSERT INTO public.transactions (user_id, amount, transaction_type, description, status, created_at, metadata)
  VALUES (
    sender_id,
    -transfer_amount,
    'p2p_send',
    'Transfer to ' || COALESCE(v_receiver_name, 'User'),
    'completed',
    NOW(),
    jsonb_build_object('counterpart_id', receiver_id, 'counterpart_name', v_receiver_name)
  );

  -- Log receiver credit transaction
  INSERT INTO public.transactions (user_id, amount, transaction_type, description, status, created_at, metadata)
  VALUES (
    receiver_id,
    transfer_amount,
    'p2p_receive',
    'Transfer from ' || COALESCE(v_sender_name, 'User'),
    'completed',
    NOW(),
    jsonb_build_object('counterpart_id', sender_id, 'counterpart_name', v_sender_name)
  );

  -- In-app notification for receiver
  INSERT INTO public.notifications (user_id, type, read, status, message, created_at)
  VALUES (
    receiver_id,
    'transfer_received',
    false,
    'completed',
    'You received $' || transfer_amount::TEXT || ' from ' || COALESCE(v_sender_name, 'a user') || '.',
    NOW()
  )
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'amount', transfer_amount,
    'sender', v_sender_name,
    'receiver', v_receiver_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.p2p_transfer(UUID, UUID, NUMERIC) TO authenticated;


-- ─── 3. failed_operations TABLE + log_failed_operation ───────
CREATE TABLE IF NOT EXISTS public.failed_operations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  operation     TEXT NOT NULL,          -- 'transfer', 'kyc', 'deposit', etc.
  error_code    TEXT,
  error_message TEXT NOT NULL,
  context       JSONB DEFAULT '{}',
  notified_app  BOOLEAN DEFAULT FALSE,
  notified_email BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.failed_operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "failed_ops_own" ON public.failed_operations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "failed_ops_admin" ON public.failed_operations FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super','ops','finance')));

-- Function to log a failed op + push notification
CREATE OR REPLACE FUNCTION public.log_failed_operation(
  p_user_id       UUID,
  p_operation     TEXT,
  p_error_message TEXT,
  p_error_code    TEXT DEFAULT NULL,
  p_context       JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_op_id UUID;
  v_title TEXT;
  v_body  TEXT;
BEGIN
  INSERT INTO public.failed_operations (user_id, operation, error_code, error_message, context)
  VALUES (p_user_id, p_operation, p_error_code, p_error_message, p_context)
  RETURNING id INTO v_op_id;

  -- Human-readable title per operation type
  v_title := CASE p_operation
    WHEN 'transfer'   THEN '⚠️ Transfer Failed'
    WHEN 'deposit'    THEN '⚠️ Deposit Failed'
    WHEN 'withdrawal' THEN '⚠️ Withdrawal Failed'
    WHEN 'kyc'        THEN '⚠️ KYC Submission Issue'
    WHEN 'loan'       THEN '⚠️ Loan Request Issue'
    ELSE '⚠️ Operation Failed'
  END;

  v_body := p_error_message || CASE WHEN p_error_code IS NOT NULL THEN ' (Code: ' || p_error_code || ')' ELSE '' END;

  -- Push in-app notification
  INSERT INTO public.notifications (user_id, type, read, status, message, created_at)
  VALUES (p_user_id, 'operation_failed', false, 'failed', v_title || ' — ' || v_body, NOW())
  ON CONFLICT DO NOTHING;

  UPDATE public.failed_operations SET notified_app = TRUE WHERE id = v_op_id;

  RETURN v_op_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_failed_operation(UUID,TEXT,TEXT,TEXT,JSONB) TO authenticated;


-- ─── 4. EXTENDED get_platform_stats (KYC breakdown) ─────────
DROP FUNCTION IF EXISTS public.get_platform_stats();
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  RETURN jsonb_build_object(
    -- User metrics
    'total_users',          (SELECT COUNT(*) FROM public.profiles),
    'new_users_7d',         (SELECT COUNT(*) FROM public.profiles WHERE created_at >= NOW() - INTERVAL '7 days'),
    'new_users_30d',        (SELECT COUNT(*) FROM public.profiles WHERE created_at >= NOW() - INTERVAL '30 days'),
    'verified_users',       (SELECT COUNT(*) FROM public.profiles WHERE kyc_status IN ('verified','approved')),
    'unverified_users',     (SELECT COUNT(*) FROM public.profiles WHERE kyc_status NOT IN ('verified','approved') OR kyc_status IS NULL),

    -- KYC breakdown
    'kyc_pending',          (SELECT COUNT(*) FROM public.kyc_submissions WHERE status = 'pending'),
    'kyc_approved',         (SELECT COUNT(*) FROM public.kyc_submissions WHERE status = 'approved'),
    'kyc_rejected',         (SELECT COUNT(*) FROM public.kyc_submissions WHERE status = 'rejected'),
    'kyc_ai_reviewing',     (SELECT COUNT(*) FROM public.kyc_submissions WHERE status = 'ai_reviewing'),
    'kyc_needs_info',       (SELECT COUNT(*) FROM public.kyc_submissions WHERE status = 'needs_more_info'),
    'kyc_total',            (SELECT COUNT(*) FROM public.kyc_submissions),
    'kyc_avg_ai_confidence',(SELECT ROUND(AVG(ai_confidence_score)::NUMERIC, 1) FROM public.kyc_submissions WHERE ai_confidence_score IS NOT NULL),
    'kyc_risk_low',         (SELECT COUNT(*) FROM public.kyc_submissions WHERE risk_rating = 'low'),
    'kyc_risk_medium',      (SELECT COUNT(*) FROM public.kyc_submissions WHERE risk_rating = 'medium'),
    'kyc_risk_high',        (SELECT COUNT(*) FROM public.kyc_submissions WHERE risk_rating = 'high'),

    -- Financial metrics
    'total_balance',        (SELECT COALESCE(SUM(liquid_usd + alpha_equity_usd + mysafe_digital_usd), 0) FROM public.balances),
    'total_liquid',         (SELECT COALESCE(SUM(liquid_usd), 0) FROM public.balances),
    'total_mysafe',         (SELECT COALESCE(SUM(mysafe_digital_usd), 0) FROM public.balances),
    'txn_volume',           (SELECT COALESCE(SUM(ABS(amount)), 0) FROM public.transactions WHERE created_at >= NOW() - INTERVAL '30 days'),
    'txn_volume_7d',        (SELECT COALESCE(SUM(ABS(amount)), 0) FROM public.transactions WHERE created_at >= NOW() - INTERVAL '7 days'),
    'total_txns',           (SELECT COUNT(*) FROM public.transactions),
    'failed_ops_24h',       (SELECT COUNT(*) FROM public.failed_operations WHERE created_at >= NOW() - INTERVAL '24 hours'),

    -- P2P
    'p2p_open',             (SELECT COUNT(*) FROM public.p2p_orders WHERE status = 'open'),
    'p2p_volume',           (SELECT COALESCE(SUM(amount_usd), 0) FROM public.p2p_orders WHERE status = 'completed'),

    -- VentureX
    'venturex_companies',   (SELECT COUNT(*) FROM public.venturex_companies),
    'active_companies',     (SELECT COUNT(*) FROM public.venturex_companies WHERE status = 'active'),

    -- Support
    'open_tickets',         (SELECT COUNT(*) FROM public.support_tickets WHERE status = 'open'),

    -- AFR
    'total_afr_tx',         (SELECT COUNT(*) FROM public.afr_ledger),
    'total_afr_volume',     (SELECT COALESCE(SUM(usd_equivalent), 0) FROM public.afr_ledger WHERE status = 'confirmed'),
    'pending_kyc',          (SELECT COUNT(*) FROM public.kyc_submissions WHERE status IN ('pending','p2p_review','ai_reviewing'))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_platform_stats() TO authenticated;


-- ─── 5. MINIMUM BALANCE ENFORCEMENT ($3 for new verified users) ─
-- Called when KYC is approved — ensures user has at least $3
CREATE OR REPLACE FUNCTION public.enforce_minimum_balance_on_verify(
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current NUMERIC;
BEGIN
  SELECT liquid_usd INTO v_current FROM public.balances WHERE user_id = p_user_id;

  -- If balance < $3, just note it — don't auto-credit (they need to fund via card or transfer)
  -- This function is a check — the UI enforces the gate
  IF v_current < 3 THEN
    INSERT INTO public.notifications (user_id, type, read, status, message, created_at)
    VALUES (
      p_user_id,
      'system',
      false,
      'action_required',
      '🎉 KYC Approved! To unlock all IFB features, please add a minimum of $3 to your account via card deposit or a transfer from a friend.',
      NOW()
    )
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enforce_minimum_balance_on_verify(UUID) TO authenticated;

-- Hook into admin_update_kyc: trigger minimum balance notification on approval
CREATE OR REPLACE FUNCTION public.trg_kyc_approved_minimum_balance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    PERFORM public.enforce_minimum_balance_on_verify(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS kyc_approved_min_balance ON public.kyc_submissions;
CREATE TRIGGER kyc_approved_min_balance
  AFTER UPDATE OF status ON public.kyc_submissions
  FOR EACH ROW EXECUTE FUNCTION public.trg_kyc_approved_minimum_balance();


-- ─── 6. BALANCE SANITY CAP (fix phantom thousands) ──────────
-- Identify users with suspiciously high liquid_usd (> $50,000)
-- and non-admin role — log for review, don't auto-correct
CREATE TABLE IF NOT EXISTS public.balance_audit_flags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.profiles(id),
  flagged_at  TIMESTAMPTZ DEFAULT NOW(),
  liquid_usd  NUMERIC,
  reason      TEXT,
  resolved    BOOLEAN DEFAULT FALSE
);

INSERT INTO public.balance_audit_flags (user_id, liquid_usd, reason)
SELECT b.user_id, b.liquid_usd, 'Auto-flagged: liquid_usd > $50,000 for non-admin user'
FROM public.balances b
JOIN public.profiles p ON p.id = b.user_id
WHERE b.liquid_usd > 50000
  AND p.role NOT IN ('super','finance','ops')
ON CONFLICT DO NOTHING;
