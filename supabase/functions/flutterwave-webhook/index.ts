// flutterwave-webhook
// Handles all Flutterwave event callbacks:
//   charge.completed  → credit liquid_usd (mobile money deposit confirmed)
//   transfer.completed → mark withdrawal order as completed
//   transfer.failed    → refund liquid_usd + notify user to retry
// Register this URL in Flutterwave Dashboard → Settings → Webhooks:
//   https://<project-ref>.supabase.co/functions/v1/flutterwave-webhook
// Set the same secret hash in FLW Dashboard and FLUTTERWAVE_WEBHOOK_HASH secret.
import { createClient } from "npm:@supabase/supabase-js@2";
import { timingSafeEqualStr } from "../_shared/auth.ts";

const WEBHOOK_HASH = Deno.env.get("FLUTTERWAVE_WEBHOOK_HASH");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const FLW_SECRET   = Deno.env.get("FLUTTERWAVE_SECRET_KEY") ?? "";
const FLW_BASE     = "https://api.flutterwave.com/v3";

// Approximate rates — update quarterly or replace with a live FX API call.
// These prevent the 100x bug where e.g. 15,000 GHS credits as $15,000 USD.
const FX_TO_USD: Record<string, number> = {
  USD: 1, EUR: 1.09, GBP: 1.27,
  NGN: 0.00063, GHS: 0.065,  KES: 0.0077,
  UGX: 0.00027, TZS: 0.00038, ZAR: 0.055,
  XOF: 0.0017,  XAF: 0.0017,  RWF: 0.00073,
  EGP: 0.020,   MAD: 0.099,   ZMW: 0.036,
};

Deno.serve(async (req) => {
  // Verify FLW signature — reject requests when secret is not configured
  if (!WEBHOOK_HASH) {
    console.error("FLW webhook: FLUTTERWAVE_WEBHOOK_HASH secret not set — rejecting all requests");
    return new Response("Webhook not configured", { status: 500 });
  }
  const signature = req.headers.get("verif-hash");
  if (!signature || !timingSafeEqualStr(signature, WEBHOOK_HASH)) {
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
  // The webhook body is only a hint: we re-fetch the transaction from Flutterwave
  // (GET /transactions/{id}/verify) and credit only the verified amount/currency.
  if (eventType === "charge.completed") {
    const flwTxId = Number(data.id);
    if (!Number.isFinite(flwTxId) || flwTxId <= 0) {
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    let verified: Record<string, unknown> | null = null;
    try {
      const vRes = await fetch(`${FLW_BASE}/transactions/${flwTxId}/verify`, {
        headers: { "Authorization": `Bearer ${FLW_SECRET}` },
      });
      const vJson = await vRes.json();
      if (vRes.ok && vJson?.status === "success") verified = vJson.data;
    } catch (e) {
      console.error("FLW verify request failed:", e instanceof Error ? e.message : e);
    }
    if (!verified) {
      return new Response("verification failed", { status: 500 }); // FLW retries
    }

    const status     = verified.status as string;
    const txRef      = verified.tx_ref as string;    // our reference from flutterwave-collect
    const flwRef     = verified.flw_ref as string;
    const amountPaid = Number(verified.amount ?? 0);
    const currency   = verified.currency as string;

    if (status !== "successful" || !(amountPaid > 0)) {
      console.log("charge not successful, skipping:", status);
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    // txRef format: IFB.COLLECT.{userId}.{timestamp} (dots separate segments, UUID is always 36 chars)
    const PREFIX = "IFB.COLLECT.";
    const userIdFromRef = txRef?.startsWith(PREFIX)
      ? txRef.substring(PREFIX.length, PREFIX.length + 36)
      : null;
    if (!userIdFromRef || !/^[0-9a-f-]{36}$/i.test(userIdFromRef)) {
      console.warn("FLW charge.completed: cannot parse user_id from tx_ref");
      return new Response(JSON.stringify({ received: true }), { status: 200 });
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

    // Atomic, idempotent credit keyed by the Flutterwave transaction id
    const { data: credited, error: creditErr } = await sb.rpc("credit_deposit", {
      p_user_id: userIdFromRef,
      p_amount: amountUsd,
      p_currency: "USD",
      p_external_id: `flw:${flwTxId}`,
      p_source: "flutterwave",
    });
    if (creditErr) {
      console.error("FLW credit_deposit failed:", flwTxId, creditErr.message);
      return new Response("credit failed", { status: 500 });
    }
    if (!credited) {
      return new Response(JSON.stringify({ received: true, skipped: true }), { status: 200 });
    }

    // Auto-mint AFR at configured ratio (default 100:1) — once, after a first-time credit
    try {
      const { data: mintCfg } = await sb.from("app_config").select("value").eq("key", "afr_mint_ratio").maybeSingle();
      const mintRatio = Number(mintCfg?.value ?? 100);
      const afrAmount = amountUsd * mintRatio;

      const { data: bal } = await sb.from("balances").select("afr_balance").eq("user_id", userIdFromRef).maybeSingle();
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
      metadata: { user_id: userIdFromRef, amount_usd: amountUsd, flw_ref: flwRef, flw_tx_id: flwTxId, currency },
    }]);

    console.log(`FLW deposit: credited $${amountUsd} for tx ${flwTxId}`);
  }

  // ── transfer.completed — withdrawal payout confirmed by FLW ─────────────────
  if (eventType === "transfer.completed") {
    const flwRef    = (data.reference as string) ?? "";
    const flwId     = data.id as number;
    const flwStatus = (data.status as string)?.toLowerCase();

    // Find the matching p2p_order by flw_reference in metadata
    const { data: order } = await sb.from("p2p_orders")
      .select("id, user_id, amount_usd, status, metadata")
      .filter("metadata->>flw_reference", "eq", flwRef)
      .maybeSingle();

    if (!order) {
      console.warn("FLW transfer.completed: no order found for reference:", flwRef);
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }
    // Event-level dedupe: a finalized order is never re-processed
    if (order.status === "completed" || order.status === "failed") {
      return new Response(JSON.stringify({ received: true, skipped: true }), { status: 200 });
    }

    if (flwStatus === "successful") {
      await sb.from("p2p_orders")
        .update({ status: "completed", metadata: { ...(order.metadata as object), flw_id: flwId, completed_at: new Date().toISOString() } })
        .eq("id", order.id);

      // (ledger entry was written by debit_for_withdrawal when the payout was initiated)

      await sb.from("notifications").insert([{
        user_id: order.user_id,
        type:    "payment_sent",
        read:    false,
        status:  "completed",
        message: `Your $${order.amount_usd} withdrawal has been delivered. Ref: ${flwRef}`,
      }]);

      console.log(`FLW withdrawal settled: $${order.amount_usd} for order ${order.id}`);
    }

    // transfer failed — refund the user (idempotent: keyed by our transfer reference)
    if (flwStatus === "failed") {
      const meta    = order.metadata as Record<string, number> ?? {};
      const fee     = Number(meta.fee_usd ?? 0);
      const refund  = order.amount_usd + fee;

      const { error: refundErr } = await sb.rpc("refund_withdrawal", { p_external_id: flwRef });
      if (refundErr) {
        console.error("FLW refund_withdrawal failed:", flwRef, refundErr.message);
        return new Response("refund failed", { status: 500 }); // FLW retries
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
    headers: { "Content-Type": "application/json" },
  });
});
