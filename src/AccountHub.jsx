import { useState } from 'react';
import { 
  Briefcase, Users, Baby, Link as LinkIcon, 
  Globe2, Building2, ShieldAlert, Plus, ArrowRight,
  CreditCard, Trash2, Wallet, RefreshCw, Zap, ArrowLeftRight,
  Settings, Lock, ScanLine, Store, CheckCircle2
} from 'lucide-react';

// ==========================================
// 🌐 LIVE GCP CORE BACKEND URL
// ==========================================
const CORE_URL = 'https://ifb-intelligence-core-382117221028.us-central1.run.app';

// ==========================================
// 🎨 CARD THEMES CONFIGURATION
// ==========================================
const CARD_THEMES = {
  obsidian: {
    name: 'Obsidian Black',
    bg: 'bg-gradient-to-br from-slate-900 via-blue-900 to-black',
    border: 'border-blue-500/30',
    textPrimary: 'text-white',
    textSecondary: 'text-blue-200/70',
    glow: 'bg-blue-500/20',
    accent: 'text-blue-200'
  },
  pearl: {
    name: 'Liquid Pearl',
    bg: 'bg-gradient-to-br from-white via-slate-100 to-slate-200',
    border: 'border-white',
    textPrimary: 'text-slate-800',
    textSecondary: 'text-slate-400',
    glow: 'bg-white/50',
    accent: 'text-slate-600'
  },
  gold: {
    name: 'Sovereign Gold',
    bg: 'bg-gradient-to-br from-yellow-500 via-amber-300 to-yellow-600',
    border: 'border-yellow-200/50',
    textPrimary: 'text-yellow-950',
    textSecondary: 'text-yellow-800/70',
    glow: 'bg-yellow-100/30',
    accent: 'text-yellow-900'
  },
  aurora: {
    name: 'Cyber Aurora',
    bg: 'bg-gradient-to-tr from-purple-700 via-pink-500 to-orange-400',
    border: 'border-white/30',
    textPrimary: 'text-white',
    textSecondary: 'text-white/70',
    glow: 'bg-white/20',
    accent: 'text-white'
  }
};

