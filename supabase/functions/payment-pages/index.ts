// payment-pages — merchant payment links with custom forms.
// Contract: docs/payment-pages.md. verify_jwt = false: merchant actions resolve the
// user with getAuthedUser(); public actions need no login.
//
// Never log answers, customer emails or provider secrets here.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, errorResponse, getAuthedUser, HttpError, jsonResponse } from "../_shared/auth.ts";
import {
  feeBps,
  type PageField,
  type PagePricing,
  priceOrder,
  validateAnswers,
  validatePageDefinition,
  ValidationError,
} from "../_shared/page-pricing.ts";
import {
  assertSafeWebhookUrl,
  decryptAnswers,
  encryptAnswers,
  finalizePaidOrder,
  ipHash,
  isUuid,
  markPageOrderPaid,
  PAGE_ORDER_REF_PREFIX,
  verifyFlutterwaveByRef,
  verifyPaystack,
} from "../_shared/page-orders.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const MAX_BODY_BYTES = 64 * 1024;
const ORDER_TTL_MS = 60 * 60 * 1000;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const MAX_ORDERS_PER_IP = 10;
const MAX_ORDERS_PER_PAGE = 300;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const SLUG_RE = /^[a-z0-9-]{3,60}$/;

// Columns a merchant may see for their own pages (never webhook_secret).
const MERCHANT_PAGE_COLUMNS =
  "id, slug, title, description, logo_url, currency, status, visibility, single_use, max_uses, uses_count, " +
  "expires_at, fields, pricing, success_message, redirect_url, notify_email, webhook_url, version, created_at, updated_at";

type Json = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function bad(msg: string): never {
  throw new HttpError(400, msg);
}

function optStr(x: unknown, what: string, max: number): string | null {
  if (x === undefined || x === null || x === "") return null;
  if (typeof x !== "string") bad(`${what} must be text`);
  const s = x.trim();
  if (!s) return null;
  if (s.length > max) bad(`${what} must be at most ${max} characters`);
  return s;
}

function httpsUrl(x: unknown, what: string): string | null {
  const s = optStr(x, what, 500);
  if (!s) return null;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    bad(`${what} is not a valid URL`);
  }
  if (u.protocol !== "https:") bad(`${what} must start with https://`);
  return u.toString();
}

/** Uniform random string over `alphabet` using rejection sampling (no modulo bias). */
function randomString(len: number, alphabet: string): string {
  const limit = 256 - (256 % alphabet.length);
  let out = "";
  while (out.length < len) {
    const buf = crypto.getRandomValues(new Uint8Array(len * 2));
    for (const b of buf) {
      if (b < limit) out += alphabet[b % alphabet.length];
      if (out.length === len) break;
    }
  }
  return out;
}

const LOWER_ALNUM = "abcdefghijklmnopqrstuvwxyz0123456789";

function slugify(title: string): string {
  const s = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/g, "");
  return s || "page";
}

function generateSlug(title: string, visibility: "public" | "private"): string {
  // Slugs must match ^[a-z0-9-]{3,60}$, so private slugs use lowercase base36
  // (20 chars = ~103 bits) rather than mixed-case base62.
  return visibility === "private"
    ? `p-${randomString(20, LOWER_ALNUM)}`
    : `${slugify(title)}-${randomString(4, LOWER_ALNUM)}`;
}

function newWebhookSecret(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32))).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function publicBaseUrl(): string {
  return (Deno.env.get("PAYMENTS_PUBLIC_BASE_URL") ?? "https://app.infinitefuturebank.org").replace(/\/+$/, "");
}

async function requireKyc(userId: string): Promise<void> {
  const { data } = await admin.from("profiles").select("kyc_status").eq("id", userId).maybeSingle();
  if (!data || !["verified", "approved"].includes(String(data.kyc_status ?? ""))) {
    throw new HttpError(403, "Complete identity verification (KYC) to publish payment pages");
  }
}

async function loadOwnedPage(userId: string, id: unknown): Promise<Json> {
  if (!isUuid(id)) bad("id is required");
  const { data, error } = await admin.from("payment_pages").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.merchant_id !== userId) throw new HttpError(404, "Page not found");
  return data;
}

function merchantView(p: Json): Json {
  const out: Json = {};
  for (const k of MERCHANT_PAGE_COLUMNS.split(",").map((s) => s.trim())) out[k] = p[k];
  out.has_webhook_secret = !!p.webhook_secret;
  out.url = `${publicBaseUrl()}/p/${p.slug}`;
  return out;
}

