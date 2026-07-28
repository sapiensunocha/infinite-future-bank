/**
 * VentureX Accelerator — Premium startup coaching + execution platform
 * Part of DEUS / Infinite Future Bank
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  Rocket, Lightbulb, Code, Palette, TrendingUp, BarChart,
  CheckCircle2, AlertTriangle, ChevronRight, ChevronDown, ChevronUp,
  Users, DollarSign, Globe, Award, Star, ArrowRight, Loader2,
  CheckSquare, Square, Lock, Clock, Target, Zap, MessageSquare,
  X, Send, Building2, BadgeCheck, Sparkles, BookOpen, ShieldCheck,
  BarChart3, FileText, PieChart, Layers, Play, Calendar, Flag,
  Circle, Check, Info
} from 'lucide-react';

// ─── Gemini helper ────────────────────────────────────────────────────────────
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;

async function callGemini(prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TABS = ['OVERVIEW', 'APPLY', 'PROGRAM', 'MODULES', 'PRICING'];

const TRUST_METRICS = [
  { value: '142', label: 'Startups Launched', icon: Rocket },
  { value: '$4.2M', label: 'Revenue Generated', icon: DollarSign },
  { value: '89%', label: 'Completion Rate', icon: Award },
  { value: '34', label: 'Countries', icon: Globe },
];

const CASE_STUDIES = [
  {
    name: 'AgriConnect Nigeria',
    sector: 'AgriTech',
    country: 'Nigeria',
    stage: 'Idea',
    outcome: '$80K MRR in 11 months',
    quote: 'IFB gave us the structure we needed. We went from a napkin idea to 300 paying farmers in under a year.',
    founder: 'Chidi O., Co-founder',
    color: 'from-emerald-600 to-green-700',
  },
  {
    name: 'PayEase Senegal',
    sector: 'FinTech',
    country: 'Senegal',
    stage: 'MVP',
    outcome: 'Series A in 14 months',
    quote: 'The fundraising module alone was worth 10× the cost. We closed $1.2M from investors we met through IFB.',
    founder: 'Aminata D., CEO',
    color: 'from-blue-600 to-indigo-700',
  },
];

const ROADMAP_STAGES = [
  {
    id: 1,
    title: 'Foundation',
    period: 'Week 1–2',
    desc: 'Define your problem, customer, and value proposition with precision.',
    tasks: [
      'Write a crisp problem statement (1 paragraph, no jargon)',
      'Build a customer persona with demographics, pain, and willingness to pay',
      'Draft a one-sentence value proposition',
      'Map 3 direct and 2 indirect competitors',
    ],
  },
  {
    id: 2,
    title: 'Validation',
    period: 'Week 2–4',
    desc: 'Talk to 30 real customers and validate willingness to pay before writing one line of code.',
    tasks: [
      'Schedule and complete 30 customer discovery interviews',
      'Document evidence of demand (quotes, emails, signups)',
      'Get at least 5 people to commit money (pre-order / deposit)',
      'Write your go / no-go decision memo',
    ],
  },
  {
    id: 3,
    title: 'MVP Build',
    period: 'Week 4–8',
    desc: 'Scope the absolute minimum. Ship your first version to real users.',
    tasks: [
      'Define MVP scope: 3 features max, cut everything else',
      'Choose your tech stack and architecture',
      'Build and deploy v0.1 to at least 10 users',
      'Collect structured feedback from first users',
    ],
  },
  {
    id: 4,
    title: 'First Revenue',
    period: 'Week 8–12',
    desc: 'Land your first paying customer. This is the hardest and most important milestone.',
    tasks: [
      'Set your initial pricing (do not undercharge)',
      'Close your first paying customer (not a friend)',
      'Document the exact sales conversation that worked',
      'Calculate your cost to acquire (CAC) for that first customer',
    ],
  },
  {
    id: 5,
    title: 'Traction',
    period: 'Month 3–5',
    desc: 'Build a repeatable acquisition engine. Start seeing product-market fit signals.',
    tasks: [
      'Reach 10 paying customers with less than 5% churn',
      'Identify your #1 acquisition channel',
      'Define your PMF signal (retention, NPS, or revenue growth)',
      'Set your first MRR target and a plan to hit it',
    ],
  },
  {
    id: 6,
    title: 'Scale',
    period: 'Month 5–8',
    desc: 'Start hiring, automating, and expanding channels deliberately.',
    tasks: [
      'Make your first strategic hire (not a generalist)',
      'Automate at least 2 manual processes',
      'Test a second acquisition channel',
      'Raise a pre-seed or seed round (if needed)',
    ],
  },
  {
    id: 7,
    title: 'Graduation',
    period: 'Month 8–12',
    desc: 'Demo Day pitch, investor intros, exit strategy or next round planning.',
    tasks: [
      'Prepare and rehearse your Demo Day pitch deck',
      'Receive 3+ investor introductions from IFB',
      'Define your 12-month post-graduation growth plan',
      'Celebrate: you built a real company',
    ],
  },
];

const STAGE_WEEKLY_TASKS = {
  1: [
    'Complete the IFB Problem Canvas template',
    'Interview 5 potential customers this week',
    'Finalize your value proposition statement',
    'Research your top 3 competitors deeply',
    'Join the IFB Accelerator community Slack',
  ],
  2: [
    'Schedule 10 customer interviews for this week',
    'Run a landing page test to measure demand',
    'Document key quotes from discovery calls',
    'Attempt your first pre-order conversation',
    'Share findings in your weekly advisor check-in',
  ],
  3: [
    'Lock your MVP feature scope (max 3 features)',
    'Set up your development environment',
    'Build or wire up your first user flow',
    'Get 3 beta testers lined up',
    'Define your "shipped" success criteria',
  ],
  4: [
    'Identify your top 10 prospects for outreach',
    'Send 20 personalized sales emails today',
    'Book at least 3 sales calls this week',
    'Refine your pricing based on objections',
    'Follow up on every open conversation',
  ],
  5: [
    'Analyze your retention data for the past 30 days',
    'Run one new acquisition experiment',
    'Survey your top 5 customers for NPS',
    'Build a simple referral mechanism',
    'Update your financial model with actuals',
  ],
  6: [
    'Write job descriptions for your first 2 hires',
    'Automate your onboarding email sequence',
    'Review unit economics: LTV vs CAC',
    'Set quarterly OKRs for the team',
    'Prepare your investor update memo',
  ],
  7: [
    'Draft your Demo Day pitch deck (v1)',
    'Practice pitch with 3 outside founders',
    'Finalize your 12-month financial forecast',
    'Update your cap table for investor discussions',
    'Write your company one-pager for IFB network',
  ],
};

const MODULES = [
  {
    id: 'validation',
    title: 'Idea Validation',
    tagline: 'Prove demand before you build',
    icon: Lightbulb,
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10',
    deliverables: ['Customer interview guide', 'Demand signals report', 'Go/no-go decision framework'],
    timeline: '2 weeks',
    outcome: 'Confident product direction backed by real data',
    price: 300,
  },
  {
    id: 'mvp',
    title: 'MVP Architecture',
    tagline: 'Build the right thing, not everything',
    icon: Code,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    deliverables: ['Feature priority matrix', 'Tech stack recommendation', '60-day build plan'],
    timeline: '3 weeks',
    outcome: 'Shipped MVP with first 10 users',
    price: 500,
  },
  {
    id: 'brand',
    title: 'Brand & Positioning',
    tagline: 'Be unforgettable in your market',
    icon: Palette,
    color: 'text-pink-400',
    bg: 'bg-pink-400/10',
    deliverables: ['Brand identity brief', 'Messaging framework', 'Competitor positioning map'],
    timeline: '2 weeks',
    outcome: 'Clear, differentiated brand that attracts customers',
    price: 400,
  },
  {
    id: 'gtm',
    title: 'Go-to-Market Strategy',
    tagline: 'Your first 1,000 customers',
    icon: Rocket,
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    deliverables: ['GTM playbook', 'Channel strategy', '90-day acquisition plan'],
    timeline: '3 weeks',
    outcome: 'Predictable acquisition engine',
    price: 600,
  },
  {
    id: 'fundraising',
    title: 'Fundraising Prep',
    tagline: 'Raise on your terms',
    icon: TrendingUp,
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    deliverables: ['Pitch deck review', 'Financial model', 'Investor target list'],
    timeline: '4 weeks',
    outcome: 'Investor-ready in 30 days',
    price: 800,
  },
  {
    id: 'growth',
    title: 'Growth & Scaling',
    tagline: 'From traction to dominance',
    icon: BarChart,
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
    deliverables: ['Growth audit', 'Retention playbook', 'Hiring plan'],
    timeline: '6 weeks',
    outcome: '3× revenue in 6 months',
    price: 1000,
  },
];

const ADDONS = [
  { title: 'Legal Doc Package', desc: 'Contract templates, term sheet review', price: 200, icon: FileText },
  { title: 'Pitch Deck Design', desc: 'Professional deck, 2 revision rounds', price: 350, icon: Layers },
  { title: 'Market Research Report', desc: 'TAM/SAM/SOM, competitive landscape', price: 250, icon: PieChart },
  { title: 'Financial Model', desc: '3-year projection, unit economics', price: 300, icon: BarChart3 },
];

// ─── Mini AI Chat Panel ───────────────────────────────────────────────────────
function MiniChat({ context, placeholder }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    if (open && endRef.current) endRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);
    try {
      const prompt = `You are an IFB Accelerator expert advisor. Context: ${context}\n\nFounder's question: ${userMsg}\n\nRespond in 2–4 sentences. Be direct, practical, and specific. No generic advice.`;
      const reply = await callGemini(prompt);
      setMessages(prev => [...prev, { role: 'ai', text: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'AI advisor temporarily unavailable. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-colors"
      >
        <MessageSquare size={13} />
        {open ? 'Close AI Advisor' : 'Ask AI Advisor'}
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-slate-700 bg-slate-900 overflow-hidden">
          <div className="max-h-48 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 && (
              <p className="text-slate-500 text-xs italic">{placeholder || 'Ask anything about this module…'}</p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-400 flex items-center gap-1">
                  <Loader2 size={11} className="animate-spin" /> Thinking…
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
          <div className="border-t border-slate-700 flex">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Ask a question…"
              className="flex-1 bg-transparent px-3 py-2 text-xs text-white placeholder-slate-600 outline-none"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="px-3 py-2 text-blue-400 hover:text-blue-300 disabled:opacity-40 transition-colors"
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Score Ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score }) {
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444';
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="96" height="96" className="-rotate-90">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#1e293b" strokeWidth="8" />
        <circle
          cx="48" cy="48" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <span className="absolute text-xl font-black text-white">{score}</span>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
        {children}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════════════════════
function OverviewTab({ onApply }) {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <div className="text-center space-y-4 pt-6">
        <p className="font-black uppercase tracking-widest text-[10px] text-blue-400">
          IFB Accelerator — Selective Cohort Program
        </p>
        <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
          From Idea to Revenue.<br />
          <span className="text-blue-400">No Shortcuts.</span>
        </h1>
        <p className="text-slate-400 max-w-lg mx-auto text-base leading-relaxed">
          A selective, execution-first program for founders who are serious about building
          companies that last — not chasing hype.
        </p>
        <button
          onClick={onApply}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3 rounded-xl transition-colors mt-2"
        >
          Apply Now <ArrowRight size={16} />
        </button>
      </div>

      {/* Trust metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {TRUST_METRICS.map(({ value, label, icon: Icon }) => (
          <div key={label} className="bg-slate-800 border border-slate-700 rounded-2xl p-5 text-center">
            <Icon size={20} className="text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-black text-white">{value}</div>
            <div className="text-[11px] text-slate-400 mt-1 uppercase tracking-wide">{label}</div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div>
        <p className="font-black uppercase tracking-widest text-[10px] text-slate-500 mb-6">How It Works</p>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              step: '01',
              title: 'Apply (Selective)',
              desc: 'Submit your application. Our AI admission officer reviews it immediately. Not everyone gets in — we accept founders who are ready to execute.',
              icon: FileText,
            },
            {
              step: '02',
              title: 'Get Your Roadmap',
              desc: 'Accepted founders receive a personalized 7-stage execution roadmap tailored to their stage, sector, and goals.',
              icon: Target,
            },
            {
              step: '03',
              title: 'Execute With Experts + AI',
              desc: 'Work through structured modules, weekly execution sprints, and AI advisors available around the clock.',
              icon: Zap,
            },
          ].map(({ step, title, desc, icon: Icon }) => (
            <div key={step} className="bg-slate-800 border border-slate-700 rounded-2xl p-6 relative">
              <span className="font-black text-4xl text-slate-700 absolute top-4 right-5 select-none">{step}</span>
              <Icon size={22} className="text-blue-400 mb-3" />
              <h3 className="font-bold text-white mb-2">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Case studies */}
      <div>
        <p className="font-black uppercase tracking-widest text-[10px] text-slate-500 mb-6">Founder Results</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {CASE_STUDIES.map(cs => (
            <div key={cs.name} className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
              <div className={`bg-gradient-to-r ${cs.color} p-5`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-black text-white text-lg">{cs.name}</p>
                    <p className="text-white/70 text-xs mt-0.5">{cs.sector} · {cs.country}</p>
                  </div>
                  <div className="bg-white/20 rounded-xl px-3 py-1.5 text-center">
                    <div className="text-[10px] text-white/70 uppercase tracking-wide">Joined at</div>
                    <div className="font-bold text-white text-sm">{cs.stage}</div>
                  </div>
                </div>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp size={14} className="text-emerald-400" />
                  <span className="text-emerald-400 font-bold text-sm">{cs.outcome}</span>
                </div>
                <blockquote className="text-slate-400 text-sm italic leading-relaxed border-l-2 border-slate-600 pl-3">
                  "{cs.quote}"
                </blockquote>
                <p className="text-slate-500 text-xs">— {cs.founder}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-800/50 rounded-2xl p-8 text-center">
        <p className="text-white font-black text-xl mb-2">Ready to build something real?</p>
        <p className="text-slate-400 text-sm mb-5">Applications reviewed within minutes. Cohort spots are limited.</p>
        <button
          onClick={onApply}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3 rounded-xl transition-colors"
        >
          Apply Now <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// APPLY TAB
// ═══════════════════════════════════════════════════════════════════════════════
function ApplyTab({ uid, userEmail, onAccepted }) {
  const storageKey = `ifb_accelerator_app_${uid}`;
  const existing = (() => { try { return JSON.parse(localStorage.getItem(storageKey)); } catch { return null; } })();

  const [form, setForm] = useState({
    name: '', pitch: '', stage: 'Idea', revenue: 0,
    teamSize: 1, challenge: '', timeCommitment: '10–20h', why: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(existing);

  function setField(key, val) { setForm(f => ({ ...f, [key]: val })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const prompt = `You are an IFB Accelerator admission officer. Evaluate this startup application and respond ONLY with valid JSON, no markdown, no explanation outside the JSON:
{
  "score": <0-100 integer>,
  "decision": "accepted" | "waitlisted" | "rejected",
  "tier_recommended": "Starter" | "Growth" | "Venture",
  "strengths": ["...", "...", "..."],
  "concerns": ["...", "..."],
  "personalized_message": "...(2-3 sentences to the founder, warm but honest)"
}

Application:
- Startup: ${form.name}
- Pitch: ${form.pitch}
- Stage: ${form.stage}
- Monthly Revenue: $${form.revenue}
- Team size: ${form.teamSize}
- Challenge: ${form.challenge}
- Time commitment: ${form.timeCommitment}
- Why IFB: ${form.why}`;

      const raw = await callGemini(prompt);
      // Strip any markdown fences
      const cleaned = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      const appResult = { ...parsed, form };
      localStorage.setItem(storageKey, JSON.stringify(appResult));
      setResult(appResult);
    } catch (err) {
      alert('Error processing application. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    const { score, decision, tier_recommended, strengths, concerns, personalized_message } = result;
    const decisionColor = decision === 'accepted' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-700'
      : decision === 'waitlisted' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-700'
      : 'text-slate-400 bg-slate-700 border-slate-600';
    const decisionLabel = decision === 'accepted' ? 'Accepted' : decision === 'waitlisted' ? 'Waitlisted' : 'Not Selected';

    return (
      <div className="max-w-xl mx-auto space-y-6 pt-4">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 text-center space-y-4">
          <p className="font-black uppercase tracking-widest text-[10px] text-slate-500">Application Review</p>
          <ScoreRing score={score} />
          <div>
            <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold border ${decisionColor}`}>
              {decisionLabel}
            </span>
            {tier_recommended && (
              <p className="text-slate-400 text-xs mt-2">Recommended tier: <span className="text-blue-400 font-semibold">{tier_recommended}</span></p>
            )}
          </div>
        </div>

        {strengths?.length > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-2">
            <p className="font-black uppercase tracking-widest text-[10px] text-emerald-500 mb-3">Strengths</p>
            {strengths.map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-slate-300 text-sm">{s}</p>
              </div>
            ))}
          </div>
        )}

        {concerns?.length > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-2">
            <p className="font-black uppercase tracking-widest text-[10px] text-yellow-500 mb-3">Areas to Strengthen</p>
            {concerns.map((c, i) => (
              <div key={i} className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-yellow-400 mt-0.5 shrink-0" />
                <p className="text-slate-300 text-sm">{c}</p>
              </div>
            ))}
          </div>
        )}

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <p className="font-black uppercase tracking-widest text-[10px] text-slate-500 mb-2">From IFB Admissions AI</p>
          <p className="text-slate-300 text-sm leading-relaxed italic">"{personalized_message}"</p>
        </div>

        {decision === 'accepted' && (
          <div className="bg-emerald-900/30 border border-emerald-700 rounded-2xl p-5 text-center space-y-3">
            <p className="text-emerald-400 font-black text-lg">Welcome to the IFB Accelerator</p>
            <p className="text-slate-400 text-sm">Your personalized program is ready. Let's build.</p>
            <button
              onClick={onAccepted}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl transition-colors"
            >
              View My Program <ArrowRight size={15} />
            </button>
          </div>
        )}

        <button
          onClick={() => {
            localStorage.removeItem(storageKey);
            setResult(null);
          }}
          className="w-full text-center text-xs text-slate-600 hover:text-slate-400 transition-colors py-2"
        >
          Start a new application
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto pt-4">
      <div className="mb-6">
        <p className="font-black uppercase tracking-widest text-[10px] text-slate-500 mb-1">Selective Application</p>
        <h2 className="text-xl font-black text-white">Apply to IFB Accelerator</h2>
        <p className="text-slate-400 text-sm mt-1">
          Our AI admission officer reviews every application instantly. Be honest — it helps us match you to the right program.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Startup Name *</label>
            <input
              required value={form.name}
              onChange={e => setField('name', e.target.value)}
              placeholder="e.g. AgriConnect"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-600 outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Current Stage *</label>
            <select
              required value={form.stage}
              onChange={e => setField('stage', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500 transition-colors"
            >
              {['Idea', 'Side Project', 'MVP', 'Revenue', 'Scaling'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">One-Line Pitch *</label>
          <input
            required value={form.pitch}
            onChange={e => setField('pitch', e.target.value)}
            placeholder="e.g. We connect smallholder farmers to B2B buyers, eliminating the middleman."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-600 outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Monthly Revenue (USD)</label>
            <input
              type="number" min="0" value={form.revenue}
              onChange={e => setField('revenue', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Team Size</label>
            <input
              type="number" min="1" value={form.teamSize}
              onChange={e => setField('teamSize', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Time / Week *</label>
            <select
              required value={form.timeCommitment}
              onChange={e => setField('timeCommitment', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500 transition-colors"
            >
              {['<5h', '5–10h', '10–20h', '20h+'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Biggest Challenge Right Now *</label>
          <textarea
            required value={form.challenge}
            onChange={e => setField('challenge', e.target.value)}
            rows={3}
            placeholder="Be specific. What's the one thing keeping you from moving faster?"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-600 outline-none focus:border-blue-500 transition-colors resize-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Why IFB Accelerator? *</label>
          <textarea
            required value={form.why}
            onChange={e => setField('why', e.target.value)}
            rows={3}
            placeholder="What specifically do you want to get out of this program? What does success look like for you in 12 months?"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-600 outline-none focus:border-blue-500 transition-colors resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors mt-2"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              AI is reviewing your application…
            </>
          ) : (
            <>Submit Application <ArrowRight size={16} /></>
          )}
        </button>
      </form>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROGRAM TAB
// ═══════════════════════════════════════════════════════════════════════════════
function ProgramTab({ uid, onGoApply }) {
  const appKey = `ifb_accelerator_app_${uid}`;
  const progressKey = `ifb_accelerator_progress_${uid}`;

  const app = (() => { try { return JSON.parse(localStorage.getItem(appKey)); } catch { return null; } })();
  const accepted = app?.decision === 'accepted';

  const [progress, setProgress] = useState(() => {
    try { return JSON.parse(localStorage.getItem(progressKey)) || { currentStage: 1, completedStages: [], tasks: {} }; }
    catch { return { currentStage: 1, completedStages: [], tasks: {} }; }
  });

  const [taskChat, setTaskChat] = useState(null); // task index with open chat
  const [weeklyTasksDone, setWeeklyTasksDone] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`${progressKey}_weekly`)) || {}; }
    catch { return {}; }
  });

  function saveProgress(newProgress) {
    setProgress(newProgress);
    localStorage.setItem(progressKey, JSON.stringify(newProgress));
  }

  function toggleTask(stageId, taskIdx) {
    const key = `${stageId}_${taskIdx}`;
    const tasks = { ...progress.tasks, [key]: !progress.tasks[key] };
    saveProgress({ ...progress, tasks });
  }

  function markStageComplete(stageId) {
    if (stageId > ROADMAP_STAGES.length) return;
    const completedStages = [...new Set([...progress.completedStages, stageId])];
    const nextStage = Math.min(stageId + 1, ROADMAP_STAGES.length);
    saveProgress({ ...progress, completedStages, currentStage: nextStage });
  }

  function toggleWeeklyTask(idx) {
    const updated = { ...weeklyTasksDone, [idx]: !weeklyTasksDone[idx] };
    setWeeklyTasksDone(updated);
    localStorage.setItem(`${progressKey}_weekly`, JSON.stringify(updated));
  }

  const totalTasks = Object.values(progress.tasks).filter(Boolean).length;
  const startDate = (() => {
    try {
      const stored = localStorage.getItem(`${progressKey}_start`);
      if (stored) return new Date(stored);
      const d = new Date();
      localStorage.setItem(`${progressKey}_start`, d.toISOString());
      return d;
    } catch { return new Date(); }
  })();
  const daysIn = Math.max(0, Math.floor((Date.now() - startDate.getTime()) / 86400000));
  const currentStageName = ROADMAP_STAGES.find(s => s.id === progress.currentStage)?.title || 'Foundation';
  const weeklyTasks = STAGE_WEEKLY_TASKS[progress.currentStage] || STAGE_WEEKLY_TASKS[1];

  if (!accepted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md space-y-4">
          <Lock size={32} className="text-slate-500 mx-auto" />
          <h3 className="text-white font-black text-lg">Program Locked</h3>
          <p className="text-slate-400 text-sm">
            Complete your application first. Accepted founders get immediate access to their personalized 7-stage roadmap.
          </p>
          <button
            onClick={onGoApply}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-xl transition-colors"
          >
            Apply Now <ArrowRight size={15} />
          </button>
        </div>
      </div>
    );
  }

  const progressPct = Math.round(((progress.currentStage - 1) / ROADMAP_STAGES.length) * 100);

  return (
    <div className="space-y-8 pt-2">
      {/* Header */}
      <div>
        <p className="font-black uppercase tracking-widest text-[10px] text-blue-400 mb-1">Your IFB Accelerator Program</p>
        <h2 className="text-2xl font-black text-white">{app?.form?.name || 'Your Startup'}</h2>
        <div className="mt-3">
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>Stage {progress.currentStage} of {ROADMAP_STAGES.length}</span>
            <span>{progressPct}% complete</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Accountability bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Days in Program', value: daysIn },
          { label: 'Tasks Completed', value: totalTasks },
          { label: 'Current Stage', value: currentStageName },
        ].map(({ label, value }) => (
          <div key={label} className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-center">
            <div className="text-white font-black text-lg">{value}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Roadmap timeline */}
      <div>
        <p className="font-black uppercase tracking-widest text-[10px] text-slate-500 mb-5">7-Stage Roadmap</p>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-700" />

          <div className="space-y-4">
            {ROADMAP_STAGES.map(stage => {
              const isCompleted = progress.completedStages.includes(stage.id);
              const isCurrent = progress.currentStage === stage.id;
              const isLocked = !isCompleted && !isCurrent;

              return (
                <div key={stage.id} className="flex gap-4">
                  {/* Stage dot */}
                  <div className="relative z-10 shrink-0 mt-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                      isCompleted
                        ? 'bg-emerald-600 border-emerald-500'
                        : isCurrent
                        ? 'bg-blue-600 border-blue-500'
                        : 'bg-slate-800 border-slate-600'
                    }`}>
                      {isCompleted
                        ? <Check size={16} className="text-white" />
                        : isLocked
                        ? <Lock size={13} className="text-slate-500" />
                        : <span className="text-white font-black text-xs">{stage.id}</span>
                      }
                    </div>
                  </div>

                  {/* Stage content */}
                  <div className={`flex-1 rounded-2xl border p-5 transition-colors ${
                    isCompleted
                      ? 'bg-emerald-900/20 border-emerald-800/50'
                      : isCurrent
                      ? 'bg-blue-900/20 border-blue-800/50'
                      : 'bg-slate-800/50 border-slate-700/50 opacity-60'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={`font-black text-base ${
                        isCompleted ? 'text-emerald-400' : isCurrent ? 'text-white' : 'text-slate-500'
                      }`}>
                        {stage.title}
                      </h3>
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                        isCompleted
                          ? 'bg-emerald-900/50 text-emerald-400'
                          : isCurrent
                          ? 'bg-blue-900/50 text-blue-400'
                          : 'bg-slate-700 text-slate-500'
                      }`}>
                        {stage.period}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm mb-4">{stage.desc}</p>

                    {/* Tasks */}
                    <div className="space-y-2">
                      {stage.tasks.map((task, idx) => {
                        const key = `${stage.id}_${idx}`;
                        const done = progress.tasks[key];
                        return (
                          <label key={idx} className={`flex items-start gap-2 cursor-pointer group ${isLocked ? 'pointer-events-none' : ''}`}>
                            <button
                              onClick={() => !isLocked && toggleTask(stage.id, idx)}
                              className={`mt-0.5 shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                done
                                  ? 'bg-emerald-600 border-emerald-500'
                                  : 'border-slate-600 group-hover:border-blue-500'
                              }`}
                            >
                              {done && <Check size={10} className="text-white" />}
                            </button>
                            <span className={`text-sm leading-relaxed ${done ? 'line-through text-slate-600' : 'text-slate-300'}`}>
                              {task}
                            </span>
                          </label>
                        );
                      })}
                    </div>

                    {isCurrent && (
                      <button
                        onClick={() => markStageComplete(stage.id)}
                        className="mt-4 flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm px-4 py-2 rounded-xl transition-colors"
                      >
                        <Flag size={14} /> Mark Stage Complete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Weekly Execution Engine */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
        <p className="font-black uppercase tracking-widest text-[10px] text-blue-400 mb-1">Weekly Execution Engine</p>
        <h3 className="text-white font-bold text-lg mb-4">This Week's Focus — {currentStageName}</h3>
        <div className="space-y-3">
          {weeklyTasks.map((task, idx) => {
            const done = weeklyTasksDone[idx];
            return (
              <div key={idx} className="flex items-start gap-3 bg-slate-900 rounded-xl p-3">
                <button
                  onClick={() => toggleWeeklyTask(idx)}
                  className={`mt-0.5 shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                    done ? 'bg-blue-600 border-blue-500' : 'border-slate-600 hover:border-blue-500'
                  }`}
                >
                  {done && <Check size={11} className="text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${done ? 'line-through text-slate-600' : 'text-slate-300'}`}>{task}</p>
                  <MiniChat
                    context={`Week ${progress.currentStage} focus task: "${task}". Stage: ${currentStageName}.`}
                    placeholder={`Ask for help with: ${task}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULES TAB
// ═══════════════════════════════════════════════════════════════════════════════
function ModulesTab({ uid }) {
  const storageKey = `ifb_modules_${uid}`;
  const [enrolled, setEnrolled] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey)) || []; }
    catch { return []; }
  });
  const [expanded, setExpanded] = useState(null);

  function enroll(moduleId) {
    const updated = enrolled.includes(moduleId) ? enrolled : [...enrolled, moduleId];
    setEnrolled(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="mb-4">
        <p className="font-black uppercase tracking-widest text-[10px] text-slate-500 mb-1">Service Modules</p>
        <h2 className="text-xl font-black text-white">Deep-Dive Execution Modules</h2>
        <p className="text-slate-400 text-sm mt-1">Each module is a focused sprint with deliverables, expert guidance, and an AI advisor.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {MODULES.map(mod => {
          const Icon = mod.icon;
          const isEnrolled = enrolled.includes(mod.id);
          const isExpanded = expanded === mod.id;

          return (
            <div key={mod.id} className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${mod.bg} flex items-center justify-center`}>
                      <Icon size={18} className={mod.color} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">{mod.title}</h3>
                      <p className={`text-xs ${mod.color}`}>{mod.tagline}</p>
                    </div>
                  </div>
                  {isEnrolled && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-800 px-2 py-1 rounded-full">
                      <CheckCircle2 size={10} /> Enrolled
                    </span>
                  )}
                </div>

                {/* Meta */}
                <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                  <span className="flex items-center gap-1"><Clock size={11} /> {mod.timeline}</span>
                  <span className="flex items-center gap-1"><DollarSign size={11} /> ${mod.price.toLocaleString()}</span>
                </div>

                {/* Outcome */}
                <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                  <span className="text-white font-semibold">Outcome:</span> {mod.outcome}
                </p>

                {/* Deliverables */}
                <div className="space-y-1 mb-4">
                  {mod.deliverables.map((d, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Check size={10} className="text-blue-400 shrink-0" /> {d}
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {!isEnrolled ? (
                    <button
                      onClick={() => enroll(mod.id)}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2.5 rounded-xl transition-colors"
                    >
                      Enroll in Module
                    </button>
                  ) : (
                    <button
                      disabled
                      className="flex-1 bg-emerald-900/40 text-emerald-400 font-bold text-xs py-2.5 rounded-xl border border-emerald-800/50 cursor-default"
                    >
                      Enrolled ✓
                    </button>
                  )}
                  <button
                    onClick={() => setExpanded(isExpanded ? null : mod.id)}
                    className="px-3 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl transition-colors"
                  >
                    <MessageSquare size={14} className="text-blue-400" />
                  </button>
                </div>

                {/* AI Module Advisor */}
                {isExpanded && (
                  <div className="mt-3">
                    <MiniChat
                      context={`Module: ${mod.title}. Description: ${mod.tagline}. Deliverables: ${mod.deliverables.join(', ')}. Outcome: ${mod.outcome}. Duration: ${mod.timeline}.`}
                      placeholder={`Ask anything about the ${mod.title} module…`}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRICING TAB
// ═══════════════════════════════════════════════════════════════════════════════
function PricingTab({ uid, userEmail }) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const TIERS = [
    {
      name: 'Starter',
      price: 750,
      target: 'Idea / Side Project stage',
      popular: false,
      features: [
        '1 module per month',
        'Weekly check-in email',
        'Community access',
        'AI advisor (unlimited)',
      ],
    },
    {
      name: 'Growth',
      price: 1500,
      target: 'MVP / Early Revenue stage',
      popular: true,
      features: [
        '2 modules per month',
        'Bi-weekly 1-on-1 with IFB advisor (45 min)',
        'All community features',
        'Priority AI advisor',
        'Fundraising introduction (1 investor/month)',
      ],
    },
    {
      name: 'Venture',
      price: 3000,
      target: 'Revenue / Scaling stage',
      popular: false,
      features: [
        'All modules included',
        'Weekly 1-on-1 with senior IFB advisor',
        'Direct investor intros (3/month)',
        'CFO office hours (monthly)',
        'Custom execution roadmap',
        'Co-investment consideration at $500K+ ARR',
      ],
    },
  ];

  function handleSelect(tierName) {
    setSelectedPlan(tierName);
    setModalOpen(true);
    const planKey = `ifb_accelerator_plan_${uid}`;
    localStorage.setItem(planKey, JSON.stringify({ plan: tierName, selectedAt: new Date().toISOString() }));
  }

  return (
    <div className="space-y-8 pt-2">
      <div>
        <p className="font-black uppercase tracking-widest text-[10px] text-slate-500 mb-1">Accelerator Pricing</p>
        <h2 className="text-xl font-black text-white">Choose Your Program Tier</h2>
        <p className="text-slate-400 text-sm mt-1">All tiers include AI advisors, community access, and the IFB execution framework.</p>
      </div>

      {/* Tier cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        {TIERS.map(tier => (
          <div
            key={tier.name}
            className={`relative bg-slate-800 rounded-2xl border p-6 flex flex-col ${
              tier.popular
                ? 'border-blue-500 ring-1 ring-blue-500/30'
                : 'border-slate-700'
            }`}
          >
            {tier.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                  Most Popular
                </span>
              </div>
            )}

            <div className="mb-4">
              <h3 className="text-white font-black text-lg">{tier.name}</h3>
              <p className="text-slate-500 text-xs mt-0.5">{tier.target}</p>
            </div>

            <div className="mb-5">
              <span className="text-3xl font-black text-white">${tier.price.toLocaleString()}</span>
              <span className="text-slate-500 text-sm">/month</span>
            </div>

            <div className="space-y-2.5 flex-1 mb-6">
              {tier.features.map((f, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle2 size={13} className="text-blue-400 mt-0.5 shrink-0" />
                  <span className="text-slate-300 text-sm">{f}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleSelect(tier.name)}
              className={`w-full font-bold py-2.5 rounded-xl transition-colors text-sm ${
                tier.popular
                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-white'
              }`}
            >
              Select Plan
            </button>
          </div>
        ))}
      </div>

      {/* Performance alignment */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-800 border border-slate-600 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <Info size={18} className="text-blue-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-black uppercase tracking-widest text-[10px] text-blue-400 mb-1.5">Performance Alignment</p>
            <p className="text-slate-300 text-sm leading-relaxed">
              Founders in the <span className="text-white font-semibold">Growth</span> and <span className="text-white font-semibold">Venture</span> tiers
              who reach $100K+ ARR with IFB support offer an optional <span className="text-white font-semibold">1% equity pledge</span> or
              <span className="text-white font-semibold"> $5,000 milestone bonus</span>. This aligns our incentives: we only win when you win.
            </p>
          </div>
        </div>
      </div>

      {/* Add-ons */}
      <div>
        <p className="font-black uppercase tracking-widest text-[10px] text-slate-500 mb-4">Add-Ons — Available Separately</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ADDONS.map(addon => {
            const Icon = addon.icon;
            return (
              <div key={addon.title} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <Icon size={18} className="text-slate-400 mb-2" />
                <p className="text-white font-bold text-sm">{addon.title}</p>
                <p className="text-slate-500 text-xs mt-1 leading-relaxed">{addon.desc}</p>
                <p className="text-blue-400 font-black text-base mt-2">${addon.price}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Plan selected modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="text-center space-y-4">
          <div className="w-14 h-14 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle2 size={28} className="text-blue-400" />
          </div>
          <h3 className="text-white font-black text-lg">{selectedPlan} Plan Selected</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Your IFB advisor will contact you at{' '}
            <span className="text-blue-400 font-semibold">{userEmail || 'your email address'}</span>{' '}
            within 24 hours to complete enrollment and get you started.
          </p>
          <div className="bg-slate-800 rounded-xl p-4 text-left">
            <p className="text-slate-500 text-xs">What happens next:</p>
            <div className="mt-2 space-y-1.5">
              {[
                'IFB advisor reaches out within 24 hours',
                'Onboarding call scheduled (30 minutes)',
                'Program access granted immediately after',
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                  <div className="w-4 h-4 rounded-full bg-blue-600/30 flex items-center justify-center shrink-0">
                    <span className="text-blue-400 font-bold text-[9px]">{i + 1}</span>
                  </div>
                  {step}
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => setModalOpen(false)}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl transition-colors"
          >
            Got it
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function VentureXAccelerator({ session, myCompany }) {
  const [innerTab, setInnerTab] = useState('OVERVIEW');
  const uid = session?.user?.id || 'guest';
  const userEmail = session?.user?.email || '';

  function goToTab(tab) { setInnerTab(tab); }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-950 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center gap-3 py-3 mb-1">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Rocket size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-white font-black text-sm leading-none">IFB Accelerator</h1>
              <p className="text-slate-500 text-[10px] uppercase tracking-widest">Startup Execution Platform</p>
            </div>
          </div>

          {/* Pill nav */}
          <div className="flex gap-1 overflow-x-auto scrollbar-none pb-3">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setInnerTab(tab)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-colors ${
                  innerTab === tab
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {innerTab === 'OVERVIEW' && (
          <OverviewTab onApply={() => goToTab('APPLY')} />
        )}
        {innerTab === 'APPLY' && (
          <ApplyTab
            uid={uid}
            userEmail={userEmail}
            onAccepted={() => goToTab('PROGRAM')}
          />
        )}
        {innerTab === 'PROGRAM' && (
          <ProgramTab
            uid={uid}
            onGoApply={() => goToTab('APPLY')}
          />
        )}
        {innerTab === 'MODULES' && (
          <ModulesTab uid={uid} />
        )}
        {innerTab === 'PRICING' && (
          <PricingTab uid={uid} userEmail={userEmail} />
        )}
      </div>
    </div>
  );
}
