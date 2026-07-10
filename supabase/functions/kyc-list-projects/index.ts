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

    if (error) return json({ error: error.message }, 500)

    return json({ success: true, projects })
  } catch (err) {
    return json({ error: 'Server error' }, 500)
  }
})
