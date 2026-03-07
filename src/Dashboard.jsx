import { useState, useEffect, useRef } from 'react';
import { supabase } from './services/supabaseClient'; // Ensure correct path
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
import WithdrawalPage from './WithdrawalPage'; // NEW: Import the Withdrawal Engine
import QRCode from "react-qr-code";
import {
  Briefcase, ArrowRightLeft, ShieldCheck,
  LogOut, Menu, X, Landmark, Clock,
  Send, Download, Plus, MessageSquare,
  Sparkles, Settings, Eye, EyeOff, Target, TrendingUp,
  Folder, Compass, User, BookOpen, ArrowRight, Coffee,
  Camera, FileText, Lock, Info, Bell, Users, BarChart2, Globe, PieChart, Search,
  Sun, Moon, Sunrise, Loader2, CreditCard, Scale,
  ArrowDownToLine, FileSignature, Mail, ShieldAlert, Accessibility,
  Shield, Fingerprint, MapPin, Heart, UploadCloud, RefreshCw,
  Filter, Calendar, ArrowDownUp, FileDown,
  CheckCircle2, XCircle, ArrowUpRight, ArrowDownRight, Building
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
  
  const [activeTxTab, setActiveTxTab] = useState('ALL');
  
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

  // Commercial Onboarding States
  const [commercialProfile, setCommercialProfile] = useState(null);
  const [commercialForm, setCommercialForm] = useState({ company_name: '', sector: '', registration_country: '', annual_revenue: '', monthly_burn_rate: '', debt_to_equity_ratio: '' });
  const [isSubmittingCommercial, setIsSubmittingCommercial] = useState(false);
  
  // Accessibility States
  const [accessSettings, setAccessSettings] = useState({ theme: 'system', contrast: false, textSize: 'default', motion: false });
  const [previewAccess, setPreviewAccess] = useState({ theme: 'system', contrast: false, textSize: 'default', motion: false });
  
  // Transaction & Statement States
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [statementConfig, setStatementConfig] = useState({ startDate: '', endDate: '', format: 'pdf', isOfficial: false });
  
  // Extended KYC & ID Scan States
  const [kycForm, setKycForm] = useState({ legalName: '', dob: '', phone: '', address: '', country: '', relationshipStatus: '', idDocumentUrl: '' });
  const [isSubmittingKyc, setIsSubmittingKyc] = useState(false);
  const [isUploadingId, setIsUploadingId] = useState(false);
  
  // Security & Account States
  const [emailChange, setEmailChange] = useState({ newEmail: '', otp: '', step: 'init' });
  const [mfaState, setMfaState] = useState({ qrCode: '', secret: '', verifyCode: '', factorId: '', step: 'init' });
  
  // Payment States
  const [notification, setNotification] = useState(null);
  const [showDepositUI, setShowDepositUI] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false); // NEW: Controls the Full P2P Withdrawal Page
  const [requestEmail, setRequestEmail] = useState('');
  const [requestLink, setRequestLink] = useState(null);
  const [requestReason, setRequestReason] = useState('');
  const [requestAmount, setRequestAmount] = useState(0);
  const [showQR, setShowQR] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [sendRecipient, setSendRecipient] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  
  // Payment Request Targeting
  const [requestTargetType, setRequestTargetType] = useState('INTERNAL');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [isSearchingUser, setIsSearchingUser] = useState(false);
  
  const fileInputRef = useRef(null);
  const searchDebounce = useRef(null);

  const tabTitles = {
    NET_POSITION: 'Home', ACCOUNTS: 'Accounts', ORGANIZE: 'Organize', INVEST: 'Wealth',
    PLANNER: 'Planner', LIFESTYLE: 'Lifestyle', SOS: 'SOS', TRAINING: 'Training',
    SETTINGS: 'Settings', AGENTS: 'Your Team', TRANSACTIONS: 'Transactions',
    COMMERCIAL_HUB: 'Commercial Underwriting'
  };

  useEffect(() => {
    if (window.location.hash.includes('access_token') || window.location.hash.includes('error')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const triggerGlobalActionNotification = (type, message) => {
    setNotification({ type, text: message });
    console.log(`System Event: ${message}. Dispatching In-App Alert and Email to ${session?.user?.email}`);
    setTimeout(() => setNotification(null), 6000);
  };

  useEffect(() => {
    if (userSearchQuery.length > 2) {
      setIsSearchingUser(true);
      const delaySearch = setTimeout(async () => {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, email')
          .or(`full_name.ilike.%${userSearchQuery}%,email.ilike.%${userSearchQuery}%`)
          .neq('id', session.user.id)
          .limit(1)
          .maybeSingle();
        setFoundUser(data);
        setIsSearchingUser(false);
      }, 400);
      return () => clearTimeout(delaySearch);
    } else {
      setFoundUser(null);
    }
  }, [userSearchQuery]);

  const fetchAllData = async () => {
    if (!session?.user?.id) return;
    const { data: pData } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    const { data: bData } = await supabase.from('balances').select('*').eq('user_id', session.user.id).maybeSingle();
    
    const { data: commData } = await supabase.from('commercial_profiles').select('*').eq('id', session.user.id).maybeSingle();
    if (commData) {
      setCommercialProfile(commData);
      setCommercialForm({
        company_name: commData.company_name || '',
        sector: commData.sector || '',
        registration_country: commData.registration_country || '',
        annual_revenue: commData.annual_revenue || '',
        monthly_burn_rate: commData.monthly_burn_rate || '',
        debt_to_equity_ratio: commData.debt_to_equity_ratio || ''
      });
    }

    if (pData) {
      setProfile(pData);
      setEditedName(pData.full_name || '');
      setKycForm({
        legalName: pData.full_legal_name || '',
        dob: pData.dob || '',
        phone: pData.phone || '',
        address: pData.residential_address || '',
        country: pData.country || '',
        relationshipStatus: pData.relationship_status || '',
        idDocumentUrl: pData.id_document_url || ''
      });
      const loadedAccess = {
        theme: pData.theme_preference || 'system',
        contrast: pData.high_contrast || false,
        textSize: pData.text_size || 'default',
        motion: pData.reduce_motion || false
      };
      setAccessSettings(loadedAccess);
      setPreviewAccess(loadedAccess);
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
        searchResults({ transactions: trans || [], notifications: notifs || [], pockets: pocks || [], recipients: recs || [], investments: invs || [] });
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
    try {
      const filePath = `${session.user.id}/avatar_${Date.now()}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const { error: dbError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', session.user.id);
      if (dbError) throw dbError;
      triggerGlobalActionNotification('success', 'Institutional Identity Photo Updated.');
      await fetchAllData();
    } catch (err) {
      triggerGlobalActionNotification('error', `Update Failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNameUpdate = async () => {
    setIsLoading(true);
    await supabase.from('profiles').update({ full_name: editedName }).eq('id', session.user.id);
    await fetchAllData();
    setIsLoading(false);
  };

  const handleSaveAccessibility = async (newSettings) => {
    setAccessSettings(newSettings);
    document.documentElement.setAttribute('data-theme', newSettings.theme);
    document.documentElement.setAttribute('data-contrast', newSettings.contrast ? 'high' : 'normal');
    document.documentElement.setAttribute('data-text-size', newSettings.textSize);
    document.documentElement.setAttribute('data-reduce-motion', newSettings.motion ? 'true' : 'false');
    await supabase.from('profiles').update({
      theme_preference: newSettings.theme,
      high_contrast: newSettings.contrast,
      text_size: newSettings.textSize,
      reduce_motion: newSettings.motion
    }).eq('id', session.user.id);
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
        kyc_status: 'verified'
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

  const markAsRead = async (id) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    await fetchAllData();
  };

  const handleConfirmRequest = async (notif) => {
    setIsLoading(true);
    try {
        if (balances.liquid_usd < notif.amount) {
            setNotification({ type: 'error', text: 'Insufficient cash on hand to fulfill this request.' });
            setIsLoading(false);
            return;
        }

        const { error: rpcError } = await supabase.rpc('p2p_transfer', {
            sender_id: session.user.id,
            receiver_id: notif.metadata?.requester_id || notif.related_user_id,
            transfer_amount: notif.amount || notif.metadata?.amount
        });
        if (rpcError) throw rpcError;

        await supabase.from('notifications').update({ 
            status: 'completed', 
            read: true, 
            message: notif.message + ' (Confirmed)' 
        }).eq('id', notif.id);

        await supabase.from('notifications').insert([{
            user_id: notif.metadata?.requester_id || notif.related_user_id,
            message: `${userName} confirmed your payment request for ${formatCurrency(notif.amount || notif.metadata?.amount)}.`,
            type: 'system'
        }]);

        setNotification({ type: 'success', text: `Successfully routed ${formatCurrency(notif.amount || notif.metadata?.amount)}.` });
        await fetchAllData();
    } catch (err) {
        setNotification({ type: 'error', text: 'Failed to process the request.' });
    } finally {
        setIsLoading(false);
    }
  };

  // --- NEW: Handle Banker Accepting P2P Escrow Request ---
  const handleAcceptP2PWithdrawal = async (notif) => {
    setIsLoading(true);
    try {
      // If we had the trade_id in the metadata, we update it in the trades table.
      if (notif.metadata?.trade_id) {
        await supabase.from('p2p_trades').update({ status: 'in_progress' }).eq('id', notif.metadata.trade_id);
      }
      
      // Update notification status
      await supabase.from('notifications').update({ 
        read: true, 
        status: 'accepted', 
        message: notif.message + ' (Accepted & Locked in Escrow)' 
      }).eq('id', notif.id);

      triggerGlobalActionNotification('success', 'P2P Request Accepted. Please fulfill the cash delivery to the user.');
      await fetchAllData();
    } catch (err) {
      triggerGlobalActionNotification('error', 'Failed to accept P2P request.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeclineRequest = async (notif) => {
    setIsLoading(true);
    try {
        await supabase.from('notifications').update({ 
            status: 'declined', 
            read: true, 
            message: notif.message + ' (Declined)' 
        }).eq('id', notif.id);
        
        await supabase.from('notifications').insert([{
            user_id: notif.metadata?.requester_id || notif.related_user_id,
            message: `${userName} declined your request.`,
            type: 'system'
        }]);

        setNotification({ type: 'success', text: 'Request officially declined.' });
        await fetchAllData();
    } catch (err) {
        setNotification({ type: 'error', text: 'Failed to decline request.' });
    } finally {
        setIsLoading(false);
    }
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

  const handleIdDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploadingId(true);
    const filePath = `${session.user.id}/ID_${Date.now()}`;
    const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file, { upsert: true });
    if (uploadError) { setNotification({ type: 'error', text: 'ID Scan Failed.' }); setIsUploadingId(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath);
    setKycForm({ ...kycForm, idDocumentUrl: publicUrl });
    setNotification({ type: 'success', text: 'ID Document Securely Vaulted.' });
    setIsUploadingId(false);
  };

  const handleEmailChangeRequest = async () => {
    if (!emailChange.newEmail) return;
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ email: emailChange.newEmail });
    if (error) { setNotification({ type: 'error', text: error.message }); }
    else {
      setEmailChange({ ...emailChange, step: 'verify' });
      setNotification({ type: 'success', text: `Verification code sent to ${emailChange.newEmail}` });
    }
    setIsLoading(false);
  };

  const handleVerifyEmailChange = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email: emailChange.newEmail, token: emailChange.otp, type: 'email_change' });
    if (error) { setNotification({ type: 'error', text: 'Invalid verification code.' }); }
    else {
      setNotification({ type: 'success', text: 'Primary email successfully updated.' });
      setEmailChange({ newEmail: '', otp: '', step: 'init' });
    }
    setIsLoading(false);
  };

  const startMfaEnrollment = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    if (error) { setNotification({ type: 'error', text: 'Failed to initialize Authenticator.' }); }
    else {
      setMfaState({ ...mfaState, qrCode: data.totp.qr_code, secret: data.totp.secret, factorId: data.id, step: 'scan' });
    }
    setIsLoading(false);
  };

  const verifyMfaEnrollment = async () => {
    setIsLoading(true);
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: mfaState.factorId });
    if (challengeError) return setIsLoading(false);
    const { error } = await supabase.auth.mfa.verify({ factorId: mfaState.factorId, challengeId: challenge.id, code: mfaState.verifyCode });
    if (error) { setNotification({ type: 'error', text: 'Invalid Authenticator Code.' }); }
    else {
      await supabase.from('profiles').update({ mfa_enabled: true }).eq('id', session.user.id);
      setMfaState({ ...mfaState, step: 'verified' });
      setProfile({...profile, mfa_enabled: true});
      setNotification({ type: 'success', text: 'Maximum Security Enabled.' });
    }
    setIsLoading(false);
  };

  const handlePreviewAccessibility = (key, value) => {
    const updated = { ...previewAccess, [key]: value };
    setPreviewAccess(updated);
    document.documentElement.setAttribute('data-theme', updated.theme);
    document.documentElement.setAttribute('data-contrast', updated.contrast ? 'high' : 'normal');
    document.documentElement.setAttribute('data-text-size', updated.textSize);
    document.documentElement.setAttribute('data-reduce-motion', updated.motion ? 'true' : 'false');
  };

  const saveAccessibility = async () => {
    setAccessSettings(previewAccess);
    await supabase.from('profiles').update({
      theme_preference: previewAccess.theme, high_contrast: previewAccess.contrast, text_size: previewAccess.textSize, reduce_motion: previewAccess.motion
    }).eq('id', session.user.id);
    setNotification({ type: 'success', text: 'Display preferences applied and saved.' });
  };

  const handleCommercialSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingCommercial(true);
    try {
      const { error } = await supabase.from('commercial_profiles').upsert({
        id: session.user.id,
        company_name: commercialForm.company_name,
        sector: commercialForm.sector,
        registration_country: commercialForm.registration_country,
        annual_revenue: parseFloat(commercialForm.annual_revenue),
        monthly_burn_rate: parseFloat(commercialForm.monthly_burn_rate),
        debt_to_equity_ratio: parseFloat(commercialForm.debt_to_equity_ratio),
        pascaline_status: 'pending_review' 
      });
      if (error) throw error;
      triggerGlobalActionNotification('success', 'Corporate telemetry submitted. Pascaline AI audit initiated.');
      await fetchAllData();
    } catch (err) {
      triggerGlobalActionNotification('error', err.message || 'Submission failed.');
    } finally {
      setIsSubmittingCommercial(false);
    }
  };

  const renderNetPositionView = () => {
    const safeTotalNetWorth = totalNetWorth || 1; 
    const liquidPct = ((balances.liquid_usd || 0) / safeTotalNetWorth) * 100;
    const alphaPct = ((balances.alpha_equity_usd || 0) / safeTotalNetWorth) * 100;
    const safePct = ((balances.mysafe_digital_usd || 0) / safeTotalNetWorth) * 100;
    
    const validTxs = transactions.filter(tx => tx.status !== 'failed' && tx.status !== 'pending');
    
    const totalInflow = validTxs.filter(tx => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0);
    const totalOutflow = validTxs.filter(tx => tx.amount < 0).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const totalFlowVolume = (totalInflow + totalOutflow) || 1; 
    
    const inflowPct = (totalInflow / totalFlowVolume) * 100;
    const outflowPct = (totalOutflow / totalFlowVolume) * 100;
    const avgTransactionValue = validTxs.length > 0
      ? validTxs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) / validTxs.length
      : 0;

    return (
      <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
        {profile && profile.kyc_status !== 'verified' && (
          <div className="bg-red-50 border border-red-200 p-5 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
            <div>
              <h3 className="text-red-600 font-black uppercase tracking-widest text-xs flex items-center gap-2"><ShieldAlert size={16}/> Regulatory Action Required</h3>
              <p className="text-slate-600 text-sm mt-1 font-medium">To comply with global anti-money laundering laws, you must complete Identity Verification (KYC) within 30 days to prevent account suspension.</p>
            </div>
            <button onClick={() => { setActiveTab('SETTINGS'); setSubTab('PROFILE'); }} className="px-6 py-3 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-700 transition-colors whitespace-nowrap shadow-md">
              Verify Identity Now
            </button>
          </div>
        )}
        <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 shadow-sm">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            {hour < 12 ? <Sunrise size={32} /> : hour < 18 ? <Sun size={32} /> : <Moon size={32} />}
          </div>
          <div className="flex-1 text-center md:text-left space-y-2">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">{greeting}, {userName}.</h1>
            <p className="text-slate-600 leading-relaxed text-sm md:text-base">{insight.text}</p>
          </div>
          <button onClick={() => insight.target === 'ADVISOR' ? setActiveModal('ADVISOR') : setActiveTab(insight.target)} className="mx-auto md:mx-0 px-6 py-4 bg-blue-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-blue-600 hover:-translate-y-1 transition-all flex items-center gap-2">
            {insight.action} <ArrowRight size={14} />
          </button>
        </div>
        <div className="w-full">
          <div className="bg-gradient-to-br from-blue-700 to-blue-500 rounded-3xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-blue-100 font-medium tracking-wider uppercase">Total Safety Net</span>
              <button onClick={() => setShowBalances(!showBalances)} className="text-blue-200 hover:text-white transition-colors" title="Toggle Balance Privacy">
                {showBalances ? <Eye size={22} /> : <EyeOff size={22} />}
              </button>
            </div>
            <h2 className="text-5xl md:text-6xl font-black tracking-tight mb-8">{formatCurrency(totalNetWorth)}</h2>
            <button onClick={() => setActiveTab('ACCOUNTS')} className="w-14 h-14 bg-white/10 text-white rounded-2xl flex items-center justify-center hover:bg-white hover:text-blue-900 hover:-translate-y-1 transition-all">
              <ArrowRight size={24} />
            </button>
          </div>
        </div>
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
          <button onClick={() => setShowDepositUI(true)} className="flex-1 min-w-[100px] flex items-center justify-center gap-2 py-4 px-4 rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest bg-blue-700 text-white shadow-lg transition-all hover:bg-blue-600">
            <Plus size={16} /> Deposit
          </button>
          
          {/* NEW: Updated Withdraw Button to Open the WithdrawalPage Engine */}
          <button onClick={() => setIsWithdrawOpen(true)} className="flex-1 min-w-[100px] flex items-center justify-center gap-2 py-4 px-4 rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest bg-slate-800 text-white shadow-lg transition-all hover:bg-slate-700">
            <Landmark size={16} /> Withdraw
          </button>
          
          <div className="w-px h-10 bg-slate-200/60 mx-1 hidden md:block"></div>
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-4 px-4 rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all ${showAnalytics ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-white text-slate-700 border border-transparent hover:border-indigo-100 shadow-sm'}`}
          >
            <BarChart2 size={16} /> Analytics
          </button>
        </div>
        <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl p-6 md:p-8 shadow-sm transition-all duration-500 min-h-[300px]">
          {showAnalytics ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-500">
              {/* CARD 1: CASHFLOW DYNAMICS */}
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2"><TrendingUp size={16} className="text-indigo-500" /> Cashflow</h3>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-2 py-1 rounded-md">All Time</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1.5">
                      <span className="text-emerald-600">Total Inflow</span>
                      <span className="text-emerald-600">{formatCurrency(totalInflow)}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${inflowPct}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1.5">
                      <span className="text-slate-600">Total Outflow</span>
                      <span className="text-slate-800">{formatCurrency(totalOutflow)}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-slate-400 h-full rounded-full transition-all duration-1000 delay-300" style={{ width: `${outflowPct}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
              {/* CARD 2: ASSET ALLOCATION */}
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2"><PieChart size={16} className="text-blue-500" /> Allocation</h3>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-2 py-1 rounded-md">Net Worth</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-800"></div>Cash</span>
                    <span className="text-xs font-bold text-slate-800">{liquidPct.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div>Alpha</span>
                    <span className="text-xs font-bold text-slate-800">{alphaPct.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500"></div>Vault</span>
                    <span className="text-xs font-bold text-slate-800">{safePct.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-3 rounded-full flex overflow-hidden mt-3 gap-0.5 shadow-inner">
                    <div className="bg-slate-800 h-full transition-all duration-1000" style={{ width: `${liquidPct}%` }}></div>
                    <div className="bg-blue-500 h-full transition-all duration-1000 delay-150" style={{ width: `${alphaPct}%` }}></div>
                    <div className="bg-indigo-500 h-full transition-all duration-1000 delay-300" style={{ width: `${safePct}%` }}></div>
                  </div>
                </div>
              </div>
              {/* CARD 3: TRANSACTION VELOCITY */}
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2"><BarChart2 size={16} className="text-emerald-500" /> Velocity</h3>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-2 py-1 rounded-md">Activity</span>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-end border-b border-slate-100 pb-3">
                    <span className="text-xs font-bold text-slate-500">Total Transactions</span>
                    <span className="text-xl font-black text-slate-800">{validTxs.length}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-bold text-slate-500">Average Volume</span>
                    <span className="text-lg font-black text-slate-800">{formatCurrency(avgTransactionValue)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-500">
              <button type="button" className="text-left bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer w-full" onClick={() => setActiveTab('ACCOUNTS')}>
                <div className="flex justify-between items-start mb-4 w-full">
                  <Landmark className="text-slate-400" size={24} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-2 py-1 rounded-full">Cash</span>
                </div>
                <p className="text-slate-500 font-medium text-sm mb-1">Cash on Hand</p>
                <p className="text-2xl font-black text-slate-800">{formatCurrency(balances.liquid_usd)}</p>
              </button>
              <button type="button" className="text-left bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer w-full" onClick={() => setActiveTab('INVEST')}>
                <div className="flex justify-between items-start mb-4 w-full">
                  <Briefcase className="text-blue-500" size={24} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 bg-blue-50 px-2 py-1 rounded-full">Alpha</span>
                </div>
                <p className="text-slate-500 font-medium text-sm mb-1">Investments</p>
                <p className="text-2xl font-black text-slate-800">{formatCurrency(balances.alpha_equity_usd)}</p>
              </button>
              <button type="button" className="text-left bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer w-full" onClick={() => setActiveTab('ORGANIZE')}>
                <div className="flex justify-between items-start mb-4 w-full">
                  <ShieldCheck className="text-indigo-500" size={24} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2 py-1 rounded-full">Vault</span>
                </div>
                <p className="text-slate-500 font-medium text-sm mb-1">Digital Safe</p>
                <p className="text-2xl font-black text-slate-800">{formatCurrency(balances.mysafe_digital_usd)}</p>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTransactionsView = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthTxs = transactions.filter(tx => {
      const d = new Date(tx.created_at);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const moneyIn = monthTxs.filter(tx => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0);
    const moneyOut = monthTxs.filter(tx => tx.amount < 0).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const netChange = moneyIn - moneyOut;
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-10">
        <div className="flex flex-col xl:flex-row gap-6">
          <div className="flex-1 bg-white border border-slate-200 p-8 rounded-[2rem] shadow-sm flex flex-col justify-center">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Transactions</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">Immutable Master Ledger</p>
          </div>
          <div className="flex-1 grid grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Net Change (This Month)</p>
              <p className={`text-xl font-black tracking-tight ${netChange >= 0 ? 'text-slate-800' : 'text-slate-800'}`}>
                {netChange >= 0 ? '+' : '-'}{formatCurrency(Math.abs(netChange))}
              </p>
            </div>
            <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1"><ArrowDownRight size={14} className="text-emerald-500"/> Money In</p>
              <p className="text-xl font-black tracking-tight text-emerald-600">{formatCurrency(moneyIn)}</p>
            </div>
            <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1"><ArrowUpRight size={14} className="text-slate-400"/> Money Out</p>
              <p className="text-xl font-black tracking-tight text-slate-800">{formatCurrency(moneyOut)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto no-scrollbar scroll-container">
              {['ALL', 'SUCCEEDED', 'PENDING', 'FAILED'].map(tab => (
                <button
                  key={tab} onClick={() => setActiveTxTab(tab)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTxTab === tab ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <button className="flex-1 md:flex-none px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 flex items-center justify-center gap-2 shadow-sm">
                <Filter size={14}/> Filter
              </button>
              <button onClick={() => setShowStatementModal(true)} className="flex-1 md:flex-none px-4 py-2 bg-slate-800 text-white border border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 flex items-center justify-center gap-2 shadow-sm">
                <FileDown size={14}/> Export
              </button>
            </div>
          </div>
          <div className="overflow-x-auto scroll-container">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-white">
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">Date & Time</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Description</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Method</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => {
                  const isPositive = tx.amount > 0;
                  const uiStatus = tx.status === 'completed' ? 'Succeeded' : tx.status === 'pending' ? 'Pending' : 'Failed';
                  
                  if (activeTxTab !== 'ALL' && activeTxTab !== uiStatus.toUpperCase()) return null;
                  return (
                    <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors group cursor-pointer">
                      <td className="p-4 whitespace-nowrap">
                        <p className="text-sm font-bold text-slate-800">{new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                        <p className="text-[10px] font-bold text-slate-400">{new Date(tx.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-bold text-slate-800 capitalize">{tx.description || tx.transaction_type}</p>
                        <p className="text-[10px] font-bold text-slate-400">ID: {tx.id.split('-')[0]}...</p>
                      </td>
                      <td className="p-4">
                        <span className="bg-slate-100 border border-slate-200 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest inline-block">
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td className="p-4">
                        {uiStatus === 'Succeeded' && <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg w-fit border border-emerald-100"><CheckCircle2 size={12}/> Succeeded</span>}
                        {uiStatus === 'Pending' && <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-3 py-1 rounded-lg w-fit border border-amber-100"><Clock size={12}/> Pending</span>}
                        {uiStatus === 'Failed' && <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-50 px-3 py-1 rounded-lg w-fit border border-red-100"><XCircle size={12}/> Failed</span>}
                      </td>
                      <td className={`p-4 text-sm font-black text-right whitespace-nowrap ${isPositive ? 'text-emerald-600' : 'text-slate-800'}`}>
                        {isPositive ? '+' : ''}{formatCurrency(tx.amount)} <span className="text-[10px] text-slate-400 ml-1">USD</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {transactions.length === 0 && (
              <div className="text-center py-16">
                <ArrowDownUp size={40} className="mx-auto text-slate-300 mb-4" />
                <p className="text-sm font-bold text-slate-600">No transactions found</p>
                <p className="text-xs text-slate-400 mt-1">Adjust your filters or initiate a transfer.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSettingsView = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="md:col-span-1 space-y-2 bg-white/60 backdrop-blur-xl border border-white/40 p-4 rounded-3xl shadow-sm h-fit">
        {[
          { id: 'PROFILE', label: 'Identity & Legal', icon: <User size={18} /> },
          { id: 'SECURITY', label: 'Security & Access', icon: <Shield size={18} /> },
          { id: 'LINKED_ACCOUNTS', label: 'Saved Banks', icon: <Landmark size={18} /> },
          { id: 'ACCESSIBILITY', label: 'Accessibility', icon: <Eye size={18} /> },
          { id: 'ABOUT', label: 'About IFB', icon: <Info size={18} /> },
        ].map((item) => (
          <button key={item.id} onClick={() => setSubTab(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${subTab === item.id ? 'bg-blue-600/10 text-blue-600 shadow-inner' : 'text-slate-500 hover:bg-white/50 hover:text-slate-800'}`}>
            {item.icon} {item.label}
          </button>
        ))}
        <div className="my-4 border-t border-slate-200/50"></div>
        <button onClick={onSignOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 hover:text-red-600 transition-all">
          <LogOut size={18} /> Secure Exit
        </button>
      </div>
      <div className="md:col-span-3 bg-white/60 backdrop-blur-xl border border-white/40 p-8 rounded-3xl shadow-sm">
        {subTab === 'PROFILE' && (
          <div className="space-y-8 max-w-2xl">
            <div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">Institutional Identity</h2>
              <p className="text-xs text-slate-500">Manage your core profile, communication methods, and global KYC status.</p>
            </div>
            <div className="flex items-center gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-200/50 shadow-sm">
              <button type="button" className="relative group cursor-pointer border-0 p-0 bg-transparent" onClick={handleAvatarClick}>
                <div className="w-20 h-20 rounded-2xl bg-slate-200 border border-slate-300 shadow-sm flex items-center justify-center overflow-hidden">
                  {profile?.avatar_url ? <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : <span className="text-3xl font-black text-slate-400">{profile?.full_name?.charAt(0).toUpperCase() || <User size={40} />}</span>}
                </div>
                <div className="absolute inset-0 bg-slate-900/50 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="text-white" size={24} />
                </div>
                <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
              </button>
              <div className="flex-1 space-y-3">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Display Name</label>
                <div className="flex gap-3">
                  <input type="text" value={editedName} onChange={(e) => setEditedName(e.target.value)} className="flex-1 bg-white border border-slate-200 rounded-xl p-3 font-bold text-sm text-slate-800 outline-none focus:border-blue-500 transition-all" />
                  <button onClick={handleNameUpdate} disabled={isLoading} className="px-6 bg-blue-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-blue-600 transition-all disabled:opacity-50">
                    Save
                  </button>
                </div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm">
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><Fingerprint className="text-blue-500" size={20}/> Identity Verification (KYC)</h3>
                {profile?.kyc_status === 'verified' ? (
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200"><ShieldCheck size={12} className="inline mr-1"/> Verified</span>
                ) : profile?.kyc_status === 'pending_review' ? (
                   <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200"><RefreshCw size={12} className="inline mr-1 animate-spin"/> AI Review Pending</span>
                ) : null}
              </div>
              <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!kycForm.idDocumentUrl) return setNotification({type: 'error', text: 'Government ID scan is required.'});
                  supabase.from('profiles').update({ ...kycForm, kyc_status: 'pending_review' }).eq('id', session.user.id).then(() => {
                    setNotification({ type: 'success', text: 'Documents submitted. AI Verification processing.'});
                    fetchAllData();
                  });
              }} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Full Legal Name</label>
                    <input type="text" value={kycForm.legalName} onChange={(e) => setKycForm({...kycForm, legalName: e.target.value})} disabled={profile?.kyc_status === 'verified'} required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm text-slate-800 outline-none focus:border-blue-500 disabled:opacity-50" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Date of Birth</label>
                    <input type="date" value={kycForm.dob} onChange={(e) => setKycForm({...kycForm, dob: e.target.value})} disabled={profile?.kyc_status === 'verified'} required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm text-slate-800 outline-none focus:border-blue-500 disabled:opacity-50" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2"><MapPin size={12} className="inline mr-1"/> Country of Residence</label>
                    <input type="text" value={kycForm.country} onChange={(e) => setKycForm({...kycForm, country: e.target.value})} disabled={profile?.kyc_status === 'verified'} required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm text-slate-800 outline-none focus:border-blue-500 disabled:opacity-50" placeholder="e.g. United States" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Residential Address</label>
                    <input type="text" value={kycForm.address} onChange={(e) => setKycForm({...kycForm, address: e.target.value})} disabled={profile?.kyc_status === 'verified'} required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm text-slate-800 outline-none focus:border-blue-500 disabled:opacity-50" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Phone Number</label>
                    <input type="tel" value={kycForm.phone} onChange={(e) => setKycForm({...kycForm, phone: e.target.value})} disabled={profile?.kyc_status === 'verified'} required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm text-slate-800 outline-none focus:border-blue-500 disabled:opacity-50" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2"><Heart size={12} className="inline mr-1"/> Relationship Status</label>
                    <select value={kycForm.relationshipStatus} onChange={(e) => setKycForm({...kycForm, relationshipStatus: e.target.value})} disabled={profile?.kyc_status === 'verified'} required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm text-slate-800 outline-none focus:border-blue-500 disabled:opacity-50">
                      <option value="">Select Status...</option>
                      <option value="single">Single</option>
                      <option value="married">Married</option>
                      <option value="divorced">Divorced</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4 p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-center relative">
                  {kycForm.idDocumentUrl ? (
                    <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold"><ShieldCheck size={20}/> ID Document Scanned Successfully</div>
                  ) : (
                    <>
                      <UploadCloud size={32} className="mx-auto text-blue-500 mb-2"/>
                      <p className="text-sm font-bold text-slate-800">Scan Government ID</p>
                      <p className="text-xs text-slate-500 mb-4">Required by international anti-money laundering laws.</p>
                      <button type="button" onClick={() => document.getElementById('idUpload').click()} disabled={isUploadingId} className="px-6 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-black uppercase tracking-widest shadow-sm hover:bg-slate-50">
                        {isUploadingId ? 'Scanning...' : 'Select File'}
                      </button>
                      <input type="file" id="idUpload" className="hidden" accept="image/*,.pdf" onChange={handleIdDocumentUpload} />
                    </>
                  )}
                </div>
                {profile?.kyc_status !== 'verified' && profile?.kyc_status !== 'pending_review' && (
                  <button type="submit" disabled={isSubmittingKyc} className="w-full bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest py-5 rounded-xl shadow-lg hover:bg-blue-600 transition-all">
                    Submit KYC to Compliance
                  </button>
                )}
              </form>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-8 rounded-3xl shadow-sm">
              <div className="flex items-center gap-3 mb-4"><Scale className="text-slate-500" size={24} /><h3 className="text-lg font-black text-slate-800">Master Service Agreement</h3></div>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">By signing, you agree to IFB operations under US (EIN: 33-1869013), Austria (91 323/2005), and Canada (CRA: 721487825 RC 0001) regulations.</p>
              {!profile?.docs_signed ? (
                <button onClick={handleSignAgreements} disabled={isLoading} className="w-full py-4 bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-700 transition-all">
                  Cryptographically Sign Terms
                </button>
              ) : (
                <div className="w-full py-4 bg-emerald-50 border border-emerald-200 text-emerald-600 font-black text-[10px] uppercase tracking-widest rounded-xl flex justify-center gap-2"><ShieldCheck size={16}/> Agreement Verified</div>
              )}
            </div>
          </div>
        )}
        {subTab === 'SECURITY' && (
          <div className="space-y-8 max-w-2xl animate-in fade-in">
            <div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">Security & Access</h2>
              <p className="text-xs text-slate-500">Protect your assets with Multi-Factor Authentication and secure routing credentials.</p>
            </div>
            <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-6 flex items-center gap-2"><Mail size={16} className="text-blue-500"/> Update Routing Email</h3>
              {emailChange.step === 'init' ? (
                <div className="flex gap-3">
                  <input type="email" value={emailChange.newEmail} onChange={(e) => setEmailChange({...emailChange, newEmail: e.target.value})} placeholder="New Email Address" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-blue-500" />
                  <button onClick={handleEmailChangeRequest} disabled={isLoading || !emailChange.newEmail} className="px-6 bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-700">Request Change</button>
                </div>
              ) : (
                <div className="flex gap-3 animate-in fade-in">
                  <input type="text" value={emailChange.otp} onChange={(e) => setEmailChange({...emailChange, otp: e.target.value})} placeholder="Enter 6-digit code sent to new email" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-center tracking-[0.5em] outline-none focus:border-blue-500" maxLength="6" />
                  <button onClick={handleVerifyEmailChange} disabled={isLoading || emailChange.otp.length < 6} className="px-6 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500">Verify Code</button>
                </div>
              )}
            </div>
            <div className="bg-slate-50 border border-slate-200 p-8 rounded-3xl shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2"><Lock size={16} className="text-blue-500"/> Authenticator App</h3>
                {profile?.mfa_enabled && <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-100 px-3 py-1 rounded-lg">Active</span>}
              </div>
              {!profile?.mfa_enabled && mfaState.step === 'init' && (
                <div>
                  <p className="text-xs text-slate-600 leading-relaxed mb-6">We highly recommend securing your institutional profile with a Time-Based One-Time Password (TOTP) application like Google Authenticator or Authy to prevent unauthorized access.</p>
                  <button onClick={startMfaEnrollment} disabled={isLoading} className="w-full py-4 bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg hover:bg-blue-600 transition-all">
                    Enable Authenticator
                  </button>
                </div>
              )}
              {mfaState.step === 'scan' && (
                <div className="space-y-6 text-center animate-in zoom-in-95">
                  <p className="text-sm font-bold text-slate-800">Scan this QR Code in your Authenticator App</p>
                  <div className="bg-white p-4 rounded-2xl shadow-sm inline-block mx-auto" dangerouslySetInnerHTML={{ __html: mfaState.qrCode }}></div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 break-all">Secret: {mfaState.secret}</p>
                  <input type="text" value={mfaState.verifyCode} onChange={(e) => setMfaState({...mfaState, verifyCode: e.target.value})} placeholder="Enter 6-digit code" className="w-full bg-white border border-slate-200 rounded-xl p-4 text-center font-bold text-xl tracking-[0.5em] outline-none focus:border-blue-500" maxLength="6" />
                  <button onClick={verifyMfaEnrollment} disabled={isLoading || mfaState.verifyCode.length < 6} className="w-full py-4 bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-emerald-500">
                    Verify & Enable MFA
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        {subTab === 'ACCESSIBILITY' && (
          <div className="space-y-8 max-w-2xl animate-in fade-in">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">Accessibility & Display</h2>
                <p className="text-xs text-slate-500">Customize your interface. Preview changes before applying.</p>
              </div>
              <button onClick={saveAccessibility} className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-lg">Save Preferences</button>
            </div>
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div><h4 className="text-sm font-bold text-slate-800">App Theme</h4></div>
                <select value={previewAccess.theme} onChange={(e) => handlePreviewAccessibility('theme', e.target.value)} className="bg-slate-100 border border-slate-200 text-sm font-bold rounded-xl px-4 py-2 outline-none">
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div><h4 className="text-sm font-bold text-slate-800">Adjust Text Size</h4></div>
                <select value={previewAccess.textSize} onChange={(e) => handlePreviewAccessibility('textSize', e.target.value)} className="bg-slate-100 border border-slate-200 text-sm font-bold rounded-xl px-4 py-2 outline-none">
                  <option value="default">Default</option>
                  <option value="large">Large</option>
                  <option value="extra_large">Extra Large</option>
                </select>
              </div>
              <button type="button" className="w-full p-6 border-b border-slate-100 flex items-center justify-between text-left hover:bg-slate-50 transition-colors" onClick={() => handlePreviewAccessibility('contrast', !previewAccess.contrast)}>
                <div><h4 className="text-sm font-bold text-slate-800">Increase Contrast</h4></div>
                <div className={`w-12 h-6 rounded-full transition-colors relative ${previewAccess.contrast ? 'bg-blue-600' : 'bg-slate-300'}`}><div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${previewAccess.contrast ? 'translate-x-6' : ''}`}></div></div>
              </button>
              <button type="button" className="w-full p-6 flex items-center justify-between text-left hover:bg-slate-50 transition-colors" onClick={() => handlePreviewAccessibility('motion', !previewAccess.motion)}>
                <div><h4 className="text-sm font-bold text-slate-800">Reduce Motion</h4></div>
                <div className={`w-12 h-6 rounded-full transition-colors relative ${previewAccess.motion ? 'bg-blue-600' : 'bg-slate-300'}`}><div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${previewAccess.motion ? 'translate-x-6' : ''}`}></div></div>
              </button>
            </div>
          </div>
        )}
        {subTab === 'ABOUT' && (
          <div className="space-y-8 max-w-2xl animate-in fade-in">
            <div className="text-center mb-10">
              <div className="w-24 h-24 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm text-blue-600">
                <Globe size={40}/>
              </div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-4">Infinite Future Bank</h2>
              <p className="text-sm text-slate-600 leading-relaxed max-w-lg mx-auto font-medium">DEUS is the primary technological interface for Infinite Future Bank (IFB), a globally regulated neo-banking institution designed to provide autonomous, highly secure capital architecture for the modern sovereign individual.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/50 shadow-sm text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">US HQ</p>
                <p className="text-sm font-bold text-slate-800">New York, NY</p>
                <p className="text-xs text-slate-500 mt-1">EIN: 33-1869013</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/50 shadow-sm text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">EU Office</p>
                <p className="text-sm font-bold text-slate-800">Vienna, Austria</p>
                <p className="text-xs text-slate-500 mt-1">Str: 91 323/2005</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/50 shadow-sm text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">CA Office</p>
                <p className="text-sm font-bold text-slate-800">Toronto, Canada</p>
                <p className="text-xs text-slate-500 mt-1">CRA: 721487825 RC 0001</p>
              </div>
            </div>
            <button type="button" className="w-full p-6 bg-blue-600 text-white rounded-3xl shadow-lg mt-8 text-center flex flex-col items-center justify-center hover:bg-blue-700 transition-colors">
              <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-80">Support Contact</p>
              <p className="text-lg font-bold">concierge@infinitefuturebank.org</p>
            </button>
          </div>
        )}
        {subTab === 'LINKED_ACCOUNTS' && (
          <div className="space-y-8 max-w-2xl animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-black text-slate-800 mb-2">Payout Methods</h2>
            <p className="text-xs text-slate-500 mb-8">Manage your connected bank accounts for withdrawals. (Note: Debit cards are processed for one-time use only for maximum security).</p>
            <div className="flex justify-end mb-6">
              <button className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-xl transition-all shadow-sm flex items-center gap-2">
                <Plus size={14} /> Add Bank Account
              </button>
            </div>
            <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <Landmark size={48} className="mx-auto mb-4 text-slate-400" />
              <p className="font-bold text-slate-800 mb-2">No Saved Banks</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">Link a bank account to enable secure ACH withdrawals.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderCommercialHub = () => (
    <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500">
      <div className="bg-slate-900 border border-slate-800 p-10 rounded-[3rem] shadow-xl text-white mb-8 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-black tracking-tight mb-2 flex items-center gap-3"><Building className="text-blue-400"/> Corporate Underwriting</h2>
          <p className="text-sm text-slate-400 max-w-xl leading-relaxed">Submit your financial telemetry to Pascaline. If your metrics meet institutional safety thresholds, you will be cleared to raise capital directly within the IFB Dark Pool.</p>
        </div>
      </div>

      {commercialProfile?.pascaline_status === 'eligible_for_funding' ? (
        <div className="bg-white border border-emerald-200 p-10 rounded-[3rem] shadow-sm text-center">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6"><ShieldCheck size={40}/></div>
          <h3 className="text-2xl font-black text-slate-800 mb-2">Approved for Capital Deployment</h3>
          <p className="text-sm text-slate-500 mb-8">Pascaline has audited your telemetry and underwritten your Dual-Insurance policy. You are now live in the Private Equity Vault.</p>
          <button onClick={() => setActiveTab('INVEST')} className="px-8 py-4 bg-emerald-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg">Manage Syndicate Parameters</button>
        </div>
      ) : commercialProfile?.pascaline_status === 'pending_review' ? (
        <div className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-sm text-center">
          <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6"><Loader2 size={40} className="animate-spin"/></div>
          <h3 className="text-2xl font-black text-slate-800 mb-2">Pascaline Audit in Progress</h3>
          <p className="text-sm text-slate-500">The AI engine is currently validating your revenue models and calculating your risk parameters.</p>
        </div>
      ) : (
        <form onSubmit={handleCommercialSubmit} className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Legal Corporate Name</label>
              <input required type="text" value={commercialForm.company_name} onChange={e => setCommercialForm({...commercialForm, company_name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-blue-500" placeholder="e.g. SpaceX" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Industry Sector</label>
              <input required type="text" value={commercialForm.sector} onChange={e => setCommercialForm({...commercialForm, sector: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-blue-500" placeholder="e.g. Aerospace" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Registration Country</label>
              <input required type="text" value={commercialForm.registration_country} onChange={e => setCommercialForm({...commercialForm, registration_country: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-blue-500" placeholder="e.g. United States" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Annual Revenue (USD)</label>
              <input required type="number" value={commercialForm.annual_revenue} onChange={e => setCommercialForm({...commercialForm, annual_revenue: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-blue-500" placeholder="e.g. 5000000" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Monthly Burn Rate (USD)</label>
              <input required type="number" value={commercialForm.monthly_burn_rate} onChange={e => setCommercialForm({...commercialForm, monthly_burn_rate: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-blue-500" placeholder="e.g. 150000" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Debt-to-Equity Ratio</label>
              <input required type="number" step="0.01" value={commercialForm.debt_to_equity_ratio} onChange={e => setCommercialForm({...commercialForm, debt_to_equity_ratio: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-blue-500" placeholder="e.g. 1.2" />
            </div>
          </div>
          <button type="submit" disabled={isSubmittingCommercial} className="w-full py-5 bg-blue-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl disabled:opacity-50">
            {isSubmittingCommercial ? 'Submitting to Pascaline...' : 'Submit Financial Telemetry for Audit'}
          </button>
        </form>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-200">
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400/20 rounded-full blur-[120px]"></div>
      </div>
      <div className="flex h-screen overflow-hidden max-w-7xl mx-auto">
        {isSidebarOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden cursor-pointer" onClick={(e) => { e.preventDefault(); setIsSidebarOpen(false); }} onTouchEnd={(e) => { e.preventDefault(); setIsSidebarOpen(false); }}></div>
        )}
        <aside className={`fixed md:static inset-y-0 left-0 z-[150] w-64 bg-slate-100/80 backdrop-blur-xl border-r border-slate-200/60 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]`}>
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-4xl font-black text-[#4285F4]">D</span>
              <span className="text-4xl font-black text-[#EA4335]">E</span>
              <span className="text-4xl font-black text-[#FBBC04]">U</span>
              <span className="text-4xl font-black text-[#34A853]">S</span>
              <Sparkles size={18} className="text-blue-500 ml-1" />
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-slate-800 p-2">
              <X size={24} />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto py-4 px-4 space-y-2 no-scrollbar scroll-container">
            {[
              { id: 'NET_POSITION', icon: <Compass size={18} />, label: 'Home' },
              { id: 'TRANSACTIONS', icon: <ArrowDownUp size={18} />, label: 'Transactions' },
              { id: 'PLANNER', icon: <Target size={18} />, label: 'Planner' },
              { id: 'ACCOUNTS', icon: <Landmark size={18} />, label: 'Accounts' },
              { id: 'ORGANIZE', icon: <Folder size={18} />, label: 'Organize' },
              { id: 'INVEST', icon: <Briefcase size={18} />, label: 'Wealth' },
              { id: 'COMMERCIAL_HUB', icon: <Building size={18} />, label: 'Commercial' },
              { id: 'LIFESTYLE', icon: <Globe size={18} />, label: 'Lifestyle' },
              { id: 'TRAINING', icon: <BookOpen size={18} />, label: 'Training' },
              { id: 'AGENTS', icon: <Users size={18} />, label: 'Your Team' },
              { id: 'SETTINGS', icon: <Settings size={18} />, label: 'Settings' },
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
        <main className="flex-1 flex flex-col relative overflow-hidden">
          <header className="border-b border-slate-200/50 bg-white/40 backdrop-blur-xl flex items-center justify-between px-6 z-[100] sticky top-0 pt-[env(safe-area-inset-top)] min-h-[calc(5rem+env(safe-area-inset-top))]">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setIsSidebarOpen(true); }}
                onTouchEnd={(e) => { e.preventDefault(); setIsSidebarOpen(true); }}
                className="md:hidden text-slate-800 hover:text-blue-500 transition-colors p-2 -ml-2 rounded-xl hover:bg-white/40 active:bg-slate-200 relative z-50 cursor-pointer"
              >
                <Menu size={24} />
              </button>
              <h2 className="hidden md:block font-black text-lg text-slate-800 tracking-tight">
                {tabTitles[activeTab]}
              </h2>
            </div>
            <div className="flex items-center gap-4 md:gap-6 relative">
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
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setIsNotificationMenuOpen(!isNotificationMenuOpen); }}
                onTouchEnd={(e) => { e.preventDefault(); setIsNotificationMenuOpen(!isNotificationMenuOpen); }}
                className="text-slate-400 hover:text-blue-500 active:text-blue-600 transition-colors relative p-2 cursor-pointer z-50"
                title="Notifications"
              >
                <Bell size={22} />
                {unreadCount > 0 && <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
              </button>
              {isNotificationMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40 cursor-pointer" onClick={(e) => { e.preventDefault(); setIsNotificationMenuOpen(false); }} onTouchEnd={(e) => { e.preventDefault(); setIsNotificationMenuOpen(false); }}></div>
                  <div className="absolute top-full mt-4 right-0 md:right-auto w-80 bg-white/90 backdrop-blur-2xl border border-white/60 shadow-2xl rounded-3xl p-4 z-50 animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center justify-between mb-4 px-2">
                      <span className="font-black text-sm uppercase tracking-widest text-slate-800">Notifications</span>
                    </div>
                    <div className="space-y-2 max-h-80 overflow-y-auto no-scrollbar scroll-container">
                      {notifications.length > 0 ? notifications.map((notif) => (
                        <div key={notif.id} className={`p-4 rounded-2xl ${notif.read ? 'bg-slate-50/50' : 'bg-blue-50/50 border border-blue-100'}`}>
                          <p className="text-sm text-slate-700 font-medium leading-tight mb-2">{notif.message}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(notif.created_at).toLocaleDateString()}</p>
                          
                          {/* STANDARD PAYMENT REQUESTS */}
                          {notif.type === 'payment_request' && notif.status === 'pending' && (
                            <div className="flex gap-2 mt-3">
                              <button onClick={() => handleConfirmRequest(notif)} className="flex-1 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest py-2 rounded-lg hover:bg-emerald-500 transition-colors shadow-sm">Confirm</button>
                              <button onClick={() => handleDeclineRequest(notif)} className="flex-1 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">Decline</button>
                            </div>
                          )}

                          {/* NEW: P2P WITHDRAWAL REQUESTS FOR BANKERS TO ACCEPT */}
                          {notif.type === 'p2p_withdrawal_request' && notif.status === 'pending' && (
                            <div className="flex gap-2 mt-3">
                              <button onClick={() => handleAcceptP2PWithdrawal(notif)} className="flex-1 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest py-2 rounded-lg hover:bg-emerald-500 transition-colors shadow-sm">Accept Request</button>
                              <button onClick={() => handleDeclineRequest(notif)} className="flex-1 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">Decline</button>
                            </div>
                          )}

                          {!notif.read && notif.type !== 'payment_request' && notif.type !== 'p2p_withdrawal_request' && <button onClick={() => markAsRead(notif.id)} className="text-blue-500 text-[10px] font-black uppercase tracking-widest mt-2 hover:underline">Mark as read</button>}
                        </div>
                      )) : <p className="text-sm text-slate-500 text-center py-4">No notifications</p>}
                    </div>
                  </div>
                </>
              )}
              <div className="relative group">
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setIsProfileMenuOpen(!isProfileMenuOpen); }}
                  onTouchEnd={(e) => { e.preventDefault(); setIsProfileMenuOpen(!isProfileMenuOpen); }}
                  className="flex items-center gap-3 w-full text-left group px-3 py-2 rounded-2xl hover:bg-white/40 active:bg-slate-200 transition-colors border border-transparent hover:border-white/60 relative z-50 cursor-pointer"
                >
                  <div className="text-right hidden sm:block pointer-events-none">
                    <p className="font-black text-sm text-slate-800 leading-none">{userName}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{profile?.active_tier || 'Personal'}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center overflow-hidden pointer-events-none">
                    {profile?.avatar_url ? <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" /> : <span className="font-black text-slate-400 text-lg">{profile?.full_name?.charAt(0).toUpperCase() || <User size={20} />}</span>}
                  </div>
                </button>
                {isProfileMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40 cursor-pointer" onClick={(e) => { e.preventDefault(); setIsProfileMenuOpen(false); }} onTouchEnd={(e) => { e.preventDefault(); setIsProfileMenuOpen(false); }}></div>
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
                        <button onClick={() => { setActiveTab('COMMERCIAL_HUB'); setIsProfileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 transition-all">
                          <Briefcase size={16} /> Switch to Commercial
                        </button>
                        <button onClick={() => { setActiveTab('ACCOUNTS'); setIsProfileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:bg-indigo-50 transition-all">
                          <Users size={16} /> Link Joint Account
                        </button>
                        <button onClick={() => { setActiveTab('SETTINGS'); setSubTab('PROFILE'); setIsProfileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-all">
                          <Settings size={16} /> Identity & Legal
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
          <div className="flex-1 overflow-y-auto p-6 md:p-8 relative z-10 no-scrollbar scroll-container pb-[env(safe-area-inset-bottom)]" id="main-scroll">
            {activeTab === 'NET_POSITION' && renderNetPositionView()}
            {activeTab === 'TRANSACTIONS' && renderTransactionsView()}
            {activeTab === 'ACCOUNTS' && <AccountHub session={session} balances={balances} profile={profile} showBalances={showBalances} />}
            {activeTab === 'ORGANIZE' && <OrganizationSuite session={session} balances={balances} pockets={pockets} recipients={recipients} showBalances={showBalances} />}
            {activeTab === 'INVEST' && <WealthInvest session={session} balances={balances} profile={profile} investments={investments} showBalances={showBalances} />}
            {activeTab === 'COMMERCIAL_HUB' && renderCommercialHub()}
            {activeTab === 'PLANNER' && <FinancialPlanner balances={balances} />}
            {activeTab === 'LIFESTYLE' && <GlobalLifestyle session={session} profile={profile} balances={balances} />}
            {activeTab === 'SOS' && <EmergencySOS session={session} balances={balances} profile={profile} />}
            {activeTab === 'TRAINING' && <Training session={session} />}
            {activeTab === 'AGENTS' && <Agents session={session} profile={profile} balances={balances} />}
            {activeTab === 'SETTINGS' && renderSettingsView()}
          </div>
          <button onClick={() => setActiveModal('ADVISOR')} className="fixed bottom-8 right-8 z-50 bg-blue-700 text-white shadow-2xl rounded-full p-4 flex items-center gap-3 hover:-translate-y-2 transition-all active:scale-95 group border-2 border-white/20 mb-[env(safe-area-inset-bottom)]">
            <MessageSquare size={24} className="group-hover:animate-pulse" />
            <span className="font-black text-[10px] uppercase tracking-widest pr-2 hidden md:block">Your Financial AI</span>
          </button>
        </main>
      </div>
      {activeModal === 'ADVISOR' && <Chat session={session} profile={profile} balances={balances} onClose={() => setActiveModal(null)} />}
      
      {/* NEW: The full Withdrawal Page overlay. 
        Instead of the old generic modal, this opens your specialized withdrawal engine 
      */}
      {isWithdrawOpen && (
        <WithdrawalPage 
          userBalance={balances.liquid_usd} 
          userId={session.user.id} 
          onClose={() => setIsWithdrawOpen(false)} 
          onSuccess={fetchAllData} 
        />
      )}

      {activeModal && activeModal !== 'ADVISOR' && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100 mt-[env(safe-area-inset-top)] mb-[env(safe-area-inset-bottom)] max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 z-20">
              <h3 className="font-black text-lg text-slate-800 tracking-tight uppercase">{activeModal}</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-800 transition-colors bg-white p-2 rounded-xl shadow-sm">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsLoading(true);
              
              if (activeModal === 'TRANSFER') {
                const amount = parseFloat(e.target.amount.value);
                const fromAcct = e.target.fromAccount.value;
                const toAcct = e.target.toAccount.value;
                if (fromAcct === toAcct) {
                  setNotification({ type: 'error', text: 'Cannot transfer to the same account.' });
                  setIsLoading(false); return;
                }
                try {
                  const { error } = await supabase.rpc('process_internal_transfer', { p_user_id: session.user.id, p_from: fromAcct, p_to: toAcct, p_amount: amount });
                  if (error) throw error;
                  setNotification({ type: 'success', text: `Successfully routed ${formatCurrency(amount)}.` });
                  await fetchAllData();
                  setActiveModal(null);
                } catch (err) { setNotification({ type: 'error', text: err.message }); }
                finally { setIsLoading(false); }
                return;
              }
              if (activeModal === 'SEND') {
                const amount = parseFloat(e.target.amount.value);
                if (!sendRecipient) {
                  setNotification({ type: 'error', text: 'Please select a recipient from your directory.' });
                  setIsLoading(false); return;
                }
                const msg = isScheduled ? `Transfer of ${formatCurrency(amount)} scheduled for ${new Date(scheduleDate).toLocaleDateString()}.` : `Funds successfully dispatched.`;
                if (!isScheduled) {
                   await supabase.from('transactions').insert([{ user_id: session.user.id, amount: -amount, transaction_type: 'send', description: `Transfer to selected recipient`, status: 'completed' }]);
                }
                setNotification({ type: 'success', text: msg });
                await fetchAllData();
                setActiveModal(null);
                setIsLoading(false);
                return;
              }
              if (activeModal === 'REQUEST') {
                const amount = parseFloat(e.target.amount.value);
                
                // INTERNAL REQUESTS
                if (requestTargetType === 'INTERNAL' && foundUser) {
                    try {
                        await supabase.from('notifications').insert([{
                            user_id: foundUser.id,
                            type: 'payment_request',
                            message: `${userName} is requesting ${formatCurrency(amount)}.`,
                            amount: amount,
                            related_user_id: session.user.id,
                            status: 'pending',
                            requester_name: userName
                        }]);
                        setNotification({ type: 'success', text: `Request successfully dispatched to ${foundUser.full_name}` });
                    } catch (err) {
                        setNotification({ type: 'error', text: 'Failed to dispatch request.' });
                    }
                    
                    setIsLoading(false);
                    setActiveModal(null);
                    setUserSearchQuery('');
                    setFoundUser(null);
                    return;
                }
                
                // EXTERNAL REQUESTS
                const link = `${window.location.origin}/pay?to=${session.user.id}&amount=${amount}&reason=${encodeURIComponent(requestReason)}`;
                setRequestLink(link);
                if (requestEmail) {
                  setNotification({ type: 'success', text: `Encrypted request dispatched to ${requestEmail}` });
                  setTimeout(() => setNotification(null), 5000);
                }
                setIsLoading(false);
                return;
              }
            }} className="p-8 space-y-6 relative z-10 text-center">
              {!requestLink ? (
                <>
                  {activeModal === 'SEND' && (
                    <div className="space-y-4 mb-6 text-left animate-in fade-in">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Select Recipient</label>
                        <div className="flex gap-2">
                          <select value={sendRecipient} onChange={(e) => setSendRecipient(e.target.value)} className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-sm text-slate-800 outline-none focus:border-blue-500">
                            <option value="">Choose contact...</option>
                            {recipients.map(r => <option key={r.id} value={r.id}>{r.recipient_name} ({r.role})</option>)}
                          </select>
                          <button type="button" onClick={() => { setActiveModal(null); setActiveTab('ORGANIZE'); }} className="px-4 bg-slate-100 text-blue-600 font-black rounded-2xl border-2 border-slate-200 hover:bg-slate-200 transition-colors shadow-sm"><Plus size={20}/></button>
                        </div>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 mt-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" checked={isScheduled} onChange={(e) => setIsScheduled(e.target.checked)} className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300" />
                          <span className="text-sm font-bold text-slate-700">Schedule Auto-Transfer</span>
                        </label>
                        {isScheduled && (
                          <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Execution Date</label>
                            <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 shadow-sm" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {activeModal === 'REQUEST' && (
                    <div className="space-y-6 text-left animate-in fade-in">
                      <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                        <button type="button" onClick={() => setRequestTargetType('INTERNAL')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${requestTargetType === 'INTERNAL' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Internal User</button>
                        <button type="button" onClick={() => setRequestTargetType('EXTERNAL')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${requestTargetType === 'EXTERNAL' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>External User</button>
                      </div>
                      {requestTargetType === 'INTERNAL' ? (
                        <div className="space-y-4">
                          <div className="relative">
                            <Search className="absolute left-4 top-4 text-slate-400" size={18}/>
                            <input
                              className="w-full bg-slate-50 p-4 pl-12 rounded-2xl border border-slate-200 outline-none focus:border-blue-500 font-bold transition-all"
                              placeholder="Search Username or Email..."
                              value={userSearchQuery}
                              onChange={e => setUserSearchQuery(e.target.value)}
                            />
                          </div>
                          {isSearchingUser && <div className="text-center"><Loader2 className="animate-spin mx-auto text-blue-500"/></div>}
                          {foundUser && (
                            <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-2xl border-2 border-blue-200 border-dashed animate-in zoom-in-95">
                              <div className="w-12 h-12 rounded-full bg-blue-200 overflow-hidden border-2 border-white shadow-sm">
                                {foundUser.avatar_url ? <img src={foundUser.avatar_url} className="w-full h-full object-cover"/> : <User className="m-3 text-blue-400"/>}
                              </div>
                              <div>
                                <p className="font-black text-blue-900 leading-none mb-1">{foundUser.full_name}</p>
                                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Verified IFB Member</p>
                              </div>
                              <ShieldCheck className="ml-auto text-blue-500" size={20}/>
                            </div>
                          )}
                        </div>
                      ) : (
                        <input className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200 outline-none focus:border-blue-500 font-bold" placeholder="Recipient Email (Optional)"/>
                      )}
                    </div>
                  )}
                  {activeModal === 'TRANSFER' && (
                    <div className="space-y-4 mb-6 text-left">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">From Account</label>
                        <select name="fromAccount" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-bold text-slate-800 outline-none focus:border-blue-500">
                          <option value="liquid_usd">Cash on Hand ({formatCurrency(balances.liquid_usd)})</option>
                          <option value="alpha_equity_usd">Alpha Equity ({formatCurrency(balances.alpha_equity_usd)})</option>
                          <option value="mysafe_digital_usd">Digital Safe ({formatCurrency(balances.mysafe_digital_usd)})</option>
                        </select>
                      </div>
                      <div className="flex justify-center -my-2 relative z-10"><div className="bg-blue-50 text-blue-500 p-2 rounded-full border border-blue-100"><ArrowDownToLine size={16}/></div></div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">To Account</label>
                        <select name="toAccount" defaultValue="alpha_equity_usd" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-bold text-slate-800 outline-none focus:border-blue-500">
                          <option value="liquid_usd">Cash on Hand</option>
                          <option value="alpha_equity_usd">Alpha Equity</option>
                          <option value="mysafe_digital_usd">Digital Safe</option>
                        </select>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 text-left">Amount (USD)</label>
                    <input type="number" step="0.01" name="amount" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 font-black text-4xl text-center text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-300 shadow-inner" placeholder="0.00" autoFocus />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-blue-700 text-white rounded-2xl py-5 font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-600 hover:-translate-y-1 transition-all disabled:opacity-50"
                  >
                    {isLoading ? 'TRANSMITTING...' : activeModal === 'REQUEST' ? 'GENERATE SECURE LINK' : `CONFIRM ${activeModal}`}
                  </button>
                </>
              ) : (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner">
                    <ShieldCheck size={32} />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 text-xl">Payment Portal Ready</h4>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Ready for external routing via Card or ACH.</p>
                  </div>
                  {showQR ? (
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-center inline-block mx-auto animate-in fade-in zoom-in">
                      <QRCode value={requestLink} size={180} fgColor="#0f172a" />
                    </div>
                  ) : (
                    <button type="button" className="w-full text-left bg-slate-50 border-2 border-slate-100 p-4 rounded-xl break-all relative group cursor-pointer" onClick={() => {
                      navigator.clipboard.writeText(requestLink);
                      setNotification({ type: 'success', text: 'Link copied to clipboard!' });
                    }}>
                      <p className="text-sm font-bold text-blue-600 group-hover:text-blue-700 transition-colors">{requestLink}</p>
                      <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center backdrop-blur-[1px]">
                        <span className="font-black text-blue-700 text-xs uppercase tracking-widest bg-white px-3 py-1 rounded-full shadow-sm">Click to Copy</span>
                      </div>
                    </button>
                  )}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowQR(!showQR)}
                      className="flex-1 bg-slate-100 text-slate-700 rounded-xl py-4 font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                    >
                      {showQR ? 'SHOW LINK' : 'SHOW QR CODE'}
                    </button>
                    <button
                      type="button"
                      onClick={handleSendEmailInvoice}
                      disabled={isSendingEmail}
                      className="flex-1 bg-slate-800 text-white rounded-xl py-4 font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-slate-700 transition-all disabled:opacity-50 flex items-center justify-center"
                    >
                      {isSendingEmail ? <Loader2 className="animate-spin" size={14} /> : 'EMAIL INVOICE'}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setActiveModal(null); setRequestLink(null); setRequestEmail(''); setRequestReason(''); setShowQR(false); }}
                    className="w-full text-slate-500 font-black text-[10px] uppercase tracking-widest hover:text-slate-800 transition-all pt-2"
                  >
                    Close Window
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
      {notification && (
        <div className="fixed top-2 left-1/2 transform -translate-x-1/2 z-[200] animate-in slide-in-from-top-4 fade-in duration-300 mt-[env(safe-area-inset-top)]">
          <div className={`px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl flex items-center gap-3 ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${notification.type === 'success' ? 'bg-emerald-400' : 'bg-red-400'}`}></div>
            <p className="font-black text-sm uppercase tracking-widest">{notification.text}</p>
          </div>
        </div>
      )}
      {showDepositUI && <DepositInterface session={session} onClose={() => setShowDepositUI(false)} />}
      {showStatementModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-8">
               <h3 className="font-black text-xl text-slate-800 uppercase tracking-tighter">Export Statements</h3>
               <X onClick={() => setShowStatementModal(false)} className="cursor-pointer text-slate-400 hover:text-slate-800"/>
            </div>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Document Format</label>
                <select
                  className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 font-bold outline-none focus:border-blue-500 transition-all"
                  value={statementConfig.format}
                  onChange={e => setStatementConfig({...statementConfig, format: e.target.value})}
                >
                  <option value="pdf">Normal Statement (PDF)</option>
                  <option value="csv">Institutional Data (CSV)</option>
                </select>
              </div>
              <div className="p-5 bg-blue-50 rounded-2xl border border-blue-200 flex items-start gap-4 shadow-sm">
                 <input
                  type="checkbox"
                  className="mt-1 w-6 h-6 rounded accent-blue-600"
                  checked={statementConfig.isOfficial}
                  onChange={e => setStatementConfig({...statementConfig, isOfficial: e.target.checked})}
                 />
                 <div className="space-y-1">
                   <p className="text-sm font-black text-blue-900 uppercase tracking-tight">Signed Official Statement</p>
                   <p className="text-[10px] text-blue-700 leading-relaxed font-medium">Includes Logo, EIN 33-1869013, Official New York Address, and Verified Digital Signature block.</p>
                 </div>
              </div>
              <button
                onClick={() => {
                   const type = statementConfig.isOfficial ? "Signed Official Statement" : "Standard Statement";
                   triggerGlobalActionNotification('success', `${type} (${statementConfig.format.toUpperCase()}) generated and archived.`);
                   setShowStatementModal(false);
                }}
                className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl hover:-translate-y-1 transition-all"
              >
                Generate & Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}