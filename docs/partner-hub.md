# Partner Hub (Phase 1: partners, farmers, fields)

The Partner Hub is for implementation partners, starting with **Greenhouse Ventures (GHV, Cameroon)** under agreement GHV-IFB-2026-001. Partner teams use it to enrol farmers with recorded consent and to map their fields for MICHAEL monitoring.

**Where to find it:** Home → Services → See all → *Business & merchants* → **Partner Hub**.

## Set up a partner (once, by an IFB admin)
1. The partner's owner creates a normal IFB account.
2. An IFB admin opens Partner Hub; the create-partner form is pre-filled for GHV. Enter the owner's email and press **Create partner**.
3. The owner adds the team under **Team** by email: *Admin*, *Field agent* or *Viewer*. Each person needs an IFB account first.

| Role | Can do |
|---|---|
| Owner | Everything, including managing other owners |
| Admin | Enrol and import farmers, map fields, delete, manage the team, read the audit log |
| Field agent | Enrol and import farmers, map fields |
| Viewer | Look only |
| IFB admin | Everything, for every partner |

## Enrol farmers
- **One at a time:** Farmers → Enrol. The consent statement is shown in French or English. The agent records how consent was given: a signed form, or read aloud and agreed.
- **CSV import:** Farmers → Import CSV. Up to 1,000 rows. Columns: `full_name` (required), `phone`, `gender`, `birth_year`, `region`, `locality`, `language`, `external_ref`. French headers also work: `nom`, `téléphone`, `sexe`, `village`, `langue`. Duplicates and invalid rows are skipped and listed afterwards.
- Phone numbers are stored in international format. Local Cameroon numbers such as `677123456` become `+237677123456`.

## Map fields
Open a farmer → **Map a field**. Either:
- tap each corner on the satellite map, or
- stand at each corner and press **Add my location as a corner** (GPS; the app warns when accuracy is worse than ±30 m).

The database checks the outline (closed, not crossing itself, 0.01–500 ha) and measures the exact area. New fields show **Awaiting monitoring** until they are registered with MICHAEL (Phase 2).

## Security and data protection
- Each partner's team sees **only its own** farmers and fields. This is enforced by the database (row-level security), not by the app.
- Area, location, monitoring status and the link to a farmer's own IFB account are **set by the server**; the app cannot change them.
- Every change to farmers, fields and the team is recorded in `partner_audit_log`, which owners and admins can read.
- No ID-document numbers are stored. MICHAEL receives field outlines only, never farmer details.

## Database
Migration `supabase/migrations/20261110_partner_foundation.sql`. It is additive only: new tables, functions and policies, and no changes to existing objects.

Test it on a throwaway in-memory Postgres, with no real database involved:
```bash
npm i --no-save --legacy-peer-deps @electric-sql/pglite@0.5.15 @electric-sql/pglite-postgis@0.2.15
node supabase/tests/partner_foundation.test.mjs supabase/migrations/20261110_partner_foundation.sql
```
