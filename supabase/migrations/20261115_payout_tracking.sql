-- ============================================================================
-- 20261115 — let automated payouts be tracked and refunded
--
-- flutterwave-transfer and bank-payout record each payout in p2p_orders with
-- status 'flw_processing' and the Flutterwave reference in `metadata`, and
-- flutterwave-webhook finds the order by metadata->>'flw_reference' to mark it
-- completed or to refund it. In production p2p_orders had no `metadata` column
-- and its status rule did not allow 'flw_processing' / 'failed', so those
-- inserts failed silently and a failed payout could never be matched and
-- refunded. Additive only; existing rows and agent (P2P) orders are unchanged.
-- ============================================================================

BEGIN;

ALTER TABLE public.p2p_orders ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.p2p_orders DROP CONSTRAINT IF EXISTS p2p_orders_status_check;
ALTER TABLE public.p2p_orders ADD CONSTRAINT p2p_orders_status_check CHECK (status = ANY (ARRAY[
  'open', 'locked_in_escrow', 'proof_uploaded', 'completed', 'disputed', 'cancelled',
  'flw_processing', 'failed'
]));

-- The webhook looks payouts up by our reference.
CREATE UNIQUE INDEX IF NOT EXISTS p2p_orders_flw_reference_uniq
  ON public.p2p_orders ((metadata->>'flw_reference'))
  WHERE metadata ? 'flw_reference';

COMMIT;
