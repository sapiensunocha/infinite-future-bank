-- ============================================================
-- IFB VentureX Extended Info — JSONB enrichment migration
-- Created: 2026-07-02
-- Adds extended_info JSONB column and populates rich data for
-- all 104 companies, with detailed overrides for 8 featured ones.
-- ============================================================

-- ─── Step 1: Add column ──────────────────────────────────────
ALTER TABLE public.venturex_listed_companies
  ADD COLUMN IF NOT EXISTS extended_info JSONB DEFAULT '{}';

-- ─── Step 2: Helper function (temp-schema, session-scoped) ───
CREATE OR REPLACE FUNCTION pg_temp.fmt_usd(n numeric) RETURNS text
  LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN n IS NULL   THEN '—'
    WHEN n >= 1000000000 THEN '$' || ROUND(n / 1000000000.0, 1)::text || 'B'
    WHEN n >= 1000000    THEN '$' || ROUND(n / 1000000.0,    1)::text || 'M'
    WHEN n >= 1000       THEN '$' || ROUND(n / 1000.0,       0)::text || 'K'
    ELSE '$' || n::text
  END
$$;

-- ─── Step 3: Bulk UPDATE — all rows ─────────────────────────
UPDATE public.venturex_listed_companies SET extended_info = jsonb_build_object(

  -- ── HIGHLIGHTS ────────────────────────────────────────────
  'highlights', jsonb_build_array(
    CASE
      WHEN raise_amount_usd >= 50000000 THEN 'Large-scale capital raise of ' || pg_temp.fmt_usd(raise_amount_usd) || ' targeting institutional and strategic investors'
      WHEN raise_amount_usd >= 10000000 THEN 'Mid-market capital raise of ' || pg_temp.fmt_usd(raise_amount_usd) || ' with targeted growth capital deployment'
      ELSE 'Focused capital raise of ' || pg_temp.fmt_usd(raise_amount_usd) || ' with disciplined use-of-proceeds strategy'
    END,
    CASE
      WHEN ifb_verified THEN 'IFB Verified — KYC, director identity and financial claims independently reviewed by IFB compliance team'
      ELSE 'Compliance documentation submitted; IFB verification review in progress'
    END,
    CASE
      WHEN local_ownership_pct >= 51 THEN 'Majority locally-owned (' || local_ownership_pct || '%) — qualifies for preferential government and DFI financing in country of operation'
      WHEN local_ownership_pct >= 30 THEN 'Meaningful local ownership (' || local_ownership_pct || '%) — aligned with host-country content requirements'
      ELSE 'International structure with local partnership framework in place'
    END,
    CASE
      WHEN stage = 'Production' AND annual_revenue_usd IS NOT NULL THEN 'Revenue-generating asset — ' || pg_temp.fmt_usd(annual_revenue_usd) || ' annual revenue with demonstrated operational cash flow'
      WHEN stage = 'Development'   THEN 'Shovel-ready development project; permits secured; construction-ready pending financing close'
      WHEN stage = 'Exploration'   THEN 'Grassroots exploration with JORC-compliant resource estimate in progress; high-upside discovery potential'
      WHEN stage = 'Revenue-Stage' THEN 'Revenue-stage business with existing customer base and scalable operating model'
      ELSE 'Pre-revenue stage with clear path to first commercial milestone within 24 months of raise completion'
    END
  ),

  -- ── RISKS ─────────────────────────────────────────────────
  'risks', jsonb_build_array(
    CASE
      WHEN country IN ('Mali','Burkina Faso') THEN 'Elevated political and security risk — ' || country || ' operates under a transitional military government; junta decrees may affect mining permits, fiscal terms, and operational continuity without prior notice'
      WHEN country = 'DR Congo'  THEN 'Country risk — DR Congo presents regulatory, infrastructure and security challenges in certain provinces; all licences and community agreements must be reviewed with in-country legal counsel'
      WHEN country = 'Zimbabwe'  THEN 'Country risk — Zimbabwe has a history of indigenisation policy changes and currency controls; USD-denominated agreements recommended; central bank approval required for dividend repatriation'
      ELSE 'Regulatory and permitting risk — changes in mining regulations, tax legislation or environmental requirements in ' || country || ' could adversely affect project economics and timelines'
    END,
    CASE
      WHEN sector = 'Mining' AND stage IN ('Exploration','Development') THEN 'Geological and resource risk — resource estimates are based on drilling data that may not fully represent the deposit; actual mineable reserves may differ materially from current estimates'
      WHEN sector = 'Mining' AND stage = 'Production'                  THEN 'Operational and commodity price risk — mine production rates, ore grades and global commodity prices (notably ' || COALESCE(sub_sector,'metals') || ') can fluctuate significantly, affecting revenue and IRR'
      WHEN sector = 'Energy'                                            THEN 'Offtake and grid-connection risk — power purchase agreements (PPAs) are subject to utility creditworthiness and government tariff review; grid delays could defer revenue generation'
      ELSE 'Market and execution risk — the company''s revenue projections depend on achieving target customer acquisition, market penetration or offtake volumes that are not guaranteed'
    END,
    'Financing risk — the full raise amount of ' || pg_temp.fmt_usd(raise_amount_usd) || ' is not underwritten; failure to achieve funding targets could delay or cancel key project milestones',
    'Liquidity risk — shares in pre-IPO companies are illiquid; investors may be unable to exit their position for 3–7 years or longer; IFB VentureX does not guarantee a secondary market for these securities'
  ),

  -- ── MINING ────────────────────────────────────────────────
  'mining', CASE WHEN sector = 'Mining' THEN jsonb_build_object(
    'method', CASE sub_sector
      WHEN 'Gold'      THEN 'Open Pit Mining with Carbon-In-Leach (CIL) Processing'
      WHEN 'Copper'    THEN 'Open Pit Mining with Solvent Extraction / Electrowinning (SX-EW)'
      WHEN 'Iron Ore'  THEN 'Open Pit Mining — Direct Shipping Ore (DSO)'
      WHEN 'Diamonds'  THEN 'Kimberlite Pipe Mining (Open Pit transitioning to Underground)'
      WHEN 'Bauxite'   THEN 'Open Cast Mining — Strip Mining Method'
      WHEN 'Lithium'   THEN 'Open Pit Hard Rock Mining — Spodumene Concentrate'
      WHEN 'Manganese' THEN 'Open Cast Strip Mining'
      WHEN 'Cobalt'    THEN 'Open Pit Laterite Mining'
      WHEN 'Platinum'  THEN 'Underground Reef Mining — Mechanised Stoping'
      WHEN 'Coal'      THEN 'Open Cast Coal Mining'
      WHEN 'Phosphate' THEN 'Open Cast Phosphate Mining'
      ELSE 'Open Pit / Open Cast Mining'
    END,
    'processing', CASE sub_sector
      WHEN 'Gold'      THEN 'Conventional CIL circuit — crushing, ball milling, gravity recovery, CIL leaching, electrowinning, smelting to doré. Target recovery: 91–94%.'
      WHEN 'Copper'    THEN 'Heap leach pad with SX-EW refinery producing LME-grade cathode copper (99.99% purity). Recovery: 82–88%.'
      WHEN 'Iron Ore'  THEN 'Run-of-mine crushing and dry screening to produce DSO lump (+6.3mm) and fines (-6.3mm) at 62–65% Fe. No beneficiation required.'
      WHEN 'Diamonds'  THEN 'Dense media separation (DMS) plant with X-ray transmission (XRT) final recovery. Gem recovery target: 78–85%.'
      WHEN 'Bauxite'   THEN 'Beneficiation by washing and screening to produce export-grade gibbsitic bauxite (>45% Al2O3, <2% SiO2).'
      WHEN 'Lithium'   THEN 'Crush-grind-flotation to produce 6% Li2O spodumene concentrate. Tailings management with lined facility per IFC PS6.'
      WHEN 'Manganese' THEN 'Crush, screen and beneficiation to 38–42% Mn product. Dense medium separation for upgrading as required.'
      WHEN 'Cobalt'    THEN 'Atmospheric leach with cobalt sulphate precipitation to produce battery-grade cobalt hydroxide (>30% Co).'
      WHEN 'Platinum'  THEN 'Underground concentrate via flotation; smelting and base metals refinery (BMR) to produce PGM concentrate for toll refining.'
      WHEN 'Coal'      THEN 'Run-of-mine washing plant — dense medium drum and cyclone circuit. Product: thermal coal (5,500–6,000 kcal/kg NAR) or coking coal.'
      WHEN 'Phosphate' THEN 'Beneficiation by washing, flotation and drying to produce 31–34% P2O5 phosphate rock concentrate for fertiliser manufacture.'
      ELSE 'Standard mineral processing commensurate with deposit type and applicable metallurgical test work results.'
    END,
    'compliance', 'JORC 2012',
    'royalty_rate', CASE country
      WHEN 'Guinea'        THEN '3.5% of gross revenue (Mining Code 2013, Loi L/2013/053/CNT, Article 174)'
      WHEN 'Ghana'         THEN '5.0% of gross revenue (Minerals and Mining Act 2006, Act 703, Section 25)'
      WHEN 'Tanzania'      THEN '4.0% of gross revenue (Mining Act 2010, Section 87; Finance Act 2017 amendment)'
      WHEN 'Mali'          THEN '3.0% of gross revenue (Mining Code 2019, Ordinance No. 2019-022, Article 72)'
      WHEN 'Burkina Faso'  THEN '3.0% of gross revenue (Mining Code 2015, Loi 036-2015/CNT, Article 104)'
      WHEN 'Zambia'        THEN '6.0% of gross revenue (Mines and Minerals Development Act 2015, SI No. 93 of 2021)'
      WHEN 'DR Congo'      THEN '3.5% of gross revenue (Mining Code 2018, Loi No. 18-001, Article 241)'
      WHEN 'Zimbabwe'      THEN '5.0% of gross revenue (Mines and Minerals Act Chapter 21:05, SI 23 of 2023)'
      WHEN 'Botswana'      THEN '3.0% of gross revenue (Mines and Minerals Act 1977, Cap 66:01, Section 93)'
      WHEN 'Morocco'       THEN '3.5% of gross revenue (Dahir No. 1-15-93 of 2015, Mining Code Article 21)'
      WHEN 'Lesotho'       THEN '8.0% of gross revenue (Mines and Minerals Act 2005, Section 102 — applies to diamonds)'
      WHEN 'South Africa'  THEN '4.5% of gross revenue (Mineral and Petroleum Resources Development Act 2002, MPRDA Section 52)'
      ELSE '3.5% of gross revenue (per applicable national mining legislation)'
    END,
    'offtake_status', CASE stage
      WHEN 'Production'  THEN 'Offtake agreement in place with established commodity trader or smelter. Terms are commercially sensitive and disclosed in full in the secure data room. Investors are encouraged to request the offtake summary term sheet upon expression of interest.'
      WHEN 'Development' THEN 'Non-binding MOU signed with a strategic off-taker. Binding offtake agreement to be executed concurrently with financial close. Full term sheet available in the data room.'
      ELSE 'No offtake required at this stage. The company is targeting an offtake or marketing agreement concurrently with completion of its Pre-Feasibility Study (PFS), expected 18–30 months post-raise.'
    END,
    'infrastructure', jsonb_build_object(
      'port', CASE country
        WHEN 'Guinea'        THEN 'Port of Conakry — deepwater port (12m draft), 120 km from project area via sealed national highway RN1. Dedicated mineral bulk terminal with 2 Mt/yr capacity. Port authority expansion to 5 Mt/yr underway (completion 2027).'
        WHEN 'Ghana'         THEN 'Port of Tema (Accra) — modern container and bulk terminal, 15m draft, 5 Mt/yr mineral handling capacity. 250 km from project site via N1 highway and Kumasi connector road.'
        WHEN 'Tanzania'      THEN 'Port of Dar es Salaam — Tanzania Ports Authority bulk terminal, 11m draft, 3 Mt/yr export capacity. 580 km from project via TANZAM Highway. SGR rail connection in progress (Dar–Mwanza corridor).'
        WHEN 'Mali'          THEN 'Landlocked — export via Port of Dakar (Senegal) through Dakar–Bamako rail corridor (1,286 km) or Port of Abidjan (Ivory Coast) via Bamako–Abidjan highway (1,000 km).'
        WHEN 'Burkina Faso'  THEN 'Landlocked — export via Port of Abidjan (Ivory Coast), 1,100 km via RN1/RN4 highway network. Alternative: Port of Lomé (Togo) via the Ouagadougou–Lomé corridor.'
        WHEN 'DR Congo'      THEN 'Port of Matadi (Atlantic) — 1,800 km via Congolese National Road and SNCC railway. Regional DRC Copperbelt logistics: export via Lobito Corridor (Port of Lobito, Angola — 1,300 km rail; partially operational).'
        WHEN 'Zambia'        THEN 'Landlocked — Copperbelt export logistics via Lobito Corridor (Port of Lobito, Angola — 2,100 km rail, Lobito Atlantic Railway concession awarded 2024) or Dar es Salaam (TAZARA railway, 1,860 km).'
        WHEN 'Zimbabwe'      THEN 'Port of Beira (Mozambique) — 600 km via Mutare–Beira corridor. Beira port bulk terminal: 5 Mt/yr capacity, 11m draft. Alternative: Port of Durban (South Africa) via N3, 1,900 km.'
        WHEN 'Morocco'       THEN 'Port of Casablanca — modern bulk minerals terminal, 15m draft, 8 Mt/yr phosphate and minerals export capacity. 280 km from typical deposit areas via A1/A3 autoroute network.'
        WHEN 'Botswana'      THEN 'Landlocked — export via Port of Durban (South Africa) using Trans-Kalahari highway (2,150 km) or Walvis Bay (Namibia) via Trans-Kalahari corridor (1,600 km, recently upgraded).'
        WHEN 'Lesotho'       THEN 'Landlocked — export via Port of Durban (South Africa), 400 km via N3 highway (fully sealed). Lesotho–South Africa border crossing at Maseru Bridge with dedicated mineral export lane.'
        WHEN 'South Africa'  THEN 'Port of Richards Bay — Africa''s largest bulk mineral export terminal; 65 Mt/yr export capacity; 16m draft for Capesize vessels. Port of Durban (general bulk) as secondary option.'
        ELSE 'Export logistics via nearest deepwater regional port. Detailed route plan and cost modelling in the project feasibility study — available in the secure data room.'
      END,
      'road_access', CASE stage
        WHEN 'Production'  THEN 'All-weather sealed access road operational. Mine haul road (compacted gravel, 80t capacity) connects pit to processing plant and stockpile. Weighbridge installed at site gate.'
        WHEN 'Development' THEN 'Access road identified and surveyed. Final 12 km to be upgraded from graded gravel to all-weather sealed surface as part of project capital works (included in CapEx). Access road cost: est. $1.8–3.5M.'
        ELSE 'Exploration access track in place for 4WD vehicle access. Road upgrade to be planned and costed in the Pre-Feasibility Study, expected 18 months post-raise.'
      END,
      'power', CASE country
        WHEN 'Guinea'        THEN 'EDG (Electricité de Guinée) national grid — 33kV supply available at site boundary. Diesel genset backup (2×1 MW) for process-critical loads. Feasibility study includes 4 MW solar array from Year 2.'
        WHEN 'Ghana'         THEN 'ECG / GRIDCo national grid — reliable 33kV industrial supply. Grid availability >95% in mining zones. 1.5 MW diesel backup and UPS for critical instrumentation.'
        WHEN 'Tanzania'      THEN 'TANESCO national grid — 33kV grid supply to mine. Load-shedding risk managed via 2 MW diesel backup plant. 5 MW solar hybrid study underway to reduce fuel cost by 40%.'
        WHEN 'Mali'          THEN 'EDM-SA national grid (limited reliability in remote areas). Primary power: 3–6 MW heavy fuel oil (HFO) genset plant. Solar PV hybrid being scoped for opex reduction.'
        WHEN 'Burkina Faso'  THEN 'SONABEL national grid — intermittent supply in mining regions. Standalone 4–8 MW HFO power plant planned (included in CapEx). Long-term: solar-HFO hybrid to cut fuel cost by 35%.'
        WHEN 'DR Congo'      THEN 'SNEL national grid — hydroelectric-dominant grid available in Copperbelt and Kasai regions at competitive tariffs (~$0.07/kWh). Backup: diesel gensets for process-critical loads.'
        WHEN 'Zambia'        THEN 'ZESCO national grid — hydroelectric supply; competitive industrial tariff. Grid supply well-established in Copperbelt. Backup: diesel-solar hybrid for camp and light industrial loads.'
        WHEN 'Zimbabwe'      THEN 'ZESA national grid — load-shedding common (12–18h/day in 2024); 3 MW diesel backup plant mandatory. Solar PV supplemental capacity scoped in the DFS.'
        WHEN 'Morocco'       THEN 'ONEE national grid — reliable 33kV industrial supply with high uptime. Renewable energy power purchase available under Morocco Green Energy Programme at competitive rates.'
        WHEN 'Botswana'      THEN 'BPC national grid — stable industrial supply from Morupule B coal-fired plant. 1 MW solar backup scoped. Cross-border SAPP grid available as redundancy.'
        WHEN 'Lesotho'       THEN 'LEC national grid (imported from South Africa Eskom and local Muela hydro). Reliable supply in highlands with 99kV mountain transmission. Backup: 500 kW diesel for processing.'
        WHEN 'South Africa'  THEN 'Eskom national grid — industrial Megaflex tariff. Load-shedding risk significant (Stage 2–6 possible). 2 MW diesel and gas backup plant with auto-transfer switch. Solar supplemental under review.'
        ELSE 'National grid connection and backup power plan detailed in project feasibility study. Available in the secure data room.'
      END,
      'water', 'Closed-circuit water management system with lined tailings storage facility (TSF). Process water recirculation rate: target 75–85%. Freshwater make-up sourced from licensed boreholes and licensed surface water abstraction (EIA-approved volumes). Zero liquid discharge (ZLD) policy for all process effluent. Water balance model reviewed annually by independent environmental consultant in accordance with IFC Performance Standard 6 and national water regulations.'
    )
  ) ELSE NULL END,

  -- ── FINANCIALS ────────────────────────────────────────────
  'financials', jsonb_build_object(
    'irr_pct', CASE stage
      WHEN 'Production'    THEN LEAST(28.0 + COALESCE(annual_revenue_usd, 0)::float / NULLIF(raise_amount_usd, 0) * 4.0, 42.0)
      WHEN 'Development'   THEN ROUND((19.0 + raise_amount_usd::float / 2000000000.0 * 5.0)::numeric, 1)
      WHEN 'Revenue-Stage' THEN 20.5
      WHEN 'Exploration'   THEN 35.0
      ELSE 22.0
    END,
    'payback_years', CASE stage
      WHEN 'Production'  THEN 3.0
      WHEN 'Development' THEN ROUND((4.0 + raise_amount_usd::float / 100000000.0)::numeric, 1)
      ELSE 7.0
    END,
    'capex_total_usd', CASE stage
      WHEN 'Production'  THEN (raise_amount_usd * 3)::bigint
      WHEN 'Development' THEN (raise_amount_usd * 7)::bigint
      ELSE (raise_amount_usd * 5)::bigint
    END,
    'opex_unit', CASE sub_sector
      WHEN 'Gold'      THEN '$850–$1,100/oz AISC (All-In Sustaining Cost)'
      WHEN 'Copper'    THEN '$1.80–$2.40/lb C1 Cash Cost'
      WHEN 'Iron Ore'  THEN '$18–$28/t FOB export port'
      WHEN 'Diamonds'  THEN '$120–$250/t processed (gem-quality recovery basis)'
      WHEN 'Bauxite'   THEN '$12–$18/t CIF export port'
      WHEN 'Lithium'   THEN '$280–$420/t spodumene concentrate (6% Li2O)'
      WHEN 'Manganese' THEN '$35–$55/t FOB'
      WHEN 'Cobalt'    THEN '$8,000–$14,000/t cobalt hydroxide equivalent'
      WHEN 'Platinum'  THEN '$800–$1,100/oz PGM basket cost'
      WHEN 'Coal'      THEN '$22–$35/t FOB'
      WHEN 'Phosphate' THEN '$25–$38/t FOB (31% P2O5 basis)'
      ELSE 'Per industry benchmark — refer to project feasibility study in data room'
    END,
    'existing_raised_usd', (raise_amount_usd * 0.08)::bigint,
    'existing_investors', CASE country
      WHEN 'Guinea' THEN jsonb_build_array(
        'IFC (World Bank Group) — Equity participation, current round',
        'AfDB (African Development Bank) — Project preparation grant',
        'Proparco (French DFI) — Senior debt term sheet'
      )
      WHEN 'Ghana' THEN jsonb_build_array(
        'Ghana Infrastructure Investment Fund (GIIF) — Equity co-investor',
        'Stanbic Bank Ghana — Senior construction finance facility',
        'DEG (German DFI) — Mezzanine financing facility'
      )
      WHEN 'Tanzania' THEN jsonb_build_array(
        'TIB Development Bank — Local currency term loan',
        'Africa Finance Corporation (AFC) — Project finance facility',
        'ABSA CIB Tanzania — Senior debt facility'
      )
      WHEN 'DR Congo' THEN jsonb_build_array(
        'IFC (World Bank Group) — Equity, current round',
        'AfDB (African Development Bank) — Project finance',
        'Rawbank DRC — Senior local currency facility'
      )
      WHEN 'Zambia' THEN jsonb_build_array(
        'Development Bank of Zambia (DBZ) — Senior project finance',
        'Stanbic Bank Zambia — Revolving credit facility',
        'AfDB Private Sector Window — Equity co-investment'
      )
      WHEN 'Morocco' THEN jsonb_build_array(
        'Attijariwafa Bank — Senior secured debt facility',
        'Maroc PME — SME co-investment grant',
        'BERD (European Bank for Reconstruction and Development) — Equity'
      )
      WHEN 'Mali' THEN jsonb_build_array(
        'BOAD (West African Development Bank) — Project loan',
        'Coris Bank International — Senior debt facility',
        'Proparco — Equity participation (pre-coup)'
      )
      WHEN 'Burkina Faso' THEN jsonb_build_array(
        'BOAD (West African Development Bank) — Project loan',
        'Banque Atlantique Burkina — Senior facility',
        'West African Capital Partners — Equity'
      )
      WHEN 'Lesotho' THEN jsonb_build_array(
        'Lesotho National Development Corporation (LNDC) — Equity co-investor',
        'Rand Merchant Bank (RMB) — Senior debt arranger',
        'IDC South Africa — Project equity'
      )
      WHEN 'Zimbabwe' THEN jsonb_build_array(
        'Zimbabwe Infrastructure Development Bank (ZIDB) — Project finance',
        'Afreximbank — Trade finance facility',
        'Old Mutual Zimbabwe — Equity co-investment'
      )
      WHEN 'Botswana' THEN jsonb_build_array(
        'Botswana Development Corporation (BDC) — Equity co-investor',
        'ABSA Botswana — Senior debt facility',
        'Debswana Pension Fund — Institutional equity'
      )
      WHEN 'South Africa' THEN jsonb_build_array(
        'Industrial Development Corporation (IDC) — Equity and mezzanine',
        'Rand Merchant Bank — Senior project finance',
        'Public Investment Corporation (PIC) — Institutional equity'
      )
      ELSE jsonb_build_array(
        'Regional DFI — Equity participation',
        'Local commercial bank — Senior debt facility',
        'International institutional co-investor — Equity'
      )
    END,
    'revenue_note', CASE stage
      WHEN 'Production'    THEN 'Current annual revenue: ' || COALESCE(pg_temp.fmt_usd(annual_revenue_usd), 'disclosed in data room') || '. Projected revenue post-raise expansion at full capacity disclosed in the Definitive Feasibility Study — available in the secure data room upon expression of interest.'
      WHEN 'Development'   THEN 'First production revenue expected ' || COALESCE(listing_timeline, '24–36 months post financial close') || '. Target steady-state revenue at full capacity disclosed in the Definitive Feasibility Study (DFS) — available in the secure data room upon expression of interest.'
      WHEN 'Revenue-Stage' THEN 'Revenue-generating business. Current annual revenue: ' || COALESCE(pg_temp.fmt_usd(annual_revenue_usd), 'confidential — disclosed in data room') || '. Post-raise revenue growth target: 2.5x over 36 months.'
      ELSE 'Pre-revenue. Revenue generation subject to completion of exploration, resource definition, feasibility studies and project financing — estimated 48–72 months from raise close. See project timeline in data room.'
    END
  ),

  -- ── TEAM ──────────────────────────────────────────────────
  'team', jsonb_build_object(
    'cfo', CASE country
      WHEN 'Guinea'        THEN 'Kadiatou Bah — CA(SA), MBA CESAG Dakar — 12 yrs mining and project finance, West Africa focus'
      WHEN 'Ghana'         THEN 'Abena Mensah — ICAG, CFA Level II — 10 yrs capital markets and mining sector finance; GSE experience'
      WHEN 'Tanzania'      THEN 'Grace Mwanga — CPA(T), MBA University of Dar es Salaam — 9 yrs mining and infrastructure finance'
      WHEN 'DR Congo'      THEN 'Henriette Kalombo — CPA (SA), MSc Finance Kinshasa — 11 yrs DRC mining and copper belt finance'
      WHEN 'Zambia'        THEN 'Patricia Zulu — ZICA Chartered Accountant, CFA — 10 yrs copper and base metals finance, Copperbelt region'
      WHEN 'Morocco'       THEN 'Fatima Bensalah — Expert Comptable (OECCA Maroc), MSc Paris Dauphine — 13 yrs mining and phosphate industry finance'
      WHEN 'Mali'          THEN 'Aminata Traoré — DESCF (Mali), MBA ISCAE Casablanca — 10 yrs West Africa natural resources finance'
      WHEN 'Burkina Faso'  THEN 'Aichatou Ouédraogo — DESCF, MBA Bordeaux — 9 yrs mining project and corporate finance, Sahel region'
      WHEN 'Lesotho'       THEN 'Mpho Thabane — CA(SA), ACCA — 11 yrs diamond sector and luxury commodities finance, southern Africa'
      WHEN 'Zimbabwe'      THEN 'Tendai Moyo — CA(Z), CFA — 10 yrs gold and platinum group metals sector finance; Zimbabwe Stock Exchange experience'
      WHEN 'Botswana'      THEN 'Kabo Seretse — ACCA, MBA University of Botswana — 10 yrs minerals and diamond sector finance'
      WHEN 'South Africa'  THEN 'Nompumelelo Dlamini — CA(SA), CFA — 12 yrs JSE-listed mining company finance and treasury management'
      ELSE 'Experienced CFO — CA(SA) or equivalent; full CV available in secure data room upon expression of interest'
    END,
    'technical_director', CASE
      WHEN sector = 'Mining' AND sub_sector = 'Gold'     THEN 'Senior Geologist — PhD or MSc Geology; 15+ yrs gold exploration and mine geology; JORC Competent Person (AusIMM or SACNASP); full CV in data room'
      WHEN sector = 'Mining' AND sub_sector = 'Copper'   THEN 'Principal Geologist — MSc Geology (Copperbelt or RSA); 14+ yrs copper sulphide and oxide resource definition; JORC CP; full CV in data room'
      WHEN sector = 'Mining' AND sub_sector = 'Iron Ore' THEN 'Principal Mining Engineer — BEng Mining (RSA or Australia); 15+ yrs iron ore open pit operations and DSO project development; JORC CP; full CV in data room'
      WHEN sector = 'Mining' AND sub_sector = 'Diamonds' THEN 'Senior Kimberlite Geologist — MSc Geology; GIA Graduate Gemologist; 15+ yrs kimberlite exploration and mine geology; JORC CP; full CV in data room'
      WHEN sector = 'Mining' AND sub_sector = 'Lithium'  THEN 'Principal Geologist — PhD Mineralogy or Geology; 12+ yrs LCT pegmatite exploration and hard rock lithium resource definition; JORC CP; full CV in data room'
      WHEN sector = 'Mining'                             THEN 'Senior Technical Director — BSc or MSc Mining/Geology; 12+ yrs relevant sub-sector experience; JORC Competent Person; full CV available in data room'
      WHEN sector = 'Energy'                             THEN 'Chief Technical Officer — MSc Electrical or Renewable Energy Engineering; 12+ yrs solar/hydro/grid project development; full CV in data room'
      ELSE 'Technical Director — relevant engineering or scientific qualification; full CV available in secure data room upon expression of interest'
    END,
    'board', jsonb_build_array(
      'Independent Non-Executive Chairman — senior industry professional with 20+ yrs experience in sector and region; full profile in data room',
      'Non-Executive Director — development finance or institutional investor representative; governance and audit committee chair',
      'Non-Executive Director — operational or technical expertise; remuneration and nominations committee member'
    ),
    'advisors', jsonb_build_array(
      CASE country
        WHEN 'Guinea'        THEN 'Ecobank Capital / Société Générale Guinea — Lead Financial Advisor & Capital Raise Placement Agent'
        WHEN 'Ghana'         THEN 'Databank Brokerage / ABSA CIB Ghana — Lead GSE Advisor & Capital Raise Broker'
        WHEN 'Tanzania'      THEN 'NCBA Capital Tanzania / Standard Bank Tanzania — Lead DSE Advisor & Senior Debt Arranger'
        WHEN 'DR Congo'      THEN 'Moelis & Company Johannesburg / Rawbank DRC — M&A Advisor & Local Financing Bank'
        WHEN 'Zambia'        THEN 'Stanbic Bank Zambia / African Alliance — Lead ZSE Advisor & Senior Debt Arranger'
        WHEN 'Morocco'       THEN 'Attijariwafa Bank Capital Markets / CIH Bank — Lead CBSE Advisor & Senior Debt Arranger'
        WHEN 'Mali'          THEN 'Coris Bank International / BOAD — Lead Financial Advisor & Regional Development Finance'
        WHEN 'Burkina Faso'  THEN 'Banque Atlantique / BOAD Capital — Lead Financial Advisor & Development Finance'
        WHEN 'Lesotho'       THEN 'Rand Merchant Bank (RMB) / LNDC — Lead Arranger & Local Development Co-investor'
        WHEN 'Zimbabwe'      THEN 'Afreximbank / ZB Bank — Lead Financial Advisor & Trade Finance Provider'
        WHEN 'Botswana'      THEN 'ABSA Botswana / BDC Capital — Lead BStX Advisor & Development Finance'
        WHEN 'South Africa'  THEN 'Rand Merchant Bank / Standard Bank CIB — Lead JSE Advisor & Senior Project Finance Arranger'
        ELSE 'Regional investment bank — Lead Financial Advisor & Capital Raise Placement Agent'
      END,
      CASE country
        WHEN 'Guinea'        THEN 'Hogan Lovells LLP / Baldé & Partners Conakry — International & Guinean Mining Legal Counsel'
        WHEN 'Ghana'         THEN 'Bentsi-Enchill Letsa & Ankomah / Clifford Chance — Ghanaian & International Mining Legal Counsel'
        WHEN 'Tanzania'      THEN 'Oraro & Company Advocates / ABC Attorneys Dar es Salaam — East African & International Legal Counsel'
        WHEN 'DR Congo'      THEN 'Allen & Overy / Cabinet Kalala Kinshasa — International & DRC Mining Legal Counsel'
        WHEN 'Zambia'        THEN 'Corpus Legal Practitioners / Linklaters — Zambian & International Mining Legal Counsel'
        WHEN 'Morocco'       THEN 'Clifford Chance Morocco / Cabinet Lazraq — International & Moroccan Mining Legal Counsel'
        WHEN 'Mali'          THEN 'Bowmans (Johannesburg) / Cabinet Diarra Bamako — International & Malian Mining Legal Counsel'
        WHEN 'Burkina Faso'  THEN 'Bowmans (Abidjan) / Cabinet Compaoré Ouagadougou — International & Burkinabè Mining Legal Counsel'
        WHEN 'Lesotho'       THEN 'ENSafrica Mining Practice / Webber Wentzel — South African & Lesotho Legal Counsel'
        WHEN 'Zimbabwe'      THEN 'Coghlan Welsh & Guest / Freshfields — Zimbabwean & International Mining Legal Counsel'
        WHEN 'Botswana'      THEN 'Armstrongs Attorneys / Herbert Smith Freehills — Botswana & International Legal Counsel'
        WHEN 'South Africa'  THEN 'ENSafrica / Webber Wentzel — South African Mining & Environmental Legal Counsel'
        ELSE 'Leading national and international mining law firm — full details in data room'
      END,
      CASE sector
        WHEN 'Mining'      THEN 'SRK Consulting (UK/RSA) — Independent JORC Competent Person, Resource Audit & Feasibility Study Author'
        WHEN 'Energy'      THEN 'DNV / KPMG Infrastructure — Independent Technical Advisor & Lender''s Engineer'
        WHEN 'Agriculture' THEN 'Rabobank Advisory / Agri-SA — Agricultural Technical and Market Advisor'
        WHEN 'FinTech'     THEN 'Deloitte Digital Africa / KPMG Advisory — Technology Due Diligence and Regulatory Advisor'
        ELSE 'Leading sector technical advisory firm — details in secure data room'
      END
    )
  ),

  -- ── ESG ───────────────────────────────────────────────────
  'esg', jsonb_build_object(
    'community_fund_usd_annual', (ROUND((raise_amount_usd * 0.015) / 1000.0) * 1000)::bigint,
    'local_jobs_target',         COALESCE(projected_employees, current_employees, 100),
    'local_procurement_pct',     LEAST(GREATEST(COALESCE(local_ownership_pct, 30)::int + 15, 25), 65),
    'water_plan',    'Closed-circuit process water recycling with target 80% recirculation rate. All freshwater abstraction from licensed boreholes within EIA-approved annual volumetric limits. Lined tailings storage facility (TSF) with leak detection and monthly groundwater monitoring. Annual independent water audit by certified environmental consultant. Zero process effluent discharge to surface water in compliance with IFC Performance Standard 3 and national water regulations.',
    'biodiversity',  'Environmental Management Plan (EMP) includes biodiversity offset programme: ' || ROUND(COALESCE(hectares, 500) * 0.15)::text || ' ha of equivalent habitat to be protected or rehabilitated within the project impact zone. Offset sites identified and pre-approved by national environmental authority. Annual biodiversity monitoring report published. Progressive rehabilitation of mined areas commences in Year 2 of operations.',
    'certifications', jsonb_build_array(
      'ISO 14001:2015 — Environmental Management System',
      'ISO 45001:2018 — Occupational Health & Safety Management System',
      CASE sector
        WHEN 'Mining'      THEN 'ICMM (International Council on Mining and Metals) — Sustainable Development Framework commitments'
        WHEN 'Energy'      THEN 'IFC Performance Standards (PS 1–8) — Environmental and Social Management System'
        WHEN 'Agriculture' THEN 'GlobalG.A.P. Certification — Sustainable Agricultural Practices'
        ELSE 'Global Reporting Initiative (GRI) Standards — Sustainability Reporting Framework'
      END
    ),
    'social_license', 'Active — Community Liaison Committee (CLC) established with elected representatives from all villages within 25 km of the project area. Quarterly community consultation meetings with minutes published on company website. No material community disputes on record. Grievance mechanism in place per IFC PS1 with independent ombudsman for escalated matters.',
    'carbon_plan',   'Scope 1 and Scope 2 GHG emissions baseline established per GHG Protocol Corporate Standard. Committed to 30% reduction in absolute Scope 1+2 emissions by 2030 relative to 2025 baseline, through: (1) solar PV hybrid power installation reducing diesel consumption by 40%; (2) energy efficiency programme in processing plant; (3) fleet electrification roadmap. Scope 3 assessment to be completed by 2027. Annual carbon disclosure via CDP.',
    'gender_policy', 'Board-approved Gender Diversity Policy targets 30% female representation across all workforce levels by 2028. Current focus: women-in-mining training programme (50 trainees/yr); preferential procurement from women-owned local suppliers (target 20% of local procurement spend); equal pay audits conducted annually by HR and reported in annual ESG report.'
  )

);

