// Account statement: pick a period, then Print, download a PDF, or download a CSV.
// Built from the user's own transactions (row-level security returns only theirs).
import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { receiptNumber } from './ReceiptModal';

const usd = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
const iso = (d) => d.toISOString().slice(0, 10);
const label = (t) => String(t || '').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

function presetRange(key) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  if (key === 'this_month') return [iso(new Date(y, m, 1)), iso(now)];
  if (key === 'last_month') return [iso(new Date(y, m - 1, 1)), iso(new Date(y, m, 0))];
  if (key === 'last_3') return [iso(new Date(y, m - 2, 1)), iso(now)];
  if (key === 'this_year') return [iso(new Date(y, 0, 1)), iso(now)];
  return null;
}

async function loadStatement(from, to) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Please sign in again.');
  const end = new Date(to + 'T23:59:59.999');
  const { data, error } = await supabase.from('transactions')
    .select('id, created_at, transaction_type, description, amount, status, metadata')
    .eq('user_id', user.id).gte('created_at', new Date(from + 'T00:00:00').toISOString()).lte('created_at', end.toISOString())
    .order('created_at', { ascending: true }).limit(5000);
  if (error) throw new Error('Could not load your transactions. Please try again.');
  const { data: prof } = await supabase.from('profiles').select('full_name, email').eq('id', user.id).maybeSingle();
  const rows = data || [];
  const done = rows.filter((r) => r.status === 'completed');
  const moneyIn = done.filter((r) => Number(r.amount) > 0).reduce((s, r) => s + Number(r.amount), 0);
  const moneyOut = done.filter((r) => Number(r.amount) < 0).reduce((s, r) => s + Number(r.amount), 0);
  return { rows, name: prof?.full_name || user.email, email: prof?.email || user.email, accountId: user.id, moneyIn, moneyOut };
}

async function buildPdf(st, from, to) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(37, 99, 235); doc.rect(0, 0, W, 70, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text('Infinite Future Bank', 40, 34);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.text('Account statement', 40, 52);
  doc.setTextColor(15, 23, 42); doc.setFontSize(10);
  doc.text(`Account holder: ${st.name}`, 40, 96);
  doc.text(`Account: ${st.accountId}`, 40, 110);
  doc.text(`Period: ${from} to ${to}`, 40, 124);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 138);
  doc.text(`Money in: ${usd(st.moneyIn)}`, W - 40, 96, { align: 'right' });
  doc.text(`Money out: ${usd(Math.abs(st.moneyOut))}`, W - 40, 110, { align: 'right' });
  doc.setFont('helvetica', 'bold'); doc.text(`Net: ${usd(st.moneyIn + st.moneyOut)}`, W - 40, 124, { align: 'right' });
  autoTable(doc, {
    startY: 156,
    head: [['Date', 'Description', 'Type', 'Status', 'Receipt', 'Amount (USD)']],
    body: st.rows.map((r) => [
      new Date(r.created_at).toLocaleDateString('en-GB'), r.description || '', label(r.transaction_type), label(r.status),
      receiptNumber(r), `${Number(r.amount) > 0 ? '+' : ''}${Number(r.amount).toFixed(2)}`,
    ]),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    columnStyles: { 1: { cellWidth: 170 }, 5: { halign: 'right' } },
    didDrawPage: () => {
      const H = doc.internal.pageSize.getHeight();
      doc.setFontSize(7); doc.setTextColor(148, 163, 184);
      doc.text('Infinite Future Bank LLC · Delaware, USA (File No. 10649108). Generated from your IFB account records.', 40, H - 20);
      doc.text(`Page ${doc.internal.getNumberOfPages()}`, W - 40, H - 20, { align: 'right' });
    },
  });
  if (st.rows.length === 0) { doc.setFontSize(10); doc.setTextColor(100, 116, 139); doc.text('No transactions in this period.', 40, 190); }
  return doc;
}

function toCsv(st) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [['Date', 'Description', 'Type', 'Status', 'Receipt', 'Transaction ID', 'Amount (USD)'].map(esc).join(',')];
  for (const r of st.rows) {
    lines.push([new Date(r.created_at).toISOString(), r.description, r.transaction_type, r.status, receiptNumber(r), r.id, Number(r.amount).toFixed(2)].map(esc).join(','));
  }
  return lines.join('\n');
}

export default function StatementExportModal({ showStatementModal, setShowStatementModal, triggerGlobalActionNotification }) {
  const [preset, setPreset] = useState('this_month');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [busy, setBusy] = useState('');
  const [from, to] = useMemo(() => (preset === 'custom' ? [custom.from, custom.to] : presetRange(preset)), [preset, custom]);
  if (!showStatementModal) return null;
  const close = () => setShowStatementModal(false);
  const valid = from && to && from <= to;

  const run = async (kind) => {
    setBusy(kind);
    try {
      const st = await loadStatement(from, to);
      const base = `IFB-statement-${from}-to-${to}`;
      if (kind === 'csv') {
        const url = URL.createObjectURL(new Blob([toCsv(st)], { type: 'text/csv' }));
        const a = document.createElement('a'); a.href = url; a.download = `${base}.csv`; a.click(); URL.revokeObjectURL(url);
      } else {
        const doc = await buildPdf(st, from, to);
        if (kind === 'print') {
          doc.autoPrint();
          const w = window.open(doc.output('bloburl'), '_blank');
          if (!w) doc.save(`${base}.pdf`);   // pop-ups blocked: fall back to download
        } else {
          doc.save(`${base}.pdf`);
        }
      }
      triggerGlobalActionNotification?.('success', `Statement ready: ${st.rows.length} transaction${st.rows.length === 1 ? '' : 's'}.`);
    } catch (e) {
      triggerGlobalActionNotification?.('error', e.message);
    } finally { setBusy(''); }
  };

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200 md:p-4" onClick={close}>
      <div className="w-full md:max-w-md bg-white rounded-t-3xl md:rounded-3xl shadow-2xl p-5 md:p-6 space-y-5 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="ui-sheet-title">Statement</h3>
          <button onClick={close} aria-label="Close" className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"><X size={18} /></button>
        </div>
        <div>
          <label className="ui-label">Period</label>
          <select className="ui-select" value={preset} onChange={(e) => setPreset(e.target.value)}>
            <option value="this_month">This month</option>
            <option value="last_month">Last month</option>
            <option value="last_3">Last 3 months</option>
            <option value="this_year">This year</option>
            <option value="custom">Custom dates</option>
          </select>
        </div>
        {preset === 'custom' && (
          <div className="grid grid-cols-2 gap-3">
            <div><label className="ui-label">From</label><input type="date" className="ui-input" value={custom.from} max={custom.to || undefined} onChange={(e) => setCustom({ ...custom, from: e.target.value })} /></div>
            <div><label className="ui-label">To</label><input type="date" className="ui-input" value={custom.to} min={custom.from || undefined} onChange={(e) => setCustom({ ...custom, to: e.target.value })} /></div>
          </div>
        )}
        <p className="text-sm text-slate-500">Includes every transaction in the period with its receipt number, plus money in, money out and net totals.</p>
        <div className="space-y-3">
          <button disabled={!valid || !!busy} onClick={() => run('print')} className="ui-btn ui-btn-primary">{busy === 'print' ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />} Print statement</button>
          <div className="grid grid-cols-2 gap-3">
            <button disabled={!valid || !!busy} onClick={() => run('pdf')} className="ui-btn ui-btn-secondary">{busy === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} PDF</button>
            <button disabled={!valid || !!busy} onClick={() => run('csv')} className="ui-btn ui-btn-secondary">{busy === 'csv' ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />} CSV</button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
