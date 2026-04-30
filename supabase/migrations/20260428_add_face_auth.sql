-- Face authentication columns for the profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS face_login_enabled   BOOLEAN  DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS face_auth_token_hash TEXT     DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS face_descriptor       JSONB    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS email_lower           TEXT     GENERATED ALWAYS AS (lower(email)) STORED;

-- Index for fast lookup by email (used by face-auth edge function)
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower ON public.profiles (email_lower);

-- Ensure the edge function can query profiles without exposing data to anon
-- (face-auth uses the service role key, so this is just documentation)
COMMENT ON COLUMN public.profiles.face_auth_token_hash IS
  'SHA-256 hash of the biometric auth token stored on the device keychain. Never stored in plaintext.';
COMMENT ON COLUMN public.profiles.face_descriptor IS
  'face-api.js 128-float descriptor array for web face recognition. Null when using native biometric.';
