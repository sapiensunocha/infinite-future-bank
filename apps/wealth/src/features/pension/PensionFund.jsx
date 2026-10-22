import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabaseClient';
import { TrendingUp, Plus, Clock, ChevronRight, CheckCircle, AlertCircle, PiggyBank, Target, Calendar, DollarSign, BarChart3, ArrowDownLeft } from 'lucide-react';

const ANNUAL_RETURN = 0.07; // 7% projected annual growth
const IFB_FEE = 0.005;      // 0.5% management fee

function calcProjection(currentBalance, monthlyContrib, yearsLeft) {
  const r = (ANNUAL_RETURN - IFB_FEE) / 12;
  const n = yearsLeft * 12;
  const fv = currentBalance * Math.pow(1 + r, n) + monthlyContrib * ((Math.pow(1 + r, n) - 1) / r);
  return Math.round(fv);
}

function fmt(val) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);
}

function ProgressBar({ pct, color = 'bg-blue-500' }) {
  return (
    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

export default function PensionFund({ session, balances, fetchAllData }) {
  const [account, setAccount] = useState(null);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('HOME');
  const [contribAmount, setContribAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Enrollment form
  const [enrollForm, setEnrollForm] = useState({
    contribution_amount: '100',
    frequency: 'monthly',
    retirement_age: '65',
    birth_year: new Date().getFullYear() - 30,
  });

  const notify = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const { data: acc } = await supabase
      .from('pension_accounts')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle();
    setAccount(acc);

    if (acc) {
      const { data: contribs } = await supabase
        .from('pension_contributions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setContributions(contribs || []);
    }
    setLoading(false);
  }, [session.user.id]);

  useEffect(() => { load(); }, [load]);

  const handleEnroll = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.from('pension_accounts').insert({
        user_id: session.user.id,
        contribution_amount: parseFloat(enrollForm.contribution_amount),
        frequency: enrollForm.frequency,
        retirement_age: parseInt(enrollForm.retirement_age),
        birth_year: parseInt(enrollForm.birth_year),
      });
      if (error) throw error;
      notify('Pension account opened successfully!');
      await load();
      setView('HOME');
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleContribute = async () => {
    const amount = parseFloat(contribAmount);
    if (!amount || amount <= 0) return notify('Enter a valid amount', 'error');
    if (amount > (balances?.liquid_usd || 0)) return notify('Insufficient balance', 'error');
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('make_pension_contribution', {
        p_user_id: session.user.id,
        p_amount: amount,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      notify(`$${amount.toFixed(2)} contributed to your pension`);
      setContribAmount('');
      await Promise.all([load(), fetchAllData()]);
      setView('HOME');
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentYear = new Date().getFullYear();
  const yearsLeft = account
    ? Math.max(0, (account.birth_year + account.retirement_age) - currentYear)
    : 30;
  const projected = account
    ? calcProjection(account.current_balance, account.contribution_amount, yearsLeft)
    : 0;
  const progressPct = projected > 0 ? (account?.current_balance / projected) * 100 : 0;

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl text-white text-sm font-bold shadow-xl animate-in slide-in-from-top-2 ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
          {toast.msg}
        </div>
      )}

      {/* HERO */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 rounded-[2rem] p-8 text-white shadow-2xl">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/5 rounded-full" />
        <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-white/5 rounded-full" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <PiggyBank size={22} className="text-blue-200" />
            </div>
            <span className="text-blue-200 text-xs font-black uppercase tracking-widest">IFB Pension Fund</span>
          </div>
          {account ? (
            <>
              <p className="text-blue-300 text-xs mt-4 mb-1">Current Balance</p>
              <p className="text-4xl font-black tracking-tight">{fmt(account.current_balance)}</p>
              <p className="text-blue-300 text-xs mt-3">
                Projected at retirement ({yearsLeft}y): <span className="text-white font-bold">{fmt(projected)}</span>
              </p>
              <div className="mt-4">
                <ProgressBar pct={progressPct} color="bg-blue-400" />
                <p className="text-blue-300 text-[10px] mt-1">{progressPct.toFixed(1)}% of retirement target</p>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-black mt-4 leading-tight">Your future,<br />secured today.</h2>
              <p className="text-blue-300 text-sm mt-2 leading-relaxed">7% projected annual growth. Open your IFB pension in 60 seconds.</p>
            </>
          )}
        </div>
      </div>

      {!account ? (
        /* ── ENROLLMENT ── */
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 space-y-6">
          <h3 className="text-lg font-black text-slate-800">Open Your Pension Account</h3>

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: TrendingUp, title: '7% Annual Growth', sub: 'Compound interest working for you' },
              { icon: CheckCircle, title: 'Tax Advantaged', sub: 'Contributions reduce taxable income' },
              { icon: Target, title: 'Custom Goals', sub: 'Set your own retirement target' },
              { icon: Clock, title: 'Flexible Contributions', sub: 'Monthly, quarterly, or annual' },
            ].map(({ icon: Icon, title, sub }) => (
              <div key={title} className="bg-slate-50 rounded-2xl p-4">
                <Icon size={18} className="text-blue-600 mb-2" />
                <p className="text-xs font-black text-slate-800">{title}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleEnroll} className="space-y-4">
            <div>
              <label className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2 block">Monthly Contribution ($)</label>
              <input
                type="number" min="10" step="10" required
                value={enrollForm.contribution_amount}
                onChange={e => setEnrollForm(p => ({ ...p, contribution_amount: e.target.value }))}
                className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 font-bold focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="100"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2 block">Frequency</label>
                <select
                  value={enrollForm.frequency}
                  onChange={e => setEnrollForm(p => ({ ...p, frequency: e.target.value }))}
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 font-bold focus:outline-none focus:border-blue-400 bg-white"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2 block">Retirement Age</label>
                <input
                  type="number" min="50" max="80" required
                  value={enrollForm.retirement_age}
                  onChange={e => setEnrollForm(p => ({ ...p, retirement_age: e.target.value }))}
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 font-bold focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2 block">Birth Year</label>
              <input
                type="number" min="1950" max={new Date().getFullYear() - 18} required
                value={enrollForm.birth_year}
                onChange={e => setEnrollForm(p => ({ ...p, birth_year: e.target.value }))}
                className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 font-bold focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Projection preview */}
            {enrollForm.contribution_amount && enrollForm.birth_year && enrollForm.retirement_age && (() => {
              const yrs = Math.max(0, (parseInt(enrollForm.birth_year) + parseInt(enrollForm.retirement_age)) - currentYear);
              const proj = calcProjection(0, parseFloat(enrollForm.contribution_amount), yrs);
              return (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                  <p className="text-xs text-blue-600 font-medium">At {enrollForm.retirement_age} years old ({yrs} years from now):</p>
                  <p className="text-2xl font-black text-blue-700 mt-1">{fmt(proj)}</p>
                  <p className="text-[10px] text-blue-500 mt-1">Based on 7% annual growth, 0.5% management fee</p>
                </div>
              );
            })()}

            <button
              type="submit" disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-colors disabled:opacity-60"
            >
              {submitting ? 'Opening Account…' : 'Open Pension Account'}
            </button>
          </form>
        </div>
      ) : (
        /* ── DASHBOARD ── */
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm p-5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Contributed</p>
              <p className="text-xl font-black text-slate-800">{fmt(account.total_contributed)}</p>
            </div>
            <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm p-5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Years to Retire</p>
              <p className="text-xl font-black text-slate-800">{yearsLeft} <span className="text-sm text-slate-400 font-medium">years</span></p>
            </div>
            <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm p-5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Monthly Target</p>
              <p className="text-xl font-black text-slate-800">{fmt(account.contribution_amount)}</p>
            </div>
            <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm p-5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Projected Value</p>
              <p className="text-xl font-black text-emerald-600">{fmt(projected)}</p>
            </div>
          </div>

          {/* Contribute */}
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Plus size={18} className="text-blue-600" />
              <h4 className="font-black text-slate-800">Make a Contribution</h4>
            </div>
            <div className="flex gap-3">
              {[50, 100, 250, 500].map(amt => (
                <button
                  key={amt}
                  onClick={() => setContribAmount(String(amt))}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-colors border ${
                    contribAmount === String(amt)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-slate-200 text-slate-700 hover:border-blue-300'
                  }`}
                >
                  ${amt}
                </button>
              ))}
            </div>
            <input
              type="number" min="1" placeholder="Custom amount"
              value={contribAmount}
              onChange={e => setContribAmount(e.target.value)}
              className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 font-bold focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <button
              onClick={handleContribute} disabled={submitting || !contribAmount}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-colors disabled:opacity-50"
            >
              {submitting ? 'Processing…' : `Contribute ${contribAmount ? fmt(parseFloat(contribAmount)) : ''}`}
            </button>
          </div>

          {/* Contribution history */}
          {contributions.length > 0 && (
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
              <h4 className="font-black text-slate-800 mb-4">Contribution History</h4>
              <div className="space-y-3">
                {contributions.map(c => (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                        <ArrowDownLeft size={14} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 capitalize">{c.source} contribution</p>
                        <p className="text-[10px] text-slate-400">{new Date(c.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <p className="text-sm font-black text-emerald-600">+{fmt(c.amount)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
