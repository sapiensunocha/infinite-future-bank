import React, { useState } from 'react';
import { Send, Calendar, Clock, CheckCircle, AlertCircle, FileText } from 'lucide-react';

export default function BillingSystem({ session }) {
  const [billData, setBillData] = useState({ email: '', amount: '', desc: '', recurring: 'none' });

  const handleCreateBill = async () => {
    // Logic to insert into 'ifb_bills'
    // If recurring is set, a background edge function will trigger the charge
    alert("Invoice generated and scheduled for " + billData.email);
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-8 border border-white shadow-xl">
        <h3 className="text-xl font-black mb-6 flex items-center gap-2">
          <FileText className="text-blue-600" /> Professional Billing
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input 
            type="email" placeholder="Customer Email" 
            className="p-4 rounded-2xl bg-slate-50 border-none outline-none font-bold"
            onChange={e => setBillData({...billData, email: e.target.value})}
          />
          <input 
            type="number" placeholder="Amount (AFR/USD)" 
            className="p-4 rounded-2xl bg-slate-50 border-none outline-none font-bold"
            onChange={e => setBillData({...billData, amount: e.target.value})}
          />
        </div>

        <div className="mt-4 flex gap-2">
          {['none', 'weekly', 'monthly'].map(interval => (
            <button 
              key={interval}
              onClick={() => setBillData({...billData, recurring: interval})}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${billData.recurring === interval ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}
            >
              {interval === 'none' ? 'One-time' : interval}
            </button>
          ))}
        </div>

        <button onClick={handleCreateBill} className="w-full mt-6 bg-slate-900 text-white p-5 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-2">
          <Send size={18} /> Deploy Invoice
        </button>
      </div>
    </div>
  );
}