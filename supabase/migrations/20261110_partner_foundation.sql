-- 20261110_partner_foundation.sql
-- Phase 1 of the Greenhouse Ventures agreement (GHV-IFB-2026-001):
-- implementation partners, their teams, farmers (with recorded consent),
-- farms and fields (real map boundaries, validated and measured by PostGIS).
--
-- Access model
--   * A partner's members see and manage only that partner's data (RLS).
--     Roles: owner > admin > field_agent > viewer.
--   * IFB admins (public.is_admin()) see and manage everything.
--   * Logged-out visitors have no access at all.
-- Data minimisation (Art. 10 / DPA): no ID-document numbers are stored here;
-- MICHAEL only ever receives field geometry and IDs, never farmer details.
--
-- Additive only: creates new objects, changes nothing that exists.
-- Forward-only and idempotent.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partners (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code              text NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9]{2,12}$'),
  name              text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 200),
  legal_name        text CHECK (legal_name IS NULL OR char_length(legal_name) <= 300),
  country           text NOT NULL DEFAULT 'CM' CHECK (country ~ '^[A-Z]{2}$'),
  agreement_ref     text CHECK (agreement_ref IS NULL OR char_length(agreement_ref) <= 100),
  status            text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'terminated')),
  revenue_share_bps integer NOT NULL DEFAULT 3000 CHECK (revenue_share_bps BETWEEN 0 AND 10000),
  created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_members (
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('owner', 'admin', 'field_agent', 'viewer')),
  added_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (partner_id, user_id)
);
CREATE INDEX IF NOT EXISTS partner_members_user_idx ON public.partner_members(user_id);

