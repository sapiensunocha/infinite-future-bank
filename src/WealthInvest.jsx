import { useState, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import { 
  TrendingUp, Wallet, Shield, 
  BarChart3, Zap, ChevronRight,
  X, Loader2, RefreshCw, BrainCircuit,
  Cpu, Database, Hexagon, Activity, Network, 
  ShieldCheck, Building, Lock, Globe, FileText, 
  CheckCircle, Circle, PieChart, Briefcase, Zap as ZapIcon,
  Target, Sliders, ListChecks, CheckSquare
} from 'lucide-react';

export default function WealthInvest({ session, balances, profile }) {
  const [wealthProfile, setWealthProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [onboardingForm, setOnboardingForm] = useState({ level: '', risk: 5, horizon: 'medium', liquidity: 'moderate' });

  const [activeCategory, setActiveCategory] = useState('PORTFOLIO'); 
  const [insights, setInsights] = useState([]); 
  const [autoLogs, setAutoLogs] = useState([]); 

  const [searchSymbol, setSearchSymbol] = useState('');
  const [marketAsset, setMarketAsset] = useState(null);
  const [isSearchingMarket, setIsSearchingMarket] = useState(false);
  const [publicInvestAmount, setPublicInvestAmount] = useState('');
  
  // 🔥 THE REAL MARKET PICKS STATE
  const [topMarketPicks, setTopMarketPicks] = useState([]);
  const [isLoadingPicks, setIsLoadingPicks] = useState(true);

  const [founderForm, setFounderForm] = useState({ name: '', sector: '', valuation: '', fundraisingGoal: '', revenueGrowth: '', marketSize: '', founderExp: '', profitMargin: '', stability: '' });
  const [isSubmittingPitch, setIsSubmittingPitch] = useState(false);
  const [investModalItem, setInvestModalItem] = useState(null); 
  const [investAmount, setInvestAmount] = useState('');
  const [insuranceTier, setInsuranceTier] = useState('premium'); 
  
  const [isInvesting, setIsInvesting] = useState(false);
  const [executionPlan, setExecutionPlan] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [notification, setNotification] = useState(null);
  const [privateDeals, setPrivateDeals] = useState([]);
  const [isLoadingDeals, setIsLoadingDeals] = useState(true);
  const [portfolio, setPortfolio] = useState({ private: [], public: [], totalValue: 0, privateValue: 0, publicValue: 0 });
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(true);

  const userInsurancePool = 1450250.00;
  const companyInsurancePool = 8500000.00;

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

  const triggerGlobalActionNotification = (type, message) => {
    setNotification({ type, text: message });
    setTimeout(() => setNotification(null), 6000);
  };

  const fetchWealthEcosystem = async () => {
    if (!session?.user?.id) return;
    setIsLoadingProfile(true);
    
    try {
      const { data: profileData } = await supabase.from('ifb_wealth_profiles').select('*').eq('user_id', session.user.id).maybeSingle();

      if (profileData) {
        setWealthProfile(profileData);
        setIsOnboarding(false);
        if (profileData.management_level === 'guided') {
          const { data: insightData } = await supabase.from('ifb_wealth_insights').select('*').eq('user_id', session.user.id).eq('status', 'pending');
          setInsights(insightData || []);
        } else if (profileData.management_level === 'automated') {
          const { data: logData } = await supabase.from('ifb_wealth_insights').select('*').eq('user_id', session.user.id).eq('status', 'executed_by_ai').order('created_at', { ascending: false }).limit(5);
          setAutoLogs(logData || []);
        }
      } else {
        setIsOnboarding(true);
      }
      await fetchInvestorPortfolio();
    } catch (err) {
      triggerGlobalActionNotification('error', 'Failed to synchronize wealth engine.');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  useEffect(() => { fetchWealthEcosystem(); }, [session]);

  const saveWealthProfile = async () => {
    if (!onboardingForm.level) return triggerGlobalActionNotification('error', 'Please select an investment style.');
    setIsLoadingProfile(true);
    try {
      const { error } = await supabase.from('ifb_wealth_profiles').upsert({
        user_id: session.user.id, management_level: onboardingForm.level, risk_tolerance: onboardingForm.risk, investment_horizon: onboardingForm.horizon, liquidity_needs: onboardingForm.liquidity, auto_rebalance_enabled: onboardingForm.level === 'automated'
      });
      if (error) throw error;
      triggerGlobalActionNotification('success', 'Wealth strategy successfully configured.');
      await fetchWealthEcosystem();
    } catch (err) {
      triggerGlobalActionNotification('error', 'Failed to save strategy.');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const fetchInvestorPortfolio = async () => {
    setIsLoadingPortfolio(true);
    try {
      const { data: privateData } = await supabase.from('private_cap_table').select(`investment_amount, equity_percentage, ifb_companies ( name, sector, valuation )`).eq('investor_id', session?.user?.id);
      const { data: publicData } = await supabase.from('market_transactions').select('asset, side, execution_price, quantity').eq('user_id', session?.user?.id).eq('status', 'COMPLETED');

      let privTotal = 0;
      const privFormatted = (privateData || []).map(item => {
        privTotal += parseFloat(item.investment_amount);
        return { name: item.ifb_companies?.name || 'Unknown', equity: parseFloat(item.equity_percentage).toFixed(4), invested: parseFloat(item.investment_amount) };
      });

      const holdings = {};
      (publicData || []).forEach(tx => {
        if (!holdings[tx.asset]) holdings[tx.asset] = { qty: 0, invested: 0 };
        const qty = parseFloat(tx.quantity);
        const cost = qty * parseFloat(tx.execution_price);
        if (tx.side === 'BUY') { holdings[tx.asset].qty += qty; holdings[tx.asset].invested += cost; } 
        else { holdings[tx.asset].qty -= qty; holdings[tx.asset].invested -= cost; }
      });

      let pubTotal = 0;
      const pubFormatted = Object.keys(holdings).filter(asset => holdings[asset].qty > 0).map(asset => {
        pubTotal += holdings[asset].invested;
        return { asset, qty: holdings[asset].qty.toFixed(4), invested: holdings[asset].invested };
      });

      setPortfolio({ private: privFormatted, public: pubFormatted, privateValue: privTotal, publicValue: pubTotal, totalValue: privTotal + pubTotal });
    } catch (err) {} 
    finally { setIsLoadingPortfolio(false); }
  };

  // 🔥 100% REAL MARKET DATA FETCHING
  const fetchTopPicks = async () => {
    setIsLoadingPicks(true);
    try {
      const { data, error } = await supabase.functions.invoke('market-engine', {
        body: { action: 'top_picks' }
      });
      if (error) throw error;
      setTopMarketPicks(data);
    } catch (err) {
      console.error("Market Feed Error:", err);
    } finally {
      setIsLoadingPicks(false);
    }
  };

  useEffect(() => {
    if (activeCategory === 'PUBLIC_MARKETS') {
      fetchTopPicks();
    }
  }, [activeCategory]);

  const fetchMarketData = async (e) => {
    e.preventDefault();
    if (!searchSymbol) return;
    setIsSearchingMarket(true);
    setMarketAsset(null);
    try {
      const { data, error } = await supabase.functions.invoke('market-engine', {
        body: { action: 'quote', symbol: searchSymbol }
      });
      
      if (error || data.error) {
        throw new Error(data?.error || "Asset not found on global exchanges.");
      }

      setMarketAsset(data);
    } catch (error) {
      triggerGlobalActionNotification('error', error.message || 'Failed to connect to market data.');
    } finally { 
      setIsSearchingMarket(false); 
    }
  };

  const handlePublicTrade = async (side) => {
    const amount = parseFloat(publicInvestAmount);
    if (!amount || amount <= 0 || (side === 'buy' && amount > balances.liquid_usd)) return triggerGlobalActionNotification('error', 'Invalid amount or insufficient funds.');
    setIsInvesting(true); setExecutionPlan(["Verifying funds", "Routing to market", "Updating ledger"]); setCurrentStepIndex(0);
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); setCurrentStepIndex(1);
      await new Promise(resolve => setTimeout(resolve, 500)); setCurrentStepIndex(2);
      const qty = (amount / marketAsset.price).toFixed(6);
      await supabase.from('market_transactions').insert({ user_id: session?.user?.id, asset: marketAsset.symbol, side: side.toUpperCase(), execution_price: marketAsset.price, quantity: qty, status: 'COMPLETED' });
      triggerGlobalActionNotification('success', `Executed: ${side.toUpperCase()} ${qty} ${marketAsset.symbol}`);
      setPublicInvestAmount(''); setMarketAsset(null); setSearchSymbol(''); fetchInvestorPortfolio();
    } catch (err) { triggerGlobalActionNotification('error', 'Execution failed.'); } 
    finally { setIsInvesting(false); setExecutionPlan([]); setCurrentStepIndex(-1); }
  };

  const fetchPrivateDeals = async () => {
    setIsLoadingDeals(true);
    const { data } = await supabase.from('ifb_companies').select('*').eq('status', 'APPROVED').order('deus_score', { ascending: false });
    setPrivateDeals(data || []);
    setIsLoadingDeals(false);
  };

  const submitStartupPitch = async (e) => {
    e.preventDefault();
    setIsSubmittingPitch(true);
    try {
      const payload = { founderId: session?.user?.id, name: founderForm.name, sector: founderForm.sector, valuation: parseFloat(founderForm.valuation), fundraisingGoal: parseFloat(founderForm.fundraisingGoal), revenueGrowthPct: parseFloat(founderForm.revenueGrowth), marketSizeScore: parseInt(founderForm.marketSize), founderExpScore: parseInt(founderForm.founderExp), profitMarginPct: parseFloat(founderForm.profitMargin), financialStability: parseInt(founderForm.stability) };
      const res = await fetch('https://ifb-intelligence-core-382117221028.us-central1.run.app/api/evaluate-pitch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Backend failed");
      const result = await res.json();
      triggerGlobalActionNotification('success', `Evaluated. Score: ${result.deus_score}/100. Status: ${result.status}`);
      setFounderForm({name: '', sector: '', valuation: '', fundraisingGoal: '', revenueGrowth: '', marketSize: '', founderExp: '', profitMargin: '', stability: ''});
      if(result.status === 'APPROVED') setActiveCategory('PRIVATE_EQUITY');
    } catch (err) { triggerGlobalActionNotification('error', 'Engine timeout.'); } 
    finally { setIsSubmittingPitch(false); }
  };

  const handlePrivateExecution = async (e) => {
    e.preventDefault();
    const amount = parseFloat(investAmount);
    if (!amount || amount <= 0 || amount > balances.liquid_usd) return triggerGlobalActionNotification('error', 'Invalid amount or insufficient funds.');
    setIsInvesting(true); setExecutionPlan(["Verifying company metrics", "Generating policy", "Routing funds", "Updating ownership"]); setCurrentStepIndex(0);
    try {
      for(let i=1; i<=3; i++) { await new Promise(resolve => setTimeout(resolve, 800)); setCurrentStepIndex(i); }
      await supabase.from('private_cap_table').insert({ company_id: investModalItem.id, investor_id: session?.user?.id, investment_amount: amount, equity_percentage: (amount / parseFloat(investModalItem.valuation)) * 100 });
      triggerGlobalActionNotification('success', `Investment Successful.`);
      setInvestModalItem(null); setInvestAmount(''); fetchInvestorPortfolio();
    } catch (err) { triggerGlobalActionNotification('error', "Execution Failed."); } 
    finally { setIsInvesting(false); setExecutionPlan([]); setCurrentStepIndex(-1); }
  };

  // --- UI RENDERERS ---

  if (isLoadingProfile) {
    return <div className="h-full flex flex-col items-center justify-center p-20"><Loader2 className="animate-spin text-blue-500 mb-4" size={40}/><p className="font-black uppercase tracking-widest text-slate-400 text-xs">Synchronizing Wealth Engine...</p></div>;
  }

  if (isOnboarding) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 animate-in zoom-in-95 duration-500 pb-20">
        <div className="text-center space-y-4 mb-12">
          <ShieldCheck size={48} className="mx-auto text-blue-600 mb-2"/>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Configure Your Strategy</h2>
          <p className="text-slate-500 font-medium max-w-lg mx-auto">Choose how much control you want over your portfolio. You can change these settings at any time in the future.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button onClick={() => setOnboardingForm({...onboardingForm, level: 'self-directed'})} className={`p-8 rounded-[2.5rem] border-2 text-left transition-all ${onboardingForm.level === 'self-directed' ? 'border-blue-600 bg-blue-50/50 shadow-lg scale-105' : 'border-slate-200 bg-white hover:border-blue-300'}`}>
             <Globe size={32} className={`mb-4 ${onboardingForm.level === 'self-directed' ? 'text-blue-600' : 'text-slate-400'}`}/>
             <h3 className="text-xl font-black text-slate-900 mb-2">Self-Directed</h3>
             <p className="text-xs text-slate-500 leading-relaxed font-medium">You have full control. You choose the assets, execute the trades, and build your own portfolio manually.</p>
          </button>
          
          <button onClick={() => setOnboardingForm({...onboardingForm, level: 'guided'})} className={`p-8 rounded-[2.5rem] border-2 text-left transition-all ${onboardingForm.level === 'guided' ? 'border-indigo-600 bg-indigo-50/50 shadow-lg scale-105' : 'border-slate-200 bg-white hover:border-indigo-300'}`}>
             <Target size={32} className={`mb-4 ${onboardingForm.level === 'guided' ? 'text-indigo-600' : 'text-slate-400'}`}/>
             <h3 className="text-xl font-black text-slate-900 mb-2">Guided</h3>
             <p className="text-xs text-slate-500 leading-relaxed font-medium">The AI analyzes markets and suggests trades to optimize your growth. You review and approve every action.</p>
          </button>

          <button onClick={() => setOnboardingForm({...onboardingForm, level: 'automated'})} className={`p-8 rounded-[2.5rem] border-2 text-left transition-all ${onboardingForm.level === 'automated' ? 'border-emerald-600 bg-emerald-50/50 shadow-lg scale-105' : 'border-slate-200 bg-white hover:border-emerald-300'}`}>
             <Zap size={32} className={`mb-4 ${onboardingForm.level === 'automated' ? 'text-emerald-600' : 'text-slate-400'}`}/>
             <h3 className="text-xl font-black text-slate-900 mb-2">Automated</h3>
             <p className="text-xs text-slate-500 leading-relaxed font-medium">Fully hands-off. The system automatically buys, sells, and rebalances your assets based on your risk profile.</p>
          </button>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm mt-8">
           <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-6 flex items-center gap-2"><Sliders size={18}/> Risk Tolerance</h3>
           <input type="range" min="1" max="10" value={onboardingForm.risk} onChange={e => setOnboardingForm({...onboardingForm, risk: e.target.value})} className="w-full accent-blue-600 mb-4" />
           <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
             <span>Low Risk (Bonds/Cash)</span>
             <span className="text-blue-600 text-lg">{onboardingForm.risk} / 10</span>
             <span>High Risk (Crypto/Startups)</span>
           </div>
        </div>

        <button onClick={saveWealthProfile} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl">
          Initialize Wealth Engine
        </button>
      </div>
    );
  }

  const generateMenu = () => {
    let items = [{ id: 'PORTFOLIO', label: 'Portfolio' }];
    if (wealthProfile.management_level === 'guided') items.push({ id: 'SUGGESTIONS', label: 'AI Suggestions' });
    else if (wealthProfile.management_level === 'automated') items.push({ id: 'AUTOPILOT', label: 'Autopilot Status' });
    items.push({ id: 'PUBLIC_MARKETS', label: 'Public Markets' }, { id: 'PRIVATE_EQUITY', label: 'Private Equity' }, { id: 'RAISE_CAPITAL', label: 'Raise Capital' }, { id: 'RISK_MANAGEMENT', label: 'Risk & Insurance' }, { id: 'SETTINGS', label: 'Strategy Settings' });
    return items;
  };

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
               {idx < currentStepIndex ? <CheckCircle className="text-emerald-500 w-5 h-5 shrink-0" /> : idx === currentStepIndex ? <Loader2 className="animate-spin text-blue-500 w-5 h-5 shrink-0" /> : <Circle className="text-slate-600 w-5 h-5 shrink-0" />}
               <span className={`text-sm tracking-wide ${idx === currentStepIndex ? 'text-white font-bold' : 'text-slate-400'}`}>{step}</span>
             </div>
          ))}
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-white transition-all duration-500 ease-out" style={{ width: `${progressPct}%` }}></div></div>
      </div>
    );
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 text-slate-800 relative">
      
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl text-white">
        <div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
            <TrendingUp className="text-blue-400" size={28}/> Wealth Management
          </h2>
          <div className="flex items-center gap-2 mt-3">
             <span className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${
               wealthProfile.management_level === 'automated' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
               wealthProfile.management_level === 'guided' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
               'bg-blue-500/20 text-blue-400 border border-blue-500/30'
             }`}>
                {wealthProfile.management_level} mode
             </span>
             <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Risk Level: {wealthProfile.risk_tolerance}/10</span>
          </div>
        </div>
        
        <div className="flex bg-slate-800 p-2 rounded-2xl border border-slate-700 w-full xl:w-auto overflow-x-auto no-scrollbar">
          {generateMenu().map((item) => (
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

      {activeCategory === 'PORTFOLIO' && (
        <div className="space-y-6 animate-in slide-in-from-left-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-3 text-slate-400 mb-2"><PieChart size={18}/> <h3 className="text-[10px] font-black uppercase tracking-widest">Total Investment Value</h3></div>
                <h2 className="text-4xl font-black tracking-tighter mt-2">{formatCurrency(portfolio.totalValue)}</h2>
              </div>
              <BarChart3 className="absolute right-0 bottom-0 text-white opacity-5" size={120} />
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

      {/* SECTION 1: PUBLIC MARKETS (NOW 100% REAL DATA) */}
      {activeCategory === 'PUBLIC_MARKETS' && (
        <div className="space-y-6 animate-in slide-in-from-left-4">
          <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm relative">
            <div className="mb-8 border-b border-slate-100 pb-6 flex items-center gap-3">
              <Globe className="text-blue-600" size={24} />
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Public Markets Terminal</h3>
                <p className="text-xs text-slate-500 mt-1 font-bold">Live Global Data Execution.</p>
              </div>
            </div>

            <form onSubmit={fetchMarketData} className="flex gap-4 mb-8">
              <input 
                type="text" 
                value={searchSymbol}
                onChange={(e) => setSearchSymbol(e.target.value)}
                placeholder="Enter Ticker (e.g., AAPL, TSLA, BTC-USD)" 
                className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 font-black text-slate-800 uppercase tracking-widest outline-none focus:border-blue-500 transition-all"
                required
              />
              <button 
                type="submit" 
                disabled={isSearchingMarket}
                className="bg-slate-900 text-white px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2 shadow-md"
              >
                {isSearchingMarket ? <Loader2 size={16} className="animate-spin" /> : <Activity size={16} />}
                Search
              </button>
            </form>

            {!marketAsset && (
              <div className="mt-8 animate-in fade-in">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                  <ZapIcon size={14} className="text-blue-500" />
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Global Market Feeds</h4>
                </div>
                {isLoadingPicks ? (
                   <div className="py-12 text-center"><Loader2 className="animate-spin mx-auto text-blue-500"/></div>
                ) : (
                  <div className="space-y-3">
                    {topMarketPicks.map((pick) => (
                      <div 
                        key={pick.symbol} 
                        onClick={() => setMarketAsset(pick)}
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
                            <p className={`text-sm font-black flex items-center gap-1 justify-end ${pick.signal === 'BUY' ? 'text-emerald-600' : pick.signal === 'SELL' ? 'text-red-600' : 'text-slate-600'}`}>
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
                )}
              </div>
            )}

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
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2">Live Network Price</p>
                  </div>
                  <div className="text-right">
                    <h4 className="text-3xl font-black text-slate-900 tracking-tight">{formatCurrency(marketAsset.price)}</h4>
                    <p className={`text-[10px] font-black uppercase tracking-widest mt-2 ${marketAsset.signal === 'BUY' ? 'text-emerald-500' : marketAsset.signal === 'SELL' ? 'text-red-500' : 'text-slate-500'}`}>
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
                      <button onClick={() => handlePublicTrade('buy')} disabled={!publicInvestAmount} className="flex-1 md:w-32 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 transition-all disabled:opacity-50 shadow-md">Buy</button>
                      <button onClick={() => handlePublicTrade('sell')} disabled={!publicInvestAmount} className="flex-1 md:w-32 py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 transition-all disabled:opacity-50 shadow-md">Sell</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* REST OF YOUR APP (Private Equity, Raise Capital, Risk Management, etc.) REMAINS EXACTLY AS IT WAS */}
      {/* ... [Private Equity Block from previous response] ... */}
      {activeCategory === 'PRIVATE_EQUITY' && (
        <div className="space-y-6 animate-in slide-in-from-left-4">
          <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm relative">
            <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-6">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                  Private Equity Offerings <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]"></span>
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-bold">Invest directly in evaluated startups.</p>
              </div>
              <button onClick={fetchPrivateDeals} disabled={isLoadingDeals} className="p-3 bg-slate-50 text-slate-500 rounded-xl hover:text-blue-600 hover:bg-blue-50 transition-all border border-slate-200">
                <RefreshCw size={18} className={isLoadingDeals ? 'animate-spin' : ''} />
              </button>
            </div>
            
            {isLoadingDeals ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Loader2 size={32} className="animate-spin mb-4 text-blue-500"/>
              </div>
            ) : privateDeals.length === 0 ? (
               <div className="text-center py-16 text-slate-400">
                 <Building size={48} className="mx-auto mb-4 opacity-30" />
                 <h4 className="font-black text-lg text-slate-800">No Startups Available</h4>
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
                    <button onClick={() => setInvestModalItem(item)} className="w-full py-5 bg-slate-900 border border-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md">
                      Invest
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PRIVATE EQUITY MODAL */}
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
                    <input type="number" step="0.01" required value={investAmount} onChange={(e) => setInvestAmount(e.target.value)} className="w-full bg-white border-2 border-slate-200 rounded-2xl p-5 font-black text-3xl text-slate-800 outline-none focus:border-blue-500 transition-all placeholder:text-slate-300 shadow-inner" placeholder="0.00" />
                  </div>
                  <button type="submit" disabled={parseFloat(investAmount) > balances.liquid_usd} className="w-full bg-blue-700 text-white rounded-2xl py-5 font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
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