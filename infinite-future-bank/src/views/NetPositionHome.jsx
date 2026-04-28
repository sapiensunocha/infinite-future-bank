import React from 'react';
import {
  ShieldAlert, Lock, Loader2, Landmark, Briefcase,
  ShieldCheck, TrendingUp, PieChart, BarChart2,
  Send, Download, Plus, ArrowRightLeft, QrCode,
  ArrowDownRight, ArrowUpRight, Zap, CreditCard, Building, Wallet,
  ChevronRight
} from 'lucide-react';
import HeroBanner from '../HeroBanner';

// ─── tiny transaction icon helper ───────────────────────────
const txIcon = (tx) => {
  const t = (tx.transaction_type || '').toLowerCase();
  if (t.includes('deposit') || t.includes('topup')) return { Icon: ArrowDownRight, color: 'bg-emerald-100 text-emerald-600' };
  if (t.includes('withdraw') || t.includes('payout')) return { Icon: Building, color: 'bg-slate-100 text-slate-600' };
  if (t.includes('card') || t.includes('expense')) return { Icon: CreditCard, color: 'bg-blue-100 text-blue-600' };
  if (t.includes('send') || t.includes('p2p')) return { Icon: Zap, color: tx.amount > 0 ? 'bg-emerald-100 text-emerald-500' : 'bg-amber-100 text-amber-600' };
  return { Icon: Wallet, color: 'bg-slate-100 text-slate-500' };
};

