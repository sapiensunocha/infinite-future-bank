-- ============================================================
-- IFB Processor Bonus & Performance System
-- Speed-based commissions, tiers, monthly bonuses
-- ============================================================

-- 1. Add performance tracking columns to p2p_orders
ALTER TABLE public.p2p_orders
  ADD COLUMN IF NOT EXISTS assigned_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS response_time_s INT,      -- seconds from assigned to confirmed
  ADD COLUMN IF NOT EXISTS commission_pct  NUMERIC,  -- actual % earned
  ADD COLUMN IF NOT EXISTS commission_usd  NUMERIC;  -- actual $ earned

-- 2. Add earnings + tier to processor_profiles
ALTER TABLE public.processor_profiles
  ADD COLUMN IF NOT EXISTS tier               TEXT    DEFAULT 'bronze'
                                              CHECK (tier IN ('bronze','silver','gold','platinum')),
  ADD COLUMN IF NOT EXISTS total_earned_usd   NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_volume_usd NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_response_time_s INT   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fast_orders_count  INT    DEFAULT 0; -- orders completed < 60s

-- 3. Monthly earnings ledger
CREATE TABLE IF NOT EXISTS public.processor_earnings (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  processor_id   UUID        NOT NULL REFERENCES public.processor_profiles(id),
  order_id       UUID,
  month          TEXT        NOT NULL, -- 'YYYY-MM'
  commission_usd NUMERIC     NOT NULL DEFAULT 0,
  bonus_usd      NUMERIC     NOT NULL DEFAULT 0,
  total_usd      NUMERIC     GENERATED ALWAYS AS (commission_usd + bonus_usd) STORED,
  type           TEXT        NOT NULL CHECK (type IN ('commission','speed_bonus','tier_bonus','monthly_bonus')),
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proc_earnings_processor ON public.processor_earnings(processor_id);
CREATE INDEX IF NOT EXISTS idx_proc_earnings_month     ON public.processor_earnings(month);

ALTER TABLE public.processor_earnings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='processor_earnings' AND policyname='admin_earnings') THEN
    CREATE POLICY "admin_earnings" ON public.processor_earnings FOR ALL
      USING (EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='processor_earnings' AND policyname='processor_own_earnings') THEN
    CREATE POLICY "processor_own_earnings" ON public.processor_earnings FOR SELECT
      USING (processor_id IN (SELECT id FROM public.processor_profiles WHERE user_id = auth.uid()));
  END IF;
END $$;

-- ============================================================
-- RPC: calculate_commission
-- Returns commission % based on response time in seconds
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_commission(p_response_time_s INT)
RETURNS NUMERIC LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_response_time_s IS NULL   THEN 0.5
    WHEN p_response_time_s <= 60     THEN 2.5  -- under 1 min → 2.5%
    WHEN p_response_time_s <= 300    THEN 2.0  -- 1–5 min   → 2.0%
    WHEN p_response_time_s <= 900    THEN 1.5  -- 5–15 min  → 1.5%
    WHEN p_response_time_s <= 1800   THEN 1.0  -- 15–30 min → 1.0%
    ELSE                                  0.5  -- over 30 min → 0.5%
  END;
$$;

-- ============================================================
-- RPC: get_tier_bonus
-- Extra % from tier on top of base commission
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_tier_bonus(p_tier TEXT)
RETURNS NUMERIC LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_tier
    WHEN 'platinum' THEN 0.8
    WHEN 'gold'     THEN 0.5
    WHEN 'silver'   THEN 0.2
    ELSE                 0.0
  END;
$$;

-- ============================================================
-- RPC: confirm_p2p_receipt (replace previous version)
-- Now calculates speed-based commission + records earnings
-- ============================================================
CREATE OR REPLACE FUNCTION public.confirm_p2p_receipt(p_order_id UUID)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_proc_id     UUID;
  v_proc        RECORD;
  v_order       RECORD;
  v_resp_time   INT;
  v_base_pct    NUMERIC;
  v_tier_bonus  NUMERIC;
  v_total_pct   NUMERIC;
  v_commission  NUMERIC;
  v_month       TEXT := TO_CHAR(NOW(), 'YYYY-MM');
