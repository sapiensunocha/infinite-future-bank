// Runs 20261116_profiles_public, 20261117_profiles_lockdown and 20261118_invoices on a throwaway
// in-memory Postgres (PGlite) with production-shaped tables. Touches no real database.
//   npm i --no-save --legacy-peer-deps @electric-sql/pglite@0.5.15
//   node supabase/tests/profiles_invoices.test.mjs supabase/migrations
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'fs';

const dir = process.argv[2];
const db = await PGlite.create();
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log(c ? '  ok  ' : '  FAIL', m); };
const A = '00000000-0000-0000-0000-00000000000a'; // Amara (user)
const B = '00000000-0000-0000-0000-00000000000b'; // Bayo (agent)
const C = '00000000-0000-0000-0000-00000000000c'; // Chidi
const ADM = '00000000-0000-0000-0000-00000000000d';

await db.exec(`
  CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
  CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_setting('role', true) $$;
  GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
  GRANT EXECUTE ON FUNCTION auth.role() TO anon, authenticated, service_role;
  GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
  CREATE TABLE public.profiles (id uuid PRIMARY KEY, full_name text, avatar_url text, active_tier text, email text, kyc_status text, role text,
    is_cot_processor boolean, cot_rating numeric, cot_completed_tx int, cot_payment_methods text[], latitude double precision, longitude double precision,
    country text, face_descriptor jsonb, phone text);
  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  -- production policies before the lockdown
  CREATE POLICY "Allow logged-in users to read profiles" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');
  CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
  CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
  CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') $$;
  CREATE POLICY profiles_admin_select ON public.profiles FOR SELECT TO authenticated USING ((SELECT public.is_admin()));
  GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
  GRANT SELECT ON public.profiles TO authenticated, anon;
  INSERT INTO auth.users VALUES ('${A}'), ('${B}'), ('${C}'), ('${ADM}');
  INSERT INTO public.profiles (id, full_name, email, kyc_status, is_cot_processor, cot_rating, latitude, longitude, country, face_descriptor, phone, role) VALUES
    ('${A}', 'Amara Okafor', 'amara@example.ng', 'verified', false, null, 6.4474, 3.4723, 'NG', '[0.1]', '+2348031234567', null),
    ('${B}', 'Bayo Adeyemi', 'bayo@example.ng', 'verified', true, 98, 6.44123, 3.47456, 'NG', '[0.2]', '+2348099999999', null),
    ('${C}', 'Chidi Okeke', 'chidi@example.ng', 'pending_kyc', false, null, 12.0, 8.5, 'NG', null, null, null),
    ('${ADM}', 'Ops', 'ops@ifb.test', 'verified', false, null, null, null, null, null, null, 'admin');
  CREATE TABLE public.payment_pages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), merchant_id uuid, status text DEFAULT 'active');
  CREATE TABLE public.payment_page_orders (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), page_id uuid, status text DEFAULT 'pending', paid_at timestamptz);
  CREATE TABLE public.ifb_bills (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), creator_id uuid, amount numeric);
  GRANT ALL ON public.ifb_bills TO authenticated, anon;
  INSERT INTO public.ifb_bills (creator_id, amount) VALUES ('${A}', 10), ('${C}', 20);
`);

async function as(uid, sql, params = []) {
  return db.transaction(async (tx) => {
    if (uid === 'service') { await tx.exec('SET LOCAL ROLE service_role'); return tx.query(sql, params); }
    if (uid) await tx.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [uid]);
    await tx.exec(`SET LOCAL ROLE ${uid ? 'authenticated' : 'anon'}`);
    return tx.query(sql, params);
  });
}
async function err(uid, sql, p) { try { await as(uid, sql, p); return null; } catch (e) { return e.message; } }

// ── 20261116 ──
const m16 = readFileSync(`${dir}/20261116_profiles_public.sql`, 'utf8');
await db.exec(m16); await db.exec(m16);
console.log('20261116 applied twice');
let r = (await as(null, `SELECT * FROM profiles_public WHERE id = $1`, [B])).rows[0];
ok(r.full_name === 'Bayo Adeyemi' && Number(r.latitude) === 6.44 && Number(r.longitude) === 3.47, 'logged out: agent name + location rounded to ~1 km');
r = (await as(A, `SELECT * FROM profiles_public WHERE id = $1`, [C])).rows[0];
ok(r.full_name === 'Chidi Okeke' && r.latitude === null && r.country === null, 'non-agent: no location or country exposed');
ok(!('email' in r) && !('kyc_status' in r) && !('face_descriptor' in r) && !('phone' in r), 'view has no email / KYC / face / phone columns');
ok((await as(A, `SELECT id FROM profiles_public WHERE is_cot_processor`)).rows.map(x => x.id).join() === B, 'agent list works through the view');
let f = (await as(A, `SELECT * FROM find_ifb_users('chidi@example.ng')`)).rows;
ok(f.length === 1 && f[0].full_name === 'Chidi Okeke' && f[0].email_hint === 'c•••@example.ng', 'search by exact email → masked email');
f = (await as(A, `SELECT * FROM find_ifb_users('example.ng')`)).rows;
ok(f.length === 0, 'partial email search returns nothing (no harvesting)');
f = (await as(A, `SELECT * FROM find_ifb_users('ok')`)).rows;
ok(f.length === 0, 'fewer than 3 letters returns nothing');
f = (await as(A, `SELECT * FROM find_ifb_users('oka')`)).rows;
ok(f.length === 0, 'name search never returns yourself ("oka" only matches Amara Okafor)');
f = (await as(A, `SELECT * FROM find_ifb_users('oke')`)).rows;
ok(f.length === 1 && f[0].full_name === 'Chidi Okeke', 'name search finds other users (Chidi Okeke)');
ok(/permission denied/.test(await err(null, `SELECT * FROM find_ifb_users('chidi@example.ng')`) || ''), 'logged out cannot search users');

