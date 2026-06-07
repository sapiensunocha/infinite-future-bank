-- ============================================================
-- FORCE BALANCE CORRECTION — direct targeted reset
-- Previous migration skipped users with NULL role
-- ============================================================

-- Log before correction
INSERT INTO public.balance_corrections (user_id, email, old_liquid, new_liquid, reason)
VALUES
  ('83481af7-7d3a-41e1-a140-c53b1195c3b7',
   'fabriceka@gmail.com',
   59685.00, 0,
   'reconcile-deposits infinite re-credit bug. Role was NULL, bypassed first migration. Forced reset.'),
  ('bf8c2426-2e3b-4fe5-90df-b419fe623fd9',
   'sapiens@xeltis.org',
   99838.00, 0,
   'reconcile-deposits infinite re-credit bug. Was in exclusion list. Forced reset.')
ON CONFLICT DO NOTHING;

-- Zero Fabrice
UPDATE public.balances
SET liquid_usd = 0
WHERE user_id = '83481af7-7d3a-41e1-a140-c53b1195c3b7';

-- Zero sapiens@xeltis.org (also corrupted, not a real deposit)
UPDATE public.balances
SET liquid_usd = 0
WHERE user_id = 'bf8c2426-2e3b-4fe5-90df-b419fe623fd9';

-- Delete ALL stripe_deposit phantom transactions for these two users
DELETE FROM public.transactions
WHERE user_id IN (
  '83481af7-7d3a-41e1-a140-c53b1195c3b7',
  'bf8c2426-2e3b-4fe5-90df-b419fe623fd9'
)
AND (
  transaction_type = 'stripe_deposit'
  OR (transaction_type IS NULL AND description ILIKE '%stripe%')
);

-- In-app notification for Fabrice
INSERT INTO public.notifications (user_id, type, read, status, message, created_at)
VALUES (
  '83481af7-7d3a-41e1-a140-c53b1195c3b7',
  'system', false, 'action_required',
  '⚠️ Account Notice: A technical error incorrectly credited your balance. Your account has been corrected to $0. We apologize — contact sapiens@infinitefuturebank.org if you had a legitimate deposit.',
  NOW()
)
ON CONFLICT DO NOTHING;

DO $$
BEGIN
  RAISE NOTICE 'Fabrice and sapiens@xeltis.org balances forcibly reset to 0.';
END;
$$;
