import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
  TrendingUp, ChevronRight, CheckCircle2, Circle, Loader2,
  Building2, Globe, Zap, BarChart3, ArrowRight, Lock,
  Sparkles, Trophy, Clock, Send, RefreshCw, AlertCircle,
  BarChart2, Users, DollarSign, Target
} from 'lucide-react';

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const SECTORS = [
  { id: 'Tech',            icon: '💻', color: 'blue'   },
  { id: 'Health',          icon: '🏥', color: 'emerald'},
  { id: 'Mining',          icon: '⛏️',  color: 'amber'  },
  { id: 'Agriculture',     icon: '🌱', color: 'green'  },
  { id: 'Energy',          icon: '⚡', color: 'yellow' },
  { id: 'Finance',         icon: '🏦', color: 'indigo' },
  { id: 'Real Estate',     icon: '🏗️',  color: 'orange' },
  { id: 'Manufacturing',   icon: '🏭', color: 'slate'  },
  { id: 'Media',           icon: '📡', color: 'pink'   },
  { id: 'Consumer',        icon: '🛍️',  color: 'violet' },
];

const STAGES = [
  { id: 'applied',        label: 'Applied',         short: '1', color: 'slate'  },
  { id: 'kyc_review',    label: 'KYC Review',       short: '2', color: 'amber'  },
  { id: 'audit',         label: 'Audit',            short: '3', color: 'blue'   },
  { id: 'due_diligence', label: 'Due Diligence',    short: '4', color: 'violet' },
  { id: 'pre_ipo',       label: 'Pre-IPO',          short: '5', color: 'orange' },
  { id: 'listed',        label: 'Listed',           short: '★', color: 'emerald'},
];

const STAGE_ORDER = ['applied','kyc_review','audit','due_diligence','pre_ipo','listed'];

const STAGE_COLORS = {
  applied:        'bg-slate-700 text-slate-300 border-slate-600',
  kyc_review:     'bg-amber-900/40 text-amber-400 border-amber-700/50',
  audit:          'bg-blue-900/40 text-blue-400 border-blue-700/50',
  due_diligence:  'bg-violet-900/40 text-violet-400 border-violet-700/50',
  pre_ipo:        'bg-orange-900/40 text-orange-400 border-orange-700/50',
  listed:         'bg-emerald-900/40 text-emerald-400 border-emerald-700/50',
  rejected:       'bg-red-900/40 text-red-400 border-red-700/50',
};

const fmtUSD = n => n >= 1e9
  ? `$${(n/1e9).toFixed(1)}B`
  : n >= 1e6
  ? `$${(n/1e6).toFixed(1)}M`
  : n >= 1e3
  ? `$${(n/1e3).toFixed(0)}K`
  : `$${n||0}`;

