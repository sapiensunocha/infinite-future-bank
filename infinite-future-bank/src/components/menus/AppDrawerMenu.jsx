import React from 'react';
import { Users, Receipt, FileCode, HandCoins, HeartHandshake, ArrowRightLeft, Rocket, Calculator, Ticket, HeartPulse, GraduationCap, X } from 'lucide-react';

const APPS = [
  { id: 'PAYROLL',          Icon: Users,         label: 'Payroll',            hover: 'hover:bg-blue-50 group-hover:bg-blue-100 group-hover:text-blue-600' },
  { id: 'BILLS',            Icon: Receipt,       label: 'Pay Bills',          hover: 'hover:bg-emerald-50 group-hover:bg-emerald-100 group-hover:text-emerald-600' },
  { id: 'CONTRACTS',        Icon: FileCode,      label: 'Smart\nContracts',   hover: 'hover:bg-indigo-50 group-hover:bg-indigo-100 group-hover:text-indigo-600' },
  { id: 'LOANS',            Icon: HandCoins,     label: 'Lending',            hover: 'hover:bg-amber-50 group-hover:bg-amber-100 group-hover:text-amber-600' },
  { id: 'NPO',              Icon: HeartHandshake,label: 'NPO Hub',            hover: 'hover:bg-rose-50 group-hover:bg-rose-100 group-hover:text-rose-500' },
  { id: 'P2P_EXCHANGE',     Icon: ArrowRightLeft,label: 'P2P Escrow',         hover: 'hover:bg-emerald-50 group-hover:bg-emerald-100 group-hover:text-emerald-600' },
  { id: 'VENTURE_EXCHANGE', Icon: Rocket,        label: 'Venture\nExchange',  hover: 'hover:bg-fuchsia-50 group-hover:bg-fuchsia-100 group-hover:text-fuchsia-600' },
];

const MERCHANT = [
  { id: 'MERCHANT_BILLING',  Icon: Calculator, label: 'Invoicing',   color: 'hover:bg-blue-600' },
  { id: 'MERCHANT_TICKETS',  Icon: Ticket,     label: 'Box Office',  color: 'hover:bg-purple-600' },
];

const NODES = [
  { id: 'CLYRIX', Icon: HeartPulse,   label: 'Clyrix Health', style: 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-50 text-emerald-600' },
  { id: 'PRAXCI', Icon: GraduationCap,label: 'Praxci Edu',    style: 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-50 text-blue-600' },
];

export default function AppDrawerMenu({ isAppDrawerOpen, setIsAppDrawerOpen, setActiveAppPopup }) {
  if (!isAppDrawerOpen) return null;

  const open = (id) => { setActiveAppPopup(id); setIsAppDrawerOpen(false); };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998]"
        onClick={() => setIsAppDrawerOpen(false)}
        onTouchEnd={(e) => { e.preventDefault(); setIsAppDrawerOpen(false); }}
      />

      {/* Drawer panel */}
      <div
        className="absolute top-full mt-3 right-0 w-80 md:w-96 bg-white/98 backdrop-blur-3xl border border-slate-200 shadow-2xl rounded-[2rem] z-[9999] max-h-[82vh] overflow-y-auto no-scrollbar animate-in slide-in-from-top-4 fade-in duration-200"
        style={{ paddingBottom: '16px' }}
      >
        {/* Mobile drag handle */}
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-6 py-3">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Corporate & Tools</h3>
          <button onClick={() => setIsAppDrawerOpen(false)} className="md:hidden w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-5">
          {/* Main app grid */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            {APPS.map(({ id, Icon, label, hover }) => (
              <button
                key={id}
                onClick={() => open(id)}
                className={`flex flex-col items-center gap-2.5 p-2.5 rounded-2xl transition-colors group ${hover.split(' ')[0]}`}
              >
                <div className={`w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 transition-colors shadow-sm ${hover.split(' ').slice(1).join(' ')}`}>
                  <Icon size={20} />
                </div>
                <span className="text-[9px] font-black text-slate-700 leading-tight text-center whitespace-pre-wrap">{label}</span>
              </button>
            ))}
          </div>

          {/* Merchant Services */}
          <div className="border-t border-slate-100 pt-4 mb-3">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Merchant Services</h3>
            <div className="grid grid-cols-2 gap-3">
              {MERCHANT.map(({ id, Icon, label, color }) => (
                <button
                  key={id}
                  onClick={() => open(id)}
                  className={`flex flex-col items-center gap-2.5 p-4 rounded-3xl bg-slate-900 text-white ${color} transition-colors group shadow-md active:scale-95`}
                >
                  <Icon size={22} className={`${id === 'MERCHANT_BILLING' ? 'text-blue-400' : 'text-purple-400'} group-hover:text-white transition-colors`} />
                  <span className="text-[9px] font-black tracking-widest uppercase">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sovereign Nodes */}
          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Sovereign Nodes</h3>
            <div className="grid grid-cols-2 gap-3">
              {NODES.map(({ id, Icon, label, style }) => (
                <button
                  key={id}
                  onClick={() => open(id)}
                  className={`flex flex-col items-center gap-2.5 p-4 rounded-3xl border transition-colors group active:scale-95 ${style}`}
                >
                  <Icon size={22} />
                  <span className="text-[9px] font-black uppercase">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
