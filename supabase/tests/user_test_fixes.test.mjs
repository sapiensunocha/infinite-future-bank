// Runs supabase/migrations/20261112_user_test_fixes.sql on a throwaway in-memory Postgres
// (PGlite) with Supabase-like roles and tables shaped like production (8 Nov 2026), then
// checks send money, payment requests and the logged-out profile rule. Touches no real database.
//   npm i --no-save --legacy-peer-deps @electric-sql/pglite@0.5.15
//   node supabase/tests/user_test_fixes.test.mjs supabase/migrations/20261112_user_test_fixes.sql
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'fs';

const MIG = process.argv[2];
const db = await PGlite.create();
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m); } else { fail++; console.log('  FAIL', m); } };

const A = '00000000-0000-0000-0000-00000000000a';  // Aisha
const T = '00000000-0000-0000-0000-00000000000b';  // Tunde
const M = '00000000-0000-0000-0000-00000000000c';  // Mallory (attacker)
await db.exec(`
  CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  GRANT USAGE ON SCHEMA public, auth TO anon, authenticated;
  GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
  CREATE TABLE public.profiles (id uuid PRIMARY KEY, full_name text, avatar_url text, active_tier text, email text, kyc_status text, latitude numeric, longitude numeric, role text);
  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
  GRANT SELECT ON public.profiles TO anon, authenticated;
  CREATE TABLE public.balances (user_id uuid PRIMARY KEY, liquid_usd numeric DEFAULT 0.00, afr_balance numeric DEFAULT 0, last_synced timestamptz DEFAULT now(),
    CONSTRAINT balances_liquid_usd_nonneg CHECK (liquid_usd >= 0), CONSTRAINT balances_afr_balance_nonneg CHECK (afr_balance >= 0));
  CREATE TABLE public.transactions (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, user_id uuid NOT NULL, transaction_type text NOT NULL,
    status text DEFAULT 'completed' CHECK (status IN ('pending','completed','failed','cancelled')), amount numeric NOT NULL, metadata jsonb DEFAULT '{}',
    description text NOT NULL, created_at timestamptz DEFAULT now(), source_type text, authorized_by text DEFAULT 'system');
  CREATE TABLE public.notifications (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, user_id uuid, message text NOT NULL, type text DEFAULT 'INFO',
    read boolean DEFAULT false, created_at timestamptz DEFAULT now(), metadata jsonb DEFAULT '{}', amount numeric, related_user_id uuid,
    status text DEFAULT 'pending', requester_name text);
  INSERT INTO public.profiles (id, full_name, email, kyc_status, latitude, longitude) VALUES
    ('${A}', 'Aisha Bello', 'aisha@example.ng', 'verified', 12.0, 8.5),
    ('${T}', 'Tunde Bakare', 'tunde@example.ng', 'verified', 6.4, 3.4),
    ('${M}', 'Mallory', 'm@example.com', 'verified', null, null);
  INSERT INTO public.balances (user_id, liquid_usd, afr_balance) VALUES ('${A}', 100, 500), ('${M}', 0, 0);
`);
await db.exec(readFileSync(MIG, 'utf8'));
await db.exec(readFileSync(MIG, 'utf8'));
console.log('migration applied twice (idempotent)');

async function as(uid, sql, params = []) {
  return db.transaction(async (tx) => {
    if (uid) await tx.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [uid]);
    await tx.exec(`SET LOCAL ROLE ${uid ? 'authenticated' : 'anon'}`);
    return tx.query(sql, params);
  });
}
async function err(uid, sql, params) { try { await as(uid, sql, params); return null; } catch (e) { return e.message; } }
const bal = async (u) => (await db.query(`SELECT liquid_usd::float usd, afr_balance::float afr FROM balances WHERE user_id = $1`, [u])).rows[0];
const send = (uid, from, to, amt, asset = 'USD') => as(uid, `SELECT p2p_transfer($1, $2, $3, $4) AS r`, [from, to, amt, asset]).then((x) => x.rows[0].r);

