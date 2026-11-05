import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import QRCode from 'react-qr-code';
import {
  Link2, Plus, X, Loader2, Copy, ExternalLink, Power, Pencil, ListOrdered, ShieldCheck,
  ArrowUp, ArrowDown, Trash2, ArrowLeft, Download, ChevronRight, KeyRound,
  AlertTriangle, Plane, CalendarDays, HeartHandshake, Eye, Save, RefreshCw, Share2, MessageCircle,
  Mail, Wallet, ReceiptText, Check
} from 'lucide-react';
import { APP_URL } from '../../config/constants';
import PaymentFormRenderer from './PaymentFormRenderer';
import { callPaymentPages, formatCents, safeHttpsUrl, initialAnswers, safeBrandColor, onBrandColor, initialsOf, DEFAULT_BRAND } from './paymentPagesApi';

// Merchant side of Payment Pages (docs/payment-pages.md).
// Every write goes through the `payment-pages` edge function; the server re-validates everything.

const FIELD_TYPES = [
  { value: 'text', label: 'Short text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox / add-on' },
];
const RESERVED_IDS = new Set(['email', 'name', 'amount']);
const MAX_FIELDS = 30;
const MAX_OPTIONS = 50;
const MAX_TOTAL_CENTS = 100000000;
const KYC_OK = ['verified', 'approved'];
const KYC_MESSAGE = 'Identity verification required. Complete KYC verification in your profile before publishing payment pages.';
const ORDER_STATUSES = ['all', 'pending', 'paid', 'failed', 'expired'];

const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-base sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition disabled:bg-slate-50 disabled:opacity-70';
const labelCls = 'block text-sm font-semibold text-slate-700 mb-1.5';
const BRAND_SWATCHES = ['#2563eb', '#0f766e', '#7c3aed', '#db2777', '#ea580c', '#0f172a'];

let uidCounter = 0;
const uid = () => `k${Date.now().toString(36)}${(uidCounter++).toString(36)}`;

const pageUrl = (slug) => `${APP_URL}/p/${slug}`;

