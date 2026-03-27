import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import { 
  ShieldCheck, TrendingUp, HandCoins, Activity, AlertCircle, 
  CheckCircle2, ChevronRight, Users, Loader2, Zap, Lock, Network, Circle, Square
} from 'lucide-react';

const GCP_NODE_URL = 'https://afr-blockchain-node-382117221028.us-central1.run.app';

export default function Loans({ session, balances, fetchAllData, profile }) {
  const [activeTab, setActiveTab] = useState('MARKET'); // 'MARKET', 'BORROW', 'PORTFOLIO'
  const [marketLoans, setMarketLoans] = useState([]);
  const [myLoans, setMyLoans] = useState([]);
  const [myInvestments, setMyInvestments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fundAmount, setFundAmount] = useState({});
  const [notification, setNotification] = useState(null);

  // Borrow Form State
  const [borrowForm, setBorrowForm] = useState({ amount: '', duration: '6', interest: '5.0', purpose: '' });

  // 🔥 TRANSPARENCY EXECUTION TRACKER STATES
  const [executionPlan, setExecutionPlan] = useState({
    isActive: false, title: '', steps: [], currentDetail: '', progressPct: 0
  });

  useEffect(() => { fetchLoansData(); }, [activeTab]);

  const triggerNotification = (type, msg) => {
    setNotification({ type, text: msg });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchLoansData = async () => {
    setIsLoading(true);
    try {
      const { data: market } = await supabase.from('loan_requests').select('*').eq('status', 'funding').neq('borrower_id', session.user.id).order('created_at', { ascending: false });
      if (market) setMarketLoans(market);

      const { data: mine } = await supabase.from('loan_requests').select('*').eq('borrower_id', session.user.id);
      if (mine) setMyLoans(mine);

      const { data: investments } = await supabase.from('loan_contributions').select(`*, loan_requests(borrower_name, interest_rate, duration_months, status)`).eq('lender_id', session.user.id);
      if (investments) setMyInvestments(investments);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // --- STREAM PROCESSOR HELPER ---
  const processStream = async (url, payload, initialSteps, title) => {
    setExecutionPlan({
      isActive: true, title: title, steps: initialSteps, currentDetail: "Initiating connection...", progressPct: 5
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n').filter(Boolean);

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.replace('data: ', ''));
            
            if (data.type === 'progress') {
              setExecutionPlan(prev => {
                const newSteps = prev.steps.map(s => {
                  if (s.id === data.stepId) return { ...s, status: data.status };
                  if (s.id === data.stepId + 1 && data.status === 'completed') return { ...s, status: 'active' };
                  return s;
                });
                return { ...prev, steps: newSteps, currentDetail: data.detail || prev.currentDetail, progressPct: data.progressPct || prev.progressPct };
              });
              if (data.status === 'completed') triggerNotification('success', `Step ${data.stepId} Verified.`);
            } else if (data.type === 'done') {
              triggerNotification('success', 'Execution finalized on blockchain.');
              setTimeout(() => setExecutionPlan(prev => ({ ...prev, isActive: false })), 2000);
              return true; // Success
            } else if (data.type === 'error') {
              throw new Error(data.message);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      triggerNotification('error', `Execution Failed: ${err.message}`);
      setExecutionPlan(prev => ({ ...prev, isActive: false }));
      return false; // Failed
    }
  };

  // 🚀 REAL BLOCKCHAIN BORROW
  const handleRequestLoan = async (e) => {
    e.preventDefault();
    if (executionPlan.isActive) return;

    const initialSteps = [
      { id: 1, text: "Verifying IFB Trust Score & Collateral limits.", status: "pending" },
      { id: 2, text: "Drafting AFR Smart Contract parameters.", status: "pending" },
      { id: 3, text: "AI Validator Risk Assessment (Grok DEUS).", status: "pending" },
      { id: 4, text: "Publishing Contract to IFB Credit Network.", status: "pending" }
    ];

    const payload = {
      userId: session.user.id,
      borrowerName: profile?.full_name || 'Verified Member',
      amount: parseFloat(borrowForm.amount),
      interest: parseFloat(borrowForm.interest),
      duration: parseInt(borrowForm.duration),
      purpose: borrowForm.purpose,
      trustScore: profile?.kyc_status === 'verified' ? 95 : 70
    };

    const success = await processStream(`${GCP_NODE_URL}/api/loan-create-stream`, payload, initialSteps, "Smart Contract Generation");
    
    if (success) {
      setBorrowForm({ amount: '', duration: '6', interest: '5.0', purpose: '' });
      setActiveTab('PORTFOLIO');
      fetchLoansData();
    }
  };

  // 🚀 REAL BLOCKCHAIN LEND
  const handleFundLoan = async (loanId, maxAmount) => {
    const amount = parseFloat(fundAmount[loanId]);
    if (!amount || amount <= 0) return triggerNotification('error', 'Enter a valid AFR amount.');
    if (amount > (balances?.afr_balance || 0)) return triggerNotification('error', 'Insufficient AFR blockchain balance.');
    if (amount > maxAmount) return triggerNotification('error', `Cannot fund more than the remaining ${maxAmount} AFR.`);

    const initialSteps = [
      { id: 1, text: "Verifying AFR Wallet Balance & Signatures.", status: "pending" },
      { id: 2, text: "Locking AFR Liquidity into Escrow Contract.", status: "pending" },
      { id: 3, text: "Awaiting AI Validator Consensus (2-of-3).", status: "pending" },
      { id: 4, text: "Securing Yield Contract on Ledger.", status: "pending" }
    ];

    const payload = { userId: session.user.id, loanId, amount };

    const success = await processStream(`${GCP_NODE_URL}/api/loan-fund-stream`, payload, initialSteps, "AFR Escrow Execution");

    if (success) {
      setFundAmount({ ...fundAmount, [loanId]: '' });
      await fetchAllData();
      await fetchLoansData();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 relative">
      
      {/* 🏛️ Header */}
      <div className="bg-slate-900 border border-slate-800 p-10 rounded-[3rem] shadow-xl text-white relative overflow-hidden">
        <Network size={160} className="absolute -right-10 -bottom-10 opacity-5 text-emerald-400" />
        <div className="relative z-10">
          <h2 className="text-3xl font-black tracking-tight mb-2 flex items-center gap-3"><Zap className="text-emerald-400"/> IFB Credit Network</h2>
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">Access decentralized liquidity or generate yield by funding verified users. All loans are protected by the AI Trust Engine and executed via AFR Smart Contracts.</p>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm w-fit overflow-x-auto no-scrollbar">
        <button onClick={() => setActiveTab('MARKET')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'MARKET' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>Marketplace (Lend)</button>
        <button onClick={() => setActiveTab('BORROW')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'BORROW' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>Issue Contract (Borrow)</button>
        <button onClick={() => setActiveTab('PORTFOLIO')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'PORTFOLIO' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>My Portfolio</button>
      </div>

      {/* --- TAB 1: MARKETPLACE (LEND) --- */}
      {activeTab === 'MARKET' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Avg Market Yield</p>
                <p className="text-2xl font-black text-emerald-900">7.2% APY</p>
              </div>
              <TrendingUp size={32} className="text-emerald-300"/>
            </div>
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex items-center justify-between text-white">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">Your AFR Liquidity</p>
                <p className="text-2xl font-black">{balances?.afr_balance ? parseFloat(balances.afr_balance).toFixed(2) : '0.00'} <span className="text-sm text-slate-400">AFR</span></p>
              </div>
              <Zap size={32} className="text-slate-700"/>
            </div>
          </div>

          <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2"><Network size={18} className="text-blue-600"/> Active Smart Contracts</h3>
          {isLoading && !executionPlan.isActive ? <div className="py-10 text-center"><Loader2 className="animate-spin mx-auto text-blue-500"/></div> : null}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {marketLoans.length === 0 && !isLoading && <p className="text-slate-500 col-span-full py-10 text-center font-bold">No active smart contracts currently in the market.</p>}
            
            {marketLoans.map(loan => {
              const progress = (loan.amount_funded / loan.amount_requested) * 100;
              const remaining = loan.amount_requested - loan.amount_funded;
              
              return (
                <div key={loan.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 hover:shadow-lg transition-all flex flex-col justify-between group">
                  <div>
                    <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-4">
                      <div>
                        <h4 className="font-black text-slate-800">{loan.borrower_name}</h4>
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1 mt-1"><ShieldCheck size={12}/> Trust Score: {loan.trust_score}</p>
                      </div>
                      <div className="text-right">
                        <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border border-emerald-200">{loan.interest_rate}% Yield</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 font-medium mb-4 line-clamp-2 h-8">"{loan.purpose}"</p>
                    
                    <div className="space-y-2 mb-6">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-500">Locked: {loan.amount_funded} AFR</span>
                        <span className="text-slate-800">Goal: {loan.amount_requested} AFR</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                      </div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">{loan.duration_months} Month Term</p>
                    </div>
                  </div>

                  <div className="flex gap-2 relative z-10">
                    <input 
                      type="number" 
                      placeholder={`Max ${remaining}`} 
                      max={remaining}
                      disabled={executionPlan.isActive}
                      value={fundAmount[loan.id] || ''}
                      onChange={(e) => setFundAmount({...fundAmount, [loan.id]: e.target.value})}
                      className="w-1/2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-blue-500 disabled:opacity-50"
                    />
                    <button 
                      onClick={() => handleFundLoan(loan.id, remaining)}
                      disabled={executionPlan.isActive}
                      className="w-1/2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <Lock size={12}/> Fund
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* --- TAB 2: BORROW CAPITAL (ISSUE CONTRACT) --- */}
      {activeTab === 'BORROW' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in">
          
          <div className="space-y-6">
            <form onSubmit={handleRequestLoan} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
              <div className="mb-4">
                <h3 className="text-xl font-black text-slate-800">Issue Smart Contract</h3>
                <p className="text-xs text-slate-500 mt-1">Submit your request to the decentralized AFR liquidity pool.</p>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Requested Amount (AFR)</label>
                <div className="relative">
                  <input required type="number" min="50" disabled={executionPlan.isActive} value={borrowForm.amount} onChange={e=>setBorrowForm({...borrowForm, amount: e.target.value})} className="w-full bg-slate-50 p-4 pl-12 rounded-xl border border-slate-200 font-black text-2xl outline-none focus:border-blue-500 disabled:opacity-50" placeholder="0.00" />
                  <Zap size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Duration (Months)</label>
                  <select disabled={executionPlan.isActive} value={borrowForm.duration} onChange={e=>setBorrowForm({...borrowForm, duration: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 font-bold outline-none focus:border-blue-500 disabled:opacity-50">
                    <option value="3">3 Months</option>
                    <option value="6">6 Months</option>
                    <option value="12">12 Months</option>
                    <option value="24">24 Months</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Offer Yield (%)</label>
                  <input required type="number" step="0.1" min="1" max="20" disabled={executionPlan.isActive} value={borrowForm.interest} onChange={e=>setBorrowForm({...borrowForm, interest: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 font-bold outline-none focus:border-blue-500 disabled:opacity-50" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Purpose of Capital</label>
                <textarea required disabled={executionPlan.isActive} value={borrowForm.purpose} onChange={e=>setBorrowForm({...borrowForm, purpose: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 font-bold text-sm outline-none focus:border-blue-500 h-24 disabled:opacity-50 resize-none" placeholder="Briefly explain what this capital is for..." />
              </div>

              {!executionPlan.isActive && (
                <button type="submit" className="w-full bg-blue-700 text-white p-5 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-2">
                  <Network size={16}/> Deploy Contract
                </button>
              )}
            </form>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500 opacity-10 rounded-full blur-3xl -mr-10 -mt-10"></div>
              <div className="relative z-10">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2"><ShieldCheck/> AI Trust Profile</h3>
                <div className="flex items-end gap-4 mb-4">
                  <span className="text-6xl font-black tracking-tighter text-emerald-400">{profile?.kyc_status === 'verified' ? '95' : '70'}</span>
                  <span className="text-slate-400 pb-2 font-bold">/ 100</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">Your Trust Score dictates how quickly the AI agents approve your loans. Complete identity verification, maintain a positive AFR balance, and repay on time to increase your score.</p>
              </div>
            </div>
            
            <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 flex items-start gap-4 shadow-sm">
              <Lock className="text-blue-500 shrink-0 mt-1"/>
              <div>
                <h4 className="font-bold text-blue-900 mb-1">Smart Contract Mechanics</h4>
                <p className="text-xs text-blue-800 leading-relaxed font-medium">When you request capital, it is deployed as an AFR Smart Contract. Multiple members can fund fractions of your request. Once 100% funded, the AFR is instantly transferred to your blockchain wallet via automated escrow release.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 3: MY PORTFOLIO --- */}
      {activeTab === 'PORTFOLIO' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in">
          
          {/* LENDER PORTFOLIO */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><TrendingUp className="text-emerald-500"/> Active Yield Contracts</h3>
            <div className="space-y-4">
              {myInvestments.length === 0 && <p className="text-sm text-slate-400 font-medium">You have not funded any smart contracts yet.</p>}
              {myInvestments.map(inv => (
                <div key={inv.id} className="p-5 bg-slate-50 border border-slate-100 rounded-2xl flex justify-between items-center hover:border-blue-200 transition-colors">
                  <div>
                    <p className="font-black text-slate-800 text-sm">Contract: {inv.loan_requests.borrower_name}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 flex items-center gap-1">Locked: {inv.amount} AFR <Lock size={10}/></p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-emerald-600">+{inv.loan_requests.interest_rate}% APY</p>
                    <p className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 uppercase tracking-widest mt-1 inline-block">{inv.loan_requests.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* BORROWER PORTFOLIO */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><Activity className="text-blue-500"/> My Issued Contracts</h3>
            <div className="space-y-4">
              {myLoans.length === 0 && <p className="text-sm text-slate-400 font-medium">You have no active contract requests.</p>}
              {myLoans.map(loan => {
                const progress = (loan.amount_funded / loan.amount_requested) * 100;
                return (
                  <div key={loan.id} className="p-6 bg-slate-50 border border-slate-100 rounded-2xl hover:border-blue-200 transition-colors">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-black text-slate-800">{loan.amount_requested} AFR Required</span>
                      {loan.status === 'funding' ? (
                        <span className="text-[9px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 px-3 py-1 rounded-lg border border-amber-200">Raising</span>
                      ) : (
                        <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg border border-emerald-200">Active</span>
                      )}
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">
                      <span>Funded: {loan.amount_funded} AFR</span>
                      <span className="text-blue-600">{progress.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      )}

      {/* 🔥 THE TRANSPARENT EXECUTION TRACKER UI (GLOBAL OVERLAY) */}
      {executionPlan.isActive && (
        <div className="fixed bottom-10 right-10 z-[400] w-full max-w-md bg-[#111111] text-slate-200 rounded-[2.5rem] p-8 shadow-2xl border border-slate-800 animate-in slide-in-from-bottom-8">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-[11px] font-black uppercase tracking-widest text-white flex items-center gap-2">
              <Zap size={14} className="text-emerald-500"/> {executionPlan.title}
            </h4>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]"></div>
          </div>
          
          <div className="space-y-4 mb-8">
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
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">{executionPlan.currentDetail}</p>
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