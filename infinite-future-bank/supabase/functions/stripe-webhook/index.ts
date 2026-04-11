import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})
const cryptoProvider = Stripe.createSubtleCryptoProvider()

serve(async (req: Request) => {
  const signature = req.headers.get('Stripe-Signature')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  try {
    const body = await req.text()
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      webhookSecret!,
      undefined,
      cryptoProvider
    )

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // --- 1. HANDLE CHECKOUT SESSIONS (Internal & External) ---
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any
      
      // Look for recipient in metadata (External) OR client_reference_id (Internal)
      const userId = session.metadata?.recipientId || session.client_reference_id
      const depositAmount = session.amount_total / 100 
      const isExternal = !!session.metadata?.recipientId

      if (userId) {
        // Fetch current balance
        const { data: currentRecord } = await supabaseAdmin.from('balances').select('liquid_usd').eq('user_id', userId).single()
        const newBalance = (currentRecord?.liquid_usd || 0) + depositAmount

        // Update Balance
        await supabaseAdmin.from('balances').update({ liquid_usd: newBalance }).eq('user_id', userId)

        // Log Transaction
        await supabaseAdmin.from('transactions').insert({
            user_id: userId,
            transaction_type: isExternal ? 'external_deposit' : 'deposit',
            amount: depositAmount,
            status: 'completed',
            description: isExternal ? 'External Payment via IFB Link' : 'Capital Injection via Checkout'
        })

        // Notify user if it was an external payment
        if (isExternal) {
          await supabaseAdmin.from('notifications').insert({
            user_id: userId,
            type: 'system',
            message: `External Capital Secured: $${depositAmount.toFixed(2)} credited to your account.`
          })
        }
      }
    }
    
    // --- 2. HANDLE EMBEDDED DEUS UI (Payment Intents) ---
    else if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as any
      const userId = intent.metadata?.userId 
      const depositAmount = intent.amount / 100

      if (userId) {
        const { data: currentRecord } = await supabaseAdmin.from('balances').select('liquid_usd').eq('user_id', userId).single()
        const newBalance = (currentRecord?.liquid_usd || 0) + depositAmount

        await supabaseAdmin.from('balances').update({ liquid_usd: newBalance }).eq('user_id', userId)
          
        await supabaseAdmin.from('transactions').insert({
            user_id: userId,
            transaction_type: 'deposit',
            amount: depositAmount,
            status: 'completed',
            description: 'Capital Injection via Secure UI'
        })
          
        console.log(`PaymentIntent successful: Deposited $${depositAmount} for user ${userId}`)
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }
})