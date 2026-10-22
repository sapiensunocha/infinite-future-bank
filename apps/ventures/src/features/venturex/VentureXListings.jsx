import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
  Search, X, Info, CheckCircle, Globe, MapPin, Users, TrendingUp,
  Building2, Loader2, Filter, ArrowUpDown, ArrowRight, Send,
  ShieldCheck, BarChart3, FileText, Eye, Star, RefreshCw,
  AlertCircle, ChevronDown, List, LayoutGrid, SlidersHorizontal,
  ArrowUp, ArrowDown, Minus, Activity, DollarSign, Pickaxe,
  AlertTriangle, Leaf, Award, Droplets, Wind, TreePine,
  UserCheck, Briefcase, TrendingDown, Zap
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────
const SECTOR_META = {
  'Mining':         { emoji: '⛏️', color: '#f59e0b', light: '#fef3c7', dark: '#92400e', border: '#fcd34d' },
  'Energy':         { emoji: '⚡', color: '#10b981', light: '#d1fae5', dark: '#065f46', border: '#6ee7b7' },
  'Agriculture':    { emoji: '🌱', color: '#84cc16', light: '#f7fee7', dark: '#3f6212', border: '#bef264' },
  'FinTech':        { emoji: '💳', color: '#3b82f6', light: '#eff6ff', dark: '#1e3a8a', border: '#93c5fd' },
  'Infrastructure': { emoji: '🏗️', color: '#64748b', light: '#f1f5f9', dark: '#1e293b', border: '#94a3b8' },
  'Healthcare':     { emoji: '🏥', color: '#f43f5e', light: '#fff1f2', dark: '#881337', border: '#fda4af' },
  'Real Estate':    { emoji: '🏢', color: '#8b5cf6', light: '#f5f3ff', dark: '#4c1d95', border: '#c4b5fd' },
};

const STAGE_META = {
  'Exploration':   { label: 'Exploration',   bg: '#fef9c3', text: '#713f12', dot: '#eab308' },
  'Development':   { label: 'Development',   bg: '#dbeafe', text: '#1e3a8a', dot: '#3b82f6' },
  'Production':    { label: 'Production',    bg: '#dcfce7', text: '#14532d', dot: '#22c55e' },
  'Pre-Revenue':   { label: 'Pre-Revenue',   bg: '#ffedd5', text: '#7c2d12', dot: '#f97316' },
  'Revenue-Stage': { label: 'Revenue Stage', bg: '#d1fae5', text: '#064e3b', dot: '#10b981' },
};

const FLAGS = {
  'Guinea':'🇬🇳','Tanzania':'🇹🇿','Ghana':'🇬🇭','Mali':'🇲🇱','Burkina Faso':'🇧🇫',
  'Ivory Coast':'🇨🇮','DR Congo':'🇨🇩','Zambia':'🇿🇲','Zimbabwe':'🇿🇼','Morocco':'🇲🇦',
  'Uganda':'🇺🇬','Lesotho':'🇱🇸','Sierra Leone':'🇸🇱','Botswana':'🇧🇼','South Africa':'🇿🇦',
  'Niger':'🇳🇪','Namibia':'🇳🇦','Mozambique':'🇲🇿','Madagascar':'🇲🇬','Nigeria':'🇳🇬',
  'Kenya':'🇰🇪','Ethiopia':'🇪🇹','Senegal':'🇸🇳','Gabon':'🇬🇦','Rwanda':'🇷🇼',
  'Egypt':'🇪🇬','Peru':'🇵🇪','Brazil':'🇧🇷','Chile':'🇨🇱','Australia':'🇦🇺',
  'Venezuela':'🇻🇪','Mauritania':'🇲🇷',
};

const SECTORS = ['All','Mining','Energy','Agriculture','FinTech','Infrastructure','Healthcare','Real Estate'];
const STAGES  = ['All','Exploration','Development','Production','Pre-Revenue','Revenue-Stage'];
const RAISES  = ['All','< $10M','$10M – $30M','$30M – $75M','$75M+'];
const SORT_OPTIONS = [
  { id: 'raise_desc',    label: 'Raise ↓' },
  { id: 'raise_asc',     label: 'Raise ↑' },
  { id: 'name_asc',      label: 'Name A–Z' },
  { id: 'verified_first',label: 'Verified First' },
  { id: 'featured_first',label: 'Featured' },
];
const RANGES = ['$25K – $100K','$100K – $500K','$500K – $2M','$2M+'];

const HOW_IT_WORKS = [
  { n:'1', icon:'📋', title:'Company Applies & Pays Listing Fee', body:'Company submits KYC documents, financial statements and a capital raise brief. A one-time listing fee of $500–$2,000 is charged to publish the profile on IFB Venture Exchange.' },
  { n:'2', icon:'🔍', title:'IFB Verifies & Approves',            body:'Our compliance team verifies registration, director identity and core financial claims. Approved companies receive the IFB Verified badge. We do not guarantee financial projections.' },
  { n:'3', icon:'👁️', title:'Investors Browse the Directory',      body:'Authenticated IFB users browse active listings, filter by sector/country/stage/raise size, and read full company profiles.' },
  { n:'4', icon:'🤝', title:'Express Interest',                    body:'Investors select an investment range and submit a message. IFB connects both parties by email within 3 business days and provides access to the company\'s secure data room.' },
  { n:'5', icon:'✅', title:'Deal Closes — IFB Earns Success Fee', body:'If capital is successfully raised, IFB invoices a success fee of 3–6% of the amount closed. Capital flows directly between investor and company — IFB does not hold or transmit funds.' },
];

const fmt = (n) => {
  if (n == null) return '—';
  if (n >= 1e9) return `$${(n/1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n/1e3).toFixed(0)}K`;
  return `$${n}`;
};

const ticker = (name) => name.replace(/[^A-Z]/g,'').slice(0,4) || name.slice(0,4).toUpperCase();

