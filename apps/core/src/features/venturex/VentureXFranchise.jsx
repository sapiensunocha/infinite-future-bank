import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
  Building2, TrendingUp, Zap, Globe, Users, DollarSign, Award,
  ShieldCheck, Loader2, ChevronRight, ArrowUpRight, BarChart3,
  CheckCircle2, Lock, Star, Layers, PieChart, Activity, Target,
  RefreshCw, AlertCircle, Plus, X, MapPin, Briefcase, Crown,
  Network, Link2, BadgeCheck, Rocket, Filter, Sparkles,
  HandCoins, Landmark, LineChart, Leaf, GraduationCap
} from 'lucide-react';
import EntrepreneurApplication from './EntrepreneurApplication';

// ── Capital Match Panel ───────────────────────────────────────────────────────
const TYPE_META = {
  funding: { label: 'Grant / Funding', Icon: Sparkles,  color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  loan:    { label: 'Loan',            Icon: HandCoins,  color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-200'    },
  bond:    { label: 'Bond',            Icon: Landmark,   color: 'text-yellow-600',  bg: 'bg-yellow-50 border-yellow-200'},
  equity:  { label: 'Equity / ETF',   Icon: LineChart,  color: 'text-purple-600',  bg: 'bg-purple-50 border-purple-200'},
};
const TIER_COLOR = { strong: 'text-emerald-600', good: 'text-blue-600', partial: 'text-slate-500' };

function ScoreRing({ score }) {
  const r = 18, c = 2 * Math.PI * r;
  const filled = (score / 100) * c;
  const color = score >= 75 ? '#34d399' : score >= 50 ? '#60a5fa' : '#94a3b8';
  return (
    <svg width={48} height={48} viewBox="0 0 48 48">
      <circle cx={24} cy={24} r={r} fill="none" stroke="#1e293b" strokeWidth={4}/>
      <circle cx={24} cy={24} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={`${filled} ${c - filled}`} strokeLinecap="round"
        transform="rotate(-90 24 24)"/>
      <text x={24} y={29} textAnchor="middle" fill={color} fontSize={11} fontWeight="900">{score}</text>
    </svg>
  );
}

function MatchCard({ match }) {
  const [expanded, setExpanded] = useState(false);
  const meta  = TYPE_META[match.type] || TYPE_META.loan;
  const Icon  = meta.Icon;
  const inst  = match.instrument || {};
  const name  = inst.program_name || inst.product_name || inst.bond_name || inst.company_name || inst.ticker || 'Instrument';
  const amMin = inst.amount_min_usd || inst.face_value;
  const amMax = inst.amount_max_usd || inst.outstanding_amount_usd;
  const fmt   = n => !n ? '' : n >= 1e9 ? `$${(n/1e9).toFixed(1)}B` : n >= 1e6 ? `$${(n/1e6).toFixed(1)}M` : `$${(n/1e3).toFixed(0)}K`;

  return (
    <div className={`border rounded-2xl p-4 ${meta.bg} space-y-3`}>
      <div className="flex items-start gap-3">
        <ScoreRing score={match.score}/>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className={`text-xs font-semibold ${meta.color}`}>
              <Icon size={9} className="inline mr-1"/>{meta.label}
            </span>
            <span className={`text-xs font-semibold ${TIER_COLOR[match.tier]}`}>
              {match.tier}
            </span>
          </div>
          <p className="text-sm font-bold text-slate-900 leading-tight truncate">{name}</p>
          <p className="text-[11px] text-slate-500">{match.provider_name}</p>
          {(amMin || amMax) && (
            <p className="text-xs text-slate-500 mt-0.5">
              {fmt(amMin)}{amMin && amMax ? ' – ' : ''}{fmt(amMax)}
            </p>
          )}
        </div>
        <button onClick={() => setExpanded(x => !x)}
          className="text-slate-500 hover:text-slate-900 transition-colors shrink-0">
          <ChevronRight size={14} className={`transition-transform ${expanded ? 'rotate-90' : ''}`}/>
        </button>
      </div>

      {expanded && (
        <div className="space-y-2 border-t border-slate-200 pt-3">
          {match.reasons?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Why it matches</p>
              {match.reasons.map((r, i) => (
                <p key={i} className="text-[11px] text-emerald-600 flex items-start gap-1"><CheckCircle2 size={10} className="mt-0.5 shrink-0"/>{r}</p>
              ))}
            </div>
          )}
          {match.disqualifiers?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Caveats</p>
              {match.disqualifiers.map((d, i) => (
                <p key={i} className="text-[11px] text-yellow-600 flex items-start gap-1"><AlertCircle size={10} className="mt-0.5 shrink-0"/>{d}</p>
              ))}
            </div>
          )}
          {match.pathway && (
            <div className="bg-white rounded-xl p-3">
              <p className="text-xs font-semibold text-slate-500 mb-1">Your Pathway</p>
              <p className="text-[11px] text-slate-900">{match.pathway}</p>
            </div>
          )}
          {match.amount_recommended_usd > 0 && (
            <p className="text-xs text-blue-600 font-bold">
              Recommended amount: {fmt(match.amount_recommended_usd)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function CapitalMatchPanel({ session, myCompany }) {
  const [matches, setMatches]   = useState([]);
  const [summary, setSummary]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [typeFilter, setFilter] = useState('all');
  const [refreshed, setRefreshed] = useState(false);

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://nfztdpyygfrpbjbhidxe.supabase.co';
  const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5menRkcHl5Z2ZycGJqYmhpZHhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MzcxOTEsImV4cCI6MjA4NzExMzE5MX0.Ydo6vduICdQwBrygEN1e5JswVVaATLChNLtq7whqf7I';

  const load = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true); setError(null);
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/capital-matchmaker`,
        {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${s?.access_token || SUPABASE_KEY}`,
          },
          body: JSON.stringify({
            user_id:   session.user.id,
            limit:     40,
            min_score: 30,
            type:      typeFilter === 'all' ? undefined : typeFilter,
          }),
        }
      );
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const json = await res.json();
      setMatches(json.matches || []);
      setSummary(json.summary || null);
      setRefreshed(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, typeFilter, SUPABASE_URL, SUPABASE_KEY]);

  useEffect(() => { load(); }, [load]);

  const filtered = typeFilter === 'all' ? matches : matches.filter(m => m.type === typeFilter);
  const strong   = filtered.filter(m => m.tier === 'strong');
  const good     = filtered.filter(m => m.tier === 'good');
  const partial  = filtered.filter(m => m.tier === 'partial');

  const fmt = n => !n ? '$0' : n >= 1e12 ? `$${(n/1e12).toFixed(1)}T` : n >= 1e9 ? `$${(n/1e9).toFixed(1)}B` : n >= 1e6 ? `$${(n/1e6).toFixed(1)}M` : `$${(n/1e3).toFixed(0)}K`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 text-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-transparent pointer-events-none"/>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={14} className="text-blue-600"/>
            <span className="text-xs font-semibold text-blue-600">AFR Capital Engine</span>
          </div>
          <h3 className="text-xl font-bold">Your Capital Matches</h3>
          <p className="text-sm text-slate-500 mt-1">
            AI-scored against {summary?.total_scored || '—'} global instruments across grants, loans, bonds & equities.
          </p>
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {[
                { label: 'Strong Matches', value: summary.strong, color: 'text-emerald-600' },
                { label: 'Good Matches',   value: summary.good,   color: 'text-blue-600'    },
                { label: 'Max Accessible', value: fmt(summary.max_accessible_usd), color: 'text-yellow-600' },
                { label: 'Top Score',      value: `${summary.top_match_score}/100`, color: 'text-purple-600' },
              ].map(s => (
                <div key={s.label} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-slate-500">{s.label}</p>
                  <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Type filters */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'all',     label: 'All',     Icon: Zap      },
          { id: 'funding', label: 'Grants',  Icon: Sparkles },
          { id: 'loan',    label: 'Loans',   Icon: HandCoins },
          { id: 'bond',    label: 'Bonds',   Icon: Landmark  },
          { id: 'equity',  label: 'Equities',Icon: LineChart  },
        ].map(f => (
          <button key={f.id}
            onClick={() => setFilter(f.id)}
            className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              typeFilter === f.id ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-500 border border-slate-200 hover:text-slate-900'
            }`}>
            <f.Icon size={11}/>{f.label}
            {summary && f.id !== 'all' && (
              <span className="ml-1 bg-slate-50 px-1.5 py-0.5 rounded-full text-xs">
                {summary.by_type?.[f.id] || 0}
              </span>
            )}
          </button>
        ))}
        <button onClick={load} disabled={loading}
          className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-50 text-slate-500 border border-slate-200 hover:text-slate-900 ml-auto">
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''}/>Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle size={16} className="text-red-600"/>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Zap size={28} className="text-blue-600 animate-pulse"/>
          <p className="text-sm font-semibold text-slate-500">AFR Engine Scoring...</p>
        </div>
      )}

      {/* Results */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-5">
          {strong.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-emerald-600 mb-2 flex items-center gap-1">
                <CheckCircle2 size={10}/>Strong Matches ({strong.length})
              </p>
              <div className="space-y-3">{strong.map(m => <MatchCard key={`${m.type}-${m.id}`} match={m}/>)}</div>
            </section>
          )}
          {good.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-blue-600 mb-2 flex items-center gap-1">
                <Star size={10}/>Good Matches ({good.length})
              </p>
              <div className="space-y-3">{good.map(m => <MatchCard key={`${m.type}-${m.id}`} match={m}/>)}</div>
            </section>
          )}
          {partial.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
                <Target size={10}/>Partial Matches ({partial.length})
              </p>
              <div className="space-y-3">{partial.map(m => <MatchCard key={`${m.type}-${m.id}`} match={m}/>)}</div>
            </section>
          )}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && refreshed && (
        <div className="text-center py-16">
          <Zap size={32} className="text-slate-700 mx-auto mb-3"/>
          <p className="text-sm font-bold text-slate-500">No matches found</p>
          <p className="text-xs text-slate-600 mt-1">Complete your business profile to unlock matches</p>
        </div>
      )}
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────────────
const SECTOR_EMOJI = {
  FinTech:'💳',AgriTech:'🌾',HealthTech:'🏥',EdTech:'📚',CleanEnergy:'⚡',
  Logistics:'🚚','E-Commerce':'🛒','AI/ML':'🧠',Blockchain:'🔗','Real Estate':'🏗️',
  InsurTech:'🛡️',FoodTech:'🍽️',BioTech:'🔬',Gaming:'🎮',Media:'📡',
  Mobility:'🚗',PropTech:'🏘️',LegalTech:'⚖️',HRTech:'👥',CyberSecurity:'🔐',
};
const TIER_META = {
  node_operator:    { label:'Node Operator',    color:'bg-slate-100 text-slate-600',        icon: Building2, limit:'20 companies',  fee:'$500/mo'  },
  regional_hub:     { label:'Regional Hub',     color:'bg-blue-50 text-blue-600',       icon: Globe,     limit:'100 companies', fee:'$2,000/mo'},
  master_franchise: { label:'Master Franchise', color:'bg-yellow-50 text-yellow-600',   icon: Crown,     limit:'500 companies', fee:'$10,000/mo'},
};
const fmt = (n) => {
  if (!n && n !== 0) return '—';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
  return '$' + Number(n).toFixed(0);
};
const pct = (a, b) => (b > 0 ? ((a / b) * 100).toFixed(1) : '0') + '%';

// ── sub-components ────────────────────────────────────────────────
function TierBadge({ tier }) {
  const m = TIER_META[tier] || TIER_META.node_operator;
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${m.color}`}><m.icon size={9}/>{m.label}</span>;
}

function KpiCard({ icon: Icon, label, value, sub, accent = 'border-slate-200', dark }) {
  return (
    <div className={`${dark ? 'bg-slate-50' : 'bg-white'} border ${accent} rounded-2xl p-5`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className="text-slate-500" /><p className="text-xs font-semibold text-slate-500">{label}</p>
      </div>
      <p className={`text-xl font-bold ${dark ? 'text-slate-900' : 'text-slate-900'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function FunnelBar({ label, count, total, color }) {
  const w = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs font-bold mb-1">
        <span className="text-slate-500">{label}</span>
        <span className="text-slate-900">{count} <span className="text-slate-500">({w}%)</span></span>
      </div>
      <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${w}%` }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SECTION: Directory (all users)
// ─────────────────────────────────────────────────────────────────
function Directory({ onApply, userFranchise, setView }) {
  const [data, setData]           = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [sectorFilter, setSector] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: dir }, { data: lb }] = await Promise.all([
        supabase.rpc('get_franchise_directory', { p_limit: 30, p_offset: 0, p_sector: sectorFilter }),
        supabase.rpc('get_franchise_leaderboard', { p_limit: 10 }),
      ]);
      setData(dir || []);
      setLeaderboard(lb || []);
      setLoading(false);
    })();
  }, [sectorFilter]);

  const top3 = leaderboard.slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="bg-white border border-slate-200 rounded-3xl p-8 text-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-transparent to-blue-50 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Network size={18} className="text-indigo-600" />
                <span className="text-xs font-semibold text-indigo-600">IFB Franchise Network</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">VentureX Node Operators</h2>
              <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
                Licensed operators who run their own deal pipeline — connected to IFB's master exchange. Every franchise company is cross-listed globally. Operators compete for capital deployment leadership.
              </p>
            </div>
            {!userFranchise && (
              <button onClick={onApply} className="ui-btn ui-btn-primary shrink-0 w-auto">
                <Rocket size={14} /> Apply for Franchise
              </button>
            )}
            {userFranchise && (
              <button onClick={() => setView('dashboard')} className="ui-btn ui-btn-primary shrink-0 w-auto">
                <BarChart3 size={14} /> My Franchise
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Top 3 podium */}
      {top3.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 mb-4 flex items-center gap-2"><Award size={12}/> Leaderboard — Top Franchises</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {top3.map((f, idx) => (
              <div key={f.franchise_id} className={`rounded-[1.5rem] p-6 border relative overflow-hidden ${
                idx === 0 ? 'bg-yellow-50 border-yellow-200' :
                idx === 1 ? 'bg-slate-100 border-slate-200' :
                            'bg-orange-50 border-orange-200'
              }`}>
                <div className="flex items-start justify-between mb-3">
                  <span className={`text-3xl font-bold ${idx===0?'text-yellow-600':idx===1?'text-slate-600':'text-orange-600'}`}>#{f.rank}</span>
                  <TierBadge tier={f.tier} />
                </div>
                <p className="font-bold text-slate-900 text-sm mb-1">{f.franchise_name}</p>
                <p className="text-xs text-slate-500 mb-3">{SECTOR_EMOJI[f.primary_sector]||'📊'} {f.primary_sector}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><p className="text-slate-500">Capital</p><p className="font-bold text-emerald-600">{fmt(f.total_capital)}</p></div>
                  <div><p className="text-slate-500">Deals</p><p className="font-bold text-slate-900">{f.total_deals}</p></div>
                  <div><p className="text-slate-500">Conversion</p><p className="font-bold text-blue-600">{f.conversion_rate}%</p></div>
                  <div><p className="text-slate-500">Companies</p><p className="font-bold text-slate-900">{f.total_companies}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Directory grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-slate-500 flex items-center gap-2"><Layers size={12}/> All Franchise Nodes ({data.length})</h3>
          <select
            value={sectorFilter || ''}
            onChange={e => setSector(e.target.value || null)}
            className="ui-select"
          >
            <option value="">All Sectors</option>
            {Object.keys(SECTOR_EMOJI).map(s => <option key={s} value={s}>{SECTOR_EMOJI[s]} {s}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-blue-500" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.map(f => (
              <div key={f.franchise_id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-200 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-slate-900 text-sm leading-tight">{f.franchise_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{SECTOR_EMOJI[f.primary_sector]||'📊'} {f.primary_sector}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <TierBadge tier={f.tier} />
                    {f.ifb_listed && (
                      <span className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5">
                        <Link2 size={8}/> IFB Listed
                      </span>
                    )}
                  </div>
                </div>
                {f.tagline && <p className="text-xs text-slate-500 mb-3 leading-relaxed line-clamp-2">{f.tagline}</p>}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 rounded-xl py-2">
                    <p className="text-xs font-bold text-slate-900">{f.total_companies}</p>
                    <p className="text-xs text-slate-500">Companies</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl py-2">
                    <p className="text-xs font-bold text-emerald-600">{fmt(f.total_capital)}</p>
                    <p className="text-xs text-slate-500">Deployed</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl py-2">
                    <p className="text-xs font-bold text-blue-600">#{f.rank}</p>
                    <p className="text-xs text-slate-500">Rank</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SECTION: Application
// ─────────────────────────────────────────────────────────────────
function ApplicationForm({ session, myCompany, onSuccess }) {
  const [form, setForm] = useState({ franchise_name: '', tagline: '', tier: 'node_operator', primary_sector: myCompany?.sector || '', website: '' });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  const eligible = myCompany && (myCompany.investment_readiness_score >= 50);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true); setErr(null);
    try {
      const { data, error } = await supabase.from('venturex_franchises').insert({
        operator_user_id: session.user.id,
        company_id: myCompany.id,
        franchise_name: form.franchise_name,
        tagline: form.tagline,
        primary_sector: form.primary_sector,
        tier: form.tier,
        website: form.website,
        company_limit: form.tier === 'node_operator' ? 20 : form.tier === 'regional_hub' ? 100 : 500,
        monthly_fee_usd: form.tier === 'node_operator' ? 500 : form.tier === 'regional_hub' ? 2000 : 10000,
        status: 'pending',
        ifb_listed: true,
      }).select().single();
      if (error) throw error;
      onSuccess(data);
    } catch (e) { setErr(e.message); } finally { setSubmitting(false); }
  };

  const TIERS = Object.entries(TIER_META).map(([key, m]) => ({ key, ...m }));

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Eligibility status */}
      <div className={`rounded-2xl p-8 border ${eligible ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-center gap-3 mb-4">
          {eligible ? <CheckCircle2 size={20} className="text-emerald-600"/> : <AlertCircle size={20} className="text-red-600"/>}
          <h3 className="font-bold text-slate-900">{eligible ? 'You meet franchise eligibility' : 'Eligibility requirements not yet met'}</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Active company on VentureX', met: !!myCompany },
            { label: 'Readiness score ≥ 50', met: myCompany?.investment_readiness_score >= 50 },
            { label: 'Pascaline approved', met: true },
            { label: 'IFB account in good standing', met: true },
          ].map(r => (
            <div key={r.label} className="flex items-center gap-2 text-xs font-bold">
              {r.met ? <CheckCircle2 size={13} className="text-emerald-600 shrink-0"/> : <X size={13} className="text-red-600 shrink-0"/>}
              <span className={r.met ? 'text-slate-600' : 'text-red-600'}>{r.label}</span>
            </div>
          ))}
        </div>
      </div>

      {eligible && (
        <>
          {/* Tier selector */}
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-3">Select Franchise Tier</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TIERS.map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, tier: t.key }))}
                  className={`p-5 rounded-2xl border text-left transition-all ${
                    form.tier === t.key
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-500'
                  }`}
                >
                  <t.icon size={18} className="text-slate-500 mb-2" />
                  <p className="font-bold text-slate-900 text-sm mb-1">{t.label}</p>
                  <p className="text-xs text-slate-500">{t.limit}</p>
                  <p className="text-xs text-indigo-600 font-bold mt-1">{t.fee}</p>
                  <p className="text-xs text-slate-500 mt-1">+ 0.5% revenue share on deals</p>
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-8 space-y-5">
            <h3 className="font-bold text-slate-900 mb-2">Franchise Details</h3>
            {[
              { key: 'franchise_name', label: 'Franchise Name', placeholder: 'e.g. AfriTech Ventures', required: true },
              { key: 'tagline',        label: 'Tagline',         placeholder: 'e.g. Powering the next wave of FinTech innovation' },
              { key: 'website',        label: 'Website',         placeholder: 'https://...' },
            ].map(f => (
              <div key={f.key}>
                <label className="ui-label">{f.label}</label>
                <input
                  required={f.required}
                  value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="ui-input"
                />
              </div>
            ))}
            <div>
              <label className="ui-label">Primary Sector</label>
              <select
                value={form.primary_sector}
                onChange={e => setForm(p => ({ ...p, primary_sector: e.target.value }))}
                className="ui-select"
              >
                {Object.keys(SECTOR_EMOJI).map(s => <option key={s} value={s}>{SECTOR_EMOJI[s]} {s}</option>)}
              </select>
            </div>

            {err && <p className="text-sm text-red-600 font-bold">{err}</p>}

            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-xs text-slate-500 leading-relaxed">
              <strong className="text-indigo-600">Revenue model:</strong> IFB earns 2% on every deal originated through your franchise. You earn 0.5%. All your listed companies are cross-listed on IFB's master VentureX exchange and shown to all 20,000+ IFB investors globally.
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="ui-btn ui-btn-primary"
            >
              {submitting ? <><Loader2 size={14} className="animate-spin"/>Submitting...</> : <><Rocket size={14}/>Submit Franchise Application</>}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SECTION: Operator Dashboard
// ─────────────────────────────────────────────────────────────────
function OperatorDashboard({ franchise, session }) {
  const [dashTab, setDashTab] = useState('overview');
  const [metrics, setMetrics] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: m }, { data: lb }] = await Promise.all([
      supabase.rpc('get_franchise_metrics', { p_franchise_id: franchise.id }),
      supabase.rpc('get_franchise_leaderboard', { p_limit: 20 }),
    ]);
    setMetrics(m || null);
    setLeaderboard(lb || []);
    setLoading(false);
  }, [franchise.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const funnel = metrics?.funnel || {};
  const totalFunnelDeals = Object.values(funnel).reduce((a, b) => a + Number(b), 0);
  const myRank = leaderboard.find(f => f.franchise_id === franchise.id);

  const DASH_TABS = [
    { id: 'overview',   label: 'Overview',   icon: BarChart3 },
    { id: 'analytics',  label: 'Analytics',  icon: Activity  },
    { id: 'companies',  label: 'Companies',  icon: Building2 },
    { id: 'leaderboard',label: 'Leaderboard',icon: Award     },
    { id: 'ifb_link',   label: 'IFB Link',   icon: Link2     },
  ];

  return (
    <div className="space-y-6">
      {/* Franchise identity header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-8 text-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 to-transparent pointer-events-none"/>
        <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <TierBadge tier={franchise.tier} />
              {franchise.ifb_listed && (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <BadgeCheck size={10}/> Cross-listed on IFB Master Exchange
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold">{franchise.franchise_name}</h2>
            {franchise.tagline && <p className="text-sm text-slate-500 mt-1">{franchise.tagline}</p>}
          </div>
          <div className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            franchise.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-yellow-50 text-yellow-600 border border-yellow-200'
          }`}>
            {franchise.status === 'approved' ? <CheckCircle2 size={12}/> : <Loader2 size={12} className="animate-spin"/>}
            {franchise.status}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard dark icon={Building2}   label="Companies"        value={franchise.total_companies}  accent="border-slate-200" />
        <KpiCard dark icon={Briefcase}   label="Total Deals"      value={franchise.total_deals}       accent="border-slate-200" />
        <KpiCard dark icon={DollarSign}  label="Capital Deployed" value={fmt(franchise.total_capital_deployed)} accent="border-emerald-200" />
        <KpiCard dark icon={TrendingUp}  label="Your Earnings"    value={fmt(franchise.operator_earnings_usd)}  accent="border-blue-200"   />
        <KpiCard dark icon={Zap}         label="IFB Fees"         value={fmt(franchise.ifb_earnings_usd)}       accent="border-indigo-200" />
        <KpiCard dark icon={Award}       label="Leaderboard"      value={myRank ? `#${myRank.rank}` : '—'}       accent="border-yellow-200" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar border-b border-slate-200 pb-0">
        {DASH_TABS.map(t => (
          <button key={t.id} onClick={() => setDashTab(t.id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-all ${
              dashTab === t.id ? 'border-indigo-500 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-600'
            }`}
          >
            <t.icon size={12}/> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-blue-500"/></div>
      ) : (
        <>
          {/* ── OVERVIEW ── */}
          {dashTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <h4 className="text-xs font-semibold text-slate-500 mb-5 flex items-center gap-2"><Target size={11}/>Deal Funnel</h4>
                {['proposed','negotiating','signed','closed'].map((s, i) => (
                  <FunnelBar
                    key={s} label={s.charAt(0).toUpperCase()+s.slice(1)}
                    count={Number(funnel[s]||0)} total={totalFunnelDeals}
                    color={['bg-slate-500','bg-blue-500','bg-emerald-500','bg-yellow-500'][i]}
                  />
                ))}
                <div className="mt-3 text-xs text-slate-500 font-bold border-t border-slate-200 pt-3">
                  Conversion rate: <span className="text-emerald-600">{pct(Number(funnel.closed||0), totalFunnelDeals)}</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <h4 className="text-xs font-semibold text-slate-500 mb-5 flex items-center gap-2"><PieChart size={11}/>Sector Mix</h4>
                <div className="space-y-3">
                  {(metrics?.sectors || []).slice(0,6).map((s, i) => {
                    const totalCap = (metrics?.sectors||[]).reduce((a,x)=>a+Number(x.capital),0);
                    return (
                      <div key={s.sector} className="flex items-center gap-3">
                        <span className="text-sm w-5 shrink-0">{SECTOR_EMOJI[s.sector]||'📊'}</span>
                        <div className="flex-1">
                          <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-slate-500">{s.sector}</span>
                            <span className="text-slate-900">{s.deals} deals · {fmt(s.capital)}</span>
                          </div>
                          <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                            <div
                              className={['bg-indigo-500','bg-blue-500','bg-emerald-500','bg-yellow-500','bg-purple-500','bg-pink-500'][i % 6]}
                              style={{ width: pct(Number(s.capital), totalCap) }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── ANALYTICS ── */}
          {dashTab === 'analytics' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <h4 className="text-xs font-semibold text-slate-500 mb-5 flex items-center gap-2"><Activity size={11}/>Monthly Deal Velocity</h4>
                {(metrics?.velocity || []).length === 0 ? (
                  <p className="text-slate-500 text-sm">No velocity data yet.</p>
                ) : (
                  <div className="flex items-end gap-2 h-32">
                    {(metrics?.velocity || []).map((v, i) => {
                      const maxCap = Math.max(...(metrics.velocity||[]).map(x=>Number(x.capital)||0), 1);
                      const h = Math.round((Number(v.capital)/maxCap) * 100);
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full bg-indigo-500/70 rounded-t transition-all" style={{height:`${h}%`}} title={fmt(v.capital)} />
                          <span className="text-xs text-slate-600 font-bold">{v.month?.slice(5,7)}/{v.month?.slice(2,4)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <h4 className="text-xs font-semibold text-slate-500 mb-5 flex items-center gap-2"><Users size={11}/>Top Investors in Your Franchise</h4>
                <div className="space-y-3">
                  {(metrics?.investors||[]).slice(0,8).map((inv,i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-slate-200">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{inv.fund_name || 'Anonymous Investor'}</p>
                        <p className="text-xs text-slate-500 capitalize">{inv.investor_type} · {inv.deal_count} deals</p>
                      </div>
                      <p className="font-bold text-emerald-600 text-sm">{fmt(inv.total_invested)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── COMPANIES ── */}
          {dashTab === 'companies' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h4 className="text-xs font-semibold text-slate-500 mb-5 flex items-center gap-2"><Building2 size={11}/>Franchise Company Roster</h4>
              <div className="space-y-3">
                {(metrics?.companies||[]).map((c, i) => (
                  <div key={i} className="flex items-center gap-4 py-3 border-b border-slate-200">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 text-sm font-bold">{i+1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate">{c.legal_name}</p>
                      <p className="text-xs text-slate-500">{SECTOR_EMOJI[c.sector]||'📊'} {c.sector} · {c.country}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-slate-900">{fmt(c.valuation)}</p>
                      <p className="text-xs text-slate-500">val · {c.deal_count} deals</p>
                    </div>
                    <div className="bg-emerald-50 text-emerald-600 text-xs font-bold px-2 py-1 rounded-lg shrink-0">
                      Score {Math.round(c.investment_readiness_score)}
                    </div>
                  </div>
                ))}
                {(metrics?.companies||[]).length === 0 && <p className="text-slate-500 text-sm">No companies enrolled yet.</p>}
              </div>
            </div>
          )}

          {/* ── LEADERBOARD ── */}
          {dashTab === 'leaderboard' && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <h4 className="text-xs font-semibold text-slate-500 flex items-center gap-2"><Award size={11}/>Global Franchise Rankings</h4>
              </div>
              <div className="divide-y divide-slate-200">
                {leaderboard.map(f => (
                  <div key={f.franchise_id} className={`flex items-center gap-4 px-6 py-4 transition-colors ${f.franchise_id === franchise.id ? 'bg-indigo-50' : 'hover:bg-slate-100'}`}>
                    <span className={`text-lg font-bold w-8 shrink-0 ${f.rank<=3?'text-yellow-600':f.franchise_id===franchise.id?'text-indigo-600':'text-slate-600'}`}>#{f.rank}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm truncate ${f.franchise_id===franchise.id?'text-indigo-600':'text-slate-900'}`}>{f.franchise_name}</p>
                      <p className="text-xs text-slate-500">{SECTOR_EMOJI[f.primary_sector]||'📊'} {f.primary_sector}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-right text-xs shrink-0">
                      <div><p className="text-emerald-600 font-bold">{fmt(f.total_capital)}</p><p className="text-slate-600">capital</p></div>
                      <div><p className="text-blue-600 font-bold">{f.conversion_rate}%</p><p className="text-slate-600">conv.</p></div>
                      <div><p className="text-slate-900 font-bold">{f.total_deals}</p><p className="text-slate-600">deals</p></div>
                    </div>
                    <TierBadge tier={f.tier} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── IFB LINK ── */}
          {dashTab === 'ifb_link' && (
            <div className="space-y-6 max-w-2xl">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-4">
                  <BadgeCheck size={24} className="text-emerald-600"/>
                  <div>
                    <h3 className="font-bold text-slate-900">Active IFB Cross-Listing</h3>
                    <p className="text-sm text-emerald-400/70">Since {franchise.ifb_listed_at?.slice(0,10)}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed mb-6">
                  Every company in your franchise is cross-listed on IFB's master VentureX exchange and shown to all 20,000+ active investors globally. Deals originating from your pipeline are marked with your franchise badge.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-slate-500 mb-1">IFB Commission Rate</p>
                    <p className="text-2xl font-bold text-slate-900">{franchise.ifb_commission_pct}%</p>
                    <p className="text-xs text-slate-500">per closed deal</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-slate-500 mb-1">Your Revenue Share</p>
                    <p className="text-2xl font-bold text-indigo-600">{franchise.revenue_share_pct}%</p>
                    <p className="text-xs text-slate-500">per closed deal</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-slate-500 mb-1">Total IFB Fees Generated</p>
                    <p className="text-xl font-bold text-slate-900">{fmt(franchise.ifb_earnings_usd)}</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-slate-500 mb-1">Your Earnings</p>
                    <p className="text-xl font-bold text-emerald-600">{fmt(franchise.operator_earnings_usd)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 text-sm text-slate-500 leading-relaxed space-y-2">
                <p className="font-bold text-slate-900 text-base mb-3">How it works</p>
                <p>① Your franchise companies are listed on IFB's master VentureX exchange with a <span className="text-indigo-600 font-bold">Franchise Node</span> badge.</p>
                <p>② IFB investors browsing the exchange can discover and invest in your franchise's companies directly.</p>
                <p>③ When a deal closes, IFB automatically calculates {franchise.ifb_commission_pct}% platform fee. Your share ({franchise.revenue_share_pct}%) is credited monthly.</p>
                <p>④ Your leaderboard rank is updated in real-time based on total capital deployed through your franchise.</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ROOT COMPONENT
// ─────────────────────────────────────────────────────────────────
export default function VentureXFranchise({ session, profile, balances }) {
  const [view, setView]               = useState('directory');  // directory | apply | dashboard | entrepreneur
  const [myCompany, setMyCompany]     = useState(null);
  const [myFranchise, setMyFranchise] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;
    (async () => {
      const [{ data: comp }, { data: fran }] = await Promise.all([
        supabase.from('venturex_companies').select('*').eq('user_id', session.user.id).maybeSingle(),
        supabase.from('venturex_franchises').select('*').eq('operator_user_id', session.user.id).maybeSingle(),
      ]);
      setMyCompany(comp || null);
      setMyFranchise(fran || null);
      if (fran) setView('dashboard');
      setBootstrapping(false);
    })();
  }, [session?.user?.id]);

  if (bootstrapping) return <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-blue-500"/></div>;

  const NAV = [
    { id: 'entrepreneur',   label: 'Apply as Entrepreneur', icon: GraduationCap },
    { id: 'directory',      label: 'Franchise Directory',   icon: Layers        },
    { id: 'capital_match',  label: 'Capital Match',         icon: Zap           },
    ...(!myFranchise && myCompany ? [{ id: 'apply', label: 'Apply for Franchise', icon: Rocket }] : []),
    ...(myFranchise ? [{ id: 'dashboard', label: 'My Franchise', icon: BarChart3 }] : []),
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Sub-nav */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {NAV.map(n => (
          <button key={n.id} onClick={() => setView(n.id)}
            className={`shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              view === n.id
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-slate-50 text-slate-500 border border-slate-200 hover:text-slate-900'
            }`}
          >
            <n.icon size={12}/>{n.label}
          </button>
        ))}
      </div>

      {view === 'entrepreneur'  && <EntrepreneurApplication session={session} balances={balances} />}
      {view === 'directory'     && <Directory onApply={() => setView('apply')} userFranchise={myFranchise} setView={setView}/>}
      {view === 'capital_match' && <CapitalMatchPanel session={session} myCompany={myCompany}/>}
      {view === 'apply'         && myCompany && (
        <ApplicationForm
          session={session}
          myCompany={myCompany}
          onSuccess={(f) => { setMyFranchise(f); setView('dashboard'); }}
        />
      )}
      {view === 'dashboard'  && myFranchise && <OperatorDashboard franchise={myFranchise} session={session}/>}
      {view === 'apply' && !myCompany && (
        <div className="text-center py-20 text-slate-500">
          <Lock size={40} className="mx-auto mb-3 opacity-30"/>
          <p className="font-bold">You need an active VentureX company listing to apply for a franchise.</p>
          <p className="text-sm mt-1">Go to <strong>Raise Capital</strong> to list your company first.</p>
        </div>
      )}
    </div>
  );
}
