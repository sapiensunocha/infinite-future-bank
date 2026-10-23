// send-otp — Twilio Verify API
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { phoneNumber, channel = "sms" } = await req.json();
    if (!phoneNumber) throw new Error("Phone number required");

    const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, "");
    const demoPhone = Deno.env.get("REVIEW_DEMO_PHONE") || "+15555550199";

    // Reviewer & Test bypass (for Apple App Review & Google Play Console)
    // Allows testing with standard test numbers without incurring SMS charges or delivery delays
    if (cleanPhone === demoPhone || cleanPhone.startsWith("+155501") || cleanPhone === "+15555550100") {
      return new Response(JSON.stringify({ ok: true, demo: true, message: "Demo OTP dispatched (use code: 123456)" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken  = Deno.env.get("TWILIO_AUTH_TOKEN");
    const verifySid  = Deno.env.get("TWILIO_VERIFY_SID");

    if (!accountSid || !authToken || !verifySid) {
      throw new Error("SMS verification service is temporarily undergoing maintenance. Please contact support or use a verified test account.");
    }

    const res = await fetch(
      `https://verify.twilio.com/v2/Services/${verifySid}/Verifications`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: phoneNumber, Channel: channel }),
      }
    );

    const data = await res.json();
    console.log("TWILIO_SEND_RESPONSE", JSON.stringify({ httpStatus: res.status, body: data }));
    if (!res.ok) throw new Error(`Twilio ${res.status}: ${data.message || data.detail || JSON.stringify(data)}`);

    return new Response(JSON.stringify({ ok: true, sid: data.sid, status: data.status }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
