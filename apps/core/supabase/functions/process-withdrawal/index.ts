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
    const { userId, amount, routingNumber, accountNumber } = await req.json()

    // 1. Initialize Admin DB Connection to securely check balances
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_SECRET') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. SERVER-SIDE SECURITY: Check if they actually have the money
    const { data: balanceRecord, error: balanceError } = await supabaseAdmin
      .from('balances')
      .select('liquid_usd')
      .eq('user_id', userId)
      .single()

    if (balanceError || !balanceRecord) throw new Error("Could not locate account balance.")
    if (balanceRecord.liquid_usd < amount) throw new Error("INSUFFICIENT LIQUIDITY: Transaction Declined.")

    // 3. THE STRIPE PAYOUT ENGINE (CONNECT)
    // To pay out to a user's bank, Stripe requires them to be a "Connected Account".
    // In a live environment, you would save this account.id to the user's profile so you don't recreate it.
    
    const account = await stripe.accounts.create({
      type: 'custom',
      country: 'US',
      capabilities: { transfers: { requested: true } },
    });

    // Attach their external bank account to their Connected Account
    const externalAccount = await stripe.accounts.createExternalAccount(
      account.id,
      {
        external_account: {
          object: 'bank_account',
          country: 'US',
          currency: 'usd',
          routing_number: routingNumber,
          account_number: accountNumber,
        },
      }
    );

    // Wire the money from your Master Balance to their Connected Bank Account
    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100), // convert to cents
      currency: 'usd',
      destination: account.id,
      description: `DEUS Capital Extraction: ${userId}`,
    });

    // 4. THE MASTER LEDGER UPDATE
    // Only deduct the money AFTER Stripe confirms the transfer was initiated
    const newBalance = balanceRecord.liquid_usd - amount

    await supabaseAdmin
      .from('balances')
      .update({ liquid_usd: newBalance })
      .eq('user_id', userId)

    await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'withdrawal',
        amount: -amount,
        status: 'completed',
        description: 'External Bank Withdrawal',
        metadata: { stripe_transfer_id: transfer.id, routing_last_4: routingNumber.slice(-4) }
      })

    return new Response(JSON.stringify({ success: true, newBalance }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error("Withdrawal Error:", error)
    const errorMessage = error instanceof Error ? error.message : "Internal routing failure"
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})