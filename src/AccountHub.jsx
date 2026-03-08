import { useState } from 'react';
import { 
  Briefcase, Users, Baby, Link as LinkIcon, 
  Globe2, Building2, ShieldAlert, Plus, ArrowRight,
  CreditCard, Trash2, Wallet, RefreshCw, Zap, ArrowLeftRight,
  Settings, Lock, ScanLine, Store, CheckCircle2, Eye, EyeOff, PlusCircle
} from 'lucide-react';

// ==========================================
// 🌐 LIVE GCP CORE BACKEND URL
// ==========================================
const CORE_URL = 'https://ifb-intelligence-core-382117221028.us-central1.run.app';

// ==========================================
// 🎨 CARD THEMES CONFIGURATION
// ==========================================
const CARD_THEMES = {
  obsidian: { name: 'Obsidian Black', bg: 'bg-gradient-to-br from-slate-900 via-blue-900 to-black', border: 'border-blue-500/30', textPrimary: 'text-white', textSecondary: 'text-blue-200/70', glow: 'bg-blue-500/20', accent: 'text-blue-200' },
  pearl: { name: 'Liquid Pearl', bg: 'bg-gradient-to-br from-white via-slate-100 to-slate-200', border: 'border-white', textPrimary: 'text-slate-800', textSecondary: 'text-slate-400', glow: 'bg-white/50', accent: 'text-slate-600' },
  gold: { name: 'Sovereign Gold', bg: 'bg-gradient-to-br from-yellow-500 via-amber-300 to-yellow-600', border: 'border-yellow-200/50', textPrimary: 'text-yellow-950', textSecondary: 'text-yellow-800/70', glow: 'bg-yellow-100/30', accent: 'text-yellow-900' },
  aurora: { name: 'Cyber Aurora', bg: 'bg-gradient-to-tr from-purple-700 via-pink-500 to-orange-400', border: 'border-white/30', textPrimary: 'text-white', textSecondary: 'text-white/70', glow: 'bg-white/20', accent: 'text-white' }
};