// ════════════════════════════════════════════════════════════
export default function VentureXListings({ session }) {
  const [companies, setCompanies]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [sector, setSector]           = useState('All');
  const [stage, setStage]             = useState('All');
  const [raise, setRaise]             = useState('All');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy]           = useState('featured_first');
  const [viewMode, setViewMode]       = useState('grid');  // 'grid' | 'table'
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected]       = useState(null);
  const [activeTab, setActiveTab]     = useState('overview');
  const [showInfo, setShowInfo]       = useState(false);
  const [myInterests, setMyInterests] = useState(new Set());
  const [interestForm, setInterestForm] = useState({ range:'', message:'' });
  const [submitting, setSubmitting]   = useState(false);
  const [toast, setToast]             = useState(null);
  const tickerRef = useRef(null);

  useEffect(() => { fetchAll(); }, []);

  // Ticker scroll animation
  useEffect(() => {
    if (!tickerRef.current || companies.length === 0) return;
    let x = 0;
    const el = tickerRef.current;
    const speed = 0.4;
    let raf;
    const step = () => {
      x -= speed;
      if (Math.abs(x) > el.scrollWidth / 2) x = 0;
      el.style.transform = `translateX(${x}px)`;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [companies]);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: co }, { data: my }] = await Promise.all([
      supabase.from('venturex_listed_companies').select('*').eq('status','active'),
      supabase.from('venturex_interest').select('company_id').eq('user_id', session.user.id),
    ]);
    setCompanies(co || []);
    setMyInterests(new Set((my||[]).map(r => r.company_id)));
    setLoading(false);
  };

  const notify = (type, text) => { setToast({type,text}); setTimeout(()=>setToast(null),5000); };

  const handleExpressInterest = async () => {
    if (!interestForm.range) return notify('error','Please select an investment range.');
    setSubmitting(true);
    const { error } = await supabase.from('venturex_interest').upsert({
      user_id: session.user.id, company_id: selected.id,
      message: interestForm.message||null, investment_range: interestForm.range,
    }, { onConflict:'user_id,company_id' });
    setSubmitting(false);
    if (error) notify('error','Could not register interest. Please try again.');
    else {
      setMyInterests(prev => new Set([...prev, selected.id]));
      setInterestForm({range:'',message:''});
      notify('success',`Interest registered! IFB will connect you with ${selected.name} within 3 business days.`);
    }
  };

  // ── Filter + Sort ─────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = companies.filter(c => {
      const q = search.toLowerCase();
      const mQ = !q || c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)
        || c.sub_sector?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)
        || ticker(c.name).toLowerCase().includes(q);
      const mS  = sector === 'All' || c.sector === sector;
      const mSt = stage  === 'All' || c.stage  === stage;
      const mR  = raise  === 'All'
        || (raise === '< $10M'      && c.raise_amount_usd < 10e6)
        || (raise === '$10M – $30M' && c.raise_amount_usd >= 10e6 && c.raise_amount_usd <= 30e6)
        || (raise === '$30M – $75M' && c.raise_amount_usd > 30e6  && c.raise_amount_usd <= 75e6)
        || (raise === '$75M+'       && c.raise_amount_usd > 75e6);
      const mV = !verifiedOnly || c.ifb_verified;
      return mQ && mS && mSt && mR && mV;
    });
    list.sort((a,b) => {
      if (sortBy === 'raise_desc')     return b.raise_amount_usd - a.raise_amount_usd;
      if (sortBy === 'raise_asc')      return a.raise_amount_usd - b.raise_amount_usd;
      if (sortBy === 'name_asc')       return a.name.localeCompare(b.name);
      if (sortBy === 'verified_first') return (b.ifb_verified?1:0) - (a.ifb_verified?1:0);
      // featured_first
      if (b.is_featured !== a.is_featured) return (b.is_featured?1:0)-(a.is_featured?1:0);
      if (b.ifb_verified !== a.ifb_verified) return (b.ifb_verified?1:0)-(a.ifb_verified?1:0);
      return b.raise_amount_usd - a.raise_amount_usd;
    });
    return list;
  }, [companies, search, sector, stage, raise, verifiedOnly, sortBy]);

  const totalRaise  = filtered.reduce((s,c) => s+(c.raise_amount_usd||0),0);
  const miningCount = companies.filter(c=>c.sector==='Mining').length;
  const verifiedCount = companies.filter(c=>c.ifb_verified).length;
  const countryCount  = new Set(companies.map(c=>c.country)).size;

  // ── Ticker items ──────────────────────────────────────────
  const tickerItems = [...companies, ...companies]; // doubled for seamless loop

  if (loading) return (
    <div className="space-y-4 animate-in fade-in">
      <div className="h-16 bg-slate-900 rounded-2xl animate-pulse"/>
      <div className="h-12 bg-slate-200 rounded-2xl animate-pulse"/>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[...Array(6)].map((_,i)=>(
          <div key={i} className="h-56 bg-white rounded-[2rem] border border-slate-100 animate-pulse"/>
        ))}
      </div>
    </div>
  );

  const sm = selected ? (SECTOR_META[selected.sector]||SECTOR_META['Mining']) : null;
  const stm = selected?.stage ? (STAGE_META[selected.stage]||{}) : {};

  return (
    <div className="space-y-0 animate-in fade-in duration-400 pb-24">

      {/* ══ EXCHANGE HEADER ══════════════════════════════════ */}
      <div className="bg-[#0a0f1e] rounded-t-[2rem] overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Pickaxe size={16} className="text-amber-400"/>
            </div>
            <div>
              <h2 className="text-white font-black text-base tracking-tight leading-none">IFB Venture Exchange</h2>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Capital Raise Directory · Africa & World</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>setShowInfo(true)}
              className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300 transition-all">
              <Info size={12} className="text-amber-400"/> How It Works
            </button>
            <button onClick={fetchAll} className="p-2 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all">
              <RefreshCw size={14}/>
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-4 border-t border-white/5 divide-x divide-white/5">
          {[
            { label:'Listed Companies', value: companies.length, sub:'Active listings' },
            { label:'Total Capital Sought', value: fmt(companies.reduce((s,c)=>s+(c.raise_amount_usd||0),0)), sub:'Across all sectors' },
            { label:'Mining Companies', value: miningCount, sub:`${Math.round(miningCount/companies.length*100)}% of listings` },
            { label:'Countries', value: countryCount, sub:`${verifiedCount} IFB Verified` },
          ].map(s => (
            <div key={s.label} className="px-4 py-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-0.5">{s.label}</p>
              <p className="text-white font-black text-lg leading-none">{s.value}</p>
              <p className="text-slate-600 text-[9px] font-bold mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Live ticker */}
        <div className="border-t border-white/5 py-2 overflow-hidden bg-black/20">
          <div ref={tickerRef} className="flex gap-6 whitespace-nowrap will-change-transform">
            {tickerItems.map((c, i) => {
              const meta = SECTOR_META[c.sector]||SECTOR_META['Mining'];
              return (
                <span key={i} className="inline-flex items-center gap-2 text-[10px] font-black shrink-0">
                  <span className="text-slate-400 font-mono">{ticker(c.name)}</span>
                  <span style={{color: meta.color}}>{FLAGS[c.country]||'🌍'}</span>
                  <span className="text-white/60">{fmt(c.raise_amount_usd)}</span>
                  <span className="text-slate-700">·</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* ══ FILTER BAR ═══════════════════════════════════════ */}
      <div className="bg-white border-x border-b border-slate-200 shadow-sm">
        {/* Main filter row */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input type="text" value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search company, country, mineral…"
              className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-400 transition-all"/>
            {search && <button onClick={()=>setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"><X size={13}/></button>}
          </div>
          {/* Sort */}
          <div className="relative shrink-0">
            <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
              className="appearance-none bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-700 outline-none focus:border-blue-400 cursor-pointer">
              {SORT_OPTIONS.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
          </div>
          {/* Verified toggle */}
          <button onClick={()=>setVerifiedOnly(!verifiedOnly)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${verifiedOnly ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-blue-300'}`}>
            <ShieldCheck size={12}/> Verified
          </button>
          {/* Filter toggle */}
          <button onClick={()=>setShowFilters(!showFilters)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${showFilters ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-400'}`}>
            <SlidersHorizontal size={12}/> Filters
          </button>
          {/* View toggle */}
          <div className="flex border border-slate-200 rounded-xl overflow-hidden shrink-0">
            <button onClick={()=>setViewMode('grid')} className={`p-2.5 transition-all ${viewMode==='grid'?'bg-slate-900 text-white':'text-slate-400 hover:text-slate-700'}`}><LayoutGrid size={14}/></button>
            <button onClick={()=>setViewMode('table')} className={`p-2.5 transition-all ${viewMode==='table'?'bg-slate-900 text-white':'text-slate-400 hover:text-slate-700'}`}><List size={14}/></button>
          </div>
        </div>

        {/* Expandable advanced filters */}
        {showFilters && (
          <div className="px-5 py-4 space-y-3 bg-slate-50/60 border-b border-slate-100 animate-in slide-in-from-top-2 duration-200">
            {/* Sector */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 w-14 shrink-0">Sector</span>
              {SECTORS.map(s=>(
                <button key={s} onClick={()=>setSector(s)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${sector===s?'bg-slate-900 text-white':'bg-white border border-slate-200 text-slate-500 hover:border-slate-400'}`}>
                  {s==='All'?'All':`${SECTOR_META[s]?.emoji||''} ${s}`}
                </button>
              ))}
            </div>
            {/* Stage */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 w-14 shrink-0">Stage</span>
              {STAGES.map(s=>(
                <button key={s} onClick={()=>setStage(s)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${stage===s?'bg-slate-900 text-white':'bg-white border border-slate-200 text-slate-500 hover:border-slate-400'}`}>
                  {s}
                </button>
              ))}
            </div>
            {/* Raise */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 w-14 shrink-0">Raise</span>
              {RAISES.map(r=>(
                <button key={r} onClick={()=>setRaise(r)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${raise===r?'bg-slate-900 text-white':'bg-white border border-slate-200 text-slate-500 hover:border-slate-400'}`}>
                  {r}
                </button>
              ))}
            </div>
            {/* Reset */}
            {(sector!=='All'||stage!=='All'||raise!=='All'||verifiedOnly||search) && (
              <button onClick={()=>{setSector('All');setStage('All');setRaise('All');setVerifiedOnly(false);setSearch('');}}
                className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-700 transition-all">
                ✕ Reset all filters
              </button>
            )}
          </div>
        )}

        {/* Results count */}
        <div className="flex items-center justify-between px-5 py-2.5">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            {filtered.length} listings · {new Set(filtered.map(c=>c.country)).size} countries · {fmt(totalRaise)} total capital
          </p>
          {(sector!=='All'||stage!=='All'||raise!=='All'||verifiedOnly) && (
            <div className="flex items-center gap-1.5">
              {sector!=='All' && <Chip label={sector} onRemove={()=>setSector('All')}/>}
              {stage!=='All'  && <Chip label={stage}  onRemove={()=>setStage('All')}/>}
              {raise!=='All'  && <Chip label={raise}  onRemove={()=>setRaise('All')}/>}
              {verifiedOnly   && <Chip label="Verified" onRemove={()=>setVerifiedOnly(false)}/>}
            </div>
          )}
        </div>
      </div>

      {/* ══ LISTINGS ════════════════════════════════════════ */}
      <div className="bg-slate-50 border-x border-b border-slate-200 rounded-b-[2rem] min-h-[400px]">
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <AlertCircle size={36} className="mx-auto mb-3 text-slate-300"/>
            <p className="font-black text-slate-700 text-base">No listings match your filters</p>
            <p className="text-slate-400 text-xs font-medium mt-1">Adjust sector, stage or raise size filters</p>
          </div>
        ) : viewMode === 'grid' ? (
          /* ── GRID VIEW ── */
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(c => <ExchangeCard key={c.id} c={c} myInterests={myInterests} onOpen={co=>{setSelected(co);setActiveTab('overview');setInterestForm({range:'',message:''});}}/>)}
          </div>
        ) : (
          /* ── TABLE VIEW ── */
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100">
                  {['Ticker','Company','Country','Sector','Stage','Raise Target','Equity %','Min Ticket','Status',''].map(h=>(
                    <th key={h} className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(c => {
                  const meta = SECTOR_META[c.sector]||SECTOR_META['Mining'];
                  const stg  = STAGE_META[c.stage]||{};
                  const alreadyExpressed = myInterests.has(c.id);
                  return (
                    <tr key={c.id} onClick={()=>{setSelected(c);setActiveTab('overview');setInterestForm({range:'',message:''});}}
                      className="hover:bg-blue-50/50 cursor-pointer transition-colors group">
                      <td className="px-4 py-3 font-mono font-black text-slate-800 text-[10px]">{ticker(c.name)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-black shrink-0" style={{backgroundColor:c.logo_color||'#3b82f6'}}>
                            {c.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-black text-slate-900 text-xs leading-none whitespace-nowrap">{c.name}</p>
                            {c.ifb_verified && <span className="text-[8px] font-black text-blue-600">✓ Verified</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-bold">{FLAGS[c.country]||'🌍'} {c.country}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest whitespace-nowrap"
                          style={{backgroundColor:meta.light,color:meta.dark}}>{meta.emoji} {c.sub_sector||c.sector}</span>
                      </td>
                      <td className="px-4 py-3">
                        {c.stage && <span className="px-2 py-0.5 rounded-md text-[9px] font-black whitespace-nowrap"
                          style={{backgroundColor:stg.bg,color:stg.text}}>{c.stage}</span>}
                      </td>
                      <td className="px-4 py-3 font-black text-slate-900 whitespace-nowrap">{fmt(c.raise_amount_usd)}</td>
                      <td className="px-4 py-3 text-slate-600 font-bold">{c.equity_offered_pct ? `${c.equity_offered_pct}%` : '—'}</td>
                      <td className="px-4 py-3 text-slate-600 font-bold whitespace-nowrap">{fmt(c.min_ticket_usd)}</td>
                      <td className="px-4 py-3">
                        {c.is_featured
                          ? <span className="text-amber-600 font-black text-[9px] uppercase">⭐ Featured</span>
                          : c.ifb_verified
                          ? <span className="text-blue-600 font-black text-[9px] uppercase">✓ Active</span>
                          : <span className="text-slate-400 font-black text-[9px] uppercase">Active</span>}
                      </td>
                      <td className="px-4 py-3">
                        <button className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap">
                          {alreadyExpressed ? '✓ Interested' : 'View →'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══ DETAIL MODAL ════════════════════════════════════ */}
      {selected && (() => {
        const alreadyExpressed = myInterests.has(selected.id);
        const TABS = ['overview','assets','financials','management','esg'];
        const ei = selected.extended_info || {};
        return (
          <div className="fixed inset-0 z-[500] flex items-end md:items-center justify-center p-0 md:p-6 bg-black/75 backdrop-blur-xl animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl max-h-[94vh] overflow-y-auto rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl flex flex-col">

              {/* Modal top: exchange-style header */}
              <div className="bg-[#0a0f1e] rounded-t-[2.5rem] p-6">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg shrink-0"
                      style={{backgroundColor:selected.logo_color||'#3b82f6'}}>
                      {selected.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-slate-500 text-xs">{ticker(selected.name)}</span>
                        <h3 className="text-white font-black text-lg leading-tight">{selected.name}</h3>
                        {selected.ifb_verified && (
                          <span className="flex items-center gap-1 text-[9px] font-black text-blue-300 bg-blue-900/40 border border-blue-700/40 px-2 py-0.5 rounded-full">
                            <ShieldCheck size={9}/> IFB Verified
                          </span>
                        )}
                        {selected.is_featured && (
                          <span className="text-[9px] font-black text-amber-300 bg-amber-900/40 border border-amber-700/40 px-2 py-0.5 rounded-full">⭐ Featured</span>
                        )}
                      </div>
                      <p className="text-slate-500 text-xs font-bold mt-1">
                        {FLAGS[selected.country]||'🌍'} {selected.country}
                        {selected.headquarters && ` · ${selected.headquarters}`}
                      </p>
                    </div>
                  </div>
                  <button onClick={()=>setSelected(null)} className="p-2 bg-white/10 border border-white/10 rounded-xl text-slate-400 hover:text-white shrink-0">
                    <X size={16}/>
                  </button>
                </div>

                {/* Key metrics row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    {label:'Capital Raise',   value: fmt(selected.raise_amount_usd), accent:'#f59e0b'},
                    {label:'Type',            value: selected.capital_type?.toUpperCase()||'EQUITY', accent:'#3b82f6'},
                    {label:'Min Ticket',      value: fmt(selected.min_ticket_usd),    accent:'#10b981'},
                    {label:'Equity Offered',  value: selected.equity_offered_pct ? `${selected.equity_offered_pct}%` : '—', accent:'#8b5cf6'},
                  ].map(m => (
                    <div key={m.label} className="bg-white/5 border border-white/10 rounded-2xl p-3">
                      <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{color:m.accent}}>{m.label}</p>
                      <p className="text-white font-black text-base leading-none">{m.value}</p>
                    </div>
                  ))}
                </div>

                {/* Sector + Stage badges */}
                <div className="flex gap-2 mt-4 flex-wrap">
                  {sm && (
                    <span className="px-3 py-1 rounded-full text-xs font-black"
                      style={{backgroundColor:sm.light,color:sm.dark,border:`1px solid ${sm.border}`}}>
                      {sm.emoji} {selected.sector} · {selected.sub_sector}
                    </span>
                  )}
                  {selected.stage && stm.bg && (
                    <span className="px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5"
                      style={{backgroundColor:'rgba(255,255,255,0.08)',color:'#94a3b8',border:'1px solid rgba(255,255,255,0.1)'}}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{backgroundColor:stm.dot}}/>
                      {selected.stage}
                    </span>
                  )}
                  {selected.target_exchange && (
                    <span className="px-3 py-1 rounded-full text-xs font-black text-slate-400 border border-white/10 bg-white/5">
                      🏛 {selected.target_exchange}
                    </span>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar bg-slate-50">
                {TABS.map(t=>(
                  <button key={t} onClick={()=>setActiveTab(t)}
                    className={`px-5 py-3.5 text-[10px] font-black uppercase tracking-widest whitespace-nowrap border-b-2 transition-all capitalize ${activeTab===t?'border-slate-900 text-slate-900 bg-white':'border-transparent text-slate-400 hover:text-slate-600'}`}>
                    {t === 'assets' && selected.sector === 'Mining' ? 'Mine Assets' : t}
                  </button>
                ))}
              </div>

              {/* ── TAB CONTENT ─────────────────────────────── */}
              <div className="p-6 flex-1 space-y-4">

                {/* ══ OVERVIEW TAB ══════════════════════════ */}
                {activeTab==='overview' && (
                  <div className="space-y-5">
                    {selected.description && (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">About</p>
                        <p className="text-sm text-slate-700 leading-relaxed font-medium">{selected.description}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      {selected.year_founded && <DCell label="Founded"          value={selected.year_founded}/>}
                      {selected.listing_timeline && <DCell label="Target Timeline"  value={selected.listing_timeline}/>}
                      {selected.listing_type && <DCell label="Listing Type"     value={selected.listing_type}/>}
                      {selected.pre_money_valuation_usd && <DCell label="Pre-Money Val." value={fmt(selected.pre_money_valuation_usd)} accent/>}
                    </div>
                    {selected.use_of_proceeds && (
                      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                        <p className="text-[9px] font-black uppercase tracking-widest text-blue-600 mb-2">Use of Proceeds</p>
                        <p className="text-sm text-blue-800 font-medium leading-relaxed">{selected.use_of_proceeds}</p>
                      </div>
                    )}

                    {/* Investment Highlights */}
                    {ei.highlights && ei.highlights.length > 0 && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-700 mb-3 flex items-center gap-1.5">
                          <TrendingUp size={11}/> Investment Highlights
                        </p>
                        <div className="space-y-2">
                          {ei.highlights.map((h, i) => (
                            <div key={i} className="flex items-start gap-2.5">
                              <CheckCircle size={13} className="text-emerald-600 shrink-0 mt-0.5"/>
                              <p className="text-xs text-emerald-900 font-medium leading-relaxed">{h}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Key Risks */}
                    {ei.risks && ei.risks.length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                        <p className="text-[9px] font-black uppercase tracking-widest text-amber-700 mb-3 flex items-center gap-1.5">
                          <AlertTriangle size={11}/> Key Risk Factors
                        </p>
                        <div className="space-y-2">
                          {ei.risks.map((r, i) => (
                            <div key={i} className="flex items-start gap-2.5">
                              <AlertTriangle size={12} className="text-amber-500 shrink-0 mt-0.5"/>
                              <p className="text-xs text-amber-900 font-medium leading-relaxed">{r}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ══ ASSETS TAB ════════════════════════════ */}
                {activeTab==='assets' && (
                  <div className="space-y-4">
                    {selected.sector==='Mining' ? (
                      <>
                        {/* Core deposit data */}
                        {selected.deposit_location && <DCell label="Deposit Location"   value={selected.deposit_location} wide/>}
                        {selected.hectares && <DCell label="Concession Area"   value={`${selected.hectares.toLocaleString()} ha`}/>}
                        {selected.resource_estimate && <DCell label="Resource Estimate"  value={selected.resource_estimate} wide/>}
                        {selected.env_permit_status && <DCell label="Environmental Permit" value={selected.env_permit_status}/>}
                        {selected.sub_sector && <DCell label="Primary Commodity"  value={selected.sub_sector}/>}

                        {/* Extended mining data */}
                        {ei.mining && (
                          <>
                            {/* 2-col grid for method/processing/compliance/royalty */}
                            <div className="grid grid-cols-2 gap-3">
                              {ei.mining.method && (
                                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Mining Method</p>
                                  <p className="text-sm font-black text-slate-900">{ei.mining.method}</p>
                                </div>
                              )}
                              {ei.mining.processing && (
                                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Processing Method</p>
                                  <p className="text-xs font-medium text-slate-700 leading-relaxed">{ei.mining.processing}</p>
                                </div>
                              )}
                              {ei.mining.compliance && (
                                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">JORC Compliance</p>
                                  <p className="text-sm font-black text-blue-700">{ei.mining.compliance}</p>
                                </div>
                              )}
                              {ei.mining.royalty_rate && (
                                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Royalty Rate</p>
                                  <p className="text-xs font-medium text-slate-700 leading-relaxed">{ei.mining.royalty_rate}</p>
                                </div>
                              )}
                            </div>

                            {/* Offtake Status */}
                            {ei.mining.offtake_status && (
                              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                                <p className="text-[9px] font-black uppercase tracking-widest text-amber-700 mb-2 flex items-center gap-1.5">
                                  <Briefcase size={10}/> Offtake Status
                                </p>
                                <p className="text-sm text-amber-900 font-medium leading-relaxed">{ei.mining.offtake_status}</p>
                              </div>
                            )}

                            {/* Infrastructure */}
                            {ei.mining.infrastructure && (
                              <div className="space-y-3">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                                  <Building2 size={10}/> Infrastructure & Logistics
                                </p>
                                <div className="space-y-2">
                                  {ei.mining.infrastructure.port && (
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Port Access</p>
                                      <p className="text-xs text-slate-700 font-medium leading-relaxed">{ei.mining.infrastructure.port}</p>
                                    </div>
                                  )}
                                  {ei.mining.infrastructure.rail && (
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Rail Corridor</p>
                                      <p className="text-xs text-slate-700 font-medium leading-relaxed">{ei.mining.infrastructure.rail}</p>
                                    </div>
                                  )}
                                  {ei.mining.infrastructure.road_access && (
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Road Access</p>
                                      <p className="text-xs text-slate-700 font-medium leading-relaxed">{ei.mining.infrastructure.road_access}</p>
                                    </div>
                                  )}
                                  {ei.mining.infrastructure.power && (
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Power Supply</p>
                                      <p className="text-xs text-slate-700 font-medium leading-relaxed">{ei.mining.infrastructure.power}</p>
                                    </div>
                                  )}
                                  {ei.mining.infrastructure.water && (
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Water Management</p>
                                      <p className="text-xs text-slate-700 font-medium leading-relaxed">{ei.mining.infrastructure.water}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {/* Disclaimer */}
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                          <p className="text-[9px] font-black uppercase tracking-widest text-amber-700 mb-1">Resource Estimate Disclaimer</p>
                          <p className="text-xs text-amber-700 font-medium">Resources are reported under JORC 2012 or NI 43-101 unless stated as historical. IFB has not independently verified these figures. Always review the original technical report before investing.</p>
                        </div>
                      </>
                    ) : ei.assets?.overview ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Asset Overview</p>
                        <p className="text-sm text-slate-700 font-medium leading-relaxed">{ei.assets.overview}</p>
                      </div>
                    ) : (
                      <div className="text-center py-10 text-slate-400">
                        <Building2 size={32} className="mx-auto mb-3 opacity-30"/>
                        <p className="text-sm font-bold">Detailed asset schedule available in the secure data room.</p>
                        <p className="text-xs mt-1">Express interest below to request access.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ══ FINANCIALS TAB ════════════════════════ */}
                {activeTab==='financials' && (
                  <div className="space-y-4">

                    {/* Extended financial KPIs */}
                    {ei.financials && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          {ei.financials.irr_pct != null && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5">
                              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-1">Project IRR</p>
                              <p className="text-xl font-black text-emerald-800">{Number(ei.financials.irr_pct).toFixed(1)}%</p>
                            </div>
                          )}
                          {ei.financials.payback_years != null && (
                            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5">
                              <p className="text-[9px] font-black uppercase tracking-widest text-blue-600 mb-1">Payback Period</p>
                              <p className="text-xl font-black text-blue-800">{Number(ei.financials.payback_years).toFixed(1)} yrs</p>
                            </div>
                          )}
                          {ei.financials.capex_total_usd != null && (
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Total CapEx</p>
                              <p className="text-base font-black text-slate-900">{fmt(ei.financials.capex_total_usd)}</p>
                            </div>
                          )}
                          {ei.financials.opex_unit && (
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">OpEx / Unit</p>
                              <p className="text-xs font-black text-slate-800 leading-tight">{ei.financials.opex_unit}</p>
                            </div>
                          )}
                        </div>

                        {/* NPV if present */}
                        {ei.financials.npv_usd != null && (
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Net Present Value (NPV)</p>
                            <p className="text-base font-black text-slate-900">
                              {typeof ei.financials.npv_usd === 'number' ? fmt(ei.financials.npv_usd) : ei.financials.npv_usd}
                            </p>
                          </div>
                        )}

                        {/* Existing capital raised */}
                        {(ei.financials.existing_raised_usd != null || (ei.financials.existing_investors && ei.financials.existing_investors.length > 0)) && (
                          <div className="bg-slate-900 rounded-2xl p-4">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                              <DollarSign size={10}/> Existing Capital Raised
                            </p>
                            {ei.financials.existing_raised_usd != null && (
                              <p className="text-xl font-black text-white mb-3">{fmt(ei.financials.existing_raised_usd)}</p>
                            )}
                            {ei.financials.existing_investors && ei.financials.existing_investors.length > 0 && (
                              <div className="space-y-1.5">
                                {ei.financials.existing_investors.map((inv, i) => (
                                  <div key={i} className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"/>
                                    <p className="text-xs text-slate-300 font-medium">{inv}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Revenue note */}
                        {ei.financials.revenue_note && (
                          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                            <p className="text-[9px] font-black uppercase tracking-widest text-blue-600 mb-2 flex items-center gap-1.5">
                              <TrendingUp size={10}/> Revenue Outlook
                            </p>
                            <p className="text-sm text-blue-800 font-medium leading-relaxed">{ei.financials.revenue_note}</p>
                          </div>
                        )}
                      </>
                    )}

                    {/* Core financial data cells */}
                    <div className="grid grid-cols-2 gap-3">
                      <DCell label="Annual Revenue"   value={selected.annual_revenue_usd ? fmt(selected.annual_revenue_usd) : 'Pre-Revenue'} accent={!!selected.annual_revenue_usd}/>
                      {selected.ebitda_usd!=null      && <DCell label="EBITDA"        value={fmt(selected.ebitda_usd)}/>}
                      {selected.total_assets_usd!=null && <DCell label="Total Assets"  value={fmt(selected.total_assets_usd)}/>}
                      {selected.existing_debt_usd!=null && <DCell label="Existing Debt" value={fmt(selected.existing_debt_usd)}/>}
                      <DCell label="Financials Type"  value={selected.financials_type||'Management Accounts'}/>
                    </div>

                    <div className="bg-slate-800 rounded-2xl p-4">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Disclaimer</p>
                      <p className="text-xs text-slate-400 font-medium">Financial figures are self-reported and have not been independently audited by IFB. IRR, payback and NPV figures are project-level estimates from management; they are indicative only. Full financial model and audited statements available in the data room upon expression of interest.</p>
                    </div>
                  </div>
                )}

                {/* ══ MANAGEMENT TAB ════════════════════════ */}
                {activeTab==='management' && (
                  <div className="space-y-4">

                    {/* CEO */}
                    {selected.ceo_name && (
                      <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                        <div className="w-11 h-11 rounded-xl bg-slate-800 flex items-center justify-center font-black text-white text-lg shrink-0">
                          {selected.ceo_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-slate-900">{selected.ceo_name}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chief Executive Officer</p>
                        </div>
                      </div>
                    )}

                    {/* CFO — from extended_info or cfo_name fallback */}
                    {(ei.team?.cfo || selected.cfo_name) && (
                      <div className="flex items-start gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                        <div className="w-11 h-11 rounded-xl bg-blue-700 flex items-center justify-center font-black text-white text-lg shrink-0">
                          {(ei.team?.cfo || selected.cfo_name || 'C').charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-slate-900">
                            {ei.team?.cfo ? ei.team.cfo.split('—')[0].trim() : selected.cfo_name}
                          </p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Chief Financial Officer</p>
                          {ei.team?.cfo && ei.team.cfo.includes('—') && (
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">
                              {ei.team.cfo.split('—').slice(1).join('—').trim()}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Technical Director */}
                    {ei.team?.technical_director && (
                      <div className="flex items-start gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                        <div className="w-11 h-11 rounded-xl bg-amber-600 flex items-center justify-center font-black text-white text-lg shrink-0">
                          T
                        </div>
                        <div>
                          <p className="font-black text-slate-900">
                            {ei.team.technical_director.includes('—') ? ei.team.technical_director.split('—')[0].trim() : 'Technical Director'}
                          </p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                            {selected.sector === 'Mining' ? 'JORC Competent Person / Technical Director' : 'Chief Technical Officer'}
                          </p>
                          <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            {ei.team.technical_director.includes('—') ? ei.team.technical_director.split('—').slice(1).join('—').trim() : ei.team.technical_director}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Ownership Structure */}
                    {selected.ownership_structure && (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Ownership Structure</p>
                        <p className="text-sm text-slate-700 font-medium">{selected.ownership_structure}</p>
                      </div>
                    )}

                    {/* Board of Directors */}
                    {ei.team?.board && ei.team.board.length > 0 && (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                          <Users size={10}/> Board of Directors
                        </p>
                        <div className="space-y-3">
                          {ei.team.board.map((member, i) => (
                            <div key={i} className="flex items-start gap-3">
                              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600 shrink-0 mt-0.5">
                                {i + 1}
                              </div>
                              <p className="text-xs text-slate-700 font-medium leading-relaxed">{member}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Advisors */}
                    {ei.team?.advisors && ei.team.advisors.length > 0 && (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                          <Briefcase size={10}/> Professional Advisors
                        </p>
                        <div className="space-y-2.5">
                          {ei.team.advisors.map((adv, i) => {
                            const icons = ['🏦','⚖️','🔬'];
                            return (
                              <div key={i} className="flex items-start gap-3">
                                <span className="text-base shrink-0 mt-0.5">{icons[i] || '📋'}</span>
                                <p className="text-xs text-slate-700 font-medium leading-relaxed">{adv}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="text-center text-xs text-slate-400 font-bold py-2">Full CVs and board composition available in the secure data room.</div>
                  </div>
                )}

                {/* ══ ESG TAB ═══════════════════════════════ */}
                {activeTab==='esg' && (
                  <div className="space-y-4">

                    {/* Core ESG grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {selected.current_employees   && <DCell label="Current Employees"   value={selected.current_employees.toLocaleString()}/>}
                      {selected.projected_employees  && <DCell label="Post-Raise Employees" value={selected.projected_employees.toLocaleString()}/>}
                      {selected.local_ownership_pct  && <DCell label="Local Ownership"     value={`${selected.local_ownership_pct}%`} accent/>}
                      {selected.esg_rating           && <DCell label="ESG Rating"          value={selected.esg_rating} accent/>}
                    </div>

                    {/* Job creation callout */}
                    {selected.current_employees && selected.projected_employees && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-700 mb-2 flex items-center gap-1.5">
                          <Users size={10}/> Job Creation Impact
                        </p>
                        <p className="text-sm text-emerald-800 font-medium">
                          This raise is projected to create <strong>{(selected.projected_employees - selected.current_employees).toLocaleString()}</strong> additional local jobs — growing workforce from {selected.current_employees.toLocaleString()} to {selected.projected_employees.toLocaleString()}.
                        </p>
                      </div>
                    )}

                    {/* Extended ESG metrics */}
                    {ei.esg && (
                      <>
                        {/* Community Fund + Local Procurement */}
                        <div className="grid grid-cols-2 gap-3">
                          {ei.esg.community_fund_usd_annual != null && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5">
                              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-1">Community Fund</p>
                              <p className="text-base font-black text-emerald-800">{fmt(ei.esg.community_fund_usd_annual)}<span className="text-xs font-bold">/yr</span></p>
                            </div>
                          )}
                          {ei.esg.local_procurement_pct != null && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5">
                              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-1">Local Procurement</p>
                              <p className="text-base font-black text-emerald-800">{ei.esg.local_procurement_pct}%</p>
                            </div>
                          )}
                          {ei.esg.local_jobs_target != null && (
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Local Jobs Target</p>
                              <p className="text-base font-black text-slate-900">{Number(ei.esg.local_jobs_target).toLocaleString()}</p>
                            </div>
                          )}
                        </div>

                        {/* Water Plan */}
                        {ei.esg.water_plan && (
                          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                            <p className="text-[9px] font-black uppercase tracking-widest text-blue-600 mb-2 flex items-center gap-1.5">
                              <Droplets size={10}/> Water Management Plan
                            </p>
                            <p className="text-xs text-blue-800 font-medium leading-relaxed">{ei.esg.water_plan}</p>
                          </div>
                        )}

                        {/* Biodiversity */}
                        {ei.esg.biodiversity && (
                          <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                            <p className="text-[9px] font-black uppercase tracking-widest text-green-700 mb-2 flex items-center gap-1.5">
                              <TreePine size={10}/> Biodiversity & Rehabilitation
                            </p>
                            <p className="text-xs text-green-800 font-medium leading-relaxed">{ei.esg.biodiversity}</p>
                          </div>
                        )}

                        {/* Certifications */}
                        {ei.esg.certifications && ei.esg.certifications.length > 0 && (
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                              <Award size={10}/> Certifications & Standards
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {ei.esg.certifications.map((cert, i) => (
                                <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-white text-[10px] font-black">
                                  <ShieldCheck size={9} className="text-emerald-400"/>
                                  {cert}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Social License */}
                        {ei.esg.social_license && (
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                              <UserCheck size={10}/> Social Licence to Operate
                            </p>
                            <p className="text-xs text-slate-700 font-medium leading-relaxed">{ei.esg.social_license}</p>
                          </div>
                        )}

                        {/* Carbon Plan */}
                        {ei.esg.carbon_plan && (
                          <div className="bg-slate-900 rounded-2xl p-4">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                              <Wind size={10}/> Carbon & Climate Plan
                            </p>
                            <p className="text-xs text-slate-300 font-medium leading-relaxed">{ei.esg.carbon_plan}</p>
                          </div>
                        )}

                        {/* Gender Policy */}
                        {ei.esg.gender_policy && (
                          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
                            <p className="text-[9px] font-black uppercase tracking-widest text-purple-600 mb-2 flex items-center gap-1.5">
                              <Users size={10}/> Gender & Diversity Policy
                            </p>
                            <p className="text-xs text-purple-900 font-medium leading-relaxed">{ei.esg.gender_policy}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Express Interest footer */}
              <div className="border-t border-slate-200 p-5 bg-slate-50 rounded-b-[2.5rem]">
                {alreadyExpressed ? (
                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                    <CheckCircle className="text-emerald-600 shrink-0" size={20}/>
                    <div>
                      <p className="font-black text-emerald-800 text-sm">Interest Registered</p>
                      <p className="text-xs text-emerald-600 font-medium">IFB will connect you with {selected.name} within 3 business days.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Express Investment Interest</p>
                    <select value={interestForm.range} onChange={e=>setInterestForm(p=>({...p,range:e.target.value}))}
                      className="w-full bg-white border border-slate-200 rounded-2xl p-3.5 font-bold text-sm text-slate-800 outline-none focus:border-blue-400">
                      <option value="">Select investment range…</option>
                      {RANGES.map(r=><option key={r} value={r}>{r}</option>)}
                    </select>
                    <textarea value={interestForm.message} onChange={e=>setInterestForm(p=>({...p,message:e.target.value}))}
                      rows={2} placeholder="Optional message to the company…"
                      className="w-full bg-white border border-slate-200 rounded-2xl p-3.5 font-medium text-sm text-slate-800 outline-none focus:border-blue-400 resize-none"/>
                    <button onClick={handleExpressInterest} disabled={submitting||!interestForm.range}
                      className="w-full py-4 bg-[#0a0f1e] hover:bg-blue-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 shadow-xl flex items-center justify-center gap-2">
                      {submitting ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>}
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
        <div className="fixed inset-0 z-[500] flex items-end md:items-center justify-center p-0 md:p-6 bg-black/75 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl">
            <div className="bg-[#0a0f1e] rounded-t-[2.5rem] p-7">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Pickaxe size={20} className="text-amber-400"/>
                    <h3 className="text-xl font-black text-white">How IFB Venture Exchange Works</h3>
                  </div>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Marketplace · Not a Broker-Dealer</p>
                </div>
                <button onClick={()=>setShowInfo(false)} className="p-2 bg-white/10 border border-white/10 rounded-xl text-white"><X size={16}/></button>
              </div>
            </div>
            <div className="p-6 space-y-1">
              {HOW_IT_WORKS.map(s=>(
                <div key={s.n} className="flex gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-all">
                  <div className="text-2xl shrink-0 mt-0.5">{s.icon}</div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-5 h-5 bg-slate-900 text-white rounded-full text-[10px] font-black flex items-center justify-center shrink-0">{s.n}</span>
                      <p className="font-black text-slate-900 text-sm">{s.title}</p>
                    </div>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">{s.body}</p>
                  </div>
                </div>
              ))}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mt-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-2">IFB Fee Structure</p>
                <div className="space-y-1 text-xs text-amber-800 font-medium">
                  <p>• <strong>Listing fee:</strong> $500–$2,000 one-time (paid by company)</p>
                  <p>• <strong>Success fee:</strong> 3–6% of capital raised at closing</p>
                  <p>• <strong>Annual renewal:</strong> $300–$1,000/yr to keep listing active</p>
                  <p>• <strong>Investor premium access:</strong> $50–$200/month early deal flow</p>
                </div>
              </div>
              <div className="bg-slate-900 rounded-2xl p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Legal Disclaimer</p>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">IFB operates as a capital marketplace and matchmaking platform. We are not a licensed broker-dealer, investment adviser or securities exchange. Nothing on this platform constitutes investment advice or a solicitation to buy or sell securities. All investments carry risk including total loss of capital. IFB does not hold, transmit or manage investor funds.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ─────────────────────────────────────────── */}
      {toast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[600] animate-in slide-in-from-top-8 duration-400">
          <div className={`px-7 py-4 rounded-3xl shadow-2xl border-2 backdrop-blur-2xl flex items-center gap-3 ${toast.type==='success'?'bg-emerald-500/10 border-emerald-400/30 text-emerald-400':'bg-red-500/10 border-red-400/30 text-red-400'}`}>
            <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${toast.type==='success'?'bg-emerald-400':'bg-red-400'}`}/>
            <p className="font-black text-[11px] uppercase tracking-widest">{toast.text}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────
function ExchangeCard({ c, myInterests, onOpen }) {
  const meta = SECTOR_META[c.sector]||SECTOR_META['Mining'];
  const stg  = c.stage ? (STAGE_META[c.stage]||{}) : {};
  const alreadyExpressed = myInterests.has(c.id);

  return (
    <div onClick={()=>onOpen(c)}
      className={`group bg-white rounded-[1.75rem] border border-slate-200 overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex flex-col ${c.is_featured?'ring-2 ring-amber-300':''}`}>
      {/* Sector accent top bar */}
      <div className="h-1" style={{backgroundColor:meta.color}}/>

      <div className="p-5 flex flex-col gap-3.5 flex-1">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-base shrink-0 shadow-sm"
              style={{backgroundColor:c.logo_color||'#3b82f6'}}>
              {c.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[9px] text-slate-400 font-bold">{ticker(c.name)}</span>
                {c.is_featured && <Star size={10} className="text-amber-500 fill-amber-500"/>}
              </div>
              <h3 className="font-black text-slate-900 text-sm leading-tight line-clamp-1">{c.name}</h3>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">{FLAGS[c.country]||'🌍'} {c.country}</p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            {c.ifb_verified && (
              <div className="flex items-center gap-1 text-[9px] font-black text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full mb-1">
                <ShieldCheck size={9}/> Verified
              </div>
            )}
          </div>
        </div>

        {/* Sector + Stage badges */}
        <div className="flex gap-1.5 flex-wrap">
          <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest"
            style={{backgroundColor:meta.light,color:meta.dark}}>
            {meta.emoji} {c.sub_sector||c.sector}
          </span>
          {c.stage && stg.bg && (
            <span className="px-2.5 py-1 rounded-lg text-[9px] font-black flex items-center gap-1"
              style={{backgroundColor:stg.bg,color:stg.text}}>
              <span className="w-1.5 h-1.5 rounded-full" style={{backgroundColor:stg.dot}}/>
              {stg.label||c.stage}
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 font-medium flex-1">
          {c.description}
        </p>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
          <div>
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Capital Raise</p>
            <p className="text-base font-black text-slate-900 leading-none">{fmt(c.raise_amount_usd)}</p>
          </div>
          <div>
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Equity Offered</p>
            <p className="text-sm font-black text-slate-700">{c.equity_offered_pct ? `${c.equity_offered_pct}%` : 'TBD'}</p>
          </div>
          <div>
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Min Ticket</p>
            <p className="text-sm font-black text-slate-700">{fmt(c.min_ticket_usd)}</p>
          </div>
          <div>
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Exchange</p>
            <p className="text-[10px] font-black text-slate-600 line-clamp-1">{c.target_exchange||'IFB VentureX'}</p>
          </div>
        </div>

        {/* CTA */}
        <div className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-center transition-all flex items-center justify-center gap-1.5 ${alreadyExpressed?'bg-emerald-50 text-emerald-700 border border-emerald-200':'bg-slate-900 text-white group-hover:bg-blue-700'}`}>
          {alreadyExpressed ? <><CheckCircle size={11}/> Interest Registered</> : <>View Full Profile <ArrowRight size={11}/></>}
        </div>
      </div>
    </div>
  );
}

function DCell({ label, value, wide=false, accent=false }) {
  return (
    <div className={`bg-slate-50 border border-slate-200 rounded-2xl p-3.5 ${wide?'col-span-2':''}`}>
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className={`text-sm font-black ${accent?'text-blue-700':'text-slate-900'}`}>{value||'—'}</p>
    </div>
  );
}

function Chip({ label, onRemove }) {
  return (
    <span className="flex items-center gap-1 bg-slate-900 text-white px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
      {label}
      <button onClick={e=>{e.stopPropagation();onRemove();}} className="hover:text-red-300 transition-colors"><X size={9}/></button>
    </span>
  );
}
