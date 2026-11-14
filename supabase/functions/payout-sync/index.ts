// payout-sync — settle bank payouts that are still "processing".
//
// Flutterwave accepts a transfer first and completes or fails it afterwards, then reports
// the result by webhook. If that webhook never arrives, the order stays "flw_processing"
// and a failed payout is never refunded. This asks Flutterwave for the real status of each
// processing payout and applies it:
//   SUCCESSFUL → order completed, customer notified
//   FAILED     → refund_withdrawal (idempotent), order failed, customer notified
//   anything else → left for the next run
//
// POST {} with no login (verify_jwt = false): it takes no input and acts only on what
// Flutterwave reports for orders the database already holds. Called by pg_cron every 5 minutes.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, errorResponse, HttpError, jsonResponse } from "../_shared/auth.ts";
import { transferBase, transferHeaders } from "../_shared/flw-relay.ts";
import { payoutOutcome } from "../_shared/payout-status.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });
  try {
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
    const secret = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
    if (!secret) throw new HttpError(503, "Payouts are not configured");
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

    // Give Flutterwave two minutes before the first check; look back a week.
    const before = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: orders, error } = await admin.from("p2p_orders")
      .select("id, user_id, amount_usd, status, metadata, created_at")
      .eq("status", "flw_processing").lt("created_at", before).gt("created_at", since)
      .order("created_at", { ascending: true }).limit(20);
    if (error) throw new Error(`p2p_orders: ${error.code}`);

    let completed = 0, refunded = 0, waiting = 0, errors = 0;
    for (const o of orders ?? []) {
      // deno-lint-ignore no-explicit-any
      const meta = (o.metadata ?? {}) as Record<string, any>;
      const transferId = String(meta.flw_transfer_id ?? "");
      const reference = String(meta.flw_reference ?? "");
      if (!/^\d{1,20}$/.test(transferId) || !reference) { waiting++; continue; }
      try {
        const res = await fetch(`${transferBase()}/transfers/${transferId}`, {
          headers: { Authorization: `Bearer ${secret}`, ...transferHeaders() },
          signal: AbortSignal.timeout(15_000),
        });
        const j = await res.json().catch(() => null);
        const outcome = payoutOutcome(res.status, j, reference);
        if (outcome.state === "completed") {
          const { data: upd } = await admin.from("p2p_orders")
            .update({ status: "completed", completed_at: new Date().toISOString(), metadata: { ...meta, completed_at: new Date().toISOString(), settled_by: "payout-sync" } })
            .eq("id", o.id).eq("status", "flw_processing").select("id");
          if (upd?.length) {
            completed++;
            await admin.from("notifications").insert([{ user_id: o.user_id, type: "payment_sent", read: false, status: "completed",
              message: `Your $${o.amount_usd} withdrawal has been delivered. Ref: ${reference}` }]);
          }
        } else if (outcome.state === "failed") {
          const { error: refundErr } = await admin.rpc("refund_withdrawal", { p_external_id: reference });
          if (refundErr) { errors++; console.error("payout-sync: refund_withdrawal failed:", reference, refundErr.code); continue; }
          const { data: upd } = await admin.from("p2p_orders")
            .update({ status: "failed", metadata: { ...meta, failed_at: new Date().toISOString(), failure_reason: outcome.reason, settled_by: "payout-sync" } })
            .eq("id", o.id).eq("status", "flw_processing").select("id");
          if (upd?.length) {
            refunded++;
            const back = Number(o.amount_usd) + Number(meta.fee_usd ?? 0);
            await admin.from("notifications").insert([{ user_id: o.user_id, type: "payment_failed", read: false, status: "failed",
              message: `Your $${o.amount_usd} withdrawal could not be completed. $${back.toFixed(2)} is back in your wallet.` }]);
            await admin.from("app_telemetry").insert([{ event: "bank_payout_failed", metadata: { reference, reason: outcome.reason, debit_currency: meta.debit_currency ?? null } }]);
          }
        } else {
          waiting++;
        }
      } catch (e) {
        errors++;
        console.error("payout-sync: check failed:", e instanceof Error ? e.message : "error");
      }
    }
    return jsonResponse(req, { checked: orders?.length ?? 0, completed, refunded, waiting, errors });
  } catch (err) {
    return errorResponse(req, err);
  }
});
