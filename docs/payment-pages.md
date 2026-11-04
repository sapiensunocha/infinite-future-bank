# Payment Pages (merchant payment links with custom forms)

A verified merchant builds a page once (fields + pricing rules), shares its link or QR code,
and customers fill the form and pay. The server prices every order from the saved rules,
the payment provider confirms it through a signed webhook, and the merchant's IFB wallet
is credited exactly once.

Example: a travel agency page asks for passenger name, passport number, route, travel
date, cabin class (each class has its own price) and number of passengers. Total =
(base + cabin price + add-ons) x passengers.

## Security rules (non-negotiable)

1. **The server is the only source of prices.** The browser sends answers, never amounts.
   `checkout` recomputes the total from the page's saved `pricing` and `fields`.
2. **Orders snapshot the page.** An order stores the `fields`/`pricing` it was priced with,
   so editing a page never changes an order that is already in flight.
3. **Money moves only on a verified provider confirmation.** Stripe: signed webhook.
   Flutterwave and Paystack: signed webhook **and** a server-side verify call checking
   status, amount and currency. Then `mark_page_order_paid` (service role only) locks the
   order, checks it is still `pending` (or `expired`: a customer who paid is always
   honoured), checks amount >= total and currency, and credits the merchant through the
   internal `_credit_page_order` (same ledger pattern as `credit_deposit`: a `transactions`
   row keyed `external_id = 'pageorder:<order_id>'`, balance changed only if that row was
   inserted), so retries and duplicate webhooks credit once. `credit_deposit` itself is not
   used because it rejects `authenticated` callers, and wallet payments run as the payer.
   The platform fee of every paid order is recorded in `platform_fee_ledger`.
4. **Customer answers are encrypted** (AES-256-GCM, key `PAYMENT_PAGE_DATA_KEY`) before they
   reach the database. Only the owning merchant can read them, through the edge function.
   Nobody, including the merchant, has direct table access to answers.
5. **Only KYC-verified merchants** (`profiles.kyc_status` in `verified`, `approved`) can
   publish pages.
6. **Public endpoints are rate-limited** per IP hash and per page, and require a Cloudflare
   Turnstile token when `TURNSTILE_SECRET_KEY` is set.
7. Clients have no INSERT/UPDATE/DELETE on any payment-page table; every write goes through
   the `payment-pages` edge function.

## v1 limits

- Currency: **USD only** (the wallet is `liquid_usd`). Local-currency pages need FX and are
  a follow-up.
- No file-upload fields yet (needs a private bucket + malware scanning).
- Funds are available immediately after payment; a settlement hold for chargebacks is a
  follow-up.

## Data model

`payment_pages`: id, merchant_id, slug (unique, `^[a-z0-9-]{3,60}$`), title, description,
logo_url, currency ('USD'), status ('active' | 'inactive'), visibility ('public' |
'private'), single_use, max_uses, uses_count, expires_at, fields jsonb, pricing jsonb,
success_message, redirect_url, notify_email, webhook_url, webhook_secret, version,
created_at, updated_at. Private pages get an unguessable slug (`p-` + 20 random lowercase
base36 chars, about 103 bits; base62 would break the lowercase slug format). Changing a page's
visibility issues a new slug, so a page made private is not reachable through its old link.
Pages also 404 publicly if the merchant's KYC status is no longer `verified`/`approved`.

`webhook_secret` is excluded from the merchants' direct SELECT grant (column-level grant).

`platform_fee_ledger`: id, source ('payment_page'), order_id (unique), page_id, merchant_id,
fee_cents, currency, created_at. Service role only.

`payment_page_orders`: id, page_id, merchant_id, page_version, fields_snapshot,
pricing_snapshot, line_items jsonb, subtotal_cents, fee_cents, total_cents,
merchant_net_cents, currency, customer_email, customer_name, answers_ciphertext,
status ('pending' | 'paid' | 'failed' | 'expired'), provider ('stripe' | 'flutterwave' |
'paystack' | 'wallet'), provider_ref, paid_at, ip_hash, created_at, expires_at (created +
1 hour). `expire_stale_page_orders()` (service role) flips overdue `pending` orders to
`expired`; schedule it with pg_cron. Orders whose provider could not be started are marked
`failed`.

## Field schema (`fields`, max 30)

```json
{ "id": "cabin", "type": "select", "label": "Cabin class", "required": true,
  "options": [ { "value": "economy", "label": "Economy", "price_cents": 30000 },
               { "value": "business", "label": "Business", "price_cents": 90000 } ] }
```

- `id`: `^[a-z][a-z0-9_]{0,39}$`, unique on the page. Reserved: `email`, `name`, `amount`.
- `type`: `text` | `textarea` | `email` | `phone` | `number` | `date` | `select` | `checkbox`.
- `label` (<= 120 chars), `required` (bool), optional `placeholder`, `help` (<= 200).
- `select`: `options` (1-50), each `value` (`^[a-z0-9_-]{1,40}$`), `label`, `price_cents` (int >= 0, optional).
- `checkbox`: optional `price_cents` added when checked (an add-on).
- `number`: optional integer `min` / `max`.
- Text answers <= 2000 chars (`textarea`) or 200 (others); `email` and `phone` validated;
  `date` is `YYYY-MM-DD`.

Every page also always collects the customer's `name` and `email` (top-level, not in `fields`).

## Pricing schema (`pricing`)

