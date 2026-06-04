-- ============================================================
-- Admin: full IFB applications + VentureX proxy management
-- ============================================================

-- ── 1. Admin read on ifb_entrepreneur_applications ─────────────────────────────
DO $$ BEGIN
  CREATE POLICY "app_admin_read_all" ON public.ifb_entrepreneur_applications
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin','admin_l3','superadmin')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. admin_get_applications ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_get_applications(
  p_limit   INT     DEFAULT 100,
  p_status  TEXT    DEFAULT NULL,
  p_user_id UUID    DEFAULT NULL
)
RETURNS TABLE (
  id                  UUID,
  user_id             UUID,
  user_full_name      TEXT,
  user_email          TEXT,
  company_name        TEXT,
  sector              TEXT,
  country             TEXT,
  stage               TEXT,
  team_size           INTEGER,
  annual_revenue_usd  NUMERIC,
  capital_ask_usd     NUMERIC,
  problem_statement   TEXT,
  solution_statement  TEXT,
  website             TEXT,
  package_id          TEXT,
  package_name        TEXT,
  package_price_usd   NUMERIC,
  addons              JSONB,
  addons_total_usd    NUMERIC,
  total_paid_usd      NUMERIC,
  payment_status      TEXT,
  status              TEXT,
  assigned_advisor    TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','admin_l3','superadmin')
  ) THEN RAISE EXCEPTION 'Admin access required'; END IF;

  RETURN QUERY
  SELECT
    a.id, a.user_id,
    p.full_name AS user_full_name,
    p.email     AS user_email,
    a.company_name, a.sector, a.country, a.stage, a.team_size,
    a.annual_revenue_usd, a.capital_ask_usd,
    a.problem_statement, a.solution_statement, a.website,
    a.package_id, a.package_name, a.package_price_usd,
    a.addons, a.addons_total_usd, a.total_paid_usd,
    a.payment_status, a.status, a.assigned_advisor, a.notes,
    a.created_at, a.updated_at
  FROM public.ifb_entrepreneur_applications a
  LEFT JOIN public.profiles p ON p.id = a.user_id
  WHERE (p_status IS NULL OR a.status = p_status)
    AND (p_user_id IS NULL OR a.user_id = p_user_id)
  ORDER BY a.created_at DESC
  LIMIT p_limit;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_applications TO authenticated;

-- ── 3. admin_update_application ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_update_application(
  p_app_id          UUID,
  p_status          TEXT    DEFAULT NULL,
  p_assigned_advisor TEXT   DEFAULT NULL,
  p_notes           TEXT    DEFAULT NULL,
  p_payment_status  TEXT    DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid UUID := auth.uid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_uid AND role IN ('admin','admin_l3','superadmin'))
  THEN RAISE EXCEPTION 'Admin access required'; END IF;

  UPDATE public.ifb_entrepreneur_applications SET
    status           = COALESCE(p_status,           status),
    assigned_advisor = COALESCE(p_assigned_advisor, assigned_advisor),
    notes            = COALESCE(p_notes,            notes),
    payment_status   = COALESCE(p_payment_status,   payment_status),
    updated_at       = NOW()
  WHERE id = p_app_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_update_application TO authenticated;

