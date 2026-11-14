-- ============================================================================
-- 20261122 — Transaction alerts (email + push), per-user switches
--
-- Every completed row in `transactions` can produce an email and/or a push
-- notification for its owner, if they turned it on in Settings → Notifications.
--
--   transactions (AFTER INSERT) → transaction_alerts (queue)
--        → pg_net pings the `transaction-alerts` edge function, which claims
--          queued rows and sends them. A pg_cron sweep every 5 minutes picks up
--          anything the ping missed.
--
-- The trigger can never fail a money movement: every statement in it is inside
-- an exception handler. The edge function is called with an empty body and no
-- secret; all it does is drain this queue with its own service-role key.
-- ============================================================================
BEGIN;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pref_notif_tx_email BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pref_notif_tx_push  BOOLEAN NOT NULL DEFAULT true;
GRANT SELECT (pref_notif_tx_email, pref_notif_tx_push), UPDATE (pref_notif_tx_email, pref_notif_tx_push)
  ON public.profiles TO authenticated;

CREATE TABLE IF NOT EXISTS public.transaction_alerts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT NOT NULL UNIQUE,
  user_id        UUID NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_at     TIMESTAMPTZ,
  processed_at   TIMESTAMPTZ,
  email_status   TEXT,
  push_status    TEXT
);
CREATE INDEX IF NOT EXISTS transaction_alerts_pending_idx ON public.transaction_alerts (created_at) WHERE processed_at IS NULL;
ALTER TABLE public.transaction_alerts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.transaction_alerts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.transaction_alerts TO service_role;

CREATE OR REPLACE FUNCTION public._queue_transaction_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    IF NEW.user_id IS NULL OR COALESCE(NEW.status, 'completed') <> 'completed' OR COALESCE(NEW.amount, 0) = 0 THEN
      RETURN NEW;
    END IF;
    -- Queue only for users who can actually receive something.
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = NEW.user_id
         AND (p.pref_notif_tx_email
              OR (p.pref_notif_tx_push AND EXISTS (SELECT 1 FROM public.push_subscriptions s WHERE s.user_id = p.id)))
    ) THEN
      RETURN NEW;
    END IF;
    INSERT INTO public.transaction_alerts (transaction_id, user_id)
    VALUES (NEW.id::text, NEW.user_id)
    ON CONFLICT (transaction_id) DO NOTHING;
    PERFORM net.http_post(
      url     := 'https://nfztdpyygfrpbjbhidxe.supabase.co/functions/v1/transaction-alerts',
      body    := '{}'::jsonb,
      headers := '{"Content-Type":"application/json"}'::jsonb
    );
  EXCEPTION WHEN OTHERS THEN
    NULL; -- alerts are best-effort; never block the transaction
  END;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public._queue_transaction_alert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS transactions_queue_alert ON public.transactions;
CREATE TRIGGER transactions_queue_alert AFTER INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public._queue_transaction_alert();

-- The edge function claims a batch; a claim expires after 5 minutes so a crashed run is retried.
CREATE OR REPLACE FUNCTION public.claim_transaction_alerts(p_limit INT DEFAULT 25)
RETURNS SETOF public.transaction_alerts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public._is_trusted_backend() THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  UPDATE public.transaction_alerts a
     SET claimed_at = now()
   WHERE a.id IN (
     SELECT id FROM public.transaction_alerts
      WHERE processed_at IS NULL
        AND (claimed_at IS NULL OR claimed_at < now() - interval '5 minutes')
        AND created_at > now() - interval '1 day'
      ORDER BY created_at
      LIMIT LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100)
      FOR UPDATE SKIP LOCKED
   )
  RETURNING a.*;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_transaction_alerts(INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_transaction_alerts(INT) TO service_role;

COMMIT;

-- Sweep for anything the instant ping missed (outside the transaction: cron may be absent locally).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'transaction-alerts-sweep';
    PERFORM cron.schedule(
      'transaction-alerts-sweep', '*/5 * * * *',
      $job$SELECT net.http_post(url := 'https://nfztdpyygfrpbjbhidxe.supabase.co/functions/v1/transaction-alerts', body := '{}'::jsonb, headers := '{"Content-Type":"application/json"}'::jsonb)
           WHERE EXISTS (SELECT 1 FROM public.transaction_alerts WHERE processed_at IS NULL AND created_at > now() - interval '1 day')$job$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'transaction-alerts-sweep not scheduled: %', SQLERRM;
END;
$$;
