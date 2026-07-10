import Stripe from 'npm:stripe@14'

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
    const { project_id, amount_eur, founder_name, founder_email } = await req.json()
    if (!project_id) return json({ error: 'project_id required' }, 400)

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

    return json({ client_secret: paymentIntent.client_secret, payment_intent_id: paymentIntent.id })
  } catch (err) {
    console.error('kyc-create-payment-intent error:', err)
    return json({ error: String(err) }, 500)
  }
})
