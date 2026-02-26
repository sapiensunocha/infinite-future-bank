import { useState } from 'react';
import { supabase } from './services/supabaseClient';
import { 
  TrendingUp, Wallet, Globe, Shield, 
  BarChart3, Zap, Briefcase, ChevronRight,
  X, Loader2
} from 'lucide-react';

export default function WealthInvest({ session, balances, profile }) {
  const [activeCategory, setActiveCategory] = useState('YIELD'); // YIELD, MARKETS, ROBO

  // Investment Allocation States
  const [investModalItem, setInvestModalItem] = useState(null); // { name: 'Asset Name' }
  const [investAmount, setInvestAmount] = useState('');
  const [isInvesting, setIsInvesting] = useState(false);
  const [notification, setNotification] = useState(null);

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

  // Fake live data for presentation
  const marketData = [
    { symbol: 'IFB Global ETP', price: '$142.50', change: '+1.2%', up: true },
    { symbol: 'Swiss Sovereign Bond', price: '$1,020.00', change: '+0.4%', up: true },
    { symbol: 'DEUS Tech Index', price: '$340.10', change: '-0.8%', up: false },
    { symbol: 'Precious Metals (Gold)', price: '$2,145.30', change: '+2.1%', up: true },
  ];

  const handleExecuteInvestment = async (e) => {
    e.preventDefault();
    if (!investAmount || investAmount <= 0) return;
    setIsInvesting(true);

    try {
      const { error } = await supabase.rpc('execute_investment', {
        p_user_id: session.user.id,
        p_amount: parseFloat(investAmount),
        p_asset_name: investModalItem.name
      });

      if (error) throw error;

      setNotification({ type: 'success', text: `Successfully allocated ${formatCurrency(investAmount)} to ${investModalItem.name}.` });
      setTimeout(() => setNotification(null), 5000);
      
      setInvestModalItem(null);
      setInvestAmount('');

    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', text: err.message || "Failed to execute investment." });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsInvesting(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 text-slate-800 relative">
      
      {/* 🏛️ Top Header & Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white border border-slate-200 p-6 rounded-[2.5rem] shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Capital Expansion</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mt-1">Total Invested: {formatCurrency(balances.alpha_equity_usd)}</p>
        </div>
        
        <div className="flex bg-slate-100 p-2 rounded-2xl border border-slate-200 shadow-inner w-full md:w-auto overflow-x-auto no-scrollbar">
          {['YIELD', 'MARKETS', 'ROBO'].map((cat) => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 📈 DYNAMIC CONTENT AREA */}
      
      {/* SECTION 1: YIELD & SAVINGS */}
      {activeCategory === 'YIELD' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-left-4">
          <div className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-sm relative overflow-hidden group hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer">
            <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-emerald-50 rounded-full blur-3xl group-hover:bg-emerald-100 transition-all pointer-events-none"></div>
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-6"><Wallet size={24}/></div>
              <h3 className="text-xl font-black text-slate-800 mb-2">High-Yield Treasury</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-8 leading-relaxed">Earn up to 3.61% p.a. on your liquid savings. Backed by institutional-grade liquidity pools.</p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-4xl font-black text-emerald-600 tracking-tighter">3.61%</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Current APY</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setInvestModalItem({ name: 'IFB High-Yield Treasury' }); }} className="w-12 h-12 bg-slate-50 border border-slate-200 text-slate-600 rounded-full flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm"><ChevronRight size={20}/></button>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-sm relative overflow-hidden group hover:shadow-md hover:border-blue-200 transition-all cursor-pointer">
            <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-blue-50 rounded-full blur-3xl group-hover:bg-blue-100 transition-all pointer-events-none"></div>
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-6"><Shield size={24}/></div>
              <h3 className="text-xl font-black text-slate-800 mb-2">Low-Risk Funds</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-8 leading-relaxed">Diversify into government-backed securities and blue-chip corporate bonds for stable preservation.</p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xl font-black text-slate-800 tracking-tight">Capital Preserved</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">0% Loss Ratio (5YR)</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setInvestModalItem({ name: 'Swiss Sovereign Bond' }); }} className="w-12 h-12 bg-slate-50 border border-slate-200 text-slate-600 rounded-full flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"><ChevronRight size={20}/></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: MARKETS (Stocks, ETPs, Bonds) */}
      {activeCategory === 'MARKETS' && (
        <div className="space-y-8 animate-in slide-in-from-left-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Stocks', 'ETPs', 'Bonds', 'Commodities'].map((asset, i) => (
              <button key={i} className="bg-white border border-slate-200 p-6 rounded-[2rem] flex flex-col items-center gap-3 hover:bg-slate-50 hover:border-slate-300 transition-all group shadow-sm hover:shadow-md">
                <div className="p-3 bg-slate-100 rounded-xl shadow-inner border border-slate-200 group-hover:bg-white group-hover:border-blue-200 transition-colors">
                  {i === 0 && <Globe size={20} className="text-blue-500"/>}
                  {i === 1 && <BarChart3 size={20} className="text-emerald-500"/>}
                  {i === 2 && <Briefcase size={20} className="text-indigo-500"/>}
                  {i === 3 && <TrendingUp size={20} className="text-amber-500"/>}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">{asset}</span>
              </button>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-8 flex items-center justify-between">
              Live Market Movers <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-sm"></span>
            </h3>
            <div className="space-y-4">
              {marketData.map((item, i) => (
                <div 
                  key={i} 
                  onClick={() => setInvestModalItem({ name: item.symbol })}
                  className="flex items-center justify-between py-5 border-b border-slate-100 last:border-0 hover:bg-slate-50 rounded-2xl px-4 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm ${item.up ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-500 border-red-100'}`}>
                      <TrendingUp size={16} className={!item.up ? 'rotate-180' : ''}/>
                    </div>
                    <span className="text-sm font-black text-slate-800 group-hover:text-blue-600 transition-colors">{item.symbol}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-800 tracking-tighter">{item.price}</p>
                    <p className={`text-[10px] font-black tracking-widest ${item.up ? 'text-emerald-600' : 'text-red-500'}`}>{item.change}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-8 text-center italic">CFDs are complex instruments and come with a high risk of losing money rapidly due to leverage.</p>
          </div>
        </div>
      )}

      {/* SECTION 3: ROBO-ADVISOR */}
      {activeCategory === 'ROBO' && (
        <div className="bg-gradient-to-b from-slate-50 to-white border border-slate-200 p-12 rounded-[3.5rem] shadow-sm relative overflow-hidden animate-in slide-in-from-left-4 text-center">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-50 blur-[80px] pointer-events-none"></div>
          
          <div className="relative z-10 max-w-2xl mx-auto space-y-8">
            <div className="w-24 h-24 bg-white border border-indigo-100 rounded-[2rem] flex items-center justify-center text-indigo-500 mx-auto shadow-sm">
              <Zap size={40} className="text-indigo-500 animate-pulse"/>
            </div>
            
            <div>
              <h3 className="text-3xl font-black text-slate-800 tracking-tight mb-4">Autonomous Portfolio Management</h3>
              <p className="text-sm font-medium text-slate-500 leading-relaxed">
                Allow the DEUS Intelligence Core to build and manage a globally diversified portfolio based strictly on your institutional resilience score and risk tolerance. 
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 py-8 border-y border-slate-200">
              <div><p className="text-2xl font-black text-slate-800">Auto</p><p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Rebalancing</p></div>
              <div className="border-x border-slate-200"><p className="text-2xl font-black text-slate-800">0.25%</p><p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Mgmt Fee</p></div>
              <div><p className="text-2xl font-black text-slate-800">24/7</p><p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Monitoring</p></div>
            </div>

            <button 
              onClick={() => setInvestModalItem({ name: 'Robo-Advisor Allocation' })}
              className="w-full py-6 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg hover:bg-blue-700 hover:-translate-y-1 transition-all active:scale-95"
            >
              Initialize Robo-Advisor
            </button>
          </div>
        </div>
      )}

      {/* 🚀 ALLOCATION MODAL */}
      {investModalItem && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden relative border border-slate-100">
            
            <div className="p-6 border-b border-slate-100 flex justify-between items-center relative z-10 bg-slate-50/50">
              <h3 className="font-black text-lg text-slate-800 tracking-tight uppercase">Capital Allocation</h3>
              <button onClick={() => { setInvestModalItem(null); setInvestAmount(''); }} className="text-slate-400 hover:text-slate-800 transition-colors bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleExecuteInvestment} className="p-8 space-y-6 relative z-10">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Target Asset</p>
                <p className="text-lg font-black text-blue-600 mb-6">{investModalItem.name}</p>

                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Available Liquidity</label>
                <p className="text-xl font-black text-slate-800 mb-6">{formatCurrency(balances.liquid_usd)}</p>

                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 text-left">Investment Amount (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={investAmount}
                  onChange={(e) => setInvestAmount(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 font-black text-4xl text-center text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-300 shadow-inner"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              
              <button 
                type="submit" 
                disabled={isInvesting || parseFloat(investAmount) > balances.liquid_usd} 
                className="w-full bg-blue-600 text-white rounded-2xl py-5 font-black text-xs uppercase tracking-widest shadow-lg hover:bg-blue-700 hover:-translate-y-1 transition-all disabled:opacity-50 flex items-center justify-center"
              >
                {isInvesting ? <Loader2 className="animate-spin" size={18} /> : 'EXECUTE MARKET ORDER'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 🟢 IN-APP NOTIFICATION */}
      {notification && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[300] animate-in slide-in-from-top-4 fade-in duration-300">
          <div className={`px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl flex items-center gap-3 ${
            notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-red-500/10 border-red-500/20 text-red-600'
          }`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${notification.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
            <p className="font-black text-sm uppercase tracking-widest">{notification.text}</p>
          </div>
        </div>
      )}

    </div>
  );
}