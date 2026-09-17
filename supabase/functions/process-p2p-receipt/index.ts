// process-p2p-receipt
// Called by ProcessorDashboard when a processor confirms they have received
// a user's mobile money / fiat deposit. This function:
//   1. Verifies the order belongs to this processor
//   2. Credits the user's liquid_usd balance
//   3. Auto-mints AFR tokens at configured ratio
//   4. Calculates and records processor commission (speed-based)
//   5. Sends confirmation email to the user
//   6. Marks the order as completed
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_KEY    = Deno.env.get("EMAIL_API_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendConfirmEmail(to: string, name: string, amount: number, network: string) {
  if (!RESEND_KEY || !to) return;
  const first = (name || "there").split(" ")[0];
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_KEY}` },
      body: JSON.stringify({
        from: "IFB <noreply@infinitefuturebank.org>",
        to,
        subject: `Deposit confirmed — $${Number(amount).toFixed(2)} added to your IFB wallet`,
        html: `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#0f172a;color:#e2e8f0;padding:32px">
<div style="max-width:520px;margin:0 auto;background:#1e293b;border-radius:16px;padding:32px;border:1px solid #334155">
  <h1 style="color:#10b981;font-size:22px;margin:0 0 8px">✅ Deposit Confirmed</h1>
  <p style="color:#94a3b8;margin:0 0 24px;font-size:13px">Hi ${first}, your deposit has been confirmed by your IFB processor.</p>
  <div style="background:#0f172a;border-radius:12px;padding:20px;margin-bottom:20px;text-align:center">
    <p style="margin:0;font-size:36px;font-weight:900;color:#10b981">+$${Number(amount).toFixed(2)}</p>
    <p style="margin:4px 0 0;color:#64748b;font-size:12px">${network} deposit · Now in your IFB wallet</p>
  </div>
  <a href="https://app.infinitefuturebank.org" style="display:block;text-align:center;background:#10b981;color:#fff;padding:14px;border-radius:12px;text-decoration:none;font-weight:900;font-size:13px;margin-top:8px;text-transform:uppercase;letter-spacing:1px">
    Open IFB App →
  </a>
  <p style="margin:20px 0 0;font-size:11px;color:#475569;text-align:center">IFB · Infinite Future Bank</p>
