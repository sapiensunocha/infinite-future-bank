-- ================================================================
-- IFB Capital Operating System — Database Schema
-- ================================================================

-- 1. Core project submissions
CREATE TABLE IF NOT EXISTS public.capital_projects (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name      TEXT NOT NULL,
  project_name      TEXT NOT NULL,
  description       TEXT,
  sector            TEXT,
  stage             TEXT DEFAULT 'growth',        -- seed|growth|expansion|maturity
  geography         TEXT,
  capital_needed    NUMERIC(16,2) NOT NULL,
  capital_type_pref TEXT DEFAULT 'hybrid',         -- grant|debt|equity|hybrid
  timeline_months   INTEGER DEFAULT 12,
  team_size         INTEGER DEFAULT 5,
  annual_revenue    NUMERIC(14,2) DEFAULT 0,
  doc_urls          TEXT[],                         -- uploaded documents
  status            TEXT DEFAULT 'submitted',       -- submitted|analyzing|packaged|agreement_pending|active|paused|completed|cancelled
  ai_extracted      BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 2. AI-generated risk & capital analysis
CREATE TABLE IF NOT EXISTS public.capital_analyses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES public.capital_projects(id) ON DELETE CASCADE,
  -- Capital structure (% allocation)
  grant_pct         NUMERIC(5,2) DEFAULT 0,
  debt_pct          NUMERIC(5,2) DEFAULT 0,
  equity_pct        NUMERIC(5,2) DEFAULT 0,
  hybrid_pct        NUMERIC(5,2) DEFAULT 0,
  recommended_structure TEXT,
  -- Risk scores (0–100)
  total_risk_score  NUMERIC(5,2) DEFAULT 50,
  country_risk      NUMERIC(5,2) DEFAULT 50,
  execution_risk    NUMERIC(5,2) DEFAULT 50,
  financial_risk    NUMERIC(5,2) DEFAULT 50,
  governance_risk   NUMERIC(5,2) DEFAULT 50,
  risk_label        TEXT DEFAULT 'MODERATE',       -- LOW|MODERATE|HIGH|CRITICAL
  risk_mitigation   JSONB DEFAULT '[]',
  early_warnings    JSONB DEFAULT '[]',
  safeguards        JSONB DEFAULT '[]',
  -- Package content
  executive_summary TEXT,
  reporting_obligations TEXT,
  -- Fee structure
  structuring_fee_pct   NUMERIC(5,2) DEFAULT 2.0,
  risk_fee_pct          NUMERIC(5,2) DEFAULT 1.0,
  platform_fee_usd      NUMERIC(10,2) DEFAULT 5000,
  monitoring_monthly    NUMERIC(10,2) DEFAULT 500,
  success_fee_pct       NUMERIC(5,2) DEFAULT 1.5,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Milestones / timeline
CREATE TABLE IF NOT EXISTS public.capital_milestones (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES public.capital_projects(id) ON DELETE CASCADE,
  phase             INTEGER NOT NULL,
  title             TEXT NOT NULL,
  deliverable       TEXT NOT NULL,
  capital_pct       NUMERIC(5,2) NOT NULL,          -- % of total capital for this tranche
  due_days          INTEGER NOT NULL,                -- days from project start
  status            TEXT DEFAULT 'pending',          -- pending|in_progress|submitted|approved|released|failed
  completed_at      TIMESTAMPTZ,
  capital_released  BOOLEAN DEFAULT false,
  tx_hash           TEXT,                            -- blockchain release hash
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Signed collaboration agreements
CREATE TABLE IF NOT EXISTS public.capital_agreements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES public.capital_projects(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  agreement_text    TEXT,                            -- full legal text
  signature_hash    TEXT,                            -- SHA256 of text+timestamp
  signed_at         TIMESTAMPTZ,
  blockchain_tx     TEXT,
  status            TEXT DEFAULT 'pending',          -- pending|signed|executed
  payment_triggered BOOLEAN DEFAULT false,
  fees_paid_usd     NUMERIC(12,2) DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Fee ledger
CREATE TABLE IF NOT EXISTS public.capital_fees (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES public.capital_projects(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  fee_type          TEXT NOT NULL,                   -- structuring|risk|platform|monitoring|success
  amount_usd        NUMERIC(12,2) NOT NULL,
  status            TEXT DEFAULT 'pending',          -- pending|paid|waived
  paid_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cap_proj_user   ON public.capital_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_cap_mile_proj   ON public.capital_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_cap_agree_proj  ON public.capital_agreements(project_id);

-- RLS
ALTER TABLE public.capital_projects   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capital_analyses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capital_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capital_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capital_fees       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cap_proj_own"    ON public.capital_projects   FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "cap_anal_own"    ON public.capital_analyses   FOR ALL TO authenticated USING (project_id IN (SELECT id FROM public.capital_projects WHERE user_id = auth.uid()));
CREATE POLICY "cap_mile_own"    ON public.capital_milestones FOR ALL TO authenticated USING (project_id IN (SELECT id FROM public.capital_projects WHERE user_id = auth.uid()));
CREATE POLICY "cap_agree_own"   ON public.capital_agreements FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "cap_fees_own"    ON public.capital_fees       FOR ALL TO authenticated USING (user_id = auth.uid());

-- Supabase Storage bucket for documents (run separately if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('capital-documents', 'capital-documents', false) ON CONFLICT DO NOTHING;
