// Payment Pages: answer encryption, IP hashing, provider verification and
// post-payment notifications. See docs/payment-pages.md.
//
// NOTE: an identical copy lives in apps/core/supabase/functions/_shared/page-orders.ts
// (used by that app's stripe-webhook). Keep the two files in sync.
//
// Never log answers, customer emails or provider secrets from this module.
import { HttpError, sha256Hex } from "./auth.ts";

// ---------------------------------------------------------------------------
// Minimal structural type for the service-role Supabase client, so this file
// works with both supabase-js builds used in the repo.
// ---------------------------------------------------------------------------
// deno-lint-ignore no-explicit-any
type AnyQuery = any;
export interface DbClient {
  from(table: string): AnyQuery;
  rpc(fn: string, args?: Record<string, unknown>): AnyQuery;
  auth: { admin: { getUserById(id: string): Promise<AnyQuery> } };
}

export const PAGE_ORDER_REF_PREFIX = "IFBPG-";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Extracts the order id from an 'IFBPG-<uuid>' provider reference, or null. */
export function orderIdFromRef(ref: unknown): string | null {
  if (typeof ref !== "string" || !ref.startsWith(PAGE_ORDER_REF_PREFIX)) return null;
  const id = ref.slice(PAGE_ORDER_REF_PREFIX.length);
  return UUID_RE.test(id) ? id.toLowerCase() : null;
}

export function isUuid(x: unknown): x is string {
  return typeof x === "string" && UUID_RE.test(x);
}

// ---------------------------------------------------------------------------
// Base64 helpers
// ---------------------------------------------------------------------------
function b64encode(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

// Works across TS lib versions (Uint8Array<ArrayBufferLike> vs BufferSource).
const bs = (u: Uint8Array): BufferSource => u as unknown as BufferSource;

function b64decode(s: string): Uint8Array {
  const bin = atob(s);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

// ---------------------------------------------------------------------------
// AES-256-GCM encryption of customer answers (PAYMENT_PAGE_DATA_KEY)
// Stored format: base64(iv[12] || ciphertext+tag). The order id is bound as
// additional authenticated data so a ciphertext cannot be moved to another order.
// ---------------------------------------------------------------------------
function rawDataKey(): Uint8Array {
  const env = Deno.env.get("PAYMENT_PAGE_DATA_KEY");
  if (!env) throw new HttpError(500, "Payment pages are not configured");
  let bytes: Uint8Array;
  try {
    bytes = b64decode(env.trim());
  } catch {
    throw new HttpError(500, "Payment pages are not configured");
  }
  if (bytes.length !== 32) throw new HttpError(500, "Payment pages are not configured");
  return bytes;
}

async function aesKey(): Promise<CryptoKey> {
  return await crypto.subtle.importKey("raw", bs(rawDataKey()), { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function aad(orderId: string): Uint8Array {
  return new TextEncoder().encode(`ifb-page-order:${orderId.toLowerCase()}`);
}

export async function encryptAnswers(answers: unknown, orderId: string): Promise<string> {
  const key = await aesKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(JSON.stringify(answers ?? {}));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: bs(aad(orderId)) }, key, bs(plain)),
  );
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv, 0);
  out.set(ct, iv.length);
  return b64encode(out);
}

export async function decryptAnswers(ciphertext: string, orderId: string): Promise<Record<string, unknown>> {
  const key = await aesKey();
  const buf = b64decode(ciphertext);
  if (buf.length < 12 + 16) throw new Error("ciphertext too short");
  const iv = buf.subarray(0, 12);
  const ct = buf.subarray(12);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bs(iv), additionalData: bs(aad(orderId)) }, key, bs(ct));
  return JSON.parse(new TextDecoder().decode(plain));
}

// ---------------------------------------------------------------------------
// IP hashing (raw IPs are never stored)
// ---------------------------------------------------------------------------
export function clientIp(req: Request): string {
  // cf-connecting-ip / x-real-ip are set by the platform edge; x-forwarded-for's
  // first hop is the fallback.
  const cf = req.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const xff = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return xff || "unknown";
}

export async function ipHash(req: Request): Promise<string> {
  const pepper = b64encode(rawDataKey());
  return await sha256Hex(`ifb-page-ip|${pepper}|${clientIp(req)}`);
}

// ---------------------------------------------------------------------------
// SSRF guard for merchant webhook URLs
// ---------------------------------------------------------------------------
function ipv4ToInt(ip: string): number | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (!m) return null;
  const parts = m.slice(1).map(Number);
  if (parts.some((p) => p > 255)) return null;
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