-- ── 4. admin_create_application_for_user (no payment deducted) ─────────────────
CREATE OR REPLACE FUNCTION public.admin_create_application_for_user(
  p_target_user_id      UUID,
  p_company_name        TEXT,
  p_sector              TEXT,
  p_country             TEXT,
  p_stage               TEXT,
  p_team_size           INTEGER DEFAULT 1,
  p_annual_revenue_usd  NUMERIC DEFAULT 0,
  p_capital_ask_usd     NUMERIC DEFAULT 0,
  p_problem_statement   TEXT    DEFAULT '',
  p_solution_statement  TEXT    DEFAULT '',
  p_website             TEXT    DEFAULT NULL,
  p_package_id          TEXT    DEFAULT 'access',
  p_package_name        TEXT    DEFAULT 'IFB ACCESS',
  p_package_price_usd   NUMERIC DEFAULT 0,
  p_addons              JSONB   DEFAULT '[]',
  p_addons_total_usd    NUMERIC DEFAULT 0,
  p_payment_status      TEXT    DEFAULT 'admin_created',
  p_status              TEXT    DEFAULT 'under_review',
  p_assigned_advisor    TEXT    DEFAULT NULL,
  p_notes               TEXT    DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_app_id   UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_admin_id AND role IN ('admin','admin_l3','superadmin'))
  THEN RAISE EXCEPTION 'Admin access required'; END IF;

  INSERT INTO public.ifb_entrepreneur_applications (
    user_id, company_name, sector, country, stage, team_size,
    annual_revenue_usd, capital_ask_usd, problem_statement, solution_statement,
    website, package_id, package_name, package_price_usd,
    addons, addons_total_usd, total_paid_usd, payment_status, status,
    assigned_advisor, notes
  ) VALUES (
    p_target_user_id, p_company_name, p_sector, p_country, p_stage, p_team_size,
    p_annual_revenue_usd, p_capital_ask_usd, p_problem_statement, p_solution_statement,
    p_website, p_package_id, p_package_name, p_package_price_usd,
    p_addons, p_addons_total_usd, p_package_price_usd + p_addons_total_usd,
    p_payment_status, p_status, p_assigned_advisor, p_notes
  ) RETURNING id INTO v_app_id;

  -- Notify the user
  INSERT INTO public.notifications (user_id, type, message, read, status)
  VALUES (p_target_user_id, 'system',
    'An IFB advisor has registered your company "' || p_company_name || '" under the ' || p_package_name || ' program. Your application is now ' || p_status || '.',
    false, 'completed');

  RETURN json_build_object('ok', true, 'app_id', v_app_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_create_application_for_user TO authenticated;

-- ── 5. admin_update_venturex_full ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_update_venturex_full(
  p_company_id UUID,
  p_updates    JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     UUID := auth.uid();
  v_allowed TEXT[] := ARRAY[
    'legal_name','registration_number','country','sector','sub_sector','tagline','website',
    'founders','monthly_revenue','revenue_growth_rate','revenue_streams',
    'fixed_costs','variable_costs','total_expenses','gross_margin','net_profit','ebitda',
    'monthly_burn_rate','cash_on_hand','total_raised','current_round','valuation',
    'funding_goal','equity_offered','product_stage','active_users','user_growth_rate',
    'retention_rate','churn_rate','tam','sam','som','competitors','competitive_advantage',
    'team_size','hiring_plan','key_roles_missing','cac','ltv','conversion_rate',
    'regulatory_risk','market_risk','execution_risk',
    'pitch_deck_url','financial_statements_url','legal_docs_url',
    'investment_readiness_score','risk_score','growth_score',
    'status','is_public','financial_verified','identity_verified','traction_verified',
    'problem_statement','solution_statement','description','incorporation_date'
  ];
  v_key     TEXT;
  v_sql     TEXT := 'UPDATE public.venturex_companies SET updated_at = NOW()';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_uid AND role IN ('admin','admin_l3','superadmin'))
  THEN RAISE EXCEPTION 'Admin access required'; END IF;

  FOR v_key IN SELECT jsonb_object_keys(p_updates) LOOP
    IF v_key = ANY(v_allowed) THEN
      v_sql := v_sql || ', ' || quote_ident(v_key) || ' = ' || quote_nullable((p_updates->>v_key));
    END IF;
  END LOOP;

  v_sql := v_sql || ' WHERE id = ' || quote_literal(p_company_id);
  EXECUTE v_sql;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_update_venturex_full TO authenticated;

-- ── 6. admin_get_user_overview (for "view as user" mode) ──────────────────────
CREATE OR REPLACE FUNCTION public.admin_get_user_overview(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_apps  JSON;
  v_cos   JSON;
  v_notifs JSON;
  v_txns  JSON;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_uid AND role IN ('admin','admin_l3','superadmin'))
  THEN RAISE EXCEPTION 'Admin access required'; END IF;

  SELECT json_agg(row_to_json(a)) INTO v_apps
  FROM (
    SELECT id, company_name, sector, country, stage, package_name, package_id,
           total_paid_usd, status, assigned_advisor, notes, created_at, updated_at
    FROM public.ifb_entrepreneur_applications
    WHERE user_id = p_user_id
    ORDER BY created_at DESC LIMIT 20
  ) a;

  SELECT json_agg(row_to_json(c)) INTO v_cos
  FROM (
    SELECT id, legal_name, sector, country, product_stage, funding_goal, total_raised,
           valuation, status, is_public, financial_verified, identity_verified,
           traction_verified, investment_readiness_score, pitch_deck_url,
           financial_statements_url, legal_docs_url, created_at
    FROM public.venturex_companies
    WHERE user_id = p_user_id
    ORDER BY created_at DESC LIMIT 20
  ) c;

  SELECT json_agg(row_to_json(n)) INTO v_notifs
  FROM (
    SELECT id, type, message, read, status, created_at
    FROM public.notifications
    WHERE user_id = p_user_id
    ORDER BY created_at DESC LIMIT 30
  ) n;

  SELECT json_agg(row_to_json(t)) INTO v_txns
  FROM (
    SELECT 'p2p' AS source, id, amount_usd AS amount, 'USD' AS currency,
           order_type AS tx_type, status, created_at
    FROM public.p2p_orders WHERE user_id = p_user_id
    UNION ALL
    SELECT 'afr', id, amount, currency, entry_type, NULL, created_at
    FROM public.afr_ledger WHERE user_id = p_user_id
    ORDER BY created_at DESC LIMIT 50
  ) t;

  RETURN json_build_object(
    'applications', COALESCE(v_apps, '[]'::json),
    'companies',    COALESCE(v_cos,  '[]'::json),
    'notifications',COALESCE(v_notifs,'[]'::json),
    'transactions', COALESCE(v_txns, '[]'::json)
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_user_overview TO authenticated;