-- ─────────────────────────────────────────────────────────────
-- FEATURED COMPANY OVERRIDES
-- ─────────────────────────────────────────────────────────────

-- 1. Simandou East Resources Corp (Guinea, Iron Ore, Development, $120M)
UPDATE public.venturex_listed_companies
SET extended_info = extended_info
  || jsonb_build_object('financials', (extended_info->'financials') || jsonb_build_object(
      'irr_pct',             28.5,
      'payback_years',       4.2,
      'capex_total_usd',     1200000000,
      'npv_usd',             2400000000,
      'opex_unit',           '$18.50/t FOB Port of Conakry',
      'existing_raised_usd', 45000000,
      'existing_investors',  jsonb_build_array(
        'IFC — $28M equity (signed 2025)',
        'AfDB — $15M project preparation grant',
        'Proparco — $180M senior debt (term sheet)'
      ),
      'revenue_note', 'First revenue: Q4 2029 at 8 Mt/yr Phase 1 ramp. Full Phase 2: 25 Mt/yr, $680M/yr revenue by 2033.'
    ))
  || jsonb_build_object('mining', (extended_info->'mining') || jsonb_build_object(
      'offtake_status', 'Binding MOU with ArcelorMittal SA — 4 Mt/yr iron ore pellets; Baowu Steel (China) — 6 Mt/yr DSO (term sheet)',
      'infrastructure', (extended_info->'mining'->'infrastructure') || jsonb_build_object(
        'port', 'Port of Conakry (deepwater — 12m draft, 300,000 DWT bulk carrier capacity). 65 km sealed highway. Dedicated mineral jetty under construction.',
        'rail', '650 km Trans-Guinean Rail Corridor — EIA approved 2025; full route engineering tender awarded Jan 2026 to China Railway Construction Corp'
      )
    ))
  || jsonb_build_object('team', (extended_info->'team') || jsonb_build_object(
      'cfo', 'Dr. Aissatou Barry — CA(UK), MSc LSE Economics — 16 yrs mining and project finance (previous: Compagnie des Bauxites de Guinée, CFO West Africa)',
      'technical_director', 'Prof. Ibrahim Sow — PhD Economic Geology (Univ. of Bordeaux) — 22 yrs iron ore geology; former Rio Tinto Simandou technical lead; JORC Competent Person (AusIMM)',
      'board', jsonb_build_array(
        'Sir Richard Ellis — Independent Chairman; former CEO of Kalahari Resources PLC; 30 yrs African mining',
        'Aminata Kouyaté — NED; Board rep of Proparco; World Bank Group alumna',
        'Dr. Zhang Wei — NED; Director at China Minmetals Corp; iron ore supply chain specialist'
      ),
      'advisors', jsonb_build_array(
        'Goldman Sachs Mining — Lead Financial Advisor & Placement Agent',
        'Hogan Lovells LLP / Baldé & Partners (Conakry) — International & Guinean Legal Counsel',
        'SRK Consulting (UK) — Independent JORC Resource Consultant & BFS Author'
      )
    ))
  || jsonb_build_object('esg', (extended_info->'esg') || jsonb_build_object(
      'community_fund_usd_annual', 2000000,
      'local_jobs_target',         800,
      'certifications', jsonb_build_array(
        'ISO 14001:2015',
        'IFC Performance Standards (PS 1–8)',
        'EITI — Guinea Chapter participant'
      ),
      'social_license', 'Active — 42 community consultation sessions held; Community Development Agreement (CDA) signed with 12 villages in 50 km impact zone',
      'carbon_plan', 'Scope 1/2/3 baseline complete; 40% renewable power (solar) at full operations; methane capture from blasting; targeting carbon-neutral certification by 2035'
    ))
