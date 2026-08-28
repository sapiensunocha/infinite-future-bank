import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
  Sparkles, Target, BarChart3, Globe, Brain, Users, DollarSign,
  Zap, TrendingUp, Star, ChevronRight, Loader2, CheckCircle2,
  ArrowUpRight, Handshake, Lightbulb, Rocket, Activity, Eye,
  MessageSquare, Filter, RefreshCw, Award, PieChart, Info,
  Building2, BadgeCheck, Layers, Search, Plus, X, Send,
  LineChart, Shield, Clock, MapPin, Package, ExternalLink
} from 'lucide-react';

const SECTORS = [
  'FinTech','AgriTech','HealthTech','EdTech','CleanEnergy','Logistics',
  'E-Commerce','AI/ML','Blockchain','Real Estate','InsurTech','FoodTech',
  'BioTech','Gaming','Media','Mobility','PropTech','LegalTech','HRTech','CyberSecurity'
];
const STAGES = ['Pre-Seed','Seed','Series A','Series B','Series C','Growth','Pre-IPO'];
const CATEGORIES = ['SaaS','Marketplace','Hardware','Services','Platform','Consumer App','B2B Tool','API'];
const PRICING_MODELS = ['Subscription','One-time','Freemium','Usage-based','Commission','Enterprise'];

function scoreMatch(company, investor) {
  let score = 0;
  const weights = { sector: 30, stage: 25, geography: 15, ticket: 15, mentorship: 15 };
  if (investor.preferred_sectors?.includes(company.sector)) score += weights.sector;
  else if (investor.preferred_sectors?.some(s => s.includes(company.sector?.split('/')[0]))) score += weights.sector * 0.5;
  if (investor.preferred_stage === company.product_stage || investor.preferred_stage === 'All Stages') score += weights.stage;
  else if (investor.preferred_stage?.includes('Seed') && company.product_stage?.includes('Seed')) score += weights.stage * 0.7;
  if (investor.preferred_geography === 'Global' || investor.preferred_geography === company.country) score += weights.geography;
  else score += weights.geography * 0.4;
  const goal = parseFloat(company.funding_goal || 0);
  const ticket = parseFloat(investor.average_ticket_size || 0);
  if (goal > 0 && ticket > 0) {
    const ratio = ticket / goal;
    if (ratio >= 0.1 && ratio <= 2) score += weights.ticket;
    else if (ratio < 0.1) score += weights.ticket * 0.3;
  } else score += weights.ticket * 0.5;
  const compAreas = company.mentorship_areas || [];
  const invAreas = investor.offered_mentorship_areas || [];
  if (investor.provides_mentorship && invAreas.some(a => compAreas.includes(a))) score += weights.mentorship;
  else if (investor.provides_mentorship) score += weights.mentorship * 0.5;
  return Math.min(Math.round(score), 100);
}

