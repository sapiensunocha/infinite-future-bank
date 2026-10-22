-- Add company_industry column to kyc_submissions
-- KYCWizard sends this field (mapped to the "Business Activity" input) but
-- the column was never included in any prior migration, causing:
-- "could not find the 'company_industry' column of 'kyc_submissions' in the schema cache"

ALTER TABLE public.kyc_submissions
  ADD COLUMN IF NOT EXISTS company_industry TEXT;
