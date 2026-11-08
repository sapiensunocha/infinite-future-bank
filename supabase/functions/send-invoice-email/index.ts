// send-invoice-email — emails a "Request money" pay link (Receive → Request payment).
//   POST { to, amount?, reason? }   (signed-in user)
// Security (was an open relay: anyone could send IFB-branded mail with any link):
//   * login required; the sender name comes from the requester's profile
//   * the pay link is built HERE from the requester's id — a caller-supplied link is ignored
//   * all text is HTML-escaped; one recipient per call; max 20 requests per user per hour
// Invoices use the `invoices` function instead.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, errorResponse, getAuthedUser, HttpError, jsonResponse } from "../_shared/auth.ts";
import { esc, sendEmail } from "../_shared/notify.ts";

const APP_URL = Deno.env.get("APP_URL") ?? "https://app.infinitefuturebank.org";
const FROM = Deno.env.get("EMAIL_FROM") ?? "Infinite Future Bank <noreply@infinitefuturebank.org>";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });
  try {
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
    const user = await getAuthedUser(req);
    const b = await req.json().catch(() => ({}));
    const to = String(b.to ?? "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to) || to.length > 254) throw new HttpError(400, "Enter a valid email address");
    const raw = Number(b.amount);
    const amount = Number.isFinite(raw) && raw > 0 ? raw : null;   // older apps send "0" for "no amount"
    if (amount !== null && amount > 1_000_000) throw new HttpError(400, "Check the amount");
    const reason = String(b.reason ?? "").trim().slice(0, 140);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const since = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await admin.from("app_telemetry").select("id", { count: "exact", head: true })
      .eq("event", "payment_request_email").gte("created_at", since).filter("metadata->>user_id", "eq", user.id);
    if ((count ?? 0) >= 20) throw new HttpError(429, "Too many request emails. Please try again later.");

    const { data: prof } = await admin.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle();
    const name = String(prof?.full_name || "An IFB user");
    const link = `${APP_URL}/pay?to=${user.id}${amount ? `&amount=${amount}` : ""}${reason ? `&reason=${encodeURIComponent(reason)}` : ""}`;
    const display = amount ? `$${amount.toFixed(2)}` : "a payment";

    const html = `<!doctype html><html><body style="margin:0;background:#f6f7fb;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden">
<tr><td style="background:#2563eb;padding:20px 28px;color:#fff;font-size:16px;font-weight:700">Infinite Future Bank</td></tr>
<tr><td style="padding:28px">
<p style="margin:0 0 4px;color:#64748b;font-size:13px">Payment request</p>
<p style="margin:0 0 16px;font-size:28px;font-weight:700">${esc(display)}</p>
<p style="margin:0 0 6px;font-size:14px;color:#475569"><strong>From:</strong> ${esc(name)}</p>
${reason ? `<p style="margin:0 0 20px;font-size:14px;color:#475569"><strong>For:</strong> ${esc(reason)}</p>` : ""}
<p style="margin:24px 0 8px;text-align:center"><a href="${esc(link)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:12px">Pay ${esc(display)}</a></p>
<p style="margin:0;text-align:center;font-size:12px;color:#94a3b8">${esc(link)}</p>
</td></tr>
<tr><td style="padding:16px 28px;background:#f8fafc;font-size:11px;color:#94a3b8">Sent because ${esc(name)} requested a payment from you with Infinite Future Bank. If you don't know them, ignore this email.</td></tr>
</table></td></tr></table></body></html>`;

    const status = await sendEmail([to], `${name} is requesting ${display} via IFB`, html, { from: FROM, replyTo: prof?.email || user.email || undefined });
    await admin.from("app_telemetry").insert([{ event: "payment_request_email", metadata: { user_id: user.id, status } }]);
    if (status !== "sent") throw new HttpError(502, "The email could not be sent. Share the link instead.");
    return jsonResponse(req, { sent: true });
  } catch (e) {
    return errorResponse(req, e);
  }
});
