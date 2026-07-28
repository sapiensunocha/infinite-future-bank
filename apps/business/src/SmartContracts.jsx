import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Plus, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from './services/supabaseClient';

const ESCROW_FEE_PCT = 0.005; // 0.5% IFB platform fee on locked amount

export default function SmartContracts({ session, balances, fetchAllData }) {
  const [contracts, setContracts] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', amount: '', providerEmail: '' });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { fetchContracts(); }, []);

  const fetchContracts = async () => {
    const { data } = await supabase
      .from('smart_contracts')
      .select('*')
      .or(`creator_id.eq.${session.user.id},provider_email.eq.${session.user.email}`)
      .order('created_at', { ascending: false });
    if (data) setContracts(data);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) return alert('Enter a valid amount.');

    const fee = parseFloat((amount * ESCROW_FEE_PCT).toFixed(2));
    const total = parseFloat((amount + fee).toFixed(2));

    if (total > (balances?.liquid_usd || 0)) {
      return alert(`Insufficient funds. Need $${total.toFixed(2)} ($${amount.toFixed(2)} locked + $${fee.toFixed(2)} escrow fee).`);
    }

    setIsLoading(true);
    try {
      // Atomic deduction with .gte() — prevents overdraft under concurrent writes
      const { data: updated, error: balErr } = await supabase
        .from('balances')
        .update({
          liquid_usd: balances.liquid_usd - total,
          escrow_usd: (balances.escrow_usd || 0) + amount,
        })
        .eq('user_id', session.user.id)
        .gte('liquid_usd', total)
        .select('liquid_usd');

      if (balErr || !updated?.length) throw new Error('Insufficient funds or concurrent transaction detected. Try again.');

      const { error: contractErr } = await supabase.from('smart_contracts').insert([{
        creator_id: session.user.id,
        title: form.title,
        description: form.description,
        amount,
        platform_fee: fee,
        provider_email: form.providerEmail,
        status: 'active_locked',
      }]);

      if (contractErr) {
        // Rollback on contract insert failure
        await supabase.from('balances')
          .update({ liquid_usd: balances.liquid_usd, escrow_usd: balances.escrow_usd || 0 })
          .eq('user_id', session.user.id);
        throw new Error('Contract creation failed. Balance restored.');
      }

      // Log 0.5% escrow fee as IFB revenue
      await supabase.from('transactions').insert({
        user_id: session.user.id,
        transaction_type: 'escrow_fee',
        amount: fee,
        status: 'completed',
        description: `Smart Contract Escrow Fee (0.5%) — ${form.title}`,
      });

      setShowNew(false);
      setForm({ title: '', description: '', amount: '', providerEmail: '' });
      await Promise.all([fetchAllData(), fetchContracts()]);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRelease = async (id) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('release_smart_contract', { p_contract_id: id });
      if (error) throw error;
      await Promise.all([fetchAllData(), fetchContracts()]);
    } catch (err) {
      alert('Release failed: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const previewFee = form.amount && parseFloat(form.amount) > 0
    ? parseFloat((parseFloat(form.amount) * ESCROW_FEE_PCT).toFixed(2)) : 0;
  const previewTotal = parseFloat(form.amount || 0) + previewFee;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Smart Contracts</h2>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Trustless Escrow Agreements · 0.5% Platform Fee</p>
        </div>
        <button
          onClick={() => setShowNew(!showNew)}
          className="bg-blue-600 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-blue-500 shadow-md"
        >
          <Plus size={16}/> New Agreement
        </button>
      </div>

      {showNew && (
        <form onSubmit={handleCreate} className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl text-white space-y-4 animate-in slide-in-from-top-4">
          <h3 className="font-black mb-2 flex items-center gap-2">
            <Lock size={18} className="text-amber-400"/> Initialize & Lock Funds
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              required type="text" placeholder="Service / Milestone Title"
              value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              className="bg-slate-800 border border-slate-700 p-4 rounded-xl outline-none font-bold text-sm"
            />
            <input
              required type="email" placeholder="Provider's Email Address"
              value={form.providerEmail} onChange={e => setForm({ ...form, providerEmail: e.target.value })}
              className="bg-slate-800 border border-slate-700 p-4 rounded-xl outline-none font-bold text-sm"
            />
          </div>
          <textarea
            required placeholder="Condition of Release (What must be delivered?)"
            value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 p-4 rounded-xl outline-none font-bold text-sm h-24"
          />
          <input
            required type="number" min="1" step="0.01" placeholder="Amount to Lock in USD"
            value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 p-4 rounded-xl outline-none font-black text-2xl text-center"
          />

          {previewFee > 0 && (
            <div className="bg-slate-800 rounded-2xl p-4 space-y-2 border border-slate-700">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Locked in Escrow</span>
                <span className="font-bold">${parseFloat(form.amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">IFB Escrow Fee (0.5%)</span>
                <span className="font-bold text-amber-400">${previewFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-slate-700 pt-2">
                <span className="font-black text-white">Total Deducted</span>
                <span className="font-black text-white">${previewTotal.toFixed(2)}</span>
              </div>
            </div>
          )}

          <button
            type="submit" disabled={isLoading}
            className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isLoading
              ? <><Loader2 size={16} className="animate-spin"/> Processing…</>
              : <><ShieldCheck size={16}/> Sign & Lock Capital</>}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4">
        {contracts.map(c => {
          const isCreator = c.creator_id === session.user.id;
          return (
            <div key={c.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-black text-slate-800">{c.title}</h4>
                  {c.status === 'active_locked'
                    ? <span className="bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded">Locked</span>
                    : <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded">Completed</span>}
                </div>
                <p className="text-xs font-bold text-slate-400">
                  Role: {isCreator ? 'Requestor (Payer)' : 'Provider (Payee)'} · Counterparty: {isCreator ? c.provider_email : 'Verified Requestor'}
                </p>
                {c.platform_fee > 0 && (
                  <p className="text-[10px] text-slate-400 mt-0.5">Escrow fee: ${c.platform_fee?.toFixed(2)}</p>
                )}
                <p className="text-sm text-slate-600 mt-2 font-medium bg-slate-50 p-2 rounded border border-slate-100">{c.description}</p>
              </div>
              <div className="text-right w-full md:w-auto shrink-0">
                <p className="text-2xl font-black text-slate-800 mb-2">${c.amount}</p>
                {c.status === 'active_locked' && isCreator && (
                  <button
                    onClick={() => handleRelease(c.id)} disabled={isLoading}
                    className="w-full md:w-auto bg-emerald-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 flex items-center justify-center gap-1 disabled:opacity-60"
                  >
                    <Unlock size={14}/> Accept & Release
                  </button>
                )}
                {c.status === 'active_locked' && !isCreator && (
                  <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1">
                    <Lock size={12}/> Awaiting Requestor
                  </p>
                )}
              </div>
            </div>
          );
        })}
        {contracts.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-10">No active contracts found.</p>
        )}
      </div>
    </div>
  );
}