function usedUp(p: Json): boolean {
  const uses = Number(p.uses_count ?? 0);
  if (p.single_use && uses >= 1) return true;
  if (p.max_uses !== null && p.max_uses !== undefined && uses >= Number(p.max_uses)) return true;
  return false;
}

interface NormalizedPage {
  title: string;
  description: string | null;
  logo_url: string | null;
  visibility: "public" | "private";
  single_use: boolean;
  max_uses: number | null;
  expires_at: string | null;
  fields: PageField[];
  pricing: PagePricing;
  success_message: string | null;
  redirect_url: string | null;
  notify_email: string | null;
  webhook_url: string | null;
}

function normalizePageInput(raw: unknown): NormalizedPage {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) bad("page is required");
  const p = raw as Json;
  const title = optStr(p.title, "Title", 120);
  if (!title) bad("Title is required");
  const visibility = p.visibility ?? "public";
  if (visibility !== "public" && visibility !== "private") bad("visibility must be public or private");

  let max_uses: number | null = null;
  if (p.max_uses !== undefined && p.max_uses !== null && p.max_uses !== "") {
    if (typeof p.max_uses !== "number" || !Number.isInteger(p.max_uses) || p.max_uses < 1 || p.max_uses > 1_000_000) {
      bad("max_uses must be a whole number between 1 and 1,000,000");
    }
    max_uses = p.max_uses;
  }

  let expires_at: string | null = null;
  if (p.expires_at !== undefined && p.expires_at !== null && p.expires_at !== "") {
    const d = new Date(String(p.expires_at));
    if (Number.isNaN(d.getTime())) bad("expires_at must be a date");
    if (d.getTime() <= Date.now()) bad("expires_at must be in the future");
    expires_at = d.toISOString();
  }

  const notify_email = optStr(p.notify_email, "Notification email", 254);
  if (notify_email && !EMAIL_RE.test(notify_email)) bad("Notification email is not valid");

  let webhook_url: string | null = null;
  const rawWebhook = optStr(p.webhook_url, "Webhook URL", 500);
  if (rawWebhook) webhook_url = assertSafeWebhookUrl(rawWebhook).toString();

  const { fields, pricing } = validatePageDefinition(p.fields, p.pricing);

  return {
    title,
    description: optStr(p.description, "Description", 2000),
    logo_url: httpsUrl(p.logo_url, "Logo URL"),
    visibility,
    single_use: p.single_use === true,
    max_uses,
    expires_at,
    fields,
    pricing,
    success_message: optStr(p.success_message, "Success message", 500),
    redirect_url: httpsUrl(p.redirect_url, "Redirect URL"),
    notify_email: notify_email ? notify_email.toLowerCase() : null,
    webhook_url,
  };
}

/** Loads an active, unexpired, not-used-up page whose merchant is still KYC-verified. */
async function loadPublicPage(slug: unknown): Promise<{ page: Json; merchantName: string }> {
  if (typeof slug !== "string" || !SLUG_RE.test(slug)) throw new HttpError(404, "Page not found");
  const { data: page, error } = await admin.from("payment_pages").select("*").eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
  if (!page || page.status !== "active") throw new HttpError(404, "Page not found");
  if (page.expires_at && new Date(page.expires_at).getTime() <= Date.now()) throw new HttpError(404, "Page not found");
  if (usedUp(page)) throw new HttpError(404, "Page not found");
  const { data: prof } = await admin.from("profiles").select("full_name, kyc_status").eq("id", page.merchant_id).maybeSingle();
  if (!prof || !["verified", "approved"].includes(String(prof.kyc_status ?? ""))) {
    throw new HttpError(404, "Page not found");
  }
  return { page, merchantName: String(prof.full_name ?? "") };
}

// Best-effort per-isolate limiter for read-only public actions (get_page, quote,
// order_status). Checkout uses the durable DB-backed limits below.
const hits = new Map<string, { n: number; reset: number }>();
function softLimit(key: string, max: number, windowMs = 60_000): void {
  const now = Date.now();
  if (hits.size > 10_000) {
    for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  }
  const h = hits.get(key);
  if (!h || h.reset < now) {
    hits.set(key, { n: 1, reset: now + windowMs });
    return;
  }
  h.n += 1;
  if (h.n > max) throw new HttpError(429, "Too many requests. Please wait a moment and try again.");
}

