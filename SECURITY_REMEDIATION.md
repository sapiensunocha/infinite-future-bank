# Security Remediation: Owner Checklist

Branch `security/launch-blockers` removes secrets from the current tree and hardens CI, Android and web headers.
**Removing a file from the tree does NOT un-leak it.** Every credential below was in a public repo (in git history,
in GitHub Actions artifacts, or in published JS bundles), so treat it as compromised. Work through this list in order.

> This file contains credential **names only**. Never paste a secret value into an issue, PR, commit or chat.

---

## 1. Contain (do first, today)

- [ ] **Make the GitHub repository private.** Settings > General > Danger Zone > Change visibility.
- [ ] **Take down the `gh-pages` deployment.** Branch `origin/gh-pages` (`kyc.infinitefuturebank.org`) serves an old
      build whose JS bundles contain the Resend key, Gemini key and Michael API key, plus `DEUS-latest.apk`.
      Disable GitHub Pages (Settings > Pages), delete or rebuild the branch from the fixed code, and purge any CDN cache.
- [ ] **Delete the Actions artifacts that contain the signing keystore + passwords** (named `ifb-signing-keystore-credentials`):

  ```bash
  REPO=sapiensunocha/infinite-future-bank
  gh api --paginate "repos/$REPO/actions/artifacts?name=ifb-signing-keystore-credentials&per_page=100" \
    --jq '.artifacts[].id' | while read -r id; do
      echo "deleting artifact $id"
      gh api -X DELETE "repos/$REPO/actions/artifacts/$id"
    done
  # Verify none remain:
  gh api "repos/$REPO/actions/artifacts?name=ifb-signing-keystore-credentials" --jq '.total_count'
  ```

  Old workflow-run logs may also echo secret material. Delete old runs of `build-android.yml` if in doubt:
  `gh run list --workflow build-android.yml --limit 200 --json databaseId --jq '.[].databaseId' | xargs -n1 gh run delete`

## 2. Rotate every exposed credential

Rotate (create new, deploy, then revoke old). Names only:

| Credential | Where to rotate | Where the new value goes |
|---|---|---|
| Stripe **live secret key** (`sk_live_…`) | Stripe Dashboard > Developers > API keys > Roll key | Supabase function secret `STRIPE_SECRET_KEY` |
| Stripe **webhook signing secret** (`whsec_…`) | Stripe Dashboard > Webhooks > endpoint > Roll secret | Supabase function secret `STRIPE_WEBHOOK_SECRET` |
| **Resend** API key | resend.com > API Keys (delete old key) | Supabase secret `RESEND_API_KEY`; local env for `send_formation_announcement.mjs` |
| **Gemini** API key | Google AI Studio / GCP Credentials (delete old key) | Supabase secret `GEMINI_API_KEY` only. Never `VITE_*` |
| **Groq** API key | console.groq.com > API Keys | Supabase secret `GROQ_API_KEY` |
| **Michael API key** (Cloud Run `michael-api`) | Rotate on the Michael API service | Supabase secret used by `michael-proxy` |
| **Google Play service-account key** | GCP > IAM > Service Accounts > Keys: **delete the leaked key**, create a new one | GitHub secret `PLAY_STORE_JSON_KEY` (environment `production`) |
| **Play upload key** (keystore + passwords leaked) | Play Console > App integrity > App signing > **Request upload key reset**; generate a new upload keystore locally | GitHub secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_PASSWORD`, `ANDROID_KEY_ALIAS` |
| **KYC admin passcode** | Change it; the new flow uses signed tokens | Supabase secret `KYC_ADMIN_TOKEN_SECRET` (new, random 32+ bytes) |
| Supabase **service-role key / JWT secret** | Consider rotating JWT secret (Supabase > Settings > API). This invalidates all sessions and the anon key, so plan a release | Supabase + all `VITE_SUPABASE_ANON_KEY` envs |

The Supabase **anon** key and URL are public by design and are intentionally still in client code.

## 3. Purge git history (coordinate before force-pushing)

Do this **after** rotation (rotation is what actually protects you; history purge stops further spread).

```bash
# Fresh mirror clone, never your working copy
git clone --mirror https://github.com/sapiensunocha/infinite-future-bank.git ifb-purge.git
cd ifb-purge.git

# Literal secrets to scrub from any remaining blobs (fill in locally, do NOT commit this file).
# One per line, format:  <old-secret-value>==>REDACTED
#   - old Resend key (from send_formation_announcement.mjs)
#   - old Gemini key, old Michael key, Android keystore password, any other leaked literal
$EDITOR ../replacements.txt

pip install git-filter-repo   # or: brew install git-filter-repo

git filter-repo --force \
  --invert-paths \
  --path .env \
  --path-glob 'apps/core/android/*.b64' \
  --path apps/core/android/keystore.properties \
  --path apps/core/ifb-release-key.jks \
  --path apps/core/ifb-upload-key.jks \
  --path ifb-upload-key.jks \
  --path-glob 'infinite-future-bank/*.jks' \
  --path infinite-future-bank/android/keystore.properties \
  --path apps/core/assets \
  --path ifb_claude_code_session_export.md

