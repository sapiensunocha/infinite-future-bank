// bank-payout — withdraw from the IFB USD wallet straight to a Nigerian bank account
// (NUBAN) through Flutterwave Transfers. No agent involved.
//   POST { action: "banks" }                                → { banks: [{ code, name }] }
//   POST { action: "resolve", bank_code, account_number }   → { account_name }
//   POST { action: "quote", amount_usd }                    → { rate, amount_ngn, fee_usd, total_usd }
//   POST { action: "send", bank_code, account_number, amount_usd } → { reference, amount_ngn, account_name }
// Safety:
//   - verified KYC only; $1–$5,000 per payout
//   - the account name is looked up with the bank (never typed by the user)
//   - the wallet is debited (debit_for_withdrawal) BEFORE the transfer; a definite
//     Flutterwave rejection refunds immediately; transfer.failed webhook refunds later
//   - live USD→NGN rate (payoutRate); Flutterwave debits IFB's USD balance
//   - same switch as mobile-money payouts: FLW_WITHDRAWALS_ENABLED=true
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, errorResponse, getAuthedUser, HttpError, jsonResponse } from "../_shared/auth.ts";
import { payoutRate, round2 } from "../_shared/flw-rates.ts";
import { relayConfigured, transferBase, transferHeaders } from "../_shared/flw-relay.ts";

const FLW = "https://api.flutterwave.com/v3";
const FEE_PCT = 0.005; // same 0.5% routing fee shown in the app

