import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import {
  Heart, Users, DollarSign, Target, Leaf,
  Plus, ArrowRight, RefreshCw, ChevronRight,
  Globe, AlertTriangle, BarChart3, Award, Zap
} from 'lucide-react';

const HOUR = new Date().getHours();
const GREET = HOUR < 12 ? 'Good morning' : HOUR < 18 ? 'Good afternoon' : 'Good evening';

const SDG_COLORS = {
  1:'bg-red-700',2:'bg-yellow-600',3:'bg-green-600',4:'bg-red-600',5:'bg-orange-600',
  6:'bg-blue-500',7:'bg-yellow-500',8:'bg-red-500',9:'bg-orange-500',10:'bg-pink-600',
  11:'bg-orange-600',12:'bg-yellow-600',13:'bg-green-700',14:'bg-blue-700',15:'bg-green-600',
  16:'bg-blue-800',17:'bg-blue-600',
};
const SDG_LABELS = [
  '','No Poverty','Zero Hunger','Good Health','Quality Education','Gender Equality',
  'Clean Water','Clean Energy','Decent Work','Industry & Innovation','Reduced Inequalities',
  'Sustainable Cities','Responsible Consumption','Climate Action','Life Below Water',
  'Life on Land','Peace & Justice','Partnerships',
];
const MY_SDGS = [1, 2, 8, 10, 13];

