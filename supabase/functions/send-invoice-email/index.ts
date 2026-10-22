// send-invoice-email
// Sends a branded IFB invoice / payment request to a recipient via Resend.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { to, from_name, amount, reason, pay_link } = await req.json();
    if (!to || !pay_link) throw new Error("to and pay_link are required");

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");

    const displayAmount = amount ? `$${Number(amount).toFixed(2)}` : "See link";

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);border:1px solid #e2e8f0;">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1e40af,#4f46e5);padding:32px 40px;text-align:center;">
          <span style="font-size:32px;font-weight:900;letter-spacing:6px;color:#fff;">DEUS</span>
          <p style="margin:8px 0 0;color:#bfdbfe;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Infinite Future Bank</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px;">
          <p style="margin:0 0 8px;font-size:13px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Payment Request</p>
          <h1 style="margin:0 0 24px;font-size:28px;font-weight:900;color:#0f172a;">${displayAmount}</h1>
          <p style="margin:0 0 6px;font-size:14px;color:#475569;"><strong>From:</strong> ${from_name || "Your contact"}</p>
          ${reason ? `<p style="margin:0 0 24px;font-size:14px;color:#475569;"><strong>For:</strong> ${reason}</p>` : "<p style='margin:0 0 24px;'></p>"}
          <a href="${pay_link}" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#4f46e5);color:#fff;text-decoration:none;padding:16px 32px;border-radius:14px;font-weight:900;font-size:14px;letter-spacing:1px;text-transform:uppercase;">Pay Now</a>
          <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;">Or copy this link: <a href="${pay_link}" style="color:#3b82f6;">${pay_link}</a></p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:11px;color:#94a3b8;">Sent via DEUS · Infinite Future Bank · Regulated Financial Infrastructure</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: "DEUS — IFB <noreply@infinitefuturebank.org>",
        to: [to],
        subject: `${from_name || "Someone"} is requesting ${displayAmount} via IFB`,
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Email sending failed");

    return new Response(JSON.stringify({ sent: true, id: data.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-invoice-email error:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
