-- user_mobile_accounts — lets users save their mobile money numbers
-- for quick reuse on deposits and withdrawals via Flutterwave.
CREATE TABLE IF NOT EXISTS public.user_mobile_accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  network     TEXT NOT NULL,       -- 'MTN' | 'M-Pesa' | 'Airtel' | 'Orange' | 'Wave' | etc.
  country     TEXT NOT NULL,       -- ISO2: 'GH' | 'KE' | 'UG' | etc.
  phone       TEXT NOT NULL,       -- E.164 preferred, e.g. +233201234567
  alias       TEXT,                -- user-chosen label, e.g. "My Ghana MTN"
  is_default  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, network, phone)
);

ALTER TABLE public.user_mobile_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mobile_accounts_own" ON public.user_mobile_accounts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Also ensure the transactions table has the stripe_payment_intent_id column
-- (added in migration 20260628 but included here as safety net)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS transactions_stripe_pi_unique
  ON public.transactions (user_id, stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;
