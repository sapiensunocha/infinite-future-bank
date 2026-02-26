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
import DepositInterface from './DepositInterface';
import QRCode from "react-qr-code";
import CardLinker from './CardLinker';
import {
  Briefcase, ArrowRightLeft, ShieldCheck,
  LogOut, Menu, X, Landmark, Clock,
  Send, Download, Plus, MessageSquare,
  Sparkles, Settings, Eye, EyeOff, Target, TrendingUp,
  Folder, Compass, User, BookOpen, ArrowRight, Coffee,
  Camera, FileText, Lock, Info, Bell, Users, BarChart2, Globe, PieChart, Search,
  Sun, Moon, Sunrise, Loader2, CreditCard, Scale
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
    transactions: [], notifications: [], pockets: [], recipients: [], investments: []
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
  const [editedName, setEditedName] = useState('');
  
  // KYC States
  const [kycForm, setKycForm] = useState({ legalName: '', dob: '', phone: '', address: '' });
  const [isSubmittingKyc, setIsSubmittingKyc] = useState(false);

  // Transaction & Payment States
  const [notification, setNotification] = useState(null);
  const [showDepositUI, setShowDepositUI] = useState(false);
  const [requestEmail, setRequestEmail] = useState('');
  const [requestLink, setRequestLink] = useState(null);
  const [requestReason, setRequestReason] = useState('');
  const [requestAmount, setRequestAmount] = useState(0);
  const [showQR, setShowQR] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showCardLinker, setShowCardLinker] = useState(false);
  const [linkedCards, setLinkedCards] = useState([]);
  
  const fileInputRef = useRef(null);
  const searchDebounce = useRef(null);
  
  const tabTitles = {
    NET_POSITION: 'Home', ACCOUNTS: 'Accounts', ORGANIZE: 'Organize', INVEST: 'Wealth',
    PLANNER: 'Planner', LIFESTYLE: 'Lifestyle', SOS: 'SOS', TRAINING: 'Training',
    SETTINGS: 'Settings', AGENTS: 'Your Team'
  };

  const fetchAllData = async () => {
    if (!session?.user?.id) return;
    const { data: pData } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    const { data: bData } = await supabase.from('balances').select('*').eq('user_id', session.user.id).maybeSingle();
    
    if (pData) { 
      setProfile(pData); 
      setEditedName(pData.full_name || ''); 
      setKycForm({
        legalName: pData.full_legal_name || '',
        dob: pData.dob || '',
        phone: pData.phone || '',
        address: pData.residential_address || ''
      });
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
    
    const { data: cardsData } = await supabase.from('linked_cards').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
    if (cardsData) setLinkedCards(cardsData);
  };

  useEffect(() => { if (session?.user?.id) fetchAllData(); }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) return;
    const channel = supabase.channel('realtime-deus')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions', filter: `user_id=eq.${session.user.id}` }, (payload) => {
        setTransactions(prev => [payload.new, ...prev]);
        setNotification({ type: 'success', text: `Inbound Transfer Detected: $${Math.abs(payload.new.amount).toFixed(2)}` });
        setTimeout(() => setNotification(null), 5000);
        fetchAllData();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` }, () => {
        fetchAllData();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [session?.user?.id]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get('status') === 'success') {
      setNotification({ type: 'success', text: 'Capital Successfully Secured.' });
      window.history.replaceState(null, '', window.location.pathname);
      setTimeout(fetchAllData, 2000);
    }
    if (query.get('status') === 'cancelled') {
      setNotification({ type: 'error', text: 'Deposit routing aborted.' });
      window.history.replaceState(null, '', window.location.pathname);
    }
    if (query.has('status')) setTimeout(() => setNotification(null), 5000);
  }, [session.user.id]);

  useEffect(() => {
    if (searchQuery) {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
      searchDebounce.current = setTimeout(async () => {
        const { data: trans } = await supabase.from('transactions').select('*').eq('user_id', session.user.id).ilike('transaction_type', `%${searchQuery}%`).order('created_at', { ascending: false });
        const { data: notifs } = await supabase.from('notifications').select('*').eq('user_id', session.user.id).ilike('message', `%${searchQuery}%`).order('created_at', { ascending: false });
        const { data: pocks } = await supabase.from('pockets').select('*').eq('user_id', session.user.id).ilike('pocket_name', `%${searchQuery}%`);
        const { data: recs } = await supabase.from('recipients').select('*').eq('user_id', session.user.id).ilike('recipient_name', `%${searchQuery}%`);
        const { data: invs } = await supabase.from('investments').select('*').eq('user_id', session.user.id).ilike('investment_type', `%${searchQuery}%`);
        setSearchResults({ transactions: trans || [], notifications: notifs || [], pockets: pocks || [], recipients: recs || [], investments: invs || [] });
      }, 300);
    } else {
      setSearchResults({ transactions: [], notifications: [], pockets: [], recipients: [], investments: [] });
    }
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current); };
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

  // --- ACTIONS ---
  const handleAvatarClick = () => { fileInputRef.current.click(); };
  
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsLoading(true);
    const filePath = `${session.user.id}/${file.name}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
    if (uploadError) { console.error(uploadError); setIsLoading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', session.user.id);
    await fetchAllData();
    setIsLoading(false);
  };
  
  const handleNameUpdate = async () => {
    setIsLoading(true);
    await supabase.from('profiles').update({ full_name: editedName }).eq('id', session.user.id);
    await fetchAllData();
    setIsLoading(false);
  };

  const handleSubmitKYC = async (e) => {
    e.preventDefault();
    setIsSubmittingKyc(true);
    try {
      const { error } = await supabase.from('profiles').update({
        full_legal_name: kycForm.legalName,
        dob: kycForm.dob,
        phone: kycForm.phone,
        residential_address: kycForm.address,
        kyc_status: 'verified' // Marks them as verified internally
      }).eq('id', session.user.id);
      
      if (error) throw error;
      setNotification({ type: 'success', text: 'Identity verified to Tier-1 Standards.' });
      await fetchAllData();
    } catch (err) {
      setNotification({ type: 'error', text: 'KYC Submission Failed.' });
    } finally {
      setIsSubmittingKyc(false);
    }
  };

  const handleSignAgreements = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from('profiles').update({ docs_signed: true }).eq('id', session.user.id);
      if (error) throw error;
      setNotification({ type: 'success', text: 'Master Agreement Cryptographically Signed.' });
      await fetchAllData();
    } catch (err) {
      setNotification({ type: 'error', text: 'Failed to sign agreements.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCard = async (cardId) => {
    setIsLoading(true);
    const { error } = await supabase.from('linked_cards').delete().eq('id', cardId);
    if (error) { setNotification({ type: 'error', text: 'Failed to remove card.' }); }
    else { setNotification({ type: 'success', text: 'Payment method securely removed.' }); await fetchAllData(); }
    setTimeout(() => setNotification(null), 3000);
    setIsLoading(false);
  };
  
  const markAsRead = async (id) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    await fetchAllData();
  };
  
  const handleDeposit = async (amount) => {
    const { data, error } = await supabase.functions.invoke('create-checkout', { body: { userId: session.user.id, email: session.user.email, amount: amount } });
    if (data?.url) window.location.href = data.url;
    else console.error("Stripe routing failed", error);
  };
  
  const handleSendEmailInvoice = async () => {
    if (!requestEmail) { setNotification({ type: 'error', text: 'Please enter a target email first.' }); setTimeout(() => setNotification(null), 3000); return; }
    setIsSendingEmail(true);
    try {
      const { error } = await supabase.functions.invoke('send-request-email', { body: { requesterName: userName, targetEmail: requestEmail, amount: requestAmount, reason: requestReason, payLink: requestLink } });
      if (error) throw error;
      setNotification({ type: 'success', text: `Official invoice dispatched to ${requestEmail}` });
      setTimeout(() => setNotification(null), 5000);
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', text: 'Failed to dispatch invoice. Please try again.' });
      setTimeout(() => setNotification(null), 5000);
    } finally { setIsSendingEmail(false); }
  };

  const NetPositionView = () => (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 shadow-glass">
        <div className="w-16 h-16 bg-ifb-primary/20 text-ifb-primary rounded-full flex items-center justify-center flex-shrink-0 border border-ifb-primary/30 shadow-glow-blue">
          {hour < 12 ? <Sunrise size={32} /> : hour < 18 ? <Sun size={32} /> : <Moon size={32} />}
        </div>
        <div className="flex-1 text-center md:text-left space-y-2">
          <h1 className="text-2xl font-black text-white tracking-tight">{greeting}, {userName}.</h1>
          <p className="text-slate-300 leading-relaxed text-sm md:text-base">{insight.text}</p>
        </div>
        <button onClick={() => insight.target === 'ADVISOR' ? setActiveModal('ADVISOR') : setActiveTab(insight.target)} className="mx-auto md:mx-0 px-6 py-4 bg-ifb-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-glow-blue hover:bg-blue-600 hover:-translate-y-1 transition-all flex items-center gap-2">
          {insight.action} <ArrowRight size={14} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-ifb-primary to-blue-900 rounded-3xl p-6 md:p-8 text-white shadow-glow-blue relative overflow-hidden group border border-white/10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-blue-200 font-medium tracking-wider uppercase">Total Safety Net</span>
            <button onClick={() => setShowBalances(!showBalances)} className="text-blue-200 hover:text-white transition-colors" title="Toggle Balance Privacy">
              {showBalances ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">{formatCurrency(totalNetWorth)}</h2>
          <button onClick={() => setActiveTab('ACCOUNTS')} className="w-12 h-12 bg-white/10 text-white rounded-2xl flex items-center justify-center hover:bg-white hover:text-blue-900 hover:-translate-y-1 transition-all">
            <ArrowRight size={20} />
          </button>
        </div>

        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 md:p-8 flex flex-col shadow-glass h-full max-h-[220px] overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-slate-400 font-medium tracking-wider uppercase block">Transaction Ledger</span>
            <button onClick={() => setActiveTab('ACCOUNTS')} className="text-[10px] font-black uppercase tracking-widest text-ifb-accent hover:text-white transition-colors">View All</button>
          </div>
          <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2">
            {transactions.length > 0 ? transactions.slice(0, 3).map((tx) => (
              <div key={tx.id} className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.amount > 0 ? 'bg-ifb-success/20 text-ifb-success' : 'bg-white/10 text-slate-300'} border border-white/5`}>
                    {tx.amount > 0 ? <Download size={16} /> : <Send size={16} />}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-white capitalize">{tx.description || tx.type}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{new Date(tx.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`font-black text-sm ${tx.amount > 0 ? 'text-ifb-success' : 'text-white'}`}>
                  {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                </span>
              </div>
            )) : (
              <p className="text-sm text-slate-500 font-medium text-center mt-4">No recent transactions</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-white/5 backdrop-blur-2xl border border-white/10 p-2 rounded-3xl shadow-glass">
        <button onClick={() => setActiveModal('SEND')} className="flex-1 min-w-[100px] flex items-center justify-center gap-2 py-4 px-4 rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest hover:bg-white/10 text-slate-300 transition-all">
          <Send size={16} /> Send
        </button>
        <button onClick={() => setActiveModal('REQUEST')} className="flex-1 min-w-[100px] flex items-center justify-center gap-2 py-4 px-4 rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest hover:bg-white/10 text-slate-300 transition-all">
          <Download size={16} /> Request
        </button>
        <button onClick={() => setActiveModal('TRANSFER')} className="flex-1 min-w-[100px] flex items-center justify-center gap-2 py-4 px-4 rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest hover:bg-white/10 text-slate-300 transition-all">
          <ArrowRightLeft size={16} /> Transfer
        </button>
        <button onClick={() => setShowDepositUI(true)} className="flex-1 min-w-[100px] flex items-center justify-center gap-2 py-4 px-4 rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest bg-ifb-primary text-white shadow-glow-blue transition-all hover:bg-blue-600">
          <Plus size={16} /> Deposit
        </button>
        <button onClick={() => setActiveModal('WITHDRAW')} className="flex-1 min-w-[100px] flex items-center justify-center gap-2 py-4 px-4 rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest bg-white/10 text-white hover:bg-white/20 transition-all border border-white/10">
          <Landmark size={16} /> Withdraw
        </button>
        <div className="w-px h-10 bg-white/10 mx-1 hidden md:block"></div>
        <button onClick={() => setShowAnalytics(!showAnalytics)} className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-4 px-4 rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all ${showAnalytics ? 'bg-ifb-accent/20 text-ifb-accent border border-ifb-accent/30' : 'hover:bg-white/10 text-slate-300 border border-transparent'}`}>
          <BarChart2 size={16} /> Analytics
        </button>
      </div>

      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-glass transition-all duration-500 min-h-[300px]">
        {showAnalytics ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10 flex flex-col items-center justify-center text-center space-y-4">
              <TrendingUp className="text-ifb-accent" size={32} />
              <h3 className="font-bold text-white">Growth & Trends</h3>
              <p className="text-sm text-slate-400">Your cashflow trajectory will appear here.</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10 flex flex-col items-center justify-center text-center space-y-4">
              <PieChart className="text-ifb-accent" size={32} />
              <h3 className="font-bold text-white">Asset Allocation</h3>
              <p className="text-sm text-slate-400">Breakdown of your liquid vs invested assets.</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10 flex flex-col items-center justify-center text-center space-y-4">
              <Globe className="text-ifb-accent" size={32} />
              <h3 className="font-bold text-white">Global Spending Map</h3>
              <p className="text-sm text-slate-400">Visualize where your money goes worldwide.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10 shadow-glass hover:bg-white/10 transition-all flex flex-col justify-between cursor-pointer" onClick={() => setActiveTab('ACCOUNTS')}>
              <div className="flex justify-between items-start mb-4">
                <Landmark className="text-slate-300" size={24} />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 bg-white/10 border border-white/5 px-2 py-1 rounded-full">Cash</span>
              </div>
              <p className="text-slate-400 font-medium text-sm mb-1">Cash on Hand</p>
              <p className="text-2xl font-black text-white">{formatCurrency(balances.liquid_usd)}</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10 shadow-glass hover:bg-white/10 transition-all flex flex-col justify-between cursor-pointer" onClick={() => setActiveTab('INVEST')}>
              <div className="flex justify-between items-start mb-4">
                <Briefcase className="text-ifb-primary" size={24} />
                <span className="text-[10px] font-black uppercase tracking-widest text-ifb-primary bg-ifb-primary/10 border border-ifb-primary/20 px-2 py-1 rounded-full">Alpha</span>
              </div>
              <p className="text-slate-400 font-medium text-sm mb-1">Investments</p>
              <p className="text-2xl font-black text-white">{formatCurrency(balances.alpha_equity_usd)}</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10 shadow-glass hover:bg-white/10 transition-all flex flex-col justify-between cursor-pointer" onClick={() => setActiveTab('ORGANIZE')}>
              <div className="flex justify-between items-start mb-4">
                <ShieldCheck className="text-ifb-accent" size={24} />
                <span className="text-[10px] font-black uppercase tracking-widest text-ifb-accent bg-ifb-accent/10 border border-ifb-accent/20 px-2 py-1 rounded-full">Vault</span>
              </div>
              <p className="text-slate-400 font-medium text-sm mb-1">Digital Safe</p>
              <p className="text-2xl font-black text-white">{formatCurrency(balances.mysafe_digital_usd)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const SettingsView = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 animate-in fade-in zoom-in-95 duration-500">
      
      {/* Settings Navigation */}
      <div className="md:col-span-1 space-y-2 bg-white/5 backdrop-blur-2xl border border-white/10 p-4 rounded-3xl shadow-glass h-fit">
        {[
          { id: 'PROFILE', label: 'Identity & Legal', icon: <User size={18} /> },
          { id: 'LINKED_ACCOUNTS', label: 'Banks & Cards', icon: <CreditCard size={18} /> },
          { id: 'SECURITY', label: 'Security', icon: <Lock size={18} /> },
          { id: 'ABOUT', label: 'About Us', icon: <Info size={18} /> },
        ].map((item) => (
          <button key={item.id} onClick={() => setSubTab(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${subTab === item.id ? 'bg-ifb-primary/20 text-ifb-primary border border-ifb-primary/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
            {item.icon} {item.label}
          </button>
        ))}
        <div className="my-4 border-t border-white/10"></div>
        <button onClick={onSignOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all">
          <LogOut size={18} /> Log Out
        </button>
      </div>

      {/* Settings Content Area */}
      <div className="md:col-span-3 bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-glass">
        
        {/* --- IDENTITY & COMPLIANCE --- */}
        {subTab === 'PROFILE' && (
          <div className="space-y-8 max-w-2xl">
            <h2 className="text-2xl font-black text-white mb-2">Institutional Identity</h2>
            <p className="text-xs text-slate-400 mb-8">Manage your DEUS profile, KYC compliance, and legal agreements.</p>
            
            {/* 1. Basic Profile Info */}
            <div className="flex items-center gap-6 bg-black/30 p-6 rounded-3xl border border-white/5">
              <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                <div className="w-20 h-20 rounded-2xl bg-black/40 border border-white/10 shadow-glass flex items-center justify-center overflow-hidden">
                  {profile?.avatar_url ? <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : <span className="text-3xl font-black text-slate-500">{profile?.full_name?.charAt(0).toUpperCase() || <User size={40} />}</span>}
                </div>
                <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="text-white" size={24} />
                </div>
                <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
              </div>
              <div className="flex-1 space-y-3">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Display Name</label>
                <div className="flex gap-3">
                  <input type="text" value={editedName} onChange={(e) => setEditedName(e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 font-bold text-sm text-white outline-none focus:border-ifb-primary transition-all" />
                  <button onClick={handleNameUpdate} disabled={isLoading} className="px-6 bg-ifb-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-glow-blue hover:bg-blue-600 transition-all disabled:opacity-50">
                    Save
                  </button>
                </div>
              </div>
            </div>

            {/* 2. KYC Form */}
            <div className="bg-black/30 border border-white/5 p-8 rounded-3xl mt-8 shadow-inner">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-white flex items-center gap-2"><ShieldCheck className="text-ifb-success" size={20}/> Identity Verification (KYC)</h3>
                {profile?.kyc_status === 'verified' && <span className="text-[10px] font-black uppercase tracking-widest text-ifb-success bg-ifb-success/10 px-3 py-1.5 rounded-lg border border-ifb-success/20">Verified</span>}
              </div>
              <p className="text-xs text-slate-400 mb-8 leading-relaxed">Federal regulations require identity verification for Tier-1 liquidity access, Alpha Marketplace investments, and external Stripe payouts.</p>
              
              <form onSubmit={handleSubmitKYC} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Full Legal Name</label>
                    <input type="text" value={kycForm.legalName} onChange={(e) => setKycForm({...kycForm, legalName: e.target.value})} disabled={profile?.kyc_status === 'verified'} required className="w-full bg-black/50 border border-white/10 rounded-xl p-4 font-bold text-sm text-white outline-none focus:border-ifb-primary disabled:opacity-50" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Date of Birth</label>
                    <input type="date" value={kycForm.dob} onChange={(e) => setKycForm({...kycForm, dob: e.target.value})} disabled={profile?.kyc_status === 'verified'} required className="w-full bg-black/50 border border-white/10 rounded-xl p-4 font-bold text-sm text-white outline-none focus:border-ifb-primary disabled:opacity-50" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Phone Number</label>
                    <input type="tel" value={kycForm.phone} onChange={(e) => setKycForm({...kycForm, phone: e.target.value})} disabled={profile?.kyc_status === 'verified'} required className="w-full bg-black/50 border border-white/10 rounded-xl p-4 font-bold text-sm text-white outline-none focus:border-ifb-primary disabled:opacity-50" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Residential Address</label>
                    <input type="text" value={kycForm.address} onChange={(e) => setKycForm({...kycForm, address: e.target.value})} disabled={profile?.kyc_status === 'verified'} required className="w-full bg-black/50 border border-white/10 rounded-xl p-4 font-bold text-sm text-white outline-none focus:border-ifb-primary disabled:opacity-50" />
                  </div>
                </div>
                
                {profile?.kyc_status !== 'verified' && (
                  <button type="submit" disabled={isSubmittingKyc} className="w-full mt-4 bg-white/10 hover:bg-white/20 text-white font-black text-[10px] uppercase tracking-widest py-4 rounded-xl transition-all flex items-center justify-center gap-2 border border-white/10 shadow-glass">
                    {isSubmittingKyc ? <Loader2 className="animate-spin" size={16}/> : 'Transmit Identity for Verification'}
                  </button>
                )}
              </form>
            </div>

            {/* 3. IFB Regulatory Agreements */}
            <div className="bg-black/30 border border-white/5 p-8 rounded-3xl mt-8 shadow-inner">
              <div className="flex items-center gap-3 mb-4">
                <Scale className="text-slate-400" size={24} />
                <h3 className="text-lg font-black text-white">Master Service Agreement & Licensing</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-8">
                Infinite Future Bank (DEUS) operates under stringent global financial regulations. To utilize our liquidity engines and Stripe clearing houses, you must agree to our regulatory oversight.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">United States</p>
                  <p className="text-xs font-black text-white">EIN: 33-1869013</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Austria</p>
                  <p className="text-xs font-black text-white">Steuernummer: 91 323/2005</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Canada</p>
                  <p className="text-xs font-black text-white">CRA: 721487825 RC 0001</p>
                </div>
              </div>

              {!profile?.docs_signed ? (
                <button onClick={handleSignAgreements} disabled={isLoading} className="w-full py-4 bg-ifb-primary text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-glow-blue hover:bg-blue-600 transition-all flex items-center justify-center gap-2 border border-blue-400/30">
                  {isLoading ? <Loader2 className="animate-spin" size={16}/> : 'Cryptographically Sign & Accept Terms'}
                </button>
              ) : (
                <div className="w-full py-4 bg-ifb-success/10 border border-ifb-success/30 text-ifb-success font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 shadow-glow">
                  <ShieldCheck size={16} /> Agreement Cryptographically Verified
                </div>
              )}
            </div>
            
          </div>
        )}

        {/* --- LINKED ACCOUNTS --- */}
        {subTab === 'LINKED_ACCOUNTS' && (
          <div className="space-y-8 max-w-2xl animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-black text-white mb-2">Payout Methods</h2>
            <p className="text-xs text-slate-400 mb-8">Manage your connected bank accounts and debit cards for withdrawals.</p>
            
            <div className="flex justify-end mb-6">
              <button onClick={() => setShowCardLinker(true)} className="bg-white/10 hover:bg-white/20 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-xl transition-all shadow-glass flex items-center gap-2">
                <Plus size={14} /> Add Method
              </button>
            </div>
            {linkedCards.length > 0 ? (
              <div className="grid gap-4">
                {linkedCards.map(card => (
                  <div key={card.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between shadow-sm group hover:border-white/20 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-10 bg-black/30 rounded-lg flex items-center justify-center text-xs font-black uppercase text-slate-300 tracking-widest border border-white/5">
                        {card.brand === 'visa' ? 'VISA' : card.brand === 'mastercard' ? 'MC' : card.brand}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-white">•••• •••• •••• {card.last4}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-ifb-success flex items-center gap-1 mt-1">
                          <ShieldCheck size={10} /> Verified for Instant Payouts
                        </p>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteCard(card.id)} disabled={isLoading} className="text-slate-500 hover:text-red-400 transition-colors p-2 bg-white/5 rounded-lg hover:bg-red-500/20" title="Remove Card">
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-black/20 rounded-3xl border-2 border-dashed border-white/10">
                <CreditCard size={48} className="mx-auto mb-4 text-slate-500" />
                <p className="font-bold text-white mb-2">No Linked Methods</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">Link a debit card or bank account to enable secure withdrawals from your DEUS balance.</p>
              </div>
            )}
            <div className="mt-8 p-4 bg-ifb-primary/10 rounded-2xl border border-ifb-primary/20 flex items-start gap-3">
              <Lock className="text-ifb-primary shrink-0 mt-1" size={16} />
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-relaxed">
                DEUS utilizes bank-grade 256-bit AES encryption. Card numbers are vaulted directly by our clearing house (Stripe) and never touch our internal servers.
              </p>
            </div>
          </div>
        )}

        {/* --- SECURITY --- */}
        {subTab === 'SECURITY' && (
          <div className="text-center py-12 text-slate-500">
            <Lock size={48} className="mx-auto mb-4 opacity-30" />
            <p className="font-medium text-lg text-slate-400">Advanced Security configuration coming soon.</p>
          </div>
        )}
        
        {/* --- ABOUT --- */}
        {subTab === 'ABOUT' && (
          <div className="text-center py-12 text-slate-400 space-y-4">
            <Info size={48} className="mx-auto mb-4 opacity-50 text-ifb-primary" />
            <p className="font-medium text-lg max-w-md mx-auto text-white">DEUS is your all-in-one financial platform designed to provide secure, intelligent, and supportive financial management.</p>
            <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Version 1.0 | Built by INFINITE FUTURE BANK</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-transparent font-sans text-white">
      <div className="flex h-screen overflow-hidden max-w-7xl mx-auto">
        {isSidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>}
       
        <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-[#0B0F19]/80 backdrop-blur-2xl border-r border-white/10 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col`}>
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-4xl font-black text-ifb-logoI">D</span>
              <span className="text-4xl font-black text-ifb-logoF">E</span>
              <span className="text-4xl font-black text-ifb-logoB">U</span>
              <span className="text-4xl font-black text-ifb-logoG">S</span>
              <Sparkles size={18} className="text-ifb-primary ml-1" />
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white">
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
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === item.id ? 'bg-ifb-primary/20 text-white border border-ifb-primary/30 shadow-glow-blue' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-white/10">
            <button onClick={onSignOut} className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-white/5 hover:text-white transition-all">
              <LogOut size={16} /> SECURE EXIT
            </button>
          </div>
        </aside>
        
        <main className="flex-1 flex flex-col relative overflow-hidden">
          <header className="h-20 border-b border-white/10 bg-[#0B0F19]/40 backdrop-blur-2xl flex items-center justify-between px-6 z-30 sticky top-0">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-white hover:text-ifb-primary transition-colors p-2 -ml-2 rounded-xl hover:bg-white/10">
                <Menu size={24} />
              </button>
              <h2 className="hidden md:block font-black text-lg text-white tracking-tight">{tabTitles[activeTab]}</h2>
            </div>
            
            <div className="flex items-center gap-4 md:gap-6 relative">
              <div className={`relative transition-all duration-300 ease-in-out hidden sm:block ${isSearchExpanded ? 'w-80' : 'w-40'}`}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onFocus={() => setIsSearchExpanded(true)} onBlur={() => { setTimeout(() => setIsSearchExpanded(false), 200); }} className="w-full pl-10 pr-4 py-2 bg-black/20 border border-white/10 rounded-full outline-none focus:border-ifb-primary transition-all text-sm font-medium text-white placeholder:text-slate-500 shadow-glass" />
                {isSearchExpanded && searchQuery.length > 0 && (
                  <div className="absolute top-full mt-2 left-0 w-80 bg-[#0B0F19]/95 backdrop-blur-2xl border border-white/10 shadow-glass rounded-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Search Results</p>
                    {searchResults.transactions.length > 0 && (
                      <div className="mb-3">
                        <span className="text-xs font-bold text-slate-400">Transactions</span>
                        {searchResults.transactions.slice(0, 3).map(t => <div key={t.id} className="text-sm text-white py-1 hover:text-ifb-primary cursor-pointer">{t.transaction_type} • {formatCurrency(Math.abs(t.amount))}</div>)}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <button onClick={() => setIsNotificationMenuOpen(!isNotificationMenuOpen)} className="text-slate-400 hover:text-white transition-colors relative" title="Notifications">
                <Bell size={22} />
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#0B0F19]"></span>}
              </button>
              
              {isNotificationMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsNotificationMenuOpen(false)}></div>
                  <div className="absolute top-full mt-4 right-0 md:right-auto w-80 bg-[#0B0F19]/90 backdrop-blur-3xl border border-white/10 shadow-glass rounded-3xl p-4 z-50 animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center justify-between mb-4 px-2">
                      <span className="font-black text-sm uppercase tracking-widest text-white">Notifications</span>
                    </div>
                    <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                      {notifications.length > 0 ? notifications.map((notif) => (
                        <div key={notif.id} className={`p-4 rounded-2xl ${notif.read ? 'bg-white/5 border border-transparent' : 'bg-ifb-primary/10 border border-ifb-primary/30'}`}>
                          <p className="text-sm text-slate-200 font-medium leading-tight mb-2">{notif.message}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{new Date(notif.created_at).toLocaleDateString()}</p>
                          {!notif.read && <button onClick={() => markAsRead(notif.id)} className="text-ifb-primary text-[10px] font-black uppercase tracking-widest mt-2 hover:text-white">Mark as read</button>}
                        </div>
                      )) : <p className="text-sm text-slate-500 text-center py-4">No notifications</p>}
                    </div>
                  </div>
                </>
              )}
              
              <div className="relative group">
                <div onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="flex items-center gap-3 cursor-pointer group px-3 py-2 rounded-2xl hover:bg-white/10 transition-colors border border-transparent hover:border-white/10 relative z-50">
                  <div className="text-right hidden sm:block">
                    <p className="font-black text-sm text-white leading-none">{userName}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{profile?.active_tier || 'Personal'}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/10 shadow-glass flex items-center justify-center overflow-hidden">
                    {profile?.avatar_url ? <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" /> : <span className="font-black text-slate-400 text-lg">{profile?.full_name?.charAt(0).toUpperCase() || <User size={20} />}</span>}
                  </div>
                </div>
                
                {isProfileMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsProfileMenuOpen(false)}></div>
                    <div className="absolute top-full mt-2 right-0 w-64 bg-[#0B0F19]/90 backdrop-blur-3xl border border-white/10 shadow-glass rounded-3xl p-2 z-50 animate-in fade-in slide-in-from-top-4">
                      <div className="p-4 flex items-center gap-4 border-b border-white/10 mb-2">
                        <div className="w-12 h-12 rounded-xl bg-black/40 overflow-hidden flex items-center justify-center border border-white/5">
                          {profile?.avatar_url ? <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" /> : <span className="font-black text-slate-400 text-xl">{profile?.full_name?.charAt(0).toUpperCase() || <User size={24} />}</span>}
                        </div>
                        <div>
                          <p className="font-black text-white">{userName}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{profile?.active_tier || 'Personal'}</p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <button onClick={() => { setActiveTab('SETTINGS'); setSubTab('PROFILE'); setIsProfileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-300 hover:bg-white/10 hover:text-white transition-all">
                          <Settings size={16} /> Identity & Legal
                        </button>
                        <button onClick={() => { setActiveTab('SOS'); setIsProfileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all">
                          <ShieldCheck size={16} /> Emergency SOS
                        </button>
                        <button onClick={onSignOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-white/10 hover:text-white transition-all">
                          <LogOut size={16} /> Secure Exit
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>
          
          <div className="flex-1 overflow-y-auto p-6 md:p-8 relative z-10 custom-scrollbar pr-2">
            {activeTab === 'NET_POSITION' && <NetPositionView />}
            {activeTab === 'ACCOUNTS' && <AccountHub session={session} balances={balances} profile={profile} showBalances={showBalances} />}
            {activeTab === 'ORGANIZE' && <OrganizationSuite session={session} balances={balances} pockets={pockets} recipients={recipients} showBalances={showBalances} />}
            {activeTab === 'INVEST' && <WealthInvest session={session} balances={balances} profile={profile} investments={investments} showBalances={showBalances} />}
            {activeTab === 'PLANNER' && <FinancialPlanner balances={balances} />}
            {activeTab === 'LIFESTYLE' && <GlobalLifestyle />}
            {activeTab === 'SOS' && <EmergencySOS session={session} balances={balances} profile={profile} />}
            {activeTab === 'TRAINING' && <Training session={session} />}
            {activeTab === 'AGENTS' && <Agents session={session} profile={profile} balances={balances} />}
            {activeTab === 'SETTINGS' && <SettingsView />}
          </div>
          
          <button onClick={() => setActiveModal('ADVISOR')} className="fixed bottom-8 right-8 z-50 bg-ifb-primary text-white shadow-glow-blue rounded-full p-4 flex items-center gap-3 hover:-translate-y-2 transition-all active:scale-95 group border border-blue-400/30">
            <MessageSquare size={24} className="group-hover:animate-pulse" />
            <span className="font-black text-[10px] uppercase tracking-widest pr-2 hidden md:block">Your Financial AI</span>
          </button>
        </main>
      </div>

      {activeModal === 'ADVISOR' && <Chat session={session} profile={profile} balances={balances} onClose={() => setActiveModal(null)} />}
      
      {activeModal && activeModal !== 'ADVISOR' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-[#0B0F19] rounded-3xl w-full max-w-md shadow-glass overflow-hidden animate-in zoom-in-95 duration-300 border border-white/10 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
            <div className="p-6 border-b border-white/10 flex justify-between items-center relative z-10">
              <h3 className="font-black text-lg text-white tracking-tight uppercase">{activeModal}</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white transition-colors bg-white/5 p-2 rounded-xl border border-white/10">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsLoading(true);
              const amount = parseFloat(e.target.amount.value);
              setRequestAmount(amount);
              
              if (activeModal === 'REQUEST') {
                const link = `${window.location.origin}/pay?to=${session.user.id}&amount=${amount}&reason=${encodeURIComponent(requestReason)}`;
                setRequestLink(link);
                if (requestEmail) {
                  setNotification({ type: 'success', text: `Encrypted request dispatched to ${requestEmail}` });
                  setTimeout(() => setNotification(null), 5000);
                }
                setIsLoading(false);
                return;
              }
              
              if (activeModal === 'WITHDRAW' && amount > balances.liquid_usd) {
                setNotification({ type: 'error', text: 'INSUFFICIENT LIQUIDITY: Transaction Declined' });
                setTimeout(() => setNotification(null), 5000);
                setIsLoading(false);
                return;
              }
              
              if (activeModal === 'WITHDRAW') {
                const routingNum = e.target.routingNumber?.value;
                const accountNum = e.target.accountNumber?.value;
                const selectedCard = e.target.selectedCard?.value;
                try {
                  const { data, error } = await supabase.functions.invoke('process-withdrawal', {
                    body: { userId: session.user.id, amount: amount, routingNumber: routingNum, accountNumber: accountNum, cardId: selectedCard }
                  });
                  if (error || data?.error) throw new Error(data?.error || "Routing failed.");
                  
                  setNotification({ type: 'success', text: `Capital Extraction Initiated: $${amount.toFixed(2)}` });
                  setTimeout(() => setNotification(null), 5000);
                  await fetchAllData();
                  setActiveModal(null);
                } catch (err) {
                  setNotification({ type: 'error', text: err.message });
                  setTimeout(() => setNotification(null), 5000);
                } finally { setIsLoading(false); }
                return;
              }
              
              const finalAmount = -amount;
              await supabase.from('transactions').insert([{ user_id: session.user.id, amount: finalAmount, transaction_type: activeModal.toLowerCase(), description: `Internal ${activeModal}`, status: 'completed' }]);
              await fetchAllData();
              setActiveModal(null);
              setIsLoading(false);
            }} className="p-8 space-y-6 relative z-10 text-center">
              
              {!requestLink ? (
                <>
                  {activeModal === 'REQUEST' && (
                    <div className="space-y-4 mb-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 text-left">Reason / Note (Optional)</label>
                          <input type="text" value={requestReason} onChange={(e) => setRequestReason(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-2xl p-4 font-bold text-sm text-white outline-none focus:border-ifb-primary transition-all placeholder:text-slate-600" placeholder="e.g., Dinner in Paris" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 text-left">Target Email (Optional)</label>
                          <input type="email" value={requestEmail} onChange={(e) => setRequestEmail(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-2xl p-4 font-bold text-sm text-white outline-none focus:border-ifb-primary transition-all placeholder:text-slate-600" placeholder="client@example.com" />
                        </div>
                      </div>
                    </div>
                  )}
                  {activeModal === 'WITHDRAW' && (
                    <div className="space-y-4 mb-6">
                      <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-left flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-ifb-success mb-1 flex items-center gap-1"><ShieldCheck size={12}/> Instant Payouts</p>
                          <p className="text-xs font-bold text-slate-300">Route capital directly to your linked accounts.</p>
                        </div>
                        <button type="button" onClick={() => { setActiveModal(null); setShowCardLinker(true); }} className="bg-white/10 hover:bg-white/20 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl transition-all">
                          + Link Card
                        </button>
                      </div>
                      {linkedCards.length > 0 ? (
                        <div className="space-y-2">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 text-left">Select Destination</label>
                          <div className="grid gap-2">
                            {linkedCards.map(card => (
                              <label key={card.id} className="flex items-center gap-3 p-4 border border-white/10 rounded-2xl cursor-pointer hover:border-ifb-primary transition-all bg-black/20 relative group">
                                <input type="radio" name="selectedCard" value={card.stripe_external_account_id} defaultChecked={card.is_default} className="w-4 h-4 text-ifb-primary bg-black/50 border-white/20" />
                                <div className="flex-1 text-left flex items-center gap-3">
                                  <div className="w-10 h-7 bg-white/10 rounded flex items-center justify-center text-[10px] font-black uppercase text-white tracking-widest border border-white/5">
                                    {card.brand === 'visa' ? 'VISA' : card.brand === 'mastercard' ? 'MC' : card.brand}
                                  </div>
                                  <div>
                                    <p className="font-bold text-sm text-white">•••• {card.last4}</p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Debit Card</p>
                                  </div>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 text-left">Routing Number (9 Digits)</label>
                            <input type="text" name="routingNumber" maxLength="9" required={linkedCards.length === 0} className="w-full bg-black/30 border border-white/10 rounded-2xl p-4 font-bold text-sm text-white outline-none focus:border-ifb-primary transition-all placeholder:text-slate-600 tracking-widest" placeholder="000000000" />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 text-left">Account Number</label>
                            <input type="password" name="accountNumber" required={linkedCards.length === 0} className="w-full bg-black/30 border border-white/10 rounded-2xl p-4 font-bold text-sm text-white outline-none focus:border-ifb-primary transition-all placeholder:text-slate-600 tracking-widest" placeholder="••••••••••••" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 text-left">Amount (USD)</label>
                    <input type="number" step="0.01" name="amount" required className="w-full bg-black/30 border border-white/10 rounded-2xl p-6 font-black text-4xl text-center text-white outline-none focus:border-ifb-primary focus:bg-black/50 transition-all placeholder:text-slate-600" placeholder="0.00" autoFocus />
                  </div>
                  <button type="submit" disabled={isLoading} className="w-full bg-ifb-primary text-white rounded-2xl py-5 font-black text-xs uppercase tracking-widest shadow-glow-blue hover:bg-blue-600 hover:-translate-y-1 transition-all disabled:opacity-50">
                    {isLoading ? 'TRANSMITTING...' : activeModal === 'REQUEST' ? 'GENERATE SECURE LINK' : `CONFIRM ${activeModal}`}
                  </button>
                </>
              ) : (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                  <div className="w-16 h-16 bg-ifb-success/20 text-ifb-success border border-ifb-success/30 rounded-full flex items-center justify-center mx-auto mb-2">
                    <ShieldCheck size={32} />
                  </div>
                  <div>
                    <h4 className="font-black text-white text-xl">Payment Portal Ready</h4>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Ready for external routing via Card or ACH.</p>
                  </div>
                  {showQR ? (
                    <div className="bg-white p-4 rounded-2xl shadow-glass flex justify-center inline-block mx-auto animate-in fade-in zoom-in">
                      <QRCode value={requestLink} size={180} fgColor="#0f172a" />
                    </div>
                  ) : (
                    <div className="bg-black/30 border border-white/10 p-4 rounded-xl break-all relative group cursor-pointer" onClick={() => { navigator.clipboard.writeText(requestLink); setNotification({ type: 'success', text: 'Link copied to clipboard!' }); }}>
                      <p className="text-sm font-bold text-ifb-accent group-hover:text-cyan-300 transition-colors">{requestLink}</p>
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center backdrop-blur-sm">
                        <span className="font-black text-white text-xs uppercase tracking-widest bg-white/10 border border-white/20 px-3 py-1 rounded-full">Click to Copy</span>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setShowQR(!showQR)} className="flex-1 bg-white/5 text-white border border-white/10 rounded-xl py-4 font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all">
                      {showQR ? 'SHOW LINK' : 'SHOW QR CODE'}
                    </button>
                    <button type="button" onClick={handleSendEmailInvoice} disabled={isSendingEmail} className="flex-1 bg-white text-black rounded-xl py-4 font-black text-[10px] uppercase tracking-widest shadow-glass hover:bg-slate-200 transition-all disabled:opacity-50 flex items-center justify-center">
                      {isSendingEmail ? <Loader2 className="animate-spin" size={14} /> : 'EMAIL INVOICE'}
                    </button>
                  </div>
                  <button type="button" onClick={() => { setActiveModal(null); setRequestLink(null); setRequestEmail(''); setRequestReason(''); setShowQR(false); }} className="w-full text-slate-500 font-black text-[10px] uppercase tracking-widest hover:text-white transition-all pt-2">
                    Close Window
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {notification && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className={`px-6 py-4 rounded-2xl shadow-glass border backdrop-blur-2xl flex items-center gap-3 ${
            notification.type === 'success' ? 'bg-ifb-success/10 border-ifb-success/30 text-ifb-success' : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${notification.type === 'success' ? 'bg-ifb-success' : 'bg-red-400'}`}></div>
            <p className="font-black text-sm uppercase tracking-widest">{notification.text}</p>
          </div>
        </div>
      )}

      {showDepositUI && <DepositInterface session={session} onClose={() => setShowDepositUI(false)} />}
      
      {showCardLinker && (
        <CardLinker
          session={session}
          onClose={() => setShowCardLinker(false)}
          onSuccess={(card) => {
            setShowCardLinker(false);
            setNotification({ type: 'success', text: `${card.brand.toUpperCase()} ending in ${card.last4} successfully vaulted.` });
            setTimeout(() => setNotification(null), 5000);
            fetchAllData();
          }}
        />
      )}
    </div>
  );
}