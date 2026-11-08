// Agent side of a support case: ticket facts, the linked transaction (traced), a trace box,
// and settling the case (resolve / refund / reject) through resolve_support_ticket.
import React, { useEffect, useState } from 'react';
import { Search, Loader2, CheckCircle2, AlertTriangle, Undo2, XCircle } from 'lucide-react';

const usd = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
const when = (d) => (d ? new Date(d).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '');

function TraceResult({ r }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3 text-sm space-y-1">
      <div className="flex justify-between gap-2"><span className="font-semibold text-slate-900 truncate">{r.description || r.type}</span><span className="ui-amount font-semibold">{usd(r.amount)}</span></div>
      <p className="text-xs text-slate-500 break-all">{r.kind} · {r.id}</p>
      {r.holder && <p className="text-xs text-slate-500">Holder: {r.holder}</p>}
      <p className="text-xs text-slate-600">Started {when(r.created_at)}{r.completed_at ? ` · completed ${when(r.completed_at)}` : ''}</p>
      <p className="text-xs font-semibold text-slate-800">Status: {String(r.status).replace(/_/g, ' ')}{r.agent ? ` · agent ${r.agent}` : ''}</p>
      {r.reference && <p className="text-xs text-slate-500 break-all">Ref: {r.reference}</p>}
      {(r.disputes || []).length > 0 && <p className="text-xs text-amber-700">Disputes: {r.disputes.map((d) => `${d.number} (${d.outcome || d.status})`).join(', ')}</p>}
    </div>
  );
}

export default function SupportCasePanel({ supabase, ticket, onSettled }) {
  const [linked, setLinked] = useState(null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState('');
  const [outcome, setOutcome] = useState(ticket.category === 'dispute' ? 'refunded' : 'resolved');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    setLinked(null); setResults(null); setMsg(null); setNote('');
    setOutcome(ticket.category === 'dispute' ? 'refunded' : 'resolved');
    if (ticket.transaction_id) {
      supabase.rpc('trace_transaction', { p_ref: ticket.transaction_id }).then(({ data }) => {
        const tx = (data || []).find((r) => r.kind === 'transaction') || null;
        setLinked(tx);
        if (tx) setAmount(String(Math.abs(Number(tx.amount)).toFixed(2)));
      }, () => {});
    }
  }, [ticket.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const trace = async (e) => {
    e.preventDefault(); setBusy('trace');
    const { data, error } = await supabase.rpc('trace_transaction', { p_ref: q.trim() });
    setBusy(''); setResults(error ? [] : data || []);
  };
  const settle = async () => {
    setBusy('settle'); setMsg(null);
    const { data, error } = await supabase.rpc('resolve_support_ticket', {
      p_ticket_id: ticket.id, p_outcome: outcome, p_note: note, p_refund: outcome === 'refunded' ? Number(amount) : null,
    });
    setBusy('');
    if (error) return setMsg({ type: 'err', text: error.message });
    setMsg({ type: 'ok', text: outcome === 'refunded' ? `Refunded ${usd(data.refund)} to the customer's wallet.` : 'Case settled. The customer was notified.' });
    onSettled?.();
  };
  const settled = ticket.outcome || ticket.status === 'resolved';

  return (
    <div className="p-5 border-b border-slate-200 space-y-4">
      <div>
        <p className="text-xs text-slate-500">Case</p>
        <p className="text-base font-semibold text-slate-900">{ticket.number || ticket.id.slice(0, 8)}</p>
        <div className="flex flex-wrap gap-1.5 mt-1">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">{ticket.category || 'general'}</span>
          {ticket.priority && ticket.priority !== 'normal' && <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-red-50 text-red-700">{ticket.priority}</span>}
        </div>
      </div>

      {ticket.transaction_id && (
        <div>
          <p className="ui-label">Linked transaction</p>
          {linked ? <TraceResult r={linked} /> : <p className="text-xs text-slate-500">Loading…</p>}
        </div>
      )}

      <form onSubmit={trace} className="space-y-2">
        <p className="ui-label">Trace a transaction</p>
        <div className="flex gap-2">
          <input className="ui-input text-sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Receipt no., ID or reference" />
          <button disabled={q.trim().length < 6 || !!busy} aria-label="Trace" className="ui-btn ui-btn-secondary w-12 px-0 shrink-0">{busy === 'trace' ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}</button>
        </div>
        {results && results.length === 0 && <p className="text-xs text-slate-500">Nothing found.</p>}
        {(results || []).map((r) => <TraceResult key={r.kind + r.id} r={r} />)}
      </form>

      {!settled ? (
        <div className="space-y-2">
          <p className="ui-label">Settle this case</p>
          <div className="grid grid-cols-3 gap-1.5">
            {[['resolved', 'Resolve', CheckCircle2], ['refunded', 'Refund', Undo2], ['rejected', 'Reject', XCircle]].map(([v, l, Icon]) => (
              <button key={v} type="button" disabled={v === 'refunded' && !ticket.transaction_id} onClick={() => setOutcome(v)}
                className={`h-10 rounded-lg text-sm font-semibold border flex items-center justify-center gap-1 disabled:opacity-40 ${outcome === v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200'}`}>
                <Icon size={14} /> {l}
              </button>
            ))}
          </div>
          {outcome === 'refunded' && (
            <div>
              <label className="ui-label">Refund amount (USD)</label>
              <input type="number" min="0.01" step="0.01" max={linked ? Math.abs(Number(linked.amount)) : undefined} className="ui-input" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <p className="text-xs text-slate-500 mt-1">Credited to the customer's IFB wallet, at most the disputed amount, once.</p>
            </div>
          )}
          <label className="ui-label">Message to the customer</label>
          <textarea className="ui-textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Explain the outcome in plain words." />
          <button type="button" onClick={settle} disabled={note.trim().length < 3 || !!busy || (outcome === 'refunded' && !(Number(amount) > 0))} className="ui-btn ui-btn-primary">
            {busy === 'settle' ? <Loader2 size={16} className="animate-spin" /> : null}
            {outcome === 'refunded' ? `Refund ${usd(amount)} and close` : outcome === 'rejected' ? 'Reject and close' : 'Resolve and close'}
          </button>
        </div>
      ) : (
        <p className="text-sm text-emerald-700 flex items-center gap-1.5"><CheckCircle2 size={14} /> Settled{ticket.outcome ? `: ${ticket.outcome}` : ''}{ticket.refund_amount ? ` (${usd(ticket.refund_amount)})` : ''}</p>
      )}
      {msg && <p className={`text-sm p-2.5 rounded-lg border ${msg.type === 'err' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{msg.type === 'err' && <AlertTriangle size={14} className="inline mr-1" />}{msg.text}</p>}
    </div>
  );
}
