import { useState, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import { 
  TrendingUp, Wallet, Shield, 
  BarChart3, Zap, ChevronRight,
  X, Loader2, RefreshCw, BrainCircuit,
  Cpu, Database, Hexagon, Activity, Network, ShieldCheck, Building, Lock
} from 'lucide-react';

export default function WealthInvest({ session, balances, profile }) {
  const [activeCategory, setActiveCategory] = useState('PASCALINE_CORE'); // PASCALINE_CORE, PRIVATE_DEALS, RISK_SHIELD

  // Investment & Insurance States
  const [investModalItem, setInvestModalItem] = useState(null); 
  const [investAmount, setInvestAmount] = useState('');
  const [insuranceTier, setInsuranceTier] = useState('premium'); // 'basic' or 'premium'
  
  // Execution Engine States
  const [isInvesting, setIsInvesting] = useState(false);
  const [executionStep, setExecutionStep] = useState(''); 
  
  // Notification & API States
  const [notification, setNotification] = useState(null);
  const [privateDeals, setPrivateDeals] = useState([]);
  const [isLoadingDeals, setIsLoadingDeals] = useState(true);

  // System Stats (Internal IFB Ledger Reserves)
  const userInsurancePool = 1450250.00;
  const companyInsurancePool = 8500000.00;
  const hashRate = "0x8F2A...9C11";

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

  const triggerGlobalActionNotification = (type, message) => {
    setNotification({ type, text: message });
    setTimeout(() => setNotification(null), 6000);
  };

  // --- INTERNAL PRIVATE EQUITY DATA FETCHING ---
  const fetchPrivateDeals = async () => {
    setIsLoadingDeals(true);
    try {
      // Simulating a fetch from your internal 'private_companies' database table.
      // Pascaline has already analyzed their telemetry and assigned these scores.
      await new Promise(resolve => setTimeout(resolve, 800)); // Artificial network delay

      const internalAssets = [
        { 
          id: 'c1', symbol: 'NURA', name: 'Nura Energy', sector: 'Renewable Infra', 
          valuation: '$120M', aiGrowth: 24.5, aiRisk: 18, 
          userCov: '95%', compCov: '$10M' 
        },
        { 
          id: 'c2', symbol: 'SYN', name: 'Synthos Bio', sector: 'Biotech', 
          valuation: '$45M', aiGrowth: 32.1, aiRisk: 42, 
          userCov: '80%', compCov: '$25M' 
        },
        { 
          id: 'c3', symbol: 'AERO', name: 'AeroSpace X', sector: 'Defense Tech', 
          valuation: '$310M', aiGrowth: 15.2, aiRisk: 12, 
          userCov: '99%', compCov: '$50M' 
        },
        { 
          id: 'c4', symbol: 'QNTM', name: 'Quantum Core', sector: 'Quantum Computing', 
          valuation: '$85M', aiGrowth: 45.0, aiRisk: 65, 
          userCov: '60%', compCov: '$5M' 
        }
      ];

      setPrivateDeals(internalAssets);
    } catch (error) {
      console.error("Internal Deal Fetch Error:", error);
      triggerGlobalActionNotification('error', 'Failed to load internal syndicates.');
    } finally {
      setIsLoadingDeals(false);
    }
  };

  useEffect(() => {
    if (activeCategory === 'PRIVATE_DEALS') {
      fetchPrivateDeals();
    }
  }, [activeCategory]);

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // --- PASCALINE DUAL-INSURANCE EXECUTION WORKFLOW ---
  const handlePascalineExecution = async (e) => {
    e.preventDefault();
    const amount = parseFloat(investAmount);
    
    if (!amount || amount <= 0) return;
    if (amount > balances.liquid_usd) {
      triggerGlobalActionNotification('error', 'INSUFFICIENT LIQUIDITY: Execution Blocked.');
      return;
    }

    setIsInvesting(true);

    try {
      // Step 1: AI Prediction & Telemetry Check
      setExecutionStep('Evaluating Private Company Telemetry...');
      await delay(800);
      if (investModalItem.aiRisk > 70) throw new Error("AI Risk Warning: Operational volatility exceeds institutional limits.");

      // Step 2: Dual Insurance Underwriting
      setExecutionStep('Structuring Dual-Insurance Underwriting...');
      await delay(800);

      // Step 3: Internal Liquidity Routing
      setExecutionStep('Routing Internal IFB Liquidity...');
      await delay(800);

      // Step 4: Blockchain Audit Sync
      setExecutionStep('Securing Immutable On-Chain Audit...');
      
      // REAL BACKEND CALL: Hitting the Dual Insurance Edge Function
      const { data, error } = await supabase.functions.invoke('pascaline-dual-insure', {
        body: {
          userId: session.user.id,
          companyId: investModalItem.id,
          investAmount: amount,
          insuranceTier: insuranceTier,
          aiRiskScore: investModalItem.aiRisk
        }
      });

      if (error || data?.error) throw new Error(data?.error || "Allocation Failed. Check internal ledger.");

      // Success
      triggerGlobalActionNotification('success', `Capital Deployed & Insured. Audit Hash: ${data.txHash}`);
      setInvestModalItem(null);
      setInvestAmount('');
      setExecutionStep('');

    } catch (err) {
      console.error(err);
      triggerGlobalActionNotification('error', err.message || "Pascaline Execution Terminated.");
    } finally {
      setIsInvesting(false);
      setExecutionStep('');
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 text-slate-800 relative">
      
      {/* 🏛️ Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl text-white">
        <div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
            <BrainCircuit className="text-blue-400" size={28}/> PASCALINE ENGINE
          </h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">Dual-Insured Institutional Private Equity</p>
        </div>
        
        <div className="flex bg-slate-800 p-2 rounded-2xl border border-slate-700 w-full md:w-auto overflow-x-auto no-scrollbar">
          {['PASCALINE_CORE', 'PRIVATE_DEALS', 'RISK_SHIELD'].map((cat) => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* 📈 DYNAMIC CONTENT AREA */}
      
      {/* SECTION 1: PASCALINE CORE (AI & ALGORITHMS) */}
      {activeCategory === 'PASCALINE_CORE' && (
        <div className="space-y-8 animate-in slide-in-from-left-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm">
               <div className="flex items-center gap-3 mb-6 text-blue-600"><Cpu size={20}/><h4 className="font-black text-sm uppercase tracking-widest">Internal ML Engine</h4></div>
               <div className="space-y-4">
                 <div><p className="text-xs font-bold text-slate-500 flex justify-between"><span>XGBoost Growth Model</span> <span className="text-emerald-600">Active</span></p><div className="w-full h-1 bg-slate-100 rounded-full mt-1"><div className="w-[100%] h-full bg-emerald-500 rounded-full"></div></div></div>
                 <div><p className="text-xs font-bold text-slate-500 flex justify-between"><span>Founder History NLP</span> <span className="text-emerald-600">Active</span></p><div className="w-full h-1 bg-slate-100 rounded-full mt-1"><div className="w-[100%] h-full bg-emerald-500 rounded-full"></div></div></div>
                 <div><p className="text-xs font-bold text-slate-500 flex justify-between"><span>Bayesian Risk Telemetry</span> <span className="text-amber-500">Syncing</span></p><div className="w-full h-1 bg-slate-100 rounded-full mt-1"><div className="w-[65%] h-full bg-amber-500 rounded-full"></div></div></div>
               </div>
            </div>

            <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm">
               <div className="flex items-center gap-3 mb-6 text-indigo-600"><ShieldCheck size={20}/><h4 className="font-black text-sm uppercase tracking-widest">Dual Insurance Logic</h4></div>
               <ul className="space-y-4">
                 <li className="flex justify-between items-center text-sm font-bold"><span className="text-slate-600">User Capital Hedge</span> <span className="text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">Enabled</span></li>
                 <li className="flex justify-between items-center text-sm font-bold"><span className="text-slate-600">Corporate Op-Risk</span> <span className="text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">Enabled</span></li>
                 <li className="flex justify-between items-center text-sm font-bold"><span className="text-slate-600">Reinsurance Backing</span> <span className="text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">Swiss Re</span></li>
                 <li className="flex justify-between items-center text-sm font-bold"><span className="text-slate-600">Continuous Learning</span> <span className="text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">Active</span></li>
               </ul>
            </div>

            <div className="bg-gradient-to-br from-blue-700 to-indigo-800 border border-blue-600 p-8 rounded-[2.5rem] shadow-lg text-white flex flex-col justify-between relative overflow-hidden">
               <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full blur-2xl"></div>
               <div className="relative z-10">
                 <h4 className="font-black text-2xl tracking-tight mb-2">Private Equity Vault</h4>
                 <p className="text-[10px] uppercase tracking-widest text-blue-200 leading-relaxed">Pascaline evaluates private market syndicates and binds dual-insurance policies prior to internal capital deployment.</p>
               </div>
               <button onClick={() => setActiveCategory('PRIVATE_DEALS')} className="w-full py-4 mt-6 bg-white text-blue-900 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:-translate-y-1 transition-all">
                 View Internal Syndicates
               </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: PRIVATE EQUITY DEALS */}
      {activeCategory === 'PRIVATE_DEALS' && (
        <div className="space-y-6 animate-in slide-in-from-left-4">
          <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm relative">
            <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-6">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                  Internal IFB Deal Flow <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]"></span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">Pre-vetted private companies covered by Pascaline Dual Insurance.</p>
              </div>
              <button onClick={fetchPrivateDeals} disabled={isLoadingDeals} className="p-3 bg-slate-50 text-slate-500 rounded-xl hover:text-blue-600 hover:bg-blue-50 transition-all border border-slate-200">
                <RefreshCw size={18} className={isLoadingDeals ? 'animate-spin' : ''} />
              </button>
            </div>
            
            {isLoadingDeals ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Loader2 size={32} className="animate-spin mb-4 text-blue-500"/>
                <p className="text-[10px] font-black uppercase tracking-widest">Evaluating Company Telemetry...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                {privateDeals.map((item) => (
                  <div key={item.id} className="border border-slate-200 rounded-[2.5rem] p-8 hover:border-blue-300 hover:shadow-lg transition-all bg-white flex flex-col justify-between group">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                           <Building size={24}/>
                        </div>
                        <div>
                          <span className="text-lg font-black text-slate-800 leading-none block">{item.name}</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.sector}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-1">AI Expected Yield</p>
                        <p className="text-2xl font-black text-emerald-600 tracking-tighter">+{item.aiGrowth}%</p>
                      </div>
                    </div>

                    {/* Dual Insurance UI Blocks */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                       <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl">
                          <p className="text-[9px] font-black uppercase tracking-widest text-blue-500 mb-1 flex items-center gap-1"><Shield size={12}/> Investor Cov.</p>
                          <p className="text-sm font-black text-blue-900">{item.userCov} Capital</p>
                       </div>
                       <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl">
                          <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500 mb-1 flex items-center gap-1"><Activity size={12}/> Company Cov.</p>
                          <p className="text-sm font-black text-indigo-900">{item.compCov} Op-Risk</p>
                       </div>
                    </div>
                    
                    <button 
                      onClick={() => setInvestModalItem(item)}
                      className="w-full py-5 bg-slate-900 border border-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 hover:border-blue-600 transition-all shadow-md"
                    >
                      Initialize Allocation
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 3: RISK & INSURANCE SHIELD */}
      {activeCategory === 'RISK_SHIELD' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-left-4">
          
          {/* Dual Insurance Pools */}
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
              <div className="absolute -top-10 -right-10 text-slate-800 opacity-50"><Lock size={120}/></div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-emerald-400 mb-4"><ShieldCheck size={16}/> <span className="text-[10px] font-black uppercase tracking-widest">Investor Protection Pool</span></div>
                <h3 className="text-3xl font-black tracking-tight mb-1">{formatCurrency(userInsurancePool)}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">Secures Internal Capital Deployment</p>
              </div>
            </div>

            <div className="bg-indigo-950 border border-indigo-900 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
              <div className="absolute -top-10 -right-10 text-indigo-900 opacity-50"><Building size={120}/></div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-indigo-400 mb-4"><Activity size={16}/> <span className="text-[10px] font-black uppercase tracking-widest">Corporate Runway Pool</span></div>
                <h3 className="text-3xl font-black tracking-tight mb-1">{formatCurrency(companyInsurancePool)}</h3>
                <p className="text-[10px] text-indigo-400/60 font-bold uppercase tracking-widest mb-6">Secures Operational Continuity</p>
              </div>
            </div>
          </div>

          {/* Blockchain & Reinsurance */}
          <div className="space-y-6 flex flex-col justify-between">
            <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm flex items-center gap-6 h-full">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-100 shrink-0"><Hexagon size={24}/></div>
              <div>
                <h4 className="text-sm font-black text-slate-800">Immutable Audit Trail</h4>
                <p className="text-xs text-slate-500 mt-1 mb-2">Internal transfers & policies logged on-chain.</p>
                <p className="text-[10px] font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block border border-blue-100">{hashRate}</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm flex items-center gap-6 h-full">
              <div className="w-16 h-16 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center border border-slate-200 shrink-0"><Network size={24}/></div>
              <div className="w-full">
                <h4 className="text-sm font-black text-slate-800 mb-1">Global Reinsurance</h4>
                <p className="text-xs text-slate-500 mb-3">Catastrophic tail-risk underwritten by partners.</p>
                <div className="flex gap-2">
                   <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-lg">Swiss Re</span>
                   <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-lg">Munich Re</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 PASCALINE EXECUTION MODAL (Updated for Internal Deployment) */}
      {investModalItem && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden relative">
            
            <div className="p-6 border-b border-slate-100 flex justify-between items-center relative z-10 bg-slate-50/50">
              <h3 className="font-black text-lg text-slate-800 tracking-tight uppercase flex items-center gap-2"><Cpu size={18} className="text-blue-600"/> Execute Allocation</h3>
              <button onClick={() => { !isInvesting && setInvestModalItem(null); setInvestAmount(''); setExecutionStep(''); }} disabled={isInvesting} className="text-slate-400 hover:text-slate-800 transition-colors bg-white p-2 rounded-xl shadow-sm border border-slate-200 disabled:opacity-30">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handlePascalineExecution} className="p-8 relative z-10">
              {executionStep ? (
                <div className="py-10 text-center space-y-6 animate-in zoom-in-95">
                  <div className="w-20 h-20 bg-blue-50 border-2 border-blue-100 rounded-full flex items-center justify-center mx-auto shadow-inner relative">
                     <Loader2 className="animate-spin text-blue-600 absolute" size={40} />
                     <ShieldCheck className="text-blue-600" size={20}/>
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-800 tracking-tight">Pascaline Processing</h4>
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mt-2 animate-pulse">{executionStep}</p>
                  </div>
                  
                  {/* Validation Checklist UI */}
                  <div className="text-left bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3 mt-6">
                    <p className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${executionStep.includes('Underwriting') || executionStep.includes('Routing') || executionStep.includes('Securing') ? 'text-emerald-600' : 'text-slate-400'}`}><ShieldCheck size={14}/> AI Risk Validated</p>
                    <p className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${executionStep.includes('Routing') || executionStep.includes('Securing') ? 'text-emerald-600' : 'text-slate-400'}`}><ShieldCheck size={14}/> Dual Policies Generated</p>
                    <p className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${executionStep.includes('Securing') ? 'text-emerald-600' : 'text-slate-400'}`}><ShieldCheck size={14}/> Funds Routed Internally</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Target Syndicate</p>
                        <p className="text-lg font-black text-slate-900">{investModalItem.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-1">AI Expected Yield</p>
                        <p className="text-lg font-black text-emerald-600">+{investModalItem.aiGrowth}%</p>
                      </div>
                    </div>

                    {/* Insurance Dropdown */}
                    <div className="mb-6">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2 flex items-center gap-1"><Shield size={12}/> Select Insurance Protocol</label>
                        <select 
                            value={insuranceTier} 
                            onChange={(e) => setInsuranceTier(e.target.value)} 
                            className="w-full bg-blue-50 border border-blue-200 text-blue-900 rounded-xl p-4 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                        >
                            <option value="basic">Basic (80% User Cov. / $5M Corp Cov.)</option>
                            <option value="premium">Premium (99% User Cov. / $25M Corp Cov.)</option>
                        </select>
                    </div>

                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Available Capital</label>
                    <p className="text-xl font-black text-slate-800 mb-4">{formatCurrency(balances.liquid_usd)}</p>

                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Allocation Size (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={investAmount}
                      onChange={(e) => setInvestAmount(e.target.value)}
                      className="w-full bg-white border-2 border-slate-200 rounded-2xl p-5 font-black text-3xl text-slate-800 outline-none focus:border-blue-500 transition-all placeholder:text-slate-300 shadow-inner"
                      placeholder="0.00"
                      autoFocus
                    />
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={isInvesting || parseFloat(investAmount) > balances.liquid_usd} 
                    className="w-full bg-blue-700 text-white rounded-2xl py-5 font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-600 hover:-translate-y-1 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    DEPLOY INTERNAL CAPITAL
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

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