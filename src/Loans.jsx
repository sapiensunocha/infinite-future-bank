import React, { useState, useEffect } from 'react';
import { ShieldCheck, TrendingUp, HandCoins, Activity, AlertCircle, Percent, ArrowUpRight, ArrowDownRight, CheckCircle2, ChevronRight, Users, Loader2 } from 'lucide-react';
import { supabase } from './services/supabaseClient';

export default function Loans({ session, balances, fetchAllData, profile }) {
  const [activeTab, setActiveTab] = useState('MARKET'); // 'MARKET', 'BORROW', 'PORTFOLIO'
  const [marketLoans, setMarketLoans] = useState([]);
  const [myLoans, setMyLoans] = useState([]);
  const [myInvestments, setMyInvestments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fundAmount, setFundAmount] = useState({}); // Track funding input per loan

  // Borrow Form State
  const [borrowForm, setBorrowForm] = useState({ amount: '', duration: '6', interest: '5.0', purpose: '' });

  useEffect(() => { fetchLoansData(); }, [activeTab]);

  const fetchLoansData = async () => {
    setIsLoading(true);
    try {
      // Fetch open market loans (not belonging to the user)
      const { data: market } = await supabase.from('loan_requests')
        .select('*')
        .eq('status', 'funding')
        .neq('borrower_id', session.user.id)
        .order('created_at', { ascending: false });
      if (market) setMarketLoans(market);

      // Fetch user's own borrowing requests
      const { data: mine } = await supabase.from('loan_requests')
        .select('*')
        .eq('borrower_id', session.user.id);
      if (mine) setMyLoans(mine);

      // Fetch user's active investments/contributions
      const { data: investments } = await supabase.from('loan_contributions')
        .select(`*, loan_requests(borrower_name, interest_rate, duration_months, status)`)
        .eq('lender_id', session.user.id);
      if (investments) setMyInvestments(investments);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestLoan = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.from('loan_requests').insert([{
        borrower_id: session.user.id,
        borrower_name: profile?.full_name || 'Verified Member',
        amount_requested: parseFloat(borrowForm.amount),
        interest_rate: parseFloat(borrowForm.interest),
        duration_months: parseInt(borrowForm.duration),
        purpose: borrowForm.purpose,
        trust_score: profile?.kyc_status === 'verified' ? 95 : 70
      }]);
      if (error) throw error;
      alert('Loan request successfully pushed to the IFB Market.');
      setBorrowForm({ amount: '', duration: '6', interest: '5.0', purpose: '' });
      setActiveTab('PORTFOLIO');
      fetchLoansData();
    } catch (err) {
      alert("Failed to submit request.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFundLoan = async (loanId, maxAmount) => {
    const amount = parseFloat(fundAmount[loanId]);
    if (!amount || amount <= 0) return alert('Enter a valid amount.');
    if (amount > balances.liquid_usd) return alert('Insufficient liquid balance.');
    if (amount > maxAmount) return alert(`You cannot fund more than the remaining $${maxAmount}`);

    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('fund_community_loan', {
        p_loan_id: loanId,
        p_lender_id: session.user.id,
        p_amount: amount
      });
      if (error) throw error;
      alert(`Successfully invested $${amount} into the loan!`);
      setFundAmount({ ...fundAmount, [loanId]: '' });
      await fetchAllData();
      await fetchLoansData();
    } catch (err) {
      alert(err.message || 'Failed to fund loan.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-10 rounded-[3rem] shadow-xl text-white relative overflow-hidden">
        <Activity size={120} className="absolute -right-10 -bottom-10 opacity-5 text-blue-400" />
        <div className="relative z-10">
          <h2 className="text-3xl font-black tracking-tight mb-2 flex items-center gap-3"><HandCoins className="text-emerald-400"/> IFB Credit Network</h2>
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">Access community liquidity or generate yield by funding other verified users. All loans are protected by the IFB Trust Engine and Smart Contracts.</p>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm w-fit">
        <button onClick={() => setActiveTab('MARKET')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'MARKET' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>Marketplace (Lend)</button>
        <button onClick={() => setActiveTab('BORROW')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'BORROW' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>Borrow Capital</button>
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
            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Your Liquid Capital</p>
                <p className="text-2xl font-black text-blue-900">${balances.liquid_usd.toFixed(2)}</p>
              </div>
              <Activity size={32} className="text-blue-300"/>
            </div>
          </div>

          <h3 className="text-lg font-black text-slate-800 mb-4">Active Raising Syndicates</h3>
          {isLoading ? <div className="py-10 text-center"><Loader2 className="animate-spin mx-auto text-blue-500"/></div> : null}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {marketLoans.length === 0 && !isLoading && <p className="text-slate-500 col-span-full py-10 text-center font-bold">No active loan requests currently in the market.</p>}
            {marketLoans.map(loan => {
              const progress = (loan.amount_funded / loan.amount_requested) * 100;
              const remaining = loan.amount_requested - loan.amount_funded;
              
              return (
                <div key={loan.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 hover:shadow-lg transition-shadow flex flex-col justify-between">
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
                        <span className="text-slate-500">Raised: ${loan.amount_funded}</span>
                        <span className="text-slate-800">Goal: ${loan.amount_requested}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                      </div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">{loan.duration_months} Month Term</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      placeholder={`Max $${remaining}`} 
                      max={remaining}
                      value={fundAmount[loan.id] || ''}
                      onChange={(e) => setFundAmount({...fundAmount, [loan.id]: e.target.value})}
                      className="w-1/2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-blue-500"
                    />
                    <button 
                      onClick={() => handleFundLoan(loan.id, remaining)}
                      disabled={isLoading}
                      className="w-1/2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-md"
                    >
                      Fund
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* --- TAB 2: BORROW CAPITAL --- */}
      {activeTab === 'BORROW' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in">
          <form onSubmit={handleRequestLoan} className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
            <div className="mb-4">
              <h3 className="text-xl font-black text-slate-800">Initialize Raise</h3>
              <p className="text-xs text-slate-500 mt-1">Submit your request to the community liquidity pool.</p>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Requested Amount (USD)</label>
              <input required type="number" min="50" value={borrowForm.amount} onChange={e=>setBorrowForm({...borrowForm, amount: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 font-black text-2xl outline-none focus:border-blue-500" placeholder="0.00" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Duration (Months)</label>
                <select value={borrowForm.duration} onChange={e=>setBorrowForm({...borrowForm, duration: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 font-bold outline-none focus:border-blue-500">
                  <option value="3">3 Months</option>
                  <option value="6">6 Months</option>
                  <option value="12">12 Months</option>
                  <option value="24">24 Months</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Offer Interest Rate (%)</label>
                <input required type="number" step="0.1" min="1" max="20" value={borrowForm.interest} onChange={e=>setBorrowForm({...borrowForm, interest: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 font-bold outline-none focus:border-blue-500" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Purpose of Loan</label>
              <textarea required value={borrowForm.purpose} onChange={e=>setBorrowForm({...borrowForm, purpose: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 font-bold text-sm outline-none focus:border-blue-500 h-24" placeholder="Briefly explain what this capital is for..." />
            </div>

            <button type="submit" disabled={isLoading} className="w-full bg-blue-700 text-white p-5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50">
              Submit to Marketplace
            </button>
          </form>

          <div className="space-y-6">
            <div className="bg-slate-900 p-8 rounded-[2rem] shadow-xl text-white">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2"><ShieldCheck/> Your Trust Profile</h3>
              <div className="flex items-end gap-4 mb-4">
                <span className="text-6xl font-black tracking-tighter text-emerald-400">{profile?.kyc_status === 'verified' ? '95' : '70'}</span>
                <span className="text-slate-400 pb-2 font-bold">/ 100</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">Your Trust Score dictates how quickly the community funds your loans. Complete identity verification, maintain a positive balance, and repay on time to increase your score.</p>
            </div>
            
            <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 flex items-start gap-4">
              <AlertCircle className="text-blue-500 shrink-0 mt-1"/>
              <div>
                <h4 className="font-bold text-blue-900 mb-1">How it works</h4>
                <p className="text-xs text-blue-800 leading-relaxed">When you request capital, it enters the market as a "Raise". Multiple members can fund fractions of your request. Funds are released to your wallet the moment it hits 100%.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 3: MY PORTFOLIO --- */}
      {activeTab === 'PORTFOLIO' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in">
          
          {/* LENDER PORTFOLIO */}
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><TrendingUp className="text-emerald-500"/> My Investments (Yield)</h3>
            <div className="space-y-4">
              {myInvestments.length === 0 && <p className="text-sm text-slate-400">You have not funded any loans yet.</p>}
              {myInvestments.map(inv => (
                <div key={inv.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex justify-between items-center">
                  <div>
                    <p className="font-black text-slate-800 text-sm">Loan to {inv.loan_requests.borrower_name}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Invested: ${inv.amount}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-emerald-600">+{inv.loan_requests.interest_rate}% APY</p>
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mt-1">{inv.loan_requests.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* BORROWER PORTFOLIO */}
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><Activity className="text-blue-500"/> My Active Raises</h3>
            <div className="space-y-4">
              {myLoans.length === 0 && <p className="text-sm text-slate-400">You have no active loan requests.</p>}
              {myLoans.map(loan => {
                const progress = (loan.amount_funded / loan.amount_requested) * 100;
                return (
                  <div key={loan.id} className="p-5 bg-slate-50 border border-slate-100 rounded-2xl">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-black text-slate-800">${loan.amount_requested} Request</span>
                      {loan.status === 'funding' ? (
                        <span className="text-[9px] font-black uppercase tracking-widest bg-blue-100 text-blue-700 px-2 py-1 rounded">Funding</span>
                      ) : (
                        <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 px-2 py-1 rounded">Active</span>
                      )}
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-2">
                      <span>Funded: ${loan.amount_funded}</span>
                      <span>{progress.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full rounded-full transition-all" style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}