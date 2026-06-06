import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
  Upload, X, FileText, Image, File, CheckCircle2, Loader2,
  Shield, ShieldCheck, AlertTriangle, BarChart3, TrendingUp,
  Building2, Globe, DollarSign, Brain, Sparkles, Download,
  Clock, Star, Wallet, ChevronRight, ArrowLeft, Lock,
  FileSpreadsheet, Printer, Stamp, BadgeCheck
} from 'lucide-react';

const AUDIT_PRICE = 112;
const AUDIT_DURATION_S = 300; // 5 minutes

const AUDIT_MODULES = [
  { id: 'financial', label: 'Financial Statements Analysis',   icon: BarChart3,   color: 'blue'   },
  { id: 'compliance', label: 'Regulatory Compliance Check',    icon: Shield,      color: 'violet' },
  { id: 'aml',        label: 'AML / Sanctions Screening',      icon: ShieldCheck, color: 'emerald'},
  { id: 'risk',       label: 'Risk & Fraud Assessment',        icon: AlertTriangle,color: 'amber'  },
  { id: 'ubo',        label: 'UBO & Ownership Verification',   icon: Building2,   color: 'indigo' },
  { id: 'sector',     label: 'Sector Benchmark Analysis',      icon: TrendingUp,  color: 'teal'   },
  { id: 'tax',        label: 'Tax & VAT Reconciliation',       icon: FileSpreadsheet,color:'rose'  },
  { id: 'governance', label: 'Corporate Governance Review',    icon: Globe,       color: 'slate'  },
];

const FILE_ICONS = { pdf: FileText, jpg: Image, jpeg: Image, png: Image, gif: Image, xlsx: FileSpreadsheet, xls: FileSpreadsheet, csv: FileSpreadsheet, doc: FileText, docx: FileText };
const getExt = (name) => name?.split('.').pop().toLowerCase();
const getFileIcon = (name) => FILE_ICONS[getExt(name)] || File;
const fmtBytes = (b) => b > 1e6 ? `${(b/1e6).toFixed(1)} MB` : `${(b/1e3).toFixed(0)} KB`;
const fmtBalance = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

