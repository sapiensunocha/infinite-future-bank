import React, { useState, useEffect } from 'react';
import { X, Landmark, MapPin, ShieldCheck, ArrowRight, CheckCircle, Loader2, Lock, Star, User, CreditCard, Globe } from 'lucide-react';
import { supabase } from './services/supabaseClient';

// --- Map Imports ---
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet icons missing in React builds
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
  const [method, setMethod] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  // P2P Specific State
  const [selectedBanker, setSelectedBanker] = useState(null);
  const [p2pMethod, setP2pMethod] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  // Real Database Map State
  const [nearbyBankers, setNearbyBankers] = useState([]);
  const [isLoadingBankers, setIsLoadingBankers] = useState(false);
  const [userLocation, setUserLocation] = useState(null); 

  // Standard Bank/Card State
  const [bankType, setBankType] = useState('ach'); // 'ach', 'swift', or 'card'
  const [formData, setFormData] = useState({
    accountName: '',
    accountNumber: '',
    routingNumber: '',
    iban: '',
    swiftBic: '',
    country: '',
    cardNumber: '',
    expiry: '',
    cvc: ''
  });

  const handleAmountSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (parseFloat(amount) > 0 && parseFloat(amount) <= userBalance) {
      setStep(2);
    } else {
      setError("Invalid amount or insufficient funds.");
    }
  };

  const initializeMapDiscovery = () => {
    setIsLoadingBankers(true);
    setStep(3);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
        
        try {
          await supabase.from('profiles').update({ latitude, longitude }).eq('id', userId);
          
          const { data, error } = await supabase.rpc('get_nearby_bankers', {
            user_lat: latitude,
            user_lon: longitude,
            radius_km: 50 
          });
          
          if (error) throw error;
          
          const formattedBankers = (data || []).map(b => ({
            id: b.id,
            name: b.full_name || 'Anonymous Banker',
            rating: b.banker_rating || 5.0,
            trades: b.total_banker_trades || 0,
            distance: `${b.distance_km.toFixed(1)} km`,
            latitude: b.latitude,
            longitude: b.longitude,
            methods: ['Physical Cash', 'Airtel Money', 'M-Pesa']
          }));

          setNearbyBankers(formattedBankers);
        } catch (err) {
          console.error(err);
          setError("Failed to load map data. Make sure you ran the SQL functions.");
        } finally {
          setIsLoadingBankers(false);
        }
      }, (err) => {
        setError("Location access denied. Please allow GPS access to find nearby cashpoints.");
        setIsLoadingBankers(false);
      });
    } else {
      setError("Geolocation is not supported by your browser.");
      setIsLoadingBankers(false);
    }
  };

  const handleProcessWithdrawal = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setError('');
    
    try {
      if (method === 'P2P') {
        const { data: tradeId, error } = await supabase.rpc('initiate_p2p_withdrawal', {
          p_user_id: userId,
          p_amount: parseFloat(amount),
          p_local_method: p2pMethod,
          p_phone_number: phoneNumber,
          p_target_banker_id: selectedBanker.id 
        });

        if (error) throw error;

        await supabase.from('notifications').insert([{
          user_id: selectedBanker.id,
          type: 'p2p_withdrawal_request',
          message: `A nearby user is requesting ${parseFloat(amount).toFixed(2)} USD in ${p2pMethod}.`,
          amount: parseFloat(amount),
          related_user_id: userId,
          status: 'pending',
          metadata: { trade_id: tradeId } 
        }]);

        setStep(4);
      } 
      else if (method === 'BANK') {
        const payload = {
          userId: userId,
          amount: parseFloat(amount),
          type: bankType, 
          accountName: formData.accountName
        };

        if (bankType === 'ach') {
          payload.routingNumber = formData.routingNumber;
          payload.accountNumber = formData.accountNumber;
        } else if (bankType === 'swift') {
          payload.iban = formData.iban;
          payload.swiftBic = formData.swiftBic;
          payload.country = formData.country;
        } else if (bankType === 'card') {
          // =========================================================
          // STRIPE FRONTEND TOKENIZATION (Bypasses PCI blocks)
          // =========================================================
          const [exp_month, exp_year] = formData.expiry.split('/');
          
          // Using the provided live key, with a fallback to the env variable just in case
          const stripeKey = import.meta.env?.VITE_STRIPE_PUBLIC_KEY || 'pk_live_51QlhX1DV4GGUfngRRIJi02QYB2pTZg2bbX9T4xwM0i6FflEPt2FtV7ydZfNks9I9vOAcmwsLGM1U7tzbpmaP454C00qsme0XJ8';
          
          const cardResp = await fetch('https://api.stripe.com/v1/tokens', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `Bearer ${stripeKey}` 
            },
            body: new URLSearchParams({
              'card[number]': formData.cardNumber.replace(/\s/g, ''),
              'card[exp_month]': exp_month,
              'card[exp_year]': '20' + exp_year,
              'card[cvc]': formData.cvc,
              'card[name]': formData.accountName,
            })
          });
          
          const cardData = await cardResp.json();
          
          if (cardData.error) {
             throw new Error(`Card Error: ${cardData.error.message}`);
          }
          
          // Send the safe token to the edge function instead of raw numbers
          payload.stripeToken = cardData.id;
        }

        // Trigger the Edge Function
        const { data: payoutData, error: payoutError } = await supabase.functions.invoke('process-withdrawal', {
          body: payload
        });

        // Handle Edge Function network errors
        if (payoutError) throw payoutError;
        // Handle Edge Function custom thrown errors (e.g. insufficient liquidity)
        if (payoutData?.error) throw new Error(payoutData.error);

        // If success, edge function already handled DB updates!
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
    <div className="p-8 w-full animate-in fade-in zoom-in-95 duration-300 relative flex flex-col h-full">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6 bg-white sticky top-0 z-20">
        <h2 className="text-xl font-black text-slate-800 tracking-tight">Withdraw Capital</h2>
      </div>

      {/* Scrollable Content */}
      <div className="overflow-y-auto flex-1 no-scrollbar pr-2 pb-4">
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

            <button type="submit" className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black text-lg tracking-wide hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg hover:-translate-y-1">
              Select Method <ArrowRight size={20} />
            </button>
          </form>
        )}

        {/* STEP 2: METHOD SELECTION */}
        {step === 2 && (
          <div className="space-y-4 animate-in slide-in-from-right-4">
            {/* Option 1: P2P */}
            <button 
              onClick={() => { setMethod('P2P'); initializeMapDiscovery(); }} 
              className="w-full flex items-center justify-between p-5 rounded-2xl border-2 border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 transition-all text-left relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-black px-2 py-1 rounded-bl-lg">ZERO FEES</div>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform"><MapPin size={24} /></div>
                <div>
                  <p className="font-black text-slate-800">Local Banker (P2P)</p>
                  <p className="text-xs font-bold text-emerald-600 mt-0.5">Find cashpoints on map</p>
                </div>
              </div>
              <ArrowRight size={18} className="text-emerald-400" />
            </button>

            {/* Option 2: Standard Bank */}
            <button onClick={() => { setMethod('BANK'); setStep(3); }} className="w-full flex items-center justify-between p-5 rounded-2xl border-2 border-slate-100 hover:border-blue-100 hover:bg-blue-50/50 transition-all text-left group">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-100 text-slate-600 rounded-xl group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors"><Landmark size={24} /></div>
                <div>
                  <p className="font-black text-slate-800">Bank / Card</p>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">Global Wire & ACH</p>
                </div>
              </div>
              <ArrowRight size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
            </button>

            {/* Option 3: Physical Vault (Coming Soon) */}
            <div className="w-full flex items-center justify-between p-5 rounded-2xl border-2 border-slate-50 bg-slate-50 opacity-60 text-left relative cursor-not-allowed">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-200 text-slate-500 rounded-xl"><Lock size={24} /></div>
                <div>
                  <p className="font-black text-slate-600">Physical Vault Pickup</p>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">Hardware Required • IFB Skylink</p>
                </div>
              </div>
              <span className="text-[10px] font-black bg-slate-200 text-slate-500 px-3 py-1 rounded-lg uppercase tracking-widest">Soon</span>
            </div>

            <button onClick={() => setStep(1)} className="w-full text-center text-xs font-bold text-slate-400 pt-2 hover:text-slate-600 uppercase tracking-widest">Go Back</button>
          </div>
        )}

        {/* STEP 3 (A): MULTI-METHOD FIAT FORM */}
        {step === 3 && method === 'BANK' && (
          <form onSubmit={handleProcessWithdrawal} className="space-y-5 animate-in slide-in-from-right-4">
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 text-blue-800">
              <ShieldCheck className="shrink-0 text-blue-500" size={20} />
              <p className="text-sm font-bold">Withdrawing <span className="font-black">${parseFloat(amount).toFixed(2)}</span> to external routing.</p>
            </div>

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

            <button type="submit" disabled={isProcessing} className="w-full bg-blue-600 text-white p-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 flex justify-center gap-2 transition-all shadow-lg hover:-translate-y-1 mt-6 disabled:opacity-50">
              {isProcessing ? <Loader2 className="animate-spin" size={16} /> : 'Process Secure Withdrawal'}
            </button>
            <button type="button" onClick={() => setStep(2)} className="w-full text-center text-xs font-bold text-slate-400 pt-2 hover:text-slate-600 uppercase tracking-widest">Go Back</button>
          </form>
        )}

        {/* STEP 3 (B): P2P REAL MAP */}
        {step === 3 && method === 'P2P' && (
          <div className="space-y-4 animate-in slide-in-from-right-4">
            
            {!userLocation ? (
              <div className="text-center py-12">
                <Loader2 className="animate-spin mx-auto text-emerald-500 mb-4" size={40} />
                <p className="font-black text-slate-800">Accessing GPS Grid...</p>
                <p className="text-xs font-bold text-slate-400 mt-1">Locating active nodes near you.</p>
              </div>
            ) : (
              <>
                <div className="h-64 w-full rounded-2xl overflow-hidden border-2 border-slate-200 relative z-0">
                  <MapContainer center={userLocation} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapController center={userLocation} />
                    
                    <Marker position={userLocation}>
                      <Popup><b>You are here</b></Popup>
                    </Marker>

                    {nearbyBankers.map(banker => (
                      <Marker key={banker.id} position={[banker.latitude, banker.longitude]}>
                        <Popup>
                          <div className="text-center pb-2 min-w-[120px]">
                            <p className="font-black text-slate-800 text-sm mb-1">{banker.name}</p>
                            <p className="text-[10px] font-bold text-slate-500 mb-3 flex items-center justify-center gap-1">
                              <Star size={10} className="text-yellow-500 fill-yellow-500"/> {banker.rating} • {banker.distance}
                            </p>
                            <button 
                              onClick={() => setSelectedBanker(banker)} 
                              className="w-full bg-emerald-500 text-white px-3 py-2 rounded-lg text-xs font-black hover:bg-emerald-600 transition-colors"
                            >
                              Select Node
                            </button>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>

                {!isLoadingBankers && nearbyBankers.length === 0 && (
                   <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center">
                     <p className="text-sm font-bold text-slate-500">No active bankers found within 50km of your coordinates.</p>
                   </div>
                )}

                {/* P2P FINALIZE FORM */}
                {selectedBanker && (
                  <form onSubmit={handleProcessWithdrawal} className="space-y-4 bg-white border-2 border-emerald-100 p-5 rounded-2xl animate-in slide-in-from-bottom-2 shadow-xl relative -mt-6 z-10">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <div>
                        <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Routing to</p>
                        <p className="font-black text-slate-800">{selectedBanker.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Distance</p>
                        <p className="font-black text-slate-800">{selectedBanker.distance}</p>
                      </div>
                    </div>
                    
                    <select required value={p2pMethod} onChange={(e) => setP2pMethod(e.target.value)} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold text-slate-700 text-sm focus:border-emerald-500 transition-colors">
                      <option value="">How do you want the cash?</option>
                      {selectedBanker.methods.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    
                    <input required type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Your Phone / Account ID" className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none font-bold placeholder:text-slate-400 text-sm focus:border-emerald-500 transition-colors"/>

                    <button type="submit" disabled={isProcessing} className="w-full bg-emerald-600 text-white p-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 flex justify-center gap-2 transition-all shadow-lg hover:-translate-y-1">
                      {isProcessing ? <Loader2 className="animate-spin" size={16} /> : 'Lock Escrow & Request'}
                    </button>
                  </form>
                )}
                
                {!selectedBanker && (
                  <button onClick={() => setStep(2)} className="w-full text-center text-xs font-bold text-slate-400 pt-2 hover:text-slate-600 uppercase tracking-widest">Cancel Map Search</button>
                )}
              </>
            )}
          </div>
        )}

        {/* STEP 4: SUCCESS */}
        {step === 4 && (
          <div className="space-y-6 text-center animate-in zoom-in-95 duration-300 py-8">
            <div className="mx-auto w-24 h-24 bg-emerald-50 border-8 border-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <CheckCircle size={40} strokeWidth={3} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">Withdrawal Initiated</h3>
              <p className="text-slate-500 font-bold text-sm leading-relaxed px-4">
                {method === 'P2P' 
                  ? `Your escrow is locked. Waiting for ${selectedBanker?.name} to accept the ping.` 
                  : 'Your capital has been securely routed to your selected external account.'}
              </p>
            </div>
            <button onClick={() => { if(onSuccess) onSuccess(); onClose(); }} className="mt-8 w-full bg-slate-900 text-white p-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-lg">
              Return to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}