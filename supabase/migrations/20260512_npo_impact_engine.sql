-- ============================================================
-- IFB Impact Engine: Global NGO Program Infrastructure
-- Expands NPO profiles to support Enterprise tiers, Academy cohorts,
-- and transparent humanitarian funding mechanisms.
-- ============================================================

-- 1. Create NPO table if it doesn't exist (ensuring consistency)
CREATE TABLE IF NOT EXISTS public.npo_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  npo_name TEXT NOT NULL,
  tax_id TEXT,
  mission_statement TEXT,
  sector TEXT,
  country TEXT,
  website TEXT,
  founded_year INTEGER,
  
  -- Program Tiers (Global Standards)
  program_tier TEXT DEFAULT 'Emerging_Academy' CHECK (program_tier IN (
    'Emerging_Academy',  -- Local/Small orgs, part of Masterclass cohorts
    'Cluster_Partner',   -- Mid-sized verified partners
    'Enterprise_NGO',    -- Large-scale global entities needing structural optimization
    'Strategic_Global',  -- Elite top-tier partners
    'Pending_AI_Review',
    'Banned'
  )),
  
  -- Capacity Building (Academy)
  cohort_id UUID, -- For Emerging Academy cohorts
  mentorship_status TEXT DEFAULT 'None' CHECK (mentorship_status IN ('None', 'Enrolled', 'Active_Mentorship', 'Graduated')),
  classroom_coordinator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Structural & Financial
  is_self_sustaining BOOLEAN DEFAULT FALSE,
  scaling_loan_eligibility BOOLEAN DEFAULT FALSE,
  current_float_usd NUMERIC DEFAULT 0,
  total_raised NUMERIC DEFAULT 0,
  ifb_revenue_generated NUMERIC DEFAULT 0,
  
  -- Gateway Config
  donation_message TEXT,
  preset_amounts JSONB DEFAULT '[10, 50, 100]',
  notify_on_donation BOOLEAN DEFAULT TRUE,
  
  -- AI Compliance (Hardened)
  verification_status TEXT DEFAULT 'pending_review',
  ai_risk_score TEXT, -- Low, Medium, High
  ai_compliance_notes TEXT,
  live_ai_status TEXT,
  
  -- Real-time Impact Metrics
  impact_metrics JSONB DEFAULT '{}', -- { "meals_delivered": 0, "trees_planted": 0 }
  transparency_score INTEGER DEFAULT 0, -- 0-100 based on reporting
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. NGO Academy Cohorts
CREATE TABLE IF NOT EXISTS public.npo_cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  focus_area TEXT, -- e.g., "Education", "Clean Water"
  coordinator_id UUID REFERENCES auth.users(id),
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Transparent Impact Reports (Blockchain Notarized)
-- Replaces simple donation updates with verifiable proof of impact.
CREATE TABLE IF NOT EXISTS public.npo_impact_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npo_id UUID REFERENCES public.npo_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  data_points JSONB NOT NULL, -- The units of impact
  proof_file_url TEXT, -- Document or image proving impact
  
  -- Blockchain Notarization
  file_hash TEXT,
  previous_hash TEXT,
  chain_tx_hash TEXT,
  block_number INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to notarize impact report (mining step)
CREATE OR REPLACE FUNCTION public.notarize_impact_report()
RETURNS TRIGGER AS $$
DECLARE
  v_prev_hash TEXT;
  v_data_to_hash TEXT;
BEGIN
  SELECT chain_tx_hash INTO v_prev_hash 
  FROM public.npo_impact_reports 
  ORDER BY created_at DESC LIMIT 1;

  NEW.previous_hash := COALESCE(v_prev_hash, '0000000000000000000000000000000000000000000000000000000000000000');
  
  -- Data to hash: id + npo_id + metrics + prev_hash
  v_data_to_hash := NEW.id::text || NEW.npo_id::text || NEW.data_points::text || NEW.previous_hash;
  
  BEGIN
    NEW.chain_tx_hash := encode(digest(v_data_to_hash, 'sha256'), 'hex');
  EXCEPTION WHEN OTHERS THEN
    NEW.chain_tx_hash := md5(v_data_to_hash);
  END;

  SELECT COALESCE(MAX(block_number), 0) + 1 INTO NEW.block_number FROM public.npo_impact_reports;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_notarize_impact
BEFORE INSERT ON public.npo_impact_reports
FOR EACH ROW EXECUTE FUNCTION public.notarize_impact_report();

-- RLS
ALTER TABLE public.npo_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.npo_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.npo_impact_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "npo_profiles_select" ON public.npo_profiles FOR SELECT USING (TRUE);
CREATE POLICY "npo_profiles_own_all" ON public.npo_profiles FOR ALL USING (auth.uid() = id);

CREATE POLICY "npo_cohorts_select" ON public.npo_cohorts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "npo_impact_reports_select" ON public.npo_impact_reports FOR SELECT USING (TRUE);
CREATE POLICY "npo_impact_reports_own" ON public.npo_impact_reports FOR INSERT WITH CHECK (npo_id = auth.uid());

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.npo_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.npo_impact_reports;
