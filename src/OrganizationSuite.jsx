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
    { id: '2', pocket_name: 'Real Estate Fund', current_amount: 0, target_amount: 500000, color: 'bg-ifb-primary' }
  ];

  const defaultRecipients = recipients?.length > 0 ? recipients : [
    { recipient_name: 'IFB Treasury', role: 'Institutional', initials: 'IF', color: 'bg-white/10 text-white' },
    { recipient_name: 'Aura Capital LLC', role: 'Business Partner', initials: 'AC', color: 'bg-ifb-primary text-white' }
  ];

  const handleFundPocket = async (e) => {
    e.preventDefault();
    if (!fundAmount || fundAmount <= 0) return;
    setIsFunding(true);

    try {
      // Execute the secure database transaction we built
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
      // The WebSocket in Dashboard.jsx will auto-refresh the UI!

    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', text: err.message || "Failed to route funds." });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsFunding(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 text-white relative">
      
      {/* 🏛️ Header & Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/5 backdrop-blur-2xl border border-white/10 p-6 rounded-[2.5rem] shadow-glass">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Organization Suite</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-ifb-primary mt-1">Sort, route, and manage liquidity</p>
        </div>
        
        <div className="flex bg-black/40 p-2 rounded-2xl border border-white/5 shadow-inner w-full md:w-auto overflow-x-auto custom-scrollbar">
          {[
            { id: 'POCKETS', label: 'Pockets' },
            { id: 'BUDGETS', label: 'Budgets' },
            { id: 'INCOME', label: 'Auto-Income' },
            { id: 'RECIPIENTS', label: 'Recipients' }
          ].map((mod) => (
            <button 
              key={mod.id}
              onClick={() => setActiveModule(mod.id)}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeModule === mod.id ? 'bg-ifb-primary text-white shadow-glow-blue' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
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
            <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg text-slate-300 border border-white/10"><Folder size={18}/></div>
              Active Pockets
            </h3>
            <button className="text-[10px] font-black uppercase tracking-widest text-ifb-primary flex items-center gap-1 hover:bg-ifb-primary/10 px-4 py-2 rounded-xl transition-colors border border-transparent hover:border-ifb-primary/30">
              <Plus size={14}/> New Pocket
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {defaultPockets.map((pocket) => (
              <div key={pocket.id} className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-glass hover:-translate-y-1 hover:border-white/20 hover:bg-white/10 transition-all group flex flex-col justify-between">
                
                <div>
                  <div className="flex justify-between items-start mb-8">
                    <div className={`w-4 h-4 rounded-full ${pocket.color || 'bg-ifb-primary'} shadow-glow`}></div>
                    <Settings2 size={16} className="text-slate-500 group-hover:text-white transition-colors cursor-pointer"/>
                  </div>
                  <h4 className="text-sm font-black text-slate-300 mb-1">{pocket.pocket_name}</h4>
                  <p className="text-2xl font-black text-white tracking-tight mb-6">{formatCurrency(pocket.current_amount)}</p>
                </div>
                
                <div>
                  {/* Progress Bar */}
                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                      <span>Progress</span>
                      <span className="text-white">{pocket.target_amount > 0 ? Math.round((pocket.current_amount / pocket.target_amount) * 100) : 0}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-black/50 border border-white/5 rounded-full overflow-hidden">
                      <div className={`h-full ${pocket.color || 'bg-ifb-primary'} shadow-[0_0_10px_currentColor]`} style={{ width: `${pocket.target_amount > 0 ? (pocket.current_amount / pocket.target_amount) * 100 : 0}%` }}></div>
                    </div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest text-right pt-1">Goal: <span className="text-slate-400">{formatCurrency(pocket.target_amount)}</span></p>
                  </div>

                  <button 
                    onClick={() => setFundingPocketId(pocket.id)}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
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
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-10 rounded-[3rem] shadow-glass animate-in slide-in-from-left-4">
          <div className="flex justify-between items-center mb-10 border-b border-white/10 pb-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-3">
              <div className="p-2 bg-ifb-success/20 rounded-lg text-ifb-success border border-ifb-success/30"><PieChart size={18}/></div>
              Monthly Limits
            </h3>
            <span className="text-xl font-black text-white">{formatCurrency(14500)} <span className="text-[10px] uppercase text-slate-500 tracking-widest">Spent</span></span>
          </div>

          <div className="space-y-8">
            {[
              { label: 'Travel & Aviation', spent: 8500, limit: 10000, color: 'bg-ifb-primary' },
              { label: 'Dining & Entertainment', spent: 3200, limit: 5000, color: 'bg-ifb-accent' },
              { label: 'Software & Infrastructure', spent: 2800, limit: 3000, color: 'bg-red-500' }
            ].map((budget, i) => (
              <div key={i} className="space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-300">{budget.label}</span>
                  <div className="text-right">
                    <span className="text-sm font-black text-white">{formatCurrency(budget.spent)}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">/ {formatCurrency(budget.limit)}</span>
                  </div>
                </div>
                <div className="w-full h-3 bg-black/50 border border-white/10 rounded-full overflow-hidden shadow-inner p-0.5">
                  <div className={`h-full rounded-full ${budget.color} shadow-[0_0_10px_currentColor]`} style={{ width: `${(budget.spent / budget.limit) * 100}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODULE 3: INCOME ORGANIZER */}
      {activeModule === 'INCOME' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-left-4">
          <div className="bg-gradient-to-br from-black to-[#0B0F19] border border-white/10 text-white p-10 rounded-[3rem] shadow-glass relative overflow-hidden group">
            <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-ifb-success/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-ifb-success/20 transition-all"></div>
            <div className="absolute top-0 right-0 p-8 opacity-5 text-ifb-success"><ArrowDownToLine size={120} /></div>
            
            <h3 className="text-2xl font-black tracking-tight mb-4 relative z-10 text-white">Smart Salary Routing</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mb-8 relative z-10 max-w-sm">
              Automatically split incoming deposits into your Pockets, Joint Accounts, and Investment portfolios the second they arrive.
            </p>
            <button className="px-6 py-4 bg-ifb-success text-[#0B0F19] rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-glow hover:-translate-y-1 hover:bg-emerald-400 transition-all relative z-10 border border-transparent">
              Create Routing Rule
            </button>
          </div>

          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-[3rem] shadow-glass flex flex-col justify-center relative overflow-hidden">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6">Active Protocol: <span className="text-white">"Master Split"</span></h4>
            <div className="space-y-4 relative">
              <div className="absolute left-4 top-4 bottom-4 w-[1px] bg-white/10"></div>
              
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 text-white flex items-center justify-center text-[10px] font-black z-10">50%</div>
                <div className="flex-1 p-4 bg-black/40 rounded-xl border border-white/5 shadow-sm text-xs font-black text-slate-300">Main Liquid Account</div>
              </div>
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center text-[10px] font-black z-10">30%</div>
                <div className="flex-1 p-4 bg-black/40 rounded-xl border border-white/5 shadow-sm text-xs font-black text-slate-300">Tax Reserve 2026</div>
              </div>
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-8 h-8 rounded-full bg-ifb-primary/20 border border-ifb-primary/40 text-ifb-primary flex items-center justify-center text-[10px] font-black z-10">20%</div>
                <div className="flex-1 p-4 bg-black/40 rounded-xl border border-white/5 shadow-sm text-xs font-black text-slate-300">Alpha Equity (Auto-Invest)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 4: RECIPIENTS */}
      {activeModule === 'RECIPIENTS' && (
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-10 shadow-glass animate-in slide-in-from-left-4">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-3">
              <div className="p-2 bg-ifb-logoB/20 rounded-lg text-ifb-logoB border border-ifb-logoB/30"><Users size={18}/></div>
              Trusted Directory
            </h3>
            <button className="text-[10px] font-black uppercase tracking-widest text-ifb-primary flex items-center gap-1 hover:bg-ifb-primary/10 px-4 py-2 rounded-xl transition-colors border border-transparent hover:border-ifb-primary/30"><Plus size={14}/> Add Payee</button>
          </div>

          <div className="space-y-2">
            {defaultRecipients.map((rec) => (
              <div key={rec.id || rec.recipient_name} className="flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-colors border border-transparent hover:border-white/10 group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full ${rec.color || 'bg-white/10 text-white'} flex items-center justify-center text-sm font-black shadow-inner border border-white/10`}>
                    {rec.initials}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">{rec.recipient_name}</h4>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{rec.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="w-10 h-10 bg-white/10 border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-ifb-primary transition-colors"><Send size={16}/></button>
                  <button className="w-10 h-10 bg-black/40 border border-white/10 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors"><MoreHorizontal size={16}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FUND POCKET MODAL */}
      {fundingPocketId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#0B0F19] rounded-3xl w-full max-w-md shadow-glass overflow-hidden relative border border-white/10">
            <div className="absolute inset-0 bg-gradient-to-br from-ifb-primary/10 to-transparent pointer-events-none"></div>
            
            <div className="p-6 border-b border-white/10 flex justify-between items-center relative z-10">
              <h3 className="font-black text-lg text-white tracking-tight uppercase">Route Liquidity</h3>
              <button onClick={() => { setFundingPocketId(null); setFundAmount(''); }} className="text-slate-400 hover:text-white transition-colors bg-white/5 p-2 rounded-xl border border-white/10">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleFundPocket} className="p-8 space-y-6 relative z-10">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Available to Route</label>
                <p className="text-xl font-black text-ifb-success mb-6">{formatCurrency(balances.liquid_usd)}</p>

                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 text-left">Amount (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-2xl p-6 font-black text-4xl text-center text-white outline-none focus:border-ifb-primary transition-all placeholder:text-slate-600"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              
              <button 
                type="submit" 
                disabled={isFunding} 
                className="w-full bg-ifb-primary text-white rounded-2xl py-5 font-black text-xs uppercase tracking-widest shadow-glow-blue hover:bg-blue-600 hover:-translate-y-1 transition-all disabled:opacity-50 flex items-center justify-center border border-blue-400/30"
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
          <div className={`px-6 py-4 rounded-2xl shadow-glass border backdrop-blur-2xl flex items-center gap-3 ${
            notification.type === 'success' ? 'bg-ifb-success/10 border-ifb-success/30 text-ifb-success' : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${notification.type === 'success' ? 'bg-ifb-success' : 'bg-red-400'}`}></div>
            <p className="font-black text-sm uppercase tracking-widest">{notification.text}</p>
          </div>
        </div>
      )}

    </div>
  );
}