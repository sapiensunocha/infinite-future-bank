// Stripe Webhook Handler
// Listens for payment_intent.succeeded → credits user's liquid_usd balance
// Register this URL in your Stripe dashboard: https://<project>.supabase.co/functions/v1/stripe-webhook
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req: Request) => {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  // Verify Stripe signature — reject anything that didn't come from Stripe
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig!,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Webhook signature failed:", msg);
    return new Response(`Webhook Error: ${msg}`, { status: 400 });
  }

  // ── payment_intent.succeeded → credit liquid_usd ─────────────────────────
  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    const userId = pi.metadata?.user_id;
    const amountUsd = pi.amount / 100; // Stripe stores in cents

    if (!userId) {
      console.warn("PaymentIntent has no user_id metadata:", pi.id);
      return new Response("Missing user_id in metadata", { status: 200 });
    }

    // Idempotency check — don't double-credit if webhook fires twice
    const { data: existing } = await supabase
      .from("transactions")
      .select("id")
      .eq("type", "stripe_deposit")
      .ilike("description", `%${pi.id}%`)
      .maybeSingle();

    if (existing) {
      console.log("Already credited:", pi.id);
      return new Response(JSON.stringify({ received: true, skipped: true }), { status: 200 });
    }

    // Upsert balance — handles first-time users with no balance row
    const { data: bal } = await supabase
      .from("balances")
      .select("liquid_usd")
      .eq("user_id", userId)
      .maybeSingle();

    if (bal) {
      await supabase
        .from("balances")
        .update({ liquid_usd: (bal.liquid_usd || 0) + amountUsd })
        .eq("user_id", userId);
    } else {
      await supabase
        .from("balances")
        .insert([{ user_id: userId, liquid_usd: amountUsd, afr_balance: 0 }]);
    }

    // Log the inflow as a transaction
    await supabase.from("transactions").insert([{
      user_id: userId,
      type: "stripe_deposit",
      amount: amountUsd,
      description: `Stripe deposit — ${pi.id}`,
      status: "completed",
    }]);

    // Telemetry
    await supabase.from("app_telemetry").insert([{
      event: "stripe_deposit_credited",
      metadata: { user_id: userId, amount_usd: amountUsd, payment_intent_id: pi.id },
    }]);

    // Auto-mint AFR tokens at 100:1 ratio inline
    try {
      const { data: mintRatioCfg } = await supabase.from("app_config").select("value").eq("key", "afr_mint_ratio").maybeSingle();
      const mintRatio = Number(mintRatioCfg?.value ?? 100);
      const afrAmount = amountUsd * mintRatio;

      const { data: afrBal } = await supabase.from("balances").select("afr_balance").eq("user_id", userId).maybeSingle();
      if (afrBal) {
        await supabase.from("balances").update({ afr_balance: (afrBal.afr_balance || 0) + afrAmount }).eq("user_id", userId);
      } else {
        await supabase.from("balances").update({ afr_balance: afrAmount }).eq("user_id", userId);
      }

      await supabase.from("afr_ledger").insert([{
        user_id: userId,
        tx_type: "deposit_conversion",
        afr_amount: afrAmount,
        usd_equivalent: amountUsd,
        status: "confirmed",
        notes: `Auto-mint from Stripe deposit ${pi.id} at ${mintRatio}:1`,
      }]);

      await supabase.from("notifications").insert([{
        user_id: userId,
        type: "payment_received",
        read: false,
        status: "completed",
        message: `${afrAmount.toLocaleString()} AFR minted from your $${amountUsd} deposit`,
      }]);
    } catch (e) {
      console.warn("AFR auto-mint error (non-blocking):", e);
    }

    console.log(`Credited $${amountUsd} to user ${userId}`);
  }

  // ── payment_intent.payment_failed → log it ───────────────────────────────
  if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object as Stripe.PaymentIntent;
    const userId = pi.metadata?.user_id;
    if (userId) {
      await supabase.from("app_telemetry").insert([{
        event: "stripe_payment_failed",
        metadata: { user_id: userId, payment_intent_id: pi.id, error: pi.last_payment_error?.message },
      }]);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
