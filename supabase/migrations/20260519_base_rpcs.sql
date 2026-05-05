-- ============================================================
-- IFB: Core RPCs required by App.jsx on login/startup
-- These were originally created directly in Supabase.
-- This migration documents and idempotently re-creates them.
-- ============================================================

-- 1. check_user_exists
-- Called by App.jsx to route email → welcome_back vs identify_yourself
CREATE OR REPLACE FUNCTION public.check_user_exists(check_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE email_lower = lower(trim(check_email))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_user_exists(TEXT) TO anon, authenticated;

-- 2. get_network_stats
-- Called by App.jsx login page to show live network metrics
CREATE OR REPLACE FUNCTION public.get_network_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_users   BIGINT;
  v_orgs    BIGINT;
  v_countries BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_users FROM public.profiles;
  SELECT COUNT(*) INTO v_orgs FROM public.profiles WHERE is_org = TRUE;
  SELECT COUNT(DISTINCT country) INTO v_countries FROM public.profiles WHERE country IS NOT NULL AND country <> '';

  RETURN json_build_object(
    'users',     v_users,
    'orgs',      v_orgs,
    'countries', v_countries
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_network_stats() TO anon, authenticated;

-- 3. provision_new_user
-- Called by App.jsx after first login to create profile + balance row
-- Drop first in case the existing function has a different return type signature
DROP FUNCTION IF EXISTS public.provision_new_user(UUID, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.provision_new_user(
  p_user_id  UUID,
  p_full_name TEXT,
  p_ref_code  TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_ref_user_id UUID;
BEGIN
  -- Get email from auth.users
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;

  -- Insert profile (ignore if already exists)
  INSERT INTO public.profiles (
    id, full_name, email, email_lower,
    created_at, updated_at, role
  )
  VALUES (
    p_user_id,
    p_full_name,
    v_email,
    lower(trim(v_email)),
    NOW(),
    NOW(),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Insert initial balance row (ignore if already exists)
  INSERT INTO public.balances (
    user_id, liquid_usd, alpha_equity_usd, mysafe_digital_usd,
    afr_balance, created_at, updated_at
  )
  VALUES (
    p_user_id, 0, 0, 0, 0, NOW(), NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Referral bonus: if ref_code matches another user's referral_code, credit both
  IF p_ref_code IS NOT NULL THEN
    SELECT id INTO v_ref_user_id
    FROM public.profiles
    WHERE referral_code = p_ref_code
    LIMIT 1;

    IF v_ref_user_id IS NOT NULL THEN
      -- Credit referrer $5 AFR bonus
      UPDATE public.balances
        SET afr_balance = afr_balance + 500
        WHERE user_id = v_ref_user_id;

      -- Credit new user $2 AFR welcome bonus
      UPDATE public.balances
        SET afr_balance = afr_balance + 200
        WHERE user_id = p_user_id;
    END IF;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.provision_new_user(UUID, TEXT, TEXT) TO authenticated;
