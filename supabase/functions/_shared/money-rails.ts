// Pure helpers for Instant Deposit, Card Payout and third-party ID checks.
// No network or database access here, so everything is unit-testable (money-rails.test.ts).

export const INSTANT_REF_PREFIX = "IFB.INSTANT.";

export function instantRef(intentId: string): string {
  return `${INSTANT_REF_PREFIX}${intentId}`;
}

export function isInstantRef(ref: unknown): boolean {
  return typeof ref === "string" && /^IFB\.INSTANT\.[0-9a-f-]{36}$/i.test(ref);
}

// ── Cards ──────────────────────────────────────────────────────────────────
export function digitsOnly(s: unknown): string {
  return String(s ?? "").replace(/\D/g, "");
}

export function luhnValid(pan: string): boolean {
  if (!/^\d{12,19}$/.test(pan)) return false;
  let sum = 0;
  let dbl = false;
  for (let i = pan.length - 1; i >= 0; i--) {
    let d = pan.charCodeAt(i) - 48;
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

export function cardBrand(pan: string): string {
  if (/^4/.test(pan)) return "Visa";
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(pan)) return "Mastercard";
  if (/^(506(0|1)|507(8|9)|6500)/.test(pan)) return "Verve";
  if (/^3[47]/.test(pan)) return "Amex";
  if (/^(6011|65|64[4-9])/.test(pan)) return "Discover";
  return "Card";
}

/** Accepts month 1-12 and a 2- or 4-digit year; rejects cards already expired at `now`. */
export function parseExpiry(month: unknown, year: unknown, now = new Date()): { month: number; year: number } | null {
  const m = Number(month);
  let y = Number(year);
  if (!Number.isInteger(m) || m < 1 || m > 12 || !Number.isInteger(y)) return null;
  if (y < 100) y += 2000;
  if (y < 2024 || y > 2100) return null;
  const endOfMonth = new Date(Date.UTC(y, m, 1)); // first day of the following month
  if (endOfMonth <= now) return null;
  return { month: m, year: y };
}

// ── Smile ID (Enhanced KYC, job type 5) ─────────────────────────────────────
// Signature: base64( HMAC-SHA256( api_key, timestamp + partner_id + "sid_request" ) )
export async function smileSignature(apiKey: string, partnerId: string, timestamp: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(apiKey), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const mac = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(timestamp + partnerId + "sid_request")),
  );
  let s = "";
  for (const b of mac) s += String.fromCharCode(b);
  return btoa(s);
}

/** Supported country → ID types (Smile ID Enhanced KYC names). */
export const SMILE_ID_TYPES: Record<string, string[]> = {
  NG: ["NIN_V2", "NIN_SLIP", "BVN", "DRIVERS_LICENSE", "VOTER_ID", "PASSPORT"],
  GH: ["GHANA_CARD", "DRIVERS_LICENSE", "PASSPORT", "VOTER_ID"],
  KE: ["NATIONAL_ID", "PASSPORT", "ALIEN_CARD"],
  UG: ["NATIONAL_ID_NO_PHOTO"],
  ZA: ["NATIONAL_ID", "NATIONAL_ID_NO_PHOTO"],
};

export interface SmileOutcome {
  verified: boolean;
  result_code: string;
  result_text: string;
  name_match: string | null;
  dob_match: string | null;
}

// deno-lint-ignore no-explicit-any
export function parseSmileResult(j: any): SmileOutcome {
  const code = String(j?.ResultCode ?? "");
  const actions = j?.Actions ?? {};
  const idOk = String(actions.Verify_ID_Number ?? "") === "Verified";
  const names = actions.Names != null ? String(actions.Names) : null;
  const dob = actions.DOB != null ? String(actions.DOB) : null;
  // 1012 = "ID number validated". Require a name match too, so someone can't use another person's NIN.
  const nameOk = names === null || /exact|partial|transposed/i.test(names);
  return {
    verified: code === "1012" && idOk && nameOk,
    result_code: code,
    result_text: String(j?.ResultText ?? ""),
    name_match: names,
    dob_match: dob,
  };
}