function KpiCard({ icon: Icon, label, value, sub, accent = 'rose' }) {
  const colors = {
    rose:    { ring: 'border-rose-800/60',    bg: 'bg-rose-900/20',    text: 'text-rose-400'    },
    emerald: { ring: 'border-emerald-800/60', bg: 'bg-emerald-900/20', text: 'text-emerald-400' },
    blue:    { ring: 'border-blue-800/60',    bg: 'bg-blue-900/20',    text: 'text-blue-400'    },
    amber:   { ring: 'border-amber-800/60',   bg: 'bg-amber-900/20',   text: 'text-amber-400'   },
  };
  const c = colors[accent] || colors.rose;
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

function QuickAction({ icon: Icon, label, desc, onClick, accent = 'rose' }) {
  const c = {
    rose:    'bg-rose-600 hover:bg-rose-500',
    red:     'bg-red-600 hover:bg-red-500',
    emerald: 'bg-emerald-600 hover:bg-emerald-500',
    blue:    'bg-blue-600 hover:bg-blue-500',
    amber:   'bg-amber-600 hover:bg-amber-500',
  }[accent] || 'bg-rose-600 hover:bg-rose-500';
  return (
    <button onClick={onClick}
      className="bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-2xl p-4 text-left transition-all group flex items-start gap-3">
      <div className={`w-9 h-9 ${c} rounded-xl flex items-center justify-center shrink-0 transition-colors`}>
        <Icon size={15} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-white group-hover:text-rose-300 transition-colors">{label}</p>
        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{desc}</p>
      </div>
      <ChevronRight size={14} className="text-slate-600 group-hover:text-rose-400 ml-auto mt-0.5 transition-colors shrink-0" />
    </button>
  );
}

export default function NpoDashboard() {
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [stats, setStats] = useState({ campaigns: 0, raised: 0, donors: 0, sdgs: 0 });
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [profileRes, campaignsRes] = await Promise.all([
          supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
          supabase.from('npo_campaigns')
            .select('id,title,goal_amount,raised_amount,donor_count,status,created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(4),
        ]);

        setName(profileRes.data?.full_name?.split(' ')[0] || 'there');

        const cps = campaignsRes.data || [];
        const totalRaised = cps.reduce((s, c) => s + Number(c.raised_amount || 0), 0);
        const totalDonors = cps.reduce((s, c) => s + Number(c.donor_count || 0), 0);

        setStats({ campaigns: cps.length, raised: totalRaised, donors: totalDonors, sdgs: MY_SDGS.length });
        setCampaigns(cps);
      } catch (_) {}
      setLoading(false);
    }
    load();
  }, []);

  const fmtUSD = n => `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  const pct = (r, g) => g > 0 ? Math.min(100, Math.round((r / g) * 100)) : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-500 text-sm font-medium">{GREET}{name ? `, ${name}` : ''}.</p>
          <h1 className="text-3xl font-black text-white mt-0.5">Impact Hub</h1>
          <p className="text-slate-500 text-sm mt-1">Zero-fee fundraising for nonprofits changing the world.</p>
        </div>
        <button onClick={() => window.location.reload()} disabled={loading}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Impact hero */}
      <div className="bg-gradient-to-br from-rose-900/30 via-slate-900 to-slate-900 border border-rose-800/40 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Leaf size={14} className="text-emerald-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">SDG Aligned · Paris Agreement</span>
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Total Raised</p>
        <p className="text-5xl font-black text-white">{loading ? '—' : fmtUSD(stats.raised)}</p>
        <p className="text-[11px] text-slate-500 mt-2">Zero platform fees · IFB Green Finance</p>

        {/* SDG badges */}
        <div className="flex items-center gap-2 mt-5 flex-wrap">
          {MY_SDGS.map(n => (
            <div key={n} className={`${SDG_COLORS[n]} rounded-lg px-2 py-1 flex items-center gap-1`}>
              <span className="text-[9px] font-black text-white">SDG {n}</span>
            </div>
          ))}
          <span className="text-[10px] text-slate-500 ml-1">IFC Green Bond Principles (ICMA 2025)</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={Heart} label="Campaigns" value={loading ? '—' : stats.campaigns} sub="active & completed" accent="rose" />
        <KpiCard icon={DollarSign} label="Total Raised" value={loading ? '—' : fmtUSD(stats.raised)} sub="zero fees" accent="emerald" />
        <KpiCard icon={Users} label="Donors" value={loading ? '—' : stats.donors} sub="across campaigns" accent="blue" />
        <KpiCard icon={Globe} label="SDG Goals" value={stats.sdgs} sub="UN aligned" accent="amber" />
      </div>

      {/* Quick Actions */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Impact Actions</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <QuickAction icon={Plus} label="New Campaign" desc="Start raising funds today — zero fees" onClick={() => nav('/hub')} accent="rose" />
          <QuickAction icon={Users} label="Manage Donors" desc="View & communicate with supporters" onClick={() => nav('/hub')} accent="blue" />
          <QuickAction icon={BarChart3} label="Impact Report" desc="SDG-aligned impact analytics" onClick={() => nav('/hub')} accent="emerald" />
          <QuickAction icon={Award} label="Memberships" desc="Create recurring donor tiers" onClick={() => nav('/hub')} accent="amber" />
          <QuickAction icon={Globe} label="NPO Hub" desc="Full fundraising suite" onClick={() => nav('/hub')} accent="rose" />
          <QuickAction icon={AlertTriangle} label="Emergency SOS" desc="Crisis fundraising — dispatch instantly" onClick={() => nav('/sos')} accent="red" />
        </div>
      </div>

      {/* Active campaigns */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Your Campaigns</p>
          <button onClick={() => nav('/hub')}
            className="flex items-center gap-1 text-[10px] font-bold text-rose-400 hover:text-rose-300 transition-colors uppercase tracking-widest">
            Manage All <ArrowRight size={11} />
          </button>
        </div>
        {loading ? (
          <div className="py-8 text-center">
            <div className="w-6 h-6 rounded-full border-2 border-rose-500 border-t-transparent animate-spin mx-auto" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl py-12 text-center">
            <Heart size={32} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-semibold">No campaigns yet</p>
            <button onClick={() => nav('/hub')}
              className="mt-3 px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors">
              Create First Campaign
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map(cp => {
              const p = pct(cp.raised_amount, cp.goal_amount);
              return (
                <div key={cp.id}
                  className="bg-slate-900 border border-slate-800 hover:border-rose-800/60 rounded-2xl p-4 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-white truncate">{cp.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{cp.donor_count || 0} donors</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-rose-400">{fmtUSD(cp.raised_amount)}</p>
                      <p className="text-[10px] text-slate-500">of {fmtUSD(cp.goal_amount)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full transition-all" style={{ width: `${p}%` }} />
                    </div>
                    <span className="text-[10px] font-black text-rose-400 shrink-0">{p}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SOS CTA */}
      <div className="bg-gradient-to-r from-red-900/40 to-slate-900 border border-red-800/40 rounded-2xl p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shrink-0">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-black text-white">Emergency SOS</p>
            <p className="text-[11px] text-slate-400">Dispatch a crisis fundraising alert to your network</p>
          </div>
        </div>
        <button onClick={() => nav('/sos')}
          className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors shrink-0">
          Activate <AlertTriangle size={12} />
        </button>
      </div>
    </div>
  );
}
