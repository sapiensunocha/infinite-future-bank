import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import {
  TrendingUp, Landmark, ShieldCheck, PiggyBank,
  ArrowRight, RefreshCw, BarChart3,
  Wallet, Lock, Repeat2, Target
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, color = 'text-emerald-600', bg = 'bg-emerald-50' }) {
  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-4`}>
        <Icon size={18} className={color} />
      </div>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
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

export default function WealthDashboard() {
  const nav = useNavigate();
  const [bal, setBal]         = useState({ liquid: 0, afr: 0, pension: 0, loans: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const [b, l, pen] = await Promise.all([
          supabase.from('balances').select('*').eq('user_id', user.id).maybeSingle(),
          supabase.from('loan_requests').select('amount_requested').eq('borrower_id', user.id),
          supabase.from('pension_accounts').select('current_balance').eq('user_id', user.id).maybeSingle(),
        ]);
        const d = b.data || {};
        setBal({
          liquid:  Number(d.liquid_usd || 0),
          afr:     Number(d.afr_balance || 0),
          pension: Number(pen.data?.current_balance || 0),
          loans:   (l.data || []).reduce((s, x) => s + Number(x.amount_requested || 0), 0),
        });
      } catch (_) {}
      setLoading(false);
    })();
  }, []);

  const usd = n => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const afr = n => `${Number(n).toLocaleString()} AFR`;

  return (
    <div className="space-y-8">

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-900">Wealth Overview</h2>
        <button onClick={() => window.location.reload()} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-xl transition-colors border border-slate-200 shadow-sm">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Wallet}      label="Liquid USD"   value={loading ? '—' : usd(bal.liquid)}  sub="cash on hand"      color="text-cyan-600"    bg="bg-cyan-50"    />
        <StatCard icon={BarChart3}   label="AFR Tokens"   value={loading ? '—' : afr(bal.afr)}     sub="Chain 2026"        color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard icon={PiggyBank}   label="Pension"      value={loading ? '—' : usd(bal.pension)} sub="7% annual growth"  color="text-blue-600"    bg="bg-blue-50"    />
        <StatCard icon={Landmark}    label="Active Loans" value={loading ? '—' : usd(bal.loans)}   sub="outstanding"       color="text-amber-600"   bg="bg-amber-50"   />
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Wealth Actions</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK.map(({ icon: Icon, label, desc, path, color }) => (
            <button key={path} onClick={() => nav(path)}
              className="bg-white border border-slate-200 hover:border-blue-200 hover:shadow-md rounded-2xl p-5 text-left transition-all group shadow-sm">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                <Icon size={16} className="text-white" />
              </div>
              <p className="text-sm font-black text-slate-900">{label}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="relative bg-white border border-slate-200 shadow-sm rounded-2xl p-5 overflow-hidden flex items-center justify-between gap-4">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-50 to-transparent pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
            <BarChart3 size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-black text-slate-900">Net Position Report</p>
            <p className="text-[11px] text-slate-500">Complete cross-asset position statement</p>
          </div>
        </div>
        <button onClick={() => nav('/net-position')}
          className="relative flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-black uppercase tracking-widest rounded-xl shrink-0 hover:shadow-lg hover:shadow-emerald-200 transition-all">
          View <ArrowRight size={12} />
        </button>
      </div>

    </div>
  );
}
