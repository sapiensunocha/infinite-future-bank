import { useState } from 'react';
import { supabase } from './services/supabaseClient';
import { 
  Folder, PieChart, ArrowDownToLine, Users, 
  Plus, Settings2, ArrowRight, Wallet, Target,
  Send, MoreHorizontal, ShieldCheck, X, Loader2
} from 'lucide-react';

export default function OrganizationSuite({ session, balances, pockets, recipients }) {
  const [activeModule, setActiveModule] = useState('POCKETS'); // POCKETS, BUDGETS, INCOME, RECIPIENTS
  
  // Funding UI States
  const [fundingPocketId, setFundingPocketId] = useState(null);
  const [fundAmount, setFundAmount] = useState('');
  const [isFunding, setIsFunding] = useState(false);
  const [notification, setNotification] = useState(null);

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

  // Fallback Mock Data for UI presentation if the database is empty
  const defaultPockets = pockets?.length > 0 ? pockets : [
    { id: '1', pocket_name: 'Tax Reserve 2026', current_amount: 0, target_amount: 60000, color: 'bg-red-500' },
    { id: '2', pocket_name: 'Real Estate Fund', current_amount: 0, target_amount: 500000, color: 'bg-blue-500' }
  ];

  const defaultRecipients = recipients?.length > 0 ? recipients : [
    { recipient_name: 'IFB Treasury', role: 'Institutional', initials: 'IF', color: 'bg-slate-200 text-slate-700' },
    { recipient_name: 'Aura Capital LLC', role: 'Business Partner', initials: 'AC', color: 'bg-blue-100 text-blue-700' }
  ];

  const handleFundPocket = async (e) => {
    e.preventDefault();
    if (!fundAmount || fundAmount <= 0) return;
    setIsFunding(true);

    try {
      const { error } = await supabase.rpc('fund_pocket', {
        p_user_id: session.user.id,
        p_pocket_id: fundingPocketId,
        p_amount: parseFloat(fundAmount)
      });

      if (error) throw error;

      setNotification({ type: 'success', text: `Successfully routed ${formatCurrency(fundAmount)} to pocket.` });
      setTimeout(() => setNotification(null), 5000);
      
      setFundingPocketId(null);
      setFundAmount('');

    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', text: err.message || "Failed to route funds." });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsFunding(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 text-slate-800 relative">
      
      {/* 🏛️ Header & Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white border border-slate-200 p-6 rounded-[2.5rem] shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Organization Suite</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mt-1">Sort, route, and manage liquidity</p>
        </div>
        
        <div className="flex bg-slate-100 p-2 rounded-2xl border border-slate-200 shadow-inner w-full md:w-auto overflow-x-auto no-scrollbar">
          {[
            { id: 'POCKETS', label: 'Pockets' },
            { id: 'BUDGETS', label: 'Budgets' },
            { id: 'INCOME', label: 'Auto-Income' },
            { id: 'RECIPIENTS', label: 'Recipients' }
          ].map((mod) => (
            <button 
              key={mod.id}
              onClick={() => setActiveModule(mod.id)}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeModule === mod.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}
            >
              {mod.label}
            </button>
          ))}
        </div>
      </div>

      {/* 📈 DYNAMIC MODULE CONTENT */}

      {/* MODULE 1: POCKETS (Sub-accounts) */}
      {activeModule === 'POCKETS' && (
        <div className="space-y-8 animate-in slide-in-from-left-4">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600 border border-blue-100"><Folder size={18}/></div>
              Active Pockets
            </h3>
            <button className="text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-1 hover:bg-blue-50 px-4 py-2 rounded-xl transition-colors border border-transparent hover:border-blue-100">
              <Plus size={14}/> New Pocket
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {defaultPockets.map((pocket) => (
              <div key={pocket.id} className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm hover:shadow-md hover:border-slate-300 hover:-translate-y-1 transition-all group flex flex-col justify-between">
                
                <div>
                  <div className="flex justify-between items-start mb-8">
                    <div className={`w-4 h-4 rounded-full ${pocket.color || 'bg-blue-500'} shadow-sm`}></div>
                    <Settings2 size={16} className="text-slate-400 group-hover:text-slate-600 transition-colors cursor-pointer"/>
                  </div>
                  <h4 className="text-sm font-black text-slate-500 mb-1">{pocket.pocket_name}</h4>
                  <p className="text-2xl font-black text-slate-800 tracking-tight mb-6">{formatCurrency(pocket.current_amount)}</p>
                </div>
                
                <div>
                  {/* Progress Bar */}
                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-500">
                      <span>Progress</span>
                      <span className="text-slate-800">{pocket.target_amount > 0 ? Math.round((pocket.current_amount / pocket.target_amount) * 100) : 0}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 border border-slate-200 rounded-full overflow-hidden">
                      <div className={`h-full ${pocket.color || 'bg-blue-500'}`} style={{ width: `${pocket.target_amount > 0 ? (pocket.current_amount / pocket.target_amount) * 100 : 0}%` }}></div>
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right pt-1">Goal: <span className="text-slate-500">{formatCurrency(pocket.target_amount)}</span></p>
                  </div>

                  <button 
                    onClick={() => setFundingPocketId(pocket.id)}
                    className="w-full py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Route Liquidity
                  </button>
                </div>

              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODULE 2: BUDGETS */}
      {activeModule === 'BUDGETS' && (
        <div className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-sm animate-in slide-in-from-left-4">
          <div className="flex justify-between items-center mb-10 border-b border-slate-100 pb-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 border border-emerald-100"><PieChart size={18}/></div>
              Monthly Limits
            </h3>
            <span className="text-xl font-black text-slate-800">{formatCurrency(14500)} <span className="text-[10px] uppercase text-slate-500 tracking-widest">Spent</span></span>
          </div>

          <div className="space-y-8">
            {[
              { label: 'Travel & Aviation', spent: 8500, limit: 10000, color: 'bg-blue-500' },
              { label: 'Dining & Entertainment', spent: 3200, limit: 5000, color: 'bg-indigo-500' },
              { label: 'Software & Infrastructure', spent: 2800, limit: 3000, color: 'bg-red-500' }
            ].map((budget, i) => (
              <div key={i} className="space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-600">{budget.label}</span>
                  <div className="text-right">
                    <span className="text-sm font-black text-slate-800">{formatCurrency(budget.spent)}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">/ {formatCurrency(budget.limit)}</span>
                  </div>
                </div>
                <div className="w-full h-3 bg-slate-100 border border-slate-200 rounded-full overflow-hidden shadow-inner p-0.5">
                  <div className={`h-full rounded-full ${budget.color}`} style={{ width: `${(budget.spent / budget.limit) * 100}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODULE 3: INCOME ORGANIZER */}
      {activeModule === 'INCOME' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-left-4">
          <div className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-sm relative overflow-hidden group">
            <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-emerald-50 rounded-full blur-[80px] pointer-events-none group-hover:bg-emerald-100 transition-all"></div>
            <div className="absolute top-0 right-0 p-8 opacity-5 text-emerald-600"><ArrowDownToLine size={120} /></div>
            
            <h3 className="text-2xl font-black tracking-tight mb-4 relative z-10 text-slate-800">Smart Salary Routing</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed mb-8 relative z-10 max-w-sm">
              Automatically split incoming deposits into your Pockets, Joint Accounts, and Investment portfolios the second they arrive.
            </p>
            <button className="px-6 py-4 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-md hover:-translate-y-1 hover:bg-emerald-600 transition-all relative z-10">
              Create Routing Rule
            </button>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-8 rounded-[3rem] shadow-sm flex flex-col justify-center relative overflow-hidden">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6">Active Protocol: <span className="text-slate-800">"Master Split"</span></h4>
            <div className="space-y-4 relative">
              <div className="absolute left-4 top-4 bottom-4 w-[2px] bg-slate-200"></div>
              
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 text-slate-700 flex items-center justify-center text-[10px] font-black z-10">50%</div>
                <div className="flex-1 p-4 bg-white rounded-xl border border-slate-200 shadow-sm text-xs font-black text-slate-700">Main Liquid Account</div>
              </div>
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-8 h-8 rounded-full bg-red-100 border border-red-200 text-red-600 flex items-center justify-center text-[10px] font-black z-10">30%</div>
                <div className="flex-1 p-4 bg-white rounded-xl border border-slate-200 shadow-sm text-xs font-black text-slate-700">Tax Reserve 2026</div>
              </div>
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 text-blue-600 flex items-center justify-center text-[10px] font-black z-10">20%</div>
                <div className="flex-1 p-4 bg-white rounded-xl border border-slate-200 shadow-sm text-xs font-black text-slate-700">Alpha Equity (Auto-Invest)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 4: RECIPIENTS */}
      {activeModule === 'RECIPIENTS' && (
        <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm animate-in slide-in-from-left-4">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-lg text-amber-500 border border-amber-100"><Users size={18}/></div>
              Trusted Directory
            </h3>
            <button className="text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-1 hover:bg-blue-50 px-4 py-2 rounded-xl transition-colors border border-transparent hover:border-blue-100"><Plus size={14}/> Add Payee</button>
          </div>

          <div className="space-y-2">
            {defaultRecipients.map((rec) => (
              <div key={rec.id || rec.recipient_name} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors border border-transparent hover:border-slate-200 group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full ${rec.color || 'bg-slate-100 text-slate-600'} flex items-center justify-center text-sm font-black shadow-sm border border-slate-200`}>
                    {rec.initials}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800">{rec.recipient_name}</h4>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{rec.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm"><Send size={16}/></button>
                  <button className="w-10 h-10 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"><MoreHorizontal size={16}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FUND POCKET MODAL */}
      {fundingPocketId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden relative border border-slate-100">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center relative z-10">
              <h3 className="font-black text-lg text-slate-800 tracking-tight uppercase">Route Liquidity</h3>
              <button onClick={() => { setFundingPocketId(null); setFundAmount(''); }} className="text-slate-400 hover:text-slate-800 transition-colors bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleFundPocket} className="p-8 space-y-6 relative z-10">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Available to Route</label>
                <p className="text-xl font-black text-emerald-600 mb-6">{formatCurrency(balances.liquid_usd)}</p>

                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 text-left">Amount (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 font-black text-4xl text-center text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-300 shadow-inner"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              
              <button 
                type="submit" 
                disabled={isFunding} 
                className="w-full bg-blue-700 text-white rounded-2xl py-5 font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-600 hover:-translate-y-1 transition-all disabled:opacity-50 flex items-center justify-center border-none"
              >
                {isFunding ? <Loader2 className="animate-spin" size={18} /> : 'CONFIRM ROUTING'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* IN-APP NOTIFICATION */}
      {notification && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[300] animate-in slide-in-from-top-4 fade-in duration-300">
          <div className={`px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl flex items-center gap-3 ${
            notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-red-500/10 border-red-500/20 text-red-600'
          }`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${notification.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
            <p className="font-black text-sm uppercase tracking-widest">{notification.text}</p>
          </div>
        </div>
      )}

    </div>
  );
}