import { useState, useEffect } from 'react';
import { 
  Briefcase, Users, Baby, Link as LinkIcon, 
  Globe2, Building2, ShieldAlert, Plus, ArrowRight,
  CreditCard, Trash2, Wallet, RefreshCw, Zap, ArrowLeftRight,
  Settings, Lock, ScanLine, Store, CheckCircle2, PlusCircle,
  ChevronLeft, ChevronRight, Download, Receipt, Eye, EyeOff, Unlock, Wifi,
  ShoppingBag, ArrowDownRight, MapPin
} from 'lucide-react';
import { supabase } from './services/supabaseClient';

const CARD_THEMES = {
  obsidian: { name: 'Obsidian Dark', bg: 'bg-gradient-to-br from-slate-900 via-blue-950 to-black', border: 'border-blue-500/30', textPrimary: 'text-white', textSecondary: 'text-blue-200/70', accent: 'text-blue-200' },
  silver: { name: 'Titanium Silver', bg: 'bg-gradient-to-br from-slate-300 via-gray-100 to-slate-400', border: 'border-white', textPrimary: 'text-slate-800', textSecondary: 'text-slate-500', accent: 'text-slate-600' },
  gold: { name: 'Sovereign Gold', bg: 'bg-gradient-to-br from-yellow-500 via-amber-300 to-yellow-600', border: 'border-yellow-200/50', textPrimary: 'text-yellow-950', textSecondary: 'text-yellow-800/70', accent: 'text-yellow-900' },
  rainbow: { name: 'Holographic', bg: 'bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500', border: 'border-white/30', textPrimary: 'text-white', textSecondary: 'text-white/70', accent: 'text-white' },
  framed: { name: 'Executive Frame', bg: 'bg-slate-900', border: 'border-4 border-amber-500', textPrimary: 'text-amber-500', textSecondary: 'text-amber-500/70', accent: 'text-amber-500' }
};

