// confirm-deposit
// Called by DepositInterface.jsx after Stripe redirects back with ?payment_intent=pi_xxx
// Retrieves PaymentIntent from Stripe, verifies it succeeded, idempotently credits liquid_usd
// This is the fallback when webhook hasn't fired yet (or is disabled)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders as buildCors, getAuthedUser } from "../_shared/auth.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let user;
  try {
    user = await getAuthedUser(req);
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { payment_intent_id?: string };
  try { body = await req.json(); } catch { body = {}; }

  const piId = body.payment_intent_id;
  if (!piId || !piId.startsWith("pi_")) {
    return new Response(JSON.stringify({ error: "Invalid payment_intent_id" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Retrieve and verify the PaymentIntent from Stripe
  let pi: Stripe.PaymentIntent;
  try {
    pi = await stripe.paymentIntents.retrieve(piId);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Stripe retrieve error:", msg);
    return new Response(JSON.stringify({ error: "Could not retrieve payment" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Verify this PI belongs to the authenticated user
  if (pi.metadata?.user_id !== user.id) {
    return new Response(JSON.stringify({ error: "Payment does not belong to this user" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (pi.status !== "succeeded") {
    return new Response(JSON.stringify({ error: `Payment not completed (status: ${pi.status})` }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (pi.currency !== "usd") {
    return new Response(JSON.stringify({ error: "Unsupported currency" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const amountUsd = pi.amount_received / 100;

  // Use service role for balance writes (same as webhook)
  const adminSupabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Atomic + idempotent credit keyed by PaymentIntent id (shared with stripe-webhook)
  const { data: credited, error: creditErr } = await adminSupabase.rpc("credit_deposit", {
    p_user_id: user.id,
    p_amount: amountUsd,
    p_currency: "USD",
    p_external_id: piId,
    p_source: "stripe",
  });
  if (creditErr) {
    console.error("credit_deposit failed:", piId, creditErr.message);
    return new Response(JSON.stringify({ error: "Could not credit deposit" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!credited) {
    return new Response(
      JSON.stringify({ credited: amountUsd, already_credited: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  await adminSupabase.from("app_telemetry").insert([{
    event: "stripe_deposit_confirmed_client",
    metadata: { user_id: user.id, amount_usd: amountUsd, payment_intent_id: piId },
  }]);

  // Auto-mint AFR at 100:1 ratio
  try {
    const { data: mintRatioCfg } = await adminSupabase.from("app_config").select("value").eq("key", "afr_mint_ratio").maybeSingle();
    const mintRatio = Number(mintRatioCfg?.value ?? 100);
    const afrAmount = amountUsd * mintRatio;

    const { data: afrBal } = await adminSupabase.from("balances").select("afr_balance").eq("user_id", user.id).maybeSingle();
    if (afrBal) {
      await adminSupabase.from("balances").update({ afr_balance: (afrBal.afr_balance || 0) + afrAmount }).eq("user_id", user.id);
    }

    await adminSupabase.from("afr_ledger").insert([{
      user_id: user.id,
      tx_type: "deposit_conversion",
      afr_amount: afrAmount,
      usd_equivalent: amountUsd,
      status: "confirmed",
      notes: `Auto-mint from confirmed Stripe deposit ${piId} at ${mintRatio}:1`,
    }]);
  } catch (e) {
    console.warn("AFR auto-mint error (non-blocking):", e);
  }

  console.log(`confirm-deposit: credited $${amountUsd} to ${user.id}`);

  return new Response(
    JSON.stringify({ credited: amountUsd, already_credited: false }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
