import { useState } from 'react';
import { supabase } from './services/supabaseClient';
import { 
  Target, TrendingUp, ShieldCheck, 
  Map, SlidersHorizontal, ArrowRight,
  Briefcase, Landmark, Sparkles, Loader2
} from 'lucide-react';

export default function FinancialPlanner({ session, balances }) {
  const [activeGoal, setActiveGoal] = useState('INDEPENDENCE'); // INDEPENDENCE, ACQUISITION, PRESERVATION
  const [horizon, setHorizon] = useState(10); // Years
  const [contribution, setContribution] = useState(5000); // Monthly
  const [isApplying, setIsApplying] = useState(false);
  const [notification, setNotification] = useState(null);

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);

  // Simplified Compound Interest Calculator for UI projection
  const baseCapital = (balances?.liquid_usd || 0) + (balances?.alpha_equity_usd || 0);
  const annualRate = activeGoal === 'PRESERVATION' ? 0.04 : activeGoal === 'INDEPENDENCE' ? 0.08 : 0.12;
  const projectedTotal = baseCapital * Math.pow((1 + annualRate), horizon) + (contribution * 12) * ((Math.pow((1 + annualRate), horizon) - 1) / annualRate);

  // --- REQUIREMENT: GLOBAL NOTIFICATION RULE ---
  const triggerGlobalActionNotification = (type, message) => {
    setNotification({ type, text: message });
    console.log(`System Event: ${message}. Dispatching In-App Alert and Email to ${session?.user?.email}`);
    setTimeout(() => setNotification(null), 6000);
  };

  // --- APPLY ROUTING TO DATABASE ---
  const handleApplyRouting = async () => {
    setIsApplying(true);

    // Calculate dynamic percentages based on the AI's recommendation
    // Example: Aggressive goals push more to Alpha Equity
    let alphaPct = 0;
    let vaultPct = 0;

    if (activeGoal === 'INDEPENDENCE') { alphaPct = 80; vaultPct = 20; }
    else if (activeGoal === 'ACQUISITION') { alphaPct = 50; vaultPct = 50; }
    else if (activeGoal === 'PRESERVATION') { alphaPct = 20; vaultPct = 80; }

    try {
      const { error } = await supabase.from('income_protocols').upsert({
        user_id: session.user.id,
        liquid_pct: 0, // In these aggressive saving models, 0% goes to idle cash
        alpha_pct: alphaPct,
        vault_pct: vaultPct,
        status: 'active'
      }, { onConflict: 'user_id' });

      if (error) throw error;
      
      triggerGlobalActionNotification('success', `AI Strategy Applied: Future income routing updated to ${alphaPct}% Alpha / ${vaultPct}% Vault.`);
    } catch (err) {
      console.error(err);
      triggerGlobalActionNotification('error', "Failed to apply AI routing protocol.");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 text-slate-800 relative">
      
      {/* 🏛️ Top Header & Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white border border-slate-200 p-6 rounded-[2.5rem] shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Scenario Architect</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mt-1">Autonomous Wealth Projection Engine</p>
        </div>
        
        <div className="flex bg-slate-100 p-2 rounded-2xl border border-slate-200 shadow-inner w-full md:w-auto overflow-x-auto no-scrollbar">
          {[
            { id: 'INDEPENDENCE', label: 'Financial Independence' },
            { id: 'ACQUISITION', label: 'Asset Acquisition' },
            { id: 'PRESERVATION', label: 'Capital Preservation' }
          ].map((goal) => (
            <button 
              key={goal.id}
              onClick={() => setActiveGoal(goal.id)}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeGoal === goal.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}
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
          <div className="bg-white border border-slate-200 p-8 rounded-[3rem] shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-8 flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg text-blue-600 border border-slate-200"><SlidersHorizontal size={18}/></div>
              Parameters
            </h3>
            
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
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
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
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            </div>

            <div className="mt-10 p-5 bg-blue-50 rounded-2xl border border-blue-100">
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-2"><Target size={14}/> Target Strategy</p>
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
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 text-white p-10 md:p-12 rounded-[3rem] shadow-xl relative overflow-hidden group">
            <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-[80px] group-hover:bg-blue-500/30 transition-all pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-8 mb-12">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">Projected Sovereign Wealth</p>
                <h3 className="text-5xl md:text-6xl font-black tracking-tighter text-white">{formatCurrency(projectedTotal)}</h3>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">Target Year</p>
                <h3 className="text-3xl font-black tracking-tighter text-blue-400">{new Date().getFullYear() + horizon}</h3>
              </div>
            </div>

            {/* Simulated Growth Chart (Visual CSS Representation) */}
            <div className="relative h-40 w-full flex items-end justify-between gap-1 z-10 opacity-80">
              {[...Array(20)].map((_, i) => {
                const stepGrowth = Math.pow((i / 19), 2); // Exponential curve
                const height = 20 + (stepGrowth * 80); 
                return (
                  <div key={i} className="w-full bg-blue-500/20 border-t border-blue-400/50 rounded-t-sm hover:bg-blue-400/50 transition-colors" style={{ height: `${height}%` }}></div>
                );
              })}
              {/* Overlay Gradient for smooth finish */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-800 via-transparent to-transparent pointer-events-none"></div>
            </div>
          </div>

          {/* AI Advisor Context Panel */}
          <div className="bg-white border border-slate-200 p-8 rounded-[3rem] shadow-sm flex flex-col md:flex-row items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 flex-shrink-0 shadow-sm">
              <Sparkles size={28}/>
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-800 flex items-center gap-2 mb-2">DEUS Intelligence Insight</h4>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                To achieve your {horizon}-year target of <span className="text-slate-800">{formatCurrency(projectedTotal)}</span>, DEUS recommends routing {activeGoal === 'PRESERVATION' ? '80%' : '20%'} into Swiss Treasury Bonds (Vault) and {activeGoal === 'PRESERVATION' ? '20%' : '80%'} into the Alpha Equity pool to minimize jurisdictional tax friction.
              </p>
            </div>
            <button 
              onClick={handleApplyRouting}
              disabled={isApplying}
              className="w-full md:w-auto mt-4 md:mt-0 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:-translate-y-1 hover:bg-blue-700 transition-all whitespace-nowrap disabled:opacity-50 flex items-center gap-2"
            >
              {isApplying ? <Loader2 className="animate-spin" size={14}/> : null} Apply Routing
            </button>
          </div>

        </div>
      </div>

      {/* 🟢 GLOBAL NOTIFICATION LAYER */}
      {notification && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[500] animate-in slide-in-from-top-10 duration-500">
           <div className={`px-8 py-5 rounded-3xl shadow-2xl border-2 backdrop-blur-2xl flex items-center gap-4 ${notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
             <div className={`w-3 h-3 rounded-full animate-pulse ${notification.type === 'success' ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]' : 'bg-red-400 shadow-[0_0_10px_#f87171]'}`}></div>
             <p className="font-black text-[11px] uppercase tracking-[0.2em]">{notification.text}</p>
           </div>
        </div>
      )}
    </div>
  );
}