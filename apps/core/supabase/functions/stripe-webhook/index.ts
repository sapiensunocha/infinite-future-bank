import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})
const cryptoProvider = Stripe.createSubtleCryptoProvider()

// All crediting goes through the credit_deposit() RPC keyed by the Stripe
// PaymentIntent id, so checkout.session.completed, payment_intent.succeeded and
// confirm-deposit can never credit the same payment twice.

serve(async (req: Request) => {
  const signature = req.headers.get('Stripe-Signature')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  let event: Stripe.Event
  try {
    const body = await req.text()
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      webhookSecret!,
      undefined,
      cryptoProvider
    )
  } catch (err) {
    console.error(`Webhook signature error: ${err instanceof Error ? err.message : err}`)
    return new Response('Webhook signature verification failed', { status: 400 })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  let userId: string | undefined
  let depositAmount = 0
  let piId: string | undefined
  let currency = ''
  let isExternal = false

  // --- 1. HANDLE CHECKOUT SESSIONS (Internal & External) ---
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any
    if (session.payment_status === 'paid') {
      // Look for recipient in metadata (External) OR client_reference_id (Internal)
      userId = session.metadata?.recipientId || session.client_reference_id
      isExternal = !!session.metadata?.recipientId
      depositAmount = session.amount_total / 100
      piId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
      currency = session.currency
    }
  }

  // --- 2. HANDLE EMBEDDED DEUS UI (Payment Intents) ---
  else if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as any
    userId = intent.metadata?.userId ?? intent.metadata?.user_id
    depositAmount = intent.amount_received / 100
    piId = intent.id
    currency = intent.currency
  }

  if (userId && piId) {
    if (currency !== 'usd') {
      console.warn(`Non-USD payment ${piId} (${currency}) not credited`)
      return new Response(JSON.stringify({ received: true }), { status: 200 })
    }

    const { data: credited, error } = await supabaseAdmin.rpc('credit_deposit', {
      p_user_id: userId,
      p_amount: depositAmount,
      p_currency: 'USD',
      p_external_id: piId,
      p_source: isExternal ? 'stripe_external' : 'stripe',
    })
    if (error) {
      console.error(`credit_deposit failed for ${piId}: ${error.message}`)
      return new Response('credit failed', { status: 500 }) // Stripe retries
    }

    if (credited && isExternal) {
      await supabaseAdmin.from('notifications').insert({
        user_id: userId,
        type: 'system',
        message: `External Capital Secured: $${depositAmount.toFixed(2)} credited to your account.`
      })
    }
    console.log(credited ? `Credited ${piId}` : `PaymentIntent ${piId} already credited, skipping`)
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 })
})
