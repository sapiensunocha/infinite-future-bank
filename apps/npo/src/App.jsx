import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { supabase } from './services/supabaseClient';

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
  if (!session) return <Navigate to="https://app.infinitefuturebank.org" />;

  return (
    <Router>
      <div className="min-h-screen bg-slate-950 text-white flex">
        {/* Sidebar */}
        <aside className="w-48 min-h-screen bg-slate-900 border-r border-slate-800 flex flex-col py-6 px-4 gap-1 fixed left-0 top-0 bottom-0">
          <div className="mb-6 px-2">
            <span className="text-emerald-400 font-bold text-xl">NPO Hub</span>
            <p className="text-slate-500 text-xs mt-1">IFB Nonprofit Suite</p>
          </div>
          <NavLink
            to="/hub"
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`
            }
          >
            NPO Hub
          </NavLink>
          <NavLink
            to="/sos"
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`
            }
          >
            Emergency SOS
          </NavLink>
        </aside>

        {/* Main content */}
        <main className="flex-1 ml-48 p-6">
          <Suspense fallback={<Spinner />}>
            <Routes>
              <Route path="/" element={<Navigate to="/hub" replace />} />
              <Route path="/hub" element={<NpoHub />} />
              <Route path="/sos" element={<EmergencySOS />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </Router>
  );
}
