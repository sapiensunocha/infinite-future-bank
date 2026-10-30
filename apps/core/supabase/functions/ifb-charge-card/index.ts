import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, getAuthedUser, parseAmount, HttpError, timingSafeEqualStr } from "../_shared/auth.ts"

// Who may charge a card:
//  - the cardholder themself (authenticated user == card owner), paying body.merchantId; or
//  - an authenticated merchant charging a card, in which case the merchant is ALWAYS the
//    caller (body.merchantId is ignored) and the card's CVV + expiry must match.
// TODO(rate-limit): there is no card-attempts table yet. Add one (card_id, merchant_id,
// success, created_at) and decline after ~5 failed attempts per card per hour.

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })

  const respond = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' }, status })

  try {
    const caller = await getAuthedUser(req)
    const { merchantId: bodyMerchantId, pan, expiry, cvv, amount: rawAmount, description } = await req.json()
    const amount = parseAmount(rawAmount)
    if (typeof pan !== 'string' || !/^\d{13,19}$/.test(pan)) {
      throw new HttpError(400, "DECLINED: Missing required payment telemetry.")
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Validate the IFB Virtual Card
    const { data: card, error: cardError } = await supabaseAdmin
      .from('virtual_cards')
      .select('id, user_id, status, expiry, cvv, network_id')
      .eq('pan', pan)
      .maybeSingle()

    if (cardError || !card) throw new HttpError(400, "DECLINED: Card could not be authorized.")
    if (card.status !== 'ACTIVE') throw new HttpError(400, "DECLINED: Card is FROZEN or INACTIVE.")

    const isCardholder = card.user_id === caller.id
    let merchantId: string
    if (isCardholder) {
      if (!bodyMerchantId || bodyMerchantId === caller.id) throw new HttpError(400, "DECLINED: Invalid Merchant ID.")
      merchantId = bodyMerchantId
    } else {
      // Third-party merchant: merchant identity comes from the JWT only.
      merchantId = caller.id
      // Cards issued after CVV storage was removed cannot be charged card-not-present.
      // TODO: move to Stripe Issuing for real network authorization.
      if (!card.cvv || typeof cvv !== 'string' || typeof expiry !== 'string' ||
          !timingSafeEqualStr(String(card.cvv), cvv) || card.expiry !== expiry) {
        throw new HttpError(400, "DECLINED: Card could not be authorized.")
      }
    }

    const isInternalSystem = merchantId === 'MICHAEL-SYSTEM'
    if (!isInternalSystem) {
      const { data: merchant } = await supabaseAdmin.from('balances').select('user_id').eq('user_id', merchantId).maybeSingle()
      if (!merchant) throw new HttpError(400, "DECLINED: Invalid Merchant ID.")
    }

    // 2. SETTLEMENT: atomic, guarded debit first (raises on insufficient funds), then credit.
    const ref = `IFB-TXN-${crypto.randomUUID()}`
    const netAmount = Math.round(amount * 0.99 * 100) / 100

    const { error: debitError } = await supabaseAdmin.rpc('debit_for_withdrawal', {
      p_user_id: card.user_id,
      p_amount: amount,
      p_external_id: ref,
      p_description: `${description || 'External Merchant Charge'} (card ${pan.slice(-4)})`,
    })
    if (debitError) throw new HttpError(400, "DECLINED: Insufficient Liquid USD.")

    if (!isInternalSystem) {
      const { error: creditError } = await supabaseAdmin.rpc('credit_deposit', {
        p_user_id: merchantId,
        p_amount: netAmount,
        p_currency: 'USD',
        p_external_id: `${ref}-merchant`,
        p_source: 'ifb_card_payment',
      })
      if (creditError) {
        await supabaseAdmin.rpc('refund_withdrawal', { p_external_id: ref })
        console.error('ifb-charge-card: merchant credit failed, debit refunded', ref)
        throw new HttpError(500, "DECLINED: Settlement failed.")
      }
    }

    return respond({ success: true, status: "APPROVED", settlement_amount: netAmount, transaction_ref: ref }, 200)
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500
    const message = error instanceof HttpError ? error.message : 'DECLINED: Processing error.'
    if (!(error instanceof HttpError)) console.error('ifb-charge-card error:', error instanceof Error ? error.message : error)
    return respond({ success: false, error: message }, status)
  }
})
