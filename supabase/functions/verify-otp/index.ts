// verify-otp — Twilio Verify API
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
    const { phoneNumber, code, userId } = await req.json();
    if (!phoneNumber || !code) throw new Error("Phone and code required");

    const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, "");
    const cleanCode = String(code).trim();
    const demoPhone = Deno.env.get("REVIEW_DEMO_PHONE") || "+15555550199";
    const demoCode = Deno.env.get("REVIEW_DEMO_CODE") || "123456";

    let approved = false;

    // Reviewer & Test bypass (Apple App Review & Google Play QA)
    if (
      (cleanPhone === demoPhone || cleanPhone.startsWith("+155501") || cleanPhone === "+15555550100") &&
      cleanCode === demoCode
    ) {
      approved = true;
    } else {
      const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const authToken  = Deno.env.get("TWILIO_AUTH_TOKEN");
      const verifySid  = Deno.env.get("TWILIO_VERIFY_SID");

      if (!accountSid || !authToken || !verifySid) {
        throw new Error("Verification service is not configured. Please use demo credentials.");
      }

      const res = await fetch(
        `https://verify.twilio.com/v2/Services/${verifySid}/VerificationCheck`,
        {
          method: "POST",
          headers: {
            "Authorization": `Basic ${btoa(`${accountSid}:${authToken}`)}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ To: cleanPhone, Code: cleanCode }),
        }
      );

      const data = await res.json();
      if (res.ok && data.status === "approved") {
        approved = true;
      }
    }

    if (!approved) {
      throw new Error("Invalid or expired code");
    }

    // Mark phone as verified + auto-confirm email (no email-click needed)
    if (userId) {
      await Promise.all([
        sb.from("profiles").update({
          phone_number: phoneNumber,
          phone_verified: true,
        }).eq("id", userId),
        sb.auth.admin.updateUserById(userId, { email_confirm: true }),
      ]);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
