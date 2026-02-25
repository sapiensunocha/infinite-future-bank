import { useState } from 'react';
import { 
  Target, TrendingUp, ShieldCheck, 
  Map, SlidersHorizontal, ArrowRight,
  Briefcase, Landmark, Sparkles
} from 'lucide-react';

export default function FinancialPlanner({ balances }) {
  const [activeGoal, setActiveGoal] = useState('INDEPENDENCE'); // INDEPENDENCE, ACQUISITION, PRESERVATION
  const [horizon, setHorizon] = useState(10); // Years
  const [contribution, setContribution] = useState(5000); // Monthly

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);

  // Simplified Compound Interest Calculator for UI projection
  const baseCapital = (balances?.liquid_usd || 0) + (balances?.alpha_equity_usd || 0);
  const annualRate = activeGoal === 'PRESERVATION' ? 0.04 : activeGoal === 'INDEPENDENCE' ? 0.08 : 0.12;
  const projectedTotal = baseCapital * Math.pow((1 + annualRate), horizon) + (contribution * 12) * ((Math.pow((1 + annualRate), horizon) - 1) / annualRate);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      
      {/* 🏛️ Top Header & Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/60 backdrop-blur-2xl border border-white/60 p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/40">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Scenario Architect</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Autonomous Wealth Projection Engine</p>
        </div>
        
        <div className="flex bg-white/50 p-2 rounded-2xl border border-white/40 shadow-inner w-full md:w-auto overflow-x-auto">
          {[
            { id: 'INDEPENDENCE', label: 'Financial Independence' },
            { id: 'ACQUISITION', label: 'Asset Acquisition' },
            { id: 'PRESERVATION', label: 'Capital Preservation' }
          ].map((goal) => (
            <button 
              key={goal.id}
              onClick={() => setActiveGoal(goal.id)}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeGoal === goal.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {goal.label}
            </button>
          ))}
        </div>
      </div>

      {/* 📈 PROJECTION MATRIX */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-left-4">
        
        {/* Left Column: Interactive Sliders */}
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-white/60 backdrop-blur-2xl border border-white/60 p-8 rounded-[3rem] shadow-xl">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-8 flex items-center gap-2"><SlidersHorizontal size={18} className="text-[#4285F4]"/> Parameters</h3>
            
            <div className="space-y-8">
              {/* Horizon Slider */}
              <div>
                <div className="flex justify-between items-end mb-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Time Horizon</label>
                  <span className="text-xl font-black text-slate-800">{horizon} Years</span>
                </div>
                <input 
                  type="range" min="1" max="40" value={horizon} 
                  onChange={(e) => setHorizon(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#4285F4]"
                />
              </div>

              {/* Contribution Slider */}
              <div>
                <div className="flex justify-between items-end mb-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Monthly Inflow</label>
                  <span className="text-xl font-black text-slate-800">{formatCurrency(contribution)}</span>
                </div>
                <input 
                  type="range" min="0" max="50000" step="500" value={contribution} 
                  onChange={(e) => setContribution(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#34A853]"
                />
              </div>
            </div>

            <div className="mt-10 p-5 bg-blue-50/50 rounded-2xl border border-blue-100">
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 flex items-center gap-1"><Target size={12}/> Target Strategy</p>
              <p className="text-xs font-bold text-slate-600 leading-relaxed">
                {activeGoal === 'INDEPENDENCE' && 'Optimized for aggressive compounding and global equity exposure.'}
                {activeGoal === 'ACQUISITION' && 'Optimized for high liquidity events and structured credit leveraging.'}
                {activeGoal === 'PRESERVATION' && 'Optimized for sovereign bonds, Swiss safe-havens, and inflation hedging.'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Visualization & AI Insights */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Main Visualization */}
          <div className="bg-slate-900 text-white p-10 md:p-12 rounded-[3rem] shadow-2xl relative overflow-hidden group">
            <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-[80px] group-hover:bg-blue-500/30 transition-all"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-8 mb-12">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">Projected Sovereign Wealth</p>
                <h3 className="text-5xl md:text-6xl font-black tracking-tighter">{formatCurrency(projectedTotal)}</h3>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">Target Year</p>
                <h3 className="text-3xl font-black tracking-tighter text-[#4285F4]">{new Date().getFullYear() + horizon}</h3>
              </div>
            </div>

            {/* Simulated Growth Chart (Visual CSS Representation) */}
            <div className="relative h-40 w-full flex items-end justify-between gap-1 z-10 opacity-80">
              {[...Array(20)].map((_, i) => {
                const stepGrowth = Math.pow((i / 19), 2); // Exponential curve
                const height = 20 + (stepGrowth * 80); 
                return (
                  <div key={i} className="w-full bg-blue-500/30 rounded-t-sm hover:bg-blue-400 transition-colors" style={{ height: `${height}%` }}></div>
                );
              })}
              {/* Overlay Gradient for smooth finish */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent pointer-events-none"></div>
            </div>
          </div>

          {/* AI Advisor Context Panel */}
          <div className="bg-white/60 backdrop-blur-2xl border border-white/60 p-8 rounded-[3rem] shadow-xl flex flex-col md:flex-row items-center gap-6">
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
              <Sparkles size={28}/>
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-800 flex items-center gap-2 mb-2">DEUS Intelligence Insight</h4>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                To achieve your {horizon}-year target of {formatCurrency(projectedTotal)}, DEUS recommends routing {formatCurrency(contribution * 0.4)} into Swiss Treasury Bonds and {formatCurrency(contribution * 0.6)} into the Alpha Equity pool to minimize jurisdictional tax friction.
              </p>
            </div>
            <button className="w-full md:w-auto mt-4 md:mt-0 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:-translate-y-1 transition-transform whitespace-nowrap">
              Apply Routing
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}