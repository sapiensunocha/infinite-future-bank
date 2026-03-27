import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0"

// 1. Initialize Stripe
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
    
    // 2. Cryptographically verify the event actually came from Stripe
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      webhookSecret!,
      undefined,
      cryptoProvider
    )

    // Initialize Admin Database Connection (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_SECRET') ?? ''
    )

    // 3. IF USING THE CHECKOUT REDIRECT LINK
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any
      const userId = session.client_reference_id
      const depositAmount = session.amount_total / 100 

      if (userId) {
        const { data: currentRecord } = await supabaseAdmin.from('balances').select('liquid_usd').eq('user_id', userId).single()
        const newBalance = (currentRecord?.liquid_usd || 0) + depositAmount

        await supabaseAdmin.from('balances').update({ liquid_usd: newBalance }).eq('user_id', userId)

        await supabaseAdmin.from('transactions').insert({
            user_id: userId,
            transaction_type: 'deposit', // FIXED SCHEMA
            amount: depositAmount,
            status: 'completed',
            description: 'Capital Injection via Checkout'
          })
      }
    }
    
    // 4. IF USING THE NEW EMBEDDED DEUS UI
    else if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as any
      const userId = intent.metadata?.userId 
      const depositAmount = intent.amount / 100

      if (userId) {
        // A. Fetch current balance
        const { data: currentRecord } = await supabaseAdmin.from('balances').select('liquid_usd').eq('user_id', userId).single()
        const newBalance = (currentRecord?.liquid_usd || 0) + depositAmount

        // B. Inject new balance
        const { error: balanceError } = await supabaseAdmin.from('balances').update({ liquid_usd: newBalance }).eq('user_id', userId)
        if (balanceError) console.error('Balance Update Error:', balanceError)
          
        // C. WRITE TO IMMUTABLE LEDGER
        const { error: txError } = await supabaseAdmin.from('transactions').insert({
            user_id: userId,
            transaction_type: 'deposit', // FIXED SCHEMA
            amount: depositAmount,
            status: 'completed',
            description: 'Capital Injection via Secure UI'
          })
        if (txError) console.error('Transaction Insert Error:', txError)
          
        console.log(`PaymentIntent successful: Deposited $${depositAmount} for user ${userId}`)
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error(`Webhook Error: ${errorMessage}`)
    return new Response(`Webhook Error: ${errorMessage}`, { status: 400 })
  }
})