export default function AccountHub({ balances, profile }) {
  const [activeTier, setActiveTier] = useState('PERSONAL'); 

  // --- AFR EXCHANGE STATES ---
  const [swapAmount, setSwapAmount] = useState('');
  const [swapDirection, setSwapDirection] = useState('USD_TO_AFR');
  const [isSwapping, setIsSwapping] = useState(false);
  const [notification, setNotification] = useState(null);

  // --- INFINITE CARD & NETWORK STATES ---
  const [isCardFrozen, setIsCardFrozen] = useState(false);
  const [cardTab, setCardTab] = useState('CARD'); // 'CARD', 'SCAN', 'MERCHANT'
  const [activeTheme, setActiveTheme] = useState('obsidian'); // NEW: Theme State
  
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
  // 💸 PROPRIETARY NETWORK ACTIONS
  // ==========================================
  
  const handleGenerateIntent = async () => {
    if (!merchantAmount || merchantAmount <= 0) return;
    setIsGenerating(true);
    try {
      const res = await fetch(`${CORE_URL}/api/network/create-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: merchantAmount, merchantId: 'IFB-MERCH-001' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGeneratedIntent(data);
      triggerGlobalActionNotification('success', `Payment Request Generated: ${data.intentId}`);
    } catch (err) {
      triggerGlobalActionNotification('error', err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleProcessPayment = async () => {
    if (!scanIntentId) return;
    setIsProcessingPayment(true);
    try {
      const res = await fetch(`${CORE_URL}/api/network/process-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intentId: scanIntentId, userNetworkId: 'IFB-USR-773X' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Transaction Declined');
      triggerGlobalActionNotification('success', `APPROVED: Settled via ${data.details.settledAsset}. Hash: ${data.details.blockchainHash || 'N/A'}`);
      setScanIntentId('');
    } catch (err) {
      triggerGlobalActionNotification('error', `DECLINED: ${err.message}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleCurrencySwap = async () => {
    const amount = parseFloat(swapAmount);
    const isUsdToAfr = swapDirection === 'USD_TO_AFR';

    if (isUsdToAfr && (!amount || amount > (balances?.liquid_usd || 0))) {
      triggerGlobalActionNotification('error', 'INSUFFICIENT USD FOR CONVERSION.');
      return;
    }
    if (!isUsdToAfr && (!amount || amount > (balances?.afr_balance || 0))) {
      triggerGlobalActionNotification('error', 'INSUFFICIENT AFR FOR CONVERSION.');
      return;
    }

    setIsSwapping(true);
    try {
      const payload = { userId: profile?.id, amount: amount, sourceAsset: isUsdToAfr ? 'USD' : 'AFR', targetAsset: isUsdToAfr ? 'AFR' : 'USD' };
      const response = await fetch('https://afr-blockchain-node-382117221028.us-central1.run.app/api/execute-swap', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("Consensus Failed");
      triggerGlobalActionNotification('success', isUsdToAfr ? `Successfully converted $${amount} to AFR. Asset is now On-Chain.` : `Successfully converted ${amount} AFR to USD Fiat.`);
      setSwapAmount('');
    } catch (err) {
      triggerGlobalActionNotification('error', 'Blockchain swap failed. AI Validators rejected the intent.');
    } finally {
      setIsSwapping(false);
    }
  };

  const theme = CARD_THEMES[activeTheme];

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
            <button 
              key={tier.id}
              onClick={() => setActiveTier(tier.id)}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTier === tier.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}
            >
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
                  <div className={`w-full max-w-md aspect-[1.586/1] rounded-2xl p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden transition-all duration-700 ${isCardFrozen ? 'bg-slate-800 grayscale border-slate-600' : `${theme.bg} border ${theme.border}`}`}>
                    
                    {/* Glass Highlights */}
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
                        Infinite
                      </span>
                    </div>

                    {/* Middle Row: Network ID */}
                    <div className="z-10">
                      <p className={`${theme.textSecondary} text-[10px] uppercase tracking-[0.2em] mb-1 font-bold`}>Network Identity</p>
                      <p className={`${theme.textPrimary} font-mono text-2xl tracking-[0.15em]`}>IFB-USR-773X</p>
                    </div>

                    {/* Bottom Row: Name & Status */}
                    <div className="flex justify-between items-end z-10">
                      <div>
                        <p className={`${theme.textSecondary} text-[10px] uppercase tracking-[0.2em] font-bold`}>Cardholder</p>
                        <p className={`${theme.textPrimary} font-bold uppercase tracking-widest text-sm drop-shadow-sm`}>{profile?.name || 'SOVEREIGN ENTITY'}</p>
                      </div>
                      <div className="text-right">
                        <p className={`${theme.textSecondary} text-[10px] uppercase tracking-[0.2em] font-bold`}>Status</p>
                        <p className={`font-black text-sm uppercase tracking-widest drop-shadow-sm ${isCardFrozen ? 'text-red-500' : theme.textPrimary}`}>
                          {isCardFrozen ? 'FROZEN' : 'ACTIVE'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Design Selector (Card Studio) */}
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

                  {/* Card Controls */}
                  <div className="flex justify-center gap-4 mt-8 w-full max-w-md">
                    <button onClick={() => setIsCardFrozen(!isCardFrozen)} className={`flex-1 flex justify-center items-center gap-2 px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${isCardFrozen ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
                      <Lock size={14}/> {isCardFrozen ? 'Unfreeze' : 'Freeze Card'}
                    </button>
                    <button className="flex-1 flex justify-center items-center gap-2 px-6 py-4 bg-slate-50 text-slate-600 rounded-xl border border-slate-200 font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all">
                      <Settings size={14}/> Settings
                    </button>
                  </div>
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
                <div className="h-48 border-2 border-dashed border-emerald-500/50 rounded-2xl flex flex-col items-center justify-center mb-6 bg-emerald-50 text-emerald-600">
                  <ScanLine size={48} className="mb-4 opacity-50"/>
                  <p className="font-bold text-sm uppercase tracking-widest">Camera Interface (Simulated)</p>
                </div>
                
                <input 
                  type="text" 
                  placeholder="Paste Intent ID (e.g., IFB-REQ-...)"
                  className="w-full p-4 mb-4 bg-white border border-slate-200 rounded-xl text-slate-800 font-mono text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all"
                  value={scanIntentId}
                  onChange={(e) => setScanIntentId(e.target.value)}
                />
                
                <button 
                  onClick={handleProcessPayment}
                  disabled={isProcessingPayment || !scanIntentId}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] uppercase tracking-widest rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessingPayment ? <RefreshCw className="animate-spin" size={16}/> : <Zap size={16}/>}
                  {isProcessingPayment ? 'Executing Settlement...' : 'Approve Payment'}
                </button>
              </div>
            )}

            {/* VIEW 3: MERCHANT TERMINAL */}
            {cardTab === 'MERCHANT' && (
              <div className="max-w-md mx-auto animate-in fade-in">
                <div className="bg-purple-50 p-8 rounded-3xl border border-purple-100 text-center">
                  <h4 className="font-black text-purple-900 text-xl tracking-tight mb-6">Create Payment Request</h4>
                  
                  <div className="relative mb-6">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 font-black text-2xl">$</span>
                    <input 
                      type="number" 
                      placeholder="0.00"
                      className="w-full p-4 pl-12 bg-white border border-purple-200 rounded-xl text-purple-900 font-black text-3xl outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all text-center"
                      value={merchantAmount}
                      onChange={(e) => setMerchantAmount(e.target.value)}
                    />
                  </div>

                  <button 
                    onClick={handleGenerateIntent}
                    disabled={isGenerating || !merchantAmount}
                    className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-black text-[11px] uppercase tracking-widest rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isGenerating ? <RefreshCw className="animate-spin" size={16}/> : 'Generate QR Payload'}
                  </button>

                  {generatedIntent && (
                    <div className="mt-8 p-6 bg-white rounded-2xl border border-purple-100 shadow-sm flex flex-col items-center">
                      <div className="w-40 h-40 bg-slate-900 rounded-xl flex items-center justify-center mb-4">
                         <span className="text-white font-mono text-xs opacity-50">[QR CODE]</span>
                      </div>
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
              <button className="text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-1 hover:bg-blue-50 px-4 py-2 rounded-xl transition-colors border border-transparent hover:border-blue-100">
                <Plus size={14}/> Add Currency
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-colors cursor-pointer">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none group-hover:bg-blue-200/50 transition-colors"></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center justify-between">
                  USD • United States <Wallet size={12} className="text-blue-600"/>
                </p>
                <p className="text-2xl font-black text-slate-800 tracking-tight relative z-10">{formatCurrency(balances?.liquid_usd)}</p>
              </div>
              
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-colors cursor-pointer">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none group-hover:bg-emerald-200/50 transition-colors"></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center justify-between">
                  AFR • Blockchain <Zap size={12} className="text-emerald-500"/>
                </p>
                <p className="text-2xl font-black text-slate-800 tracking-tight relative z-10">{balances?.afr_balance ? parseFloat(balances.afr_balance).toFixed(2) : '0.00'} <span className="text-sm text-slate-400">AFR</span></p>
              </div>
              
              <div className="p-6 bg-transparent rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all group">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-indigo-600 flex items-center gap-2">
                  <Plus size={14}/> Open EUR Account
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-900 to-blue-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden mt-8">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-blue-300">
                  <RefreshCw size={16} className={isSwapping ? 'animate-spin' : ''} />
                  <span className="text-[10px] font-black uppercase tracking-widest">AFR Exchange Portal</span>
                </div>
                
                <div className="flex items-center bg-white/10 p-1 rounded-xl">
                  <button onClick={() => setSwapDirection('USD_TO_AFR')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${swapDirection === 'USD_TO_AFR' ? 'bg-white text-blue-900 shadow-sm' : 'text-blue-200 hover:text-white'}`}>
                    USD <ArrowRight size={10} className="inline mx-1"/> AFR
                  </button>
                  <button onClick={() => setSwapDirection('AFR_TO_USD')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${swapDirection === 'AFR_TO_USD' ? 'bg-white text-blue-900 shadow-sm' : 'text-blue-200 hover:text-white'}`}>
                    AFR <ArrowRight size={10} className="inline mx-1"/> USD
                  </button>
                </div>
              </div>

              <h3 className="text-2xl font-black mb-6 tracking-tight">
                {swapDirection === 'USD_TO_AFR' ? 'Convert USD to AFR' : 'Convert AFR to USD'}
              </h3>
              
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full relative">
                  <div className="flex justify-between items-center mb-2 px-2">
                    <label className="text-[9px] uppercase font-bold text-blue-200">Amount to Swap ({swapDirection === 'USD_TO_AFR' ? 'USD' : 'AFR'})</label>
                    <span className="text-[9px] uppercase font-bold text-emerald-400">Available: {swapDirection === 'USD_TO_AFR' ? formatCurrency(balances?.liquid_usd) : `${parseFloat(balances?.afr_balance || 0).toFixed(2)} AFR`}</span>
                  </div>
                  <input type="number" step="0.01" value={swapAmount} onChange={(e) => setSwapAmount(e.target.value)} placeholder="0.00" className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 font-black text-xl text-white outline-none focus:bg-white/20 transition-all placeholder:text-white/30" />
                  <div className="absolute bottom-4 right-4 text-white/50">{swapDirection === 'USD_TO_AFR' ? <Wallet size={20}/> : <Zap size={20}/>}</div>
                </div>
                <button onClick={handleCurrencySwap} disabled={isSwapping || !swapAmount} className="w-full md:w-auto px-10 py-5 bg-emerald-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-400 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:hover:translate-y-0 shadow-lg flex items-center justify-center gap-2">
                  {isSwapping ? 'Awaiting Consensus...' : <><ArrowLeftRight size={14}/> Execute Swap</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TIER 2: COMMERCIAL (PRO) */}
      {activeTier === 'BUSINESS' && (
        <div className="bg-white border border-slate-200 p-12 rounded-[3.5rem] shadow-sm relative overflow-hidden animate-in slide-in-from-left-4">
          <div className="absolute top-0 right-0 p-12 opacity-5 text-slate-800"><Building2 size={200} /></div>
          <h3 className="text-3xl font-black tracking-tight mb-4 relative z-10 text-slate-800">Pro Account</h3>
          <p className="text-sm font-medium text-slate-600 max-w-xl leading-relaxed mb-10 relative z-10">Elevate your commercial operations.</p>
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