const V4_BLOCKS: Array<[string, number]> = [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
  ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
];

function isPrivateV4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n === null) return false;
  return V4_BLOCKS.some(([base, bits]) => {
    const b = ipv4ToInt(base)!;
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return ((n & mask) >>> 0) === ((b & mask) >>> 0);
  });
}

function expandV6(ip: string): number[] | null {
  let s = ip.toLowerCase();
  const zone = s.indexOf("%");
  if (zone >= 0) s = s.slice(0, zone);
  // Embedded IPv4 tail (e.g. ::ffff:127.0.0.1)
  const v4 = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(s);
  if (v4) {
    const n = ipv4ToInt(v4[1]);
    if (n === null) return null;
    s = s.slice(0, -v4[1].length) + ((n >>> 16) & 0xffff).toString(16) + ":" + (n & 0xffff).toString(16);
  }
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0;
  if (fill < 0) return null;
  const groups = [...head, ...Array(fill).fill("0"), ...tail];
  if (groups.length !== 8) return null;
  const out = groups.map((g) => (/^[0-9a-f]{1,4}$/.test(g) ? parseInt(g, 16) : NaN));
  return out.some(Number.isNaN) ? null : out;
}

function isPrivateV6(ip: string): boolean {
  const g = expandV6(ip);
  if (!g) return true; // unparseable literal: refuse
  if (g.every((x) => x === 0)) return true;                              // ::
  if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return true;    // ::1
  if ((g[0] & 0xfe00) === 0xfc00) return true;                           // fc00::/7 ULA
  if ((g[0] & 0xffc0) === 0xfe80) return true;                           // fe80::/10 link-local
  if ((g[0] & 0xffc0) === 0xfec0) return true;                           // fec0::/10 site-local
  if ((g[0] & 0xff00) === 0xff00) return true;                           // multicast
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true;                   // documentation
  const v4tail = `${g[6] >> 8}.${g[6] & 0xff}.${g[7] >> 8}.${g[7] & 0xff}`;
  // IPv4-mapped / -compatible / NAT64 well-known prefix
  if (g.slice(0, 5).every((x) => x === 0) && (g[5] === 0xffff || g[5] === 0)) return isPrivateV4(v4tail);
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)) return isPrivateV4(v4tail);
  return false;
}

/** True for loopback, private, link-local, CGNAT, multicast and other non-public addresses. */
export function isPrivateIp(ip: string): boolean {
  const s = ip.replace(/^\[|\]$/g, "");
  if (s.includes(":")) return isPrivateV6(s);
  if (ipv4ToInt(s) !== null) return isPrivateV4(s);
  return false;
}

const BLOCKED_HOST_SUFFIXES = [".localhost", ".local", ".internal", ".localdomain", ".home.arpa", ".lan"];

/**
 * Validates a merchant-supplied webhook URL (https only, public host). Throws
 * HttpError(400) otherwise. Used at page save time and again before every POST.
 */
export function assertSafeWebhookUrl(raw: unknown): URL {
  if (typeof raw !== "string" || raw.length > 500) throw new HttpError(400, "Webhook URL is invalid");
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new HttpError(400, "Webhook URL is invalid");
  }
  if (u.protocol !== "https:") throw new HttpError(400, "Webhook URL must use https");
  if (u.username || u.password) throw new HttpError(400, "Webhook URL must not contain credentials");
  const host = u.hostname.toLowerCase().replace(/\.$/, "");
  if (!host) throw new HttpError(400, "Webhook URL is invalid");
  if (host === "localhost" || BLOCKED_HOST_SUFFIXES.some((s) => host.endsWith(s))) {
    throw new HttpError(400, "Webhook URL must be a public host");
  }
  const bare = host.replace(/^\[|\]$/g, "");
  if ((bare.includes(":") || ipv4ToInt(bare) !== null) && isPrivateIp(bare)) {
    throw new HttpError(400, "Webhook URL must be a public host");
  }
  if (!bare.includes(".") && !bare.includes(":")) throw new HttpError(400, "Webhook URL must be a public host");
  return u;
}