export default function NetPositionHome({
  profile, balances, transactions, totalNetWorth, formatCurrency,
  setActiveTab, activeEscrows, setIsNotificationMenuOpen,
  showBalances, setShowBalances, setActiveModal,
  setShowPayMe, setShowDepositUI, setIsWithdrawOpen,
  showAnalytics, setShowAnalytics
}) {
  const safeTotalNetWorth = totalNetWorth || 1;
  const liquidPct  = ((balances.liquid_usd || 0) / safeTotalNetWorth) * 100;
  const alphaPct   = ((balances.alpha_equity_usd || 0) / safeTotalNetWorth) * 100;
  const safePct    = ((balances.mysafe_digital_usd || 0) / safeTotalNetWorth) * 100;

  const validTxs = transactions.filter(tx => tx.status !== 'failed' && tx.status !== 'pending');
  const totalInflow  = validTxs.filter(tx => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0);
  const totalOutflow = validTxs.filter(tx => tx.amount < 0).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const totalFlowVolume = (totalInflow + totalOutflow) || 1;
  const inflowPct  = (totalInflow / totalFlowVolume) * 100;
  const outflowPct = (totalOutflow / totalFlowVolume) * 100;
  const avgTransactionValue = validTxs.length > 0 ? validTxs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) / validTxs.length : 0;

  // Monthly stats
  const currentMonth = new Date().getMonth();
  const currentYear  = new Date().getFullYear();
  const monthTxs = transactions.filter(tx => { const d = new Date(tx.created_at); return d.getMonth() === currentMonth && d.getFullYear() === currentYear; });
  const moneyIn  = monthTxs.filter(tx => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0);
  const moneyOut = monthTxs.filter(tx => tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0);

  const quickActions = [
    { id: 'SEND',      icon: Send,           label: 'Send',     color: 'bg-blue-600',    action: () => setActiveModal('SEND') },
    { id: 'REQUEST',   icon: Download,       label: 'Receive',  color: 'bg-emerald-600', action: () => setActiveModal('REQUEST') },
    { id: 'PAY_ME',    icon: QrCode,         label: 'Pay Me',   color: 'bg-blue-500',    action: () => setShowPayMe(true) },
    { id: 'DEPOSIT',   icon: Plus,           label: 'Add',      color: 'bg-emerald-500', action: () => setShowDepositUI(true) },
    { id: 'WITHDRAW',  icon: Landmark,       label: 'Withdraw', color: 'bg-slate-700',   action: () => setIsWithdrawOpen(true) },
    { id: 'TRANSFER',  icon: ArrowRightLeft, label: 'Exchange', color: 'bg-indigo-600',  action: () => setActiveModal('TRANSFER') },
    { id: 'ANALYTICS', icon: BarChart2,      label: 'Analytics',color: showAnalytics ? 'bg-indigo-700' : 'bg-slate-500', action: () => setShowAnalytics(!showAnalytics) },
  ];

  const recentTxs = transactions.slice(0, 8);

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in zoom-in-95 duration-500">

      {/* KYC Alert */}
      {profile && profile.kyc_status !== 'verified' && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-sm">
          <div>
            <h3 className="text-red-600 font-black uppercase tracking-widest text-xs flex items-center gap-2"><ShieldAlert size={16} /> Regulatory Action Required</h3>
            <p className="text-slate-600 text-sm mt-1 font-medium">Complete Identity Verification (KYC) within 30 days to avoid account suspension.</p>
          </div>
          <button onClick={() => setActiveTab('SETTINGS')} className="w-full md:w-auto px-5 py-3 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-700 transition-colors whitespace-nowrap shadow-md">
            Verify Identity Now
          </button>
        </div>
      )}

      {/* P2P Escrow Alerts */}
      {activeEscrows?.length > 0 && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-4">
          {activeEscrows.map(escrow => (
            <div key={escrow.id} className="bg-emerald-50 border border-emerald-200 p-4 rounded-[2rem] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl relative">
                  <Lock size={20} className="relative z-10" />
                  <div className="absolute inset-0 bg-emerald-400 opacity-20 rounded-xl animate-ping" />
                </div>
                <div>
                  <p className="font-black text-emerald-900 text-sm">
                    {escrow.order_type === 'deposit' ? 'Inbound P2P Deposit' : 'Outbound P2P Withdrawal'} • {formatCurrency(escrow.amount_usd)}
                  </p>
                  <p className="text-[10px] font-bold text-emerald-700 mt-1 uppercase tracking-widest flex items-center gap-1">
                    <Loader2 size={10} className="animate-spin" /> {escrow.status.replace(/_/g, ' ')}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsNotificationMenuOpen(true)} className="w-full sm:w-auto px-5 py-3 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-500 transition-colors shadow-sm">
                Check Updates
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Hero Banner */}
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

      {/* ════════════════════════════════════════════════ */}
      {/* MOBILE — Revolut-style horizontal action strip  */}
      {/* ════════════════════════════════════════════════ */}
      <div className="md:hidden bg-white/80 backdrop-blur-xl border border-white/60 rounded-[2rem] shadow-xl p-5">
        <div className="flex gap-5 overflow-x-auto no-scrollbar pb-1">
          {quickActions.map(({ id, icon: Icon, label, color, action }) => (
            <button key={id} onClick={action} className="flex flex-col items-center gap-2 shrink-0 active:scale-90 transition-transform">
              <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center text-white shadow-md`}>
                <Icon size={22} />
              </div>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-wide whitespace-nowrap">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════ */}
      {/* DESKTOP — original grid quick actions        */}
      {/* ════════════════════════════════════════════ */}
      <div id="tour-quick-actions" className="hidden md:block bg-white/40 backdrop-blur-2xl border border-white/60 p-5 rounded-[2.5rem] shadow-2xl">
        <div className="grid grid-cols-7 gap-3">
          {quickActions.map(({ id, icon: Icon, label, color, action }) => (
            <button
              key={id}
              onClick={action}
              className={`flex flex-col items-center justify-center gap-3 py-6 rounded-[2.2rem] transition-all duration-300 group border relative overflow-hidden ${
                id === 'ANALYTICS' && showAnalytics
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-2xl scale-95'
                  : 'bg-white/60 text-slate-700 border-white/80 hover:bg-white hover:shadow-xl hover:scale-105 active:scale-95'
              }`}
            >
              <div className={`transition-transform duration-300 group-hover:-translate-y-1 ${id === 'ANALYTICS' && showAnalytics ? 'text-white' : ''}`}>
                <Icon size={22} />
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest text-center ${id === 'ANALYTICS' && showAnalytics ? 'text-indigo-50' : 'text-slate-500'}`}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════ */}
      {/* MOBILE — Monthly summary strip              */}
      {/* ════════════════════════════════════════════ */}
      <div className="md:hidden grid grid-cols-2 gap-3">
        <div className="bg-white rounded-[1.5rem] p-4 border border-slate-100 shadow-sm">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1.5">
            <ArrowDownRight size={11} className="text-emerald-500" /> Money In
          </p>
          <p className="text-lg font-black text-emerald-600">{formatCurrency(moneyIn)}</p>
          <p className="text-[8px] text-slate-400 mt-0.5 font-bold">This month</p>
        </div>
        <div className="bg-white rounded-[1.5rem] p-4 border border-slate-100 shadow-sm">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1.5">
            <ArrowUpRight size={11} className="text-slate-400" /> Money Out
          </p>
          <p className="text-lg font-black text-slate-800">{formatCurrency(moneyOut)}</p>
          <p className="text-[8px] text-slate-400 mt-0.5 font-bold">This month</p>
        </div>
      </div>

      {/* ════════════════════════════════════════════ */}
      {/* Analytics / Balance Cards (desktop + mobile)*/}
      {/* ════════════════════════════════════════════ */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl p-5 md:p-8 shadow-sm transition-all duration-500">
        {showAnalytics ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-5">
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
                    <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${inflowPct}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-600">Total Outflow</span>
                    <span className="text-slate-800">{formatCurrency(totalOutflow)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-slate-400 h-full rounded-full transition-all duration-1000 delay-300" style={{ width: `${outflowPct}%` }} />
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
                {[
                  { label: 'Cash', pct: liquidPct, color: 'bg-slate-800', dot: 'bg-slate-800' },
                  { label: 'Alpha', pct: alphaPct, color: 'bg-blue-500', dot: 'bg-blue-500' },
                  { label: 'Vault', pct: safePct, color: 'bg-indigo-500', dot: 'bg-indigo-500' },
                ].map(({ label, pct, dot }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${dot}`} />{label}
                    </span>
                    <span className="text-xs font-bold text-slate-800">{pct.toFixed(1)}%</span>
                  </div>
                ))}
                <div className="w-full h-3 rounded-full flex overflow-hidden mt-3 gap-0.5 shadow-inner">
                  <div className="bg-slate-800 h-full transition-all duration-1000" style={{ width: `${liquidPct}%` }} />
                  <div className="bg-blue-500 h-full transition-all duration-1000 delay-150" style={{ width: `${alphaPct}%` }} />
                  <div className="bg-indigo-500 h-full transition-all duration-1000 delay-300" style={{ width: `${safePct}%` }} />
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 animate-in fade-in zoom-in-95 duration-500">
            <button type="button" className="text-left bg-white rounded-2xl p-5 md:p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer w-full active:scale-98" onClick={() => setActiveTab('ACCOUNTS')}>
              <div className="flex justify-between items-start mb-3 w-full">
                <Landmark className="text-slate-400" size={22} />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-2 py-1 rounded-full">Cash</span>
              </div>
              <p className="text-slate-500 font-medium text-sm mb-1">Cash on Hand</p>
              <p className="text-2xl font-black text-slate-800">{formatCurrency(balances.liquid_usd)}</p>
            </button>
            <button type="button" className="text-left bg-white rounded-2xl p-5 md:p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer w-full active:scale-98" onClick={() => setActiveTab('INVEST')}>
              <div className="flex justify-between items-start mb-3 w-full">
                <Briefcase className="text-blue-500" size={22} />
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 bg-blue-50 px-2 py-1 rounded-full">Alpha</span>
              </div>
              <p className="text-slate-500 font-medium text-sm mb-1">Investments</p>
              <p className="text-2xl font-black text-slate-800">{formatCurrency(balances.alpha_equity_usd)}</p>
            </button>
            <button type="button" className="text-left bg-white rounded-2xl p-5 md:p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer w-full active:scale-98" onClick={() => setActiveTab('ORGANIZE')}>
              <div className="flex justify-between items-start mb-3 w-full">
                <ShieldCheck className="text-indigo-500" size={22} />
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2 py-1 rounded-full">Vault</span>
              </div>
              <p className="text-slate-500 font-medium text-sm mb-1">Digital Safe</p>
              <p className="text-2xl font-black text-slate-800">{formatCurrency(balances.mysafe_digital_usd)}</p>
            </button>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════ */}
      {/* MOBILE — Recent Activity feed (Revolut-style)*/}
      {/* ════════════════════════════════════════════ */}
      {recentTxs.length > 0 && (
        <div className="md:hidden bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Recent Activity</h3>
            <button
              onClick={() => setActiveTab('TRANSACTIONS')}
              className="flex items-center gap-1 text-blue-600 text-[10px] font-black uppercase tracking-widest"
            >
              See All <ChevronRight size={13} />
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {recentTxs.map((tx) => {
              const { Icon, color } = txIcon(tx);
              const isPos = tx.amount > 0;
              const label = tx.description || tx.transaction_type || 'Transaction';
              const dateStr = new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              return (
                <div key={tx.id} className="flex items-center gap-4 px-5 py-3.5 active:bg-slate-50 transition-colors">
                  <div className={`w-11 h-11 rounded-2xl ${color} flex items-center justify-center shrink-0`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 capitalize truncate">{label}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">{dateStr}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-black ${isPos ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {isPos ? '+' : ''}{formatCurrency(tx.amount)}
                    </p>
                    <div className={`text-[8px] font-black uppercase tracking-wide mt-0.5 ${
                      tx.status === 'completed' ? 'text-emerald-400' : tx.status === 'pending' ? 'text-amber-400' : 'text-red-400'
                    }`}>{tx.status}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
