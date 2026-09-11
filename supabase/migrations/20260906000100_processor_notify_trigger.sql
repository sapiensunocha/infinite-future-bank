-- ============================================================
-- Auto-notify processor via edge function on every order assignment
-- pg_net fires HTTP POST to processor-notify edge function
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================
-- Trigger function
-- URL is hardcoded (public). Key is read from vault.
-- One-time setup: in Supabase Dashboard → Vault → New Secret
--   name: ifb_service_role_key   value: <your service_role key>
-- ============================================================
CREATE OR REPLACE FUNCTION public.trigger_notify_processor()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_url TEXT := 'https://nfztdpyygfrpbjbhidxe.supabase.co/functions/v1/processor-notify';
  v_key TEXT;
BEGIN
  -- Only fire when a processor is assigned (insert) or changes (update)
  IF NEW.processor_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.processor_id IS NOT DISTINCT FROM NEW.processor_id THEN
    RETURN NEW;
  END IF;

  -- Read service role key from Supabase Vault
  BEGIN
    SELECT decrypted_secret INTO v_key
    FROM vault.decrypted_secrets
    WHERE name = 'ifb_service_role_key'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_key := NULL;
  END;

  IF v_key IS NULL THEN
    -- Vault secret not set yet — skip silently, order still works
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object('order_id', NEW.id)::text
  );

  RETURN NEW;
END;
$$;

-- ============================================================
-- Attach trigger to p2p_orders
-- ============================================================
DROP TRIGGER IF EXISTS trg_notify_processor ON public.p2p_orders;

CREATE TRIGGER trg_notify_processor
  AFTER INSERT OR UPDATE OF processor_id
  ON public.p2p_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_notify_processor();
