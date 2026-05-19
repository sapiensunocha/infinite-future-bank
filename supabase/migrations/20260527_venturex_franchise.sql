-- ================================================================
-- VentureX Franchise Network
-- Companies license IFB's exchange, build their own deal pipeline,
-- compete on leaderboard, and stay cross-listed on the master IFB exchange.
-- ================================================================

-- ── 1. Franchise registrations ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.venturex_franchises (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id             UUID REFERENCES public.venturex_companies(id),

  -- Identity
  franchise_name         TEXT NOT NULL,
  tagline                TEXT,
  logo_url               TEXT,
  primary_sector         TEXT,
  target_geographies     JSONB DEFAULT '[]',
  website                TEXT,

  -- Tier: node_operator → regional_hub → master_franchise
  tier                   TEXT NOT NULL DEFAULT 'node_operator'
                           CHECK (tier IN ('node_operator','regional_hub','master_franchise')),
  company_limit          INTEGER NOT NULL DEFAULT 20,

  -- Lifecycle
  status                 TEXT NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','approved','suspended','terminated')),
  approved_at            TIMESTAMPTZ,
  rejection_reason       TEXT,

  -- Commercial (revenue share with IFB)
  monthly_fee_usd        NUMERIC(10,2) DEFAULT 500,
  revenue_share_pct      NUMERIC(5,3)  DEFAULT 0.500,  -- operator earns this % of each deal
  ifb_commission_pct     NUMERIC(5,3)  DEFAULT 2.000,  -- IFB retains this %

  -- Aggregated counters (refreshed by trigger)
  total_companies        INTEGER DEFAULT 0,
  total_deals            INTEGER DEFAULT 0,
  total_capital_deployed NUMERIC(16,2) DEFAULT 0,
  operator_earnings_usd  NUMERIC(14,2) DEFAULT 0,
  ifb_earnings_usd       NUMERIC(14,2) DEFAULT 0,

  -- IFB master-exchange cross-listing flag
  ifb_listed             BOOLEAN DEFAULT TRUE,
  ifb_listed_at          TIMESTAMPTZ DEFAULT NOW(),

  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Companies enrolled in a franchise ─────────────────────────
CREATE TABLE IF NOT EXISTS public.venturex_franchise_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id  UUID NOT NULL REFERENCES public.venturex_franchises(id) ON DELETE CASCADE,
  company_id    UUID NOT NULL REFERENCES public.venturex_companies(id) ON DELETE CASCADE,
  enrolled_by   UUID REFERENCES auth.users(id),
  status        TEXT DEFAULT 'active' CHECK (status IN ('active','removed','suspended')),
  joined_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(franchise_id, company_id)
);

-- ── 3. Monthly performance snapshots ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.venturex_franchise_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id  UUID NOT NULL REFERENCES public.venturex_franchises(id) ON DELETE CASCADE,
  month         DATE NOT NULL,                    -- first day of the month
  deals_opened  INTEGER DEFAULT 0,
  deals_closed  INTEGER DEFAULT 0,
  capital_usd   NUMERIC(16,2) DEFAULT 0,
  avg_deal_size NUMERIC(14,2) DEFAULT 0,
  UNIQUE(franchise_id, month)
);

-- ── Indexes ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_vx_franchise_operator ON public.venturex_franchises(operator_user_id);
CREATE INDEX IF NOT EXISTS idx_vx_franchise_status   ON public.venturex_franchises(status);
CREATE INDEX IF NOT EXISTS idx_vx_fm_franchise       ON public.venturex_franchise_members(franchise_id);
CREATE INDEX IF NOT EXISTS idx_vx_fm_company         ON public.venturex_franchise_members(company_id);

-- ── RLS ───────────────────────────────────────────────────────────
ALTER TABLE public.venturex_franchises          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venturex_franchise_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venturex_franchise_snapshots ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read approved franchises (directory)
CREATE POLICY "franchise_read_approved"
  ON public.venturex_franchises FOR SELECT
  USING (status = 'approved' AND auth.role() = 'authenticated');

