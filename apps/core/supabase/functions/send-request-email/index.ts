import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { requesterName, targetEmail, amount, reason, payLink } = await req.json()
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

    if (!RESEND_API_KEY) throw new Error("Missing Resend API Key")

    // The DEUS Branded HTML Email Template
    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-w-md mx-auto bg-slate-50 p-8 rounded-3xl text-slate-900">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 2px;">
            <span style="color: #4285F4">D</span><span style="color: #EA4335">E</span><span style="color: #FBBC04">U</span><span style="color: #34A853">S</span>
          </h1>
          <p style="margin: 5px 0 0 0; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8;">
            Infinite Future Bank
          </p>
        </div>

        <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; padding: 40px 30px; text-align: center; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
          <p style="margin: 0 0 10px 0; font-size: 14px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
            Secure Transfer Request
          </p>
          <p style="margin: 0 0 30px 0; font-size: 16px; color: #334155;">
            <strong>${requesterName}</strong> has requested a secure capital transfer.
          </p>
          
          <h2 style="margin: 0 0 10px 0; font-size: 48px; font-weight: 900; color: #0f172a;">
            $${amount.toFixed(2)}
          </h2>
          ${reason ? `<p style="margin: 0 0 30px 0; font-size: 14px; background-color: #f1f5f9; display: inline-block; padding: 6px 16px; border-radius: 20px; color: #475569;">For: ${reason}</p>` : '<div style="margin-bottom: 30px;"></div>'}

          <a href="${payLink}" style="display: block; width: 100%; background-color: #0f172a; color: #ffffff; padding: 18px 0; border-radius: 16px; text-decoration: none; font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
            Authorize Transfer
          </a>
          <p style="margin: 20px 0 0 0; font-size: 12px; color: #94a3b8;">
            Bank-grade encryption. Settlement via Stripe.
          </p>
        </div>

        <div style="text-align: center; margin-top: 40px;">
          <p style="font-size: 14px; color: #64748b; margin-bottom: 10px;">
            Experience the future of wealth management.
          </p>
          <a href="https://deux.infinitefuturebank.org" style="color: #2563eb; text-decoration: none; font-weight: 700; font-size: 14px;">
            Join DEUS Today &rarr;
          </a>
        </div>
      </div>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'DEUS Network <notifications@infinitefuturebank.org>', // Make sure this matches your verified Resend domain
        to: targetEmail,
        subject: `Secure Payment Request: $${amount.toFixed(2)} from ${requesterName}`,
        html: htmlContent,
      })
    })

    const responseData = await res.json()

    if (!res.ok) throw new Error(responseData.message || "Failed to send email")

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error("Email Error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})