async function flw(secret: string, path: string, init: RequestInit = {}) {
  // Only transfers need the fixed-address relay (Flutterwave IP whitelisting).
  const viaRelay = path === "/transfers" || path.startsWith("/transfers/");
  const res = await fetch(`${viaRelay ? transferBase() : FLW}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json", ...(viaRelay ? transferHeaders() : {}) },
    signal: AbortSignal.timeout(15_000),
  });
  const j = await res.json().catch(() => null);
  return { res, j };
}

async function resolveAccount(secret: string, bank: string, acct: string): Promise<string> {
  const { res, j } = await flw(secret, "/accounts/resolve", {
    method: "POST", body: JSON.stringify({ account_number: acct, account_bank: bank }),
  });
  const name = j?.data?.account_name;
  if (!res.ok || j?.status !== "success" || typeof name !== "string" || !name.trim()) {
    throw new HttpError(400, "We couldn't find that account. Check the bank and the 10-digit account number.");
  }
  return name.trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });
  try {
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
    const user = await getAuthedUser(req);
    const secret = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
    if (!secret) throw new HttpError(503, "Bank payouts are not configured yet");
    const b = await req.json().catch(() => ({}));

    if (b.action === "banks") {
      const { res, j } = await flw(secret, "/banks/NG");
      if (!res.ok || !Array.isArray(j?.data)) throw new HttpError(502, "Could not load the bank list. Please try again.");
      const banks = j.data
        .map((x: { code?: string; name?: string }) => ({ code: String(x.code ?? ""), name: String(x.name ?? "") }))
        .filter((x: { code: string; name: string }) => x.code && x.name)
        .sort((a: { name: string }, c: { name: string }) => a.name.localeCompare(c.name));
      return jsonResponse(req, { banks });
    }

    const bank = String(b.bank_code ?? "").trim();
    const acct = String(b.account_number ?? "").replace(/\D/g, "");

    if (b.action === "resolve") {
      if (!/^[0-9A-Za-z]{3,10}$/.test(bank) || !/^\d{10}$/.test(acct)) throw new HttpError(400, "Choose a bank and enter the 10-digit account number");
      return jsonResponse(req, { account_name: await resolveAccount(secret, bank, acct) });
    }

    const amountUsd = round2(Number(b.amount_usd));
    if (!(amountUsd >= 1 && amountUsd <= 5000)) throw new HttpError(400, "Bank payouts are between $1 and $5,000");
    const fee = round2(amountUsd * FEE_PCT);
    const total = round2(amountUsd + fee);

    if (b.action === "quote") {
      const rate = await payoutRate(secret, "NGN");
      return jsonResponse(req, { rate: round2(rate), amount_ngn: Math.floor(amountUsd * rate * 100) / 100, fee_usd: fee, total_usd: total });
    }

    if (b.action !== "send") throw new HttpError(400, "Unknown action");
    if (Deno.env.get("FLW_WITHDRAWALS_ENABLED") !== "true") {
      throw new HttpError(503, "Bank withdrawals are being switched on. Please use an agent for now.");
    }
    if (!/^[0-9A-Za-z]{3,10}$/.test(bank) || !/^\d{10}$/.test(acct)) throw new HttpError(400, "Choose a bank and enter the 10-digit account number");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data: profile } = await admin.from("profiles").select("kyc_status").eq("id", user.id).maybeSingle();
    if (!["verified", "approved"].includes(String(profile?.kyc_status ?? ""))) {
      throw new HttpError(403, "Verify your identity before withdrawing to a bank account.");
    }

    const accountName = await resolveAccount(secret, bank, acct);
    const rate = await payoutRate(secret, "NGN");
    const amountNgn = Math.floor(amountUsd * rate * 100) / 100;
    const reference = `IFB-BANK-${crypto.randomUUID()}`;

    const { error: debitErr } = await admin.rpc("debit_for_withdrawal", {
      p_user_id: user.id, p_amount: total, p_external_id: reference,
      p_description: `Bank withdrawal $${amountUsd} + $${fee} fee → ${accountName} (${acct.slice(-4)})`,
    });
    if (debitErr) throw new HttpError(400, "Insufficient balance");

    const { res, j } = await flw(secret, "/transfers", {
      method: "POST",
      body: JSON.stringify({
        account_bank: bank, account_number: acct, amount: amountNgn, currency: "NGN", debit_currency: "USD",
        reference, narration: "IFB wallet withdrawal",
        callback_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/flutterwave-webhook`,
      }),
    }).catch(() => ({ res: null as Response | null, j: null }));

    const ok = res?.ok && j?.status === "success";
    if (!ok && res && res.status >= 400 && res.status < 500) {
      const { error: refundErr } = await admin.rpc("refund_withdrawal", { p_external_id: reference });
      if (refundErr) console.error("CRITICAL: refund_withdrawal failed for", reference, refundErr.code);
      // Keep the provider's reason so support can see why a payout was refused (no keys, no account numbers).
      await admin.from("app_telemetry").insert([{ event: "bank_payout_refused", metadata: {
        reference, http: res.status, flw_status: j?.status ?? null, flw_message: String(j?.message ?? "").slice(0, 200),
        empty_body: j === null, via_relay: relayConfigured(), refunded: !refundErr,
      } }]).then(() => {}, () => {});
      throw new HttpError(502, j?.message ? `The bank transfer was refused: ${String(j.message).slice(0, 120)}` : "The bank transfer was refused. Your money is back in your wallet.");
    }
    // Success, or an ambiguous network error: keep the debit; the transfer webhook settles it.

    await admin.from("p2p_orders").insert([{
      user_id: user.id, order_type: "withdraw", amount_usd: amountUsd,
      payment_method: `Bank transfer — ${accountName} •••• ${acct.slice(-4)}`,
      status: "flw_processing",
      metadata: {
        flw_reference: reference, flw_transfer_id: j?.data?.id ?? null, flw_currency: "NGN", rate, amount_ngn: amountNgn,
        fee_usd: fee, bank_code: bank, account_last4: acct.slice(-4), account_name: accountName, country: "NG",
      },
    }]);
    await admin.from("notifications").insert([{
      user_id: user.id, type: "payment_sent", read: false, status: "pending",
      message: `₦${amountNgn.toLocaleString("en-NG")} is on its way to ${accountName}. Ref: ${reference}`,
    }]);

    return jsonResponse(req, { reference, amount_ngn: amountNgn, rate: round2(rate), account_name: accountName, pending: !ok });
  } catch (e) {
    return errorResponse(req, e);
  }
});
