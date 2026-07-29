import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import {
  Rocket, Users, DollarSign, BarChart3, Star,
  ArrowRight, RefreshCw, ChevronRight, Briefcase,
  Globe, Zap, TrendingUp, Target, Newspaper
} from 'lucide-react';

const HOUR = new Date().getHours();
const GREET = HOUR < 12 ? 'Good morning' : HOUR < 18 ? 'Good afternoon' : 'Good evening';

function KpiCard({ icon: Icon, label, value, sub, accent = 'blue' }) {
  const colors = {
    blue:    { ring: 'border-blue-800/60',    bg: 'bg-blue-900/20',    text: 'text-blue-400'    },
    violet:  { ring: 'border-violet-800/60',  bg: 'bg-violet-900/20',  text: 'text-violet-400'  },
    cyan:    { ring: 'border-cyan-800/60',    bg: 'bg-cyan-900/20',    text: 'text-cyan-400'    },
    emerald: { ring: 'border-emerald-800/60', bg: 'bg-emerald-900/20', text: 'text-emerald-400' },
    amber:   { ring: 'border-amber-800/60',   bg: 'bg-amber-900/20',   text: 'text-amber-400'   },
  };
  const c = colors[accent] || colors.blue;
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

function QuickAction({ icon: Icon, label, desc, onClick, accent = 'blue' }) {
  const c = {
    blue:    'bg-blue-600 hover:bg-blue-500',
    violet:  'bg-violet-600 hover:bg-violet-500',
    cyan:    'bg-cyan-600 hover:bg-cyan-500',
    emerald: 'bg-emerald-600 hover:bg-emerald-500',
    amber:   'bg-amber-600 hover:bg-amber-500',
  }[accent] || 'bg-blue-600 hover:bg-blue-500';
  return (
    <button onClick={onClick}
      className="bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-2xl p-4 text-left transition-all group flex items-start gap-3">
      <div className={`w-9 h-9 ${c} rounded-xl flex items-center justify-center shrink-0 transition-colors`}>
        <Icon size={15} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">{label}</p>
        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{desc}</p>
      </div>
      <ChevronRight size={14} className="text-slate-600 group-hover:text-blue-400 ml-auto mt-0.5 transition-colors shrink-0" />
    </button>
  );
}

const STAGES = [
  { label: 'Idea', color: 'bg-slate-600' },
  { label: 'MVP', color: 'bg-blue-600' },
  { label: 'Pre-Revenue', color: 'bg-indigo-600' },
  { label: 'Early', color: 'bg-violet-600' },
  { label: 'Growth', color: 'bg-purple-600' },
  { label: 'Scale', color: 'bg-pink-600' },
  { label: 'IPO Ready', color: 'bg-rose-600' },
];

export default function VenturesDashboard() {
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [stats, setStats] = useState({ applications: 0, portfolio: 0, listings: 0, raised: 0 });
  const [recentFeed, setRecentFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [profileRes, appsRes, companiesRes, feedRes] = await Promise.all([
          supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
          supabase.from('ifb_applications').select('id,stage,capital_ask_usd,status,created_at', { count: 'exact', head: false }).eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
          supabase.from('venturex_companies').select('id', { count: 'exact', head: true }),
          supabase.from('venturex_companies').select('company_name,sector,stage,country,created_at').order('created_at', { ascending: false }).limit(4),
        ]);

        setName(profileRes.data?.full_name?.split(' ')[0] || 'there');

        const apps = appsRes.data || [];
        const totalRaised = apps.reduce((s, a) => s + Number(a.capital_ask_usd || 0), 0);

        setStats({
          applications: apps.length,
          portfolio: companiesRes.count || 0,
          listings: companiesRes.count || 0,
          raised: totalRaised,
        });
        setRecentFeed(feedRes.data || []);
      } catch (_) {}
      setLoading(false);
    }
    load();
  }, []);

  const fmtUSD = n => n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n}`;

  const stageColor = s => {
    const map = { idea: 'bg-slate-700', mvp: 'bg-blue-700', pre_revenue: 'bg-indigo-700', early: 'bg-violet-700', growth: 'bg-purple-700', scale: 'bg-pink-700', ipo_ready: 'bg-rose-700' };
    return map[s] || 'bg-slate-700';
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-500 text-sm font-medium">{GREET}{name ? `, ${name}` : ''}.</p>
          <h1 className="text-3xl font-black text-white mt-0.5">VentureX Hub</h1>
          <p className="text-slate-500 text-sm mt-1">The frontier of African & global venture — accelerate, raise, and grow.</p>
        </div>
        <button onClick={() => window.location.reload()} disabled={loading}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stage pipeline */}
      <div className="bg-slate-900 border border-blue-800/40 rounded-2xl p-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">IFB Venture Pipeline Stages</p>
        <div className="flex items-center gap-1 flex-wrap">
          {STAGES.map((s, i) => (
            <div key={s.label} className="flex items-center gap-1">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black text-white ${s.color}`}>{s.label}</span>
              {i < STAGES.length - 1 && <ArrowRight size={10} className="text-slate-600" />}
            </div>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={Rocket} label="Applications" value={loading ? '—' : stats.applications} sub="submitted by you" accent="blue" />
        <KpiCard icon={Briefcase} label="VentureX Co." value={loading ? '—' : stats.portfolio} sub="in the ecosystem" accent="violet" />
        <KpiCard icon={Globe} label="Active Listings" value={loading ? '—' : stats.listings} sub="global companies" accent="cyan" />
        <KpiCard icon={DollarSign} label="Capital Raised" value={loading ? '—' : fmtUSD(stats.raised)} sub="via applications" accent="emerald" />
      </div>

      {/* Quick Actions */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Your Next Move</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <QuickAction icon={Rocket} label="Apply to Accelerator" desc="Submit your venture for IFB Accelerator" onClick={() => nav('/apply')} accent="blue" />
          <QuickAction icon={Star} label="Launchpad" desc="Public raise — get funded by the network" onClick={() => nav('/launchpad')} accent="violet" />
          <QuickAction icon={Globe} label="Browse Listings" desc="Discover all ventures in the ecosystem" onClick={() => nav('/listings')} accent="cyan" />
          <QuickAction icon={Users} label="Matchmaker" desc="Get paired with the right investor" onClick={() => nav('/matchmaker')} accent="emerald" />
          <QuickAction icon={DollarSign} label="Capital Platform" desc="Access institutional capital" onClick={() => nav('/capital')} accent="blue" />
          <QuickAction icon={TrendingUp} label="Venture Exchange" desc="Secondary market for venture equity" onClick={() => nav('/exchange')} accent="violet" />
          <QuickAction icon={BarChart3} label="Market Intelligence" desc="Industry research & competitive intel" onClick={() => nav('/market')} accent="cyan" />
          <QuickAction icon={Newspaper} label="VentureX Feed" desc="Latest activity in the ecosystem" onClick={() => nav('/feed')} accent="amber" />
        </div>
      </div>

      {/* Recent ecosystem companies */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Recent in the Ecosystem</p>
          <button onClick={() => nav('/listings')}
            className="flex items-center gap-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-widest">
            All Listings <ArrowRight size={11} />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {loading ? (
            <div className="col-span-2 py-8 text-center">
              <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mx-auto" />
            </div>
          ) : recentFeed.length === 0 ? (
            <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl py-10 text-center">
              <Globe size={28} className="text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 text-sm font-semibold">No companies yet</p>
              <button onClick={() => nav('/apply')}
                className="mt-3 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors">
                Be the first to apply →
              </button>
            </div>
          ) : recentFeed.map(co => (
            <div key={co.company_name + co.created_at}
              className="bg-slate-900 border border-slate-800 hover:border-blue-800/60 rounded-2xl p-4 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-black text-white">{co.company_name}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{co.sector} · {co.country}</p>
                </div>
                <span className={`text-[9px] font-black uppercase text-white px-2 py-0.5 rounded-full ${stageColor(co.stage)}`}>
                  {(co.stage || 'idea').replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-blue-900/40 to-slate-900 border border-blue-800/40 rounded-2xl p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-black text-white">Capital Matchmaking</p>
            <p className="text-[11px] text-slate-400">Connect founders with the right investors</p>
          </div>
        </div>
        <button onClick={() => nav('/capital-match')}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors shrink-0">
          Match Me <Target size={12} />
        </button>
      </div>
    </div>
  );
}
