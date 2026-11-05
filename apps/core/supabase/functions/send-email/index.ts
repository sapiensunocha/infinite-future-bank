// send-email: authenticated email relay (was an open relay anyone could use to send mail as IFB).
// Allowed: any signed-in user -> their own address or an internal @infinitefuturebank.org address;
// admins and COT processors -> any address (they notify customers).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, errorResponse, getAuthedUser, HttpError, jsonResponse, requireAdmin } from "../_shared/auth.ts";

// Same key and sending domain as the other IFB email functions (send-confirmation-email,
// send-invoice-email, ...). The old fallback sender 'support@yourdomain.com' is not a
// verified Resend domain, so every message was rejected.
const EMAIL_API_KEY = Deno.env.get('RESEND_API_KEY') ?? Deno.env.get('EMAIL_API_KEY');
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') ?? 'Infinite Future Bank <noreply@infinitefuturebank.org>';
const INTERNAL_DOMAIN = '@infinitefuturebank.org';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });

  try {
    const user = await getAuthedUser(req);
    const { to, subject, html } = await req.json();

    const recipients: string[] = (Array.isArray(to) ? to : [to]).map((r: unknown) => String(r ?? '').trim().toLowerCase());
    if (recipients.length === 0 || recipients.length > 5 || recipients.some((r) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r))) {
      throw new HttpError(400, 'Invalid recipient');
    }
    if (typeof subject !== 'string' || !subject || subject.length > 200) throw new HttpError(400, 'Invalid subject');
    if (typeof html !== 'string' || !html || html.length > 100_000) throw new HttpError(400, 'Invalid body');

    const ownEmail = (user.email ?? '').toLowerCase();
    const onlySafeRecipients = recipients.every((r) => r === ownEmail || r.endsWith(INTERNAL_DOMAIN));
    if (!onlySafeRecipients) {
      const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const { data: profile } = await admin.from('profiles').select('is_cot_processor').eq('id', user.id).maybeSingle();
      if (!profile?.is_cot_processor) await requireAdmin(admin, user.id);
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${EMAIL_API_KEY}` },
      body: JSON.stringify({ from: EMAIL_FROM, to: recipients, subject, html }),
    });
    if (!res.ok) {
      // Logged for the operator (Supabase function logs); never returned to the caller.
      console.error('send-email: Resend rejected the message', res.status, (await res.text()).slice(0, 300));
      throw new HttpError(502, 'Email provider rejected the message');
    }
    const data = await res.json();
    return jsonResponse(req, { id: data?.id ?? null });
  } catch (error) {
    return errorResponse(req, error);
  }
});
