import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import { 
  ArrowRightLeft, ShieldCheck, Loader2, DollarSign, TrendingUp, 
  MapPin, CheckCircle2, Clock, Search, UploadCloud, AlertTriangle,
  Users, Banknote, Star, FileText, CheckCircle, ScanLine
} from 'lucide-react';

export default function P2PExchange({ session, profile, balances, fetchAllData }) {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ORDER_BOOK'); // ORDER_BOOK, ACTIVE_TRADES, SETTINGS
  
  // Data States
  const [openOrders, setOpenOrders] = useState([]);
  const [myTrades, setMyTrades] = useState([]);
  const [cotStats, setCotStats] = useState({ earned: 0, completed: 0, rating: 100 });
  const [isOnline, setIsOnline] = useState(true);

  // Application State (For non-processors)
  const [applyForm, setApplyForm] = useState({ businessType: 'merchant', location: '', volume: '' });
  const [isApplying, setIsApplying] = useState(false);

  // Action States
  const [processingId, setProcessingId] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    fetchExchangeData();
  }, [profile]);

  const fetchExchangeData = async () => {
    if (!profile?.is_cot_processor) {
      setIsLoading(false);
      return;
    }

    try {
      // Fetch open orders (Global Order Book)
      const { data: openData } = await supabase
        .from('p2p_orders')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false });
      
      if (openData) setOpenOrders(openData);

      // Fetch active trades claimed by this processor
      const { data: tradesData } = await supabase
        .from('p2p_orders')
        .select('*')
        .eq('processor_id', session.user.id)
        .in('status', ['locked_in_escrow', 'proof_uploaded', 'disputed'])
        .order('locked_at', { ascending: false });
        
      if (tradesData) setMyTrades(tradesData);

      // Set stats from actual profile
      setCotStats({
        earned: (profile.cot_completed_tx || 0) * 12.50, // Estimate based on volume
        completed: profile.cot_completed_tx || 0,
        rating: profile.cot_rating || 100
      });

    } catch (err) {
      console.error("Failed to fetch P2P data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyCot = async (e) => {
    e.preventDefault();
    setIsApplying(true);
    try {
      // Upgrades the user profile to processor status
      await supabase.from('profiles').update({ 
        is_cot_processor: true, 
        cot_rating: 100, 
        cot_completed_tx: 0 
      }).eq('id', session.user.id);
      
      await fetchAllData();
    } catch (err) {
      alert("Application failed.");
    } finally {
      setIsApplying(false);
    }
  };

  const claimOrder = async (order) => {
    if (balances.liquid_usd < order.amount_usd && order.order_type === 'deposit') {
      alert("Insufficient AFR liquidity to fulfill this deposit request. You must hold enough balance to lock in Escrow.");
      return;
    }

    setProcessingId(order.id);
    try {
      // Lock to this processor
      const { error: updateError } = await supabase
        .from('p2p_orders')
        .update({ processor_id: session.user.id })
        .eq('id', order.id);

      if (updateError) throw updateError;

      // Trigger Escrow Lock RPC
      const action = order.order_type === 'deposit' ? 'lock_deposit' : 'lock_withdraw';
      const { error: rpcError } = await supabase.rpc('process_p2p_escrow', {
        p_order_id: order.id,
        p_action: action
      });

      if (rpcError) throw rpcError;

      await fetchAllData();
      await fetchExchangeData();
      setActiveTab('ACTIVE_TRADES');
    } catch (err) {
      alert("Failed to claim order. Another node may have processed it.");
    } finally {
      setProcessingId(null);
    }
  };

  // ---------------------------------------------------------
  // REAL AI OCR EXTRACTION (Processor Proof Upload)
  // ---------------------------------------------------------
  const submitWithdrawalProof = async (trade) => {
    if (!uploadFile) return;
    setProcessingId(trade.id);
    setIsScanning(true);
    
    try {
      // 1. Upload the receipt to Supabase Storage
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `p2p_receipts/${session.user.id}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, uploadFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      // 2. Call the secure Supabase Edge Function
      const { data: aiData, error: aiError } = await supabase.functions.invoke('analyze-receipt-ocr', {
        body: { imageUrl: publicUrl, expectedAmount: trade.amount_usd }
      });

      if (aiError) throw new Error("AI Engine failed to connect.");
      if (aiData?.error) throw new Error(aiData.error);

      // 3. Update the Order in the database
      const { error: dbError } = await supabase.from('p2p_orders').update({
        status: 'proof_uploaded',
        proof_image_url: publicUrl,
        ai_verification_status: 'verified',
        metadata: {
          extracted_ref: aiData.extracted_ref_id,
          extracted_amount: aiData.extracted_amount,
          extracted_date: aiData.extracted_date
        }
      }).eq('id', trade.id);

      if (dbError) throw dbError;

      // 4. Ping the original user to confirm receipt so escrow releases the AFR
      await supabase.from('notifications').insert([{
        user_id: trade.user_id,
        type: 'p2p_withdrawal_request', 
        status: 'accepted', 
        message: `${profile.full_name} has dispatched your fiat and uploaded the AI-verified proof.`,
        amount: trade.amount_usd,
        related_user_id: session.user.id,
        metadata: { trade_id: trade.id }
      }]);
      
      setUploadFile(null);
      await fetchExchangeData();
    } catch (err) {
      console.error("Processor OCR Error:", err);
      alert(err.message || "Failed to scan receipt. Ensure the image is clear and amounts match.");
    } finally {
      setProcessingId(null);
      setIsScanning(false);
    }
  };

  const confirmDepositReceived = async (orderId) => {
    setProcessingId(orderId);
    try {
      // Processor confirms they got the physical cash/mobile money.
      // This releases the Escrow AFR to the user, and gives the Processor their 2% fee.
      const { error } = await supabase.rpc('process_p2p_escrow', {
        p_order_id: orderId,
        p_action: 'release_deposit'
      });

      if (error) throw error;
      
      await fetchAllData();
      await fetchExchangeData();
    } catch (err) {
      alert("Failed to finalize deposit and release escrow.");
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-emerald-500 mb-4" size={40}/><p className="text-slate-500 font-bold">Synchronizing Global Escrow Ledger...</p></div>;
  }

  // --- ONBOARDING SCREEN FOR NON-PROCESSORS ---
  if (!profile?.is_cot_processor) {
    return (
      <div className="max-w-2xl mx-auto py-10 animate-in fade-in zoom-in-95">
        <div className="text-center mb-10">
          <div className="w-24 h-24 bg-emerald-50 border border-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm"><Users size={40}/></div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-4">Join the Community of Trust</h2>
          <p className="text-sm text-slate-600 leading-relaxed font-medium">Turn your local liquidity into a yield-generating business. Become a verified IFB Processor to facilitate local fiat on/off ramps and earn a <strong className="text-emerald-600">2.00% standard fee</strong> on every transaction you clear.</p>
        </div>

        <form onSubmit={handleApplyCot} className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm space-y-6">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Entity Type</label>
            <select value={applyForm.businessType} onChange={e => setApplyForm({...applyForm, businessType: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-emerald-500">
              <option value="merchant">Registered Local Merchant / Shop</option>
              <option value="individual">High-Net-Worth Individual</option>
              <option value="cashpoint">Dedicated Mobile Money Kiosk</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Primary Operating Region</label>
            <input required type="text" placeholder="City, Country" value={applyForm.location} onChange={e => setApplyForm({...applyForm, location: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Estimated Monthly Liquidity Capacity (USD)</label>
            <input required type="number" placeholder="5000" value={applyForm.volume} onChange={e => setApplyForm({...applyForm, volume: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-emerald-500" />
          </div>
          
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-500 leading-relaxed font-medium">
            By applying, you agree to Level 2 KYC verification. IFB utilizes zero-trust AI monitoring on all processor accounts to prevent fraudulent escrow manipulation.
          </div>

          <button type="submit" disabled={isApplying} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-xl disabled:opacity-50">
            {isApplying ? 'Submitting Application...' : 'Submit Institutional Application'}
          </button>
        </form>
      </div>
    );
  }

  // --- THE PROCESSOR TERMINAL ---
  return (
    <div className="animate-in fade-in duration-500">
      {/* Processor Dashboard Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-lg md:col-span-2 relative overflow-hidden flex flex-col justify-center">
          <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10 flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">Total Processor Yield</p>
              <h3 className="text-4xl font-black">${cotStats.earned.toFixed(2)}</h3>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-white bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
                <Star size={14} className="text-amber-400 fill-amber-400"/>
                <span className="font-black text-sm">{cotStats.rating}%</span>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{cotStats.completed} Trades</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Required AFR Liquidity</p>
          <h4 className="text-2xl font-black text-slate-800">${parseFloat(balances.liquid_usd).toFixed(2)}</h4>
          <p className="text-xs font-bold text-slate-500 mt-1">Available for Escrow</p>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex flex-col justify-center items-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Terminal Status</p>
          <button 
            onClick={() => setIsOnline(!isOnline)}
            className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all border-2 ${isOnline ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
          >
            {isOnline ? 'Online (Accepting)' : 'Offline'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200 pb-px">
        <button onClick={() => setActiveTab('ORDER_BOOK')} className={`px-6 py-3 font-black text-[10px] uppercase tracking-widest border-b-2 transition-all ${activeTab === 'ORDER_BOOK' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Global Order Book</button>
        <button onClick={() => setActiveTab('ACTIVE_TRADES')} className={`px-6 py-3 font-black text-[10px] uppercase tracking-widest border-b-2 transition-all ${activeTab === 'ACTIVE_TRADES' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
          Active Trades {myTrades.length > 0 && <span className="ml-2 bg-emerald-500 text-white px-2 py-0.5 rounded-full">{myTrades.length}</span>}
        </button>
        <button onClick={() => setActiveTab('SETTINGS')} className={`px-6 py-3 font-black text-[10px] uppercase tracking-widest border-b-2 transition-all ${activeTab === 'SETTINGS' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Routing Settings</button>
      </div>

      {/* GLOBAL ORDER BOOK */}
      {activeTab === 'ORDER_BOOK' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex justify-between items-center mb-4 px-2">
            <h3 className="font-black text-sm text-slate-800 uppercase tracking-widest flex items-center gap-2"><Globe size={16} className="text-emerald-500"/> Live Routing Requests</h3>
            <span className="text-xs font-bold text-slate-400">Updating in real-time</span>
          </div>

          {openOrders.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <Search size={40} className="mx-auto text-slate-300 mb-4"/>
              <p className="font-black text-slate-600 text-lg">No open requests</p>
              <p className="text-xs font-bold text-slate-400 mt-1">The global order book is currently clear.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {openOrders.map(order => {
                const reward = order.amount_usd * 0.02; // 2% fixed processor fee
                return (
                  <div key={order.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${order.order_type === 'deposit' ? 'bg-blue-50 text-blue-600' : 'bg-indigo-50 text-indigo-600'}`}>
                        {order.order_type === 'deposit' ? <ArrowRightLeft size={24}/> : <Banknote size={24}/>}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${order.order_type === 'deposit' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
                            {order.order_type === 'deposit' ? 'User Deposit' : 'User Withdrawal'}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">{new Date(order.created_at).toLocaleTimeString()}</span>
                        </div>
                        <p className="font-black text-xl text-slate-800">${parseFloat(order.amount_usd).toFixed(2)}</p>
                        <p className="text-xs font-bold text-slate-500 flex items-center gap-1 mt-1"><MapPin size={12}/> {order.payment_method}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col md:items-end w-full md:w-auto mt-4 md:mt-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2">Reward: +${reward.toFixed(2)} AFR</p>
                      <button 
                        onClick={() => claimOrder(order)}
                        disabled={!isOnline || processingId === order.id}
                        className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {processingId === order.id ? <Loader2 size={14} className="animate-spin"/> : 'Claim & Lock Escrow'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ACTIVE TRADES (Processor's Workspace) */}
      {activeTab === 'ACTIVE_TRADES' && (
        <div className="space-y-6 animate-in fade-in">
          {myTrades.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <ShieldCheck size={40} className="mx-auto text-emerald-300 mb-4"/>
              <p className="font-black text-slate-600 text-lg">No active trades</p>
              <p className="text-xs font-bold text-slate-400 mt-1">Claim orders from the global book to begin routing.</p>
            </div>
          ) : (
            myTrades.map(trade => (
              <div key={trade.id} className="bg-white border-2 border-emerald-100 rounded-3xl p-6 shadow-md relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>
                
                <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
                  <div>
                    <h4 className="font-black text-slate-800 text-lg flex items-center gap-2">
                      {trade.order_type === 'deposit' ? 'Accepting Deposit' : 'Fulfilling Withdrawal'}
                      <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-1 rounded-md tracking-widest uppercase">Escrow Locked</span>
                    </h4>
                    <p className="text-xs font-bold text-slate-500 mt-1">ID: {trade.id.split('-')[0]}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Amount</p>
                    <p className="font-black text-2xl text-slate-800">${parseFloat(trade.amount_usd).toFixed(2)}</p>
                  </div>
                </div>

                {/* TRADE TYPE: WITHDRAWAL (Processor must SEND fiat to user) */}
                {trade.order_type === 'withdraw' && (
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Instructions</p>
                      <p className="text-sm font-bold text-slate-800">Send exactly <span className="text-emerald-600">${parseFloat(trade.amount_usd).toFixed(2)}</span> via {trade.payment_method.split(' - ')[0]}</p>
                      <p className="text-xs text-slate-600 mt-2 bg-white p-3 rounded-lg border border-slate-200 break-all font-mono">
                        {trade.payment_method.split(' - ')[1] || 'Contact user via integrated chat.'}
                      </p>
                    </div>

                    {trade.status === 'locked_in_escrow' && (
                      <div className="flex flex-col md:flex-row gap-4 items-center">
                        <label className={`flex-1 w-full flex items-center justify-center gap-2 border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all ${uploadFile ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 hover:border-emerald-400 bg-slate-50'}`}>
                          {uploadFile ? <CheckCircle2 className="text-emerald-500" size={20}/> : <UploadCloud className="text-slate-400" size={20}/>}
                          <span className="text-xs font-bold text-slate-600">{uploadFile ? uploadFile.name : 'Attach Payment Receipt'}</span>
                          <input type="file" className="hidden" onChange={e => setUploadFile(e.target.files[0])} />
                        </label>
                        <button 
                          onClick={() => submitWithdrawalProof(trade)}
                          disabled={!uploadFile || processingId === trade.id || isScanning}
                          className="w-full md:w-auto bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest px-8 py-4 rounded-xl transition-all hover:bg-emerald-500 shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isScanning && processingId === trade.id ? <><ScanLine className="animate-pulse" size={16}/> Extracting Data...</> : <><ScanLine size={16}/> Scan & Upload to AI</>}
                        </button>
                      </div>
                    )}

                    {trade.status === 'proof_uploaded' && (
                      <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center gap-3">
                        <CheckCircle className="text-blue-500" size={20}/>
                        <div>
                          <p className="font-bold text-sm text-blue-900">Proof Uploaded & Verified</p>
                          <p className="text-xs text-blue-700">Waiting for user to confirm receipt of the physical fiat to release your AFR reward.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TRADE TYPE: DEPOSIT (Processor must RECEIVE fiat from user) */}
                {trade.order_type === 'deposit' && (
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Instructions</p>
                      <p className="text-sm font-bold text-slate-800">You are receiving <span className="text-emerald-600">${parseFloat(trade.amount_usd).toFixed(2)}</span> via {trade.payment_method}.</p>
                      <p className="text-xs font-medium text-slate-500 mt-1">Wait for the user to send the funds. Your AFR is locked in escrow to guarantee the transaction.</p>
                    </div>

                    {trade.status === 'proof_uploaded' ? (
                      <div className="flex flex-col items-center p-6 border-2 border-emerald-100 bg-emerald-50/50 rounded-xl">
                        <CheckCircle size={32} className="text-emerald-500 mb-3"/>
                        <p className="font-black text-slate-800 text-center mb-1">User uploaded proof</p>
                        <p className="text-xs font-bold text-slate-500 text-center mb-6 max-w-sm">Please verify your bank/wallet to ensure the fiat arrived. Once confirmed, the escrow will release the AFR to the user and credit your 2% reward.</p>
                        
                        <button 
                          onClick={() => confirmDepositReceived(trade.id)}
                          disabled={processingId === trade.id}
                          className="w-full bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest px-8 py-4 rounded-xl transition-all hover:bg-emerald-500 shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {processingId === trade.id ? <Loader2 size={16} className="animate-spin"/> : 'Confirm Receipt & Release AFR'}
                        </button>
                      </div>
                    ) : (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
                        <Clock className="text-amber-500 animate-pulse" size={20}/>
                        <div>
                          <p className="font-bold text-sm text-amber-900">Waiting for User</p>
                          <p className="text-xs text-amber-700">The user has not uploaded their transfer receipt yet.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* SETTINGS */}
      {activeTab === 'SETTINGS' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-8">
            <h3 className="font-black text-lg text-slate-800 mb-6">Payment Methods Configured</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center gap-4 p-4 border-2 border-slate-100 rounded-xl cursor-pointer hover:border-emerald-200 transition-colors">
                <input type="checkbox" defaultChecked className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300" />
                <span className="font-bold text-sm text-slate-700">Local Bank Transfer</span>
              </label>
              <label className="flex items-center gap-4 p-4 border-2 border-slate-100 rounded-xl cursor-pointer hover:border-emerald-200 transition-colors">
                <input type="checkbox" defaultChecked className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300" />
                <span className="font-bold text-sm text-slate-700">Mobile Money</span>
              </label>
              <label className="flex items-center gap-4 p-4 border-2 border-slate-100 rounded-xl cursor-pointer hover:border-emerald-200 transition-colors">
                <input type="checkbox" className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300" />
                <span className="font-bold text-sm text-slate-700">Physical Cash Drop</span>
              </label>
            </div>
            <button className="mt-6 w-full bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest py-4 rounded-xl hover:bg-slate-800 transition-colors">
              Save Configurations
            </button>
          </div>
          
          <div className="bg-red-50 border border-red-100 rounded-3xl p-8">
             <h4 className="font-black text-red-800 flex items-center gap-2 mb-2"><AlertTriangle size={18}/> Compliance & Suspension</h4>
             <p className="text-xs text-red-700 leading-relaxed font-bold">If your completion rating drops below 85%, or if you falsely confirm/deny escrow transactions, Pascaline AI will permanently suspend your CoT status and freeze your localized liquidity.</p>
          </div>
        </div>
      )}
    </div>
  );
}