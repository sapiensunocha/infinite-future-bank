// Runs supabase/migrations/20261110_partner_foundation.sql on a throwaway in-memory
// Postgres (PGlite + PostGIS) with Supabase-like auth stubs, then checks the rules.
// Touches no real database. Run from the repo root:
//   npm i --no-save --legacy-peer-deps @electric-sql/pglite@0.5.15 @electric-sql/pglite-postgis@0.2.15
//   node supabase/tests/partner_foundation.test.mjs supabase/migrations/20261110_partner_foundation.sql
import { PGlite } from '@electric-sql/pglite';
import { postgis } from '@electric-sql/pglite-postgis';
import { readFileSync } from 'fs';

const MIG = process.argv[2];
const db = await PGlite.create({ extensions: { postgis } });
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m); } else { fail++; console.log('  FAIL', m); } };

await db.exec(`
  CREATE EXTENSION postgis;
  CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
  CREATE SCHEMA auth; CREATE SCHEMA extensions;
  CREATE TABLE auth.users (id uuid PRIMARY KEY, email varchar);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  CREATE TABLE public.profiles (id uuid PRIMARY KEY, full_name text, role text);
  CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS
    $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') $$;
  GRANT USAGE ON SCHEMA public, auth, extensions TO anon, authenticated, service_role;
  GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
  INSERT INTO auth.users VALUES
    ('00000000-0000-0000-0000-00000000000a','admin@ifb.test'),
    ('00000000-0000-0000-0000-00000000000b','owner@ghv.test'),
    ('00000000-0000-0000-0000-00000000000c','agent@ghv.test'),
    ('00000000-0000-0000-0000-00000000000d','viewer@ghv.test'),
    ('00000000-0000-0000-0000-00000000000e','outsider@x.test');
  INSERT INTO public.profiles VALUES ('00000000-0000-0000-0000-00000000000a','IFB Admin','admin'),
    ('00000000-0000-0000-0000-00000000000b','Roland',null),('00000000-0000-0000-0000-00000000000c','Agent',null);
`);
await db.exec(readFileSync(MIG, 'utf8'));
console.log('migration applied');
await db.exec(readFileSync(MIG, 'utf8'));
console.log('migration applied twice (idempotent)');

const U = { admin: 'a', owner: 'b', agent: 'c', viewer: 'd', outsider: 'e' };
async function as(who, sql, params = []) {
  const sub = `00000000-0000-0000-0000-00000000000${U[who]}`;
  return db.transaction(async (tx) => {
    await tx.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [sub]);
    await tx.exec('SET LOCAL ROLE authenticated');
    return tx.query(sql, params);
  });
}
async function err(who, sql, params) { try { await as(who, sql, params); return null; } catch (e) { return e.message; } }

const sq = (lng, lat, d) => ({ type: 'Polygon', coordinates: [[[lng, lat], [lng + d, lat], [lng + d, lat + d], [lng, lat + d], [lng, lat]]] });

// partner creation
ok(/Only IFB admins/.test(await err('owner', `SELECT admin_create_partner('GHV','Greenhouse','CM','GHV-IFB-2026-001','owner@ghv.test')`)), 'non-admin cannot create a partner');
const pid = (await as('admin', `SELECT admin_create_partner('ghv','Greenhouse Ventures','cm','GHV-IFB-2026-001','owner@ghv.test','Greenhouse Ventures Ltd') AS id`)).rows[0].id;
ok(!!pid, 'admin creates partner GHV with owner');

// team
await as('owner', `SELECT partner_set_member($1,'agent@ghv.test','field_agent')`, [pid]);
await as('owner', `SELECT partner_set_member($1,'viewer@ghv.test','viewer')`, [pid]);
ok((await as('viewer', `SELECT * FROM partner_list_members($1)`, [pid])).rows.length === 3, 'members visible to a viewer (3 members with emails)');
ok(/Not allowed/.test(await err('agent', `SELECT partner_set_member($1,'outsider@x.test','viewer')`, [pid])), 'field agent cannot add members');
ok(/at least one owner/.test(await err('owner', `SELECT partner_remove_member($1,'00000000-0000-0000-0000-00000000000b')`, [pid])) || /cannot change your own/.test(''), 'cannot remove the last owner');

// isolation
ok((await as('outsider', `SELECT count(*)::int n FROM partners`)).rows[0].n === 0, 'outsider sees no partners');

