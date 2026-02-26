import { useState } from 'react';
import { 
  Briefcase, Users, Baby, Link as LinkIcon, 
  Globe2, Building2, ShieldAlert, Plus, ArrowRight,
  CreditCard, Trash2, Wallet
} from 'lucide-react';

export default function AccountHub({ balances, profile }) {
  const [activeTier, setActiveTier] = useState('PERSONAL'); // PERSONAL, BUSINESS, AGENT, LINKED

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 text-white">
      
      {/* 🏛️ Top Header & Identity Switcher */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/5 backdrop-blur-2xl border border-white/10 p-6 rounded-[2.5rem] shadow-glass">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Sovereign Accounts</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-ifb-primary mt-1">Manage your institutional entities</p>
        </div>
        
        <div className="flex bg-black/40 p-2 rounded-2xl border border-white/5 shadow-inner w-full md:w-auto overflow-x-auto custom-scrollbar">
          {[
            { id: 'PERSONAL', label: 'Retail & Private' },
            { id: 'BUSINESS', label: 'Commercial' },
            { id: 'AGENT', label: 'Financial Agent' },
            { id: 'LINKED', label: 'External' }
          ].map((tier) => (
            <button 
              key={tier.id}
              onClick={() => setActiveTier(tier.id)}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTier === tier.id ? 'bg-ifb-primary text-white shadow-glow-blue' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              {tier.label}
            </button>
          ))}
        </div>
      </div>

      {/* 📈 DYNAMIC TIER CONTENT */}

      {/* TIER 1: PERSONAL & PRIVATE */}
      {activeTier === 'PERSONAL' && (
        <div className="space-y-8 animate-in slide-in-from-left-4">
          {/* Global Currency Accounts */}
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-10 rounded-[3rem] shadow-glass">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-3">
                <div className="p-2 bg-ifb-primary/20 rounded-lg text-ifb-primary border border-ifb-primary/30"><Globe2 size={18} /></div> 
                Global Currency Accounts
              </h3>
              <button className="text-[10px] font-black uppercase tracking-widest text-ifb-primary flex items-center gap-1 hover:bg-ifb-primary/10 px-4 py-2 rounded-xl transition-colors border border-transparent hover:border-ifb-primary/30">
                <Plus size={14}/> Add Currency
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-6 bg-black/40 rounded-2xl border border-white/10 shadow-inner relative overflow-hidden group hover:border-ifb-primary/50 transition-colors">
                <div className="absolute top-0 right-0 w-32 h-32 bg-ifb-primary/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none group-hover:bg-ifb-primary/20 transition-colors"></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center justify-between">
                  USD • United States <Wallet size={12} className="text-ifb-primary"/>
                </p>
                <p className="text-2xl font-black text-white tracking-tight relative z-10">{formatCurrency(balances?.liquid_usd)}</p>
              </div>
              
              <div className="p-6 bg-black/40 rounded-2xl border border-white/10 shadow-inner relative overflow-hidden group hover:border-white/20 transition-colors">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">CHF • Switzerland</p>
                <p className="text-2xl font-black text-slate-300 tracking-tight relative z-10">₣ 0.00</p>
              </div>
              
              <div className="p-6 bg-transparent rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:border-ifb-accent hover:bg-ifb-accent/5 transition-all group">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-ifb-accent flex items-center gap-2">
                  <Plus size={14}/> Open EUR Account
                </p>
              </div>
            </div>
          </div>

          {/* Family & Duo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-[3rem] shadow-glass group cursor-pointer hover:bg-white/10 transition-all relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none group-hover:bg-indigo-500/20 transition-colors"></div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6 border border-indigo-500/30 shadow-glow"><Users size={24}/></div>
              <h3 className="text-lg font-black text-white mb-2 relative z-10">Joint Account</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mb-6 relative z-10">Shared IBANs and dual premium cards for couples or business partners.</p>
              <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-indigo-400 group-hover:gap-2 transition-all relative z-10">Initialize Duo <ArrowRight size={14}/></div>
            </div>

            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-[3rem] shadow-glass group cursor-pointer hover:bg-white/10 transition-all relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-ifb-logoB/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none group-hover:bg-ifb-logoB/20 transition-colors"></div>
              <div className="w-12 h-12 rounded-2xl bg-ifb-logoB/20 flex items-center justify-center text-ifb-logoB mb-6 border border-ifb-logoB/30 shadow-glow"><Baby size={24}/></div>
              <h3 className="text-lg font-black text-white mb-2 relative z-10">Kids & Teens</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mb-6 relative z-10">Dedicated spending cards and supervised sub-apps for the next generation.</p>
              <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-ifb-logoB group-hover:gap-2 transition-all relative z-10">Create Profile <ArrowRight size={14}/></div>
            </div>
          </div>

          {/* Institutional Credit Line */}
          <div className="bg-gradient-to-br from-black to-[#0B0F19] border border-white/10 p-8 rounded-[3rem] shadow-glass mt-8 group hover:border-ifb-primary/30 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-ifb-primary/20 flex items-center justify-center text-ifb-primary border border-ifb-primary/30 shadow-glow-blue"><Briefcase size={24}/></div>
                <div>
                  <h3 className="text-lg font-black text-white mb-1">Institutional Credit Line</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Borrow against your Alpha Equity at 2.4% APR</p>
                </div>
              </div>
              <span className="bg-white/10 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/20">Pre-Approved</span>
            </div>
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between mt-8 border-t border-white/10 pt-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Available Leverage</p>
                <p className="text-2xl font-black text-white">{formatCurrency((balances?.alpha_equity_usd || 0) * 0.4)}</p>
              </div>
              <button className="w-full md:w-auto px-6 py-4 bg-ifb-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-glow-blue hover:bg-blue-600 transition-all border border-blue-400/30">
                Draw Capital
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TIER 2: COMMERCIAL (PRO) */}
      {activeTier === 'BUSINESS' && (
        <div className="bg-gradient-to-br from-slate-900 to-black border border-white/10 p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden animate-in slide-in-from-left-4">
          <div className="absolute top-0 right-0 p-12 opacity-5 text-white"><Building2 size={200} /></div>
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[100%] bg-ifb-primary/10 rounded-full blur-[100px] pointer-events-none"></div>
          
          <h3 className="text-3xl font-black tracking-tight mb-4 relative z-10 text-white">Pro Account</h3>
          <p className="text-sm font-medium text-slate-400 max-w-xl leading-relaxed mb-10 relative z-10">
            Elevate your commercial operations. Earn instant cashback on corporate spending, issue unlimited virtual employee cards, and automate your expense ledger.
          </p>
          <div className="flex items-center gap-6 relative z-10">
            <button className="px-8 py-5 bg-ifb-primary text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-glow-blue hover:bg-blue-600 hover:-translate-y-1 transition-all border border-blue-400/30">
              Upgrade to Pro
            </button>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-black/50 px-4 py-2 rounded-xl border border-white/5">Requires Tax ID</span>
          </div>
        </div>
      )}

      {/* TIER 3: AGENT */}
      {activeTier === 'AGENT' && (
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-12 rounded-[3.5rem] shadow-glass text-center animate-in slide-in-from-left-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-ifb-primary/5 to-transparent pointer-events-none"></div>
          
          <div className="w-20 h-20 bg-ifb-primary/20 border border-ifb-primary/30 rounded-full flex items-center justify-center text-ifb-primary mx-auto mb-6 shadow-glow-blue"><Briefcase size={32}/></div>
          <h3 className="text-2xl font-black text-white tracking-tight mb-2 relative z-10">Financial Agent Portal</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest max-w-md mx-auto leading-relaxed mb-8 relative z-10">
            Manage your client roster, oversee portfolio performance, and collect advisory fees through the IFB Agent protocol.
          </p>
          <button className="px-8 py-4 bg-white/10 text-white border border-white/20 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-glass hover:bg-white/20 hover:-translate-y-1 transition-all relative z-10">
            Apply for Agent Status
          </button>
        </div>
      )}

      {/* TIER 4: EXTERNAL LINKED ACCOUNTS */}
      {activeTier === 'LINKED' && (
        <div className="space-y-8 animate-in slide-in-from-left-4">
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-10 rounded-[3rem] shadow-glass">
            <h3 className="text-sm font-black uppercase tracking-widest text-white mb-8 flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg text-slate-300 border border-white/10"><LinkIcon size={18}/></div>
              Connected Institutions
            </h3>
            
            <div className="space-y-4">
              {/* Empty State / Placeholder for Plaid */}
              <div className="border border-dashed border-white/20 bg-black/20 rounded-2xl p-8 text-center flex flex-col items-center justify-center hover:bg-black/40 transition-colors group cursor-pointer">
                <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-slate-500 mb-4 group-hover:text-ifb-accent group-hover:border-ifb-accent/30 transition-colors shadow-inner"><LinkIcon size={24}/></div>
                <p className="text-sm font-black text-white mb-1">No external accounts linked</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">Connect via Plaid to sync your whole-wealth position.</p>
                <button className="px-8 py-4 bg-ifb-accent/10 text-ifb-accent border border-ifb-accent/30 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-glow hover:bg-ifb-accent hover:text-[#0B0F19] transition-all">
                  Link Institution
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🛑 DANGER ZONE: CLOSE ACCOUNT */}
      <div className="mt-16 pt-10 border-t border-red-500/20 animate-in fade-in">
        <div className="bg-red-500/5 backdrop-blur-md border border-red-500/20 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 hover:bg-red-500/10 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center text-red-400 border border-red-500/30 shadow-glow"><ShieldAlert size={24}/></div>
            <div>
              <h4 className="text-sm font-black text-red-400 uppercase tracking-widest">Offboarding Protocol</h4>
              <p className="text-[10px] font-bold text-red-500/70 uppercase tracking-widest mt-1">Permanently close this institutional identity.</p>
            </div>
          </div>
          <button className="px-6 py-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center gap-2 shadow-glow">
            <Trash2 size={16}/> Initiate Account Closure
          </button>
        </div>
      </div>

    </div>
  );
}