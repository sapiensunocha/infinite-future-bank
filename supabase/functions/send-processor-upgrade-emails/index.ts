// send-processor-upgrade-emails
// Sends upgrade notification emails to all users who became P2P processors
// Called once after migration or on demand by admin
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("EMAIL_API_KEY") || Deno.env.get("MICHAEL_RESEND_API_KEY") || Deno.env.get("RESEND_API_KEY")!;
const APP_URL = Deno.env.get("APP_URL") || "https://deus.infinitefuturebank.org";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendEmail(to: string, name: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "IFB <onboarding@resend.dev>",
      to: [to],
      subject: "You are now an IFB Verified P2P Processor",
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0B0F19;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-size:13px;font-weight:900;letter-spacing:0.3em;color:#2563EB;text-transform:uppercase;">Infinite Future Bank</div>
      <div style="font-size:11px;color:#64748B;letter-spacing:0.15em;text-transform:uppercase;margin-top:4px;">DEUS Protocol</div>
    </div>

    <div style="background:linear-gradient(135deg,#1E3A8A,#1D4ED8);border-radius:24px;padding:40px;margin-bottom:24px;text-align:center;">
      <div style="font-size:48px;margin-bottom:16px;">🏦</div>
      <h1 style="color:#fff;font-size:26px;font-weight:900;margin:0 0 12px;letter-spacing:-0.02em;">
        You are now a<br/>Verified IFB Processor
      </h1>
      <p style="color:#93C5FD;font-size:15px;margin:0;line-height:1.6;">
        Hello ${name || "IFB Member"}, your account has been upgraded to <strong style="color:#fff;">P2P Processor status</strong>.
        You can now facilitate withdrawals and deposits for other members of the IFB network.
      </p>
    </div>

    <div style="background:#111827;border-radius:20px;padding:28px;margin-bottom:24px;border:1px solid #1F2937;">
      <h2 style="color:#F9FAFB;font-size:16px;font-weight:900;margin:0 0 20px;letter-spacing:-0.01em;">What this means for you</h2>
      <div style="display:grid;gap:14px;">
        <div style="display:flex;align-items:flex-start;gap:12px;">
          <div style="width:32px;height:32px;background:#1D4ED8;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px;">💰</div>
          <div>
            <div style="color:#F9FAFB;font-weight:700;font-size:14px;">Earn on Every Transaction</div>
            <div style="color:#9CA3AF;font-size:13px;margin-top:2px;">Receive a fee for every P2P withdrawal you process for other members.</div>
          </div>
        </div>
        <div style="display:flex;align-items:flex-start;gap:12px;">
          <div style="width:32px;height:32px;background:#059669;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px;">✅</div>
          <div>
            <div style="color:#F9FAFB;font-weight:700;font-size:14px;">Verified Processor Badge</div>
            <div style="color:#9CA3AF;font-size:13px;margin-top:2px;">Your profile now shows a verified processor badge with a 100/100 rating.</div>
          </div>
        </div>
        <div style="display:flex;align-items:flex-start;gap:12px;">
          <div style="width:32px;height:32px;background:#7C3AED;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px;">🌍</div>
          <div>
            <div style="color:#F9FAFB;font-weight:700;font-size:14px;">Help Users in Your Region</div>
            <div style="color:#9CA3AF;font-size:13px;margin-top:2px;">Serve as the local face of IFB. Accept cash, mobile money, or bank transfers.</div>
          </div>
        </div>
        <div style="display:flex;align-items:flex-start;gap:12px;">
          <div style="width:32px;height:32px;background:#D97706;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px;">🆔</div>
          <div>
            <div style="color:#F9FAFB;font-weight:700;font-size:14px;">Complete Your KYC to Unlock Full Capacity</div>
            <div style="color:#9CA3AF;font-size:13px;margin-top:2px;">Submit your identity documents to increase your daily processing limit.</div>
          </div>
        </div>
      </div>
    </div>

    <div style="text-align:center;margin-bottom:32px;">
      <a href="${APP_URL}" style="display:inline-block;background:#2563EB;color:#fff;font-size:14px;font-weight:900;letter-spacing:0.1em;text-transform:uppercase;padding:16px 40px;border-radius:14px;text-decoration:none;">
        Open DEUS App
      </a>
    </div>

    <div style="border-top:1px solid #1F2937;padding-top:20px;text-align:center;">
      <p style="color:#4B5563;font-size:12px;margin:0;line-height:1.6;">
        Infinite Future Bank · DEUS Protocol<br/>
        You received this because your account was upgraded to Processor status.<br/>
        <a href="${APP_URL}" style="color:#2563EB;">Visit your profile</a> to see your new badge.
      </p>
    </div>
  </div>
</body>
</html>`,
    }),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "unknown");
    console.error(`Resend error for ${to}: ${res.status} ${errBody}`);
    return { ok: false, error: `${res.status}: ${errBody}` };
  }
  return { ok: true };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Get pending emails from queue
  const { data: emails } = await sb
    .from("system_emails")
    .select("id, user_id, email, template")
    .eq("template", "processor_upgrade")
    .eq("status", "pending")
    .limit(50);

  if (!emails || emails.length === 0) {
    return new Response(JSON.stringify({ sent: 0, message: "No pending emails" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let sent = 0;
  let failed = 0;

  for (const item of emails) {
    if (!item.email) continue;
    // Get user name
    const { data: profile } = await sb.from("profiles").select("full_name").eq("id", item.user_id).maybeSingle();
    const name = profile?.full_name || "";

    const result = await sendEmail(item.email, name);
    if (result.ok) {
      await sb.from("system_emails").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", item.id);
      sent++;
    } else {
      await sb.from("system_emails").update({ status: "failed", error: result.error || "Resend API rejected" }).eq("id", item.id);
      failed++;
    }
  }

  return new Response(JSON.stringify({ sent, failed, total: emails.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
