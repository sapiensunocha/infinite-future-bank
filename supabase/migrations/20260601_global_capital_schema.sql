-- ============================================================
-- IFB GLOBAL CAPITAL DATABASE — SCHEMA
-- Foundation for the capital matchmaking engine.
-- All 4 asset classes + providers + reference rates.
-- ============================================================

-- ── 1. CAPITAL PROVIDERS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.capital_providers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  short_name          TEXT,
  provider_type       TEXT NOT NULL CHECK (provider_type IN (
    'multilateral_dfi',   -- World Bank, AfDB, IFC, ADB
    'bilateral_dfi',      -- USAID, GIZ, JICA, AFD
    'foundation',         -- Gates, Ford, Mastercard Foundation
    'government_agency',  -- SBA, Bpifrance, British Business Bank
    'commercial_bank',    -- Stanbic, Ecobank, Standard Bank
    'microfinance',       -- Kiva, FINCA, Grameen
    'development_bank',   -- Afreximbank, TDB, ECOWAS Bank
    'stock_exchange',     -- NSE, JSE, NYSE, NASDAQ
    'ratings_agency',     -- S&P, Moody's, Fitch
    'accelerator',        -- YC, Techstars, TEF
    'impact_fund',        -- Acumen, Omidyar, Skoll
    'islamic_finance'     -- IsDB, Gulf finance
  )),
  hq_country          TEXT,
  regions_active      TEXT[],          -- regions where they operate
  website             TEXT,
  founded_year        INTEGER,
  aum_usd_billions    NUMERIC,         -- assets under management
  credit_rating       TEXT,            -- provider's own credit rating
  is_active           BOOLEAN DEFAULT TRUE,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. REFERENCE RATES ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.capital_reference_rates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_name     TEXT NOT NULL UNIQUE,  -- 'SOFR', 'EURIBOR_3M', 'FED_FUNDS'
  rate_type     TEXT NOT NULL CHECK (rate_type IN (
    'central_bank', 'interbank', 'overnight', 'term', 'policy'
  )),
  rate_value    NUMERIC NOT NULL,      -- current value in percent
  currency      TEXT NOT NULL,
  region        TEXT NOT NULL,
  tenor         TEXT,                  -- '1M','3M','6M','1Y','overnight'
  issuing_body  TEXT,                  -- 'Federal Reserve', 'ECB', etc.
  effective_date DATE,
  next_review   DATE,
  trend         TEXT CHECK (trend IN ('rising','stable','falling')),
  last_updated  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. GLOBAL FUNDINGS (Grants, DFI equity, blended) ───────
