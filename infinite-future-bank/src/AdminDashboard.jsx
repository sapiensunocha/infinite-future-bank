import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './services/supabaseClient';
import {
  Shield, Users, DollarSign, BarChart3, Ticket, Globe, Settings,
  Search, CheckCircle, X, AlertTriangle, Loader2, RefreshCw,
  Eye, EyeOff, Ban, UserCheck, ChevronRight, Activity,
  TrendingUp, ArrowUpRight, FileText, Clock, Filter,
  ShieldCheck, ShieldAlert, Plus, Trash2, Edit2, Send,
  Building2, Lock, Unlock, Database, Zap, Bell
} from 'lucide-react';

const ROLE_META = {
  super:   { label: 'Super Admin',    color: 'text-red-400    bg-red-900/30    border-red-700',    desc: 'Full platform access' },
  ops:     { label: 'Operations',     color: 'text-blue-400   bg-blue-900/30   border-blue-700',   desc: 'User & KYC management' },
  finance: { label: 'Finance',        color: 'text-amber-400  bg-amber-900/30  border-amber-700',  desc: 'Transactions & balances' },
  support: { label: 'Support',        color: 'text-emerald-400 bg-emerald-900/30 border-emerald-700', desc: 'Tickets & user messages' },
  content: { label: 'Content',        color: 'text-purple-400 bg-purple-900/30 border-purple-700', desc: 'VentureX & announcements' },
};

