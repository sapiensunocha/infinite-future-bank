// Runs supabase/migrations/20261113_deposit_payout_idcheck.sql on a throwaway in-memory Postgres
// (PGlite) with Supabase-like roles and production-shaped tables. Touches no real database.
//   npm i --no-save --legacy-peer-deps @electric-sql/pglite@0.5.15
//   node supabase/tests/deposit_payout_idcheck.test.mjs supabase/migrations/20261113_deposit_payout_idcheck.sql
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'fs';

const MIG = process.argv[2];
const db = await PGlite.create();
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m); } else { fail++; console.log('  FAIL', m); } };

const C = '00000000-0000-0000-0000-00000000000a';  // Chioma (verified)
const U = '00000000-0000-0000-0000-00000000000b';  // unverified user
const M = '00000000-0000-0000-0000-00000000000c';  // Mallory
const ADM = '00000000-0000-0000-0000-00000000000d'; // IFB admin
await db.exec(`
  CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
  CREATE SCHEMA auth;
  CREATE TABLE auth.users (id uuid PRIMARY KEY);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
  GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
  CREATE FUNCTION public._jwt_role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.role', true), '') $$;
  CREATE FUNCTION public._is_trusted_backend() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT COALESCE(public._jwt_role(), '') NOT IN ('anon', 'authenticated') $$;
  GRANT EXECUTE ON FUNCTION public._jwt_role(), public._is_trusted_backend() TO anon, authenticated, service_role;
  CREATE TABLE public.profiles (id uuid PRIMARY KEY, full_name text, role text, kyc_status text);
  CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') $$;
  GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
  CREATE TABLE public.balances (user_id uuid PRIMARY KEY, liquid_usd numeric DEFAULT 0, escrow_usd numeric DEFAULT 0, afr_balance numeric DEFAULT 0, last_synced timestamptz,
    CONSTRAINT nonneg CHECK (liquid_usd >= 0));
  CREATE TABLE public.transactions (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, user_id uuid NOT NULL, transaction_type text NOT NULL,
    status text DEFAULT 'completed' CHECK (status IN ('pending','completed','failed','cancelled')), amount numeric NOT NULL, metadata jsonb DEFAULT '{}',
    description text NOT NULL, created_at timestamptz DEFAULT now(), source_type text, authorized_by text, external_id text UNIQUE);
  CREATE TABLE public.notifications (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, user_id uuid, message text NOT NULL, type text,
    read boolean DEFAULT false, metadata jsonb DEFAULT '{}', amount numeric, related_user_id uuid, status text DEFAULT 'pending');
  -- stand-in for production credit_deposit: service-only, idempotent on external id
  CREATE FUNCTION public.credit_deposit(p_user_id uuid, p_amount numeric, p_currency text, p_external_id text, p_source text) RETURNS boolean
  LANGUAGE plpgsql SECURITY DEFINER AS $$
  BEGIN
    IF COALESCE(public._jwt_role(), '') IN ('anon', 'authenticated') THEN RAISE EXCEPTION 'Access denied'; END IF;
    BEGIN
      INSERT INTO public.transactions (user_id, amount, transaction_type, description, external_id) VALUES (p_user_id, p_amount, 'deposit', 'Deposit', 'deposit:' || p_external_id);
    EXCEPTION WHEN unique_violation THEN RETURN false; END;
    INSERT INTO public.balances (user_id, liquid_usd) VALUES (p_user_id, p_amount)
      ON CONFLICT (user_id) DO UPDATE SET liquid_usd = balances.liquid_usd + EXCLUDED.liquid_usd;
    RETURN true;
  END $$;
  REVOKE ALL ON FUNCTION public.credit_deposit(uuid, numeric, text, text, text) FROM PUBLIC;
  INSERT INTO auth.users VALUES ('${C}'), ('${U}'), ('${M}'), ('${ADM}');
  INSERT INTO public.profiles VALUES ('${C}', 'Chioma Eze', null, 'verified'), ('${U}', 'New User', null, 'pending_kyc'),
    ('${M}', 'Mallory', null, 'verified'), ('${ADM}', 'Ops', 'admin', 'verified');
  INSERT INTO public.balances (user_id, liquid_usd) VALUES ('${C}', 300), ('${U}', 100), ('${M}', 0);
`);
await db.exec(readFileSync(MIG, 'utf8'));
await db.exec(readFileSync(MIG, 'utf8'));
console.log('migration applied twice (idempotent)');

