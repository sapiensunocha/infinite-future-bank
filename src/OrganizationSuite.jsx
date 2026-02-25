import { useState } from 'react';
import { 
  Folder, PieChart, ArrowDownToLine, Users, 
  Plus, Settings2, ArrowRight, Wallet, Target,
  Send, MoreHorizontal
} from 'lucide-react';

export default function OrganizationSuite({ balances }) {
  const [activeModule, setActiveModule] = useState('POCKETS'); // POCKETS, BUDGETS, INCOME, RECIPIENTS

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

  // Mock Data for Presentation
  const mockPockets = [
    { name: 'Tax Reserve 2026', amount: 45000, goal: 60000, color: 'bg-[#EA4335]' },
    { name: 'Real Estate Fund', amount: 120000, goal: 500000, color: 'bg-[#4285F4]' },
    { name: 'Operational OpEx', amount: 15400, goal: 20000, color: 'bg-[#FBBC04]' }
  ];

  const mockRecipients = [
    { name: 'IFB Treasury', role: 'Institutional', initials: 'IF', color: 'bg-slate-900' },
    { name: 'Aura Capital LLC', role: 'Business Partner', initials: 'AC', color: 'bg-[#4285F4]' },
    { name: 'Elena Rostova', role: 'Family Duo', initials: 'ER', color: 'bg-[#34A853]' }
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      
      {/* 🏛️ Header & Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/60 backdrop-blur-2xl border border-white/60 p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/40">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Organization Suite</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sort, route, and manage liquidity</p>
        </div>
        
        <div className="flex bg-white/50 p-2 rounded-2xl border border-white/40 shadow-inner w-full md:w-auto overflow-x-auto">
          {[
            { id: 'POCKETS', label: 'Pockets' },
            { id: 'BUDGETS', label: 'Budgets' },
            { id: 'INCOME', label: 'Auto-Income' },
            { id: 'RECIPIENTS', label: 'Recipients' }
          ].map((mod) => (
            <button 
              key={mod.id}
              onClick={() => setActiveModule(mod.id)}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeModule === mod.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}
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
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2"><Folder size={18}/> Active Pockets</h3>
            <button className="text-[10px] font-black uppercase tracking-widest text-[#4285F4] flex items-center gap-1 hover:bg-blue-50 px-4 py-2 rounded-xl transition-colors"><Plus size={14}/> New Pocket</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {mockPockets.map((pocket, i) => (
              <div key={i} className="bg-white/60 backdrop-blur-2xl border border-white/60 p-8 rounded-[2.5rem] shadow-xl hover:-translate-y-1 transition-transform group cursor-pointer">
                <div className="flex justify-between items-start mb-8">
                  <div className={`w-3 h-3 rounded-full ${pocket.color} shadow-lg`}></div>
                  <Settings2 size={16} className="text-slate-400 group-hover:text-slate-800 transition-colors"/>
                </div>
                <h4 className="text-sm font-black text-slate-800 mb-1">{pocket.name}</h4>
                <p className="text-2xl font-black text-slate-800 tracking-tight mb-6">{formatCurrency(pocket.amount)}</p>
                
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                    <span>Progress</span>
                    <span>{Math.round((pocket.amount / pocket.goal) * 100)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className={`h-full ${pocket.color}`} style={{ width: `${(pocket.amount / pocket.goal) * 100}%` }}></div>
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right pt-1">Goal: {formatCurrency(pocket.goal)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODULE 2: BUDGETS */}
      {activeModule === 'BUDGETS' && (
        <div className="bg-white/60 backdrop-blur-2xl border border-white/60 p-10 rounded-[3rem] shadow-xl animate-in slide-in-from-left-4">
          <div className="flex justify-between items-center mb-10 border-b border-white/40 pb-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2"><PieChart size={18} className="text-[#34A853]"/> Monthly Limits</h3>
            <span className="text-xl font-black text-slate-800">{formatCurrency(14500)} <span className="text-[10px] uppercase text-slate-400 tracking-widest">Spent</span></span>
          </div>

          <div className="space-y-8">
            {[
              { label: 'Travel & Aviation', spent: 8500, limit: 10000, color: 'bg-[#4285F4]' },
              { label: 'Dining & Entertainment', spent: 3200, limit: 5000, color: 'bg-[#FBBC04]' },
              { label: 'Software & Infrastructure', spent: 2800, limit: 3000, color: 'bg-[#EA4335]' }
            ].map((budget, i) => (
              <div key={i} className="space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-700">{budget.label}</span>
                  <div className="text-right">
                    <span className="text-sm font-black text-slate-800">{formatCurrency(budget.spent)}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">/ {formatCurrency(budget.limit)}</span>
                  </div>
                </div>
                <div className="w-full h-3 bg-white/50 border border-white/60 rounded-full overflow-hidden shadow-inner p-0.5">
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
          <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10"><ArrowDownToLine size={120} /></div>
            <h3 className="text-2xl font-black tracking-tight mb-4 relative z-10">Smart Salary Routing</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mb-8 relative z-10 max-w-sm">
              Automatically split incoming deposits into your Pockets, Joint Accounts, and Investment portfolios the second they arrive.
            </p>
            <button className="px-6 py-4 bg-[#34A853] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:-translate-y-1 transition-transform relative z-10">
              Create Routing Rule
            </button>
          </div>

          <div className="bg-white/60 backdrop-blur-2xl border border-white/60 p-8 rounded-[3rem] shadow-xl flex flex-col justify-center">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6">Active Protocol: <span className="text-slate-800">"Master Split"</span></h4>
            <div className="space-y-4 relative">
              <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-slate-200"></div>
              
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-black z-10">50%</div>
                <div className="flex-1 p-4 bg-white/50 rounded-xl border border-white/60 shadow-sm text-xs font-black text-slate-700">Main Liquid Account</div>
              </div>
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-8 h-8 rounded-full bg-[#EA4335] text-white flex items-center justify-center text-[10px] font-black z-10">30%</div>
                <div className="flex-1 p-4 bg-white/50 rounded-xl border border-white/60 shadow-sm text-xs font-black text-slate-700">Tax Reserve 2026</div>
              </div>
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-8 h-8 rounded-full bg-[#4285F4] text-white flex items-center justify-center text-[10px] font-black z-10">20%</div>
                <div className="flex-1 p-4 bg-white/50 rounded-xl border border-white/60 shadow-sm text-xs font-black text-slate-700">Alpha Equity (Auto-Invest)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 4: RECIPIENTS */}
      {activeModule === 'RECIPIENTS' && (
        <div className="bg-white/60 backdrop-blur-2xl border border-white/60 rounded-[3rem] p-10 shadow-xl animate-in slide-in-from-left-4">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2"><Users size={18} className="text-[#FBBC04]"/> Trusted Directory</h3>
            <button className="text-[10px] font-black uppercase tracking-widest text-[#4285F4] flex items-center gap-1 hover:bg-blue-50 px-4 py-2 rounded-xl transition-colors"><Plus size={14}/> Add Payee</button>
          </div>

          <div className="space-y-2">
            {mockRecipients.map((rec, i) => (
              <div key={i} className="flex items-center justify-between p-4 hover:bg-white/40 rounded-2xl transition-colors border border-transparent hover:border-white/60 group">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full ${rec.color} text-white flex items-center justify-center text-sm font-black shadow-inner`}>
                    {rec.initials}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800">{rec.name}</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{rec.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-[#4285F4] hover:shadow-md transition-shadow"><Send size={16}/></button>
                  <button className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:shadow-md transition-shadow"><MoreHorizontal size={16}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}