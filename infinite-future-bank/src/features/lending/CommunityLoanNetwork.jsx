import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
  Users, Plus, HandCoins, ShieldCheck, TrendingUp, Vote,
  Loader2, AlertCircle, CheckCircle2, ChevronRight, X,
  Star, Wallet, RefreshCw, ArrowUpRight, Award, Globe,
  Lock, Zap, BarChart3, UserPlus, Building2
} from 'lucide-react';

const INVOKE = (action, payload, userId) =>
  supabase.functions.invoke('cln-engine', { body: { action, payload, userId } });

function ScoreBadge({ score }) {
  const color =
    score >= 75 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
    score >= 50 ? 'bg-amber-100  text-amber-700  border-amber-200' :
                  'bg-red-100    text-red-700    border-red-200';
  return (
    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${color}`}>
      Score {Math.round(score)}
    </span>
  );
}

function Toast({ n }) {
  if (!n) return null;
  const bg = n.type === 'success' ? 'bg-emerald-600' : 'bg-red-600';
  return (
    <div className={`fixed top-5 right-5 z-[999] ${bg} text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-bold flex items-center gap-2`}>
      {n.type === 'success' ? <CheckCircle2 size={16}/> : <AlertCircle size={16}/>}
      {n.text}
    </div>
  );
}

export default function CommunityLoanNetwork({ session, balances, fetchAllData }) {
  const userId = session?.user?.id;
  const [view, setView]         = useState('list'); // 'list' | 'create' | 'community'
  const [communities, setCommunities] = useState([]);
  const [allCommunities, setAllCommunities] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loans, setLoans]       = useState([]);
  const [myStats, setMyStats]   = useState({ communities: 0, total_pool: 0, active_loans: 0 });
  const [loading, setLoading]   = useState(false);
  const [toast, setToast]       = useState(null);
  const [innerTab, setInnerTab] = useState('overview'); // 'overview'|'loans'|'members'|'contribute'|'request'
  const [members, setMembers]   = useState([]);

  // Create form
  const [form, setForm] = useState({
    name: '', purpose: '', description: '',
    contribution_amount: '20', contribution_frequency: 'monthly', max_members: '30',
  });
  // Loan request form
  const [loanForm, setLoanForm] = useState({ amount: '', purpose: '', repayment_days: '90' });
  // Repay
  const [repayAmount, setRepayAmount] = useState('');

  const notify = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => { if (userId) loadAll(); }, [userId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      // My communities
      const { data: myMem } = await supabase
        .from('cln_members')
        .select('community_id')
        .eq('user_id', userId)
        .eq('status', 'active');

      const myIds = (myMem || []).map(m => m.community_id);

      const { data: all } = await supabase
        .from('cln_communities')
        .select('*')
        .order('created_at', { ascending: false });

      setAllCommunities(all || []);
      setCommunities((all || []).filter(c => myIds.includes(c.id)));

      // Stats
      const { data: stats } = await supabase.rpc('get_cln_stats', { p_user_id: userId });
      if (stats) setMyStats(stats);
    } catch (e) {
      notify('error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCommunityDetail = async (comm) => {
    setSelected(comm);
    setView('community');
    setInnerTab('overview');
    const { data: l } = await supabase
      .from('cln_loan_requests')
      .select('*')
      .eq('community_id', comm.id)
      .order('created_at', { ascending: false });
    setLoans(l || []);

    const { data: m } = await supabase
      .from('cln_members')
      .select('*, profiles(full_name, avatar_url)')
      .eq('community_id', comm.id);
    setMembers(m || []);
  };

  // ── ACTIONS ──────────────────────────────────────────────────────────
  const createCommunity = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await INVOKE('create_community', {
        ...form,
        contribution_amount: parseFloat(form.contribution_amount),
        max_members: parseInt(form.max_members),
      }, userId);
      if (error || data?.error) throw new Error(data?.error || 'Failed');
      notify('success', `"${form.name}" community created!`);
      setForm({ name: '', purpose: '', description: '', contribution_amount: '20', contribution_frequency: 'monthly', max_members: '30' });
      setView('list');
      loadAll();
    } catch (err) { notify('error', err.message); }
    finally { setLoading(false); }
  };

  const joinCommunity = async (communityId) => {
    setLoading(true);
    try {
      const { data, error } = await INVOKE('join_community', { community_id: communityId }, userId);
      if (error || data?.error) throw new Error(data?.error || 'Failed');
      notify('success', 'You joined the community!');
      loadAll();
    } catch (err) { notify('error', err.message); }
    finally { setLoading(false); }
  };

  const contribute = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const { data, error } = await INVOKE('contribute', {
        community_id: selected.id,
        amount: parseFloat(selected.contribution_amount),
      }, userId);
      if (error || data?.error) throw new Error(data?.error || 'Failed');
      notify('success', `$${selected.contribution_amount} contributed to the pool!`);
      loadAll();
      loadCommunityDetail(selected);
      if (fetchAllData) fetchAllData();
    } catch (err) { notify('error', err.message); }
    finally { setLoading(false); }
  };

  const requestLoan = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setLoading(true);
    try {
      const { data, error } = await INVOKE('request_loan', {
        community_id: selected.id,
        amount: parseFloat(loanForm.amount),
        purpose: loanForm.purpose,
        repayment_days: parseInt(loanForm.repayment_days),
      }, userId);
      if (error || data?.error) throw new Error(data?.error || 'Failed');
      notify('success', 'Loan request submitted — awaiting community votes');
      setLoanForm({ amount: '', purpose: '', repayment_days: '90' });
      setInnerTab('loans');
      loadCommunityDetail(selected);
    } catch (err) { notify('error', err.message); }
    finally { setLoading(false); }
  };

  const voteLoan = async (loanId, vote) => {
    setLoading(true);
    try {
      const { data, error } = await INVOKE('vote_loan', { loan_request_id: loanId, vote }, userId);
      if (error || data?.error) throw new Error(data?.error || 'Failed');
      notify('success', vote === 'approve' ? 'Vote cast — Approved' : 'Vote cast — Rejected');
      loadCommunityDetail(selected);
    } catch (err) { notify('error', err.message); }
    finally { setLoading(false); }
  };

  const repayLoan = async (loanId) => {
    const amount = parseFloat(repayAmount);
    if (!amount || amount <= 0) return notify('error', 'Enter a valid amount');
    setLoading(true);
    try {
      const { data, error } = await INVOKE('repay_loan', { loan_request_id: loanId, amount }, userId);
      if (error || data?.error) throw new Error(data?.error || 'Failed');
      notify('success', data?.fully_repaid ? 'Loan fully repaid!' : `$${amount} repayment recorded`);
      setRepayAmount('');
      loadCommunityDetail(selected);
      if (fetchAllData) fetchAllData();
    } catch (err) { notify('error', err.message); }
    finally { setLoading(false); }
  };

  const isMember = (commId) => communities.some(c => c.id === commId);
  const myActiveLoan = loans.find(l => l.borrower_id === userId && l.status === 'disbursed');

  const statusColor = (s) => ({
    voting:   'bg-amber-100 text-amber-700',
    approved: 'bg-blue-100 text-blue-700',
    disbursed:'bg-purple-100 text-purple-700',
    repaid:   'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    defaulted:'bg-red-200 text-red-900',
  }[s] || 'bg-slate-100 text-slate-600');

  // ── VIEWS ─────────────────────────────────────────────────────────────
  if (view === 'create') {
    return (
      <div className="max-w-xl mx-auto space-y-6 animate-in fade-in">
        <Toast n={toast} />
        <button onClick={() => setView('list')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-sm transition-colors">
          <X size={16}/> Cancel
        </button>
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center">
              <Building2 size={20} className="text-indigo-600"/>
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-lg">Create Financial Community</h3>
              <p className="text-xs text-slate-500">Set up your group and define contribution rules</p>
            </div>
          </div>
          <form onSubmit={createCommunity} className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Community Name</label>
              <input required value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))}
                placeholder="e.g. Farmers Collective Nairobi"
                className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold outline-none focus:border-indigo-400"/>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Purpose / Category</label>
              <select required value={form.purpose} onChange={e => setForm(p=>({...p,purpose:e.target.value}))}
                className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold outline-none focus:border-indigo-400 bg-white">
                <option value="">Select purpose</option>
                {['Farmers','Traders','Women Entrepreneurs','Youth',
                  'Healthcare Workers','Teachers','Tech Startups',
                  'Refugees & Displaced Persons','Diaspora','Faith Community','General Savings'].map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Description (optional)</label>
              <textarea value={form.description} onChange={e => setForm(p=>({...p,description:e.target.value}))}
                rows={2} placeholder="What brings your community together?"
                className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold outline-none focus:border-indigo-400 resize-none"/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Contribution Amount ($)</label>
                <input type="number" min="1" required value={form.contribution_amount}
                  onChange={e => setForm(p=>({...p,contribution_amount:e.target.value}))}
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold outline-none focus:border-indigo-400"/>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Frequency</label>
                <select value={form.contribution_frequency} onChange={e => setForm(p=>({...p,contribution_frequency:e.target.value}))}
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold outline-none focus:border-indigo-400 bg-white">
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Max Members</label>
              <input type="number" min="3" max="200" required value={form.max_members}
                onChange={e => setForm(p=>({...p,max_members:e.target.value}))}
                className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold outline-none focus:border-indigo-400"/>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-indigo-600 text-white rounded-2xl py-4 font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin"/> : <Plus size={16}/>}
              Launch Community
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (view === 'community' && selected) {
    const pool = parseFloat(selected.pool_balance || 0);
    const myMem = members.find(m => m.user_id === userId);
    const maxLoan = ((myMem?.total_contributed || 0) * (selected.loan_limit_multiplier || 3));

    return (
      <div className="space-y-6 animate-in fade-in">
        <Toast n={toast} />
        <button onClick={() => { setView('list'); loadAll(); }}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-sm transition-colors">
          <X size={16}/> Back to Communities
        </button>

        {/* Community Header */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
          <Globe size={140} className="absolute -right-8 -bottom-8 opacity-5"/>
          <div className="relative z-10">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-1">{selected.purpose}</p>
                <h2 className="text-2xl font-black mb-2">{selected.name}</h2>
                {selected.description && <p className="text-sm text-slate-400 max-w-md">{selected.description}</p>}
              </div>
              <ScoreBadge score={selected.group_credit_score || 50}/>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-white/10 rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-1">Pool Balance</p>
                <p className="text-xl font-black">${pool.toLocaleString()}</p>
              </div>
              <div className="bg-white/10 rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-1">Members</p>
                <p className="text-xl font-black">{members.length} / {selected.max_members}</p>
              </div>
              <div className="bg-white/10 rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-1">Contribution</p>
                <p className="text-xl font-black">${selected.contribution_amount}<span className="text-xs text-slate-400 ml-1">/{selected.contribution_frequency}</span></p>
              </div>
            </div>
            {selected.ifb_matched && (
              <div className="mt-4 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl px-4 py-2 flex items-center gap-2">
                <Award size={14} className="text-emerald-400"/>
                <span className="text-xs font-black text-emerald-300">IFB matched ${selected.ifb_match_amount?.toLocaleString()} — External Funding Unlocked</span>
              </div>
            )}
          </div>
        </div>

        {/* Inner Tabs */}
        <div className="flex gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
          {[['overview','Overview'],['contribute','Contribute'],['request','Request Loan'],['loans','Loan Board'],['members','Members']].map(([k,l]) => (
            <button key={k} onClick={() => setInnerTab(k)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${innerTab===k ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {innerTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h4 className="font-black text-slate-800 flex items-center gap-2"><BarChart3 size={16} className="text-indigo-500"/> Group Credit Health</h4>
              {[
                ['Group Credit Score', selected.group_credit_score, 'indigo'],
                ['Repayment Score',    selected.repayment_score,    'emerald'],
                ['Default Risk',       selected.default_risk_score, 'red'],
              ].map(([label, val, color]) => (
                <div key={label}>
                  <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                    <span>{label}</span><span>{Math.round(val || 0)}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full bg-${color}-500 rounded-full transition-all`} style={{ width: `${val || 0}%` }}/>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-3">
              <h4 className="font-black text-slate-800 flex items-center gap-2"><Lock size={16} className="text-slate-500"/> Your Position</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between font-semibold text-slate-600">
                  <span>Your contributions</span>
                  <span className="font-black text-slate-900">${(myMem?.total_contributed || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-slate-600">
                  <span>Max loan available</span>
                  <span className="font-black text-indigo-700">${maxLoan.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-slate-600">
                  <span>Active loan</span>
                  <span className={`font-black ${myActiveLoan ? 'text-amber-600' : 'text-slate-400'}`}>
                    {myActiveLoan ? `$${parseFloat(myActiveLoan.amount).toFixed(2)}` : 'None'}
                  </span>
                </div>
                <div className="flex justify-between font-semibold text-slate-600">
                  <span>My repayment score</span>
                  <span className="font-black text-emerald-600">{Math.round(myMem?.repayment_score || 50)}</span>
                </div>
              </div>
              {selected.group_credit_score >= 70 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-start gap-2">
                  <Award size={14} className="text-emerald-600 mt-0.5"/>
                  <p className="text-xs text-emerald-700 font-bold">This community qualifies for IFB external funding &amp; donor matching.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CONTRIBUTE */}
        {innerTab === 'contribute' && (
          <div className="max-w-md mx-auto bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center">
                <Wallet size={18} className="text-emerald-600"/>
              </div>
              <div>
                <h4 className="font-black text-slate-900">Make Contribution</h4>
                <p className="text-xs text-slate-500">Your wallet: ${(balances?.liquid_usd || 0).toFixed(2)}</p>
              </div>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-center">
              <p className="text-xs text-indigo-600 font-bold mb-1">Contribution Amount</p>
              <p className="text-3xl font-black text-indigo-900">${selected.contribution_amount}</p>
              <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">{selected.contribution_frequency}</p>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              This amount is debited from your IFB wallet and added to the community pool. Your max loan eligibility grows 3× your total contributions.
            </p>
            <button onClick={contribute} disabled={loading || (balances?.liquid_usd || 0) < parseFloat(selected.contribution_amount)}
              className="w-full bg-emerald-600 text-white rounded-2xl py-4 font-black text-sm uppercase tracking-widest hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin"/> : <HandCoins size={16}/>}
              Contribute Now
            </button>
          </div>
        )}

        {/* REQUEST LOAN */}
        {innerTab === 'request' && (
          <div className="max-w-md mx-auto bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center">
                <HandCoins size={18} className="text-purple-600"/>
              </div>
              <div>
                <h4 className="font-black text-slate-900">Request Community Loan</h4>
                <p className="text-xs text-slate-500">Max eligible: <span className="font-black text-indigo-700">${maxLoan.toFixed(2)}</span></p>
              </div>
            </div>
            {myActiveLoan ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle size={16} className="text-amber-600 mt-0.5"/>
                <div>
                  <p className="text-sm font-black text-amber-800">Active loan exists</p>
                  <p className="text-xs text-amber-600 mt-1">Repay your current ${parseFloat(myActiveLoan.amount).toFixed(2)} loan before requesting a new one.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={requestLoan} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Loan Amount ($)</label>
                  <input type="number" min="1" max={maxLoan} required value={loanForm.amount}
                    onChange={e => setLoanForm(p=>({...p,amount:e.target.value}))}
                    placeholder={`Max $${maxLoan.toFixed(2)}`}
                    className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold outline-none focus:border-purple-400"/>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Purpose</label>
                  <input required value={loanForm.purpose}
                    onChange={e => setLoanForm(p=>({...p,purpose:e.target.value}))}
                    placeholder="e.g. Stock for harvest season"
                    className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold outline-none focus:border-purple-400"/>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Repayment Period</label>
                  <select value={loanForm.repayment_days} onChange={e => setLoanForm(p=>({...p,repayment_days:e.target.value}))}
                    className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold outline-none focus:border-purple-400 bg-white">
                    <option value="30">30 days</option>
                    <option value="60">60 days</option>
                    <option value="90">90 days</option>
                    <option value="180">180 days</option>
                  </select>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 text-xs text-slate-600 space-y-1">
                  <p className="font-black text-slate-700">How approval works:</p>
                  <p>• 3 community members must vote to approve</p>
                  <p>• Funds are auto-disbursed to your wallet instantly</p>
                  <p>• 0% interest — community spirit, not profit</p>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-purple-600 text-white rounded-2xl py-4 font-black text-sm uppercase tracking-widest hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <Loader2 size={16} className="animate-spin"/> : <ArrowUpRight size={16}/>}
                  Submit for Community Vote
                </button>
              </form>
            )}
          </div>
        )}

        {/* LOAN BOARD */}
        {innerTab === 'loans' && (
          <div className="space-y-4">
            {loans.length === 0 && (
              <div className="text-center py-12 text-slate-400 font-bold">
                <HandCoins size={40} className="mx-auto mb-3 opacity-30"/>
                No loan requests yet in this community.
              </div>
            )}
            {loans.map(loan => (
              <div key={loan.id} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-black text-slate-900">{loan.borrower_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">"{loan.purpose}"</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-slate-900">${parseFloat(loan.amount).toFixed(2)}</span>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${statusColor(loan.status)}`}>{loan.status}</span>
                  </div>
                </div>
                {loan.status === 'voting' && (
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                      <span>Votes For: <b className="text-emerald-600">{loan.votes_for}</b></span>
                      <span>Votes Against: <b className="text-red-500">{loan.votes_against}</b></span>
                      <span>Needed: {loan.votes_needed}</span>
                    </div>
                    {loan.borrower_id !== userId && (
                      <div className="flex gap-3">
                        <button onClick={() => voteLoan(loan.id, 'approve')} disabled={loading}
                          className="flex-1 bg-emerald-600 text-white rounded-xl py-2.5 font-black text-xs uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-1">
                          <CheckCircle2 size={14}/> Approve
                        </button>
                        <button onClick={() => voteLoan(loan.id, 'reject')} disabled={loading}
                          className="flex-1 bg-red-500 text-white rounded-xl py-2.5 font-black text-xs uppercase tracking-widest hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-1">
                          <X size={14}/> Reject
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {loan.status === 'disbursed' && loan.borrower_id === userId && (
                  <div className="flex gap-3 items-center">
                    <input type="number" min="1" value={repayAmount}
                      onChange={e => setRepayAmount(e.target.value)}
                      placeholder="Repay amount $"
                      className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-indigo-400"/>
                    <button onClick={() => repayLoan(loan.id)} disabled={loading}
                      className="bg-indigo-600 text-white rounded-xl px-5 py-2.5 font-black text-xs uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1">
                      {loading ? <Loader2 size={12} className="animate-spin"/> : <RefreshCw size={12}/>} Repay
                    </button>
                  </div>
                )}
                {loan.status === 'disbursed' && (
                  <div className="text-xs text-slate-500">
                    Repaid: <b className="text-slate-700">${parseFloat(loan.repaid_amount||0).toFixed(2)}</b> / ${parseFloat(loan.amount).toFixed(2)}
                    {loan.due_date && <span className="ml-3">Due: {new Date(loan.due_date).toLocaleDateString()}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* MEMBERS */}
        {innerTab === 'members' && (
          <div className="space-y-3">
            {members.map(m => (
              <div key={m.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <span className="text-indigo-700 font-black text-sm">{(m.profiles?.full_name||'?')[0].toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="font-black text-slate-900 text-sm">{m.profiles?.full_name || 'Member'}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{m.role} · {new Date(m.joined_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-900">${parseFloat(m.total_contributed||0).toFixed(2)}</p>
                  <p className="text-[10px] text-slate-500 font-bold">contributed</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── MAIN LIST VIEW ────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in pb-20">
      <Toast n={toast} />

      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 rounded-[3rem] p-10 text-white shadow-xl relative overflow-hidden">
        <Users size={180} className="absolute -right-10 -bottom-10 opacity-5"/>
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-2">IFB Community Capital System</p>
          <h2 className="text-3xl font-black tracking-tight mb-2">Community Loan Network</h2>
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
            Pool capital with your community. Access microloans backed by peer trust — not banks.
            High-performing groups unlock IFB matching funds, donor grants, and institutional credit lines.
          </p>
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-white/10 rounded-2xl p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-1">My Communities</p>
              <p className="text-2xl font-black">{myStats.communities}</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-1">Total Pool</p>
              <p className="text-2xl font-black">${parseFloat(myStats.total_pool||0).toFixed(0)}</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-1">Active Loans</p>
              <p className="text-2xl font-black">{myStats.active_loans}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={() => setView('create')}
          className="flex-1 bg-indigo-600 text-white rounded-2xl py-3.5 font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-sm">
          <Plus size={14}/> Create Community
        </button>
        <button onClick={loadAll} disabled={loading}
          className="bg-white border border-slate-200 text-slate-600 rounded-2xl px-4 py-3.5 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-colors shadow-sm">
          {loading ? <Loader2 size={14} className="animate-spin"/> : <RefreshCw size={14}/>}
        </button>
      </div>

      {/* My Communities */}
      {communities.length > 0 && (
        <section>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
            <Star size={12}/> My Communities
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {communities.map(c => (
              <button key={c.id} onClick={() => loadCommunityDetail(c)}
                className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all text-left group">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-0.5">{c.purpose}</p>
                    <p className="font-black text-slate-900">{c.name}</p>
                  </div>
                  <ScoreBadge score={c.group_credit_score||50}/>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Pool</p>
                    <p className="font-black text-slate-800">${parseFloat(c.pool_balance||0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Contribution</p>
                    <p className="font-black text-slate-800">${c.contribution_amount}/{c.contribution_frequency}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs font-bold text-slate-500">
                    <Users size={12}/> {c.max_members} max
                  </div>
                  <ChevronRight size={16} className="text-slate-400 group-hover:text-indigo-600 transition-colors"/>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Discover All Communities */}
      <section>
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
          <Globe size={12}/> Discover Communities
        </h3>
        {loading && <div className="text-center py-6"><Loader2 className="animate-spin mx-auto text-indigo-400"/></div>}
        <div className="space-y-3">
          {allCommunities.filter(c => !isMember(c.id)).map(c => (
            <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-black text-slate-900 truncate">{c.name}</p>
                  <ScoreBadge score={c.group_credit_score||50}/>
                </div>
                <p className="text-xs text-slate-500 font-semibold">{c.purpose} · ${c.contribution_amount}/{c.contribution_frequency} · Pool ${parseFloat(c.pool_balance||0).toFixed(0)}</p>
              </div>
              <button onClick={() => joinCommunity(c.id)} disabled={loading}
                className="bg-indigo-600 text-white rounded-xl px-4 py-2 font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-1 shrink-0">
                <UserPlus size={12}/> Join
              </button>
            </div>
          ))}
          {allCommunities.filter(c => !isMember(c.id)).length === 0 && !loading && (
            <p className="text-center text-slate-400 font-bold py-6 text-sm">
              {allCommunities.length === 0 ? 'No communities yet — be the first to create one.' : 'You have joined all available communities.'}
            </p>
          )}
        </div>
      </section>

      {/* IFB Value Banner */}
      <div className="bg-gradient-to-r from-emerald-50 to-indigo-50 border border-emerald-200 rounded-3xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">
            <TrendingUp size={18} className="text-emerald-600"/>
          </div>
          <div>
            <p className="font-black text-slate-900 mb-1">How communities unlock external funding</p>
            <p className="text-xs text-slate-600 leading-relaxed">Communities with a Credit Score above 70 can apply for IFB Capital Matching, donor grants, and institutional credit lines through the IFB Capital Network. Each repayment builds your group reputation permanently on the IFB ledger.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
