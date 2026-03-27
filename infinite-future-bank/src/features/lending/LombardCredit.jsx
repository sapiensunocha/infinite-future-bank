import React, { useState } from 'react';
import { Landmark, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { usePortfolio } from '@/hooks/usePortfolio';
import { formatCurrency } from '@/utils/currencyFormat';

export default function LombardCredit() {
  const { liveNetWorth } = usePortfolio();
  
  // Real institutional LTV constraint (e.g., max 50% of verified portfolio)
  const maxBorrowPower = liveNetWorth * 0.5; 
  
  const [borrowAmount, setBorrowAmount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const currentLTV = liveNetWorth > 0 ? ((borrowAmount / liveNetWorth) * 100).toFixed(1) : 0;
  const isHighRisk = currentLTV > 40;

  const handleDrawdown = async () => {
    if (borrowAmount <= 0 || borrowAmount > maxBorrowPower) return;
    setIsProcessing(true);
    
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/lending/drawdown`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: borrowAmount, userId: 'live-user-id' })
      });
      if (!res.ok) throw new Error('Drawdown rejected');
      setSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:flex-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter flex items-center gap-3">
            <Landmark className="text-blue-600" size={28} /> Lombard Liquidity Line
          </h1>
          <p className="text-slate-500 font-bold mt-2 max-w-xl text-sm">
            Access instant liquidity secured against your verified portfolio. No taxable events triggered.
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Max Borrowing Power</p>
          <div className="text-4xl font-black text-slate-800 drop-shadow-sm">
            {formatCurrency(maxBorrowPower)}
          </div>
        </div>
      </div>

      <GlassCard className="max-w-3xl" padding="p-10">
        {!success ? (
          <>
            <div className="mb-8">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4">Request Drawdown</label>
               <input
                  type="number"
                  value={borrowAmount || ''}
                  onChange={(e) => setBorrowAmount(Number(e.target.value))}
                  placeholder="0.00"
                  max={maxBorrowPower}
                  disabled={maxBorrowPower === 0}
                  className="w-full bg-white/40 border border-white/60 rounded-[1.5rem] py-6 px-6 text-4xl font-black text-slate-800 focus:outline-none focus:border-blue-400 shadow-inner disabled:opacity-50"
               />
               <input
                  type="range"
                  min="0"
                  max={maxBorrowPower || 100}
                  value={borrowAmount}
                  onChange={(e) => setBorrowAmount(Number(e.target.value))}
                  disabled={maxBorrowPower === 0}
                  className="w-full mt-6 accent-blue-600 cursor-pointer disabled:opacity-50"
               />
            </div>

            <div className="bg-slate-50/50 border border-slate-200/50 rounded-3xl p-6 mb-8 shadow-inner">
               <div className="flex justify-between items-center mb-2">
                 <span className="text-xs font-black uppercase tracking-widest text-slate-500">Loan-to-Value (LTV) Ratio</span>
                 <span className={`text-lg font-black ${isHighRisk ? 'text-red-500' : 'text-green-600'}`}>{currentLTV}%</span>
               </div>
               <div className="w-full h-3 bg-white border border-slate-200 rounded-full overflow-hidden shadow-inner">
                 <div className={`h-full transition-all duration-300 ${isHighRisk ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${currentLTV}%` }}></div>
               </div>
               {isHighRisk && (
                 <p className="text-red-600 text-[10px] font-bold uppercase tracking-widest mt-4 flex items-center gap-1.5 bg-red-50 p-2 rounded-lg">
                   <ShieldAlert size={12} /> Approaching margin threshold.
                 </p>
               )}
            </div>

            <button 
              onClick={handleDrawdown}
              disabled={isProcessing || borrowAmount <= 0 || maxBorrowPower === 0}
              className="w-full py-4 rounded-2xl bg-slate-800 text-white font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors shadow-xl disabled:opacity-50"
            >
              {isProcessing ? 'Securing Collateral...' : 'Transfer to Checking'} <ArrowRight size={18} />
            </button>
          </>
        ) : (
          <div className="text-center py-10">
             <CheckCircle2 size={48} className="mx-auto text-green-600 mb-4" />
             <h2 className="text-2xl font-black text-slate-800 mb-2">Funds Disbursed</h2>
             <p className="text-slate-500 font-bold">{formatCurrency(borrowAmount)} credited to operating account.</p>
          </div>
        )}
      </GlassCard>
    </div>
  );
}