async function verifyTurnstile(token: unknown): Promise<void> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) return;
  if (typeof token !== "string" || !token || token.length > 2048) throw new HttpError(403, "Verification failed. Please retry.");
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  let ok = false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(8_000),
    });
    const j = await res.json();
    ok = j?.success === true;
  } catch {
    ok = false;
  }
  if (!ok) throw new HttpError(403, "Verification failed. Please retry.");
}

// ---------------------------------------------------------------------------
// Merchant actions
// ---------------------------------------------------------------------------
async function listPages(userId: string): Promise<Json> {
  const { data, error } = await admin
    .from("payment_pages")
    .select("*")
    .eq("merchant_id", userId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return { pages: (data ?? []).map(merchantView) };
}

async function createPage(userId: string, body: Json): Promise<Json> {
  await requireKyc(userId);
  const input = normalizePageInput(body.page);
  const webhook_secret = newWebhookSecret();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await admin
      .from("payment_pages")
      .insert({
        ...input,
        merchant_id: userId,
        slug: generateSlug(input.title, input.visibility),
        currency: "USD",
        status: "active",
        webhook_secret,
        version: 1,
      })
      .select("*")
      .single();
    if (!error) return { page: merchantView(data), webhook_secret };
    if (error.code !== "23505") throw new Error(error.message);
  }
  throw new HttpError(409, "Could not generate a unique link, please retry");
}

async function updatePage(userId: string, body: Json): Promise<Json> {
  const existing = await loadOwnedPage(userId, body.id);
  await requireKyc(userId);
  const input = normalizePageInput(body.page);
  // Changing visibility issues a new slug, so a page made private is no longer
  // reachable through its old (guessable) public link.
  const slug = input.visibility !== existing.visibility
    ? generateSlug(input.title, input.visibility)
    : String(existing.slug);
  const { data, error } = await admin
    .from("payment_pages")
    .update({ ...input, slug, version: Number(existing.version ?? 1) + 1, updated_at: new Date().toISOString() })
    .eq("id", existing.id)
    .eq("merchant_id", userId)
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") throw new HttpError(409, "Could not generate a unique link, please retry");
    throw new Error(error.message);
  }
  return { page: merchantView(data) };
}

