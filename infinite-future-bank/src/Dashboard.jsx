import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './services/supabaseClient';
import Joyride, { STATUS } from 'react-joyride';
import { MessageSquare, X } from 'lucide-react';
import { useTranslation } from './i18n/useTranslation';

// --- EXISTING MODULAR COMPONENTS ---
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
import WithdrawalPage from './WithdrawalPage';
import PayMeCard from './PayMeCard'; 
import TransactionLedger from './TransactionLedger';
import CapitalNetwork from './CapitalNetwork';
import InsuranceHub from './InsuranceHub';

// --- NEWLY EXTRACTED COMPONENTS ---
import AppPopupModal from './components/modals/AppPopupModal';
import NetPositionHome from './views/NetPositionHome';
import SettingsHub from './views/SettingsHub';
import CommercialUnderwriting from './views/CommercialUnderwriting';
import Sidebar from './components/layout/Sidebar';
import TopHeader from './components/layout/TopHeader';
import BottomNav from './components/layout/BottomNav';
import TransactionModal from './components/modals/TransactionModal';
import StatementExportModal from './components/modals/StatementExportModal';
import GlobalToastAlert from './components/ui/GlobalToastAlert';
import { TOUR_CONTENT, CustomTourTooltip } from './config/AppTourConfig';

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

  const tabTitles = {
    NET_POSITION: 'Home', ACCOUNTS: 'My Accounts', ORGANIZE: 'Organize',
    INVEST: 'Investments', PLANNER: 'Planner', LIFESTYLE: 'Lifestyle',
    SOS: 'Emergency SOS', TRAINING: 'Training', SETTINGS: 'Settings',
    AGENTS: 'My Team', INSURANCE: 'Insurance', TRANSACTIONS: 'Transactions',
    COMMERCIAL_HUB: 'Business Hub', NETWORK: 'Refer & Earn'
  };

  const triggerGlobalActionNotification = (type, message) => {
    setNotification({ type, text: message });
    setTimeout(() => setNotification(null), 6000);
  };

  const formatCurrency = (val) => showBalances ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0) : 'XXXX';
  const totalNetWorth = (balances.liquid_usd || 0) + (balances.alpha_equity_usd || 0) + (balances.mysafe_digital_usd || 0);

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
      if (pData.has_completed_tour === false) setRunTour(true);
    }
    if (bData) setBalances(bData);
    if (commData) setCommercialProfile(commData);

    const { data: tData } = await supabase.from('transactions').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
    if (tData) setTransactions(tData);

    const { data: rData } = await supabase.from('recipients').select('*').eq('user_id', session.user.id);
    if (rData) setRecipients(rData);
    
    const { data: notifData } = await supabase.from('notifications').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` }, fetchAllData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'p2p_orders', filter: `user_id=eq.${session.user.id}` }, fetchAllData)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [session?.user?.id]);

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
      
      <Joyride
        steps={TOUR_CONTENT.map(s => ({ target: s.target, placement: s.placement || 'auto', disableBeacon: true }))}
        run={runTour}
        stepIndex={tourStepIndex}
        continuous={true}
        tooltipComponent={CustomTourTooltip}
      />

      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400/20 rounded-full blur-[120px]"></div>
      </div>

      <div className="flex h-screen overflow-hidden max-w-7xl mx-auto">
        <Sidebar
          isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}
          activeTab={activeTab} setActiveTab={setActiveTab}
          onSignOut={onSignOut} t={t}
        />
        
        <main className="flex-1 flex flex-col relative overflow-hidden">
          <TopHeader 
            setIsSidebarOpen={setIsSidebarOpen} tabTitles={tabTitles} activeTab={activeTab}
            isAppDrawerOpen={isAppDrawerOpen} setIsAppDrawerOpen={setIsAppDrawerOpen}
            setActiveAppPopup={setActiveAppPopup} isSearchExpanded={isSearchExpanded}
            setIsSearchExpanded={setIsSearchExpanded} searchQuery={searchQuery}
            setSearchQuery={setSearchQuery} searchResults={searchResults}
            formatCurrency={formatCurrency} isNotificationMenuOpen={isNotificationMenuOpen}
            setIsNotificationMenuOpen={setIsNotificationMenuOpen} unreadCount={notifications.filter(n => !n.read).length}
            isProfileMenuOpen={isProfileMenuOpen} setIsProfileMenuOpen={setIsProfileMenuOpen}
            profile={profile} userName={profile?.full_name?.split('@')[0] || 'Client'}
            visibleNotifications={notifications} setActiveTab={setActiveTab}
            setSubTab={setSubTab} onSignOut={onSignOut} session={session} balances={balances} fetchAllData={fetchAllData} commercialProfile={commercialProfile} activeAppPopup={activeAppPopup}
          />
          
          <div className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10 no-scrollbar scroll-container pb-24 md:pb-8" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom) + 5rem), 2rem)' }} id="main-scroll">
            
            {/* DYNAMIC VIEW ROUTER */}
            {activeTab === 'NET_POSITION' && (
              <NetPositionHome 
                profile={profile} 
                balances={balances} 
                transactions={transactions} 
                totalNetWorth={totalNetWorth} 
                formatCurrency={formatCurrency} 
                setActiveTab={setActiveTab} 
                activeEscrows={activeEscrows} 
                setIsNotificationMenuOpen={setIsNotificationMenuOpen} 
                showBalances={showBalances}
                setShowBalances={setShowBalances}
                setActiveModal={setActiveModal}
                setShowPayMe={setShowPayMe}
                setShowDepositUI={setShowDepositUI}
                setIsWithdrawOpen={setIsWithdrawOpen}
                showAnalytics={showAnalytics}
                setShowAnalytics={setShowAnalytics}
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
              />
            )}
            
            {activeTab === 'TRANSACTIONS' && <TransactionLedger transactions={transactions} formatCurrency={formatCurrency} setShowStatementModal={setShowStatementModal} />}
            {activeTab === 'NETWORK' && <CapitalNetwork session={session} profile={profile} balances={balances} formatCurrency={formatCurrency} fetchAllData={fetchAllData} />}
            {activeTab === 'ACCOUNTS' && <AccountHub session={session} balances={balances} profile={profile} showBalances={showBalances} />}
            {activeTab === 'ORGANIZE' && <OrganizationSuite session={session} balances={balances} pockets={pockets} recipients={recipients} showBalances={showBalances} />}
            {activeTab === 'INVEST' && <WealthInvest session={session} balances={balances} profile={profile} investments={investments} showBalances={showBalances} />}
            {activeTab === 'PLANNER' && <FinancialPlanner balances={balances} />}
            {activeTab === 'LIFESTYLE' && <GlobalLifestyle session={session} profile={profile} balances={balances} />}
            {activeTab === 'SOS' && <EmergencySOS session={session} balances={balances} profile={profile} />}
            {activeTab === 'TRAINING' && <Training session={session} />}
            {activeTab === 'AGENTS' && <Agents session={session} profile={profile} balances={balances} />}
            {activeTab === 'INSURANCE' && <InsuranceHub profile={profile} />}
          </div>

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
      
      {/* 💳 DEPOSIT OVERLAY (RESTORED) */}
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
      
      {/* 💸 WITHDRAWAL OVERLAY (RESTORED) */}
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

      {showPayMe && <PayMeCard profile={profile} onClose={() => setShowPayMe(false)} />}
      {activeModal === 'ADVISOR' && <Chat session={session} profile={profile} balances={balances} onClose={() => setActiveModal(null)} />}
    </div>
  );
}