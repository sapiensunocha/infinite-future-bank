import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

const USD_RATES: Record<string, number> = {
  USD: 1, EUR: 1.09, GBP: 1.27, XOF: 0.00152, NGN: 0.00063,
  KES: 0.00775, GHS: 0.065, ZAR: 0.054, CAD: 0.74, AUD: 0.65,
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' })
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  try {
    const {
      npo_id, campaign_id, peer_fundraiser_id,
      amount, currency = 'USD',
      donor_name, donor_email, donor_id,
      is_recurring = false, recurring_interval = 'monthly',
      is_anonymous = false, message,
      payment_method_id,
    } = await req.json()

    if (!npo_id || !amount || !donor_email) return json({ error: 'Missing required fields' }, 400)

    const amountUsd = amount * (USD_RATES[currency] ?? 1)
    const amountCents = Math.round(amountUsd * 100)

    if (amountCents < 50) return json({ error: 'Minimum donation is $0.50 USD equivalent' }, 400)

    const receiptNumber = `IFB-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.random().toString(36).slice(2,8).toUpperCase()}`

    // Create Stripe PaymentIntent
    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      payment_method: payment_method_id || undefined,
      confirm: !!payment_method_id,
      automatic_payment_methods: payment_method_id ? undefined : { enabled: true },
      metadata: {
        npo_id, campaign_id: campaign_id || '', donor_email,
        receipt_number: receiptNumber, source: 'npo_hub',
      },
      description: `IFB Donation — ${donor_name || donor_email} → NPO ${npo_id}`,
      receipt_email: donor_email,
    })

    // Record donation (pending until webhook confirms, or treat as completed for wallet)
    const { data: donation, error: dbErr } = await supabase
      .from('npo_donations')
      .insert({
        npo_id,
        campaign_id: campaign_id || null,
        peer_fundraiser_id: peer_fundraiser_id || null,
        donor_id: donor_id || null,
        donor_name: is_anonymous ? null : donor_name,
        donor_email,
        amount,
        currency,
        amount_usd: amountUsd,
        is_recurring,
        recurring_interval: is_recurring ? recurring_interval : null,
        stripe_payment_intent_id: intent.id,
        payment_method: 'card',
        payment_status: intent.status === 'succeeded' ? 'completed' : 'pending',
        is_anonymous,
        message: message || null,
        receipt_number: receiptNumber,
      })
      .select()
      .single()

    if (dbErr) return json({ error: dbErr.message }, 500)

    // Send receipt email if status already succeeded
    if (intent.status === 'succeeded') {
      await supabase.functions.invoke('send-email', {
        body: {
          to: donor_email,
          subject: `Your IFB Donation Receipt — ${receiptNumber}`,
          html: buildReceiptHtml({ donor_name, donor_email, amount, currency, amountUsd, receiptNumber, is_recurring, recurring_interval, message }),
        },
      }).catch(() => {})
    }

    return json({
      client_secret: intent.client_secret,
      payment_intent_id: intent.id,
      donation_id: donation.id,
      receipt_number: receiptNumber,
      status: intent.status,
    })
  } catch (err) {
    console.error(err)
    return json({ error: err.message || 'Server error' }, 500)
  }
})

function buildReceiptHtml(d: {
  donor_name?: string, donor_email: string, amount: number, currency: string,
  amountUsd: number, receiptNumber: string, is_recurring: boolean,
  recurring_interval: string, message?: string
}) {
  return `
<div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:40px 32px;background:#fff">
  <div style="border-bottom:3px solid #1e293b;padding-bottom:24px;margin-bottom:32px">
    <h1 style="margin:0;font-size:28px;font-weight:900;color:#1e293b;letter-spacing:-1px">IFB Global Impact</h1>
    <p style="margin:4px 0 0;color:#64748b;font-size:13px;font-weight:600">Donation Receipt</p>
  </div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:32px">
    <tr><td style="padding:8px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px">Receipt #</td><td style="padding:8px 0;font-weight:900;color:#1e293b;text-align:right">${d.receiptNumber}</td></tr>
    <tr><td style="padding:8px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px">Donor</td><td style="padding:8px 0;font-weight:700;color:#1e293b;text-align:right">${d.donor_name || 'Anonymous'}</td></tr>
    <tr><td style="padding:8px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px">Amount</td><td style="padding:8px 0;font-weight:900;color:#2563eb;font-size:18px;text-align:right">${d.currency} ${Number(d.amount).toLocaleString()}</td></tr>
    ${d.currency !== 'USD' ? `<tr><td style="padding:8px 0;color:#94a3b8;font-size:11px">USD Equivalent</td><td style="padding:8px 0;color:#94a3b8;font-size:11px;text-align:right">$${d.amountUsd.toFixed(2)}</td></tr>` : ''}
    <tr><td style="padding:8px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px">Type</td><td style="padding:8px 0;font-weight:700;color:#1e293b;text-align:right">${d.is_recurring ? `Recurring (${d.recurring_interval})` : 'One-time'}</td></tr>
    <tr><td style="padding:8px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px">Date</td><td style="padding:8px 0;font-weight:700;color:#1e293b;text-align:right">${new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}</td></tr>
  </table>
  ${d.message ? `<div style="background:#f8fafc;border-left:3px solid #3b82f6;padding:16px;border-radius:0 8px 8px 0;margin-bottom:32px"><p style="margin:0;font-style:italic;color:#475569">"${d.message}"</p></div>` : ''}
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;text-align:center;margin-bottom:32px">
    <p style="margin:0;font-weight:900;color:#15803d;font-size:14px">✓ Your donation is tax-deductible to the extent permitted by law.</p>
    <p style="margin:8px 0 0;color:#16a34a;font-size:12px">No goods or services were provided in exchange for this contribution.</p>
  </div>
  <p style="color:#94a3b8;font-size:11px;text-align:center">Infinite Future Bank · IFB Global Impact Engine · impact@infinitefuturebank.org</p>
</div>`
}
