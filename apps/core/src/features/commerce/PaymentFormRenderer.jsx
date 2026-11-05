import React from 'react';
import { Check } from 'lucide-react';
import { formatCents } from './paymentPagesApi';

// Renders a Payment Page's custom fields (docs/payment-pages.md "Field schema").
// Shared by the merchant's live preview and the public /p/:slug page.
// Prices shown next to options are informational; the server computes the charge.
// The accent colour comes from the CSS variable --brand set by the parent.

export const inputCls =
  'w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-base text-slate-900 placeholder:text-slate-400 ' +
  'outline-none transition focus:border-[var(--brand,#2563eb)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--brand,#2563eb)_15%,transparent)] ' +
  'disabled:opacity-60 disabled:bg-slate-50';

const MAX_LEN = { textarea: 2000, email: 254, phone: 20, date: 10 };
const MAX_CARD_OPTIONS = 6; // priced choices up to this count render as tappable cards

export const FieldLabel = ({ htmlFor, label, required, as: Tag = 'label' }) => (
  <Tag {...(Tag === 'label' ? { htmlFor } : {})} className="block text-sm font-semibold text-slate-700 mb-1.5">
    {label}
    {required ? <span className="text-red-500 ml-0.5" aria-hidden="true">*</span> : <span className="text-slate-400 font-normal ml-1">(optional)</span>}
    {required && <span className="sr-only"> (required)</span>}
  </Tag>
);

const priceTag = (cents, currency) => (Number(cents) > 0 ? `+${formatCents(cents, currency)}` : null);

function OptionCards({ field, domId, value, disabled, helpId, onPick, currency }) {
  return (
    <fieldset aria-describedby={helpId}>
      <FieldLabel as="legend" label={field.label} required={field.required} />
      {/* auto-fit: two columns only when the container (not the viewport) has room */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(13rem,1fr))] gap-2.5">
        {(field.options || []).map((o, i) => {
          const selected = value === o.value;
          const price = priceTag(o.price_cents, currency);
          return (
            <label
              key={o.value}
              htmlFor={`${domId}-${o.value}`}
              className={`relative flex items-center justify-between gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition ${
                selected
                  ? 'border-[var(--brand,#2563eb)] bg-[color-mix(in_srgb,var(--brand,#2563eb)_6%,white)]'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <input
                id={`${domId}-${o.value}`}
                type="radio"
                name={domId}
                value={o.value}
                checked={selected}
                disabled={disabled}
                required={field.required && i === 0}
                onChange={() => onPick(o.value)}
                className="sr-only"
              />
              <span className="flex items-center gap-2.5 min-w-0">
                <span className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center ${selected ? 'border-[var(--brand,#2563eb)] bg-[var(--brand,#2563eb)]' : 'border-slate-300'}`}>
                  {selected && <Check size={12} className="text-white" strokeWidth={3} />}
                </span>
                <span className="text-[15px] font-medium text-slate-800 break-words">{o.label}</span>
              </span>
              {price && <span className="text-sm font-semibold text-slate-600 shrink-0">{price}</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function PaymentFormRenderer({ fields = [], values = {}, onChange, disabled = false, idPrefix = 'pf', currency = 'USD' }) {
  const set = (id, v) => { if (onChange) onChange(id, v); };

  if (!fields.length) return null;

  return (
    <div className="space-y-5">
      {fields.map((field) => {
        const domId = `${idPrefix}-${field.id}`;
        const helpId = field.help ? `${domId}-help` : undefined;
        const value = values[field.id];
        const help = field.help ? <p id={helpId} className="text-[13px] text-slate-500 mt-1.5">{field.help}</p> : null;

        if (field.type === 'checkbox') {
          const price = priceTag(field.price_cents, currency);
          const checked = value === true;
          return (
            <div key={field.id}>
              <label
                htmlFor={domId}
                className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition ${
                  checked ? 'border-[var(--brand,#2563eb)] bg-[color-mix(in_srgb,var(--brand,#2563eb)_6%,white)]' : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <span className="flex items-center gap-3">
                  <input
                    id={domId}
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    required={field.required}
                    aria-describedby={helpId}
                    onChange={(e) => set(field.id, e.target.checked)}
                    className="w-5 h-5 shrink-0 accent-[var(--brand,#2563eb)]"
                  />
                  <span className="text-[15px] font-medium text-slate-800">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
                  </span>
                </span>
                {price && <span className="text-sm font-semibold text-slate-600 shrink-0">{price}</span>}
              </label>
              {help}
            </div>
          );
        }

        if (field.type === 'select') {
          const opts = field.options || [];
          const priced = opts.some((o) => Number(o.price_cents) > 0);
          if (priced && opts.length <= MAX_CARD_OPTIONS) {
            return (
              <div key={field.id}>
                <OptionCards field={field} domId={domId} value={value} disabled={disabled} helpId={helpId} currency={currency} onPick={(v) => set(field.id, v)} />
                {help}
              </div>
            );
          }
          return (
            <div key={field.id}>
              <FieldLabel htmlFor={domId} label={field.label} required={field.required} />
              <select
                id={domId}
                value={value ?? ''}
                disabled={disabled}
                required={field.required}
                aria-describedby={helpId}
                onChange={(e) => set(field.id, e.target.value)}
                className={inputCls}
              >
                <option value="">{field.placeholder || 'Select an option'}</option>
                {opts.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}{Number(o.price_cents) > 0 ? ` (+${formatCents(o.price_cents, currency)})` : ''}
                  </option>
                ))}
              </select>
              {help}
            </div>
          );
        }

        if (field.type === 'textarea') {
          return (
            <div key={field.id}>
              <FieldLabel htmlFor={domId} label={field.label} required={field.required} />
              <textarea
                id={domId}
                rows={3}
                value={value ?? ''}
                disabled={disabled}
                required={field.required}
                maxLength={MAX_LEN.textarea}
                placeholder={field.placeholder || ''}
                aria-describedby={helpId}
                onChange={(e) => set(field.id, e.target.value)}
                className={`${inputCls} resize-y`}
              />
              {help}
            </div>
          );
        }

        const typeMap = { text: 'text', email: 'email', phone: 'tel', number: 'number', date: 'date' };
        const extra = {};
        if (field.type === 'number') {
          extra.step = 1;
          extra.inputMode = 'numeric';
          if (Number.isInteger(field.min)) extra.min = field.min;
          if (Number.isInteger(field.max)) extra.max = field.max;
        }
        if (field.type === 'phone') { extra.inputMode = 'tel'; extra.autoComplete = 'tel'; }
        if (field.type === 'email') { extra.autoComplete = 'email'; }

        return (
          <div key={field.id}>
            <FieldLabel htmlFor={domId} label={field.label} required={field.required} />
            <input
              id={domId}
              type={typeMap[field.type] || 'text'}
              value={value ?? ''}
              disabled={disabled}
              required={field.required}
              maxLength={field.type === 'number' ? undefined : (MAX_LEN[field.type] || 200)}
              placeholder={field.placeholder || ''}
              aria-describedby={helpId}
              onChange={(e) => set(field.id, e.target.value)}
              className={inputCls}
              {...extra}
            />
            {help}
          </div>
        );
      })}
    </div>
  );
}
