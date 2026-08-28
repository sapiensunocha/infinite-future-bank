import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
  Target, Sparkles, ChevronRight, CheckCircle2, Loader2, Lock,
  Users, Zap, MessageSquare, TrendingUp, Mail, Phone, Linkedin,
  Plus, X, Check, ArrowRight, Brain, Crosshair, Megaphone,
  BarChart3, Star, AlertCircle, Building2, Globe, Flag, Send,
  ClipboardList, UserCheck, PieChart, Trophy, RefreshCw, Download,
  Edit3, Save, ChevronDown, ChevronUp, Eye
} from 'lucide-react';

// ─── Gemini ──────────────────────────────────────────────────────────────────
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;

async function callGemini(prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
      }),
    }
  );
  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const match = raw.match(/```json\s*([\s\S]*?)```/) || raw.match(/\{[\s\S]*\}/);
  try { return JSON.parse(match ? (match[1] || match[0]) : raw); } catch { return { raw }; }
}

// ─── Constants ───────────────────────────────────────────────────────────────
const UNLOCK_FEE = 49;

const PHASES = [
  {
    id: 'clarity',
    num: 1,
    label: 'Business Clarity',
    icon: Brain,
    color: 'blue',
    locked: false,
    tagline: "Know exactly what you're selling and why it will win",
    duration: '~2 min AI generation',
  },
  {
    id: 'icp',
    num: 2,
    label: 'Customer Discovery',
    icon: Crosshair,
    color: 'violet',
    locked: true,
    tagline: 'Define exactly who to target and what questions to ask',
    duration: '~3 min AI generation',
  },
  {
    id: 'value_prop',
    num: 3,
    label: 'Value Proposition',
    icon: Star,
    color: 'amber',
    locked: true,
    tagline: 'Craft messaging that makes prospects say "I need this"',
    duration: '~2 min AI generation',
  },
  {
    id: 'gtm',
    num: 4,
    label: 'Go-to-Market',
    icon: Globe,
    color: 'emerald',
    locked: true,
    tagline: '30-day channel strategy ranked by your specific fit',
    duration: '~3 min AI generation',
  },
  {
    id: 'outreach',
    num: 5,
    label: 'Outreach Arsenal',
    icon: Megaphone,
    color: 'rose',
    locked: true,
    tagline: 'Ready-to-send email sequences, scripts & objection playbook',
    duration: '~4 min AI generation',
  },
  {
    id: 'close',
    num: 6,
    label: 'Close & Retain',
    icon: Trophy,
    color: 'orange',
    locked: true,
    tagline: 'Sales call script, proposal template, onboarding checklist',
    duration: '~3 min AI generation',
  },
  {
    id: 'scale',
    num: 7,
    label: 'Scale to 1,000',
    icon: TrendingUp,
    color: 'teal',
    locked: true,
    tagline: 'The exact playbook to go from 1 to 10 to 100 to 1,000 customers',
    duration: '~3 min AI generation',
  },
];

const LEAD_STATUSES = [
  { id: 'identified', label: 'Identified', color: 'slate' },
  { id: 'contacted', label: 'Contacted', color: 'blue' },
  { id: 'replied', label: 'Replied', color: 'violet' },
  { id: 'meeting', label: 'Meeting Set', color: 'amber' },
  { id: 'proposal', label: 'Proposal Sent', color: 'orange' },
  { id: 'won', label: 'Won ✓', color: 'emerald' },
  { id: 'lost', label: 'Lost', color: 'red' },
];

const COLOR = {
  blue:   { bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   text: 'text-blue-400',   btn: 'bg-blue-600 hover:bg-blue-500' },
  violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400', btn: 'bg-violet-600 hover:bg-violet-500' },
  amber:  { bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  text: 'text-amber-400',  btn: 'bg-amber-600 hover:bg-amber-500' },
  emerald:{ bg: 'bg-emerald-500/10',border: 'border-emerald-500/30',text: 'text-emerald-400',btn: 'bg-emerald-600 hover:bg-emerald-500' },
  rose:   { bg: 'bg-rose-500/10',   border: 'border-rose-500/30',   text: 'text-rose-400',   btn: 'bg-rose-600 hover:bg-rose-500' },
  orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', btn: 'bg-orange-600 hover:bg-orange-500' },
  teal:   { bg: 'bg-teal-500/10',   border: 'border-teal-500/30',   text: 'text-teal-400',   btn: 'bg-teal-600 hover:bg-teal-500' },
};

