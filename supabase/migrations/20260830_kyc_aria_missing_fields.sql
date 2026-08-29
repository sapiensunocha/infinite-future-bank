-- W2: Store ARIA's actionable missing_fields and missing_documents so admin queue
-- and the user's "Action Required" card can show exactly what to provide.

ALTER TABLE public.kyc_submissions
  ADD COLUMN IF NOT EXISTS aria_missing_fields     TEXT[],
  ADD COLUMN IF NOT EXISTS aria_missing_documents  TEXT[];
