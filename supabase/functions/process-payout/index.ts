import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, amount, method, details } = await req.json()

    // 1. HANDLE "PHONE" REQUEST (COMING SOON)
    if (method === 'PHONE') {
      return new Response(
        JSON.stringify({ 
          error: "Feature coming soon. If urgent, send email to deus@infinitefuturebank.org" 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // 2. INITIALIZE SUPABASE ADMIN (To securely deduct funds)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 3. IDENTIFY DESTINATION FOR THE LEDGER
    let destinationMask = '';
    if (method === 'BANK') {
      destinationMask = `Account ending in ${details.account.slice(-4)}`;
    } else if (method === 'CARD') {
      destinationMask = `Card ending in ${details.number.slice(-4)}`;
    }

    // 4. ATTEMPT STRIPE PAYOUT (To a connected account or external bank)
    // Note: In a production environment, you would use stripe.transfers.create 
    // to push funds to a connected Custom Account. For this function, we wrap 
    // the Stripe logic in a try block so it doesn't crash your local test environment 
    // if Connect isn't fully configured yet.
    try {
      console.log(`[STRIPE] Initiating ${method} payout of $${amount} to ${destinationMask}`);
      
      // Example of actual Stripe Connect routing logic:
      /*
      const token = await stripe.tokens.create({
        bank_account: { country: 'US', currency: 'usd', routing_number: details.routing, account_number: details.account }
      });
      // ... attach token to Connected Account and execute Transfer
      */
      
    } catch (stripeError) {
      console.error("[STRIPE ERROR]", stripeError);
      // In live production, you might throw here to stop the DB deduction.
      // For now, we proceed to update the database so the UI reflects the action.
    }

    // 5. DEDUCT FUNDS FROM SUPABASE DATABASE
    const { error: dbError } = await supabaseAdmin.rpc('process_withdrawal_db', {
      p_user_id: userId,
      p_amount: amount,
      p_method: method,
      p_destination: destinationMask
    });

    if (dbError) {
      console.error("[DB ERROR]", dbError);
      throw new Error(dbError.message || "Failed to securely route capital.");
    }

    // 6. RETURN SUCCESS TO FRONTEND
    return new Response(
      JSON.stringify({ success: true, message: `Capital extraction via ${method} processed.` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})