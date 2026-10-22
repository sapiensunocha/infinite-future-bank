-- ============================================================
-- VentureX Public Activity Feed
-- SECURITY DEFINER so any authenticated user can see the feed
-- ============================================================

-- ── 1. Public feed (paginated, filterable by sector/type) ──
CREATE OR REPLACE FUNCTION public.get_venturex_feed(
  p_limit  INT  DEFAULT 60,
  p_offset INT  DEFAULT 0,
  p_sector TEXT DEFAULT NULL,
  p_type   TEXT DEFAULT NULL    -- 'deal'|'milestone'|'listing'|NULL=all
)
RETURNS TABLE (
  event_id      UUID,
  event_type    TEXT,
  company_name  TEXT,
  sector        TEXT,
  country       TEXT,
  amount_range  TEXT,
  equity_pct    NUMERIC,
  milestone_title TEXT,
  happened_at   TIMESTAMPTZ
)
SECURITY DEFINER
LANGUAGE sql STABLE
AS $$
  SELECT * FROM (

    -- ── A. Deals (proposed / negotiating / signed / closed) ──
    SELECT
      d.id                                          AS event_id,
      'deal_' || d.status                           AS event_type,
      vc.legal_name                                 AS company_name,
      vc.sector                                     AS sector,
      vc.country                                    AS country,
      CASE
        WHEN d.amount <    100000 THEN '$10K–$100K'
        WHEN d.amount <    500000 THEN '$100K–$500K'
        WHEN d.amount <   1000000 THEN '$500K–$1M'
        WHEN d.amount <   5000000 THEN '$1M–$5M'
        WHEN d.amount <  25000000 THEN '$5M–$25M'
        ELSE                           '$25M+'
      END                                           AS amount_range,
      d.equity_percentage                           AS equity_pct,
      NULL::TEXT                                    AS milestone_title,
      d.created_at                                  AS happened_at
    FROM  public.venturex_deals     d
    JOIN  public.venturex_companies vc ON vc.id = d.company_id
    WHERE (p_sector IS NULL OR vc.sector = p_sector)
      AND (p_type   IS NULL OR p_type = 'deal')

    UNION ALL

    -- ── B. Milestone completions ──
    SELECT
      m.id,
      'milestone_hit',
      vc.legal_name,
      vc.sector,
      vc.country,
      NULL,
      NULL,
      m.title,
      m.completed_at
    FROM  public.venturex_milestones m
    JOIN  public.venturex_deals      d  ON d.id  = m.deal_id
    JOIN  public.venturex_companies  vc ON vc.id = d.company_id
    WHERE m.is_completed = TRUE
      AND m.completed_at IS NOT NULL
      AND (p_sector IS NULL OR vc.sector = p_sector)
      AND (p_type   IS NULL OR p_type = 'milestone')

    UNION ALL

    -- ── C. New company listings ──
    SELECT
      vc.id,
      'company_listed',
      vc.legal_name,
      vc.sector,
      vc.country,
      CASE
        WHEN vc.funding_goal <   500000 THEN '$100K–$500K'
        WHEN vc.funding_goal <  1000000 THEN '$500K–$1M'
        WHEN vc.funding_goal <  5000000 THEN '$1M–$5M'
        WHEN vc.funding_goal < 25000000 THEN '$5M–$25M'
        ELSE                                 '$25M+'
      END,
      vc.equity_offered,
      NULL,
      vc.created_at
    FROM  public.venturex_companies vc
    WHERE (p_sector IS NULL OR vc.sector = p_sector)
      AND (p_type   IS NULL OR p_type = 'listing')

  ) combined
  ORDER BY happened_at DESC
  LIMIT  p_limit
  OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION public.get_venturex_feed TO authenticated;

-- ── 2. Aggregate stats for the top banner ──
CREATE OR REPLACE FUNCTION public.get_venturex_stats()
RETURNS JSON
SECURITY DEFINER
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_total_companies  BIGINT;
  v_active_investors BIGINT;
  v_total_deals      BIGINT;
  v_signed_deals     BIGINT;
  v_closed_deals     BIGINT;
  v_capital_deployed NUMERIC;
  v_top_sectors      JSON;
BEGIN
  SELECT COUNT(*)             INTO v_total_companies  FROM public.venturex_companies WHERE status = 'active';
  SELECT COUNT(*)             INTO v_active_investors FROM public.venturex_investors  WHERE is_active = TRUE;
  SELECT COUNT(*)             INTO v_total_deals      FROM public.venturex_deals;
  SELECT COUNT(*)             INTO v_signed_deals     FROM public.venturex_deals WHERE status = 'signed';
  SELECT COUNT(*)             INTO v_closed_deals     FROM public.venturex_deals WHERE status = 'closed';
  SELECT COALESCE(SUM(amount),0)   INTO v_capital_deployed FROM public.venturex_deals WHERE status IN ('signed','closed');

  SELECT json_agg(row_to_json(t)) INTO v_top_sectors FROM (
    SELECT vc.sector, COUNT(*) AS deal_count
    FROM   public.venturex_deals d
    JOIN   public.venturex_companies vc ON vc.id = d.company_id
    GROUP  BY vc.sector
    ORDER  BY deal_count DESC
    LIMIT  6
  ) t;

  RETURN json_build_object(
    'total_companies',    v_total_companies,
    'active_investors',   v_active_investors,
    'total_deals',        v_total_deals,
    'signed_deals',       v_signed_deals,
    'closed_deals',       v_closed_deals,
    'capital_deployed',   v_capital_deployed,
    'top_sectors',        v_top_sectors
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_venturex_stats TO authenticated;