-- Operator manages their own franchise
CREATE POLICY "franchise_operator_write"
  ON public.venturex_franchises FOR ALL
  USING (operator_user_id = auth.uid())
  WITH CHECK (operator_user_id = auth.uid());

-- Members readable by franchise operator + company owner
CREATE POLICY "franchise_members_read"
  ON public.venturex_franchise_members FOR SELECT
  USING (
    franchise_id IN (SELECT id FROM public.venturex_franchises WHERE operator_user_id = auth.uid())
    OR
    company_id   IN (SELECT id FROM public.venturex_companies   WHERE user_id = auth.uid())
    OR auth.role() = 'authenticated'
  );

CREATE POLICY "franchise_members_write"
  ON public.venturex_franchise_members FOR ALL
  USING (
    franchise_id IN (SELECT id FROM public.venturex_franchises WHERE operator_user_id = auth.uid())
  );

CREATE POLICY "franchise_snapshots_read"
  ON public.venturex_franchise_snapshots FOR SELECT
  USING (
    franchise_id IN (SELECT id FROM public.venturex_franchises WHERE operator_user_id = auth.uid())
    OR auth.role() = 'authenticated'
  );

-- ================================================================
-- FUNCTIONS
-- ================================================================

-- ── A. Public franchise directory ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_franchise_directory(
  p_limit  INT  DEFAULT 30,
  p_offset INT  DEFAULT 0,
  p_sector TEXT DEFAULT NULL
)
RETURNS TABLE (
  franchise_id         UUID,
  franchise_name       TEXT,
  tagline              TEXT,
  tier                 TEXT,
  primary_sector       TEXT,
  target_geographies   JSONB,
  total_companies      INT,
  total_deals          INT,
  total_capital        NUMERIC,
  operator_earnings    NUMERIC,
  ifb_listed           BOOLEAN,
  rank                 BIGINT,
  created_at           TIMESTAMPTZ
)
SECURITY DEFINER LANGUAGE sql STABLE AS $$
  SELECT
    f.id,
    f.franchise_name,
    f.tagline,
    f.tier,
    f.primary_sector,
    f.target_geographies,
    f.total_companies,
    f.total_deals,
    f.total_capital_deployed,
    f.operator_earnings_usd,
    f.ifb_listed,
    ROW_NUMBER() OVER (ORDER BY f.total_capital_deployed DESC),
    f.created_at
  FROM  public.venturex_franchises f
  WHERE f.status = 'approved'
    AND (p_sector IS NULL OR f.primary_sector = p_sector)
  ORDER BY f.total_capital_deployed DESC
  LIMIT  p_limit OFFSET p_offset;
$$;
GRANT EXECUTE ON FUNCTION public.get_franchise_directory TO authenticated;

-- ── B. Advanced operator metrics ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_franchise_metrics(p_franchise_id UUID)
RETURNS JSON
SECURITY DEFINER LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_operator UUID;
  v_funnel   JSON;
  v_sectors  JSON;
  v_velocity JSON;
  v_investors JSON;
  v_companies JSON;
