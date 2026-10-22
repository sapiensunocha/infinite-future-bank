-- ============================================================
-- IFB Smart Card: Integrated Insurance & Dynamic Badging
-- Enables "Overdraft Protection" via Clyrix and profile status tracking.
-- ============================================================

-- 1. Card Smart Settings
ALTER TABLE public.balances ADD COLUMN IF NOT EXISTS card_insurance_fallback BOOLEAN DEFAULT TRUE;
ALTER TABLE public.balances ADD COLUMN IF NOT EXISTS card_status TEXT DEFAULT 'ACTIVE';
ALTER TABLE public.balances ADD COLUMN IF NOT EXISTS card_design_tier TEXT DEFAULT 'PLATINUM'; -- PLATINUM, BLACK, SOVEREIGN

-- 2. Dynamic Profile Badges
-- A view to determine user status based on active roles
CREATE OR REPLACE VIEW public.profile_achievements AS
SELECT 
  p.id as user_id,
  EXISTS(SELECT 1 FROM public.venturex_investors WHERE user_id = p.id) as is_investor,
  EXISTS(SELECT 1 FROM public.venturex_companies WHERE user_id = p.id) as is_entrepreneur,
  EXISTS(SELECT 1 FROM public.npo_profiles WHERE id = p.id) as is_npo,
  EXISTS(SELECT 1 FROM public.clyrix_subscriptions WHERE user_id = p.id AND status = 'active') as is_insured,
  (SELECT count(*) FROM public.social_follows WHERE following_id = p.id) as follower_count
FROM public.profiles p;

-- 3. Smart Card Payment Logic (The "Clyrix Overdraft" Engine)
-- This function simulates a card swipe at a partner merchant.
CREATE OR REPLACE FUNCTION public.process_card_payment(
  p_user_id UUID,
  p_merchant_name TEXT,
  p_amount NUMERIC
)
RETURNS JSONB AS $$
DECLARE
  v_balance NUMERIC;
  v_fallback_enabled BOOLEAN;
  v_insured BOOLEAN;
  v_pool_id UUID;
  v_pool_name TEXT;
  v_coverage_left NUMERIC;
  v_shortfall NUMERIC;
BEGIN
  -- 1. Check Primary Balance
  SELECT liquid_usd, card_insurance_fallback INTO v_balance, v_fallback_enabled FROM public.balances WHERE user_id = p_user_id;
  
  IF v_balance >= p_amount THEN
    -- Easy path: Sufficient funds
    UPDATE public.balances SET liquid_usd = liquid_usd - p_amount WHERE user_id = p_user_id;
    INSERT INTO public.transactions (user_id, amount, transaction_type, status, description)
    VALUES (p_user_id, -p_amount, 'card_payment', 'completed', 'Payment to ' || p_merchant_name);
    
    RETURN jsonb_build_object('ok', true, 'method', 'primary_balance', 'amount', p_amount);
  END IF;

  -- 2. Insufficient Funds: Check Clyrix Fallback
  IF NOT v_fallback_enabled THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Insufficient funds and insurance fallback disabled.');
  END IF;

  -- Check if user has active health/asset insurance (most common for partner payments)
  SELECT s.pool_id, cp.name, (s.coverage_amount_limit - COALESCE((SELECT sum(requested_amount) FROM public.clyrix_claims WHERE user_id = p_user_id AND status = 'approved'), 0))
  INTO v_pool_id, v_pool_name, v_coverage_left
  FROM public.clyrix_subscriptions s
  JOIN public.clyrix_pools cp ON s.pool_id = cp.id
  WHERE s.user_id = p_user_id AND s.status = 'active'
  LIMIT 1;

  IF v_pool_id IS NULL OR v_coverage_left < (p_amount - v_balance) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Insufficient funds and no active insurance coverage to cover shortfall.');
  END IF;

  -- 3. Execute Hybrid Payment
  v_shortfall := p_amount - v_balance;
  
  -- Drain remaining primary balance
  UPDATE public.balances SET liquid_usd = 0 WHERE user_id = p_user_id;
  
  -- Create automated insurance claim for the shortfall
  INSERT INTO public.clyrix_claims (user_id, pool_id, title, description, requested_amount, status, ai_validation_score)
  VALUES (p_user_id, v_pool_id, 'Automated Card Coverage', 'Real-time liquidity bridge for payment at ' || p_merchant_name, v_shortfall, 'approved', 100);
  
  -- Deduct from pool liquidity
  UPDATE public.clyrix_pools SET total_liquidity_usd = total_liquidity_usd - v_shortfall WHERE id = v_pool_id;

  -- Log Blockchain Entry
  INSERT INTO public.afr_ledger (user_id, tx_type, afr_amount, usd_equivalent, notes, status)
  VALUES (p_user_id, 'card_payment', 0, p_amount, 'Hybrid Card Payment (Insurance Boost): ' || p_merchant_name, 'confirmed');

  RETURN jsonb_build_object(
    'ok', true, 
    'method', 'hybrid_insurance', 
    'primary_drained', v_balance, 
    'insurance_covered', v_shortfall,
    'pool_utilized', v_pool_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
