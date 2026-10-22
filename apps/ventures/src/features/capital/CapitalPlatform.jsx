import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
  Building2, FileText, BarChart3, ShieldCheck, PenLine, Zap,
  LayoutDashboard, Upload, ChevronRight, CheckCircle2, AlertCircle,
  Loader2, TrendingUp, Lock, Globe, Users, Clock, DollarSign,
  RefreshCw, X, ArrowRight, Award, AlertTriangle, FileCheck,
  Milestone, BadgeCheck, Banknote, Activity
} from 'lucide-react';

const INVOKE = (action, payload, userId) =>
  supabase.functions.invoke('capital-engine', { body: { action, payload, userId } });

const STEPS = [
  { id: 'overview',   label: 'Overview',    icon: LayoutDashboard },
  { id: 'submit',     label: 'Submit',      icon: FileText        },
  { id: 'analysis',   label: 'Analysis',    icon: BarChart3       },
  { id: 'package',    label: 'Package',     icon: FileCheck       },
  { id: 'agreement',  label: 'Agreement',   icon: PenLine       },
  { id: 'activation', label: 'Activation',  icon: Zap             },
  { id: 'dashboard',  label: 'Live Track',  icon: Activity        },
];

const RISK_COLOR = (score) => {
  if (score >= 85) return { text: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200',    label: 'CRITICAL' };
  if (score >= 70) return { text: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', label: 'HIGH'     };
  if (score >= 40) return { text: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200',  label: 'MODERATE' };
  return             { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'LOW' };
};

function Toast({ n }) {
  if (!n) return null;
  const bg = n.type === 'success' ? 'bg-emerald-600' : 'bg-red-600';
  return (
    <div className={`fixed top-4 right-4 z-[999] ${bg} text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-bold flex items-center gap-2 animate-in slide-in-from-top-4`}>
      {n.type === 'success' ? <CheckCircle2 size={16}/> : <AlertCircle size={16}/>}
      {n.text}
    </div>
  );
}

function StepBar({ current }) {
  const idx = STEPS.findIndex(s => s.id === current);
  return (
    <div className="flex items-center gap-0 mb-8 overflow-x-auto no-scrollbar">
      {STEPS.map((step, i) => {
        const done    = i < idx;
        const active  = i === idx;
        const Icon    = step.icon;
        return (
          <React.Fragment key={step.id}>
            <div className={`flex flex-col items-center gap-1 shrink-0 ${active ? 'opacity-100' : done ? 'opacity-70' : 'opacity-30'}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center border-2 transition-all ${
                done   ? 'bg-emerald-600 border-emerald-600 text-white' :
                active ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' :
                         'bg-white border-slate-200 text-slate-400'
              }`}>
                {done ? <CheckCircle2 size={16}/> : <Icon size={15}/>}
              </div>
              <span className={`text-[9px] font-black uppercase tracking-widest ${active ? 'text-blue-600' : done ? 'text-emerald-600' : 'text-slate-400'}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 min-w-[16px] ${i < idx ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function RiskBar({ label, score }) {
  const c = RISK_COLOR(score);
  return (
    <div>
      <div className="flex justify-between text-xs font-bold mb-1">
        <span className="text-slate-600">{label}</span>
        <span className={c.text}>{Math.round(score)}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${c.text.replace('text-', 'bg-')}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

export default function CapitalPlatform({ session, profile }) {
  const userId = session?.user?.id;
  const [step, setStep]           = useState('overview');
  const [projects, setProjects]   = useState([]);
  const [activeProj, setActiveProj] = useState(null);
  const [analysis, setAnalysis]   = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [agreement, setAgreement] = useState(null);
  const [loading, setLoading]     = useState(false);
  const [toast, setToast]         = useState(null);
  const [docLoading, setDocLoading] = useState(false);
  const fileRef = useRef();

  const [form, setForm] = useState({
    company_name: profile?.full_name || '', project_name: '',
    description: '', sector: '', stage: 'growth',
    geography: '', capital_needed: '', capital_type_pref: 'hybrid',
    timeline_months: '12', team_size: '5', annual_revenue: '',
  });

  const notify = (type, text) => { setToast({ type, text }); setTimeout(() => setToast(null), 4500); };

  useEffect(() => { if (userId) loadProjects(); }, [userId]);

  const loadProjects = async () => {
    setLoading(true);
    const { data } = await supabase.from('capital_projects').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    setProjects(data || []);
    setLoading(false);
  };

  const loadProjectDetail = async (proj) => {
    setActiveProj(proj);
    const [{ data: a }, { data: m }, { data: ag }] = await Promise.all([
      supabase.from('capital_analyses').select('*').eq('project_id', proj.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('capital_milestones').select('*').eq('project_id', proj.id).order('phase'),
      supabase.from('capital_agreements').select('*').eq('project_id', proj.id).maybeSingle(),
    ]);
    setAnalysis(a || null);
    setMilestones(m || []);
    setAgreement(ag || null);
    // Set correct step based on project status
    const statusStep = { submitted: 'analysis', analyzing: 'analysis', packaged: 'package', agreement_pending: 'agreement', active: 'dashboard' };
    setStep(statusStep[proj.status] || 'dashboard');
  };

  // ── DOCUMENT UPLOAD + AI EXTRACTION ──────────────────────────────────────
  const handleDocUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = String(ev.target.result).split(',')[1];
        const { data } = await INVOKE('extract_document', {
          file_base64: base64,
          file_type: file.type,
          project_hint: form.project_name,
        }, userId);
        if (data?.extracted && Object.keys(data.extracted).length > 0) {
          const ex = data.extracted;
          setForm(p => ({
            ...p,
            company_name:       ex.company_name      || p.company_name,
            project_name:       ex.project_name      || p.project_name,
            description:        ex.description       || p.description,
            sector:             ex.sector            || p.sector,
            geography:          ex.geography         || p.geography,
            capital_needed:     ex.capital_needed    ? String(ex.capital_needed)    : p.capital_needed,
            capital_type_pref:  ex.capital_type_pref || p.capital_type_pref,
            timeline_months:    ex.timeline_months   ? String(ex.timeline_months)   : p.timeline_months,
            team_size:          ex.team_size         ? String(ex.team_size)         : p.team_size,
            annual_revenue:     ex.annual_revenue    ? String(ex.annual_revenue)    : p.annual_revenue,
            stage:              ex.stage             || p.stage,
          }));
          notify('success', 'Document analyzed — form pre-filled by AI');
        } else {
          notify('error', 'Could not extract data from document — please fill manually');
        }
        setDocLoading(false);
      };
      reader.readAsDataURL(file);
    } catch { setDocLoading(false); notify('error', 'Upload failed'); }
  };

  // ── SUBMIT PROJECT ────────────────────────────────────────────────────────
  const submitProject = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await INVOKE('submit_project', {
        ...form,
        capital_needed: parseFloat(form.capital_needed),
        timeline_months: parseInt(form.timeline_months),
        team_size: parseInt(form.team_size),
        annual_revenue: parseFloat(form.annual_revenue || '0'),
      }, userId);
      if (error || data?.error) throw new Error(data?.error || 'Submit failed');
      notify('success', 'Project submitted — running AI analysis...');
      setActiveProj(data.project);
      await runAnalysis(data.project.id);
    } catch (err) { notify('error', err.message); }
    finally { setLoading(false); }
  };

  const runAnalysis = async (projectId) => {
    setLoading(true);
    setStep('analysis');
    try {
      const { data, error } = await INVOKE('analyze_project', { project_id: projectId }, userId);
      if (error || data?.error) throw new Error(data?.error || 'Analysis failed');
      setAnalysis(data.analysis);
      setMilestones(data.milestones || []);
      await loadProjects();
      notify('success', 'Analysis complete — review your capital package');
      setTimeout(() => setStep('package'), 800);
    } catch (err) { notify('error', err.message); }
    finally { setLoading(false); }
  };

  // ── SIGN AGREEMENT ────────────────────────────────────────────────────────
  const signAgreement = async () => {
    if (!activeProj) return;
    setLoading(true);
    try {
      const { data, error } = await INVOKE('sign_agreement', { project_id: activeProj.id }, userId);
      if (error || data?.error) throw new Error(data?.error || 'Signing failed');
      setAgreement(data.agreement);
      notify('success', `Agreement signed · TX: ${data.txHash?.slice(0, 14)}...`);
      setStep('activation');
      loadProjects();
    } catch (err) { notify('error', err.message); }
    finally { setLoading(false); }
  };

  // ── SUBMIT MILESTONE ──────────────────────────────────────────────────────
  const submitMilestone = async (milestoneId, notes) => {
    setLoading(true);
    try {
      const { data, error } = await INVOKE('submit_milestone', { milestone_id: milestoneId, notes }, userId);
      if (error || data?.error) throw new Error(data?.error || 'Failed');
      notify('success', `Milestone approved · Capital tranche released · TX: ${data.txHash?.slice(0,12)}...`);
      if (activeProj) await loadProjectDetail(activeProj);
    } catch (err) { notify('error', err.message); }
    finally { setLoading(false); }
  };

  const statusBadge = (status) => ({
    submitted:          'bg-blue-100 text-blue-700',
    analyzing:          'bg-purple-100 text-purple-700',
    packaged:           'bg-amber-100 text-amber-700',
    agreement_pending:  'bg-orange-100 text-orange-700',
    active:             'bg-emerald-100 text-emerald-700',
    paused:             'bg-red-100 text-red-700',
    completed:          'bg-slate-100 text-slate-600',
  }[status] || 'bg-slate-100 text-slate-600');

  const milestoneStatusColor = (s) => ({
    pending:     'bg-slate-100 text-slate-500',
    in_progress: 'bg-blue-100 text-blue-700',
    submitted:   'bg-amber-100 text-amber-700',
    approved:    'bg-emerald-100 text-emerald-700',
    released:    'bg-green-100 text-green-700',
    failed:      'bg-red-100 text-red-700',
  }[s] || 'bg-slate-100 text-slate-500');

  // ── RENDER ────────────────────────────────────────────────────────────────

  // OVERVIEW / PROJECT LIST
  if (step === 'overview' || (!activeProj && step !== 'submit')) {
    return (
      <div className="space-y-6 animate-in fade-in pb-20">
        <Toast n={toast} />

        {/* Hero */}
        <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
          <Building2 size={200} className="absolute -right-10 -bottom-10 opacity-5"/>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-300 mb-2">IFB Capital Operating System</p>
            <h2 className="text-3xl font-black tracking-tight mb-3">Capital for Companies</h2>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed mb-6">
              Submit your project. IFB structures the capital, scores the risk, generates the legal agreement, and tracks every milestone with on-chain tranche releases. Institutional-grade infrastructure — for any company, globally.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                ['Capital Structured', 'grant · debt · equity · hybrid'],
                ['Risk Scored', 'country · execution · financial · governance'],
                ['Legal Package', 'smart contract + signed PDF'],
                ['Live Tracking', 'milestone governance + auto-release'],
              ].map(([title, sub]) => (
                <div key={title} className="bg-white/10 rounded-2xl p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-300 mb-1">{title}</p>
                  <p className="text-xs text-slate-300 font-semibold">{sub}</p>
                </div>
              ))}
            </div>
            <button onClick={() => { setActiveProj(null); setStep('submit'); setAnalysis(null); setMilestones([]); setAgreement(null); }}
              className="bg-white text-slate-900 font-black text-xs uppercase tracking-widest px-8 py-3.5 rounded-2xl hover:bg-blue-50 transition-colors flex items-center gap-2 shadow-lg">
              <Building2 size={14}/> Submit New Project <ChevronRight size={14}/>
            </button>
          </div>
        </div>

        {/* Fee structure at a glance */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Structuring Fee',   value: '1–3%',      icon: DollarSign,  color: 'text-blue-600',    bg: 'bg-blue-50' },
            { label: 'Risk Mgmt Fee',     value: '0.5–2%',    icon: ShieldCheck, color: 'text-purple-600',  bg: 'bg-purple-50' },
            { label: 'Platform Fee',      value: '$1K–$10K',  icon: Zap,         color: 'text-amber-600',   bg: 'bg-amber-50' },
            { label: 'Success Fee',       value: '1–2%',      icon: Award,       color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Monitoring',        value: '$100–$2K/mo', icon: Activity,  color: 'text-indigo-600',  bg: 'bg-indigo-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`${bg} rounded-2xl p-4 border border-white`}>
              <Icon size={16} className={`${color} mb-2`}/>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">{label}</p>
              <p className={`font-black text-sm ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Existing projects */}
        {projects.length > 0 && (
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
              <FileText size={12}/> Your Projects
            </h3>
            <div className="space-y-3">
              {projects.map(p => (
                <button key={p.id} onClick={() => loadProjectDetail(p)}
                  className="w-full bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all text-left flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-black text-slate-900 truncate">{p.project_name}</p>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${statusBadge(p.status)}`}>{p.status}</span>
                    </div>
                    <p className="text-xs text-slate-500 font-semibold">{p.company_name} · {p.sector} · ${parseFloat(p.capital_needed).toLocaleString()} · {p.geography}</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-400 shrink-0"/>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  // STEP 1 — SUBMIT
  if (step === 'submit') {
    return (
      <div className="space-y-6 animate-in fade-in pb-20 max-w-2xl mx-auto">
        <Toast n={toast} />
        <StepBar current="submit" />
        <button onClick={() => setStep('overview')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-sm mb-2">
          <X size={14}/> Cancel
        </button>

        {/* AI Document Upload */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
              <Upload size={16} className="text-blue-600"/>
            </div>
            <div className="flex-1">
              <p className="font-black text-slate-900 text-sm mb-1">AI Document Extraction</p>
              <p className="text-xs text-slate-500 mb-3">Upload your pitch deck, business plan, or proposal — AI will pre-fill the form for you. Or fill manually below.</p>
              <input type="file" ref={fileRef} accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={handleDocUpload} className="hidden"/>
              <button onClick={() => fileRef.current?.click()} disabled={docLoading}
                className="bg-blue-600 text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                {docLoading ? <Loader2 size={13} className="animate-spin"/> : <Upload size={13}/>}
                {docLoading ? 'Extracting with AI...' : 'Upload Document'}
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={submitProject} className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-5">
          <h3 className="font-black text-slate-900 text-lg flex items-center gap-2"><FileText size={18} className="text-blue-600"/> Project Details</h3>

          <div className="grid grid-cols-2 gap-4">
            {[
              { key: 'company_name',  label: 'Company Name', placeholder: 'Acme Corp', required: true },
              { key: 'project_name',  label: 'Project Name', placeholder: 'Solar Farm Phase 1', required: true },
            ].map(f => (
              <div key={f.key}>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">{f.label}</label>
                <input required={f.required} value={form[f.key]} onChange={e => setForm(p => ({...p, [f.key]: e.target.value}))}
                  placeholder={f.placeholder}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-400"/>
              </div>
            ))}
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Project Description</label>
            <textarea rows={3} value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))}
              placeholder="What is this project, what problem does it solve, what is the expected impact?"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-400 resize-none"/>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Sector</label>
              <select value={form.sector} onChange={e => setForm(p => ({...p, sector: e.target.value}))} required
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-400 bg-white">
                <option value="">Select sector</option>
                {['Agriculture','Healthcare','Education','Infrastructure','Technology','Energy','Finance','Housing','Water & Sanitation','Manufacturing','Trade & Commerce','Tourism','Other'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Company Stage</label>
              <select value={form.stage} onChange={e => setForm(p => ({...p, stage: e.target.value}))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-400 bg-white">
                {[['seed','Seed / Idea'],['growth','Growth / Early Revenue'],['expansion','Expansion'],['maturity','Maturity']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Geography / Country</label>
              <input value={form.geography} onChange={e => setForm(p => ({...p, geography: e.target.value}))} required placeholder="e.g. Kenya, West Africa, Global"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-400"/>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Capital Type Preference</label>
              <select value={form.capital_type_pref} onChange={e => setForm(p => ({...p, capital_type_pref: e.target.value}))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-400 bg-white">
                {[['grant','Grant'],['debt','Debt / Loan'],['equity','Equity'],['hybrid','Hybrid / Blended']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Capital Needed (USD)</label>
              <input type="number" min="1000" required value={form.capital_needed} onChange={e => setForm(p => ({...p, capital_needed: e.target.value}))} placeholder="500000"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-400"/>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Annual Revenue (USD, if any)</label>
              <input type="number" min="0" value={form.annual_revenue} onChange={e => setForm(p => ({...p, annual_revenue: e.target.value}))} placeholder="0"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-400"/>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Timeline (months)</label>
              <input type="number" min="1" max="120" required value={form.timeline_months} onChange={e => setForm(p => ({...p, timeline_months: e.target.value}))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-400"/>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Team Size</label>
              <input type="number" min="1" value={form.team_size} onChange={e => setForm(p => ({...p, team_size: e.target.value}))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-400"/>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white rounded-2xl py-4 font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg">
            {loading ? <Loader2 size={16} className="animate-spin"/> : <BarChart3 size={16}/>}
            Submit & Run AI Analysis
          </button>
        </form>
      </div>
    );
  }

  // STEP 2 — ANALYSIS
  if (step === 'analysis') {
    return (
      <div className="space-y-6 animate-in fade-in pb-20 max-w-3xl mx-auto">
        <Toast n={toast} />
        <StepBar current="analysis" />

        {loading || !analysis ? (
          <div className="text-center py-16 space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <Loader2 size={28} className="animate-spin text-blue-600"/>
            </div>
            <p className="font-black text-slate-800">IFB AI Engine running analysis...</p>
            <p className="text-xs text-slate-500">Capital structure · Risk scoring · Milestone planning · Fee calculation</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Executive Summary */}
            <div className="bg-slate-900 rounded-3xl p-8 text-white">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-300 mb-2">AI Executive Summary</p>
              <p className="text-sm text-slate-300 leading-relaxed">{analysis.executive_summary}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Capital Structure */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <h4 className="font-black text-slate-800 flex items-center gap-2 mb-4"><TrendingUp size={16} className="text-blue-600"/> Capital Structure</h4>
                <p className="text-xs font-black text-blue-600 mb-3">{analysis.recommended_structure}</p>
                <div className="space-y-3">
                  {[['Grant', analysis.grant_pct, 'emerald'],['Debt', analysis.debt_pct, 'blue'],['Equity', analysis.equity_pct, 'purple'],['Hybrid', analysis.hybrid_pct, 'amber']].map(([label, pct, color]) => (
                    pct > 0 ? (
                      <div key={label}>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-slate-600">{label}</span>
                          <span className={`text-${color}-600`}>{pct}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full bg-${color}-500 rounded-full`} style={{ width: `${pct}%` }}/>
                        </div>
                      </div>
                    ) : null
                  ))}
                </div>
              </div>

              {/* Risk Assessment */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <h4 className="font-black text-slate-800 flex items-center gap-2 mb-2"><ShieldCheck size={16} className="text-red-500"/> Risk Assessment</h4>
                {(() => {
                  const rc = RISK_COLOR(analysis.total_risk_score);
                  return <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${rc.bg} ${rc.text} ${rc.border} border mb-3 inline-block`}>{rc.label} — {Math.round(analysis.total_risk_score)}/100</span>;
                })()}
                <div className="space-y-2.5">
                  <RiskBar label="Country Risk"    score={analysis.country_risk}    />
                  <RiskBar label="Execution Risk"  score={analysis.execution_risk}  />
                  <RiskBar label="Financial Risk"  score={analysis.financial_risk}  />
                  <RiskBar label="Governance Risk" score={analysis.governance_risk} />
                </div>
              </div>
            </div>

            {/* Risk Mitigation */}
            {analysis.risk_mitigation && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <p className="font-black text-amber-800 mb-2 flex items-center gap-2 text-sm"><AlertTriangle size={14}/> Risk Mitigation Plan</p>
                <ul className="space-y-1">
                  {(typeof analysis.risk_mitigation === 'string' ? JSON.parse(analysis.risk_mitigation) : analysis.risk_mitigation).map((item, i) => (
                    <li key={i} className="text-xs text-amber-700 font-semibold flex items-start gap-2"><span className="text-amber-500 mt-0.5">•</span>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Milestones */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <h4 className="font-black text-slate-800 flex items-center gap-2 mb-4"><Milestone size={16} className="text-indigo-600"/> Milestone Timeline</h4>
              <div className="space-y-3">
                {milestones.map(m => (
                  <div key={m.phase || m.id} className="flex items-start gap-4 p-3 bg-slate-50 rounded-2xl">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                      <span className="text-indigo-700 font-black text-xs">{m.phase}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-800 text-sm">{m.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{m.deliverable}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-black text-indigo-600">{m.capital_pct}%</p>
                      <p className="text-[10px] text-slate-400">Day {m.due_days}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => setStep('package')}
              className="w-full bg-blue-600 text-white rounded-2xl py-4 font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
              View Full Investment Package <ArrowRight size={16}/>
            </button>
          </div>
        )}
      </div>
    );
  }

  // STEP 3 — PACKAGE
  if (step === 'package') {
    const capital = parseFloat(activeProj?.capital_needed || 0);
    const sf = capital * ((analysis?.structuring_fee_pct || 2) / 100);
    const rf = capital * ((analysis?.risk_fee_pct || 1) / 100);
    const total = sf + rf + (analysis?.platform_fee_usd || 5000);

    return (
      <div className="space-y-6 animate-in fade-in pb-20 max-w-3xl mx-auto">
        <Toast n={toast} />
        <StepBar current="package" />

        <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden">
          <FileCheck size={120} className="absolute -right-8 -bottom-8 opacity-5"/>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-300 mb-2">IFB Investment Package</p>
            <h2 className="text-2xl font-black mb-1">{activeProj?.project_name}</h2>
            <p className="text-slate-400 text-sm">{activeProj?.company_name} · {activeProj?.sector} · {activeProj?.geography}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Capital Sought',    value: `$${capital.toLocaleString()}`,          icon: DollarSign,  color: 'text-blue-600'    },
            { label: 'Structure',         value: analysis?.recommended_structure || '—',   icon: TrendingUp,  color: 'text-purple-600'  },
            { label: 'Risk Level',        value: analysis?.risk_label || 'MODERATE',       icon: ShieldCheck, color: 'text-amber-600'   },
            { label: 'Timeline',          value: `${activeProj?.timeline_months} months`,  icon: Clock,       color: 'text-indigo-600'  },
            { label: 'Milestones',        value: `${milestones.length} phases`,            icon: Milestone,   color: 'text-emerald-600' },
            { label: 'Total Upfront Fees',value: `$${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: Banknote, color: 'text-rose-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <Icon size={16} className={`${color} mb-2`}/>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">{label}</p>
              <p className={`font-black text-sm ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-3">
          <h4 className="font-black text-slate-800 flex items-center gap-2"><Banknote size={16} className="text-rose-500"/> Fee Schedule</h4>
          {[
            [`Structuring Fee (${analysis?.structuring_fee_pct || 2}%)`, sf],
            [`Risk Management Fee (${analysis?.risk_fee_pct || 1}%)`,     rf],
            ['Platform Activation Fee',                   analysis?.platform_fee_usd || 5000],
          ].map(([label, amt]) => (
            <div key={label} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
              <span className="text-sm font-semibold text-slate-600">{label}</span>
              <span className="font-black text-slate-900">${Number(amt).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
          ))}
          <div className="flex justify-between items-center pt-2 font-black text-slate-900 text-base">
            <span>Total Upfront</span>
            <span className="text-rose-600">${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
          <p className="text-xs text-slate-500 pt-1">+ ${(analysis?.monitoring_monthly || 500).toLocaleString()}/month monitoring · + {analysis?.success_fee_pct || 1.5}% success fee on deployment</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h4 className="font-black text-slate-800 mb-2 flex items-center gap-2"><FileText size={16} className="text-slate-500"/> Reporting Obligations</h4>
          <p className="text-sm text-slate-600 leading-relaxed">{analysis?.reporting_obligations}</p>
        </div>

        <button onClick={() => setStep('agreement')}
          className="w-full bg-slate-900 text-white rounded-2xl py-4 font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
          Proceed to Agreement <PenLine size={16}/>
        </button>
      </div>
    );
  }

  // STEP 4 — AGREEMENT
  if (step === 'agreement') {
    return (
      <div className="space-y-6 animate-in fade-in pb-20 max-w-2xl mx-auto">
        <Toast n={toast} />
        <StepBar current="agreement" />

        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          <h3 className="font-black text-slate-900 text-lg flex items-center gap-2 mb-4">
            <PenLine size={18} className="text-blue-600"/> IFB Collaboration Agreement
          </h3>
          <div className="bg-slate-50 rounded-2xl p-5 font-mono text-xs text-slate-700 leading-relaxed max-h-64 overflow-y-auto border border-slate-200 mb-5 whitespace-pre-line">
            {`IFB COLLABORATION AGREEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Project: ${activeProj?.project_name}
Company: ${activeProj?.company_name}
Capital: $${parseFloat(activeProj?.capital_needed || 0).toLocaleString()} USD
Structure: ${analysis?.recommended_structure || 'Blended Finance'}
Risk Level: ${analysis?.risk_label || 'MODERATE'}

CAPITAL STRUCTURE
  Grant ${analysis?.grant_pct || 0}% · Debt ${analysis?.debt_pct || 0}% · Equity ${analysis?.equity_pct || 0}% · Hybrid ${analysis?.hybrid_pct || 0}%

GOVERNANCE
  Capital is released in staged tranches upon milestone completion verified by IFB.
  If 2 consecutive milestones are missed, IFB reserves right to pause and restructure.

REPORTING OBLIGATIONS
  ${analysis?.reporting_obligations || 'Quarterly reports, milestone evidence, annual audit'}

RISK ACKNOWLEDGMENT
  Risk Score: ${analysis?.total_risk_score || 50}/100 (${analysis?.risk_label || 'MODERATE'})

By signing, client confirms full agreement to all terms.`}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3 mb-5">
            <Lock size={14} className="text-blue-600 mt-0.5"/>
            <p className="text-xs text-blue-700 font-bold leading-relaxed">
              Your digital signature will be hashed with SHA-256 and recorded on the AFR blockchain. This agreement is legally binding under IFB terms of service.
            </p>
          </div>

          <button onClick={signAgreement} disabled={loading}
            className="w-full bg-blue-600 text-white rounded-2xl py-4 font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg">
            {loading ? <Loader2 size={16} className="animate-spin"/> : <BadgeCheck size={16}/>}
            Digitally Sign & Activate
          </button>
        </div>
      </div>
    );
  }

  // STEP 5 — ACTIVATION
  if (step === 'activation') {
    const capital = parseFloat(activeProj?.capital_needed || 0);
    return (
      <div className="space-y-6 animate-in fade-in pb-20 max-w-2xl mx-auto">
        <Toast n={toast} />
        <StepBar current="activation" />

        <div className="bg-white rounded-3xl border border-emerald-200 p-10 shadow-sm text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-600"/>
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2">Project Activated</h3>
          <p className="text-sm text-slate-500 mb-4">Agreement signed · Blockchain recorded · Milestone 1 is now live</p>
          {agreement?.blockchain_tx && (
            <p className="text-[10px] font-mono text-slate-400 bg-slate-50 px-4 py-2 rounded-xl inline-block border border-slate-200 mb-4">TX: {agreement.blockchain_tx}</p>
          )}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[['Capital',`$${capital.toLocaleString()}`],['Milestones',`${milestones.length} Phases`],['Status','ACTIVE']].map(([l,v]) => (
              <div key={l} className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-1">{l}</p>
                <p className="font-black text-emerald-900 text-sm">{v}</p>
              </div>
            ))}
          </div>
          <button onClick={() => setStep('dashboard')}
            className="bg-slate-900 text-white font-black text-xs uppercase tracking-widest px-8 py-3.5 rounded-2xl hover:bg-slate-800 transition-colors flex items-center gap-2 mx-auto">
            <LayoutDashboard size={14}/> Open Live Dashboard <ChevronRight size={14}/>
          </button>
        </div>
      </div>
    );
  }

  // STEP 6 — LIVE DASHBOARD
  if (step === 'dashboard') {
    const capital = parseFloat(activeProj?.capital_needed || 0);
    const completedMilestones = milestones.filter(m => m.capital_released).length;
    const releasedCapital     = milestones.filter(m => m.capital_released).reduce((s, m) => s + (capital * m.capital_pct / 100), 0);
    const progressPct         = milestones.length > 0 ? Math.round((completedMilestones / milestones.length) * 100) : 0;

    return (
      <div className="space-y-6 animate-in fade-in pb-20">
        <Toast n={toast} />
        <StepBar current="dashboard" />

        <button onClick={() => { setActiveProj(null); setStep('overview'); loadProjects(); }}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-sm">
          <X size={14}/> Back to Projects
        </button>

        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 to-blue-950 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
          <Activity size={120} className="absolute -right-8 -bottom-8 opacity-5"/>
          <div className="relative z-10">
            <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-300 mb-1">{activeProj?.company_name} · {activeProj?.sector}</p>
                <h2 className="text-2xl font-black">{activeProj?.project_name}</h2>
                <p className="text-slate-400 text-sm mt-1">{activeProj?.geography}</p>
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl ${statusBadge(activeProj?.status)}`}>{activeProj?.status}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                ['Total Capital',   `$${capital.toLocaleString()}`],
                ['Released',        `$${releasedCapital.toLocaleString(undefined, {maximumFractionDigits:0})}`],
                ['Progress',        `${progressPct}%`],
                ['Risk Score',      `${Math.round(analysis?.total_risk_score || 0)}/100`],
              ].map(([l, v]) => (
                <div key={l} className="bg-white/10 rounded-2xl p-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-blue-300 mb-1">{l}</p>
                  <p className="text-lg font-black">{v}</p>
                </div>
              ))}
            </div>
            {/* Progress bar */}
            <div className="mt-4">
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${progressPct}%` }}/>
              </div>
              <p className="text-[10px] text-slate-400 font-bold mt-1">{completedMilestones}/{milestones.length} milestones completed</p>
            </div>
          </div>
        </div>

        {/* Milestones */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <Milestone size={12}/> Milestone Governance
          </h3>
          {milestones.map(m => {
            const capitalAmt = capital * (m.capital_pct / 100);
            const [noteVal, setNoteVal] = React.useState('');
            return (
              <div key={m.id} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                      <span className="text-indigo-700 font-black text-sm">{m.phase}</span>
                    </div>
                    <div>
                      <p className="font-black text-slate-900">{m.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{m.deliverable}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-indigo-700 text-sm">${capitalAmt.toLocaleString(undefined, {maximumFractionDigits:0})} ({m.capital_pct}%)</span>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${milestoneStatusColor(m.status)}`}>{m.status}</span>
                  </div>
                </div>

                {m.capital_released && (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 mb-3">
                    <CheckCircle2 size={13} className="text-emerald-600"/>
                    <span className="text-xs font-black text-emerald-700">Capital released · TX: {m.tx_hash?.slice(0,14)}...</span>
                  </div>
                )}

                {m.status === 'in_progress' && (
                  <div className="flex gap-3 mt-3">
                    <input value={noteVal} onChange={e => setNoteVal(e.target.value)} placeholder="Completion notes / evidence link..."
                      className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-indigo-400"/>
                    <button onClick={() => submitMilestone(m.id, noteVal)} disabled={loading}
                      className="bg-indigo-600 text-white rounded-xl px-5 py-2.5 font-black text-xs uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1">
                      {loading ? <Loader2 size={12} className="animate-spin"/> : <CheckCircle2 size={12}/>} Complete
                    </button>
                  </div>
                )}

                {m.due_days && (
                  <p className="text-[10px] text-slate-400 font-bold mt-2"><Clock size={10} className="inline mr-1"/>Due: Day {m.due_days} from activation</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Risk snapshot */}
        {analysis && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h4 className="font-black text-slate-800 flex items-center gap-2 mb-4"><ShieldCheck size={16} className="text-amber-500"/> Live Risk Profile</h4>
            <div className="grid grid-cols-2 gap-3">
              <RiskBar label="Country Risk"    score={analysis.country_risk}    />
              <RiskBar label="Execution Risk"  score={analysis.execution_risk}  />
              <RiskBar label="Financial Risk"  score={analysis.financial_risk}  />
              <RiskBar label="Governance Risk" score={analysis.governance_risk} />
            </div>
            {analysis.early_warnings && (
              <div className="mt-4 bg-amber-50 rounded-2xl p-4 border border-amber-100">
                <p className="text-xs font-black text-amber-700 mb-2 flex items-center gap-1"><AlertTriangle size={12}/> Early Warning Indicators</p>
                <ul className="space-y-1">
                  {(typeof analysis.early_warnings === 'string' ? JSON.parse(analysis.early_warnings) : analysis.early_warnings).map((w, i) => (
                    <li key={i} className="text-xs text-amber-600 font-semibold">• {w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return null;
}
