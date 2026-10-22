-- =============================================================================
-- CAPITAL UNIVERSE TOTALS
-- Stores global capital pool sizes per asset class, refreshed by the
-- capital-universe-sync Edge Function (daily cron via pg_cron).
-- Real sources: World Bank API, BIS, OECD, GCF, SIFMA, CPI.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.capital_universe_totals (
  category            TEXT        NOT NULL,
  subcategory         TEXT        NOT NULL DEFAULT 'all',
  label               TEXT        NOT NULL,
  total_usd_bn        NUMERIC(20,2),        -- global pool, USD billions
  africa_em_usd_bn    NUMERIC(20,2),        -- Africa / EM subset, USD billions
  annual_flow_usd_bn  NUMERIC(20,2),        -- annual issuance / disbursement
  accessible_pct      NUMERIC(6,2),         -- % of pool reachable via IFB
  source              TEXT,
  source_url          TEXT,
  data_year           INTEGER,
  synced_at           TIMESTAMPTZ DEFAULT NOW(),
  notes               TEXT,
  PRIMARY KEY (category, subcategory)
);

-- Row-level security: authenticated users can read, only service role writes
ALTER TABLE public.capital_universe_totals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "capital_universe_read"
  ON public.capital_universe_totals FOR SELECT
  TO authenticated USING (true);

-- =============================================================================
-- BASELINE SEED  (real figures from live research, May 2026)
-- World Bank CM.MKT.LCAP.CD gives ~$105T for 2022 (last full year available);
-- Statista/McKinsey projects $154T by end 2026 — we seed the projected figure
-- and let the sync function overwrite with live World Bank data each day.
-- =============================================================================

INSERT INTO public.capital_universe_totals
  (category, subcategory, label,
   total_usd_bn, africa_em_usd_bn, annual_flow_usd_bn, accessible_pct,
   source, source_url, data_year, notes)
VALUES

-- ── EQUITIES ─────────────────────────────────────────────────────────────────
('equities','all','Global Equities',
  154450, 1200, NULL, 2.5,
  'Statista Market Forecast / World Bank CM.MKT.LCAP.CD',
  'https://www.statista.com/outlook/fmo/stocks/worldwide',
  2026,
  'Total global stock market capitalisation. Africa subset: JSE+NGX+NSE-KE+EGX+BRVM+BVMAC.'),

('equities','africa','African Equities',
  1200, 1200, NULL, 15,
  'African Markets / NSE / NGX / JSE',
  'https://afx.kwayisi.org/ngx/',
  2026,
  'NGX All-Share ATH 205,187 (+95% YoY). NSE-KE KES 3.44T (~$26.5B). JSE All-Share +76% 2025–2026.'),

('equities','etf','Africa-Focused ETFs',
  4.2, 4.2, NULL, 80,
  'VanEck / iShares',
  'https://www.vaneck.com/us/en/investments/africa-index-etf-afk/',
  2026,
  'AFK (VanEck Africa Index ETF) TER 0.78%, YTD +7.8%, 1-yr +56.2%.'),

-- ── BONDS ────────────────────────────────────────────────────────────────────
('bonds','all','Global Bond Market',
  143150, 800, 6800, 1.5,
  'SIFMA / ICMA / OECD Global Debt Report 2026',
  'https://www.icmagroup.org/market-practice-and-regulatory-policy/secondary-markets/bond-market-size/',
  2026,
  'Total outstanding. US alone $58T. Corporate bonds growing at 10.8% CAGR to 2034.'),

('bonds','sovereign','Sovereign / Government Bonds',
  53000, 300, 2000, 2,
  'OECD Global Debt Report 2026',
  'https://www.oecd.org/en/publications/global-debt-report-2026_e9d80efd-en.html',
  2025,
  '67% of combined bond total. Africa sovereign: Nigeria, Kenya, Ghana, Egypt Eurobonds.'),

('bonds','corporate','Corporate Bonds',
  44910, 200, 6800, 1,
  'Fortune Business Insights',
  'https://www.fortunebusinessinsights.com/corporate-bond-market-113826',
  2026,
  '$44.91T in 2026, growing to $101.91T by 2034 (CAGR 10.8%). Corporates issued $6.8T in 2025.'),

('bonds','green','Green / Sustainable Bonds',
  3000, 14, 700, 3,
  'LSEG / Climate Bonds Initiative',
  'https://www.lseg.com/en/insights/green-debt-market-passes-3-trillion-milestone',
  2025,
  'Passed $3T outstanding Q3 2025. Africa: $1.4B issued 2023 (+125% YoY). AfDB leading in 2026.'),

