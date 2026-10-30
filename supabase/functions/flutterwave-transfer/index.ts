// flutterwave-transfer
// Automated mobile money payout via Flutterwave V3 Transfer API.
// Called when a Mobile Money withdrawal order is submitted — no human processor needed.
// Falls back gracefully: if FLW rejects the network/country, returns { flw_supported: false }
// so the caller can route to human processors instead.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders as buildCors, getAuthedUser, parseAmount } from "../_shared/auth.ts";

const FLW_SECRET   = Deno.env.get("FLUTTERWAVE_SECRET_KEY") ?? "";
const FLW_BASE     = "https://api.flutterwave.com/v3";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// FLW bank codes + currencies per network/country combo.
// Each entry: { bank_code, currency, country_iso2[] }
const FLW_MOBILE_NETWORKS: Record<string, { bank_code: string; currency: string; countries: string[] }[]> = {
  "MTN": [
    { bank_code: "MTN", currency: "GHS", countries: ["GH"] },
    { bank_code: "MTN", currency: "UGX", countries: ["UG"] },
    { bank_code: "MTN", currency: "RWF", countries: ["RW"] },
    { bank_code: "MTN", currency: "ZMW", countries: ["ZM"] },
    { bank_code: "MTN", currency: "XAF", countries: ["CM"] },
    { bank_code: "MTN", currency: "XOF", countries: ["CI", "BJ", "SN"] },
  ],
  "Airtel": [
    { bank_code: "AIRTEL", currency: "UGX", countries: ["UG"] },
    { bank_code: "AIRTEL", currency: "KES", countries: ["KE"] },
    { bank_code: "AIRTEL", currency: "TZS", countries: ["TZ"] },
    { bank_code: "AIRTEL", currency: "MWK", countries: ["MW"] },
    { bank_code: "AIRTEL", currency: "ZMW", countries: ["ZM"] },
  ],
  "M-Pesa": [
    { bank_code: "MPS",   currency: "KES", countries: ["KE"] },
    { bank_code: "MPESA", currency: "TZS", countries: ["TZ"] },
    { bank_code: "MPESA", currency: "MZN", countries: ["MZ"] },
  ],
  "Orange": [
    { bank_code: "ORANGE", currency: "XAF", countries: ["CM"] },
    { bank_code: "ORANGE", currency: "XOF", countries: ["SN", "CI", "ML", "GN", "BF"] },
    { bank_code: "ORANGE", currency: "MGA", countries: ["MG"] },
  ],
  "Wave": [
    { bank_code: "WAVE", currency: "XOF", countries: ["SN", "CI", "ML", "BF", "GN", "GM"] },
  ],
  "Vodacom": [
    { bank_code: "VODACOM", currency: "TZS", countries: ["TZ"] },
    { bank_code: "VODACOM", currency: "CDF", countries: ["CD"] },
  ],
  "Moov": [
    { bank_code: "MOOV", currency: "XOF", countries: ["TG", "BJ", "CI", "ML", "SN"] },
    { bank_code: "MOOV", currency: "XAF", countries: ["CM", "GA"] },
  ],
  "TNM": [
    { bank_code: "TNM", currency: "MWK", countries: ["MW"] },
  ],
};

function resolveNetwork(network: string, countryIso2: string) {
  const variants = FLW_MOBILE_NETWORKS[network] ?? [];
  return variants.find(v => v.countries.includes(countryIso2.toUpperCase())) ?? null;
}

