-- ============================================================
-- SEED: CAPITAL PROVIDERS
-- 60+ global institutions that provide capital
-- ============================================================
INSERT INTO public.capital_providers (name, short_name, provider_type, hq_country, regions_active, website, founded_year, aum_usd_billions, credit_rating, notes) VALUES

-- MULTILATERAL DFIs
('International Finance Corporation',          'IFC',       'multilateral_dfi', 'USA',         ARRAY['Global'],                   'https://ifc.org',          1956, 100.0,  'AAA', 'World Bank Group private sector arm'),
('African Development Bank',                   'AfDB',      'multilateral_dfi', 'Ivory Coast', ARRAY['Africa'],                   'https://afdb.org',         1964, 45.0,   'AAA', 'Pan-African multilateral development bank'),
('World Bank - IDA',                           'IDA',       'multilateral_dfi', 'USA',         ARRAY['Global','Developing Countries'], 'https://worldbank.org', 1960, 160.0, 'AAA', 'Concessional lending arm of World Bank'),
('Asian Development Bank',                     'ADB',       'multilateral_dfi', 'Philippines', ARRAY['Asia','Pacific'],            'https://adb.org',          1966, 60.0,   'AAA', NULL),
('European Investment Bank',                   'EIB',       'multilateral_dfi', 'Luxembourg',  ARRAY['Europe','Africa','Global'],  'https://eib.org',          1958, 550.0,  'AAA', NULL),
('European Bank for Reconstruction and Development','EBRD', 'multilateral_dfi', 'UK',          ARRAY['Europe','Central Asia','Africa'], 'https://ebrd.com',    1991, 65.0,   'AAA', NULL),
('Inter-American Development Bank',            'IDB',       'multilateral_dfi', 'USA',         ARRAY['Latin America','Caribbean'], 'https://iadb.org',         1959, 120.0,  'AAA', NULL),
('UN Capital Development Fund',                'UNCDF',     'multilateral_dfi', 'USA',         ARRAY['Least Developed Countries'], 'https://uncdf.org',        1966, 2.0,    NULL,  'Focuses on least developed countries'),
('International Fund for Agricultural Development','IFAD',  'multilateral_dfi', 'Italy',       ARRAY['Global','Africa','Asia'],   'https://ifad.org',          1977, 20.0,   'AAA', 'Rural development and food security'),
('Green Climate Fund',                         'GCF',       'multilateral_dfi', 'South Korea', ARRAY['Global'],                   'https://greenclimate.fund', 2010, 10.0,   NULL,  'Climate finance for developing countries'),
('Global Environment Facility',                'GEF',       'multilateral_dfi', 'USA',         ARRAY['Global'],                   'https://thegef.org',        1991, 22.0,   NULL,  'Environmental financing'),

-- BILATERAL DFIs / AID AGENCIES
('USAID Development Innovation Ventures',      'USAID-DIV', 'bilateral_dfi',    'USA',         ARRAY['Global','Africa','Asia'],   'https://usaid.gov',         1961, 30.0,   NULL,  'US govt development finance'),
('Deutsche Gesellschaft für Internationale Zusammenarbeit','GIZ','bilateral_dfi','Germany',   ARRAY['Africa','Asia','Global'],   'https://giz.de',            2011, 4.0,    NULL,  'German development agency'),
('Japan International Cooperation Agency',     'JICA',      'bilateral_dfi',    'Japan',       ARRAY['Africa','Asia','Global'],   'https://jica.go.jp',        2003, 15.0,   NULL,  NULL),
('Agence Française de Développement',          'AFD',       'bilateral_dfi',    'France',      ARRAY['Africa','Asia','Pacific'],  'https://afd.fr',            1941, 40.0,   'AAA', 'French development agency — strong Africa focus'),
('British International Investment',           'BII',       'bilateral_dfi',    'UK',          ARRAY['Africa','Asia'],            'https://bii.co.uk',         1948, 7.0,    NULL,  'Formerly CDC Group, UK development finance'),
('US International Development Finance Corporation','DFC',  'bilateral_dfi',    'USA',         ARRAY['Africa','Asia','Global'],   'https://dfc.gov',           2019, 60.0,   NULL,  'US government DFI, replaced OPIC'),
('Swedish International Development Cooperation Agency','Sida','bilateral_dfi', 'Sweden',      ARRAY['Africa','Asia','Global'],   'https://sida.se',           1965, 5.0,    NULL,  NULL),
('Women Entrepreneurs Finance Initiative',     'We-Fi',     'bilateral_dfi',    'USA',         ARRAY['Global','Africa','Asia'],   'https://we-fi.org',         2017, 0.35,   NULL,  'Dedicated women entrepreneurship funding'),

