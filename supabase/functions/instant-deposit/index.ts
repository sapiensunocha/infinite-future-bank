// instant-deposit — Instant Direct Deposit backed by a real Flutterwave charge.
//   POST { action: "create", amount_usd, currency: "USD" | "NGN" }
//     → { reference, checkout_url, amount_usd, charge_amount, charge_currency, fx_rate }
//   POST { action: "status", reference }
//     → { status }   (if still pending, re-checks Flutterwave and completes it — webhook fallback)
// The wallet is only ever credited by complete_deposit_intent() after Flutterwave
// confirms the charge (amount + currency + reference).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, errorResponse, getAuthedUser, HttpError, jsonResponse } from "../_shared/auth.ts";
import { verifyFlutterwaveByRef } from "../_shared/page-orders.ts";
import { instantRef, isInstantRef } from "../_shared/money-rails.ts";

const FLW = "https://api.flutterwave.com/v3";
const APP_URL = Deno.env.get("APP_URL") ?? "https://app.infinitefuturebank.org";

async function ngnPerUsd(amountUsd: number, secret: string): Promise<number> {
  // How many NGN Flutterwave needs to deliver `amountUsd` USD.
  const res = await fetch(
    `${FLW}/transfers/rates?amount=${amountUsd}&destination_currency=USD&source_currency=NGN`,
    { headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(10_000) },
  );
  const j = await res.json().catch(() => null);
  const ngn = Number(j?.data?.source?.amount);
  if (!res.ok || !(ngn > 0)) throw new HttpError(503, "Naira rate is unavailable right now. Try USD or again shortly.");
  return ngn / amountUsd;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });
  try {
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
    const user = await getAuthedUser(req);
    const secret = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
    if (!secret) throw new HttpError(503, "Instant deposit is not configured yet");
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const body = await req.json().catch(() => ({}));

    if (body.action === "status") {
      if (!isInstantRef(body.reference) || typeof body.reference !== "string") throw new HttpError(400, "Invalid reference");
      const { data: intent } = await admin.from("deposit_intents")
        .select("id, user_id, status, amount_usd, tx_ref").eq("tx_ref", body.reference).maybeSingle();
      if (!intent || intent.user_id !== user.id) throw new HttpError(404, "Deposit not found");
      if (intent.status === "pending") {
        const v = await verifyFlutterwaveByRef(intent.tx_ref);
        if (v.ok && v.tx_ref === intent.tx_ref) {
          const { data: outcome, error } = await admin.rpc("complete_deposit_intent", {
            p_tx_ref: intent.tx_ref, p_paid_amount: v.amount_cents / 100, p_paid_currency: v.currency, p_provider_ref: v.ref,
          });
          if (error) throw new Error(`complete_deposit_intent: ${error.code}`);
          return jsonResponse(req, { status: outcome === "credited" || outcome === "already_done" ? "succeeded" : "failed", amount_usd: intent.amount_usd });
        }
      }
      return jsonResponse(req, { status: intent.status, amount_usd: intent.amount_usd });
    }

    // ── create ──
    const amountUsd = Math.round(Number(body.amount_usd) * 100) / 100;
    if (!(amountUsd >= 1 && amountUsd <= 10000)) throw new HttpError(400, "Amount must be between $1 and $10,000");
    const currency = String(body.currency ?? "USD").toUpperCase();
    if (currency !== "USD" && currency !== "NGN") throw new HttpError(400, "Currency must be USD or NGN");

    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await admin.from("deposit_intents").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).eq("status", "pending").gte("created_at", since);
    if ((count ?? 0) >= 5) throw new HttpError(429, "Too many unfinished deposits. Complete or wait for one to expire.");

    const fxRate = currency === "NGN" ? await ngnPerUsd(amountUsd, secret) : 1;
    const chargeAmount = Math.ceil(amountUsd * fxRate * 100) / 100;
    const intentId = crypto.randomUUID();
    const reference = instantRef(intentId);

    const { error: insErr } = await admin.from("deposit_intents").insert({
      id: intentId, user_id: user.id, amount_usd: amountUsd, charge_currency: currency, charge_amount: chargeAmount,
      fx_rate: currency === "NGN" ? fxRate : null, provider: "flutterwave", tx_ref: reference,
    });
    if (insErr) throw new Error(`deposit_intents insert: ${insErr.code}`);

    const { data: profile } = await admin.from("profiles").select("full_name, email, phone").eq("id", user.id).maybeSingle();
    const res = await fetch(`${FLW}/payments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        tx_ref: reference,
        amount: chargeAmount,
        currency,
        redirect_url: `${APP_URL}/?instant_deposit=${encodeURIComponent(reference)}`,
        payment_options: currency === "NGN" ? "card,banktransfer,ussd,account" : "card,applepay,googlepay",
        customer: { email: profile?.email ?? user.email ?? "", name: profile?.full_name ?? "IFB Customer", phonenumber: profile?.phone ?? "" },
        customizations: { title: "IFB Instant Deposit", description: `Add $${amountUsd.toFixed(2)} to your IFB wallet`, logo: `${APP_URL}/logo.png` },
        meta: { ifb_deposit_intent: intentId, user_id: user.id },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const j = await res.json().catch(() => null);
    const link = j?.data?.link;
    if (!res.ok || typeof link !== "string") {
      await admin.from("deposit_intents").update({ status: "failed", failure_reason: `checkout init HTTP ${res.status}` }).eq("id", intentId);
      throw new HttpError(502, "Could not open the payment page. Please try again.");
    }

    return jsonResponse(req, {
      reference, checkout_url: link, amount_usd: amountUsd, charge_amount: chargeAmount, charge_currency: currency,
      fx_rate: currency === "NGN" ? Math.round(fxRate * 100) / 100 : null,
    });
  } catch (e) {
    return errorResponse(req, e);
  }
});
