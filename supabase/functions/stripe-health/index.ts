import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14";
Deno.serve(async () => {
  const key = Deno.env.get("STRIPE_SECRET_KEY") || "";
  const stripe = new Stripe(key, { apiVersion: "2023-10-16" });
  try {
    await stripe.balance.retrieve();
    // Test if key can CREATE (write) - use idempotency key so no charge happens
    let canWrite = false;
    try {
      await stripe.paymentIntents.create(
        { amount: 100, currency: "usd", automatic_payment_methods: { enabled: true } },
        { idempotencyKey: "health-check-probe-do-not-process" }
      );
      canWrite = true;
    } catch(e: any) { canWrite = !(e.message||"").includes("permissions"); }
    return new Response(JSON.stringify({
      ok: true,
      key_type: key.startsWith("sk_live") ? "live_full" : key.startsWith("rk_live") ? "live_restricted" : key.startsWith("sk_test") ? "test" : "unknown",
      key_suffix: key.slice(-6),
      can_write: canWrite,
    }), { headers: { "Content-Type": "application/json" } });
  } catch(e: any) {
    return new Response(JSON.stringify({
      ok: false,
      error: e.message,
      key_type: key.startsWith("sk_live") ? "live_full" : key.startsWith("rk_live") ? "live_restricted" : key.startsWith("sk_test") ? "test" : "unknown",
      key_suffix: key.slice(-6),
    }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
});
