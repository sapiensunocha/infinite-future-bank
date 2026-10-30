// send-otp — Twilio Verify API
// Rate limiting: there is no OTP-attempts table; we rely on Twilio Verify's
// built-in per-number send limits (and Fraud Guard). Add a table-backed limiter if needed.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/auth.ts";

const E164 = /^\+[1-9]\d{6,14}$/;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });
  const json = (body: unknown) =>
    new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders(req), "Content-Type": "application/json" } });

  try {
    const { phoneNumber, channel = "sms" } = await req.json();
    if (!phoneNumber || typeof phoneNumber !== "string") throw new Error("Phone number required");
    if (channel !== "sms" && channel !== "whatsapp" && channel !== "call") throw new Error("Unsupported channel");

    const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, "");
    if (!E164.test(cleanPhone)) throw new Error("Enter your phone number in international format, e.g. +15551234567");

    // Reviewer bypass (Apple App Review / Google Play). Off unless explicitly enabled,
    // and only for the single exact configured number. No hard-coded defaults.
    const demoPhone = Deno.env.get("REVIEW_DEMO_PHONE");
    if (Deno.env.get("REVIEW_DEMO_ENABLED") === "true" && demoPhone && cleanPhone === demoPhone) {
      return json({ ok: true, demo: true });
    }

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken  = Deno.env.get("TWILIO_AUTH_TOKEN");
    const verifySid  = Deno.env.get("TWILIO_VERIFY_SID");

    if (!accountSid || !authToken || !verifySid) {
      throw new Error("SMS verification service is temporarily undergoing maintenance. Please contact support.");
    }

    const res = await fetch(
      `https://verify.twilio.com/v2/Services/${verifySid}/Verifications`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: cleanPhone, Channel: channel }),
      }
    );

    const data = await res.json();
    console.log("TWILIO_SEND", JSON.stringify({ httpStatus: res.status, status: data?.status, sid: data?.sid }));
    if (!res.ok) {
      if (res.status === 429) throw new Error("Too many attempts. Please wait before requesting another code.");
      throw new Error("Could not send verification code. Please try again.");
    }

    return json({ ok: true, sid: data.sid, status: data.status });
  } catch (err: any) {
    return json({ ok: false, error: err.message });
  }
});
