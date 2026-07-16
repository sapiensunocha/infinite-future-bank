import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-kyc-admin-token',
}
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

function verifyAdminToken(token: string | null): { email: string; name: string } | null {
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token))
    if (payload.exp < Date.now()) return null
    return { email: payload.email, name: payload.name }
  } catch { return null }
}

async function sendOnboardingEmail(founderEmail: string, founderName: string, projectId: string, sector: string) {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return

  const portalUrl = 'https://infinitefuturebank.org/en/representative/company-portal'
  const shortId = projectId.slice(0, 8).toUpperCase()

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Welcome to IFB VentureX</title>
</head>
<body style="margin:0;padding:0;background:#070B14;font-family:'Inter',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#070B14;padding:40px 20px">
    <tr><td align="center">
      <table width="100%" style="max-width:580px;background:#0F1629;border-radius:16px;overflow:hidden;border:1px solid rgba(37,99,235,0.25)">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0F1629 0%,#111d3a 100%);padding:36px 40px;text-align:center;border-bottom:1px solid rgba(37,99,235,0.2)">
            <div style="font-size:48px;font-weight:900;letter-spacing:-1px;line-height:1">
              <span style="color:#4285F4">D</span><span style="color:#EA4335">E</span><span style="color:#FBBC04">U</span><span style="color:#34A853">S</span>
            </div>
            <p style="margin:10px 0 0;color:#60a5fa;font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase">Infinite Future Bank · VentureX Division</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px">
            <h1 style="margin:0 0 8px;color:#ffffff;font-size:24px;font-weight:900">Welcome to the pipeline, ${founderName}!</h1>
            <p style="margin:0 0 28px;color:#94a3b8;font-size:15px;line-height:1.6">Your project has been officially registered in the <strong style="color:#60a5fa">IFB VentureX Pipeline</strong>. A dedicated representative will guide you through every step of your journey.</p>

            <!-- Project card -->
            <div style="background:#111827;border:1px solid rgba(37,99,235,0.3);border-radius:12px;padding:24px;margin-bottom:28px">
              <p style="margin:0 0 16px;color:#475569;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em">Your Application Details</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-size:13px;width:140px">Project ID</td>
                  <td style="padding:6px 0;color:#ffffff;font-size:13px;font-weight:700;font-family:monospace">${shortId}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-size:13px">Sector</td>
                  <td style="padding:6px 0;color:#ffffff;font-size:13px;font-weight:600">${sector}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-size:13px">Status</td>
                  <td style="padding:6px 0"><span style="background:rgba(37,99,235,0.2);color:#60a5fa;font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px">Registered</span></td>
                </tr>
              </table>
            </div>

            <!-- What's next -->
            <div style="margin-bottom:28px">
              <p style="margin:0 0 14px;color:#475569;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em">What happens next</p>
              ${[
                ['1', '#2563eb', 'Application Review', 'Our VentureX team will review your profile within 48–72 hours.'],
                ['2', '#7c3aed', 'Representative Contact', 'An IFB representative will be in touch to discuss your project and next steps.'],
                ['3', '#059669', 'Pipeline Activation', 'Once your activation fee is confirmed, your file enters the active pipeline.'],
              ].map(([num, color, title, desc]) => `
              <div style="display:flex;gap:14px;margin-bottom:12px">
                <div style="min-width:28px;height:28px;background:${color}33;border:1px solid ${color}66;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:${color};text-align:center;line-height:28px">${num}</div>
                <div>
                  <p style="margin:4px 0 2px;color:#e2e8f0;font-size:13px;font-weight:700">${title}</p>
                  <p style="margin:0;color:#64748b;font-size:12px;line-height:1.5">${desc}</p>
                </div>
              </div>`).join('')}
            </div>

            <!-- CTA -->
            <div style="text-align:center;margin-bottom:28px">
              <a href="${portalUrl}" style="display:inline-block;background:linear-gradient(135deg,#1d4ed8,#2563eb);color:#ffffff;font-size:14px;font-weight:800;padding:14px 32px;border-radius:10px;text-decoration:none;letter-spacing:0.02em">Track &amp; Update Your Application →</a>
              <p style="margin:10px 0 0;color:#475569;font-size:11px">${portalUrl}</p>
            </div>

            <div style="background:rgba(37,99,235,0.08);border:1px solid rgba(37,99,235,0.15);border-radius:10px;padding:16px">
              <p style="margin:0;color:#93c5fd;font-size:13px;line-height:1.6"><strong>An IFB representative will be in touch shortly.</strong> In the meantime, you can visit the portal above to view your application status and update your information at any time.</p>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px 32px;border-top:1px solid rgba(100,116,139,0.15)">
            <p style="margin:0;color:#334155;font-size:11px;text-align:center">Infinite Future Bank · VentureX Division · <a href="https://infinitefuturebank.org" style="color:#475569;text-decoration:none">infinitefuturebank.org</a></p>
            <p style="margin:6px 0 0;color:#1e293b;font-size:10px;text-align:center">This message was sent because your project was registered by an authorized IFB representative. Do not reply to this email.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'IFB VentureX <onboarding@resend.dev>',
      to: [founderEmail],
      subject: `Welcome to IFB VentureX — Your Application is Registered (ID: ${shortId})`,
      html,
    }),
  }).catch((err) => console.error('Resend error:', err))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const token = req.headers.get('x-kyc-admin-token')
  const admin = verifyAdminToken(token)
  if (!admin) return json({ error: 'Unauthorized' }, 401)

  try {
    const body = await req.json()
    const {
      founder_email, founder_name, founder_phone, founder_country, founder_resume_text,
      project_type, sector, business_description, revenue_model, team_size, stage,
      website, timeline, financing_types, financing_other, funding_amount_needed, funding_currency,
      payment_tier, notes, create_user_account,
    } = body

    if (!founder_email || !founder_name || !project_type || !sector || !business_description || !stage) {
      return json({ error: 'Missing required fields' }, 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    let userId: string | null = null

    if (create_user_account) {
      // Create Supabase auth user and send invite
      const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(founder_email, {
        data: { full_name: founder_name },
        redirectTo: `https://deus.infinitefuturebank.org/auth/callback`,
      })
      if (!authError && authData?.user) {
        userId = authData.user.id
        // Provision profile
        await supabase.from('profiles').upsert({
          id: userId,
          full_name: founder_name,
          kyc_status: 'in_review',
          role: 'client',
          theme_preference: 'system',
        }, { onConflict: 'id', ignoreDuplicates: true })
        await supabase.from('wallets').upsert(
          { user_id: userId, currency: 'USD', balance: 0 },
          { onConflict: 'user_id', ignoreDuplicates: true }
        )
      }
    }

    const { data: project, error: projectError } = await supabase
      .from('kyc_projects')
      .insert({
        founder_email, founder_name, founder_phone, founder_country, founder_resume_text,
        project_type, sector, business_description, revenue_model,
        team_size: team_size ? parseInt(team_size) : null,
        stage, website, timeline,
        financing_types: financing_types || [],
        financing_other, funding_amount_needed, funding_currency: funding_currency || 'USD',
        payment_tier: payment_tier || null,
        status: 'registered',
        registered_by: admin.email,
        notes, user_id: userId,
      })
      .select()
      .single()

    if (projectError) return json({ error: projectError.message }, 500)

    // Audit log
    await supabase.from('kyc_admin_audit').insert({
      admin_email: admin.email,
      action: 'project_registered',
      resource_type: 'kyc_project',
      resource_id: project.id,
      details: { founder_email, founder_name, project_type, sector },
    })

    // Always send branded onboarding email to founder via Resend
    await sendOnboardingEmail(founder_email, founder_name, project.id, sector)

    return json({ success: true, project })
  } catch (err) {
    console.error('kyc-register-project error:', err)
    return json({ error: 'Server error' }, 500)
  }
})