// ─── AI Prompt Builders ───────────────────────────────────────────────────────
function buildPrompt(phase, biz) {
  const ctx = `Business: "${biz.business_name}"
What they do: ${biz.what_you_do}
Problem they solve: ${biz.problem_you_solve}
Target customer: ${biz.target_customer}
Industry: ${biz.industry}
Current stage: ${biz.current_traction}`;

  const prompts = {
    clarity: `You are a startup advisor trained on Founder Institute, YC Combinator, and 500 Startups methodologies.
Analyze this business and return a JSON object with EXACTLY these keys:
${ctx}

Return JSON with:
{
  "refined_problem": "one precise sentence sharper than what they wrote",
  "unique_insight": "what insight about this market most founders miss",
  "founder_market_fit_score": 75,
  "founder_market_fit_reason": "3 sentences explaining the score",
  "real_pain": "the deeper emotional/financial pain 3 levels below the stated problem",
  "why_now": "2-3 sentences on market timing tailored to their industry",
  "red_flags": ["flag 1", "flag 2", "flag 3"],
  "green_flags": ["strength 1", "strength 2", "strength 3"],
  "one_sentence_pitch": "The X for Y that does Z",
  "recommended_first_move": "The single most important action to take this week"
}`,

    icp: `You are a B2B/B2C growth expert. Based on this business, create an Ideal Customer Profile and discovery toolkit.
${ctx}

Return JSON with:
{
  "icp": {
    "title": "Job title or type",
    "company_size": "e.g. 10-50 employees",
    "industry_focus": "specific sub-industries",
    "geography": "where they are",
    "annual_budget": "budget range for solutions like this",
    "key_frustrations": ["frustration 1", "frustration 2", "frustration 3", "frustration 4"],
    "current_workarounds": ["workaround 1", "workaround 2", "workaround 3"],
    "trigger_events": ["what event makes them actively look for a solution"],
    "success_looks_like": "what outcome they want"
  },
  "personas": [
    {
      "name": "Persona first name",
      "title": "Job title",
      "age_range": "30-45",
      "pain_score": 8,
      "willingness_to_pay": 7,
      "bio": "2 sentence bio",
      "quote": "What they say about this problem",
      "where_to_find": ["LinkedIn groups", "specific subreddits", "specific Slack communities", "events"],
      "objections": ["Their typical objection 1", "objection 2"]
    },
    { second persona },
    { third persona }
  ],
  "interview_script": {
    "intro": "2 sentence opener for cold outreach",
    "background_questions": ["5 questions about their current situation"],
    "problem_questions": ["5 questions probing the pain — NO leading questions"],
    "current_solution_questions": ["5 questions about what they do today"],
    "validation_questions": ["5 questions to test if they'd pay — NO leading questions"],
    "closing": "How to end the interview and what to offer"
  },
  "where_to_find_them": {
    "online": ["50 specific online places — subreddits, LinkedIn groups, Slack/Discord, forums, newsletters"],
    "offline": ["conferences, meetups, associations"],
    "warm_intro_paths": ["3 creative warm intro strategies"]
  },
  "target_companies": ["10 specific company names or types that are perfect first customers"]
}`,

    value_prop: `You are a positioning and messaging expert. Create a complete value proposition toolkit.
${ctx}
Phase 1 result available for context.

Return JSON with:
{
  "primary_value_prop": "One headline sentence (max 10 words)",
  "supporting_proof": "One sentence that backs up the headline",
  "positioning_statement": "For [target customer] who [need/want], [product] is a [category] that [key benefit]. Unlike [competitor], [product] [key differentiator].",
  "three_alternatives": [
    { "angle": "Pain-focused", "headline": "...", "subhead": "..." },
    { "angle": "Outcome-focused", "headline": "...", "subhead": "..." },
    { "angle": "Identity-focused", "headline": "...", "subhead": "..." }
  ],
  "messaging_by_persona": [
    { "persona": "Persona 1 name", "hook": "...", "pain_acknowledgment": "...", "solution_bridge": "...", "cta": "..." },
    { "persona": "Persona 2 name", "hook": "...", "pain_acknowledgment": "...", "solution_bridge": "...", "cta": "..." },
    { "persona": "Persona 3 name", "hook": "...", "pain_acknowledgment": "...", "solution_bridge": "...", "cta": "..." }
  ],
  "elevator_pitches": {
    "10_seconds": "One sentence",
    "30_seconds": "3 sentences",
    "2_minutes": "Full structured pitch"
  },
  "social_proof_needed": ["What proof points to get ASAP — specific testimonials, case studies, metrics"],
  "pricing_psychology": "Recommended pricing structure and anchoring strategy"
}`,

    gtm: `You are a go-to-market strategist who has launched 200+ B2B/B2C companies.
${ctx}

Return JSON with:
{
  "channel_ranking": [
    { "channel": "Channel name", "fit_score": 9, "why": "reason specific to their business", "effort": "low/medium/high", "time_to_first_customer": "days/weeks" }
  ],
  "thirty_day_plan": {
    "week_1": { "theme": "...", "daily_actions": ["Day 1: ...", "Day 2: ...", "Day 3: ...", "Day 4: ...", "Day 5: ..."], "goal": "what to have by end of week" },
    "week_2": { "theme": "...", "daily_actions": ["Day 1: ...", ...], "goal": "..." },
    "week_3": { "theme": "...", "daily_actions": [...], "goal": "..." },
    "week_4": { "theme": "...", "daily_actions": [...], "goal": "..." }
  },
  "linkedin_strategy": {
    "profile_headline": "Optimized LinkedIn headline",
    "connection_targets": "Who to connect with and filters to use",
    "content_topics": ["5 content topics that attract your ICP"],
    "weekly_actions": ["specific weekly LinkedIn actions"]
  },
  "partnership_targets": [
    { "type": "Partner type", "why": "why they have your customers", "approach": "how to approach them" }
  ],
  "metrics_to_track": ["metric 1", "metric 2", "metric 3", "metric 4", "metric 5"],
  "tools_needed": ["free/low-cost tools for each channel"],
  "budget_breakdown": { "zero_budget": "what to do with $0", "100_budget": "what to do with $100", "500_budget": "what to do with $500" }
}`,

    outreach: `You are a top B2B sales copywriter and SDR trainer. Create a complete outreach toolkit.
${ctx}

Return JSON with:
{
  "cold_email_sequences": [
    {
      "name": "Sequence A — Pain Hook",
      "emails": [
        { "day": 1, "subject": "...", "body": "Full email body (150 words max, personalization tokens in {{brackets}})", "cta": "..." },
        { "day": 3, "subject": "Re: ...", "body": "...", "cta": "..." },
        { "day": 7, "subject": "...", "body": "...", "cta": "..." },
        { "day": 14, "subject": "...", "body": "Last attempt...", "cta": "..." }
      ]
    },
    {
      "name": "Sequence B — Social Proof Hook",
      "emails": [ same structure ]
    }
  ],
  "linkedin_messages": {
    "connection_request": "300 char note for connection request",
    "first_message": "After connecting — 150 words max",
    "follow_up_1": "3 days later",
    "follow_up_2": "7 days later — add value",
    "inmail": "For premium outreach when not connected"
  },
  "cold_call_script": {
    "opener": "First 10 seconds",
    "permission_question": "Ask permission to continue",
    "problem_probe": "2-3 questions to find the pain",
    "pitch": "30 second pitch if they engage",
    "book_meeting": "How to close for a meeting",
    "voicemail": "15 second voicemail that gets callbacks"
  },
  "objection_playbook": [
    { "objection": "We're not interested", "response": "...", "follow_up": "..." },
    { "objection": "We don't have budget", "response": "...", "follow_up": "..." },
    { "objection": "We're happy with our current solution", "response": "...", "follow_up": "..." },
    { "objection": "Send me some information", "response": "...", "follow_up": "..." },
    { "objection": "Call me back in 6 months", "response": "...", "follow_up": "..." },
    { "objection": "We need to think about it", "response": "...", "follow_up": "..." },
    { "objection": "You're too expensive", "response": "...", "follow_up": "..." },
    { "objection": "We're too small / too big for this", "response": "...", "follow_up": "..." },
    { "objection": "I need to talk to my team", "response": "...", "follow_up": "..." },
    { "objection": "We tried something like this before and it didn't work", "response": "...", "follow_up": "..." }
  ],
  "referral_ask": "How to ask happy prospects to introduce you to others"
}`,

    close: `You are a sales closer who has helped 500+ startups close their first deals. Create a complete closing toolkit.
${ctx}

Return JSON with:
{
  "discovery_call_agenda": {
    "minutes_0_5": "Opening and rapport",
    "minutes_5_15": "Discovery questions to ask (list them)",
    "minutes_15_25": "Demo/presentation framework",
    "minutes_25_35": "Objection handling",
    "minutes_35_45": "Close and next steps",
    "questions_to_ask": ["20 specific discovery questions"]
  },
  "pilot_offer": {
    "name": "Name for the pilot program",
    "price": "Suggested pilot price and why",
    "duration": "How long",
    "deliverables": ["What they get"],
    "success_criteria": "How you both agree it worked",
    "upgrade_path": "What happens after pilot"
  },
  "proposal_template": {
    "executive_summary": "Template for exec summary",
    "problem_section": "How to describe their problem back to them",
    "solution_section": "How to present your solution",
    "proof_section": "Social proof / case study framework",
    "pricing_section": "3 tier pricing structure recommendation",
    "next_steps": "Clear next steps with dates"
  },
  "closing_techniques": [
    { "technique": "Technique name", "when_to_use": "...", "script": "..." }
  ],
  "onboarding_checklist": ["Step 1 onboarding actions", "Step 2", "..."],
  "success_metrics": ["What metrics to track with customer for renewal"],
  "testimonial_collection": "When and how to ask for a testimonial/case study"
}`,

    scale: `You are a growth expert who has helped companies scale from 1 to 10,000 customers.
${ctx}

Return JSON with:
{
  "one_to_ten": {
    "mindset": "Key mindset shift needed",
    "strategy": "Core strategy for 1→10",
    "weekly_actions": ["Specific weekly actions"],
    "pitfalls": ["Common mistakes at this stage"],
    "timeline": "Realistic timeline"
  },
  "ten_to_hundred": {
    "mindset": "Key shift",
    "strategy": "Core strategy for 10→100",
    "what_to_systematize": ["What processes to document"],
    "first_hire": "Who to hire first and why",
    "timeline": "Realistic timeline"
  },
  "hundred_to_thousand": {
    "strategy": "Core strategy",
    "channels_that_scale": ["Which channels become more important"],
    "what_to_automate": ["What to automate"],
    "team_structure": "Team structure needed",
    "timeline": "Realistic timeline"
  },
  "referral_engine": {
    "program_design": "How to structure your referral program",
    "incentive": "What to offer referrers",
    "ask_script": "Script for asking customers to refer",
    "tracking": "How to track referrals"
  },
  "content_flywheel": {
    "content_types": ["Content types that attract your ICP at scale"],
    "distribution": ["Where to publish"],
    "repurposing": "How to repurpose one piece of content 10 ways"
  },
  "key_metrics_by_stage": {
    "stage_1_10": ["metrics to track"],
    "stage_10_100": ["metrics to track"],
    "stage_100_1000": ["metrics to track"]
  },
  "revenue_milestones": [
    { "customers": 1, "target_mrr": "...", "key_activity": "..." },
    { "customers": 10, "target_mrr": "...", "key_activity": "..." },
    { "customers": 50, "target_mrr": "...", "key_activity": "..." },
    { "customers": 100, "target_mrr": "...", "key_activity": "..." },
    { "customers": 500, "target_mrr": "...", "key_activity": "..." },
    { "customers": 1000, "target_mrr": "...", "key_activity": "..." }
  ]
}`,
  };
  return prompts[phase];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(v) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v || 0); }

