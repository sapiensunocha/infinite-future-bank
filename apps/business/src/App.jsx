import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { supabase } from './services/supabaseClient';

const CompanyFormationHub = lazy(() => import('./features/formation/CompanyFormationHub'));
const BillingTerminal = lazy(() => import('./features/commerce/BillingTerminal'));
const AFRNetworkPanel = lazy(() => import('./features/network/AFRNetworkPanel'));
const TapToPay = lazy(() => import('./features/network/TapToPay'));
const BecomeProcessor = lazy(() => import('./features/cot/BecomeProcessor'));
const ProcessorMap = lazy(() => import('./features/cot/ProcessorMap'));
const FirstCustomerEngine = lazy(() => import('./features/gtm/FirstCustomerEngine'));
const ExecutiveCrm = lazy(() => import('./ExecutiveCrm'));
const Payroll = lazy(() => import('./Payroll'));
const SmartContracts = lazy(() => import('./SmartContracts'));
const CommercialUnderwriting = lazy(() => import('./CommercialUnderwriting'));
const DeusMarket = lazy(() => import('./DeusMarket'));
const DeusNexus = lazy(() => import('./DeusNexus'));
const MarketIntelligence = lazy(() => import('./MarketIntelligence'));
const OrganizationSuite = lazy(() => import('./OrganizationSuite'));

const Spinner = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
  </div>
);

const navItems = [
  { path: '/formation', label: 'Company Formation' },
  { path: '/billing', label: 'Billing Terminal' },
  { path: '/network', label: 'AFR Network' },
  { path: '/tap-to-pay', label: 'Tap To Pay' },
  { path: '/become-processor', label: 'Become Processor' },
  { path: '/processor-map', label: 'Processor Map' },
  { path: '/first-customer', label: 'First Customer' },
  { path: '/crm', label: 'Executive CRM' },
  { path: '/payroll', label: 'Payroll' },
  { path: '/contracts', label: 'Smart Contracts' },
  { path: '/underwriting', label: 'Underwriting' },
  { path: '/deus-market', label: 'DEUS Market' },
  { path: '/deus-nexus', label: 'DEUS Nexus' },
  { path: '/market-intel', label: 'Market Intel' },
  { path: '/org-suite', label: 'Org Suite' },
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
            <span className="text-cyan-400 font-bold text-xl">IFB Business</span>
            <p className="text-slate-500 text-xs mt-1">Business Suite</p>
          </div>
          {navItems.map(({ path, label }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-cyan-600 text-white'
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
              <Route path="/" element={<Navigate to="/formation" replace />} />
              <Route path="/formation" element={<CompanyFormationHub />} />
              <Route path="/billing" element={<BillingTerminal />} />
              <Route path="/network" element={<AFRNetworkPanel />} />
              <Route path="/tap-to-pay" element={<TapToPay />} />
              <Route path="/become-processor" element={<BecomeProcessor />} />
              <Route path="/processor-map" element={<ProcessorMap />} />
              <Route path="/first-customer" element={<FirstCustomerEngine />} />
              <Route path="/crm" element={<ExecutiveCrm />} />
              <Route path="/payroll" element={<Payroll />} />
              <Route path="/contracts" element={<SmartContracts />} />
              <Route path="/underwriting" element={<CommercialUnderwriting />} />
              <Route path="/deus-market" element={<DeusMarket />} />
              <Route path="/deus-nexus" element={<DeusNexus />} />
              <Route path="/market-intel" element={<MarketIntelligence />} />
              <Route path="/org-suite" element={<OrganizationSuite />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </Router>
  );
}
