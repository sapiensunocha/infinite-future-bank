import React from 'react';
import { formatCents } from './paymentPagesApi';

// Renders a Payment Page's custom fields (docs/payment-pages.md "Field schema").
// Shared by the merchant's live preview and the public /p/:slug page.
// Prices shown next to options are informational; the server computes the charge.

const inputCls = 'w-full p-4 rounded-xl border border-slate-200 bg-white font-bold text-sm text-slate-800 outline-none focus:border-blue-500 transition-colors disabled:opacity-60';

const MAX_LEN = { textarea: 2000, email: 254, phone: 20, date: 10 };

const Label = ({ htmlFor, field }) => (
  <label htmlFor={htmlFor} className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
    {field.label}
    {field.required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
    {field.required && <span className="sr-only"> (required)</span>}
  </label>
);

export default function PaymentFormRenderer({ fields = [], values = {}, onChange, disabled = false, idPrefix = 'pf', currency = 'USD' }) {
  const set = (id, v) => { if (onChange) onChange(id, v); };

  if (!fields.length) return null;

  return (
    <div className="space-y-5">
      {fields.map((field) => {
        const domId = `${idPrefix}-${field.id}`;
        const helpId = field.help ? `${domId}-help` : undefined;
        const value = values[field.id];
        const help = field.help ? <p id={helpId} className="text-[11px] text-slate-400 font-medium mt-1.5">{field.help}</p> : null;

        if (field.type === 'checkbox') {
          const price = Number(field.price_cents) > 0 ? ` (+${formatCents(field.price_cents, currency)})` : '';
          return (
            <div key={field.id}>
              <label htmlFor={domId} className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-white cursor-pointer hover:border-blue-300 transition-colors">
                <input
                  id={domId}
                  type="checkbox"
                  checked={value === true}
                  disabled={disabled}
                  required={field.required}
                  aria-describedby={helpId}
                  onChange={(e) => set(field.id, e.target.checked)}
                  className="mt-0.5 w-5 h-5 accent-blue-600 shrink-0"
                />
                <span className="text-sm font-bold text-slate-700">
                  {field.label}{price && <span className="text-blue-600">{price}</span>}
                  {field.required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
                </span>
              </label>
              {help}
            </div>
          );
        }

        if (field.type === 'select') {
          return (
            <div key={field.id}>
              <Label htmlFor={domId} field={field} />
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
                {(field.options || []).map((o) => (
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
              <Label htmlFor={domId} field={field} />
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
            <Label htmlFor={domId} field={field} />
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
