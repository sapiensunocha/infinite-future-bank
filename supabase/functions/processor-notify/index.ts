import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Secrets — set via: supabase secrets set KEY=value
const RESEND_KEY    = Deno.env.get("EMAIL_API_KEY") ?? "";
const AT_API_KEY    = Deno.env.get("AT_API_KEY") ?? "";          // Africa's Talking API key
const AT_USERNAME   = Deno.env.get("AT_USERNAME") ?? "sandbox";  // Africa's Talking username
const TWILIO_SID    = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
const TWILIO_TOKEN  = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
const TWILIO_WA_NUM = Deno.env.get("TWILIO_WA_FROM") ?? "";      // e.g. whatsapp:+14155238886
const SUPABASE_URL  = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const PORTAL_URL = "https://app.infinitefuturebank.org/processor";

// ─── SMS via Africa's Talking ─────────────────────────────────────────────────
async function sendSMS(phone: string, message: string) {
  if (!AT_API_KEY || !phone) return;
  try {
    await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        "Accept":       "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "apiKey":       AT_API_KEY,
      },
      body: new URLSearchParams({
        username: AT_USERNAME,
        to:       phone,
        message:  message,
      }).toString(),
    });
  } catch (_) {}
}

// ─── WhatsApp via Twilio ──────────────────────────────────────────────────────
async function sendWhatsApp(phone: string, message: string) {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_WA_NUM || !phone) return;
  try {
    await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: "Basic " + btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`),
        },
        body: new URLSearchParams({
          From: TWILIO_WA_NUM,
          To:   `whatsapp:${phone}`,
          Body: message,
        }).toString(),
      }
    );
  } catch (_) {}
}

// ─── Email via Resend ─────────────────────────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_KEY || !to) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_KEY}`,
      },
      body: JSON.stringify({
        from: "IFB Network <noreply@infinitefuturebank.org>",
        to,
        subject,
        html,
      }),
    });
  } catch (_) {}
}

// ─── Message builders ─────────────────────────────────────────────────────────
function smsText(type: "deposit" | "withdrawal", amount: number, network: string, ref?: string, mobile?: string) {
  const amt = `$${amount.toFixed(2)}`;
  if (type === "deposit") {
    return `IFB: New deposit ${amt} via ${network}. Ref: ${ref ?? "N/A"}. User has sent to your number. Confirm at: ${PORTAL_URL}`;
  }
  return `IFB: Send ${amt} via ${network} to ${mobile ?? "N/A"}. Then confirm sent at: ${PORTAL_URL}`;
}

