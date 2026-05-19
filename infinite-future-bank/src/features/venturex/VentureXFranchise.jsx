import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
  Building2, TrendingUp, Zap, Globe, Users, DollarSign, Award,
  ShieldCheck, Loader2, ChevronRight, ArrowUpRight, BarChart3,
  CheckCircle2, Lock, Star, Layers, PieChart, Activity, Target,
  RefreshCw, AlertCircle, Plus, X, MapPin, Briefcase, Crown,
  Network, Link2, BadgeCheck, Rocket, Filter
} from 'lucide-react';

// ── helpers ───────────────────────────────────────────────────────
const SECTOR_EMOJI = {
  FinTech:'💳',AgriTech:'🌾',HealthTech:'🏥',EdTech:'📚',CleanEnergy:'⚡',
  Logistics:'🚚','E-Commerce':'🛒','AI/ML':'🧠',Blockchain:'🔗','Real Estate':'🏗️',
  InsurTech:'🛡️',FoodTech:'🍽️',BioTech:'🔬',Gaming:'🎮',Media:'📡',
  Mobility:'🚗',PropTech:'🏘️',LegalTech:'⚖️',HRTech:'👥',CyberSecurity:'🔐',
};
const TIER_META = {
  node_operator:    { label:'Node Operator',    color:'bg-slate-700 text-slate-300',        icon: Building2, limit:'20 companies',  fee:'$500/mo'  },
  regional_hub:     { label:'Regional Hub',     color:'bg-blue-900/60 text-blue-300',       icon: Globe,     limit:'100 companies', fee:'$2,000/mo'},
  master_franchise: { label:'Master Franchise', color:'bg-yellow-900/60 text-yellow-300',   icon: Crown,     limit:'500 companies', fee:'$10,000/mo'},
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
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${m.color}`}><m.icon size={9}/>{m.label}</span>;
}

function KpiCard({ icon: Icon, label, value, sub, accent = 'border-slate-700', dark }) {
  return (
    <div className={`${dark ? 'bg-slate-800/60' : 'bg-white'} border ${accent} rounded-2xl p-5`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className="text-slate-400" /><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      </div>
      <p className={`text-xl font-black ${dark ? 'text-white' : 'text-slate-900'}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function FunnelBar({ label, count, total, color }) {
  const w = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs font-bold mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-white">{count} <span className="text-slate-500">({w}%)</span></span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
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
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/30 via-transparent to-blue-900/20 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Network size={18} className="text-indigo-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">IFB Franchise Network</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight mb-2">VentureX Node Operators</h2>
              <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
                Licensed operators who run their own deal pipeline — connected to IFB's master exchange. Every franchise company is cross-listed globally. Operators compete for capital deployment leadership.
              </p>
            </div>
            {!userFranchise && (
              <button onClick={onApply} className="shrink-0 flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-900/30">
                <Rocket size={14} /> Apply for Franchise
              </button>
            )}
            {userFranchise && (
              <button onClick={() => setView('dashboard')} className="shrink-0 flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all">
                <BarChart3 size={14} /> My Franchise
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Top 3 podium */}
      {top3.length > 0 && (
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2"><Award size={12}/> Leaderboard — Top Franchises</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {top3.map((f, idx) => (
              <div key={f.franchise_id} className={`rounded-[1.5rem] p-6 border relative overflow-hidden ${
                idx === 0 ? 'bg-yellow-900/20 border-yellow-700/50' :
                idx === 1 ? 'bg-slate-700/20 border-slate-600/50' :
                            'bg-orange-900/20 border-orange-700/50'
              }`}>
                <div className="flex items-start justify-between mb-3">
                  <span className={`text-3xl font-black ${idx===0?'text-yellow-400':idx===1?'text-slate-300':'text-orange-400'}`}>#{f.rank}</span>
                  <TierBadge tier={f.tier} />
                </div>
                <p className="font-black text-white text-sm mb-1">{f.franchise_name}</p>
                <p className="text-[10px] text-slate-400 mb-3">{SECTOR_EMOJI[f.primary_sector]||'📊'} {f.primary_sector}</p>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div><p className="text-slate-500">Capital</p><p className="font-black text-emerald-400">{fmt(f.total_capital)}</p></div>
                  <div><p className="text-slate-500">Deals</p><p className="font-black text-white">{f.total_deals}</p></div>
                  <div><p className="text-slate-500">Conversion</p><p className="font-black text-blue-400">{f.conversion_rate}%</p></div>
                  <div><p className="text-slate-500">Companies</p><p className="font-black text-white">{f.total_companies}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Directory grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><Layers size={12}/> All Franchise Nodes ({data.length})</h3>
          <select
            value={sectorFilter || ''}
            onChange={e => setSector(e.target.value || null)}
            className="text-xs font-bold bg-slate-800 border border-slate-700 text-slate-300 rounded-xl px-3 py-2 outline-none"
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
              <div key={f.franchise_id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-600 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-black text-white text-sm leading-tight">{f.franchise_name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{SECTOR_EMOJI[f.primary_sector]||'📊'} {f.primary_sector}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <TierBadge tier={f.tier} />
                    {f.ifb_listed && (
                      <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-0.5">
                        <Link2 size={8}/> IFB Listed
                      </span>
                    )}
                  </div>
                </div>
                {f.tagline && <p className="text-[10px] text-slate-500 mb-3 leading-relaxed line-clamp-2">{f.tagline}</p>}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-800/60 rounded-xl py-2">
                    <p className="text-xs font-black text-white">{f.total_companies}</p>
                    <p className="text-[9px] text-slate-500">Companies</p>
                  </div>
                  <div className="bg-slate-800/60 rounded-xl py-2">
                    <p className="text-xs font-black text-emerald-400">{fmt(f.total_capital)}</p>
                    <p className="text-[9px] text-slate-500">Deployed</p>
                  </div>
                  <div className="bg-slate-800/60 rounded-xl py-2">
                    <p className="text-xs font-black text-blue-400">#{f.rank}</p>
                    <p className="text-[9px] text-slate-500">Rank</p>
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
      <div className={`rounded-[2rem] p-8 border ${eligible ? 'bg-emerald-950/40 border-emerald-800/50' : 'bg-red-950/40 border-red-800/50'}`}>
        <div className="flex items-center gap-3 mb-4">
          {eligible ? <CheckCircle2 size={20} className="text-emerald-400"/> : <AlertCircle size={20} className="text-red-400"/>}
          <h3 className="font-black text-white">{eligible ? 'You meet franchise eligibility' : 'Eligibility requirements not yet met'}</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Active company on VentureX', met: !!myCompany },
            { label: 'Readiness score ≥ 50', met: myCompany?.investment_readiness_score >= 50 },
            { label: 'Pascaline approved', met: true },
            { label: 'IFB account in good standing', met: true },
          ].map(r => (
            <div key={r.label} className="flex items-center gap-2 text-xs font-bold">
              {r.met ? <CheckCircle2 size={13} className="text-emerald-400 shrink-0"/> : <X size={13} className="text-red-400 shrink-0"/>}
              <span className={r.met ? 'text-slate-300' : 'text-red-300'}>{r.label}</span>
            </div>
          ))}
        </div>
      </div>

      {eligible && (
        <>
          {/* Tier selector */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Select Franchise Tier</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TIERS.map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, tier: t.key }))}
                  className={`p-5 rounded-2xl border text-left transition-all ${
                    form.tier === t.key
                      ? 'border-indigo-500 bg-indigo-900/30'
                      : 'border-slate-700 bg-slate-800/30 hover:border-slate-500'
                  }`}
                >
                  <t.icon size={18} className="text-slate-400 mb-2" />
                  <p className="font-black text-white text-sm mb-1">{t.label}</p>
                  <p className="text-[10px] text-slate-400">{t.limit}</p>
                  <p className="text-[10px] text-indigo-400 font-bold mt-1">{t.fee}</p>
                  <p className="text-[9px] text-slate-500 mt-1">+ 0.5% revenue share on deals</p>
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 space-y-5">
            <h3 className="font-black text-white mb-2">Franchise Details</h3>
            {[
              { key: 'franchise_name', label: 'Franchise Name', placeholder: 'e.g. AfriTech Ventures', required: true },
              { key: 'tagline',        label: 'Tagline',         placeholder: 'e.g. Powering the next wave of FinTech innovation' },
              { key: 'website',        label: 'Website',         placeholder: 'https://...' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{f.label}</label>
                <input
                  required={f.required}
                  value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder-slate-600 outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            ))}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Primary Sector</label>
              <select
                value={form.primary_sector}
                onChange={e => setForm(p => ({ ...p, primary_sector: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-indigo-500"
              >
                {Object.keys(SECTOR_EMOJI).map(s => <option key={s} value={s}>{SECTOR_EMOJI[s]} {s}</option>)}
              </select>
            </div>

            {err && <p className="text-sm text-red-400 font-bold">{err}</p>}

            <div className="bg-indigo-950/40 border border-indigo-800/40 rounded-2xl p-4 text-xs text-slate-400 leading-relaxed">
              <strong className="text-indigo-300">Revenue model:</strong> IFB earns 2% on every deal originated through your franchise. You earn 0.5%. All your listed companies are cross-listed on IFB's master VentureX exchange and shown to all 20,000+ IFB investors globally.
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl text-xs uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/20 to-transparent pointer-events-none"/>
        <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <TierBadge tier={franchise.tier} />
              {franchise.ifb_listed && (
                <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-400">
                  <BadgeCheck size={10}/> Cross-listed on IFB Master Exchange
                </span>
              )}
            </div>
            <h2 className="text-2xl font-black">{franchise.franchise_name}</h2>
            {franchise.tagline && <p className="text-sm text-slate-400 mt-1">{franchise.tagline}</p>}
          </div>
          <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 ${
            franchise.status === 'approved' ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-800' : 'bg-yellow-900/40 text-yellow-400 border border-yellow-800'
          }`}>
            {franchise.status === 'approved' ? <CheckCircle2 size={12}/> : <Loader2 size={12} className="animate-spin"/>}
            {franchise.status}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard dark icon={Building2}   label="Companies"        value={franchise.total_companies}  accent="border-slate-700" />
        <KpiCard dark icon={Briefcase}   label="Total Deals"      value={franchise.total_deals}       accent="border-slate-700" />
        <KpiCard dark icon={DollarSign}  label="Capital Deployed" value={fmt(franchise.total_capital_deployed)} accent="border-emerald-800" />
        <KpiCard dark icon={TrendingUp}  label="Your Earnings"    value={fmt(franchise.operator_earnings_usd)}  accent="border-blue-800"   />
        <KpiCard dark icon={Zap}         label="IFB Fees"         value={fmt(franchise.ifb_earnings_usd)}       accent="border-indigo-800" />
        <KpiCard dark icon={Award}       label="Leaderboard"      value={myRank ? `#${myRank.rank}` : '—'}       accent="border-yellow-800" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar border-b border-slate-800 pb-0">
        {DASH_TABS.map(t => (
          <button key={t.id} onClick={() => setDashTab(t.id)}
            className={`flex items-center gap-2 px-5 py-3 text-[10px] font-black uppercase tracking-widest whitespace-nowrap border-b-2 transition-all ${
              dashTab === t.id ? 'border-indigo-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
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
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-5 flex items-center gap-2"><Target size={11}/>Deal Funnel</h4>
                {['proposed','negotiating','signed','closed'].map((s, i) => (
                  <FunnelBar
                    key={s} label={s.charAt(0).toUpperCase()+s.slice(1)}
                    count={Number(funnel[s]||0)} total={totalFunnelDeals}
                    color={['bg-slate-500','bg-blue-500','bg-emerald-500','bg-yellow-500'][i]}
                  />
                ))}
                <div className="mt-3 text-[10px] text-slate-500 font-bold border-t border-slate-800 pt-3">
                  Conversion rate: <span className="text-emerald-400">{pct(Number(funnel.closed||0), totalFunnelDeals)}</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-5 flex items-center gap-2"><PieChart size={11}/>Sector Mix</h4>
                <div className="space-y-3">
                  {(metrics?.sectors || []).slice(0,6).map((s, i) => {
                    const totalCap = (metrics?.sectors||[]).reduce((a,x)=>a+Number(x.capital),0);
                    return (
                      <div key={s.sector} className="flex items-center gap-3">
                        <span className="text-sm w-5 shrink-0">{SECTOR_EMOJI[s.sector]||'📊'}</span>
                        <div className="flex-1">
                          <div className="flex justify-between text-[10px] font-bold mb-1">
                            <span className="text-slate-400">{s.sector}</span>
                            <span className="text-white">{s.deals} deals · {fmt(s.capital)}</span>
                          </div>
                          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
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
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-5 flex items-center gap-2"><Activity size={11}/>Monthly Deal Velocity</h4>
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
                          <span className="text-[8px] text-slate-600 font-bold">{v.month?.slice(5,7)}/{v.month?.slice(2,4)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-5 flex items-center gap-2"><Users size={11}/>Top Investors in Your Franchise</h4>
                <div className="space-y-3">
                  {(metrics?.investors||[]).slice(0,8).map((inv,i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-slate-800">
                      <div>
                        <p className="text-sm font-black text-white">{inv.fund_name || 'Anonymous Investor'}</p>
                        <p className="text-[10px] text-slate-500 capitalize">{inv.investor_type} · {inv.deal_count} deals</p>
                      </div>
                      <p className="font-black text-emerald-400 text-sm">{fmt(inv.total_invested)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── COMPANIES ── */}
          {dashTab === 'companies' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-5 flex items-center gap-2"><Building2 size={11}/>Franchise Company Roster</h4>
              <div className="space-y-3">
                {(metrics?.companies||[]).map((c, i) => (
                  <div key={i} className="flex items-center gap-4 py-3 border-b border-slate-800">
                    <div className="w-8 h-8 rounded-xl bg-indigo-900/40 text-indigo-400 flex items-center justify-center shrink-0 text-sm font-black">{i+1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-white text-sm truncate">{c.legal_name}</p>
                      <p className="text-[10px] text-slate-500">{SECTOR_EMOJI[c.sector]||'📊'} {c.sector} · {c.country}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-black text-white">{fmt(c.valuation)}</p>
                      <p className="text-[9px] text-slate-500">val · {c.deal_count} deals</p>
                    </div>
                    <div className="bg-emerald-900/30 text-emerald-400 text-[9px] font-black px-2 py-1 rounded-lg shrink-0">
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
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-800">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><Award size={11}/>Global Franchise Rankings</h4>
              </div>
              <div className="divide-y divide-slate-800">
                {leaderboard.map(f => (
                  <div key={f.franchise_id} className={`flex items-center gap-4 px-6 py-4 transition-colors ${f.franchise_id === franchise.id ? 'bg-indigo-900/20' : 'hover:bg-slate-800/30'}`}>
                    <span className={`text-lg font-black w-8 shrink-0 ${f.rank<=3?'text-yellow-400':f.franchise_id===franchise.id?'text-indigo-400':'text-slate-600'}`}>#{f.rank}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-black text-sm truncate ${f.franchise_id===franchise.id?'text-indigo-300':'text-white'}`}>{f.franchise_name}</p>
                      <p className="text-[10px] text-slate-500">{SECTOR_EMOJI[f.primary_sector]||'📊'} {f.primary_sector}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-right text-[10px] shrink-0">
                      <div><p className="text-emerald-400 font-black">{fmt(f.total_capital)}</p><p className="text-slate-600">capital</p></div>
                      <div><p className="text-blue-400 font-black">{f.conversion_rate}%</p><p className="text-slate-600">conv.</p></div>
                      <div><p className="text-white font-black">{f.total_deals}</p><p className="text-slate-600">deals</p></div>
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
              <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-[2rem] p-8">
                <div className="flex items-center gap-3 mb-4">
                  <BadgeCheck size={24} className="text-emerald-400"/>
                  <div>
                    <h3 className="font-black text-white">Active IFB Cross-Listing</h3>
                    <p className="text-sm text-emerald-400/70">Since {franchise.ifb_listed_at?.slice(0,10)}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed mb-6">
                  Every company in your franchise is cross-listed on IFB's master VentureX exchange and shown to all 20,000+ active investors globally. Deals originating from your pipeline are marked with your franchise badge.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">IFB Commission Rate</p>
                    <p className="text-2xl font-black text-white">{franchise.ifb_commission_pct}%</p>
                    <p className="text-[10px] text-slate-500">per closed deal</p>
                  </div>
                  <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Your Revenue Share</p>
                    <p className="text-2xl font-black text-indigo-400">{franchise.revenue_share_pct}%</p>
                    <p className="text-[10px] text-slate-500">per closed deal</p>
                  </div>
                  <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Total IFB Fees Generated</p>
                    <p className="text-xl font-black text-white">{fmt(franchise.ifb_earnings_usd)}</p>
                  </div>
                  <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Your Earnings</p>
                    <p className="text-xl font-black text-emerald-400">{fmt(franchise.operator_earnings_usd)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-sm text-slate-400 leading-relaxed space-y-2">
                <p className="font-black text-white text-base mb-3">How it works</p>
                <p>① Your franchise companies are listed on IFB's master VentureX exchange with a <span className="text-indigo-400 font-bold">Franchise Node</span> badge.</p>
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
export default function VentureXFranchise({ session, profile }) {
  const [view, setView]               = useState('directory');  // directory | apply | dashboard
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
    { id: 'directory',  label: 'Franchise Directory', icon: Layers   },
    ...(!myFranchise && myCompany ? [{ id: 'apply', label: 'Apply for Franchise', icon: Rocket }] : []),
    ...(myFranchise ? [{ id: 'dashboard', label: 'My Franchise', icon: BarChart3 }] : []),
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Sub-nav */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {NAV.map(n => (
          <button key={n.id} onClick={() => setView(n.id)}
            className={`shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              view === n.id
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
            }`}
          >
            <n.icon size={12}/>{n.label}
          </button>
        ))}
      </div>

      {view === 'directory'  && <Directory onApply={() => setView('apply')} userFranchise={myFranchise} setView={setView}/>}
      {view === 'apply'      && myCompany && (
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
