-- ============================================================
-- IFB DEMO SEED — 20,000 Verified Users
-- 10,000 Investors + 10,000 Entrepreneurs with Companies
-- Heavy VentureX Activity (~30,000 Deals + Milestones)
-- Default login password: password
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- 1. AUTH USERS  (20,000 verified, email-confirmed accounts)
-- ════════════════════════════════════════════════════════════
INSERT INTO auth.users (
  id, instance_id, aud, role, email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user
)
SELECT
  md5('ifbseed_' || i)::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'ifbseed' || i || '@ifbplatform.com',
  -- bcrypt hash of 'password'
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  NOW() - ((random() * 700)::int || ' days')::interval,
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name',
    (ARRAY[
      'Amara Johnson','Kofi Mensah','Fatima Al-Hassan','Chioma Okonkwo','Diallo Sylla',
      'Aisha Rahman','Emeka Nwosu','Yasmin Khalil','Ibrahim Traoré','Nguyen Thi Lan',
      'Sofia Andersen','Lena Müller','Marcus Williams','Chen Wei','Priya Sharma',
      'James Osei','Sarah Mitchell','Mohammed Al-Farsi','Elena Popescu','David Kim',
      'Aaliyah Thompson','Kwame Asante','Nadia Benzara','Oluwaseun Adeyemi','Pierre Leclerc',
      'Mei Tanaka','Carlos Silva','Zara Ahmed','Raj Patel','Emma Dubois',
      'Tariq Hassan','Blessing Eze','Victor Andrade','Leila Nazari','Nathan Brooks',
      'Ama Boateng','Felix Schneider','Rania Mahmoud','Samuel Okafor','Lin Xiao',
      'Adaeze Obi','Gabriel Ferreira','Hana Suzuki','Bongani Dlamini','Claire Martin',
      'Yusuf Ozturk','Miriam Gebremichael','Thomas Weber','Nia Akosua','Kenji Yamamoto'
    ])[(i % 50) + 1]
  ),
  NOW() - ((random() * 700)::int || ' days')::interval,
  NOW(),
  FALSE
FROM generate_series(1, 20000) AS i
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════
-- 2. PROFILES  (KYC verified, all CoT processors)
-- ════════════════════════════════════════════════════════════
INSERT INTO public.profiles (
  id, full_name, country,
  kyc_status, is_cot_processor, cot_rating, cot_completed_tx,
  cot_payment_methods, has_completed_tour
)
SELECT
  md5('ifbseed_' || i)::uuid,
  (ARRAY[
    'Amara Johnson','Kofi Mensah','Fatima Al-Hassan','Chioma Okonkwo','Diallo Sylla',
    'Aisha Rahman','Emeka Nwosu','Yasmin Khalil','Ibrahim Traoré','Nguyen Thi Lan',
    'Sofia Andersen','Lena Müller','Marcus Williams','Chen Wei','Priya Sharma',
    'James Osei','Sarah Mitchell','Mohammed Al-Farsi','Elena Popescu','David Kim',
    'Aaliyah Thompson','Kwame Asante','Nadia Benzara','Oluwaseun Adeyemi','Pierre Leclerc',
    'Mei Tanaka','Carlos Silva','Zara Ahmed','Raj Patel','Emma Dubois',
    'Tariq Hassan','Blessing Eze','Victor Andrade','Leila Nazari','Nathan Brooks',
    'Ama Boateng','Felix Schneider','Rania Mahmoud','Samuel Okafor','Lin Xiao',
    'Adaeze Obi','Gabriel Ferreira','Hana Suzuki','Bongani Dlamini','Claire Martin',
    'Yusuf Ozturk','Miriam Gebremichael','Thomas Weber','Nia Akosua','Kenji Yamamoto'
  ])[(i % 50) + 1],
  (ARRAY[
    'Nigeria','Kenya','Ghana','South Africa','Ethiopia','Rwanda','Senegal','Côte d''Ivoire',
    'United States','United Kingdom','France','Germany','Netherlands','Switzerland','Canada','Australia',
    'India','Singapore','United Arab Emirates','Brazil','Mexico','Colombia','Chile','Argentina',
    'Indonesia','Malaysia','Philippines','Vietnam','Thailand','South Korea'
  ])[(i % 30) + 1],
  'verified',
  TRUE,
  ROUND((75 + random() * 25)::numeric, 2),
  (random() * 300)::int,
  '["Bank Transfer","Mobile Money","Card","Crypto"]'::jsonb,
  TRUE