Deno.serve(async (req) => {
  const corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const jsonRes = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  let user;
  try { user = await getAuthedUser(req); }
  catch { return jsonRes({ error: "Unauthorized" }, 401); }

  let body: {
    amount: number;
    network: string;
    country: string;
    phone: string;
    narration?: string;
  };
  try { body = await req.json(); }
  catch { return jsonRes({ error: "Invalid JSON" }, 400); }

  const { network, country, phone, narration } = body;

  let amount: number;
  try { amount = parseAmount(body.amount); }
  catch { return jsonRes({ error: "Invalid amount" }, 400); }
  if (!network || !country || !phone)
    return jsonRes({ error: "network, country, and phone are required" }, 400);
  if (!/^\+?\d{7,15}$/.test(String(phone).replace(/[\s-]/g, "")))
    return jsonRes({ error: "Invalid phone number" }, 400);

  // Check if FLW supports this network/country combo
  const resolved = resolveNetwork(network, country);
  if (!resolved) {
    return jsonRes({ flw_supported: false, reason: `${network} not supported in ${country} via Flutterwave` });
  }

  // Fail closed until USD -> local FX conversion exists (see TODO(FX BUG) below).
  if (Deno.env.get("FLW_WITHDRAWALS_ENABLED") !== "true") {
    return jsonRes({ flw_supported: false, error: "Mobile Money withdrawals are temporarily unavailable" }, 503);
  }

  const fee = Math.round(amount * 0.005 * 100) / 100;
  const total = Math.round((amount + fee) * 100) / 100;
  const reference = `IFB-WD-${user.id.slice(0, 8)}-${crypto.randomUUID()}`;

  // 1. Debit liquid_usd + fee atomically BEFORE paying out (raises on insufficient funds).
  const { error: debitErr } = await sb.rpc("debit_for_withdrawal", {
    p_user_id: user.id,
    p_amount: total,
    p_external_id: reference,
    p_description: `Mobile Money withdrawal $${amount} + $${fee} fee via ${network} (${country})`,
  });
  if (debitErr) return jsonRes({ error: "Insufficient balance" }, 400);

  // TODO(FX BUG): `amount` is USD (debited from liquid_usd) but is sent to Flutterwave
  // as an amount in the LOCAL currency (resolved.currency), so a $10 withdrawal pays out
  // 10 GHS/KES/etc. Convert USD -> local with a live, locked quote (e.g. FLW
  // GET /v3/transfers/rates) before enabling this in production.

  // 2. Call Flutterwave Transfer API. On any failure, refund the debit.
  let flwData: any = null;
  let flwOk = false;
  let flwDefinitelyRejected = false;
  try {
    const flwRes = await fetch(`${FLW_BASE}/transfers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${FLW_SECRET}`,
      },
      body: JSON.stringify({
        account_bank:    resolved.bank_code,
        account_number:  phone,
        amount,
        narration:       narration ?? `IFB Wallet Withdrawal`,
        currency:        resolved.currency,
        reference,
        debit_currency:  resolved.currency,
        callback_url:    `${SUPABASE_URL}/functions/v1/flutterwave-webhook`,
        meta: {
          sender:           "IFB Infinite Future Bank",
          sender_country:   country,
          mobile_number:    phone,
          recipient_address: country,
        },
      }),
    });
    flwData = await flwRes.json();
    flwOk = flwRes.ok && flwData?.status === "success";
    flwDefinitelyRejected = flwRes.status >= 400 && flwRes.status < 500;
  } catch (e) {
    console.error("FLW transfer request failed:", e instanceof Error ? e.message : e);
  }

  if (!flwOk && !flwDefinitelyRejected) {
    // Network error / 5xx: the transfer may have gone out. Keep the debit; the
    // transfer webhook (or reconciliation via GET /v3/transfers?reference=) settles it.
    console.error("RECONCILE: ambiguous FLW transfer result for", reference);
    return jsonRes({ flw_supported: true, pending: true, reference }, 202);
  }

  if (!flwOk) {
    console.error("FLW transfer error:", flwData?.status, flwData?.message);
    const { error: refundErr } = await sb.rpc("refund_withdrawal", { p_external_id: reference });
    if (refundErr) console.error("CRITICAL: refund_withdrawal failed for", reference, refundErr.message);
    return jsonRes({ flw_supported: true, error: flwData?.message ?? "Flutterwave transfer failed" }, 502);
  }

  const flwTransferId = flwData.data?.id;
  const flwStatus     = flwData.data?.status ?? "NEW";

  // Record the withdrawal order so webhook can close it
  const { data: order } = await sb.from("p2p_orders").insert([{
    user_id:        user.id,
    order_type:     "withdraw",
    amount_usd:     amount,
    network,
    payment_method: `Mobile Money — ${network} (${country})`,
    status:         "flw_processing",
    metadata: {
      flw_transfer_id:  flwTransferId,
      flw_reference:    reference,
      flw_bank_code:    resolved.bank_code,
      flw_currency:     resolved.currency,
      recipient_phone:  phone,
      fee_usd:          fee,
      country,
    },
  }]).select().single();

  // Notify user
  await sb.from("notifications").insert([{
    user_id: user.id,
    type:    "payment_sent",
    read:    false,
    status:  "pending",
    message: `Your $${amount} withdrawal via ${network} is being processed. Ref: ${reference}`,
  }]);

  await sb.from("app_telemetry").insert([{
    event:    "flw_transfer_initiated",
    metadata: { user_id: user.id, amount, network, country, reference, flw_transfer_id: flwTransferId },
  }]);

  return jsonRes({
      flw_supported:  true,
      success:        true,
      reference,
      flw_transfer_id: flwTransferId,
      flw_status:     flwStatus,
      order_id:       order?.id,
      currency:       resolved.currency,
      message:        `Withdrawal of $${amount} submitted via ${network}. Ref: ${reference}`,
  });
});