// run as a user (authenticated), anon (null) or the backend ('service')
async function as(who, sql, params = []) {
  return db.transaction(async (tx) => {
    if (who === 'service') {
      await tx.query(`SELECT set_config('request.jwt.claim.role', 'service_role', true)`);
      await tx.exec('SET LOCAL ROLE service_role');
    } else {
      await tx.query(`SELECT set_config('request.jwt.claim.role', $1, true)`, [who ? 'authenticated' : 'anon']);
      if (who) await tx.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [who]);
      await tx.exec(`SET LOCAL ROLE ${who ? 'authenticated' : 'anon'}`);
    }
    return tx.query(sql, params);
  });
}
async function err(who, sql, params) { try { await as(who, sql, params); return null; } catch (e) { return e.message; } }
const bal = async (u) => (await db.query(`SELECT liquid_usd::float usd, escrow_usd::float esc FROM balances WHERE user_id = $1`, [u])).rows[0];
const one = async (sql, p) => (await db.query(sql, p)).rows[0];

// ── Instant Deposit ──
const ref = 'IFB.INSTANT.11111111-1111-4111-8111-111111111111';
await db.query(`INSERT INTO deposit_intents (user_id, amount_usd, charge_currency, charge_amount, fx_rate, tx_ref) VALUES ($1, 100, 'NGN', 160000, 1600, $2)`, [C, ref]);
ok(/permission denied/.test(await err(C, `SELECT complete_deposit_intent($1, 160000, 'NGN', 'flw1')`, [ref])), 'user cannot complete (credit) their own deposit');
ok(/permission denied/.test(await err(null, `SELECT complete_deposit_intent($1, 160000, 'NGN', 'flw1')`, [ref])), 'logged-out caller cannot complete a deposit');
ok(/permission denied/.test(await err(C, `INSERT INTO deposit_intents (user_id, amount_usd, charge_currency, charge_amount, tx_ref) VALUES ($1, 5000, 'USD', 1, 'IFB.INSTANT.x')`, [C])), 'user cannot create intents directly (only the edge function)');
ok((await as(M, `SELECT * FROM deposit_intents`)).rows.length === 0, "Mallory cannot see Chioma's deposits");
ok((await as(C, `SELECT * FROM deposit_intents`)).rows.length === 1, 'Chioma sees her own deposit');
let r = (await as('service', `SELECT complete_deposit_intent($1, 150000, 'NGN', 'flwA') AS r`, [ref])).rows[0].r;
ok(r === 'mismatch' && (await bal(C)).usd === 300, 'underpaid charge (₦150,000 of ₦160,000) is not credited');
ok((await one(`SELECT status FROM deposit_intents WHERE tx_ref = $1`, [ref])).status === 'failed', 'underpaid intent is flagged failed for review');
const ref2 = 'IFB.INSTANT.22222222-2222-4222-8222-222222222222';
await db.query(`INSERT INTO deposit_intents (user_id, amount_usd, charge_currency, charge_amount, tx_ref) VALUES ($1, 50, 'USD', 50, $2)`, [C, ref2]);
r = (await as('service', `SELECT complete_deposit_intent($1, 50, 'NGN', 'flwB') AS r`, [ref2])).rows[0].r;
ok(r === 'mismatch', 'wrong currency is not credited');
const ref3 = 'IFB.INSTANT.33333333-3333-4333-8333-333333333333';
await db.query(`INSERT INTO deposit_intents (user_id, amount_usd, charge_currency, charge_amount, fx_rate, tx_ref) VALUES ($1, 100, 'NGN', 160000, 1600, $2)`, [C, ref3]);
r = (await as('service', `SELECT complete_deposit_intent($1, 160000, 'NGN', 'flwC') AS r`, [ref3])).rows[0].r;
ok(r === 'credited' && (await bal(C)).usd === 400, 'paid ₦160,000 → wallet credited $100 (300 → 400)');
r = (await as('service', `SELECT complete_deposit_intent($1, 160000, 'NGN', 'flwC') AS r`, [ref3])).rows[0].r;
ok(r === 'already_done' && (await bal(C)).usd === 400, 'webhook replay does not credit twice');
ok((await as('service', `SELECT complete_deposit_intent('IFB.INSTANT.nope', 1, 'USD', 'x') AS r`)).rows[0].r === 'not_found', 'unknown reference ignored');

// ── Card payout ──
await db.query(`INSERT INTO payout_cards (id, user_id, holder_name, brand, last4, exp_month, exp_year, pan_ciphertext, pan_hash)
  VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', $1, 'Chioma Eze', 'Visa', '4242', 12, 2029, 'ciphertext', 'hash1'),
         ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', $1, 'Chioma Eze', 'Verve', '0000', 1, 2025, 'ciphertext2', 'hash2'),
         ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', $2, 'New User', 'Visa', '1111', 12, 2029, 'ct3', 'hash3')`, [C, U]);
