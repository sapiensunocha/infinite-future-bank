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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: projects, error } = await supabase
      .from('kyc_projects')
      .select(`
        *,
        kyc_project_documents(id, doc_type, file_name, uploaded_at),
        kyc_project_payments(id, amount, currency, tier, payment_method, payment_status, paid_at)
      `)
      .order('created_at', { ascending: false })

    if (error) return json(req, { error: error.message }, 500)

    return json(req, { success: true, projects })
  } catch (err) {
    return json(req, { error: 'Server error' }, 500)
  }
})
