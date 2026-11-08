// Withdraw straight to a Nigerian bank account (NUBAN) via the bank-payout function.
// The account name is looked up with the bank before anything is sent, and the user
// sees the exact Naira amount at the live rate before confirming.
import React, { useEffect, useState } from 'react';
import { ArrowLeft, BadgeCheck, CheckCircle, Landmark, Loader2, Search } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

async function call(body) {
  const { data, error } = await supabase.functions.invoke('bank-payout', { body });
  if (error || data?.error) {
    let msg = data?.error;
    try { msg = msg || (await error?.context?.json())?.error; } catch { /* ignore */ }
    throw new Error(msg || 'Something went wrong. Please try again.');
  }
  return data;
}

const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function NigeriaBankPayout({ amount, onBack, onDone }) {
  const [banks, setBanks] = useState([]);
  const [bankQuery, setBankQuery] = useState('');
  const [bank, setBank] = useState(null);
  const [acct, setAcct] = useState('');
  const [accountName, setAccountName] = useState('');
  const [quote, setQuote] = useState(null);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [done, setDone] = useState(null);

  useEffect(() => {
    setBusy('banks');
    call({ action: 'banks' }).then(d => setBanks(d.banks || [])).catch(e => setErr(e.message)).finally(() => setBusy(''));
    call({ action: 'quote', amount_usd: Number(amount) }).then(setQuote).catch(() => {});
  }, [amount]);

  // Look the account up as soon as 10 digits and a bank are in.
  useEffect(() => {
    setAccountName('');
    if (!bank || acct.length !== 10) return;
    let live = true;
    setBusy('resolve'); setErr('');
    call({ action: 'resolve', bank_code: bank.code, account_number: acct })
      .then(d => { if (live) setAccountName(d.account_name); })
      .catch(e => { if (live) setErr(e.message); })
      .finally(() => { if (live) setBusy(''); });
    return () => { live = false; };
  }, [bank, acct]);

  const send = async () => {
    setBusy('send'); setErr('');
    try {
      const d = await call({ action: 'send', bank_code: bank.code, account_number: acct, amount_usd: Number(amount) });
      setDone(d);
      onDone?.();
    } catch (e) { setErr(e.message); }
    finally { setBusy(''); }
  };

  if (done) {
    return (
      <div className="text-center space-y-3 py-6 animate-in fade-in">
        <CheckCircle size={40} className="mx-auto text-emerald-600" />
        <h3 className="text-lg font-bold text-slate-900">{naira(done.amount_ngn)} is on its way</h3>
        <p className="text-xs font-bold text-slate-500">To {done.account_name}. Most Nigerian bank transfers arrive within minutes. You will get a notification, and if the bank rejects it the money comes straight back to your wallet.</p>
        <p className="text-xs font-mono text-slate-400 break-all">Ref: {done.reference}</p>
      </div>
    );
  }

  const shown = banks.filter(b => b.name.toLowerCase().includes(bankQuery.trim().toLowerCase())).slice(0, 40);

  return (
    <div className="space-y-4 animate-in slide-in-from-right-4">
      <button type="button" onClick={onBack} className="text-sm font-semibold text-slate-500 hover:text-slate-600 flex items-center gap-2">
        <ArrowLeft size={14}/> Back
      </button>

      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
        <Landmark size={20} className="text-emerald-700 shrink-0" />
        <div>
          <p className="text-sm font-bold text-emerald-900">Nigerian bank account</p>
          <p className="text-[11px] font-bold text-emerald-700">Direct transfer via Flutterwave · no agent · 0.5% fee</p>
        </div>
      </div>

      <div>
        <label className="ui-label">Bank</label>
        {bank ? (
          <button type="button" onClick={() => { setBank(null); setBankQuery(''); }} className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-blue-500 bg-blue-50 text-left">
            <span className="font-bold text-slate-800 text-sm">{bank.name}</span>
            <span className="text-xs font-semibold text-blue-600">Change</span>
          </button>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50">
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={bankQuery} onChange={e => setBankQuery(e.target.value)} placeholder={busy === 'banks' ? 'Loading banks…' : 'Search your bank (e.g. GTBank, Opay)'}
                className="ui-input pl-11" />
            </div>
            {bankQuery.trim().length > 0 && (
              <div className="max-h-56 overflow-y-auto border-t border-slate-200">
                {shown.map(b => (
                  <button key={b.code} type="button" onClick={() => setBank(b)} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-white border-b border-slate-100 last:border-0">
                    {b.name}
                  </button>
                ))}
                {shown.length === 0 && <p className="px-4 py-3 text-xs font-bold text-slate-400">No bank matches “{bankQuery}”.</p>}
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="ui-label">Account number (NUBAN)</label>
        <input inputMode="numeric" maxLength={10} value={acct} onChange={e => setAcct(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10 digits"
          className="ui-input tracking-widest" />
        {busy === 'resolve' && <p className="mt-2 text-xs font-bold text-slate-500 flex items-center gap-2"><Loader2 size={12} className="animate-spin"/> Checking account…</p>}
        {accountName && <p className="mt-2 text-sm font-bold text-emerald-700 flex items-center gap-2"><BadgeCheck size={16}/> {accountName}</p>}
      </div>

      {quote && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
          <div className="flex justify-between"><span className="font-bold text-slate-500">You withdraw</span><span className="font-bold text-slate-900">${Number(amount).toFixed(2)} + ${quote.fee_usd.toFixed(2)} fee</span></div>
          <div className="flex justify-between"><span className="font-bold text-slate-500">Rate</span><span className="font-bold text-slate-700">{naira(quote.rate)} per $1 (live)</span></div>
          <div className="flex justify-between border-t border-slate-200 pt-2"><span className="font-bold text-slate-500">They receive about</span><span className="font-bold text-emerald-700 text-base">{naira(quote.amount_ngn)}</span></div>
        </div>
      )}

      {err && <p className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-600">{err}</p>}

      <button type="button" onClick={send} disabled={!accountName || busy !== ''}
        className="ui-btn ui-btn-primary">
        {busy === 'send' ? <Loader2 size={16} className="animate-spin"/> : accountName ? `Send to ${accountName.split(' ')[0]}` : 'Enter account details'}
      </button>
    </div>
  );
}