FROM generate_series(1, 20000) AS i
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════
-- 3. BALANCES  (realistic wealth levels)
-- ════════════════════════════════════════════════════════════
INSERT INTO public.balances (
  user_id, liquid_usd, alpha_equity_usd, mysafe_digital_usd, afr_balance
)
SELECT
  md5('ifbseed_' || i)::uuid,
  ROUND((500  + random() * 249500)::numeric, 2),
  ROUND((random() * 100000)::numeric, 2),
  ROUND((random() * 50000)::numeric, 2),
  ROUND((50   + random() * 9950)::numeric,  2)
FROM generate_series(1, 20000) AS i
ON CONFLICT (user_id) DO NOTHING;

-- ════════════════════════════════════════════════════════════
-- 4. INVESTORS  (users 1 – 10,000)
-- ════════════════════════════════════════════════════════════
INSERT INTO public.venturex_investors (
  id, user_id,
  investor_type, fund_name, bio,
  total_capital_available, average_ticket_size, max_ticket_size,
  preferred_sectors, preferred_stage, preferred_geography,
  risk_level, provides_mentorship, provides_network,
  number_of_investments, is_active, created_at
)
SELECT
  gen_random_uuid(),
  md5('ifbseed_' || i)::uuid,
  (ARRAY['angel','vc','family_office','corporate','impact'])[(i % 5) + 1],
  CASE i % 8
    WHEN 0 THEN 'Horizon Ventures Fund '    || (i / 100 + 1)
    WHEN 1 THEN 'Atlas Family Office'
    WHEN 2 THEN 'Meridian Capital Partners'
    WHEN 3 THEN 'Impact First Capital'
    WHEN 4 THEN 'Pioneer Angel Network'
    WHEN 5 THEN 'Frontier Growth Partners'
    WHEN 6 THEN 'IFB Syndicate '            || (i / 200 + 1)
    ELSE        'Sovereign Wealth Initiative'
  END,
  'Experienced investor focused on emerging markets and frontier technology.',
  ROUND((50000   + random() * 9950000)::numeric, 2),
  ROUND((10000   + random() *  490000)::numeric, 2),
  ROUND((100000  + random() * 4900000)::numeric, 2),
  jsonb_build_array(
    (ARRAY['FinTech','AgriTech','HealthTech','EdTech','CleanEnergy','Logistics',
           'E-Commerce','AI/ML','Blockchain','Real Estate','InsurTech','FoodTech',
           'BioTech','Gaming','Media','Mobility','PropTech','LegalTech','HRTech','CyberSecurity'])[(i % 20) + 1],
    (ARRAY['FinTech','AgriTech','HealthTech','EdTech','CleanEnergy','Logistics',
           'E-Commerce','AI/ML','Blockchain','Real Estate','InsurTech','FoodTech',
           'BioTech','Gaming','Media','Mobility','PropTech','LegalTech','HRTech','CyberSecurity'])[((i + 7) % 20) + 1]
  ),
  jsonb_build_array(
    (ARRAY['pre-seed','seed','series-a','series-b','growth'])[(i % 5) + 1]
  ),
  jsonb_build_array(
    (ARRAY['Nigeria','Kenya','Ghana','South Africa','USA','UK','France',
           'Germany','India','Singapore','UAE','Brazil'])[(i % 12) + 1]
  ),
  (ARRAY['low','medium','high'])[(i % 3) + 1],
  (i % 3 = 0),
  (i % 2 = 0),
  (random() * 25)::int,
  TRUE,
  NOW() - ((random() * 700)::int || ' days')::interval
