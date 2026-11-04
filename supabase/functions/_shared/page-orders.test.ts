// deno test supabase/functions/_shared/page-orders.test.ts
import { assert, assertEquals, assertRejects, assertThrows } from "jsr:@std/assert@1";
import { assertSafeWebhookUrl, decryptAnswers, encryptAnswers, escapeHtml, isPrivateIp, orderIdFromRef } from "./page-orders.ts";

const KEY = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
const ORDER = "6f1c2a7e-3b4d-4e5f-8a9b-0c1d2e3f4a5b";

Deno.test("answers round-trip through AES-256-GCM with a fresh IV", async () => {
  Deno.env.set("PAYMENT_PAGE_DATA_KEY", KEY);
  const answers = { passport: "X1234567", passengers: 2, bags: true, note: "<b>hi</b>" };
  const a = await encryptAnswers(answers, ORDER);
  const b = await encryptAnswers(answers, ORDER);
  assert(a !== b, "IV must be random per record");
  assert(!a.includes("X1234567"));
  assertEquals(await decryptAnswers(a, ORDER), answers);
});

Deno.test("ciphertext is bound to its order and key", async () => {
  Deno.env.set("PAYMENT_PAGE_DATA_KEY", KEY);
  const ct = await encryptAnswers({ x: 1 }, ORDER);
  await assertRejects(() => decryptAnswers(ct, "00000000-0000-4000-8000-000000000000"));
  Deno.env.set("PAYMENT_PAGE_DATA_KEY", btoa(String.fromCharCode(...new Uint8Array(32))));
  await assertRejects(() => decryptAnswers(ct, ORDER));
});

Deno.test("fails closed without a valid 32-byte key", async () => {
  Deno.env.delete("PAYMENT_PAGE_DATA_KEY");
  await assertRejects(() => encryptAnswers({}, ORDER));
  Deno.env.set("PAYMENT_PAGE_DATA_KEY", btoa("too short"));
  await assertRejects(() => encryptAnswers({}, ORDER));
});

Deno.test("SSRF guard accepts public https URLs", () => {
  assertEquals(assertSafeWebhookUrl("https://hooks.example.com/ifb").hostname, "hooks.example.com");
  assertSafeWebhookUrl("https://93.184.216.34/x");
});

Deno.test("SSRF guard rejects non-https, local and private targets", () => {
  for (const u of [
    "http://hooks.example.com/x",
    "ftp://example.com/",
    "https://localhost/x",
    "https://api.localhost/x",
    "https://metadata.google.internal/",
    "https://printer.local/",
    "https://127.0.0.1/",
    "https://2130706433/",          // 127.0.0.1 in decimal
    "https://0x7f000001/",
    "https://10.1.2.3/",
    "https://172.20.0.1/",
    "https://192.168.1.1/",
    "https://169.254.169.254/latest/meta-data",
    "https://100.64.0.1/",
    "https://0.0.0.0/",
    "https://[::1]/",
    "https://[fe80::1]/",
    "https://[fd00::1]/",
    "https://[::ffff:127.0.0.1]/",
    "https://[::ffff:a9fe:a9fe]/",
    "https://user:pass@example.com/",
    "https://intranet/",
    "not a url",
  ]) {
    assertThrows(() => assertSafeWebhookUrl(u), Error, undefined, u);
  }
});

Deno.test("isPrivateIp", () => {
  assert(isPrivateIp("10.0.0.1"));
  assert(isPrivateIp("::1"));
  assert(!isPrivateIp("8.8.8.8"));
  assert(!isPrivateIp("2606:4700::1111"));
});

Deno.test("escapeHtml and order refs", () => {
  assertEquals(escapeHtml(`<script>"x"&'y'</script>`), "&lt;script&gt;&quot;x&quot;&amp;&#39;y&#39;&lt;/script&gt;");
  assertEquals(orderIdFromRef(`IFBPG-${ORDER}`), ORDER);
  assertEquals(orderIdFromRef("IFB.COLLECT.x"), null);
  assertEquals(orderIdFromRef("IFBPG-not-a-uuid"), null);
});
