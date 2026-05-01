-- ============================================================
-- IFB PRODUCTION: Processor upgrade + KYC system + AFR ledger
-- ============================================================

-- 1. Upgrade ALL existing profiles to P2P processors
UPDATE public.profiles SET
  is_cot_processor = TRUE,
  cot_rating = CASE WHEN cot_rating IS NULL OR cot_rating = 0 THEN 100 ELSE cot_rating END,
  cot_completed_tx = CASE WHEN cot_completed_tx IS NULL THEN 0 ELSE cot_completed_tx END,
  cot_payment_methods = CASE
    WHEN cot_payment_methods IS NULL THEN '["Bank Transfer","Mobile Money","Cash"]'::jsonb
    ELSE cot_payment_methods
  END
WHERE is_cot_processor IS NOT TRUE;

-- 2. KYC data table — 150 data points AI-extracted from documents
CREATE TABLE IF NOT EXISTS public.kyc_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','ai_reviewing','p2p_review','approved','rejected','needs_more_info')),
  reviewer_id UUID REFERENCES public.profiles(id),
  reviewer_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- ── IDENTITY (20 fields) ──────────────────────────────────
  legal_first_name TEXT,
  legal_middle_name TEXT,
  legal_last_name TEXT,
  legal_full_name TEXT,
  date_of_birth DATE,
  gender TEXT,
  nationality TEXT,
  country_of_birth TEXT,
  city_of_birth TEXT,
  marital_status TEXT,
  number_of_dependents INTEGER,
  primary_language TEXT,
  secondary_language TEXT,
  religion TEXT,
  ethnicity TEXT,
  id_type TEXT, -- passport, national_id, drivers_license
  id_number TEXT,
  id_expiry DATE,
  id_issuing_country TEXT,
  id_issuing_authority TEXT,

  -- ── CONTACT (15 fields) ──────────────────────────────────
  email_primary TEXT,
  email_secondary TEXT,
  phone_primary TEXT,
  phone_secondary TEXT,
  whatsapp_number TEXT,
  residential_address_line1 TEXT,
  residential_address_line2 TEXT,
  residential_city TEXT,
  residential_state TEXT,
  residential_postal_code TEXT,
  residential_country TEXT,
  mailing_address TEXT,
  years_at_address INTEGER,
  home_ownership TEXT, -- owned, rented, family
  emergency_contact_name TEXT,

  -- ── FINANCIAL (25 fields) ──────────────────────────────────
  employment_status TEXT, -- employed, self_employed, student, retired, unemployed
  employer_name TEXT,
  employer_address TEXT,
  job_title TEXT,
  industry TEXT,
  years_employed INTEGER,
  monthly_income_usd NUMERIC,
  annual_income_usd NUMERIC,
  other_income_sources TEXT,
  other_income_amount_usd NUMERIC,
  primary_bank_name TEXT,
  primary_bank_account_type TEXT,
  has_investment_accounts BOOLEAN,
  investment_types TEXT,
  total_net_worth_usd NUMERIC,
  liquid_assets_usd NUMERIC,
  real_estate_value_usd NUMERIC,
  crypto_holdings BOOLEAN,
  monthly_expenses_usd NUMERIC,
  monthly_savings_usd NUMERIC,
  existing_loans BOOLEAN,
  total_debt_usd NUMERIC,
  credit_score INTEGER,
  credit_bureau TEXT,
  tax_id TEXT,

  -- ── SOURCE OF FUNDS (10 fields) ──────────────────────────────────
  source_of_funds TEXT, -- salary, business, investment, inheritance, gift
  source_of_funds_details TEXT,
  expected_monthly_deposits_usd NUMERIC,
  expected_monthly_withdrawals_usd NUMERIC,
  expected_transaction_purpose TEXT,
  business_nature TEXT,
  business_registration_number TEXT,
  business_country TEXT,
  business_annual_revenue_usd NUMERIC,
  ubo_declaration TEXT, -- Ultimate Beneficial Owner

  -- ── LIFESTYLE & RISK (15 fields) ──────────────────────────────────
  politically_exposed_person BOOLEAN DEFAULT FALSE,
  pep_role TEXT,
  pep_country TEXT,
  criminal_record BOOLEAN DEFAULT FALSE,
  criminal_record_details TEXT,
  sanctions_check BOOLEAN DEFAULT FALSE,
  adverse_media_check BOOLEAN DEFAULT FALSE,
  risk_rating TEXT DEFAULT 'medium' CHECK (risk_rating IN ('low','medium','high','critical')),
  risk_notes TEXT,
  travel_frequency TEXT,
  primary_travel_regions TEXT[],
  international_payments BOOLEAN,
  international_payment_countries TEXT[],
  purpose_of_account TEXT,
  referral_source TEXT,

  -- ── DOCUMENTS (15 fields) ──────────────────────────────────
  id_front_url TEXT,
  id_back_url TEXT,
  selfie_url TEXT,
  selfie_with_id_url TEXT,
  proof_of_address_url TEXT,
  proof_of_income_url TEXT,
  bank_statement_url TEXT,
  tax_return_url TEXT,
  business_license_url TEXT,
  utility_bill_url TEXT,
  employment_letter_url TEXT,
  additional_doc_1_url TEXT,
  additional_doc_2_url TEXT,
  additional_doc_3_url TEXT,
  document_notes TEXT,

  -- ── AI EXTRACTION (15 fields) ──────────────────────────────────
  ai_extraction_status TEXT DEFAULT 'pending',
  ai_confidence_score NUMERIC,
  ai_id_verified BOOLEAN,
  ai_face_match_score NUMERIC,
  ai_address_verified BOOLEAN,
  ai_income_verified BOOLEAN,
  ai_sanctions_clear BOOLEAN,
  ai_pep_clear BOOLEAN,
  ai_aml_score NUMERIC,
  ai_fraud_score NUMERIC,
  ai_data_extracted JSONB DEFAULT '{}',
  ai_flags TEXT[],
  ai_recommendation TEXT CHECK (ai_recommendation IN ('approve','reject','manual_review')),
  ai_reviewed_at TIMESTAMPTZ,
  ai_model_version TEXT,

  -- ── P2P REVIEW (10 fields) ──────────────────────────────────
  p2p_reviewer_id UUID REFERENCES public.profiles(id),
  p2p_review_status TEXT CHECK (p2p_review_status IN ('pending','in_progress','completed')),
  p2p_reviewer_notes TEXT,
  p2p_identity_confirmed BOOLEAN,
  p2p_address_confirmed BOOLEAN,
  p2p_reviewed_at TIMESTAMPTZ,
  p2p_review_method TEXT, -- in_person, video_call, document_only
  p2p_geolocation TEXT,
  p2p_photos_taken BOOLEAN,
  p2p_signature_obtained BOOLEAN
);

ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;

