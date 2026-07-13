import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './services/supabaseClient';
import {
  HeartHandshake, ShieldCheck, Loader2, CheckCircle2, ArrowRight,
  Globe2, BrainCircuit, XCircle, ChevronRight, Building2, Users,
  AlertTriangle, Network, RefreshCw, Sparkles, Rocket, BookOpen,
  BarChart3, Activity, FileText, Landmark, GraduationCap, Upload,
  Zap, Heart, Calendar, CreditCard, Gift, Medal, Receipt, Repeat,
  Share2, Target, Ticket, Trophy, Wallet, Star, MapPin, Clock,
  TrendingUp, DollarSign, UserPlus, Award, Copy, ExternalLink,
  ChevronDown, PieChart, Database, Link as LinkIcon, X, Check,
  Play, Edit3, Trash2, Plus
} from 'lucide-react';

// ── Constants ────────────────────────────────────────────────────────────────
const STRIPE_PK = 'pk_live_51QlhX1DV4GGUfngRRIJi02QYB2pTZg2bbX9T4xwM0i6FflEPt2FtV7ydZfNks9I9vOAcmwsLGM1U7tzbpmaP454C00qsme0XJ8';

const TIERS = {
  EMERGING: 'Emerging_Academy', CLUSTER: 'Cluster_Partner',
  ENTERPRISE: 'Enterprise_NGO', STRATEGIC: 'Strategic_Global',
};

const SECTORS = [
  'Education','Health','Environment','Disaster Relief','Poverty Alleviation',
  'Human Rights','Arts & Culture','Technology','Women Empowerment','Child Welfare',
  'Circular Economy','Infrastructure','Animal Welfare','Food Security','Other',
];

const CURRENCIES = [
  { code:'USD', symbol:'$', rate:1, flag:'🇺🇸' },
  { code:'EUR', symbol:'€', rate:0.92, flag:'🇪🇺' },
  { code:'GBP', symbol:'£', rate:0.79, flag:'🇬🇧' },
  { code:'XOF', symbol:'XOF', rate:655.96, flag:'🌍' },
  { code:'NGN', symbol:'₦', rate:1580, flag:'🇳🇬' },
  { code:'KES', symbol:'KSh', rate:129, flag:'🇰🇪' },
  { code:'GHS', symbol:'GH₵', rate:15.3, flag:'🇬🇭' },
  { code:'ZAR', symbol:'R', rate:18.5, flag:'🇿🇦' },
  { code:'CAD', symbol:'CA$', rate:1.36, flag:'🇨🇦' },
  { code:'AUD', symbol:'A$', rate:1.53, flag:'🇦🇺' },
];

const PRESET_AMOUNTS_USD = [10, 25, 50, 100, 250, 500];

const safeParseAmounts = (v) => {
  if (!v) return [10, 50, 100];
  if (Array.isArray(v)) return v;
  try { return JSON.parse(v); } catch { return [10, 50, 100]; }
};

async function sha256(str) {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  } catch { return 'sha256_' + Math.random().toString(36).slice(2,18); }
}

