// invoices — create, send and void invoices.
//   POST { action: "create", invoice: { client_name, client_email, items: [{description, quantity, unit_price}], tax_rate?, due_date?, notes? }, send?: boolean }
//     → { invoice }   (creates a private one-time Payment Page as the "Pay" link)
//   POST { action: "send", id }  → { invoice }   (emails the client the invoice + pay link)
//   POST { action: "void", id }  → { invoice }   (cancels it and closes the pay link)
// Totals are computed here, never trusted from the app. The pay link is created through
// the payment-pages function as the merchant, so the same rules apply (verified KYC).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, errorResponse, getAuthedUser, HttpError, jsonResponse } from "../_shared/auth.ts";
import { InvoiceInputError, money, normaliseInvoice } from "../_shared/invoice-math.ts";
import { esc, sendEmail } from "../_shared/notify.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

async function loadOwn(userId: string, id: unknown) {
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(400, "Invoice id is required");
  const { data } = await admin.from("invoices").select("*").eq("id", id).eq("merchant_id", userId).maybeSingle();
  if (!data) throw new HttpError(404, "Invoice not found");
  return data;
}

function emailHtml(inv: Record<string, any>, merchant: string): string {
  const rows = (inv.items as any[]).map((it) =>
    `<tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0">${esc(it.description)}${it.quantity !== 1 ? ` × ${esc(it.quantity)}` : ""}</td>` +
    `<td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right">${money(it.amount_cents)}</td></tr>`).join("");
  const tax = inv.tax_cents > 0 ? `<tr><td style="padding:6px 0;color:#64748b">Tax (${esc(inv.tax_rate)}%)</td><td style="text-align:right;color:#64748b">${money(inv.tax_cents)}</td></tr>` : "";
  return `<!doctype html><html><body style="margin:0;background:#f6f7fb;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden">
<tr><td style="background:#2563eb;padding:20px 28px;color:#fff"><div style="font-size:18px;font-weight:700">${esc(merchant)}</div><div style="font-size:13px;opacity:.85">Invoice ${esc(inv.number)} · sent with Infinite Future Bank</div></td></tr>
<tr><td style="padding:28px">
<p style="margin:0 0 4px;color:#64748b;font-size:13px">Amount due</p>
<p style="margin:0 0 16px;font-size:28px;font-weight:700">${money(inv.total_cents)}</p>
<p style="margin:0 0 20px;font-size:14px;color:#475569">Billed to ${esc(inv.client_name)}${inv.due_date ? ` · due ${esc(inv.due_date)}` : ""}</p>
<table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">${rows}
<tr><td style="padding:8px 0;color:#64748b">Subtotal</td><td style="text-align:right;color:#64748b">${money(inv.subtotal_cents)}</td></tr>${tax}
<tr><td style="padding:8px 0;font-weight:700">Total</td><td style="text-align:right;font-weight:700">${money(inv.total_cents)}</td></tr></table>
${inv.notes ? `<p style="margin:20px 0 0;font-size:13px;color:#475569;white-space:pre-line">${esc(inv.notes)}</p>` : ""}
<p style="margin:28px 0 8px;text-align:center"><a href="${esc(inv.pay_url)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:12px">Pay ${money(inv.total_cents)}</a></p>
<p style="margin:0;text-align:center;font-size:12px;color:#94a3b8">Card, mobile money, bank transfer or IFB wallet. Link: ${esc(inv.pay_url)}</p>
</td></tr>
<tr><td style="padding:16px 28px;background:#f8fafc;font-size:11px;color:#94a3b8">You received this because ${esc(merchant)} sent you an invoice using Infinite Future Bank. If you don't recognise it, don't pay and reply to this email.</td></tr>
</table></td></tr></table></body></html>`;
}

const INVOICE_FROM = Deno.env.get("EMAIL_FROM") ?? "Infinite Future Bank <noreply@infinitefuturebank.org>";

