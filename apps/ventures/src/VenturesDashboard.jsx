import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import {
  Rocket, Users, DollarSign, BarChart3,
  ArrowRight, RefreshCw, Briefcase,
  Globe, Zap, TrendingUp, Target, Newspaper, Star
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, color = 'text-blue-600', bg = 'bg-blue-50' }) {
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
  { icon: Rocket,      label: 'Apply to Accelerator', desc: 'Submit your venture',       path: '/apply',        color: 'from-blue-600 to-indigo-600'   },
  { icon: Star,        label: 'Launchpad',            desc: 'Public raise',               path: '/launchpad',    color: 'from-violet-600 to-purple-600' },
  { icon: Globe,       label: 'Browse Listings',      desc: 'All ventures',               path: '/listings',     color: 'from-cyan-600 to-blue-600'     },
  { icon: Users,       label: 'Matchmaker',           desc: 'Founder-investor pairing',   path: '/matchmaker',   color: 'from-emerald-600 to-teal-600'  },
  { icon: DollarSign,  label: 'Capital Platform',     desc: 'Institutional capital',      path: '/capital',      color: 'from-amber-600 to-orange-600'  },
  { icon: TrendingUp,  label: 'Venture Exchange',     desc: 'Secondary equity market',    path: '/exchange',     color: 'from-rose-600 to-red-600'      },
  { icon: BarChart3,   label: 'Market Intel',         desc: 'Competitive research',       path: '/market',       color: 'from-indigo-600 to-violet-600' },
  { icon: Newspaper,   label: 'VentureX Feed',        desc: 'Ecosystem activity',         path: '/feed',         color: 'from-slate-600 to-slate-500'   },
];

const stageKey = s => ({ idea:'bg-slate-200 text-slate-700', mvp:'bg-blue-100 text-blue-700', pre_revenue:'bg-indigo-100 text-indigo-700', early:'bg-violet-100 text-violet-700', growth:'bg-purple-100 text-purple-700', scale:'bg-pink-100 text-pink-700', ipo_ready:'bg-rose-100 text-rose-700' }[s] || 'bg-slate-100 text-slate-600');
const fmtCap = n => n >= 1_000_000 ? `$${(n/1_000_000).toFixed(1)}M` : n >= 1000 ? `$${(n/1000).toFixed(0)}K` : `$${n}`;

export default function VenturesDashboard() {
  const nav = useNavigate();
  const [stats, setStats]   = useState({ apps: 0, listings: 0, raised: 0 });
  const [feed, setFeed]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const [apps, cos, feedRes] = await Promise.all([
          supabase.from('venturex_listed_companies').select('id,raise_amount_usd').eq('user_id', user.id),
          supabase.from('venturex_listed_companies').select('id', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('venturex_listed_companies').select('name,sector,stage,country').eq('status', 'active').order('created_at', { ascending: false }).limit(4),
        ]);
        setStats({
          apps:     (apps.data || []).length,
          listings: cos.count || 0,
          raised:   (apps.data || []).reduce((s, a) => s + Number(a.raise_amount_usd || 0), 0),
        });
        setFeed(feedRes.data || []);
      } catch (_) {}
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-8">

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-900">Ventures Overview</h2>
        <button onClick={() => window.location.reload()} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-xl transition-colors border border-slate-200 shadow-sm">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon={Rocket}    label="Applications"   value={loading ? '—' : stats.apps}      sub="submitted by you"  color="text-blue-600"    bg="bg-blue-50"    />
        <StatCard icon={Briefcase} label="VentureX Co."   value={loading ? '—' : stats.listings}  sub="in ecosystem"      color="text-violet-600"  bg="bg-violet-50"  />
        <StatCard icon={DollarSign}label="Capital Raised" value={loading ? '—' : fmtCap(stats.raised)} sub="via applications" color="text-emerald-600" bg="bg-emerald-50" />
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Your Next Move</p>
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
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Recent in the Ecosystem</p>
          <button onClick={() => nav('/listings')} className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest transition-colors">
            All Listings <ArrowRight size={11} />
          </button>
        </div>
        {loading ? (
          <div className="py-8 flex justify-center"><div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" /></div>
        ) : feed.length === 0 ? (
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl py-12 text-center">
            <Globe size={28} className="text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm font-semibold">No ventures yet</p>
            <button onClick={() => nav('/apply')} className="mt-3 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">Be first to apply →</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {feed.map((co, i) => (
              <div key={i} className="bg-white border border-slate-200 hover:border-blue-200 hover:shadow-md rounded-2xl p-4 transition-all flex items-start justify-between gap-3 shadow-sm">
                <div>
                  <p className="text-sm font-black text-slate-900">{co.name}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{co.sector} · {co.country}</p>
                </div>
                <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full shrink-0 ${stageKey(co.stage)}`}>
                  {(co.stage || 'idea').replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="relative bg-white border border-slate-200 shadow-sm rounded-2xl p-5 overflow-hidden flex items-center justify-between gap-4">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-transparent pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-black text-slate-900">Capital Matchmaking</p>
            <p className="text-[11px] text-slate-500">Connect founders with the right investors</p>
          </div>
        </div>
        <button onClick={() => nav('/capital-match')}
          className="relative flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl shrink-0 hover:shadow-lg hover:shadow-blue-200 transition-all">
          Match Me <Target size={12} />
        </button>
      </div>

    </div>
  );
}
