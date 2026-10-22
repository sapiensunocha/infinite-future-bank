-- Add payment proof URL to payments (for mobile money receipt uploads)
ALTER TABLE kyc_project_payments
  ADD COLUMN IF NOT EXISTS payment_proof_url text;

-- Also allow payment_proof as a document type
ALTER TABLE kyc_project_documents
  DROP CONSTRAINT IF EXISTS kyc_project_documents_doc_type_check;

ALTER TABLE kyc_project_documents
  ADD CONSTRAINT kyc_project_documents_doc_type_check
  CHECK (doc_type IN ('passport','cv','resume','company_reg','business_plan','financial_stmt','legal','payment_proof','other'));
