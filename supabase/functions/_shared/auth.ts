// Shared auth / validation helpers for money, auth and KYC edge functions.
//
// NOTE: verify_jwt = true only proves the caller sent *a* valid project JWT;
// the anon key itself is one. Always resolve the user with getAuthedUser().
import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
const DEFAULT_ORIGINS = [
  "https://app.infinitefuturebank.org",
  "https://admin.infinitefuturebank.org",
  "capacitor://localhost",
  "https://localhost",
  "http://localhost:5173",
];

function allowedOrigins(): string[] {
  const env = Deno.env.get("ALLOWED_ORIGINS");
  if (!env) return DEFAULT_ORIGINS;
  return env.split(",").map((o) => o.trim()).filter(Boolean);
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, stripe-signature, verif-hash, x-kyc-admin-token",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Vary": "Origin",
  };
  if (origin && allowedOrigins().includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

// ---------------------------------------------------------------------------
// Authentication / authorization
// ---------------------------------------------------------------------------
export async function getAuthedUser(req: Request): Promise<User> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new HttpError(401, "Unauthorized");
  }
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );
  const { data, error } = await client.auth.getUser();
  if (error || !data?.user) throw new HttpError(401, "Unauthorized");
  return data.user;
}

const ADMIN_ROLES = ["admin", "admin_l3", "superadmin"];

export async function requireAdmin(adminClient: SupabaseClient, userId: string): Promise<void> {
  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.role && ADMIN_ROLES.includes(profile.role)) return;

  const { data: roleRow, error } = await adminClient
    .from("admin_roles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!error && roleRow) return;

  throw new HttpError(403, "Forbidden");
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------
export const MAX_AMOUNT = 1_000_000;

export function parseAmount(x: unknown): number {
  const n = typeof x === "string" ? Number(x) : x;
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0 || n > MAX_AMOUNT) {
    throw new HttpError(400, "Invalid amount");
  }
  const rounded = Math.round(n * 100) / 100;
  if (rounded <= 0) throw new HttpError(400, "Invalid amount");
  return rounded;
}

// ---------------------------------------------------------------------------
// Constant-time helpers
// ---------------------------------------------------------------------------
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export function timingSafeEqualStr(a: string, b: string): boolean {
  const enc = new TextEncoder();
  return timingSafeEqual(enc.encode(a), enc.encode(b));
}

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------------------------------------------------------------------------
// KYC admin session tokens: base64url(payloadJSON).base64url(HMAC-SHA256)
// ---------------------------------------------------------------------------
function b64urlEncode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmacKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("KYC_ADMIN_TOKEN_SECRET");
  if (!secret || secret.length < 32) {
    // Fail closed: never issue or accept tokens without a real secret.
    throw new HttpError(500, "KYC admin auth not configured");
  }
  return await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

export type AdminTokenPayload = { email: string; role?: string; exp: number; [k: string]: unknown };

export async function signAdminToken(payload: AdminTokenPayload): Promise<string> {
  const key = await hmacKey();
  const body = b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
  return `${body}.${b64urlEncode(sig)}`;
}

/** Returns the payload if valid and unexpired, otherwise null. Throws only if misconfigured. */
export async function verifyAdminToken(token: string | null | undefined): Promise<AdminTokenPayload | null> {
  const key = await hmacKey();
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sigB64] = parts;
  let expected: Uint8Array;
  let given: Uint8Array;
  try {
    expected = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
    given = b64urlDecode(sigB64);
  } catch {
    return null;
  }
  if (!timingSafeEqual(expected, given)) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body))) as AdminTokenPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------
export function jsonResponse(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

/** Maps HttpError to its status; anything else becomes a generic 500 (details logged, not returned). */
export function errorResponse(req: Request, err: unknown): Response {
  if (err instanceof HttpError) return jsonResponse(req, { error: err.message }, err.status);
  console.error("Unhandled error:", err instanceof Error ? err.message : err);
  return jsonResponse(req, { error: "Internal error" }, 500);
}
