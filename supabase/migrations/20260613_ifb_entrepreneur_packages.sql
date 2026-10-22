-- ============================================================
-- IFB Entrepreneur Package Applications
-- Entrepreneurs apply, choose a support package, pay from balance.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ifb_entrepreneur_applications (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Company Profile
  company_name          TEXT NOT NULL,
  sector                TEXT NOT NULL,
  country               TEXT NOT NULL,
  stage                 TEXT NOT NULL CHECK (stage IN ('idea','pre_revenue','early','growth','scale')),
  team_size             INTEGER DEFAULT 1,
  annual_revenue_usd    NUMERIC DEFAULT 0,
  capital_ask_usd       NUMERIC,
  problem_statement     TEXT NOT NULL,
  solution_statement    TEXT NOT NULL,
  website               TEXT,

  -- Package
  package_id            TEXT NOT NULL CHECK (package_id IN ('access','growth','elite')),
  package_name          TEXT NOT NULL,
  package_price_usd     NUMERIC NOT NULL,

  -- Add-ons (JSONB array of selected add-on ids)
  addons                JSONB DEFAULT '[]',
  addons_total_usd      NUMERIC DEFAULT 0,
  total_paid_usd        NUMERIC NOT NULL,

  -- Status
  payment_status        TEXT NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid','refunded','disputed')),
  status                TEXT NOT NULL DEFAULT 'under_review'
                        CHECK (status IN ('under_review','in_progress','completed','cancelled')),
  assigned_advisor      TEXT,
  notes                 TEXT,

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ifb_entrepreneur_applications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "app_own_rw" ON public.ifb_entrepreneur_applications
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Admin read
DO $$ BEGIN
  CREATE POLICY "app_admin_read" ON public.ifb_entrepreneur_applications
    FOR SELECT USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── RPC: purchase_ifb_package ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.purchase_ifb_package(
  p_company_name        TEXT,
  p_sector              TEXT,
  p_country             TEXT,
  p_stage               TEXT,
  p_team_size           INTEGER,
  p_annual_revenue_usd  NUMERIC,
  p_capital_ask_usd     NUMERIC,
  p_problem_statement   TEXT,
  p_solution_statement  TEXT,
  p_website             TEXT,
  p_package_id          TEXT,
  p_package_name        TEXT,
  p_package_price_usd   NUMERIC,
  p_addons              JSONB  DEFAULT '[]',
  p_addons_total_usd    NUMERIC DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     UUID  := auth.uid();
  v_balance     NUMERIC;
  v_total       NUMERIC;
  v_app_id      UUID;
BEGIN
  v_total := p_package_price_usd + COALESCE(p_addons_total_usd, 0);

  -- Check balance
  SELECT liquid_usd INTO v_balance FROM balances WHERE user_id = v_user_id;
  IF v_balance IS NULL OR v_balance < v_total THEN
    RAISE EXCEPTION 'Insufficient balance. You need $% but have $%.', v_total, COALESCE(v_balance, 0);
  END IF;

  -- Debit balance
  UPDATE balances SET liquid_usd = liquid_usd - v_total WHERE user_id = v_user_id;

  -- Record transaction
  INSERT INTO transactions (user_id, type, amount, description, status)
  VALUES (v_user_id, 'service_fee', v_total,
          'IFB ' || p_package_name || ' — Entrepreneur Support Package', 'completed');

  -- Create application
  INSERT INTO ifb_entrepreneur_applications (
    user_id, company_name, sector, country, stage, team_size,
    annual_revenue_usd, capital_ask_usd, problem_statement, solution_statement,
    website, package_id, package_name, package_price_usd,
    addons, addons_total_usd, total_paid_usd, payment_status, status
  ) VALUES (
    v_user_id, p_company_name, p_sector, p_country, p_stage, p_team_size,
    p_annual_revenue_usd, p_capital_ask_usd, p_problem_statement, p_solution_statement,
    p_website, p_package_id, p_package_name, p_package_price_usd,
    p_addons, p_addons_total_usd, v_total, 'paid', 'under_review'
  ) RETURNING id INTO v_app_id;

  RETURN json_build_object(
    'ok',         TRUE,
    'app_id',     v_app_id,
    'total_paid', v_total,
    'new_balance', v_balance - v_total
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.purchase_ifb_package TO authenticated;