// farmers import
const imp = (await as('agent', `SELECT partner_import_farmers($1,$2,'signed_form','IFB-FARMER-CONSENT-v1') r`, [pid, JSON.stringify([
  { full_name: 'Ngono Marie', phone: '+237 6 77 12 34 56', gender: 'female', region: 'Centre', language: 'fr' },
  { full_name: 'Tabi John', phone: '+237677123456', gender: 'male' },          // duplicate phone (same number)
  { full_name: 'Bad Phone', phone: '677123' },                                  // invalid phone
  { full_name: 'Ekane Paul', external_ref: 'GHV-0003', language: 'en' },
])])).rows[0].r;
ok(imp.created === 2, `import: 2 created of 4 (got ${imp.created})`);
ok(imp.results[1].status === 'duplicate' && imp.results[2].status === 'rejected', 'import reports duplicate and invalid rows');
ok(/Not allowed/.test(await err('viewer', `SELECT partner_import_farmers($1,'[{"full_name":"X Y"}]','app','v1')`, [pid])), 'viewer cannot import');
ok(/permission denied|row-level/.test(await err('outsider', `INSERT INTO farmers(partner_id,full_name,consent_at,consent_version,consent_method) VALUES ($1,'Sneaky',now(),'v1','app')`, [pid])), 'outsider cannot insert farmers into GHV');
ok(/permission denied/.test(await err('agent', `UPDATE farmers SET user_id = auth.uid()`)), 'client cannot link a farmer to an IFB account');

// farm + field
const fid = (await as('agent', `SELECT id FROM farmers WHERE full_name='Ngono Marie'`)).rows[0].id;
const farm = (await as('agent', `INSERT INTO farms(partner_id, farmer_id) VALUES ($1,$2) RETURNING id`, [pid, fid])).rows[0].id;
const field = (await as('agent', `INSERT INTO fields(partner_id, farm_id, farmer_id, name, crop, boundary_geojson) VALUES ($1,$2,$3,'Plot 1','cocoa',$4) RETURNING area_ha, centroid_lat, partner_id, monitoring_status`, [pid, farm, fid, JSON.stringify(sq(11.5, 3.86, 0.001))])).rows[0];
ok(Number(field.area_ha) > 1.2 && Number(field.area_ha) < 1.25 && Math.abs(field.centroid_lat - 3.8605) < 0.001, `field measured by PostGIS: ${field.area_ha} ha`);
ok(field.monitoring_status === 'pending', 'new field starts as pending monitoring');
const bow = { type: 'Polygon', coordinates: [[[11.5, 3.86], [11.501, 3.861], [11.501, 3.86], [11.5, 3.861], [11.5, 3.86]]] };
ok(/crosses itself/.test(await err('agent', `INSERT INTO fields(partner_id, farm_id, name, boundary_geojson) VALUES ($1,$2,'Bow',$3)`, [pid, farm, JSON.stringify(bow)])), 'self-crossing boundary rejected');
ok(/between 0.01 and 500/.test(await err('agent', `INSERT INTO fields(partner_id, farm_id, name, boundary_geojson) VALUES ($1,$2,'Huge',$3)`, [pid, farm, JSON.stringify(sq(11.5, 3.86, 0.5))])), 'oversized field rejected');
ok(/at least 3 corner/.test(await err('agent', `INSERT INTO fields(partner_id, farm_id, name, boundary_geojson) VALUES ($1,$2,'Line','{"type":"Polygon","coordinates":[[[11.5,3.86],[11.6,3.86]]]}')`, [pid, farm])), 'too few points rejected');
ok(/permission denied/.test(await err('agent', `UPDATE fields SET monitoring_status='active'`)), 'client cannot mark a field as monitored');
ok(/permission denied/.test(await err('agent', `UPDATE fields SET area_ha=999`)), 'client cannot change the measured area');
// cross-partner trick: outsider tries to hang a field on GHV's farm
ok(!!(await err('outsider', `INSERT INTO fields(partner_id, farm_id, name, boundary_geojson) VALUES ($1,$2,'X',$3)`, [pid, farm, JSON.stringify(sq(11.6, 3.9, 0.001))])), 'outsider cannot add a field to a GHV farm');

// deletes and audit
ok((await as('agent', `DELETE FROM farmers WHERE full_name='Ekane Paul' RETURNING id`)).rows.length === 0, 'field agent cannot delete farmers (no rows affected)');
ok((await as('owner', `DELETE FROM farmers WHERE full_name='Ekane Paul' RETURNING id`)).rows.length === 1, 'owner can delete a farmer');
ok((await as('agent', `SELECT count(*)::int n FROM partner_audit_log`)).rows[0].n === 0, 'field agent cannot read the audit log');
const audit = (await as('owner', `SELECT action, entity FROM partner_audit_log ORDER BY id`)).rows;
ok(audit.some(a => a.entity === 'partner_members') && audit.some(a => a.action === 'import') && audit.some(a => a.action === 'delete'), `owner reads audit log (${audit.length} entries)`);

// overview
const ov = (await as('viewer', `SELECT partner_overview($1) o`, [pid])).rows[0].o;
ok(ov.farmers === 1 && ov.fields === 1 && Number(ov.hectares) > 1.2 && ov.farmers_female === 1, `overview: ${JSON.stringify(ov)}`);
ok(/permission denied|Not allowed/.test(await err('outsider', `SELECT partner_overview($1)`, [pid])), 'outsider cannot read overview');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
