import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@11.1.0?target=deno'

// Use your existing live Stripe secret key
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2022-11-15',
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { userId } = await req.json()

    // Create the AI Camera Session
    const verificationSession = await stripe.identity.verificationSessions.create({
      type: 'document',
      metadata: { user_id: userId }, // So we know who to verify later
      options: {
        document: {
          require_id_number: true,
          require_matching_selfie: true, // This forces the live camera check!
        },
      },
      return_url: `${req.headers.get('origin')}/?status=kyc_submitted`,
    });

    return new Response(
      JSON.stringify({ url: verificationSession.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders })
  }
})