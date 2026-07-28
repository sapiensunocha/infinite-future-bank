import React, { useState } from 'react';
import { Building, ShieldCheck, Loader2, TrendingUp, Lock, Globe, ClipboardCheck, Brain, Target, HandCoins, Gift, BarChart3 } from 'lucide-react';
import CompanyFormationHub from '../features/formation/CompanyFormationHub';
import IFBAudit from '../features/audit/IFBAudit';
import MarketIntelligence from '../features/market/MarketIntelligence';
import FirstCustomerEngine from '../features/gtm/FirstCustomerEngine';
import Loans from '../Loans';
import CapitalPlatform from '../features/capital/CapitalPlatform';
import CapitalNetwork from '../CapitalNetwork';
import VentureExchange from '../features/exchange/VentureExchange';

export default function CommercialUnderwriting({
  commercialProfile,
  commercialForm,
  setCommercialForm,
  handleCommercialSubmit,
  isSubmittingCommercial,
  setActiveTab,
  session,
  balances,
  profile,
  fetchAllData,
}) {
  const [bizView, setBizView] = useState('underwriting');

  const BIZ_TABS = [
    { id: 'underwriting',       label: 'I Have a Company',       icon: Building,       color: 'blue'   },
    { id: 'formation',          label: 'Register New Company',   icon: Globe,          color: 'indigo' },
    { id: 'venture_exchange',   label: 'Stock Exchange',         icon: BarChart3,      color: 'emerald'},
    { id: 'first_customer',     label: 'First Customer Engine',  icon: Target,         color: 'violet' },
    { id: 'audit',              label: 'IFB Audit',              icon: ClipboardCheck, color: 'violet' },
    { id: 'market_intelligence',label: 'Market Intelligence',    icon: Brain,          color: 'teal'   },
    { id: 'loans',              label: 'Loans & Credit',         icon: HandCoins,      color: 'emerald'},
    { id: 'capital',            label: 'Capital Platform',       icon: TrendingUp,     color: 'blue'   },
    { id: 'share_earn',         label: 'Share & Earn',           icon: Gift,           color: 'amber'  },
  ];

  const TAB_ACTIVE = {
    underwriting:        'bg-blue-600 text-white shadow-md',
    formation:           'bg-indigo-600 text-white shadow-md',
    venture_exchange:    'bg-emerald-600 text-white shadow-md',
    first_customer:      'bg-violet-600 text-white shadow-md',
    audit:               'bg-violet-600 text-white shadow-md',
    market_intelligence: 'bg-teal-600 text-white shadow-md',
    loans:               'bg-emerald-600 text-white shadow-md',
    capital:             'bg-blue-600 text-white shadow-md',
    share_earn:          'bg-amber-500 text-white shadow-md',
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500">

      {/* Tab selector */}
      <div className="flex flex-wrap gap-2 mb-8 bg-slate-900 border border-slate-800 p-1.5 rounded-2xl w-fit">
        {BIZ_TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setBizView(tab.id)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                bizView === tab.id ? TAB_ACTIVE[tab.id] : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}>
              <Icon size={13}/> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Company Formation Hub */}
      {bizView === 'formation' && (
        <CompanyFormationHub session={session} balances={balances} profile={profile} />
      )}

      {/* Venture Exchange / Stock Market */}
      {bizView === 'venture_exchange' && (
        <VentureExchange session={session} profile={profile} />
      )}

      {/* First Customer Engine */}
      {bizView === 'first_customer' && (
        <FirstCustomerEngine session={session} balances={balances} profile={profile} />
      )}

      {/* IFB Audit */}
      {bizView === 'audit' && (
        <IFBAudit session={session} balances={balances} />
      )}

      {/* Market Intelligence */}
      {bizView === 'market_intelligence' && (
        <MarketIntelligence session={session} balances={balances} />
      )}

      {/* Loans & Credit */}
      {bizView === 'loans' && (
        <Loans session={session} balances={balances} fetchAllData={fetchAllData} profile={profile} />
      )}

      {/* Capital Platform */}
      {bizView === 'capital' && (
        <CapitalPlatform session={session} profile={profile} />
      )}

      {/* Share & Earn */}
      {bizView === 'share_earn' && (
        <CapitalNetwork session={session} profile={profile} balances={balances} fetchAllData={fetchAllData} />
      )}

      {/* Corporate Underwriting (existing) */}
      {bizView === 'underwriting' && (
      <div>
      <div className="bg-slate-900 border border-slate-800 p-10 rounded-[3rem] shadow-xl text-white mb-8 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-black tracking-tight mb-2 flex items-center gap-3">
            <Building className="text-blue-400"/> Corporate Underwriting
          </h2>
          <p className="text-sm text-slate-400 max-w-xl leading-relaxed">
            Submit your financial telemetry to Pascaline. If your metrics meet institutional safety thresholds, you will be cleared to raise capital directly within the IFB Dark Pool.
          </p>
        </div>
      </div>

      {commercialProfile?.pascaline_status === 'eligible_for_funding' ? (
        <div className="bg-white border border-emerald-200 p-10 rounded-[3rem] shadow-sm text-center">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={40}/>
          </div>
          <h3 className="text-2xl font-black text-slate-800 mb-2">Approved for Capital Deployment</h3>
          <p className="text-sm text-slate-500 mb-8">
            Pascaline has audited your telemetry and underwritten your Dual-Insurance policy. You are now live in the Private Equity Vault.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setActiveTab('INVEST')}
              className="px-8 py-4 bg-emerald-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg"
            >
              Manage Syndicate Parameters
            </button>
            <button
              onClick={() => setActiveTab('CAPITAL')}
              className="px-8 py-4 bg-blue-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg flex items-center gap-2 justify-center"
            >
              <TrendingUp size={16} /> Capital Platform
            </button>
          </div>
        </div>
      ) : commercialProfile?.pascaline_status === 'pending_review' ? (
        <div className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-sm text-center">
          <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Loader2 size={40} className="animate-spin"/>
          </div>
          <h3 className="text-2xl font-black text-slate-800 mb-2">Pascaline Audit in Progress</h3>
          <p className="text-sm text-slate-500">
            The AI engine is currently validating your revenue models and calculating your risk parameters.
          </p>
        </div>
      ) : (
        <form onSubmit={handleCommercialSubmit} className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Legal Corporate Name</label>
              <input 
                required 
                type="text" 
                value={commercialForm.company_name} 
                onChange={e => setCommercialForm({...commercialForm, company_name: e.target.value})} 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-blue-500" 
                placeholder="e.g. SpaceX" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Industry Sector</label>
              <input 
                required 
                type="text" 
                value={commercialForm.sector} 
                onChange={e => setCommercialForm({...commercialForm, sector: e.target.value})} 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-blue-500" 
                placeholder="e.g. Aerospace" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Registration Country</label>
              <input 
                required 
                type="text" 
                value={commercialForm.registration_country} 
                onChange={e => setCommercialForm({...commercialForm, registration_country: e.target.value})} 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-blue-500" 
                placeholder="e.g. United States" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Annual Revenue (USD)</label>
              <input 
                required 
                type="number" 
                value={commercialForm.annual_revenue} 
                onChange={e => setCommercialForm({...commercialForm, annual_revenue: e.target.value})} 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-blue-500" 
                placeholder="e.g. 5000000" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Monthly Burn Rate (USD)</label>
              <input 
                required 
                type="number" 
                value={commercialForm.monthly_burn_rate} 
                onChange={e => setCommercialForm({...commercialForm, monthly_burn_rate: e.target.value})} 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-blue-500" 
                placeholder="e.g. 150000" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Debt-to-Equity Ratio</label>
              <input 
                required 
                type="number" 
                step="0.01" 
                value={commercialForm.debt_to_equity_ratio} 
                onChange={e => setCommercialForm({...commercialForm, debt_to_equity_ratio: e.target.value})} 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-blue-500" 
                placeholder="e.g. 1.2" 
              />
            </div>
          </div>
          <button 
            type="submit" 
            disabled={isSubmittingCommercial} 
            className="w-full py-5 bg-blue-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl disabled:opacity-50"
          >
            {isSubmittingCommercial ? 'Submitting to Pascaline...' : 'Submit Financial Telemetry for Audit'}
          </button>
        </form>
      )}

      {/* Capital Platform teaser — visible to all non-eligible users */}
      {commercialProfile?.pascaline_status !== 'eligible_for_funding' && (
        <div className="mt-8 bg-slate-900 border border-slate-700 p-8 rounded-[3rem] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 to-indigo-900/20 pointer-events-none" />
          <div className="relative z-10 flex items-start gap-6">
            <div className="w-14 h-14 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center shrink-0">
              <TrendingUp size={28} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-black text-white">Capital Platform</h3>
                <span className="flex items-center gap-1 px-3 py-1 bg-slate-700 text-slate-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                  <Lock size={10} /> Locked
                </span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                Raise structured capital — grants, debt, equity, or hybrid — with AI-powered analysis, milestone-based tranche releases, and blockchain-signed agreements. Unlock once Pascaline approves your telemetry.
              </p>
              <div className="grid grid-cols-3 gap-4">
                {['AI Deal Structuring', 'Milestone Governance', 'Blockchain Signing'].map(f => (
                  <div key={f} className="bg-slate-800/60 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{f}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
      )}
    </div>
  );
}