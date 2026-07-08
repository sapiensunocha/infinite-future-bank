import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
  Lock, Mail, Shield, ChevronRight, ChevronLeft, Check, X,
  Plus, Search, Filter, Upload, DollarSign, User, Building2,
  FileText, Globe, Phone, MapPin, Briefcase, Target,
  TrendingUp, Users, Clock, RefreshCw, AlertCircle,
  CheckCircle2, Eye, Download, Trash2, Edit3, ArrowLeft,
  CreditCard, Banknote, Wifi, XCircle, ChevronDown,
  BarChart3, Layers, Rocket, Zap
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const SECTORS = [
  'Agriculture & AgroTech', 'FinTech & Banking', 'HealthTech & Pharma',
  'EdTech & Training', 'Energy & CleanTech', 'Real Estate & Construction',
  'Logistics & Transport', 'Retail & E-Commerce', 'Manufacturing & Industry',
  'Media & Entertainment', 'Tourism & Hospitality', 'ICT & Software',
  'Mining & Resources', 'Fashion & Lifestyle', 'Food & Beverage',
  'NGO & Social Enterprise', 'Other',
];

const COUNTRIES = [
  'Algeria','Angola','Benin','Botswana','Burkina Faso','Burundi','Cameroon',
  'Cape Verde','Central African Republic','Chad','Comoros','Congo','DRC',
  'Djibouti','Egypt','Equatorial Guinea','Eritrea','Ethiopia','Gabon','Gambia',
  'Ghana','Guinea','Guinea-Bissau','Ivory Coast','Kenya','Lesotho','Liberia',
  'Libya','Madagascar','Malawi','Mali','Mauritania','Mauritius','Morocco',
  'Mozambique','Namibia','Niger','Nigeria','Rwanda','Sao Tome','Senegal',
  'Seychelles','Sierra Leone','Somalia','South Africa','South Sudan','Sudan',
  'Swaziland','Tanzania','Togo','Tunisia','Uganda','Zambia','Zimbabwe',
  // Global
  'France','United States','United Kingdom','Belgium','Canada','Germany',
  'China','India','Brazil','UAE','Saudi Arabia','Other',
];

const PAYMENT_TIERS = [
  { id: 'startup',    label: 'Startup',    min: 100000,   max: 499999,   description: 'Idea / Pre-MVP, team < 5' },
  { id: 'sme',        label: 'SME',        min: 500000,   max: 1999999,  description: 'MVP / Early growth, team 5–20' },
  { id: 'corporate',  label: 'Corporate',  min: 2000000,  max: 9999999,  description: 'Growth stage, team 20–100' },
  { id: 'enterprise', label: 'Enterprise', min: 10000000, max: null,     description: 'Scaling / Global, team 100+' },
];

const VENTUREX_STAGES = [
  { id: 'intake',       label: 'Intake',       color: 'bg-blue-500',    desc: 'Application received & reviewed' },
  { id: 'evaluation',   label: 'Evaluation',   color: 'bg-violet-500',  desc: 'Due diligence & assessment' },
  { id: 'structuring',  label: 'Structuring',  color: 'bg-amber-500',   desc: 'Deal structure & terms' },
  { id: 'financing',    label: 'Financing',    color: 'bg-emerald-500', desc: 'Capital mobilization' },
  { id: 'execution',    label: 'Execution',    color: 'bg-teal-500',    desc: 'Deployment & monitoring' },
];

const STATUS_CONFIG = {
  registered:      { label: 'Registered',      color: 'bg-slate-500',   text: 'text-slate-300' },
  payment_pending: { label: 'Payment Pending',  color: 'bg-amber-500',   text: 'text-amber-300' },
  active:          { label: 'Active',           color: 'bg-emerald-500', text: 'text-emerald-300' },
  in_pipeline:     { label: 'In Pipeline',      color: 'bg-blue-500',    text: 'text-blue-300' },
  archived:        { label: 'Archived',         color: 'bg-red-500',     text: 'text-red-300' },
};

const FORM_STEPS = [
  { id: 'founder',    title: 'Founder Profile',     icon: User },
  { id: 'project',    title: 'Project Details',      icon: Briefcase },
  { id: 'financing',  title: 'Financing Needs',      icon: DollarSign },
  { id: 'documents',  title: 'Documents',            icon: FileText },
  { id: 'payment',    title: 'Activation Payment',   icon: CreditCard },
  { id: 'review',     title: 'Review & Submit',      icon: CheckCircle2 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const inp  = 'w-full bg-[#1a2035] border border-slate-700/60 px-4 py-3 rounded-xl text-sm font-medium text-white outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-500';
const sel  = inp + ' cursor-pointer appearance-none';
const lbl  = 'block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5';
const card = 'bg-[#111827] border border-slate-800/80 rounded-2xl p-6';

function Field({ label, required, children }) {
  return (
    <div>
      <label className={lbl}>{label}{required && <span className="text-red-400 ml-1">*</span>}</label>
      {children}
    </div>
  );
}

const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

function callEdge(fn, body, adminToken) {
  return fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'x-kyc-admin-token': adminToken || '',
    },
    body: JSON.stringify(body),
  }).then(r => r.json());
}

function getStoredSession() {
  try {
    const raw = sessionStorage.getItem('kyc_admin_session');
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s.exp < Date.now()) { sessionStorage.removeItem('kyc_admin_session'); return null; }
    return s;
  } catch { return null; }
}

// ─── Login View ──────────────────────────────────────────────────────────────

