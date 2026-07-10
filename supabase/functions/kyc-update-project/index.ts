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
    const { project_id, updates, action } = await req.json()
    if (!project_id) return json({ error: 'project_id required' }, 400)

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

    if (error) return json({ error: error.message }, 500)

    await supabase.from('kyc_admin_audit').insert({
      admin_email: admin.email,
      action: action || 'project_updated',
      resource_type: 'kyc_project',
      resource_id: project_id,
      details: updates,
    })

    return json({ success: true, project: data })
  } catch (err) {
    return json({ error: 'Server error' }, 500)
  }
})
