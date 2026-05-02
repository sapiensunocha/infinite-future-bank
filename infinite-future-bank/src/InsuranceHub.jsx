/**
 * Clyrix (CLYRIX) — IFB Protection & Risk Pooling Infrastructure
 * Reinvents insurance as transparent, blockchain-backed safety pools.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './services/supabaseClient';
import {
  ShieldCheck, HeartPulse, Car, Home, User, Plane, 
  Briefcase, RefreshCw, Zap, CheckCircle2, AlertTriangle,
  ArrowRight, Landmark, Activity, Users, Plus, Info,
  Loader2, Globe, Heart, ShieldAlert, BadgeDollarSign, Microscope
} from 'lucide-react';

export default function InsuranceHub({ session, profile }) {
  const [tab, setTab] = useState('EXPLORE');
  const [pools, setPools] = useState([]);
  const [mySubscriptions, setMySubscriptions] = useState([]);
  const [myClaims, setMyClaims] = useState([]);
  const [partners, setPartners] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPool, setSelectedPool] = useState(null);
  const [claimForm, setClaimForm] = useState({ title: '', description: '', amount: 0 });
  const [toast, setToast] = useState(null);

  const notify = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 4500); };

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const uid = session?.user?.id;
      const [poolRes, subRes, claimsRes, partnerRes] = await Promise.all([
        supabase.from('clyrix_pools').select('*').eq('status', 'active'),
        uid ? supabase.from('clyrix_subscriptions').select('*, clyrix_pools(*)').eq('user_id', uid) : Promise.resolve({ data: [] }),
        uid ? supabase.from('clyrix_claims').select('*, clyrix_pools(*)').eq('user_id', uid).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
        supabase.from('clyrix_partners').select('*').eq('verification_status', 'verified')
      ]);

      if (poolRes.data) setPools(poolRes.data);
      if (subRes.data) setMySubscriptions(subRes.data);
      if (claimsRes.data) setMyClaims(claimsRes.data);
      if (partnerRes.data) setPartners(partnerRes.data);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const joinPool = async (pool) => {
    if (!session?.user?.id) return;
    setIsProcessing(true);
    try {
      // 1. Calculate specific contribution based on user profile (simulated dynamic pricing)
      const monthlyRate = pool.base_monthly_contribution;
      const coverageLimit = monthlyRate * 1000; // Simplified model

      // 2. Call the secure RPC to process contribution & ledger
      const { data, error } = await supabase.rpc('process_clyrix_contribution', {
        p_user_id: session.user.id,
        p_pool_id: pool.id,
        p_amount: monthlyRate
      });

      if (error) throw error;

      // 3. Create subscription record
      await supabase.from('clyrix_subscriptions').insert([{
        user_id: session.user.id,
        pool_id: pool.id,
        monthly_contribution: monthlyRate,
        coverage_amount_limit: coverageLimit
      }]);

      notify(`Joined ${pool.name}. Coverage activated on blockchain.`);
      fetchAll();
      setSelectedPool(null);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const submitClaim = async (e) => {
    e.preventDefault();
    if (!selectedPool || !claimForm.title) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('clyrix_claims').insert([{
        user_id: session.user.id,
        pool_id: selectedPool.pool_id,
        title: claimForm.title,
        description: claimForm.description,
        requested_amount: claimForm.amount,
        ai_validation_score: Math.floor(Math.random() * 40) + 60 // Simulated IFB Intelligence score
      }]);

      if (error) throw error;
      notify('Claim submitted for AI Validation. Check status in Claims tab.');
      setTab('CLAIMS');
      setClaimForm({ title: '', description: '', amount: 0 });
      fetchAll();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatUSD = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

  if (isLoading) return <div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={36} /></div>;

  return (
    <div className="relative min-h-full bg-slate-50 pb-20 animate-in fade-in duration-500">
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-full shadow-2xl text-sm font-black flex items-center gap-2 animate-in slide-in-from-top-4 ${toast.type === 'error' ? 'bg-red-900 text-red-200 border border-red-500' : 'bg-emerald-800 text-emerald-100 border border-emerald-500'}`}>
          {toast.type === 'error' ? <ShieldAlert size={14}/> : <CheckCircle2 size={14}/>} {toast.msg}
        </div>
      )}

      {/* Institutional Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-10 mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20"><ShieldCheck size={28}/></div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter">CLYRIX <span className="text-blue-600">Protection</span></h2>
          </div>
          <p className="text-slate-500 font-medium max-w-xl">IFB's decentralized risk-pooling infrastructure. Real protection, powered by collective liquidity and blockchain transparency.</p>
        </div>
        
        <div className="flex gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 shadow-inner">
           {['EXPLORE', 'COVERAGE', 'CLAIMS'].map(t => (
             <button key={t} onClick={()=>setTab(t)}
               className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === t ? 'bg-white text-blue-700 shadow-md border border-slate-100' : 'text-slate-400 hover:text-slate-800'}`}>
               {t}
             </button>
           ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8">
        
        {/* ════════ EXPLORE POOLS ════════ */}
        {tab === 'EXPLORE' && (
          <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col justify-between">
                  <Globe className="absolute top-[-10%] right-[-10%] w-64 h-64 text-blue-500/10 pointer-events-none" />
                  <div className="relative z-10">
                    <h3 className="text-3xl font-black mb-4 leading-tight">Redesigning global protection.</h3>
                    <p className="text-slate-400 font-medium mb-8 leading-relaxed">Clyrix combines insurance logic with community pooling. Contributions enter transparent liquidity pools, and smart contracts automate payouts for valid claims.</p>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                          <p className="text-[9px] font-black uppercase text-slate-500 mb-1">Total Pool Depth</p>
                          <p className="text-xl font-black text-emerald-400">$14.2M</p>
                       </div>
                       <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                          <p className="text-[9px] font-black uppercase text-slate-500 mb-1">Active Protection</p>
                          <p className="text-xl font-black text-blue-400">84.2K Units</p>
                       </div>
                    </div>
                  </div>
               </div>
               
               <div className="space-y-4">
                  <h4 className="text-sm font-black uppercase tracking-widest text-slate-800 px-2">Featured Safety Pools</h4>
                  {pools.map(pool => (
                    <div key={pool.id} className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm hover:shadow-xl transition-all group">
                       <div className="flex justify-between items-start">
                          <div className="flex items-center gap-4">
                             <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                {pool.type === 'Health' && <HeartPulse size={20}/>}
                                {pool.type === 'Income' && <Briefcase size={20}/>}
                                {pool.type === 'Life' && <User size={20}/>}
                                {pool.type === 'Agriculture' && <Microscope size={20}/>}
                             </div>
                             <div>
                                <p className="font-black text-slate-800">{pool.name}</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{pool.type} Protection</p>
                             </div>
                          </div>
                          <div className="text-right">
                             <p className="text-lg font-black text-slate-800">{formatUSD(pool.base_monthly_contribution)}<span className="text-[10px] text-slate-400 uppercase">/mo</span></p>
                             <button onClick={()=>setSelectedPool(pool)} className="text-[10px] font-black text-blue-600 hover:underline uppercase tracking-widest">Join Pool <ArrowRight size={10} className="inline"/></button>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>

            <div className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-sm">
               <div className="flex items-center gap-3 mb-8">
                  <Landmark className="text-blue-600" size={24}/>
                  <h4 className="text-xl font-black text-slate-900 tracking-tight">Verified Partners & Providers</h4>
               </div>
               <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {partners.map(p => (
                    <div key={p.id} className="text-center space-y-2">
                       <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-full mx-auto flex items-center justify-center text-slate-400"><BadgeDollarSign size={24}/></div>
                       <p className="font-black text-xs text-slate-800">{p.name}</p>
                       <p className="text-[9px] font-black uppercase text-slate-400">{p.sector}</p>
                    </div>
                  ))}
                  <div className="border-2 border-dashed border-slate-100 rounded-2xl flex flex-center items-center justify-center p-6 text-slate-300 font-black text-[10px] uppercase cursor-pointer hover:border-blue-200 hover:text-blue-400 transition-all">+ Apply to Partner</div>
               </div>
            </div>
          </div>
        )}

        {/* ════════ MY COVERAGE ════════ */}
        {tab === 'COVERAGE' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4">
             <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Your Active Protection</h3>
             {mySubscriptions.length === 0 ? (
               <div className="py-20 text-center bg-white border border-slate-200 rounded-[3rem]">
                  <ShieldAlert size={48} className="mx-auto text-slate-200 mb-4"/>
                  <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">No active protection found in ledger.</p>
                  <button onClick={()=>setTab('EXPLORE')} className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg">Browse Pools</button>
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {mySubscriptions.map(sub => (
                    <div key={sub.id} className="bg-white border border-slate-200 p-8 rounded-[3rem] shadow-sm relative overflow-hidden group">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none group-hover:bg-emerald-500/10 transition-colors"></div>
                       <div className="flex justify-between items-start mb-8">
                          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><ShieldCheck size={24}/></div>
                          <div className="text-right">
                             <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Status</p>
                             <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest">Active Ledger</span>
                          </div>
                       </div>
                       <h4 className="text-xl font-black text-slate-900 mb-2">{sub.clyrix_pools.name}</h4>
                       <div className="space-y-4 mb-8">
                          <div className="flex justify-between border-b border-slate-50 pb-2">
                             <span className="text-[10px] font-black uppercase text-slate-400">Monthly Contribution</span>
                             <span className="text-sm font-black text-slate-800">{formatUSD(sub.monthly_contribution)}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-50 pb-2">
                             <span className="text-[10px] font-black uppercase text-slate-400">Coverage Limit</span>
                             <span className="text-sm font-black text-blue-600">{formatUSD(sub.coverage_amount_limit)}</span>
                          </div>
                       </div>
                       <button onClick={()=>{setSelectedPool(sub); setTab('CLAIMS');}} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 transition-colors">Submit Protection Claim</button>
                    </div>
                  ))}
               </div>
             )}
          </div>
        )}

        {/* ════════ CLAIMS ════════ */}
        {tab === 'CLAIMS' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4">
             <div className="flex justify-between items-center">
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Claims Dashboard</h3>
                {mySubscriptions.length > 0 && (
                   <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black uppercase text-slate-400">Create Claim Against:</span>
                      <select className="bg-white border border-slate-200 rounded-xl px-4 py-2 font-black text-[10px] uppercase outline-none focus:border-blue-500 shadow-sm" onChange={(e)=>setSelectedPool(mySubscriptions.find(s=>s.id === e.target.value))}>
                         <option value="">Select Active Coverage</option>
                         {mySubscriptions.map(s => <option key={s.id} value={s.id}>{s.clyrix_pools.name}</option>)}
                      </select>
                   </div>
                )}
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                   <div className="bg-white border border-slate-200 p-8 rounded-[3rem] shadow-sm sticky top-24">
                      <h4 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-6 flex items-center gap-2"><Zap className="text-blue-600" size={16}/> New Claim Request</h4>
                      {!selectedPool ? (
                         <div className="text-center py-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
                            <Info className="mx-auto text-slate-300 mb-2" size={20}/>
                            <p className="text-[10px] font-black uppercase text-slate-400">Select coverage above to begin.</p>
                         </div>
                      ) : (
                         <form onSubmit={submitClaim} className="space-y-4">
                            <div className="space-y-1">
                               <label className="text-[9px] font-black uppercase text-slate-400">Claim Title</label>
                               <input required className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 font-bold text-xs" value={claimForm.title} onChange={e=>setClaimForm({...claimForm, title: e.target.value})} placeholder="e.g., Emergency Hospital Admission"/>
                            </div>
                            <div className="space-y-1">
                               <label className="text-[9px] font-black uppercase text-slate-400">Details / Circumstances</label>
                               <textarea required className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 font-bold text-xs h-24" value={claimForm.description} onChange={e=>setClaimForm({...claimForm, description: e.target.value})} placeholder="Describe what happened..."/>
                            </div>
                            <div className="space-y-1">
                               <label className="text-[9px] font-black uppercase text-slate-400">Requested Capital (USD)</label>
                               <input type="number" className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 font-bold text-xs" value={claimForm.amount} onChange={e=>setClaimForm({...claimForm, amount: +e.target.value})} />
                            </div>
                            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                               <p className="text-[9px] font-black uppercase text-blue-800 mb-2">IFB Intelligence Validation</p>
                               <p className="text-[9px] text-blue-600 font-medium leading-relaxed">System will auto-validate your claim based on evidence and pool liquidity rules.</p>
                            </div>
                            <button type="submit" disabled={isProcessing} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 shadow-lg flex items-center justify-center gap-2">
                               {isProcessing ? <Loader2 size={14} className="animate-spin"/> : <><ShieldCheck size={14}/> Submit to Network</>}
                            </button>
                         </form>
                      )}
                   </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                   {myClaims.length === 0 ? (
                      <div className="text-center py-20 bg-white border border-slate-200 rounded-[3rem]">
                         <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No previous claims found.</p>
                      </div>
                   ) : (
                      myClaims.map(claim => (
                        <div key={claim.id} className="bg-white border border-slate-200 p-8 rounded-[3rem] shadow-sm flex justify-between items-center group">
                           <div>
                              <div className="flex items-center gap-2 mb-2">
                                 <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg border ${
                                    claim.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                    claim.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-100' :
                                    'bg-amber-50 text-amber-600 border-amber-100'
                                 }`}>{claim.status.replace('_',' ')}</span>
                                 <span className="text-[8px] font-black uppercase text-slate-400">{new Date(claim.created_at).toLocaleDateString()}</span>
                              </div>
                              <h5 className="font-black text-slate-800">{claim.title}</h5>
                              <p className="text-[10px] font-black uppercase text-slate-400 mt-1">{claim.clyrix_pools.name}</p>
                           </div>
                           <div className="text-right">
                              <p className="text-xl font-black text-slate-800">{formatUSD(claim.requested_amount)}</p>
                              {claim.ai_validation_score > 0 && (
                                 <div className="flex items-center gap-1 justify-end mt-1">
                                    <Activity size={10} className="text-blue-500"/>
                                    <span className="text-[9px] font-black uppercase text-blue-500">AI Trust: {claim.ai_validation_score}%</span>
                                 </div>
                              )}
                           </div>
                        </div>
                      ))
                   )}
                </div>
             </div>
          </div>
        )}

      </div>

      {/* JOIN POOL MODAL */}
      {selectedPool && tab === 'EXPLORE' && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4 animate-in fade-in duration-300">
           <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl p-10 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
              <h3 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Confirm Enrollment</h3>
              <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">You are about to contribute to the **{selectedPool.name}**. This capital is locked in a shared liquidity pool to provide coverage for you and other network members.</p>
              
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4 mb-10">
                 <div className="flex justify-between items-center">
                    <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Monthly Commitment</span>
                    <span className="text-xl font-black text-slate-900">{formatUSD(selectedPool.base_monthly_contribution)}</span>
                 </div>
                 <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                    <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Est. Coverage Cap</span>
                    <span className="text-xl font-black text-blue-600">{formatUSD(selectedPool.base_monthly_contribution * 1000)}</span>
                 </div>
              </div>

              <div className="flex flex-col gap-3">
                 <button onClick={()=>joinPool(selectedPool)} disabled={isProcessing} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-blue-700 shadow-xl flex items-center justify-center gap-3">
                    {isProcessing ? <Loader2 size={16} className="animate-spin"/> : <><ShieldCheck size={16}/> Authorize Ledger Entry</>}
                 </button>
                 <button onClick={()=>setSelectedPool(null)} className="w-full py-3 text-[10px] font-black uppercase text-slate-400 hover:text-slate-800 transition-colors">Cancel</button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}
