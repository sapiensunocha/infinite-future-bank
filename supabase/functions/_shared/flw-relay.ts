// Flutterwave only accepts transfer (payout) requests from whitelisted IP addresses, and
// Supabase edge functions have no fixed outgoing address. When FLW_RELAY_URL and
// FLW_RELAY_KEY are set, transfer requests go through a small relay server that has a
// fixed address (infra/payout-relay). The relay forwards only /v3/transfers requests that
// carry the relay key, and stores nothing. Everything else still goes to Flutterwave directly.

const DIRECT = "https://api.flutterwave.com/v3";

export function relayConfigured(): boolean {
  return !!(Deno.env.get("FLW_RELAY_URL") && Deno.env.get("FLW_RELAY_KEY"));
}

/** Base URL for Flutterwave transfer calls: the relay when configured, else Flutterwave. */
export function transferBase(): string {
  const url = (Deno.env.get("FLW_RELAY_URL") ?? "").trim().replace(/\/+$/, "");
  if (!relayConfigured() || !/^https:\/\/[a-z0-9.-]+$/i.test(url)) return DIRECT;
  return `${url}/v3`;
}

/** Extra headers for transfer calls (the relay key, only when the relay is in use). */
export function transferHeaders(): Record<string, string> {
  return transferBase() === DIRECT ? {} : { "X-Relay-Key": Deno.env.get("FLW_RELAY_KEY")! };
}