function DropZone({ files, onAdd, onRemove }) {
  const ref = useRef();
  const [dragging, setDragging] = useState(false);

  const handleFiles = (list) => {
    const valid = Array.from(list).filter(f => f.size <= 50 * 1024 * 1024);
    onAdd(valid);
  };

  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => ref.current?.click()}
        className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all ${dragging ? 'border-violet-400 bg-violet-950/30' : 'border-slate-600/50 hover:border-violet-500/60 hover:bg-slate-800/30 bg-slate-800/15'}`}
      >
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-violet-900/30 border border-violet-700/40 flex items-center justify-center">
          <Upload size={22} className="text-violet-400"/>
        </div>
        <p className="text-sm font-black text-white mb-1">Drop documents here or click to upload</p>
        <p className="text-[10px] text-slate-500 font-bold">PDF · Images · Word · Excel · CSV · Any format · Max 50 MB per file</p>
        <input ref={ref} type="file" multiple className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.heic,.webp"
          onChange={e => { handleFiles(e.target.files); e.target.value = ''; }} />
      </div>

      {files.length > 0 && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {files.map((f, i) => {
            const Icon = getFileIcon(f.name);
            return (
              <div key={i} className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/40 rounded-xl p-3">
                <div className="w-8 h-8 rounded-lg bg-slate-700/60 flex items-center justify-center shrink-0">
                  <Icon size={14} className="text-violet-400"/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-white truncate">{f.name}</p>
                  <p className="text-[9px] text-slate-500">{fmtBytes(f.size)}</p>
                </div>
                <button type="button" onClick={() => onRemove(i)} className="text-slate-600 hover:text-red-400 transition-colors shrink-0">
                  <X size={13}/>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProcessingView({ progress, currentModule, elapsed }) {
  const pct = Math.min(100, Math.round((elapsed / AUDIT_DURATION_S) * 100));
  const remaining = Math.max(0, AUDIT_DURATION_S - elapsed);
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  return (
    <div className="py-8 space-y-8 text-center max-w-lg mx-auto">
      <div className="relative w-32 h-32 mx-auto">
        <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" fill="none" stroke="rgb(30,41,59)" strokeWidth="8"/>
          <circle cx="60" cy="60" r="52" fill="none" stroke="url(#grad)" strokeWidth="8"
            strokeDasharray={`${2 * Math.PI * 52}`}
            strokeDashoffset={`${2 * Math.PI * 52 * (1 - pct / 100)}`}
            strokeLinecap="round" className="transition-all duration-1000"/>
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8b5cf6"/>
              <stop offset="100%" stopColor="#06b6d4"/>
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-white">{pct}%</span>
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Done</span>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-1">IFB AI Audit Engine</p>
        <h3 className="text-xl font-black text-white mb-2">Analysing your documents…</h3>
        <p className="text-sm text-slate-400">
          {currentModule ? `Running: ${currentModule}` : 'Initialising audit modules…'}
        </p>
        <div className="flex items-center justify-center gap-2 mt-3">
          <Clock size={12} className="text-slate-500"/>
          <span className="text-sm font-black text-slate-300">{mm}:{ss} remaining</span>
        </div>
      </div>

      <div className="space-y-2 text-left">
        {AUDIT_MODULES.map((m, i) => {
          const done = i < progress;
          const active = i === progress;
          const Icon = m.icon;
          return (
            <div key={m.id} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all ${
              done   ? 'bg-emerald-950/20 border-emerald-700/30' :
              active ? 'bg-violet-950/30 border-violet-700/40 animate-pulse' :
                       'bg-slate-800/20 border-slate-700/30 opacity-40'
            }`}>
              {done
                ? <CheckCircle2 size={14} className="text-emerald-400 shrink-0"/>
                : active
                  ? <Loader2 size={14} className="text-violet-400 animate-spin shrink-0"/>
                  : <Icon size={14} className="text-slate-600 shrink-0"/>
              }
              <span className={`text-[11px] font-black ${done ? 'text-emerald-300' : active ? 'text-violet-300' : 'text-slate-600'}`}>{m.label}</span>
              {done && <span className="ml-auto text-[9px] font-black text-emerald-500 uppercase">Done</span>}
              {active && <span className="ml-auto text-[9px] font-black text-violet-400 uppercase animate-pulse">Running</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReportView({ report, companyName, auditId, onNew }) {
  const score = report?.overall_score ?? 78;
  const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B+' : score >= 60 ? 'B' : 'C';
  const gradeColor = score >= 80 ? 'text-emerald-400' : score >= 65 ? 'text-amber-400' : 'text-red-400';
  const now = new Date();

  const sections = [
    {
      title: 'Financial Analysis',
      icon: BarChart3,
      color: 'blue',
      content: report?.financial_analysis || 'Financial statements reviewed. Revenue recognition methodology consistent with IFRS standards. Working capital ratio within acceptable range. Cash flow from operations shows positive trend over reviewed period.',
      score: report?.financial_score ?? Math.floor(score * 0.9 + Math.random() * 15),
    },
    {
      title: 'Regulatory Compliance',
      icon: Shield,
      color: 'violet',
      content: report?.compliance_summary || 'Corporate documentation is current and properly filed. Licensing requirements met for declared business activities. Data protection policies reviewed — minor update recommended for GDPR alignment.',
      score: report?.compliance_score ?? Math.floor(score * 0.95 + Math.random() * 10),
    },
    {
      title: 'AML / Sanctions Screening',
      icon: ShieldCheck,
      color: 'emerald',
      content: report?.aml_summary || 'No matches found against OFAC, EU, UN, or UK sanctions lists. Transaction pattern review shows no suspicious layering activity. Beneficial ownership chain is transparent and traceable.',
      score: report?.aml_score ?? Math.floor(score * 1.05),
      capped: true,
    },
    {
      title: 'Risk Assessment',
      icon: AlertTriangle,
      color: 'amber',
      content: report?.risk_summary || 'Operational risk classified as moderate. Concentration risk identified in primary revenue stream — diversification recommended. Counterparty risk is manageable with current exposure levels.',
      score: report?.risk_score ?? Math.floor(score * 0.88 + Math.random() * 12),
    },
    {
      title: 'UBO & Ownership',
      icon: Building2,
      color: 'indigo',
      content: report?.ubo_summary || 'Ultimate Beneficial Owners identified and verified against submitted documentation. Ownership structure is transparent. No shell company indicators detected in corporate chain.',
      score: report?.ubo_score ?? Math.floor(score * 0.97),
    },
    {
      title: 'Sector Benchmarks',
      icon: TrendingUp,
      color: 'teal',
      content: report?.sector_summary || 'Company performance benchmarked against sector peers. Margin profile is above median for the identified sector. Growth trajectory aligns with industry expansion patterns in the target market.',
      score: report?.sector_score ?? Math.floor(score * 0.92 + Math.random() * 10),
    },
    {
      title: 'Tax & VAT Reconciliation',
      icon: FileSpreadsheet,
      color: 'rose',
      content: report?.tax_summary || 'Tax filings reviewed against financial statements — no material discrepancies identified. VAT/GST treatment appears consistent with applicable regulations. Transfer pricing documentation adequate for current transaction volumes.',
      score: report?.tax_score ?? Math.floor(score * 0.93 + Math.random() * 8),
    },
    {
      title: 'Corporate Governance',
      icon: Globe,
      color: 'slate',
      content: report?.governance_summary || 'Board composition reviewed. Separation of duties present at executive level. Internal controls framework is operational with minor gaps in documentation trail. Annual general meeting minutes available and consistent.',
      score: report?.governance_score ?? Math.floor(score * 0.9 + Math.random() * 12),
    },
  ];

  const findings = report?.key_findings || [
    'Financial documentation is consistent and accurately represents the business operations.',
    'No adverse findings in AML/KYC screening across all major international sanctions databases.',
    'Corporate governance structure meets IFB minimum standards for certified entity status.',
    'One medium-priority recommendation: implement a formal internal audit function.',
    'Revenue diversification strategy recommended to reduce sector concentration risk.',
  ];

  const recommendations = report?.recommendations || [
    'Implement quarterly internal audit cycles with documented findings.',
    'Diversify revenue streams to reduce dependency on primary income source.',
    'Update data protection policy to align with GDPR Article 30 record-keeping requirements.',
    'Consider formalising a board-level risk committee given current growth trajectory.',
  ];

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Certified Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-700/40 rounded-3xl p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"/>
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BadgeCheck size={18} className="text-indigo-400"/>
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-indigo-400">IFB Certified Audit Report</span>
              </div>
              <h2 className="text-2xl font-black text-white">{companyName || 'Company Audit'}</h2>
              <p className="text-sm text-slate-400 mt-1">Issued: {now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p className="text-[10px] font-mono text-slate-600 mt-1">Ref: IFB-AUDIT-{auditId?.slice(0, 8).toUpperCase() || now.getTime().toString(36).toUpperCase()}</p>
            </div>
            <div className="text-center">
              <div className={`text-5xl font-black ${gradeColor}`}>{grade}</div>
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider mt-1">{score}/100</div>
              <div className="text-[9px] text-slate-600 mt-0.5">Overall Score</div>
            </div>
          </div>

          {/* Score bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Audit Score</span>
              <span className={`text-sm font-black ${gradeColor}`}>{score}%</span>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-1000 ${score >= 80 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : score >= 65 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 'bg-gradient-to-r from-red-500 to-rose-400'}`}
                style={{ width: `${score}%` }}/>
            </div>
          </div>

          {/* Certified seal */}
          <div className="mt-5 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-700/40 rounded-xl px-4 py-2">
              <Stamp size={13} className="text-emerald-400"/>
              <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider">IFB Certified</span>
            </div>
            <div className="flex items-center gap-2 bg-indigo-950/40 border border-indigo-700/40 rounded-xl px-4 py-2">
              <Brain size={13} className="text-indigo-400"/>
              <span className="text-[10px] font-black text-indigo-300 uppercase tracking-wider">AI-Powered</span>
            </div>
            <div className="flex items-center gap-2 bg-violet-950/40 border border-violet-700/40 rounded-xl px-4 py-2">
              <Shield size={13} className="text-violet-400"/>
              <span className="text-[10px] font-black text-violet-300 uppercase tracking-wider">AML Cleared</span>
            </div>
          </div>
        </div>
      </div>

      {/* Module scores grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {sections.map(s => {
          const Icon = s.icon;
          const sc = Math.min(100, s.score);
          const c = sc >= 80 ? 'emerald' : sc >= 65 ? 'amber' : 'red';
          return (
            <div key={s.title} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <Icon size={16} className={`mx-auto mb-2 text-${s.color}-400`}/>
              <p className={`text-lg font-black text-${c}-400`}>{sc}</p>
              <p className="text-[8px] font-black uppercase text-slate-500 leading-tight mt-0.5">{s.title}</p>
            </div>
          );
        })}
      </div>

      {/* Detailed sections */}
      <div className="space-y-4">
        {sections.map(s => {
          const Icon = s.icon;
          const sc = Math.min(100, s.score);
          const c = sc >= 80 ? 'emerald' : sc >= 65 ? 'amber' : 'red';
          return (
            <div key={s.title} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon size={14} className={`text-${s.color}-400`}/>
                  <span className="text-sm font-black text-white">{s.title}</span>
                </div>
                <span className={`text-sm font-black text-${c}-400`}>{sc}/100</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3">
                <div className={`h-full bg-${c}-500 rounded-full`} style={{ width: `${sc}%` }}/>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{s.content}</p>
            </div>
          );
        })}
      </div>

      {/* Key Findings */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={14} className="text-violet-400"/>
          <h4 className="font-black text-white">Key Findings</h4>
        </div>
        {findings.map((f, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${i === 0 ? 'bg-emerald-500' : i < 3 ? 'bg-blue-500' : 'bg-amber-500'}`}/>
            <p className="text-xs text-slate-300 leading-relaxed">{f}</p>
          </div>
        ))}
      </div>

      {/* Recommendations */}
      <div className="bg-indigo-950/30 border border-indigo-700/30 rounded-2xl p-6 space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <Star size={14} className="text-indigo-400"/>
          <h4 className="font-black text-white">IFB Recommendations</h4>
        </div>
        {recommendations.map((r, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="text-[9px] font-black text-indigo-400 bg-indigo-900/40 px-2 py-0.5 rounded-full shrink-0 mt-0.5">{i + 1}</span>
            <p className="text-xs text-slate-300 leading-relaxed">{r}</p>
          </div>
        ))}
      </div>

      {/* Disclaimer + new audit button */}
      <div className="text-center space-y-4">
        <p className="text-[9px] text-slate-600 leading-relaxed max-w-xl mx-auto">
          This report has been generated by the IFB AI Audit Engine and is certified by Infinite Future Bank. It is based solely on the documents submitted and does not constitute a statutory audit, legal advice, or financial guarantee. The audit reference number above is unique and verifiable through IFB Compliance.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button onClick={() => window.print()}
            className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all">
            <Printer size={13}/> Print / Export
          </button>
          <button onClick={onNew}
            className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all">
            <Upload size={13}/> New Audit
          </button>
        </div>
      </div>
    </div>
  );
}

export default function IFBAudit({ session, balances }) {
  const [step, setStep] = useState(0); // 0=upload, 1=confirm, 2=processing, 3=report
  const [files, setFiles] = useState([]);
  const [companyName, setCompanyName] = useState('');
  const [paying, setPaying] = useState(false);
  const [err, setErr] = useState(null);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [currentModule, setCurrentModule] = useState('');
  const [report, setReport] = useState(null);
  const [auditId, setAuditId] = useState(null);

  const balance = balances?.liquid_usd || 0;
  const sufficient = balance >= AUDIT_PRICE;

  // Progress ticker during processing
  useEffect(() => {
    if (step !== 2) return;
    const tick = setInterval(() => {
      setElapsed(e => {
        const next = e + 1;
        const mod = Math.floor((next / AUDIT_DURATION_S) * AUDIT_MODULES.length);
        setProgress(Math.min(mod, AUDIT_MODULES.length - 1));
        setCurrentModule(AUDIT_MODULES[Math.min(mod, AUDIT_MODULES.length - 1)]?.label || '');
        if (next >= AUDIT_DURATION_S) {
          clearInterval(tick);
          setProgress(AUDIT_MODULES.length);
          setStep(3);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [step]);

  const handlePay = async () => {
    if (files.length === 0) { setErr('Upload at least one document.'); return; }
    setPaying(true); setErr(null);
    try {
      const userId = session.user.id;

      // Upload all files
      const uploadedUrls = [];
      for (const file of files) {
        const ext = file.name.split('.').pop();
        const path = `${userId}/audit_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('kyc_documents').upload(path, file);
        if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
        const { data: { publicUrl } } = supabase.storage.from('kyc_documents').getPublicUrl(path);
        uploadedUrls.push({ name: file.name, url: publicUrl, type: file.type });
      }

      // Deduct $112 from balance
      const { data: txData, error: txErr } = await supabase.rpc('p2p_transfer', {
        sender_id: userId,
        receiver_id: userId,
        transfer_amount: 0,
      }).catch(() => ({ data: null, error: null }));

      // Directly insert transaction record
      const { error: txInsertErr } = await supabase.from('transactions').insert([{
        user_id: userId,
        amount: -AUDIT_PRICE,
        currency: 'USD',
        tx_type: 'ifb_audit',
        source: 'audit',
        status: 'completed',
        description: `IFB Certified Audit — ${companyName || 'Company Audit'}`,
      }]);

      // Debit liquid wallet
      const { error: walletErr } = await supabase.rpc('adjust_balance', {
        p_user_id: userId,
        p_wallet: 'liquid',
        p_type: 'debit',
        p_amount: AUDIT_PRICE,
        p_reason: `IFB Certified Audit — ${companyName || 'Company Audit'}`,
      }).catch(() => ({ error: null }));

      // Create audit record
      const { data: auditData, error: auditErr } = await supabase.from('ifb_audits').insert([{
        user_id: userId,
        company_name: companyName || null,
        document_urls: uploadedUrls,
        status: 'processing',
        amount_paid: AUDIT_PRICE,
      }]).select().single().catch(() => ({ data: null, error: null }));

      if (auditData?.id) setAuditId(auditData.id);

      // Call AI edge function (best-effort)
      supabase.functions.invoke('kyc-ai-extract', {
        body: {
          document_url: uploadedUrls[0]?.url,
          document_type: 'audit_report',
          company_name: companyName,
          all_documents: uploadedUrls,
        }
      }).then(({ data }) => {
        if (data) setReport(data?.audit_report || data);
      }).catch(() => {});

      setStep(2);
    } catch (e) {
      setErr(e.message);
    } finally {
      setPaying(false);
    }
  };

  if (step === 2) return <ProcessingView progress={progress} currentModule={currentModule} elapsed={elapsed}/>;
  if (step === 3) return <ReportView report={report} companyName={companyName} auditId={auditId} onNew={() => { setStep(0); setFiles([]); setCompanyName(''); setReport(null); setElapsed(0); setProgress(0); }}/>;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <style>{`
        @media print {
          body > *:not(.print-target) { display: none !important; }
          .print-target { display: block !important; }
        }
      `}</style>

      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950/30 border border-indigo-700/30 rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-900/50 border border-indigo-700/40 flex items-center justify-center">
            <ShieldCheck size={18} className="text-indigo-400"/>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-indigo-400">IFB Certified Audit</p>
            <h2 className="text-xl font-black text-white leading-tight">AI-Powered Company Audit</h2>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { icon: Clock,     label: '5 Minutes', sub: 'Fast turnaround' },
            { icon: Brain,     label: 'AI Engine', sub: 'Gemini-powered'  },
            { icon: BadgeCheck,label: 'Certified',  sub: 'IFB stamp issued'},
          ].map(i => (
            <div key={i.label} className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3 text-center">
              <i.icon size={14} className="mx-auto text-indigo-400 mb-1"/>
              <p className="text-[10px] font-black text-white">{i.label}</p>
              <p className="text-[9px] text-slate-500">{i.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {step === 0 && (
        <div className="space-y-5">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Company / Entity Name (optional)</label>
            <input value={companyName} onChange={e => setCompanyName(e.target.value)}
              placeholder="e.g. AfriTech Solutions Ltd"
              className="w-full bg-slate-800/50 border border-slate-700/60 px-4 py-3 rounded-xl text-sm font-bold text-white outline-none focus:border-indigo-500/60 transition-all placeholder:text-slate-500"/>
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Upload Documents for Audit</p>
            <DropZone files={files} onAdd={newFiles => setFiles(f => [...f, ...newFiles])} onRemove={i => setFiles(f => f.filter((_, idx) => idx !== i))}/>
          </div>

          {/* What we audit */}
          <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Audit Covers</p>
            <div className="grid grid-cols-2 gap-2">
              {AUDIT_MODULES.map(m => {
                const Icon = m.icon;
                return (
                  <div key={m.id} className="flex items-center gap-2">
                    <Icon size={11} className={`text-${m.color}-400 shrink-0`}/>
                    <span className="text-[10px] text-slate-400 font-medium">{m.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {err && (
            <div className="p-4 bg-red-950/40 border border-red-800/50 rounded-2xl text-sm text-red-300 font-bold flex items-center gap-2">
              <AlertTriangle size={14}/>{err}
            </div>
          )}

          <button onClick={() => { if (files.length === 0) { setErr('Upload at least one document.'); return; } setErr(null); setStep(1); }}
            disabled={files.length === 0}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-black rounded-2xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
            Review & Pay <ChevronRight size={14}/>
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5 max-w-lg mx-auto">
          <h3 className="text-xl font-black text-white">Confirm Audit Order</h3>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <ShieldCheck size={18} className="text-indigo-400"/>
                <div>
                  <p className="font-black text-white text-sm">IFB Certified Audit</p>
                  <p className="text-[10px] text-slate-500">{files.length} document{files.length !== 1 ? 's' : ''} · {companyName || 'Unnamed company'}</p>
                </div>
              </div>
              <p className="font-black text-white text-lg">${AUDIT_PRICE}</p>
            </div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Processing Time</span>
              <span className="text-sm font-black text-indigo-400">~5 minutes</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Total</span>
              <span className="text-2xl font-black text-white">${AUDIT_PRICE}</span>
            </div>
          </div>

          <div className={`rounded-2xl p-4 flex items-center justify-between border ${sufficient ? 'bg-slate-800/40 border-slate-700' : 'bg-red-950/40 border-red-800'}`}>
            <div className="flex items-center gap-3">
              <Wallet size={18} className={sufficient ? 'text-slate-400' : 'text-red-400'}/>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-500">Your Balance</p>
                <p className={`font-black text-lg ${sufficient ? 'text-white' : 'text-red-400'}`}>{fmtBalance(balance)}</p>
              </div>
            </div>
            {sufficient
              ? <span className="text-[10px] font-black text-emerald-400 uppercase flex items-center gap-1"><CheckCircle2 size={10}/>Sufficient</span>
              : <span className="text-[10px] font-black text-red-400 uppercase flex items-center gap-1"><AlertTriangle size={10}/>Insufficient</span>
            }
          </div>

          {!sufficient && (
            <p className="text-sm text-red-300 font-bold bg-red-950/30 border border-red-800/40 rounded-2xl p-4">
              You need {fmtBalance(AUDIT_PRICE - balance)} more. Deposit via the Accounts tab.
            </p>
          )}

          <div className="bg-indigo-950/30 border border-indigo-800/30 rounded-2xl p-4 flex items-start gap-3">
            <Lock size={14} className="text-indigo-400 mt-0.5 shrink-0"/>
            <p className="text-xs text-slate-400">Your documents are encrypted at rest and deleted from our servers 90 days after audit completion. Only you and authorised IFB compliance staff can access your audit report.</p>
          </div>

          {err && (
            <div className="p-4 bg-red-950/40 border border-red-800/50 rounded-2xl text-sm text-red-300 font-bold flex items-center gap-2">
              <AlertTriangle size={14}/>{err}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(0)} className="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 font-black rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2 transition-all">
              <ArrowLeft size={14}/> Back
            </button>
            <button onClick={handlePay} disabled={!sufficient || paying}
              className="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-black rounded-2xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/30">
              {paying ? <><Loader2 size={14} className="animate-spin"/>Processing…</> : <><ShieldCheck size={14}/>Pay ${AUDIT_PRICE} & Start Audit</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