async function send(inv: Record<string, any>, merchant: string, replyTo?: string) {
  const status = await sendEmail([inv.client_email], `Invoice ${inv.number} from ${merchant} — ${money(inv.total_cents)}`, emailHtml(inv, merchant), { from: INVOICE_FROM, replyTo });
  if (status !== "sent") throw new HttpError(502, "The email could not be sent. Copy the pay link and share it instead.");
  const { data } = await admin.from("invoices")
    .update({ sent_at: new Date().toISOString(), sent_count: (inv.sent_count ?? 0) + 1 })
    .eq("id", inv.id).select("*").single();
  return data;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });
  try {
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
    const user = await getAuthedUser(req);
    const body = await req.json().catch(() => ({}));
    const { data: prof } = await admin.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle();
    const replyTo = String(prof?.email || user.email || "") || undefined;
    const merchant = String(prof?.full_name || "An IFB business");

    if (body.action === "create") {
      let inv;
      try { inv = normaliseInvoice(body.invoice); } catch (e) { if (e instanceof InvoiceInputError) throw new HttpError(400, e.message); throw e; }
      const { data: number, error: numErr } = await admin.rpc("_next_invoice_number", { p_merchant: user.id });
      if (numErr || !number) throw new Error(`invoice number: ${numErr?.code}`);

      // Pay link = private, one-time Payment Page created as the merchant (same rules: verified KYC).
      const pageRes = await fetch(`${SUPABASE_URL}/functions/v1/payment-pages`, {
        method: "POST",
        headers: { Authorization: req.headers.get("Authorization")!, apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "", "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_page",
          page: {
            title: `Invoice ${number}`,
            description: `${inv.client_name} — ${inv.items.map((i) => i.description).join(", ")}`.slice(0, 2000),
            visibility: "private", single_use: true, max_uses: 1,
            fields: [], pricing: { mode: "fixed", fee_bearer: "merchant", base_cents: inv.total_cents },
            success_message: `Thank you — invoice ${number} is paid.`,
          },
        }),
      });
      const page = await pageRes.json().catch(() => null);
      if (!pageRes.ok || !page?.page?.id) throw new HttpError(pageRes.status === 403 ? 403 : 502, page?.error || "Could not create the pay link");

      const { data: row, error } = await admin.from("invoices").insert({
        merchant_id: user.id, number, client_name: inv.client_name, client_email: inv.client_email, items: inv.items,
        subtotal_cents: inv.subtotal_cents, tax_rate: inv.tax_rate, tax_cents: inv.tax_cents, total_cents: inv.total_cents,
        due_date: inv.due_date, notes: inv.notes, page_id: page.page.id, pay_url: page.page.url,
      }).select("*").single();
      if (error) throw new Error(`invoice insert: ${error.code}`);
      if (body.send) {
        try { return jsonResponse(req, { invoice: await send(row, merchant, replyTo) }); }
        catch (e) { return jsonResponse(req, { invoice: row, warning: e instanceof Error ? e.message : "Email not sent" }); }
      }
      return jsonResponse(req, { invoice: row });
    }

    if (body.action === "send") {
      const inv = await loadOwn(user.id, body.id);
      if (inv.status !== "open") throw new HttpError(400, inv.status === "paid" ? "This invoice is already paid" : "This invoice was cancelled");
      return jsonResponse(req, { invoice: await send(inv, merchant, replyTo) });
    }

    if (body.action === "void") {
      const inv = await loadOwn(user.id, body.id);
      if (inv.status === "paid") throw new HttpError(400, "A paid invoice can't be cancelled");
      if (inv.page_id) await admin.from("payment_pages").update({ status: "inactive" }).eq("id", inv.page_id).eq("merchant_id", user.id);
      const { data } = await admin.from("invoices").update({ status: "void" }).eq("id", inv.id).select("*").single();
      return jsonResponse(req, { invoice: data });
    }

    throw new HttpError(400, "Unknown action");
  } catch (e) {
    return errorResponse(req, e);
  }
});
