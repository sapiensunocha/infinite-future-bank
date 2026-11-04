// Payment Pages: page validation, answer validation and server-side pricing.
// This is the ONLY place an order's amount is computed. See docs/payment-pages.md.
// Pure functions (no I/O) so they can be unit-tested with `deno test`.

export type FieldType =
  | "text" | "textarea" | "email" | "phone" | "number" | "date" | "select" | "checkbox";

export interface FieldOption { value: string; label: string; price_cents?: number }

export interface PageField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  help?: string;
  options?: FieldOption[];
  price_cents?: number; // checkbox add-on
  min?: number;
  max?: number;
}

export interface PagePricing {
  mode: "fixed" | "customer_amount";
  base_cents: number;
  quantity_field?: string;
  customer_amount?: { min_cents: number; max_cents: number };
  fee_bearer: "merchant" | "customer";
}

export interface LineItem { label: string; unit_cents: number; quantity: number; total_cents: number }

export interface Quote {
  line_items: LineItem[];
  subtotal_cents: number;
  fee_cents: number;
  total_cents: number;
  merchant_net_cents: number;
  currency: "USD";
}

export class ValidationError extends Error {}

export const MIN_TOTAL_CENTS = 100;            // $1
export const MAX_TOTAL_CENTS = 100_000_000;    // $1,000,000
export const MAX_FIELDS = 30;
export const MAX_OPTIONS = 50;
export const MAX_QUANTITY = 100;
const MAX_PRICE_CENTS = MAX_TOTAL_CENTS;

const FIELD_TYPES: FieldType[] = ["text", "textarea", "email", "phone", "number", "date", "select", "checkbox"];
const FIELD_ID_RE = /^[a-z][a-z0-9_]{0,39}$/;
const OPTION_VALUE_RE = /^[a-z0-9_-]{1,40}$/;
const RESERVED_IDS = new Set(["email", "name", "amount"]);
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9 ()-]{6,20}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function fail(msg: string): never { throw new ValidationError(msg); }

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function cents(x: unknown, what: string, max = MAX_PRICE_CENTS): number {
  if (typeof x !== "number" || !Number.isInteger(x) || x < 0 || x > max) {
    fail(`${what} must be a whole number of cents between 0 and ${max}`);
  }
  return x;
}

function str(x: unknown, what: string, maxLen: number, required = true): string | undefined {
  if (x === undefined || x === null || x === "") {
    if (required) fail(`${what} is required`);
    return undefined;
  }
  if (typeof x !== "string") fail(`${what} must be text`);
  const s = x.trim();
  if (required && !s) fail(`${what} is required`);
  if (s.length > maxLen) fail(`${what} must be at most ${maxLen} characters`);
  return s;
}

