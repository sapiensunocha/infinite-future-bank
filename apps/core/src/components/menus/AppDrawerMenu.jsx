import React from 'react';
import { Users, Receipt, FileCode, HandCoins, HeartHandshake, ArrowRightLeft, Rocket, Calculator, Ticket, HeartPulse, GraduationCap, X, ShoppingBag, TrendingUp, Leaf, Gift } from 'lucide-react';

const APPS = [
  { id: 'PAYROLL',          Icon: Users,         label: 'Payroll',            hover: 'hover:bg-slate-50 text-slate-700' },
  { id: 'BILLS',            Icon: Receipt,       label: 'Pay Bills',          hover: 'hover:bg-slate-50 text-slate-700' },
  { id: 'CONTRACTS',        Icon: FileCode,      label: 'Smart Contracts',   hover: 'hover:bg-slate-50 text-slate-700' },
  { id: 'LOANS',            Icon: HandCoins,     label: 'Lending',            hover: 'hover:bg-slate-50 text-slate-700' },
  { id: 'NPO',              Icon: HeartHandshake,label: 'NPO Hub',            hover: 'hover:bg-slate-50 text-slate-700' },
  { id: 'P2P_EXCHANGE',     Icon: ArrowRightLeft,label: 'P2P Escrow',         hover: 'hover:bg-slate-50 text-slate-700' },
  { id: 'VENTURE_EXCHANGE', Icon: Rocket,        label: 'Venture Exchange',   hover: 'hover:bg-slate-50 text-slate-700' },
];

const MERCHANT = [
  { id: 'MERCHANT_BILLING',  Icon: Calculator, label: 'Invoicing' },
  { id: 'MERCHANT_TICKETS',  Icon: Ticket,     label: 'Box Office' },
];

const NODES = [
  { id: 'CLYRIX', Icon: HeartPulse,   label: 'Clyrix Health' },
  { id: 'PRAXCI', Icon: GraduationCap,label: 'Praxci Edu' },
];

const MARKETPLACE = [
  { id: 'DEUS_MARKET', Icon: ShoppingBag, label: 'DEUS Marketplace' },
];

const PROTECTION = [
  { id: 'PENSION_FUND',  Icon: TrendingUp, label: 'IFB Pension' },
  { id: 'AGRI_SHIELD',   Icon: Leaf,       label: 'AgriShield' },
];

const EARN = [
  { id: 'CAPITAL_NETWORK', Icon: Gift, label: 'Referral Network', desc: 'Invite partners and earn platform incentives' },
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
        className="absolute top-full mt-2 right-0 w-80 md:w-96 bg-white border border-slate-200 shadow-xl rounded-2xl z-[9999] max-h-[80vh] overflow-y-auto no-scrollbar animate-in slide-in-from-top-2 fade-in duration-150 p-4"
      >
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
          <h3 className="text-xs font-bold text-slate-900">Services & Applications</h3>
          <button onClick={() => setIsAppDrawerOpen(false)} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors">
            <X size={15} />
          </button>
        </div>

        <div>
          {/* Main app grid */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {APPS.map(({ id, Icon, label }) => (
              <button
                key={id}
                onClick={() => open(id)}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl hover:bg-slate-50 transition-colors group text-center"
              >
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 group-hover:text-blue-600 group-hover:bg-blue-50 transition-colors border border-slate-200/50">
                  <Icon size={18} />
                </div>
                <span className="text-[10px] font-semibold text-slate-700 leading-tight">{label}</span>
              </button>
            ))}
          </div>

          {/* Merchant Services */}
          <div className="border-t border-slate-100 pt-3 mb-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Merchant Services</h4>
            <div className="grid grid-cols-2 gap-2">
              {MERCHANT.map(({ id, Icon, label }) => (
                <button
                  key={id}
                  onClick={() => open(id)}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-800 transition-colors group"
                >
                  <Icon size={18} className="text-blue-600 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sovereign Nodes */}
          <div className="border-t border-slate-100 pt-3 mb-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Institutional Hubs</h4>
            <div className="grid grid-cols-2 gap-2">
              {NODES.map(({ id, Icon, label }) => (
                <button
                  key={id}
                  onClick={() => open(id)}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-800 transition-colors group"
                >
                  <Icon size={18} className="text-indigo-600 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Marketplace */}
          <div className="border-t border-slate-100 pt-3 mb-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Marketplace</h4>
            {MARKETPLACE.map(({ id, Icon, label }) => (
              <button
                key={id}
                onClick={() => open(id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-800 transition-colors group"
              >
                <Icon size={18} className="text-emerald-600 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold">{label}</span>
              </button>
            ))}
          </div>

          {/* Protection & Earn */}
          <div className="border-t border-slate-100 pt-3 mb-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Security & Network</h4>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {PROTECTION.map(({ id, Icon, label }) => (
                <button
                  key={id}
                  onClick={() => open(id)}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-800 transition-colors group"
                >
                  <Icon size={18} className="text-blue-600 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold">{label}</span>
                </button>
              ))}
            </div>
            {EARN.map(({ id, Icon, label, desc }) => (
              <button
                key={id}
                onClick={() => open(id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-blue-50/60 hover:bg-blue-50 border border-blue-100 text-slate-800 transition-colors text-left group"
              >
                <Icon size={18} className="text-blue-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-blue-950">{label}</p>
                  <p className="text-[10px] text-slate-500 truncate">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
