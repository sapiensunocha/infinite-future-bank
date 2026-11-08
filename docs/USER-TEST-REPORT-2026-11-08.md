# Infinite Future Bank: user test report (Nigeria personas)

| | |
|---|---|
| **Date** | 8 Nov 2026 |
| **App version tested** | `main` @ 31af0d44 (same code as build 1.7.1) |
| **Method** | Scripted user journeys run through the real app screens on a phone-sized browser against a test backend. Every call the app made was recorded, then checked against the **live production database (read-only)**. |
| **Not done** | No accounts were created on production and no real money moved. Card checkout (Stripe), Flutterwave and Paystack were not completed end to end, because that needs provider test keys and a test Supabase project. |

## 1. Personas

| Persona | Story | Tested |
|---|---|---|
| **Chioma Eze**, Lagos | Freelance designer paid in USD by US clients; cashes out to GTBank | KYC, request link, all 4 add-money options, bank / card / agent withdrawals |
| **Emeka Obi**, Abuja | Owner of Obi Logistics Ltd | KYB (corporate KYC), Payment Pages, Payroll, Box Office, Marketplace, payment from a US client |
| **Aisha Bello**, Kano | Gets money from family abroad, sends to family, cashes out locally | Send, mobile-money and cash-pickup withdrawals, Exchange, Vault, Pay Me, Tap & Pay, Referrals, NPO Hub |

## 2. Summary

| Result | Count |
|---|---|
| 🔴 **Broken for every user** (fails in production today) | 6 |
| 🟠 **Works, but wrong or risky** | 7 |
| 🟡 **Nigeria gaps** | 5 |
| ✅ **Worked as expected** | 14 |

**Bottom line for a Nigerian user:** they can verify their identity, receive USD and **cash out only through a human agent (P2P)**. They **cannot send money to another IFB user**, there is **no direct payout to a Nigerian bank account**, and **Nigerian mobile-money payout is a dead end**.

## 3. 🔴 Broken for every user

| # | Journey | What the user sees | Cause (checked live) | Fix |
|---|---|---|---|---|
| B1 | **Send money** to another IFB user (Aisha → Tunde, $40) | Error toast: *"Could not find the function public.p2p_transfer…"*; nothing is sent | `TransactionModal.jsx:103` calls `p2p_transfer`, which **does not exist** in production (dropped in the Oct hardening). Organisation transfers (`OrganizationSuite.jsx:280`) have the same problem. | Restore a safe `p2p_transfer` where the sender is always `auth.uid()` (the 4-argument version in `20261025_security_hardening.sql`) and apply it. |
| B2 | **Add money → "Instant Direct Deposit"**, shown first and marked *Recommended* | Red box: *"Could not find the function public.instant_deposit in the schema cache"* | The function was removed on purpose, because it let users create money. The option is still in `DepositInterface.jsx`. | Remove the option from Add money. |
| B3 | **Pay a payment request** (Confirm in notifications) | Error; the payment is not made | `Dashboard.jsx:231` calls `process_payment_request`, which **does not exist** in production | Add a safe RPC (payer = `auth.uid()`, checks balance, marks the request paid) or hide the button. |
| B4 | **Payroll → run payroll** | Error | `Payroll.jsx:77` calls `process_corporate_payroll_v2(p_employer_id, p_total_gross_amount)`. Production has a different signature `(p_org_id, p_total, p_employees, p_fee)` that signed-in users cannot run. Payroll also only takes money from the employer; employees are never paid. | Align the client and the RPC, and credit each employee. |
| B5 | **Services → Referrals** | Blank screen; the app crashes (*formatCurrency is not a function*) | `<CapitalNetwork>` is opened without the `formatCurrency` prop (`AppPopupModal.jsx:105`, `CommercialUnderwriting.jsx:112`) | Pass the prop (one-line fix in both places). |
| B6 | **Withdraw → Mobile Money → Nigeria** | Says *"No automated mobile money networks for this country. Routing to Community of Trust instead"*, but the only button, *"Send $60 via MTN instantly"*, stays **disabled**. Dead end. | `FLW_NETWORKS` has no Nigeria entry, and the fallback never actually switches to P2P | Add Nigeria (Flutterwave/Paystack transfer) or really hand off to the P2P agent flow. |

## 4. 🟠 Works, but wrong or risky