// ------------------------------------------
// Id generation
// ------------------------------------------
function makeId(label, taken, { pattern = 'field', fallback = 'field' } = {}) {
  let base = String(label || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
  base = pattern === 'option'
    ? base.replace(/[^a-z0-9_-]+/g, '_').replace(/_+/g, '_').replace(/^[_-]+|[_-]+$/g, '')
    : base.replace(/[^a-z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  if (!base) base = fallback;
  if (pattern === 'field') {
    if (!/^[a-z]/.test(base)) base = `f_${base}`;
    if (RESERVED_IDS.has(base)) base = `${base}_field`;
  }
  base = base.slice(0, 40).replace(/_+$/g, '') || fallback;
  let id = base;
  let n = 2;
  while (taken.has(id) || (pattern === 'field' && RESERVED_IDS.has(id))) {
    const suffix = `_${n++}`;
    id = `${base.slice(0, 40 - suffix.length)}${suffix}`;
  }
  taken.add(id);
  return id;
}

/** Map of local field key -> API id. Saved ids (fixedId) are kept so existing data stays consistent. */
function assignFieldIds(uiFields) {
  const taken = new Set();
  const out = {};
  uiFields.forEach((f) => { if (f.fixedId && !taken.has(f.fixedId)) { taken.add(f.fixedId); out[f.key] = f.fixedId; } });
  uiFields.forEach((f) => { if (!out[f.key]) out[f.key] = makeId(f.label, taken); });
  return out;
}

// ------------------------------------------
// Money helpers (UI dollars -> integer cents)
// ------------------------------------------
/** Returns { cents } (undefined when blank) or { error }. */
function parseDollars(raw, what) {
  const s = String(raw ?? '').trim().replace(/^\$/, '');
  if (s === '') return { cents: undefined };
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return { error: `${what}: enter a valid amount like 25 or 25.50` };
  const n = parseFloat(s);
  if (!Number.isFinite(n) || n < 0) return { error: `${what}: must be zero or more` };
  const cents = Math.round(n * 100);
  if (cents > MAX_TOTAL_CENTS) return { error: `${what}: must be at most $1,000,000` };
  return { cents };
}
const centsToDollars = (c) => (Number.isFinite(Number(c)) && c !== null && c !== undefined ? (Number(c) / 100).toFixed(2) : '');

function parseIntOpt(raw, what) {
  const s = String(raw ?? '').trim();
  if (s === '') return { value: undefined };
  if (!/^-?\d+$/.test(s)) return { error: `${what}: must be a whole number` };
  return { value: parseInt(s, 10) };
}

// ------------------------------------------
// UI <-> API conversion
// ------------------------------------------
const blankField = (type = 'text', label = '') => ({
  key: uid(), fixedId: null, label, type, required: false, placeholder: '', help: '',
  options: type === 'select' ? [{ key: uid(), label: '', price: '', fixedValue: null }] : [],
  price: '', min: '', max: '',
});

const opt = (label, price = '') => ({ key: uid(), label, price, fixedValue: null });

const emptyForm = () => ({
  title: '', description: '', logo_url: '', brand_color: DEFAULT_BRAND, visibility: 'public', single_use: false, max_uses: '',
  expires_at: '', success_message: '', redirect_url: '', notify_email: '', webhook_url: '',
  fields: [],
  pricing: { mode: 'fixed', base: '', quantityKey: '', min: '1.00', max: '', fee_bearer: 'merchant' },
});

/** Builds API `fields` from UI state. strict=false returns best-effort fields for the preview. */
function buildFields(uiFields, ids, errors) {
  if (uiFields.length > MAX_FIELDS) errors.push(`A page can have at most ${MAX_FIELDS} fields.`);
  return uiFields.map((f, i) => {
    const name = f.label.trim() || `Field ${i + 1}`;
    if (!f.label.trim()) errors.push(`Field ${i + 1}: label is required.`);
    if (f.label.trim().length > 120) errors.push(`"${name}": label must be 120 characters or less.`);
    if (f.placeholder.length > 120) errors.push(`"${name}": placeholder must be 120 characters or less.`);
    if (f.help.length > 200) errors.push(`"${name}": help text must be 200 characters or less.`);
    const out = { id: ids[f.key], type: f.type, label: f.label.trim() || name, required: !!f.required };
    if (f.placeholder.trim()) out.placeholder = f.placeholder.trim();
    if (f.help.trim()) out.help = f.help.trim();

    if (f.type === 'select') {
      const opts = f.options || [];
      if (opts.length < 1 || opts.length > MAX_OPTIONS) errors.push(`"${name}": add 1-${MAX_OPTIONS} options.`);
      const taken = new Set();
      opts.forEach((o) => { if (o.fixedValue) taken.add(o.fixedValue); });
      out.options = opts.map((o, j) => {
        if (!o.label.trim()) errors.push(`"${name}" option ${j + 1}: label is required.`);
        const value = o.fixedValue || makeId(o.label, taken, { pattern: 'option', fallback: `option_${j + 1}` });
        const r = parseDollars(o.price, `"${name}" option ${j + 1} price`);
        if (r.error) errors.push(r.error);
        const res = { value, label: o.label.trim() || `Option ${j + 1}` };
        if (r.cents !== undefined) res.price_cents = r.cents;
        return res;
      });
    }
    if (f.type === 'checkbox') {
      const r = parseDollars(f.price, `"${name}" add-on price`);
      if (r.error) errors.push(r.error);
      if (r.cents !== undefined && r.cents > 0) out.price_cents = r.cents;
    }
    if (f.type === 'number') {
      const mn = parseIntOpt(f.min, `"${name}" min`);
      const mx = parseIntOpt(f.max, `"${name}" max`);
      if (mn.error) errors.push(mn.error);
      if (mx.error) errors.push(mx.error);
      if (mn.value !== undefined) out.min = mn.value;
      if (mx.value !== undefined) out.max = mx.value;
      if (out.min !== undefined && out.max !== undefined && out.min > out.max) errors.push(`"${name}": min is above max.`);
    }
    return out;
  });
}

function isHttpsOrEmpty(v) { return !v.trim() || !!safeHttpsUrl(v.trim()); }

function serializeForm(form) {
  const errors = [];
  const ids = assignFieldIds(form.fields);
  const fields = buildFields(form.fields, ids, errors);

  if (!form.title.trim()) errors.push('Title is required.');
  if (form.title.trim().length > 120) errors.push('Title must be 120 characters or less.');
  if (!isHttpsOrEmpty(form.logo_url)) errors.push('Logo URL must start with https://');
  if (form.brand_color && !/^#[0-9a-fA-F]{6}$/.test(form.brand_color)) errors.push('Brand colour must look like #1a73e8.');
  if (!isHttpsOrEmpty(form.redirect_url)) errors.push('Redirect URL must start with https://');
  if (!isHttpsOrEmpty(form.webhook_url)) errors.push('Webhook URL must start with https://');
  if (form.notify_email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.notify_email.trim())) errors.push('Notification email is not valid.');

  const maxUses = parseIntOpt(form.max_uses, 'Max uses');
  if (maxUses.error) errors.push(maxUses.error);
  else if (maxUses.value !== undefined && maxUses.value < 1) errors.push('Max uses must be at least 1.');

  let expiresAt = null;
  if (form.expires_at) {
    const d = new Date(`${form.expires_at}T23:59:59`);
    if (Number.isNaN(d.getTime())) errors.push('Expiry date is not valid.');
    else if (d.getTime() <= Date.now()) errors.push('Expiry date must be in the future.');
    else expiresAt = d.toISOString();
  }

  const p = form.pricing;
  const pricing = { mode: p.mode, fee_bearer: p.fee_bearer };
  const base = parseDollars(p.base, 'Base price');
  if (base.error) errors.push(base.error);
  pricing.base_cents = base.cents ?? 0;

  if (p.mode === 'fixed') {
    if (p.quantityKey) {
      const qf = form.fields.find((f) => f.key === p.quantityKey);
      if (!qf || qf.type !== 'number' || !qf.required) errors.push('The quantity field must be a required number field.');
      else pricing.quantity_field = ids[qf.key];
    }
    const hasPrice = pricing.base_cents > 0 || fields.some((f) => (f.price_cents ?? 0) > 0 || (f.options || []).some((o) => (o.price_cents ?? 0) > 0));
    if (!hasPrice) errors.push('A fixed-price page needs a base price or at least one priced option/add-on.');
  } else {
    const mn = parseDollars(p.min, 'Minimum amount');
    const mx = parseDollars(p.max, 'Maximum amount');
    if (mn.error) errors.push(mn.error);
    if (mx.error) errors.push(mx.error);
    if (!mn.error && (mn.cents === undefined || mn.cents < 100)) errors.push('Minimum amount must be at least $1.00.');
    if (!mx.error && mx.cents === undefined) errors.push('Maximum amount is required.');
    if (mn.cents !== undefined && mx.cents !== undefined && mn.cents > mx.cents) errors.push('Minimum amount is above the maximum.');
    pricing.customer_amount = { min_cents: mn.cents ?? 0, max_cents: mx.cents ?? 0 };
  }

  const page = {
    title: form.title.trim(),
    description: form.description.trim() || null,
    logo_url: form.logo_url.trim() || null,
    brand_color: form.brand_color ? form.brand_color.toLowerCase() : null,
    visibility: form.visibility,
    single_use: !!form.single_use,
    max_uses: maxUses.value ?? null,
    expires_at: expiresAt,
    fields,
    pricing,
    success_message: form.success_message.trim() || null,
    redirect_url: form.redirect_url.trim() || null,
    notify_email: form.notify_email.trim() || null,
    webhook_url: form.webhook_url.trim() || null,
  };
  return { page, errors, ids };
}

function pageToForm(p) {
  const fields = (p.fields || []).map((f) => ({
    key: uid(), fixedId: f.id, label: f.label || '', type: f.type, required: !!f.required,
    placeholder: f.placeholder || '', help: f.help || '',
    options: (f.options || []).map((o) => ({ key: uid(), label: o.label || '', price: o.price_cents ? centsToDollars(o.price_cents) : '', fixedValue: o.value })),
    price: f.price_cents ? centsToDollars(f.price_cents) : '',
    min: Number.isInteger(f.min) ? String(f.min) : '', max: Number.isInteger(f.max) ? String(f.max) : '',
  }));
  const pr = p.pricing || {};
  const qField = fields.find((f) => f.fixedId && f.fixedId === pr.quantity_field);
  let expires = '';
  if (p.expires_at) {
    const d = new Date(p.expires_at);
    if (!Number.isNaN(d.getTime())) expires = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return {
    title: p.title || '', description: p.description || '', logo_url: p.logo_url || '', brand_color: safeBrandColor(p.brand_color),
    visibility: p.visibility || 'public', single_use: !!p.single_use, max_uses: p.max_uses ? String(p.max_uses) : '',
    expires_at: expires, success_message: p.success_message || '', redirect_url: p.redirect_url || '',
    notify_email: p.notify_email || '', webhook_url: p.webhook_url || '',
    fields,
    pricing: {
      mode: pr.mode || 'fixed', base: pr.base_cents ? centsToDollars(pr.base_cents) : '',
      quantityKey: qField ? qField.key : '',
      min: pr.customer_amount ? centsToDollars(pr.customer_amount.min_cents) : '1.00',
      max: pr.customer_amount ? centsToDollars(pr.customer_amount.max_cents) : '',
      fee_bearer: pr.fee_bearer || 'merchant',
    },
  };
}

// ------------------------------------------
// Starter templates
// ------------------------------------------
const field = (type, label, extra = {}) => ({ ...blankField(type, label), ...extra });

const TEMPLATES = [
  {
    id: 'travel', Icon: Plane, label: 'Travel booking', desc: 'Passport, route, cabin class, baggage, passengers',
    build: () => {
      const passengers = field('number', 'Passengers', { required: true, min: '1', max: '9', help: 'Total is multiplied by the number of passengers.' });
      return {
        ...emptyForm(),
        title: 'Flight Booking',
        description: 'Book your seat. Our team will confirm your itinerary by email after payment.',
        success_message: 'Thank you! Your booking request is confirmed. Your e-ticket will be emailed within 24 hours.',
        fields: [
          field('text', 'Passport number', { required: true, placeholder: 'A12345678' }),
          field('text', 'Nationality', { required: true }),
          field('text', 'From', { required: true, placeholder: 'City or airport' }),
          field('text', 'To', { required: true, placeholder: 'City or airport' }),
          field('date', 'Travel date', { required: true }),
          field('date', 'Return date', { help: 'Leave empty for a one-way trip.' }),
          field('select', 'Cabin class', { required: true, options: [opt('Economy', '300.00'), opt('Premium Economy', '550.00'), opt('Business', '900.00')] }),
          field('checkbox', 'Extra baggage (23kg)', { price: '50.00' }),
          passengers,
        ],
        pricing: { mode: 'fixed', base: '', quantityKey: passengers.key, min: '1.00', max: '', fee_bearer: 'customer' },
      };
    },
  },
  {
    id: 'event', Icon: CalendarDays, label: 'Event registration', desc: 'Ticket type, attendees, dietary needs',
    build: () => {
      const attendees = field('number', 'Number of attendees', { required: true, min: '1', max: '10' });
      return {
        ...emptyForm(),
        title: 'Event Registration',
        description: 'Reserve your place. Tickets will be emailed after payment.',
        success_message: 'You are registered! Watch your inbox for your ticket.',
        fields: [
          field('phone', 'Phone number', { required: true }),
          field('text', 'Organization'),
          field('select', 'Ticket type', { required: true, options: [opt('General admission', '25.00'), opt('VIP', '75.00')] }),
          attendees,
          field('checkbox', 'Event T-shirt', { price: '15.00' }),
          field('textarea', 'Dietary requirements', { placeholder: 'Allergies, vegetarian, etc.' }),
        ],
        pricing: { mode: 'fixed', base: '', quantityKey: attendees.key, min: '1.00', max: '', fee_bearer: 'merchant' },
      };
    },
  },
  {
    id: 'donation', Icon: HeartHandshake, label: 'Donation', desc: 'Donor chooses the amount',
    build: () => ({
      ...emptyForm(),
      title: 'Support Our Cause',
      description: 'Every contribution makes a difference. Thank you for your generosity.',
      success_message: 'Thank you for your donation! A receipt has been sent to your email.',
      fields: [
        field('text', 'Dedicate this gift to', { placeholder: 'In honor of...' }),
        field('checkbox', 'Keep my donation anonymous'),
        field('textarea', 'Message'),
      ],
      pricing: { mode: 'customer_amount', base: '', quantityKey: '', min: '1.00', max: '10000.00', fee_bearer: 'merchant' },
    }),
  },
];

// ------------------------------------------
// CSV
// ------------------------------------------
function csvCell(v) {
  let s = v === null || v === undefined ? '' : (typeof v === 'object' ? JSON.stringify(v) : String(v));
  // Neutralise spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

function answerDisplay(fieldDef, value) {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  if (fieldDef?.type === 'select') {
    const o = (fieldDef.options || []).find((x) => x.value === value);
    if (o) return o.label;
  }
  return value === null || value === undefined ? '' : String(value);
}

// ------------------------------------------
// Small UI pieces
// ------------------------------------------
const Modal = ({ onClose, children, title }) => (
  <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in" role="dialog" aria-modal="true">
    <div className="absolute inset-0" onClick={onClose} />
    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-lg font-bold text-slate-900">{title}</h4>
        <button onClick={onClose} className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center text-slate-500" aria-label="Close"><X size={16} /></button>
      </div>
      {children}
    </div>
  </div>
);

const StatusBadge = ({ page }) => {
  const expired = page.expires_at && new Date(page.expires_at).getTime() < Date.now();
  const usedUp = (page.max_uses && page.uses_count >= page.max_uses) || (page.single_use && page.uses_count >= 1);
  let label = page.status; let cls = page.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200';
  if (page.status === 'active' && expired) { label = 'expired'; cls = 'bg-orange-50 text-orange-600 border-orange-200'; }
  else if (page.status === 'active' && usedUp) { label = 'used up'; cls = 'bg-orange-50 text-orange-600 border-orange-200'; }
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${cls}`}>{label}</span>;
};

const orderStatusCls = (s) => ({
  paid: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  pending: 'bg-orange-50 text-orange-600 border-orange-200',
  failed: 'bg-red-50 text-red-600 border-red-200',
  expired: 'bg-slate-100 text-slate-500 border-slate-200',
}[s] || 'bg-slate-100 text-slate-500 border-slate-200');

const IconBtn = ({ title, onClick, children, tone = 'slate', disabled }) => (
  <button type="button" title={title} aria-label={title} onClick={onClick} disabled={disabled}
    className={`p-2 rounded-lg border transition-colors disabled:opacity-40 ${tone === 'blue' ? 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-600 hover:text-white' : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-blue-600 hover:border-blue-200'}`}>
    {children}
  </button>
);

// ------------------------------------------
// Share sheet: copy, WhatsApp, email, native share, QR download
// ------------------------------------------
function downloadQrPng(svgEl, filename) {
  if (!svgEl) return;
  const xml = new XMLSerializer().serializeToString(svgEl);
  const img = new Image();
  const size = 1024;
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    const pad = 64;
    ctx.drawImage(img, pad, pad, size - pad * 2, size - pad * 2);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  };
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
}

function ShareSheet({ page, onClose, onCopy }) {
  const link = pageUrl(page.slug);
  const qrRef = useRef(null);
  const message = `${page.title} — pay securely here: ${link}`;
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const actionCls = 'flex flex-col items-center gap-1.5 p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-sm font-medium text-slate-700 transition';
  return (
    <Modal title="Share your page" onClose={onClose}>
      <div className="flex flex-col items-center">
        <div ref={qrRef} className="bg-white p-4 rounded-2xl border border-slate-200 mb-3">
          <QRCode value={link} size={184} bgColor="#ffffff" fgColor="#0f172a" level="M" />
        </div>
        <p className="font-semibold text-slate-900 text-center break-words">{page.title}</p>
        <div className="w-full mt-3 flex items-center gap-2 p-2 pl-3 rounded-xl bg-slate-50 border border-slate-200">
          <span className="text-sm text-slate-600 truncate flex-1 min-w-0">{link}</span>
          <button type="button" onClick={() => onCopy(link)} className="shrink-0 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-sm font-medium flex items-center gap-1.5"><Copy size={14} /> Copy</button>
        </div>
        <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          <a className={actionCls} href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={20} className="text-emerald-600" /> WhatsApp
          </a>
          <a className={actionCls} href={`mailto:?subject=${encodeURIComponent(page.title)}&body=${encodeURIComponent(message)}`}>
            <Mail size={20} className="text-blue-600" /> Email
          </a>
          <button type="button" className={actionCls} onClick={() => downloadQrPng(qrRef.current?.querySelector('svg'), `${page.slug}-qr.png`)}>
            <Download size={20} className="text-slate-700" /> QR image
          </button>
          {canNativeShare ? (
            <button type="button" className={actionCls} onClick={() => navigator.share({ title: page.title, text: message, url: link }).catch(() => {})}>
              <Share2 size={20} className="text-violet-600" /> More
            </button>
          ) : (
            <a className={actionCls} href={link} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={20} className="text-violet-600" /> Open
            </a>
          )}
        </div>
        <p className="text-xs text-slate-500 text-center mt-4">Print the QR code for your shop counter, flyers or invoices.</p>
      </div>
    </Modal>
  );
}

// ------------------------------------------
// Order detail
// ------------------------------------------
function OrderDetail({ order, fields, onClose, onCopy }) {
  const fmap = Object.fromEntries((fields || []).map((f) => [f.id, f]));
  const money = (c) => formatCents(c, order.currency);
  const row = 'flex justify-between gap-3 text-sm';
  return (
    <Modal title="Order details" onClose={onClose}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-slate-900 truncate">{order.customer_name}</p>
          <p className="text-sm text-slate-500 truncate">{order.customer_email}</p>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize shrink-0 ${orderStatusCls(order.status)}`}>{order.status}</span>
      </div>

      <div className="rounded-xl border border-slate-200 p-4 space-y-2 mb-4">
        {(order.line_items || []).map((li, i) => (
          <div key={i} className={`${row} text-slate-600`}>
            <span className="break-words">{li.label}{li.quantity > 1 ? ` × ${li.quantity}` : ''}</span>
            <span className="shrink-0 text-slate-800">{money(li.total_cents)}</span>
          </div>
        ))}
        <div className={`${row} pt-2 border-t border-slate-200 font-semibold text-slate-900`}><span>Customer paid</span><span>{money(order.total_cents)}</span></div>
        {Number(order.fee_cents) > 0 && <div className={`${row} text-slate-500`}><span>Platform fee</span><span>{money(order.fee_cents)}</span></div>}
        {order.merchant_net_cents != null && <div className={`${row} font-semibold text-emerald-700`}><span>You receive</span><span>{money(order.merchant_net_cents)}</span></div>}
      </div>

      <h5 className="text-sm font-semibold text-slate-700 mb-2">Customer answers</h5>
      {Object.keys(order.answers || {}).length === 0 ? (
        <p className="text-sm text-slate-500 mb-4">No answers.</p>
      ) : (
        <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 mb-4">
          {Object.entries(order.answers || {}).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
              <dt className="text-slate-500">{fmap[k]?.label || k}</dt>
              <dd className="text-slate-900 font-medium text-right break-words whitespace-pre-line">{answerDisplay(fmap[k], v) || '—'}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="text-xs text-slate-500 space-y-1">
        <p>Placed {order.created_at ? new Date(order.created_at).toLocaleString() : '—'}{order.paid_at ? ` · Paid ${new Date(order.paid_at).toLocaleString()}` : ''}</p>
        <p>Paid with <span className="capitalize">{String(order.provider || '—').replace('_', ' ')}</span></p>
        <button type="button" onClick={() => onCopy(order.id, 'Order ID copied.')} className="font-mono break-all text-slate-500 hover:text-slate-900 text-left">ID {order.id} <Copy size={11} className="inline" /></button>
      </div>
    </Modal>
  );
}

// ------------------------------------------
// Field builder row
// ------------------------------------------
function FieldEditor({ f, index, count, fieldId, onChange, onRemove, onMove }) {
  const set = (patch) => onChange({ ...f, ...patch });
  const setType = (type) => {
    const patch = { type };
    if (type === 'select' && (!f.options || f.options.length === 0)) patch.options = [opt('')];
    set(patch);
  };
  const setOption = (k, patch) => set({ options: f.options.map((o) => (o.key === k ? { ...o, ...patch } : o)) });

  return (
    <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Field {index + 1} · <span className="font-mono normal-case text-slate-500">{fieldId}</span></span>
        <div className="flex gap-1">
          <IconBtn title="Move up" onClick={() => onMove(-1)} disabled={index === 0}><ArrowUp size={14} /></IconBtn>
          <IconBtn title="Move down" onClick={() => onMove(1)} disabled={index === count - 1}><ArrowDown size={14} /></IconBtn>
          <IconBtn title="Remove field" onClick={onRemove}><Trash2 size={14} /></IconBtn>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Label</label>
          <input value={f.label} maxLength={120} onChange={(e) => set({ label: e.target.value })} className={inputCls} placeholder="e.g. Passport number" />
        </div>
        <div>
          <label className={labelCls}>Type</label>
          <select value={f.type} onChange={(e) => setType(e.target.value)} className={inputCls}>
            {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        {f.type !== 'checkbox' && (
          <div>
            <label className={labelCls}>Placeholder</label>
            <input value={f.placeholder} maxLength={120} onChange={(e) => set({ placeholder: e.target.value })} className={inputCls} />
          </div>
        )}
        <div className={f.type === 'checkbox' ? 'sm:col-span-2' : ''}>
          <label className={labelCls}>Help text</label>
          <input value={f.help} maxLength={200} onChange={(e) => set({ help: e.target.value })} className={inputCls} />
        </div>
      </div>

      {f.type === 'number' && (
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Min</label><input type="number" step="1" value={f.min} onChange={(e) => set({ min: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Max</label><input type="number" step="1" value={f.max} onChange={(e) => set({ max: e.target.value })} className={inputCls} /></div>
        </div>
      )}

      {f.type === 'checkbox' && (
        <div>
          <label className={labelCls}>Add-on price (USD, optional)</label>
          <input inputMode="decimal" value={f.price} onChange={(e) => set({ price: e.target.value })} className={inputCls} placeholder="0.00" />
        </div>
      )}

      {f.type === 'select' && (
        <div className="space-y-2">
          <label className={labelCls}>Options (price in USD is optional)</label>
          {f.options.map((o, j) => (
            <div key={o.key} className="flex gap-2">
              <input value={o.label} maxLength={120} onChange={(e) => setOption(o.key, { label: e.target.value })} className={`${inputCls} flex-1`} placeholder={`Option ${j + 1}`} />
              <input inputMode="decimal" value={o.price} onChange={(e) => setOption(o.key, { price: e.target.value })} className={`${inputCls} w-24 sm:w-28`} placeholder="$0.00" aria-label={`Option ${j + 1} price`} />
              <IconBtn title="Remove option" onClick={() => set({ options: f.options.filter((x) => x.key !== o.key) })} disabled={f.options.length <= 1}><X size={14} /></IconBtn>
            </div>
          ))}
          {f.options.length < MAX_OPTIONS && (
            <button type="button" onClick={() => set({ options: [...f.options, opt('')] })} className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-500 flex items-center gap-1"><Plus size={12} /> Add option</button>
          )}
        </div>
      )}

      <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
        <input type="checkbox" checked={f.required} onChange={(e) => set({ required: e.target.checked })} className="w-4 h-4 accent-blue-600" />
        Required
      </label>
    </div>
  );
}

// ------------------------------------------
// Page builder
// ------------------------------------------
function PageBuilder({ editing, onCancel, onSaved, showToast, kycBlocked }) {
  const [form, setForm] = useState(() => (editing ? pageToForm(editing) : emptyForm()));
  const [errors, setErrors] = useState([]);
  const [serverError, setServerError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [previewValues, setPreviewValues] = useState({});
  const [showPreviewMobile, setShowPreviewMobile] = useState(false);

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const setPricing = (patch) => setForm((prev) => ({ ...prev, pricing: { ...prev.pricing, ...patch } }));

  const ids = useMemo(() => assignFieldIds(form.fields), [form.fields]);
  const preview = useMemo(() => {
    const errs = [];
    return buildFields(form.fields, ids, errs);
  }, [form.fields, ids]);

  const quantityCandidates = form.fields.filter((f) => f.type === 'number' && f.required);
  useEffect(() => {
    // Clear a quantity selection that is no longer valid.
    if (form.pricing.quantityKey && !quantityCandidates.some((f) => f.key === form.pricing.quantityKey)) setPricing({ quantityKey: '' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.fields]);

  const applyTemplate = (t) => {
    if (form.fields.length && !window.confirm('Replace the current form with this template?')) return;
    const built = t.build();
    setForm(built);
    setPreviewValues({});
    setErrors([]);
    setServerError(null);
  };

  const updateField = (key, next) => setForm((prev) => ({ ...prev, fields: prev.fields.map((f) => (f.key === key ? next : f)) }));
  const removeField = (key) => setForm((prev) => ({ ...prev, fields: prev.fields.filter((f) => f.key !== key) }));
  const moveField = (idx, dir) => setForm((prev) => {
    const arr = [...prev.fields];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return prev;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    return { ...prev, fields: arr };
  });

  const handleSave = async (e) => {
    e.preventDefault();
    setServerError(null);
    const { page, errors: errs } = serializeForm(form);
    setErrors(errs);
    if (errs.length) return;
    setIsSaving(true);
    const body = editing ? { action: 'update_page', id: editing.id, page } : { action: 'create_page', page };
    const { data, error } = await callPaymentPages(body);
    setIsSaving(false);
    if (error) {
      setServerError(error.status === 403 ? KYC_MESSAGE : error.message);
      return;
    }
    const secret = data?.webhook_secret || data?.page?.webhook_secret || null;
    showToast(editing ? 'Payment page updated.' : 'Payment page published.');
    onSaved(data?.page, editing ? null : secret);
  };

  const brand = safeBrandColor(form.brand_color);
  const logoPreview = safeHttpsUrl(form.logo_url);
  const previewPanel = (
    <div className="bg-slate-100 border border-slate-200 rounded-3xl p-4 sm:p-5">
      <p className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-1.5"><Eye size={15} /> Live preview</p>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm" style={{ '--brand': brand }}>
        <div className="h-16" style={{ background: `linear-gradient(135deg, ${brand}, color-mix(in srgb, ${brand} 70%, #0f172a))` }} />
        <div className="px-5 pb-5 -mt-7">
          {logoPreview ? (
            <img src={logoPreview} alt="" referrerPolicy="no-referrer" className="w-14 h-14 rounded-xl object-cover border-4 border-white bg-white" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          ) : (
            <div className="w-14 h-14 rounded-xl border-4 border-white flex items-center justify-center font-bold" style={{ background: brand, color: onBrandColor(brand) }}>{initialsOf(form.title)}</div>
          )}
          <h3 className="text-lg font-bold text-slate-900 mt-3 break-words">{form.title || 'Untitled page'}</h3>
          {form.description && <p className="text-sm text-slate-600 mt-1 whitespace-pre-line break-words">{form.description}</p>}
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <input disabled placeholder="Full name" className={inputCls} />
              <input disabled placeholder="Email" className={inputCls} />
            </div>
            <PaymentFormRenderer fields={preview} values={{ ...initialAnswers(preview), ...previewValues }} onChange={(id, v) => setPreviewValues((p) => ({ ...p, [id]: v }))} idPrefix="preview" />
            {form.pricing.mode === 'customer_amount' && <input disabled placeholder="Amount (USD)" className={inputCls} />}
            <div className="w-full py-3 rounded-xl text-center text-sm font-semibold" style={{ background: brand, color: onBrandColor(brand) }}>Pay</div>
            <p className="text-xs text-slate-500 text-center">Totals are calculated by IFB at checkout{form.pricing.fee_bearer === 'customer' ? ' (+1.5% fee paid by the customer)' : ''}.</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="animate-in fade-in">
      <button onClick={onCancel} className="text-sm font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1.5 mb-4"><ArrowLeft size={16} /> Back to pages</button>

      {!editing && (
        <div className="mb-6">
          <p className={labelCls}>Start from a template</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {TEMPLATES.map((t) => (
              <button key={t.id} type="button" onClick={() => applyTemplate(t)} className="text-left p-4 bg-white border border-slate-200 rounded-2xl hover:border-blue-300 hover:shadow-md transition-all">
                <t.Icon size={20} className="text-blue-600 mb-2" />
                <p className="font-semibold text-[15px] text-slate-900">{t.label}</p>
                <p className="text-[13px] text-slate-500">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <form onSubmit={handleSave} className="lg:col-span-3 space-y-6">
          {/* Basics */}
          <section className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-4">
            <h4 className="text-base font-bold text-slate-900">Page details</h4>
            <div><label className={labelCls}>Title *</label><input required maxLength={120} value={form.title} onChange={(e) => set({ title: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Description</label><textarea rows={3} maxLength={2000} value={form.description} onChange={(e) => set({ description: e.target.value })} className={`${inputCls} resize-y`} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={labelCls}>Logo URL (https)</label><input type="url" value={form.logo_url} onChange={(e) => set({ logo_url: e.target.value })} className={inputCls} placeholder="https://..." /></div>
              <div>
                <label className={labelCls} htmlFor="pp-brand">Brand colour</label>
                <div className="flex items-center gap-2">
                  <input id="pp-brand" type="color" value={safeBrandColor(form.brand_color)} onChange={(e) => set({ brand_color: e.target.value })}
                    className="w-11 h-11 rounded-xl border border-slate-300 bg-white p-1 cursor-pointer shrink-0" aria-label="Pick brand colour" />
                  <div className="flex gap-1.5 flex-wrap">
                    {BRAND_SWATCHES.map((c) => (
                      <button key={c} type="button" onClick={() => set({ brand_color: c })} aria-label={`Use colour ${c}`}
                        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center ${safeBrandColor(form.brand_color) === c ? 'border-slate-900' : 'border-white shadow-sm'}`}
                        style={{ background: c }}>
                        {safeBrandColor(form.brand_color) === c && <Check size={13} style={{ color: onBrandColor(c) }} strokeWidth={3} />}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1.5">Used for the header and Pay button on your checkout page.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Visibility</label>
                <select value={form.visibility} onChange={(e) => set({ visibility: e.target.value, ...(e.target.value === 'private' && !editing ? { single_use: true } : {}) })} className={inputCls} disabled={!!editing} title={editing ? 'Visibility is fixed once a link is created' : undefined}>
                  <option value="public">Public link</option>
                  <option value="private">Private one-off link</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Expiry date</label>
                <input type="date" value={form.expires_at} onChange={(e) => set({ expires_at: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Max uses</label>
                <input type="number" min="1" step="1" value={form.max_uses} onChange={(e) => set({ max_uses: e.target.value })} className={inputCls} placeholder="Unlimited" />
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer sm:mt-6">
                <input type="checkbox" checked={form.single_use} onChange={(e) => set({ single_use: e.target.checked })} className="w-4 h-4 accent-blue-600" />
                Single use (deactivate after first payment)
              </label>
            </div>
          </section>

          {/* Fields */}
          <section className="bg-slate-50 p-5 sm:p-6 rounded-[2rem] border border-slate-200 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-base font-bold text-slate-900">Form fields</h4>
                <p className="text-[11px] text-slate-400 font-medium">Customer name and email are always collected.</p>
              </div>
              <span className="text-[10px] font-black text-slate-400">{form.fields.length}/{MAX_FIELDS}</span>
            </div>
            {form.fields.map((f, i) => (
              <FieldEditor key={f.key} f={f} index={i} count={form.fields.length} fieldId={ids[f.key]}
                onChange={(next) => updateField(f.key, next)} onRemove={() => removeField(f.key)} onMove={(d) => moveField(i, d)} />
            ))}
            {form.fields.length < MAX_FIELDS && (
              <button type="button" onClick={() => set({ fields: [...form.fields, blankField()] })} className="w-full py-3 border-2 border-dashed border-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:border-blue-400 hover:text-blue-600 flex items-center justify-center gap-2">
                <Plus size={14} /> Add field
              </button>
            )}
          </section>

          {/* Pricing */}
          <section className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-4">
            <h4 className="text-base font-bold text-slate-900">Pricing (USD)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[{ v: 'fixed', l: 'Fixed price (with priced options)' }, { v: 'customer_amount', l: 'Customer enters amount' }].map((m) => (
                <button key={m.v} type="button" onClick={() => setPricing({ mode: m.v })}
                  className={`p-3 rounded-xl border-2 text-xs font-black transition-colors ${form.pricing.mode === m.v ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>{m.l}</button>
              ))}
            </div>
            <div>
              <label className={labelCls}>Base price {form.pricing.mode === 'customer_amount' ? '(added on top, optional)' : ''}</label>
              <input inputMode="decimal" value={form.pricing.base} onChange={(e) => setPricing({ base: e.target.value })} className={inputCls} placeholder="0.00" />
            </div>
            {form.pricing.mode === 'fixed' ? (
              <div>
                <label className={labelCls}>Quantity comes from field</label>
                <select value={form.pricing.quantityKey} onChange={(e) => setPricing({ quantityKey: e.target.value })} className={inputCls}>
                  <option value="">None (quantity 1)</option>
                  {quantityCandidates.map((f) => <option key={f.key} value={f.key}>{f.label || ids[f.key]}</option>)}
                </select>
                <p className="text-[11px] text-slate-400 font-medium mt-1">Only required number fields can be used. Quantity 1-100.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Minimum</label><input inputMode="decimal" value={form.pricing.min} onChange={(e) => setPricing({ min: e.target.value })} className={inputCls} placeholder="1.00" /></div>
                <div><label className={labelCls}>Maximum</label><input inputMode="decimal" value={form.pricing.max} onChange={(e) => setPricing({ max: e.target.value })} className={inputCls} placeholder="5000.00" /></div>
              </div>
            )}
            <div>
              <label className={labelCls}>Who pays the 1.5% fee</label>
              <select value={form.pricing.fee_bearer} onChange={(e) => setPricing({ fee_bearer: e.target.value })} className={inputCls}>
                <option value="merchant">Merchant (deducted from payout)</option>
                <option value="customer">Customer (added to total)</option>
              </select>
            </div>
          </section>

          {/* After payment */}
          <section className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-4">
            <h4 className="text-base font-bold text-slate-900">After payment</h4>
            <div><label className={labelCls}>Success message</label><textarea rows={2} maxLength={1000} value={form.success_message} onChange={(e) => set({ success_message: e.target.value })} className={`${inputCls} resize-y`} /></div>
            <div><label className={labelCls}>Redirect URL (https, optional)</label><input type="url" value={form.redirect_url} onChange={(e) => set({ redirect_url: e.target.value })} className={inputCls} placeholder="https://..." /></div>
            <div><label className={labelCls}>Notification email</label><input type="email" value={form.notify_email} onChange={(e) => set({ notify_email: e.target.value })} className={inputCls} placeholder="orders@yourbusiness.com" /></div>
            <div><label className={labelCls}>Webhook URL (https, optional)</label><input type="url" value={form.webhook_url} onChange={(e) => set({ webhook_url: e.target.value })} className={inputCls} placeholder="https://api.yourbusiness.com/ifb-webhook" /></div>
          </section>

          {(errors.length > 0 || serverError) && (
            <div role="alert" className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-red-600 space-y-1">
              {serverError && <p className="flex items-start gap-2"><AlertTriangle size={14} className="shrink-0 mt-0.5" /> {serverError}</p>}
              {errors.map((er, i) => <p key={i}>• {er}</p>)}
            </div>
          )}

          <button type="button" onClick={() => setShowPreviewMobile((s) => !s)} className="lg:hidden w-full py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 flex items-center justify-center gap-2">
            <Eye size={14} /> {showPreviewMobile ? 'Hide preview' : 'Show preview'}
          </button>
          {showPreviewMobile && <div className="lg:hidden">{previewPanel}</div>}

          <button type="submit" disabled={isSaving || (kycBlocked && !editing)} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
            {isSaving ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> {editing ? 'Save changes' : 'Publish payment page'}</>}
          </button>
        </form>

        <div className="hidden lg:block lg:col-span-2">
          <div className="sticky top-0">{previewPanel}</div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------
// Orders view
// ------------------------------------------
function OrdersView({ page, onBack, showToast }) {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [error, setError] = useState('');
  const LIMIT = 100;

  const load = useCallback(async (before) => {
    setIsLoading(true);
    setError('');
    const body = { action: 'list_orders', page_id: page.id, limit: LIMIT };
    if (status !== 'all') body.status = status;
    if (before) body.before = before;
    const { data, error: err } = await callPaymentPages(body);
    setIsLoading(false);
    if (err) { setError(err.message); return; }
    const list = Array.isArray(data?.orders) ? data.orders : [];
    setOrders((prev) => (before ? [...prev, ...list] : list));
    setHasMore(list.length === LIMIT);
  }, [page.id, status]);

  useEffect(() => { setOrders([]); load(); }, [load]);

  const fieldsFor = (o) => (Array.isArray(o.fields_snapshot) ? o.fields_snapshot : page.fields || []);

  const exportCsv = () => {
    if (!orders.length) return;
    const answerCols = [];
    const seen = new Set();
    const labels = {};
    orders.forEach((o) => {
      fieldsFor(o).forEach((f) => { if (!labels[f.id]) labels[f.id] = f.label; });
      Object.keys(o.answers || {}).forEach((k) => { if (!seen.has(k)) { seen.add(k); answerCols.push(k); } });
    });
    const header = ['Date', 'Order ID', 'Customer', 'Email', 'Status', 'Method', 'Subtotal', 'Fee', 'Total', 'Net', 'Currency', ...answerCols.map((k) => labels[k] || k)];
    const money = (c) => (Number.isFinite(Number(c)) ? (Number(c) / 100).toFixed(2) : '');
    const rows = orders.map((o) => {
      const fmap = Object.fromEntries(fieldsFor(o).map((f) => [f.id, f]));
      return [
        o.created_at ? new Date(o.created_at).toISOString() : '', o.id, o.customer_name, o.customer_email, o.status, o.provider,
        money(o.subtotal_cents), money(o.fee_cents), money(o.total_cents), money(o.merchant_net_cents), o.currency || 'USD',
        ...answerCols.map((k) => answerDisplay(fmap[k], (o.answers || {})[k])),
      ];
    });
    const csv = '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(page.slug || 'payment-page').replace(/[^a-z0-9-]/gi, '')}-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(`Exported ${orders.length} orders.`);
  };

  const copyText = async (text, msg = 'Copied.') => {
    try { await navigator.clipboard.writeText(text); showToast(msg); } catch { showToast('Could not copy.', 'error'); }
  };
  const paidOrders = orders.filter((o) => o.status === 'paid');
  const paidNet = paidOrders.reduce((n, o) => n + Number(o.merchant_net_cents || 0), 0);
  const detail = orders.find((o) => o.id === expanded) || null;

  return (
    <div className="animate-in fade-in space-y-4">
      <button onClick={onBack} className="text-sm font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1.5"><ArrowLeft size={16} /> Back to pages</button>
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="min-w-0">
            <h3 className="text-xl font-bold text-slate-900 truncate">{page.title}</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {orders.length ? <><span className="font-semibold text-emerald-700">{formatCents(paidNet, 'USD')}</span> from {paidOrders.length} paid {paidOrders.length === 1 ? 'order' : 'orders'} shown</> : 'Orders'}
            </p>
          </div>
          <div className="flex gap-2">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 text-base sm:text-sm outline-none focus:border-blue-500" aria-label="Filter by status">
              {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s === 'all' ? 'All statuses' : s[0].toUpperCase() + s.slice(1)}</option>)}
            </select>
            <IconBtn title="Refresh" onClick={() => load()}><RefreshCw size={16} /></IconBtn>
            <button onClick={exportCsv} disabled={!orders.length} className="px-3 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 disabled:opacity-40"><Download size={15} /> Export CSV</button>
          </div>
        </div>

        {error && <div role="alert" className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}

        {isLoading && !orders.length ? (
          <div className="py-12 text-center text-slate-500"><Loader2 size={26} className="animate-spin mx-auto mb-2 text-blue-500" /> Loading orders…</div>
        ) : !orders.length ? (
          <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
            <ListOrdered size={34} className="mx-auto mb-3 text-slate-300" />
            <p className="font-semibold text-slate-800">No orders yet</p>
            <p className="text-sm text-slate-500 mt-1">Share your page to start receiving payments.</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-left text-sm min-w-[600px]">
              <thead>
                <tr className="text-xs font-semibold text-slate-500 border-b border-slate-200">
                  <th className="px-3 py-2.5">Date</th><th className="px-3 py-2.5">Customer</th>
                  <th className="px-3 py-2.5 text-right">Total</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5">Method</th><th className="px-3 py-2.5 w-6"></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => setExpanded(o.id)}
                    tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') setExpanded(o.id); }}>
                    <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{o.created_at ? new Date(o.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : ''}</td>
                    <td className="px-3 py-3 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{o.customer_name}</p>
                      <p className="text-xs text-slate-500 truncate">{o.customer_email}</p>
                    </td>
                    <td className="px-3 py-3 font-semibold text-slate-900 text-right whitespace-nowrap">{formatCents(o.total_cents, o.currency)}</td>
                    <td className="px-3 py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${orderStatusCls(o.status)}`}>{o.status}</span></td>
                    <td className="px-3 py-3 text-slate-600 capitalize">{String(o.provider || '').replace('_', ' ')}</td>
                    <td className="px-3 py-3 text-slate-400"><ChevronRight size={16} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {hasMore && (
              <button onClick={() => load(orders[orders.length - 1]?.created_at)} disabled={isLoading} className="mt-4 w-full py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 flex items-center justify-center gap-2">
                {isLoading ? <Loader2 size={15} className="animate-spin" /> : 'Load more'}
              </button>
            )}
          </div>
        )}
      </div>
      {detail && <OrderDetail order={detail} fields={fieldsFor(detail)} onClose={() => setExpanded(null)} onCopy={copyText} />}
    </div>
  );
}

// ------------------------------------------
// Main component
// ------------------------------------------
export default function PaymentPages({ session, profile }) {
  const [view, setView] = useState('list'); // list | builder | orders
  const [pages, setPages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [listError, setListError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [editing, setEditing] = useState(null);
  const [ordersPage, setOrdersPage] = useState(null);
  const [sharePage, setSharePage] = useState(null);
  const [secret, setSecret] = useState(null); // { title, value }
  const [busyId, setBusyId] = useState(null);

  const totals = useMemo(() => ({
    collected: pages.reduce((n, p) => n + Number(p.collected_net_cents || 0), 0),
    paid: pages.reduce((n, p) => n + Number(p.paid_count || 0), 0),
    active: pages.filter((p) => p.status === 'active').length,
  }), [pages]);

  const kycStatus = profile?.kyc_status;
  const kycBlocked = !!profile && !KYC_OK.includes(String(kycStatus || '').toLowerCase());

  const showToast = useCallback((msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  const loadPages = useCallback(async () => {
    setIsLoading(true);
    setListError(null);
    const { data, error } = await callPaymentPages({ action: 'list_pages' });
    setIsLoading(false);
    if (error) { setListError(error.status === 403 ? KYC_MESSAGE : error.message); return; }
    setPages(Array.isArray(data?.pages) ? data.pages : []);
  }, []);

  useEffect(() => { if (session) loadPages(); }, [session, loadPages]);

  const copyText = async (text, msg = 'Link copied to clipboard.') => {
    try { await navigator.clipboard.writeText(text); showToast(msg); } catch { showToast('Could not copy. Select and copy manually.', 'error'); }
  };

  const toggleStatus = async (p) => {
    setBusyId(p.id);
    const next = p.status === 'active' ? 'inactive' : 'active';
    const { data, error } = await callPaymentPages({ action: 'set_status', id: p.id, status: next });
    setBusyId(null);
    if (error) { showToast(error.status === 403 ? KYC_MESSAGE : error.message, 'error'); return; }
    setPages((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...(data?.page || { status: next }) } : x)));
    showToast(next === 'active' ? 'Page activated.' : 'Page deactivated.');
  };

  const rotateSecret = async (p) => {
    if (!window.confirm('Generate a new webhook secret? The old secret stops working immediately.')) return;
    setBusyId(p.id);
    const { data, error } = await callPaymentPages({ action: 'rotate_webhook_secret', id: p.id });
    setBusyId(null);
    if (error) { showToast(error.message, 'error'); return; }
    if (data?.webhook_secret) setSecret({ title: p.title, value: data.webhook_secret });
  };

  const onSaved = (page, newSecret) => {
    setView('list');
    setEditing(null);
    loadPages();
    if (newSecret) setSecret({ title: page?.title || 'New page', value: newSecret });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {notification && (
        <div className={`p-3.5 rounded-xl text-sm font-medium flex items-center gap-2.5 shadow-sm border animate-in slide-in-from-top-2 ${notification.type === 'error' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
          <ShieldCheck size={16} className="shrink-0" /> {notification.msg}
        </div>
      )}

      {kycBlocked && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800 flex items-start gap-3">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>{KYC_MESSAGE}</span>
        </div>
      )}

      {view === 'builder' && (
        <PageBuilder key={editing?.id || 'new'} editing={editing} kycBlocked={kycBlocked} showToast={showToast}
          onCancel={() => { setView('list'); setEditing(null); }} onSaved={onSaved} />
      )}

      {view === 'orders' && ordersPage && (
        <OrdersView page={ordersPage} showToast={showToast} onBack={() => { setView('list'); setOrdersPage(null); }} />
      )}

      {view === 'list' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Payment Pages</h3>
              <p className="text-sm text-slate-500 mt-0.5">Build a form with prices, share the link, and get paid into your wallet.</p>
            </div>
            <button onClick={() => { setEditing(null); setView('builder'); }} disabled={kycBlocked}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold bg-blue-600 hover:bg-blue-500 shadow-sm active:scale-[0.98] transition disabled:opacity-50">
              <Plus size={18} /> New page
            </button>
          </div>

          {pages.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { Icon: Wallet, label: 'Collected', value: formatCents(totals.collected, 'USD'), tone: 'text-emerald-600 bg-emerald-50' },
                { Icon: ReceiptText, label: 'Paid orders', value: totals.paid.toLocaleString(), tone: 'text-blue-600 bg-blue-50' },
                { Icon: Link2, label: 'Active pages', value: `${totals.active} of ${pages.length}`, tone: 'text-violet-600 bg-violet-50' },
              ].map(({ Icon, label, value, tone }) => (
                <div key={label} className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 flex items-center gap-3">
                  <span className={`hidden sm:flex w-10 h-10 rounded-xl items-center justify-center shrink-0 ${tone}`}><Icon size={20} /></span>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-slate-500 truncate">{label}</p>
                    <p className="text-base sm:text-xl font-bold text-slate-900 truncate">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {listError && <div role="alert" className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{listError}</div>}

          {isLoading ? (
            <div className="py-16 text-center text-slate-500 bg-white border border-slate-200 rounded-2xl"><Loader2 size={28} className="animate-spin mx-auto mb-2 text-blue-500" /> Loading pages…</div>
          ) : pages.length === 0 ? (
            <div className="py-14 px-6 text-center bg-white border-2 border-dashed border-slate-200 rounded-2xl">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center"><Link2 size={26} /></div>
              <p className="text-lg font-semibold text-slate-900">Create your first payment page</p>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">Pick a template — travel booking, event registration or donations — add your fields and prices, then share the link or QR code.</p>
              <button onClick={() => { setEditing(null); setView('builder'); }} disabled={kycBlocked}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-50">
                <Plus size={18} /> New page
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {pages.map((p) => {
                const link = pageUrl(p.slug);
                const brand = safeBrandColor(p.brand_color);
                const btn = 'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition disabled:opacity-50';
                return (
                  <div key={p.id} className="relative bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-sm transition-shadow">
                    <span className="absolute left-0 inset-y-0 w-1.5" style={{ background: brand }} aria-hidden="true" />
                    <div className="p-4 sm:p-5 pl-5 sm:pl-6 flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[15px] font-semibold text-slate-900 break-words">{p.title}</p>
                          <StatusBadge page={p} />
                          {p.visibility === 'private' && <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-violet-50 text-violet-700 border-violet-200">Private link</span>}
                        </div>
                        <button type="button" onClick={() => copyText(link)} className="mt-1 max-w-full text-sm text-blue-600 hover:text-blue-700 truncate flex items-center gap-1.5" title="Copy link">
                          <span className="truncate">{link.replace(/^https?:\/\//, '')}</span><Copy size={13} className="shrink-0" />
                        </button>
                        <p className="text-sm text-slate-500 mt-1.5">
                          <span className="font-semibold text-slate-800">{formatCents(p.collected_net_cents || 0, 'USD')}</span> collected
                          {' · '}{(p.paid_count || 0).toLocaleString()} paid
                          {p.max_uses ? ` · ${p.uses_count || 0}/${p.max_uses} uses` : ''}
                          {p.expires_at ? ` · Expires ${new Date(p.expires_at).toLocaleDateString()}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap shrink-0">
                        <button type="button" className={`${btn} bg-slate-900 border-slate-900 text-white hover:bg-slate-800 hover:border-slate-800`} onClick={() => setSharePage(p)}><Share2 size={15} /> Share</button>
                        <button type="button" className={btn} onClick={() => { setOrdersPage(p); setView('orders'); }}><ListOrdered size={15} /> Orders</button>
                        <button type="button" className={btn} onClick={() => { setEditing(p); setView('builder'); }}><Pencil size={15} /> Edit</button>
                        <button type="button" className={btn} onClick={() => toggleStatus(p)} disabled={busyId === p.id} title={p.status === 'active' ? 'Stop accepting payments' : 'Start accepting payments'}>
                          {busyId === p.id ? <Loader2 size={15} className="animate-spin" /> : <Power size={15} className={p.status === 'active' ? 'text-emerald-600' : 'text-slate-400'} />}
                          {p.status === 'active' ? 'Pause' : 'Activate'}
                        </button>
                        {p.webhook_url && (
                          <IconBtn title="Rotate webhook secret" onClick={() => rotateSecret(p)} disabled={busyId === p.id}><KeyRound size={16} /></IconBtn>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {sharePage && <ShareSheet page={sharePage} onClose={() => setSharePage(null)} onCopy={(t) => copyText(t)} />}

      {secret && (
        <Modal title="Webhook secret" onClose={() => { if (window.confirm('Have you saved the secret? It will not be shown again.')) setSecret(null); }}>
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800 flex items-start gap-2 mb-4">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>Copy this secret now. It will not be shown again. Use it to verify the X-IFB-Signature header on webhooks for &ldquo;{secret.title}&rdquo;.</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 break-all select-all mb-4">{secret.value}</div>
          <button onClick={() => copyText(secret.value, 'Webhook secret copied.')} className="w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2"><Copy size={15} /> Copy secret</button>
        </Modal>
      )}
    </div>
  );
}
