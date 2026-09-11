// flutterwave-collect
// Creates a Flutterwave hosted payment link for mobile money deposits.
// User taps the returned link → pays via MTN/M-Pesa/Orange/Wave/etc. in their country →
// FLW fires charge.completed webhook → flutterwave-webhook credits liquid_usd.
// No card needed. No human processor. Instant.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FLW_SECRET   = Deno.env.get("FLUTTERWAVE_SECRET_KEY") ?? "";
const FLW_BASE     = "https://api.flutterwave.com/v3";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const APP_URL      = Deno.env.get("APP_URL") ?? "https://app.infinitefuturebank.org";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

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

  let body: { amount: number; currency?: string; name?: string; email?: string; phone?: string; description?: string };
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders }); }

  const { amount, currency = "USD", name, email, phone, description } = body;

  if (!amount || amount <= 0) {
    return new Response(JSON.stringify({ error: "Amount must be greater than 0" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Fetch profile for personalization
  const adminSb = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const { data: profile } = await adminSb.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle();

  const txRef = `IFB-COLLECT-${user.id}-${Date.now()}`;

  const payload = {
    tx_ref:       txRef,
    amount,
    currency,
    redirect_url: `${APP_URL}/?deposit_status=success&ref=${txRef}`,
    meta: {
      user_id:    user.id,
      source:     "ifb_mobile_money_deposit",
    },
    customer: {
      email:        email ?? profile?.email ?? user.email ?? "",
      name:         name  ?? profile?.full_name ?? "IFB Customer",
      phonenumber:  phone ?? "",
    },
    customizations: {
      title:       "IFB Wallet Top-Up",
      description: description ?? `Mobile Money deposit to IFB Wallet — $${amount}`,
      logo:        `${APP_URL}/logo.png`,
    },
    payment_options: "mobilemoney,card,ussd,banktransfer",
  };

  const flwRes = await fetch(`${FLW_BASE}/payments`, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${FLW_SECRET}`,
    },
    body: JSON.stringify(payload),
  });

  const flwData = await flwRes.json();

  if (!flwRes.ok || flwData.status !== "success") {
    console.error("FLW payment link error:", JSON.stringify(flwData));
    return new Response(
      JSON.stringify({ error: flwData.message ?? "Failed to create payment link" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Log the pending deposit attempt
  await adminSb.from("app_telemetry").insert([{
    event:    "flw_collect_created",
    metadata: { user_id: user.id, amount, currency, tx_ref: txRef },
  }]);

  return new Response(
    JSON.stringify({
      link:   flwData.data?.link,
      tx_ref: txRef,
      amount,
      currency,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
