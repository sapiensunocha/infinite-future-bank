import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { userId, stripeToken, last4, brand } = await req.json()

    // 1. Initialize Admin DB Connection
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_SECRET') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Look up the user's profile to see if they already have a Stripe Connect ID
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_account_id, email, full_name')
      .eq('id', userId)
      .single()

    let stripeAccountId = profile?.stripe_account_id

    // 3. IF NO STRIPE IDENTITY EXISTS -> CREATE IT
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'custom',
        country: 'US',
        email: profile?.email,
        business_profile: { name: profile?.full_name || 'DEUS Member' },
        capabilities: {
          transfers: { requested: true }, // Required for pushing payouts to them
        },
      })
      
      stripeAccountId = account.id

      // Save it to DEUS so we never have to create it again
      await supabaseAdmin
        .from('profiles')
        .update({ stripe_account_id: stripeAccountId })
        .eq('id', userId)
    }

    // 4. ATTACH THE DEBIT CARD TOKEN TO THEIR STRIPE IDENTITY
    const externalAccount = await stripe.accounts.createExternalAccount(
      stripeAccountId,
      { external_account: stripeToken }
    )

    // 5. RECORD THE CARD IN DEUS (So we can show it in the AccountHub UI)
    await supabaseAdmin
      .from('linked_cards')
      .insert({
        user_id: userId,
        stripe_external_account_id: externalAccount.id,
        brand: brand,
        last4: last4
      })

    return new Response(JSON.stringify({ success: true, cardId: externalAccount.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error("Card Vaulting Error:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to securely vault card"
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})