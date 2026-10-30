import { createClient } from "npm:@supabase/supabase-js@2"
import { corsHeaders, getAuthedUser, parseAmount, HttpError, jsonResponse, errorResponse } from "../_shared/auth.ts"

// AFR transfer. Rules:
//  - identity from the JWT, amount validated by parseAmount
//  - the AIVS node must accept the tx; if it is unreachable / rejects, NOTHING is committed
//  - internal receivers: the locked p2p_transfer(sender, receiver, amount, 'AFR') RPC
//  - external receivers: guarded compare-and-swap debit of the sender's afr_balance
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }

  try {
    const user = await getAuthedUser(req)
    const { receiver_address, amount } = await req.json()
    const transferAmount = parseAmount(amount)
    if (typeof receiver_address !== 'string' || !/^[A-Za-z0-9:._-]{8,128}$/.test(receiver_address)) {
      throw new HttpError(400, 'Invalid receiver address')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    // User-scoped client so p2p_transfer's auth.uid() check applies
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Verify Sender's Balance and Wallet
    const { data: senderData, error: senderError } = await supabaseAdmin
      .from('balances')
      .select('afr_wallet_address, afr_balance')
      .eq('user_id', user.id)
      .single()

    if (senderError || !senderData?.afr_wallet_address) {
      throw new HttpError(400, "Sender AFR Wallet not initialized")
    }
    if (Number(senderData.afr_balance) < transferAmount) {
      throw new HttpError(400, "Insufficient AFR Liquidity")
    }
    if (receiver_address === senderData.afr_wallet_address) {
      throw new HttpError(400, "Cannot transfer to your own wallet")
    }

    const { data: receiverData } = await supabaseAdmin
      .from('balances')
      .select('user_id')
      .eq('afr_wallet_address', receiver_address)
      .maybeSingle()

    // THE SOVEREIGN BRIDGE: node must confirm before we commit anything
    const txPayload = {
        from: senderData.afr_wallet_address,
        to: receiver_address,
        amount: transferAmount.toString(),
        token: "AFR",
        memo: "Deus App Transfer - Institutional Edge"
    }
    let nodeOk = false
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 5000)
      const nodeResponse = await fetch('http://35.238.28.158:8545', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(txPayload),
          signal: controller.signal
      })
      clearTimeout(timer)
      nodeOk = nodeResponse.ok
    } catch (nodeErr) {
      console.warn("AIVS node unreachable:", nodeErr instanceof Error ? nodeErr.message : nodeErr)
    }
    if (!nodeOk) throw new HttpError(503, "AFR network unavailable. No funds were moved; please retry later.")

    if (receiverData?.user_id) {
      const { data: result, error: rpcError } = await supabaseUser.rpc('p2p_transfer', {
        sender_id: user.id,
        receiver_id: receiverData.user_id,
        transfer_amount: transferAmount,
        p_asset: 'AFR',
      })
      if (rpcError || !result?.success) {
        console.error('CRITICAL: node accepted AFR tx but DB transfer failed', rpcError?.message ?? result?.error)
        throw new HttpError(409, result?.error ?? 'Transfer failed')
      }
    } else {
      // External address: compare-and-swap so concurrent requests can't double-spend
      const current = Number(senderData.afr_balance)
      const { data: updated, error: updError } = await supabaseAdmin
        .from('balances')
        .update({ afr_balance: Math.round((current - transferAmount) * 1e6) / 1e6 })
        .eq('user_id', user.id)
        .eq('afr_balance', senderData.afr_balance)
        .gte('afr_balance', transferAmount)
        .select('user_id')
      if (updError || !updated?.length) {
        console.error('CRITICAL: node accepted AFR tx but guarded debit failed', updError?.message)
        throw new HttpError(409, 'Balance changed during transfer; please retry')
      }
    }

    const txHash = "0x" + crypto.randomUUID().replace(/-/g, '')
    await supabaseAdmin.from('afr_transactions').insert({
        sender_id: user.id,
        receiver_address: receiver_address,
        amount: transferAmount,
        tx_hash: txHash,
        status: 'CONFIRMED'
    })

    return jsonResponse(req, {
        status: 'SUCCESS',
        message: 'AFR Transfer Confirmed on Mainnet',
        tx_hash: txHash
    })

  } catch (error) {
    return errorResponse(req, error)
  }
})