/** Resolves the host (when DNS lookup is available) and refuses private targets. */
async function assertResolvesPublic(host: string): Promise<void> {
  const bare = host.replace(/^\[|\]$/g, "");
  if (bare.includes(":") || ipv4ToInt(bare) !== null) return; // literal already checked
  // deno-lint-ignore no-explicit-any
  const resolve = (Deno as any).resolveDns as
    | ((h: string, t: "A" | "AAAA") => Promise<string[]>)
    | undefined;
  if (typeof resolve !== "function") return;
  const addrs: string[] = [];
  for (const t of ["A", "AAAA"] as const) {
    try {
      addrs.push(...(await resolve(bare, t)));
    } catch { /* no records of this type */ }
  }
  if (addrs.length === 0) throw new Error("webhook host does not resolve");
  if (addrs.some(isPrivateIp)) throw new Error("webhook host resolves to a private address");
}

// ---------------------------------------------------------------------------
// HTML escaping + HMAC
// ---------------------------------------------------------------------------
export function escapeHtml(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function oneLine(s: string, max = 150): string {
  return s.replace(/[\r\n\t]+/g, " ").slice(0, max);
}

export async function hmacHex(hash: "SHA-256" | "SHA-512", secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
  return Array.from(sig).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function money(cents: number, currency = "USD"): string {
  return `${currency === "USD" ? "$" : currency + " "}${(Number(cents) / 100).toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Provider verification
// ---------------------------------------------------------------------------
export interface VerifyResult {
  ok: boolean;          // provider says the charge succeeded
  amount_cents: number;
  currency: string;
  ref: string;          // provider's own id/reference
  tx_ref: string;       // our reference (IFBPG-<order id>)
}

const NOT_OK: VerifyResult = { ok: false, amount_cents: 0, currency: "", ref: "", tx_ref: "" };

// deno-lint-ignore no-explicit-any
function flwResult(d: any): VerifyResult {
  if (!d) return NOT_OK;
  return {
    ok: d.status === "successful",
    amount_cents: Math.round(Number(d.amount ?? 0) * 100),
    currency: String(d.currency ?? "").toUpperCase(),
    ref: String(d.id ?? ""),
    tx_ref: String(d.tx_ref ?? ""),
  };
}

/** GET /v3/transactions/{id}/verify. Throws on network/HTTP failure (caller retries). */
export async function verifyFlutterwave(txId: string | number): Promise<VerifyResult> {
  const secret = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
  if (!secret) throw new Error("FLUTTERWAVE_SECRET_KEY not set");
  const id = Number(txId);
  if (!Number.isSafeInteger(id) || id <= 0) return NOT_OK;
  const res = await fetch(`https://api.flutterwave.com/v3/transactions/${id}/verify`, {
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 404) return NOT_OK;
  if (!res.ok) throw new Error(`Flutterwave verify HTTP ${res.status}`);
  const j = await res.json();
  return j?.status === "success" ? flwResult(j.data) : NOT_OK;
}

/** GET /v3/transactions/verify_by_reference?tx_ref=... (used by order_status polling). */
export async function verifyFlutterwaveByRef(txRef: string): Promise<VerifyResult> {
  const secret = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
  if (!secret) throw new Error("FLUTTERWAVE_SECRET_KEY not set");
  const res = await fetch(
    `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`,
    { headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(10_000) },
  );
  if (res.status === 404 || res.status === 400) return NOT_OK;
  if (!res.ok) throw new Error(`Flutterwave verify HTTP ${res.status}`);
  const j = await res.json();
  return j?.status === "success" ? flwResult(j.data) : NOT_OK;
}

/** GET https://api.paystack.co/transaction/verify/:reference. Throws on network/HTTP failure. */
export async function verifyPaystack(reference: string): Promise<VerifyResult> {
  const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!secret) throw new Error("PAYSTACK_SECRET_KEY not set");
  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 404 || res.status === 400) return NOT_OK;
  if (!res.ok) throw new Error(`Paystack verify HTTP ${res.status}`);
  const j = await res.json();
  const d = j?.data;
  if (!j?.status || !d) return NOT_OK;
  return {
    ok: d.status === "success",
    amount_cents: Number.isInteger(d.amount) ? d.amount : Math.round(Number(d.amount ?? 0)),
    currency: String(d.currency ?? "").toUpperCase(),
    ref: String(d.id ?? d.reference ?? ""),
    tx_ref: String(d.reference ?? ""),
  };
}

// ---------------------------------------------------------------------------
// Settlement helper used by webhooks and order_status
// ---------------------------------------------------------------------------
export type MarkPaidOutcome = "paid" | "already_paid" | "rejected" | "error";

