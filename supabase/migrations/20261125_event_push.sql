-- ============================================================================
-- 20261125 — Push notification for every event, not only transactions
--
-- Every row added to `notifications` (payment requests, payout updates, support
-- replies, verification results, …) is queued as a push for its owner, if they
-- have push switched on and a registered device. The `transaction-alerts` edge
-- function sends the queue (same function and schedule as transaction alerts).
--
-- 'payment_received' is skipped: the transaction alert already covers money in.
-- The trigger can never fail the insert it rides on.
-- Requires 20261122.
-- ============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.push_outbox (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL,
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  tag          TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_at   TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  status       TEXT
);
CREATE INDEX IF NOT EXISTS push_outbox_pending_idx ON public.push_outbox (created_at) WHERE processed_at IS NULL;
ALTER TABLE public.push_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_outbox FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.push_outbox TO service_role;

CREATE OR REPLACE FUNCTION public._queue_event_push()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
BEGIN
  BEGIN
    IF NEW.user_id IS NULL OR COALESCE(NEW.message, '') = '' OR NEW.type = 'payment_received' THEN
      RETURN NEW;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = NEW.user_id AND p.pref_notif_tx_push
         AND EXISTS (SELECT 1 FROM public.push_subscriptions s WHERE s.user_id = p.id)
    ) THEN
      RETURN NEW;
    END IF;
    v_title := CASE
      WHEN NEW.type = 'payment_request'            THEN 'Payment request'
      WHEN NEW.type = 'payment_sent'               THEN 'Payment update'
      WHEN NEW.type = 'payment_failed'             THEN 'Payment failed'
      WHEN NEW.type LIKE 'support%'                THEN 'Support replied'
      WHEN NEW.type LIKE 'kyc%'                    THEN 'Verification update'
      WHEN NEW.type LIKE '%security%'              THEN 'Security alert'
      ELSE 'Infinite Future Bank'
    END;
    INSERT INTO public.push_outbox (user_id, title, body, tag)
    VALUES (NEW.user_id, v_title, left(regexp_replace(NEW.message, '\s+', ' ', 'g'), 160), 'n-' || NEW.id::text);
    PERFORM net.http_post(
      url     := 'https://nfztdpyygfrpbjbhidxe.supabase.co/functions/v1/transaction-alerts',
      body    := '{}'::jsonb,
      headers := '{"Content-Type":"application/json"}'::jsonb
    );
  EXCEPTION WHEN OTHERS THEN
    NULL; -- best-effort; never block the notification itself
  END;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public._queue_event_push() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS notifications_queue_push ON public.notifications;
CREATE TRIGGER notifications_queue_push AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public._queue_event_push();

CREATE OR REPLACE FUNCTION public.claim_push_outbox(p_limit INT DEFAULT 25)
RETURNS SETOF public.push_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public._is_trusted_backend() THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  UPDATE public.push_outbox o
     SET claimed_at = now()
   WHERE o.id IN (
     SELECT id FROM public.push_outbox
      WHERE processed_at IS NULL
        AND (claimed_at IS NULL OR claimed_at < now() - interval '5 minutes')
        AND created_at > now() - interval '1 day'
      ORDER BY created_at
      LIMIT LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100)
      FOR UPDATE SKIP LOCKED
   )
  RETURNING o.*;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_push_outbox(INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_push_outbox(INT) TO service_role;

COMMIT;

-- The 5-minute sweep also fires when event pushes are waiting.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'transaction-alerts-sweep';
    PERFORM cron.schedule(
      'transaction-alerts-sweep', '*/5 * * * *',
      $job$SELECT net.http_post(url := 'https://nfztdpyygfrpbjbhidxe.supabase.co/functions/v1/transaction-alerts', body := '{}'::jsonb, headers := '{"Content-Type":"application/json"}'::jsonb)
           WHERE EXISTS (SELECT 1 FROM public.transaction_alerts WHERE processed_at IS NULL AND created_at > now() - interval '1 day')
              OR EXISTS (SELECT 1 FROM public.push_outbox WHERE processed_at IS NULL AND created_at > now() - interval '1 day')$job$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'transaction-alerts-sweep not rescheduled: %', SQLERRM;
END;
$$;
