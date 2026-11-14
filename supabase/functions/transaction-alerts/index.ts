// transaction-alerts — email + push for each transaction, if the user turned it on.
//
//   POST {}                                     → drain the queue (called by the database
//                                                 trigger and a pg_cron sweep; no login, no input)
//   POST { action: "vapid_key" }                → { key }  public key the browser needs to subscribe
//   POST { action: "subscribe", subscription }  → save this device's push subscription (login required)
//   POST { action: "unsubscribe", endpoint }    → remove it (login required)
//
// verify_jwt = false. The drain takes no parameters: it only sends alerts that the
// database queued for real transactions, each exactly once (claim_transaction_alerts).
// Never log emails, amounts or push endpoints.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { corsHeaders, errorResponse, getAuthedUser, HttpError, jsonResponse } from "../_shared/auth.ts";
import { esc, sendEmail } from "../_shared/notify.ts";
import { alertText, validSubscription } from "../_shared/tx-alerts.ts";

const FROM = Deno.env.get("EMAIL_FROM") ?? "Infinite Future Bank <noreply@infinitefuturebank.org>";
const APP_URL = Deno.env.get("APP_URL") ?? "https://app.infinitefuturebank.org";
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const pushReady = !!(VAPID_PUBLIC && VAPID_PRIVATE);
if (pushReady) {
  try { webpush.setVapidDetails("mailto:support@infinitefuturebank.org", VAPID_PUBLIC, VAPID_PRIVATE); } catch { /* bad keys → push skipped */ }
}

// deno-lint-ignore no-explicit-any
type Db = any;

async function sendPushTo(admin: Db, userId: string, payload: string): Promise<string> {
  if (!pushReady) return "skipped:push_not_configured";
  const { data: subs } = await admin.from("push_subscriptions").select("id, subscription").eq("user_id", userId).limit(10);
  if (!subs?.length) return "skipped:no_device";
  let sent = 0, failed = 0;
  for (const s of subs) {
    const sub = typeof s.subscription === "string" ? JSON.parse(s.subscription) : s.subscription;
    if (!validSubscription(sub)) { failed++; continue; }
    try {
      await webpush.sendNotification(sub, payload, { TTL: 3600 });
      sent++;
    } catch (e) {
      failed++;
      // deno-lint-ignore no-explicit-any
      const code = (e as any)?.statusCode;
      if (code === 404 || code === 410) await admin.from("push_subscriptions").delete().eq("id", s.id); // device unsubscribed
    }
  }
  return sent ? `sent:${sent}` : `failed:${failed}`;
}

