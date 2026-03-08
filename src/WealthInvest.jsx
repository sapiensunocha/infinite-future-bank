import { useState, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import { 
  TrendingUp, Wallet, Shield, 
  BarChart3, Zap, ChevronRight,
  X, Loader2, RefreshCw, BrainCircuit,
  Cpu, Database, Hexagon, Activity, Network, 
  ShieldCheck, Building, Lock, Globe, FileText, 
  CheckCircle, Circle, PieChart, Briefcase, Zap as ZapIcon
} from 'lucide-react';

export default function WealthInvest({ session, balances, profile }) {
  const [activeCategory, setActiveCategory] = useState('PORTFOLIO'); // PORTFOLIO, PUBLIC_MARKETS, PRIVATE_EQUITY, RAISE_CAPITAL, AI_MODELS, RISK_MANAGEMENT

  // Public Market States
  const [searchSymbol, setSearchSymbol] = useState('');
  const [marketAsset, setMarketAsset] = useState(null);
  const [isSearchingMarket, setIsSearchingMarket] = useState(false);
  const [publicInvestAmount, setPublicInvestAmount] = useState('');

  // Founder Application States
  const [founderForm, setFounderForm] = useState({
    name: '', sector: '', valuation: '', fundraisingGoal: '', 
    revenueGrowth: '', marketSize: '', founderExp: '', profitMargin: '', stability: ''
  });
  const [isSubmittingPitch, setIsSubmittingPitch] = useState(false);

  // Investment & Insurance States
  const [investModalItem, setInvestModalItem] = useState(null); 
  const [investAmount, setInvestAmount] = useState('');
  const [insuranceTier, setInsuranceTier] = useState('premium'); 
  
  // 🔥 Transparency Execution Engine States
  const [isInvesting, setIsInvesting] = useState(false);
  const [executionPlan, setExecutionPlan] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  
  // Notification & API States
  const [notification, setNotification] = useState(null);
  const [privateDeals, setPrivateDeals] = useState([]);
  const [isLoadingDeals, setIsLoadingDeals] = useState(true);

  // 📊 Portfolio / Cap Table States
  const [portfolio, setPortfolio] = useState({ private: [], public: [], totalValue: 0, privateValue: 0, publicValue: 0 });
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(true);

  const userInsurancePool = 1450250.00;
  const companyInsurancePool = 8500000.00;
  const hashRate = "0x8F2A...9C11";

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

  const triggerGlobalActionNotification = (type, message) => {
    setNotification({ type, text: message });
    setTimeout(() => setNotification(null), 6000);
  };

  // --- AI SUGGESTED MARKET PICKS (Pre-loaded Feed) ---
  const topMarketPicks = [
    { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 875.28, signal: 'BUY', confidence: 94.2, color: 'bg-green-100 text-green-700' },
    { symbol: 'BTC/USD', name: 'Bitcoin', price: 64230.00, signal: 'BUY', confidence: 89.5, color: 'bg-orange-100 text-orange-700' },
    { symbol: 'AAPL', name: 'Apple Inc.', price: 172.62, signal: 'BUY', confidence: 82.1, color: 'bg-slate-200 text-slate-800' },
    { symbol: 'TSLA', name: 'Tesla Inc.', price: 175.34, signal: 'HOLD', confidence: 61.4, color: 'bg-red-100 text-red-700' }
  ];

  // --- 📊 FETCH INVESTOR PORTFOLIO & CAP TABLE ---
  const fetchInvestorPortfolio = async () => {
    setIsLoadingPortfolio(true);
    try {
      const { data: privateData, error: privateError } = await supabase
        .from('private_cap_table')
        .select(`investment_amount, equity_percentage, ifb_companies ( name, sector, valuation )`)
        .eq('investor_id', session?.user?.id);
      
      if (privateError) throw privateError;

      const { data: publicData, error: publicError } = await supabase
        .from('market_transactions')
        .select('asset, side, execution_price, quantity')
        .eq('user_id', session?.user?.id)
        .eq('status', 'COMPLETED');

      if (publicError) throw publicError;

      let privTotal = 0;
      const privFormatted = (privateData || []).map(item => {
        privTotal += parseFloat(item.investment_amount);
        return {
          name: item.ifb_companies?.name || 'Unknown Startup',
          sector: item.ifb_companies?.sector || 'Unknown',
          equity: parseFloat(item.equity_percentage).toFixed(4),
          invested: parseFloat(item.investment_amount),
          currentValue: (parseFloat(item.ifb_companies?.valuation || 0) * (parseFloat(item.equity_percentage) / 100))
        };
      });

      const holdings = {};
      (publicData || []).forEach(tx => {
        if (!holdings[tx.asset]) holdings[tx.asset] = { qty: 0, invested: 0 };
        const qty = parseFloat(tx.quantity);
        const cost = qty * parseFloat(tx.execution_price);
        if (tx.side === 'BUY') {
          holdings[tx.asset].qty += qty;
          holdings[tx.asset].invested += cost;
        } else {
          holdings[tx.asset].qty -= qty;
          holdings[tx.asset].invested -= cost;
        }
      });

      let pubTotal = 0;
      const pubFormatted = Object.keys(holdings).filter(asset => holdings[asset].qty > 0).map(asset => {
        pubTotal += holdings[asset].invested;
        return { asset, qty: holdings[asset].qty.toFixed(4), invested: holdings[asset].invested };
      });

      setPortfolio({
        private: privFormatted,
        public: pubFormatted,
        privateValue: privTotal,
        publicValue: pubTotal,
        totalValue: privTotal + pubTotal
      });
    } catch (err) {
      triggerGlobalActionNotification('error', 'Failed to load portfolio.');
    } finally {
      setIsLoadingPortfolio(false);
    }
  };

  useEffect(() => {
    if (activeCategory === 'PORTFOLIO') fetchInvestorPortfolio();
    if (activeCategory === 'PRIVATE_EQUITY') fetchPrivateDeals();
  }, [activeCategory]);

  // --- PUBLIC MARKET DATA FETCHING ---
  const fetchMarketData = async (e) => {
    e.preventDefault();
    if (!searchSymbol) return;
    setIsSearchingMarket(true);
    setMarketAsset(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 1200)); 
      const mockPrice = (Math.random() * 500 + 50).toFixed(2);
      const aiConfidence = (Math.random() * 20 + 70).toFixed(1);
      const signal = mockPrice > 250 ? 'BUY' : 'HOLD';

      setMarketAsset({
        symbol: searchSymbol.toUpperCase(),
        price: parseFloat(mockPrice),
        signal: signal,
        confidence: aiConfidence,
        strategy: 'Momentum Breakout'
      });
    } catch (error) {
      triggerGlobalActionNotification('error', 'Failed to connect to market data.');
    } finally {
      setIsSearchingMarket(false);
    }
  };

  // --- PUBLIC MARKET EXECUTION (With Transparency UI) ---
  const handlePublicTrade = async (side) => {
    const amount = parseFloat(publicInvestAmount);
    if (!amount || amount <= 0) return;
    if (side === 'buy' && amount > balances.liquid_usd) {
      triggerGlobalActionNotification('error', 'INSUFFICIENT LIQUIDITY.');
      return;
    }

    const plan = [
      "Verifying available funds",
      "Routing order to market",
      "Executing trade",
      "Updating portfolio ledger"
    ];
    setExecutionPlan(plan);
    setCurrentStepIndex(0);
    setIsInvesting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      setCurrentStepIndex(1);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      setCurrentStepIndex(2);
      
      const qty = (amount / marketAsset.price).toFixed(6);
      await new Promise(resolve => setTimeout(resolve, 1200));
      setCurrentStepIndex(3);

      await supabase.from('market_transactions').insert({
        user_id: session?.user?.id,
        asset: marketAsset.symbol,
        side: side.toUpperCase(),
        execution_price: marketAsset.price,
        quantity: qty,
        status: 'COMPLETED'
      });
      await new Promise(resolve => setTimeout(resolve, 600));

      triggerGlobalActionNotification('success', `Executed: ${side.toUpperCase()} ${qty} ${marketAsset.symbol}`);
      setPublicInvestAmount('');
      setMarketAsset(null);
      setSearchSymbol('');
    } catch (err) {
      triggerGlobalActionNotification('error', 'Trade execution failed.');
    } finally {
      setIsInvesting(false);
      setExecutionPlan([]);
      setCurrentStepIndex(-1);
    }
  };

  // --- INTERNAL PRIVATE EQUITY DATA FETCHING ---
  const fetchPrivateDeals = async () => {
    setIsLoadingDeals(true);
    try {
      const { data, error } = await supabase
        .from('ifb_companies')
        .select('*')
        .eq('status', 'APPROVED')
        .order('deus_score', { ascending: false });
      
      if (error) throw error;
      setPrivateDeals(data || []);
    } catch (error) {
      triggerGlobalActionNotification('error', 'Failed to load Private Equity listings.');
    } finally {
      setIsLoadingDeals(false);
    }
  };

  // --- FOUNDER PITCH SUBMISSION ---
  const submitStartupPitch = async (e) => {
    e.preventDefault();
    setIsSubmittingPitch(true);
    
    try {
      const payload = {
        founderId: session?.user?.id,
        name: founderForm.name,
        sector: founderForm.sector,
        valuation: parseFloat(founderForm.valuation),
        fundraisingGoal: parseFloat(founderForm.fundraisingGoal),
        revenueGrowthPct: parseFloat(founderForm.revenueGrowth),
        marketSizeScore: parseInt(founderForm.marketSize),
        founderExpScore: parseInt(founderForm.founderExp),
        profitMarginPct: parseFloat(founderForm.profitMargin),
        financialStability: parseInt(founderForm.stability)
      };

      const res = await fetch('https://ifb-intelligence-core-382117221028.us-central1.run.app/api/evaluate-pitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("GCP Backend execution failed");
      
      const result = await res.json();

      triggerGlobalActionNotification('success', `Evaluated by DEUS AI. Score: ${result.deus_score}/100. Status: ${result.status}`);
      setFounderForm({name: '', sector: '', valuation: '', fundraisingGoal: '', revenueGrowth: '', marketSize: '', founderExp: '', profitMargin: '', stability: ''});
      
      if(result.status === 'APPROVED') {
        setActiveCategory('PRIVATE_EQUITY');
      } else {
        triggerGlobalActionNotification('error', `Company Risk Too High. Status: ${result.status}`);
      }
      
    } catch (err) {
      console.error(err);
      triggerGlobalActionNotification('error', 'DEUS Engine timeout. Please try again.');
    } finally {
      setIsSubmittingPitch(false);
    }
  };

  // --- PRIVATE EQUITY EXECUTION (With Transparency UI) ---
  const handlePrivateExecution = async (e) => {
    e.preventDefault();
    const amount = parseFloat(investAmount);
    if (!amount || amount <= 0) return;
    if (amount > balances.liquid_usd) {
      triggerGlobalActionNotification('error', 'INSUFFICIENT LIQUIDITY.');
      return;
    }

    const plan = [
      "Verifying company metrics",
      "Generating insurance policy",
      "Routing funds to escrow",
      "Updating ownership ledger"
    ];
    setExecutionPlan(plan);
    setCurrentStepIndex(0);
    setIsInvesting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setCurrentStepIndex(1);

      await new Promise(resolve => setTimeout(resolve, 1200));
      setCurrentStepIndex(2);

      await new Promise(resolve => setTimeout(resolve, 1000));
      setCurrentStepIndex(3);

      await supabase.from('private_cap_table').insert({
        company_id: investModalItem.id,
        investor_id: session?.user?.id,
        investment_amount: amount,
        equity_percentage: (amount / parseFloat(investModalItem.valuation)) * 100
      });
      await new Promise(resolve => setTimeout(resolve, 800));

      triggerGlobalActionNotification('success', `Investment Successful. Added to Portfolio.`);
      setInvestModalItem(null);
      setInvestAmount('');
    } catch (err) {
      triggerGlobalActionNotification('error', err.message || "Execution Failed.");
    } finally {
      setIsInvesting(false);
      setExecutionPlan([]);
      setCurrentStepIndex(-1);
    }
  };

  // --- REUSABLE TRANSPARENCY UI COMPONENT ---
  const ExecutionProgressUI = () => {
    if (!isInvesting || executionPlan.length === 0) return null;
    const progressPct = ((currentStepIndex) / (executionPlan.length - 1)) * 100;

    return (
      <div className="bg-[#111] border border-slate-800 rounded-3xl p-8 text-slate-300 w-full animate-in zoom-in-95 shadow-2xl mt-6">
        <div className="flex justify-between items-center mb-8">
           <h4 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2"><Cpu size={18} className="text-blue-500" /> Processing Transaction</h4>
           <span className="bg-blue-900/50 text-blue-400 text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full border border-blue-800 animate-pulse">Live</span>
        </div>
        <div className="space-y-6 mb-10">
          {executionPlan.map((step, idx) => (
             <div key={idx} className={`flex items-center gap-4 transition-all duration-300 ${idx > currentStepIndex ? 'opacity-40' : 'opacity-100'}`}>
               {idx < currentStepIndex ? (
                 <CheckCircle className="text-emerald-500 w-5 h-5 shrink-0" />
               ) : idx === currentStepIndex ? (
                 <Loader2 className="animate-spin text-blue-500 w-5 h-5 shrink-0" />
               ) : (
                 <Circle className="text-slate-600 w-5 h-5 shrink-0" />
               )}
               <span className={`text-sm tracking-wide ${idx === currentStepIndex ? 'text-white font-bold' : 'text-slate-400'}`}>{step}</span>
             </div>
          ))}
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
           <div className="h-full bg-white transition-all duration-500 ease-out" style={{ width: `${progressPct}%` }}></div>
        </div>
      </div>
    );
  };

  const menuItems = [
    { id: 'PORTFOLIO', label: 'Portfolio' },
    { id: 'PUBLIC_MARKETS', label: 'Public Markets' },
    { id: 'PRIVATE_EQUITY', label: 'Private Equity' },
    { id: 'RAISE_CAPITAL', label: 'Raise Capital' },
    { id: 'AI_MODELS', label: 'AI Models' },
    { id: 'RISK_MANAGEMENT', label: 'Risk & Insurance' }
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 text-slate-800 relative">
      
      {/* 🏛️ Top Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl text-white">
        <div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
            <TrendingUp className="text-blue-400" size={28}/> Wealth Management
          </h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">Invest in Stocks, Crypto, and Private Companies</p>
        </div>
        
        <div className="flex bg-slate-800 p-2 rounded-2xl border border-slate-700 w-full xl:w-auto overflow-x-auto no-scrollbar">
          {menuItems.map((item) => (
            <button 
              key={item.id}
              onClick={() => setActiveCategory(item.id)}
              className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeCategory === item.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 📈 DYNAMIC CONTENT AREA */}

      {/* 📊 SECTION: PORTFOLIO */}
      {activeCategory === 'PORTFOLIO' && (
        <div className="space-y-6 animate-in slide-in-from-left-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl text-white">
              <div className="flex items-center gap-3 text-slate-400 mb-2"><PieChart size={18}/> <h3 className="text-[10px] font-black uppercase tracking-widest">Total Investment Value</h3></div>
              <h2 className="text-4xl font-black tracking-tighter mt-2">{formatCurrency(portfolio.totalValue)}</h2>
            </div>
            <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm">
              <div className="flex items-center gap-3 text-slate-500 mb-2"><Briefcase size={18} className="text-indigo-600"/> <h3 className="text-[10px] font-black uppercase tracking-widest">Private Equity</h3></div>
              <h2 className="text-3xl font-black tracking-tighter text-slate-900 mt-2">{formatCurrency(portfolio.privateValue)}</h2>
            </div>
            <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm">
              <div className="flex items-center gap-3 text-slate-500 mb-2"><Globe size={18} className="text-blue-600"/> <h3 className="text-[10px] font-black uppercase tracking-widest">Public Markets</h3></div>
              <h2 className="text-3xl font-black tracking-tighter text-slate-900 mt-2">{formatCurrency(portfolio.publicValue)}</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-6 flex items-center gap-2">
                 <Briefcase size={16} className="text-indigo-600"/> Private Holdings
              </h3>
              {isLoadingPortfolio ? (
                <div className="py-10 text-center"><Loader2 className="animate-spin mx-auto text-blue-500"/></div>
              ) : portfolio.private.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">No Private Equity assets found.</div>
              ) : (
                <div className="space-y-4">
                  {portfolio.private.map((asset, i) => (
                    <div key={i} className="flex justify-between items-center p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                      <div>
                        <h4 className="font-black text-slate-900">{asset.name}</h4>
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{asset.equity}% Ownership</p>
                      </div>
                      <div className="text-right">
                        <h4 className="font-black text-slate-900">{formatCurrency(asset.invested)}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Invested</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-6 flex items-center gap-2">
                 <Globe size={16} className="text-blue-600"/> Public Holdings
              </h3>
              {isLoadingPortfolio ? (
                <div className="py-10 text-center"><Loader2 className="animate-spin mx-auto text-blue-500"/></div>
              ) : portfolio.public.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">No Public Market assets found.</div>
              ) : (
                <div className="space-y-4">
                  {portfolio.public.map((asset, i) => (
                    <div key={i} className="flex justify-between items-center p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                      <div>
                        <h4 className="font-black text-slate-900">{asset.asset}</h4>
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">{asset.qty} Shares</p>
                      </div>
                      <div className="text-right">
                        <h4 className="font-black text-slate-900">{formatCurrency(asset.invested)}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Cost Basis</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 1: PUBLIC MARKETS */}
      {activeCategory === 'PUBLIC_MARKETS' && (
        <div className="space-y-6 animate-in slide-in-from-left-4">
          <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm relative">
            <div className="mb-8 border-b border-slate-100 pb-6 flex items-center gap-3">
              <Globe className="text-blue-600" size={24} />
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Public Markets</h3>
                <p className="text-xs text-slate-500 mt-1">Trade US Stocks & Crypto.</p>
              </div>
            </div>

            <form onSubmit={fetchMarketData} className="flex gap-4 mb-8">
              <input 
                type="text" 
                value={searchSymbol}
                onChange={(e) => setSearchSymbol(e.target.value)}
                placeholder="Enter Ticker (e.g., AAPL, TSLA, BTC/USD)" 
                className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 font-black text-slate-800 uppercase tracking-widest outline-none focus:border-blue-500 transition-all"
                required
              />
              <button 
                type="submit" 
                disabled={isSearchingMarket}
                className="bg-slate-900 text-white px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2"
              >
                {isSearchingMarket ? <Loader2 size={16} className="animate-spin" /> : <Activity size={16} />}
                Search
              </button>
            </form>

            {/* If NO asset searched yet, show AI Suggestions Feed */}
            {!marketAsset && (
              <div className="mt-8 animate-in fade-in">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                  <ZapIcon size={14} className="text-blue-500" />
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">DEUS AI Top Recommendations</h4>
                </div>
                <div className="space-y-3">
                  {topMarketPicks.map((pick) => (
                    <div 
                      key={pick.symbol} 
                      onClick={() => setMarketAsset({ symbol: pick.symbol, price: pick.price, signal: pick.signal, confidence: pick.confidence })}
                      className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-slate-50 border border-slate-200 rounded-2xl hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-4 mb-3 md:mb-0">
                        <div className={`w-12 h-12 flex items-center justify-center rounded-xl font-black ${pick.color}`}>
                          {pick.symbol[0]}
                        </div>
                        <div>
                          <h5 className="font-black text-slate-900">{pick.name}</h5>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{pick.symbol}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between md:gap-8 w-full md:w-auto">
                        <div className="text-left md:text-right">
                          <p className="font-black text-slate-900">{formatCurrency(pick.price)}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Live Price</p>
                        </div>
                        
                        <div className="text-right">
                          <p className={`text-sm font-black flex items-center gap-1 justify-end ${pick.signal === 'BUY' ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {pick.signal} <span className="text-[10px] text-slate-400">({pick.confidence}%)</span>
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">AI Signal</p>
                        </div>

                        <button className="px-5 py-2 bg-white border border-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest rounded-xl group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all shadow-sm">
                          Trade
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* If an asset IS searched or selected, show Execution Terminal */}
            {marketAsset && (
              <div className="border border-slate-200 p-8 rounded-[2.5rem] bg-slate-50 relative overflow-hidden animate-in zoom-in-95">
                <button 
                  onClick={() => { setMarketAsset(null); setPublicInvestAmount(''); }} 
                  className="absolute top-6 right-6 p-2 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-slate-800 shadow-sm z-20"
                >
                  <X size={16} />
                </button>

                <div className="flex justify-between items-start mb-8 relative z-10 pr-10">
                  <div>
                    <h4 className="text-3xl font-black text-slate-900 tracking-tight">{marketAsset.symbol}</h4>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2">Live Price</p>
                  </div>
                  <div className="text-right">
                    <h4 className="text-3xl font-black text-slate-900 tracking-tight">{formatCurrency(marketAsset.price)}</h4>
                    <p className={`text-[10px] font-black uppercase tracking-widest mt-2 ${marketAsset.signal === 'BUY' ? 'text-emerald-500' : 'text-amber-500'}`}>
                      AI Analysis: {marketAsset.signal} ({marketAsset.confidence}%)
                    </p>
                  </div>
                </div>

                {isInvesting ? (
                  <ExecutionProgressUI />
                ) : (
                  <div className="flex flex-col md:flex-row gap-4 relative z-10 items-end">
                    <div className="flex-1 w-full">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Amount (USD)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={publicInvestAmount}
                        onChange={(e) => setPublicInvestAmount(e.target.value)}
                        className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 font-black text-xl text-slate-800 outline-none focus:border-blue-500 transition-all shadow-inner"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                      <button 
                        onClick={() => handlePublicTrade('buy')}
                        disabled={!publicInvestAmount}
                        className="flex-1 md:w-32 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 transition-all disabled:opacity-50 shadow-md"
                      >
                        Buy
                      </button>
                      <button 
                        onClick={() => handlePublicTrade('sell')}
                        disabled={!publicInvestAmount}
                        className="flex-1 md:w-32 py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 transition-all disabled:opacity-50 shadow-md"
                      >
                        Sell
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: PRIVATE EQUITY */}
      {activeCategory === 'PRIVATE_EQUITY' && (
        <div className="space-y-6 animate-in slide-in-from-left-4">
          <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm relative">
            <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-6">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                  Private Equity Offerings <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]"></span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">Invest directly in evaluated startups.</p>
              </div>
              <button onClick={fetchPrivateDeals} disabled={isLoadingDeals} className="p-3 bg-slate-50 text-slate-500 rounded-xl hover:text-blue-600 hover:bg-blue-50 transition-all border border-slate-200">
                <RefreshCw size={18} className={isLoadingDeals ? 'animate-spin' : ''} />
              </button>
            </div>
            
            {isLoadingDeals ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Loader2 size={32} className="animate-spin mb-4 text-blue-500"/>
                <p className="text-[10px] font-black uppercase tracking-widest">Loading Opportunities...</p>
              </div>
            ) : privateDeals.length === 0 ? (
               <div className="text-center py-16 text-slate-400">
                 <Building size={48} className="mx-auto mb-4 opacity-30" />
                 <h4 className="font-black text-lg text-slate-800">No Startups Available</h4>
                 <p className="text-sm mt-2">Check back later for new offerings.</p>
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
                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-1">AI Rating</p>
                        <p className="text-2xl font-black text-emerald-600 tracking-tighter">{item.deus_score}/100</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                       <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl">
                          <p className="text-[9px] font-black uppercase tracking-widest text-blue-500 mb-1 flex items-center gap-1"><Shield size={12}/> Valuation</p>
                          <p className="text-sm font-black text-blue-900">{formatCurrency(item.valuation)}</p>
                       </div>
                       <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl">
                          <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500 mb-1 flex items-center gap-1"><Activity size={12}/> Target Raise</p>
                          <p className="text-sm font-black text-indigo-900">{formatCurrency(item.fundraising_goal)}</p>
                       </div>
                    </div>
                    
                    <button 
                      onClick={() => setInvestModalItem(item)}
                      className="w-full py-5 bg-slate-900 border border-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 hover:border-blue-600 transition-all shadow-md"
                    >
                      Invest
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 3: RAISE CAPITAL */}
      {activeCategory === 'RAISE_CAPITAL' && (
        <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm animate-in slide-in-from-left-4">
          <div className="mb-8 border-b border-slate-100 pb-6">
            <h3 className="text-xl font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
              <FileText className="text-blue-600" /> Apply for Funding
            </h3>
            <p className="text-sm text-slate-500 mt-2">Submit your company details for AI evaluation and platform listing.</p>
          </div>

          <form onSubmit={submitStartupPitch} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Company Name</label>
              <input required placeholder="E.g. Nexus Energy" className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 font-bold" value={founderForm.name} onChange={e => setFounderForm({...founderForm, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Sector</label>
              <input required placeholder="E.g. Artificial Intelligence" className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 font-bold" value={founderForm.sector} onChange={e => setFounderForm({...founderForm, sector: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Current Valuation ($)</label>
              <input required type="number" placeholder="5000000" className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 font-bold" value={founderForm.valuation} onChange={e => setFounderForm({...founderForm, valuation: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Capital Needed ($)</label>
              <input required type="number" placeholder="500000" className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 font-bold" value={founderForm.fundraisingGoal} onChange={e => setFounderForm({...founderForm, fundraisingGoal: e.target.value})} />
            </div>
            
            <div className="col-span-1 md:col-span-2 mt-4 mb-2">
              <h4 className="text-[10px] font-black uppercase text-blue-600 tracking-widest border-b border-blue-100 pb-2">Business Metrics</h4>
            </div>

            <input required type="number" placeholder="YoY Revenue Growth (%)" className="p-4 bg-blue-50/30 rounded-xl border border-blue-100 font-bold placeholder:text-blue-300" value={founderForm.revenueGrowth} onChange={e => setFounderForm({...founderForm, revenueGrowth: e.target.value})} />
            <input required type="number" placeholder="Profit Margin (%)" className="p-4 bg-blue-50/30 rounded-xl border border-blue-100 font-bold placeholder:text-blue-300" value={founderForm.profitMargin} onChange={e => setFounderForm({...founderForm, profitMargin: e.target.value})} />
            <input required type="number" max="100" placeholder="Market Size Score (1-100)" className="p-4 bg-blue-50/30 rounded-xl border border-blue-100 font-bold placeholder:text-blue-300" value={founderForm.marketSize} onChange={e => setFounderForm({...founderForm, marketSize: e.target.value})} />
            <input required type="number" max="100" placeholder="Founder Experience Score (1-100)" className="p-4 bg-blue-50/30 rounded-xl border border-blue-100 font-bold placeholder:text-blue-300" value={founderForm.founderExp} onChange={e => setFounderForm({...founderForm, founderExp: e.target.value})} />
            <input required type="number" max="100" placeholder="Financial Stability Score (1-100)" className="p-4 bg-blue-50/30 rounded-xl border border-blue-100 font-bold placeholder:text-blue-300" value={founderForm.stability} onChange={e => setFounderForm({...founderForm, stability: e.target.value})} />
            
            <button type="submit" disabled={isSubmittingPitch} className="col-span-1 md:col-span-2 py-5 bg-blue-700 text-white rounded-2xl font-black tracking-widest uppercase hover:bg-blue-600 transition-all shadow-lg mt-6 flex items-center justify-center gap-2">
              {isSubmittingPitch ? <><Loader2 className="animate-spin" size={20} /> Evaluating Application...</> : 'Submit Application'}
            </button>
          </form>
        </div>
      )}

      {/* SECTION 4 & 5 */}
      {activeCategory === 'AI_MODELS' && (
        <div className="space-y-8 animate-in slide-in-from-left-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm">
               <div className="flex items-center gap-3 mb-6 text-blue-600"><Cpu size={20}/><h4 className="font-black text-sm uppercase tracking-widest">Growth Models</h4></div>
               <div className="space-y-4">
                 <div><p className="text-xs font-bold text-slate-500 flex justify-between"><span>XGBoost Valuation</span> <span className="text-emerald-600">Active</span></p><div className="w-full h-1 bg-slate-100 rounded-full mt-1"><div className="w-[100%] h-full bg-emerald-500 rounded-full"></div></div></div>
                 <div><p className="text-xs font-bold text-slate-500 flex justify-between"><span>Market Sentiment NLP</span> <span className="text-emerald-600">Active</span></p><div className="w-full h-1 bg-slate-100 rounded-full mt-1"><div className="w-[100%] h-full bg-emerald-500 rounded-full"></div></div></div>
                 <div><p className="text-xs font-bold text-slate-500 flex justify-between"><span>Risk Telemetry</span> <span className="text-amber-500">Syncing</span></p><div className="w-full h-1 bg-slate-100 rounded-full mt-1"><div className="w-[65%] h-full bg-amber-500 rounded-full"></div></div></div>
               </div>
            </div>

            <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm">
               <div className="flex items-center gap-3 mb-6 text-indigo-600"><ShieldCheck size={20}/><h4 className="font-black text-sm uppercase tracking-widest">Active Protections</h4></div>
               <ul className="space-y-4">
                 <li className="flex justify-between items-center text-sm font-bold"><span className="text-slate-600">Capital Protection</span> <span className="text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">Enabled</span></li>
                 <li className="flex justify-between items-center text-sm font-bold"><span className="text-slate-600">Volatility Hedge</span> <span className="text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">Enabled</span></li>
                 <li className="flex justify-between items-center text-sm font-bold"><span className="text-slate-600">Rebalancing</span> <span className="text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">Auto</span></li>
               </ul>
            </div>

            <div className="bg-gradient-to-br from-blue-700 to-indigo-800 border border-blue-600 p-8 rounded-[2.5rem] shadow-lg text-white flex flex-col justify-between relative overflow-hidden">
               <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full blur-2xl"></div>
               <div className="relative z-10">
                 <h4 className="font-black text-2xl tracking-tight mb-2">Algorithm Status</h4>
                 <p className="text-[10px] uppercase tracking-widest text-blue-200 leading-relaxed">All trading models are currently running normally and scanning markets.</p>
               </div>
            </div>
          </div>
        </div>
      )}

      {activeCategory === 'RISK_MANAGEMENT' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-left-4">
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
              <div className="absolute -top-10 -right-10 text-slate-800 opacity-50"><Lock size={120}/></div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-emerald-400 mb-4"><ShieldCheck size={16}/> <span className="text-[10px] font-black uppercase tracking-widest">Investor Protection Pool</span></div>
                <h3 className="text-3xl font-black tracking-tight mb-1">{formatCurrency(userInsurancePool)}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">Secures user investments against catastrophic loss.</p>
              </div>
            </div>

            <div className="bg-indigo-950 border border-indigo-900 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
              <div className="absolute -top-10 -right-10 text-indigo-900 opacity-50"><Building size={120}/></div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-indigo-400 mb-4"><Activity size={16}/> <span className="text-[10px] font-black uppercase tracking-widest">Corporate Liquidity Pool</span></div>
                <h3 className="text-3xl font-black tracking-tight mb-1">{formatCurrency(companyInsurancePool)}</h3>
                <p className="text-[10px] text-indigo-400/60 font-bold uppercase tracking-widest mb-6">Ensures platform operational continuity.</p>
              </div>
            </div>
          </div>

          <div className="space-y-6 flex flex-col justify-between">
            <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm flex items-center gap-6 h-full">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-100 shrink-0"><Hexagon size={24}/></div>
              <div>
                <h4 className="text-sm font-black text-slate-800">Immutable Audit Trail</h4>
                <p className="text-xs text-slate-500 mt-1 mb-2">All transactions and ownership records are secured.</p>
                <p className="text-[10px] font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block border border-blue-100">{hashRate}</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm flex items-center gap-6 h-full">
              <div className="w-16 h-16 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center border border-slate-200 shrink-0"><Network size={24}/></div>
              <div className="w-full">
                <h4 className="text-sm font-black text-slate-800 mb-1">Reinsurance Partners</h4>
                <p className="text-xs text-slate-500 mb-3">Backed by global institutional partners.</p>
                <div className="flex gap-2">
                   <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-lg">Swiss Re</span>
                   <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-lg">Munich Re</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 🚀 PRIVATE EQUITY EXECUTION MODAL */}
      {investModalItem && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden relative">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center relative z-10 bg-slate-50/50">
              <h3 className="font-black text-lg text-slate-800 tracking-tight uppercase flex items-center gap-2"><Briefcase size={18} className="text-blue-600"/> Invest in Startup</h3>
              <button onClick={() => { !isInvesting && setInvestModalItem(null); setInvestAmount(''); setCurrentStepIndex(-1); setExecutionPlan([]) }} disabled={isInvesting} className="text-slate-400 hover:text-slate-800 transition-colors bg-white p-2 rounded-xl shadow-sm border border-slate-200 disabled:opacity-30">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 relative z-10">
              {isInvesting ? (
                <ExecutionProgressUI />
              ) : (
                <form onSubmit={handlePrivateExecution} className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Company</p>
                        <p className="text-lg font-black text-slate-900">{investModalItem.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-1">AI Score</p>
                        <p className="text-lg font-black text-emerald-600">{investModalItem.deus_score}/100</p>
                      </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2 flex items-center gap-1"><Shield size={12}/> Select Insurance Coverage</label>
                        <select 
                            value={insuranceTier} 
                            onChange={(e) => setInsuranceTier(e.target.value)} 
                            className="w-full bg-blue-50 border border-blue-200 text-blue-900 rounded-xl p-4 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                        >
                            <option value="basic">Standard Coverage (80% Protection)</option>
                            <option value="premium">Premium Coverage (99% Protection)</option>
                        </select>
                    </div>

                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Available Balance</label>
                    <p className="text-xl font-black text-slate-800 mb-4">{formatCurrency(balances.liquid_usd)}</p>

                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Investment Amount (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={investAmount}
                      onChange={(e) => setInvestAmount(e.target.value)}
                      className="w-full bg-white border-2 border-slate-200 rounded-2xl p-5 font-black text-3xl text-slate-800 outline-none focus:border-blue-500 transition-all placeholder:text-slate-300 shadow-inner"
                      placeholder="0.00"
                    />
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={parseFloat(investAmount) > balances.liquid_usd} 
                    className="w-full bg-blue-700 text-white rounded-2xl py-5 font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-600 hover:-translate-y-1 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    Confirm Investment
                  </button>
                </form>
              )}
            </div>
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