const CARD = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
ok((await as(C, `SELECT id, brand, last4 FROM payout_cards`)).rows.length === 2, 'Chioma lists her masked cards');
ok(/permission denied/.test(await err(C, `SELECT pan_ciphertext FROM payout_cards`)), 'encrypted card number is not readable by the user');
ok(/permission denied/.test(await err(C, `SELECT * FROM payout_cards`)), 'select * on cards refused (no hidden columns leak)');
ok((await as(M, `SELECT id FROM payout_cards`)).rows.length === 0, "Mallory cannot see Chioma's cards");
ok(/permission denied/.test(await err(C, `INSERT INTO payout_cards (user_id, holder_name, brand, last4, exp_month, exp_year, pan_ciphertext, pan_hash) VALUES ($1,'x','Visa','1234',1,2030,'a','b')`, [C])), 'cards can only be added through the edge function');
const req = async (who, card, amt) => (await as(who, `SELECT request_card_payout($1, $2) AS r`, [card, amt])).rows[0].r;
r = await req(M, CARD, 50);
ok(r.success === false && (await bal(C)).usd === 400, "Mallory cannot pay out to / from Chioma's card");
r = await req(U, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 50);
ok(r.success === false && /Verify your identity/.test(r.error), 'unverified users cannot withdraw to a card');
r = await req(C, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 50);
ok(r.success === false && /expired/.test(r.error), 'expired card refused');
r = await req(C, CARD, 9999);
ok(r.success === false, 'over the $5,000 limit refused');
r = await req(C, CARD, 1000);
ok(r.success === false && /Insufficient/.test(r.error) && (await bal(C)).usd === 400, 'more than the balance refused');
r = await req(C, CARD, 150);
let b = await bal(C);
ok(r.success === true && b.usd === 250 && b.esc === 150, 'request $150 → wallet 250, escrow 150');
const req1 = r.request_id;
ok((await one(`SELECT status FROM transactions WHERE id = (SELECT transaction_id FROM card_payout_requests WHERE id = $1)`, [req1])).status === 'pending', 'ledger row is pending');
ok(/Only IFB operations/.test(await err(C, `SELECT settle_card_payout($1, true)`, [req1])), 'user cannot mark their own payout as paid');
ok(/permission denied/.test(await err(C, `SELECT _close_card_payout($1, 'paid', null, null)`, [req1])), 'internal settle function not callable');
r = (await as(ADM, `SELECT settle_card_payout($1, true, 'visa-direct-123') AS r`, [req1])).rows[0].r;
b = await bal(C);
ok(r.success === true && b.usd === 250 && b.esc === 0, 'admin settles as paid → escrow released, wallet stays 250');
ok((await as(ADM, `SELECT settle_card_payout($1, false) AS r`, [req1])).rows[0].r.success === false && (await bal(C)).usd === 250, 'cannot settle twice (no refund after paid)');
r = await req(C, CARD, 100);
const req2 = r.request_id;
r = (await as('service', `SELECT settle_card_payout($1, false, null, 'card declined') AS r`, [req2])).rows[0].r;
b = await bal(C);
ok(r.success === true && b.usd === 250 && b.esc === 0, 'failed payout → money back in wallet');
ok((await one(`SELECT 1 x FROM notifications WHERE user_id = $1 AND type = 'card_payout_failed'`, [C]))?.x === 1, 'user notified of failed payout');
r = await req(C, CARD, 40);
const req3 = r.request_id;
ok((await as(M, `SELECT cancel_card_payout($1) AS r`, [req3])).rows[0].r.success === false, "Mallory cannot cancel Chioma's payout");
ok((await as(C, `SELECT cancel_card_payout($1) AS r`, [req3])).rows[0].r.success === true && (await bal(C)).usd === 250, 'user cancels pending payout → refunded');
ok((await as(M, `SELECT remove_payout_card($1) AS r`, [CARD])).rows[0].r === false, "Mallory cannot remove Chioma's card");
ok((await as(C, `SELECT remove_payout_card($1) AS r`, [CARD])).rows[0].r === true, 'Chioma removes her card');
ok((await req(C, CARD, 10)).success === false, 'removed card cannot be used');

// ── ID checks ──
await db.query(`INSERT INTO kyc_id_checks (user_id, country, id_type, id_last4, verified) VALUES ($1, 'NG', 'NIN_V2', '8901', true)`, [C]);
ok((await as(C, `SELECT * FROM kyc_id_checks`)).rows.length === 1, 'user sees own ID check');
ok((await as(M, `SELECT * FROM kyc_id_checks`)).rows.length === 0, "others can't see it");
ok((await as(ADM, `SELECT * FROM kyc_id_checks`)).rows.length === 1, 'admin can review it');
ok(/permission denied/.test(await err(C, `INSERT INTO kyc_id_checks (user_id, country, id_type, verified) VALUES ($1, 'NG', 'BVN', true)`, [C])), 'user cannot fake a verified ID check');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
