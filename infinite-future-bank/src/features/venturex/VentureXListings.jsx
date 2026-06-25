import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
  Search, X, Info, CheckCircle, Star, Globe, MapPin, Users,
  DollarSign, TrendingUp, Building2, Loader2, Filter,
  ChevronDown, ArrowRight, Pickaxe, Zap, Leaf, Landmark,
  Heart, Home, AlertCircle, RefreshCw, Eye, Send,
  ShieldCheck, Clock, BarChart3, FileText, Cpu
} from 'lucide-react';

// ─── Sector metadata ────────────────────────────────────────
const SECTOR_META = {
  'Mining':         { emoji: '⛏️', bg: 'bg-amber-50',   border: 'border-amber-300',  text: 'text-amber-700',  badge: 'bg-amber-100 text-amber-800',  accent: 'bg-amber-400' },
  'Energy':         { emoji: '⚡', bg: 'bg-emerald-50', border: 'border-emerald-300',text: 'text-emerald-700',badge: 'bg-emerald-100 text-emerald-800',accent: 'bg-emerald-400' },
  'Agriculture':    { emoji: '🌱', bg: 'bg-lime-50',    border: 'border-lime-300',   text: 'text-lime-700',   badge: 'bg-lime-100 text-lime-800',    accent: 'bg-lime-400' },
  'FinTech':        { emoji: '💳', bg: 'bg-blue-50',    border: 'border-blue-300',   text: 'text-blue-700',   badge: 'bg-blue-100 text-blue-800',    accent: 'bg-blue-400' },
  'Infrastructure': { emoji: '🏗️', bg: 'bg-slate-50',   border: 'border-slate-300',  text: 'text-slate-700',  badge: 'bg-slate-100 text-slate-800',  accent: 'bg-slate-400' },
  'Healthcare':     { emoji: '🏥', bg: 'bg-rose-50',    border: 'border-rose-300',   text: 'text-rose-700',   badge: 'bg-rose-100 text-rose-800',    accent: 'bg-rose-400' },
  'Real Estate':    { emoji: '🏢', bg: 'bg-violet-50',  border: 'border-violet-300', text: 'text-violet-700', badge: 'bg-violet-100 text-violet-800', accent: 'bg-violet-400' },
};

const STAGE_BADGE = {
  'Exploration':    'bg-yellow-100 text-yellow-800',
  'Development':    'bg-blue-100 text-blue-800',
  'Production':     'bg-emerald-100 text-emerald-800',
  'Pre-Revenue':    'bg-orange-100 text-orange-800',
  'Revenue-Stage':  'bg-green-100 text-green-800',
};

const FLAGS = {
  'Guinea':'🇬🇳','Tanzania':'🇹🇿','Ghana':'🇬🇭','Mali':'🇲🇱','Burkina Faso':'🇧🇫',
  'Ivory Coast':'🇨🇮','DR Congo':'🇨🇩','Zambia':'🇿🇲','Zimbabwe':'🇿🇼','Morocco':'🇲🇦',
  'Uganda':'🇺🇬','Lesotho':'🇱🇸','Sierra Leone':'🇸🇱','Botswana':'🇧🇼','South Africa':'🇿🇦',
  'Guinea-Bissau':'🇬🇼','Niger':'🇳🇪','Namibia':'🇳🇦','Mozambique':'🇲🇿','Madagascar':'🇲🇬',
  'Nigeria':'🇳🇬','Kenya':'🇰🇪','Ethiopia':'🇪🇹','Senegal':'🇸🇳','Gabon':'🇬🇦',
  'Rwanda':'🇷🇼','Egypt':'🇪🇬','Peru':'🇵🇪','Brazil':'🇧🇷','Chile':'🇨🇱',
  'Australia':'🇦🇺','Venezuela':'🇻🇪','Mauritania':'🇲🇷',
};

