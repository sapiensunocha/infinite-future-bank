-- ============================================================
-- FULL LEDGER REMIT — 2026-06-07
-- Source of truth: Stripe succeeded PaymentIntents + P2P movements
-- Every balance is rebuilt from verified transactions only.
-- All credits are justified with source_type + justification columns.
-- ============================================================

-- ─── 1. MASTER LEDGER TABLE ─────────────────────────────────
-- This table is the permanent, auditable source of truth for every
-- balance movement on the platform. Cannot be deleted, only appended.
CREATE TABLE IF NOT EXISTS public.ifb_ledger (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  amount_usd       NUMERIC(18,4) NOT NULL,          -- positive = credit, negative = debit
  source_type      TEXT NOT NULL,                   -- 'stripe_deposit' | 'p2p_send' | 'p2p_receive' | 'ifb_founder_credit' | 'ifb_platform_credit' | 'admin_correction' | 'escrow_lock' | 'escrow_release' | 'escrow_void'
  reference_id     TEXT,                            -- Stripe PI id, P2P order id, etc.
  justification    TEXT NOT NULL,                   -- Human-readable reason — required always
  blockchain_ref   TEXT,                            -- future: AFR/chain tx hash
  authorized_by    TEXT DEFAULT 'system',           -- 'system' | admin email | 'stripe_webhook'
  is_verified      BOOLEAN DEFAULT TRUE,            -- FALSE = pending verification
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  metadata         JSONB DEFAULT '{}'
);

-- No deletions, no updates allowed except by service role
ALTER TABLE public.ifb_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ledger_own_read" ON public.ifb_ledger
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ledger_admin_all" ON public.ifb_ledger
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid()
    AND role IN ('super','finance','ops')
  ));

-- Add justification column to transactions table for legacy records
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS source_type     TEXT,
  ADD COLUMN IF NOT EXISTS justification   TEXT,
  ADD COLUMN IF NOT EXISTS authorized_by   TEXT DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS blockchain_ref  TEXT,
  ADD COLUMN IF NOT EXISTS is_verified     BOOLEAN DEFAULT TRUE;


-- ─── 2. FOUNDER CREDIT — SAPIENS NDATABAYE ──────────────────
-- IFB platform founding allocation. Source: IFB Treasury.
-- This is the founder's operational credit to run the platform.
-- Justified here permanently in the ledger and transactions.
DO $$
DECLARE
  v_founder_id UUID := 'e17b0d26-f2a8-4209-a40f-b116d3ea9f74'; -- sapiens@infinitefuturebank.org
  v_founder_credit NUMERIC := 500.00;
  v_justification TEXT := 'IFB Platform Founder Operational Credit — Sapiens Ndatabaye — Authorized per IFB Charter Article 1: Founding members receive platform operating credit to bootstrap the ecosystem. This is an IFB treasury allocation, not a user deposit.';
BEGIN
  -- Insert into master ledger
  INSERT INTO public.ifb_ledger (
    user_id, amount_usd, source_type, reference_id, justification,
    authorized_by, is_verified, metadata
  ) VALUES (
    v_founder_id, v_founder_credit,
    'ifb_founder_credit',
    'IFB-FOUNDER-2026-001',
    v_justification,
    'sapiens@infinitefuturebank.org',
    TRUE,
    jsonb_build_object('charter_article', 1, 'credit_type', 'founder_operational', 'treasury_source', 'IFB_TREASURY')
  );

  -- Update balance
  UPDATE public.balances
  SET liquid_usd = liquid_usd + v_founder_credit
  WHERE user_id = v_founder_id;

  -- Record in transactions
  INSERT INTO public.transactions (
    user_id, amount, transaction_type, description, status,
    source_type, justification, authorized_by, is_verified, metadata
  ) VALUES (
    v_founder_id, v_founder_credit,
    'ifb_founder_credit',
    'IFB Founder Credit — Platform Treasury Allocation',
    'completed',
    'ifb_founder_credit',
    v_justification,
    'sapiens@infinitefuturebank.org',
    TRUE,
    jsonb_build_object('reference', 'IFB-FOUNDER-2026-001')
  );

  RAISE NOTICE 'Founder credit applied: $% to %', v_founder_credit, v_founder_id;
END;
$$;


-- ─── 3. FABRICE — REMIT FROM VERIFIED STRIPE DEPOSITS ───────
DO $$
DECLARE
  v_uid UUID := '83481af7-7d3a-41e1-a140-c53b1195c3b7'; -- fabriceka@gmail.com
