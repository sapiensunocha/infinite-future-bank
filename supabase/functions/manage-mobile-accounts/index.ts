// manage-mobile-accounts
// CRUD for a user's saved mobile money numbers.
// GET    → list accounts
// POST   → add account  { network, country, phone, alias? }
// DELETE → remove by id { id }
// PATCH  → set default  { id }
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

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

  const userSb = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await userSb.auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Service-role client for actual DB ops (bypasses RLS for server-side logic)
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  // ── GET — list accounts ──────────────────────────────────────────────────────
  if (req.method === "GET") {
    const { data, error } = await sb
      .from("user_mobile_accounts")
      .select("id, network, country, phone, alias, is_default, created_at")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    return new Response(JSON.stringify({ accounts: data }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* no body */ }

  // ── POST — add new account ───────────────────────────────────────────────────
  if (req.method === "POST") {
    const { network, country, phone, alias } = body as { network?: string; country?: string; phone?: string; alias?: string };
    if (!network || !country || !phone) {
      return new Response(JSON.stringify({ error: "network, country, and phone are required" }), {
        status: 400, headers: corsHeaders,
      });
    }

    // Check if this is the first account (make it default automatically)
    const { count } = await sb
      .from("user_mobile_accounts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    const { data, error } = await sb.from("user_mobile_accounts").insert([{
      user_id:    user.id,
      network,
      country,
      phone:      phone.trim(),
      alias:      alias || null,
      is_default: (count ?? 0) === 0,
    }]).select("id, network, country, phone, alias, is_default").maybeSingle();

    if (error) {
      if (error.code === "23505") {
        return new Response(JSON.stringify({ error: "This number is already saved." }), { status: 409, headers: corsHeaders });
      }
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ account: data }), { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // ── DELETE — remove account ──────────────────────────────────────────────────
  if (req.method === "DELETE") {
    const { id } = body as { id?: string };
    if (!id) return new Response(JSON.stringify({ error: "id required" }), { status: 400, headers: corsHeaders });

    const { error } = await sb
      .from("user_mobile_accounts")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    return new Response(JSON.stringify({ deleted: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // ── PATCH — set default ──────────────────────────────────────────────────────
  if (req.method === "PATCH") {
    const { id } = body as { id?: string };
    if (!id) return new Response(JSON.stringify({ error: "id required" }), { status: 400, headers: corsHeaders });

    // Reset all, then set one
    await sb.from("user_mobile_accounts").update({ is_default: false }).eq("user_id", user.id);
    const { error } = await sb.from("user_mobile_accounts").update({ is_default: true }).eq("id", id).eq("user_id", user.id);

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    return new Response(JSON.stringify({ updated: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
});
