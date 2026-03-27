import React, { useState, useEffect } from 'react';
import { FileCode, Lock, Unlock, Plus } from 'lucide-react';
import { supabase } from './services/supabaseClient';

export default function SmartContracts({ session, balances, fetchAllData }) {
  const [contracts, setContracts] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', amount: '', providerEmail: '' });

  useEffect(() => { fetchContracts(); }, []);

  const fetchContracts = async () => {
    const { data } = await supabase.from('smart_contracts').select('*').or(`creator_id.eq.${session.user.id},provider_email.eq.${session.user.email}`);
    if (data) setContracts(data);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (parseFloat(form.amount) > balances.liquid_usd) return alert("Insufficient funds to lock this contract.");
    
    // 1. Deduct Liquid, Add to Escrow
    await supabase.from('balances').update({ 
      liquid_usd: balances.liquid_usd - parseFloat(form.amount),
      escrow_usd: balances.escrow_usd + parseFloat(form.amount) 
    }).eq('user_id', session.user.id);

    // 2. Create Contract (Locked State)
    await supabase.from('smart_contracts').insert([{
      creator_id: session.user.id, title: form.title, description: form.description,
      amount: parseFloat(form.amount), provider_email: form.providerEmail, status: 'active_locked'
    }]);

    setShowNew(false); setForm({ title: '', description: '', amount: '', providerEmail: '' });
    await fetchAllData(); fetchContracts();
  };

  const handleRelease = async (id) => {
    await supabase.rpc('release_smart_contract', { p_contract_id: id });
    alert("Funds officially released to the provider.");
    await fetchAllData(); fetchContracts();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Smart Contracts</h2>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Trustless Escrow Agreements</p>
        </div>
        <button onClick={() => setShowNew(!showNew)} className="bg-blue-600 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-blue-500 shadow-md">
          <Plus size={16}/> New Agreement
        </button>
      </div>

      {showNew && (
        <form onSubmit={handleCreate} className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl text-white space-y-4 animate-in slide-in-from-top-4">
          <h3 className="font-black mb-2 flex items-center gap-2"><Lock size={18} className="text-amber-400"/> Initialize & Lock Funds</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input required type="text" placeholder="Service / Milestone Title" value={form.title} onChange={e=>setForm({...form, title: e.target.value})} className="bg-slate-800 border border-slate-700 p-4 rounded-xl outline-none font-bold text-sm" />
            <input required type="email" placeholder="Provider's Email Address" value={form.providerEmail} onChange={e=>setForm({...form, providerEmail: e.target.value})} className="bg-slate-800 border border-slate-700 p-4 rounded-xl outline-none font-bold text-sm" />
          </div>
          <textarea required placeholder="Condition of Release (What must be delivered?)" value={form.description} onChange={e=>setForm({...form, description: e.target.value})} className="w-full bg-slate-800 border border-slate-700 p-4 rounded-xl outline-none font-bold text-sm h-24" />
          <input required type="number" placeholder="Amount to Lock in USD" value={form.amount} onChange={e=>setForm({...form, amount: e.target.value})} className="w-full bg-slate-800 border border-slate-700 p-4 rounded-xl outline-none font-black text-2xl text-center" />
          <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-emerald-500 transition-colors">Sign & Lock Capital</button>
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
                  {c.status === 'active_locked' ? <span className="bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded">Locked</span> : <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded">Completed</span>}
                </div>
                <p className="text-xs font-bold text-slate-400">Role: {isCreator ? 'Requestor (Payer)' : 'Provider (Payee)'} • Counterparty: {isCreator ? c.provider_email : 'Verified Requestor'}</p>
                <p className="text-sm text-slate-600 mt-2 font-medium bg-slate-50 p-2 rounded border border-slate-100">{c.description}</p>
              </div>
              <div className="text-right w-full md:w-auto shrink-0">
                <p className="text-2xl font-black text-slate-800 mb-2">${c.amount}</p>
                {c.status === 'active_locked' && isCreator && (
                  <button onClick={() => handleRelease(c.id)} className="w-full md:w-auto bg-emerald-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 flex items-center justify-center gap-1"><Unlock size={14}/> Accept & Release</button>
                )}
                {c.status === 'active_locked' && !isCreator && (
                  <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1"><Lock size={12}/> Awaiting Requestor</p>
                )}
              </div>
            </div>
          )
        })}
        {contracts.length === 0 && <p className="text-sm text-slate-500 text-center py-10">No active contracts found.</p>}
      </div>
    </div>
  );
}