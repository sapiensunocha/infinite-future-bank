import React from 'react';
import { 
  ShieldAlert, Lock, Loader2, Landmark, Briefcase, 
  ShieldCheck, TrendingUp, PieChart, BarChart2, 
  Send, Download, Plus, ArrowRightLeft, QrCode
} from 'lucide-react';
import HeroBanner from '../HeroBanner'; // Make sure this path is correct based on your folder structure

export default function NetPositionHome({ 
  profile, balances, transactions, totalNetWorth, formatCurrency, 
  setActiveTab, activeEscrows, setIsNotificationMenuOpen, 
  showBalances, setShowBalances, setActiveModal, 
  setShowPayMe, setShowDepositUI, setIsWithdrawOpen,
  showAnalytics, setShowAnalytics
}) {

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
      
      {/* KYC Alert */}
      {profile && profile.kyc_status !== 'verified' && (
        <div className="bg-red-50 border border-red-200 p-5 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
          <div>
            <h3 className="text-red-600 font-black uppercase tracking-widest text-xs flex items-center gap-2"><ShieldAlert size={16}/> Regulatory Action Required</h3>
            <p className="text-slate-600 text-sm mt-1 font-medium">To comply with global anti-money laundering laws, you must complete Identity Verification (KYC) within 30 days to prevent account suspension.</p>
          </div>
          <button onClick={() => { setActiveTab('SETTINGS'); /* Note: subTab routing must be handled in parent if needed */ }} className="px-6 py-3 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-700 transition-colors whitespace-nowrap shadow-md">
            Verify Identity Now
          </button>
        </div>
      )}

      {/* P2P Escrow Alerts */}
      {activeEscrows?.length > 0 && (
        <div className="space-y-3 mb-4 animate-in fade-in slide-in-from-top-4">
          {activeEscrows.map(escrow => (
            <div key={escrow.id} className="bg-emerald-50 border border-emerald-200 p-4 sm:p-5 rounded-[2rem] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl relative">
                     <Lock size={20} className="relative z-10"/>
                     <div className="absolute inset-0 bg-emerald-400 opacity-20 rounded-xl animate-ping"></div>
                  </div>
                  <div>
                     <p className="font-black text-emerald-900 text-sm">
                       {escrow.order_type === 'deposit' ? 'Inbound P2P Deposit' : 'Outbound P2P Withdrawal'} • {formatCurrency(escrow.amount_usd)}
                     </p>
                     <p className="text-[10px] font-bold text-emerald-700 mt-1 uppercase tracking-widest flex items-center gap-1">
                       <Loader2 size={10} className="animate-spin"/> Status: {escrow.status.replace(/_/g, ' ')}
                     </p>
                  </div>
               </div>
               <button onClick={(e) => { e.preventDefault(); setIsNotificationMenuOpen(true); }} className="w-full sm:w-auto px-6 py-3 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-500 transition-colors shadow-sm">
                 Check Updates
               </button>
            </div>
          ))}
        </div>
      )}

      {/* Hero Banner Component */}
      <HeroBanner 
        profile={profile}
        balances={balances}
        transactions={transactions}
        formatCurrency={formatCurrency}
        showBalances={showBalances}
        setShowBalances={setShowBalances}
        setActiveTab={setActiveTab}
        setActiveModal={setActiveModal}
      />

      {/* Quick Actions Grid */}
      <div id="tour-quick-actions" className="bg-white/40 backdrop-blur-2xl border border-white/60 p-5 rounded-[2.5rem] shadow-2xl">
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-3 sm:gap-4">
          {[
            { id: 'SEND', icon: <Send size={22} />, color: 'text-blue-500', label: 'SEND', action: () => setActiveModal('SEND') },
            { id: 'REQUEST', icon: <Download size={22} />, color: 'text-blue-500', label: 'REQUEST', action: () => setActiveModal('REQUEST') },
            { id: 'PAY_ME', icon: <QrCode size={22} />, color: 'text-blue-600', label: 'PAY ME', action: () => setShowPayMe(true) },
            { id: 'TRANSFER', icon: <ArrowRightLeft size={22} />, color: 'text-blue-500', label: 'TRANSFER', action: () => setActiveModal('TRANSFER') },
            { id: 'DEPOSIT', icon: <Plus size={22} />, color: 'text-emerald-500', label: 'DEPOSIT', action: () => setShowDepositUI(true) },
            { id: 'WITHDRAW', icon: <Landmark size={22} />, color: 'text-slate-600', label: 'WITHDRAW', action: () => setIsWithdrawOpen(true) },
            { id: 'ANALYTICS', icon: <BarChart2 size={22} />, color: 'text-indigo-500', label: 'ANALYTICS', action: () => setShowAnalytics(!showAnalytics), isToggle: true, active: showAnalytics }
          ].map((btn) => (
            <button 
              key={btn.id}
              onClick={btn.action} 
              className={`flex flex-col items-center justify-center gap-3 py-6 rounded-[2.2rem] transition-all duration-300 group border relative overflow-hidden ${
                btn.isToggle && btn.active 
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-2xl scale-95' 
                  : 'bg-white/60 text-slate-700 border-white/80 hover:bg-white hover:shadow-xl hover:scale-105 active:scale-95'
              }`}
            >
              <div className={`transition-transform duration-300 group-hover:-translate-y-1 ${btn.isToggle && btn.active ? 'text-white' : btn.color}`}>
                {btn.icon}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest text-center ${btn.isToggle && btn.active ? 'text-indigo-50' : 'text-slate-500'}`}>
                {btn.label}
              </span>
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            </button>
          ))}
        </div>
      </div>

      {/* Analytics / Core Balances Display */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl p-6 md:p-8 shadow-sm transition-all duration-500 min-h-[300px] mt-6">
        {showAnalytics ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-500">
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
}