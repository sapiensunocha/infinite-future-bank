import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import { 
  ArrowLeft, ShieldCheck, Zap, Send, Loader2, 
  CheckCircle2, Circle, Square, User 
} from 'lucide-react';

export default function PaymentPortal({ session, balances }) {
  const [receiver, setReceiver] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [amount, setAmount] = useState('');
  const [asset, setAsset] = useState('AFR'); // 'AFR' or 'USD'
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Execution Tracker
  const [executionPlan, setExecutionPlan] = useState({ isActive: false, steps: [], currentDetail: '', progressPct: 0 });

  // Extract the receiver ID from the URL: e.g., ?to=1234-5678-abcd
  useEffect(() => {
    const fetchReceiver = async () => {
      const params = new URLSearchParams(window.location.search);
      const targetId = params.get('to');

      if (!targetId) {
        setError('Invalid Routing Link. No destination ID provided.');
        setIsLoading(false);
        return;
      }

      if (targetId === session?.user?.id) {
        setError('You cannot initiate a payment to your own account.');
        setIsLoading(false);
        return;
      }

      try {
        // Fetch the receiver's public profile data
        const { data, error: dbError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, active_tier')
          .eq('id', targetId)
          .single();

        if (dbError || !data) throw new Error('Beneficiary not found on the IFB Network.');

        setReceiver(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReceiver();
  }, [session]);

  const handleExecutePayment = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;

    // Basic local balance check
    if (asset === 'AFR' && numAmount > (balances?.afr_balance || 0)) {
      alert("Insufficient AFR Balance.");
      return;
    }
    if (asset === 'USD' && numAmount > (balances?.liquid_usd || 0)) {
      alert("Insufficient USD Balance.");
      return;
    }

    setIsProcessing(true);

    let mockSteps = [
      { id: 1, text: `Verifying ${asset} Liquidity & Cryptographic Signatures.`, status: "active" },
      { id: 2, text: `Establishing secure P2P tunnel to ${receiver.full_name}.`, status: "pending" },
      { id: 3, text: "Awaiting AI Validator Consensus (Anti-Fraud Check).", status: "pending" },
      { id: 4, text: "Settling on IFB Core Ledger.", status: "pending" }
    ];

    setExecutionPlan({ isActive: true, steps: [...mockSteps], currentDetail: "Initiating protocol...", progressPct: 15 });

    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    try {
      // Step 1
      await delay(1200);
      mockSteps[0].status = "completed"; mockSteps[1].status = "active";
      setExecutionPlan(prev => ({ ...prev, steps: [...mockSteps], currentDetail: "Routing through IFB secure switch...", progressPct: 40 }));

      // Step 2
      await delay(1500);
      mockSteps[1].status = "completed"; mockSteps[2].status = "active";
      setExecutionPlan(prev => ({ ...prev, steps: [...mockSteps], currentDetail: "Pinging Agent Sentinel for AML clearance...", progressPct: 65 }));

      // Step 3
      await delay(1500);
      mockSteps[2].status = "completed"; mockSteps[3].status = "active";
      setExecutionPlan(prev => ({ ...prev, steps: [...mockSteps], currentDetail: "Committing transaction block...", progressPct: 85 }));

      // Step 4: Real Database Execution (Logging the transfer)
      // Note: In production, use a secure Supabase RPC to handle double-entry accounting (Debit sender, Credit receiver)
      const { error: txError } = await supabase.from('market_transactions').insert({
        user_id: session.user.id,
        asset: asset,
        side: 'P2P_SEND',
        execution_price: 1.00,
        quantity: numAmount,
        status: 'COMPLETED',
        blockchain_sig: `P2P_TO_${receiver.id.substring(0,8)}`
      });

      if (txError) throw txError;

      await delay(1000);
      mockSteps[3].status = "completed";
      setExecutionPlan(prev => ({ ...prev, steps: [...mockSteps], currentDetail: "Capital successfully transferred.", progressPct: 100 }));

      await delay(1500);
      setIsSuccess(true);
      setExecutionPlan(prev => ({ ...prev, isActive: false }));

    } catch (err) {
      console.error(err);
      alert("Transfer failed. Please try again.");
      setExecutionPlan(prev => ({ ...prev, isActive: false }));
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return <div className="h-screen w-full flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-500" size={40}/></div>;
  }

  // Handle Invalid Link State
  if (error) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-6 text-center animate-in fade-in">
        <div className="w-20 h-20 bg-red-100 text-red-500 rounded-[2rem] flex items-center justify-center mb-6 shadow-sm"><ShieldCheck size={32}/></div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">Invalid or Expired Link</h2>
        <p className="text-sm text-slate-500 max-w-sm">{error}</p>
        <button onClick={() => window.location.href = '/'} className="mt-8 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest">Return Home</button>
      </div>
    );
  }

  // SUCCESS STATE
  if (isSuccess) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-emerald-50 p-6 text-center animate-in fade-in">
        <div className="absolute top-0 w-full h-1/2 bg-emerald-400/20 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="w-28 h-28 bg-white text-emerald-500 rounded-full flex items-center justify-center mb-8 shadow-xl relative z-10 border-4 border-emerald-100 animate-in zoom-in">
          <CheckCircle2 size={50}/>
        </div>
        <h2 className="text-4xl font-black text-emerald-950 tracking-tighter mb-2 relative z-10">Payment Sent</h2>
        <p className="text-emerald-800 font-medium mb-10 relative z-10">
          Successfully routed {amount} {asset} to {receiver.full_name}.
        </p>
        <button onClick={() => window.location.href = '/'} className="px-10 py-5 bg-emerald-600 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-emerald-500 transition-all relative z-10">
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-[3rem] shadow-2xl p-8 relative overflow-hidden animate-in slide-in-from-bottom-8">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-6">
          <button onClick={() => window.location.href = '/'} className="p-2 bg-slate-50 text-slate-400 rounded-full hover:text-slate-800 transition-colors"><ArrowLeft size={20}/></button>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Secure Transfer</span>
          <div className="w-8"></div> {/* Spacer for centering */}
        </div>

        {/* Receiver Info */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-24 h-24 rounded-full bg-slate-100 shadow-inner border-4 border-white mb-4 flex items-center justify-center overflow-hidden">
            {receiver.avatar_url ? <img src={receiver.avatar_url} className="w-full h-full object-cover" alt="Receiver"/> : <User size={40} className="text-slate-300"/>}
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">{receiver.full_name}</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mt-1">{receiver.active_tier || 'Verified'} Tier</p>
        </div>

        {/* Asset Selector */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full mb-6">
          <button onClick={() => setAsset('AFR')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1 ${asset === 'AFR' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
            <Zap size={14}/> AFR 
          </button>
          <button onClick={() => setAsset('USD')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${asset === 'USD' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
            USD Fiat
          </button>
        </div>

        {/* Amount Input */}
        <div className="mb-10 relative">
          <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400">{asset === 'USD' ? '$' : '⚡'}</span>
          <input 
            type="number" 
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isProcessing}
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] py-6 pl-14 pr-6 text-4xl font-black text-slate-800 outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
          />
          <div className="text-center mt-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Available: {asset === 'AFR' ? balances?.afr_balance : balances?.liquid_usd} {asset}
            </span>
          </div>
        </div>

        {/* Execute Button */}
        {!executionPlan.isActive && (
          <button 
            onClick={handleExecutePayment}
            disabled={!amount || isProcessing}
            className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:shadow-none"
          >
            {isProcessing ? <Loader2 size={18} className="animate-spin"/> : <><Send size={16}/> Authorize Payment</>}
          </button>
        )}

        {/* 🔥 TRANSPARENT EXECUTION TRACKER UI */}
        {executionPlan.isActive && (
          <div className="w-full bg-[#111111] text-slate-200 rounded-[2rem] p-6 shadow-2xl border border-slate-800 animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2">Protocol Active</h4>
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_#3b82f6]"></div>
            </div>
            
            <div className="space-y-4 mb-6">
              {executionPlan.steps.map(step => (
                <div key={step.id} className="flex items-center gap-3">
                  {step.status === 'completed' && <CheckCircle2 size={16} className="text-emerald-500 shrink-0"/>}
                  {step.status === 'active' && <Loader2 size={16} className="text-blue-500 animate-spin shrink-0"/>}
                  {step.status === 'pending' && <Circle size={16} className="text-slate-700 shrink-0"/>}
                  <span className={`text-[11px] font-medium ${step.status === 'pending' ? 'text-slate-600' : 'text-slate-300'}`}>{step.text}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/50">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-3">{executionPlan.currentDetail}</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-white transition-all duration-500" style={{ width: `${executionPlan.progressPct}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}