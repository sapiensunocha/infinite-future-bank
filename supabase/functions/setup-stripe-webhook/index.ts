// setup-stripe-webhook — one-time run to register the live Stripe webhook
// Deletes stale IFB webhook endpoints and creates a fresh one
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14";

const WEBHOOK_URL = "https://nfztdpyygfrpbjbhidxe.supabase.co/functions/v1/stripe-webhook";

const REQUIRED_EVENTS = [
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });

  // Validate key works
  try { await stripe.balance.retrieve(); }
  catch (e) {
    return new Response(JSON.stringify({ error: "Stripe key invalid: " + (e as Error).message }), { status: 400 });
  }

  const results: Record<string, unknown> = {};

  // Remove all existing IFB webhook endpoints for this project
  try {
    const list = await stripe.webhookEndpoints.list({ limit: 30 });
    for (const w of list.data) {
      if (w.url.includes("nfztdpyygfrpbjbhidxe")) {
        await stripe.webhookEndpoints.del(w.id);
        results[`deleted_${w.id}`] = w.url;
      }
    }
  } catch (e) {
    results.cleanup_warning = (e as Error).message;
  }

  // Create fresh endpoint
  const wh = await stripe.webhookEndpoints.create({
    url: WEBHOOK_URL,
    enabled_events: REQUIRED_EVENTS as Stripe.WebhookEndpointCreateParams.EnabledEvent[],
    description: "IFB DEUS — live payment events",
  });

  results.created = { id: wh.id, url: wh.url, status: wh.status, secret: wh.secret };

  // Update STRIPE_WEBHOOK_SECRET via Supabase Management API if token available
  const token = Deno.env.get("SUPABASE_ACCESS_TOKEN");
  if (token && wh.secret) {
    const r = await fetch("https://api.supabase.com/v1/projects/nfztdpyygfrpbjbhidxe/secrets", {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([{ name: "STRIPE_WEBHOOK_SECRET", value: wh.secret }]),
    });
    results.secret_auto_updated = r.ok;
  } else {
    results.next_step = `supabase secrets set STRIPE_WEBHOOK_SECRET=${wh.secret}`;
  }

  return new Response(JSON.stringify({ success: true, ...results }, null, 2), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
});