/** Validates and normalises a merchant's page definition. Returns clean copies (unknown keys dropped). */
export function validatePageDefinition(rawFields: unknown, rawPricing: unknown): { fields: PageField[]; pricing: PagePricing } {
  if (!Array.isArray(rawFields)) fail("fields must be a list");
  if (rawFields.length > MAX_FIELDS) fail(`A page can have at most ${MAX_FIELDS} fields`);

  const seen = new Set<string>();
  const fields: PageField[] = rawFields.map((raw, i) => {
    if (!isPlainObject(raw)) fail(`Field ${i + 1} is invalid`);
    const id = raw.id;
    if (typeof id !== "string" || !FIELD_ID_RE.test(id)) fail(`Field ${i + 1}: id must be lowercase letters, digits or _`);
    if (RESERVED_IDS.has(id)) fail(`Field id "${id}" is reserved`);
    if (seen.has(id)) fail(`Field id "${id}" is used twice`);
    seen.add(id);

    const type = raw.type as FieldType;
    if (!FIELD_TYPES.includes(type)) fail(`Field "${id}": unknown type`);

    const field: PageField = {
      id,
      type,
      label: str(raw.label, `Field "${id}" label`, 120)!,
      required: raw.required === true,
    };
    const placeholder = str(raw.placeholder, `Field "${id}" placeholder`, 120, false);
    if (placeholder) field.placeholder = placeholder;
    const help = str(raw.help, `Field "${id}" help`, 200, false);
    if (help) field.help = help;

    if (type === "select") {
      if (!Array.isArray(raw.options) || raw.options.length < 1 || raw.options.length > MAX_OPTIONS) {
        fail(`Field "${id}" needs 1-${MAX_OPTIONS} options`);
      }
      const values = new Set<string>();
      field.options = raw.options.map((o, j) => {
        if (!isPlainObject(o)) fail(`Field "${id}" option ${j + 1} is invalid`);
        if (typeof o.value !== "string" || !OPTION_VALUE_RE.test(o.value)) fail(`Field "${id}" option ${j + 1}: invalid value`);
        if (values.has(o.value)) fail(`Field "${id}": option "${o.value}" is used twice`);
        values.add(o.value);
        const opt: FieldOption = { value: o.value, label: str(o.label, `Field "${id}" option label`, 120)! };
        if (o.price_cents !== undefined) opt.price_cents = cents(o.price_cents, `Field "${id}" option price`);
        return opt;
      });
    }
    if (type === "checkbox" && raw.price_cents !== undefined) {
      field.price_cents = cents(raw.price_cents, `Field "${id}" add-on price`);
    }
    if (type === "number") {
      for (const k of ["min", "max"] as const) {
        if (raw[k] !== undefined) {
          if (typeof raw[k] !== "number" || !Number.isInteger(raw[k])) fail(`Field "${id}" ${k} must be a whole number`);
          field[k] = raw[k] as number;
        }
      }
      if (field.min !== undefined && field.max !== undefined && field.min > field.max) fail(`Field "${id}": min is above max`);
    }
    return field;
  });

  if (!isPlainObject(rawPricing)) fail("pricing is required");
  const mode = rawPricing.mode;
  if (mode !== "fixed" && mode !== "customer_amount") fail("pricing.mode must be fixed or customer_amount");
  const fee_bearer = rawPricing.fee_bearer;
  if (fee_bearer !== "merchant" && fee_bearer !== "customer") fail("pricing.fee_bearer must be merchant or customer");

  const pricing: PagePricing = { mode, base_cents: cents(rawPricing.base_cents ?? 0, "Base price"), fee_bearer };

  if (rawPricing.quantity_field !== undefined && rawPricing.quantity_field !== null && rawPricing.quantity_field !== "") {
    const q = fields.find((f) => f.id === rawPricing.quantity_field);
    if (!q || q.type !== "number") fail("pricing.quantity_field must name a number field");
    if (!q.required) fail("The quantity field must be required");
    pricing.quantity_field = q.id;
  }

  if (mode === "customer_amount") {
    const ca = rawPricing.customer_amount;
    if (!isPlainObject(ca)) fail("pricing.customer_amount is required for customer_amount pages");
    const min_cents = cents(ca.min_cents, "Minimum amount");
    const max_cents = cents(ca.max_cents, "Maximum amount");
    if (min_cents < MIN_TOTAL_CENTS) fail("Minimum amount must be at least $1");
    if (min_cents > max_cents) fail("Minimum amount is above the maximum");
    pricing.customer_amount = { min_cents, max_cents };
    if (pricing.quantity_field) fail("customer_amount pages cannot use a quantity field");
  } else {
    const hasPrice = pricing.base_cents > 0 ||
      fields.some((f) => (f.price_cents ?? 0) > 0 || (f.options ?? []).some((o) => (o.price_cents ?? 0) > 0));
    if (!hasPrice) fail("A fixed-price page needs a base price or priced options");
  }

  return { fields, pricing };
}

/** Validates a customer's answers against the page. Returns the clean answers (only known field ids). */
export function validateAnswers(fields: PageField[], rawAnswers: unknown): Record<string, string | number | boolean> {
  if (rawAnswers !== undefined && !isPlainObject(rawAnswers)) fail("answers must be an object");
  const answers = (rawAnswers ?? {}) as Record<string, unknown>;
  const out: Record<string, string | number | boolean> = {};

  for (const f of fields) {
    const v = answers[f.id];
    const empty = v === undefined || v === null || v === "" || (f.type === "checkbox" && v === false);
    if (empty) {
      if (f.required) fail(`"${f.label}" is required`);
      if (f.type === "checkbox") out[f.id] = false;
      continue;
    }
    switch (f.type) {
      case "text": case "textarea": {
        out[f.id] = str(v, `"${f.label}"`, f.type === "textarea" ? 2000 : 200)!;
        break;
      }
      case "email": {
        const s = str(v, `"${f.label}"`, 254)!;
        if (!EMAIL_RE.test(s)) fail(`"${f.label}" is not a valid email`);
        out[f.id] = s.toLowerCase();
        break;
      }
      case "phone": {
        const s = str(v, `"${f.label}"`, 20)!;
        if (!PHONE_RE.test(s)) fail(`"${f.label}" is not a valid phone number`);
        out[f.id] = s;
        break;
      }
      case "date": {
        const s = str(v, `"${f.label}"`, 10)!;
        const d = new Date(`${s}T00:00:00Z`);
        if (!DATE_RE.test(s) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) {
          fail(`"${f.label}" must be a date (YYYY-MM-DD)`);
        }
        out[f.id] = s;
        break;
      }
      case "number": {
        const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
        if (typeof n !== "number" || !Number.isInteger(n)) fail(`"${f.label}" must be a whole number`);
        if (f.min !== undefined && n < f.min) fail(`"${f.label}" must be at least ${f.min}`);
        if (f.max !== undefined && n > f.max) fail(`"${f.label}" must be at most ${f.max}`);
        out[f.id] = n;
        break;
      }
      case "select": {
        if (typeof v !== "string" || !(f.options ?? []).some((o) => o.value === v)) fail(`Choose a valid option for "${f.label}"`);
        out[f.id] = v;
        break;
      }
      case "checkbox": {
        if (v !== true) fail(`"${f.label}" must be true or false`);
        out[f.id] = true;
        break;
      }
    }
  }
  return out;
}