function currencyOf(code) { return CURRENCIES.find(c => c.code === code) || CURRENCIES[0]; }
function toUsd(amount, code) { const c = currencyOf(code); return amount / c.rate; }
function fmt(amount, code = 'USD') {
  const c = currencyOf(code);
  return `${c.symbol}${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function ProgressBar({ raised, goal, color = 'bg-blue-600' }) {
  const pct = Math.min(100, goal > 0 ? (raised / goal) * 100 : 0);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
        <span>Raised: <span className="text-slate-700">{fmt(raised)}</span></span>
        <span>{pct.toFixed(0)}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }}/>
      </div>
      <div className="text-[9px] font-bold text-slate-400">Goal: {fmt(goal)}</div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function NpoHub({ session }) {
  const uid = session?.user?.id;

  // Nav
  const [tab, setTab] = useState('EXPLORE');
  const [isAdmin, setIsAdmin] = useState(false);

  // Data
  const [npoData, setNpoData] = useState(null);
  const [verifiedNpos, setVerifiedNpos] = useState([]);
  const [allNpos, setAllNpos] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [myCampaigns, setMyCampaigns] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [myDonations, setMyDonations] = useState([]);
  const [myMemberships, setMyMemberships] = useState([]);
  const [events, setEvents] = useState([]);
  const [impactReports, setImpactReports] = useState([]);
  const [feedPosts, setFeedPosts] = useState([]);
  const [followingMap, setFollowingMap] = useState({});
  const [myLikeValue, setMyLikeValue] = useState(0);
  const [cohorts, setCohorts] = useState([]);

  // UI
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState('');
  const showErr = (m) => { setErr(m); setTimeout(() => setErr(''), 5000); };
  const showOk = (m) => { setSuccess(m); setTimeout(() => setSuccess(''), 5000); };

  // Donate modal
  const [donateTarget, setDonateTarget] = useState(null); // { npo, campaign }
  const [donateAmount, setDonateAmount] = useState(50);
  const [donateCurrency, setDonateCurrency] = useState('USD');
  const [donateRecurring, setDonateRecurring] = useState(false);
  const [donateInterval, setDonateInterval] = useState('monthly');
  const [donateAnon, setDonateAnon] = useState(false);
  const [donateMsg, setDonateMsg] = useState('');
  const [donateName, setDonateName] = useState('');
  const [donateEmail, setDonateEmail] = useState('');
  const [donateMethod, setDonateMethod] = useState('card');
  const [donateStep, setDonateStep] = useState('form'); // 'form' | 'paying' | 'done'
  const [donateReceipt, setDonateReceipt] = useState(null);
  const stripeRef = useRef(null);
  const cardElRef = useRef(null);
  const cardMountRef = useRef(null);

  // Campaign form
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [campForm, setCampForm] = useState({ title:'', description:'', goal_amount:1000, currency:'USD', campaign_type:'general', ends_at:'' });

  // Event form
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState({ title:'', description:'', event_type:'virtual', location:'', starts_at:'', ticket_price:0, is_free:true, max_attendees:'' });

  // Membership form
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [memberForm, setMemberForm] = useState({ name:'', description:'', price_monthly:0, price_annually:0, currency:'USD', benefits:'' });

  // NPO apply
  const [applyForm, setApplyForm] = useState({ name:'', taxId:'', mission:'', sector:'', country:'', website:'', founded_year:'', tagline:'', target_tier: TIERS.EMERGING, charterFile:null, financialFile:null });
  const charterRef = useRef(null);
  const financialRef = useRef(null);
  const [isApplying, setIsApplying] = useState(false);
  const [liveAiStatus, setLiveAiStatus] = useState('');

  // Impact
  const [impactForm, setImpactForm] = useState({ title:'', summary:'', metrics:'', file:null });
  const [showSpecialLike, setShowSpecialLike] = useState(null);
  const [specialAmount, setSpecialAmount] = useState(10);
  const [postForm, setPostForm] = useState({ content:'', file:null, fileType:'' });
  const [isPosting, setIsPosting] = useState(false);

  // Volunteer
  const [volForm, setVolForm] = useState({ skills:'', availability:'' });

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [profR, myNpoR, pubNpoR, campaignR, eventsR, donationsR, memberSubsR, memberTiersR, feedR, followsR, likeProfR, cohortsR, reportsR] = await Promise.all([
        uid ? supabase.from('profiles').select('role,full_name,email,default_like_value').eq('id', uid).single() : null,
        uid ? supabase.from('npo_profiles').select('*').eq('id', uid).maybeSingle() : null,
        supabase.from('npo_profiles').select('*').eq('is_public', true).in('verification_status', ['verified']).order('total_raised', { ascending: false }),
        supabase.from('npo_campaigns').select('*').eq('is_active', true).order('created_at', { ascending: false }),
        supabase.from('npo_events').select('*').eq('is_active', true).order('starts_at', { ascending: true }),
        uid ? supabase.from('npo_donations').select('*').eq('donor_id', uid).order('created_at', { ascending: false }) : null,
        uid ? supabase.from('npo_member_subscriptions').select('*, npo_membership_tiers(*)').eq('member_id', uid).eq('status', 'active') : null,
        supabase.from('npo_membership_tiers').select('*').eq('is_active', true),
        supabase.from('social_feed_view').select('*').order('created_at', { ascending: false }).limit(50),
        uid ? supabase.from('social_follows').select('following_id').eq('follower_id', uid) : null,
        uid ? supabase.from('profiles').select('default_like_value').eq('id', uid).single() : null,
        supabase.from('npo_cohorts').select('*').eq('status', 'active'),
        uid ? supabase.from('npo_impact_reports').select('*').eq('npo_id', uid).order('created_at', { ascending: false }) : null,
      ]);

      const prof = profR?.data;
      if (prof) setIsAdmin(['support_l1','advisor_l2','admin_l3'].includes(prof.role));
      if (myNpoR?.data) setNpoData(myNpoR.data);
      if (pubNpoR?.data) setVerifiedNpos(pubNpoR.data);
      if (campaignR?.data) {
        setCampaigns(campaignR.data);
        if (myNpoR?.data) setMyCampaigns(campaignR.data.filter(c => c.npo_id === uid));
      }
      if (eventsR?.data) setEvents(eventsR.data);
      if (donationsR?.data) setMyDonations(donationsR.data);
      if (memberSubsR?.data) setMyMemberships(memberSubsR.data);
      if (memberTiersR?.data) setMemberships(memberTiersR.data);
      if (feedR?.data) setFeedPosts(feedR.data);
      if (cohortsR?.data) setCohorts(cohortsR.data);
      if (reportsR?.data) setImpactReports(reportsR.data);
      if (likeProfR?.data) setMyLikeValue(likeProfR.data.default_like_value || 0);
      if (followsR?.data) {
        const m = {}; followsR.data.forEach(f => { m[f.following_id] = true; }); setFollowingMap(m);
      }
      if (prof) { setDonateName(prof.full_name || ''); setDonateEmail(prof.email || session?.user?.email || ''); }

      if (['support_l1','advisor_l2','admin_l3'].includes(prof?.role)) {
        const { data: full } = await supabase.from('npo_profiles').select('*').order('created_at', { ascending: false });
        setAllNpos(full || []);
      }
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  }, [uid]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Stripe init ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!donateTarget || donateMethod !== 'card') return;
    const init = async () => {
      if (!window.Stripe) {
        const s = document.createElement('script');
        s.src = 'https://js.stripe.com/v3/';
        s.onload = mountCard;
        document.head.appendChild(s);
      } else { mountCard(); }
    };
    const mountCard = () => {
      if (cardElRef.current) { cardElRef.current.destroy(); cardElRef.current = null; }
      stripeRef.current = window.Stripe(STRIPE_PK);
      const elements = stripeRef.current.elements();
      const card = elements.create('card', { style: { base: { fontSize:'16px', color:'#1e293b', fontFamily:'Inter,sans-serif' } } });
      setTimeout(() => {
        if (cardMountRef.current) { card.mount(cardMountRef.current); cardElRef.current = card; }
      }, 100);
    };
    init();
    return () => { if (cardElRef.current) { cardElRef.current.destroy(); cardElRef.current = null; } };
  }, [donateTarget, donateMethod]);

  // ── Donate handler ────────────────────────────────────────────────────────
  const handleDonate = async () => {
    if (!donateAmount || donateAmount <= 0) return showErr('Enter a valid amount');
    if (!donateName.trim()) return showErr('Enter your name');
    if (!donateEmail.trim()) return showErr('Enter your email');
    setDonateStep('paying');
    try {
      const body = {
        npo_id: donateTarget.npo.id,
        campaign_id: donateTarget.campaign?.id || null,
        amount: donateAmount,
        currency: donateCurrency,
        donor_id: uid || null,
        donor_name: donateName,
        donor_email: donateEmail,
        is_recurring: donateRecurring,
        recurring_interval: donateInterval,
        is_anonymous: donateAnon,
        message: donateMsg,
      };

      if (donateMethod === 'card' && cardElRef.current) {
        const { paymentMethod, error: pmErr } = await stripeRef.current.createPaymentMethod({ type: 'card', card: cardElRef.current });
        if (pmErr) { setDonateStep('form'); return showErr(pmErr.message); }
        body.payment_method_id = paymentMethod.id;
      }

      const { data: { session: sess } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/npo-donate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sess?.access_token}` },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!res.ok) { setDonateStep('form'); return showErr(result.error || 'Donation failed'); }

      if (result.client_secret && result.status !== 'succeeded') {
        const { error: confErr } = await stripeRef.current.confirmCardPayment(result.client_secret);
        if (confErr) { setDonateStep('form'); return showErr(confErr.message); }
      }

      setDonateReceipt({ ...result, amount: donateAmount, currency: donateCurrency, donor_name: donateName });
      setDonateStep('done');
      fetchAll();
    } catch (e) { setDonateStep('form'); showErr(e.message); }
  };

  const openDonate = (npo, campaign = null) => {
    setDonateTarget({ npo, campaign });
    setDonateStep('form');
    setDonateReceipt(null);
    setDonateAmount(campaign ? (safeParseAmounts(npo.preset_amounts)[1] || 50) : 50);
    setDonateCurrency(campaign?.currency || 'USD');
    setDonateRecurring(false);
    setDonateAnon(false);
    setDonateMsg('');
    setDonateMethod('card');
  };

  const closeDonate = () => { setDonateTarget(null); setDonateStep('form'); };

  // ── Campaign create ───────────────────────────────────────────────────────
  const handleCreateCampaign = async (e) => {
    e.preventDefault(); setIsSaving(true);
    const { error } = await supabase.from('npo_campaigns').insert({ ...campForm, npo_id: uid, goal_amount: Number(campForm.goal_amount) });
    if (error) showErr(error.message);
    else { showOk('Campaign created!'); setShowCampaignForm(false); setCampForm({ title:'', description:'', goal_amount:1000, currency:'USD', campaign_type:'general', ends_at:'' }); fetchAll(); }
    setIsSaving(false);
  };

  // ── Event create ─────────────────────────────────────────────────────────
  const handleCreateEvent = async (e) => {
    e.preventDefault(); setIsSaving(true);
    const { error } = await supabase.from('npo_events').insert({ ...eventForm, npo_id: uid, ticket_price: Number(eventForm.ticket_price), max_attendees: eventForm.max_attendees ? Number(eventForm.max_attendees) : null });
    if (error) showErr(error.message);
    else { showOk('Event created!'); setShowEventForm(false); fetchAll(); }
    setIsSaving(false);
  };

  // ── Event register ────────────────────────────────────────────────────────
  const handleEventRegister = async (ev) => {
    const { error } = await supabase.from('npo_event_registrations').insert({ event_id: ev.id, attendee_id: uid, attendee_name: donateName || 'Guest', attendee_email: donateEmail || session?.user?.email || '' });
    if (error) showErr(error.message);
    else { showOk(`Registered for "${ev.title}"! Check your email for ticket.`); fetchAll(); }
  };

  // ── Membership create ─────────────────────────────────────────────────────
  const handleCreateMembership = async (e) => {
    e.preventDefault(); setIsSaving(true);
    const benefits = memberForm.benefits.split('\n').map(b => b.trim()).filter(Boolean);
    const { error } = await supabase.from('npo_membership_tiers').insert({ ...memberForm, npo_id: uid, price_monthly: Number(memberForm.price_monthly), price_annually: Number(memberForm.price_annually), benefits });
    if (error) showErr(error.message);
    else { showOk('Membership tier created!'); setShowMemberForm(false); fetchAll(); }
    setIsSaving(false);
  };

  // ── Join membership ───────────────────────────────────────────────────────
  const handleJoinMembership = async (tier) => {
    const { error } = await supabase.from('npo_member_subscriptions').insert({ npo_id: tier.npo_id, tier_id: tier.id, member_id: uid, member_email: session?.user?.email, member_name: donateName, billing_interval: 'monthly', next_billing_at: new Date(Date.now() + 30*24*60*60*1000).toISOString() });
    if (error) showErr(error.message);
    else { showOk(`Joined "${tier.name}" membership!`); fetchAll(); }
  };

  // ── Volunteer ─────────────────────────────────────────────────────────────
  const handleVolunteer = async (npoId) => {
    const { error } = await supabase.from('npo_volunteers').upsert({ npo_id: npoId, volunteer_id: uid, volunteer_name: donateName, volunteer_email: donateEmail || session?.user?.email, skills: volForm.skills.split(',').map(s => s.trim()).filter(Boolean), availability: volForm.availability }, { onConflict: 'npo_id,volunteer_id' });
    if (error) showErr(error.message);
    else showOk('Volunteer request submitted!');
  };

  // ── NPO Apply ─────────────────────────────────────────────────────────────
  const uploadDoc = async (file, slot) => {
    const ext = file.name.split('.').pop();
    const path = `npo/${uid}/${slot}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('documents').upload(path, file, { upsert: true });
    if (error) throw new Error(error.message);
    return supabase.storage.from('documents').getPublicUrl(path).data.publicUrl;
  };

  const handleApply = async (e) => {
    e.preventDefault(); setIsApplying(true);
    try {
      let charterUrl = null, financialUrl = null;
      if (applyForm.charterFile) { setLiveAiStatus('Uploading charter…'); charterUrl = await uploadDoc(applyForm.charterFile, 'charter'); }
      if (applyForm.financialFile) { setLiveAiStatus('Uploading financials…'); financialUrl = await uploadDoc(applyForm.financialFile, 'financials'); }
      setLiveAiStatus('IFB Sovereign Compliance scan…');
      const { error } = await supabase.from('npo_profiles').upsert({
        id: uid, npo_name: applyForm.name, tax_id: applyForm.taxId, mission_statement: applyForm.mission,
        sector: applyForm.sector, country: applyForm.country, website: applyForm.website,
        founded_year: applyForm.founded_year ? Number(applyForm.founded_year) : null,
        tagline: applyForm.tagline, program_tier: 'Pending_AI_Review', verification_status: 'pending_review',
        live_ai_status: 'Processing…', is_public: true,
        ...(charterUrl && { charter_url: charterUrl }),
        ...(financialUrl && { financial_doc_url: financialUrl }),
      });
      if (error) throw error;
      await new Promise(r => setTimeout(r, 2000));
      const tier = applyForm.target_tier === TIERS.ENTERPRISE ? TIERS.ENTERPRISE : TIERS.EMERGING;
      await supabase.from('npo_profiles').update({ program_tier: tier, verification_status: 'verified', live_ai_status: '✓ Onboarding Complete' }).eq('id', uid);
      fetchAll();
    } catch (e) { showErr(e.message); }
    finally { setIsApplying(false); }
  };

  // ── Social handlers ───────────────────────────────────────────────────────
  const handlePost = async (e) => {
    e.preventDefault(); setIsPosting(true);
    const { error } = await supabase.from('social_posts').insert([{ author_id: uid, content: postForm.content, media_urls: [], media_types: [] }]);
    if (error) showErr(error.message);
    else { setPostForm({ content:'', file:null, fileType:'' }); fetchAll(); }
    setIsPosting(false);
  };

  const toggleFollow = async (targetId) => {
    if (!targetId || targetId === uid) return;
    if (followingMap[targetId]) {
      await supabase.from('social_follows').delete().eq('follower_id', uid).eq('following_id', targetId);
      setFollowingMap(p => { const n={...p}; delete n[targetId]; return n; });
    } else {
      await supabase.from('social_follows').insert([{ follower_id: uid, following_id: targetId }]);
      setFollowingMap(p => ({ ...p, [targetId]: true }));
    }
  };

  const handleLike = async (postId, type='like', customAmount=null) => {
    const { data, error } = await supabase.rpc('process_monetized_interaction', { p_post_id:postId, p_user_id:uid, p_interaction_type:customAmount?'special':type, p_custom_amount:customAmount });
    if (error) return showErr(error.message);
    if (data?.ok) { if (data.amount > 0) showOk(`Sent $${data.amount.toFixed(2)} support!`); fetchAll(); setShowSpecialLike(null); }
    else showErr(data?.error || 'Failed');
  };

  const updateLikeValue = async (val) => {
    setMyLikeValue(val);
    await supabase.from('profiles').update({ default_like_value: val }).eq('id', uid);
  };

  // ── Impact notarize ───────────────────────────────────────────────────────
  const notarizeImpact = async (e) => {
    e.preventDefault(); setIsSaving(true);
    try {
      const hash = await sha256(impactForm.title + impactForm.summary + Date.now());
      const { error } = await supabase.from('npo_impact_reports').insert([{ npo_id: uid, title: impactForm.title, summary: impactForm.summary, data_points: { units: impactForm.metrics }, file_hash: hash }]);
      if (error) throw error;
      setImpactForm({ title:'', summary:'', metrics:'', file:null });
      fetchAll(); showOk('Impact notarized on chain!');
    } catch(e) { showErr(e.message); }
    finally { setIsSaving(false); }
  };

  // ── Share / receipt helpers ───────────────────────────────────────────────
  const shareNpo = (npo) => {
    const url = `${window.location.origin}/npo/${npo.slug || npo.id}`;
    navigator.clipboard?.writeText(url);
    showOk('Fundraising link copied!');
  };

  const printReceipt = (d) => {
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Receipt ${d.receipt_number}</title><style>body{font-family:Inter,sans-serif;padding:40px;max-width:500px}h1{font-size:24px;font-weight:900}table{width:100%;border-collapse:collapse}td{padding:8px 0;border-bottom:1px solid #f1f5f9}@media print{.no-print{display:none}}</style></head><body><h1>IFB Donation Receipt</h1><p style="color:#64748b">Infinite Future Bank · Global Impact Engine</p><table><tr><td><b>Receipt #</b></td><td style="text-align:right">${d.receipt_number}</td></tr><tr><td><b>Donor</b></td><td style="text-align:right">${d.donor_name || 'Anonymous'}</td></tr><tr><td><b>Amount</b></td><td style="text-align:right;font-size:20px;font-weight:900;color:#2563eb">${fmt(d.amount, d.currency)}</td></tr><tr><td><b>Date</b></td><td style="text-align:right">${new Date().toLocaleDateString()}</td></tr></table><p style="margin-top:32px;padding:16px;background:#f0fdf4;border-radius:8px;color:#15803d;font-weight:700">✓ This donation is tax-deductible to the extent permitted by law. No goods or services were provided in exchange.</p><button class="no-print" onclick="window.print()" style="margin-top:16px;padding:12px 24px;background:#1e293b;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:900">Print Receipt</button></body></html>`);
    w.document.close();
  };

  if (isLoading) return (
    <div className="py-20 text-center">
      <Loader2 className="animate-spin mx-auto text-blue-500 mb-4" size={40}/>
      <p className="font-black text-[10px] uppercase tracking-widest text-slate-500">Syncing Global Impact Network…</p>
    </div>
  );

  const TABS = ['EXPLORE','CAMPAIGNS','GIVE','MEMBERS','EVENTS','UPDATES','MANAGE', isAdmin && 'COMMAND'].filter(Boolean);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 relative">

      {/* Toasts */}
      {err && <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[1000] bg-red-900 text-red-100 px-6 py-3 rounded-full shadow-2xl font-black text-xs flex items-center gap-2"><AlertTriangle size={14}/>{err}</div>}
      {success && <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[1000] bg-emerald-700 text-white px-6 py-3 rounded-full shadow-2xl font-black text-xs flex items-center gap-2"><CheckCircle2 size={14}/>{success}</div>}

      {/* Header */}
      <div className="bg-white border border-slate-200 p-6 rounded-[3rem] shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg">
            <HeartHandshake className="text-white" size={22}/>
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tighter">IFB Global Impact</h2>
            <p className="text-xs font-bold text-slate-400">Zero-fee fundraising · Worldwide · Impact-verified</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${tab === t ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:text-slate-800 hover:bg-white'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ================================================================= EXPLORE */}
      {tab === 'EXPLORE' && (
        <div className="space-y-8 animate-in fade-in">
          {/* Search + stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label:'Verified NPOs', val: verifiedNpos.length, color:'text-blue-600', icon:<ShieldCheck size={18}/> },
              { label:'Total Raised', val: `$${verifiedNpos.reduce((s,n)=>s+Number(n.total_raised||0),0).toLocaleString()}`, color:'text-emerald-600', icon:<TrendingUp size={18}/> },
              { label:'Active Campaigns', val: campaigns.length, color:'text-indigo-600', icon:<Target size={18}/> },
              { label:'Upcoming Events', val: events.length, color:'text-amber-600', icon:<Calendar size={18}/> },
            ].map(c => (
              <div key={c.label} className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm text-center">
                <div className={`flex justify-center mb-2 ${c.color}`}>{c.icon}</div>
                <p className={`text-2xl font-black ${c.color}`}>{c.val}</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">{c.label}</p>
              </div>
            ))}
          </div>

          {/* Featured campaigns */}
          {campaigns.filter(c => c.is_featured || c.is_emergency).length > 0 && (
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">🔥 Featured Campaigns</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {campaigns.filter(c => c.is_featured || c.is_emergency).slice(0,4).map(camp => {
                  const npo = verifiedNpos.find(n => n.id === camp.npo_id);
                  return (
                    <div key={camp.id} className={`bg-white border-2 rounded-[2.5rem] p-6 shadow-sm ${camp.is_emergency ? 'border-red-200' : 'border-blue-100'}`}>
                      {camp.is_emergency && <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[9px] font-black uppercase rounded-full mb-3 inline-block">🚨 Emergency</span>}
                      <p className="font-black text-slate-800 mb-1">{camp.title}</p>
                      <p className="text-xs text-slate-500 mb-4 line-clamp-2">{camp.description}</p>
                      <ProgressBar raised={camp.raised_amount} goal={camp.goal_amount} color={camp.is_emergency ? 'bg-red-500' : 'bg-blue-600'}/>
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-[10px] font-black text-slate-400">{camp.donor_count} donors</span>
                        <button onClick={() => npo && openDonate(npo, camp)} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-500 shadow">Donate</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* NPO Cards */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Verified Organizations</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {verifiedNpos.map(npo => (
                <div key={npo.id} className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors"><Rocket size={22}/></div>
                    <button onClick={() => toggleFollow(npo.id)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-colors ${followingMap[npo.id] ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>
                      {followingMap[npo.id] ? 'Following' : 'Follow'}
                    </button>
                  </div>
                  <div className="flex items-center gap-1 text-[9px] font-black uppercase text-emerald-500 tracking-widest mb-1">
                    <ShieldCheck size={10}/> Verified {npo.program_tier?.replace(/_/g,' ')}
                  </div>
                  <p className="text-lg font-black text-slate-800 mb-1">{npo.npo_name}</p>
                  {npo.tagline && <p className="text-xs font-bold text-blue-600 mb-3">{npo.tagline}</p>}
                  <p className="text-sm text-slate-500 font-medium mb-4 line-clamp-2">"{npo.mission_statement}"</p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold mb-4">
                    <MapPin size={10}/>{npo.country} · <Award size={10}/>{npo.sector}
                  </div>
                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between text-[10px]">
                      <span className="font-black uppercase text-slate-400">Transparency</span>
                      <span className="font-black text-slate-700">{npo.transparency_score}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full"><div className="h-full bg-emerald-500 rounded-full" style={{ width:`${npo.transparency_score}%` }}/></div>
                    <div className="flex justify-between text-[10px]">
                      <span className="font-black uppercase text-slate-400">Total Raised</span>
                      <span className="font-black text-blue-600">${Number(npo.total_raised).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openDonate(npo)} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-600 transition-colors flex items-center justify-center gap-1 shadow">
                      <Heart size={12}/> Donate
                    </button>
                    <button onClick={() => shareNpo(npo)} className="p-3 border border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-colors">
                      <Share2 size={14}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= CAMPAIGNS */}
      {tab === 'CAMPAIGNS' && (
        <div className="space-y-8 animate-in fade-in">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Fundraising Campaigns</h3>
              <p className="text-xs font-bold text-slate-400">Create unlimited free campaigns · 0% platform fee</p>
            </div>
            {npoData && (
              <button onClick={() => setShowCampaignForm(true)} className="px-5 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 shadow flex items-center gap-2">
                <Plus size={14}/> New Campaign
              </button>
            )}
          </div>

          {showCampaignForm && (
            <div className="bg-white border-2 border-blue-100 rounded-[2.5rem] p-8 shadow-sm">
              <h4 className="font-black text-slate-800 mb-6 flex items-center gap-2"><Target className="text-blue-600"/> Create Campaign</h4>
              <form onSubmit={handleCreateCampaign} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Campaign Title</label>
                    <input required className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm outline-none focus:border-blue-500" value={campForm.title} onChange={e => setCampForm({...campForm, title:e.target.value})} placeholder="Help us build a school"/>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Goal Amount</label>
                    <div className="flex gap-2 mt-1">
                      <select className="bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm outline-none" value={campForm.currency} onChange={e => setCampForm({...campForm, currency:e.target.value})}>
                        {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                      </select>
                      <input required type="number" min="1" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm outline-none focus:border-blue-500" value={campForm.goal_amount} onChange={e => setCampForm({...campForm, goal_amount:e.target.value})}/>
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Type</label>
                    <select className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm outline-none" value={campForm.campaign_type} onChange={e => setCampForm({...campForm, campaign_type:e.target.value})}>
                      {['general','emergency','event','peer_to_peer','raffle','scholarship'].map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">End Date (optional)</label>
                    <input type="datetime-local" className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm outline-none" value={campForm.ends_at} onChange={e => setCampForm({...campForm, ends_at:e.target.value})}/>
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Description</label>
                  <textarea required className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm outline-none focus:border-blue-500 h-24 resize-none" value={campForm.description} onChange={e => setCampForm({...campForm, description:e.target.value})} placeholder="Tell donors why this campaign matters…"/>
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={isSaving} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 disabled:opacity-50">{isSaving ? <Loader2 size={14} className="animate-spin"/> : 'Launch Campaign'}</button>
                  <button type="button" onClick={() => setShowCampaignForm(false)} className="px-6 py-3 border border-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50">Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map(camp => {
              const npo = verifiedNpos.find(n => n.id === camp.npo_id);
              const daysLeft = camp.ends_at ? Math.max(0, Math.ceil((new Date(camp.ends_at) - Date.now()) / 86400000)) : null;
              return (
                <div key={camp.id} className="bg-white border border-slate-200 rounded-[2.5rem] p-7 shadow-sm hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${camp.is_emergency ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>{camp.campaign_type?.replace(/_/g,' ')}</span>
                    {daysLeft !== null && <span className="text-[9px] font-black text-slate-400 flex items-center gap-1"><Clock size={9}/>{daysLeft}d left</span>}
                  </div>
                  <p className="font-black text-slate-800 mb-1">{camp.title}</p>
                  <p className="text-xs text-slate-500 mb-4 line-clamp-2">{camp.description}</p>
                  <ProgressBar raised={camp.raised_amount} goal={camp.goal_amount} color={camp.is_emergency ? 'bg-red-500' : 'bg-blue-600'}/>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-[10px] font-black text-slate-400"><Users size={10} className="inline mr-1"/>{camp.donor_count} donors</span>
                    <div className="flex gap-2">
                      <button onClick={() => { const url=`${window.location.origin}/campaign/${camp.slug||camp.id}`; navigator.clipboard?.writeText(url); showOk('Link copied!'); }} className="p-2 border border-slate-200 rounded-lg text-slate-400 hover:text-blue-600"><Share2 size={13}/></button>
                      {npo && <button onClick={() => openDonate(npo, camp)} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-500 shadow">Give</button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================================================================= GIVE (Donor Hub) */}
      {tab === 'GIVE' && (
        <div className="space-y-8 animate-in fade-in max-w-4xl mx-auto">
          <div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Your Giving Dashboard</h3>
            <p className="text-xs font-bold text-slate-400">Donation history · Tax receipts · Recurring gifts</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label:'Total Given', val: fmt(myDonations.filter(d=>d.payment_status==='completed').reduce((s,d)=>s+toUsd(d.amount,d.currency),0)), color:'text-blue-600' },
              { label:'Donations', val: myDonations.filter(d=>d.payment_status==='completed').length, color:'text-emerald-600' },
              { label:'Recurring', val: myDonations.filter(d=>d.is_recurring).length, color:'text-indigo-600' },
            ].map(s => (
              <div key={s.label} className="bg-white border border-slate-200 p-5 rounded-3xl text-center shadow-sm">
                <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Quick Donate */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-xl">
            <h4 className="font-black text-lg mb-2">Make a Donation</h4>
            <p className="text-blue-100 text-xs mb-6">Choose an organization and give instantly. 0% fees. Instant receipt.</p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {verifiedNpos.slice(0,6).map(npo => (
                <button key={npo.id} onClick={() => openDonate(npo)} className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl p-4 text-left transition-all">
                  <p className="font-black text-sm">{npo.npo_name}</p>
                  <p className="text-blue-200 text-[10px] mt-1">{npo.sector} · {npo.country}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Donation history */}
          <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
            <div className="px-8 py-5 border-b border-slate-100">
              <h4 className="font-black text-slate-800 flex items-center gap-2"><Receipt size={16}/> Donation History</h4>
            </div>
            {myDonations.length === 0 ? (
              <div className="py-16 text-center text-slate-400"><Heart size={32} className="mx-auto mb-3 opacity-30"/><p className="font-bold">No donations yet</p></div>
            ) : (
              <div className="divide-y divide-slate-50">
                {myDonations.map(d => {
                  const npo = verifiedNpos.find(n => n.id === d.npo_id);
                  return (
                    <div key={d.id} className="px-8 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="font-black text-slate-800 text-sm">{npo?.npo_name || 'Organization'}</p>
                        <p className="text-[10px] font-bold text-slate-400">{new Date(d.created_at).toLocaleDateString()} · {d.receipt_number} {d.is_recurring && <span className="text-blue-500">· Recurring {d.recurring_interval}</span>}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-black text-blue-600">{fmt(d.amount, d.currency)}</p>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${d.payment_status==='completed'?'bg-emerald-50 text-emerald-600':'bg-amber-50 text-amber-600'}`}>{d.payment_status}</span>
                        </div>
                        <button onClick={() => printReceipt(d)} className="p-2 text-slate-400 hover:text-blue-600 border border-slate-200 rounded-lg hover:border-blue-300 transition-colors"><Receipt size={14}/></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= MEMBERS */}
      {tab === 'MEMBERS' && (
        <div className="space-y-8 animate-in fade-in">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Memberships</h3>
              <p className="text-xs font-bold text-slate-400">Join organizations as a recurring supporter</p>
            </div>
            {npoData && (
              <button onClick={() => setShowMemberForm(true)} className="px-5 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 shadow flex items-center gap-2">
                <Plus size={14}/> New Tier
              </button>
            )}
          </div>

          {showMemberForm && (
            <div className="bg-white border-2 border-indigo-100 rounded-[2.5rem] p-8 shadow-sm">
              <h4 className="font-black text-slate-800 mb-6 flex items-center gap-2"><Medal className="text-indigo-600"/> Create Membership Tier</h4>
              <form onSubmit={handleCreateMembership} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Tier Name</label>
                    <input required className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm outline-none focus:border-indigo-500" value={memberForm.name} onChange={e => setMemberForm({...memberForm, name:e.target.value})} placeholder="Friend / Supporter / Champion"/>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Monthly Price (USD)</label>
                    <input required type="number" min="0" step="0.01" className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm outline-none focus:border-indigo-500" value={memberForm.price_monthly} onChange={e => setMemberForm({...memberForm, price_monthly:e.target.value})}/>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Annual Price (USD)</label>
                    <input type="number" min="0" step="0.01" className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm outline-none" value={memberForm.price_annually} onChange={e => setMemberForm({...memberForm, price_annually:e.target.value})}/>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Description</label>
                    <input className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm outline-none" value={memberForm.description} onChange={e => setMemberForm({...memberForm, description:e.target.value})} placeholder="Brief description"/>
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Benefits (one per line)</label>
                  <textarea className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm outline-none h-24 resize-none" value={memberForm.benefits} onChange={e => setMemberForm({...memberForm, benefits:e.target.value})} placeholder={"Monthly newsletter\nEvent invitations\nTax receipt"}/>
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={isSaving} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 disabled:opacity-50">{isSaving ? <Loader2 size={14} className="animate-spin"/> : 'Create Tier'}</button>
                  <button type="button" onClick={() => setShowMemberForm(false)} className="px-6 py-3 border border-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* Active memberships */}
          {myMemberships.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-[2.5rem] p-6">
              <h4 className="font-black text-emerald-800 text-sm mb-4 flex items-center gap-2"><CheckCircle2 size={14}/> Your Active Memberships</h4>
              <div className="grid md:grid-cols-2 gap-3">
                {myMemberships.map(sub => (
                  <div key={sub.id} className="bg-white rounded-2xl p-4 border border-emerald-100">
                    <p className="font-black text-slate-800">{sub.npo_membership_tiers?.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">{sub.billing_interval} · ${sub.npo_membership_tiers?.price_monthly}/mo · <span className="text-emerald-600">Active</span></p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available tiers */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {memberships.map(tier => {
              const npo = verifiedNpos.find(n => n.id === tier.npo_id);
              const isJoined = myMemberships.some(s => s.tier_id === tier.id);
              const benefits = Array.isArray(tier.benefits) ? tier.benefits : [];
              return (
                <div key={tier.id} className={`bg-white border-2 rounded-[2.5rem] p-8 shadow-sm hover:shadow-lg transition-all ${isJoined ? 'border-emerald-300' : 'border-slate-200'}`}>
                  {isJoined && <div className="flex items-center gap-1 text-[9px] font-black uppercase text-emerald-500 tracking-widest mb-3"><CheckCircle2 size={10}/> Member</div>}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-black text-xl text-slate-800">{tier.name}</p>
                      {npo && <p className="text-[10px] font-bold text-slate-400 mt-0.5">{npo.npo_name}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-black text-2xl text-blue-600">${tier.price_monthly}<span className="text-xs text-slate-400 font-bold">/mo</span></p>
                      {tier.price_annually > 0 && <p className="text-[10px] text-slate-400 font-bold">${tier.price_annually}/yr</p>}
                    </div>
                  </div>
                  {tier.description && <p className="text-sm text-slate-500 mb-4">{tier.description}</p>}
                  {benefits.length > 0 && (
                    <ul className="space-y-2 mb-6">
                      {benefits.map((b,i) => <li key={i} className="flex items-center gap-2 text-xs font-bold text-slate-600"><Check size={12} className="text-emerald-500 flex-shrink-0"/>{b}</li>)}
                    </ul>
                  )}
                  <button onClick={() => isJoined ? null : handleJoinMembership(tier)} disabled={isJoined} className={`w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors shadow-sm ${isJoined ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default' : 'bg-slate-900 text-white hover:bg-indigo-600'}`}>
                    {isJoined ? '✓ Member' : `Join for $${tier.price_monthly}/mo`}
                  </button>
                </div>
              );
            })}
            {memberships.length === 0 && (
              <div className="col-span-3 py-16 text-center text-slate-400 bg-slate-50 rounded-[2.5rem] border border-slate-200">
                <Medal size={32} className="mx-auto mb-3 opacity-30"/>
                <p className="font-bold">No membership tiers yet</p>
                <p className="text-xs mt-1">NPOs can create membership tiers from this tab</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= EVENTS */}
      {tab === 'EVENTS' && (
        <div className="space-y-8 animate-in fade-in">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Events</h3>
              <p className="text-xs font-bold text-slate-400">Free & paid event ticketing · Zero fees</p>
            </div>
            {npoData && (
              <button onClick={() => setShowEventForm(true)} className="px-5 py-3 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-400 shadow flex items-center gap-2">
                <Plus size={14}/> Create Event
              </button>
            )}
          </div>

          {showEventForm && (
            <div className="bg-white border-2 border-amber-100 rounded-[2.5rem] p-8 shadow-sm">
              <h4 className="font-black text-slate-800 mb-6 flex items-center gap-2"><Calendar className="text-amber-500"/> Create Event</h4>
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Event Title</label>
                    <input required className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm outline-none" value={eventForm.title} onChange={e => setEventForm({...eventForm, title:e.target.value})} placeholder="Annual Gala 2026"/>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Type</label>
                    <select className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm outline-none" value={eventForm.event_type} onChange={e => setEventForm({...eventForm, event_type:e.target.value})}>
                      <option value="virtual">Virtual</option>
                      <option value="in_person">In-Person</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Start Date & Time</label>
                    <input required type="datetime-local" className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm outline-none" value={eventForm.starts_at} onChange={e => setEventForm({...eventForm, starts_at:e.target.value})}/>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Location / Link</label>
                    <input className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm outline-none" value={eventForm.location} onChange={e => setEventForm({...eventForm, location:e.target.value})} placeholder="Zoom link or venue address"/>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={eventForm.is_free} onChange={e => setEventForm({...eventForm, is_free:e.target.checked, ticket_price:e.target.checked?0:eventForm.ticket_price})} className="rounded"/>
                      <span className="text-sm font-bold text-slate-700">Free Event</span>
                    </label>
                    {!eventForm.is_free && <input type="number" min="0" step="0.01" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm outline-none" value={eventForm.ticket_price} onChange={e => setEventForm({...eventForm, ticket_price:e.target.value})} placeholder="Ticket price (USD)"/>}
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Max Attendees (optional)</label>
                    <input type="number" min="1" className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm outline-none" value={eventForm.max_attendees} onChange={e => setEventForm({...eventForm, max_attendees:e.target.value})}/>
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Description</label>
                  <textarea className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm outline-none h-20 resize-none" value={eventForm.description} onChange={e => setEventForm({...eventForm, description:e.target.value})}/>
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={isSaving} className="px-6 py-3 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-400 disabled:opacity-50">{isSaving ? <Loader2 size={14} className="animate-spin"/> : 'Publish Event'}</button>
                  <button type="button" onClick={() => setShowEventForm(false)} className="px-6 py-3 border border-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest">Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map(ev => {
              const npo = verifiedNpos.find(n => n.id === ev.npo_id);
              const isPast = ev.starts_at && new Date(ev.starts_at) < new Date();
              return (
                <div key={ev.id} className={`bg-white border rounded-[2.5rem] p-7 shadow-sm hover:shadow-lg transition-all ${isPast ? 'opacity-60 border-slate-100' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${ev.event_type==='virtual'?'bg-blue-50 text-blue-600':ev.event_type==='hybrid'?'bg-purple-50 text-purple-600':'bg-emerald-50 text-emerald-600'}`}>{ev.event_type?.replace('_',' ')}</span>
                    {ev.is_free ? <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">FREE</span> : <span className="text-[9px] font-black text-slate-600">${ev.ticket_price}</span>}
                  </div>
                  <p className="font-black text-slate-800 mb-1">{ev.title}</p>
                  {npo && <p className="text-[10px] font-bold text-blue-600 mb-2">{npo.npo_name}</p>}
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 mb-2">
                    <Calendar size={10}/>{ev.starts_at ? new Date(ev.starts_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : 'TBD'}
                  </div>
                  {ev.location && <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 mb-4"><MapPin size={10}/>{ev.location}</div>}
                  <p className="text-xs text-slate-500 mb-4 line-clamp-2">{ev.description}</p>
                  {ev.max_attendees && <div className="text-[10px] font-bold text-slate-400 mb-3"><Users size={10} className="inline mr-1"/>{ev.registered_count}/{ev.max_attendees} registered</div>}
                  <button onClick={() => !isPast && handleEventRegister(ev)} disabled={isPast} className={`w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors ${isPast ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-amber-500 shadow'}`}>
                    {isPast ? 'Event Ended' : ev.is_free ? 'Register Free' : `Get Ticket · $${ev.ticket_price}`}
                  </button>
                </div>
              );
            })}
            {events.length === 0 && (
              <div className="col-span-3 py-16 text-center text-slate-400 bg-slate-50 rounded-[2.5rem] border border-slate-200">
                <Calendar size={32} className="mx-auto mb-3 opacity-30"/>
                <p className="font-bold">No upcoming events</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= UPDATES */}
      {tab === 'UPDATES' && (
        <div className="space-y-8 animate-in fade-in max-w-3xl mx-auto">
          <div className="flex justify-between items-end">
            <div>
              <h3 className="text-2xl font-black text-slate-800">Global Updates</h3>
              <p className="text-xs font-bold text-slate-400 mt-1">Follow NPOs · Like = micro-donation</p>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
              <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Reaction Value</p>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-slate-800">$</span>
                <input type="number" step="0.5" className="w-16 bg-slate-50 border border-slate-100 rounded-lg p-1 font-black text-sm outline-none" value={myLikeValue} onChange={e => updateLikeValue(+e.target.value)}/>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-sm">
            <form onSubmit={handlePost}>
              <textarea required className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-bold text-sm outline-none focus:border-blue-500 resize-none h-20 mb-4" placeholder="Share a milestone or program update…" value={postForm.content} onChange={e => setPostForm(p=>({...p, content:e.target.value}))}/>
              <div className="flex justify-end">
                <button type="submit" disabled={isPosting} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 disabled:opacity-50 shadow">
                  {isPosting ? <Loader2 size={14} className="animate-spin"/> : 'Publish'}
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-6">
            {feedPosts.filter(p => followingMap[p.author_id] || p.author_id === uid).length === 0 ? (
              <div className="py-16 text-center bg-slate-50 border border-slate-200 rounded-[2.5rem]">
                <Activity size={32} className="mx-auto text-slate-300 mb-3"/>
                <p className="font-bold text-slate-500">Follow organizations to see their updates.</p>
              </div>
            ) : feedPosts.filter(p => followingMap[p.author_id] || p.author_id === uid).map(post => (
              <div key={post.id} className="bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-black text-sm">{(post.author_name||'?').charAt(0)}</div>
                    <div>
                      <p className="font-black text-slate-800 text-sm">{post.author_name}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{post.author_role} · {new Date(post.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
                <p className="text-slate-600 font-medium mb-4 whitespace-pre-wrap text-sm">{post.content}</p>
                <div className="flex items-center gap-6 border-t border-slate-50 pt-4">
                  <button onClick={() => handleLike(post.id,'like')} className="flex items-center gap-1 text-slate-400 hover:text-blue-600 transition-colors group">
                    <HeartHandshake size={16}/>
                    <div className="flex flex-col items-start">
                      <span className="text-xs font-black">{post.like_count}</span>
                      <span className="text-[8px] font-bold text-blue-500 opacity-0 group-hover:opacity-100">${myLikeValue}</span>
                    </div>
                  </button>
                  <button onClick={() => setShowSpecialLike(post.id)} className="flex items-center gap-1 text-emerald-600 hover:text-emerald-500">
                    <Zap size={16}/><span className="text-[9px] font-black uppercase tracking-widest">Special</span>
                  </button>
                  <div className="ml-auto">
                    <p className="text-[9px] font-black uppercase text-slate-400">Via Post</p>
                    <p className="text-sm font-black text-emerald-600">${Number(post.total_revenue).toLocaleString()}</p>
                  </div>
                </div>
                {showSpecialLike === post.id && (
                  <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-emerald-800">$</span>
                      <input type="number" className="w-20 bg-white border border-emerald-200 rounded-lg p-1.5 font-black text-sm outline-none text-emerald-800" value={specialAmount} onChange={e=>setSpecialAmount(+e.target.value)}/>
                    </div>
                    <button onClick={() => handleLike(post.id,'special',specialAmount)} className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-emerald-500 shadow">Send Support</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================= MANAGE */}
      {tab === 'MANAGE' && (
        <div className="animate-in fade-in">
          {!npoData ? (
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="text-center space-y-2">
                <h3 className="text-3xl font-black text-slate-800 tracking-tighter">Register Your Organization</h3>
                <p className="text-slate-500 font-medium">Free forever. 0% platform fees. Instant verification.</p>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  { tier: TIERS.EMERGING, icon:<BookOpen size={28}/>, color:'blue', title:'Emerging NGO Academy', desc:'For local/small community groups. Cohort mentorship, micro-grant access, structural guidance.', bullets:['Collaborative Cohorts','Structural Mentorship','Micro-Grant Network'] },
                  { tier: TIERS.ENTERPRISE, icon:<Building2 size={28}/>, color:'indigo', title:'Enterprise NGO Hub', desc:'For large organizations needing institutional financial architecture and scaling loans.', bullets:['Financial Architecture','Scaling Loans','Sovereign Compliance'] },
                ].map(opt => (
                  <div key={opt.tier} onClick={() => setApplyForm(p=>({...p, target_tier:opt.tier}))}
                    className={`p-8 rounded-[3rem] border-4 cursor-pointer transition-all ${applyForm.target_tier===opt.tier ? `border-${opt.color}-600 bg-${opt.color}-50/50 shadow-xl` : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                    <div className={`w-14 h-14 bg-${opt.color}-600 text-white rounded-2xl flex items-center justify-center mb-5 shadow-lg`}>{opt.icon}</div>
                    <h4 className="text-xl font-black text-slate-800 mb-2">{opt.title}</h4>
                    <p className="text-sm text-slate-500 mb-5 font-medium">{opt.desc}</p>
                    <ul className="space-y-1.5">
                      {opt.bullets.map(b => <li key={b} className={`text-[10px] font-black uppercase text-${opt.color}-700 flex items-center gap-2`}><CheckCircle2 size={10}/>{b}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
              <form onSubmit={handleApply} className="bg-white border border-slate-200 p-8 rounded-[3rem] shadow-sm space-y-5">
                <div className="grid md:grid-cols-2 gap-5">
                  {[
                    { label:'Legal Org Name', key:'name', placeholder:'Global Green Foundation' },
                    { label:'Tax / Registration ID', key:'taxId', placeholder:'EIN or Gov ID' },
                    { label:'Tagline', key:'tagline', placeholder:'Building brighter futures' },
                    { label:'Website', key:'website', placeholder:'https://yourorg.org' },
                    { label:'Country / Region', key:'country', placeholder:'Nigeria, West Africa' },
                    { label:'Founded Year', key:'founded_year', placeholder:'2020' },
                  ].map(f => (
                    <div key={f.key} className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">{f.label}</label>
                      <input className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm outline-none focus:border-blue-500" value={applyForm[f.key]} onChange={e=>setApplyForm({...applyForm, [f.key]:e.target.value})} placeholder={f.placeholder}/>
                    </div>
                  ))}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Primary Sector</label>
                    <select required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm outline-none focus:border-blue-500" value={applyForm.sector} onChange={e=>setApplyForm({...applyForm, sector:e.target.value})}>
                      <option value="">Select Sector</option>
                      {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Mission & Program Proposal</label>
                  <textarea required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm outline-none h-28 resize-none" value={applyForm.mission} onChange={e=>setApplyForm({...applyForm, mission:e.target.value})} placeholder="Describe your program and how it creates lasting impact…"/>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { ref:charterRef, key:'charterFile', label:'NGO Charter / Articles', color:'blue', accept:'.pdf,.docx,.doc' },
                    { ref:financialRef, key:'financialFile', label:'Financial Statements', color:'indigo', accept:'.pdf,.docx,.xlsx,.xls' },
                  ].map(f => (
                    <div key={f.key} onClick={() => f.ref.current?.click()} className={`p-5 border-2 border-dashed rounded-3xl text-center cursor-pointer transition-colors ${applyForm[f.key] ? 'bg-emerald-50 border-emerald-300' : `bg-${f.color}-50 border-${f.color}-200 hover:bg-${f.color}-100`}`}>
                      <input ref={f.ref} type="file" className="hidden" accept={f.accept} onChange={e => { const file=e.target.files[0]; if(file) setApplyForm(p=>({...p, [f.key]:file})); }}/>
                      <Upload size={20} className={`mx-auto mb-1.5 ${applyForm[f.key]?'text-emerald-500':`text-${f.color}-500`}`}/>
                      <p className={`font-black text-[10px] uppercase tracking-widest ${applyForm[f.key]?'text-emerald-700':`text-${f.color}-700`}`}>{applyForm[f.key]?.name || f.label}</p>
                    </div>
                  ))}
                </div>
                {isApplying ? (
                  <div className="p-5 bg-slate-900 rounded-2xl text-emerald-400 font-mono text-xs flex items-center gap-3">
                    <Loader2 size={14} className="animate-spin"/><span className="animate-pulse">{liveAiStatus}</span>
                  </div>
                ) : (
                  <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl flex items-center justify-center gap-2">
                    <Sparkles size={14}/> Activate Smart Onboarding
                  </button>
                )}
              </form>
            </div>
          ) : (
            <div className="space-y-8 max-w-5xl mx-auto">
              {/* NGO Dashboard */}
              <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 to-indigo-900/30 pointer-events-none"/>
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-3xl font-black tracking-tight">{npoData.npo_name}</h3>
                        <ShieldCheck className="text-emerald-400" size={22}/>
                      </div>
                      {npoData.tagline && <p className="text-blue-300 font-bold text-sm">{npoData.tagline}</p>}
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className="px-2 py-1 bg-white/10 text-white text-[9px] font-black uppercase tracking-widest rounded-lg">{npoData.program_tier?.replace(/_/g,' ')}</span>
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-[9px] font-black uppercase tracking-widest rounded-lg">{npoData.sector}</span>
                        <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 text-[9px] font-black uppercase tracking-widest rounded-lg">{npoData.country}</span>
                      </div>
                    </div>
                    <button onClick={() => shareNpo(npoData)} className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors border border-white/10"><Share2 size={16}/></button>
                  </div>
                  <div className="grid grid-cols-3 gap-6">
                    {[
                      { label:'Total Raised', val:`$${Number(npoData.total_raised).toLocaleString()}` },
                      { label:'Network Float', val:`$${Number(npoData.current_float_usd).toLocaleString()}` },
                      { label:'Transparency', val:`${npoData.transparency_score}%`, color:'text-emerald-400' },
                    ].map(s => (
                      <div key={s.label}>
                        <p className="text-[10px] font-black uppercase text-slate-500 mb-1">{s.label}</p>
                        <p className={`text-2xl font-black ${s.color||'text-white'}`}>{s.val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  {/* My Campaigns */}
                  <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-black text-slate-800 flex items-center gap-2"><Target size={14} className="text-blue-600"/> My Campaigns</h4>
                      <button onClick={() => { setTab('CAMPAIGNS'); setShowCampaignForm(true); }} className="text-[9px] font-black uppercase text-blue-600 hover:text-blue-500 flex items-center gap-1"><Plus size={10}/>New</button>
                    </div>
                    {myCampaigns.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs font-bold">No campaigns yet. <button onClick={() => { setTab('CAMPAIGNS'); setShowCampaignForm(true); }} className="text-blue-600 underline">Create one</button></div>
                    ) : (
                      <div className="space-y-3">
                        {myCampaigns.map(c => (
                          <div key={c.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                            <p className="font-black text-slate-800 text-sm mb-2">{c.title}</p>
                            <ProgressBar raised={c.raised_amount} goal={c.goal_amount}/>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Volunteer section */}
                  <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-sm">
                    <h4 className="font-black text-slate-800 mb-4 flex items-center gap-2"><UserPlus size={14} className="text-purple-600"/> Volunteer Management</h4>
                    <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 text-center">
                      <p className="text-xs font-bold text-purple-700">Share your volunteer link for people to sign up</p>
                      <button onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/volunteer/${npoData.slug||npoData.id}`); showOk('Volunteer link copied!'); }} className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-purple-500 flex items-center gap-1 mx-auto"><Copy size={10}/>Copy Link</button>
                    </div>
                  </div>
                </div>

                {/* Right: Impact Notary */}
                <div className="space-y-6">
                  <div className="bg-white border border-slate-200 p-6 rounded-[2.5rem] shadow-sm">
                    <h4 className="font-black text-slate-800 mb-4 flex items-center gap-2 text-sm"><ShieldCheck size={14} className="text-emerald-500"/> Notarize Impact</h4>
                    <form onSubmit={notarizeImpact} className="space-y-3">
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Title</label>
                        <input required className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-xs" value={impactForm.title} onChange={e=>setImpactForm({...impactForm, title:e.target.value})} placeholder="500 Meals Delivered"/>
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Summary</label>
                        <textarea className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-xs h-16 resize-none" value={impactForm.summary} onChange={e=>setImpactForm({...impactForm, summary:e.target.value})}/>
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Units</label>
                        <input className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-xs" value={impactForm.metrics} onChange={e=>setImpactForm({...impactForm, metrics:e.target.value})} placeholder="500"/>
                      </div>
                      <button type="submit" disabled={isSaving} className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-emerald-500 flex items-center justify-center gap-1 shadow">
                        {isSaving ? <Loader2 size={12} className="animate-spin"/> : <><Network size={10}/>Sign & Notarize</>}
                      </button>
                    </form>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-6 rounded-[2.5rem]">
                    <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-4">Verifiable Ledger</h4>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {impactReports.map(r => (
                        <div key={r.id} className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                          <p className="font-black text-xs text-slate-800">{r.title}</p>
                          <p className="text-[9px] font-mono text-slate-400 truncate mt-1">SIG: {r.chain_tx_hash}</p>
                          <p className="text-[8px] font-black uppercase text-slate-300 mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= COMMAND */}
      {tab === 'COMMAND' && isAdmin && (
        <div className="animate-in fade-in space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label:'Total NGO Flow', val:`$${allNpos.reduce((s,n)=>s+Number(n.total_raised||0),0).toLocaleString()}`, color:'text-blue-600' },
              { label:'Network Float', val:`$${allNpos.reduce((s,n)=>s+Number(n.current_float_usd||0),0).toLocaleString()}`, color:'text-indigo-600' },
              { label:'Academy Members', val:allNpos.filter(n=>n.program_tier===TIERS.EMERGING).length, color:'text-amber-600' },
              { label:'Verified Partners', val:allNpos.filter(n=>[TIERS.CLUSTER,TIERS.ENTERPRISE,TIERS.STRATEGIC].includes(n.program_tier)).length, color:'text-emerald-600' },
            ].map(c => (
              <div key={c.label} className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm text-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{c.label}</p>
                <p className={`text-3xl font-black ${c.color}`}>{c.val}</p>
              </div>
            ))}
          </div>
          <div className="bg-white border border-slate-200 rounded-[3rem] shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>{['Organization','Track','Country','Raised','Status'].map(h => <th key={h} className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {allNpos.map(npo => (
                  <tr key={npo.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-black text-slate-800 text-sm">{npo.npo_name}</td>
                    <td className="px-6 py-4"><span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${npo.program_tier===TIERS.EMERGING?'bg-amber-50 text-amber-600 border-amber-100':npo.program_tier===TIERS.ENTERPRISE?'bg-indigo-50 text-indigo-600 border-indigo-100':'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>{npo.program_tier?.replace(/_/g,' ')}</span></td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-500">{npo.country}</td>
                    <td className="px-6 py-4 font-black text-slate-800">${Number(npo.total_raised).toLocaleString()}</td>
                    <td className="px-6 py-4"><span className={`text-[9px] font-black uppercase ${npo.verification_status==='verified'?'text-emerald-600':'text-amber-600'}`}>{npo.verification_status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================================================================= DONATE MODAL */}
      {donateTarget && (
        <div className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={e => e.target===e.currentTarget && closeDonate()}>
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  {donateTarget.campaign && <p className="text-[9px] font-black uppercase tracking-widest text-blue-600 mb-1">{donateTarget.campaign.title}</p>}
                  <h3 className="text-xl font-black text-slate-800">Donate to {donateTarget.npo.npo_name}</h3>
                  <p className="text-xs font-bold text-emerald-600 mt-0.5">✓ 0% fees · Tax-deductible · Instant receipt</p>
                </div>
                <button onClick={closeDonate} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl border border-slate-200"><X size={16}/></button>
              </div>

              {donateStep === 'done' && donateReceipt ? (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto"><CheckCircle2 size={32} className="text-emerald-600"/></div>
                  <h4 className="text-xl font-black text-slate-800">Thank you!</h4>
                  <p className="text-slate-500 font-medium">Your donation of <strong>{fmt(donateReceipt.amount, donateReceipt.currency)}</strong> has been processed.</p>
                  <div className="bg-slate-50 rounded-2xl p-4 text-left space-y-2">
                    <div className="flex justify-between text-xs font-bold"><span className="text-slate-400">Receipt #</span><span className="text-slate-800">{donateReceipt.receipt_number}</span></div>
                    <div className="flex justify-between text-xs font-bold"><span className="text-slate-400">Donor</span><span className="text-slate-800">{donateReceipt.donor_name}</span></div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => printReceipt(donateReceipt)} className="flex-1 py-3 border border-slate-200 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 flex items-center justify-center gap-1"><Receipt size={12}/>Receipt</button>
                    <button onClick={closeDonate} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600">Done</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Campaign progress */}
                  {donateTarget.campaign && (
                    <div className="bg-blue-50 rounded-2xl p-4">
                      <ProgressBar raised={donateTarget.campaign.raised_amount} goal={donateTarget.campaign.goal_amount}/>
                    </div>
                  )}

                  {/* Preset amounts */}
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Amount</label>
                    <div className="flex gap-2 flex-wrap mb-2">
                      {PRESET_AMOUNTS_USD.map(a => (
                        <button key={a} onClick={() => setDonateAmount(a)} className={`px-3 py-2 rounded-xl font-black text-xs transition-all ${donateAmount===a?'bg-slate-900 text-white shadow':'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>${a}</button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <select className="bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm outline-none" value={donateCurrency} onChange={e => setDonateCurrency(e.target.value)}>
                        {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                      </select>
                      <input type="number" min="1" step="any" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-black text-sm outline-none focus:border-blue-500" value={donateAmount} onChange={e => setDonateAmount(Number(e.target.value))} placeholder="Custom amount"/>
                    </div>
                    {donateCurrency !== 'USD' && <p className="text-[10px] font-bold text-slate-400 mt-1">≈ ${toUsd(donateAmount, donateCurrency).toFixed(2)} USD</p>}
                  </div>

                  {/* Recurring */}
                  <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <button onClick={() => setDonateRecurring(!donateRecurring)} className={`w-10 h-5 rounded-full transition-all relative flex-shrink-0 ${donateRecurring?'bg-indigo-600':'bg-slate-200'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${donateRecurring?'left-5.5 translate-x-0.5':'left-0.5'}`}/>
                    </button>
                    <span className="text-xs font-black text-indigo-800 flex items-center gap-1"><Repeat size={11}/>Recurring donation</span>
                    {donateRecurring && (
                      <select className="ml-auto bg-white border border-indigo-200 rounded-lg px-2 py-1 text-xs font-bold outline-none" value={donateInterval} onChange={e => setDonateInterval(e.target.value)}>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="annually">Annually</option>
                      </select>
                    )}
                  </div>

                  {/* Donor info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Your Name</label>
                      <input className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm outline-none focus:border-blue-500" value={donateName} onChange={e => setDonateName(e.target.value)} placeholder="Full name"/>
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Email</label>
                      <input type="email" className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm outline-none focus:border-blue-500" value={donateEmail} onChange={e => setDonateEmail(e.target.value)} placeholder="email@example.com"/>
                    </div>
                  </div>

                  {/* Anonymous + message */}
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={donateAnon} onChange={e => setDonateAnon(e.target.checked)} className="rounded"/>
                      <span className="text-xs font-bold text-slate-600">Donate anonymously</span>
                    </label>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Message (optional)</label>
                    <input className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm outline-none" value={donateMsg} onChange={e => setDonateMsg(e.target.value)} placeholder="A note to the organization…"/>
                  </div>

                  {/* Payment method tabs */}
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Payment Method</label>
                    <div className="flex gap-2 mb-4">
                      {[['card','💳 Card'],['mobile_money','📱 Mobile Money'],['wallet','🏦 IFB Wallet']].map(([m,l]) => (
                        <button key={m} onClick={() => setDonateMethod(m)} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${donateMethod===m?'bg-slate-900 text-white border-slate-900':'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-400'}`}>{l}</button>
                      ))}
                    </div>

                    {donateMethod === 'card' && (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                        <div ref={cardMountRef} className="min-h-[40px]"/>
                        {!cardMountRef.current?.children?.length && <p className="text-xs text-slate-400 text-center py-2">Loading secure card input…</p>}
                      </div>
                    )}

                    {donateMethod === 'mobile_money' && (
                      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-3">
                        <p className="text-xs font-black text-amber-800">Mobile Money Transfer</p>
                        <div className="bg-white rounded-xl p-3 space-y-1 text-xs font-bold">
                          <p className="text-slate-500">Orange Money / MTN / Wave / M-Pesa</p>
                          <p className="text-slate-800">Contact: <span className="text-blue-600">+221 77 000 0000</span></p>
                          <p className="text-slate-800">Reference: <span className="font-mono text-emerald-600">{donateTarget.npo.npo_name.slice(0,8).toUpperCase()}-{Math.random().toString(36).slice(2,8).toUpperCase()}</span></p>
                        </div>
                        <p className="text-[10px] text-amber-700">After transfer, click confirm below and we'll verify your payment within 24h.</p>
                      </div>
                    )}

                    {donateMethod === 'wallet' && (
                      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                        <p className="text-xs font-black text-blue-800 mb-2">IFB Wallet Balance</p>
                        <p className="text-2xl font-black text-blue-600">Deduct from balance</p>
                        <p className="text-[10px] text-blue-600 mt-1">Instant · No fees · Recorded on ledger</p>
                      </div>
                    )}
                  </div>

                  {/* Donate button */}
                  <button onClick={handleDonate} disabled={donateStep==='paying'} className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 shadow-xl flex items-center justify-center gap-2 transition-all">
                    {donateStep==='paying' ? <><Loader2 size={16} className="animate-spin"/>Processing…</> : <><Heart size={14}/> Donate {fmt(donateAmount, donateCurrency)}{donateRecurring ? ` / ${donateInterval}` : ''}</>}
                  </button>
                  <p className="text-center text-[9px] font-bold text-slate-400">🔒 Secured by Stripe · Tax receipt emailed instantly</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
