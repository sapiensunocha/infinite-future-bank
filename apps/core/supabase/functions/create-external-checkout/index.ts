import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

serve(async (req: Request) => {
  // Handle CORS Pre-flight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { recipientId, amount } = await req.json()

    if (!recipientId || !amount) {
      throw new Error("Missing recipientId or amount")
    }

    // Create a Stripe Checkout Session
    // This creates a secure, Stripe-hosted page for the client to enter their card
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Payment to IFB Member`,
              description: `Institutional Capital Routing via DEUS/IFB`,
            },
            unit_amount: Math.round(amount * 100), // Convert dollars to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      // CRITICAL: Metadata links the payment to the IFB user in your DB
      metadata: {
        recipientId: recipientId,
        transactionType: 'external_deposit'
      },
      // Stripe will send the user here after they pay
      success_url: `${req.headers.get('origin')}/pay?status=success`,
      cancel_url: `${req.headers.get('origin')}/pay?status=cancelled`,
    })

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})