FROM generate_series(1, 10000) AS i
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════════════════════════
-- 5. COMPANIES  (users 10,001 – 20,000, entrepreneurs)
-- ════════════════════════════════════════════════════════════
INSERT INTO public.venturex_companies (
  id, user_id, legal_name, country, sector, tagline,
  monthly_revenue, revenue_growth_rate, gross_margin, net_profit,
  monthly_burn_rate, cash_on_hand,
  total_raised, current_round, valuation, funding_goal, equity_offered,
  product_stage, active_users, user_growth_rate, retention_rate,
  team_size, tam, sam, som,
  cac, ltv, conversion_rate,
  investment_readiness_score, risk_score, growth_score,
  status, is_public, created_at
)
SELECT
  gen_random_uuid(),
  md5('ifbseed_' || i)::uuid,
  -- Company brand name
  (ARRAY[
    'NovaPay','GreenRoot','MediAI','LearnSphere','SolarGrid',
    'FleetLink','TradeHub','DeepMind Africa','ChainLedger','PropVault',
    'CoverEasy','FarmFresh','GenoBio','PlayForge','StreamAfrica',
    'RideNow','UrbanNest','LexAI','TalentBridge','ShieldNet',
    'AgroSmart','ClearHealth','EduPath','VoltEnergy','CargoEx',
    'MarketBase','NeuralHub','TrustChain','HomeKey','PolicyAI',
    'CropLink','BioSynth','GameLab','ContentHive','MoveEasy',
    'CitySpace','JusticeTech','WorkForce','SecureNet','PayBridge',
    'EcoHarvest','MedConnect','SkillUp','WindPower','RouteAI',
    'DataMart','QuantumLedger','RentSmart','RiskGuard','FoodFlow'
  ])[((i - 10001) % 50) + 1] || ' Technologies',
  -- Country
  (ARRAY[
    'Nigeria','Kenya','Ghana','South Africa','Ethiopia','Rwanda','Senegal','Côte d''Ivoire',
    'United States','United Kingdom','France','Germany','Netherlands','Switzerland','Canada','Australia',
    'India','Singapore','United Arab Emirates','Brazil','Mexico','Colombia','Chile','Argentina',
    'Indonesia','Malaysia','Philippines','Vietnam','Thailand','South Korea'
  ])[((i - 10001) % 30) + 1],
  -- Sector
  (ARRAY[
    'FinTech','AgriTech','HealthTech','EdTech','CleanEnergy','Logistics',
    'E-Commerce','AI/ML','Blockchain','Real Estate','InsurTech','FoodTech',
    'BioTech','Gaming','Media','Mobility','PropTech','LegalTech','HRTech','CyberSecurity'
  ])[((i - 10001) % 20) + 1],
  'Transforming the future of ' ||
  (ARRAY[
    'FinTech','AgriTech','HealthTech','EdTech','CleanEnergy','Logistics',
    'E-Commerce','AI/ML','Blockchain','Real Estate','InsurTech','FoodTech',
    'BioTech','Gaming','Media','Mobility','PropTech','LegalTech','HRTech','CyberSecurity'
  ])[((i - 10001) % 20) + 1] || ' for the next billion users',
  -- Financials
  ROUND((5000  + random() * 995000)::numeric,  2),   -- monthly_revenue
  ROUND((5     + random() * 95)::numeric,       2),   -- revenue_growth_rate
  ROUND((25    + random() * 55)::numeric,       2),   -- gross_margin
  ROUND((-5000 + random() * 80000)::numeric,    2),   -- net_profit
  ROUND((10000 + random() * 290000)::numeric,   2),   -- monthly_burn_rate
  ROUND((50000 + random() * 4950000)::numeric,  2),   -- cash_on_hand
  -- Funding
  ROUND((random() * 5000000)::numeric,          2),   -- total_raised
  (ARRAY['pre-seed','seed','series-a','series-b'])[((i - 10001) % 4) + 1],
  ROUND((500000 + random() * 99500000)::numeric,2),   -- valuation
  ROUND((200000 + random() * 9800000)::numeric, 2),   -- funding_goal
  ROUND((5      + random() * 30)::numeric,      2),   -- equity_offered
  -- Product
  (ARRAY['mvp','beta','launched','scaling','profitable'])[((i - 10001) % 5) + 1],
  (random() * 100000)::int,                            -- active_users
  ROUND((10 + random() * 90)::numeric,          2),   -- user_growth_rate
  ROUND((45 + random() * 45)::numeric,          2),   -- retention_rate
  (2 + random() * 98)::int,                            -- team_size
  -- Market size
  ROUND((10000000   + random() * 4990000000)::numeric, 0),  -- tam
  ROUND((1000000    + random() *  499000000)::numeric, 0),  -- sam
  ROUND((100000     + random() *   49900000)::numeric, 0),  -- som
  -- Unit economics
  ROUND((10  + random() * 490)::numeric, 2),           -- cac
  ROUND((500 + random() * 9500)::numeric,2),           -- ltv
  ROUND((1   + random() * 29)::numeric,  2),           -- conversion_rate
  -- Scores
  ROUND((40 + random() * 60)::numeric,  2),            -- investment_readiness_score
  ROUND((10 + random() * 60)::numeric,  2),            -- risk_score
  ROUND((30 + random() * 70)::numeric,  2),            -- growth_score
  -- Status
  'active',
  TRUE,
  NOW() - ((random() * 700)::int || ' days')::interval
