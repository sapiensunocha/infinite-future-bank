-- =============================================================================
-- CAPITAL SCHEMA V2 — adds all missing matchmaking variables to each table
-- =============================================================================

-- ── capital_fundings: missing matching variables ──────────────────────────────
ALTER TABLE public.capital_fundings
  ADD COLUMN IF NOT EXISTS typical_award_usd          NUMERIC,
  ADD COLUMN IF NOT EXISTS payment_structure           TEXT CHECK (payment_structure IN (
    'lump_sum','tranches','milestone_based','reimbursement','revolving'
  )),
  ADD COLUMN IF NOT EXISTS women_led_preference        TEXT DEFAULT 'none' CHECK (women_led_preference IN ('none','preferred','required')),
  ADD COLUMN IF NOT EXISTS youth_led_preference        TEXT DEFAULT 'none' CHECK (youth_led_preference IN ('none','preferred','required')),
  ADD COLUMN IF NOT EXISTS minority_led_preference     TEXT DEFAULT 'none' CHECK (minority_led_preference IN ('none','preferred','required')),
  ADD COLUMN IF NOT EXISTS min_team_size               INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_team_size               INTEGER,
  ADD COLUMN IF NOT EXISTS min_annual_revenue_usd      NUMERIC,
  ADD COLUMN IF NOT EXISTS max_annual_revenue_usd      NUMERIC,
  ADD COLUMN IF NOT EXISTS profitability_required      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS for_profit_eligible         BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS non_profit_eligible         BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS climate_category            TEXT CHECK (climate_category IN (
    'mitigation','adaptation','resilience','transition','nature_based','any','none'
  )),
  ADD COLUMN IF NOT EXISTS impact_framework            TEXT,
  ADD COLUMN IF NOT EXISTS sdg_focus                   INTEGER[],
  ADD COLUMN IF NOT EXISTS program_duration_months     INTEGER,
  ADD COLUMN IF NOT EXISTS cohort_frequency            TEXT,
  ADD COLUMN IF NOT EXISTS equity_stake_pct_min        NUMERIC,
  ADD COLUMN IF NOT EXISTS equity_stake_pct_max        NUMERIC,
  ADD COLUMN IF NOT EXISTS diaspora_eligible           BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reporting_frequency         TEXT,
  ADD COLUMN IF NOT EXISTS funds_use_restriction       TEXT,
  ADD COLUMN IF NOT EXISTS stage_required              TEXT[],      -- ['idea','seed','early','growth','scale']
  ADD COLUMN IF NOT EXISTS contact_email               TEXT,
  ADD COLUMN IF NOT EXISTS provider_country            TEXT;

-- ── capital_loans: missing matching variables ─────────────────────────────────
ALTER TABLE public.capital_loans
  ADD COLUMN IF NOT EXISTS effective_annual_rate_pct   NUMERIC,
  ADD COLUMN IF NOT EXISTS repayment_frequency         TEXT CHECK (repayment_frequency IN (
    'daily','weekly','bi_weekly','monthly','quarterly','semi_annual','annual','bullet'
  )),
  ADD COLUMN IF NOT EXISTS amortization_type           TEXT CHECK (amortization_type IN (
    'equal_installments','reducing_balance','bullet','interest_only','custom'
  )),
  ADD COLUMN IF NOT EXISTS late_payment_penalty_pct    NUMERIC,
  ADD COLUMN IF NOT EXISTS commitment_fee_pct          NUMERIC,
  ADD COLUMN IF NOT EXISTS early_repayment_allowed     BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS women_led_preference        TEXT DEFAULT 'none' CHECK (women_led_preference IN ('none','preferred','required')),
  ADD COLUMN IF NOT EXISTS green_loan                  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS social_loan                 BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS islamic_compliant           BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS annual_fee_pct              NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS disbursement_time_days      INTEGER,
  ADD COLUMN IF NOT EXISTS refinancing_available       BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS top_up_available            BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stage_required              TEXT[],
  ADD COLUMN IF NOT EXISTS min_employees               INTEGER,
  ADD COLUMN IF NOT EXISTS max_debt_to_equity          NUMERIC,
  ADD COLUMN IF NOT EXISTS dscr_minimum                NUMERIC,
  ADD COLUMN IF NOT EXISTS personal_guarantee_required BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS hedging_available           BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS currencies_available        TEXT[],
  ADD COLUMN IF NOT EXISTS contact_email               TEXT;

