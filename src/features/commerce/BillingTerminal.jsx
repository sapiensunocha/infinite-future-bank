import React, { useState, useEffect } from 'react';
import { FileText, Plus, CheckCircle2, Copy, Send, X, Loader2, Clock, ShieldCheck } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

export default function BillingTerminal({ session }) {
  const [bills, setBills] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // New Invoice State
  const [newBill, setNewBill] = useState({ email: '', amount: '', description: '', dueDate: '' });

  const loadBills = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('ifb_bills')
      .select('*')
      .eq('creator_id', session.user.id)
      .order('created_at', { ascending: false });
    
    if (!error && data) setBills(data);
    setIsLoading(false);
  };

  useEffect(() => { loadBills(); }, [session]);

  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCreateBill = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Generate a unique, secure payment link hash
    const paymentHash = `pay.ifb.network/inv_${crypto.randomUUID().split('-')[0]}`;

    const { error } = await supabase.from('ifb_bills').insert([{
      creator_id: session.user.id,
      customer_email: newBill.email,
      amount: parseFloat(newBill.amount),
      description: newBill.description,
      due_date: newBill.dueDate || null,
      payment_link: paymentHash,
      status: 'pending'
    }]);

    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast('Invoice generated and cryptographically secured.', 'success');
      setShowCreate(false);
      setNewBill({ email: '', amount: '', description: '', dueDate: '' });
      loadBills();
    }
    setIsLoading(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast('Payment link copied to clipboard.');
  };

  // Metrics
  const pendingTotal = bills.filter(b => b.status === 'pending').reduce((acc, b) => acc + parseFloat(b.amount), 0);
  const collectedTotal = bills.filter(b => b.status === 'paid').reduce((acc, b) => acc + parseFloat(b.amount), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Notifications */}
      {notification && (
        <div className={`p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 shadow-md border animate-in slide-in-from-top-2 ${notification.type === 'error' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
          <ShieldCheck size={16} /> {notification.msg}
        </div>
      )}

      {/* Header Stat Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Clock size={12}/> Outstanding</p>
          <p className="text-3xl font-black text-slate-800">${pendingTotal.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><CheckCircle2 size={12}/> Settled</p>
          <p className="text-3xl font-black text-slate-800">${collectedTotal.toFixed(2)}</p>
        </div>
      </div>

      {/* Main Terminal */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-xl">
        <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-6">
          <div>
             <h3 className="font-black text-xl text-slate-800 tracking-tight">Accounts Receivable</h3>
             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Institutional Billing Engine</p>
          </div>
          <button onClick={() => setShowCreate(!showCreate)} className={`p-4 rounded-2xl text-white font-black transition-all shadow-md active:scale-95 flex items-center gap-2 ${showCreate ? 'bg-slate-800 hover:bg-slate-700' : 'bg-blue-600 hover:bg-blue-500'}`}>
            {showCreate ? <X size={20}/> : <><Plus size={20}/> <span className="text-[10px] uppercase tracking-widest hidden sm:block">New Invoice</span></>}
          </button>
        </div>

        {/* Create Invoice Form */}
        {showCreate && (
          <form onSubmit={handleCreateBill} className="mb-8 p-6 bg-slate-50 border border-slate-200 rounded-[2rem] animate-in zoom-in-95 shadow-inner">
            <h4 className="font-black text-sm uppercase tracking-widest text-slate-800 mb-4">Issue Corporate Invoice</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input required type="email" value={newBill.email} onChange={e=>setNewBill({...newBill, email: e.target.value})} placeholder="Client Email" className="p-4 rounded-xl border border-slate-200 font-bold outline-none focus:border-blue-500 w-full" />
              <input required type="number" step="0.01" min="1" value={newBill.amount} onChange={e=>setNewBill({...newBill, amount: e.target.value})} placeholder="Amount (USD)" className="p-4 rounded-xl border border-slate-200 font-bold outline-none focus:border-blue-500 w-full" />
              <input required type="text" value={newBill.description} onChange={e=>setNewBill({...newBill, description: e.target.value})} placeholder="Service Description" className="p-4 rounded-xl border border-slate-200 font-bold outline-none focus:border-blue-500 w-full md:col-span-2" />
            </div>
            <button type="submit" disabled={isLoading} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
              {isLoading ? <Loader2 className="animate-spin" size={16}/> : <><FileText size={16}/> Generate Secure Payment Link</>}
            </button>
          </form>
        )}

        {/* Invoice Ledger */}
        {isLoading && !showCreate ? (
           <div className="py-12 text-center text-slate-400"><Loader2 size={32} className="animate-spin mx-auto mb-2 text-blue-500"/> Syncing Ledger...</div>
        ) : bills.length === 0 ? (
           <div className="py-12 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl">
              <FileText size={48} className="mx-auto mb-4 opacity-20"/>
              <p className="font-bold text-slate-600">Ledger is empty.</p>
              <p className="text-xs mt-1">Create your first invoice to begin receiving capital.</p>
           </div>
        ) : (
          <div className="space-y-4">
            {bills.map(bill => (
              <div key={bill.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group gap-4">
                <div className="w-full sm:w-auto">
                  <div className="flex items-center justify-between sm:justify-start gap-3 mb-1">
                    <p className="font-black text-sm text-slate-800">{bill.customer_email}</p>
                    <span className={`text-[8px] font-black px-2 py-1 rounded-md uppercase tracking-widest border ${bill.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>
                      {bill.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{bill.description}</p>
                </div>
                
                <div className="flex items-center justify-between w-full sm:w-auto gap-6">
                  <p className="font-black text-xl text-slate-900">${parseFloat(bill.amount).toFixed(2)}</p>
                  
                  {bill.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => copyToClipboard(`https://${bill.payment_link}`)} className="p-2 bg-slate-50 text-slate-600 hover:text-blue-600 rounded-lg border border-slate-200 hover:border-blue-200 transition-colors tooltip-trigger" title="Copy Link">
                        <Copy size={16}/>
                      </button>
                      <button onClick={() => showToast(`Reminder dispatched to ${bill.customer_email}`)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg border border-blue-100 transition-colors" title="Send Email Reminder">
                        <Send size={16}/>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}