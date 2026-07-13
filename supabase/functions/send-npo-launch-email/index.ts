import { createClient } from 'npm:@supabase/supabase-js@2'

const RESEND_KEY = Deno.env.get('EMAIL_API_KEY') || Deno.env.get('RESEND_API_KEY') || ''
const APP_URL = Deno.env.get('APP_URL') || 'https://deus.infinitefuturebank.org'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function buildEmail(name: string): string {
  const firstName = (name || '').split(' ')[0] || 'there'
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#060912;font-family:'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:620px;margin:0 auto;padding:48px 24px;">

  <div style="text-align:center;margin-bottom:48px;">
    <div style="display:inline-block;background:linear-gradient(135deg,#2563EB,#7C3AED);border-radius:10px;width:40px;height:40px;line-height:40px;color:#fff;font-size:20px;font-weight:900;text-align:center;">D</div>
    <div style="margin-top:10px;color:#fff;font-size:13px;font-weight:900;letter-spacing:0.08em;">INFINITE FUTURE BANK</div>
    <div style="color:#475569;font-size:10px;font-weight:700;letter-spacing:0.25em;text-transform:uppercase;">DEUS Platform</div>
  </div>

  <div style="background:linear-gradient(135deg,#0F172A 0%,#1E1B4B 50%,#0F172A 100%);border:1px solid #1E293B;border-radius:32px;padding:48px 36px;text-align:center;margin-bottom:24px;">
    <div style="display:inline-block;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.3);color:#A5B4FC;font-size:10px;font-weight:900;letter-spacing:0.25em;text-transform:uppercase;padding:6px 16px;border-radius:100px;margin-bottom:24px;">🌍 New Feature Launched</div>
    <h1 style="color:#F8FAFC;font-size:34px;font-weight:900;margin:0 0 16px;line-height:1.15;letter-spacing:-0.02em;">Free Fundraising<br/><span style="color:#60A5FA;">for Every Cause</span></h1>
    <p style="color:#94A3B8;font-size:15px;line-height:1.7;margin:0 0 32px;">Hello ${firstName} — the IFB Global Impact Engine is now the most powerful <strong style="color:#fff;">zero-fee fundraising platform</strong> on the planet. Campaigns, memberships, events, recurring donations — everything, free.</p>
    <a href="${APP_URL}" style="display:inline-block;background:linear-gradient(135deg,#2563EB,#7C3AED);color:#fff;font-size:13px;font-weight:900;letter-spacing:0.1em;text-transform:uppercase;padding:16px 44px;border-radius:14px;text-decoration:none;box-shadow:0 8px 32px rgba(99,102,241,0.4);">Open IFB DEUS &rarr;</a>
  </div>

  <div style="background:#052e16;border:1px solid #14532d;border-radius:18px;padding:20px 24px;margin-bottom:20px;display:flex;align-items:center;gap:16px;">
    <div style="font-size:28px;flex-shrink:0;">✅</div>
    <div><div style="color:#4ADE80;font-size:15px;font-weight:900;margin-bottom:3px;">0% Platform Fees — Forever</div><div style="color:#16A34A;font-size:13px;line-height:1.5;">Every cent your donors give goes directly to your cause. IFB never takes a cut. Unlike Zeffy, GoFundMe, or anyone else.</div></div>
  </div>

  <div style="display:grid;gap:12px;margin-bottom:24px;">
    <div style="background:#0F172A;border:1px solid #1E293B;border-radius:18px;padding:20px;display:flex;gap:14px;">
      <div style="width:42px;height:42px;background:linear-gradient(135deg,#1D4ED8,#3B82F6);border-radius:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:20px;">🎯</div>
      <div><div style="color:#F1F5F9;font-size:14px;font-weight:900;margin-bottom:5px;">Fundraising Campaigns</div><div style="color:#64748B;font-size:13px;line-height:1.6;">Unlimited campaigns with goal bars, deadlines, and featured emergency alerts. Share a link anywhere.</div></div>
    </div>
    <div style="background:#0F172A;border:1px solid #1E293B;border-radius:18px;padding:20px;display:flex;gap:14px;">
      <div style="width:42px;height:42px;background:linear-gradient(135deg,#6D28D9,#8B5CF6);border-radius:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:20px;">🏅</div>
      <div><div style="color:#F1F5F9;font-size:14px;font-weight:900;margin-bottom:5px;">Membership Tiers</div><div style="color:#64748B;font-size:13px;line-height:1.6;">Friend, Supporter, Champion tiers. Donors subscribe monthly or annually — recurring revenue on autopilot.</div></div>
    </div>
    <div style="background:#0F172A;border:1px solid #1E293B;border-radius:18px;padding:20px;display:flex;gap:14px;">
      <div style="width:42px;height:42px;background:linear-gradient(135deg,#B45309,#F59E0B);border-radius:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:20px;">📅</div>
      <div><div style="color:#F1F5F9;font-size:14px;font-weight:900;margin-bottom:5px;">Event Ticketing — Free & Paid</div><div style="color:#64748B;font-size:13px;line-height:1.6;">Virtual, in-person, or hybrid. Automated ticket codes. Attendee management built in.</div></div>
    </div>
    <div style="background:#0F172A;border:1px solid #1E293B;border-radius:18px;padding:20px;display:flex;gap:14px;">
      <div style="width:42px;height:42px;background:linear-gradient(135deg,#065F46,#10B981);border-radius:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:20px;">💳</div>
      <div><div style="color:#F1F5F9;font-size:14px;font-weight:900;margin-bottom:5px;">10 Currencies · Instant Tax Receipts</div><div style="color:#64748B;font-size:13px;line-height:1.6;">USD, EUR, GBP, XOF, NGN, KES, GHS, ZAR, CAD, AUD. Recurring or one-time. Receipt emailed instantly.</div></div>
    </div>
    <div style="background:#0F172A;border:1px solid #1E293B;border-radius:18px;padding:20px;display:flex;gap:14px;">
      <div style="width:42px;height:42px;background:linear-gradient(135deg,#0E7490,#06B6D4);border-radius:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:20px;">🔗</div>
      <div><div style="color:#F1F5F9;font-size:14px;font-weight:900;margin-bottom:5px;">Blockchain Impact Proof</div><div style="color:#64748B;font-size:13px;line-height:1.6;">SHA-256 cryptographic verification on every impact report. Immutable proof donors can verify. No other platform does this.</div></div>
    </div>
  </div>

  <div style="background:#0F172A;border:1px solid #1E293B;border-radius:22px;padding:24px;margin-bottom:24px;">
    <div style="color:#64748B;font-size:10px;font-weight:900;letter-spacing:0.2em;text-transform:uppercase;text-align:center;margin-bottom:18px;">IFB vs. The Rest</div>
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr>
        <th style="text-align:left;color:#475569;font-size:11px;font-weight:700;padding:0 0 10px;border-bottom:1px solid #1E293B;"></th>
        <th style="text-align:center;color:#60A5FA;font-size:11px;font-weight:900;padding:0 0 10px;border-bottom:1px solid #1E293B;">IFB</th>
        <th style="text-align:center;color:#475569;font-size:11px;padding:0 0 10px;border-bottom:1px solid #1E293B;">Zeffy</th>
        <th style="text-align:center;color:#475569;font-size:11px;padding:0 0 10px;border-bottom:1px solid #1E293B;">GoFundMe</th>
      </tr></thead>
      <tbody>
        <tr style="border-bottom:1px solid #0F172A;"><td style="color:#94A3B8;font-size:13px;padding:10px 0;">Platform fee</td><td style="text-align:center;color:#4ADE80;font-size:13px;font-weight:900;padding:10px 0;">0%</td><td style="text-align:center;color:#64748B;font-size:13px;padding:10px 0;">0%</td><td style="text-align:center;color:#EF4444;font-size:13px;padding:10px 0;">5%</td></tr>
        <tr style="border-bottom:1px solid #0F172A;"><td style="color:#94A3B8;font-size:13px;padding:10px 0;">Blockchain impact proof</td><td style="text-align:center;color:#4ADE80;font-size:13px;font-weight:900;padding:10px 0;">✅</td><td style="text-align:center;color:#475569;font-size:13px;padding:10px 0;">❌</td><td style="text-align:center;color:#475569;font-size:13px;padding:10px 0;">❌</td></tr>
        <tr style="border-bottom:1px solid #0F172A;"><td style="color:#94A3B8;font-size:13px;padding:10px 0;">10+ currencies</td><td style="text-align:center;color:#4ADE80;font-size:13px;font-weight:900;padding:10px 0;">✅</td><td style="text-align:center;color:#475569;font-size:13px;padding:10px 0;">❌</td><td style="text-align:center;color:#F59E0B;font-size:13px;padding:10px 0;">Partial</td></tr>
        <tr style="border-bottom:1px solid #0F172A;"><td style="color:#94A3B8;font-size:13px;padding:10px 0;">Memberships</td><td style="text-align:center;color:#4ADE80;font-size:13px;font-weight:900;padding:10px 0;">✅</td><td style="text-align:center;color:#4ADE80;font-size:13px;padding:10px 0;">✅</td><td style="text-align:center;color:#475569;font-size:13px;padding:10px 0;">❌</td></tr>
        <tr><td style="color:#94A3B8;font-size:13px;padding:10px 0;">Monetized social feed</td><td style="text-align:center;color:#4ADE80;font-size:13px;font-weight:900;padding:10px 0;">✅</td><td style="text-align:center;color:#475569;font-size:13px;padding:10px 0;">❌</td><td style="text-align:center;color:#475569;font-size:13px;padding:10px 0;">❌</td></tr>
      </tbody>
    </table>
  </div>

  <div style="background:linear-gradient(135deg,#1E3A8A,#312E81);border-radius:22px;padding:32px;text-align:center;margin-bottom:32px;">
    <div style="color:#A5B4FC;font-size:10px;font-weight:900;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:10px;">Ready to launch?</div>
    <h2 style="color:#F8FAFC;font-size:22px;font-weight:900;margin:0 0 10px;">Your first campaign takes 60 seconds</h2>
    <p style="color:#93C5FD;font-size:13px;margin:0 0 24px;line-height:1.6;">Register your NPO · Create a campaign · Share the link · Receive donations worldwide.</p>
    <a href="${APP_URL}" style="display:inline-block;background:#fff;color:#1E3A8A;font-size:13px;font-weight:900;letter-spacing:0.08em;text-transform:uppercase;padding:14px 44px;border-radius:12px;text-decoration:none;">Go to IFB DEUS &rarr;</a>
  </div>

  <div style="border-top:1px solid #1E293B;padding-top:24px;text-align:center;">
    <div style="color:#334155;font-size:12px;line-height:1.9;"><strong style="color:#475569;">Infinite Future Bank</strong> · Global Impact Engine<br/><a href="mailto:support@infinitefuturebank.org" style="color:#3B82F6;text-decoration:none;">support@infinitefuturebank.org</a></div>
  </div>

</div>
</body>
</html>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Fetch users via auth admin API (service role required)
  const { data: listData, error: listErr } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 })

  if (listErr) {
    // Fallback: send just to the platform admin
    console.error('auth.admin.listUsers failed:', listErr.message)
    const fallbackEmails = [
      { email: 'sapiens@infinitefuturebank.org', full_name: 'Sapiens' },
      { email: 'ngoujeromen@gmail.com', full_name: 'Jérôme' },
    ]
    let sent = 0
    for (const u of fallbackEmails) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'IFB Global Impact <onboarding@resend.dev>', to: [u.email], subject: '🌍 New: Free Fundraising — IFB Global Impact Engine', html: buildEmail(u.full_name) }),
      })
      if (r.ok) sent++
    }
    return new Response(JSON.stringify({ sent, note: 'fallback_to_admins', error: listErr.message }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const confirmed = (listData.users || []).filter(u => u.email && u.email_confirmed_at)

  if (!confirmed.length) {
    return new Response(JSON.stringify({ sent: 0, message: 'No confirmed users' }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  // Resend batch endpoint — 100 per call
  let sent = 0, failed = 0
  for (let i = 0; i < confirmed.length; i += 100) {
    const chunk = confirmed.slice(i, i + 100)
    const payload = chunk.map(u => ({
      from: 'IFB Global Impact <onboarding@resend.dev>',
      to: [u.email!],
      subject: '🌍 New: Free Fundraising for Your Cause — IFB Global Impact Engine',
      html: buildEmail(u.user_metadata?.full_name || u.email?.split('@')[0] || ''),
    }))
    const r = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    r.ok ? (sent += chunk.length) : (failed += chunk.length, console.error(`Resend batch ${r.status}: ${await r.text()}`))
  }

  return new Response(JSON.stringify({ sent, failed, total: confirmed.length }), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
})