-- DEVELOPMENT BANKS (Regional)
('African Export-Import Bank',                 'Afreximbank','development_bank', 'Egypt',      ARRAY['Africa'],                   'https://afreximbank.com',   1993, 22.0,   'BBB', 'Pan-African trade and development bank'),
('Eastern & Southern Africa Trade & Development Bank','TDB','development_bank', 'Mauritius',  ARRAY['East Africa','Southern Africa'],'https://tdbgroup.org',   1985, 7.0,    'BBB+','Trade Development Bank for ESA'),
('ECOWAS Bank for Investment & Development',   'EBID',      'development_bank', 'Togo',       ARRAY['West Africa'],              'https://bidc-ebid.org',     2003, 2.0,    NULL,  NULL),
('Islamic Development Bank',                   'IsDB',      'islamic_finance',  'Saudi Arabia',ARRAY['Africa','Asia','MENA'],     'https://isdb.org',          1975, 25.0,   'AAA', 'Sharia-compliant development finance'),
('African Guarantee Fund',                     'AGF',       'development_bank', 'Kenya',       ARRAY['Africa'],                   'https://africanguaranteefund.com',2011,1.0,NULL, 'Credit guarantees for African SMEs'),

-- FOUNDATIONS
('Bill & Melinda Gates Foundation',            'Gates',     'foundation',       'USA',         ARRAY['Global','Africa','Asia'],   'https://gatesfoundation.org',2000,70.0,  NULL,  'Global health, poverty, agriculture'),
('Mastercard Foundation',                      'MCF',       'foundation',       'Canada',      ARRAY['Africa'],                   'https://mastercardfdn.org', 2006, 40.0,   NULL,  'Youth employment and financial inclusion in Africa'),
('Ford Foundation',                            'Ford',      'foundation',       'USA',         ARRAY['Global','Africa'],          'https://fordfoundation.org',1936, 16.0,   NULL,  'Social justice and economic opportunity'),
('MacArthur Foundation',                       'MacArthur', 'foundation',       'USA',         ARRAY['Global'],                   'https://macfound.org',      1970, 8.0,    NULL,  NULL),
('Rockefeller Foundation',                     'Rockefeller','foundation',       'USA',         ARRAY['Global','Africa','Asia'],   'https://rockefellerfoundation.org',1913,5.0,NULL,'Resilience and health equity focus'),
('Mo Ibrahim Foundation',                      'MIF',       'foundation',       'UK',          ARRAY['Africa'],                   'https://mo.ibrahim.foundation',2006,NULL,  NULL,  'African governance and leadership'),
('Tony Elumelu Foundation',                    'TEF',       'foundation',       'Nigeria',     ARRAY['Africa'],                   'https://tonyelumelufoundation.org',2010,NULL,NULL,'$100M African entrepreneurship programme'),
('Omidyar Network',                            'Omidyar',   'impact_fund',      'USA',         ARRAY['Global','Africa'],          'https://omidyar.com',       2004, 1.5,    NULL,  'Fintech and social impact'),
('Skoll Foundation',                           'Skoll',     'impact_fund',      'USA',         ARRAY['Global'],                   'https://skoll.org',         1999, 1.0,    NULL,  'Social entrepreneurship'),
('Acumen',                                     'Acumen',    'impact_fund',      'USA',         ARRAY['Africa','Asia'],            'https://acumen.org',        2001, 0.15,   NULL,  'Patient capital for social enterprises'),

-- GOVERNMENT AGENCIES
('US Small Business Administration',           'SBA',       'government_agency','USA',         ARRAY['USA'],                      'https://sba.gov',           1953, NULL,   NULL,  'US SME loans and guarantees'),
('Bpifrance',                                  'BPIFrance', 'government_agency','France',      ARRAY['France','Africa'],          'https://bpifrance.fr',      2012, 80.0,   NULL,  'French public investment bank'),
('British Business Bank',                      'BBB',       'government_agency','UK',          ARRAY['UK'],                       'https://british-business-bank.co.uk',2014,10.0,NULL,NULL),
('Small Enterprise Finance Agency',            'SEFA',      'government_agency','South Africa',ARRAY['South Africa','SADC'],     'https://sefa.org.za',       2012, 0.3,    NULL,  'SA government SME funder'),
('Development Bank of Ethiopia',               'DBE',       'government_agency','Ethiopia',    ARRAY['Ethiopia'],                 'https://dbe.com.et',        1909, 1.5,    NULL,  NULL),
('Bank of Industry Nigeria',                   'BOI',       'government_agency','Nigeria',     ARRAY['Nigeria'],                  'https://boinigeria.com',    1959, 3.0,    NULL,  'Nigeria industrial development finance'),
('Kenya Industrial Estates',                   'KIE',       'government_agency','Kenya',       ARRAY['Kenya'],                    'https://kie.co.ke',         1967, 0.1,    NULL,  NULL),