async function askPascaline(company, stage, requirements) {
  const unchecked = requirements.filter(r => !company.checklist?.[r.item_key]);
  const prompt = `You are Pascaline, the IFB (Infinite Future Bank) AI listing agent for the IFB Venture Stock Exchange.

Company: ${company.company_name}
Sector: ${company.sector}
Country: ${company.country}
Annual Revenue: ${fmtUSD(company.annual_revenue)}
Current Stage: ${stage}

Outstanding requirements for this stage:
${unchecked.map(r => `- ${r.label}: ${r.description}`).join('\n')}

Write a concise, professional guidance note (3-5 sentences) that:
1. Acknowledges the company's current stage
2. Clearly explains the 2-3 most critical next steps they need to take
3. Gives an encouraging but realistic assessment
4. Mentions what unlocks the next stage

Respond in plain text, no markdown, no bullet points.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch {
    return null;
  }
}

// ── Application Form ──────────────────────────────────────────────────────────
function ApplyForm({ session, onSuccess }) {
  const [form, setForm] = useState({
    company_name: '', sector: '', country: '', description: '',
    website: '', founded_year: new Date().getFullYear(), team_size: 1,
    annual_revenue: 0, funding_raised: 0,
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setErr('');
    try {
      const { error } = await supabase.from('ifb_ventures').insert({
        ...form,
        user_id: session.user.id,
        annual_revenue: Number(form.annual_revenue),
        funding_raised: Number(form.funding_raised),
        founded_year: Number(form.founded_year),
        team_size: Number(form.team_size),
        stage: 'applied',
        checklist: {},
      });
      if (error) throw error;
      onSuccess();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  const inp = 'w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold text-sm outline-none focus:border-blue-500 transition-colors';
  const lbl = 'block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white mb-1">Apply to IFB Venture Exchange</h2>
        <p className="text-sm text-slate-400">Pascaline will guide you through every stage until your IPO.</p>
      </div>

      {err && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-xl px-4 py-3 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle size={14}/> {err}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={lbl}>Company Name</label>
          <input required className={inp} value={form.company_name} onChange={set('company_name')} placeholder="e.g. AfroSolar Ltd"/>
        </div>
        <div>
          <label className={lbl}>Industry Sector</label>
          <select required className={inp} value={form.sector} onChange={set('sector')}>
            <option value="">Select sector...</option>
            {SECTORS.map(s => <option key={s.id} value={s.id}>{s.icon} {s.id}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Country of Registration</label>
          <input required className={inp} value={form.country} onChange={set('country')} placeholder="e.g. Nigeria"/>
        </div>
        <div>
          <label className={lbl}>Website (optional)</label>
          <input className={inp} value={form.website} onChange={set('website')} placeholder="https://yourcompany.com"/>
        </div>
        <div>
          <label className={lbl}>Founded Year</label>
          <input required type="number" className={inp} value={form.founded_year} onChange={set('founded_year')} min={1900} max={2030}/>
        </div>
        <div>
          <label className={lbl}>Team Size</label>
          <input required type="number" className={inp} value={form.team_size} onChange={set('team_size')} min={1}/>
        </div>
        <div>
          <label className={lbl}>Annual Revenue (USD)</label>
          <input type="number" className={inp} value={form.annual_revenue} onChange={set('annual_revenue')} min={0} placeholder="0"/>
        </div>
        <div>
          <label className={lbl}>Total Funding Raised (USD)</label>
          <input type="number" className={inp} value={form.funding_raised} onChange={set('funding_raised')} min={0} placeholder="0"/>
        </div>
      </div>

      <div>
        <label className={lbl}>Company Description</label>
        <textarea required rows={3} className={inp} value={form.description} onChange={set('description')}
          placeholder="Describe your business model, core product, and target market..."/>
      </div>

      {/* Sector selector visual */}
      <div>
        <label className={lbl}>Quick Sector Select</label>
        <div className="flex flex-wrap gap-2">
          {SECTORS.map(s => (
            <button key={s.id} type="button"
              onClick={() => setForm(f => ({ ...f, sector: s.id }))}
              className={`px-3 py-2 rounded-xl text-xs font-black border transition-all ${
                form.sector === s.id
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'
              }`}>
              {s.icon} {s.id}
            </button>
          ))}
        </div>
      </div>

      <button type="submit" disabled={loading}
        className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg">
        {loading ? <Loader2 size={16} className="animate-spin"/> : <TrendingUp size={16}/>}
        {loading ? 'Submitting Application...' : 'Submit IPO Application'}
      </button>
    </form>
  );
}

// ── Stage Pipeline View ───────────────────────────────────────────────────────
function VentureDetail({ venture, requirements, onRefresh }) {
  const [aiNote, setAiNote] = useState(venture.ai_notes || '');
  const [loadingAI, setLoadingAI] = useState(false);
  const [savingCheck, setSavingCheck] = useState(null);

  const stageReqs = requirements.filter(r => r.stage === venture.stage);
  const stageIdx  = STAGE_ORDER.indexOf(venture.stage);
  const checklist = venture.checklist || {};
  const doneCount = stageReqs.filter(r => checklist[r.item_key]).length;
  const allDone   = doneCount === stageReqs.length && stageReqs.length > 0;

  async function toggleCheck(key) {
    setSavingCheck(key);
    const newChecklist = { ...checklist, [key]: !checklist[key] };
    await supabase.from('ifb_ventures').update({ checklist: newChecklist }).eq('id', venture.id);
    await onRefresh();
    setSavingCheck(null);
  }

  async function generateGuidance() {
    setLoadingAI(true);
    const note = await askPascaline(venture, venture.stage, stageReqs);
    if (note) {
      setAiNote(note);
      await supabase.from('ifb_ventures').update({ ai_notes: note }).eq('id', venture.id);
    }
    setLoadingAI(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{SECTORS.find(s => s.id === venture.sector)?.icon || '🏢'}</span>
              <h2 className="text-2xl font-black text-white">{venture.company_name}</h2>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${STAGE_COLORS[venture.stage] || STAGE_COLORS.applied}`}>
                {STAGES.find(s => s.id === venture.stage)?.label || venture.stage}
              </span>
              <span className="text-slate-500 text-xs">{venture.sector} · {venture.country}</span>
              {venture.ticker_symbol && (
                <span className="px-2 py-1 bg-emerald-900/30 border border-emerald-700/50 text-emerald-400 rounded-lg text-[10px] font-black">
                  ${venture.ticker_symbol}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            {venture.valuation > 0 && (
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold">Valuation</p>
                <p className="text-xl font-black text-white">{fmtUSD(venture.valuation)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          {[
            { label: 'Annual Revenue', value: fmtUSD(venture.annual_revenue), icon: BarChart2 },
            { label: 'Funding Raised', value: fmtUSD(venture.funding_raised), icon: DollarSign },
            { label: 'Team Size',      value: venture.team_size || '—',        icon: Users },
            { label: 'Founded',        value: venture.founded_year || '—',     icon: Clock },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-slate-800/60 rounded-xl p-3">
              <Icon size={12} className="text-slate-500 mb-1"/>
              <p className="text-white font-black text-sm">{value}</p>
              <p className="text-[9px] text-slate-500 uppercase font-bold">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stage Pipeline */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-5">Listing Pipeline</h3>
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {STAGES.map((s, i) => {
            const done    = i < stageIdx;
            const current = i === stageIdx && venture.stage !== 'rejected';
            const locked  = i > stageIdx;
            return (
              <React.Fragment key={s.id}>
                <div className={`flex flex-col items-center min-w-[60px] ${locked ? 'opacity-40' : ''}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs border-2 transition-all ${
                    done    ? 'bg-emerald-500 border-emerald-400 text-white' :
                    current ? 'bg-blue-600 border-blue-400 text-white ring-2 ring-blue-400/40' :
                    'bg-slate-800 border-slate-700 text-slate-500'
                  }`}>
                    {done ? <CheckCircle2 size={16}/> : s.short}
                  </div>
                  <p className="text-[8px] font-black uppercase text-slate-500 mt-1.5 text-center leading-tight">{s.label}</p>
                </div>
                {i < STAGES.length - 1 && (
                  <div className={`flex-1 h-0.5 min-w-[12px] ${i < stageIdx ? 'bg-emerald-500' : 'bg-slate-700'}`}/>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Checklist */}
      {venture.stage !== 'rejected' && stageReqs.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">
                Stage Requirements — {STAGES.find(s => s.id === venture.stage)?.label}
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">{doneCount}/{stageReqs.length} completed</p>
            </div>
            <div className="w-12 h-12 rounded-full border-2 border-slate-700 flex items-center justify-center">
              <span className="text-sm font-black text-white">{Math.round(doneCount/stageReqs.length*100)}%</span>
            </div>
          </div>

          <div className="space-y-3">
            {stageReqs.map(req => {
              const checked = !!checklist[req.item_key];
              return (
                <button key={req.item_key} onClick={() => toggleCheck(req.item_key)} disabled={savingCheck === req.item_key}
                  className={`w-full flex items-start gap-3 p-4 rounded-2xl border transition-all text-left ${
                    checked
                      ? 'bg-emerald-900/20 border-emerald-700/40'
                      : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
                  }`}>
                  {savingCheck === req.item_key
                    ? <Loader2 size={18} className="animate-spin text-blue-400 shrink-0 mt-0.5"/>
                    : checked
                    ? <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5"/>
                    : <Circle size={18} className="text-slate-600 shrink-0 mt-0.5"/>
                  }
                  <div>
                    <p className={`text-sm font-black ${checked ? 'text-emerald-300 line-through' : 'text-white'}`}>{req.label}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{req.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {allDone && (
            <div className="mt-4 bg-emerald-900/20 border border-emerald-700/40 rounded-2xl p-4 flex items-center gap-3">
              <Trophy size={20} className="text-emerald-400 shrink-0"/>
              <p className="text-sm text-emerald-300 font-bold">
                All requirements met! Your IFB Relationship Manager will review and advance your stage within 48 hours.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pascaline AI Guidance */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-blue-400"/>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Pascaline AI Guidance</h3>
          </div>
          <button onClick={generateGuidance} disabled={loadingAI}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900/30 border border-blue-700/50 text-blue-400 text-[10px] font-black uppercase rounded-xl hover:bg-blue-900/50 transition-all disabled:opacity-50">
            {loadingAI ? <Loader2 size={12} className="animate-spin"/> : <RefreshCw size={12}/>}
            {loadingAI ? 'Analyzing...' : 'Get Guidance'}
          </button>
        </div>
        {aiNote ? (
          <p className="text-sm text-slate-300 leading-relaxed">{aiNote}</p>
        ) : (
          <p className="text-sm text-slate-600 italic">Click "Get Guidance" to receive AI-powered coaching from Pascaline on your next steps toward listing.</p>
        )}
      </div>

      {/* Listed company card */}
      {venture.stage === 'listed' && venture.share_price && (
        <div className="bg-gradient-to-br from-emerald-900/30 to-blue-900/20 border border-emerald-700/40 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Trophy size={20} className="text-emerald-400"/>
            <h3 className="text-lg font-black text-white">Trading Live on IFB VSE</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-[9px] text-slate-500 uppercase font-bold">Ticker</p>
              <p className="text-2xl font-black text-emerald-400">${venture.ticker_symbol}</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-500 uppercase font-bold">Share Price</p>
              <p className="text-2xl font-black text-white">${venture.share_price}</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-500 uppercase font-bold">Market Cap</p>
              <p className="text-2xl font-black text-white">{fmtUSD(venture.market_cap)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Public Market Board ───────────────────────────────────────────────────────
function MarketBoard({ listed }) {
  if (!listed.length) {
    return (
      <div className="text-center py-20">
        <TrendingUp size={40} className="text-slate-700 mx-auto mb-4"/>
        <p className="text-slate-500 font-bold">No companies listed yet</p>
        <p className="text-slate-600 text-sm mt-1">Be the first to complete the IFB IPO pipeline.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white">IFB Venture Exchange</h2>
        <p className="text-slate-400 text-sm mt-1">{listed.length} companies listed · Real-time market</p>
      </div>

      {/* By sector */}
      {SECTORS.map(sector => {
        const companies = listed.filter(c => c.sector === sector.id);
        if (!companies.length) return null;
        return (
          <div key={sector.id}>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span>{sector.icon}</span> {sector.id}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {companies.map(c => (
                <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-emerald-700/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-black text-white">{c.company_name}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{c.country}</p>
                    </div>
                    {c.ticker_symbol && (
                      <span className="px-2 py-1 bg-emerald-900/30 border border-emerald-700/50 text-emerald-400 rounded-lg text-[10px] font-black">
                        ${c.ticker_symbol}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <div>
                      <p className="text-[9px] text-slate-600 uppercase">Price</p>
                      <p className="text-sm font-black text-white">${c.share_price || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-600 uppercase">Mkt Cap</p>
                      <p className="text-sm font-black text-white">{c.market_cap ? fmtUSD(c.market_cap) : '—'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-600 uppercase">Revenue</p>
                      <p className="text-sm font-black text-white">{fmtUSD(c.annual_revenue)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function VentureExchange({ session, profile }) {
  const [view, setView]           = useState('market');   // market | apply | my_venture
  const [myVenture, setMyVenture] = useState(null);
  const [listedCos, setListedCos] = useState([]);
  const [requirements, setReqs]   = useState([]);
  const [loading, setLoading]     = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: mine }, { data: listed }, { data: reqs }] = await Promise.all([
      supabase.from('ifb_ventures').select('*').eq('user_id', session.user.id).maybeSingle(),
      supabase.from('ifb_ventures').select('*').eq('stage', 'listed').order('market_cap', { ascending: false }),
      supabase.from('venture_stage_requirements').select('*').order('sort_order'),
    ]);
    setMyVenture(mine || null);
    setListedCos(listed || []);
    setReqs(reqs || []);
    setLoading(false);
  }, [session.user.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (myVenture) setView('my_venture');
  }, [myVenture]);

  const VIEWS = [
    { id: 'market',     label: 'Market Board', icon: BarChart3 },
    { id: 'my_venture', label: 'My Company',   icon: Building2, hide: !myVenture },
    { id: 'apply',      label: 'Apply for IPO',icon: TrendingUp, hide: !!myVenture },
  ].filter(v => !v.hide);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 to-blue-900/10 pointer-events-none"/>
        <div className="relative z-10 flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <TrendingUp size={20} className="text-emerald-400"/>
              </div>
              <h1 className="text-3xl font-black text-white">IFB Venture Exchange</h1>
            </div>
            <p className="text-sm text-slate-400 max-w-lg">
              Apply for a public listing. Pascaline AI guides your company through 6 stages from application to IPO.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-center">
              <p className="text-2xl font-black text-white">{listedCos.length}</p>
              <p className="text-[9px] text-slate-500 uppercase font-bold">Listed</p>
            </div>
            <div className="w-px h-10 bg-slate-700"/>
            <div className="text-center">
              <p className="text-2xl font-black text-emerald-400">{SECTORS.length}</p>
              <p className="text-[9px] text-slate-500 uppercase font-bold">Sectors</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-2xl w-fit">
        {VIEWS.map(v => {
          const Icon = v.icon;
          return (
            <button key={v.id} onClick={() => setView(v.id)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                view === v.id
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}>
              <Icon size={13}/> {v.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-blue-500"/>
        </div>
      ) : (
        <>
          {view === 'market'     && <MarketBoard listed={listedCos}/>}
          {view === 'apply'      && <ApplyForm session={session} onSuccess={() => { load(); setView('my_venture'); }}/>}
          {view === 'my_venture' && myVenture && (
            <VentureDetail venture={myVenture} requirements={requirements} onRefresh={load}/>
          )}
        </>
      )}
    </div>
  );
}