('bonds','dfi','DFI / Multilateral Bonds',
  120, 40, 24, 20,
  'AfDB / IFC / World Bank Treasury',
  'https://www.afdb.org/en/about-us/corporate-information/financial-information/investor-resources/capital-markets',
  2026,
  'AfDB 2026 program UA 8.9B (~$12.1B): 4.125% 10yr USD, 4.6% 5yr AUD, 3.625% 5yr USD. IFC HKD green 2.917%.'),

-- ── LOANS ────────────────────────────────────────────────────────────────────
('loans','sme','Global SME Lending',
  6100, 500, 1100, 8,
  'Growth Market Reports / IFC MSME Finance',
  'https://growthmarketreports.com/report/sme-lending-market',
  2024,
  '$6.1T market 2024, CAGR 9.2% → $13.7T by 2033. Emerging-market SME financing gap: $5.2T.'),

('loans','development','Development Finance Loans',
  207, 61, 207, 25,
  'OECD Multilateral Development Finance 2026',
  'https://www.oecd.org/en/publications/multilateral-development-finance-2026_0720370a-en.html',
  2024,
  '70% of $296B multilateral outflows = $207B loans. AfDB, IFC, EIB, ADB, EBRD, IDA.'),

('loans','trade_finance','Trade Finance (Africa)',
  750, 750, 750, 12,
  'AFREXIMBANK / TDB / ICC Trade Finance Gap Report',
  'https://www.afreximbank.com/',
  2026,
  'AFREXIMBANK SOFR+3-5%, $500K-$50M. TDB 6-9% p.a. Africa trade finance gap was $81B in 2022.'),

('loans','microfinance','Microfinance',
  190, 45, 60, 30,
  'Microfinance Barometer / Kiva / Grameen',
  'https://www.kiva.org/lend-category-beta/africa-loans',
  2025,
  'Kiva: 0% crowd-funded $25–$15K via 300+ field partners. Global average end-borrower rate ~35%.'),

-- ── GRANTS / ODA ─────────────────────────────────────────────────────────────
('grants','oda','Official Development Assistance',
  174.3, 52, 174.3, 35,
  'OECD DAC Preliminary 2025',
  'https://www.oecd.org/en/data/insights/data-explainers/2026/04/a-historic-decline-in-foreign-aid-preliminary-2025-oda-data.html',
  2025,
  '$174.3B total ODA in 2025 (fell 23.1% from 2024). ~30% grants = $52B. Further -5.8% projected 2026.'),

('grants','multilateral_grants','Multilateral Programme Grants',
  88.8, 25, 88.8, 40,
  'OECD / World Bank',
  'https://www.oecd.org/en/publications/multilateral-development-finance-2026_0720370a-en.html',
  2024,
  '30% of $296B multilateral outflows = $88.8B in grants. Includes IDA grants, AfDF, GCF, GFATM.'),

('grants','programme_grants','Programme / Innovation Grants',
  15, 5, 15, 60,
  'GIF / Mastercard Foundation / AfDB FAPA',
  'https://www.globalinnovation.fund/apply-for-funding',
  2026,
  'GIF: $50K–$15M (window Jul 15 2026). MCF FAST: $5K–$15K (alumni only). FAPA: $100K–$250K.'),

-- ── CLIMATE FINANCE ──────────────────────────────────────────────────────────
('climate_finance','all','Global Climate Finance',
  2000, 30, 2000, 5,
  'Climate Policy Initiative (CPI) Global Landscape 2025',
  'https://www.climatepolicyinitiative.org/press-release/global-climate-finance-hits-1-9-trillion-bridging-the-climate-investment-gap-remains-within-reach/',
  2024,
  '$1.9T in 2023 → exceeded $2T in 2024. Private finance crossed $1T for first time. Need $8.6T/yr by 2050.'),

('climate_finance','gcf','Green Climate Fund',
  19.3, 9, 3.26, 20,
  'GCF',
  'https://www.greenclimate.fund/news/green-climate-fund-achieves-record-breaking-year-board-channels-usd-326-billion-developing',
  2025,
  '$19.3B cumulative approved (336 projects to end 2025). Record 2025: $3.26B disbursed to developing countries.'),

('climate_finance','afawa','AfDB Gender / Climate',
  5, 5, 1.3, 40,
  'AfDB AFAWA',
  'https://www.afdb.org/en/topics-and-sectors/initiatives-partnerships/afawa-affirmative-finance-action-women-africa',
  2026,
  'AFAWA target $5B → $2.8B approved, $1.3B disbursed. G4G guarantee unlocking $3B to 27,000 women-led businesses.'),

