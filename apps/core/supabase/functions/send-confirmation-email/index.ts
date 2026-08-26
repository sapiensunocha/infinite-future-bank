import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, password, name, redirectTo } = await req.json()

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured')

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const callbackUrl = redirectTo || 'https://app.infinitefuturebank.org/auth/callback'

    // Try to generate a confirmation link — works if user already exists and is unconfirmed
    let { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'signup',
      email,
      options: { redirectTo: callbackUrl }
    })

    // If generateLink failed, user likely doesn't exist yet — create them via admin
    if (linkError && password) {
      console.log('generateLink failed, creating user via admin:', linkError.message)

      const { error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: { full_name: name || '' }
      })

      // Ignore "already registered" — just try generateLink again
      if (createError && !createError.message?.toLowerCase().includes('already')) {
        throw createError
      }

      // Now generate the confirmation link for the newly created user
      ;({ data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: 'signup',
        email,
        options: { redirectTo: callbackUrl }
      }))

      if (linkError) throw linkError
    } else if (linkError) {
      // No password provided and user doesn't exist — silent success (resend-only call for confirmed user)
      console.log('generateLink failed and no password provided:', linkError.message)
      return new Response(
        JSON.stringify({ success: true, note: 'already_confirmed_or_not_found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const confirmationUrl = linkData?.properties?.action_link
    if (!confirmationUrl) throw new Error('Could not generate confirmation link')

    const displayName = name ? name.split(' ')[0] : 'there'
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Confirm your DEUS account</title></head>
<body style="margin:0;padding:0;background:#060912;font-family:'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:48px 24px;">

  <div style="text-align:center;margin-bottom:48px;">
    <div style="display:inline-block;background:linear-gradient(135deg,#2563EB,#7C3AED);border-radius:14px;width:52px;height:52px;line-height:52px;color:#fff;font-size:26px;font-weight:900;text-align:center;letter-spacing:-1px;">D</div>
    <div style="margin-top:12px;color:#F8FAFC;font-size:14px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;">INFINITE FUTURE BANK</div>
    <div style="color:#475569;font-size:10px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;margin-top:4px;">DEUS Platform</div>
  </div>

  <div style="background:linear-gradient(135deg,#0F172A 0%,#1E1B4B 50%,#0F172A 100%);border:1px solid #1E293B;border-radius:32px;padding:52px 40px;text-align:center;margin-bottom:20px;">

    <div style="display:inline-block;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.3);color:#A5B4FC;font-size:10px;font-weight:900;letter-spacing:0.25em;text-transform:uppercase;padding:6px 18px;border-radius:100px;margin-bottom:28px;">
      ✉️ &nbsp;Account Confirmation
    </div>

    <h1 style="color:#F8FAFC;font-size:32px;font-weight:900;margin:0 0 16px;line-height:1.15;letter-spacing:-0.02em;">
      Hello ${displayName},<br/><span style="background:linear-gradient(135deg,#60A5FA,#A78BFA);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Confirm Your Identity</span>
    </h1>

    <p style="color:#94A3B8;font-size:15px;line-height:1.75;margin:0 0 36px;max-width:380px;margin-left:auto;margin-right:auto;">
      You are one step away from accessing the most intelligent banking platform ever built. Click below to activate your account.
    </p>

    <a href="${confirmationUrl}"
       style="display:inline-block;background:linear-gradient(135deg,#2563EB,#7C3AED);color:#ffffff;text-decoration:none;padding:18px 52px;border-radius:16px;font-weight:900;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;box-shadow:0 8px 32px rgba(99,102,241,0.45);">
      Activate My Account &rarr;
    </a>

    <p style="color:#475569;font-size:12px;margin:28px 0 0;line-height:1.6;">
      This link expires in 24 hours.<br/>
      If you didn't create an account, you can safely ignore this email.
    </p>

  </div>

  <div style="background:#0F172A;border:1px solid #1E293B;border-radius:18px;padding:20px 24px;margin-bottom:32px;">
    <div style="display:flex;align-items:center;gap:16px;">
      <div style="font-size:24px;flex-shrink:0;">🔐</div>
      <div>
        <div style="color:#4ADE80;font-size:13px;font-weight:900;margin-bottom:3px;">Bank-Grade Security</div>
        <div style="color:#475569;font-size:12px;line-height:1.6;">Your identity is verified and encrypted end-to-end. Never share this link with anyone.</div>
      </div>
    </div>
  </div>

  <div style="border-top:1px solid #1E293B;padding-top:24px;text-align:center;">
    <div style="color:#334155;font-size:12px;line-height:1.9;">
      <strong style="color:#475569;">Infinite Future Bank</strong> · DEUS Platform<br/>
      <a href="https://app.infinitefuturebank.org" style="color:#3B82F6;text-decoration:none;">app.infinitefuturebank.org</a>
      &nbsp;·&nbsp;
      <a href="mailto:support@infinitefuturebank.org" style="color:#3B82F6;text-decoration:none;">support@infinitefuturebank.org</a>
    </div>
    <div style="color:#1E293B;font-size:11px;margin-top:12px;">&copy; 2026 Infinite Future Bank. All rights reserved.</div>
  </div>

</div>
</body>
</html>`

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'DEUS · Infinite Future Bank <noreply@infinitefuturebank.org>',
        to: email,
        subject: 'Activate your DEUS account',
        html: htmlContent,
      }),
    })

    const resendData = await resendRes.json()
    if (!resendRes.ok) throw new Error(resendData.message ?? 'Resend error')

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    console.error('send-confirmation-email:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
