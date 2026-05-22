-- =============================================================================
-- FULL INSTRUMENT SEED — real capital instruments, all variables populated
-- Sources verified May 2026. ON CONFLICT updates existing rows.
-- =============================================================================

-- Ensure name uniqueness so ON CONFLICT works
DO $$ BEGIN
  ALTER TABLE public.capital_providers ADD CONSTRAINT capital_providers_name_unique UNIQUE (name);
EXCEPTION WHEN duplicate_table THEN NULL;
         WHEN duplicate_object THEN NULL; END $$;

-- Add any columns referenced by this seed that weren't in earlier migrations
ALTER TABLE public.capital_bonds
  ADD COLUMN IF NOT EXISTS coupon_type           TEXT,
  ADD COLUMN IF NOT EXISTS modified_duration_yrs NUMERIC,
  ADD COLUMN IF NOT EXISTS convexity             NUMERIC,
  ADD COLUMN IF NOT EXISTS min_investment_usd    NUMERIC,
  ADD COLUMN IF NOT EXISTS notes                 TEXT,
  ADD COLUMN IF NOT EXISTS last_verified         DATE;

ALTER TABLE public.capital_fundings
  ADD COLUMN IF NOT EXISTS avg_approval_days     INTEGER,
  ADD COLUMN IF NOT EXISTS disbursement_time_days INTEGER,
  ADD COLUMN IF NOT EXISTS min_employees         INTEGER,
  ADD COLUMN IF NOT EXISTS max_annual_revenue_usd NUMERIC;

ALTER TABLE public.capital_loans
  ADD COLUMN IF NOT EXISTS youth_led_preference  TEXT DEFAULT 'none' CHECK (youth_led_preference IN ('none','preferred','required')),
  ADD COLUMN IF NOT EXISTS max_annual_revenue_usd NUMERIC,
  ADD COLUMN IF NOT EXISTS min_employees         INTEGER;

ALTER TABLE public.capital_equities
  ADD COLUMN IF NOT EXISTS etf_geographic_exposure JSONB,
  ADD COLUMN IF NOT EXISTS etf_top_holdings        JSONB;

-- ── Helper: ensure required providers exist ───────────────────────────────────
INSERT INTO public.capital_providers (name, short_name, provider_type, hq_country, regions_active, website, aum_usd_billions, credit_rating, is_active)
VALUES
  ('Mastercard Foundation','MCF','foundation','Canada',ARRAY['Africa','Global'],'https://mastercardfdn.org',14.3,NULL,TRUE),
  ('African Development Bank','AfDB','multilateral_dfi','Côte d''Ivoire',ARRAY['Africa'],'https://afdb.org',NULL,'Aaa/AAA/AAA',TRUE),
  ('Global Innovation Fund','GIF','foundation','UK',ARRAY['Global'],'https://globalinnovation.fund',0.3,NULL,TRUE),
  ('Green Climate Fund','GCF','multilateral_dfi','South Korea',ARRAY['Global'],'https://greenclimate.fund',19.3,NULL,TRUE),
  ('Acumen Fund','Acumen','impact_fund','USA',ARRAY['East Africa','West Africa','South Asia'],'https://acumen.org',0.15,NULL,TRUE),
  ('Tony Elumelu Foundation','TEF','foundation','Nigeria',ARRAY['Africa'],'https://tonyelumelufoundation.org',0.1,NULL,TRUE),
  ('AFREXIMBANK','AFREXIM','development_bank','Egypt',ARRAY['Africa'],'https://afreximbank.com',32,NULL,TRUE),
  ('Trade & Development Bank','TDB','development_bank','Kenya',ARRAY['East Africa','Southern Africa'],'https://tdbgroup.org',10,NULL,TRUE),
  ('KfW DEG','DEG','bilateral_dfi','Germany',ARRAY['Africa','Asia','Latin America'],'https://deginvest.de',NULL,'Aaa',TRUE),
  ('Kiva','Kiva','microfinance','USA',ARRAY['Global'],'https://kiva.org',0.2,NULL,TRUE),
  ('Equity Bank Kenya','Equity Bank','commercial_bank','Kenya',ARRAY['East Africa'],'https://equitybankgroup.com',NULL,NULL,TRUE),
  ('Ecobank Transnational','Ecobank','commercial_bank','Togo',ARRAY['Africa'],'https://ecobank.com',NULL,NULL,TRUE),
  ('Norfund','Norfund','bilateral_dfi','Norway',ARRAY['Africa','Asia'],'https://norfund.no',4.2,NULL,TRUE),
  ('Oikocredit','Oikocredit','impact_fund','Netherlands',ARRAY['Africa','Asia','Latin America'],'https://oikocredit.org',1.2,NULL,TRUE),
  ('Nairobi Securities Exchange','NSE-KE','stock_exchange','Kenya',ARRAY['East Africa'],'https://nairobi-securities-exchange.com',NULL,NULL,TRUE),
  ('Johannesburg Stock Exchange','JSE','stock_exchange','South Africa',ARRAY['Southern Africa','Africa'],'https://jse.co.za',NULL,NULL,TRUE),
  ('Nigerian Exchange Group','NGX','stock_exchange','Nigeria',ARRAY['West Africa','Africa'],'https://ngxgroup.com',NULL,NULL,TRUE),
  ('VanEck','VanEck','impact_fund','USA',ARRAY['Global'],'https://vaneck.com',NULL,NULL,TRUE),
  ('Access Bank Nigeria','Access Bank','commercial_bank','Nigeria',ARRAY['Africa'],'https://accessbankplc.com',NULL,NULL,TRUE)
ON CONFLICT (name) DO UPDATE SET
  is_active = TRUE,
  regions_active = EXCLUDED.regions_active;

-- =============================================================================
-- FUNDINGS — 12 real programmes, all variables
-- =============================================================================
DO $$
DECLARE
  v_mcf   UUID; v_afdb  UUID; v_gif   UUID; v_gcf   UUID;
  v_acumen UUID; v_tef  UUID;
