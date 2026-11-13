// Pure helpers for transaction alerts (no I/O, unit-tested in tx-alerts.test.ts).

export interface TxRow {
  amount: number | string;
  transaction_type?: string | null;
  description?: string | null;
  created_at?: string | null;
}

const KIND: Record<string, string> = {
  deposit: "Deposit", stripe_deposit: "Card deposit", withdrawal: "Withdrawal", withdrawal_refund: "Withdrawal refund",
  send: "Transfer sent", receive: "Transfer received", transfer: "Transfer", exchange: "Exchange",
  card_payment: "Card payment", card_recharge: "Card top-up", card_expense: "Card spend", credit: "Credit",
  payroll: "Payroll", payment_page: "Payment page sale", vault_lock: "Moved to vault", vault_unlock: "Moved from vault",
};

/** "stripe_deposit" → "Card deposit"; unknown types are title-cased. */
export function kindLabel(type: string | null | undefined): string {
  const t = String(type ?? "").toLowerCase().trim();
  if (!t) return "Transaction";
  if (KIND[t]) return KIND[t];
  return t.replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase()).slice(0, 40);
}

/** Signed USD amount: 12.5 → "+$12.50", -3 → "-$3.00". */
export function signedUsd(amount: number | string): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "$0.00";
  const abs = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${n < 0 ? "-" : "+"}$${abs}`;
}

export function alertText(tx: TxRow): { title: string; amount: string; kind: string; detail: string; when: string } {
  const n = Number(tx.amount);
  const d = tx.created_at ? new Date(tx.created_at) : new Date();
  const when = Number.isNaN(d.getTime()) ? "" : d.toISOString().replace("T", " ").slice(0, 16) + " UTC";
  return {
    title: n < 0 ? "Money left your IFB account" : "Money added to your IFB account",
    amount: signedUsd(n),
    kind: kindLabel(tx.transaction_type),
    detail: String(tx.description ?? "").replace(/\s+/g, " ").trim().slice(0, 140),
    when,
  };
}

/** A browser PushSubscription we are willing to store and send to (https push services only). */
// deno-lint-ignore no-explicit-any
export function validSubscription(sub: any): boolean {
  if (!sub || typeof sub !== "object") return false;
  if (typeof sub.endpoint !== "string" || sub.endpoint.length > 1000) return false;
  let u: URL;
  try { u = new URL(sub.endpoint); } catch { return false; }
  if (u.protocol !== "https:") return false;
  const k = sub.keys;
  return !!k && typeof k.p256dh === "string" && typeof k.auth === "string" &&
    k.p256dh.length > 20 && k.p256dh.length < 200 && k.auth.length > 8 && k.auth.length < 100;
}
