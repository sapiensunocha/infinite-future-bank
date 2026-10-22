// create-nfc-checkout
// Generates a Stripe Checkout URL that credits the authenticated user's IFB balance.
// Used by NFCTransfer "Receive via Card" — payer scans QR or taps NFC tag.
// The existing stripe-webhook handles payment_intent.succeeded → credits liquid_usd.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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

  let body: { amount?: number; note?: string };
  try { body = await req.json(); } catch { body = {}; }

  const amount = Number(body.amount);
  if (!amount || amount < 1 || amount > 50000) {
    return new Response(JSON.stringify({ error: "Amount must be $1–$50,000" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const receiverName = profile?.full_name || profile?.email || "IFB User";
  const appUrl = "https://deux.infinitefuturebank.org";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: `Pay ${receiverName} via IFB`,
            description: body.note ? `Note: ${body.note}` : "Payment via Infinite Future Bank",
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }],
      // user_id in payment_intent_data.metadata → existing webhook credits liquid_usd
      payment_intent_data: {
        metadata: {
          user_id: user.id,
          user_email: user.email || "",
          full_name: receiverName,
          source: "nfc_receive",
          note: body.note || "",
        },
      },
      success_url: `${appUrl}/?nfc_paid=1&amount=${amount}`,
      cancel_url: `${appUrl}/?nfc_cancelled=1`,
      // Allow card + Apple Pay + Google Pay
      payment_method_types: ["card"],
    });

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Stripe Checkout error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
