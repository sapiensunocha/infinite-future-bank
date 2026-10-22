-- Fix doc_type CHECK constraint to include all values used by the admin portal
ALTER TABLE kyc_project_documents
  DROP CONSTRAINT IF EXISTS kyc_project_documents_doc_type_check;

ALTER TABLE kyc_project_documents
  ADD CONSTRAINT kyc_project_documents_doc_type_check
  CHECK (doc_type IN ('passport','cv','resume','company_reg','business_plan','financial_stmt','legal','other'));

-- Add payment_tier to kyc_projects so the tier chosen at registration is remembered
ALTER TABLE kyc_projects
  ADD COLUMN IF NOT EXISTS payment_tier text
  CHECK (payment_tier IN ('startup','sme','corporate','enterprise'));
