// stripe-terminal-charge
// Creates a Stripe PaymentIntent for Terminal (Tap to Pay / card_present).
// Body: { amount: number (USD dollars), note?: string }
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace(/^Bearer\s+/i, "");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Body ──────────────────────────────────────────────────────────────────
  let body: { amount?: number; note?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const amount = Number(body.amount);
  if (!amount || amount <= 0) {
    return new Response(JSON.stringify({ error: "Invalid amount" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const note: string | undefined = body.note ?? undefined;

  // ── Stripe: create PaymentIntent ──────────────────────────────────────────
  const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;

  // Build form-encoded body
  const params = new URLSearchParams();
  params.set("amount", String(Math.round(amount * 100)));
  params.set("currency", "usd");
  params.set("payment_method_types[]", "card_present");
  params.set("capture_method", "automatic");
  params.set("metadata[user_id]", user.id);
  params.set("description", `IFB Tap to Pay — $${amount}`);
  if (note) {
    params.set("metadata[note]", note);
  }

  try {
    const stripeRes = await fetch(
      "https://api.stripe.com/v1/payment_intents",
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(STRIPE_SECRET_KEY + ":")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      },
    );

    const data = await stripeRes.json();

    if (!stripeRes.ok) {
      const message: string = data?.error?.message ?? "Stripe error";
      return new Response(JSON.stringify({ error: message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentIntent = data as { id: string; client_secret: string };

    return new Response(
      JSON.stringify({
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("stripe-terminal-charge error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
