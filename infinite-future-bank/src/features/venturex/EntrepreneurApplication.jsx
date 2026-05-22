import { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
  CheckCircle2, ChevronRight, Loader2, Sparkles, TrendingUp,
  Crown, Plus, X, ArrowLeft, Wallet, AlertTriangle, Rocket,
  Users, Globe, DollarSign, Lightbulb, Target, Building,
  Clock, Star, Shield, Zap, BarChart3, FileText, Phone,
  HandCoins, BookOpen
} from 'lucide-react';

// ── Package definitions ────────────────────────────────────────────────────────
const PACKAGES = [
  {
    id: 'access',
    name: 'IFB ACCESS',
    subtitle: 'Foundation Stage',
    price: 650,
    range: '$500 – $800',
    color: 'emerald',
    icon: Sparkles,
    gradient: 'from-emerald-950 to-slate-900',
    border: 'border-emerald-700',
    accent: 'text-emerald-400',
    badge: 'bg-emerald-900/50 text-emerald-300',
    ring: 'ring-emerald-500',
    target: 'Early-stage / unstructured businesses',
    hours: '20–36 hours of expert work',
    value: '$600 – $1,080 in work value',
    workstreams: [
      { label: 'Business Diagnosis', items: ['Market review', 'Idea validation', 'Positioning clarity'], hours: '5–10h', cost: '$150–$300' },
      { label: 'Business Model Structuring', items: ['Revenue streams', 'Value proposition', 'Basic unit economics'], hours: '5–10h', cost: '$150–$300' },
      { label: 'Basic Documentation', items: ['Business profile', 'Intro pitch support'], hours: '5–8h', cost: '$150–$240' },
      { label: 'Guidance & Sessions', items: ['2–4 advisory sessions'], hours: '5–8h', cost: '$150–$240' },
    ],
  },
  {
    id: 'growth',
    name: 'IFB GROWTH',
    subtitle: 'Investor Readiness',
    price: 2750,
    range: '$2,000 – $3,500',
    color: 'blue',
    icon: TrendingUp,
    gradient: 'from-blue-950 to-slate-900',
    border: 'border-blue-700',
    accent: 'text-blue-400',
    badge: 'bg-blue-900/50 text-blue-300',
    ring: 'ring-blue-500',
    target: 'Active businesses seeking investor attention',
    hours: '65–110 hours of expert work',
    value: '$1,950 – $3,300 in work value',
    workstreams: [
      { label: 'Advanced Financial Modeling', items: ['Revenue projections', 'Cost structure', 'Scenarios'], hours: '15–25h', cost: '$450–$750' },
      { label: 'Full Structuring', items: ['Operational alignment', 'Scalable model'], hours: '15–25h', cost: '$450–$750' },
      { label: 'Pitch Deck (Investor Grade)', items: ['Narrative + financial alignment'], hours: '10–20h', cost: '$300–$600' },
      { label: 'Due Diligence Preparation', items: ['Risk documentation', 'Data room prep'], hours: '10–15h', cost: '$300–$450' },
      { label: 'Strategic Advisory', items: ['Weekly sessions (1–2 months)'], hours: '15–25h', cost: '$450–$750' },
    ],
    popular: true,
  },
  {
    id: 'elite',
    name: 'IFB ELITE',
    subtitle: 'Capital Access & Execution',
    price: 6000,
    range: '$5,000 – $7,000',
    color: 'violet',
    icon: Crown,
    gradient: 'from-violet-950 to-slate-900',
    border: 'border-violet-700',
    accent: 'text-violet-400',
    badge: 'bg-violet-900/50 text-violet-300',
    ring: 'ring-violet-500',
    target: 'High-potential / funding-ready companies',
    hours: '100–160 hours of expert work',
    value: '$3,000 – $4,800 + infrastructure',
    workstreams: [
      { label: 'Capital Strategy Design', items: ['Debt vs equity', 'Structuring funding rounds'], hours: '15–25h', cost: '$450–$750' },
      { label: 'Investor Targeting & Matching', items: ['Mapping + outreach strategy'], hours: '15–25h', cost: '$450–$750' },
      { label: 'Investment-Grade Package', items: ['Full documentation upgrade'], hours: '20–30h', cost: '$600–$900' },
      { label: 'Negotiation Support', items: ['Term sheets', 'Deal structuring'], hours: '10–20h', cost: '$300–$600' },
      { label: 'Ongoing Advisory (3 months)', items: ['Weekly + on-demand'], hours: '25–40h', cost: '$750–$1,200' },
      { label: 'IFB Infrastructure', items: ['Device', 'Setup', 'Communication layer'], hours: null, cost: '$200–$300' },
    ],
  },
];