CREATE TABLE IF NOT EXISTS public.capital_fundings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id             UUID REFERENCES public.capital_providers(id),
  program_name            TEXT NOT NULL,
  funding_type            TEXT NOT NULL CHECK (funding_type IN (
    'grant', 'equity', 'quasi_equity', 'blended_finance',
    'prize', 'fellowship', 'guarantee', 'technical_assistance'
  )),
  -- Amounts
  amount_min_usd          NUMERIC,
  amount_max_usd          NUMERIC,
  currency                TEXT DEFAULT 'USD',
  total_envelope_usd      NUMERIC,     -- total pool available
  -- Eligibility
  eligible_regions        TEXT[],      -- ['Africa','Global','Sub-Saharan Africa']
  eligible_countries      TEXT[],      -- specific countries if applicable
  ineligible_countries    TEXT[],
  eligible_sectors        TEXT[],      -- ['Agriculture','Technology','All']
  eligible_entity_types   TEXT[],      -- ['startup','npo','sme','individual','cooperative']
  min_years_operating     INTEGER DEFAULT 0,
  max_years_operating     INTEGER,
  requires_kyc            BOOLEAN DEFAULT TRUE,
  requires_registration   BOOLEAN DEFAULT TRUE,
  requires_audited_financials BOOLEAN DEFAULT FALSE,
  co_funding_required     BOOLEAN DEFAULT FALSE,
  co_funding_pct          NUMERIC,     -- % required from applicant
  -- Terms
  repayment_required      BOOLEAN DEFAULT FALSE,
  equity_stake_pct        NUMERIC,     -- if equity
  has_technical_assistance BOOLEAN DEFAULT FALSE,
  -- Process
  application_url         TEXT,
  deadline_type           TEXT CHECK (deadline_type IN ('fixed','rolling','cohort','closed')),
  deadline_date           DATE,
  avg_processing_days     INTEGER,
  success_rate_pct        NUMERIC,     -- historical approval rate
  -- Context
  focus_sdgs              INTEGER[],   -- UN SDG numbers
  language                TEXT[] DEFAULT ARRAY['English'],
  status                  TEXT DEFAULT 'open' CHECK (status IN ('open','closed','upcoming','rolling')),
  notes                   TEXT,
  last_verified           DATE,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. GLOBAL LOANS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.capital_loans (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id               UUID REFERENCES public.capital_providers(id),
  product_name              TEXT NOT NULL,
  loan_type                 TEXT NOT NULL CHECK (loan_type IN (
    'term_loan', 'revolving_credit', 'trade_finance', 'project_finance',
    'microfinance', 'concessional', 'sovereign', 'mortgage',
    'overdraft', 'invoice_financing', 'equipment_leasing', 'islamic_murabaha',
    'islamic_ijara', 'green_loan', 'blended'
  )),
  -- Rate structure
  rate_structure            TEXT NOT NULL CHECK (rate_structure IN ('fixed','floating','hybrid')),
  base_rate_benchmark       TEXT,       -- 'SOFR','EURIBOR_3M','PRIME','FIXED' etc.
  base_rate_value           NUMERIC,    -- current base rate %
  spread_min_pct            NUMERIC,    -- spread above base
  spread_max_pct            NUMERIC,
  total_rate_min_pct        NUMERIC,    -- all-in rate floor
  total_rate_max_pct        NUMERIC,    -- all-in rate ceiling
  -- Amounts
  amount_min_usd            NUMERIC,
  amount_max_usd            NUMERIC,
  currency                  TEXT DEFAULT 'USD',
  -- Tenor
  tenor_min_months          INTEGER,
  tenor_max_months          INTEGER,
  grace_period_months       INTEGER DEFAULT 0,
  -- Risk / Collateral
  ltv_max_pct               NUMERIC,    -- max loan-to-value
  collateral_required       BOOLEAN DEFAULT TRUE,
  collateral_types          TEXT[],     -- ['real_estate','equipment','invoice','guarantee','none']
  guarantor_required        BOOLEAN DEFAULT FALSE,
  credit_score_min          INTEGER,    -- min credit score if applicable
  -- Eligibility
  eligible_regions          TEXT[],
  eligible_countries        TEXT[],
  eligible_sectors          TEXT[],
  eligible_entity_types     TEXT[],
  min_annual_revenue_usd    NUMERIC,
  min_years_in_business     INTEGER DEFAULT 0,
  requires_kyc              BOOLEAN DEFAULT TRUE,
  requires_audited_financials BOOLEAN DEFAULT FALSE,
  -- Fees
  origination_fee_pct       NUMERIC DEFAULT 0,
  annual_fee_pct            NUMERIC DEFAULT 0,
  prepayment_penalty        BOOLEAN DEFAULT FALSE,
  prepayment_penalty_pct    NUMERIC,
  -- Process
  application_url           TEXT,
  avg_approval_days         INTEGER,
  status                    TEXT DEFAULT 'active' CHECK (status IN ('active','paused','closed')),
  notes                     TEXT,
  last_verified             DATE,
  created_at                TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. BONDS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.capital_bonds (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id         UUID REFERENCES public.capital_providers(id),
  bond_name           TEXT NOT NULL,
  isin                TEXT UNIQUE,
  issuer_name         TEXT NOT NULL,
  issuer_type         TEXT NOT NULL CHECK (issuer_type IN (
    'sovereign', 'supranational', 'corporate',
    'municipal', 'agency', 'covered', 'sukuk'
  )),
  -- Classification
  bond_type           TEXT NOT NULL CHECK (bond_type IN (
    'fixed_rate', 'floating_rate', 'zero_coupon',
    'inflation_linked', 'convertible', 'callable', 'green', 'sustainability'
  )),
  is_green_bond       BOOLEAN DEFAULT FALSE,
  is_sukuk            BOOLEAN DEFAULT FALSE,
  is_eurobond         BOOLEAN DEFAULT FALSE,
  -- Pricing
  face_value          NUMERIC DEFAULT 1000,
  currency            TEXT DEFAULT 'USD',
  price               NUMERIC,         -- current market price
  coupon_rate_pct     NUMERIC,         -- annual coupon %
  yield_to_maturity   NUMERIC,         -- current YTM %
  current_yield       NUMERIC,
  accrued_interest    NUMERIC DEFAULT 0,
  -- Risk metrics
  duration            NUMERIC,         -- modified duration (years)
  convexity           NUMERIC,
  credit_rating_sp    TEXT,            -- S&P rating
  credit_rating_moodys TEXT,           -- Moody's rating
  credit_rating_fitch TEXT,            -- Fitch rating
  credit_spread_bps   NUMERIC,         -- spread over risk-free (basis points)
  default_probability NUMERIC,         -- estimated annual default %
  -- Dates
  issue_date          DATE,
  maturity_date       DATE,
  next_coupon_date    DATE,
  -- Features
  callable            BOOLEAN DEFAULT FALSE,
  call_date           DATE,
  puttable            BOOLEAN DEFAULT FALSE,
  convertible         BOOLEAN DEFAULT FALSE,
  -- Market
  country             TEXT,
  exchange_listed     TEXT,
  minimum_denomination NUMERIC DEFAULT 1000,
  settlement_days     INTEGER DEFAULT 2,
  outstanding_amount_usd NUMERIC,
  -- Metadata
  sector              TEXT,            -- for corporate bonds
  status              TEXT DEFAULT 'active' CHECK (status IN ('active','matured','called','defaulted')),
  last_updated        TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. EQUITIES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.capital_equities (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id         UUID REFERENCES public.capital_providers(id),
  ticker              TEXT NOT NULL,
  exchange            TEXT NOT NULL,
  company_name        TEXT NOT NULL,
  isin                TEXT,
  -- Classification
  asset_type          TEXT NOT NULL CHECK (asset_type IN (
    'stock', 'etf', 'index_fund', 'reit', 'adr', 'gdr'
  )),
  sector              TEXT,
  industry            TEXT,
  country             TEXT,
  currency            TEXT DEFAULT 'USD',
  is_africa_listed    BOOLEAN DEFAULT FALSE,
  -- Price data
  price               NUMERIC,
  bid                 NUMERIC,
  ask                 NUMERIC,
  volume_24h          BIGINT,
  avg_volume_30d      BIGINT,
  -- Market metrics
  market_cap_usd      NUMERIC,
  shares_outstanding  BIGINT,
  float_shares        BIGINT,
  -- Valuation
  pe_ratio            NUMERIC,
  forward_pe          NUMERIC,
  pb_ratio            NUMERIC,
  ps_ratio            NUMERIC,
  ev_ebitda           NUMERIC,
  eps_ttm             NUMERIC,
  eps_forward         NUMERIC,
  -- Returns
  dividend_yield_pct  NUMERIC,
  dividend_frequency  TEXT CHECK (dividend_frequency IN ('annual','semi_annual','quarterly','monthly',NULL)),
  price_change_1d_pct NUMERIC,
  price_change_1w_pct NUMERIC,
  price_change_1m_pct NUMERIC,
  price_change_1y_pct NUMERIC,
  -- Risk
  beta                NUMERIC,
  week_52_high        NUMERIC,
  week_52_low         NUMERIC,
  -- Fundamentals (TTM)
  revenue_usd         NUMERIC,
  net_income_usd      NUMERIC,
  ebitda_usd          NUMERIC,
  debt_to_equity      NUMERIC,
  roe_pct             NUMERIC,
  roa_pct             NUMERIC,
  gross_margin_pct    NUMERIC,
  -- ETF-specific
  etf_nav             NUMERIC,
  etf_expense_ratio   NUMERIC,
  etf_underlying_index TEXT,
  -- Analyst
  analyst_consensus   TEXT CHECK (analyst_consensus IN ('strong_buy','buy','hold','sell','strong_sell',NULL)),
  analyst_target_price NUMERIC,
  analyst_count       INTEGER,
  -- Metadata
  description         TEXT,
  status              TEXT DEFAULT 'active',
  last_updated        TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ticker, exchange)
);

-- ── 7. CAPITAL MATCH PROFILES (per user) ───────────────────
CREATE TABLE IF NOT EXISTS public.capital_match_profiles (
  user_id                 UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Who they are
  entity_type             TEXT CHECK (entity_type IN (
    'individual', 'startup', 'sme', 'npo', 'cooperative',
    'corporate', 'social_enterprise', 'government'
  )),
  country                 TEXT,
  region                  TEXT,         -- derived: 'East Africa','West Africa' etc.
  sector                  TEXT[],       -- multiple sectors
  years_in_business       INTEGER DEFAULT 0,
  -- Financial profile
  annual_revenue_usd      NUMERIC,
  monthly_burn_usd        NUMERIC,
  existing_debt_usd       NUMERIC DEFAULT 0,
  assets_usd              NUMERIC DEFAULT 0,
  -- Capital need
  capital_need_usd        NUMERIC,
  capital_purpose         TEXT[],       -- ['expansion','working_capital','equipment','acquisition']
  preferred_capital_types TEXT[],       -- ['grant','loan','equity','bond']
  can_offer_collateral    BOOLEAN DEFAULT FALSE,
  collateral_value_usd    NUMERIC,
  max_interest_rate_pct   NUMERIC,      -- max rate willing to pay
  timeline_months         INTEGER,      -- how urgently needed
  -- Qualifications
  is_kyc_verified         BOOLEAN DEFAULT FALSE,
  has_audited_financials  BOOLEAN DEFAULT FALSE,
  has_registration        BOOLEAN DEFAULT FALSE,
  credit_score            INTEGER,
  -- Preferences
  preferred_currencies    TEXT[] DEFAULT ARRAY['USD'],
  preferred_languages     TEXT[] DEFAULT ARRAY['English'],
  impact_focus            BOOLEAN DEFAULT FALSE,  -- prefers impact capital
  last_updated            TIMESTAMPTZ DEFAULT NOW()
);

-- ── 8. CAPITAL MATCHES (results store) ─────────────────────
CREATE TABLE IF NOT EXISTS public.capital_matches (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  capital_type        TEXT NOT NULL CHECK (capital_type IN ('funding','loan','bond','equity')),
  capital_id          UUID NOT NULL,   -- FK to relevant table
  match_score         NUMERIC NOT NULL, -- 0–100
  score_breakdown     JSONB,           -- {eligibility:40, amount_fit:25, timeline:20, complexity:15}
  match_reasons       TEXT[],          -- human-readable reasons
  disqualifiers       TEXT[],          -- why it might not work
  amount_recommended_usd NUMERIC,
  priority            TEXT CHECK (priority IN ('high','medium','low')),
  status              TEXT DEFAULT 'new' CHECK (status IN ('new','viewed','applied','rejected','saved')),
  generated_at        TIMESTAMPTZ DEFAULT NOW(),
  expires_at          TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

-- ── INDEXES ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_fundings_regions  ON public.capital_fundings USING GIN(eligible_regions);
CREATE INDEX IF NOT EXISTS idx_fundings_sectors  ON public.capital_fundings USING GIN(eligible_sectors);
CREATE INDEX IF NOT EXISTS idx_fundings_entities ON public.capital_fundings USING GIN(eligible_entity_types);
CREATE INDEX IF NOT EXISTS idx_fundings_status   ON public.capital_fundings(status);

CREATE INDEX IF NOT EXISTS idx_loans_regions     ON public.capital_loans USING GIN(eligible_regions);
CREATE INDEX IF NOT EXISTS idx_loans_sectors     ON public.capital_loans USING GIN(eligible_sectors);
CREATE INDEX IF NOT EXISTS idx_loans_entities    ON public.capital_loans USING GIN(eligible_entity_types);
CREATE INDEX IF NOT EXISTS idx_loans_rate        ON public.capital_loans(total_rate_min_pct);

CREATE INDEX IF NOT EXISTS idx_bonds_country     ON public.capital_bonds(country);
CREATE INDEX IF NOT EXISTS idx_bonds_rating      ON public.capital_bonds(credit_rating_sp);
CREATE INDEX IF NOT EXISTS idx_bonds_ytm         ON public.capital_bonds(yield_to_maturity);
CREATE INDEX IF NOT EXISTS idx_bonds_maturity    ON public.capital_bonds(maturity_date);

CREATE INDEX IF NOT EXISTS idx_equities_exchange ON public.capital_equities(exchange);
CREATE INDEX IF NOT EXISTS idx_equities_country  ON public.capital_equities(country);
CREATE INDEX IF NOT EXISTS idx_equities_sector   ON public.capital_equities(sector);
CREATE INDEX IF NOT EXISTS idx_equities_africa   ON public.capital_equities(is_africa_listed);

CREATE INDEX IF NOT EXISTS idx_matches_user      ON public.capital_matches(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_score     ON public.capital_matches(match_score DESC);
CREATE INDEX IF NOT EXISTS idx_matches_type      ON public.capital_matches(capital_type);

-- ── RLS ────────────────────────────────────────────────────
ALTER TABLE public.capital_providers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capital_reference_rates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capital_fundings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capital_loans            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capital_bonds            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capital_equities         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capital_match_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capital_matches          ENABLE ROW LEVEL SECURITY;

-- Public read for market data tables
CREATE POLICY "capital_providers_public_read"       ON public.capital_providers       FOR SELECT USING (TRUE);
CREATE POLICY "capital_rates_public_read"           ON public.capital_reference_rates FOR SELECT USING (TRUE);
CREATE POLICY "capital_fundings_public_read"        ON public.capital_fundings        FOR SELECT USING (TRUE);
CREATE POLICY "capital_loans_public_read"           ON public.capital_loans           FOR SELECT USING (TRUE);
CREATE POLICY "capital_bonds_public_read"           ON public.capital_bonds           FOR SELECT USING (TRUE);
CREATE POLICY "capital_equities_public_read"        ON public.capital_equities        FOR SELECT USING (TRUE);

-- Admin write for market data (service role only)
CREATE POLICY "capital_providers_admin_write"       ON public.capital_providers       FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "capital_rates_admin_write"           ON public.capital_reference_rates FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "capital_fundings_admin_write"        ON public.capital_fundings        FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "capital_loans_admin_write"           ON public.capital_loans           FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "capital_bonds_admin_write"           ON public.capital_bonds           FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "capital_equities_admin_write"        ON public.capital_equities        FOR ALL USING (auth.role() = 'service_role');

-- Match profiles: own row only
CREATE POLICY "match_profile_own"  ON public.capital_match_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "matches_own"        ON public.capital_matches         FOR ALL USING (auth.uid() = user_id);