async function setStatus(userId: string, body: Json): Promise<Json> {
  const existing = await loadOwnedPage(userId, body.id);
  const status = body.status;
  if (status !== "active" && status !== "inactive") bad("status must be active or inactive");
  if (status === "active") {
    await requireKyc(userId);
    if (usedUp(existing)) throw new HttpError(409, "This page has been used up");
    if (existing.expires_at && new Date(String(existing.expires_at)).getTime() <= Date.now()) {
      bad("This page has expired; set a new expiry date first");
    }
  }
  const { data, error } = await admin
    .from("payment_pages")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", existing.id)
    .eq("merchant_id", userId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return { page: merchantView(data) };
}

async function rotateWebhookSecret(userId: string, body: Json): Promise<Json> {
  const existing = await loadOwnedPage(userId, body.id);
  const webhook_secret = newWebhookSecret();
  const { error } = await admin
    .from("payment_pages")
    .update({ webhook_secret, updated_at: new Date().toISOString() })
    .eq("id", existing.id)
    .eq("merchant_id", userId);
  if (error) throw new Error(error.message);
  return { webhook_secret };
}

async function listOrders(userId: string, body: Json): Promise<Json> {
  let limit = 50;
  if (body.limit !== undefined) {
    if (typeof body.limit !== "number" || !Number.isInteger(body.limit) || body.limit < 1 || body.limit > 100) {
      bad("limit must be between 1 and 100");
    }
    limit = body.limit;
  }
  let q = admin
    .from("payment_page_orders")
    .select("id, page_id, status, provider, line_items, subtotal_cents, fee_cents, total_cents, merchant_net_cents, currency, customer_name, customer_email, answers_ciphertext, fields_snapshot, page_version, created_at, paid_at, expires_at")
    .eq("merchant_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (body.page_id !== undefined && body.page_id !== null) {
    if (!isUuid(body.page_id)) bad("page_id is invalid");
    q = q.eq("page_id", body.page_id);
  }
  if (body.status !== undefined && body.status !== null) {
    if (!["pending", "paid", "failed", "expired"].includes(String(body.status))) bad("status is invalid");
    q = q.eq("status", body.status);
  }
  if (body.before !== undefined && body.before !== null) {
    const d = new Date(String(body.before));
    if (Number.isNaN(d.getTime())) bad("before must be a timestamp");
    q = q.lt("created_at", d.toISOString());
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const orders = await Promise.all((data ?? []).map(async (o: Json) => {
    let answers: Json | null = null;
    try {
      answers = await decryptAnswers(String(o.answers_ciphertext), String(o.id));
    } catch (e) {
      if (e instanceof HttpError) throw e; // key not configured: fail closed
      console.error("list_orders: could not decrypt answers for order", o.id);
    }
    const { answers_ciphertext: _c, ...rest } = o;
    return { ...rest, answers };
  }));
  return { orders };
}

// ---------------------------------------------------------------------------
// Public actions
// ---------------------------------------------------------------------------
async function getPage(req: Request, body: Json): Promise<Json> {
  softLimit(`get:${await ipHash(req)}`, 120);
  const { page, merchantName } = await loadPublicPage(body.slug);
  return {
    page: {
      slug: page.slug,
      title: page.title,
      description: page.description,
      logo_url: page.logo_url,
      currency: page.currency,
      fields: page.fields,
      pricing: page.pricing,
      merchant_name: merchantName,
      success_message: page.success_message,
    },
  };
}

function priceFor(page: Json, answersRaw: unknown, amountCents: unknown) {
  const fields = page.fields as PageField[];
  const pricing = page.pricing as PagePricing;
  const answers = validateAnswers(fields, answersRaw);
  const quote = priceOrder(fields, pricing, answers, amountCents, feeBps(Deno.env.get("PAGE_FEE_BPS")));
  return { fields, pricing, answers, quote };
}

async function quote(req: Request, body: Json): Promise<Json> {
  softLimit(`quote:${await ipHash(req)}`, 120);
  const { page } = await loadPublicPage(body.slug);
  const { quote: q } = priceFor(page, body.answers, body.amount_cents);
  return {
    line_items: q.line_items,
    subtotal_cents: q.subtotal_cents,
    fee_cents: q.fee_cents,
    total_cents: q.total_cents,
    currency: q.currency,
  };
}

const METHOD_PROVIDER = {
  card: "stripe",
  mobile_money: "flutterwave",
  paystack: "paystack",
  wallet: "wallet",
} as const;
type Method = keyof typeof METHOD_PROVIDER;

async function failOrder(orderId: string): Promise<void> {
  await admin.from("payment_page_orders").update({ status: "failed" }).eq("id", orderId).eq("status", "pending");
}

async function checkout(req: Request, body: Json): Promise<Json> {
  const method = body.method as Method;
  if (!Object.prototype.hasOwnProperty.call(METHOD_PROVIDER, String(method))) bad("Choose a payment method");

  await verifyTurnstile(body.turnstile_token);

  // Wallet payments require a logged-in payer; resolve before any write.
  let walletAuth: string | null = null;
  let payerId: string | null = null;
  if (method === "wallet") {
    const user = await getAuthedUser(req);
    payerId = user.id;
    walletAuth = req.headers.get("Authorization");
  }
  if (method === "paystack" && !Deno.env.get("PAYSTACK_SECRET_KEY")) bad("Paystack is not available");

  const { page } = await loadPublicPage(body.slug);
  if (payerId && payerId === page.merchant_id) bad("You cannot pay your own payment page");

  // Rate limits (durable, per IP hash and per page)
  const ih = await ipHash(req);
  const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
  const [{ count: ipCount, error: e1 }, { count: pageCount, error: e2 }] = await Promise.all([
    admin.from("payment_page_orders").select("id", { count: "exact", head: true }).eq("ip_hash", ih).gte("created_at", since),
    admin.from("payment_page_orders").select("id", { count: "exact", head: true }).eq("page_id", page.id).gte("created_at", since),
  ]);
  if (e1 || e2) throw new Error("rate limit lookup failed");
  if ((ipCount ?? 0) >= MAX_ORDERS_PER_IP || (pageCount ?? 0) >= MAX_ORDERS_PER_PAGE) {
    throw new HttpError(429, "Too many checkout attempts. Please wait a few minutes and try again.");
  }

  // Single-use pages: one in-flight order at a time.
  if (page.single_use) {
    const { count, error } = await admin
      .from("payment_page_orders")
      .select("id", { count: "exact", head: true })
      .eq("page_id", page.id)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString());
    if (error) throw new Error(error.message);
    if ((count ?? 0) > 0) throw new HttpError(409, "This page is being paid by someone else right now. Try again later.");
  }

  const name = optStr(body.name, "Name", 120);
  if (!name) bad("Name is required");
  const emailRaw = optStr(body.email, "Email", 254);
  if (!emailRaw || !EMAIL_RE.test(emailRaw)) bad("Enter a valid email");
  const email = emailRaw.toLowerCase();

  const { fields, pricing, answers, quote: q } = priceFor(page, body.answers, body.amount_cents);

  const orderId = crypto.randomUUID();
  const provider = METHOD_PROVIDER[method];
  const { error: insErr } = await admin.from("payment_page_orders").insert({
    id: orderId,
    page_id: page.id,
    merchant_id: page.merchant_id,
    page_version: page.version,
    fields_snapshot: fields,
    pricing_snapshot: pricing,
    line_items: q.line_items,
    subtotal_cents: q.subtotal_cents,
    fee_cents: q.fee_cents,
    total_cents: q.total_cents,
    merchant_net_cents: q.merchant_net_cents,
    currency: q.currency,
    customer_email: email,
    customer_name: name,
    answers_ciphertext: await encryptAnswers(answers, orderId),
    status: "pending",
    provider,
    ip_hash: ih,
    expires_at: new Date(Date.now() + ORDER_TTL_MS).toISOString(),
  });
  if (insErr) throw new Error(insErr.message);

  const returnUrl = `${publicBaseUrl()}/p/${page.slug}?order=${orderId}`;
  const reference = `${PAGE_ORDER_REF_PREFIX}${orderId}`;

  try {
    if (method === "card") {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      const publishable = Deno.env.get("STRIPE_PUBLISHABLE_KEY");
      if (!stripeKey || !publishable) throw new HttpError(400, "Card payments are not available");
      const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" as Stripe.LatestApiVersion });
      const pi = await stripe.paymentIntents.create(
        {
          amount: q.total_cents,
          currency: "usd",
          automatic_payment_methods: { enabled: true },
          receipt_email: email,
          description: `Payment page ${page.slug}`,
          metadata: { ifb_page_order_id: orderId, ifb_page_id: String(page.id) },
        },
        { idempotencyKey: `pageorder-${orderId}` },
      );
      await admin.from("payment_page_orders").update({ provider_ref: pi.id }).eq("id", orderId);
      return { order_id: orderId, client_secret: pi.client_secret, publishable_key: publishable };
    }

    if (method === "mobile_money") {
      const flwKey = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
      if (!flwKey) throw new HttpError(400, "Mobile money is not available");
      const res = await fetch("https://api.flutterwave.com/v3/payments", {
        method: "POST",
        headers: { Authorization: `Bearer ${flwKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          tx_ref: reference,
          amount: q.total_cents / 100,
          currency: "USD",
          redirect_url: returnUrl,
          customer: { email, name },
          customizations: { title: String(page.title).slice(0, 100) },
          meta: { ifb_page_order_id: orderId },
        }),
        signal: AbortSignal.timeout(15_000),
      });
      const j = await res.json().catch(() => null);
      const link = j?.data?.link;
      if (!res.ok || typeof link !== "string") throw new Error(`Flutterwave init failed (HTTP ${res.status})`);
      return { order_id: orderId, redirect_url: link };
    }

    if (method === "paystack") {
      const res = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: { Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          amount: q.total_cents,
          currency: "USD",
          reference,
          callback_url: returnUrl,
          metadata: { ifb_page_order_id: orderId },
        }),
        signal: AbortSignal.timeout(15_000),
      });
      const j = await res.json().catch(() => null);
      const url = j?.data?.authorization_url;
      if (!res.ok || typeof url !== "string") throw new Error(`Paystack init failed (HTTP ${res.status})`);
      await admin.from("payment_page_orders").update({ provider_ref: reference }).eq("id", orderId);
      return { order_id: orderId, redirect_url: url };
    }

    // wallet: run the RPC AS THE USER so auth.uid() is the payer.
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: walletAuth! } },
      auth: { persistSession: false },
    });
    const { error: payErr } = await userClient.rpc("pay_page_order_with_wallet", { p_order_id: orderId });
    if (payErr) {
      const msg = String(payErr.message ?? "");
      if (/insufficient funds/i.test(msg)) throw new HttpError(400, "Insufficient wallet balance");
      if (payErr.code === "22023") throw new HttpError(400, msg.slice(0, 200) || "Payment could not be completed");
      throw new Error(`wallet payment failed: ${payErr.code ?? ""}`);
    }
    await finalizePaidOrder(admin, orderId);
    return { order_id: orderId, status: "paid" };
  } catch (e) {
    await failOrder(orderId).catch(() => {});
    if (e instanceof HttpError) throw e;
    console.error("checkout provider step failed:", method, e instanceof Error ? e.message : "error");
    throw new HttpError(502, "The payment provider could not start this payment. Please try again.");
  }
}

// Throttle provider verify calls from order_status polling (per isolate).
const lastVerify = new Map<string, number>();

async function orderStatus(req: Request, body: Json): Promise<Json> {
  softLimit(`status:${await ipHash(req)}`, 120);
  if (!isUuid(body.order_id)) throw new HttpError(404, "Order not found");
  const orderId = String(body.order_id).toLowerCase();

  const load = async () => {
    const { data, error } = await admin
      .from("payment_page_orders")
      .select("id, page_id, status, provider, total_cents, currency, expires_at")
      .eq("id", orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new HttpError(404, "Order not found");
    return data;
  };
  let order = await load();

  if (order.status === "pending" && (order.provider === "flutterwave" || order.provider === "paystack")) {
    const last = lastVerify.get(orderId) ?? 0;
    if (Date.now() - last > 5_000) {
      lastVerify.set(orderId, Date.now());
      if (lastVerify.size > 5_000) lastVerify.clear();
      try {
        const ref = `${PAGE_ORDER_REF_PREFIX}${orderId}`;
        const v = order.provider === "flutterwave"
          ? await verifyFlutterwaveByRef(ref)
          : (Deno.env.get("PAYSTACK_SECRET_KEY") ? await verifyPaystack(ref) : null);
        if (v && v.ok && v.tx_ref === ref && v.currency === "USD") {
          const outcome = await markPageOrderPaid(admin, orderId, order.provider, v.ref || ref, v.amount_cents, v.currency);
          if (outcome === "paid") await finalizePaidOrder(admin, orderId);
          order = await load();
        }
      } catch (e) {
        console.error("order_status verify failed:", order.provider, e instanceof Error ? e.message : "error");
      }
    }
  }

  const status = order.status === "pending" && new Date(order.expires_at).getTime() <= Date.now() ? "expired" : order.status;
  const { data: page } = await admin
    .from("payment_pages")
    .select("success_message, redirect_url")
    .eq("id", order.page_id)
    .maybeSingle();
  const out: Json = {
    status,
    total_cents: order.total_cents,
    currency: order.currency,
    success_message: page?.success_message ?? null,
  };
  if (status === "paid" && page?.redirect_url) out.redirect_url = page.redirect_url;
  return out;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
const MERCHANT_ACTIONS: Record<string, (userId: string, body: Json) => Promise<Json>> = {
  list_pages: (u) => listPages(u),
  create_page: createPage,
  update_page: updatePage,
  set_status: setStatus,
  rotate_webhook_secret: rotateWebhookSecret,
  list_orders: listOrders,
};

const PUBLIC_ACTIONS: Record<string, (req: Request, body: Json) => Promise<Json>> = {
  get_page: getPage,
  quote,
  checkout,
  order_status: orderStatus,
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return jsonResponse(req, { error: "Method not allowed" }, 405);

  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) throw new HttpError(413, "Request too large");
    let body: Json;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new HttpError(400, "Invalid JSON");
    }
    if (typeof body !== "object" || body === null || Array.isArray(body)) throw new HttpError(400, "Invalid JSON");
    const action = String(body.action ?? "");

    if (Object.prototype.hasOwnProperty.call(MERCHANT_ACTIONS, action)) {
      const user = await getAuthedUser(req);
      return jsonResponse(req, await MERCHANT_ACTIONS[action](user.id, body));
    }
    if (Object.prototype.hasOwnProperty.call(PUBLIC_ACTIONS, action)) {
      return jsonResponse(req, await PUBLIC_ACTIONS[action](req, body));
    }
    throw new HttpError(400, "Unknown action");
  } catch (err) {
    if (err instanceof ValidationError) return jsonResponse(req, { error: err.message }, 400);
    return errorResponse(req, err);
  }
});
