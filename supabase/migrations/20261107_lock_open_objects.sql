-- 20261107_lock_open_objects.sql
-- Closes the critical holes found by a read-only audit of the LIVE database on
-- 2026-11-05 (see docs/STATUS-2026-11-05.md).
--
-- Rule for this file: nothing changes for logged-in users of this repo's apps.
--   * Logged-out visitors (anon) can no longer run money functions or read/write
--     private tables.
--   * Tables that no app in this repo reads are locked to the server only
--     (service_role bypasses row-level security, so edge functions keep working).
--   * Public web-form tables keep accepting new submissions, but submissions can
--     no longer be read back by the public.
--   * Tables the apps read are left readable for logged-in users; owner-only rules
--     for them come later together with an app update.
--
-- PART B (end of file) closes the same money functions for logged-in callers too.
-- It is safe for this repo's apps (none of them call those functions), but an
-- app outside this repo (e.g. the Skylink delivery app, sl_* functions) could
-- depend on them. Run PART B only after confirming that.
--
-- Forward-only, idempotent: safe to run more than once.

-- ---------------------------------------------------------------------------
-- PART A1. Money functions: logged-out visitors may not run them.
--          Logged-in users keep the access they have today.
-- ---------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN (
         'increment_balance', 'fund_pocket', 'fund_community_loan',
         'initiate_p2p_withdrawal', 'mark_p2p_withdrawal_sent', 'pay_insurance_premium',
         'release_milestone_funds', 'sl_credit_carrier', 'sl_deduct_balance',
         'sl_pay_for_package', 'vault_transfer', 'venturex_fund_escrow',
         'create_nfc_transfer', 'enforce_minimum_balance_on_verify'
       )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- PART A2. Private tables nothing in the apps reads: server-only.
--          Includes card numbers + CVV (infinite_cards), partner API keys,
--          balance corrections, withdrawal bank details and revenue ledgers.
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'infinite_cards', 'sl_partner_keys', 'balance_corrections', 'balance_audit_flags',
    'standard_withdrawals', 'stripe_unattributed_deposits', 'ifb_revenue_ledger',
    'system_audit_ledger', 'p2p_trades', 'network_transactions', 'ifb_merchants',
    'ifb_invoices', 'ifb_npos', 'insurance_pool', 'capital_commitments',
    'investor_preferences', 'portfolios', 'private_companies', 'notification_log',
    'trust_scores', 'trust_verifications', 'user_complaints', 'founder_coaching_tracks',
    'ifb_fee_config', 'sentinel_events', 'edge_ai_models'
  ] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- PART A3. Public web forms (contact, careers, applications, newsletter):
--          anyone may submit, nobody but the server may read the submissions.
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'contact_messages', 'career_applications', 'newsletter_subscribers',
    'board_applications', 'ngo_applications', 'trust_applications',
    'venturex_applications', 'entrepreneur_pitches'
  ] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_submit_only', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO anon, authenticated WITH CHECK (true)', t || '_submit_only', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT INSERT ON public.%I TO anon, authenticated', t);
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- PART A4. Public reference data: everyone may read, nobody may change it
--          from the outside.
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'countries', 'regions', 'states', 'global_celebrations', 'ifb_global_celebrations',
    'ifb_careers', 'market_assets', 'market_signals', 'platform_stats_cache'
  ] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_public_read', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (true)', t || '_public_read', t);
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT ON public.%I TO anon, authenticated', t);
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- PART A5. Tables the apps use while logged in: logged-out visitors lose all
--          access; public pages keep read access where they need it.
--          (Owner-only rules for logged-in users come later with an app update.)
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  -- Used only by logged-in screens.
  FOREACH t IN ARRAY ARRAY['ifb_bills', 'loan_contributions', 'loan_requests',
                           'payroll_employees', 'payroll_runs', 'smart_contracts'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
  END LOOP;
  -- Shown on public pages (campaigns, events): keep public reading, stop public writing.
  FOREACH t IN ARRAY ARRAY['funding_campaigns', 'campaign_milestones', 'ifb_tickets'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON public.%I FROM anon', t);
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- PART A6. Views that expose internal money figures to the public.
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ifb_revenue_summary', 'venturex_balance_check'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
  END LOOP;
END;
$$;

-- ===========================================================================
-- PART B (run only after confirming no outside app calls these as a logged-in
-- user). These functions take the user id or amount from the caller and do not
-- check who is calling: any logged-in account could credit or debit anyone.
-- No app in this repo calls them, so this does not affect this repo's apps.
-- ===========================================================================
-- DO $$
-- DECLARE r record;
-- BEGIN
--   FOR r IN
--     SELECT p.oid::regprocedure AS sig
--       FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--      WHERE n.nspname = 'public'
--        AND p.proname IN ('increment_balance', 'fund_community_loan', 'initiate_p2p_withdrawal',
--                          'sl_credit_carrier', 'sl_pay_for_package', 'enforce_minimum_balance_on_verify')
--   LOOP
--     EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', r.sig);
--   END LOOP;
-- END;
-- $$;

-- ---------------------------------------------------------------------------
-- CHECKS (read the results)
-- ---------------------------------------------------------------------------
-- Every row should show anon_can_run = false:
SELECT p.proname AS money_function, bool_or(has_function_privilege('anon', p.oid, 'EXECUTE')) AS anon_can_run
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.proname IN ('increment_balance', 'fund_pocket', 'fund_community_loan', 'initiate_p2p_withdrawal',
                     'sl_credit_carrier', 'sl_pay_for_package', 'vault_transfer', 'pay_insurance_premium')
 GROUP BY 1 ORDER BY 1;

-- Every row should show rls = true and anon_can_read = false:
SELECT c.relname AS private_table, c.relrowsecurity AS rls,
       has_table_privilege('anon', c.oid, 'SELECT') AS anon_can_read
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public'
   AND c.relname IN ('infinite_cards', 'sl_partner_keys', 'balance_corrections', 'standard_withdrawals',
                     'stripe_unattributed_deposits', 'contact_messages', 'newsletter_subscribers')
 ORDER BY 1;
