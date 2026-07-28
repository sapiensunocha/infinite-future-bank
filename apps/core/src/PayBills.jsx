import React, { useState, useEffect } from 'react';
import { Search, Receipt, CheckCircle2, Landmark, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { supabase } from './services/supabaseClient';

export default function PayBills({ session, balances, fetchAllData }) {
  const [billers, setBillers] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedBiller, setSelectedBiller] = useState(null);
  
  // Payment Form States
  const [accountNo, setAccountNo] = useState('');
  const [amount, setAmount] = useState('');
  
  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [receipt, setReceipt] = useState(null);

  // 1. REAL DATABASE FETCH
  useEffect(() => {
    const fetchBillers = async () => {
      const { data, error } = await supabase
        .from('billers')
        .select('*')
        .eq('status', 'active')
        .order('biller_name', { ascending: true });
        
      if (!error && data) setBillers(data);
    };
    fetchBillers();
  }, []);

  const filteredBillers = billers.filter(b => 
    b.biller_name.toLowerCase().includes(search.toLowerCase()) || 
    b.category.toLowerCase().includes(search.toLowerCase())
  );

  // 2. SECURE ATOMIC PAYMENT ENGINE
  const handlePay = async (e) => {
    e.preventDefault();
    setError(null);
    const payAmount = parseFloat(amount);

    if (payAmount <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }
    if (payAmount > balances.liquid_usd) {
      setError("Insufficient liquid capital for this transaction.");
      return;
    }

    setIsLoading(true);

    try {
      // Execute the secure SQL RPC function we created
      const { error: rpcError } = await supabase.rpc('process_bill_payment', {
        p_user_id: session.user.id,
        p_amount: payAmount,
        p_biller_name: selectedBiller.biller_name,
        p_account_no: accountNo
      });

      if (rpcError) throw rpcError;

      // Generate Official Receipt
      const refCode = `IFB-BP-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      setReceipt({ 
        biller: selectedBiller.biller_name, 
        accountNo: accountNo,
        amount: payAmount.toFixed(2), 
        ref: refCode,
        date: new Date().toLocaleString()
      });

      // Synchronize entire app dashboard
      await fetchAllData();

    } catch (err) {
      console.error(err);
      setError(err.message || "Network validation failed. Transaction aborted.");
    } finally {
      setIsLoading(false);
    }
  };

  // 3. OFFICIAL RECEIPT VIEW
  if (receipt) return (
    <div className="text-center py-12 animate-in zoom-in-95 duration-500">
      <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-emerald-100 shadow-inner">
        <CheckCircle2 size={48} className="text-emerald-500" />
      </div>
      <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Remittance Cleared</h2>
      <p className="text-slate-500 text-sm font-medium mb-8">The funds have been securely routed to the vendor.</p>
      
      <div className="bg-white p-8 rounded-[2rem] max-w-md mx-auto text-left border border-slate-200 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-2 bg-emerald-500"></div>
        <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-6 border-b border-slate-100 pb-4 flex justify-between items-center">
          Official Ledger Receipt
          <ShieldCheck size={16} className="text-emerald-500"/>
        </p>
        
        <div className="space-y-4 font-bold text-sm text-slate-800">
          <div className="flex justify-between items-end">
            <span className="text-slate-500 text-xs">Vendor Identity</span> 
            <span className="text-right">{receipt.biller}</span>
          </div>
          <div className="flex justify-between items-end">
            <span className="text-slate-500 text-xs">Account / Ref</span> 
            <span className="text-right">{receipt.accountNo}</span>
          </div>
          <div className="flex justify-between items-end">
            <span className="text-slate-500 text-xs">Timestamp</span> 
            <span className="text-right text-xs">{receipt.date}</span>
          </div>
          <div className="flex justify-between items-end pt-4 border-t border-dashed border-slate-200">
            <span className="text-slate-500 text-xs">Total Settled</span> 
            <span className="text-2xl font-black text-emerald-600">${receipt.amount}</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl mt-6 text-center border border-slate-100">
            <p className="text-[8px] font-mono text-slate-400 break-all">{receipt.ref}</p>
          </div>
        </div>
      </div>
      
      <button 
        onClick={() => { setReceipt(null); setSelectedBiller(null); setAmount(''); setAccountNo(''); }} 
        className="mt-8 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
      >
        Process Another Bill
      </button>
    </div>
  );

  // 4. MAIN UI RENDERER
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
      
      {/* HEADER */}
      <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-xl">
        <Receipt size={140} className="absolute -right-6 -bottom-6 opacity-10 rotate-12" />
        <div className="relative z-10">
          <h2 className="text-3xl font-black mb-2 tracking-tight">Corporate Payables</h2>
          <p className="text-sm text-indigo-200 font-medium max-w-md leading-relaxed">Instantly route capital to verified institutional billers, utilities, and telecom providers worldwide.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold shadow-sm animate-in slide-in-from-top-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {!selectedBiller ? (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-lg">
          <div className="relative mb-8">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
            <input 
              type="text" 
              placeholder="Search registry (e.g., Senelec, Starlink)..." 
              value={search} 
              onChange={e=>setSearch(e.target.value)} 
              className="w-full bg-slate-50 border border-slate-200 p-5 pl-14 rounded-2xl font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredBillers.length === 0 ? (
               <p className="col-span-full text-center py-8 text-slate-400 font-bold">No registered billers match your query.</p>
            ) : (
              filteredBillers.map(b => (
                <button 
                  key={b.id} 
                  onClick={() => { setSelectedBiller(b); setError(null); }} 
                  className="text-left p-5 rounded-2xl border border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all flex items-center gap-4 group shadow-sm"
                >
                  <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-indigo-600 transition-colors shadow-sm">
                    <Landmark size={24}/>
                  </div>
                  <div>
                    <p className="font-black text-slate-800 text-lg leading-tight group-hover:text-indigo-900">{b.biller_name}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{b.category}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={handlePay} className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-xl max-w-xl mx-auto space-y-8 animate-in slide-in-from-right-4">
          <div className="flex justify-between items-start border-b border-slate-100 pb-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1">Target Beneficiary</p>
              <h3 className="text-2xl font-black text-slate-800 leading-tight">{selectedBiller.biller_name}</h3>
            </div>
            <button type="button" onClick={() => setSelectedBiller(null)} className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-4 py-2 rounded-xl hover:bg-slate-200 transition-colors">
              Change
            </button>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Account / Meter Number</label>
              <input required type="text" autoFocus value={accountNo} onChange={e=>setAccountNo(e.target.value)} placeholder="e.g., ACC-849302" className="w-full bg-slate-50 p-5 rounded-2xl border border-slate-200 font-bold text-slate-800 outline-none focus:border-indigo-500 transition-colors shadow-inner" />
            </div>
            
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex justify-between">
                <span>Remittance Amount</span>
                <span className="text-indigo-500">Available: ${balances?.liquid_usd?.toFixed(2)}</span>
              </label>
              <div className="relative">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400">$</span>
                <input required type="number" step="0.01" min="1" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" className="w-full bg-slate-50 p-6 pl-12 rounded-2xl border border-slate-200 font-black text-3xl outline-none focus:border-indigo-500 transition-colors shadow-inner text-slate-800" />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading || !amount || !accountNo} 
            className="w-full bg-indigo-600 text-white font-black text-[11px] uppercase tracking-widest p-6 rounded-2xl hover:bg-indigo-500 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {isLoading ? (
              <><Loader2 className="animate-spin" size={18}/> Processing Transfer...</>
            ) : (
              <>Authorize Payment <ArrowRight size={18}/></>
            )}
          </button>
        </form>
      )}
    </div>
  );
}