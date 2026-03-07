import React, { useState, useEffect } from 'react';
import { Users, Plus, UploadCloud, Send, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { supabase } from './services/supabaseClient';

export default function Payroll({ session, balances, fetchAllData, commercialProfile }) {
  const [employees, setEmployees] = useState([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [salary, setSalary] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { fetchEmployees(); }, []);

  const fetchEmployees = async () => {
    const { data } = await supabase.from('payroll_employees').select('*').eq('employer_id', session.user.id);
    if (data) setEmployees(data);
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await supabase.from('payroll_employees').insert([{
      employer_id: session.user.id, employee_email: email, employee_name: name, salary_amount: parseFloat(salary)
    }]);
    setEmail(''); setName(''); setSalary('');
    await fetchEmployees();
    setIsLoading(false);
  };

  const handleRunPayroll = async () => {
    setIsLoading(true);
    const confirmed = employees.filter(e => e.status === 'confirmed');
    const total = confirmed.reduce((sum, e) => sum + e.salary_amount, 0);

    if (total > balances.liquid_usd) {
      alert("Insufficient funds for payroll.");
      setIsLoading(false); return;
    }

    // Process each payment
    for (const emp of confirmed) {
      await supabase.rpc('p2p_transfer', { sender_id: session.user.id, receiver_id: emp.employee_user_id, transfer_amount: emp.salary_amount });
    }
    alert(`Payroll of $${total.toFixed(2)} processed successfully to ${confirmed.length} employees.`);
    await fetchAllData();
    setIsLoading(false);
  };

  if (commercialProfile?.pascaline_status !== 'eligible_for_funding') {
    return (
      <div className="text-center py-20 animate-in fade-in">
        <AlertCircle size={48} className="mx-auto text-amber-500 mb-4" />
        <h2 className="text-2xl font-black text-slate-800">Commercial Account Required</h2>
        <p className="text-slate-500 mt-2">Payroll is restricted to verified Corporate entities. Complete Pascaline Underwriting first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Corporate Payroll</h2>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Automated Salary Deployment</p>
        </div>
        <button onClick={handleRunPayroll} disabled={isLoading} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 shadow-xl">
          <Send size={16}/> Run Payroll Now
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <form onSubmit={handleAddEmployee} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-black text-sm uppercase tracking-widest text-slate-800 mb-4 flex items-center gap-2"><Plus size={16}/> Add Payee</h3>
            <input required type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Full Name" className="w-full bg-slate-50 p-3 rounded-xl font-bold text-sm outline-none" />
            <input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email Address" className="w-full bg-slate-50 p-3 rounded-xl font-bold text-sm outline-none" />
            <input required type="number" value={salary} onChange={e=>setSalary(e.target.value)} placeholder="Salary Amount" className="w-full bg-slate-50 p-3 rounded-xl font-bold text-sm outline-none" />
            <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white p-3 rounded-xl font-black text-[10px] uppercase tracking-widest">Send Invite</button>
          </form>
          <div className="bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-slate-200 text-center cursor-pointer hover:bg-slate-100 transition-colors">
            <UploadCloud size={24} className="mx-auto text-slate-400 mb-2" />
            <p className="text-xs font-black text-slate-600 uppercase tracking-widest">Import CSV</p>
          </div>
        </div>

        <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="font-black text-sm uppercase tracking-widest text-slate-800 mb-6 flex items-center gap-2"><Users size={16}/> Team Directory</h3>
          <div className="space-y-3">
            {employees.length === 0 ? <p className="text-sm text-slate-400">No employees added yet.</p> : employees.map(emp => (
              <div key={emp.id} className="flex justify-between items-center p-4 border border-slate-100 rounded-2xl">
                <div>
                  <p className="font-black text-slate-800">{emp.employee_name}</p>
                  <p className="text-[10px] text-slate-400 font-bold">{emp.employee_email}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-emerald-600">${emp.salary_amount}</p>
                  {emp.status === 'confirmed' ? (
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md"><CheckCircle2 size={10} className="inline mr-1"/> Active</span>
                  ) : (
                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-2 py-1 rounded-md"><Clock size={10} className="inline mr-1"/> Invited</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}