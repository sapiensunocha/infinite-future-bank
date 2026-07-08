import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

// Module-level client — cached across warm invocations, avoids re-init on every request
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { email, passcode, acceptedTerms } = await req.json()
    if (!email || !passcode) return json({ error: 'Email and passcode required' }, 400)
    if (!acceptedTerms) return json({ error: 'Terms acceptance required' }, 400)

    const { data: rows, error } = await supabase.rpc('validate_kyc_admin', {
      p_email: email.toLowerCase().trim(),
      p_passcode: passcode,
    })

    if (error || !rows?.length) {
      await supabase.from('kyc_admin_audit').insert({
        admin_email: email.toLowerCase(),
        action: 'login_failed',
        details: { reason: 'invalid_credentials' },
      })
      return json({ error: 'Invalid email or passcode' }, 401)
    }

    const admin = rows[0]

    await supabase.from('kyc_admin_audit').insert({
      admin_email: admin.admin_email,
      action: 'login_success',
      details: { name: admin.admin_name },
    })

    const payload = {
      email: admin.admin_email,
      name: admin.admin_name,
      exp: Date.now() + 8 * 60 * 60 * 1000,
    }
    const token = btoa(JSON.stringify(payload))

    return json({ success: true, admin: { email: admin.admin_email, name: admin.admin_name }, token })
  } catch (err) {
    console.error('kyc-admin-auth error:', err)
    return json({ error: 'Server error' }, 500)
  }
})