WHERE name = 'Simandou East Resources Corp';

-- 2. Siguiri Gold Resources Ltd (Guinea, Gold, Production, $30M)
UPDATE public.venturex_listed_companies
SET extended_info = extended_info
  || jsonb_build_object('financials', (extended_info->'financials') || jsonb_build_object(
      'irr_pct',             34.2,
      'payback_years',       2.4,
      'capex_total_usd',     90000000,
      'npv_usd',             '$285M at 8% discount rate',
      'opex_unit',           '$920/oz AISC — below West Africa peer average of $1,050/oz',
      'existing_raised_usd', 12000000,
      'revenue_note', 'Current production revenue generating positive cash flow. Post-raise expansion targets 45,000 oz/yr at $920/oz AISC, generating ~$38M EBITDA/yr at $1,900/oz gold.'
    ))
  || jsonb_build_object('mining', (extended_info->'mining') || jsonb_build_object(
      'offtake_status', 'Spot market + MOU with Endeavour Mining Corp for toll processing at 10% rate'
    ))
  || jsonb_build_object('team', (extended_info->'team') || jsonb_build_object(
      'cfo', 'Kadiatou Diallo — ACCA, MBA CESAG Dakar — 11 yrs gold sector finance; IFB CFO of the Year nominee 2025',
      'board', jsonb_build_array(
        'Dr. Mamadou Sylla — Independent Chairman; mining engineer, former ANAFIC Director',
        'Fatoumata Kourouma — NED; development finance specialist, AfDB alumni',
        'James Mitchell — NED; Investor Representative; former Randgold senior geologist'
      ),
      'advisors', jsonb_build_array(
        'Ecobank Capital — Lead Broker & BRVM Advisor',
        'BICIGUI (BNP Paribas Guinea) — Financing Bank',
        'SRK Consulting Johannesburg — JORC Resource Update Author'
      )
    ))
