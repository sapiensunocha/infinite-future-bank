import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Briefcase, Users, Baby, Link as LinkIcon,
  Globe2, Building2, ShieldAlert, Plus, ArrowRight,
  CreditCard, Trash2, Wallet, RefreshCw, Zap, ArrowLeftRight,
  Settings, Lock, ScanLine, Store, CheckCircle2, PlusCircle,
  ChevronLeft, ChevronRight, Download, Receipt, Eye, EyeOff, Unlock, Wifi,
  ShoppingBag, ArrowDownRight, MapPin, Upload, ShieldCheck, FileText, Camera, Loader2, AlertCircle,
  Award, Globe, Flame, BadgeCheck, Activity, Star, Landmark, Rocket
} from 'lucide-react';
import { supabase } from './services/supabaseClient';

// ─── KYC Section Component ───────────────────────────────────────────────────
function KYCSection({ profile }) {
  const [submission, setSubmission] = useState(null);
  const [uploading, setUploading] = useState(null);
  const [status, setStatus] = useState(null);
  const fileInputRef = useRef(null);
  const [pendingDocType, setPendingDocType] = useState(null);

  useEffect(() => { fetchSubmission(); }, []);

  async function fetchSubmission() {
    const { data } = await supabase.from('kyc_submissions').select('*').eq('user_id', profile?.id || (await supabase.auth.getUser()).data.user?.id).maybeSingle();
    setSubmission(data);
  }

  async function uploadDocument(file, docType) {
    setUploading(docType);
    setStatus(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const ext = file.name.split('.').pop();
      const path = `kyc/${user.id}/${docType}_${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage.from('kyc-documents').upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from('kyc-documents').getPublicUrl(path);

      const { data, error: fnErr } = await supabase.functions.invoke('kyc-ai-extract', {
        body: { document_url: publicUrl, document_type: docType }
      });
      if (fnErr) throw fnErr;

      setStatus({ type: 'success', msg: `Document processed. Status: ${data.status} (AI confidence: ${data.ai_confidence}%)` });
      await fetchSubmission();
    } catch (e) {
      setStatus({ type: 'error', msg: e.message || 'Upload failed' });
    } finally {
      setUploading(null);
      setPendingDocType(null);
    }
  }

  function triggerUpload(docType) {
    setPendingDocType(docType);
    fileInputRef.current?.click();
  }

  const kycStatus = profile?.kyc_status || 'unverified';
  const isVerified = kycStatus === 'verified';

  const documents = [
    { type: 'id_front', label: 'ID / Passport (Front)', icon: FileText },
    { type: 'id_back', label: 'ID (Back)', icon: FileText },
    { type: 'selfie', label: 'Selfie Photo', icon: Camera },
    { type: 'proof_of_address', label: 'Proof of Address', icon: MapPin },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <input ref={fileInputRef} type="file" className="hidden" accept="image/*,application/pdf"
        onChange={(e) => { if (e.target.files?.[0] && pendingDocType) uploadDocument(e.target.files[0], pendingDocType); }} />

      <div className={`rounded-[2rem] p-8 flex items-center gap-6 ${isVerified ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 ${isVerified ? 'bg-emerald-100' : 'bg-amber-100'}`}>
          {isVerified ? <ShieldCheck size={32} className="text-emerald-600" /> : <ShieldAlert size={32} className="text-amber-600" />}
        </div>
        <div>
          <p className={`font-black text-lg ${isVerified ? 'text-emerald-800' : 'text-amber-800'}`}>
            {isVerified ? 'Identity Verified' : 'Identity Verification Required'}
          </p>
          <p className={`text-sm font-medium mt-1 ${isVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
            {isVerified ? 'Your identity has been verified by our AI compliance system.' : 'Upload your documents below to verify your identity and unlock full account access.'}
          </p>
          {submission && (
            <p className="text-xs font-black uppercase tracking-widest mt-2 text-slate-500">
              Submission status: {submission.status} · AI confidence: {submission.ai_confidence_score ?? 'N/A'}%
            </p>
          )}
        </div>
      </div>

      {status && (
        <div className={`p-4 rounded-2xl text-sm font-bold flex items-center gap-3 ${status.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>
          {status.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          {status.msg}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {documents.map(({ type, label, icon: Icon }) => {
          const hasDoc = submission?.[`${type}_url`];
          const isUploading = uploading === type;
          return (
            <button key={type} onClick={() => triggerUpload(type)} disabled={!!uploading}
              className={`flex items-center gap-4 p-6 rounded-[2rem] border text-left transition-all hover:shadow-md active:scale-98 disabled:opacity-60
                ${hasDoc ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${hasDoc ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                {isUploading ? <Loader2 size={20} className="animate-spin text-blue-600" /> : hasDoc ? <CheckCircle2 size={20} className="text-emerald-600" /> : <Icon size={20} className="text-slate-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-black text-sm ${hasDoc ? 'text-emerald-700' : 'text-slate-700'}`}>{label}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isUploading ? 'Processing with AI...' : hasDoc ? 'Uploaded · Tap to replace' : 'Tap to upload'}
                </p>
              </div>
              <Upload size={16} className="text-slate-300 flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

const CARD_THEMES = {
  obsidian: { name: 'Platinum Obsidian', bg: 'bg-gradient-to-br from-slate-800 via-slate-900 to-black', border: 'border-blue-500/30', textPrimary: 'text-white', textSecondary: 'text-blue-200/70', accent: 'text-blue-200' },
  silver: { name: 'Titanium Silver', bg: 'bg-gradient-to-br from-slate-300 via-gray-100 to-slate-400', border: 'border-white', textPrimary: 'text-slate-800', textSecondary: 'text-slate-500', accent: 'text-slate-600' },
  gold: { name: 'Sovereign Gold', bg: 'bg-gradient-to-br from-yellow-500 via-amber-300 to-yellow-600', border: 'border-yellow-200/50', textPrimary: 'text-yellow-950', textSecondary: 'text-yellow-800/70', accent: 'text-yellow-900' }
};

const InfinityLogo = ({ className }) => (
  <svg viewBox="0 0 100 50" className={className}>
    <path 
      d="M30 15 C10 15, 10 35, 30 35 C40 35, 45 28, 50 25 C55 22, 60 15, 70 15 C90 15, 90 35, 70 35 C60 35, 55 28, 50 25 C45 22, 40 15, 30 15" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="6" 
      strokeLinecap="round"
      className="drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]"
    />
  </svg>
);

export default function AccountHub({ balances, profile }) {
  const [activeTier, setActiveTier] = useState('PERSONAL'); 
  const [notification, setNotification] = useState(null);
  const [isLoadingDB, setIsLoadingDB] = useState(true);

  // --- DATABASE-BACKED STATES ---
  const [cards, setCards] = useState([]); 
  const [transactions, setTransactions] = useState([]);
  const [achievements, setAchievements] = useState(null);

  // --- UI STATES ---
  const [cardTab, setCardTab] = useState('CARD'); 
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [vanishingCardId, setVanishingCardId] = useState(null); 
  
  // Provisioning States
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [newCardName, setNewCardName] = useState('');
  const [newCardTheme, setNewCardTheme] = useState('obsidian');

  // Payment States
  const [paymentAmount, setPaymentAmount] = useState(250);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Swap States
  const [swapAmount, setSwapAmount] = useState('');
  const [swapDirection, setSwapDirection] = useState('USD_TO_AFR');
  const [isSwapping, setIsSwapping] = useState(false);

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
  const formatPan = (digits) => digits ? digits.match(/.{1,4}/g).join(' ') : '';

  const triggerGlobalActionNotification = (type, message) => {
    setNotification({ type, text: message });
    setTimeout(() => setNotification(null), 6000);
  };

  const fetchData = useCallback(async () => {
    if (!profile?.id) return;
    setIsLoadingDB(true);
    try {
      const [cardRes, txRes, achRes] = await Promise.all([
        supabase.from('virtual_cards').select('*').eq('user_id', profile.id).order('created_at', { ascending: true }),
        supabase.from('transactions').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('profile_achievements').select('*').eq('user_id', profile.id).maybeSingle()
      ]);

      if (cardRes.data) {
        setCards(cardRes.data.map(c => ({ 
          ...c, 
          isFrozen: c.status !== 'ACTIVE',
          networkId: c.network_id 
        })));
      }
      if (txRes.data) setTransactions(txRes.data);
      if (achRes.data) setAchievements(achRes.data);
    } finally {
      setIsLoadingDB(false);
    }
  }, [profile?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleProvisionCard = async () => {
    if (!newCardName) return triggerGlobalActionNotification('error', 'Please provide a name for this card.');
    setIsProvisioning(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('issue-ifb-card', {
        body: { userId: profile.id, cardName: newCardName, theme: newCardTheme },
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await fetchData();
      setNewCardName('');
      setIsProvisioning(false);
      triggerGlobalActionNotification('success', `${newCardName} securely provisioned.`);
    } catch (err) {
      triggerGlobalActionNotification('error', err.message);
    } finally {
      setIsProvisioning(false);
    }
  };

  const toggleFreezeCurrentCard = async () => {
    const activeCard = cards[currentCardIndex];
    const newStatus = activeCard.isFrozen ? 'ACTIVE' : 'FROZEN';
    try {
      const { error } = await supabase.from('virtual_cards').update({ status: newStatus }).eq('id', activeCard.id);
      if (error) throw error;
      triggerGlobalActionNotification('success', `Card is now ${newStatus.toLowerCase()}.`);
      fetchData();
    } catch (err) {
      triggerGlobalActionNotification('error', err.message);
    }
  };

  const terminateCurrentCard = async () => {
    const activeCard = cards[currentCardIndex];
    if (!confirm(`Permanently delete ${activeCard.name}?`)) return;
    setVanishingCardId(activeCard.networkId);
    try {
      const { error } = await supabase.from('virtual_cards').delete().eq('id', activeCard.id);
      if (error) throw error;
      triggerGlobalActionNotification('success', 'Card terminated.');
      fetchData();
    } catch (err) {
      triggerGlobalActionNotification('error', err.message);
    } finally {
      setVanishingCardId(null);
    }
  };

  const handlePartnerPayment = async () => {
    if (!activeCard || activeCard.isFrozen) return triggerGlobalActionNotification('error', 'Card is unavailable or frozen.');
    setIsProcessingPayment(true);
    try {
      const { data, error } = await supabase.rpc('process_card_payment', {
        p_user_id: profile.id,
        p_merchant_name: 'Elite Global Medical Partner',
        p_amount: paymentAmount
      });

      if (error) throw error;
      if (data?.ok) {
        if (data.method === 'hybrid_insurance') {
          triggerGlobalActionNotification('success', `Approved! Clyrix bridged $${data.insurance_covered.toFixed(2)} shortfall.`);
        } else {
          triggerGlobalActionNotification('success', `Approved via Primary Balance.`);
        }
        fetchData();
        setCardTab('LEDGER');
      } else {
        triggerGlobalActionNotification('error', data?.error || 'Rejected by network.');
      }
    } catch (err) {
      triggerGlobalActionNotification('error', err.message);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const activeCard = cards[currentCardIndex];
  const cardTheme = activeCard && CARD_THEMES[activeCard.theme] ? CARD_THEMES[activeCard.theme] : CARD_THEMES.obsidian;

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 text-slate-800 relative">
      
      {/* 🏛️ Top Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white border border-slate-200 p-6 rounded-[2.5rem] shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Sovereign Accounts</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mt-1">Real-Time Ledger & Asset Interface</p>
        </div>
        <div className="flex bg-slate-100 p-2 rounded-2xl border border-slate-200 shadow-inner w-full md:w-auto overflow-x-auto no-scrollbar">
          {[{ id: 'PERSONAL', label: 'Balances' }, { id: 'CARDS', label: 'Infinite Card' }, { id: 'IDENTITY', label: 'Badging' }, { id: 'KYC', label: 'Compliance' }].map((tier) => (
            <button key={tier.id} onClick={() => setActiveTier(tier.id)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTier === tier.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>
              {tier.label}
            </button>
          ))}
        </div>
      </div>

      {/* 💳 TIER: INFINITE CARDS */}
      {activeTier === 'CARDS' && (
        <div className="space-y-8 animate-in slide-in-from-left-4">
          <div className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-sm relative overflow-hidden">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg"><CreditCard size={24}/></div>
                 <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Sovereign Card Hub</h3>
                    <p className="text-[9px] font-black uppercase text-blue-500 tracking-widest">Insurance-Backed Liquidity Interface</p>
                 </div>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button onClick={() => setCardTab('CARD')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${cardTab === 'CARD' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Card</button>
                <button onClick={() => setCardTab('PARTNERS')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${cardTab === 'PARTNERS' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>Pay Partner</button>
                <button onClick={() => setCardTab('LEDGER')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${cardTab === 'LEDGER' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Ledger</button>
              </div>
            </div>

            {/* VIEW 1: PREMIUM CARD DISPLAY */}
            {cardTab === 'CARD' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 animate-in fade-in">
                <div className="flex flex-col items-center">
                  {cards.length === 0 ? (
                    <div className="w-full space-y-6">
                      <div className="w-full aspect-[1.58/1] rounded-[2.5rem] border-4 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-400">
                         <CreditCard size={48} className="mb-4 opacity-20"/>
                         <p className="font-black text-[10px] uppercase tracking-widest">No Sovereign Card Issued</p>
                      </div>
                      <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 space-y-4">
                         <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Label Your Card</label>
                            <input className="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold text-sm outline-none focus:border-blue-500" value={newCardName} onChange={e=>setNewCardName(e.target.value)} placeholder="e.g., Personal Platinum"/>
                         </div>
                         <div className="flex gap-2">
                            {Object.entries(CARD_THEMES).map(([key, t]) => (
                               <button key={key} onClick={()=>setNewCardTheme(key)} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase border transition-all ${newCardTheme === key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200'}`}>{t.name.split(' ')[1]}</button>
                            ))}
                         </div>
                         <button onClick={handleProvisionCard} disabled={isProvisioning || !newCardName} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 shadow-xl flex items-center justify-center gap-2">
                            {isProvisioning ? <Loader2 size={16} className="animate-spin"/> : <><PlusCircle size={16}/> Provision Sovereign Card</>}
                         </button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full perspective-1000 group">
                       <div 
                         onClick={() => setIsFlipped(!isFlipped)}
                         className="w-full aspect-[1.58/1] relative transition-all duration-700 cursor-pointer shadow-[0_50px_100px_-20px_rgba(0,0,0,0.4)] rounded-[2.5rem]"
                         style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
                       >
                          {/* FRONT */}
                          <div className={`absolute inset-0 rounded-[2.5rem] p-10 flex flex-col justify-between overflow-hidden backface-hidden ${cardTheme.bg} border border-white/20`} style={{ backfaceVisibility: 'hidden' }}>
                             <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>
                             <div className="flex justify-between items-start z-10">
                                <div className="flex flex-col">
                                   <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/50 mb-1">IFB Sovereign</span>
                                   <span className="text-xl font-black italic tracking-tighter text-white uppercase">{activeCard.theme}</span>
                                </div>
                                <Wifi size={24} className="text-white/80 rotate-90" />
                             </div>
                             <div className="z-10">
                                <div className="w-14 h-10 bg-gradient-to-br from-amber-200 to-amber-500 rounded-lg mb-6 border border-white/20 shadow-inner"></div>
                                <p className="text-2xl font-black font-mono tracking-[0.15em] text-white drop-shadow-lg">
                                  {showCardDetails ? formatPan(activeCard.pan) : `•••• •••• •••• ${activeCard.pan?.slice(-4)}`}
                                </p>
                             </div>
                             <div className="flex justify-between items-end z-10">
                                <div><p className="text-[10px] font-black uppercase tracking-widest text-white/70">{profile?.full_name || 'ENTITY NAME'}</p></div>
                                <div className="flex flex-col items-end justify-center">
                                   <InfinityLogo className="w-20 h-10 text-amber-400" />
                                </div>
                             </div>
                          </div>
                          {/* BACK */}
                          <div className={`absolute inset-0 rounded-[2.5rem] bg-slate-900 backface-hidden flex flex-col justify-center items-center p-10 border border-white/10`} style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                             <div className="w-full h-12 bg-black/50 absolute top-10"></div>
                             <div className="w-full space-y-4">
                               <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest text-center">Network Signature</p>
                               <div className="w-full h-10 bg-slate-100/10 rounded-lg flex items-center px-4 font-mono text-[10px] text-white/50 border border-white/5 italic">Verified Sovereign Node Authenticated</div>
                               {showCardDetails && (
                                 <div className="flex justify-center gap-10 mt-4">
                                    <div><p className="text-[8px] font-black uppercase text-slate-500 mb-1">Expiry</p><p className="text-sm font-black font-mono text-white">{activeCard.expiry}</p></div>
                                    <div><p className="text-[8px] font-black uppercase text-slate-500 mb-1">CVV</p><p className="text-sm font-black font-mono text-white">{activeCard.cvv}</p></div>
                                 </div>
                               )}
                             </div>
                             <p className="text-[8px] font-black uppercase text-slate-600 mt-10">Electronic use only. Non-transferable.</p>
                          </div>
                       </div>
                    </div>
                  )}

                  {cards.length > 0 && (
                    <div className="flex flex-col w-full max-w-sm gap-4 mt-10">
                      <div className="flex gap-3">
                        <button onClick={()=>setShowCardDetails(!showCardDetails)} className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">{showCardDetails ? 'Hide' : 'Reveal'} Details</button>
                        <button onClick={toggleFreezeCurrentCard} className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeCard.isFrozen ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white shadow-lg hover:bg-red-600'}`}>{activeCard.isFrozen ? 'Unfreeze' : 'Freeze'} Card</button>
                      </div>
                      <button onClick={terminateCurrentCard} className="w-full py-4 bg-white text-red-500 border border-red-100 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 transition-all">Terminate Card</button>
                    </div>
                  )}
                </div>

                <div className="space-y-8">
                   <div className="bg-slate-50 border border-slate-200 p-8 rounded-[3rem] shadow-inner">
                      <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-6">Smart Liquidity Routing</h4>
                      <div className="space-y-4">
                         <div className="flex items-center justify-between p-5 bg-white rounded-3xl border border-slate-100 shadow-sm">
                            <div className="flex items-center gap-4">
                               <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><ShieldCheck size={20}/></div>
                               <div><p className="text-sm font-black text-slate-800">Clyrix Fallback</p><p className="text-[10px] font-bold text-slate-400 uppercase">Use insurance if balance is low</p></div>
                            </div>
                            <div className="w-12 h-6 bg-emerald-500 rounded-full relative shadow-inner"><div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div></div>
                         </div>
                         <div className="flex items-center justify-between p-5 bg-white rounded-3xl border border-slate-100 shadow-sm">
                            <div className="flex items-center gap-4">
                               <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Landmark size={20}/></div>
                               <div><p className="text-sm font-black text-slate-800">Auto-Sweep AFR</p><p className="text-[10px] font-bold text-slate-400 uppercase">Liquidate tokens for payments</p></div>
                            </div>
                            <div className="w-12 h-6 bg-slate-200 rounded-full relative shadow-inner"><div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full"></div></div>
                         </div>
                      </div>
                   </div>

                   <div className="p-8 bg-slate-900 rounded-[3rem] text-white relative overflow-hidden">
                      <Flame className="absolute bottom-[-10%] right-[-5%] w-32 h-32 text-emerald-500/10 pointer-events-none" />
                      <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-4">Ledger Health</h4>
                      <div className="flex items-end gap-2 mb-6">
                         <span className="text-4xl font-black tracking-tighter">99.9%</span>
                         <span className="text-[10px] font-black uppercase text-emerald-400 pb-1 flex items-center gap-1"><BadgeCheck size={12}/> Sovereign Integrity</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed font-medium">Your card is currently anchored to Node #8802 with 256-bit encryption. All swipes are finalized on the hardened blockchain ledger in real-time.</p>
                   </div>
                </div>
              </div>
            )}

            {/* VIEW 2: PARTNER PAYMENT SIMULATOR */}
            {cardTab === 'PARTNERS' && (
              <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 space-y-10">
                 <div className="text-center">
                    <h3 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Partner Terminal</h3>
                    <p className="text-sm font-medium text-slate-500 mt-2">Test your card's smart liquidity at authorized network partners.</p>
                 </div>

                 <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-200 shadow-inner">
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 mb-8 flex justify-between items-center group hover:border-blue-500 transition-all">
                       <div className="flex items-center gap-5">
                          <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all"><Activity size={28}/></div>
                          <div>
                             <h4 className="text-xl font-black text-slate-800">Elite Global Medical Partner</h4>
                             <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1 flex items-center gap-1"><Globe size={10} className="text-emerald-500"/> Verified Network Provider</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Charge Amount</p>
                          <div className="flex items-center gap-1 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                             <span className="font-black text-slate-800">$</span>
                             <input type="number" className="w-20 bg-transparent font-black text-xl outline-none" value={paymentAmount} onChange={e=>setPaymentAmount(+e.target.value)} />
                          </div>
                       </div>
                    </div>

                    <button onClick={handlePartnerPayment} disabled={isProcessingPayment} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-emerald-600 transition-all shadow-2xl flex items-center justify-center gap-4">
                       {isProcessingPayment ? <Loader2 size={20} className="animate-spin" /> : <><Flame size={20} fill="currentColor"/> Authorize Hybrid Swipe</>}
                    </button>
                    
                    <div className="mt-8 flex items-center gap-3 justify-center">
                       <Info size={14} className="text-blue-500"/>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">If balance is low, Clyrix insurance will bridge the shortfall automatically.</p>
                    </div>
                 </div>
              </div>
            )}

            {/* VIEW 3: LEDGER */}
            {cardTab === 'LEDGER' && (
              <div className="animate-in fade-in space-y-6">
                 <h4 className="text-xl font-black text-slate-800 tracking-tight uppercase border-b border-slate-100 pb-4">Transactional Ledger Proof</h4>
                 {transactions.length === 0 ? (
                    <div className="py-20 text-center text-slate-400 font-black uppercase text-xs tracking-widest">Zero entries on ledger.</div>
                 ) : (
                    <div className="space-y-4">
                       {transactions.map(tx => (
                          <div key={tx.id} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex justify-between items-center group hover:shadow-md transition-all">
                             <div className="flex items-center gap-5">
                                <div className={`p-3 rounded-2xl ${tx.amount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}><Receipt size={20}/></div>
                                <div>
                                   <p className="font-black text-slate-800">{tx.description || 'Merchant Transaction'}</p>
                                   <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-1">{new Date(tx.created_at).toLocaleString()} • Blockchain Verified</p>
                                </div>
                             </div>
                             <div className="text-right">
                                <p className={`text-xl font-black ${tx.amount > 0 ? 'text-emerald-500' : 'text-slate-800'}`}>{tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}</p>
                                <p className="text-[8px] font-mono text-slate-400 uppercase mt-1">TXID: {tx.id.slice(0,12).toUpperCase()}</p>
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🏅 TIER: DYNAMIC BADGING (IDENTITY) */}
      {activeTier === 'IDENTITY' && (
        <div className="animate-in slide-in-from-left-4 space-y-8">
           <div className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-sm">
              <div className="flex justify-between items-end mb-12">
                 <div>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Verified Achievements</h3>
                    <p className="text-sm font-medium text-slate-500 mt-2">Dynamic status badges derived from your real-time activities within IFB.</p>
                 </div>
                 <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Reputation Score</p>
                    <p className="text-2xl font-black text-blue-600">842 <span className="text-[10px] text-blue-400 uppercase">PTs</span></p>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                 {/* Badge: Investor */}
                 <div className={`p-10 rounded-[3.5rem] border-4 transition-all relative group overflow-hidden ${achievements?.is_investor ? 'bg-blue-50 border-blue-200 shadow-xl' : 'bg-slate-50 border-slate-100 opacity-30 grayscale'}`}>
                    <Star className="absolute top-[-10%] right-[-10%] w-24 h-24 text-blue-500/5 group-hover:scale-110 transition-transform" />
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 shadow-lg ${achievements?.is_investor ? 'bg-blue-600 text-white' : 'bg-slate-300 text-slate-500'}`}><Zap size={32}/></div>
                    <h4 className="text-2xl font-black text-slate-800 mb-1">Investor</h4>
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Capital Allocator</p>
                 </div>

                 {/* Badge: Entrepreneur */}
                 <div className={`p-10 rounded-[3.5rem] border-4 transition-all relative group overflow-hidden ${achievements?.is_entrepreneur ? 'bg-indigo-50 border-indigo-200 shadow-xl' : 'bg-slate-50 border-slate-100 opacity-30 grayscale'}`}>
                    <Rocket className="absolute top-[-10%] right-[-10%] w-24 h-24 text-indigo-500/5 group-hover:scale-110 transition-transform" />
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 shadow-lg ${achievements?.is_entrepreneur ? 'bg-indigo-600 text-white' : 'bg-slate-300 text-slate-500'}`}><Landmark size={32}/></div>
                    <h4 className="text-2xl font-black text-slate-800 mb-1">Founder</h4>
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Innovation Agent</p>
                 </div>

                 {/* Badge: NPO */}
                 <div className={`p-10 rounded-[3.5rem] border-4 transition-all relative group overflow-hidden ${achievements?.is_npo ? 'bg-emerald-50 border-emerald-200 shadow-xl' : 'bg-slate-50 border-slate-100 opacity-30 grayscale'}`}>
                    <Globe className="absolute top-[-10%] right-[-10%] w-24 h-24 text-emerald-500/5 group-hover:scale-110 transition-transform" />
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 shadow-lg ${achievements?.is_npo ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-500'}`}><Users size={32}/></div>
                    <h4 className="text-2xl font-black text-slate-800 mb-1">Impact</h4>
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Global Partner</p>
                 </div>

                 {/* Badge: Insured */}
                 <div className={`p-10 rounded-[3.5rem] border-4 transition-all relative group overflow-hidden ${achievements?.is_insured ? 'bg-amber-50 border-amber-200 shadow-xl' : 'bg-slate-50 border-slate-100 opacity-30 grayscale'}`}>
                    <ShieldCheck className="absolute top-[-10%] right-[-10%] w-24 h-24 text-amber-500/5 group-hover:scale-110 transition-transform" />
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 shadow-lg ${achievements?.is_insured ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-400'}`}><ShieldCheck size={32}/></div>
                    <h4 className="text-2xl font-black text-slate-800 mb-1">Protected</h4>
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Sovereign Safety</p>
                 </div>
              </div>

              <div className="mt-12 bg-slate-50 border border-slate-100 p-8 rounded-[3rem] flex items-center justify-between">
                 <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-white rounded-full border border-slate-200 flex items-center justify-center shadow-sm font-black text-xl text-slate-800">+{achievements?.follower_count || 0}</div>
                    <div>
                       <p className="font-black text-lg text-slate-800">Global Social Capital</p>
                       <p className="text-xs font-medium text-slate-500">Your network size directly influences your dynamic interest rates and insurance premiums.</p>
                    </div>
                 </div>
                 <button className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all">Audit Reputation</button>
              </div>
           </div>
        </div>
      )}

      {/* 💳 TIER: PERSONAL & PRIVATE */}
      {activeTier === 'PERSONAL' && (
        <div className="space-y-8 animate-in slide-in-from-left-4">
          <div className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600 border border-blue-100"><Globe2 size={18} /></div> 
                Global Currency Balances
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-colors cursor-pointer">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none group-hover:bg-blue-200/50 transition-colors"></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center justify-between">USD • United States <Wallet size={12} className="text-blue-600"/></p>
                <p className="text-2xl font-black text-slate-800 tracking-tight relative z-10">{formatCurrency(balances?.liquid_usd)}</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-colors cursor-pointer">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none group-hover:bg-emerald-200/50 transition-colors"></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center justify-between">AFR • Blockchain <Zap size={12} className="text-emerald-500"/></p>
                <p className="text-2xl font-black text-slate-800 tracking-tight relative z-10">{balances?.afr_balance ? parseFloat(balances.afr_balance).toFixed(2) : '0.00'} <span className="text-sm text-slate-400">AFR</span></p>
              </div>
            </div>

            <div className="mt-8 p-8 bg-slate-50 border border-slate-200 rounded-[2rem] shadow-inner">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <RefreshCw size={18} className="text-blue-600"/> Liquidity Exchange
                  </h4>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">0.25% Network Spread Applies</p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="flex-1 w-full bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest w-16">
                    {swapDirection === 'USD_TO_AFR' ? 'USD' : 'AFR'}
                  </span>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    className="w-full text-right text-xl font-black text-slate-800 outline-none"
                    value={swapAmount}
                    onChange={(e) => setSwapAmount(e.target.value)}
                  />
                </div>

                <button 
                  onClick={() => setSwapDirection(prev => prev === 'USD_TO_AFR' ? 'AFR_TO_USD' : 'USD_TO_AFR')}
                  className="p-3 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors hover:rotate-180 duration-300"
                >
                  <ArrowLeftRight size={20} />
                </button>

                <div className="flex-1 w-full bg-slate-100 p-4 rounded-xl border border-slate-200 shadow-inner flex items-center justify-between">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest w-16">
                    {swapDirection === 'USD_TO_AFR' ? 'AFR' : 'USD'}
                  </span>
                  <span className="text-xl font-black text-slate-600">
                    {swapAmount ? (swapAmount * 0.9975).toFixed(4) : '0.00'}
                  </span>
                </div>
              </div>

              <button 
                onClick={fetchData} 
                disabled={isSwapping || !swapAmount} 
                className="w-full mt-6 py-4 bg-slate-800 hover:bg-slate-700 text-white font-black text-[11px] uppercase tracking-widest rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSwapping ? <RefreshCw className="animate-spin" size={16}/> : <Zap size={16}/>}
                {isSwapping ? 'Executing Swap...' : 'Confirm Exchange'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* KYC IDENTITY VERIFICATION */}
      {activeTier === 'KYC' && <KYCSection profile={profile} />}

      {/* 🟢 GLOBAL NOTIFICATION LAYER */}
      {notification && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[500] animate-in slide-in-from-top-10 duration-500">
           <div className={`px-8 py-5 rounded-3xl shadow-2xl border-2 backdrop-blur-2xl flex items-center gap-4 ${notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
             <p className="font-black text-[11px] uppercase tracking-[0.2em]">{notification.text}</p>
           </div>
        </div>
      )}
    </div>
  );
}
