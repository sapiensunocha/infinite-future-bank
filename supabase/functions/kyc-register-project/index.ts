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

    // Send notification email to founder
    if (create_user_account) {
      await supabase.functions.invoke('send-email', {
        body: {
          to: founder_email,
          subject: 'Welcome to IFB VentureX — Your Application is Registered',
          html: `
            <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px">
              <h2 style="color:#1e293b;font-weight:900">Welcome, ${founder_name}!</h2>
              <p style="color:#475569">Your project has been registered in the <strong>IFB VentureX Pipeline</strong>.</p>
              <div style="background:#f1f5f9;border-radius:12px;padding:20px;margin:20px 0">
                <p style="margin:0;color:#64748b;font-size:13px"><strong>Project ID:</strong> ${project.id}</p>
                <p style="margin:8px 0 0;color:#64748b;font-size:13px"><strong>Status:</strong> Registered</p>
                <p style="margin:8px 0 0;color:#64748b;font-size:13px"><strong>Sector:</strong> ${sector}</p>
              </div>
              <p style="color:#475569">Check your email for your account login invitation. Our team will contact you to proceed with the next steps.</p>
              <p style="color:#94a3b8;font-size:12px;margin-top:32px">Infinite Future Bank — IFB VentureX Division</p>
            </div>
          `,
        },
      }).catch(() => {})
    }

    return json({ success: true, project })
  } catch (err) {
    console.error('kyc-register-project error:', err)
    return json({ error: 'Server error' }, 500)
  }
})