-- ── PRIVATE EQUITY / VC ──────────────────────────────────────────────────────
('private_equity','all','Global Private Equity',
  4000, 150, 1200, 1,
  'McKinsey Global Private Markets Report 2026 / Moonfare',
  'https://www.mckinsey.com/industries/private-capital/our-insights/global-private-markets-report',
  2025,
  'Buyout AUM ~$4T. $1.2T deals in 2025 (2nd time annual value crossed $1T). $1.1T dry powder.'),

('private_equity','venture_capital','Venture Capital',
  598.91, 8, 598.91, 2,
  'Fortune Business Insights / Wellington Management',
  'https://www.fortunebusinessinsights.com/venture-capital-investment-market-115137',
  2026,
  'Global VC market $598.91B in 2026. Africa VC ~$8B. Key trends: AI, climate tech, fintech.'),

('private_equity','impact','Impact Investing',
  1160, 60, 100, 10,
  'GIIN Annual Survey / Acumen / Omidyar',
  'https://acumen.org/',
  2024,
  'GIIN AUM $1.16T. Acumen ARAF: $58M agri equity in E+W Africa. Omidyar: invite-only.'),

-- ── SUMMARY ROW (computed total, updated by sync function) ───────────────────
('total','all','IFB Capital Universe',
  NULL, NULL, NULL, NULL,
  'IFB Aggregated',
  NULL,
  2026,
  'Sum computed by get_capital_universe_summary(). Updated each sync.')

ON CONFLICT (category, subcategory) DO UPDATE SET
  total_usd_bn       = EXCLUDED.total_usd_bn,
  africa_em_usd_bn   = EXCLUDED.africa_em_usd_bn,
  annual_flow_usd_bn = EXCLUDED.annual_flow_usd_bn,
  notes              = EXCLUDED.notes,
  synced_at          = NOW();

-- =============================================================================
-- RPCs
-- =============================================================================

-- Full table for the Capital Universe deep-dive page
CREATE OR REPLACE FUNCTION public.get_capital_universe()
RETURNS TABLE (
  category           TEXT,
  subcategory        TEXT,
  label              TEXT,
  total_usd_bn       NUMERIC,
  africa_em_usd_bn   NUMERIC,
  annual_flow_usd_bn NUMERIC,
  accessible_pct     NUMERIC,
  source             TEXT,
  source_url         TEXT,
  data_year          INTEGER,
  synced_at          TIMESTAMPTZ,
  notes              TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT t.category, t.subcategory, t.label,
         t.total_usd_bn, t.africa_em_usd_bn, t.annual_flow_usd_bn,
         t.accessible_pct, t.source, t.source_url,
         t.data_year, t.synced_at, t.notes
  FROM   public.capital_universe_totals t
  WHERE  t.category <> 'total'
  ORDER BY
    CASE t.category
      WHEN 'equities'        THEN 1
      WHEN 'bonds'           THEN 2
      WHEN 'loans'           THEN 3
      WHEN 'climate_finance' THEN 4
      WHEN 'grants'          THEN 5
      WHEN 'private_equity'  THEN 6
    END,
    t.total_usd_bn DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_capital_universe() TO authenticated;

-- Hero counters: one row per top-level category + grand total
CREATE OR REPLACE FUNCTION public.get_capital_universe_summary()
RETURNS TABLE (
  category           TEXT,
  label              TEXT,
  total_usd_bn       NUMERIC,
  africa_em_usd_bn   NUMERIC,
  annual_flow_usd_bn NUMERIC,
  last_synced        TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  -- per-category totals (only the 'all' subcategory row)
  SELECT t.category,
         t.label,
         t.total_usd_bn,
         t.africa_em_usd_bn,
         t.annual_flow_usd_bn,
         t.synced_at
  FROM   public.capital_universe_totals t
  WHERE  t.subcategory = 'all'
  UNION ALL
  -- grand total row
  SELECT 'grand_total'::TEXT,
         'Total Capital Universe'::TEXT,
         SUM(t.total_usd_bn),
         SUM(t.africa_em_usd_bn),
         SUM(t.annual_flow_usd_bn),
         MAX(t.synced_at)
  FROM   public.capital_universe_totals t
  WHERE  t.subcategory = 'all'
  ORDER BY total_usd_bn DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_capital_universe_summary() TO authenticated;
