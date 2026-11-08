// Help & Support centre: AI assistant, live chat with an IFB agent, disputes and transaction tracing.
// Server: migration 20261119_support.sql (create_support_ticket, open_dispute, trace_transaction,
// realtime on support_messages). Open from anywhere with:
//   window.dispatchEvent(new CustomEvent('ifb:open-help', { detail: { view: 'dispute', tx } }))
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, ArrowLeft, Bot, MessageCircle, Search, AlertTriangle, ChevronRight, Loader2, Send, CheckCircle2, Clock, ShieldCheck, Receipt,
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { receiptNumber } from '../../components/modals/ReceiptModal';

const usd = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
const when = (d) => (d ? new Date(d).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '');
const CATEGORIES = [
  ['withdrawal', 'Withdrawal or payout'], ['deposit', 'Adding money'], ['transfer', 'Sending or receiving money'],
  ['card', 'Card'], ['kyc', 'Identity verification'], ['account', 'My account or login'], ['invoice', 'Invoices or payment pages'],
  ['fraud', 'Fraud or unauthorised activity'], ['general', 'Something else'],
];
const STATUS_WORDS = {
  completed: 'Completed', succeeded: 'Completed', pending: 'Pending', failed: 'Failed', cancelled: 'Cancelled', expired: 'Expired',
  open: 'Waiting for an agent', locked_in_escrow: 'Held safely while the agent pays you', proof_uploaded: 'Agent sent proof of payment',
  disputed: 'Under dispute', flw_processing: 'Being sent to your bank / mobile wallet',
};
const statusWords = (s) => STATUS_WORDS[s] || String(s || '').replace(/_/g, ' ');
const DISPUTE_REASONS = ['Recipient did not receive it', 'I was charged twice', 'Wrong amount', 'I did not make this payment', 'Goods or service not received', 'Other'];

function TicketStatus({ t }) {
  if (t.status === 'resolved' || t.status === 'closed') {
    const label = t.outcome === 'refunded' ? `Refunded ${usd(t.refund_amount)}` : t.outcome === 'rejected' ? 'Reviewed' : 'Resolved';
    return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md border text-emerald-700 bg-emerald-50 border-emerald-200"><CheckCircle2 size={11} /> {label}</span>;
  }
  if (t.last_sender === 'agent') return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md border text-blue-700 bg-blue-50 border-blue-200"><MessageCircle size={11} /> Agent replied</span>;
  return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md border text-amber-700 bg-amber-50 border-amber-200"><Clock size={11} /> Waiting for agent</span>;
}

function useRecentTransactions(userId) {
  const [txs, setTxs] = useState([]);
  useEffect(() => {
    if (!userId) return;
    supabase.from('transactions').select('id, created_at, description, transaction_type, amount, status')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(30)
      .then(({ data }) => setTxs(data || []), () => {});
  }, [userId]);
  return txs;
}

function Thread({ ticket, userId, onBack }) {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [t, setT] = useState(ticket);
  const end = useRef(null);

  useEffect(() => {
    let live = true;
    supabase.from('support_messages').select('id, sender_type, message, created_at').eq('ticket_id', ticket.id).order('created_at')
      .then(({ data }) => { if (live) setMsgs(data || []); }, () => {});
    const ch = supabase.channel(`help_${ticket.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${ticket.id}` },
        (p) => setMsgs((m) => (m.some((x) => x.id === p.new.id) ? m : [...m, p.new])))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_tickets', filter: `id=eq.${ticket.id}` },
        (p) => setT((old) => ({ ...old, ...p.new })))
      .subscribe();
    return () => { live = false; supabase.removeChannel(ch); };
  }, [ticket.id]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs.length]);

  const send = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    const { data, error } = await supabase.from('support_messages')
      .insert({ ticket_id: ticket.id, sender_id: userId, sender_type: 'user', message: body }).select('id, sender_type, message, created_at').single();
    if (!error && data) { setMsgs((m) => (m.some((x) => x.id === data.id) ? m : [...m, data])); setText(''); }
    setSending(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-1 pb-3 border-b border-slate-100">
        <button onClick={onBack} className="text-sm font-semibold text-slate-500 flex items-center gap-1.5 mb-2"><ArrowLeft size={16} /> My requests</button>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-slate-500">{t.number}</p>
            <p className="text-base font-semibold text-slate-900 truncate">{t.subject}</p>
          </div>
          <TicketStatus t={t} />
        </div>
        {t.transaction_id && <p className="mt-1 text-xs text-slate-500 flex items-center gap-1"><Receipt size={12} /> About transaction {receiptNumber({ id: t.transaction_id })}</p>}
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-slate-50/60">
        {msgs.map((m) => (
          m.sender_type === 'system'
            ? <p key={m.id} className="text-center text-xs text-slate-500 bg-white border border-slate-200 rounded-xl px-3 py-2 mx-4">{m.message}</p>
            : (
              <div key={m.id} className={`flex ${m.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${m.sender_type === 'user' ? 'bg-blue-600 text-white rounded-br-md' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md'}`}>
                  {m.sender_type === 'agent' && <p className="text-xs font-semibold text-blue-700 mb-0.5">IFB support</p>}
                  <p className="whitespace-pre-line">{m.message}</p>
                  <p className={`text-[11px] mt-1 ${m.sender_type === 'user' ? 'text-blue-100' : 'text-slate-400'}`}>{when(m.created_at)}</p>
                </div>
              </div>
            )
        ))}
        <div ref={end} />
      </div>
      <form onSubmit={send} className="p-3 border-t border-slate-100 flex gap-2 bg-white">
        <input className="ui-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message…" maxLength={4000} />
        <button disabled={!text.trim() || sending} aria-label="Send" className="ui-btn ui-btn-primary w-12 px-0 shrink-0">{sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}</button>
      </form>
    </div>
  );
}

