// Outbound notifications for partner/farmer alerts. Each sender returns a short status
// ('sent' | 'skipped:<why>' | 'failed:<code>') that is stored with the alert, so the team can
// see exactly who was told. Secrets come from the environment only; nothing is logged in full.
//
// SMS:      TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + (TWILIO_MESSAGING_SERVICE_SID or TWILIO_SMS_FROM)
// WhatsApp: TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_WA_FROM (e.g. "whatsapp:+14155238886")
// Email:    RESEND_API_KEY (+ optional ALERTS_EMAIL_FROM)

const E164 = /^\+[1-9][0-9]{7,14}$/;

async function twilio(to: string, from: { From?: string; MessagingServiceSid?: string }, body: string): Promise<string> {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID'); const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  if (!sid || !token) return 'skipped:twilio_not_configured';
  const form = new URLSearchParams({ To: to, Body: body, ...(from as Record<string, string>) });
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + btoa(`${sid}:${token}`), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    if (res.ok) return 'sent';
    const j = await res.json().catch(() => ({}));
    return `failed:${(j as any)?.code ?? res.status}`;
  } catch {
    return 'failed:network';
  }
}

export async function sendSms(phone: string | null | undefined, body: string): Promise<string> {
  if (!phone || !E164.test(phone)) return 'skipped:no_valid_phone';
  const mss = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID'); const from = Deno.env.get('TWILIO_SMS_FROM');
  if (mss) return twilio(phone, { MessagingServiceSid: mss }, body);
  if (from) return twilio(phone, { From: from }, body);
  return 'skipped:sms_sender_not_configured';
}

export async function sendWhatsApp(phone: string | null | undefined, body: string): Promise<string> {
  if (!phone || !E164.test(phone)) return 'skipped:no_valid_phone';
  const from = Deno.env.get('TWILIO_WA_FROM');
  if (!from) return 'skipped:whatsapp_not_configured';
  return twilio(`whatsapp:${phone}`, { From: from.startsWith('whatsapp:') ? from : `whatsapp:${from}` }, body);
}

/** SMS first (works on any phone); WhatsApp as a fallback when SMS isn't configured. */
export async function sendFarmerMessage(phone: string | null | undefined, body: string): Promise<{ channel: string; status: string }> {
  const sms = await sendSms(phone, body);
  if (sms === 'sent' || !sms.startsWith('skipped:sms_sender')) return { channel: 'sms', status: sms };
  return { channel: 'whatsapp', status: await sendWhatsApp(phone, body) };
}

export async function sendEmail(to: string[], subject: string, html: string): Promise<string> {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) return 'skipped:email_not_configured';
  const list = to.filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)).slice(0, 20);
  if (!list.length) return 'skipped:no_recipients';
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: Deno.env.get('ALERTS_EMAIL_FROM') ?? 'IFB MICHAEL Alerts <noreply@infinitefuturebank.org>',
        to: list, subject: subject.slice(0, 200), html,
      }),
    });
    return res.ok ? 'sent' : `failed:${res.status}`;
  } catch {
    return 'failed:network';
  }
}

export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
