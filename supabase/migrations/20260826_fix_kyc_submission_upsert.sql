-- Fix KYC submission upsert — two issues:
-- 1. No UNIQUE constraint on user_id → upsert({ onConflict: 'user_id' }) always fails
-- 2. UPDATE RLS rejects status='ai_reviewing' so re-submissions are blocked

-- Remove duplicate rows first (keep latest per user, required before adding unique constraint)
DELETE FROM public.kyc_submissions a
  USING public.kyc_submissions b
  WHERE a.submitted_at < b.submitted_at
    AND a.user_id = b.user_id;

-- Add the unique constraint the upsert depends on
ALTER TABLE public.kyc_submissions
  ADD CONSTRAINT kyc_submissions_user_id_key UNIQUE (user_id);

-- Relax the UPDATE policy: allow ai_reviewing (set by the wizard on submit/re-submit)
DROP POLICY IF EXISTS "kyc_own_update" ON public.kyc_submissions;
CREATE POLICY "kyc_own_update" ON public.kyc_submissions
  FOR UPDATE
  USING  (auth.uid() = user_id)
  WITH CHECK (status IN ('pending', 'needs_more_info', 'ai_reviewing'));