// ── 20261117 ──
await db.exec(readFileSync(`${dir}/20261117_profiles_lockdown.sql`, 'utf8'));
console.log('20261117 applied');
ok((await as(A, `SELECT id FROM profiles`)).rows.map(x => x.id).join() === A, 'signed in: only your own profile row');
ok((await as(A, `SELECT email, face_descriptor FROM profiles WHERE id = $1`, [A])).rows[0].email === 'amara@example.ng', 'your own row still has all columns');
ok((await as(A, `SELECT email FROM profiles WHERE id = $1`, [B])).rows.length === 0, "cannot read another user's email / GPS / face");
ok((await as(ADM, `SELECT id FROM profiles`)).rows.length === 4, 'admins still see everyone');
ok(/permission denied/.test(await err(null, `SELECT id FROM profiles`) || ''), 'logged out: no access to profiles');
ok((await as(null, `SELECT full_name FROM profiles_public WHERE id = $1`, [A])).rows[0].full_name === 'Amara Okafor', 'pay links still work via the view');

// ── 20261118 ──
const m18 = readFileSync(`${dir}/20261118_invoices.sql`, 'utf8');
await db.exec(m18); await db.exec(m18);
console.log('20261118 applied twice');
const n1 = (await as('service', `SELECT _next_invoice_number($1) n`, [A])).rows[0].n;
const yr = new Date().getFullYear();
ok(n1 === `INV-${yr}-0001`, `first number ${n1}`);
const page = (await db.query(`INSERT INTO payment_pages (merchant_id) VALUES ($1) RETURNING id`, [A])).rows[0].id;
const items = JSON.stringify([{ description: 'Logo', quantity: 1, unit_price_cents: 40000, amount_cents: 40000 }]);
const inv = (await as('service', `INSERT INTO invoices (merchant_id, number, client_name, client_email, items, subtotal_cents, total_cents, page_id, pay_url)
  VALUES ($1, $2, 'Acme', 'ap@acme.com', $3, 40000, 40000, $4, 'https://x/p/abc') RETURNING id`, [A, n1, items, page])).rows[0].id;
ok((await as('service', `SELECT _next_invoice_number($1) n`, [A])).rows[0].n === `INV-${yr}-0002`, 'numbers increase per merchant');
ok((await as('service', `SELECT _next_invoice_number($1) n`, [C])).rows[0].n === `INV-${yr}-0001`, 'each merchant has their own sequence');
ok((await as(A, `SELECT id FROM invoices`)).rows.length === 1, 'merchant sees own invoice');
ok((await as(C, `SELECT id FROM invoices`)).rows.length === 0, "others can't see it");
ok(/permission denied/.test(await err(A, `UPDATE invoices SET status = 'paid', paid_at = now()`) || ''), "merchant can't mark an invoice paid by hand");
ok(/permission denied/.test(await err(A, `INSERT INTO invoices (merchant_id, number, client_name, client_email, items, subtotal_cents, total_cents) VALUES ($1,'X','a','a@b.co','[{}]',1,1)`, [A]) || ''), 'invoices are only created by the server');
ok(/permission denied/.test(await err(A, `SELECT _next_invoice_number($1)`, [A]) || ''), 'numbering function is server-only');
const order = (await db.query(`INSERT INTO payment_page_orders (page_id) VALUES ($1) RETURNING id`, [page])).rows[0].id;
ok((await db.query(`SELECT status FROM invoices WHERE id = $1`, [inv])).rows[0].status === 'open', 'pending payment → invoice still open');
await db.query(`UPDATE payment_page_orders SET status = 'paid', paid_at = now() WHERE id = $1`, [order]);
const after = (await db.query(`SELECT status, paid_at FROM invoices WHERE id = $1`, [inv])).rows[0];
ok(after.status === 'paid' && after.paid_at, 'page paid → invoice paid automatically');
let e = null; try { await db.query(`INSERT INTO invoices (merchant_id, number, client_name, client_email, items, subtotal_cents, total_cents) VALUES ($1, 'Y', 'a', 'not-an-email', '[{"a":1}]', 100, 100)`, [A]); } catch (x) { e = x.message; }
ok(!!e, 'bad client email rejected by the table');
ok((await as(C, `SELECT id FROM ifb_bills`)).rows.length === 1 && (await as(A, `SELECT id FROM ifb_bills`)).rows.length === 1, 'old ifb_bills: each user sees only their own');
ok(/permission denied/.test(await err(null, `SELECT id FROM ifb_bills`) || ''), 'old ifb_bills: logged out has no access');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