FROM generate_series(10001, 20000) AS i
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════════════════════════
-- 6. COMMERCIAL PROFILES  (Pascaline approved — all entrepreneurs)
-- ════════════════════════════════════════════════════════════
INSERT INTO public.commercial_profiles (
  id, company_name, sector, registration_country,
  annual_revenue, monthly_burn_rate, debt_to_equity_ratio,
  pascaline_status
)
SELECT
  md5('ifbseed_' || i)::uuid,
  (ARRAY[
    'NovaPay','GreenRoot','MediAI','LearnSphere','SolarGrid',
    'FleetLink','TradeHub','DeepMind Africa','ChainLedger','PropVault',
    'CoverEasy','FarmFresh','GenoBio','PlayForge','StreamAfrica',
    'RideNow','UrbanNest','LexAI','TalentBridge','ShieldNet'
  ])[((i - 10001) % 20) + 1] || ' Technologies',
  (ARRAY[
    'FinTech','AgriTech','HealthTech','EdTech','CleanEnergy','Logistics',
    'E-Commerce','AI/ML','Blockchain','Real Estate','InsurTech','FoodTech',
    'BioTech','Gaming','Media','Mobility','PropTech','LegalTech','HRTech','CyberSecurity'
  ])[((i - 10001) % 20) + 1],
  (ARRAY[
    'Nigeria','Kenya','Ghana','South Africa','Ethiopia','Rwanda','Senegal',
    'United States','United Kingdom','France','Germany','India','Singapore','UAE','Brazil'
  ])[((i - 10001) % 15) + 1],
  ROUND((60000   + random() * 11940000)::numeric, 2),
  ROUND((10000   + random() *  290000)::numeric,  2),
  ROUND((0.1     + random() * 2.9)::numeric,      2),
  'eligible_for_funding'
FROM generate_series(10001, 20000) AS i
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════
-- 7. IFB COMPANIES  (Dark Pool private equity listings)
--    Columns from WealthInvest: name, sector, valuation, deus_score, status
-- ════════════════════════════════════════════════════════════
DO $$
BEGIN
  INSERT INTO public.ifb_companies (name, sector, valuation, deus_score, status)
  SELECT
    (ARRAY[
      'NovaPay','GreenRoot','MediAI','LearnSphere','SolarGrid',
      'FleetLink','TradeHub','DeepMind Africa','ChainLedger','PropVault',
      'CoverEasy','FarmFresh','GenoBio','PlayForge','StreamAfrica',
      'RideNow','UrbanNest','LexAI','TalentBridge','ShieldNet',
      'AgroSmart','ClearHealth','EduPath','VoltEnergy','CargoEx',
      'MarketBase','NeuralHub','TrustChain','HomeKey','PolicyAI',
      'CropLink','BioSynth','GameLab','ContentHive','MoveEasy',
      'CitySpace','JusticeTech','WorkForce','SecureNet','PayBridge',
      'EcoHarvest','MedConnect','SkillUp','WindPower','RouteAI',
      'DataMart','QuantumLedger','RentSmart','RiskGuard','FoodFlow'
    ])[((i - 1) % 50) + 1] || ' Technologies',
    (ARRAY[
      'FinTech','AgriTech','HealthTech','EdTech','CleanEnergy','Logistics',
      'E-Commerce','AI/ML','Blockchain','Real Estate','InsurTech','FoodTech',
      'BioTech','Gaming','Media','Mobility','PropTech','LegalTech','HRTech','CyberSecurity'
    ])[(i % 20) + 1],
    ROUND((500000 + random() * 99500000)::numeric, 2),
    ROUND((60    + random() * 40)::numeric,        2),
    'APPROVED'
  FROM generate_series(1, 10000) AS i;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'ifb_companies insert skipped: % — check column names', SQLERRM;
END $$;

