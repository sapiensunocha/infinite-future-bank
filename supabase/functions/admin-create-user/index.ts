// admin-create-user — registers a new user on behalf of an IFB admin
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  // Verify caller is an admin
  const callerSb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user: caller }, error: authErr } = await callerSb.auth.getUser();
  if (authErr || !caller) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  const adminSb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: callerProfile } = await adminSb.from("profiles")
    .select("role").eq("id", caller.id).maybeSingle();
  if (!["admin", "admin_l3", "superadmin"].includes(callerProfile?.role || "")) {
    return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: corsHeaders });
  }

  let body: {
    email: string; password: string; full_name: string;
    phone?: string; country?: string; kyc_status?: string;
    role?: string; dob?: string; residential_address?: string;
    employer?: string; source_of_revenue?: string;
    send_welcome_email?: boolean;
  };
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: corsHeaders });
  }

  if (!body.email || !body.password || !body.full_name) {
    return new Response(JSON.stringify({ error: "email, password, and full_name are required" }), { status: 400, headers: corsHeaders });
  }

  // Create auth user
  const { data: newUser, error: createErr } = await adminSb.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true, // auto-confirm so they can login immediately
    user_metadata: { full_name: body.full_name },
  });

  if (createErr || !newUser?.user) {
    return new Response(JSON.stringify({ error: createErr?.message || "Failed to create auth user" }), { status: 400, headers: corsHeaders });
  }

  const userId = newUser.user.id;

  // Upsert profile
  const { error: profileErr } = await adminSb.from("profiles").upsert([{
    id: userId,
    full_name: body.full_name,
    email: body.email,
    phone: body.phone || null,
    country: body.country || null,
    kyc_status: body.kyc_status || "unverified",
    role: body.role || "user",
    dob: body.dob || null,
    residential_address: body.residential_address || null,
    employer: body.employer || null,
    source_of_revenue: body.source_of_revenue || null,
    created_at: new Date().toISOString(),
  }]);

  if (profileErr) {
    return new Response(JSON.stringify({ error: "User created but profile failed: " + profileErr.message, user_id: userId }), { status: 207, headers: corsHeaders });
  }

  // Create initial wallet entries if wallets table exists
  try {
    await adminSb.from("wallets").upsert([
      { user_id: userId, currency_code: "USD", balance: 0 },
      { user_id: userId, currency_code: "AFR", balance: 0 },
    ], { onConflict: "user_id,currency_code" });
  } catch { /* non-fatal */ }

  // Send welcome notification
  await adminSb.from("notifications").insert([{
    user_id: userId, type: "system", read: false, status: "completed",
    message: `Welcome to Infinite Future Bank, ${body.full_name}! Your account has been registered by an IFB administrator. Please log in and complete your KYC verification.`,
  }]);

  return new Response(JSON.stringify({
    success: true,
    user_id: userId,
    email: body.email,
    message: `User ${body.full_name} created successfully`,
  }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
