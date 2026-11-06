// partner-agri-report: emails each active partner's owners/admins its MICHAEL risk report.
// Annex A1 deliverables: weekly risk reports and quarterly analytical summaries.
// Called by the schedule with the service-role key: {"period":"week"} (Mondays) or {"period":"quarter"}.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { HAZARD_LABEL } from '../_shared/michael.ts';
import { esc, sendEmail } from '../_shared/notify.ts';
import { timingSafeEqualStr } from '../_shared/auth.ts';

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });

function period(kind: string, now = new Date()) {
  if (kind === 'quarter') {
    const q = Math.floor(now.getUTCMonth() / 3);                         // report the quarter that just ended
    const to = new Date(Date.UTC(now.getUTCFullYear(), q * 3, 1));
    const from = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() - 3, 1));
    return { from, to, label: `Q${((q + 3) % 4) + 1} ${from.getUTCFullYear()} summary` };
  }
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const from = new Date(to.getTime() - 7 * 86400000);
  return { from, to, label: `Weekly risk report ${from.toISOString().slice(0, 10)} – ${to.toISOString().slice(0, 10)}` };
}

function html(partnerName: string, label: string, s: any): string {
  const row = (k: string, v: unknown) => `<tr><td style="padding:6px 12px;color:#475569">${esc(k)}</td><td style="padding:6px 12px;font-weight:600">${esc(v)}</td></tr>`;
  const lv = s.risk_levels ?? {};
  const hz = Object.entries(s.alerts_by_hazard ?? {}).map(([k, v]) => row(HAZARD_LABEL[k]?.en ?? k, v)).join('') || row('No alerts', '');
  const top = (s.top_fields ?? []).map((t: any) => row(`${t.name} (${t.farmer})`, `${t.level} · ${t.score ?? '–'}/100 · ${t.area_ha} ha`)).join('') || row('No fields at high or critical risk', '');
  return `<div style="font-family:Arial,sans-serif;max-width:640px">
    <h2 style="margin:0 0 4px">${esc(partnerName)}: ${esc(label)}</h2>
    <p style="color:#64748b;margin:0 0 16px">MICHAEL agricultural risk monitoring, provided by Infinite Future Bank.</p>
    <h3>Coverage</h3><table>${row('Monitored fields', s.monitored_fields)}${row('Monitored hectares', s.monitored_hectares)}
      ${row('Fields now at low / moderate / high / critical', `${lv.low ?? 0} / ${lv.moderate ?? 0} / ${lv.high ?? 0} / ${lv.critical ?? 0}`)}</table>
    <h3>Alerts in this period</h3><table>${row('Total', s.alerts_total)}${row('Still open', s.alerts_open)}
      ${row('Delivered within 2 hours of detection', s.alerts_within_2h_pct == null ? '–' : `${s.alerts_within_2h_pct}%`)}
      ${row('Farmers notified', s.farmers_notified)}${hz}</table>
    <h3>Fields needing attention</h3><table>${top}</table>
    <p style="color:#64748b">Full details: IFB app → Services → Partner Hub.</p></div>`;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  const bearer = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!bearer || !service || !timingSafeEqualStr(bearer, service)) return json({ error: 'Unauthorized' }, 401);

  const body = await req.json().catch(() => ({}));
  const { from, to, label } = period(body?.period === 'quarter' ? 'quarter' : 'week');
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, service, { auth: { persistSession: false } });
  const { data: partners } = await admin.from('partners').select('id, name').eq('status', 'active');

  const sent = [];
  for (const p of partners ?? []) {
    const { data: summary, error } = await admin.rpc('partner_risk_summary', { p_partner: (p as any).id, p_from: from.toISOString(), p_to: to.toISOString() });
    if (error) { sent.push({ partner: (p as any).name, error: error.message }); continue; }
    const { data: managers } = await admin.from('partner_members').select('user_id').eq('partner_id', (p as any).id).in('role', ['owner', 'admin']);
    const emails: string[] = [];
    for (const m of managers ?? []) { const { data } = await admin.auth.admin.getUserById((m as any).user_id); if (data?.user?.email) emails.push(data.user.email); }
    sent.push({ partner: (p as any).name, status: await sendEmail(emails, `${(p as any).name}: ${label}`, html((p as any).name, label, summary)) });
  }
  return json({ ok: true, period: { from, to }, sent });
});
