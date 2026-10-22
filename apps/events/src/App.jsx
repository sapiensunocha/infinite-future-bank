import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import AppSwitcher from '@core/components/AppSwitcher';
import { Sparkles, LogOut, Home, CalendarDays, ScanLine } from 'lucide-react';

const EventsDashboard = lazy(() => import('./EventsDashboard'));
const TicketingSystem = lazy(() => import('@core/TicketingSystem'));
const PublicEventPage = lazy(() => import('@core/PublicEventPage'));
const TicketGate      = lazy(() => import('@core/features/commerce/TicketGate'));

const Spinner = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
  </div>
);

const navItems = [
  { path: '/',       icon: Home,        label: 'Dashboard'  },
  { path: '/events', icon: CalendarDays,label: 'All Events' },
  { path: '/gate/0', icon: ScanLine,    label: 'Ticket Gate'},
];

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
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-200 relative">
        <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400/20 rounded-full blur-[120px]" />
        </div>
        <div className="flex h-screen overflow-hidden max-w-7xl mx-auto">

          <aside className="w-64 bg-slate-100/90 backdrop-blur-xl border-r border-slate-200/60 flex flex-col shrink-0">
            <div className="p-6 shrink-0">
              <div className="flex items-center gap-1">
                <span className="text-4xl font-black text-[#4285F4]">D</span>
                <span className="text-4xl font-black text-[#EA4335]">E</span>
                <span className="text-4xl font-black text-[#FBBC04]">U</span>
                <span className="text-4xl font-black text-[#34A853]">S</span>
                <Sparkles size={18} className="text-blue-500 ml-1" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">events</p>
            </div>

            <nav className="flex-1 overflow-y-auto py-2 px-4 space-y-1 no-scrollbar">
              {navItems.map(({ path, icon: Icon, label }) => (
                <NavLink key={path} to={path} end={path === '/'}
                  className={({ isActive }) => `w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                    isActive
                      ? 'bg-blue-600/10 text-blue-600 shadow-inner'
                      : 'text-slate-500 hover:bg-white/60 hover:text-slate-800 active:bg-white/80'
                  }`}>
                  <Icon size={18} className="shrink-0" />
                  {label}
                </NavLink>
              ))}
            </nav>

            <div className="px-4 pb-2">
              <AppSwitcher currentApp="events" supabase={supabase} light />
            </div>
            <div className="p-4 border-t border-slate-200/60 shrink-0">
              <button onClick={() => supabase.auth.signOut()}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-200/60 hover:text-slate-800 transition-all">
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </aside>

          <main className="flex-1 overflow-y-auto p-6 no-scrollbar">
            <Suspense fallback={<Spinner />}>
              <Routes>
                <Route path="/"          element={<EventsDashboard />} />
                <Route path="/events"    element={<TicketingSystem />} />
                <Route path="/event/:id" element={<PublicEventPage />} />
                <Route path="/gate/:id"  element={<TicketGate />} />
              </Routes>
            </Suspense>
          </main>

        </div>
      </div>
    </Router>
  );
}