function ScoreBar({ label, value, max = 10, color = 'blue' }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
        <span>{label}</span><span className={`text-${color}-400`}>{value}/{max}</span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full bg-${color}-500 rounded-full transition-all duration-700`} style={{ width: `${(value / max) * 100}%` }} />
      </div>
    </div>
  );
}

function Tag({ children, color = 'slate' }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black bg-${color}-500/15 text-${color}-400 border border-${color}-500/20`}>
      {children}
    </span>
  );
}

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-700/50 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-4 bg-slate-800/50 hover:bg-slate-800 transition-colors">
        <span className="text-xs font-black text-white uppercase tracking-widest">{title}</span>
        {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
      </button>
      {open && <div className="p-5 space-y-4 bg-slate-900/60">{children}</div>}
    </div>
  );
}

// ─── Phase content renderers ──────────────────────────────────────────────────
function PhaseClarity({ data }) {
  if (!data) return null;
  return (
    <div className="space-y-4">
      <Section title="Refined Problem Statement">
        <p className="text-white font-bold leading-relaxed">{data.refined_problem}</p>
      </Section>
      <Section title="One-Liner Pitch">
        <p className="text-emerald-400 font-black text-lg leading-relaxed">{data.one_sentence_pitch}</p>
      </Section>
      <div className="grid grid-cols-2 gap-4">
        <Section title="Founder-Market Fit">
          <div className="text-center mb-3">
            <span className="text-5xl font-black text-blue-400">{data.founder_market_fit_score}</span>
            <span className="text-slate-500 text-lg">/100</span>
          </div>
          <p className="text-slate-300 text-xs leading-relaxed">{data.founder_market_fit_reason}</p>
        </Section>
        <Section title="Why Now">
          <p className="text-slate-300 text-xs leading-relaxed">{data.why_now}</p>
        </Section>
      </div>
      <Section title="The Real Pain (3 Levels Deep)">
        <p className="text-rose-300 text-sm leading-relaxed">{data.real_pain}</p>
      </Section>
      <Section title="Unique Insight">
        <p className="text-amber-300 text-sm leading-relaxed">{data.unique_insight}</p>
      </Section>
      <div className="grid grid-cols-2 gap-4">
        <Section title="Green Flags">
          {(data.green_flags || []).map((f, i) => (
            <div key={i} className="flex items-start gap-2"><CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" /><p className="text-slate-300 text-xs">{f}</p></div>
          ))}
        </Section>
        <Section title="Red Flags to Watch">
          {(data.red_flags || []).map((f, i) => (
            <div key={i} className="flex items-start gap-2"><AlertCircle size={14} className="text-rose-400 shrink-0 mt-0.5" /><p className="text-slate-300 text-xs">{f}</p></div>
          ))}
        </Section>
      </div>
      <div className="bg-blue-600/20 border border-blue-500/30 rounded-2xl p-5">
        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Your #1 Next Move</p>
        <p className="text-white font-bold">{data.recommended_first_move}</p>
      </div>
    </div>
  );
}

