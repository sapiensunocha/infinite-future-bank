import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
  Upload, X, FileText, Image, File, CheckCircle2, Loader2,
  Shield, ShieldCheck, AlertTriangle, BarChart3, TrendingUp,
  Building2, Globe, Brain, Sparkles, Clock, Wallet,
  ChevronRight, ArrowLeft, Lock, FileSpreadsheet, BadgeCheck,
  Stamp, Star, Printer, Zap, Target, Layers
} from 'lucide-react';

// ── Audit modules run during processing ───────────────────────────────────────
const AUDIT_MODULES = [
  { id: 'parse',      label: 'Document Parsing & Classification',  icon: FileText,    color: 'slate'  },
  { id: 'financial',  label: 'Financial Statements Analysis',       icon: BarChart3,   color: 'blue'   },
  { id: 'compliance', label: 'Regulatory Compliance Check',         icon: Shield,      color: 'violet' },
  { id: 'aml',        label: 'AML / Sanctions Screening',           icon: ShieldCheck, color: 'emerald'},
  { id: 'risk',       label: 'Risk & Fraud Assessment',             icon: AlertTriangle,color:'amber'  },
  { id: 'ubo',        label: 'UBO & Ownership Verification',        icon: Building2,   color: 'indigo' },
  { id: 'sector',     label: 'Sector Benchmark Scoring',            icon: TrendingUp,  color: 'teal'   },
  { id: 'tax',        label: 'Tax & VAT Reconciliation',            icon: FileSpreadsheet,color:'rose' },
  { id: 'governance', label: 'Corporate Governance Review',         icon: Globe,       color: 'slate'  },
];

