import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './services/supabaseClient';
import {
  Shield, Users, DollarSign, BarChart3, Ticket, Globe, Settings,
  Search, CheckCircle, X, AlertTriangle, Loader2, RefreshCw,
  Eye, EyeOff, Ban, UserCheck, ChevronRight, Activity,
  TrendingUp, ArrowUpRight, FileText, Clock, Filter,
  ShieldCheck, ShieldAlert, Plus, Trash2, Edit2, Send,
  Building2, Lock, Unlock, Database, Zap, Bell, Rocket,
  Upload, Pencil, Save, UserCog, LayoutDashboard, BookOpen
} from 'lucide-react';

const ROLE_META = {
  super:   { label: 'Super Admin',    color: 'text-red-400    bg-red-900/30    border-red-700',    desc: 'Full platform access' },
  ops:     { label: 'Operations',     color: 'text-blue-400   bg-blue-900/30   border-blue-700',   desc: 'User & KYC management' },
  finance: { label: 'Finance',        color: 'text-amber-400  bg-amber-900/30  border-amber-700',  desc: 'Transactions & balances' },
  support: { label: 'Support',        color: 'text-emerald-400 bg-emerald-900/30 border-emerald-700', desc: 'Tickets & user messages' },
  content: { label: 'Content',        color: 'text-purple-400 bg-purple-900/30 border-purple-700', desc: 'VentureX & announcements' },
};

const TABS = [
  { id: 'overview',      label: 'Overview',        icon: BarChart3,       roles: ['super','ops','finance','support','content'] },
  { id: 'register',      label: 'Register User',   icon: UserCheck,       roles: ['super','ops'] },
  { id: 'users',         label: 'Users',           icon: Users,           roles: ['super','ops','support'] },
  { id: 'kyc',           label: 'KYC Review',      icon: ShieldCheck,     roles: ['super','ops'] },
  { id: 'documents',     label: 'Documents',       icon: FileText,        roles: ['super','ops'] },
  { id: 'transactions',  label: 'Transactions',    icon: Activity,        roles: ['super','finance'] },
  { id: 'finance',       label: 'P2P Orders',      icon: DollarSign,      roles: ['super','finance'] },
  { id: 'support',       label: 'Support',         icon: Ticket,          roles: ['super','support','ops'] },
  { id: 'applications',  label: 'IFB Applications',icon: Rocket,          roles: ['super','ops','content'] },
  { id: 'venturex',      label: 'VentureX',        icon: Globe,           roles: ['super','content'] },
  { id: 'backoffice',    label: 'Back Office',     icon: Database,        roles: ['super'] },
  { id: 'announce',      label: 'Broadcast',       icon: Bell,            roles: ['super','content','ops'] },
  { id: 'roles',         label: 'Admin Roles',     icon: Shield,          roles: ['super'] },
];

const PACKAGES_META = {
  access: { name: 'IFB ACCESS',  price: 650,  color: 'text-emerald-400' },
  growth: { name: 'IFB GROWTH',  price: 2750, color: 'text-blue-400'    },
  elite:  { name: 'IFB ELITE',   price: 6000, color: 'text-violet-400'  },
};
const APP_STATUS_META = {
  under_review: { label: 'Under Review', cls: 'text-amber-400 bg-amber-900/30 border-amber-700/40' },
  in_progress:  { label: 'In Progress',  cls: 'text-blue-400  bg-blue-900/30  border-blue-700/40'  },
  completed:    { label: 'Completed',    cls: 'text-emerald-400 bg-emerald-900/30 border-emerald-700/40' },
  cancelled:    { label: 'Cancelled',    cls: 'text-red-400   bg-red-900/30   border-red-700/40'   },
};
const VTX_SECTORS = ['Technology','Fintech','Agriculture','Healthcare','Education','Energy','Real Estate','Manufacturing','Retail','Logistics','Media','Tourism','Other'];
const VTX_STAGES  = ['idea','pre_revenue','early','growth','scale','mvp','ipo_ready'];

const fmtUSD = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
const fmtNum = n => Number(n || 0).toLocaleString();

