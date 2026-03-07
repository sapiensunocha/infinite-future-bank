import React, { useState, useEffect } from 'react';
import { X, Landmark, Smartphone, MapPin, ShieldCheck, ArrowRight, CheckCircle, Loader2, Lock, Navigation, Star, User } from 'lucide-react';
import { supabase } from './services/supabaseClient'; // <-- YOUR REAL SUPABASE CLIENT

export default function WithdrawalPage({ userBalance = 0, userId, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  // P2P Specific State
  const [selectedBanker, setSelectedBanker] = useState(null);
  const [p2pMethod, setP2pMethod] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  // Real Database State
  const [nearbyBankers, setNearbyBankers] = useState([]);
  const [isLoadingBankers, setIsLoadingBankers] = useState(false);

  // FETCH REAL BANKERS WHEN USER REACHES STEP 3
  useEffect(() => {
    if (step === 3 && method === 'P2P') {
      fetchRealBankers();
    }
  }, [step, method]);

  const fetchRealBankers = async () => {
    setIsLoadingBankers(true);
    try {
      // Fetching real users who have 'is_banker' flipped to true
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, banker_rating, total_banker_trades')
        .eq('is_banker', true)
        .neq('id', userId) // Don't show the user themselves
        .limit(5);

      if (error) throw error;
      
      // Formatting the real data to match the UI requirements
      // (In the future, you can pull methods and distance from a banker_locations table)
      const formattedBankers = data.map(banker => ({
        id: banker.id,
        name: banker.full_name || 'Anonymous Banker',
        rating: banker.banker_rating || 5.0,
        trades: banker.total_banker_trades || 0,
        distance: 'Local Area', // Placeholder until GPS PostGIS is active
        methods: ['Orange Money', 'M-Pesa', 'Physical Cash'] // Assuming these for now
      }));

      setNearbyBankers(formattedBankers);
    } catch (err) {
      console.error("Error fetching bankers:", err);
      setError("Failed to locate local bankers. Please check your connection.");
    } finally {
      setIsLoadingBankers(false);
    }
  };

  const handleAmountSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (parseFloat(amount) > 0 && parseFloat(amount) <= userBalance) {
      setStep(2);
    } else {
      setError("Invalid amount or insufficient funds.");
    }
  };

  const handleProcessWithdrawal = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setError('');
    
    try {
      if (method === 'P2P') {
        // REAL DATABASE ESCROW LOCK
        const { data, error } = await supabase.rpc('initiate_p2p_withdrawal', {
          p_user_id: userId,
          p_amount: parseFloat(amount),
          p_local_method: p2pMethod,
          p_phone_number: phoneNumber,
          // We pass the specific banker ID so the request goes directly to them
          p_target_banker_id: selectedBanker.id 
        });

        if (error) throw error;
        setStep(4);
      } 
      else if (method === 'BANK') {
        // REAL DATABASE STANDARD WITHDRAWAL
        const { error } = await supabase
          .from('standard_withdrawals')
          .insert({
            user_id: userId,
            amount: parseFloat(amount),
            destination_type: 'BANK_ACCOUNT',
            status: 'processing'
          });

        if (error) throw error;
        setStep(4);
      }
    } catch (err) {
      console.error("Withdrawal Error:", err);
      setError(err.message || "Something went wrong processing your withdrawal.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Withdraw Capital</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <X size={18} strokeWidth={3} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100">
              {error}
            </div>
          )}

          {/* STEP 1: AMOUNT */}
          {step === 1 && (
            <form onSubmit={handleAmountSubmit} className="space-y-6 animate-in slide-in-from-right-4">
              <div className="text-center space-y-2">
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Liquid Balance</p>
                <p className="text-3xl font-black text-slate-800">${parseFloat(userBalance).toFixed(2)}</p>
              </div>

              <div className="relative">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300">$</span>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-50 p-6 pl-12 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none text-3xl font-black text-slate-800 placeholder:text-slate-300 transition-all"
                  placeholder="0.00"
                />
              </div>

              <button type="submit" className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black text-lg tracking-wide hover:bg-black transition-all flex items-center justify-center gap-2">
                Select Method <ArrowRight size={20} />
              </button>
            </form>
          )}

          {/* STEP 2: METHOD SELECTION */}
          {step === 2 && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
              <button onClick={() => { setMethod('P2P'); setStep(3); }} className="w-full flex items-center justify-between p-5 rounded-2xl border-2 border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 transition-all text-left relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-black px-2 py-1 rounded-bl-lg">ZERO FEES</div>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><MapPin size={24} /></div>
                  <div>
                    <p className="font-black text-slate-800">Local Banker (P2P)</p>
                    <p className="text-xs font-bold text-emerald-600 mt-0.5">Find cashpoints near you</p>
                  </div>
                </div>
                <ArrowRight size={18} className="text-emerald-400" />
              </button>

              <button onClick={() => { setMethod('BANK'); setStep(3); }} className="w-full flex items-center justify-between p-5 rounded-2xl border-2 border-slate-100 hover:border-blue-100 hover:bg-slate-50 transition-all text-left">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-100 text-slate-600 rounded-xl"><Landmark size={24} /></div>
                  <div>
                    <p className="font-black text-slate-800">Bank / Card</p>
                    <p className="text-xs font-bold text-slate-400 mt-0.5">Eligible Countries Only</p>
                  </div>
                </div>
                <ArrowRight size={18} className="text-slate-300" />
              </button>

              <div className="w-full flex items-center justify-between p-5 rounded-2xl border-2 border-slate-50 bg-slate-50/50 opacity-60 text-left relative">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-200 text-slate-400 rounded-xl"><Lock size={24} /></div>
                  <div>
                    <p className="font-black text-slate-500">Physical Vault Pickup</p>
                    <p className="text-xs font-bold text-slate-400 mt-0.5">Requires hardware access</p>
                  </div>
                </div>
                <span className="text-xs font-black bg-slate-200 text-slate-500 px-2 py-1 rounded-md">SOON</span>
              </div>
            </div>
          )}

          {/* STEP 3: P2P REAL DATABASE RADAR */}
          {step === 3 && method === 'P2P' && !selectedBanker && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
              <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between overflow-hidden relative">
                <div className="absolute -right-4 -top-4 opacity-10"><Navigation size={100} /></div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Locating Nodes</p>
                  <p className="text-lg font-black">{isLoadingBankers ? 'Scanning database...' : 'Bankers Found'}</p>
                </div>
                {isLoadingBankers && (
                  <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center animate-pulse">
                    <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-2">
                {!isLoadingBankers && nearbyBankers.length === 0 && (
                  <p className="text-center text-slate-500 font-bold py-4">No active bankers found in your area.</p>
                )}
                
                {nearbyBankers.map((banker) => (
                  <div key={banker.id} onClick={() => setSelectedBanker(banker)} className="p-4 border-2 border-slate-100 rounded-2xl hover:border-emerald-400 hover:bg-emerald-50/30 cursor-pointer transition-all flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500"><User size={20}/></div>
                        <div>
                          <p className="font-black text-slate-800 flex items-center gap-2">
                            {banker.name} 
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                          </p>
                          <p className="text-xs font-bold text-slate-400 flex items-center gap-1"><MapPin size={10}/> {banker.distance}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black flex items-center gap-1 text-slate-700"><Star size={14} className="text-yellow-400 fill-yellow-400"/> {banker.rating}</p>
                        <p className="text-[10px] font-bold text-slate-400">{banker.trades} trades</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {banker.methods.map(m => (
                        <span key={m} className="text-[10px] font-black bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{m}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => setStep(2)} className="w-full text-center text-sm font-bold text-slate-400 pt-4 hover:text-slate-600">Cancel Search</button>
            </div>
          )}

          {/* STEP 3.5: FINALIZE REAL P2P REQUEST */}
          {step === 3 && method === 'P2P' && selectedBanker && (
            <form onSubmit={handleProcessWithdrawal} className="space-y-6 animate-in slide-in-from-right-4">
              <div className="bg-emerald-50 p-4 rounded-xl flex items-center justify-between border border-emerald-100">
                <div>
                  <p className="text-xs font-bold text-emerald-600 uppercase">Routing to</p>
                  <p className="text-lg font-black text-slate-800">{selectedBanker.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-emerald-600 uppercase">Amount</p>
                  <p className="text-xl font-black text-slate-800">${parseFloat(amount).toFixed(2)}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <select required value={p2pMethod} onChange={(e) => setP2pMethod(e.target.value)} className="w-full bg-white p-4 rounded-2xl border-2 border-slate-100 outline-none font-bold text-slate-700">
                  <option value="">How do you want the cash?</option>
                  {selectedBanker.methods.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                
                <input required type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Your Phone Number / Account ID" className="w-full bg-white p-4 rounded-2xl border-2 border-slate-100 outline-none font-bold placeholder:text-slate-300"/>
              </div>

              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                <ShieldCheck className="text-blue-600 shrink-0 mt-0.5" size={20}/>
                <p className="text-xs font-bold text-blue-800 leading-relaxed">Your ${parseFloat(amount).toFixed(2)} will be locked in Escrow. It is only released to {selectedBanker.name} once you confirm receipt.</p>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setSelectedBanker(null)} className="w-1/3 bg-slate-100 text-slate-600 p-4 rounded-2xl font-black">Back</button>
                <button type="submit" disabled={isProcessing} className="w-2/3 bg-emerald-500 text-white p-4 rounded-2xl font-black text-lg hover:bg-emerald-600 flex justify-center gap-2">
                  {isProcessing ? <Loader2 className="animate-spin" size={20} /> : 'Lock Escrow'}
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: SUCCESS */}
          {step === 4 && (
            <div className="space-y-6 text-center animate-in zoom-in-95 duration-300 py-8">
              <div className="mx-auto w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                <CheckCircle size={40} strokeWidth={3} />
              </div>
              <h3 className="text-2xl font-black text-slate-800">Escrow Locked 🔒</h3>
              <p className="text-slate-500 font-medium px-4">
                {method === 'P2P' 
                  ? `Your request has been securely routed to ${selectedBanker?.name}. Waiting for them to confirm...` 
                  : 'Your withdrawal is processing.'}
              </p>
              <button onClick={() => { if(onSuccess) onSuccess(); onClose(); }} className="mt-8 w-full bg-slate-100 text-slate-800 p-4 rounded-2xl font-black hover:bg-slate-200">
                Return to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}