-- ============================================================================
-- 20261120 — balances.updated_at
--
-- credit_deposit() (every Stripe, Flutterwave and Paystack deposit) and several
-- edge functions write balances.updated_at, but the production table never had
-- that column (it has last_synced). Every deposit credit failed with
-- 42703 "column does not exist" and rolled back, so paid deposits stayed
-- uncredited. Adding the column is additive and fixes all of those writers.
-- ============================================================================
ALTER TABLE public.balances ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
