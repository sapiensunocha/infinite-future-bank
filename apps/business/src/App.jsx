import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import AppSwitcher from '@core/components/AppSwitcher';

const BusinessDashboard     = lazy(() => import('./BusinessDashboard'));
const CompanyFormationHub   = lazy(() => import('@core/features/formation/CompanyFormationHub'));
const BillingTerminal       = lazy(() => import('@core/features/commerce/BillingTerminal'));
const AFRNetworkPanel       = lazy(() => import('@core/features/network/AFRNetworkPanel'));
const TapToPay              = lazy(() => import('@core/features/terminal/TapToPay'));
const BecomeProcessor       = lazy(() => import('@core/features/cot/BecomeProcessor'));
const ProcessorMap          = lazy(() => import('@core/features/cot/ProcessorMap'));
const FirstCustomerEngine   = lazy(() => import('@core/features/gtm/FirstCustomerEngine'));
const ExecutiveCrm          = lazy(() => import('@core/ExecutiveCrm'));
const Payroll               = lazy(() => import('@core/Payroll'));
const SmartContracts        = lazy(() => import('@core/SmartContracts'));
const CommercialUnderwriting = lazy(() => import('@core/views/CommercialUnderwriting'));
const DeusMarket            = lazy(() => import('@core/features/market/DeusMarket'));
const DeusNexus             = lazy(() => import('@core/components/ui/DeusNexus'));
const MarketIntelligence    = lazy(() => import('@core/features/market/MarketIntelligence'));
const OrganizationSuite     = lazy(() => import('@core/OrganizationSuite'));

const Spinner = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
  </div>
);

const navItems = [
  { path: '/',                label: 'Dashboard' },
  { path: '/formation',       label: 'Company Formation' },
  { path: '/billing',         label: 'Billing Terminal' },
  { path: '/payroll',         label: 'Payroll' },
  { path: '/contracts',       label: 'Smart Contracts' },
  { path: '/crm',             label: 'Executive CRM' },
  { path: '/underwriting',    label: 'Underwriting' },
  { path: '/first-customer',  label: 'First Customer' },
  { path: '/network',         label: 'AFR Network' },
  { path: '/tap-to-pay',      label: 'Tap To Pay' },
  { path: '/become-processor',label: 'Become Processor' },
  { path: '/processor-map',   label: 'Processor Map' },
  { path: '/deus-market',     label: 'DEUS Market' },
  { path: '/deus-nexus',      label: 'DEUS Nexus' },
  { path: '/market-intel',    label: 'Market Intel' },
  { path: '/org-suite',       label: 'Org Suite' },
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
      <div className="min-h-screen bg-slate-950 text-white flex">
        <aside className="w-56 min-h-screen bg-slate-900 border-r border-slate-800 flex flex-col py-6 px-4 gap-1 fixed left-0 top-0 bottom-0 overflow-y-auto">
          <div className="mb-6 px-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-white font-black text-2xl tracking-tight">DEUS</span>
              <span className="text-cyan-400 text-[10px] font-semibold uppercase tracking-widest leading-none mb-0.5">business</span>
            </div>
            <p className="text-slate-600 text-[10px] mt-0.5 tracking-wide">Infinite Future Bank</p>
          </div>
          {navItems.map(({ path, label }) => (
            <NavLink key={path} to={path}
              className={({ isActive }) => `px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              {label}
            </NavLink>
          ))}
          <AppSwitcher currentApp="business" supabase={supabase} />
        </aside>
        <main className="flex-1 ml-56 p-6">
          <Suspense fallback={<Spinner />}>
            <Routes>
              <Route path="/"                element={<BusinessDashboard />} />
              <Route path="/formation"       element={<CompanyFormationHub />} />
              <Route path="/billing"         element={<BillingTerminal />} />
              <Route path="/network"         element={<AFRNetworkPanel />} />
              <Route path="/tap-to-pay"      element={<TapToPay />} />
              <Route path="/become-processor"element={<BecomeProcessor />} />
              <Route path="/processor-map"   element={<ProcessorMap />} />
              <Route path="/first-customer"  element={<FirstCustomerEngine />} />
              <Route path="/crm"             element={<ExecutiveCrm />} />
              <Route path="/payroll"         element={<Payroll />} />
              <Route path="/contracts"       element={<SmartContracts />} />
              <Route path="/underwriting"    element={<CommercialUnderwriting />} />
              <Route path="/deus-market"     element={<DeusMarket />} />
              <Route path="/deus-nexus"      element={<DeusNexus />} />
              <Route path="/market-intel"    element={<MarketIntelligence />} />
              <Route path="/org-suite"       element={<OrganizationSuite />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </Router>
  );
}