| # | Finding | Severity | Detail |
|---|---|---|---|
| R1 | **Anyone, even logged out, can read every user's email, KYC status and GPS location** | **High (privacy / NDPA)** | Live `profiles` has the policy *"Public profiles are viewable by everyone" (true)*, and the `anon` role can read `email`, `kyc_status`, `latitude` and `longitude`. Add money via an agent writes the user's GPS to `profiles` (seen in the test: `PATCH profiles {latitude, longitude}`). Only metadata was checked; no customer rows were read. Fix: drop that policy and expose only `id, full_name, avatar_url` through a view or RPC for pay links and agent lists. |
| R2 | **An empty KYC form can be submitted** | High | Tested: Continue ×4, tick the AML box, Submit KYC. It saves a submission with no name, no date of birth and no ID, and sets the profile to `pending_kyc`. The only check is the AML checkbox (`KYCWizard.jsx:490`). Add per-step required-field checks and require the ID front and the selfie with ID. |
| R3 | **KYC documents are saved as "public" links of a private bucket** | Medium | `kyc-ai-extract` gets `…/object/public/kyc-documents/…`. That bucket is private, so the AI review (and reviewers opening the link) cannot read the file. Use signed URLs or pass the storage path. |
| R4 | **"IFB Handled — Global Bank / Card" withdrawal is actually a P2P agent payout** | Medium | After the bank form, the user is shown agents (Bayo, Hauwa) to "lock escrow". The label promises IFB does the payout. |
| R5 | **Card payout collects the full card number and CVC** | High (PCI) | The number and expiry are stored as plain text in `p2p_orders.payment_method` and sent to the agent in a notification. Remove card payout, or use a tokenised payout provider. |
| R6 | **Bank details typed as free text** go to the agent in clear | Medium | `payment_method: "Local Bank Transfer - GTBank (058) · NUBAN 0123456789 · Chioma Eze"`. There is no account-number check and no account-name lookup, so mistakes mean lost money. |
| R7 | **Fixed exchange rate** | Medium | $100 is shown as **₦160,000** (hard-coded 1,600). Use a live rate and show the rate and its time. Adding cash via an agent ends in *"Confirm & Request AFR Mint"*: the user gets AFR tokens, not USD, which isn't explained. |

## 5. 🟡 Nigeria gaps

1. **No Nigerian bank payout:**
   - IFB-handled bank withdrawal offers only **US ACH (routing number)**, **SWIFT/IBAN** (Nigeria has no IBAN) or **card**;
   - there is no NUBAN field, no bank list and no account-name check;
   - **recommendation:** add Paystack or Flutterwave Transfers (bank list, NUBAN lookup, transfer webhook).
2. **No Nigerian mobile-money payout** (B6). OPay, PalmPay, Moniepoint and MTN MoMo PSB are the common wallets.
3. **Add money in NGN** goes only through Flutterwave mobile money, with phone placeholder `+233` (Ghana). There is no bank transfer, virtual account or USSD option for Nigeria, although the Payment Pages checkout already offers **Paystack (card, bank transfer, USSD)**. Reuse it for Add money.
4. **Agent (P2P) is the only working cash-out** for Nigerian users today. It works (order, escrow lock, agent notified), but it depends on there being agents in each city.
5. **KYC wording is US-centred:** Tax ID / SSN, "+1 555" phone placeholder and income in USD. Add NIN and BVN fields and Nigerian ID types (NIN slip, voter's card).

## 6. ✅ Worked as expected

| Journey | Recorded result |
|---|---|
| Personal KYC with ID, selfie and proof of address (Chioma) | Files uploaded, AI extract called, submission saved, status → pending |
| **KYB** for Obi Logistics Ltd (company name, RC number, UBO 100%, CAC certificate, UBO ID) | Corporate fields and documents saved with the submission |
| Request $400 from a US client (pay link) | Link generated. Live check: a logged-out payer can load the payee and pay by card (`create-guest-payment-intent`). |
| Add money by card ($100) | Stripe payment intent created; card form shown (not paid: no test key) |
| Add money NGN mobile money | `flutterwave-collect` called with ₦160,000; number saved |
| Add money via Lagos agent | Agents listed by distance, receipt uploaded, AI receipt check called |
| **Withdraw $250 to GTBank via Lagos agent** | `p2p_orders` created, escrow locked (`process_p2p_escrow` exists live), agent notified |
| **Cash pickup $80 in Kano** | Same flow, Kano agent selected |
| Exchange: Cash → Safe Vault $100 | `process_internal_transfer` (exists live) |
| Vault, Pay Me QR, Tap & Pay | Screens open; actions available |
| Payment Pages: create "Abuja delivery fee" ($15) | `payment-pages` → `create_page`; listed afterwards |
| Customer view of a Payment Page | Options, total $609 and Card / Mobile money / **Paystack** choices shown |
| Box Office, Marketplace, NPO Hub | Open and browse |
| Payroll entry | Locked behind "Corporate Access Required" until business underwriting is done (by design) |

## 7. Recommended fix order

1. **This week (one release):**
   - B1: restore safe `p2p_transfer`;
   - B2: remove Instant Deposit;
   - B5: Referrals crash;
   - B6: Nigerian mobile money dead end;
   - B3: payment requests;
   - **R1: close the public `profiles` read**;
   - **R2: KYC required fields**;
   - **R5: remove card-number payout.**
2. **Next:**
   - **Nigerian bank payout** with Paystack or Flutterwave Transfers (NUBAN and name check);
   - NGN add-money by bank transfer or USSD;
   - live FX;
   - payroll that pays employees;
   - Nigerian KYC fields (NIN and BVN).
3. **Before real-money tests:**
   - create a **separate test Supabase project** with Paystack, Flutterwave and Stripe **test keys**;
   - repeat these journeys there with 2–3 real test accounts, end to end.

---
*Test scripts and screenshots: local test harness (not committed). Production checks were read-only and metadata-only; no customer data was read.*
