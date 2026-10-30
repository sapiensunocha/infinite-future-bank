import { createClient } from "npm:@supabase/supabase-js@2"
import { corsHeaders, verifyAdminToken } from "../_shared/auth.ts"

const json = (req: Request, data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })

  const token = req.headers.get('x-kyc-admin-token')
  let admin
  try {
    admin = await verifyAdminToken(token)
  } catch {
    return json(req, { error: 'KYC admin auth not configured' }, 500)
  }
  if (!admin) return json(req, { error: 'Unauthorized' }, 401)

  try {
    const { project_id, amount, currency, tier, payment_method, reference, notes, payment_proof_url } = await req.json()
    if (!project_id || !amount || !tier || !payment_method) return json(req, { error: 'Missing required fields' }, 400)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: payment, error: payError } = await supabase
      .from('kyc_project_payments')
      .insert({
        project_id, amount, currency: currency || 'XOF',
        tier, payment_method,
        payment_status: 'completed',
        reference, notes,
        payment_proof_url: payment_proof_url || null,
        paid_at: new Date().toISOString(),
        recorded_by: admin.email,
      })
      .select()
      .single()

    if (payError) return json(req, { error: payError.message }, 500)

    // Activate the project
    await supabase
      .from('kyc_projects')
      .update({ status: 'active', venturex_stage: 'intake' })
      .eq('id', project_id)

    // Fetch project for notification
    const { data: project } = await supabase
      .from('kyc_projects')
      .select('founder_email, founder_name, sector')
      .eq('id', project_id)
      .single()

    if (project) {
      await supabase.functions.invoke('send-email', {
        body: {
          to: project.founder_email,
          subject: 'Payment Confirmed — Your IFB VentureX Account is Now Active',
          html: `
            <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px">
              <h2 style="color:#1e293b;font-weight:900">Payment Confirmed ✓</h2>
              <p style="color:#475569">Dear ${project.founder_name}, your payment of <strong>${currency || 'USD'} ${Number(amount).toLocaleString()}</strong> has been confirmed.</p>
              <p style="color:#475569">Your project is now <strong>Active</strong> and has entered the IFB VentureX Pipeline at the <strong>Intake</strong> stage.</p>
              <p style="color:#475569">Our investment team will contact you shortly to schedule your first evaluation meeting.</p>
              <p style="color:#94a3b8;font-size:12px;margin-top:32px">Infinite Future Bank — IFB VentureX Division</p>
            </div>
          `,
        },
      }).catch(() => {})

      // Notify admin
      await supabase.functions.invoke('send-email', {
        body: {
          to: admin.email,
          subject: `[IFB VentureX] Payment Recorded — ${project.founder_name}`,
          html: `
            <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px">
              <h2 style="color:#1e293b;font-weight:900">Payment Recorded</h2>
              <p>Project <strong>${project.founder_name}</strong> (${project.sector}) has been activated.</p>
              <p>Amount: <strong>${currency || 'USD'} ${Number(amount).toLocaleString()}</strong> via ${payment_method}</p>
              <p>Reference: ${reference || 'N/A'}</p>
              <p>Project ID: ${project_id}</p>
            </div>
          `,
        },
      }).catch(() => {})
    }

    await supabase.from('kyc_admin_audit').insert({
      admin_email: admin.email,
      action: 'payment_recorded',
      resource_type: 'kyc_project',
      resource_id: project_id,
      details: { amount, tier, payment_method, reference },
    })

    return json(req, { success: true, payment })
  } catch (err) {
    return json(req, { error: 'Server error' }, 500)
  }
})
