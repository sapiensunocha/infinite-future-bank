import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import AppSwitcher from '@core/components/AppSwitcher';

const CommunityLoanNetwork  = lazy(() => import('@core/features/lending/CommunityLoanNetwork'));
const LombardCredit         = lazy(() => import('@core/features/lending/LombardCredit'));
const AgriShield            = lazy(() => import('@core/features/insurance/AgriShield'));
const PensionFund           = lazy(() => import('@core/features/pension/PensionFund'));
const PocketVaultSync       = lazy(() => import('@core/features/mysafe/PocketVaultSync'));
const VaultManager          = lazy(() => import('@core/features/mysafe/VaultManager'));
const CashOptimizer         = lazy(() => import('@core/features/treasury/CashOptimizer'));
const WealthHome = () => (
  <div className="p-8">
    <h1 className="text-3xl font-black text-white mb-2">IFB Wealth</h1>
    <p className="text-slate-400">Select a tool from the sidebar.</p>
  </div>
);
const FinancialPlanner      = lazy(() => import('@core/FinancialPlanner'));
const WealthInvest          = lazy(() => import('@core/WealthInvest'));
const NetPositionHome       = lazy(() => import('@core/views/NetPositionHome'));
const P2PExchange           = lazy(() => import('@core/P2PExchange'));

const Spinner = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
  </div>
);

const navItems = [
  { path: '/dashboard',     label: 'Overview' },
  { path: '/net-position',  label: 'Net Position' },
  { path: '/planner',       label: 'Financial Planner' },
  { path: '/invest',        label: 'Wealth Invest' },
  { path: '/p2p',           label: 'P2P Exchange' },
  { path: '/cash-optimizer',label: 'Cash Optimizer' },
  { path: '/lombard',       label: 'Lombard Credit' },
  { path: '/community-loan',label: 'Community Loan' },
  { path: '/agri-shield',   label: 'AgriShield' },
  { path: '/pension',       label: 'Pension Fund' },
  { path: '/vault',         label: 'My Safe' },
  { path: '/vault-sync',    label: 'Vault Sync' },
];

export default function App() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return <Spinner />;
  if (!session) { window.location.href = 'https://app.infinitefuturebank.org'; return null; }

  return (
    <Router>
      <div className="min-h-screen bg-slate-950 text-white flex">
        <aside className="w-56 min-h-screen bg-slate-900 border-r border-slate-800 flex flex-col py-6 px-4 gap-1 fixed left-0 top-0 bottom-0 overflow-y-auto">
          <div className="mb-6 px-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-white font-black text-2xl tracking-tight">DEUS</span>
              <span className="text-emerald-400 text-[10px] font-semibold uppercase tracking-widest leading-none mb-0.5">wealth</span>
            </div>
            <p className="text-slate-600 text-[10px] mt-0.5 tracking-wide">Infinite Future Bank</p>
          </div>
          {navItems.map(({ path, label }) => (
            <NavLink key={path} to={path}
              className={({ isActive }) => `px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              {label}
            </NavLink>
          ))}
          <AppSwitcher currentApp="wealth" supabase={supabase} />
        </aside>
        <main className="flex-1 ml-56 p-6">
          <Suspense fallback={<Spinner />}>
            <Routes>
              <Route path="/"             element={<WealthHome />} />
              <Route path="/dashboard"    element={<WealthHome />} />
              <Route path="/net-position" element={<NetPositionHome />} />
              <Route path="/planner"      element={<FinancialPlanner />} />
              <Route path="/invest"       element={<WealthInvest />} />
              <Route path="/p2p"          element={<P2PExchange />} />
              <Route path="/cash-optimizer" element={<CashOptimizer />} />
              <Route path="/lombard"      element={<LombardCredit />} />
              <Route path="/community-loan" element={<CommunityLoanNetwork />} />
              <Route path="/agri-shield"  element={<AgriShield />} />
              <Route path="/pension"      element={<PensionFund />} />
              <Route path="/vault"        element={<VaultManager />} />
              <Route path="/vault-sync"   element={<PocketVaultSync />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </Router>
  );
}
