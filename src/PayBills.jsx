import React, { useState, useEffect } from 'react';
import { Search, Receipt, CheckCircle2, Landmark } from 'lucide-react';
import { supabase } from './services/supabaseClient';

export default function PayBills({ session, balances, fetchAllData }) {
  const [billers, setBillers] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedBiller, setSelectedBiller] = useState(null);
  const [accountNo, setAccountNo] = useState('');
  const [amount, setAmount] = useState('');
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    supabase.from('billers').select('*').then(({ data }) => setBillers(data || []));
  }, []);

  const filteredBillers = billers.filter(b => b.biller_name.toLowerCase().includes(search.toLowerCase()));

  const handlePay = async (e) => {
    e.preventDefault();
    if (parseFloat(amount) > balances.liquid_usd) return alert("Insufficient funds.");
    
    // Deduct Balance & Record Transaction
    await supabase.from('transactions').insert([{
      user_id: session.user.id,
      amount: -parseFloat(amount),
      transaction_type: 'bill_payment',
      description: `Payment to ${selectedBiller.biller_name} (Acc: ${accountNo})`,
      status: 'completed'
    }]);

    setReceipt({ biller: selectedBiller.biller_name, amount, ref: `TX-${Math.floor(Math.random()*1000000)}` });
    await fetchAllData();
  };

  if (receipt) return (
    <div className="text-center py-20 animate-in zoom-in-95">
      <CheckCircle2 size={64} className="mx-auto text-emerald-500 mb-4"/>
      <h2 className="text-3xl font-black text-slate-800 mb-2">Payment Successful</h2>
      <div className="bg-slate-50 p-6 rounded-3xl max-w-sm mx-auto text-left border border-slate-200 mt-6 shadow-sm">
        <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-4 border-b pb-2">Official Receipt</p>
        <div className="space-y-2 font-bold text-sm text-slate-800">
          <div className="flex justify-between"><span className="text-slate-500">Biller</span> <span>{receipt.biller}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Amount</span> <span className="text-emerald-600">${receipt.amount}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Ref Code</span> <span>{receipt.ref}</span></div>
        </div>
      </div>
      <button onClick={() => { setReceipt(null); setSelectedBiller(null); setAmount(''); setAccountNo(''); }} className="mt-8 text-blue-600 font-black text-sm uppercase tracking-widest hover:underline">Pay Another Bill</button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden">
        <Receipt size={100} className="absolute right-4 -top-4 opacity-10" />
        <h2 className="text-2xl font-black mb-2 relative z-10">Pay Utilities & Vendors</h2>
        <p className="text-sm text-slate-400 relative z-10">Instantly route capital to verified institutional billers.</p>
      </div>

      {!selectedBiller ? (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="relative mb-6">
            <Search className="absolute left-4 top-4 text-slate-400" size={20}/>
            <input type="text" placeholder="Search billers (e.g., Senelec, Starlink)..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-4 pl-12 rounded-2xl font-bold outline-none focus:border-blue-500 transition-all"/>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredBillers.map(b => (
              <button key={b.id} onClick={() => setSelectedBiller(b)} className="text-left p-4 rounded-2xl border border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500"><Landmark size={20}/></div>
                <div>
                  <p className="font-black text-slate-800">{b.biller_name}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{b.category}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <form onSubmit={handlePay} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm max-w-lg mx-auto space-y-6 animate-in slide-in-from-right-4">
          <div className="flex justify-between items-center border-b pb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Paying</p>
              <h3 className="text-xl font-black text-slate-800">{selectedBiller.biller_name}</h3>
            </div>
            <button type="button" onClick={() => setSelectedBiller(null)} className="text-xs font-bold text-blue-600 hover:underline">Change</button>
          </div>
          <input required type="text" value={accountNo} onChange={e=>setAccountNo(e.target.value)} placeholder="Account / Meter Number" className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 font-bold outline-none focus:border-blue-500" />
          <input required type="number" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Amount (USD)" className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 font-black text-2xl outline-none focus:border-blue-500 text-center" />
          <button type="submit" className="w-full bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest p-5 rounded-xl hover:bg-blue-500 transition-all shadow-lg">Confirm & Pay</button>
        </form>
      )}
    </div>
  );
}