export default function AccountHub({ balances, profile }) {
  const [activeTier, setActiveTier] = useState('PERSONAL'); 
  const [notification, setNotification] = useState(null);
  const [isLoadingDB, setIsLoadingDB] = useState(true);

  // --- DATABASE-BACKED STATES ---
  const [cards, setCards] = useState([]); 
  const [transactions, setTransactions] = useState([]);

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

  // Scanner & Merchant States
  const [merchantAmount, setMerchantAmount] = useState('');
  const [generatedIntent, setGeneratedIntent] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [scanIntentId, setScanIntentId] = useState('');
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

  const fetchNetworkData = async () => {
    if (!profile?.id) return;
    setIsLoadingDB(true);
    try {
      const { data: cardData, error: cardError } = await supabase
        .from('virtual_cards')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: true });

      if (cardError && cardError.code !== '42P01') throw cardError; 

      if (cardData) {
        const formattedCards = cardData.map(c => ({
          ...c,
          networkId: c.network_id,
          isFrozen: c.status !== 'ACTIVE'
        }));
        setCards(formattedCards);
        if (currentCardIndex >= formattedCards.length) setCurrentCardIndex(Math.max(0, formattedCards.length - 1));
      } else {
        setCards([]);
      }
      
      const { data: txData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20); 
        
      if (txData) setTransactions(txData);

    } catch (err) {
      console.error("Database sync failed", err);
    } finally {
      setIsLoadingDB(false);
    }
  };

  useEffect(() => { fetchNetworkData(); }, [profile?.id]);

  const handleCurrencySwap = async () => {
    if (!swapAmount || swapAmount <= 0) return triggerGlobalActionNotification('error', 'Enter a valid amount to swap.');
    setIsSwapping(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('process-afr-transfer', {
        body: {
          receiver_address: swapDirection === 'AFR_TO_USD' ? '0xIFB_TREASURY_RESERVE' : '0xIFB_INTERNAL_MINT',
          amount: parseFloat(swapAmount)
        }
      });

      if (error) throw new Error("Network Bridge Error: " + error.message);
      if (data?.error) throw new Error("Ledger Rejected: " + data.error);

      await fetchNetworkData();
      setSwapAmount('');
      
      const spreadFee = parseFloat(swapAmount) * 0.0025;
      triggerGlobalActionNotification('success', `Settled on Mainnet. Hash: ${data.tx_hash?.slice(0, 10)}... (Fee: $${spreadFee.toFixed(2)})`);
      
    } catch (err) {
      triggerGlobalActionNotification('error', err.message);
    } finally {
      setIsSwapping(false);
    }
  };

  // 🛡️ SECURE CARD PROVISIONING via EDGE FUNCTION
  const handleProvisionCard = async () => {
    if (!newCardName) return triggerGlobalActionNotification('error', 'Please provide a name for this card.');
    if (!profile?.id) return triggerGlobalActionNotification('error', 'User profile ID not found.');

    setIsProvisioning(true);

    try {
      const { data, error } = await supabase.functions.invoke('issue-ifb-card', {
        body: {
          userId: profile.id,
          cardName: newCardName,
          theme: newCardTheme
        }
      });

      if (error) throw new Error("Network Bridge Error: " + error.message);
      if (data?.error) throw new Error("Issuance Rejected: " + data.error);
      
      await fetchNetworkData();
      setCurrentCardIndex(cards.length); 
      setNewCardName('');
      setNewCardTheme('obsidian');
      triggerGlobalActionNotification('success', `${newCardName} securely provisioned.`);
      
    } catch (err) { 
      triggerGlobalActionNotification('error', `Issuance Error: ${err.message}`); 
    } finally {
      setIsProvisioning(false);
    }
  };

  const terminateCurrentCard = async () => {
    const cardToTerminate = cards[currentCardIndex];
    if(!confirm(`Permanently delete ${cardToTerminate.name}? This will wipe it from the secure database.`)) return;
    
    setVanishingCardId(cardToTerminate.networkId);
    setIsFlipped(false);

    setTimeout(async () => {
      try {
        const { error } = await supabase.from('virtual_cards').delete().eq('network_id', cardToTerminate.networkId);
        if (error) throw error;
        await fetchNetworkData();
        setVanishingCardId(null);
        triggerGlobalActionNotification('success', `${cardToTerminate.name} terminated from ledger.`);
      } catch (err) {
        setVanishingCardId(null);
        triggerGlobalActionNotification('error', err.message);
      }
    }, 800);
  };

  const toggleFreezeCurrentCard = async () => {
    const activeCard = cards[currentCardIndex];
    const newStatus = activeCard.isFrozen ? 'ACTIVE' : 'FROZEN';

    const updatedCards = [...cards];
    updatedCards[currentCardIndex].isFrozen = !activeCard.isFrozen;
    setCards(updatedCards);

    try {
      const { error } = await supabase.from('virtual_cards').update({ status: newStatus }).eq('network_id', activeCard.networkId);
      if (error) throw error;
      triggerGlobalActionNotification(newStatus === 'FROZEN' ? 'error' : 'success', `Card is now ${newStatus}`);
    } catch (err) {
      triggerGlobalActionNotification('error', 'Failed to update freeze status.');
      fetchNetworkData(); 
    }
  };

  const handleGenerateIntent = async () => {
    if (!merchantAmount || merchantAmount <= 0) return;
    setIsGenerating(true);
    try {
      const intentId = `IFB-REQ-${Math.floor(100000 + Math.random() * 900000)}`;
      setGeneratedIntent({ intentId, amount: merchantAmount });
      triggerGlobalActionNotification('success', `Payment Request Generated: ${intentId}`);
    } catch (err) { triggerGlobalActionNotification('error', err.message); } finally { setIsGenerating(false); }
  };

  const handleProcessPayment = async () => {
    if (!scanIntentId || cards.length === 0) return;
    const activeCard = cards[currentCardIndex];
    if (activeCard.isFrozen) return triggerGlobalActionNotification('error', 'Card is frozen. Unfreeze to execute.');

    setIsProcessingPayment(true);
    try {
      setTimeout(() => {
        triggerGlobalActionNotification('success', `APPROVED: Settled via Primary Balance.`);
        setScanIntentId('');
        setCardTab('LEDGER');
        setIsProcessingPayment(false);
      }, 1500);
    } catch (err) { 
      setIsProcessingPayment(false);
      triggerGlobalActionNotification('error', `DECLINED: ${err.message}`); 
    } 
  };

  const downloadReceipt = (tx) => {
    const receiptContent = `========================================\n       INFINITE FUTURE BANK (IFB)       \n          OFFICIAL TRANSACTION          \n========================================\nReceipt ID:     ${tx.id}\nDate/Time:      ${new Date(tx.created_at).toLocaleString()}\nAmount Settled: $${Math.abs(tx.amount)}\nType:           ${tx.transaction_type}\nStatus:         ${tx.status}\n========================================`;
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `IFB_Receipt_${tx.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseTransactionDetails = (tx) => {
    const typeStr = (tx.transaction_type || '').toLowerCase();
    const meta = tx.metadata || {};
    
    let merchantName = tx.description || "Point of Sale";
    let location = meta.location || "Online Transaction";
    let Icon = CreditCard;
    let iconBg = "bg-blue-50";
    let iconColor = "text-blue-500";

    if (typeStr.includes('card') || typeStr.includes('expense')) {
      merchantName = meta.merchant || tx.description || "Card Purchase";
      Icon = ShoppingBag;
      iconBg = "bg-purple-50";
      iconColor = "text-purple-500";
    } else if (typeStr.includes('deposit') || tx.amount > 0) {
      merchantName = meta.source || tx.description || "Incoming Transfer";
      Icon = ArrowDownRight;
      iconBg = "bg-emerald-50";
      iconColor = "text-emerald-500";
    }

    return { merchantName, location, Icon, iconBg, iconColor };
  };

  const activeCard = cards[currentCardIndex];
  const theme = activeCard && CARD_THEMES[activeCard.theme] ? CARD_THEMES[activeCard.theme] : CARD_THEMES.obsidian;

  const cardSpecificTransactions = transactions.filter(tx => {
    if (!activeCard) return false;
    const isCardTx = tx.transaction_type.toLowerCase().includes('card') || tx.transaction_type.toLowerCase().includes('expense');
    if (tx.metadata?.network_id) return tx.metadata.network_id === activeCard.networkId;
    return isCardTx;
  }).slice(0, 5);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 text-slate-800 relative">
      
      {/* 🏛️ Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white border border-slate-200 p-6 rounded-[2.5rem] shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Sovereign Accounts</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mt-1">Manage your institutional entities</p>
        </div>
        <div className="flex bg-slate-100 p-2 rounded-2xl border border-slate-200 shadow-inner w-full md:w-auto overflow-x-auto no-scrollbar">
          {[{ id: 'PERSONAL', label: 'Retail & Private' }, { id: 'CARDS', label: 'Infinite Cards' }, { id: 'BUSINESS', label: 'Commercial' }].map((tier) => (
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
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600 border border-blue-100"><CreditCard size={18} /></div> 
                Proprietary Network
                {isLoadingDB && <RefreshCw size={14} className="animate-spin text-slate-400 ml-2" />}
              </h3>
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button onClick={() => setCardTab('CARD')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${cardTab === 'CARD' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}><CreditCard size={14} className="inline mr-1"/> Portfolio</button>
                <button onClick={() => setCardTab('SCAN')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${cardTab === 'SCAN' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}><ScanLine size={14} className="inline mr-1"/> Pay</button>
                <button onClick={() => setCardTab('MERCHANT')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${cardTab === 'MERCHANT' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500'}`}><Store size={14} className="inline mr-1"/> POS</button>
                <button onClick={() => setCardTab('LEDGER')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${cardTab === 'LEDGER' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}><Receipt size={14} className="inline mr-1"/> Ledger</button>
              </div>
            </div>

            {/* VIEW 1: PORTFOLIO & STUDIO */}
            {cardTab === 'CARD' && (
              <div className="flex flex-col lg:flex-row gap-12 animate-in fade-in">
                <div className="flex-1 flex flex-col items-center">
                  
                  {isProvisioning ? (
                    <div className="w-full max-w-md bg-slate-50 border border-slate-200 rounded-3xl p-8">
                      <h4 className="font-black text-slate-800 mb-6">Create New Card</h4>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Card Designation (Name)</label>
                      <input type="text" placeholder="e.g. Travel Expenses" className="w-full p-4 bg-white border border-slate-200 rounded-xl mb-6 font-bold outline-none focus:border-blue-500" value={newCardName} onChange={(e) => setNewCardName(e.target.value)} />
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Select Permanent Material</label>
                      <div className="flex flex-wrap gap-3 mb-8">
                        {Object.entries(CARD_THEMES).map(([key, config]) => (
                          <button key={key} onClick={() => setNewCardTheme(key)} className={`relative w-12 h-12 rounded-full border-2 transition-all ${newCardTheme === key ? 'border-blue-500 shadow-md scale-110' : 'border-transparent opacity-60'} ${config.bg}`} title={config.name}>
                            {newCardTheme === key && <CheckCircle2 size={16} className={`absolute -top-2 -right-2 ${key === 'silver' ? 'text-blue-600 bg-white' : 'text-white bg-blue-500'} rounded-full`} />}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-4">
                        <button onClick={() => setIsProvisioning(false)} className="flex-1 py-4 font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-all">Cancel</button>
                        <button onClick={handleProvisionCard} className="flex-1 py-4 bg-blue-600 text-white font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-md flex items-center justify-center gap-2">
                          <Zap size={14}/> Issue to DB
                        </button>
                      </div>
                    </div>
                  ) : cards.length === 0 ? (
                    <div className="w-full max-w-md aspect-[1.586/1] rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-500 p-8 text-center transition-all hover:border-blue-400 hover:bg-blue-50 cursor-pointer shadow-sm" onClick={() => setIsProvisioning(true)}>
                      {isLoadingDB ? <RefreshCw size={48} className="mb-4 text-blue-500 opacity-50 animate-spin"/> : <PlusCircle size={48} className="mb-4 text-blue-500 opacity-50"/>}
                      <h3 className="font-black text-slate-800 text-lg mb-1">{isLoadingDB ? 'Syncing Ledger...' : 'Provision Virtual Card'}</h3>
                    </div>
                  ) : (
                    <div className="w-full max-w-md relative group" style={{ perspective: '1000px' }}>
                      
                      {cards.length > 1 && (
                        <>
                          <button onClick={() => { setIsFlipped(false); setCurrentCardIndex((prev) => (prev === 0 ? cards.length - 1 : prev - 1)); }} className="absolute -left-10 sm:-left-12 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-blue-600 transition-colors z-20"><ChevronLeft size={24}/></button>
                          <button onClick={() => { setIsFlipped(false); setCurrentCardIndex((prev) => (prev === cards.length - 1 ? 0 : prev + 1)); }} className="absolute -right-10 sm:-right-12 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-blue-600 transition-colors z-20"><ChevronRight size={24}/></button>
                        </>
                      )}

                      {/* THE MAGIC CARD RENDER */}
                      <div 
                        onClick={() => setIsFlipped(!isFlipped)}
                        className={`w-full cursor-pointer transition-all duration-700 ease-in-out relative ${vanishingCardId === activeCard.networkId ? 'scale-50 blur-2xl opacity-0 rotate-12 -translate-y-10' : 'scale-100 blur-0 opacity-100'}`} 
                        style={{ 
                          transformStyle: 'preserve-3d', 
                          transform: isFlipped && vanishingCardId !== activeCard.networkId ? 'rotateY(180deg)' : 'rotateY(0deg)',
                          minHeight: '220px',
                          aspectRatio: '1.586/1'
                        }}
                      >
                        {/* FRONT FACE */}
                        <div className={`absolute inset-0 rounded-2xl sm:rounded-3xl p-5 sm:p-7 flex flex-col justify-between shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden ${activeCard.isFrozen ? 'bg-slate-800 grayscale border-slate-600' : `${theme.bg} border border-white/20`}`} 
                             style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
                          
                          <div className="flex justify-between items-start z-10 w-full">
                            <div className="flex items-center gap-2">
                              <Zap size={24} className={theme.textPrimary} fill="currentColor" />
                              <h2 className={`${theme.textPrimary} font-black text-lg tracking-tighter`}>IFB</h2>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Wifi size={18} className={`${theme.textPrimary} opacity-80 rotate-90`} />
                              <span className={`px-2 py-0.5 bg-white/10 rounded-lg text-[7px] font-black ${theme.accent} backdrop-blur-md border border-white/20 uppercase tracking-widest shadow-sm truncate max-w-[100px]`}>{activeCard.name}</span>
                            </div>
                          </div>

                          <div className="z-10 flex flex-col mt-auto mb-4 sm:mb-6">
                            <div className="w-10 h-7 sm:w-12 sm:h-9 rounded-md bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-600 border border-yellow-500/50 opacity-90 shadow-sm relative overflow-hidden mb-3 sm:mb-4">
                              <div className="absolute top-1/2 left-0 w-full h-[1px] bg-yellow-600/30"></div>
                              <div className="absolute top-0 left-1/3 w-[1px] h-full bg-yellow-600/30"></div>
                              <div className="absolute top-0 right-1/3 w-[1px] h-full bg-yellow-600/30"></div>
                            </div>
                            
                            <p className={`${theme.textPrimary} font-mono text-lg sm:text-2xl tracking-[0.1em] sm:tracking-[0.15em] whitespace-nowrap drop-shadow-md transition-all`}>
                              {showCardDetails ? formatPan(activeCard.pan) : `•••• •••• •••• ${activeCard.pan?.slice(-4) || '0000'}`}
                            </p>
                          </div>
                          
                          <div className="flex justify-between items-end z-10 w-full">
                            <div className="flex flex-col gap-2">
                              <div className="flex gap-4">
                                <div>
                                  <p className={`${theme.textSecondary} text-[6px] sm:text-[8px] uppercase tracking-[0.2em] font-black opacity-80 mb-0.5`}>Valid Thru</p>
                                  <p className={`${theme.textPrimary} font-mono text-[10px] sm:text-xs tracking-widest`}>{showCardDetails ? activeCard.expiry : '••/••'}</p>
                                </div>
                                <div>
                                  <p className={`${theme.textSecondary} text-[6px] sm:text-[8px] uppercase tracking-[0.2em] font-black opacity-80 mb-0.5`}>CVV</p>
                                  <p className={`${theme.textPrimary} font-mono text-[10px] sm:text-xs tracking-widest`}>{showCardDetails ? activeCard.cvv : '•••'}</p>
                                </div>
                              </div>
                              <p className={`${theme.textPrimary} font-black uppercase tracking-[0.1em] text-xs sm:text-sm drop-shadow-md truncate max-w-[200px]`}>{profile?.full_name || 'SOVEREIGN ENTITY'}</p>
                            </div>
                            <div className="text-right">
                              <p className={`font-black text-[8px] sm:text-[9px] uppercase tracking-widest drop-shadow-md px-2 py-1 rounded border ${activeCard.isFrozen ? 'bg-red-500/20 text-red-100 border-red-500/30' : 'bg-white/10 text-white border-white/20'}`}>
                                {activeCard.isFrozen ? 'FROZEN' : 'ACTIVE'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* BACK FACE */}
                        <div className={`absolute inset-0 rounded-2xl sm:rounded-3xl flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden ${activeCard.isFrozen ? 'bg-slate-800 grayscale' : theme.bg} border border-white/20`} 
                             style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                          
                          <div className="w-full h-10 sm:h-14 bg-slate-900 mt-6 shadow-inner"></div> 

                          <div className="px-6 sm:px-8 py-4 flex-1 flex flex-col justify-center z-10 w-full text-center">
                            <p className={`${theme.textSecondary} text-[8px] uppercase tracking-[0.2em] font-black opacity-80 mb-2`}>Internal Network ID</p>
                            <p className={`${theme.textPrimary} font-mono text-[10px] tracking-tighter bg-white/5 p-3 rounded-lg border border-white/10 break-all`}>{activeCard.network_id || activeCard.networkId}</p>
                            <p className={`${theme.textSecondary} text-[8px] uppercase tracking-widest mt-6 opacity-50`}>Authorized signature required. Issued by IFB.</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-center gap-2 mt-8">
                        {cards.map((_, i) => (
                          <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === currentCardIndex ? 'bg-blue-600 w-4' : 'bg-slate-300'}`}></div>
                        ))}
                      </div>

                      <div className="flex flex-wrap justify-center gap-2 mt-6 w-full">
                        <button onClick={(e) => { e.stopPropagation(); setShowCardDetails(!showCardDetails); }} className="flex-1 min-w-[120px] flex justify-center items-center gap-2 px-4 py-3 bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all shadow-md">
                          {showCardDetails ? <><EyeOff size={14}/> Mask</> : <><Eye size={14}/> Reveal</>}
                        </button>
                        <button onClick={toggleFreezeCurrentCard} className={`flex-1 min-w-[120px] flex justify-center items-center gap-2 px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeCard.isFrozen ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}>
                          {activeCard.isFrozen ? <Unlock size={14}/> : <Lock size={14}/>} {activeCard.isFrozen ? 'Unfreeze' : 'Freeze'}
                        </button>
                        <button onClick={() => setIsProvisioning(true)} className="flex-1 min-w-[120px] flex justify-center items-center gap-2 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">
                          <Plus size={14}/> Add
                        </button>
                        <button onClick={terminateCurrentCard} className="flex-1 min-w-[120px] flex justify-center items-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-xl border border-red-100 font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all">
                          <Trash2 size={14}/> Delete
                        </button>
                      </div>

                      {/* 🔥 NEW: CARD SPECIFIC RECENT ACTIVITY */}
                      <div className="mt-12 w-full border-t border-slate-200 pt-8">
                        <div className="flex items-center justify-between mb-6">
                          <h4 className="font-black text-slate-800 tracking-tight text-sm">Recent Card Activity</h4>
                          <button onClick={() => setCardTab('LEDGER')} className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline">View All</button>
                        </div>
                        
                        {cardSpecificTransactions.length === 0 ? (
                          <div className="text-center py-6 bg-slate-50 border border-slate-100 rounded-2xl">
                            <Store size={24} className="mx-auto mb-2 text-slate-300"/>
                            <p className="text-xs font-bold text-slate-500">No recent sweeps on this card.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {cardSpecificTransactions.map(tx => {
                              const { merchantName, location, Icon, iconBg, iconColor } = parseTransactionDetails(tx);
                              return (
                                <div key={tx.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-slate-200 transition-colors">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBg} ${iconColor} shrink-0`}>
                                      <Icon size={16} />
                                    </div>
                                    <div className="overflow-hidden">
                                      <p className="font-bold text-sm text-slate-800 truncate">{merchantName}</p>
                                      <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                                        <MapPin size={10} /> {location} • {new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className={`font-black text-sm ${tx.amount > 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
                                      {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>

                {/* Right: AI Routing Logic Display */}
                <div className="flex-1 bg-slate-50 rounded-3xl p-8 border border-slate-200 shadow-inner h-fit hidden lg:block">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Zap size={16}/></div>
                    <div><h4 className="font-black text-slate-800 tracking-tight">AI Payment Routing</h4><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Auto-funding prioritization</p></div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                      <div className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-xs">1</span><span className="font-bold text-sm text-slate-700">USD Fiat Balance</span></div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">Primary</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                      <div className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-xs">2</span><span className="font-bold text-sm text-slate-700">Auto-Liquidate AFR</span></div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">Fallback</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 2: PAY / SCANNER */}
            {cardTab === 'SCAN' && (
              <div className="max-w-md mx-auto animate-in fade-in">
                {cards.length === 0 ? (
                  <div className="text-center p-8 bg-red-50 text-red-600 rounded-2xl border border-red-100">
                    <ShieldAlert size={32} className="mx-auto mb-4 opacity-50"/>
                    <h4 className="font-black">No Active Card Found</h4>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-4 px-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Paying With:</span>
                      <span className="text-xs font-bold text-blue-600">{activeCard?.name} (...{activeCard?.pan?.slice(-4)})</span>
                    </div>
                    <div className="h-48 border-2 border-dashed border-emerald-500/50 rounded-2xl flex flex-col items-center justify-center mb-6 bg-emerald-50 text-emerald-600">
                      <ScanLine size={48} className="mb-4 opacity-50"/>
                      <p className="font-bold text-sm uppercase tracking-widest">Camera Interface (Simulated)</p>
                    </div>
                    <input type="text" placeholder="Paste Intent ID (e.g., IFB-REQ-...)" className="w-full p-4 mb-4 bg-white border border-slate-200 rounded-xl text-slate-800 font-mono text-sm outline-none focus:border-emerald-500 transition-all" value={scanIntentId} onChange={(e) => setScanIntentId(e.target.value)} />
                    <button onClick={handleProcessPayment} disabled={isProcessingPayment || !scanIntentId} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] uppercase tracking-widest rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
                      {isProcessingPayment ? <RefreshCw className="animate-spin" size={16}/> : <Zap size={16}/>}
                      {isProcessingPayment ? 'Executing Settlement...' : 'Approve Payment'}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* VIEW 3: MERCHANT TERMINAL */}
            {cardTab === 'MERCHANT' && (
              <div className="max-w-md mx-auto animate-in fade-in">
                <div className="bg-purple-50 p-8 rounded-3xl border border-purple-100 text-center">
                  <h4 className="font-black text-purple-900 text-xl tracking-tight mb-6">Create Payment Request</h4>
                  <div className="relative mb-6">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 font-black text-2xl">$</span>
                    <input type="number" placeholder="0.00" className="w-full p-4 pl-12 bg-white border border-purple-200 rounded-xl text-purple-900 font-black text-3xl outline-none focus:border-purple-500 text-center" value={merchantAmount} onChange={(e) => setMerchantAmount(e.target.value)} />
                  </div>
                  <button onClick={handleGenerateIntent} disabled={isGenerating || !merchantAmount} className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-black text-[11px] uppercase tracking-widest rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
                    {isGenerating ? <RefreshCw className="animate-spin" size={16}/> : 'Generate QR Payload'}
                  </button>
                  {generatedIntent && (
                    <div className="mt-8 p-6 bg-white rounded-2xl border border-purple-100 shadow-sm flex flex-col items-center">
                      <div className="w-40 h-40 bg-slate-900 rounded-xl flex items-center justify-center mb-4"><span className="text-white font-mono text-xs opacity-50">[QR CODE]</span></div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Intent ID</p>
                      <p className="font-mono text-xs text-purple-600 bg-purple-50 px-3 py-1 rounded-lg break-all">{generatedIntent.intentId}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW 4: TRANSACTIONS LEDGER (UPGRADED) */}
            {cardTab === 'LEDGER' && (
              <div className="animate-in fade-in">
                <h4 className="font-black text-slate-800 text-xl tracking-tight mb-6 border-b border-slate-200 pb-4 flex justify-between">
                  Network Ledger
                  <button onClick={fetchNetworkData} className="text-slate-400 hover:text-blue-500"><RefreshCw size={18} className={isLoadingDB ? 'animate-spin' : ''}/></button>
                </h4>
                {transactions.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Receipt size={32} className="mx-auto mb-3 opacity-50" />
                    <p className="font-bold uppercase tracking-widest text-xs">No transactions recorded yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transactions.map(tx => {
                      const { merchantName, location, Icon, iconBg, iconColor } = parseTransactionDetails(tx);
                      
                      return (
                        <div key={tx.id} className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all group">
                          <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${iconBg} ${iconColor}`}>
                              <Icon size={20}/>
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-base">{merchantName}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 mt-0.5">
                                <MapPin size={10} className="inline" /> {location} • {new Date(tx.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between w-full md:w-auto gap-8">
                            <div className="text-right">
                              <p className={`font-black text-lg ${tx.amount > 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
                                {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                              </p>
                              <div className="flex items-center justify-end gap-1 mt-0.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${tx.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                  {tx.status} {tx.metadata?.last4 ? `• *${tx.metadata.last4}` : ''}
                                </p>
                              </div>
                            </div>
                            <button onClick={() => downloadReceipt(tx)} className="p-3 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl transition-colors border border-slate-200 opacity-0 group-hover:opacity-100" title="Download Receipt">
                              <Download size={16}/>
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TIER 1: PERSONAL & PRIVATE */}
      {activeTier === 'PERSONAL' && (
        <div className="space-y-8 animate-in slide-in-from-left-4">
          <div className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600 border border-blue-100"><Globe2 size={18} /></div> 
                Global Currency Balances
              </h3>
            </div>
            
            {/* The Balances Grid */}
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

            {/* THE EXCHANGE UI */}
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
                onClick={handleCurrencySwap} 
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