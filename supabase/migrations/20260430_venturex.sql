-- ============================================================
-- VentureX — Full Financial OS for Startups & Investors
-- ============================================================

-- Telemetry table for boot tracking
CREATE TABLE IF NOT EXISTS public.app_telemetry (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event       TEXT NOT NULL,
  app_version TEXT,
  platform    TEXT,
  user_agent  TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Companies (Entrepreneurs)
CREATE TABLE IF NOT EXISTS public.venturex_companies (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identity
  legal_name               TEXT NOT NULL,
  registration_number      TEXT,
  country                  TEXT,
  incorporation_date       DATE,
  sector                   TEXT,
  sub_sector               TEXT,
  tagline                  TEXT,
  website                  TEXT,

  -- Founders stored inline as JSONB array
  founders                 JSONB DEFAULT '[]',

  -- Revenue
  monthly_revenue          NUMERIC DEFAULT 0,
  revenue_growth_rate      NUMERIC DEFAULT 0,
  revenue_streams          JSONB   DEFAULT '[]',

  -- Costs
  fixed_costs              NUMERIC DEFAULT 0,
  variable_costs           NUMERIC DEFAULT 0,
  total_expenses           NUMERIC DEFAULT 0,

  -- Profitability
  gross_margin             NUMERIC DEFAULT 0,
  net_profit               NUMERIC DEFAULT 0,
  ebitda                   NUMERIC DEFAULT 0,

  -- Burn & Runway
  monthly_burn_rate        NUMERIC DEFAULT 0,
  cash_on_hand             NUMERIC DEFAULT 0,
  runway_months            NUMERIC GENERATED ALWAYS AS (
    CASE WHEN monthly_burn_rate > 0
         THEN cash_on_hand / monthly_burn_rate
         ELSE 0 END
  ) STORED,

  -- Funding
  total_raised             NUMERIC DEFAULT 0,
  current_round            TEXT    DEFAULT 'pre-seed',
  valuation                NUMERIC DEFAULT 0,
  funding_goal             NUMERIC DEFAULT 0,
  equity_offered           NUMERIC DEFAULT 0,

  -- Product
  product_stage            TEXT    DEFAULT 'idea',
  active_users             INTEGER DEFAULT 0,
  user_growth_rate         NUMERIC DEFAULT 0,
  retention_rate           NUMERIC DEFAULT 0,
  churn_rate               NUMERIC DEFAULT 0,

  -- Market
  tam                      NUMERIC DEFAULT 0,
  sam                      NUMERIC DEFAULT 0,
  som                      NUMERIC DEFAULT 0,
  competitors              JSONB   DEFAULT '[]',
  competitive_advantage    TEXT,

  -- Operations
  team_size                INTEGER DEFAULT 1,
  hiring_plan              TEXT,
  key_roles_missing        JSONB   DEFAULT '[]',

  -- KPIs
  cac                      NUMERIC DEFAULT 0,
  ltv                      NUMERIC DEFAULT 0,
  conversion_rate          NUMERIC DEFAULT 0,

  -- Risk
  regulatory_risk          TEXT DEFAULT 'medium',
  market_risk              TEXT DEFAULT 'medium',
  execution_risk           TEXT DEFAULT 'medium',

  -- Documents
  pitch_deck_url           TEXT,
  financial_statements_url TEXT,
  legal_docs_url           TEXT,

  -- Computed scores (updated by trigger / edge function)
  investment_readiness_score NUMERIC DEFAULT 0,
  risk_score                 NUMERIC DEFAULT 0,
  growth_score               NUMERIC DEFAULT 0,

  -- Status
  status     TEXT    DEFAULT 'draft',
  is_public  BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Investors
CREATE TABLE IF NOT EXISTS public.venturex_investors (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identity
  investor_type           TEXT DEFAULT 'angel',
  fund_name               TEXT,
  bio                     TEXT,

  -- Capital
  total_capital_available NUMERIC DEFAULT 0,
  average_ticket_size     NUMERIC DEFAULT 0,
  max_ticket_size         NUMERIC DEFAULT 0,

  -- Criteria
  preferred_sectors       JSONB   DEFAULT '[]',
  preferred_stage         JSONB   DEFAULT '[]',
  preferred_geography     JSONB   DEFAULT '[]',
  risk_level              TEXT    DEFAULT 'medium',

  -- Strategic value
  provides_mentorship     BOOLEAN DEFAULT FALSE,
  provides_network        BOOLEAN DEFAULT FALSE,

  -- Portfolio
  number_of_investments   INTEGER DEFAULT 0,
  notable_companies       JSONB   DEFAULT '[]',

  is_active               BOOLEAN DEFAULT TRUE,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Deals
CREATE TABLE IF NOT EXISTS public.venturex_deals (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           UUID REFERENCES public.venturex_companies(id) ON DELETE CASCADE,
  investor_id          UUID REFERENCES public.venturex_investors(id),
  company_user_id      UUID,
  investor_user_id     UUID,

  amount               NUMERIC NOT NULL,
  equity_percentage    NUMERIC NOT NULL,
  valuation            NUMERIC NOT NULL,

  status               TEXT DEFAULT 'proposed',

  funds_released       NUMERIC DEFAULT 0,
  total_milestones     INTEGER DEFAULT 0,
  completed_milestones INTEGER DEFAULT 0,

  -- Smart contract / dispute
  dispute_flag         BOOLEAN DEFAULT FALSE,
  arbitration_required BOOLEAN DEFAULT FALSE,
  third_party_review   BOOLEAN DEFAULT FALSE,
  dispute_notes        TEXT,

  -- IFB monetization
  ifb_commission_rate  NUMERIC DEFAULT 2.5,
  ifb_commission_amount NUMERIC GENERATED ALWAYS AS (amount * ifb_commission_rate / 100) STORED,

  -- Success fee (applied on completion)
  success_fee_rate     NUMERIC DEFAULT 2.0,

  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Milestones (smart contract gates)
CREATE TABLE IF NOT EXISTS public.venturex_milestones (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id             UUID REFERENCES public.venturex_deals(id) ON DELETE CASCADE,

  title               TEXT NOT NULL,
  description         TEXT,
  deadline            DATE,
  success_metric      TEXT,
  verification_method TEXT,
  fund_amount         NUMERIC DEFAULT 0,

  is_completed        BOOLEAN   DEFAULT FALSE,
  is_verified         BOOLEAN   DEFAULT FALSE,
  completed_at        TIMESTAMPTZ,
  verified_at         TIMESTAMPTZ,

  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Match scores
CREATE TABLE IF NOT EXISTS public.venturex_matches (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id             UUID REFERENCES public.venturex_companies(id) ON DELETE CASCADE,
  investor_id            UUID REFERENCES public.venturex_investors(id) ON DELETE CASCADE,

  match_score            NUMERIC DEFAULT 0,
  sector_score           NUMERIC DEFAULT 0,
  stage_score            NUMERIC DEFAULT 0,
  geography_score        NUMERIC DEFAULT 0,
  ticket_score           NUMERIC DEFAULT 0,
  risk_score             NUMERIC DEFAULT 0,
  traction_score         NUMERIC DEFAULT 0,
  financial_health_score NUMERIC DEFAULT 0,

  status                 TEXT DEFAULT 'pending',
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, investor_id)
);

-- RLS: allow authenticated users to manage their own rows
ALTER TABLE public.venturex_companies  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venturex_investors  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venturex_deals      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venturex_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venturex_matches    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_telemetry       ENABLE ROW LEVEL SECURITY;

-- Companies: own row + read public ones
CREATE POLICY "companies_own"   ON public.venturex_companies FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "companies_public" ON public.venturex_companies FOR SELECT USING (is_public = TRUE);

-- Investors: own row + visible to authenticated
CREATE POLICY "investors_own"    ON public.venturex_investors FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "investors_public" ON public.venturex_investors FOR SELECT USING (is_active = TRUE AND auth.role() = 'authenticated');

-- Deals: parties see their own deals
CREATE POLICY "deals_parties" ON public.venturex_deals FOR ALL
  USING (auth.uid() = company_user_id OR auth.uid() = investor_user_id);

-- Milestones: readable by deal parties
CREATE POLICY "milestones_parties" ON public.venturex_milestones FOR ALL
  USING (deal_id IN (SELECT id FROM public.venturex_deals WHERE company_user_id = auth.uid() OR investor_user_id = auth.uid()));

-- Matches: own matches
CREATE POLICY "matches_own" ON public.venturex_matches FOR SELECT
  USING (
    company_id IN (SELECT id FROM public.venturex_companies WHERE user_id = auth.uid()) OR
    investor_id IN (SELECT id FROM public.venturex_investors WHERE user_id = auth.uid())
  );

-- Telemetry: insert-only for all
CREATE POLICY "telemetry_insert" ON public.app_telemetry FOR INSERT WITH CHECK (TRUE);

-- Milestone release function (smart contract logic)
CREATE OR REPLACE FUNCTION public.release_milestone_funds(p_milestone_id UUID, p_verifier_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_milestone venturex_milestones%ROWTYPE;
  v_deal      venturex_deals%ROWTYPE;
BEGIN
  SELECT * INTO v_milestone FROM venturex_milestones WHERE id = p_milestone_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Milestone not found'); END IF;
  IF v_milestone.is_verified THEN RETURN jsonb_build_object('error', 'Already released'); END IF;
  IF NOT v_milestone.is_completed THEN RETURN jsonb_build_object('error', 'Milestone not completed yet'); END IF;

  SELECT * INTO v_deal FROM venturex_deals WHERE id = v_milestone.deal_id;

  -- Mark verified
  UPDATE venturex_milestones
  SET is_verified = TRUE, verified_at = NOW()
  WHERE id = p_milestone_id;

  -- Update deal totals
  UPDATE venturex_deals
  SET funds_released = funds_released + v_milestone.fund_amount,
      completed_milestones = completed_milestones + 1,
      status = CASE WHEN completed_milestones + 1 >= total_milestones THEN 'completed' ELSE status END,
      updated_at = NOW()
  WHERE id = v_milestone.deal_id;

  RETURN jsonb_build_object('released', v_milestone.fund_amount, 'deal_id', v_milestone.deal_id);
END;
$$;
