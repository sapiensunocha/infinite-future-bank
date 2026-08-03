// stripe-terminal-token
// Returns a Stripe Terminal connection token for authenticated IFB users.
// Called by the mobile/web Terminal SDK before initiating a reader connection.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace(/^Bearer\s+/i, "");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Stripe: create connection token ───────────────────────────────────────
  const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;

  try {
    const stripeRes = await fetch(
      "https://api.stripe.com/v1/terminal/connection_tokens",
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(STRIPE_SECRET_KEY + ":")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    const data = await stripeRes.json();

    if (!stripeRes.ok) {
      const message: string = data?.error?.message ?? "Stripe error";
      return new Response(JSON.stringify({ error: message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const locationId = Deno.env.get("STRIPE_TERMINAL_LOCATION_ID") ?? null;
    return new Response(
      JSON.stringify({ secret: data.secret, locationId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("stripe-terminal-token error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
