// Runs supabase/migrations/20261119_support.sql on a throwaway PGlite database with production-shaped
// support / transaction tables. Touches no real database.
//   node supabase/tests/support.test.mjs supabase/migrations/20261119_support.sql
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'fs';

const db = await PGlite.create();
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log(c ? '  ok  ' : '  FAIL', m); };
const A = '00000000-0000-0000-0000-00000000000a'; // Amara
const M = '00000000-0000-0000-0000-00000000000b'; // Mallory
const AG = '00000000-0000-0000-0000-00000000000c'; // IFB agent (admin)
const TX = '1a2b3c4d-5e6f-4000-8000-000000000001';
const TXM = '9f8e7d6c-5b4a-4000-8000-000000000002';

await db.exec(`
  CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
  CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  GRANT USAGE ON SCHEMA public, auth TO anon, authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
  CREATE TABLE public.profiles (id uuid PRIMARY KEY, full_name text, role text);
  CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') $$;
  GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
  CREATE TABLE public.balances (user_id uuid PRIMARY KEY, liquid_usd numeric DEFAULT 0, last_synced timestamptz);
  CREATE TABLE public.transactions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, transaction_type text NOT NULL, status text DEFAULT 'completed',
    amount numeric NOT NULL, metadata jsonb DEFAULT '{}', description text NOT NULL, created_at timestamptz DEFAULT now(), source_type text, authorized_by text, external_id text);
  CREATE TABLE public.notifications (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, user_id uuid, message text NOT NULL, type text, read boolean DEFAULT false,
    metadata jsonb DEFAULT '{}', amount numeric, related_user_id uuid, status text DEFAULT 'pending');
  CREATE TABLE public.p2p_orders (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, processor_id uuid, order_type text, amount_usd numeric, payment_method text,
    status text, created_at timestamptz DEFAULT now(), locked_at timestamptz, completed_at timestamptz, metadata jsonb DEFAULT '{}');
  CREATE TABLE public.deposit_intents (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, amount_usd numeric, charge_currency text, charge_amount numeric,
    provider text, tx_ref text, status text, provider_ref text, failure_reason text, created_at timestamptz DEFAULT now(), completed_at timestamptz);
  -- production support tables + policies
  CREATE TABLE public.support_tickets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES auth.users(id), status text DEFAULT 'open',
    created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), subject text);
  CREATE TABLE public.support_messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ticket_id uuid REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_id uuid, sender_type text NOT NULL, message text NOT NULL, created_at timestamptz DEFAULT now());
  ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY; ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users view own tickets" ON public.support_tickets FOR SELECT USING (auth.uid() = user_id);
  CREATE POLICY "Users insert own tickets" ON public.support_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "Admins view all tickets" ON public.support_tickets FOR SELECT USING (is_admin());
  CREATE POLICY "Admins update tickets" ON public.support_tickets FOR UPDATE USING (is_admin());
  CREATE POLICY "Users view own ticket messages" ON public.support_messages FOR SELECT USING (ticket_id IN (SELECT id FROM support_tickets WHERE user_id = auth.uid()));
  CREATE POLICY "Users insert messages to own tickets" ON public.support_messages FOR INSERT WITH CHECK (ticket_id IN (SELECT id FROM support_tickets WHERE user_id = auth.uid()));
  CREATE POLICY "Admins view all messages" ON public.support_messages FOR SELECT USING (is_admin());
  CREATE POLICY "Admins insert messages" ON public.support_messages FOR INSERT WITH CHECK (is_admin());
  GRANT SELECT, INSERT, UPDATE ON public.support_tickets, public.support_messages TO authenticated;
  INSERT INTO auth.users VALUES ('${A}'), ('${M}'), ('${AG}');
  INSERT INTO public.profiles VALUES ('${A}', 'Amara Okafor', null), ('${M}', 'Mallory', null), ('${AG}', 'Ngozi (IFB support)', 'admin');
  INSERT INTO public.balances (user_id, liquid_usd) VALUES ('${A}', 100);
  INSERT INTO public.transactions (id, user_id, transaction_type, amount, description, metadata) VALUES
    ('${TX}', '${A}', 'p2p_send', -40, 'Sent to Tunde', '{"ref":"abc-ref-123"}'), ('${TXM}', '${M}', 'deposit', 500, 'Card deposit', '{}');
  INSERT INTO public.support_tickets (user_id, subject) VALUES ('${A}', 'old ticket from the AI chat');
  INSERT INTO public.p2p_orders (user_id, order_type, amount_usd, payment_method, status, metadata) VALUES ('${A}', 'withdraw', 250, 'Bank transfer — GTBank', 'flw_processing', '{"flw_reference":"IFB-BANK-77"}');
  INSERT INTO public.deposit_intents (user_id, amount_usd, charge_currency, charge_amount, provider, tx_ref, status) VALUES ('${A}', 100, 'NGN', 158000, 'flutterwave', 'IFB.INSTANT.1111', 'pending');
`);
const mig = readFileSync(process.argv[2], 'utf8');
await db.exec(mig); await db.exec(mig);
console.log('migration applied twice (idempotent)');

