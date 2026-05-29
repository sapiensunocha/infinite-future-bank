-- IFB Company Formation Service: table + RPC (consolidated)
-- Table uses IF NOT EXISTS to be safe if partially applied previously.

CREATE TABLE IF NOT EXISTS public.company_formation_orders (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  country              TEXT NOT NULL,
  country_code         TEXT,
  country_flag         TEXT,
  company_type         TEXT NOT NULL,
  company_type_id      TEXT NOT NULL,
  package_tier         TEXT NOT NULL CHECK (package_tier IN ('launch', 'scale', 'elite')),
  package_name         TEXT NOT NULL,
  base_price_usd       NUMERIC(10,2) NOT NULL,
  addon_price_usd      NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_paid_usd       NUMERIC(10,2) NOT NULL,
  founder_name         TEXT NOT NULL,
  business_name        TEXT NOT NULL,
  industry             TEXT NOT NULL,
  contact_email        TEXT,
  additional_notes     TEXT,
  status               TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  reference_number     TEXT UNIQUE DEFAULT 'IFB-' || upper(substring(gen_random_uuid()::text, 1, 8)),
  notification_sent    BOOLEAN DEFAULT FALSE,
  assigned_handler     TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.company_formation_orders ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "formation_own_rw" ON public.company_formation_orders
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "formation_admin_read" ON public.company_formation_orders
    FOR SELECT USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_formation_user   ON public.company_formation_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_formation_status ON public.company_formation_orders(status);

-- Parameters with defaults must come last in PostgreSQL.
CREATE OR REPLACE FUNCTION public.purchase_company_formation(
  p_country             TEXT,
  p_country_flag        TEXT,
  p_company_type        TEXT,
  p_company_type_id     TEXT,
  p_package_tier        TEXT,
  p_package_name        TEXT,
  p_base_price_usd      NUMERIC,
  p_founder_name        TEXT,
  p_business_name       TEXT,
  p_industry            TEXT,
  p_addon_price_usd     NUMERIC DEFAULT 0,
  p_total_price_usd     NUMERIC DEFAULT 0,
  p_contact_email       TEXT DEFAULT NULL,
  p_additional_notes    TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      UUID    := auth.uid();
  v_balance      NUMERIC;
  v_total        NUMERIC;
  v_order_id     UUID;
  v_reference    TEXT;
BEGIN
  v_total := COALESCE(p_total_price_usd, p_base_price_usd + COALESCE(p_addon_price_usd, 0));

  SELECT liquid_usd INTO v_balance FROM balances WHERE user_id = v_user_id;
  IF v_balance IS NULL OR v_balance < v_total THEN
    RAISE EXCEPTION 'Insufficient balance. Required: $%. Available: $%.', v_total, COALESCE(v_balance, 0);
  END IF;

  UPDATE balances SET liquid_usd = liquid_usd - v_total WHERE user_id = v_user_id;

  INSERT INTO transactions (user_id, type, amount, description, status)
  VALUES (v_user_id, 'service_fee', v_total,
          'IFB Company Formation — ' || p_company_type || ' in ' || p_country || ' (' || p_package_name || ')',
          'completed');

  INSERT INTO company_formation_orders (
    user_id, country, country_flag, company_type, company_type_id,
    package_tier, package_name, base_price_usd, addon_price_usd, total_paid_usd,
    founder_name, business_name, industry, contact_email, additional_notes,
    status, notification_sent
  ) VALUES (
    v_user_id, p_country, p_country_flag, p_company_type, p_company_type_id,
    p_package_tier, p_package_name, p_base_price_usd, COALESCE(p_addon_price_usd, 0), v_total,
    p_founder_name, p_business_name, p_industry, p_contact_email, p_additional_notes,
    'pending', FALSE
  ) RETURNING id, reference_number INTO v_order_id, v_reference;

  RETURN json_build_object(
    'ok',               TRUE,
    'order_id',         v_order_id,
    'reference_number', v_reference,
    'total_paid',       v_total,
    'new_balance',      v_balance - v_total
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.purchase_company_formation TO authenticated;
