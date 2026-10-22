// reconcile-deposits — called silently on every user login
// Finds any succeeded PaymentIntents for this user in the last 7 days
// that were NOT credited (webhook missed / disabled), and credits them ONCE.
// BUG FIX: was using .eq("type",...) but column is "transaction_type"
//          + now uses stripe_payment_intent_id column for atomic dedup
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

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

  const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
  let credited = 0;
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
