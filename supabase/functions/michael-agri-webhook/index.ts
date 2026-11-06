// michael-agri-webhook: receives MICHAEL field alerts (Annex A1: alerts within 2 hours).
// No user login (MICHAEL is a server): every request must carry a valid
// X-Michael-Signature over "<X-Michael-Timestamp>.<raw body>" and a fresh timestamp.
//
// field.alert           -> stored once (event_id), farmer SMS for high/critical, email to partner managers
// field.alert_resolved  -> stored, and open alerts for the same field + hazard are resolved
// Contract: docs/integrations/michael-agri-contract.md
import { createClient } from 'npm:@supabase/supabase-js@2';
import { farmerSmsText, HAZARD_LABEL, parseAlertEvent, verifyMichaelSignature } from '../_shared/michael.ts';
import { esc, sendEmail, sendFarmerMessage } from '../_shared/notify.ts';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const MAX_BODY = 32 * 1024;

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  const raw = await req.text();
  if (raw.length > MAX_BODY) return json({ error: 'Payload too large' }, 413);

  const why = await verifyMichaelSignature(
    Deno.env.get('MICHAEL_WEBHOOK_SECRET') ?? '',
    req.headers.get('X-Michael-Timestamp'), req.headers.get('X-Michael-Signature'), raw,
  );
  if (why) { console.warn('michael-agri-webhook: rejected,', why); return json({ error: 'Invalid signature' }, 401); }

  let payload: unknown;
  try { payload = JSON.parse(raw); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const { event: ev, error } = parseAlertEvent(payload);
  if (!ev) return json({ error: `Invalid field: ${error}` }, 400);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

  const { data: field } = await admin.from('fields')
    .select('id, name, partner_id, monitoring_status, farmers(full_name, phone, language, status), partners(code, name)')
    .eq('id', ev.external_id).maybeSingle();
  // Unknown or no-longer-monitored field: acknowledge so MICHAEL stops retrying, but store nothing.
  if (!field) return json({ ok: true, ignored: 'unknown field' });
  const f: any = field;
  if (ev.partner_code && f.partners?.code && ev.partner_code !== f.partners.code) return json({ error: 'partner_code mismatch' }, 400);

  const { data: inserted, error: insErr } = await admin.from('field_alerts').insert({
    event_id: ev.event_id, field_id: f.id, partner_id: f.partner_id, hazard: ev.hazard, severity: ev.severity,
    metric: ev.metric ?? null, value: ev.value ?? null, threshold: ev.threshold ?? null,
    message_en: ev.message_en ?? null, message_fr: ev.message_fr ?? null,
    observed_at: ev.observed_at ?? null, detected_at: ev.detected_at,
    status: ev.type === 'field.alert_resolved' ? 'resolved' : 'open',
    resolved_at: ev.type === 'field.alert_resolved' ? new Date().toISOString() : null,
  }).select('id').maybeSingle();
  if (insErr) {
    if ((insErr as any).code === '23505') return json({ ok: true, duplicate: true });   // already delivered
    console.error('michael-agri-webhook: insert failed', insErr.message);
    return json({ error: 'Storage error' }, 500);                                        // MICHAEL retries
  }

  if (ev.type === 'field.alert_resolved') {
    await admin.from('field_alerts').update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('field_id', f.id).eq('hazard', ev.hazard).in('status', ['open', 'acknowledged']).neq('event_id', ev.event_id);
    return json({ ok: true, resolved: true });
  }

  // Notify only for monitored fields; paused fields keep the record without messages.
  const notify: Record<string, string> = {};
  if (f.monitoring_status === 'active') {
    const farmer = f.farmers;
    if (['high', 'critical'].includes(ev.severity) && farmer?.status === 'active') {
      const r = await sendFarmerMessage(farmer.phone, farmerSmsText(farmer.language === 'en' ? 'en' : 'fr', f.name, ev));
      notify.farmer_sms = r.status; notify.farmer_channel = r.channel;
    } else notify.farmer_sms = 'skipped:below_threshold_or_inactive';

    const { data: managers } = await admin.from('partner_members').select('user_id, role').eq('partner_id', f.partner_id).in('role', ['owner', 'admin']);
    const emails: string[] = [];
    for (const m of managers ?? []) {
      const { data } = await admin.auth.admin.getUserById((m as any).user_id);
      if (data?.user?.email) emails.push(data.user.email);
    }
    const h = HAZARD_LABEL[ev.hazard]?.en ?? ev.hazard;
    notify.team_email = await sendEmail(
      emails,
      `[${ev.severity.toUpperCase()}] ${h} alert: ${f.name} (${farmer?.full_name ?? 'farmer'})`,
      `<p><strong>${esc(h)}</strong> alert (${esc(ev.severity)}) on field <strong>${esc(f.name)}</strong>, farmer ${esc(farmer?.full_name)}.</p>
       ${ev.message_en ? `<p>${esc(ev.message_en)}</p>` : ''}
       ${ev.metric ? `<p>${esc(ev.metric)}: ${esc(ev.value)} (threshold ${esc(ev.threshold)})</p>` : ''}
       <p>Detected ${esc(ev.detected_at)}. Farmer message: ${esc(notify.farmer_sms)}.</p>
       <p>Open the IFB app → Services → Partner Hub → Alerts to acknowledge.</p>`,
    );
  } else notify.skipped = `field is ${f.monitoring_status}`;

  await admin.from('field_alerts').update({ notified_at: new Date().toISOString(), notify_result: notify }).eq('id', (inserted as any).id);
  return json({ ok: true, alert_id: (inserted as any).id, notify });
});
