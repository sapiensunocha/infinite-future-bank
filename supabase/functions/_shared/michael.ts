// MICHAEL agriculture API client + webhook signature check.
// Contract: docs/integrations/michael-agri-contract.md
// Secrets (never in code): MICHAEL_BASE_URL, MICHAEL_API_KEY, MICHAEL_WEBHOOK_SECRET.

export const HAZARDS = ['crop_stress', 'disease_risk', 'drought', 'flood', 'rainfall_anomaly', 'soil_moisture_anomaly', 'fire', 'storm'] as const;
export const LEVELS = ['low', 'moderate', 'high', 'critical'] as const;
export type Level = typeof LEVELS[number];

export const HAZARD_LABEL: Record<string, { en: string; fr: string }> = {
  crop_stress: { en: 'crop stress', fr: 'stress des cultures' },
  disease_risk: { en: 'crop disease risk', fr: 'risque de maladie des cultures' },
  drought: { en: 'drought', fr: 'sécheresse' },
  flood: { en: 'flooding', fr: 'inondation' },
  rainfall_anomaly: { en: 'unusual rainfall', fr: 'pluviométrie anormale' },
  soil_moisture_anomaly: { en: 'unusual soil moisture', fr: 'humidité du sol anormale' },
  fire: { en: 'fire', fr: 'incendie' },
  storm: { en: 'storm', fr: 'tempête' },
};

export function michaelConfig() {
  const base = (Deno.env.get('MICHAEL_BASE_URL') ?? '').replace(/\/+$/, '');
  const key = Deno.env.get('MICHAEL_API_KEY') ?? '';
  if (!base || !key) throw new Error('MICHAEL_BASE_URL / MICHAEL_API_KEY are not configured');
  return { base, key };
}

export async function michaelFetch(path: string, init: RequestInit = {}, timeoutMs = 20000): Promise<{ status: number; body: any }> {
  const { base, key } = michaelConfig();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}${path}`, {
      ...init,
      redirect: 'error',
      signal: ctrl.signal,
      headers: { 'X-API-Key': key, Accept: 'application/json', 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
    const text = await res.text();
    let body: any = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text.slice(0, 300) }; }
    return { status: res.status, body };
  } finally {
    clearTimeout(t);
  }
}

// ---------------------------------------------------------------- webhook signature
// X-Michael-Signature: sha256=<hex HMAC-SHA256 of "<X-Michael-Timestamp>.<raw body>">
const enc = new TextEncoder();

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(message)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function signMichael(secret: string, timestamp: string, rawBody: string): Promise<string> {
  return `sha256=${await hmacHex(secret, `${timestamp}.${rawBody}`)}`;
}

/** Returns null when valid, otherwise the reason (for logs only). */
export async function verifyMichaelSignature(
  secret: string, timestamp: string | null, signature: string | null, rawBody: string,
  nowMs = Date.now(), maxSkewMs = 5 * 60 * 1000,
): Promise<string | null> {
  if (!secret) return 'webhook secret not configured';
  if (!timestamp || !signature) return 'missing signature headers';
  const ts = /^\d+$/.test(timestamp) ? Number(timestamp) * (timestamp.length <= 10 ? 1000 : 1) : Date.parse(timestamp);
  if (!Number.isFinite(ts)) return 'bad timestamp';
  if (Math.abs(nowMs - ts) > maxSkewMs) return 'timestamp outside the 5-minute window';
  const expected = await signMichael(secret, timestamp, rawBody);
  return safeEqual(expected, signature.trim()) ? null : 'signature mismatch';
}

// ---------------------------------------------------------------- payload validation
export type AlertEvent = {
  event_id: string; type: 'field.alert' | 'field.alert_resolved'; external_id: string; partner_code?: string;
  hazard: string; severity: Level; metric?: string; value?: number; threshold?: number;
  observed_at?: string; detected_at: string; message_en?: string; message_fr?: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseAlertEvent(x: any): { event?: AlertEvent; error?: string } {
  if (!x || typeof x !== 'object') return { error: 'body must be an object' };
  if (typeof x.event_id !== 'string' || !x.event_id || x.event_id.length > 120) return { error: 'event_id' };
  if (x.type !== 'field.alert' && x.type !== 'field.alert_resolved') return { error: 'type' };
  if (typeof x.external_id !== 'string' || !UUID.test(x.external_id)) return { error: 'external_id' };
  if (!(HAZARDS as readonly string[]).includes(x.hazard)) return { error: 'hazard' };
  if (!(LEVELS as readonly string[]).includes(x.severity)) return { error: 'severity' };
  if (typeof x.detected_at !== 'string' || !Number.isFinite(Date.parse(x.detected_at))) return { error: 'detected_at' };
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
  const str = (v: unknown, n: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : undefined);
  return {
    event: {
      event_id: x.event_id, type: x.type, external_id: x.external_id.toLowerCase(), partner_code: str(x.partner_code, 12),
      hazard: x.hazard, severity: x.severity, metric: str(x.metric, 60), value: num(x.value), threshold: num(x.threshold),
      observed_at: typeof x.observed_at === 'string' && Number.isFinite(Date.parse(x.observed_at)) ? x.observed_at : undefined,
      detected_at: x.detected_at, message_en: str(x.message_en, 400), message_fr: str(x.message_fr, 400),
    },
  };
}

/** Short SMS text (<= 160 chars where possible) in the farmer's language. */
export function farmerSmsText(lang: 'fr' | 'en', fieldName: string, ev: AlertEvent): string {
  const h = HAZARD_LABEL[ev.hazard] ?? { en: ev.hazard, fr: ev.hazard };
  const sev = { low: ['faible', 'low'], moderate: ['modéré', 'moderate'], high: ['élevé', 'high'], critical: ['critique', 'critical'] }[ev.severity];
  const name = fieldName.slice(0, 30);
  const custom = lang === 'fr' ? ev.message_fr : ev.message_en;
  if (custom) return `IFB/MICHAEL: ${name}: ${custom}`.slice(0, 300);
  return lang === 'fr'
    ? `IFB/MICHAEL: alerte ${h.fr} (niveau ${sev[0]}) sur votre champ "${name}". Votre agent Greenhouse vous contactera.`
    : `IFB/MICHAEL: ${h.en} alert (${sev[1]}) on your field "${name}". Your Greenhouse field agent will contact you.`;
}

/** Normalise MICHAEL's risk payload for storage. */
export function normaliseRisk(x: any): { score: number | null; level: Level | null; indicators: unknown[]; observed_at: string | null } {
  const score = typeof x?.score === 'number' && Number.isFinite(x.score) ? Math.max(0, Math.min(100, x.score)) : null;
  const level = (LEVELS as readonly string[]).includes(x?.level) ? x.level : null;
  const indicators = Array.isArray(x?.indicators) ? x.indicators.slice(0, 20).map((i: any) => ({
    hazard: String(i?.hazard ?? '').slice(0, 40), value: typeof i?.value === 'number' ? i.value : null,
    unit: i?.unit ? String(i.unit).slice(0, 20) : null, level: (LEVELS as readonly string[]).includes(i?.level) ? i.level : null,
    baseline: typeof i?.baseline === 'number' ? i.baseline : null, source: i?.source ? String(i.source).slice(0, 60) : null,
    observed_at: i?.observed_at ?? null,
  })) : [];
  const observed_at = typeof x?.observed_at === 'string' && Number.isFinite(Date.parse(x.observed_at)) ? x.observed_at : null;
  return { score, level, indicators, observed_at };
}
