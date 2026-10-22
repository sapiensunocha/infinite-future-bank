import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { supabase } from './services/supabaseClient';
import { MessageSquare, X, CreditCard } from 'lucide-react';
import { useTranslation } from './i18n/useTranslation';

// Layout & always-visible UI — load eagerly
import AppPopupModal from './components/modals/AppPopupModal';
import Sidebar from './components/layout/Sidebar';
import TopHeader from './components/layout/TopHeader';
import BottomNav from './components/layout/BottomNav';
import TransactionModal from './components/modals/TransactionModal';
import StatementExportModal from './components/modals/StatementExportModal';
import GlobalToastAlert from './components/ui/GlobalToastAlert';

// Joyride constants (stable string values — avoids eager import of react-joyride)
const JOYRIDE_STATUS = { FINISHED: 'finished', SKIPPED: 'skipped' };
const JOYRIDE_EVENTS = { STEP_AFTER: 'step:after', TARGET_NOT_FOUND: 'error:target_not_found' };
const JOYRIDE_ACTIONS = { PREV: 'prev' };

// Auto-reload when a chunk 404s (stale browser cache after new deploy)
function lazyLoad(importFn) {
  return lazy(() =>
    importFn().catch((err) => {
      const isChunkError = err?.message?.includes('Failed to fetch dynamically imported module')
        || err?.message?.includes('Importing a module script failed')
        || err?.name === 'ChunkLoadError';
      if (isChunkError && !sessionStorage.getItem('ifb_chunk_reload')) {
        sessionStorage.setItem('ifb_chunk_reload', '1');
        window.location.reload();
        return new Promise(() => {});
      }
      throw err;
    })
  );
}

// Views lazy-loaded on first navigation (previously eager — caused 677KB Dashboard chunk)
const NetPositionHome       = lazyLoad(() => import('./views/NetPositionHome'));
const SettingsHub           = lazyLoad(() => import('./views/SettingsHub'));
const CommercialUnderwriting = lazyLoad(() => import('./views/CommercialUnderwriting'));
const LazyJoyride           = lazyLoad(() => import('react-joyride'));
const LazyTourTooltip       = lazyLoad(() => import('./config/AppTourConfig').then(m => ({ default: m.CustomTourTooltip })));
const TOUR_CONTENT_LAZY     = () => import('./config/AppTourConfig').then(m => m.TOUR_CONTENT);

// Screen-level features — lazy-loaded on first navigation
const Chat              = lazyLoad(() => import('./Chat'));
const AccountHub        = lazyLoad(() => import('./AccountHub'));
const OrganizationSuite = lazyLoad(() => import('./OrganizationSuite'));
const WealthInvest      = lazyLoad(() => import('./WealthInvest'));
const GlobalLifestyle   = lazyLoad(() => import('./GlobalLifestyle'));
const FinancialPlanner  = lazyLoad(() => import('./FinancialPlanner'));
const EmergencySOS      = lazyLoad(() => import('./EmergencySOS'));
const Training          = lazyLoad(() => import('./Training'));
const Agents            = lazyLoad(() => import('./Agents'));
const DepositInterface  = lazyLoad(() => import('./DepositInterface'));
const WithdrawalPage    = lazyLoad(() => import('./WithdrawalPage'));
const PayMeCard         = lazyLoad(() => import('./PayMeCard'));
const TransactionLedger = lazyLoad(() => import('./TransactionLedger'));
const AFRNetworkPanel   = lazyLoad(() => import('./features/network/AFRNetworkPanel'));
const InsuranceHub      = lazyLoad(() => import('./InsuranceHub'));
const VaultManager      = lazyLoad(() => import('./features/mysafe/VaultManager'));
const NFCTransfer       = lazyLoad(() => import('./features/nfc/NFCTransfer'));
const TapToPay          = lazyLoad(() => import('./features/terminal/TapToPay'));
const VentureXPayRequest = lazyLoad(() => import('./features/venturex/VentureXPayRequest'));
const VentureXListings   = lazyLoad(() => import('./features/venturex/VentureXListings'));
const AdminDashboard    = lazyLoad(() => import('./AdminDashboard'));

const ScreenLoader = () => (
  <div className="flex-1 flex items-center justify-center min-h-[60vh]">
    <div className="w-8 h-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
  </div>
);

