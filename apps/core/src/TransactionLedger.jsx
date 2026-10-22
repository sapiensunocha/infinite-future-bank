import React, { useState } from 'react';
import {
  Filter, FileDown, ArrowDownRight, ArrowUpRight, ArrowDownUp,
  CheckCircle2, Clock, XCircle, CreditCard, Building, Zap, Wallet,
  Search, ChevronRight
} from 'lucide-react';

const TABS = ['ALL', 'SUCCEEDED', 'PENDING', 'FAILED'];

const parseTransactionUi = (tx) => {
  const typeStr = (tx.transaction_type || '').toLowerCase();
  const meta = tx.metadata || {};
  let Icon = Wallet, iconBg = 'bg-slate-100', iconText = 'text-slate-500';
  let methodBadge = tx.transaction_type;
  let displayTitle = tx.description || tx.transaction_type;

  if (typeStr.includes('card') || typeStr.includes('expense')) {
    Icon = CreditCard; iconBg = 'bg-blue-100'; iconText = 'text-blue-600';
    methodBadge = meta.last4 ? `Card ••${meta.last4}` : 'Corporate Card';
    displayTitle = meta.merchant || displayTitle;
  } else if (typeStr.includes('deposit') || typeStr.includes('topup') || typeStr.includes('stripe')) {
    Icon = ArrowDownRight; iconBg = 'bg-emerald-100'; iconText = 'text-emerald-600';
    methodBadge = 'External Deposit';
    displayTitle = meta.source ? `Deposit from ${meta.source}` : displayTitle;
  } else if (typeStr.includes('withdraw') || typeStr.includes('payout')) {
    Icon = Building; iconBg = 'bg-slate-100'; iconText = 'text-slate-600';
    methodBadge = 'Bank Withdrawal';
    displayTitle = meta.bank_name ? `Withdrawal to ${meta.bank_name}` : displayTitle;
  } else if (typeStr.includes('send') || typeStr.includes('receive') || typeStr.includes('p2p')) {
    Icon = Zap;
    iconBg = tx.amount > 0 ? 'bg-emerald-100' : 'bg-amber-100';
    iconText = tx.amount > 0 ? 'text-emerald-600' : 'text-amber-600';
    methodBadge = 'Internal Network';
  }
  return { Icon, iconBg, iconText, methodBadge, displayTitle };
};

const StatusBadge = ({ status }) => {
  if (status === 'Succeeded') return <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg w-fit border border-emerald-100"><CheckCircle2 size={10} /> Done</span>;
  if (status === 'Pending')   return <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg w-fit border border-amber-100"><Clock size={10} /> Pending</span>;
  return <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-red-600 bg-red-50 px-2.5 py-1 rounded-lg w-fit border border-red-100"><XCircle size={10} /> Failed</span>;
};

