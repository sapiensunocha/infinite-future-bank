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
    const { project_id, doc_type, file_name, file_size } = await req.json()
    if (!project_id || !doc_type || !file_name) return json(req, { error: 'Missing required fields' }, 400)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const ext = file_name.split('.').pop()
    const storagePath = `kyc/${project_id}/${doc_type}/${Date.now()}.${ext}`

    const { data: uploadData, error } = await supabase.storage
      .from('kyc-documents')
      .createSignedUploadUrl(storagePath)

    if (error) return json(req, { error: error.message }, 500)

    // Pre-record the document entry (will be confirmed after upload)
    const { data: docRecord } = await supabase
      .from('kyc_project_documents')
      .insert({
        project_id,
        doc_type,
        file_url: `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/kyc-documents/${storagePath}`,
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

    return json(req, {
      success: true,
      signed_url: uploadData.signedUrl,
      path: storagePath,
      doc_id: docRecord?.id,
    })
  } catch (err) {
    return json(req, { error: 'Server error' }, 500)
  }
})
