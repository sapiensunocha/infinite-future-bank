import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import {
  Building2, FileText, Users, DollarSign, TrendingUp,
  Plus, CreditCard, Cpu, MapPin, ArrowRight, RefreshCw,
  ChevronRight, Briefcase, Zap, Globe, ShieldCheck
} from 'lucide-react';

const HOUR = new Date().getHours();
const GREET = HOUR < 12 ? 'Good morning' : HOUR < 18 ? 'Good afternoon' : 'Good evening';

function KpiCard({ icon: Icon, label, value, sub, accent = 'cyan' }) {
  const colors = {
    cyan:    { ring: 'border-cyan-800/60',    bg: 'bg-cyan-900/20',    text: 'text-cyan-400'    },
    emerald: { ring: 'border-emerald-800/60', bg: 'bg-emerald-900/20', text: 'text-emerald-400' },
    blue:    { ring: 'border-blue-800/60',    bg: 'bg-blue-900/20',    text: 'text-blue-400'    },
    amber:   { ring: 'border-amber-800/60',   bg: 'bg-amber-900/20',   text: 'text-amber-400'   },
  };
  const c = colors[accent] || colors.cyan;
  return (
    <div className={`bg-slate-900 border ${c.ring} rounded-2xl p-5`}>
      <div className={`w-9 h-9 ${c.bg} rounded-xl flex items-center justify-center mb-4`}>
        <Icon size={16} className={c.text} />
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">{label}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function QuickAction({ icon: Icon, label, desc, to, accent = 'cyan', onClick }) {
  const c = {
    cyan:    'bg-cyan-600 hover:bg-cyan-500',
    emerald: 'bg-emerald-600 hover:bg-emerald-500',
    blue:    'bg-blue-600 hover:bg-blue-500',
    amber:   'bg-amber-600 hover:bg-amber-500',
  }[accent] || 'bg-cyan-600 hover:bg-cyan-500';
  return (
    <button onClick={onClick}
      className="bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-2xl p-4 text-left transition-all group flex items-start gap-3">
      <div className={`w-9 h-9 ${c} rounded-xl flex items-center justify-center shrink-0 transition-colors`}>
        <Icon size={15} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">{label}</p>
        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{desc}</p>
      </div>
      <ChevronRight size={14} className="text-slate-600 group-hover:text-cyan-400 ml-auto mt-0.5 transition-colors shrink-0" />
    </button>
  );
}

export default function BusinessDashboard() {
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [stats, setStats] = useState({ companies: 0, invoices: 0, team: 0, revenue: 0 });
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [profileRes, companiesRes, invoicesRes, payrollRes] = await Promise.all([
          supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
          supabase.from('companies').select('id', { count: 'exact', head: false }).eq('user_id', user.id),
          supabase.from('billing_invoices').select('id,amount,status,created_at,client_name').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
          supabase.from('payroll_employees').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        ]);

        setName(profileRes.data?.full_name?.split(' ')[0] || 'there');

        const allInvoices = invoicesRes.data || [];
        const paid = allInvoices.filter(i => i.status === 'paid');
        const revenue = paid.reduce((s, i) => s + (Number(i.amount) || 0), 0);

        setStats({
          companies: (companiesRes.data || []).length,
          invoices: allInvoices.length,
          team: payrollRes.count || 0,
          revenue,
        });
        setRecentInvoices(allInvoices.slice(0, 4));
      } catch (_) {}
      setLoading(false);
    }
    load();
  }, []);

  const statusColor = s => ({
    paid: 'text-emerald-400', pending: 'text-amber-400', draft: 'text-slate-500', overdue: 'text-red-400',
  }[s] || 'text-slate-400');

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-500 text-sm font-medium">{GREET}{name ? `, ${name}` : ''}.</p>
          <h1 className="text-3xl font-black text-white mt-0.5">Business Command Center</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your companies, billing, payroll, and growth.</p>
        </div>
        <button onClick={() => window.location.reload()} disabled={loading}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={Building2} label="Companies" value={stats.companies} sub="registered entities" accent="cyan" />
        <KpiCard icon={FileText} label="Invoices" value={stats.invoices} sub="total created" accent="blue" />
        <KpiCard icon={Users} label="Team Size" value={stats.team} sub="payroll employees" accent="emerald" />
        <KpiCard icon={DollarSign} label="Revenue" value={`$${Number(stats.revenue).toLocaleString()}`} sub="paid invoices" accent="amber" />
      </div>

      {/* Quick Actions */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Quick Actions</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <QuickAction icon={Plus} label="Create Invoice" desc="Bill a client instantly" onClick={() => nav('/billing')} accent="cyan" />
          <QuickAction icon={Users} label="Run Payroll" desc="Pay your team this cycle" onClick={() => nav('/payroll')} accent="emerald" />
          <QuickAction icon={Building2} label="Form a Company" desc="Register a new legal entity" onClick={() => nav('/formation')} accent="blue" />
          <QuickAction icon={Cpu} label="Smart Contracts" desc="Create or manage contracts" onClick={() => nav('/contracts')} accent="amber" />
          <QuickAction icon={TrendingUp} label="Find First Customer" desc="GTM engine & lead gen" onClick={() => nav('/first-customer')} accent="cyan" />
          <QuickAction icon={ShieldCheck} label="Underwriting" desc="Apply for commercial credit" onClick={() => nav('/underwriting')} accent="blue" />
          <QuickAction icon={Globe} label="Market Intelligence" desc="Research your industry" onClick={() => nav('/market-intel')} accent="emerald" />
          <QuickAction icon={MapPin} label="Processor Map" desc="Find payment processors" onClick={() => nav('/processor-map')} accent="amber" />
        </div>
      </div>

      {/* Recent Invoices */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Recent Invoices</p>
          <button onClick={() => nav('/billing')}
            className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors uppercase tracking-widest">
            View All <ArrowRight size={11} />
          </button>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="py-10 text-center">
              <div className="w-6 h-6 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin mx-auto" />
            </div>
          ) : recentInvoices.length === 0 ? (
            <div className="py-10 text-center">
              <FileText size={28} className="text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 text-sm font-semibold">No invoices yet</p>
              <button onClick={() => nav('/billing')}
                className="mt-3 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors">
                Create your first invoice →
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left text-[9px] font-black uppercase tracking-widest text-slate-600 px-5 py-3">Client</th>
                  <th className="text-left text-[9px] font-black uppercase tracking-widest text-slate-600 px-5 py-3">Amount</th>
                  <th className="text-left text-[9px] font-black uppercase tracking-widest text-slate-600 px-5 py-3">Status</th>
                  <th className="text-left text-[9px] font-black uppercase tracking-widest text-slate-600 px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((inv, i) => (
                  <tr key={inv.id} className={i < recentInvoices.length - 1 ? 'border-b border-slate-800/50' : ''}>
                    <td className="px-5 py-3 text-sm font-semibold text-white">{inv.client_name || '—'}</td>
                    <td className="px-5 py-3 text-sm font-bold text-white">${Number(inv.amount || 0).toLocaleString()}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${statusColor(inv.status)}`}>{inv.status || '—'}</span>
                    </td>
                    <td className="px-5 py-3 text-[11px] text-slate-500">{new Date(inv.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Bottom promo strip */}
      <div className="bg-gradient-to-r from-cyan-900/40 to-slate-900 border border-cyan-800/40 rounded-2xl p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-600 rounded-xl flex items-center justify-center shrink-0">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-black text-white">DEUS Nexus</p>
            <p className="text-[11px] text-slate-400">Connect with the IFB business ecosystem</p>
          </div>
        </div>
        <button onClick={() => nav('/deus-nexus')}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors shrink-0">
          Open
        </button>
      </div>
    </div>
  );
}
