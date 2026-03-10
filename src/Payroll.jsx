import React, { useState, useEffect } from 'react';
import { Users, Plus, UploadCloud, Send, CheckCircle2, Clock, AlertCircle, ShieldCheck, Landmark, Receipt, Loader2 } from 'lucide-react';
import { supabase } from './services/supabaseClient';

export default function Payroll({ session, balances, fetchAllData, commercialProfile }) {
  const [employees, setEmployees] = useState([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [salary, setSalary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => { fetchEmployees(); }, [session]);

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('payroll_employees')
      .select('*')
      .eq('employer_id', session.user.id)
      .order('employee_name', { ascending: true });
    if (data) setEmployees(data);
  };

  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await supabase.from('payroll_employees').insert([{
      employer_id: session.user.id,
      employee_email: email,
      employee_name: name,
      salary_amount: parseFloat(salary),
      status: 'active' // In production, this would trigger an email invite via Resend
    }]);

    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast(`${name} added to payroll registry.`);
      setEmail(''); setName(''); setSalary('');
      fetchEmployees();
    }
    setIsLoading(false);
  };

  const handleRunPayroll = async () => {
    const activeEmps = employees.filter(e => e.status === 'active');
    if (activeEmps.length === 0) return showToast("No active employees to pay.", "error");

    const totalGross = activeEmps.reduce((sum, e) => sum + parseFloat(e.salary_amount), 0);
    
    if (totalGross > balances.liquid_usd) {
      return showToast("Insufficient funds in Corporate Liquid account.", "error");
    }

    setIsLoading(true);
    try {
      // 1. Execute Atomic Balance Deduction
      const { error: rpcError } = await supabase.rpc('process_corporate_payroll', {
        p_employer_id: session.user.id,
        p_total_amount: totalGross
      });

      if (rpcError) throw rpcError;

      // 2. Log the Run for Tax Compliance
      await supabase.from('payroll_runs').insert([{
        employer_id: session.user.id,
        total_gross: totalGross,
        employee_count: activeEmps.length,
        status: 'completed'
      }]);

      showToast(`Batch Payroll Success: ${formatCurrency(totalGross)} distributed.`, "success");
      await fetchAllData();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

  if (commercialProfile?.pascaline_status !== 'eligible_for_funding') {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 animate-in fade-in zoom-in-95">
        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldCheck size={40} className="text-amber-500" />
        </div>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Corporate Access Required</h2>
        <p className="text-slate-500 mt-4 leading-relaxed">
          The IFB Payroll Engine is an institutional tool. To activate, your entity must complete the 
          <strong> Pascaline Underwriting</strong> process found in the Commercial Hub.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* HEADER SECTION */}
      <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden shadow-2xl">
        <div className="relative z-10">
          <h2 className="text-3xl font-black tracking-tight">PEO Payroll Engine</h2>
          <p className="text-sm text-indigo-300 font-bold uppercase tracking-widest mt-1">Automated Salary & Tax Compliance</p>
        </div>
        
        <div className="flex gap-4 relative z-10 w-full md:w-auto">
          <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 flex-1 md:flex-none">
             <p className="text-[10px] uppercase font-black text-slate-400">Monthly Liability</p>
             <p className="text-xl font-black">{formatCurrency(employees.reduce((s, e) => s + parseFloat(e.salary_amount), 0))}</p>
          </div>
          <button 
            onClick={handleRunPayroll} 
            disabled={isLoading || employees.length === 0}
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="animate-spin" size={18}/> : <><Send size={18}/> Execute Run</>}
          </button>
        </div>
        <Receipt size={180} className="absolute right-[-40px] bottom-[-40px] text-white/5 rotate-12" />
      </div>

      {notification && (
        <div className={`p-5 rounded-2xl font-black text-xs uppercase tracking-[0.1em] flex items-center gap-4 shadow-xl border animate-in slide-in-from-top-4 ${notification.type === 'error' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
          {notification.type === 'error' ? <AlertCircle size={20}/> : <CheckCircle2 size={20}/>}
          {notification.msg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ADD PAYEE FORM */}
        <div className="lg:col-span-1 space-y-6">
          <form onSubmit={handleAddEmployee} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl space-y-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><Plus size={20}/></div>
              <h3 className="font-black text-sm uppercase tracking-widest text-slate-800">Add New Payee</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Full Name</label>
                <input required type="text" value={name} onChange={e=>setName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-sm outline-none focus:border-blue-500 transition-all" placeholder="John Doe" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Corporate Email</label>
                <input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-sm outline-none focus:border-blue-500 transition-all" placeholder="john@company.com" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Net Monthly Salary ($)</label>
                <input required type="number" min="1" value={salary} onChange={e=>setSalary(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-black text-lg outline-none focus:border-blue-500 transition-all" placeholder="5000.00" />
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-800 shadow-lg transition-all flex items-center justify-center gap-2">
              Add to Registry
            </button>
          </form>

          <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all group">
            <UploadCloud size={32} className="mx-auto text-slate-300 group-hover:text-blue-500 mb-2 transition-colors" />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bulk Import Employee CSV</p>
          </div>
        </div>

        {/* TEAM DIRECTORY */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl flex flex-col h-full min-h-[600px]">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-black text-lg text-slate-800 flex items-center gap-3"><Users size={24} className="text-blue-600"/> Team Ledger</h3>
            <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">{employees.length} Members</span>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar border border-slate-50 rounded-2xl">
            {employees.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-20">
                <Users size={48} className="mb-4 opacity-10" />
                <p className="font-bold uppercase text-xs tracking-widest">No active personnel detected.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {employees.map(emp => (
                  <div key={emp.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:border-blue-200 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 font-black shadow-sm group-hover:text-blue-600 transition-colors">
                        {emp.employee_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 leading-tight">{emp.employee_name}</p>
                        <p className="text-xs font-bold text-slate-400">{emp.employee_email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between w-full md:w-auto md:gap-10 mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-200">
                      <div className="text-left md:text-right">
                        <p className="font-black text-emerald-600 text-lg">{formatCurrency(emp.salary_amount)}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase">Net Monthly</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {emp.status === 'active' ? (
                          <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-100 px-3 py-1.5 rounded-lg flex items-center gap-1 border border-emerald-200"><CheckCircle2 size={10}/> Active</span>
                        ) : (
                          <span className="text-[8px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg flex items-center gap-1 border border-amber-200"><Clock size={10}/> Pending Invite</span>
                        )}
                        <Landmark size={14} className="text-slate-300" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}