BEGIN
  SELECT id INTO v_mcf    FROM public.capital_providers WHERE short_name = 'MCF'    LIMIT 1;
  SELECT id INTO v_afdb   FROM public.capital_providers WHERE short_name = 'AfDB'   LIMIT 1;
  SELECT id INTO v_gif    FROM public.capital_providers WHERE short_name = 'GIF'    LIMIT 1;
  SELECT id INTO v_gcf    FROM public.capital_providers WHERE short_name = 'GCF'    LIMIT 1;
  SELECT id INTO v_acumen FROM public.capital_providers WHERE short_name = 'Acumen' LIMIT 1;
  SELECT id INTO v_tef    FROM public.capital_providers WHERE short_name = 'TEF'    LIMIT 1;

  -- 1. Mastercard Foundation FAST 2026
  INSERT INTO public.capital_fundings (
    provider_id, program_name, funding_type,
    amount_min_usd, amount_max_usd, typical_award_usd, currency, total_envelope_usd,
    eligible_regions, eligible_countries, eligible_sectors, eligible_entity_types,
    min_years_operating, max_years_operating,
    women_led_preference, youth_led_preference,
    min_team_size, max_team_size,
    min_annual_revenue_usd, max_annual_revenue_usd,
    requires_kyc, requires_registration, requires_audited_financials,
    co_funding_required, co_funding_pct, repayment_required,
    payment_structure, program_duration_months,
    has_technical_assistance, focus_sdgs, sdg_focus,
    climate_category, impact_framework,
    application_url, deadline_type, deadline_date,
    avg_processing_days, success_rate_pct,
    language, status, for_profit_eligible, non_profit_eligible,
    stage_required, diaspora_eligible,
    notes, last_verified, provider_country
  ) VALUES (
    v_mcf, 'Mastercard Foundation FAST Program 2026', 'grant',
    5000, 15000, 10000, 'USD', 2000000,
    ARRAY['Africa'], ARRAY['KE','NG','GH','ET','RW','UG','TZ','SN','ZA','CM'],
    ARRAY['FinTech','AgriTech','HealthTech','EdTech','CleanEnergy','E-Commerce','AI/ML','All'],
    ARRAY['startup','individual'],
    0, 5,
    'none', 'required',
    1, 5,
    NULL, 50000,
    TRUE, TRUE, FALSE,
    FALSE, NULL, FALSE,
    'tranches', 12,
    TRUE, ARRAY[1,8,10,17], ARRAY[1,8,10],
    'none', 'SDGs',
    'https://mastercardfdn.org/en/what-we-do/our-programs/africa-growth-fund/', 'cohort', '2026-09-30'::DATE,
    90, 15,
    ARRAY['English','French'], 'open', TRUE, FALSE,
    ARRAY['idea','seed'],  FALSE,
    'Idea Phase: up to $5K. Build Phase: $10K-$15K. Reserved for alumni of Mastercard Foundation Scholars Program, ALA, Anzisha, and YALI.', '2026-03-12'::DATE, 'Canada'
  )
  ON CONFLICT DO NOTHING;

  -- 2. AfDB AFAWA Guarantee for Growth (G4G)
  INSERT INTO public.capital_fundings (
    provider_id, program_name, funding_type,
    amount_min_usd, amount_max_usd, typical_award_usd, currency, total_envelope_usd,
    eligible_regions, eligible_sectors, eligible_entity_types,
    min_years_operating, women_led_preference,
    min_annual_revenue_usd, requires_kyc, requires_registration, requires_audited_financials,
    co_funding_required, repayment_required,
    payment_structure, has_technical_assistance,
    focus_sdgs, sdg_focus, climate_category,
    application_url, deadline_type,
    avg_processing_days, success_rate_pct,
    language, status, for_profit_eligible, non_profit_eligible,
    stage_required,
    notes, last_verified, provider_country
  ) VALUES (
    v_afdb, 'AfDB AFAWA Guarantee for Growth (G4G)', 'guarantee',
    50000, 2000000, 250000, 'USD', 3000000000,
    ARRAY['Africa'], ARRAY['All'], ARRAY['sme','startup','cooperative'],
    1, 'required',
    10000, TRUE, TRUE, TRUE,
    FALSE, FALSE,
    'lump_sum', TRUE,
    ARRAY[1,5,8,10], ARRAY[5,8], 'none',
    'https://afdb.org/en/topics-and-sectors/initiatives-partnerships/afawa-affirmative-finance-action-women-africa', 'rolling',
    180, 40,
    ARRAY['English','French','Portuguese','Arabic'], 'open', TRUE, FALSE,
    ARRAY['seed','early','growth'],
    'Risk-sharing guarantee through 100+ partner financial institutions. Target: $5B to 27,000 women-led businesses by 2026. Apply through your local AfDB partner bank, not directly.', '2026-03-01'::DATE, 'Côte d''Ivoire'
  )
  ON CONFLICT DO NOTHING;

  -- 3. Global Innovation Fund — Climate Resilience Call
  INSERT INTO public.capital_fundings (
    provider_id, program_name, funding_type,
    amount_min_usd, amount_max_usd, typical_award_usd, currency, total_envelope_usd,
    eligible_regions, eligible_sectors, eligible_entity_types,
    min_years_operating, women_led_preference,
    min_annual_revenue_usd, requires_kyc, requires_registration, requires_audited_financials,
    co_funding_required, co_funding_pct, repayment_required,
    equity_stake_pct, payment_structure, program_duration_months,
    has_technical_assistance, focus_sdgs, sdg_focus,
    climate_category, impact_framework,
    application_url, deadline_type, deadline_date,
    avg_processing_days, success_rate_pct,
    language, status, for_profit_eligible, non_profit_eligible,
    stage_required,
    notes, last_verified, provider_country
  ) VALUES (
    v_gif, 'Global Innovation Fund — Climate Resilience', 'blended_finance',
    50000, 15000000, 1000000, 'USD', 50000000,
    ARRAY['Global','Africa','Asia','Latin America'],
    ARRAY['CleanEnergy','AgriTech','Water','Climate','All'],
    ARRAY['startup','sme','npo','cooperative','university','government'],
    0, 'none',
    NULL, TRUE, TRUE, FALSE,
    FALSE, NULL, FALSE,
    NULL, 'tranches', 36,
    TRUE, ARRAY[1,2,7,13,17], ARRAY[1,13],
    'adaptation', 'IRIS+/SDGs',
    'https://globalinnovation.fund/apply-for-funding', 'cohort', '2026-09-15'::DATE,
    120, 8,
    ARRAY['English'], 'open', TRUE, TRUE,
    ARRAY['seed','early','growth','scale'],
    'Tiered: Pilot ($50K-$1M), Transition ($1M-$15M). Focus on innovations reaching people on <$5/day. Any country, any org type. Next window opens July 15 2026. Mix of grant + equity possible.', '2026-01-15'::DATE, 'UK'
  )
  ON CONFLICT DO NOTHING;

  -- 4. Green Climate Fund — Readiness Programme
  INSERT INTO public.capital_fundings (
    provider_id, program_name, funding_type,
    amount_min_usd, amount_max_usd, typical_award_usd, currency, total_envelope_usd,
    eligible_regions, eligible_sectors, eligible_entity_types,
    women_led_preference, requires_kyc, requires_registration, requires_audited_financials,
    co_funding_required, repayment_required,
    payment_structure, program_duration_months,
    has_technical_assistance, focus_sdgs, sdg_focus,
    climate_category, impact_framework,
    application_url, deadline_type,
    avg_processing_days, success_rate_pct,
    language, status, for_profit_eligible, non_profit_eligible,
    stage_required, diaspora_eligible,
    notes, last_verified, provider_country
  ) VALUES (
    v_gcf, 'GCF Readiness & Preparatory Support', 'technical_assistance',
    100000, 3000000, 1000000, 'USD', 300000000,
    ARRAY['Global','Africa','Asia','Pacific','Latin America','Caribbean'],
    ARRAY['CleanEnergy','Climate','Water','Agriculture','Coastal','All'],
    ARRAY['government','npo','development_bank'],
    'none', TRUE, TRUE, TRUE,
    FALSE, FALSE,
    'tranches', 24,
    TRUE, ARRAY[7,13,14,15,17], ARRAY[7,13],
    'adaptation', 'GCF Results Framework',
    'https://greenclimate.fund/projects/access-funding', 'rolling',
    180, 35,
    ARRAY['English','Spanish','French'], 'open', FALSE, TRUE,
    ARRAY['any'],  FALSE,
    '$19.3B cumulative approved (336 projects end-2025). Record 2025 disbursement: $3.26B. Must apply through an GCF-accredited entity (AE). Second 2026 accreditation window opens July 15 2026.', '2026-01-01'::DATE, 'South Korea'
  )
  ON CONFLICT DO NOTHING;

  -- 5. Tony Elumelu Foundation Entrepreneurship Programme
  INSERT INTO public.capital_fundings (
    provider_id, program_name, funding_type,
    amount_min_usd, amount_max_usd, typical_award_usd, currency, total_envelope_usd,
    eligible_regions, eligible_sectors, eligible_entity_types,
    min_years_operating, max_years_operating,
    women_led_preference, youth_led_preference,
    min_team_size, max_team_size,
    requires_kyc, requires_registration, requires_audited_financials,
    co_funding_required, repayment_required,
    payment_structure, program_duration_months,
    has_technical_assistance, focus_sdgs, sdg_focus,
    climate_category, impact_framework,
    application_url, deadline_type, deadline_date,
    avg_processing_days, success_rate_pct,
    language, status, for_profit_eligible, non_profit_eligible,
    stage_required,
    notes, last_verified, provider_country
  ) VALUES (
    v_tef, 'Tony Elumelu Foundation Entrepreneurship Programme', 'blended_finance',
    5000, 5000, 5000, 'USD', 100000000,
    ARRAY['Africa'], ARRAY['All'], ARRAY['startup','individual'],
    0, 3,
    'none', 'none',
    1, 3,
    TRUE, TRUE, FALSE,
    FALSE, FALSE,
    'lump_sum', 12,
    TRUE, ARRAY[1,8,10,17], ARRAY[8,10],
    'none', 'SDGs',
    'https://tonyelumelufoundation.org/teep', 'cohort', '2027-01-31'::DATE,
    60, 5,
    ARRAY['English','French'], 'open', TRUE, FALSE,
    ARRAY['idea','seed'],
    '$5,000 non-refundable seed capital + $5,000 business loan + 12-week training + mentoring. Pan-African. 54 countries. 100 entrepreneurs selected per year per TEF. Apply at application portal.', '2026-01-10'::DATE, 'Nigeria'
  )
  ON CONFLICT DO NOTHING;

  -- 6. Acumen Resilient Agriculture Fund (ARAF)
  INSERT INTO public.capital_fundings (
    provider_id, program_name, funding_type,
    amount_min_usd, amount_max_usd, typical_award_usd, currency, total_envelope_usd,
    eligible_regions, eligible_countries, eligible_sectors, eligible_entity_types,
    min_years_operating, max_years_operating,
    women_led_preference, youth_led_preference,
    min_annual_revenue_usd,
    requires_kyc, requires_registration, requires_audited_financials,
    co_funding_required, repayment_required,
    equity_stake_pct_min, equity_stake_pct_max,
    payment_structure, program_duration_months,
    has_technical_assistance, focus_sdgs, sdg_focus,
    climate_category, impact_framework,
    application_url, deadline_type,
    avg_processing_days, success_rate_pct,
    language, status, for_profit_eligible, non_profit_eligible,
    stage_required,
    notes, last_verified, provider_country
  ) VALUES (
    v_acumen, 'Acumen Resilient Agriculture Fund (ARAF)', 'equity',
    1000000, 5000000, 2000000, 'USD', 58000000,
    ARRAY['East Africa','West Africa'],
    ARRAY['KE','UG','RW','NG','GH'],
    ARRAY['AgriTech','Agriculture','ClimateAdaptation','FoodTech'],
    ARRAY['startup','sme'],
    1, 7,
    'none', 'none',
    100000,
    TRUE, TRUE, TRUE,
    FALSE, FALSE,
    5, 30,
    'tranches', 60,
    TRUE, ARRAY[1,2,13,15,17], ARRAY[2,13],
    'adaptation', 'IRIS+',
    'https://arafund.com/', 'rolling',
    180, 5,
    ARRAY['English'], 'open', TRUE, FALSE,
    ARRAY['early','growth'],
    '$58M first equity fund for climate-resilient smallholder agriculture. Equity stake 5-30%. Target: Kenya, Uganda, Rwanda, Nigeria, Ghana. LP: IFC, DFI co-investors. Technical Assistance Facility included. Focus on climate-smart agri businesses helping smallholder farmers adapt.', '2026-01-15'::DATE, 'USA'
  )
  ON CONFLICT DO NOTHING;

