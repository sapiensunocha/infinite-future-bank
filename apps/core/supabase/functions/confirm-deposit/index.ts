import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") as string, {
  apiVersion: "2022-11-15",
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { payment_intent_id } = await req.json();
    if (!payment_intent_id) throw new Error("payment_intent_id required");

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the PaymentIntent from Stripe
    const intent = await stripe.paymentIntents.retrieve(payment_intent_id);
    if (intent.status !== "succeeded") {
      return new Response(JSON.stringify({ credited: false, reason: "Payment not succeeded" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = intent.metadata?.userId;
    const depositAmount = intent.amount / 100;

    if (!userId) throw new Error("No userId in payment intent metadata");

    // Idempotency check — don't credit twice for the same intent
    const { data: existing } = await supabaseAdmin
      .from("transactions")
      .select("id")
      .eq("stripe_payment_intent_id", payment_intent_id)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ credited: false, reason: "Already credited" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Credit the balance
    const { data: bal } = await supabaseAdmin
      .from("balances")
      .select("liquid_usd")
      .eq("user_id", userId)
      .single();

    await supabaseAdmin
      .from("balances")
      .update({ liquid_usd: (bal?.liquid_usd || 0) + depositAmount })
      .eq("user_id", userId);

    await supabaseAdmin.from("transactions").insert({
      user_id: userId,
      transaction_type: "deposit",
      amount: depositAmount,
      status: "completed",
      description: "Capital Injection via Secure UI",
      stripe_payment_intent_id: payment_intent_id,
    });

    return new Response(JSON.stringify({ credited: true, amount: depositAmount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
