-- 20261111_michael_monitoring.sql
-- Phase 2 of agreement GHV-IFB-2026-001 (Annex A1): MICHAEL field monitoring.
-- Needs 20261110_partner_foundation.sql. Contract: docs/integrations/michael-agri-contract.md
--
--   field_risk         latest MICHAEL risk per field (written by michael-agri-sync)
--   field_alerts       alerts pushed by MICHAEL (written by michael-agri-webhook), with
--                      acknowledgement, resolution and notification results
--   michael_field_removals  queue: fields deleted in IFB that MICHAEL must stop monitoring
--   partner_risk_summary()  numbers for weekly / quarterly reports
--
-- Clients only read (RLS, per partner) and acknowledge alerts through an RPC.
-- All writes from MICHAEL go through server functions using the service role.
-- Additive only. Forward-only and idempotent.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.field_risk (
  field_id    uuid PRIMARY KEY REFERENCES public.fields(id) ON DELETE CASCADE,
  partner_id  uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  score       numeric(5, 1) CHECK (score IS NULL OR score BETWEEN 0 AND 100),
  level       text CHECK (level IS NULL OR level IN ('low', 'moderate', 'high', 'critical')),
  indicators  jsonb NOT NULL DEFAULT '[]'::jsonb,
  observed_at timestamptz,
  fetched_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS field_risk_partner_level_idx ON public.field_risk(partner_id, level);

CREATE TABLE IF NOT EXISTS public.field_alerts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        text NOT NULL UNIQUE,                 -- MICHAEL's id: makes delivery idempotent
  field_id        uuid NOT NULL REFERENCES public.fields(id) ON DELETE CASCADE,
  partner_id      uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  hazard          text NOT NULL CHECK (hazard IN ('crop_stress', 'disease_risk', 'drought', 'flood', 'rainfall_anomaly', 'soil_moisture_anomaly', 'fire', 'storm')),
  severity        text NOT NULL CHECK (severity IN ('low', 'moderate', 'high', 'critical')),
  metric          text,
  value           double precision,
  threshold       double precision,
  message_en      text,
  message_fr      text,
  observed_at     timestamptz,
  detected_at     timestamptz NOT NULL,                 -- when MICHAEL detected the breach
  received_at     timestamptz NOT NULL DEFAULT now(),   -- when IFB received it (SLA: <= 2 h after detected_at)
  status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  acknowledged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at timestamptz,
  resolved_at     timestamptz,
  notified_at     timestamptz,
  notify_result   jsonb
);
CREATE INDEX IF NOT EXISTS field_alerts_partner_idx ON public.field_alerts(partner_id, status, detected_at DESC);
CREATE INDEX IF NOT EXISTS field_alerts_field_idx ON public.field_alerts(field_id, hazard, status);

CREATE TABLE IF NOT EXISTS public.michael_field_removals (
  field_id   uuid PRIMARY KEY,
  partner_id uuid NOT NULL,
  removed_at timestamptz NOT NULL DEFAULT now(),
  synced_at  timestamptz
);

-- A deleted field (or a whole farmer, via cascade) must be removed from MICHAEL.
CREATE OR REPLACE FUNCTION public._queue_michael_removal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF OLD.michael_synced_at IS NOT NULL OR OLD.monitoring_status IN ('active', 'paused') THEN
    INSERT INTO public.michael_field_removals(field_id, partner_id) VALUES (OLD.id, OLD.partner_id)
    ON CONFLICT (field_id) DO UPDATE SET removed_at = now(), synced_at = NULL;
  END IF;
  RETURN OLD;
END; $$;
DROP TRIGGER IF EXISTS fields_queue_michael_removal ON public.fields;
CREATE TRIGGER fields_queue_michael_removal AFTER DELETE ON public.fields FOR EACH ROW EXECUTE FUNCTION public._queue_michael_removal();