export default function AccountHub({ balances, profile }) {
  const [activeTier, setActiveTier] = useState('PERSONAL'); 

  // --- AFR EXCHANGE STATES ---
  const [swapAmount, setSwapAmount] = useState('');
  const [swapDirection, setSwapDirection] = useState('USD_TO_AFR');
  const [isSwapping, setIsSwapping] = useState(false);
  const [notification, setNotification] = useState(null);

  // --- INFINITE CARD STATES ---
  const [cardTab, setCardTab] = useState('CARD'); 
  const [activeTheme, setActiveTheme] = useState('obsidian'); 
  
  // Real Virtual Card Data State
  const [activeCard, setActiveCard] = useState(null);
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [isCardFrozen, setIsCardFrozen] = useState(false);
  
  // Merchant POS States
  const [merchantAmount, setMerchantAmount] = useState('');
  const [generatedIntent, setGeneratedIntent] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // User Scanner States
  const [scanIntentId, setScanIntentId] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

  const triggerGlobalActionNotification = (type, message) => {
    setNotification({ type, text: message });
    setTimeout(() => setNotification(null), 6000);
  };

  // ==========================================
  // 💳 VIRTUAL CARD LIFECYCLE ENGINE
  // ==========================================
  const generateNewCard = async () => {
    // Generate standard Visa format math
    const p1 = '4092';
    const p2 = Math.floor(1000 + Math.random() * 9000).toString();
    const p3 = Math.floor(1000 + Math.random() * 9000).toString();
    const p4 = Math.floor(1000 + Math.random() * 9000).toString();
    const pan = `${p1} ${p2} ${p3} ${p4}`;
    
    const year = new Date().getFullYear() + Math.floor(3 + Math.random() * 3);
    const month = Math.floor(1 + Math.random() * 12).toString().padStart(2, '0');
    const expiry = `${month}/${year.toString().slice(-2)}`;
    const cvv = Math.floor(100 + Math.random() * 900).toString();
    const networkId = `IFB-USR-${pan.slice(-4)}`; // Proprietary network ID mapped to card

    try {
      // Push to our GCP Backend
      const res = await fetch(`${CORE_URL}/api/network/provision-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile?.id || 'TEST_USER_ID',
          networkId: networkId,
          routingLogic: { primary: 'USD', fallback: 'AFR' }
        })
      });

      if (!res.ok) throw new Error("Backend failed to register card on the ledger.");

      // Set state ONLY if backend succeeds
      setActiveCard({ pan, expiry, cvv, networkId });
      setIsCardFrozen(false);
      setShowCardDetails(false);
      triggerGlobalActionNotification('success', 'New Infinite Virtual Card Provisioned & Synced to Ledger.');
    } catch (err) {
      triggerGlobalActionNotification('error', err.message);
    }
  };

  const terminateCard = async () => {
    if(!confirm("Are you sure you want to permanently delete this card? This action cannot be undone.")) return;
    
    try {
      const res = await fetch(`${CORE_URL}/api/network/terminate-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile?.id || 'TEST_USER_ID', networkId: activeCard.networkId })
      });

      if (!res.ok) throw new Error("Backend failed to terminate card.");
      
      setActiveCard(null);
      setShowCardDetails(false);
      triggerGlobalActionNotification('success', 'Virtual Card Terminated & Burned from Ledger.');
    } catch (err) {
      triggerGlobalActionNotification('error', err.message);
    }
  };

  // ==========================================
  // 💸 PROPRIETARY NETWORK ACTIONS
  // ==========================================
  const handleGenerateIntent = async () => {
    if (!merchantAmount || merchantAmount <= 0) return;
    setIsGenerating(true);
    try {
      const res = await fetch(`${CORE_URL}/api/network/create-intent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: merchantAmount, merchantId: 'IFB-MERCH-001' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGeneratedIntent(data);
      triggerGlobalActionNotification('success', `Payment Request Generated: ${data.intentId}`);
    } catch (err) { triggerGlobalActionNotification('error', err.message); } finally { setIsGenerating(false); }
  };

  const handleProcessPayment = async () => {
    if (!scanIntentId || !activeCard) return;
    setIsProcessingPayment(true);
    try {
      const res = await fetch(`${CORE_URL}/api/network/process-payment`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ intentId: scanIntentId, userNetworkId: activeCard.networkId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Transaction Declined');
      triggerGlobalActionNotification('success', `APPROVED: Settled via ${data.details.settledAsset}. Hash: ${data.details.blockchainHash || 'N/A'}`);
      setScanIntentId('');
    } catch (err) { triggerGlobalActionNotification('error', `DECLINED: ${err.message}`); } finally { setIsProcessingPayment(false); }
  };

  const theme = CARD_THEMES[activeTheme];

  // Helper to mask PAN securely
  const getDisplayPan = () => {
    if (!activeCard) return '';
    return showCardDetails ? activeCard.pan : `**** **** **** ${activeCard.pan.slice(-4)}`;
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 text-slate-800 relative">
      
      {/* 🏛️ Top Header & Identity Switcher */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white border border-slate-200 p-6 rounded-[2.5rem] shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Sovereign Accounts</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mt-1">Manage your institutional entities</p>
        </div>
        
        <div className="flex bg-slate-100 p-2 rounded-2xl border border-slate-200 shadow-inner w-full md:w-auto overflow-x-auto no-scrollbar">
          {[
            { id: 'PERSONAL', label: 'Retail & Private' },
            { id: 'CARDS', label: 'Infinite Cards' },
            { id: 'BUSINESS', label: 'Commercial' },
            { id: 'AGENT', label: 'Financial Agent' },
            { id: 'LINKED', label: 'External' }
          ].map((tier) => (
            <button key={tier.id} onClick={() => setActiveTier(tier.id)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTier === tier.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}>
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
              </h3>
              
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button onClick={() => setCardTab('CARD')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${cardTab === 'CARD' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}><CreditCard size={14} className="inline mr-1"/> My Card</button>
                <button onClick={() => setCardTab('SCAN')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${cardTab === 'SCAN' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}><ScanLine size={14} className="inline mr-1"/> Pay</button>
                <button onClick={() => setCardTab('MERCHANT')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${cardTab === 'MERCHANT' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500'}`}><Store size={14} className="inline mr-1"/> Merchant</button>
              </div>
            </div>

            {/* VIEW 1: THE CARD STUDIO */}
            {cardTab === 'CARD' && (
              <div className="flex flex-col lg:flex-row gap-12 animate-in fade-in">
                
                {/* Left: The Dynamic Physical/Digital Card */}
                <div className="flex-1 flex flex-col items-center">
                  
                  {/* EMPTY STATE / NO CARD */}
                  {!activeCard ? (
                    <div className="w-full max-w-md aspect-[1.586/1] rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-500 p-8 text-center transition-all hover:border-blue-400 hover:bg-blue-50 cursor-pointer shadow-sm" onClick={generateNewCard}>
                      <PlusCircle size={48} className="mb-4 text-blue-500 opacity-50"/>
                      <h3 className="font-black text-slate-800 text-lg mb-1">Provision Virtual Card</h3>
                      <p className="text-[10px] uppercase tracking-widest font-bold">Instantly generate a secure 16-digit PAN for network execution.</p>
                    </div>
                  ) : (
                    /* ACTIVE CARD STATE */
                    <div className={`w-full max-w-md aspect-[1.586/1] rounded-2xl p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden transition-all duration-700 ${isCardFrozen ? 'bg-slate-800 grayscale border-slate-600' : `${theme.bg} border ${theme.border}`}`}>
                      
                      {!isCardFrozen && (
                        <>
                          <div className={`absolute top-0 right-0 w-32 h-32 ${theme.glow} rounded-full blur-3xl transition-all duration-500`}></div>
                          <div className={`absolute bottom-0 left-0 w-48 h-48 ${theme.glow} rounded-full blur-3xl transition-all duration-500`}></div>
                        </>
                      )}
                      
                      {/* Top Row: IFB Logo & Badge */}
                      <div className="flex justify-between items-start z-10">
                        <div className="flex items-center gap-1">
                          <Zap size={28} className={theme.textPrimary} fill="currentColor" />
                          <h2 className={`${theme.textPrimary} font-black text-3xl tracking-tighter`}>IFB</h2>
                        </div>
                        <span className={`px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold ${theme.accent} backdrop-blur-md border border-white/20 uppercase tracking-widest shadow-sm`}>
                          Infinite Virtual
                        </span>
                      </div>

                      {/* Middle Row: 16-Digit PAN */}
                      <div className="z-10 flex flex-col mt-4">
                        <p className={`${theme.textPrimary} font-mono text-[22px] tracking-[0.2em] drop-shadow-sm`}>
                          {getDisplayPan()}
                        </p>
                        <div className="flex gap-6 mt-2">
                           <div>
                             <p className={`${theme.textSecondary} text-[8px] uppercase tracking-[0.2em] font-bold`}>Valid Thru</p>
                             <p className={`${theme.textPrimary} font-mono text-sm tracking-widest`}>{activeCard.expiry}</p>
                           </div>
                           <div>
                             <p className={`${theme.textSecondary} text-[8px] uppercase tracking-[0.2em] font-bold`}>CVV</p>
                             <p className={`${theme.textPrimary} font-mono text-sm tracking-widest`}>{showCardDetails ? activeCard.cvv : '***'}</p>
                           </div>
                        </div>
                      </div>

                      {/* Bottom Row: Name & Status */}
                      <div className="flex justify-between items-end z-10">
                        <div>
                          <p className={`${theme.textPrimary} font-bold uppercase tracking-widest text-sm drop-shadow-sm`}>{profile?.name || 'SOVEREIGN ENTITY'}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-black text-xs uppercase tracking-widest drop-shadow-sm ${isCardFrozen ? 'text-red-500' : theme.textPrimary}`}>
                            {isCardFrozen ? 'FROZEN' : 'ACTIVE'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Design Selector (Only show if card exists) */}
                  {activeCard && (
                    <div className="w-full max-w-md mt-8">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 text-center">Select Card Material</p>
                      <div className="flex justify-center gap-3">
                        {Object.entries(CARD_THEMES).map(([key, config]) => (
                          <button
                            key={key}
                            onClick={() => setActiveTheme(key)}
                            className={`relative w-12 h-12 rounded-full border-2 transition-all hover:scale-110 ${activeTheme === key ? 'border-blue-500 shadow-md scale-110' : 'border-transparent opacity-60 hover:opacity-100'} ${config.bg}`}
                            title={config.name}
                          >
                            {activeTheme === key && <CheckCircle2 size={16} className={`absolute -top-2 -right-2 ${key === 'pearl' ? 'text-blue-600 bg-white' : 'text-white bg-blue-500'} rounded-full`} />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Card Controls */}
                  {activeCard && (
                    <div className="flex flex-wrap justify-center gap-2 mt-8 w-full max-w-md">
                      <button onClick={() => setShowCardDetails(!showCardDetails)} className="flex-1 min-w-[140px] flex justify-center items-center gap-2 px-4 py-4 bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all shadow-md">
                        {showCardDetails ? <><EyeOff size={14}/> Hide Details</> : <><Eye size={14}/> Reveal</>}
                      </button>
                      
                      <button onClick={() => setIsCardFrozen(!isCardFrozen)} className={`flex-1 min-w-[140px] flex justify-center items-center gap-2 px-4 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${isCardFrozen ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}>
                        <Lock size={14}/> {isCardFrozen ? 'Unfreeze' : 'Freeze'}
                      </button>

                      <button onClick={terminateCard} className="flex-1 min-w-[140px] flex justify-center items-center gap-2 px-4 py-4 bg-red-50 text-red-600 rounded-xl border border-red-100 font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all">
                        <Trash2 size={14}/> Terminate
                      </button>
                    </div>
                  )}
                </div>

                {/* Right: AI Routing Logic Display */}
                <div className="flex-1 bg-slate-50 rounded-3xl p-8 border border-slate-200 shadow-inner">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Zap size={16}/></div>
                    <div>
                      <h4 className="font-black text-slate-800 tracking-tight">AI Payment Routing</h4>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Auto-funding prioritization</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-xs">1</span>
                        <span className="font-bold text-sm text-slate-700">USD Fiat Balance</span>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">Primary</span>
                    </div>

                    <div className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-xs">2</span>
                        <span className="font-bold text-sm text-slate-700">Auto-Liquidate AFR</span>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">Fallback</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 2: PAY / SCANNER */}
            {cardTab === 'SCAN' && (
              <div className="max-w-md mx-auto animate-in fade-in">
                {!activeCard ? (
                  <div className="text-center p-8 bg-red-50 text-red-600 rounded-2xl border border-red-100">
                    <ShieldAlert size={32} className="mx-auto mb-4 opacity-50"/>
                    <h4 className="font-black">No Active Card Found</h4>
                    <p className="text-xs mt-2">Please provision a virtual card in the "My Card" tab before executing network payments.</p>
                  </div>
                ) : (
                  <>
                    <div className="h-48 border-2 border-dashed border-emerald-500/50 rounded-2xl flex flex-col items-center justify-center mb-6 bg-emerald-50 text-emerald-600">
                      <ScanLine size={48} className="mb-4 opacity-50"/>
                      <p className="font-bold text-sm uppercase tracking-widest">Camera Interface (Simulated)</p>
                    </div>
                    
                    <input type="text" placeholder="Paste Intent ID (e.g., IFB-REQ-...)" className="w-full p-4 mb-4 bg-white border border-slate-200 rounded-xl text-slate-800 font-mono text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all" value={scanIntentId} onChange={(e) => setScanIntentId(e.target.value)} />
                    
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
                    <input type="number" placeholder="0.00" className="w-full p-4 pl-12 bg-white border border-purple-200 rounded-xl text-purple-900 font-black text-3xl outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all text-center" value={merchantAmount} onChange={(e) => setMerchantAmount(e.target.value)} />
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