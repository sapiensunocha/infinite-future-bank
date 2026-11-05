-- 20261105_rls_exposure_fix.sql
-- Closes the anonymous-read data leak found in the live black-box test.
--
-- With the public anon key (no login) these tables returned real rows:
--   wallets, budgets, income_protocols, user_training_profiles,
--   venturex_companies (full financials), npo_profiles (tax IDs, financial docs),
--   profile_achievements, social_posts (earnings), plus some reference tables.
-- These tables were created in the Supabase dashboard, not in repo migrations,
-- so this migration is DEFENSIVE: it skips tables/columns that do not exist and
-- it DROPS every existing policy on a table before installing a correct set, so
-- the result is deterministic regardless of the current (unknown) policy state.
--
-- Forward-only and idempotent. Safe to run before or after 20261030.
-- service_role (the edge functions) bypasses RLS, so none of this affects them.

-- ---------------------------------------------------------------------------
-- 0. Admin helper (self-sufficient; identical to 20261030_security_hardening).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'admin_l3', 'superadmin')
  ) OR EXISTS (
    SELECT 1 FROM public.admin_roles a WHERE a.user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Helper: drop every existing policy on a public table (so our set is the
-- whole truth). Used inside the per-table blocks below.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._drop_all_policies(p_table text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = p_table
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, p_table);
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- Helpers for objects that turn out to be VIEWS in production (row-level
-- security cannot be enabled on a view; e.g. profile_achievements is a view).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._is_table(p_table text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = p_table AND c.relkind IN ('r', 'p')
  );
$$;

-- Views run with their owner's rights, so the only lever is the grant:
-- anonymous visitors lose all access; p_auth_read = true also grants SELECT to
-- logged-in users, NULL leaves their current access unchanged (review needed).
CREATE OR REPLACE FUNCTION public._lock_view(p_table text, p_auth_read boolean)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format('REVOKE ALL ON public.%I FROM anon', p_table);
  IF p_auth_read IS TRUE THEN
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', p_table);
  END IF;
  RAISE NOTICE '% is a view: anonymous access revoked; row-level security does not apply to views', p_table;
END;
$$;

-- ===========================================================================
-- 1. STRICTLY PRIVATE — owner reads/writes own rows, admins read all, anon none.
--    Owner column is user_id. The app only ever reads these for the logged-in
--    user (.eq('user_id', auth.uid())), so owner-only cannot break a screen.
-- ===========================================================================
DO $$
DECLARE
  t text;
  tbls text[] := ARRAY['wallets', 'budgets', 'income_protocols', 'user_training_profiles'];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    IF NOT public._is_table(t) THEN PERFORM public._lock_view(t, NULL); CONTINUE; END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    PERFORM public._drop_all_policies(t);
    EXECUTE format($f$CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (user_id = auth.uid())$f$, t || '_sel_own', t);
    EXECUTE format($f$CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())$f$, t || '_ins_own', t);
    EXECUTE format($f$CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())$f$, t || '_upd_own', t);
    EXECUTE format($f$CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (user_id = auth.uid())$f$, t || '_del_own', t);
    EXECUTE format($f$CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_admin())$f$, t || '_sel_admin', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
  END LOOP;
END;
$$;

-- ===========================================================================
-- 2. profile_achievements — only badge flags + counts (no PII), but shown when
--    viewing ANY user's profile, so readable by any logged-in user, never anon.
--    Rows are maintained server-side; owner/admin may write.
-- ===========================================================================
DO $$
BEGIN
  IF to_regclass('public.profile_achievements') IS NULL THEN RETURN; END IF;
  -- In production this is a view: keep it readable for logged-in users (profile badges), not anon.
  IF NOT public._is_table('profile_achievements') THEN PERFORM public._lock_view('profile_achievements', true); RETURN; END IF;
  ALTER TABLE public.profile_achievements ENABLE ROW LEVEL SECURITY;
  PERFORM public._drop_all_policies('profile_achievements');
  CREATE POLICY profile_achievements_sel_auth ON public.profile_achievements FOR SELECT TO authenticated USING (true);
  CREATE POLICY profile_achievements_write_own ON public.profile_achievements FOR ALL TO authenticated
    USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid() OR public.is_admin());
  REVOKE ALL ON public.profile_achievements FROM anon;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_achievements TO authenticated;
END;
$$;

-- ===========================================================================
-- 3. venturex_companies — confidential company financials. Owner/admin only on
--    the base table; a public directory view exposes a safe whitelist for
--    is_public + active companies. anon/authenticated lose base-table access.
-- ===========================================================================
DO $$
DECLARE
  safe text[] := ARRAY['id','user_id','legal_name','country','sector','sub_sector','tagline','website',
                       'logo_url','product_stage','current_round','funding_goal','equity_offered',
                       'investment_readiness_score','is_public','status','created_at','updated_at'];
  cols text;
