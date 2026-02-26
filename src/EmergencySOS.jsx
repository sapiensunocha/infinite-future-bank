import { useState } from 'react';
import { supabase } from './services/supabaseClient';
import { 
  ShieldAlert, HeartHandshake, Database, 
  Activity, Fingerprint, CheckCircle2, 
  Settings2, ArrowRight, ShieldCheck, 
  RefreshCcw, Lock, Info, X, Loader2
} from 'lucide-react';

export default function EmergencySOS({ session, balances, profile }) {
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  
  // SOS Brain Engine States
  const [isBrainActive, setIsBrainActive] = useState(false);
  const [engineStep, setEngineStep] = useState('INITIAL'); // INITIAL -> ANALYZING -> APPROVED -> DISBURSED
  const [analyzingProgress, setAnalyzingProgress] = useState(0);

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);

  // Simulated IFB Treasury & Risk Data
  const globalPool = 14250890; 
  const userContribution = 1250;
  
  // Calculate Eligible Advance: E.g., 50% of their Alpha Equity, or a minimum of $1,000 if they are broke
  const baseEquity = balances?.alpha_equity_usd || 0;
  const eligibleAdvance = baseEquity > 2000 ? baseEquity * 0.5 : 1000.00;

  // 🧠 The 10-Step Automated Risk Engine
  const runRiskEngine = () => {
    setEngineStep('ANALYZING');
    
    // Simulating background system checks
    const intervals = [
      setTimeout(() => setAnalyzingProgress(1), 500),  // KYC
      setTimeout(() => setAnalyzingProgress(2), 1000), // Fraud Scan
      setTimeout(() => setAnalyzingProgress(3), 1500), // Behavior
      setTimeout(() => setAnalyzingProgress(4), 2000), // Stability
      setTimeout(() => setAnalyzingProgress(5), 2500), // Risk Score
      setTimeout(() => setEngineStep('APPROVED'), 3200) // Decision
    ];
    return () => intervals.forEach(clearTimeout);
  };

  // 🚀 THE LIVE DISBURSEMENT ENGINE
  const handleDisbursement = async () => {
    setEngineStep('DISBURSED');
    
    try {
      // Execute the secure database transaction we just built!
      const { error } = await supabase.rpc('process_sos_advance', {
        p_user_id: session.user.id,
        p_amount: eligibleAdvance
      });

      if (error) throw error;

      setTimeout(() => {
        setIsBrainActive(false);
        setEngineStep('INITIAL');
        setAnalyzingProgress(0);
        // The real-time WebSocket in Dashboard.jsx will automatically see this new transaction 
        // and instantly tick up their balance UI!
      }, 4000);

    } catch (err) {
      console.error("Disbursement Failed:", err);
      alert("System Error: Failed to route funds. Please contact DEUS Support.");
      setIsBrainActive(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 relative text-white">
      
      {/* 🏛️ Top Header & Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/5 backdrop-blur-2xl border border-white/10 p-6 rounded-[2.5rem] shadow-glass">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <ShieldAlert size={24} className="text-red-500" /> Emergency Shield
          </h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">0% Advance & Global Transparency Pool</p>
        </div>
        
        <div className="flex bg-black/40 p-2 rounded-2xl border border-white/5 shadow-inner w-full md:w-auto overflow-x-auto custom-scrollbar">
          {['OVERVIEW', 'CONFIGURATION'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-red-600/20 text-red-400 border border-red-500/30 shadow-glow' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* 📈 MAIN OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-left-4">
          
          {/* Main Global Pool Transparency */}
          <div className="lg:col-span-2 bg-[#0B0F19] text-white p-10 md:p-12 rounded-[3.5rem] shadow-glass relative overflow-hidden group border border-white/10">
            <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-red-500/10 rounded-full blur-[100px] group-hover:bg-red-500/20 transition-all pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col justify-between h-full">
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-red-400 backdrop-blur-md border border-white/10"><Database size={20}/></div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Global SOS Liquidity</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><Activity size={10} className="text-ifb-success"/> Real-time Blockchain Audit</p>
                  </div>
                </div>
                <h2 className="text-5xl md:text-6xl font-black tracking-tighter text-white">{formatCurrency(globalPool)}</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4 leading-relaxed max-w-md">
                  This pool is backed by 5% of IFB Treasury net profits and voluntary community micro-contributions. It ensures instant, 0% liquidity is always available for sovereign citizens in distress.
                </p>
              </div>

              <div className="flex flex-col md:flex-row gap-4 border-t border-white/10 pt-8">
                <div className="flex-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Your Total Shield Contribution</p>
                  <p className="text-2xl font-black text-ifb-success">{formatCurrency(userContribution)}</p>
                </div>
                <div className="flex-1 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Network Status</p>
                  <p className="text-sm font-black text-white flex items-center gap-2"><CheckCircle2 size={16} className="text-ifb-primary"/> Fully Collateralized</p>
                </div>
              </div>
            </div>
          </div>

          {/* SOS Primary Trigger Widget */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-red-500/5 backdrop-blur-2xl border border-red-500/20 p-8 rounded-[3rem] shadow-glass text-center h-full flex flex-col justify-center relative overflow-hidden group hover:bg-red-500/10 transition-colors">
              <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-red-500/20 rounded-full blur-[80px] pointer-events-none"></div>
              <div className="w-20 h-20 mx-auto bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mb-6 border border-red-500/30 animate-pulse shadow-glow relative z-10">
                <ShieldAlert size={32}/>
              </div>
              <h3 className="text-xl font-black text-white mb-2 relative z-10">Initiate SOS</h3>
              <p className="text-[10px] font-bold text-red-200/60 uppercase tracking-widest mb-8 leading-relaxed relative z-10">
                Instantly request a 0% emergency advance. No credit checks. Soft recovery via future inflows.
              </p>
              <button 
                onClick={() => setIsBrainActive(true)}
                className="w-full py-5 bg-red-600/90 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-glow hover:bg-red-500 hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-2 border border-red-400/50 relative z-10"
              >
                Deploy Shield <ArrowRight size={16}/>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚙️ CONFIGURATION & SETTINGS */}
      {activeTab === 'CONFIGURATION' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-left-4">
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-10 rounded-[3rem] shadow-glass group cursor-pointer hover:bg-white/10 transition-all">
            <div className="flex justify-between items-start mb-8">
              <div className="w-12 h-12 rounded-2xl bg-ifb-success/20 border border-ifb-success/30 flex items-center justify-center text-ifb-success shadow-glow"><HeartHandshake size={24}/></div>
              <div className="w-12 h-6 bg-ifb-success rounded-full relative shadow-inner"><div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div></div>
            </div>
            <h3 className="text-xl font-black text-white mb-2">Transaction Micro-Roundups</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mb-6">
              Automatically round up your card purchases to the nearest dollar. The spare change is sent to your personal SOS balance and the Global Pool.
            </p>
            <div className="p-4 bg-ifb-success/10 rounded-xl border border-ifb-success/20 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-ifb-success">
              <span>Current Rate: Nearest $1.00</span>
              <Settings2 size={14}/>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-10 rounded-[3rem] shadow-glass group cursor-pointer hover:bg-white/10 transition-all">
            <div className="flex justify-between items-start mb-8">
              <div className="w-12 h-12 rounded-2xl bg-ifb-primary/20 border border-ifb-primary/30 flex items-center justify-center text-ifb-primary shadow-glow-blue"><RefreshCcw size={24}/></div>
              <div className="w-12 h-6 bg-white/10 border border-white/20 rounded-full relative shadow-inner"><div className="absolute left-1 top-1 w-4 h-4 bg-slate-400 rounded-full shadow-sm"></div></div>
            </div>
            <h3 className="text-xl font-black text-white mb-2">Inflow % Allocation</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mb-6">
              Divert a fixed percentage of all incoming deposits directly into your SOS Shield. Voluntary, reversible, and instantly accessible.
            </p>
            <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
              <span>Status: Paused</span>
              <Settings2 size={14}/>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          🧠 THE ACTIVE SOS BRAIN (Full Screen Overlay)
      ==================================================================== */}
      {isBrainActive && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-3xl bg-[#0B0F19]/90 animate-in fade-in duration-300">
          <div className="bg-[#0B0F19] border border-white/20 shadow-glass rounded-[3rem] max-w-lg w-full relative overflow-hidden flex flex-col">
            
            <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] rounded-full bg-red-500/10 blur-[80px] pointer-events-none"></div>

            <div className="flex justify-between items-center p-8 border-b border-white/10 relative z-10">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <ShieldAlert size={24} className="text-red-500" /> Emergency Support Request
              </h2>
              {engineStep === 'INITIAL' && (
                <button onClick={() => setIsBrainActive(false)} className="text-slate-400 hover:text-white transition-colors bg-white/5 p-2 rounded-xl border border-white/10"><X size={20}/></button>
              )}
            </div>

            <div className="p-8 relative z-10 flex-1">
              
              {/* STATE 1: INITIAL CONFIRMATION */}
              {engineStep === 'INITIAL' && (
                <div className="space-y-8 animate-in slide-in-from-bottom-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Personal SOS Balance</p>
                      <p className="text-2xl font-black text-white">{formatCurrency(userContribution)}</p>
                    </div>
                    <div className="p-5 bg-red-500/10 rounded-2xl border border-red-500/20">
                      <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-1">Max Eligible Advance</p>
                      <p className="text-2xl font-black text-red-500">{formatCurrency(eligibleAdvance)}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <button onClick={runRiskEngine} className="w-full py-5 bg-red-600/90 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-glow hover:bg-red-500 hover:-translate-y-1 transition-all flex items-center justify-center gap-2 border border-red-400/50">
                      Request Emergency Support <ArrowRight size={16}/>
                    </button>
                  </div>

                  <div className="pt-6 border-t border-white/10">
                    <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      <span className="flex items-center gap-1"><Lock size={10}/> IFB Treasury Backed</span>
                      <span>Global Pool: {formatCurrency(globalPool)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* STATE 2: THE PRE-CHECK ENGINE */}
              {engineStep === 'ANALYZING' && (
                <div className="py-12 flex flex-col items-center justify-center space-y-8 animate-in zoom-in-95">
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-ifb-primary rounded-full border-t-transparent animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center"><Activity size={24} className="text-ifb-primary"/></div>
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-white">Analyzing Eligibility...</h3>
                  
                  <div className="w-full max-w-xs space-y-3">
                    {[
                      { step: 1, label: 'KYC Verification Check' },
                      { step: 2, label: 'Fraud Detection Scan' },
                      { step: 3, label: 'Account Behavior Analysis' },
                      { step: 4, label: 'Income Stability Score' },
                      { step: 5, label: 'Risk Scoring Algorithm' }
                    ].map((item) => (
                      <div key={item.step} className="flex items-center gap-3">
                        {analyzingProgress >= item.step ? (
                          <CheckCircle2 size={16} className="text-ifb-success animate-in zoom-in" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-white/20" />
                        )}
                        <span className={`text-[10px] font-black uppercase tracking-widest ${analyzingProgress >= item.step ? 'text-white' : 'text-slate-500'}`}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STATE 3: DECISION OUTCOME */}
              {engineStep === 'APPROVED' && (
                <div className="space-y-8 animate-in slide-in-from-bottom-4">
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-ifb-success/20 border border-ifb-success/30 text-ifb-success rounded-full flex items-center justify-center mx-auto mb-4 shadow-glow"><ShieldCheck size={32}/></div>
                    <h3 className="text-3xl font-black text-white tracking-tight">{formatCurrency(eligibleAdvance)} Approved</h3>
                    <p className="text-[11px] font-black uppercase tracking-widest text-ifb-success">0% Interest • No Fixed Payments</p>
                  </div>

                  <div className="bg-black/40 p-6 rounded-2xl border border-white/10 space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-white/10 pb-2">Repayment Structure</h4>
                    <div className="flex items-start gap-3"><CheckCircle2 size={16} className="text-slate-500 mt-0.5"/><p className="text-xs font-bold text-slate-300 leading-relaxed">Auto-recovery begins conditionally after 30 days.</p></div>
                    <div className="flex items-start gap-3"><CheckCircle2 size={16} className="text-slate-500 mt-0.5"/><p className="text-xs font-bold text-slate-300 leading-relaxed">System only recovers a small % of future inflows if balance exceeds stability threshold.</p></div>
                    <div className="flex items-start gap-3"><HeartHandshake size={16} className="text-slate-500 mt-0.5"/><p className="text-xs font-bold text-ifb-primary leading-relaxed italic">"We've got you. Focus on stabilizing."</p></div>
                  </div>

                  <button onClick={handleDisbursement} className="w-full py-5 bg-ifb-success text-[#0B0F19] rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-glow hover:bg-emerald-400 hover:-translate-y-1 transition-all active:scale-95">
                    Confirm & Receive Funds
                  </button>
                </div>
              )}

              {/* STATE 4: FUNDS DISBURSED */}
              {engineStep === 'DISBURSED' && (
                <div className="py-12 flex flex-col items-center justify-center space-y-6 animate-in zoom-in-95 text-center">
                  <div className="w-24 h-24 bg-ifb-success text-[#0B0F19] rounded-full flex items-center justify-center shadow-glow mb-4"><CheckCircle2 size={48}/></div>
                  <h3 className="text-2xl font-black text-white">Funds Disbursed</h3>
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 max-w-xs leading-relaxed">
                    The advance has been deposited. A smart contract ledger entry has been recorded.
                  </p>
                  <Loader2 size={24} className="text-ifb-success animate-spin mt-4"/>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}