function LoginView({ onLogin }) {
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!accepted) { setError('You must accept the terms to proceed.'); return; }
    setLoading(true); setError('');
    try {
      const res = await callEdge('kyc-admin-auth', { email: email.trim().toLowerCase(), passcode, acceptedTerms: true });
      if (res.error) { setError(res.error); return; }
      const session = { ...res.admin, token: res.token, exp: Date.now() + 8 * 60 * 60 * 1000 };
      sessionStorage.setItem('kyc_admin_session', JSON.stringify(session));
      onLogin(session);
    } catch { setError('Connection error. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#070B14] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1 mb-6">
            {['D','E','U','S'].map((l,i) => (
              <span key={l} className="text-5xl font-black" style={{ color: ['#4285F4','#EA4335','#FBBC04','#34A853'][i] }}>{l}</span>
            ))}
          </div>
          <h1 className="text-2xl font-black text-white">KYC Admin Portal</h1>
          <p className="text-slate-400 text-sm mt-2">Restricted access — authorized personnel only</p>
        </div>

        <div className="bg-[#0F1629] border border-slate-700/50 rounded-3xl p-8">
          <div className="flex items-center gap-3 mb-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
            <Shield size={20} className="text-amber-400 flex-shrink-0" />
            <p className="text-amber-200 text-xs font-semibold">
              This portal is monitored. Each access is logged with timestamp and IP. Misuse will result in immediate suspension.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={submit} className="space-y-5">
            <Field label="Admin Email" required>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="admin@infinitefuturebank.org"
                  className={inp + ' pl-11'} />
              </div>
            </Field>

            <Field label="Access Passcode" required>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showPass ? 'text' : 'password'} required value={passcode} onChange={e => setPasscode(e.target.value)}
                  placeholder="Enter passcode provided by HQ"
                  className={inp + ' pl-11 pr-11'} />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                  <Eye size={16} />
                </button>
              </div>
            </Field>

            <div className="bg-[#1a2035] border border-slate-700/60 rounded-2xl p-5">
              <p className="text-slate-300 text-sm font-bold mb-3">Terms & Risk Acknowledgment</p>
              <div className="space-y-2 text-slate-400 text-xs mb-4">
                <p>• I acknowledge this system handles confidential client data and is subject to IFB data policies.</p>
                <p>• I confirm I am an authorized IFB representative with clearance to register VentureX projects.</p>
                <p>• I understand that all actions are logged, audited, and legally binding.</p>
                <p>• I will not share access credentials or process unauthorized projects.</p>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <div onClick={() => setAccepted(v => !v)}
                  className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${accepted ? 'bg-blue-600 border-blue-600' : 'border-slate-600 hover:border-blue-500'}`}>
                  {accepted && <Check size={12} className="text-white" />}
                </div>
                <span className="text-slate-300 text-sm font-semibold">I accept the terms and risk acknowledgment above</span>
              </label>
            </div>

            <button type="submit" disabled={loading || !accepted}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-sm uppercase tracking-widest py-4 rounded-2xl transition-all flex items-center justify-center gap-2">
              {loading ? <><RefreshCw size={16} className="animate-spin" /> Authenticating...</> : <><Shield size={16} /> Secure Access</>}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          IFB VentureX Division · Confidential System
        </p>
      </div>
    </div>
  );
}

// ─── Project List View ────────────────────────────────────────────────────────

function ProjectsView({ adminSession, onNewProject, onSelectProject }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const load = async () => {
    setLoading(true);
    const res = await callEdge('kyc-list-projects', {}, adminSession.token);
    if (res.success) setProjects(res.projects || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = projects.filter(p => {
    const matchSearch = !search ||
      p.founder_name.toLowerCase().includes(search.toLowerCase()) ||
      p.founder_email.toLowerCase().includes(search.toLowerCase()) ||
      p.sector.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    pipeline: projects.filter(p => p.status === 'in_pipeline').length,
    pending: projects.filter(p => p.status === 'payment_pending').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Projects', value: stats.total, icon: BarChart3, color: 'text-blue-400' },
          { label: 'Active', value: stats.active, icon: CheckCircle2, color: 'text-emerald-400' },
          { label: 'In Pipeline', value: stats.pipeline, icon: Layers, color: 'text-violet-400' },
          { label: 'Payment Pending', value: stats.pending, icon: Clock, color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className={card}>
            <s.icon size={20} className={s.color + ' mb-3'} />
            <p className="text-2xl font-black text-white">{s.value}</p>
            <p className="text-xs text-slate-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, or sector..."
            className={inp + ' pl-11'} />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={sel + ' w-auto'}>
          <option value="all">All Status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button onClick={onNewProject}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm px-5 py-3 rounded-xl transition-all">
          <Plus size={16} /> New Project
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <RefreshCw size={24} className="animate-spin text-blue-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className={card + ' text-center py-16'}>
          <Briefcase size={40} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 font-bold">No projects found</p>
          <button onClick={onNewProject} className="mt-4 text-blue-400 text-sm hover:text-blue-300">Register your first project →</button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => {
            const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.registered;
            const docs = p.kyc_project_documents?.length || 0;
            const paid = p.kyc_project_payments?.some(pay => pay.payment_status === 'completed');
            return (
              <button key={p.id} onClick={() => onSelectProject(p)}
                className="w-full text-left bg-[#111827] border border-slate-800/80 hover:border-slate-600/80 rounded-2xl p-5 transition-all group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <p className="font-black text-white">{p.founder_name}</p>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${sc.color} bg-opacity-20 ${sc.text}`}>
                        {sc.label}
                      </span>
                      {p.venturex_stage && (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300">
                          {p.venturex_stage}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm truncate">{p.founder_email}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span>{p.sector}</span>
                      <span>·</span>
                      <span className="capitalize">{p.stage}</span>
                      {p.funding_amount_needed && <><span>·</span><span>{p.funding_currency} {Number(p.funding_amount_needed).toLocaleString()}</span></>}
                      <span>·</span>
                      <span>{docs} doc{docs !== 1 ? 's' : ''}</span>
                      {paid && <><span>·</span><span className="text-emerald-400">✓ Paid</span></>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 group-hover:text-slate-300 transition-colors">
                    <ChevronRight size={18} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Project Registration Form ────────────────────────────────────────────────

function NewProjectForm({ adminSession, onSuccess, onCancel }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState({});
  const fileRefs = {
    resume: useRef(),
    business_plan: useRef(),
    legal: useRef(),
    passport: useRef(),
  };

  const [form, setForm] = useState({
    // Step 0: Founder
    founder_email: '', founder_name: '', founder_phone: '', founder_country: '',
    founder_resume_text: '',
    // Step 1: Project
    project_type: 'project', sector: '', business_description: '', revenue_model: '',
    team_size: '', stage: 'idea', website: '', timeline: '',
    // Step 2: Financing
    financing_types: [], financing_other: '', funding_amount_needed: '', funding_currency: 'USD',
    // Step 3: Documents (handled separately)
    docs: {},
    // Step 4: Payment
    payment_tier: '', payment_method: '', payment_reference: '', payment_notes: '',
    payment_amount: '',
    // Other
    create_user_account: true, notes: '',
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleFinancing = (v) => setForm(p => ({
    ...p,
    financing_types: p.financing_types.includes(v)
      ? p.financing_types.filter(x => x !== v)
      : [...p.financing_types, v],
  }));

  // Derived: suggested tier from stage
  useEffect(() => {
    const map = { idea: 'startup', mvp: 'sme', growth: 'corporate', scaling: 'enterprise' };
    const t = map[form.stage];
    if (t) {
      const tier = PAYMENT_TIERS.find(x => x.id === t);
      set('payment_tier', t);
      set('payment_amount', tier?.min.toString() || '');
    }
  }, [form.stage]);

  const uploadDoc = async (docType, file) => {
    if (!file) return;
    setUploadProgress(p => ({ ...p, [docType]: 'uploading' }));
    try {
      set('docs', { ...form.docs, [docType]: file });
      setUploadProgress(p => ({ ...p, [docType]: 'ready' }));
    } catch {
      setUploadProgress(p => ({ ...p, [docType]: 'error' }));
    }
  };

  const validateStep = () => {
    if (step === 0) {
      if (!form.founder_email || !form.founder_name) { setError('Email and full name are required.'); return false; }
      if (!/\S+@\S+\.\S+/.test(form.founder_email)) { setError('Enter a valid email address.'); return false; }
    }
    if (step === 1) {
      if (!form.sector || !form.business_description || !form.stage) { setError('Sector, description and stage are required.'); return false; }
    }
    if (step === 2) {
      if (form.financing_types.length === 0) { setError('Select at least one financing type.'); return false; }
      if (!form.funding_amount_needed) { setError('Funding amount is required.'); return false; }
    }
    if (step === 4) {
      if (!form.payment_method) { setError('Select a payment method.'); return false; }
      if (!form.payment_amount) { setError('Enter payment amount.'); return false; }
      if (!form.payment_tier) { setError('Select a payment tier.'); return false; }
    }
    setError('');
    return true;
  };

  const next = () => { if (!validateStep()) return; setStep(s => s + 1); };
  const back = () => { setError(''); setStep(s => s - 1); };

  const submit = async () => {
    setSaving(true); setError('');
    try {
      // Register project
      const projectRes = await callEdge('kyc-register-project', {
        founder_email: form.founder_email,
        founder_name: form.founder_name,
        founder_phone: form.founder_phone,
        founder_country: form.founder_country,
        founder_resume_text: form.founder_resume_text,
        project_type: form.project_type,
        sector: form.sector,
        business_description: form.business_description,
        revenue_model: form.revenue_model,
        team_size: form.team_size,
        stage: form.stage,
        website: form.website,
        timeline: form.timeline,
        financing_types: form.financing_types,
        financing_other: form.financing_other,
        funding_amount_needed: parseFloat(form.funding_amount_needed) || null,
        funding_currency: form.funding_currency,
        notes: form.notes,
        create_user_account: form.create_user_account,
      }, adminSession.token);

      if (projectRes.error) { setError(projectRes.error); setSaving(false); return; }

      const projectId = projectRes.project.id;

      // Upload documents
      for (const [docType, file] of Object.entries(form.docs)) {
        if (!file) continue;
        const urlRes = await callEdge('kyc-get-upload-url', {
          project_id: projectId,
          doc_type: docType,
          file_name: file.name,
          file_size: file.size,
        }, adminSession.token);
        if (urlRes.signed_url) {
          await fetch(urlRes.signed_url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
        }
      }

      // Record payment if method selected
      if (form.payment_method && form.payment_amount && form.payment_tier) {
        await callEdge('kyc-record-payment', {
          project_id: projectId,
          amount: parseFloat(form.payment_amount),
          currency: form.funding_currency,
          tier: form.payment_tier,
          payment_method: form.payment_method,
          reference: form.payment_reference,
          notes: form.payment_notes,
        }, adminSession.token);
      }

      onSuccess(projectRes.project);
    } catch (err) {
      setError('Submission failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const steps = FORM_STEPS;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const active = i === step;
          const done = i < step;
          return (
            <div key={s.id} className="flex items-center gap-2 flex-shrink-0">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${active ? 'bg-blue-600 text-white' : done ? 'bg-emerald-600/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                {done ? <Check size={14} /> : <Icon size={14} />}
                <span className="text-xs font-bold hidden sm:block">{s.title}</span>
              </div>
              {i < steps.length - 1 && <div className={`w-6 h-px flex-shrink-0 ${i < step ? 'bg-emerald-500' : 'bg-slate-700'}`} />}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3">
          <AlertCircle size={16} className="text-red-400" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      <div className={card}>
        <h2 className="text-lg font-black text-white mb-6">{steps[step].title}</h2>

        {/* STEP 0: Founder */}
        {step === 0 && (
          <div className="space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              <Field label="Full Name" required>
                <input className={inp} value={form.founder_name} onChange={e => set('founder_name', e.target.value)} placeholder="Jean-Marie Dupont" />
              </Field>
              <Field label="Email Address" required>
                <input type="email" className={inp} value={form.founder_email} onChange={e => set('founder_email', e.target.value)} placeholder="founder@company.com" />
              </Field>
              <Field label="Phone Number">
                <input className={inp} value={form.founder_phone} onChange={e => set('founder_phone', e.target.value)} placeholder="+237 6XX XXX XXX" />
              </Field>
              <Field label="Country" required>
                <select className={sel} value={form.founder_country} onChange={e => set('founder_country', e.target.value)}>
                  <option value="">Select country...</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Founder Resume / Background (text summary)">
              <textarea rows={4} className={inp} value={form.founder_resume_text}
                onChange={e => set('founder_resume_text', e.target.value)}
                placeholder="Brief professional background, key achievements, relevant experience..." />
            </Field>
            <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
              <div onClick={() => set('create_user_account', !form.create_user_account)}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 cursor-pointer transition-all ${form.create_user_account ? 'bg-blue-600 border-blue-600' : 'border-slate-600'}`}>
                {form.create_user_account && <Check size={12} className="text-white" />}
              </div>
              <div>
                <p className="text-white text-sm font-bold">Create DEUS account for founder</p>
                <p className="text-slate-400 text-xs">Sends an email invite to the founder to access their DEUS dashboard</p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: Project Details */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              <Field label="Project Type" required>
                <div className="grid grid-cols-2 gap-3">
                  {[['project','Idea / Project',Rocket],['company','Existing Company',Building2]].map(([val, lbl2, Icon]) => (
                    <button key={val} type="button" onClick={() => set('project_type', val)}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${form.project_type === val ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-500'}`}>
                      <Icon size={20} className={form.project_type === val ? 'text-blue-400' : 'text-slate-400'} />
                      <span className="text-xs font-bold text-white">{lbl2}</span>
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Stage" required>
                <select className={sel} value={form.stage} onChange={e => set('stage', e.target.value)}>
                  {[['idea','Idea Stage'],['mvp','MVP / Prototype'],['growth','Early Growth'],['scaling','Scaling']].map(([v,l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </Field>
              <Field label="Sector of Activity" required>
                <select className={sel} value={form.sector} onChange={e => set('sector', e.target.value)}>
                  <option value="">Select sector...</option>
                  {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Team Size">
                <input type="number" min="1" className={inp} value={form.team_size} onChange={e => set('team_size', e.target.value)} placeholder="e.g. 3" />
              </Field>
              <Field label="Website (optional)">
                <input type="url" className={inp} value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://yourcompany.com" />
              </Field>
              <Field label="Implementation Timeline">
                <select className={sel} value={form.timeline} onChange={e => set('timeline', e.target.value)}>
                  <option value="">Select urgency...</option>
                  {['Immediate (< 3 months)','Short-term (3–6 months)','Medium-term (6–12 months)','Long-term (1–3 years)'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Business Description" required>
              <textarea rows={4} className={inp} value={form.business_description}
                onChange={e => set('business_description', e.target.value)}
                placeholder="Describe what the company/project does, its value proposition, target market..." />
            </Field>
            <Field label="Revenue Model">
              <textarea rows={3} className={inp} value={form.revenue_model}
                onChange={e => set('revenue_model', e.target.value)}
                placeholder="How does the business generate revenue? Pricing strategy, key customers..." />
            </Field>
            <Field label="Internal Notes">
              <textarea rows={2} className={inp} value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Any additional notes for IFB internal use..." />
            </Field>
          </div>
        )}

        {/* STEP 2: Financing */}
        {step === 2 && (
          <div className="space-y-6">
            <Field label="Financing Types Needed" required>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['investment','Equity Investment',TrendingUp],
                  ['loans','Loans / Debt Financing',Banknote],
                  ['bonds','Bonds / Securities',BarChart3],
                  ['other','Other (specify below)',Plus],
                ].map(([val, lbl2, Icon]) => (
                  <button key={val} type="button" onClick={() => toggleFinancing(val)}
                    className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 text-left ${form.financing_types.includes(val) ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-500'}`}>
                    <Icon size={18} className={form.financing_types.includes(val) ? 'text-blue-400' : 'text-slate-500'} />
                    <span className="text-sm font-bold text-white">{lbl2}</span>
                    {form.financing_types.includes(val) && <Check size={14} className="text-blue-400 ml-auto" />}
                  </button>
                ))}
              </div>
            </Field>

            {form.financing_types.includes('other') && (
              <Field label="Other Financing (specify)">
                <input className={inp} value={form.financing_other}
                  onChange={e => set('financing_other', e.target.value)}
                  placeholder="Describe the other financing type needed..." />
              </Field>
            )}

            <div className="grid md:grid-cols-2 gap-5">
              <Field label="Funding Amount Needed" required>
                <div className="relative">
                  <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="number" min="0" className={inp + ' pl-11'} value={form.funding_amount_needed}
                    onChange={e => set('funding_amount_needed', e.target.value)}
                    placeholder="e.g. 500000" />
                </div>
              </Field>
              <Field label="Currency">
                <select className={sel} value={form.funding_currency} onChange={e => set('funding_currency', e.target.value)}>
                  {['USD','EUR','XAF','GBP','CAD'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            </div>

            {/* Tier suggestion */}
            {form.stage && (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
                <p className="text-slate-300 text-sm font-bold mb-4">Recommended Activation Tiers</p>
                <div className="space-y-3">
                  {PAYMENT_TIERS.map(t => (
                    <div key={t.id} className={`flex items-center justify-between p-3 rounded-xl transition-all ${form.payment_tier === t.id ? 'bg-blue-600/20 border border-blue-500/40' : 'bg-slate-800/60 border border-slate-700/40'}`}>
                      <div>
                        <p className="text-white text-sm font-bold">{t.label}</p>
                        <p className="text-slate-400 text-xs">{t.description}</p>
                      </div>
                      <p className="text-slate-300 text-sm font-black">
                        {t.max ? `${t.min.toLocaleString()} – ${t.max.toLocaleString()}` : `${t.min.toLocaleString()}+`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Documents */}
        {step === 3 && (
          <div className="space-y-5">
            <p className="text-slate-400 text-sm">Upload documents on behalf of the founder. All files are encrypted and stored securely.</p>
            {[
              ['resume',        'Founder Resume / CV',           'PDF, DOC, DOCX'],
              ['passport',      'Passport / National ID (KYC)',  'PDF, JPG, PNG'],
              ['business_plan', 'Business Plan',                 'PDF, DOC, DOCX, PPT'],
              ['legal',         'Legal Documents (optional)',     'PDF, DOC'],
            ].map(([type, label, hint]) => {
              const file = form.docs[type];
              return (
                <div key={type} className="bg-[#1a2035] border border-slate-700/60 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-white text-sm font-bold">{label}</p>
                      <p className="text-slate-500 text-xs">{hint}</p>
                    </div>
                    {file ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-400" />
                        <span className="text-emerald-400 text-xs font-bold">Ready</span>
                        <button onClick={() => { const d = { ...form.docs }; delete d[type]; set('docs', d); }}
                          className="text-slate-500 hover:text-red-400 ml-2">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => fileRefs[type]?.current?.click()}
                        className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-bold">
                        <Upload size={14} /> Upload
                      </button>
                    )}
                  </div>
                  {file && <p className="text-slate-400 text-xs truncate">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>}
                  <input ref={fileRefs[type]} type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.ppt,.pptx" className="hidden"
                    onChange={e => { if (e.target.files?.[0]) uploadDoc(type, e.target.files[0]); }} />
                </div>
              );
            })}
          </div>
        )}

        {/* STEP 4: Payment */}
        {step === 4 && (
          <div className="space-y-5">
            <p className="text-slate-400 text-sm">Record the activation payment for this project. Payment is required to activate the account and enter the VentureX pipeline.</p>

            <Field label="Activation Tier" required>
              <div className="space-y-3">
                {PAYMENT_TIERS.map(t => (
                  <button key={t.id} type="button" onClick={() => { set('payment_tier', t.id); set('payment_amount', t.min.toString()); }}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${form.payment_tier === t.id ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-500'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-bold">{t.label}</p>
                        <p className="text-slate-400 text-xs">{t.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-black text-sm">
                          {form.funding_currency} {t.min.toLocaleString()}{t.max ? ` – ${t.max.toLocaleString()}` : '+'}
                        </p>
                        {form.payment_tier === t.id && <Check size={14} className="text-blue-400 ml-auto" />}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Field>

            <div className="grid md:grid-cols-2 gap-5">
              <Field label="Payment Amount" required>
                <div className="relative">
                  <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="number" min="100000" className={inp + ' pl-11'} value={form.payment_amount}
                    onChange={e => set('payment_amount', e.target.value)} placeholder="100000" />
                </div>
              </Field>
              <Field label="Currency">
                <select className={sel} value={form.funding_currency} onChange={e => set('funding_currency', e.target.value)}>
                  {['USD','EUR','XAF','GBP','CAD'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Payment Method" required>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['deus',          'DEUS Platform',    CreditCard],
                  ['bank_transfer', 'Bank Transfer',    Banknote],
                  ['stripe',        'Card / Stripe',    CreditCard],
                  ['offline',       'Offline / Cash',   Wifi],
                ].map(([val, lbl2, Icon]) => (
                  <button key={val} type="button" onClick={() => set('payment_method', val)}
                    className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${form.payment_method === val ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-500'}`}>
                    <Icon size={18} className={form.payment_method === val ? 'text-blue-400' : 'text-slate-500'} />
                    <span className="text-sm font-bold text-white">{lbl2}</span>
                  </button>
                ))}
              </div>
            </Field>

            <div className="grid md:grid-cols-2 gap-5">
              <Field label="Payment Reference / Transaction ID">
                <input className={inp} value={form.payment_reference} onChange={e => set('payment_reference', e.target.value)} placeholder="TXN-123456 or wire reference" />
              </Field>
              <Field label="Notes">
                <input className={inp} value={form.payment_notes} onChange={e => set('payment_notes', e.target.value)} placeholder="Additional payment notes..." />
              </Field>
            </div>

            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-200 text-xs">
              Skipping payment is possible — the project will be registered as <strong>Payment Pending</strong>. You can record payment later from the project detail view.
            </div>
          </div>
        )}

        {/* STEP 5: Review */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              {[
                ['Founder', `${form.founder_name} (${form.founder_email})`],
                ['Country', form.founder_country || 'Not specified'],
                ['Project Type', form.project_type === 'company' ? 'Existing Company' : 'Idea / Project'],
                ['Sector', form.sector],
                ['Stage', form.stage],
                ['Team Size', form.team_size || 'Not specified'],
                ['Financing', form.financing_types.join(', ')],
                ['Funding Needed', form.funding_amount_needed ? `${form.funding_currency} ${Number(form.funding_amount_needed).toLocaleString()}` : 'Not specified'],
                ['Payment Method', form.payment_method || 'Pending'],
                ['Activation Amount', form.payment_amount ? `${form.funding_currency} ${Number(form.payment_amount).toLocaleString()}` : 'Pending'],
                ['Documents', Object.keys(form.docs).length > 0 ? Object.keys(form.docs).join(', ') : 'None uploaded'],
                ['Create Account', form.create_user_account ? 'Yes — invite will be sent' : 'No'],
              ].map(([k, v]) => (
                <div key={k} className="bg-slate-800/50 rounded-xl p-4">
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider mb-1">{k}</p>
                  <p className="text-white text-sm font-semibold">{v}</p>
                </div>
              ))}
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5 text-blue-200 text-sm">
              <p className="font-bold mb-2">What happens next:</p>
              <ul className="space-y-1 text-xs text-blue-300">
                <li>Project registered in IFB VentureX database</li>
                {form.create_user_account && <li>Invite email sent to {form.founder_email}</li>}
                {Object.keys(form.docs).length > 0 && <li>{Object.keys(form.docs).length} document(s) uploaded securely</li>}
                {form.payment_method ? <li>Payment of {form.funding_currency} {Number(form.payment_amount).toLocaleString()} recorded — project ACTIVATED</li> : <li>Payment pending — project status: Payment Pending</li>}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <button onClick={step === 0 ? onCancel : back}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-bold text-sm px-4 py-3">
          <ChevronLeft size={16} /> {step === 0 ? 'Cancel' : 'Back'}
        </button>

        {step < steps.length - 1 ? (
          <button onClick={next}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-sm px-6 py-3 rounded-xl transition-all">
            Continue <ChevronRight size={16} />
          </button>
        ) : (
          <button onClick={submit} disabled={saving}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-sm px-6 py-3 rounded-xl transition-all">
            {saving ? <><RefreshCw size={16} className="animate-spin" /> Submitting...</> : <><CheckCircle2 size={16} /> Register Project</>}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Project Detail View ──────────────────────────────────────────────────────

function ProjectDetail({ project: initialProject, adminSession, onBack, onUpdate }) {
  const [project, setProject] = useState(initialProject);
  const [activeTab, setActiveTab] = useState('overview');
  const [saving, setSaving] = useState(false);
  const [payForm, setPayForm] = useState({ method: '', amount: '', reference: '', tier: '', notes: '' });
  const [showPayForm, setShowPayForm] = useState(false);
  const fileRef = useRef();
  const [uploadType, setUploadType] = useState('');

  const updateProject = async (updates, action) => {
    setSaving(true);
    const res = await callEdge('kyc-update-project', { project_id: project.id, updates, action }, adminSession.token);
    if (res.success) {
      setProject(p => ({ ...p, ...res.project }));
      onUpdate();
    }
    setSaving(false);
  };

  const recordPayment = async () => {
    if (!payForm.method || !payForm.amount || !payForm.tier) return;
    setSaving(true);
    const res = await callEdge('kyc-record-payment', {
      project_id: project.id,
      amount: parseFloat(payForm.amount),
      currency: project.funding_currency || 'USD',
      tier: payForm.tier,
      payment_method: payForm.method,
      reference: payForm.reference,
      notes: payForm.notes,
    }, adminSession.token);
    if (res.success) {
      setProject(p => ({ ...p, status: 'active', venturex_stage: 'intake' }));
      setShowPayForm(false);
    }
    setSaving(false);
  };

  const uploadDoc = async (file) => {
    if (!file || !uploadType) return;
    const res = await callEdge('kyc-get-upload-url', {
      project_id: project.id,
      doc_type: uploadType,
      file_name: file.name,
      file_size: file.size,
    }, adminSession.token);
    if (res.signed_url) {
      await fetch(res.signed_url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      setProject(p => ({
        ...p,
        kyc_project_documents: [...(p.kyc_project_documents || []), { id: res.doc_id, doc_type: uploadType, file_name: file.name, uploaded_at: new Date().toISOString() }],
      }));
    }
  };

  const sc = STATUS_CONFIG[project.status] || STATUS_CONFIG.registered;
  const hasPayment = project.kyc_project_payments?.some(p => p.payment_status === 'completed');

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-bold mb-3 transition-colors">
            <ArrowLeft size={16} /> All Projects
          </button>
          <h2 className="text-2xl font-black text-white">{project.founder_name}</h2>
          <p className="text-slate-400 text-sm">{project.founder_email}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className={`text-xs font-black uppercase tracking-wide px-3 py-1.5 rounded-full ${sc.color} bg-opacity-20 ${sc.text}`}>
            {sc.label}
          </span>
          {project.venturex_stage && (
            <span className="text-xs font-black uppercase tracking-wide px-3 py-1.5 rounded-full bg-blue-500/20 text-blue-300">
              {project.venturex_stage}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-900 p-1 rounded-xl overflow-x-auto">
        {[['overview','Overview'],['pipeline','Pipeline'],['documents','Documents'],['payment','Payment']].map(([t,l]) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {[
              ['Sector', project.sector],
              ['Stage', project.stage],
              ['Project Type', project.project_type === 'company' ? 'Existing Company' : 'Idea / Project'],
              ['Team Size', project.team_size || '—'],
              ['Funding Needed', project.funding_amount_needed ? `${project.funding_currency} ${Number(project.funding_amount_needed).toLocaleString()}` : '—'],
              ['Timeline', project.timeline || '—'],
              ['Country', project.founder_country || '—'],
              ['Phone', project.founder_phone || '—'],
              ['Website', project.website || '—'],
              ['Registered By', project.registered_by],
            ].map(([k,v]) => (
              <div key={k} className="bg-slate-900 rounded-xl p-4">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider mb-1">{k}</p>
                <p className="text-white text-sm font-semibold">{v}</p>
              </div>
            ))}
          </div>
          {project.business_description && (
            <div className={card}>
              <p className={lbl}>Business Description</p>
              <p className="text-slate-300 text-sm leading-relaxed">{project.business_description}</p>
            </div>
          )}
          {project.revenue_model && (
            <div className={card}>
              <p className={lbl}>Revenue Model</p>
              <p className="text-slate-300 text-sm leading-relaxed">{project.revenue_model}</p>
            </div>
          )}
          {project.financing_types?.length > 0 && (
            <div className={card}>
              <p className={lbl}>Financing Types</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {project.financing_types.map(f => (
                  <span key={f} className="bg-blue-500/20 text-blue-300 text-xs font-bold px-3 py-1 rounded-full capitalize">{f}</span>
                ))}
              </div>
            </div>
          )}
          {/* Quick actions */}
          <div className="flex flex-wrap gap-3">
            {project.status === 'registered' && !hasPayment && (
              <button onClick={() => { setActiveTab('payment'); setShowPayForm(true); }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2">
                <DollarSign size={14} /> Record Payment
              </button>
            )}
            {project.status === 'active' && (
              <button onClick={() => updateProject({ status: 'in_pipeline', venturex_stage: 'intake' }, 'project_moved_to_pipeline')}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2">
                <Layers size={14} /> Move to Pipeline
              </button>
            )}
            {project.status !== 'archived' && (
              <button onClick={() => updateProject({ status: 'archived' }, 'project_archived')}
                disabled={saving}
                className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-bold px-4 py-2.5 rounded-xl transition-all">
                Archive
              </button>
            )}
          </div>
        </div>
      )}

      {/* Pipeline Tab */}
      {activeTab === 'pipeline' && (
        <div className="space-y-4">
          <p className="text-slate-400 text-sm">Move the project through the IFB VentureX pipeline stages.</p>
          <div className="space-y-3">
            {VENTUREX_STAGES.map((s, i) => {
              const isCurrent = project.venturex_stage === s.id;
              const isPast = VENTUREX_STAGES.findIndex(x => x.id === project.venturex_stage) > i;
              return (
                <div key={s.id} className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all ${isCurrent ? 'border-blue-500 bg-blue-500/10' : isPast ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-800 bg-slate-900/50'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isCurrent ? s.color : isPast ? 'bg-emerald-500' : 'bg-slate-800'}`}>
                    {isPast ? <Check size={18} className="text-white" /> : <span className="text-white font-black">{i + 1}</span>}
                  </div>
                  <div className="flex-1">
                    <p className={`font-black text-sm ${isCurrent ? 'text-white' : isPast ? 'text-emerald-300' : 'text-slate-400'}`}>{s.label}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{s.desc}</p>
                  </div>
                  {!isCurrent && project.status === 'in_pipeline' && (
                    <button onClick={() => updateProject({ venturex_stage: s.id, status: 'in_pipeline' }, `stage_changed_to_${s.id}`)}
                      disabled={saving}
                      className="text-blue-400 hover:text-blue-300 text-xs font-bold px-3 py-1.5 rounded-lg border border-blue-500/30 hover:border-blue-400/50 transition-all">
                      Set
                    </button>
                  )}
                  {isCurrent && <span className="text-blue-400 text-xs font-black">CURRENT</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-slate-400 text-sm">{project.kyc_project_documents?.length || 0} document(s) on file</p>
            <div className="flex gap-2 flex-wrap">
              {['resume','passport','business_plan','legal','other'].map(t => (
                <button key={t} onClick={() => { setUploadType(t); fileRef.current?.click(); }}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg font-bold capitalize transition-all">
                  + {t.replace('_',' ')}
                </button>
              ))}
            </div>
          </div>
          <input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.ppt,.pptx"
            onChange={e => { if (e.target.files?.[0]) uploadDoc(e.target.files[0]); }} />
          {!project.kyc_project_documents?.length ? (
            <div className={card + ' text-center py-12'}>
              <FileText size={32} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-bold">No documents uploaded</p>
            </div>
          ) : (
            <div className="space-y-3">
              {project.kyc_project_documents.map(doc => (
                <div key={doc.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
                      <FileText size={18} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-bold">{doc.file_name}</p>
                      <p className="text-slate-500 text-xs capitalize">{doc.doc_type.replace('_',' ')} · {new Date(doc.uploaded_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {doc.file_url && (
                    <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300">
                      <Download size={16} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Payment Tab */}
      {activeTab === 'payment' && (
        <div className="space-y-4">
          {project.kyc_project_payments?.filter(p => p.payment_status === 'completed').length > 0 ? (
            <div className="space-y-3">
              {project.kyc_project_payments.map(p => (
                <div key={p.id} className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <CheckCircle2 size={20} className="text-emerald-400" />
                    <span className="text-emerald-400 text-xs font-black uppercase">Completed</span>
                  </div>
                  <p className="text-2xl font-black text-white">{p.currency} {Number(p.amount).toLocaleString()}</p>
                  <p className="text-slate-400 text-sm mt-1 capitalize">{p.payment_method} · {p.tier} tier</p>
                  {p.paid_at && <p className="text-slate-500 text-xs mt-2">{new Date(p.paid_at).toLocaleString()}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className={card + ' text-center py-12'}>
              <DollarSign size={32} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-bold mb-4">No payment recorded</p>
              <button onClick={() => setShowPayForm(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all">
                Record Payment
              </button>
            </div>
          )}

          {showPayForm && (
            <div className={card}>
              <h3 className="text-white font-black mb-5">Record Payment</h3>
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Tier" required>
                    <select className={sel} value={payForm.tier} onChange={e => setPayForm(p => ({ ...p, tier: e.target.value, amount: PAYMENT_TIERS.find(t => t.id === e.target.value)?.min.toString() || p.amount }))}>
                      <option value="">Select tier...</option>
                      {PAYMENT_TIERS.map(t => <option key={t.id} value={t.id}>{t.label} (min {t.min.toLocaleString()})</option>)}
                    </select>
                  </Field>
                  <Field label="Amount" required>
                    <input type="number" className={inp} value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))} placeholder="100000" />
                  </Field>
                  <Field label="Payment Method" required>
                    <select className={sel} value={payForm.method} onChange={e => setPayForm(p => ({ ...p, method: e.target.value }))}>
                      <option value="">Select method...</option>
                      {[['deus','DEUS Platform'],['bank_transfer','Bank Transfer'],['stripe','Card / Stripe'],['offline','Offline / Cash']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </Field>
                  <Field label="Reference">
                    <input className={inp} value={payForm.reference} onChange={e => setPayForm(p => ({ ...p, reference: e.target.value }))} placeholder="TXN-123456" />
                  </Field>
                </div>
                <Field label="Notes">
                  <input className={inp} value={payForm.notes} onChange={e => setPayForm(p => ({ ...p, notes: e.target.value }))} placeholder="Payment notes..." />
                </Field>
                <div className="flex gap-3">
                  <button onClick={() => setShowPayForm(false)} className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-bold hover:border-slate-500 transition-all">Cancel</button>
                  <button onClick={recordPayment} disabled={saving}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-sm py-2.5 rounded-xl transition-all flex items-center justify-center gap-2">
                    {saving ? <RefreshCw size={16} className="animate-spin" /> : <><CheckCircle2 size={16} /> Confirm Payment</>}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Portal ──────────────────────────────────────────────────────────────

export default function AdminKYCPortal() {
  const [adminSession, setAdminSession] = useState(null);
  const [view, setView] = useState('projects'); // projects | new_project | project_detail
  const [selectedProject, setSelectedProject] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const s = getStoredSession();
    if (s) setAdminSession(s);
  }, []);

  const handleLogin = (session) => { setAdminSession(session); };

  const handleLogout = () => {
    sessionStorage.removeItem('kyc_admin_session');
    setAdminSession(null);
  };

  if (!adminSession) return <LoginView onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-[#070B14] text-white">
      {/* Top bar */}
      <div className="bg-[#0F1629] border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            {['D','E','U','S'].map((l,i) => (
              <span key={l} className="text-xl font-black" style={{ color: ['#4285F4','#EA4335','#FBBC04','#34A853'][i] }}>{l}</span>
            ))}
          </div>
          <div className="w-px h-5 bg-slate-700" />
          <span className="text-slate-300 text-sm font-bold">KYC Admin Portal</span>
          {view !== 'projects' && (
            <>
              <div className="w-px h-5 bg-slate-700" />
              <button onClick={() => { setView('projects'); setSelectedProject(null); }}
                className="text-slate-400 hover:text-white text-sm transition-colors">
                {view === 'new_project' ? 'New Project' : 'Project Detail'}
              </button>
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-white text-sm font-bold">{adminSession.name}</p>
            <p className="text-slate-500 text-xs">{adminSession.email}</p>
          </div>
          <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 transition-colors text-sm font-bold flex items-center gap-2">
            <XCircle size={16} /> Logout
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-6">
        {view === 'projects' && (
          <ProjectsView
            adminSession={adminSession}
            onNewProject={() => setView('new_project')}
            onSelectProject={(p) => { setSelectedProject(p); setView('project_detail'); }}
            key={refreshKey}
          />
        )}
        {view === 'new_project' && (
          <NewProjectForm
            adminSession={adminSession}
            onSuccess={(project) => { setRefreshKey(k => k + 1); setSelectedProject(project); setView('project_detail'); }}
            onCancel={() => setView('projects')}
          />
        )}
        {view === 'project_detail' && selectedProject && (
          <ProjectDetail
            project={selectedProject}
            adminSession={adminSession}
            onBack={() => { setView('projects'); setSelectedProject(null); }}
            onUpdate={() => setRefreshKey(k => k + 1)}
          />
        )}
      </div>
    </div>
  );
}