BEGIN
  -- Ownership check
  SELECT operator_user_id INTO v_operator
  FROM   public.venturex_franchises WHERE id = p_franchise_id;
  IF v_operator IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Deal funnel
  SELECT json_object_agg(status, cnt) INTO v_funnel FROM (
    SELECT d.status, COUNT(*) AS cnt
    FROM   public.venturex_deals d
    JOIN   public.venturex_franchise_members fm ON fm.company_id = d.company_id
    WHERE  fm.franchise_id = p_franchise_id AND fm.status = 'active'
    GROUP  BY d.status
  ) t;

  -- Sector breakdown
  SELECT json_agg(row_to_json(t)) INTO v_sectors FROM (
    SELECT vc.sector, COUNT(DISTINCT d.id) AS deals, COALESCE(SUM(d.amount),0) AS capital
    FROM   public.venturex_deals d
    JOIN   public.venturex_companies vc ON vc.id = d.company_id
    JOIN   public.venturex_franchise_members fm ON fm.company_id = d.company_id
    WHERE  fm.franchise_id = p_franchise_id AND fm.status = 'active'
    GROUP  BY vc.sector ORDER BY capital DESC LIMIT 8
  ) t;

  -- Monthly deal velocity (last 12 months)
  SELECT json_agg(row_to_json(t) ORDER BY t.month) INTO v_velocity FROM (
    SELECT DATE_TRUNC('month', d.created_at)::date AS month,
           COUNT(*)                                 AS deals,
           COALESCE(SUM(d.amount),0)                AS capital
    FROM   public.venturex_deals d
    JOIN   public.venturex_franchise_members fm ON fm.company_id = d.company_id
    WHERE  fm.franchise_id = p_franchise_id
      AND  d.created_at >= NOW() - INTERVAL '12 months'
    GROUP  BY 1
  ) t;

  -- Top investors in this franchise
  SELECT json_agg(row_to_json(t)) INTO v_investors FROM (
    SELECT vi.fund_name, vi.investor_type,
           COUNT(d.id) AS deal_count,
           SUM(d.amount) AS total_invested
    FROM   public.venturex_deals d
    JOIN   public.venturex_investors vi ON vi.id = d.investor_id
    JOIN   public.venturex_franchise_members fm ON fm.company_id = d.company_id
    WHERE  fm.franchise_id = p_franchise_id AND fm.status = 'active'
    GROUP  BY vi.id, vi.fund_name, vi.investor_type
    ORDER  BY total_invested DESC LIMIT 10
  ) t;

  -- Company roster scores
  SELECT json_agg(row_to_json(t)) INTO v_companies FROM (
    SELECT vc.legal_name, vc.sector, vc.country,
           vc.investment_readiness_score, vc.growth_score,
           vc.valuation, vc.funding_goal,
           COUNT(d.id) AS deal_count
    FROM   public.venturex_companies vc
    JOIN   public.venturex_franchise_members fm ON fm.company_id = vc.id
    LEFT   JOIN public.venturex_deals d ON d.company_id = vc.id
    WHERE  fm.franchise_id = p_franchise_id AND fm.status = 'active'
    GROUP  BY vc.id ORDER BY vc.investment_readiness_score DESC LIMIT 50
  ) t;

  RETURN json_build_object(
    'funnel',    COALESCE(v_funnel, '{}'),
    'sectors',   COALESCE(v_sectors, '[]'),
    'velocity',  COALESCE(v_velocity, '[]'),
    'investors', COALESCE(v_investors, '[]'),
    'companies', COALESCE(v_companies, '[]')
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_franchise_metrics TO authenticated;

-- ── C. Global leaderboard ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_franchise_leaderboard(p_limit INT DEFAULT 20)
RETURNS TABLE (
  rank              BIGINT,
  franchise_id      UUID,
  franchise_name    TEXT,
  tier              TEXT,
  primary_sector    TEXT,
  total_companies   INT,
  total_deals       INT,
  total_capital     NUMERIC,
  conversion_rate   NUMERIC,
  operator_earnings NUMERIC
)
SECURITY DEFINER LANGUAGE sql STABLE AS $$
  WITH stats AS (
    SELECT
      f.id,
      f.franchise_name,
      f.tier,
      f.primary_sector,
      f.total_companies,
      f.total_deals,
      f.total_capital_deployed                        AS total_capital,
      f.operator_earnings_usd                         AS operator_earnings,
      CASE WHEN f.total_deals > 0
        THEN ROUND(
          100.0 * (SELECT COUNT(*) FROM public.venturex_deals d
                   JOIN public.venturex_franchise_members fm ON fm.company_id = d.company_id
                   WHERE fm.franchise_id = f.id AND d.status = 'closed')
          / f.total_deals, 1)
        ELSE 0
      END AS conversion_rate
    FROM public.venturex_franchises f
    WHERE f.status = 'approved'
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY total_capital DESC) AS rank,
    id, franchise_name, tier, primary_sector,
    total_companies, total_deals, total_capital,
    conversion_rate, operator_earnings
  FROM stats
  ORDER BY total_capital DESC
  LIMIT p_limit;
$$;
GRANT EXECUTE ON FUNCTION public.get_franchise_leaderboard TO authenticated;

-- ── D. Counter refresh (called after deal insert/update) ──────────
CREATE OR REPLACE FUNCTION public.refresh_franchise_counters(p_franchise_id UUID)
RETURNS VOID SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.venturex_franchises f SET
    total_companies        = (SELECT COUNT(*) FROM public.venturex_franchise_members
                               WHERE franchise_id = p_franchise_id AND status = 'active'),
    total_deals            = (SELECT COUNT(*) FROM public.venturex_deals d
                               JOIN public.venturex_franchise_members fm ON fm.company_id = d.company_id
                               WHERE fm.franchise_id = p_franchise_id),
    total_capital_deployed = (SELECT COALESCE(SUM(d.amount),0) FROM public.venturex_deals d
                               JOIN public.venturex_franchise_members fm ON fm.company_id = d.company_id
                               WHERE fm.franchise_id = p_franchise_id AND d.status IN ('signed','closed')),
    operator_earnings_usd  = (SELECT COALESCE(SUM(d.amount * f2.revenue_share_pct / 100),0)
                               FROM public.venturex_deals d
                               JOIN public.venturex_franchise_members fm ON fm.company_id = d.company_id
                               JOIN public.venturex_franchises f2 ON f2.id = fm.franchise_id
                               WHERE fm.franchise_id = p_franchise_id AND d.status IN ('signed','closed')),
    ifb_earnings_usd       = (SELECT COALESCE(SUM(d.amount * f2.ifb_commission_pct / 100),0)
                               FROM public.venturex_deals d
                               JOIN public.venturex_franchise_members fm ON fm.company_id = d.company_id
                               JOIN public.venturex_franchises f2 ON f2.id = fm.franchise_id
                               WHERE fm.franchise_id = p_franchise_id AND d.status IN ('signed','closed')),
    updated_at             = NOW()
  WHERE f.id = p_franchise_id;
END;
$$;

-- ================================================================
-- SEED: 60 approved franchises from top seed companies
-- ================================================================
DO $$
DECLARE
  franchise_names TEXT[] := ARRAY[
    'AfriTech Ventures','Green Horizon Fund','HealthBridge Capital','EduForward Exchange',
    'Solar Capital Hub','LogiChain Partners','TradeNexus Fund','Neural Frontier Capital',
    'BlockChain Partners','PropTech Alliance','Cover Capital Fund','AgroSeed Ventures',
    'BioSphere Capital','GameForge Partners','StreamX Capital','Urban Mobility Fund',
    'CityNest Ventures','LexInvest Partners','Talent Capital Group','CyberShield Fund',
    'EcoGrowth Ventures','MedBridge Capital','SkillUp Fund','VoltEdge Partners',
    'RouteX Capital','DataSphere Fund','Quantum Ventures','HomeEdge Partners',
    'PolicyFirst Capital','CropLink Fund','SynthBio Ventures','GameHub Capital',
    'ContentX Fund','MoveFirst Partners','CitiSpace Capital','JusticeFirst Ventures',
    'WorkForce Fund','SecureX Partners','PayBridge Capital','EcoHarvest Fund',
    'ConnectHealth Capital','SkillBridge Fund','WindX Ventures','RouteFirst Capital',
    'DataMart Partners','QuantumX Fund','RentFirst Capital','RiskBridge Partners',
    'FoodX Capital','NovaBridge Ventures','GreenX Partners','MediLink Capital',
    'LearnFirst Fund','SolarX Ventures','FleetFirst Capital','TradeX Partners',
    'NeuralX Fund','ChainFirst Capital','PropFirst Partners','CoverX Ventures'
  ];
  sectors TEXT[] := ARRAY[
    'FinTech','CleanEnergy','HealthTech','EdTech','CleanEnergy','Logistics','E-Commerce',
    'AI/ML','Blockchain','Real Estate','InsurTech','AgriTech','BioTech','Gaming','Media',
    'Mobility','PropTech','LegalTech','HRTech','CyberSecurity','CleanEnergy','HealthTech',
    'EdTech','CleanEnergy','Logistics','AI/ML','Blockchain','Real Estate','InsurTech',
    'AgriTech','BioTech','Gaming','Media','Mobility','PropTech','LegalTech','HRTech',
    'CyberSecurity','FinTech','AgriTech','HealthTech','EdTech','CleanEnergy','Logistics',
    'E-Commerce','AI/ML','Blockchain','Real Estate','InsurTech','FinTech','CleanEnergy',
    'HealthTech','EdTech','CleanEnergy','Logistics','AI/ML','Blockchain','Real Estate',
    'InsurTech','AgriTech'
  ];
  tiers TEXT[] := ARRAY['node_operator','node_operator','node_operator','regional_hub',
                        'node_operator','node_operator','regional_hub','node_operator',
                        'master_franchise','node_operator','node_operator','regional_hub'];
  v_uid  UUID;
  v_cid  UUID;
  v_fid  UUID;
  i      INT;
  j      INT;
  member_user_ids UUID[];
  member_company_id UUID;
BEGIN
  FOR i IN 1..60 LOOP
    -- Pick a seed company user as operator (every 166th seed company)
    v_uid := md5('ifbseed_' || (10001 + (i - 1) * 166))::uuid;
    SELECT id INTO v_cid FROM public.venturex_companies WHERE user_id = v_uid LIMIT 1;
    IF v_cid IS NULL THEN CONTINUE; END IF;

    INSERT INTO public.venturex_franchises (
      operator_user_id, company_id, franchise_name, tagline, primary_sector,
      target_geographies, tier, company_limit, status, approved_at,
      monthly_fee_usd, revenue_share_pct, ifb_commission_pct,
      ifb_listed, ifb_listed_at,
      total_companies, total_deals, total_capital_deployed,
      operator_earnings_usd, ifb_earnings_usd,
      created_at
    )
    VALUES (
      v_uid, v_cid,
      franchise_names[i],
      'Powering the next wave of ' || sectors[i] || ' innovation through structured deal flow',
      sectors[i],
      jsonb_build_array(
        (ARRAY['Africa','Europe','Americas','Asia-Pacific','Middle East','Global'])[(i % 6) + 1]
      ),
      tiers[(i % 12) + 1],
      CASE tiers[(i % 12) + 1]
        WHEN 'node_operator'    THEN 20
        WHEN 'regional_hub'     THEN 100
        WHEN 'master_franchise' THEN 500
      END,
      'approved',
      NOW() - ((random() * 400)::int || ' days')::interval,
      CASE tiers[(i % 12) + 1]
        WHEN 'node_operator'    THEN 500
        WHEN 'regional_hub'     THEN 2000
        WHEN 'master_franchise' THEN 10000
      END,
      0.500,
      2.000,
      TRUE,
      NOW() - ((random() * 400)::int || ' days')::interval,
      0, 0, 0, 0, 0,
      NOW() - ((random() * 400)::int || ' days')::interval
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_fid;

    IF v_fid IS NULL THEN CONTINUE; END IF;

    -- Enroll 5-15 seed companies into this franchise
    FOR j IN 1..( 5 + (i % 11) ) LOOP
      member_company_id := NULL;
      SELECT vc.id INTO member_company_id
      FROM   public.venturex_companies vc
      JOIN   auth.users au ON au.id = vc.user_id
      WHERE  au.email LIKE '%@ifbplatform.com'
        AND  vc.sector = sectors[i]
        AND  vc.id <> v_cid
      OFFSET (j * 7 + i * 13) % 500
      LIMIT  1;

      IF member_company_id IS NOT NULL THEN
        INSERT INTO public.venturex_franchise_members (franchise_id, company_id, enrolled_by)
        VALUES (v_fid, member_company_id, v_uid)
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;

    -- Refresh counters for this franchise
    PERFORM public.refresh_franchise_counters(v_fid);
  END LOOP;

  RAISE NOTICE 'Franchise seed complete: 60 approved franchises created';
END $$;
