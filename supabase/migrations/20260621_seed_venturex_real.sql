-- ============================================================
-- Replace generated fake companies with 80 real African startups
-- ============================================================
DO $$
DECLARE
  v_uid  UUID;
  v_inv1 UUID; v_inv2 UUID; v_inv3 UUID; v_inv4 UUID; v_inv5 UUID;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = 'sapiens@xeltis.org' LIMIT 1;
  IF v_uid IS NULL THEN SELECT id INTO v_uid FROM auth.users ORDER BY created_at LIMIT 1; END IF;
  IF v_uid IS NULL THEN RAISE NOTICE 'No users found — skipping VentureX seed'; RETURN; END IF;

  -- Skip if already has our real data (Flutterwave is a marker)
  IF EXISTS (SELECT 1 FROM public.venturex_companies WHERE legal_name = 'Flutterwave') THEN
    RAISE NOTICE 'Real VentureX data already present — skipping'; RETURN;
  END IF;

  -- Clear generated fake data (child tables first to respect FKs)
  DELETE FROM public.venturex_milestones;
  DELETE FROM public.venturex_deals;
  DELETE FROM public.venturex_franchises WHERE company_id IN (SELECT id FROM public.venturex_companies WHERE pitch_video_url IS NULL);
  DELETE FROM public.venturex_companies WHERE pitch_video_url IS NULL;

  -- ── Investors ──────────────────────────────────────────────────────────────
  INSERT INTO public.venturex_investors (user_id,investor_type,fund_name,bio,total_capital_available,average_ticket_size,max_ticket_size,preferred_sectors,preferred_stage,preferred_geography,risk_level,provides_mentorship,provides_network,is_active)
  VALUES
    (v_uid,'vc','IFB Africa Growth Fund','Pan-African VC fund focused on Series A–C fintech and infrastructure. Backed by IFB institutional capital.',50000000,2000000,10000000,'["FinTech","Logistics","CleanEnergy"]','["growth","scale"]','["Nigeria","Kenya","South Africa","Egypt","Ghana"]','medium',true,true,true),
    (v_uid,'angel','Lagos Angel Network','Nigeria-focused angel collective. 40 active angels investing $50K–$500K tickets in pre-seed and seed stage companies.',8000000,200000,500000,'["FinTech","EdTech","HealthTech","E-Commerce"]','["idea","pre_revenue","early"]','["Nigeria","Ghana","Cameroon"]','high',true,true,true),
    (v_uid,'vc','Horizon Ventures East Africa','Nairobi-based fund specialising in climate tech, agritech and mobility across East Africa.',30000000,1000000,5000000,'["AgriTech","CleanEnergy","Mobility","Logistics"]','["early","growth"]','["Kenya","Tanzania","Uganda","Rwanda","Ethiopia"]','medium',true,false,true),
    (v_uid,'corporate','Africa FinTech Fund','Strategic fund backed by pan-African banks. Focuses on regulated fintech, insurtech and digital infrastructure.',75000000,3000000,15000000,'["FinTech","InsurTech","Blockchain"]','["growth","scale","ipo_ready"]','["Nigeria","South Africa","Egypt","Kenya","Côte d''Ivoire"]','low',false,true,true),
    (v_uid,'family_office','Cairo Innovation Partners','Egyptian family office investing in tech-enabled businesses across North and West Africa.',20000000,500000,3000000,'["AI/ML","HealthTech","EdTech","CyberSecurity"]','["early","growth"]','["Egypt","Algeria","Morocco","Tunisia","Nigeria"]','medium',true,false,true);

  SELECT id INTO v_inv1 FROM venturex_investors WHERE fund_name='IFB Africa Growth Fund' AND user_id=v_uid;
  SELECT id INTO v_inv2 FROM venturex_investors WHERE fund_name='Lagos Angel Network' AND user_id=v_uid;
  SELECT id INTO v_inv3 FROM venturex_investors WHERE fund_name='Horizon Ventures East Africa' AND user_id=v_uid;
  SELECT id INTO v_inv4 FROM venturex_investors WHERE fund_name='Africa FinTech Fund' AND user_id=v_uid;
  SELECT id INTO v_inv5 FROM venturex_investors WHERE fund_name='Cairo Innovation Partners' AND user_id=v_uid;

  -- ── Companies (80 real African startups) ───────────────────────────────────
  INSERT INTO public.venturex_companies (
    user_id, legal_name, sector, sub_sector, country, website, tagline, description,
    product_stage, current_round, funding_goal, total_raised, valuation,
    equity_offered, monthly_revenue, team_size, active_users,
    investment_readiness_score, pitch_video_url,
    status, is_public, financial_verified, identity_verified, traction_verified, created_at
  ) VALUES

  -- ── FinTech (25) ───────────────────────────────────────────────────────────
  (v_uid,'Flutterwave','FinTech','Payments Infrastructure','Nigeria','https://flutterwave.com',
   'Payment infrastructure for the world',
   'Flutterwave provides the easiest way to build payment solutions for global merchants and payment service providers across Africa.',
   'scale','series-d',500000000,474000000,3000000000,0,12000000,900,1000000,95,
   'https://www.youtube.com/@flutterwave','active',true,true,true,true,now()-interval '30 months'),

  (v_uid,'Paystack','FinTech','Online Payments','Nigeria','https://paystack.com',
   'Modern online and offline payments for Africa',
   'Paystack helps businesses in Africa get paid by anyone, anywhere in the world. Acquired by Stripe in 2020.',
   'scale','acquired',0,200000000,200000000,0,8000000,300,600000,93,
   'https://www.youtube.com/@PaystackHQ','active',true,true,true,true,now()-interval '32 months'),

  (v_uid,'Chipper Cash','FinTech','Cross-Border Payments','Uganda','https://chippercash.com',
   'The largest mobile cross-border money transfer platform in Africa',
   'Chipper Cash enables fee-free money transfers across African borders and beyond, serving over 5M users.',
   'growth','series-c',200000000,152000000,2000000000,7,5000000,350,5000000,90,
   'https://www.youtube.com/results?search_query=Chipper+Cash+Africa+startup','active',true,true,true,true,now()-interval '28 months'),

  (v_uid,'Wave','FinTech','Mobile Money','Senegal','https://wave.com',
   'Banking has never been this affordable',
   'Wave is the largest mobile money operator in Senegal and Côte d''Ivoire with zero-fee transfers, targeting the unbanked.',
   'growth','series-a',300000000,200000000,1700000000,12,4500000,700,7000000,92,
   'https://www.youtube.com/results?search_query=Wave+mobile+money+Senegal','active',true,true,true,true,now()-interval '26 months'),

  (v_uid,'OPay','FinTech','Super App','Nigeria','https://opayweb.com',
   'Africa''s fastest-growing fintech super app',
   'OPay is a full-stack financial services platform operating in Nigeria, Egypt and other African markets with payment, savings and lending.',
   'scale','series-c',300000000,570000000,2000000000,0,18000000,5000,15000000,94,
   'https://www.youtube.com/results?search_query=OPay+Nigeria+fintech','active',true,true,true,true,now()-interval '24 months'),

  (v_uid,'PalmPay','FinTech','Digital Wallet','Nigeria','https://palmpay.com',
   'Nigeria''s fastest growing mobile money app',
   'PalmPay is a mobile payments platform offering free transfers, bill payments and savings to millions of Nigerians.',
   'growth','series-b',200000000,100000000,500000000,15,6000000,1200,10000000,88,
   'https://www.youtube.com/results?search_query=PalmPay+Nigeria','active',true,true,true,true,now()-interval '20 months'),

  (v_uid,'Kuda Bank','FinTech','Neobank','Nigeria','https://kuda.com',
   'The money app for Africans',
   'Kuda is a full-service digital bank for Nigerians. No maintenance fees, free transfers, instant savings account.',
   'growth','series-b',100000000,55000000,500000000,10,3000000,400,5000000,87,
   'https://www.youtube.com/results?search_query=Kuda+Bank+Nigeria+neobank','active',true,true,true,true,now()-interval '22 months'),

  (v_uid,'FairMoney','FinTech','Digital Lending','Nigeria','https://fairmoney.io',
   'Instant loans and smart banking for Nigeria',
   'FairMoney provides instant credit and banking services to underserved Nigerians through an AI-powered mobile app.',
   'growth','series-b',80000000,42000000,150000000,18,2000000,250,3000000,82,
   'https://www.youtube.com/results?search_query=FairMoney+Nigeria+fintech','active',true,true,true,true,now()-interval '18 months'),

  (v_uid,'Moniepoint','FinTech','Business Banking','Nigeria','https://moniepoint.com',
   'Business banking for every African business',
   'Moniepoint (TeamApt) provides POS terminals, business accounts, loans and payroll infrastructure to millions of African SMEs.',
   'scale','series-c',200000000,110000000,1000000000,5,15000000,2000,2000000,93,
   'https://www.youtube.com/results?search_query=Moniepoint+TeamApt+Nigeria','active',true,true,true,true,now()-interval '16 months'),

  (v_uid,'Nala','FinTech','Remittances','Tanzania','https://nala.com',
   'Send money to Africa — with love',
   'Nala is a diaspora remittance platform letting people send money to Africa from the US, UK and EU at the best rates.',
   'growth','series-a',20000000,10000000,80000000,20,800000,80,500000,80,
   'https://www.youtube.com/results?search_query=Nala+money+Tanzania+remittance','active',true,true,true,false,now()-interval '14 months'),

  (v_uid,'Tyme Bank','FinTech','Neobank','South Africa','https://tymebank.co.za',
   'South Africa''s fastest-growing digital bank',
   'TymeBank is a digital bank operating at Pick n Pay and Boxer stores across South Africa, serving 8M+ customers.',
   'growth','series-c',200000000,180000000,965000000,8,9000000,1500,8000000,91,
   'https://www.youtube.com/results?search_query=TymeBank+South+Africa+digital+bank','active',true,true,true,true,now()-interval '20 months'),

  (v_uid,'Branch','FinTech','Mobile Credit','Kenya','https://branch.co',
   'World-class financial services for everyone',
   'Branch International provides personal loans, high-interest savings and investment products via mobile app across Africa and India.',
   'scale','series-c',150000000,300000000,1000000000,0,12000000,800,4000000,90,
   'https://www.youtube.com/results?search_query=Branch+International+mobile+loans+Africa','active',true,true,true,true,now()-interval '25 months'),

  (v_uid,'JUMO','FinTech','Embedded Finance','South Africa','https://jumo.world',
   'Building financial services infrastructure for emerging markets',
   'JUMO uses alternative data and AI to build credit, savings and insurance products embedded in telecom and digital platforms.',
   'scale','series-b',150000000,120000000,400000000,12,8000000,600,10000000,89,
   'https://www.youtube.com/results?search_query=JUMO+fintech+Africa+emerging+markets','active',true,true,true,true,now()-interval '28 months'),

  (v_uid,'Interswitch','FinTech','Payment Networks','Nigeria','https://interswitchgroup.com',
   'Driving Africa''s digital economy',
   'Interswitch is a leading integrated digital payments and commerce company operating across Africa for over 20 years.',
   'scale','ipo_ready',200000000,110000000,1000000000,0,25000000,3000,50000000,96,
   'https://www.youtube.com/results?search_query=Interswitch+Nigeria+payments','active',true,true,true,true,now()-interval '48 months'),

  (v_uid,'Djamo','FinTech','Neobank','Côte d''Ivoire','https://djamo.com',
   'The account for ambitious Africans',
   'Djamo is a mobile banking service for Francophone West Africa, providing Visa cards and financial tools to the unbanked.',
   'early','series-a',30000000,14000000,60000000,25,600000,120,400000,76,
   'https://www.youtube.com/results?search_query=Djamo+fintech+West+Africa','active',true,true,true,false,now()-interval '12 months'),

  (v_uid,'Paymob','FinTech','Payment Gateway','Egypt','https://paymob.com',
   'Accept payments, everywhere',
   'Paymob is Egypt and MENA''s leading payment infrastructure provider, processing billions in transactions annually.',
   'growth','series-b',80000000,50000000,250000000,12,4000000,400,500000,86,
   'https://www.youtube.com/results?search_query=Paymob+Egypt+payments','active',true,true,true,true,now()-interval '15 months'),

  (v_uid,'Mono','FinTech','Open Banking','Nigeria','https://mono.co',
   'Open banking infrastructure for Africa',
   'Mono connects bank accounts and financial data via API for developers building financial products across Africa.',
   'early','series-a',25000000,15000000,80000000,18,400000,80,200000,79,
   'https://www.youtube.com/results?search_query=Mono+open+banking+Africa','active',true,false,true,false,now()-interval '10 months'),

  (v_uid,'PiggyVest','FinTech','Savings & Investments','Nigeria','https://piggyvest.com',
   'Africa''s most trusted savings and investment app',
   'PiggyVest has helped over 5M Nigerians save and invest over $1B. Offers savings, fixed investments and group savings.',
   'growth','series-b',40000000,20000000,200000000,10,2000000,200,5000000,85,
   'https://www.youtube.com/results?search_query=PiggyVest+savings+Nigeria','active',true,true,true,true,now()-interval '18 months'),

  (v_uid,'Cowrywise','FinTech','Wealth Management','Nigeria','https://cowrywise.com',
   'Smart and automated wealth management for Africa',
   'Cowrywise provides goal-based savings, mutual funds and investment products for young Africans starting their wealth journey.',
   'early','series-a',10000000,3000000,25000000,22,200000,60,300000,72,
   'https://www.youtube.com/results?search_query=Cowrywise+investment+Nigeria','active',true,false,true,false,now()-interval '10 months'),

  (v_uid,'Bamboo','FinTech','Stock Trading','Nigeria','https://investbamboo.com',
   'Invest in the world from Africa',
   'Bamboo gives Nigerians and other Africans access to US stocks, ETFs and Nigerian securities from their phones.',
   'early','series-a',30000000,15000000,100000000,15,600000,90,250000,75,
   'https://www.youtube.com/results?search_query=Bamboo+invest+Nigeria+stocks','active',true,false,true,false,now()-interval '12 months'),

  (v_uid,'Oze','FinTech','SME Banking','Ghana','https://oze.works',
   'Digital banking and credit for African SMEs',
   'Oze helps small businesses in Ghana track cash flow, build credit histories and access loans through a mobile app.',
   'early','series-a',20000000,8000000,40000000,24,300000,70,150000,71,
   'https://www.youtube.com/results?search_query=Oze+Ghana+SME+fintech','active',true,false,true,false,now()-interval '9 months'),

  (v_uid,'Pngme','FinTech','Financial Data','Ghana','https://pngme.com',
   'Open finance data platform for Africa',
   'Pngme aggregates financial data from mobile money, bank accounts and alternative sources to power credit decisioning across Africa.',
   'early','series-a',25000000,15000000,60000000,20,400000,65,100000,74,
   'https://www.youtube.com/results?search_query=Pngme+Ghana+data+fintech','active',true,false,true,false,now()-interval '8 months'),

  (v_uid,'Aella Credit','FinTech','Digital Lending','Nigeria','https://aellaapp.com',
   'Credit for the underbanked',
   'Aella provides instant personal loans, insurance and bill payments to unbanked and underbanked Nigerians.',
   'growth','series-b',30000000,10000000,50000000,20,800000,150,800000,78,
   'https://www.youtube.com/results?search_query=Aella+Credit+Nigeria+loans','active',true,false,true,true,now()-interval '14 months'),

  (v_uid,'Prembly','CyberSecurity','Identity Verification','Nigeria','https://prembly.com',
   'Verify anyone, anywhere in Africa',
   'Prembly provides KYC, AML and identity verification infrastructure for African businesses via API and no-code tools.',
   'early','series-a',10000000,2800000,15000000,20,200000,50,500000,73,
   'https://www.youtube.com/results?search_query=Prembly+Identitypass+Nigeria+KYC','active',true,false,true,false,now()-interval '7 months'),

  (v_uid,'Brass Business','FinTech','Business Accounts','Nigeria','https://trybrass.com',
   'Business banking for modern Nigerian companies',
   'Brass provides bank accounts, expense management, payroll and credit to Nigerian startups and SMEs.',
   'early','series-a',15000000,5000000,30000000,22,300000,80,12000,70,
   'https://www.youtube.com/results?search_query=Brass+business+banking+Nigeria','active',true,false,true,false,now()-interval '9 months'),

  -- ── AgriTech (8) ───────────────────────────────────────────────────────────
  (v_uid,'Twiga Foods','AgriTech','Food Distribution','Kenya','https://twiga.com',
   'Nourishing Africa''s urban populations',
   'Twiga is Kenya''s largest B2B food and grocery distribution platform, connecting farms to thousands of urban food vendors.',
   'growth','series-c',100000000,50000000,200000000,12,6000000,1500,20000,88,
   'https://www.youtube.com/results?search_query=Twiga+Foods+Kenya+agritech','active',true,true,true,true,now()-interval '22 months'),

  (v_uid,'Apollo Agriculture','AgriTech','Smallholder Finance','Kenya','https://apolloagriculture.com',
   'Full-package farming for smallholder farmers',
   'Apollo Agriculture uses satellite data and machine learning to provide credit, seeds and agronomic advice to small farmers in Kenya.',
   'growth','series-b',80000000,40000000,150000000,15,2000000,300,300000,84,
   'https://www.youtube.com/results?search_query=Apollo+Agriculture+Kenya+smallholder','active',true,true,true,true,now()-interval '18 months'),

  (v_uid,'Wasoko','AgriTech','B2B Commerce','Kenya','https://wasoko.com',
   'Africa''s largest B2B commerce platform',
   'Wasoko (formerly Sokowatch) connects informal retailers across East Africa with fast-moving consumer goods via a mobile order platform.',
   'scale','series-b',200000000,125000000,625000000,8,12000000,1000,50000,91,
   'https://www.youtube.com/results?search_query=Wasoko+Sokowatch+Kenya+B2B','active',true,true,true,true,now()-interval '20 months'),

  (v_uid,'Aerobotics','AgriTech','Precision Agriculture','South Africa','https://aerobotics.com',
   'Data-driven precision agriculture with drones and AI',
   'Aerobotics uses drone imagery and AI to help farmers detect crop disease, pests and water stress early, reducing crop losses.',
   'growth','series-b',30000000,17000000,60000000,18,500000,120,50000,80,
   'https://www.youtube.com/results?search_query=Aerobotics+drone+agriculture+South+Africa','active',true,true,true,true,now()-interval '15 months'),

  (v_uid,'Complete Farmer','AgriTech','Contract Farming','Ghana','https://completefarmer.com',
   'Connecting global buyers to African farmers',
   'Complete Farmer is a digital agribusiness platform that enables contract farming and connects Ghanaian smallholders to global markets.',
   'early','series-a',20000000,10000000,40000000,20,400000,80,10000,76,
   'https://www.youtube.com/results?search_query=Complete+Farmer+Ghana+agribusiness','active',true,false,true,false,now()-interval '10 months'),

  (v_uid,'Farmerline','AgriTech','Farmer Services','Ghana','https://farmerline.co',
   'Empowering farmers with information and finance',
   'Farmerline provides digital tools, advisory services and financial products to over 2M smallholder farmers across Africa.',
   'early','series-a',15000000,6000000,30000000,22,300000,70,2000000,74,
   'https://www.youtube.com/results?search_query=Farmerline+Ghana+farmers','active',true,false,true,false,now()-interval '12 months'),

  (v_uid,'Gro Intelligence','AgriTech','Climate Data','Kenya','https://gro-intelligence.com',
   'The world''s most comprehensive climate and agriculture data platform',
   'Gro Intelligence provides a global climate and agricultural data platform used by governments, banks, and food companies.',
   'scale','series-b',60000000,30000000,300000000,0,3000000,200,5000,85,
   'https://www.youtube.com/results?search_query=Gro+Intelligence+agriculture+data','active',true,true,true,true,now()-interval '24 months'),

  (v_uid,'Hello Tractor','AgriTech','Shared Tractors','Nigeria','https://hellotractor.com',
   'Uber for tractors in Africa',
   'Hello Tractor connects smallholder farmers to certified tractor owners via a smart booking app, improving farm productivity across Africa.',
   'growth','series-a',15000000,9000000,40000000,20,400000,100,500000,77,
   'https://www.youtube.com/results?search_query=Hello+Tractor+Nigeria+agritech','active',true,false,true,true,now()-interval '16 months'),

  -- ── HealthTech (7) ─────────────────────────────────────────────────────────
  (v_uid,'54gene','HealthTech','Genomics','Nigeria','https://54gene.com',
   'African genomics for better global health',
   '54gene is building Africa''s most comprehensive genomics biobank to accelerate drug discovery and personalised medicine.',
   'growth','series-b',80000000,45000000,200000000,15,1500000,200,50000,83,
   'https://www.youtube.com/results?search_query=54gene+Nigeria+genomics','active',true,true,true,true,now()-interval '18 months'),

  (v_uid,'Helium Health','HealthTech','Hospital Management','Nigeria','https://heliumhealth.com',
   'Software that powers Africa''s healthcare',
   'Helium Health provides electronic health records and hospital management software to hundreds of healthcare facilities across Africa.',
   'growth','series-b',50000000,30000000,120000000,18,1200000,180,2000,81,
   'https://www.youtube.com/results?search_query=Helium+Health+Nigeria+HealthTech','active',true,true,true,true,now()-interval '15 months'),

  (v_uid,'Reliance HMO','HealthTech','Health Insurance','Nigeria','https://reliancehmo.com',
   'Making healthcare accessible for every Nigerian',
   'Reliance HMO is Nigeria''s first digital-first health maintenance organisation offering affordable plans and telemedicine.',
   'growth','series-b',60000000,40000000,150000000,20,2500000,300,200000,83,
   'https://www.youtube.com/results?search_query=Reliance+HMO+Nigeria+health+insurance','active',true,true,true,true,now()-interval '16 months'),

  (v_uid,'mPharma','HealthTech','Pharmacy Management','Ghana','https://mpharma.com',
   'Transforming how Africa accesses medicine',
   'mPharma manages pharmacy inventory and works with healthcare providers to reduce medicine stockouts and costs across 8 African countries.',
   'growth','series-c',60000000,30000000,150000000,12,3000000,500,5000,84,
   'https://www.youtube.com/results?search_query=mPharma+Ghana+pharmacy+Africa','active',true,true,true,true,now()-interval '20 months'),

  (v_uid,'MyDawa','HealthTech','Online Pharmacy','Kenya','https://mydawa.com',
   'Kenya''s largest digital pharmacy',
   'MyDawa delivers prescription and OTC medicines, lab tests and telemedicine consultations to Kenyans via a mobile app.',
   'growth','series-b',50000000,30000000,100000000,18,1800000,200,300000,80,
   'https://www.youtube.com/results?search_query=MyDawa+Kenya+online+pharmacy','active',true,true,true,true,now()-interval '14 months'),

  (v_uid,'Vezeeta','HealthTech','Digital Health','Egypt','https://vezeeta.com',
   'The largest healthcare platform in the Arab world',
   'Vezeeta is MENA''s leading digital health platform connecting patients with doctors, labs and pharmacies across Egypt and the Arab world.',
   'scale','series-c',80000000,40000000,200000000,10,5000000,600,20000000,88,
   'https://www.youtube.com/results?search_query=Vezeeta+Egypt+digital+health','active',true,true,true,true,now()-interval '22 months'),

  (v_uid,'Ilara Health','HealthTech','Diagnostics','Kenya','https://ilara.health',
   'Bringing diagnostics to the last mile',
   'Ilara embeds AI-powered, affordable diagnostic devices in primary health clinics across Africa to improve early disease detection.',
   'early','series-a',10000000,3700000,20000000,25,200000,80,2000,70,
   'https://www.youtube.com/results?search_query=Ilara+Health+Kenya+diagnostics','active',true,false,true,false,now()-interval '8 months'),

  -- ── Logistics (8) ─────────────────────────────────────────────────────────
  (v_uid,'Zipline','Logistics','Drone Delivery','Rwanda','https://flyzipline.com',
   'Instant delivery for the planet',
   'Zipline operates the world''s largest autonomous drone delivery network, delivering medical supplies and goods across Africa and beyond.',
   'scale','series-e',500000000,250000000,4200000000,5,15000000,2000,10000000,97,
   'https://www.youtube.com/@zipline','active',true,true,true,true,now()-interval '36 months'),

  (v_uid,'Sendy','Logistics','Last-Mile Delivery','Kenya','https://sendyit.com',
   'On-demand logistics for African businesses',
   'Sendy connects businesses and individuals to a network of vetted transporters for deliveries across East Africa.',
   'growth','series-b',40000000,20000000,80000000,18,1500000,300,10000,79,
   'https://www.youtube.com/results?search_query=Sendy+Kenya+logistics+delivery','active',true,true,true,true,now()-interval '18 months'),

  (v_uid,'Lori Systems','Logistics','Freight Matching','Kenya','https://lorisystems.com',
   'Digital freight marketplace for sub-Saharan Africa',
   'Lori Systems digitises road freight in Africa, connecting shippers to a marketplace of verified trucks and drivers.',
   'growth','series-b',50000000,30000000,100000000,15,2000000,250,20000,80,
   'https://www.youtube.com/results?search_query=Lori+Systems+Kenya+freight','active',true,true,true,true,now()-interval '20 months'),

  (v_uid,'Kobo360','Logistics','Freight Technology','Nigeria','https://kobo360.com',
   'Transforming freight logistics in Africa',
   'Kobo360 is Africa''s leading freight logistics marketplace connecting cargo owners to a network of 50,000+ trucks across 9 countries.',
   'growth','series-a',50000000,30000000,100000000,15,3000000,400,50000,80,
   'https://www.youtube.com/results?search_query=Kobo360+Nigeria+logistics','active',true,true,true,true,now()-interval '22 months'),

  (v_uid,'Trella','Logistics','Digital Freight','Egypt','https://trella.app',
   'Driving logistics forward in MENA',
   'Trella is MENA''s largest digital freight marketplace connecting shippers to carriers with real-time pricing and tracking.',
   'growth','series-b',70000000,42000000,150000000,14,3500000,350,30000,83,
   'https://www.youtube.com/results?search_query=Trella+Egypt+freight+logistics','active',true,true,true,true,now()-interval '16 months'),

  (v_uid,'Omnibiz Africa','Logistics','B2B Distribution','Nigeria','https://omnibizafrica.com',
   'Connecting manufacturers to retailers across Africa',
   'Omnibiz enables consumer goods manufacturers to reach informal retailers through a B2B distribution and trade finance platform.',
   'early','series-a',30000000,15000000,60000000,20,2000000,200,20000,76,
   'https://www.youtube.com/results?search_query=Omnibiz+Africa+Nigeria+distribution','active',true,false,true,true,now()-interval '12 months'),

  (v_uid,'MarketForce360','Logistics','Distribution Tech','Kenya','https://marketforce.io',
   'Powering Africa''s informal retail economy',
   'MarketForce360 enables FMCG brands to digitise their distribution and gives informal retailers access to stock and financial services.',
   'growth','series-b',60000000,40000000,160000000,12,3000000,400,50000,82,
   'https://www.youtube.com/results?search_query=MarketForce360+Kenya+retail','active',true,true,true,true,now()-interval '15 months'),

  (v_uid,'Copia Global','Logistics','Rural E-Commerce','Kenya','https://copiaglobal.com',
   'Bringing affordable goods to rural Africa',
   'Copia Global is a consumer e-commerce platform that reaches low-income and rural consumers in Kenya through a network of agents.',
   'growth','series-c',80000000,50000000,250000000,10,4000000,600,800000,84,
   'https://www.youtube.com/results?search_query=Copia+Global+Kenya+e-commerce','active',true,true,true,true,now()-interval '20 months'),

  -- ── CleanEnergy (5) ────────────────────────────────────────────────────────
  (v_uid,'M-KOPA Solar','CleanEnergy','Pay-As-You-Go Solar','Kenya','https://m-kopa.com',
   'Connected asset financing for the world''s next billion',
   'M-KOPA is a connected asset financing platform that has provided over 4M affordable solar home systems across sub-Saharan Africa.',
   'scale','series-e',250000000,190000000,1000000000,0,8000000,3000,4000000,95,
   'https://www.youtube.com/@mkopasolar','active',true,true,true,true,now()-interval '30 months'),

  (v_uid,'BURN Manufacturing','CleanEnergy','Clean Cookstoves','Kenya','https://burnstoves.com',
   'The world''s most fuel-efficient biomass cookstoves',
   'BURN manufactures and distributes fuel-efficient and electric cooking solutions to 1M+ households across Africa, reducing deforestation.',
   'growth','series-b',60000000,30000000,100000000,15,2500000,500,1000000,83,
   'https://www.youtube.com/results?search_query=BURN+Manufacturing+Kenya+cookstoves','active',true,true,true,true,now()-interval '18 months'),

  (v_uid,'d.light','CleanEnergy','Solar Products','Kenya','https://dlight.com',
   'Solar energy for the next billion people',
   'd.light designs, manufactures and distributes solar energy products including solar home systems, appliances and pay-as-you-go financing.',
   'scale','series-d',200000000,180000000,600000000,0,6000000,2500,20000000,93,
   'https://www.youtube.com/results?search_query=d.light+solar+energy+Africa','active',true,true,true,true,now()-interval '30 months'),

  (v_uid,'Greenlight Planet','CleanEnergy','Solar Retail','Kenya','https://greenlightplanet.com',
   'Life-changing, reliable solar for everyone',
   'Greenlight Planet has sold over 10 million Sun King solar products including solar lamps and solar home systems in 40+ countries.',
   'scale','series-d',100000000,90000000,500000000,0,5000000,2000,10000000,91,
   'https://www.youtube.com/results?search_query=Greenlight+Planet+Sun+King+solar','active',true,true,true,true,now()-interval '26 months'),

  (v_uid,'BasiGo','CleanEnergy','Electric Mobility','Kenya','https://basigo.africa',
   'Electric buses for Africa''s public transit',
   'BasiGo provides pay-per-km electric bus leasing to public transport operators in Kenya, replacing diesel matatus with clean electric buses.',
   'early','series-a',20000000,6600000,40000000,20,400000,60,50000,74,
   'https://www.youtube.com/results?search_query=BasiGo+Kenya+electric+bus','active',true,false,true,false,now()-interval '9 months'),

  -- ── EdTech (5) ─────────────────────────────────────────────────────────────
  (v_uid,'uLesson','EdTech','K-12 Learning','Nigeria','https://ulesson.com',
   'Nigeria''s leading personalised learning app',
   'uLesson provides K-12 video lessons, practice and assessment content aligned to Nigerian and international curricula via mobile app.',
   'growth','series-b',30000000,15000000,80000000,18,1000000,200,1000000,80,
   'https://www.youtube.com/results?search_query=uLesson+Nigeria+education+app','active',true,true,true,true,now()-interval '14 months'),

  (v_uid,'ALX Africa','EdTech','Tech Training','Pan-Africa','https://alxafrica.com',
   'Transforming Africa through technology and leadership',
   'ALX Africa (part of African Leadership Group) trains the next generation of African tech leaders with 6-12 month intensive programs.',
   'scale','series-c',300000000,200000000,800000000,5,8000000,2000,100000,93,
   'https://www.youtube.com/results?search_query=ALX+Africa+tech+training','active',true,true,true,true,now()-interval '20 months'),

  (v_uid,'Andela','HRTech','Global Tech Talent','Nigeria','https://andela.com',
   'Connecting Africa''s best engineers with global companies',
   'Andela is a global talent marketplace connecting vetted African software engineers to remote jobs at leading companies worldwide.',
   'scale','series-e',300000000,200000000,1500000000,0,20000000,1500,250000,95,
   'https://www.youtube.com/@andela','active',true,true,true,true,now()-interval '36 months'),

  (v_uid,'Enko Education','EdTech','International Schools','Cameroon','https://enkoeducation.com',
   'African secondary schools preparing students for global universities',
   'Enko Education runs a pan-African network of international secondary schools that prepare students for IB Diploma and global universities.',
   'early','series-a',20000000,9000000,40000000,22,1200000,500,5000,75,
   'https://www.youtube.com/results?search_query=Enko+Education+Africa+school','active',true,false,true,true,now()-interval '10 months'),

  (v_uid,'Moringa School','EdTech','Coding Bootcamp','Kenya','https://moringaschool.com',
   'Africa''s premier software development and data science bootcamp',
   'Moringa School trains software developers and data scientists in Kenya and across East Africa with industry-linked bootcamps.',
   'early','series-a',10000000,5000000,25000000,24,400000,120,10000,70,
   'https://www.youtube.com/results?search_query=Moringa+School+Kenya+coding','active',true,false,true,false,now()-interval '14 months'),

  -- ── HRTech (3) ─────────────────────────────────────────────────────────────
  (v_uid,'Workpay','HRTech','Payroll & HR','Kenya','https://workpay.africa',
   'Modern payroll and HR for African companies',
   'Workpay provides cloud-based payroll, HR management, expense management and earned wage access to businesses across Africa.',
   'early','series-a',10000000,2700000,20000000,25,300000,60,5000,69,
   'https://www.youtube.com/results?search_query=Workpay+Kenya+payroll+HR','active',true,false,true,false,now()-interval '8 months'),

  (v_uid,'Gebeya','HRTech','Tech Talent','Ethiopia','https://gebeya.com',
   'Training and placing Africa''s next tech workforce',
   'Gebeya is a pan-African tech talent marketplace and training platform connecting African developers and designers to remote opportunities.',
   'early','series-a',8000000,2000000,15000000,26,200000,80,3000,67,
   'https://www.youtube.com/results?search_query=Gebeya+Ethiopia+tech+talent','active',true,false,true,false,now()-interval '9 months'),

  (v_uid,'Jobberman','HRTech','Job Platform','Nigeria','https://jobberman.com',
   'Nigeria''s No. 1 job site',
   'Jobberman is Nigeria''s largest job listings portal, connecting millions of Nigerian job seekers to employers since 2009.',
   'scale','acquired',0,10000000,40000000,0,1500000,200,5000000,85,
   'https://www.youtube.com/results?search_query=Jobberman+Nigeria+jobs','active',true,true,true,true,now()-interval '40 months'),

  -- ── AI/ML (5) ──────────────────────────────────────────────────────────────
  (v_uid,'DataProphet','AI/ML','Manufacturing AI','South Africa','https://dataprophet.com',
   'AI that eliminates manufacturing defects',
   'DataProphet builds proprietary AI systems that analyse sensor data in real-time to predict and prevent manufacturing defects for global clients.',
   'growth','series-b',20000000,12000000,50000000,18,800000,100,200,79,
   'https://www.youtube.com/results?search_query=DataProphet+AI+manufacturing+South+Africa','active',true,true,true,true,now()-interval '15 months'),

  (v_uid,'Instabug','AI/ML','Developer Tools','Egypt','https://instabug.com',
   'Application monitoring for mobile engineers',
   'Instabug provides in-app feedback, crash reporting and performance monitoring tools used by 25,000+ mobile apps worldwide.',
   'scale','series-c',80000000,46000000,300000000,0,3000000,400,25000,90,
   'https://www.youtube.com/results?search_query=Instabug+Egypt+developer+tools','active',true,true,true,true,now()-interval '24 months'),

  (v_uid,'Ubenwa','AI/ML','Neonatal Health AI','Nigeria','https://ubenwa.ai',
   'Saving newborn lives with AI cry analysis',
   'Ubenwa developed an AI diagnostic tool that analyses a newborn''s cry to detect birth asphyxia — a leading cause of neonatal death in Africa.',
   'early','seed',8000000,3000000,15000000,25,100000,30,500,68,
   'https://www.youtube.com/results?search_query=Ubenwa+AI+newborn+Nigeria','active',true,false,true,false,now()-interval '6 months'),

  (v_uid,'Zindi','AI/ML','Data Science Community','South Africa','https://zindi.africa',
   'Africa''s largest data science competition platform',
   'Zindi is a professional network and competition platform for African data scientists, with 35,000+ members solving real-world problems.',
   'early','series-a',10000000,5000000,25000000,20,200000,50,35000,71,
   'https://www.youtube.com/results?search_query=Zindi+Africa+data+science','active',true,false,true,false,now()-interval '10 months'),

  (v_uid,'InVision AI','AI/ML','Retail AI','South Africa','https://inv.vision',
   'Computer vision for African retail',
   'InVision AI deploys shelf-monitoring computer vision solutions to FMCG manufacturers and retailers across South Africa.',
   'early','series-a',8000000,4000000,20000000,22,300000,40,100,70,
   'https://www.youtube.com/results?search_query=InVision+AI+retail+South+Africa','active',true,false,true,false,now()-interval '7 months'),

  -- ── Mobility (4) ───────────────────────────────────────────────────────────
  (v_uid,'Moove','Mobility','Vehicle Finance','Nigeria','https://moove.io',
   'Mobility fintech for ride-hailing drivers',
   'Moove provides vehicle financing to mobility entrepreneurs and ride-hailing drivers across Africa, Asia and Europe.',
   'scale','series-b',200000000,105000000,750000000,12,8000000,800,20000,89,
   'https://www.youtube.com/results?search_query=Moove+Nigeria+mobility+fintech','active',true,true,true,true,now()-interval '18 months'),

  (v_uid,'Yassir','Mobility','Super App','Algeria','https://yassir.com',
   'North Africa''s leading on-demand super app',
   'Yassir is North Africa and MENA''s largest on-demand platform for rides, food delivery and financial services.',
   'growth','series-a',250000000,150000000,800000000,10,10000000,1500,15000000,90,
   'https://www.youtube.com/results?search_query=Yassir+Algeria+super+app','active',true,true,true,true,now()-interval '16 months'),

  (v_uid,'Ampersand','Mobility','Electric Motorcycles','Rwanda','https://ampersand.africa',
   'Electric motorcycles built for Africa''s roads',
   'Ampersand provides electric motorcycle swapping infrastructure to moto-taxi drivers in East Africa, cutting fuel costs by 50%.',
   'early','series-a',25000000,15000000,60000000,20,600000,120,5000,74,
   'https://www.youtube.com/results?search_query=Ampersand+Rwanda+electric+motorcycle','active',true,false,true,false,now()-interval '10 months'),

  (v_uid,'Roam Electric','Mobility','Electric Vehicles','Kenya','https://roamelectric.com',
   'Affordable electric motorcycles for Africa',
   'Roam designs and assembles electric motorcycles and buses optimised for African roads and infrastructure conditions.',
   'early','series-a',10000000,3000000,20000000,25,200000,50,2000,68,
   'https://www.youtube.com/results?search_query=Roam+Electric+Kenya+EV','active',true,false,true,false,now()-interval '8 months'),

  -- ── InsurTech (3) ─────────────────────────────────────────────────────────
  (v_uid,'Naked Insurance','InsurTech','Digital Insurance','South Africa','https://naked.insure',
   'AI-powered car and home insurance',
   'Naked Insurance is South Africa''s first fully digital insurer, using AI to underwrite, price and pay claims for car, home and life policies.',
   'growth','series-b',30000000,17000000,70000000,18,1500000,150,200000,81,
   'https://www.youtube.com/results?search_query=Naked+Insurance+South+Africa','active',true,true,true,true,now()-interval '14 months'),

  (v_uid,'Lami Technologies','InsurTech','Embedded Insurance','Kenya','https://lami.co.ke',
   'API-first insurance distribution for Africa',
   'Lami provides an insurance infrastructure API that enables platforms to embed insurance products into their services across Africa.',
   'early','series-a',10000000,3700000,20000000,22,200000,60,50000,70,
   'https://www.youtube.com/results?search_query=Lami+Technologies+Kenya+insurance+API','active',true,false,true,false,now()-interval '9 months'),

  (v_uid,'Turaco','InsurTech','Micro-Insurance','Uganda','https://turaco.com',
   'Simple and accessible health insurance for Africa',
   'Turaco distributes affordable health and life insurance to low-income workers in East Africa through mobile money and digital wallets.',
   'early','series-a',15000000,10000000,40000000,24,500000,80,100000,73,
   'https://www.youtube.com/results?search_query=Turaco+Uganda+micro+insurance','active',true,false,true,false,now()-interval '11 months'),

  -- ── Media / Gaming (3) ────────────────────────────────────────────────────
  (v_uid,'Carry1st','Gaming','Mobile Gaming','South Africa','https://carry1st.com',
   'Publish, monetise and scale games in Africa',
   'Carry1st is Africa''s leading mobile game publisher, helping global game developers monetise and grow in African markets.',
   'growth','series-b',40000000,27000000,120000000,16,1500000,120,2000000,82,
   'https://www.youtube.com/results?search_query=Carry1st+gaming+Africa','active',true,true,true,true,now()-interval '14 months'),

  (v_uid,'Audiomack','Media','Music Streaming','Pan-Africa','https://audiomack.com',
   'Stream and share music free — no streams limit',
   'Audiomack is a free music streaming and discovery platform with a massive African user base, popular for Afrobeats, Amapiano and hip-hop.',
   'scale','series-b',20000000,10000000,100000000,5,2000000,300,30000000,87,
   'https://www.youtube.com/results?search_query=Audiomack+music+Africa','active',true,true,true,true,now()-interval '20 months'),

  (v_uid,'Bundle Africa','Media','Crypto & Social','Nigeria','https://bundle.africa',
   'Social payments powered by crypto',
   'Bundle Africa is a social payments and crypto wallet app that lets Africans send money and crypto through a social feed interface.',
   'early','series-a',10000000,4000000,20000000,22,200000,60,500000,70,
   'https://www.youtube.com/results?search_query=Bundle+Africa+Nigeria+crypto','active',true,false,true,false,now()-interval '10 months'),

  -- ── Real Estate / PropTech (2) ─────────────────────────────────────────────
  (v_uid,'PropertyPro','Real Estate','Property Listings','Nigeria','https://propertypro.ng',
   'Nigeria''s #1 property portal',
   'PropertyPro is Nigeria''s largest property search and listing platform with over 100,000 properties for sale and rent.',
   'growth','series-b',15000000,5000000,30000000,20,600000,100,500000,76,
   'https://www.youtube.com/results?search_query=PropertyPro+Nigeria+real+estate','active',true,false,true,true,now()-interval '16 months'),

  (v_uid,'Pockets Africa','Real Estate','Fractional Investment','Nigeria','https://pockets.africa',
   'Own a piece of Africa''s best real estate',
   'Pockets.africa enables fractional ownership of high-yield commercial and residential real estate in Nigeria from as little as $10.',
   'early','seed',10000000,3000000,15000000,28,100000,40,5000,67,
   'https://www.youtube.com/results?search_query=Pockets+Africa+real+estate+investment','active',true,false,false,false,now()-interval '6 months');

  -- ── Deals: 30 deals across top companies ──────────────────────────────────
  INSERT INTO public.venturex_deals (company_id, investor_id, company_user_id, investor_user_id, amount, equity_percentage, valuation, status, created_at, updated_at)
  SELECT vc.id, v_inv4, vc.user_id, v_uid, 20000000, 6, 333000000, 'closed', now()-interval '28 months', now()-interval '20 months'
  FROM venturex_companies vc WHERE vc.legal_name = 'Flutterwave';

  INSERT INTO public.venturex_deals (company_id, investor_id, company_user_id, investor_user_id, amount, equity_percentage, valuation, status, created_at, updated_at)
  SELECT vc.id, v_inv4, vc.user_id, v_uid, 8000000, 8, 100000000, 'signed', now()-interval '26 months', now()-interval '22 months'
  FROM venturex_companies vc WHERE vc.legal_name = 'Paystack';

  INSERT INTO public.venturex_deals (company_id, investor_id, company_user_id, investor_user_id, amount, equity_percentage, valuation, status, created_at, updated_at)
  SELECT vc.id, v_inv1, vc.user_id, v_uid, 5000000, 10, 50000000, 'closed', now()-interval '20 months', now()-interval '14 months'
  FROM venturex_companies vc WHERE vc.legal_name = 'Chipper Cash';

  INSERT INTO public.venturex_deals (company_id, investor_id, company_user_id, investor_user_id, amount, equity_percentage, valuation, status, created_at, updated_at)
  SELECT vc.id, v_inv1, vc.user_id, v_uid, 10000000, 8, 125000000, 'signed', now()-interval '18 months', now()-interval '12 months'
  FROM venturex_companies vc WHERE vc.legal_name = 'Wave';

  INSERT INTO public.venturex_deals (company_id, investor_id, company_user_id, investor_user_id, amount, equity_percentage, valuation, status, created_at, updated_at)
  SELECT vc.id, v_inv2, vc.user_id, v_uid, 2000000, 15, 13000000, 'closed', now()-interval '15 months', now()-interval '10 months'
  FROM venturex_companies vc WHERE vc.legal_name = 'Kuda Bank';

  INSERT INTO public.venturex_deals (company_id, investor_id, company_user_id, investor_user_id, amount, equity_percentage, valuation, status, created_at, updated_at)
  SELECT vc.id, v_inv3, vc.user_id, v_uid, 15000000, 10, 150000000, 'signed', now()-interval '22 months', now()-interval '16 months'
  FROM venturex_companies vc WHERE vc.legal_name = 'Zipline';

  INSERT INTO public.venturex_deals (company_id, investor_id, company_user_id, investor_user_id, amount, equity_percentage, valuation, status, created_at, updated_at)
  SELECT vc.id, v_inv3, vc.user_id, v_uid, 5000000, 12, 41000000, 'closed', now()-interval '14 months', now()-interval '8 months'
  FROM venturex_companies vc WHERE vc.legal_name = 'Twiga Foods';

  INSERT INTO public.venturex_deals (company_id, investor_id, company_user_id, investor_user_id, amount, equity_percentage, valuation, status, created_at, updated_at)
  SELECT vc.id, v_inv1, vc.user_id, v_uid, 8000000, 10, 80000000, 'signed', now()-interval '16 months', now()-interval '10 months'
  FROM venturex_companies vc WHERE vc.legal_name = 'Wasoko';

  INSERT INTO public.venturex_deals (company_id, investor_id, company_user_id, investor_user_id, amount, equity_percentage, valuation, status, created_at, updated_at)
  SELECT vc.id, v_inv4, vc.user_id, v_uid, 12000000, 8, 150000000, 'closed', now()-interval '18 months', now()-interval '10 months'
  FROM venturex_companies vc WHERE vc.legal_name = 'Tyme Bank';

  INSERT INTO public.venturex_deals (company_id, investor_id, company_user_id, investor_user_id, amount, equity_percentage, valuation, status, created_at, updated_at)
  SELECT vc.id, v_inv4, vc.user_id, v_uid, 15000000, 7, 214000000, 'signed', now()-interval '20 months', now()-interval '14 months'
  FROM venturex_companies vc WHERE vc.legal_name = 'Branch';

  INSERT INTO public.venturex_deals (company_id, investor_id, company_user_id, investor_user_id, amount, equity_percentage, valuation, status, created_at, updated_at)
  SELECT vc.id, v_inv1, vc.user_id, v_uid, 10000000, 9, 111000000, 'negotiating', now()-interval '6 months', now()-interval '1 month'
  FROM venturex_companies vc WHERE vc.legal_name = 'Moniepoint';

  INSERT INTO public.venturex_deals (company_id, investor_id, company_user_id, investor_user_id, amount, equity_percentage, valuation, status, created_at, updated_at)
  SELECT vc.id, v_inv3, vc.user_id, v_uid, 8000000, 12, 66000000, 'proposed', now()-interval '3 months', now()-interval '1 month'
  FROM venturex_companies vc WHERE vc.legal_name = 'M-KOPA Solar';

  INSERT INTO public.venturex_deals (company_id, investor_id, company_user_id, investor_user_id, amount, equity_percentage, valuation, status, created_at, updated_at)
  SELECT vc.id, v_inv3, vc.user_id, v_uid, 3000000, 14, 21000000, 'closed', now()-interval '12 months', now()-interval '6 months'
  FROM venturex_companies vc WHERE vc.legal_name = 'Apollo Agriculture';

  INSERT INTO public.venturex_deals (company_id, investor_id, company_user_id, investor_user_id, amount, equity_percentage, valuation, status, created_at, updated_at)
  SELECT vc.id, v_inv5, vc.user_id, v_uid, 5000000, 10, 50000000, 'signed', now()-interval '14 months', now()-interval '8 months'
  FROM venturex_companies vc WHERE vc.legal_name = 'Paymob';

  INSERT INTO public.venturex_deals (company_id, investor_id, company_user_id, investor_user_id, amount, equity_percentage, valuation, status, created_at, updated_at)
  SELECT vc.id, v_inv5, vc.user_id, v_uid, 4000000, 12, 33000000, 'closed', now()-interval '16 months', now()-interval '9 months'
  FROM venturex_companies vc WHERE vc.legal_name = 'Vezeeta';

  INSERT INTO public.venturex_deals (company_id, investor_id, company_user_id, investor_user_id, amount, equity_percentage, valuation, status, created_at, updated_at)
  SELECT vc.id, v_inv5, vc.user_id, v_uid, 5000000, 8, 62000000, 'signed', now()-interval '22 months', now()-interval '14 months'
  FROM venturex_companies vc WHERE vc.legal_name = 'Instabug';

  INSERT INTO public.venturex_deals (company_id, investor_id, company_user_id, investor_user_id, amount, equity_percentage, valuation, status, created_at, updated_at)
  SELECT vc.id, v_inv2, vc.user_id, v_uid, 1500000, 18, 8300000, 'closed', now()-interval '11 months', now()-interval '5 months'
  FROM venturex_companies vc WHERE vc.legal_name = 'Prembly';

  INSERT INTO public.venturex_deals (company_id, investor_id, company_user_id, investor_user_id, amount, equity_percentage, valuation, status, created_at, updated_at)
  SELECT vc.id, v_inv1, vc.user_id, v_uid, 7000000, 9, 77000000, 'negotiating', now()-interval '5 months', now()-interval '2 months'
  FROM venturex_companies vc WHERE vc.legal_name = 'Moove';

  INSERT INTO public.venturex_deals (company_id, investor_id, company_user_id, investor_user_id, amount, equity_percentage, valuation, status, created_at, updated_at)
  SELECT vc.id, v_inv1, vc.user_id, v_uid, 10000000, 8, 125000000, 'signed', now()-interval '12 months', now()-interval '6 months'
  FROM venturex_companies vc WHERE vc.legal_name = 'Yassir';

  INSERT INTO public.venturex_deals (company_id, investor_id, company_user_id, investor_user_id, amount, equity_percentage, valuation, status, created_at, updated_at)
  SELECT vc.id, v_inv3, vc.user_id, v_uid, 3000000, 12, 25000000, 'proposed', now()-interval '2 months', now()-interval '1 month'
  FROM venturex_companies vc WHERE vc.legal_name = 'BasiGo';

  INSERT INTO public.venturex_deals (company_id, investor_id, company_user_id, investor_user_id, amount, equity_percentage, valuation, status, created_at, updated_at)
  SELECT vc.id, v_inv1, vc.user_id, v_uid, 12000000, 8, 150000000, 'closed', now()-interval '17 months', now()-interval '9 months'
  FROM venturex_companies vc WHERE vc.legal_name = 'Andela';

  INSERT INTO public.venturex_deals (company_id, investor_id, company_user_id, investor_user_id, amount, equity_percentage, valuation, status, created_at, updated_at)
  SELECT vc.id, v_inv1, vc.user_id, v_uid, 15000000, 6, 250000000, 'closed', now()-interval '16 months', now()-interval '8 months'
  FROM venturex_companies vc WHERE vc.legal_name = 'ALX Africa';

  INSERT INTO public.venturex_deals (company_id, investor_id, company_user_id, investor_user_id, amount, equity_percentage, valuation, status, created_at, updated_at)
  SELECT vc.id, v_inv4, vc.user_id, v_uid, 3000000, 12, 25000000, 'signed', now()-interval '8 months', now()-interval '3 months'
  FROM venturex_companies vc WHERE vc.legal_name = 'Naked Insurance';

  INSERT INTO public.venturex_deals (company_id, investor_id, company_user_id, investor_user_id, amount, equity_percentage, valuation, status, created_at, updated_at)
  SELECT vc.id, v_inv2, vc.user_id, v_uid, 1500000, 20, 7500000, 'closed', now()-interval '7 months', now()-interval '3 months'
  FROM venturex_companies vc WHERE vc.legal_name = 'Ampersand';

  INSERT INTO public.venturex_deals (company_id, investor_id, company_user_id, investor_user_id, amount, equity_percentage, valuation, status, created_at, updated_at)
  SELECT vc.id, v_inv3, vc.user_id, v_uid, 4000000, 12, 33000000, 'negotiating', now()-interval '4 months', now()-interval '1 month'
  FROM venturex_companies vc WHERE vc.legal_name = 'Kobo360';

  INSERT INTO public.venturex_deals (company_id, investor_id, company_user_id, investor_user_id, amount, equity_percentage, valuation, status, created_at, updated_at)
  SELECT vc.id, v_inv3, vc.user_id, v_uid, 6000000, 10, 60000000, 'closed', now()-interval '13 months', now()-interval '7 months'
  FROM venturex_companies vc WHERE vc.legal_name = 'Trella';

  INSERT INTO public.venturex_deals (company_id, investor_id, company_user_id, investor_user_id, amount, equity_percentage, valuation, status, created_at, updated_at)
  SELECT vc.id, v_inv2, vc.user_id, v_uid, 1000000, 22, 4500000, 'closed', now()-interval '9 months', now()-interval '4 months'
  FROM venturex_companies vc WHERE vc.legal_name = 'Ubenwa';

  INSERT INTO public.venturex_deals (company_id, investor_id, company_user_id, investor_user_id, amount, equity_percentage, valuation, status, created_at, updated_at)
  SELECT vc.id, v_inv4, vc.user_id, v_uid, 4000000, 14, 28000000, 'proposed', now()-interval '3 months', now()-interval '1 month'
  FROM venturex_companies vc WHERE vc.legal_name = '54gene';

  INSERT INTO public.venturex_deals (company_id, investor_id, company_user_id, investor_user_id, amount, equity_percentage, valuation, status, created_at, updated_at)
  SELECT vc.id, v_inv1, vc.user_id, v_uid, 3000000, 12, 25000000, 'signed', now()-interval '10 months', now()-interval '5 months'
  FROM venturex_companies vc WHERE vc.legal_name = 'Carry1st';

  INSERT INTO public.venturex_deals (company_id, investor_id, company_user_id, investor_user_id, amount, equity_percentage, valuation, status, created_at, updated_at)
  SELECT vc.id, v_inv2, vc.user_id, v_uid, 1200000, 20, 6000000, 'closed', now()-interval '8 months', now()-interval '3 months'
  FROM venturex_companies vc WHERE vc.legal_name = 'Oze';

  -- ── Milestones ────────────────────────────────────────────────────────────
  INSERT INTO public.venturex_milestones (deal_id, title, description, is_completed, is_verified, completed_at)
  SELECT d.id, 'Series D Close', 'Completion of $474M Series D fundraise', true, true, now()-interval '18 months'
  FROM venturex_deals d JOIN venturex_companies vc ON vc.id=d.company_id WHERE vc.legal_name='Flutterwave' AND d.status='closed' LIMIT 1;

  INSERT INTO public.venturex_milestones (deal_id, title, description, is_completed, is_verified, completed_at)
  SELECT d.id, '1M Active Merchants', 'Platform reached 1M active merchants globally', true, true, now()-interval '16 months'
  FROM venturex_deals d JOIN venturex_companies vc ON vc.id=d.company_id WHERE vc.legal_name='Flutterwave' AND d.status='closed' LIMIT 1;

  INSERT INTO public.venturex_milestones (deal_id, title, description, is_completed, is_verified, completed_at)
  SELECT d.id, 'Stripe Acquisition', 'Acquired by Stripe for $200M', true, true, now()-interval '22 months'
  FROM venturex_deals d JOIN venturex_companies vc ON vc.id=d.company_id WHERE vc.legal_name='Paystack' AND d.status='signed' LIMIT 1;

  INSERT INTO public.venturex_milestones (deal_id, title, description, is_completed, is_verified, completed_at)
  SELECT d.id, '5M Users', 'Reached 5 million registered users across Africa', true, true, now()-interval '14 months'
  FROM venturex_deals d JOIN venturex_companies vc ON vc.id=d.company_id WHERE vc.legal_name='Chipper Cash' AND d.status='closed' LIMIT 1;

  INSERT INTO public.venturex_milestones (deal_id, title, description, is_completed, is_verified, completed_at)
  SELECT d.id, 'Rwanda Expansion', 'Launched drone delivery services across all of Rwanda', true, true, now()-interval '20 months'
  FROM venturex_deals d JOIN venturex_companies vc ON vc.id=d.company_id WHERE vc.legal_name='Zipline' AND d.status='signed' LIMIT 1;

  INSERT INTO public.venturex_milestones (deal_id, title, description, is_completed, is_verified, completed_at)
  SELECT d.id, '500K Deliveries', 'Completed 500,000 autonomous drone deliveries', true, true, now()-interval '15 months'
  FROM venturex_deals d JOIN venturex_companies vc ON vc.id=d.company_id WHERE vc.legal_name='Zipline' AND d.status='signed' LIMIT 1;

  INSERT INTO public.venturex_milestones (deal_id, title, description, is_completed, is_verified, completed_at)
  SELECT d.id, '8M Customers', 'TymeBank reached 8 million customers', true, true, now()-interval '10 months'
  FROM venturex_deals d JOIN venturex_companies vc ON vc.id=d.company_id WHERE vc.legal_name='Tyme Bank' AND d.status='closed' LIMIT 1;

  INSERT INTO public.venturex_milestones (deal_id, title, description, is_completed, is_verified, completed_at)
  SELECT d.id, '4M Solar Systems', 'M-KOPA deployed 4 million solar home systems', true, true, now()-interval '12 months'
  FROM venturex_deals d JOIN venturex_companies vc ON vc.id=d.company_id WHERE vc.legal_name='M-KOPA Solar' AND d.status='proposed' LIMIT 1;

  INSERT INTO public.venturex_milestones (deal_id, title, description, is_completed, is_verified, completed_at)
  SELECT d.id, 'Profitable Quarter', 'First profitable quarter with positive EBITDA', true, true, now()-interval '8 months'
  FROM venturex_deals d JOIN venturex_companies vc ON vc.id=d.company_id WHERE vc.legal_name='Andela' AND d.status='closed' LIMIT 1;

  INSERT INTO public.venturex_milestones (deal_id, title, description, is_completed, is_verified, completed_at)
  SELECT d.id, 'Series E Funding', 'Closed $200M Series E at $1.5B valuation', true, true, now()-interval '14 months'
  FROM venturex_deals d JOIN venturex_companies vc ON vc.id=d.company_id WHERE vc.legal_name='Andela' AND d.status='closed' LIMIT 1;

  INSERT INTO public.venturex_milestones (deal_id, title, description, is_completed, is_verified, completed_at)
  SELECT d.id, '100K Tech Professionals', 'ALX Africa trained and placed 100,000 tech professionals', true, true, now()-interval '10 months'
  FROM venturex_deals d JOIN venturex_companies vc ON vc.id=d.company_id WHERE vc.legal_name='ALX Africa' AND d.status='closed' LIMIT 1;

  INSERT INTO public.venturex_milestones (deal_id, title, description, is_completed, is_verified, completed_at)
  SELECT d.id, 'Egypt Expansion', 'Launched operations in Egypt with 50,000 users in first month', true, true, now()-interval '6 months'
  FROM venturex_deals d JOIN venturex_companies vc ON vc.id=d.company_id WHERE vc.legal_name='Yassir' AND d.status='signed' LIMIT 1;

  INSERT INTO public.venturex_milestones (deal_id, title, description, is_completed, is_verified, completed_at)
  SELECT d.id, '25,000 App Integrations', 'Instabug SDK integrated in 25,000 mobile applications worldwide', true, true, now()-interval '18 months'
  FROM venturex_deals d JOIN venturex_companies vc ON vc.id=d.company_id WHERE vc.legal_name='Instabug' AND d.status='signed' LIMIT 1;

  INSERT INTO public.venturex_milestones (deal_id, title, description, is_completed, is_verified, completed_at)
  SELECT d.id, '300K Farmers Reached', 'Apollo Agriculture reached 300,000 smallholder farmers', true, true, now()-interval '9 months'
  FROM venturex_deals d JOIN venturex_companies vc ON vc.id=d.company_id WHERE vc.legal_name='Apollo Agriculture' AND d.status='closed' LIMIT 1;

  INSERT INTO public.venturex_milestones (deal_id, title, description, is_completed, is_verified, completed_at)
  SELECT d.id, 'MENA Footprint Expanded', 'Vezeeta acquired competitor to expand MENA footprint', true, true, now()-interval '11 months'
  FROM venturex_deals d JOIN venturex_companies vc ON vc.id=d.company_id WHERE vc.legal_name='Vezeeta' AND d.status='closed' LIMIT 1;

  INSERT INTO public.venturex_milestones (deal_id, title, description, is_completed, is_verified, completed_at)
  SELECT d.id, 'Break-Even Reached', 'Branch International reached monthly break-even', true, true, now()-interval '7 months'
  FROM venturex_deals d JOIN venturex_companies vc ON vc.id=d.company_id WHERE vc.legal_name='Branch' AND d.status='signed' LIMIT 1;

  RAISE NOTICE 'VentureX seed complete: 80 real African startups, 5 investors, 30 deals, 15 milestones inserted.';
END $$;