/**
 * Calls mark_page_order_paid. 'rejected' = the DB refused the payment on
 * validation grounds (amount/currency/provider mismatch: needs manual review,
 * retrying will not help); 'error' = transient failure, safe to retry.
 */
export async function markPageOrderPaid(
  admin: DbClient,
  orderId: string,
  provider: "stripe" | "flutterwave" | "paystack",
  providerRef: string,
  amountCents: number,
  currency: string,
): Promise<MarkPaidOutcome> {
  const { data, error } = await admin.rpc("mark_page_order_paid", {
    p_order_id: orderId,
    p_provider: provider,
    p_provider_ref: providerRef,
    p_amount_cents: amountCents,
    p_currency: currency.toUpperCase(),
  });
  if (error) {
    const code = String(error.code ?? "");
    console.error("mark_page_order_paid failed:", orderId, code, error.message);
    if (code === "22023") {
      try {
        await admin.from("app_telemetry").insert([{
          event: "page_order_payment_rejected",
          metadata: { order_id: orderId, provider, provider_ref: providerRef, amount_cents: amountCents, currency },
        }]);
      } catch { /* best effort */ }
      return "rejected";
    }
    return "error";
  }
  return data === true ? "paid" : "already_paid";
}

// ---------------------------------------------------------------------------
// Post-payment notifications. Never throws: a notification failure must never
// undo or block a payment.
// ---------------------------------------------------------------------------
async function sendEmail(to: string, subject: string, html: string, replyTo?: string): Promise<void> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    console.log("RESEND_API_KEY not set; skipping payment page email");
    return;
  }
  const from = Deno.env.get("PAYMENTS_EMAIL_FROM") ?? "IFB Payments <noreply@infinitefuturebank.org>";
  const body: Record<string, unknown> = { from, to: [to], subject: oneLine(subject), html };
  if (replyTo) body.reply_to = replyTo;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Resend HTTP ${res.status}`);
  await res.body?.cancel();
}

interface LineItemLike { label: string; quantity: number; total_cents: number }

function lineItemsHtml(items: LineItemLike[], currency: string): string {
  return items.map((it) =>
    `<tr><td style="padding:4px 8px">${escapeHtml(it.label)}${Number(it.quantity) > 1 ? ` &times; ${escapeHtml(it.quantity)}` : ""}</td>` +
    `<td style="padding:4px 8px;text-align:right">${escapeHtml(money(it.total_cents, currency))}</td></tr>`
  ).join("");
}

function answerDisplay(v: unknown): string {
  if (v === true) return "Yes";
  if (v === false) return "No";
  return String(v ?? "");
}

/** POSTs the signed order.paid event to the merchant webhook (5s timeout, no redirects). */
export async function postMerchantWebhook(url: string, secret: string, body: string): Promise<void> {
  const u = assertSafeWebhookUrl(url);
  await assertResolvesPublic(u.hostname);
  const sig = await hmacHex("SHA-256", secret, body);
  const res = await fetch(u.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "IFB-PaymentPages/1",
      "X-IFB-Signature": `sha256=${sig}`,
    },
    body,
    redirect: "manual",
    signal: AbortSignal.timeout(5_000),
  });
  await res.body?.cancel().catch(() => {});
  if (res.status < 200 || res.status >= 300) throw new Error(`merchant webhook HTTP ${res.status}`);
}

/**
 * Call only after mark_page_order_paid / pay_page_order_with_wallet confirmed
 * this call settled the order. Sends the merchant email (with answers), the
 * customer receipt, an in-app notification and the merchant webhook.
 */
export async function finalizePaidOrder(admin: DbClient, orderId: string): Promise<void> {
  try {
    const { data: order, error } = await admin
      .from("payment_page_orders")
      .select("id, page_id, merchant_id, status, fields_snapshot, line_items, subtotal_cents, fee_cents, total_cents, merchant_net_cents, currency, customer_email, customer_name, answers_ciphertext, paid_at")
      .eq("id", orderId)
      .maybeSingle();
    if (error || !order || order.status !== "paid") {
      console.error("finalizePaidOrder: order not loadable or not paid:", orderId);
      return;
    }
    const { data: page } = await admin
      .from("payment_pages")
      .select("id, slug, title, notify_email, webhook_url, webhook_secret")
      .eq("id", order.page_id)
      .maybeSingle();
    if (!page) return;

    let answers: Record<string, unknown> = {};
    try {
      answers = await decryptAnswers(order.answers_ciphertext, order.id);
    } catch {
      console.error("finalizePaidOrder: could not decrypt answers for", orderId);
    }
    const fields: Array<{ id: string; label: string }> = Array.isArray(order.fields_snapshot) ? order.fields_snapshot : [];
    const items: LineItemLike[] = Array.isArray(order.line_items) ? order.line_items : [];
    const currency = String(order.currency ?? "USD");

    let merchantEmail: string | null = page.notify_email ?? null;
    let merchantName = "";
    try {
      const { data: prof } = await admin.from("profiles").select("full_name, email").eq("id", order.merchant_id).maybeSingle();
      merchantName = prof?.full_name ?? "";
      if (!merchantEmail) merchantEmail = prof?.email ?? null;
      if (!merchantEmail) {
        const { data: u } = await admin.auth.admin.getUserById(order.merchant_id);
        merchantEmail = u?.user?.email ?? null;
      }
    } catch { /* fall through */ }

    // (a) merchant email with all answers
    if (merchantEmail) {
      try {
        const answerRows = fields.map((f) =>
          `<tr><td style="padding:4px 8px;color:#555">${escapeHtml(f.label)}</td><td style="padding:4px 8px">${escapeHtml(answerDisplay(answers[f.id]))}</td></tr>`
        ).join("");
        const html =
          `<h2>New payment: ${escapeHtml(page.title)}</h2>` +
          `<p>${escapeHtml(order.customer_name)} (${escapeHtml(order.customer_email)}) paid ${escapeHtml(money(order.total_cents, currency))}. ` +
          `${escapeHtml(money(order.merchant_net_cents, currency))} has been credited to your IFB wallet.</p>` +
          `<table style="border-collapse:collapse">${answerRows}</table>` +
          `<h3>Items</h3><table style="border-collapse:collapse">${lineItemsHtml(items, currency)}` +
          `<tr><td style="padding:4px 8px"><b>Total</b></td><td style="padding:4px 8px;text-align:right"><b>${escapeHtml(money(order.total_cents, currency))}</b></td></tr></table>` +
          `<p style="color:#777;font-size:12px">Order ${escapeHtml(order.id)}</p>`;
        await sendEmail(merchantEmail, `New payment: ${page.title}`, html, order.customer_email);
      } catch (e) {
        console.error("finalizePaidOrder: merchant email failed:", orderId, e instanceof Error ? e.message : "error");
      }
    }

    // (b) customer receipt
    try {
      const html =
        `<h2>Receipt: ${escapeHtml(page.title)}</h2>` +
        `<p>Hi ${escapeHtml(order.customer_name)}, thank you for your payment${merchantName ? ` to ${escapeHtml(merchantName)}` : ""}.</p>` +
        `<table style="border-collapse:collapse">${lineItemsHtml(items, currency)}` +
        `<tr><td style="padding:4px 8px"><b>Total paid</b></td><td style="padding:4px 8px;text-align:right"><b>${escapeHtml(money(order.total_cents, currency))}</b></td></tr></table>` +
        `<p style="color:#777;font-size:12px">Order ${escapeHtml(order.id)} &middot; ${escapeHtml(order.paid_at ?? "")}</p>`;
      await sendEmail(order.customer_email, `Your receipt: ${page.title}`, html);
    } catch (e) {
      console.error("finalizePaidOrder: receipt email failed:", orderId, e instanceof Error ? e.message : "error");
    }

    // In-app notification for the merchant
    try {
      await admin.from("notifications").insert([{
        user_id: order.merchant_id,
        type: "payment_received",
        read: false,
        status: "completed",
        message: `Payment page "${page.title}": ${money(order.merchant_net_cents, currency)} received.`,
      }]);
    } catch { /* best effort */ }

    // (c) merchant webhook
    if (page.webhook_url && page.webhook_secret) {
      try {
        const body = JSON.stringify({
          event: "order.paid",
          order: {
            id: order.id,
            page_slug: page.slug,
            total_cents: order.total_cents,
            currency,
            customer_name: order.customer_name,
            customer_email: order.customer_email,
            answers,
            line_items: items,
            paid_at: order.paid_at,
          },
        });
        await postMerchantWebhook(page.webhook_url, page.webhook_secret, body);
      } catch (e) {
        console.error("finalizePaidOrder: merchant webhook failed:", orderId, e instanceof Error ? e.message : "error");
      }
    }
  } catch (e) {
    console.error("finalizePaidOrder failed:", orderId, e instanceof Error ? e.message : "error");
  }
}
