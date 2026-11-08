// Invoice validation and totals (pure; see invoice-math.test.ts). Money is in cents.
export interface InvoiceItem { description: string; quantity: number; unit_price_cents: number; amount_cents: number }
export interface InvoiceTotals { items: InvoiceItem[]; subtotal_cents: number; tax_rate: number; tax_cents: number; total_cents: number }

export class InvoiceInputError extends Error {}
const bad = (m: string): never => { throw new InvoiceInputError(m); };

export function normaliseInvoice(raw: unknown): { client_name: string; client_email: string; due_date: string | null; notes: string | null } & InvoiceTotals {
  if (typeof raw !== 'object' || raw === null) bad('Invoice details are required');
  const r = raw as Record<string, unknown>;
  const client_name = String(r.client_name ?? '').trim().replace(/\s+/g, ' ');
  if (!client_name || client_name.length > 120) bad("Enter the client's name");
  const client_email = String(r.client_email ?? '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(client_email) || client_email.length > 254) bad("Enter the client's email address");

  if (!Array.isArray(r.items) || r.items.length === 0) bad('Add at least one item');
  if ((r.items as unknown[]).length > 50) bad('An invoice can have up to 50 items');
  const items: InvoiceItem[] = (r.items as unknown[]).map((it, i) => {
    const o = (it ?? {}) as Record<string, unknown>;
    const description = String(o.description ?? '').trim();
    if (!description || description.length > 200) bad(`Item ${i + 1}: add a description`);
    const quantity = Number(o.quantity ?? 1);
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100000 || Math.round(quantity * 100) !== quantity * 100) bad(`Item ${i + 1}: check the quantity`);
    const unit = Number(o.unit_price);
    if (!Number.isFinite(unit) || unit <= 0 || unit > 1000000) bad(`Item ${i + 1}: check the price`);
    const unit_price_cents = Math.round(unit * 100);
    return { description, quantity, unit_price_cents, amount_cents: Math.round(unit_price_cents * quantity) };
  });

  const tax_rate = r.tax_rate === undefined || r.tax_rate === null || r.tax_rate === '' ? 0 : Number(r.tax_rate);
  if (!Number.isFinite(tax_rate) || tax_rate < 0 || tax_rate > 50) bad('Tax must be between 0% and 50%');
  const subtotal_cents = items.reduce((s, x) => s + x.amount_cents, 0);
  const tax_cents = Math.round(subtotal_cents * tax_rate / 100);
  const total_cents = subtotal_cents + tax_cents;
  if (total_cents < 100) bad('The invoice total must be at least $1.00');
  if (total_cents > 100_000_000) bad('The invoice total is too large');

  let due_date: string | null = null;
  if (r.due_date) {
    const s = String(r.due_date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(new Date(s + 'T00:00:00Z').getTime())) bad('Check the due date');
    due_date = s;
  }
  const notes = r.notes ? String(r.notes).trim().slice(0, 1000) || null : null;
  return { client_name, client_email, due_date, notes, items, subtotal_cents, tax_rate, tax_cents, total_cents };
}

export const money = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
