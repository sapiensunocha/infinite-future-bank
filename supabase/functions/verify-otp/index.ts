// verify-otp — Twilio Verify API
// Rate limiting: there is no OTP-attempts table; we rely on Twilio Verify, which
// caps check attempts per verification (5) and expires codes after 10 minutes.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, getAuthedUser, timingSafeEqualStr } from "../_shared/auth.ts";

const E164 = /^\+[1-9]\d{6,14}$/;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(req), "Content-Type": "application/json" } });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // NOTE: any `userId` in the body is ignored; identity comes from the JWT.
    const { phoneNumber, code, mode } = await req.json();
    if (!phoneNumber || !code || typeof phoneNumber !== "string" || typeof code !== "string") {
      throw new Error("Phone and code required");
    }

    const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, "");
    if (!E164.test(cleanPhone)) throw new Error("Invalid phone number format");

    // Register / settings mode requires a real user session BEFORE we spend a Twilio check.
    const authedUser = mode === "login" ? null : await getAuthedUser(req).catch(() => null);
    if (mode !== "login" && !authedUser) return json({ ok: false, error: "Please sign in to verify your phone." }, 401);

    // Reviewer bypass: only when explicitly enabled AND exact phone AND exact code from env.
    const demoPhone = Deno.env.get("REVIEW_DEMO_PHONE");
    const demoCode = Deno.env.get("REVIEW_DEMO_CODE");
    const isDemo = Deno.env.get("REVIEW_DEMO_ENABLED") === "true" &&
      !!demoPhone && !!demoCode && cleanPhone === demoPhone && timingSafeEqualStr(code, demoCode);

    if (!isDemo) {
      const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
      const authToken  = Deno.env.get("TWILIO_AUTH_TOKEN")!;
      const verifySid  = Deno.env.get("TWILIO_VERIFY_SID")!;

      const res = await fetch(
        `https://verify.twilio.com/v2/Services/${verifySid}/VerificationCheck`,
        {
          method: "POST",
          headers: {
            "Authorization": `Basic ${btoa(`${accountSid}:${authToken}`)}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ To: cleanPhone, Code: code }),
        }
      );

      const data = await res.json();
      console.log("TWILIO_VERIFY", JSON.stringify({ httpStatus: res.status, status: data?.status, sid: data?.sid }));
      if (!res.ok) {
        // 404 = verification expired or never existed
        if (res.status === 404 || data.code === 20404) throw new Error("Code expired. Please tap Resend Code and verify within 10 minutes.");
        if (res.status === 429) throw new Error("Too many attempts. Please request a new code later.");
        throw new Error("Verification failed. Please try again.");
      }
      if (data.status !== "approved") {
        throw new Error("Incorrect code. Please check your messages and try again.");
      }
    }

    // LOGIN MODE: find user by exact phone number and return a session
    if (mode === "login") {
      const { data: profile, error: profileErr } = await sb
        .from("profiles")
        .select("id")
        .eq("phone_number", cleanPhone)
        .eq("phone_verified", true)
        .maybeSingle();

      if (profileErr || !profile) throw new Error("No account found with this phone number");

      const { data: userData, error: userErr } = await sb.auth.admin.getUserById(profile.id);
      if (userErr || !userData.user?.email) throw new Error("Account not found");

      const { data: linkData, error: linkErr } = await sb.auth.admin.generateLink({
        type: "magiclink",
        email: userData.user.email,
      });
      if (linkErr || !linkData) throw new Error("Failed to create session");

      return json({ ok: true, hashed_token: linkData.properties.hashed_token });
    }

    // REGISTER / SETTINGS MODE: mark phone verified on the caller's own profile.
    // The caller already has a session, so no magic link is returned.
    const { error: updErr } = await sb.from("profiles").update({
      phone_number: cleanPhone,
      phone_verified: true,
    }).eq("id", authedUser!.id);
    if (updErr) {
      // e.g. unique violation if the number belongs to another account
      console.error("verify-otp profile update failed:", updErr.code);
      throw new Error("Could not save this phone number.");
    }

    return json({ ok: true });
  } catch (err: any) {
    return json({ ok: false, error: err.message });
  }
});
