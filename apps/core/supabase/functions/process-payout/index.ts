import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, getAuthedUser, parseAmount, HttpError, jsonResponse, errorResponse } from "../_shared/auth.ts"

// SECURITY: this endpoint never accepts full card numbers (PAN) or full bank
// account numbers. Clients send only the last 4 digits for display; the actual
// payout destination must be a tokenized/saved instrument (e.g. a Stripe
// connected account / external account id) resolved server-side.

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }

  try {
    const user = await getAuthedUser(req)
    const { amount: rawAmount, method, details } = await req.json()
    const amount = parseAmount(rawAmount)

    // 1. HANDLE "PHONE" REQUEST (COMING SOON)
    if (method === 'PHONE') {
      throw new HttpError(400, "Feature coming soon. If urgent, send email to deus@infinitefuturebank.org")
    }
    if (method !== 'BANK' && method !== 'CARD') throw new HttpError(400, 'Unsupported payout method')

    // 2. Only a last-4 is accepted. Reject anything that looks like a full PAN / account number.
    const last4 = String(details?.last4 ?? '')
    if (!/^\d{4}$/.test(last4)) {
      throw new HttpError(400, 'Send only the last 4 digits of the destination (details.last4)')
    }
    const destinationMask = method === 'BANK' ? `Account ending in ${last4}` : `Card ending in ${last4}`

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 3. Atomically reserve (debit) the funds. Raises on insufficient funds.
    // There is no automated Stripe payout here yet: the debit creates a pending
    // withdrawal for treasury ops to settle. If settlement fails, ops must call
    // refund_withdrawal(external_id) — never debit without a payout record.
    // TODO: wire stripe.transfers.create({ ... }, { idempotencyKey: externalId }) to a
    // saved connected account and call refund_withdrawal on failure (see process-withdrawal).
    const externalId = `po_${crypto.randomUUID()}`
    const { error: dbError } = await supabaseAdmin.rpc('debit_for_withdrawal', {
      p_user_id: user.id,
      p_amount: amount,
      p_external_id: externalId,
      p_description: `Payout via ${method} — ${destinationMask} (pending)`,
    })
    if (dbError) throw new HttpError(400, 'Insufficient funds or account unavailable')

    return jsonResponse(req, { success: true, externalId, status: 'pending', message: `Payout via ${method} queued for processing.` })
  } catch (error) {
    return errorResponse(req, error)
  }
})
