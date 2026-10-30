import { createClient } from "npm:@supabase/supabase-js@2"

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

function generateOtp(): string {
  // Rejection sampling keeps the 6-digit code uniform
  const buf = new Uint32Array(1)
  const limit = Math.floor(0x100000000 / 900000) * 900000
  do { crypto.getRandomValues(buf) } while (buf[0] >= limit)
  return (100000 + (buf[0] % 900000)).toString()
}

const MAX_OTP_REQUESTS = 3   // per email per 15 min
const MAX_OTP_FAILURES = 5   // per email per 15 min

async function recentCount(supabase: ReturnType<typeof getSupabase>, table: string, email: string, extra: Record<string, string> = {}) {
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString()
  const emailCol = table === 'kyc_admin_audit' ? 'admin_email' : 'email'
  let q = supabase.from(table).select('id', { count: 'exact', head: true }).eq(emailCol, email).gte('created_at', since)
  for (const [k, v] of Object.entries(extra)) q = q.eq(k, v)
  const { count } = await q
  return count ?? 0
}

async function recordOtpFailure(supabase: ReturnType<typeof getSupabase>, email: string) {
  await supabase.from('kyc_admin_audit').insert({ admin_email: email, action: 'portal_otp_failed', details: {} })
}

function getSupabase() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
}

async function sendOtpEmail(email: string, code: string, founderName: string) {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#070B14;font-family:'Inter',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#070B14;padding:40px 20px">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#0F1629;border-radius:16px;overflow:hidden;border:1px solid rgba(37,99,235,0.25)">
        <tr>
          <td style="background:linear-gradient(135deg,#0F1629 0%,#111d3a 100%);padding:32px 40px;text-align:center;border-bottom:1px solid rgba(37,99,235,0.2)">
            <div style="font-size:42px;font-weight:900;letter-spacing:-1px">
              <span style="color:#4285F4">D</span><span style="color:#EA4335">E</span><span style="color:#FBBC04">U</span><span style="color:#34A853">S</span>
            </div>
            <p style="margin:8px 0 0;color:#60a5fa;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase">IFB VentureX · Company Portal</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px">
            <h1 style="margin:0 0 8px;color:#ffffff;font-size:22px;font-weight:900">Your verification code</h1>
            <p style="margin:0 0 28px;color:#94a3b8;font-size:14px;line-height:1.6">Hi ${founderName || 'Founder'}, use the code below to access your VentureX application portal. It expires in <strong style="color:#fbbf24">15 minutes</strong>.</p>

            <div style="background:#111827;border:2px solid rgba(37,99,235,0.4);border-radius:14px;padding:28px;text-align:center;margin-bottom:28px">
              <p style="margin:0 0 8px;color:#475569;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em">One-time verification code</p>
              <p style="margin:0;font-size:44px;font-weight:900;letter-spacing:0.25em;color:#ffffff;font-family:monospace">${code}</p>
            </div>

            <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:10px;padding:14px">
              <p style="margin:0;color:#fde68a;font-size:12px;line-height:1.6">If you did not request this code, please ignore this email. Do not share this code with anyone, including IFB staff.</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 40px 28px;border-top:1px solid rgba(100,116,139,0.15)">
            <p style="margin:0;color:#334155;font-size:11px;text-align:center">Infinite Future Bank · VentureX Division · <a href="https://infinitefuturebank.org" style="color:#475569;text-decoration:none">infinitefuturebank.org</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'IFB VentureX <onboarding@resend.dev>',
      to: [email],
      subject: `Your IFB VentureX verification code: ${code}`,
      html,
    }),
  }).catch((err) => console.error('Resend OTP error:', err))
}

