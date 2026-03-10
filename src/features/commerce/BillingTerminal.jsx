import React, { useState, useEffect } from 'react';
import { FileText, Plus, AlertCircle, CheckCircle2, Copy, Send } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

export default function BillingTerminal({ session }) {
  const [bills, setBills] = useState([]);
  const [showCreate, setShowCreate] = useState(false);

  // Fetch all bills created by this user
  const loadBills = async () => {
    const { data } = await supabase.from('ifb_bills').select('*').eq('creator_id', session.user.id).order('created_at', { ascending: false });
    setBills(data || []);
  };

  useEffect(() => { loadBills(); }, []);

  return (
    <div className="p-4 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      {/* Header Stat Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase">Pending</p>
          <p className="text-2xl font-black text-orange-500">${bills.filter(b => b.status === 'pending').reduce((acc, b) => acc + b.amount, 0)}</p>
        </div>
        <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase">Collected</p>
          <p className="text-2xl font-black text-emerald-500">${bills.filter(b => b.status === 'paid').reduce((acc, b) => acc + b.amount, 0)}</p>
        </div>
      </div>

      {/* List of Invoices */}
      <div className="bg-white/70 backdrop-blur-md rounded-[2.5rem] p-6 border border-white shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-black text-lg">Receivables</h3>
          <button onClick={() => setShowCreate(true)} className="bg-blue-600 p-3 rounded-2xl text-white hover:scale-105 transition-transform"><Plus size={20}/></button>
        </div>

        <div className="space-y-4">
          {bills.map(bill => (
            <div key={bill.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-50 shadow-sm">
              <div>
                <p className="font-black text-sm">{bill.customer_email}</p>
                <p className="text-[10px] text-slate-400 uppercase font-bold">{bill.description}</p>
              </div>
              <div className="text-right">
                <p className="font-black text-blue-600">${bill.amount}</p>
                <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase ${bill.status === 'paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                  {bill.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}