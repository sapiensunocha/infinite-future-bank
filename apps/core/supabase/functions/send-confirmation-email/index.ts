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
    const { email, redirectTo } = await req.json()

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured')

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const callbackUrl = redirectTo || 'https://app.infinitefuturebank.org/auth/callback'

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'signup',
      email,
      options: { redirectTo: callbackUrl }
    })

    if (linkError) {
      // User might already be confirmed — still succeed silently
      console.error('generateLink error:', linkError.message)
      return new Response(
        JSON.stringify({ success: true, note: 'already_confirmed_or_error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const confirmationUrl = linkData?.properties?.action_link
    if (!confirmationUrl) throw new Error('Could not generate confirmation link')

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Activate your DEUS account</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0">

        <!-- Header -->
        <tr><td align="center" style="padding-bottom:32px;">
          <h1 style="margin:0;font-size:32px;font-weight:900;letter-spacing:4px;line-height:1;">
            <span style="color:#4285F4">D</span><span style="color:#EA4335">E</span><span style="color:#FBBC04">U</span><span style="color:#34A853">S</span>
          </h1>
          <p style="margin:6px 0 0;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:#94a3b8;">Infinite Future Bank</p>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#ffffff;border-radius:24px;padding:48px 40px;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <table width="100%" cellpadding="0" cellspacing="0">

            <!-- Icon -->
            <tr><td align="center" style="padding-bottom:24px;">
              <div style="width:72px;height:72px;background:linear-gradient(135deg,#7c3aed,#4f46e5);border-radius:20px;display:inline-block;text-align:center;line-height:72px;font-size:32px;">✉️</div>
            </td></tr>

            <!-- Title -->
            <tr><td align="center" style="padding-bottom:12px;">
              <h2 style="margin:0;font-size:24px;font-weight:800;color:#0f172a;">Confirm Your Account</h2>
            </td></tr>

            <!-- Body -->
            <tr><td align="center" style="padding-bottom:36px;">
              <p style="margin:0;font-size:15px;color:#64748b;line-height:1.7;max-width:340px;">
                You're one step away from accessing the most intelligent banking platform ever built. Click below to activate your identity.
              </p>
            </td></tr>

            <!-- CTA -->
            <tr><td align="center" style="padding-bottom:32px;">
              <a href="${confirmationUrl}"
                 style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#ffffff;text-decoration:none;padding:18px 48px;border-radius:16px;font-weight:800;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;">
                Activate My Account &rarr;
              </a>
            </td></tr>

            <!-- Fine print -->
            <tr><td align="center">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
                This link expires in 24 hours.<br>
                If you didn't create an account, you can safely ignore this email.
              </p>
            </td></tr>

          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td align="center" style="padding-top:32px;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">&copy; 2026 Infinite Future Bank &middot; DEUS Platform</p>
          <p style="margin:6px 0 0;font-size:12px;color:#cbd5e1;">
            <a href="https://app.infinitefuturebank.org" style="color:#7c3aed;text-decoration:none;">app.infinitefuturebank.org</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
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
