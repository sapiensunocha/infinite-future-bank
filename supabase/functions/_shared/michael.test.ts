// deno test --allow-env --allow-net=127.0.0.1 supabase/functions/_shared/michael.test.ts
import { assert, assertEquals, assertStringIncludes } from 'jsr:@std/assert@1';
import { farmerSmsText, michaelFetch, normaliseRisk, parseAlertEvent, signMichael, verifyMichaelSignature } from './michael.ts';

const SECRET = 'test-webhook-secret';
const FIELD = '3f2b0c1e-8d4a-4c55-9b1a-2e6f7a8b9c0d';
const event = {
  event_id: 'evt_123', type: 'field.alert', external_id: FIELD, partner_code: 'GHV', hazard: 'drought', severity: 'high',
  metric: 'spi_30d', value: -1.8, threshold: -1.5, detected_at: '2026-11-06T08:00:00Z', message_fr: 'Sécheresse probable.',
};

Deno.test('signature: valid request is accepted', async () => {
  const body = JSON.stringify(event); const ts = String(Math.floor(Date.now() / 1000));
  assertEquals(await verifyMichaelSignature(SECRET, ts, await signMichael(SECRET, ts, body), body), null);
});

Deno.test('signature: tampered body, wrong secret, missing headers are rejected', async () => {
  const body = JSON.stringify(event); const ts = String(Math.floor(Date.now() / 1000));
  const sig = await signMichael(SECRET, ts, body);
  assertEquals(await verifyMichaelSignature(SECRET, ts, sig, body.replace('high', 'low')), 'signature mismatch');
  assertEquals(await verifyMichaelSignature('other-secret', ts, sig, body), 'signature mismatch');
  assertEquals(await verifyMichaelSignature(SECRET, null, sig, body), 'missing signature headers');
  assertEquals(await verifyMichaelSignature('', ts, sig, body), 'webhook secret not configured');
});

Deno.test('signature: replay with an old timestamp is rejected, even if the signature matches', async () => {
  const body = JSON.stringify(event); const old = String(Math.floor(Date.now() / 1000) - 600);
  assertEquals(await verifyMichaelSignature(SECRET, old, await signMichael(SECRET, old, body), body), 'timestamp outside the 5-minute window');
});

Deno.test('signature: changing the timestamp header invalidates the signature', async () => {
  const body = JSON.stringify(event); const ts = String(Math.floor(Date.now() / 1000));
  const sig = await signMichael(SECRET, ts, body);
  assertEquals(await verifyMichaelSignature(SECRET, String(Number(ts) + 1), sig, body), 'signature mismatch');
});

Deno.test('payload: valid event parses; bad fields are named', () => {
  assertEquals(parseAlertEvent(event).event?.hazard, 'drought');
  assertEquals(parseAlertEvent({ ...event, hazard: 'volcano' }).error, 'hazard');
  assertEquals(parseAlertEvent({ ...event, severity: 'extreme' }).error, 'severity');
  assertEquals(parseAlertEvent({ ...event, external_id: 'not-a-uuid' }).error, 'external_id');
  assertEquals(parseAlertEvent({ ...event, type: 'other' }).error, 'type');
  assertEquals(parseAlertEvent({ ...event, detected_at: 'yesterday' }).error, 'detected_at');
  assertEquals(parseAlertEvent(null).error, 'body must be an object');
});

Deno.test('farmer SMS: French by default wording, custom message preferred, field name kept short', () => {
  const ev = parseAlertEvent({ ...event, message_fr: undefined }).event!;
  assertStringIncludes(farmerSmsText('fr', 'Champ nord', ev), 'sécheresse');
  assertStringIncludes(farmerSmsText('en', 'North plot', ev), 'drought alert (high)');
  assertStringIncludes(farmerSmsText('fr', 'Champ nord', parseAlertEvent(event).event!), 'Sécheresse probable.');
  assert(farmerSmsText('fr', 'x'.repeat(200), ev).length < 200);
});

Deno.test('risk: values are clamped and unknown levels dropped', () => {
  const r = normaliseRisk({ score: 140, level: 'severe', indicators: [{ hazard: 'flood', value: 2, level: 'high' }], observed_at: '2026-11-06T00:00:00Z' });
  assertEquals(r.score, 100); assertEquals(r.level, null); assertEquals((r.indicators[0] as any).level, 'high');
});

Deno.test('client: talks to a MICHAEL stand-in with the API key from the environment', async () => {
  const seen: { key?: string | null; method?: string; body?: any } = {};
  const ac = new AbortController();
  const server = Deno.serve({ port: 0, hostname: '127.0.0.1', signal: ac.signal, onListen: () => {} }, async (req) => {
    seen.key = req.headers.get('X-API-Key'); seen.method = req.method; seen.body = await req.json().catch(() => null);
    const results = (seen.body?.fields ?? []).map((f: any) => ({ external_id: f.external_id, status: f.boundary ? 'created' : 'rejected', reason: f.boundary ? undefined : 'no boundary', area_ha: 1.23 }));
    return Response.json({ results });
  });
  Deno.env.set('MICHAEL_BASE_URL', `http://127.0.0.1:${(server.addr as Deno.NetAddr).port}`);
  Deno.env.set('MICHAEL_API_KEY', 'stand-in-key');
  try {
    const { status, body } = await michaelFetch('/api/v1/agri/fields', { method: 'PUT', body: JSON.stringify({ fields: [{ external_id: FIELD, boundary: { type: 'Polygon' } }, { external_id: 'x' }] }) });
    assertEquals(status, 200); assertEquals(seen.key, 'stand-in-key'); assertEquals(seen.method, 'PUT');
    assertEquals(body.results.map((r: any) => r.status), ['created', 'rejected']);
  } finally {
    ac.abort(); await server.finished;
  }
});
