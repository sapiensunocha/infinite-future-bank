import { useState } from 'react';
import { 
  Briefcase, Users, Baby, Link as LinkIcon, 
  Globe2, Building2, ShieldAlert, Plus, ArrowRight,
  CreditCard, Trash2, Wallet, RefreshCw, Zap, ArrowLeftRight
} from 'lucide-react';

export default function AccountHub({ balances, profile }) {
  const [activeTier, setActiveTier] = useState('PERSONAL'); // PERSONAL, BUSINESS, AGENT, LINKED

  // --- AFR EXCHANGE STATES ---
  const [swapAmount, setSwapAmount] = useState('');
  const [swapDirection, setSwapDirection] = useState('USD_TO_AFR'); // USD_TO_AFR or AFR_TO_USD
  const [isSwapping, setIsSwapping] = useState(false);
  const [notification, setNotification] = useState(null);

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

  const triggerGlobalActionNotification = (type, message) => {
    setNotification({ type, text: message });
    setTimeout(() => setNotification(null), 6000);
  };

  // --- EXECUTE BIDIRECTIONAL SWAP ---
  const handleCurrencySwap = async () => {
    const amount = parseFloat(swapAmount);
    const isUsdToAfr = swapDirection === 'USD_TO_AFR';

    // Validation based on direction
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
      // Initiate Swap via the Blockchain Node (Awaiting 2-of-3 AI Consensus)
      const payload = {
        userId: profile?.id, 
        amount: amount,
        sourceAsset: isUsdToAfr ? 'USD' : 'AFR',
        targetAsset: isUsdToAfr ? 'AFR' : 'USD'
      };

      const response = await fetch('https://afr-blockchain-node-382117221028.us-central1.run.app/api/execute-swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Consensus Failed");

      const successMsg = isUsdToAfr 
        ? `Successfully converted $${amount} to AFR. Asset is now On-Chain.`
        : `Successfully converted ${amount} AFR to USD Fiat.`;

      triggerGlobalActionNotification('success', successMsg);
      setSwapAmount('');
    } catch (err) {
      triggerGlobalActionNotification('error', 'Blockchain swap failed. AI Validators rejected the intent.');
    } finally {
      setIsSwapping(false);
    }
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

      {/* 📈 DYNAMIC TIER CONTENT */}

      {/* TIER 1: PERSONAL & PRIVATE */}
      {activeTier === 'PERSONAL' && (
        <div className="space-y-8 animate-in slide-in-from-left-4">
          
          {/* Global Currency Accounts (Balances) */}
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

          {/* 🚀 BIDIRECTIONAL AFR BLOCKCHAIN EXCHANGE PORTAL */}
          <div className="bg-gradient-to-br from-indigo-900 to-blue-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden mt-8">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-blue-300">
                  <RefreshCw size={16} className={isSwapping ? 'animate-spin' : ''} />
                  <span className="text-[10px] font-black uppercase tracking-widest">AFR Exchange Portal</span>
                </div>
                
                {/* Swap Direction Toggle */}
                <div className="flex items-center bg-white/10 p-1 rounded-xl">
                  <button 
                    onClick={() => setSwapDirection('USD_TO_AFR')}
                    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${swapDirection === 'USD_TO_AFR' ? 'bg-white text-blue-900 shadow-sm' : 'text-blue-200 hover:text-white'}`}
                  >
                    USD <ArrowRight size={10} className="inline mx-1"/> AFR
                  </button>
                  <button 
                    onClick={() => setSwapDirection('AFR_TO_USD')}
                    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${swapDirection === 'AFR_TO_USD' ? 'bg-white text-blue-900 shadow-sm' : 'text-blue-200 hover:text-white'}`}
                  >
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
                    <label className="text-[9px] uppercase font-bold text-blue-200">
                      Amount to Swap ({swapDirection === 'USD_TO_AFR' ? 'USD' : 'AFR'})
                    </label>
                    <span className="text-[9px] uppercase font-bold text-emerald-400">
                      Available: {swapDirection === 'USD_TO_AFR' ? formatCurrency(balances?.liquid_usd) : `${parseFloat(balances?.afr_balance || 0).toFixed(2)} AFR`}
                    </span>
                  </div>
                  <input 
                    type="number"
                    step="0.01"
                    value={swapAmount}
                    onChange={(e) => setSwapAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 font-black text-xl text-white outline-none focus:bg-white/20 transition-all placeholder:text-white/30"
                  />
                  {/* Currency icon inside input */}
                  <div className="absolute bottom-4 right-4 text-white/50">
                    {swapDirection === 'USD_TO_AFR' ? <Wallet size={20}/> : <Zap size={20}/>}
                  </div>
                </div>
                
                <button 
                  onClick={handleCurrencySwap}
                  disabled={isSwapping || !swapAmount}
                  className="w-full md:w-auto px-10 py-5 bg-emerald-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-400 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:hover:translate-y-0 shadow-lg flex items-center justify-center gap-2"
                >
                  {isSwapping ? 'Awaiting Consensus...' : <><ArrowLeftRight size={14}/> Execute Swap</>}
                </button>
              </div>
              <p className="text-[9px] text-blue-300 mt-6 uppercase font-bold tracking-widest">Rate: 1 USD = 1 AFR • Fee: 0.00% • Network: AFR Mainnet-1</p>
            </div>
          </div>

          {/* Family & Duo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white border border-slate-200 p-8 rounded-[3rem] shadow-sm group cursor-pointer hover:shadow-md transition-all relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none group-hover:bg-indigo-100 transition-colors"></div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-6 border border-indigo-100"><Users size={24}/></div>
              <h3 className="text-lg font-black text-slate-800 mb-2 relative z-10">Joint Account</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed mb-6 relative z-10">Shared IBANs and dual premium cards for couples or business partners.</p>
              <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-indigo-600 group-hover:gap-2 transition-all relative z-10">Initialize Duo <ArrowRight size={14}/></div>
            </div>

            <div className="bg-white border border-slate-200 p-8 rounded-[3rem] shadow-sm group cursor-pointer hover:shadow-md transition-all relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-amber-50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none group-hover:bg-amber-100 transition-colors"></div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 mb-6 border border-amber-100"><Baby size={24}/></div>
              <h3 className="text-lg font-black text-slate-800 mb-2 relative z-10">Kids & Teens</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed mb-6 relative z-10">Dedicated spending cards and supervised sub-apps for the next generation.</p>
              <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-amber-600 group-hover:gap-2 transition-all relative z-10">Create Profile <ArrowRight size={14}/></div>
            </div>
          </div>

          {/* Institutional Credit Line - Kept dark for contrast/premium feel */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 p-8 rounded-[3rem] shadow-xl mt-8 group hover:border-blue-500/50 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/30"><Briefcase size={24}/></div>
                <div>
                  <h3 className="text-lg font-black text-white mb-1">Institutional Credit Line</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Borrow against your Alpha Equity at 2.4% APR</p>
                </div>
              </div>
              <span className="bg-white/10 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/20">Pre-Approved</span>
            </div>
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between mt-8 border-t border-slate-700 pt-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Available Leverage</p>
                <p className="text-2xl font-black text-white">{formatCurrency((balances?.alpha_equity_usd || 0) * 0.4)}</p>
              </div>
              <button className="w-full md:w-auto px-6 py-4 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 transition-all border border-blue-500 shadow-lg">
                Draw Capital
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TIER 2: COMMERCIAL (PRO) */}
      {activeTier === 'BUSINESS' && (
        <div className="bg-white border border-slate-200 p-12 rounded-[3.5rem] shadow-sm relative overflow-hidden animate-in slide-in-from-left-4">
          <div className="absolute top-0 right-0 p-12 opacity-5 text-slate-800"><Building2 size={200} /></div>
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[100%] bg-blue-50 rounded-full blur-[100px] pointer-events-none"></div>
          
          <h3 className="text-3xl font-black tracking-tight mb-4 relative z-10 text-slate-800">Pro Account</h3>
          <p className="text-sm font-medium text-slate-600 max-w-xl leading-relaxed mb-10 relative z-10">
            Elevate your commercial operations. Earn instant cashback on corporate spending, issue unlimited virtual employee cards, and automate your expense ledger.
          </p>
          <div className="flex items-center gap-6 relative z-10">
            <button className="px-8 py-5 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg hover:bg-blue-700 hover:-translate-y-1 transition-all">
              Upgrade to Pro
            </button>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200">Requires Tax ID</span>
          </div>
        </div>
      )}

      {/* TIER 3: AGENT */}
      {activeTier === 'AGENT' && (
        <div className="bg-white border border-slate-200 p-12 rounded-[3.5rem] shadow-sm text-center animate-in slide-in-from-left-4 relative overflow-hidden">
          <div className="w-20 h-20 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center text-blue-600 mx-auto mb-6"><Briefcase size={32}/></div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2 relative z-10">Financial Agent Portal</h3>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest max-w-md mx-auto leading-relaxed mb-8 relative z-10">
            Manage your client roster, oversee portfolio performance, and collect advisory fees through the IFB Agent protocol.
          </p>
          <button className="px-8 py-4 bg-slate-800 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg hover:bg-slate-700 hover:-translate-y-1 transition-all relative z-10">
            Apply for Agent Status
          </button>
        </div>
      )}

      {/* TIER 4: EXTERNAL LINKED ACCOUNTS */}
      {activeTier === 'LINKED' && (
        <div className="space-y-8 animate-in slide-in-from-left-4">
          <div className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-8 flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg text-slate-500 border border-slate-200"><LinkIcon size={18}/></div>
              Connected Institutions
            </h3>
            
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 bg-slate-50 rounded-2xl p-8 text-center flex flex-col items-center justify-center hover:bg-slate-100 hover:border-slate-300 transition-colors group cursor-pointer">
                <div className="w-16 h-16 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 mb-4 group-hover:text-blue-500 transition-colors shadow-sm"><LinkIcon size={24}/></div>
                <p className="text-sm font-black text-slate-800 mb-1">No external accounts linked</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">Connect via Plaid to sync your whole-wealth position.</p>
                <button className="px-8 py-4 bg-white text-slate-800 border border-slate-200 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all">
                  Link Institution
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🛑 DANGER ZONE: CLOSE ACCOUNT */}
      <div className="mt-16 pt-10 border-t border-red-100 animate-in fade-in">
        <div className="bg-red-50 border border-red-100 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 hover:bg-red-100/50 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-red-500 shadow-sm"><ShieldAlert size={24}/></div>
            <div>
              <h4 className="text-sm font-black text-red-600 uppercase tracking-widest">Offboarding Protocol</h4>
              <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-1">Permanently close this institutional identity.</p>
            </div>
          </div>
          <button className="px-6 py-4 bg-white border border-red-200 text-red-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 transition-all flex items-center gap-2 shadow-sm">
            <Trash2 size={16}/> Initiate Account Closure
          </button>
        </div>
      </div>

      {/* 🟢 GLOBAL NOTIFICATION LAYER */}
      {notification && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[500] animate-in slide-in-from-top-10 duration-500">
           <div className={`px-8 py-5 rounded-3xl shadow-2xl border-2 backdrop-blur-2xl flex items-center gap-4 ${notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
             <div className={`w-3 h-3 rounded-full animate-pulse ${notification.type === 'success' ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]' : 'bg-red-400 shadow-[0_0_10px_#f87171]'}`}></div>
             <p className="font-black text-[11px] uppercase tracking-[0.2em]">{notification.text}</p>
           </div>
        </div>
      )}

    </div>
  );
}