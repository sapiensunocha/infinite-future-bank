import { useState, useEffect } from 'react';
import { ShieldCheck, HeartPulse, Car, Home, User, Plane, Briefcase, RefreshCw, Zap, CheckCircle2 } from 'lucide-react';
import { supabase } from './services/supabaseClient';

export default function InsuranceHub({ profile }) {
  const [policy, setPolicy] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [verificationStep, setVerificationStep] = useState('');

  const fetchInsurance = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('ifb_insurance')
      .select('*')
      .eq('user_id', profile?.id)
      .maybeSingle();
    
    setPolicy(data);
    setIsLoading(false);
  };

  useEffect(() => {
    if (profile?.id) fetchInsurance();
  }, [profile?.id]);

  const handleApply = async () => {
    setIsApplying(true);
    setVerificationStep('Initiating smart contract...');
    
    try {
      // 1. Submit Application
      await supabase.rpc('apply_for_ifb_insurance', { p_user_id: profile.id });
      setVerificationStep('Broadcasting to Help Blocks...');
      
      // 2. Simulate Blockchain Consensus Delay (Mathematical Verification)
      setTimeout(async () => {
        setVerificationStep('Verifying network liquidity...');
        
        setTimeout(async () => {
          setVerificationStep('Executing activation...');
          // 3. Trigger Activation
          await supabase.rpc('activate_ifb_insurance', { p_user_id: profile.id });
          await fetchInsurance();
          setIsApplying(false);
        }, 2000);
      }, 2000);

    } catch (err) {
      console.error("Application failed", err);
      setIsApplying(false);
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);

  if (isLoading) {
    return <div className="flex justify-center py-20"><RefreshCw className="animate-spin text-blue-500" size={32}/></div>;
  }

  // STATE 1: UNREGISTERED (Show the value proposition)
  if (!policy || policy.status === 'UNREGISTERED') {
    return (
      <div className="animate-in fade-in duration-500 space-y-8">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border border-slate-700 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between gap-10 items-center">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <ShieldCheck className="text-emerald-400" size={32} />
                <h2 className="text-3xl font-black tracking-tight">Sovereign Protection</h2>
              </div>
              <p className="text-slate-300 text-lg leading-relaxed mb-6 font-medium">
                The average adult pays <span className="text-white font-bold">$500–$1,000+ per month</span> for basic health, auto, and life insurance. Through the IFB algorithmic reward pool, we fully subsidize comprehensive coverage for active network citizens.
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Traditional Cost</p>
                  <p className="text-xl font-black text-red-400 line-through decoration-red-500/50">~$8,500 / yr</p>
                </div>
                <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/30">
                  <p className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold mb-1">Your IFB Cost</p>
                  <p className="text-xl font-black text-emerald-400">$0.00 / yr</p>
                </div>
              </div>

              <button 
                onClick={handleApply} 
                disabled={isApplying}
                className="w-full md:w-auto px-8 py-5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black text-sm uppercase tracking-widest rounded-2xl transition-all shadow-[0_0_40px_rgba(16,185,129,0.3)] flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isApplying ? (
                  <><RefreshCw size={20} className="animate-spin" /> {verificationStep}</>
                ) : (
                  <><Zap size={20} /> Request Network Activation</>
                )}
              </button>
            </div>

            <div className="flex-1 w-full grid grid-cols-2 gap-3">
              {[
                { icon: <HeartPulse size={18}/>, label: 'Health' }, { icon: <Car size={18}/>, label: 'Auto' },
                { icon: <Home size={18}/>, label: 'Property' }, { icon: <User size={18}/>, label: 'Life' },
                { icon: <Plane size={18}/>, label: 'Travel' }, { icon: <Briefcase size={18}/>, label: 'Income' }
              ].map((item, i) => (
                <div key={i} className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2">
                  <div className="text-emerald-400">{item.icon}</div>
                  <span className="text-xs font-bold text-slate-300">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STATE 2: ACTIVE POLICY
  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      {/* Policy Header */}
      <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-emerald-950 tracking-tight">Active Coverage</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">
                <CheckCircle2 size={12}/> Verified on Ledger
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                ID: {policy.id.split('-')[0].toUpperCase()}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm w-full md:w-auto">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Premium Subsidized</p>
          <p className="text-xl font-black text-emerald-600">100% Fully Funded</p>
        </div>
      </div>

      {/* Coverage Grid */}
      <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 px-4 mt-10 mb-4">Underwritten Assets</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm hover:border-blue-300 transition-colors">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><HeartPulse size={24}/></div>
            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg uppercase tracking-widest">Active</span>
          </div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Comprehensive Health</p>
          <p className="text-2xl font-black text-slate-800">{formatCurrency(policy.health_coverage_value)}</p>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm hover:border-indigo-300 transition-colors">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Car size={24}/></div>
            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg uppercase tracking-widest">Active</span>
          </div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Auto & Transit</p>
          <p className="text-2xl font-black text-slate-800">{formatCurrency(policy.auto_coverage_value)}</p>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm hover:border-amber-300 transition-colors">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Home size={24}/></div>
            <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg uppercase tracking-widest">Active</span>
          </div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Property & Contents</p>
          <p className="text-2xl font-black text-slate-800">{formatCurrency(policy.home_coverage_value)}</p>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm hover:border-purple-300 transition-colors">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><User size={24}/></div>
            <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-2 py-1 rounded-lg uppercase tracking-widest">Active</span>
          </div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Term Life Coverage</p>
          <p className="text-2xl font-black text-slate-800">{formatCurrency(policy.life_coverage_value)}</p>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm hover:border-teal-300 transition-colors">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 bg-teal-50 text-teal-600 rounded-xl"><Briefcase size={24}/></div>
            <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-2 py-1 rounded-lg uppercase tracking-widest">Active</span>
          </div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Income Protection</p>
          <p className="text-2xl font-black text-slate-800">{formatCurrency(5000)} <span className="text-sm text-slate-400 font-medium">/mo</span></p>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm hover:border-sky-300 transition-colors">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 bg-sky-50 text-sky-600 rounded-xl"><Plane size={24}/></div>
            <span className="text-[10px] font-black text-sky-600 bg-sky-50 px-2 py-1 rounded-lg uppercase tracking-widest">Active</span>
          </div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Global Travel</p>
          <p className="text-2xl font-black text-slate-800">{formatCurrency(50000)}</p>
        </div>

      </div>
    </div>
  );
}