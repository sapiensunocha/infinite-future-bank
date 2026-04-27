import React from 'react';
import { Users, Receipt, FileCode, HandCoins, HeartHandshake, ArrowRightLeft, Rocket, Calculator, Ticket, HeartPulse, GraduationCap, X } from 'lucide-react';

import Payroll from '../../Payroll';
import PayBills from '../../PayBills';
import SmartContracts from '../../SmartContracts';
import Loans from '../../Loans';
import NpoHub from '../../NpoHub'; 
import P2PExchange from '../../P2PExchange'; 
import BillingTerminal from '../../features/commerce/BillingTerminal';
import TicketGate from '../../features/commerce/TicketGate';
import VentureExchange from '../../VentureExchange';
import ClyrixHub from '../../features/ClyrixHub';
import PraxciHub from '../../features/PraxciHub';

export default function AppDrawerMenu({ isAppDrawerOpen, setIsAppDrawerOpen, setActiveAppPopup, activeAppPopup, session, balances, fetchAllData, commercialProfile, profile }) {
  
  const triggerLocalNotification = (type, text) => {
     console.log(type, text); // Placeholder if you need local toasts inside popup
  };

  return (
    <>
      {isAppDrawerOpen && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setIsAppDrawerOpen(false)} onTouchEnd={(e) => { e.preventDefault(); setIsAppDrawerOpen(false); }} />
          <div className="absolute top-full mt-3 right-0 w-80 md:w-96 bg-white/98 backdrop-blur-3xl border border-slate-200 shadow-2xl rounded-[2rem] z-[9999] max-h-[80vh] overflow-y-auto no-scrollbar animate-in slide-in-from-top-4 fade-in" style={{ paddingBottom: '16px' }}>
            {/* Mobile drag handle */}
            <div className="md:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-slate-300 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-6 py-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Corporate & Tools</h3>
              <button onClick={() => setIsAppDrawerOpen(false)} className="md:hidden text-slate-400 hover:text-slate-700 p-1 rounded-xl"><X size={18} /></button>
            </div>
            <div className="px-6">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <button onClick={() => { setActiveAppPopup('PAYROLL'); setIsAppDrawerOpen(false); }} className="flex flex-col items-center gap-3 p-2 rounded-2xl hover:bg-blue-50 transition-colors group">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors shadow-sm"><Users size={20} /></div>
                <span className="text-[9px] font-black text-slate-700">Payroll</span>
              </button>
              <button onClick={() => { setActiveAppPopup('BILLS'); setIsAppDrawerOpen(false); }} className="flex flex-col items-center gap-3 p-2 rounded-2xl hover:bg-emerald-50 transition-colors group">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors shadow-sm"><Receipt size={20} /></div>
                <span className="text-[9px] font-black text-slate-700">Pay Bills</span>
              </button>
              <button onClick={() => { setActiveAppPopup('CONTRACTS'); setIsAppDrawerOpen(false); }} className="flex flex-col items-center gap-3 p-2 rounded-2xl hover:bg-indigo-50 transition-colors group">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors shadow-sm"><FileCode size={20} /></div>
                <span className="text-[9px] font-black text-slate-700 leading-tight text-center">Smart<br/>Contracts</span>
              </button>
              <button onClick={() => { setActiveAppPopup('LOANS'); setIsAppDrawerOpen(false); }} className="flex flex-col items-center gap-3 p-2 rounded-2xl hover:bg-amber-50 transition-colors group">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 group-hover:bg-amber-100 group-hover:text-amber-600 transition-colors shadow-sm"><HandCoins size={20} /></div>
                <span className="text-[9px] font-black text-slate-700">Lending</span>
              </button>
              <button onClick={() => { setActiveAppPopup('NPO'); setIsAppDrawerOpen(false); }} className="flex flex-col items-center gap-3 p-2 rounded-2xl hover:bg-rose-50 transition-colors group">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 group-hover:bg-rose-100 group-hover:text-rose-500 transition-colors shadow-sm"><HeartHandshake size={20} /></div>
                <span className="text-[9px] font-black text-slate-700">NPO Hub</span>
              </button>
              <button onClick={() => { setActiveAppPopup('P2P_EXCHANGE'); setIsAppDrawerOpen(false); }} className="flex flex-col items-center gap-3 p-2 rounded-2xl hover:bg-emerald-50 transition-colors group">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors shadow-sm"><ArrowRightLeft size={20} /></div>
                <span className="text-[9px] font-black text-slate-700 leading-tight text-center">P2P Escrow</span>
              </button>
              <button onClick={() => { setActiveAppPopup('VENTURE_EXCHANGE'); setIsAppDrawerOpen(false); }} className="flex flex-col items-center gap-3 p-2 rounded-2xl hover:bg-fuchsia-50 transition-colors group">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 group-hover:bg-fuchsia-100 group-hover:text-fuchsia-600 transition-colors shadow-sm"><Rocket size={20} /></div>
                <span className="text-[9px] font-black text-slate-700 leading-tight text-center">Venture<br/>Exchange</span>
              </button>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Merchant Services</h3>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => { setActiveAppPopup('MERCHANT_BILLING'); setIsAppDrawerOpen(false); }} className="flex flex-col items-center gap-3 p-4 rounded-3xl bg-slate-900 text-white hover:bg-blue-600 transition-colors group shadow-md">
                  <Calculator size={24} className="mb-1 text-blue-400 group-hover:text-white" />
                  <span className="text-[10px] font-black tracking-widest uppercase">Invoicing</span>
                </button>
                <button onClick={() => { setActiveAppPopup('MERCHANT_TICKETS'); setIsAppDrawerOpen(false); }} className="flex flex-col items-center gap-3 p-4 rounded-3xl bg-slate-900 text-white hover:bg-purple-600 transition-colors group shadow-md">
                  <Ticket size={24} className="mb-1 text-purple-400 group-hover:text-white" />
                  <span className="text-[10px] font-black tracking-widest uppercase">Box Office</span>
                </button>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 mt-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Sovereign Nodes</h3>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => { setActiveAppPopup('CLYRIX'); setIsAppDrawerOpen(false); }} className="flex flex-col items-center gap-3 p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-50 transition-colors group">
                  <HeartPulse size={24} className="text-emerald-600 group-hover:text-emerald-500" />
                  <span className="text-[10px] font-black text-emerald-800 uppercase">Clyrix Health</span>
                </button>
                <button onClick={() => { setActiveAppPopup('PRAXCI'); setIsAppDrawerOpen(false); }} className="flex flex-col items-center gap-3 p-4 rounded-3xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-50 transition-colors group">
                  <GraduationCap size={24} className="text-blue-600 group-hover:text-blue-500" />
                  <span className="text-[10px] font-black text-blue-800 uppercase">Praxci Edu</span>
                </button>
              </div>
            </div>
            </div>{/* /px-6 wrapper */}
          </div>
        </>
      )}

      {/* POPUP RENDERER */}
      {activeAppPopup && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 md:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-5xl h-[92vh] shadow-2xl overflow-hidden flex flex-col relative border border-slate-100 animate-in zoom-in-95">
            <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 z-20">
               <h3 className="font-black text-sm md:text-xl text-slate-800 tracking-tight uppercase">
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
            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 no-scrollbar scroll-container">
               {activeAppPopup === 'PAYROLL' && <Payroll session={session} balances={balances} fetchAllData={fetchAllData} commercialProfile={commercialProfile} />}
               {activeAppPopup === 'BILLS' && <PayBills session={session} balances={balances} fetchAllData={fetchAllData} />}
               {activeAppPopup === 'CONTRACTS' && <SmartContracts session={session} balances={balances} fetchAllData={fetchAllData} />}
               {activeAppPopup === 'LOANS' && <Loans session={session} balances={balances} fetchAllData={fetchAllData} profile={profile} />}
               {activeAppPopup === 'NPO' && <NpoHub session={session} />}
               {activeAppPopup === 'MERCHANT_BILLING' && <BillingTerminal session={session} balances={balances} fetchAllData={fetchAllData} />}
               {activeAppPopup === 'MERCHANT_TICKETS' && <TicketGate session={session} balances={balances} fetchAllData={fetchAllData} />}
               {activeAppPopup === 'VENTURE_EXCHANGE' && <VentureExchange session={session} balances={balances} fetchAllData={fetchAllData} profile={profile} />}
               {activeAppPopup === 'P2P_EXCHANGE' && <P2PExchange session={session} profile={profile} balances={balances} fetchAllData={fetchAllData} />}
               {activeAppPopup === 'CLYRIX' && <ClyrixHub session={session} profile={profile} balances={balances} triggerNotification={triggerLocalNotification} />}
               {activeAppPopup === 'PRAXCI' && <PraxciHub session={session} profile={profile} balances={balances} triggerNotification={triggerLocalNotification} />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}