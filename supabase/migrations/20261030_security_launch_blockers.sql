-- ==============================================================================
-- IFB: SECURITY LAUNCH BLOCKERS (forward-only fix migration)
-- Migration Date: 2026-10-30
--
-- Fixes findings C3, C4, C5, C10 (DB part), C11, C12, H1, H2, H3, M4.
-- Older migrations are already applied in production and are NOT edited; every
-- fix here is a CREATE OR REPLACE / DROP / REVOKE layered on top of them.
-- The migration is written to be re-runnable (IF EXISTS / IF NOT EXISTS /
-- DO-block guards) because several objects only exist in some environments.
--
-- Conventions used below
--   * "client roles"  = the PostgREST roles anon / authenticated.
--   * "trusted backend" = a call that is NOT made with an anon/authenticated
--     JWT: service_role (edge functions), or a direct DB session with no JWT
--     (migrations, pg_cron, pg_net callbacks, SQL editor).
--   * Every SECURITY DEFINER function pins `SET search_path = public`.
-- ==============================================================================


-- ==============================================================================
-- 0. SHARED HELPERS
-- ==============================================================================

-- Role from the PostgREST JWT. Supports both the legacy per-claim GUC and the
-- PostgREST >= v10 `request.jwt.claims` JSON GUC (only the latter is set on
-- current Supabase, so checking `request.jwt.claim.role` alone is not enough).
CREATE OR REPLACE FUNCTION public._jwt_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
  );
$$;

-- TRUE for service_role or for a direct DB session without a JWT.
CREATE OR REPLACE FUNCTION public._is_trusted_backend()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(public._jwt_role(), '') NOT IN ('anon', 'authenticated');
$$;

-- M4: single source of truth for "is the caller an administrator".
-- SECURITY DEFINER so it can read profiles/admin_roles without tripping the
-- profiles RLS policies that call it (the old policies queried profiles from a
-- profiles policy, i.e. infinite recursion).
-- NOTE: 'is_cot_processor' is deliberately NOT an admin role (H3).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_uid AND role IN ('admin', 'admin_l3', 'superadmin')
  ) THEN
    RETURN TRUE;
  END IF;

  IF to_regclass('public.admin_roles') IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.admin_roles
      WHERE user_id = v_uid AND is_active = TRUE
    );
  END IF;

  RETURN FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- Resolve the user a money-moving RPC acts for (C12).