// ── Send money ──
let r = await send(A, A, T, 40);
ok(r.success === true, 'Aisha sends $40 to Tunde');
ok((await bal(A)).usd === 60 && (await bal(T)).usd === 40, 'balances: Aisha 60, Tunde 40 (Tunde wallet created)');
const tx = (await db.query(`SELECT user_id, amount::float a, transaction_type t FROM transactions ORDER BY amount`)).rows;
ok(tx.length === 2 && tx[0].a === -40 && tx[0].t === 'p2p_send' && tx[1].a === 40 && tx[1].t === 'p2p_receive', 'two ledger rows: -40 send, +40 receive');
ok((await db.query(`SELECT 1 FROM notifications WHERE user_id = $1 AND type = 'p2p_received'`, [T])).rows.length === 1, 'Tunde is notified');
r = await as(A, `SELECT p2p_transfer($1, $2, $3) AS r`, [A, T, 10]).then((x) => x.rows[0].r);
ok(r.success === true && (await bal(A)).usd === 50, '3-argument call (organisation screen) works, defaults to USD');
r = await send(A, A, T, 1000);
ok(r.success === false && /Insufficient/.test(r.error) && (await bal(A)).usd === 50, 'cannot send more than the balance');
r = await send(A, A, T, -5);
ok(r.success === false && (await bal(T)).usd === 50, 'negative amount refused');
r = await send(A, A, A, 5);
ok(r.success === false, 'cannot send to yourself');
r = await send(A, A, '00000000-0000-0000-0000-0000000000ff', 5);
ok(r.success === false && /not found/.test(r.error), 'unknown recipient refused');
r = await send(M, A, M, 50);
ok(r.success === false && (await bal(A)).usd === 50, "Mallory cannot send from Aisha's account");
ok(/permission denied/.test(await err(null, `SELECT p2p_transfer('${A}', '${T}', 1)`)), 'logged-out caller cannot call p2p_transfer');
r = await send(A, A, T, 200, 'AFR');
ok(r.success === true && (await bal(A)).afr === 300 && (await bal(T)).afr === 200, 'AFR transfer works');
r = await send(A, A, T, 1, 'BTC');
ok(r.success === false, 'unsupported currency refused');
ok(/permission denied/.test(await err(M, `SELECT _ifb_user_transfer('${A}', '${M}', 10, 'USD', null, 'x')`)), 'internal transfer function is not callable by users');

// ── Payment requests ──
const nid = (await db.query(`INSERT INTO notifications (user_id, message, type, amount, related_user_id, status, metadata)
  VALUES ($1, 'Tunde requests $20', 'payment_request', 20, $2, 'pending', '{"reason":"Rent"}') RETURNING id`, [A, T])).rows[0].id;
ok(/do not match/.test(await err(A, `SELECT process_payment_request($1, $2, 999, $3)`, [A, T, nid])), 'amount must match the stored request');
ok(/do not match/.test(await err(A, `SELECT process_payment_request($1, $2, 20, $3)`, [A, M, nid])), 'cannot redirect a request to another receiver');
ok(/only pay requests sent to you/.test(await err(M, `SELECT process_payment_request($1, $2, 20, $3)`, [A, T, nid])), "Mallory cannot pay Aisha's request from Aisha's account");
ok(/not found/.test(await err(M, `SELECT process_payment_request($1, $2, 20, $3)`, [M, T, nid])), "Mallory cannot pay a request that isn't hers");
r = (await as(A, `SELECT process_payment_request($1, $2, 20, $3) AS r`, [A, T, nid])).rows[0].r;
ok(r.success === true && (await bal(A)).usd === 30 && (await bal(T)).usd === 70, 'Aisha pays Tunde $20 request');
ok((await db.query(`SELECT status FROM notifications WHERE id = $1`, [nid])).rows[0].status === 'completed', 'request marked completed');
ok(/already been handled/.test(await err(A, `SELECT process_payment_request($1, $2, 20, $3)`, [A, T, nid])), 'cannot pay the same request twice');
const nid2 = (await db.query(`INSERT INTO notifications (user_id, message, type, amount, related_user_id) VALUES ($1, 'big', 'payment_request', 500, $2) RETURNING id`, [A, T])).rows[0].id;
ok(/Insufficient/.test(await err(A, `SELECT process_payment_request($1, $2, 500, $3)`, [A, T, nid2])) && (await bal(A)).usd === 30, 'request larger than balance fails, nothing moves');
ok((await db.query(`SELECT status FROM notifications WHERE id = $1`, [nid2])).rows[0].status === 'pending', 'failed request stays pending');

// ── Logged-out profile access ──
ok((await as(null, `SELECT id, full_name, avatar_url, active_tier FROM profiles WHERE id = $1`, [T])).rows[0]?.full_name === 'Tunde Bakare', 'logged out: pay link can still read name/avatar');
ok(/permission denied/.test(await err(null, `SELECT email FROM profiles`)), 'logged out: email hidden');
ok(/permission denied/.test(await err(null, `SELECT latitude, longitude FROM profiles`)), 'logged out: GPS hidden');
ok(/permission denied/.test(await err(null, `SELECT kyc_status FROM profiles`)), 'logged out: KYC status hidden');
ok(/permission denied/.test(await err(null, `SELECT * FROM profiles`)), 'logged out: select * refused');
ok((await as(T, `SELECT email FROM profiles WHERE id = $1`, [T])).rows[0]?.email === 'tunde@example.ng', 'signed-in access unchanged');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