git filter-repo --force --replace-text ../replacements.txt   # scrubs send_formation_announcement.mjs old blobs etc.

# Verify nothing is left (should print nothing):
git log --all -p | grep -nE 're_[A-Za-z0-9]{8}_|AIza[0-9A-Za-z_-]{30}|sk_live_|whsec_' | head

git push --force --mirror origin
```

Force-push coordination:
- [ ] Announce a freeze; merge or close open PRs first (PR refs are read-only and keep old commits).
- [ ] After the push every collaborator must **re-clone** (do not pull/merge old clones back in).
- [ ] Ask GitHub Support to purge cached views / dangling commits and PR refs (Support > "Remove sensitive data").
- [ ] Forks keep old history: check `gh api repos/sapiensunocha/infinite-future-bank/forks`.
- [ ] Re-apply branch protection on `main` afterwards.

## 4. Turn on GitHub protections

- [ ] Settings > Code security: enable **Secret scanning** and **Push protection**.
- [ ] Enable **Dependabot alerts** and **Dependabot security updates** (optionally add `.github/dependabot.yml` for `npm` + `github-actions`).
- [ ] Branch protection on `main`: require PR review + the `Security` workflow (gitleaks + npm audit) to pass.
- [ ] Create environment **`production`** (Settings > Environments) with **required reviewers**; the Play deploy job only runs there and only on manual `workflow_dispatch`.
- [ ] If the repo is owned by an organization, add `GITLEAKS_LICENSE` (free from gitleaks.io) or the gitleaks job will fail.

## 5. New GitHub Actions secrets

| Secret | Scope | Notes |
|---|---|---|
| `ANDROID_KEYSTORE_BASE64` | repo | `base64 -i new-upload-key.jks` (new upload key after reset) |
| `ANDROID_KEYSTORE_PASSWORD` | repo | |
| `ANDROID_KEY_PASSWORD` | repo | |
| `ANDROID_KEY_ALIAS` | repo | |
| `PLAY_STORE_JSON_KEY` | environment `production` | new service-account JSON |
| `GITLEAKS_LICENSE` | repo | only if org-owned |

Delete obsolete secrets: `IFB_RELEASE_KEY_BASE64` (no longer read).

## 6. New Supabase function secrets

```bash
supabase secrets set KYC_ADMIN_TOKEN_SECRET=<random-32+-bytes>
supabase secrets set ALLOWED_ORIGINS="https://deus.infinitefuturebank.org,https://app.infinitefuturebank.org,https://kyc.infinitefuturebank.org"
# Optional (store-review demo login). Leave unset in production unless a review is in progress:
supabase secrets set REVIEW_DEMO_ENABLED=false REVIEW_DEMO_PHONE=<...> REVIEW_DEMO_CODE=<...>
# Mobile Money payouts stay OFF until USD->local FX conversion is implemented (flutterwave-transfer TODO):
supabase secrets set FLW_WITHDRAWALS_ENABLED=false
# Needed by the shared auth helper and Flutterwave verification:
#   SUPABASE_ANON_KEY, FLUTTERWAVE_SECRET_KEY, optional RECEIPTS_BUCKET (default "receipts" — create it, private)
# Plus the rotated values from section 2 (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY, GEMINI_API_KEY, GROQ_API_KEY, ...)
```

## 7. Database migration

- [ ] Apply `supabase/migrations/20261030_security_launch_blockers.sql` to **staging first**, run the app end-to-end
      (signup, OTP, KYC upload/admin review, deposit, withdrawal, card), then production.

## Database and edge-function changes

**Migration `20261030_security_launch_blockers.sql`** (forward-only; parsed with the Postgres parser, PL/pgSQL bodies not yet executed — test on staging):

- `is_admin()` helper; profiles trigger blocks clients from changing `role`, `kyc_status`, `is_cot_processor`, `phone_verified` and other privilege columns.
- Dropped `instant_deposit` and the legacy 3-arg `p2p_transfer`.
- `process_internal_transfer`: one AFR rate (100 AFR = 1 USD) in both directions, all validation before any debit.
- Money RPCs (card payment, clyrix, monetized likes, pension, insurance premium, first-customer unlock) act as `auth.uid()`, require amount > 0, lock rows.
- New service-role-only ledger functions `credit_deposit`, `debit_for_withdrawal`, `refund_withdrawal`, idempotent on `transactions.external_id`.
- NFC claim, P2P receipt confirmation, P2P finalize, ticket purchase, market order and KYC admin RPCs now check ownership/role and status.
- `kyc-documents` bucket private with owner/admin policies; `validate_kyc_admin` service-role only; seeded default passcode deactivated.
- `virtual_cards.cvv` nulled (PCI DSS 3.3.1); clients can no longer write `transactions`; non-negative balance CHECKs (NOT VALID).
- Node rewards, insurance claims, pension accounts and insurance policies: owners can read/insert, money columns server-owned.
- EXECUTE on `admin_/process_/credit_/debit_/refund_` SECURITY DEFINER functions revoked from PUBLIC/anon, re-granted only to the client allowlist.

Before applying: reconcile any negative balances and duplicate Stripe PaymentIntent rows; confirm the prod-only RPCs not in the repo (`admin_get_users`, `admin_get_kyc_queue`, `process_bill_payment`, `process_payment_request`, `admin_credit_balance`, 2-arg `process_corporate_payroll_v2`) get the same review.

**Edge functions** (shared helpers in `supabase/functions/_shared/auth.ts`):

- Every money/auth/KYC function derives the user from `auth.getUser()`; none accepts `userId` from the body. `verify_jwt=true` alone is not authentication.
- Withdrawals/payouts debit atomically before calling Stripe/Flutterwave with idempotency keys; refund only on a definite 4xx rejection. Timeouts/5xx return `202 pending` and need reconciliation (see `RECONCILE:` log lines).
- All deposit credits go through `credit_deposit` keyed by PaymentIntent / Flutterwave transaction id; Flutterwave charges re-verified via `/v3/transactions/{id}/verify`.
- Deleted: `setup-stripe-webhook`, `run-migration`, `kyc-report` (unauthenticated PII dump).
- `verify-otp`: demo bypass only via env flags, no magic links for arbitrary users, exact phone match. `face-auth` web mode removed.
- KYC admin tokens are HMAC-signed; login rate-limited. `kyc-ai-reviewer` requires service role, admin, or the applicant. `kyc-ai-extract` only reads KYC storage objects the caller owns. `kyc-company-portal` OTP uses a CSPRNG, uniform responses, request and failure rate limits.
- Card issuance uses `crypto.getRandomValues` and no longer stores CVV; `ifb-charge-card` requires auth and positive amounts.
- CORS restricted to `ALLOWED_ORIGINS`; Twilio responses no longer logged.

**Known gaps still open:** Flutterwave payouts disabled until FX conversion exists; no rate limiter on card charges (needs an attempts table); insurance coverage/premium still priced client-side (admin review is the control); `kyc-update-project` writes any column it is sent; AFR mint uses a read-modify-write; client code that sets `is_cot_processor` or inserts into `transactions` directly (P2PExchange, AdminDashboard) will now be rejected and must move to RPCs.

## 8. Web / client follow-ups

- [ ] Rebuild and redeploy every host (Railway/Vercel/Netlify) so the new bundles (no client AI keys, no console logs) go live.
- [ ] `VITE_GEMINI_API_KEY` must be **removed** from every hosting provider's env vars (Vercel/Netlify/Railway). Any `VITE_*` var is public.
- [ ] Voice advisor is disabled until a server-side Gemini Live bridge exists (`VITE_VOICE_BRIDGE_URL`).
- [ ] CSP is shipped as `Content-Security-Policy-Report-Only` (in `apps/core/public/_headers`, `apps/core/vercel.json`, `apps/core/server.cjs`).
      Watch browser console / add a `report-to` endpoint for ~2 weeks, fix violations, then rename the header to
      `Content-Security-Policy` in all three places. Known items to resolve first: the inline `onload` on the Google Fonts
      `<link>` in `index.html`, and `cdn.tailwindcss.com` used by `kyc-admin.html` (self-host Tailwind instead).
- [ ] HSTS `preload` is set; only submit to hstspreload.org once **every** subdomain serves HTTPS.
- [ ] `kyc-admin.html` (repo root and `apps/core/public/`) is kept because the admin flow needs it; it must only work with the new server-side admin token.

## 9. Android follow-ups

- [ ] Build a release locally after the upload-key reset: `minifyEnabled`/`shrinkResources` are now on. Smoke-test Stripe Terminal Tap to Pay, camera/KYC capture (FileProvider paths were narrowed), biometrics and login.
- [ ] Screenshots are now blocked (`FLAG_SECURE`); app backup is disabled.

## 10. Legal / compliance

- [ ] **GDPR breach assessment** for the publicly readable KYC storage bucket: determine what identity documents were exposed and for how long, check access logs, decide on notifying the supervisory authority (72-hour clock from awareness) and affected users. Document the decision even if you conclude no notification is needed.
- [ ] Record this incident (timeline, credentials rotated, data exposed) in an incident log.

## 11. Remaining launch blockers (not code)

- [ ] Independent **penetration test** of web app, edge functions and Android app.
- [ ] Contract an **AML / sanctions screening vendor** and wire it into onboarding and payouts.
- [ ] A proper **double-entry ledger** with reconciliation, so balances cannot be edited directly.
- [ ] Remaining `npm audit` items with no non-breaking fix: `face-api.js` (old tfjs/node-fetch), `react-joyride` (deepmerge), `serve` (compression). Replace or upgrade deliberately.
