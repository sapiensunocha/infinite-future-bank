import { useState } from 'react';
import { 
  TrendingUp, Wallet, Globe, Shield, 
  BarChart3, Zap, Briefcase, ChevronRight 
} from 'lucide-react';

export default function WealthInvest({ balances, profile }) {
  const [activeCategory, setActiveCategory] = useState('YIELD'); // YIELD, MARKETS, ROBO

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

  // Fake live data for presentation
  const marketData = [
    { symbol: 'IFB Global ETP', price: '$142.50', change: '+1.2%', up: true },
    { symbol: 'Swiss Sovereign Bond', price: '$1,020.00', change: '+0.4%', up: true },
    { symbol: 'DEUS Tech Index', price: '$340.10', change: '-0.8%', up: false },
    { symbol: 'Precious Metals (Gold)', price: '$2,145.30', change: '+2.1%', up: true },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      
      {/* 🏛️ Top Header & Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/60 backdrop-blur-2xl border border-white/60 p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/40">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Capital Expansion</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Invested: {formatCurrency(balances.alpha_equity_usd)}</p>
        </div>
        
        <div className="flex bg-white/50 p-2 rounded-2xl border border-white/40 shadow-inner w-full md:w-auto overflow-x-auto">
          {['YIELD', 'MARKETS', 'ROBO'].map((cat) => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}
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
          <div className="bg-white/60 backdrop-blur-2xl border border-white/60 p-10 rounded-[3rem] shadow-xl relative overflow-hidden group">
            <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl group-hover:bg-emerald-400/20 transition-all"></div>
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 mb-6 shadow-inner"><Wallet size={24}/></div>
              <h3 className="text-xl font-black text-slate-800 mb-2">High-Yield Treasury</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-8 leading-relaxed">Earn up to 3.61% p.a. on your liquid savings. Backed by institutional-grade liquidity pools.</p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-4xl font-black text-emerald-500 tracking-tighter">3.61%</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Current APY</p>
                </div>
                <button className="w-12 h-12 bg-slate-900 text-white rounded-full flex items-center justify-center hover:-translate-y-1 transition-transform shadow-lg"><ChevronRight size={20}/></button>
              </div>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-2xl border border-white/60 p-10 rounded-[3rem] shadow-xl relative overflow-hidden group">
            <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-blue-400/10 rounded-full blur-3xl group-hover:bg-blue-400/20 transition-all"></div>
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 mb-6 shadow-inner"><Shield size={24}/></div>
              <h3 className="text-xl font-black text-slate-800 mb-2">Low-Risk Funds</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-8 leading-relaxed">Diversify into government-backed securities and blue-chip corporate bonds for stable preservation.</p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xl font-black text-slate-800 tracking-tight">Capital Preserved</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">0% Loss Ratio (5YR)</p>
                </div>
                <button className="w-12 h-12 bg-slate-900 text-white rounded-full flex items-center justify-center hover:-translate-y-1 transition-transform shadow-lg"><ChevronRight size={20}/></button>
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
              <button key={i} className="bg-white/60 backdrop-blur-2xl border border-white/60 p-6 rounded-[2rem] flex flex-col items-center gap-3 hover:shadow-xl hover:-translate-y-1 transition-all group">
                <div className="p-3 bg-white/50 rounded-xl shadow-inner group-hover:bg-blue-50 transition-colors">
                  {i === 0 && <Globe size={20} className="text-[#4285F4]"/>}
                  {i === 1 && <BarChart3 size={20} className="text-[#34A853]"/>}
                  {i === 2 && <Briefcase size={20} className="text-[#FBBC04]"/>}
                  {i === 3 && <TrendingUp size={20} className="text-[#EA4335]"/>}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">{asset}</span>
              </button>
            ))}
          </div>

          <div className="bg-white/60 backdrop-blur-2xl border border-white/60 rounded-[3rem] p-10 shadow-xl">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-8 flex items-center justify-between">
              Live Market Movers <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </h3>
            <div className="space-y-4">
              {marketData.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-5 border-b border-white/40 last:border-0 hover:bg-white/30 rounded-2xl px-4 transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${item.up ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                      <TrendingUp size={16} className={!item.up ? 'rotate-180' : ''}/>
                    </div>
                    <span className="text-sm font-black text-slate-800">{item.symbol}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-800 tracking-tighter">{item.price}</p>
                    <p className={`text-[10px] font-black tracking-widest ${item.up ? 'text-emerald-500' : 'text-red-500'}`}>{item.change}</p>
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
        <div className="bg-white/60 backdrop-blur-3xl border border-white/60 p-12 rounded-[3.5rem] shadow-2xl shadow-slate-200/40 relative overflow-hidden animate-in slide-in-from-left-4 text-center">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-300/20 blur-[80px]"></div>
          
          <div className="relative z-10 max-w-2xl mx-auto space-y-8">
            <div className="w-24 h-24 bg-slate-900 rounded-[2rem] flex items-center justify-center text-white mx-auto shadow-2xl shadow-slate-900/30">
              <Zap size={40} className="text-blue-400 animate-pulse"/>
            </div>
            
            <div>
              <h3 className="text-3xl font-black text-slate-800 tracking-tight mb-4">Autonomous Portfolio Management</h3>
              <p className="text-sm font-medium text-slate-500 leading-relaxed">
                Allow the DEUS Intelligence Core to build and manage a globally diversified portfolio based strictly on your institutional resilience score and risk tolerance. 
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 py-8 border-y border-white/40">
              <div><p className="text-2xl font-black text-slate-800">Auto</p><p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Rebalancing</p></div>
              <div className="border-x border-white/40"><p className="text-2xl font-black text-slate-800">0.25%</p><p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Mgmt Fee</p></div>
              <div><p className="text-2xl font-black text-slate-800">24/7</p><p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Monitoring</p></div>
            </div>

            <button className="w-full py-6 bg-[#4285F4] text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-blue-500/30 hover:-translate-y-1 transition-all active:scale-95">
              Initialize Robo-Advisor
            </button>
          </div>
        </div>
      )}

    </div>
  );
}