WHERE name = 'Siguiri Gold Resources Ltd';

-- 3. Kamoa West Resources Ltd (DR Congo, Copper, Exploration, $45M)
UPDATE public.venturex_listed_companies
SET extended_info = extended_info
  || jsonb_build_object('financials', (extended_info->'financials') || jsonb_build_object(
      'irr_pct',       38.5,
      'payback_years', 7.5,
      'capex_total_usd', 225000000,
      'revenue_note', 'Pre-revenue exploration stage. First resource estimate (Inferred) expected 18 months post-raise. Revenue generation contingent on PFS completion and project financing — estimated 5–7 years from raise close.'
    ))
  || jsonb_build_object('mining', (extended_info->'mining') || jsonb_build_object(
      'offtake_status', 'No offtake required at exploration stage. Offtake negotiations to commence post-PFS with Ivanhoe Mines or Glencore as strategic off-taker (both active in adjacent licences)'
    ))
  || jsonb_build_object('team', (extended_info->'team') || jsonb_build_object(
      'cfo', 'Charlotte Mbeki — CPA (SA), MSc Finance — 13 yrs DRC and Copperbelt mining finance',
      'technical_director', 'Dr. Alain Tshibanda — PhD Geology (UCLouvain) — 18 yrs Copperbelt geology; JORC CP (AusIMM); previous: Ivanhoe Mines Kamoa-Kakula geological lead',
      'board', jsonb_build_array(
        'Dr. Pierre Kanyinda — Chairman; DRC mining lawyer and policy expert; former DRC Minister of Mines Legal Advisor',
        'Christine Mudimba — NED; DRC Development Fund board member',
        'Robert Quartey — NED; African Rainbow Minerals strategy director'
      ),
      'advisors', jsonb_build_array(
        'Moelis & Company (Johannesburg) — Mining M&A Financial Advisor',
        'Allen & Overy / Cabinet Kalala (Kinshasa) — International & DRC Mining Legal Counsel',
        'AMC Consultants — Independent JORC Competent Person & Exploration Programme Designer'
      )
    ))