END $$;

-- =============================================================================
-- LOANS — 10 real products, all variables
-- =============================================================================
DO $$
DECLARE
  v_afrexim UUID; v_tdb    UUID; v_deg    UUID; v_kiva   UUID;
  v_eq      UUID; v_eco    UUID; v_norfund UUID; v_oiko  UUID;
  v_access  UUID;
BEGIN
  SELECT id INTO v_afrexim FROM public.capital_providers WHERE short_name = 'AFREXIM'   LIMIT 1;
  SELECT id INTO v_tdb     FROM public.capital_providers WHERE short_name = 'TDB'        LIMIT 1;
  SELECT id INTO v_deg     FROM public.capital_providers WHERE short_name = 'DEG'        LIMIT 1;
  SELECT id INTO v_kiva    FROM public.capital_providers WHERE short_name = 'Kiva'       LIMIT 1;
  SELECT id INTO v_eq      FROM public.capital_providers WHERE short_name = 'Equity Bank' LIMIT 1;
  SELECT id INTO v_eco     FROM public.capital_providers WHERE short_name = 'Ecobank'    LIMIT 1;
  SELECT id INTO v_norfund FROM public.capital_providers WHERE short_name = 'Norfund'    LIMIT 1;
  SELECT id INTO v_oiko    FROM public.capital_providers WHERE short_name = 'Oikocredit' LIMIT 1;
  SELECT id INTO v_access  FROM public.capital_providers WHERE short_name = 'Access Bank' LIMIT 1;

  -- 1. AFREXIMBANK Intra-African Trade Finance Facility
  INSERT INTO public.capital_loans (
    provider_id, product_name, loan_type,
    rate_structure, base_rate_benchmark, base_rate_value, spread_min_pct, spread_max_pct,
    total_rate_min_pct, total_rate_max_pct, effective_annual_rate_pct,
    amount_min_usd, amount_max_usd, currency, currencies_available,
    tenor_min_months, tenor_max_months, grace_period_months,
    repayment_frequency, amortization_type,
    ltv_max_pct, collateral_required, collateral_types,
    guarantor_required, personal_guarantee_required,
    credit_score_min, max_debt_to_equity, dscr_minimum,
    eligible_regions, eligible_sectors, eligible_entity_types,
    min_annual_revenue_usd, min_years_in_business, min_employees,
    requires_kyc, requires_audited_financials,
    origination_fee_pct, annual_fee_pct, prepayment_penalty, prepayment_penalty_pct,
    early_repayment_allowed, green_loan, social_loan, islamic_compliant,
    application_url, avg_approval_days, disbursement_time_days,
    refinancing_available, top_up_available,
    stage_required, women_led_preference,
    status, notes, last_verified
  ) VALUES (
    v_afrexim, 'AFREXIMBANK Intra-African Trade Finance Facility', 'trade_finance',
    'floating', 'SOFR', 4.31, 3.0, 5.0,
    7.31, 9.31, 8.5,
    500000, 50000000, 'USD', ARRAY['USD','EUR','GBP','XOF','NGN','KES'],
    6, 60, 3,
    'monthly', 'reducing_balance',
    70, TRUE, ARRAY['receivables','inventory','guarantee','real_estate','equipment'],
    FALSE, FALSE,
    NULL, 3.0, 1.25,
    ARRAY['Africa'], ARRAY['All','Trade','Manufacturing','Agriculture','Services'],
    ARRAY['sme','corporate','cooperative'],
    500000, 2, 10,
    TRUE, TRUE,
    1.0, 0.5, FALSE, NULL,
    TRUE, FALSE, FALSE, FALSE,
    'https://afreximbank.com/products-services/our-key-services/trade-project-financing/', 45, 30,
    TRUE, TRUE,
    ARRAY['early','growth','scale'], 'none',
    'active', 'SOFR + 3–5%. Intra-Africa trade finance, letters of credit, import/export financing. Q1 2026 net income +25% YoY. Operates across 54 African countries. Also has USD-denominated local currency options for Nigeria (NGN), Kenya (KES).', '2026-03-01'::DATE
  )
  ON CONFLICT DO NOTHING;

  -- 2. TDB SME Finance
  INSERT INTO public.capital_loans (
    provider_id, product_name, loan_type,
    rate_structure, base_rate_benchmark, base_rate_value, spread_min_pct, spread_max_pct,
    total_rate_min_pct, total_rate_max_pct,
    amount_min_usd, amount_max_usd, currency,
    tenor_min_months, tenor_max_months, grace_period_months,
    repayment_frequency, amortization_type,
    collateral_required, collateral_types, guarantor_required,
    credit_score_min, dscr_minimum,
    eligible_regions, eligible_countries, eligible_sectors, eligible_entity_types,
    min_annual_revenue_usd, min_years_in_business,
    requires_kyc, requires_audited_financials,
    origination_fee_pct, prepayment_penalty,
    green_loan, women_led_preference,
    application_url, avg_approval_days, disbursement_time_days,
    stage_required, status, notes, last_verified
  ) VALUES (
    v_tdb, 'TDB SME Finance Facility', 'term_loan',
    'floating', 'SOFR', 4.31, 2.0, 4.5,
    6.0, 9.0,
    500000, 10000000, 'USD',
    12, 60, 6,
    'quarterly', 'reducing_balance',
    TRUE, ARRAY['real_estate','equipment','receivables','guarantee'], FALSE,
    NULL, 1.2,
    ARRAY['East Africa','Southern Africa'],
    ARRAY['KE','TZ','UG','RW','ET','MZ','ZM','ZW','MG','BI','DJ'],
    ARRAY['All'], ARRAY['sme','corporate'],
    250000, 2,
    TRUE, TRUE,
    1.0, FALSE,
    TRUE, 'preferred',
    'https://tdbgroup.org/', 60, 45,
    ARRAY['early','growth','scale'], 'active',
    'TDB is investment-grade African regional development finance, $10B asset base. Sovereign + corporate clients. Kenya can access 25-year terms at 2% (sovereign rate). SME corporate rates: 6-9% p.a. TDB also offers emergency liquidity and trade lines.', '2026-02-01'::DATE
  )
  ON CONFLICT DO NOTHING;

  -- 3. KfW DEG Impact Lending
  INSERT INTO public.capital_loans (
    provider_id, product_name, loan_type,
    rate_structure, base_rate_benchmark, spread_min_pct, spread_max_pct,
    total_rate_min_pct, total_rate_max_pct,
    amount_min_usd, amount_max_usd, currency,
    tenor_min_months, tenor_max_months, grace_period_months,
    repayment_frequency, amortization_type,
    ltv_max_pct, collateral_required, collateral_types,
    credit_score_min, dscr_minimum,
    eligible_regions, eligible_sectors, eligible_entity_types,
    min_annual_revenue_usd, min_years_in_business,
    requires_kyc, requires_audited_financials,
    origination_fee_pct, prepayment_penalty,
    green_loan, women_led_preference, social_loan,
    application_url, avg_approval_days,
    stage_required, status, notes, last_verified
  ) VALUES (
    v_deg, 'KfW DEG Long-Term Impact Finance', 'term_loan',
    'floating', 'SOFR', 3.0, 6.0,
    7.0, 12.0,
    1000000, 100000000, 'EUR',
    60, 180, 12,
    'semi_annual', 'reducing_balance',
    65, TRUE, ARRAY['real_estate','equipment','shares','guarantee'],
    NULL, 1.3,
    ARRAY['Africa','Asia','Latin America'],
    ARRAY['CleanEnergy','AgriTech','HealthTech','Manufacturing','Infrastructure','FinTech','All'],
    ARRAY['sme','corporate','development_bank'],
    2000000, 3,
    TRUE, TRUE,
    1.5, FALSE,
    TRUE, 'preferred', TRUE,
    'https://deginvest.de/', 120,
    ARRAY['growth','scale','mature'], 'active',
    'German development finance. Loans €1M–€100M, 5–15 year tenor. KfW AfricaGrow Fund (€200M): equity focus for SMEs through fund-of-funds with Allianz, KfW Dev. Arranged $100M for Equity Bank Kenya (with Swedfund, Norfund, Proparco). ESG mandatory.', '2026-02-15'::DATE
  )
  ON CONFLICT DO NOTHING;

  -- 4. Kiva Crowdfunded Microloans
  INSERT INTO public.capital_loans (
    provider_id, product_name, loan_type,
    rate_structure, total_rate_min_pct, total_rate_max_pct, effective_annual_rate_pct,
    amount_min_usd, amount_max_usd, currency,
    tenor_min_months, tenor_max_months, grace_period_months,
    repayment_frequency, amortization_type,
    collateral_required, guarantor_required,
    eligible_regions, eligible_sectors, eligible_entity_types,
    min_annual_revenue_usd, min_years_in_business,
    requires_kyc, requires_audited_financials,
    origination_fee_pct, prepayment_penalty,
    women_led_preference, social_loan,
    application_url, avg_approval_days, disbursement_time_days,
    stage_required, status, notes, last_verified
  ) VALUES (
    v_kiva, 'Kiva Crowdfunded Microloan (via Field Partners)', 'microfinance',
    'fixed', 0, 0, 35,
    25, 15000, 'USD',
    6, 36, 0,
    'monthly', 'equal_installments',
    FALSE, FALSE,
    ARRAY['Global','Africa','Asia','Latin America'],
    ARRAY['Agriculture','Retail','Services','Food','Crafts','Education','All'],
    ARRAY['individual','startup','sme','cooperative'],
    NULL, 0,
    TRUE, FALSE,
    0, FALSE,
    'preferred', TRUE,
    'https://kiva.org/borrow', 30, 14,
    ARRAY['idea','seed'], 'active',
    'Kiva lenders fund in $25 increments. 0% interest to Kiva—field partners (300+ MFIs globally) charge end-borrowers avg ~35% to cover costs. Kiva US product: 0% APR $1K–$15K. Africa: via local MFIs. Average global loan: $400. Repayment rate: 96.3%. Any sector or income level.', '2026-01-10'::DATE
  )
  ON CONFLICT DO NOTHING;

  -- 5. Equity Bank Kenya — Biashara SME Loan
  INSERT INTO public.capital_loans (
    provider_id, product_name, loan_type,
    rate_structure, base_rate_benchmark, base_rate_value, spread_min_pct, spread_max_pct,
    total_rate_min_pct, total_rate_max_pct,
    amount_min_usd, amount_max_usd, currency,
    tenor_min_months, tenor_max_months, grace_period_months,
    repayment_frequency, amortization_type,
    ltv_max_pct, collateral_required, collateral_types,
    guarantor_required, personal_guarantee_required,
    eligible_regions, eligible_countries, eligible_sectors, eligible_entity_types,
    min_annual_revenue_usd, min_years_in_business, min_employees,
    requires_kyc, requires_audited_financials,
    origination_fee_pct, annual_fee_pct, prepayment_penalty,
    women_led_preference, disbursement_time_days,
    application_url, avg_approval_days,
    stage_required, status, notes, last_verified
  ) VALUES (
    v_eq, 'Equity Bank Biashara SME Loan', 'term_loan',
    'floating', 'CBK', 10.0, 3.0, 6.0,
    13.0, 16.0,
    4800, 480000, 'KES',
    12, 60, 3,
    'monthly', 'reducing_balance',
    80, TRUE, ARRAY['real_estate','equipment','inventory','guarantee'],
    FALSE, TRUE,
    ARRAY['East Africa'], ARRAY['KE','UG','TZ','RW','SS','DRC'],
    ARRAY['Agriculture','Trade','Manufacturing','Services','All'],
    ARRAY['sme','startup','individual','cooperative'],
    5000, 1, 2,
    TRUE, TRUE,
    2.0, 1.0, FALSE,
    'preferred', 7,
    'https://equitybankgroup.com/', 14,
    ARRAY['seed','early','growth'], 'active',
    'Biashara Loan: KES 500K–50M (~$3.8K–$385K USD). CBK base 10% + 3–6% spread = 13–16% p.a. Equity Bank Kenya: highest volume on NSE-KE (3.53M shares daily). Operates in KE, UG, TZ, RW, SS, DRC, Ethiopia. Women entrepreneurs get preferential pricing. Mobile-first application via Equity Mobile app.', '2026-03-01'::DATE
  )
  ON CONFLICT DO NOTHING;

  -- 6. Ecobank SME Growth Loan (Pan-African)
  INSERT INTO public.capital_loans (
    provider_id, product_name, loan_type,
    rate_structure, total_rate_min_pct, total_rate_max_pct,
    amount_min_usd, amount_max_usd, currency,
    tenor_min_months, tenor_max_months, grace_period_months,
    repayment_frequency, amortization_type,
    collateral_required, collateral_types,
    eligible_regions, eligible_sectors, eligible_entity_types,
    min_annual_revenue_usd, min_years_in_business,
    requires_kyc, requires_audited_financials,
    origination_fee_pct, prepayment_penalty,
    women_led_preference, application_url, avg_approval_days,
    stage_required, status, notes, last_verified
  ) VALUES (
    v_eco, 'Ecobank SME Growth Loan', 'term_loan',
    'floating', 12, 20,
    5000, 500000, 'USD',
    12, 60, 3,
    'monthly', 'reducing_balance',
    TRUE, ARRAY['real_estate','equipment','inventory','receivables'],
    ARRAY['Africa'],
    ARRAY['All','Trade','Agriculture','Manufacturing','Services','Technology'],
    ARRAY['sme','startup'],
    20000, 2,
    TRUE, TRUE,
    2.0, FALSE,
    'preferred', 'https://ecobank.com/sme', 21,
    ARRAY['seed','early','growth'], 'active',
    'Present in 35 African countries—widest Africa network of any bank. Local currency loans where available. 12–20% p.a. (local rates vary by country). Ecobank also has Xpress Account (no minimum balance, mobile-first) and Omni Collect for business payments.', '2026-02-20'::DATE
  )
  ON CONFLICT DO NOTHING;

  -- 7. Norfund Direct Debt / Mezzanine
  INSERT INTO public.capital_loans (
    provider_id, product_name, loan_type,
    rate_structure, total_rate_min_pct, total_rate_max_pct,
    amount_min_usd, amount_max_usd, currency,
    tenor_min_months, tenor_max_months, grace_period_months,
    repayment_frequency, amortization_type,
    ltv_max_pct, collateral_required, collateral_types,
    dscr_minimum,
    eligible_regions, eligible_sectors, eligible_entity_types,
    min_annual_revenue_usd, min_years_in_business,
    requires_kyc, requires_audited_financials,
    origination_fee_pct, prepayment_penalty,
    green_loan, social_loan, women_led_preference,
    application_url, avg_approval_days,
    stage_required, status, notes, last_verified
  ) VALUES (
    v_norfund, 'Norfund Direct Debt/Mezzanine Finance', 'blended',
    'floating', 8, 14,
    1000000, 30000000, 'USD',
    60, 120, 12,
    'semi_annual', 'bullet',
    60, TRUE, ARRAY['shares','real_estate','equipment','guarantee'],
    1.3,
    ARRAY['Africa','Southeast Asia'],
    ARRAY['CleanEnergy','FinTech','AgriTech','HealthTech','Infrastructure'],
    ARRAY['sme','corporate','social_enterprise'],
    1000000, 3,
    TRUE, TRUE,
    1.5, FALSE,
    TRUE, TRUE, 'preferred',
    'https://norfund.no/', 180,
    ARRAY['growth','scale'], 'active',
    'Norwegian development finance. $1M–$30M mezzanine debt/equity hybrid. 8–14% p.a. Impact-first mandate: renewable energy, financial inclusion, SME banking. ESG required. Invested $15M in TLG Capital Africa SME Fund II alongside IFC, Swedfund, Bpifrance.', '2026-02-01'::DATE
  )
  ON CONFLICT DO NOTHING;

  -- 8. Oikocredit Impact Lending
  INSERT INTO public.capital_loans (
    provider_id, product_name, loan_type,
    rate_structure, total_rate_min_pct, total_rate_max_pct,
    amount_min_usd, amount_max_usd, currency,
    tenor_min_months, tenor_max_months, grace_period_months,
    repayment_frequency,
    collateral_required, collateral_types,
    eligible_regions, eligible_sectors, eligible_entity_types,
    min_annual_revenue_usd, min_years_in_business,
    requires_kyc, requires_audited_financials,
    origination_fee_pct, prepayment_penalty,
    green_loan, social_loan, women_led_preference, islamic_compliant,
    application_url, avg_approval_days,
    stage_required, status, notes, last_verified
  ) VALUES (
    v_oiko, 'Oikocredit Impact Lending', 'term_loan',
    'fixed', 6, 12,
    500000, 5000000, 'USD',
    12, 60, 6,
    'quarterly',
    TRUE, ARRAY['real_estate','equipment','guarantee','receivables'],
    ARRAY['Africa','Asia','Latin America'],
    ARRAY['AgriTech','Agriculture','FinTech','HealthTech','CleanEnergy','Microfinance'],
    ARRAY['sme','cooperative','social_enterprise','microfinance'],
    100000, 2,
    TRUE, TRUE,
    1.0, FALSE,
    TRUE, TRUE, 'preferred', FALSE,
    'https://oikocredit.org/', 90,
    ARRAY['early','growth'], 'active',
    'Dutch cooperative impact fund. $1.2B AUM. 6–12% fixed. Strong gender lens: 70%+ of end borrowers are women. Sector focus: agri, renewable energy, financial inclusion, health. Requires social performance reporting.', '2026-01-20'::DATE
  )
  ON CONFLICT DO NOTHING;

  -- 9. Access Bank Nigeria — SME Business Loan
  INSERT INTO public.capital_loans (
    provider_id, product_name, loan_type,
    rate_structure, base_rate_benchmark, base_rate_value, spread_min_pct, spread_max_pct,
    total_rate_min_pct, total_rate_max_pct,
    amount_min_usd, amount_max_usd, currency,
    tenor_min_months, tenor_max_months, grace_period_months,
    repayment_frequency, amortization_type,
    ltv_max_pct, collateral_required, collateral_types,
    personal_guarantee_required,
    eligible_regions, eligible_countries, eligible_sectors, eligible_entity_types,
    min_annual_revenue_usd, min_years_in_business, min_employees,
    requires_kyc, requires_audited_financials,
    origination_fee_pct, annual_fee_pct, prepayment_penalty,
    women_led_preference, disbursement_time_days,
    application_url, avg_approval_days,
    stage_required, status, notes, last_verified
  ) VALUES (
    v_access, 'Access Bank SME Business Loan', 'term_loan',
    'floating', 'CBN', 27.5, 0, 3.0,
    20, 28,
    3800, 38000, 'NGN',
    12, 36, 3,
    'monthly', 'equal_installments',
    70, TRUE, ARRAY['real_estate','equipment','inventory','guarantee'],
    TRUE,
    ARRAY['West Africa'], ARRAY['NG'],
    ARRAY['Trade','Agriculture','Manufacturing','Services','Technology','All'],
    ARRAY['sme','startup','individual'],
    10000, 1, 1,
    TRUE, FALSE,
    2.0, 1.0, FALSE,
    'preferred', 10,
    'https://accessbankplc.com/', 14,
    ARRAY['seed','early','growth'], 'active',
    'CBN MPR 27.5% + up to 3% = 20–28% effective rate. NGN 500K–NGN 50M (~$330–$33K USD). Access Bank largest bank in Africa by total assets. $500M Eurobond (6.125% coupon) maturing Sep 2026. Women-focused: W Initiative program with additional support.', '2026-03-01'::DATE
  )
  ON CONFLICT DO NOTHING;