BEGIN
  SELECT id INTO v_proc_id
  FROM public.processor_profiles
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;

  IF v_proc_id IS NULL THEN RAISE EXCEPTION 'Not an active processor'; END IF;

  SELECT * INTO v_proc FROM public.processor_profiles WHERE id = v_proc_id;
  SELECT * INTO v_order FROM public.p2p_orders
  WHERE id = p_order_id AND processor_id = v_proc_id AND order_type = 'deposit';

  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

  -- Calculate response time
  v_resp_time  := EXTRACT(EPOCH FROM (NOW() - COALESCE(v_order.assigned_at, v_order.created_at)))::INT;
  v_base_pct   := public.calculate_commission(v_resp_time);
  v_tier_bonus := public.get_tier_bonus(v_proc.tier);
  v_total_pct  := v_base_pct + v_tier_bonus;
  v_commission := ROUND((v_order.amount_usd * v_total_pct / 100), 4);

  -- Credit user balance
  UPDATE public.balances
  SET liquid_usd = liquid_usd + v_order.amount_usd, updated_at = NOW()
  WHERE user_id = v_order.user_id;

  -- Mark order completed with timing + commission
  UPDATE public.p2p_orders SET
    status           = 'completed',
    completed_at     = NOW(),
    response_time_s  = v_resp_time,
    commission_pct   = v_total_pct,
    commission_usd   = v_commission,
    updated_at       = NOW()
  WHERE id = p_order_id;

  -- Deduct processor stock
  PERFORM public.update_processor_stock(
    v_proc_id, v_order.network,
    (SELECT country FROM public.processor_profiles WHERE id = v_proc_id),
    -v_order.amount_usd
  );

  -- Record earnings
  INSERT INTO public.processor_earnings
    (processor_id, order_id, month, commission_usd, bonus_usd, type, notes)
  VALUES
    (v_proc_id, p_order_id, v_month, v_commission, 0, 'commission',
     'Deposit ' || v_order.amount_usd || ' USD @ ' || v_total_pct || '% (' || v_resp_time || 's)');

  -- Update processor stats + tier
  UPDATE public.processor_profiles SET
    total_orders      = total_orders + 1,
    completed_orders  = completed_orders + 1,
    total_earned_usd  = total_earned_usd + v_commission,
    monthly_volume_usd = monthly_volume_usd + v_order.amount_usd,
    fast_orders_count = fast_orders_count + CASE WHEN v_resp_time <= 60 THEN 1 ELSE 0 END,
    avg_response_time_s = (
      (COALESCE(avg_response_time_s, 0) * completed_orders + v_resp_time) / (completed_orders + 1)
    ),
    tier = CASE
      WHEN completed_orders + 1 >= 500 AND cot_rating >= 4.8 THEN 'platinum'
      WHEN completed_orders + 1 >= 200 AND cot_rating >= 4.5 THEN 'gold'
      WHEN completed_orders + 1 >= 50  AND cot_rating >= 4.0 THEN 'silver'
      ELSE tier
    END,
    updated_at = NOW()
  WHERE id = v_proc_id;

  -- Ledger entry
  INSERT INTO public.ifb_ledger (user_id, amount_usd, source_type, reference_id, justification, is_verified)
  VALUES (v_order.user_id, v_order.amount_usd, 'p2p_deposit', p_order_id,
          'Mobile money deposit confirmed by processor', TRUE);

  RETURN json_build_object(
    'ok',              TRUE,
    'commission_pct',  v_total_pct,
    'commission_usd',  v_commission,
    'response_time_s', v_resp_time,
    'tier_bonus_pct',  v_tier_bonus
  );
END;
$$;

-- ============================================================
-- RPC: mark_p2p_withdrawal_sent (replace previous version)
-- Now calculates speed-based commission + records earnings
-- ============================================================
CREATE OR REPLACE FUNCTION public.mark_p2p_withdrawal_sent(p_order_id UUID)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_proc_id     UUID;
  v_proc        RECORD;
  v_order       RECORD;
  v_resp_time   INT;
  v_base_pct    NUMERIC;
  v_tier_bonus  NUMERIC;
  v_total_pct   NUMERIC;
  v_commission  NUMERIC;
  v_month       TEXT := TO_CHAR(NOW(), 'YYYY-MM');
