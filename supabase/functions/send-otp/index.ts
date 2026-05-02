// send-otp
// Generates a 6-digit verification code and "sends" it via Gmail/SMS logic.
// For this sovereign implementation, it records the dispatch on the blockchain.

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
    const { phoneNumber, email } = await req.json();
    if (!phoneNumber) throw new Error("Phone number required");

    // 1. Get user email (either passed in or from auth session)
    let targetEmail = email;
    let userId = null;

    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
       const { data: { user } } = await sb.auth.getUser(authHeader.split(" ")[1]);
       if (user) {
         targetEmail = targetEmail || user.email;
         userId = user.id;
       }
    }

    if (!targetEmail) throw new Error("Target email required for dispatch.");

    // 2. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. Store in OTP verifications table
    const { error: dbError } = await sb.from("otp_verifications").insert([{
      phone_number: phoneNumber,
      otp_code: otp,
      expires_at: new Date(Date.now() + 10 * 60000).toISOString()
    }]);

    if (dbError) throw dbError;

    // 4. Dispatch via Sovereign Email Engine
    const EMAIL_API_KEY = Deno.env.get("RESEND_API_KEY") || Deno.env.get("EMAIL_API_KEY");
    
    if (EMAIL_API_KEY) {
      console.log(`[DISPATCH] Dispatching OTP ${otp} to ${targetEmail} via Resend...`);
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${EMAIL_API_KEY}`
        },
        body: JSON.stringify({
          from: "IFB Sovereign <identity@infinitefuturebank.org>",
          to: targetEmail,
          subject: "Your IFB Identity Code",
          html: `<div style="font-family: sans-serif; padding: 20px;">
                  <h2 style="color: #2563eb;">Verify Your Identity</h2>
                  <p>Your 6-digit Sovereign OTP for phone verification is:</p>
                  <div style="font-size: 32px; font-weight: 900; letter-spacing: 5px; color: #1e293b; padding: 10px 0;">${otp}</div>
                  <p style="font-size: 12px; color: #64748b;">This code expires in 10 minutes. If you did not request this, please secure your vault immediately.</p>
                </div>`
        })
      });
    }

    // 5. Log Dispatch on Blockchain Ledger (only if we have a userId)
    if (userId) {
      await sb.from("afr_ledger").insert({
        user_id: userId,
        tx_type: "mint",
        afr_amount: 0,
        usd_equivalent: 0,
        notes: `OTP Dispatched to ${phoneNumber.slice(0, -4)}****`,
        status: "confirmed"
      });
    }

    return new Response(JSON.stringify({ ok: true, message: "OTP Dispatched." }), { 
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
