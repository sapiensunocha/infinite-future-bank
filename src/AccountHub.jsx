import { useState } from 'react';
import { 
  Briefcase, Users, Baby, Link as LinkIcon, 
  Globe2, Building2, ShieldAlert, Plus, ArrowRight,
  CreditCard, Trash2
} from 'lucide-react';

export default function AccountHub({ balances, profile }) {
  const [activeTier, setActiveTier] = useState('PERSONAL'); // PERSONAL, BUSINESS, AGENT, LINKED

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      
      {/* 🏛️ Top Header & Identity Switcher */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/60 backdrop-blur-2xl border border-white/60 p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/40">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Sovereign Accounts</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Manage your institutional entities</p>
        </div>
        
        <div className="flex bg-white/50 p-2 rounded-2xl border border-white/40 shadow-inner w-full md:w-auto overflow-x-auto">
          {[
            { id: 'PERSONAL', label: 'Retail & Private' },
            { id: 'BUSINESS', label: 'Commercial' },
            { id: 'AGENT', label: 'Financial Agent' },
            { id: 'LINKED', label: 'External' }
          ].map((tier) => (
            <button 
              key={tier.id}
              onClick={() => setActiveTier(tier.id)}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTier === tier.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}
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
          <div className="bg-white/60 backdrop-blur-2xl border border-white/60 p-10 rounded-[3rem] shadow-xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2"><Globe2 size={18} className="text-[#4285F4]"/> Global Currency Accounts</h3>
              <button className="text-[10px] font-black uppercase tracking-widest text-[#4285F4] flex items-center gap-1 hover:bg-blue-50 px-4 py-2 rounded-xl transition-colors"><Plus size={14}/> Add Currency</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-6 bg-white/50 rounded-2xl border border-white/40 shadow-inner">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">USD • United States</p>
                <p className="text-2xl font-black text-slate-800 tracking-tight">{formatCurrency(balances.liquid_usd)}</p>
              </div>
              <div className="p-6 bg-white/50 rounded-2xl border border-white/40 shadow-inner">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">CHF • Switzerland</p>
                <p className="text-2xl font-black text-slate-800 tracking-tight">₣ 0.00</p>
              </div>
              <div className="p-6 bg-white/50 rounded-2xl border border-white/40 shadow-inner opacity-50 border-dashed flex flex-col items-center justify-center cursor-pointer hover:opacity-100 transition-opacity">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Open EUR Account</p>
              </div>
            </div>
          </div>

          {/* Family & Duo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white/60 backdrop-blur-2xl border border-white/60 p-8 rounded-[3rem] shadow-xl group cursor-pointer hover:-translate-y-1 transition-transform">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 mb-6"><Users size={24}/></div>
              <h3 className="text-lg font-black text-slate-800 mb-2">Joint Account</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed mb-6">Shared IBANs and dual premium cards for couples or business partners.</p>
              <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-indigo-600 group-hover:gap-2 transition-all">Initialize Duo <ArrowRight size={14}/></div>
            </div>

            <div className="bg-white/60 backdrop-blur-2xl border border-white/60 p-8 rounded-[3rem] shadow-xl group cursor-pointer hover:-translate-y-1 transition-transform">
              <div className="w-12 h-12 rounded-2xl bg-[#FBBC04]/20 flex items-center justify-center text-[#FBBC04] mb-6"><Baby size={24}/></div>
              <h3 className="text-lg font-black text-slate-800 mb-2">Kids & Teens</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed mb-6">Dedicated spending cards and supervised sub-apps for the next generation.</p>
              <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-[#FBBC04] group-hover:gap-2 transition-all">Create Profile <ArrowRight size={14}/></div>
            </div>
          </div>
        </div>
      )}

      {/* TIER 2: COMMERCIAL (PRO) */}
      {activeTier === 'BUSINESS' && (
        <div className="bg-slate-900 text-white p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden animate-in slide-in-from-left-4">
          <div className="absolute top-0 right-0 p-12 opacity-5"><Building2 size={200} /></div>
          <h3 className="text-3xl font-black tracking-tight mb-4 relative z-10">Pro Account</h3>
          <p className="text-sm font-medium text-slate-400 max-w-xl leading-relaxed mb-10 relative z-10">
            Elevate your commercial operations. Earn instant cashback on corporate spending, issue unlimited virtual employee cards, and automate your expense ledger.
          </p>
          <div className="flex items-center gap-6 relative z-10">
            <button className="px-8 py-5 bg-[#4285F4] text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-blue-500/30 hover:-translate-y-1 transition-transform">
              Upgrade to Pro
            </button>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Requires Tax ID</span>
          </div>
        </div>
      )}

      {/* TIER 3: AGENT */}
      {activeTier === 'AGENT' && (
        <div className="bg-white/60 backdrop-blur-2xl border border-white/60 p-12 rounded-[3.5rem] shadow-xl text-center animate-in slide-in-from-left-4">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mx-auto mb-6"><Briefcase size={32}/></div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Financial Agent Portal</h3>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest max-w-md mx-auto leading-relaxed mb-8">
            Manage your client roster, oversee portfolio performance, and collect advisory fees through the IFB Agent protocol.
          </p>
          <button className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-colors">
            Apply for Agent Status
          </button>
        </div>
      )}

      {/* TIER 4: EXTERNAL LINKED ACCOUNTS */}
      {activeTier === 'LINKED' && (
        <div className="space-y-8 animate-in slide-in-from-left-4">
          <div className="bg-white/60 backdrop-blur-2xl border border-white/60 p-10 rounded-[3rem] shadow-xl">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-8 flex items-center gap-2"><LinkIcon size={18}/> Connected Institutions</h3>
            
            <div className="space-y-4">
              {/* Empty State / Placeholder for Plaid */}
              <div className="border border-dashed border-slate-300 rounded-2xl p-8 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4"><LinkIcon size={20}/></div>
                <p className="text-sm font-black text-slate-800 mb-1">No external accounts linked</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Connect via Plaid to sync your whole-wealth position.</p>
                <button className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-colors">
                  Link Institution
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🛑 DANGER ZONE: CLOSE ACCOUNT (Visible across all tabs at the bottom) */}
      <div className="mt-16 pt-10 border-t border-red-200 animate-in fade-in">
        <div className="bg-red-50/50 backdrop-blur-md border border-red-100 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-500"><ShieldAlert size={24}/></div>
            <div>
              <h4 className="text-sm font-black text-red-900 uppercase tracking-widest">Offboarding Protocol</h4>
              <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-1">Permanently close this institutional identity.</p>
            </div>
          </div>
          <button className="px-6 py-4 bg-white border border-red-200 text-red-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-colors flex items-center gap-2 shadow-sm">
            <Trash2 size={16}/> Initiate Account Closure
          </button>
        </div>
      </div>

    </div>
  );
}