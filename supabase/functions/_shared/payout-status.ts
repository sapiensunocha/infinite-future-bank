// Pure: turn Flutterwave's GET /v3/transfers/:id answer into what to do with our order.

export type PayoutOutcome =
  | { state: "completed" }
  | { state: "failed"; reason: string }
  | { state: "waiting"; why: string };

// deno-lint-ignore no-explicit-any
export function payoutOutcome(httpStatus: number, body: any, ourReference: string): PayoutOutcome {
  if (httpStatus < 200 || httpStatus >= 300 || body?.status !== "success" || !body?.data) {
    return { state: "waiting", why: `lookup_http_${httpStatus}` };
  }
  const d = body.data;
  // Never act on a transfer that is not ours.
  if (String(d.reference ?? "") !== ourReference) return { state: "waiting", why: "reference_mismatch" };
  const s = String(d.status ?? "").toUpperCase();
  if (s === "SUCCESSFUL") return { state: "completed" };
  if (s === "FAILED") {
    return { state: "failed", reason: String(d.complete_message ?? d.narration ?? "Transfer failed").replace(/\s+/g, " ").trim().slice(0, 200) };
  }
  return { state: "waiting", why: `status_${s.toLowerCase() || "unknown"}` };
}
