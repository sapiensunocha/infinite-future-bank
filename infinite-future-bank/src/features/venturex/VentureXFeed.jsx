import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
  Zap, TrendingUp, CheckCircle2, Building2, Users, DollarSign,
  Briefcase, Globe, RefreshCw, Filter, ChevronDown, Loader2,
  ArrowUpRight, Handshake, Rocket, Award, Activity, Radio
} from 'lucide-react';

const SECTORS = [
  'FinTech','AgriTech','HealthTech','EdTech','CleanEnergy','Logistics',
  'E-Commerce','AI/ML','Blockchain','Real Estate','InsurTech','FoodTech',
  'BioTech','Gaming','Media','Mobility','PropTech','LegalTech','HRTech','CyberSecurity'
];

const EVENT_META = {
  deal_proposed:    { label: 'Deal Proposed',    Icon: Briefcase,   color: 'bg-slate-700/60 text-slate-300',   dot: 'bg-slate-400',   accent: 'border-slate-600' },
  deal_negotiating: { label: 'Negotiating',      Icon: Handshake,   color: 'bg-blue-900/40  text-blue-300',    dot: 'bg-blue-400',    accent: 'border-blue-700'  },
  deal_signed:      { label: 'Deal Signed',      Icon: CheckCircle2,color: 'bg-emerald-900/40 text-emerald-300',dot: 'bg-emerald-400', accent: 'border-emerald-700'},
  deal_closed:      { label: 'Funding Closed',   Icon: DollarSign,  color: 'bg-yellow-900/40 text-yellow-300', dot: 'bg-yellow-400',  accent: 'border-yellow-700'},
  milestone_hit:    { label: 'Milestone Hit',    Icon: Award,       color: 'bg-purple-900/40 text-purple-300', dot: 'bg-purple-400',  accent: 'border-purple-700'},
  company_listed:   { label: 'New Listing',      Icon: Rocket,      color: 'bg-indigo-900/40 text-indigo-300', dot: 'bg-indigo-400',  accent: 'border-indigo-700'},
};

const SECTOR_EMOJI = {
  'FinTech':'💳','AgriTech':'🌾','HealthTech':'🏥','EdTech':'📚','CleanEnergy':'⚡',
  'Logistics':'🚚','E-Commerce':'🛒','AI/ML':'🧠','Blockchain':'🔗','Real Estate':'🏗️',
  'InsurTech':'🛡️','FoodTech':'🍽️','BioTech':'🔬','Gaming':'🎮','Media':'📡',
  'Mobility':'🚗','PropTech':'🏘️','LegalTech':'⚖️','HRTech':'👥','CyberSecurity':'🔐',
};

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs  < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30)  return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function StatPill({ icon: Icon, label, value, accent }) {
  return (
    <div className={`flex items-center gap-3 bg-slate-800/80 border ${accent || 'border-slate-700'} rounded-2xl px-4 py-3`}>
      <Icon size={16} className="text-slate-400 shrink-0" />
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</p>
        <p className="text-sm font-black text-white">{value}</p>
      </div>
    </div>
  );
}

