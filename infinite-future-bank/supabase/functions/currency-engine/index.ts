import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Initialize Supabase client with Service Role for secure backend execution
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Authenticate the User
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) throw new Error('Unauthorized Access')

    const { action, payload } = await req.json()

    // 2. Route the Request
    switch (action) {
      
      case 'open_account': {
        // Payload expects: { target_currency: 'EUR' }
        const { target_currency } = payload
        
        // Check if wallet already exists
        const { data: existing } = await supabase
          .from('wallets')
          .select('*')
          .eq('user_id', user.id)
          .eq('currency_code', target_currency)
          .single()

        if (existing) throw new Error(`${target_currency} account already exists.`)

        const { data, error } = await supabase
          .from('wallets')
          .insert([{ user_id: user.id, currency_code: target_currency, balance: 0.00 }])
          .select()

        if (error) throw error
        return new Response(JSON.stringify({ success: true, message: `${target_currency} account activated.`, wallet: data[0] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      case 'convert': {
        // Payload expects: { from_currency: 'USD', to_currency: 'EUR', amount: 1000 }
        // Note: In production, fetch live rates from an Oracle or API (e.g., OpenExchangeRates). 
        // Here, we simulate a conversion.
        const { from_currency, to_currency, amount } = payload
        
        // Mock API call for exchange rate
        const mockRate = 0.92 // Example: 1 USD = 0.92 EUR
        const convertedAmount = amount * mockRate

        // Execute RPC (Remote Procedure Call) for atomic database transaction
        // *Behind the scenes, this is where you trigger the Go-Engine AFR ledger state change*
        const { data, error } = await supabase.rpc('execute_conversion', {
          p_user_id: user.id,
          p_from_currency: from_currency,
          p_to_currency: to_currency,
          p_amount: amount,
          p_converted_amount: convertedAmount
        })

        if (error) throw error
        return new Response(JSON.stringify({ success: true, message: `Converted ${amount} ${from_currency} to ${convertedAmount} ${to_currency}` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      case 'transfer': {
        // Payload expects: { receiver_email: 'client@xeltis.org', currency: 'USD', amount: 500 }
        const { receiver_email, currency, amount } = payload

        // Resolve receiver ID
        const { data: receiverProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', receiver_email)
          .single()

        if (!receiverProfile) throw new Error('Receiver not found in network.')

        // Execute RPC for secure, atomic peer-to-peer transfer
        // *Again, the blockchain handles the settlement, the DB just reflects the fiat state*
        const { data, error } = await supabase.rpc('execute_p2p_transfer', {
          p_sender_id: user.id,
          p_receiver_id: receiverProfile.id,
          p_currency: currency,
          p_amount: amount
        })

        if (error) throw error
        return new Response(JSON.stringify({ success: true, message: `Transferred ${amount} ${currency} successfully.` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      default:
        throw new Error('Invalid action routing.')
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})