-- ============================================================================
-- 20261117 — stop users reading each other's private profile data
--
-- ⚠️  APPLY ONLY AFTER the app version that uses profiles_public / find_ifb_users
--     (release 1.7.2+) is live on Google Play Production AND the website is
--     redeployed. Older app versions read other users straight from `profiles`
--     (agent lists, names in history, user search) and would show them empty.
--
-- After this:
--   * a signed-in user reads only their OWN row of `profiles` (all columns);
--   * admins keep full access (existing admin policies);
--   * everyone else is seen through profiles_public (name, photo, tier, agent info);
--   * logged-out visitors cannot read `profiles` at all (pay links and event
--     pages use profiles_public).
-- Requires 20261116.
-- ============================================================================

BEGIN;

DROP POLICY IF EXISTS "Allow logged-in users to read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;

-- Own row (kept or created)
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());

REVOKE SELECT ON public.profiles FROM anon;

COMMIT;