function EventCard({ event }) {
  const meta = EVENT_META[event.event_type] || EVENT_META.deal_proposed;
  const Icon = meta.Icon;
  return (
    <div className={`border-l-2 ${meta.accent} bg-slate-800/30 hover:bg-slate-800/60 transition-colors rounded-xl p-4 flex gap-4`}>
      {/* Dot + icon */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${meta.color}`}>
          <Icon size={13} />
        </div>
        <div className={`w-1.5 h-1.5 rounded-full ${meta.dot} mt-0.5`} />
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-black text-white truncate">{event.company_name}</p>
          <span className="text-[9px] font-bold text-slate-500 shrink-0 whitespace-nowrap">{timeAgo(event.happened_at)}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${meta.color}`}>
            {meta.label}
          </span>
          {event.sector && (
            <span className="text-[9px] font-bold text-slate-400">
              {SECTOR_EMOJI[event.sector] || '📊'} {event.sector}
            </span>
          )}
          {event.country && (
            <span className="text-[9px] text-slate-500 flex items-center gap-1">
              <Globe size={9} /> {event.country}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {event.amount_range && (
            <span className="text-xs font-black text-emerald-400 flex items-center gap-1">
              <DollarSign size={10} /> {event.amount_range}
            </span>
          )}
          {event.equity_pct > 0 && (
            <span className="text-[10px] text-slate-500">
              {parseFloat(event.equity_pct).toFixed(1)}% equity
            </span>
          )}
          {event.milestone_title && (
            <span className="text-[10px] text-purple-400 font-bold">
              ✓ {event.milestone_title}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VentureXFeed() {
  const [events, setEvents]         = useState([]);
  const [stats, setStats]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sector, setSector]         = useState(null);
  const [typeFilter, setTypeFilter] = useState(null);
  const [offset, setOffset]         = useState(0);
  const [hasMore, setHasMore]       = useState(true);
  const [newCount, setNewCount]     = useState(0);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [showSectors, setShowSectors] = useState(false);
  const subRef = useRef(null);
  const LIMIT = 30;

  const fetchStats = useCallback(async () => {
    const { data } = await supabase.rpc('get_venturex_stats');
    if (data) setStats(data);
  }, []);

  const fetchFeed = useCallback(async (reset = false) => {
    const off = reset ? 0 : offset;
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const { data, error } = await supabase.rpc('get_venturex_feed', {
        p_limit:  LIMIT,
        p_offset: off,
        p_sector: sector   || null,
        p_type:   typeFilter || null,
      });
      if (error) throw error;
      const rows = data || [];
      if (reset) {
        setEvents(rows);
        setOffset(LIMIT);
      } else {
        setEvents(prev => [...prev, ...rows]);
        setOffset(off + LIMIT);
      }
      setHasMore(rows.length === LIMIT);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setLastRefresh(Date.now());
      setNewCount(0);
    }
  }, [sector, typeFilter, offset]);

  // Initial load + re-fetch on filter change
  useEffect(() => {
    fetchStats();
    fetchFeed(true);
  }, [sector, typeFilter]); // eslint-disable-line

  // Realtime subscription — count new deals as they arrive
  useEffect(() => {
    const channel = supabase.channel('venturex-live')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'venturex_deals'
      }, () => setNewCount(n => n + 1))
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'venturex_milestones',
        filter: 'is_completed=eq.true'
      }, () => setNewCount(n => n + 1))
      .subscribe();
    subRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Auto-refresh every 60 s
  useEffect(() => {
    const id = setInterval(() => {
      fetchStats();
      if (newCount > 0) fetchFeed(true);
    }, 60000);
    return () => clearInterval(id);
  }, [newCount, fetchStats, fetchFeed]);

  const fmt = (n) => {
    if (!n && n !== 0) return '—';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
    return n.toLocaleString();
  };

  const TYPE_FILTERS = [
    { key: null,        label: 'All Activity' },
    { key: 'deal',      label: 'Deals' },
    { key: 'milestone', label: 'Milestones' },
    { key: 'listing',   label: 'New Listings' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* ── Header ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-emerald-900/10 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Live Feed</span>
                </div>
                <Radio size={14} className="text-emerald-400 animate-pulse" />
              </div>
              <h2 className="text-2xl font-black tracking-tight">VentureX Activity Stream</h2>
              <p className="text-sm text-slate-400 mt-1">Every deal, milestone and listing — happening right now across the network</p>
            </div>
            <button
              onClick={() => fetchFeed(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-black uppercase tracking-widest text-slate-300 transition-all"
            >
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatPill icon={Building2}  label="Companies"        value={Number(stats.total_companies).toLocaleString()}  accent="border-slate-700" />
              <StatPill icon={Users}      label="Investors"        value={Number(stats.active_investors).toLocaleString()} accent="border-blue-800"  />
              <StatPill icon={Activity}   label="Total Deals"      value={Number(stats.total_deals).toLocaleString()}      accent="border-slate-700" />
              <StatPill icon={CheckCircle2} label="Signed"         value={Number(stats.signed_deals).toLocaleString()}     accent="border-emerald-800" />
              <StatPill icon={Zap}        label="Closed"           value={Number(stats.closed_deals).toLocaleString()}     accent="border-yellow-800" />
              <StatPill icon={DollarSign} label="Capital Deployed" value={fmt(stats.capital_deployed)}                    accent="border-emerald-800" />
            </div>
          )}
        </div>
      </div>

      {/* ── New events badge ── */}
      {newCount > 0 && (
        <button
          onClick={() => fetchFeed(true)}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30"
        >
          <ArrowUpRight size={14} /> {newCount} new event{newCount > 1 ? 's' : ''} — tap to refresh
        </button>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Type filter pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {TYPE_FILTERS.map(f => (
            <button
              key={String(f.key)}
              onClick={() => setTypeFilter(f.key)}
              className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                typeFilter === f.key
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Sector selector */}
        <div className="relative ml-auto">
          <button
            onClick={() => setShowSectors(s => !s)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-white transition-all"
          >
            <Filter size={12} />
            {sector ? `${SECTOR_EMOJI[sector] || ''} ${sector}` : 'All Sectors'}
            <ChevronDown size={12} className={`transition-transform ${showSectors ? 'rotate-180' : ''}`} />
          </button>
          {showSectors && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
              <button
                onClick={() => { setSector(null); setShowSectors(false); }}
                className={`w-full text-left px-4 py-3 text-xs font-bold transition-colors ${!sector ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                All Sectors
              </button>
              <div className="max-h-64 overflow-y-auto">
                {SECTORS.map(s => (
                  <button
                    key={s}
                    onClick={() => { setSector(s); setShowSectors(false); }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors flex items-center gap-2 ${sector === s ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                  >
                    {SECTOR_EMOJI[s] || '📊'} {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Top Sectors Strip ── */}
      {stats?.top_sectors && (
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {stats.top_sectors.map(s => (
            <button
              key={s.sector}
              onClick={() => setSector(prev => prev === s.sector ? null : s.sector)}
              className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                sector === s.sector
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
              }`}
            >
              {SECTOR_EMOJI[s.sector] || '📊'} {s.sector}
              <span className="bg-slate-700/60 px-1.5 py-0.5 rounded-md text-[9px]">{s.deal_count}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Feed ── */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-blue-500" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <TrendingUp size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-bold">No activity found for this filter</p>
          </div>
        ) : (
          <>
            {events.map((e, idx) => (
              <EventCard key={`${e.event_id}-${e.event_type}-${idx}`} event={e} />
            ))}
            {hasMore && (
              <button
                onClick={() => fetchFeed(false)}
                disabled={loadingMore}
                className="w-full py-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loadingMore ? <Loader2 size={14} className="animate-spin" /> : <ChevronDown size={14} />}
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Footer refresh note ── */}
      <p className="text-center text-[10px] text-slate-600 font-bold uppercase tracking-widest">
        Auto-refreshes every 60s · Last updated {timeAgo(lastRefresh)}
      </p>
    </div>
  );
}
