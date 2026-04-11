import React from 'react';
import { X } from 'lucide-react';

import Payroll from '../../Payroll';
import PayBills from '../../PayBills';
import SmartContracts from '../../SmartContracts';
import Loans from '../../Loans';
import NpoHub from '../../NpoHub'; 
import BillingTerminal from '../../features/commerce/BillingTerminal';
import TicketGate from '../../features/commerce/TicketGate';
import VentureExchange from '../../VentureExchange';
import P2PExchange from '../../P2PExchange';
import ClyrixHub from '../../features/ClyrixHub';
import PraxciHub from '../../features/PraxciHub';

export default function AppPopupModal({ 
  activeAppPopup, setActiveAppPopup, session, balances, fetchAllData, 
  commercialProfile, profile, triggerGlobalActionNotification 
}) {
  if (!activeAppPopup) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-5xl h-[90vh] shadow-2xl overflow-hidden flex flex-col relative border border-slate-100 animate-in zoom-in-95">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 z-20">
           <h3 className="font-black text-xl text-slate-800 tracking-tight uppercase">
             {activeAppPopup === 'PAYROLL' ? 'Corporate Payroll' : 
              activeAppPopup === 'BILLS' ? 'Pay Bills' : 
              activeAppPopup === 'CONTRACTS' ? 'Smart Contracts' : 
              activeAppPopup === 'NPO' ? 'Philanthropy Hub' : 
              activeAppPopup === 'VENTURE_EXCHANGE' ? 'Venture Capital Exchange' : 
              activeAppPopup === 'MERCHANT_BILLING' ? 'Merchant Invoicing' : 
              activeAppPopup === 'MERCHANT_TICKETS' ? 'Box Office Scanner' : 
              activeAppPopup === 'CLYRIX' ? 'Clyrix Health Node' :
              activeAppPopup === 'PRAXCI' ? 'Praxci Education Node' :
              activeAppPopup === 'P2P_EXCHANGE' ? 'P2P Liquidity Exchange' : 
              'App'}
           </h3>
           <button onClick={() => setActiveAppPopup(null)} className="text-slate-400 hover:text-slate-800 transition-colors bg-white p-2 rounded-xl shadow-sm border border-slate-200">
             <X size={20} />
           </button>
        </div>
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
           {activeAppPopup === 'PAYROLL' && <Payroll session={session} balances={balances} fetchAllData={fetchAllData} commercialProfile={commercialProfile} />}
           {activeAppPopup === 'BILLS' && <PayBills session={session} balances={balances} fetchAllData={fetchAllData} />}
           {activeAppPopup === 'CONTRACTS' && <SmartContracts session={session} balances={balances} fetchAllData={fetchAllData} />}
           {activeAppPopup === 'LOANS' && <Loans session={session} balances={balances} fetchAllData={fetchAllData} profile={profile} />}
           {activeAppPopup === 'NPO' && <NpoHub session={session} />}
           {activeAppPopup === 'MERCHANT_BILLING' && <BillingTerminal session={session} balances={balances} fetchAllData={fetchAllData} />}
           {activeAppPopup === 'MERCHANT_TICKETS' && <TicketGate session={session} balances={balances} fetchAllData={fetchAllData} />}
           {activeAppPopup === 'VENTURE_EXCHANGE' && <VentureExchange session={session} balances={balances} fetchAllData={fetchAllData} profile={profile} />}
           {activeAppPopup === 'P2P_EXCHANGE' && <P2PExchange session={session} profile={profile} balances={balances} fetchAllData={fetchAllData} />}
           {activeAppPopup === 'CLYRIX' && <ClyrixHub session={session} profile={profile} balances={balances} triggerNotification={triggerGlobalActionNotification} />}
           {activeAppPopup === 'PRAXCI' && <PraxciHub session={session} profile={profile} balances={balances} triggerNotification={triggerGlobalActionNotification} />}
        </div>
      </div>
    </div>
  );
}