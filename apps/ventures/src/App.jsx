import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import AppSwitcher from '@core/components/AppSwitcher';

const VentureXAccelerator = lazy(() => import('./features/venturex/VentureXAccelerator'));
const VentureXFeed = lazy(() => import('./features/venturex/VentureXFeed'));
const VentureXFranchise = lazy(() => import('./features/venturex/VentureXFranchise'));
const VentureXLaunchpad = lazy(() => import('./features/venturex/VentureXLaunchpad'));
const VentureXListings = lazy(() => import('./features/venturex/VentureXListings'));
const VentureXMatchmaker = lazy(() => import('./features/venturex/VentureXMatchmaker'));
const EntrepreneurApplication = lazy(() => import('./features/venturex/EntrepreneurApplication'));
const CapitalMatchmaker = lazy(() => import('./features/capital/CapitalMatchmaker'));
const CapitalPlatform = lazy(() => import('./features/capital/CapitalPlatform'));
const VentureExchange = lazy(() => import('./features/exchange/VentureExchange'));
const MarketIntelligence = lazy(() => import('./features/market/MarketIntelligence'));
const DeusMarket = lazy(() => import('./features/market/DeusMarket'));
const Spinner = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
  </div>
);

const navItems = [
  { path: '/feed', label: 'Feed' },
  { path: '/accelerator', label: 'Accelerator' },
  { path: '/launchpad', label: 'Launchpad' },
  { path: '/listings', label: 'Listings' },
  { path: '/matchmaker', label: 'Matchmaker' },
  { path: '/franchise', label: 'Franchise' },
  { path: '/apply', label: 'Apply' },
  { path: '/capital', label: 'Capital' },
  { path: '/capital-match', label: 'Cap. Match' },
  { path: '/exchange', label: 'Exchange' },
  { path: '/market', label: 'Market Intel' },
  { path: '/deus-market', label: 'DEUS Market' },
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
            <div className="flex items-baseline gap-1.5">
              <span className="text-white font-black text-2xl tracking-tight">DEUS</span>
              <span className="text-blue-400 text-[10px] font-semibold uppercase tracking-widest leading-none mb-0.5">ventures</span>
            </div>
            <p className="text-slate-600 text-[10px] mt-0.5 tracking-wide">Infinite Future Bank</p>
          </div>
          {navItems.map(({ path, label }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
          <AppSwitcher currentApp="ventures" />
        </aside>

        {/* Main content */}
        <main className="flex-1 ml-56 p-6">
          <Suspense fallback={<Spinner />}>
            <Routes>
              <Route path="/" element={<Navigate to="/feed" replace />} />
              <Route path="/feed" element={<VentureXFeed />} />
              <Route path="/accelerator" element={<VentureXAccelerator />} />
              <Route path="/launchpad" element={<VentureXLaunchpad />} />
              <Route path="/listings" element={<VentureXListings />} />
              <Route path="/matchmaker" element={<VentureXMatchmaker />} />
              <Route path="/franchise" element={<VentureXFranchise />} />
              <Route path="/apply" element={<EntrepreneurApplication />} />
              <Route path="/capital" element={<CapitalPlatform />} />
              <Route path="/capital-match" element={<CapitalMatchmaker />} />
              <Route path="/exchange" element={<VentureExchange />} />
              <Route path="/market" element={<MarketIntelligence />} />
              <Route path="/deus-market" element={<DeusMarket />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </Router>
  );
}
