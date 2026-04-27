import React, { useState, useEffect } from 'react';
import { X, Landmark, MapPin, ShieldCheck, ArrowRight, CheckCircle, Loader2, Lock, Star, User, CreditCard, Globe, Smartphone, Wallet, HandCoins, ArrowLeft, Users, History, FileText, ExternalLink, AlertTriangle, Clock, Activity, Search, ShieldAlert, Check } from 'lucide-react';
import { supabase } from './services/supabaseClient';

export default function WithdrawalPage({ userBalance = 0, userId, onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState('NEW'); // 'NEW' or 'HISTORY'
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Unified P2P/Escrow State
  const [p2pFiatMethod, setP2pFiatMethod] = useState('Local Bank Transfer');
  const [p2pReceivingDetails, setP2pReceivingDetails] = useState('');
  const [selectedProcessor, setSelectedProcessor] = useState(null);
  const [nearbyBankers, setNearbyBankers] = useState([]);
  const [isLoadingBankers, setIsLoadingBankers] = useState(false);

  // History State
  const [orderHistory, setOrderHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedOrderProof, setSelectedOrderProof] = useState(null);

  // Standard Bank/Card Form State
  const [bankType, setBankType] = useState('ach'); 
  const [formData, setFormData] = useState({
    accountName: '', accountNumber: '', routingNumber: '', iban: '', swiftBic: '', country: '', cardNumber: '', expiry: '', cvc: ''
  });

  const fiatOptions = [
    { id: 'Local Bank Transfer', icon: <Landmark size={18}/>, label: 'Local Bank Transfer', type: 'remote' },
    { id: 'Mobile Money', icon: <Smartphone size={18}/>, label: 'Mobile Money', type: 'remote' },
    { id: 'Digital Wallet', icon: <Wallet size={18}/>, label: 'Digital Wallet', type: 'remote' },
    { id: 'Physical Cash Pickup', icon: <HandCoins size={18}/>, label: 'Physical Cash Pickup', type: 'local' }
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
          id, created_at, status, amount_usd, payment_method, metadata, updated_at, proof_image_url, ai_verification_status,
          processor:profiles!p2p_orders_processor_id_fkey(full_name)
        `)
        .eq('user_id', userId)
        .eq('order_type', 'withdraw')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrderHistory(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const showToast = (msg, isError = false) => {
    if (isError) {
      setError(msg); setTimeout(() => setError(''), 5000);
    } else {
      setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 5000);
    }
  };

  const handleAmountSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (parseFloat(amount) > 0 && parseFloat(amount) <= userBalance) {
      setStep(2);
    } else {
      showToast("Invalid amount or insufficient liquid funds.", true);
    }
  };

  const handleFindProcessors = async (overrideMethod = null, overrideDetails = null) => {
    const currentMethod = overrideMethod || p2pFiatMethod;
    const currentDetails = overrideDetails || p2pReceivingDetails;

    if (!currentDetails && currentMethod !== 'Physical Cash Pickup') {
      showToast(`Please provide your ${currentMethod} details.`, true);
      return;
    }
    
    if (overrideMethod) setP2pFiatMethod(overrideMethod);
    if (overrideDetails) setP2pReceivingDetails(overrideDetails);

    setIsLoadingBankers(true);
    setStep(4);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, cot_rating, cot_completed_tx, location')
        .eq('is_cot_processor', true)
        .limit(10);

      if (error) throw error;

      // Simulate the "Uber" algorithmic matching effect
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (data && data.length > 0) {
        setNearbyBankers(data.map(b => ({ 
          ...b, 
          location: b.location || 'Global Remote',
          avg_time: `${Math.floor(Math.random() * 15) + 5} mins` 
        })));
      } else {
        setNearbyBankers([{ 
          id: '1', full_name: 'IFB Global Operations', cot_rating: 100, 
          cot_completed_tx: 15420, location: 'Secure Remote Node', avg_time: '12 mins' 
        }]);
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to locate global processing nodes.", true);
    } finally {
      setIsLoadingBankers(false);
    }
  };

  const handleBankToP2PTransition = (e) => {
    e.preventDefault();
    let methodLabel = '';
    let details = '';

    if (bankType === 'ach') {
      methodLabel = 'US ACH Wire';
      details = `Name: ${formData.accountName} | Routing: ${formData.routingNumber} | Acct: ${formData.accountNumber}`;
    } else if (bankType === 'swift') {
      methodLabel = 'SWIFT Wire';
      details = `Name: ${formData.accountName} | IBAN: ${formData.iban} | BIC: ${formData.swiftBic} | Country: ${formData.country}`;
    } else if (bankType === 'card') {
      methodLabel = 'Card Payout';
      details = `Name: ${formData.accountName} | Card: ${formData.cardNumber} | Exp: ${formData.expiry}`;
    }

    handleFindProcessors(methodLabel, details);
  };

  const handleProcessP2pWithdrawal = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setError('');
    
    try {
      const { data: orderData, error: orderError } = await supabase.from('p2p_orders').insert([{
        user_id: userId,
        processor_id: selectedProcessor.id,
        order_type: 'withdraw',
        amount_usd: parseFloat(amount),
        payment_method: `${p2pFiatMethod} - ${p2pReceivingDetails}`,
        status: 'open'
      }]).select().single();

      if (orderError) throw orderError;

      const { error: rpcError } = await supabase.rpc('process_p2p_escrow', {
        p_order_id: orderData.id,
        p_action: 'lock_withdraw'
      });

      if (rpcError) throw rpcError;

      await supabase.from('notifications').insert([{
        user_id: selectedProcessor.id,
        type: 'p2p_withdrawal_request',
        message: `Withdrawal Request: $${parseFloat(amount).toFixed(2)} via ${p2pFiatMethod}.`,
        amount: parseFloat(amount),
        related_user_id: userId,
        status: 'pending',
        metadata: { trade_id: orderData.id } 
      }]);

      setStep(5);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to secure the escrow contract.", true);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- HISTORY ACTIONS ---
  const confirmReceipt = async (orderId) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase.rpc('finalize_p2p_trade', { p_trade_id: orderId });
      if (error) throw error;
      showToast('Escrow released successfully. Transaction Complete.');
      setSelectedOrderProof(null);
      fetchHistory();
      if (onSuccess) onSuccess();
    } catch (err) {
      showToast(err.message || "Failed to release escrow.", true);
    } finally {
      setIsProcessing(false);
    }
  };

  const openDispute = async (orderId) => {
    setIsProcessing(true);
    try {
      await supabase.from('p2p_orders').update({ status: 'disputed' }).eq('id', orderId);
      showToast('Dispute opened. Support has been notified and the escrow remains locked.');
      setSelectedOrderProof(null);
      fetchHistory();
    } catch (err) {
      showToast("Failed to open dispute.", true);
    } finally {
      setIsProcessing(false);
    }
  };

  const getTimeElapsed = (created, updated, status) => {
    const start = new Date(created);
    const end = status === 'completed' ? new Date(updated) : new Date();
    const diffMins = Math.floor((end - start) / 60000);
    if (diffMins < 60) return `${diffMins} min`;
    return `${Math.floor(diffMins / 60)} hrs ${diffMins % 60} min`;
  };

  return (
    <div className="p-8 w-full animate-in fade-in zoom-in-95 duration-300 relative flex flex-col h-full bg-white">
      
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-100 pb-4 mb-6 sticky top-0 z-20 bg-white gap-4">
        <h2 className="text-xl font-black text-slate-800 tracking-tight">Withdraw Capital</h2>
        <div className="flex bg-slate-100 p-1.5 rounded-xl">
          <button onClick={() => setActiveTab('NEW')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'NEW' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>New Route</button>
          <button onClick={() => setActiveTab('HISTORY')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'HISTORY' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Records & Status</button>
        </div>
      </div>

      {/* Global Notifications */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100 flex items-start gap-3">
          <X size={18} className="shrink-0 mt-0.5" /> <p>{error}</p>
        </div>
      )}
      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-bold border border-emerald-100 flex items-start gap-3">
          <CheckCircle size={18} className="shrink-0 mt-0.5" /> <p>{successMsg}</p>
        </div>
      )}

      {/* PROOF VIEWER & AI VALIDATION MODAL */}
      {selectedOrderProof && (
        <div className="fixed inset-0 z-[999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl overflow-hidden max-w-4xl w-full shadow-2xl flex flex-col md:flex-row">
            
            {/* Left: Document View */}
            <div className="md:w-2/3 bg-slate-100 flex flex-col border-r border-slate-200">
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white">
                <h3 className="font-black text-slate-800 flex items-center gap-2"><FileText size={18}/> Processor Receipt</h3>
                <a href={selectedOrderProof.proof_image_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:bg-blue-50 p-2 rounded-xl transition-colors"><ExternalLink size={18}/></a>
              </div>
              <div className="flex-1 p-4 flex justify-center items-center min-h-[300px]">
                 {selectedOrderProof.proof_image_url?.toLowerCase().endsWith('.pdf') ? (
                   <iframe src={selectedOrderProof.proof_image_url} className="w-full h-full min-h-[60vh] rounded-xl border border-slate-200" title="Proof" />
                 ) : (
                   <img src={selectedOrderProof.proof_image_url} alt="Proof" className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-sm" />
                 )}
              </div>
            </div>

            {/* Right: AI Extraction & Actions */}
            <div className="md:w-1/3 bg-white p-6 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h4 className="font-black text-slate-800 text-lg">AI Verification</h4>
                  <button onClick={() => setSelectedOrderProof(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><X size={20}/></button>
                </div>
                
                {selectedOrderProof.metadata?.extracted_amount ? (
                  <div className={`p-4 rounded-2xl mb-6 space-y-3 relative overflow-hidden border ${selectedOrderProof.ai_verification_status === 'verified' ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-200'}`}>
                    <div className="absolute top-0 right-0 p-2 opacity-20"><ShieldCheck size={40} className={selectedOrderProof.ai_verification_status === 'verified' ? 'text-blue-600' : 'text-red-600'}/></div>
                    <p className={`text-[9px] font-black uppercase tracking-widest mb-2 flex items-center gap-1 ${selectedOrderProof.ai_verification_status === 'verified' ? 'text-blue-600' : 'text-red-600'}`}>
                      <Activity size={12}/> AI Data Extraction {selectedOrderProof.ai_verification_status === 'verified' ? '(Match)' : '(Discrepancy)'}
                    </p>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Detected Amount</p>
                      <p className={`font-black ${selectedOrderProof.ai_verification_status === 'verified' ? 'text-slate-800' : 'text-red-600 text-lg'}`}>
                        ${selectedOrderProof.metadata.extracted_amount} <span className="text-xs font-bold text-slate-400 block mt-0.5">Expected: ${selectedOrderProof.amount_usd.toFixed(2)}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Date / Time</p>
                      <p className="font-black text-slate-800">{selectedOrderProof.metadata.extracted_date || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Reference #</p>
                      <p className="font-black text-slate-800 text-xs break-all">{selectedOrderProof.metadata.extracted_ref_id || 'N/A'}</p>
                    </div>
                    {(selectedOrderProof.metadata.sender_name || selectedOrderProof.metadata.receiver_name) && (
                      <div className="pt-2 border-t border-blue-200/50">
                        <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-1">Parties Detected</p>
                        <p className="font-bold text-slate-700 text-xs leading-tight">From: {selectedOrderProof.metadata.sender_name || 'Unknown'}</p>
                        <p className="font-bold text-slate-700 text-xs leading-tight">To: {selectedOrderProof.metadata.receiver_name || 'Unknown'}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl mb-6 text-center">
                    <ShieldAlert className="mx-auto text-slate-400 mb-2" size={24}/>
                    <p className="text-xs font-bold text-slate-500">No automated AI extraction available for this document. Please verify manually.</p>
                  </div>
                )}

                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
                  <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1 flex items-center gap-1"><AlertTriangle size={12}/> Warning</p>
                  <p className="text-xs font-medium text-amber-800/80 leading-relaxed">Check your actual bank/wallet account. Do not release escrow unless the funds are physically available to you.</p>
                </div>
              </div>

              <div className="space-y-3 mt-6">
                <button onClick={() => confirmReceipt(selectedOrderProof.id)} disabled={isProcessing} className="w-full py-4 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-colors shadow-xl disabled:opacity-50 flex items-center justify-center gap-2">
                  <Check size={16}/> I Received The Funds
                </button>
                <button onClick={() => openDispute(selectedOrderProof.id)} disabled={isProcessing} className="w-full py-3 bg-white border-2 border-red-100 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:border-red-200 transition-colors shadow-sm disabled:opacity-50">
                  Report Issue / Dispute
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scrollable Content */}
      <div className="overflow-y-auto flex-1 no-scrollbar pr-2 pb-4">
        
        {/* =========================================
            HISTORY TAB (UBER STYLE TRACKING)
        ========================================= */}
        {activeTab === 'HISTORY' && (
          <div className="space-y-4 animate-in slide-in-from-right-4">
            {isLoadingHistory ? (
              <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={32}/></div>
            ) : orderHistory.length === 0 ? (
              <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
                <History size={40} className="mx-auto text-slate-300 mb-4"/>
                <p className="text-slate-500 font-bold">No withdrawal records found.</p>
              </div>
            ) : (
              orderHistory.map(order => (
                <div key={order.id} className="p-6 rounded-3xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all">
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    
                    {/* Left: Basic Info */}
                    <div className="md:w-1/3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">#{order.id.substring(0,8)}</span>
                        <span className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                          <Clock size={10}/> {getTimeElapsed(order.created_at, order.updated_at, order.status)}
                        </span>
                      </div>
                      <h3 className="text-3xl font-black text-slate-800">${order.amount_usd.toFixed(2)}</h3>
                      <p className="text-xs font-bold text-slate-500 mt-2">{order.payment_method}</p>
                      
                      <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center"><User size={14}/></div>
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Processor</p>
                          <p className="text-sm font-bold text-slate-700">{order.processor?.full_name || 'Network Matching...'}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Right: Uber-Style Status Tracker */}
                    <div className="md:w-2/3 flex flex-col justify-center">
                       {order.status === 'disputed' ? (
                         <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-center">
                           <AlertTriangle size={32} className="mx-auto text-red-500 mb-2"/>
                           <h4 className="font-black text-red-700 uppercase tracking-widest">Transaction Disputed</h4>
                           <p className="text-xs text-red-600/80 font-bold mt-1">Escrow locked. IFB Arbitrators are reviewing this case.</p>
                         </div>
                       ) : (
                         <div className="relative pt-2">
                           {/* Connecting Line */}
                           <div className="absolute top-5 left-6 right-6 h-1 bg-slate-100 rounded-full z-0">
                             <div className={`h-full rounded-full transition-all duration-1000 ${order.status === 'completed' ? 'bg-emerald-500 w-full' : order.status === 'proof_verified' ? 'bg-blue-500 w-2/3' : 'bg-amber-500 w-1/3'}`}></div>
                           </div>

                           <div className="relative z-10 flex justify-between">
                             {/* Step 1 */}
                             <div className="flex flex-col items-center gap-2">
                               <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${order.status ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-slate-200 border-slate-300 text-slate-400'}`}>
                                 <Lock size={12}/>
                               </div>
                               <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">Escrow<br/>Locked</span>
                             </div>

                             {/* Step 2 */}
                             <div className="flex flex-col items-center gap-2">
                               <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${order.status === 'proof_verified' || order.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' : order.status === 'open' || order.status === 'locked_in_escrow' ? 'bg-blue-500 border-blue-500 text-white animate-pulse' : 'bg-white border-slate-200 text-slate-300'}`}>
                                 <Activity size={12}/>
                               </div>
                               <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">Processor<br/>Routing</span>
                             </div>

                             {/* Step 3 */}
                             <div className="flex flex-col items-center gap-2">
                               <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${order.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' : order.status === 'proof_verified' ? 'bg-amber-500 border-amber-500 text-white animate-bounce' : 'bg-white border-slate-200 text-slate-300'}`}>
                                 <FileText size={12}/>
                               </div>
                               <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">Proof<br/>Verified</span>
                             </div>

                             {/* Step 4 */}
                             <div className="flex flex-col items-center gap-2">
                               <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${order.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-200 text-slate-300'}`}>
                                 <CheckCircle size={12}/>
                               </div>
                               <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">Funds<br/>Settled</span>
                             </div>
                           </div>

                           {/* Dynamic Action Button below Tracker */}
                           {order.status === 'proof_verified' && (
                             <div className="mt-8 text-center animate-in slide-in-from-bottom-2">
                               <button onClick={() => setSelectedOrderProof(order)} className="px-8 py-3 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 shadow-lg hover:-translate-y-0.5 transition-all animate-pulse flex items-center justify-center gap-2 mx-auto">
                                 {order.ai_verification_status === 'verified' ? <ShieldCheck size={16}/> : <AlertTriangle size={16}/>}
                                 Action Required: Verify Receipt
                               </button>
                             </div>
                           )}
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
            NEW ROUTE TAB (Steps 1-5)
        ========================================= */}
        {activeTab === 'NEW' && (
          <>
            {/* STEP 1: AMOUNT */}
            {step === 1 && (
              <form onSubmit={handleAmountSubmit} className="space-y-6 animate-in slide-in-from-right-4">
                <div className="text-center space-y-2">
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Available Liquid Balance</p>
                  <p className="text-3xl font-black text-slate-800">${parseFloat(userBalance).toFixed(2)}</p>
                </div>

                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300">$</span>
                  <input 
                    type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-50 p-6 pl-12 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none text-3xl font-black text-slate-800 placeholder:text-slate-300 transition-all shadow-inner"
                    placeholder="0.00"
                  />
                </div>

                <button type="submit" className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black text-lg tracking-wide hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg hover:-translate-y-1">
                  Select Routing Method <ArrowRight size={20} />
                </button>
              </form>
            )}

            {/* STEP 2: METHOD SELECTION */}
            {step === 2 && (
              <div className="space-y-4 animate-in slide-in-from-right-4">
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl mb-6">
                  <p className="text-sm font-bold text-blue-800 text-center">Select how you want to receive your <span className="font-black">${amount}</span></p>
                </div>

                {/* Option 1: P2P */}
                <button 
                  onClick={() => { setMethod('P2P'); setStep(3); }} 
                  className="w-full flex items-center justify-between p-5 rounded-2xl border-2 border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 transition-all text-left relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-black px-3 py-1 rounded-bl-lg uppercase tracking-widest shadow-sm">Peer Network</div>
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform"><MapPin size={24} /></div>
                    <div>
                      <p className="font-black text-slate-800">Community of Trust (P2P)</p>
                      <p className="text-xs font-bold text-emerald-600 mt-0.5">Local Bank, Mobile Money, Cash</p>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-emerald-400" />
                </button>

                {/* Option 2: Standard Bank */}
                <button onClick={() => { setMethod('BANK'); setStep(3); }} className="w-full flex items-center justify-between p-5 rounded-2xl border-2 border-slate-100 hover:border-blue-100 hover:bg-blue-50/50 transition-all text-left group">
                  <div className="absolute top-0 right-0 bg-blue-500 text-white text-[9px] font-black px-3 py-1 rounded-bl-lg uppercase tracking-widest shadow-sm">IFB Handled</div>
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-100 text-slate-600 rounded-xl group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors"><Landmark size={24} /></div>
                    <div>
                      <p className="font-black text-slate-800">Global Bank / Card</p>
                      <p className="text-xs font-bold text-slate-400 mt-0.5">International Wire & ACH</p>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                </button>

                <button onClick={() => setStep(1)} className="w-full text-center text-xs font-bold text-slate-400 pt-4 hover:text-slate-600 uppercase tracking-widest">Go Back</button>
              </div>
            )}

            {/* STEP 3 (A): GLOBAL BANK WITHDRAWAL (Routes to P2P) */}
            {step === 3 && method === 'BANK' && (
              <form onSubmit={handleBankToP2PTransition} className="space-y-5 animate-in slide-in-from-right-4">
                <button type="button" onClick={() => setStep(2)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 flex items-center gap-2 mb-2 transition-colors">
                  <ArrowLeft size={14}/> Back to Methods
                </button>

                <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                  <button type="button" onClick={() => {setBankType('ach'); setError('');}} className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1 ${bankType === 'ach' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    <Landmark size={14} /> US ACH
                  </button>
                  <button type="button" onClick={() => {setBankType('swift'); setError('');}} className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1 ${bankType === 'swift' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    <Globe size={14} /> SWIFT
                  </button>
                  <button type="button" onClick={() => {setBankType('card'); setError('');}} className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1 ${bankType === 'card' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    <CreditCard size={14} /> Card
                  </button>
                </div>

                <div className="space-y-3 min-h-[180px]">
                  {bankType === 'ach' && (
                    <div className="animate-in fade-in space-y-3">
                      <input required type="text" placeholder="Account Holder Name" value={formData.accountName} onChange={e => setFormData({...formData, accountName: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-slate-800 focus:border-blue-500 transition-colors" />
                      <input required type="text" placeholder="ABA Routing Number (9 digits)" maxLength="9" value={formData.routingNumber} onChange={e => setFormData({...formData, routingNumber: e.target.value.replace(/\D/g, '')})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-slate-800 focus:border-blue-500 transition-colors tracking-widest" />
                      <input required type="text" placeholder="Account Number" value={formData.accountNumber} onChange={e => setFormData({...formData, accountNumber: e.target.value.replace(/\D/g, '')})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-slate-800 focus:border-blue-500 transition-colors tracking-widest" />
                    </div>
                  )}

                  {bankType === 'swift' && (
                    <div className="animate-in fade-in space-y-3">
                      <input required type="text" placeholder="Account Holder Name" value={formData.accountName} onChange={e => setFormData({...formData, accountName: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-slate-800 focus:border-blue-500 transition-colors" />
                      <input required type="text" placeholder="IBAN" value={formData.iban} onChange={e => setFormData({...formData, iban: e.target.value.toUpperCase()})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-slate-800 focus:border-blue-500 transition-colors tracking-wider" />
                      <div className="flex gap-3">
                        <input required type="text" placeholder="SWIFT / BIC Code" value={formData.swiftBic} onChange={e => setFormData({...formData, swiftBic: e.target.value.toUpperCase()})} className="flex-1 bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-slate-800 focus:border-blue-500 transition-colors tracking-wider" />
                        <input required type="text" placeholder="Country (e.g. GB)" maxLength="2" value={formData.country} onChange={e => setFormData({...formData, country: e.target.value.toUpperCase()})} className="w-1/3 bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-slate-800 focus:border-blue-500 transition-colors text-center" />
                      </div>
                    </div>
                  )}

                  {bankType === 'card' && (
                    <div className="animate-in fade-in space-y-3">
                      <input required type="text" placeholder="Name on Card" value={formData.accountName} onChange={e => setFormData({...formData, accountName: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-slate-800 focus:border-blue-500 transition-colors" />
                      <div className="relative">
                        <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input required type="text" placeholder="Card Number" maxLength="19" 
                          value={formData.cardNumber} 
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, '');
                            setFormData({...formData, cardNumber: val.replace(/(\d{4})/g, '$1 ').trim()});
                          }} 
                          className="w-full bg-slate-50 p-4 pl-12 rounded-xl border border-slate-200 outline-none font-bold text-slate-800 focus:border-blue-500 transition-colors tracking-widest" 
                        />
                      </div>
                      <div className="flex gap-3">
                        <input required type="text" placeholder="MM/YY" maxLength="5" 
                          value={formData.expiry} 
                          onChange={e => {
                            let val = e.target.value.replace(/\D/g, '');
                            if (val.length >= 2) val = val.substring(0,2) + '/' + val.substring(2,4);
                            setFormData({...formData, expiry: val});
                          }} 
                          className="flex-1 bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-slate-800 focus:border-blue-500 transition-colors text-center tracking-widest" 
                        />
                        <input type="password" placeholder="CVC" maxLength="4" value={formData.cvc} onChange={e => setFormData({...formData, cvc: e.target.value.replace(/\D/g, '')})} className="w-1/3 bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-slate-800 focus:border-blue-500 transition-colors text-center tracking-widest" />
                      </div>
                    </div>
                  )}
                </div>

                <button type="submit" className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 flex justify-center gap-2 transition-all shadow-lg hover:-translate-y-1 mt-6">
                  Initialize Escrow Routing <ArrowRight size={16}/>
                </button>
              </form>
            )}

            {/* STEP 3 (B): P2P FIAT METHOD */}
            {step === 3 && method === 'P2P' && (
              <div className="space-y-6 animate-in slide-in-from-right-4">
                <button type="button" onClick={() => setStep(2)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 flex items-center gap-2 transition-colors">
                  <ArrowLeft size={14}/> Back to Methods
                </button>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">How do you want to receive the fiat?</label>
                  <div className="grid grid-cols-2 gap-3">
                    {fiatOptions.map((option) => (
                      <button
                        key={option.id} onClick={() => setP2pFiatMethod(option.id)}
                        className={`flex flex-col items-start p-4 rounded-2xl border-2 transition-all text-left ${
                          p2pFiatMethod === option.id 
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm' 
                            : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        <div className={`mb-2 ${p2pFiatMethod === option.id ? 'text-emerald-500' : 'text-slate-400'}`}>
                          {option.icon}
                        </div>
                        <span className="font-black text-sm leading-tight mb-1">{option.label}</span>
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">{option.type} settlement</span>
                      </button>
                    ))}
                  </div>
                </div>

                {p2pFiatMethod !== 'Physical Cash Pickup' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                      Your {p2pFiatMethod} Details
                    </label>
                    <textarea 
                      value={p2pReceivingDetails}
                      onChange={(e) => setP2pReceivingDetails(e.target.value)}
                      placeholder={`E.g. Bank Name, Account Number, or Mobile Money Number...`}
                      className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-slate-800 text-sm focus:border-emerald-500 transition-colors h-24 resize-none"
                    />
                    <p className="text-[10px] text-slate-400 font-bold mt-2">These details will be securely sent to the processor to fulfill your withdrawal.</p>
                  </div>
                )}
                
                {p2pFiatMethod === 'Physical Cash Pickup' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                      Your City / Region
                    </label>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
                      <input 
                        type="text"
                        value={p2pReceivingDetails}
                        onChange={(e) => setP2pReceivingDetails(e.target.value)}
                        placeholder="e.g. Bukavu, DRC or New York, USA"
                        className="w-full bg-slate-50 p-4 pl-10 rounded-xl border border-slate-200 outline-none font-bold text-slate-800 text-sm focus:border-emerald-500 transition-colors"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold mt-2">We will route your escrow request to an agent in this vicinity.</p>
                  </div>
                )}

                <button 
                  onClick={() => handleFindProcessors()} 
                  disabled={isLoadingBankers}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest p-5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 hover:-translate-y-1"
                >
                  {isLoadingBankers ? <Loader2 className="animate-spin" size={16} /> : 'Match With Routing Node'}
                </button>
              </div>
            )}

            {/* STEP 4: ADVANCED PROCESSOR SELECTION (No Map) */}
            {step === 4 && (
              <div className="space-y-6 animate-in slide-in-from-right-4">
                <div className="flex justify-between items-center mb-2">
                  <button onClick={() => setStep(3)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 flex items-center gap-2 transition-colors">
                    <ArrowLeft size={14}/> Edit Fiat Details
                  </button>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                    <Activity size={14}/> Live Network
                  </p>
                </div>
                
                {isLoadingBankers ? (
                  <div className="py-12 flex flex-col items-center justify-center bg-slate-50 rounded-3xl border border-slate-100">
                    <div className="relative mb-4">
                      <Search size={32} className="text-emerald-500 relative z-10"/>
                      <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-20 scale-150"></div>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Scanning Sovereign Ledger...</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-slate-900 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>
                      <h3 className="text-xl font-black mb-1">Secure Nodes Found</h3>
                      <p className="text-xs text-slate-400 font-bold mb-6">Select a processor below to lock funds in smart escrow.</p>
                      
                      <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                        {nearbyBankers.map(banker => (
                          <button 
                            key={banker.id} 
                            onClick={() => setSelectedProcessor(banker)}
                            className={`w-full text-left p-4 rounded-2xl transition-all flex items-center justify-between group border-2 relative overflow-hidden ${selectedProcessor?.id === banker.id ? 'bg-emerald-50 border-emerald-500 shadow-sm' : 'bg-white/10 border-white/10 hover:border-white/30'}`}
                          >
                            <div className="flex items-center gap-4 relative z-10">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${selectedProcessor?.id === banker.id ? 'bg-emerald-100 border-emerald-500' : 'bg-slate-800 border-slate-600'}`}>
                                {banker.avatar_url ? <img src={banker.avatar_url} className="w-full h-full rounded-full object-cover"/> : <Users size={20} className={selectedProcessor?.id === banker.id ? 'text-emerald-600' : 'text-slate-400'}/>}
                              </div>
                              <div>
                                <p className={`font-black text-base leading-tight ${selectedProcessor?.id === banker.id ? 'text-slate-900' : 'text-white'}`}>{banker.full_name}</p>
                                <p className={`text-[10px] font-black uppercase tracking-widest mt-1 flex items-center gap-1 ${selectedProcessor?.id === banker.id ? 'text-emerald-600' : 'text-slate-400'}`}><MapPin size={10}/> {banker.location}</p>
                                <div className="flex items-center gap-3 mt-2">
                                  <span className="flex items-center gap-1 text-[9px] font-bold text-amber-500"><Star size={10} className="fill-amber-500"/> {banker.cot_rating}% Trust</span>
                                  <span className={`flex items-center gap-1 text-[9px] font-bold ${selectedProcessor?.id === banker.id ? 'text-slate-500' : 'text-slate-400'}`}><Clock size={10}/> ~{banker.avg_time}</span>
                                </div>
                              </div>
                            </div>
                            {selectedProcessor?.id === banker.id ? <CheckCircle size={24} className="text-emerald-500 relative z-10" /> : <ArrowRight size={20} className="text-slate-400 group-hover:text-white relative z-10" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button 
                      onClick={handleProcessP2pWithdrawal} 
                      disabled={!selectedProcessor || isProcessing}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest p-5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-4 hover:-translate-y-1"
                    >
                      {isProcessing ? <Loader2 className="animate-spin" size={16}/> : `Lock Escrow & Route to ${selectedProcessor ? selectedProcessor.full_name.split(' ')[0] : 'Processor'}`}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* STEP 5: SUCCESS */}
            {step === 5 && (
              <div className="py-10 text-center space-y-4 animate-in zoom-in-95 duration-300">
                <div className="mx-auto w-24 h-24 bg-emerald-50 border-8 border-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <CheckCircle size={40} strokeWidth={3} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 mb-2">Withdrawal Escrow Initiated</h3>
                  <p className="text-slate-500 font-bold text-sm leading-relaxed px-4">
                    Your digital funds are locked in Escrow. <strong>{selectedProcessor?.full_name}</strong> has been notified to send {parseFloat(amount).toFixed(2)} USD equivalent to your provided details.
                  </p>
                </div>
                <button onClick={() => { setActiveTab('HISTORY'); setStep(1); setAmount(''); }} className="mt-8 w-full bg-slate-900 text-white p-5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-lg">
                  Track Status in History
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}