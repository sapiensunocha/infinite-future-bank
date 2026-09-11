// flutterwave-transfer
// Automated mobile money payout via Flutterwave V3 Transfer API.
// Called when a Mobile Money withdrawal order is submitted — no human processor needed.
// Falls back gracefully: if FLW rejects the network/country, returns { flw_supported: false }
// so the caller can route to human processors instead.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FLW_SECRET   = Deno.env.get("FLUTTERWAVE_SECRET_KEY") ?? "";
const FLW_BASE     = "https://api.flutterwave.com/v3";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const userSb = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authErr } = await userSb.auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: {
    amount: number;
    network: string;
    country: string;
    phone: string;
    narration?: string;
  };
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders }); }

  const { amount, network, country, phone, narration } = body;

  if (!amount || amount <= 0)
    return new Response(JSON.stringify({ error: "Invalid amount" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (!network || !country || !phone)
    return new Response(JSON.stringify({ error: "network, country, and phone are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  // Check if FLW supports this network/country combo
  const resolved = resolveNetwork(network, country);
  if (!resolved) {
    return new Response(
      JSON.stringify({ flw_supported: false, reason: `${network} not supported in ${country} via Flutterwave` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Verify user has enough balance before touching FLW
  const { data: bal } = await sb.from("balances").select("liquid_usd").eq("user_id", user.id).maybeSingle();
  const fee = parseFloat((amount * 0.005).toFixed(2));
  const total = amount + fee;
  if (!bal || (bal.liquid_usd ?? 0) < total) {
    return new Response(JSON.stringify({ error: "Insufficient balance" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const reference = `IFB-WD-${user.id.slice(0, 8)}-${Date.now()}`;

  // Call Flutterwave Transfer API
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

  const flwData = await flwRes.json();

  if (!flwRes.ok || flwData.status !== "success") {
    console.error("FLW transfer error:", JSON.stringify(flwData));
    return new Response(
      JSON.stringify({ flw_supported: true, error: flwData.message ?? "Flutterwave transfer failed" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const flwTransferId = flwData.data?.id;
  const flwStatus     = flwData.data?.status ?? "NEW";

  // Debit liquid_usd + fee atomically
  await sb.from("balances")
    .update({ liquid_usd: (bal.liquid_usd ?? 0) - total })
    .eq("user_id", user.id);

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

  // Fee transaction record
  await sb.from("transactions").insert([{
    user_id:          user.id,
    transaction_type: "withdrawal_fee",
    amount:           fee,
    status:           "completed",
    description:      `Withdrawal Routing Fee (0.5%) — $${amount} via ${network} (${country})`,
  }]);

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

  return new Response(
    JSON.stringify({
      flw_supported:  true,
      success:        true,
      reference,
      flw_transfer_id: flwTransferId,
      flw_status:     flwStatus,
      order_id:       order?.id,
      currency:       resolved.currency,
      message:        `Withdrawal of $${amount} submitted via ${network}. Ref: ${reference}`,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
