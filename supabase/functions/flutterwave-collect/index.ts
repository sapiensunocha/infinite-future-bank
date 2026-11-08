// flutterwave-collect
// Returns inline SDK config so the frontend can launch FLW payment modal directly on the page.
// No redirect to external page — payment happens inline.
// FLW fires charge.completed webhook → flutterwave-webhook verifies the transaction
// with GET /v3/transactions/{id}/verify and credits via credit_deposit (idempotent).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders as buildCors, getAuthedUser, HttpError, parseAmount } from "../_shared/auth.ts";
import { collectRate, round2 } from "../_shared/flw-rates.ts";
import { instantRef } from "../_shared/money-rails.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const APP_URL      = Deno.env.get("APP_URL") ?? "https://app.infinitefuturebank.org";
const FLW_PUBLIC   = Deno.env.get("FLUTTERWAVE_PUBLIC_KEY") ?? "";

const SUPPORTED_CURRENCIES = ["GHS", "NGN", "KES", "UGX", "TZS", "RWF", "ZMW", "XOF", "XAF", "ZAR", "USD"];

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let user;
  try { user = await getAuthedUser(req); }
  catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { amount: number; amount_usd?: number; currency?: string; phone?: string; description?: string };
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders }); }

  // Preferred path (app 1.7.2+): the app sends the USD amount; we quote the local amount at
  // Flutterwave's live rate and record a deposit intent, so the webhook credits exactly the
  // quoted USD (no hard-coded FX table). Older apps send a local `amount` and use the path below.
  if (body.amount_usd != null) {
    const json = (b: unknown, status = 200) =>
      new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const amountUsd = round2(Number(body.amount_usd));
    const cur = String(body.currency ?? "").toUpperCase();
    if (!(amountUsd >= 1 && amountUsd <= 10000)) return json({ error: "Amount must be between $1 and $10,000" }, 400);
    if (!SUPPORTED_CURRENCIES.includes(cur) || cur === "USD") return json({ error: "Unsupported currency" }, 400);
    const secret = Deno.env.get("FLUTTERWAVE_SECRET_KEY") ?? "";
    let rate: number;
    try { rate = await collectRate(secret, cur); }
    catch (e) { return json({ error: e instanceof HttpError ? e.message : "Exchange rate unavailable" }, 503); }
    // Whole units for currencies that are not used with minor units (UGX, RWF, XOF, XAF, TZS).
    const local = ["UGX", "RWF", "XOF", "XAF", "TZS"].includes(cur)
      ? Math.ceil(amountUsd * rate)
      : Math.ceil(amountUsd * rate * 100) / 100;

    const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const intentId = crypto.randomUUID();
    const txRef = instantRef(intentId);
    const { error: insErr } = await admin.from("deposit_intents").insert({
      id: intentId, user_id: user.id, amount_usd: amountUsd, charge_currency: cur, charge_amount: local,
      fx_rate: rate, provider: "flutterwave", tx_ref: txRef,
    });
    if (insErr) return json({ error: "Could not start the deposit" }, 500);
    const { data: prof } = await admin.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle();
    return json({
      tx_ref: txRef, reference: txRef, public_key: FLW_PUBLIC, amount: local, currency: cur,
      amount_usd: amountUsd, rate: round2(rate),
      payment_options: "mobilemoney,ussd,banktransfer",
      redirect_url: APP_URL + "/?instant_deposit=" + encodeURIComponent(txRef),
      meta: { user_id: user.id, source: "ifb_mobile_money_deposit", ifb_deposit_intent: intentId },
      customer: { email: prof?.email ?? user.email ?? "", name: prof?.full_name ?? "IFB Customer", phonenumber: body.phone ?? "" },
      customizations: { title: "IFB Wallet Top-Up", description: "Add $" + amountUsd.toFixed(2) + " to your IFB wallet", logo: APP_URL + "/logo.png" },
    });
  }

  const { currency = "GHS", phone, description } = body;

  // Local-currency amounts (e.g. UGX) can be large; parseAmount caps at 1,000,000.
  let amount: number;
  try { amount = parseAmount(body.amount); }
  catch {
    return new Response(JSON.stringify({ error: "Invalid amount" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!SUPPORTED_CURRENCIES.includes(String(currency).toUpperCase())) {
    return new Response(JSON.stringify({ error: "Unsupported currency" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const adminSb = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const { data: profile } = await adminSb.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle();

  // Dot-separated so webhook can extract full UUID unambiguously
  const txRef = `IFB.COLLECT.${user.id}.${Date.now()}`;

  await adminSb.from("app_telemetry").insert([{
    event:    "flw_collect_initiated",
    metadata: { user_id: user.id, amount, currency, tx_ref: txRef },
  }]);

  return new Response(
    JSON.stringify({
      tx_ref:      txRef,
      public_key:  FLW_PUBLIC,
      amount,
      currency,
      payment_options: "mobilemoney,ussd,banktransfer",
      redirect_url: `${APP_URL}/?deposit_status=success&ref=${txRef}`,
      meta: { user_id: user.id, source: "ifb_mobile_money_deposit" },
      customer: {
        email:       profile?.email ?? user.email ?? "",
        name:        profile?.full_name ?? "IFB Customer",
        phonenumber: phone ?? "",
      },
      customizations: {
        title:       "IFB Wallet Top-Up",
        description: description ?? `Mobile Money deposit — ${currency} ${amount}`,
        logo:        `${APP_URL}/logo.png`,
      },
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
