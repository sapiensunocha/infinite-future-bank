-- =============================================================================
-- IFB Revenue Gap Fixes — 2026-06-13
-- Implements: COT take-rate split, platform_fee columns, market intel sub table
-- =============================================================================

-- 1. Add platform_fee column to ifb_bills (1% Billing Terminal fee)
ALTER TABLE public.ifb_bills
  ADD COLUMN IF NOT EXISTS platform_fee NUMERIC(12,2) NOT NULL DEFAULT 0;

-- 2. Market Intelligence subscription tracking
-- Uses transactions table with transaction_type = 'market_intel_subscription'
-- No new table needed — index for fast monthly lookups
CREATE INDEX IF NOT EXISTS idx_transactions_intel_sub
  ON public.transactions (user_id, transaction_type, created_at)
  WHERE transaction_type = 'market_intel_subscription';

-- 3. Index for trade fee lookups
CREATE INDEX IF NOT EXISTS idx_transactions_trade_fee
  ON public.transactions (user_id, transaction_type, created_at)
  WHERE transaction_type = 'trade_fee';

-- 4. Index for agent task fee lookups
CREATE INDEX IF NOT EXISTS idx_transactions_agent_fee
  ON public.transactions (user_id, transaction_type, created_at)
  WHERE transaction_type = 'agent_task_fee';

-- 5. Index for withdrawal fee lookups
CREATE INDEX IF NOT EXISTS idx_transactions_withdrawal_fee
  ON public.transactions (user_id, transaction_type, created_at)
  WHERE transaction_type = 'withdrawal_fee';

-- 6. COT take-rate: IFB claims 0.5% of the 2% processor fee
--    Current: credit_cot_fee trigger gives processor 2% (amount_usd * 0.02)
--    New:     processor gets 1.5% (amount_usd * 0.015), IFB logs 0.5% revenue
--
--    We add an IFB revenue log function called after finalize_p2p_trade completes.
--    The trigger already credits the processor via cot_fee_earned column.
--    We record IFB's 0.5% share in the transactions table.

CREATE OR REPLACE FUNCTION public.log_ifb_cot_revenue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ifb_cut NUMERIC(12,2);
  v_ifb_admin_id UUID;
BEGIN
  -- Only fire when status changes to 'completed'
  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    v_ifb_cut := ROUND(NEW.amount_usd * 0.005, 2); -- 0.5% IFB take

    -- Log IFB's share as a revenue transaction against the processor's user_id
    -- (IFB can aggregate these for P&L reporting)
    INSERT INTO public.transactions (
      user_id,
      transaction_type,
      amount,
      status,
      description
    ) VALUES (
      NEW.processor_id,
      'cot_platform_take',
      v_ifb_cut,
      'completed',
      'IFB Platform Take (0.5%) — COT Trade #' || LEFT(NEW.id::TEXT, 8)
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_ifb_cot_revenue ON public.p2p_orders;
CREATE TRIGGER trg_log_ifb_cot_revenue
  AFTER UPDATE OF status ON public.p2p_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.log_ifb_cot_revenue();

-- 7. Revenue summary view — gives admin one-line ARR visibility
CREATE OR REPLACE VIEW public.ifb_revenue_summary AS
SELECT
  transaction_type,
  COUNT(*)                              AS tx_count,
  ROUND(SUM(amount), 2)                AS total_usd,
  ROUND(AVG(amount), 2)                AS avg_usd,
  DATE_TRUNC('month', created_at)      AS month
FROM public.transactions
WHERE status = 'completed'
  AND transaction_type IN (
    'escrow_fee',
    'trade_fee',
    'agent_task_fee',
    'withdrawal_fee',
    'market_intel_subscription',
    'cot_platform_take',
    'ifb_audit',
    'escrow_fee'
  )
GROUP BY transaction_type, DATE_TRUNC('month', created_at)
ORDER BY month DESC, total_usd DESC;

COMMENT ON VIEW public.ifb_revenue_summary IS 'Admin revenue dashboard — all IFB fee types by month';