async function as(uid, sql, params = []) {
  return db.transaction(async (tx) => {
    if (uid) await tx.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [uid]);
    await tx.exec(`SET LOCAL ROLE ${uid ? 'authenticated' : 'anon'}`);
    return tx.query(sql, params);
  });
}
async function err(uid, sql, p) { try { await as(uid, sql, p); return null; } catch (e) { return e.message; } }
const one = async (sql, p) => (await db.query(sql, p)).rows[0];

ok(/^SUP-\d{6}$/.test((await one(`SELECT number FROM support_tickets LIMIT 1`)).number), 'existing tickets get a number');

// create
const t1 = (await as(A, `SELECT create_support_ticket('withdrawal', 'Bank payout not received', 'My GTBank payout has not arrived.') r`)).rows[0].r;
ok(/^SUP-\d{6}$/.test(t1.number), `new ticket ${t1.number}`);
const msgs = (await as(A, `SELECT sender_type FROM support_messages WHERE ticket_id = $1 ORDER BY created_at`, [t1.id])).rows.map((r) => r.sender_type);
ok(msgs.join() === 'user,system', 'first message + automatic acknowledgement');
ok(/permission denied|row-level/.test(await err(A, `INSERT INTO support_messages (ticket_id, sender_id, sender_type, message) VALUES ($1, $2, 'agent', 'fake agent')`, [t1.id, A]) || ''), 'customer cannot post as an agent');
ok(/row-level/.test(await err(M, `INSERT INTO support_messages (ticket_id, sender_id, sender_type, message) VALUES ($1, $2, 'user', 'hi')`, [t1.id, M]) || ''), "cannot post into someone else's ticket");
ok((await as(M, `SELECT id FROM support_tickets WHERE id = $1`, [t1.id])).rows.length === 0, "cannot see someone else's ticket");
await as(A, `INSERT INTO support_messages (ticket_id, sender_id, sender_type, message) VALUES ($1, $2, 'user', 'Any update?')`, [t1.id, A]);
ok((await one(`SELECT last_sender FROM support_tickets WHERE id = $1`, [t1.id])).last_sender === 'user', 'customer message updates the ticket');
await as(AG, `INSERT INTO support_messages (ticket_id, sender_id, sender_type, message) VALUES ($1, $2, 'agent', 'Checking with the bank now.')`, [t1.id, AG]);
ok((await one(`SELECT status FROM support_tickets WHERE id = $1`, [t1.id])).status === 'agent_assigned', 'agent reply → status agent_assigned');
ok((await one(`SELECT count(*)::int n FROM notifications WHERE user_id = $1 AND type = 'support_reply'`, [A])).n === 1, 'customer notified of the agent reply');
ok(/row-level/.test(await err(A, `INSERT INTO support_messages (ticket_id, sender_id, sender_type, message) VALUES ($1, $2, 'agent', 'x')`, [t1.id, AG]) || ''), 'customer cannot impersonate the agent id');
ok(/not found/.test(await err(A, `SELECT create_support_ticket('dispute', 'x', 'about someone else tx', $1)`, [TXM]) || ''), "cannot link someone else's transaction");

// dispute
const d1 = (await as(A, `SELECT open_dispute($1, 'Recipient did not receive it', 'Tunde says nothing arrived.') r`, [TX])).rows[0].r;
const dt = await one(`SELECT category, priority, transaction_id, subject FROM support_tickets WHERE id = $1`, [d1.id]);
ok(dt.category === 'dispute' && dt.priority === 'high' && dt.transaction_id === TX && /40\.00 USD/.test(dt.subject), 'dispute ticket: high priority, linked to the transaction');
const d2 = (await as(A, `SELECT open_dispute($1, 'again', 'again') r`, [TX])).rows[0].r;
ok(d2.existing === true && d2.number === d1.number, 'second dispute on the same transaction returns the open one');
ok(/not found/.test(await err(M, `SELECT open_dispute($1, 'x', 'y')`, [TX]) || ''), "cannot dispute someone else's transaction");

