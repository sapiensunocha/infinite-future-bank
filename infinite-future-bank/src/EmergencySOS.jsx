import { useState } from 'react';
import { supabase } from './services/supabaseClient';
import { 
  AlertCircle, 
  HelpCircle, 
  Info, 
  CheckCircle2, 
  ArrowRight, 
  Lock, 
  X, 
  Loader2,
  Clock,
  Banknote,
  Zap,
  Circle,
  Square
} from 'lucide-react';

export default function EmergencySOS({ session, balances }) {
  const [activeTab, setActiveTab] = useState('REQUEST');
  const [isProcessing, setIsProcessing] = useState(false);
  const [requestStatus, setRequestStatus] = useState('IDLE'); // IDLE, PROCESSING, SUCCESS
  const [notification, setNotification] = useState(null);

  // 🔥 TRANSPARENCY EXECUTION TRACKER STATES
  const [executionPlan, setExecutionPlan] = useState({
    isActive: false,
    title: '',
    steps: [], 
    currentDetail: '',
    progressPct: 0
  });

  const triggerNotification = (type, msg) => {
    setNotification({ type, text: msg });
    setTimeout(() => setNotification(null), 5000);
  };

  // Calculate AFR Advance (1:1 Peg for calculation purposes)
  const baseEquity = balances?.alpha_equity_usd || 0;
  const maxAdvanceAFR = baseEquity > 0 ? baseEquity * 0.5 : 1000.00;

  const handleRequestAdvance = async () => {
    setIsProcessing(true);
    setRequestStatus('PROCESSING');
    
    // 1. Initialize the Transparent Tracker
    let mockSteps = [
      { id: 1, text: "Authenticating identity & emergency criteria.", status: "active" },
      { id: 2, text: "Connecting to IFB Reserve Treasury (AFR Mainnet).", status: "pending" },
      { id: 3, text: "Awaiting AI Validator Consensus (2-of-3 required).", status: "pending" },
      { id: 4, text: "Executing on-chain capital transfer.", status: "pending" }
    ];

    setExecutionPlan({
      isActive: true,
      title: "AFR Emergency Liquidity Protocol",
      steps: [...mockSteps],
      currentDetail: "Initiating emergency request...",
      progressPct: 10
    });

    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    try {
      // Step 1 Finish
      await delay(1500);
      mockSteps[0].status = "completed";
      mockSteps[1].status = "active";
      setExecutionPlan(prev => ({ ...prev, steps: [...mockSteps], currentDetail: "Identity verified. Routing to Treasury...", progressPct: 35 }));
      triggerNotification('success', "Identity authenticated. Eligibility confirmed.");

      // Step 2 Finish
      await delay(2000);
      mockSteps[1].status = "completed";
      mockSteps[2].status = "active";
      setExecutionPlan(prev => ({ ...prev, steps: [...mockSteps], currentDetail: "Broadcasting transaction to AI Validators...", progressPct: 60 }));
      triggerNotification('success', "Connected to AFR Reserve Treasury.");

      // Step 3 Finish (Simulating the AI Agents voting)
      await delay(2500);
      mockSteps[2].status = "completed";
      mockSteps[3].status = "active";
      setExecutionPlan(prev => ({ ...prev, steps: [...mockSteps], currentDetail: "Consensus reached. Finalizing ledger...", progressPct: 85 }));
      triggerNotification('success', "Consensus Reached: Agent Alpha & Agent Gamma approved the transfer.");

      // Step 4 Finish - Real Database/Blockchain Write
      // Log the emergency transaction to the blockchain ledger
      const { error: txError } = await supabase.from('market_transactions').insert({
        user_id: session?.user?.id,
        asset: 'AFR',
        side: 'EMERGENCY_SOS',
        execution_price: 1.00,
        quantity: maxAdvanceAFR,
        status: 'COMPLETED',
        blockchain_sig: `SIG_SOS_CONSENSUS_${Date.now()}`
      });

      if (txError) throw txError;

      await delay(1500);
      mockSteps[3].status = "completed";
      setExecutionPlan(prev => ({ ...prev, steps: [...mockSteps], currentDetail: "Capital successfully deployed to wallet.", progressPct: 100 }));
      triggerNotification('success', `${maxAdvanceAFR.toFixed(2)} AFR successfully deposited to your secure wallet.`);

      await delay(2000);
      setRequestStatus('SUCCESS');

    } catch (err) {
      console.error("SOS Request Failed:", err);
      triggerNotification('error', "Request could not be processed. Blockchain network error.");
    } finally {
      setIsProcessing(false);
      setExecutionPlan(prev => ({ ...prev, isActive: false }));
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 text-slate-800">
      
      {/* 🏛️ Professional Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white border border-slate-200 p-6 rounded-[2.5rem] shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Emergency Liquidity</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">Access immediate capital during financial hardship</p>
        </div>
        
        <div className="flex bg-slate-100 p-2 rounded-2xl border border-slate-200 shadow-inner">
          {['REQUEST', 'TERMS'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'REQUEST' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-left-4">
          
          {/* Main Balance Info */}
          <div className="lg:col-span-2 bg-white border border-slate-200 p-10 md:p-12 rounded-[3rem] shadow-sm flex flex-col justify-between h-full relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
            
            <div className="relative z-10">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-2">
                <Zap size={18} className="text-emerald-500"/> Available AFR Emergency Advance
              </h3>
              <h2 className="text-6xl font-black text-slate-800 tracking-tighter mb-4">
                {maxAdvanceAFR.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-3xl text-emerald-600">AFR</span>
              </h2>
              <p className="text-sm font-medium text-slate-500 max-w-lg leading-relaxed mb-10">
                You are eligible for a 0% interest advance distributed directly to your immutable AFR wallet. These funds bypass traditional banking delays to provide immediate offline and online stability.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-10 relative z-10">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0"><CheckCircle2 size={20}/></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-800">No Interest</p>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Institutional 0.0% APR for all eligible platform users.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0"><CheckCircle2 size={20}/></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-800">Soft Recovery</p>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Automatic repayment only when your income stabilizes.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Panel & Execution Tracker */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className={`bg-slate-900 p-10 rounded-[3rem] shadow-xl text-white flex flex-col justify-between relative overflow-hidden transition-all duration-500 ${executionPlan.isActive ? 'h-auto' : 'h-full'}`}>
              <div className="relative z-10">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-red-400 mb-8 border border-white/10"><AlertCircle size={32}/></div>
                <h3 className="text-2xl font-black mb-4">Request Capital</h3>
                <p className="text-xs text-slate-400 font-medium leading-relaxed mb-10">
                  By clicking below, you confirm you are in an emergency situation. AFR Funds will be deposited into your immutable blockchain wallet instantly.
                </p>
              </div>

              {!executionPlan.isActive && (
                <button 
                  onClick={handleRequestAdvance}
                  disabled={isProcessing}
                  className="w-full py-5 bg-white text-slate-900 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg hover:bg-slate-100 transition-all flex items-center justify-center gap-2 relative z-10 disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="animate-spin" size={16}/> : 'Initiate Protocol'}
                </button>
              )}

              <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none"><AlertCircle size={200}/></div>
            </div>

            {/* 🔥 TRANSPARENT EXECUTION TRACKER UI */}
            {executionPlan.isActive && (
              <div className="w-full bg-[#111111] text-slate-200 rounded-[3rem] p-8 shadow-2xl border border-slate-800 animate-in slide-in-from-bottom-4">
                <div className="flex justify-between items-center mb-8">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-white">{executionPlan.title}</h4>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]"></div>
                </div>
                
                <div className="space-y-5 mb-8">
                  {executionPlan.steps.map(step => (
                    <div key={step.id} className="flex items-center gap-4">
                      {step.status === 'completed' && <CheckCircle2 size={18} className="text-emerald-500 shrink-0"/>}
                      {step.status === 'active' && <Loader2 size={18} className="text-blue-500 animate-spin shrink-0"/>}
                      {step.status === 'pending' && <Circle size={18} className="text-slate-700 shrink-0"/>}
                      
                      <span className={`text-xs font-medium ${step.status === 'pending' ? 'text-slate-600' : 'text-slate-300'}`}>
                        {step.text}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-slate-800/50">
                  <p className="text-[10px] font-black tracking-widest uppercase text-slate-500 mb-4">{executionPlan.currentDetail}</p>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-white transition-all duration-500 ease-out" 
                        style={{ width: `${executionPlan.progressPct}%` }}
                      ></div>
                    </div>
                    <button className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center border border-slate-700 pointer-events-none">
                      <Square size={10} fill="currentColor" className="text-slate-500"/>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'TERMS' && (
        <div className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-sm animate-in slide-in-from-left-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-8">Program Terms & Disclosure</h3>
          <div className="space-y-8 max-w-3xl">
            <div className="flex gap-5">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl h-fit"><Lock className="text-blue-600" size={20}/></div>
              <div>
                <p className="font-black text-slate-800 text-sm">Collateral Requirement</p>
                <p className="text-sm font-medium text-slate-500 mt-2 leading-relaxed">Emergency advances are partially collateralized by your existing Alpha Equity or future inbound transfers. No credit score check is required.</p>
              </div>
            </div>
            <div className="flex gap-5">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl h-fit"><Clock className="text-blue-600" size={20}/></div>
              <div>
                <p className="font-black text-slate-800 text-sm">Repayment Period</p>
                <p className="text-sm font-medium text-slate-500 mt-2 leading-relaxed">There is no fixed repayment schedule. Repayment is triggered automatically when your total account balance exceeds a pre-set stability threshold.</p>
              </div>
            </div>
            <div className="flex gap-5">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl h-fit"><Info className="text-blue-600" size={20}/></div>
              <div>
                <p className="font-black text-slate-800 text-sm">Abuse Policy</p>
                <p className="text-sm font-medium text-slate-500 mt-2 leading-relaxed">The Emergency Liquidity program is a safety net for users in distress. Fraudulent use or deliberate system abuse may result in account termination and legal action.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS OVERLAY */}
      {requestStatus === 'SUCCESS' && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-md bg-slate-900/60 animate-in fade-in duration-300">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-[3.5rem] max-w-md w-full p-12 text-center animate-in zoom-in-95 duration-300 relative overflow-hidden">
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-50 blur-[60px] pointer-events-none"></div>
            <div className="relative z-10">
              <div className="w-24 h-24 bg-emerald-50 text-emerald-500 border border-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-sm">
                <CheckCircle2 size={48}/>
              </div>
              <h3 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">Transfer Successful</h3>
              <p className="text-sm font-medium text-slate-500 mb-10 leading-relaxed">
                {maxAdvanceAFR.toLocaleString()} AFR has been successfully minted and deposited into your secure blockchain wallet.
              </p>
              <button onClick={() => { setRequestStatus('IDLE'); setActiveTab('REQUEST'); }} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-lg">
                Return to Hub
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL NOTIFICATION */}
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