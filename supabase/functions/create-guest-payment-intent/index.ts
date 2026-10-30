// create-guest-payment-intent
// Public endpoint — no JWT required.
// Called by PaymentPortal when a guest (non-logged-in user) scans a QR code
// and wants to pay a specific IFB member.
// Creates a Stripe PaymentIntent with the RECEIVER's user_id in metadata so
// the stripe-webhook credits their liquid_usd on payment_intent.succeeded.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders as buildCors } from "../_shared/auth.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCors(req);
  // Same response for missing / malformed / unknown recipients (no account enumeration)
  const unavailable = () => new Response(JSON.stringify({ error: "Unable to start this payment" }), {
    status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

  if (!receiver_id || !UUID_RE.test(receiver_id)) return unavailable();

  const numAmount = Number(amount);
  if (!numAmount || numAmount < 0.5 || numAmount > 50000) {
    return new Response(JSON.stringify({ error: "Amount must be between $0.50 and $50,000" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Validate receiver exists in our system
  const { data: receiverProfile, error: profileErr } = await adminSb
    .from("profiles")
    .select("id")
    .eq("id", receiver_id)
    .maybeSingle();

  if (profileErr || !receiverProfile) return unavailable();

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(numAmount * 100),
      currency: "usd",
      // user_id is the RECEIVER — webhook credits their liquid_usd.
      // No PII (email / name) in Stripe metadata.
      metadata: {
        user_id:     receiver_id,
        source:      event_id ? "qr_ticket_payment" : "qr_guest_payment",
        event_id:    typeof event_id === "string" ? event_id.slice(0, 64) : "",
      },
      description: (typeof description === "string" && description.trim()) ? description.slice(0, 200) : "IFB Payment",
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
    return new Response(JSON.stringify({ error: "Payment gateway error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
