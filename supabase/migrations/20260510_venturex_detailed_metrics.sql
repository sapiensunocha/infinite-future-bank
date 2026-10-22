-- ============================================================
-- VentureX Details & Real-Time Connection Metrics
-- Expands the schema to support exhaustive company profiles,
-- smart contract execution details, and capital solutions.
-- ============================================================

-- 1. Enhance venturex_companies with deep metrics
ALTER TABLE public.venturex_companies
  ADD COLUMN IF NOT EXISTS customer_demographics JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS customer_type TEXT DEFAULT 'B2C', -- B2B, B2C, B2B2C, Enterprise
  ADD COLUMN IF NOT EXISTS customer_ages JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS patents_ip JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS real_time_metrics JSONB DEFAULT '{}', -- e.g., daily active users, api calls
  ADD COLUMN IF NOT EXISTS capital_solutions_sought JSONB DEFAULT '["Equity"]', -- Loans, Equity, Convertible Note
  ADD COLUMN IF NOT EXISTS mentorship_needed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS mentorship_areas JSONB DEFAULT '[]';

-- 2. Enhance venturex_investors with deep filtering & offerings
ALTER TABLE public.venturex_investors
  ADD COLUMN IF NOT EXISTS custom_filters JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS offered_capital_solutions JSONB DEFAULT '["Equity"]',
  ADD COLUMN IF NOT EXISTS offered_mentorship_areas JSONB DEFAULT '[]';

-- 3. Enhance venturex_deals with advanced smart contract details
ALTER TABLE public.venturex_deals
  ADD COLUMN IF NOT EXISTS smart_contract_address TEXT,
  ADD COLUMN IF NOT EXISTS real_time_data_access BOOLEAN DEFAULT FALSE, -- Investor gets read-only access to company telemetry
  ADD COLUMN IF NOT EXISTS deal_type TEXT DEFAULT 'Equity'; -- Equity, Loan, SAFE

-- 4. Create a mentorship connection tracking table
CREATE TABLE IF NOT EXISTS public.venturex_mentorships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.venturex_companies(id) ON DELETE CASCADE,
  investor_id UUID REFERENCES public.venturex_investors(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active', -- active, completed, cancelled
  focus_areas JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.venturex_mentorships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mentorships_parties" ON public.venturex_mentorships FOR ALL
  USING (
    company_id IN (SELECT id FROM public.venturex_companies WHERE user_id = auth.uid()) OR
    investor_id IN (SELECT id FROM public.venturex_investors WHERE user_id = auth.uid())
  );