/** Fee in basis points from the environment value (default 150 = 1.5%, capped at 10%). */
export function feeBps(envValue: string | undefined): number {
  const n = envValue === undefined || envValue === "" ? 150 : Number(envValue);
  if (!Number.isInteger(n) || n < 0 || n > 1000) throw new Error("PAGE_FEE_BPS must be an integer between 0 and 1000");
  return n;
}

/** Prices an order. `answers` must already be the output of validateAnswers. */
export function priceOrder(
  fields: PageField[],
  pricing: PagePricing,
  answers: Record<string, string | number | boolean>,
  amountCents: unknown,
  bps: number,
): Quote {
  const items: LineItem[] = [];
  let unit = 0;

  if (pricing.mode === "customer_amount") {
    const ca = pricing.customer_amount!;
    if (typeof amountCents !== "number" || !Number.isInteger(amountCents)) fail("Enter an amount");
    if (amountCents < ca.min_cents || amountCents > ca.max_cents) {
      fail(`Amount must be between $${(ca.min_cents / 100).toFixed(2)} and $${(ca.max_cents / 100).toFixed(2)}`);
    }
    unit += amountCents;
    items.push({ label: "Amount", unit_cents: amountCents, quantity: 1, total_cents: amountCents });
  } else if (pricing.base_cents > 0) {
    unit += pricing.base_cents;
    items.push({ label: "Base price", unit_cents: pricing.base_cents, quantity: 1, total_cents: pricing.base_cents });
  }

  for (const f of fields) {
    if (f.type === "select") {
      const opt = (f.options ?? []).find((o) => o.value === answers[f.id]);
      if (opt && (opt.price_cents ?? 0) > 0) {
        unit += opt.price_cents!;
        items.push({ label: `${f.label}: ${opt.label}`, unit_cents: opt.price_cents!, quantity: 1, total_cents: opt.price_cents! });
      }
    } else if (f.type === "checkbox" && answers[f.id] === true && (f.price_cents ?? 0) > 0) {
      unit += f.price_cents!;
      items.push({ label: f.label, unit_cents: f.price_cents!, quantity: 1, total_cents: f.price_cents! });
    }
  }

  let quantity = 1;
  if (pricing.quantity_field) {
    const q = answers[pricing.quantity_field];
    if (typeof q !== "number" || !Number.isInteger(q) || q < 1 || q > MAX_QUANTITY) fail(`Quantity must be between 1 and ${MAX_QUANTITY}`);
    quantity = q;
    for (const it of items) { it.quantity = quantity; it.total_cents = it.unit_cents * quantity; }
  }

  const subtotal = unit * quantity;
  if (!Number.isSafeInteger(subtotal)) fail("Order total is too large");
  const fee = Math.round((subtotal * bps) / 10_000);
  const total = pricing.fee_bearer === "customer" ? subtotal + fee : subtotal;
  const net = pricing.fee_bearer === "customer" ? subtotal : subtotal - fee;

  if (total < MIN_TOTAL_CENTS) fail("Order total must be at least $1");
  if (total > MAX_TOTAL_CENTS) fail("Order total is above the $1,000,000 limit");
  if (net <= 0) fail("Order total is too small after fees");

  if (pricing.fee_bearer === "customer" && fee > 0) {
    items.push({ label: "Processing fee", unit_cents: fee, quantity: 1, total_cents: fee });
  }

  return { line_items: items, subtotal_cents: subtotal, fee_cents: fee, total_cents: total, merchant_net_cents: net, currency: "USD" };
}
