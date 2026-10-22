-- =============================================================================
-- CRON JOB: call capital-universe-sync Edge Function daily at 03:00 UTC
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- The cron schedule: every day at 03:00 UTC
SELECT cron.schedule(
  'capital-universe-daily-sync',
  '0 3 * * *',
  $$
  SELECT
    net.http_post(
      url     := 'https://nfztdpyygfrpbjbhidxe.supabase.co/functions/v1/capital-universe-sync',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
      ),
      body    := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Also schedule a faster refresh for equities only at 09:00 UTC (market open window)
SELECT cron.schedule(
  'capital-universe-equity-refresh',
  '0 9 * * 1-5',
  $$
  SELECT
    net.http_post(
      url     := 'https://nfztdpyygfrpbjbhidxe.supabase.co/functions/v1/capital-universe-sync',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
      ),
      body    := '{"scope":"equities"}'::jsonb
    ) AS request_id;
  $$
);

-- Verify cron jobs registered
-- SELECT jobid, jobname, schedule, active FROM cron.job ORDER BY jobid;