BEGIN
  SELECT id INTO v_proc_id
  FROM public.processor_profiles
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;

  IF v_proc_id IS NULL THEN RAISE EXCEPTION 'Not an active processor'; END IF;

  SELECT * INTO v_proc FROM public.processor_profiles WHERE id = v_proc_id;
  SELECT * INTO v_order FROM public.p2p_orders
  WHERE id = p_order_id AND processor_id = v_proc_id AND order_type = 'withdraw';

  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

  v_resp_time  := EXTRACT(EPOCH FROM (NOW() - COALESCE(v_order.assigned_at, v_order.created_at)))::INT;
  v_base_pct   := public.calculate_commission(v_resp_time);
  v_tier_bonus := public.get_tier_bonus(v_proc.tier);
  v_total_pct  := v_base_pct + v_tier_bonus;
  v_commission := ROUND((v_order.amount_usd * v_total_pct / 100), 4);

  -- Release escrow and debit
  UPDATE public.balances
  SET escrow_usd = GREATEST(0, escrow_usd - v_order.amount_usd), updated_at = NOW()
  WHERE user_id = v_order.user_id;

  -- Mark completed
  UPDATE public.p2p_orders SET
    status          = 'completed',
    completed_at    = NOW(),
    response_time_s = v_resp_time,
    commission_pct  = v_total_pct,
    commission_usd  = v_commission,
    updated_at      = NOW()
  WHERE id = p_order_id;

  -- Processor stock increases (they received the mobile money)
  PERFORM public.update_processor_stock(
    v_proc_id, v_order.network,
    (SELECT country FROM public.processor_profiles WHERE id = v_proc_id),
    v_order.amount_usd
  );

  -- Record earnings
  INSERT INTO public.processor_earnings
    (processor_id, order_id, month, commission_usd, bonus_usd, type, notes)
  VALUES
    (v_proc_id, p_order_id, v_month, v_commission, 0, 'commission',
     'Withdrawal ' || v_order.amount_usd || ' USD @ ' || v_total_pct || '% (' || v_resp_time || 's)');

  -- Update processor stats
  UPDATE public.processor_profiles SET
    total_orders       = total_orders + 1,
    completed_orders   = completed_orders + 1,
    total_earned_usd   = total_earned_usd + v_commission,
    monthly_volume_usd = monthly_volume_usd + v_order.amount_usd,
    fast_orders_count  = fast_orders_count + CASE WHEN v_resp_time <= 60 THEN 1 ELSE 0 END,
    avg_response_time_s = (
      (COALESCE(avg_response_time_s, 0) * completed_orders + v_resp_time) / (completed_orders + 1)
    ),
    tier = CASE
      WHEN completed_orders + 1 >= 500 AND cot_rating >= 4.8 THEN 'platinum'
      WHEN completed_orders + 1 >= 200 AND cot_rating >= 4.5 THEN 'gold'
      WHEN completed_orders + 1 >= 50  AND cot_rating >= 4.0 THEN 'silver'
      ELSE tier
    END,
    updated_at = NOW()
  WHERE id = v_proc_id;

  -- Ledger entry
  INSERT INTO public.ifb_ledger (user_id, amount_usd, source_type, reference_id, justification, is_verified)
  VALUES (v_order.user_id, -v_order.amount_usd, 'p2p_withdrawal', p_order_id,
          'Mobile money withdrawal sent by processor', TRUE);

  RETURN json_build_object(
    'ok',              TRUE,
    'commission_pct',  v_total_pct,
    'commission_usd',  v_commission,
    'response_time_s', v_resp_time,
    'tier_bonus_pct',  v_tier_bonus
  );
END;
$$;

-- ============================================================
-- RPC: get_processor_dashboard (replace previous version)
-- Now includes earnings, tier, speed stats
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_processor_dashboard()
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_proc_id UUID;
  v_month   TEXT := TO_CHAR(NOW(), 'YYYY-MM');
