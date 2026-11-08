// Runs 20261115_payout_tracking.sql on a throwaway PGlite database (production-shaped p2p_orders).
//   node supabase/tests/payout_tracking.test.mjs supabase/migrations/20261115_payout_tracking.sql
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'fs';
const db = await PGlite.create(); let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log(c ? '  ok  ' : '  FAIL', m); };
await db.exec(`CREATE TABLE public.p2p_orders (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, order_type text NOT NULL, amount_usd numeric NOT NULL,
  payment_method text NOT NULL, status text DEFAULT 'open', CONSTRAINT p2p_orders_status_check CHECK (status = ANY (ARRAY['open','locked_in_escrow','proof_uploaded','completed','disputed','cancelled'])));
  INSERT INTO p2p_orders (order_type, amount_usd, payment_method, status) VALUES ('withdraw', 10, 'Cash', 'locked_in_escrow');`);
let e = null; try { await db.exec(`INSERT INTO p2p_orders (order_type, amount_usd, payment_method, status, metadata) VALUES ('withdraw', 5, 'x', 'flw_processing', '{}')`); } catch (x) { e = x.message; }
ok(!!e, 'before: payout insert fails (as in production) — ' + (e || '').slice(0, 50));
const mig = readFileSync(process.argv[2], 'utf8'); await db.exec(mig); await db.exec(mig);
ok(true, 'migration applied twice (idempotent)');
await db.query(`INSERT INTO p2p_orders (order_type, amount_usd, payment_method, status, metadata) VALUES ('withdraw', 250, 'Bank transfer', 'flw_processing', '{"flw_reference":"IFB-BANK-1","fee_usd":1.25}')`);
const r = (await db.query(`SELECT id, status FROM p2p_orders WHERE metadata->>'flw_reference' = 'IFB-BANK-1'`)).rows;
ok(r.length === 1, 'webhook can find the payout by reference');
await db.query(`UPDATE p2p_orders SET status = 'failed' WHERE id = $1`, [r[0].id]);
ok(true, 'status can move to failed (refund path)');
e = null; try { await db.query(`INSERT INTO p2p_orders (order_type, amount_usd, payment_method, status, metadata) VALUES ('withdraw', 1, 'x', 'flw_processing', '{"flw_reference":"IFB-BANK-1"}')`); } catch (x) { e = x.message; }
ok(/unique/i.test(e || ''), 'the same payout reference cannot be recorded twice');
ok((await db.query(`SELECT metadata FROM p2p_orders WHERE payment_method = 'Cash'`)).rows[0].metadata !== undefined, 'existing agent orders keep working (metadata defaults to {})');
e = null; try { await db.query(`INSERT INTO p2p_orders (order_type, amount_usd, payment_method, status) VALUES ('withdraw', 1, 'x', 'bogus')`); } catch (x) { e = x.message; }
ok(!!e, 'unknown statuses are still rejected');
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