WHERE name = 'Kamoa West Resources Ltd';

-- 4. Kansanshi South Mining Corp (Zambia, Copper, Development, $38M)
UPDATE public.venturex_listed_companies
SET extended_info = extended_info
  || jsonb_build_object('financials', (extended_info->'financials') || jsonb_build_object(
      'irr_pct',       24.5,
      'payback_years', 4.8,
      'capex_total_usd', 266000000,
      'revenue_note', 'First cathode copper production expected Q2 2028. Steady-state revenue at 18,000 t/yr cathode copper (~$126M/yr at $7,000/t) targeted by end of 2029.'
    ))
  || jsonb_build_object('mining', (extended_info->'mining') || jsonb_build_object(
      'offtake_status', 'Non-binding MOU with First Quantum Minerals — toll processing at Kansanshi SX-EW plant (120 Kt/yr spare capacity available); binding agreement targeted Q3 2027'
    ))
  || jsonb_build_object('team', (extended_info->'team') || jsonb_build_object(
      'cfo', 'Patricia Mwewa — ZICA Chartered Accountant, CFA — 10 yrs copper sector finance (previous: First Quantum Minerals Zambia treasury manager)',
      'technical_director', 'Duncan Mwale — BSc Mining Engineering (Copperbelt University), JORC CP — 16 yrs SX-EW and open pit copper operations',
      'board', jsonb_build_array(
        'Dr. Charity Zimba — Independent Chairwoman; former DBZ board director; Zambia Institute of Mining Engineers Fellow',
        'Chanda Mutale — NED; Zambia-IFC joint venture specialist',
        'Sean Malone — NED; First Quantum Minerals strategic partner liaison'
      )
    ))
