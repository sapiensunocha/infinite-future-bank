import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import AppSwitcher from '@core/components/AppSwitcher';

const TicketingSystem  = lazy(() => import('@core/TicketingSystem'));
const PublicEventPage  = lazy(() => import('@core/PublicEventPage'));
const TicketGate       = lazy(() => import('@core/features/commerce/TicketGate'));

const Spinner = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
  </div>
);

const navItems = [
  { path: '/',        label: 'All Events' },
  { path: '/gate/0',  label: 'Ticket Gate' },
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
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-amber-600 rounded-lg p-1.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-4 h-4">
                  <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" strokeLinecap="round" />
                  <line x1="9" y1="4" x2="9" y2="20" strokeDasharray="2 2" />
                </svg>
              </span>
              <span className="text-amber-400 font-bold text-lg">Events</span>
            </div>
            <p className="text-slate-500 text-xs">IFB Ticketing & Events</p>
          </div>
          {navItems.map(({ path, label }) => (
            <NavLink key={path} to={path}
              className={({ isActive }) => `px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              {label}
            </NavLink>
          ))}
          <AppSwitcher currentApp="events" />
        </aside>
        <main className="flex-1 ml-52 p-6">
          <Suspense fallback={<Spinner />}>
            <Routes>
              <Route path="/"          element={<TicketingSystem />} />
              <Route path="/event/:id" element={<PublicEventPage />} />
              <Route path="/gate/:id"  element={<TicketGate />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </Router>
  );
}
