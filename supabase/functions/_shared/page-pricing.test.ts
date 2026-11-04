// deno test supabase/functions/_shared/page-pricing.test.ts
import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import { feeBps, priceOrder, validateAnswers, validatePageDefinition, ValidationError } from "./page-pricing.ts";

const travelFields = [
  { id: "passport", type: "text", label: "Passport number", required: true },
  { id: "travel_date", type: "date", label: "Travel date", required: true },
  { id: "cabin", type: "select", label: "Cabin class", required: true, options: [
    { value: "economy", label: "Economy", price_cents: 30000 },
    { value: "business", label: "Business", price_cents: 90000 },
  ] },
  { id: "bags", type: "checkbox", label: "Extra baggage", required: false, price_cents: 4000 },
  { id: "passengers", type: "number", label: "Passengers", required: true, min: 1, max: 9 },
];
const travelPricing = { mode: "fixed", base_cents: 0, quantity_field: "passengers", fee_bearer: "customer" };

Deno.test("travel agency: option price + add-on, times passengers, customer pays fee", () => {
  const { fields, pricing } = validatePageDefinition(travelFields, travelPricing);
  const answers = validateAnswers(fields, { passport: "A1234567", travel_date: "2026-12-20", cabin: "business", bags: true, passengers: 2 });
  const q = priceOrder(fields, pricing, answers, undefined, 150);
  assertEquals(q.subtotal_cents, (90000 + 4000) * 2);
  assertEquals(q.fee_cents, 2820);
  assertEquals(q.total_cents, 188000 + 2820);
  assertEquals(q.merchant_net_cents, 188000);
});

Deno.test("merchant-borne fee is taken from the net", () => {
  const { fields, pricing } = validatePageDefinition(travelFields, { ...travelPricing, fee_bearer: "merchant" });
  const answers = validateAnswers(fields, { passport: "X", travel_date: "2026-01-31", cabin: "economy", passengers: 1 });
  const q = priceOrder(fields, pricing, answers, undefined, 150);
  assertEquals(q.total_cents, 30000);
  assertEquals(q.merchant_net_cents, 30000 - 450);
});

Deno.test("customer cannot pick an option that does not exist", () => {
  const { fields } = validatePageDefinition(travelFields, travelPricing);
  assertThrows(() => validateAnswers(fields, { passport: "X", travel_date: "2026-01-31", cabin: "first", passengers: 1 }), ValidationError);
});

Deno.test("quantity is bounded by the field and by the pricing limit", () => {
  const { fields, pricing } = validatePageDefinition(travelFields, travelPricing);
  assertThrows(() => validateAnswers(fields, { passport: "X", travel_date: "2026-01-31", cabin: "economy", passengers: 0 }), ValidationError);
  assertThrows(() => validateAnswers(fields, { passport: "X", travel_date: "2026-01-31", cabin: "economy", passengers: 1.5 }), ValidationError);
  const loose = validatePageDefinition(
    [{ id: "qty", type: "number", label: "Qty", required: true }, { id: "s", type: "select", label: "S", required: true, options: [{ value: "a", label: "A", price_cents: 100 }] }],
    { mode: "fixed", base_cents: 0, quantity_field: "qty", fee_bearer: "merchant" },
  );
  const a = validateAnswers(loose.fields, { qty: -3, s: "a" });
  assertThrows(() => priceOrder(loose.fields, loose.pricing, a, undefined, 150), ValidationError);
});

Deno.test("invalid dates are rejected", () => {
  const { fields } = validatePageDefinition(travelFields, travelPricing);
  assertThrows(() => validateAnswers(fields, { passport: "X", travel_date: "2026-02-30", cabin: "economy", passengers: 1 }), ValidationError);
});

Deno.test("customer_amount respects min and max and ignores browser totals", () => {
  const { fields, pricing } = validatePageDefinition([], { mode: "customer_amount", base_cents: 0, fee_bearer: "merchant", customer_amount: { min_cents: 500, max_cents: 100000 } });
  assertThrows(() => priceOrder(fields, pricing, {}, 499, 150), ValidationError);
  assertThrows(() => priceOrder(fields, pricing, {}, 100001, 150), ValidationError);
  assertThrows(() => priceOrder(fields, pricing, {}, "5000", 150), ValidationError);
  assertEquals(priceOrder(fields, pricing, {}, 5000, 150).total_cents, 5000);
});

Deno.test("page definition rejects negative or fractional prices and reserved ids", () => {
  assertThrows(() => validatePageDefinition([{ id: "s", type: "select", label: "S", required: true, options: [{ value: "a", label: "A", price_cents: -100 }] }], travelPricing), ValidationError);
  assertThrows(() => validatePageDefinition([{ id: "s", type: "checkbox", label: "S", required: false, price_cents: 1.5 }], { ...travelPricing, quantity_field: undefined }), ValidationError);
  assertThrows(() => validatePageDefinition([{ id: "email", type: "text", label: "E", required: true }], { mode: "fixed", base_cents: 100, fee_bearer: "merchant" }), ValidationError);
  assertThrows(() => validatePageDefinition([], { mode: "fixed", base_cents: 0, fee_bearer: "merchant" }), ValidationError);
});

Deno.test("unknown answer keys are dropped", () => {
  const { fields } = validatePageDefinition(travelFields, travelPricing);
  const a = validateAnswers(fields, { passport: "X", travel_date: "2026-01-31", cabin: "economy", passengers: 1, total_cents: 1, __proto__: { x: 1 } });
  assertEquals(Object.keys(a).sort(), ["bags", "cabin", "passengers", "passport", "travel_date"]);
});

Deno.test("fee setting is validated", () => {
  assertEquals(feeBps(undefined), 150);
  assertEquals(feeBps("0"), 0);
  assertThrows(() => feeBps("5000"));
  assertThrows(() => feeBps("abc"));
});
