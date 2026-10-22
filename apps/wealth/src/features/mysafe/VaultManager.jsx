import { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
  Lock, Unlock, Shield, Vault, ArrowDownToLine, ArrowUpFromLine,
  Loader2, CheckCircle2, AlertTriangle, Info, Cpu, Flame, ChevronRight
} from 'lucide-react';

const fmtUSD = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

export default function VaultManager({ balances, onSuccess, onClose }) {
  const [tab, setTab]         = useState('overview'); // overview | lock | unlock | hardware
  const [amount, setAmount]   = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [err, setErr]         = useState(null);

  const liquid = balances?.liquid_usd || 0;
  const vault  = balances?.mysafe_digital_usd || 0;

  const handleTransfer = async (direction) => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    setLoading(true); setErr(null); setResult(null);
    try {
      const { data, error } = await supabase.rpc('vault_transfer', {
        p_amount:    amt,
        p_direction: direction,
      });
      if (error) throw error;
      setResult(data);
      if (onSuccess) onSuccess();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const pctLocked = vault / Math.max(liquid + vault, 1) * 100;

  return (
    <div className="space-y-6 max-w-lg mx-auto">

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-900/40 border border-indigo-700/40 flex items-center justify-center">
          <Shield size={22} className="text-indigo-400"/>
        </div>
        <div>
          <h2 className="text-xl font-black text-white">IFB Vault</h2>
          <p className="text-xs text-slate-400">Lock funds for protection · Unlock anytime</p>
        </div>
      </div>

      {/* Balance overview */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Liquid Balance</p>
          <p className="text-2xl font-black text-white">{fmtUSD(liquid)}</p>
          <p className="text-[10px] text-slate-400 mt-1">Available to spend</p>
        </div>
        <div className="bg-indigo-900/30 border border-indigo-700/30 rounded-2xl p-5">
          <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-1">Vault Balance</p>
          <p className="text-2xl font-black text-indigo-300">{fmtUSD(vault)}</p>
          <p className="text-[10px] text-indigo-400/60 mt-1">Locked & protected</p>
        </div>
      </div>

      {/* Vault lock ratio bar */}
      <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/40">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Vault ratio</span>
          <span className="text-[10px] font-black text-indigo-400">{pctLocked.toFixed(1)}% locked</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 h-full rounded-full transition-all duration-700"
            style={{ width: `${pctLocked}%` }}/>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 bg-slate-900 p-1 rounded-2xl">
        {[
          { id: 'lock',     label: '🔒 Lock Funds',   icon: Lock },
          { id: 'unlock',   label: '🔓 Unlock Funds', icon: Unlock },
          { id: 'hardware', label: '⚙️ Hardware Sync', icon: Cpu },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => { setTab(id); setAmount(''); setErr(null); setResult(null); }}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              tab === id ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Success state */}
      {result && (
        <div className="bg-emerald-900/30 border border-emerald-700/40 rounded-2xl p-5 flex items-start gap-3 animate-in fade-in">
          <CheckCircle2 size={20} className="text-emerald-400 shrink-0 mt-0.5"/>
          <div>
            <p className="font-black text-emerald-300 text-sm">Transfer Complete</p>
            <p className="text-xs text-emerald-400/80 mt-1">
              {result.direction === 'to_vault' ? 'Locked' : 'Unlocked'} {fmtUSD(result.amount)}
              {' · '}New liquid: {fmtUSD(result.liquid)} · Vault: {fmtUSD(result.vault)}
            </p>
            <button onClick={() => { setResult(null); setAmount(''); }}
              className="mt-3 text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300">
              Make another transfer →
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {err && (
        <div className="bg-red-950/40 border border-red-800/40 rounded-2xl p-4 flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-400 shrink-0"/>
          <p className="text-sm text-red-300 font-bold">{err}</p>
        </div>
      )}

      {/* Lock tab */}
      {tab === 'lock' && !result && (
        <div className="space-y-5 animate-in fade-in">
          <div className="bg-indigo-950/30 border border-indigo-800/30 rounded-2xl p-4 flex items-start gap-3">
            <Info size={15} className="text-indigo-400 shrink-0 mt-0.5"/>
            <p className="text-xs text-slate-400 leading-relaxed">
              Locked funds are held in your <strong className="text-indigo-300">IFB Vault</strong> — protected from spending and transfers. They earn the same returns as your liquid balance but cannot be sent or used for payments until unlocked.
            </p>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Amount to Lock</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">$</span>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0.00" min="0" max={liquid} step="0.01"
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-9 pr-4 py-4 text-xl font-black text-white outline-none focus:border-indigo-500 transition-colors"/>
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5">Available: {fmtUSD(liquid)}</p>
          </div>
          {/* Quick pct buttons */}
          <div className="flex gap-2">
            {[25, 50, 75, 100].map(pct => (
              <button key={pct} onClick={() => setAmount((liquid * pct / 100).toFixed(2))}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] font-black rounded-xl transition-all">
                {pct}%
              </button>
            ))}
          </div>
          <button onClick={() => handleTransfer('to_vault')}
            disabled={loading || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > liquid}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-black rounded-2xl text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/30">
            {loading ? <><Loader2 size={16} className="animate-spin"/>Locking...</> : <><Lock size={16}/>Lock {amount ? fmtUSD(parseFloat(amount)) : ''} to Vault</>}
          </button>
        </div>
      )}

      {/* Unlock tab */}
      {tab === 'unlock' && !result && (
        <div className="space-y-5 animate-in fade-in">
          <div className="bg-amber-950/20 border border-amber-800/20 rounded-2xl p-4 flex items-start gap-3">
            <Info size={15} className="text-amber-400 shrink-0 mt-0.5"/>
            <p className="text-xs text-slate-400 leading-relaxed">
              Unlocking moves funds from your <strong className="text-amber-300">IFB Vault</strong> back to your liquid balance, making them available for transfers, payments, and withdrawals immediately.
            </p>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Amount to Unlock</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">$</span>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0.00" min="0" max={vault} step="0.01"
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-9 pr-4 py-4 text-xl font-black text-white outline-none focus:border-amber-500 transition-colors"/>
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5">Vault balance: {fmtUSD(vault)}</p>
          </div>
          <div className="flex gap-2">
            {[25, 50, 75, 100].map(pct => (
              <button key={pct} onClick={() => setAmount((vault * pct / 100).toFixed(2))}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] font-black rounded-xl transition-all">
                {pct}%
              </button>
            ))}
          </div>
          <button onClick={() => handleTransfer('from_vault')}
            disabled={loading || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > vault}
            className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-40 text-white font-black rounded-2xl text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-900/30">
            {loading ? <><Loader2 size={16} className="animate-spin"/>Unlocking...</> : <><Unlock size={16}/>Unlock {amount ? fmtUSD(parseFloat(amount)) : ''} to Liquid</>}
          </button>
        </div>
      )}

      {/* Hardware Sync tab */}
      {tab === 'hardware' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="bg-red-950/20 border border-red-800/20 rounded-2xl p-5 flex items-start gap-3">
            <Flame size={18} className="text-red-400 shrink-0 mt-0.5"/>
            <div>
              <p className="font-black text-red-300 text-sm mb-1">MySafe Hardware Destruction Protocol</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                This converts physical cash loaded into your MySafe hardware device into digital assets on the IFB ledger. The physical currency is incinerated and the mathematical equivalent is minted permanently. <strong className="text-red-300">Irreversible.</strong>
              </p>
            </div>
          </div>
          <button
            onClick={() => { if(onClose) onClose(); }}
            className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black rounded-2xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
            Open Hardware Sync <ChevronRight size={14}/>
          </button>
        </div>
      )}
    </div>
  );
}
