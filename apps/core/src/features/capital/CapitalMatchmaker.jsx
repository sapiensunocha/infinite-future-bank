/**
 * CapitalMatchmaker — IFB AI Capital Match Engine
 * Calls get_capital_matches() and presents ranked results
 * across grants, loans, bonds and equities.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
  Zap, Gift, Banknote, FileText, TrendingUp, RefreshCw,
  CheckCircle2, AlertTriangle, ExternalLink, ChevronDown,
  ChevronUp, Building, Globe, Target, Sparkles, BarChart3,
  ShieldCheck, Clock, DollarSign, Star, Info, ArrowRight,
  Search, SlidersHorizontal, X
} from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────

const TYPE_META = {
  funding: { label: 'Grant / Funding', icon: Gift,       color: 'emerald', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
  loan:    { label: 'Loan',            icon: Banknote,    color: 'blue',    bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',    badge: 'bg-blue-100 text-blue-700'       },
  bond:    { label: 'Bond',            icon: FileText,    color: 'indigo',  bg: 'bg-indigo-50',  border: 'border-indigo-200',  text: 'text-indigo-700',  badge: 'bg-indigo-100 text-indigo-700'   },
  equity:  { label: 'Equity / ETF',   icon: TrendingUp,  color: 'violet',  bg: 'bg-violet-50',  border: 'border-violet-200',  text: 'text-violet-700',  badge: 'bg-violet-100 text-violet-700'   },
};

const scoreColor = (s) => {
  if (s >= 75) return { ring: 'text-emerald-500', label: 'Strong Match',  bg: 'bg-emerald-500' };
  if (s >= 50) return { ring: 'text-blue-500',    label: 'Good Match',    bg: 'bg-blue-500'    };
  return              { ring: 'text-amber-500',   label: 'Partial Match', bg: 'bg-amber-500'   };
};

const fmt = (n, cur = 'USD') => {
  if (!n && n !== 0) return '—';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
};

// ── ScoreRing ─────────────────────────────────────────────────
function ScoreRing({ score }) {
  const c   = scoreColor(score);
  const r   = 18;
  const circ = 2 * Math.PI * r;
  const pct  = (score / 100) * circ;
  return (
    <div className="relative w-14 h-14 flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} fill="none" stroke="#e2e8f0" strokeWidth="3.5" />
        <circle cx="22" cy="22" r={r} fill="none" stroke="currentColor"
          strokeWidth="3.5" strokeDasharray={`${pct} ${circ}`}
          strokeLinecap="round" className={`${c.ring} transition-all duration-700`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-[13px] font-black leading-none ${c.ring}`}>{Math.round(score)}</span>
      </div>
    </div>
  );
}

// ── MatchCard ─────────────────────────────────────────────────
function MatchCard({ m }) {
  const [expanded, setExpanded] = useState(false);
  const meta  = TYPE_META[m.capital_type] || TYPE_META.funding;
  const sc    = scoreColor(m.match_score);
  const Icon  = meta.icon;

  const reasons      = Array.isArray(m.match_reasons)  ? m.match_reasons.filter(Boolean)  : [];
  const disqualifiers= Array.isArray(m.disqualifiers)   ? m.disqualifiers.filter(Boolean)   : [];

  return (
    <div className={`bg-white border ${meta.border} rounded-[2rem] shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden group`}>

      {/* top strip */}
      <div className={`${meta.bg} px-5 pt-5 pb-4`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <ScoreRing score={m.match_score} />
            <div className="min-w-0">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${meta.badge} mb-1`}>
                <Icon size={10} /> {meta.label}
              </span>
              <p className="font-black text-slate-800 text-sm leading-tight line-clamp-2">{m.name}</p>
              <p className="text-[10px] font-bold text-slate-500 mt-0.5 flex items-center gap-1">
                <Building size={10} /> {m.provider_name}
              </p>
            </div>
          </div>
          <span className={`shrink-0 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${sc.bg} text-white`}>
            {sc.label}
          </span>
        </div>
      </div>

      {/* body */}
      <div className="px-5 py-4 flex-1 space-y-3">

        {/* amount + key detail */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 rounded-xl p-2.5">
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Amount Range</p>
            <p className="text-xs font-black text-slate-800">
              {m.amount_min ? `${fmt(m.amount_min)} – ${fmt(m.amount_max)}` : '—'}
            </p>
            <p className="text-[9px] font-bold text-slate-400">{m.currency}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-2.5">
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
              {m.capital_type === 'loan' ? 'Interest Rate' : m.capital_type === 'bond' ? 'Yield / Rating' : 'Type / Return'}
            </p>
            <p className="text-xs font-black text-slate-800 line-clamp-2">{m.key_detail || '—'}</p>
          </div>
        </div>

        {/* match reasons */}
        {reasons.length > 0 && (
          <div className="space-y-1">
            {reasons.slice(0, expanded ? reasons.length : 2).map((r, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[10px] font-bold text-emerald-700">
                <CheckCircle2 size={11} className="mt-0.5 shrink-0 text-emerald-500" />
                <span>{r}</span>
              </div>
            ))}
          </div>
        )}

        {/* disqualifiers (collapsible) */}
        {expanded && disqualifiers.length > 0 && (
          <div className="space-y-1 pt-1 border-t border-amber-100">
            {disqualifiers.map((d, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[10px] font-bold text-amber-700">
                <AlertTriangle size={11} className="mt-0.5 shrink-0 text-amber-500" />
                <span>{d}</span>
              </div>
            ))}
          </div>
        )}

        {/* expand toggle */}
        {(reasons.length > 2 || disqualifiers.length > 0) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? 'Less' : `+${(reasons.length - 2) + disqualifiers.length} more`}
          </button>
        )}
      </div>

      {/* footer CTA */}
      <div className="px-5 pb-5">
        {m.application_url ? (
          <a
            href={m.application_url}
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all hover:-translate-y-0.5 shadow-sm ${
              m.capital_type === 'funding' ? 'bg-emerald-600 hover:bg-emerald-700' :
              m.capital_type === 'loan'    ? 'bg-blue-600 hover:bg-blue-700' :
              m.capital_type === 'bond'    ? 'bg-indigo-600 hover:bg-indigo-700' :
                                             'bg-violet-600 hover:bg-violet-700'
            }`}
          >
            Apply Now <ExternalLink size={12} />
          </a>
        ) : (
          <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">
            View Details <ArrowRight size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── ScoreBreakdownBar ─────────────────────────────────────────
function ProfilePill({ label, value, icon: Icon }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full shadow-sm">
      {Icon && <Icon size={11} className="text-blue-500" />}
      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</span>
      <span className="text-[10px] font-black text-slate-800">{value}</span>
    </div>
  );
}

