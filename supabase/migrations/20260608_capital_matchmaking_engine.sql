-- ============================================================
-- IFB CAPITAL MATCHMAKING ENGINE
-- Auto-builds a capital match profile from existing user data.
-- get_capital_matches() scores every funding, loan, bond, equity
-- against a user's profile and returns ranked matches.
-- ============================================================

-- ── 1. AUTO-SYNC MATCH PROFILE FROM EXISTING USER DATA ────
CREATE OR REPLACE FUNCTION public.sync_capital_match_profile(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile        RECORD;
  v_commercial     RECORD;
  v_npo            RECORD;
  v_entity_type    TEXT;
  v_sector         TEXT[];
  v_country        TEXT;
  v_region         TEXT;
  v_revenue        NUMERIC;
  v_burn           NUMERIC;
  v_years          INTEGER;
  v_kyc            BOOLEAN;
  v_has_reg        BOOLEAN;
  v_capital_need   NUMERIC;
  v_cap_types      TEXT[];
BEGIN
  SELECT * INTO v_profile     FROM public.profiles            WHERE id = p_user_id;
  SELECT * INTO v_commercial  FROM public.commercial_profiles WHERE id = p_user_id;
  SELECT * INTO v_npo         FROM public.npo_profiles        WHERE id = p_user_id;

  -- Determine entity type from existing data
  IF v_npo.id IS NOT NULL THEN
    v_entity_type := 'npo';
    v_sector := ARRAY[COALESCE(v_npo.sector, 'Social Impact')];
    v_country := v_npo.country;
    v_revenue := COALESCE(v_npo.total_raised, 0);
    v_burn := 0;
    v_years := CASE
      WHEN v_npo.founded_year IS NOT NULL
      THEN EXTRACT(YEAR FROM NOW())::INTEGER - v_npo.founded_year
      ELSE 0 END;
    v_has_reg := (v_npo.tax_id IS NOT NULL);
    v_cap_types := ARRAY['grant','blended_finance','technical_assistance'];
    v_capital_need := 50000;
  ELSIF v_commercial.id IS NOT NULL THEN
    IF v_commercial.annual_revenue > 5000000 THEN v_entity_type := 'corporate';
    ELSIF v_commercial.annual_revenue > 500000 THEN v_entity_type := 'sme';
    ELSE v_entity_type := 'startup';
    END IF;
    v_sector := ARRAY[COALESCE(v_commercial.sector, 'Technology')];
    v_country := v_commercial.registration_country;
    v_revenue := COALESCE(v_commercial.annual_revenue, 0);
    v_burn := COALESCE(v_commercial.monthly_burn_rate, 0);
    v_years := 0;
    v_has_reg := TRUE;
    v_cap_types := ARRAY['loan','equity','grant','blended_finance'];
    v_capital_need := GREATEST(v_burn * 12, 50000);
  ELSE
    v_entity_type := 'individual';
    v_sector := ARRAY['All'];
    v_country := v_profile.country;
    v_revenue := 0;
    v_burn := 0;
    v_years := 0;
    v_has_reg := FALSE;
    v_cap_types := ARRAY['grant','microfinance','loan'];
    v_capital_need := 10000;
  END IF;

  -- Map country to region
  v_region := CASE
    WHEN v_country IN ('Nigeria','Ghana','Senegal','Ivory Coast','Mali','Burkina Faso','Guinea',
                       'Benin','Togo','Niger','Sierra Leone','Liberia','Cape Verde','Gambia',
                       'Guinea-Bissau','Cameroon','Gabon','Congo','DRC') THEN 'West Africa'
    WHEN v_country IN ('Kenya','Tanzania','Uganda','Rwanda','Ethiopia','Somalia','Eritrea',
                       'Djibouti','Sudan','South Sudan','Burundi') THEN 'East Africa'
    WHEN v_country IN ('South Africa','Zimbabwe','Zambia','Mozambique','Botswana','Namibia',
                       'Malawi','Angola','Lesotho','Eswatini','Madagascar') THEN 'Southern Africa'
    WHEN v_country IN ('Egypt','Morocco','Tunisia','Algeria','Libya') THEN 'North Africa'
    WHEN v_country IN ('USA','Canada','Mexico') THEN 'North America'
    WHEN v_country IN ('Germany','France','UK','Italy','Spain','Netherlands','Belgium',
                       'Sweden','Norway','Denmark','Finland','Poland') THEN 'Europe'
    WHEN v_country IN ('Saudi Arabia','UAE','Qatar','Kuwait','Bahrain','Oman','Jordan') THEN 'MENA'
    WHEN v_country IN ('India','Pakistan','Bangladesh','Sri Lanka','Nepal') THEN 'South Asia'
    ELSE 'Global'
  END;

  v_kyc := (v_profile.kyc_status = 'verified' OR v_profile.kyc_status = 'approved');

  INSERT INTO public.capital_match_profiles (
    user_id, entity_type, country, region, sector,
    years_in_business, annual_revenue_usd, monthly_burn_usd,
    capital_need_usd, preferred_capital_types,
    is_kyc_verified, has_registration,
    max_interest_rate_pct, impact_focus
  ) VALUES (
    p_user_id, v_entity_type, v_country, v_region, v_sector,
    v_years, v_revenue, v_burn,
    v_capital_need, v_cap_types,
    v_kyc, v_has_reg,
    25.0,
    (v_entity_type = 'npo' OR v_entity_type = 'social_enterprise')
  )
  ON CONFLICT (user_id) DO UPDATE SET
    entity_type             = EXCLUDED.entity_type,
    country                 = EXCLUDED.country,
    region                  = EXCLUDED.region,
    sector                  = EXCLUDED.sector,
    years_in_business       = EXCLUDED.years_in_business,
    annual_revenue_usd      = EXCLUDED.annual_revenue_usd,
    monthly_burn_usd        = EXCLUDED.monthly_burn_usd,
    capital_need_usd        = EXCLUDED.capital_need_usd,
    preferred_capital_types = EXCLUDED.preferred_capital_types,
    is_kyc_verified         = EXCLUDED.is_kyc_verified,
    has_registration        = EXCLUDED.has_registration,
    impact_focus            = EXCLUDED.impact_focus,
    last_updated            = NOW();
END;
$$;

-- ── 2. SCORING HELPERS ────────────────────────────────────

-- Region match: exact > superset > global
CREATE OR REPLACE FUNCTION public.score_region_match(
  p_user_region    TEXT,
  p_user_country   TEXT,
  p_eligible_regions TEXT[],
  p_eligible_countries TEXT[]
)
RETURNS NUMERIC
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  -- Specific country match → perfect
  IF p_eligible_countries IS NOT NULL AND p_user_country = ANY(p_eligible_countries) THEN
    RETURN 40.0;
  END IF;
  -- Global → always eligible
  IF 'Global' = ANY(p_eligible_regions) THEN RETURN 35.0; END IF;
  -- Superset region match (e.g. 'Africa' covers 'East Africa')
  IF 'Africa' = ANY(p_eligible_regions) AND p_user_region LIKE '%Africa%' THEN RETURN 38.0; END IF;
  IF p_user_region = ANY(p_eligible_regions) THEN RETURN 40.0; END IF;
  -- Developing countries superset
  IF 'Developing Countries' = ANY(p_eligible_regions) AND
     p_user_region NOT IN ('North America','Europe') THEN RETURN 30.0; END IF;
  RETURN 0.0;  -- no match
END;
$$;

-- Sector match
CREATE OR REPLACE FUNCTION public.score_sector_match(
  p_user_sectors TEXT[],
  p_eligible_sectors TEXT[]
)
RETURNS NUMERIC
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  IF 'All' = ANY(p_eligible_sectors) THEN RETURN 20.0; END IF;
  -- Any user sector overlaps
  IF EXISTS (
    SELECT 1 FROM unnest(p_user_sectors) s
    WHERE s = ANY(p_eligible_sectors)
  ) THEN RETURN 20.0; END IF;
  RETURN 0.0;
END;
$$;

-- Entity type match
CREATE OR REPLACE FUNCTION public.score_entity_match(
  p_entity_type TEXT,
  p_eligible_types TEXT[]
)
RETURNS NUMERIC
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  IF p_entity_type = ANY(p_eligible_types) THEN RETURN 20.0; END IF;
  -- Startup/SME/corporate cross-eligibility
  IF p_entity_type = 'startup' AND 'sme' = ANY(p_eligible_types) THEN RETURN 15.0; END IF;
  IF p_entity_type = 'social_enterprise' AND (
    'startup' = ANY(p_eligible_types) OR 'npo' = ANY(p_eligible_types)
  ) THEN RETURN 15.0; END IF;
  RETURN 0.0;
END;
$$;

-- ── 3. MAIN MATCHING FUNCTION ─────────────────────────────
CREATE OR REPLACE FUNCTION public.get_capital_matches(
  p_user_id  UUID,
  p_limit    INTEGER DEFAULT 20,
  p_type     TEXT    DEFAULT NULL  -- filter: 'funding','loan','bond','equity' or NULL=all
)
RETURNS TABLE (
  capital_type        TEXT,
  capital_id          UUID,
  name                TEXT,
  provider_name       TEXT,
  match_score         NUMERIC,
  score_breakdown     JSONB,
  match_reasons       TEXT[],
  disqualifiers       TEXT[],
  amount_min          NUMERIC,
  amount_max          NUMERIC,
  currency            TEXT,
  key_detail          TEXT,   -- rate for loans, YTM for bonds, funding_type for fundings
  application_url     TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mp  RECORD;
BEGIN
  -- Auto-build/refresh match profile
  PERFORM public.sync_capital_match_profile(p_user_id);
  SELECT * INTO v_mp FROM public.capital_match_profiles WHERE user_id = p_user_id;

  RETURN QUERY
  WITH ranked AS (

    -- ── FUNDINGS ──────────────────────────────────────────
    SELECT
      'funding'::TEXT                                   AS capital_type,
      f.id                                              AS capital_id,
      f.program_name                                    AS name,
      cp.name                                           AS provider_name,
      LEAST(100.0,
        public.score_region_match(v_mp.region, v_mp.country, f.eligible_regions, f.eligible_countries) +
        public.score_sector_match(v_mp.sector, f.eligible_sectors) +
        public.score_entity_match(v_mp.entity_type, f.eligible_entity_types) +
        -- bonus: KYC match
        CASE WHEN f.requires_kyc AND v_mp.is_kyc_verified THEN 10.0
             WHEN NOT f.requires_kyc THEN 8.0 ELSE 0.0 END +
        -- bonus: amount fits need
        CASE WHEN f.amount_max_usd >= COALESCE(v_mp.capital_need_usd,0)*0.5
              AND f.amount_min_usd <= COALESCE(v_mp.capital_need_usd,0)*2.0 THEN 10.0
             WHEN f.amount_max_usd >= COALESCE(v_mp.capital_need_usd,0)*0.1 THEN 5.0
             ELSE 0.0 END
      )::NUMERIC                                        AS match_score,
      jsonb_build_object(
        'region',   public.score_region_match(v_mp.region, v_mp.country, f.eligible_regions, f.eligible_countries),
        'sector',   public.score_sector_match(v_mp.sector, f.eligible_sectors),
        'entity',   public.score_entity_match(v_mp.entity_type, f.eligible_entity_types),
        'kyc',      CASE WHEN f.requires_kyc AND v_mp.is_kyc_verified THEN 10 WHEN NOT f.requires_kyc THEN 8 ELSE 0 END,
        'amount',   CASE WHEN f.amount_max_usd >= COALESCE(v_mp.capital_need_usd,0)*0.5 THEN 10 WHEN f.amount_max_usd >= COALESCE(v_mp.capital_need_usd,0)*0.1 THEN 5 ELSE 0 END
      )                                                 AS score_breakdown,
      ARRAY_REMOVE(ARRAY[
        CASE WHEN public.score_region_match(v_mp.region, v_mp.country, f.eligible_regions, f.eligible_countries) >= 35 THEN 'Region matches your country/area' END,
        CASE WHEN public.score_sector_match(v_mp.sector, f.eligible_sectors) = 20 THEN 'Sector aligned: ' || f.eligible_sectors[1] END,
        CASE WHEN public.score_entity_match(v_mp.entity_type, f.eligible_entity_types) >= 15 THEN 'Eligible entity type: ' || v_mp.entity_type END,
        CASE WHEN v_mp.is_kyc_verified AND f.requires_kyc THEN 'KYC already verified — ready to apply' END,
        CASE WHEN NOT f.repayment_required THEN 'Non-repayable grant — no debt burden' END,
        CASE WHEN f.has_technical_assistance THEN 'Includes technical assistance/mentoring' END,
        CASE WHEN f.deadline_type = 'rolling' THEN 'Rolling deadline — apply anytime' END
      ], NULL)                                          AS match_reasons,
      ARRAY_REMOVE(ARRAY[
        CASE WHEN public.score_region_match(v_mp.region, v_mp.country, f.eligible_regions, f.eligible_countries) = 0 THEN 'Your region not eligible' END,
        CASE WHEN f.requires_kyc AND NOT v_mp.is_kyc_verified THEN 'KYC verification required first' END,
        CASE WHEN f.requires_audited_financials AND NOT v_mp.has_audited_financials THEN 'Audited financials required' END,
        CASE WHEN f.min_years_operating > v_mp.years_in_business THEN 'Need ' || f.min_years_operating || '+ years operating' END,
        CASE WHEN f.deadline_type = 'closed' THEN 'Programme currently closed' END
      ], NULL)                                          AS disqualifiers,
      f.amount_min_usd, f.amount_max_usd, f.currency,
      f.funding_type                                    AS key_detail,
      f.application_url
    FROM public.capital_fundings f
    LEFT JOIN public.capital_providers cp ON cp.id = f.provider_id
    WHERE f.status IN ('open','rolling')
      AND (p_type IS NULL OR p_type = 'funding')

    UNION ALL

    -- ── LOANS ─────────────────────────────────────────────
    SELECT
      'loan'::TEXT,
      l.id,
      l.product_name,
      cp.name,
      LEAST(100.0,
        public.score_region_match(v_mp.region, v_mp.country, l.eligible_regions, l.eligible_countries) +
        public.score_sector_match(v_mp.sector, l.eligible_sectors) +
        public.score_entity_match(v_mp.entity_type, l.eligible_entity_types) +
        -- rate affordability bonus
        CASE WHEN l.total_rate_max_pct <= COALESCE(v_mp.max_interest_rate_pct,25) THEN 15.0
             WHEN l.total_rate_min_pct <= COALESCE(v_mp.max_interest_rate_pct,25) THEN 8.0
             ELSE 0.0 END +
        -- amount fit
        CASE WHEN l.amount_max_usd >= COALESCE(v_mp.capital_need_usd,0)*0.5
              AND l.amount_min_usd <= COALESCE(v_mp.capital_need_usd,0)*2.0 THEN 5.0
             ELSE 0.0 END
      )::NUMERIC,
      jsonb_build_object(
        'region', public.score_region_match(v_mp.region, v_mp.country, l.eligible_regions, l.eligible_countries),
        'sector', public.score_sector_match(v_mp.sector, l.eligible_sectors),
        'entity', public.score_entity_match(v_mp.entity_type, l.eligible_entity_types),
        'rate_fit', CASE WHEN l.total_rate_max_pct <= COALESCE(v_mp.max_interest_rate_pct,25) THEN 15 WHEN l.total_rate_min_pct <= COALESCE(v_mp.max_interest_rate_pct,25) THEN 8 ELSE 0 END,
        'amount_fit', CASE WHEN l.amount_max_usd >= COALESCE(v_mp.capital_need_usd,0)*0.5 THEN 5 ELSE 0 END
      ),
      ARRAY_REMOVE(ARRAY[
        CASE WHEN public.score_region_match(v_mp.region, v_mp.country, l.eligible_regions, l.eligible_countries) >= 35 THEN 'Region matches' END,
        CASE WHEN l.total_rate_max_pct <= COALESCE(v_mp.max_interest_rate_pct,25) THEN 'Rate within your max (' || l.total_rate_min_pct || '–' || l.total_rate_max_pct || '%)' END,
        CASE WHEN NOT l.collateral_required THEN 'No collateral required' END,
        CASE WHEN l.grace_period_months > 0 THEN l.grace_period_months || '-month grace period available' END,
        CASE WHEN l.loan_type = 'islamic_murabaha' OR l.loan_type = 'islamic_ijara' THEN 'Sharia-compliant structure' END,
        CASE WHEN l.loan_type = 'microfinance' THEN 'No minimum revenue required' END
      ], NULL),
      ARRAY_REMOVE(ARRAY[
        CASE WHEN public.score_region_match(v_mp.region, v_mp.country, l.eligible_regions, l.eligible_countries) = 0 THEN 'Your region not eligible' END,
        CASE WHEN l.requires_kyc AND NOT v_mp.is_kyc_verified THEN 'KYC verification required' END,
        CASE WHEN l.requires_audited_financials AND NOT v_mp.has_audited_financials THEN 'Audited financials required' END,
        CASE WHEN l.min_annual_revenue_usd > COALESCE(v_mp.annual_revenue_usd,0) THEN 'Revenue below minimum ($' || l.min_annual_revenue_usd || ')' END,
        CASE WHEN l.min_years_in_business > v_mp.years_in_business THEN 'Need ' || l.min_years_in_business || '+ years in business' END,
        CASE WHEN l.total_rate_min_pct > COALESCE(v_mp.max_interest_rate_pct,25) THEN 'Rate may exceed your budget (' || l.total_rate_min_pct || '% min)' END
      ], NULL),
      l.amount_min_usd, l.amount_max_usd, l.currency,
      l.total_rate_min_pct::TEXT || '–' || l.total_rate_max_pct::TEXT || '% p.a.',
      l.application_url
    FROM public.capital_loans l
    LEFT JOIN public.capital_providers cp ON cp.id = l.provider_id
    WHERE l.status = 'active'
      AND (p_type IS NULL OR p_type = 'loan')
      AND ('loan' = ANY(v_mp.preferred_capital_types) OR
           v_mp.entity_type IN ('startup','sme','corporate','individual','cooperative'))

    UNION ALL

    -- ── BONDS (informational: for users who can invest or issue) ──
    SELECT
      'bond'::TEXT,
      b.id,
      b.bond_name,
      b.issuer_name,
      LEAST(100.0,
        -- Relevance based on user's investment capacity
        CASE WHEN b.minimum_denomination <= COALESCE(v_mp.assets_usd, v_mp.annual_revenue_usd, 1000000) THEN 30.0 ELSE 5.0 END +
        -- Credit quality preference
        CASE WHEN b.credit_rating_sp IN ('AAA','AA','AA+','AA-') THEN 25.0
             WHEN b.credit_rating_sp IN ('A','A+','A-','BBB+','BBB','BBB-') THEN 20.0
             WHEN b.credit_rating_sp IN ('BB+','BB','BB-') THEN 15.0
             ELSE 10.0 END +
        -- Africa bond relevance for Africa-based users
        CASE WHEN b.country = v_mp.country THEN 25.0
             WHEN b.country IN ('Supranational') THEN 20.0
             WHEN v_mp.region LIKE '%Africa%' AND b.is_eurobond THEN 15.0
             ELSE 10.0 END +
        -- Yield attractiveness vs risk-free
        CASE WHEN b.yield_to_maturity >= 7.0 AND b.credit_rating_sp NOT IN ('CCC','CC','C','D') THEN 20.0
             WHEN b.yield_to_maturity >= 4.5 THEN 15.0
             ELSE 10.0 END
      )::NUMERIC,
      jsonb_build_object(
        'denomination_fit', CASE WHEN b.minimum_denomination <= COALESCE(v_mp.assets_usd, v_mp.annual_revenue_usd, 1000000) THEN 30 ELSE 5 END,
        'credit_quality',   CASE WHEN b.credit_rating_sp IN ('AAA','AA','AA+','AA-') THEN 25 WHEN b.credit_rating_sp IN ('A','A+','A-','BBB+','BBB','BBB-') THEN 20 ELSE 15 END,
        'regional_relevance', CASE WHEN b.country = v_mp.country THEN 25 WHEN b.country = 'Supranational' THEN 20 ELSE 10 END,
        'yield_attractiveness', CASE WHEN b.yield_to_maturity >= 7.0 THEN 20 WHEN b.yield_to_maturity >= 4.5 THEN 15 ELSE 10 END
      ),
      ARRAY_REMOVE(ARRAY[
        CASE WHEN b.credit_rating_sp IN ('AAA','AA','AA+','AA-') THEN 'Investment-grade: ' || COALESCE(b.credit_rating_sp,'') || ' rated' END,
        CASE WHEN b.yield_to_maturity >= 7.0 THEN 'High yield: ' || b.yield_to_maturity || '% YTM' END,
        CASE WHEN b.is_green_bond THEN 'Green bond — ESG aligned' END,
        CASE WHEN b.is_sukuk THEN 'Sharia-compliant sukuk structure' END,
        CASE WHEN b.country = v_mp.country THEN 'Domestic bond — local currency exposure' END,
        CASE WHEN b.country = 'Supranational' THEN 'AAA supranational issuer (World Bank / AfDB)' END
      ], NULL),
      ARRAY_REMOVE(ARRAY[
        CASE WHEN b.credit_rating_sp IN ('CCC','CC','C','D','CCC+') THEN 'Very high default risk (' || b.credit_rating_sp || ')' END,
        CASE WHEN b.minimum_denomination > COALESCE(v_mp.assets_usd, 10000000) THEN 'Minimum denomination $' || b.minimum_denomination || ' may be out of range' END
      ], NULL),
      b.minimum_denomination, b.outstanding_amount_usd, b.currency,
      b.yield_to_maturity::TEXT || '% YTM | ' || COALESCE(b.credit_rating_sp,'NR') || ' rated',
      NULL
    FROM public.capital_bonds b
    WHERE b.status = 'active'
      AND (p_type IS NULL OR p_type = 'bond')

    UNION ALL

    -- ── EQUITIES ──────────────────────────────────────────
    SELECT
      'equity'::TEXT,
      e.id,
      e.company_name,
      e.exchange,
      LEAST(100.0,
        -- Africa-listed bias for Africa users
        CASE WHEN e.is_africa_listed AND v_mp.region LIKE '%Africa%' THEN 30.0
             WHEN e.is_africa_listed THEN 20.0
             ELSE 10.0 END +
        -- Sector match for strategic investment
        CASE WHEN e.sector = ANY(v_mp.sector) THEN 25.0
             WHEN e.asset_type = 'etf' AND e.sector = 'Diversified' THEN 20.0
             ELSE 10.0 END +
        -- Affordability / market cap fit
        CASE WHEN e.market_cap_usd > 1000000000 THEN 20.0
             WHEN e.market_cap_usd > 100000000  THEN 15.0
             ELSE 10.0 END +
        -- Dividend attractiveness
        CASE WHEN e.dividend_yield_pct >= 4.0 THEN 15.0
             WHEN e.dividend_yield_pct >= 2.0 THEN 10.0
             ELSE 5.0 END +
        -- ETF bonus (diversification)
        CASE WHEN e.asset_type = 'etf' THEN 10.0 ELSE 0.0 END
      )::NUMERIC,
      jsonb_build_object(
        'africa_relevance', CASE WHEN e.is_africa_listed AND v_mp.region LIKE '%Africa%' THEN 30 WHEN e.is_africa_listed THEN 20 ELSE 10 END,
        'sector_match', CASE WHEN e.sector = ANY(v_mp.sector) THEN 25 ELSE 10 END,
        'liquidity', CASE WHEN e.market_cap_usd > 1000000000 THEN 20 ELSE 10 END,
        'yield', CASE WHEN e.dividend_yield_pct >= 4.0 THEN 15 WHEN e.dividend_yield_pct >= 2.0 THEN 10 ELSE 5 END,
        'diversification', CASE WHEN e.asset_type = 'etf' THEN 10 ELSE 0 END
      ),
      ARRAY_REMOVE(ARRAY[
        CASE WHEN e.is_africa_listed AND v_mp.region LIKE '%Africa%' THEN 'Listed in your region — domestic investment' END,
        CASE WHEN e.sector = ANY(v_mp.sector) THEN 'In your sector: strategic investment opportunity' END,
        CASE WHEN e.dividend_yield_pct >= 4.0 THEN 'Strong dividend yield: ' || e.dividend_yield_pct || '%' END,
        CASE WHEN e.asset_type = 'etf' THEN 'ETF — diversified, lower single-stock risk' END,
        CASE WHEN e.analyst_consensus IN ('buy','strong_buy') THEN 'Analyst consensus: ' || e.analyst_consensus END
      ], NULL),
      ARRAY_REMOVE(ARRAY[
        CASE WHEN e.price_change_1y_pct < -20 THEN 'Down ' || ABS(e.price_change_1y_pct) || '% past year — assess carefully' END
      ], NULL),
      e.price, e.week_52_high, e.currency,
      e.price::TEXT || ' ' || e.currency || ' | ' || COALESCE(e.sector,'') || ' | ' || COALESCE(e.analyst_consensus,''),
      NULL
    FROM public.capital_equities e
    WHERE e.status = 'active'
      AND (p_type IS NULL OR p_type = 'equity')

  )
  SELECT
    r.capital_type, r.capital_id, r.name, r.provider_name,
    r.match_score, r.score_breakdown, r.match_reasons, r.disqualifiers,
    r.amount_min, r.amount_max, r.currency, r.key_detail, r.application_url
  FROM ranked r
  WHERE r.match_score >= 20  -- minimum relevance threshold
  ORDER BY r.match_score DESC
  LIMIT p_limit;
END;
$$;

-- ── 4. SAVE MATCHES TO DB ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.refresh_capital_matches(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_rec   RECORD;
BEGIN
  -- Clear stale matches
  DELETE FROM public.capital_matches WHERE user_id = p_user_id;

  -- Insert fresh matches
  FOR v_rec IN
    SELECT * FROM public.get_capital_matches(p_user_id, 50, NULL)
  LOOP
    INSERT INTO public.capital_matches (
      user_id, capital_type, capital_id,
      match_score, score_breakdown, match_reasons, disqualifiers,
      amount_recommended_usd,
      priority
    ) VALUES (
      p_user_id,
      v_rec.capital_type,
      v_rec.capital_id,
      v_rec.match_score,
      v_rec.score_breakdown,
      v_rec.match_reasons,
      v_rec.disqualifiers,
      v_rec.amount_min,
      CASE WHEN v_rec.match_score >= 75 THEN 'high'
           WHEN v_rec.match_score >= 50 THEN 'medium'
           ELSE 'low' END
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ── 5. GRANTS ─────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.sync_capital_match_profile    TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_capital_matches           TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_capital_matches       TO authenticated;
GRANT EXECUTE ON FUNCTION public.score_region_match            TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.score_sector_match            TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.score_entity_match            TO authenticated, anon;

-- ── 6. AUTO-TRIGGER: refresh matches when commercial profile changes ──
CREATE OR REPLACE FUNCTION public.trg_refresh_matches_on_profile_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM public.sync_capital_match_profile(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_commercial_profile_matches ON public.commercial_profiles;
CREATE TRIGGER trg_commercial_profile_matches
  AFTER INSERT OR UPDATE ON public.commercial_profiles
  FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_matches_on_profile_change();

DROP TRIGGER IF EXISTS trg_npo_profile_matches ON public.npo_profiles;
CREATE TRIGGER trg_npo_profile_matches
  AFTER INSERT OR UPDATE ON public.npo_profiles
  FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_matches_on_profile_change();
