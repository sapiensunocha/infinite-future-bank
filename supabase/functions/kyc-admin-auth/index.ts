import { createClient } from "npm:@supabase/supabase-js@2"
import { corsHeaders, signAdminToken } from "../_shared/auth.ts"

const json = (req: Request, data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } })

// Brute-force protection: max failed logins per email in the window
const MAX_FAILED = 5
const WINDOW_MS = 15 * 60 * 1000

// Module-level client — cached across warm invocations, avoids re-init on every request
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })

  try {
    const { email, passcode, acceptedTerms } = await req.json()
    if (typeof email !== 'string' || typeof passcode !== 'string' || !email || !passcode) {
      return json(req, { error: 'Email and passcode required' }, 400)
    }
    if (!acceptedTerms) return json(req, { error: 'Terms acceptance required' }, 400)

    const normalizedEmail = email.toLowerCase().trim()

    const { count: failedCount, error: countError } = await supabase
      .from('kyc_admin_audit')
      .select('id', { count: 'exact', head: true })
      .eq('admin_email', normalizedEmail)
      .eq('action', 'login_failed')
      .gte('created_at', new Date(Date.now() - WINDOW_MS).toISOString())
    if (countError) {
      console.error('kyc-admin-auth rate-limit check failed:', countError.message)
      return json(req, { error: 'Server error' }, 500)
    }
    if ((failedCount ?? 0) >= MAX_FAILED) {
      return json(req, { error: 'Too many failed attempts. Try again later.' }, 429)
    }

    const { data: rows, error } = await supabase.rpc('validate_kyc_admin', {
      p_email: normalizedEmail,
      p_passcode: passcode,
    })

    if (error || !rows?.length) {
      await supabase.from('kyc_admin_audit').insert({
        admin_email: normalizedEmail,
        action: 'login_failed',
        details: { reason: 'invalid_credentials' },
      })
      return json(req, { error: 'Invalid email or passcode' }, 401)
    }

    const admin = rows[0]

    await supabase.from('kyc_admin_audit').insert({
      admin_email: admin.admin_email,
      action: 'login_success',
      details: { name: admin.admin_name },
    })

    const token = await signAdminToken({
      email: admin.admin_email,
      name: admin.admin_name,
      exp: Date.now() + 8 * 60 * 60 * 1000,
    })

    return json(req, { success: true, admin: { email: admin.admin_email, name: admin.admin_name }, token })
  } catch (err) {
    console.error('kyc-admin-auth error:', err instanceof Error ? err.message : err)
    return json(req, { error: 'Server error' }, 500)
  }
})
