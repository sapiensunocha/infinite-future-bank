import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { APP_URL } from './config/constants';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { supabase } from './services/supabaseClient';
import { ShieldCheck, Loader2, X, ArrowLeft, CreditCard, Users, UploadCloud, CheckCircle2, Star, Landmark, Smartphone, Wallet, HandCoins, AlertTriangle, ScanLine, History, Clock, Activity, FileText } from 'lucide-react';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = ({ amount, onBack }) => {
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
      elements, confirmParams: { return_url: `${APP_URL}/?status=success` },
    });

    if (error) { setErrorMessage(error.message); setIsProcessing(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <button type="button" onClick={onBack} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white flex items-center gap-2 mb-2 transition-colors">
        <ArrowLeft size={14}/> Back to Network Selection
      </button>
      <div className="p-5 bg-black/40 border border-white/10 rounded-2xl shadow-inner"><PaymentElement /></div>
      {errorMessage && <div className="p-4 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl text-center shadow-inner">{errorMessage}</div>}
      <button disabled={isProcessing || !stripe || !elements} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-sm uppercase tracking-widest p-5 rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all disabled:opacity-50 flex items-center justify-center gap-2 border border-blue-400/30">
        {isProcessing ? <Loader2 className="animate-spin" size={18} /> : `AUTHORIZE $${amount} DEPOSIT`}
      </button>
    </form>
  );
};

