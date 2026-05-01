// reconcile-deposits — called silently on every user login
// Finds any succeeded PaymentIntents for this user in the last 7 days
// that were NOT credited (webhook missed / disabled), and credits them
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
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

  // Search Stripe for this user's recent succeeded PaymentIntents (last 7 days)
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
      // Check if already credited
      const { data: existing } = await adminSupabase
        .from("transactions")
        .select("id")
        .eq("type", "stripe_deposit")
        .ilike("description", `%${pi.id}%`)
        .maybeSingle();

      if (existing) continue;

      const amountUsd = pi.amount / 100;

      // Credit the balance
      const { data: bal } = await adminSupabase
        .from("balances")
        .select("liquid_usd")
        .eq("user_id", user.id)
        .maybeSingle();

      if (bal) {
        await adminSupabase
          .from("balances")
          .update({ liquid_usd: (bal.liquid_usd || 0) + amountUsd })
          .eq("user_id", user.id);
      } else {
        await adminSupabase
          .from("balances")
          .insert([{ user_id: user.id, liquid_usd: amountUsd, afr_balance: 0 }]);
      }

      await adminSupabase.from("transactions").insert([{
        user_id: user.id,
        type: "stripe_deposit",
        amount: amountUsd,
        description: `Stripe deposit — ${pi.id}`,
        status: "completed",
      }]);

      await adminSupabase.from("app_telemetry").insert([{
        event: "stripe_deposit_reconciled",
        metadata: { user_id: user.id, amount_usd: amountUsd, payment_intent_id: pi.id },
      }]);

      credited++;
      console.log(`reconcile: credited $${amountUsd} for PI ${pi.id}`);
    }
  } catch (err: unknown) {
    // Search API requires an index — if it fails, silently succeed (non-critical path)
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("reconcile-deposits search error:", msg);
    return new Response(JSON.stringify({ checked: 0, credited: 0, error: msg }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ checked, credited }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
