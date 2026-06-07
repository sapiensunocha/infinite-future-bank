-- ============================================================
-- EMERGENCY: Fix balance corruption from reconcile-deposits bug
-- Root cause: reconcile-deposits used .eq("type","stripe_deposit")
--   but column is "transaction_type" → dedup check ALWAYS returned null
--   → every login re-credited all Stripe PaymentIntents from last 7 days
-- ============================================================

-- 1. Record the corrupted amounts before correction
CREATE TABLE IF NOT EXISTS public.balance_corrections (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID,
  email        TEXT,
  old_liquid   NUMERIC,
  new_liquid   NUMERIC,
  reason       TEXT,
  corrected_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Log before zeroing
INSERT INTO public.balance_corrections (user_id, email, old_liquid, new_liquid, reason)
SELECT
  b.user_id,
  p.email,
  b.liquid_usd,
  0,
  'reconcile-deposits bug: wrong column name caused unlimited re-crediting on every login. Balance reset to 0 pending manual review.'
FROM public.balances b
JOIN public.profiles p ON p.id = b.user_id
WHERE b.liquid_usd > 1000
  AND p.role NOT IN ('super','finance')
  AND p.email NOT IN ('sapiens@infinitefuturebank.org','sapiens@ndatabaye.com','sapiens@xeltis.org','sapiens@xeltis.com');

-- 3. Zero out corrupted balances (users with > $1,000 that are not admins)
UPDATE public.balances b
SET liquid_usd = 0
FROM public.profiles p
WHERE p.id = b.user_id
  AND b.liquid_usd > 1000
  AND p.role NOT IN ('super','finance')
  AND p.email NOT IN ('sapiens@infinitefuturebank.org','sapiens@ndatabaye.com','sapiens@xeltis.org','sapiens@xeltis.com');

-- 4. Delete phantom duplicate stripe_deposit transactions (the fake ones)
-- Keep only the FIRST occurrence per description pattern (the real one, if any)
DELETE FROM public.transactions t1
WHERE t1.transaction_type = 'stripe_deposit'
  AND EXISTS (
    SELECT 1 FROM public.transactions t2
    WHERE t2.user_id = t1.user_id
      AND t2.transaction_type = 'stripe_deposit'
      AND t2.description = t1.description
      AND t2.created_at < t1.created_at
  );

-- Also delete transactions inserted with wrong column "type" (they have NULL transaction_type)
-- These are phantom records from the broken fallback
DELETE FROM public.transactions
WHERE transaction_type IS NULL
  AND description LIKE 'Stripe deposit%'
  AND status = 'completed';

-- 5. Send in-app notification to affected users
INSERT INTO public.notifications (user_id, type, read, status, message, created_at)
SELECT
  bc.user_id,
  'system',
  false,
  'action_required',
  '⚠️ Account Notice: We detected and corrected a technical error that incorrectly credited your balance. Your account has been reset. We apologize for the inconvenience — please contact sapiens@infinitefuturebank.org if you believe funds were legitimately deposited.',
  NOW()
FROM public.balance_corrections bc
ON CONFLICT DO NOTHING;

-- 6. Add unique constraint on transactions to prevent future double-crediting
-- Uses a partial index: only one stripe_deposit per (user_id, PI id in description)
-- We can't easily unique on description text, so add a dedicated column
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS transactions_stripe_pi_unique
  ON public.transactions (user_id, stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

-- 7. Flag corrected users in audit log
DO $$
BEGIN
  RAISE NOTICE 'Balance correction complete. See public.balance_corrections for details.';
END;
$$;
