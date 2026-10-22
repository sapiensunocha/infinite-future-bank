// flutterwave-webhook
// Handles all Flutterwave event callbacks:
//   charge.completed  → credit liquid_usd (mobile money deposit confirmed)
//   transfer.completed → mark withdrawal order as completed
//   transfer.failed    → refund liquid_usd + notify user to retry
// Register this URL in Flutterwave Dashboard → Settings → Webhooks:
//   https://<project-ref>.supabase.co/functions/v1/flutterwave-webhook
// Set the same secret hash in FLW Dashboard and FLUTTERWAVE_WEBHOOK_HASH secret.
import { createClient } from "npm:@supabase/supabase-js@2";

const WEBHOOK_HASH = Deno.env.get("FLUTTERWAVE_WEBHOOK_HASH");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Approximate rates — update quarterly or replace with a live FX API call.
// These prevent the 100x bug where e.g. 15,000 GHS credits as $15,000 USD.
const FX_TO_USD: Record<string, number> = {
  USD: 1, EUR: 1.09, GBP: 1.27,
  NGN: 0.00063, GHS: 0.065,  KES: 0.0077,
  UGX: 0.00027, TZS: 0.00038, ZAR: 0.055,
  XOF: 0.0017,  XAF: 0.0017,  RWF: 0.00073,
  EGP: 0.020,   MAD: 0.099,   ZMW: 0.036,
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Verify FLW signature — reject requests when secret is not configured
  if (!WEBHOOK_HASH) {
    console.error("FLW webhook: FLUTTERWAVE_WEBHOOK_HASH secret not set — rejecting all requests");
    return new Response("Webhook not configured", { status: 500 });
  }
  const signature = req.headers.get("verif-hash");
  if (signature !== WEBHOOK_HASH) {
    console.error("FLW webhook: invalid signature");
    return new Response("Forbidden", { status: 403 });
  }

  let event: Record<string, unknown>;
  try { event = await req.json(); }
  catch { return new Response("Bad JSON", { status: 400 }); }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  const eventType = event.event as string;
  const data      = event.data as Record<string, unknown> ?? {};

  // ── charge.completed — mobile money / card collection succeeded ──────────────
  if (eventType === "charge.completed") {
    const status     = data.status as string;
    const txRef      = data.tx_ref as string;    // our reference from flutterwave-collect
    const flwRef     = data.flw_ref as string;
    const amountPaid = Number(data.amount ?? 0);
    const currency   = data.currency as string;

    if (status !== "successful") {
      console.log("charge not successful, skipping:", status);
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    // txRef format: IFB.COLLECT.{userId}.{timestamp} (dots separate segments, UUID is always 36 chars)
    const PREFIX = "IFB.COLLECT.";
    const userIdFromRef = txRef?.startsWith(PREFIX)
      ? txRef.substring(PREFIX.length, PREFIX.length + 36)
      : null;
    if (!userIdFromRef) {
      console.warn("FLW charge.completed: cannot parse user_id from tx_ref:", txRef);
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    // Idempotency — don't double-credit
    const { data: existing } = await sb.from("transactions")
      .select("id")
      .eq("user_id", userIdFromRef)
      .ilike("description", `%${flwRef}%`)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ received: true, skipped: true }), { status: 200 });
    }

    // Convert to USD using rate table. Blocks unknown currencies to avoid crediting wrong amounts.
    const rate = FX_TO_USD[currency?.toUpperCase()];
    if (rate === undefined) {
      console.error(`FLW charge.completed: unsupported currency ${currency} — manual review required`);
      await sb.from("app_telemetry").insert([{
        event: "flw_unsupported_currency",
        metadata: { user_id: userIdFromRef, amount: amountPaid, currency, tx_ref: txRef, flw_ref: flwRef },
      }]);
      return new Response(JSON.stringify({ received: true, error: "unsupported_currency" }), { status: 200 });
    }
    const amountUsd = Math.round(amountPaid * rate * 100) / 100;

    const { data: bal } = await sb.from("balances").select("liquid_usd, afr_balance").eq("user_id", userIdFromRef).maybeSingle();

    if (bal) {
      await sb.from("balances")
        .update({ liquid_usd: (bal.liquid_usd ?? 0) + amountUsd })
        .eq("user_id", userIdFromRef);
    } else {
      await sb.from("balances")
        .insert([{ user_id: userIdFromRef, liquid_usd: amountUsd, afr_balance: 0 }]);
    }

    await sb.from("transactions").insert([{
      user_id:          userIdFromRef,
      transaction_type: "flw_deposit",
      amount:           amountUsd,
      description:      `Mobile Money deposit via Flutterwave — ${flwRef}`,
      status:           "completed",
      metadata:         { flw_ref: flwRef, tx_ref: txRef, currency, raw_amount: amountPaid },
    }]);

    // Auto-mint AFR at configured ratio (default 100:1)
    try {
      const { data: mintCfg } = await sb.from("app_config").select("value").eq("key", "afr_mint_ratio").maybeSingle();
      const mintRatio = Number(mintCfg?.value ?? 100);
      const afrAmount = amountUsd * mintRatio;

      await sb.from("balances")
        .update({ afr_balance: ((bal?.afr_balance ?? 0) + afrAmount) })
        .eq("user_id", userIdFromRef);

      await sb.from("afr_ledger").insert([{
        user_id:       userIdFromRef,
        tx_type:       "deposit_conversion",
        afr_amount:    afrAmount,
        usd_equivalent: amountUsd,
        status:        "confirmed",
        notes:         `Auto-mint from FLW mobile money deposit ${flwRef} at ${mintRatio}:1`,
      }]);

      await sb.from("notifications").insert([{
        user_id: userIdFromRef,
        type:    "payment_received",
        read:    false,
        status:  "completed",
        message: `$${amountUsd} deposited via Mobile Money. ${afrAmount.toLocaleString()} AFR minted.`,
      }]);
    } catch (e) {
      console.warn("AFR auto-mint error (non-blocking):", e);
    }

    await sb.from("app_telemetry").insert([{
      event:    "flw_charge_credited",
      metadata: { user_id: userIdFromRef, amount_usd: amountUsd, flw_ref: flwRef, currency },
    }]);

    console.log(`FLW deposit: credited $${amountUsd} to user ${userIdFromRef}`);
  }

  // ── transfer.completed — withdrawal payout confirmed by FLW ─────────────────
  if (eventType === "transfer.completed") {
    const flwRef    = (data.reference as string) ?? "";
    const flwId     = data.id as number;
    const flwStatus = (data.status as string)?.toLowerCase();

    // Find the matching p2p_order by flw_reference in metadata
    const { data: order } = await sb.from("p2p_orders")
      .select("id, user_id, amount_usd, metadata")
      .filter("metadata->flw_reference", "eq", flwRef)
      .maybeSingle();

    if (!order) {
      console.warn("FLW transfer.completed: no order found for reference:", flwRef);
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    if (flwStatus === "successful") {
      await sb.from("p2p_orders")
        .update({ status: "completed", metadata: { ...(order.metadata as object), flw_id: flwId, completed_at: new Date().toISOString() } })
        .eq("id", order.id);

      await sb.from("transactions").insert([{
        user_id:          order.user_id,
        transaction_type: "flw_withdrawal",
        amount:           order.amount_usd,
        description:      `Mobile Money withdrawal settled — ${flwRef}`,
        status:           "completed",
        metadata:         { flw_id: flwId, order_id: order.id },
      }]);

      await sb.from("notifications").insert([{
        user_id: order.user_id,
        type:    "payment_sent",
        read:    false,
        status:  "completed",
        message: `Your $${order.amount_usd} withdrawal has been delivered. Ref: ${flwRef}`,
      }]);

      console.log(`FLW withdrawal settled: $${order.amount_usd} for order ${order.id}`);
    }

    // transfer failed — refund the user
    if (flwStatus === "failed") {
      const meta    = order.metadata as Record<string, number> ?? {};
      const fee     = Number(meta.fee_usd ?? 0);
      const refund  = order.amount_usd + fee;

      const { data: bal } = await sb.from("balances").select("liquid_usd").eq("user_id", order.user_id).maybeSingle();
      if (bal) {
        await sb.from("balances")
          .update({ liquid_usd: (bal.liquid_usd ?? 0) + refund })
          .eq("user_id", order.user_id);
      }

      await sb.from("p2p_orders")
        .update({ status: "failed", metadata: { ...(order.metadata as object), flw_id: flwId, failed_at: new Date().toISOString() } })
        .eq("id", order.id);

      await sb.from("notifications").insert([{
        user_id: order.user_id,
        type:    "payment_failed",
        read:    false,
        status:  "failed",
        message: `Your $${order.amount_usd} withdrawal failed. $${refund.toFixed(2)} has been refunded to your account.`,
      }]);

      console.warn(`FLW withdrawal FAILED: refunded $${refund} to user ${order.user_id}`);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
