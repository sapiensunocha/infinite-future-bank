import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import AppSwitcher from '@core/components/AppSwitcher';

const NpoDashboard = lazy(() => import('./NpoDashboard'));
const NpoHub = lazy(() => import('./NpoHub'));
const EmergencySOS = lazy(() => import('./EmergencySOS'));

const Spinner = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
  </div>
);

export default function App() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return <Spinner />;
  if (!session) { const _coreUrl = window.location.hostname === 'localhost' ? 'http://localhost:5173' : 'https://app.infinitefuturebank.org'; const _rt = encodeURIComponent(window.location.href.split('#')[0]); window.location.href = `${_coreUrl}?return_to=${_rt}`; return null; }

  return (
    <Router>
      <div className="min-h-screen bg-slate-950 text-white flex">
        {/* Sidebar */}
        <aside className="w-52 min-h-screen bg-slate-900 border-r border-slate-800 flex flex-col py-6 px-4 gap-1 fixed left-0 top-0 bottom-0 overflow-y-auto">
          <div className="mb-6 px-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-white font-black text-2xl tracking-tight">DEUS</span>
              <span className="text-rose-400 text-[10px] font-semibold uppercase tracking-widest leading-none mb-0.5">npo</span>
            </div>
            <p className="text-slate-600 text-[10px] mt-0.5 tracking-wide">Infinite Future Bank</p>
          </div>
          {[
            { path: '/',    label: 'Dashboard'     },
            { path: '/hub', label: 'NPO Hub'       },
            { path: '/sos', label: 'Emergency SOS' },
          ].map(({ path, label }) => (
            <NavLink key={path} to={path} end={path === '/'}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`
              }>{label}</NavLink>
          ))}
          <AppSwitcher currentApp="npo" supabase={supabase} />
        </aside>

        {/* Main content */}
        <main className="flex-1 ml-52 p-6">
          <Suspense fallback={<Spinner />}>
            <Routes>
              <Route path="/"    element={<NpoDashboard />} />
              <Route path="/hub" element={<NpoHub />} />
              <Route path="/sos" element={<EmergencySOS />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </Router>
  );
}
