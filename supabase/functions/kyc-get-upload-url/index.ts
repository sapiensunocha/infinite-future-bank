import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const { project_id, doc_type, file_name, file_size } = await req.json()
    if (!project_id || !doc_type || !file_name) return json({ error: 'Missing required fields' }, 400)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const ext = file_name.split('.').pop()
    const storagePath = `kyc/${project_id}/${doc_type}/${Date.now()}.${ext}`

    const { data: uploadData, error } = await supabase.storage
      .from('documents')
      .createSignedUploadUrl(storagePath)

    if (error) return json({ error: error.message }, 500)

    // Pre-record the document entry (will be confirmed after upload)
    const { data: docRecord } = await supabase
      .from('kyc_project_documents')
      .insert({
        project_id,
        doc_type,
        file_url: `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/documents/${storagePath}`,
        file_name,
        file_size,
        uploaded_by: admin.email,
      })
      .select()
      .single()

    await supabase.from('kyc_admin_audit').insert({
      admin_email: admin.email,
      action: 'document_uploaded',
      resource_type: 'kyc_project',
      resource_id: project_id,
      details: { doc_type, file_name },
    })

    return json({
      success: true,
      signed_url: uploadData.signedUrl,
      path: storagePath,
      doc_id: docRecord?.id,
    })
  } catch (err) {
    return json({ error: 'Server error' }, 500)
  }
})
