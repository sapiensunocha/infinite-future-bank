import React, { useState, useEffect } from 'react';
import { Wallet, Zap, ShieldCheck, ArrowRight, Lock, AlertCircle } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { useAppStore } from '@/store/appStore';
import { formatCurrency } from '@/utils/currencyFormat';

export default function CashOptimizer() {
  const { balances, syncLiveWealth } = useAppStore();
  const availableCash = balances.liquidCash || 0;
  
  const [deployAmount, setDeployAmount] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [liveApy, setLiveApy] = useState(0);
  const [error, setError] = useState(null);

  // Fetch real-time Treasury APY from your backend
  useEffect(() => {
    const fetchApy = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/treasury/rates`);
        if (res.ok) {
          const data = await res.json();
          setLiveApy(data.currentApy);
        }
      } catch (err) {
        console.error("Failed to fetch live APY", err);
      }
    };
    fetchApy();
  }, []);

  const handleDeploy = async () => {
    if (!deployAmount || deployAmount <= 0) return;
    setIsDeploying(true);
    setError(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/treasury/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(deployAmount), userId: 'live-user-id' })
      });

      if (!response.ok) throw new Error('Transaction rejected by network');
      
      await syncLiveWealth('live-user-id'); // Refresh real balances globally
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter flex items-center gap-3 drop-shadow-sm">
            <Zap className="text-blue-600" size={28} /> Capital Allocation
          </h1>
          <p className="text-slate-500 font-bold mt-2 max-w-xl text-sm leading-relaxed">
            Deploy idle liquidity into algorithmic treasury assets. Yield is calculated and compounded dynamically.
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Live Protocol APY</p>
          <div className="text-4xl font-black text-green-600 drop-shadow-sm">
            {liveApy > 0 ? `${liveApy}%` : '---'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="flex flex-col justify-between" padding="p-8">
          {!success ? (
            <>
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <Wallet size={16} className="text-blue-600" /> Liquid Cash
                  </h3>
                  <span className="text-xs font-bold text-slate-500">Available: {formatCurrency(availableCash)}</span>
                </div>

                <div className="relative mb-6">
                  <span className="absolute inset-y-0 left-0 pl-6 flex items-center text-3xl font-black text-slate-300 pointer-events-none">$</span>
                  <input
                    type="number"
                    value={deployAmount}
                    onChange={(e) => setDeployAmount(e.target.value)}
                    placeholder="0.00"
                    max={availableCash}
                    className="w-full bg-white/40 border border-white/60 rounded-[1.5rem] py-6 pl-14 pr-6 text-4xl font-black text-slate-800 focus:outline-none focus:border-blue-400 focus:bg-white/80 transition-all shadow-inner placeholder-slate-300"
                  />
                </div>

                {error && (
                  <div className="mb-4 p-4 rounded-2xl bg-red-50/80 border border-red-200 flex items-start gap-2 text-sm font-bold text-red-600">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" /> {error}
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-slate-200/50">
                <button 
                  onClick={handleDeploy}
                  disabled={isDeploying || availableCash === 0}
                  className="w-full py-4 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-lg disabled:opacity-50"
                >
                  {isDeploying ? 'Processing Transaction...' : 'Deploy Capital'} <ArrowRight size={18} />
                </button>
                <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4 flex justify-center items-center gap-1.5">
                  <Lock size={10} /> Cryptographically secured. Withdraw anytime.
                </p>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-12 h-full">
              <div className="w-20 h-20 rounded-3xl bg-green-100 border border-green-200 flex items-center justify-center mb-6 shadow-inner">
                <ShieldCheck size={40} className="text-green-600" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">Capital Deployed</h2>
              <p className="text-slate-500 font-bold mb-8">Asset reallocation confirmed on ledger.</p>
              <button onClick={() => setSuccess(false)} className="px-6 py-3 bg-white/60 border border-white/80 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-white/90 shadow-sm">
                Return to Treasury
              </button>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}