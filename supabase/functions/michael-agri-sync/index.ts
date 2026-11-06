// michael-agri-sync: keeps MICHAEL's field registry in step with IFB and refreshes risk.
//
// Callers:
//   - the schedule (every 15 min) with the service-role key  -> body {"mode":"all"}
//   - a partner owner/admin or an IFB admin ("Sync now")       -> body {"partner_id":"<uuid>"}
// Per partner:
//   1. remove deleted / paused fields from MICHAEL (DELETE, 404 = already gone)
//   2. register new or changed fields (PUT, max 500 per call) -> active | rejected (+ reason)
//   3. refresh the latest risk of all monitored fields (GET /risk?partner_code=…&level_min=low)
// Contract: docs/integrations/michael-agri-contract.md
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, errorResponse, getAuthedUser, HttpError, jsonResponse, timingSafeEqualStr } from '../_shared/auth.ts';
import { michaelFetch, normaliseRisk } from '../_shared/michael.ts';

const BATCH = 500;
const MAX_PER_RUN = 2500;   // Year-2 target size; larger backlogs continue on the next run
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// deno-lint-ignore no-explicit-any
type Admin = SupabaseClient<any, 'public', any>;

async function authorise(req: Request, admin: Admin, partnerId: string | null): Promise<'service' | 'user'> {
  const bearer = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (bearer && service && timingSafeEqualStr(bearer, service)) return 'service';
  const user = await getAuthedUser(req);
  if (!partnerId) throw new HttpError(400, 'partner_id is required');
  const [{ data: m }, { data: p }] = await Promise.all([
    admin.from('partner_members').select('role').eq('partner_id', partnerId).eq('user_id', user.id).maybeSingle(),
    admin.from('profiles').select('role').eq('id', user.id).maybeSingle(),
  ]);
  const ifbAdmin = ['admin', 'admin_l3', 'superadmin'].includes((p as any)?.role);
  if (!ifbAdmin && !['owner', 'admin'].includes((m as any)?.role)) throw new HttpError(403, 'Only partner owners/admins can sync');
  return 'user';
}

async function syncPartner(admin: Admin, partner: { id: string; code: string; country: string }) {
  const out = { partner: partner.code, removed: 0, registered: 0, rejected: 0, risk_updated: 0, errors: [] as string[] };

  // 1. removals
  const { data: removals } = await admin.from('michael_field_removals').select('field_id')
    .eq('partner_id', partner.id).is('synced_at', null).limit(MAX_PER_RUN);
  for (const r of removals ?? []) {
    const { status } = await michaelFetch(`/api/v1/agri/fields/${r.field_id}`, { method: 'DELETE' });
    if (status < 300 || status === 404) {
      await admin.from('michael_field_removals').update({ synced_at: new Date().toISOString() }).eq('field_id', r.field_id);
      await admin.from('field_risk').delete().eq('field_id', r.field_id);
      out.removed++;
    } else out.errors.push(`delete ${r.field_id}: HTTP ${status}`);
  }

  // 2. registrations: pending fields, and active fields whose boundary changed (synced_at reset)
  const { data: fields } = await admin.from('fields')
    .select('id, crop, planting_date, boundary_geojson, monitoring_status, michael_synced_at')
    .eq('partner_id', partner.id)
    .or('monitoring_status.eq.pending,and(monitoring_status.eq.active,michael_synced_at.is.null)')
    .order('created_at').limit(MAX_PER_RUN);
  for (let i = 0; i < (fields?.length ?? 0); i += BATCH) {
    const batch = fields!.slice(i, i + BATCH);
    const items = batch.map((f: any) => ({
      external_id: f.id, partner_code: partner.code, country: partner.country,
      crop: f.crop ?? null, planting_date: f.planting_date ?? null, boundary: f.boundary_geojson,
    }));
    const { status, body } = await michaelFetch('/api/v1/agri/fields', { method: 'PUT', body: JSON.stringify({ fields: items }) }, 60000);
    if (status >= 300) { out.errors.push(`register batch: HTTP ${status}`); continue; }
    const results: any[] = Array.isArray(body) ? body : (body?.results ?? body?.fields ?? []);
    const byId = new Map(results.filter((r) => typeof r?.external_id === 'string').map((r) => [r.external_id.toLowerCase(), r]));
    const now = new Date().toISOString();
    for (const f of batch as any[]) {
      const r = byId.get(f.id);
      if (!r) { out.errors.push(`no result for ${f.id}`); continue; }
      if (r.status === 'created' || r.status === 'updated') {
        await admin.from('fields').update({ monitoring_status: 'active', monitoring_note: null, michael_synced_at: now }).eq('id', f.id);
        out.registered++;
      } else if (r.status === 'rejected') {
        await admin.from('fields').update({ monitoring_status: 'rejected', monitoring_note: String(r.reason ?? 'Rejected by MICHAEL').slice(0, 300), michael_synced_at: now }).eq('id', f.id);
        out.rejected++;
      }
    }
  }

  // 3. risk refresh
  const { status, body } = await michaelFetch(`/api/v1/agri/risk?partner_code=${encodeURIComponent(partner.code)}&level_min=low`, {}, 60000);
  if (status >= 300) { out.errors.push(`risk: HTTP ${status}`); return out; }
  const rows: any[] = Array.isArray(body) ? body : (body?.fields ?? body?.results ?? []);
  const { data: active } = await admin.from('fields').select('id').eq('partner_id', partner.id).eq('monitoring_status', 'active');
  const activeIds = new Set((active ?? []).map((a: any) => a.id));
  const upserts = rows
    .filter((r) => typeof r?.external_id === 'string' && UUID.test(r.external_id) && activeIds.has(r.external_id.toLowerCase()))
    .map((r) => ({ field_id: r.external_id.toLowerCase(), partner_id: partner.id, ...normaliseRisk(r), fetched_at: new Date().toISOString() }));
  for (let i = 0; i < upserts.length; i += 500) {
    const { error } = await admin.from('field_risk').upsert(upserts.slice(i, i + 500), { onConflict: 'field_id' });
    if (error) out.errors.push(`risk upsert: ${error.message}`); else out.risk_updated += Math.min(500, upserts.length - i);
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'POST only');
    const body = await req.json().catch(() => ({}));
    const partnerId = typeof body?.partner_id === 'string' && UUID.test(body.partner_id) ? body.partner_id : null;
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    const caller = await authorise(req, admin, partnerId);

    let q = admin.from('partners').select('id, code, country').eq('status', 'active');
    if (partnerId) q = q.eq('id', partnerId);
    else if (caller !== 'service') throw new HttpError(400, 'partner_id is required');
    const { data: partners, error } = await q;
    if (error) throw new Error(error.message);

    const results = [];
    for (const p of partners ?? []) {
      try { results.push(await syncPartner(admin, p as any)); }
      catch (e) { results.push({ partner: (p as any).code, errors: [e instanceof Error ? e.message : String(e)] }); }
    }
    return jsonResponse(req, { ok: true, results });
  } catch (err) {
    return errorResponse(req, err);
  }
});
