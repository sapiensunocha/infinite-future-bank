import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import {
  TrendingUp, Landmark, ShieldCheck, PiggyBank,
  ArrowRight, RefreshCw, ChevronRight, BarChart3,
  Wallet, Lock, ArrowUpRight, ArrowDownRight, Repeat2
} from 'lucide-react';

const HOUR = new Date().getHours();
const GREET = HOUR < 12 ? 'Good morning' : HOUR < 18 ? 'Good afternoon' : 'Good evening';

function KpiCard({ icon: Icon, label, value, sub, delta, accent = 'emerald' }) {
  const colors = {
    emerald: { ring: 'border-emerald-800/60', bg: 'bg-emerald-900/20', text: 'text-emerald-400' },
    cyan:    { ring: 'border-cyan-800/60',    bg: 'bg-cyan-900/20',    text: 'text-cyan-400'    },
    blue:    { ring: 'border-blue-800/60',    bg: 'bg-blue-900/20',    text: 'text-blue-400'    },
    amber:   { ring: 'border-amber-800/60',   bg: 'bg-amber-900/20',   text: 'text-amber-400'   },
    violet:  { ring: 'border-violet-800/60',  bg: 'bg-violet-900/20',  text: 'text-violet-400'  },
  };
  const c = colors[accent] || colors.emerald;
  return (
    <div className={`bg-slate-900 border ${c.ring} rounded-2xl p-5`}>
      <div className={`w-9 h-9 ${c.bg} rounded-xl flex items-center justify-center mb-4`}>
        <Icon size={16} className={c.text} />
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">{label}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
      {delta !== undefined && (
        <div className={`flex items-center gap-1 mt-2 ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {delta >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          <span className="text-[10px] font-bold">{Math.abs(delta)}% this month</span>
        </div>
      )}
    </div>
  );
}

function QuickAction({ icon: Icon, label, desc, onClick, accent = 'emerald' }) {
  const c = {
    emerald: 'bg-emerald-600 hover:bg-emerald-500',
    cyan:    'bg-cyan-600 hover:bg-cyan-500',
    blue:    'bg-blue-600 hover:bg-blue-500',
    amber:   'bg-amber-600 hover:bg-amber-500',
    violet:  'bg-violet-600 hover:bg-violet-500',
  }[accent] || 'bg-emerald-600 hover:bg-emerald-500';
  return (
    <button onClick={onClick}
      className="bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-2xl p-4 text-left transition-all group flex items-start gap-3">
      <div className={`w-9 h-9 ${c} rounded-xl flex items-center justify-center shrink-0 transition-colors`}>
        <Icon size={15} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">{label}</p>
        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{desc}</p>
      </div>
      <ChevronRight size={14} className="text-slate-600 group-hover:text-emerald-400 ml-auto mt-0.5 transition-colors shrink-0" />
    </button>
  );
}

const ASSET_CLASSES = [
  { label: 'Cash & Liquid', key: 'liquid', color: 'bg-cyan-500', pct: 35 },
  { label: 'AFR Tokens',    key: 'afr',    color: 'bg-emerald-500', pct: 40 },
  { label: 'Investments',   key: 'invest', color: 'bg-blue-500', pct: 15 },
  { label: 'Vault / Safe',  key: 'vault',  color: 'bg-violet-500', pct: 10 },
];

export default function WealthDashboard() {
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [balances, setBalances] = useState({ liquid: 0, afr: 0, pension: 0, loans: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [profileRes, balanceRes, loanRes, pensionRes] = await Promise.all([
          supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
          supabase.from('accounts_balance').select('*').eq('user_id', user.id).maybeSingle(),
          supabase.from('loan_applications').select('amount_requested').eq('user_id', user.id).eq('status', 'approved'),
          supabase.from('pension_accounts').select('balance').eq('user_id', user.id).maybeSingle(),
        ]);

        setName(profileRes.data?.full_name?.split(' ')[0] || 'there');

        const b = balanceRes.data || {};
        const loanTotal = (loanRes.data || []).reduce((s, l) => s + Number(l.amount_requested || 0), 0);

        setBalances({
          liquid: Number(b.liquid_usd || 0),
          afr: Number(b.afr_balance || 0),
          pension: Number(pensionRes.data?.balance || 0),
          loans: loanTotal,
        });
      } catch (_) {}
      setLoading(false);
    }
    load();
  }, []);

  const totalUSD = balances.liquid + balances.pension;
  const fmtUSD = n => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtAFR = n => `${Number(n).toLocaleString()} AFR`;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-500 text-sm font-medium">{GREET}{name ? `, ${name}` : ''}.</p>
          <h1 className="text-3xl font-black text-white mt-0.5">Wealth Overview</h1>
          <p className="text-slate-500 text-sm mt-1">Your complete financial picture — assets, investments, protection.</p>
        </div>
        <button onClick={() => window.location.reload()} disabled={loading}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Total wealth hero */}
      <div className="bg-gradient-to-br from-emerald-900/40 via-slate-900 to-slate-900 border border-emerald-800/40 rounded-2xl p-7">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Portfolio (USD eq.)</p>
        <p className="text-5xl font-black text-white mt-2">{loading ? '—' : fmtUSD(totalUSD)}</p>
        <p className="text-[11px] text-slate-500 mt-2">Across all asset classes · IFB Wealth platform</p>

        {/* Allocation bar */}
        <div className="mt-5">
          <div className="flex h-2 rounded-full overflow-hidden gap-px bg-slate-800">
            {ASSET_CLASSES.map(a => (
              <div key={a.key} className={`${a.color} transition-all`} style={{ width: `${a.pct}%` }} />
            ))}
          </div>
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            {ASSET_CLASSES.map(a => (
              <div key={a.key} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${a.color}`} />
                <span className="text-[10px] text-slate-500">{a.label}</span>
                <span className="text-[10px] font-bold text-slate-400">{a.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={Wallet} label="Liquid USD" value={loading ? '—' : fmtUSD(balances.liquid)} sub="cash on hand" accent="cyan" />
        <KpiCard icon={BarChart3} label="AFR Tokens" value={loading ? '—' : fmtAFR(balances.afr)} sub="Chain 2026" accent="emerald" />
        <KpiCard icon={PiggyBank} label="Pension" value={loading ? '—' : fmtUSD(balances.pension)} sub="7% annual growth" accent="blue" />
        <KpiCard icon={Landmark} label="Active Loans" value={loading ? '—' : fmtUSD(balances.loans)} sub="outstanding balance" accent="amber" />
      </div>

      {/* Quick Actions */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Wealth Actions</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <QuickAction icon={TrendingUp} label="Invest" desc="Grow your portfolio" onClick={() => nav('/invest')} accent="emerald" />
          <QuickAction icon={Repeat2} label="P2P Exchange" desc="Trade AFR ↔ USD peer-to-peer" onClick={() => nav('/p2p')} accent="cyan" />
          <QuickAction icon={Landmark} label="Lombard Credit" desc="Asset-backed instant loans" onClick={() => nav('/lombard')} accent="blue" />
          <QuickAction icon={Lock} label="My Safe / Vault" desc="Secure your digital assets" onClick={() => nav('/vault')} accent="violet" />
          <QuickAction icon={ShieldCheck} label="AgriShield" desc="Farm & agricultural insurance" onClick={() => nav('/agri-shield')} accent="emerald" />
          <QuickAction icon={PiggyBank} label="Pension Fund" desc="Long-term retirement planning" onClick={() => nav('/pension')} accent="amber" />
          <QuickAction icon={BarChart3} label="Financial Planner" desc="Goals, savings & projections" onClick={() => nav('/planner')} accent="blue" />
          <QuickAction icon={Wallet} label="Cash Optimizer" desc="Maximize your idle cash yield" onClick={() => nav('/cash-optimizer')} accent="cyan" />
        </div>
      </div>

      {/* Net Position CTA */}
      <div className="bg-gradient-to-r from-emerald-900/40 to-slate-900 border border-emerald-800/40 rounded-2xl p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <BarChart3 size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-black text-white">Net Position Report</p>
            <p className="text-[11px] text-slate-400">Complete cross-asset position statement</p>
          </div>
        </div>
        <button onClick={() => nav('/net-position')}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors shrink-0">
          View <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}
