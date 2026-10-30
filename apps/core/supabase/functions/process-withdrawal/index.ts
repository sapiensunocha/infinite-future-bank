import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0"
import { corsHeaders, getAuthedUser, parseAmount, HttpError, jsonResponse, errorResponse } from "../_shared/auth.ts"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })

  try {
    // 1. Identity comes from the JWT, never from the request body
    const user = await getAuthedUser(req)
    const body = await req.json()
    const amount = parseAmount(body.amount)
    const routingNumber = String(body.routingNumber ?? '')
    const accountNumber = String(body.accountNumber ?? '')
    if (!/^\d{9}$/.test(routingNumber) || !/^\d{4,17}$/.test(accountNumber)) {
      throw new HttpError(400, 'Invalid bank details')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_SECRET') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Atomically debit FIRST (raises on insufficient funds). The external id
    //    doubles as the Stripe idempotency key so retries can't double-pay.
    const externalId = `wd_${crypto.randomUUID()}`
    const { error: debitError } = await supabaseAdmin.rpc('debit_for_withdrawal', {
      p_user_id: user.id,
      p_amount: amount,
      p_external_id: externalId,
      p_description: `External Bank Withdrawal (acct ****${accountNumber.slice(-4)})`,
    })
    if (debitError) throw new HttpError(400, 'Insufficient funds or account unavailable')

    // 3. Stripe Connect payout. On ANY failure, refund the debit.
    // TODO: persist the connected account id on the profile instead of creating one per withdrawal.
    let transfer
    try {
      const account = await stripe.accounts.create({
        type: 'custom',
        country: 'US',
        capabilities: { transfers: { requested: true } },
        metadata: { user_id: user.id },
      }, { idempotencyKey: `${externalId}-account` })

      await stripe.accounts.createExternalAccount(account.id, {
        external_account: {
          object: 'bank_account',
          country: 'US',
          currency: 'usd',
          routing_number: routingNumber,
          account_number: accountNumber,
        },
      }, { idempotencyKey: `${externalId}-bank` })

      transfer = await stripe.transfers.create({
        amount: Math.round(amount * 100),
        currency: 'usd',
        destination: account.id,
        description: `IFB withdrawal ${externalId}`,
        metadata: { user_id: user.id, external_id: externalId },
      }, { idempotencyKey: `${externalId}-transfer` })
    } catch (stripeError) {
      console.error('Withdrawal Stripe error:', stripeError instanceof Error ? stripeError.message : stripeError)
      // Only a definite rejection (4xx) proves no money moved. Timeouts / 5xx are ambiguous:
      // keep the debit and let reconciliation retry with the same idempotency keys.
      const status = (stripeError as { statusCode?: number })?.statusCode
      if (!status || status >= 500) {
        console.error('RECONCILE: ambiguous Stripe failure for withdrawal', externalId)
        return jsonResponse(req, { success: false, pending: true, externalId }, 202)
      }
      const { error: refundError } = await supabaseAdmin.rpc('refund_withdrawal', { p_external_id: externalId })
      if (refundError) console.error('CRITICAL: refund_withdrawal failed for', externalId, refundError.message)
      throw new HttpError(502, 'Payout failed; your balance has not been charged.')
    }

    return jsonResponse(req, { success: true, externalId, transferId: transfer.id })
  } catch (error) {
    return errorResponse(req, error)
  }
})
