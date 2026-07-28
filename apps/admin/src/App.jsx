import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import AppSwitcher from '@core/components/AppSwitcher';

const AdminKYCPortal  = lazy(() => import('@core/features/kyc/AdminKYCPortal'));
const KYCWizard       = lazy(() => import('@core/features/kyc/KYCWizard'));
const IFBAudit        = lazy(() => import('@core/features/audit/IFBAudit'));
const AdminDashboard  = lazy(() => import('@core/AdminDashboard'));
const AdminSupportDesk= lazy(() => import('@core/AdminSupportDesk'));

const Spinner = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
  </div>
);

const navItems = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/kyc',       label: 'KYC Portal' },
  { path: '/kyc-wizard',label: 'KYC Wizard' },
  { path: '/audit',     label: 'IFB Audit' },
  { path: '/support',   label: 'Support Desk' },
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
        <aside className="w-52 min-h-screen bg-slate-900 border-r border-slate-800 flex flex-col py-6 px-4 gap-1 fixed left-0 top-0 bottom-0 overflow-y-auto">
          <div className="mb-6 px-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-white font-black text-2xl tracking-tight">DEUS</span>
              <span className="text-red-400 text-[10px] font-semibold uppercase tracking-widest leading-none mb-0.5">admin</span>
            </div>
            <p className="text-slate-600 text-[10px] mt-0.5 tracking-wide">Infinite Future Bank</p>
          </div>
          {navItems.map(({ path, label }) => (
            <NavLink key={path} to={path}
              className={({ isActive }) => `px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-red-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              {label}
            </NavLink>
          ))}
          <AppSwitcher currentApp="admin" />
        </aside>
        <main className="flex-1 ml-52 p-6">
          <Suspense fallback={<Spinner />}>
            <Routes>
              <Route path="/"          element={<AdminDashboard />} />
              <Route path="/dashboard" element={<AdminDashboard />} />
              <Route path="/kyc"       element={<AdminKYCPortal />} />
              <Route path="/kyc-wizard"element={<KYCWizard />} />
              <Route path="/audit"     element={<IFBAudit />} />
              <Route path="/support"   element={<AdminSupportDesk />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </Router>
  );
}
