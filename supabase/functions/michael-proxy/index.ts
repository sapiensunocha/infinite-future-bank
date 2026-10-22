// michael-proxy
// Proxies requests to the WDC MICHAEL API to avoid CORS issues.
// The MICHAEL API returns duplicate Access-Control-Allow-Origin headers which browsers reject.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const MICHAEL_BASE = "https://michael-api-382117221028.us-central1.run.app";
const MICHAEL_KEY  = "xeltis-prod-key-2026";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let body: { path: string; params?: Record<string, string> };
  try { body = await req.json(); }
  catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { path, params = {} } = body;
  if (!path) {
    return new Response(JSON.stringify({ error: "path is required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(`${MICHAEL_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  try {
    const res = await fetch(url.toString(), {
      headers: { "X-API-Key": MICHAEL_KEY, "Accept": "application/json" },
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