const TABS = [
  { id: 'overview',     label: 'Overview',       icon: BarChart3,  roles: ['super','ops','finance','support','content'] },
  { id: 'register',     label: 'Register User',  icon: UserCheck,  roles: ['super','ops'] },
  { id: 'users',        label: 'Users',          icon: Users,      roles: ['super','ops','support'] },
  { id: 'kyc',          label: 'KYC Review',     icon: ShieldCheck,roles: ['super','ops'] },
  { id: 'documents',    label: 'Documents',      icon: FileText,   roles: ['super','ops'] },
  { id: 'transactions', label: 'Transactions',   icon: Activity,   roles: ['super','finance'] },
  { id: 'finance',      label: 'P2P Orders',     icon: DollarSign, roles: ['super','finance'] },
  { id: 'support',      label: 'Support',        icon: Ticket,     roles: ['super','support','ops'] },
  { id: 'venturex',     label: 'VentureX',       icon: Globe,      roles: ['super','content'] },
  { id: 'backoffice',   label: 'Back Office',    icon: Database,   roles: ['super'] },
  { id: 'announce',     label: 'Broadcast',      icon: Bell,       roles: ['super','content','ops'] },
  { id: 'roles',        label: 'Admin Roles',    icon: Shield,     roles: ['super'] },
];

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
  // Back office
  const [boUser, setBoUser] = useState(null);
  const [boSearch, setBoSearch] = useState('');
  const [boLoading, setBoLoading] = useState(false);
  const [boEdits, setBoEdits] = useState({});
  // Tx filter
  const [txSearch, setTxSearch] = useState('');

  // UI states
  const [loading, setLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
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
      await supabase.from('venturex_companies').update({ status }).eq('id', id);
      notify(`Company status updated to ${status}`);
      loadVentureX();
    } catch (e) { notify(e.message, 'error'); }
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
                              <button onClick={() => setSelectedUser(user)}
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
                <div className="fixed inset-y-0 right-0 w-full md:w-96 bg-slate-900 border-l border-slate-800 z-50 flex flex-col shadow-2xl animate-in slide-in-from-right-4">
                  <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="font-black text-white">User Details</h3>
                    <button onClick={() => setSelectedUser(null)} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400"><X size={18}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-2xl mx-auto">
                      {(selectedUser.full_name || selectedUser.email || 'U')[0].toUpperCase()}
                    </div>
                    <div className="text-center">
                      <p className="font-black text-white text-lg">{selectedUser.full_name || '—'}</p>
                      <p className="text-slate-400 text-sm">{selectedUser.email}</p>
                    </div>
                    {[
                      { label: 'User ID', val: selectedUser.id?.slice(0, 16) + '...' },
                      { label: 'Country', val: selectedUser.country || '—' },
                      { label: 'KYC Status', val: selectedUser.kyc_status || 'unverified' },
                      { label: 'Liquid Balance', val: fmtUSD(selectedUser.liquid_usd) },
                      { label: 'Vault Balance', val: fmtUSD(selectedUser.mysafe_digital_usd) },
                      { label: 'Joined', val: selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString() : '—' },
                    ].map(({ label, val }) => (
                      <div key={label} className="flex justify-between p-3 bg-slate-800/60 rounded-xl">
                        <span className="text-[10px] font-black uppercase text-slate-500">{label}</span>
                        <span className="text-xs font-black text-white text-right">{val}</span>
                      </div>
                    ))}
                    {canAccess('kyc') && selectedUser.kyc_status !== 'verified' && (
                      <div className="space-y-2 pt-2">
                        <button onClick={() => { handleKycAction(selectedUser.id, 'verified'); setSelectedUser(null); }}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-colors flex items-center justify-center gap-2">
                          <UserCheck size={14}/> Verify KYC
                        </button>
                        <button onClick={() => { handleKycAction(selectedUser.id, 'rejected'); setSelectedUser(null); }}
                          className="w-full py-3 bg-red-900/50 hover:bg-red-900/80 border border-red-700/40 text-red-400 font-black text-[10px] uppercase tracking-widest rounded-xl transition-colors flex items-center justify-center gap-2">
                          <Ban size={14}/> Reject KYC
                        </button>
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
              {/* Create company on behalf */}
              <details className="bg-slate-900 border border-slate-800 rounded-2xl">
                <summary className="px-6 py-4 cursor-pointer font-black text-slate-300 text-sm flex items-center gap-2"><Plus size={14}/> Register Company on Behalf of User</summary>
                <div className="px-6 pb-6 space-y-4 border-t border-slate-800 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[['vtx_uid','User ID (UUID)','text'],['vtx_name','Legal Company Name','text'],['vtx_sector','Sector','text'],['vtx_country','Country','text'],['vtx_goal','Funding Goal (USD)','number']].map(([id,ph,type]) => (
                      <div key={id}>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">{ph}</label>
                        <input id={id} type={type} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
                      </div>
                    ))}
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Stage</label>
                      <select id="vtx_stage" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none">
                        {['idea','mvp','growth','scale','ipo_ready'].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <button onClick={async () => {
                    const uid = document.getElementById('vtx_uid')?.value;
                    const name = document.getElementById('vtx_name')?.value;
                    const sector = document.getElementById('vtx_sector')?.value;
                    const country = document.getElementById('vtx_country')?.value;
                    const goal = parseFloat(document.getElementById('vtx_goal')?.value || '0');
                    const stage = document.getElementById('vtx_stage')?.value;
                    if (!uid || !name) { notify('User ID and company name required', 'error'); return; }
                    const { error } = await supabase.rpc('admin_create_venturex_company', {
                      p_user_id: uid, p_legal_name: name, p_sector: sector||'', p_country: country||'',
                      p_product_stage: stage||'idea', p_funding_goal: goal, p_current_round: 'pre-seed', p_status: 'draft'
                    });
                    if (error) notify(error.message, 'error');
                    else { notify('Company created successfully'); loadVentureX(); }
                  }} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center gap-2">
                    <Building2 size={12}/> Create Company
                  </button>
                </div>
              </details>
              {loading ? <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={28}/></div> : (
                <div className="space-y-3">
                  {venturexCos.filter(c => !vtxFilter || c.status === vtxFilter).map(co => (
                    <div key={co.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                      <div className="p-5 flex flex-col md:flex-row gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-black text-white">{co.legal_name}</p>
                              <p className="text-xs text-slate-400">{co.user_full_name} · {co.user_email}</p>
                              <p className="text-[10px] text-slate-500">{co.sector} · {co.country}</p>
                            </div>
                            <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full shrink-0 ${co.status==='active'?'bg-emerald-900/40 text-emerald-400':co.status==='rejected'?'bg-red-900/40 text-red-400':'bg-slate-700 text-slate-400'}`}>{co.status}</span>
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
                          {[['Pitch Deck', co.pitch_deck_url],['Financials', co.financial_statements_url],['Legal Docs', co.legal_docs_url]].filter(([,u])=>u).map(([l,u]) => (
                            <a key={l} href={u} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-blue-400 bg-blue-900/20 border border-blue-800/40 px-2 py-1 rounded-lg mr-2 hover:bg-blue-900/40">
                              <Eye size={10}/>{l}
                            </a>
                          ))}
                        </div>
                        <div className="flex md:flex-col gap-2 md:w-40 shrink-0">
                          {[
                            { label:'Activate', status:'active', cls:'bg-emerald-600/30 text-emerald-400 border-emerald-700/40' },
                            { label:'Suspend', status:'suspended', cls:'bg-red-900/30 text-red-400 border-red-700/40' },
                            { label:'Pending Review', status:'pending_review', cls:'bg-amber-900/30 text-amber-400 border-amber-700/40' },
                            { label:'Reject', status:'rejected', cls:'bg-red-900/50 text-red-400 border-red-700/40' },
                          ].map(({ label, status, cls }) => (
                            <button key={status} onClick={async () => {
                              const { error } = await supabase.rpc('admin_update_venturex_company', {
                                p_company_id: co.id, p_status: status,
                                p_financial_verified: null, p_identity_verified: null,
                                p_traction_verified: null, p_is_public: null, p_investment_readiness_score: null,
                              });
                              if (error) notify(error.message, 'error'); else { notify(`Company set to ${status}`); loadVentureX(); }
                            }} className={`flex-1 md:flex-none py-2 px-3 border font-black text-[9px] uppercase tracking-widest rounded-xl transition-colors ${cls}`}>{label}</button>
                          ))}
                          <div className="border-t border-slate-800 pt-2 space-y-1">
                            {[['financial_verified','Financial'],['identity_verified','Identity'],['traction_verified','Traction'],['is_public','Make Public']].map(([field, label]) => (
                              <button key={field} onClick={async () => {
                                const args: Record<string,unknown> = {
                                  p_company_id: co.id, p_status: null,
                                  p_financial_verified: null, p_identity_verified: null,
                                  p_traction_verified: null, p_is_public: null, p_investment_readiness_score: null,
                                  [`p_${field}`]: !co[field],
                                };
                                const { error } = await supabase.rpc('admin_update_venturex_company', args);
                                if (error) notify(error.message, 'error'); else { notify(`${label} toggled`); loadVentureX(); }
                              }} className={`w-full py-1.5 px-2 border font-black text-[8px] uppercase rounded-lg transition-colors ${co[field]?'bg-emerald-900/20 text-emerald-400 border-emerald-700/30':'bg-slate-800 text-slate-400 border-slate-700'}`}>
                                {co[field]?'✓':''} {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
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
              <h2 className="text-2xl font-black text-white">Back Office — User Editor</h2>
              <div className="flex gap-3">
                <input value={boSearch} onChange={e => setBoSearch(e.target.value)}
                  placeholder="Search by email or user ID..."
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500" />
                <button disabled={boLoading} onClick={async () => {
                  if (!boSearch.trim()) return;
                  setBoLoading(true); setBoUser(null); setBoEdits({});
                  try {
                    const isUUID = /^[0-9a-f-]{36}$/i.test(boSearch.trim());
                    let uid = boSearch.trim();
                    if (!isUUID) {
                      const { data: p } = await supabase.from('profiles').select('id').ilike('email', boSearch.trim()).maybeSingle();
                      uid = p?.id;
                    }
                    if (!uid) { notify('User not found', 'error'); return; }
                    const { data } = await supabase.rpc('admin_get_user_full', { p_user_id: uid });
                    setBoUser(data);
                    setBoEdits({});
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
                return (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {bals.map(b => (
                        <div key={b.currency_code} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                          <p className="text-[9px] font-black uppercase text-slate-500">{b.currency_code} Balance</p>
                          <p className="text-2xl font-black text-white mt-1">{Number(b.balance||0).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5">
                      <div className="flex items-center justify-between">
                        <p className="font-black text-white">Profile — {p.full_name}</p>
                        <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border ${p.kyc_status==='approved'||p.kyc_status==='verified'?'text-emerald-400 border-emerald-700/40':'text-amber-400 border-amber-700/40'}`}>{p.kyc_status}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { key:'full_name', label:'Full Name' }, { key:'email', label:'Email' },
                          { key:'phone', label:'Phone' }, { key:'country', label:'Country' },
                          { key:'dob', label:'Date of Birth' }, { key:'employer', label:'Employer' },
                          { key:'source_of_revenue', label:'Source of Revenue' }, { key:'residential_address', label:'Residential Address' },
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
                          else { notify('Profile updated'); const { data } = await supabase.rpc('admin_get_user_full', { p_user_id: p.id }); setBoUser(data); setBoEdits({}); }
                        }} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2">
                          <CheckCircle size={14}/> Save {Object.keys(boEdits).length} Change{Object.keys(boEdits).length > 1 ? 's' : ''}
                        </button>
                      )}
                    </div>
                    {kyc && Object.keys(kyc).length > 0 && (
                      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                        <p className="font-black text-white mb-4">KYC Submission</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {[['Status', kyc.status],['Risk', kyc.risk_rating],['AI Score', kyc.ai_confidence_score != null ? `${kyc.ai_confidence_score}%` : '—'],['AI Rec.', kyc.ai_recommendation],
                            ['Nationality', kyc.nationality],['ID Type', kyc.id_type],['ID Number', kyc.id_number],['PEP', kyc.politically_exposed_person ? '⚠️ YES' : 'No']
                          ].map(([l,v]) => <div key={l} className="bg-slate-800/50 rounded-xl p-3"><p className="text-[8px] font-black uppercase text-slate-500">{l}</p><p className="text-xs font-bold text-white">{v||'—'}</p></div>)}
                        </div>
                        {kyc.ai_flags?.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {kyc.ai_flags.map(f => <span key={f} className="text-[9px] font-black text-amber-400 bg-amber-900/20 border border-amber-700/30 px-2 py-0.5 rounded-lg">{f.replace(/_/g,' ')}</span>)}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {[['ID Front',kyc.id_front_url],['ID Back',kyc.id_back_url],['Selfie',kyc.selfie_url],['Selfie+ID',kyc.selfie_with_id_url],
                            ['Address Proof',kyc.proof_of_address_url],['Income',kyc.proof_of_income_url],['Bank Stmt',kyc.bank_statement_url]
                          ].filter(([,u])=>u).map(([l,u]) => (
                            <a key={l} href={u} target="_blank" rel="noreferrer" className="text-[9px] font-black uppercase text-blue-400 bg-blue-900/20 border border-blue-800/40 px-2 py-1 rounded-lg hover:bg-blue-900/40 flex items-center gap-1">
                              <Eye size={10}/>{l}
                            </a>
                          ))}
                        </div>
                        <div className="flex gap-3 mt-4">
                          <button onClick={() => handleKycAction(p.id, 'approved', 'Admin manual approval')} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[9px] uppercase rounded-xl flex items-center gap-1"><CheckCircle size={12}/> Approve KYC</button>
                          <button onClick={() => handleKycAction(p.id, 'rejected', 'Admin rejection')} className="px-4 py-2 bg-red-900/40 border border-red-700/40 text-red-400 font-black text-[9px] uppercase rounded-xl flex items-center gap-1"><X size={12}/> Reject</button>
                        </div>
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
