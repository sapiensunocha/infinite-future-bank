import React, { useState, useEffect } from 'react';
import NigeriaBankPayout from './components/NigeriaBankPayout';
import MobileMoneyAccounts from './components/MobileMoneyAccounts';
import { X, Landmark, MapPin, ShieldCheck, ArrowRight, CheckCircle, Loader2, Lock, Star, User, CreditCard, Globe, Smartphone, Wallet, HandCoins, ArrowLeft, Users, History, FileText, ExternalLink, AlertTriangle, Clock, Activity, Search, ShieldAlert, Check, Zap } from 'lucide-react';
import { supabase } from './services/supabaseClient';

const WITHDRAWAL_FEE_PCT = 0.005; // 0.5% IFB routing fee

// Flutterwave-supported mobile money networks per country
const FLW_NETWORKS = {
  "MTN":     ["GH","UG","RW","ZM","CM","CI","BJ","SN"],
  "Airtel":  ["UG","KE","TZ","MW","ZM"],
  "M-Pesa":  ["KE","TZ","MZ"],
  "Orange":  ["CM","SN","CI","ML","GN","BF","MG"],
  "Wave":    ["SN","CI","ML","BF","GN","GM"],
  "Vodacom": ["TZ","CD"],
  "Moov":    ["TG","BJ","CI","ML","SN"],
  "TNM":     ["MW"],
};

const COUNTRY_OPTIONS = [
  { code:"GH", label:"Ghana" },      { code:"NG", label:"Nigeria" },
  { code:"KE", label:"Kenya" },      { code:"TZ", label:"Tanzania" },
  { code:"UG", label:"Uganda" },     { code:"RW", label:"Rwanda" },
  { code:"SN", label:"Senegal" },    { code:"CI", label:"Côte d'Ivoire" },
  { code:"CM", label:"Cameroon" },   { code:"ZM", label:"Zambia" },
  { code:"MW", label:"Malawi" },     { code:"MZ", label:"Mozambique" },
  { code:"ML", label:"Mali" },       { code:"BF", label:"Burkina Faso" },
  { code:"GN", label:"Guinea" },     { code:"TG", label:"Togo" },
  { code:"BJ", label:"Benin" },      { code:"CD", label:"DR Congo" },
  { code:"MG", label:"Madagascar" }, { code:"GM", label:"Gambia" },
];

