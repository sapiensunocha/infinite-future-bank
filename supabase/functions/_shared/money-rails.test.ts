// deno test supabase/functions/_shared/money-rails.test.ts
import { assert, assertEquals } from "jsr:@std/assert@1";
import {
  cardBrand, instantRef, isInstantRef, luhnValid, parseExpiry, parseSmileResult, smileSignature,
} from "./money-rails.ts";

Deno.test("instant refs", () => {
  const id = "123e4567-e89b-12d3-a456-426614174000";
  assertEquals(instantRef(id), `IFB.INSTANT.${id}`);
  assert(isInstantRef(instantRef(id)));
  assert(!isInstantRef(`IFB.COLLECT.${id}.123`));
  assert(!isInstantRef(`IFB.INSTANT.${id}x`));
  assert(!isInstantRef(null));
});

Deno.test("luhn", () => {
  assert(luhnValid("4242424242424242"));
  assert(luhnValid("5555555555554444"));
  assert(!luhnValid("4242424242424241"));
  assert(!luhnValid("1234"));
  assert(!luhnValid("42424242424242a2"));
});

Deno.test("brands", () => {
  assertEquals(cardBrand("4242424242424242"), "Visa");
  assertEquals(cardBrand("5555555555554444"), "Mastercard");
  assertEquals(cardBrand("2221000000000009"), "Mastercard");
  assertEquals(cardBrand("5061000000000000000"), "Verve");
  assertEquals(cardBrand("9999999999999995"), "Card");
});

Deno.test("expiry", () => {
  const now = new Date(Date.UTC(2026, 10, 8)); // 8 Nov 2026
  assertEquals(parseExpiry(12, 29, now), { month: 12, year: 2029 });
  assertEquals(parseExpiry(11, 2026, now), { month: 11, year: 2026 }); // valid through end of Nov
  assertEquals(parseExpiry(10, 2026, now), null);                     // expired
  assertEquals(parseExpiry(13, 2030, now), null);
  assertEquals(parseExpiry("ab", 2030, now), null);
});

Deno.test("smile signature is base64 HMAC-SHA256 of timestamp+partner+sid_request", async () => {
  const sig = await smileSignature("key", "123", "2026-11-08T00:00:00.000Z");
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode("key"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const raw = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode("2026-11-08T00:00:00.000Z123sid_request")));
  assertEquals(sig, btoa(String.fromCharCode(...raw)));
});

Deno.test("smile result parsing", () => {
  const ok = parseSmileResult({ ResultCode: "1012", ResultText: "ID Number Validated", Actions: { Verify_ID_Number: "Verified", Names: "Exact Match", DOB: "Exact Match" } });
  assert(ok.verified);
  const wrongName = parseSmileResult({ ResultCode: "1012", Actions: { Verify_ID_Number: "Verified", Names: "No Match" } });
  assert(!wrongName.verified, "someone else's ID number must not verify");
  const invalid = parseSmileResult({ ResultCode: "1013", ResultText: "Invalid ID", Actions: { Verify_ID_Number: "Not Verified" } });
  assert(!invalid.verified);
  assert(!parseSmileResult(null).verified);
});
