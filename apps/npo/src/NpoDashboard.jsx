import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import {
  Heart, Users, DollarSign, Globe,
  Plus, ArrowRight, RefreshCw,
  BarChart3, Award, Zap, AlertTriangle
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, color = 'text-rose-600', bg = 'bg-rose-50' }) {
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
  { icon: Plus,          label: 'New Campaign',    desc: 'Start fundraising',       path: '/hub',  color: 'from-rose-600 to-pink-600'      },
  { icon: Users,         label: 'Manage Donors',   desc: 'View supporters',         path: '/hub',  color: 'from-blue-600 to-indigo-600'    },
  { icon: BarChart3,     label: 'Impact Report',   desc: 'SDG-aligned analytics',   path: '/hub',  color: 'from-emerald-600 to-teal-600'   },
  { icon: Award,         label: 'Memberships',     desc: 'Recurring donor tiers',   path: '/hub',  color: 'from-amber-600 to-orange-600'   },
  { icon: Globe,         label: 'NPO Hub',         desc: 'Full fundraising suite',  path: '/hub',  color: 'from-violet-600 to-purple-600'  },
  { icon: AlertTriangle, label: 'Emergency SOS',   desc: 'Crisis fundraising',      path: '/sos',  color: 'from-red-600 to-rose-600'       },
];

export default function NpoDashboard() {
  const nav = useNavigate();
  const [stats, setStats]     = useState({ campaigns: 0, raised: 0, donors: 0 });
  const [campaigns, setCamps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const [, cps] = await Promise.all([
          supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
          supabase.from('npo_campaigns').select('id,title,goal_amount,raised_amount,donor_count,status').eq('user_id', user.id).order('created_at', { ascending: false }).limit(4),
        ]);
        const c = cps.data || [];
        setStats({
          campaigns: c.length,
          raised:    c.reduce((s, x) => s + Number(x.raised_amount || 0), 0),
          donors:    c.reduce((s, x) => s + Number(x.donor_count || 0), 0),
        });
        setCamps(c);
      } catch (_) {}
      setLoading(false);
    })();
  }, []);

  const usd = n => `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  const pct = (r, g) => g > 0 ? Math.min(100, Math.round((r / g) * 100)) : 0;

  return (
    <div className="space-y-8">

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-900">NPO Overview</h2>
        <button onClick={() => window.location.reload()} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-xl transition-colors border border-slate-200 shadow-sm">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon={Heart}       label="Campaigns"     value={loading ? '—' : stats.campaigns} sub="active & completed" color="text-rose-600"    bg="bg-rose-50"    />
        <StatCard icon={DollarSign}  label="Total Raised"  value={loading ? '—' : usd(stats.raised)} sub="zero fees"       color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard icon={Users}       label="Donors"        value={loading ? '—' : stats.donors}    sub="across campaigns"  color="text-blue-600"    bg="bg-blue-50"    />
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Impact Actions</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {QUICK.map(({ icon: Icon, label, desc, path, color }) => (
            <button key={label} onClick={() => nav(path)}
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
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Your Campaigns</p>
          <button onClick={() => nav('/hub')} className="flex items-center gap-1 text-[10px] font-bold text-rose-600 hover:text-rose-700 uppercase tracking-widest transition-colors">
            Manage All <ArrowRight size={11} />
          </button>
        </div>
        {loading ? (
          <div className="py-8 flex justify-center"><div className="w-6 h-6 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" /></div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl py-12 text-center">
            <Heart size={28} className="text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm font-semibold">No campaigns yet</p>
            <button onClick={() => nav('/hub')} className="mt-3 px-5 py-2 bg-gradient-to-r from-rose-600 to-pink-600 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all hover:shadow-lg">
              Create First Campaign
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map(cp => {
              const p = pct(cp.raised_amount, cp.goal_amount);
              return (
                <div key={cp.id} className="bg-white border border-slate-200 hover:border-rose-200 hover:shadow-md rounded-2xl p-5 transition-all shadow-sm">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <p className="text-sm font-black text-slate-900">{cp.title}</p>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-rose-600">{usd(cp.raised_amount)}</p>
                      <p className="text-[10px] text-slate-400">of {usd(cp.goal_amount)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full transition-all" style={{ width: `${p}%` }} />
                    </div>
                    <span className="text-[10px] font-black text-rose-600 shrink-0">{p}%</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">{cp.donor_count || 0} donors</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="relative bg-white border border-slate-200 shadow-sm rounded-2xl p-5 overflow-hidden flex items-center justify-between gap-4">
        <div className="absolute inset-0 bg-gradient-to-r from-red-50 to-transparent pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-rose-600 rounded-xl flex items-center justify-center shadow-lg">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-black text-slate-900">Emergency SOS</p>
            <p className="text-[11px] text-slate-500">Dispatch a crisis alert to your entire donor network</p>
          </div>
        </div>
        <button onClick={() => nav('/sos')}
          className="relative flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white text-xs font-black uppercase tracking-widest rounded-xl shrink-0 hover:shadow-lg hover:shadow-red-200 transition-all">
          Activate <AlertTriangle size={12} />
        </button>
      </div>

    </div>
  );
}
