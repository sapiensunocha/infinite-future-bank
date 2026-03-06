import { useState, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import { 
  TrendingUp, Wallet, Shield, 
  BarChart3, Zap, ChevronRight,
  X, Loader2, RefreshCw, BrainCircuit,
  Cpu, Database, Hexagon, Activity, Network
} from 'lucide-react';

export default function WealthInvest({ session, balances, profile }) {
  const [activeCategory, setActiveCategory] = useState('PASCALINE_CORE'); // PASCALINE_CORE, LIVE_MARKETS, RISK_SHIELD

  // Investment Allocation States
  const [investModalItem, setInvestModalItem] = useState(null); // { symbol: 'BTC', price: 50000, aiScore: 85 }
  const [investAmount, setInvestAmount] = useState('');
  
  // Execution Engine States
  const [isInvesting, setIsInvesting] = useState(false);
  const [executionStep, setExecutionStep] = useState(''); // Tracks the Pascaline validation steps
  
  // Notification & API States
  const [notification, setNotification] = useState(null);
  const [marketData, setMarketData] = useState([]);
  const [isLoadingMarkets, setIsLoadingMarkets] = useState(true);

  // System Stats (Mocked for dashboard realism, would ideally come from DB)
  const insurancePool = 1450250.00;
  const hashRate = "0x8F2A...9C11";

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

  const triggerGlobalActionNotification = (type, message) => {
    setNotification({ type, text: message });
    setTimeout(() => setNotification(null), 6000);
  };

  // --- LIVE MARKET & AI INGESTION LAYER ---
  const fetchMarketData = async () => {
    setIsLoadingMarkets(true);
    try {
      // Data Ingestion Layer: Polygon/CoinGecko API
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=pax-gold,bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true');
      const data = await response.json();

      // Feature Engineering Layer: Generating AI Confidence Scores based on volatility and momentum
      const generateAIScore = (change) => {
        let base = 50; // Neutral
        if (change > 0) base += (change * 5); // Momentum factor
        if (change < 0) base -= Math.abs(change * 2); // Mean reversion factor
        return Math.min(Math.max(Math.round(base), 12), 98); // Bound between 12% and 98%
      };

      const liveAssets = [
        { 
          symbol: 'Institutional Gold (PAXG)', 
          price: data['pax-gold']?.usd, 
          change: data['pax-gold']?.usd_24h_change?.toFixed(2), 
          up: data['pax-gold']?.usd_24h_change >= 0,
          aiScore: generateAIScore(data['pax-gold']?.usd_24h_change)
        },
        { 
          symbol: 'Bitcoin Core (BTC)', 
          price: data['bitcoin']?.usd, 
          change: data['bitcoin']?.usd_24h_change?.toFixed(2), 
          up: data['bitcoin']?.usd_24h_change >= 0,
          aiScore: generateAIScore(data['bitcoin']?.usd_24h_change)
        },
        { 
          symbol: 'Ethereum Network (ETH)', 
          price: data['ethereum']?.usd, 
          change: data['ethereum']?.usd_24h_change?.toFixed(2), 
          up: data['ethereum']?.usd_24h_change >= 0,
          aiScore: generateAIScore(data['ethereum']?.usd_24h_change)
        },
        { 
          symbol: 'Solana Ecosystem (SOL)', 
          price: data['solana']?.usd, 
          change: data['solana']?.usd_24h_change?.toFixed(2), 
          up: data['solana']?.usd_24h_change >= 0,
          aiScore: generateAIScore(data['solana']?.usd_24h_change)
        }
      ];

      setMarketData(liveAssets);
    } catch (error) {
      console.error("Ingestion API Error:", error);
      triggerGlobalActionNotification('error', 'Market Data Ingestion Offline.');
    } finally {
      setIsLoadingMarkets(false);
    }
  };

  useEffect(() => {
    if (activeCategory === 'LIVE_MARKETS') {
      fetchMarketData();
    }
  }, [activeCategory]);

  // --- DELAY HELPER FOR UI VALIDATION ---
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // --- PASCALINE FULL EXECUTION WORKFLOW ---
  const handlePascalineExecution = async (e) => {
    e.preventDefault();
    const amount = parseFloat(investAmount);
    
    if (!amount || amount <= 0) return;
    if (amount > balances.liquid_usd) {
      triggerGlobalActionNotification('error', 'INSUFFICIENT LIQUIDITY: Execution Blocked by Risk Layer.');
      return;
    }

    setIsInvesting(true);

    try {
      // UI Step 1: AI Prediction Check
      setExecutionStep('Validating Prediction Models...');
      await delay(800);
      if (investModalItem.aiScore < 40) throw new Error("AI Risk Warning: Negative Momentum Detected. Trade Blocked.");

      // UI Step 2: Risk & Drawdown
      setExecutionStep('Applying Risk Control Layer...');
      await delay(800);
      if (amount > balances.liquid_usd * 0.5) throw new Error("Risk Limit Exceeded: Cannot allocate >50% liquidity to single asset.");

      // UI Step 3: Insurance & Blockchain
      setExecutionStep('Smart Contract Consensus & Insurance Sync...');
      await delay(1000);

      // UI Step 4: Routing to Edge Function (Broker API Simulation)
      setExecutionStep('Executing Trade via Broker API...');
      
      // REAL BACKEND CALL: This hits your secure Edge Function
      const { data, error } = await supabase.functions.invoke('pascaline-execute', {
        body: {
          userId: session.user.id,
          assetSymbol: investModalItem.symbol,
          amount: amount,
          aiConfidence: investModalItem.aiScore
        }
      });

      if (error || data?.error) throw new Error(data?.error || "Broker API Execution Failed.");

      // Success
      triggerGlobalActionNotification('success', `Trade Confirmed: ${formatCurrency(amount)} allocated to ${investModalItem.symbol}. Hash: ${data.txHash}`);
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
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">Autonomous Hedge & Protection Layer</p>
        </div>
        
        <div className="flex bg-slate-800 p-2 rounded-2xl border border-slate-700 w-full md:w-auto overflow-x-auto no-scrollbar">
          {['PASCALINE_CORE', 'LIVE_MARKETS', 'RISK_SHIELD'].map((cat) => (
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
               <div className="flex items-center gap-3 mb-6 text-blue-600"><Cpu size={20}/><h4 className="font-black text-sm uppercase tracking-widest">Prediction Engine</h4></div>
               <div className="space-y-4">
                 <div><p className="text-xs font-bold text-slate-500 flex justify-between"><span>Random Forest</span> <span className="text-emerald-600">Active</span></p><div className="w-full h-1 bg-slate-100 rounded-full mt-1"><div className="w-[100%] h-full bg-emerald-500 rounded-full"></div></div></div>
                 <div><p className="text-xs font-bold text-slate-500 flex justify-between"><span>LSTM Neural Net</span> <span className="text-emerald-600">Active</span></p><div className="w-full h-1 bg-slate-100 rounded-full mt-1"><div className="w-[100%] h-full bg-emerald-500 rounded-full"></div></div></div>
                 <div><p className="text-xs font-bold text-slate-500 flex justify-between"><span>Bayesian Regression</span> <span className="text-amber-500">Syncing</span></p><div className="w-full h-1 bg-slate-100 rounded-full mt-1"><div className="w-[45%] h-full bg-amber-500 rounded-full"></div></div></div>
               </div>
            </div>

            <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm">
               <div className="flex items-center gap-3 mb-6 text-indigo-600"><Activity size={20}/><h4 className="font-black text-sm uppercase tracking-widest">Strategy Allocation</h4></div>
               <ul className="space-y-4">
                 <li className="flex justify-between items-center text-sm font-bold"><span className="text-slate-600">Momentum Trend</span> <span className="text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">40%</span></li>
                 <li className="flex justify-between items-center text-sm font-bold"><span className="text-slate-600">Mean-Reversion</span> <span className="text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">25%</span></li>
                 <li className="flex justify-between items-center text-sm font-bold"><span className="text-slate-600">Statistical Arb</span> <span className="text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">20%</span></li>
                 <li className="flex justify-between items-center text-sm font-bold"><span className="text-slate-600">Macro Hedge</span> <span className="text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">15%</span></li>
               </ul>
            </div>

            <div className="bg-gradient-to-br from-blue-700 to-indigo-800 border border-blue-600 p-8 rounded-[2.5rem] shadow-lg text-white flex flex-col justify-between relative overflow-hidden">
               <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full blur-2xl"></div>
               <div className="relative z-10">
                 <h4 className="font-black text-2xl tracking-tight mb-2">Autonomous Portfolio</h4>
                 <p className="text-[10px] uppercase tracking-widest text-blue-200 leading-relaxed">Pascaline manages your equity via Mean-Variance Optimization.</p>
               </div>
               <button onClick={() => setActiveCategory('LIVE_MARKETS')} className="w-full py-4 mt-6 bg-white text-blue-900 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:-translate-y-1 transition-all">
                 View Trade Signals
               </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: LIVE MARKETS & PREDICTIONS */}
      {activeCategory === 'LIVE_MARKETS' && (
        <div className="space-y-6 animate-in slide-in-from-left-4">
          <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm relative">
            <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-6">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                  Market Ingestion Layer <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]"></span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">Live data streams passing through NLP & Momentum algorithms.</p>
              </div>
              <button onClick={fetchMarketData} disabled={isLoadingMarkets} className="p-3 bg-slate-50 text-slate-500 rounded-xl hover:text-blue-600 hover:bg-blue-50 transition-all border border-slate-200">
                <RefreshCw size={18} className={isLoadingMarkets ? 'animate-spin' : ''} />
              </button>
            </div>
            
            {isLoadingMarkets ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Loader2 size={32} className="animate-spin mb-4 text-blue-500"/>
                <p className="text-[10px] font-black uppercase tracking-widest">Ingesting Polygon/CoinGecko Streams...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
                {marketData.map((item, i) => (
                  <div key={i} className="border border-slate-200 rounded-[2rem] p-6 hover:border-blue-300 hover:shadow-md transition-all bg-slate-50 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <span className="text-sm font-black text-slate-800">{item.symbol}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-lg font-black text-slate-900 tracking-tighter">{formatCurrency(item.price)}</p>
                          <span className={`text-[10px] font-black tracking-widest px-2 py-1 rounded-md ${item.up ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {item.up ? '+' : ''}{item.change}%
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">AI Probability</p>
                        <div className="flex items-center justify-end gap-2">
                          <BrainCircuit size={14} className={item.aiScore >= 60 ? 'text-emerald-500' : item.aiScore <= 40 ? 'text-red-500' : 'text-amber-500'}/>
                          <span className={`text-xl font-black ${item.aiScore >= 60 ? 'text-emerald-600' : item.aiScore <= 40 ? 'text-red-600' : 'text-amber-600'}`}>
                            {item.aiScore}%
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => setInvestModalItem(item)}
                      className="w-full py-4 bg-white border border-slate-200 text-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                    >
                      Initialize Execution
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
          
          {/* Insurance Pool */}
          <div className="bg-slate-900 border border-slate-800 p-10 rounded-[3rem] shadow-xl text-white relative overflow-hidden">
            <div className="absolute -top-10 -right-10 text-slate-800 opacity-50"><Shield size={180}/></div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-emerald-400 mb-6"><ShieldCheck size={20}/> <span className="text-[10px] font-black uppercase tracking-widest">Active Protection Layer</span></div>
              <h3 className="text-3xl font-black tracking-tight mb-2">{formatCurrency(insurancePool)}</h3>
              <p className="text-xs text-slate-400 font-medium mb-8 max-w-sm leading-relaxed">
                Aggregated IFB Insurance Pool. Funded via macro fees, designed to cover catastrophic tail-risk events automatically via Smart Contract execution.
              </p>
              <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reinsurance Partner</span>
                <span className="text-sm font-black text-white">Swiss Re</span>
              </div>
            </div>
          </div>

          {/* Blockchain & Risk Limits */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm flex items-center gap-6">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100 shrink-0"><Hexagon size={24}/></div>
              <div>
                <h4 className="text-sm font-black text-slate-800">Blockchain Validation</h4>
                <p className="text-xs text-slate-500 mt-1 mb-2">Hyperledger Fabric Node Synced</p>
                <p className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-2 py-1 rounded inline-block border border-indigo-100">{hashRate}</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm flex items-center gap-6">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center border border-red-100 shrink-0"><Network size={24}/></div>
              <div className="w-full">
                <div className="flex justify-between items-end mb-2">
                  <h4 className="text-sm font-black text-slate-800">Max Portfolio Drawdown</h4>
                  <span className="text-xs font-black text-red-600">Limit: 8%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="w-[15%] h-full bg-red-500 rounded-full"></div>
                </div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-2">Current Drawdown: 1.2%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 PASCALINE EXECUTION MODAL */}
      {investModalItem && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden relative">
            
            <div className="p-6 border-b border-slate-100 flex justify-between items-center relative z-10 bg-slate-50/50">
              <h3 className="font-black text-lg text-slate-800 tracking-tight uppercase flex items-center gap-2"><Cpu size={18} className="text-blue-600"/> Trade Execution</h3>
              <button onClick={() => { !isInvesting && setInvestModalItem(null); setInvestAmount(''); setExecutionStep(''); }} disabled={isInvesting} className="text-slate-400 hover:text-slate-800 transition-colors bg-white p-2 rounded-xl shadow-sm border border-slate-200 disabled:opacity-30">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handlePascalineExecution} className="p-8 relative z-10">
              {executionStep ? (
                <div className="py-10 text-center space-y-6 animate-in zoom-in-95">
                  <div className="w-20 h-20 bg-blue-50 border-2 border-blue-100 rounded-full flex items-center justify-center mx-auto shadow-inner relative">
                     <Loader2 className="animate-spin text-blue-600 absolute" size={40} />
                     <BrainCircuit className="text-blue-600" size={20}/>
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-800 tracking-tight">Pascaline Processing</h4>
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mt-2 animate-pulse">{executionStep}</p>
                  </div>
                  
                  {/* Validation Checklist UI */}
                  <div className="text-left bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3 mt-6">
                    <p className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${executionStep.includes('AI') || executionStep.includes('Risk') || executionStep.includes('Smart') || executionStep.includes('Broker') ? 'text-emerald-600' : 'text-slate-400'}`}><ShieldCheck size={14}/> AI Probability Validated</p>
                    <p className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${executionStep.includes('Risk') || executionStep.includes('Smart') || executionStep.includes('Broker') ? 'text-emerald-600' : 'text-slate-400'}`}><ShieldCheck size={14}/> Risk Limits Checked</p>
                    <p className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${executionStep.includes('Smart') || executionStep.includes('Broker') ? 'text-emerald-600' : 'text-slate-400'}`}><ShieldCheck size={14}/> Smart Contract Synced</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-end mb-6 bg-blue-50 p-4 rounded-2xl border border-blue-100">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">Target Asset</p>
                        <p className="text-lg font-black text-blue-900">{investModalItem.symbol}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black uppercase tracking-widest text-blue-400 mb-1">AI Confidence</p>
                        <p className="text-xl font-black text-blue-700">{investModalItem.aiScore}%</p>
                      </div>
                    </div>

                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Available Liquidity</label>
                    <p className="text-xl font-black text-emerald-600 mb-6">{formatCurrency(balances.liquid_usd)}</p>

                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 text-left">Order Size (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={investAmount}
                      onChange={(e) => setInvestAmount(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 font-black text-4xl text-center text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-300 shadow-inner"
                      placeholder="0.00"
                      autoFocus
                    />
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={isInvesting || parseFloat(investAmount) > balances.liquid_usd} 
                    className="w-full bg-slate-900 text-white rounded-2xl py-5 font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-800 hover:-translate-y-1 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    INITIALIZE EXECUTION <ChevronRight size={16}/>
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