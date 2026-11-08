-- ============================================================================
-- 20261113 — safe backends for Instant Deposit, Card Payout and third-party ID checks
--
-- 1. Instant Direct Deposit: the app creates a deposit_intent and the user pays
--    through Flutterwave (card, bank transfer, USSD; USD or NGN). The wallet is
--    credited ONLY by complete_deposit_intent(), called by the verified
--    flutterwave-webhook. The client can never credit itself.
-- 2. Card payout: cards are saved by the payout-cards edge function, which keeps
--    the card number AES-GCM encrypted (key outside the database) and stores
--    only brand / last 4 / expiry in readable columns. The CVC is never asked
--    for or stored (payouts don't need it). A payout request moves the money into
--    escrow; IFB operations settle it (paid → escrow released, failed → refunded).
-- 3. kyc_id_checks: results of ID number checks with a third-party provider
--    (Smile ID), written by the kyc-verify-id edge function.
-- Requires: public._is_trusted_backend(), public.is_admin(), public.credit_deposit().
-- ============================================================================

BEGIN;

-- ── 1. Instant Direct Deposit ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deposit_intents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_usd      NUMERIC(14,2) NOT NULL CHECK (amount_usd >= 1 AND amount_usd <= 10000),
  charge_currency TEXT NOT NULL CHECK (charge_currency ~ '^[A-Z]{3}$'),   -- USD, NGN, or a mobile-money currency (GHS, KES, …)
  charge_amount   NUMERIC(16,2) NOT NULL CHECK (charge_amount > 0),
  fx_rate         NUMERIC(18,6),                 -- local units per 1 USD at quote time
  provider        TEXT NOT NULL DEFAULT 'flutterwave',
  tx_ref          TEXT NOT NULL UNIQUE,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'expired')),
  provider_ref    TEXT,
  failure_reason  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT now() + interval '2 hours',
  completed_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS deposit_intents_user_idx ON public.deposit_intents (user_id, created_at DESC);
ALTER TABLE public.deposit_intents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deposit_intents_own_read ON public.deposit_intents;
CREATE POLICY deposit_intents_own_read ON public.deposit_intents FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
REVOKE ALL ON public.deposit_intents FROM anon, authenticated;
GRANT SELECT ON public.deposit_intents TO authenticated;

