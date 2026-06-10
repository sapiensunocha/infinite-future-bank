import React, { lazy, Suspense } from 'react';
import { X, Loader2 } from 'lucide-react';

// Lazy-load every popup screen — only one is ever visible at a time
// Previously all were static imports bundling 11 heavy components into Dashboard
const Payroll         = lazy(() => import('../../Payroll'));
const PayBills        = lazy(() => import('../../PayBills'));
const SmartContracts  = lazy(() => import('../../SmartContracts'));
const Loans           = lazy(() => import('../../Loans'));
const NpoHub          = lazy(() => import('../../NpoHub'));
const BillingTerminal = lazy(() => import('../../features/commerce/BillingTerminal'));
const TicketGate      = lazy(() => import('../../features/commerce/TicketGate'));
const VentureExchange = lazy(() => import('../../VentureExchange'));
const P2PExchange     = lazy(() => import('../../P2PExchange'));
const ClyrixHub       = lazy(() => import('../../features/ClyrixHub'));
const PraxciHub       = lazy(() => import('../../features/PraxciHub'));

const ModalLoader = () => (
  <div className="flex items-center justify-center h-48">
    <Loader2 className="animate-spin text-blue-500" size={28} />
  </div>
);

const TITLES = {
  PAYROLL:           'Corporate Payroll',
  BILLS:             'Pay Bills',
  CONTRACTS:         'Smart Contracts',
  NPO:               'Philanthropy Hub',
  LOANS:             'Lending',
  VENTURE_EXCHANGE:  'Venture Exchange',
  MERCHANT_BILLING:  'Merchant Invoicing',
  MERCHANT_TICKETS:  'Box Office',
  CLYRIX:            'Clyrix Health',
  PRAXCI:            'Praxci Education',
  P2P_EXCHANGE:      'P2P Liquidity',
};

export default function AppPopupModal({
  activeAppPopup, setActiveAppPopup, session, balances, fetchAllData,
  commercialProfile, profile, triggerGlobalActionNotification
}) {
  if (!activeAppPopup) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
      {/* Backdrop tap to close */}
      <div className="absolute inset-0" onClick={() => setActiveAppPopup(null)} />

      <div className="relative bg-white w-full md:max-w-5xl md:mx-4 md:rounded-3xl rounded-t-[2.5rem] md:h-[90vh] h-[94vh] shadow-2xl overflow-hidden flex flex-col border border-slate-100 animate-in slide-in-from-bottom-4 md:zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex-shrink-0">
          {/* Mobile drag handle */}
          <div className="md:hidden flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-slate-200 rounded-full" />
          </div>
          <div className="px-5 md:px-6 py-3 md:py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-20">
            <h3 className="font-black text-sm md:text-lg text-slate-800 tracking-tight uppercase">
              {TITLES[activeAppPopup] || 'App'}
            </h3>
            <button
              onClick={() => setActiveAppPopup(null)}
              className="w-9 h-9 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-2xl flex items-center justify-center transition-colors active:scale-90"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable content — each screen loads only when first opened */}
        <div className="flex-1 overflow-y-auto no-scrollbar scroll-container bg-slate-50 p-4 md:p-8">
          <Suspense fallback={<ModalLoader />}>
            {activeAppPopup === 'PAYROLL'           && <Payroll session={session} balances={balances} fetchAllData={fetchAllData} commercialProfile={commercialProfile} />}
            {activeAppPopup === 'BILLS'             && <PayBills session={session} balances={balances} fetchAllData={fetchAllData} />}
            {activeAppPopup === 'CONTRACTS'         && <SmartContracts session={session} balances={balances} fetchAllData={fetchAllData} />}
            {activeAppPopup === 'LOANS'             && <Loans session={session} balances={balances} fetchAllData={fetchAllData} profile={profile} />}
            {activeAppPopup === 'NPO'               && <NpoHub session={session} />}
            {activeAppPopup === 'MERCHANT_BILLING'  && <BillingTerminal session={session} balances={balances} fetchAllData={fetchAllData} />}
            {activeAppPopup === 'MERCHANT_TICKETS'  && <TicketGate session={session} balances={balances} fetchAllData={fetchAllData} />}
            {activeAppPopup === 'VENTURE_EXCHANGE'  && <VentureExchange session={session} balances={balances} fetchAllData={fetchAllData} profile={profile} />}
            {activeAppPopup === 'P2P_EXCHANGE'      && <P2PExchange session={session} profile={profile} balances={balances} fetchAllData={fetchAllData} />}
            {activeAppPopup === 'CLYRIX'            && <ClyrixHub session={session} profile={profile} balances={balances} triggerNotification={triggerGlobalActionNotification} />}
            {activeAppPopup === 'PRAXCI'            && <PraxciHub session={session} profile={profile} balances={balances} triggerNotification={triggerGlobalActionNotification} />}
          </Suspense>
        </div>
      </div>
    </div>
  );
}