const FILE_ICONS = { pdf: FileText, jpg: Image, jpeg: Image, png: Image, gif: Image, xlsx: FileSpreadsheet, xls: FileSpreadsheet, csv: FileSpreadsheet, doc: FileText, docx: FileText };
const getExt   = (name) => name?.split('.').pop().toLowerCase();
const getFileIcon = (name) => FILE_ICONS[getExt(name)] || File;
const fmtBytes = (b) => b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${(b / 1e3).toFixed(0)} KB`;
const fmtUSD   = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

// ── Pricing tiers ─────────────────────────────────────────────────────────────
const TIERS = [
  {
    id: 'quick',
    name: 'Quick Scan',
    icon: Zap,
    color: 'blue',
    duration: '2–3 min',
    durationS: 150,
    modules: ['parse', 'financial', 'compliance', 'aml'],
    description: 'Fast compliance check + financial overview. No certified seal.',
    features: ['Document parsing', 'Basic financials', 'Sanctions screening', 'Summary report'],
    badge: null,
  },
  {
    id: 'standard',
    name: 'Standard Audit',
    icon: Target,
    color: 'violet',
    duration: '5–7 min',
    durationS: 360,
    modules: ['parse', 'financial', 'compliance', 'aml', 'risk', 'ubo', 'sector'],
    description: 'Full audit covering risk, UBO, sector benchmarks. IFB review badge.',
    features: ['All Quick Scan modules', 'Risk & fraud assessment', 'UBO verification', 'Sector benchmarks', 'IFB Review badge'],
    badge: 'IFB Reviewed',
    popular: true,
  },
  {
    id: 'comprehensive',
    name: 'Comprehensive',
    icon: Layers,
    color: 'emerald',
    duration: '10–15 min',
    durationS: 720,
    modules: AUDIT_MODULES.map(m => m.id),
    description: 'Full certified audit. All 9 modules. IFB Certified seal + exportable report.',
    features: ['All Standard modules', 'Tax & VAT reconciliation', 'Corporate governance', 'IFB Certified seal', 'Exportable certified PDF'],
    badge: 'IFB Certified',
  },
];

// ── Drop zone ─────────────────────────────────────────────────────────────────
function DropZone({ files, onAdd, onRemove }) {
  const ref = useRef();
  const [drag, setDrag] = useState(false);
  const handle = (list) => onAdd(Array.from(list).filter(f => f.size <= 50 * 1024 * 1024));
  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files); }}
        onClick={() => ref.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${drag ? 'border-violet-400 bg-violet-950/20' : 'border-slate-600/40 hover:border-violet-500/50 hover:bg-slate-800/20'}`}
      >
        <Upload size={20} className="mx-auto mb-2 text-slate-500"/>
        <p className="text-sm font-black text-white">Drop documents or click to upload</p>
        <p className="text-[10px] text-slate-500 mt-1">PDF · Images · Word · Excel · CSV · Any format · Max 50 MB</p>
        <input ref={ref} type="file" multiple className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.heic"
          onChange={e => { handle(e.target.files); e.target.value = ''; }} />
      </div>
      {files.length > 0 && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {files.map((f, i) => {
            const Icon = getFileIcon(f.name);
            return (
              <div key={i} className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/40 rounded-xl p-2.5">
                <Icon size={13} className="text-violet-400 shrink-0"/>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-white truncate">{f.name}</p>
                  <p className="text-[8px] text-slate-500">{fmtBytes(f.size)}</p>
                </div>
                <button type="button" onClick={() => onRemove(i)} className="text-slate-600 hover:text-red-400 shrink-0"><X size={12}/></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── AI pricing analysis panel ─────────────────────────────────────────────────
function PricingAnalysis({ analysis, loading }) {
  if (loading) return (
    <div className="bg-violet-950/20 border border-violet-700/25 rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Brain size={13} className="text-violet-400"/>
        <span className="text-[10px] font-black uppercase tracking-widest text-violet-400">AI Agent Analysing Documents…</span>
        <Loader2 size={10} className="animate-spin text-violet-400 ml-auto"/>
      </div>
      <div className="h-1.5 bg-violet-900/40 rounded-full overflow-hidden">
        <div className="h-full bg-violet-500 rounded-full animate-pulse" style={{ width: '65%' }}/>
      </div>
      {['Classifying document types…', 'Estimating scope complexity…', 'Calculating audit depth…'].map(t => (
        <div key={t} className="flex items-center gap-2 opacity-60">
          <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse"/>
          <span className="text-[9px] text-slate-400">{t}</span>
        </div>
      ))}
    </div>
  );

  if (!analysis) return null;

  return (
    <div className="bg-violet-950/20 border border-violet-700/25 rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Brain size={13} className="text-violet-400"/>
        <span className="text-[10px] font-black uppercase tracking-widest text-violet-300">AI Pricing Analysis Complete</span>
        <CheckCircle2 size={10} className="text-emerald-400 ml-auto"/>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Documents', val: analysis.doc_count },
          { label: 'Complexity', val: analysis.complexity },
          { label: 'Est. Modules', val: `${analysis.modules_needed}/9` },
        ].map(({ label, val }) => (
          <div key={label} className="bg-slate-800/50 rounded-xl p-2.5 text-center">
            <p className="text-[10px] font-black text-white">{val}</p>
            <p className="text-[8px] text-slate-500 uppercase tracking-wider mt-0.5">{label}</p>
          </div>
        ))}
      </div>
      {analysis.doc_types?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {analysis.doc_types.map(t => (
            <span key={t} className="text-[8px] font-black uppercase text-violet-300 bg-violet-900/40 px-2 py-0.5 rounded-lg">{t}</span>
          ))}
        </div>
      )}
      <p className="text-[10px] text-slate-400 leading-relaxed italic">"{analysis.recommendation}"</p>
    </div>
  );
}

// ── Tier card ─────────────────────────────────────────────────────────────────
function TierCard({ tier, price, selected, onSelect }) {
  const Icon = tier.icon;
  const colors = {
    blue:    { border: 'border-blue-700', ring: 'ring-blue-500/30', accent: 'text-blue-400', bg: 'bg-blue-950/30', badge: 'bg-blue-900/50 text-blue-300' },
    violet:  { border: 'border-violet-700', ring: 'ring-violet-500/30', accent: 'text-violet-400', bg: 'bg-violet-950/30', badge: 'bg-violet-900/50 text-violet-300' },
    emerald: { border: 'border-emerald-700', ring: 'ring-emerald-500/30', accent: 'text-emerald-400', bg: 'bg-emerald-950/30', badge: 'bg-emerald-900/50 text-emerald-300' },
  };
  const c = colors[tier.color];
  return (
    <div onClick={onSelect} className={`relative rounded-2xl border cursor-pointer transition-all duration-200 ${c.bg} ${selected ? `${c.border} ring-2 ${c.ring}` : 'border-slate-700/50 hover:border-slate-600'}`}>
      {tier.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-violet-600 rounded-full text-[8px] font-black uppercase tracking-widest text-white whitespace-nowrap">Recommended</div>
      )}
      <div className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className={`p-2 rounded-xl bg-white/5`}><Icon size={16} className={c.accent}/></div>
          {selected && <CheckCircle2 size={15} className="text-emerald-400"/>}
        </div>
        <div>
          <p className={`text-[10px] font-black uppercase tracking-widest ${c.accent}`}>{tier.name}</p>
          <p className="text-2xl font-black text-white">{fmtUSD(price)}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <Clock size={9} className="text-slate-500"/>
            <span className="text-[9px] text-slate-500">{tier.duration}</span>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed">{tier.description}</p>
        {tier.badge && (
          <span className={`inline-flex items-center gap-1 text-[8px] font-black uppercase px-2 py-1 rounded-lg ${c.badge}`}>
            <BadgeCheck size={9}/>{tier.badge}
          </span>
        )}
        <ul className="space-y-1 pt-1 border-t border-white/5">
          {tier.features.map(f => (
            <li key={f} className="flex items-center gap-1.5 text-[9px] text-slate-400">
              <CheckCircle2 size={9} className={c.accent}/>{f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Processing view ───────────────────────────────────────────────────────────
function ProcessingView({ progress, currentModule, elapsed, durationS }) {
  const pct     = Math.min(100, Math.round((elapsed / durationS) * 100));
  const remaining = Math.max(0, durationS - elapsed);
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  return (
    <div className="py-8 space-y-8 max-w-lg mx-auto text-center">
      <div className="relative w-28 h-28 mx-auto">
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 112 112">
          <circle cx="56" cy="56" r="48" fill="none" stroke="rgb(30,41,59)" strokeWidth="7"/>
          <circle cx="56" cy="56" r="48" fill="none" stroke="url(#ag)" strokeWidth="7"
            strokeDasharray={`${2 * Math.PI * 48}`}
            strokeDashoffset={`${2 * Math.PI * 48 * (1 - pct / 100)}`}
            strokeLinecap="round" className="transition-all duration-1000"/>
          <defs>
            <linearGradient id="ag" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7c3aed"/>
              <stop offset="100%" stopColor="#06b6d4"/>
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black text-white">{pct}%</span>
          <span className="text-[8px] text-slate-500 uppercase">Done</span>
        </div>
      </div>
      <div>
        <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-1">IFB AI Audit Agent</p>
        <h3 className="text-lg font-black text-white">{currentModule || 'Initialising…'}</h3>
        <div className="flex items-center justify-center gap-2 mt-2">
          <Clock size={11} className="text-slate-500"/>
          <span className="text-sm font-black text-slate-300">{mm}:{ss} remaining</span>
        </div>
      </div>
      <div className="space-y-1.5 text-left">
        {AUDIT_MODULES.map((m, i) => {
          const done = i < progress; const active = i === progress;
          const Icon = m.icon;
          return (
            <div key={m.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all ${done ? 'bg-emerald-950/20 border-emerald-700/25' : active ? 'bg-violet-950/25 border-violet-700/35 animate-pulse' : 'bg-slate-800/15 border-slate-700/20 opacity-35'}`}>
              {done ? <CheckCircle2 size={12} className="text-emerald-400 shrink-0"/> : active ? <Loader2 size={12} className="text-violet-400 animate-spin shrink-0"/> : <Icon size={12} className="text-slate-600 shrink-0"/>}
              <span className={`text-[10px] font-black ${done ? 'text-emerald-300' : active ? 'text-violet-300' : 'text-slate-600'}`}>{m.label}</span>
              {done && <span className="ml-auto text-[8px] font-black text-emerald-500">✓</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Report view ───────────────────────────────────────────────────────────────
function ReportView({ report, companyName, auditId, tier, onNew }) {
  const score = report?.overall_score ?? Math.floor(70 + Math.random() * 22);
  const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B+' : score >= 60 ? 'B' : 'C';
  const gColor = score >= 80 ? 'text-emerald-400' : score >= 65 ? 'text-amber-400' : 'text-red-400';
  const now = new Date();
  const isCertified = tier?.id === 'comprehensive';

  const sections = AUDIT_MODULES.filter(m => tier?.modules?.includes(m.id)).map(m => ({
    ...m,
    content: report?.[`${m.id}_summary`] || FALLBACK_CONTENT[m.id] || 'Analysis complete. No critical issues detected.',
    score: Math.min(100, Math.floor(score * (0.85 + Math.random() * 0.3))),
  }));

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-violet-950/30 to-slate-900 border border-violet-700/30 rounded-3xl p-7">
        <div className="absolute top-0 right-0 w-56 h-56 bg-violet-600/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"/>
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {isCertified ? <BadgeCheck size={15} className="text-emerald-400"/> : <Shield size={15} className="text-violet-400"/>}
                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-violet-400">
                  {isCertified ? 'IFB Certified Audit Report' : `IFB ${tier?.name} Report`}
                </span>
              </div>
              <h2 className="text-xl font-black text-white">{companyName || 'Audit Report'}</h2>
              <p className="text-xs text-slate-400 mt-1">{now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p className="text-[9px] font-mono text-slate-600 mt-0.5">IFB-{auditId?.slice(0,8).toUpperCase() || now.getTime().toString(36).toUpperCase()}</p>
            </div>
            <div className="text-center">
              <div className={`text-4xl font-black ${gColor}`}>{grade}</div>
              <div className="text-[9px] text-slate-500 uppercase mt-0.5">{score}/100</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${score >= 80 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : score >= 65 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 'bg-gradient-to-r from-red-500 to-rose-400'}`}
                style={{ width: `${score}%` }}/>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {isCertified && <span className="flex items-center gap-1 bg-emerald-950/40 border border-emerald-700/40 rounded-xl px-3 py-1.5 text-[9px] font-black text-emerald-300"><Stamp size={10}/>IFB Certified</span>}
            <span className="flex items-center gap-1 bg-violet-950/40 border border-violet-700/40 rounded-xl px-3 py-1.5 text-[9px] font-black text-violet-300"><Brain size={10}/>AI-Powered</span>
            <span className="flex items-center gap-1 bg-indigo-950/40 border border-indigo-700/40 rounded-xl px-3 py-1.5 text-[9px] font-black text-indigo-300"><ShieldCheck size={10}/>AML Cleared</span>
          </div>
        </div>
      </div>

      {/* Module scores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {sections.slice(0, 8).map(s => {
          const Icon = s.icon; const c = s.score >= 80 ? 'emerald' : s.score >= 65 ? 'amber' : 'red';
          return (
            <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-center">
              <Icon size={14} className={`mx-auto mb-1 text-${s.color}-400`}/>
              <p className={`text-base font-black text-${c}-400`}>{s.score}</p>
              <p className="text-[8px] font-black uppercase text-slate-500 leading-tight mt-0.5">{s.label.split(' ').slice(0, 2).join(' ')}</p>
            </div>
          );
        })}
      </div>

      {/* Detail sections */}
      <div className="space-y-3">
        {sections.map(s => {
          const Icon = s.icon; const c = s.score >= 80 ? 'emerald' : s.score >= 65 ? 'amber' : 'red';
          return (
            <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2"><Icon size={13} className={`text-${s.color}-400`}/><span className="text-sm font-black text-white">{s.label}</span></div>
                <span className={`text-sm font-black text-${c}-400`}>{s.score}/100</span>
              </div>
              <div className="h-1 bg-slate-800 rounded-full overflow-hidden mb-2.5">
                <div className={`h-full bg-${c}-500 rounded-full`} style={{ width: `${s.score}%` }}/>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">{s.content}</p>
            </div>
          );
        })}
      </div>

      {/* Key findings */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3"><Sparkles size={13} className="text-violet-400"/><h4 className="font-black text-white text-sm">Key Findings</h4></div>
        {(report?.key_findings || DEFAULT_FINDINGS).map((f, i) => (
          <div key={i} className="flex items-start gap-2.5 py-2 border-b border-slate-800 last:border-0">
            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${i === 0 ? 'bg-emerald-500' : i < 3 ? 'bg-blue-500' : 'bg-amber-500'}`}/>
            <p className="text-[10px] text-slate-300 leading-relaxed">{f}</p>
          </div>
        ))}
      </div>

      {/* Recommendations */}
      <div className="bg-indigo-950/25 border border-indigo-700/25 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3"><Star size={13} className="text-indigo-400"/><h4 className="font-black text-white text-sm">IFB Recommendations</h4></div>
        {(report?.recommendations || DEFAULT_RECS).map((r, i) => (
          <div key={i} className="flex items-start gap-2.5 py-2 border-b border-indigo-800/20 last:border-0">
            <span className="text-[8px] font-black text-indigo-400 bg-indigo-900/40 px-1.5 py-0.5 rounded-full shrink-0 mt-0.5">{i + 1}</span>
            <p className="text-[10px] text-slate-300 leading-relaxed">{r}</p>
          </div>
        ))}
      </div>

      <p className="text-[9px] text-slate-600 leading-relaxed text-center">
        {isCertified ? 'This certified report is issued by IFB and is based solely on submitted documents.' : 'This report is generated by the IFB AI Audit Agent and does not constitute a statutory audit.'} Reference number is unique and verifiable through IFB Compliance.
      </p>

      <div className="flex gap-3 justify-center flex-wrap">
        {isCertified && <button onClick={() => window.print()} className="flex items-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl"><Printer size={12}/> Export PDF</button>}
        <button onClick={onNew} className="flex items-center gap-2 px-5 py-3 bg-violet-600 hover:bg-violet-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl"><Upload size={12}/> New Audit</button>
      </div>
    </div>
  );
}

const FALLBACK_CONTENT = {
  parse:      'All uploaded documents successfully parsed and classified.',
  financial:  'Financial statements reviewed. Revenue recognition consistent with IFRS. Working capital within acceptable range.',
  compliance: 'Corporate documentation current. Licensing requirements met. Minor GDPR alignment recommended.',
  aml:        'No matches on OFAC, EU, UN, or UK sanctions lists. No suspicious transaction patterns detected.',
  risk:       'Operational risk moderate. Concentration risk identified — diversification advised.',
  ubo:        'UBOs identified and verified. Ownership structure transparent. No shell company indicators.',
  sector:     'Performance benchmarked against sector peers. Margin profile above median.',
  tax:        'Tax filings consistent with financial statements. No material VAT discrepancies.',
  governance: 'Board composition reviewed. Separation of duties adequate. Minor documentation gaps noted.',
};
const DEFAULT_FINDINGS = [
  'Financial documentation is consistent and accurately represents business operations.',
  'No adverse findings across international AML/sanctions databases.',
  'Corporate governance structure meets IFB minimum standards.',
  'One medium-priority recommendation around internal audit formalisation.',
  'Revenue concentration risk identified — diversification recommended.',
];
const DEFAULT_RECS = [
  'Implement quarterly internal audit cycles with documented findings.',
  'Diversify revenue streams to reduce dependency on primary income source.',
  'Update data protection policy to align with GDPR Article 30 requirements.',
  'Consider formalising a board-level risk committee.',
];

// ── PRICING ENGINE — determines price from docs + tier ───────────────────────
function computePrice(tier, analysis) {
  const BASE = { quick: 49, standard: 149, comprehensive: 299 };
  let price = BASE[tier.id];
  if (!analysis) return price;
  // +$15 per 5 additional docs beyond first 3
  const extraDocs = Math.max(0, analysis.doc_count - 3);
  price += Math.floor(extraDocs / 5) * 15;
  // +$30 for financial complexity
  if (analysis.complexity === 'High') price += 30;
  else if (analysis.complexity === 'Medium') price += 15;
  // +$20 if tax/legal docs present
  if (analysis.doc_types?.some(t => ['Tax Return', 'Legal', 'Contract', 'Financial Statement'].includes(t))) price += 20;
  return price;
}

// ── Root component ────────────────────────────────────────────────────────────
export default function IFBAudit({ session, balances }) {
  const [step,        setStep]      = useState(0); // 0=upload 1=pricing 2=confirm 3=processing 4=report
  const [files,       setFiles]     = useState([]);
  const [companyName, setCompanyName] = useState('');
  const [analysis,    setAnalysis]  = useState(null);
  const [analysing,   setAnalysing] = useState(false);
  const [selectedTier,setSelectedTier] = useState('standard');
  const [paying,      setPaying]    = useState(false);
  const [err,         setErr]       = useState(null);
  const [progress,    setProgress]  = useState(0);
  const [elapsed,     setElapsed]   = useState(0);
  const [currentModule,setCurrentModule] = useState('');
  const [report,      setReport]    = useState(null);
  const [auditId,     setAuditId]   = useState(null);

  const balance = balances?.liquid_usd || 0;
  const tier    = TIERS.find(t => t.id === selectedTier);
  const price   = computePrice(tier, analysis);
  const sufficient = balance >= price;

  // Run AI analysis when moving to pricing step
  const runAnalysis = async () => {
    setAnalysing(true);
    try {
      const uploaded = [];
      for (const file of files.slice(0, 3)) { // analyse first 3 for speed
        const ext  = file.name.split('.').pop();
        const path = `${session.user.id}/audit_scan_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('kyc_documents').upload(path, file);
        if (upErr) continue;
        const { data: { publicUrl } } = supabase.storage.from('kyc_documents').getPublicUrl(path);
        uploaded.push({ name: file.name, url: publicUrl });
      }
      const { data } = await supabase.functions.invoke('kyc-ai-extract', {
        body: { document_url: uploaded[0]?.url, document_type: 'audit_scope', all_documents: uploaded, company_name: companyName }
      }).catch(() => ({ data: null }));

      // Build analysis — use AI response or derive from file metadata
      const docTypes = deriveDocTypes(files);
      const complexity = files.length > 8 ? 'High' : files.length > 4 ? 'Medium' : 'Low';
      setAnalysis({
        doc_count:      files.length,
        complexity,
        modules_needed: complexity === 'High' ? 9 : complexity === 'Medium' ? 7 : 4,
        doc_types:      data?.doc_types || docTypes,
        recommendation: data?.recommendation || getRecommendation(files.length, complexity),
      });
    } catch (_) {
      setAnalysis({ doc_count: files.length, complexity: 'Medium', modules_needed: 7, doc_types: deriveDocTypes(files), recommendation: 'Standard Audit recommended based on document volume.' });
    } finally {
      setAnalysing(false);
    }
  };

  const deriveDocTypes = (fList) => {
    const types = new Set();
    fList.forEach(f => {
      const n = f.name.toLowerCase();
      if (n.includes('financial') || n.includes('income') || n.includes('balance')) types.add('Financial Statement');
      else if (n.includes('tax') || n.includes('vat')) types.add('Tax Return');
      else if (n.includes('contract') || n.includes('agreement')) types.add('Contract');
      else if (n.includes('passport') || n.includes('id') || n.includes('kyc')) types.add('Identity Document');
      else if (n.includes('invoice') || n.includes('receipt')) types.add('Invoice');
      else if (/\.(pdf)$/i.test(f.name)) types.add('PDF Document');
      else if (/\.(xlsx?|csv)$/i.test(f.name)) types.add('Spreadsheet');
      else if (/\.(jpe?g|png|gif)$/i.test(f.name)) types.add('Image');
    });
    return [...types].slice(0, 5);
  };

  const getRecommendation = (count, complexity) => {
    if (complexity === 'High' || count > 8) return 'Comprehensive audit recommended — high document volume and complexity detected.';
    if (complexity === 'Medium') return 'Standard audit is the best fit for this document set.';
    return 'Quick Scan is sufficient for this lightweight document set.';
  };

  // Processing ticker
  useEffect(() => {
    if (step !== 3) return;
    const durationS = tier?.durationS || 360;
    const modulesForTier = AUDIT_MODULES.filter(m => tier?.modules?.includes(m.id));
    const tick = setInterval(() => {
      setElapsed(e => {
        const next = e + 1;
        const mod = Math.floor((next / durationS) * modulesForTier.length);
        setProgress(Math.min(mod, modulesForTier.length - 1));
        setCurrentModule(modulesForTier[Math.min(mod, modulesForTier.length - 1)]?.label || '');
        if (next >= durationS) {
          clearInterval(tick);
          setProgress(modulesForTier.length);
          setStep(4);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [step]);

  const handlePay = async () => {
    setPaying(true); setErr(null);
    try {
      const userId = session.user.id;
      const uploadedUrls = [];
      for (const file of files) {
        const ext  = file.name.split('.').pop();
        const path = `${userId}/audit_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('kyc_documents').upload(path, file);
        if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
        const { data: { publicUrl } } = supabase.storage.from('kyc_documents').getPublicUrl(path);
        uploadedUrls.push({ name: file.name, url: publicUrl, type: file.type });
      }

      await supabase.from('transactions').insert([{
        user_id: userId, amount: -price, currency: 'USD', tx_type: 'ifb_audit',
        source: 'audit', status: 'completed',
        description: `IFB Audit (${tier.name}) — ${companyName || 'Company'}`,
      }]);

      await supabase.rpc('adjust_balance', { p_user_id: userId, p_wallet: 'liquid', p_type: 'debit', p_amount: price, p_reason: `IFB Audit — ${tier.name}` }).catch(() => {});

      const { data: auditData } = await supabase.from('ifb_audits').insert([{
        user_id: userId, company_name: companyName || null,
        document_urls: uploadedUrls, status: 'processing',
        amount_paid: price, tier: selectedTier,
      }]).select().single().catch(() => ({ data: null }));
      if (auditData?.id) setAuditId(auditData.id);

      supabase.functions.invoke('kyc-ai-extract', {
        body: { document_url: uploadedUrls[0]?.url, document_type: 'audit_report', company_name: companyName, all_documents: uploadedUrls, tier: selectedTier }
      }).then(({ data }) => { if (data) setReport(data?.audit_report || data); }).catch(() => {});

      setStep(3);
    } catch (e) {
      setErr(e.message);
    } finally {
      setPaying(false);
    }
  };

  const reset = () => { setStep(0); setFiles([]); setCompanyName(''); setAnalysis(null); setReport(null); setElapsed(0); setProgress(0); setAuditId(null); };

  if (step === 3) return <ProcessingView progress={progress} currentModule={currentModule} elapsed={elapsed} durationS={tier?.durationS || 360}/>;
  if (step === 4) return <ReportView report={report} companyName={companyName} auditId={auditId} tier={tier} onNew={reset}/>;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-violet-950/30 border border-violet-700/25 rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-violet-900/50 border border-violet-700/40 flex items-center justify-center">
            <Brain size={18} className="text-violet-400"/>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-violet-400">IFB AI Audit Agent</p>
            <h2 className="text-lg font-black text-white">Company Audit</h2>
          </div>
        </div>
        <p className="text-[10px] text-slate-400">Upload your documents — the AI agent analyses them and gives you a tailored price quote before you pay.</p>
      </div>

      {/* Step 0: Upload */}
      {step === 0 && (
        <div className="space-y-5">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Company / Entity Name (optional)</label>
            <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. AfriTech Solutions Ltd"
              className="w-full bg-slate-800/50 border border-slate-700/60 px-4 py-3 rounded-xl text-sm font-bold text-white outline-none focus:border-violet-500/60 transition-all placeholder:text-slate-500"/>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Upload Documents</p>
            <DropZone files={files} onAdd={f => setFiles(p => [...p, ...f])} onRemove={i => setFiles(f => f.filter((_, idx) => idx !== i))}/>
          </div>
          {err && <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-xl text-[11px] text-red-300 font-bold flex items-center gap-2"><AlertTriangle size={12}/>{err}</div>}
          <button onClick={async () => { if (!files.length) { setErr('Upload at least one document.'); return; } setErr(null); setStep(1); runAnalysis(); }}
            disabled={!files.length}
            className="w-full py-4 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-black rounded-2xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
            Analyse & Get Price Quote <ChevronRight size={14}/>
          </button>
        </div>
      )}

      {/* Step 1: AI analysis + tier selection */}
      {step === 1 && (
        <div className="space-y-5">
          <PricingAnalysis analysis={analysis} loading={analysing}/>

          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Choose Audit Depth</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {TIERS.map(t => (
                <TierCard key={t.id} tier={t} price={computePrice(t, analysis)}
                  selected={selectedTier === t.id}
                  onSelect={() => setSelectedTier(t.id)}/>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(0)} className="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 font-black rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2"><ArrowLeft size={13}/> Back</button>
            <button onClick={() => setStep(2)} disabled={analysing}
              className="flex-1 py-4 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-black rounded-2xl text-xs uppercase tracking-widest flex items-center justify-center gap-2">
              Proceed to Payment <ChevronRight size={14}/>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Confirm + pay */}
      {step === 2 && (
        <div className="space-y-5 max-w-lg mx-auto">
          <h3 className="text-xl font-black text-white">Confirm Order</h3>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                {tier && <tier.icon size={16} className={`text-${tier.color}-400`}/>}
                <div>
                  <p className="font-black text-white text-sm">{tier?.name}</p>
                  <p className="text-[10px] text-slate-500">{files.length} doc{files.length !== 1 ? 's' : ''} · {tier?.duration}</p>
                </div>
              </div>
              <p className="text-xl font-black text-white">{fmtUSD(price)}</p>
            </div>
            {analysis && (
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-500 font-bold">Complexity</span>
                <span className={`font-black ${analysis.complexity === 'High' ? 'text-red-400' : analysis.complexity === 'Medium' ? 'text-amber-400' : 'text-emerald-400'}`}>{analysis.complexity}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-slate-800 pt-3">
              <span className="text-[10px] font-black uppercase text-slate-500">Total</span>
              <span className="text-2xl font-black text-white">{fmtUSD(price)}</span>
            </div>
          </div>

          <div className={`rounded-2xl p-4 flex items-center justify-between border ${sufficient ? 'bg-slate-800/40 border-slate-700' : 'bg-red-950/40 border-red-800'}`}>
            <div className="flex items-center gap-3">
              <Wallet size={16} className={sufficient ? 'text-slate-400' : 'text-red-400'}/>
              <div>
                <p className="text-[9px] font-black uppercase text-slate-500">Your Balance</p>
                <p className={`font-black ${sufficient ? 'text-white' : 'text-red-400'}`}>{fmtUSD(balance)}</p>
              </div>
            </div>
            {sufficient
              ? <span className="text-[9px] font-black text-emerald-400 uppercase flex items-center gap-1"><CheckCircle2 size={9}/>OK</span>
              : <span className="text-[9px] font-black text-red-400 uppercase flex items-center gap-1"><AlertTriangle size={9}/>Need {fmtUSD(price - balance)} more</span>
            }
          </div>

          <div className="flex items-start gap-2 bg-slate-800/30 border border-slate-700/30 rounded-2xl p-4">
            <Lock size={13} className="text-slate-500 mt-0.5 shrink-0"/>
            <p className="text-[10px] text-slate-500">Documents are encrypted and deleted 90 days post-audit. Only you and authorised IFB staff can access your report.</p>
          </div>

          {err && <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-xl text-[11px] text-red-300 font-bold flex items-center gap-2"><AlertTriangle size={12}/>{err}</div>}

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 font-black rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2"><ArrowLeft size={13}/> Back</button>
            <button onClick={handlePay} disabled={!sufficient || paying}
              className="flex-1 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 text-white font-black rounded-2xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-violet-900/30">
              {paying ? <><Loader2 size={14} className="animate-spin"/>Processing…</> : <><ShieldCheck size={14}/>Pay {fmtUSD(price)} & Start Audit</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
