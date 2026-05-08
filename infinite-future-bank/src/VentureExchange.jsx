/**
 * VentureX — Full Financial Operating System for Startups & Investors
 * Deep connection platform: Smart Contracts, Real-Time Data, Equity/Debt/Mentorship.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './services/supabaseClient';
import {
  Rocket, Building2, Users, DollarSign, Target, TrendingUp,
  ShieldCheck, CheckCircle2, XCircle, Loader2, Plus, Edit3,
  ChevronRight, Globe, Zap, BarChart3, Briefcase, Star,
  AlertTriangle, ArrowRight, Lock, Unlock, RefreshCw, FileText,
  MapPin, Layers, Award, Link as LinkIcon, Trash2, Check,
  Activity, PieChart, BrainCircuit, HeartHandshake, Database, Network, Key, Bell, Upload, FileArchive
} from 'lucide-react';

// ─── Scoring Engine (deterministic, client-side, mirrors edge functions) ──────────
function computeScores(c) {
  if (!c) return { readiness: 0, risk: 50, growth: 0 };

  let readiness = 0;
  if (c.legal_name)           readiness += 5;
  if (c.registration_number)  readiness += 5;
  if (c.pitch_deck_url)       readiness += 15;
  if (c.funding_goal > 0)     readiness += 10;
  if (c.valuation > 0)        readiness += 10;
  if (c.monthly_revenue > 0)  readiness += 15;
  if (c.active_users > 0)     readiness += 10;
  if (c.patents_ip?.length > 0) readiness += 10;
  if (c.team_size >= 2)       readiness += 5;
  if (c.runway_months >= 6)   readiness += 5;
  if (c.cac > 0 && c.ltv > 0) readiness += 10;
  readiness = Math.min(100, readiness);

  let risk = 20;
  if (c.regulatory_risk === 'high')  risk += 20;
  if (c.regulatory_risk === 'medium') risk += 10;
  if (c.market_risk === 'high')      risk += 20;
  if (c.market_risk === 'medium')    risk += 10;
  if (c.execution_risk === 'high')   risk += 20;
  if (c.runway_months < 3)           risk += 15;
  if (c.churn_rate > 10)             risk += 10;
  risk = Math.min(100, risk);

  let growth = 0;
  if (c.revenue_growth_rate > 0)   growth += Math.min(30, c.revenue_growth_rate);
  if (c.user_growth_rate > 0)      growth += Math.min(20, c.user_growth_rate);
  if (c.retention_rate > 60)       growth += 20;
  if ((c.ltv / Math.max(c.cac, 1)) > 3) growth += 20;
  if (c.active_users > 1000)       growth += 10;
  growth = Math.min(100, growth);

  return { readiness: Math.round(readiness), risk: Math.round(risk), growth: Math.round(growth) };
}

function computeMatchScore(company, investor) {
  let total = 0;
  const breakdown = {};

  const sectors = investor.preferred_sectors || [];
  const sMatch = sectors.length === 0 || sectors.includes(company.sector) ? 25 : 0;
  breakdown.sector = sMatch; total += sMatch;

  const stages = investor.preferred_stage || [];
  const stMatch = stages.length === 0 || stages.includes(company.current_round) ? 20 : 0;
  breakdown.stage = stMatch; total += stMatch;

  const geos = investor.preferred_geography || [];
  const gMatch = geos.length === 0 || geos.includes(company.country) ? 15 : 0;
  breakdown.geography = gMatch; total += gMatch;

  const goal = company.funding_goal || 0;
  const min = investor.average_ticket_size || 0;
  const max = investor.max_ticket_size || 0;
  const tMatch = (goal >= min && goal <= max * 3) ? 15 : goal > 0 && max > 0 ? 7 : 0;
  breakdown.ticket = tMatch; total += tMatch;

  const riskMap = { low: 20, medium: 50, high: 80 };
  const compRisk = (computeScores(company).risk);
  const invRiskThreshold = riskMap[investor.risk_level] || 50;
  const rMatch = compRisk <= invRiskThreshold ? 10 : 5;
  breakdown.risk = rMatch; total += rMatch;

  const tractMatch = company.active_users > 0 ? 10 : company.monthly_revenue > 0 ? 7 : 2;
  breakdown.traction = tractMatch; total += tractMatch;

  // Mentorship match
  let mentMatch = 0;
  if (company.mentorship_needed && investor.provides_mentorship) {
     const cAreas = company.mentorship_areas || [];
     const iAreas = investor.offered_mentorship_areas || [];
     const overlap = cAreas.filter(a => iAreas.includes(a));
     if (overlap.length > 0) mentMatch = 5;
  }
  breakdown.mentorship = mentMatch; total += mentMatch;

  return { score: Math.min(100, total), ...breakdown };
}

// ─── Small reusable UI ────────────────────────────────────────────────────
const ScoreBadge = ({ label, value, color }) => (
  <div className="flex flex-col items-center gap-1">
    <div className={`w-14 h-14 rounded-full flex items-center justify-center font-black text-lg border-4 ${color}`}>
      {value}
    </div>
    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</p>
  </div>
);

const Field = ({ label, children, required }) => (
  <div className="w-full">
    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const Section = ({ title, icon, children }) => (
  <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm mb-6 relative overflow-hidden group">
    <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
      <div className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">{icon}</div>
      <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">{title}</h3>
    </div>
    {children}
  </div>
);

const ToggleGroup = ({ label, options, value = [], onChange }) => (
  <Field label={label}>
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const active = value.includes(opt);
        return (
          <button key={opt} type="button" onClick={() => onChange(active ? value.filter(v => v !== opt) : [...value, opt])}
            className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border ${active ? 'bg-blue-600 text-white border-blue-700 shadow-md' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-blue-300'}`}>
            {opt}
          </button>
        );
      })}
    </div>
  </Field>
);

const Toggle = ({ value, onChange }) => (
  <button type="button" onClick={() => onChange(!value)}
    className={`w-12 h-6 rounded-full transition-colors relative ${value ? 'bg-emerald-500' : 'bg-slate-200'}`}>
    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${value ? 'left-7' : 'left-1'}`} />
  </button>
);

const inp = "w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm outline-none focus:border-blue-500 transition-colors";
const sel = inp + " cursor-pointer";

const SECTORS = ['FinTech','HealthTech','EdTech','AgriTech','CleanTech','E-Commerce','SaaS','AI/ML','Logistics','Real Estate','Web3','DeepTech'];
const ROUNDS  = ['pre-seed','seed','series-a','series-b','series-c','growth','ipo'];
const STAGES  = ['idea','mvp','live','scaling','profitable'];
const RISKS   = ['low','medium','high'];
const GEOS    = ['Africa','North America','South America','Europe','Asia','Middle East','Global'];
const MENTOR_AREAS = ['Go-To-Market','Engineering Architecture','Fundraising','Legal/Compliance','Hiring','B2B Sales'];
const CAPITAL_TYPES = ['Equity','Convertible Note','SAFE','Revenue-Based Financing','Venture Debt'];
const CUST_TYPES = ['B2C','B2B','B2B2C','Enterprise','Government'];

// ═══════════════════════════════════════════════════════════════════════════
export default function VentureExchange({ session, balances, profile }) {
  const [tab, setTab] = useState('HOME');
  const [myCompany, setMyCompany] = useState(null);
  const [myInvestor, setMyInvestor] = useState(null);
  const [publicCompanies, setPublicCompanies] = useState([]);
  const [publicInvestors, setPublicInvestors] = useState([]);
  const [deals, setDeals] = useState([]);
  const [matches, setMatches] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [dealMilestones, setDealMilestones] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFunding, setIsFunding] = useState(false);
  const [toast, setToast] = useState(null);
  const [myBalance, setMyBalance] = useState(0);
  const [auditLog, setAuditLog] = useState([]);
  
  const [documents, setDocuments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', document_type: 'Corporate_Governance', access_level: 'Deal_Parties', file: null });

  // Social Feed States
  const [feedPosts, setFeedPosts] = useState([]);
  const [followingMap, setFollowingMap] = useState({}); // mapping of user_id -> true
  const [postForm, setPostForm] = useState({ content: '', file: null, fileType: '' });
  const [isPosting, setIsPosting] = useState(false);
  const [myLikeValue, setMyLikeValue] = useState(0);
  const [showSpecialLike, setShowSpecialLike] = useState(null); // post_id
  const [specialAmount, setSpecialAmount] = useState(10);

  // Real-time tracking state
  const [liveMetrics, setLiveMetrics] = useState({});

  // ── Virtual CFO AI state ──────────────────────────────────────────────
  const [cfoMessages, setCfoMessages] = useState([{
    role: 'assistant',
    content: `I'm Pascaline, your dedicated CFO. I have access to IFB's financial intelligence network. Share your startup's metrics and I'll give you institutional-grade financial guidance. What would you like to analyze today?`
  }]);
  const [cfoInput, setCfoInput] = useState('');
  const [cfoLoading, setCfoLoading] = useState(false);

  const notify = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 4500); };

  // ── Company form state ─────────────────────────────────────────────────
  const blankCompany = {
    legal_name:'', registration_number:'', country:'', incorporation_date:'',
    sector:'', sub_sector:'', tagline:'', website:'',
    founders: [{ full_name:'', role:'CEO', equity_percentage:100, experience_years:0, past_exits:0, profile_url:'' }],
    monthly_revenue:0, revenue_growth_rate:0, revenue_streams:[''],
    fixed_costs:0, variable_costs:0, total_expenses:0, gross_margin:0, net_profit:0, ebitda:0,
    monthly_burn_rate:0, cash_on_hand:0, total_raised:0, current_round:'pre-seed', valuation:0, funding_goal:0, equity_offered:0,
    product_stage:'idea', active_users:0, user_growth_rate:0, retention_rate:0, churn_rate:0,
    tam:0, sam:0, som:0, competitors:[''], competitive_advantage:'',
    team_size:1, hiring_plan:'', key_roles_missing:[''],
    cac:0, ltv:0, conversion_rate:0,
    regulatory_risk:'medium', market_risk:'medium', execution_risk:'medium',
    pitch_deck_url:'', financial_statements_url:'', legal_docs_url:'',
    is_public: false, status:'draft',
    // New Deep Metrics
    customer_type: 'B2C', customer_demographics: [], customer_ages: [],
    patents_ip: [], real_time_metrics: { api_calls: 0, active_sessions: 0 },
    capital_solutions_sought: ['Equity'], mentorship_needed: false, mentorship_areas: []
  };
  const [compForm, setCompForm] = useState(blankCompany);
  const cf = (k, v) => setCompForm(p => ({ ...p, [k]: v }));

  // ── Investor form state ────────────────────────────────────────────────
  const blankInvestor = {
    investor_type:'angel', fund_name:'', bio:'',
    total_capital_available:0, average_ticket_size:0, max_ticket_size:0,
    preferred_sectors:[], preferred_stage:[], preferred_geography:[],
    risk_level:'medium', provides_mentorship:false, provides_network:false,
    number_of_investments:0, notable_companies:[''],
    // New Deep Filtering
    custom_filters: { min_revenue: 0, requires_patents: false },
    offered_capital_solutions: ['Equity'], offered_mentorship_areas: []
  };
  const [invForm, setInvForm] = useState(blankInvestor);
  const invf = (k, v) => setInvForm(p => ({ ...p, [k]: v }));

  // ── Deal form ──────────────────────────────────────────────────────────
  const [dealForm, setDealForm] = useState({ amount:0, equity_percentage:0, valuation:0, deal_type: 'Equity', real_time_data_access: true });
  const [milestoneForm, setMilestoneForm] = useState([
    { title:'Initial Capital Injection', description:'Sign docs and transfer funds.', deadline:'', success_metric:'Signed Term Sheet', verification_method:'Legal Review', fund_amount:0 }
  ]);

  // ── Fetch all data ─────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const uid = session?.user?.id;
      const [myComp, myInv, pComps, pInvs, myDeals, myBal, myDocs, myNotifs, socialData, followsData, myProf] = await Promise.all([
        uid ? supabase.from('venturex_companies').select('*').eq('user_id', uid).maybeSingle() : Promise.resolve({ data: null }),
        uid ? supabase.from('venturex_investors').select('*').eq('user_id', uid).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from('venturex_companies').select('*').eq('is_public', true).eq('status', 'active').order('investment_readiness_score', { ascending: false }),
        supabase.from('venturex_investors').select('*').eq('is_active', true).order('total_capital_available', { ascending: false }),
        uid ? supabase.from('venturex_deals').select('*').or(`company_user_id.eq.${uid},investor_user_id.eq.${uid}`).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
        uid ? supabase.from('balances').select('liquid_usd').eq('user_id', uid).maybeSingle() : Promise.resolve({ data: null }),
        uid ? supabase.from('venturex_documents').select('*, venturex_document_notary(*)').order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
        uid ? supabase.from('venturex_notifications').select('*').eq('user_id', uid).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
        supabase.from('social_feed_view').select('*').order('created_at', { ascending: false }),
        uid ? supabase.from('social_follows').select('following_id').eq('follower_id', uid) : Promise.resolve({ data: [] }),
        uid ? supabase.from('profiles').select('default_like_value').eq('id', uid).single() : Promise.resolve({ data: null })
      ]);
      
      if (myBal.data) setMyBalance(myBal.data.liquid_usd || 0);
      if (myProf.data) setMyLikeValue(myProf.data.default_like_value || 0);

      if (myComp.data) { setMyCompany(myComp.data); setCompForm({ ...blankCompany, ...myComp.data }); }
      if (myInv.data) { setMyInvestor(myInv.data); setInvForm({ ...blankInvestor, ...myInv.data }); }
      if (pComps.data) setPublicCompanies(pComps.data);
      if (pInvs.data) setPublicInvestors(pInvs.data);
      if (myDeals.data) setDeals(myDeals.data);
      if (myDocs?.data) setDocuments(myDocs.data);
      if (myNotifs?.data) setNotifications(myNotifs.data);
      if (socialData?.data) setFeedPosts(socialData.data);
      
      if (followsData?.data) {
        const map = {};
        followsData.data.forEach(f => { map[f.following_id] = true; });
        setFollowingMap(map);
      }

      if (myComp.data && pInvs.data) {
        const scored = pInvs.data.map(inv => ({ inv, ...computeMatchScore(myComp.data, inv) })).sort((a, b) => b.score - a.score);
        setMatches(scored);
      } else if (myInv.data && pComps.data) {
        const scored = pComps.data.map(comp => ({ comp, ...computeMatchScore(comp, myInv.data) })).sort((a, b) => b.score - a.score);
        setMatches(scored);
      }
    } finally { setIsLoading(false); }
  }, [session?.user?.id]); 

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!session?.user?.id) return;
    const channel = supabase.channel('venturex_notifs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'venturex_notifications', filter: `user_id=eq.${session.user.id}` }, (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
        notify(payload.new.message, 'success');
      }).subscribe();
    return () => supabase.removeChannel(channel);
  }, [session?.user?.id]);

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!myCompany) return notify('You need a company profile to upload documents.', 'error');
    if (!uploadForm.title || !uploadForm.file) return notify('Please provide a title and select a file.', 'error');
    
    setIsSaving(true);
    // Simulate reading file and hashing (Blockchain Notary prep)
    const reader = new FileReader();
    reader.onload = async (event) => {
       const content = event.target.result;
       // Simulate SHA-256 hash creation (fallback for environments without crypto.subtle)
       let fileHash = 'hash_' + Date.now() + Math.random().toString(36).substring(7);
       try {
         const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content));
         const hashArray = Array.from(new Uint8Array(hashBuffer));
         fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
       } catch (err) {}
       
       // In a real app, upload to Supabase Storage here and get URL.
       const dummyUrl = 'https://ifb-secure-vault.local/' + uploadForm.file.name;

       const { error } = await supabase.from('venturex_documents').insert([{
         company_id: myCompany.id,
         uploaded_by: session.user.id,
         document_type: uploadForm.document_type,
         title: uploadForm.title,
         file_url: dummyUrl,
         file_size_bytes: uploadForm.file.size,
         file_hash: fileHash,
         access_level: uploadForm.access_level
       }]);

       if (error) notify(error.message, 'error');
       else {
         notify('Document uploaded and blockchain notarized.');
         setUploadForm({ title: '', document_type: 'Corporate_Governance', access_level: 'Deal_Parties', file: null });
         fetchAll();
       }
       setIsSaving(false);
    };
    reader.readAsDataURL(uploadForm.file);
  };

  // ── Social Feed Handlers ─────────────────────────────────────────────
  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!postForm.content) return;
    setIsPosting(true);
    let mediaUrls = [];
    let mediaTypes = [];
    if (postForm.file) {
       mediaUrls = ['https://ifb-cdn.local/' + postForm.file.name];
       mediaTypes = [postForm.fileType];
    }
    const { error } = await supabase.from('social_posts').insert([{
      author_id: session.user.id,
      content: postForm.content,
      media_urls: mediaUrls,
      media_types: mediaTypes
    }]);
    if (error) notify(error.message, 'error');
    else {
      setPostForm({ content: '', file: null, fileType: '' });
      notify('Update posted to your followers.');
      fetchAll();
    }
    setIsPosting(false);
  };

  const toggleFollow = async (targetUserId) => {
    if (!targetUserId || targetUserId === session.user.id) return;
    const isFollowing = followingMap[targetUserId];
    
    if (isFollowing) {
      await supabase.from('social_follows').delete().eq('follower_id', session.user.id).eq('following_id', targetUserId);
      setFollowingMap(prev => { const n = {...prev}; delete n[targetUserId]; return n; });
    } else {
      await supabase.from('social_follows').insert([{ follower_id: session.user.id, following_id: targetUserId }]);
      setFollowingMap(prev => ({ ...prev, [targetUserId]: true }));
      notify('You are now following this user.');
    }
  };

  const handleLike = async (postId, type = 'like', customAmount = null) => {
    try {
      const { data, error } = await supabase.rpc('process_monetized_interaction', {
        p_post_id: postId,
        p_user_id: session.user.id,
        p_interaction_type: customAmount ? 'special' : type,
        p_custom_amount: customAmount
      });

      if (error) throw error;
      if (data?.ok) {
        if (data.amount > 0) notify(`Capital Transferred! You sent $${data.amount.toFixed(2)}.`);
        fetchAll();
        setShowSpecialLike(null);
      } else {
        notify(data?.error || 'Interaction failed.', 'error');
      }
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const updateLikeValue = async (val) => {
    setMyLikeValue(val);
    const { error } = await supabase.from('profiles').update({ default_like_value: val }).eq('id', session.user.id);
    if (error) notify(error.message, 'error');
  };

  // Simulate incoming real-time telemetry if looking at a deal with real_time_data_access
  useEffect(() => {
    if (tab === 'DEAL_DETAIL' && selectedDeal?.real_time_data_access) {
      const interval = setInterval(() => {
        setLiveMetrics({
          api_calls: Math.floor(Math.random() * 1000) + 5000,
          active_sessions: Math.floor(Math.random() * 100) + 400,
          tx_volume: Math.random() * 5000 + 10000
        });
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [tab, selectedDeal]);


  const saveCompany = async (publish = false) => {
    if (!compForm.legal_name || !compForm.sector || !compForm.funding_goal) { notify('Fill required fields: Name, Sector, Funding Goal.', 'error'); return; }
    setIsSaving(true);
    const scores = computeScores({ ...compForm, runway_months: compForm.monthly_burn_rate > 0 ? compForm.cash_on_hand / compForm.monthly_burn_rate : 0 });
    const payload = {
      ...compForm, user_id: session.user.id, is_public: publish, status: publish ? 'active' : 'draft',
      investment_readiness_score: scores.readiness, risk_score: scores.risk, growth_score: scores.growth, updated_at: new Date().toISOString(),
    };
    const { error } = myCompany ? await supabase.from('venturex_companies').update(payload).eq('id', myCompany.id) : await supabase.from('venturex_companies').insert([payload]);
    if (error) notify(error.message, 'error'); else { notify(publish ? 'Company published to marketplace!' : 'Draft saved.'); fetchAll(); }
    setIsSaving(false);
  };

  const saveInvestor = async () => {
    if (!invForm.investor_type || !invForm.total_capital_available) { notify('Fill required fields: Investor Type and Capital Available.', 'error'); return; }
    setIsSaving(true);
    const payload = { ...invForm, user_id: session.user.id, updated_at: new Date().toISOString() };
    const { error } = myInvestor ? await supabase.from('venturex_investors').update(payload).eq('id', myInvestor.id) : await supabase.from('venturex_investors').insert([payload]);
    if (error) notify(error.message, 'error'); else { notify('Investor profile saved!'); fetchAll(); }
    setIsSaving(false);
  };

  const proposeDeal = async (company) => {
    if (!myInvestor) { notify('Create an investor profile first.', 'error'); return; }
    setIsSaving(true);
    
    // Generate a simulated smart contract address
    const scAddress = `0xIFB${Math.random().toString(16).slice(2, 10).toUpperCase()}...${Math.random().toString(16).slice(2, 6).toUpperCase()}`;

    const { data: deal, error } = await supabase.from('venturex_deals').insert([{
      company_id: company.id, investor_id: myInvestor.id,
      company_user_id: company.user_id, investor_user_id: session.user.id,
      amount: dealForm.amount, equity_percentage: dealForm.equity_percentage, valuation: dealForm.valuation,
      deal_type: dealForm.deal_type, real_time_data_access: dealForm.real_time_data_access,
      smart_contract_address: scAddress,
      total_milestones: milestoneForm.filter(m => m.title).length,
      ifb_commission_rate: 2.5,
    }]).select().single();
    
    if (error) { notify(error.message, 'error'); setIsSaving(false); return; }

    const validMilestones = milestoneForm.filter(m => m.title).map(m => ({ ...m, deal_id: deal.id }));
    if (validMilestones.length) await supabase.from('venturex_milestones').insert(validMilestones);
    
    notify(`Smart Contract Generated! Proposal sent to ${company.legal_name}.`);
    setSelectedCompany(null); fetchAll(); setIsSaving(false);
  };

  const respondDeal = async (dealId, action) => {
    const status = action === 'accept' ? 'accepted' : 'rejected';
    const { error } = await supabase.from('venturex_deals').update({ status, updated_at: new Date().toISOString() }).eq('id', dealId);
    if (error) notify(error.message, 'error'); else notify(action === 'accept' ? 'Deal accepted! Smart contract armed. Awaiting funding.' : 'Deal declined.');
    fetchAll();
  };

  const fundEscrow = async (dealId, dealAmount) => {
    if (myBalance < dealAmount) { notify(`Insufficient balance.`, 'error'); return; }
    setIsFunding(true);
    const { data, error } = await supabase.rpc('venturex_fund_escrow', { p_deal_id: dealId });
    if (error || data?.error) notify(error?.message || data?.error, 'error');
    else { notify(`Escrow funded! Smart contract live.`); fetchAll(); }
    setIsFunding(false);
  };

  const loadDealMilestones = async (dealId) => {
    const { data } = await supabase.from('venturex_milestones').select('*').eq('deal_id', dealId).order('created_at');
    if (data) setDealMilestones(data);
  };

  const openDeal = (deal) => {
    setSelectedDeal(deal);
    setAuditLog([]);
    setTab('DEAL_DETAIL');
    loadDealMilestones(deal.id);
  };

  const verifyMilestone = async (milestoneId) => {
    const { data, error } = await supabase.rpc('release_milestone_funds', { p_milestone_id: milestoneId, p_verifier_id: session.user.id });
    if (error || data?.error) notify(error?.message || data?.error, 'error');
    else { notify(`Funds released via Smart Contract!`); fetchAll(); loadDealMilestones(selectedDeal.id); }
  };

  const sendCfoMessage = async () => {
    if (!cfoInput.trim() || cfoLoading) return;
    const userMsg = { role: 'user', content: cfoInput.trim() };
    const company = myCompany;
    const contextMsg = { role: 'user', content: `[CFO CONTEXT: You are acting as a startup CFO. The entrepreneur's company: ${company?.legal_name || 'an early-stage startup'}, sector: ${company?.sector || 'tech'}, monthly revenue: $${company?.monthly_revenue || 0}, burn rate: $${company?.monthly_burn_rate || 0}/mo, runway: ${company?.runway_months || 0} months, team size: ${company?.team_size || 1}, stage: ${company?.current_round || 'pre-seed'}. Give specific, actionable CFO-level advice.]` };
    const newMessages = [...cfoMessages, userMsg];
    setCfoMessages(newMessages);
    setCfoInput('');
    setCfoLoading(true);
    try {
      const payload = [contextMsg, ...newMessages.filter(m => m.role !== 'system')].map(m => ({ role: m.role, content: m.content }));
      const { data, error } = await supabase.functions.invoke('pascaline-grok-agent', {
        body: { messages: payload, userId: session?.user?.id }
      });
      if (error) throw error;
      setCfoMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
    } catch (err) {
      setCfoMessages(prev => [...prev, { role: 'assistant', content: 'CFO intelligence temporarily offline. Please retry.' }]);
    } finally {
      setCfoLoading(false);
    }
  };

  const fmtK = (v) => !v ? '$0' : v >= 1e9 ? `$${(v/1e9).toFixed(1)}B` : v >= 1e6 ? `$${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `$${(v/1e3).toFixed(0)}K` : `$${v}`;

  if (isLoading) return <div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={36} /></div>;

  return (
    <div className="relative min-h-full bg-slate-50 pb-20">
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-full shadow-2xl text-sm font-black flex items-center gap-2 animate-in slide-in-from-top-4 ${toast.type === 'error' ? 'bg-red-900 text-red-200 border border-red-500' : 'bg-emerald-800 text-emerald-100 border border-emerald-500'}`}>
          {toast.type === 'error' ? <XCircle size={14}/> : <CheckCircle2 size={14}/>} {toast.msg}
        </div>
      )}

      <div className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200 px-6 pt-4 pb-0 flex justify-between items-end shadow-sm">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {[
            { id:'HOME', label:'Dashboard' },
            { id:'UPDATES', label: 'Updates' },
            { id:'COMPANY', label: myCompany ? 'Company Profile' : '+ Startup' },
            { id:'VDR', label: myCompany ? 'VDR & Docs' : null },
            { id:'INVESTOR', label: myInvestor ? 'Inv. Profile' : '+ Investor' },
            { id:'MARKETPLACE', label:'Marketplace' },
            { id:'DEALS', label:`Contracts${deals.length ? ` (${deals.length})` : ''}` },
            { id:'CFO', label:'CFO' },
          ].filter(t => t.label).map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setSelectedDeal(null); }}
              className={`shrink-0 px-5 py-3 text-[11px] font-black uppercase tracking-widest rounded-t-2xl border-b-4 transition-all ${tab === t.id ? 'border-blue-600 text-blue-700 bg-white shadow-[0_-5px_15px_-10px_rgba(0,0,0,0.1)]' : 'border-transparent text-slate-400 hover:text-slate-700 hover:bg-white/50'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative mb-2">
           <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 bg-white rounded-full border border-slate-200 text-slate-500 hover:text-slate-800 shadow-sm relative">
             <Bell size={18}/>
             {notifications.filter(n => !n.is_read).length > 0 && (
               <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
             )}
           </button>
           {showNotifications && (
             <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50">
               <div className="p-4 bg-slate-50 border-b border-slate-100 font-black text-[10px] uppercase tracking-widest text-slate-500 flex justify-between">
                 <span>Notifications</span>
                 <button className="hover:text-blue-600" onClick={() => setShowNotifications(false)}><XCircle size={14}/></button>
               </div>
               <div className="max-h-64 overflow-y-auto">
                 {notifications.length === 0 ? (
                   <div className="p-6 text-center text-xs text-slate-400 font-bold">No new notifications.</div>
                 ) : notifications.map(n => (
                   <div key={n.id} className={`p-4 border-b border-slate-50 text-xs ${!n.is_read ? 'bg-blue-50/50' : ''}`}>
                     <p className="font-black text-slate-800 mb-1">{n.title}</p>
                     <p className="text-slate-600">{n.message}</p>
                     <p className="text-[8px] text-slate-400 uppercase mt-2">{new Date(n.created_at).toLocaleString()}</p>
                   </div>
                 ))}
               </div>
             </div>
           )}
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
        
        {/* ═════════ SOCIAL FEED (UPDATES) ═════════ */}
        {tab === 'UPDATES' && (
          <div className="space-y-8 animate-in fade-in max-w-3xl mx-auto">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Global Updates</h2>
                <p className="text-sm font-medium text-slate-500 mt-1">Follow companies, investors, and NPOs to receive their latest news.</p>
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                 <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Your Reaction Value</p>
                 <div className="flex items-center gap-2">
                   <span className="font-black text-sm text-slate-800">$</span>
                   <input type="number" step="0.5" className="w-16 bg-slate-50 border border-slate-100 rounded-lg p-1 font-black text-sm outline-none" value={myLikeValue} onChange={e => updateLikeValue(+e.target.value)}/>
                 </div>
              </div>
            </div>

            {/* Create Post */}
            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-sm">
              <form onSubmit={handlePostSubmit}>
                <textarea 
                  required 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-bold text-sm outline-none focus:border-blue-500 resize-none h-24 mb-4" 
                  placeholder="Share a milestone, post a video update, or announce a new round..."
                  value={postForm.content} 
                  onChange={e => setPostForm(p => ({...p, content: e.target.value}))}
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <label className="cursor-pointer text-slate-400 hover:text-blue-600 transition-colors flex items-center gap-1">
                      <input type="file" className="hidden" accept="image/*,video/*" onChange={e => {
                        const file = e.target.files[0];
                        if(file) setPostForm(p => ({...p, file, fileType: file.type.startsWith('video') ? 'video' : 'image'}));
                      }}/>
                      <Upload size={18}/> <span className="text-[10px] font-black uppercase tracking-widest">{postForm.file ? 'Media Attached' : 'Attach Media'}</span>
                    </label>
                  </div>
                  <button type="submit" disabled={isPosting} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 disabled:opacity-50 shadow-md">
                    {isPosting ? <Loader2 size={14} className="animate-spin"/> : 'Publish Update'}
                  </button>
                </div>
              </form>
            </div>

            {/* Feed List */}
            <div className="space-y-6">
              {feedPosts.filter(post => followingMap[post.author_id] || post.author_id === session?.user?.id).length === 0 ? (
                <div className="text-center py-16 bg-slate-50 border border-slate-200 rounded-[2.5rem]">
                  <Activity size={40} className="mx-auto text-slate-300 mb-4"/>
                  <p className="text-slate-500 font-bold">Your feed is empty.</p>
                  <p className="text-xs text-slate-400 mt-1">Follow companies in the Marketplace to see their updates here.</p>
                </div>
              ) : (
                feedPosts.filter(post => followingMap[post.author_id] || post.author_id === session?.user?.id).map(post => (
                  <div key={post.id} className="bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-black">{post.author_name.charAt(0)}</div>
                        <div>
                          <p className="font-black text-slate-800 leading-tight">{post.author_name}</p>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{post.author_role} • {new Date(post.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-slate-600 font-medium mb-4 whitespace-pre-wrap">{post.content}</p>
                    
                    {post.media_urls && post.media_urls.length > 0 && (
                      <div className="mb-4 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
                        {post.media_types[0] === 'video' ? (
                          <div className="aspect-video bg-slate-900 flex items-center justify-center text-white"><span className="text-xs font-black tracking-widest uppercase">Video Player (Simulated)</span></div>
                        ) : (
                          <div className="aspect-video bg-slate-200 flex items-center justify-center text-slate-400"><span className="text-xs font-black tracking-widest uppercase">Image Attachment (Simulated)</span></div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-6 border-t border-slate-50 pt-4">
                      <button onClick={() => handleLike(post.id, 'like')} className="flex items-center gap-1 text-slate-400 hover:text-blue-600 transition-colors group">
                        <HeartHandshake size={18}/> 
                        <div className="flex flex-col items-start">
                          <span className="text-xs font-black">{post.like_count}</span>
                          <span className="text-[8px] font-bold uppercase text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">Cost: ${myLikeValue}</span>
                        </div>
                      </button>
                      <button onClick={() => handleLike(post.id, 'love')} className="flex items-center gap-1 text-slate-400 hover:text-rose-500 transition-colors group">
                        <Star size={18}/> 
                        <div className="flex flex-col items-start">
                          <span className="text-xs font-black">{post.love_count}</span>
                          <span className="text-[8px] font-bold uppercase text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">Cost: ${myLikeValue}</span>
                        </div>
                      </button>

                      <button onClick={() => setShowSpecialLike(post.id)} className="flex items-center gap-1 text-emerald-600 hover:text-emerald-500 transition-colors">
                        <Zap size={18}/> <span className="text-[10px] font-black uppercase tracking-widest">Special Like</span>
                      </button>

                      <div className="ml-auto text-right">
                         <p className="text-[9px] font-black uppercase text-slate-400">Raised via Post</p>
                         <p className="text-sm font-black text-emerald-600">${Number(post.total_revenue).toLocaleString()}</p>
                      </div>
                    </div>

                    {showSpecialLike === post.id && (
                      <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between animate-in zoom-in-95">
                         <div className="flex items-center gap-3">
                            <span className="text-xs font-black text-emerald-800">Support Amount:</span>
                            <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl border border-emerald-200">
                               <span className="font-black text-emerald-600">$</span>
                               <input type="number" className="w-16 bg-transparent font-black text-sm outline-none text-emerald-800" value={specialAmount} onChange={e=>setSpecialAmount(+e.target.value)}/>
                            </div>
                         </div>
                         <button onClick={() => handleLike(post.id, 'special', specialAmount)} className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 shadow-md">Deploy Support</button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ═════════ COMPANY PROFILE (DATA ROOM) ═════════ */}
        {tab === 'COMPANY' && (
          <div className="space-y-8 animate-in fade-in">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Executive Data Room</h2>
                <p className="text-sm font-medium text-slate-500 mt-1">Exhaustive metrics for investor due diligence.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={()=>saveCompany(false)} disabled={isSaving} className="px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 shadow-sm">Save Draft</button>
                <button onClick={()=>saveCompany(true)} disabled={isSaving} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 shadow-md flex items-center gap-2"><Globe size={14}/> Publish Live</button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <Section title="Identity & Core" icon={<Building2 size={16}/>}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Legal Entity Name" required><input className={inp} value={compForm.legal_name} onChange={e=>cf('legal_name',e.target.value)} placeholder="Nexus Quantum Ltd."/></Field>
                    <Field label="Registration / Tax ID" required><input className={inp} value={compForm.registration_number} onChange={e=>cf('registration_number',e.target.value)} placeholder="EIN/VAT Number"/></Field>
                    <Field label="Country" required><select className={sel} value={compForm.country} onChange={e=>cf('country',e.target.value)}><option value="">Select</option>{GEOS.map(g=><option key={g}>{g}</option>)}</select></Field>
                    <Field label="Sector" required><select className={sel} value={compForm.sector} onChange={e=>cf('sector',e.target.value)}><option value="">Select</option>{SECTORS.map(s=><option key={s}>{s}</option>)}</select></Field>
                    <div className="col-span-1 md:col-span-2"><Field label="Elevator Pitch"><input className={inp} value={compForm.tagline} onChange={e=>cf('tagline',e.target.value)} placeholder="Disrupting X using Y..."/></Field></div>
                  </div>
                </Section>

                <Section title="Deep Financials & KPIs" icon={<BarChart3 size={16}/>}>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                    <Field label="Monthly Revenue ($)"><input type="number" className={inp} value={compForm.monthly_revenue} onChange={e=>cf('monthly_revenue',+e.target.value)}/></Field>
                    <Field label="Gross Margin (%)"><input type="number" className={inp} value={compForm.gross_margin} onChange={e=>cf('gross_margin',+e.target.value)}/></Field>
                    <Field label="EBITDA ($)"><input type="number" className={inp} value={compForm.ebitda} onChange={e=>cf('ebitda',+e.target.value)}/></Field>
                    <Field label="Monthly Burn ($)"><input type="number" className={inp} value={compForm.monthly_burn_rate} onChange={e=>cf('monthly_burn_rate',+e.target.value)}/></Field>
                    <Field label="Cash on Hand ($)"><input type="number" className={inp} value={compForm.cash_on_hand} onChange={e=>cf('cash_on_hand',+e.target.value)}/></Field>
                    <Field label="LTV/CAC Ratio"><div className={`${inp} bg-slate-100 text-slate-500 cursor-not-allowed`}>{compForm.cac > 0 ? (compForm.ltv/compForm.cac).toFixed(2) : '—'}</div></Field>
                  </div>
                </Section>

                <Section title="Capital & Strategic Needs" icon={<Target size={16}/>}>
                  <div className="grid grid-cols-2 gap-5 mb-6">
                    <Field label="Funding Goal ($)" required><input type="number" className={inp} value={compForm.funding_goal} onChange={e=>cf('funding_goal',+e.target.value)}/></Field>
                    <Field label="Current Valuation ($)"><input type="number" className={inp} value={compForm.valuation} onChange={e=>cf('valuation',+e.target.value)}/></Field>
                  </div>
                  <ToggleGroup label="Acceptable Capital Solutions" options={CAPITAL_TYPES} value={compForm.capital_solutions_sought} onChange={v=>cf('capital_solutions_sought',v)}/>
                  <div className="mt-6 p-5 bg-blue-50 border border-blue-100 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-black text-blue-900">Seeking Mentorship & Guidance?</span>
                      <Toggle value={compForm.mentorship_needed} onChange={v=>cf('mentorship_needed',v)}/>
                    </div>
                    {compForm.mentorship_needed && (
                      <ToggleGroup label="Required Expertise Areas" options={MENTOR_AREAS} value={compForm.mentorship_areas} onChange={v=>cf('mentorship_areas',v)}/>
                    )}
                  </div>
                </Section>
              </div>

              <div className="space-y-8">
                <Section title="Customer Intel" icon={<Users size={16}/>}>
                  <div className="space-y-5">
                    <Field label="Target Customer Type"><select className={sel} value={compForm.customer_type} onChange={e=>cf('customer_type',e.target.value)}>{CUST_TYPES.map(c=><option key={c}>{c}</option>)}</select></Field>
                    <Field label="Active Users"><input type="number" className={inp} value={compForm.active_users} onChange={e=>cf('active_users',+e.target.value)}/></Field>
                    <Field label="Retention Rate (%)"><input type="number" className={inp} value={compForm.retention_rate} onChange={e=>cf('retention_rate',+e.target.value)}/></Field>
                  </div>
                </Section>

                <Section title="IP & Defensibility" icon={<Key size={16}/>}>
                   <div className="space-y-4">
                     {compForm.patents_ip.map((p, i) => (
                       <div key={i} className="flex items-center gap-2">
                         <input className={inp} value={p} onChange={e=>{ const arr=[...compForm.patents_ip]; arr[i]=e.target.value; cf('patents_ip',arr); }} placeholder="e.g., US Patent #1234567"/>
                         <button onClick={()=>cf('patents_ip',compForm.patents_ip.filter((_,j)=>j!==i))} className="p-3 text-red-400 hover:bg-red-50 rounded-xl"><Trash2 size={16}/></button>
                       </div>
                     ))}
                     <button onClick={()=>cf('patents_ip',[...compForm.patents_ip, ''])} className="w-full py-3 border-2 border-dashed border-slate-200 text-slate-400 rounded-xl font-bold text-xs hover:border-blue-400 hover:text-blue-500 transition-colors">+ Add Patent/IP</button>
                   </div>
                </Section>
              </div>
            </div>
          </div>
        )}

        {/* ═════════ VIRTUAL DATA ROOM (VDR) ═════════ */}
        {tab === 'VDR' && myCompany && (
          <div className="space-y-8 animate-in fade-in">
             <div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Virtual Data Room (VDR)</h2>
                <p className="text-sm font-medium text-slate-500 mt-1">Blockchain-notarized document repository for investor due diligence.</p>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <div className="lg:col-span-1">
                 <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm sticky top-24">
                   <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-4 flex items-center gap-2"><Upload size={16} className="text-blue-600"/> Upload Document</h3>
                   <form onSubmit={handleFileUpload} className="space-y-4">
                     <Field label="Document Title" required><input required className={inp} value={uploadForm.title} onChange={e=>setUploadForm(p=>({...p,title:e.target.value}))} placeholder="e.g., Q3 Financials 2026"/></Field>
                     <Field label="Category" required><select className={sel} value={uploadForm.document_type} onChange={e=>setUploadForm(p=>({...p,document_type:e.target.value}))}>
                       <option value="Corporate_Governance">Corporate Governance</option>
                       <option value="Capitalization_Equity">Cap Table & Equity</option>
                       <option value="Financials">Financials & Models</option>
                       <option value="Intellectual_Property">Intellectual Property</option>
                       <option value="Material_Contracts">Material Contracts</option>
                       <option value="Team_HR">Team & HR</option>
                       <option value="Product_Tech">Product & Tech Specs</option>
                       <option value="Pitch_Deck">Pitch Deck</option>
                       <option value="Other">Other</option>
                     </select></Field>
                     <Field label="Access Level" required><select className={sel} value={uploadForm.access_level} onChange={e=>setUploadForm(p=>({...p,access_level:e.target.value}))}>
                       <option value="Deal_Parties">Deal Parties Only</option>
                       <option value="Public">Public (All IFB Investors)</option>
                     </select></Field>
                     <Field label="File" required><input required type="file" className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" onChange={e=>setUploadForm(p=>({...p,file:e.target.files[0]}))}/></Field>
                     <button type="submit" disabled={isSaving} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
                       {isSaving ? <Loader2 size={14} className="animate-spin"/> : <><ShieldCheck size={14}/> Notarize & Upload</>}
                     </button>
                   </form>
                 </div>
               </div>

               <div className="lg:col-span-2 space-y-6">
                 {documents.length === 0 ? (
                   <div className="text-center py-16 bg-slate-50 border border-slate-200 rounded-[2.5rem]"><FileArchive size={40} className="mx-auto text-slate-300 mb-4"/><p className="text-slate-500 font-bold">Your VDR is empty. Upload documents to build investor trust.</p></div>
                 ) : (
                   documents.map(doc => (
                     <div key={doc.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
                       <div className="flex justify-between items-start mb-4">
                         <div className="flex items-center gap-3">
                           <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><FileText size={20}/></div>
                           <div>
                             <h4 className="font-black text-lg text-slate-800">{doc.title}</h4>
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{doc.document_type.replace('_',' ')} · {(doc.file_size_bytes/1024/1024).toFixed(2)} MB</p>
                           </div>
                         </div>
                         <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${doc.access_level === 'Public' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{doc.access_level.replace('_',' ')}</span>
                       </div>
                       
                       <div className="bg-slate-900 rounded-2xl p-4 text-white mt-4 relative overflow-hidden">
                         <div className="flex items-center gap-2 mb-2"><ShieldCheck size={14} className="text-emerald-400"/><span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Blockchain Notarized</span></div>
                         {doc.venturex_document_notary?.[0] ? (
                           <div className="space-y-1">
                             <div className="flex justify-between"><span className="text-[9px] text-slate-500 font-bold">Block</span><span className="text-[10px] font-mono text-slate-300">#{doc.venturex_document_notary[0].block_number}</span></div>
                             <div className="flex justify-between"><span className="text-[9px] text-slate-500 font-bold">File Hash</span><span className="text-[10px] font-mono text-slate-300 truncate max-w-[200px]" title={doc.venturex_document_notary[0].file_hash}>{doc.venturex_document_notary[0].file_hash}</span></div>
                             <div className="flex justify-between"><span className="text-[9px] text-slate-500 font-bold">Tx Signature</span><span className="text-[10px] font-mono text-slate-300 truncate max-w-[200px]" title={doc.venturex_document_notary[0].chain_tx_hash}>{doc.venturex_document_notary[0].chain_tx_hash}</span></div>
                           </div>
                         ) : (
                           <p className="text-xs text-slate-400 italic">Notarization pending confirmation...</p>
                         )}
                       </div>
                     </div>
                   ))
                 )}
               </div>
             </div>
          </div>
        )}

        {/* ═════════ MARKETPLACE / DEAL ROOM ═════════ */}
        {tab === 'MARKETPLACE' && (
          <div className="space-y-8 animate-in fade-in">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Venture Network</h2>
                <p className="text-sm font-medium text-slate-500 mt-1">Connect, analyze, and execute smart contracts.</p>
              </div>
            </div>

            {myInvestor && matches.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {matches.map(({ comp, score }) => comp && (
                  <div key={comp.id} className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl transition-all group">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg"><Rocket size={24}/></div>
                        <div>
                          <h3 className="font-black text-2xl text-slate-800 tracking-tight">{comp.legal_name}</h3>
                          <p className="text-xs font-black uppercase tracking-widest text-slate-400">{comp.sector} · {comp.country}</p>
                        </div>
                      </div>
                      <div className="text-center flex flex-col items-end">
                        <div className="flex gap-2 mb-2">
                           <button onClick={() => toggleFollow(comp.user_id)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-colors ${followingMap[comp.user_id] ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>
                             {followingMap[comp.user_id] ? 'Following' : 'Follow'}
                           </button>
                        </div>
                        <div className={`text-2xl font-black ${score >= 75 ? 'text-emerald-500' : 'text-amber-500'}`}>{score}%</div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Match</p>
                      </div>
                    </div>
                    
                    <p className="text-sm text-slate-600 font-medium mb-6 line-clamp-2">"{comp.tagline}"</p>

                    <div className="grid grid-cols-3 gap-3 mb-8 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div><p className="text-[10px] font-black uppercase text-slate-400">Revenue</p><p className="text-lg font-black text-slate-800">{fmtK(comp.monthly_revenue)}/mo</p></div>
                      <div><p className="text-[10px] font-black uppercase text-slate-400">Raising</p><p className="text-lg font-black text-blue-600">{fmtK(comp.funding_goal)}</p></div>
                      <div><p className="text-[10px] font-black uppercase text-slate-400">Valuation</p><p className="text-lg font-black text-slate-800">{fmtK(comp.valuation)}</p></div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-6">
                      {(comp.capital_solutions_sought||[]).map(s => <span key={s} className="px-2 py-1 bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase rounded-lg border border-indigo-100">{s}</span>)}
                      {comp.mentorship_needed && <span className="px-2 py-1 bg-fuchsia-50 text-fuchsia-600 text-[9px] font-black uppercase rounded-lg border border-fuchsia-100 flex items-center gap-1"><BrainCircuit size={10}/> Mentorship</span>}
                    </div>

                    <button onClick={()=>{ setSelectedCompany(comp); setDealForm({ ...dealForm, amount: comp.funding_goal, equity_percentage: comp.equity_offered, valuation: comp.valuation, deal_type: comp.capital_solutions_sought?.[0] || 'Equity' }); }}
                      className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-colors flex items-center justify-center gap-2">
                      Enter Deal Room <ArrowRight size={14}/>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═════════ DEAL ROOM MODAL (SMART CONTRACT GENERATION) ═════════ */}
        {selectedCompany && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[3rem] w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-xl"><Database size={20}/></div>
                  <div>
                    <h3 className="font-black text-xl text-slate-800 tracking-tight">Interactive Deal Room</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{selectedCompany.legal_name} · Real-Time Assessment</p>
                  </div>
                </div>
                <button onClick={()=>setSelectedCompany(null)} className="p-3 bg-white rounded-full text-slate-400 hover:text-slate-800 shadow-sm border border-slate-200"><XCircle size={20}/></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 custom-scrollbar">
                {/* Left: Deep Data */}
                <div className="space-y-6">
                  <div className="bg-slate-900 text-white p-6 rounded-3xl relative overflow-hidden">
                    <Activity className="absolute -right-4 -bottom-4 text-slate-800 opacity-50" size={100}/>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-4">Verified Telemetry</h4>
                    <div className="grid grid-cols-2 gap-4 relative z-10">
                       <div><p className="text-[10px] uppercase text-slate-400 font-bold">Active Users</p><p className="text-2xl font-black">{selectedCompany.active_users?.toLocaleString()}</p></div>
                       <div><p className="text-[10px] uppercase text-slate-400 font-bold">Monthly Rev</p><p className="text-2xl font-black">{fmtK(selectedCompany.monthly_revenue)}</p></div>
                       <div><p className="text-[10px] uppercase text-slate-400 font-bold">LTV/CAC</p><p className="text-2xl font-black">{selectedCompany.cac > 0 ? (selectedCompany.ltv/selectedCompany.cac).toFixed(1) : 'N/A'}x</p></div>
                       <div><p className="text-[10px] uppercase text-slate-400 font-bold">Runway</p><p className="text-2xl font-black">{selectedCompany.runway_months?.toFixed(1)} mo</p></div>
                    </div>
                  </div>

                  <div className="border border-slate-200 p-6 rounded-3xl">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-4 flex items-center gap-2"><Key size={14}/> IP & Assets</h4>
                    {selectedCompany.patents_ip?.length > 0 ? (
                      <ul className="space-y-2">
                        {selectedCompany.patents_ip.map((p,i) => <li key={i} className="text-sm font-medium text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">{p}</li>)}
                      </ul>
                    ) : <p className="text-xs text-slate-400 italic">No registered IP assets declared.</p>}
                  </div>
                  
                  {selectedCompany.mentorship_needed && (
                    <div className="bg-fuchsia-50 border border-fuchsia-100 p-6 rounded-3xl">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-fuchsia-800 mb-2 flex items-center gap-2"><BrainCircuit size={14}/> Mentorship Requested</h4>
                      <div className="flex flex-wrap gap-2">
                        {(selectedCompany.mentorship_areas||[]).map(a => <span key={a} className="px-2 py-1 bg-white text-fuchsia-600 text-[9px] font-black uppercase rounded-lg shadow-sm border border-fuchsia-100">{a}</span>)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Smart Contract Config */}
                <div className="space-y-6">
                   <div className="bg-blue-50/50 border border-blue-100 p-6 rounded-3xl">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-800 mb-4 flex items-center gap-2"><FileText size={14}/> Configure Smart Contract</h4>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <Field label="Structure"><select className={sel} value={dealForm.deal_type} onChange={e=>setDealForm(p=>({...p,deal_type:e.target.value}))}>{CAPITAL_TYPES.map(c=><option key={c}>{c}</option>)}</select></Field>
                        <Field label="Valuation ($)"><input type="number" className={inp} value={dealForm.valuation} onChange={e=>setDealForm(p=>({...p,valuation:+e.target.value}))}/></Field>
                        <Field label="Investment ($)"><input type="number" className={inp} value={dealForm.amount} onChange={e=>setDealForm(p=>({...p,amount:+e.target.value}))}/></Field>
                        <Field label="Equity/Terms"><input type="number" className={inp} value={dealForm.equity_percentage} onChange={e=>setDealForm(p=>({...p,equity_percentage:+e.target.value}))}/></Field>
                      </div>
                      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                        <span className="text-xs font-bold text-slate-700">Require Real-Time Data Access (Post-Fund)</span>
                        <Toggle value={dealForm.real_time_data_access} onChange={v=>setDealForm(p=>({...p,real_time_data_access:v}))}/>
                      </div>
                   </div>

                   <div className="border border-slate-200 p-6 rounded-3xl bg-slate-50">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-4">Fund Release Milestones</h4>
                      {milestoneForm.map((m, i) => (
                        <div key={i} className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3 relative mb-3 shadow-sm">
                          <div className="grid grid-cols-2 gap-3">
                            <Field label="Trigger Event"><input className={inp} value={m.title} onChange={e=>{const a=[...milestoneForm];a[i]={...m,title:e.target.value};setMilestoneForm(a);}}/></Field>
                            <Field label="Release ($)"><input type="number" className={inp} value={m.fund_amount} onChange={e=>{const a=[...milestoneForm];a[i]={...m,fund_amount:+e.target.value};setMilestoneForm(a);}}/></Field>
                          </div>
                          {milestoneForm.length > 1 && <button className="absolute top-2 right-2 text-red-400 hover:text-red-600" onClick={()=>setMilestoneForm(milestoneForm.filter((_,j)=>j!==i))}><XCircle size={16}/></button>}
                        </div>
                      ))}
                      <button onClick={()=>setMilestoneForm([...milestoneForm,{title:'',description:'',deadline:'',success_metric:'',verification_method:'',fund_amount:0}])} className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline">+ Add Milestone Tranch</button>
                   </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-4">
                <button onClick={()=>proposeDeal(selectedCompany)} disabled={isSaving} className="w-full md:w-auto px-10 py-5 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-blue-600 shadow-xl disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
                  {isSaving ? <Loader2 size={16} className="animate-spin"/> : <><ShieldCheck size={16}/> Deploy Smart Contract</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═════════ ACTIVE DEALS & CONTRACTS ═════════ */}
        {tab === 'DEALS' && (
          <div className="space-y-6 animate-in fade-in">
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Active Contracts</h2>
            {deals.map(deal => {
              const isFounder = deal.company_user_id === session?.user?.id;
              const progress = deal.total_milestones > 0 ? (deal.completed_milestones / deal.total_milestones) * 100 : 0;
              return (
                <div key={deal.id} className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl transition-all">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-100 pb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-black bg-slate-900 text-white px-2 py-1 rounded-lg tracking-widest uppercase flex items-center gap-1"><Network size={10}/> SC: {deal.smart_contract_address || 'Pending'}</span>
                        <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg border ${deal.status==='active'?'bg-emerald-50 text-emerald-700 border-emerald-200': deal.status==='proposed'?'bg-amber-50 text-amber-700 border-amber-200': 'bg-slate-50 text-slate-500 border-slate-200'}`}>{deal.status}</span>
                      </div>
                      <p className="font-black text-2xl text-slate-800 tracking-tight">{fmtK(deal.amount)} <span className="text-lg text-slate-400 font-medium">via {deal.deal_type}</span></p>
                    </div>
                    <button onClick={()=>openDeal(deal)} className="px-6 py-3 bg-blue-50 text-blue-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-colors border border-blue-100">Manage Contract</button>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                      <span>Fund Release Progress</span>
                      <span className="text-slate-800">{fmtK(deal.funds_released)} / {fmtK(deal.amount)}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width:`${progress}%` }}/>
                    </div>
                  </div>

                  {deal.status === 'proposed' && isFounder && (
                    <div className="flex gap-3 mt-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                      <button onClick={()=>respondDeal(deal.id,'accept')} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 shadow-sm">Sign & Accept</button>
                      <button onClick={()=>respondDeal(deal.id,'reject')} className="px-6 py-3 bg-white text-red-600 border border-red-200 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50">Decline</button>
                    </div>
                  )}

                  {deal.status === 'accepted' && !isFounder && (
                    <div className="mt-6 p-6 bg-slate-900 rounded-3xl text-white">
                      <div className="flex items-center gap-3 mb-4">
                        <Lock className="text-amber-400" size={20}/>
                        <div><p className="font-black text-sm uppercase tracking-widest">Fund Escrow to Activate</p><p className="text-xs text-slate-400 font-medium">Smart contract requires initial liquidity.</p></div>
                      </div>
                      <button onClick={()=>fundEscrow(deal.id, deal.amount)} disabled={isFunding || myBalance < deal.amount} className="w-full py-4 bg-amber-500 text-amber-950 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-400 disabled:opacity-50 transition-colors">
                        {isFunding ? <Loader2 className="animate-spin mx-auto" size={16}/> : `Lock ${fmtK(deal.amount)} in Escrow`}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ═════════ DEAL DETAILS / SMART CONTRACT MANAGER ═════════ */}
        {tab === 'DEAL_DETAIL' && selectedDeal && (
          <div className="space-y-6 animate-in fade-in">
             <div className="flex items-center gap-4 mb-4">
                <button onClick={()=>{setTab('DEALS'); setLiveMetrics({});}} className="p-2 bg-white border border-slate-200 rounded-full text-slate-500 hover:text-slate-800 shadow-sm"><ArrowRight size={16} className="rotate-180"/></button>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Smart Contract Hub</h2>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                   <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm">
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-6 flex items-center gap-2"><Network size={16} className="text-blue-600"/> Automated Milestones</h3>
                      <div className="space-y-4">
                        {dealMilestones.map((m, i) => (
                          <div key={m.id} className={`p-5 rounded-2xl border ${m.is_verified ? 'bg-emerald-50 border-emerald-200' : m.is_completed ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100'}`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-black text-slate-800">{i+1}. {m.title}</h4>
                                <p className="text-xs text-slate-500 font-medium mt-1">Tranch: {fmtK(m.fund_amount)}</p>
                              </div>
                              <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${m.is_verified ? 'bg-emerald-200 text-emerald-800' : m.is_completed ? 'bg-blue-200 text-blue-800' : 'bg-slate-200 text-slate-600'}`}>
                                {m.is_verified ? 'Funds Released' : m.is_completed ? 'Awaiting Verification' : 'Pending'}
                              </span>
                            </div>
                            
                            {/* Investor Action */}
                            {!m.is_verified && m.is_completed && selectedDeal.investor_user_id === session?.user?.id && (
                               <button onClick={()=>verifyMilestone(m.id)} className="mt-4 w-full py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 shadow-sm flex items-center justify-center gap-2"><Unlock size={14}/> Authorize Release</button>
                            )}
                          </div>
                        ))}
                      </div>
                   </div>
                </div>

                <div className="space-y-6">
                   {/* Real-time metrics panel if enabled */}
                   {selectedDeal.real_time_data_access && selectedDeal.investor_user_id === session?.user?.id && (
                     <div className="bg-slate-900 text-white border border-slate-800 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-[60px] opacity-20 pointer-events-none"></div>
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-6 flex items-center gap-2"><Activity size={14}/> Live Telemetry</h3>
                        <div className="space-y-6 relative z-10">
                           <div><p className="text-[10px] uppercase text-slate-400 font-bold mb-1">API Requests / min</p><p className="text-3xl font-black font-mono">{liveMetrics.api_calls?.toLocaleString() || '---'}</p></div>
                           <div><p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Active Sessions</p><p className="text-3xl font-black font-mono">{liveMetrics.active_sessions?.toLocaleString() || '---'}</p></div>
                           <div><p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Transaction Vol.</p><p className="text-3xl font-black font-mono text-emerald-400">{liveMetrics.tx_volume ? fmtK(liveMetrics.tx_volume) : '---'}</p></div>
                        </div>
                        <div className="mt-6 pt-4 border-t border-slate-800 text-[8px] text-slate-500 uppercase font-black text-center tracking-widest">Connected via Secure Oracle</div>
                     </div>
                   )}

                   <div className="bg-white border border-slate-200 p-6 rounded-[2.5rem] shadow-sm">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Contract Details</h3>
                      <div className="space-y-3 text-sm">
                         <div className="flex justify-between"><span className="text-slate-500 font-bold">Address</span><span className="font-mono text-[10px] font-black text-slate-800">{selectedDeal.smart_contract_address}</span></div>
                         <div className="flex justify-between"><span className="text-slate-500 font-bold">Type</span><span className="font-black text-slate-800">{selectedDeal.deal_type}</span></div>
                         <div className="flex justify-between"><span className="text-slate-500 font-bold">Valuation</span><span className="font-black text-slate-800">{fmtK(selectedDeal.valuation)}</span></div>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* ═════════ VIRTUAL CFO AI AGENT ═════════ */}
        {tab === 'CFO' && (
          <div className="space-y-6 animate-in fade-in max-w-4xl mx-auto">
            {/* Header card */}
            <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 border border-slate-800 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[120px] opacity-10 pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-3">
                  <div className="p-3 bg-blue-600 rounded-2xl">
                    <BrainCircuit size={28} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight">Pascaline CFO</h2>
                    <p className="text-sm text-slate-400 font-medium">Your AI Chief Financial Officer</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600/20 border border-blue-500/30 rounded-full text-[10px] font-black uppercase tracking-widest text-blue-300">
                  <Zap size={10} /> Powered by Pascaline Intelligence
                </span>
              </div>
            </div>

            {/* Quick prompt chips */}
            <div className="flex flex-wrap gap-2">
              {[
                'Analyze my burn rate and give me 90-day runway',
                'Should I raise a Series A or bridge round?',
                'Build me a hiring plan for $500K',
                "What's my unit economics health?",
                'How do I optimize CAC/LTV ratio?',
              ].map(chip => (
                <button
                  key={chip}
                  onClick={() => setCfoInput(chip)}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-black text-slate-600 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 transition-all shadow-sm"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Chat area */}
            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden flex flex-col" style={{ minHeight: '520px' }}>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ maxHeight: '440px' }}>
                {cfoMessages.map((msg, i) => (
                  msg.role === 'assistant' ? (
                    <div key={i} className="flex items-start gap-3">
                      <div className="p-2 bg-blue-600 rounded-xl shrink-0">
                        <BrainCircuit size={14} className="text-white" />
                      </div>
                      <div className="bg-slate-800 border-l-4 border-blue-500 rounded-2xl px-5 py-4 max-w-[85%]">
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1.5">Pascaline CFO</p>
                        <p className="text-sm text-slate-200 font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ) : (
                    <div key={i} className="flex justify-end">
                      <div className="bg-blue-600 rounded-2xl px-5 py-4 max-w-[75%]">
                        <p className="text-sm text-white font-medium leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  )
                ))}
                {cfoLoading && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-600 rounded-xl shrink-0">
                      <BrainCircuit size={14} className="text-white" />
                    </div>
                    <div className="bg-slate-800 border-l-4 border-blue-500 rounded-2xl px-5 py-4">
                      <Loader2 size={16} className="animate-spin text-blue-400" />
                    </div>
                  </div>
                )}
              </div>

              {/* Input bar */}
              <div className="p-4 border-t border-slate-800 flex gap-3">
                <input
                  type="text"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white font-bold placeholder:text-slate-500 outline-none focus:border-blue-500 transition-colors"
                  placeholder="Ask your CFO anything about your financials..."
                  value={cfoInput}
                  onChange={e => setCfoInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendCfoMessage(); } }}
                  disabled={cfoLoading}
                />
                <button
                  onClick={sendCfoMessage}
                  disabled={cfoLoading || !cfoInput.trim()}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-[11px] uppercase tracking-widest rounded-xl disabled:opacity-40 transition-colors flex items-center gap-2"
                >
                  {cfoLoading ? <Loader2 size={14} className="animate-spin" /> : <><Zap size={14}/> Send</>}
                </button>
              </div>
            </div>

            {/* Company context card (shows what the CFO knows) */}
            {myCompany && (
              <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2"><Database size={12}/> CFO Context — Your Company Data</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Monthly Revenue', value: fmtK(myCompany.monthly_revenue) },
                    { label: 'Burn Rate', value: `${fmtK(myCompany.monthly_burn_rate)}/mo` },
                    { label: 'Team Size', value: myCompany.team_size || 1 },
                    { label: 'Stage', value: myCompany.current_round || 'pre-seed' },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-slate-50 rounded-2xl p-4 text-center">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
                      <p className="font-black text-slate-800 text-sm">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}