import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { supabase } from './services/supabaseClient';

const AdminKYCPortal = lazy(() => import('./AdminKYCPortal'));
const KYCWizard = lazy(() => import('./features/kyc/KYCWizard'));
const IFBAudit = lazy(() => import('./IFBAudit'));
const AdminDashboard = lazy(() => import('./AdminDashboard'));
const AdminSupportDesk = lazy(() => import('./AdminSupportDesk'));

const Spinner = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
  </div>
);

const navItems = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/kyc', label: 'KYC Portal' },
  { path: '/kyc-wizard', label: 'KYC Wizard' },
  { path: '/audit', label: 'IFB Audit' },
  { path: '/support', label: 'Support Desk' },
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
        <aside className="w-52 min-h-screen bg-slate-900 border-r border-slate-800 flex flex-col py-6 px-4 gap-1 fixed left-0 top-0 bottom-0 overflow-y-auto">
          <div className="mb-6 px-2">
            <span className="text-red-400 font-bold text-xl">IFB Admin</span>
            <p className="text-slate-500 text-xs mt-1">Administration Panel</p>
          </div>
          {navItems.map(({ path, label }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-red-700 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </aside>

        {/* Main content */}
        <main className="flex-1 ml-52 p-6">
          <Suspense fallback={<Spinner />}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<AdminDashboard />} />
              <Route path="/kyc" element={<AdminKYCPortal />} />
              <Route path="/kyc-wizard" element={<KYCWizard />} />
              <Route path="/audit" element={<IFBAudit />} />
              <Route path="/support" element={<AdminSupportDesk />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </Router>
  );
}
