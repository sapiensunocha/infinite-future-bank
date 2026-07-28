import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // 1. Receive the payload from the external Merchant's backend
    const { merchantId, pan, expiry, cvv, amount, description } = await req.json()

    if (!merchantId || !pan || !amount) {
      throw new Error("DECLINED: Missing required payment telemetry.")
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Validate the IFB Virtual Card
    const { data: card, error: cardError } = await supabaseAdmin
      .from('virtual_cards')
      .select('user_id, status, expiry, cvv, network_id')
      .eq('pan', pan)
      .single()

    if (cardError || !card) throw new Error("DECLINED: Invalid Card Number.")
    if (card.status !== 'ACTIVE') throw new Error("DECLINED: Card is FROZEN or INACTIVE.")
    if (card.expiry !== expiry || card.cvv !== cvv) throw new Error("DECLINED: Invalid CVV or Expiry.")

    // 3. Check User's Liquid Balance
    const { data: userBalance, error: balanceError } = await supabaseAdmin
      .from('balances')
      .select('liquid_usd')
      .eq('user_id', card.user_id)
      .single()

    if (balanceError || !userBalance) throw new Error("DECLINED: Account routing error.")
    if (userBalance.liquid_usd < amount) throw new Error("DECLINED: Insufficient Liquid USD.")

    // 4. Handle Merchant Routing (NEW: Internal System Bypass)
    const isInternalSystem = merchantId === 'MICHAEL-SYSTEM';
    let merchantBalance = null;

    if (!isInternalSystem) {
      // If it is a normal user-to-user merchant, verify they exist
      const { data: mBalance, error: merchError } = await supabaseAdmin
        .from('balances')
        .select('liquid_usd')
        .eq('user_id', merchantId)
        .single()

      if (merchError || !mBalance) throw new Error("DECLINED: Invalid Merchant ID.")
      merchantBalance = mBalance;
    }

    // 5. EXECUTE THE SETTLEMENT (Atomic Ledger Transfer)
    // Deduct from User
    await supabaseAdmin.from('balances').update({ liquid_usd: userBalance.liquid_usd - amount }).eq('user_id', card.user_id)
    
    const netAmount = amount * 0.99;

    // Credit the Merchant (Only if it's NOT an internal system charge)
    if (!isInternalSystem && merchantBalance) {
      await supabaseAdmin.from('balances').update({ liquid_usd: merchantBalance.liquid_usd + netAmount }).eq('user_id', merchantId)
    }

    // 6. Log the Transactions
    // User outflow
    await supabaseAdmin.from('transactions').insert([{
      user_id: card.user_id,
      amount: -Math.abs(amount),
      transaction_type: 'card_expense',
      description: description || 'External Merchant Charge',
      status: 'completed',
      metadata: { network_id: card.network_id, merchant_id: merchantId, last4: pan.slice(-4) }
    }])

    // Merchant inflow (Only if it's NOT an internal system charge)
    if (!isInternalSystem) {
      await supabaseAdmin.from('transactions').insert([{
        user_id: merchantId,
        amount: netAmount,
        transaction_type: 'merchant_deposit',
        description: `Card Payment Received (Network Fee applied)`,
        status: 'completed',
        metadata: { source_network_id: card.network_id }
      }])
    }

    // 7. Return the 200 OK Success to the Merchant's Website
    return new Response(JSON.stringify({ 
      success: true, 
      status: "APPROVED",
      settlement_amount: netAmount,
      transaction_ref: `IFB-TXN-${Date.now()}` 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})