function PhaseICP({ data }) {
  if (!data) return null;
  const icp = data.icp || {};
  const personas = data.personas || [];
  return (
    <div className="space-y-4">
      <Section title="Ideal Customer Profile (ICP)">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Title/Role', value: icp.title },
            { label: 'Company Size', value: icp.company_size },
            { label: 'Industry Focus', value: icp.industry_focus },
            { label: 'Geography', value: icp.geography },
            { label: 'Annual Budget', value: icp.annual_budget },
            { label: 'Success Looks Like', value: icp.success_looks_like },
          ].map(({ label, value }) => (
            <div key={label} className="bg-slate-800/60 rounded-xl p-3">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
              <p className="text-white text-xs font-bold">{value || '—'}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Key Frustrations</p>
          {(icp.key_frustrations || []).map((f, i) => (
            <div key={i} className="flex gap-2 items-start"><span className="text-rose-400 font-black text-xs shrink-0">✕</span><p className="text-slate-300 text-xs">{f}</p></div>
          ))}
        </div>
        <div className="mt-3 space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trigger Events (When They Buy)</p>
          {(icp.trigger_events || []).map((t, i) => (
            <div key={i} className="flex gap-2 items-start"><Zap size={12} className="text-amber-400 shrink-0 mt-0.5" /><p className="text-slate-300 text-xs">{t}</p></div>
          ))}
        </div>
      </Section>
      <Section title="3 Target Personas">
        {personas.map((p, i) => (
          <div key={i} className="bg-slate-800/60 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div><p className="text-white font-black">{p.name}</p><p className="text-slate-400 text-xs">{p.title} · {p.age_range}</p></div>
              <div className="flex gap-2">
                <Tag color="rose">Pain {p.pain_score}/10</Tag>
                <Tag color="emerald">WTP {p.willingness_to_pay}/10</Tag>
              </div>
            </div>
            <p className="text-slate-300 text-xs italic">"{p.quote}"</p>
            <p className="text-slate-400 text-xs">{p.bio}</p>
            <div><p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Where to Find</p><div className="flex flex-wrap gap-1">{(p.where_to_find || []).map((w, j) => <Tag key={j} color="blue">{w}</Tag>)}</div></div>
          </div>
        ))}
      </Section>
      <Section title="Customer Discovery Interview Script">
        {Object.entries(data.interview_script || {}).filter(([k]) => k !== 'intro' && k !== 'closing').map(([key, questions]) => (
          <div key={key} className="mb-4">
            <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-2">{key.replace(/_/g, ' ')}</p>
            {(Array.isArray(questions) ? questions : []).map((q, i) => (
              <div key={i} className="flex gap-2 mb-2"><span className="text-slate-500 text-xs font-black w-4 shrink-0">{i + 1}.</span><p className="text-slate-200 text-xs">{q}</p></div>
            ))}
          </div>
        ))}
      </Section>
      <Section title="Where to Find Them (50 Channels)" defaultOpen={false}>
        {Object.entries(data.where_to_find_them || {}).map(([key, places]) => (
          <div key={key} className="mb-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{key.replace(/_/g, ' ')}</p>
            <div className="flex flex-wrap gap-1">{(Array.isArray(places) ? places : []).map((p, i) => <Tag key={i} color="slate">{p}</Tag>)}</div>
          </div>
        ))}
      </Section>
    </div>
  );
}

function PhaseValueProp({ data }) {
  if (!data) return null;
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-amber-900/30 to-orange-900/20 border border-amber-500/30 rounded-2xl p-6 text-center">
        <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2">Primary Value Proposition</p>
        <p className="text-2xl font-black text-white leading-tight">{data.primary_value_prop}</p>
        <p className="text-slate-400 text-sm mt-2">{data.supporting_proof}</p>
      </div>
      <Section title="Positioning Statement">
        <p className="text-slate-200 text-sm leading-relaxed italic">"{data.positioning_statement}"</p>
      </Section>
      <Section title="3 Alternative Headlines">
        {(data.three_alternatives || []).map((a, i) => (
          <div key={i} className="bg-slate-800/60 rounded-xl p-4">
            <Tag color="amber">{a.angle}</Tag>
            <p className="text-white font-black mt-2">{a.headline}</p>
            <p className="text-slate-400 text-xs mt-1">{a.subhead}</p>
          </div>
        ))}
      </Section>
      <Section title="Messaging by Persona">
        {(data.messaging_by_persona || []).map((m, i) => (
          <div key={i} className="bg-slate-800/60 rounded-2xl p-4 space-y-2">
            <p className="text-amber-400 font-black text-xs uppercase tracking-widest">{m.persona}</p>
            <p className="text-white font-bold">Hook: {m.hook}</p>
            <p className="text-slate-400 text-xs">Pain: {m.pain_acknowledgment}</p>
            <p className="text-slate-400 text-xs">Bridge: {m.solution_bridge}</p>
            <p className="text-emerald-400 text-xs font-bold">CTA: {m.cta}</p>
          </div>
        ))}
      </Section>
      <Section title="Elevator Pitches">
        {Object.entries(data.elevator_pitches || {}).map(([k, v]) => (
          <div key={k} className="bg-slate-800/60 rounded-xl p-4">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{k.replace(/_/g, ' ')}</p>
            <p className="text-white text-sm leading-relaxed">{v}</p>
          </div>
        ))}
      </Section>
    </div>
  );
}

