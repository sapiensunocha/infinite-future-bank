-- ============================================================================
-- 20261124 — Transaction PIN
--
-- A 4–6 digit PIN that the customer enters before money leaves their wallet.
--
--   set_transaction_pin(new, current)  create or change the PIN
--   verify_transaction_pin(pin)        checks it; on success grants ONE money action
--                                      for the next 2 minutes; 5 wrong tries lock the
--                                      PIN for 15 minutes
--   transaction_pin_status()           { has_pin, locked_until }
--   _require_pin()                     called at the top of the money functions:
--                                      consumes the grant or raises PIN_REQUIRED
--   consume_pin_grant(user)            same, for edge functions (service role)
--   admin_clear_transaction_pin(user)  support reset for a forgotten PIN
--
-- The PIN is stored only as a bcrypt hash; no role can read the table.
--
-- ROLLOUT: a customer who has not set a PIN yet is NOT blocked, so app versions
-- released before the PIN screen keep working. The new app makes every customer
-- set one before their first money action. Once everyone is on the new version,
-- flip _require_pin to refuse customers without a PIN.
-- ============================================================================
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.user_pins (
  user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_hash        TEXT NOT NULL,
  failed_attempts INT NOT NULL DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.pin_grants (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE public.user_pins  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pin_grants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_pins, public.pin_grants FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.user_pins, public.pin_grants TO service_role;

-- Reject PINs anyone would guess first: one repeated digit, or a straight run up or down.
CREATE OR REPLACE FUNCTION public._pin_is_weak(p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  i INT; up BOOLEAN := true; down BOOLEAN := true; same BOOLEAN := true;
BEGIN
  FOR i IN 2..length(p_pin) LOOP
    IF substr(p_pin, i, 1)::int <> substr(p_pin, i - 1, 1)::int + 1 THEN up := false; END IF;
    IF substr(p_pin, i, 1)::int <> substr(p_pin, i - 1, 1)::int - 1 THEN down := false; END IF;
    IF substr(p_pin, i, 1) <> substr(p_pin, 1, 1) THEN same := false; END IF;
  END LOOP;
  RETURN up OR down OR same;
END;
$$;

-- Shared check with lockout. Returns 'ok' | 'wrong' | 'locked' | 'no_pin'.
CREATE OR REPLACE FUNCTION public._check_pin(p_user UUID, p_pin TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v public.user_pins%ROWTYPE;
BEGIN
  SELECT * INTO v FROM public.user_pins WHERE user_id = p_user FOR UPDATE;
  IF NOT FOUND THEN RETURN 'no_pin'; END IF;
  IF v.locked_until IS NOT NULL AND v.locked_until > now() THEN RETURN 'locked'; END IF;
  IF p_pin IS NOT NULL AND p_pin ~ '^[0-9]{4,6}$' AND crypt(p_pin, v.pin_hash) = v.pin_hash THEN
    UPDATE public.user_pins SET failed_attempts = 0, locked_until = NULL WHERE user_id = p_user;
    RETURN 'ok';
  END IF;
  UPDATE public.user_pins
     SET failed_attempts = CASE WHEN failed_attempts + 1 >= 5 THEN 0 ELSE failed_attempts + 1 END,
         locked_until    = CASE WHEN failed_attempts + 1 >= 5 THEN now() + interval '15 minutes' ELSE NULL END
   WHERE user_id = p_user;
  RETURN CASE WHEN v.failed_attempts + 1 >= 5 THEN 'locked' ELSE 'wrong' END;
END;
$$;
REVOKE ALL ON FUNCTION public._check_pin(UUID, TEXT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.transaction_pin_status()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'has_pin', EXISTS (SELECT 1 FROM public.user_pins WHERE user_id = auth.uid()),
    'locked_until', (SELECT locked_until FROM public.user_pins WHERE user_id = auth.uid() AND locked_until > now())
  );
$$;

CREATE OR REPLACE FUNCTION public.set_transaction_pin(p_new TEXT, p_current TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_res TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501'; END IF;
  IF p_new IS NULL OR p_new !~ '^[0-9]{4,6}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Your PIN must be 4 to 6 digits.');
  END IF;
  IF public._pin_is_weak(p_new) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'That PIN is too easy to guess. Avoid repeated digits and runs like 1234.');
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_pins WHERE user_id = v_uid) THEN
    v_res := public._check_pin(v_uid, p_current);
    IF v_res = 'locked' THEN RETURN jsonb_build_object('ok', false, 'error', 'Too many wrong tries. Try again in 15 minutes.', 'locked', true); END IF;
    IF v_res <> 'ok' THEN RETURN jsonb_build_object('ok', false, 'error', 'Your current PIN is not correct.'); END IF;
  END IF;
  INSERT INTO public.user_pins (user_id, pin_hash) VALUES (v_uid, crypt(p_new, gen_salt('bf', 10)))
  ON CONFLICT (user_id) DO UPDATE SET pin_hash = EXCLUDED.pin_hash, failed_attempts = 0, locked_until = NULL, updated_at = now();
  DELETE FROM public.pin_grants WHERE user_id = v_uid;
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_transaction_pin(p_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_res TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501'; END IF;
  v_res := public._check_pin(v_uid, p_pin);
  IF v_res = 'ok' THEN
    INSERT INTO public.pin_grants (user_id, expires_at) VALUES (v_uid, now() + interval '2 minutes')
    ON CONFLICT (user_id) DO UPDATE SET expires_at = EXCLUDED.expires_at;
    RETURN jsonb_build_object('ok', true);
  END IF;
  RETURN jsonb_build_object('ok', false, 'reason', v_res, 'error', CASE v_res
    WHEN 'locked' THEN 'Too many wrong tries. Try again in 15 minutes.'
    WHEN 'no_pin' THEN 'Set a transaction PIN first.'
    ELSE 'Wrong PIN. Please try again.' END);
END;
$$;

-- Consumes the caller's grant. Backends (no end-user JWT) and customers without a PIN pass.
CREATE OR REPLACE FUNCTION public._require_pin()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_pins WHERE user_id = v_uid) THEN RETURN; END IF;
  DELETE FROM public.pin_grants WHERE user_id = v_uid AND expires_at > now();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PIN_REQUIRED: enter your transaction PIN to continue.' USING ERRCODE = 'P0001';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public._require_pin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._require_pin() TO authenticated, service_role;

-- For edge functions acting for a signed-in customer. true = allowed.
CREATE OR REPLACE FUNCTION public.consume_pin_grant(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public._is_trusted_backend() THEN RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_pins WHERE user_id = p_user_id) THEN RETURN true; END IF;
  DELETE FROM public.pin_grants WHERE user_id = p_user_id AND expires_at > now();
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_pin_grant(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_pin_grant(UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_clear_transaction_pin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501'; END IF;
  DELETE FROM public.pin_grants WHERE user_id = p_user_id;
  DELETE FROM public.user_pins WHERE user_id = p_user_id;
  INSERT INTO public.app_telemetry (event, metadata)
  VALUES ('transaction_pin_cleared', jsonb_build_object('user_id', p_user_id, 'by', auth.uid()));
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.transaction_pin_status(), public.set_transaction_pin(TEXT, TEXT),
  public.verify_transaction_pin(TEXT), public.admin_clear_transaction_pin(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transaction_pin_status(), public.set_transaction_pin(TEXT, TEXT),
  public.verify_transaction_pin(TEXT), public.admin_clear_transaction_pin(UUID) TO authenticated;

-- Put the PIN check at the top of the money functions customers call directly.
-- Patches the live definition in place (so nothing else about them changes) and is
-- safe to run twice.
DO $$
DECLARE
  r RECORD;
  d TEXT;
  d2 TEXT;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.prokind = 'f'
       AND p.proname IN ('p2p_transfer', 'process_payment_request', 'request_card_payout', 'run_payroll', 'pay_page_order_with_wallet')
  LOOP
    d := pg_get_functiondef(r.oid);
    IF d LIKE '%_require_pin()%' THEN CONTINUE; END IF;
    d2 := regexp_replace(d, E'\nBEGIN\\s*\n', E'\nBEGIN\n  PERFORM public._require_pin();\n');
    IF d2 = d THEN RAISE EXCEPTION 'Could not add the PIN check to %', r.proname; END IF;
    EXECUTE d2;
  END LOOP;
END;
$$;

COMMIT;