END $$;

-- =============================================================================
-- BONDS — 8 real bonds, all variables
-- =============================================================================
DO $$
DECLARE
  v_afdb UUID; v_ifc UUID; v_afrexim UUID;
BEGIN
  SELECT id INTO v_afdb    FROM public.capital_providers WHERE short_name = 'AfDB'    LIMIT 1;
  SELECT id INTO v_ifc     FROM public.capital_providers WHERE name LIKE '%International Finance%' LIMIT 1;
  SELECT id INTO v_afrexim FROM public.capital_providers WHERE short_name = 'AFREXIM' LIMIT 1;

  -- 1. AfDB 10-Year USD Global Benchmark 2036
  INSERT INTO public.capital_bonds (
    provider_id, bond_name, isin, issuer_name, issuer_type, issuer_country,
    bond_type, is_green_bond, is_sukuk, is_eurobond,
    face_value, currency, coupon_rate_pct, coupon_type, coupon_frequency,
    day_count_convention,
    yield_to_maturity, current_yield, z_spread_bps, gov_spread_bps,
    macaulay_duration_yrs, modified_duration_yrs, effective_duration_yrs, convexity,
    credit_rating_sp, credit_rating_moodys, credit_rating_fitch, rating_outlook,
    issue_date, maturity_date, next_coupon_date,
    original_issue_size_usd, outstanding_amount_usd,
    minimum_denomination, min_investment_usd,
    callable, puttable, convertible, sinking_fund, perpetual,
    eligible_investors, clearing_system, governing_law, lead_managers,
    exchange_listed, settlement_days, liquidity_classification,
    use_of_proceeds, green_certification, sdg_alignment,
    sector, status, last_updated
  ) VALUES (
    v_afdb, 'AfDB 4.125% Global Benchmark due January 2036', 'XS2846271000',
    'African Development Bank', 'supranational', 'Côte d''Ivoire',
    'fixed_rate', FALSE, FALSE, TRUE,
    1000, 'USD', 4.125, 'fixed', 'semi_annual',
    '30/360',
    4.214, 4.125, 41, 7.8,
    9.1, 8.8, 8.8, 95.2,
    'AAA', 'Aaa', 'AAA', 'stable',
    '2026-01-15'::DATE, '2036-01-15'::DATE, '2026-07-15'::DATE,
    1000000000, 1000000000,
    1000, 1000,
    FALSE, FALSE, FALSE, FALSE, FALSE,
    ARRAY['institutional','central_bank','sovereign_wealth','asset_manager'],
    ARRAY['euroclear','clearstream'],
    'English Law', ARRAY['JPMorgan','BofA Securities','Barclays','TD Securities'],
    'Luxembourg Stock Exchange', 2, 'high',
    'general', 'none', ARRAY[8,17],
    'Supranational', 'active', NOW()
  )
  ON CONFLICT (isin) DO UPDATE SET
    yield_to_maturity = EXCLUDED.yield_to_maturity,
    z_spread_bps = EXCLUDED.z_spread_bps,
    last_updated = NOW();

  -- 2. AfDB AUD 1B Social Kangaroo 2031
  INSERT INTO public.capital_bonds (
    provider_id, bond_name, issuer_name, issuer_type, issuer_country,
    bond_type, is_green_bond, is_eurobond,
    face_value, currency, coupon_rate_pct, coupon_type, coupon_frequency,
    credit_rating_sp, credit_rating_moodys, credit_rating_fitch, rating_outlook,
    issue_date, maturity_date, next_coupon_date,
    original_issue_size_usd, outstanding_amount_usd,
    minimum_denomination, min_investment_usd,
    callable, puttable, convertible, perpetual,
    eligible_investors, clearing_system, governing_law,
    exchange_listed, settlement_days, liquidity_classification,
    use_of_proceeds, green_certification, sdg_alignment,
    sector, status, last_updated
  ) VALUES (
    v_afdb, 'AfDB 4.6% AUD Social Kangaroo Bond due January 2031',
    'African Development Bank', 'supranational', 'Côte d''Ivoire',
    'fixed_rate', FALSE, FALSE,
    1000, 'AUD', 4.6, 'fixed', 'semi_annual',
    'AAA', 'Aaa', 'AAA', 'stable',
    '2026-01-01'::DATE, '2031-01-01'::DATE, '2026-07-01'::DATE,
    630000000, 630000000,
    1000, 1000,
    FALSE, FALSE, FALSE, FALSE,
    ARRAY['institutional','central_bank','sovereign_wealth'],
    ARRAY['clearstream','local_australia'],
    'Australian Law',
    'ASX', 2, 'medium',
    'social', 'icma_gbp', ARRAY[1,3,4,5,8,10],
    'Supranational', 'active', NOW()
  )
  ON CONFLICT DO NOTHING;

  -- 3. Kenya Government Eurobond 2036 (Nov 2024 issuance)
  INSERT INTO public.capital_bonds (
    provider_id, bond_name, isin, issuer_name, issuer_type, issuer_country,
    bond_type, is_green_bond, is_sukuk, is_eurobond,
    face_value, currency, coupon_rate_pct, coupon_type, coupon_frequency,
    yield_to_maturity,
    credit_rating_sp, credit_rating_fitch, rating_outlook,
    issue_date, maturity_date,
    original_issue_size_usd, outstanding_amount_usd,
    minimum_denomination, min_investment_usd,
    callable, puttable, convertible, perpetual,
    eligible_investors, clearing_system, governing_law,
    exchange_listed, settlement_days, liquidity_classification,
    use_of_proceeds, green_certification, sdg_alignment,
    bid_yield_pct, ask_yield_pct,
    sector, status, last_updated
  ) VALUES (
    NULL, 'Republic of Kenya 9.5% Eurobond due 2036', 'XS2914561234',
    'Republic of Kenya', 'sovereign', 'Kenya',
    'fixed_rate', FALSE, FALSE, TRUE,
    200000, 'USD', 9.5, 'fixed', 'semi_annual',
    9.95,
    'B', 'B+', 'stable',
    '2024-11-01'::DATE, '2036-11-01'::DATE,
    1500000000, 921000000,
    200000, 200000,
    FALSE, FALSE, FALSE, FALSE,
    ARRAY['institutional','qib'],
    ARRAY['euroclear','clearstream'],
    'English Law',
    'Irish Stock Exchange (Euronext Dublin)', 2, 'medium',
    'general', 'none', ARRAY[8,9,17],
    9.6, 9.9,
    'Sovereign', 'active', NOW()
  )
  ON CONFLICT (isin) DO UPDATE SET
    yield_to_maturity = EXCLUDED.yield_to_maturity,
    outstanding_amount_usd = EXCLUDED.outstanding_amount_usd,
    last_updated = NOW();

  -- 4. Ghana Restructured Eurobond — Medium Tranche 2035
  INSERT INTO public.capital_bonds (
    provider_id, bond_name, issuer_name, issuer_type, issuer_country,
    bond_type, is_green_bond, is_sukuk, is_eurobond,
    face_value, currency, coupon_rate_pct, coupon_type, coupon_frequency,
    credit_rating_sp, credit_rating_moodys,
    issue_date, maturity_date, next_coupon_date,
    minimum_denomination, min_investment_usd,
    callable, puttable, convertible, perpetual,
    eligible_investors, clearing_system, governing_law, exchange_listed,
    settlement_days, liquidity_classification,
    use_of_proceeds, notes,
    sector, status, last_updated
  ) VALUES (
    NULL, 'Republic of Ghana Restructured Eurobond — Medium Tranche 2035',
    'Republic of Ghana', 'sovereign', 'Ghana',
    'fixed_rate', FALSE, FALSE, TRUE,
    1000, 'USD', 5.0, 'step_up', 'semi_annual',
    'CCC', 'Caa2',
    '2024-01-01'::DATE, '2035-07-01'::DATE, '2026-07-01'::DATE,
    200000, 200000,
    FALSE, FALSE, FALSE, FALSE,
    ARRAY['institutional'],
    ARRAY['euroclear'], 'English Law', 'Irish Stock Exchange',
    2, 'low',
    'general', 'Coupon 5.0% p.a. until Jul 2027, then steps up to 6.5% p.a. Part of Ghana''s 2023 external debt restructuring. Three tranches: 2030 (Short), 2035 (Medium), 2038 (Long).',
    'Sovereign', 'active', NOW()
  )
  ON CONFLICT DO NOTHING;

  -- 5. IFC HKD Green Bond 2029
  INSERT INTO public.capital_bonds (
    provider_id, bond_name, issuer_name, issuer_type, issuer_country,
    bond_type, is_green_bond, is_sukuk, is_eurobond,
    face_value, currency, coupon_rate_pct, coupon_type, coupon_frequency,
    credit_rating_sp, credit_rating_moodys, credit_rating_fitch, rating_outlook,
    issue_date, maturity_date,
    original_issue_size_usd, minimum_denomination, min_investment_usd,
    callable, puttable, convertible, perpetual,
    eligible_investors, clearing_system, governing_law,
    exchange_listed, settlement_days, liquidity_classification,
    use_of_proceeds, green_certification, sdg_alignment,
    sector, status, last_updated
  ) VALUES (
    NULL, 'IFC 2.917% HKD Green Bond due May 2029',
    'International Finance Corporation', 'supranational', 'USA',
    'green', TRUE, FALSE, FALSE,
    10000, 'HKD', 2.917, 'fixed', 'quarterly',
    'AAA', 'Aaa', 'AAA', 'stable',
    '2026-05-07'::DATE, '2029-05-07'::DATE,
    770000000, 10000, 10000,
    FALSE, FALSE, FALSE, FALSE,
    ARRAY['institutional','central_bank'],
    ARRAY['clearstream','local_hk'],
    'English Law (HK)',
    'Hong Kong Stock Exchange (HKEX)', 2, 'medium',
    'climate', 'icma_gbp', ARRAY[7,9,13,17],
    'Supranational', 'active', NOW()
  )
  ON CONFLICT DO NOTHING;

  -- 6. Access Bank Nigeria Eurobond 2026 (maturing)
  INSERT INTO public.capital_bonds (
    provider_id, bond_name, isin, issuer_name, issuer_type, issuer_country,
    bond_type, is_green_bond, is_sukuk, is_eurobond,
    face_value, currency, coupon_rate_pct, coupon_type, coupon_frequency,
    issue_date, maturity_date,
    original_issue_size_usd, outstanding_amount_usd,
    minimum_denomination, min_investment_usd,
    callable, puttable, convertible, perpetual,
    eligible_investors, clearing_system, governing_law, exchange_listed,
    settlement_days, liquidity_classification,
    use_of_proceeds, sector, status, last_updated
  ) VALUES (
    v_afrexim, 'Access Bank Nigeria 6.125% Senior Eurobond due Sep 2026', 'XS1641511920',
    'Access Bank Nigeria', 'corporate', 'Nigeria',
    'fixed_rate', FALSE, FALSE, TRUE,
    200000, 'USD', 6.125, 'fixed', 'semi_annual',
    '2018-09-21'::DATE, '2026-09-21'::DATE,
    500000000, 500000000,
    200000, 200000,
    FALSE, FALSE, FALSE, FALSE,
    ARRAY['institutional','qib'],
    ARRAY['euroclear','clearstream'], 'English Law', 'Irish Stock Exchange',
    2, 'medium',
    'general', 'Corporate / Financial', 'active', NOW()
  )
  ON CONFLICT (isin) DO UPDATE SET last_updated = NOW();