const ADDONS = [
  { id: 'phone',      name: 'IFB Phone', desc: 'Procurement · Setup · System integration', price: 250,  icon: Phone      },
  { id: 'investor',   name: 'Investor Acceleration', desc: 'Faster outreach · Priority handling', price: 750,  icon: Zap        },
  { id: 'financial',  name: 'Advanced Financial Deep Dive', desc: 'Stress testing · Complex modeling', price: 550,  icon: BarChart3  },
];

const SECTORS = ['Technology','Fintech','Agriculture','Healthcare','Education','Energy','Real Estate','Manufacturing','Retail','Logistics','Media','Tourism','Other'];
const STAGES  = [
  { id: 'idea',        label: 'Idea Stage',     desc: 'Pre-product, validating concept' },
  { id: 'pre_revenue', label: 'Pre-Revenue',    desc: 'Built product, no paying customers yet' },
  { id: 'early',       label: 'Early Traction', desc: 'First customers, proving the model' },
  { id: 'growth',      label: 'Growth',         desc: 'Scaling, seeking expansion capital' },
  { id: 'scale',       label: 'Scale',          desc: 'Established, raising Series A+' },
];

const fmtUSD = (n) => n >= 1e6 ? `$${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n/1e3).toFixed(0)}K` : `$${n}`;
const fmtBalance = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

