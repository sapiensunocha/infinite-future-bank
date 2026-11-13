// reconcile-deposits — called silently on every user login
// Finds any succeeded PaymentIntents for this user in the last 7 days
// that were NOT credited (webhook missed / disabled), and credits them ONCE.
// BUG FIX: was using .eq("type",...) but column is "transaction_type"
//          + now uses stripe_payment_intent_id column for atomic dedup
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyFlutterwaveByRef } from "../_shared/page-orders.ts";
import { isInstantRef } from "../_shared/money-rails.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const adminSupabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // ── Flutterwave Instant Deposits left pending ───────────────────────────────
  // The wallet is credited by flutterwave-webhook, or by the deposit screen
  // polling `instant-deposit` status. If the webhook is missed and the user left
  // that screen (e.g. the return page failed to load), the deposit stays pending.
  // Re-check this user's recent pending intents with Flutterwave and complete the
  // ones Flutterwave confirms. complete_deposit_intent is idempotent and checks
  // the paid amount/currency, so a repeat call never credits twice.
  let flwCredited = 0;
  try {
    if (Deno.env.get("FLUTTERWAVE_SECRET_KEY")) {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: pending } = await adminSupabase
        .from("deposit_intents")
        .select("tx_ref")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(10);
      for (const row of pending ?? []) {
        if (!isInstantRef(row.tx_ref)) continue;
        const v = await verifyFlutterwaveByRef(row.tx_ref);
        if (!v.ok || v.tx_ref !== row.tx_ref) {
          // Record why Flutterwave did not confirm it (no secrets, no customer data).
          let why: Record<string, unknown> = {};
          try {
            const r = await fetch(
              `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(row.tx_ref)}`,
              { headers: { Authorization: `Bearer ${Deno.env.get("FLUTTERWAVE_SECRET_KEY")}` }, signal: AbortSignal.timeout(10_000) },
            );
            const j = await r.json().catch(() => ({}));
            why = {
              http: r.status, flw_status: j?.status ?? null, flw_message: String(j?.message ?? "").slice(0, 160),
              charge_status: j?.data?.status ?? null, amount: j?.data?.amount ?? null, currency: j?.data?.currency ?? null,
              ref_matches: j?.data?.tx_ref === row.tx_ref,
            };
          } catch (e) { why = { error: e instanceof Error ? e.message.slice(0, 160) : "error" }; }
          await adminSupabase.from("app_telemetry").insert([{ event: "flw_reconcile_unconfirmed", metadata: { tx_ref: row.tx_ref, ...why } }]);
          continue;
        }
        const { data: outcome, error } = await adminSupabase.rpc("complete_deposit_intent", {
          p_tx_ref: row.tx_ref, p_paid_amount: v.amount_cents / 100, p_paid_currency: v.currency, p_provider_ref: v.ref,
        });
        await adminSupabase.from("app_telemetry").insert([{ event: "flw_reconcile_result", metadata: { tx_ref: row.tx_ref, outcome: outcome ?? null, error: error?.code ?? null } }]);
        if (error) { console.error("reconcile: complete_deposit_intent failed:", error.code); continue; }
        if (outcome === "credited") flwCredited++;
        if (outcome === "mismatch") console.warn("reconcile: Flutterwave amount/currency mismatch — manual review", row.tx_ref);
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("reconcile-deposits flutterwave pass:", msg);
    await adminSupabase.from("app_telemetry").insert([{ event: "flw_reconcile_error", metadata: { error: msg.slice(0, 200) } }]).then(() => {}, () => {});
  }

  const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
  let credited = flwCredited;
  let checked = 0;

  try {
    const intents = await stripe.paymentIntents.search({
      query: `metadata["user_id"]:"${user.id}" AND status:"succeeded" AND created>${sevenDaysAgo}`,
      limit: 20,
    });

    for (const pi of intents.data) {
      checked++;

      // Dedup check: use stripe_payment_intent_id column (most reliable)
      const { data: existing } = await adminSupabase
        .from("transactions")
        .select("id")
        .eq("user_id", user.id)
        .eq("transaction_type", "stripe_deposit")
        .eq("stripe_payment_intent_id", pi.id)
        .maybeSingle();

      if (existing) continue; // already credited — skip

      const amountUsd = pi.amount / 100;

      // Atomic balance update using RPC to prevent race conditions
      const { error: balErr } = await adminSupabase.rpc("admin_credit_balance", {
        p_user_id: user.id,
        p_amount: amountUsd,
        p_wallet: "liquid",
        p_reason: `Stripe deposit reconciled — ${pi.id}`,
      });

      // Fallback if RPC doesn't exist yet
      if (balErr) {
        const { data: bal } = await adminSupabase
          .from("balances")
          .select("liquid_usd")
          .eq("user_id", user.id)
          .maybeSingle();

        await adminSupabase
          .from("balances")
          .update({ liquid_usd: (bal?.liquid_usd || 0) + amountUsd, updated_at: new Date().toISOString() })
          .eq("user_id", user.id);
      }

      await adminSupabase.from("transactions").insert([{
        user_id:                  user.id,
        transaction_type:         "stripe_deposit",
        amount:                   amountUsd,
        description:              `Stripe deposit — ${pi.id}`,
        status:                   "completed",
        stripe_payment_intent_id: pi.id,
        metadata:                 { stripe_payment_intent_id: pi.id },
      }]);

      credited++;
      console.log(`reconcile: credited $${amountUsd} for PI ${pi.id}`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("reconcile-deposits error:", msg);
    return new Response(JSON.stringify({ checked: 0, credited: 0, error: msg }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ checked, credited }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