CREATE TABLE IF NOT EXISTS public.farmers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id      uuid NOT NULL REFERENCES public.partners(id) ON DELETE RESTRICT,
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,   -- set if the farmer has their own IFB account
  external_ref    text CHECK (external_ref IS NULL OR char_length(external_ref) <= 64),  -- the partner's own farmer ID
  full_name       text NOT NULL CHECK (char_length(btrim(full_name)) BETWEEN 2 AND 120),
  phone           text CHECK (phone IS NULL OR phone ~ '^\+[1-9][0-9]{7,14}$'),       -- E.164
  gender          text CHECK (gender IS NULL OR gender IN ('female', 'male', 'other', 'undisclosed')),
  birth_year      integer CHECK (birth_year IS NULL OR birth_year BETWEEN 1900 AND 2020),
  region          text CHECK (region IS NULL OR char_length(region) <= 80),
  locality        text CHECK (locality IS NULL OR char_length(locality) <= 120),
  language        text NOT NULL DEFAULT 'fr' CHECK (language IN ('fr', 'en')),
  consent_at      timestamptz NOT NULL,
  consent_version text NOT NULL CHECK (char_length(consent_version) BETWEEN 1 AND 40),
  consent_method  text NOT NULL CHECK (consent_method IN ('app', 'signed_form', 'recorded_verbal')),
  consent_by      uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,   -- who recorded the consent
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'withdrawn')),
  created_by      uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS farmers_partner_phone_uq ON public.farmers(partner_id, phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS farmers_partner_ref_uq   ON public.farmers(partner_id, external_ref) WHERE external_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS farmers_partner_idx ON public.farmers(partner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.farms (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE RESTRICT,
  farmer_id  uuid NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
  name       text NOT NULL DEFAULT 'Main farm' CHECK (char_length(name) BETWEEN 1 AND 120),
  locality   text CHECK (locality IS NULL OR char_length(locality) <= 120),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS farms_farmer_idx ON public.farms(farmer_id);

CREATE TABLE IF NOT EXISTS public.fields (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id        uuid NOT NULL REFERENCES public.partners(id) ON DELETE RESTRICT,
  farm_id           uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  farmer_id         uuid NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
  name              text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  crop              text CHECK (crop IS NULL OR char_length(crop) <= 60),
  planting_date     date,
  boundary_geojson  jsonb NOT NULL,                 -- what clients send/read: a GeoJSON Polygon, [lng, lat]
  boundary          geography(Polygon, 4326),       -- set by trigger; used for measurement and spatial queries
  area_ha           numeric(10, 3),                 -- set by trigger
  centroid_lat      double precision,               -- set by trigger
  centroid_lng      double precision,               -- set by trigger
  monitoring_status text NOT NULL DEFAULT 'pending' CHECK (monitoring_status IN ('pending', 'active', 'paused', 'rejected')),
  monitoring_note   text CHECK (monitoring_note IS NULL OR char_length(monitoring_note) <= 300),
  michael_synced_at timestamptz,
  created_by        uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fields_partner_idx ON public.fields(partner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS fields_farmer_idx  ON public.fields(farmer_id);
CREATE INDEX IF NOT EXISTS fields_boundary_gix ON public.fields USING gist (boundary);

-- Append-only record of who changed partner data (Art. 10, DPA accountability).
CREATE TABLE IF NOT EXISTS public.partner_audit_log (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  partner_id  uuid NOT NULL,
  actor_id    uuid,
  action      text NOT NULL,          -- insert / update / delete / member_add / member_remove / import
  entity      text NOT NULL,          -- farmers / farms / fields / partner_members
  entity_id   text,
  detail      jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS partner_audit_partner_idx ON public.partner_audit_log(partner_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.partner_role(p_partner uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT role FROM public.partner_members WHERE partner_id = p_partner AND user_id = auth.uid();
$$;

-- true when the caller is an IFB admin, or a member of the partner with one of the given roles
CREATE OR REPLACE FUNCTION public.partner_can(p_partner uuid, p_roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT auth.uid() IS NOT NULL AND (
    COALESCE(public.partner_role(p_partner) = ANY (p_roles), false) OR public.is_admin()
  );
$$;

REVOKE ALL ON FUNCTION public.partner_role(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.partner_can(uuid, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.partner_role(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.partner_can(uuid, text[]) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Integrity triggers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;

-- farms inherit the partner of their farmer
CREATE OR REPLACE FUNCTION public._farms_integrity()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  SELECT partner_id INTO NEW.partner_id FROM public.farmers WHERE id = NEW.farmer_id;
  IF NEW.partner_id IS NULL THEN RAISE EXCEPTION 'Unknown farmer'; END IF;
  RETURN NEW;
END; $$;

-- fields: inherit partner/farmer from the farm; validate and measure the boundary
CREATE OR REPLACE FUNCTION public._fields_integrity()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, extensions, pg_temp AS $$
DECLARE
  g    geometry;
  v_ha numeric;
BEGIN
  SELECT partner_id, farmer_id INTO NEW.partner_id, NEW.farmer_id FROM public.farms WHERE id = NEW.farm_id;
  IF NEW.partner_id IS NULL THEN RAISE EXCEPTION 'Unknown farm'; END IF;

  IF TG_OP = 'INSERT' OR NEW.boundary_geojson IS DISTINCT FROM OLD.boundary_geojson THEN
    IF jsonb_typeof(NEW.boundary_geojson) <> 'object' OR NEW.boundary_geojson->>'type' <> 'Polygon' THEN
      RAISE EXCEPTION 'Field boundary must be a GeoJSON Polygon';
    END IF;
    IF jsonb_typeof(NEW.boundary_geojson->'coordinates') <> 'array'
       OR jsonb_typeof(NEW.boundary_geojson->'coordinates'->0) <> 'array'
       OR jsonb_array_length(NEW.boundary_geojson->'coordinates'->0) < 4 THEN
      RAISE EXCEPTION 'Field boundary needs at least 3 corner points';
    END IF;
    IF jsonb_array_length(NEW.boundary_geojson->'coordinates'->0) > 1001 THEN
      RAISE EXCEPTION 'Field boundary has too many points (max 1000)';
    END IF;
    BEGIN
      g := ST_SetSRID(ST_GeomFromGeoJSON(NEW.boundary_geojson::text), 4326);
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Field boundary is not valid GeoJSON';
    END;
    IF NOT ST_IsValid(g) THEN
      RAISE EXCEPTION 'Field boundary crosses itself or is not closed';
    END IF;
    IF ST_XMin(g) < -180 OR ST_XMax(g) > 180 OR ST_YMin(g) < -90 OR ST_YMax(g) > 90 THEN
      RAISE EXCEPTION 'Field boundary coordinates must be [longitude, latitude]';
    END IF;
    v_ha := ST_Area(g::geography) / 10000.0;
    IF v_ha < 0.01 OR v_ha > 500 THEN
      RAISE EXCEPTION 'Field area must be between 0.01 and 500 hectares (got % ha)', round(v_ha, 3);
    END IF;
    NEW.boundary     := g::geography;
    NEW.area_ha      := round(v_ha, 3);
    NEW.centroid_lat := ST_Y(ST_Centroid(g));
    NEW.centroid_lng := ST_X(ST_Centroid(g));
    -- a changed boundary must be re-registered with MICHAEL
    IF TG_OP = 'UPDATE' THEN NEW.michael_synced_at := NULL; END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public._partner_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE j jsonb;
BEGIN
  j := to_jsonb(CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END);
  INSERT INTO public.partner_audit_log(partner_id, actor_id, action, entity, entity_id, detail)
  VALUES ((j->>'partner_id')::uuid, auth.uid(), lower(TG_OP), TG_TABLE_NAME,
          COALESCE(j->>'id', j->>'user_id'),
          CASE WHEN TG_TABLE_NAME = 'partner_members' THEN jsonb_build_object('role', j->>'role') END);
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS partners_touch ON public.partners;
CREATE TRIGGER partners_touch BEFORE UPDATE ON public.partners FOR EACH ROW EXECUTE FUNCTION public._touch_updated_at();
DROP TRIGGER IF EXISTS farmers_touch ON public.farmers;
CREATE TRIGGER farmers_touch BEFORE UPDATE ON public.farmers FOR EACH ROW EXECUTE FUNCTION public._touch_updated_at();
DROP TRIGGER IF EXISTS farms_touch ON public.farms;
CREATE TRIGGER farms_touch BEFORE UPDATE ON public.farms FOR EACH ROW EXECUTE FUNCTION public._touch_updated_at();
DROP TRIGGER IF EXISTS fields_touch ON public.fields;
CREATE TRIGGER fields_touch BEFORE UPDATE ON public.fields FOR EACH ROW EXECUTE FUNCTION public._touch_updated_at();

DROP TRIGGER IF EXISTS farms_integrity ON public.farms;
CREATE TRIGGER farms_integrity BEFORE INSERT OR UPDATE OF farmer_id ON public.farms FOR EACH ROW EXECUTE FUNCTION public._farms_integrity();
DROP TRIGGER IF EXISTS fields_integrity ON public.fields;
CREATE TRIGGER fields_integrity BEFORE INSERT OR UPDATE ON public.fields FOR EACH ROW EXECUTE FUNCTION public._fields_integrity();

DROP TRIGGER IF EXISTS farmers_audit ON public.farmers;
CREATE TRIGGER farmers_audit AFTER INSERT OR UPDATE OR DELETE ON public.farmers FOR EACH ROW EXECUTE FUNCTION public._partner_audit();
DROP TRIGGER IF EXISTS fields_audit ON public.fields;
CREATE TRIGGER fields_audit AFTER INSERT OR UPDATE OR DELETE ON public.fields FOR EACH ROW EXECUTE FUNCTION public._partner_audit();
DROP TRIGGER IF EXISTS members_audit ON public.partner_members;
CREATE TRIGGER members_audit AFTER INSERT OR UPDATE OR DELETE ON public.partner_members FOR EACH ROW EXECUTE FUNCTION public._partner_audit();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
ALTER TABLE public.partners          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farms             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fields            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_audit_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.partners, public.partner_members, public.farmers, public.farms, public.fields, public.partner_audit_log FROM anon;
REVOKE ALL ON public.partners, public.partner_members, public.partner_audit_log FROM authenticated;
GRANT SELECT ON public.partners, public.partner_members, public.partner_audit_log TO authenticated;
REVOKE ALL ON public.farmers, public.farms, public.fields FROM authenticated;
GRANT SELECT, DELETE ON public.farmers, public.farms, public.fields TO authenticated;
-- Clients may write only these columns. Server-owned columns (measured area, centroid,
-- monitoring status, MICHAEL sync time, the link to an IFB account, audit fields) stay
-- out of reach; partner_id/farmer_id on farms/fields are always re-derived by trigger.
GRANT INSERT (partner_id, external_ref, full_name, phone, gender, birth_year, region, locality, language,
              consent_at, consent_version, consent_method) ON public.farmers TO authenticated;
GRANT UPDATE (external_ref, full_name, phone, gender, birth_year, region, locality, language, status) ON public.farmers TO authenticated;
GRANT INSERT (partner_id, farmer_id, name, locality) ON public.farms TO authenticated;
GRANT UPDATE (name, locality) ON public.farms TO authenticated;
GRANT INSERT (partner_id, farm_id, farmer_id, name, crop, planting_date, boundary_geojson) ON public.fields TO authenticated;
GRANT UPDATE (farm_id, name, crop, planting_date, boundary_geojson) ON public.fields TO authenticated;

DO $$
DECLARE ALL_ROLES text := 'ARRAY[''owner'',''admin'',''field_agent'',''viewer'']';
        EDITORS   text := 'ARRAY[''owner'',''admin'',''field_agent'']';
        MANAGERS  text := 'ARRAY[''owner'',''admin'']';
BEGIN
  -- partners / members / audit: members read; writes go through the RPCs below
  DROP POLICY IF EXISTS partners_read ON public.partners;
  EXECUTE format('CREATE POLICY partners_read ON public.partners FOR SELECT TO authenticated USING (public.partner_can(id, %s))', ALL_ROLES);
  DROP POLICY IF EXISTS partner_members_read ON public.partner_members;
  EXECUTE format('CREATE POLICY partner_members_read ON public.partner_members FOR SELECT TO authenticated USING (public.partner_can(partner_id, %s))', ALL_ROLES);
  DROP POLICY IF EXISTS partner_audit_read ON public.partner_audit_log;
  EXECUTE format('CREATE POLICY partner_audit_read ON public.partner_audit_log FOR SELECT TO authenticated USING (public.partner_can(partner_id, %s))', MANAGERS);

  -- farmers / farms / fields
  DROP POLICY IF EXISTS farmers_read ON public.farmers;
  EXECUTE format('CREATE POLICY farmers_read ON public.farmers FOR SELECT TO authenticated USING (public.partner_can(partner_id, %s))', ALL_ROLES);
  DROP POLICY IF EXISTS farmers_insert ON public.farmers;
  EXECUTE format('CREATE POLICY farmers_insert ON public.farmers FOR INSERT TO authenticated WITH CHECK (public.partner_can(partner_id, %s))', EDITORS);
  DROP POLICY IF EXISTS farmers_update ON public.farmers;
  EXECUTE format('CREATE POLICY farmers_update ON public.farmers FOR UPDATE TO authenticated USING (public.partner_can(partner_id, %1$s)) WITH CHECK (public.partner_can(partner_id, %1$s))', EDITORS);
  DROP POLICY IF EXISTS farmers_delete ON public.farmers;
  EXECUTE format('CREATE POLICY farmers_delete ON public.farmers FOR DELETE TO authenticated USING (public.partner_can(partner_id, %s))', MANAGERS);

  DROP POLICY IF EXISTS farms_read ON public.farms;
  EXECUTE format('CREATE POLICY farms_read ON public.farms FOR SELECT TO authenticated USING (public.partner_can(partner_id, %s))', ALL_ROLES);
  DROP POLICY IF EXISTS farms_write ON public.farms;
  EXECUTE format('CREATE POLICY farms_write ON public.farms FOR ALL TO authenticated USING (public.partner_can(partner_id, %1$s)) WITH CHECK (public.partner_can(partner_id, %1$s))', EDITORS);

  DROP POLICY IF EXISTS fields_read ON public.fields;
  EXECUTE format('CREATE POLICY fields_read ON public.fields FOR SELECT TO authenticated USING (public.partner_can(partner_id, %s))', ALL_ROLES);
  DROP POLICY IF EXISTS fields_insert ON public.fields;
  EXECUTE format('CREATE POLICY fields_insert ON public.fields FOR INSERT TO authenticated WITH CHECK (public.partner_can(partner_id, %s))', EDITORS);
  DROP POLICY IF EXISTS fields_update ON public.fields;
  EXECUTE format('CREATE POLICY fields_update ON public.fields FOR UPDATE TO authenticated USING (public.partner_can(partner_id, %1$s)) WITH CHECK (public.partner_can(partner_id, %1$s))', EDITORS);
  DROP POLICY IF EXISTS fields_delete ON public.fields;
  EXECUTE format('CREATE POLICY fields_delete ON public.fields FOR DELETE TO authenticated USING (public.partner_can(partner_id, %s))', MANAGERS);
END;
$$;

-- NOTE: RLS WITH CHECK is evaluated on the final row, after the BEFORE triggers have
-- re-derived partner_id/farmer_id from the farm/farmer, so a client cannot attach a
-- field or farm to a partner it does not belong to.

-- ---------------------------------------------------------------------------
-- RPCs (writes that need privileges the client does not have)
-- ---------------------------------------------------------------------------

-- IFB admin creates a partner and makes an existing IFB user its owner.
CREATE OR REPLACE FUNCTION public.admin_create_partner(
  p_code text, p_name text, p_country text, p_agreement_ref text, p_owner_email text, p_legal_name text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_owner uuid; v_id uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Only IFB admins can create partners' USING ERRCODE = '42501'; END IF;
  SELECT id INTO v_owner FROM auth.users WHERE lower(email) = lower(btrim(p_owner_email)) LIMIT 1;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'No IFB account with that email. Ask the owner to sign up first.'; END IF;
  INSERT INTO public.partners(code, name, legal_name, country, agreement_ref, created_by)
  VALUES (upper(btrim(p_code)), btrim(p_name), NULLIF(btrim(p_legal_name), ''), upper(btrim(p_country)), NULLIF(btrim(p_agreement_ref), ''), auth.uid())
  RETURNING id INTO v_id;
  INSERT INTO public.partner_members(partner_id, user_id, role, added_by) VALUES (v_id, v_owner, 'owner', auth.uid());
  RETURN v_id;
END; $$;

-- Owner/admin adds (or changes the role of) a team member by email.
CREATE OR REPLACE FUNCTION public.partner_set_member(p_partner uuid, p_email text, p_role text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_user uuid; v_my text := public.partner_role(p_partner);
BEGIN
  IF NOT (v_my IN ('owner', 'admin') OR public.is_admin()) THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501'; END IF;
  IF p_role NOT IN ('admin', 'field_agent', 'viewer') AND NOT (p_role = 'owner' AND (v_my = 'owner' OR public.is_admin())) THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;
  SELECT id INTO v_user FROM auth.users WHERE lower(email) = lower(btrim(p_email)) LIMIT 1;
  IF v_user IS NULL THEN RAISE EXCEPTION 'No IFB account with that email. Ask them to sign up first.'; END IF;
  IF v_user = auth.uid() AND NOT public.is_admin() THEN RAISE EXCEPTION 'You cannot change your own role'; END IF;
  INSERT INTO public.partner_members(partner_id, user_id, role, added_by) VALUES (p_partner, v_user, p_role, auth.uid())
  ON CONFLICT (partner_id, user_id) DO UPDATE SET role = EXCLUDED.role, added_by = EXCLUDED.added_by;
END; $$;

CREATE OR REPLACE FUNCTION public.partner_remove_member(p_partner uuid, p_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_my text := public.partner_role(p_partner); v_target text;
BEGIN
  IF NOT (v_my IN ('owner', 'admin') OR public.is_admin()) THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501'; END IF;
  SELECT role INTO v_target FROM public.partner_members WHERE partner_id = p_partner AND user_id = p_user;
  IF v_target = 'owner' AND NOT (v_my = 'owner' OR public.is_admin()) THEN RAISE EXCEPTION 'Only an owner can remove an owner'; END IF;
  IF v_target = 'owner' AND (SELECT count(*) FROM public.partner_members WHERE partner_id = p_partner AND role = 'owner') <= 1 THEN
    RAISE EXCEPTION 'A partner must keep at least one owner';
  END IF;
  DELETE FROM public.partner_members WHERE partner_id = p_partner AND user_id = p_user;
END; $$;

-- Member list with emails (auth.users is not readable by clients).
CREATE OR REPLACE FUNCTION public.partner_list_members(p_partner uuid)
RETURNS TABLE(user_id uuid, email text, full_name text, role text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.partner_can(p_partner, ARRAY['owner', 'admin', 'field_agent', 'viewer']) THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
    SELECT m.user_id, u.email::text, p.full_name, m.role, m.created_at
      FROM public.partner_members m
      JOIN auth.users u ON u.id = m.user_id
      LEFT JOIN public.profiles p ON p.id = m.user_id
     WHERE m.partner_id = p_partner
     ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'field_agent' THEN 2 ELSE 3 END, u.email;
END; $$;

-- Bulk farmer import (CSV upload / partner API). Validates row by row and
-- reports per-row results instead of failing the whole batch.
CREATE OR REPLACE FUNCTION public.partner_import_farmers(
  p_partner uuid, p_rows jsonb, p_consent_method text, p_consent_version text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  r jsonb; i int := 0; ok int := 0; results jsonb := '[]'::jsonb; v_id uuid;
BEGIN
  IF NOT public.partner_can(p_partner, ARRAY['owner', 'admin', 'field_agent']) THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501'; END IF;
  IF jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) > 1000 THEN RAISE EXCEPTION 'Send between 1 and 1000 rows'; END IF;
  IF p_consent_method NOT IN ('signed_form', 'recorded_verbal', 'app') THEN RAISE EXCEPTION 'Invalid consent method'; END IF;
  IF (SELECT status FROM public.partners WHERE id = p_partner) <> 'active' THEN RAISE EXCEPTION 'Partner is not active'; END IF;

  FOR r IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    i := i + 1;
    BEGIN
      INSERT INTO public.farmers(partner_id, external_ref, full_name, phone, gender, birth_year, region, locality, language,
                                 consent_at, consent_version, consent_method, consent_by, created_by)
      VALUES (p_partner,
              NULLIF(btrim(r->>'external_ref'), ''),
              btrim(r->>'full_name'),
              NULLIF(regexp_replace(COALESCE(r->>'phone', ''), '[\s().-]', '', 'g'), ''),
              NULLIF(lower(btrim(r->>'gender')), ''),
              NULLIF(btrim(r->>'birth_year'), '')::int,
              NULLIF(btrim(r->>'region'), ''),
              NULLIF(btrim(r->>'locality'), ''),
              COALESCE(NULLIF(lower(btrim(r->>'language')), ''), 'fr'),
              now(), p_consent_version, p_consent_method, auth.uid(), auth.uid())
      RETURNING id INTO v_id;
      ok := ok + 1;
      results := results || jsonb_build_object('row', i, 'status', 'created', 'id', v_id);
    EXCEPTION
      WHEN unique_violation THEN
        results := results || jsonb_build_object('row', i, 'status', 'duplicate', 'error', 'A farmer with this phone or reference already exists');
      WHEN OTHERS THEN
        results := results || jsonb_build_object('row', i, 'status', 'rejected', 'error', SQLERRM);
    END;
  END LOOP;

  INSERT INTO public.partner_audit_log(partner_id, actor_id, action, entity, detail)
  VALUES (p_partner, auth.uid(), 'import', 'farmers', jsonb_build_object('rows', i, 'created', ok));
  RETURN jsonb_build_object('total', i, 'created', ok, 'results', results);
END; $$;

-- Overview numbers for the partner dashboard / KPI tracking.
CREATE OR REPLACE FUNCTION public.partner_overview(p_partner uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.partner_can(p_partner, ARRAY['owner', 'admin', 'field_agent', 'viewer']) THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501'; END IF;
  RETURN jsonb_build_object(
    'farmers',            (SELECT count(*) FROM public.farmers WHERE partner_id = p_partner AND status = 'active'),
    'farmers_female',     (SELECT count(*) FROM public.farmers WHERE partner_id = p_partner AND status = 'active' AND gender = 'female'),
    'fields',             (SELECT count(*) FROM public.fields  WHERE partner_id = p_partner),
    'hectares',           (SELECT COALESCE(sum(area_ha), 0) FROM public.fields WHERE partner_id = p_partner),
    'monitored_fields',   (SELECT count(*) FROM public.fields  WHERE partner_id = p_partner AND monitoring_status = 'active'),
    'monitored_hectares', (SELECT COALESCE(sum(area_ha), 0) FROM public.fields WHERE partner_id = p_partner AND monitoring_status = 'active'),
    'farmers_last_30d',   (SELECT count(*) FROM public.farmers WHERE partner_id = p_partner AND created_at > now() - interval '30 days')
  );
END; $$;

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.admin_create_partner(text,text,text,text,text,text)',
    'public.partner_set_member(uuid,text,text)',
    'public.partner_remove_member(uuid,uuid)',
    'public.partner_list_members(uuid)',
    'public.partner_import_farmers(uuid,jsonb,text,text)',
    'public.partner_overview(uuid)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f);
  END LOOP;
END;
$$;
