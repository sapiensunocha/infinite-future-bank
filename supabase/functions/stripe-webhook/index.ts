// Stripe Webhook Handler
// Listens for payment_intent.succeeded / checkout.session.completed → credit_deposit() (idempotent per PaymentIntent)
// Register this URL in your Stripe dashboard: https://<project>.supabase.co/functions/v1/stripe-webhook
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
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
    return new Response("Webhook signature verification failed", { status: 400 });
  }

  // All crediting goes through credit_deposit(), keyed by the PaymentIntent id, so
  // the webhook, checkout.session.completed and confirm-deposit can't double-credit.
  let credit: { userId: string; amountUsd: number; piId: string; currency: string; metadata: Record<string, string> } | null = null;

  // ── payment_intent.succeeded → credit liquid_usd ─────────────────────────
  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    credit = { userId: pi.metadata?.user_id ?? "", amountUsd: pi.amount_received / 100, piId: pi.id, currency: pi.currency, metadata: pi.metadata ?? {} };
  }

  // ── checkout.session.completed → same credit, keyed by its payment_intent ──
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const piId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
    if (session.payment_status === "paid" && piId) {
      credit = {
        userId: session.metadata?.user_id || session.client_reference_id || "",
        amountUsd: (session.amount_total ?? 0) / 100,
        piId,
        currency: session.currency ?? "",
        metadata: (session.metadata ?? {}) as Record<string, string>,
      };
    }
  }

  // Payments for services (not wallet deposits) must not be credited back to the payer.
  if (credit && credit.metadata.type === "ifb_engagement") credit = null;

  if (credit) {
    const { userId, amountUsd, piId, currency } = credit;

    if (!userId) {
      console.warn("Stripe payment has no user_id metadata:", piId);
      return new Response("Missing user_id in metadata", { status: 200 });
    }
    if (currency !== "usd") {
      console.warn("Non-USD payment not credited to liquid_usd:", piId, currency);
      return new Response(JSON.stringify({ received: true, skipped: true }), { status: 200 });
    }

    const { data: credited, error: creditErr } = await supabase.rpc("credit_deposit", {
      p_user_id: userId,
      p_amount: amountUsd,
      p_currency: "USD",
      p_external_id: piId,
      p_source: "stripe",
    });
    if (creditErr) {
      console.error("credit_deposit failed:", piId, creditErr.message);
      return new Response("credit failed", { status: 500 }); // Stripe will retry
    }
    if (!credited) {
      console.log("Already credited:", piId);
      return new Response(JSON.stringify({ received: true, skipped: true }), { status: 200 });
    }

    // Telemetry
    await supabase.from("app_telemetry").insert([{
      event: "stripe_deposit_credited",
      metadata: { user_id: userId, amount_usd: amountUsd, payment_intent_id: piId },
    }]);

    // Auto-mint AFR tokens at 100:1 ratio inline (runs once: only after a first-time credit)
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
        notes: `Auto-mint from Stripe deposit ${piId} at ${mintRatio}:1`,
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

    console.log(`Credited $${amountUsd} for ${piId}`);
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