```json
{ "mode": "fixed" | "customer_amount",
  "base_cents": 0,
  "quantity_field": "passengers",
  "customer_amount": { "min_cents": 100, "max_cents": 500000 },
  "fee_bearer": "merchant" | "customer" }
```

- `fixed`: unit = base_cents + price of each chosen `select` option + each checked
  `checkbox` add-on. If `quantity_field` names a `number` field, subtotal = unit x quantity
  (quantity 1-100), else subtotal = unit.
- `customer_amount`: the customer types `amount_cents` within min/max (donations, tips,
  "pay what you owe"); option prices still add on top.
- Platform fee = round(subtotal x `PAGE_FEE_BPS` / 10000), default 150 bps (1.5%).
  `fee_bearer: customer` → total = subtotal + fee, merchant gets subtotal.
  `fee_bearer: merchant` → total = subtotal, merchant gets subtotal - fee.
- Total must be between 100 cents ($1) and 100,000,000 cents ($1,000,000).

The single implementation lives in `supabase/functions/_shared/page-pricing.ts`
(`validatePageDefinition`, `validateAnswers`, `priceOrder`), with tests next to it.

## Edge function `payment-pages` (POST, JSON body `{ "action": ..., ... }`)

Merchant actions (require `Authorization: Bearer <user JWT>`):

| action | input | output |
|---|---|---|
| `list_pages` | — | `{ pages: Page[] }` |
| `create_page` | `{ page: PageInput }` | `{ page, webhook_secret }` (secret shown only here and on rotate) |
| `update_page` | `{ id, page: PageInput }` | `{ page }` (bumps `version`) |
| `set_status` | `{ id, status }` | `{ page }` |
| `rotate_webhook_secret` | `{ id }` | `{ webhook_secret }` (only time it is shown) |
| `list_orders` | `{ page_id?, status?, limit<=100, before? }` | `{ orders: Order[] }` with decrypted `answers` |

`PageInput` = `{ title, description?, logo_url?, visibility, single_use?, max_uses?,
expires_at?, fields, pricing, success_message?, redirect_url? (https only), notify_email?,
webhook_url? (https only) }`. Slug is generated server-side (from the title for public pages,
random for private ones).

Public actions (no user login needed; anon key only):

| action | input | output |
|---|---|---|
| `get_page` | `{ slug }` | `{ page: { slug, title, description, logo_url, currency, fields, pricing, merchant_name, success_message } }`; 404 if inactive, expired or used up |
| `quote` | `{ slug, answers, amount_cents? }` | `{ line_items, subtotal_cents, fee_cents, total_cents, currency }` |
| `checkout` | `{ slug, name, email, answers, amount_cents?, method: 'card' \| 'mobile_money' \| 'paystack' \| 'wallet', turnstile_token? }` | card: `{ order_id, client_secret, publishable_key }`; mobile_money / paystack: `{ order_id, redirect_url }`; wallet (needs user JWT): `{ order_id, status: 'paid' }` |
| `order_status` | `{ order_id }` | `{ status, total_cents, currency, success_message, redirect_url? }` (no answers; `redirect_url` only once paid). For pending Flutterwave/Paystack orders it also asks the provider (verify by reference) so the redirect page settles even if the webhook is late. |

Errors: `{ error: string }` with 400 (validation), 401, 403, 404, 409 (page used up, or a
single-use page with an order in flight), 429, 502 (payment provider could not start the payment).

Rate limits: `checkout` allows at most 10 orders per IP hash and 300 per page per 10 minutes
(counted in the database). `get_page`, `quote` and `order_status` have a best-effort
per-instance limit of 120 requests per minute per IP hash. IPs are stored only as
sha256(pepper + IP).

## Webhooks

- `stripe-webhook`: `payment_intent.succeeded` with `metadata.ifb_page_order_id` → mark paid.
  These intents must never take the normal deposit path.
- `flutterwave-webhook`: `charge.completed` with `tx_ref` starting `IFBPG-` → verify → mark paid.
- `paystack-webhook` (new): `x-paystack-signature` HMAC-SHA512 (checked before parsing) →
  `charge.success` with reference `IFBPG-<order id>` → verify → mark paid.
- After an order is paid: email the merchant (answers included) and the customer (receipt),
  and POST to the merchant's `webhook_url`, signed with `X-IFB-Signature: sha256=<hmac>`.
  Body: `{ event: 'order.paid', order: { id, page_slug, total_cents, currency, customer_name,
  customer_email, answers, line_items, paid_at } }`; the HMAC is hex HMAC-SHA256 of the raw body
  with the page's `webhook_secret`. 5 s timeout, no redirects, https only, and private /
  loopback / link-local targets are refused when the page is saved and again before each POST.
  Notification failures never undo a payment.

## Environment

`PAYMENT_PAGE_DATA_KEY` (base64, 32 bytes; required), `PAGE_FEE_BPS` (optional, default 150),
`PAYMENTS_PUBLIC_BASE_URL` (default `https://app.infinitefuturebank.org`),
`TURNSTILE_SECRET_KEY` (optional, recommended), `PAYSTACK_SECRET_KEY` (optional; enables Paystack),
`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `FLUTTERWAVE_SECRET_KEY`, `RESEND_API_KEY`,
`PAYMENTS_EMAIL_FROM` (optional, default `IFB Payments <noreply@infinitefuturebank.org>`).
Front end: `VITE_TURNSTILE_SITE_KEY` (optional).