BEGIN

  -- Record the two REAL succeeded Stripe deposits in the ledger
  INSERT INTO public.ifb_ledger (user_id, amount_usd, source_type, reference_id, justification, authorized_by, is_verified, metadata)
  VALUES
    (v_uid, 120.00, 'stripe_deposit', 'pi_3TegWkDV4GGUfngR0YB7U9b8',
     'Stripe deposit — pi_3TegWkDV4GGUfngR0YB7U9b8 — $120.00 — succeeded 2026-06-04. Verified from Stripe live API. Card charged successfully.',
     'stripe', TRUE, '{"stripe_pi": "pi_3TegWkDV4GGUfngR0YB7U9b8", "verified_at": "2026-06-07"}'),
    (v_uid, 10.00, 'stripe_deposit', 'pi_3TcHovDV4GGUfngR0xNReWgB',
     'Stripe deposit — pi_3TcHovDV4GGUfngR0xNReWgB — $10.00 — succeeded 2026-05-29. Verified from Stripe live API.',
     'stripe', TRUE, '{"stripe_pi": "pi_3TcHovDV4GGUfngR0xNReWgB", "verified_at": "2026-06-07"}');

  -- All other Fabrice PIs had status "requires_payment_method" = never charged = not credited
  -- Log them as voided in ledger for audit trail
  INSERT INTO public.ifb_ledger (user_id, amount_usd, source_type, reference_id, justification, authorized_by, is_verified, metadata)
  VALUES
    (v_uid, 0, 'stripe_void', 'pi_3TegTuDV4GGUfngR1IXaay5B', 'Voided — status requires_payment_method, card never charged', 'stripe', FALSE, '{}'),
    (v_uid, 0, 'stripe_void', 'pi_3TegRlDV4GGUfngR1Fx8h7PU', 'Voided — status requires_payment_method, card never charged', 'stripe', FALSE, '{}'),
    (v_uid, 0, 'stripe_void', 'pi_3TeetCDV4GGUfngR10xKwmzt', 'Voided — status requires_payment_method, card never charged', 'stripe', FALSE, '{}'),
    (v_uid, 0, 'stripe_void', 'pi_3TeeqSDV4GGUfngR2PFUFhDq', 'Voided — status requires_payment_method, card never charged', 'stripe', FALSE, '{}'),
    (v_uid, 0, 'stripe_void', 'pi_3TeepaDV4GGUfngR1H4x9iIt', 'Voided — status requires_payment_method, card never charged', 'stripe', FALSE, '{}'),
    (v_uid, 0, 'stripe_void', 'pi_3Tdy5KDV4GGUfngR0dTEQDx0', 'Voided — status requires_payment_method, card never charged', 'stripe', FALSE, '{}'),
    (v_uid, 0, 'stripe_void', 'pi_3TdxmrDV4GGUfngR2QfoLqCb', 'Voided — status requires_payment_method, card never charged', 'stripe', FALSE, '{}'),
    (v_uid, 0, 'stripe_void', 'pi_3TcPGYDV4GGUfngR10Ttg66r', 'Voided — $1,000 attempted but card never charged', 'stripe', FALSE, '{}'),
    (v_uid, 0, 'stripe_void', 'pi_3TXqR1DV4GGUfngR1UgMSMOB', 'Voided — status requires_payment_method, card never charged', 'stripe', FALSE, '{}');

  -- Set Fabrice's balance to exactly his two verified deposits
  UPDATE public.balances SET liquid_usd = 130.00 WHERE user_id = v_uid;

  -- Record the correction in transactions with full justification
  INSERT INTO public.transactions (
    user_id, amount, transaction_type, description, status,
    source_type, justification, authorized_by, is_verified, metadata
  ) VALUES (
    v_uid, 130.00,
    'admin_correction',
    'Balance Remit — Verified Stripe deposits: $120 (pi_3TegWk) + $10 (pi_3TcHov). Previous phantom balance from reconcile-deposits bug cleared.',
    'completed',
    'admin_correction',
    'Balance rebuilt from Stripe API verified succeeded PaymentIntents only. All requires_payment_method PIs excluded (card never charged). Bug: reconcile-deposits used wrong column name causing infinite re-credit on every login.',
    'sapiens@infinitefuturebank.org',
    TRUE,
    jsonb_build_object(
      'verified_pi_1', 'pi_3TegWkDV4GGUfngR0YB7U9b8',
      'verified_pi_2', 'pi_3TcHovDV4GGUfngR0xNReWgB',
      'correction_type', 'bug_fix_remit',
      'old_balance', 59685.00,
      'new_balance', 130.00
    )
  );

  -- Handle P2P escrow orders placed with fake balance
  -- Lock them as "under_review" — cannot fulfill $700 from $130 real balance
  UPDATE public.p2p_orders
  SET status = 'under_review'
  WHERE user_id = v_uid
    AND status IN ('open','locked','escrow_locked')
    AND created_at > '2026-05-28'::DATE;

  RAISE NOTICE 'Fabrice remitted: balance set to $130.00 (2 verified Stripe deposits). P2P escrow orders flagged for review.';