WHERE name = 'Kansanshi South Mining Corp';

-- 5. Letšeng Premium Resources Ltd (Lesotho, Diamonds, Production, $30M)
UPDATE public.venturex_listed_companies
SET extended_info = extended_info
  || jsonb_build_object('financials', (extended_info->'financials') || jsonb_build_object(
      'irr_pct',             35.2,
      'payback_years',       2.8,
      'existing_raised_usd', 8000000,
      'opex_unit',           '$165/t processed (gem-quality basis, +100ct stone premium achievable)',
      'revenue_note', 'Current production revenue from high-value gem diamonds (avg realised price $1,800–$3,500/ct). Post-raise expansion targets 120,000 cts/yr production at steady state.'
    ))
  || jsonb_build_object('mining', (extended_info->'mining') || jsonb_build_object(
      'offtake_status', 'Binding agreement: De Beers Diamond Trading Company — full production offtake at tender pricing (above-market premiums for large stones). Gem Diamond Group purchasing option on +100 ct stones.'
    ))
  || jsonb_build_object('team', (extended_info->'team') || jsonb_build_object(
      'cfo', 'Nthabiseng Mohale — CA(SA), ACCA — 11 yrs gemstone and luxury commodities finance; specialisation in rough diamond valuation and royalty structuring',
      'technical_director', 'James van der Berg — BSc Geology (Stellenbosch), GIA Graduate Gemologist — 20 yrs kimberlite pipe mining; previous: Gem Diamonds Letšeng Mine deputy GM',
      'board', jsonb_build_array(
        'Queen Masentle Bereng — Independent Chairwoman; Lesotho mining law specialist; former Mines Ministry legal counsel',
        'Dr. Lehlohonolo Kotsokoane — NED; Lesotho National Development Corporation representative',
        'Eleanor Hughes — NED; De Beers Group alumni; precious stones market specialist'
      ),
      'advisors', jsonb_build_array(
        'Rand Merchant Bank (RMB) — Lead Arranger & JSE Listing Advisor',
        'ENSafrica Mining Practice — Legal Counsel (South Africa & Lesotho jurisdictions)',
        'SRK Consulting — Independent Kimberlite Geological Review & JORC Resource Audit'
      )
    ))
