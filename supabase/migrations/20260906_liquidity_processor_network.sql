-- ============================================================
-- IFB Liquidity Processor Network
-- Processor registry, stock tracking, smart routing, RPCs
-- ============================================================

-- 1. Processor profiles
CREATE TABLE IF NOT EXISTS public.processor_profiles (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name         TEXT        NOT NULL,
  email             TEXT        NOT NULL,
  phone             TEXT,
  country           TEXT        NOT NULL,
  city              TEXT,
  status            TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','active','suspended','inactive')),
  supported_networks TEXT[]     DEFAULT '{}',
  mobile_numbers    JSONB       DEFAULT '{}',
  max_order_usd     NUMERIC     DEFAULT 500,
  daily_limit_usd   NUMERIC     DEFAULT 2000,
  cot_rating        NUMERIC     DEFAULT 5.0,
  total_orders      INT         DEFAULT 0,
  completed_orders  INT         DEFAULT 0,
  kyc_verified      BOOLEAN     DEFAULT FALSE,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Processor stock (mobile money balance per network per country)
CREATE TABLE IF NOT EXISTS public.processor_stock (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  processor_id     UUID        NOT NULL REFERENCES public.processor_profiles(id) ON DELETE CASCADE,
  network          TEXT        NOT NULL,
  country          TEXT        NOT NULL,
  currency_code    TEXT        NOT NULL,
  exchange_rate    NUMERIC     NOT NULL DEFAULT 1,
  balance_local    NUMERIC     DEFAULT 0,
  balance_usd      NUMERIC     DEFAULT 0,
  low_threshold_usd NUMERIC   DEFAULT 50,
  last_updated     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(processor_id, network, country)
);

-- 3. Stock refill history
CREATE TABLE IF NOT EXISTS public.stock_refills (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  processor_id   UUID        NOT NULL REFERENCES public.processor_profiles(id),
  network        TEXT        NOT NULL,
  country        TEXT        NOT NULL,
  amount_usd     NUMERIC     NOT NULL,
  amount_local   NUMERIC     NOT NULL,
  currency_code  TEXT        NOT NULL,
  refilled_by    UUID        REFERENCES auth.users(id),
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Per-order processor ratings
CREATE TABLE IF NOT EXISTS public.processor_ratings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processor_id UUID NOT NULL REFERENCES public.processor_profiles(id),
  order_id     UUID,
  rated_by     UUID REFERENCES auth.users(id),
  rating       INT  NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Extend p2p_orders with routing fields
ALTER TABLE public.p2p_orders
  ADD COLUMN IF NOT EXISTS network         TEXT,
  ADD COLUMN IF NOT EXISTS reference_code  TEXT,
  ADD COLUMN IF NOT EXISTS processor_mobile TEXT,
  ADD COLUMN IF NOT EXISTS user_mobile     TEXT;

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_proc_profiles_country  ON public.processor_profiles(country);
CREATE INDEX IF NOT EXISTS idx_proc_profiles_status   ON public.processor_profiles(status);
CREATE INDEX IF NOT EXISTS idx_proc_stock_proc_id     ON public.processor_stock(processor_id);
CREATE INDEX IF NOT EXISTS idx_p2p_orders_proc_id     ON public.p2p_orders(processor_id);
CREATE INDEX IF NOT EXISTS idx_p2p_orders_network     ON public.p2p_orders(network);

-- 7. RLS
ALTER TABLE public.processor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processor_stock    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_refills      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processor_ratings  ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "admin_processor_profiles" ON public.processor_profiles FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid()));

CREATE POLICY "admin_processor_stock" ON public.processor_stock FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid()));

CREATE POLICY "admin_stock_refills" ON public.stock_refills FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid()));

CREATE POLICY "admin_processor_ratings" ON public.processor_ratings FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid()));

-- Processor reads own profile + stock
CREATE POLICY "processor_own_profile" ON public.processor_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "processor_own_stock" ON public.processor_stock FOR SELECT
  USING (processor_id IN (
    SELECT id FROM public.processor_profiles WHERE user_id = auth.uid()
  ));

-- All authenticated users can see active processors (routing)
CREATE POLICY "users_active_processors" ON public.processor_profiles FOR SELECT
  USING (status = 'active' AND auth.uid() IS NOT NULL);

CREATE POLICY "users_processor_stock" ON public.processor_stock FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Users can rate
CREATE POLICY "users_insert_ratings" ON public.processor_ratings FOR INSERT
  WITH CHECK (rated_by = auth.uid());

