-- AgriShield — Parametric Agricultural Insurance for African farmers

-- Drop stale tables from failed prior migrations (no data yet)
DROP TABLE IF EXISTS public.insurance_premium_payments CASCADE;
DROP TABLE IF EXISTS public.insurance_claims CASCADE;
DROP TABLE IF EXISTS public.insurance_policies CASCADE;

CREATE TABLE public.insurance_policies (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_number          TEXT NOT NULL UNIQUE DEFAULT 'AGR-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 8)),
  status                 TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled','claimed','pending_payment')),
  crop_type              TEXT NOT NULL,
  farm_country           TEXT NOT NULL,
  farm_region            TEXT NOT NULL,
  farm_size_ha           NUMERIC(10,2) NOT NULL,
  coverage_amount_usd    NUMERIC(18,2) NOT NULL,
  premium_monthly_usd    NUMERIC(18,2) NOT NULL,
  trigger_type           TEXT NOT NULL DEFAULT 'rainfall' CHECK (trigger_type IN ('rainfall','temperature','flood','drought','pest')),
  trigger_threshold      TEXT NOT NULL,
  coverage_start         DATE NOT NULL,
  coverage_end           DATE NOT NULL,
  next_premium_due       DATE,
  admin_notes            TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.insurance_claims (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id       UUID NOT NULL REFERENCES public.insurance_policies(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger_type    TEXT NOT NULL,
  trigger_value   TEXT,
  payout_amount   NUMERIC(18,2) NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','rejected')),
  admin_notes     TEXT,
  filed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at         TIMESTAMPTZ
);

CREATE TABLE public.insurance_premium_payments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id   UUID NOT NULL REFERENCES public.insurance_policies(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount      NUMERIC(18,2) NOT NULL,
  period_date DATE NOT NULL,
  status      TEXT NOT NULL DEFAULT 'paid',
  paid_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.insurance_policies          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_claims            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_premium_payments  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ins_policies_own"  ON public.insurance_policies         FOR ALL USING (user_id = auth.uid());
CREATE POLICY "ins_claims_own"    ON public.insurance_claims           FOR ALL USING (user_id = auth.uid());
CREATE POLICY "ins_premiums_own"  ON public.insurance_premium_payments FOR ALL USING (user_id = auth.uid());

-- Admin access handled via SECURITY DEFINER functions (admin_roles table pattern)

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_insurance_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER trg_insurance_policies_updated_at
  BEFORE UPDATE ON public.insurance_policies
  FOR EACH ROW EXECUTE FUNCTION public.set_insurance_updated_at();

-- Pay insurance premium (deducts from liquid balance)
CREATE OR REPLACE FUNCTION public.pay_insurance_premium(
  p_user_id   UUID,
  p_policy_id UUID,
  p_amount    NUMERIC,
  p_period    DATE
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_new_bal NUMERIC; BEGIN
  UPDATE public.balances
    SET liquid_usd = liquid_usd - p_amount
  WHERE user_id = p_user_id AND liquid_usd >= p_amount
  RETURNING liquid_usd INTO v_new_bal;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  INSERT INTO public.insurance_premium_payments (policy_id, user_id, amount, period_date)
  VALUES (p_policy_id, p_user_id, p_amount, p_period);

  UPDATE public.insurance_policies
    SET next_premium_due = p_period + INTERVAL '1 month'
  WHERE id = p_policy_id;

  INSERT INTO public.transactions (user_id, transaction_type, amount, status, description)
  VALUES (p_user_id, 'insurance_premium', p_amount, 'completed', 'AgriShield Premium Payment');

  RETURN jsonb_build_object('success', true, 'new_liquid_balance', v_new_bal);
END; $$;

-- Admin: trigger parametric payout
CREATE OR REPLACE FUNCTION public.admin_trigger_insurance_payout(
  p_claim_id   UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_claim  public.insurance_claims%ROWTYPE;
  v_policy public.insurance_policies%ROWTYPE;
BEGIN
  SELECT * INTO v_claim  FROM public.insurance_claims    WHERE id = p_claim_id;
  SELECT * INTO v_policy FROM public.insurance_policies  WHERE id = v_claim.policy_id;

  IF v_claim.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Claim is not in pending state');
  END IF;

  -- Credit user balance
  UPDATE public.balances
    SET liquid_usd = liquid_usd + v_claim.payout_amount
  WHERE user_id = v_claim.user_id;

  -- Mark claim paid
  UPDATE public.insurance_claims
    SET status = 'paid', paid_at = NOW(), admin_notes = p_admin_notes
  WHERE id = p_claim_id;

  -- Mark policy as claimed
  UPDATE public.insurance_policies SET status = 'claimed' WHERE id = v_claim.policy_id;

  -- Log transaction
  INSERT INTO public.transactions (user_id, transaction_type, amount, status, description)
  VALUES (v_claim.user_id, 'insurance_payout', v_claim.payout_amount, 'completed',
    'AgriShield Parametric Payout — ' || v_claim.trigger_type);

  -- Notify user
  INSERT INTO public.notifications (user_id, type, message)
  VALUES (v_claim.user_id, 'system',
    'AgriShield payout of $' || v_claim.payout_amount || ' has been credited to your account.');

  RETURN jsonb_build_object('success', true);
END; $$;

GRANT EXECUTE ON FUNCTION public.pay_insurance_premium         TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_trigger_insurance_payout TO service_role;
