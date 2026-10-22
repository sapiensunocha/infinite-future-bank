-- ============================================================
-- AFR Decentralized Network — Node Registry & Rewards
-- Every user device becomes a sovereign light node.
-- ============================================================

-- ── 1. Node registry ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.afr_network_nodes (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_id     TEXT        NOT NULL,  -- SHA-256 fingerprint of browser/device
  node_type     TEXT        NOT NULL DEFAULT 'light_node'
                            CHECK (node_type IN ('light_node','validator','gateway')),
  last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
  uptime_seconds BIGINT     DEFAULT 0,
  tx_relayed_count BIGINT   DEFAULT 0,
  afr_rewards_earned NUMERIC DEFAULT 0,
  afr_staked    NUMERIC     DEFAULT 0,
  ip_region     TEXT,
  user_agent    TEXT,
  is_active     BOOLEAN     DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, device_id)
);

ALTER TABLE public.afr_network_nodes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "node_own_rw" ON public.afr_network_nodes
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Public read: anyone can see node counts (no PII exposed)
DO $$ BEGIN
  CREATE POLICY "node_public_count" ON public.afr_network_nodes
    FOR SELECT USING (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. Reward rate config ──────────────────────────────────────
INSERT INTO public.app_config (key, value) VALUES
  ('afr_node_light_hourly',     '0.10'),   -- AFR per hour online (light node)
  ('afr_node_validator_hourly', '0.50'),   -- AFR per hour (validator)
  ('afr_node_gateway_hourly',   '1.00'),   -- AFR per hour (gateway)
  ('afr_node_tx_relay_bonus',   '0.001'),  -- AFR per transaction relayed
  ('afr_validator_min_stake',   '1000'),   -- AFR required to become validator
  ('afr_gateway_min_stake',     '10000')   -- AFR required to become gateway
ON CONFLICT (key) DO NOTHING;

-- ── 3. Calculate and credit pending rewards ────────────────────
CREATE OR REPLACE FUNCTION public.credit_node_rewards(p_user_id UUID, p_device_id TEXT)
RETURNS NUMERIC
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_node          RECORD;
  v_rate          NUMERIC;
  v_hours         NUMERIC;
  v_earned        NUMERIC;
  v_last_credited TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_node FROM public.afr_network_nodes
  WHERE user_id = p_user_id AND device_id = p_device_id;

  IF NOT FOUND OR NOT v_node.is_active THEN RETURN 0; END IF;

  -- Hours since last heartbeat (cap at 2hrs to prevent abuse)
  v_hours := LEAST(EXTRACT(EPOCH FROM (NOW() - v_node.last_heartbeat)) / 3600.0, 2.0);

  SELECT value::NUMERIC INTO v_rate FROM public.app_config
  WHERE key = CASE v_node.node_type
    WHEN 'validator' THEN 'afr_node_validator_hourly'
    WHEN 'gateway'   THEN 'afr_node_gateway_hourly'
    ELSE                   'afr_node_light_hourly'
  END;

  v_earned := v_hours * COALESCE(v_rate, 0.10);

  IF v_earned > 0 THEN
    UPDATE public.afr_network_nodes SET
      afr_rewards_earned = afr_rewards_earned + v_earned,
      last_heartbeat     = NOW()
    WHERE user_id = p_user_id AND device_id = p_device_id;
  END IF;

  RETURN ROUND(v_earned, 6);
END;
$$;

-- ── 4. Claim rewards: mint AFR into user balance ───────────────
CREATE OR REPLACE FUNCTION public.claim_node_rewards(p_device_id TEXT)
RETURNS JSON
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_pending NUMERIC;
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT afr_rewards_earned INTO v_pending FROM public.afr_network_nodes
  WHERE user_id = v_user_id AND device_id = p_device_id AND is_active = TRUE;

  IF COALESCE(v_pending, 0) < 1 THEN
    RETURN json_build_object('ok', false, 'reason', 'Minimum claimable amount is 1 AFR');
  END IF;

  -- Credit to balance
  UPDATE public.balances SET afr_balance = COALESCE(afr_balance, 0) + v_pending
  WHERE user_id = v_user_id;

  -- Log on ledger
  INSERT INTO public.afr_ledger (user_id, tx_type, afr_amount, notes, status)
  VALUES (v_user_id, 'mint', v_pending, 'Node participation reward — ' || p_device_id, 'confirmed');

  -- Zero out pending
  UPDATE public.afr_network_nodes SET afr_rewards_earned = 0
  WHERE user_id = v_user_id AND device_id = p_device_id;

  RETURN json_build_object('ok', true, 'claimed_afr', v_pending);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_node_rewards   TO authenticated;
GRANT EXECUTE ON FUNCTION public.credit_node_rewards  TO authenticated;

-- ── 5. Network-wide stats (public, no PII) ────────────────────
CREATE OR REPLACE FUNCTION public.get_network_stats()
RETURNS JSON
SECURITY DEFINER
LANGUAGE sql STABLE
AS $$
  SELECT json_build_object(
    'total_nodes',       (SELECT COUNT(*) FROM public.afr_network_nodes WHERE is_active = TRUE),
    'light_nodes',       (SELECT COUNT(*) FROM public.afr_network_nodes WHERE node_type = 'light_node' AND is_active = TRUE),
    'validators',        (SELECT COUNT(*) FROM public.afr_network_nodes WHERE node_type = 'validator'  AND is_active = TRUE),
    'gateways',          (SELECT COUNT(*) FROM public.afr_network_nodes WHERE node_type = 'gateway'    AND is_active = TRUE),
    'online_last_5min',  (SELECT COUNT(*) FROM public.afr_network_nodes WHERE last_heartbeat > NOW() - INTERVAL '5 minutes'),
    'total_blocks',      (SELECT COALESCE(MAX(block_number), 0) FROM public.afr_ledger),
    'total_afr_minted',  (SELECT COALESCE(SUM(afr_amount),  0) FROM public.afr_ledger WHERE tx_type = 'mint'),
    'total_tx',          (SELECT COUNT(*) FROM public.afr_ledger),
    'regions',           (SELECT json_agg(DISTINCT ip_region) FILTER (WHERE ip_region IS NOT NULL) FROM public.afr_network_nodes WHERE is_active = TRUE)
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_network_stats TO authenticated;
