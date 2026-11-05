// Thin client for the `payment-pages` edge function (see docs/payment-pages.md).
// Every call resolves to { data, error } where error = { status, message } | null,
// so callers can branch on 403 (KYC), 404 (inactive link), 429 (rate limit), etc.
import { supabase } from '../../services/supabaseClient';

export async function callPaymentPages(body) {
  let result;
  try {
    result = await supabase.functions.invoke('payment-pages', { body });
  } catch (e) {
    return { data: null, error: { status: 0, message: e?.message || 'Network error. Check your connection and try again.' } };
  }
  const { data, error } = result;
  if (!error) {
    if (data && typeof data === 'object' && data.error) {
      return { data: null, error: { status: 400, message: String(data.error) } };
    }
    return { data, error: null };
  }

  // FunctionsHttpError carries the raw Response in `context`.
  const ctx = error.context;
  const status = typeof ctx?.status === 'number' ? ctx.status : 0;
  let message = '';
  try {
    if (ctx && typeof ctx.json === 'function') {
      const j = await (typeof ctx.clone === 'function' ? ctx.clone() : ctx).json();
      if (j && j.error) message = String(j.error);
    }
  } catch { /* body was not JSON */ }

  if (!message) {
    if (status === 429) message = 'Too many requests. Please wait a moment and try again.';
    else if (status === 404) message = 'Not found.';
    else if (status === 0) message = 'Network error. Check your connection and try again.';
    else message = error.message || 'Request failed.';
  }
  return { data: null, error: { status, message } };
}

export const formatCents = (cents, currency = 'USD') => {
  const n = Number(cents);
  if (!Number.isFinite(n)) return '';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(n / 100);
  } catch {
    return `$${(n / 100).toFixed(2)}`;
  }
};

/** Only allow https URLs (used for merchant logos and outbound redirects). */
export const safeHttpsUrl = (raw) => {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
};

export const DEFAULT_BRAND = '#2563eb';

/** A merchant brand colour, accepted only as "#rrggbb" (anything else falls back). */
export const safeBrandColor = (raw) =>
  (typeof raw === 'string' && /^#[0-9a-fA-F]{6}$/.test(raw) ? raw.toLowerCase() : DEFAULT_BRAND);

/** Readable text colour (white or near-black) to place on top of a brand colour. */
export function onBrandColor(hex) {
  const c = safeBrandColor(hex);
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.45 ? '#0f172a' : '#ffffff';
}

/** Initials for a merchant avatar when there is no logo. */
export const initialsOf = (name) =>
  String(name || '').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || '•';

/** Initial values for a set of fields (checkbox=false, quantity field=its min or 1, rest ''). */
export function initialAnswers(fields = [], quantityField) {
  const out = {};
  for (const f of fields) {
    if (f.type === 'checkbox') out[f.id] = false;
    else if (f.type === 'number' && f.id === quantityField) out[f.id] = String(Math.max(1, Number.isInteger(f.min) ? f.min : 1));
    else out[f.id] = '';
  }
  return out;
}

/** Converts form state into the `answers` object the API expects (numbers as numbers, empties dropped). */
export function buildAnswers(fields = [], values = {}) {
  const out = {};
  for (const f of fields) {
    const v = values[f.id];
    if (f.type === 'checkbox') { out[f.id] = v === true; continue; }
    if (v === undefined || v === null || String(v).trim() === '') continue;
    if (f.type === 'number') {
      const n = Number(v);
      out[f.id] = Number.isFinite(n) ? n : String(v);
    } else {
      out[f.id] = String(v).trim();
    }
  }
  return out;
}
