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
      // Execute the secure database transaction we just built
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
      // The WebSocket in Dashboard.jsx will auto-refresh the UI and increase Alpha Equity!

    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', text: err.message || "Failed to execute investment." });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsInvesting(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 text-white relative">
      
      {/* 🏛️ Top Header & Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/5 backdrop-blur-2xl border border-white/10 p-6 rounded-[2.5rem] shadow-glass">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Capital Expansion</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-ifb-primary mt-1">Total Invested: {formatCurrency(balances.alpha_equity_usd)}</p>
        </div>
        
        <div className="flex bg-black/40 p-2 rounded-2xl border border-white/5 shadow-inner w-full md:w-auto overflow-x-auto custom-scrollbar">
          {['YIELD', 'MARKETS', 'ROBO'].map((cat) => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-ifb-primary text-white shadow-glow-blue' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
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
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-10 rounded-[3rem] shadow-glass relative overflow-hidden group hover:border-ifb-success/30 transition-colors">
            <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-ifb-success/10 rounded-full blur-3xl group-hover:bg-ifb-success/20 transition-all pointer-events-none"></div>
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-ifb-success/20 border border-ifb-success/30 flex items-center justify-center text-ifb-success mb-6 shadow-glow"><Wallet size={24}/></div>
              <h3 className="text-xl font-black text-white mb-2">High-Yield Treasury</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8 leading-relaxed">Earn up to 3.61% p.a. on your liquid savings. Backed by institutional-grade liquidity pools.</p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-4xl font-black text-ifb-success tracking-tighter">3.61%</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">Current APY</p>
                </div>
                <button onClick={() => setInvestModalItem({ name: 'IFB High-Yield Treasury' })} className="w-12 h-12 bg-white/10 border border-white/20 text-white rounded-full flex items-center justify-center hover:bg-ifb-success hover:text-[#0B0F19] transition-all shadow-glass"><ChevronRight size={20}/></button>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-10 rounded-[3rem] shadow-glass relative overflow-hidden group hover:border-ifb-primary/30 transition-colors">
            <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-ifb-primary/10 rounded-full blur-3xl group-hover:bg-ifb-primary/20 transition-all pointer-events-none"></div>
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-ifb-primary/20 border border-ifb-primary/30 flex items-center justify-center text-ifb-primary mb-6 shadow-glow-blue"><Shield size={24}/></div>
              <h3 className="text-xl font-black text-white mb-2">Low-Risk Funds</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8 leading-relaxed">Diversify into government-backed securities and blue-chip corporate bonds for stable preservation.</p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xl font-black text-white tracking-tight">Capital Preserved</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">0% Loss Ratio (5YR)</p>
                </div>
                <button onClick={() => setInvestModalItem({ name: 'Swiss Sovereign Bond' })} className="w-12 h-12 bg-white/10 border border-white/20 text-white rounded-full flex items-center justify-center hover:bg-ifb-primary hover:text-white transition-all shadow-glass"><ChevronRight size={20}/></button>
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
              <button key={i} className="bg-white/5 backdrop-blur-2xl border border-white/10 p-6 rounded-[2rem] flex flex-col items-center gap-3 hover:bg-white/10 hover:border-white/20 transition-all group shadow-glass">
                <div className="p-3 bg-black/40 rounded-xl shadow-inner border border-white/5 group-hover:border-ifb-primary/30 transition-colors">
                  {i === 0 && <Globe size={20} className="text-ifb-logoI"/>}
                  {i === 1 && <BarChart3 size={20} className="text-ifb-success"/>}
                  {i === 2 && <Briefcase size={20} className="text-ifb-logoB"/>}
                  {i === 3 && <TrendingUp size={20} className="text-ifb-logoF"/>}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{asset}</span>
              </button>
            ))}
          </div>

          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-10 shadow-glass">
            <h3 className="text-sm font-black uppercase tracking-widest text-white mb-8 flex items-center justify-between">
              Live Market Movers <span className="w-2 h-2 rounded-full bg-ifb-success animate-pulse shadow-glow"></span>
            </h3>
            <div className="space-y-4">
              {marketData.map((item, i) => (
                <div 
                  key={i} 
                  onClick={() => setInvestModalItem({ name: item.symbol })}
                  className="flex items-center justify-between py-5 border-b border-white/10 last:border-0 hover:bg-white/5 rounded-2xl px-4 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-inner ${item.up ? 'bg-ifb-success/10 text-ifb-success border-ifb-success/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                      <TrendingUp size={16} className={!item.up ? 'rotate-180' : ''}/>
                    </div>
                    <span className="text-sm font-black text-white group-hover:text-ifb-primary transition-colors">{item.symbol}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-white tracking-tighter">{item.price}</p>
                    <p className={`text-[10px] font-black tracking-widest ${item.up ? 'text-ifb-success' : 'text-red-400'}`}>{item.change}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-8 text-center italic">CFDs are complex instruments and come with a high risk of losing money rapidly due to leverage.</p>
          </div>
        </div>
      )}

      {/* SECTION 3: ROBO-ADVISOR */}
      {activeCategory === 'ROBO' && (
        <div className="bg-gradient-to-b from-white/5 to-transparent backdrop-blur-3xl border border-white/10 p-12 rounded-[3.5rem] shadow-glass relative overflow-hidden animate-in slide-in-from-left-4 text-center">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-ifb-accent/10 blur-[80px] pointer-events-none"></div>
          
          <div className="relative z-10 max-w-2xl mx-auto space-y-8">
            <div className="w-24 h-24 bg-black/50 border border-ifb-accent/30 rounded-[2rem] flex items-center justify-center text-white mx-auto shadow-glow">
              <Zap size={40} className="text-ifb-accent animate-pulse"/>
            </div>
            
            <div>
              <h3 className="text-3xl font-black text-white tracking-tight mb-4">Autonomous Portfolio Management</h3>
              <p className="text-sm font-medium text-slate-400 leading-relaxed">
                Allow the DEUS Intelligence Core to build and manage a globally diversified portfolio based strictly on your institutional resilience score and risk tolerance. 
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 py-8 border-y border-white/10">
              <div><p className="text-2xl font-black text-white">Auto</p><p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-1">Rebalancing</p></div>
              <div className="border-x border-white/10"><p className="text-2xl font-black text-white">0.25%</p><p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-1">Mgmt Fee</p></div>
              <div><p className="text-2xl font-black text-white">24/7</p><p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-1">Monitoring</p></div>
            </div>

            <button 
              onClick={() => setInvestModalItem({ name: 'Robo-Advisor Allocation' })}
              className="w-full py-6 bg-ifb-primary text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-glow-blue hover:bg-blue-600 hover:-translate-y-1 transition-all active:scale-95 border border-blue-400/30"
            >
              Initialize Robo-Advisor
            </button>
          </div>
        </div>
      )}

      {/* 🚀 ALLOCATION MODAL */}
      {investModalItem && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#0B0F19] rounded-3xl w-full max-w-md shadow-glass overflow-hidden relative border border-white/10">
            <div className="absolute inset-0 bg-gradient-to-br from-ifb-success/10 to-transparent pointer-events-none"></div>
            
            <div className="p-6 border-b border-white/10 flex justify-between items-center relative z-10">
              <h3 className="font-black text-lg text-white tracking-tight uppercase">Capital Allocation</h3>
              <button onClick={() => { setInvestModalItem(null); setInvestAmount(''); }} className="text-slate-400 hover:text-white transition-colors bg-white/5 p-2 rounded-xl border border-white/10">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleExecuteInvestment} className="p-8 space-y-6 relative z-10">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Target Asset</p>
                <p className="text-lg font-black text-ifb-success mb-6">{investModalItem.name}</p>

                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Available Liquidity</label>
                <p className="text-xl font-black text-white mb-6">{formatCurrency(balances.liquid_usd)}</p>

                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 text-left">Investment Amount (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={investAmount}
                  onChange={(e) => setInvestAmount(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-2xl p-6 font-black text-4xl text-center text-white outline-none focus:border-ifb-success transition-all placeholder:text-slate-600"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              
              <button 
                type="submit" 
                disabled={isInvesting || parseFloat(investAmount) > balances.liquid_usd} 
                className="w-full bg-ifb-success text-[#0B0F19] rounded-2xl py-5 font-black text-xs uppercase tracking-widest shadow-glow hover:bg-emerald-400 hover:-translate-y-1 transition-all disabled:opacity-50 flex items-center justify-center"
              >
                {isInvesting ? <Loader2 className="animate-spin text-[#0B0F19]" size={18} /> : 'EXECUTE MARKET ORDER'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 🟢 IN-APP NOTIFICATION */}
      {notification && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[300] animate-in slide-in-from-top-4 fade-in duration-300">
          <div className={`px-6 py-4 rounded-2xl shadow-glass border backdrop-blur-2xl flex items-center gap-3 ${
            notification.type === 'success' ? 'bg-ifb-success/10 border-ifb-success/30 text-ifb-success' : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${notification.type === 'success' ? 'bg-ifb-success' : 'bg-red-400'}`}></div>
            <p className="font-black text-sm uppercase tracking-widest">{notification.text}</p>
          </div>
        </div>
      )}

    </div>
  );
}