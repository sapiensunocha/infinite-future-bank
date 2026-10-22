-- ============================================================
-- Sovereign Phone Verification Infrastructure
-- Enables "Free" identification via custom OTP engine.
-- ============================================================

-- 1. Add phone column to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;

-- 2. OTP Verification Table
CREATE TABLE IF NOT EXISTS public.otp_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

-- Only system/service role should interact with OTP codes directly
CREATE POLICY "otp_select" ON public.otp_verifications FOR SELECT USING (FALSE);

-- 3. Trigger to update profile on verification
CREATE OR REPLACE FUNCTION public.handle_otp_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verified_at IS NOT NULL AND OLD.verified_at IS NULL THEN
    UPDATE public.profiles 
    SET phone_verified = TRUE 
    WHERE phone_number = NEW.phone_number;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_otp_verified
AFTER UPDATE ON public.otp_verifications
FOR EACH ROW EXECUTE FUNCTION public.handle_otp_verification();
