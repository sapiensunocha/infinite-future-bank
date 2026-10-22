-- ============================================================
-- SEED: GLOBAL REFERENCE RATES
-- Benchmark rates used to price loans and bonds worldwide.
-- Values as of May 2026 — update via capital-engine function.
-- ============================================================
INSERT INTO public.capital_reference_rates
  (rate_name, rate_type, rate_value, currency, region, tenor, issuing_body, effective_date, next_review, trend) VALUES

-- ── US RATES ──────────────────────────────────────────────
('FED_FUNDS',       'central_bank', 4.33, 'USD', 'USA',    'overnight', 'US Federal Reserve',       '2026-05-01', '2026-06-18', 'falling'),
('SOFR',            'overnight',    4.31, 'USD', 'USA',    'overnight', 'ARRC / NY Fed',             '2026-05-20', NULL,         'falling'),
('SOFR_1M',         'term',         4.35, 'USD', 'USA',    '1M',        'CME Group',                 '2026-05-20', NULL,         'falling'),
('SOFR_3M',         'term',         4.42, 'USD', 'USA',    '3M',        'CME Group',                 '2026-05-20', NULL,         'falling'),
('SOFR_6M',         'term',         4.48, 'USD', 'USA',    '6M',        'CME Group',                 '2026-05-20', NULL,         'falling'),
('US_PRIME',        'interbank',    7.50, 'USD', 'USA',    'overnight', 'US Banks',                  '2026-05-01', NULL,         'falling'),
('US_T2Y',          'term',         4.20, 'USD', 'USA',    '2Y',        'US Treasury',               '2026-05-20', NULL,         'falling'),
('US_T5Y',          'term',         4.35, 'USD', 'USA',    '5Y',        'US Treasury',               '2026-05-20', NULL,         'falling'),
('US_T10Y',         'term',         4.52, 'USD', 'USA',    '10Y',       'US Treasury',               '2026-05-20', NULL,         'stable'),
('US_T30Y',         'term',         4.75, 'USD', 'USA',    '30Y',       'US Treasury',               '2026-05-20', NULL,         'stable'),

-- ── EUROZONE RATES ─────────────────────────────────────────
('ECB_DEPOSIT',     'central_bank', 2.25, 'EUR', 'Eurozone','overnight','European Central Bank',     '2026-04-17', '2026-06-05', 'falling'),
('ECB_MAIN_REFI',   'central_bank', 2.40, 'EUR', 'Eurozone','overnight','European Central Bank',     '2026-04-17', '2026-06-05', 'falling'),
('EURIBOR_1M',      'interbank',    2.30, 'EUR', 'Eurozone','1M',       'EMMI',                      '2026-05-20', NULL,         'falling'),
('EURIBOR_3M',      'interbank',    2.35, 'EUR', 'Eurozone','3M',       'EMMI',                      '2026-05-20', NULL,         'falling'),
('EURIBOR_6M',      'interbank',    2.40, 'EUR', 'Eurozone','6M',       'EMMI',                      '2026-05-20', NULL,         'falling'),
('EURIBOR_12M',     'interbank',    2.48, 'EUR', 'Eurozone','12M',      'EMMI',                      '2026-05-20', NULL,         'falling'),
('ESTR',            'overnight',    2.25, 'EUR', 'Eurozone','overnight','ECB',                        '2026-05-20', NULL,         'falling'),

-- ── UK RATES ───────────────────────────────────────────────
('BOE_BASE',        'central_bank', 4.25, 'GBP', 'UK',     'overnight', 'Bank of England',           '2026-05-08', '2026-06-19', 'falling'),
('SONIA',           'overnight',    4.23, 'GBP', 'UK',     'overnight', 'Bank of England',           '2026-05-20', NULL,         'falling'),
('SONIA_3M',        'term',         4.28, 'GBP', 'UK',     '3M',        'FTSE Russell',              '2026-05-20', NULL,         'falling'),

-- ── AFRICAN CENTRAL BANK RATES ─────────────────────────────
('SARB_REPO',       'central_bank', 7.50,  'ZAR', 'South Africa',  'overnight', 'South African Reserve Bank',    '2026-05-29', '2026-07-17', 'stable'),
('CBN_MPR',         'central_bank', 27.50, 'NGN', 'Nigeria',       'overnight', 'Central Bank of Nigeria',       '2026-05-01', '2026-07-22', 'stable'),
('CBK_CBR',         'central_bank', 10.00, 'KES', 'Kenya',         'overnight', 'Central Bank of Kenya',         '2026-04-08', '2026-06-17', 'falling'),
('BOG_POLICY',      'central_bank', 27.00, 'GHS', 'Ghana',         'overnight', 'Bank of Ghana',                 '2026-05-27', '2026-07-22', 'stable'),
('NBE_POLICY',      'central_bank', 7.00,  'ETB', 'Ethiopia',      'overnight', 'National Bank of Ethiopia',     '2026-04-01', '2026-07-01', 'stable'),
('RBZ_POLICY',      'central_bank', 20.00, 'ZWG', 'Zimbabwe',      'overnight', 'Reserve Bank of Zimbabwe',      '2026-04-01', '2026-07-01', 'stable'),
('BCC_POLICY',      'central_bank', 11.50, 'CDF', 'DRC',           'overnight', 'Banque Centrale du Congo',      '2026-04-01', '2026-07-01', 'stable'),
('BCEAO_RATE',      'central_bank', 3.50,  'XOF', 'West Africa (WAEMU)', 'overnight','Banque Centrale des États de l''Afrique de l''Ouest','2026-04-01','2026-07-01','falling'),
('BEAC_RATE',       'central_bank', 5.00,  'XAF', 'Central Africa (CEMAC)','overnight','Banque des États de l''Afrique Centrale','2026-04-01','2026-07-01','stable'),
('BAM_RATE',        'central_bank', 2.50,  'MAD', 'Morocco',       'overnight', 'Bank Al-Maghrib',               '2026-03-18', '2026-06-17', 'falling'),
('CBE_RATE',        'central_bank', 27.25, 'EGP', 'Egypt',         'overnight', 'Central Bank of Egypt',         '2026-04-17', '2026-06-19', 'falling'),
('BCRM_RATE',       'central_bank', 2.50,  'XOF', 'Ivory Coast',   'overnight', 'BCEAO',                         '2026-04-01', '2026-07-01', 'falling'),

-- ── ISLAMIC BENCHMARK ──────────────────────────────────────
('SAIBOR_3M',       'interbank',    5.20,  'SAR', 'Saudi Arabia',  '3M',        'Saudi Central Bank (SAMA)',     '2026-05-20', NULL,         'stable'),
('KIBOR_3M',        'interbank',    15.50, 'PKR', 'Pakistan',      '3M',        'State Bank of Pakistan',        '2026-05-20', NULL,         'falling');
