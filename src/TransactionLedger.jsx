import React, { useState } from 'react';
import { Filter, FileDown, ArrowDownRight, ArrowUpRight, ArrowDownUp, CheckCircle2, Clock, XCircle } from 'lucide-react';

export default function TransactionLedger({ transactions, formatCurrency, setShowStatementModal }) {
  const [activeTxTab, setActiveTxTab] = useState('ALL');

  // Calculate Monthly Metrics
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
      
      {/* HEADER METRICS */}
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

      {/* TABLE SECTION */}
      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
        
        {/* CONTROLS */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto no-scrollbar scroll-container">
            {['ALL', 'SUCCEEDED', 'PENDING', 'FAILED'].map(tab => (
              <button
                key={tab} 
                onClick={() => setActiveTxTab(tab)}
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

        {/* LEDGER RENDER */}
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
}