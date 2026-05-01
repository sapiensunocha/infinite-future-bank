// afr-mint
// Mints AFR tokens when user deposits USD or on explicit request
// 1 USD deposited = AFR_MINT_RATIO AFR minted (default: 100 AFR per $1)
// All AFR tracked in balances.afr_balance + afr_ledger
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const AFR_INTELLIGENCE_CORE = "https://ifb-intelligence-core-382117221028.us-central1.run.app";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  const adminSb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let body: { usd_amount?: number; reason?: string };
  try { body = await req.json(); } catch { body = {}; }

  const usdAmount = Number(body.usd_amount);
  if (!usdAmount || usdAmount <= 0) {
    return new Response(JSON.stringify({ error: "usd_amount must be positive" }), { status: 400, headers: corsHeaders });
  }

  // Get AFR mint config from app_config
  const { data: mintRatioCfg } = await adminSb.from("app_config").select("value").eq("key", "afr_mint_ratio").maybeSingle();
  const mintRatio = Number(mintRatioCfg?.value ?? 100);
  const afrAmount = usdAmount * mintRatio;

  // Check total AFR in circulation (hard cap: 1,000,000 AFR)
  const { data: totalData } = await adminSb.from("afr_ledger")
    .select("afr_amount")
    .in("tx_type", ["mint", "deposit_conversion"]);
  const totalMinted = (totalData || []).reduce((s: number, r: { afr_amount: number }) => s + (r.afr_amount || 0), 0);
  const burnedData = await adminSb.from("afr_ledger").select("afr_amount").in("tx_type", ["burn","withdrawal_redemption"]);
  const totalBurned = ((burnedData.data) || []).reduce((s: number, r: { afr_amount: number }) => s + (r.afr_amount || 0), 0);
  const circulating = totalMinted - totalBurned;
  const HARD_CAP = 1_000_000;

  if (circulating + afrAmount > HARD_CAP) {
    const available = HARD_CAP - circulating;
    return new Response(JSON.stringify({
      error: `AFR hard cap reached. Available supply: ${available.toFixed(6)} AFR`,
      circulating, hard_cap: HARD_CAP
    }), { status: 400, headers: corsHeaders });
  }

  // Credit AFR to user balance
  const { data: bal } = await adminSb.from("balances").select("afr_balance").eq("user_id", user.id).maybeSingle();
  if (bal) {
    await adminSb.from("balances").update({ afr_balance: (bal.afr_balance || 0) + afrAmount }).eq("user_id", user.id);
  } else {
    await adminSb.from("balances").insert([{ user_id: user.id, liquid_usd: 0, afr_balance: afrAmount }]);
  }

  // Record in AFR ledger
  const { data: ledgerEntry } = await adminSb.from("afr_ledger").insert([{
    user_id: user.id,
    tx_type: "deposit_conversion",
    afr_amount: afrAmount,
    usd_equivalent: usdAmount,
    status: "confirmed",
    notes: body.reason || `AFR minted from $${usdAmount} USD deposit at ${mintRatio}:1 ratio`,
  }]).select().single();

  // Notify the intelligence core (fire-and-forget, don't block on failure)
  fetch(`${AFR_INTELLIGENCE_CORE}/api/afr-mint-notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: user.id, afrAmount, usdAmount, ledgerRef: ledgerEntry?.id }),
  }).catch(() => {});

  // Notify user
  await adminSb.from("notifications").insert([{
    user_id: user.id, type: "payment_received", read: false, status: "completed",
    message: `${afrAmount.toLocaleString()} AFR minted — credited to your wallet from $${usdAmount} USD deposit (${mintRatio}:1 ratio).`,
  }]);

  return new Response(JSON.stringify({
    success: true,
    afr_minted: afrAmount,
    uafr_minted: afrAmount * 1_000_000,
    usd_equivalent: usdAmount,
    mint_ratio: mintRatio,
    circulating_after: circulating + afrAmount,
    hard_cap: HARD_CAP,
    ledger_id: ledgerEntry?.id,
  }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