async function drain(admin: Db): Promise<{ processed: number }> {
  const { data: alerts, error } = await admin.rpc("claim_transaction_alerts", { p_limit: 25 });
  if (error) throw new Error(`claim_transaction_alerts: ${error.code}`);
  let processed = 0;
  for (const a of alerts ?? []) {
    let emailStatus = "skipped:off", pushStatus = "skipped:off";
    try {
      const [{ data: tx }, { data: prof }] = await Promise.all([
        admin.from("transactions").select("id, amount, transaction_type, description, status, created_at").eq("id", a.transaction_id).maybeSingle(),
        admin.from("profiles").select("email, full_name, pref_notif_tx_email, pref_notif_tx_push").eq("id", a.user_id).maybeSingle(),
      ]);
      if (!tx || !prof) {
        emailStatus = pushStatus = "skipped:not_found";
      } else {
        const t = alertText(tx);
        if (prof.pref_notif_tx_email && prof.email) {
          const html =
            `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#0f172a">` +
            `<h2 style="margin:0 0 4px">${esc(t.title)}</h2>` +
            `<p style="margin:0 0 16px;color:#475569">Hi ${esc(prof.full_name || "there")}, here is a transaction on your IFB account.</p>` +
            `<table style="border-collapse:collapse;width:100%">` +
            `<tr><td style="padding:8px 0;color:#64748b">Amount</td><td style="padding:8px 0;text-align:right;font-weight:bold;font-size:18px">${esc(t.amount)}</td></tr>` +
            `<tr><td style="padding:8px 0;color:#64748b">Type</td><td style="padding:8px 0;text-align:right">${esc(t.kind)}</td></tr>` +
            (t.detail ? `<tr><td style="padding:8px 0;color:#64748b">Details</td><td style="padding:8px 0;text-align:right">${esc(t.detail)}</td></tr>` : "") +
            `<tr><td style="padding:8px 0;color:#64748b">Date</td><td style="padding:8px 0;text-align:right">${esc(t.when)}</td></tr>` +
            `<tr><td style="padding:8px 0;color:#64748b">Transaction ID</td><td style="padding:8px 0;text-align:right;font-family:monospace;font-size:12px">${esc(tx.id)}</td></tr>` +
            `</table>` +
            `<p style="margin:20px 0 0;color:#475569;font-size:13px">If you did not make this transaction, open the app and go to Help → Report a problem right away.</p>` +
            `<p style="margin:12px 0 0;color:#94a3b8;font-size:12px">You get this email because transaction emails are on in Settings → Notifications. IFB never asks for your password or PIN by email.</p>` +
            `</div>`;
          emailStatus = await sendEmail([prof.email], `${t.title}: ${t.amount}`, html, { from: FROM });
        }
        if (prof.pref_notif_tx_push) {
          pushStatus = await sendPushTo(admin, a.user_id, JSON.stringify({ title: t.title, body: `${t.amount} · ${t.kind}`, url: APP_URL + "/", tag: `tx-${tx.id}` }));
        }
      }
    } catch (e) {
      console.error("transaction-alerts: send failed:", e instanceof Error ? e.message : "error");
      if (emailStatus === "skipped:off") emailStatus = "failed:error";
    }
    await admin.from("transaction_alerts").update({ processed_at: new Date().toISOString(), email_status: emailStatus, push_status: pushStatus }).eq("id", a.id);
    processed++;
  }
  return { processed };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });
  try {
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");

    if (action === "vapid_key") {
      if (!pushReady) throw new HttpError(503, "Push notifications are not configured yet");
      return jsonResponse(req, { key: VAPID_PUBLIC });
    }

    if (action === "subscribe") {
      const user = await getAuthedUser(req);
      const sub = body.subscription;
      if (!validSubscription(sub)) throw new HttpError(400, "Invalid push subscription");
      const clean = { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } };
      const { data: rows } = await admin.from("push_subscriptions").select("id, subscription").eq("user_id", user.id).limit(20);
      // deno-lint-ignore no-explicit-any
      const same = (rows ?? []).find((r: any) => (typeof r.subscription === "string" ? JSON.parse(r.subscription) : r.subscription)?.endpoint === clean.endpoint);
      const now = new Date().toISOString();
      if (same) {
        await admin.from("push_subscriptions").update({ subscription: clean, updated_at: now }).eq("id", same.id);
      } else {
        const { error } = await admin.from("push_subscriptions").insert([{ user_id: user.id, subscription: clean, updated_at: now }]);
        // Older schema allows one device per user: replace it.
        if (error) {
          const { error: e2 } = await admin.from("push_subscriptions").update({ subscription: clean, updated_at: now }).eq("user_id", user.id);
          if (e2) throw new Error(`push_subscriptions: ${e2.code}`);
        }
      }
      return jsonResponse(req, { ok: true });
    }

    if (action === "unsubscribe") {
      const user = await getAuthedUser(req);
      const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
      const { data: rows } = await admin.from("push_subscriptions").select("id, subscription").eq("user_id", user.id).limit(20);
      for (const r of rows ?? []) {
        const s = typeof r.subscription === "string" ? JSON.parse(r.subscription) : r.subscription;
        if (!endpoint || s?.endpoint === endpoint) await admin.from("push_subscriptions").delete().eq("id", r.id);
      }
      return jsonResponse(req, { ok: true });
    }

    if (action) throw new HttpError(400, "Unknown action");
    return jsonResponse(req, await drain(admin));
  } catch (err) {
    return errorResponse(req, err);
  }
});
