// payout-cards — save a card for withdrawals without ever storing it in readable form.
//   POST { action: "add", holder_name, number, exp_month, exp_year }
//     → { card: { id, brand, last4, exp_month, exp_year } }
// The card number is checked (Luhn), encrypted with AES-256-GCM (PAYOUT_CARD_KEY, 32 bytes
// base64, held only by edge functions) and stored with an HMAC for duplicate detection.
// The CVC is never requested: payouts to a card don't need it.
// Listing uses the table directly (masked columns only); removal uses remove_payout_card().
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, errorResponse, getAuthedUser, HttpError, jsonResponse } from "../_shared/auth.ts";
import { cardBrand, digitsOnly, luhnValid, parseExpiry } from "../_shared/money-rails.ts";

const bs = (u: Uint8Array): BufferSource => u as unknown as BufferSource;

function keyBytes(): Uint8Array {
  const env = Deno.env.get("PAYOUT_CARD_KEY");
  if (!env) throw new HttpError(503, "Card payouts are not configured yet");
  const bytes = Uint8Array.from(atob(env.trim()), (c) => c.charCodeAt(0));
  if (bytes.length !== 32) throw new HttpError(503, "Card payouts are not configured yet");
  return bytes;
}

function b64(u: Uint8Array): string {
  let s = "";
  for (const b of u) s += String.fromCharCode(b);
  return btoa(s);
}

async function encryptPan(pan: string, userId: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", bs(keyBytes()), { name: "AES-GCM" }, false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: bs(new TextEncoder().encode(`ifb-payout-card:${userId}`)) },
    key, bs(new TextEncoder().encode(pan)),
  ));
  const out = new Uint8Array(12 + ct.length);
  out.set(iv); out.set(ct, 12);
  return b64(out);
}

async function panHash(pan: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", bs(keyBytes()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, bs(new TextEncoder().encode(`pan:${pan}`))));
  return Array.from(mac, (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });
  try {
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
    const user = await getAuthedUser(req);
    const body = await req.json().catch(() => ({}));
    if (body.action !== "add") throw new HttpError(400, "Unknown action");

    const holder = String(body.holder_name ?? "").trim().replace(/\s+/g, " ");
    if (holder.length < 2 || holder.length > 120) throw new HttpError(400, "Enter the name on the card");
    const pan = digitsOnly(body.number);
    if (!luhnValid(pan)) throw new HttpError(400, "That card number is not valid");
    const exp = parseExpiry(body.exp_month, body.exp_year);
    if (!exp) throw new HttpError(400, "Check the expiry date (the card may have expired)");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { count } = await admin.from("payout_cards").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).eq("status", "active");
    if ((count ?? 0) >= 5) throw new HttpError(400, "You can save up to 5 cards. Remove one first.");

    const hash = await panHash(pan);
    const { data: existing } = await admin.from("payout_cards").select("id, brand, last4, exp_month, exp_year")
      .eq("user_id", user.id).eq("pan_hash", hash).eq("status", "active").maybeSingle();
    if (existing) return jsonResponse(req, { card: existing, existing: true });

    const { data: card, error } = await admin.from("payout_cards").insert({
      user_id: user.id, holder_name: holder, brand: cardBrand(pan), last4: pan.slice(-4),
      exp_month: exp.month, exp_year: exp.year, pan_ciphertext: await encryptPan(pan, user.id), pan_hash: hash,
    }).select("id, brand, last4, exp_month, exp_year").single();
    if (error) throw new Error(`payout_cards insert: ${error.code}`);
    return jsonResponse(req, { card });
  } catch (e) {
    return errorResponse(req, e);
  }
});