// trace
const rec = 'IFB-' + TX.replace(/-/g, '').slice(0, 10).toUpperCase();
let tr = (await as(A, `SELECT trace_transaction($1) r`, [rec])).rows[0].r;
ok(tr.length === 1 && tr[0].id === TX && tr[0].disputes.length === 1, `trace by receipt number ${rec} → transaction + its dispute`);
ok((await as(A, `SELECT trace_transaction($1) r`, [TX])).rows[0].r.length === 1, 'trace by full transaction ID');
ok((await as(A, `SELECT trace_transaction('abc-ref-123') r`)).rows[0].r.length === 1, 'trace by payment reference');
tr = (await as(A, `SELECT trace_transaction('IFB-BANK-77') r`)).rows[0].r;
ok(tr.length === 1 && tr[0].kind === 'order' && tr[0].status === 'flw_processing', 'trace a bank payout by its reference');
tr = (await as(A, `SELECT trace_transaction('IFB.INSTANT.1111') r`)).rows[0].r;
ok(tr.length === 1 && tr[0].kind === 'deposit', 'trace a deposit by its reference');
ok((await as(M, `SELECT trace_transaction($1) r`, [rec])).rows[0].r.length === 0, "Mallory cannot trace Amara's transaction");
tr = (await as(AG, `SELECT trace_transaction($1) r`, [rec])).rows[0].r;
ok(tr.length === 1 && tr[0].holder === 'Amara Okafor', 'agent can trace any transaction and see the holder');
ok((await as(A, `SELECT trace_transaction('IFB') r`)).rows[0].r.length === 0, 'too-short references return nothing');

// resolve
ok(/Only IFB support agents/.test(await err(A, `SELECT resolve_support_ticket($1, 'refunded', 'self refund', 40)`, [d1.id]) || ''), 'customer cannot refund themselves');
ok(/between/.test(await err(AG, `SELECT resolve_support_ticket($1, 'refunded', 'too much', 41)`, [d1.id]) || ''), 'refund capped at the disputed amount');
const res = (await as(AG, `SELECT resolve_support_ticket($1, 'refunded', 'Recipient account was closed; returning your money.', 40) r`, [d1.id])).rows[0].r;
ok(res.success && Number((await one(`SELECT liquid_usd FROM balances WHERE user_id = $1`, [A])).liquid_usd) === 140, 'refund credited: wallet 100 → 140');
const rt = await one(`SELECT status, outcome, refund_amount, resolved_by FROM support_tickets WHERE id = $1`, [d1.id]);
ok(rt.status === 'resolved' && rt.outcome === 'refunded' && Number(rt.refund_amount) === 40 && rt.resolved_by === AG, 'ticket marked resolved/refunded with the agent');
ok((await one(`SELECT count(*)::int n FROM transactions WHERE user_id = $1 AND transaction_type = 'dispute_refund'`, [A])).n === 1, 'refund appears in history (with a receipt)');
ok(/already settled/.test(await err(AG, `SELECT resolve_support_ticket($1, 'refunded', 'again', 1)`, [d1.id]) || ''), 'cannot refund the same dispute twice');
const d3 = (await as(A, `SELECT open_dispute($1, 'again later', 'new issue') r`, [TX])).rows[0].r;
ok(!d3.existing, 'after resolution, a new dispute can be opened');
await as(AG, `SELECT resolve_support_ticket($1, 'rejected', 'The transfer was delivered on Nov 8.')`, [d3.id]);
ok(Number((await one(`SELECT liquid_usd FROM balances WHERE user_id = $1`, [A])).liquid_usd) === 140, 'rejected dispute moves no money');
ok((await one(`SELECT count(*)::int n FROM notifications WHERE user_id = $1 AND type = 'support_resolved'`, [A])).n === 2, 'customer notified of each outcome');
await as(A, `INSERT INTO support_messages (ticket_id, sender_id, sender_type, message) VALUES ($1, $2, 'user', 'I disagree')`, [d3.id, A]);
ok((await one(`SELECT status FROM support_tickets WHERE id = $1`, [d3.id])).status === 'open', 'customer reply reopens a resolved ticket');
ok(/permission denied/.test(await err(null, `SELECT trace_transaction('x123456')`) || ''), 'logged out: no access');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
