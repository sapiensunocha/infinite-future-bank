import Stripe from "npm:stripe@14"
import { createClient } from "npm:@supabase/supabase-js@2"
import { corsHeaders, getAuthedUser, HttpError, jsonResponse, errorResponse } from "../_shared/auth.ts"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

function clientIpFrom(req: Request): string | null {
  const raw = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || ''
  const ip = raw.split(',')[0].trim()
  if (!ip || ip === '127.0.0.1' || ip === '::1') return null
  return ip
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })

  try {
    // Identity from the JWT; any userId in the body is ignored.
    const user = await getAuthedUser(req)
    const { stripeToken, last4, brand } = await req.json()
    if (typeof stripeToken !== 'string' || !stripeToken.startsWith('tok_')) {
      throw new HttpError(400, 'Invalid card token')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_SECRET') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_account_id, email, full_name')
      .eq('id', user.id)
      .single()

    let stripeAccountId = profile?.stripe_account_id

    // IF THEY DON'T HAVE A STRIPE IDENTITY, CREATE IT WITH COMPLIANCE DATA
    if (!stripeAccountId) {
      // ToS acceptance must carry the user's real IP — never a fabricated fallback.
      const clientIp = clientIpFrom(req)
      if (!clientIp) throw new HttpError(400, 'Unable to record Terms of Service acceptance (no client IP).')

      const account = await stripe.accounts.create({
        type: 'custom',
        country: 'US',
        email: profile?.email ?? user.email,
        business_profile: { name: profile?.full_name || 'DEUS Member' },
        capabilities: {
          transfers: { requested: true },
        },
        tos_acceptance: {
          date: Math.floor(Date.now() / 1000),
          ip: clientIp,
        },
        metadata: { user_id: user.id },
      })
      
      stripeAccountId = account.id

      await supabaseAdmin
        .from('profiles')
        .update({ stripe_account_id: stripeAccountId })
        .eq('id', user.id)
    }

    // ATTACH THE CARD
    const externalAccount = await stripe.accounts.createExternalAccount(
      stripeAccountId,
      { external_account: stripeToken }
    )

    // RECORD IN DEUS (use Stripe's view of the card, not client-supplied values)
    const ext = externalAccount as { brand?: string; last4?: string }
    await supabaseAdmin
      .from('linked_cards')
      .insert({
        user_id: user.id,
        stripe_external_account_id: externalAccount.id,
        brand: ext.brand ?? brand,
        last4: ext.last4 ?? last4
      })

    return jsonResponse(req, { success: true, cardId: externalAccount.id })

  } catch (error) {
    return errorResponse(req, error)
  }
})
