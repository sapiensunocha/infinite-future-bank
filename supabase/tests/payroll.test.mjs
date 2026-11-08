// Runs 20261112_user_test_fixes.sql then 20261114_payroll.sql on a throwaway in-memory Postgres
// (PGlite) with production-shaped payroll tables (RLS was OFF in production). Touches no real database.
//   npm i --no-save --legacy-peer-deps @electric-sql/pglite@0.5.15
//   node supabase/tests/payroll.test.mjs supabase/migrations/20261112_user_test_fixes.sql supabase/migrations/20261114_payroll.sql
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'fs';

const [MIG1, MIG2] = process.argv.slice(2);
const db = await PGlite.create();
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m); } else { fail++; console.log('  FAIL', m); } };

const E = '00000000-0000-0000-0000-00000000000e';  // Emeka (approved business)
const S1 = '00000000-0000-0000-0000-000000000001'; // staff with IFB account (matched by email)
const S2 = '00000000-0000-0000-0000-000000000002'; // staff with IFB account (linked)
const X = '00000000-0000-0000-0000-00000000000f';  // another company
await db.exec(`
  CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  GRANT USAGE ON SCHEMA public, auth TO anon, authenticated;
  GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
  CREATE TABLE public.profiles (id uuid PRIMARY KEY, full_name text, avatar_url text, active_tier text, email text, role text);
  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  CREATE POLICY p ON public.profiles FOR SELECT USING (true);
  GRANT SELECT ON public.profiles TO anon, authenticated;
  CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') $$;
  GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
  CREATE TABLE public.balances (user_id uuid PRIMARY KEY, liquid_usd numeric DEFAULT 0, afr_balance numeric DEFAULT 0, last_synced timestamptz, CHECK (liquid_usd >= 0));
  CREATE TABLE public.transactions (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, user_id uuid NOT NULL, transaction_type text NOT NULL,
    status text DEFAULT 'completed', amount numeric NOT NULL, metadata jsonb DEFAULT '{}', description text NOT NULL,
    created_at timestamptz DEFAULT now(), source_type text, authorized_by text);
  CREATE TABLE public.notifications (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, user_id uuid, message text NOT NULL, type text,
    read boolean DEFAULT false, metadata jsonb DEFAULT '{}', amount numeric, related_user_id uuid, status text DEFAULT 'pending');
  CREATE TABLE public.commercial_profiles (id uuid PRIMARY KEY, pascaline_status text);
  -- as in production: RLS OFF, full grants
  CREATE TABLE public.payroll_employees (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, employer_id uuid, employee_email text, employee_name text,
    employee_user_id uuid, salary_amount numeric, status text, created_at timestamptz DEFAULT now());
  CREATE TABLE public.payroll_runs (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, employer_id uuid, total_gross numeric, total_net numeric,
    total_tax numeric, employee_count int, status text, processed_at timestamptz);
  GRANT ALL ON public.payroll_employees, public.payroll_runs TO authenticated;
  GRANT SELECT ON public.commercial_profiles TO authenticated;
  -- stand-in for the live unsafe engine, callable by signed-in users before the migration
  CREATE FUNCTION public.process_corporate_payroll_v2(p_org_id uuid, p_total numeric, p_employees jsonb, p_fee numeric)
    RETURNS jsonb LANGUAGE sql SECURITY DEFINER AS $$ SELECT '{"paid":1}'::jsonb $$;
  GRANT EXECUTE ON FUNCTION public.process_corporate_payroll_v2(uuid, numeric, jsonb, numeric) TO authenticated;
  INSERT INTO public.profiles (id, full_name, email) VALUES ('${E}', 'Obi Logistics Ltd', 'emeka@obi.ng'), ('${S1}', 'Ada', 'ada@example.ng'),
    ('${S2}', 'Bola', 'bola@example.ng'), ('${X}', 'Other Co', 'x@co.ng');
  INSERT INTO public.commercial_profiles VALUES ('${E}', 'eligible_for_funding'), ('${X}', 'pending');
  INSERT INTO public.balances (user_id, liquid_usd) VALUES ('${E}', 1000), ('${X}', 1000);
  INSERT INTO public.payroll_employees (employer_id, employee_email, employee_name, employee_user_id, salary_amount, status) VALUES
    ('${E}', 'ADA@example.ng ', 'Ada', null, 300, 'active'),
    ('${E}', 'bola@x.ng', 'Bola', '${S2}', 200, 'active'),
    ('${E}', 'chidi@nowhere.ng', 'Chidi', null, 150, 'active'),
    ('${E}', 'gone@example.ng', 'Gone', null, 999, 'inactive'),
    ('${X}', 'secret@co.ng', 'Other staff', null, 5000, 'active');
`);
await db.exec(readFileSync(MIG1, 'utf8'));
await db.exec(readFileSync(MIG2, 'utf8'));
await db.exec(readFileSync(MIG2, 'utf8'));
console.log('migrations applied (payroll twice: idempotent)');

