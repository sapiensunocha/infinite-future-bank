// verify-otp
// Validates a provided 6-digit code against the database.
// If valid, updates the user's phone_verified status.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { phoneNumber, otpCode, userId } = await req.json();
    if (!phoneNumber || !otpCode) throw new Error("Phone and OTP code required");

    // 1. Fetch latest valid OTP for this phone
    const { data: verification, error: fetchErr } = await sb
      .from("otp_verifications")
      .select("*")
      .eq("phone_number", phoneNumber)
      .eq("otp_code", otpCode)
      .is("verified_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fetchErr || !verification) throw new Error("Invalid or expired OTP code.");

    // 2. Mark as verified
    await sb.from("otp_verifications").update({ verified_at: new Date().toISOString() }).eq("id", verification.id);

    // 3. Link phone to profile and mark as verified
    if (userId) {
      await sb.from("profiles").update({ 
        phone_number: phoneNumber, 
        phone_verified: true 
      }).eq("id", userId);
    }

    // 4. Log Success on Blockchain Ledger
    await sb.from("afr_ledger").insert({
      user_id: userId,
      tx_type: "mint",
      afr_amount: 0,
      usd_equivalent: 0,
      notes: `Phone Identity Verified: ${phoneNumber.slice(0, -4)}****`,
      status: "confirmed"
    });

    return new Response(JSON.stringify({ ok: true, message: "Identity Verified." }), { 
      status: 200, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 400, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
