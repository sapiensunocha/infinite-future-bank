import { useState, useEffect, useRef } from 'react';
import { supabase } from './services/supabaseClient';
import Chat from './Chat';
import AccountHub from './AccountHub';
import OrganizationSuite from './OrganizationSuite';
import WealthInvest from './WealthInvest';
import GlobalLifestyle from './GlobalLifestyle';
import FinancialPlanner from './FinancialPlanner';
import EmergencySOS from './EmergencySOS';
import Training from './Training';
import Agents from './Agents';
import {
  Briefcase, ArrowRightLeft, ShieldCheck,
  LogOut, Menu, X, Landmark, Clock,
  Send, Download, Plus, MessageSquare,
  Sparkles, Settings, Eye, EyeOff, Target, TrendingUp,
  Folder, Compass, User, BookOpen, ArrowRight, Coffee,
  Camera, FileText, Lock, Info, Bell, Users, BarChart2, Globe, PieChart, Search,
  Sun, Moon, Sunrise
} from 'lucide-react';
export default function Dashboard({ session, onSignOut }) {
  // Navigation & UI States
  const [activeTab, setActiveTab] = useState('NET_POSITION');
  const [subTab, setSubTab] = useState('PROFILE');
  const [activeModal, setActiveModal] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showBalances, setShowBalances] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);
 
  // Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchResults, setSearchResults] = useState({
    transactions: [],
    notifications: [],
    pockets: [],
    recipients: [],
    investments: []
  });
  // Real-Time Database States
  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [balances, setBalances] = useState({ liquid_usd: 0, alpha_equity_usd: 0, mysafe_digital_usd: 0 });
  const [pockets, setPockets] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [sosData, setSosData] = useState(null);
  const [investments, setInvestments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  // Profile Editing States
  const [editedName, setEditedName] = useState('');
  const fileInputRef = useRef(null);
  const searchDebounce = useRef(null);
  const tabTitles = {
    NET_POSITION: 'Home',
    ACCOUNTS: 'Accounts',
    ORGANIZE: 'Organize',
    INVEST: 'Wealth',
    PLANNER: 'Planner',
    LIFESTYLE: 'Lifestyle',
    SOS: 'SOS',
    TRAINING: 'Training',
    SETTINGS: 'Settings',
    AGENTS: 'Your Team'
  };
  const fetchAllData = async () => {
    if (!session?.user?.id) return;
    const { data: pData } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    const { data: bData } = await supabase.from('balances').select('*').eq('user_id', session.user.id).maybeSingle();
    if (pData) {
      setProfile(pData);
      setEditedName(pData.full_name || '');
    }
    if (bData) setBalances(bData);
    const { data: tData } = await supabase.from('transactions').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
    if (tData) setTransactions(tData);
    const { data: pocketsData } = await supabase.from('pockets').select('*').eq('user_id', session.user.id);
    if (pocketsData) setPockets(pocketsData);
    const { data: recData } = await supabase.from('recipients').select('*').eq('user_id', session.user.id);
    if (recData) setRecipients(recData);
    const { data: sosDbData } = await supabase.from('sos_shield').select('*').eq('user_id', session.user.id).maybeSingle();
    if (sosDbData) setSosData(sosDbData);
    const { data: invData } = await supabase.from('investments').select('*').eq('user_id', session.user.id);
    if (invData) setInvestments(invData);
    const { data: notifData } = await supabase.from('notifications').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
    if (notifData) setNotifications(notifData);
  };
  useEffect(() => {
    if (session?.user?.id) {
      fetchAllData();
    }
  }, [session?.user?.id]);
  useEffect(() => {
    if (searchQuery) {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
      searchDebounce.current = setTimeout(async () => {
        const { data: trans } = await supabase.from('transactions').select('*').eq('user_id', session.user.id).ilike('transaction_type', `%${searchQuery}%`).order('created_at', { ascending: false });
        const { data: notifs } = await supabase.from('notifications').select('*').eq('user_id', session.user.id).ilike('message', `%${searchQuery}%`).order('created_at', { ascending: false });
        const { data: pocks } = await supabase.from('pockets').select('*').eq('user_id', session.user.id).ilike('pocket_name', `%${searchQuery}%`);
        const { data: recs } = await supabase.from('recipients').select('*').eq('user_id', session.user.id).ilike('recipient_name', `%${searchQuery}%`);
        const { data: invs } = await supabase.from('investments').select('*').eq('user_id', session.user.id).ilike('investment_type', `%${searchQuery}%`);
        setSearchResults({
          transactions: trans || [],
          notifications: notifs || [],
          pockets: pocks || [],
          recipients: recs || [],
          investments: invs || []
        });
      }, 300);
    } else {
      setSearchResults({
        transactions: [], notifications: [], pockets: [], recipients: [], investments: []
      });
    }
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
  }, [searchQuery, session.user.id]);
  const formatCurrency = (val) => showBalances ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0) : 'XXXX';
  const totalNetWorth = (balances.liquid_usd || 0) + (balances.alpha_equity_usd || 0) + (balances.mysafe_digital_usd || 0);
  const userName = profile?.full_name?.split('@')[0] || 'Client';
  const unreadCount = notifications.filter(n => !n.read).length;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const getHomeInsight = () => {
    const month = new Date().getMonth();
    if (totalNetWorth === 0) return { text: "Welcome to your new financial home. We are genuinely thrilled to have you with us. Let's take the first step in building your secure foundation by exploring a quick guide in our Training academy.", action: "Explore Training", target: "TRAINING" };
    if (balances.liquid_usd < 1000 && totalNetWorth > 0) return { text: "We noticed your liquidity has been a bit tight lately. Please know that we always have your back—you can rely on your zero-interest SOS Shield anytime you need a hand getting back on your feet.", action: "Lean on SOS", target: "SOS" };
    if ((balances.alpha_equity_usd > 0 && balances.alpha_equity_usd < 5000) || investments.length === 1) return { text: "Congratulations on your recent investments! You are building a very solid foundation. To keep this momentum going, let's use the Planner to strategically map out your upcoming financial goals.", action: "Map Your Goals", target: "PLANNER" };
    if (pockets.length === 0 && balances.liquid_usd > 2000) return { text: "Your safety net is looking very secure. For even greater peace of mind, we recommend setting up custom Pockets so you can perfectly organize your funds exactly how you want them.", action: "Organize Funds", target: "ORGANIZE" };
    if (balances.liquid_usd > 5000 && balances.liquid_usd > balances.alpha_equity_usd) return { text: "You are doing exceptionally well. To make your financial foundation even stronger, we suggest exploring the Wealth hub to put some of your idle cash to work for you.", action: "Grow Your Wealth", target: "INVEST" };
    if (((month >= 5 && month <= 7) || month === 11) && balances.liquid_usd > 3000) return { text: "As the season changes, we want to ensure you are taking care of yourself. Remember that your Lifestyle perks grant you VIP lounge access and global connectivity for your upcoming travels.", action: "Access Lifestyle", target: "LIFESTYLE" };
    return { text: "Your safety net is perfectly secure and your accounts are thriving. We are proud to support your journey. Whenever you are ready, reach out to your AI advisor to discuss your next strategic move.", action: "Chat with Advisor", target: "ADVISOR" };
  };
  const insight = getHomeInsight();
  const handleAvatarClick = () => { fileInputRef.current.click(); };
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsLoading(true);
    const filePath = `${session.user.id}/${file.name}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
    if (uploadError) { console.error(uploadError); setIsLoading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', session.user.id);
    if (updateError) console.error(updateError);
    await fetchAllData();
    setIsLoading(false);
  };
  const handleNameUpdate = async () => {
    setIsLoading(true);
    const { error } = await supabase.from('profiles').update({ full_name: editedName }).eq('id', session.user.id);
    if (error) console.error(error);
    await fetchAllData();
    setIsLoading(false);
  };
  const markAsRead = async (id) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    await fetchAllData();
  };
  // ==========================================
  // VIEW 1: NET POSITION (Core Hub)
  // ==========================================
  const NetPositionView = () => (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
     
      {/* Greeting Card */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 shadow-sm">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
          {hour < 12 ? <Sunrise size={32} /> : hour < 18 ? <Sun size={32} /> : <Moon size={32} />}
        </div>
        <div className="flex-1 text-center md:text-left space-y-2">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            {greeting}, {userName}.
          </h1>
          <p className="text-slate-600 leading-relaxed text-sm md:text-base">
            {insight.text}
          </p>
        </div>
        <button
          onClick={() => insight.target === 'ADVISOR' ? setActiveModal('ADVISOR') : setActiveTab(insight.target)}
          className="mx-auto md:mx-0 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-slate-800 hover:-translate-y-1 transition-all flex items-center gap-2"
        >
          {insight.action} <ArrowRight size={14} />
        </button>
      </div>
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Balance Box with relocated Toggle Eye */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-300 font-medium tracking-wider uppercase">Total Safety Net</span>
            <button
              onClick={() => setShowBalances(!showBalances)}
              className="text-slate-400 hover:text-white transition-colors"
              title="Toggle Balance Privacy"
            >
              {showBalances ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">
            {formatCurrency(totalNetWorth)}
          </h2>
          <button
            onClick={() => setActiveTab('ACCOUNTS')}
            className="w-12 h-12 bg-white/10 text-white rounded-2xl flex items-center justify-center hover:bg-white hover:text-slate-900 hover:-translate-y-1 transition-all"
          >
            <ArrowRight size={20} />
          </button>
        </div>
        {/* Latest Activity Box */}
        <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl p-6 md:p-8 flex flex-col justify-between shadow-sm">
          {transactions.length > 0 ? (
            <>
              <div>
                <span className="text-sm text-slate-500 font-medium tracking-wider uppercase block mb-4">Latest Activity</span>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 capitalize">{transactions[0].transaction_type}</p>
                    <p className="text-sm text-slate-500">{new Date(transactions[0].created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200/60 flex justify-between items-center">
                <span className="font-black text-xl text-slate-800">{formatCurrency(Math.abs(transactions[0].amount))}</span>
                <button onClick={() => setActiveTab('ACCOUNTS')} className="text-blue-600 text-sm font-bold hover:underline">View All</button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                <Clock size={20} />
              </div>
              <p className="text-sm text-slate-500 font-medium tracking-wider uppercase block">Latest Activity</p>
              <p className="text-slate-400 font-medium">No recent transactions</p>
            </div>
          )}
        </div>
      </div>
      {/* Action Line & Analytics Toggle */}
      <div className="flex flex-wrap items-center gap-3 bg-white/60 backdrop-blur-xl border border-white/40 p-2 rounded-3xl shadow-sm">
        <button onClick={() => setActiveModal('SEND')} className="flex-1 min-w-[100px] flex items-center justify-center gap-2 py-4 px-4 rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest hover:bg-white text-slate-700 transition-all shadow-sm">
          <Send size={16} /> Send
        </button>
        <button onClick={() => setActiveModal('REQUEST')} className="flex-1 min-w-[100px] flex items-center justify-center gap-2 py-4 px-4 rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest hover:bg-white text-slate-700 transition-all shadow-sm">
          <Download size={16} /> Request
        </button>
        <button onClick={() => setActiveModal('TRANSFER')} className="flex-1 min-w-[100px] flex items-center justify-center gap-2 py-4 px-4 rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest hover:bg-white text-slate-700 transition-all shadow-sm">
          <ArrowRightLeft size={16} /> Transfer
        </button>
        <button onClick={() => setActiveModal('DEPOSIT')} className="flex-1 min-w-[100px] flex items-center justify-center gap-2 py-4 px-4 rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest bg-slate-900 text-white shadow-lg transition-all hover:bg-slate-800">
          <Plus size={16} /> Deposit
        </button>
        <div className="w-px h-10 bg-slate-200/60 mx-1 hidden md:block"></div>
        <button
          onClick={() => setShowAnalytics(!showAnalytics)}
          className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-4 px-4 rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all ${showAnalytics ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-white text-slate-700 border border-transparent hover:border-indigo-100 shadow-sm'}`}
        >
          <BarChart2 size={16} /> Analytics
        </button>
      </div>
      {/* Toggled View: Balances vs. Analytics */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl p-6 md:p-8 shadow-sm transition-all duration-500 min-h-[300px]">
        {showAnalytics ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100 flex flex-col items-center justify-center text-center space-y-4">
              <TrendingUp className="text-indigo-500" size={32} />
              <h3 className="font-bold text-slate-800">Growth & Trends</h3>
              <p className="text-sm text-slate-500">Your cashflow trajectory will appear here.</p>
            </div>
            <div className="bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100 flex flex-col items-center justify-center text-center space-y-4">
              <PieChart className="text-indigo-500" size={32} />
              <h3 className="font-bold text-slate-800">Asset Allocation</h3>
              <p className="text-sm text-slate-500">Breakdown of your liquid vs invested assets.</p>
            </div>
            <div className="bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100 flex flex-col items-center justify-center text-center space-y-4">
              <Globe className="text-indigo-500" size={32} />
              <h3 className="font-bold text-slate-800">Global Spending Map</h3>
              <p className="text-sm text-slate-500">Visualize where your money goes worldwide.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer" onClick={() => setActiveTab('ACCOUNTS')}>
              <div className="flex justify-between items-start mb-4">
                <Landmark className="text-slate-400" size={24} />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-2 py-1 rounded-full">Cash</span>
              </div>
              <p className="text-slate-500 font-medium text-sm mb-1">Cash on Hand</p>
              <p className="text-2xl font-black text-slate-800">{formatCurrency(balances.liquid_usd)}</p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer" onClick={() => setActiveTab('INVEST')}>
              <div className="flex justify-between items-start mb-4">
                <Briefcase className="text-blue-500" size={24} />
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 bg-blue-50 px-2 py-1 rounded-full">Alpha</span>
              </div>
              <p className="text-slate-500 font-medium text-sm mb-1">Investments</p>
              <p className="text-2xl font-black text-slate-800">{formatCurrency(balances.alpha_equity_usd)}</p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer" onClick={() => setActiveTab('ORGANIZE')}>
              <div className="flex justify-between items-start mb-4">
                <ShieldCheck className="text-indigo-500" size={24} />
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2 py-1 rounded-full">Vault</span>
              </div>
              <p className="text-slate-500 font-medium text-sm mb-1">Digital Safe</p>
              <p className="text-2xl font-black text-slate-800">{formatCurrency(balances.mysafe_digital_usd)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
  const SettingsView = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="md:col-span-1 space-y-2 bg-white/60 backdrop-blur-xl border border-white/40 p-4 rounded-3xl shadow-sm h-fit">
        {[
          { id: 'PROFILE', label: 'Profile', icon: <User size={18} /> },
          { id: 'DOCUMENTS', label: 'Documents', icon: <FileText size={18} /> },
          { id: 'SECURITY', label: 'Security', icon: <Lock size={18} /> },
          { id: 'PREFERENCES', label: 'Preferences', icon: <Settings size={18} /> },
          { id: 'ABOUT', label: 'About Us', icon: <Info size={18} /> },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setSubTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${subTab === item.id ? 'bg-blue-600/10 text-blue-600 shadow-inner' : 'text-slate-500 hover:bg-white/50 hover:text-slate-800'}`}
          >
            {item.icon} {item.label}
          </button>
        ))}
        <div className="my-4 border-t border-slate-200/50"></div>
        <button onClick={onSignOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 hover:text-red-600 transition-all">
          <LogOut size={18} /> Log Out
        </button>
      </div>
      <div className="md:col-span-3 bg-white/60 backdrop-blur-xl border border-white/40 p-8 rounded-3xl shadow-sm">
        <h2 className="text-2xl font-black text-slate-800 mb-8">{subTab}</h2>
        {subTab === 'PROFILE' && (
          <div className="space-y-8 max-w-xl">
            <div className="flex items-center gap-6">
              <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                <div className="w-24 h-24 rounded-3xl bg-slate-200 border-4 border-white shadow-md flex items-center justify-center overflow-hidden">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-black text-slate-400">{profile?.full_name?.charAt(0).toUpperCase() || <User size={40} />}</span>
                  )}
                </div>
                <div className="absolute inset-0 bg-slate-900/50 rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="text-white" size={24} />
                </div>
                <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-widest text-slate-500 mb-1">Profile Photo</p>
                <p className="text-xs text-slate-400">Click to upload a new avatar. JPG or PNG.</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Display Name</label>
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="w-full bg-white/50 border border-white/60 rounded-2xl p-4 font-black text-sm outline-none shadow-inner focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>
              <button
                onClick={handleNameUpdate}
                disabled={isLoading}
                className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
        {subTab === 'DOCUMENTS' && (
          <div className="text-center py-12 text-slate-500">
            <FileText size={48} className="mx-auto mb-4 opacity-50" />
            <p className="font-medium text-lg">Your documents section is coming soon.</p>
          </div>
        )}
        {subTab === 'SECURITY' && (
          <div className="text-center py-12 text-slate-500">
            <Lock size={48} className="mx-auto mb-4 opacity-50" />
            <p className="font-medium text-lg">Security settings are coming soon.</p>
          </div>
        )}
        {subTab === 'PREFERENCES' && (
          <div className="text-center py-12 text-slate-500">
            <Settings size={48} className="mx-auto mb-4 opacity-50" />
            <p className="font-medium text-lg">Preferences are coming soon.</p>
          </div>
        )}
        {subTab === 'ABOUT' && (
          <div className="text-center py-12 text-slate-500 space-y-4">
            <Info size={48} className="mx-auto mb-4 opacity-50 text-blue-500" />
            <p className="font-medium text-lg max-w-md mx-auto">DEUS is your all-in-one financial platform designed to provide secure, intelligent, and supportive financial management.</p>
            <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Version 1.0 | Built by INFINITE FUTURE BANK</p>
          </div>
        )}
      </div>
    </div>
  );
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-200">
      {/* Background gradients */}
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400/20 rounded-full blur-[120px]"></div>
      </div>
      <div className="flex h-screen overflow-hidden max-w-7xl mx-auto">
       
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}
        {/* Sidebar Navigation */}
        <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-slate-100/80 backdrop-blur-xl border-r border-slate-200/60 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col`}>
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-4xl font-black text-[#4285F4]">D</span>
              <span className="text-4xl font-black text-[#EA4335]">E</span>
              <span className="text-4xl font-black text-[#FBBC04]">U</span>
              <span className="text-4xl font-black text-[#34A853]">S</span>
              <Sparkles size={18} className="text-blue-500 ml-1" />
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-slate-800">
              <X size={24} />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto py-4 px-4 space-y-2 no-scrollbar">
            {[
              { id: 'NET_POSITION', icon: <Compass size={18} />, label: 'Home' },
              { id: 'PLANNER', icon: <Target size={18} />, label: 'Planner' },
              { id: 'ACCOUNTS', icon: <Landmark size={18} />, label: 'Accounts' },
              { id: 'ORGANIZE', icon: <Folder size={18} />, label: 'Organize' },
              { id: 'INVEST', icon: <Briefcase size={18} />, label: 'Wealth' },
              { id: 'LIFESTYLE', icon: <Globe size={18} />, label: 'Lifestyle' },
              { id: 'TRAINING', icon: <BookOpen size={18} />, label: 'Training' },
              { id: 'AGENTS', icon: <Users size={18} />, label: 'Your Team' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === item.id ? 'bg-blue-600/10 text-blue-600 shadow-inner' : 'text-slate-500 hover:bg-white/50 hover:text-slate-800'}`}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-slate-200/60">
            <button onClick={onSignOut} className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-200/50 hover:text-slate-800 transition-all">
              <LogOut size={16} /> SECURE EXIT
            </button>
          </div>
        </aside>
        {/* Main Content Area */}
        <main className="flex-1 flex flex-col relative overflow-hidden">
         
          {/* Top Header */}
          <header className="h-20 border-b border-slate-200/50 bg-white/40 backdrop-blur-xl flex items-center justify-between px-6 z-30 sticky top-0">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-slate-800 hover:text-blue-500 transition-colors p-2 -ml-2 rounded-xl hover:bg-white/40">
                <Menu size={24} />
              </button>
              <h2 className="hidden md:block font-black text-lg text-slate-800 tracking-tight">
                {tabTitles[activeTab]}
              </h2>
            </div>
            <div className="flex items-center gap-4 md:gap-6 relative">
             
              {/* Dynamic Animated Search Bar */}
              <div className={`relative transition-all duration-300 ease-in-out hidden sm:block ${isSearchExpanded ? 'w-80' : 'w-40'}`}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchExpanded(true)}
                  onBlur={() => { setTimeout(() => setIsSearchExpanded(false), 200); }}
                  className="w-full pl-10 pr-4 py-2 bg-white/50 border border-white/60 rounded-full outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium text-slate-700 shadow-sm"
                />
               
                {/* Search Dropdown */}
                {isSearchExpanded && searchQuery.length > 0 && (
                  <div className="absolute top-full mt-2 left-0 w-80 bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Search Results</p>
                   
                    {searchResults.transactions.length > 0 && (
                      <div className="mb-3">
                        <span className="text-xs font-bold text-slate-600">Transactions</span>
                        {searchResults.transactions.slice(0, 3).map(t => (
                          <div key={t.id} className="text-sm text-slate-800 py-1 hover:text-blue-600 cursor-pointer">{t.transaction_type} • {formatCurrency(Math.abs(t.amount))}</div>
                        ))}
                      </div>
                    )}
                   
                    {searchResults.pockets.length > 0 && (
                      <div className="mb-3">
                        <span className="text-xs font-bold text-slate-600">Pockets</span>
                        {searchResults.pockets.slice(0, 3).map(p => (
                          <div key={p.id} className="text-sm text-slate-800 py-1 hover:text-blue-600 cursor-pointer">{p.pocket_name}</div>
                        ))}
                      </div>
                    )}
                    {(searchResults.transactions.length === 0 && searchResults.pockets.length === 0) && (
                      <p className="text-sm text-slate-500 italic">No results found.</p>
                    )}
                  </div>
                )}
              </div>
              {/* Notifications */}
              <button onClick={() => setIsNotificationMenuOpen(!isNotificationMenuOpen)} className="text-slate-400 hover:text-blue-500 transition-colors relative" title="Notifications">
                <Bell size={22} />
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
              </button>
              {isNotificationMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsNotificationMenuOpen(false)}></div>
                  <div className="absolute top-full mt-4 right-0 md:right-auto w-80 bg-white/90 backdrop-blur-2xl border border-white/60 shadow-2xl rounded-3xl p-4 z-50 animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center justify-between mb-4 px-2">
                      <span className="font-black text-sm uppercase tracking-widest text-slate-800">Notifications</span>
                    </div>
                    <div className="space-y-2 max-h-80 overflow-y-auto no-scrollbar">
                      {notifications.length > 0 ? notifications.map((notif) => (
                        <div key={notif.id} className={`p-4 rounded-2xl ${notif.read ? 'bg-slate-50/50' : 'bg-blue-50/50 border border-blue-100'}`}>
                          <p className="text-sm text-slate-700 font-medium leading-tight mb-2">{notif.message}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(notif.created_at).toLocaleDateString()}</p>
                          {!notif.read && <button onClick={() => markAsRead(notif.id)} className="text-blue-500 text-[10px] font-black uppercase tracking-widest mt-2 hover:underline">Mark as read</button>}
                        </div>
                      )) : <p className="text-sm text-slate-500 text-center py-4">No notifications</p>}
                    </div>
                  </div>
                </>
              )}
              {/* Profile Menu */}
              <div className="relative group">
                <div onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="flex items-center gap-3 cursor-pointer group px-3 py-2 rounded-2xl hover:bg-white/40 transition-colors border border-transparent hover:border-white/60 relative z-50">
                  <div className="text-right hidden sm:block">
                    <p className="font-black text-sm text-slate-800 leading-none">{userName}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{profile?.active_tier || 'Personal'}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center overflow-hidden">
                    {profile?.avatar_url ? <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" /> : <span className="font-black text-slate-400 text-lg">{profile?.full_name?.charAt(0).toUpperCase() || <User size={20} />}</span>}
                  </div>
                </div>
                {isProfileMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsProfileMenuOpen(false)}></div>
                    <div className="absolute top-full mt-2 right-0 w-64 bg-white/90 backdrop-blur-2xl border border-white/60 shadow-2xl rounded-3xl p-2 z-50 animate-in fade-in slide-in-from-top-4">
                      <div className="p-4 flex items-center gap-4 border-b border-slate-100 mb-2">
                        <div className="w-12 h-12 rounded-xl bg-slate-200 overflow-hidden flex items-center justify-center">
                          {profile?.avatar_url ? <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" /> : <span className="font-black text-slate-400 text-xl">{profile?.full_name?.charAt(0).toUpperCase() || <User size={24} />}</span>}
                        </div>
                        <div>
                          <p className="font-black text-slate-800">{userName}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{profile?.active_tier || 'Personal'}</p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <button onClick={() => { setActiveTab('SETTINGS'); setSubTab('PROFILE'); setIsProfileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-all">
                          <Settings size={16} /> Full Settings
                        </button>
                        <button onClick={() => { setActiveTab('SOS'); setIsProfileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 hover:text-red-600 transition-all">
                          <ShieldCheck size={16} /> Emergency SOS
                        </button>
                        <button onClick={onSignOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all">
                          <LogOut size={16} /> Secure Exit
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>
          {/* Dynamic Content Area */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 relative z-10 no-scrollbar">
            {activeTab === 'NET_POSITION' && <NetPositionView />}
            {activeTab === 'ACCOUNTS' && <AccountHub session={session} balances={balances} profile={profile} showBalances={showBalances} />}
            {activeTab === 'ORGANIZE' && <OrganizationSuite session={session} balances={balances} pockets={pockets} recipients={recipients} showBalances={showBalances} />}
            {activeTab === 'INVEST' && <WealthInvest session={session} balances={balances} profile={profile} investments={investments} showBalances={showBalances} />}
            {activeTab === 'PLANNER' && <FinancialPlanner session={session} balances={balances} showBalances={showBalances} />}
            {activeTab === 'LIFESTYLE' && <GlobalLifestyle session={session} profile={profile} />}
            {activeTab === 'SOS' && <EmergencySOS session={session} balances={balances} profile={profile} sosData={sosData} showBalances={showBalances} />}
            {activeTab === 'TRAINING' && <Training session={session} />}
            {activeTab === 'AGENTS' && <Agents session={session} profile={profile} balances={balances} />}
            {activeTab === 'SETTINGS' && <SettingsView />}
          </div>
         
          {/* Floating AI Advisor Button */}
          <button onClick={() => setActiveModal('ADVISOR')} className="fixed bottom-8 right-8 z-50 bg-slate-900 text-white shadow-2xl rounded-full p-4 flex items-center gap-3 hover:-translate-y-2 transition-all active:scale-95 group border-2 border-white/20">
            <MessageSquare size={24} className="group-hover:animate-pulse" />
            <span className="font-black text-[10px] uppercase tracking-widest pr-2 hidden md:block">Your Financial AI</span>
          </button>
        </main>
      </div>
      {/* Advisor Chat Modal */}
      {activeModal === 'ADVISOR' && <Chat session={session} profile={profile} balances={balances} onClose={() => setActiveModal(null)} />}
      {/* Transaction Modals */}
      {activeModal && activeModal !== 'ADVISOR' && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-lg text-slate-800 tracking-tight uppercase">{activeModal}</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-800 transition-colors bg-white p-2 rounded-xl shadow-sm">
                <X size={20} />
              </button>
            </div>
           
            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsLoading(true);
              const amount = parseFloat(e.target.amount.value) * (activeModal === 'DEPOSIT' || activeModal === 'REQUEST' ? 1 : -1);
              await supabase.from('transactions').insert([{ user_id: session.user.id, amount, transaction_type: activeModal.toLowerCase(), status: 'completed' }]);
              if (activeModal === 'DEPOSIT') {
                await supabase.from('balances').update({ liquid_usd: balances.liquid_usd + amount }).eq('user_id', session.user.id);
              }
              await fetchAllData();
              setActiveModal(null);
              setIsLoading(false);
            }} className="p-8 space-y-6 relative z-10 text-center">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Entry Amount (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  name="amount"
                  required
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 font-black text-3xl text-center text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-300"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-slate-900 text-white rounded-2xl py-5 font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-800 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {isLoading ? 'TRANSMITTING...' : `CONFIRM ${activeModal}`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}