import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import {
  Building2, FileText, Users, DollarSign, TrendingUp,
  Plus, Cpu, MapPin, ArrowRight, RefreshCw,
  Zap, Globe, ShieldCheck, BarChart3
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, color = 'text-cyan-600', bg = 'bg-cyan-50' }) {
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
  { icon: Plus,         label: 'Create Invoice',      desc: 'Bill a client',          path: '/billing',         color: 'from-cyan-600 to-teal-600'    },
  { icon: Users,        label: 'Run Payroll',          desc: 'Pay your team',          path: '/payroll',         color: 'from-emerald-600 to-green-600' },
  { icon: Building2,    label: 'Form a Company',       desc: 'Register new entity',    path: '/formation',       color: 'from-indigo-600 to-violet-600' },
  { icon: Cpu,          label: 'Smart Contracts',      desc: 'Create contracts',       path: '/contracts',       color: 'from-blue-600 to-cyan-600'     },
  { icon: TrendingUp,   label: 'First Customer',       desc: 'GTM engine & leads',     path: '/first-customer',  color: 'from-violet-600 to-purple-600' },
  { icon: ShieldCheck,  label: 'Underwriting',         desc: 'Commercial credit',      path: '/underwriting',    color: 'from-amber-600 to-orange-600'  },
  { icon: Globe,        label: 'Market Intelligence',  desc: 'Industry research',      path: '/market-intel',    color: 'from-rose-600 to-red-600'      },
  { icon: MapPin,       label: 'Processor Map',        desc: 'Find processors',        path: '/processor-map',   color: 'from-slate-600 to-slate-500'   },
];

const STATUS_COLOR = { paid: 'text-emerald-600', pending: 'text-amber-600', draft: 'text-slate-400', overdue: 'text-red-600' };

export default function BusinessDashboard() {
  const nav = useNavigate();
  const [stats, setStats] = useState({ companies: 0, invoices: 0, team: 0, revenue: 0 });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const [co, inv, pay] = await Promise.all([
          supabase.from('companies').select('id').eq('user_id', user.id),
          supabase.from('billing_invoices').select('id,amount,status,created_at,client_name').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
          supabase.from('payroll_employees').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        ]);
        const allInv = inv.data || [];
        setStats({
          companies: (co.data || []).length,
          invoices:  allInv.length,
          team:      pay.count || 0,
          revenue:   allInv.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount || 0), 0),
        });
        setRecent(allInv.slice(0, 4));
      } catch (_) {}
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-8">

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-900">Business Overview</h2>
        <button onClick={() => window.location.reload()} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-xl transition-colors border border-slate-200 shadow-sm">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Building2}  label="Companies"  value={loading ? '—' : stats.companies} sub="registered"         color="text-cyan-600"    bg="bg-cyan-50"    />
        <StatCard icon={FileText}   label="Invoices"   value={loading ? '—' : stats.invoices}  sub="total created"      color="text-blue-600"    bg="bg-blue-50"    />
        <StatCard icon={Users}      label="Team"       value={loading ? '—' : stats.team}      sub="on payroll"         color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard icon={DollarSign} label="Revenue"    value={loading ? '—' : `$${Number(stats.revenue).toLocaleString()}`} sub="paid invoices" color="text-amber-600" bg="bg-amber-50" />
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Quick Actions</p>
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

      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Recent Invoices</p>
          <button onClick={() => nav('/billing')} className="flex items-center gap-1 text-[10px] font-bold text-cyan-600 hover:text-cyan-700 uppercase tracking-widest transition-colors">
            View All <ArrowRight size={11} />
          </button>
        </div>
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          {loading ? (
            <div className="py-10 flex justify-center"><div className="w-6 h-6 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" /></div>
          ) : recent.length === 0 ? (
            <div className="py-12 text-center">
              <FileText size={28} className="text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm font-semibold">No invoices yet</p>
              <button onClick={() => nav('/billing')} className="mt-3 text-xs font-bold text-cyan-600 hover:text-cyan-700 transition-colors">Create your first invoice →</button>
            </div>
          ) : (
            <table className="w-full">
              <thead><tr className="border-b border-slate-100">
                {['Client','Amount','Status','Date'].map(h => (
                  <th key={h} className="text-left text-[9px] font-black uppercase tracking-widest text-slate-400 px-5 py-3">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {recent.map((inv, i) => (
                  <tr key={inv.id} className={i < recent.length - 1 ? 'border-b border-slate-100' : ''}>
                    <td className="px-5 py-3 text-sm font-semibold text-slate-900">{inv.client_name || '—'}</td>
                    <td className="px-5 py-3 text-sm font-bold text-slate-900">${Number(inv.amount || 0).toLocaleString()}</td>
                    <td className="px-5 py-3"><span className={`text-[10px] font-black uppercase tracking-widest ${STATUS_COLOR[inv.status] || 'text-slate-400'}`}>{inv.status || '—'}</span></td>
                    <td className="px-5 py-3 text-[11px] text-slate-400">{new Date(inv.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="relative bg-white border border-slate-200 shadow-sm rounded-2xl p-5 overflow-hidden flex items-center justify-between gap-4">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-50 to-transparent pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-black text-slate-900">DEUS Nexus</p>
            <p className="text-[11px] text-slate-500">Connect with the IFB business ecosystem</p>
          </div>
        </div>
        <button onClick={() => nav('/deus-nexus')}
          className="relative px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all hover:shadow-lg hover:shadow-cyan-200 shrink-0">
          Open
        </button>
      </div>

    </div>
  );
}