--   * trusted backend: may act for any p_user_id (must be non-null)
--   * client: must be logged in and p_user_id (kept for client compatibility)
--     must be NULL or equal auth.uid(); otherwise raise.
CREATE OR REPLACE FUNCTION public._effective_user(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF public._is_trusted_backend() THEN
    IF p_user_id IS NULL THEN
      RAISE EXCEPTION 'p_user_id is required' USING ERRCODE = '22023';
    END IF;
    RETURN p_user_id;
  END IF;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NOT NULL AND p_user_id <> v_uid THEN
    RAISE EXCEPTION 'Unauthorized: you can only act on your own account' USING ERRCODE = '42501';
  END IF;

  RETURN v_uid;
END;
$$;

REVOKE ALL ON FUNCTION public._jwt_role()            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public._is_trusted_backend()  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public._effective_user(UUID)  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._jwt_role()           TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._is_trusted_backend() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._effective_user(UUID) TO service_role;


-- ==============================================================================
-- 1. C3 + M4: PROFILES PRIVILEGE ESCALATION / RECURSIVE ADMIN POLICIES
-- ==============================================================================

-- 1a. Replace self-referencing admin policies with is_admin().
DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;

CREATE POLICY "profiles_admin_select" ON public.profiles
  FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY "profiles_admin_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- 1b. Column guard. profiles_update_own (20261025:84-87) lets a user UPDATE
-- any column of their own row, including role/kyc_status. This trigger blocks
-- changes to privilege columns when the statement is executed directly by a
-- client role (current_user anon/authenticated) unless the caller is_admin().
--
-- Statements executed inside SECURITY DEFINER functions run as the function
-- owner, and service_role runs as service_role, so reviewed server paths
-- (admin_* RPCs that check is_admin(), handle_new_user, verify-otp edge
-- function, migrations) are unaffected. This is a superset of the
-- "jwt role = service_role OR is_admin()" rule.
--
-- Columns are compared through to_jsonb() so the trigger works whether or not
-- every column exists in a given environment.
CREATE OR REPLACE FUNCTION public.profiles_guard_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_protected TEXT[] := ARRAY[
    'id', 'email', 'role', 'kyc_status', 'is_admin', 'is_verified', 'is_active',
    'is_cot_processor', 'cot_status', 'cot_rating', 'cot_completed_tx',
    'phone_verified', 'active_tier'
  ];
  v_new JSONB;
  v_old JSONB;
  v_col TEXT;
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  v_new := to_jsonb(NEW);

  IF TG_OP = 'INSERT' THEN
    IF COALESCE(v_new ->> 'role', 'user') <> 'user'
       OR COALESCE(v_new ->> 'kyc_status', 'not_started') IN ('verified', 'approved')
       OR COALESCE(v_new ->> 'is_cot_processor', 'false') = 'true'
       OR COALESCE(v_new ->> 'phone_verified',   'false') = 'true'
       OR COALESCE(v_new ->> 'is_admin',         'false') = 'true'
       OR COALESCE(v_new ->> 'is_verified',      'false') = 'true'
    THEN
      RAISE EXCEPTION 'Permission denied: privileged profile fields cannot be set by the client'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  v_old := to_jsonb(OLD);

  FOREACH v_col IN ARRAY v_protected LOOP
    IF (v_new -> v_col) IS DISTINCT FROM (v_old -> v_col) THEN
      -- The KYC wizard legitimately moves the user's own status to
      -- 'pending_kyc' on (re)submission. Allowed only from a non-approved,
      -- non-suspended state; never into an approved state.
      IF v_col = 'kyc_status'
         AND v_new ->> 'kyc_status' = 'pending_kyc'
         AND COALESCE(v_old ->> 'kyc_status', 'not_started') NOT IN ('verified', 'approved', 'suspended')
      THEN
        CONTINUE;
      END IF;

      RAISE EXCEPTION 'Permission denied: profiles.% can only be changed by an administrator', v_col
        USING ERRCODE = '42501';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_guard_privileged ON public.profiles;
CREATE TRIGGER trg_profiles_guard_privileged
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_privileged_columns();


-- ==============================================================================
-- 2. C4: DROP CLIENT-CALLABLE "INSTANT DEPOSIT" (free money)
-- ==============================================================================
DROP FUNCTION IF EXISTS public.instant_deposit(NUMERIC, TEXT);
DROP FUNCTION IF EXISTS public.instant_deposit(NUMERIC);


-- ==============================================================================
-- 3. C5: process_internal_transfer — symmetric AFR conversion, validate first
-- ==============================================================================
-- Rate choice: 1 USD = 100 AFR (AFR is 1/100 USD).
--   * supabase/functions/afr-mint mints `usd * afr_mint_ratio` AFR, with
--     app_config.afr_mint_ratio seeded to '100' (20260504_processor_kyc_afr.sql).
--   * The previous body already credited USD -> AFR at x100.
-- So USD -> AFR multiplies by c_afr_per_usd and AFR -> USD divides by it.
-- AFR -> USD credit is truncated (not rounded) to cents so repeated tiny
-- conversions cannot round money into existence. If afr_mint_ratio is ever
-- changed, this constant MUST be changed with it.
CREATE OR REPLACE FUNCTION public.process_internal_transfer(
  p_user_id UUID,
  p_from    TEXT,
  p_to      TEXT,
  p_amount  NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_afr_per_usd CONSTANT NUMERIC := 100;
  v_uid         UUID := auth.uid();
  v_from        TEXT;
  v_to          TEXT;
  v_amt         NUMERIC;
  v_credit      NUMERIC;
  v_bal         JSONB;
  v_source_bal  NUMERIC;
BEGIN
  IF v_uid IS NULL OR v_uid IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Unauthorized caller.' USING ERRCODE = '42501';
  END IF;

  -- Validate everything BEFORE touching balances. Column names come only
  -- from this fixed whitelist, so the dynamic UPDATE below is injection-safe.
  v_from := CASE
    WHEN p_from IN ('liquid_usd', 'USD', 'checking')          THEN 'liquid_usd'
    WHEN p_from IN ('mysafe_digital_usd', 'savings', 'vault') THEN 'mysafe_digital_usd'
    WHEN p_from IN ('afr_balance', 'AFR')                     THEN 'afr_balance'
  END;
  v_to := CASE
    WHEN p_to IN ('liquid_usd', 'USD', 'checking')            THEN 'liquid_usd'
    WHEN p_to IN ('mysafe_digital_usd', 'savings', 'vault')   THEN 'mysafe_digital_usd'
    WHEN p_to IN ('afr_balance', 'AFR')                       THEN 'afr_balance'
    WHEN p_to IN ('alpha_equity_usd', 'invest')               THEN 'alpha_equity_usd'
  END;

  IF v_from IS NULL THEN
    RAISE EXCEPTION 'Invalid source account: %', p_from USING ERRCODE = '22023';
  END IF;
  IF v_to IS NULL THEN
    RAISE EXCEPTION 'Invalid destination account: %', p_to USING ERRCODE = '22023';
  END IF;
  IF v_from = v_to THEN
    RAISE EXCEPTION 'Source and destination accounts must differ.' USING ERRCODE = '22023';
  END IF;

  v_amt := ROUND(p_amount::NUMERIC, 2);
  IF v_amt IS NULL OR v_amt <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be greater than zero.');
  END IF;

  IF v_from <> 'afr_balance' AND v_to = 'afr_balance' THEN
    v_credit := v_amt * c_afr_per_usd;                 -- USD -> AFR
  ELSIF v_from = 'afr_balance' AND v_to <> 'afr_balance' THEN
    v_credit := TRUNC(v_amt / c_afr_per_usd, 2);       -- AFR -> USD
  ELSE
    v_credit := v_amt;                                 -- USD -> USD
  END IF;

  IF v_credit <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount too small to convert.');
  END IF;

  SELECT to_jsonb(b) INTO v_bal FROM public.balances b WHERE b.user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Balance record not found.');
  END IF;

  v_source_bal := COALESCE((v_bal ->> v_from)::NUMERIC, 0);
  IF v_source_bal < v_amt THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient funds in source account.');
  END IF;

  EXECUTE format(
    'UPDATE public.balances SET %1$I = COALESCE(%1$I, 0) - $1, %2$I = COALESCE(%2$I, 0) + $2, updated_at = NOW() WHERE user_id = $3',
    v_from, v_to
  ) USING v_amt, v_credit, v_uid;

  INSERT INTO public.transactions (user_id, amount, transaction_type, description, status, created_at, metadata)
  VALUES (
    v_uid, 0, 'transfer_internal',
    'Internal transfer of ' || v_amt || ' from ' || v_from || ' to ' || v_to,
    'completed', NOW(),
    jsonb_build_object('from', v_from, 'to', v_to, 'debited', v_amt, 'credited', v_credit,
                       'afr_per_usd', c_afr_per_usd)
  );

  RETURN jsonb_build_object('success', true, 'amount', v_amt, 'credited', v_credit);
END;
$$;

REVOKE ALL ON FUNCTION public.process_internal_transfer(UUID, TEXT, TEXT, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_internal_transfer(UUID, TEXT, TEXT, NUMERIC) TO authenticated, service_role;


-- ==============================================================================
-- 4. C12: LEGACY / UNAUTHENTICATED MONEY-MOVING RPCS
-- ==============================================================================

-- 4a. Legacy 3-arg p2p_transfer had no sender == auth.uid() check.
--     The 4-arg version (20261025) remains; 3 named args resolve to it via the
--     p_asset DEFAULT.
DROP FUNCTION IF EXISTS public.p2p_transfer(UUID, UUID, NUMERIC);

-- 4b. process_card_payment (20260517_smart_card_logic.sql)
CREATE OR REPLACE FUNCTION public.process_card_payment(
  p_user_id       UUID,
  p_merchant_name TEXT,
  p_amount        NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid           UUID;
  v_amount        NUMERIC;
  v_balance       NUMERIC;
  v_fallback      BOOLEAN;
  v_pool_id       UUID;
  v_pool_name     TEXT;
  v_pool_liq      NUMERIC;
  v_limit         NUMERIC;
  v_coverage_left NUMERIC;
  v_shortfall     NUMERIC;
BEGIN
  v_uid := public._effective_user(p_user_id);

  v_amount := ROUND(p_amount, 2);
  IF v_amount IS NULL OR v_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Amount must be greater than zero.');
  END IF;

  SELECT COALESCE(liquid_usd, 0), COALESCE(card_insurance_fallback, TRUE)
    INTO v_balance, v_fallback
  FROM public.balances WHERE user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Account not found.');
  END IF;

  IF v_balance >= v_amount THEN
    UPDATE public.balances SET liquid_usd = liquid_usd - v_amount, updated_at = NOW() WHERE user_id = v_uid;
    INSERT INTO public.transactions (user_id, amount, transaction_type, status, description)
    VALUES (v_uid, -v_amount, 'card_payment', 'completed', 'Payment to ' || COALESCE(p_merchant_name, 'merchant'));
    RETURN jsonb_build_object('ok', true, 'method', 'primary_balance', 'amount', v_amount);
  END IF;

  IF NOT v_fallback THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Insufficient funds and insurance fallback disabled.');
  END IF;

  SELECT s.pool_id, s.coverage_amount_limit
    INTO v_pool_id, v_limit
  FROM public.clyrix_subscriptions s
  WHERE s.user_id = v_uid AND s.status = 'active'
  LIMIT 1;

  IF v_pool_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Insufficient funds and no active insurance coverage to cover shortfall.');
  END IF;

  SELECT name, COALESCE(total_liquidity_usd, 0) INTO v_pool_name, v_pool_liq
  FROM public.clyrix_pools WHERE id = v_pool_id
  FOR UPDATE;

  v_coverage_left := COALESCE(v_limit, 0) - COALESCE((
    SELECT SUM(requested_amount) FROM public.clyrix_claims
    WHERE user_id = v_uid AND status = 'approved'), 0);
  v_shortfall := v_amount - v_balance;

  IF v_coverage_left < v_shortfall OR v_pool_liq < v_shortfall THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Insufficient funds and no active insurance coverage to cover shortfall.');
  END IF;

  UPDATE public.balances SET liquid_usd = 0, updated_at = NOW() WHERE user_id = v_uid;

  INSERT INTO public.clyrix_claims (user_id, pool_id, title, description, requested_amount, status, ai_validation_score)
  VALUES (v_uid, v_pool_id, 'Automated Card Coverage',
          'Real-time liquidity bridge for payment at ' || COALESCE(p_merchant_name, 'merchant'),
          v_shortfall, 'approved', 100);

  UPDATE public.clyrix_pools SET total_liquidity_usd = total_liquidity_usd - v_shortfall WHERE id = v_pool_id;

  INSERT INTO public.afr_ledger (user_id, tx_type, afr_amount, usd_equivalent, notes, status)
  VALUES (v_uid, 'card_payment', 0, v_amount,
          'Hybrid Card Payment (Insurance Boost): ' || COALESCE(p_merchant_name, 'merchant'), 'confirmed');

  IF v_balance > 0 THEN
    INSERT INTO public.transactions (user_id, amount, transaction_type, status, description)
    VALUES (v_uid, -v_balance, 'card_payment', 'completed',
            'Payment to ' || COALESCE(p_merchant_name, 'merchant') || ' (insurance-assisted)');
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'method', 'hybrid_insurance',
    'primary_drained', v_balance, 'insurance_covered', v_shortfall,
    'pool_utilized', v_pool_name
  );
END;
$$;

-- 4c. process_clyrix_contribution (20260516_clyrix_infrastructure.sql)
--     Previously: no auth, no balance check (could drive balances negative).
CREATE OR REPLACE FUNCTION public.process_clyrix_contribution(
  p_user_id UUID,
  p_pool_id UUID,
  p_amount  NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       UUID;
  v_amount    NUMERIC;
  v_pool_name TEXT;
  v_mgt_pct   NUMERIC;
  v_fee       NUMERIC;
  v_net_pool  NUMERIC;
  v_balance   NUMERIC;
BEGIN
  v_uid := public._effective_user(p_user_id);

  v_amount := ROUND(p_amount, 2);
  IF v_amount IS NULL OR v_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Amount must be greater than zero.');
  END IF;

  SELECT name, COALESCE(management_fee_pct, 0) INTO v_pool_name, v_mgt_pct
  FROM public.clyrix_pools WHERE id = p_pool_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Pool not found.');
  END IF;

  SELECT liquid_usd INTO v_balance FROM public.balances WHERE user_id = v_uid FOR UPDATE;
  IF v_balance IS NULL OR v_balance < v_amount THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Insufficient balance.');
  END IF;

  v_fee      := ROUND(v_amount * (v_mgt_pct / 100), 2);
  v_net_pool := v_amount - v_fee;

  UPDATE public.balances SET liquid_usd = liquid_usd - v_amount, updated_at = NOW() WHERE user_id = v_uid;

  UPDATE public.clyrix_pools SET
    total_liquidity_usd  = COALESCE(total_liquidity_usd, 0) + v_net_pool,
    active_members_count = COALESCE(active_members_count, 0) + 1
  WHERE id = p_pool_id;

  INSERT INTO public.afr_ledger (user_id, tx_type, afr_amount, usd_equivalent, notes, status)
  VALUES (v_uid, 'transfer', 0, v_amount, 'CLYRIX Contribution: ' || v_pool_name, 'confirmed');

  INSERT INTO public.transactions (user_id, amount, transaction_type, status, description)
  VALUES (v_uid, -v_amount, 'clyrix_contribution', 'completed', 'CLYRIX Contribution: ' || v_pool_name);

  RETURN jsonb_build_object('ok', true, 'pool', v_pool_name, 'net_contribution', v_net_pool);
END;
$$;

-- 4d. process_monetized_interaction (20260514_monetized_likes.sql)
--     Previously: any p_user_id; negative 'special' amounts reversed the flow.
CREATE OR REPLACE FUNCTION public.process_monetized_interaction(
  p_post_id          UUID,
  p_user_id          UUID,
  p_interaction_type TEXT,
  p_custom_amount    NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       UUID;
  v_poster_id UUID;
  v_balance   NUMERIC;
  v_amount    NUMERIC;
BEGIN
  v_uid := public._effective_user(p_user_id);

  SELECT author_id INTO v_poster_id FROM public.social_posts WHERE id = p_post_id;
  IF v_poster_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Post not found.');
  END IF;
  IF v_poster_id = v_uid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cannot pay yourself for a like.');
  END IF;

  IF p_interaction_type = 'special' THEN
    v_amount := ROUND(p_custom_amount, 2);
    IF v_amount IS NULL OR v_amount <= 0 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Special reactions require an amount greater than zero.');
    END IF;
  ELSE
    SELECT ROUND(COALESCE(default_like_value, 0), 2) INTO v_amount FROM public.profiles WHERE id = v_uid;
    v_amount := COALESCE(v_amount, 0);
  END IF;

  IF v_amount <= 0 THEN
    INSERT INTO public.social_interactions (post_id, user_id, interaction_type, amount_paid)
    VALUES (p_post_id, v_uid, p_interaction_type, 0)
    ON CONFLICT (post_id, user_id) DO UPDATE SET interaction_type = EXCLUDED.interaction_type;
    RETURN jsonb_build_object('ok', true, 'amount', 0);
  END IF;

  -- Lock both balance rows in a deterministic order (deadlock-safe).
  PERFORM 1 FROM public.balances
  WHERE user_id IN (v_uid, v_poster_id)
  ORDER BY user_id
  FOR UPDATE;

  SELECT liquid_usd INTO v_balance FROM public.balances WHERE user_id = v_uid;
  IF v_balance IS NULL OR v_balance < v_amount THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Insufficient funds for this interaction.');
  END IF;

  UPDATE public.balances SET liquid_usd = liquid_usd - v_amount, updated_at = NOW() WHERE user_id = v_uid;

  INSERT INTO public.balances (user_id, liquid_usd, updated_at)
  VALUES (v_poster_id, v_amount, NOW())
  ON CONFLICT (user_id) DO UPDATE
    SET liquid_usd = COALESCE(balances.liquid_usd, 0) + EXCLUDED.liquid_usd, updated_at = NOW();

  INSERT INTO public.transactions (user_id, amount, transaction_type, status, description)
  VALUES
    (v_uid,       -v_amount, 'social_outbound', 'completed', 'Monetized reaction to post ' || p_post_id),
    (v_poster_id,  v_amount, 'social_inbound',  'completed', 'Revenue from post ' || p_post_id);

  INSERT INTO public.social_interactions (post_id, user_id, interaction_type, amount_paid)
  VALUES (p_post_id, v_uid, p_interaction_type, v_amount)
  ON CONFLICT (post_id, user_id) DO UPDATE SET
    interaction_type = EXCLUDED.interaction_type,
    amount_paid      = COALESCE(social_interactions.amount_paid, 0) + EXCLUDED.amount_paid;

  UPDATE public.social_posts SET total_revenue = COALESCE(total_revenue, 0) + v_amount WHERE id = p_post_id;

  RETURN jsonb_build_object('ok', true, 'amount', v_amount);
END;
$$;

-- 4e. make_pension_contribution (apps/core/.../20260612010000_pension_fund.sql)
--     Guarded: pension_accounts may not exist in every environment.
DO $do$
BEGIN
  IF to_regclass('public.pension_accounts') IS NULL THEN
    RAISE NOTICE 'pension_accounts missing; skipping make_pension_contribution';
    RETURN;
  END IF;

  EXECUTE $fn$
  CREATE OR REPLACE FUNCTION public.make_pension_contribution(
    p_user_id UUID,
    p_amount  NUMERIC
  )
  RETURNS JSONB
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
  DECLARE
    v_uid        UUID;
    v_amount     NUMERIC;
    v_account_id UUID;
    v_status     TEXT;
    v_balance    NUMERIC;
    v_new_bal    NUMERIC;
  BEGIN
    v_uid := public._effective_user(p_user_id);

    v_amount := ROUND(p_amount, 2);
    IF v_amount IS NULL OR v_amount <= 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Amount must be greater than zero');
    END IF;

    SELECT id, status INTO v_account_id, v_status
    FROM public.pension_accounts WHERE user_id = v_uid
    FOR UPDATE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'No pension account found');
    END IF;
    IF v_status IS DISTINCT FROM 'active' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Pension account is not active');
    END IF;

    SELECT liquid_usd INTO v_balance FROM public.balances WHERE user_id = v_uid FOR UPDATE;
    IF v_balance IS NULL OR v_balance < v_amount THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    UPDATE public.balances SET liquid_usd = liquid_usd - v_amount, updated_at = NOW()
    WHERE user_id = v_uid
    RETURNING liquid_usd INTO v_new_bal;

    UPDATE public.pension_accounts
      SET current_balance   = current_balance + v_amount,
          total_contributed = total_contributed + v_amount
    WHERE id = v_account_id;

    INSERT INTO public.pension_contributions (account_id, user_id, amount, source)
    VALUES (v_account_id, v_uid, v_amount, 'manual');

    INSERT INTO public.transactions (user_id, transaction_type, amount, status, description)
    VALUES (v_uid, 'pension_contribution', -v_amount, 'completed', 'IFB Pension Fund Contribution');

    RETURN jsonb_build_object('success', true, 'new_liquid_balance', v_new_bal);
  END;
  $$;
  $fn$;
END
$do$;

-- 4f. pay_insurance_premium + admin_trigger_insurance_payout
--     (apps/core/.../20260612020000_agri_insurance.sql)
DO $do$
BEGIN
  IF to_regclass('public.insurance_policies') IS NULL OR to_regclass('public.insurance_claims') IS NULL THEN
    RAISE NOTICE 'insurance tables missing; skipping insurance fixes';
    RETURN;
  END IF;

  EXECUTE $fn$
  CREATE OR REPLACE FUNCTION public.pay_insurance_premium(
    p_user_id   UUID,
    p_policy_id UUID,
    p_amount    NUMERIC,
    p_period    DATE
  )
  RETURNS JSONB
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
  DECLARE
    v_uid     UUID;
    v_amount  NUMERIC;
    v_premium NUMERIC;
    v_status  TEXT;
    v_balance NUMERIC;
    v_new_bal NUMERIC;
  BEGIN
    v_uid := public._effective_user(p_user_id);

    v_amount := ROUND(p_amount, 2);
    IF v_amount IS NULL OR v_amount <= 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Amount must be greater than zero');
    END IF;
    IF p_period IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Premium period is required');
    END IF;

    SELECT premium_monthly_usd, status INTO v_premium, v_status
    FROM public.insurance_policies
    WHERE id = p_policy_id AND user_id = v_uid
    FOR UPDATE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Policy not found');
    END IF;
    IF v_status IN ('cancelled', 'expired', 'claimed') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Policy is not payable in status ' || v_status);
    END IF;
    IF v_amount < COALESCE(v_premium, 0) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Amount is below the policy premium');
    END IF;

    SELECT liquid_usd INTO v_balance FROM public.balances WHERE user_id = v_uid FOR UPDATE;
    IF v_balance IS NULL OR v_balance < v_amount THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    UPDATE public.balances SET liquid_usd = liquid_usd - v_amount, updated_at = NOW()
    WHERE user_id = v_uid
    RETURNING liquid_usd INTO v_new_bal;

    INSERT INTO public.insurance_premium_payments (policy_id, user_id, amount, period_date)
    VALUES (p_policy_id, v_uid, v_amount, p_period);

    UPDATE public.insurance_policies
      SET next_premium_due = p_period + INTERVAL '1 month'
    WHERE id = p_policy_id;

    INSERT INTO public.transactions (user_id, transaction_type, amount, status, description)
    VALUES (v_uid, 'insurance_premium', -v_amount, 'completed', 'AgriShield Premium Payment');

    RETURN jsonb_build_object('success', true, 'new_liquid_balance', v_new_bal);
  END;
  $$;
  $fn$;

  -- Payout: admin or trusted backend only; claim locked; amount derived
  -- server-side (client-filed claims carry payout_amount = 0, see 4g).
  EXECUTE $fn$
  CREATE OR REPLACE FUNCTION public.admin_trigger_insurance_payout(
    p_claim_id    UUID,
    p_admin_notes TEXT DEFAULT NULL
  )
  RETURNS JSONB
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
  DECLARE
    v_claim  RECORD;
    v_policy RECORD;
    v_payout NUMERIC;
  BEGIN
    IF NOT (public.is_admin() OR public._is_trusted_backend()) THEN
      RAISE EXCEPTION 'Access denied: admin role required' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_claim FROM public.insurance_claims WHERE id = p_claim_id FOR UPDATE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Claim not found');
    END IF;
    IF v_claim.status NOT IN ('pending', 'approved') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Claim is not in a payable state');
    END IF;

    SELECT * INTO v_policy FROM public.insurance_policies WHERE id = v_claim.policy_id FOR UPDATE;
    IF NOT FOUND OR v_policy.user_id IS DISTINCT FROM v_claim.user_id THEN
      RETURN jsonb_build_object('success', false, 'error', 'Policy not found for claim');
    END IF;

    v_payout := LEAST(
      COALESCE(NULLIF(v_claim.payout_amount, 0), v_policy.coverage_amount_usd),
      v_policy.coverage_amount_usd
    );
    IF v_payout IS NULL OR v_payout <= 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'No payable amount');
    END IF;

    INSERT INTO public.balances (user_id, liquid_usd, updated_at)
    VALUES (v_claim.user_id, v_payout, NOW())
    ON CONFLICT (user_id) DO UPDATE
      SET liquid_usd = COALESCE(balances.liquid_usd, 0) + EXCLUDED.liquid_usd, updated_at = NOW();

    UPDATE public.insurance_claims
      SET status = 'paid', paid_at = NOW(), payout_amount = v_payout, admin_notes = p_admin_notes
    WHERE id = p_claim_id;

    UPDATE public.insurance_policies SET status = 'claimed' WHERE id = v_claim.policy_id;

    INSERT INTO public.transactions (user_id, transaction_type, amount, status, description)
    VALUES (v_claim.user_id, 'insurance_payout', v_payout, 'completed',
            'AgriShield Parametric Payout — ' || v_claim.trigger_type);

    INSERT INTO public.notifications (user_id, type, message)
    VALUES (v_claim.user_id, 'system',
            'AgriShield payout of $' || v_payout || ' has been credited to your account.');

    RETURN jsonb_build_object('success', true, 'payout', v_payout);
  END;
  $$;
  $fn$;

  -- 4g. insurance_claims RLS: owner SELECT + INSERT only; admin SELECT.
  EXECUTE 'DROP POLICY IF EXISTS "ins_claims_own" ON public.insurance_claims';
  EXECUTE 'DROP POLICY IF EXISTS "ins_claims_select_own" ON public.insurance_claims';
  EXECUTE 'DROP POLICY IF EXISTS "ins_claims_insert_own" ON public.insurance_claims';
  EXECUTE 'DROP POLICY IF EXISTS "ins_claims_admin_select" ON public.insurance_claims';

  EXECUTE $p$
    CREATE POLICY "ins_claims_select_own" ON public.insurance_claims
      FOR SELECT TO authenticated USING (user_id = auth.uid())
  $p$;
  EXECUTE $p$
    CREATE POLICY "ins_claims_insert_own" ON public.insurance_claims
      FOR INSERT TO authenticated
      WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.insurance_policies ip
                    WHERE ip.id = policy_id AND ip.user_id = auth.uid())
      )
  $p$;
  EXECUTE $p$
    CREATE POLICY "ins_claims_admin_select" ON public.insurance_claims
      FOR SELECT TO authenticated USING ((SELECT public.is_admin()))
  $p$;

  EXECUTE $fn$
  CREATE OR REPLACE FUNCTION public.insurance_claims_force_client_defaults()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path = public
  AS $$
  BEGIN
    IF current_user IN ('anon', 'authenticated') AND NOT public.is_admin() THEN
      IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'Claims cannot be modified by the client' USING ERRCODE = '42501';
      END IF;
      NEW.payout_amount := 0;          -- column is NOT NULL; 0 = "to be determined"
      NEW.status        := 'pending';
      NEW.paid_at       := NULL;
      NEW.admin_notes   := NULL;
      NEW.filed_at      := NOW();
    END IF;
    RETURN NEW;
  END;
  $$;
  $fn$;

  EXECUTE 'DROP TRIGGER IF EXISTS trg_insurance_claims_client_defaults ON public.insurance_claims';
  EXECUTE 'CREATE TRIGGER trg_insurance_claims_client_defaults
             BEFORE INSERT OR UPDATE ON public.insurance_claims
             FOR EACH ROW EXECUTE FUNCTION public.insurance_claims_force_client_defaults()';
END
$do$;

-- 4h. unlock_first_customer_program (20261025:397-423)
--     Fee is server-side; p_fee is kept for client compatibility and ignored.
CREATE OR REPLACE FUNCTION public.unlock_first_customer_program(
  p_program_id UUID,
  p_fee        NUMERIC DEFAULT 250
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_fee       CONSTANT NUMERIC := 250;
  v_uid       UUID := auth.uid();
  v_unlocked  BOOLEAN;
  v_balance   NUMERIC;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT is_unlocked INTO v_unlocked
  FROM public.first_customer_programs
  WHERE id = p_program_id AND user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Program not found');
  END IF;
  IF v_unlocked THEN
    RETURN jsonb_build_object('success', true, 'already_unlocked', true);
  END IF;

  SELECT liquid_usd INTO v_balance FROM public.balances WHERE user_id = v_uid FOR UPDATE;
  IF v_balance IS NULL OR v_balance < c_fee THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  UPDATE public.balances SET liquid_usd = liquid_usd - c_fee, updated_at = NOW() WHERE user_id = v_uid;
  UPDATE public.first_customer_programs
     SET is_unlocked = TRUE, amount_paid = c_fee, updated_at = NOW()
   WHERE id = p_program_id AND user_id = v_uid;

  INSERT INTO public.transactions (user_id, transaction_type, amount, status, description)
  VALUES (v_uid, 'first_customer_program', -c_fee, 'completed', 'First Customer Engine — Full Program Unlock');

  RETURN jsonb_build_object('success', true, 'fee', c_fee);
END;
$$;

REVOKE ALL ON FUNCTION public.unlock_first_customer_program(UUID, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unlock_first_customer_program(UUID, NUMERIC) TO authenticated, service_role;

-- 4i. provision_new_user (20260802:80-125): trigger/backend only, and the
--     referral bonus is paid only when this call actually created the profile.
CREATE OR REPLACE FUNCTION public.provision_new_user(
  p_user_id   UUID,
  p_full_name TEXT,
  p_ref_code  TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email       TEXT;
  v_inserted    UUID;
  v_ref_user_id UUID;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown user %', p_user_id;
  END IF;

  INSERT INTO public.profiles (id, full_name, email, created_at, role)
  VALUES (p_user_id, p_full_name, v_email, NOW(), 'user')
  ON CONFLICT (id) DO NOTHING
  RETURNING id INTO v_inserted;

  INSERT INTO public.balances (
    user_id, liquid_usd, alpha_equity_usd, mysafe_digital_usd, afr_balance, created_at, updated_at
  )
  VALUES (p_user_id, 0, 0, 0, 0, NOW(), NOW())
  ON CONFLICT (user_id) DO NOTHING;

  IF v_inserted IS NOT NULL AND p_ref_code IS NOT NULL THEN
    SELECT id INTO v_ref_user_id
    FROM public.profiles
    WHERE referral_code = p_ref_code AND id <> p_user_id
    LIMIT 1;

    IF v_ref_user_id IS NOT NULL THEN
      UPDATE public.balances SET afr_balance = COALESCE(afr_balance, 0) + 500 WHERE user_id = v_ref_user_id;
      UPDATE public.balances SET afr_balance = COALESCE(afr_balance, 0) + 200 WHERE user_id = p_user_id;
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.provision_new_user(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provision_new_user(UUID, TEXT, TEXT) TO service_role;

-- 4j. afr_network_nodes (20260528:28-29): FOR ALL allowed users to write
--     afr_rewards_earned / node_type / last_heartbeat and mint AFR.
--     useAFRNode.js upserts its own row (INSERT ... ON CONFLICT DO UPDATE), so
--     owner INSERT + UPDATE are kept, but reward/stat columns are server-owned
--     and enforced by trigger. The USING(TRUE) public policy leaked every
--     user's user_agent/ip_region; get_network_stats() is SECURITY DEFINER and
--     does not need it.
DO $do$
BEGIN
  IF to_regclass('public.afr_network_nodes') IS NULL THEN
    RAISE NOTICE 'afr_network_nodes missing; skipping';
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS "node_own_rw" ON public.afr_network_nodes';
  EXECUTE 'DROP POLICY IF EXISTS "node_public_count" ON public.afr_network_nodes';
  EXECUTE 'DROP POLICY IF EXISTS "node_own_select" ON public.afr_network_nodes';
  EXECUTE 'DROP POLICY IF EXISTS "node_own_insert" ON public.afr_network_nodes';
  EXECUTE 'DROP POLICY IF EXISTS "node_own_update" ON public.afr_network_nodes';

  EXECUTE 'CREATE POLICY "node_own_select" ON public.afr_network_nodes
             FOR SELECT TO authenticated USING (auth.uid() = user_id)';
  EXECUTE 'CREATE POLICY "node_own_insert" ON public.afr_network_nodes
             FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)';
  EXECUTE 'CREATE POLICY "node_own_update" ON public.afr_network_nodes
             FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
  EXECUTE 'REVOKE DELETE ON public.afr_network_nodes FROM anon, authenticated';
  EXECUTE 'REVOKE ALL ON public.afr_network_nodes FROM anon';

  EXECUTE $fn$
  CREATE OR REPLACE FUNCTION public.afr_nodes_protect_server_columns()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path = public
  AS $$
  BEGIN
    IF current_user NOT IN ('anon', 'authenticated') THEN
      RETURN NEW;  -- SECURITY DEFINER RPCs / service_role
    END IF;

    NEW.last_heartbeat := NOW();   -- never trust a client clock (reward accrual)
    IF TG_OP = 'INSERT' THEN
      NEW.afr_rewards_earned := 0;
      NEW.afr_staked         := 0;
      NEW.uptime_seconds     := 0;
      NEW.tx_relayed_count   := 0;
      NEW.node_type          := 'light_node';
    ELSE
      NEW.user_id            := OLD.user_id;
      NEW.device_id          := OLD.device_id;
      NEW.afr_rewards_earned := OLD.afr_rewards_earned;
      NEW.afr_staked         := OLD.afr_staked;
      NEW.uptime_seconds     := OLD.uptime_seconds;
      NEW.tx_relayed_count   := OLD.tx_relayed_count;
      NEW.node_type          := OLD.node_type;
      NEW.created_at         := OLD.created_at;
    END IF;
    RETURN NEW;
  END;
  $$;
  $fn$;

  EXECUTE 'DROP TRIGGER IF EXISTS trg_afr_nodes_protect ON public.afr_network_nodes';
  EXECUTE 'CREATE TRIGGER trg_afr_nodes_protect
             BEFORE INSERT OR UPDATE ON public.afr_network_nodes
             FOR EACH ROW EXECUTE FUNCTION public.afr_nodes_protect_server_columns()';
END
$do$;


-- ==============================================================================
-- 5. H1: P2P DEPOSIT CONFIRMATION + IDEMPOTENT SERVER-SIDE LEDGER RPCS
-- ==============================================================================

-- 5a. update_processor_stock (20260906_liquidity_processor_network.sql:173)
--     Was SECURITY DEFINER with no checks (any user could inflate any
--     processor's stock and steer routing). Now SECURITY INVOKER:
--       * called from SECURITY DEFINER RPCs (confirm_p2p_receipt,
--         mark_p2p_withdrawal_sent) it runs as the owner -> allowed;
--       * called directly by a client it requires is_admin() (and is then
--         also subject to processor_stock RLS).
CREATE OR REPLACE FUNCTION public.update_processor_stock(
  p_processor_id UUID,
  p_network      TEXT,
  p_country      TEXT,
  p_delta_usd    NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin role required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.processor_stock
  SET balance_usd   = GREATEST(0, balance_usd + p_delta_usd),
      balance_local = GREATEST(0, balance_local + (p_delta_usd * exchange_rate)),
      last_updated  = NOW()
  WHERE processor_id = p_processor_id
    AND network = p_network
    AND country = p_country;
END;
$$;

REVOKE ALL ON FUNCTION public.update_processor_stock(UUID, TEXT, TEXT, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_processor_stock(UUID, TEXT, TEXT, NUMERIC) TO authenticated, service_role;

-- 5b. confirm_p2p_receipt (20260906000200:87-180)
--     Was: re-confirmable (status not checked) -> repeat credits; no row lock.
--     Dropped first because older environments may have the RETURNS void
--     version (20260906_liquidity_processor_network.sql:335).
DROP FUNCTION IF EXISTS public.confirm_p2p_receipt(UUID);

CREATE FUNCTION public.confirm_p2p_receipt(p_order_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid         UUID := auth.uid();
  v_is_admin    BOOLEAN := public.is_admin();
  v_proc_id     UUID;
  v_proc        RECORD;
  v_order       RECORD;
  v_resp_time   INT;
  v_base_pct    NUMERIC;
  v_tier_bonus  NUMERIC;
  v_total_pct   NUMERIC;
  v_commission  NUMERIC;
  v_month       TEXT := TO_CHAR(NOW(), 'YYYY-MM');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_order
  FROM public.p2p_orders
  WHERE id = p_order_id AND order_type = 'deposit'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.status NOT IN ('open', 'pending', 'assigned', 'proof_uploaded') THEN
    RAISE EXCEPTION 'Order cannot be confirmed: status is %', v_order.status;
  END IF;

  IF v_order.processor_id IS NULL THEN
    RAISE EXCEPTION 'Order has no assigned processor';
  END IF;

  SELECT * INTO v_proc FROM public.processor_profiles WHERE id = v_order.processor_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assigned processor not found';
  END IF;

  -- Only the assigned (active) processor, or an admin, may confirm.
  IF NOT v_is_admin AND NOT (v_proc.user_id = v_uid AND v_proc.status = 'active') THEN
    RAISE EXCEPTION 'Access denied: not the assigned processor' USING ERRCODE = '42501';
  END IF;

  IF v_order.amount_usd IS NULL OR v_order.amount_usd <= 0 THEN
    RAISE EXCEPTION 'Order amount is invalid';
  END IF;

  v_proc_id    := v_proc.id;
  v_resp_time  := EXTRACT(EPOCH FROM (NOW() - COALESCE(v_order.assigned_at, v_order.created_at)))::INT;
  v_base_pct   := public.calculate_commission(v_resp_time);
  v_tier_bonus := public.get_tier_bonus(v_proc.tier);
  v_total_pct  := v_base_pct + v_tier_bonus;
  v_commission := ROUND((v_order.amount_usd * v_total_pct / 100), 4);

  INSERT INTO public.balances (user_id, liquid_usd, updated_at)
  VALUES (v_order.user_id, v_order.amount_usd, NOW())
  ON CONFLICT (user_id) DO UPDATE
    SET liquid_usd = COALESCE(balances.liquid_usd, 0) + EXCLUDED.liquid_usd, updated_at = NOW();

  UPDATE public.p2p_orders SET
    status          = 'completed',
    completed_at    = NOW(),
    response_time_s = v_resp_time,
    commission_pct  = v_total_pct,
    commission_usd  = v_commission,
    updated_at      = NOW()
  WHERE id = p_order_id;

  PERFORM public.update_processor_stock(v_proc_id, v_order.network, v_proc.country, -v_order.amount_usd);

  INSERT INTO public.processor_earnings
    (processor_id, order_id, month, commission_usd, bonus_usd, type, notes)
  VALUES
    (v_proc_id, p_order_id, v_month, v_commission, 0, 'commission',
     'Deposit ' || v_order.amount_usd || ' USD @ ' || v_total_pct || '% (' || v_resp_time || 's)');

  UPDATE public.processor_profiles SET
    total_orders        = total_orders + 1,
    completed_orders    = completed_orders + 1,
    total_earned_usd    = total_earned_usd + v_commission,
    monthly_volume_usd  = monthly_volume_usd + v_order.amount_usd,
    fast_orders_count   = fast_orders_count + CASE WHEN v_resp_time <= 60 THEN 1 ELSE 0 END,
    avg_response_time_s = ((COALESCE(avg_response_time_s, 0) * completed_orders + v_resp_time) / (completed_orders + 1)),
    tier = CASE
      WHEN completed_orders + 1 >= 500 AND cot_rating >= 4.8 THEN 'platinum'
      WHEN completed_orders + 1 >= 200 AND cot_rating >= 4.5 THEN 'gold'
      WHEN completed_orders + 1 >= 50  AND cot_rating >= 4.0 THEN 'silver'
      ELSE tier
    END,
    updated_at = NOW()
  WHERE id = v_proc_id;

  INSERT INTO public.ifb_ledger (user_id, amount_usd, source_type, reference_id, justification, is_verified)
  VALUES (v_order.user_id, v_order.amount_usd, 'p2p_deposit', p_order_id,
          'Mobile money deposit confirmed by ' || CASE WHEN v_is_admin AND v_proc.user_id IS DISTINCT FROM v_uid
                                                       THEN 'admin ' || v_uid::TEXT ELSE 'processor' END,
          TRUE);

  RETURN json_build_object(
    'ok',              TRUE,
    'commission_pct',  v_total_pct,
    'commission_usd',  v_commission,
    'response_time_s', v_resp_time,
    'tier_bonus_pct',  v_tier_bonus
  );
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_p2p_receipt(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_p2p_receipt(UUID) TO authenticated, service_role;

-- 5c. Idempotency keys on transactions.
--     stripe_payment_intent_id: unique among non-null values (apps/core
--     migration 20260611050000 adds it, but may not be applied everywhere).
--     external_id: generic idempotency key used by the RPCs below
--     ('deposit:<id>', 'withdrawal:<id>', 'withdrawal_refund:<id>').
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS external_id TEXT;

DO $do$
BEGIN
  IF EXISTS (
    SELECT stripe_payment_intent_id FROM public.transactions
    WHERE stripe_payment_intent_id IS NOT NULL
    GROUP BY stripe_payment_intent_id HAVING COUNT(*) > 1
  ) THEN
    RAISE WARNING 'transactions has duplicate stripe_payment_intent_id values; unique index NOT created. Reconcile duplicates (possible double credits) and re-run.';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS uq_transactions_stripe_pi
      ON public.transactions (stripe_payment_intent_id)
      WHERE stripe_payment_intent_id IS NOT NULL;
  END IF;
END
$do$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_transactions_external_id
  ON public.transactions (external_id)
  WHERE external_id IS NOT NULL;

-- 5d. credit_deposit — service_role only. Returns TRUE if this call credited
--     the user, FALSE if p_external_id was already processed.
CREATE OR REPLACE FUNCTION public.credit_deposit(
  p_user_id     UUID,
  p_amount      NUMERIC,
  p_currency    TEXT,
  p_external_id TEXT,
  p_source      TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount   NUMERIC := ROUND(p_amount, 2);
  v_currency TEXT    := UPPER(COALESCE(p_currency, 'USD'));
  v_source   TEXT    := LOWER(COALESCE(p_source, 'unknown'));
  v_key      TEXT;
  v_is_stripe BOOLEAN;
  v_tx_id    UUID;
BEGIN
  IF COALESCE(public._jwt_role(), '') IN ('anon', 'authenticated') THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  IF p_user_id IS NULL OR p_external_id IS NULL OR length(trim(p_external_id)) = 0 THEN
    RAISE EXCEPTION 'p_user_id and p_external_id are required' USING ERRCODE = '22023';
  END IF;
  IF v_amount IS NULL OR v_amount <= 0 THEN
    RAISE EXCEPTION 'Deposit amount must be greater than zero' USING ERRCODE = '22023';
  END IF;
  IF v_currency <> 'USD' THEN
    RAISE EXCEPTION 'Unsupported deposit currency: %', v_currency USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Unknown user %', p_user_id USING ERRCODE = '22023';
  END IF;

  v_key       := 'deposit:' || p_external_id;
  v_is_stripe := v_source LIKE 'stripe%';

  -- Serialise concurrent deliveries of the same event.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_key, 0));

  -- Legacy rows written by the old stripe-webhook carry only
  -- stripe_payment_intent_id; treat them as already credited.
  IF v_is_stripe AND EXISTS (
    SELECT 1 FROM public.transactions WHERE stripe_payment_intent_id = p_external_id
  ) THEN
    RETURN FALSE;
  END IF;

  BEGIN
    INSERT INTO public.transactions (
      user_id, amount, transaction_type, description, status, created_at,
      metadata, external_id, stripe_payment_intent_id
    ) VALUES (
      p_user_id, v_amount,
      CASE WHEN v_is_stripe THEN 'stripe_deposit' ELSE 'deposit' END,
      'Deposit via ' || v_source || ' — ' || p_external_id,
      'completed', NOW(),
      jsonb_build_object('source', v_source, 'currency', v_currency, 'external_id', p_external_id),
      v_key,
      CASE WHEN v_is_stripe THEN p_external_id ELSE NULL END
    )
    ON CONFLICT (external_id) WHERE external_id IS NOT NULL DO NOTHING
    RETURNING id INTO v_tx_id;
  EXCEPTION WHEN unique_violation THEN
    -- e.g. stripe_payment_intent_id already present
    RETURN FALSE;
  END;

  IF v_tx_id IS NULL THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.balances (user_id, liquid_usd, updated_at)
  VALUES (p_user_id, v_amount, NOW())
  ON CONFLICT (user_id) DO UPDATE
    SET liquid_usd = COALESCE(balances.liquid_usd, 0) + EXCLUDED.liquid_usd, updated_at = NOW();

  RETURN TRUE;
END;
$$;

-- 5e. debit_for_withdrawal — service_role only. Atomic conditional debit.
--     Returns TRUE if debited now, FALSE if p_external_id was already debited.
--     Raises (rolling back the ledger row) if funds are insufficient.
CREATE OR REPLACE FUNCTION public.debit_for_withdrawal(
  p_user_id     UUID,
  p_amount      NUMERIC,
  p_external_id TEXT,
  p_description TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount NUMERIC := ROUND(p_amount, 2);
  v_key    TEXT;
  v_tx_id  UUID;
BEGIN
  IF COALESCE(public._jwt_role(), '') IN ('anon', 'authenticated') THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  IF p_user_id IS NULL OR p_external_id IS NULL OR length(trim(p_external_id)) = 0 THEN
    RAISE EXCEPTION 'p_user_id and p_external_id are required' USING ERRCODE = '22023';
  END IF;
  IF v_amount IS NULL OR v_amount <= 0 THEN
    RAISE EXCEPTION 'Withdrawal amount must be greater than zero' USING ERRCODE = '22023';
  END IF;

  v_key := 'withdrawal:' || p_external_id;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_key, 0));

  INSERT INTO public.transactions (
    user_id, amount, transaction_type, description, status, created_at, metadata, external_id
  ) VALUES (
    p_user_id, -v_amount, 'withdrawal',
    COALESCE(NULLIF(p_description, ''), 'Withdrawal — ' || p_external_id),
    'completed', NOW(),
    jsonb_build_object('external_id', p_external_id),
    v_key
  )
  ON CONFLICT (external_id) WHERE external_id IS NOT NULL DO NOTHING
  RETURNING id INTO v_tx_id;

  IF v_tx_id IS NULL THEN
    RETURN FALSE;  -- already debited for this external id
  END IF;

  UPDATE public.balances
     SET liquid_usd = liquid_usd - v_amount, updated_at = NOW()
   WHERE user_id = p_user_id AND liquid_usd >= v_amount;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient funds for withdrawal' USING ERRCODE = 'P0001';
  END IF;

  RETURN TRUE;
END;
$$;

-- 5f. refund_withdrawal — service_role only, idempotent.
--     Returns TRUE if refunded now, FALSE if no matching debit exists or it
--     was already refunded.
CREATE OR REPLACE FUNCTION public.refund_withdrawal(p_external_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_debit    RECORD;
  v_key      TEXT;
  v_refund   NUMERIC;
  v_tx_id    UUID;
BEGIN
  IF COALESCE(public._jwt_role(), '') IN ('anon', 'authenticated') THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  IF p_external_id IS NULL OR length(trim(p_external_id)) = 0 THEN
    RAISE EXCEPTION 'p_external_id is required' USING ERRCODE = '22023';
  END IF;

  v_key := 'withdrawal_refund:' || p_external_id;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_key, 0));

  SELECT id, user_id, amount INTO v_debit
  FROM public.transactions
  WHERE external_id = 'withdrawal:' || p_external_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  v_refund := ABS(v_debit.amount);
  IF v_refund = 0 THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.transactions (
    user_id, amount, transaction_type, description, status, created_at, metadata, external_id
  ) VALUES (
    v_debit.user_id, v_refund, 'withdrawal_refund',
    'Withdrawal refund — ' || p_external_id,
    'completed', NOW(),
    jsonb_build_object('external_id', p_external_id, 'refunds_transaction', v_debit.id),
    v_key
  )
  ON CONFLICT (external_id) WHERE external_id IS NOT NULL DO NOTHING
  RETURNING id INTO v_tx_id;

  IF v_tx_id IS NULL THEN
    RETURN FALSE;  -- already refunded
  END IF;

  INSERT INTO public.balances (user_id, liquid_usd, updated_at)
  VALUES (v_debit.user_id, v_refund, NOW())
  ON CONFLICT (user_id) DO UPDATE
    SET liquid_usd = COALESCE(balances.liquid_usd, 0) + EXCLUDED.liquid_usd, updated_at = NOW();

  UPDATE public.transactions
     SET metadata = COALESCE(metadata, '{}'::jsonb)
                    || jsonb_build_object('refunded', true, 'refunded_at', NOW(), 'refund_transaction', v_tx_id)
   WHERE id = v_debit.id;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_deposit(UUID, NUMERIC, TEXT, TEXT, TEXT)    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.debit_for_withdrawal(UUID, NUMERIC, TEXT, TEXT)    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_withdrawal(TEXT)                            FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_deposit(UUID, NUMERIC, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.debit_for_withdrawal(UUID, NUMERIC, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_withdrawal(TEXT)                         TO service_role;


-- ==============================================================================
-- 6. H2: NFC TAP TRANSFERS (20260615_vault_nfc_transfers.sql)
-- ==============================================================================
-- Clients could INSERT arbitrary requests (any amount, no balance check);
-- claim had no row lock (double claim) and no sender re-check. Requests are
-- now created only via create_nfc_transfer() (SECURITY DEFINER).
DROP POLICY IF EXISTS "nfc_insert" ON public.nfc_transfer_requests;
REVOKE INSERT, UPDATE, DELETE ON public.nfc_transfer_requests FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_nfc_transfer(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receiver_id UUID := auth.uid();
  v_req         RECORD;
  v_sender_bal  NUMERIC;
  v_sender_name TEXT;
BEGIN
  IF v_receiver_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_req
  FROM public.nfc_transfer_requests
  WHERE token = upper(trim(p_token))
  FOR UPDATE;

  IF NOT FOUND OR v_req.status <> 'pending' OR v_req.expires_at IS NULL OR v_req.expires_at <= NOW() THEN
    RAISE EXCEPTION 'Transfer code not found or expired. Check the code and try again.';
  END IF;

  IF v_req.sender_id = v_receiver_id THEN
    RAISE EXCEPTION 'You cannot claim your own transfer.';
  END IF;

  IF v_req.amount IS NULL OR v_req.amount <= 0 THEN
    RAISE EXCEPTION 'Invalid transfer amount.';
  END IF;

  -- Lock both balance rows in deterministic order, then re-check the sender.
  PERFORM 1 FROM public.balances
  WHERE user_id IN (v_req.sender_id, v_receiver_id)
  ORDER BY user_id
  FOR UPDATE;

  SELECT liquid_usd INTO v_sender_bal FROM public.balances WHERE user_id = v_req.sender_id;
  IF v_sender_bal IS NULL OR v_sender_bal < v_req.amount THEN
    RAISE EXCEPTION 'Sender has insufficient funds for this transfer.';
  END IF;

  UPDATE public.balances SET liquid_usd = liquid_usd - v_req.amount, updated_at = NOW()
  WHERE user_id = v_req.sender_id;

  INSERT INTO public.balances (user_id, liquid_usd, updated_at)
  VALUES (v_receiver_id, v_req.amount, NOW())
  ON CONFLICT (user_id) DO UPDATE
    SET liquid_usd = COALESCE(balances.liquid_usd, 0) + EXCLUDED.liquid_usd, updated_at = NOW();

  -- transactions has transaction_type (not "type"; see 20260701 header).
  INSERT INTO public.transactions (user_id, transaction_type, amount, description, status, metadata)
  VALUES
    (v_req.sender_id, 'nfc_send',    -v_req.amount, 'NFC Tap Transfer — sent',     'completed',
     jsonb_build_object('nfc_request_id', v_req.id, 'counterpart_id', v_receiver_id)),
    (v_receiver_id,   'nfc_receive',  v_req.amount, 'NFC Tap Transfer — received', 'completed',
     jsonb_build_object('nfc_request_id', v_req.id, 'counterpart_id', v_req.sender_id));

  UPDATE public.nfc_transfer_requests
     SET status = 'completed', receiver_id = v_receiver_id
   WHERE id = v_req.id;

  SELECT COALESCE(full_name, 'IFB Member') INTO v_sender_name
  FROM public.profiles WHERE id = v_req.sender_id;

  RETURN json_build_object(
    'ok',          TRUE,
    'amount',      v_req.amount,
    'sender_id',   v_req.sender_id,
    'sender_name', v_sender_name,
    'note',        v_req.note
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_nfc_transfer(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_nfc_transfer(TEXT) TO authenticated, service_role;


-- ==============================================================================
-- 7. H3: PRICE / AUTHORIZATION CHECKS
-- ==============================================================================

-- 7a. purchase_event_ticket (20261025:320-385): price is read server-side from
--     ifb_ticket_tiers (or ifb_events.ticket_price when no tier). p_price is
--     kept for client compatibility; if supplied and different from the
--     server price the purchase is refused rather than charging a surprise
--     amount. Capacity is enforced under row locks.
CREATE OR REPLACE FUNCTION public.purchase_event_ticket(
  p_event_id UUID,
  p_tier_id  UUID,
  p_price    NUMERIC,
  p_qr_hash  TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid           UUID := auth.uid();
  v_email         TEXT;
  v_event         JSONB;
  v_tier          JSONB;
  v_organizer_id  UUID;
  v_event_name    TEXT;
  v_tier_name     TEXT;
  v_price         NUMERIC;
  v_capacity      NUMERIC;
  v_sold          NUMERIC;
  v_balance       NUMERIC;
  v_organizer_cut NUMERIC;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  SELECT to_jsonb(e) INTO v_event FROM public.ifb_events e WHERE e.id = p_event_id FOR UPDATE;
  IF v_event IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Event not found');
  END IF;
  v_organizer_id := (v_event ->> 'organizer_id')::UUID;
  v_event_name   := v_event ->> 'event_name';

  IF p_tier_id IS NOT NULL THEN
    SELECT to_jsonb(t) INTO v_tier
    FROM public.ifb_ticket_tiers t
    WHERE t.id = p_tier_id AND t.event_id = p_event_id
    FOR UPDATE;
    IF v_tier IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Ticket tier not found for this event');
    END IF;
    v_tier_name := v_tier ->> 'tier_name';
    v_price     := COALESCE((v_tier ->> 'price')::NUMERIC, 0);
    v_capacity  := (v_tier ->> 'capacity')::NUMERIC;
    v_sold      := COALESCE((v_tier ->> 'tickets_sold')::NUMERIC, 0);
  ELSE
    v_price     := COALESCE((v_event ->> 'ticket_price')::NUMERIC, 0);
    v_capacity  := NULLIF((v_event ->> 'total_slots')::NUMERIC, 0);
    v_sold      := COALESCE((v_event ->> 'tickets_sold')::NUMERIC, 0);
  END IF;

  v_price := ROUND(v_price, 2);
  IF v_price < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid ticket price');
  END IF;
  IF p_price IS NOT NULL AND ROUND(p_price, 2) <> v_price THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ticket price has changed; please refresh', 'price', v_price);
  END IF;
  IF v_capacity IS NOT NULL AND v_sold >= v_capacity THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sold out');
  END IF;

  IF v_price > 0 THEN
    SELECT liquid_usd INTO v_balance FROM public.balances WHERE user_id = v_uid FOR UPDATE;
    IF v_balance IS NULL OR v_balance < v_price THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient liquid balance');
    END IF;

    UPDATE public.balances SET liquid_usd = liquid_usd - v_price, updated_at = NOW() WHERE user_id = v_uid;

    IF v_organizer_id IS NOT NULL AND v_organizer_id <> v_uid THEN
      v_organizer_cut := ROUND(v_price * 0.95, 2);
      INSERT INTO public.balances (user_id, liquid_usd, updated_at)
      VALUES (v_organizer_id, v_organizer_cut, NOW())
      ON CONFLICT (user_id) DO UPDATE
        SET liquid_usd = COALESCE(balances.liquid_usd, 0) + EXCLUDED.liquid_usd, updated_at = NOW();

      INSERT INTO public.transactions (user_id, transaction_type, amount, status, description)
      VALUES (v_organizer_id, 'event_revenue', v_organizer_cut, 'completed', 'Ticket sold: ' || v_event_name);
    END IF;

    INSERT INTO public.transactions (user_id, transaction_type, amount, status, description)
    VALUES (v_uid, 'event_ticket', -v_price, 'completed', 'Ticket: ' || v_event_name);
  END IF;

  IF p_tier_id IS NOT NULL THEN
    UPDATE public.ifb_ticket_tiers SET tickets_sold = COALESCE(tickets_sold, 0) + 1 WHERE id = p_tier_id;
  END IF;

  UPDATE public.ifb_events SET tickets_sold = COALESCE(tickets_sold, 0) + 1 WHERE id = p_event_id;

  INSERT INTO public.ifb_tickets (event_id, buyer_email, qr_code_hash, status, tier_id, tier_name, price_paid)
  VALUES (p_event_id, v_email, p_qr_hash, 'active', p_tier_id, v_tier_name, v_price);

  RETURN jsonb_build_object('success', true, 'price', v_price);
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_event_ticket(UUID, UUID, NUMERIC, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purchase_event_ticket(UUID, UUID, NUMERIC, TEXT) TO authenticated, service_role;

-- 7b. finalize_p2p_trade / _finalize_p2p_trade_impl (20260701:68-117)
--     Anyone could finalize anyone's order. Now allowed for: the order owner
--     (WithdrawalPage "confirm receipt" releases the user's own escrow), the
--     assigned processor (legacy processor_id = auth user id, or a
--     processor_profiles row owned by the caller), an admin, or the trusted
--     backend. Deposit orders are rejected (they are confirmed via
--     confirm_p2p_receipt).
CREATE OR REPLACE FUNCTION public._finalize_p2p_trade_impl(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_order RECORD;
  v_ok    BOOLEAN := FALSE;
BEGIN
  SELECT * INTO v_order FROM public.p2p_orders WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF public._is_trusted_backend() OR public.is_admin() THEN
    v_ok := TRUE;
  ELSIF v_uid IS NOT NULL THEN
    v_ok := v_order.user_id = v_uid
         OR v_order.processor_id = v_uid
         OR EXISTS (SELECT 1 FROM public.processor_profiles pp
                    WHERE pp.id = v_order.processor_id AND pp.user_id = v_uid AND pp.status = 'active');
  END IF;

  IF NOT COALESCE(v_ok, FALSE) THEN
    RAISE EXCEPTION 'Access denied: not a party to this order' USING ERRCODE = '42501';
  END IF;

  IF v_order.order_type = 'deposit' THEN
    RAISE EXCEPTION 'Deposit orders are confirmed via confirm_p2p_receipt';
  END IF;

  IF v_order.status NOT IN ('locked_in_escrow', 'proof_uploaded', 'proof_verified', 'escrow_locked') THEN
    RAISE EXCEPTION 'Order cannot be finalized: status is %', v_order.status;
  END IF;

  UPDATE public.balances
     SET escrow_usd = GREATEST(0, COALESCE(escrow_usd, 0) - v_order.amount_usd), updated_at = NOW()
   WHERE user_id = v_order.user_id;

  UPDATE public.p2p_orders
     SET status = 'completed', completed_at = NOW()
   WHERE id = p_id;

  INSERT INTO public.transactions (user_id, transaction_type, amount, description, status, created_at)
  VALUES (v_order.user_id, 'p2p_withdrawal', -v_order.amount_usd,
          'P2P withdrawal via ' || COALESCE(v_order.payment_method, 'bank'), 'completed', NOW());
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_p2p_trade(p_trade_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._finalize_p2p_trade_impl(p_trade_id);
END;
$$;

REVOKE ALL ON FUNCTION public._finalize_p2p_trade_impl(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._finalize_p2p_trade_impl(UUID) TO service_role;
REVOKE ALL ON FUNCTION public.finalize_p2p_trade(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalize_p2p_trade(UUID) TO authenticated, service_role;

-- 7c. admin_update_market_order (apps/core/.../20260611040000:28) — "role
--     check done in app" -> now enforced in the DB.
DO $do$
BEGIN
  IF to_regclass('public.deus_market_orders') IS NULL THEN
    RAISE NOTICE 'deus_market_orders missing; skipping admin_update_market_order / admin_get_market_orders';
    RETURN;
  END IF;

  EXECUTE $fn$
  CREATE OR REPLACE FUNCTION public.admin_update_market_order(
    p_order_id           UUID,
    p_status             TEXT,
    p_tracking_number    TEXT DEFAULT NULL,
    p_tracking_url       TEXT DEFAULT NULL,
    p_admin_notes        TEXT DEFAULT NULL,
    p_estimated_delivery DATE DEFAULT NULL,
    p_vendor_source      TEXT DEFAULT NULL
  )
  RETURNS VOID
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
  BEGIN
    IF NOT (public.is_admin() OR public._is_trusted_backend()) THEN
      RAISE EXCEPTION 'Access denied: admin role required' USING ERRCODE = '42501';
    END IF;

    UPDATE public.deus_market_orders SET
      status             = p_status,
      tracking_number    = COALESCE(p_tracking_number, tracking_number),
      tracking_url       = COALESCE(p_tracking_url, tracking_url),
      admin_notes        = COALESCE(p_admin_notes, admin_notes),
      estimated_delivery = COALESCE(p_estimated_delivery, estimated_delivery),
      vendor_source      = COALESCE(p_vendor_source, vendor_source)
    WHERE id = p_order_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Order not found: %', p_order_id;
    END IF;
  END;
  $$;
  $fn$;

  -- admin_get_market_orders had no admin check (all customers' addresses).
  EXECUTE $fn$
  CREATE OR REPLACE FUNCTION public.admin_get_market_orders(p_status TEXT DEFAULT NULL)
  RETURNS TABLE (
    id UUID, user_id UUID, status TEXT, total_usd NUMERIC, platform_fee NUMERIC,
    shipping_name TEXT, shipping_address TEXT, tracking_number TEXT, tracking_url TEXT,
    admin_notes TEXT, estimated_delivery DATE, vendor_source TEXT, sourced_cost_usd NUMERIC,
    created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
    user_email TEXT, user_name TEXT,
    items JSONB
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
  BEGIN
    IF NOT (public.is_admin() OR public._is_trusted_backend()) THEN
      RAISE EXCEPTION 'Access denied: admin role required' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT
      o.id, o.user_id, o.status, o.total_usd, o.platform_fee,
      o.shipping_name, o.shipping_address, o.tracking_number, o.tracking_url,
      o.admin_notes, o.estimated_delivery, o.vendor_source, o.sourced_cost_usd,
      o.created_at, o.updated_at,
      p.email::TEXT AS user_email,
      p.full_name::TEXT AS user_name,
      COALESCE(
        (SELECT jsonb_agg(jsonb_build_object(
          'product_name', i.product_name,
          'quantity', i.quantity,
          'unit_price', i.unit_price,
          'line_total', i.line_total,
          'vendor_id', i.vendor_id
        )) FROM deus_market_order_items i WHERE i.order_id = o.id),
        '[]'::jsonb
      ) AS items
    FROM deus_market_orders o
    LEFT JOIN profiles p ON p.id = o.user_id
    WHERE p_status IS NULL OR o.status = p_status
    ORDER BY o.created_at DESC;
  END;
  $$;
  $fn$;
END
$do$;

-- 7d. Admin checks must not treat 'is_cot_processor' as an admin role.
CREATE OR REPLACE FUNCTION public.private_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin();
$$;
REVOKE ALL ON FUNCTION public.private_is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.private_is_admin() TO authenticated, service_role;

DO $do$
BEGIN
  IF to_regprocedure('public.admin_update_any_profile(uuid, jsonb)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.admin_update_any_profile(uuid, jsonb) SET search_path = public';
  END IF;
END
$do$;

-- admin_set_kyc_status (latest: 20260832_fix_admin_set_kyc_ai_review.sql)
CREATE OR REPLACE FUNCTION public.admin_set_kyc_status(
  p_user_id UUID,
  p_status  TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin role required' USING ERRCODE = '42501';
  END IF;

  IF p_status NOT IN ('verified','approved','unverified','pending','pending_kyc','rejected','needs_more_info','ai_reviewing','suspended') THEN
    RAISE EXCEPTION 'Invalid kyc_status: %', p_status;
  END IF;

  UPDATE public.profiles SET kyc_status = p_status WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  IF p_status = 'ai_reviewing' THEN
    UPDATE public.kyc_submissions SET status = 'pending', updated_at = NOW() WHERE user_id = p_user_id;
  END IF;
END;
$$;

-- admin_update_kyc (latest: 20260905_fix_admin_update_kyc_roles_and_reset_stuck.sql)
CREATE OR REPLACE FUNCTION public.admin_update_kyc(
  p_user_id UUID,
  p_status  TEXT,
  p_notes   TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_status TEXT;
  v_risk           TEXT;
  v_review_days    INTEGER;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin role required' USING ERRCODE = '42501';
  END IF;

  v_profile_status := CASE p_status
    WHEN 'approved'        THEN 'approved'
    WHEN 'rejected'        THEN 'rejected'
    WHEN 'needs_more_info' THEN 'needs_more_info'
    ELSE NULL
  END;

  UPDATE public.kyc_submissions
  SET
    status           = p_status,
    reviewer_id      = auth.uid(),
    reviewer_notes   = COALESCE(p_notes, reviewer_notes),
    reviewed_at      = NOW(),
    updated_at       = NOW(),
    rejection_reason = CASE WHEN p_status = 'rejected' THEN p_notes ELSE rejection_reason END,
    last_review_date = CURRENT_DATE,
    next_review_date = CASE
      WHEN p_status = 'approved' THEN
        CURRENT_DATE + INTERVAL '1 year' * CASE
          WHEN risk_rating = 'low'      THEN 3
          WHEN risk_rating = 'medium'   THEN 2
          WHEN risk_rating = 'high'     THEN 1
          WHEN risk_rating = 'critical' THEN 0.5
          ELSE 2
        END
      ELSE NULL
    END
  WHERE user_id = p_user_id;

  IF v_profile_status IS NOT NULL THEN
    UPDATE public.profiles SET kyc_status = v_profile_status WHERE id = p_user_id;
  END IF;

  IF p_status = 'approved' THEN
    SELECT risk_rating INTO v_risk FROM public.kyc_submissions WHERE user_id = p_user_id;
    v_review_days := CASE v_risk
      WHEN 'low'      THEN 1095
      WHEN 'medium'   THEN 730
      WHEN 'high'     THEN 365
      WHEN 'critical' THEN 183
      ELSE 730
    END;

    INSERT INTO public.kyc_review_schedule (user_id, risk_level, last_reviewed_at, next_review_due, review_trigger)
    VALUES (p_user_id, COALESCE(v_risk, 'medium'), NOW(), CURRENT_DATE + v_review_days, 'initial_approval')
    ON CONFLICT (user_id) DO UPDATE
      SET last_reviewed_at = NOW(),
          next_review_due  = CURRENT_DATE + v_review_days,
          completed        = FALSE,
          updated_at       = NOW();
  END IF;

  INSERT INTO public.notifications (user_id, type, read, status, message)
  VALUES (
    p_user_id, 'system', false, 'completed',
    CASE p_status
      WHEN 'approved'        THEN 'KYC Approved — Your identity has been verified. You now have full access to IFB services.'
      WHEN 'rejected'        THEN 'KYC Rejected — ' || COALESCE(p_notes, 'Please resubmit with clearer documents.')
      WHEN 'needs_more_info' THEN 'KYC Update Required — ' || COALESCE(p_notes, 'Additional information needed.')
      ELSE 'Your KYC status has been updated.'
    END
  );
END;
$$;

-- 7e. Admin read RPCs from 20260618_admin_backoffice_rpcs.sql that had NO
--     admin check (any authenticated user could dump KYC documents/ID numbers,
--     all transactions, tickets). Bodies unchanged except an is_admin() filter;
--     non-admins now receive an empty set.
CREATE OR REPLACE FUNCTION public.admin_get_support_tickets(p_limit INT DEFAULT 100)
RETURNS TABLE (
  id UUID, user_id UUID, status TEXT, subject TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  user_full_name TEXT, user_email TEXT, user_kyc_status TEXT
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT
    st.id, st.user_id, st.status, st.subject, st.created_at, st.updated_at,
    p.full_name, p.email, p.kyc_status
  FROM public.support_tickets st
  LEFT JOIN public.profiles p ON p.id = st.user_id
  WHERE public.is_admin()
  ORDER BY st.created_at DESC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_venturex(p_limit INT DEFAULT 100, p_status TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID, user_id UUID, legal_name TEXT, sector TEXT, country TEXT, status TEXT,
  product_stage TEXT, funding_goal NUMERIC, investment_readiness_score NUMERIC,
  risk_score NUMERIC, valuation NUMERIC, total_raised NUMERIC, current_round TEXT,
  financial_verified BOOLEAN, identity_verified BOOLEAN, traction_verified BOOLEAN,
  is_public BOOLEAN, created_at TIMESTAMPTZ, pitch_deck_url TEXT,
  financial_statements_url TEXT, legal_docs_url TEXT,
  user_full_name TEXT, user_email TEXT, user_kyc_status TEXT
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT
    vc.id, vc.user_id, vc.legal_name, vc.sector, vc.country, vc.status,
    vc.product_stage, vc.funding_goal, vc.investment_readiness_score,
    vc.risk_score, vc.valuation, vc.total_raised, vc.current_round,
    vc.financial_verified, vc.identity_verified, vc.traction_verified,
    vc.is_public, vc.created_at, vc.pitch_deck_url,
    vc.financial_statements_url, vc.legal_docs_url,
    p.full_name, p.email, p.kyc_status
  FROM public.venturex_companies vc
  LEFT JOIN public.profiles p ON p.id = vc.user_id
  WHERE public.is_admin()
    AND (p_status IS NULL OR vc.status = p_status)
  ORDER BY vc.created_at DESC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_all_transactions(p_limit INT DEFAULT 200, p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  tx_id TEXT, source TEXT, user_id UUID, user_email TEXT, user_name TEXT,
  tx_type TEXT, amount NUMERIC, currency TEXT, status TEXT, created_at TIMESTAMPTZ, notes TEXT
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT
    po.id::TEXT, 'p2p_order'::TEXT, po.user_id,
    p.email, p.full_name,
    po.order_type, po.amount_usd, 'USD'::TEXT,
    po.status, po.created_at, po.payment_method::TEXT
  FROM public.p2p_orders po
  LEFT JOIN public.profiles p ON p.id = po.user_id
  WHERE public.is_admin()
    AND (p_user_id IS NULL OR po.user_id = p_user_id)

  UNION ALL

  SELECT
    al.id::TEXT, 'afr_ledger'::TEXT, al.user_id,
    p.email, p.full_name,
    al.tx_type, al.usd_equivalent, 'AFR'::TEXT,
    al.status, al.created_at, al.notes
  FROM public.afr_ledger al
  LEFT JOIN public.profiles p ON p.id = al.user_id
  WHERE public.is_admin()
    AND (p_user_id IS NULL OR al.user_id = p_user_id)

  ORDER BY created_at DESC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_kyc_submissions(p_limit INT DEFAULT 100, p_status TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID, user_id UUID, status TEXT, risk_rating TEXT,
  legal_full_name TEXT, nationality TEXT, id_type TEXT, id_number TEXT,
  email_primary TEXT, phone_primary TEXT, residential_country TEXT,
  employment_status TEXT, monthly_income_usd NUMERIC, source_of_funds TEXT,
  politically_exposed_person BOOLEAN, fatca_applicable BOOLEAN,
  ai_confidence_score NUMERIC, ai_recommendation TEXT, ai_flags TEXT[],
  id_front_url TEXT, id_back_url TEXT, selfie_url TEXT, selfie_with_id_url TEXT,
  proof_of_address_url TEXT, proof_of_income_url TEXT, bank_statement_url TEXT,
  certificate_of_incorporation_url TEXT, board_resolution_url TEXT,
  is_corporate BOOLEAN, company_legal_name TEXT,
  submitted_at TIMESTAMPTZ, reviewed_at TIMESTAMPTZ, reviewer_notes TEXT,
  user_full_name TEXT, user_email TEXT
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT
    k.id, k.user_id, k.status, k.risk_rating,
    k.legal_full_name, k.nationality, k.id_type, k.id_number,
    k.email_primary, k.phone_primary, k.residential_country,
    k.employment_status, k.monthly_income_usd, k.source_of_funds,
    k.politically_exposed_person, k.fatca_applicable,
    k.ai_confidence_score, k.ai_recommendation, k.ai_flags,
    k.id_front_url, k.id_back_url, k.selfie_url, k.selfie_with_id_url,
    k.proof_of_address_url, k.proof_of_income_url, k.bank_statement_url,
    k.certificate_of_incorporation_url, k.board_resolution_url,
    k.is_corporate, k.company_legal_name,
    k.submitted_at, k.reviewed_at, k.reviewer_notes,
    p.full_name, p.email
  FROM public.kyc_submissions k
  LEFT JOIN public.profiles p ON p.id = k.user_id
  WHERE public.is_admin()
    AND (p_status IS NULL OR k.status = p_status)
  ORDER BY k.submitted_at DESC NULLS LAST, k.reviewed_at DESC NULLS LAST
  LIMIT p_limit;
$$;


-- ==============================================================================
-- 8. C10 (DB part): KYC ADMIN PORTAL PASSCODE
-- ==============================================================================
-- validate_kyc_admin is a password oracle; only the kyc-admin-auth edge
-- function (service_role) may call it.
DO $do$
BEGIN
  IF to_regprocedure('public.validate_kyc_admin(text, text)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.validate_kyc_admin(text, text) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.validate_kyc_admin(text, text) TO service_role';
    EXECUTE 'ALTER FUNCTION public.validate_kyc_admin(text, text) SET search_path = public, extensions';
  END IF;
END
$do$;

-- Deactivate any passcode row still using the default published in
-- 20260708_kyc_admin_portal.sql. That value is already public in the repo.
-- >>> OPS: after deploy, set a NEW strong passcode for each KYC admin, e.g.
-- >>>   UPDATE kyc_admin_passcodes
-- >>>      SET passcode_hash = extensions.crypt('<new secret>', extensions.gen_salt('bf', 12)),
-- >>>          is_active = true
-- >>>    WHERE email = '<admin email>';
-- >>> (run from the SQL editor; never commit the new value).
DO $do$
DECLARE
  v_schema TEXT;
  v_count  INT;
BEGIN
  IF to_regclass('public.kyc_admin_passcodes') IS NULL THEN
    RETURN;
  END IF;

  SELECT n.nspname INTO v_schema
  FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
  WHERE e.extname = 'pgcrypto';

  IF v_schema IS NULL THEN
    RAISE WARNING 'pgcrypto not installed; cannot check kyc_admin_passcodes for the default passcode';
    RETURN;
  END IF;

  EXECUTE format(
    'UPDATE public.kyc_admin_passcodes SET is_active = false
      WHERE is_active = true AND %I.crypt($1, passcode_hash) = passcode_hash',
    v_schema
  ) USING 'IFB-KYC-2026';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Deactivated % KYC admin passcode row(s) using the default passcode', v_count;
END
$do$;


-- ==============================================================================
-- 9. C11: KYC DOCUMENT STORAGE
-- ==============================================================================
-- Upload paths in KYCWizard.jsx / AccountHub.jsx are `kyc/<auth.uid>/<file>`,
-- so the owner folder is foldername[2] with foldername[1] = 'kyc'.
-- (kyc-get-upload-url writes `kyc/<project_id>/...` with service_role, which
-- bypasses RLS; those objects are readable by admins only.)
UPDATE storage.buckets SET public = false WHERE id = 'kyc-documents';

DROP POLICY IF EXISTS "kyc_read_all"     ON storage.objects;
DROP POLICY IF EXISTS "kyc_upload_own"   ON storage.objects;
DROP POLICY IF EXISTS "kyc_update_own"   ON storage.objects;
DROP POLICY IF EXISTS "kyc_owner_select" ON storage.objects;
DROP POLICY IF EXISTS "kyc_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "kyc_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "kyc_admin_select" ON storage.objects;

CREATE POLICY "kyc_owner_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = 'kyc'
    AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
  );

CREATE POLICY "kyc_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = 'kyc'
    AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
  );

-- AccountHub.jsx uploads with { upsert: true }, which needs UPDATE.
CREATE POLICY "kyc_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = 'kyc'
    AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = 'kyc'
    AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
  );

CREATE POLICY "kyc_admin_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'kyc-documents' AND (SELECT public.is_admin()));


-- ==============================================================================
-- 10. M4: NO DIRECT CLIENT WRITES TO THE LEDGER
-- ==============================================================================
REVOKE INSERT, UPDATE, DELETE ON public.transactions FROM anon, authenticated;


-- ==============================================================================
-- 10b. PCI: STOP STORING CARD CVV
-- ==============================================================================
-- issue-ifb-card no longer writes CVV. PCI DSS v4 req. 3.3.1 forbids keeping
-- the card verification code after authorization, so the column becomes
-- nullable and every stored value is wiped. This is irreversible by design.
DO $do$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'virtual_cards' AND column_name = 'cvv'
  ) THEN
    EXECUTE 'ALTER TABLE public.virtual_cards ALTER COLUMN cvv DROP NOT NULL';
    EXECUTE 'UPDATE public.virtual_cards SET cvv = NULL WHERE cvv IS NOT NULL';
  END IF;
END
$do$;


-- ==============================================================================
-- 11. GLOBAL: NON-NEGATIVE BALANCE CONSTRAINTS (NOT VALID)
-- ==============================================================================
-- NOT VALID: existing rows are not checked, so deploy is not blocked, but every
-- new INSERT/UPDATE must satisfy the constraint. NOTE: a row that is already
-- negative can only be updated to a non-negative value (see report).
DO $do$
DECLARE
  v_col TEXT;
  v_con TEXT;
BEGIN
  FOREACH v_col IN ARRAY ARRAY['liquid_usd', 'afr_balance', 'mysafe_digital_usd'] LOOP
    v_con := 'balances_' || v_col || '_nonneg';
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'balances' AND column_name = v_col
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.balances'::regclass AND conname = v_con
    ) THEN
      EXECUTE format('ALTER TABLE public.balances ADD CONSTRAINT %I CHECK (%I >= 0) NOT VALID', v_con, v_col);
    END IF;
  END LOOP;
END
$do$;


-- ==============================================================================
-- 12. GLOBAL: EXECUTE LOCKDOWN FOR SENSITIVE SECURITY DEFINER FUNCTIONS
-- ==============================================================================
-- Every SECURITY DEFINER function in public named admin_% / process_% /
-- credit_% / debit_% / refund_% loses EXECUTE for PUBLIC, anon and
-- authenticated; service_role keeps it. Only functions the web/mobile clients
-- actually call (grep of `.rpc('...')` under apps/*/src) are re-granted to
-- authenticated. Every re-granted admin_* function checks is_admin()/admin
-- roles internally (verified for the ones defined in this repo).
--
-- process_corporate_payroll_v2(uuid, numeric, jsonb, numeric) is deliberately
-- NOT re-granted: it debits an arbitrary p_org_id and credits arbitrary
-- employees with no auth check. The client calls a different 2-arg signature
-- (p_employer_id, p_total_gross_amount) that is not in this repo.
DO $do$
DECLARE
  r RECORD;
  v_client_allowlist TEXT[] := ARRAY[
    -- admin console (all perform their own admin check)
    'admin_create_application_for_user', 'admin_create_venturex_company',
    'admin_get_all_transactions', 'admin_get_applications', 'admin_get_kyc_queue',
    'admin_get_kyc_submissions', 'admin_get_market_orders', 'admin_get_processor_network',
    'admin_get_support_tickets', 'admin_get_user_full', 'admin_get_user_overview',
    'admin_get_users', 'admin_get_venturex', 'admin_refill_stock', 'admin_reset_stuck_kyc',
    'admin_set_kyc_status', 'admin_update_any_profile', 'admin_update_application',
    'admin_update_kyc', 'admin_update_market_order', 'admin_update_venturex_company',
    'admin_update_venturex_full',
    -- end-user flows
    'process_bill_payment', 'process_card_payment', 'process_clyrix_contribution',
    'process_corporate_payroll_v2', 'process_internal_transfer',
    'process_monetized_interaction', 'process_p2p_escrow', 'process_payment_request',
    'credit_node_rewards'
  ];
  -- compared against the regprocedure text with spaces and 'public.' removed
  v_never_grant TEXT[] := ARRAY[
    'process_corporate_payroll_v2(uuid,numeric,jsonb,numeric)'
  ];
BEGIN
  FOR r IN
    SELECT p.oid, p.proname, p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.prokind = 'f'
      AND p.proname ~ '^(admin_|process_|credit_|debit_|refund_)'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);

    IF r.proname = ANY (v_client_allowlist)
       AND NOT (replace(replace(r.sig::TEXT, ' ', ''), 'public.', '') = ANY (v_never_grant)) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    END IF;
  END LOOP;
END
$do$;

-- ==============================================================================
-- 13. pension_accounts / insurance_policies — replace FOR ALL owner policies
--     (users could UPDATE current_balance / coverage directly). Owners may read
--     and enrol; money columns are server-owned and only RPCs change rows.
-- ==============================================================================
DO $do$
BEGIN
  IF to_regclass('public.pension_accounts') IS NOT NULL THEN
    DROP POLICY IF EXISTS "pension_accounts_own" ON public.pension_accounts;
    DROP POLICY IF EXISTS "pension_accounts_select_own" ON public.pension_accounts;
    DROP POLICY IF EXISTS "pension_accounts_insert_own" ON public.pension_accounts;
    CREATE POLICY "pension_accounts_select_own" ON public.pension_accounts
      FOR SELECT TO authenticated USING (user_id = auth.uid());
    CREATE POLICY "pension_accounts_insert_own" ON public.pension_accounts
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid() AND total_contributed = 0 AND current_balance = 0 AND status = 'active');
  END IF;

  IF to_regclass('public.insurance_policies') IS NOT NULL THEN
    DROP POLICY IF EXISTS "ins_policies_own" ON public.insurance_policies;
    DROP POLICY IF EXISTS "ins_policies_select_own" ON public.insurance_policies;
    DROP POLICY IF EXISTS "ins_policies_insert_own" ON public.insurance_policies;
    CREATE POLICY "ins_policies_select_own" ON public.insurance_policies
      FOR SELECT TO authenticated USING (user_id = auth.uid());
    -- TODO: coverage_amount_usd / premium_monthly_usd are still client-computed;
    --       price them server-side before enabling payouts beyond admin review.
    CREATE POLICY "ins_policies_insert_own" ON public.insurance_policies
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid() AND admin_notes IS NULL AND status IN ('active','pending_payment'));
  END IF;
END
$do$;

-- ==============================================================================
-- END
-- ==============================================================================