// ── Step indicator ─────────────────────────────────────────────────────────────
function StepBar({ step }) {
  const steps = ['Profile', 'Package', 'Payment', 'Confirmed'];
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
            i < step  ? 'bg-emerald-500 text-white' :
            i === step ? 'bg-indigo-600 text-white ring-2 ring-indigo-400/40' :
                         'bg-slate-800 text-slate-500'
          }`}>
            {i < step ? <CheckCircle2 size={12}/> : i + 1}
          </div>
          <span className={`text-[10px] font-black uppercase tracking-widest hidden sm:block ${i === step ? 'text-white' : 'text-slate-600'}`}>{s}</span>
          {i < steps.length - 1 && <div className={`w-8 h-px ${i < step ? 'bg-emerald-500' : 'bg-slate-700'}`}/>}
        </div>
      ))}
    </div>
  );
}

// ── Step 1: Company profile form ───────────────────────────────────────────────
function ProfileStep({ form, setForm, onNext }) {
  const valid = form.company_name && form.sector && form.country && form.stage && form.problem_statement && form.solution_statement;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white mb-1">Tell us about your business</h2>
        <p className="text-sm text-slate-400">This becomes your IFB entrepreneur file. Be precise — our team uses this to deploy work immediately.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="label-xs">Company / Venture Name</label>
          <input value={form.company_name} onChange={e => setForm(p=>({...p, company_name: e.target.value}))}
            placeholder="e.g. AfriTech Solutions Ltd"
            className="input-dark" required />
        </div>
        <div>
          <label className="label-xs">Sector</label>
          <select value={form.sector} onChange={e => setForm(p=>({...p, sector: e.target.value}))} className="input-dark">
            <option value="">— Select —</option>
            {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label-xs">Country of Operation</label>
          <input value={form.country} onChange={e => setForm(p=>({...p, country: e.target.value}))}
            placeholder="e.g. Kenya" className="input-dark" />
        </div>
        <div>
          <label className="label-xs">Team Size</label>
          <input type="number" min={1} value={form.team_size} onChange={e => setForm(p=>({...p, team_size: parseInt(e.target.value)||1}))}
            className="input-dark" />
        </div>
        <div>
          <label className="label-xs">Annual Revenue (USD, 0 if pre-revenue)</label>
          <input type="number" min={0} value={form.annual_revenue_usd} onChange={e => setForm(p=>({...p, annual_revenue_usd: parseFloat(e.target.value)||0}))}
            placeholder="0" className="input-dark" />
        </div>
        <div>
          <label className="label-xs">Capital You're Seeking (USD)</label>
          <input type="number" min={0} value={form.capital_ask_usd} onChange={e => setForm(p=>({...p, capital_ask_usd: parseFloat(e.target.value)||0}))}
            placeholder="e.g. 250000" className="input-dark" />
        </div>
        <div>
          <label className="label-xs">Website (optional)</label>
          <input value={form.website} onChange={e => setForm(p=>({...p, website: e.target.value}))}
            placeholder="https://" className="input-dark" />
        </div>
      </div>

      <div>
        <label className="label-xs">Business Stage</label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-2">
          {STAGES.map(s => (
            <button key={s.id} type="button" onClick={() => setForm(p=>({...p, stage: s.id}))}
              className={`p-3 rounded-xl border text-left transition-all ${form.stage === s.id ? 'border-indigo-500 bg-indigo-900/30' : 'border-slate-700 bg-slate-800/40 hover:border-slate-600'}`}>
              <p className="text-[11px] font-black text-white">{s.label}</p>
              <p className="text-[9px] text-slate-500 mt-0.5 leading-tight">{s.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label-xs">Problem You're Solving</label>
        <textarea value={form.problem_statement} onChange={e => setForm(p=>({...p, problem_statement: e.target.value}))}
          rows={3} placeholder="What specific problem does your business solve? Be direct."
          className="input-dark resize-none" />
      </div>

      <div>
        <label className="label-xs">Your Solution</label>
        <textarea value={form.solution_statement} onChange={e => setForm(p=>({...p, solution_statement: e.target.value}))}
          rows={3} placeholder="How does your business solve it? What makes it different?"
          className="input-dark resize-none" />
      </div>

      <button onClick={onNext} disabled={!valid}
        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-black rounded-2xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
        Choose Your Package <ChevronRight size={14}/>
      </button>
    </div>
  );
}

// ── Step 2: Package selection ──────────────────────────────────────────────────
function PackageStep({ selected, setSelected, addons, setAddons, onNext, onBack }) {
  const [expanded, setExpanded] = useState(null);

  const toggleAddon = (id) => setAddons(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  const addonTotal  = ADDONS.filter(a => addons.includes(a.id)).reduce((s, a) => s + a.price, 0);
  const pkg         = PACKAGES.find(p => p.id === selected);
  const total       = pkg ? pkg.price + addonTotal : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white mb-1">Choose your IFB package</h2>
        <p className="text-sm text-slate-400">Every price maps to real hours of financial, strategic, and analytical work deployed behind your company.</p>
      </div>

      {/* Packages */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PACKAGES.map(p => {
          const Icon  = p.icon;
          const isExp = expanded === p.id;
          return (
            <div key={p.id}
              onClick={() => setSelected(p.id)}
              className={`relative rounded-[1.5rem] border bg-gradient-to-b ${p.gradient} cursor-pointer transition-all duration-200 ${
                selected === p.id ? `${p.border} ring-2 ${p.ring}/40` : 'border-slate-800 hover:border-slate-600'
              }`}
            >
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 rounded-full text-[9px] font-black uppercase tracking-widest text-white whitespace-nowrap">
                  Most Popular
                </div>
              )}

              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-xl bg-white/5`}><Icon size={18} className={p.accent}/></div>
                  {selected === p.id && <CheckCircle2 size={16} className="text-emerald-400"/>}
                </div>
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${p.accent}`}>{p.name}</p>
                  <p className="text-white font-black text-lg">{fmtUSD(p.price)}</p>
                  <p className="text-[10px] text-slate-500">Range: {p.range}</p>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">{p.target}</p>
                <div className={`px-2 py-1 rounded-lg ${p.badge} text-[9px] font-black`}>{p.hours}</div>

                {/* Workstreams toggle */}
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); setExpanded(isExp ? null : p.id); }}
                  className="w-full text-[9px] text-slate-500 hover:text-slate-300 font-black uppercase tracking-widest transition-colors pt-1 flex items-center justify-center gap-1"
                >
                  {isExp ? 'Hide detail' : 'See what\'s included'} <ChevronRight size={10} className={`transition-transform ${isExp ? 'rotate-90' : ''}`}/>
                </button>

                {isExp && (
                  <div className="space-y-3 border-t border-white/10 pt-3">
                    {p.workstreams.map(ws => (
                      <div key={ws.label}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] font-black text-white">{ws.label}</p>
                          <span className={`text-[9px] font-black ${p.accent}`}>{ws.cost}</span>
                        </div>
                        <ul className="space-y-0.5">
                          {ws.items.map(it => (
                            <li key={it} className="flex items-center gap-1.5 text-[9px] text-slate-500">
                              <span className="w-1 h-1 rounded-full bg-slate-600 shrink-0"/>
                              {it}
                            </li>
                          ))}
                        </ul>
                        {ws.hours && <p className="text-[9px] text-slate-600 mt-1">⏱ {ws.hours}</p>}
                      </div>
                    ))}
                    <div className={`mt-2 pt-2 border-t border-white/10 text-[9px] font-black ${p.accent}`}>
                      Total work value: {p.value}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add-ons */}
      <div>
        <p className="label-xs mb-3">Optional Add-ons</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {ADDONS.map(a => {
            const Icon = a.icon;
            const active = addons.includes(a.id);
            return (
              <button key={a.id} type="button" onClick={() => toggleAddon(a.id)}
                className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                  active ? 'border-amber-600 bg-amber-900/20' : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                }`}>
                <div className={`p-1.5 rounded-lg ${active ? 'bg-amber-900/40' : 'bg-slate-700/40'}`}>
                  <Icon size={14} className={active ? 'text-amber-400' : 'text-slate-400'}/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-white">{a.name}</p>
                  <p className="text-[9px] text-slate-500 mt-0.5">{a.desc}</p>
                  <p className={`text-[10px] font-black mt-1 ${active ? 'text-amber-400' : 'text-slate-400'}`}>+{fmtUSD(a.price)}</p>
                </div>
                {active && <CheckCircle2 size={14} className="text-amber-400 shrink-0 mt-0.5"/>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Total */}
      {selected && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Total Due</p>
            <p className="text-2xl font-black text-white">{fmtUSD(total)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Charged from your IFB liquid balance</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Package</p>
            <p className={`text-sm font-black ${PACKAGES.find(p=>p.id===selected)?.accent}`}>
              {PACKAGES.find(p=>p.id===selected)?.name}
            </p>
            {addonTotal > 0 && <p className="text-[10px] text-amber-400">+ {fmtUSD(addonTotal)} add-ons</p>}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onBack} className="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 font-black rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2 transition-all">
          <ArrowLeft size={14}/> Back
        </button>
        <button onClick={onNext} disabled={!selected}
          className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-black rounded-2xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
          Confirm & Pay <ChevronRight size={14}/>
        </button>
      </div>
    </div>
  );
}

