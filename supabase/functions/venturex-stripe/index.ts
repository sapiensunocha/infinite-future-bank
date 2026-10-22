// VentureX Stripe — creates PaymentIntents for wallet top-up
// Frontend calls this with { amount } → gets back { client_secret }
// User completes payment via existing DepositInterface (Stripe Elements)
// Webhook credits liquid_usd on success
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Authenticate user via Supabase JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "No authorization header" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { amount?: number };
  try { body = await req.json(); }
  catch { body = {}; }

  const amount = Number(body.amount);
  if (!amount || amount < 10 || amount > 100000) {
    return new Response(JSON.stringify({ error: "Amount must be $10–$100,000" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Get user email for Stripe
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),  // cents
      currency: "usd",
      metadata: {
        user_id: user.id,
        user_email: user.email || "",
        full_name: profile?.full_name || "",
        source: "venturex_wallet_topup",
      },
      description: `IFB Wallet Top-up — ${profile?.full_name || user.email}`,
      automatic_payment_methods: { enabled: true },
    });

    return new Response(
      JSON.stringify({ client_secret: paymentIntent.client_secret, amount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Stripe error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
