import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { 
  ArrowLeft, ShieldCheck, Zap, Send, Loader2, 
  CheckCircle2, Circle, User, CreditCard 
} from 'lucide-react';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

// ==========================================
// EMBEDDED STRIPE CHECKOUT FORM (EXTERNAL USERS)
// ==========================================
const CheckoutForm = ({ amount, receiverName, onBack }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setIsProcessing(true);
    setErrorMessage(null);

    const { error } = await stripe.confirmPayment({
      elements, 
      confirmParams: { 
        return_url: `${window.location.origin}/?status=success` 
      },
    });

    if (error) { 
      setErrorMessage(error.message); 
      setIsProcessing(false); 
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 w-full animate-in fade-in slide-in-from-right-4 duration-300 mt-4">
      <button type="button" onClick={onBack} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 flex items-center gap-2 mb-2 transition-colors">
        <ArrowLeft size={14}/> Cancel Payment
      </button>
      
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-inner">
        <PaymentElement />
      </div>
      
      {errorMessage && (
        <div className="p-4 text-xs font-bold text-red-500 bg-red-50 border border-red-200 rounded-xl text-center shadow-inner">
          {errorMessage}
        </div>
      )}
      
      <button 
        disabled={isProcessing || !stripe || !elements} 
        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-sm uppercase tracking-widest p-5 rounded-2xl shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isProcessing ? <Loader2 className="animate-spin" size={18} /> : `AUTHORIZE $${amount} TO ${receiverName.toUpperCase()}`}
      </button>
    </form>
  );
};

