import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { amount, company_id, company_name, notification_id, user_id, user_email, app_url = 'https://deux.infinitefuturebank.org' } = await req.json();

    if (!amount || amount < 50) throw new Error('Minimum engagement amount is $50');

    const session = await stripe.checkout.sessions.create({
      customer_email: user_email,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `IFB Capital Readiness Support`,
            description: `IFB advisory engagement for ${company_name} — Capital structuring, documentation & funding readiness`,
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${app_url}?engagement=success&company=${encodeURIComponent(company_name)}&amount=${amount}`,
      cancel_url:  `${app_url}?engagement=cancelled`,
      client_reference_id: user_id,
      metadata: { company_id, notification_id, user_id, amount: String(amount), type: 'ifb_engagement' },
    });

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