-- Called only by the payment webhook after the provider has verified the charge.
-- Returns 'credited' | 'already_done' | 'mismatch' | 'not_found'.
CREATE OR REPLACE FUNCTION public.complete_deposit_intent(
  p_tx_ref        TEXT,
  p_paid_amount   NUMERIC,
  p_paid_currency TEXT,
  p_provider_ref  TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_i public.deposit_intents%ROWTYPE;
BEGIN
  IF NOT public._is_trusted_backend() THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  IF p_provider_ref IS NULL OR length(trim(p_provider_ref)) = 0 THEN
    RAISE EXCEPTION 'provider reference required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_i FROM public.deposit_intents WHERE tx_ref = p_tx_ref FOR UPDATE;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF v_i.status = 'succeeded' THEN RETURN 'already_done'; END IF;

  -- The provider must have charged at least what we quoted, in the quoted currency.
  IF UPPER(COALESCE(p_paid_currency, '')) <> v_i.charge_currency
     OR COALESCE(p_paid_amount, 0) + 0.005 < v_i.charge_amount THEN
    UPDATE public.deposit_intents
       SET status = 'failed', provider_ref = p_provider_ref,
           failure_reason = format('paid %s %s, expected %s %s — manual review', p_paid_amount, p_paid_currency, v_i.charge_amount, v_i.charge_currency)
     WHERE id = v_i.id;
    RETURN 'mismatch';
  END IF;

  -- Same idempotency key as the generic Flutterwave deposit path, so one charge can never be credited twice.
  PERFORM public.credit_deposit(v_i.user_id, v_i.amount_usd, 'USD', 'flw:' || p_provider_ref, 'flutterwave_instant');

  UPDATE public.deposit_intents
     SET status = 'succeeded', provider_ref = p_provider_ref, completed_at = now(), failure_reason = NULL
   WHERE id = v_i.id;
  RETURN 'credited';
END;
$$;
REVOKE ALL ON FUNCTION public.complete_deposit_intent(TEXT, NUMERIC, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_deposit_intent(TEXT, NUMERIC, TEXT, TEXT) TO service_role;

-- ── 2. Card payout ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payout_cards (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  holder_name    TEXT NOT NULL CHECK (length(holder_name) BETWEEN 2 AND 120),
  brand          TEXT NOT NULL,
  last4          TEXT NOT NULL CHECK (last4 ~ '^[0-9]{4}$'),
  exp_month      INT  NOT NULL CHECK (exp_month BETWEEN 1 AND 12),
  exp_year       INT  NOT NULL CHECK (exp_year BETWEEN 2024 AND 2100),
  pan_ciphertext TEXT NOT NULL,             -- AES-GCM, key held by the edge function only
  pan_hash       TEXT NOT NULL,             -- HMAC of the number, to stop duplicates
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'removed')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS payout_cards_user_pan_uniq ON public.payout_cards (user_id, pan_hash) WHERE status = 'active';
ALTER TABLE public.payout_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payout_cards_own_read ON public.payout_cards;
CREATE POLICY payout_cards_own_read ON public.payout_cards FOR SELECT TO authenticated USING (user_id = auth.uid());
REVOKE ALL ON public.payout_cards FROM anon, authenticated;
-- Only masked columns are readable; the ciphertext and hash are not.
GRANT SELECT (id, user_id, holder_name, brand, last4, exp_month, exp_year, status, created_at) ON public.payout_cards TO authenticated;

CREATE TABLE IF NOT EXISTS public.card_payout_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id        UUID NOT NULL REFERENCES public.payout_cards(id),
  amount_usd     NUMERIC(14,2) NOT NULL CHECK (amount_usd >= 1 AND amount_usd <= 5000),
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled')),
  transaction_id UUID,
  provider_ref   TEXT,
  failure_reason TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS card_payout_requests_user_idx ON public.card_payout_requests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS card_payout_requests_open_idx ON public.card_payout_requests (status) WHERE status IN ('pending', 'processing');
ALTER TABLE public.card_payout_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS card_payout_requests_read ON public.card_payout_requests;
CREATE POLICY card_payout_requests_read ON public.card_payout_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
REVOKE ALL ON public.card_payout_requests FROM anon, authenticated;
GRANT SELECT ON public.card_payout_requests TO authenticated;

CREATE OR REPLACE FUNCTION public.request_card_payout(p_card_id UUID, p_amount NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid  UUID := auth.uid();
  v_amt  NUMERIC := ROUND(p_amount, 2);
  v_card public.payout_cards%ROWTYPE;
  v_bal  NUMERIC;
  v_tx   UUID;
  v_req  UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501'; END IF;
  IF v_amt IS NULL OR v_amt < 1 OR v_amt > 5000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Card payouts are between $1 and $5,000.');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_uid AND kyc_status IN ('verified', 'approved')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Verify your identity before withdrawing to a card.');
  END IF;

  SELECT * INTO v_card FROM public.payout_cards WHERE id = p_card_id AND user_id = v_uid AND status = 'active';
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Card not found.'); END IF;
  IF make_date(v_card.exp_year, v_card.exp_month, 1) + interval '1 month' <= current_date THEN
    RETURN jsonb_build_object('success', false, 'error', 'This card has expired.');
  END IF;

  SELECT COALESCE(liquid_usd, 0) INTO v_bal FROM public.balances WHERE user_id = v_uid FOR UPDATE;
  IF v_bal IS NULL OR v_bal < v_amt THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient funds.', 'available', COALESCE(v_bal, 0));
  END IF;

  UPDATE public.balances
     SET liquid_usd = liquid_usd - v_amt, escrow_usd = COALESCE(escrow_usd, 0) + v_amt, last_synced = now()
   WHERE user_id = v_uid;

  INSERT INTO public.transactions (user_id, amount, transaction_type, description, status, metadata, source_type, authorized_by)
  VALUES (v_uid, -v_amt, 'card_payout', format('Withdrawal to %s •••• %s', v_card.brand, v_card.last4), 'pending',
          jsonb_build_object('card_id', v_card.id), 'card_payout', 'user')
  RETURNING id INTO v_tx;

  INSERT INTO public.card_payout_requests (user_id, card_id, amount_usd, transaction_id)
  VALUES (v_uid, v_card.id, v_amt, v_tx) RETURNING id INTO v_req;

  RETURN jsonb_build_object('success', true, 'request_id', v_req, 'amount', v_amt, 'card', v_card.brand || ' •••• ' || v_card.last4);
END;
$$;
REVOKE ALL ON FUNCTION public.request_card_payout(UUID, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_card_payout(UUID, NUMERIC) TO authenticated;

-- Internal: close a payout. Paid → escrow released. Failed/cancelled → money back to the wallet.
CREATE OR REPLACE FUNCTION public._close_card_payout(p_request_id UUID, p_outcome TEXT, p_provider_ref TEXT, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_r public.card_payout_requests%ROWTYPE;
BEGIN
  IF p_outcome NOT IN ('paid', 'failed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid outcome' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_r FROM public.card_payout_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payout request not found' USING ERRCODE = 'P0002'; END IF;
  IF v_r.status NOT IN ('pending', 'processing') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already settled', 'status', v_r.status);
  END IF;

  PERFORM 1 FROM public.balances WHERE user_id = v_r.user_id FOR UPDATE;
  IF p_outcome = 'paid' THEN
    UPDATE public.balances SET escrow_usd = GREATEST(0, COALESCE(escrow_usd, 0) - v_r.amount_usd), last_synced = now() WHERE user_id = v_r.user_id;
    UPDATE public.transactions SET status = 'completed' WHERE id = v_r.transaction_id;
  ELSE
    UPDATE public.balances
       SET escrow_usd = GREATEST(0, COALESCE(escrow_usd, 0) - v_r.amount_usd),
           liquid_usd = COALESCE(liquid_usd, 0) + v_r.amount_usd, last_synced = now()
     WHERE user_id = v_r.user_id;
    UPDATE public.transactions SET status = CASE WHEN p_outcome = 'cancelled' THEN 'cancelled' ELSE 'failed' END WHERE id = v_r.transaction_id;
  END IF;

  UPDATE public.card_payout_requests
     SET status = p_outcome, provider_ref = COALESCE(p_provider_ref, provider_ref), failure_reason = p_reason, settled_at = now()
   WHERE id = v_r.id;

  INSERT INTO public.notifications (user_id, type, message, amount, status, metadata)
  VALUES (v_r.user_id, 'card_payout_' || p_outcome,
          CASE p_outcome WHEN 'paid' THEN format('Your $%s card withdrawal has been sent.', v_r.amount_usd)
                         WHEN 'failed' THEN format('Your $%s card withdrawal failed and the money is back in your wallet.', v_r.amount_usd)
                         ELSE format('Your $%s card withdrawal was cancelled and the money is back in your wallet.', v_r.amount_usd) END,
          v_r.amount_usd, 'completed', jsonb_build_object('request_id', v_r.id));
  RETURN jsonb_build_object('success', true, 'status', p_outcome);
END;
$$;
REVOKE ALL ON FUNCTION public._close_card_payout(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

-- IFB operations (admin) or the payout backend settles a request.
CREATE OR REPLACE FUNCTION public.settle_card_payout(p_request_id UUID, p_success BOOLEAN, p_provider_ref TEXT DEFAULT NULL, p_reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public._is_trusted_backend() OR public.is_admin()) THEN
    RAISE EXCEPTION 'Only IFB operations can settle card payouts' USING ERRCODE = '42501';
  END IF;
  RETURN public._close_card_payout(p_request_id, CASE WHEN p_success THEN 'paid' ELSE 'failed' END, p_provider_ref, p_reason);
END;
$$;
REVOKE ALL ON FUNCTION public.settle_card_payout(UUID, BOOLEAN, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.settle_card_payout(UUID, BOOLEAN, TEXT, TEXT) TO authenticated, service_role;

-- The user can cancel while IFB has not started processing.
CREATE OR REPLACE FUNCTION public.cancel_card_payout(p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.card_payout_requests WHERE id = p_request_id AND user_id = auth.uid() AND status = 'pending') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only your own pending payouts can be cancelled.');
  END IF;
  RETURN public._close_card_payout(p_request_id, 'cancelled', NULL, 'cancelled by user');
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_card_payout(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_card_payout(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.remove_payout_card(p_card_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH u AS (UPDATE public.payout_cards SET status = 'removed' WHERE id = p_card_id AND user_id = auth.uid() AND status = 'active' RETURNING 1)
  SELECT EXISTS (SELECT 1 FROM u);
$$;
REVOKE ALL ON FUNCTION public.remove_payout_card(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_payout_card(UUID) TO authenticated;

-- ── 3. Third-party ID checks ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.kyc_id_checks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider    TEXT NOT NULL DEFAULT 'smile_id',
  country     TEXT NOT NULL,
  id_type     TEXT NOT NULL,
  id_last4    TEXT,                       -- never the full ID number
  job_id      TEXT,
  result_code TEXT,
  result_text TEXT,
  verified    BOOLEAN NOT NULL DEFAULT false,
  name_match  TEXT,
  dob_match   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kyc_id_checks_user_idx ON public.kyc_id_checks (user_id, created_at DESC);
ALTER TABLE public.kyc_id_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kyc_id_checks_read ON public.kyc_id_checks;
CREATE POLICY kyc_id_checks_read ON public.kyc_id_checks FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
REVOKE ALL ON public.kyc_id_checks FROM anon, authenticated;
GRANT SELECT ON public.kyc_id_checks TO authenticated;

-- Edge functions (service role) write these tables.
GRANT ALL ON public.deposit_intents, public.payout_cards, public.card_payout_requests, public.kyc_id_checks TO service_role;

COMMIT;