export default function TransactionLedger({ transactions, formatCurrency, setShowStatementModal }) {
  const [activeTxTab, setActiveTxTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const currentMonth = new Date().getMonth();
  const currentYear  = new Date().getFullYear();
  const monthTxs = transactions.filter(tx => {
    const d = new Date(tx.created_at);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const moneyIn  = monthTxs.filter(tx => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0);
  const moneyOut = monthTxs.filter(tx => tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0);
  const netChange = moneyIn - moneyOut;

  const filtered = transactions.filter(tx => {
    const uiStatus = tx.status === 'completed' ? 'SUCCEEDED' : tx.status === 'pending' ? 'PENDING' : 'FAILED';
    if (activeTxTab !== 'ALL' && activeTxTab !== uiStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const desc = (tx.description || tx.transaction_type || '').toLowerCase();
      return desc.includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500 pb-10">

      {/* ─── Monthly summary ─── */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <div className="bg-white border border-slate-100 p-4 md:p-6 rounded-[1.8rem] shadow-sm">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Net (Month)</p>
          <p className={`text-lg md:text-xl font-black tracking-tight ${netChange >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {netChange >= 0 ? '+' : ''}{formatCurrency(Math.abs(netChange))}
          </p>
        </div>
        <div className="bg-white border border-slate-100 p-4 md:p-6 rounded-[1.8rem] shadow-sm">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 flex items-center gap-1">
            <ArrowDownRight size={11} className="text-emerald-500" /> In
          </p>
          <p className="text-lg md:text-xl font-black tracking-tight text-emerald-600">{formatCurrency(moneyIn)}</p>
        </div>
        <div className="bg-white border border-slate-100 p-4 md:p-6 rounded-[1.8rem] shadow-sm">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 flex items-center gap-1">
            <ArrowUpRight size={11} className="text-slate-400" /> Out
          </p>
          <p className="text-lg md:text-xl font-black tracking-tight text-slate-800">{formatCurrency(moneyOut)}</p>
        </div>
      </div>

      {/* ─── Container ─── */}
      <div className="bg-white border border-slate-100 rounded-[2rem] shadow-sm overflow-hidden">

        {/* Controls */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
            />
          </div>

          {/* Filter tabs + export */}
          <div className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTxTab(tab)}
                  className={`px-3.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                    activeTxTab === tab ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 bg-white border border-slate-100'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowStatementModal(true)}
              className="shrink-0 px-3.5 py-1.5 bg-slate-800 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5"
            >
              <FileDown size={12} /> Export
            </button>
          </div>
        </div>

        {/* ════════════════════════════════════ */}
        {/* MOBILE — card list view             */}
        {/* ════════════════════════════════════ */}
        <div className="md:hidden divide-y divide-slate-50">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <ArrowDownUp size={36} className="mx-auto text-slate-300 mb-4" />
              <p className="text-sm font-bold text-slate-600">No transactions found</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your filters.</p>
            </div>
          ) : filtered.map(tx => {
            const isPos = tx.amount > 0;
            const uiStatus = tx.status === 'completed' ? 'Succeeded' : tx.status === 'pending' ? 'Pending' : 'Failed';
            const { Icon, iconBg, iconText, displayTitle } = parseTransactionUi(tx);
            const dateStr = new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const timeStr = new Date(tx.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            return (
              <div key={tx.id} className="flex items-center gap-4 px-4 py-3.5 active:bg-slate-50 transition-colors">
                <div className={`w-12 h-12 rounded-2xl ${iconBg} ${iconText} flex items-center justify-center shrink-0`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 capitalize truncate">{displayTitle}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">{dateStr} · {timeStr}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-black ${isPos ? 'text-emerald-600' : 'text-slate-800'}`}>
                    {isPos ? '+' : ''}{formatCurrency(tx.amount)}
                  </p>
                  <div className="flex justify-end mt-1">
                    {uiStatus === 'Succeeded' && <span className="text-[8px] font-black text-emerald-500">✓ Done</span>}
                    {uiStatus === 'Pending'   && <span className="text-[8px] font-black text-amber-500">⏳ Pending</span>}
                    {uiStatus === 'Failed'    && <span className="text-[8px] font-black text-red-500">✕ Failed</span>}
                  </div>
                </div>
                <ChevronRight size={14} className="text-slate-300 shrink-0 ml-1" />
              </div>
            );
          })}
        </div>

        {/* ════════════════════════════════════ */}
        {/* DESKTOP — table view               */}
        {/* ════════════════════════════════════ */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-white">
                {['Date & Time', 'Description', 'Method', 'Status', 'Amount'].map((h, i) => (
                  <th key={h} className={`p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap ${i === 4 ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(tx => {
                const isPositive = tx.amount > 0;
                const uiStatus = tx.status === 'completed' ? 'Succeeded' : tx.status === 'pending' ? 'Pending' : 'Failed';
                const { Icon, iconBg, iconText, methodBadge, displayTitle } = parseTransactionUi(tx);
                return (
                  <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors cursor-pointer">
                    <td className="p-4 whitespace-nowrap">
                      <p className="text-sm font-bold text-slate-800">{new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                      <p className="text-[10px] font-bold text-slate-400">{new Date(tx.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full ${iconBg} ${iconText} flex items-center justify-center shrink-0`}>
                          <Icon size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 capitalize truncate max-w-[200px]">{displayTitle}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {tx.id.split('-')[0]}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="bg-slate-100 border border-slate-200 text-slate-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest inline-block whitespace-nowrap">{methodBadge}</span>
                    </td>
                    <td className="p-4"><StatusBadge status={uiStatus} /></td>
                    <td className={`p-4 text-sm font-black text-right whitespace-nowrap ${isPositive ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {isPositive ? '+' : ''}{formatCurrency(tx.amount)} <span className="text-[10px] text-slate-400 ml-1">USD</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
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
}
