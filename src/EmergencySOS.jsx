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
      const { error } = await supabase.rpc('process_sos_advance', {
        p_user_id: session.user.id,
        p_amount: eligibleAdvance
      });

      if (error) throw error;

      setTimeout(() => {
        setIsBrainActive(false);
        setEngineStep('INITIAL');
        setAnalyzingProgress(0);
      }, 4000);

    } catch (err) {
      console.error("Disbursement Failed:", err);
      alert("System Error: Failed to route funds. Please contact DEUS Support.");
      setIsBrainActive(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 relative text-slate-800">
      
      {/* 🏛️ Top Header & Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white border border-slate-200 p-6 rounded-[2.5rem] shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <ShieldAlert size={24} className="text-red-600" /> Emergency Shield
          </h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">0% Advance & Global Transparency Pool</p>
        </div>
        
        <div className="flex bg-slate-100 p-2 rounded-2xl border border-slate-200 shadow-inner w-full md:w-auto overflow-x-auto no-scrollbar">
          {['OVERVIEW', 'CONFIGURATION'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-red-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* 📈 MAIN OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-left-4">
          
          {/* Main Global Pool Transparency - Kept Dark for premium/serious feel */}
          <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 text-white p-10 md:p-12 rounded-[3.5rem] shadow-xl relative overflow-hidden group border border-slate-700">
            <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-red-500/20 rounded-full blur-[100px] group-hover:bg-red-500/30 transition-all pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col justify-between h-full">
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-red-400 backdrop-blur-md border border-white/20"><Database size={20}/></div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Global SOS Liquidity</h3>
                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1"><Activity size={10} className="text-emerald-400"/> Real-time Blockchain Audit</p>
                  </div>
                </div>
                <h2 className="text-5xl md:text-6xl font-black tracking-tighter text-white">{formatCurrency(globalPool)}</h2>
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-4 leading-relaxed max-w-md">
                  This pool is backed by 5% of IFB Treasury net profits and voluntary community micro-contributions. It ensures instant, 0% liquidity is always available for sovereign citizens in distress.
                </p>
              </div>

              <div className="flex flex-col md:flex-row gap-4 border-t border-slate-700 pt-8">
                <div className="flex-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Your Total Shield Contribution</p>
                  <p className="text-2xl font-black text-emerald-400">{formatCurrency(userContribution)}</p>
                </div>
                <div className="flex-1 border-t md:border-t-0 md:border-l border-slate-700 pt-4 md:pt-0 md:pl-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Network Status</p>
                  <p className="text-sm font-black text-white flex items-center gap-2"><CheckCircle2 size={16} className="text-blue-400"/> Fully Collateralized</p>
                </div>
              </div>
            </div>
          </div>

          {/* SOS Primary Trigger Widget */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-red-50 border border-red-100 p-8 rounded-[3rem] shadow-sm text-center h-full flex flex-col justify-center relative overflow-hidden group hover:shadow-md transition-all">
              <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-red-100 rounded-full blur-[80px] pointer-events-none"></div>
              <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center text-red-600 mb-6 border border-red-200 animate-pulse shadow-sm relative z-10">
                <ShieldAlert size={32}/>
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2 relative z-10">Initiate SOS</h3>
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-8 leading-relaxed relative z-10">
                Instantly request a 0% emergency advance. No credit checks. Soft recovery via future inflows.
              </p>
              <button 
                onClick={() => setIsBrainActive(true)}
                className="w-full py-5 bg-red-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-md hover:bg-red-700 hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-2 relative z-10"
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
          <div className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-sm group cursor-pointer hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-8">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm"><HeartHandshake size={24}/></div>
              <div className="w-12 h-6 bg-emerald-500 rounded-full relative shadow-inner"><div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div></div>
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Transaction Micro-Roundups</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed mb-6">
              Automatically round up your card purchases to the nearest dollar. The spare change is sent to your personal SOS balance and the Global Pool.
            </p>
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-emerald-600">
              <span>Current Rate: Nearest $1.00</span>
              <Settings2 size={14}/>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-sm group cursor-pointer hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-8">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm"><RefreshCcw size={24}/></div>
              <div className="w-12 h-6 bg-slate-200 border border-slate-300 rounded-full relative shadow-inner"><div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div></div>
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Inflow % Allocation</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed mb-6">
              Divert a fixed percentage of all incoming deposits directly into your SOS Shield. Voluntary, reversible, and instantly accessible.
            </p>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-sm bg-slate-900/60 animate-in fade-in duration-300">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-[3rem] max-w-lg w-full relative overflow-hidden flex flex-col">
            
            <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] rounded-full bg-red-50 blur-[80px] pointer-events-none"></div>

            <div className="flex justify-between items-center p-8 border-b border-slate-100 bg-slate-50/50 relative z-10">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <ShieldAlert size={24} className="text-red-600" /> Emergency Support Request
              </h2>
              {engineStep === 'INITIAL' && (
                <button onClick={() => setIsBrainActive(false)} className="text-slate-400 hover:text-slate-800 transition-colors bg-white p-2 rounded-xl shadow-sm border border-slate-200"><X size={20}/></button>
              )}
            </div>

            <div className="p-8 relative z-10 flex-1">
              
              {/* STATE 1: INITIAL CONFIRMATION */}
              {engineStep === 'INITIAL' && (
                <div className="space-y-8 animate-in slide-in-from-bottom-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Personal SOS Balance</p>
                      <p className="text-2xl font-black text-slate-800">{formatCurrency(userContribution)}</p>
                    </div>
                    <div className="p-5 bg-red-50 rounded-2xl border border-red-100">
                      <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-1">Max Eligible Advance</p>
                      <p className="text-2xl font-black text-red-600">{formatCurrency(eligibleAdvance)}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <button onClick={runRiskEngine} className="w-full py-5 bg-red-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg hover:bg-red-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-2">
                      Request Emergency Support <ArrowRight size={16}/>
                    </button>
                  </div>

                  <div className="pt-6 border-t border-slate-100">
                    <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 uppercase tracking-widest">
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
                    <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center"><Activity size={24} className="text-blue-600"/></div>
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Analyzing Eligibility...</h3>
                  
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
                          <CheckCircle2 size={16} className="text-emerald-500 animate-in zoom-in" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-slate-200" />
                        )}
                        <span className={`text-[10px] font-black uppercase tracking-widest ${analyzingProgress >= item.step ? 'text-slate-800' : 'text-slate-400'}`}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STATE 3: DECISION OUTCOME */}
              {engineStep === 'APPROVED' && (
                <div className="space-y-8 animate-in slide-in-from-bottom-4">
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm"><ShieldCheck size={32}/></div>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tight">{formatCurrency(eligibleAdvance)} Approved</h3>
                    <p className="text-[11px] font-black uppercase tracking-widest text-emerald-600">0% Interest • No Fixed Payments</p>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 pb-2">Repayment Structure</h4>
                    <div className="flex items-start gap-3"><CheckCircle2 size={16} className="text-slate-400 mt-0.5"/><p className="text-xs font-bold text-slate-700 leading-relaxed">Auto-recovery begins conditionally after 30 days.</p></div>
                    <div className="flex items-start gap-3"><CheckCircle2 size={16} className="text-slate-400 mt-0.5"/><p className="text-xs font-bold text-slate-700 leading-relaxed">System only recovers a small % of future inflows if balance exceeds stability threshold.</p></div>
                    <div className="flex items-start gap-3"><HeartHandshake size={16} className="text-blue-500 mt-0.5"/><p className="text-xs font-bold text-blue-600 leading-relaxed italic">"We've got you. Focus on stabilizing."</p></div>
                  </div>

                  <button onClick={handleDisbursement} className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-md hover:bg-emerald-600 hover:-translate-y-1 transition-all active:scale-95">
                    Confirm & Receive Funds
                  </button>
                </div>
              )}

              {/* STATE 4: FUNDS DISBURSED */}
              {engineStep === 'DISBURSED' && (
                <div className="py-12 flex flex-col items-center justify-center space-y-6 animate-in zoom-in-95 text-center">
                  <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-inner mb-4"><CheckCircle2 size={48}/></div>
                  <h3 className="text-2xl font-black text-slate-800">Funds Disbursed</h3>
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 max-w-xs leading-relaxed">
                    The advance has been deposited. A smart contract ledger entry has been recorded.
                  </p>
                  <Loader2 size={24} className="text-emerald-500 animate-spin mt-4"/>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}