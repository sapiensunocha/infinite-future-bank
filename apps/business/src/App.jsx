import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import AppSwitcher from '@core/components/AppSwitcher';
import {
  Sparkles, LogOut,
  Home, Building2, CreditCard, Users, FileText, Briefcase,
  ShieldCheck, Target, Globe, Phone, Cpu, MapPin,
  TrendingUp, Zap, BarChart3, Landmark
} from 'lucide-react';

const BusinessDashboard      = lazy(() => import('./BusinessDashboard'));
const CompanyFormationHub    = lazy(() => import('@core/features/formation/CompanyFormationHub'));
const BillingTerminal        = lazy(() => import('@core/features/commerce/BillingTerminal'));
const AFRNetworkPanel        = lazy(() => import('@core/features/network/AFRNetworkPanel'));
const TapToPay               = lazy(() => import('@core/features/terminal/TapToPay'));
const BecomeProcessor        = lazy(() => import('@core/features/cot/BecomeProcessor'));
const ProcessorMap           = lazy(() => import('@core/features/cot/ProcessorMap'));
const FirstCustomerEngine    = lazy(() => import('@core/features/gtm/FirstCustomerEngine'));
const ExecutiveCrm           = lazy(() => import('@core/ExecutiveCrm'));
const Payroll                = lazy(() => import('@core/Payroll'));
const SmartContracts         = lazy(() => import('@core/SmartContracts'));
const CommercialUnderwriting = lazy(() => import('@core/views/CommercialUnderwriting'));
const DeusMarket             = lazy(() => import('@core/features/market/DeusMarket'));
const DeusNexus              = lazy(() => import('@core/components/ui/DeusNexus'));
const MarketIntelligence     = lazy(() => import('@core/features/market/MarketIntelligence'));
const OrganizationSuite      = lazy(() => import('@core/OrganizationSuite'));

const Spinner = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
  </div>
);

const navItems = [
  { path: '/',                 icon: Home,        label: 'Dashboard'        },
  { path: '/formation',        icon: Building2,   label: 'Company Formation'},
  { path: '/billing',          icon: CreditCard,  label: 'Billing Terminal' },
  { path: '/payroll',          icon: Users,       label: 'Payroll'          },
  { path: '/contracts',        icon: FileText,    label: 'Smart Contracts'  },
  { path: '/crm',              icon: Briefcase,   label: 'Executive CRM'    },
  { path: '/underwriting',     icon: ShieldCheck, label: 'Underwriting'     },
  { path: '/first-customer',   icon: Target,      label: 'First Customer'   },
  { path: '/network',          icon: Globe,       label: 'AFR Network'      },
  { path: '/tap-to-pay',       icon: Phone,       label: 'Tap To Pay'       },
  { path: '/become-processor', icon: Cpu,         label: 'Become Processor' },
  { path: '/processor-map',    icon: MapPin,      label: 'Processor Map'    },
  { path: '/deus-market',      icon: TrendingUp,  label: 'DEUS Market'      },
  { path: '/deus-nexus',       icon: Zap,         label: 'DEUS Nexus'       },
  { path: '/market-intel',     icon: BarChart3,   label: 'Market Intel'     },
  { path: '/org-suite',        icon: Landmark,    label: 'Org Suite'        },
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
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">business</p>
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
              <AppSwitcher currentApp="business" supabase={supabase} light />
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
                <Route path="/"                 element={<BusinessDashboard />} />
                <Route path="/formation"        element={<CompanyFormationHub />} />
                <Route path="/billing"          element={<BillingTerminal />} />
                <Route path="/network"          element={<AFRNetworkPanel />} />
                <Route path="/tap-to-pay"       element={<TapToPay />} />
                <Route path="/become-processor" element={<BecomeProcessor />} />
                <Route path="/processor-map"    element={<ProcessorMap />} />
                <Route path="/first-customer"   element={<FirstCustomerEngine />} />
                <Route path="/crm"              element={<ExecutiveCrm />} />
                <Route path="/payroll"          element={<Payroll />} />
                <Route path="/contracts"        element={<SmartContracts />} />
                <Route path="/underwriting"     element={<CommercialUnderwriting />} />
                <Route path="/deus-market"      element={<DeusMarket />} />
                <Route path="/deus-nexus"       element={<DeusNexus />} />
                <Route path="/market-intel"     element={<MarketIntelligence />} />
                <Route path="/org-suite"        element={<OrganizationSuite />} />
              </Routes>
            </Suspense>
          </main>

        </div>
      </div>
    </Router>
  );
}