function PhaseGTM({ data }) {
  if (!data) return null;
  const plan = data.thirty_day_plan || {};
  return (
    <div className="space-y-4">
      <Section title="Channel Ranking (By Fit for Your Business)">
        {(data.channel_ranking || []).map((c, i) => (
          <div key={i} className="flex items-start gap-3 py-2 border-b border-slate-700/40 last:border-0">
            <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-emerald-400 font-black text-xs">#{i + 1}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-white font-black text-sm">{c.channel}</p>
                <Tag color="emerald">Fit: {c.fit_score}/10</Tag>
                <Tag color={c.effort === 'low' ? 'emerald' : c.effort === 'medium' ? 'amber' : 'rose'}>{c.effort} effort</Tag>
              </div>
              <p className="text-slate-400 text-xs mt-1">{c.why}</p>
              <p className="text-blue-400 text-[10px] mt-0.5">First customer in: {c.time_to_first_customer}</p>
            </div>
          </div>
        ))}
      </Section>
      <Section title="30-Day Execution Plan">
        {Object.entries(plan).map(([week, d]) => (
          <div key={week} className="bg-slate-800/60 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white font-black capitalize">{week.replace('_', ' ')}: {d.theme}</p>
              <Tag color="emerald">Goal: {d.goal}</Tag>
            </div>
            <div className="space-y-1">
              {(d.daily_actions || []).map((a, i) => (
                <div key={i} className="flex gap-2 items-start"><span className="text-slate-500 text-[10px] w-12 shrink-0 mt-0.5">{a.split(':')[0]}</span><p className="text-slate-300 text-xs">{a.split(':').slice(1).join(':').trim()}</p></div>
              ))}
            </div>
          </div>
        ))}
      </Section>
      <Section title="Budget Breakdown">
        {Object.entries(data.budget_breakdown || {}).map(([k, v]) => (
          <div key={k} className="bg-slate-800/60 rounded-xl p-3">
            <p className="text-emerald-400 font-black text-xs uppercase">{k.replace(/_/g, ' ')}</p>
            <p className="text-slate-300 text-xs mt-1">{v}</p>
          </div>
        ))}
      </Section>
    </div>
  );
}

