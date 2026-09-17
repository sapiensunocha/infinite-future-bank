// create-guest-payment-intent
// Public endpoint — no JWT required.
// Called by PaymentPortal when a guest (non-logged-in user) scans a QR code
// and wants to pay a specific IFB member.
// Creates a Stripe PaymentIntent with the RECEIVER's user_id in metadata so
// the stripe-webhook credits their liquid_usd on payment_intent.succeeded.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const adminSb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let body: { receiver_id?: string; amount?: number; description?: string; event_id?: string };
  try { body = await req.json(); }
  catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { receiver_id, amount, description, event_id } = body;

  if (!receiver_id) {
    return new Response(JSON.stringify({ error: "receiver_id is required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const numAmount = Number(amount);
  if (!numAmount || numAmount < 0.5 || numAmount > 50000) {
    return new Response(JSON.stringify({ error: "Amount must be between $0.50 and $50,000" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Validate receiver exists in our system
  const { data: receiverProfile, error: profileErr } = await adminSb
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", receiver_id)
    .maybeSingle();

  if (profileErr || !receiverProfile) {
    return new Response(JSON.stringify({ error: "Recipient not found on IFB Network" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(numAmount * 100),
      currency: "usd",
      // user_id is the RECEIVER — webhook credits their liquid_usd
      metadata: {
        user_id:     receiver_id,
        user_email:  receiverProfile.email || "",
        full_name:   receiverProfile.full_name || "",
        source:      event_id ? "qr_ticket_payment" : "qr_guest_payment",
        event_id:    event_id || "",
      },
      description: description || `IFB Payment to ${receiverProfile.full_name}`,
      automatic_payment_methods: { enabled: true },
    });

    await adminSb.from("app_telemetry").insert([{
      event:    "guest_payment_intent_created",
      metadata: { receiver_id, amount: numAmount, pi_id: paymentIntent.id, event_id: event_id || null },
    }]);

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Stripe guest PaymentIntent error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
