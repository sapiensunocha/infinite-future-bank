import React, { useState, useEffect } from 'react';
import { X, Landmark, MapPin, ShieldCheck, ArrowRight, CheckCircle, Loader2, Lock, Star, User, CreditCard, Globe, Smartphone, Wallet, HandCoins } from 'lucide-react';
import { supabase } from './services/supabaseClient';

// --- Map Imports ---
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapController({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.setView(center, 13); }, [center, map]);
  return null;
}

export default function WithdrawalPage({ userBalance = 0, userId, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(null); // 'BANK' or 'P2P'
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  // P2P Specific State
  const [p2pFiatMethod, setP2pFiatMethod] = useState('Local Bank Transfer');
  const [p2pReceivingDetails, setP2pReceivingDetails] = useState('');
  const [selectedProcessor, setSelectedProcessor] = useState(null);
  const [nearbyBankers, setNearbyBankers] = useState([]);
  const [isLoadingBankers, setIsLoadingBankers] = useState(false);
  const [userLocation, setUserLocation] = useState(null); 

  // Standard Bank/Card State
  const [bankType, setBankType] = useState('ach'); // 'ach', 'swift', or 'card'
  const [formData, setFormData] = useState({
    accountName: '', accountNumber: '', routingNumber: '', iban: '', swiftBic: '', country: '', cardNumber: '', expiry: '', cvc: ''
  });

  const fiatOptions = [
    { id: 'Local Bank Transfer', icon: <Landmark size={18}/>, label: 'Local Bank Transfer' },
    { id: 'Mobile Money', icon: <Smartphone size={18}/>, label: 'Mobile Money' },
    { id: 'Digital Wallet', icon: <Wallet size={18}/>, label: 'Digital Wallet' },
    { id: 'Physical Cash Pickup', icon: <HandCoins size={18}/>, label: 'Physical Cash Pickup' }
  ];

  const handleAmountSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (parseFloat(amount) > 0 && parseFloat(amount) <= userBalance) {
      setStep(2);
    } else {
      setError("Invalid amount or insufficient liquid funds.");
    }
  };

  const handleFindProcessors = async () => {
    if (!p2pReceivingDetails && p2pFiatMethod !== 'Physical Cash Pickup') {
      setError(`Please provide your ${p2pFiatMethod} details so the processor knows where to send the funds.`);
      return;
    }
    
    setIsLoadingBankers(true);
    setStep(4);

    try {
      // Query the database for verified CoT Processors
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, cot_rating, cot_completed_tx')
        .eq('is_cot_processor', true)
        .limit(10);

      if (error) throw error;

      if (data && data.length > 0) {
        setNearbyBankers(data.map(b => ({
          ...b, 
          distance: `${(Math.random() * 10).toFixed(1)} km`, // Mock distance for UI
          latitude: 0, longitude: 0 // Replace with actual coords if geolocation is active
        })));
      } else {
        // Fallback synthetic data for testing
        setNearbyBankers([
          { id: '1', full_name: 'IFB Local Vault', cot_rating: 99.8, cot_completed_tx: 1204, distance: '2.1 km', latitude: 0, longitude: 0 },
          { id: '2', full_name: 'Verified Merchant X', cot_rating: 98.5, cot_completed_tx: 856, distance: '5.4 km', latitude: 0, longitude: 0 },
        ]);
      }

      // Try to get actual location for the map
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        });
      }
    } catch (err) {
      console.error(err);
      setError("Failed to locate global processing nodes.");
    } finally {
      setIsLoadingBankers(false);
    }
  };

  const handleProcessP2pWithdrawal = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setError('');
    
    try {
      // 1. Create the Order in the DB
      const { data: orderData, error: orderError } = await supabase.from('p2p_orders').insert([{
        user_id: userId,
        processor_id: selectedProcessor.id,
        order_type: 'withdraw',
        amount_usd: parseFloat(amount),
        payment_method: `${p2pFiatMethod} - ${p2pReceivingDetails}`,
        status: 'open'
      }]).select().single();

      if (orderError) throw orderError;

      // 2. Lock the User's AFR in the Escrow Smart Contract
      const { error: rpcError } = await supabase.rpc('process_p2p_escrow', {
        p_order_id: orderData.id,
        p_action: 'lock_withdraw'
      });

      if (rpcError) throw rpcError;

      // 3. Send Notification to the CoT Processor
      await supabase.from('notifications').insert([{
        user_id: selectedProcessor.id,
        type: 'p2p_withdrawal_request',
        message: `A user is requesting a $${parseFloat(amount).toFixed(2)} withdrawal via ${p2pFiatMethod}.`,
        amount: parseFloat(amount),
        related_user_id: userId,
        status: 'pending',
        metadata: { trade_id: orderData.id } 
      }]);

      setStep(5); // Move to Success Screen
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to secure the escrow contract.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessBankWithdrawal = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setError('');
    
    try {
      const payload = { userId, amount: parseFloat(amount), type: bankType, accountName: formData.accountName };

      if (bankType === 'ach') {
        payload.routingNumber = formData.routingNumber; payload.accountNumber = formData.accountNumber;
      } else if (bankType === 'swift') {
        payload.iban = formData.iban; payload.swiftBic = formData.swiftBic; payload.country = formData.country;
      } else if (bankType === 'card') {
        const [exp_month, exp_year] = formData.expiry.split('/');
        const stripeKey = import.meta.env?.VITE_STRIPE_PUBLIC_KEY;
        const cardResp = await fetch('https://api.stripe.com/v1/tokens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Bearer ${stripeKey}` },
          body: new URLSearchParams({
            'card[number]': formData.cardNumber.replace(/\s/g, ''),
            'card[exp_month]': exp_month,
            'card[exp_year]': '20' + exp_year,
            'card[cvc]': formData.cvc,
            'card[name]': formData.accountName,
          })
        });
        const cardData = await cardResp.json();
        if (cardData.error) throw new Error(`Card Error: ${cardData.error.message}`);
        payload.stripeToken = cardData.id;
      }

      const { data: payoutData, error: payoutError } = await supabase.functions.invoke('process-withdrawal', { body: payload });
      if (payoutError) throw payoutError;
      if (payoutData?.error) throw new Error(payoutData.error);

      setStep(5);
    } catch (err) {
      setError(err.message || "Processing failed. Clearing house rejected the route.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-8 w-full animate-in fade-in zoom-in-95 duration-300 relative flex flex-col h-full bg-white">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6 sticky top-0 z-20 bg-white">
        <h2 className="text-xl font-black text-slate-800 tracking-tight">Withdraw Capital</h2>
      </div>

      {/* Scrollable Content */}
      <div className="overflow-y-auto flex-1 no-scrollbar pr-2 pb-4">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100 flex items-start gap-3">
            <X size={18} className="shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

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
              <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-black px-3 py-1 rounded-bl-lg uppercase tracking-widest shadow-sm">Instant Settlement</div>
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

        {/* STEP 3 (A): GLOBAL BANK WITHDRAWAL */}
        {step === 3 && method === 'BANK' && (
          <form onSubmit={handleProcessBankWithdrawal} className="space-y-5 animate-in slide-in-from-right-4">
            <button type="button" onClick={() => setStep(2)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 flex items-center gap-2 mb-2 transition-colors">
              <ArrowLeft size={14}/> Back to Methods
            </button>

            {/* Sub-method Tabs */}
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
              {/* US Bank Inputs */}
              {bankType === 'ach' && (
                <div className="animate-in fade-in space-y-3">
                  <input required type="text" placeholder="Account Holder Name" value={formData.accountName} onChange={e => setFormData({...formData, accountName: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-slate-800 focus:border-blue-500 transition-colors" />
                  <input required type="text" placeholder="ABA Routing Number (9 digits)" maxLength="9" value={formData.routingNumber} onChange={e => setFormData({...formData, routingNumber: e.target.value.replace(/\D/g, '')})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-slate-800 focus:border-blue-500 transition-colors tracking-widest" />
                  <input required type="text" placeholder="Account Number" value={formData.accountNumber} onChange={e => setFormData({...formData, accountNumber: e.target.value.replace(/\D/g, '')})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-slate-800 focus:border-blue-500 transition-colors tracking-widest" />
                </div>
              )}

              {/* International SWIFT/IBAN Inputs */}
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

              {/* Debit Card Inputs */}
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
                    <input required type="text" placeholder="CVC" maxLength="4" value={formData.cvc} onChange={e => setFormData({...formData, cvc: e.target.value.replace(/\D/g, '')})} className="w-1/3 bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-slate-800 focus:border-blue-500 transition-colors text-center tracking-widest" />
                  </div>
                </div>
              )}
            </div>

            <button type="submit" disabled={isProcessing} className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 flex justify-center gap-2 transition-all shadow-lg hover:-translate-y-1 mt-6 disabled:opacity-50">
              {isProcessing ? <Loader2 className="animate-spin" size={16} /> : 'Process Secure Withdrawal'}
            </button>
          </form>
        )}

        {/* STEP 3 (B): P2P FIAT METHOD CONFIGURATION */}
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
                    <span className="font-black text-sm leading-tight">{option.label}</span>
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

            <button 
              onClick={handleFindProcessors} 
              disabled={isLoadingBankers}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest p-5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 hover:-translate-y-1"
            >
              {isLoadingBankers ? <Loader2 className="animate-spin" size={16} /> : 'Locate Routing Nodes'}
            </button>
          </div>
        )}

        {/* STEP 4 (P2P): PROCESSOR MAP/LIST */}
        {step === 4 && method === 'P2P' && (
          <div className="space-y-4 animate-in slide-in-from-right-4">
            <button onClick={() => setStep(3)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 flex items-center gap-2 mb-2 transition-colors">
              <ArrowLeft size={14}/> Edit Fiat Details
            </button>
            
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
              <ShieldCheck size={14}/> Active Nodes Accepting {p2pFiatMethod}
            </p>
            
            {userLocation ? (
              <div className="h-48 w-full rounded-2xl overflow-hidden border-2 border-slate-200 relative z-0 mb-4 shadow-sm">
                <MapContainer center={userLocation} zoom={13} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <MapController center={userLocation} />
                  <Marker position={userLocation}><Popup><b>You</b></Popup></Marker>
                  {nearbyBankers.map(banker => (
                    <Marker key={banker.id} position={[banker.latitude, banker.longitude]}>
                      <Popup>{banker.full_name}</Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            ) : (
               <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center mb-4">
                 <MapPin size={24} className="mx-auto text-slate-300 mb-2"/>
                 <p className="text-xs font-bold text-slate-500">Map view unavailable. Showing global directory.</p>
               </div>
            )}

            <div className="space-y-3 max-h-64 overflow-y-auto pr-2 no-scrollbar">
              {nearbyBankers.map(banker => (
                <button 
                  key={banker.id} 
                  onClick={() => setSelectedProcessor(banker)}
                  className={`w-full text-left p-4 rounded-2xl transition-all flex items-center justify-between group border-2 ${selectedProcessor?.id === banker.id ? 'bg-emerald-50 border-emerald-500 shadow-sm' : 'bg-white border-slate-100 hover:border-emerald-200'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${selectedProcessor?.id === banker.id ? 'bg-emerald-100 border-emerald-500' : 'bg-slate-100 border-white'}`}>
                      {banker.avatar_url ? <img src={banker.avatar_url} className="w-full h-full rounded-full object-cover"/> : <Users size={16} className={selectedProcessor?.id === banker.id ? 'text-emerald-600' : 'text-slate-400'}/>}
                    </div>
                    <div>
                      <p className="font-black text-slate-800 text-sm leading-tight">{banker.full_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-1 text-[9px] font-bold text-amber-500"><Star size={10} className="fill-amber-500"/> {banker.cot_rating}%</span>
                        <span className="text-[9px] text-slate-400">• {banker.cot_completed_tx} trades</span>
                      </div>
                    </div>
                  </div>
                  {selectedProcessor?.id === banker.id ? <CheckCircle size={20} className="text-emerald-500" /> : <ArrowRight size={18} className="text-slate-300 group-hover:text-emerald-400" />}
                </button>
              ))}
            </div>

            <button 
              onClick={handleProcessP2pWithdrawal} 
              disabled={!selectedProcessor || isProcessing}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest p-5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-4 hover:-translate-y-1"
            >
              {isProcessing ? <Loader2 className="animate-spin" size={16}/> : `Lock Escrow & Route to ${selectedProcessor ? selectedProcessor.full_name.split(' ')[0] : 'Processor'}`}
            </button>
          </div>
        )}

        {/* STEP 5: SUCCESS */}
        {step === 5 && (
          <div className="py-10 text-center space-y-4 animate-in zoom-in-95 duration-300">
            <div className="mx-auto w-24 h-24 bg-emerald-50 border-8 border-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <CheckCircle size={40} strokeWidth={3} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">Withdrawal Initiated</h3>
              <p className="text-slate-500 font-bold text-sm leading-relaxed px-4">
                {method === 'P2P' 
                  ? `Your digital funds are locked in Escrow. ${selectedProcessor?.full_name} has been notified to send ${parseFloat(amount).toFixed(2)} USD equivalent via ${p2pFiatMethod}.` 
                  : 'Your capital has been securely routed to your external account via the clearing house.'}
              </p>
            </div>
            <button onClick={() => { if(onSuccess) onSuccess(); onClose(); }} className="mt-8 w-full bg-slate-900 text-white p-5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-lg">
              Return to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}