-- COMMERCIAL / DEVELOPMENT BANKS
('Stanbic Bank Africa',                        'Stanbic',   'commercial_bank',  'South Africa',ARRAY['Africa'],                   'https://stanbic.com',       1862, 180.0,  'BBB+','Standard Bank Group, largest African bank'),
('Ecobank Transnational',                      'Ecobank',   'commercial_bank',  'Togo',        ARRAY['Africa'],                   'https://ecobank.com',       1985, 22.0,   'B+',  'Pan-African banking group, 35 countries'),
('Equity Bank Group',                          'Equity',    'commercial_bank',  'Kenya',       ARRAY['East Africa'],              'https://equitygroupholdings.com',1984,5.0, NULL,  'East Africa SME and retail bank'),
('Access Bank',                                'Access',    'commercial_bank',  'Nigeria',     ARRAY['Africa'],                   'https://accessbankplc.com', 1989, 15.0,   'B-',  NULL),
('Zenith Bank',                                'Zenith',    'commercial_bank',  'Nigeria',     ARRAY['Nigeria','West Africa'],    'https://zenithbank.com',    1990, 12.0,   'B-',  NULL),
('Absa Group',                                 'Absa',      'commercial_bank',  'South Africa',ARRAY['Africa'],                   'https://absa.africa',       1991, 90.0,   'BB',  'Formerly Barclays Africa'),

-- MICROFINANCE
('Kiva',                                       'Kiva',      'microfinance',     'USA',         ARRAY['Global','Africa','Asia'],   'https://kiva.org',          2005, 0.2,    NULL,  'Crowdfunded microloans, 0% to borrower'),
('FINCA International',                        'FINCA',     'microfinance',     'USA',         ARRAY['Africa','Asia','Latin America'],'https://finca.org',      1984, 0.8,    NULL,  '23 countries, microfinance institution'),
('Grameen Foundation',                         'Grameen',   'microfinance',     'USA',         ARRAY['Africa','Asia'],            'https://grameenfoundation.org',1997,0.1,  NULL,  'Poverty-focused microfinance'),
('Opportunity International',                  'OI',        'microfinance',     'USA',         ARRAY['Africa','Asia'],            'https://opportunity.org',   1971, 0.5,    NULL,  NULL),

-- ACCELERATORS / INNOVATION FUNDS
('Y Combinator',                               'YC',        'accelerator',      'USA',         ARRAY['Global'],                   'https://ycombinator.com',   2005, NULL,   NULL,  '$500K for 7%, top global accelerator'),
('Techstars',                                  'Techstars', 'accelerator',      'USA',         ARRAY['Global'],                   'https://techstars.com',     2006, NULL,   NULL,  NULL),
('Founders Factory Africa',                    'FFA',       'accelerator',      'South Africa',ARRAY['Africa'],                   'https://foundersfactory.com',2015,NULL,   NULL,  'Africa-focused venture studio'),
('Catalyst Fund',                              'Catalyst',  'accelerator',      'USA',         ARRAY['Africa','Asia'],            'https://catalystfund.org',  2016, NULL,   NULL,  'Inclusive fintech accelerator'),

-- STOCK EXCHANGES
('New York Stock Exchange',                    'NYSE',      'stock_exchange',   'USA',         ARRAY['Global'],                   'https://nyse.com',          1792, NULL,   NULL,  'Largest exchange by market cap'),
('NASDAQ',                                     'NASDAQ',    'stock_exchange',   'USA',         ARRAY['Global'],                   'https://nasdaq.com',        1971, NULL,   NULL,  'Tech-heavy US exchange'),
('London Stock Exchange',                      'LSE',       'stock_exchange',   'UK',          ARRAY['Global','Africa'],          'https://londonstockexchange.com',1801,NULL,NULL, 'Many African companies listed'),
('Johannesburg Stock Exchange',                'JSE',       'stock_exchange',   'South Africa',ARRAY['Africa'],                   'https://jse.co.za',         1887, NULL,   NULL,  'Largest African exchange'),
('Nigerian Exchange Group',                    'NGX',       'stock_exchange',   'Nigeria',     ARRAY['Nigeria','West Africa'],    'https://ngxgroup.com',      1960, NULL,   NULL,  'Formerly Nigerian Stock Exchange'),
('Nairobi Securities Exchange',                'NSE_Kenya', 'stock_exchange',   'Kenya',       ARRAY['Kenya','East Africa'],      'https://nse.co.ke',         1954, NULL,   NULL,  NULL),
('Ghana Stock Exchange',                       'GSE',       'stock_exchange',   'Ghana',       ARRAY['Ghana','West Africa'],      'https://gse.com.gh',        1990, NULL,   NULL,  NULL),
('Casablanca Stock Exchange',                  'CSE',       'stock_exchange',   'Morocco',     ARRAY['Morocco','North Africa'],   'https://casablanca-bourse.com',1929,NULL,  NULL,  'Largest in North Africa'),
('Egyptian Exchange',                          'EGX',       'stock_exchange',   'Egypt',       ARRAY['Egypt','North Africa'],     'https://egx.com.eg',        1883, NULL,   NULL,  NULL);
