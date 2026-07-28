import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { X, Loader2, Zap, ChevronRight } from 'lucide-react';

const fmtUSD = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

export default function VentureXPayRequest({ notif, session, onClose }) {
  const meta = notif?.metadata || {};
  const costMin = meta.cost_min || 300;
  const costMax = meta.cost_max || 6300;
  const level   = meta.level || 1;
  const pct     = meta.pct || 0;
  const companyName = meta.company_name || 'Your Organization';

  const PRESETS = [
    { label: 'Starter',   amount: Math.min(costMin, 500),  desc: 'Begin structuring' },
    { label: 'Mid',       amount: Math.round((costMin + costMax) / 2 / 100) * 100, desc: 'Core workstreams' },
    { label: 'Full Plan', amount: costMax, desc: 'End-to-end IFB support' },
  ];

  const [amount, setAmount] = useState(PRESETS[0].amount);
  const [custom, setCustom] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const finalAmount = custom ? parseFloat(custom) || 0 : amount;

  const handlePay = async () => {
    if (finalAmount < 50) { setError('Minimum amount is $50'); return; }
    setLoading(true);
    setError('');
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const { data, error: fnErr } = await supabase.functions.invoke('create-engagement-checkout', {
        body: {
          amount: finalAmount,
          company_id: meta.company_id,
          company_name: companyName,
          notification_id: notif.id,
          user_id: session?.user?.id,
          user_email: session?.user?.email,
        },
      });
      if (fnErr || data?.error) throw new Error(fnErr?.message || data?.error);
      if (data?.url) window.open(data.url, '_blank');
    } catch (e) {
      setError(e.message || 'Payment could not be initiated. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-800 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-violet-400 mb-1">IFB Advisory Engagement</p>
            <h2 className="text-lg font-black text-white leading-tight">{companyName}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Level {level}/5 · {pct}% capital ready</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400">
            <X size={16}/>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* What this pays for */}
          <div className="bg-slate-800/60 rounded-2xl p-4 space-y-1.5">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">What this starts</p>
            <p className="text-sm text-slate-200 leading-relaxed">
              IFB will begin working on your outstanding requirements — organizational structuring, documentation, financial alignment, and funding positioning — billed at <span className="text-violet-400 font-bold">$30/hour</span>.
            </p>
            <p className="text-[10px] text-slate-500">Total estimated: <span className="text-white font-bold">{fmtUSD(costMin)} – {fmtUSD(costMax)}</span> · You choose your starting amount.</p>
          </div>

          {/* Presets */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Choose a starting amount</p>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => { setAmount(p.amount); setCustom(''); }}
                  className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border font-bold transition-all ${amount === p.amount && !custom ? 'bg-violet-600 border-violet-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-violet-600'}`}
                >
                  <span className="text-sm font-black">{fmtUSD(p.amount)}</span>
                  <span className="text-[9px] uppercase tracking-wide opacity-70">{p.label}</span>
                  <span className="text-[8px] opacity-60">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom amount */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Or enter a custom amount</p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">$</span>
              <input
                type="number"
                min="50"
                max={costMax}
                placeholder={`50 – ${costMax}`}
                value={custom}
                onChange={e => { setCustom(e.target.value); setAmount(0); }}
                className="w-full bg-slate-800 border border-slate-700 focus:border-violet-500 rounded-xl pl-7 pr-4 py-3 text-white font-bold text-sm outline-none"
              />
            </div>
          </div>

          {/* Summary line */}
          <div className="bg-violet-950/40 border border-violet-800/30 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black uppercase text-violet-400">Amount to commit</p>
              <p className="text-xl font-black text-white">{fmtUSD(finalAmount)}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-slate-500">≈ {Math.round(finalAmount / 30)} hours of IFB support</p>
              <p className="text-[9px] text-slate-600">Remaining after: {fmtUSD(Math.max(0, costMin - finalAmount))} – {fmtUSD(Math.max(0, costMax - finalAmount))}</p>
            </div>
          </div>

          {error && <p className="text-red-400 text-xs font-bold">{error}</p>}

          {/* Pay button */}
          <button
            onClick={handlePay}
            disabled={loading || finalAmount < 50}
            className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white font-black text-sm uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-violet-900/40"
          >
            {loading ? <Loader2 size={16} className="animate-spin"/> : <Zap size={16}/>}
            {loading ? 'Opening Payment...' : `Pay ${fmtUSD(finalAmount)} & Start`}
            {!loading && <ChevronRight size={16}/>}
          </button>

          <p className="text-center text-[10px] text-slate-600">
            Secure payment via Stripe · You can pay the remainder later as work progresses
          </p>
        </div>
      </div>
    </div>
  );
}
