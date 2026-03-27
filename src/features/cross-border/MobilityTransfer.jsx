import React, { useState, useEffect } from 'react';
import { Globe, ArrowRightLeft, Send, Loader } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { useAppStore } from '@/store/appStore';
import { formatCurrency } from '@/utils/currencyFormat';

export default function MobilityTransfer() {
  const { balances } = useAppStore();
  const availableUsd = balances.liquidCash || 0;
  
  const [sendAmount, setSendAmount] = useState('');
  const [targetCurrency, setTargetCurrency] = useState('EUR');
  const [recipient, setRecipient] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Real FX API State
  const [liveRates, setLiveRates] = useState({});
  const [isLoadingRates, setIsLoadingRates] = useState(true);

  useEffect(() => {
    // In production, fetch from your backend FX proxy or a real API
    const fetchRates = async () => {
      try {
        const res = await fetch('https://api.frankfurter.app/latest?from=USD');
        if (res.ok) {
          const data = await res.json();
          setLiveRates(data.rates);
        }
      } catch (err) {
        console.error("FX Feed offline", err);
      } finally {
        setIsLoadingRates(false);
      }
    };
    fetchRates();
  }, []);

  const currentRate = liveRates[targetCurrency] || 0;
  const receiveAmount = sendAmount ? (Number(sendAmount) * currentRate).toFixed(2) : '0.00';

  const handleTransfer = async () => {
    if (!sendAmount || !recipient || sendAmount > availableUsd) return;
    setIsProcessing(true);
    try {
      await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/transfer/wire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: sendAmount, currency: targetCurrency, recipient })
      });
      alert('Wire transfer submitted to ledger.');
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter flex items-center gap-3">
            <Globe className="text-blue-600" size={28} /> Global Mobility
          </h1>
          <p className="text-slate-500 font-bold mt-2 text-sm max-w-xl">Bypass SWIFT delays. Settle globally instantly via verified ledgers.</p>
        </div>
      </div>

      <GlassCard className="max-w-2xl" padding="p-8">
        {isLoadingRates ? (
          <div className="flex justify-center items-center py-10"><Loader className="animate-spin text-blue-600" /></div>
        ) : (
          <div className="space-y-6">
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 relative shadow-inner">
               <div className="flex justify-between mb-2">
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">You Send (USD)</span>
                 <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Max: {formatCurrency(availableUsd)}</span>
               </div>
               <input
                 type="number"
                 value={sendAmount}
                 onChange={(e) => setSendAmount(e.target.value)}
                 className="w-full bg-transparent text-4xl font-black text-slate-800 focus:outline-none"
                 placeholder="0.00"
               />
               
               <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-white border border-slate-300 rounded-full flex items-center justify-center shadow-sm z-10">
                 <ArrowRightLeft size={14} className="text-slate-400 rotate-90" />
               </div>
            </div>

            <div className="bg-slate-100 border border-slate-200 rounded-3xl p-6 shadow-inner mt-4">
               <div className="flex justify-between mb-4 items-center">
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Recipient Gets</span>
                 <select 
                   value={targetCurrency} 
                   onChange={(e) => setTargetCurrency(e.target.value)}
                   className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer shadow-sm"
                 >
                   <option value="EUR">EUR</option>
                   <option value="GBP">GBP</option>
                   <option value="JPY">JPY</option>
                 </select>
               </div>
               <div className="text-4xl font-black text-slate-800">{receiveAmount}</div>
               <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase">Live Market Rate: 1 USD = {currentRate} {targetCurrency}</p>
            </div>

            <input
               type="text"
               placeholder="Recipient IBAN or Wallet Address"
               value={recipient}
               onChange={(e) => setRecipient(e.target.value)}
               className="w-full bg-white/60 border border-white/80 rounded-2xl py-4 px-4 text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-400 shadow-inner"
            />

            <button 
              onClick={handleTransfer}
              disabled={isProcessing || !sendAmount || !recipient}
              className="w-full py-4 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-lg disabled:opacity-50"
            >
              {isProcessing ? 'Verifying Route...' : 'Initiate Transfer'} <Send size={16} />
            </button>
          </div>
        )}
      </GlassCard>
    </div>
  );
}