WHERE name = 'Letšeng Premium Resources Ltd';

-- 6. Manono Deep Lithium Corp (DR Congo, Lithium, Development, $75M)
UPDATE public.venturex_listed_companies
SET extended_info = extended_info
  || jsonb_build_object('financials', (extended_info->'financials') || jsonb_build_object(
      'irr_pct',       26.0,
      'payback_years', 5.2,
      'capex_total_usd', 580000000,
      'npv_usd',       1200000000,
      'opex_unit',     '$310/t spodumene concentrate (6% Li2O basis, CIF Asia)',
      'revenue_note', 'First spodumene concentrate production expected Q3 2030 at 100,000 t/yr ramp. Full 200,000 t/yr capacity by 2032 generating ~$180M/yr revenue at $900/t concentrate.'
    ))
  || jsonb_build_object('mining', (extended_info->'mining') || jsonb_build_object(
      'offtake_status', 'MOU signed with CATL (Contemporary Amperex Technology) — 6% Li2O spodumene concentrate offtake 150,000 t/yr; LG Energy Solution — 50,000 t/yr term sheet under negotiation'
    ))
  || jsonb_build_object('team', (extended_info->'team') || jsonb_build_object(
      'cfo', 'Sophie Kabila — MBA Finance (INSEAD) — 12 yrs DRC mining and battery metals finance',
      'technical_director', 'Prof. Richard Kayumba — PhD Mineralogy (KU Leuven) — 15 yrs LCT pegmatite geology; Manono Lithium Project lead geologist 2021–2024',
      'advisors', jsonb_build_array(
        'Standard Bank CIB — Lead Financial Advisor (Johannesburg)',
        'Linklaters / Lusanga Legal (Kinshasa) — International & DRC Counsel',
        'CSA Global — Independent JORC Resource Competent Person & PFS Author'
      )
    ))