-- Users can read and insert their own submission
DO $$ BEGIN
  CREATE POLICY "kyc_own_read" ON public.kyc_submissions FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "kyc_own_insert" ON public.kyc_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "kyc_own_update" ON public.kyc_submissions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (status IN ('pending','needs_more_info'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Admins and P2P reviewers can read/update all
DO $$ BEGIN
  CREATE POLICY "kyc_admin_all" ON public.kyc_submissions FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','admin_l3','superadmin','is_cot_processor')));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. AFR Ledger — tracks native AFR blockchain transactions
CREATE TABLE IF NOT EXISTS public.afr_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  tx_type TEXT NOT NULL CHECK (tx_type IN ('mint','burn','transfer_out','transfer_in','deposit_conversion','withdrawal_redemption')),
  afr_amount NUMERIC NOT NULL,
  usd_equivalent NUMERIC,
  uafr_amount NUMERIC GENERATED ALWAYS AS (afr_amount * 1000000) STORED,
  chain_tx_hash TEXT,
  block_number BIGINT,
  from_address TEXT,
  to_address TEXT,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending','confirmed','failed')),
  intelligence_core_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

ALTER TABLE public.afr_ledger ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "afr_own_read" ON public.afr_ledger FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. AFR conversion rate config
INSERT INTO public.app_config (key, value) VALUES
  ('afr_usd_rate', '0.01'),         -- 1 AFR = $0.01 at launch (grows over time)
  ('afr_mint_on_deposit', 'true'),   -- auto-mint AFR when user deposits USD
  ('afr_mint_ratio', '100'),         -- for every $1 deposited, mint 100 AFR
  ('kyc_required_for_withdrawal', 'true'),
  ('kyc_required_for_loans', 'true'),
  ('processor_upgrade_version', '1.0')
ON CONFLICT (key) DO NOTHING;

-- 5. Upgrade profile kyc_status for verified users who submitted docs
-- Mark pending users as needing KYC submission
UPDATE public.profiles
SET kyc_status = 'pending_kyc'
WHERE kyc_status IS NULL OR kyc_status = 'pending';

-- 6. Notification log for processor upgrade emails
CREATE TABLE IF NOT EXISTS public.system_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  email TEXT,
  subject TEXT,
  template TEXT,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.system_emails ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "sys_email_admin" ON public.system_emails FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','superadmin')));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Insert email queue for processor upgrade notification
INSERT INTO public.system_emails (user_id, email, subject, template, status)
SELECT id, email, 'You are now an IFB P2P Processor', 'processor_upgrade', 'pending'
FROM public.profiles
WHERE email IS NOT NULL AND email != '';
