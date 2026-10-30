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
    const { project_id, updates, action } = await req.json()
    if (!project_id) return json(req, { error: 'project_id required' }, 400)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data, error } = await supabase
      .from('kyc_projects')
      .update(updates)
      .eq('id', project_id)
      .select()
      .single()

    if (error) return json(req, { error: error.message }, 500)

    await supabase.from('kyc_admin_audit').insert({
      admin_email: admin.email,
      action: action || 'project_updated',
      resource_type: 'kyc_project',
      resource_id: project_id,
      details: updates,
    })

    return json(req, { success: true, project: data })
  } catch (err) {
    return json(req, { error: 'Server error' }, 500)
  }
})
