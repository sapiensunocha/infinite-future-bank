-- ============================================================================
-- 20261123 — check processing bank payouts with Flutterwave every 5 minutes
--
-- Flutterwave reports a payout's result by webhook. When that webhook does not
-- arrive, a failed payout stayed "flw_processing" and was never refunded. The
-- payout-sync edge function asks Flutterwave directly and settles each order.
-- The job only fires when there is something to check.
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'payout-sync';
    PERFORM cron.schedule(
      'payout-sync', '*/5 * * * *',
      $job$SELECT net.http_post(url := 'https://nfztdpyygfrpbjbhidxe.supabase.co/functions/v1/payout-sync', body := '{}'::jsonb, headers := '{"Content-Type":"application/json"}'::jsonb)
           WHERE EXISTS (SELECT 1 FROM public.p2p_orders WHERE status = 'flw_processing' AND created_at > now() - interval '7 days')$job$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'payout-sync not scheduled: %', SQLERRM;
END;
$$;