async function sendConfirmationEmail(email: string, founderName: string) {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#070B14;font-family:'Inter',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#070B14;padding:40px 20px">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#0F1629;border-radius:16px;overflow:hidden;border:1px solid rgba(37,99,235,0.25)">
        <tr>
          <td style="background:linear-gradient(135deg,#0F1629 0%,#111d3a 100%);padding:32px 40px;text-align:center;border-bottom:1px solid rgba(37,99,235,0.2)">
            <div style="font-size:42px;font-weight:900;letter-spacing:-1px">
              <span style="color:#4285F4">D</span><span style="color:#EA4335">E</span><span style="color:#FBBC04">U</span><span style="color:#34A853">S</span>
            </div>
            <p style="margin:8px 0 0;color:#60a5fa;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase">IFB VentureX · Company Portal</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px">
            <div style="text-align:center;margin-bottom:24px">
              <div style="width:56px;height:56px;background:rgba(16,185,129,0.15);border:2px solid rgba(16,185,129,0.4);border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:24px;line-height:56px">✓</div>
              <h1 style="margin:0 0 8px;color:#ffffff;font-size:22px;font-weight:900">Information updated</h1>
              <p style="margin:0;color:#94a3b8;font-size:14px;line-height:1.6">Hi ${founderName || 'Founder'}, your VentureX application information has been successfully updated.</p>
            </div>
            <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:10px;padding:16px">
              <p style="margin:0;color:#6ee7b7;font-size:13px;line-height:1.6">Your IFB representative has been notified of these changes and will follow up if additional information is needed.</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 40px 28px;border-top:1px solid rgba(100,116,139,0.15)">
            <p style="margin:0;color:#334155;font-size:11px;text-align:center">Infinite Future Bank · VentureX Division · <a href="https://infinitefuturebank.org" style="color:#475569;text-decoration:none">infinitefuturebank.org</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'IFB VentureX <onboarding@resend.dev>',
      to: [email],
      subject: 'Your IFB VentureX application has been updated',
      html,
    }),
  }).catch((err) => console.error('Resend confirm error:', err))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const body = await req.json()
    const { action } = body

    // ── action: request_otp ────────────────────────────────────────────────
    if (action === 'request_otp') {
      const { email } = body
      if (!email) return json({ error: 'Email is required' }, 400)

      const supabase = getSupabase()

      // Look up project by founder email
      const { data: project, error: lookupErr } = await supabase
        .from('kyc_projects')
        .select('id, founder_name, founder_email')
        .eq('founder_email', email.trim().toLowerCase())
        .maybeSingle()

      if (lookupErr) return json({ error: 'Database error' }, 500)
      // Same response whether or not the email exists, so founders' emails can't be enumerated
      if (!project) return json({ sent: true })
      if (await recentCount(supabase, 'kyc_portal_otps', project.founder_email) >= MAX_OTP_REQUESTS) {
        return json({ error: 'Too many requests. Try again in 15 minutes.' }, 429)
      }

      // Generate and store OTP
      const code = generateOtp()
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

      const { error: insertErr } = await supabase
        .from('kyc_portal_otps')
        .insert({ email: email.trim().toLowerCase(), code, expires_at: expiresAt })

      if (insertErr) return json({ error: 'Failed to generate code' }, 500)

      // Send OTP email
      await sendOtpEmail(email.trim().toLowerCase(), code, project.founder_name || '')

      return json({ sent: true })
    }

    // ── action: verify_otp ─────────────────────────────────────────────────
    if (action === 'verify_otp') {
      const { email, code } = body
      if (!email || !code) return json({ error: 'Email and code are required' }, 400)

      const supabase = getSupabase()
      const now = new Date().toISOString()
      if (await recentCount(supabase, 'kyc_admin_audit', email.trim().toLowerCase(), { action: 'portal_otp_failed' }) >= MAX_OTP_FAILURES) {
        return json({ error: 'Too many attempts. Try again in 15 minutes.' }, 429)
      }

      // Find valid OTP
      const { data: otpRow, error: otpErr } = await supabase
        .from('kyc_portal_otps')
        .select('id, code, used, expires_at')
        .eq('email', email.trim().toLowerCase())
        .eq('code', code.trim())
        .eq('used', false)
        .gt('expires_at', now)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (otpErr) return json({ error: 'Database error' }, 500)
      if (!otpRow) {
        await recordOtpFailure(supabase, email.trim().toLowerCase())
        return json({ error: 'Invalid or expired code' }, 401)
      }

      // Mark OTP as used
      await supabase
        .from('kyc_portal_otps')
        .update({ used: true })
        .eq('id', otpRow.id)

      // Fetch full project with payments and documents
      const { data: project, error: projErr } = await supabase
        .from('kyc_projects')
        .select(`
          *,
          kyc_project_payments ( * ),
          kyc_project_documents ( * )
        `)
        .eq('founder_email', email.trim().toLowerCase())
        .maybeSingle()

      if (projErr || !project) return json({ error: 'Project not found' }, 404)

      return json({ project })
    }

    // ── action: submit_update ──────────────────────────────────────────────
    if (action === 'submit_update') {
      const { email, code, updates } = body
      if (!email || !code) return json({ error: 'Email and code are required' }, 400)

      const supabase = getSupabase()
      const now = new Date().toISOString()

      if (await recentCount(supabase, 'kyc_admin_audit', email.trim().toLowerCase(), { action: 'portal_otp_failed' }) >= MAX_OTP_FAILURES) {
        return json({ error: 'Too many attempts. Try again in 15 minutes.' }, 429)
      }

      // Re-verify OTP is still within the 15 min window (code may have been marked used; check within window)
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
      const { data: otpRow, error: otpErr } = await supabase
        .from('kyc_portal_otps')
        .select('id, code, used, expires_at, created_at')
        .eq('email', email.trim().toLowerCase())
        .eq('code', code.trim())
        .gte('created_at', fifteenMinsAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (otpErr) return json({ error: 'Database error' }, 500)
      if (!otpRow) {
        await recordOtpFailure(supabase, email.trim().toLowerCase())
        return json({ error: 'Session expired. Please request a new code.' }, 401)
      }

      // Build safe update object — only allow specific fields
      const allowedFields: Record<string, unknown> = {}
      const allowed = ['founder_name', 'founder_phone', 'founder_country', 'website', 'business_description', 'revenue_model', 'team_size']
      for (const field of allowed) {
        if (updates && updates[field] !== undefined) {
          allowedFields[field] = updates[field]
        }
      }
      allowedFields.last_self_updated_at = now

      if (Object.keys(allowedFields).length === 1) {
        // Only the timestamp — nothing to update
        return json({ error: 'No updatable fields provided' }, 400)
      }

      // Apply updates
      const { data: project, error: updateErr } = await supabase
        .from('kyc_projects')
        .update(allowedFields)
        .eq('founder_email', email.trim().toLowerCase())
        .select(`
          *,
          kyc_project_payments ( * ),
          kyc_project_documents ( * )
        `)
        .maybeSingle()

      if (updateErr) return json({ error: updateErr.message }, 500)
      if (!project) return json({ error: 'Project not found' }, 404)

      // Audit log (builder has no .catch — await the result and ignore errors)
      const { error: auditErr } = await supabase.from('kyc_admin_audit').insert({
        admin_email: email.trim().toLowerCase(),
        action: 'company_self_update',
        resource_type: 'kyc_project',
        resource_id: project.id,
        details: { updated_fields: Object.keys(allowedFields).filter(k => k !== 'last_self_updated_at') },
      })
      if (auditErr) console.error('kyc-company-portal audit insert failed:', auditErr.message)

      // Send confirmation email
      await sendConfirmationEmail(email.trim().toLowerCase(), project.founder_name || '')

      return json({ success: true, project })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (err) {
    console.error('kyc-company-portal error:', err)
    return json({ error: 'Server error' }, 500)
  }
})
