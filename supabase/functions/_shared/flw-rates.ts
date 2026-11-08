// Live exchange rates from Flutterwave (GET /v3/transfers/rates), replacing the
// hard-coded tables (e.g. NGN 1600). Both helpers return "local units per 1 USD",
// each in the direction that matches the money flow so the spread is never on IFB:
//   collectRate — the customer pays local currency, IFB receives USD (deposits)
//   payoutRate  — IFB pays local currency out of USD (withdrawals)
import { HttpError } from "./auth.ts";

const FLW = "https://api.flutterwave.com/v3";

async function sourceAmount(secret: string, source: string, destination: string, destAmount: number): Promise<number> {
  const res = await fetch(
    `${FLW}/transfers/rates?amount=${destAmount}&destination_currency=${destination}&source_currency=${source}`,
    { headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(10_000) },
  );
  const j = await res.json().catch(() => null);
  const amt = Number(j?.data?.source?.amount);
  if (!res.ok || !(amt > 0)) throw new HttpError(503, `The ${source}/${destination} rate is unavailable right now. Please try again shortly.`);
  return amt;
}

/** Local currency the customer must pay for 1 USD to land in IFB's account. */
export async function collectRate(secret: string, currency: string): Promise<number> {
  const cur = currency.toUpperCase();
  if (cur === "USD") return 1;
  const local = await sourceAmount(secret, cur, "USD", 100);   // local needed to deliver $100
  return local / 100;
}

/** Local currency the recipient gets for each 1 USD IFB sends. */
export async function payoutRate(secret: string, currency: string): Promise<number> {
  const cur = currency.toUpperCase();
  if (cur === "USD") return 1;
  const probe = 100_000;                                     // deliver 100k local units…
  const usd = await sourceAmount(secret, "USD", cur, probe); // …costs this many USD
  return probe / usd;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;