function PhaseOutreach({ data }) {
  if (!data) return null;
  const [seqIdx, setSeqIdx] = useState(0);
  const sequences = data.cold_email_sequences || [];
  const seq = sequences[seqIdx] || {};
  return (
    <div className="space-y-4">
      <Section title="Cold Email Sequences">
        <div className="flex gap-2 mb-4">
          {sequences.map((s, i) => (
            <button key={i} onClick={() => setSeqIdx(i)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${seqIdx === i ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{s.name}</button>
          ))}
        </div>
        {(seq.emails || []).map((email, i) => (
          <div key={i} className="bg-slate-800/60 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between"><Tag color="rose">Day {email.day}</Tag><p className="text-slate-400 text-xs">CTA: {email.cta}</p></div>
            <p className="text-white font-black text-sm">Subject: {email.subject}</p>
            <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-line">{email.body}</p>
          </div>
        ))}
      </Section>
      <Section title="LinkedIn Message Sequence">
        {Object.entries(data.linkedin_messages || {}).map(([k, v]) => (
          <div key={k} className="bg-slate-800/60 rounded-xl p-4">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{k.replace(/_/g, ' ')}</p>
            <p className="text-slate-200 text-xs leading-relaxed">{v}</p>
          </div>
        ))}
      </Section>
      <Section title="Cold Call Script">
        {Object.entries(data.cold_call_script || {}).map(([k, v]) => (
          <div key={k} className="bg-slate-800/60 rounded-xl p-4">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{k.replace(/_/g, ' ')}</p>
            <p className="text-slate-200 text-xs leading-relaxed italic">"{v}"</p>
          </div>
        ))}
      </Section>
      <Section title="Objection Handling Playbook (10 Objections)" defaultOpen={false}>
        {(data.objection_playbook || []).map((o, i) => (
          <div key={i} className="bg-slate-800/60 rounded-xl p-4 space-y-2">
            <p className="text-rose-400 font-black text-xs">"{o.objection}"</p>
            <p className="text-white text-xs leading-relaxed"><span className="text-emerald-400 font-black">Response: </span>{o.response}</p>
            <p className="text-slate-400 text-xs"><span className="text-blue-400 font-black">Follow-up: </span>{o.follow_up}</p>
          </div>
        ))}
      </Section>
    </div>
  );
}

function PhaseClose({ data }) {
  if (!data) return null;
  const agenda = data.discovery_call_agenda || {};
  return (
    <div className="space-y-4">
      <Section title="Discovery Call Agenda (45 min)">
        {Object.entries(agenda).filter(([k]) => k !== 'questions_to_ask').map(([k, v]) => (
          <div key={k} className="flex gap-3">
            <div className="w-20 shrink-0"><Tag color="orange">{k.replace(/_/g, ' ')}</Tag></div>
            <p className="text-slate-300 text-xs">{v}</p>
          </div>
        ))}
        <div className="mt-3">
          <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-2">20 Discovery Questions</p>
          {(agenda.questions_to_ask || []).map((q, i) => (
            <div key={i} className="flex gap-2 mb-1.5"><span className="text-slate-500 text-xs w-5 shrink-0">{i + 1}.</span><p className="text-slate-200 text-xs">{q}</p></div>
          ))}
        </div>
      </Section>
      {data.pilot_offer && (
        <Section title="Pilot Offer (Your Risk-Reversal)">
          <div className="text-center mb-3"><p className="text-2xl font-black text-orange-400">{data.pilot_offer.name}</p><p className="text-white font-bold">{data.pilot_offer.price}</p></div>
          <p className="text-slate-400 text-xs mb-2">Duration: {data.pilot_offer.duration}</p>
          {(data.pilot_offer.deliverables || []).map((d, i) => (
            <div key={i} className="flex gap-2"><CheckCircle2 size={12} className="text-emerald-400 shrink-0 mt-0.5" /><p className="text-slate-300 text-xs">{d}</p></div>
          ))}
        </Section>
      )}
      <Section title="Onboarding Checklist">
        {(data.onboarding_checklist || []).map((s, i) => (
          <div key={i} className="flex gap-2 items-start py-1.5 border-b border-slate-700/40 last:border-0"><span className="text-orange-400 font-black text-xs shrink-0">{i + 1}.</span><p className="text-slate-200 text-xs">{s}</p></div>
        ))}
      </Section>
      <Section title="How to Get a Testimonial">
        <p className="text-slate-300 text-sm leading-relaxed">{data.testimonial_collection}</p>
      </Section>
    </div>
  );
}

function PhaseScale({ data }) {
  if (!data) return null;
  return (
    <div className="space-y-4">
      {['one_to_ten', 'ten_to_hundred', 'hundred_to_thousand'].map((key, i) => {
        const stage = data[key] || {};
        const labels = ['1 → 10 Customers', '10 → 100 Customers', '100 → 1,000 Customers'];
        return (
          <Section key={key} title={labels[i]}>
            <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-3 mb-3">
              <p className="text-teal-400 font-black text-xs">Timeline: {stage.timeline}</p>
              <p className="text-white text-sm mt-1">{stage.mindset || stage.strategy}</p>
            </div>
            <div className="space-y-1">
              {(stage.weekly_actions || stage.what_to_systematize || stage.channels_that_scale || []).map((a, j) => (
                <div key={j} className="flex gap-2"><ArrowRight size={12} className="text-teal-400 shrink-0 mt-0.5" /><p className="text-slate-300 text-xs">{a}</p></div>
              ))}
            </div>
            {stage.pitfalls && <div className="mt-3"><p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Pitfalls to Avoid</p>{stage.pitfalls.map((p, j) => <div key={j} className="flex gap-2"><AlertCircle size={12} className="text-rose-400 shrink-0 mt-0.5" /><p className="text-slate-300 text-xs">{p}</p></div>)}</div>}
          </Section>
        );
      })}
      <Section title="Revenue Milestones">
        <div className="space-y-2">
          {(data.revenue_milestones || []).map((m, i) => (
            <div key={i} className="flex items-center gap-4 py-2 border-b border-slate-700/40 last:border-0">
              <div className="w-20 text-center"><p className="text-teal-400 font-black">{m.customers}</p><p className="text-slate-500 text-[9px]">customers</p></div>
              <div className="flex-1"><p className="text-white font-bold text-sm">{m.target_mrr}</p><p className="text-slate-400 text-xs">{m.key_activity}</p></div>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Referral Engine">
        {data.referral_engine && Object.entries(data.referral_engine).map(([k, v]) => (
          <div key={k} className="bg-slate-800/60 rounded-xl p-3">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{k.replace(/_/g, ' ')}</p>
            <p className="text-slate-200 text-xs">{v}</p>
          </div>
        ))}
      </Section>
    </div>
  );
}

const PHASE_RENDERERS = { clarity: PhaseClarity, icp: PhaseICP, value_prop: PhaseValueProp, gtm: PhaseGTM, outreach: PhaseOutreach, close: PhaseClose, scale: PhaseScale };

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FirstCustomerEngine({ session, balances, profile }) {
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePhase, setActivePhase] = useState('clarity');
  const [generating, setGenerating] = useState(null);
  const [unlocking, setUnlocking] = useState(false);
  const [toast, setToast] = useState(null);
  const [setupForm, setSetupForm] = useState({ business_name: '', what_you_do: '', problem_you_solve: '', target_customer: '', industry: '', current_traction: 'idea' });
  const [showSetup, setShowSetup] = useState(false);

  // Customer pipeline state
  const [leads, setLeads] = useState([]);
  const [showPipeline, setShowPipeline] = useState(false);
  const [addingLead, setAddingLead] = useState(false);
  const [leadForm, setLeadForm] = useState({ full_name: '', company: '', role: '', contact_info: '', channel: 'linkedin', status: 'identified', notes: '' });

  const notify = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };

  const load = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    const { data: prog } = await supabase.from('first_customer_programs').select('*').eq('user_id', session.user.id).maybeSingle();
    if (prog) {
      setProgram(prog);
      const { data: ldata } = await supabase.from('first_customer_leads').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
      setLeads(ldata || []);
    }
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => { load(); }, [load]);

  const handleCreateProgram = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase.from('first_customer_programs').insert({ user_id: session.user.id, ...setupForm }).select().single();
    if (error) { notify(error.message, 'error'); return; }
    setProgram(data);
    setShowSetup(false);
    notify('Program created! Starting with Business Clarity…');
  };

  const handleUnlock = async () => {
    if ((balances?.liquid_usd || 0) < UNLOCK_FEE) { notify(`Insufficient balance. Need ${fmt(UNLOCK_FEE)}.`, 'error'); return; }
    setUnlocking(true);
    try {
      const { data: upd, error: balErr } = await supabase.from('balances').update({ liquid_usd: balances.liquid_usd - UNLOCK_FEE }).eq('user_id', session.user.id).gte('liquid_usd', UNLOCK_FEE).select('liquid_usd');
      if (balErr || !upd?.length) throw new Error('Balance update failed.');
      await supabase.from('transactions').insert({ user_id: session.user.id, transaction_type: 'first_customer_program', amount: UNLOCK_FEE, status: 'completed', description: 'First Customer Engine — Full Program Unlock' });
      await supabase.from('first_customer_programs').update({ is_unlocked: true, amount_paid: UNLOCK_FEE }).eq('id', program.id);
      setProgram(p => ({ ...p, is_unlocked: true, amount_paid: UNLOCK_FEE }));
      notify('All 7 phases unlocked! Let\'s build your customer engine.');
    } catch (err) { notify(err.message, 'error'); }
    finally { setUnlocking(false); }
  };

  const handleGenerate = async (phaseId) => {
    setGenerating(phaseId);
    try {
      const prompt = buildPrompt(phaseId, program);
      const result = await callGemini(prompt);
      const updated = { ...((program.phase_data) || {}), [phaseId]: result };
      await supabase.from('first_customer_programs').update({ phase_data: updated, phases_completed: [...new Set([...(program.phases_completed || []), phaseId])] }).eq('id', program.id);
      setProgram(p => ({ ...p, phase_data: updated, phases_completed: [...new Set([...(p.phases_completed || []), phaseId])] }));
      notify(`${PHASES.find(p => p.id === phaseId)?.label} generated!`);
    } catch (err) { notify('AI generation failed. Try again.', 'error'); }
    finally { setGenerating(null); }
  };

  const handleAddLead = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase.from('first_customer_leads').insert({ program_id: program.id, user_id: session.user.id, ...leadForm }).select().single();
    if (error) { notify(error.message, 'error'); return; }
    setLeads(prev => [data, ...prev]);
    setLeadForm({ full_name: '', company: '', role: '', contact_info: '', channel: 'linkedin', status: 'identified', notes: '' });
    setAddingLead(false);
    notify('Lead added to pipeline!');
  };

  const updateLeadStatus = async (leadId, status) => {
    await supabase.from('first_customer_leads').update({ status }).eq('id', leadId);
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status } : l));
  };

  if (loading) return <div className="flex items-center justify-center py-40"><div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>;

  // ── NO PROGRAM: Setup screen ──
  if (!program && !showSetup) {
    return (
      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="bg-gradient-to-br from-violet-900/60 via-slate-900 to-indigo-900/40 border border-violet-500/30 rounded-[3rem] p-10 text-center shadow-2xl">
          <div className="w-16 h-16 bg-violet-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6"><Target size={32} className="text-violet-400" /></div>
          <h2 className="text-3xl font-black text-white mb-2">First Customer Engine</h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-lg mx-auto">AI-powered system trained on Founder Institute, YC, and 500 Startups methodologies. 7 phases that take you from zero to your first customers — and then to thousands.</p>
          <div className="grid grid-cols-3 gap-4 my-8">
            {[['7 Phases', 'Complete journey'], ['100%', 'Personalized to your biz'], ['AI-Generated', 'Ready-to-use scripts']].map(([v, l]) => (
              <div key={v} className="bg-white/5 rounded-2xl p-4"><p className="text-violet-400 font-black text-xl">{v}</p><p className="text-slate-500 text-[10px] uppercase tracking-widest mt-1">{l}</p></div>
            ))}
          </div>
          <button onClick={() => setShowSetup(true)} className="px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white font-black rounded-2xl text-sm uppercase tracking-widest transition-all shadow-xl">Start Your Program →</button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {PHASES.slice(0, 4).map(p => {
            const Icon = p.icon;
            return (
              <div key={p.id} className={`${COLOR[p.color].bg} ${COLOR[p.color].border} border rounded-2xl p-5`}>
                <Icon size={20} className={COLOR[p.color].text} />
                <p className="text-white font-black mt-2">{p.label}</p>
                <p className="text-slate-400 text-xs mt-1">{p.tagline}</p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (!program && showSetup) {
    return (
      <div className="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-400">
        <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-8 space-y-6">
          <div><h3 className="text-2xl font-black text-white">Tell us about your business</h3><p className="text-slate-400 text-sm mt-1">The more specific, the better the AI output.</p></div>
          <form onSubmit={handleCreateProgram} className="space-y-4">
            {[
              { key: 'business_name', label: 'Business / Product Name', placeholder: 'e.g. AgriConnect' },
              { key: 'what_you_do', label: 'What do you do? (1 sentence)', placeholder: 'e.g. We help small farmers sell directly to urban restaurants via mobile app' },
              { key: 'problem_you_solve', label: 'What specific problem do you solve?', placeholder: 'e.g. Farmers earn 30% of market price because of middlemen' },
              { key: 'target_customer', label: 'Who is your target customer?', placeholder: 'e.g. Small-scale farmers with 1-5 acres in West Africa' },
              { key: 'industry', label: 'Industry / Sector', placeholder: 'e.g. AgriTech / Food Supply Chain' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">{label}</label>
                <input required value={setupForm[key]} onChange={e => setSetupForm(p => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm font-medium focus:outline-none focus:border-violet-500 placeholder:text-slate-600"
                />
              </div>
            ))}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Current Stage</label>
              <div className="grid grid-cols-4 gap-2">
                {[['idea', 'Just an Idea'], ['mvp', 'Have an MVP'], ['beta', 'Beta Users'], ['revenue', 'Some Revenue']].map(([v, l]) => (
                  <button type="button" key={v} onClick={() => setSetupForm(p => ({ ...p, current_traction: v }))}
                    className={`py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${setupForm.current_traction === v ? 'bg-violet-600 border-violet-600 text-white' : 'border-slate-700 text-slate-400 hover:border-violet-500 hover:text-white'}`}>{l}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowSetup(false)} className="px-6 py-3 border border-slate-700 text-slate-400 font-black rounded-2xl text-xs uppercase hover:border-slate-600 transition-all">Back</button>
              <button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-500 text-white font-black py-3 rounded-2xl text-xs uppercase tracking-widest transition-all">Create My Program →</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ── PROGRAM EXISTS ──
  const currentPhase = PHASES.find(p => p.id === activePhase);
  const PhaseRenderer = PHASE_RENDERERS[activePhase];
  const phaseContent = program?.phase_data?.[activePhase];
  const isCompleted = (program?.phases_completed || []).includes(activePhase);
  const isLocked = currentPhase?.locked && !program?.is_unlocked;
  const isGenerating = generating === activePhase;
  const C = COLOR[currentPhase?.color || 'blue'];

  const wonLeads = leads.filter(l => l.status === 'won').length;
  const activeLeads = leads.filter(l => !['won', 'lost'].includes(l.status)).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-400 pb-10">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl text-white text-sm font-bold shadow-xl animate-in slide-in-from-top-2 ${toast.type === 'error' ? 'bg-red-500' : 'bg-violet-600'}`}>{toast.msg}</div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-violet-950/30 to-slate-900 border border-violet-500/20 rounded-[2rem] p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Target size={18} className="text-violet-400" />
              <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest">First Customer Engine</span>
            </div>
            <h2 className="text-2xl font-black text-white">{program.business_name}</h2>
            <p className="text-slate-400 text-xs mt-1">{program.what_you_do}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowPipeline(v => !v)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase transition-all border ${showPipeline ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-700 text-slate-400 hover:border-emerald-500 hover:text-white'}`}>
              <Users size={14} /> Pipeline <span className="bg-white/20 px-1.5 py-0.5 rounded text-[9px]">{leads.length}</span>
            </button>
            <button onClick={() => setShowSetup(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase border border-slate-700 text-slate-400 hover:border-slate-500 transition-all">
              <Edit3 size={14} /> Edit
            </button>
          </div>
        </div>
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          {[
            { label: 'Phases Done', value: `${(program.phases_completed || []).length}/7` },
            { label: 'Total Leads', value: leads.length },
            { label: 'Active', value: activeLeads },
            { label: 'Customers Won', value: wonLeads },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-white font-black text-lg">{value}</p>
              <p className="text-slate-500 text-[9px] uppercase tracking-widest">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Customer Pipeline */}
      {showPipeline && (
        <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-white font-black flex items-center gap-2"><Users size={16} className="text-emerald-400" /> Customer Pipeline</h4>
            <button onClick={() => setAddingLead(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs uppercase transition-all"><Plus size={14} /> Add Lead</button>
          </div>
          {addingLead && (
            <form onSubmit={handleAddLead} className="bg-slate-800 rounded-2xl p-4 mb-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[['full_name', 'Full Name *'], ['company', 'Company'], ['role', 'Role/Title'], ['contact_info', 'Email / LinkedIn']].map(([k, l]) => (
                  <div key={k}><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">{l}</label><input value={leadForm[k]} onChange={e => setLeadForm(p => ({ ...p, [k]: e.target.value }))} required={k === 'full_name'} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500" /></div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Channel</label>
                  <select value={leadForm.channel} onChange={e => setLeadForm(p => ({ ...p, channel: e.target.value }))} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-xs focus:outline-none">
                    {['email', 'linkedin', 'warm_intro', 'event', 'referral', 'other'].map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Notes</label><input value={leadForm.notes} onChange={e => setLeadForm(p => ({ ...p, notes: e.target.value }))} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-xs focus:outline-none" /></div>
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setAddingLead(false)} className="px-4 py-2 text-slate-400 text-xs font-black uppercase border border-slate-700 rounded-xl hover:border-slate-600">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase rounded-xl transition-all">Add Lead</button>
              </div>
            </form>
          )}
          {leads.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">No leads yet. Add your first prospect above.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
              {leads.map(l => {
                const st = LEAD_STATUSES.find(s => s.id === l.status) || LEAD_STATUSES[0];
                return (
                  <div key={l.id} className="flex items-center gap-3 bg-slate-800/60 rounded-xl p-3">
                    <div className="flex-1">
                      <p className="text-white font-bold text-sm">{l.full_name} <span className="text-slate-500 text-xs">· {l.company}</span></p>
                      <p className="text-slate-500 text-[10px]">{l.role} · {l.channel?.replace('_', ' ')}</p>
                    </div>
                    <select value={l.status} onChange={e => updateLeadStatus(l.id, e.target.value)} className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg border border-transparent bg-${st.color}-500/15 text-${st.color}-400 focus:outline-none cursor-pointer`}>
                      {LEAD_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Phase Stepper */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {PHASES.map((p) => {
          const Icon = p.icon;
          const done = (program?.phases_completed || []).includes(p.id);
          const locked = p.locked && !program?.is_unlocked;
          const active = activePhase === p.id;
          return (
            <button key={p.id} onClick={() => setActivePhase(p.id)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                active ? `${COLOR[p.color].btn} border-transparent text-white shadow-lg` :
                done ? 'bg-slate-800 border-slate-700 text-emerald-400' :
                locked ? 'bg-slate-900 border-slate-800 text-slate-600' :
                'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-white'
              }`}>
              {locked ? <Lock size={12} /> : done ? <CheckCircle2 size={12} /> : <Icon size={12} />}
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Active Phase */}
      <div className={`${C.bg} ${C.border} border rounded-[2rem] overflow-hidden`}>
        {/* Phase header */}
        <div className="px-8 py-6 border-b border-white/5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              {currentPhase && React.createElement(currentPhase.icon, { size: 22, className: C.text })}
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Phase {currentPhase?.num} of 7</p>
                <h3 className="text-xl font-black text-white">{currentPhase?.label}</h3>
                <p className="text-slate-400 text-xs mt-0.5">{currentPhase?.tagline}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isCompleted && <Tag color="emerald">✓ Generated</Tag>}
              <span className="text-[10px] text-slate-500">{currentPhase?.duration}</span>
              {!isLocked && (
                <button onClick={() => handleGenerate(activePhase)} disabled={!!generating}
                  className={`flex items-center gap-2 px-5 py-2.5 ${C.btn} text-white font-black rounded-xl text-xs uppercase tracking-widest transition-all disabled:opacity-50`}>
                  {isGenerating ? <><Loader2 size={14} className="animate-spin" /> Generating…</> : isCompleted ? <><RefreshCw size={14} /> Regenerate</> : <><Sparkles size={14} /> Generate with AI</>}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* Locked gate */}
          {isLocked ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6"><Lock size={28} className="text-slate-500" /></div>
              <h4 className="text-xl font-black text-white mb-2">Phase Locked</h4>
              <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">Unlock all 7 phases for a one-time fee. Everything you need, personalized to your exact business.</p>
              <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm mx-auto mb-6">
                <p className="text-3xl font-black text-white mb-1">{fmt(UNLOCK_FEE)}<span className="text-slate-500 text-lg font-normal"> one-time</span></p>
                <p className="text-slate-400 text-xs mb-4">Full access to all 7 phases + Customer Pipeline CRM</p>
                {[['Phase 2', 'ICP + 20 discovery questions'], ['Phase 3', 'Value proposition + 3 positioning angles'], ['Phase 4', '30-day GTM plan, day by day'], ['Phase 5', '2 cold email sequences + objection playbook'], ['Phase 6', 'Sales call script + pilot offer template'], ['Phase 7', '1→10→100→1000 scale playbook']].map(([p, d]) => (
                  <div key={p} className="flex gap-2 items-start mb-2"><CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" /><p className="text-slate-300 text-xs"><span className="font-black">{p}:</span> {d}</p></div>
                ))}
              </div>
              <button onClick={handleUnlock} disabled={unlocking}
                className="px-10 py-4 bg-violet-600 hover:bg-violet-500 text-white font-black rounded-2xl text-sm uppercase tracking-widest transition-all shadow-xl disabled:opacity-60 flex items-center gap-3 mx-auto">
                {unlocking ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                {unlocking ? 'Unlocking…' : `Unlock All Phases — ${fmt(UNLOCK_FEE)}`}
              </button>
            </div>
          ) : !phaseContent ? (
            <div className="text-center py-12">
              <div className={`w-16 h-16 ${C.bg} ${C.border} border rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                {currentPhase && React.createElement(currentPhase.icon, { size: 28, className: C.text })}
              </div>
              <p className="text-white font-black text-lg mb-2">Ready to generate</p>
              <p className="text-slate-400 text-sm mb-6">{currentPhase?.tagline}</p>
              <button onClick={() => handleGenerate(activePhase)} disabled={!!generating}
                className={`px-8 py-4 ${C.btn} text-white font-black rounded-2xl text-sm uppercase tracking-widest transition-all shadow-lg disabled:opacity-60 flex items-center gap-3 mx-auto`}>
                {isGenerating ? <><Loader2 size={18} className="animate-spin" /> AI is thinking…</> : <><Sparkles size={18} /> Generate {currentPhase?.label}</>}
              </button>
              {activePhase === 'clarity' && <p className="text-slate-500 text-xs mt-4">This phase is free. No payment required.</p>}
            </div>
          ) : (
            PhaseRenderer && <PhaseRenderer data={phaseContent} />
          )}
        </div>
      </div>
    </div>
  );
}