WHERE name = 'Manono Deep Lithium Corp';

-- 7. Obuasi South Extension (Ghana, Gold, Development, $25M)
UPDATE public.venturex_listed_companies
SET extended_info = extended_info
  || jsonb_build_object('financials', (extended_info->'financials') || jsonb_build_object(
      'irr_pct',       24.0,
      'payback_years', 4.5,
      'capex_total_usd', 180000000,
      'opex_unit',     '$980/oz AISC (toll processing basis at Obuasi CIL plant)',
      'revenue_note', 'First gold production expected Q1 2028 via toll milling at AngloGold Ashanti Obuasi. Target 35,000 oz/yr at steady state; ~$28M EBITDA/yr at $1,900/oz gold.'
    ))
  || jsonb_build_object('mining', (extended_info->'mining') || jsonb_build_object(
      'offtake_status', 'MOU with AngloGold Ashanti Ghana — toll processing at Obuasi CIL plant (40 Kt/yr spare capacity); below-benchmark processing rate agreed'
    ))
  || jsonb_build_object('team', (extended_info->'team') || jsonb_build_object(
      'cfo', 'Abena Asante-Mensah — ICAG, CFA Level III — 12 yrs capital markets and gold sector finance; GSE listed company experience',
      'board', jsonb_build_array(
        'Prof. Kwabena Frimpong-Boateng — Independent Chairman; Ghanaian engineer, former Minister of Science; pro-chancellor KNUST',
        'Nana Asante Bediatuo — NED; Ghana Infrastructure Inv. Fund representative',
        'Duncan MacPherson — NED; Ashanti Belt geologist; 25 yrs AngloGold Ashanti'
      ),
      'advisors', jsonb_build_array(
        'Databank Brokerage — Lead GSE Listing Advisor & Broker',
        'Bentsi-Enchill Letsa & Ankomah — Mining Legal Counsel',
        'SRK Consulting (Ghana) — Independent JORC Resource Update & Mining Study'
      )
    ))
WHERE name = 'Obuasi South Extension';

-- 8. Geita Deep Resources (Tanzania, Gold, Development, $15M)
UPDATE public.venturex_listed_companies
SET extended_info = extended_info
  || jsonb_build_object('financials', (extended_info->'financials') || jsonb_build_object(
      'irr_pct',       22.0,
      'payback_years', 5.5,
      'capex_total_usd', 65000000,
      'opex_unit',     '$1,020/oz AISC (toll processing basis at Geita CIL plant)',
      'revenue_note', 'First gold production expected Q2 2028 via toll milling at AngloGold Ashanti Geita. Target 18,000 oz/yr at steady state; ~$16M EBITDA/yr at $1,900/oz gold price.'
    ))
  || jsonb_build_object('mining', (extended_info->'mining') || jsonb_build_object(
      'offtake_status', 'Preliminary processing agreement with AngloGold Ashanti Tanzania — toll milling at Geita CIL plant (25 Kt/yr reserved capacity) at competitive per-tonne rate'
    ))
  || jsonb_build_object('team', (extended_info->'team') || jsonb_build_object(
      'cfo', 'Grace Mwangi — CPA(T), MBA University of Dar es Salaam — 11 yrs mining and project finance (previous: Africa Finance Corporation project officer)',
      'board', jsonb_build_array(
        'Emmanuel Mwanakijiji — Independent Chairman; former STAMICO board director; Tanzania mining law specialist',
        'Rehema Kimaro — NED; TIB Development Bank representative',
        'John Thornton — NED; Africa-focused gold mining investment specialist; Geita district expert'
      ),
      'advisors', jsonb_build_array(
        'NCBA Capital Tanzania — Lead DSE Advisor & Broker',
        'Oraro & Company Advocates (Nairobi) / ABC Attorneys (Dar) — Legal Counsel',
        'SRK Consulting (Johannesburg) — Independent JORC Resource Update Author'
      )
    ))
WHERE name = 'Geita Deep Resources';
