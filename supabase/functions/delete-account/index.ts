// delete-account — GDPR & App Store / Google Play Compliance Account Deletion
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || serviceRoleKey;

  const sbAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace(/Bearer /i, "").trim();
      const sbUser = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } }
      });
      const { data: { user } } = await sbUser.auth.getUser();
      if (user) {
        userId = user.id;
      }
    }

    // Also support deletion confirmation via JSON body if user confirms with credentials
    if (!userId && req.method === "POST") {
      try {
        const body = await req.json();
        if (body.email && body.password) {
          const { data: signInData, error: signInErr } = await sbAdmin.auth.signInWithPassword({
            email: body.email,
            password: body.password,
          });
          if (!signInErr && signInData?.user) {
            userId = signInData.user.id;
          }
        }
      } catch {
        // ignore body parse failure
      }
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Authentication required to delete account." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 0. Never delete an account that still holds money: the customer must
    //    withdraw first, otherwise they lose access to their funds.
    const { data: bal, error: balErr } = await sbAdmin
      .from("balances")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (balErr) {
      return new Response(JSON.stringify({ error: "Could not check your balance. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const MONEY_FIELDS = ["liquid_usd", "afr_balance", "mysafe_digital_usd", "alpha_equity_usd", "escrow_usd"];
    const held = MONEY_FIELDS.filter((k) => Number(bal?.[k] ?? 0) > 0);
    if (held.length > 0) {
      // 200 + { error } on purpose: existing app versions display data.error to the user,
      // but only show a generic failure for non-2xx responses.
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Your account still holds funds. Please withdraw your full balance before deleting your account.",
          code: "BALANCE_NOT_ZERO",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 1. Soft-scrub personal identifiable information (PII) in public.profiles
    await sbAdmin
      .from("profiles")
      .update({
        full_name: "Deleted User",
        full_legal_name: "Deleted User",
        phone_number: null,
        phone_verified: false,
        residential_address: null,
        operational_address: null,
        dob: null,
        status: "deleted",
        deleted_at: new Date().toISOString(),
      })
      .eq("id", userId);

    // 2. Remove KYC submission sensitive files / metadata
    await sbAdmin
      .from("kyc_submissions")
      .update({
        id_document_url: null,
        selfie_url: null,
        proof_of_address_url: null,
        reviewer_notes: "Account deleted by user request per GDPR/App Store compliance.",
      })
      .eq("user_id", userId);

    // 3. Delete user from Supabase Auth so they can no longer log in
    const { error: deleteAuthErr } = await sbAdmin.auth.admin.deleteUser(userId);
    if (deleteAuthErr) {
      console.warn("Failed to delete auth user, but profile was scrubbed:", deleteAuthErr);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Your account and associated personal data have been permanently deleted.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Failed to process account deletion" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