BEGIN
  SELECT id INTO v_proc_id
  FROM public.processor_profiles
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;

  IF v_proc_id IS NULL THEN
    RETURN json_build_object('error', 'Not a registered active processor');
  END IF;

  RETURN json_build_object(
    'processor',    (SELECT row_to_json(pp) FROM public.processor_profiles pp WHERE pp.id = v_proc_id),
    'stock',        (SELECT json_agg(row_to_json(ps)) FROM public.processor_stock ps WHERE ps.processor_id = v_proc_id),
    'deposits',     (
      SELECT json_agg(row_to_json(r)) FROM (
        SELECT po.id, po.amount_usd, po.network, po.reference_code, po.user_mobile,
               po.status, po.created_at, po.assigned_at, po.proof_image_url,
               pr.full_name AS user_name, pr.email AS user_email,
               EXTRACT(EPOCH FROM (NOW() - COALESCE(po.assigned_at, po.created_at)))::INT AS waiting_seconds
        FROM public.p2p_orders po
        JOIN public.profiles pr ON pr.id = po.user_id
        WHERE po.processor_id = v_proc_id
          AND po.order_type = 'deposit'
          AND po.status IN ('open','proof_uploaded')
        ORDER BY po.created_at ASC
      ) r
    ),
    'withdrawals',  (
      SELECT json_agg(row_to_json(r)) FROM (
        SELECT po.id, po.amount_usd, po.network, po.user_mobile,
               po.status, po.created_at, po.assigned_at,
               pr.full_name AS user_name, pr.email AS user_email,
               EXTRACT(EPOCH FROM (NOW() - COALESCE(po.assigned_at, po.created_at)))::INT AS waiting_seconds
        FROM public.p2p_orders po
        JOIN public.profiles pr ON pr.id = po.user_id
        WHERE po.processor_id = v_proc_id
          AND po.order_type = 'withdraw'
          AND po.status IN ('open','escrow_locked')
        ORDER BY po.created_at ASC
      ) r
    ),
    'this_month',   (
      SELECT json_build_object(
        'earnings_usd',   COALESCE(SUM(total_usd), 0),
        'order_count',    COUNT(*),
        'fast_count',     COUNT(*) FILTER (WHERE notes LIKE '%s)' AND SPLIT_PART(SPLIT_PART(notes,'(',2),'s)',1)::INT <= 60)
      )
      FROM public.processor_earnings
      WHERE processor_id = v_proc_id AND month = v_month
    ),
    'recent_orders', (
      SELECT json_agg(row_to_json(r)) FROM (
        SELECT po.id, po.order_type, po.amount_usd, po.network,
               po.commission_pct, po.commission_usd, po.response_time_s,
               po.status, po.completed_at
        FROM public.p2p_orders po
        WHERE po.processor_id = v_proc_id
          AND po.status = 'completed'
        ORDER BY po.completed_at DESC
        LIMIT 10
      ) r
    )
  );
END;
$$;

-- ============================================================
-- RPC: admin_pay_monthly_bonuses
-- Admin triggers monthly volume bonuses for all processors
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_pay_monthly_bonuses(p_month TEXT DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_month  TEXT := COALESCE(p_month, TO_CHAR(NOW() - INTERVAL '1 month', 'YYYY-MM'));
  v_count  INT  := 0;
  v_total  NUMERIC := 0;
  v_proc   RECORD;
  v_bonus  NUMERIC;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  FOR v_proc IN
    SELECT pp.id, pp.monthly_volume_usd, pp.tier
    FROM public.processor_profiles pp
    WHERE pp.status = 'active'
      AND pp.monthly_volume_usd > 0
      AND NOT EXISTS (
        SELECT 1 FROM public.processor_earnings pe
        WHERE pe.processor_id = pp.id AND pe.month = v_month AND pe.type = 'monthly_bonus'
      )
  LOOP
    v_bonus := CASE
      WHEN v_proc.monthly_volume_usd >= 50000 THEN 500
      WHEN v_proc.monthly_volume_usd >= 25000 THEN 200
      WHEN v_proc.monthly_volume_usd >= 10000 THEN 75
      WHEN v_proc.monthly_volume_usd >= 5000  THEN 25
      ELSE 0
    END;

    IF v_bonus > 0 THEN
      INSERT INTO public.processor_earnings
        (processor_id, month, commission_usd, bonus_usd, type, notes)
      VALUES
        (v_proc.id, v_month, 0, v_bonus, 'monthly_bonus',
         'Monthly volume bonus: $' || v_proc.monthly_volume_usd || ' processed in ' || v_month);

      UPDATE public.processor_profiles
      SET total_earned_usd = total_earned_usd + v_bonus,
          monthly_volume_usd = 0,
          updated_at = NOW()
      WHERE id = v_proc.id;

      v_count := v_count + 1;
      v_total := v_total + v_bonus;
    END IF;
  END LOOP;

  RETURN json_build_object(
    'month',           v_month,
    'processors_paid', v_count,
    'total_paid_usd',  v_total
  );
END;
$$;

-- ============================================================
-- Set assigned_at when order is first assigned to a processor
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_order_assigned_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.processor_id IS NOT NULL AND OLD.processor_id IS NULL THEN
    NEW.assigned_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_assigned_at ON public.p2p_orders;
CREATE TRIGGER trg_set_assigned_at
  BEFORE UPDATE OF processor_id ON public.p2p_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_order_assigned_at();
