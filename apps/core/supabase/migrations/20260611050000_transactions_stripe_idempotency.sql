-- Add Stripe idempotency column to prevent double-crediting
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT UNIQUE;

-- Index for fast duplicate checks
CREATE INDEX IF NOT EXISTS idx_transactions_stripe_pi
  ON public.transactions (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;