BEGIN
  IF to_regclass('public.venturex_companies') IS NULL THEN RETURN; END IF;
  IF NOT public._is_table('venturex_companies') THEN PERFORM public._lock_view('venturex_companies', NULL); RETURN; END IF;
  ALTER TABLE public.venturex_companies ENABLE ROW LEVEL SECURITY;
  PERFORM public._drop_all_policies('venturex_companies');
  CREATE POLICY venturex_companies_owner ON public.venturex_companies FOR ALL TO authenticated
    USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid() OR public.is_admin());
  REVOKE ALL ON public.venturex_companies FROM anon, authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.venturex_companies TO authenticated;

  -- Public directory view: only whitelisted columns that actually exist.
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position) INTO cols
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'venturex_companies' AND column_name = ANY(safe);
  IF cols IS NOT NULL THEN
    EXECUTE format(
      'CREATE OR REPLACE VIEW public.venturex_companies_public WITH (security_invoker = false) AS '
      'SELECT %s FROM public.venturex_companies WHERE is_public IS TRUE AND status = %L', cols, 'active');
    REVOKE ALL ON public.venturex_companies_public FROM anon, authenticated;
    GRANT SELECT ON public.venturex_companies_public TO anon, authenticated;
  END IF;
END;
$$;

-- ===========================================================================
-- 4. npo_profiles — owner column is id (= the NPO owner's auth.uid()). Base
--    table owner/admin only; public donation view hides tax_id, financial docs,
--    internal floats, AI risk/compliance notes.
-- ===========================================================================
DO $$
DECLARE
  safe text[] := ARRAY['id','npo_name','slug','tagline','mission_statement','sector','country',
                       'donation_message','preset_amounts','verification_status','total_raised',
                       'transparency_score','impact_metrics','founded_year','is_public','created_at'];
  cols text;
BEGIN
  IF to_regclass('public.npo_profiles') IS NULL THEN RETURN; END IF;
  IF NOT public._is_table('npo_profiles') THEN PERFORM public._lock_view('npo_profiles', NULL); RETURN; END IF;
  ALTER TABLE public.npo_profiles ENABLE ROW LEVEL SECURITY;
  PERFORM public._drop_all_policies('npo_profiles');
  CREATE POLICY npo_profiles_owner ON public.npo_profiles FOR ALL TO authenticated
    USING (id = auth.uid() OR public.is_admin()) WITH CHECK (id = auth.uid() OR public.is_admin());
  REVOKE ALL ON public.npo_profiles FROM anon, authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.npo_profiles TO authenticated;

  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position) INTO cols
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'npo_profiles' AND column_name = ANY(safe);
  IF cols IS NOT NULL THEN
    EXECUTE format(
      'CREATE OR REPLACE VIEW public.npo_profiles_public WITH (security_invoker = false) AS '
      'SELECT %s FROM public.npo_profiles WHERE is_public IS TRUE', cols);
    REVOKE ALL ON public.npo_profiles_public FROM anon, authenticated;
    GRANT SELECT ON public.npo_profiles_public TO anon, authenticated;
  END IF;
END;
$$;

-- ===========================================================================
-- 5. social_posts — public feed, but total_revenue (creator earnings) must not
--    be exposed. Base table author/admin only; the feed goes through
--    social_feed_view with the earnings column removed.
-- ===========================================================================
DO $$
DECLARE
  safe text[] := ARRAY['id','author_id','content','media_urls','media_types',
                       'like_count','love_count','created_at','updated_at'];
  cols text;
BEGIN
  IF to_regclass('public.social_posts') IS NULL THEN RETURN; END IF;
  IF NOT public._is_table('social_posts') THEN PERFORM public._lock_view('social_posts', NULL); RETURN; END IF;
  ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
  PERFORM public._drop_all_policies('social_posts');
  CREATE POLICY social_posts_author ON public.social_posts FOR ALL TO authenticated
    USING (author_id = auth.uid() OR public.is_admin()) WITH CHECK (author_id = auth.uid() OR public.is_admin());
  REVOKE ALL ON public.social_posts FROM anon, authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_posts TO authenticated;

  SELECT string_agg('p.' || quote_ident(column_name), ', ' ORDER BY ordinal_position) INTO cols
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'social_posts' AND column_name = ANY(safe);

  -- Rebuild the feed view the client already reads, joined to author identity,
  -- WITHOUT total_revenue. Drop first since column set changes.
  IF to_regclass('public.profiles') IS NOT NULL AND cols IS NOT NULL THEN
    DROP VIEW IF EXISTS public.social_feed_view;
    EXECUTE format(
      'CREATE VIEW public.social_feed_view WITH (security_invoker = false) AS '
      'SELECT %s, pr.full_name AS author_name, pr.role AS author_role '
      'FROM public.social_posts p LEFT JOIN public.profiles pr ON pr.id = p.author_id', cols);
    REVOKE ALL ON public.social_feed_view FROM anon, authenticated;
    GRANT SELECT ON public.social_feed_view TO anon, authenticated;
  END IF;
