-- Auto-expiry for P2P escrow orders locked for >24h with no processor activity
-- Protects users whose AFR stays locked indefinitely if a processor goes offline

CREATE OR REPLACE FUNCTION public.expire_stale_p2p_escrows()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stale_order RECORD;
BEGIN
  FOR stale_order IN
    SELECT id, processor_id, amount_usd, order_type
    FROM public.p2p_orders
    WHERE status = 'locked_in_escrow'
      AND locked_at < NOW() - INTERVAL '24 hours'
  LOOP
    -- Release the locked balance back to the processor
    IF stale_order.processor_id IS NOT NULL AND stale_order.order_type = 'deposit' THEN
      UPDATE public.balances
        SET liquid_usd = liquid_usd + stale_order.amount_usd
      WHERE user_id = stale_order.processor_id;
    END IF;

    -- Return order to open book so another processor can claim it
    UPDATE public.p2p_orders
      SET status      = 'open',
          processor_id = NULL,
          locked_at   = NULL
    WHERE id = stale_order.id;

    -- Notify the processor if one was assigned
    IF stale_order.processor_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, message)
      VALUES (
        stale_order.processor_id,
        'system',
        'An escrow order you held for over 24 hours has been automatically released back to the order book. Your locked balance has been returned.'
      );
    END IF;
  END LOOP;
END;
$$;

-- Grant execution to the service role used by Supabase cron
GRANT EXECUTE ON FUNCTION public.expire_stale_p2p_escrows() TO service_role;

-- Schedule hourly expiry check using pg_cron (extension must be enabled in project)
SELECT cron.schedule(
  'expire-stale-p2p-escrows',
  '0 * * * *',
  $cron$ SELECT public.expire_stale_p2p_escrows(); $cron$
);