async function as(uid, sql, params = []) {
  return db.transaction(async (tx) => {
    await tx.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [uid]);
    await tx.exec('SET LOCAL ROLE authenticated');
    return tx.query(sql, params);
  });
}
async function err(uid, sql, params) { try { await as(uid, sql, params); return null; } catch (e) { return e.message; } }
const bal = async (u) => Number((await db.query(`SELECT liquid_usd FROM balances WHERE user_id = $1`, [u])).rows[0]?.liquid_usd ?? 0);
const run = async (uid, gross) => (await as(uid, `SELECT run_payroll($1) AS r`, [gross])).rows[0].r;

// ── the leak ──
ok((await as(X, `SELECT * FROM payroll_employees`)).rows.every(r => r.employer_id === X), "another company can no longer read Emeka's staff and salaries");
ok((await as(E, `SELECT * FROM payroll_employees`)).rows.length === 4, 'Emeka sees his own 4 staff rows');
ok((await as(X, `UPDATE payroll_employees SET salary_amount = 1 WHERE employer_id = '${E}' RETURNING id`)).rows.length === 0, "another company cannot change Emeka's salaries");
ok(/row-level security/.test(await err(X, `INSERT INTO payroll_employees (employer_id, employee_name, salary_amount, status) VALUES ('${E}', 'ghost', 1, 'active')`) || ''), "cannot add staff to someone else's payroll");
ok(/permission denied/.test(await err(E, `INSERT INTO payroll_runs (employer_id, total_gross) VALUES ('${E}', 1)`) || ''), 'payroll runs cannot be faked by the client');
ok((await as(S2, `SELECT employee_name FROM payroll_employees`)).rows.map(r => r.employee_name).join() === 'Bola', 'an employee sees only their own entry');
ok(/permission denied/.test(await err(E, `SELECT process_corporate_payroll_v2('${E}', 1, '[]', 0)`) || ''), 'old unsafe payroll engine is no longer callable');

// ── run ──
let r = await run(X, 5000);
ok(r.success === false && /approved business/.test(r.error), 'a company without approved underwriting cannot run payroll');
r = await run(E, 500);
ok(r.success === false && /changed/.test(r.error) && await bal(E) === 1000, 'stale total (screen showed $500, list is $650) refused, nothing moves');
r = await run(E, 650);
ok(r.success === true && r.paid_count === 2 && Number(r.total_paid) === 500 && Number(r.fee) === 10, 'pays Ada (matched by email) + Bola (linked): $500, fee 2% = $10');
ok(await bal(E) === 490 && await bal(S1) === 300 && await bal(S2) === 200, 'balances: Emeka 1000 → 490, Ada +300, Bola +200');
ok(r.unpaid.length === 1 && r.unpaid[0].name === 'Chidi', 'Chidi (no IFB account) reported as not paid and not charged');
ok((await db.query(`SELECT employee_user_id FROM payroll_employees WHERE employee_name = 'Ada'`)).rows[0].employee_user_id === S1, "Ada's IFB account is linked for next time");
const runs = (await as(E, `SELECT status, employee_count FROM payroll_runs`)).rows;
ok(runs.length === 1 && runs[0].status === 'partial' && runs[0].employee_count === 2, 'run recorded as partial with 2 paid');
ok((await db.query(`SELECT count(*)::int n FROM transactions WHERE transaction_type IN ('payroll_send','payroll_receive','payroll_fee')`)).rows[0].n === 5, 'ledger: 2 sends + 2 receives + 1 fee');
ok((await db.query(`SELECT count(*)::int n FROM notifications WHERE type = 'p2p_received'`)).rows[0].n === 2, 'both employees notified');
await db.query(`UPDATE balances SET liquid_usd = 100 WHERE user_id = $1`, [E]);
r = await run(E, 650);
ok(r.success === false && /Insufficient/.test(r.error) && await bal(E) === 100 && await bal(S1) === 300, 'not enough for salaries + fee: nobody is paid');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
