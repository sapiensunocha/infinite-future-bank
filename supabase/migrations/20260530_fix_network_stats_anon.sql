-- Restore get_network_stats to return users/orgs/countries for the login page.
-- The 20260528_afr_network_nodes migration accidentally replaced this with AFR
-- node counters and dropped the anon grant, causing the login footer to show 0/0/0.
CREATE OR REPLACE FUNCTION public.get_network_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_users     BIGINT;
  v_orgs      BIGINT;
  v_countries BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_users FROM public.profiles;

  SELECT (
    (SELECT COUNT(*) FROM public.npo_profiles) +
    (SELECT COUNT(*) FROM public.ifb_companies)
  ) INTO v_orgs;

  SELECT COUNT(DISTINCT country) INTO v_countries
    FROM public.profiles
    WHERE country IS NOT NULL AND country <> '';

  RETURN json_build_object(
    'users',     v_users,
    'orgs',      v_orgs,
    'countries', v_countries
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_network_stats() TO anon, authenticated;
