// Invoicing: create numbered invoices with line items and tax, email them, and get paid.
// Each invoice's "Pay" link is a private one-time Payment Page (card, mobile money, Paystack
// or IFB wallet); the invoice turns "Paid" automatically when that page is paid.
// Server: supabase/functions/invoices + migration 20261118_invoices.sql.
import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Send, Copy, Download, XCircle, CheckCircle2, Clock, Loader2, FileText, ArrowLeft, AlertTriangle } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

const usd = (cents) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((Number(cents) || 0) / 100);
const today = () => new Date().toISOString().slice(0, 10);
const emptyItem = () => ({ description: '', quantity: 1, unit_price: '' });

function statusOf(inv) {
  if (inv.status === 'paid') return { key: 'paid', label: 'Paid', Icon: CheckCircle2, cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
  if (inv.status === 'void') return { key: 'void', label: 'Cancelled', Icon: XCircle, cls: 'text-slate-600 bg-slate-50 border-slate-200' };
  if (inv.due_date && inv.due_date < today()) return { key: 'overdue', label: 'Overdue', Icon: AlertTriangle, cls: 'text-red-700 bg-red-50 border-red-200' };
  return { key: 'open', label: inv.sent_at ? 'Sent' : 'Not sent', Icon: Clock, cls: 'text-amber-700 bg-amber-50 border-amber-200' };
}

async function call(body) {
  const { data, error } = await supabase.functions.invoke('invoices', { body });
  if (error || data?.error) {
    let msg = data?.error;
    try { msg = msg || (await error?.context?.json())?.error; } catch { /* ignore */ }
    throw new Error(msg || 'Something went wrong. Please try again.');
  }
  return data;
}

async function downloadInvoicePdf(inv, merchantName) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(37, 99, 235); doc.rect(0, 0, W, 80, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
  doc.text(merchantName || 'Invoice', 40, 38);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.text(`Invoice ${inv.number}`, 40, 58);
  doc.setTextColor(15, 23, 42); doc.setFontSize(11);
  let y = 120;
  doc.text(`Billed to: ${inv.client_name} <${inv.client_email}>`, 40, y); y += 18;
  doc.text(`Issued: ${new Date(inv.created_at).toLocaleDateString()}${inv.due_date ? `    Due: ${inv.due_date}` : ''}`, 40, y); y += 30;
  doc.setFont('helvetica', 'bold'); doc.text('Item', 40, y); doc.text('Qty', 360, y); doc.text('Price', 420, y); doc.text('Amount', W - 40, y, { align: 'right' });
  doc.setFont('helvetica', 'normal'); y += 8; doc.setDrawColor(226, 232, 240); doc.line(40, y, W - 40, y); y += 18;
  for (const it of inv.items) {
    const lines = doc.splitTextToSize(it.description, 300);
    doc.text(lines, 40, y); doc.text(String(it.quantity), 360, y); doc.text(usd(it.unit_price_cents), 420, y); doc.text(usd(it.amount_cents), W - 40, y, { align: 'right' });
    y += 16 * lines.length + 6;
  }
  y += 6; doc.line(300, y, W - 40, y); y += 18;
  doc.text('Subtotal', 360, y); doc.text(usd(inv.subtotal_cents), W - 40, y, { align: 'right' }); y += 16;
  if (inv.tax_cents > 0) { doc.text(`Tax (${inv.tax_rate}%)`, 360, y); doc.text(usd(inv.tax_cents), W - 40, y, { align: 'right' }); y += 16; }
  doc.setFont('helvetica', 'bold'); doc.text('Total', 360, y); doc.text(usd(inv.total_cents), W - 40, y, { align: 'right' }); y += 30;
  doc.setFont('helvetica', 'normal');
  if (inv.status === 'paid') { doc.setTextColor(5, 150, 105); doc.text(`PAID ${inv.paid_at ? new Date(inv.paid_at).toLocaleDateString() : ''}`, 40, y); doc.setTextColor(15, 23, 42); y += 20; }
  if (inv.notes) { doc.text(doc.splitTextToSize(inv.notes, W - 80), 40, y); y += 40; }
  if (inv.status === 'open' && inv.pay_url) { doc.setTextColor(37, 99, 235); doc.text(`Pay online: ${inv.pay_url}`, 40, y); }
  doc.setFontSize(8); doc.setTextColor(148, 163, 184);
  doc.text('Sent with Infinite Future Bank. Pay by card, mobile money, bank transfer or IFB wallet.', 40, doc.internal.pageSize.getHeight() - 30);
  doc.save(`${inv.number}.pdf`);
}

export default function BillingTerminal({ session }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');            // list | create | detail
  const [current, setCurrent] = useState(null);
  const [form, setForm] = useState({ client_name: '', client_email: '', due_date: '', tax_rate: '', notes: '', items: [emptyItem()] });
  const [busy, setBusy] = useState('');
  const [toast, setToast] = useState(null);
  const merchantName = session?.user?.user_metadata?.full_name || '';

  const show = (msg, type = 'ok') => { setToast({ msg, type }); setTimeout(() => setToast(null), 4500); };
  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('invoices').select('*').eq('merchant_id', session.user.id).order('created_at', { ascending: false });
    setInvoices(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const totals = useMemo(() => {
    const sub = form.items.reduce((s, it) => s + Math.round((Number(it.unit_price) || 0) * 100) * (Number(it.quantity) || 0), 0);
    const tax = Math.round(sub * (Number(form.tax_rate) || 0) / 100);
    return { sub, tax, total: sub + tax };
  }, [form]);
  const summary = useMemo(() => ({
    open: invoices.filter(i => i.status === 'open').reduce((s, i) => s + i.total_cents, 0),
    paid: invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total_cents, 0),
    overdue: invoices.filter(i => statusOf(i).key === 'overdue').length,
  }), [invoices]);

  const setItem = (i, k, v) => setForm(f => ({ ...f, items: f.items.map((it, j) => (j === i ? { ...it, [k]: v } : it)) }));

  const create = async (sendNow) => {
    setBusy(sendNow ? 'send' : 'create');
    try {
      const res = await call({ action: 'create', send: sendNow, invoice: { ...form, items: form.items.filter(it => it.description || it.unit_price) } });
      show(res.warning ? `Invoice ${res.invoice.number} created. ${res.warning}` : sendNow ? `Invoice ${res.invoice.number} sent to ${res.invoice.client_email}.` : `Invoice ${res.invoice.number} created.`, res.warning ? 'err' : 'ok');
      setForm({ client_name: '', client_email: '', due_date: '', tax_rate: '', notes: '', items: [emptyItem()] });
      await load(); setCurrent(res.invoice); setView('detail');
    } catch (e) { show(e.message, 'err'); }
    finally { setBusy(''); }
  };
  const act = async (action) => {
    setBusy(action);
    try {
      const res = await call({ action, id: current.id });
      setCurrent(res.invoice); await load();
      show(action === 'send' ? `Sent to ${res.invoice.client_email}.` : 'Invoice cancelled.');
    } catch (e) { show(e.message, 'err'); }
    finally { setBusy(''); }
  };
  const copy = async (text) => { try { await navigator.clipboard.writeText(text); show('Pay link copied.'); } catch { show(text); } };

  return (
    <div className="ui-page p-4 md:p-6 space-y-5">
      {toast && <div className={`p-3 rounded-xl text-sm font-medium border ${toast.type === 'err' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{toast.msg}</div>}

      {view === 'list' && (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Invoices</h2>
              <p className="text-sm text-slate-500 mt-0.5">Bill clients and get paid by card, mobile money, bank transfer or IFB wallet.</p>
            </div>
          </div>
          <button onClick={() => setView('create')} className="ui-btn ui-btn-primary"><Plus size={18} /> New invoice</button>
          <div className="grid grid-cols-3 gap-3">
            {[['Outstanding', usd(summary.open)], ['Paid', usd(summary.paid)], ['Overdue', String(summary.overdue)]].map(([k, v]) => (
              <div key={k} className="ui-card p-3"><p className="text-xs text-slate-500">{k}</p><p className="text-base font-bold text-slate-900 ui-amount">{v}</p></div>
            ))}
          </div>
          <div className="ui-card divide-y divide-slate-100 overflow-hidden">
            {loading ? <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
              : invoices.length === 0 ? (
                <div className="p-8 text-center"><FileText className="mx-auto text-slate-300" size={32} /><p className="mt-2 text-sm font-medium text-slate-700">No invoices yet</p><p className="text-sm text-slate-500">Create your first invoice to bill a client.</p></div>
              ) : invoices.map(inv => {
                const st = statusOf(inv);
                return (
                  <button key={inv.id} onClick={() => { setCurrent(inv); setView('detail'); }} className="w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-slate-50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{inv.client_name}</p>
                      <p className="text-xs text-slate-500">{inv.number}{inv.due_date ? ` · due ${inv.due_date}` : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900 ui-amount">{usd(inv.total_cents)}</p>
                      <span className={`inline-flex items-center gap-1 mt-1 text-xs font-semibold px-2 py-0.5 rounded-md border ${st.cls}`}><st.Icon size={11} /> {st.label}</span>
                    </div>
                  </button>
                );
              })}
          </div>
        </>
      )}

      {view === 'create' && (
        <div className="space-y-4">
          <button onClick={() => setView('list')} className="text-sm font-semibold text-slate-500 flex items-center gap-1.5"><ArrowLeft size={16} /> Invoices</button>
          <h2 className="text-xl font-bold text-slate-900">New invoice</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="ui-label">Client name</label><input className="ui-input" value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} placeholder="e.g. Acme Ltd" /></div>
            <div><label className="ui-label">Client email</label><input type="email" className="ui-input" value={form.client_email} onChange={e => setForm({ ...form, client_email: e.target.value })} placeholder="billing@client.com" /></div>
          </div>

          <div className="ui-card p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-900">Items</p>
            {form.items.map((it, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-12 sm:col-span-6"><label className="ui-label sm:sr-only">Description</label><input className="ui-input" value={it.description} onChange={e => setItem(i, 'description', e.target.value)} placeholder="Description" /></div>
                <div className="col-span-3 sm:col-span-2"><label className="ui-label sm:sr-only">Qty</label><input type="number" min="0.01" step="0.01" className="ui-input text-center" value={it.quantity} onChange={e => setItem(i, 'quantity', e.target.value)} /></div>
                <div className="col-span-7 sm:col-span-3"><label className="ui-label sm:sr-only">Price (USD)</label><input type="number" min="0" step="0.01" className="ui-input" value={it.unit_price} onChange={e => setItem(i, 'unit_price', e.target.value)} placeholder="Price $" /></div>
                <div className="col-span-2 sm:col-span-1 flex justify-end">
                  <button type="button" aria-label="Remove item" disabled={form.items.length === 1} onClick={() => setForm(f => ({ ...f, items: f.items.filter((_, j) => j !== i) }))} className="h-12 w-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setForm(f => ({ ...f, items: [...f.items, emptyItem()] }))} className="ui-btn ui-btn-ghost ui-btn-sm"><Plus size={16} /> Add item</button>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="ui-label">Due date (optional)</label><input type="date" min={today()} className="ui-input" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
            <div><label className="ui-label">Tax % (optional)</label><input type="number" min="0" max="50" step="0.01" className="ui-input" value={form.tax_rate} onChange={e => setForm({ ...form, tax_rate: e.target.value })} placeholder="e.g. 7.5" /></div>
          </div>
          <div><label className="ui-label">Notes for the client (optional)</label><textarea className="ui-textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Payment terms, thank-you note…" /></div>

          <div className="ui-card p-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-500"><span>Subtotal</span><span className="ui-amount">{usd(totals.sub)}</span></div>
            {totals.tax > 0 && <div className="flex justify-between text-slate-500"><span>Tax</span><span className="ui-amount">{usd(totals.tax)}</span></div>}
            <div className="flex justify-between font-bold text-slate-900 text-base pt-1"><span>Total</span><span className="ui-amount">{usd(totals.total)}</span></div>
            <p className="text-xs text-slate-500 pt-1">You receive the total minus the payment method's fee. Paid invoices go straight to your IFB wallet.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <button onClick={() => create(false)} disabled={!!busy} className="ui-btn ui-btn-secondary">{busy === 'create' ? <Loader2 size={16} className="animate-spin" /> : null} Save, send later</button>
            <button onClick={() => create(true)} disabled={!!busy} className="ui-btn ui-btn-primary">{busy === 'send' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Create and email</button>
          </div>
        </div>
      )}

      {view === 'detail' && current && (() => {
        const st = statusOf(current);
        return (
          <div className="space-y-4">
            <button onClick={() => setView('list')} className="text-sm font-semibold text-slate-500 flex items-center gap-1.5"><ArrowLeft size={16} /> Invoices</button>
            <div className="ui-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-500">{current.number}</p>
                  <p className="text-lg font-semibold text-slate-900">{current.client_name}</p>
                  <p className="text-sm text-slate-500">{current.client_email}</p>
                </div>
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border ${st.cls}`}><st.Icon size={12} /> {st.label}</span>
              </div>
              <p className="mt-4 text-3xl font-bold text-slate-900 ui-amount">{usd(current.total_cents)}</p>
              <p className="text-sm text-slate-500">Issued {new Date(current.created_at).toLocaleDateString()}{current.due_date ? ` · due ${current.due_date}` : ''}{current.paid_at ? ` · paid ${new Date(current.paid_at).toLocaleDateString()}` : ''}</p>
              <div className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
                {current.items.map((it, i) => (
                  <div key={i} className="flex justify-between gap-3 py-2 text-sm"><span className="text-slate-700">{it.description}{Number(it.quantity) !== 1 ? ` × ${it.quantity}` : ''}</span><span className="text-slate-900 ui-amount">{usd(it.amount_cents)}</span></div>
                ))}
                {current.tax_cents > 0 && <div className="flex justify-between py-2 text-sm text-slate-500"><span>Tax ({current.tax_rate}%)</span><span className="ui-amount">{usd(current.tax_cents)}</span></div>}
              </div>
              {current.notes && <p className="mt-3 text-sm text-slate-600 whitespace-pre-line">{current.notes}</p>}
            </div>

            {current.status === 'open' && (
              <div className="ui-card p-4">
                <p className="ui-label">Pay link</p>
                <div className="flex gap-2">
                  <input readOnly className="ui-input text-sm" value={current.pay_url || ''} onFocus={e => e.target.select()} />
                  <button onClick={() => copy(current.pay_url)} aria-label="Copy pay link" className="ui-btn ui-btn-secondary w-12 px-0 shrink-0"><Copy size={16} /></button>
                </div>
                {current.sent_at && <p className="text-xs text-slate-500 mt-2">Emailed {current.sent_count > 1 ? `${current.sent_count} times, last ` : ''}{new Date(current.sent_at).toLocaleString()}</p>}
              </div>
            )}

            <div className="grid sm:grid-cols-3 gap-3">
              {current.status === 'open' && <button onClick={() => act('send')} disabled={!!busy} className="ui-btn ui-btn-primary">{busy === 'send' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} {current.sent_at ? 'Send again' : 'Email to client'}</button>}
              <button onClick={() => downloadInvoicePdf(current, merchantName)} className="ui-btn ui-btn-secondary"><Download size={16} /> Download PDF</button>
              {current.status === 'open' && <button onClick={() => { if (window.confirm('Cancel this invoice? The pay link will stop working.')) act('void'); }} disabled={!!busy} className="ui-btn ui-btn-secondary text-red-600">{busy === 'void' ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />} Cancel invoice</button>}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