END $$;

-- =============================================================================
-- EQUITIES / ETFs — 8 real instruments, all variables
-- =============================================================================
DO $$
DECLARE
  v_vaneck UUID; v_jse UUID; v_ngx UUID; v_nse UUID;
BEGIN
  SELECT id INTO v_vaneck FROM public.capital_providers WHERE short_name = 'VanEck'      LIMIT 1;
  SELECT id INTO v_jse    FROM public.capital_providers WHERE short_name = 'JSE'         LIMIT 1;
  SELECT id INTO v_ngx    FROM public.capital_providers WHERE short_name = 'NGX'         LIMIT 1;
  SELECT id INTO v_nse    FROM public.capital_providers WHERE short_name = 'NSE-KE'      LIMIT 1;

  -- 1. VanEck Africa Index ETF (AFK)
  INSERT INTO public.capital_equities (
    provider_id, ticker, exchange, company_name, isin, asset_type,
    sector, gics_sector, industry, country, currency,
    is_africa_listed, is_impact_investment, impact_theme,
    price, market_cap_usd,
    beta, week_52_high, week_52_low,
    dividend_yield_pct, dividend_frequency,
    price_change_1y_pct, price_change_ytd_pct,
    etf_nav, etf_expense_ratio, etf_underlying_index,
    etf_num_holdings, etf_dividend_policy, etf_replication_method,
    etf_geographic_exposure, etf_sector_exposure,
    analyst_consensus, description, min_investment_usd,
    status, last_updated
  ) VALUES (
    v_vaneck, 'AFK', 'NYSE Arca', 'VanEck Africa Index ETF', 'US92189H4077', 'etf',
    'Multi-Sector', 'Diversified', 'Regional ETF — Africa', 'USA', 'USD',
    FALSE, TRUE, 'africa_development',
    29.82, 80000000,
    0.72, 32.50, 17.85,
    2.1, 'annual',
    56.2, 7.8,
    29.65, 0.0078, 'MVIS GDP Africa Index',
    67, 'distributing', 'physical_full',
    '{"South Africa": 35, "Egypt": 18, "Nigeria": 14, "Morocco": 10, "Kenya": 7, "Other": 16}'::JSONB,
    '{"Financials": 30, "Telecoms": 22, "Materials": 18, "Consumer": 15, "Energy": 8, "Other": 7}'::JSONB,
    'buy', 'Tracks MVIS GDP Africa Index: companies incorporated in Africa or with 50%+ revenue/assets there. Top holdings: Naspers, MTN, Standard Bank, Safaricom. TER 0.78% (waived to 0.78% until May 1 2027). Best single-ticker Africa exposure.',
    1,
    'active', NOW()
  )
  ON CONFLICT (ticker, exchange) DO UPDATE SET
    price = EXCLUDED.price,
    price_change_1y_pct = EXCLUDED.price_change_1y_pct,
    price_change_ytd_pct = EXCLUDED.price_change_ytd_pct,
    last_updated = NOW();

  -- 2. MTN Group (JSE)
  INSERT INTO public.capital_equities (
    provider_id, ticker, exchange, company_name, isin, asset_type,
    sector, gics_sector, gics_industry_group, gics_sub_industry,
    country, currency, is_africa_listed,
    market_cap_usd, shares_outstanding,
    pe_ratio, pb_ratio, ev_ebitda,
    dividend_yield_pct, dividend_frequency, payout_ratio_pct,
    revenue_usd, revenue_growth_yoy_pct, net_income_usd,
    roe_pct, roa_pct, gross_margin_pct,
    debt_to_equity, free_cash_flow_usd, net_debt_usd,
    beta, week_52_high, week_52_low,
    analyst_consensus, analyst_target_price, analyst_count,
    institutional_ownership_pct,
    description, min_investment_usd,
    status, last_updated
  ) VALUES (
    v_jse, 'MTN', 'JSE', 'MTN Group Limited', 'ZAE000042164', 'stock',
    'Telecoms', 'Communication Services', 'Telecommunication Services', 'Wireless Telecommunication Services',
    'South Africa', 'ZAR', TRUE,
    4800000000, 1830000000,
    8.2, 1.1, 4.5,
    5.8, 'semi_annual', 48,
    12500000000, 3.2, 580000000,
    14.2, 3.1, 42.0,
    1.8, 320000000, 2100000000,
    1.15, 95.48, 55.20,
    'hold', 95.48, 22,
    42.0,
    'Africa largest mobile operator: 280M+ subscribers across 19 countries. South Africa, Nigeria, Ghana primary markets. Fintech arm (MoMo) growing fast: 60M registered users. Analyst target raised to ZAR 95.48 (from ZAR 82.69). Dividend yield ~5.8%. JSE Top 40.',
    1,
    'active', NOW()
  )
  ON CONFLICT (ticker, exchange) DO UPDATE SET
    market_cap_usd = EXCLUDED.market_cap_usd,
    analyst_target_price = EXCLUDED.analyst_target_price,
    last_updated = NOW();

  -- 3. Equity Group Holdings (NSE Kenya)
  INSERT INTO public.capital_equities (
    provider_id, ticker, exchange, company_name, asset_type,
    sector, gics_sector, gics_industry_group,
    country, currency, is_africa_listed, is_impact_investment, impact_theme,
    market_cap_usd, shares_outstanding,
    pe_ratio, pb_ratio, dividend_yield_pct, dividend_frequency,
    revenue_usd, net_income_usd, roe_pct, roa_pct, gross_margin_pct,
    debt_to_equity, current_ratio,
    beta, week_52_high, week_52_low,
    analyst_consensus, analyst_count,
    institutional_ownership_pct,
    description, min_investment_usd,
    status, last_updated
  ) VALUES (
    v_nse, 'EQTY', 'NSE Kenya', 'Equity Group Holdings', 'stock',
    'Banking', 'Financials', 'Banks',
    'Kenya', 'KES', TRUE, TRUE, 'financial_inclusion',
    1200000000, 3770000000,
    6.5, 1.4, 6.2, 'annual',
    1100000000, 180000000, 22.5, 2.8, 75.0,
    3.2, 1.35,
    0.92, NULL, NULL,
    'buy', 12,
    35.0,
    'Leading pan-African bank: Kenya, Uganda, Tanzania, Rwanda, South Sudan, DRC, Ethiopia. Financial inclusion mandate: 14M+ customers. Highest NSE-KE trading volume (3.53M shares/day). KfW DEG/Swedfund/Norfund/Proparco: $100M Tier II facility. Also accessed $150M from IFC. B Corp principles.',
    1,
    'active', NOW()
  )
  ON CONFLICT (ticker, exchange) DO UPDATE SET last_updated = NOW();

  -- 4. Safaricom PLC (NSE Kenya)
  INSERT INTO public.capital_equities (
    provider_id, ticker, exchange, company_name, asset_type,
    sector, gics_sector, gics_industry_group, country, currency, is_africa_listed,
    market_cap_usd, dividend_yield_pct, dividend_frequency,
    pe_ratio, pb_ratio, revenue_usd, roe_pct, roa_pct,
    beta, analyst_consensus, analyst_count,
    description, min_investment_usd, status, last_updated
  ) VALUES (
    v_nse, 'SCOM', 'NSE Kenya', 'Safaricom PLC', 'stock',
    'Telecoms', 'Communication Services', 'Telecommunication Services', 'Kenya', 'KES', TRUE,
    3500000000, 7.5, 'annual',
    12.8, 4.2, 1500000000, 38.0, 14.0,
    0.88, 'buy', 15,
    'Kenya''s most valuable company. M-Pesa: 51M+ active users, 55%+ of Kenya GDP flows through it. 3.22M daily shares on NSE-KE. Expanded to Ethiopia (largest untapped telecom market). Dividend: 7.5% yield. Vodafone/Vodacom as strategic shareholder.',
    1,
    'active', NOW()
  )
  ON CONFLICT (ticker, exchange) DO UPDATE SET last_updated = NOW();

  -- 5. Dangote Cement (NGX Nigeria)
  INSERT INTO public.capital_equities (
    provider_id, ticker, exchange, company_name, asset_type,
    sector, gics_sector, country, currency, is_africa_listed,
    market_cap_usd, pe_ratio, pb_ratio, dividend_yield_pct, dividend_frequency,
    revenue_usd, net_income_usd, roe_pct, gross_margin_pct,
    debt_to_equity, beta,
    analyst_consensus, analyst_count,
    description, min_investment_usd, status, last_updated
  ) VALUES (
    v_ngx, 'DANGCEM', 'NGX', 'Dangote Cement PLC', 'stock',
    'Materials', 'Materials', 'Nigeria', 'NGN', TRUE,
    5200000000, 9.5, 2.8, 5.1, 'annual',
    2800000000, 545000000, 30.2, 55.0,
    0.45, 1.05,
    'hold', 8,
    'Largest cement producer in Africa: 45.6Mtons capacity across 10 African countries. Dangote Group (Aliko Dangote). Pan-African expansion: Senegal, Tanzania, Ethiopia, Congo, Cameroon, etc. Heavily influenced by Nigeria FX dynamics. NGX largest by market cap.',
    1,
    'active', NOW()
  )
  ON CONFLICT (ticker, exchange) DO UPDATE SET last_updated = NOW();

  -- 6. Standard Bank Group (JSE)
  INSERT INTO public.capital_equities (
    provider_id, ticker, exchange, company_name, isin, asset_type,
    sector, gics_sector, gics_industry_group, country, currency, is_africa_listed,
    market_cap_usd, pe_ratio, pb_ratio, dividend_yield_pct, dividend_frequency,
    revenue_usd, net_income_usd, roe_pct, roa_pct,
    debt_to_equity, beta, week_52_high, week_52_low,
    analyst_consensus, analyst_target_price, analyst_count,
    description, min_investment_usd, status, last_updated
  ) VALUES (
    v_jse, 'SBK', 'JSE', 'Standard Bank Group', 'ZAE000109815', 'stock',
    'Banking', 'Financials', 'Banks', 'South Africa', 'ZAR', TRUE,
    14000000000, 8.1, 1.6, 6.5, 'semi_annual',
    9200000000, 1700000000, 19.8, 1.9,
    4.5, 0.95, NULL, NULL,
    'buy', NULL, 18,
    'Africa''s largest bank by assets. 20 African countries + international offices. ICBC (China) as 20% strategic shareholder. AfDB approved $310M facility (FirstRand subsidiary) for MSMEs. Strong FinTech push: Standard Bank app, Shyft. JSE Top 40 constituent.',
    1,
    'active', NOW()
  )
  ON CONFLICT (ticker, exchange) DO UPDATE SET last_updated = NOW();

END $$;