-- =================================================================
-- RPC: route_p2p_order
-- Finds best available processor for a given network/country/amount
-- =================================================================
CREATE OR REPLACE FUNCTION public.route_p2p_order(
  p_amount_usd NUMERIC,
  p_network    TEXT,
  p_country    TEXT
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE v_result json;
BEGIN
  SELECT json_build_object(
    'processor_id',     pp.id,
    'processor_name',   pp.full_name,
    'processor_email',  pp.email,
    'processor_mobile', pp.mobile_numbers->p_network,
    'country',          pp.country,
    'network',          p_network,
    'cot_rating',       pp.cot_rating,
    'stock_usd',        ps.balance_usd
  ) INTO v_result
  FROM public.processor_profiles pp
  JOIN public.processor_stock ps
    ON ps.processor_id = pp.id
    AND ps.network  = p_network
    AND ps.country  = p_country
  WHERE pp.status = 'active'
    AND p_network = ANY(pp.supported_networks)
    AND ps.balance_usd >= p_amount_usd
    AND pp.max_order_usd >= p_amount_usd
  ORDER BY pp.cot_rating DESC, ps.balance_usd DESC
  LIMIT 1;

  RETURN v_result;
END;
$$;

-- =================================================================
-- RPC: update_processor_stock
-- Adjust processor stock after a completed order
-- =================================================================
CREATE OR REPLACE FUNCTION public.update_processor_stock(
  p_processor_id UUID,
  p_network      TEXT,
  p_country      TEXT,
  p_delta_usd    NUMERIC
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.processor_stock
  SET
    balance_usd   = GREATEST(0, balance_usd + p_delta_usd),
    balance_local = GREATEST(0, balance_local + (p_delta_usd * exchange_rate)),
    last_updated  = NOW()
  WHERE processor_id = p_processor_id
    AND network = p_network
    AND country = p_country;
END;
$$;

-- =================================================================
-- RPC: get_processor_dashboard
-- Processor sees their own queue and stock
-- =================================================================
CREATE OR REPLACE FUNCTION public.get_processor_dashboard()
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_proc_id UUID;
BEGIN
  SELECT id INTO v_proc_id
  FROM public.processor_profiles
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;

  IF v_proc_id IS NULL THEN
    RETURN json_build_object('error', 'Not a registered active processor');
  END IF;

  RETURN json_build_object(
    'processor',  (SELECT row_to_json(pp) FROM public.processor_profiles pp WHERE pp.id = v_proc_id),
    'stock',      (SELECT json_agg(row_to_json(ps)) FROM public.processor_stock ps WHERE ps.processor_id = v_proc_id),
    'deposits',   (
      SELECT json_agg(row_to_json(r)) FROM (
        SELECT po.id, po.amount_usd, po.network, po.reference_code, po.user_mobile,
               po.status, po.created_at, po.proof_image_url,
               pr.full_name AS user_name, pr.email AS user_email
        FROM public.p2p_orders po
        JOIN public.profiles pr ON pr.id = po.user_id
        WHERE po.processor_id = v_proc_id
          AND po.order_type = 'deposit'
          AND po.status IN ('open','proof_uploaded')
        ORDER BY po.created_at ASC
      ) r
    ),
    'withdrawals', (
      SELECT json_agg(row_to_json(r)) FROM (
        SELECT po.id, po.amount_usd, po.network, po.user_mobile,
               po.status, po.created_at,
               pr.full_name AS user_name, pr.email AS user_email
        FROM public.p2p_orders po
        JOIN public.profiles pr ON pr.id = po.user_id
        WHERE po.processor_id = v_proc_id
          AND po.order_type = 'withdraw'
          AND po.status IN ('open','escrow_locked')
        ORDER BY po.created_at ASC
      ) r
    )
  );
END;
$$;

-- =================================================================
-- RPC: admin_get_processor_network
-- Admin sees all processors, their stock, and order counts
-- =================================================================
CREATE OR REPLACE FUNCTION public.admin_get_processor_network()
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN (
    SELECT json_agg(row_to_json(r)) FROM (
      SELECT
        pp.*,
        (SELECT json_agg(row_to_json(ps))
           FROM public.processor_stock ps
          WHERE ps.processor_id = pp.id)                              AS stock,
        (SELECT COUNT(*)
           FROM public.p2p_orders po
          WHERE po.processor_id = pp.id
            AND po.status IN ('open','escrow_locked','proof_uploaded')) AS active_orders,
        (SELECT COALESCE(SUM(balance_usd), 0)
           FROM public.processor_stock ps
          WHERE ps.processor_id = pp.id)                              AS total_stock_usd,
        (SELECT COUNT(*)
           FROM public.processor_stock ps
          WHERE ps.processor_id = pp.id
            AND ps.balance_usd < ps.low_threshold_usd)                AS low_stock_count
      FROM public.processor_profiles pp
      ORDER BY
        CASE pp.status WHEN 'active' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,
        pp.cot_rating DESC
    ) r
  );
END;
$$;

-- =================================================================
-- RPC: admin_refill_stock
-- Admin refills a processor's stock and records the refill
-- =================================================================
CREATE OR REPLACE FUNCTION public.admin_refill_stock(
  p_processor_id UUID,
  p_network      TEXT,
  p_country      TEXT,
  p_amount_usd   NUMERIC,
  p_notes        TEXT DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_rate   NUMERIC;
  v_curr   TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT exchange_rate, currency_code
    INTO v_rate, v_curr
    FROM public.processor_stock
   WHERE processor_id = p_processor_id
     AND network = p_network
     AND country = p_country;

  UPDATE public.processor_stock
  SET
    balance_usd   = balance_usd + p_amount_usd,
    balance_local = balance_local + (p_amount_usd * COALESCE(v_rate, 1)),
    last_updated  = NOW()
  WHERE processor_id = p_processor_id
    AND network = p_network
    AND country = p_country;

  INSERT INTO public.stock_refills
    (processor_id, network, country, amount_usd, amount_local, currency_code, refilled_by, notes)
  VALUES
    (p_processor_id, p_network, p_country, p_amount_usd,
     p_amount_usd * COALESCE(v_rate, 1), COALESCE(v_curr, 'USD'),
     auth.uid(), p_notes);
END;
$$;

-- =================================================================
-- RPC: confirm_p2p_receipt (processor confirms deposit received)
-- =================================================================
CREATE OR REPLACE FUNCTION public.confirm_p2p_receipt(p_order_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_proc_id  UUID;
  v_order    RECORD;
BEGIN
  SELECT id INTO v_proc_id
  FROM public.processor_profiles
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;

  IF v_proc_id IS NULL THEN RAISE EXCEPTION 'Not a processor'; END IF;

  SELECT * INTO v_order
  FROM public.p2p_orders
  WHERE id = p_order_id AND processor_id = v_proc_id AND order_type = 'deposit';

  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

  -- Credit user balance
  UPDATE public.balances
  SET liquid_usd = liquid_usd + v_order.amount_usd,
      updated_at = NOW()
  WHERE user_id = v_order.user_id;

  -- Mark order completed
  UPDATE public.p2p_orders
  SET status = 'completed', updated_at = NOW()
  WHERE id = p_order_id;

  -- Deduct processor stock
  PERFORM public.update_processor_stock(
    v_proc_id, v_order.network,
    (SELECT country FROM public.processor_profiles WHERE id = v_proc_id),
    -v_order.amount_usd
  );

  -- Update processor stats
  UPDATE public.processor_profiles
  SET total_orders = total_orders + 1,
      completed_orders = completed_orders + 1,
      updated_at = NOW()
  WHERE id = v_proc_id;

  -- Ledger entry
  INSERT INTO public.ifb_ledger (user_id, amount_usd, source_type, reference_id, justification, is_verified)
  VALUES (v_order.user_id, v_order.amount_usd, 'p2p_deposit', p_order_id,
          'Mobile money deposit confirmed by processor', TRUE);
END;
$$;

-- =================================================================
-- RPC: mark_p2p_withdrawal_sent (processor marks withdrawal sent)
-- =================================================================
CREATE OR REPLACE FUNCTION public.mark_p2p_withdrawal_sent(p_order_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_proc_id UUID;
  v_order   RECORD;
BEGIN
  SELECT id INTO v_proc_id
  FROM public.processor_profiles
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;

  IF v_proc_id IS NULL THEN RAISE EXCEPTION 'Not a processor'; END IF;

  SELECT * INTO v_order
  FROM public.p2p_orders
  WHERE id = p_order_id AND processor_id = v_proc_id AND order_type = 'withdraw';

  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

  -- Release escrow and debit
  UPDATE public.balances
  SET escrow_usd = GREATEST(0, escrow_usd - v_order.amount_usd),
      updated_at = NOW()
  WHERE user_id = v_order.user_id;

  -- Mark completed
  UPDATE public.p2p_orders
  SET status = 'completed', updated_at = NOW()
  WHERE id = p_order_id;

  -- Processor stock increases (they now have more mobile money)
  PERFORM public.update_processor_stock(
    v_proc_id, v_order.network,
    (SELECT country FROM public.processor_profiles WHERE id = v_proc_id),
    v_order.amount_usd
  );

  -- Update processor stats
  UPDATE public.processor_profiles
  SET total_orders = total_orders + 1,
      completed_orders = completed_orders + 1,
      updated_at = NOW()
  WHERE id = v_proc_id;

  -- Ledger entry
  INSERT INTO public.ifb_ledger (user_id, amount_usd, source_type, reference_id, justification, is_verified)
  VALUES (v_order.user_id, -v_order.amount_usd, 'p2p_withdrawal', p_order_id,
          'Mobile money withdrawal sent by processor', TRUE);
END;
$$;
