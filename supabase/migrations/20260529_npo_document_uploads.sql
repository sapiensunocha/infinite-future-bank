-- Add document upload columns to npo_profiles
ALTER TABLE public.npo_profiles
  ADD COLUMN IF NOT EXISTS charter_url TEXT,
  ADD COLUMN IF NOT EXISTS financial_doc_url TEXT;