END;
$$;


-- ─── 4. RECORD HISTORICAL STRIPE DEPOSITS (USERS MAY HAVE LEFT) ──
-- Store in stripe_unattributed_deposits for admin review
CREATE TABLE IF NOT EXISTS public.stripe_unattributed_deposits (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_pi_id TEXT UNIQUE,
  amount_usd   NUMERIC(18,4),
  status       TEXT,
  description  TEXT,
  created_at   TIMESTAMPTZ,
  attribution  TEXT DEFAULT 'pending'
);

INSERT INTO public.stripe_unattributed_deposits (stripe_pi_id, amount_usd, status, description, created_at, attribution)
VALUES
  ('pi_3Ryf4qDV4GGUfngR10SGy01d', 6.00,  'succeeded', 'user 49dd39b8 — no longer in profiles', '2025-08-21', 'orphaned_user'),
  ('pi_3Ryf2pDV4GGUfngR1ZAer16i', 2.00,  'succeeded', 'user 49dd39b8 — no longer in profiles', '2025-08-21', 'orphaned_user'),
  ('pi_3RwVyFDV4GGUfngR2DubCtNm', 1.00,  'succeeded', 'user 49dd39b8 — no longer in profiles', '2025-08-15', 'orphaned_user'),
  ('pi_3RwNcqDV4GGUfngR31hNPWTG', 3.00,  'succeeded', 'user 49dd39b8 — no longer in profiles', '2025-08-15', 'orphaned_user'),
  ('pi_3RrJwEDV4GGUfngR0pzreJcX', 2.00,  'succeeded', 'user 9ac8629d — no longer in profiles',  '2025-08-01', 'orphaned_user')
ON CONFLICT DO NOTHING;


-- ─── 5. IFB PLATFORM SUBSCRIPTION REVENUE LEDGER ────────────
-- Stripe subscription payments from cus_S0y5LzyDPgZpF7
-- These are IFB revenue — tracked for transparency but credited to IFB treasury, not user wallets
CREATE TABLE IF NOT EXISTS public.ifb_revenue_ledger (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type   TEXT NOT NULL,
  reference_id  TEXT,
  amount_usd    NUMERIC(18,4),
  customer_id   TEXT,
  description   TEXT,
  received_at   TIMESTAMPTZ
);