-- ════════════════════════════════════════════════════════════
-- 8. VENTUREX DEALS  (3 per company = ~30,000 deals)
--    Pairs each company with 3 distinct investors via modular rn
-- ════════════════════════════════════════════════════════════
WITH seed_companies AS (
  SELECT vc.id, vc.user_id,
         ROW_NUMBER() OVER (ORDER BY vc.created_at) AS rn
  FROM   public.venturex_companies vc
  JOIN   auth.users au ON au.id = vc.user_id
  WHERE  au.email LIKE '%@ifbplatform.com'
  LIMIT  10000
),
seed_investors AS (
  SELECT vi.id, vi.user_id,
         ROW_NUMBER() OVER (ORDER BY vi.created_at) AS rn
  FROM   public.venturex_investors vi
  JOIN   auth.users au ON au.id = vi.user_id
  WHERE  au.email LIKE '%@ifbplatform.com'
  LIMIT  10000
),
deal_pairs AS (
  SELECT
    c.id             AS company_id,
    c.user_id        AS company_user_id,
    i.id             AS investor_id,
    i.user_id        AS investor_user_id,
    d.deal_num
  FROM  seed_companies c
  CROSS JOIN LATERAL (VALUES (0),(1),(2)) AS d(deal_num)
  JOIN  seed_investors i
    ON  i.rn = ((c.rn + d.deal_num * 3334 - 1) % 10000) + 1
)
INSERT INTO public.venturex_deals (
  company_id, investor_id, company_user_id, investor_user_id,
  amount, equity_percentage, valuation,
  status, funds_released,
  total_milestones, completed_milestones,
  ifb_commission_rate, success_fee_rate,
  created_at, updated_at
)
SELECT
  company_id, investor_id, company_user_id, investor_user_id,
  ROUND((50000  + random() * 950000)::numeric,  2),
  ROUND((3      + random() * 22)::numeric,      2),
  ROUND((1000000+ random() * 49000000)::numeric,2),
  (ARRAY['proposed','negotiating','signed','closed','signed'])[(deal_num % 5) + 1],
  ROUND((random() * 150000)::numeric, 2),
  3,
  CASE (deal_num % 5) WHEN 3 THEN 3 WHEN 2 THEN 1 ELSE 0 END,
  2.5,
  2.0,
  NOW() - ((random() * 365)::int || ' days')::interval,
  NOW()
FROM deal_pairs
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════════════════════════
-- 9. DEAL MILESTONES  (3 per signed/closed deal)
-- ════════════════════════════════════════════════════════════
INSERT INTO public.venturex_milestones (
  deal_id, title, description, deadline,
  success_metric, fund_amount,
  is_completed, is_verified, completed_at, verified_at
)
SELECT
  d.id,
  (ARRAY[
    'MVP Launch','Beta Acquisition','Revenue Milestone',
    'Series Close','Market Expansion','Team Buildout',
    'First 1,000 Customers','Break-even','Product Launch','International Entry'
  ])[(ms.n % 10) + 1],
  'Achieve the defined target and submit verification evidence to IFB AI Audit Engine.',
  (NOW() + ((random() * 180)::int || ' days')::interval)::date,
  'Verified by Pascaline AI',
  ROUND((d.amount / 3)::numeric, 2),
  (d.status = 'closed'),
  (d.status = 'closed'),
  CASE WHEN d.status = 'closed'
    THEN NOW() - ((random() * 90)::int || ' days')::interval ELSE NULL END,
  CASE WHEN d.status = 'closed'
    THEN NOW() - ((random() * 60)::int || ' days')::interval ELSE NULL END
FROM  public.venturex_deals d
CROSS JOIN LATERAL (VALUES (0),(1),(2)) AS ms(n)
WHERE d.status IN ('signed','closed')
  AND d.created_at > NOW() - INTERVAL '370 days'
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════════════════════════
-- 10. ACTIVITY NOTIFICATIONS  (deal alerts for entrepreneurs)
-- ════════════════════════════════════════════════════════════
INSERT INTO public.venturex_notifications (
  user_id, type, title, message, is_read, created_at
)
SELECT
  d.company_user_id,
  'deal_update',
  CASE d.status
    WHEN 'signed'      THEN 'Deal Signed — Capital Incoming'
    WHEN 'closed'      THEN 'Deal Closed — Funds Released'
    WHEN 'negotiating' THEN 'Investor Engaged — Negotiation Active'
    ELSE                    'New Investment Proposal Received'
  END,
  'An investor has ' ||
  CASE d.status
    WHEN 'signed'      THEN 'signed your deal for $' || TO_CHAR(d.amount,'FM999,999,999')
    WHEN 'closed'      THEN 'completed funding of $'  || TO_CHAR(d.amount,'FM999,999,999')
    WHEN 'negotiating' THEN 'entered negotiation on your pitch'
    ELSE                    'submitted a proposal of $' || TO_CHAR(d.amount,'FM999,999,999')
  END || '.',
  FALSE,
  d.created_at + INTERVAL '1 hour'
FROM  public.venturex_deals d
WHERE d.status IN ('signed','closed','negotiating','proposed')
  AND d.created_at > NOW() - INTERVAL '370 days'
ON CONFLICT DO NOTHING;

DO $$
BEGIN
  RAISE NOTICE 'IFB Demo Seed complete.';
  RAISE NOTICE '  20,000 verified users created (password: password)';
  RAISE NOTICE '  10,000 investors | 10,000 entrepreneurs';
  RAISE NOTICE '  ~30,000 VentureX deals + milestones + notifications';
END $$;