const fmt = (n) => {
  if (!n) return 'N/A';
  if (n >= 1000000000) return `$${(n / 1000000000).toFixed(1)}B`;
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n}`;
};

const SECTORS = ['All', 'Mining', 'Energy', 'Agriculture', 'FinTech', 'Infrastructure', 'Healthcare', 'Real Estate'];
const STAGES  = ['All', 'Exploration', 'Development', 'Production', 'Pre-Revenue', 'Revenue-Stage'];
const RAISES  = ['All', 'Under $15M', '$15M – $50M', '$50M+'];
const RANGES  = ['$25K – $100K', '$100K – $500K', '$500K – $2M', '$2M+'];

// ─── Info modal content ─────────────────────────────────────
const HOW_IT_WORKS_STEPS = [
  { icon: '📋', title: 'Company Applies & Pays Listing Fee', body: 'A company completes our online application — submitting KYC documents, financial statements and a capital raise brief. A one-time listing fee of $500–$2,000 is charged to publish the profile on VentureX Listings.' },
  { icon: '🔍', title: 'IFB Verifies & Approves', body: 'Our compliance team verifies the company\'s registration, director identity and core financial claims. Approved companies receive the IFB Verified badge. We do not guarantee financial projections or investment outcomes.' },
  { icon: '👁️', title: 'Investors Browse the Directory', body: 'Authenticated IFB users can browse all active listings, filter by sector/country/stage/raise size, and read full company profiles including assets, financials, management and ESG data.' },
  { icon: '🤝', title: 'Express Interest', body: 'Interested investors click "Express Interest," select an investment range and submit a message. IFB connects both parties by email within 3 business days and provides access to the company\'s secure data room.' },
  { icon: '✅', title: 'Deal Closes — IFB Earns Success Fee', body: 'If capital is successfully raised, IFB invoices a success fee of 3–6% of the amount closed. Capital flows directly between investor and company — IFB does not hold or transmit funds.' },
];

// ════════════════════════════════════════════════════════════
export default function VentureXListings({ session }) {
  const [companies, setCompanies]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [sector, setSector]             = useState('All');
  const [stage, setStage]               = useState('All');
  const [raise, setRaise]               = useState('All');
  const [selected, setSelected]         = useState(null);
  const [activeTab, setActiveTab]       = useState('overview');
  const [showInfo, setShowInfo]         = useState(false);
  const [myInterests, setMyInterests]   = useState(new Set());
  const [interestForm, setInterestForm] = useState({ range: '', message: '' });
  const [submitting, setSubmitting]     = useState(false);
  const [toast, setToast]               = useState(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: co }, { data: my }] = await Promise.all([
      supabase.from('venturex_listed_companies').select('*').eq('status', 'active')
        .order('is_featured', { ascending: false })
        .order('ifb_verified', { ascending: false })
        .order('raise_amount_usd', { ascending: false }),
      supabase.from('venturex_interest').select('company_id').eq('user_id', session.user.id),
    ]);
    setCompanies(co || []);
    setMyInterests(new Set((my || []).map(r => r.company_id)));
    setLoading(false);
  };

  const notify = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 5000);
  };

  const handleExpressInterest = async () => {
    if (!interestForm.range) return notify('error', 'Please select an investment range.');
    setSubmitting(true);
    const { error } = await supabase.from('venturex_interest').upsert({
      user_id: session.user.id,
      company_id: selected.id,
      message: interestForm.message || null,
      investment_range: interestForm.range,
    }, { onConflict: 'user_id,company_id' });
    setSubmitting(false);
    if (error) {
      notify('error', 'Could not register interest. Please try again.');
    } else {
      setMyInterests(prev => new Set([...prev, selected.id]));
      setInterestForm({ range: '', message: '' });
      notify('success', `Interest registered! IFB will connect you with ${selected.name} within 3 business days.`);
    }
  };

  // ── Filtering ───────────────────────────────────────────
  const filtered = useMemo(() => {
    return companies.filter(c => {
      const q = search.toLowerCase();
      const matchQ = !q || c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)
        || c.sub_sector?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q);
      const matchS = sector === 'All' || c.sector === sector;
      const matchSt = stage === 'All' || c.stage === stage;
      const matchR = raise === 'All'
        || (raise === 'Under $15M'    && c.raise_amount_usd <  15000000)
        || (raise === '$15M – $50M'   && c.raise_amount_usd >= 15000000 && c.raise_amount_usd <= 50000000)
        || (raise === '$50M+'         && c.raise_amount_usd >  50000000);
      return matchQ && matchS && matchSt && matchR;
    });
  }, [companies, search, sector, stage, raise]);

  const totalRaise  = filtered.reduce((s, c) => s + (c.raise_amount_usd || 0), 0);
  const countries   = new Set(filtered.map(c => c.country)).size;
  const sm          = selected ? (SECTOR_META[selected.sector] || SECTOR_META['Mining']) : null;

  // ─── Skeleton loader ────────────────────────────────────
  if (loading) return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-slate-900 rounded-[2.5rem] p-8 h-36 animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-[2rem] border border-slate-100 h-72 animate-pulse" />
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">

      {/* ── HEADER ─────────────────────────────────────── */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{backgroundImage:'radial-gradient(circle at 80% 50%, #f59e0b 0%, transparent 60%)'}} />
        <div className="relative z-10 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Globe className="text-amber-400" size={28} />
              <h2 className="text-2xl font-black tracking-tight">Global Company Listings</h2>
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
              Capital Raise Directory — Africa & World · Mining Focus
            </p>
            <div className="flex flex-wrap gap-3 mt-4">
              <span className="bg-white/10 border border-white/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                {companies.length} Companies
              </span>
              <span className="bg-white/10 border border-white/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                {new Set(companies.map(c => c.country)).size} Countries
              </span>
              <span className="bg-white/10 border border-white/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                {fmt(companies.reduce((s, c) => s + (c.raise_amount_usd || 0), 0))} Sought
              </span>
              <span className="bg-amber-500/20 border border-amber-500/30 text-amber-300 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                ⛏️ {companies.filter(c => c.sector === 'Mining').length} Mining Companies
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowInfo(true)}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
          >
            <Info size={16} className="text-amber-400" /> How This Works
          </button>
        </div>
      </div>

      {/* ── FILTERS ────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search company name, country, mineral…"
              className="w-full pl-11 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-400 transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                <X size={16} />
              </button>
            )}
          </div>
          {/* Filter pills row */}
          <div className="flex flex-wrap gap-3 items-center">
            <Filter size={14} className="text-slate-400 shrink-0" />
            {/* Sector */}
            <div className="flex gap-1 flex-wrap">
              {SECTORS.map(s => (
                <button key={s} onClick={() => setSector(s)}
                  className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sector === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                  {s === 'All' ? 'All Sectors' : `${SECTOR_META[s]?.emoji} ${s}`}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 shrink-0">Stage</span>
            {STAGES.map(s => (
              <button key={s} onClick={() => setStage(s)}
                className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${stage === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                {s}
              </button>
            ))}
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2 shrink-0">Raise</span>
            {RAISES.map(r => (
              <button key={r} onClick={() => setRaise(r)}
                className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${raise === r ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── RESULTS BAR ─────────────────────────────────── */}
      <div className="flex justify-between items-center px-1">
        <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
          {filtered.length} companies · {countries} countries · {fmt(totalRaise)} total capital sought
        </p>
        <button onClick={fetchAll} className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* ── CARDS GRID ──────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-16 text-center shadow-sm">
          <AlertCircle size={40} className="mx-auto mb-4 text-slate-300" />
          <h4 className="font-black text-slate-800 text-lg mb-2">No companies match your filters</h4>
          <p className="text-slate-400 text-sm font-medium">Try adjusting the sector, stage or raise size filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(c => {
            const meta = SECTOR_META[c.sector] || SECTOR_META['Mining'];
            const alreadyExpressed = myInterests.has(c.id);
            return (
              <div key={c.id}
                className={`group bg-white border border-slate-200 rounded-[2rem] overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col ${c.is_featured ? 'ring-2 ring-amber-300 shadow-lg' : ''}`}>
                {/* Accent bar */}
                <div className={`h-1.5 w-full ${meta.accent}`} />
                <div className="p-6 flex flex-col gap-4 flex-1">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-lg font-black text-white shrink-0`}
                        style={{ backgroundColor: c.logo_color || '#3b82f6' }}>
                        {c.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-black text-slate-900 text-sm leading-tight line-clamp-1">{c.name}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                          {FLAGS[c.country] || '🌍'} {c.country}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {c.ifb_verified && (
                        <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                          <ShieldCheck size={10} /> Verified
                        </span>
                      )}
                      {c.is_featured && (
                        <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          <Star size={9} /> Featured
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Badges row */}
                  <div className="flex flex-wrap gap-1.5">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${meta.badge}`}>
                      {meta.emoji} {c.sub_sector || c.sector}
                    </span>
                    {c.stage && (
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${STAGE_BADGE[c.stage] || 'bg-slate-100 text-slate-700'}`}>
                        {c.stage}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed line-clamp-3 flex-1">
                    {c.description}
                  </p>

                  {/* Stats row */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Capital Raise</p>
                      <p className="text-base font-black text-slate-900">{fmt(c.raise_amount_usd)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Type</p>
                      <p className="text-sm font-black text-slate-700 capitalize">{c.capital_type || 'Equity'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Min Ticket</p>
                      <p className="text-sm font-black text-slate-700">{fmt(c.min_ticket_usd)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Target</p>
                      <p className="text-[11px] font-black text-slate-700 line-clamp-1">{c.target_exchange || 'IFB VentureX'}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => { setSelected(c); setActiveTab('overview'); setInterestForm({ range: '', message: '' }); }}
                      className="flex-1 py-2.5 border-2 border-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-slate-900 hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center gap-1.5"
                    >
                      <Eye size={12} /> View Details
                    </button>
                    <button
                      onClick={() => { setSelected(c); setActiveTab('overview'); setInterestForm({ range: '', message: '' }); }}
                      className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${alreadyExpressed ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-200' : 'bg-amber-500 hover:bg-amber-600 text-white shadow-md'}`}
                    >
                      {alreadyExpressed ? <><CheckCircle size={12} /> Interested</> : <><Send size={12} /> Express Interest</>}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ DETAIL MODAL ════════════════════════════════════ */}
      {selected && (() => {
        const meta = SECTOR_META[selected.sector] || SECTOR_META['Mining'];
        const alreadyExpressed = myInterests.has(selected.id);
        const TABS = [
          { id: 'overview',    label: 'Overview' },
          { id: 'assets',      label: selected.sector === 'Mining' ? 'Mine Assets' : 'Assets' },
          { id: 'financials',  label: 'Financials' },
          { id: 'management',  label: 'Management' },
          { id: 'esg',         label: 'ESG' },
        ];
        return (
          <div className="fixed inset-0 z-[500] flex items-end md:items-center justify-center p-0 md:p-6 bg-slate-900/70 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
              {/* Modal header */}
              <div className={`${meta.bg} border-b ${meta.border} p-6 sticky top-0 z-10 rounded-t-[2.5rem] md:rounded-t-[2.5rem]`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black text-white shrink-0 shadow-lg"
                      style={{ backgroundColor: selected.logo_color || '#3b82f6' }}>
                      {selected.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xl font-black text-slate-900 leading-tight">{selected.name}</h3>
                        {selected.ifb_verified && (
                          <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full">
                            <ShieldCheck size={9} /> IFB Verified
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs font-bold text-slate-500">{FLAGS[selected.country] || '🌍'} {selected.country}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${meta.badge}`}>{meta.emoji} {selected.sector}</span>
                        {selected.stage && <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${STAGE_BADGE[selected.stage] || 'bg-slate-100 text-slate-700'}`}>{selected.stage}</span>}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setSelected(null)} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-800 shadow-sm shrink-0">
                    <X size={18} />
                  </button>
                </div>
                {/* Capital raise hero */}
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Capital Sought</p>
                    <p className="text-lg font-black text-slate-900">{fmt(selected.raise_amount_usd)}</p>
                  </div>
                  <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Type</p>
                    <p className="text-sm font-black text-slate-900 capitalize">{selected.capital_type || 'Equity'}</p>
                  </div>
                  <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Min Ticket</p>
                    <p className="text-sm font-black text-slate-900">{fmt(selected.min_ticket_usd)}</p>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar bg-white sticky top-[200px] z-10">
                {TABS.map(t => (
                  <button key={t.id} onClick={() => setActiveTab(t.id)}
                    className={`px-5 py-3.5 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-b-2 ${activeTab === t.id ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-700'}`}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="p-6 space-y-5 flex-1">

                {activeTab === 'overview' && (
                  <div className="space-y-5">
                    {selected.description && (
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">About the Company</p>
                        <p className="text-sm text-slate-700 leading-relaxed font-medium">{selected.description}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      {selected.year_founded && <Stat label="Founded" value={selected.year_founded} />}
                      {selected.headquarters && <Stat label="Headquarters" value={selected.headquarters} />}
                      {selected.target_exchange && <Stat label="Target Exchange" value={selected.target_exchange} />}
                      {selected.listing_type && <Stat label="Listing Type" value={selected.listing_type} />}
                      {selected.listing_timeline && <Stat label="Target Timeline" value={selected.listing_timeline} />}
                      {selected.equity_offered_pct && <Stat label="Equity Offered" value={`${selected.equity_offered_pct}%`} />}
                      {selected.pre_money_valuation_usd && <Stat label="Pre-Money Valuation" value={fmt(selected.pre_money_valuation_usd)} />}
                    </div>
                    {selected.use_of_proceeds && (
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Use of Proceeds</p>
                        <p className="text-sm text-slate-700 font-medium leading-relaxed">{selected.use_of_proceeds}</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'assets' && (
                  <div className="space-y-4">
                    {selected.sector === 'Mining' ? (
                      <>
                        {selected.deposit_location && <Stat label="Deposit Location" value={selected.deposit_location} wide />}
                        {selected.hectares && <Stat label="Concession Area" value={`${selected.hectares.toLocaleString()} ha`} />}
                        {selected.resource_estimate && <Stat label="Resource Estimate" value={selected.resource_estimate} wide />}
                        {selected.license_numbers && <Stat label="License Numbers" value={selected.license_numbers} />}
                        {selected.env_permit_status && <Stat label="Environmental Permit" value={selected.env_permit_status} />}
                        {selected.sub_sector && <Stat label="Primary Commodity" value={selected.sub_sector} />}
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mt-2">
                          <p className="text-[9px] font-black uppercase tracking-widest text-amber-700 mb-1">Note on Resource Estimates</p>
                          <p className="text-xs text-amber-700 font-medium">Resources are reported under JORC 2012 or NI 43-101 unless stated as historical. IFB has not independently verified these figures. Always review the original technical report before investing.</p>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-10 text-slate-400">
                        <Building2 size={32} className="mx-auto mb-3 opacity-40" />
                        <p className="text-sm font-bold">Detailed asset schedule available in the data room.</p>
                        <p className="text-xs mt-1">Express interest below to request access.</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'financials' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <Stat label="Annual Revenue" value={selected.annual_revenue_usd ? fmt(selected.annual_revenue_usd) : 'Pre-Revenue'} highlight={!!selected.annual_revenue_usd} />
                      {selected.ebitda_usd !== null && <Stat label="EBITDA" value={fmt(selected.ebitda_usd)} />}
                      {selected.total_assets_usd !== null && <Stat label="Total Assets" value={fmt(selected.total_assets_usd)} />}
                      {selected.existing_debt_usd !== null && <Stat label="Existing Debt" value={fmt(selected.existing_debt_usd)} />}
                      <Stat label="Financials Type" value={selected.financials_type || 'Management Accounts'} />
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                      <p className="text-[9px] font-black uppercase tracking-widest text-blue-700 mb-1">Disclaimer</p>
                      <p className="text-xs text-blue-700 font-medium">Financial figures are provided by the company and have not been independently audited by IFB. Full financial statements are available in the data room upon expression of interest.</p>
                    </div>
                  </div>
                )}

                {activeTab === 'management' && (
                  <div className="space-y-4">
                    {selected.ceo_name && (
                      <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center font-black text-slate-600">
                          {selected.ceo_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-slate-900">{selected.ceo_name}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chief Executive Officer</p>
                        </div>
                      </div>
                    )}
                    {selected.cfo_name && (
                      <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center font-black text-slate-600">
                          {selected.cfo_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-slate-900">{selected.cfo_name}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chief Financial Officer</p>
                        </div>
                      </div>
                    )}
                    {selected.ownership_structure && (
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Ownership Structure</p>
                        <p className="text-sm text-slate-700 font-medium">{selected.ownership_structure}</p>
                      </div>
                    )}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center text-slate-400">
                      <p className="text-xs font-bold">Full management CVs and board composition available in the secure data room.</p>
                    </div>
                  </div>
                )}

                {activeTab === 'esg' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      {selected.current_employees && <Stat label="Current Employees" value={selected.current_employees.toLocaleString()} />}
                      {selected.projected_employees && <Stat label="Projected Employees" value={selected.projected_employees.toLocaleString()} />}
                      {selected.local_ownership_pct && <Stat label="Local Ownership" value={`${selected.local_ownership_pct}%`} highlight />}
                      {selected.esg_rating && <Stat label="ESG Rating" value={selected.esg_rating} highlight />}
                    </div>
                    {selected.current_employees && selected.projected_employees && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-700 mb-2">Job Creation Impact</p>
                        <p className="text-sm text-emerald-800 font-medium">
                          This capital raise is projected to create <strong>{(selected.projected_employees - selected.current_employees).toLocaleString()}</strong> additional local jobs, growing the workforce from {selected.current_employees.toLocaleString()} to {selected.projected_employees.toLocaleString()}.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Express Interest ────────────────────────── */}
              <div className="border-t border-slate-200 p-6 bg-slate-50 rounded-b-[2.5rem]">
                {alreadyExpressed ? (
                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                    <CheckCircle className="text-emerald-600 shrink-0" size={20} />
                    <div>
                      <p className="font-black text-emerald-800 text-sm">Interest Registered</p>
                      <p className="text-xs text-emerald-600 font-medium">IFB will connect you with this company within 3 business days.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Express Investment Interest</p>
                    <select
                      value={interestForm.range}
                      onChange={e => setInterestForm(p => ({ ...p, range: e.target.value }))}
                      className="w-full bg-white border border-slate-200 rounded-2xl p-3.5 font-bold text-sm text-slate-800 outline-none focus:border-blue-400"
                    >
                      <option value="">Select investment range…</option>
                      {RANGES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <textarea
                      value={interestForm.message}
                      onChange={e => setInterestForm(p => ({ ...p, message: e.target.value }))}
                      rows={2}
                      placeholder="Optional: brief message to the company…"
                      className="w-full bg-white border border-slate-200 rounded-2xl p-3.5 font-medium text-sm text-slate-800 outline-none focus:border-blue-400 resize-none"
                    />
                    <button
                      onClick={handleExpressInterest}
                      disabled={submitting || !interestForm.range}
                      className="w-full py-4 bg-slate-900 hover:bg-blue-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 shadow-xl flex items-center justify-center gap-2"
                    >
                      {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={14} />}
                      {submitting ? 'Registering…' : 'Register Interest — IFB Will Connect You'}
                    </button>
                    <p className="text-[9px] text-slate-400 font-medium text-center">IFB is a marketplace. Expressing interest does not constitute a binding commitment. Capital flows directly between you and the company.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══ INFO MODAL ════════════════════════════════════ */}
      {showInfo && (
        <div className="fixed inset-0 z-[500] flex items-end md:items-center justify-center p-0 md:p-6 bg-slate-900/70 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="bg-slate-900 rounded-t-[2.5rem] p-8 relative overflow-hidden">
              <div className="absolute inset-0 opacity-10" style={{backgroundImage:'radial-gradient(circle at 20% 50%, #f59e0b, transparent 60%)'}} />
              <div className="relative z-10 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Globe className="text-amber-400" size={22} />
                    <h3 className="text-xl font-black text-white">How VentureX Listings Works</h3>
                  </div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">IFB as Capital Marketplace — Not a Broker-Dealer</p>
                </div>
                <button onClick={() => setShowInfo(false)} className="p-2 bg-white/10 border border-white/20 rounded-xl text-white">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-1">
              {HOW_IT_WORKS_STEPS.map((step, i) => (
                <div key={i} className="flex gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-all">
                  <div className="text-2xl shrink-0 mt-0.5">{step.icon}</div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-5 h-5 bg-slate-900 text-white rounded-full text-[10px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                      <p className="font-black text-slate-900 text-sm">{step.title}</p>
                    </div>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">{step.body}</p>
                  </div>
                </div>
              ))}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mt-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-2">IFB Fee Structure</p>
                <div className="space-y-1.5 text-xs text-amber-800 font-medium">
                  <p>• <strong>Listing fee:</strong> $500 – $2,000 one-time (paid by company)</p>
                  <p>• <strong>Success fee:</strong> 3–6% of capital raised at closing</p>
                  <p>• <strong>Annual renewal:</strong> $300 – $1,000/yr to keep listing active</p>
                  <p>• <strong>Premium investor access:</strong> $50–$200/month for early deal flow</p>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-700 mb-2">Legal Disclaimer</p>
                <p className="text-xs text-blue-700 font-medium leading-relaxed">IFB operates as a capital marketplace and matchmaking platform. We are not a licensed broker-dealer, investment adviser or securities exchange. Nothing on this platform constitutes investment advice or a solicitation to buy or sell securities. All investments carry risk including total loss of capital. IFB does not hold, transmit or manage investor funds. Investors are responsible for their own due diligence.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ────────────────────────────────────────── */}
      {toast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[600] animate-in slide-in-from-top-10 duration-500">
          <div className={`px-8 py-4 rounded-3xl shadow-2xl border-2 backdrop-blur-2xl flex items-center gap-3 ${toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-400' : 'bg-red-500/10 border-red-400/30 text-red-400'}`}>
            <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${toast.type === 'success' ? 'bg-emerald-400' : 'bg-red-400'}`} />
            <p className="font-black text-[11px] uppercase tracking-widest">{toast.text}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper stat tile ────────────────────────────────────────
function Stat({ label, value, wide = false, highlight = false }) {
  return (
    <div className={`bg-slate-50 border border-slate-200 rounded-2xl p-3.5 ${wide ? 'col-span-2' : ''}`}>
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className={`text-sm font-black ${highlight ? 'text-blue-700' : 'text-slate-900'}`}>{value || '—'}</p>
    </div>
  );
}
