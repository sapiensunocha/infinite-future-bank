// flutterwave-collect
// Returns inline SDK config so the frontend can launch FLW payment modal directly on the page.
// No redirect to external page — payment happens inline.
// FLW fires charge.completed webhook → flutterwave-webhook verifies the transaction
// with GET /v3/transactions/{id}/verify and credits via credit_deposit (idempotent).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders as buildCors, getAuthedUser, parseAmount } from "../_shared/auth.ts";

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

  let body: { amount: number; currency?: string; phone?: string; description?: string };
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders }); }

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
