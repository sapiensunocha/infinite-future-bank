import Stripe from 'npm:stripe@14'
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
    const { project_id, amount_eur, founder_name, founder_email } = await req.json()
    if (!project_id) return json(req, { error: 'project_id required' }, 400)

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' })

    // 100,000 XOF = 152.45 EUR (fixed peg: 655.957 XOF = 1 EUR) → round to 153 EUR
    const amountCents = Math.round((amount_eur || 153) * 100)

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'eur',
      metadata: {
        project_id,
        admin_email: admin.email,
        source: 'kyc_admin_activation',
        founder_email: founder_email || '',
        founder_name: founder_name || '',
      },
      description: `IFB KYC Activation Fee — ${founder_name || project_id}`,
      automatic_payment_methods: { enabled: true },
    })

    return json(req, { client_secret: paymentIntent.client_secret, payment_intent_id: paymentIntent.id })
  } catch (err) {
    console.error('kyc-create-payment-intent error:', err)
    return json(req, { error: 'Server error' }, 500)
  }
})