function MatchCard({ investor, profile, score, onInterest }) {
  const tier = score >= 80 ? 'Strong' : score >= 60 ? 'Good' : 'Partial';
  const tierColor = { Strong: 'text-emerald-400 bg-emerald-900/40 border-emerald-700', Good: 'text-blue-400 bg-blue-900/40 border-blue-700', Partial: 'text-slate-400 bg-slate-800 border-slate-700' }[tier];
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-3xl p-6 flex flex-col gap-4 hover:border-slate-600 transition-all group">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-lg">
            {(investor.fund_name || investor.profiles?.full_name || 'I')[0]}
          </div>
          <div>
            <p className="font-black text-white">{investor.fund_name || investor.profiles?.full_name || 'Anonymous Investor'}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{investor.investor_type}</p>
          </div>
        </div>
        <div className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${tierColor}`}>
          {tier} · {score}%
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Ticket', val: investor.average_ticket_size ? `$${(investor.average_ticket_size/1000).toFixed(0)}K` : 'N/A' },
          { label: 'Deals Done', val: investor.deals_funded || investor.number_of_investments || 0 },
          { label: 'Focus', val: investor.preferred_sectors?.slice(0,2).join(', ') || 'Diversified' },
          { label: 'Geography', val: investor.preferred_geography || 'Global' },
        ].map(({ label, val }) => (
          <div key={label} className="bg-slate-900/50 rounded-xl p-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">{label}</p>
            <p className="text-xs font-black text-white truncate">{val}</p>
          </div>
        ))}
      </div>

      {investor.provides_mentorship && (
        <div className="flex flex-wrap gap-1.5">
          {(investor.offered_mentorship_areas || []).slice(0, 3).map(area => (
            <span key={area} className="bg-purple-900/40 border border-purple-700/40 text-purple-300 text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-wider">{area}</span>
          ))}
          {investor.provides_mentorship && <span className="bg-emerald-900/30 border border-emerald-700/30 text-emerald-400 text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-wider">Offers Mentorship</span>}
        </div>
      )}

      {investor.bio && <p className="text-xs text-slate-400 line-clamp-2">{investor.bio}</p>}

      <button onClick={() => onInterest(investor)}
        className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-all group-hover:shadow-lg group-hover:shadow-blue-900/30">
        <Handshake size={14}/> Express Interest
      </button>
    </div>
  );
}

export default function VentureXMatchmaker({ session, profile, balances }) {
  const [tab, setTab] = useState('match');
  const [myCompany, setMyCompany] = useState(null);
  const [investors, setInvestors] = useState([]);
  const [matches, setMatches] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [sectorData, setSectorData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [interestSent, setInterestSent] = useState(null);

  // Match filter
  const [matchType, setMatchType] = useState('all'); // all | investor | mentor

  // Product form
  const [productForm, setProductForm] = useState({
    product_name: '', tagline: '', description: '', category: '',
    target_market: '', usp: '', pricing_model: '', price_range: '',
    launch_status: 'idea', demo_url: ''
  });
  const [savingProduct, setSavingProduct] = useState(false);
  const [productSaved, setProductSaved] = useState(false);

  // Market intel
  const [intelSector, setIntelSector] = useState('FinTech');
  const [intelData, setIntelData] = useState(null);
  const [loadingIntel, setLoadingIntel] = useState(false);

  const loadCompanyAndInvestors = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const [compRes, invRes, listRes] = await Promise.all([
        supabase.from('venturex_companies').select('*').eq('user_id', session.user.id).eq('status', 'active').maybeSingle(),
        supabase.from('venturex_investors').select('*, profiles(full_name, avatar_url)').eq('is_active', true).limit(30),
        supabase.from('venturex_product_listings').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
      ]);
      if (compRes.data) {
        setMyCompany(compRes.data);
        const invList = invRes.data || [];
        setInvestors(invList);
        const scored = invList
          .map(inv => ({ ...inv, calcScore: scoreMatch(compRes.data, inv) }))
          .filter(inv => {
            if (matchType === 'investor') return !inv.provides_mentorship;
            if (matchType === 'mentor') return inv.provides_mentorship;
            return true;
          })
          .sort((a, b) => b.calcScore - a.calcScore);
        setMatches(scored);
      } else {
        setMatches([]);
      }
      setMyListings(listRes.data || []);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, matchType]);

  useEffect(() => { loadCompanyAndInvestors(); }, [loadCompanyAndInvestors]);

  const loadMarketIntel = async (sector) => {
    setLoadingIntel(true);
    try {
      const { data } = await supabase
        .from('venturex_companies')
        .select('sector,product_stage,funding_goal,valuation,monthly_revenue,active_users,tam,investment_readiness_score')
        .eq('sector', sector)
        .eq('status', 'active')
        .limit(100);
      if (data && data.length > 0) {
        const avgFunding = data.reduce((s, c) => s + parseFloat(c.funding_goal || 0), 0) / data.length;
        const avgValuation = data.reduce((s, c) => s + parseFloat(c.valuation || 0), 0) / data.length;
        const avgRevenue = data.reduce((s, c) => s + parseFloat(c.monthly_revenue || 0), 0) / data.length;
        const stages = {};
        data.forEach(c => { stages[c.product_stage || 'Unknown'] = (stages[c.product_stage || 'Unknown'] || 0) + 1; });
        setSectorData(data);
        setIntelData({ count: data.length, avgFunding, avgValuation, avgRevenue, stages, sector });
      } else {
        setIntelData({ count: 0, avgFunding: 0, avgValuation: 0, avgRevenue: 0, stages: {}, sector });
      }
    } finally {
      setLoadingIntel(false);
    }
  };

  useEffect(() => { if (tab === 'intel') loadMarketIntel(intelSector); }, [tab, intelSector]);

  const handleExpressInterest = async (investor) => {
    try {
      await supabase.from('venturex_notifications').insert([{
        user_id: investor.user_id,
        type: 'match_interest',
        title: 'New Match Interest',
        message: `${profile?.full_name || 'An entrepreneur'} expressed interest in connecting with you on VentureX.`,
        metadata: { from_user_id: session.user.id, company_id: myCompany?.id }
      }]);
      await supabase.from('venturex_matches').upsert([{
        company_id: myCompany?.id,
        investor_id: investor.id,
        match_score: investor.calcScore,
        status: 'interested'
      }], { onConflict: 'company_id,investor_id' });
      setInterestSent(investor.id);
      setTimeout(() => setInterestSent(null), 3000);
    } catch { /* silent */ }
  };

  const handleSaveProduct = async () => {
    if (!productForm.product_name.trim()) return;
    setSavingProduct(true);
    try {
      const pitchBullets = [
        productForm.usp && `✦ ${productForm.usp}`,
        productForm.target_market && `✦ Target: ${productForm.target_market}`,
        productForm.pricing_model && `✦ Model: ${productForm.pricing_model}`,
        productForm.price_range && `✦ Pricing: ${productForm.price_range}`,
      ].filter(Boolean);

      await supabase.from('venturex_product_listings').insert([{
        user_id: session.user.id,
        company_id: myCompany?.id,
        ...productForm,
        pitch_bullets: pitchBullets,
        is_public: true,
      }]);
      setProductSaved(true);
      setProductForm({ product_name: '', tagline: '', description: '', category: '', target_market: '', usp: '', pricing_model: '', price_range: '', launch_status: 'idea', demo_url: '' });
      await loadCompanyAndInvestors();
      setTimeout(() => setProductSaved(false), 4000);
    } finally {
      setSavingProduct(false);
    }
  };

  const fmtUSD = (n) => n >= 1e6 ? `$${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n/1e3).toFixed(0)}K` : `$${n.toFixed(0)}`;

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 md:p-12 border-b border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-600/10 via-transparent to-purple-600/10 pointer-events-none"></div>
        <div className="relative z-10 max-w-4xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-900/40">
              <Brain size={20} className="text-white"/>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-900/30 border border-blue-800/50 px-3 py-1.5 rounded-full">VentureX AI Engine</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3">AI Matchmaker <span className="text-blue-400">&</span> Growth Studio</h1>
          <p className="text-slate-400 font-medium max-w-2xl">Match with investors and mentors, design your product listing, track performance, and analyze your competitive landscape — all in one place.</p>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur border-b border-slate-800">
        <div className="flex overflow-x-auto no-scrollbar">
          {[
            { id: 'match', label: 'AI Matchmaker', icon: Brain },
            { id: 'studio', label: 'Product Studio', icon: Package },
            { id: 'metrics', label: 'My Metrics', icon: BarChart3 },
            { id: 'intel', label: 'Market Intel', icon: Globe },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-6 py-4 whitespace-nowrap text-[11px] font-black uppercase tracking-widest border-b-2 transition-all ${tab === id ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
              <Icon size={14}/>{label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 md:p-10 max-w-7xl mx-auto">

        {/* ─── AI MATCHMAKER ─── */}
        {tab === 'match' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {!myCompany ? (
              <div className="text-center py-20 space-y-4">
                <div className="w-20 h-20 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto"><Rocket size={36} className="text-slate-500"/></div>
                <h3 className="text-xl font-black text-white">No Active Company Listing Found</h3>
                <p className="text-slate-400 max-w-md mx-auto text-sm">List your company on VentureX first via the Franchise Hub to unlock AI Matching.</p>
              </div>
            ) : (
              <>
                {/* Company summary + filter */}
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  <div className="flex items-center gap-4 bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-lg">
                      {(myCompany.legal_name || 'C')[0]}
                    </div>
                    <div>
                      <p className="font-black text-white">{myCompany.legal_name}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest">{myCompany.sector} · {myCompany.product_stage}</p>
                    </div>
                    <div className="ml-4 text-right">
                      <p className="text-[9px] text-slate-500 uppercase">Readiness</p>
                      <p className="font-black text-emerald-400">{myCompany.investment_readiness_score || 0}%</p>
                    </div>
                  </div>
                  <div className="flex gap-2 bg-slate-900 p-1 rounded-2xl">
                    {[{ id: 'all', label: 'All' }, { id: 'investor', label: 'Investors' }, { id: 'mentor', label: 'Mentors' }].map(({ id, label }) => (
                      <button key={id} onClick={() => setMatchType(id)}
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${matchType === id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Match stats bar */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Total Matches', val: matches.length, color: 'text-white' },
                    { label: 'Strong Match (80%+)', val: matches.filter(m => m.calcScore >= 80).length, color: 'text-emerald-400' },
                    { label: 'Mentors Available', val: matches.filter(m => m.provides_mentorship).length, color: 'text-purple-400' },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 text-center">
                      <p className={`text-3xl font-black ${color}`}>{val}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">{label}</p>
                    </div>
                  ))}
                </div>

                {loading ? (
                  <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={32}/></div>
                ) : matches.length === 0 ? (
                  <div className="text-center py-16 text-slate-500 font-bold">No matches found. Try adjusting filters.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {matches.map(investor => (
                      <div key={investor.id} className="relative">
                        {interestSent === investor.id && (
                          <div className="absolute inset-0 z-10 bg-emerald-900/90 rounded-3xl flex items-center justify-center animate-in fade-in">
                            <div className="text-center">
                              <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-2"/>
                              <p className="font-black text-emerald-300 text-sm">Interest Sent!</p>
                            </div>
                          </div>
                        )}
                        <MatchCard investor={investor} profile={profile} score={investor.calcScore} onInterest={handleExpressInterest}/>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ─── PRODUCT STUDIO ─── */}
        {tab === 'studio' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Form */}
              <div className="lg:col-span-3 space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-white mb-1">Design Your Product Listing</h2>
                  <p className="text-slate-400 text-sm">Create a compelling listing to attract investors, partners, and customers on the global VentureX platform.</p>
                </div>

                {productSaved && (
                  <div className="bg-emerald-900/30 border border-emerald-700/40 rounded-2xl p-4 flex items-center gap-3">
                    <CheckCircle2 size={18} className="text-emerald-400"/>
                    <p className="font-black text-emerald-300 text-sm">Product listed publicly on VentureX Global Platform!</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Product / Company Name *</label>
                      <input value={productForm.product_name} onChange={e => setProductForm(p => ({...p, product_name: e.target.value}))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold text-sm outline-none focus:border-blue-500 transition-colors"
                        placeholder="e.g. PayFlow AI"/>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Category</label>
                      <select value={productForm.category} onChange={e => setProductForm(p => ({...p, category: e.target.value}))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold text-sm outline-none focus:border-blue-500 transition-colors">
                        <option value="">Select category</option>
                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Tagline</label>
                    <input value={productForm.tagline} onChange={e => setProductForm(p => ({...p, tagline: e.target.value}))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold text-sm outline-none focus:border-blue-500 transition-colors"
                      placeholder="One sentence that captures what you do"/>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Description</label>
                    <textarea value={productForm.description} onChange={e => setProductForm(p => ({...p, description: e.target.value}))}
                      rows={4} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold text-sm outline-none focus:border-blue-500 transition-colors resize-none"
                      placeholder="What problem does it solve? Who is it for? What makes it different?"/>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Target Market</label>
                      <input value={productForm.target_market} onChange={e => setProductForm(p => ({...p, target_market: e.target.value}))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold text-sm outline-none focus:border-blue-500 transition-colors"
                        placeholder="e.g. SMEs in Sub-Saharan Africa"/>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Unique Value Proposition</label>
                      <input value={productForm.usp} onChange={e => setProductForm(p => ({...p, usp: e.target.value}))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold text-sm outline-none focus:border-blue-500 transition-colors"
                        placeholder="What no one else offers"/>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Pricing Model</label>
                      <select value={productForm.pricing_model} onChange={e => setProductForm(p => ({...p, pricing_model: e.target.value}))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold text-sm outline-none focus:border-blue-500 transition-colors">
                        <option value="">Select</option>
                        {PRICING_MODELS.map(m => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Price Range</label>
                      <input value={productForm.price_range} onChange={e => setProductForm(p => ({...p, price_range: e.target.value}))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold text-sm outline-none focus:border-blue-500 transition-colors"
                        placeholder="e.g. $29–$299/mo"/>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Launch Status</label>
                      <select value={productForm.launch_status} onChange={e => setProductForm(p => ({...p, launch_status: e.target.value}))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold text-sm outline-none focus:border-blue-500 transition-colors">
                        {['idea','beta','live','scaling'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Demo / Website URL</label>
                    <input value={productForm.demo_url} onChange={e => setProductForm(p => ({...p, demo_url: e.target.value}))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold text-sm outline-none focus:border-blue-500 transition-colors"
                      placeholder="https://"/>
                  </div>

                  <button onClick={handleSaveProduct} disabled={!productForm.product_name.trim() || savingProduct}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 text-white font-black text-sm uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/30">
                    {savingProduct ? <><Loader2 size={16} className="animate-spin"/>Publishing...</> : <><Globe size={16}/>Publish to VentureX Global Platform</>}
                  </button>
                </div>
              </div>

              {/* Right: existing listings + preview */}
              <div className="lg:col-span-2 space-y-6">
                {/* Live Preview */}
                {productForm.product_name && (
                  <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-3xl p-6 space-y-4 animate-in fade-in">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Live Preview</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-black text-white">
                        {productForm.product_name[0] || '?'}
                      </div>
                      <div>
                        <p className="font-black text-white">{productForm.product_name}</p>
                        {productForm.category && <p className="text-[10px] text-blue-400 uppercase tracking-widest">{productForm.category}</p>}
                      </div>
                      <span className={`ml-auto text-[9px] font-black uppercase px-2 py-1 rounded-full ${productForm.launch_status === 'live' || productForm.launch_status === 'scaling' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                        {productForm.launch_status}
                      </span>
                    </div>
                    {productForm.tagline && <p className="text-sm text-slate-300 font-medium italic">"{productForm.tagline}"</p>}
                    {productForm.usp && <div className="bg-blue-900/20 border border-blue-800/30 rounded-xl p-3"><p className="text-xs text-blue-300">✦ {productForm.usp}</p></div>}
                    {productForm.pricing_model && (
                      <div className="flex gap-2 flex-wrap">
                        <span className="bg-slate-700 text-slate-300 text-[9px] font-black px-2 py-1 rounded-full uppercase">{productForm.pricing_model}</span>
                        {productForm.price_range && <span className="bg-emerald-900/40 text-emerald-400 text-[9px] font-black px-2 py-1 rounded-full uppercase">{productForm.price_range}</span>}
                      </div>
                    )}
                  </div>
                )}

                {/* My published listings */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">My Published Listings ({myListings.length})</p>
                  <div className="space-y-3">
                    {myListings.length === 0 ? (
                      <p className="text-slate-600 text-sm text-center py-6">No listings yet. Publish your first product above.</p>
                    ) : myListings.map(listing => (
                      <div key={listing.id} className="bg-slate-800/60 border border-slate-700/40 rounded-2xl p-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-black text-white text-sm">{listing.product_name}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest">{listing.category} · {listing.launch_status}</p>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                          <div><p className="text-xs font-black text-white">{listing.views}</p><p className="text-[9px] text-slate-500 uppercase">Views</p></div>
                          <div><p className="text-xs font-black text-white">{listing.inquiries}</p><p className="text-[9px] text-slate-500 uppercase">Inquiries</p></div>
                          {listing.is_public && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── METRICS ─── */}
        {tab === 'metrics' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div>
              <h2 className="text-2xl font-black text-white mb-1">My Platform Metrics</h2>
              <p className="text-slate-400 text-sm">Track how your company and product listings are performing across the VentureX network.</p>
            </div>

            {/* Overall KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Investor Matches', val: matches.length, icon: Handshake, color: 'text-blue-400', bg: 'bg-blue-900/20' },
                { label: 'Product Listings', val: myListings.length, icon: Package, color: 'text-indigo-400', bg: 'bg-indigo-900/20' },
                { label: 'Total Views', val: myListings.reduce((s, l) => s + l.views, 0), icon: Eye, color: 'text-purple-400', bg: 'bg-purple-900/20' },
                { label: 'Inquiries', val: myListings.reduce((s, l) => s + l.inquiries, 0), icon: MessageSquare, color: 'text-emerald-400', bg: 'bg-emerald-900/20' },
              ].map(({ label, val, icon: Icon, color, bg }) => (
                <div key={label} className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
                  <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}><Icon size={18} className={color}/></div>
                  <p className="text-3xl font-black text-white">{val}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Match quality breakdown */}
            {matches.length > 0 && (
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-3xl p-8">
                <h3 className="font-black text-white mb-6 flex items-center gap-2"><BarChart3 size={16} className="text-blue-400"/> Match Quality Distribution</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Strong (80–100%)', count: matches.filter(m => m.calcScore >= 80).length, color: 'bg-emerald-500' },
                    { label: 'Good (60–79%)', count: matches.filter(m => m.calcScore >= 60 && m.calcScore < 80).length, color: 'bg-blue-500' },
                    { label: 'Partial (<60%)', count: matches.filter(m => m.calcScore < 60).length, color: 'bg-slate-500' },
                  ].map(({ label, count, color }) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs font-black text-slate-400 mb-1.5">
                        <span>{label}</span>
                        <span className="text-white">{count}</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
                        <div className={`${color} h-full rounded-full transition-all duration-700`} style={{ width: `${matches.length ? (count/matches.length)*100 : 0}%` }}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Company readiness */}
            {myCompany && (
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-3xl p-8">
                <h3 className="font-black text-white mb-6 flex items-center gap-2"><Award size={16} className="text-amber-400"/> {myCompany.legal_name} — Investment Readiness</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Readiness Score', val: `${myCompany.investment_readiness_score || 0}%`, ok: myCompany.investment_readiness_score >= 60 },
                    { label: 'Monthly Revenue', val: myCompany.monthly_revenue ? fmtUSD(myCompany.monthly_revenue) : 'N/A', ok: !!myCompany.monthly_revenue },
                    { label: 'Funding Goal', val: myCompany.funding_goal ? fmtUSD(myCompany.funding_goal) : 'N/A', ok: !!myCompany.funding_goal },
                    { label: 'Active Users', val: myCompany.active_users?.toLocaleString() || 'N/A', ok: !!myCompany.active_users },
                    { label: 'Runway', val: myCompany.runway_months ? `${myCompany.runway_months}mo` : 'N/A', ok: myCompany.runway_months >= 12 },
                    { label: 'Valuation', val: myCompany.valuation ? fmtUSD(myCompany.valuation) : 'N/A', ok: !!myCompany.valuation },
                  ].map(({ label, val, ok }) => (
                    <div key={label} className={`rounded-2xl p-4 border ${ok ? 'border-emerald-700/30 bg-emerald-900/10' : 'border-slate-700/30 bg-slate-800/40'}`}>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">{label}</p>
                      <p className={`font-black text-lg ${ok ? 'text-emerald-400' : 'text-slate-400'}`}>{val}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Listing performance table */}
            {myListings.length > 0 && (
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-slate-700/50">
                  <h3 className="font-black text-white flex items-center gap-2"><Globe size={16} className="text-blue-400"/> Product Listing Performance</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b border-slate-700/50">
                      {['Product', 'Category', 'Status', 'Views', 'Inquiries', 'Matches', 'Published'].map(h => (
                        <th key={h} className="p-4 text-left text-[9px] font-black uppercase tracking-widest text-slate-500">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {myListings.map((l, i) => (
                        <tr key={l.id} className={`border-b border-slate-800 hover:bg-slate-800/40 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-900/20'}`}>
                          <td className="p-4 font-black text-white text-sm">{l.product_name}</td>
                          <td className="p-4 text-xs text-slate-400 font-bold">{l.category || '—'}</td>
                          <td className="p-4"><span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${l.is_public ? 'bg-emerald-900/40 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>{l.is_public ? 'Live' : 'Draft'}</span></td>
                          <td className="p-4 font-black text-white">{l.views}</td>
                          <td className="p-4 font-black text-white">{l.inquiries}</td>
                          <td className="p-4 font-black text-white">{l.matches}</td>
                          <td className="p-4 text-xs text-slate-500">{new Date(l.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── MARKET INTEL ─── */}
        {tab === 'intel' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white mb-1">Market Intelligence</h2>
                <p className="text-slate-400 text-sm">Competitive landscape, sector funding trends, and valuation benchmarks across VentureX.</p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sector</label>
                <select value={intelSector} onChange={e => { setIntelSector(e.target.value); }}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-bold text-sm outline-none focus:border-blue-500 transition-colors">
                  {SECTORS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {loadingIntel ? (
              <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={32}/></div>
            ) : intelData ? (
              <>
                {/* Sector KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Companies Listed', val: intelData.count, suffix: '', icon: Building2, color: 'text-blue-400' },
                    { label: 'Avg Funding Goal', val: fmtUSD(intelData.avgFunding), suffix: '', icon: DollarSign, color: 'text-emerald-400' },
                    { label: 'Avg Valuation', val: fmtUSD(intelData.avgValuation), suffix: '', icon: TrendingUp, color: 'text-purple-400' },
                    { label: 'Avg Monthly Revenue', val: fmtUSD(intelData.avgRevenue), suffix: '', icon: LineChart, color: 'text-amber-400' },
                  ].map(({ label, val, icon: Icon, color }) => (
                    <div key={label} className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
                      <Icon size={18} className={`${color} mb-3`}/>
                      <p className="text-2xl font-black text-white">{val}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">{label}</p>
                      <p className="text-[9px] text-slate-600 uppercase mt-0.5">{intelSector}</p>
                    </div>
                  ))}
                </div>

                {/* Stage breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-800/60 border border-slate-700/50 rounded-3xl p-8">
                    <h3 className="font-black text-white mb-6 flex items-center gap-2"><PieChart size={16} className="text-blue-400"/> Stage Distribution in {intelSector}</h3>
                    <div className="space-y-3">
                      {Object.entries(intelData.stages).sort((a, b) => b[1] - a[1]).map(([stage, count]) => (
                        <div key={stage}>
                          <div className="flex justify-between text-xs font-black text-slate-400 mb-1">
                            <span>{stage}</span>
                            <span className="text-white">{count} co. ({intelData.count ? Math.round(count/intelData.count*100) : 0}%)</span>
                          </div>
                          <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full" style={{ width: `${intelData.count ? count/intelData.count*100 : 0}%` }}/>
                          </div>
                        </div>
                      ))}
                      {Object.keys(intelData.stages).length === 0 && <p className="text-slate-600 text-sm">No companies listed in this sector yet.</p>}
                    </div>
                  </div>

                  {/* Competitive companies */}
                  <div className="bg-slate-800/60 border border-slate-700/50 rounded-3xl p-8">
                    <h3 className="font-black text-white mb-6 flex items-center gap-2"><Activity size={16} className="text-emerald-400"/> Top Companies in {intelSector}</h3>
                    <div className="space-y-3">
                      {sectorData.slice(0, 6).map((company, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-slate-600 w-4">{i+1}</span>
                            <div>
                              <p className="font-black text-white text-xs">{company.sector}</p>
                              <p className="text-[9px] text-slate-500 uppercase">{company.product_stage}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black text-emerald-400">{company.investment_readiness_score || 0}%</p>
                            <p className="text-[9px] text-slate-500 uppercase">Readiness</p>
                          </div>
                        </div>
                      ))}
                      {sectorData.length === 0 && <p className="text-slate-600 text-sm">No data available for this sector.</p>}
                    </div>
                  </div>
                </div>

                {/* Competitive positioning */}
                {myCompany && myCompany.sector === intelSector && intelData.count > 0 && (
                  <div className="bg-gradient-to-br from-indigo-950 to-slate-900 border border-indigo-800/40 rounded-3xl p-8">
                    <h3 className="font-black text-white mb-2 flex items-center gap-2"><Target size={16} className="text-indigo-400"/> Your Position in {intelSector}</h3>
                    <p className="text-slate-400 text-sm mb-6">How {myCompany.legal_name} compares to other companies in your sector.</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {[
                        { label: 'Your Readiness vs Avg', your: myCompany.investment_readiness_score || 0, avg: Math.round(sectorData.reduce((s,c) => s+(c.investment_readiness_score||0),0)/intelData.count), unit: '%' },
                        { label: 'Your Revenue vs Avg', your: parseFloat(myCompany.monthly_revenue||0), avg: intelData.avgRevenue, unit: '$', fmt: true },
                        { label: 'Your Valuation vs Avg', your: parseFloat(myCompany.valuation||0), avg: intelData.avgValuation, unit: '$', fmt: true },
                      ].map(({ label, your, avg, unit, fmt }) => (
                        <div key={label} className="bg-slate-900/50 rounded-2xl p-5">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-3">{label}</p>
                          <div className="flex items-end gap-3">
                            <div><p className="text-xl font-black text-indigo-400">{fmt ? fmtUSD(your) : your}{!fmt ? unit : ''}</p><p className="text-[9px] text-slate-500 uppercase">You</p></div>
                            <div className="text-slate-600 font-black text-sm mb-1">vs</div>
                            <div><p className="text-xl font-black text-slate-400">{fmt ? fmtUSD(avg) : avg}{!fmt ? unit : ''}</p><p className="text-[9px] text-slate-500 uppercase">Sector Avg</p></div>
                          </div>
                          <div className="mt-3">
                            {your >= avg
                              ? <span className="text-[9px] font-black text-emerald-400 bg-emerald-900/30 px-2 py-1 rounded-full uppercase">Above Average ↑</span>
                              : <span className="text-[9px] font-black text-amber-400 bg-amber-900/30 px-2 py-1 rounded-full uppercase">Below Average ↓</span>
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
