-- ============================================================
-- IFB Dark Pool Companies — seed 10,000 APPROVED listings
-- Companion to 20260523_seed_demo_users.sql
-- ============================================================

DO $$
DECLARE
  v_cols TEXT;
BEGIN
  -- Discover all NOT NULL columns in ifb_companies dynamically
  SELECT string_agg(column_name || ' ' || data_type, ', ' ORDER BY ordinal_position)
  INTO   v_cols
  FROM   information_schema.columns
  WHERE  table_schema = 'public'
    AND  table_name   = 'ifb_companies';
  RAISE NOTICE 'ifb_companies columns: %', v_cols;
END $$;

-- Insert with all known columns from WealthInvest + what the evaluate-pitch API writes
INSERT INTO public.ifb_companies (
  name, sector, valuation, deus_score, status, fundraising_goal
)
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
  ROUND((60     + random() * 40)::numeric,       2),
  'APPROVED',
  ROUND((200000 + random() * 9800000)::numeric,  2)   -- fundraising_goal
FROM generate_series(1, 10000) AS i
ON CONFLICT DO NOTHING;