// ── Step 3: Payment confirmation ───────────────────────────────────────────────
function PaymentStep({ form, selected, addons, balance, onConfirm, onBack, paying }) {
  const pkg        = PACKAGES.find(p => p.id === selected);
  const addonItems = ADDONS.filter(a => addons.includes(a.id));
  const addonTotal = addonItems.reduce((s, a) => s + a.price, 0);
  const total      = (pkg?.price || 0) + addonTotal;
  const sufficient = (balance || 0) >= total;
  const Icon       = pkg?.icon || Sparkles;

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div>
        <h2 className="text-2xl font-black text-white mb-1">Confirm payment</h2>
        <p className="text-sm text-slate-400">Review your order before we charge your wallet.</p>
      </div>

      {/* Order summary */}
      <div className="bg-slate-900 border border-slate-800 rounded-[1.5rem] p-6 space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className={`p-2.5 rounded-xl bg-gradient-to-b ${pkg?.gradient}`}>
            <Icon size={20} className={pkg?.accent}/>
          </div>
          <div>
            <p className={`text-[10px] font-black uppercase tracking-widest ${pkg?.accent}`}>{pkg?.name}</p>
            <p className="text-white font-black">{pkg?.subtitle}</p>
          </div>
          <p className="ml-auto text-white font-black">{fmtUSD(pkg?.price || 0)}</p>
        </div>

        {addonItems.map(a => (
          <div key={a.id} className="flex items-center justify-between text-sm">
            <span className="text-slate-400 font-bold flex items-center gap-2">
              <Plus size={10} className="text-amber-400"/>{a.name}
            </span>
            <span className="text-amber-400 font-black">+{fmtUSD(a.price)}</span>
          </div>
        ))}

        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <span className="text-white font-black uppercase tracking-widest text-xs">Total</span>
          <span className="text-2xl font-black text-white">{fmtUSD(total)}</span>
        </div>
      </div>

      {/* Wallet balance */}
      <div className={`rounded-2xl p-4 flex items-center justify-between border ${sufficient ? 'bg-slate-800/40 border-slate-700' : 'bg-red-950/40 border-red-800'}`}>
        <div className="flex items-center gap-3">
          <Wallet size={18} className={sufficient ? 'text-slate-400' : 'text-red-400'}/>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Your Balance</p>
            <p className={`font-black text-lg ${sufficient ? 'text-white' : 'text-red-400'}`}>{fmtBalance(balance)}</p>
          </div>
        </div>
        {sufficient
          ? <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest flex items-center gap-1"><CheckCircle2 size={10}/>Sufficient</span>
          : <span className="text-[10px] text-red-400 font-black uppercase tracking-widest flex items-center gap-1"><AlertTriangle size={10}/>Insufficient</span>
        }
      </div>

      {!sufficient && (
        <div className="bg-red-950/30 border border-red-800/40 rounded-2xl p-4 text-sm text-red-300 font-bold">
          You need {fmtBalance(total - balance)} more. Deposit funds via the Accounts tab, then come back.
        </div>
      )}

      {/* Guarantee line */}
      <div className="bg-indigo-950/30 border border-indigo-800/30 rounded-2xl p-4 flex items-start gap-3">
        <Shield size={16} className="text-indigo-400 mt-0.5 shrink-0"/>
        <p className="text-xs text-slate-400 leading-relaxed">
          <strong className="text-indigo-300">What happens after payment:</strong> Your file goes immediately to the IFB advisory team. An advisor is assigned within 24 hours. You are not paying for access — you are covering the cost of the financial, strategic, and analytical work deployed behind your company to make it fundable.
        </p>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 font-black rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2 transition-all">
          <ArrowLeft size={14}/> Back
        </button>
        <button onClick={onConfirm} disabled={!sufficient || paying}
          className="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-black rounded-2xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/30">
          {paying ? <><Loader2 size={14} className="animate-spin"/>Processing...</> : <><Rocket size={14}/>Pay {fmtUSD(total)} & Submit</>}
        </button>
      </div>
    </div>
  );
}