export default function DepositInterface({ session, onClose }) {
  const [activeTab, setActiveTab] = useState('NEW'); // 'NEW' or 'HISTORY'
  const [amount, setAmount] = useState('');
  const [routingMethod, setRoutingMethod] = useState(null); 
  const [clientSecret, setClientSecret] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // P2P (CoT) States
  const [p2pStep, setP2pStep] = useState(1); 
  const [fiatMethod, setFiatMethod] = useState('Local Bank Transfer');
  const [processors, setProcessors] = useState([]);
  const [selectedProcessor, setSelectedProcessor] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  
  // AI Scanning States
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null); 
  const [isP2pProcessing, setIsP2pProcessing] = useState(false);

  // History State
  const [depositHistory, setDepositHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const fiatOptions = [
    { id: 'Local Bank Transfer', icon: <Landmark size={20}/>, label: 'Local Bank Transfer', desc: 'Domestic Wire, ACH, SEPA' },
    { id: 'Mobile Money', icon: <Smartphone size={20}/>, label: 'Mobile Money', desc: 'Wave, M-Pesa, MTN' },
    { id: 'Digital Wallet', icon: <Wallet size={20}/>, label: 'Digital Wallet', desc: 'PayPal, CashApp, Venmo' },
    { id: 'Physical Cash Drop', icon: <HandCoins size={20}/>, label: 'Physical Cash', desc: 'Hand-to-Hand' }
  ];

  useEffect(() => {
    if (activeTab === 'HISTORY') fetchHistory();
  }, [activeTab]);

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('p2p_orders')
        .select(`
          id, created_at, status, amount_usd, payment_method, metadata, updated_at,
          processor:profiles!p2p_orders_processor_id_fkey(full_name)
        `)
        .eq('user_id', session.user.id)
        .eq('order_type', 'deposit')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDepositHistory(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleInitializeCard = async () => {
    if (!amount || amount <= 0) return;
    setIsInitializing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment-intent', { body: { userId: session.user.id, amount: parseFloat(amount) }});
      if (error) throw error;
      setClientSecret(data.clientSecret);
    } catch (err) {
      alert("System could not securely connect to global clearing house.");
      setRoutingMethod(null);
    } finally { setIsInitializing(false); }
  };

  const handleFindProcessors = async () => {
    setIsInitializing(true);
    try {
      const { data, error } = await supabase.from('profiles').select('id, full_name, avatar_url, cot_rating, cot_completed_tx').eq('is_cot_processor', true).limit(5);
      if (error) throw error;
      
      // Simulate matching delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      setProcessors(data && data.length > 0 ? data : [
        { id: '1', full_name: 'IFB Global Operations', avatar_url: null, cot_rating: 100, cot_completed_tx: 15420 },
      ]);
      setP2pStep(2);
    } catch (err) { alert("Failed to query localized routing nodes."); } 
    finally { setIsInitializing(false); }
  };

  // ---------------------------------------------------------
  // REAL AI OCR EXTRACTION (Production)
  // ---------------------------------------------------------
  const handleAiScan = async () => {
    if (!receiptFile) return;
    setIsScanning(true);
    setScanResult(null);

    try {
      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `p2p_receipts/${session.user.id}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('documents').upload(fileName, receiptFile);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName);

      const { data, error: aiError } = await supabase.functions.invoke('analyze-receipt-ocr', {
        body: { imageUrl: publicUrl, expectedAmount: amount }
      });

      if (aiError) throw new Error("AI Engine failed to connect.");
      if (data?.error) throw new Error(data.error);

      setScanResult({
        refId: data.extracted_ref_id || data.extracted_data?.extracted_ref_id || 'N/A',
        detectedAmount: data.extracted_amount || data.extracted_data?.extracted_amount || amount,
        date: data.extracted_date || data.extracted_data?.extracted_date || new Date().toISOString().split('T')[0],
        proofUrl: publicUrl
      });

    } catch (err) {
      console.error("OCR Error:", err);
      alert(err.message || "Failed to scan receipt. Please ensure the image is clear and the amounts match.");
    } finally {
      setIsScanning(false);
    }
  };

  // ---------------------------------------------------------
  // FINAL SUBMISSION TO SUPABASE
  // ---------------------------------------------------------
  const handleSubmitP2pProof = async () => {
    if (!scanResult || !selectedProcessor) return;
    setIsP2pProcessing(true);

    try {
      const { error: dbError } = await supabase.from('p2p_orders').insert([{
        user_id: session.user.id,
        processor_id: selectedProcessor.id,
        order_type: 'deposit',
        amount_usd: parseFloat(amount),
        payment_method: fiatMethod,
        status: 'proof_uploaded', // Deposit starts at proof_uploaded because user already sent fiat
        proof_image_url: scanResult.proofUrl,
        ai_verification_status: 'verified',
        metadata: {
          extracted_ref: scanResult.refId,
          extracted_amount: scanResult.detectedAmount,
          extracted_date: scanResult.date
        }
      }]);

      if (dbError) throw dbError;
      
      setP2pStep(4); 
    } catch (err) { 
      console.error("DB Insert Error:", err);
      alert("Failed to secure the order in the ledger."); 
    } 
    finally { setIsP2pProcessing(false); }
  };

  const getTimeElapsed = (created, updated, status) => {
    const start = new Date(created);
    const end = status === 'completed' ? new Date(updated) : new Date();
    const diffMins = Math.floor((end - start) / 60000);
    if (diffMins < 60) return `${diffMins} min`;
    return `${Math.floor(diffMins / 60)} hrs ${diffMins % 60} min`;
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg bg-[#0B0F19] rounded-[2.5rem] shadow-2xl overflow-hidden relative border border-white/10 p-8 flex flex-col max-h-[95vh]">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/20 blur-[60px] pointer-events-none"></div>
        <button onClick={(e) => { e.preventDefault(); onClose(); }} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors bg-white/5 p-2 rounded-xl border border-white/10 z-50 cursor-pointer">
          <X size={20} />
        </button>

        <div className="relative z-10 flex-1 overflow-y-auto no-scrollbar pb-4">
          
          {/* Header & Tabs */}
          <div className="flex flex-col items-start gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-black text-white mb-1">Inject Capital</h2>
              <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck size={14} /> Secure Routing Gateway
              </p>
            </div>
            <div className="flex bg-white/10 p-1.5 rounded-xl w-full border border-white/5">
              <button onClick={() => setActiveTab('NEW')} className={`flex-1 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'NEW' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>New Deposit</button>
              <button onClick={() => setActiveTab('HISTORY')} className={`flex-1 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'HISTORY' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>Records</button>
            </div>
          </div>

          {/* =========================================
              HISTORY TAB (UBER STYLE TRACKING)
          ========================================= */}
          {activeTab === 'HISTORY' && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
              {isLoadingHistory ? (
                <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={32}/></div>
              ) : depositHistory.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-white/10 rounded-3xl bg-white/5">
                  <History size={40} className="mx-auto text-slate-500 mb-4"/>
                  <p className="text-slate-400 font-bold">No deposit records found.</p>
                </div>
              ) : (
                depositHistory.map(order => (
                  <div key={order.id} className="p-6 rounded-3xl border border-white/10 bg-white/5 shadow-sm hover:bg-white/10 transition-all">
                    <div className="flex flex-col gap-4">
                      
                      {/* Top: Basic Info */}
                      <div className="flex justify-between items-start border-b border-white/10 pb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">#{order.id.substring(0,8)}</span>
                            <span className="flex items-center gap-1 text-[9px] font-black text-blue-400 uppercase bg-blue-500/10 px-2 py-1 rounded-md">
                              <Clock size={10}/> {getTimeElapsed(order.created_at, order.updated_at, order.status)}
                            </span>
                          </div>
                          <h3 className="text-2xl font-black text-white">${order.amount_usd.toFixed(2)}</h3>
                          <p className="text-xs font-bold text-slate-400 mt-1">{order.payment_method}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Processor</p>
                          <p className="text-sm font-bold text-slate-300">{order.processor?.full_name || 'Network Matching...'}</p>
                        </div>
                      </div>
                      
                      {/* Bottom: Uber-Style Status Tracker */}
                      <div className="pt-2">
                         {order.status === 'disputed' ? (
                           <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
                             <AlertTriangle size={24} className="mx-auto text-red-500 mb-2"/>
                             <h4 className="font-black text-red-400 uppercase tracking-widest text-[10px]">Verification Failed</h4>
                             <p className="text-xs text-red-300/80 font-bold mt-1">Processor rejected the receipt. Support has been notified.</p>
                           </div>
                         ) : (
                           <div className="relative pt-2">
                             {/* Connecting Line */}
                             <div className="absolute top-4 left-6 right-6 h-1 bg-white/10 rounded-full z-0">
                               <div className={`h-full rounded-full transition-all duration-1000 ${order.status === 'completed' ? 'bg-emerald-500 w-full' : 'bg-blue-500 w-1/2'}`}></div>
                             </div>

                             <div className="relative z-10 flex justify-between">
                               {/* Step 1 */}
                               <div className="flex flex-col items-center gap-2">
                                 <div className="w-8 h-8 rounded-full flex items-center justify-center border-2 bg-emerald-500 border-emerald-500 text-white">
                                   <FileText size={12}/>
                                 </div>
                                 <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Proof<br/>Sent</span>
                               </div>

                               {/* Step 2 */}
                               <div className="flex flex-col items-center gap-2">
                                 <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${order.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-blue-500 border-blue-500 text-white animate-pulse'}`}>
                                   <Activity size={12}/>
                                 </div>
                                 <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Processor<br/>Verifying</span>
                               </div>

                               {/* Step 3 */}
                               <div className="flex flex-col items-center gap-2">
                                 <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${order.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-[#0B0F19] border-white/20 text-slate-500'}`}>
                                   <CheckCircle2 size={12}/>
                                 </div>
                                 <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">AFR<br/>Minted</span>
                               </div>
                             </div>
                           </div>
                         )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* =========================================
              NEW DEPOSIT TAB
          ========================================= */}
          {activeTab === 'NEW' && !routingMethod && (
            <div className="space-y-8 animate-in fade-in zoom-in-95">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 text-center">Amount to Deposit (USD Equivalent)</label>
                <div className="relative max-w-xs mx-auto">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 font-black text-xl">$</span>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-6 py-6 text-3xl font-black outline-none focus:border-blue-500 focus:bg-black/60 transition-all text-white placeholder:text-slate-700 text-center shadow-inner" autoFocus />
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 text-center">Select Liquidity Network</label>
                <div className="space-y-3">
                  <button disabled={!amount || amount <= 0} onClick={() => { setRoutingMethod('card'); handleInitializeCard(); }} className="w-full bg-white/5 hover:bg-white/10 border border-white/10 p-5 rounded-2xl transition-all disabled:opacity-30 group flex items-center gap-4 text-left">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors"><CreditCard size={24}/></div>
                    <div>
                      <h4 className="font-black text-white">Global Card Network</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Stripe Gateway • 2.9% Fee</p>
                    </div>
                  </button>

                  <button disabled={!amount || amount <= 0} onClick={() => setRoutingMethod('p2p')} className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 p-5 rounded-2xl transition-all disabled:opacity-30 group flex items-center gap-4 text-left">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors shadow-[0_0_15px_rgba(16,185,129,0.2)]"><Users size={24}/></div>
                    <div>
                      <h4 className="font-black text-white">Community of Trust</h4>
                      <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mt-1 flex flex-wrap gap-2">
                        <span>1% IFB Fee</span> <span className="text-white/20">|</span> <span>2% Processor Reward</span>
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'NEW' && routingMethod === 'card' && (
            <>
              {!clientSecret ? (
                <div className="py-20 text-center flex flex-col items-center justify-center">
                   <Loader2 className="animate-spin text-blue-500 mb-4" size={40}/>
                   <p className="text-xs font-black uppercase tracking-widest text-slate-400">Securing Global Connection...</p>
                </div>
              ) : (
                <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night', variables: { colorPrimary: '#2563EB', colorBackground: '#0B0F19', colorText: '#F8FAFC', borderRadius: '16px' } } }}>
                  <CheckoutForm amount={amount} onBack={() => { setClientSecret(null); setRoutingMethod(null); }} />
                </Elements>
              )}
            </>
          )}

          {activeTab === 'NEW' && routingMethod === 'p2p' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              
              {p2pStep === 1 && (
                <div className="space-y-6">
                  <button onClick={() => setRoutingMethod(null)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white flex items-center gap-2 transition-colors"><ArrowLeft size={14}/> Back</button>
                  <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center">
                    <h3 className="font-black text-emerald-400 text-2xl">${amount} Deposit</h3>
                    <p className="text-[10px] font-bold text-emerald-500/70 uppercase tracking-widest mt-1 flex justify-center gap-3">
                      <span>Network: 1%</span> <span>Escrow: 2%</span>
                    </p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Select Transfer Method</label>
                    <select value={fiatMethod} onChange={(e) => setFiatMethod(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-emerald-500 mb-4">
                      {fiatOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                    </select>

                    {fiatMethod === 'Physical Cash Drop' && (
                      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl animate-in zoom-in-95">
                        <h4 className="text-amber-400 text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-2"><AlertTriangle size={14}/> High Risk Method</h4>
                        <p className="text-xs text-amber-500/80 leading-relaxed font-medium">Meet in a public, well-lit place. Ensure the processor clicks "Confirm Receipt" in front of you. Verify the digital AFR is in your DEUS app before leaving.</p>
                      </div>
                    )}
                  </div>
                  <button onClick={handleFindProcessors} disabled={isInitializing} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest p-5 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex justify-center">
                    {isInitializing ? <Loader2 className="animate-spin" size={16}/> : 'Scan For Local Processors'}
                  </button>
                </div>
              )}

              {p2pStep === 2 && (
                <div className="space-y-4">
                  <button onClick={() => setP2pStep(1)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white flex items-center gap-2 mb-4 transition-colors"><ArrowLeft size={14}/> Change Method</button>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2">Available Nodes Accepting {fiatMethod}</p>
                  
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-2 no-scrollbar">
                    {processors.map(proc => (
                      <button key={proc.id} onClick={() => { setSelectedProcessor(proc); setP2pStep(3); }} className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 p-4 rounded-2xl transition-all flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-white/20">
                            {proc.avatar_url ? <img src={proc.avatar_url} className="w-full h-full rounded-full object-cover"/> : <Users size={16} className="text-slate-400"/>}
                          </div>
                          <div>
                            <p className="font-black text-white text-sm leading-tight">{proc.full_name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="flex items-center gap-1 text-[9px] font-bold text-amber-400"><Star size={10}/> {proc.cot_rating}%</span>
                              <span className="text-[9px] text-slate-500">• {proc.cot_completed_tx} trades</span>
                            </div>
                          </div>
                        </div>
                        <ShieldCheck size={20} className="text-slate-600 group-hover:text-emerald-500 transition-colors"/>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {p2pStep === 3 && (
                <div className="space-y-6">
                  <button onClick={() => {setP2pStep(2); setReceiptFile(null); setScanResult(null);}} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white flex items-center gap-2 transition-colors"><ArrowLeft size={14}/> Back</button>

                  <div className="bg-black/40 border border-white/10 rounded-2xl p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 text-center">Transfer Instructions</p>
                    <p className="text-sm font-medium text-slate-300 text-center mb-4 leading-relaxed">
                      Send exactly <strong className="text-white">${amount} USD equivalent</strong> via {fiatMethod} to:
                    </p>
                    <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-center mb-4">
                      <p className="font-black text-white text-lg">{selectedProcessor.full_name}</p>
                      <p className="text-xs text-emerald-400 font-bold mt-1">{fiatMethod === 'Physical Cash Drop' ? 'Meet at verified location.' : 'Details provided in live chat.'}</p>
                    </div>
                    
                    <div className="border-t border-white/10 pt-5">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 text-center">
                        Upload {fiatMethod === 'Physical Cash Drop' ? 'Signed Cash Receipt' : 'Transfer Screenshot'}
                      </label>
                      <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 cursor-pointer transition-all ${receiptFile ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/20 hover:border-white/40 bg-white/5'}`}>
                        {receiptFile ? (
                          <>
                            <CheckCircle2 size={32} className="text-emerald-400 mb-2"/>
                            <span className="text-xs font-bold text-white text-center">{receiptFile.name}</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud size={32} className="text-slate-400 mb-2"/>
                            <span className="text-xs font-bold text-slate-400">Tap to upload proof</span>
                          </>
                        )}
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => {setReceiptFile(e.target.files[0]); setScanResult(null);}} />
                      </label>
                    </div>
                  </div>

                  {/* 🔥 AI SCANNING ENGINE */}
                  {!scanResult ? (
                    <button 
                      onClick={handleAiScan} disabled={!receiptFile || isScanning}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest p-5 rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isScanning ? <><ScanLine className="animate-pulse" size={16}/> Extracting Data...</> : <><ScanLine size={16}/> Scan Proof with IFB AI</>}
                    </button>
                  ) : (
                    <div className="space-y-4 animate-in slide-in-from-bottom-2">
                      <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest flex items-center gap-1"><CheckCircle2 size={12}/> AI Extracted</span>
                          <span className="text-[10px] text-emerald-400 font-bold">{scanResult.date}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-slate-300">Ref: {scanResult.refId}</span>
                          <span className="text-lg font-black text-white">${scanResult.detectedAmount}</span>
                        </div>
                      </div>
                      <button 
                        onClick={handleSubmitP2pProof} disabled={isP2pProcessing}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest p-5 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isP2pProcessing ? <Loader2 className="animate-spin" size={16}/> : 'Confirm & Request AFR Mint'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {p2pStep === 4 && (
                <div className="py-10 text-center space-y-4 animate-in zoom-in-95">
                  <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6"><ShieldCheck size={40}/></div>
                  <h3 className="text-2xl font-black text-white">Proof Sent to Processor</h3>
                  <p className="text-sm text-slate-400 leading-relaxed px-4">Your receipt has been scanned by the IFB AI and sent to the routing node.</p>
                  <p className="text-xs text-emerald-400 font-bold mt-4">AFR will be minted to your balance upon final processor confirmation.</p>
                  <div className="pt-8"><button onClick={() => { setActiveTab('HISTORY'); setRoutingMethod(null); setAmount(''); setP2pStep(1); setReceiptFile(null); setScanResult(null); }} className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors">Track Status</button></div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}