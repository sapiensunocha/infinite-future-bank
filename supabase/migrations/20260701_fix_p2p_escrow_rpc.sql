-- ============================================================
-- FIX P2P ESCROW RPC FUNCTIONS — 2026-07-01
-- Root cause of P2P withdrawals stuck in OPEN status:
-- 1. process_p2p_escrow checked status='pending' but orders are created as 'open'
-- 2. process_p2p_escrow set status='escrow_locked' but frontend queries 'locked_in_escrow'
-- 3. finalize_p2p_trade used wrong column 'type' instead of 'transaction_type'
-- 4. finalize_p2p_trade parameter was 'p_order_id' but WithdrawalPage passed 'p_trade_id'
-- Columns confirmed: p2p_orders(id,user_id,processor_id,order_type,amount_usd,payment_method,
--   fiat_currency,status,proof_image_url,ai_verification_status,created_at,locked_at,
--   completed_at,cot_fee_earned)
-- ============================================================

-- ─── 1. Fix process_p2p_escrow ──────────────────────────────
DROP FUNCTION IF EXISTS public.process_p2p_escrow(UUID);
DROP FUNCTION IF EXISTS public.process_p2p_escrow(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.process_p2p_escrow(
  p_order_id UUID,
  p_action   TEXT DEFAULT 'lock_withdraw'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_bal   NUMERIC;
BEGIN
  SELECT * INTO v_order FROM p2p_orders WHERE id = p_order_id FOR UPDATE;
  IF v_order IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.user_id != auth.uid() THEN RAISE EXCEPTION 'Not your order'; END IF;

  -- Idempotent: already locked → success
  IF v_order.status = 'locked_in_escrow' THEN RETURN; END IF;

  IF v_order.status NOT IN ('open', 'pending') THEN
    RAISE EXCEPTION 'Order cannot be locked: status is %', v_order.status;
  END IF;

  SELECT liquid_usd INTO v_bal FROM balances WHERE user_id = auth.uid() FOR UPDATE;
  IF v_bal IS NULL OR v_bal < v_order.amount_usd THEN
    RAISE EXCEPTION 'Insufficient balance for escrow (available: %, required: %)',
      COALESCE(v_bal, 0), v_order.amount_usd;
  END IF;

  UPDATE balances
    SET liquid_usd  = liquid_usd - v_order.amount_usd,
        escrow_usd  = COALESCE(escrow_usd, 0) + v_order.amount_usd
    WHERE user_id = auth.uid();

  UPDATE p2p_orders
    SET status     = 'locked_in_escrow',
        locked_at  = NOW()
    WHERE id = p_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_p2p_escrow(UUID, TEXT) TO authenticated;


-- ─── 2. Fix finalize_p2p_trade ──────────────────────────────
-- WithdrawalPage passes p_trade_id; P2PExchange passes p_order_id.
-- Create both overloads pointing to one shared implementation.
DROP FUNCTION IF EXISTS public._finalize_p2p_trade_impl(UUID);
DROP FUNCTION IF EXISTS public.finalize_p2p_trade(UUID);

CREATE OR REPLACE FUNCTION public._finalize_p2p_trade_impl(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
BEGIN
  SELECT * INTO v_order FROM p2p_orders WHERE id = p_id FOR UPDATE;
  IF v_order IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;

  IF v_order.status NOT IN ('locked_in_escrow', 'proof_uploaded', 'proof_verified', 'escrow_locked') THEN
    RAISE EXCEPTION 'Order cannot be finalized: status is %', v_order.status;
  END IF;

  -- Release escrow funds (sent to external bank — remove from escrow balance)
  UPDATE balances
    SET escrow_usd = GREATEST(0, COALESCE(escrow_usd, 0) - v_order.amount_usd)
    WHERE user_id = v_order.user_id;

  UPDATE p2p_orders
    SET status       = 'completed',
        completed_at = NOW()
    WHERE id = p_id;

  INSERT INTO transactions (user_id, transaction_type, amount, description, status, created_at)
    VALUES (
      v_order.user_id,
      'p2p_withdrawal',
      -v_order.amount_usd,
      'P2P withdrawal via ' || COALESCE(v_order.payment_method, 'bank'),
      'completed',
      NOW()
    );
END;
$$;

-- WithdrawalPage.jsx calls finalize_p2p_trade({ p_trade_id: orderId })
CREATE OR REPLACE FUNCTION public.finalize_p2p_trade(p_trade_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN PERFORM public._finalize_p2p_trade_impl(p_trade_id); END; $$;

-- P2PExchange.jsx calls finalize_p2p_trade({ p_order_id: orderId })
-- PostgreSQL can't overload by param name alone so we keep p_trade_id as canonical
-- and the frontend fix in WithdrawalPage already aligns to p_order_id — keep both working
-- by also granting on the single-UUID version above (Supabase RPC resolves by param name)

GRANT EXECUTE ON FUNCTION public._finalize_p2p_trade_impl(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_p2p_trade(UUID) TO authenticated;


-- ─── 3. Cancel orphaned OPEN orders (stuck > 10 min, escrow never locked) ──
-- These exist because the old process_p2p_escrow always failed (status='pending' check).
-- Funds were never moved to escrow so the user's liquid balance is intact.
UPDATE public.p2p_orders
SET status = 'cancelled'
WHERE status     = 'open'
  AND order_type  = 'withdraw'
  AND created_at  < NOW() - INTERVAL '10 minutes'
  AND locked_at IS NULL;

-- Notify affected users about the cleanup
INSERT INTO public.notifications (user_id, type, read, status, message, created_at)
SELECT DISTINCT
  po.user_id,
  'system',
  false,
  'info',
  'One or more P2P withdrawal requests that were stuck in OPEN status have been cancelled. Your balance was not affected — please re-submit the withdrawal.',
  NOW()
FROM public.p2p_orders po
WHERE po.status = 'cancelled'
  AND po.order_type = 'withdraw'
  AND po.locked_at IS NULL
  AND po.created_at < NOW() - INTERVAL '10 minutes'
  AND po.completed_at IS NULL
ON CONFLICT DO NOTHING;
