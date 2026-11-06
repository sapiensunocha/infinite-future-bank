// michael-proxy
// Proxies the Home screen's MICHAEL risk requests (the MICHAEL API's CORS headers break browsers).
//
// Security (2026-11): the API key used to be hard-coded here (public repo) and any path was
// forwarded, so a path such as "@other-host/..." could send the key to another server.
// Now: key and base URL from secrets, logged-in callers only, and only the read-only paths
// the app uses are allowed.
import { corsHeaders, errorResponse, getAuthedUser, HttpError, jsonResponse } from '../_shared/auth.ts';

const ALLOWED = [
  /^\/api\/v1\/risk\/country\/[A-Z]{3}$/,
  /^\/api\/v1\/events$/,
];
const PARAM_KEY = /^[A-Za-z0-9_-]{1,40}$/;
const PARAM_VAL = /^[A-Za-z0-9_+ -]{1,40}$/;   // e.g. category=food+security

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(req) });
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'POST only');
    await getAuthedUser(req);

    const base = (Deno.env.get('MICHAEL_BASE_URL') ?? 'https://michael-api-382117221028.us-central1.run.app').replace(/\/+$/, '');
    const key = Deno.env.get('MICHAEL_API_KEY');
    if (!key) throw new HttpError(503, 'Risk data is temporarily unavailable');

    const body = await req.json().catch(() => null) as { path?: unknown; params?: unknown } | null;
    const path = typeof body?.path === 'string' ? body.path : '';
    if (!ALLOWED.some((re) => re.test(path))) throw new HttpError(400, 'Path not allowed');

    const url = new URL(base + path);
    if (url.origin !== new URL(base).origin) throw new HttpError(400, 'Path not allowed');
    const params = body?.params && typeof body.params === 'object' ? body.params as Record<string, unknown> : {};
    for (const [k, v] of Object.entries(params).slice(0, 10)) {
      const val = String(v);
      if (PARAM_KEY.test(k) && PARAM_VAL.test(val)) url.searchParams.set(k, val);
    }

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(url.toString(), { headers: { 'X-API-Key': key, Accept: 'application/json' }, redirect: 'error', signal: ctrl.signal });
      const data = await res.json().catch(() => ({ error: 'Bad response from MICHAEL' }));
      return jsonResponse(req, data, res.ok ? 200 : 502);
    } finally {
      clearTimeout(t);
    }
  } catch (err) {
    return errorResponse(req, err);
  }
});