// ── Step 4: Success ────────────────────────────────────────────────────────────
function SuccessStep({ result, pkg, form }) {
  const Icon = pkg?.icon || Sparkles;
  return (
    <div className="text-center space-y-6 py-8 max-w-md mx-auto">
      <div className={`w-20 h-20 mx-auto rounded-full bg-gradient-to-b ${pkg?.gradient} border ${pkg?.border} flex items-center justify-center`}>
        <Icon size={36} className={pkg?.accent}/>
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 tracking-[0.2em] mb-2">Application Received</p>
        <h2 className="text-3xl font-black text-white">{form.company_name}</h2>
        <p className={`text-sm font-black mt-1 ${pkg?.accent}`}>{pkg?.name} — {pkg?.subtitle}</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-[1.5rem] p-6 text-left space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500 font-bold">Amount Paid</span>
          <span className="text-white font-black">{fmtUSD(result?.total_paid || 0)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500 font-bold">New Balance</span>
          <span className="text-emerald-400 font-black">{fmtBalance(result?.new_balance || 0)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500 font-bold">Application ID</span>
          <span className="text-slate-300 font-black text-xs font-mono">{result?.app_id?.slice(0,8).toUpperCase()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500 font-bold">Status</span>
          <span className="text-amber-400 font-black">Under Review</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Clock,     label: 'Advisor assigned', sub: 'Within 24 hours' },
          { icon: BookOpen,  label: 'Work begins', sub: 'Day 1–3' },
          { icon: Star,      label: 'First deliverable', sub: 'Week 1–2' },
        ].map(i => (
          <div key={i.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-center">
            <i.icon size={16} className="mx-auto text-slate-500 mb-1.5"/>
            <p className="text-[10px] font-black text-white">{i.label}</p>
            <p className="text-[9px] text-slate-500 mt-0.5">{i.sub}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-500 leading-relaxed">
        You'll receive notifications through the DEUS app as your advisor progresses through each workstream. Track your application under <strong className="text-slate-300">My Applications</strong> in the VentureX tab.
      </p>
    </div>
  );
}

// ── Root component ─────────────────────────────────────────────────────────────
export default function EntrepreneurApplication({ session, balances }) {
  const [step,    setStep]    = useState(0);
  const [form,    setForm]    = useState({
    company_name: '', sector: '', country: '', stage: '', team_size: 1,
    annual_revenue_usd: 0, capital_ask_usd: 0, problem_statement: '', solution_statement: '', website: '',
  });
  const [selected, setSelected] = useState('growth');
  const [addons,   setAddons]   = useState([]);
  const [paying,   setPaying]   = useState(false);
  const [result,   setResult]   = useState(null);
  const [err,      setErr]      = useState(null);

  const pkg        = PACKAGES.find(p => p.id === selected);
  const addonTotal = ADDONS.filter(a => addons.includes(a.id)).reduce((s, a) => s + a.price, 0);
  const balance    = balances?.liquid_usd || 0;

  const handlePay = async () => {
    setPaying(true); setErr(null);
    try {
      const { data, error } = await supabase.rpc('purchase_ifb_package', {
        p_company_name:       form.company_name,
        p_sector:             form.sector,
        p_country:            form.country,
        p_stage:              form.stage,
        p_team_size:          form.team_size,
        p_annual_revenue_usd: form.annual_revenue_usd,
        p_capital_ask_usd:    form.capital_ask_usd,
        p_problem_statement:  form.problem_statement,
        p_solution_statement: form.solution_statement,
        p_website:            form.website || null,
        p_package_id:         selected,
        p_package_name:       pkg.name,
        p_package_price_usd:  pkg.price,
        p_addons:             JSON.stringify(addons),
        p_addons_total_usd:   addonTotal,
      });
      if (error) throw error;
      setResult(data);
      setStep(3);
    } catch (e) {
      setErr(e.message);
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Inline CSS for shared input styles */}
      <style>{`
        .input-dark {
          width: 100%;
          background: rgb(15 23 42);
          border: 1px solid rgb(51 65 85);
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          font-weight: 700;
          color: white;
          outline: none;
          transition: border-color 0.15s;
        }
        .input-dark:focus { border-color: rgb(99 102 241); }
        .input-dark::placeholder { color: rgb(71 85 105); }
        .label-xs {
          display: block;
          font-size: 0.625rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: rgb(100 116 139);
          margin-bottom: 0.5rem;
        }
      `}</style>

      <StepBar step={step} />

      {err && (
        <div className="mb-6 p-4 bg-red-950/40 border border-red-800/50 rounded-2xl text-sm text-red-300 font-bold flex items-center gap-2">
          <AlertTriangle size={14}/>{err}
        </div>
      )}

      {step === 0 && <ProfileStep form={form} setForm={setForm} onNext={() => setStep(1)} />}
      {step === 1 && <PackageStep selected={selected} setSelected={setSelected} addons={addons} setAddons={setAddons} onNext={() => setStep(2)} onBack={() => setStep(0)} />}
      {step === 2 && <PaymentStep form={form} selected={selected} addons={addons} balance={balance} onConfirm={handlePay} onBack={() => setStep(1)} paying={paying} />}
      {step === 3 && <SuccessStep result={result} pkg={pkg} form={form} />}
    </div>
  );
}