function emailHtml(type: "deposit" | "withdrawal", data: {
  processorName: string;
  amount: number;
  network: string;
  refCode?: string;
  userMobile?: string;
  orderId: string;
}) {
  const fmt = (n: number) => `$${n.toFixed(2)}`;

  if (type === "deposit") {
    return `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#0f172a;color:#e2e8f0;padding:32px">
<div style="max-width:520px;margin:0 auto;background:#1e293b;border-radius:16px;padding:32px;border:1px solid #334155">
  <h1 style="color:#3b82f6;font-size:22px;margin:0 0 8px">💳 New Deposit Request</h1>
  <p style="color:#94a3b8;margin:0 0 24px;font-size:13px">IFB Liquidity Processor Network</p>
  <div style="background:#0f172a;border-radius:12px;padding:20px;margin-bottom:20px;text-align:center">
    <p style="margin:0;font-size:36px;font-weight:900;color:#10b981">${fmt(data.amount)}</p>
    <p style="margin:4px 0 0;color:#64748b;font-size:12px">${data.network} deposit</p>
  </div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
    <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px">Network</td>
        <td style="padding:8px 0;font-weight:700;text-align:right">${data.network}</td></tr>
    <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px">Reference Code</td>
        <td style="padding:8px 0;font-weight:900;text-align:right;color:#f59e0b;font-family:monospace;font-size:16px">${data.refCode ?? "—"}</td></tr>
    <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px">Order ID</td>
        <td style="padding:8px 0;font-size:11px;color:#64748b;text-align:right;font-family:monospace">${data.orderId.slice(0,8).toUpperCase()}</td></tr>
  </table>
  <div style="background:#1e3a2f;border:1px solid #10b981;border-radius:12px;padding:16px;margin-bottom:24px">
    <p style="margin:0;font-size:13px;color:#10b981">
      <strong>Action required:</strong> The user has sent <strong>${fmt(data.amount)}</strong> to your ${data.network} number with reference <strong>${data.refCode ?? "N/A"}</strong>. Once you receive it, log in and confirm.
    </p>
  </div>
  <a href="${PORTAL_URL}" style="display:block;text-align:center;background:#3b82f6;color:#fff;padding:16px;border-radius:12px;text-decoration:none;font-weight:900;font-size:13px;text-transform:uppercase;letter-spacing:1px">
    Confirm Receipt →
  </a>
  <p style="margin:20px 0 0;font-size:11px;color:#475569;text-align:center">IFB Liquidity Network · Do not share this email</p>
</div></body></html>`;
  }

  return `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#0f172a;color:#e2e8f0;padding:32px">
<div style="max-width:520px;margin:0 auto;background:#1e293b;border-radius:16px;padding:32px;border:1px solid #334155">
  <h1 style="color:#f59e0b;font-size:22px;margin:0 0 8px">📤 New Withdrawal to Send</h1>
  <p style="color:#94a3b8;margin:0 0 24px;font-size:13px">IFB Liquidity Processor Network</p>
  <div style="background:#0f172a;border-radius:12px;padding:20px;margin-bottom:20px;text-align:center">
    <p style="margin:0;font-size:36px;font-weight:900;color:#f59e0b">${fmt(data.amount)}</p>
    <p style="margin:4px 0 0;color:#64748b;font-size:12px">${data.network} withdrawal</p>
  </div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
    <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px">Network</td>
        <td style="padding:8px 0;font-weight:700;text-align:right">${data.network}</td></tr>
    <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px">Send To (Mobile)</td>
        <td style="padding:8px 0;font-weight:900;text-align:right;color:#f59e0b;font-family:monospace;font-size:18px">${data.userMobile ?? "—"}</td></tr>
    <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px">Order ID</td>
        <td style="padding:8px 0;font-size:11px;color:#64748b;text-align:right;font-family:monospace">${data.orderId.slice(0,8).toUpperCase()}</td></tr>
  </table>
  <div style="background:#2d1f00;border:1px solid #f59e0b;border-radius:12px;padding:16px;margin-bottom:24px">
    <p style="margin:0;font-size:13px;color:#f59e0b">
      <strong>Action required:</strong> Send <strong>${fmt(data.amount)}</strong> via ${data.network} to <strong>${data.userMobile ?? "N/A"}</strong>, then confirm in your dashboard.
    </p>
  </div>
  <a href="${PORTAL_URL}" style="display:block;text-align:center;background:#f59e0b;color:#000;padding:16px;border-radius:12px;text-decoration:none;font-weight:900;font-size:13px;text-transform:uppercase;letter-spacing:1px">
    Mark as Sent →
  </a>
  <p style="margin:20px 0 0;font-size:11px;color:#475569;text-align:center">IFB Liquidity Network · Do not share this email</p>
</div></body></html>`;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { order_id } = await req.json();
    if (!order_id) throw new Error("order_id required");

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: order, error } = await sb
      .from("p2p_orders")
      .select(`
        id, order_type, amount_usd, network, reference_code, user_mobile, status,
        processor:processor_id (
          id, full_name, email, phone
        )
      `)
      .eq("id", order_id)
      .maybeSingle();

    if (error || !order) throw new Error("Order not found");

    const proc = order.processor as {
      id: string; full_name: string; email: string; phone: string | null;
    } | null;

    if (!proc) throw new Error("No processor assigned");

    const type    = order.order_type as "deposit" | "withdrawal";
    const amount  = Number(order.amount_usd);
    const network = order.network ?? "Mobile Money";
    const refCode = order.reference_code;
    const mobile  = order.user_mobile;

    // Build messages
    const sms = smsText(type, amount, network, refCode, mobile);
    const emailSubject = type === "deposit"
      ? `New deposit $${amount.toFixed(2)} via ${network} — action required`
      : `Send $${amount.toFixed(2)} via ${network} — action required`;
    const html = emailHtml(type, {
      processorName: proc.full_name,
      amount, network, refCode, userMobile: mobile,
      orderId: order.id,
    });

    // Fire all three channels in parallel
    await Promise.allSettled([
      sendEmail(proc.email, emailSubject, html),
      sendSMS(proc.phone ?? "", sms),
      sendWhatsApp(proc.phone ?? "", sms),
    ]);

    return new Response(JSON.stringify({ ok: true, channels: ["email", "sms", "whatsapp"] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
