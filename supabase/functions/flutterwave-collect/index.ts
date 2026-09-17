// flutterwave-collect
// Returns inline SDK config so the frontend can launch FLW payment modal directly on the page.
// No redirect to external page — payment happens inline.
// FLW fires charge.completed webhook → flutterwave-webhook credits liquid_usd.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const APP_URL      = Deno.env.get("APP_URL") ?? "https://app.infinitefuturebank.org";
const FLW_PUBLIC   = Deno.env.get("FLUTTERWAVE_PUBLIC_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sb = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { amount: number; currency?: string; phone?: string; description?: string };
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders }); }

  const { amount, currency = "GHS", phone, description } = body;

  if (!amount || amount <= 0) {
    return new Response(JSON.stringify({ error: "Amount must be greater than 0" }), {
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
      tx_ref,
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