export default function Dashboard({ session, onSignOut }) {
  const { t, lang, setLanguage } = useTranslation();

  // Navigation & UI States
  const [activeTab, setActiveTab] = useState('NET_POSITION');
  const [subTab, setSubTab] = useState('PROFILE');
  const [activeModal, setActiveModal] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showBalances, setShowBalances] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);
  const [isAppDrawerOpen, setIsAppDrawerOpen] = useState(false);
  const [activeAppPopup, setActiveAppPopup] = useState(null); 

  // Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchResults, setSearchResults] = useState({ transactions: [], notifications: [], pockets: [], recipients: [], investments: [] });
  const searchDebounce = useRef(null);
  
  // Real-Time Database States
  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [balances, setBalances] = useState({ liquid_usd: 0, alpha_equity_usd: 0, mysafe_digital_usd: 0, afr_balance: 0 });
  const [pockets, setPockets] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activeEscrows, setActiveEscrows] = useState([]); 
  const [commercialProfile, setCommercialProfile] = useState(null);
  
  // Global App States
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showDepositUI, setShowDepositUI] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [showPayMe, setShowPayMe] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [showVault, setShowVault] = useState(false);
  const [showNFC, setShowNFC] = useState(false);
  const [showTapToPay, setShowTapToPay] = useState(false);
  const [payReportNotif, setPayReportNotif] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);

  // Commercial Underwriting States
  const [commercialForm, setCommercialForm] = useState({ 
    company_name: '', sector: '', registration_country: '', 
    annual_revenue: '', monthly_burn_rate: '', debt_to_equity_ratio: '' 
  });
  const [isSubmittingCommercial, setIsSubmittingCommercial] = useState(false);

  // Transaction Specific States
  const [sendAsset, setSendAsset] = useState('USD');
  const [sendRecipient, setSendRecipient] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [requestLink, setRequestLink] = useState(null);
  const [requestEmail, setRequestEmail] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const [runTour, setRunTour] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const [tourSteps, setTourSteps] = useState([]);

  const tabTitles = {
    NET_POSITION: 'Home', ACCOUNTS: 'My Accounts', ORGANIZE: 'Organize',
    INVEST: 'Investments', LISTINGS: '🌍 Company Listings', PLANNER: 'Planner', LIFESTYLE: 'Lifestyle',
    SOS: 'Emergency SOS', TRAINING: 'Training', SETTINGS: 'Settings',
    AGENTS: 'My Team', INSURANCE: 'Insurance', TRANSACTIONS: 'Transactions',
    COMMERCIAL_HUB: 'Business Hub', NETWORK: 'AFR Network Node'
  };

  const triggerGlobalActionNotification = (type, message) => {
    setNotification({ type, text: message });
    setTimeout(() => setNotification(null), 6000);
  };

  const formatCurrency = (val) => showBalances ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0) : 'XXXX';
  const AFR_USD_RATE = 0.01; // 1 AFR = $0.01
  const totalNetWorth = (balances.liquid_usd || 0) + (balances.alpha_equity_usd || 0) + (balances.mysafe_digital_usd || 0) + ((balances.afr_balance || 0) * AFR_USD_RATE);

  // ==========================================
  // DATA FETCHING & REALTIME LISTENER ENGINE
  // ==========================================
  const fetchAllData = async () => {
    if (!session?.user?.id) return;
    const { data: pData } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    const { data: bData } = await supabase.from('balances').select('*').eq('user_id', session.user.id).maybeSingle();
    const { data: commData } = await supabase.from('commercial_profiles').select('*').eq('id', session.user.id).maybeSingle();
    
    if (pData) {
      setProfile(pData);
      if (pData.has_completed_tour === false) {
        setRunTour(true);
        TOUR_CONTENT_LAZY().then(content => setTourSteps(content)).catch(() => {});
      }
    }
    if (bData) setBalances(bData);
    if (commData) setCommercialProfile(commData);

    const { data: tData } = await supabase.from('transactions').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
    if (tData) setTransactions(tData);

    const { data: rData } = await supabase.from('recipients').select('*').eq('user_id', session.user.id);
    if (rData) setRecipients(rData);
    
    // Unified Notification Engine Fetch
    const { data: notifData } = await supabase.from('venturex_notifications').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(20);
    if (notifData) setNotifications(notifData);
    
    const { data: escrowData } = await supabase.from('p2p_orders').select('*').eq('user_id', session.user.id).in('status', ['open', 'locked_in_escrow', 'proof_uploaded', 'disputed']).order('created_at', { ascending: false });
    if (escrowData) setActiveEscrows(escrowData);
  };

  useEffect(() => { if (session?.user?.id) fetchAllData(); }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) return;
    const channel = supabase.channel('realtime-deus')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions', filter: `user_id=eq.${session.user.id}` }, (payload) => {
        setTransactions(prev => [payload.new, ...prev]);
        triggerGlobalActionNotification('success', `Inbound Transfer Detected: $${Math.abs(payload.new.amount).toFixed(2)}`);
        fetchAllData();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'venturex_notifications', filter: `user_id=eq.${session.user.id}` }, (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
        triggerGlobalActionNotification('success', payload.new.message);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'p2p_orders', filter: `user_id=eq.${session.user.id}` }, fetchAllData)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [session?.user?.id]);

  // ==========================================
  // NOTIFICATION HANDLERS
  // ==========================================
  const markAsRead = async (notifId) => {
    await supabase.from('venturex_notifications').update({ is_read: true }).eq('id', notifId);
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
  };

  const handleConfirmRequest = async (notif) => {
    try {
      const meta = typeof notif.metadata === 'string' ? JSON.parse(notif.metadata) : (notif.metadata || {});
      const amount = meta.amount || 0;
      const requesterId = meta.requester_id;
      if (!requesterId || !amount) throw new Error('Invalid request data.');
      const { error } = await supabase.rpc('process_payment_request', {
        p_sender_id: session.user.id,
        p_receiver_id: requesterId,
        p_amount: amount,
        p_notification_id: notif.id
      });
      if (error) throw error;
      triggerGlobalActionNotification('success', `Payment of $${amount} confirmed.`);
      fetchAllData();
    } catch (err) {
      triggerGlobalActionNotification('error', err.message || 'Could not confirm payment request.');
    }
  };

  const handleDeclineRequest = async (notif) => {
    await supabase.from('notifications').update({ status: 'declined', read: true }).eq('id', notif.id);
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, status: 'declined', read: true } : n));
    triggerGlobalActionNotification('success', 'Request declined.');
  };

  const handleAcceptP2PWithdrawal = async (notif) => {
    try {
      const meta = typeof notif.metadata === 'string' ? JSON.parse(notif.metadata) : (notif.metadata || {});
      const orderId = meta.order_id;
      if (!orderId) throw new Error('No order reference found.');
      const { error } = await supabase.from('p2p_orders').update({ status: 'proof_uploaded' }).eq('id', orderId);
      if (error) throw error;
      await supabase.from('notifications').update({ status: 'completed', read: true }).eq('id', notif.id);
      triggerGlobalActionNotification('success', 'P2P withdrawal accepted. Awaiting proof.');
      fetchAllData();
    } catch (err) {
      triggerGlobalActionNotification('error', err.message || 'Could not accept withdrawal request.');
    }
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

  // ==========================================
  // RENDER MASTER LAYOUT
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-200 relative">
      
      {/* Joyride tour — only loaded when tour is active (saves ~200KB from initial bundle) */}
      {runTour && (
        <Suspense fallback={null}>
          <LazyJoyride
            steps={tourSteps}
            run={runTour}
            stepIndex={tourStepIndex}
            continuous={true}
            disableScrolling={false}
            callback={(data) => {
              const { action, index, status, type } = data;
              if (type === JOYRIDE_EVENTS.STEP_AFTER || type === JOYRIDE_EVENTS.TARGET_NOT_FOUND) {
                setTourStepIndex(index + (action === JOYRIDE_ACTIONS.PREV ? -1 : 1));
              } else if (status === JOYRIDE_STATUS.FINISHED || status === JOYRIDE_STATUS.SKIPPED) {
                setRunTour(false);
                setTourStepIndex(0);
                supabase.from('profiles').update({ has_completed_tour: true }).eq('id', session.user.id).then(() => {});
              }
            }}
          />
        </Suspense>
      )}

      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400/20 rounded-full blur-[120px]"></div>
      </div>

      <div className="flex h-screen overflow-hidden max-w-7xl mx-auto">
        <Sidebar
          isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}
          activeTab={activeTab} setActiveTab={setActiveTab}
          onSignOut={onSignOut} t={t} commercialProfile={commercialProfile}
          onOpenAdmin={() => setShowAdmin(true)}
          supabase={supabase}
        />
        
        <main className="flex-1 flex flex-col relative overflow-hidden">
          <TopHeader 
            setIsSidebarOpen={setIsSidebarOpen} tabTitles={tabTitles} activeTab={activeTab}
            isAppDrawerOpen={isAppDrawerOpen} setIsAppDrawerOpen={setIsAppDrawerOpen}
            setActiveAppPopup={setActiveAppPopup} isSearchExpanded={isSearchExpanded}
            setIsSearchExpanded={setIsSearchExpanded} searchQuery={searchQuery}
            setSearchQuery={setSearchQuery} searchResults={searchResults}
            formatCurrency={formatCurrency} isNotificationMenuOpen={isNotificationMenuOpen}
            setIsNotificationMenuOpen={setIsNotificationMenuOpen} unreadCount={notifications.filter(n => !n.is_read).length}
            isProfileMenuOpen={isProfileMenuOpen} setIsProfileMenuOpen={setIsProfileMenuOpen}
            profile={profile} userName={profile?.full_name || session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'Client'}
            visibleNotifications={notifications} setActiveTab={setActiveTab}
            markAsRead={markAsRead} handleConfirmRequest={handleConfirmRequest}
            handleDeclineRequest={handleDeclineRequest} handleAcceptP2PWithdrawal={handleAcceptP2PWithdrawal}
            setSubTab={setSubTab} onSignOut={onSignOut} session={session} balances={balances} fetchAllData={fetchAllData} commercialProfile={commercialProfile} activeAppPopup={activeAppPopup}
            onPayReport={setPayReportNotif}
          />
          
          <div className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10 no-scrollbar scroll-container pb-24 md:pb-8" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom) + 5rem), 2rem)' }} id="main-scroll">

            {/* DYNAMIC VIEW ROUTER */}
            <Suspense fallback={<ScreenLoader />}>
            {activeTab === 'NET_POSITION' && (
              <NetPositionHome
                profile={profile}
                balances={balances}
                transactions={transactions}
                totalNetWorth={totalNetWorth}
                formatCurrency={formatCurrency}
                setActiveTab={setActiveTab}
                activeEscrows={activeEscrows}
                onRefreshEscrows={fetchAllData}
                setIsNotificationMenuOpen={setIsNotificationMenuOpen}
                showBalances={showBalances}
                setShowBalances={setShowBalances}
                setActiveModal={setActiveModal}
                setShowPayMe={setShowPayMe}
                setShowDepositUI={setShowDepositUI}
                setIsWithdrawOpen={setIsWithdrawOpen}
                showAnalytics={showAnalytics}
                setShowAnalytics={setShowAnalytics}
                setShowVault={setShowVault}
                setShowNFC={setShowNFC}
                setActiveAppPopup={setActiveAppPopup}
              />
            )}
            
            {activeTab === 'SETTINGS' && (
              <SettingsHub
                session={session}
                profile={profile}
                subTab={subTab}
                setSubTab={setSubTab}
                setActiveTab={setActiveTab}
                onSignOut={onSignOut}
                fetchAllData={fetchAllData}
                triggerNotification={triggerGlobalActionNotification}
                lang={lang}
                setLanguage={setLanguage}
              />
            )}
            
            {activeTab === 'COMMERCIAL_HUB' && (
              <CommercialUnderwriting
                commercialProfile={commercialProfile}
                commercialForm={commercialForm}
                setCommercialForm={setCommercialForm}
                handleCommercialSubmit={handleCommercialSubmit}
                isSubmittingCommercial={isSubmittingCommercial}
                setActiveTab={setActiveTab}
                session={session}
                balances={balances}
                profile={profile}
                fetchAllData={fetchAllData}
              />
            )}
            
            {activeTab === 'TRANSACTIONS' && <TransactionLedger transactions={transactions} formatCurrency={formatCurrency} setShowStatementModal={setShowStatementModal} />}
            {activeTab === 'NETWORK' && (
              <div className="bg-slate-950 rounded-[2rem] min-h-[400px] p-4 -mx-2">
                <AFRNetworkPanel session={session} profile={profile} />
              </div>
            )}
            {activeTab === 'ACCOUNTS' && <AccountHub session={session} balances={balances} profile={profile} showBalances={showBalances} />}
            {activeTab === 'ORGANIZE' && <OrganizationSuite session={session} balances={balances} pockets={pockets} recipients={recipients} showBalances={showBalances} />}
            {activeTab === 'INVEST' && <WealthInvest session={session} balances={balances} profile={profile} investments={investments} showBalances={showBalances} />}
            {activeTab === 'LISTINGS' && <VentureXListings session={session} profile={profile} />}
            {activeTab === 'PLANNER' && <FinancialPlanner balances={balances} />}
            {activeTab === 'LIFESTYLE' && <GlobalLifestyle session={session} profile={profile} balances={balances} />}
            {activeTab === 'SOS' && <EmergencySOS session={session} balances={balances} profile={profile} />}
            {activeTab === 'TRAINING' && <Training session={session} />}
            {activeTab === 'AGENTS' && <Agents session={session} profile={profile} balances={balances} />}
            {activeTab === 'INSURANCE' && <InsuranceHub profile={profile} />}

            </Suspense>
          </div>

          {/* Chat FAB */}
          <button
            onClick={() => setActiveModal('ADVISOR')}
            className="fixed z-[110] bg-blue-700 text-white shadow-2xl rounded-full flex items-center gap-3 hover:-translate-y-1 transition-all active:scale-95 border-2 border-white/20"
            style={{
              bottom: 'calc(max(env(safe-area-inset-bottom), 6px) + 4.5rem)',
              right: '1.25rem',
              padding: '0.875rem',
            }}
          >
            <MessageSquare size={22} className="animate-pulse" />
            <span className="font-black text-[10px] uppercase tracking-widest pr-1 hidden md:block">Your Financial AI</span>
          </button>
        </main>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setIsAppDrawerOpen={setIsAppDrawerOpen}
        unreadCount={notifications.filter(n => !n.read).length}
        setIsSidebarOpen={setIsSidebarOpen}
        setIsNotificationMenuOpen={setIsNotificationMenuOpen}
        setShowNFC={setShowNFC}
        setShowTapToPay={setShowTapToPay}
        t={t}
      />

      {/* GLOBAL OVERLAYS */}
      <AppPopupModal 
        activeAppPopup={activeAppPopup} 
        setActiveAppPopup={setActiveAppPopup} 
        session={session} 
        balances={balances} 
        fetchAllData={fetchAllData} 
        commercialProfile={commercialProfile} 
        profile={profile} 
        triggerGlobalActionNotification={triggerGlobalActionNotification}
      />
      <TransactionModal 
        activeModal={activeModal} 
        setActiveModal={setActiveModal} 
        isLoading={isLoading} 
        sendAsset={sendAsset} 
        setSendAsset={setSendAsset} 
        formatCurrency={formatCurrency} 
        balances={balances}
        sendRecipient={sendRecipient} 
        setSendRecipient={setSendRecipient} 
        recipients={recipients} 
        setActiveTab={setActiveTab} 
        isScheduled={isScheduled} 
        setIsScheduled={setIsScheduled} 
        scheduleDate={scheduleDate} 
        setScheduleDate={setScheduleDate} 
        requestLink={requestLink} 
        setRequestLink={setRequestLink} 
        requestEmail={requestEmail} 
        setRequestEmail={setRequestEmail} 
        requestReason={requestReason} 
        setRequestReason={setRequestReason} 
        showQR={showQR} 
        setShowQR={setShowQR} 
        isSendingEmail={isSendingEmail} 
        triggerGlobalActionNotification={triggerGlobalActionNotification}
        session={session}
        fetchAllData={fetchAllData}
        setIsLoading={setIsLoading}
      />
      <GlobalToastAlert notification={notification} />
      <StatementExportModal showStatementModal={showStatementModal} setShowStatementModal={setShowStatementModal} triggerGlobalActionNotification={triggerGlobalActionNotification}/>
      
      {/* 💳 DEPOSIT / 💸 WITHDRAWAL overlays */}
      <Suspense fallback={null}>
      {showDepositUI && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-950/90 backdrop-blur-2xl animate-in fade-in duration-300 p-4 sm:p-8">
           <div className="relative w-full max-w-4xl h-fit max-h-[90vh] flex flex-col items-center">
             <button 
                onClick={() => setShowDepositUI(false)} 
                className="mb-8 bg-white text-slate-900 px-10 py-4 rounded-full font-black text-xs uppercase tracking-[0.2em] flex items-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:bg-red-50 hover:text-red-600"
             >
                <X size={20} /> Close Terminal
             </button>
             <div className="w-full bg-white rounded-[3.5rem] shadow-2xl overflow-hidden border border-white/20">
               <DepositInterface session={session} onClose={() => setShowDepositUI(false)} />
             </div>
           </div>
        </div>
      )}
      
      {/* 💸 WITHDRAWAL OVERLAY */}
      {isWithdrawOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-950/90 backdrop-blur-2xl animate-in fade-in duration-300 p-4 sm:p-8">
           <div className="relative w-full max-w-4xl h-fit max-h-[90vh] flex flex-col items-center">
             <button
                onClick={() => setIsWithdrawOpen(false)}
                className="mb-8 bg-white text-slate-900 px-10 py-4 rounded-full font-black text-xs uppercase tracking-[0.2em] flex items-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:bg-red-50 hover:text-red-600"
             >
                <X size={20} /> Close Terminal
             </button>
             <div className="w-full bg-white rounded-[3.5rem] shadow-2xl overflow-y-auto border border-white/20 max-h-[80vh]">
               <WithdrawalPage userBalance={balances.liquid_usd} userId={session.user.id} onClose={() => setIsWithdrawOpen(false)} onSuccess={fetchAllData} />
             </div>
           </div>
        </div>
      )}
      </Suspense>

      <Suspense fallback={null}>
        {showPayMe && <PayMeCard profile={profile} onClose={() => setShowPayMe(false)} />}
        {activeModal === 'ADVISOR' && <Chat session={session} profile={profile} balances={balances} onClose={() => setActiveModal(null)} />}
      </Suspense>

      {/* 🔒 VAULT MANAGER OVERLAY */}
      <Suspense fallback={null}>
      {showVault && (
        <div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center bg-slate-950/90 backdrop-blur-2xl animate-in fade-in duration-300 p-0 sm:p-8">
          <div className="relative w-full sm:max-w-lg animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
            <div className="bg-slate-900 border border-slate-700/50 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-y-auto max-h-[92vh] p-6">
              <div className="flex justify-end mb-2">
                <button onClick={() => setShowVault(false)} className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 transition-colors">
                  <X size={14}/>
                </button>
              </div>
              <VaultManager
                balances={balances}
                onSuccess={() => { fetchAllData(); }}
                onClose={() => setShowVault(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* 📶 NFC TAP & PAY OVERLAY */}
      {showNFC && (
        <div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center bg-slate-950/90 backdrop-blur-2xl animate-in fade-in duration-300 p-0 sm:p-8">
          <div className="relative w-full sm:max-w-sm animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
            <div className="bg-slate-900 border border-slate-700/50 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-y-auto max-h-[92vh] p-6">
              <div className="flex justify-end mb-2">
                <button onClick={() => setShowNFC(false)} className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 transition-colors">
                  <X size={14}/>
                </button>
              </div>
              <NFCTransfer
                session={session}
                balances={balances}
                profile={profile}
                onClose={() => setShowNFC(false)}
                onSuccess={() => { fetchAllData(); }}
                onOpenTapToPay={() => { setShowNFC(false); setShowTapToPay(true); }}
              />
              {/* Tap to Pay entry point — shown on web (on Android it surfaces inside NFCTransfer receive flow) */}
              <div className="mt-6 pt-4 border-t border-slate-800">
                <button
                  onClick={() => { setShowNFC(false); setShowTapToPay(true); }}
                  className="w-full py-3 bg-gradient-to-r from-violet-700 to-indigo-700 hover:from-violet-600 hover:to-indigo-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                  <CreditCard size={14}/> Tap a Physical Card to Phone
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 💳 TAP TO PAY OVERLAY */}
      {showTapToPay && (
        <div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center bg-slate-950/90 backdrop-blur-2xl animate-in fade-in duration-300 p-0 sm:p-8">
          <div className="relative w-full sm:max-w-sm animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
            <div className="bg-slate-900 border border-slate-700/50 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-y-auto max-h-[92vh] p-6">
              <TapToPay
                balances={balances}
                onClose={() => setShowTapToPay(false)}
                onSuccess={() => { fetchAllData(); }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 💜 VENTUREX PAY REQUEST MODAL */}
      {payReportNotif && (
        <VentureXPayRequest
          notif={payReportNotif}
          session={session}
          onClose={() => setPayReportNotif(null)}
        />
      )}
      </Suspense>

      {/* Admin Dashboard */}
      <Suspense fallback={null}>
        {showAdmin && (
          <AdminDashboard
            session={session}
            profile={profile}
            onClose={() => setShowAdmin(false)}
          />
        )}
      </Suspense>

    </div>
  );
}