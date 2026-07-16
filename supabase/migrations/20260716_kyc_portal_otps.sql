-- Migration: KYC company portal OTP table + self-update tracking
-- 2026-07-16

-- OTP table for founder self-service portal
CREATE TABLE IF NOT EXISTS public.kyc_portal_otps (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT        NOT NULL,
  code       TEXT        NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes'),
  used       BOOLEAN     DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS kyc_portal_otps_email_idx ON public.kyc_portal_otps(email);
CREATE INDEX IF NOT EXISTS kyc_portal_otps_created_at_idx ON public.kyc_portal_otps(created_at);

ALTER TABLE public.kyc_portal_otps ENABLE ROW LEVEL SECURITY;

-- Service role only — no public access
-- (no RLS policies = only service_role key can read/write)

-- Add self-update timestamp column to kyc_projects
ALTER TABLE public.kyc_projects
  ADD COLUMN IF NOT EXISTS last_self_updated_at TIMESTAMPTZ;

-- Clean up expired OTPs older than 24 hours (safety hygiene)
-- This can also be run via a pg_cron job:
-- SELECT cron.schedule('clean-portal-otps', '0 * * * *', $$
--   DELETE FROM public.kyc_portal_otps WHERE created_at < NOW() - INTERVAL '24 hours';
-- $$);
