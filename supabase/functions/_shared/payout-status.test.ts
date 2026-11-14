import { assertEquals } from "jsr:@std/assert@1";
import { payoutOutcome } from "./payout-status.ts";

const ref = "IFB-BANK-abc";
const ok = (data: Record<string, unknown>) => ({ status: "success", data: { reference: ref, ...data } });

Deno.test("successful transfer completes the order", () => {
  assertEquals(payoutOutcome(200, ok({ status: "SUCCESSFUL" }), ref), { state: "completed" });
});
Deno.test("failed transfer is refunded with Flutterwave's reason", () => {
  assertEquals(payoutOutcome(200, ok({ status: "FAILED", complete_message: "DISBURSE FAILED: Insufficient funds in customer wallet" }), ref),
    { state: "failed", reason: "DISBURSE FAILED: Insufficient funds in customer wallet" });
});
Deno.test("pending, new or unknown statuses wait", () => {
  assertEquals(payoutOutcome(200, ok({ status: "PENDING" }), ref).state, "waiting");
  assertEquals(payoutOutcome(200, ok({ status: "NEW" }), ref).state, "waiting");
  assertEquals(payoutOutcome(200, ok({}), ref).state, "waiting");
});
Deno.test("lookup errors never refund or complete", () => {
  assertEquals(payoutOutcome(404, null, ref).state, "waiting");
  assertEquals(payoutOutcome(401, { status: "error", message: "Unauthorized" }, ref).state, "waiting");
  assertEquals(payoutOutcome(200, { status: "error" }, ref).state, "waiting");
});
Deno.test("a transfer with another reference is never acted on", () => {
  assertEquals(payoutOutcome(200, { status: "success", data: { reference: "IFB-BANK-other", status: "FAILED" } }, ref).state, "waiting");
});
