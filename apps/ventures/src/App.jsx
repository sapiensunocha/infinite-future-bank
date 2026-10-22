import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import AppSwitcher from '@core/components/AppSwitcher';
import {
  Sparkles, LogOut,
  Home, Newspaper, Rocket, Star, Globe, Users,
  Briefcase, FileText, DollarSign, Target, TrendingUp, BarChart3, Zap
} from 'lucide-react';

const VenturesDashboard       = lazy(() => import('./VenturesDashboard'));
const VentureXAccelerator     = lazy(() => import('./features/venturex/VentureXAccelerator'));
const VentureXFeed            = lazy(() => import('./features/venturex/VentureXFeed'));
const VentureXFranchise       = lazy(() => import('./features/venturex/VentureXFranchise'));
const VentureXLaunchpad       = lazy(() => import('./features/venturex/VentureXLaunchpad'));
const VentureXListings        = lazy(() => import('./features/venturex/VentureXListings'));
const VentureXMatchmaker      = lazy(() => import('./features/venturex/VentureXMatchmaker'));
const EntrepreneurApplication = lazy(() => import('./features/venturex/EntrepreneurApplication'));
const CapitalMatchmaker       = lazy(() => import('./features/capital/CapitalMatchmaker'));
const CapitalPlatform         = lazy(() => import('./features/capital/CapitalPlatform'));
const VentureExchange         = lazy(() => import('./features/exchange/VentureExchange'));
const MarketIntelligence      = lazy(() => import('./features/market/MarketIntelligence'));
const DeusMarket              = lazy(() => import('./features/market/DeusMarket'));

const Spinner = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
  </div>
);

const navItems = [
  { path: '/',              icon: Home,       label: 'Dashboard'  },
  { path: '/feed',          icon: Newspaper,  label: 'Feed'       },
  { path: '/accelerator',   icon: Rocket,     label: 'Accelerator'},
  { path: '/launchpad',     icon: Star,       label: 'Launchpad'  },
  { path: '/listings',      icon: Globe,      label: 'Listings'   },
  { path: '/matchmaker',    icon: Users,      label: 'Matchmaker' },
  { path: '/franchise',     icon: Briefcase,  label: 'Franchise'  },
  { path: '/apply',         icon: FileText,   label: 'Apply'      },
  { path: '/capital',       icon: DollarSign, label: 'Capital'    },
  { path: '/capital-match', icon: Target,     label: 'Cap. Match' },
  { path: '/exchange',      icon: TrendingUp, label: 'Exchange'   },
  { path: '/market',        icon: BarChart3,  label: 'Market Intel'},
  { path: '/deus-market',   icon: Zap,        label: 'DEUS Market'},
];

export default function App() {
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [balances, setBalances] = useState({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    const uid = session.user.id;
    Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
      supabase.from('accounts_balance').select('*').eq('user_id', uid).maybeSingle(),
    ]).then(([p, b]) => {
      if (p.data) setProfile(p.data);
      if (b.data) setBalances(b.data);
    });
  }, [session]);

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
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">ventures</p>
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
              <AppSwitcher currentApp="ventures" supabase={supabase} light />
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
                <Route path="/"              element={<VenturesDashboard />} />
                <Route path="/feed"          element={<VentureXFeed />} />
                <Route path="/accelerator"   element={<VentureXAccelerator />} />
                <Route path="/launchpad"     element={<VentureXLaunchpad />} />
                <Route path="/listings"      element={<VentureXListings session={session} />} />
                <Route path="/matchmaker"    element={<VentureXMatchmaker session={session} profile={profile} balances={balances} />} />
                <Route path="/franchise"     element={<VentureXFranchise />} />
                <Route path="/apply"         element={<EntrepreneurApplication session={session} />} />
                <Route path="/capital"       element={<CapitalPlatform session={session} profile={profile} />} />
                <Route path="/capital-match" element={<CapitalMatchmaker session={session} profile={profile} commercialProfile={profile} />} />
                <Route path="/exchange"      element={<VentureExchange />} />
                <Route path="/market"        element={<MarketIntelligence />} />
                <Route path="/deus-market"   element={<DeusMarket />} />
              </Routes>
            </Suspense>
          </main>

        </div>
      </div>
    </Router>
  );
}