export default function WithdrawalPage({ userBalance = 0, userId, onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState('NEW'); // 'NEW' or 'HISTORY'
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Flutterwave Mobile Money state
  const [flwNetwork, setFlwNetwork] = useState('MTN');
  const [flwCountry, setFlwCountry] = useState('GH');
  const [flwPhone, setFlwPhone] = useState('');
  const [flwResult, setFlwResult] = useState(null);

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

  // Card payout (cards are saved encrypted by the payout-cards function; only brand/last 4 are readable here)
  const [payoutCards, setPayoutCards] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState('new');
  const [cardForm, setCardForm] = useState({ holder: '', number: '', expiry: '' });
  const [cardPayoutDone, setCardPayoutDone] = useState(null);

  // Standard Bank/Card Form State
  const [bankType, setBankType] = useState('ach'); 
  const [formData, setFormData] = useState({
    accountName: '', accountNumber: '', routingNumber: '', iban: '', swiftBic: '', country: ''
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
      showToast('Could not load withdrawal history. Pull to refresh.', true);
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

  const withdrawalFee = amount ? parseFloat((parseFloat(amount) * WITHDRAWAL_FEE_PCT).toFixed(2)) : 0;
  const withdrawalTotal = amount ? parseFloat((parseFloat(amount) + withdrawalFee).toFixed(2)) : 0;

  const handleAmountSubmit = (e) => {
    e.preventDefault();
    setError('');
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return showToast("Enter a valid amount.", true);
    if (withdrawalTotal > userBalance) return showToast(`Insufficient funds. Need $${withdrawalTotal.toFixed(2)} ($${numAmount.toFixed(2)} + $${withdrawalFee.toFixed(2)} routing fee).`, true);
    setStep(2);
  };

  const handleFlwMobileMoney = async (e) => {
    e.preventDefault();
    setError('');
    if (!flwPhone) return showToast('Enter your mobile number.', true);
    if (withdrawalTotal > userBalance) return showToast(`Insufficient funds. Need $${withdrawalTotal.toFixed(2)}.`, true);

    setIsProcessing(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('flutterwave-transfer', {
        body: { amount: parseFloat(amount), network: flwNetwork, country: flwCountry, phone: flwPhone },
      });

      if (fnErr) throw fnErr;

      if (data?.flw_supported === false) {
        // Network not supported in this country — fall through to human processor
        showToast(`${flwNetwork} in ${flwCountry} not yet automated. Routing to Community of Trust.`, false);
        setP2pFiatMethod('Mobile Money');
        setP2pReceivingDetails(`${flwNetwork} — ${flwPhone}`);
        await handleFindProcessors('Mobile Money', `${flwNetwork} — ${flwPhone}`);
        return;
      }

      if (data?.error) throw new Error(data.error);

      setFlwResult(data);
      setStep(5); // go straight to success
      if (onSuccess) onSuccess();
    } catch (err) {
      showToast(err.message || 'Flutterwave transfer failed. Please try again.', true);
    } finally {
      setIsProcessing(false);
    }
  };

  const availableNetworksForCountry = Object.entries(FLW_NETWORKS)
    .filter(([, countries]) => countries.includes(flwCountry))
    .map(([network]) => network);

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
      // Network error or no processors found — use IFB Global Operations as fallback
      setNearbyBankers([{
        id: 'ifb-global', full_name: 'IFB Global Operations', cot_rating: 100,
        cot_completed_tx: 15420, location: 'Secure Remote Node', avg_time: '12 mins'
      }]);
    } finally {
      setIsLoadingBankers(false);
    }
  };

  const loadPayoutCards = async () => {
    const { data } = await supabase.from('payout_cards')
      .select('id, brand, last4, exp_month, exp_year, holder_name').eq('status', 'active').order('created_at', { ascending: false });
    setPayoutCards(data || []);
    setSelectedCardId((data && data[0]?.id) || 'new');
  };
  useEffect(() => { if (bankType === 'card') loadPayoutCards(); }, [bankType]);

  const handleCardPayout = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setError('');
    try {
      let cardId = selectedCardId;
      if (cardId === 'new') {
        const [mm, yy] = cardForm.expiry.split('/');
        const { data, error: fnErr } = await supabase.functions.invoke('payout-cards', {
          body: { action: 'add', holder_name: cardForm.holder, number: cardForm.number, exp_month: Number(mm), exp_year: Number(yy) },
        });
        if (fnErr || data?.error) {
          let msg = data?.error;
          try { msg = msg || (await fnErr?.context?.json())?.error; } catch { /* ignore */ }
          throw new Error(msg || 'Could not save this card.');
        }
        cardId = data.card.id;
      }
      const { data: res, error: rpcErr } = await supabase.rpc('request_card_payout', { p_card_id: cardId, p_amount: parseFloat(amount) });
      if (rpcErr) throw rpcErr;
      if (!res?.success) throw new Error(res?.error || 'Card withdrawal could not be started.');
      setCardForm({ holder: '', number: '', expiry: '' });
      setCardPayoutDone(res);
      onSuccess?.();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setIsProcessing(false);
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
    }

    handleFindProcessors(methodLabel, details);
  };

  const handleProcessP2pWithdrawal = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setError('');
    
    // IFB Global fallback uses sapiens@infinitefuturebank.org as the real processor
    const IFB_GLOBAL_PROCESSOR_ID = 'e8d9447e-9d5b-425f-97c2-a925693bdc1a';
    const realProcessorId = (selectedProcessor.id === '1' || selectedProcessor.id === 'ifb-global')
      ? IFB_GLOBAL_PROCESSOR_ID
      : selectedProcessor.id;

    try {
      const { data: orderData, error: orderError } = await supabase.from('p2p_orders').insert([{
        user_id: userId,
        processor_id: realProcessorId,
        order_type: 'withdraw',
        amount_usd: parseFloat(amount),
        payment_method: `${p2pFiatMethod}${p2pReceivingDetails ? ' - ' + p2pReceivingDetails : ''}`,
        status: 'open'
      }]).select().single();

      if (orderError) throw orderError;

      const { error: rpcError } = await supabase.rpc('process_p2p_escrow', {
        p_order_id: orderData.id,
        p_action: 'lock_withdraw'
      });

      if (rpcError) {
        // Clean up orphaned order so it doesn't show as stuck OPEN
        await supabase.from('p2p_orders').update({ status: 'cancelled' }).eq('id', orderData.id);
        throw rpcError;
      }

      // From here on the funds are already locked in escrow: nothing below may
      // turn this into an error for the user.
      //
      // The 0.5% routing fee is NOT logged here any more. The client-side
      // deduction was removed on 2026-10-27, so the fee is never taken from the
      // balance; a "completed" ledger line for it would be false. The old
      // logging call also used .catch() on a Supabase query builder, which has
      // no .catch(): it threw "…catch is not a function" right after a
      // successful escrow lock, so every P2P/bank withdrawal showed an error.
      // TODO: charge the fee server-side inside process_p2p_escrow.

      // Best effort: a failed insert returns { error } and does not throw.
      await supabase.from('notifications').insert([{
        user_id: realProcessorId,
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
    <div className="p-5 md:p-6 w-full animate-in fade-in duration-200 relative flex flex-col h-full bg-white">
      
      {/* Header & Tabs */}
      <div className="flex flex-col gap-4 pb-4 mb-5 border-b border-slate-100 sticky top-0 z-20 bg-white">
        <div className="flex items-center justify-between">
          <h2 className="ui-sheet-title">Withdraw</h2>
          <button onClick={onClose} aria-label="Close" className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"><X size={18} /></button>
        </div>
        <div className="ui-segment">
          <button onClick={() => setActiveTab('NEW')} className={activeTab === 'NEW' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'}>Withdraw</button>
          <button onClick={() => setActiveTab('HISTORY')} className={activeTab === 'HISTORY' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'}>History</button>
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
        <div className="fixed inset-0 z-[999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl overflow-hidden max-w-4xl w-full shadow-2xl flex flex-col md:flex-row">
            
            {/* Left: Document View */}
            <div className="md:w-2/3 bg-slate-100 flex flex-col border-r border-slate-200">
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><FileText size={18}/> Processor Receipt</h3>
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
                  <h4 className="font-bold text-slate-800 text-lg">AI Verification</h4>
                  <button onClick={() => setSelectedOrderProof(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><X size={20}/></button>
                </div>
                
                {selectedOrderProof.metadata?.extracted_amount ? (
                  <div className={`p-4 rounded-2xl mb-6 space-y-3 relative overflow-hidden border ${selectedOrderProof.ai_verification_status === 'verified' ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-200'}`}>
                    <div className="absolute top-0 right-0 p-2 opacity-20"><ShieldCheck size={40} className={selectedOrderProof.ai_verification_status === 'verified' ? 'text-blue-600' : 'text-red-600'}/></div>
                    <p className={`text-xs font-semibold mb-2 flex items-center gap-1 ${selectedOrderProof.ai_verification_status === 'verified' ? 'text-blue-600' : 'text-red-600'}`}>
                      <Activity size={12}/> AI Data Extraction {selectedOrderProof.ai_verification_status === 'verified' ? '(Match)' : '(Discrepancy)'}
                    </p>
                    <div>
                      <p className="text-xs text-slate-500 font-bold">Detected Amount</p>
                      <p className={`font-bold ${selectedOrderProof.ai_verification_status === 'verified' ? 'text-slate-800' : 'text-red-600 text-lg'}`}>
                        ${selectedOrderProof.metadata.extracted_amount} <span className="text-xs font-bold text-slate-400 block mt-0.5">Expected: ${selectedOrderProof.amount_usd.toFixed(2)}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-bold">Date / Time</p>
                      <p className="font-bold text-slate-800">{selectedOrderProof.metadata.extracted_date || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-bold">Reference #</p>
                      <p className="font-bold text-slate-800 text-xs break-all">{selectedOrderProof.metadata.extracted_ref_id || 'N/A'}</p>
                    </div>
                    {(selectedOrderProof.metadata.sender_name || selectedOrderProof.metadata.receiver_name) && (
                      <div className="pt-2 border-t border-blue-200/50">
                        <p className="text-xs text-slate-500 font-bold mb-1">Parties Detected</p>
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
                  <p className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1"><AlertTriangle size={12}/> Warning</p>
                  <p className="text-xs font-medium text-amber-800/80 leading-relaxed">Check your actual bank/wallet account. Do not release escrow unless the funds are physically available to you.</p>
                </div>
              </div>

              <div className="space-y-3 mt-6">
                <button onClick={() => confirmReceipt(selectedOrderProof.id)} disabled={isProcessing} className="ui-btn ui-btn-primary">
                  <Check size={16}/> I Received The Funds
                </button>
                <button onClick={() => openDispute(selectedOrderProof.id)} disabled={isProcessing} className="w-full py-3 bg-white border-2 border-red-100 text-red-500 rounded-xl text-sm font-semibold hover:bg-red-50 hover:border-red-200 transition-colors shadow-sm disabled:opacity-50">
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
                        <span className="text-xs font-semibold text-slate-500">#{order.id.substring(0,8)}</span>
                        <span className="flex items-center gap-1 text-xs font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                          <Clock size={10}/> {getTimeElapsed(order.created_at, order.updated_at, order.status)}
                        </span>
                      </div>
                      <h3 className="text-3xl font-bold text-slate-800">${order.amount_usd.toFixed(2)}</h3>
                      <p className="text-xs font-bold text-slate-500 mt-2">{order.payment_method}</p>
                      
                      <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center"><User size={14}/></div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500">Processor</p>
                          <p className="text-sm font-bold text-slate-700">{order.processor?.full_name || 'Network Matching...'}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Right: Uber-Style Status Tracker */}
                    <div className="md:w-2/3 flex flex-col justify-center">
                       {order.status === 'disputed' ? (
                         <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-center">
                           <AlertTriangle size={32} className="mx-auto text-red-500 mb-2"/>
                           <h4 className="font-semibold text-red-700">Transaction Disputed</h4>
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
                               <span className="text-xs font-semibold text-slate-500 text-center">Escrow<br/>Locked</span>
                             </div>

                             {/* Step 2 */}
                             <div className="flex flex-col items-center gap-2">
                               <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${order.status === 'proof_verified' || order.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' : order.status === 'open' || order.status === 'locked_in_escrow' ? 'bg-blue-500 border-blue-500 text-white animate-pulse' : 'bg-white border-slate-200 text-slate-300'}`}>
                                 <Activity size={12}/>
                               </div>
                               <span className="text-xs font-semibold text-slate-500 text-center">Processor<br/>Routing</span>
                             </div>

                             {/* Step 3 */}
                             <div className="flex flex-col items-center gap-2">
                               <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${order.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' : order.status === 'proof_verified' ? 'bg-amber-500 border-amber-500 text-white animate-bounce' : 'bg-white border-slate-200 text-slate-300'}`}>
                                 <FileText size={12}/>
                               </div>
                               <span className="text-xs font-semibold text-slate-500 text-center">Proof<br/>Verified</span>
                             </div>

                             {/* Step 4 */}
                             <div className="flex flex-col items-center gap-2">
                               <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${order.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-200 text-slate-300'}`}>
                                 <CheckCircle size={12}/>
                               </div>
                               <span className="text-xs font-semibold text-slate-500 text-center">Funds<br/>Settled</span>
                             </div>
                           </div>

                           {/* Dynamic Action Button below Tracker */}
                           {order.status === 'proof_verified' && (
                             <div className="mt-8 text-center animate-in slide-in-from-bottom-2">
                               <button onClick={() => setSelectedOrderProof(order)} className="px-8 py-3 bg-blue-600 text-white rounded-full text-sm font-semibold hover:bg-blue-500 shadow-lg transition-all animate-pulse flex items-center justify-center gap-2 mx-auto">
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
                  <p className="text-sm font-bold text-slate-500">Available balance</p>
                  <p className="text-3xl font-bold text-slate-800">${parseFloat(userBalance).toFixed(2)}</p>
                </div>

                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-300">$</span>
                  <input 
                    type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)}
                    className="ui-input pl-12 text-3xl h-16"
                    placeholder="0.00"
                  />
                </div>

                {amount && parseFloat(amount) > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-sm">
                    <div className="flex justify-between font-bold text-slate-600">
                      <span>You Receive</span>
                      <span>${parseFloat(amount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-600">
                      <span>Fee (0.5%)</span>
                      <span className="text-amber-600">${withdrawalFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-800 border-t border-slate-200 pt-2">
                      <span>Total taken from your balance</span>
                      <span>${withdrawalTotal.toFixed(2)}</span>
                    </div>
                  </div>
                )}
                <button type="submit" className="ui-btn ui-btn-primary">
                  Continue <ArrowRight size={20} />
                </button>
              </form>
            )}

            {/* STEP 2: METHOD SELECTION */}
            {step === 2 && (
              <div className="space-y-4 animate-in slide-in-from-right-4">
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl mb-6">
                  <p className="text-sm font-bold text-blue-800 text-center">Choose how to receive your <span className="font-bold">${amount}</span></p>
                </div>

                {/* Option 0: Nigerian bank account — direct Flutterwave transfer, no agent */}
                <button onClick={() => { setMethod('NGBANK'); setStep(3); }} className="w-full flex items-center justify-between p-5 rounded-2xl border-2 border-blue-100 bg-blue-50/40 hover:bg-blue-50 transition-all text-left relative overflow-hidden group">
                  <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-bl-lg shadow-sm">Direct</div>
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-xl group-hover:scale-110 transition-transform"><Landmark size={24} /></div>
                    <div>
                      <p className="font-bold text-slate-800">Nigerian bank account</p>
                      <p className="text-xs font-bold text-blue-600 mt-0.5">Any bank or Opay / Moniepoint · paid in Naira</p>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-blue-400" />
                </button>

                {/* Option 1: P2P */}
                <button 
                  onClick={() => { setMethod('P2P'); setStep(3); }} 
                  className="w-full flex items-center justify-between p-5 rounded-2xl border-2 border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 transition-all text-left relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-bl-lg shadow-sm">Agent</div>
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform"><MapPin size={24} /></div>
                    <div>
                      <p className="font-bold text-slate-800">Local agent</p>
                      <p className="text-xs font-bold text-emerald-600 mt-0.5">Cash, local bank or mobile money via a verified agent</p>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-emerald-400" />
                </button>

                {/* Option 2: Standard Bank */}
                <button onClick={() => { setMethod('BANK'); setStep(3); }} className="w-full flex items-center justify-between p-5 rounded-2xl border-2 border-slate-100 hover:border-blue-100 hover:bg-blue-50/50 transition-all text-left group">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-100 text-slate-600 rounded-xl group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors"><Landmark size={24} /></div>
                    <div>
                      <p className="font-bold text-slate-800">International bank or card</p>
                      <p className="text-xs font-bold text-slate-400 mt-0.5">US ACH & SWIFT via a verified agent · card payouts by IFB</p>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                </button>

                <button onClick={() => setStep(1)} className="w-full text-center text-xs font-bold text-slate-500 pt-4 hover:text-slate-600">Go Back</button>
              </div>
            )}

            {/* STEP 3 (N): NIGERIAN BANK — direct transfer */}
            {step === 3 && method === 'NGBANK' && (
              <NigeriaBankPayout amount={amount} onBack={() => setStep(2)} onDone={() => onSuccess?.()} />
            )}

            {/* STEP 3 (A): GLOBAL BANK WITHDRAWAL (Routes to P2P) */}
            {step === 3 && method === 'BANK' && (
              <form onSubmit={bankType === 'card' ? handleCardPayout : handleBankToP2PTransition} className="space-y-5 animate-in slide-in-from-right-4">
                <button type="button" onClick={() => setStep(2)} className="text-sm font-semibold text-slate-500 hover:text-slate-600 flex items-center gap-2 mb-2 transition-colors">
                  <ArrowLeft size={14}/> Back
                </button>

                <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                  <button type="button" onClick={() => {setBankType('ach'); setError('');}} className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1 ${bankType === 'ach' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    <Landmark size={14} /> US ACH
                  </button>
                  <button type="button" onClick={() => {setBankType('swift'); setError('');}} className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1 ${bankType === 'swift' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    <Globe size={14} /> SWIFT
                  </button>
                  <button type="button" onClick={() => {setBankType('card'); setError(''); setCardPayoutDone(null);}} className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1 ${bankType === 'card' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    <CreditCard size={14} /> Card
                  </button>
                </div>

                <div className="space-y-3 min-h-[180px]">
                  {bankType === 'ach' && (
                    <div className="animate-in fade-in space-y-3">
                      <input required type="text" placeholder="Account Holder Name" value={formData.accountName} onChange={e => setFormData({...formData, accountName: e.target.value})} className="ui-input" />
                      <input required type="text" placeholder="ABA Routing Number (9 digits)" maxLength="9" value={formData.routingNumber} onChange={e => setFormData({...formData, routingNumber: e.target.value.replace(/\D/g, '')})} className="ui-input tracking-widest" />
                      <input required type="text" placeholder="Account Number" value={formData.accountNumber} onChange={e => setFormData({...formData, accountNumber: e.target.value.replace(/\D/g, '')})} className="ui-input tracking-widest" />
                    </div>
                  )}

                  {bankType === 'swift' && (
                    <div className="animate-in fade-in space-y-3">
                      <input required type="text" placeholder="Account Holder Name" value={formData.accountName} onChange={e => setFormData({...formData, accountName: e.target.value})} className="ui-input" />
                      <input required type="text" placeholder="IBAN" value={formData.iban} onChange={e => setFormData({...formData, iban: e.target.value.toUpperCase()})} className="ui-input tracking-wider" />
                      <div className="flex gap-3">
                        <input required type="text" placeholder="SWIFT / BIC Code" value={formData.swiftBic} onChange={e => setFormData({...formData, swiftBic: e.target.value.toUpperCase()})} className="ui-input flex-1 tracking-wider" />
                        <input required type="text" placeholder="Country (e.g. GB)" maxLength="2" value={formData.country} onChange={e => setFormData({...formData, country: e.target.value.toUpperCase()})} className="ui-input w-1/3 text-center" />
                      </div>
                    </div>
                  )}

                  {bankType === 'card' && cardPayoutDone && (
                    <div className="animate-in fade-in p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                      <CheckCircle size={28} className="mx-auto text-emerald-600" />
                      <p className="font-bold text-emerald-800">${Number(cardPayoutDone.amount).toFixed(2)} on its way to {cardPayoutDone.card}</p>
                      <p className="text-xs font-bold text-emerald-700">The money is held safely while IFB sends it to your card. You will get a notification when it arrives. If it fails, the money comes straight back to your wallet.</p>
                    </div>
                  )}

                  {bankType === 'card' && !cardPayoutDone && (
                    <div className="animate-in fade-in space-y-3">
                      {payoutCards.length > 0 && (
                        <div className="space-y-2">
                          {payoutCards.map(c => (
                            <button key={c.id} type="button" onClick={() => setSelectedCardId(c.id)}
                              className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${selectedCardId === c.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                              <CreditCard size={18} className="text-slate-500" />
                              <span className="font-bold text-slate-800 text-sm">{c.brand} •••• {c.last4}</span>
                              <span className="ml-auto text-xs font-bold text-slate-400">{String(c.exp_month).padStart(2, '0')}/{String(c.exp_year).slice(-2)}</span>
                            </button>
                          ))}
                          <button type="button" onClick={() => setSelectedCardId('new')}
                            className={`w-full p-3 rounded-xl border-2 text-xs font-semibold ${selectedCardId === 'new' ? 'border-blue-500 text-blue-700 bg-blue-50' : 'border-dashed border-slate-300 text-slate-500'}`}>
                            + Use a new card
                          </button>
                        </div>
                      )}
                      {selectedCardId === 'new' && (
                        <>
                          <input required type="text" placeholder="Name on Card" autoComplete="cc-name" value={cardForm.holder} onChange={e => setCardForm({ ...cardForm, holder: e.target.value })} className="ui-input" />
                          <div className="relative">
                            <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input required type="text" inputMode="numeric" autoComplete="cc-number" placeholder="Card Number" maxLength="23"
                              value={cardForm.number}
                              onChange={e => setCardForm({ ...cardForm, number: e.target.value.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ') })}
                              className="ui-input pl-12 tracking-widest" />
                          </div>
                          <input required type="text" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/YY" maxLength="5" pattern="(0[1-9]|1[0-2])/[0-9]{2}"
                            value={cardForm.expiry}
                            onChange={e => { let v = e.target.value.replace(/\D/g, '').slice(0, 4); if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2); setCardForm({ ...cardForm, expiry: v }); }}
                            className="ui-input text-center tracking-widest" />
                        </>
                      )}
                      <p className="text-[11px] font-bold text-slate-500 flex items-start gap-2">
                        <Lock size={12} className="mt-0.5 shrink-0" />
                        No CVC needed. Your card number is encrypted and never shown to agents or stored in readable form.
                      </p>
                    </div>
                  )}
                </div>

                {!(bankType === 'card' && cardPayoutDone) && (
                <button type="submit" disabled={isProcessing} className="ui-btn ui-btn-primary mt-6">
                  {isProcessing ? <Loader2 className="animate-spin" size={16} /> : bankType === 'card' ? <>Withdraw ${amount} to card <ArrowRight size={16}/></> : <>Continue <ArrowRight size={16}/></>}
                </button>
                )}
              </form>
            )}

            {/* STEP 3 (B): P2P FIAT METHOD */}
            {step === 3 && method === 'P2P' && (
              <div className="space-y-6 animate-in slide-in-from-right-4">
                <button type="button" onClick={() => setStep(2)} className="text-sm font-semibold text-slate-500 hover:text-slate-600 flex items-center gap-2 transition-colors">
                  <ArrowLeft size={14}/> Back
                </button>

                <div>
                  <label className="ui-label">How do you want to receive the money?</label>
                  <div className="grid grid-cols-2 gap-3">
                    {fiatOptions.map((option) => (
                      <button
                        key={option.id} onClick={() => setP2pFiatMethod(option.id)}
                        className={`flex flex-col items-start p-4 rounded-2xl border-2 transition-all text-left ${
                          p2pFiatMethod === option.id 
                            ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-sm' 
                            : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        <div className={`mb-2 ${p2pFiatMethod === option.id ? 'text-blue-600' : 'text-slate-400'}`}>
                          {option.icon}
                        </div>
                        <span className="font-bold text-sm leading-tight mb-1">{option.label}</span>
                        <span className="text-xs font-semibold text-slate-500">{option.type === 'local' ? 'Collect in person' : 'Paid to your account'}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mobile Money → Instant FLW payout form */}
                {p2pFiatMethod === 'Mobile Money' && (
                  <form onSubmit={handleFlwMobileMoney} className="animate-in fade-in slide-in-from-bottom-2 space-y-4">
                    {availableNetworksForCountry.length > 0 && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
                        <Zap size={14} className="text-emerald-600 shrink-0"/>
                        <p className="text-xs font-semibold text-emerald-700">Instant via Flutterwave — no human processor needed</p>
                      </div>
                    )}

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <MobileMoneyAccounts
                        userId={userId}
                        onSelectAccount={(acc) => {
                          if (acc.network) setFlwNetwork(acc.network);
                          if (acc.country) setFlwCountry(acc.country);
                          if (acc.phone) setFlwPhone(acc.phone);
                        }}
                      />
                    </div>

                    <div>
                      <label className="ui-label">Country</label>
                      <select
                        value={flwCountry} onChange={(e) => { setFlwCountry(e.target.value); setFlwNetwork(Object.entries(FLW_NETWORKS).find(([, c]) => c.includes(e.target.value))?.[0] ?? 'MTN'); }}
                        className="ui-select"
                      >
                        {COUNTRY_OPTIONS.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="ui-label">Network</label>
                      {availableNetworksForCountry.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {availableNetworksForCountry.map(n => (
                            <button key={n} type="button"
                              onClick={() => setFlwNetwork(n)}
                              className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${flwNetwork === n ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                            >{n}</button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 p-3 rounded-xl">
                          Instant mobile money payout is not available for this country yet. A verified local agent will send the money to this number instead.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="ui-label">Recipient Mobile Number</label>
                      <input
                        type="tel" required value={flwPhone} onChange={(e) => setFlwPhone(e.target.value)}
                        placeholder="+233XXXXXXXXX (international format)"
                        className="ui-input"
                      />
                      <p className="text-xs text-slate-400 font-bold mt-1">Include country code, e.g. +233 for Ghana.</p>
                    </div>

{availableNetworksForCountry.length > 0 ? (
                    <button
                      type="submit" disabled={isProcessing}
                      className="ui-btn ui-btn-primary"
                    >
                      {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <><Zap size={16}/> Send ${amount} via {flwNetwork} Instantly</>}
                    </button>
                    ) : (
                    <button
                      type="button" disabled={isProcessing || isLoadingBankers || flwPhone.replace(/\D/g, '').length < 8}
                      onClick={() => {
                        const label = COUNTRY_OPTIONS.find(c => c.code === flwCountry)?.label || flwCountry;
                        handleFindProcessors('Mobile Money', `${label} · ${flwPhone.trim()}`);
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs p-5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isLoadingBankers ? <Loader2 className="animate-spin" size={16} /> : <>Find a local agent to send ${amount}</>}
                    </button>
                    )}
                  </form>
                )}

                {/* All other methods (Local Bank, Digital Wallet, Cash) → human P2P processor */}
                {p2pFiatMethod !== 'Mobile Money' && p2pFiatMethod !== 'Physical Cash Pickup' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2">
                    <label className="ui-label">
                      Your {p2pFiatMethod} Details
                    </label>
                    <textarea
                      value={p2pReceivingDetails}
                      onChange={(e) => setP2pReceivingDetails(e.target.value)}
                      placeholder={`E.g. Bank Name, Account Number, or Mobile Money Number...`}
                      className="ui-textarea h-24 resize-none"
                    />
                    <p className="text-xs text-slate-400 font-bold mt-2">Only the agent you choose sees these details, to pay you.</p>
                  </div>
                )}
                
                {p2pFiatMethod === 'Physical Cash Pickup' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2">
                    <label className="ui-label">
                      Your City / Region
                    </label>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
                      <input 
                        type="text"
                        value={p2pReceivingDetails}
                        onChange={(e) => setP2pReceivingDetails(e.target.value)}
                        placeholder="e.g. Bukavu, DRC or New York, USA"
                        className="ui-input pl-10"
                      />
                    </div>
                    <p className="text-xs text-slate-400 font-bold mt-2">We will route your escrow request to an agent in this vicinity.</p>
                  </div>
                )}

                {p2pFiatMethod !== 'Mobile Money' && (
                  <button
                    onClick={() => handleFindProcessors()}
                    disabled={isLoadingBankers}
                    className="ui-btn ui-btn-primary"
                  >
                    {isLoadingBankers ? <Loader2 className="animate-spin" size={16} /> : 'Find an agent'}
                  </button>
                )}
              </div>
            )}

            {/* STEP 4: ADVANCED PROCESSOR SELECTION (No Map) */}
            {step === 4 && (
              <div className="space-y-6 animate-in slide-in-from-right-4">
                <div className="flex justify-between items-center mb-2">
                  <button onClick={() => setStep(3)} className="text-sm font-semibold text-slate-500 hover:text-slate-600 flex items-center gap-2 transition-colors">
                    <ArrowLeft size={14}/> Edit details
                  </button>
                  <p className="text-xs font-semibold text-emerald-500 flex items-center gap-2">
                    <Activity size={14}/> Live
                  </p>
                </div>
                
                {isLoadingBankers ? (
                  <div className="py-12 flex flex-col items-center justify-center bg-slate-50 rounded-3xl border border-slate-100">
                    <div className="relative mb-4">
                      <Search size={32} className="text-emerald-500 relative z-10"/>
                      <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-20 scale-150"></div>
                    </div>
                    <p className="text-xs font-semibold text-slate-500">Loading…</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>
                      <h3 className="text-xl font-bold mb-1">Agents near you</h3>
                      <p className="text-xs text-slate-400 font-bold mb-6">Choose an agent. Your money is held safely until they confirm the payout.</p>
                      
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
                                <p className={`font-bold text-base leading-tight ${selectedProcessor?.id === banker.id ? 'text-slate-900' : 'text-white'}`}>{banker.full_name}</p>
                                <p className={`text-xs font-semibold mt-1 flex items-center gap-1 ${selectedProcessor?.id === banker.id ? 'text-emerald-600' : 'text-slate-400'}`}><MapPin size={10}/> {banker.location}</p>
                                <div className="flex items-center gap-3 mt-2">
                                  <span className="flex items-center gap-1 text-xs font-bold text-amber-500"><Star size={10} className="fill-amber-500"/> {banker.cot_rating}% Trust</span>
                                  <span className={`flex items-center gap-1 text-xs font-bold ${selectedProcessor?.id === banker.id ? 'text-slate-500' : 'text-slate-400'}`}><Clock size={10}/> ~{banker.avg_time}</span>
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
                      className="ui-btn ui-btn-primary mt-4"
                    >
                      {isProcessing ? <Loader2 className="animate-spin" size={16}/> : `Send request to ${selectedProcessor ? selectedProcessor.full_name.split(' ')[0] : 'agent'}`}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* STEP 5: SUCCESS */}
            {step === 5 && (
              <div className="py-10 text-center space-y-4 animate-in zoom-in-95 duration-300">
                <div className={`mx-auto w-24 h-24 border-8 rounded-full flex items-center justify-center mb-6 shadow-inner ${flwResult ? 'bg-emerald-50 border-emerald-100 text-emerald-500' : 'bg-emerald-50 border-emerald-100 text-emerald-500'}`}>
                  {flwResult ? <Zap size={40} strokeWidth={3} /> : <CheckCircle size={40} strokeWidth={3} />}
                </div>
                <div>
                  {flwResult ? (
                    <>
                      <h3 className="text-2xl font-bold text-slate-800 mb-2">Sent Instantly via Flutterwave</h3>
                      <p className="text-slate-500 font-bold text-sm leading-relaxed px-4">
                        <strong>${parseFloat(amount).toFixed(2)}</strong> is being delivered to <strong>{flwPhone}</strong> via <strong>{flwNetwork}</strong>. No human processor needed.
                      </p>
                      <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-left space-y-1">
                        <p className="text-xs font-semibold text-emerald-600 mb-2">Transaction Reference</p>
                        <p className="font-mono text-xs font-bold text-slate-700 break-all">{flwResult.reference}</p>
                        <p className="text-xs text-slate-400 font-bold">Funds typically arrive within 1–5 minutes.</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="text-2xl font-bold text-slate-800 mb-2">Withdrawal requested</h3>
                      <p className="text-slate-500 font-bold text-sm leading-relaxed px-4">
                        Your digital funds are locked in Escrow. <strong>{selectedProcessor?.full_name}</strong> has been notified to send {parseFloat(amount).toFixed(2)} USD equivalent to your provided details.
                      </p>
                    </>
                  )}
                </div>
                <button onClick={() => { setActiveTab('HISTORY'); setStep(1); setAmount(''); setFlwResult(null); }} className="ui-btn ui-btn-primary mt-8">
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