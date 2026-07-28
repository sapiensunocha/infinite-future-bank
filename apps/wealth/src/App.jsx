import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { supabase } from './services/supabaseClient';

const CommunityLoanNetwork = lazy(() => import('./features/lending/CommunityLoanNetwork'));
const LombardCredit = lazy(() => import('./features/lending/LombardCredit'));
const AgriShield = lazy(() => import('./features/insurance/AgriShield'));
const PensionFund = lazy(() => import('./features/pension/PensionFund'));
const PocketVaultSync = lazy(() => import('./features/mysafe/PocketVaultSync'));
const VaultManager = lazy(() => import('./features/mysafe/VaultManager'));
const CashOptimizer = lazy(() => import('./features/treasury/CashOptimizer'));
const WholeWealthDashboard = lazy(() => import('./features/dashboard/WholeWealthDashboard'));
const FinancialPlanner = lazy(() => import('./FinancialPlanner'));
const WealthInvest = lazy(() => import('./WealthInvest'));
const NetPositionHome = lazy(() => import('./NetPositionHome'));
const P2PExchange = lazy(() => import('./P2PExchange'));

const Spinner = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
  </div>
);

const navItems = [
  { path: '/dashboard', label: 'Whole Wealth' },
  { path: '/net-position', label: 'Net Position' },
  { path: '/planner', label: 'Financial Planner' },
  { path: '/invest', label: 'Wealth Invest' },
  { path: '/p2p', label: 'P2P Exchange' },
  { path: '/cash-optimizer', label: 'Cash Optimizer' },
  { path: '/lombard', label: 'Lombard Credit' },
  { path: '/community-loan', label: 'Community Loan' },
  { path: '/agri-shield', label: 'AgriShield' },
  { path: '/pension', label: 'Pension Fund' },
  { path: '/vault', label: 'My Safe' },
  { path: '/vault-sync', label: 'Vault Sync' },
];

export default function App() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return <Spinner />;
  if (!session) return <Navigate to="https://app.infinitefuturebank.org" />;

  return (
    <Router>
      <div className="min-h-screen bg-slate-950 text-white flex">
        {/* Sidebar */}
        <aside className="w-56 min-h-screen bg-slate-900 border-r border-slate-800 flex flex-col py-6 px-4 gap-1 fixed left-0 top-0 bottom-0 overflow-y-auto">
          <div className="mb-6 px-2">
            <span className="text-emerald-400 font-bold text-xl">IFB Wealth</span>
            <p className="text-slate-500 text-xs mt-1">Wealth Management</p>
          </div>
          {navItems.map(({ path, label }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </aside>

        {/* Main content */}
        <main className="flex-1 ml-56 p-6">
          <Suspense fallback={<Spinner />}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<WholeWealthDashboard />} />
              <Route path="/net-position" element={<NetPositionHome />} />
              <Route path="/planner" element={<FinancialPlanner />} />
              <Route path="/invest" element={<WealthInvest />} />
              <Route path="/p2p" element={<P2PExchange />} />
              <Route path="/cash-optimizer" element={<CashOptimizer />} />
              <Route path="/lombard" element={<LombardCredit />} />
              <Route path="/community-loan" element={<CommunityLoanNetwork />} />
              <Route path="/agri-shield" element={<AgriShield />} />
              <Route path="/pension" element={<PensionFund />} />
              <Route path="/vault" element={<VaultManager />} />
              <Route path="/vault-sync" element={<PocketVaultSync />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </Router>
  );
}
