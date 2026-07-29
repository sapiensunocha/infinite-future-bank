import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import {
  TrendingUp, Landmark, ShieldCheck, PiggyBank,
  ArrowRight, RefreshCw, BarChart3,
  Wallet, Lock, Repeat2, Target, Activity
} from 'lucide-react';

const HOUR = new Date().getHours();
const GREET = HOUR < 12 ? 'Good morning' : HOUR < 18 ? 'Good afternoon' : 'Good evening';

function StatCard({ icon: Icon, label, value, sub, color = 'text-emerald-400', bg = 'bg-emerald-900/20' }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-4`}>
        <Icon size={18} className={color} />
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">{label}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
}

const QUICK = [
  { icon: TrendingUp, label: 'Invest',          desc: 'Grow your portfolio',      path: '/invest',        color: 'from-emerald-600 to-green-600'  },
  { icon: Repeat2,    label: 'P2P Exchange',     desc: 'Trade AFR ↔ USD',          path: '/p2p',           color: 'from-cyan-600 to-teal-600'      },
  { icon: Landmark,   label: 'Lombard Credit',  desc: 'Asset-backed loans',       path: '/lombard',       color: 'from-blue-600 to-indigo-600'    },
  { icon: Lock,       label: 'My Vault',        desc: 'Secure digital assets',    path: '/vault',         color: 'from-violet-600 to-purple-600'  },
  { icon: ShieldCheck,label: 'AgriShield',      desc: 'Farm insurance',           path: '/agri-shield',   color: 'from-amber-600 to-orange-600'   },
  { icon: PiggyBank,  label: 'Pension Fund',    desc: 'Retirement planning',      path: '/pension',       color: 'from-rose-600 to-pink-600'      },
  { icon: BarChart3,  label: 'Planner',         desc: 'Goals & projections',      path: '/planner',       color: 'from-indigo-600 to-violet-600'  },
  { icon: Wallet,     label: 'Cash Optimizer',  desc: 'Maximize idle cash',       path: '/cash-optimizer',color: 'from-slate-600 to-slate-500'    },
];

const ALLOC = [
  { label: 'Cash & Liquid', color: 'bg-cyan-500',    pct: 35 },
  { label: 'AFR Tokens',    color: 'bg-emerald-500', pct: 40 },
  { label: 'Investments',   color: 'bg-blue-500',    pct: 15 },
  { label: 'Vault / Safe',  color: 'bg-violet-500',  pct: 10 },
];

export default function WealthDashboard() {
  const nav = useNavigate();
  const [name, setName]       = useState('');
  const [bal, setBal]         = useState({ liquid: 0, afr: 0, pension: 0, loans: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const [p, b, l, pen] = await Promise.all([
          supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
          supabase.from('accounts_balance').select('*').eq('user_id', user.id).maybeSingle(),
          supabase.from('loan_applications').select('amount_requested').eq('user_id', user.id).eq('status', 'approved'),
          supabase.from('pension_accounts').select('balance').eq('user_id', user.id).maybeSingle(),
        ]);
        setName(p.data?.full_name?.split(' ')[0] || '');
        const d = b.data || {};
        setBal({
          liquid:  Number(d.liquid_usd || 0),
          afr:     Number(d.afr_balance || 0),
          pension: Number(pen.data?.balance || 0),
          loans:   (l.data || []).reduce((s, x) => s + Number(x.amount_requested || 0), 0),
        });
      } catch (_) {}
      setLoading(false);
    })();
  }, []);

  const usd = n => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const afr = n => `${Number(n).toLocaleString()} AFR`;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">

      {/* Hero */}
      <div className="relative bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden p-10">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/30 via-slate-900 to-teal-900/20 pointer-events-none" />
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl" />
        <div className="absolute -left-8 -bottom-8 w-48 h-48 bg-teal-600/10 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-300 text-[10px] font-black uppercase tracking-widest">
              <Activity size={11} /> Wealth Overview
            </span>
            <button onClick={() => window.location.reload()} disabled={loading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
          <p className="text-slate-400 text-sm mb-1">{GREET}{name ? `, ${name}` : ''}.</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Total Portfolio (USD eq.)</p>
          <p className="text-5xl font-black text-white mt-1">{loading ? '—' : usd(bal.liquid + bal.pension)}</p>

          {/* Allocation bar */}
          <div className="mt-6">
            <div className="flex h-2 rounded-full overflow-hidden gap-px">
              {ALLOC.map(a => <div key={a.label} className={`${a.color}`} style={{ width: `${a.pct}%` }} />)}
            </div>
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              {ALLOC.map(a => (
                <div key={a.label} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${a.color}`} />
                  <span className="text-[10px] text-slate-500">{a.label} <span className="text-slate-400 font-bold">{a.pct}%</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Wallet}      label="Liquid USD"   value={loading ? '—' : usd(bal.liquid)}  sub="cash on hand"      color="text-cyan-400"    bg="bg-cyan-900/20"    />
        <StatCard icon={BarChart3}   label="AFR Tokens"   value={loading ? '—' : afr(bal.afr)}     sub="Chain 2026"        color="text-emerald-400" bg="bg-emerald-900/20" />
        <StatCard icon={PiggyBank}   label="Pension"      value={loading ? '—' : usd(bal.pension)} sub="7% annual growth"  color="text-blue-400"    bg="bg-blue-900/20"    />
        <StatCard icon={Landmark}    label="Active Loans" value={loading ? '—' : usd(bal.loans)}   sub="outstanding"       color="text-amber-400"   bg="bg-amber-900/20"   />
      </div>

      {/* Quick actions */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Wealth Actions</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK.map(({ icon: Icon, label, desc, path, color }) => (
            <button key={path} onClick={() => nav(path)}
              className="bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-2xl p-5 text-left transition-all group">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                <Icon size={16} className="text-white" />
              </div>
              <p className="text-sm font-black text-white">{label}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Net position CTA */}
      <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-5 overflow-hidden flex items-center justify-between gap-4">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/20 to-transparent pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
            <BarChart3 size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-black text-white">Net Position Report</p>
            <p className="text-[11px] text-slate-400">Complete cross-asset position statement</p>
          </div>
        </div>
        <button onClick={() => nav('/net-position')}
          className="relative flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-black uppercase tracking-widest rounded-xl shrink-0 hover:shadow-lg hover:shadow-emerald-900/40 transition-all">
          View <ArrowRight size={12} />
        </button>
      </div>

    </div>
  );
}
