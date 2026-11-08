// deno test supabase/functions/_shared/invoice-math.test.ts
import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import { InvoiceInputError, money, normaliseInvoice } from "./invoice-math.ts";

const base = { client_name: " Acme  Ltd ", client_email: "Billing@Acme.com", items: [{ description: "Logo design", quantity: 1, unit_price: 400 }] };

Deno.test("totals in cents, tax rounded", () => {
  const r = normaliseInvoice({ ...base, items: [{ description: "Hours", quantity: 2.5, unit_price: 19.99 }, { description: "Fee", unit_price: 0.33 }], tax_rate: 7.5 });
  assertEquals(r.subtotal_cents, 4998 + 33);           // 2.5 × 1999 = 4997.5 → 4998; + 33
  assertEquals(r.tax_cents, Math.round(5031 * 0.075)); // 377
  assertEquals(r.total_cents, 5031 + 377);
  assertEquals(r.client_name, "Acme Ltd");
  assertEquals(r.client_email, "billing@acme.com");
});
Deno.test("rejects bad input", () => {
  assertThrows(() => normaliseInvoice({ ...base, client_email: "nope" }), InvoiceInputError);
  assertThrows(() => normaliseInvoice({ ...base, items: [] }), InvoiceInputError);
  assertThrows(() => normaliseInvoice({ ...base, items: [{ description: "", unit_price: 5 }] }), InvoiceInputError);
  assertThrows(() => normaliseInvoice({ ...base, items: [{ description: "x", unit_price: -5 }] }), InvoiceInputError);
  assertThrows(() => normaliseInvoice({ ...base, items: [{ description: "x", unit_price: 0.5 }] }), InvoiceInputError, "at least $1.00");
  assertThrows(() => normaliseInvoice({ ...base, tax_rate: 80 }), InvoiceInputError);
  assertThrows(() => normaliseInvoice({ ...base, due_date: "31/12/2026" }), InvoiceInputError);
  assertThrows(() => normaliseInvoice({ ...base, items: Array.from({ length: 51 }, () => ({ description: "x", unit_price: 1 })) }), InvoiceInputError);
});
Deno.test("money format", () => { assertEquals(money(123456), "$1,234.56"); });
