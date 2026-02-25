import React, { useState, useEffect } from 'react';
import { Briefcase, ArrowRight, ShieldCheck, Loader, Lock } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { formatCurrency } from '@/utils/currencyFormat';

export default function AlphaDeals() {
  const [deals, setDeals] = useState([]);
  const [isLoadingDeals, setIsLoadingDeals] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [investAmount, setInvestAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch live deals from your actual backend/database
  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/deals/active`);
        if (response.ok) {
          const data = await response.json();
          setDeals(data);
        }
      } catch (error) {
        console.error("Failed to load live deals:", error);
      } finally {
        setIsLoadingDeals(false);
      }
    };
    fetchDeals();
  }, []);

  const handleInvest = async () => {
    if (!selectedDeal || investAmount < selectedDeal.minInvestment) return;
    setIsProcessing(true);
    try {
      // Send real investment execution to backend
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/deals/invest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId: selectedDeal.id, amount: Number(investAmount) })
      });
      if (res.ok) alert('Allocation successfully processed.');
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter flex items-center gap-3">
            <Briefcase className="text-red-600" size={28} /> Alpha Secondary Market
          </h1>
          <p className="text-slate-500 font-bold mt-2 text-sm">Direct fractional access to institutional private equity.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 lg:col-span-2 space-y-4">
          {isLoadingDeals ? (
            <GlassCard className="flex flex-col items-center justify-center py-20">
              <Loader className="animate-spin text-blue-600 mb-4" size={32} />
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Syncing Private Market Ledger...</p>
            </GlassCard>
          ) : deals.length === 0 ? (
            <GlassCard className="flex flex-col items-center justify-center py-20 border-dashed border-slate-300">
              <Lock className="text-slate-300 mb-4" size={32} />
              <h3 className="text-lg font-black text-slate-600">No Active Allocations</h3>
              <p className="text-sm font-bold text-slate-400 mt-2">The secondary market is currently closed. Await next block.</p>
            </GlassCard>
          ) : (
            deals.map((deal) => (
              <GlassCard 
                key={deal.id} 
                padding="p-6"
                hover={true}
                className={`cursor-pointer ${selectedDeal?.id === deal.id ? 'ring-2 ring-blue-500 bg-white/80' : ''}`}
              >
                <div onClick={() => setSelectedDeal(deal)}>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-black text-slate-800">{deal.company}</h3>
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-3 py-1 rounded-full font-black uppercase tracking-widest">{deal.ticker}</span>
                  </div>
                  <div className="flex gap-6 mt-4 pt-4 border-t border-slate-200/50">
                    <div><p className="text-[9px] text-slate-400 font-black uppercase">Price</p><p className="font-bold text-slate-800">{formatCurrency(deal.pricePerShare)}</p></div>
                    <div><p className="text-[9px] text-slate-400 font-black uppercase">Min Entry</p><p className="font-bold text-slate-800">{formatCurrency(deal.minInvestment)}</p></div>
                  </div>
                </div>
              </GlassCard>
            ))
          )}
        </div>

        <div className="col-span-1">
          <GlassCard className="sticky top-24 bg-blue-50/40 border-blue-200/50">
             {selectedDeal ? (
               <>
                 <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest mb-6">Execute Trade: {selectedDeal.ticker}</h3>
                 <input
                    type="number"
                    value={investAmount}
                    onChange={(e) => setInvestAmount(e.target.value)}
                    placeholder="Enter Allocation Amount"
                    className="w-full bg-white/80 border border-blue-200 rounded-2xl py-4 px-4 font-black text-slate-800 mb-6 shadow-inner focus:outline-none focus:border-blue-400"
                 />
                 <button 
                   onClick={handleInvest}
                   disabled={isProcessing || !investAmount || investAmount < selectedDeal.minInvestment}
                   className="w-full py-4 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg"
                 >
                   {isProcessing ? 'Securing Block...' : 'Commit Capital'}
                 </button>
               </>
             ) : (
               <div className="text-center py-10 opacity-50">
                 <Briefcase className="mx-auto text-slate-400 mb-3" />
                 <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Select Deal to Execute</p>
               </div>
             )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}