-- ── capital_bonds: missing matchmaking + analytics variables ──────────────────
ALTER TABLE public.capital_bonds
  ADD COLUMN IF NOT EXISTS coupon_frequency            TEXT DEFAULT 'semi_annual' CHECK (coupon_frequency IN (
    'annual','semi_annual','quarterly','monthly','at_maturity'
  )),
  ADD COLUMN IF NOT EXISTS day_count_convention        TEXT DEFAULT '30/360',
  ADD COLUMN IF NOT EXISTS z_spread_bps                NUMERIC,
  ADD COLUMN IF NOT EXISTS gov_spread_bps              NUMERIC,
  ADD COLUMN IF NOT EXISTS oas_bps                     NUMERIC,
  ADD COLUMN IF NOT EXISTS asset_swap_spread_bps       NUMERIC,
  ADD COLUMN IF NOT EXISTS macaulay_duration_yrs       NUMERIC,
  ADD COLUMN IF NOT EXISTS effective_duration_yrs      NUMERIC,
  ADD COLUMN IF NOT EXISTS dv01_usd                    NUMERIC,
  ADD COLUMN IF NOT EXISTS liquidity_classification    TEXT CHECK (liquidity_classification IN ('high','medium','low','illiquid')),
  ADD COLUMN IF NOT EXISTS average_daily_volume_usd    NUMERIC,
  ADD COLUMN IF NOT EXISTS eligible_investors          TEXT[],      -- ['retail','institutional','qib','sovereign_wealth']
  ADD COLUMN IF NOT EXISTS clearing_system             TEXT[],      -- ['euroclear','clearstream','dtcc','local']
  ADD COLUMN IF NOT EXISTS governing_law               TEXT,
  ADD COLUMN IF NOT EXISTS lead_managers               TEXT[],
  ADD COLUMN IF NOT EXISTS use_of_proceeds             TEXT CHECK (use_of_proceeds IN (
    'general','climate','social','infrastructure','agriculture','health','education','sdg'
  )),
  ADD COLUMN IF NOT EXISTS green_certification         TEXT CHECK (green_certification IN (
    'cbi','icma_gbp','eu_gbs','asean_gbs','none'
  )),
  ADD COLUMN IF NOT EXISTS sdg_alignment               INTEGER[],
  ADD COLUMN IF NOT EXISTS sustainability_linked       BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS step_up_penalty_bps         NUMERIC,
  ADD COLUMN IF NOT EXISTS sinking_fund                BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS perpetual                   BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS rating_outlook              TEXT CHECK (rating_outlook IN ('stable','positive','negative','watch_positive','watch_negative')),
  ADD COLUMN IF NOT EXISTS original_issue_size_usd     NUMERIC,
  ADD COLUMN IF NOT EXISTS put_date                    DATE,
  ADD COLUMN IF NOT EXISTS put_price_pct               NUMERIC,
  ADD COLUMN IF NOT EXISTS call_price_pct              NUMERIC DEFAULT 100,
  ADD COLUMN IF NOT EXISTS trustee                     TEXT,
  ADD COLUMN IF NOT EXISTS issuer_country              TEXT,
  ADD COLUMN IF NOT EXISTS bid_yield_pct               NUMERIC,
  ADD COLUMN IF NOT EXISTS ask_yield_pct               NUMERIC;