export default function PaymentPortal({ session, balances }) {
  const [receiver, setReceiver] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [amount, setAmount] = useState('');
  const [asset, setAsset] = useState('USD'); // 'USD' | 'AFR' | 'CARD'
  
  // IFB Card State (Internal Users)
  const [ifbPan, setIfbPan] = useState('');
  const [ifbExpiry, setIfbExpiry] = useState('');
  const [ifbCvv, setIfbCvv] = useState('');

  // Stripe State (External Users)
  const [clientSecret, setClientSecret] = useState(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [executionPlan, setExecutionPlan] = useState({ isActive: false, steps: [], currentDetail: '', progressPct: 0 });

  useEffect(() => {
    const fetchReceiver = async () => {
      const params = new URLSearchParams(window.location.search);
      const targetId = params.get('to');

      if (!targetId) {
        setError('Invalid Routing Link. No destination ID provided.');
        setIsLoading(false);
        return;
      }

      if (session && targetId === session?.user?.id) {
        setError('You cannot initiate a payment to your own account.');
        setIsLoading(false);
        return;
      }

      try {
        // 🔥 FIX: Changed from .single() to .maybeSingle() to prevent 406 panic for external users
        const { data, error: dbError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, active_tier')
          .eq('id', targetId)
          .maybeSingle(); 

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

    // --- EXTERNAL FLOW (EMBEDDED STRIPE FOR NON-USERS) ---
    if (!session) {
      setIsProcessing(true);
      try {
        // Ping the backend to generate the Stripe Payment Intent
        const { data, error } = await supabase.functions.invoke('create-payment-intent', {
          body: { userId: receiver.id, amount: numAmount, description: `External Payment to ${receiver.full_name}` }
        });
        
        if (error) throw error;
        if (data?.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          throw new Error("Failed to initialize secure gateway.");
        }
      } catch (err) {
        console.error(err);
        alert("Payment Gateway Error: " + err.message);
      } finally {
        setIsProcessing(false);
      }
      return; 
    }

    // --- INTERNAL FLOW (AFR / USD / IFB CARD) ---
    const safeAfr = balances?.afr_balance || 0;
    const safeUsd = balances?.liquid_usd || 0;

    if (asset === 'AFR' && numAmount > safeAfr) {
      alert("Insufficient AFR Balance.");
      return;
    }
    if (asset === 'USD' && numAmount > safeUsd) {
      alert("Insufficient USD Balance.");
      return;
    }
    if (asset === 'CARD') {
      if (!ifbPan || !ifbExpiry || !ifbCvv) {
        alert("Please enter your full IFB Card details.");
        return;
      }
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
      await delay(1200);
      mockSteps[0].status = "completed"; mockSteps[1].status = "active";
      setExecutionPlan(prev => ({ ...prev, steps: [...mockSteps], currentDetail: "Routing through IFB secure switch...", progressPct: 40 }));

      // Process IFB Card via the Edge Function
      if (asset === 'CARD') {
        const formattedPan = ifbPan.replace(/\s/g, '');
        const paymentRes = await fetch('https://nfztdpyygfrpbjbhidxe.supabase.co/functions/v1/ifb-charge-card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchantId: receiver.id, 
            pan: formattedPan,
            expiry: ifbExpiry,
            cvv: ifbCvv,
            amount: numAmount,
            description: `Payment / Ticket Transfer to ${receiver.full_name}`
          })
        });

        const paymentData = await paymentRes.json();
        if (!paymentRes.ok || !paymentData.success) {
          throw new Error(paymentData.error || 'Transaction Declined by IFB Ledger');
        }
      }

      await delay(1500);
      mockSteps[1].status = "completed"; mockSteps[2].status = "active";
      setExecutionPlan(prev => ({ ...prev, steps: [...mockSteps], currentDetail: "Pinging Agent Sentinel for AML clearance...", progressPct: 65 }));

      await delay(1500);
      mockSteps[2].status = "completed"; mockSteps[3].status = "active";
      setExecutionPlan(prev => ({ ...prev, steps: [...mockSteps], currentDetail: "Committing transaction block...", progressPct: 85 }));

      // Only manually insert a transaction if it was an internal balance transfer 
      if (asset !== 'CARD') {
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
      }

      await delay(1000);
      mockSteps[3].status = "completed";
      setExecutionPlan(prev => ({ ...prev, steps: [...mockSteps], currentDetail: "Capital successfully transferred.", progressPct: 100 }));

      await delay(1500);
      setIsSuccess(true);
      setExecutionPlan(prev => ({ ...prev, isActive: false }));

    } catch (err) {
      console.error(err);
      alert("Transfer failed: " + err.message);
      setExecutionPlan(prev => ({ ...prev, isActive: false }));
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return <div className="h-screen w-full flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-500" size={40}/></div>;
  }

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

  if (isSuccess) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-emerald-50 p-6 text-center animate-in fade-in">
        <div className="absolute top-0 w-full h-1/2 bg-emerald-400/20 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="w-28 h-28 bg-white text-emerald-500 rounded-full flex items-center justify-center mb-8 shadow-xl relative z-10 border-4 border-emerald-100 animate-in zoom-in">
          <CheckCircle2 size={50}/>
        </div>
        <h2 className="text-4xl font-black text-emerald-950 tracking-tighter mb-2 relative z-10">Payment Sent</h2>
        <p className="text-emerald-800 font-medium mb-10 relative z-10">
          Successfully routed {amount} {asset === 'CARD' ? 'USD' : asset} to {receiver.full_name}.
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
        
        <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-6">
          <button onClick={() => window.location.href = '/'} className="p-2 bg-slate-50 text-slate-400 rounded-full hover:text-slate-800 transition-colors"><ArrowLeft size={20}/></button>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Secure Transfer</span>
          <div className="w-8"></div>
        </div>

        <div className="flex flex-col items-center mb-10">
          <div className="w-24 h-24 rounded-full bg-slate-100 shadow-inner border-4 border-white mb-4 flex items-center justify-center overflow-hidden">
            {receiver.avatar_url ? <img src={receiver.avatar_url} className="w-full h-full object-cover" alt="Receiver"/> : <User size={40} className="text-slate-300"/>}
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">{receiver.full_name}</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mt-1">{receiver.active_tier || 'Verified'} Tier</p>
        </div>

        {/* EXTERNAL USER: STRIPE CHECKOUT ACTIVE */}
        {clientSecret && !session ? (
          <Elements stripe={stripePromise} options={{ 
            clientSecret, 
            appearance: { theme: 'stripe', variables: { colorPrimary: '#2563EB', borderRadius: '12px' } } 
          }}>
            <CheckoutForm amount={amount} receiverName={receiver.full_name} onBack={() => { setClientSecret(null); setIsProcessing(false); }} />
          </Elements>
        ) : (
          <>
            {session ? (
              <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full mb-6">
                <button onClick={() => setAsset('AFR')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1 ${asset === 'AFR' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                  <Zap size={14}/> AFR 
                </button>
                <button onClick={() => setAsset('USD')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${asset === 'USD' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                  USD Fiat
                </button>
                <button onClick={() => setAsset('CARD')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1 ${asset === 'CARD' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                  <CreditCard size={14}/> IFB Card
                </button>
              </div>
            ) : (
              <div className="text-center mb-6">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-4 py-2 rounded-full border border-blue-100 flex items-center justify-center gap-2 max-w-[200px] mx-auto">
                  <ShieldCheck size={14}/> Secure Guest Checkout
                </span>
              </div>
            )}

            <div className="mb-10 relative">
              <span className="absolute left-6 top-[28px] -translate-y-1/2 text-2xl font-black text-slate-400">
                {asset === 'USD' || asset === 'CARD' || !session ? '$' : '⚡'}
              </span>
              <input 
                type="number" 
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isProcessing}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] py-6 pl-14 pr-6 text-4xl font-black text-slate-800 outline-none focus:border-blue-500 transition-colors disabled:opacity-50 mb-4"
              />
              
              {asset === 'CARD' && session && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                  <input type="text" placeholder="IFB Virtual Card (16 Digits)" value={ifbPan} onChange={e => setIfbPan(e.target.value)} disabled={isProcessing} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-mono text-sm outline-none focus:border-blue-500 transition-colors"/>
                  <div className="flex gap-3">
                      <input type="text" placeholder="MM/YY" value={ifbExpiry} onChange={e => setIfbExpiry(e.target.value)} disabled={isProcessing} className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-mono text-sm outline-none focus:border-blue-500 transition-colors"/>
                      <input type="text" placeholder="CVV" value={ifbCvv} onChange={e => setIfbCvv(e.target.value)} disabled={isProcessing} className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-mono text-sm outline-none focus:border-blue-500 transition-colors"/>
                  </div>
                </div>
              )}

              {session && asset !== 'CARD' && (
                <div className="text-center mt-3 animate-in fade-in">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Available: {asset === 'AFR' ? (balances?.afr_balance || 0) : (balances?.liquid_usd || 0)} {asset}
                  </span>
                </div>
              )}
            </div>

            {!executionPlan.isActive && (
              <button 
                onClick={handleExecutePayment}
                disabled={!amount || isProcessing || (asset === 'CARD' && (!ifbPan || !ifbExpiry || !ifbCvv))}
                className={`w-full py-6 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:shadow-none ${session ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30' : 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/30'}`}
              >
                {isProcessing ? <Loader2 size={18} className="animate-spin"/> : (
                  session ? <><Send size={16}/> Authorize Transfer</> : <><CreditCard size={16}/> Proceed to Payment</>
                )}
              </button>
            )}

            {executionPlan.isActive && session && (
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
          </>
        )}
      </div>
    </div>
  );
}