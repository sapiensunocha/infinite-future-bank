/**
 * VentureX Launchpad — Entrepreneur Journey, IFB Fund, Mentors & Membership
 * From idea to first revenue, step by step.
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
  Rocket, CheckCircle2, Circle, ChevronRight, ChevronDown, ChevronUp,
  Star, Users, DollarSign, Zap, BookOpen, Target, TrendingUp,
  Award, Globe, HeartHandshake, Briefcase, ShieldCheck, Lock,
  ArrowRight, Play, Clock, BarChart3, Lightbulb, Package,
  Megaphone, CreditCard, Mail, CheckSquare, XCircle, Loader2,
  Building2, GraduationCap, BadgeDollarSign, Handshake
} from 'lucide-react';

// ─── Journey stages: Idea → First Revenue ───────────────────────────────────
const STAGES = [
  {
    id: 'idea',
    label: 'Idea',
    icon: Lightbulb,
    color: 'from-violet-500 to-purple-600',
    badge: 'bg-violet-100 text-violet-700',
    dot: 'bg-violet-500',
    description: 'Turn your concept into a clear problem-solution statement.',
    tasks: [
      { id: 't1', label: 'Define the problem you\'re solving', resource: 'IFB Problem Canvas' },
      { id: 't2', label: 'Identify your target customer (persona)', resource: 'IFB Persona Builder' },
      { id: 't3', label: 'Write a one-sentence value proposition', resource: null },
      { id: 't4', label: 'Research 3 competitors and their weaknesses', resource: 'VentureX Market Intel' },
    ],
    tools: ['IFB Advisory (Idea Stage)', 'Market Intelligence', 'Pascaline AI CFO'],
  },
  {
    id: 'validate',
    label: 'Validate',
    icon: Target,
    color: 'from-blue-500 to-indigo-600',
    badge: 'bg-blue-100 text-blue-700',
    dot: 'bg-blue-500',
    description: 'Confirm real demand before spending a dollar on building.',
    tasks: [
      { id: 't5', label: 'Conduct 10+ customer discovery interviews', resource: null },
      { id: 't6', label: 'Build a landing page and collect 100 signups', resource: 'IFB Landing Page Tool' },
      { id: 't7', label: 'Get 5 people to pay (pre-order / deposit)', resource: 'IFB Pay' },
      { id: 't8', label: 'Document your demand evidence', resource: null },
    ],
    tools: ['IFB Pay (Pre-orders)', 'Email Outreach', 'VentureX Matchmaker'],
  },
  {
    id: 'structure',
    label: 'Structure',
    icon: Building2,
    color: 'from-sky-500 to-cyan-600',
    badge: 'bg-sky-100 text-sky-700',
    dot: 'bg-sky-500',
    description: 'Set up your legal, financial, and operational foundation.',
    tasks: [
      { id: 't9', label: 'Register your business (LLC, Ltd, SARL, etc.)', resource: 'IFB Legal Partners' },
      { id: 't10', label: 'Open a business bank account', resource: 'IFB Banking Partners' },
      { id: 't11', label: 'Set up basic accounting (revenue, expenses)', resource: 'IFB Finance Tools' },
      { id: 't12', label: 'Define your pricing model', resource: 'Pascaline AI CFO' },
    ],
    tools: ['IFB Legal Partners', 'IFB Banking', 'Advisory Package'],
  },
  {
    id: 'build',
    label: 'Build MVP',
    icon: Package,
    color: 'from-emerald-500 to-teal-600',
    badge: 'bg-emerald-100 text-emerald-700',
    dot: 'bg-emerald-500',
    description: 'Build the smallest version that delivers real value.',
    tasks: [
      { id: 't13', label: 'List only the 3 must-have features for v1', resource: null },
      { id: 't14', label: 'Build or source MVP in under 8 weeks', resource: 'IFB Tech Partners' },
      { id: 't15', label: 'Test with 10 real beta users', resource: null },
      { id: 't16', label: 'Iterate based on feedback — ship v2', resource: null },
    ],
    tools: ['IFB Tech Partners', 'VentureX Product Studio', 'IFB Fund Credits'],
  },
  {
    id: 'launch',
    label: 'Launch',
    icon: Rocket,
    color: 'from-orange-500 to-amber-600',
    badge: 'bg-orange-100 text-orange-700',
    dot: 'bg-orange-500',
    description: 'Go public. Get your first real paying customers.',
    tasks: [
      { id: 't17', label: 'Set up payment processing (Stripe, mobile money, IFB Pay)', resource: 'IFB Pay' },
      { id: 't18', label: 'Launch on 2 channels (social, community, email)', resource: 'IFB Email Outreach' },
      { id: 't19', label: 'Activate your first 50 paying users', resource: null },
      { id: 't20', label: 'Collect and publish testimonials', resource: null },
    ],
    tools: ['IFB Pay', 'VentureX Feed', 'Mentor Support'],
  },
  {
    id: 'revenue',
    label: 'First Revenue',
    icon: DollarSign,
    color: 'from-yellow-400 to-amber-500',
    badge: 'bg-yellow-100 text-yellow-700',
    dot: 'bg-yellow-400',
    description: 'You are earning. Now make it consistent and scalable.',
    tasks: [
      { id: 't21', label: 'Hit $1,000 MRR (Monthly Recurring Revenue)', resource: 'IFB Finance Dashboard' },
      { id: 't22', label: 'Define your CAC and LTV', resource: 'Pascaline AI CFO' },
      { id: 't23', label: 'Build a repeatable sales process', resource: 'IFB Advisory — Growth' },
      { id: 't24', label: 'Apply for IFB Entrepreneur Fund', resource: 'IFB Fund' },
    ],
    tools: ['IFB Fund', 'VentureX Investor Match', 'IFB Growth Advisory'],
  },
  {
    id: 'scale',
    label: 'Scale',
    icon: TrendingUp,
    color: 'from-rose-500 to-pink-600',
    badge: 'bg-rose-100 text-rose-700',
    dot: 'bg-rose-500',
    description: 'Raise capital, hire your team, expand to new markets.',
    tasks: [
      { id: 't25', label: 'Apply for Seed or Series A funding', resource: 'VentureX Matchmaker' },
      { id: 't26', label: 'Hire your first 3 key roles', resource: 'IFB HR Partners' },
      { id: 't27', label: 'Expand to a second market or distribution channel', resource: null },
      { id: 't28', label: 'Apply for IFB Certified Entrepreneur badge', resource: 'IFB Audit' },
    ],
    tools: ['VentureX Investor Match', 'IFB Fund (Scale Tier)', 'IFB Franchise Network'],
  },
];

// ─── Mentor profiles ─────────────────────────────────────────────────────────
const MENTORS = [
  { id: 'm1', name: 'Amara Diallo', title: 'GTM Strategist', expertise: 'Go-To-Market', region: 'West Africa', sessions: 142, rating: 4.9, avatar: '🇸🇳', bio: '15 years scaling B2C brands across francophone Africa. Launched 3 products to $1M ARR.' },
  { id: 'm2', name: 'James Okafor', title: 'FinTech Founder', expertise: 'Fundraising', region: 'Pan-Africa', sessions: 98, rating: 4.8, avatar: '🇳🇬', bio: 'Raised $12M across 2 startups. Former Y Combinator. Expert in SAFE notes and term sheets.' },
  { id: 'm3', name: 'Priya Nair', title: 'Product Leader', expertise: 'Product', region: 'Global', sessions: 215, rating: 5.0, avatar: '🇮🇳', bio: 'Ex-Google PM. Built 0→1 products used by 50M+ users. Specializes in MVPs and user research.' },
  { id: 'm4', name: 'Marcus Chen', title: 'B2B Sales Expert', expertise: 'Sales', region: 'Asia/Global', sessions: 87, rating: 4.7, avatar: '🇸🇬', bio: 'Closed $30M in enterprise deals. Expert at outbound, demos, and negotiation.' },
  { id: 'm5', name: 'Fatima Al-Rashid', title: 'Legal Counsel', expertise: 'Legal', region: 'MENA', sessions: 63, rating: 4.9, avatar: '🇦🇪', bio: 'Startup lawyer specializing in incorporation, IP, and cross-border compliance.' },
  { id: 'm6', name: 'David Mensah', title: 'Growth Hacker', expertise: 'Growth', region: 'Africa/Europe', sessions: 176, rating: 4.8, avatar: '🇬🇭', bio: 'Grew 4 startups from 0 to 100k users. Expert in viral loops, SEO, and community-led growth.' },
  { id: 'm7', name: 'Sarah Kimani', title: 'Impact Investor', expertise: 'Finance', region: 'East Africa', sessions: 54, rating: 4.9, avatar: '🇰🇪', bio: 'CFO background. Expert in financial modeling, runway optimization, and investor relations.' },
  { id: 'm8', name: 'Lucas Ferrara', title: 'Tech Architect', expertise: 'Technology', region: 'South America', sessions: 119, rating: 4.7, avatar: '🇧🇷', bio: 'CTO of 2 funded startups. Specializes in scalable architecture and engineering hiring.' },
];

const EXPERTISE_FILTERS = ['All', 'Go-To-Market', 'Fundraising', 'Product', 'Sales', 'Legal', 'Growth', 'Finance', 'Technology'];

// ─── Membership tiers ────────────────────────────────────────────────────────
const TIERS = [
  {
    id: 'explorer',
    name: 'Explorer',
    price: 'Free',
    priceNote: 'Always free',
    color: 'border-slate-200',
    headerColor: 'bg-slate-50',
    badge: 'bg-slate-100 text-slate-600',
    icon: Globe,
    features: [
      'Access to Journey Roadmap',
      'Browse Mentor Directory',
      'VentureX Feed (read-only)',
      'Basic IFB Tools',
      '1 Mentor intro session/month',
    ],
    formula: 'Qualifier: Any stage — no requirement.',
    cta: 'Current Plan',
    disabled: true,
  },
  {
    id: 'builder',
    name: 'Builder',
    price: '$29/mo',
    priceNote: 'or 0.5% of first $10K revenue',
    color: 'border-blue-400',
    headerColor: 'bg-blue-50',
    badge: 'bg-blue-100 text-blue-700',
    icon: Package,
    features: [
      'Everything in Explorer',
      'Unlimited mentor sessions',
      'IFB Fund application access',
      'VentureX Matchmaker (limited)',
      'Priority advisory queue',
      'Partner service discounts (20%)',
    ],
    formula: 'Qualifier: Validated idea or MVP built. Pay flat $29/mo OR 0.5% of first $10K earned via IFB ecosystem.',
    cta: 'Upgrade to Builder',
    disabled: false,
  },
  {
    id: 'venture',
    name: 'Venture',
    price: '$99/mo',
    priceNote: 'or 1% equity pledge (capped at $5K)',
    color: 'border-amber-400',
    headerColor: 'bg-amber-50',
    badge: 'bg-amber-100 text-amber-700',
    icon: Rocket,
    features: [
      'Everything in Builder',
      'IFB Entrepreneur Fund (up to $25K credits)',
      'Full VentureX Investor Matching',
      'Dedicated IFB Advisor (monthly call)',
      'Partner network (banking, legal, logistics)',
      'IFB Certified badge eligibility',
      'Invite to IFB Investor Demo Days',
    ],
    formula: 'Qualifier: First revenue achieved OR readiness score 60%+. Pay flat $99/mo OR pledge 1% equity to IFB Fund (capped at $5,000 total).',
    cta: 'Upgrade to Venture',
    disabled: false,
  },
  {
    id: 'elite',
    name: 'Elite',
    price: 'Vetted',
    priceNote: 'By application only',
    color: 'border-purple-500',
    headerColor: 'bg-gradient-to-br from-purple-50 to-indigo-50',
    badge: 'bg-purple-100 text-purple-700',
    icon: Award,
    features: [
      'Everything in Venture',
      'IFB Fund up to $500K investment credits',
      'Access to IFB $1T Entrepreneur Fund pool',
      'Direct IFB Board mentoring',
      'Co-investment with IFB partners',
      'Featured on VentureX global feed',
      'IFB Elite Certification',
      'Revenue-share model available',
    ],
    formula: 'Qualifier: $10K+ MRR OR $100K+ raised OR IFB vetting committee approval. Fee: structured revenue-share agreement.',
    cta: 'Apply for Elite',
    disabled: false,
  },
];

// ─── IFB Fund data ────────────────────────────────────────────────────────────
const FUND_CRITERIA = [
  { label: 'Business registered', icon: ShieldCheck },
  { label: 'Readiness score ≥ 40%', icon: BarChart3 },
  { label: 'At least Idea stage validated', icon: Target },
  { label: 'IFB profile complete (KYC)', icon: CheckCircle2 },
  { label: 'Builder tier or above', icon: Star },
];

const FUND_USES = [
  { label: 'IFB Advisory packages', icon: Briefcase },
  { label: 'Legal & compliance (IFB Legal partners)', icon: ShieldCheck },
  { label: 'Tech build (IFB Tech partners)', icon: Zap },
  { label: 'Marketing & outreach (IFB tools)', icon: Megaphone },
  { label: 'IFB Banking services', icon: CreditCard },
  { label: 'VentureX Marketplace vendors', icon: Globe },
];

// ─── Helper components ────────────────────────────────────────────────────────
const SubTab = ({ id, label, icon: Icon, active, onClick }) => (
  <button onClick={() => onClick(id)}
    className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${active ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:border-blue-300 hover:text-blue-600'}`}>
    <Icon size={13} /> {label}
  </button>
);

const Pill = ({ children, color = 'bg-slate-100 text-slate-600' }) => (
  <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${color}`}>{children}</span>
);

// ═══════════════════════════════════════════════════════════════════════════════
export default function VentureXLaunchpad({ session, myCompany }) {
  const [sub, setSub] = useState('journey');
  const [completedTasks, setCompletedTasks] = useState({});
  const [expandedStage, setExpandedStage] = useState('idea');
  const [mentorFilter, setMentorFilter] = useState('All');
  const [bookingMentor, setBookingMentor] = useState(null);
  const [fundApplying, setFundApplying] = useState(false);
  const [fundForm, setFundForm] = useState({ amount: 5000, use_case: '', business_stage: 'idea', description: '' });
  const [fundSubmitted, setFundSubmitted] = useState(false);
  const [toast, setToast] = useState(null);
  const [memberApplying, setMemberApplying] = useState(null);

  const uid = session?.user?.id;

  const notify = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load saved progress from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`ifb_journey_${uid}`);
    if (saved) setCompletedTasks(JSON.parse(saved));
  }, [uid]);

  const toggleTask = (taskId) => {
    setCompletedTasks(prev => {
      const next = { ...prev, [taskId]: !prev[taskId] };
      localStorage.setItem(`ifb_journey_${uid}`, JSON.stringify(next));
      return next;
    });
  };

  // Compute overall progress
  const totalTasks = STAGES.reduce((a, s) => a + s.tasks.length, 0);
  const doneTasks = Object.values(completedTasks).filter(Boolean).length;
  const overallPct = Math.round((doneTasks / totalTasks) * 100);

  // Current stage = first stage with incomplete tasks
  const currentStageIndex = STAGES.findIndex(s => s.tasks.some(t => !completedTasks[t.id]));
  const currentStage = STAGES[Math.max(0, currentStageIndex)];

  const handleFundSubmit = async () => {
    setFundApplying(true);
    try {
      await supabase.from('venturex_audit_log').insert({
        user_id: uid,
        action: 'ifb_fund_application',
        details: { ...fundForm, timestamp: new Date().toISOString() }
      });
      setFundSubmitted(true);
      notify('Application submitted! Our team will review within 48 hours.');
    } catch {
      notify('Error submitting. Please try again.', 'error');
    } finally { setFundApplying(false); }
  };

  const handleBookMentor = async (mentor) => {
    try {
      await supabase.from('venturex_mentorships').insert({
        mentee_user_id: uid,
        mentor_name: mentor.name,
        expertise: mentor.expertise,
        status: 'requested',
        notes: `Session request from IFB Launchpad`
      });
      notify(`Booking request sent to ${mentor.name}! Expect a response within 24h.`);
      setBookingMentor(null);
    } catch {
      notify('Could not send request. Please try again.', 'error');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 pb-16 space-y-6">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-4 rounded-2xl shadow-2xl text-sm font-black max-w-xs border ${toast.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 rounded-[2rem] p-8 text-white relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl" />
        <div className="relative">
          <Pill color="bg-blue-500/20 text-blue-300">IFB Entrepreneur Program</Pill>
          <h1 className="text-2xl font-black mt-3 mb-1">VentureX Launchpad</h1>
          <p className="text-sm text-slate-300 max-w-lg">From your first idea to your first dollar — structured support, real mentors, and capital access at every step.</p>

          {/* Progress bar */}
          <div className="mt-6 max-w-lg">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              <span>Your Progress</span>
              <span>{doneTasks}/{totalTasks} tasks · Stage: {currentStage?.label}</span>
            </div>
            <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-400 to-emerald-400 rounded-full transition-all duration-700" style={{ width: `${overallPct}%` }} />
            </div>
            <p className="text-[9px] text-slate-400 mt-1.5">{overallPct}% complete</p>
          </div>

          {/* IFB Fund banner */}
          <div className="mt-5 flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 max-w-lg">
            <BadgeDollarSign size={20} className="text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-black text-white">IFB Entrepreneur Fund · <span className="text-amber-400">$1 Trillion Pool</span></p>
              <p className="text-[10px] text-slate-400">Vetted entrepreneurs receive investment credits usable across IFB & partners.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 flex-wrap">
        <SubTab id="journey" label="Journey" icon={Rocket} active={sub === 'journey'} onClick={setSub} />
        <SubTab id="fund" label="IFB Fund" icon={BadgeDollarSign} active={sub === 'fund'} onClick={setSub} />
        <SubTab id="mentors" label="Free Mentors" icon={GraduationCap} active={sub === 'mentors'} onClick={setSub} />
        <SubTab id="membership" label="Membership" icon={Star} active={sub === 'membership'} onClick={setSub} />
      </div>

      {/* ── JOURNEY TAB ────────────────────────────────────────────────────── */}
      {sub === 'journey' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex gap-3 items-start">
            <Lightbulb size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 font-bold">Check off tasks as you complete them. Your progress is saved automatically. IFB tools and partner services are linked at each stage.</p>
          </div>

          {STAGES.map((stage, idx) => {
            const Icon = stage.icon;
            const stageDone = stage.tasks.filter(t => completedTasks[t.id]).length;
            const stagePct = Math.round((stageDone / stage.tasks.length) * 100);
            const isOpen = expandedStage === stage.id;
            const isCurrentStage = currentStage?.id === stage.id;
            const isCompleted = stagePct === 100;

            return (
              <div key={stage.id} className={`bg-white border-2 rounded-[2rem] overflow-hidden transition-all ${isCurrentStage ? 'border-blue-400 shadow-lg shadow-blue-100' : isCompleted ? 'border-emerald-300' : 'border-slate-200'}`}>
                <button className="w-full flex items-center gap-4 p-6 text-left hover:bg-slate-50/50 transition-colors" onClick={() => setExpandedStage(isOpen ? null : stage.id)}>
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stage.color} flex items-center justify-center shrink-0 shadow-md`}>
                    <Icon size={20} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Stage {idx + 1}</span>
                      {isCurrentStage && <Pill color="bg-blue-100 text-blue-700">Current Stage</Pill>}
                      {isCompleted && <Pill color="bg-emerald-100 text-emerald-700">Completed</Pill>}
                    </div>
                    <p className="font-black text-slate-800 text-sm">{stage.label}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{stage.description}</p>
                    <div className="h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden max-w-[200px]">
                      <div className={`h-full bg-gradient-to-r ${stage.color} rounded-full transition-all`} style={{ width: `${stagePct}%` }} />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[11px] font-black text-slate-500">{stageDone}/{stage.tasks.length}</span>
                    {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 px-6 pb-6 pt-4 space-y-3">
                    {/* Tasks */}
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Tasks</p>
                    {stage.tasks.map(task => {
                      const done = completedTasks[task.id];
                      return (
                        <label key={task.id} className={`flex items-start gap-3 p-3.5 rounded-2xl cursor-pointer transition-all border ${done ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100 hover:border-blue-200'}`}>
                          <button onClick={() => toggleTask(task.id)} className="mt-0.5 shrink-0">
                            {done
                              ? <CheckCircle2 size={18} className="text-emerald-500" />
                              : <Circle size={18} className="text-slate-300" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-bold ${done ? 'text-emerald-700 line-through' : 'text-slate-700'}`}>{task.label}</p>
                            {task.resource && (
                              <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                <Zap size={9} /> {task.resource}
                              </span>
                            )}
                          </div>
                        </label>
                      );
                    })}

                    {/* IFB Tools */}
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">IFB Tools & Partners at this stage</p>
                      <div className="flex flex-wrap gap-2">
                        {stage.tools.map(tool => (
                          <span key={tool} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-[10px] font-black border border-blue-100 flex items-center gap-1">
                            <ChevronRight size={10} /> {tool}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── FUND TAB ───────────────────────────────────────────────────────── */}
      {sub === 'fund' && (
        <div className="space-y-6">
          {/* Fund hero */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-[2rem] p-8 relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-48 h-48 bg-amber-200/40 rounded-full blur-2xl" />
            <div className="relative">
              <Pill color="bg-amber-200 text-amber-800">IFB Entrepreneur Fund</Pill>
              <h2 className="text-xl font-black text-slate-900 mt-3">$1,000,000,000,000</h2>
              <p className="text-[11px] font-black uppercase tracking-widest text-amber-700 mb-1">One Trillion Dollar Aspirational Pool</p>
              <p className="text-sm text-slate-600 max-w-lg">IFB commits to building the world's largest entrepreneur support fund. Vetted entrepreneurs receive investment credits — not cash — usable across IFB features and certified partners.</p>

              <div className="grid grid-cols-3 gap-4 mt-6">
                {[
                  { label: 'Max credits (Builder)', value: '$5,000' },
                  { label: 'Max credits (Venture)', value: '$25,000' },
                  { label: 'Max credits (Elite)', value: '$500,000' },
                ].map(s => (
                  <div key={s.label} className="bg-white/70 border border-amber-200 rounded-2xl p-4 text-center">
                    <p className="text-lg font-black text-slate-900">{s.value}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Eligibility */}
            <div className="bg-white border border-slate-200 rounded-[2rem] p-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-700 mb-4 flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-500" /> Eligibility Criteria</h3>
              <div className="space-y-3">
                {FUND_CRITERIA.map(c => (
                  <div key={c.label} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                      <c.icon size={13} className="text-emerald-600" />
                    </div>
                    <span className="text-xs font-bold text-slate-700">{c.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* What credits cover */}
            <div className="bg-white border border-slate-200 rounded-[2rem] p-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-700 mb-4 flex items-center gap-2"><Zap size={16} className="text-blue-500" /> What Credits Cover</h3>
              <div className="space-y-3">
                {FUND_USES.map(u => (
                  <div key={u.label} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                      <u.icon size={13} className="text-blue-600" />
                    </div>
                    <span className="text-xs font-bold text-slate-700">{u.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mentoring note */}
          <div className="bg-purple-50 border border-purple-200 rounded-2xl px-5 py-4 flex gap-3 items-start">
            <HeartHandshake size={16} className="text-purple-600 shrink-0 mt-0.5" />
            <p className="text-xs text-purple-800 font-bold">Every funded entrepreneur receives <span className="underline">free mentoring</span> from IFB's certified mentor network — matched to their sector, stage, and business model.</p>
          </div>

          {/* Application form */}
          {!fundSubmitted ? (
            <div className="bg-white border border-slate-200 rounded-[2rem] p-8">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-700 mb-6 flex items-center gap-2"><Rocket size={16} className="text-blue-500" /> Apply for IFB Fund Credits</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Amount Requested (USD)</label>
                  <input type="number" value={fundForm.amount} onChange={e => setFundForm(p => ({ ...p, amount: Number(e.target.value) }))}
                    min={500} max={500000} step={500}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Business Stage</label>
                  <select value={fundForm.business_stage} onChange={e => setFundForm(p => ({ ...p, business_stage: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm outline-none focus:border-blue-500 transition-colors cursor-pointer">
                    {['idea', 'validated', 'mvp_built', 'launched', 'revenue', 'scaling'].map(s => <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Primary Use Case</label>
                  <select value={fundForm.use_case} onChange={e => setFundForm(p => ({ ...p, use_case: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm outline-none focus:border-blue-500 transition-colors cursor-pointer">
                    <option value="">Select use case...</option>
                    {FUND_USES.map(u => <option key={u.label} value={u.label}>{u.label}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Describe Your Business & Why You Need Credits</label>
                  <textarea value={fundForm.description} onChange={e => setFundForm(p => ({ ...p, description: e.target.value }))}
                    rows={4} placeholder="What do you do, who do you serve, and how will these credits help you reach your next milestone?"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm outline-none focus:border-blue-500 transition-colors resize-none" />
                </div>
              </div>
              <button onClick={handleFundSubmit} disabled={fundApplying || !fundForm.use_case || !fundForm.description}
                className="mt-6 w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-sm rounded-2xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                {fundApplying ? <Loader2 size={16} className="animate-spin" /> : <BadgeDollarSign size={16} />}
                Submit IFB Fund Application
              </button>
            </div>
          ) : (
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-[2rem] p-10 text-center">
              <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-4" />
              <h3 className="text-lg font-black text-slate-800 mb-2">Application Submitted</h3>
              <p className="text-sm text-slate-600 mb-1">Our IFB team will review your application within <strong>48 hours</strong>.</p>
              <p className="text-xs text-slate-500">Track your application status in the VentureX Dashboard under <em>My Applications</em>.</p>
            </div>
          )}
        </div>
      )}

      {/* ── MENTORS TAB ────────────────────────────────────────────────────── */}
      {sub === 'mentors' && (
        <div className="space-y-5">
          <div className="bg-purple-50 border border-purple-200 rounded-2xl px-5 py-4 flex gap-3 items-start">
            <GraduationCap size={16} className="text-purple-600 shrink-0 mt-0.5" />
            <p className="text-xs text-purple-800 font-bold">All sessions are <span className="underline">free</span> for IFB Launchpad members. IFB compensates mentors directly. Sessions are 45 minutes, video call, scheduled within 48 hours of request.</p>
          </div>

          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            {EXPERTISE_FILTERS.map(f => (
              <button key={f} onClick={() => setMentorFilter(f)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${mentorFilter === f ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'}`}>
                {f}
              </button>
            ))}
          </div>

          {/* Mentor grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MENTORS.filter(m => mentorFilter === 'All' || m.expertise === mentorFilter).map(mentor => (
              <div key={mentor.id} className="bg-white border border-slate-200 rounded-[2rem] p-6 hover:border-blue-300 hover:shadow-md transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl shrink-0">{mentor.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-black text-slate-800 text-sm">{mentor.name}</h4>
                      <Pill color="bg-purple-100 text-purple-700">{mentor.expertise}</Pill>
                    </div>
                    <p className="text-[11px] text-slate-500 font-bold mt-0.5">{mentor.title}</p>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">{mentor.bio}</p>
                    <div className="flex items-center gap-4 mt-3">
                      <span className="flex items-center gap-1 text-[10px] font-black text-amber-600">
                        <Star size={11} fill="currentColor" /> {mentor.rating}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-black text-slate-500">
                        <Users size={11} /> {mentor.sessions} sessions
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-black text-slate-500">
                        <Globe size={11} /> {mentor.region}
                      </span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setBookingMentor(mentor)}
                  className="mt-4 w-full py-2.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                  <HeartHandshake size={13} /> Book Free Session
                </button>
              </div>
            ))}
          </div>

          {/* Booking modal */}
          {bookingMentor && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setBookingMentor(null)}>
              <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="text-3xl">{bookingMentor.avatar}</div>
                  <div>
                    <h4 className="font-black text-slate-800">{bookingMentor.name}</h4>
                    <p className="text-xs text-slate-500">{bookingMentor.title} · {bookingMentor.expertise}</p>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-5">
                  <p className="text-xs font-bold text-blue-800">45-min video session, fully free. IFB coordinates scheduling. You'll receive a calendar link within 24–48 hours.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setBookingMentor(null)} className="flex-1 py-3 border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
                  <button onClick={() => handleBookMentor(bookingMentor)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                    <CheckCircle2 size={14} /> Confirm Booking
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MEMBERSHIP TAB ─────────────────────────────────────────────────── */}
      {sub === 'membership' && (
        <div className="space-y-6">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4">
            <p className="text-xs font-bold text-slate-600">
              <span className="font-black text-slate-800">The IFB Formula:</span> pay based on what you have, not what you hope to earn. Early-stage founders pay little or nothing. As you grow, you contribute back to the ecosystem — sustaining support for the next generation of entrepreneurs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {TIERS.map(tier => {
              const Icon = tier.icon;
              return (
                <div key={tier.id} className={`bg-white border-2 ${tier.color} rounded-[2rem] overflow-hidden`}>
                  <div className={`${tier.headerColor} px-6 py-5 border-b border-slate-100`}>
                    <div className="flex items-center justify-between mb-3">
                      <Pill color={tier.badge}>{tier.name}</Pill>
                      <Icon size={20} className="text-slate-600" />
                    </div>
                    <p className="text-2xl font-black text-slate-900">{tier.price}</p>
                    <p className="text-[10px] font-bold text-slate-500 mt-0.5">{tier.priceNote}</p>
                  </div>
                  <div className="px-6 py-5 space-y-2">
                    {tier.features.map(f => (
                      <div key={f} className="flex items-start gap-2">
                        <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-xs font-bold text-slate-700">{f}</span>
                      </div>
                    ))}
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Qualification Formula</p>
                      <p className="text-[11px] text-slate-600 font-bold leading-relaxed">{tier.formula}</p>
                    </div>
                    <button
                      disabled={tier.disabled}
                      onClick={() => !tier.disabled && setMemberApplying(tier.id)}
                      className={`mt-4 w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${tier.disabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'}`}>
                      {tier.disabled ? <CheckCircle2 size={13} /> : <ArrowRight size={13} />}
                      {tier.disabled ? 'Current Plan' : tier.cta}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Upgrade modal */}
          {memberApplying && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setMemberApplying(null)}>
              <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                <h4 className="font-black text-slate-800 text-lg mb-3">{TIERS.find(t => t.id === memberApplying)?.name} Tier</h4>
                <p className="text-sm text-slate-600 mb-5">Your upgrade request has been noted. An IFB advisor will contact you at <strong>{session?.user?.email}</strong> within 24 hours to complete verification and onboarding.</p>
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-5">
                  <p className="text-xs font-bold text-blue-700">You can also complete your upgrade directly through your IFB Advisory package or by contacting <span className="underline">support@infinitefuturebank.org</span>.</p>
                </div>
                <button onClick={() => { setMemberApplying(null); notify('Request sent. An advisor will reach out within 24 hours.'); }}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-700 transition-colors">
                  Got it
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
