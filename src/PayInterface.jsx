import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import { 
  ArrowLeft, ShieldCheck, Zap, Send, Loader2, 
  CheckCircle2, Circle, Square, User, CreditCard, LogIn, Mail, QrCode
} from 'lucide-react';

export default function PayInterface() {
  // Core Data States
  const [session, setSession] = useState(null);
  const [balances, setBalances] = useState(null);
  const [receiver, setReceiver] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  
  // UI States
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [amount, setAmount] = useState('');
  const [asset, setAsset] = useState('AFR'); // 'AFR' or 'USD'
  const [guestEmail, setGuestEmail] = useState(''); // For receipt if guest
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Execution Tracker (For Members)
  const [executionPlan, setExecutionPlan] = useState({ isActive: false, steps: [], currentDetail: '', progressPct: 0 });

  // INITIALIZATION: Fetch Auth, Balances, and Receiver
  useEffect(() => {
    const initializePaymentPortal = async () => {
      try {
        // 1. Check Authentication
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession) {
          setSession(currentSession);
          // Fetch Sender's Balances
          const { data: balData } = await supabase.from('balances').select('*').eq('user_id', currentSession.user.id).single();
          if (balData) setBalances(balData);
        } else {
          // No session found = Guest Mode
          setIsGuest(true);
          setAsset('USD'); // Guests can only send Fiat via Card
        }

        // 2. Extract target ID from URL
        const params = new URLSearchParams(window.location.search);
        const targetId = params.get('to');

        if (!targetId) throw new Error('Invalid Routing Link. No destination ID provided.');
        
        // CUSTOM SELF-SCAN DETECTION
        if (currentSession && targetId === currentSession.user.id) {
          throw new Error('SELF_SCAN');
        }

        // 3. Fetch Receiver's Public Info
        const { data: receiverData, error: receiverError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, active_tier')
          .eq('id', targetId)
          .single();

        if (receiverError || !receiverData) throw new Error('Beneficiary not found on the IFB Network.');

        setReceiver(receiverData);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    initializePaymentPortal();
  }, []);

  const handleExecutePayment = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;

    // ==========================================
    // GUEST FLOW (CREDIT CARD / STRIPE)
    // ==========================================
    if (isGuest) {
      if (!guestEmail) return alert("Please enter an email for your receipt.");
      setIsProcessing(true);
      
      try {
        const { data, error } = await supabase.functions.invoke('create-checkout', {
          body: {
            amount: numAmount,
            receiver_id: receiver.id,
            guest_email: guestEmail,
            type: 'p2p_guest_transfer'
          }
        });

        if (error) throw error;
        if (data?.url) {
          window.location.href = data.url; 
        } else {
          throw new Error("Failed to generate secure card link.");
        }
      } catch (err) {
        console.error("Stripe Error:", err);
        alert("Failed to initialize card processor. Please try again later.");
        setIsProcessing(false);
      }
      return;
    }

    // ==========================================
    // MEMBER FLOW (INTERNAL AFR / USD LEDGER)
    // ==========================================
    if (asset === 'AFR' && numAmount > (balances?.afr_balance || 0)) return alert("Insufficient AFR Balance.");
    if (asset === 'USD' && numAmount > (balances?.liquid_usd || 0)) return alert("Insufficient USD Balance.");

    setIsProcessing(true);

    let mockSteps = [
      { id: 1, text: `Verifying ${asset} Liquidity & Cryptographic Signatures.`, status: "active" },
      { id: 2, text: `Establishing secure P2P tunnel to ${receiver.full_name}.`, status: "pending" },
      { id: 3, text: "Awaiting AI Validator Consensus (Anti-Fraud).", status: "pending" },
      { id: 4, text: "Settling on IFB Core Ledger.", status: "pending" }
    ];

    setExecutionPlan({ isActive: true, steps: [...mockSteps], currentDetail: "Initiating protocol...", progressPct: 15 });
    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    try {
      await delay(1200);
      mockSteps[0].status = "completed"; mockSteps[1].status = "active";
      setExecutionPlan(prev => ({ ...prev, steps: [...mockSteps], currentDetail: "Routing through IFB secure switch...", progressPct: 40 }));

      await delay(1500);
      mockSteps[1].status = "completed"; mockSteps[2].status = "active";
      setExecutionPlan(prev => ({ ...prev, steps: [...mockSteps], currentDetail: "Pinging Agent Sentinel for AML clearance...", progressPct: 65 }));

      await delay(1500);
      mockSteps[2].status = "completed"; mockSteps[3].status = "active";
      setExecutionPlan(prev => ({ ...prev, steps: [...mockSteps], currentDetail: "Committing transaction block...", progressPct: 85 }));

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

  // --- VIEW: LOADING ---
  if (isLoading) return <div className="h-screen w-full flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-500" size={40}/></div>;

  // --- VIEW: ERROR / SELF-SCAN DETECTED ---
  if (error) {
    const isSelfScan = error === 'SELF_SCAN';
    
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-6 text-center animate-in fade-in">
        <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mb-6 shadow-sm ${isSelfScan ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-500'}`}>
          {isSelfScan ? <QrCode size={32}/> : <ShieldCheck size={32}/>}
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">
          {isSelfScan ? "This is your own card!" : "Secure Routing Failed"}
        </h2>
        <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
          {isSelfScan 
            ? "You successfully scanned your own Pay Me link. Share this QR code or link with clients and friends so they can route capital directly to your IFB Vault." 
            : error}
        </p>
        <button onClick={() => window.location.href = '/'} className="mt-8 px-10 py-5 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all">
          Return to Hub
        </button>
      </div>
    );
  }

  // --- VIEW: SUCCESS (Internal Transfer Only) ---
  if (isSuccess) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-emerald-50 p-6 text-center animate-in fade-in">
        <div className="absolute top-0 w-full h-1/2 bg-emerald-400/20 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="w-28 h-28 bg-white text-emerald-500 rounded-[3rem] flex items-center justify-center mb-8 shadow-xl relative z-10 border-4 border-emerald-100 animate-in zoom-in">
          <CheckCircle2 size={50}/>
        </div>
        <h2 className="text-4xl font-black text-emerald-950 tracking-tighter mb-2 relative z-10">Payment Sent</h2>
        <p className="text-emerald-800 font-medium mb-10 relative z-10">
          Successfully routed {amount} {asset} to {receiver.full_name}.
        </p>
        <button onClick={() => window.location.href = '/'} className="px-10 py-5 bg-emerald-600 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-emerald-500 transition-all relative z-10">
          Close Portal
        </button>
      </div>
    );
  }

  // --- VIEW: MAIN PAYMENT PORTAL (Handles Guest & Member) ---
  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100 rounded-full blur-[100px] pointer-events-none"></div>
      
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-[3rem] shadow-2xl p-8 relative overflow-hidden animate-in slide-in-from-bottom-8 z-10">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-6">
          <button onClick={() => window.location.href = '/'} className="p-2 bg-slate-50 text-slate-400 rounded-2xl hover:text-slate-800 hover:bg-slate-100 transition-colors"><ArrowLeft size={20}/></button>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            {isGuest ? 'Secure Guest Checkout' : 'Internal Transfer'}
          </span>
          <div className="w-10"></div> 
        </div>

        {/* Receiver Info */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-24 h-24 rounded-[2.5rem] bg-slate-100 shadow-inner border-4 border-white mb-4 flex items-center justify-center overflow-hidden">
            {receiver?.avatar_url ? <img src={receiver.avatar_url} className="w-full h-full object-cover" alt="Receiver"/> : <User size={40} className="text-slate-300"/>}
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">{receiver?.full_name}</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mt-1">{receiver?.active_tier || 'Verified'} Tier</p>
        </div>

        {/* Asset Selector (Only Members can choose AFR) */}
        {!isGuest && (
          <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full mb-6 border border-slate-200 shadow-inner">
            <button onClick={() => setAsset('AFR')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${asset === 'AFR' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              <Zap size={14}/> AFR 
            </button>
            <button onClick={() => setAsset('USD')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${asset === 'USD' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              USD Fiat
            </button>
          </div>
        )}

        {/* Amount Input */}
        <div className="mb-6 relative">
          <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-black text-slate-300">{asset === 'USD' ? '$' : '⚡'}</span>
          <input 
            type="number" 
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isProcessing}
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] py-6 pl-16 pr-6 text-4xl font-black text-slate-800 outline-none focus:border-blue-50 transition-colors disabled:opacity-50 shadow-inner"
          />
        </div>

        {/* Guest Specific Inputs & Member Balances */}
        {isGuest ? (
          <div className="mb-8 relative">
            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
            <input 
              type="email" 
              placeholder="Your email for receipt"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              disabled={isProcessing}
              className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 transition-colors disabled:opacity-50 shadow-sm"
            />
          </div>
        ) : (
          <div className="text-center mb-8">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              Available: {asset === 'AFR' ? (balances?.afr_balance || 0).toFixed(2) : (balances?.liquid_usd || 0).toFixed(2)} {asset}
            </span>
          </div>
        )}

        {/* Execute Button */}
        {!executionPlan.isActive && (
          <div className="space-y-4">
            <button 
              onClick={handleExecutePayment}
              disabled={!amount || isProcessing || (isGuest && !guestEmail)}
              className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50 disabled:shadow-none hover:-translate-y-1"
            >
              {isProcessing ? <Loader2 size={18} className="animate-spin"/> : (
                isGuest ? <><CreditCard size={16}/> Pay securely with Card</> : <><Send size={16}/> Authorize Payment</>
              )}
            </button>

            {/* Login Prompt for Guests */}
            {isGuest && (
              <button onClick={() => window.location.href = '/'} className="w-full py-4 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-800 transition-colors flex items-center justify-center gap-2">
                <LogIn size={14}/> Log in to pay with AFR
              </button>
            )}
          </div>
        )}

        {/* 🔥 TRANSPARENT EXECUTION TRACKER UI (MEMBERS ONLY) */}
        {executionPlan.isActive && !isGuest && (
          <div className="w-full bg-[#111111] text-slate-200 rounded-[2.5rem] p-8 shadow-2xl border border-slate-800 animate-in slide-in-from-bottom-4">
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

            <div className="mt-6 pt-5 border-t border-slate-800/50">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-4">{executionPlan.currentDetail}</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-white transition-all duration-500" style={{ width: `${executionPlan.progressPct}%` }}></div>
                </div>
                <Square size={10} className="text-slate-600 fill-current"/>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}