END;
$$;

-- ===========================================================================
-- 6. PUBLIC reference / catalog tables — reads are fine for everyone, but anon
--    must never write. Enable RLS, public SELECT, owner-write where the app
--    writes (events, impact reports), admin-manage the rest, no anon writes.
-- ===========================================================================
-- 6a. Read-only-to-clients catalogs (managed by admins / service_role only).
DO $$
DECLARE
  t text;
  tbls text[] := ARRAY['billers', 'help_faqs', 'venture_stage_requirements', 'clyrix_pools', 'app_config'];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    IF NOT public._is_table(t) THEN RAISE NOTICE '% is a view: left as is (public catalog)', t; CONTINUE; END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    PERFORM public._drop_all_policies(t);
    EXECUTE format($f$CREATE POLICY %I ON public.%I FOR SELECT USING (true)$f$, t || '_sel_public', t);
    EXECUTE format($f$CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())$f$, t || '_admin_manage', t);
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT ON public.%I TO anon, authenticated', t);
  END LOOP;
END;
$$;

-- 6b. ifb_events — public to read, organizer owns their rows.
DO $$
BEGIN
  IF to_regclass('public.ifb_events') IS NULL THEN RETURN; END IF;
  IF NOT public._is_table('ifb_events') THEN RAISE NOTICE 'ifb_events is a view: left as is (public)'; RETURN; END IF;
  ALTER TABLE public.ifb_events ENABLE ROW LEVEL SECURITY;
  PERFORM public._drop_all_policies('ifb_events');
  CREATE POLICY ifb_events_sel_public ON public.ifb_events FOR SELECT USING (true);
  CREATE POLICY ifb_events_owner ON public.ifb_events FOR ALL TO authenticated
    USING (organizer_id = auth.uid() OR public.is_admin()) WITH CHECK (organizer_id = auth.uid() OR public.is_admin());
  REVOKE ALL ON public.ifb_events FROM anon;
  GRANT SELECT ON public.ifb_events TO anon;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.ifb_events TO authenticated;
END;
$$;

-- 6c. npo_impact_reports — public transparency, owner (npo_id) writes.
DO $$
BEGIN
  IF to_regclass('public.npo_impact_reports') IS NULL THEN RETURN; END IF;
  IF NOT public._is_table('npo_impact_reports') THEN RAISE NOTICE 'npo_impact_reports is a view: left as is (public)'; RETURN; END IF;
  ALTER TABLE public.npo_impact_reports ENABLE ROW LEVEL SECURITY;
  PERFORM public._drop_all_policies('npo_impact_reports');
  CREATE POLICY npo_impact_sel_public ON public.npo_impact_reports FOR SELECT USING (true);
  CREATE POLICY npo_impact_owner ON public.npo_impact_reports FOR ALL TO authenticated
    USING (npo_id = auth.uid() OR public.is_admin()) WITH CHECK (npo_id = auth.uid() OR public.is_admin());
  REVOKE ALL ON public.npo_impact_reports FROM anon;
  GRANT SELECT ON public.npo_impact_reports TO anon;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.npo_impact_reports TO authenticated;
END;
$$;

-- ---------------------------------------------------------------------------
-- Clean up the temporary helper.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public._drop_all_policies(text);
DROP FUNCTION IF EXISTS public._lock_view(text, boolean);
DROP FUNCTION IF EXISTS public._is_table(text);

-- ===========================================================================
-- OPS NOTES
--  * Repoint public reads to the new views (done in the client in this PR):
--      venturex directory  -> public.venturex_companies_public
--      public NPO pages    -> public.npo_profiles_public
--  * social_feed_view keeps its name; total_revenue is gone from it.
--  * This fixes anon + cross-user READ exposure for these tables. It does not
--    attempt to re-police every write path; writes still run as the row owner.
--  * Verify on staging: as a second logged-in user, confirm you cannot read
--    another user's wallet/budget/venture rows, and that the public directory
--    and NPO donation pages still render.
-- ===========================================================================
