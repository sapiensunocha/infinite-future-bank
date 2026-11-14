// Receipt for any transaction: on-screen view + PDF download + share.
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Clock, XCircle, Download, Share2, X, Loader2, Building2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

const usd = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
export const receiptNumber = (tx) => `IFB-${String(tx?.id || '').replace(/-/g, '').slice(0, 10).toUpperCase()}`;

const STATUS = {
  completed: { label: 'Completed', Icon: CheckCircle2, cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  pending:   { label: 'Pending',   Icon: Clock,        cls: 'text-amber-700 bg-amber-50 border-amber-200' },
  failed:    { label: 'Failed',    Icon: XCircle,      cls: 'text-red-700 bg-red-50 border-red-200' },
  cancelled: { label: 'Cancelled', Icon: XCircle,      cls: 'text-slate-600 bg-slate-50 border-slate-200' },
};

const TYPE_LABELS = {
  p2p_send: 'Money sent', p2p_transfer: 'Transfer', internal_transfer: 'Move between accounts', p2p_receive: 'Money received', request_send: 'Payment request paid', request_receive: 'Payment request received',
  payroll_send: 'Salary paid', payroll_receive: 'Salary received', payroll_fee: 'Payroll fee', deposit: 'Money added',
  card_payout: 'Withdrawal to card', withdrawal: 'Withdrawal', withdraw: 'Withdrawal',
};
const typeLabel = (t) => TYPE_LABELS[t] || String(t || 'Transaction').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export function receiptRows(tx, counterparty, holder) {
  const meta = tx.metadata || {};
  const rows = [
    ['Receipt number', receiptNumber(tx)],
    ['Date', new Date(tx.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })],
    ['Type', typeLabel(tx.transaction_type)],
    ['Description', tx.description || '—'],
  ];
  if (counterparty) rows.push([Number(tx.amount) >= 0 ? 'From' : 'To', counterparty]);
  if (meta.asset && meta.asset !== 'USD') rows.push(['Currency', meta.asset]);
  if (holder) rows.push(['Account holder', holder]);
  rows.push(['Transaction ID', tx.id]);
  if (meta.ref || meta.reference || tx.external_id) rows.push(['Reference', String(meta.ref || meta.reference || tx.external_id)]);
  return rows;
}