function StatCard({ icon: Icon, label, value, sub, color = 'text-blue-400', bg = 'bg-blue-900/20' }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-4`}>
        <Icon size={18} className={color}/>
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">{label}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard({ session, profile, onClose }) {
  const [adminRole, setAdminRole] = useState(null);
  const [checkingRole, setCheckingRole] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Data states
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [kycQueue, setKycQueue] = useState([]);
  const [allDocs, setAllDocs] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [p2pOrders, setP2pOrders] = useState([]);
  const [venturexCos, setVenturexCos] = useState([]);
  const [adminRoles, setAdminRoles] = useState([]);
  // Register user form
  const [regForm, setRegForm] = useState({ email:'', password:'', full_name:'', phone:'', country:'', role:'user', kyc_status:'unverified', dob:'', employer:'', source_of_revenue:'' });
  const [registering, setRegistering] = useState(false);
  // VentureX
  const [vtxFilter, setVtxFilter] = useState('');
  const [vtxDetail, setVtxDetail] = useState(null);
  const [vtxEditId, setVtxEditId] = useState(null);
  const [vtxEdits, setVtxEdits] = useState({});
  const [vtxUploading, setVtxUploading] = useState({});
  const [vtxProgressOpen, setVtxProgressOpen] = useState(new Set());
  const [vtxSendingReport, setVtxSendingReport] = useState({});
  const [prospectForm, setProspectForm] = useState({ full_name:'', email:'', company_name:'', sector:'', country:'', cost_min:3690, cost_max:6300 });
  const [prospectLoading, setProspectLoading] = useState(false);
  const [prospectResult, setProspectResult] = useState(null);
  // IFB Applications
  const [applications, setApplications] = useState([]);
  const [appFilter, setAppFilter] = useState('');
  const [appDetail, setAppDetail] = useState(null);
  const [appAdvisor, setAppAdvisor] = useState('');
  const [appNotes, setAppNotes] = useState('');
  const [showCreateApp, setShowCreateApp] = useState(false);
  const [appForm, setAppForm] = useState({
    user_id:'', company_name:'', sector:'', country:'', stage:'idea', team_size:1,
    annual_revenue_usd:0, capital_ask_usd:0, problem_statement:'', solution_statement:'',
    website:'', package_id:'access', package_name:'IFB ACCESS', package_price_usd:0,
    payment_status:'admin_created', status:'under_review', assigned_advisor:'', notes:'',
  });
  const [creatingApp, setCreatingApp] = useState(false);
  // Back office
  const [boUser, setBoUser] = useState(null);
  const [boSearch, setBoSearch] = useState('');
  const [boLoading, setBoLoading] = useState(false);
  const [boEdits, setBoEdits] = useState({});
  const [boTab, setBoTab] = useState('profile');
  const [boOverview, setBoOverview] = useState(null);
  const [boOverviewLoading, setBoOverviewLoading] = useState(false);
  // Tx filter
  const [txSearch, setTxSearch] = useState('');

  // UI states
  const [loading, setLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetailTab, setUserDetailTab] = useState('profile');
  const [userEdits, setUserEdits] = useState({});
  const [savingUser, setSavingUser] = useState(false);
  const [balanceAdj, setBalanceAdj] = useState({ wallet: 'liquid', type: 'credit', amount: '', reason: '' });
  const [adjLoading, setAdjLoading] = useState(false);
  const [userNotif, setUserNotif] = useState({ title: '', message: '' });
  const [sendingUserNotif, setSendingUserNotif] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketReply, setTicketReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [notification, setNotification] = useState(null);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('support');
  const [addingAdmin, setAddingAdmin] = useState(false);

  const notify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Check admin role on mount
  useEffect(() => {
    const check = async () => {
      try {
        const { data } = await supabase.from('admin_roles')
          .select('role,permissions,is_active')
          .eq('user_id', session.user.id)
          .eq('is_active', true)
          .maybeSingle();
        if (data) {
          setAdminRole(data);
        } else {
          // Fallback: derive from profiles.role when RLS blocks admin_roles
          const profileRole = profile?.role;
          if (profileRole === 'superadmin' || profileRole === 'admin_l3') {
            setAdminRole({ role: 'super', permissions: { all: true }, is_active: true });
          } else if (profileRole === 'admin') {
            setAdminRole({ role: 'ops', permissions: {}, is_active: true });
          } else {
            setAdminRole(null);
          }
        }
      } catch { setAdminRole(null); }
      finally { setCheckingRole(false); }
    };
    check();
  }, [session.user.id, profile?.role]);

  const canAccess = (tab) => {
    if (!adminRole) return false;
    return TABS.find(t => t.id === tab)?.roles.includes(adminRole.role) ?? false;
  };

  // Load overview stats
  const loadStats = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_platform_stats');
      if (!error && data) setStats(data);
    } catch { /* silent */ }
  }, []);

  // Load users
  const loadUsers = useCallback(async (search = '') => {
    setLoading(true);
    try {
      const { data } = await supabase.rpc('admin_get_users', { p_search: search || null, p_limit: 50 });
      setUsers(data || []);
    } finally { setLoading(false); }
  }, []);

  // Load KYC queue
  const loadKyc = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('kyc_submissions')
        .select('*, profiles(full_name, email, country)')
        .in('status', ['pending', 'p2p_review', 'ai_reviewing', 'needs_more_info'])
        .order('created_at', { ascending: true })
        .limit(50);
      setKycQueue(data || []);
    } finally { setLoading(false); }
  }, []);

  // Load support tickets via RPC (fixes 400 from broken FK join)
  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.rpc('admin_get_support_tickets', { p_limit: 100 });
      setTickets(data || []);
    } finally { setLoading(false); }
  }, []);

  // Load P2P orders
  const loadP2p = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('p2p_orders')
        .select('*, profiles!p2p_orders_user_id_fkey(full_name, email)')
        .in('status', ['open','locked_in_escrow'])
        .order('created_at', { ascending: false })
        .limit(50);
      setP2pOrders(data || []);
    } finally { setLoading(false); }
  }, []);

  // Load VentureX companies via RPC (fixes 400 from broken FK join)
  const loadVentureX = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.rpc('admin_get_venturex', { p_limit: 100, p_status: null });
      setVenturexCos(data || []);
    } finally { setLoading(false); }
  }, []);

  // Load all transactions
  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.rpc('admin_get_all_transactions', { p_limit: 300, p_user_id: null });
      setTransactions(data || []);
    } finally { setLoading(false); }
  }, []);

  // Load all KYC documents
  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.rpc('admin_get_kyc_submissions', { p_limit: 200, p_status: null });
      setAllDocs(data || []);
    } finally { setLoading(false); }
  }, []);

  // Load IFB applications
  const loadApplications = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.rpc('admin_get_applications', { p_limit: 200, p_status: null, p_user_id: null });
      setApplications(data || []);
    } finally { setLoading(false); }
  }, []);

  // Load admin roles
  const loadAdminRoles = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('admin_roles').select('*').order('created_at', { ascending: false });
      setAdminRoles(data || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!adminRole) return;
    loadStats();
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'kyc') loadKyc();
    if (activeTab === 'documents') loadDocuments();
    if (activeTab === 'transactions') loadTransactions();
    if (activeTab === 'support') loadTickets();
    if (activeTab === 'finance') loadP2p();
    if (activeTab === 'venturex') loadVentureX();
    if (activeTab === 'applications') loadApplications();
    if (activeTab === 'roles') loadAdminRoles();
  }, [activeTab, adminRole]);

  // KYC actions
  const [kycNote, setKycNote] = useState('');
  const handleKycAction = async (userId, status, note = '') => {
    try {
      const { error } = await supabase.rpc('admin_update_kyc', {
        p_user_id: userId,
        p_status: status,
        p_notes: note || null,
      });
      if (error) throw error;
      notify(`KYC ${status} successfully`);
      loadKyc();
    } catch (e) { notify(e.message, 'error'); }
  };

  // VentureX company status update
  const handleVxStatus = async (id, status) => {
    try {
      const { error } = await supabase.rpc('admin_update_venturex_company', {
        p_company_id: id, p_status: status,
        p_financial_verified: null, p_identity_verified: null,
        p_traction_verified: null, p_is_public: null, p_investment_readiness_score: null,
      });
      if (error) throw error;
      notify(`Company status updated to ${status}`);
      loadVentureX();
    } catch (e) { notify(e.message, 'error'); }
  };

  // VentureX full field save
  const handleVtxSave = async (companyId) => {
    if (!Object.keys(vtxEdits).length) return;
    try {
      const { error } = await supabase.rpc('admin_update_venturex_full', { p_company_id: companyId, p_updates: vtxEdits });
      if (error) throw error;
      notify('Company updated');
      setVtxEditId(null); setVtxEdits({});
      loadVentureX();
    } catch (e) { notify(e.message, 'error'); }
  };

  // VentureX document upload
  const handleVtxDocUpload = async (companyId, field, file) => {
    if (!file) return;
    setVtxUploading(u => ({...u, [field]: true}));
    try {
      const ext = file.name.split('.').pop();
      const path = `venturex/${companyId}/${field}.${ext}`;
      const { error: upErr } = await supabase.storage.from('kyc_documents').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('kyc_documents').getPublicUrl(path);
      const { error: updErr } = await supabase.rpc('admin_update_venturex_full', {
        p_company_id: companyId,
        p_updates: { [field]: publicUrl }
      });
      if (updErr) throw updErr;
      notify(`${field.replace('_url','').replace(/_/g,' ')} uploaded`);
      loadVentureX();
    } catch (e) { notify(e.message, 'error'); }
    finally { setVtxUploading(u => ({...u, [field]: false})); }
  };

  const computeCapitalReadiness = (co) => {
    const checklist = [
      { id: 'legal_docs',   label: 'Legal documentation uploaded',       met: !!co.legal_docs_url,           ws: 'A' },
      { id: 'id_verified',  label: 'Identity verified by IFB',           met: !!co.identity_verified,        ws: 'A' },
      { id: 'org_profile',  label: 'Organization profile complete',      met: !!(co.sector && co.tagline),   ws: 'C' },
      { id: 'geography',    label: 'Geographic scope defined',           met: !!co.country,                  ws: 'C' },
      { id: 'team',         label: 'Team structure declared',            met: !!(co.team_size > 0),          ws: 'A' },
      { id: 'pitch_deck',   label: 'Pitch deck / project doc uploaded',  met: !!co.pitch_deck_url,           ws: 'D' },
      { id: 'financials',   label: 'Financial statements uploaded',      met: !!co.financial_statements_url, ws: 'B' },
      { id: 'fin_verified', label: 'Financials verified by IFB',        met: !!co.financial_verified,       ws: 'B' },
      { id: 'kpis',         label: 'KPIs & impact metrics defined',     met: !!(co.investment_readiness_score > 0 || co.active_users > 0), ws: 'E' },
      { id: 'traction',     label: 'Traction verified by IFB',          met: !!co.traction_verified,        ws: 'E' },
      { id: 'budget',       label: 'Budget & financial projections set', met: !!(co.monthly_revenue > 0 || co.funding_goal > 0), ws: 'F' },
      { id: 'funding_hist', label: 'Funding history recorded',          met: !!(co.total_raised > 0),       ws: 'B' },
      { id: 'online',       label: 'Online presence established',       met: !!co.website,                  ws: 'G' },
      { id: 'public',       label: 'Listed on IFB marketplace',         met: !!co.is_public,                ws: 'G' },
    ];
    const WS_META = [
      { id:'A', label:'Organizational Structuring & Documentation', hMin:15, hMax:25, cMin:450,  cMax:750  },
      { id:'B', label:'Financial Review & Transparency Setup',      hMin:10, hMax:20, cMin:300,  cMax:600  },
      { id:'C', label:'Mission Positioning & Strategic Alignment',  hMin:8,  hMax:15, cMin:240,  cMax:450  },
      { id:'D', label:'Project Structuring & Documentation',       hMin:20, hMax:40, cMin:600,  cMax:1200 },
      { id:'E', label:'KPI Definition & Impact Framework',         hMin:10, hMax:15, cMin:300,  cMax:450  },
      { id:'F', label:'Budgeting & Financial Planning',            hMin:15, hMax:25, cMin:450,  cMax:750  },
      { id:'G', label:'Funding Readiness & Strategy',              hMin:20, hMax:35, cMin:600,  cMax:1050 },
      { id:'H', label:'Ongoing Advisory & Weekly Reviews (3mo)',   hMin:25, hMax:35, cMin:750,  cMax:1050 },
    ];
    const workstreams = WS_META.map(ws => {
      const items = checklist.filter(c => c.ws === ws.id);
      const complete = items.length === 0 ? false : items.every(c => c.met);
      const partial  = items.some(c => c.met) && !complete;
      return { ...ws, items, complete, partial };
    });
    const metCount = checklist.filter(c => c.met).length;
    const pct = Math.round((metCount / checklist.length) * 100);
    const LEVELS = [
      { min:0,  max:20,  n:1, label:'Just Started',  bar:'bg-red-500',    badge:'text-red-400 bg-red-900/30 border-red-700/40' },
      { min:21, max:40,  n:2, label:'Foundation',     bar:'bg-orange-500', badge:'text-orange-400 bg-orange-900/30 border-orange-700/40' },
      { min:41, max:60,  n:3, label:'In Progress',    bar:'bg-amber-500',  badge:'text-amber-400 bg-amber-900/30 border-amber-700/40' },
      { min:61, max:80,  n:4, label:'Advanced',       bar:'bg-blue-500',   badge:'text-blue-400 bg-blue-900/30 border-blue-700/40' },
      { min:81, max:100, n:5, label:'Funding Ready',  bar:'bg-emerald-500',badge:'text-emerald-400 bg-emerald-900/30 border-emerald-700/40' },
    ];
    const lv = LEVELS.find(l => pct >= l.min && pct <= l.max) || LEVELS[0];
    const missing = checklist.filter(c => !c.met);
    const incomplete = workstreams.filter(ws => !ws.complete);
    const totalCostMin = incomplete.reduce((s, ws) => s + ws.cMin, 0);
    const totalCostMax = incomplete.reduce((s, ws) => s + ws.cMax, 0);
    const fundingPhase = pct < 30 ? 'Weeks 1–3: Structuring & documentation' : pct < 60 ? 'Weeks 4–6: Project and financial alignment' : pct < 80 ? 'Weeks 6–10: Funding outreach and positioning' : 'Ready for immediate funding outreach';
    return { checklist, workstreams, metCount, total: checklist.length, pct, lv, missing, incomplete, totalCostMin, totalCostMax, fundingPhase };
  };

  const handleSendProgressReport = async (co) => {
    setVtxSendingReport(s => ({...s, [co.id]: true}));
    try {
      const r = computeCapitalReadiness(co);
      const firstName = (co.user_full_name || 'there').split(' ')[0];
      const doneLines = r.checklist.filter(c => c.met).map(c => `✓ ${c.label}`).join('\n');
      const missingLines = r.missing.map(c => `✗ ${c.label}`).join('\n');
      const wsLines = r.incomplete.map(ws => `${ws.id}. ${ws.label}\n   Estimated: ${ws.hMin}–${ws.hMax} hrs → $${ws.cMin.toLocaleString()} – $${ws.cMax.toLocaleString()}`).join('\n\n');
      const message = `Dear ${firstName},\n\nThank you for your commitment and for taking the first step with IFB. Here is your current Capital Readiness Report.\n\n━━━ LEVEL ${r.lv.n}/5 — ${r.lv.label} (${r.pct}% complete) ━━━\n\nCOMPLETED (${r.metCount}/${r.total}):\n${doneLines || 'None yet — let\'s get started!'}\n\nSTILL REQUIRED (${r.missing.length} items):\n${missingLines || 'Nothing missing — you are fully ready!'}\n\n━━━ REMAINING WORKSTREAMS & IFB SUPPORT COSTS ($30/hr) ━━━\n\n${wsLines || 'All workstreams complete!'}\n\n${r.incomplete.length > 0 ? `Estimated remaining investment: $${r.totalCostMin.toLocaleString()} – $${r.totalCostMax.toLocaleString()}\n\n` : ''}━━━ FUNDING TIMELINE ━━━\n${r.fundingPhase}\n\n━━━ NEXT STEPS ━━━\nPlease review the missing items above and contact IFB to begin resolving them. Each completed item moves you one step closer to securing your funding.\n\nYou are free to select which parts IFB will handle and which parts your team will complete independently.\n\nWarm regards,\nIFB Team`;
      const notifPayload = {
        user_id: co.user_id, type: 'progress_report',
        title: `Capital Readiness Report — Level ${r.lv.n}/5 · ${r.pct}% Complete`,
        message, is_read: false,
        metadata: { company_id: co.id, company_name: co.legal_name, level: r.lv.n, pct: r.pct, missing_count: r.missing.length, cost_min: r.totalCostMin, cost_max: r.totalCostMax },
      };
      const { error } = await supabase.from('venturex_notifications').insert(notifPayload);
      if (error) throw error;

      // Send email in parallel (non-blocking — don't fail if email errors)
      if (co.user_email) {
        supabase.functions.invoke('send-progress-email', {
          body: {
            to_email: co.user_email,
            to_name: co.user_full_name,
            company_name: co.legal_name,
            level: r.lv.n,
            pct: r.pct,
            checklist: r.checklist,
            workstreams: r.workstreams,
            cost_min: r.totalCostMin,
            cost_max: r.totalCostMax,
            funding_phase: r.fundingPhase,
          },
        }).catch(() => {});
      }

      notify(`Progress report sent to ${co.user_full_name} (in-app + email)`);
    } catch (e) { notify(e.message, 'error'); }
    finally { setVtxSendingReport(s => ({...s, [co.id]: false})); }
  };

  const handleSendProspect = async () => {
    const { full_name, email, company_name } = prospectForm;
    if (!full_name || !email || !company_name) { notify('Name, email and organization name required', 'error'); return; }
    setProspectLoading(true);
    setProspectResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('send-prospect-report', { body: prospectForm });
      if (error || data?.error) throw new Error(error?.message || data?.error);
      setProspectResult(data);
      notify(data.message || 'Report sent!');
      loadVentureX();
    } catch (e) { notify(e.message, 'error'); }
    finally { setProspectLoading(false); }
  };

  // IFB Application update
  const handleAppUpdate = async (appId, status, advisor, notes) => {
    try {
      const { error } = await supabase.rpc('admin_update_application', {
        p_app_id: appId,
        p_status: status || null,
        p_assigned_advisor: advisor || null,
        p_notes: notes || null,
      });
      if (error) throw error;
      notify('Application updated');
      loadApplications();
      if (appDetail?.id === appId) setAppDetail(prev => ({...prev, status: status||prev.status, assigned_advisor: advisor||prev.assigned_advisor, notes: notes||prev.notes}));
    } catch (e) { notify(e.message, 'error'); }
  };

  // Create application on behalf of user
  const handleCreateApp = async () => {
    if (!appForm.user_id || !appForm.company_name) { notify('User ID and company name required', 'error'); return; }
    setCreatingApp(true);
    try {
      const pkg = PACKAGES_META[appForm.package_id];
      const { data, error } = await supabase.rpc('admin_create_application_for_user', {
        p_target_user_id: appForm.user_id,
        p_company_name: appForm.company_name,
        p_sector: appForm.sector || 'Other',
        p_country: appForm.country || '',
        p_stage: appForm.stage || 'idea',
        p_team_size: parseInt(appForm.team_size) || 1,
        p_annual_revenue_usd: parseFloat(appForm.annual_revenue_usd) || 0,
        p_capital_ask_usd: parseFloat(appForm.capital_ask_usd) || 0,
        p_problem_statement: appForm.problem_statement || '',
        p_solution_statement: appForm.solution_statement || '',
        p_website: appForm.website || null,
        p_package_id: appForm.package_id,
        p_package_name: pkg?.name || appForm.package_id,
        p_package_price_usd: parseFloat(appForm.package_price_usd) || 0,
        p_addons: '[]',
        p_addons_total_usd: 0,
        p_payment_status: appForm.payment_status,
        p_status: appForm.status,
        p_assigned_advisor: appForm.assigned_advisor || null,
        p_notes: appForm.notes || null,
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      notify(`Application created for ${appForm.company_name}`);
      setShowCreateApp(false);
      setAppForm({ user_id:'', company_name:'', sector:'', country:'', stage:'idea', team_size:1, annual_revenue_usd:0, capital_ask_usd:0, problem_statement:'', solution_statement:'', website:'', package_id:'access', package_name:'IFB ACCESS', package_price_usd:0, payment_status:'admin_created', status:'under_review', assigned_advisor:'', notes:'' });
      loadApplications();
    } catch (e) { notify(e.message, 'error'); }
    finally { setCreatingApp(false); }
  };

  // Load "view as user" overview
  const loadBoOverview = async (userId) => {
    setBoOverviewLoading(true);
    try {
      const { data } = await supabase.rpc('admin_get_user_overview', { p_user_id: userId });
      setBoOverview(data);
    } catch (e) { notify(e.message, 'error'); }
    finally { setBoOverviewLoading(false); }
  };

  // Send ticket reply (as admin specialist)
  const handleTicketReply = async () => {
    if (!ticketReply.trim() || !selectedTicket) return;
    setSendingReply(true);
    try {
      await supabase.from('support_messages').insert([{
        ticket_id: selectedTicket.id,
        sender_id: session.user.id,
        sender_type: 'agent',
        message: ticketReply.trim(),
      }]);
      setTicketReply('');
      notify('Reply sent to user');
    } catch (e) { notify(e.message, 'error'); }
    finally { setSendingReply(false); }
  };

  const handleCloseTicket = async (ticketId) => {
    try {
      await supabase.from('support_tickets').update({ status: 'closed' }).eq('id', ticketId);
      setSelectedTicket(null);
      notify('Ticket closed');
      loadTickets();
    } catch (e) { notify(e.message, 'error'); }
  };

  // Broadcast notification
  const handleBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMsg.trim()) return;
    setBroadcasting(true);
    try {
      const { data: allUsers } = await supabase.from('profiles').select('id').limit(200);
      if (allUsers) {
        const inserts = allUsers.map(u => ({
          user_id: u.id,
          type: 'broadcast',
          message: broadcastMsg.trim(),
          status: 'pending',
          metadata: { title: broadcastTitle.trim(), sent_by: profile?.full_name || 'IFB Admin' }
        }));
        await supabase.from('notifications').insert(inserts);
      }
      notify(`Broadcast sent to ${allUsers?.length || 0} users`);
      setBroadcastTitle('');
      setBroadcastMsg('');
    } catch (e) { notify(e.message, 'error'); }
    finally { setBroadcasting(false); }
  };

  // Add new admin
  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim()) return;
    setAddingAdmin(true);
    try {
      const { data: userRow } = await supabase.from('profiles').select('id, email').ilike('email', newAdminEmail.trim()).maybeSingle();
      if (!userRow) throw new Error('User not found. They must have an IFB account first.');
      await supabase.from('admin_roles').upsert([{
        user_id: userRow.id,
        email: userRow.email,
        role: newAdminRole,
        permissions: {},
        granted_by: session.user.id,
        is_active: true,
      }], { onConflict: 'user_id' });
      notify(`${userRow.email} granted ${newAdminRole} access`);
      setNewAdminEmail('');
      loadAdminRoles();
    } catch (e) { notify(e.message, 'error'); }
    finally { setAddingAdmin(false); }
  };

  const handleRevokeAdmin = async (roleId) => {
    if (!confirm('Revoke this admin access?')) return;
    try {
      await supabase.from('admin_roles').update({ is_active: false }).eq('id', roleId);
      notify('Access revoked');
      loadAdminRoles();
    } catch (e) { notify(e.message, 'error'); }
  };

  const handleSaveUserProfile = async () => {
    if (!selectedUser || !Object.keys(userEdits).length) return;
    setSavingUser(true);
    try {
      const { error } = await supabase.from('profiles').update(userEdits).eq('id', selectedUser.id);
      if (error) throw error;
      setSelectedUser(u => ({ ...u, ...userEdits }));
      setUserEdits({});
      notify('Profile updated');
      loadUsers(userSearch);
    } catch (e) { notify(e.message, 'error'); }
    finally { setSavingUser(false); }
  };

  const handleAdjustBalance = async () => {
    if (!selectedUser || !balanceAdj.amount || isNaN(Number(balanceAdj.amount))) {
      notify('Enter a valid amount', 'error'); return;
    }
    setAdjLoading(true);
    try {
      const col = balanceAdj.wallet === 'liquid' ? 'liquid_usd' : 'mysafe_digital_usd';
      const delta = balanceAdj.type === 'credit' ? Number(balanceAdj.amount) : -Number(balanceAdj.amount);
      const newVal = Math.max(0, (selectedUser[col] || 0) + delta);
      const { error } = await supabase.from('profiles').update({ [col]: newVal }).eq('id', selectedUser.id);
      if (error) throw error;
      await supabase.from('transactions').insert([{
        user_id: selectedUser.id,
        type: balanceAdj.type === 'credit' ? 'admin_credit' : 'admin_debit',
        amount_usd: Math.abs(delta),
        status: 'completed',
        description: balanceAdj.reason || `Admin ${balanceAdj.type} by ${profile?.full_name || 'Admin'}`,
        metadata: { admin_id: session.user.id, wallet: balanceAdj.wallet },
      }]);
      setSelectedUser(u => ({ ...u, [col]: newVal }));
      setBalanceAdj(b => ({ ...b, amount: '', reason: '' }));
      notify(`${balanceAdj.type === 'credit' ? '+' : '-'}$${Number(balanceAdj.amount).toFixed(2)} applied`);
      loadUsers(userSearch);
    } catch (e) { notify(e.message, 'error'); }
    finally { setAdjLoading(false); }
  };

  const handleSendUserNotif = async () => {
    if (!selectedUser || !userNotif.title.trim() || !userNotif.message.trim()) {
      notify('Title and message required', 'error'); return;
    }
    setSendingUserNotif(true);
    try {
      const { error } = await supabase.from('notifications').insert([{
        user_id: selectedUser.id,
        type: 'admin_message',
        message: userNotif.message.trim(),
        status: 'pending',
        metadata: { title: userNotif.title.trim(), sent_by: profile?.full_name || 'IFB Admin' },
      }]);
      if (error) throw error;
      setUserNotif({ title: '', message: '' });
      notify('Notification sent');
    } catch (e) { notify(e.message, 'error'); }
    finally { setSendingUserNotif(false); }
  };

  const handleToggleSuspend = async () => {
    if (!selectedUser) return;
    const isSuspended = selectedUser.kyc_status === 'suspended';
    const newStatus = isSuspended ? 'unverified' : 'suspended';
    try {
      const { error } = await supabase.rpc('admin_set_kyc_status', { p_user_id: selectedUser.id, p_status: newStatus });
      if (error) throw error;
      setSelectedUser(u => ({ ...u, kyc_status: newStatus }));
      notify(`User ${isSuspended ? 'unsuspended' : 'suspended'}`);
      loadUsers(userSearch);
    } catch (e) { notify(e.message, 'error'); }
  };

  if (checkingRole) {
    return (
      <div className="fixed inset-0 bg-slate-950 z-[600] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={32}/>
      </div>
    );
  }

  if (!adminRole) {
    return (
      <div className="fixed inset-0 bg-slate-950 z-[600] flex items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-20 h-20 bg-red-900/30 border border-red-800 rounded-3xl flex items-center justify-center mx-auto">
            <Lock size={36} className="text-red-400"/>
          </div>
          <h2 className="text-2xl font-black text-white">Access Denied</h2>
          <p className="text-slate-400">You don't have admin rights on this platform.</p>
          <button onClick={onClose} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-colors">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const roleMeta = ROLE_META[adminRole.role];
  const allowedTabs = TABS.filter(t => t.roles.includes(adminRole.role));

  return (
    <div className="fixed inset-0 bg-slate-950 z-[600] flex flex-col overflow-hidden">
      {/* Global notification */}
      {notification && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[700] px-6 py-3 rounded-2xl border shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 text-sm font-black ${notification.type === 'error' ? 'bg-red-900/90 border-red-700 text-red-200' : 'bg-emerald-900/90 border-emerald-700 text-emerald-200'}`}>
          {notification.type === 'error' ? <AlertTriangle size={16}/> : <CheckCircle size={16}/>}
          {notification.msg}
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center shadow-lg">
            <Shield size={20} className="text-white"/>
          </div>
          <div>
            <h1 className="font-black text-white text-sm tracking-tight">DEUS Admin Control Center</h1>
            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border mt-0.5 ${roleMeta.color}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"/>
              {roleMeta.label}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-500 hidden md:block">{session.user.email}</span>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors">
            <X size={20}/>
          </button>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex overflow-x-auto no-scrollbar border-b border-slate-800 bg-slate-900/50 shrink-0">
        {allowedTabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-5 py-3.5 whitespace-nowrap text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === id ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
            <Icon size={13}/>{label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">

          {/* ─── OVERVIEW ─── */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-white">Platform Overview</h2>
                <button onClick={loadStats} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-[10px] uppercase tracking-widest rounded-xl transition-colors">
                  <RefreshCw size={12}/> Refresh
                </button>
              </div>
              {stats ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <StatCard icon={Users} label="Total Users" value={fmtNum(stats.total_users)} sub={`+${fmtNum(stats.new_users_7d)} this week`} color="text-blue-400" bg="bg-blue-900/20"/>
                    <StatCard icon={ShieldCheck} label="Verified KYC" value={fmtNum(stats.verified_users)} color="text-emerald-400" bg="bg-emerald-900/20"/>
                    <StatCard icon={DollarSign} label="30-day Volume" value={fmtUSD(stats.txn_volume)} color="text-amber-400" bg="bg-amber-900/20"/>
                    <StatCard icon={Ticket} label="Open Tickets" value={fmtNum(stats.open_tickets)} color="text-red-400" bg="bg-red-900/20"/>
                    <StatCard icon={ShieldAlert} label="Pending KYC" value={fmtNum(stats.pending_kyc)} color="text-orange-400" bg="bg-orange-900/20"/>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard icon={Database} label="Total Balance" value={fmtUSD(stats.total_balance)} color="text-purple-400" bg="bg-purple-900/20"/>
                    <StatCard icon={Activity} label="Open P2P Orders" value={fmtNum(stats.p2p_open)} color="text-cyan-400" bg="bg-cyan-900/20"/>
                    <StatCard icon={Building2} label="VentureX Active" value={fmtNum(stats.venturex_companies)} color="text-indigo-400" bg="bg-indigo-900/20"/>
                    <StatCard icon={TrendingUp} label="Total Transactions" value={fmtNum(stats.total_txns)} color="text-teal-400" bg="bg-teal-900/20"/>
                  </div>

                  {/* Quick actions */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      canAccess('kyc') && { label: 'Review KYC Queue', count: stats.pending_kyc, tab: 'kyc', color: 'border-orange-700/40 bg-orange-900/10', icon: ShieldAlert, iconColor: 'text-orange-400' },
                      canAccess('support') && { label: 'Open Support Tickets', count: stats.open_tickets, tab: 'support', color: 'border-red-700/40 bg-red-900/10', icon: Ticket, iconColor: 'text-red-400' },
                      canAccess('finance') && { label: 'Pending P2P Orders', count: stats.p2p_open, tab: 'finance', color: 'border-cyan-700/40 bg-cyan-900/10', icon: Activity, iconColor: 'text-cyan-400' },
                    ].filter(Boolean).map(item => item && (
                      <button key={item.tab} onClick={() => setActiveTab(item.tab)}
                        className={`p-6 rounded-2xl border ${item.color} hover:opacity-80 text-left transition-opacity`}>
                        <div className="flex items-center justify-between mb-3">
                          <item.icon size={20} className={item.iconColor}/>
                          <ChevronRight size={16} className="text-slate-600"/>
                        </div>
                        <p className="text-3xl font-black text-white">{item.count}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">{item.label}</p>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={28}/></div>
              )}
            </div>
          )}

          {/* ─── USERS ─── */}
          {activeTab === 'users' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <h2 className="text-2xl font-black text-white">User Management</h2>
                <div className="flex gap-3">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                    <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && loadUsers(userSearch)}
                      placeholder="Search email or name..."
                      className="bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white font-medium outline-none focus:border-blue-500 w-64 transition-colors"/>
                  </div>
                  <button onClick={() => loadUsers(userSearch)} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-colors">
                    Search
                  </button>
                </div>
              </div>

              {loading ? <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={28}/></div> : (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead><tr className="border-b border-slate-800">
                        {['User', 'Email', 'Country', 'KYC', 'Liquid Balance', 'Joined', 'Actions'].map(h => (
                          <th key={h} className="p-4 text-left text-[9px] font-black uppercase tracking-widest text-slate-500">{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {(users || []).map((user, i) => (
                          <tr key={user.id} className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-xs">
                                  {(user.full_name || user.email || 'U')[0].toUpperCase()}
                                </div>
                                <span className="font-black text-white text-sm">{user.full_name || '—'}</span>
                              </div>
                            </td>
                            <td className="p-4 text-xs text-slate-400">{user.email}</td>
                            <td className="p-4 text-xs text-slate-400">{user.country || '—'}</td>
                            <td className="p-4">
                              <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${user.kyc_status === 'verified' ? 'bg-emerald-900/40 text-emerald-400' : user.kyc_status === 'rejected' ? 'bg-red-900/40 text-red-400' : 'bg-amber-900/40 text-amber-400'}`}>
                                {user.kyc_status || 'unverified'}
                              </span>
                            </td>
                            <td className="p-4 font-black text-white text-sm">{fmtUSD(user.liquid_usd)}</td>
                            <td className="p-4 text-xs text-slate-500">{user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</td>
                            <td className="p-4">
                              <button onClick={() => { setSelectedUser(user); setUserDetailTab('profile'); setUserEdits({}); }}
                                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 font-black text-[9px] uppercase rounded-lg transition-colors">
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* User detail panel */}
              {selectedUser && (
                <div className="fixed inset-y-0 right-0 w-full md:w-[26rem] bg-slate-950 border-l border-slate-800 z-50 flex flex-col shadow-2xl animate-in slide-in-from-right-4">
                  {/* Header */}
                  <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-lg">
                        {(selectedUser.full_name || selectedUser.email || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-white text-sm leading-tight">{selectedUser.full_name || '—'}</p>
                        <p className="text-[10px] text-slate-400">{selectedUser.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        selectedUser.kyc_status === 'verified' ? 'text-emerald-400 bg-emerald-900/30 border-emerald-700/40' :
                        selectedUser.kyc_status === 'suspended' ? 'text-red-400 bg-red-900/30 border-red-700/40' :
                        selectedUser.kyc_status === 'rejected' ? 'text-red-400 bg-red-900/30 border-red-700/40' :
                        'text-amber-400 bg-amber-900/30 border-amber-700/40'
                      }`}>{(selectedUser.kyc_status || 'unverified').replace(/_/g,' ')}</span>
                      <button onClick={() => { setSelectedUser(null); setUserEdits({}); }} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400"><X size={18}/></button>
                    </div>
                  </div>

                  {/* Sub-tabs */}
                  <div className="flex border-b border-slate-800 shrink-0">
                    {[
                      { id: 'profile', label: 'Profile', icon: UserCog },
                      { id: 'balance', label: 'Balance', icon: DollarSign },
                      { id: 'notify', label: 'Notify', icon: Bell },
                      { id: 'actions', label: 'Actions', icon: ShieldAlert },
                    ].map(t => (
                      <button key={t.id} onClick={() => setUserDetailTab(t.id)}
                        className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[9px] font-black uppercase tracking-widest transition-colors border-b-2 ${userDetailTab === t.id ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                        <t.icon size={12}/>
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">

                    {/* ── PROFILE TAB ── */}
                    {userDetailTab === 'profile' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { key: 'full_name', label: 'Full Name', type: 'text' },
                            { key: 'phone', label: 'Phone', type: 'text' },
                            { key: 'country', label: 'Country', type: 'text' },
                            { key: 'employer', label: 'Employer', type: 'text' },
                            { key: 'source_of_revenue', label: 'Revenue Source', type: 'text' },
                            { key: 'date_of_birth', label: 'Date of Birth', type: 'date' },
                          ].map(({ key, label, type }) => (
                            <div key={key} className="col-span-2 space-y-1">
                              <label className="text-[9px] font-black uppercase text-slate-500">{label}</label>
                              <input
                                type={type}
                                value={userEdits[key] !== undefined ? userEdits[key] : (selectedUser[key] || '')}
                                onChange={e => setUserEdits(u => ({ ...u, [key]: e.target.value }))}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                              />
                            </div>
                          ))}
                        </div>
                        {Object.keys(userEdits).length > 0 && (
                          <button onClick={handleSaveUserProfile} disabled={savingUser}
                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-colors">
                            {savingUser ? <Loader2 size={12} className="animate-spin"/> : <Save size={12}/>}
                            Save Profile
                          </button>
                        )}
                        <div className="p-3 bg-slate-800/40 rounded-xl space-y-1.5 mt-2">
                          {[
                            { label: 'User ID', val: selectedUser.id?.slice(0, 20) + '…' },
                            { label: 'Liquid Balance', val: fmtUSD(selectedUser.liquid_usd) },
                            { label: 'Vault Balance', val: fmtUSD(selectedUser.mysafe_digital_usd) },
                            { label: 'Joined', val: selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString() : '—' },
                          ].map(({ label, val }) => (
                            <div key={label} className="flex justify-between">
                              <span className="text-[9px] font-black uppercase text-slate-500">{label}</span>
                              <span className="text-[10px] font-black text-slate-300">{val}</span>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => { setBoUser(selectedUser); setActiveTab('backoffice'); setSelectedUser(null); }}
                          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-[9px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-colors">
                          <LayoutDashboard size={11}/> View in Back Office
                        </button>
                      </div>
                    )}

                    {/* ── BALANCE TAB ── */}
                    {userDetailTab === 'balance' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-slate-800/60 rounded-xl p-3 text-center">
                            <p className="text-[9px] font-black uppercase text-slate-500 mb-1">Liquid Wallet</p>
                            <p className="text-base font-black text-white">{fmtUSD(selectedUser.liquid_usd)}</p>
                          </div>
                          <div className="bg-slate-800/60 rounded-xl p-3 text-center">
                            <p className="text-[9px] font-black uppercase text-slate-500 mb-1">My Safe</p>
                            <p className="text-base font-black text-white">{fmtUSD(selectedUser.mysafe_digital_usd)}</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase text-slate-500">Wallet</label>
                          <div className="grid grid-cols-2 gap-2">
                            {['liquid', 'vault'].map(w => (
                              <button key={w} onClick={() => setBalanceAdj(b => ({ ...b, wallet: w }))}
                                className={`py-2 rounded-xl font-black text-[9px] uppercase tracking-widest border transition-colors ${balanceAdj.wallet === w ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                {w === 'liquid' ? 'Liquid' : 'My Safe'}
                              </button>
                            ))}
                          </div>
                          <label className="text-[9px] font-black uppercase text-slate-500">Operation</label>
                          <div className="grid grid-cols-2 gap-2">
                            {['credit', 'debit'].map(t => (
                              <button key={t} onClick={() => setBalanceAdj(b => ({ ...b, type: t }))}
                                className={`py-2 rounded-xl font-black text-[9px] uppercase tracking-widest border transition-colors ${balanceAdj.type === t ? (t === 'credit' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-red-700 border-red-600 text-white') : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                {t === 'credit' ? '+ Credit' : '− Debit'}
                              </button>
                            ))}
                          </div>
                          <label className="text-[9px] font-black uppercase text-slate-500">Amount (USD)</label>
                          <input
                            type="number" min="0" step="0.01"
                            value={balanceAdj.amount}
                            onChange={e => setBalanceAdj(b => ({ ...b, amount: e.target.value }))}
                            placeholder="0.00"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                          />
                          <label className="text-[9px] font-black uppercase text-slate-500">Reason</label>
                          <input
                            type="text"
                            value={balanceAdj.reason}
                            onChange={e => setBalanceAdj(b => ({ ...b, reason: e.target.value }))}
                            placeholder="Bonus, correction, withdrawal…"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                          />
                          <button onClick={handleAdjustBalance} disabled={adjLoading || !balanceAdj.amount}
                            className={`w-full py-2.5 font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-colors ${balanceAdj.type === 'credit' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-red-700 hover:bg-red-600 text-white'} disabled:opacity-50`}>
                            {adjLoading ? <Loader2 size={12} className="animate-spin"/> : <DollarSign size={12}/>}
                            Apply {balanceAdj.type === 'credit' ? 'Credit' : 'Debit'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ── NOTIFY TAB ── */}
                    {userDetailTab === 'notify' && (
                      <div className="space-y-3">
                        <p className="text-[10px] text-slate-400">Send a direct notification to this user's app.</p>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase text-slate-500">Title</label>
                          <input
                            type="text"
                            value={userNotif.title}
                            onChange={e => setUserNotif(n => ({ ...n, title: e.target.value }))}
                            placeholder="e.g. Account Update"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                          />
                          <label className="text-[9px] font-black uppercase text-slate-500">Message</label>
                          <textarea
                            value={userNotif.message}
                            onChange={e => setUserNotif(n => ({ ...n, message: e.target.value }))}
                            placeholder="Your message…"
                            rows={4}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                          />
                          <button onClick={handleSendUserNotif} disabled={sendingUserNotif}
                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                            {sendingUserNotif ? <Loader2 size={12} className="animate-spin"/> : <Send size={12}/>}
                            Send Notification
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ── ACTIONS TAB ── */}
                    {userDetailTab === 'actions' && (
                      <div className="space-y-2">
                        <p className="text-[9px] font-black uppercase text-slate-500 mb-2">KYC Status</p>
                        {[
                          { status: 'verified', label: 'Verify KYC', icon: UserCheck, cls: 'bg-emerald-600 hover:bg-emerald-500 text-white' },
                          { status: 'pending', label: 'Mark Pending', icon: Clock, cls: 'bg-amber-700 hover:bg-amber-600 text-white' },
                          { status: 'needs_more_info', label: 'Needs More Info', icon: AlertTriangle, cls: 'bg-orange-700 hover:bg-orange-600 text-white' },
                          { status: 'ai_reviewing', label: 'Send to AI Review', icon: Zap, cls: 'bg-blue-700 hover:bg-blue-600 text-white' },
                          { status: 'rejected', label: 'Reject KYC', icon: Ban, cls: 'bg-red-900/70 hover:bg-red-800 border border-red-700/40 text-red-300' },
                        ].filter(a => a.status !== selectedUser.kyc_status).map(({ status, label, icon: Icon, cls }) => (
                          <button key={status}
                            onClick={async () => {
                              try {
                                const { error } = await supabase.rpc('admin_set_kyc_status', { p_user_id: selectedUser.id, p_status: status });
                                if (error) throw error;
                                setSelectedUser(u => ({ ...u, kyc_status: status }));
                                notify(`KYC set to ${status}`);
                                loadUsers(userSearch);
                              } catch (e) { notify(e.message, 'error'); }
                            }}
                            className={`w-full py-2.5 font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-colors ${cls}`}>
                            <Icon size={12}/> {label}
                          </button>
                        ))}
                        <div className="border-t border-slate-800 pt-2 mt-2">
                          <p className="text-[9px] font-black uppercase text-slate-500 mb-2">Account</p>
                          <button onClick={handleToggleSuspend}
                            className={`w-full py-2.5 font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-colors ${selectedUser.kyc_status === 'suspended' ? 'bg-emerald-700 hover:bg-emerald-600 text-white' : 'bg-red-900/50 hover:bg-red-900/80 border border-red-700/40 text-red-400'}`}>
                            {selectedUser.kyc_status === 'suspended' ? <><Unlock size={12}/> Unsuspend User</> : <><Lock size={12}/> Suspend User</>}
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── KYC REVIEW ─── */}
          {activeTab === 'kyc' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-white">KYC Review Queue</h2>
                <button onClick={loadKyc} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-[10px] uppercase tracking-widest rounded-xl transition-colors">
                  <RefreshCw size={12}/> Refresh
                </button>
              </div>
              {loading ? <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={28}/></div> : (
                <div className="space-y-4">
                  {kycQueue.length === 0 ? (
                    <div className="text-center py-20 text-slate-500 font-bold">No pending KYC submissions.</div>
                  ) : kycQueue.map(sub => (
                    <div key={sub.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-black text-white text-base">{sub.legal_full_name || sub.profiles?.full_name || '—'}</p>
                          <p className="text-xs text-slate-400">{sub.profiles?.email} · {sub.email_primary || ''}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{sub.id}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border ${
                            sub.status === 'approved' ? 'text-emerald-400 bg-emerald-900/30 border-emerald-700/40' :
                            sub.status === 'rejected' ? 'text-red-400 bg-red-900/30 border-red-700/40' :
                            sub.status === 'ai_reviewing' ? 'text-blue-400 bg-blue-900/30 border-blue-700/40' :
                            'text-amber-400 bg-amber-900/30 border-amber-700/40'
                          }`}>{sub.status?.replace(/_/g,' ')}</span>
                          {sub.risk_rating && (
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                              sub.risk_rating === 'low' ? 'text-emerald-400 border-emerald-700/40' :
                              sub.risk_rating === 'medium' ? 'text-amber-400 border-amber-700/40' :
                              'text-red-400 border-red-700/40'
                            }`}>Risk: {sub.risk_rating}</span>
                          )}
                        </div>
                      </div>
                      {/* Key data grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { label: 'AI Confidence', val: sub.ai_confidence_score != null ? `${sub.ai_confidence_score}%` : 'N/A' },
                          { label: 'AI Recommendation', val: sub.ai_recommendation || 'N/A' },
                          { label: 'Nationality', val: sub.nationality || sub.profiles?.country || '—' },
                          { label: 'ID Type', val: sub.id_type?.replace(/_/g,' ') || '—' },
                          { label: 'ID Number', val: sub.id_number || '—' },
                          { label: 'ID Expiry', val: sub.id_expiry || '—' },
                          { label: 'Employment', val: sub.employment_status?.replace(/_/g,' ') || '—' },
                          { label: 'Monthly Income', val: sub.monthly_income_usd ? `$${Number(sub.monthly_income_usd).toLocaleString()}` : '—' },
                          { label: 'Source of Funds', val: sub.source_of_funds || '—' },
                          { label: 'PEP', val: sub.politically_exposed_person ? '⚠️ YES' : 'No' },
                          { label: 'FATCA', val: sub.fatca_applicable ? 'Yes' : 'No' },
                          { label: 'Submitted', val: sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : new Date(sub.created_at).toLocaleDateString() },
                        ].map(({ label, val }) => (
                          <div key={label} className="bg-slate-800/60 rounded-xl p-3">
                            <p className="text-[9px] font-black uppercase text-slate-500 mb-0.5">{label}</p>
                            <p className={`text-xs font-black ${val?.toString().includes('⚠️') ? 'text-amber-400' : 'text-white'}`}>{val}</p>
                          </div>
                        ))}
                      </div>
                      {/* AI Flags */}
                      {sub.ai_flags?.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          <p className="text-[9px] font-black uppercase text-slate-500 w-full">AI Flags</p>
                          {sub.ai_flags.map(flag => (
                            <span key={flag} className="text-[9px] font-black uppercase text-amber-400 bg-amber-900/20 border border-amber-700/30 px-2 py-1 rounded-lg">{flag.replace(/_/g,' ')}</span>
                          ))}
                        </div>
                      )}
                      {/* Document links */}
                      <div className="flex flex-wrap gap-2">
                        <p className="text-[9px] font-black uppercase text-slate-500 w-full">Documents</p>
                        {[
                          'id_front_url','id_back_url','selfie_url','selfie_with_id_url',
                          'proof_of_address_url','proof_of_income_url','bank_statement_url',
                          'tax_return_url','employment_letter_url','business_license_url',
                          'certificate_of_incorporation_url','board_resolution_url',
                        ].map(field => sub[field] && (
                          <a key={field} href={sub[field]} target="_blank" rel="noreferrer"
                            className="text-[9px] font-black uppercase text-blue-400 bg-blue-900/20 border border-blue-800/40 px-3 py-1.5 rounded-lg hover:bg-blue-900/40 transition-colors flex items-center gap-1">
                            <FileText size={10}/>{field.replace('_url','').replace(/_/g,' ')}
                          </a>
                        ))}
                        {!['id_front_url','id_back_url','selfie_url','proof_of_address_url'].some(f => sub[f]) && (
                          <span className="text-[9px] text-slate-600">No documents uploaded yet</span>
                        )}
                      </div>
                      {/* Action row */}
                      <div className="flex flex-col md:flex-row gap-3 pt-2 border-t border-slate-800">
                        <input
                          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
                          placeholder="Reviewer notes / rejection reason (optional)"
                          id={`kyc-note-${sub.id}`}
                        />
                        <button onClick={() => handleKycAction(sub.user_id, 'approved', document.getElementById(`kyc-note-${sub.id}`)?.value)}
                          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-colors flex items-center justify-center gap-2 shrink-0">
                          <CheckCircle size={14}/> Approve
                        </button>
                        <button onClick={() => handleKycAction(sub.user_id, 'needs_more_info', document.getElementById(`kyc-note-${sub.id}`)?.value)}
                          className="px-6 py-3 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-700/40 text-amber-400 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-colors flex items-center justify-center gap-2 shrink-0">
                          <AlertTriangle size={14}/> Request Info
                        </button>
                        <button onClick={() => handleKycAction(sub.user_id, 'rejected', document.getElementById(`kyc-note-${sub.id}`)?.value)}
                          className="px-6 py-3 bg-red-900/50 hover:bg-red-900/80 border border-red-700/40 text-red-400 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-colors flex items-center justify-center gap-2 shrink-0">
                          <X size={14}/> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── REGISTER USER ─── */}
          {activeTab === 'register' && (
            <div className="space-y-6 animate-in fade-in max-w-2xl">
              <h2 className="text-2xl font-black text-white">Register New User</h2>
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key:'full_name',       label:'Full Name *',          type:'text' },
                    { key:'email',           label:'Email Address *',       type:'email' },
                    { key:'password',        label:'Temporary Password *',  type:'password' },
                    { key:'phone',           label:'Phone (with +code)',     type:'tel' },
                    { key:'dob',             label:'Date of Birth',         type:'date' },
                    { key:'country',         label:'Country',               type:'text' },
                    { key:'employer',        label:'Employer',              type:'text' },
                    { key:'source_of_revenue',label:'Source of Revenue',   type:'text' },
                  ].map(({ key, label, type }) => (
                    <div key={key}>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">{label}</label>
                      <input type={type} value={regForm[key]} onChange={e => setRegForm(f => ({...f, [key]: e.target.value}))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500" />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Role</label>
                    <select value={regForm.role} onChange={e => setRegForm(f => ({...f, role: e.target.value}))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500">
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="admin_l3">Admin L3</option>
                      <option value="is_cot_processor">CoT Processor</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">KYC Status</label>
                    <select value={regForm.kyc_status} onChange={e => setRegForm(f => ({...f, kyc_status: e.target.value}))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500">
                      <option value="unverified">Unverified</option>
                      <option value="pending_kyc">Pending KYC</option>
                      <option value="verified">Verified</option>
                      <option value="approved">Approved</option>
                    </select>
                  </div>
                </div>
                <button disabled={registering || !regForm.email || !regForm.password || !regForm.full_name}
                  onClick={async () => {
                    setRegistering(true);
                    try {
                      const { data, error } = await supabase.functions.invoke('admin-create-user', { body: regForm });
                      if (error || data?.error) throw new Error(data?.error || error?.message);
                      notify(`User ${regForm.full_name} created — ID: ${data.user_id}`);
                      setRegForm({ email:'', password:'', full_name:'', phone:'', country:'', role:'user', kyc_status:'unverified', dob:'', employer:'', source_of_revenue:'' });
                    } catch(e) { notify(e.message, 'error'); }
                    finally { setRegistering(false); }
                  }}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                  {registering ? <><Loader2 size={14} className="animate-spin"/> Creating...</> : <><UserCheck size={14}/> Create User Account</>}
                </button>
              </div>
            </div>
          )}

          {/* ─── DOCUMENTS ─── */}
          {activeTab === 'documents' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-white">KYC Documents</h2>
                <button onClick={loadDocuments} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-[10px] uppercase tracking-widest rounded-xl transition-colors">
                  <RefreshCw size={12}/> Refresh
                </button>
              </div>
              {loading ? <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={28}/></div> : (
                <div className="space-y-4">
                  {allDocs.length === 0 ? <div className="text-center py-20 text-slate-500 font-bold">No documents found.</div> : allDocs.map(doc => (
                    <div key={doc.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-black text-white">{doc.user_full_name || doc.legal_full_name || '—'}</p>
                          <p className="text-xs text-slate-400">{doc.user_email}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{doc.user_id}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border ${doc.status==='approved'?'text-emerald-400 bg-emerald-900/30 border-emerald-700/40':doc.status==='rejected'?'text-red-400 bg-red-900/30 border-red-700/40':'text-amber-400 bg-amber-900/30 border-amber-700/40'}`}>{doc.status?.replace(/_/g,' ')}</span>
                          {doc.risk_rating && <span className="text-[9px] text-slate-400 font-bold">Risk: {doc.risk_rating}</span>}
                          {doc.ai_confidence_score != null && <span className="text-[9px] text-blue-400 font-bold">AI: {doc.ai_confidence_score}%</span>}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {[['Nationality', doc.nationality], ['ID Type', doc.id_type], ['Income', doc.monthly_income_usd ? fmtUSD(doc.monthly_income_usd)+'/mo' : '—'], ['PEP', doc.politically_exposed_person ? '⚠️ YES' : 'No']].map(([l,v]) => (
                          <div key={l} className="bg-slate-800/50 rounded-xl p-2">
                            <p className="text-[8px] font-black uppercase text-slate-500">{l}</p>
                            <p className="text-xs font-bold text-white">{v || '—'}</p>
                          </div>
                        ))}
                      </div>
                      {doc.ai_flags?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {doc.ai_flags.map(f => <span key={f} className="text-[9px] font-black uppercase text-amber-400 bg-amber-900/20 border border-amber-700/30 px-2 py-0.5 rounded-lg">{f.replace(/_/g,' ')}</span>)}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {[
                          ['ID Front', doc.id_front_url], ['ID Back', doc.id_back_url],
                          ['Selfie', doc.selfie_url], ['Selfie + ID', doc.selfie_with_id_url],
                          ['Proof of Address', doc.proof_of_address_url], ['Proof of Income', doc.proof_of_income_url],
                          ['Bank Statement', doc.bank_statement_url], ['Certificate', doc.certificate_of_incorporation_url],
                          ['Board Resolution', doc.board_resolution_url],
                        ].filter(([,url]) => url).map(([label, url]) => (
                          <a key={label} href={url} target="_blank" rel="noreferrer"
                            className="text-[9px] font-black uppercase text-blue-400 bg-blue-900/20 border border-blue-800/40 px-3 py-1.5 rounded-lg hover:bg-blue-900/40 flex items-center gap-1">
                            <Eye size={10}/>{label}
                          </a>
                        ))}
                      </div>
                      {doc.status !== 'approved' && doc.status !== 'rejected' && (
                        <div className="flex gap-3 pt-2 border-t border-slate-800">
                          <input id={`docnote-${doc.id}`} className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none" placeholder="Notes..." />
                          <button onClick={() => handleKycAction(doc.user_id, 'approved', document.getElementById(`docnote-${doc.id}`)?.value)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[9px] uppercase rounded-xl flex items-center gap-1">
                            <CheckCircle size={12}/> Approve
                          </button>
                          <button onClick={() => handleKycAction(doc.user_id, 'needs_more_info', document.getElementById(`docnote-${doc.id}`)?.value)}
                            className="px-4 py-2 bg-amber-600/30 border border-amber-700/40 text-amber-400 font-black text-[9px] uppercase rounded-xl flex items-center gap-1">
                            <AlertTriangle size={12}/> More Info
                          </button>
                          <button onClick={() => handleKycAction(doc.user_id, 'rejected', document.getElementById(`docnote-${doc.id}`)?.value)}
                            className="px-4 py-2 bg-red-900/40 border border-red-700/40 text-red-400 font-black text-[9px] uppercase rounded-xl flex items-center gap-1">
                            <X size={12}/> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── TRANSACTIONS ─── */}
          {activeTab === 'transactions' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-2xl font-black text-white">All Transactions</h2>
                <div className="flex items-center gap-3">
                  <input value={txSearch} onChange={e => setTxSearch(e.target.value)} placeholder="Search user / type / status..."
                    className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white placeholder:text-slate-500 outline-none w-56" />
                  <button onClick={loadTransactions} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-[10px] uppercase tracking-widest rounded-xl">
                    <RefreshCw size={12}/> Refresh
                  </button>
                </div>
              </div>
              {loading ? <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={28}/></div> : (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-[9px] font-black uppercase tracking-widest text-slate-500">
                          {['Source','User','Type','Amount','Currency','Status','Date','Notes'].map(h => (
                            <th key={h} className="px-4 py-3 text-left">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.filter(t => !txSearch || [t.user_email,t.user_name,t.tx_type,t.status,t.source].join(' ').toLowerCase().includes(txSearch.toLowerCase())).map((tx, i) => (
                          <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                            <td className="px-4 py-3"><span className="text-[9px] font-black uppercase text-purple-400 bg-purple-900/20 px-2 py-0.5 rounded">{tx.source?.replace(/_/g,' ')}</span></td>
                            <td className="px-4 py-3"><p className="font-bold text-white">{tx.user_name || '—'}</p><p className="text-slate-500 text-[10px]">{tx.user_email}</p></td>
                            <td className="px-4 py-3 text-slate-300 font-bold">{tx.tx_type?.replace(/_/g,' ')}</td>
                            <td className="px-4 py-3 font-black text-white">{tx.amount != null ? Number(tx.amount).toLocaleString() : '—'}</td>
                            <td className="px-4 py-3 text-slate-400">{tx.currency}</td>
                            <td className="px-4 py-3"><span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${tx.status==='completed'||tx.status==='confirmed'?'text-emerald-400':'tx.status==="failed"||tx.status==="rejected"'?'text-red-400':'text-amber-400'}`}>{tx.status}</span></td>
                            <td className="px-4 py-3 text-slate-500">{tx.created_at ? new Date(tx.created_at).toLocaleDateString() : '—'}</td>
                            <td className="px-4 py-3 text-slate-500 max-w-[120px] truncate">{tx.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {transactions.length === 0 && <div className="py-16 text-center text-slate-500 font-bold">No transactions found.</div>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── FINANCE ─── */}
          {activeTab === 'finance' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-white">Finance & P2P Orders</h2>
                <button onClick={loadP2p} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-[10px] uppercase tracking-widest rounded-xl transition-colors">
                  <RefreshCw size={12}/> Refresh
                </button>
              </div>
              {loading ? <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={28}/></div> : (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead><tr className="border-b border-slate-800">
                        {['Order ID', 'User', 'Type', 'Amount', 'Payment Method', 'Status', 'Created'].map(h => (
                          <th key={h} className="p-4 text-left text-[9px] font-black uppercase tracking-widest text-slate-500">{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {p2pOrders.map(order => (
                          <tr key={order.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                            <td className="p-4 font-mono text-xs text-slate-400">{order.id?.slice(0,8)}</td>
                            <td className="p-4 text-xs text-white font-bold">{order.profiles?.full_name || order.profiles?.email || '—'}</td>
                            <td className="p-4"><span className="text-[9px] font-black uppercase text-blue-400 bg-blue-900/20 px-2 py-1 rounded-full">{order.order_type}</span></td>
                            <td className="p-4 font-black text-white">{fmtUSD(order.amount_usd)}</td>
                            <td className="p-4 text-xs text-slate-400 max-w-32 truncate">{order.payment_method}</td>
                            <td className="p-4"><span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${order.status === 'open' ? 'bg-amber-900/40 text-amber-400' : 'bg-blue-900/40 text-blue-400'}`}>{order.status}</span></td>
                            <td className="p-4 text-xs text-slate-500">{new Date(order.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {p2pOrders.length === 0 && <div className="text-center py-12 text-slate-500 font-bold text-sm">No open P2P orders.</div>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── IFB APPLICATIONS ─── */}
          {activeTab === 'applications' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-2xl font-black text-white">IFB Entrepreneur Applications</h2>
                <div className="flex items-center gap-3 flex-wrap">
                  <select value={appFilter} onChange={e => setAppFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none">
                    <option value="">All Statuses</option>
                    {Object.entries(APP_STATUS_META).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <button onClick={() => setShowCreateApp(s => !s)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl">
                    <Plus size={12}/> Create for User
                  </button>
                  <button onClick={loadApplications} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-[10px] uppercase tracking-widest rounded-xl">
                    <RefreshCw size={12}/> Refresh
                  </button>
                </div>
              </div>

              {/* Create Application Panel */}
              {showCreateApp && (
                <div className="bg-slate-900 border border-indigo-700/40 rounded-3xl p-6 space-y-5">
                  <h3 className="font-black text-white text-sm">Register Application on Behalf of User</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-3">
                      <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">User ID (UUID) *</label>
                      <input value={appForm.user_id} onChange={e => setAppForm(f=>({...f,user_id:e.target.value}))}
                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500 font-mono" />
                    </div>
                    {[['company_name','Company Name *','text'],['sector','Sector','text'],['country','Country','text'],
                      ['capital_ask_usd','Capital Ask (USD)','number'],['annual_revenue_usd','Annual Revenue (USD)','number'],
                      ['website','Website','text']].map(([key,label,type]) => (
                      <div key={key}>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">{label}</label>
                        <input type={type} value={appForm[key]} onChange={e => setAppForm(f=>({...f,[key]:e.target.value}))}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500" />
                      </div>
                    ))}
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Stage</label>
                      <select value={appForm.stage} onChange={e => setAppForm(f=>({...f,stage:e.target.value}))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none">
                        {['idea','pre_revenue','early','growth','scale'].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Package</label>
                      <select value={appForm.package_id} onChange={e => {
                        const pkg = PACKAGES_META[e.target.value];
                        setAppForm(f=>({...f, package_id:e.target.value, package_name:pkg?.name||e.target.value, package_price_usd:pkg?.price||0}));
                      }} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none">
                        {Object.entries(PACKAGES_META).map(([k,v]) => <option key={k} value={k}>{v.name} (${v.price})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Initial Status</label>
                      <select value={appForm.status} onChange={e => setAppForm(f=>({...f,status:e.target.value}))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none">
                        {Object.entries(APP_STATUS_META).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Payment Status</label>
                      <select value={appForm.payment_status} onChange={e => setAppForm(f=>({...f,payment_status:e.target.value}))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none">
                        {['admin_created','paid','refunded','waived'].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Assign Advisor</label>
                      <input value={appForm.assigned_advisor} onChange={e => setAppForm(f=>({...f,assigned_advisor:e.target.value}))}
                        placeholder="Advisor name or email"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Problem Statement</label>
                    <textarea value={appForm.problem_statement} onChange={e => setAppForm(f=>({...f,problem_statement:e.target.value}))}
                      rows={2} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none resize-none" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Solution Statement</label>
                    <textarea value={appForm.solution_statement} onChange={e => setAppForm(f=>({...f,solution_statement:e.target.value}))}
                      rows={2} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none resize-none" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Internal Notes</label>
                    <textarea value={appForm.notes} onChange={e => setAppForm(f=>({...f,notes:e.target.value}))}
                      rows={2} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none resize-none" />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={handleCreateApp} disabled={creatingApp || !appForm.user_id || !appForm.company_name}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center gap-2">
                      {creatingApp ? <Loader2 size={14} className="animate-spin"/> : <Rocket size={14}/>} Submit Application
                    </button>
                    <button onClick={() => setShowCreateApp(false)} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-xl">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Applications list + detail panel */}
              {loading ? <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={28}/></div> : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    {applications.filter(a => !appFilter || a.status === appFilter).length === 0
                      ? <div className="text-center py-12 text-slate-500 font-bold">No applications found.</div>
                      : applications.filter(a => !appFilter || a.status === appFilter).map(app => {
                          const statusMeta = APP_STATUS_META[app.status] || APP_STATUS_META.under_review;
                          const pkgMeta = PACKAGES_META[app.package_id];
                          return (
                            <button key={app.id} onClick={() => { setAppDetail(app); setAppAdvisor(app.assigned_advisor||''); setAppNotes(app.notes||''); }}
                              className={`w-full text-left p-5 rounded-2xl border transition-all hover:border-indigo-600 ${appDetail?.id===app.id?'border-indigo-600 bg-indigo-950/20':'border-slate-800 bg-slate-900'}`}>
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div>
                                  <p className="font-black text-white text-sm">{app.company_name}</p>
                                  <p className="text-xs text-slate-400">{app.user_full_name} · {app.user_email}</p>
                                </div>
                                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full border shrink-0 ${statusMeta.cls}`}>{statusMeta.label}</span>
                              </div>
                              <div className="flex items-center gap-3 mt-2">
                                <span className={`text-[9px] font-black ${pkgMeta?.color||'text-slate-400'}`}>{app.package_name}</span>
                                <span className="text-[9px] text-slate-500">{app.sector} · {app.country}</span>
                                {app.assigned_advisor && <span className="text-[9px] text-emerald-400">⚙ {app.assigned_advisor}</span>}
                              </div>
                              <p className="text-[9px] text-slate-600 mt-1">{new Date(app.created_at).toLocaleString()}</p>
                            </button>
                          );
                        })
                    }
                  </div>

                  {/* Detail panel */}
                  {appDetail ? (
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
                      <div className="p-5 border-b border-slate-800">
                        <p className="font-black text-white">{appDetail.company_name}</p>
                        <p className="text-xs text-slate-400">{appDetail.user_full_name} · {appDetail.user_email}</p>
                      </div>
                      <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
                        {/* Info grid */}
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            ['Stage', appDetail.stage?.replace(/_/g,' ')],
                            ['Sector', appDetail.sector],
                            ['Country', appDetail.country],
                            ['Team Size', appDetail.team_size],
                            ['Annual Revenue', fmtUSD(appDetail.annual_revenue_usd)],
                            ['Capital Ask', fmtUSD(appDetail.capital_ask_usd)],
                            ['Package', appDetail.package_name],
                            ['Total Paid', fmtUSD(appDetail.total_paid_usd)],
                            ['Payment', appDetail.payment_status],
                          ].map(([l,v]) => (
                            <div key={l} className="bg-slate-800/50 rounded-xl p-2.5">
                              <p className="text-[8px] font-black uppercase text-slate-500">{l}</p>
                              <p className="text-xs font-bold text-white">{v||'—'}</p>
                            </div>
                          ))}
                        </div>
                        {appDetail.problem_statement && (
                          <div><p className="text-[9px] font-black uppercase text-slate-500 mb-1">Problem</p><p className="text-xs text-slate-300 leading-relaxed">{appDetail.problem_statement}</p></div>
                        )}
                        {appDetail.solution_statement && (
                          <div><p className="text-[9px] font-black uppercase text-slate-500 mb-1">Solution</p><p className="text-xs text-slate-300 leading-relaxed">{appDetail.solution_statement}</p></div>
                        )}
                        {appDetail.website && (
                          <a href={appDetail.website} target="_blank" rel="noreferrer" className="text-xs text-blue-400 underline">{appDetail.website}</a>
                        )}

                        {/* Status buttons */}
                        <div>
                          <p className="text-[9px] font-black uppercase text-slate-500 mb-2">Update Status</p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(APP_STATUS_META).map(([k,v]) => (
                              <button key={k} onClick={() => handleAppUpdate(appDetail.id, k, null, null)}
                                className={`px-3 py-1.5 border font-black text-[9px] uppercase rounded-xl transition-colors ${appDetail.status===k?v.cls:'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                                {v.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Advisor */}
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Assign Advisor</label>
                          <div className="flex gap-2">
                            <input value={appAdvisor} onChange={e => setAppAdvisor(e.target.value)}
                              placeholder="Name or email"
                              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500" />
                            <button onClick={() => handleAppUpdate(appDetail.id, null, appAdvisor, null)}
                              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[9px] uppercase rounded-xl">
                              Assign
                            </button>
                          </div>
                        </div>

                        {/* Notes */}
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Internal Notes</label>
                          <textarea value={appNotes} onChange={e => setAppNotes(e.target.value)} rows={3}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none resize-none" />
                          <button onClick={() => handleAppUpdate(appDetail.id, null, null, appNotes)}
                            className="mt-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-black text-[9px] uppercase rounded-xl flex items-center gap-1">
                            <Save size={12}/> Save Notes
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl flex items-center justify-center text-slate-600 font-bold text-sm h-64">
                      Select an application to manage
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ─── SUPPORT TICKETS ─── */}
          {activeTab === 'support' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-white">Support Tickets</h2>
                <button onClick={loadTickets} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-[10px] uppercase tracking-widest rounded-xl transition-colors">
                  <RefreshCw size={12}/> Refresh
                </button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Ticket list */}
                <div className="space-y-3">
                  {loading ? <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={28}/></div> :
                    tickets.length === 0 ? <div className="text-center py-12 text-slate-500 font-bold">No open tickets.</div> :
                    tickets.map(ticket => (
                      <button key={ticket.id} onClick={() => setSelectedTicket(ticket)}
                        className={`w-full text-left p-5 rounded-2xl border transition-all hover:border-blue-600 ${selectedTicket?.id === ticket.id ? 'border-blue-600 bg-blue-950/20' : 'border-slate-800 bg-slate-900'}`}>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <p className="font-black text-white text-sm">{ticket.user_full_name || '—'}</p>
                            <p className="text-xs text-slate-400">{ticket.user_email}</p>
                          </div>
                          <span className="text-[9px] font-black uppercase text-red-400 bg-red-900/30 px-2 py-1 rounded-full shrink-0">Open</span>
                        </div>
                        {ticket.subject && <p className="text-xs text-slate-400 truncate">{ticket.subject}</p>}
                        <p className="text-[9px] text-slate-600 mt-1">{new Date(ticket.created_at).toLocaleString()}</p>
                      </button>
                    ))
                  }
                </div>

                {/* Ticket conversation panel */}
                {selectedTicket ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl flex flex-col h-[600px]">
                    <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                      <div>
                        <p className="font-black text-white">{selectedTicket.user_full_name || '—'}</p>
                        <p className="text-xs text-slate-400">{selectedTicket.user_email}</p>
                      </div>
                      <button onClick={() => handleCloseTicket(selectedTicket.id)}
                        className="px-3 py-1.5 bg-emerald-900/40 border border-emerald-700/40 text-emerald-400 font-black text-[9px] uppercase rounded-lg hover:bg-emerald-900/60 transition-colors">
                        Close Ticket
                      </button>
                    </div>
                    <TicketMessages ticketId={selectedTicket.id} session={session}/>
                    <div className="p-4 border-t border-slate-800 flex gap-3">
                      <input value={ticketReply} onChange={e => setTicketReply(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleTicketReply()}
                        placeholder="Reply to user..."
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-medium outline-none focus:border-blue-500 transition-colors"/>
                      <button onClick={handleTicketReply} disabled={!ticketReply.trim() || sendingReply}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-black rounded-xl transition-colors flex items-center gap-2">
                        {sendingReply ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl flex items-center justify-center text-slate-600 font-bold text-sm h-[300px]">
                    Select a ticket to view conversation
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── VENTUREX ─── */}
          {activeTab === 'venturex' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-2xl font-black text-white">VentureX Management</h2>
                <div className="flex items-center gap-3">
                  <select value={vtxFilter} onChange={e => setVtxFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none">
                    <option value="">All Statuses</option>
                    {['draft','active','suspended','pending_review','rejected'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button onClick={loadVentureX} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-[10px] uppercase tracking-widest rounded-xl">
                    <RefreshCw size={12}/> Refresh
                  </button>
                </div>
              </div>

              {/* ── QUICK PROSPECT SEND ── */}
              <details className="bg-violet-950/30 border border-violet-800/40 rounded-2xl">
                <summary className="px-6 py-4 cursor-pointer font-black text-violet-300 text-sm flex items-center gap-2">
                  <Send size={14}/> Send Report to Prospect (account may or may not exist)
                </summary>
                <div className="px-6 pb-6 pt-4 border-t border-violet-800/30 space-y-4">
                  <p className="text-[10px] text-violet-400/70 font-bold">Enter name + email + org name — IFB will automatically find or create their account, create their company profile, send an in-app notification, and email them the full readiness report with a Pay & Start link.</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[['full_name','Full Name','text'],['email','Email Address','email'],['company_name','Organization / Company Name','text'],['sector','Sector (optional)','text'],['country','Country (optional)','text']].map(([k,ph,t]) => (
                      <div key={k}>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">{ph}</label>
                        <input type={t} value={prospectForm[k]} onChange={e => setProspectForm(f => ({...f, [k]: e.target.value}))}
                          className="w-full bg-slate-800 border border-slate-700 focus:border-violet-500 rounded-xl px-3 py-2 text-sm text-white outline-none" />
                      </div>
                    ))}
                    <div className="md:col-span-2">
                      <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Estimated Cost Range (USD)</label>
                      <div className="flex gap-2 items-center">
                        <input type="number" value={prospectForm.cost_min} onChange={e => setProspectForm(f => ({...f, cost_min: parseInt(e.target.value)||0}))}
                          className="w-full bg-slate-800 border border-slate-700 focus:border-violet-500 rounded-xl px-3 py-2 text-sm text-white outline-none" placeholder="Min" />
                        <span className="text-slate-500 font-black">–</span>
                        <input type="number" value={prospectForm.cost_max} onChange={e => setProspectForm(f => ({...f, cost_max: parseInt(e.target.value)||0}))}
                          className="w-full bg-slate-800 border border-slate-700 focus:border-violet-500 rounded-xl px-3 py-2 text-sm text-white outline-none" placeholder="Max" />
                      </div>
                    </div>
                  </div>

                  {prospectResult && (
                    <div className="bg-slate-900 border border-emerald-700/40 rounded-xl px-4 py-3 space-y-1">
                      <p className="text-emerald-400 font-black text-xs">{prospectResult.message}</p>
                      <div className="flex flex-wrap gap-3 text-[9px] font-bold text-slate-400">
                        <span>{prospectResult.created_user ? '🆕 New account created' : '✓ Existing account found'}</span>
                        <span>{prospectResult.created_company ? '🆕 Company profile created' : '✓ Existing company found'}</span>
                        <span>{prospectResult.email_sent ? '📧 Email sent' : '⚠ Email failed (check Resend key)'}</span>
                      </div>
                    </div>
                  )}

                  <button onClick={handleSendProspect} disabled={prospectLoading}
                    className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-black text-[10px] uppercase tracking-widest rounded-xl">
                    {prospectLoading ? <Loader2 size={13} className="animate-spin"/> : <Send size={13}/>}
                    {prospectLoading ? 'Creating & Sending...' : 'Create Everything & Send Report'}
                  </button>
                </div>
              </details>

              {/* Create company on behalf */}
              <details className="bg-slate-900 border border-slate-800 rounded-2xl">
                <summary className="px-6 py-4 cursor-pointer font-black text-slate-300 text-sm flex items-center gap-2"><Plus size={14}/> Register Company on Behalf of User</summary>
                <div className="px-6 pb-6 space-y-4 border-t border-slate-800 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[['vtx_uid','User ID (UUID)','text'],['vtx_name','Legal Company Name','text'],['vtx_reg','Registration Number','text'],['vtx_sector','Sector','text'],['vtx_country','Country','text'],['vtx_goal','Funding Goal (USD)','number'],['vtx_raised','Total Raised (USD)','number'],['vtx_valuation','Valuation (USD)','number'],['vtx_teamsize','Team Size','number'],['vtx_website','Website','text'],['vtx_tagline','Tagline','text']].map(([id,ph,type]) => (
                      <div key={id}>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">{ph}</label>
                        <input id={id} type={type} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
                      </div>
                    ))}
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Stage</label>
                      <select id="vtx_stage" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none">
                        {VTX_STAGES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Current Round</label>
                      <select id="vtx_round" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none">
                        {['pre-seed','seed','series-a','series-b','series-c','ipo'].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Initial Status</label>
                      <select id="vtx_status" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none">
                        {['draft','active','pending_review'].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[['vtx_problem','Problem Statement'],['vtx_solution','Solution Statement'],['vtx_competitive','Competitive Advantage'],['vtx_hiring','Hiring Plan']].map(([id,ph]) => (
                      <div key={id}>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">{ph}</label>
                        <textarea id={id} rows={2} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none resize-none" />
                      </div>
                    ))}
                  </div>
                  <button onClick={async () => {
                    const g = id => document.getElementById(id)?.value;
                    const uid = g('vtx_uid'), name = g('vtx_name');
                    if (!uid || !name) { notify('User ID and company name required', 'error'); return; }
                    const { error } = await supabase.rpc('admin_create_venturex_company', {
                      p_user_id: uid, p_legal_name: name, p_sector: g('vtx_sector')||'',
                      p_country: g('vtx_country')||'', p_product_stage: g('vtx_stage')||'idea',
                      p_funding_goal: parseFloat(g('vtx_goal')||'0'),
                      p_current_round: g('vtx_round')||'pre-seed', p_status: g('vtx_status')||'draft'
                    });
                    if (error) { notify(error.message, 'error'); return; }
                    // Apply extra fields via full update (need company ID — refresh and find it)
                    notify('Company created — apply extra fields via Edit below');
                    loadVentureX();
                  }} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center gap-2">
                    <Building2 size={12}/> Create Company
                  </button>
                </div>
              </details>

              {loading ? <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={28}/></div> : (
                <div className="space-y-4">
                  {venturexCos.filter(c => !vtxFilter || c.status === vtxFilter).map(co => {
                    const isEditing = vtxEditId === co.id;
                    const ev = (field) => isEditing && vtxEdits[field] !== undefined ? vtxEdits[field] : co[field];
                    const setEv = (field, val) => setVtxEdits(e => ({...e, [field]: val}));
                    const isProgressOpen = vtxProgressOpen.has(co.id);
                    const cr = computeCapitalReadiness(co);
                    return (
                      <div key={co.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                        {/* Header row */}
                        <div className="p-5 flex flex-col md:flex-row gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-black text-white">{co.legal_name}</p>
                                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${cr.lv.badge}`}>Lv.{cr.lv.n} {cr.lv.label}</span>
                                  <span className="text-[9px] font-black text-slate-500">{cr.pct}% ready · {cr.missing.length} missing</span>
                                </div>
                                <p className="text-xs text-slate-400">{co.user_full_name} · {co.user_email}</p>
                                <p className="text-[10px] text-slate-500">{co.sector} · {co.country}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full shrink-0 ${co.status==='active'?'bg-emerald-900/40 text-emerald-400':co.status==='rejected'?'bg-red-900/40 text-red-400':'bg-slate-700 text-slate-400'}`}>{co.status}</span>
                                <button onClick={() => { setVtxEditId(isEditing ? null : co.id); setVtxEdits({}); }}
                                  className={`p-1.5 rounded-lg border text-[9px] font-black uppercase flex items-center gap-1 transition-colors ${isEditing?'bg-blue-600 border-blue-500 text-white':'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                                  <Pencil size={10}/> {isEditing ? 'Cancel' : 'Edit'}
                                </button>
                                <button onClick={() => setVtxProgressOpen(s => { const n = new Set(s); isProgressOpen ? n.delete(co.id) : n.add(co.id); return n; })}
                                  className={`p-1.5 rounded-lg border text-[9px] font-black uppercase flex items-center gap-1 transition-colors ${isProgressOpen?'bg-violet-600 border-violet-500 text-white':'bg-slate-800 border-slate-700 text-slate-400 hover:border-violet-600'}`}>
                                  <Activity size={10}/> {isProgressOpen ? 'Hide' : 'Readiness'}
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                              {[
                                ['Stage', co.product_stage],['Goal', co.funding_goal?fmtUSD(co.funding_goal):'—'],
                                ['Raised', co.total_raised?fmtUSD(co.total_raised):'—'],['Valuation', co.valuation?fmtUSD(co.valuation):'—'],
                                ['AI Score', co.investment_readiness_score!=null?`${co.investment_readiness_score}%`:'—'],
                                ['KYC', co.user_kyc_status||'—'],
                              ].map(([l,v]) => <div key={l} className="bg-slate-800/50 rounded-lg p-2"><p className="text-[8px] font-black uppercase text-slate-500">{l}</p><p className="text-xs font-bold text-white">{v}</p></div>)}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {[['Financial', co.financial_verified],['Identity', co.identity_verified],['Traction', co.traction_verified],['Public', co.is_public]].map(([l,v]) => (
                                <span key={l} className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${v?'text-emerald-400 border-emerald-700/40':'text-slate-500 border-slate-700'}`}>{l}: {v?'✓':'✗'}</span>
                              ))}
                            </div>
                          </div>
                          {/* Quick action column */}
                          <div className="flex md:flex-col gap-2 md:w-40 shrink-0">
                            {[
                              { label:'Activate', status:'active', cls:'bg-emerald-600/30 text-emerald-400 border-emerald-700/40' },
                              { label:'Suspend', status:'suspended', cls:'bg-red-900/30 text-red-400 border-red-700/40' },
                              { label:'Review', status:'pending_review', cls:'bg-amber-900/30 text-amber-400 border-amber-700/40' },
                              { label:'Reject', status:'rejected', cls:'bg-red-900/50 text-red-400 border-red-700/40' },
                            ].map(({ label, status, cls }) => (
                              <button key={status} onClick={() => handleVxStatus(co.id, status)}
                                className={`flex-1 md:flex-none py-2 px-3 border font-black text-[9px] uppercase tracking-widest rounded-xl transition-colors ${cls}`}>{label}</button>
                            ))}
                            <div className="border-t border-slate-800 pt-2 space-y-1">
                              {[['financial_verified','Financial'],['identity_verified','Identity'],['traction_verified','Traction'],['is_public','Public']].map(([field, label]) => (
                                <button key={field} onClick={async () => {
                                  const args = { p_company_id: co.id, p_status: null, p_financial_verified: null, p_identity_verified: null, p_traction_verified: null, p_is_public: null, p_investment_readiness_score: null };
                                  args[`p_${field}`] = !co[field];
                                  const { error } = await supabase.rpc('admin_update_venturex_company', args);
                                  if (error) notify(error.message, 'error'); else { notify(`${label} toggled`); loadVentureX(); }
                                }} className={`w-full py-1.5 px-2 border font-black text-[8px] uppercase rounded-lg transition-colors ${co[field]?'bg-emerald-900/20 text-emerald-400 border-emerald-700/30':'bg-slate-800 text-slate-400 border-slate-700'}`}>
                                  {co[field]?'✓':''} {label}
                                </button>
                              ))}
                            </div>
                            <div className="border-t border-slate-700 pt-2">
                              <button onClick={() => handleSendProgressReport(co)} disabled={!!vtxSendingReport[co.id]}
                                className="w-full py-2 px-2 border border-violet-700/40 bg-violet-900/20 hover:bg-violet-900/40 text-violet-400 font-black text-[8px] uppercase rounded-lg flex items-center justify-center gap-1 disabled:opacity-50">
                                {vtxSendingReport[co.id] ? <Loader2 size={9} className="animate-spin"/> : <Send size={9}/>}
                                Send Report
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* ── CAPITAL READINESS PANEL ── */}
                        {isProgressOpen && (
                          <div className="border-t border-violet-900/40 p-5 space-y-5 bg-violet-950/20">
                            <div className="flex items-center justify-between flex-wrap gap-3">
                              <p className="text-[10px] font-black uppercase tracking-widest text-violet-400">Capital Readiness — {co.legal_name}</p>
                              <div className="flex items-center gap-3">
                                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full border ${cr.lv.badge}`}>Level {cr.lv.n}/5 · {cr.lv.label}</span>
                                <span className="text-[9px] text-slate-400 font-bold">{cr.metCount}/{cr.total} complete</span>
                              </div>
                            </div>
                            {/* Progress bar */}
                            <div className="space-y-1">
                              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${cr.lv.bar}`} style={{ width: `${cr.pct}%` }}/>
                              </div>
                              <p className="text-[9px] text-slate-500 font-bold">Next milestone: {cr.fundingPhase}</p>
                            </div>
                            {/* Checklist */}
                            <div>
                              <p className="text-[9px] font-black uppercase text-slate-500 mb-2">Documentation & Verification Checklist</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                                {cr.checklist.map(item => (
                                  <div key={item.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[10px] font-bold ${item.met ? 'bg-emerald-900/20 border-emerald-800/40 text-emerald-300' : 'bg-slate-800/60 border-slate-700/60 text-slate-400'}`}>
                                    <span className={`text-[11px] shrink-0 ${item.met ? 'text-emerald-400' : 'text-red-400'}`}>{item.met ? '✓' : '✗'}</span>
                                    <span className="leading-tight">{item.label}</span>
                                    <span className={`ml-auto text-[8px] font-black shrink-0 px-1.5 py-0.5 rounded border ${item.met ? 'text-emerald-600 border-emerald-800/40' : 'text-slate-600 border-slate-700'}`}>{item.ws}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            {/* Workstreams */}
                            <div>
                              <p className="text-[9px] font-black uppercase text-slate-500 mb-2">IFB Workstreams & Support Costs ($30/hr)</p>
                              <div className="space-y-2">
                                {cr.workstreams.map(ws => (
                                  <div key={ws.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-[10px] ${ws.complete ? 'bg-emerald-900/15 border-emerald-800/30' : ws.partial ? 'bg-amber-900/15 border-amber-800/30' : 'bg-slate-800/60 border-slate-700/40'}`}>
                                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${ws.complete ? 'bg-emerald-500 text-white' : ws.partial ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-300'}`}>{ws.id}</span>
                                    <span className={`flex-1 font-bold leading-tight ${ws.complete ? 'text-emerald-300' : ws.partial ? 'text-amber-300' : 'text-slate-300'}`}>{ws.label}</span>
                                    <span className={`text-[9px] font-black shrink-0 ${ws.complete ? 'text-emerald-500' : 'text-slate-500'}`}>{ws.complete ? '✓ Done' : `${ws.hMin}–${ws.hMax}h · $${ws.cMin.toLocaleString()}–$${ws.cMax.toLocaleString()}`}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            {/* Cost summary + send */}
                            <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-violet-900/30">
                              <div>
                                {cr.incomplete.length > 0 ? (
                                  <p className="text-xs font-black text-white">Remaining investment: <span className="text-violet-400">${cr.totalCostMin.toLocaleString()} – ${cr.totalCostMax.toLocaleString()}</span></p>
                                ) : (
                                  <p className="text-xs font-black text-emerald-400">All workstreams complete — ready for funding!</p>
                                )}
                                <p className="text-[9px] text-slate-500">{cr.incomplete.length} workstreams remaining · {cr.missing.length} checklist items missing</p>
                              </div>
                              <button onClick={() => handleSendProgressReport(co)} disabled={!!vtxSendingReport[co.id]}
                                className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-black text-[10px] uppercase tracking-widest rounded-xl">
                                {vtxSendingReport[co.id] ? <Loader2 size={12} className="animate-spin"/> : <Send size={12}/>}
                                Send Progress Report to {(co.user_full_name||'User').split(' ')[0]}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* ── FULL EDITOR (expanded when isEditing) ── */}
                        {isEditing && (
                          <div className="border-t border-slate-700 p-5 space-y-5 bg-slate-800/30">
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Full Company Editor — editing {co.legal_name}</p>

                            {/* Core identity */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {[
                                ['legal_name','Legal Name','text'],['registration_number','Reg Number','text'],
                                ['sector','Sector','text'],['sub_sector','Sub-Sector','text'],
                                ['country','Country','text'],['website','Website','text'],['tagline','Tagline','text'],
                                ['incorporation_date','Incorporation Date','date'],
                              ].map(([field,label,type]) => (
                                <div key={field}>
                                  <label className="block text-[8px] font-black uppercase text-slate-500 mb-1">{label}</label>
                                  <input type={type} value={ev(field)||''} onChange={e => setEv(field, e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500" />
                                </div>
                              ))}
                              <div>
                                <label className="block text-[8px] font-black uppercase text-slate-500 mb-1">Product Stage</label>
                                <select value={ev('product_stage')||'idea'} onChange={e => setEv('product_stage', e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none">
                                  {VTX_STAGES.map(s => <option key={s}>{s}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[8px] font-black uppercase text-slate-500 mb-1">Current Round</label>
                                <select value={ev('current_round')||'pre-seed'} onChange={e => setEv('current_round', e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none">
                                  {['pre-seed','seed','series-a','series-b','series-c','ipo'].map(s => <option key={s}>{s}</option>)}
                                </select>
                              </div>
                            </div>

                            {/* Financials */}
                            <p className="text-[9px] font-black uppercase text-slate-500">Financials & Funding</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {[
                                ['funding_goal','Funding Goal'],['total_raised','Total Raised'],
                                ['valuation','Valuation'],['equity_offered','Equity % Offered'],
                                ['monthly_revenue','Monthly Revenue'],['monthly_burn_rate','Monthly Burn'],
                                ['cash_on_hand','Cash on Hand'],['gross_margin','Gross Margin %'],
                                ['net_profit','Net Profit'],['ebitda','EBITDA'],
                              ].map(([field,label]) => (
                                <div key={field}>
                                  <label className="block text-[8px] font-black uppercase text-slate-500 mb-1">{label}</label>
                                  <input type="number" value={ev(field)||0} onChange={e => setEv(field, parseFloat(e.target.value)||0)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500" />
                                </div>
                              ))}
                            </div>

                            {/* Traction */}
                            <p className="text-[9px] font-black uppercase text-slate-500">Traction & Metrics</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {[
                                ['active_users','Active Users'],['team_size','Team Size'],
                                ['user_growth_rate','User Growth %'],['retention_rate','Retention %'],
                                ['churn_rate','Churn %'],['cac','CAC (USD)'],
                                ['ltv','LTV (USD)'],['conversion_rate','Conversion %'],
                                ['tam','TAM (USD)'],['sam','SAM (USD)'],['som','SOM (USD)'],
                                ['investment_readiness_score','Readiness Score (0-100)'],
                              ].map(([field,label]) => (
                                <div key={field}>
                                  <label className="block text-[8px] font-black uppercase text-slate-500 mb-1">{label}</label>
                                  <input type="number" value={ev(field)||0} onChange={e => setEv(field, parseFloat(e.target.value)||0)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500" />
                                </div>
                              ))}
                            </div>

                            {/* Narrative */}
                            <p className="text-[9px] font-black uppercase text-slate-500">Narrative</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {[['competitive_advantage','Competitive Advantage'],['hiring_plan','Hiring Plan']].map(([field,label]) => (
                                <div key={field}>
                                  <label className="block text-[8px] font-black uppercase text-slate-500 mb-1">{label}</label>
                                  <textarea value={ev(field)||''} onChange={e => setEv(field, e.target.value)} rows={3}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none resize-none" />
                                </div>
                              ))}
                            </div>

                            {/* Risk */}
                            <p className="text-[9px] font-black uppercase text-slate-500">Risk Levels</p>
                            <div className="grid grid-cols-3 gap-3">
                              {[['regulatory_risk','Regulatory'],['market_risk','Market'],['execution_risk','Execution']].map(([field,label]) => (
                                <div key={field}>
                                  <label className="block text-[8px] font-black uppercase text-slate-500 mb-1">{label}</label>
                                  <select value={ev(field)||'medium'} onChange={e => setEv(field, e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none">
                                    {['low','medium','high'].map(r => <option key={r}>{r}</option>)}
                                  </select>
                                </div>
                              ))}
                            </div>

                            {/* Documents */}
                            <p className="text-[9px] font-black uppercase text-slate-500">Documents</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {[
                                ['pitch_deck_url','Pitch Deck'],
                                ['financial_statements_url','Financial Statements'],
                                ['legal_docs_url','Legal Documents'],
                              ].map(([field, label]) => (
                                <div key={field} className="space-y-2">
                                  <label className="block text-[8px] font-black uppercase text-slate-500">{label}</label>
                                  {co[field] && (
                                    <a href={co[field]} target="_blank" rel="noreferrer" className="text-[9px] text-blue-400 underline block truncate">{co[field]}</a>
                                  )}
                                  <input type="text" placeholder="Paste URL or upload below" value={vtxEdits[field]||''} onChange={e => setEv(field, e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none" />
                                  <label className={`flex items-center gap-2 px-3 py-2 border border-dashed border-slate-600 rounded-xl cursor-pointer hover:border-blue-500 text-[9px] font-black uppercase text-slate-400 ${vtxUploading[field]?'opacity-50':''}`}>
                                    {vtxUploading[field] ? <Loader2 size={10} className="animate-spin"/> : <Upload size={10}/>}
                                    Upload File
                                    <input type="file" className="hidden" disabled={vtxUploading[field]}
                                      onChange={e => handleVtxDocUpload(co.id, field, e.target.files[0])} />
                                  </label>
                                </div>
                              ))}
                            </div>

                            {/* Save */}
                            <div className="flex gap-3 pt-2 border-t border-slate-700">
                              <button onClick={() => handleVtxSave(co.id)} disabled={!Object.keys(vtxEdits).length}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center gap-2">
                                <Save size={14}/> Save {Object.keys(vtxEdits).length > 0 ? `${Object.keys(vtxEdits).length} Changes` : ''}
                              </button>
                              <button onClick={() => { setVtxEditId(null); setVtxEdits({}); }}
                                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-xl">
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Document links (below edit area) */}
                        {!isEditing && (
                          <div className="px-5 pb-4 flex gap-2 flex-wrap">
                            {[['Pitch Deck', co.pitch_deck_url],['Financials', co.financial_statements_url],['Legal Docs', co.legal_docs_url]].filter(([,u])=>u).map(([l,u]) => (
                              <a key={l} href={u} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-blue-400 bg-blue-900/20 border border-blue-800/40 px-2 py-1 rounded-lg hover:bg-blue-900/40">
                                <Eye size={10}/>{l}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {venturexCos.filter(c => !vtxFilter || c.status === vtxFilter).length === 0 && (
                    <div className="text-center py-12 text-slate-500 font-bold">No companies found.</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ─── BACK OFFICE ─── */}
          {activeTab === 'backoffice' && (
            <div className="space-y-6 animate-in fade-in">
              <h2 className="text-2xl font-black text-white">Back Office — Full User Control</h2>

              {/* Search bar */}
              <div className="flex gap-3">
                <input value={boSearch} onChange={e => setBoSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && document.getElementById('bo-search-btn')?.click()}
                  placeholder="Search by email or user UUID..."
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500" />
                <button id="bo-search-btn" disabled={boLoading} onClick={async () => {
                  if (!boSearch.trim()) return;
                  setBoLoading(true); setBoUser(null); setBoEdits({}); setBoOverview(null); setBoTab('profile');
                  try {
                    const isUUID = /^[0-9a-f-]{36}$/i.test(boSearch.trim());
                    let uid = boSearch.trim();
                    if (!isUUID) {
                      const { data: p } = await supabase.from('profiles').select('id').ilike('email', boSearch.trim()).maybeSingle();
                      uid = p?.id;
                    }
                    if (!uid) { notify('User not found', 'error'); return; }
                    const [{ data: full }] = await Promise.all([
                      supabase.rpc('admin_get_user_full', { p_user_id: uid }),
                    ]);
                    setBoUser(full);
                    setBoEdits({});
                    loadBoOverview(uid);
                  } catch(e) { notify(e.message, 'error'); }
                  finally { setBoLoading(false); }
                }} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 disabled:opacity-50">
                  {boLoading ? <Loader2 size={14} className="animate-spin"/> : <Search size={14}/>} Search
                </button>
              </div>

              {boUser && (() => {
                const p = boUser.profile || {};
                const kyc = boUser.kyc || {};
                const bals = boUser.balances || [];
                const editField = (key, val) => setBoEdits(e => ({...e, [key]: val}));
                const curVal = (key) => boEdits[key] !== undefined ? boEdits[key] : (p[key] ?? '');
                const ov = boOverview || {};

                return (
                  <div className="space-y-5">
                    {/* User banner */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-2xl shrink-0">
                        {(p.full_name||p.email||'U')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-white text-lg">{p.full_name || '—'}</p>
                        <p className="text-slate-400 text-sm">{p.email}</p>
                        <p className="text-[10px] text-slate-600 font-mono mt-0.5">{p.id}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border ${p.kyc_status==='approved'||p.kyc_status==='verified'?'text-emerald-400 border-emerald-700/40':'text-amber-400 border-amber-700/40'}`}>{p.kyc_status||'unverified'}</span>
                        <span className="text-[9px] text-slate-500 font-black uppercase">{p.role||'user'}</span>
                      </div>
                    </div>

                    {/* Balances strip */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {bals.map(b => (
                        <div key={b.currency_code} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                          <p className="text-[9px] font-black uppercase text-slate-500">{b.currency_code} Balance</p>
                          <p className="text-xl font-black text-white mt-1">{Number(b.balance||0).toLocaleString()}</p>
                        </div>
                      ))}
                      {(ov.applications||[]).length > 0 && (
                        <div className="bg-indigo-900/20 border border-indigo-700/40 rounded-2xl p-4">
                          <p className="text-[9px] font-black uppercase text-indigo-400">IFB Applications</p>
                          <p className="text-xl font-black text-white mt-1">{(ov.applications||[]).length}</p>
                        </div>
                      )}
                      {(ov.companies||[]).length > 0 && (
                        <div className="bg-blue-900/20 border border-blue-700/40 rounded-2xl p-4">
                          <p className="text-[9px] font-black uppercase text-blue-400">VentureX Companies</p>
                          <p className="text-xl font-black text-white mt-1">{(ov.companies||[]).length}</p>
                        </div>
                      )}
                    </div>

                    {/* Inner tab bar */}
                    <div className="flex overflow-x-auto no-scrollbar border-b border-slate-800">
                      {[
                        { id:'profile',       label:'Profile & KYC',    icon: UserCog },
                        { id:'applications',  label:'Applications',     icon: Rocket },
                        { id:'companies',     label:'VentureX',         icon: Building2 },
                        { id:'notifications', label:'Notifications',    icon: Bell },
                        { id:'transactions',  label:'Transactions',     icon: Activity },
                      ].map(({ id, label, icon: Icon }) => (
                        <button key={id} onClick={() => setBoTab(id)}
                          className={`flex items-center gap-2 px-5 py-3 whitespace-nowrap text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${boTab===id?'border-blue-500 text-blue-400':'border-transparent text-slate-500 hover:text-slate-300'}`}>
                          <Icon size={12}/>{label}
                        </button>
                      ))}
                    </div>

                    {/* ── Profile & KYC ── */}
                    {boTab === 'profile' && (
                      <div className="space-y-5">
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5">
                          <p className="font-black text-white text-sm">Edit Profile</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                              { key:'full_name', label:'Full Name' }, { key:'email', label:'Email' },
                              { key:'phone', label:'Phone' }, { key:'country', label:'Country' },
                              { key:'dob', label:'Date of Birth' }, { key:'employer', label:'Employer' },
                              { key:'source_of_revenue', label:'Source of Revenue' },
                              { key:'residential_address', label:'Residential Address' },
                            ].map(({ key, label }) => (
                              <div key={key}>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">{label}</label>
                                <input value={curVal(key)} onChange={e => editField(key, e.target.value)}
                                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">KYC Status</label>
                              <select value={curVal('kyc_status')} onChange={e => editField('kyc_status', e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none">
                                {['unverified','pending_kyc','verified','approved','rejected'].map(s => <option key={s}>{s}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Role</label>
                              <select value={curVal('role')} onChange={e => editField('role', e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none">
                                {['user','admin','admin_l3','superadmin','is_cot_processor'].map(s => <option key={s}>{s}</option>)}
                              </select>
                            </div>
                          </div>
                          {Object.keys(boEdits).length > 0 && (
                            <button onClick={async () => {
                              const { error } = await supabase.rpc('admin_update_any_profile', { p_user_id: p.id, p_updates: boEdits });
                              if (error) notify(error.message, 'error');
                              else {
                                notify('Profile updated');
                                const { data } = await supabase.rpc('admin_get_user_full', { p_user_id: p.id });
                                setBoUser(data); setBoEdits({});
                              }
                            }} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2">
                              <CheckCircle size={14}/> Save {Object.keys(boEdits).length} Change{Object.keys(boEdits).length > 1 ? 's' : ''}
                            </button>
                          )}
                        </div>

                        {/* KYC Submission */}
                        {kyc && Object.keys(kyc).length > 0 && (
                          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                            <p className="font-black text-white text-sm">KYC Submission</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {[['Status', kyc.status],['Risk', kyc.risk_rating],['AI Score', kyc.ai_confidence_score!=null?`${kyc.ai_confidence_score}%`:'—'],['AI Rec.', kyc.ai_recommendation],
                                ['Nationality', kyc.nationality],['ID Type', kyc.id_type],['ID Number', kyc.id_number],['PEP', kyc.politically_exposed_person?'⚠️ YES':'No']
                              ].map(([l,v]) => (
                                <div key={l} className="bg-slate-800/50 rounded-xl p-3">
                                  <p className="text-[8px] font-black uppercase text-slate-500">{l}</p>
                                  <p className="text-xs font-bold text-white">{v||'—'}</p>
                                </div>
                              ))}
                            </div>
                            {kyc.ai_flags?.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {kyc.ai_flags.map(f => <span key={f} className="text-[9px] font-black text-amber-400 bg-amber-900/20 border border-amber-700/30 px-2 py-0.5 rounded-lg">{f.replace(/_/g,' ')}</span>)}
                              </div>
                            )}
                            <div className="flex flex-wrap gap-2">
                              {[['ID Front',kyc.id_front_url],['ID Back',kyc.id_back_url],['Selfie',kyc.selfie_url],['Selfie+ID',kyc.selfie_with_id_url],
                                ['Address Proof',kyc.proof_of_address_url],['Income',kyc.proof_of_income_url],['Bank Stmt',kyc.bank_statement_url]
                              ].filter(([,u])=>u).map(([l,u]) => (
                                <a key={l} href={u} target="_blank" rel="noreferrer" className="text-[9px] font-black uppercase text-blue-400 bg-blue-900/20 border border-blue-800/40 px-2 py-1 rounded-lg hover:bg-blue-900/40 flex items-center gap-1">
                                  <Eye size={10}/>{l}
                                </a>
                              ))}
                            </div>
                            <div className="flex gap-3 pt-2 border-t border-slate-800">
                              <button onClick={() => handleKycAction(p.id, 'approved', 'Admin manual approval')} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[9px] uppercase rounded-xl flex items-center gap-1"><CheckCircle size={12}/> Approve KYC</button>
                              <button onClick={() => handleKycAction(p.id, 'needs_more_info', 'Admin requested more info')} className="px-4 py-2 bg-amber-600/30 border border-amber-700/40 text-amber-400 font-black text-[9px] uppercase rounded-xl flex items-center gap-1"><AlertTriangle size={12}/> Request Info</button>
                              <button onClick={() => handleKycAction(p.id, 'rejected', 'Admin rejection')} className="px-4 py-2 bg-red-900/40 border border-red-700/40 text-red-400 font-black text-[9px] uppercase rounded-xl flex items-center gap-1"><X size={12}/> Reject</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── Applications (view as user) ── */}
                    {boTab === 'applications' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="font-black text-white text-sm">IFB Applications for {p.full_name}</p>
                          <button onClick={() => {
                            setAppForm(f => ({...f, user_id: p.id}));
                            setActiveTab('applications');
                            setShowCreateApp(true);
                          }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[9px] uppercase tracking-widest rounded-xl">
                            <Plus size={12}/> New Application
                          </button>
                        </div>
                        {boOverviewLoading ? <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={24}/></div> :
                          (ov.applications||[]).length === 0
                            ? <div className="text-center py-12 text-slate-500 font-bold">No applications yet.</div>
                            : (ov.applications||[]).map(app => {
                                const sm = APP_STATUS_META[app.status] || APP_STATUS_META.under_review;
                                const pm = PACKAGES_META[app.package_id];
                                return (
                                  <div key={app.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <p className="font-black text-white">{app.company_name}</p>
                                        <p className="text-xs text-slate-400">{app.sector} · {app.country} · Stage: {app.stage?.replace(/_/g,' ')}</p>
                                      </div>
                                      <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full border shrink-0 ${sm.cls}`}>{sm.label}</span>
                                    </div>
                                    <div className="flex items-center gap-4 flex-wrap">
                                      <span className={`text-[9px] font-black ${pm?.color||'text-slate-400'}`}>{app.package_name}</span>
                                      {app.assigned_advisor && <span className="text-[9px] text-emerald-400">Advisor: {app.assigned_advisor}</span>}
                                      <span className="text-[9px] text-slate-500">{new Date(app.created_at).toLocaleDateString()}</span>
                                    </div>
                                    {app.notes && <p className="text-[10px] text-slate-500 bg-slate-800/50 rounded-lg p-2">{app.notes}</p>}
                                    <div className="flex gap-2 flex-wrap">
                                      {Object.entries(APP_STATUS_META).map(([k,v]) => (
                                        <button key={k} onClick={() => handleAppUpdate(app.id, k, null, null).then(() => loadBoOverview(p.id))}
                                          className={`px-3 py-1.5 border font-black text-[8px] uppercase rounded-lg transition-colors ${app.status===k?v.cls:'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-600'}`}>
                                          {v.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })
                        }
                      </div>
                    )}

                    {/* ── VentureX Companies (view as user) ── */}
                    {boTab === 'companies' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="font-black text-white text-sm">VentureX Companies for {p.full_name}</p>
                          <button onClick={() => setActiveTab('venturex')}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-[9px] uppercase tracking-widest rounded-xl">
                            <Building2 size={12}/> Manage in VentureX
                          </button>
                        </div>
                        {boOverviewLoading ? <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={24}/></div> :
                          (ov.companies||[]).length === 0
                            ? <div className="text-center py-12 text-slate-500 font-bold">No companies yet.</div>
                            : (ov.companies||[]).map(co => (
                                <div key={co.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="font-black text-white">{co.legal_name}</p>
                                      <p className="text-xs text-slate-400">{co.sector} · {co.country}</p>
                                    </div>
                                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full shrink-0 ${co.status==='active'?'bg-emerald-900/40 text-emerald-400':co.status==='rejected'?'bg-red-900/40 text-red-400':'bg-slate-700 text-slate-400'}`}>{co.status}</span>
                                  </div>
                                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                                    {[['Stage',co.product_stage],['Goal',co.funding_goal?fmtUSD(co.funding_goal):'—'],['Raised',co.total_raised?fmtUSD(co.total_raised):'—'],
                                      ['Valuation',co.valuation?fmtUSD(co.valuation):'—'],['Score',co.investment_readiness_score!=null?`${co.investment_readiness_score}%`:'—'],
                                    ].map(([l,v]) => <div key={l} className="bg-slate-800/50 rounded-lg p-2"><p className="text-[8px] font-black uppercase text-slate-500">{l}</p><p className="text-xs font-bold text-white">{v}</p></div>)}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {[['Financial',co.financial_verified],['Identity',co.identity_verified],['Traction',co.traction_verified],['Public',co.is_public]].map(([l,v]) => (
                                      <span key={l} className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${v?'text-emerald-400 border-emerald-700/40':'text-slate-600 border-slate-700'}`}>{l}: {v?'✓':'✗'}</span>
                                    ))}
                                  </div>
                                  <div className="flex gap-2 flex-wrap">
                                    {[['active','Activate','text-emerald-400 border-emerald-700/40'],['suspended','Suspend','text-red-400 border-red-700/40'],['pending_review','Review','text-amber-400 border-amber-700/40'],['rejected','Reject','text-red-400 border-red-700/40']].map(([s,l,cls]) => (
                                      <button key={s} onClick={() => handleVxStatus(co.id, s).then(() => loadBoOverview(p.id))}
                                        className={`px-3 py-1.5 border font-black text-[8px] uppercase rounded-lg ${co.status===s?cls+' bg-slate-800':'bg-slate-800 border-slate-700 text-slate-500'}`}>{l}</button>
                                    ))}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {[['Pitch Deck',co.pitch_deck_url],['Financials',co.financial_statements_url],['Legal Docs',co.legal_docs_url]].filter(([,u])=>u).map(([l,u]) => (
                                      <a key={l} href={u} target="_blank" rel="noreferrer" className="text-[9px] text-blue-400 bg-blue-900/20 border border-blue-800/40 px-2 py-1 rounded-lg flex items-center gap-1">
                                        <Eye size={10}/>{l}
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              ))
                        }
                      </div>
                    )}

                    {/* ── Notifications (view as user) ── */}
                    {boTab === 'notifications' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="font-black text-white text-sm">Notifications for {p.full_name}</p>
                          <button onClick={async () => {
                            const msg = window.prompt('Send notification message:');
                            if (!msg) return;
                            await supabase.from('notifications').insert([{ user_id: p.id, type: 'admin', message: msg, read: false, status: 'completed' }]);
                            notify('Notification sent');
                            loadBoOverview(p.id);
                          }} className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-black text-[9px] uppercase tracking-widest rounded-xl">
                            <Bell size={12}/> Send Notification
                          </button>
                        </div>
                        {boOverviewLoading ? <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={24}/></div> :
                          (ov.notifications||[]).length === 0
                            ? <div className="text-center py-12 text-slate-500 font-bold">No notifications.</div>
                            : (ov.notifications||[]).map(n => (
                                <div key={n.id} className={`p-4 rounded-2xl border ${n.read?'border-slate-800 bg-slate-900/50':'border-blue-800/40 bg-blue-950/20'}`}>
                                  <div className="flex items-start justify-between gap-3">
                                    <p className="text-sm text-white leading-relaxed">{n.message}</p>
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded shrink-0 ${n.read?'text-slate-600':'text-blue-400'}`}>{n.read?'Read':'Unread'}</span>
                                  </div>
                                  <p className="text-[10px] text-slate-600 mt-1">{new Date(n.created_at).toLocaleString()} · {n.type}</p>
                                </div>
                              ))
                        }
                      </div>
                    )}

                    {/* ── Transactions (view as user) ── */}
                    {boTab === 'transactions' && (
                      <div className="space-y-4">
                        <p className="font-black text-white text-sm">Transactions for {p.full_name}</p>
                        {boOverviewLoading ? <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={24}/></div> :
                          (ov.transactions||[]).length === 0
                            ? <div className="text-center py-12 text-slate-500 font-bold">No transactions.</div>
                            : (
                              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="border-b border-slate-800 text-[9px] font-black uppercase tracking-widest text-slate-500">
                                        {['Source','Type','Amount','Currency','Status','Date'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(ov.transactions||[]).map((tx, i) => (
                                        <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                                          <td className="px-4 py-3"><span className="text-[9px] font-black uppercase text-purple-400 bg-purple-900/20 px-2 py-0.5 rounded">{tx.source}</span></td>
                                          <td className="px-4 py-3 text-slate-300 font-bold">{tx.tx_type?.replace(/_/g,' ')}</td>
                                          <td className="px-4 py-3 font-black text-white">{tx.amount != null ? Number(tx.amount).toLocaleString() : '—'}</td>
                                          <td className="px-4 py-3 text-slate-400">{tx.currency}</td>
                                          <td className="px-4 py-3"><span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${tx.status==='completed'||tx.status==='confirmed'?'text-emerald-400':'text-amber-400'}`}>{tx.status||'—'}</span></td>
                                          <td className="px-4 py-3 text-slate-500">{tx.created_at ? new Date(tx.created_at).toLocaleDateString() : '—'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )
                        }
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ─── BROADCAST ─── */}
          {activeTab === 'announce' && (
            <div className="space-y-6 animate-in fade-in max-w-2xl">
              <h2 className="text-2xl font-black text-white">Platform Broadcast</h2>
              <div className="bg-amber-900/20 border border-amber-700/30 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5"/>
                <p className="text-xs text-amber-200 font-medium">This will send a notification to all active platform users. Use responsibly for important announcements only.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Announcement Title</label>
                  <input value={broadcastTitle} onChange={e => setBroadcastTitle(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold text-sm outline-none focus:border-blue-500 transition-colors"
                    placeholder="e.g. IFB Platform Update — May 2026"/>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Message</label>
                  <textarea value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} rows={5}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-medium text-sm outline-none focus:border-blue-500 transition-colors resize-none"
                    placeholder="Write your announcement here..."/>
                </div>
                <button onClick={handleBroadcast} disabled={!broadcastTitle.trim() || !broadcastMsg.trim() || broadcasting}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 text-white font-black text-sm uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-all">
                  {broadcasting ? <><Loader2 size={16} className="animate-spin"/>Sending...</> : <><Bell size={16}/>Broadcast to All Users</>}
                </button>
              </div>
            </div>
          )}

          {/* ─── ADMIN ROLES ─── */}
          {activeTab === 'roles' && (
            <div className="space-y-8 animate-in fade-in">
              <h2 className="text-2xl font-black text-white">Admin Role Management</h2>

              {/* Add new admin */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <h3 className="font-black text-white">Grant Admin Access</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">User Email</label>
                    <input value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold text-sm outline-none focus:border-blue-500 transition-colors"
                      placeholder="user@email.com"/>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Admin Level</label>
                    <select value={newAdminRole} onChange={e => setNewAdminRole(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold text-sm outline-none focus:border-blue-500 transition-colors">
                      {Object.entries(ROLE_META).filter(([k]) => k !== 'super').map(([key, meta]) => (
                        <option key={key} value={key}>{meta.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button onClick={handleAddAdmin} disabled={!newAdminEmail.trim() || addingAdmin}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-colors flex items-center gap-2">
                  {addingAdmin ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14}/>} Grant Access
                </button>
              </div>

              {/* Current admins */}
              {loading ? <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={28}/></div> : (
                <div className="space-y-3">
                  {adminRoles.map(ar => {
                    const meta = ROLE_META[ar.role];
                    return (
                      <div key={ar.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center font-black text-white">
                            {(ar.email || 'A')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-black text-white text-sm">{ar.email}</p>
                            <p className="text-[9px] text-slate-500 uppercase">{meta?.desc}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-full border ${meta?.color || ''} ${!ar.is_active ? 'opacity-40' : ''}`}>
                            {meta?.label || ar.role} {!ar.is_active && '(Revoked)'}
                          </span>
                          {ar.user_id !== session.user.id && ar.is_active && (
                            <button onClick={() => handleRevokeAdmin(ar.id)}
                              className="px-3 py-1.5 bg-red-900/40 border border-red-700/40 text-red-400 font-black text-[9px] uppercase rounded-lg hover:bg-red-900/60 transition-colors">
                              Revoke
                            </button>
                          )}
                          {ar.user_id === session.user.id && (
                            <span className="text-[9px] text-slate-600 uppercase font-bold">You</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Ticket messages sub-component (real-time)
function TicketMessages({ ticketId, session }) {
  const [messages, setMessages] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    supabase.from('support_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true })
      .then(({ data }) => { setMessages(data || []); });

    const channel = supabase.channel(`admin_ticket_${ticketId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${ticketId}` },
        (payload) => setMessages(prev => [...prev, payload.new]))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [ticketId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.map(m => (
        <div key={m.id} className={`flex ${m.sender_type === 'agent' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${m.sender_type === 'agent' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none'}`}>
            {m.sender_type === 'agent' && <p className="text-[9px] font-black text-blue-200 uppercase mb-1">Admin</p>}
            {m.message}
          </div>
        </div>
      ))}
      <div ref={bottomRef}/>
    </div>
  );
}