// ── FILTER TABS ───────────────────────────────────────────────
const FILTERS = [
  { id: null,       label: 'All',     icon: Sparkles   },
  { id: 'funding',  label: 'Grants',  icon: Gift       },
  { id: 'loan',     label: 'Loans',   icon: Banknote   },
  { id: 'bond',     label: 'Bonds',   icon: FileText   },
  { id: 'equity',   label: 'Equities',icon: TrendingUp },
];

// ── MAIN COMPONENT ────────────────────────────────────────────
export default function CapitalMatchmaker({ session, profile, commercialProfile }) {
  const [matches,    setMatches]    = useState([]);
  const [matchProfile, setMatchProfile] = useState(null);
  const [isLoading,  setIsLoading]  = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error,      setError]      = useState(null);
  const [filter,     setFilter]     = useState(null);  // null = all
  const [minScore,   setMinScore]   = useState(40);
  const [search,     setSearch]     = useState('');
  const [showFilters,setShowFilters]= useState(false);

  const load = useCallback(async (refresh = false) => {
    if (!session?.user?.id) return;
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);
    try {
      // Refresh match store
      if (refresh) {
        await supabase.rpc('refresh_capital_matches', { p_user_id: session.user.id });
      }

      // Fetch matches
      const params = { p_user_id: session.user.id, p_limit: 60 };
      if (filter) params.p_type = filter;
      const { data, error: rpcErr } = await supabase.rpc('get_capital_matches', params);
      if (rpcErr) throw rpcErr;
      setMatches(data || []);

      // Fetch match profile
      const { data: mp } = await supabase
        .from('capital_match_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();
      setMatchProfile(mp);
    } catch (err) {
      setError(err.message || 'Could not load matches.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [session?.user?.id, filter]);

  useEffect(() => { load(false); }, [load]);

  // Filtered + searched view
  const visible = matches.filter(m => {
    if (m.match_score < minScore) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return m.name?.toLowerCase().includes(q) || m.provider_name?.toLowerCase().includes(q);
    }
    return true;
  });

  const highCount   = matches.filter(m => m.match_score >= 75).length;
  const medCount    = matches.filter(m => m.match_score >= 50 && m.match_score < 75).length;
  const countByType = (t) => matches.filter(m => m.capital_type === t).length;

  // ── LOADING ───────────────────────────────────────────────
  if (isLoading) return (
    <div className="max-w-6xl mx-auto py-20 flex flex-col items-center gap-4">
      <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
        <Zap size={28} className="text-blue-500 animate-pulse" />
      </div>
      <p className="font-black text-[10px] uppercase tracking-widest text-slate-400">
        Scanning 180+ global capital sources...
      </p>
      <div className="flex gap-1 mt-2">
        {[0,1,2,3,4].map(i => (
          <div key={i} className="w-1.5 h-6 bg-blue-200 rounded-full animate-pulse"
            style={{ animationDelay: `${i * 0.1}s`, animationDuration: '0.8s' }} />
        ))}
      </div>
    </div>
  );

  // ── ERROR ─────────────────────────────────────────────────
  if (error) return (
    <div className="max-w-xl mx-auto py-20 text-center space-y-4">
      <AlertTriangle size={40} className="mx-auto text-red-400" />
      <p className="font-black text-slate-700">Match engine error</p>
      <p className="text-sm text-slate-500">{error}</p>
      <button onClick={() => load(false)} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest">
        Retry
      </button>
    </div>
  );

  // ── MAIN RENDER ───────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">

      {/* ── HEADER ─────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-[3rem] p-8 md:p-10 relative overflow-hidden shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(59,130,246,0.15),_transparent_60%)] pointer-events-none" />
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                  <Zap size={20} className="text-blue-400" />
                </div>
                <h1 className="text-3xl font-black tracking-tight">Capital Matchmaker</h1>
              </div>
              <p className="text-slate-400 text-sm font-medium max-w-lg">
                AI-ranked opportunities across grants, loans, bonds and equities — matched to your exact profile in real time.
              </p>
            </div>
            <button
              onClick={() => load(true)}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 shrink-0"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Matches'}
            </button>
          </div>

          {/* stats row */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Matches',    value: matches.length,       color: 'text-white'         },
              { label: 'Strong Matches',   value: highCount,            color: 'text-emerald-400'   },
              { label: 'Good Matches',     value: medCount,             color: 'text-blue-400'      },
              { label: 'Grants / Funding', value: countByType('funding'),color: 'text-amber-400'    },
            ].map(s => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── PROFILE BANNER ────────────────────────────────── */}
      {matchProfile && (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mr-1">Your Match Profile</span>
            <ProfilePill label="Type"    value={matchProfile.entity_type?.replace('_', ' ')} icon={Building} />
            <ProfilePill label="Region"  value={matchProfile.region}                         icon={Globe}    />
            <ProfilePill label="Country" value={matchProfile.country}                        icon={Globe}    />
            <ProfilePill label="Sector"  value={matchProfile.sector?.slice(0,2).join(', ')}  icon={Target}   />
            <ProfilePill label="Need"    value={fmt(matchProfile.capital_need_usd)}           icon={DollarSign} />
            {matchProfile.is_kyc_verified && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
                <ShieldCheck size={11} className="text-emerald-500" />
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700">KYC Verified</span>
              </div>
            )}
          </div>
          {matchProfile.entity_type === 'individual' && (
            <p className="mt-3 text-[10px] font-bold text-amber-600 flex items-center gap-1.5">
              <Info size={12} />
              Complete your Business Hub profile to unlock more precise matches (loans, equity, DFI grants).
            </p>
          )}
        </div>
      )}

      {/* ── FILTERS ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {/* type filter tabs */}
        <div className="flex gap-1.5 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm overflow-x-auto no-scrollbar">
          {FILTERS.map(f => {
            const Icon = f.icon;
            const count = f.id ? countByType(f.id) : matches.length;
            return (
              <button
                key={String(f.id)}
                onClick={() => setFilter(f.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  filter === f.id
                    ? 'bg-slate-900 text-white shadow'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <Icon size={11} /> {f.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[8px] ${filter === f.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* search + advanced filter */}
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 w-48 shadow-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                <X size={12} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'} shadow-sm`}
          >
            <SlidersHorizontal size={12} /> Score
          </button>
        </div>
      </div>

      {/* ── ADVANCED SCORE FILTER ───────────────────────────── */}
      {showFilters && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm animate-in slide-in-from-top-2">
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-2">
            Minimum Match Score: <span className="text-blue-600">{minScore}</span>
          </label>
          <input
            type="range" min={0} max={90} step={5}
            value={minScore}
            onChange={e => setMinScore(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
          <div className="flex justify-between text-[8px] font-black text-slate-400 mt-1 uppercase tracking-widest">
            <span>All</span><span>40 — Partial</span><span>75 — Strong</span><span>90+</span>
          </div>
        </div>
      )}

      {/* ── RESULTS COUNT ──────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          {visible.length} result{visible.length !== 1 ? 's' : ''}{search ? ` for "${search}"` : ''}
          {filter ? ` · ${FILTERS.find(f => f.id === filter)?.label}` : ''}
        </p>
        {visible.length > 0 && (
          <p className="text-[9px] font-bold text-slate-400">Sorted by match score</p>
        )}
      </div>

      {/* ── EMPTY STATE ───────────────────────────────────── */}
      {visible.length === 0 && !isLoading && (
        <div className="text-center py-20 space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
            <Target size={32} className="text-slate-300" />
          </div>
          <p className="font-black text-slate-600">No matches found</p>
          <p className="text-sm text-slate-400">
            {search ? 'Try a different search term' : 'Try lowering the minimum score or removing filters'}
          </p>
          <button
            onClick={() => { setSearch(''); setMinScore(30); setFilter(null); }}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* ── MATCH GRID ────────────────────────────────────── */}
      {visible.length > 0 && (
        <>
          {/* HIGH PRIORITY */}
          {visible.filter(m => m.match_score >= 75).length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Star size={14} className="text-emerald-500" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                  Strong Matches — Score 75+
                </p>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[8px] font-black uppercase">
                  {visible.filter(m => m.match_score >= 75).length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {visible.filter(m => m.match_score >= 75).map(m => (
                  <MatchCard key={`${m.capital_type}-${m.capital_id}`} m={m} />
                ))}
              </div>
            </div>
          )}

          {/* GOOD MATCHES */}
          {visible.filter(m => m.match_score >= 50 && m.match_score < 75).length > 0 && (
            <div className="space-y-3 mt-8">
              <div className="flex items-center gap-2">
                <BarChart3 size={14} className="text-blue-500" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                  Good Matches — Score 50–74
                </p>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[8px] font-black uppercase">
                  {visible.filter(m => m.match_score >= 50 && m.match_score < 75).length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {visible.filter(m => m.match_score >= 50 && m.match_score < 75).map(m => (
                  <MatchCard key={`${m.capital_type}-${m.capital_id}`} m={m} />
                ))}
              </div>
            </div>
          )}

          {/* PARTIAL MATCHES */}
          {visible.filter(m => m.match_score < 50).length > 0 && (
            <div className="space-y-3 mt-8">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-amber-500" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                  Partial Matches — Worth Exploring
                </p>
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-[8px] font-black uppercase">
                  {visible.filter(m => m.match_score < 50).length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {visible.filter(m => m.match_score < 50).map(m => (
                  <MatchCard key={`${m.capital_type}-${m.capital_id}`} m={m} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