-- Pausing/resuming monitoring goes through partner_set_monitoring() below; clients
-- cannot write monitoring_status directly.

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
ALTER TABLE public.field_risk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.michael_field_removals ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.field_risk, public.field_alerts, public.michael_field_removals FROM anon, authenticated;
GRANT SELECT ON public.field_risk, public.field_alerts TO authenticated;
-- michael_field_removals: server only (no grants, no policies)

DROP POLICY IF EXISTS field_risk_read ON public.field_risk;
CREATE POLICY field_risk_read ON public.field_risk FOR SELECT TO authenticated
  USING (public.partner_can(partner_id, ARRAY['owner', 'admin', 'field_agent', 'viewer']));
DROP POLICY IF EXISTS field_alerts_read ON public.field_alerts;
CREATE POLICY field_alerts_read ON public.field_alerts FOR SELECT TO authenticated
  USING (public.partner_can(partner_id, ARRAY['owner', 'admin', 'field_agent', 'viewer']));

-- ---------------------------------------------------------------------------
-- RPCs for partner teams
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.partner_ack_alert(p_alert uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_partner uuid;
BEGIN
  SELECT partner_id INTO v_partner FROM public.field_alerts WHERE id = p_alert;
  IF v_partner IS NULL OR NOT public.partner_can(v_partner, ARRAY['owner', 'admin', 'field_agent']) THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;
  UPDATE public.field_alerts SET status = 'acknowledged', acknowledged_by = auth.uid(), acknowledged_at = now()
   WHERE id = p_alert AND status = 'open';
  INSERT INTO public.partner_audit_log(partner_id, actor_id, action, entity, entity_id)
  VALUES (v_partner, auth.uid(), 'acknowledge', 'field_alerts', p_alert::text);
END; $$;

-- Pause or resume monitoring of a field (owner/admin). Paused fields are removed from
-- MICHAEL on the next sync and re-registered when resumed.
CREATE OR REPLACE FUNCTION public.partner_set_monitoring(p_field uuid, p_paused boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_partner uuid; v_status text;
BEGIN
  SELECT partner_id, monitoring_status INTO v_partner, v_status FROM public.fields WHERE id = p_field;
  IF v_partner IS NULL OR NOT public.partner_can(v_partner, ARRAY['owner', 'admin']) THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;
  IF p_paused THEN
    UPDATE public.fields SET monitoring_status = 'paused' WHERE id = p_field;
    IF v_status = 'active' THEN
      INSERT INTO public.michael_field_removals(field_id, partner_id) VALUES (p_field, v_partner)
      ON CONFLICT (field_id) DO UPDATE SET removed_at = now(), synced_at = NULL;
    END IF;
  ELSE
    UPDATE public.fields SET monitoring_status = 'pending', michael_synced_at = NULL, monitoring_note = NULL WHERE id = p_field;
    DELETE FROM public.michael_field_removals WHERE field_id = p_field;
  END IF;
  INSERT INTO public.partner_audit_log(partner_id, actor_id, action, entity, entity_id, detail)
  VALUES (v_partner, auth.uid(), CASE WHEN p_paused THEN 'pause_monitoring' ELSE 'resume_monitoring' END, 'fields', p_field::text, NULL);
END; $$;

-- Numbers for weekly reports (default: last 7 days) and quarterly summaries.
CREATE OR REPLACE FUNCTION public.partner_risk_summary(p_partner uuid, p_from timestamptz DEFAULT now() - interval '7 days', p_to timestamptz DEFAULT now())
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v jsonb;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.partner_can(p_partner, ARRAY['owner', 'admin', 'field_agent', 'viewer']) THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;
  IF p_to <= p_from OR p_to - p_from > interval '400 days' THEN RAISE EXCEPTION 'Invalid period'; END IF;
  SELECT jsonb_build_object(
    'from', p_from, 'to', p_to,
    'monitored_fields',   (SELECT count(*) FROM public.fields WHERE partner_id = p_partner AND monitoring_status = 'active'),
    'monitored_hectares', (SELECT COALESCE(sum(area_ha), 0) FROM public.fields WHERE partner_id = p_partner AND monitoring_status = 'active'),
    'risk_levels', COALESCE((SELECT jsonb_object_agg(level, n) FROM (
        SELECT r.level, count(*) n FROM public.field_risk r JOIN public.fields f ON f.id = r.field_id
         WHERE r.partner_id = p_partner AND f.monitoring_status = 'active' AND r.level IS NOT NULL GROUP BY r.level) x), '{}'::jsonb),
    'alerts_total', (SELECT count(*) FROM public.field_alerts WHERE partner_id = p_partner AND detected_at >= p_from AND detected_at < p_to),
    'alerts_by_hazard', COALESCE((SELECT jsonb_object_agg(hazard, n) FROM (
        SELECT hazard, count(*) n FROM public.field_alerts WHERE partner_id = p_partner AND detected_at >= p_from AND detected_at < p_to GROUP BY hazard) x), '{}'::jsonb),
    'alerts_by_severity', COALESCE((SELECT jsonb_object_agg(severity, n) FROM (
        SELECT severity, count(*) n FROM public.field_alerts WHERE partner_id = p_partner AND detected_at >= p_from AND detected_at < p_to GROUP BY severity) x), '{}'::jsonb),
    'alerts_open', (SELECT count(*) FROM public.field_alerts WHERE partner_id = p_partner AND status = 'open'),
    -- Annex A1 service target: alerts within 2 hours of detection
    'alerts_within_2h_pct', (SELECT CASE WHEN count(*) = 0 THEN NULL
        ELSE round(100.0 * count(*) FILTER (WHERE received_at - detected_at <= interval '2 hours') / count(*), 1) END
        FROM public.field_alerts WHERE partner_id = p_partner AND detected_at >= p_from AND detected_at < p_to),
    'farmers_notified', (SELECT count(DISTINCT f.farmer_id) FROM public.field_alerts a JOIN public.fields f ON f.id = a.field_id
        WHERE a.partner_id = p_partner AND a.detected_at >= p_from AND a.detected_at < p_to AND (a.notify_result->>'farmer_sms') = 'sent'),
    'top_fields', COALESCE((SELECT jsonb_agg(t) FROM (
        SELECT f.id, f.name, fa.full_name AS farmer, f.area_ha, r.level, r.score
          FROM public.field_risk r JOIN public.fields f ON f.id = r.field_id JOIN public.farmers fa ON fa.id = f.farmer_id
         WHERE r.partner_id = p_partner AND f.monitoring_status = 'active' AND r.level IN ('high', 'critical')
         ORDER BY r.score DESC NULLS LAST LIMIT 10) t), '[]'::jsonb)
  ) INTO v;
  RETURN v;
END; $$;

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.partner_ack_alert(uuid)',
    'public.partner_set_monitoring(uuid,boolean)',
    'public.partner_risk_summary(uuid,timestamptz,timestamptz)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f);
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- Schedules (OFF by default). Enable after the vault secret `ifb_service_role_key`
-- exists (Supabase → Project Settings → Vault). Uses pg_cron + pg_net, already installed.
-- ---------------------------------------------------------------------------
-- SELECT cron.schedule('michael-agri-sync', '*/15 * * * *', $$
--   SELECT net.http_post(
--     url := 'https://nfztdpyygfrpbjbhidxe.supabase.co/functions/v1/michael-agri-sync',
--     headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization',
--       'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'ifb_service_role_key')),
--     body := '{"mode":"all"}');
-- $$);
-- SELECT cron.schedule('partner-weekly-report', '0 6 * * 1', $$   -- Mondays 06:00 UTC (07:00 Cameroon)
--   SELECT net.http_post(
--     url := 'https://nfztdpyygfrpbjbhidxe.supabase.co/functions/v1/partner-agri-report',
--     headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization',
--       'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'ifb_service_role_key')),
--     body := '{"period":"week"}');
-- $$);
