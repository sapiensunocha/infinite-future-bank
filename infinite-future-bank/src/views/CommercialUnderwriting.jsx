import React from 'react';
import { Building, ShieldCheck, Loader2 } from 'lucide-react';

export default function CommercialUnderwriting({ 
  commercialProfile, 
  commercialForm, 
  setCommercialForm, 
  handleCommercialSubmit, 
  isSubmittingCommercial, 
  setActiveTab 
}) {
  return (
    <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500">
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
          <button 
            onClick={() => setActiveTab('INVEST')} 
            className="px-8 py-4 bg-emerald-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg"
          >
            Manage Syndicate Parameters
          </button>
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
    </div>
  );
}