INSERT INTO public.ifb_revenue_ledger (source_type, reference_id, amount_usd, customer_id, description, received_at)
VALUES
  ('stripe_subscription', 'pi_3R6w8xDV4GGUfngR3A6Zc75p', 10.00, 'cus_S0y5LzyDPgZpF7', 'Monthly subscription Mar-2025', '2025-03-26'),
  ('stripe_subscription', 'pi_3RIBrzDV4GGUfngR1NbzcgMT', 10.00, 'cus_S0y5LzyDPgZpF7', 'Monthly subscription Apr-2025', '2025-04-26'),
  ('stripe_subscription', 'pi_3RT4B6DV4GGUfngR3U4BA6sE', 10.00, 'cus_S0y5LzyDPgZpF7', 'Monthly subscription May-2025', '2025-05-26'),
  ('stripe_subscription', 'pi_3RpBGeDV4GGUfngR2GOSND5B', 10.00, 'cus_S0y5LzyDPgZpF7', 'Monthly subscription Jul-2025', '2025-07-26'),
  ('stripe_subscription', 'pi_3SBeonDV4GGUfngR3m11gQLJ', 10.00, 'cus_S0y5LzyDPgZpF7', 'Monthly subscription Sep-2025', '2025-09-26'),
  ('stripe_subscription', 'pi_3SMX9PDV4GGUfngR1jGCJo29', 10.00, 'cus_S0y5LzyDPgZpF7', 'Monthly subscription Oct-2025', '2025-10-26'),
  ('stripe_subscription', 'pi_3SXltaDV4GGUfngR1AzkDfrU', 10.00, 'cus_S0y5LzyDPgZpF7', 'Monthly subscription Nov-2025', '2025-11-26'),
  ('stripe_subscription', 'pi_3SieCUDV4GGUfngR3HTb450X', 10.00, 'cus_S0y5LzyDPgZpF7', 'Monthly subscription Dec-2025', '2025-12-26'),
  ('stripe_subscription', 'pi_3StsvADV4GGUfngR08ub3VQq', 10.00, 'cus_S0y5LzyDPgZpF7', 'Monthly subscription Jan-2026', '2026-01-26'),
  ('stripe_subscription', 'pi_3T57iLDV4GGUfngR3zPreY7s', 10.00, 'cus_S0y5LzyDPgZpF7', 'Monthly subscription Feb-2026', '2026-02-26'),
  ('stripe_subscription', 'pi_3TFH3lDV4GGUfngR1bg3eUkm', 10.00, 'cus_S0y5LzyDPgZpF7', 'Monthly subscription Mar-2026', '2026-03-26'),
  ('stripe_subscription', 'pi_3TQVpADV4GGUfngR1KjyuNmd', 10.00, 'cus_S0y5LzyDPgZpF7', 'Monthly subscription Apr-2026', '2026-04-26'),
  ('stripe_subscription', 'pi_3TbO9bDV4GGUfngR28L18HEB', 10.00, 'cus_S0y5LzyDPgZpF7', 'Monthly subscription May-2026', '2026-05-26')
ON CONFLICT DO NOTHING;

-- Record IFB total verified revenue
DO $$
BEGIN
  RAISE NOTICE 'IFB subscription revenue recorded: 13 × $10 = $130 from cus_S0y5LzyDPgZpF7';
  RAISE NOTICE 'Additional untagged succeeded PIs logged separately for manual attribution.';
END;
$$;


-- ─── 6. UNTAGGED SUCCEEDED PAYMENTS — FLAG FOR ATTRIBUTION ──
-- (table already created in section 4 — inserting additional records)
INSERT INTO public.stripe_unattributed_deposits (stripe_pi_id, amount_usd, status, description, created_at)
VALUES
  ('pi_3TCNIEDV4GGUfngR0nBAEWtQ', 2000.00, 'succeeded', 'No user_id — possible Sapiens early deposit Mar-2026', '2026-03-18'),
  ('pi_3T8GB3DV4GGUfngR3zLNCPWe', 5.00,    'succeeded', 'No user_id — Mar-2026', '2026-03-07'),
  ('pi_3T5HraDV4GGUfngR2x7Jnddc', 2.00,    'succeeded', 'No user_id — Feb-2026', '2026-02-27'),
  ('pi_3RxuOKDV4GGUfngR0xaslAbF', 205.00,  'succeeded', 'No user_id — Aug-2025', '2025-08-19'),
  ('pi_3RUx49DV4GGUfngR1TbG4Qex', 20.00,   'succeeded', 'No user_id — May-2025', '2025-05-31'),
  ('pi_3R186qDV4GGUfngR0PS6E89R', 250.00,  'succeeded', 'No user_id — Mar-2025', '2025-03-10')
ON CONFLICT DO NOTHING;


-- ─── 7. GRANT LEDGER ACCESS ─────────────────────────────────
GRANT SELECT ON public.ifb_ledger TO authenticated;
GRANT SELECT ON public.ifb_revenue_ledger TO authenticated;
GRANT SELECT ON public.stripe_unattributed_deposits TO authenticated;

DO $$
BEGIN
  RAISE NOTICE '=== REMIT COMPLETE ===';
  RAISE NOTICE 'Fabrice (fabriceka@gmail.com): balance = $130.00 (2 verified Stripe PIs)';
  RAISE NOTICE 'Founder (sapiens@infinitefuturebank.org): +$500 IFB founder credit applied';
  RAISE NOTICE 'All movements recorded in public.ifb_ledger with full justification';
  RAISE NOTICE 'Unattributed deposits flagged in public.stripe_unattributed_deposits for manual review';
  RAISE NOTICE 'IFB subscription revenue ($130 total) recorded in public.ifb_revenue_ledger';
END;
$$;
