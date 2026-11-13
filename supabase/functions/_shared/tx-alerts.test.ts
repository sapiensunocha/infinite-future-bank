import { assert, assertEquals } from "jsr:@std/assert@1";
import { alertText, kindLabel, signedUsd, validSubscription } from "./tx-alerts.ts";

Deno.test("signedUsd", () => {
  assertEquals(signedUsd(12.5), "+$12.50");
  assertEquals(signedUsd("-1234.5"), "-$1,234.50");
  assertEquals(signedUsd("abc"), "$0.00");
});
Deno.test("kindLabel", () => {
  assertEquals(kindLabel("stripe_deposit"), "Card deposit");
  assertEquals(kindLabel("npo_donation"), "Npo donation");
  assertEquals(kindLabel(null), "Transaction");
});
Deno.test("alertText", () => {
  const t = alertText({ amount: -1.99, transaction_type: "withdrawal", description: "  Bank   payout ", created_at: "2026-11-13T10:45:21Z" });
  assertEquals(t.title, "Money left your IFB account");
  assertEquals(t.amount, "-$1.99");
  assertEquals(t.detail, "Bank payout");
  assertEquals(t.when, "2026-11-13 10:45 UTC");
  assertEquals(alertText({ amount: 2 }).title, "Money added to your IFB account");
});
Deno.test("validSubscription", () => {
  const keys = { p256dh: "B".repeat(87), auth: "a".repeat(22) };
  assert(validSubscription({ endpoint: "https://fcm.googleapis.com/fcm/send/x", keys }));
  assert(!validSubscription({ endpoint: "http://fcm.googleapis.com/x", keys }));
  assert(!validSubscription({ endpoint: "https://x.test/y", keys: { p256dh: "short", auth: "a".repeat(22) } }));
  assert(!validSubscription(null));
});