/** The receipt as a PNG image (drawn on a canvas, so it works offline and needs no extra library). */
export async function receiptImage(tx, counterparty, holder) {
  const rows = receiptRows(tx, counterparty, holder);
  const st = STATUS[tx.status] || STATUS.completed;
  const W = 720, PAD = 44, LABEL_W = 210, LINE = 34, SCALE = 2;
  const font = (size, weight = 400) => `${weight} ${size}px -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
  const measure = document.createElement('canvas').getContext('2d');
  const wrap = (text, maxWidth, f) => {
    measure.font = f;
    const out = []; let line = '';
    for (const word of String(text).split(/\s+/)) {
      // Break words longer than the column (long IDs).
      let w = word;
      while (measure.measureText(w).width > maxWidth && w.length > 1) {
        let n = w.length; while (n > 1 && measure.measureText(w.slice(0, n)).width > maxWidth) n--;
        if (line) { out.push(line); line = ''; }
        out.push(w.slice(0, n)); w = w.slice(n);
      }
      const next = line ? `${line} ${w}` : w;
      if (measure.measureText(next).width > maxWidth && line) { out.push(line); line = w; } else line = next;
    }
    if (line) out.push(line);
    return out.length ? out : [''];
  };
  const valueW = W - PAD * 2 - LABEL_W;
  const wrapped = rows.map(([k, v]) => [k, wrap(v, valueW, font(20))]);
  const bodyH = wrapped.reduce((h, [, lines]) => h + lines.length * LINE + 22, 0);
  const H = 300 + bodyH + 70;

  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE; canvas.height = H * SCALE;
  const c = canvas.getContext('2d');
  c.scale(SCALE, SCALE);
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H);
  c.fillStyle = '#2563eb'; c.fillRect(0, 0, W, 110);
  c.fillStyle = '#ffffff'; c.textBaseline = 'alphabetic';
  c.font = font(28, 700); c.fillText('Infinite Future Bank', PAD, 54);
  c.font = font(18); c.fillText('Transaction receipt', PAD, 84);
  c.fillStyle = '#0f172a'; c.font = font(46, 700);
  c.fillText(`${Number(tx.amount) > 0 ? '+' : ''}${usd(tx.amount)}`, PAD, 190);
  c.fillStyle = '#64748b'; c.font = font(20); c.fillText(st.label, PAD, 226);
  let y = 290;
  for (const [k, lines] of wrapped) {
    c.fillStyle = '#64748b'; c.font = font(20); c.fillText(k, PAD, y);
    c.fillStyle = '#0f172a';
    lines.forEach((ln, i) => c.fillText(ln, PAD + LABEL_W, y + i * LINE));
    y += lines.length * LINE + 22;
    c.strokeStyle = '#e2e8f0'; c.lineWidth = 1; c.beginPath(); c.moveTo(PAD, y - 26); c.lineTo(W - PAD, y - 26); c.stroke();
  }
  c.fillStyle = '#94a3b8'; c.font = font(16);
  c.fillText('Infinite Future Bank · app.infinitefuturebank.org', PAD, H - 30);
  const blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Could not create the image.'))), 'image/png'));
  return { blob, name: `IFB-receipt-${receiptNumber(tx)}.png` };
}

/** Save a file: the share sheet on phones (so it can go to Photos/Files), a download elsewhere. */
export async function saveFile(blob, name, type) {
  const file = new File([blob], name, { type });
  const touch = typeof navigator !== 'undefined' && (navigator.maxTouchPoints > 0 || window.Capacitor?.isNativePlatform?.());
  if (touch && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); return 'shared'; }
    catch (e) { if (e?.name === 'AbortError') return 'cancelled'; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return 'downloaded';
}

export async function downloadReceiptPdf(tx, counterparty, holder) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a5' });
  const W = doc.internal.pageSize.getWidth();
  const st = STATUS[tx.status] || STATUS.completed;
  doc.setFillColor(37, 99, 235); doc.rect(0, 0, W, 64, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
  doc.text('Infinite Future Bank', 28, 30);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.text('Transaction receipt', 28, 48);
  doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold'); doc.setFontSize(24);
  doc.text(`${Number(tx.amount) > 0 ? '+' : ''}${usd(tx.amount)}`, 28, 104);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(100, 116, 139);
  doc.text(st.label, 28, 122);
  let y = 152;
  for (const [k, v] of receiptRows(tx, counterparty, holder)) {
    doc.setTextColor(100, 116, 139); doc.text(k, 28, y);
    doc.setTextColor(15, 23, 42);
    const lines = doc.splitTextToSize(String(v), W - 170);
    doc.text(lines, 150, y);
    y += 18 * lines.length + 4;
    doc.setDrawColor(226, 232, 240); doc.line(28, y - 12, W - 28, y - 12);
  }
  doc.setFontSize(8); doc.setTextColor(148, 163, 184);
  doc.text(doc.splitTextToSize('Infinite Future Bank LLC · Delaware, USA (File No. 10649108). This receipt was generated from your IFB account records. Keep it for your files.', W - 56), 28, doc.internal.pageSize.getHeight() - 40);
  const name = `${receiptNumber(tx)}.pdf`;
  return { doc, name };
}

export default function ReceiptModal({ tx, holderName, onClose }) {
  const [counterparty, setCounterparty] = useState(null);
  const [busy, setBusy] = useState('');
  const meta = tx?.metadata || {};

  useEffect(() => {
    let live = true;
    const id = meta.counterparty || meta.related_user_id;
    if (id) {
      supabase.from('profiles_public').select('full_name').eq('id', id).maybeSingle()
        .then(({ data }) => { if (live && data?.full_name) setCounterparty(data.full_name); }, () => {});
    }
    return () => { live = false; };
  }, [tx?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!tx) return null;
  const st = STATUS[tx.status] || STATUS.completed;
  const isPos = Number(tx.amount) > 0;

  const download = async () => {
    setBusy('pdf');
    try { const { doc, name } = await downloadReceiptPdf(tx, counterparty, holderName); doc.save(name); }
    finally { setBusy(''); }
  };
  const saveImage = async () => {
    setBusy('png');
    try { const { blob, name } = await receiptImage(tx, counterparty, holderName); await saveFile(blob, name, 'image/png'); }
    catch { /* nothing to show: the receipt stays on screen */ }
    finally { setBusy(''); }
  };
  const share = async () => {
    setBusy('share');
    try {
      const { doc, name } = await downloadReceiptPdf(tx, counterparty, holderName);
      const file = new File([doc.output('blob')], name, { type: 'application/pdf' });
      const text = `IFB receipt ${receiptNumber(tx)}: ${isPos ? '+' : ''}${usd(tx.amount)} · ${typeLabel(tx.transaction_type)} · ${new Date(tx.created_at).toLocaleDateString()}`;
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: 'IFB receipt', text });
      else if (navigator.share) await navigator.share({ title: 'IFB receipt', text });
      else { await navigator.clipboard?.writeText(text); doc.save(name); }
    } catch { /* user cancelled share */ }
    finally { setBusy(''); }
  };

  // On <body> so the bottom navigation bar can't cover it.
  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200 md:p-4" onClick={onClose}>
      <div className="w-full md:max-w-md bg-white rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5">
          <h3 className="ui-sheet-title">Receipt</h3>
          <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"><X size={18} /></button>
        </div>

        <div className="px-5 pt-4 pb-2 text-center">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500"><Building2 size={16} className="text-blue-600" /> Infinite Future Bank</div>
          <p className={`mt-3 text-3xl font-bold ui-amount ${isPos ? 'text-emerald-600' : 'text-slate-900'}`}>{isPos ? '+' : ''}{usd(tx.amount)}</p>
          <span className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border ${st.cls}`}><st.Icon size={12} /> {st.label}</span>
        </div>

        <dl className="mx-5 my-4 rounded-2xl border border-slate-200 divide-y divide-slate-100">
          {receiptRows(tx, counterparty, holderName).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 px-4 py-3 text-sm">
              <dt className="text-slate-500 shrink-0">{k}</dt>
              <dd className="text-slate-900 font-medium text-right break-all">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="px-5 -mt-1 mb-3 flex justify-center">
          <button onClick={() => { onClose(); window.dispatchEvent(new CustomEvent('ifb:open-help', { detail: { view: 'dispute', tx } })); }}
            className="text-sm font-semibold text-amber-700 hover:underline">Report a problem with this payment</button>
        </div>

        <div className="grid grid-cols-2 gap-3 px-5">
          <button onClick={download} disabled={!!busy} className="ui-btn ui-btn-secondary">{busy === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} PDF</button>
          <button onClick={saveImage} disabled={!!busy} className="ui-btn ui-btn-secondary">{busy === 'png' ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />} Image</button>
        </div>
        <div className="px-5 pt-3 pb-6">
          <button onClick={share} disabled={!!busy} className="ui-btn ui-btn-primary w-full">{busy === 'share' ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />} Share</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
