// create-payment-intent
// Called by DepositInterface.jsx with { userId, amount }
// Creates a Stripe PaymentIntent with user_id in metadata
// → Webhook (stripe-webhook) credits liquid_usd on payment_intent.succeeded
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

  // Verify caller is authenticated
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { userId?: string; amount?: number };
  try { body = await req.json(); } catch { body = {}; }

  // Accept either userId (legacy DepositInterface call) or infer from JWT
  const userId = body.userId || user.id;
  if (userId !== user.id) {
    return new Response(JSON.stringify({ error: "userId mismatch" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const amount = Number(body.amount);
  if (!amount || amount < 1 || amount > 250000) {
    return new Response(JSON.stringify({ error: "Amount must be $1–$250,000" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Fetch user profile for Stripe description
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .maybeSingle();

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),  // Stripe uses cents
      currency: "usd",
      // user_id MUST be in metadata — webhook uses this to credit liquid_usd
      metadata: {
        user_id: userId,
        user_email: user.email || "",
        full_name: profile?.full_name || "",
        source: "ifb_deposit",
      },
      description: `IFB Wallet Deposit — ${profile?.full_name || user.email || userId}`,
      automatic_payment_methods: { enabled: true },
    });

    // Track intent creation
    await supabase.from("app_telemetry").insert([{
      event: "payment_intent_created",
      metadata: { user_id: userId, amount, pi_id: paymentIntent.id },
    }]);

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Stripe PaymentIntent error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
