-- IFB Pension Fund — long-term savings with compound growth projections

-- Drop stale tables from failed prior migration (no data yet)
DROP TABLE IF EXISTS public.pension_contributions CASCADE;
DROP TABLE IF EXISTS public.pension_accounts CASCADE;

CREATE TABLE public.pension_accounts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','withdrawn')),
  total_contributed   NUMERIC(18,2) NOT NULL DEFAULT 0,
  current_balance     NUMERIC(18,2) NOT NULL DEFAULT 0,
  contribution_amount NUMERIC(18,2) NOT NULL DEFAULT 50,
  frequency           TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('monthly','quarterly','annually')),
  retirement_age      INT NOT NULL DEFAULT 65,
  birth_year          INT,
  enrolled_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.pension_contributions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  UUID NOT NULL REFERENCES public.pension_accounts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount      NUMERIC(18,2) NOT NULL,
  source      TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','auto','employer_match')),
  status      TEXT NOT NULL DEFAULT 'completed',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.pension_accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pension_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pension_accounts_own"      ON public.pension_accounts      FOR ALL USING (user_id = auth.uid());
CREATE POLICY "pension_contributions_own" ON public.pension_contributions  FOR ALL USING (user_id = auth.uid());

-- Admin access handled via SECURITY DEFINER functions (admin_roles table pattern)

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_pension_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER trg_pension_accounts_updated_at
  BEFORE UPDATE ON public.pension_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_pension_updated_at();

-- Helper: contribute to pension (deducts from liquid balance atomically)
CREATE OR REPLACE FUNCTION public.make_pension_contribution(
  p_user_id UUID,
  p_amount  NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_account_id UUID;
  v_new_bal    NUMERIC;
BEGIN
  -- Deduct from liquid balance (fails if insufficient)
  UPDATE public.balances
    SET liquid_usd = liquid_usd - p_amount
  WHERE user_id = p_user_id AND liquid_usd >= p_amount
  RETURNING liquid_usd INTO v_new_bal;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Credit pension account
  UPDATE public.pension_accounts
    SET current_balance   = current_balance + p_amount,
        total_contributed = total_contributed + p_amount
  WHERE user_id = p_user_id
  RETURNING id INTO v_account_id;

  IF NOT FOUND THEN
    -- Roll back liquid balance
    UPDATE public.balances SET liquid_usd = liquid_usd + p_amount WHERE user_id = p_user_id;
    RETURN jsonb_build_object('success', false, 'error', 'No pension account found');
  END IF;

  -- Log contribution
  INSERT INTO public.pension_contributions (account_id, user_id, amount, source)
  VALUES (v_account_id, p_user_id, p_amount, 'manual');

  -- Log transaction
  INSERT INTO public.transactions (user_id, transaction_type, amount, status, description)
  VALUES (p_user_id, 'pension_contribution', p_amount, 'completed', 'IFB Pension Fund Contribution');

  RETURN jsonb_build_object('success', true, 'new_liquid_balance', v_new_bal);
END; $$;

GRANT EXECUTE ON FUNCTION public.make_pension_contribution TO authenticated;