-- ── capital_equities: missing variables ───────────────────────────────────────
ALTER TABLE public.capital_equities
  ADD COLUMN IF NOT EXISTS gics_sector                 TEXT,
  ADD COLUMN IF NOT EXISTS gics_industry_group         TEXT,
  ADD COLUMN IF NOT EXISTS gics_sub_industry           TEXT,
  ADD COLUMN IF NOT EXISTS institutional_ownership_pct NUMERIC,
  ADD COLUMN IF NOT EXISTS insider_ownership_pct       NUMERIC,
  ADD COLUMN IF NOT EXISTS short_interest_pct          NUMERIC,
  ADD COLUMN IF NOT EXISTS price_change_ytd_pct        NUMERIC,
  ADD COLUMN IF NOT EXISTS revenue_growth_yoy_pct      NUMERIC,
  ADD COLUMN IF NOT EXISTS free_cash_flow_usd          NUMERIC,
  ADD COLUMN IF NOT EXISTS net_debt_usd                NUMERIC,
  ADD COLUMN IF NOT EXISTS roic_pct                    NUMERIC,
  ADD COLUMN IF NOT EXISTS current_ratio               NUMERIC,
  ADD COLUMN IF NOT EXISTS interest_coverage_ratio     NUMERIC,
  ADD COLUMN IF NOT EXISTS sharpe_ratio_1yr            NUMERIC,
  ADD COLUMN IF NOT EXISTS rsi_14d                     NUMERIC,
  ADD COLUMN IF NOT EXISTS ma_50d                      NUMERIC,
  ADD COLUMN IF NOT EXISTS ma_200d                     NUMERIC,
  ADD COLUMN IF NOT EXISTS etf_num_holdings            INTEGER,
  ADD COLUMN IF NOT EXISTS etf_geographic_exposure     JSONB,       -- {"South Africa": 35, "Nigeria": 18, ...}
  ADD COLUMN IF NOT EXISTS etf_sector_exposure         JSONB,       -- {"Financials": 30, "Telecoms": 22, ...}
  ADD COLUMN IF NOT EXISTS etf_top_holdings            JSONB,       -- [{"name":"Naspers","weight":12.5}, ...]
  ADD COLUMN IF NOT EXISTS etf_premium_discount_pct    NUMERIC,
  ADD COLUMN IF NOT EXISTS etf_tracking_error_pct      NUMERIC,
  ADD COLUMN IF NOT EXISTS etf_dividend_policy         TEXT CHECK (etf_dividend_policy IN ('accumulating','distributing')),
  ADD COLUMN IF NOT EXISTS etf_replication_method      TEXT CHECK (etf_replication_method IN ('physical_full','physical_optimized','synthetic_swap')),
  ADD COLUMN IF NOT EXISTS is_impact_investment        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS impact_theme                TEXT,        -- 'financial_inclusion','clean_energy','gender_lens'
  ADD COLUMN IF NOT EXISTS min_investment_usd          NUMERIC DEFAULT 1,
  ADD COLUMN IF NOT EXISTS payout_ratio_pct            NUMERIC,
  ADD COLUMN IF NOT EXISTS next_earnings_date          DATE,
  ADD COLUMN IF NOT EXISTS adr_ratio                   NUMERIC;     -- for ADRs: shares per ADR

-- ── capital_match_profiles: additional fields for better matching ─────────────
ALTER TABLE public.capital_match_profiles
  ADD COLUMN IF NOT EXISTS company_stage               TEXT CHECK (company_stage IN ('idea','seed','early','growth','scale','mature')),
  ADD COLUMN IF NOT EXISTS employees_count             INTEGER,
  ADD COLUMN IF NOT EXISTS is_women_led                BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_youth_led                BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_impact_focused           BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS climate_sector              BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_co_funding              BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS co_funding_amount_usd       NUMERIC,
  ADD COLUMN IF NOT EXISTS languages_spoken            TEXT[] DEFAULT ARRAY['English'],
  ADD COLUMN IF NOT EXISTS investor_risk_appetite      TEXT CHECK (investor_risk_appetite IN ('conservative','moderate','aggressive')),
  ADD COLUMN IF NOT EXISTS preferred_tenor_months      INTEGER,
  ADD COLUMN IF NOT EXISTS diaspora_status             BOOLEAN DEFAULT FALSE;

-- ── Indexes for new columns ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_fundings_women     ON public.capital_fundings(women_led_preference);
CREATE INDEX IF NOT EXISTS idx_fundings_climate   ON public.capital_fundings(climate_category);
CREATE INDEX IF NOT EXISTS idx_loans_green        ON public.capital_loans(green_loan);
CREATE INDEX IF NOT EXISTS idx_bonds_green_cert   ON public.capital_bonds(green_certification);
CREATE INDEX IF NOT EXISTS idx_bonds_issuer_ctry  ON public.capital_bonds(issuer_country);
CREATE INDEX IF NOT EXISTS idx_equities_gics      ON public.capital_equities(gics_sector);
CREATE INDEX IF NOT EXISTS idx_equities_impact    ON public.capital_equities(is_impact_investment);
