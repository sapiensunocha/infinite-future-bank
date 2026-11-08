-- ============================================================================
-- 20261116 — public profile view + user search (additive; safe for every app version)
--
-- Today any signed-in user can read every profile's email, phone, KYC status,
-- GPS and face template. This migration adds the safe way to look other people
-- up; 20261117 then removes the open read once the new apps are released.
--
--   profiles_public   name, photo, tier and agent (processor) fields only.
--                     Agent location is rounded to ~1 km and only for agents.
--   find_ifb_users(q) search other IFB users by exact email or by name
--                     (min. 3 letters); returns name/photo and a masked email.
-- ============================================================================

BEGIN;

CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = false) AS
SELECT
  p.id,
  p.full_name,
  p.avatar_url,
  p.active_tier,
  COALESCE(p.is_cot_processor, false) AS is_cot_processor,
  CASE WHEN p.is_cot_processor THEN p.cot_rating END          AS cot_rating,
  CASE WHEN p.is_cot_processor THEN p.cot_completed_tx END    AS cot_completed_tx,
  CASE WHEN p.is_cot_processor THEN p.cot_payment_methods END AS cot_payment_methods,
  CASE WHEN p.is_cot_processor THEN ROUND(p.latitude::numeric, 2) END  AS latitude,
  CASE WHEN p.is_cot_processor THEN ROUND(p.longitude::numeric, 2) END AS longitude,
  CASE WHEN p.is_cot_processor THEN p.country END             AS country
FROM public.profiles p;

COMMENT ON VIEW public.profiles_public IS 'Safe public fields of profiles. Use this (not profiles) to show other users.';
REVOKE ALL ON public.profiles_public FROM PUBLIC;
GRANT SELECT ON public.profiles_public TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.find_ifb_users(p_query TEXT, p_limit INT DEFAULT 10)
RETURNS TABLE (id UUID, full_name TEXT, avatar_url TEXT, email_hint TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q TEXT := lower(trim(COALESCE(p_query, '')));
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501'; END IF;
  IF length(q) < 3 THEN RETURN; END IF;
  RETURN QUERY
    SELECT p.id, p.full_name, p.avatar_url,
           -- a@b.com -> a•••@b.com : enough to recognise someone, not to harvest addresses
           CASE WHEN p.email IS NULL THEN NULL
                ELSE left(split_part(p.email, '@', 1), 1) || '•••@' || split_part(p.email, '@', 2) END
      FROM public.profiles p
     WHERE p.id <> auth.uid()
       AND (lower(p.email) = q OR (position('@' IN q) = 0 AND p.full_name ILIKE '%' || q || '%'))
     ORDER BY (lower(p.email) = q) DESC, p.full_name
     LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 20);
END;
$$;
REVOKE ALL ON FUNCTION public.find_ifb_users(TEXT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_ifb_users(TEXT, INT) TO authenticated;

COMMIT;
