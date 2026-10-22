-- =============================================================
-- FIX: "Database error saving new user" on signUp
--
-- Root causes found:
--  1. handle_new_user() tried to INSERT into updated_at which does
--     not exist on the profiles table → trigger crash on every signup
--  2. A second INSERT trigger (on_auth_user_created_sl) was redundant;
--     consolidated into handle_new_user with exception safety
--  3. provision_new_user also had updated_at in its INSERT
-- =============================================================


-- ── 1. FIX handle_new_user ────────────────────────────────────
-- profiles has no updated_at column — removed.
-- sl_profiles insert consolidated here with exception guard.
-- NULLIF(...,'') guards against empty-string full_name from the UI.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Do NOT insert email_lower — GENERATED ALWAYS AS (lower(email)) STORED
  -- Do NOT insert updated_at — column does not exist on profiles
  INSERT INTO public.profiles (
    id, email, full_name, role, kyc_status, created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(NEW.email, '@', 1)),
    'user',
    'not_started',
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  BEGIN
    INSERT INTO public.balances (
      user_id, liquid_usd, alpha_equity_usd, mysafe_digital_usd,
      afr_balance, created_at, updated_at
    )
    VALUES (NEW.id, 0, 0, 0, 0, NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public.sl_profiles (id, full_name, avatar_url)
    VALUES (
      NEW.id,
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(NEW.email, '@', 1)),
      NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;


-- ── 2. RECREATE TRIGGER ON auth.users ────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Remove the now-redundant sl trigger (covered by handle_new_user above)
DROP TRIGGER IF EXISTS on_auth_user_created_sl ON auth.users;


-- ── 3. FIX provision_new_user ────────────────────────────────
-- Removes updated_at (does not exist on profiles) and email_lower
-- (GENERATED ALWAYS — cannot be inserted manually).
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
  v_email       TEXT;
  v_ref_user_id UUID;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;

  INSERT INTO public.profiles (
    id, full_name, email, created_at, role
  )
  VALUES (
    p_user_id, p_full_name, v_email, NOW(), 'user'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.balances (
    user_id, liquid_usd, alpha_equity_usd, mysafe_digital_usd,
    afr_balance, created_at, updated_at
  )
  VALUES (p_user_id, 0, 0, 0, 0, NOW(), NOW())
  ON CONFLICT (user_id) DO NOTHING;

  IF p_ref_code IS NOT NULL THEN
    SELECT id INTO v_ref_user_id
    FROM public.profiles
    WHERE referral_code = p_ref_code
    LIMIT 1;

    IF v_ref_user_id IS NOT NULL THEN
      UPDATE public.balances SET afr_balance = afr_balance + 500 WHERE user_id = v_ref_user_id;
      UPDATE public.balances SET afr_balance = afr_balance + 200 WHERE user_id = p_user_id;
    END IF;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.provision_new_user(UUID, TEXT, TEXT) TO authenticated;