</div></body></html>`,
      }),
    });
  } catch (_) {}
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

  let body: { order_id: string; proof_image_url?: string; notes?: string };
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders }); }

  const { order_id, proof_image_url, notes } = body;
  if (!order_id) {
    return new Response(JSON.stringify({ error: "order_id required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Fetch the order — verify it belongs to this processor
  const { data: order, error: orderErr } = await sb
    .from("p2p_orders")
    .select(`
      id, user_id, processor_id, order_type, amount_usd, status,
      payment_method, network, assigned_at, created_at,
      user:profiles!p2p_orders_user_id_fkey(full_name, email)
    `)
    .eq("id", order_id)
    .maybeSingle();

  if (orderErr || !order) {
    return new Response(JSON.stringify({ error: "Order not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Security: only the assigned processor can confirm this order
  if (order.processor_id !== user.id) {
    return new Response(JSON.stringify({ error: "Not your order" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (order.order_type !== "deposit") {
    return new Response(JSON.stringify({ error: "This function only handles deposit orders" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (order.status === "completed") {
    return new Response(JSON.stringify({ error: "Order already completed" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const amountUsd   = Number(order.amount_usd);
  const now         = new Date();
  const assignedAt  = order.assigned_at ? new Date(order.assigned_at) : new Date(order.created_at);
  const responseTimeSec = Math.floor((now.getTime() - assignedAt.getTime()) / 1000);

  // Speed-based commission: faster = more
  const commissionPct =
    responseTimeSec <= 60   ? 2.5 :
    responseTimeSec <= 300  ? 2.0 :
    responseTimeSec <= 900  ? 1.5 :
    responseTimeSec <= 1800 ? 1.0 : 0.5;

  // Fetch processor tier bonus
  const { data: procProfile } = await sb
    .from("processor_profiles")
    .select("tier, total_earned_usd, monthly_volume_usd")
    .eq("user_id", user.id)
    .maybeSingle();

  const tierBonus =
    procProfile?.tier === "platinum" ? 0.8 :
    procProfile?.tier === "gold"     ? 0.5 :
    procProfile?.tier === "silver"   ? 0.2 : 0.0;

  const totalCommissionPct = commissionPct + tierBonus;
  const commissionUsd      = parseFloat((amountUsd * totalCommissionPct / 100).toFixed(4));

  // 1. Credit user's liquid_usd balance
  const { data: bal } = await sb.from("balances").select("liquid_usd, afr_balance").eq("user_id", order.user_id).maybeSingle();
  if (bal) {
    await sb.from("balances")
      .update({ liquid_usd: (bal.liquid_usd ?? 0) + amountUsd })
      .eq("user_id", order.user_id);
  } else {
    await sb.from("balances")
      .insert([{ user_id: order.user_id, liquid_usd: amountUsd, afr_balance: 0 }]);
  }

  // 2. Auto-mint AFR tokens
  try {
    const { data: mintCfg } = await sb.from("app_config").select("value").eq("key", "afr_mint_ratio").maybeSingle();
    const mintRatio = Number(mintCfg?.value ?? 100);
    const afrAmount = amountUsd * mintRatio;

    await sb.from("balances")
      .update({ afr_balance: ((bal?.afr_balance ?? 0) + afrAmount) })
      .eq("user_id", order.user_id);

    await sb.from("afr_ledger").insert([{
      user_id:       order.user_id,
      tx_type:       "deposit_conversion",
      afr_amount:    afrAmount,
      usd_equivalent: amountUsd,
      status:        "confirmed",
      notes:         `Auto-mint from P2P deposit ${order_id} at ${mintRatio}:1`,
    }]);
  } catch (e) {
    console.warn("AFR mint error (non-blocking):", e);
  }

  // 3. Record user transaction
  await sb.from("transactions").insert([{
    user_id:          order.user_id,
    transaction_type: "p2p_deposit",
    amount:           amountUsd,
    description:      `P2P deposit via ${order.network ?? order.payment_method} — confirmed by processor`,
    status:           "completed",
    metadata:         { order_id, processor_id: user.id, network: order.network },
  }]);

  // 4. Record processor commission
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  await sb.from("processor_earnings").insert([{
    processor_id:   user.id,
    order_id,
    month:          currentMonth,
    commission_usd: commissionUsd,
    bonus_usd:      0,
    type:           "commission",
    notes:          `${totalCommissionPct}% commission (${commissionPct}% speed + ${tierBonus}% tier) on $${amountUsd} — ${responseTimeSec}s response`,
  }]);

  // 5. Update processor stats
  const newVolume   = (procProfile?.monthly_volume_usd ?? 0) + amountUsd;
  const newEarned   = (procProfile?.total_earned_usd ?? 0) + commissionUsd;
  const fastOrders  = responseTimeSec <= 300 ? 1 : 0;

  const newTier =
    newVolume >= 50000 ? "platinum" :
    newVolume >= 20000 ? "gold"     :
    newVolume >= 5000  ? "silver"   : "bronze";

  await sb.from("processor_profiles")
    .update({
      total_earned_usd:    newEarned,
      monthly_volume_usd:  newVolume,
      total_orders:        (procProfile as any)?.total_orders ?? 0 + 1,
      completed_orders:    (procProfile as any)?.completed_orders ?? 0 + 1,
      tier:                newTier,
      avg_response_time_s: responseTimeSec,
    })
    .eq("user_id", user.id);

  // Also credit processor commission to their liquid_usd
  const { data: procBal } = await sb.from("balances").select("liquid_usd").eq("user_id", user.id).maybeSingle();
  if (procBal) {
    await sb.from("balances")
      .update({ liquid_usd: (procBal.liquid_usd ?? 0) + commissionUsd })
      .eq("user_id", user.id);
  }

  // 6. Mark order as completed
  await sb.from("p2p_orders").update({
    status:          "completed",
    completed_at:    now.toISOString(),
    response_time_s: responseTimeSec,
    commission_pct:  totalCommissionPct,
    commission_usd:  commissionUsd,
    ...(proof_image_url ? { proof_image_url } : {}),
    ai_verification_status: "verified",
  }).eq("id", order_id);

  // 7. Notify user
  await sb.from("notifications").insert([{
    user_id: order.user_id,
    type:    "payment_received",
    read:    false,
    status:  "completed",
    message: `$${amountUsd} deposited to your wallet via ${order.network ?? order.payment_method}.`,
  }]);

  // 8. Send confirmation email to user
  const userProfile = order.user as { full_name?: string; email?: string } | null;
  if (userProfile?.email) {
    await sendConfirmEmail(
      userProfile.email,
      userProfile.full_name ?? "",
      amountUsd,
      order.network ?? order.payment_method ?? "P2P"
    );
  }

  await sb.from("app_telemetry").insert([{
    event:    "p2p_deposit_confirmed",
    metadata: {
      order_id, user_id: order.user_id, processor_id: user.id,
      amount_usd: amountUsd, commission_usd: commissionUsd,
      response_time_s: responseTimeSec, tier: newTier,
    },
  }]);

  console.log(`P2P deposit confirmed: $${amountUsd} to user ${order.user_id}, commission $${commissionUsd} to processor ${user.id}`);

  return new Response(
    JSON.stringify({
      success:          true,
      amount_credited:  amountUsd,
      commission_usd:   commissionUsd,
      commission_pct:   totalCommissionPct,
      response_time_s:  responseTimeSec,
      new_tier:         newTier,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