export default function HelpCenter({ session, initial, onClose, onOpenAssistant }) {
  const userId = session?.user?.id;
  const [view, setView] = useState(initial?.view || 'home');   // home | new | dispute | trace | tickets | thread
  const [tickets, setTickets] = useState([]);
  const [active, setActive] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ category: 'withdrawal', subject: '', message: '', transaction_id: initial?.tx?.id || '' });
  const [dispute, setDispute] = useState({ reason: DISPUTE_REASONS[0], details: '', tx: initial?.tx || null });
  const [traceQ, setTraceQ] = useState(initial?.ref || '');
  const [traceRes, setTraceRes] = useState(null);
  const txs = useRecentTransactions(userId);

  const loadTickets = async () => {
    const { data } = await supabase.from('support_tickets')
      .select('id, number, subject, status, outcome, refund_amount, category, transaction_id, last_sender, last_message_at, created_at')
      .eq('user_id', userId).order('last_message_at', { ascending: false, nullsFirst: false }).limit(50);
    setTickets(data || []);
  };
  useEffect(() => { if (userId) loadTickets(); }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps
  const openTicketById = async (id) => {
    await loadTickets();
    const { data } = await supabase.from('support_tickets').select('*').eq('id', id).maybeSingle();
    if (data) { setActive(data); setView('thread'); }
  };
  const go = (v) => { setError(''); setView(v); };

  const submitTicket = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    const { data, error: err } = await supabase.rpc('create_support_ticket', {
      p_category: form.category, p_subject: form.subject, p_message: form.message, p_transaction_id: form.transaction_id || null,
    });
    setBusy(false);
    if (err) return setError(err.message);
    setForm({ category: 'withdrawal', subject: '', message: '', transaction_id: '' });
    openTicketById(data.id);
  };
  const submitDispute = async (e) => {
    e.preventDefault();
    if (!dispute.tx) return setError('Choose the transaction you want to dispute.');
    setBusy(true); setError('');
    const { data, error: err } = await supabase.rpc('open_dispute', { p_transaction_id: dispute.tx.id, p_reason: dispute.reason, p_details: dispute.details });
    setBusy(false);
    if (err) return setError(err.message);
    openTicketById(data.id);
  };
  const runTrace = async (e) => {
    e?.preventDefault(); setBusy(true); setError(''); setTraceRes(null);
    const { data, error: err } = await supabase.rpc('trace_transaction', { p_ref: traceQ.trim() });
    setBusy(false);
    if (err) return setError(err.message);
    setTraceRes(data || []);
  };
  useEffect(() => { if (initial?.view === 'trace' && initial?.ref) runTrace(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openCount = useMemo(() => tickets.filter((t) => !['resolved', 'closed'].includes(t.status)).length, [tickets]);
  const Back = ({ to = 'home' }) => <button onClick={() => go(to)} className="text-sm font-semibold text-slate-500 flex items-center gap-1.5"><ArrowLeft size={16} /> Help</button>;
  const Row = ({ Icon, title, desc, onClick, tone = 'bg-blue-50 text-blue-600' }) => (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 active:bg-slate-100">
      <span className={`w-10 h-10 rounded-xl ${tone} flex items-center justify-center shrink-0`}><Icon size={18} /></span>
      <span className="flex-1 min-w-0"><span className="block text-[15px] font-semibold text-slate-900">{title}</span><span className="block text-sm text-slate-500">{desc}</span></span>
      <ChevronRight size={16} className="text-slate-300" />
    </button>
  );

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200 md:p-4" onClick={onClose}>
      <div className="w-full md:max-w-lg bg-white rounded-t-3xl md:rounded-3xl shadow-2xl h-[92vh] md:h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="ui-sheet-title">Help &amp; support</h3>
          <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"><X size={18} /></button>
        </div>

        {view === 'thread' && active ? (
          <div className="flex-1 min-h-0"><Thread ticket={active} userId={userId} onBack={() => { loadTickets(); go('tickets'); }} /></div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-4">
            {error && <p className="p-3 rounded-xl text-sm font-medium bg-red-50 text-red-700 border border-red-200">{error}</p>}

            {view === 'home' && (
              <>
                <div className="ui-card divide-y divide-slate-100 overflow-hidden">
                  <Row Icon={Bot} title="Ask the IFB assistant" desc="Instant answers, any time (AI)" onClick={() => { onClose(); onOpenAssistant?.(); }} tone="bg-indigo-50 text-indigo-600" />
                  <Row Icon={MessageCircle} title="Chat with a person" desc="An IFB agent replies in the app" onClick={() => go('new')} />
                  <Row Icon={AlertTriangle} title="Report a problem with a payment" desc="Open a dispute on a transaction" onClick={() => go('dispute')} tone="bg-amber-50 text-amber-600" />
                  <Row Icon={Search} title="Trace a transaction" desc="Use a receipt number, transaction ID or reference" onClick={() => go('trace')} tone="bg-emerald-50 text-emerald-600" />
                </div>
                <div className="ui-card divide-y divide-slate-100 overflow-hidden">
                  <button onClick={() => go('tickets')} className="w-full flex items-center justify-between p-4 hover:bg-slate-50">
                    <span className="text-[15px] font-semibold text-slate-900">My requests</span>
                    <span className="text-sm text-slate-500 flex items-center gap-2">{openCount > 0 && <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-xs font-semibold">{openCount} open</span>}<ChevronRight size={16} className="text-slate-300" /></span>
                  </button>
                </div>
                <p className="text-xs text-slate-500 flex items-start gap-2"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-600" /> IFB staff will never ask for your password, PIN or one-time code. Only talk to support inside this app.</p>
              </>
            )}

            {view === 'tickets' && (
              <>
                <Back />
                <h4 className="text-lg font-semibold text-slate-900">My requests</h4>
                <div className="ui-card divide-y divide-slate-100 overflow-hidden">
                  {tickets.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">No requests yet.</p> : tickets.map((t) => (
                    <button key={t.id} onClick={() => { setActive(t); setView('thread'); }} className="w-full text-left p-4 hover:bg-slate-50 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{t.subject || 'Support request'}</p>
                        <p className="text-xs text-slate-500">{t.number} · {when(t.last_message_at || t.created_at)}</p>
                      </div>
                      <TicketStatus t={t} />
                    </button>
                  ))}
                </div>
                <button onClick={() => go('new')} className="ui-btn ui-btn-primary"><MessageCircle size={16} /> New request</button>
              </>
            )}

            {view === 'new' && (
              <form onSubmit={submitTicket} className="space-y-4">
                <Back />
                <h4 className="text-lg font-semibold text-slate-900">Chat with a person</h4>
                <div><label className="ui-label">What is it about?</label>
                  <select className="ui-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                <div><label className="ui-label">Related transaction (optional)</label>
                  <select className="ui-select" value={form.transaction_id} onChange={(e) => setForm({ ...form, transaction_id: e.target.value })}>
                    <option value="">None</option>
                    {txs.map((t) => <option key={t.id} value={t.id}>{new Date(t.created_at).toLocaleDateString()} · {t.description || t.transaction_type} · {usd(t.amount)}</option>)}
                  </select></div>
                <div><label className="ui-label">Subject</label><input className="ui-input" maxLength={100} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Payout to GTBank not received" /></div>
                <div><label className="ui-label">Message</label><textarea className="ui-textarea" required minLength={3} maxLength={4000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Tell us what happened. Never share your password or codes." /></div>
                <button disabled={busy || form.message.trim().length < 3} className="ui-btn ui-btn-primary">{busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Send to support</button>
              </form>
            )}

            {view === 'dispute' && (
              <form onSubmit={submitDispute} className="space-y-4">
                <Back />
                <h4 className="text-lg font-semibold text-slate-900">Report a problem with a payment</h4>
                <div><label className="ui-label">Transaction</label>
                  <select className="ui-select" value={dispute.tx?.id || ''} onChange={(e) => setDispute({ ...dispute, tx: txs.find((t) => t.id === e.target.value) || (initial?.tx?.id === e.target.value ? initial.tx : null) })}>
                    <option value="">Choose a transaction</option>
                    {initial?.tx && !txs.some((t) => t.id === initial.tx.id) && <option value={initial.tx.id}>{initial.tx.description || 'Selected transaction'} · {usd(initial.tx.amount)}</option>}
                    {txs.map((t) => <option key={t.id} value={t.id}>{new Date(t.created_at).toLocaleDateString()} · {t.description || t.transaction_type} · {usd(t.amount)}</option>)}
                  </select>
                  {dispute.tx && <p className="text-xs text-slate-500 mt-1">Receipt {receiptNumber(dispute.tx)}</p>}
                </div>
                <div><label className="ui-label">What went wrong?</label>
                  <select className="ui-select" value={dispute.reason} onChange={(e) => setDispute({ ...dispute, reason: e.target.value })}>{DISPUTE_REASONS.map((r) => <option key={r}>{r}</option>)}</select></div>
                <div><label className="ui-label">Details</label><textarea className="ui-textarea" maxLength={3000} value={dispute.details} onChange={(e) => setDispute({ ...dispute, details: e.target.value })} placeholder="Dates, names, what you expected — anything that helps us investigate." /></div>
                <p className="text-xs text-slate-500">An IFB agent investigates and replies in the chat. If the dispute is upheld, the money is refunded to your IFB wallet.</p>
                <button disabled={busy || !dispute.tx} className="ui-btn ui-btn-primary">{busy ? <Loader2 size={16} className="animate-spin" /> : <AlertTriangle size={16} />} Open dispute</button>
              </form>
            )}

            {view === 'trace' && (
              <>
                <Back />
                <h4 className="text-lg font-semibold text-slate-900">Trace a transaction</h4>
                <form onSubmit={runTrace} className="flex gap-2">
                  <input className="ui-input" value={traceQ} onChange={(e) => setTraceQ(e.target.value)} placeholder="IFB-1A2B3C4D5E, transaction ID or reference" />
                  <button disabled={busy || traceQ.trim().length < 6} aria-label="Trace" className="ui-btn ui-btn-primary w-12 px-0 shrink-0">{busy ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}</button>
                </form>
                <p className="text-xs text-slate-500">The receipt number is on every receipt (tap a transaction in History). Payout references start with IFB-BANK-, deposits with IFB.INSTANT.</p>
                {traceRes && traceRes.length === 0 && <p className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-600">Nothing found on your account for “{traceQ}”. Check the number, or ask support.</p>}
                {(traceRes || []).map((r) => (
                  <div key={r.kind + r.id} className="ui-card p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{r.description || r.type}</p>
                        <p className="text-xs text-slate-500">{r.kind === 'transaction' ? receiptNumber(r) : r.reference || r.id}</p>
                      </div>
                      <p className={`text-sm font-bold ui-amount ${Number(r.amount) > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>{Number(r.amount) > 0 ? '+' : ''}{usd(r.amount)}</p>
                    </div>
                    <ol className="text-sm text-slate-600 space-y-1 border-l-2 border-slate-200 pl-3">
                      <li>Started · {when(r.created_at)}</li>
                      {r.locked_at && <li>Agent accepted{r.agent ? ` (${r.agent})` : ''} · {when(r.locked_at)}</li>}
                      {r.completed_at && <li>Completed · {when(r.completed_at)}</li>}
                      <li className="font-semibold text-slate-900">Status now: {statusWords(r.status)}</li>
                      {r.note && <li className="text-amber-700">{r.note}</li>}
                      {(r.disputes || []).map((d) => <li key={d.number}>Dispute {d.number}: {d.outcome || d.status}</li>)}
                    </ol>
                    {r.kind === 'transaction' && (
                      <button onClick={() => { setDispute({ ...dispute, tx: r }); go('dispute'); }} className="ui-btn ui-btn-secondary ui-btn-sm"><AlertTriangle size={14} /> Report a problem</button>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
