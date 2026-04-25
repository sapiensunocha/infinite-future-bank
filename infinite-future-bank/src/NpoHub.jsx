import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import { 
  HeartHandshake, ShieldCheck, Link as LinkIcon, Loader2, Copy, 
  CheckCircle2, Search, Heart, ArrowRight, Globe2, Activity, 
  BarChart3, BrainCircuit, DollarSign, Send, XCircle, ChevronRight, 
  Building2, Users, FileText, Target, Flame, AlertTriangle, Network
} from 'lucide-react';

// --- CRASH-PROOF JSON PARSER ---
const safeParseAmounts = (amountsString) => {
  try {
    return JSON.parse(amountsString);
  } catch (e) {
    console.warn("Invalid JSON in preset_amounts, falling back to safe defaults.");
    return [10, 50, 100]; 
  }
};

export default function NpoHub({ session }) {
  const [viewTab, setViewTab] = useState('EXPLORE'); // 'EXPLORE', 'MANAGE', 'COMMAND'
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Data States
  const [npoData, setNpoData] = useState(null); // Personal NPO
  const [verifiedNpos, setVerifiedNpos] = useState([]); // Public Market
  const [allNpos, setAllNpos] = useState([]); // Admin Command View
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Donation Modal States
  const [donateModal, setDonateModal] = useState(null);
  const [donateAmount, setDonateAmount] = useState('');
  const [isDonating, setIsDonating] = useState(false);

  // Application & AI Telemetry States
  const [applyForm, setApplyForm] = useState({ 
    name: '', taxId: '', mission: '', sector: '', country: '', estimated_volume: '' 
  });
  const [isApplying, setIsApplying] = useState(false);
  const [liveAiStatus, setLiveAiStatus] = useState(''); // Stores real-time backend updates
  const [configForm, setConfigForm] = useState({ message: '', amounts: '', notify: true });

  // Admin AI Copilot States
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    checkAccessAndFetchData();
  }, [viewTab]);

  // --- LIVE AI TELEMETRY LISTENER ---
  useEffect(() => {
    if (!isApplying) return;
    
    // Listen strictly to this user's NPO profile changes from the Edge Function
    const channel = supabase.channel('real-telemetry')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'npo_profiles', 
        filter: `id=eq.${session.user.id}` 
      }, (payload) => {
        if (payload.new.live_ai_status) {
          setLiveAiStatus(payload.new.live_ai_status);
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [isApplying, session.user.id]);

  const checkAccessAndFetchData = async () => {
    setIsLoading(true);
    
    // 1. Check if user is an Admin
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
    const userIsAdmin = profile && ['support_l1', 'advisor_l2', 'admin_l3'].includes(profile.role);
    setIsAdmin(userIsAdmin);

    // 2. Fetch personal NPO data
    const { data: myNpo } = await supabase.from('npo_profiles').select('*').eq('id', session.user.id).maybeSingle();
    if (myNpo) {
      setNpoData(myNpo);
      setConfigForm({
        message: myNpo.donation_message || '',
        // FIX: Using safeParseAmounts to prevent crashing on bad DB data
        amounts: myNpo.preset_amounts ? safeParseAmounts(myNpo.preset_amounts).join(', ') : '10, 50, 100',
        notify: myNpo.notify_on_donation ?? true
      });
    }

    // 3. Fetch all verified NPOs for the Explore tab (Exclude Support Clusters/Rejected)
    const { data: publicNpos } = await supabase.from('npo_profiles').select('*').in('program_tier', ['Cluster', 'Elite']);
    if (publicNpos) setVerifiedNpos(publicNpos);

    // 4. Fetch ALL NPOs for Admin Command Tab
    if (userIsAdmin) {
      const { data: fullList } = await supabase.from('npo_profiles').select('*').order('created_at', { ascending: false });
      if (fullList) setAllNpos(fullList);
    }
    
    setIsLoading(false);
  };

  // --- ACTIONS: EXPLORE & DONATE ---
  const handleDonate = async (e) => {
    e.preventDefault();
    const amount = parseFloat(donateAmount);
    if (!amount || amount <= 0) return alert("Please enter a valid donation amount.");
    
    setIsDonating(true);
    try {
      const { error } = await supabase.rpc('process_npo_donation', {
        p_npo_id: donateModal.id,
        p_donor_id: session.user.id,
        p_amount: amount
      });
      if (error) throw error;

      if (donateModal.notify_on_donation) {
        await supabase.from('notifications').insert([{
          user_id: donateModal.id,
          type: 'system',
          message: `You received a $${amount.toFixed(2)} donation via the I3P Network!`,
          status: 'completed'
        }]);
      }

      alert(`Successfully deployed $${amount.toFixed(2)} to ${donateModal.npo_name}!`);
      setDonateModal(null);
      setDonateAmount('');
      checkAccessAndFetchData();
    } catch (err) {
      alert(err.message || "Deployment failed. Check your liquid balance.");
    } finally {
      setIsDonating(false);
    }
  };

  // --- ACTIONS: MANAGE NPO & AI INTAKE ---
  const handleApply = async (e) => {
    e.preventDefault();
    setIsApplying(true);
    setLiveAiStatus('Connecting to IFB Sovereign Ledger...');

    try {
      // 1. Insert into Database as Pending with telemetry initiated
      const { error: dbError } = await supabase.from('npo_profiles').insert([{
        id: session.user.id,
        npo_name: applyForm.name,
        tax_id: applyForm.taxId,
        mission_statement: applyForm.mission,
        sector: applyForm.sector,
        country: applyForm.country,
        estimated_volume: applyForm.estimated_volume,
        program_tier: 'Pending_AI_Review',
        verification_status: 'pending_review',
        live_ai_status: 'Awaiting Pipeline Ignition...'
      }]);
      
      if (dbError) throw dbError;

      // 2. Trigger the AI Compliance Edge Function
      const { error: aiError } = await supabase.functions.invoke('ifb-npo-compliance', {
        body: { npoId: session.user.id }
      });

      if (aiError) throw aiError;

      checkAccessAndFetchData();
    } catch (err) {
      alert("Application processing failed: " + (err.message || "Unknown error"));
      console.error(err);
    } finally {
      // CRITICAL: Ensure the UI resets even if the network fails
      setIsApplying(false);
      setLiveAiStatus('');
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const amountArray = configForm.amounts.split(',').map(num => parseFloat(num.trim())).filter(num => !isNaN(num));
      await supabase.from('npo_profiles').update({
        donation_message: configForm.message,
        preset_amounts: JSON.stringify(amountArray),
        notify_on_donation: configForm.notify
      }).eq('id', session.user.id);
      
      alert("Gateway configured successfully!");
      checkAccessAndFetchData();
    } catch (err) {
      alert("Invalid amounts format. Use numbers separated by commas.");
    } finally {
      setIsSaving(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/donate?npo=${session.user.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // --- ADMIN ACTIONS (COMMAND VIEW) ---
  const handleUpdateTier = async (id, newTier) => {
    try {
      const status = newTier === 'Banned' ? 'rejected' : 'verified';
      await supabase.from('npo_profiles').update({ program_tier: newTier, verification_status: status }).eq('id', id);
      checkAccessAndFetchData();
    } catch (err) { console.error(err); }
  };

  const handleAskCopilot = async (e) => {
    e.preventDefault();
    if (!aiQuery.trim() || isAiLoading) return;
    setIsAiLoading(true);
    setAiResponse('');
    try {
      const networkData = allNpos.map(n => ({
        Name: n.npo_name, Tier: n.program_tier, Raised: n.total_raised, Float: n.current_float_usd
      }));
      const payloadMessages = [
        { role: 'system', content: `You are the IFB I3P Program AI Director. Analyze this NPO data: ${JSON.stringify(networkData)}. Provide strategic insights on capital deployment and revenue scaling.` },
        { role: 'user', content: aiQuery.trim() }
      ];
      const { data, error } = await supabase.functions.invoke('pascaline-grok-agent', {
        body: { messages: payloadMessages, userId: session.user.id }
      });
      if (error) throw error;
      setAiResponse(data.content);
    } catch (err) {
      setAiResponse("I3P Copilot offline. Awaiting secure network bridge.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // View Filtering & Formatting
  const filteredNpos = verifiedNpos.filter(npo => 
    npo.npo_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    npo.mission_statement.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);

  if (isLoading) return <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-emerald-500 mb-4" size={40} /><p className="font-bold text-slate-500">Syncing I3P Global Network...</p></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* TABS CONTROLLER */}
      <div className="flex gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm w-fit mx-auto mb-8">
        <button onClick={() => setViewTab('EXPLORE')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewTab === 'EXPLORE' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
          Explore Causes
        </button>
        <button onClick={() => setViewTab('MANAGE')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewTab === 'MANAGE' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
          My Organization
        </button>
        {isAdmin && (
          <button onClick={() => setViewTab('COMMAND')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewTab === 'COMMAND' ? 'bg-emerald-600 text-white shadow-md' : 'text-emerald-600 hover:bg-emerald-50'}`}>
            <Globe2 size={14}/> I3P Command
          </button>
        )}
      </div>

      {/* ================================================================= */}
      {/* VIEW 1: EXPLORE & DONATE (PUBLIC MARKET)                          */}
      {/* ================================================================= */}
      {viewTab === 'EXPLORE' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 p-10 rounded-[3rem] text-center shadow-xl relative overflow-hidden text-white">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>
            <h2 className="text-3xl font-black mb-2 relative z-10 text-emerald-400">Fund the Future</h2>
            <p className="text-sm text-slate-300 font-medium max-w-xl mx-auto relative z-10">Zero external fees. Deploy capital instantly to verified IFB Impact Partners via the Sovereign Ledger.</p>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-4 text-slate-400" size={20}/>
            <input 
              type="text" placeholder="Search verified causes or organizations..." 
              value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} 
              className="w-full bg-white border border-slate-200 p-4 pl-12 rounded-2xl font-bold outline-none focus:border-emerald-500 transition-all shadow-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNpos.length === 0 && <p className="text-slate-500 text-center col-span-full py-10 font-bold">No causes found.</p>}
            {filteredNpos.map(npo => (
              <div key={npo.id} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 hover:shadow-lg hover:border-emerald-200 transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-black text-slate-800 text-lg leading-tight">{npo.npo_name}</h3>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded mt-1 inline-block ${npo.program_tier === 'Elite' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                        {npo.program_tier} Partner
                      </span>
                    </div>
                    <ShieldCheck className={npo.program_tier === 'Elite' ? 'text-emerald-500 shrink-0' : 'text-blue-500 shrink-0'} size={24}/>
                  </div>
                  <p className="text-xs text-slate-600 font-medium mb-6 line-clamp-3">"{npo.mission_statement}"</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Total Raised</p>
                  <p className="text-2xl font-black text-slate-800 mb-4">{formatCurrency(npo.total_raised)}</p>
                  <button 
                    onClick={() => { setDonateModal(npo); setDonateAmount(''); }} 
                    className="w-full bg-slate-900 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-600 transition-colors"
                  >
                    Deploy Capital <ArrowRight size={14}/>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* DONATION OVERLAY */}
          {donateModal && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden relative">
                <div className={`p-6 border-b border-slate-100 text-center ${donateModal.program_tier === 'Elite' ? 'bg-emerald-50' : 'bg-blue-50'}`}>
                  <h3 className={`font-black text-xl ${donateModal.program_tier === 'Elite' ? 'text-emerald-950' : 'text-blue-950'}`}>{donateModal.npo_name}</h3>
                  <p className={`text-xs font-bold mt-1 ${donateModal.program_tier === 'Elite' ? 'text-emerald-700' : 'text-blue-700'}`}>Verified {donateModal.program_tier} Partner</p>
                </div>
                <form onSubmit={handleDonate} className="p-8 space-y-6">
                  {donateModal.donation_message && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                      <p className="text-sm font-medium text-slate-700 italic">"{donateModal.donation_message}"</p>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Select Amount</label>
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {donateModal.preset_amounts && safeParseAmounts(donateModal.preset_amounts).map(amt => (
                        <button 
                          key={amt} type="button" 
                          onClick={() => setDonateAmount(amt.toString())}
                          className={`py-3 rounded-xl font-black text-sm transition-all border-2 ${parseFloat(donateAmount) === amt ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                        >
                          ${amt}
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">$</span>
                      <input 
                        required type="number" step="0.01" value={donateAmount} onChange={e => setDonateAmount(e.target.value)} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 pl-8 font-black text-xl outline-none focus:border-slate-400 text-slate-800" 
                        placeholder="Custom Amount" 
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setDonateModal(null)} className="w-1/3 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200">Cancel</button>
                    <button type="submit" disabled={isDonating} className="w-2/3 bg-slate-900 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-colors shadow-lg">
                      {isDonating ? <Loader2 className="animate-spin mx-auto" size={16}/> : `Deploy $${donateAmount || '0'}`}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* VIEW 2: MANAGE NPO DASHBOARD                                      */}
      {/* ================================================================= */}
      {viewTab === 'MANAGE' && (
        <div className="animate-in fade-in">
          
          {/* Sub-view: Not applied yet */}
          {!npoData && (
            <div className="max-w-3xl mx-auto">
              <div className="bg-slate-900 border border-slate-800 p-10 rounded-[3rem] shadow-xl text-white mb-8 text-center relative overflow-hidden">
                <Globe2 size={100} className="absolute -left-10 -bottom-10 opacity-10 text-blue-500" />
                <h2 className="text-3xl font-black tracking-tight mb-2 relative z-10">Join the I3P Network</h2>
                <p className="text-sm text-slate-400 max-w-xl mx-auto relative z-10">Apply to become an IFB Impact Partner to access global liquidity pools, customized donation routing, and the Sovereign Ledger infrastructure.</p>
              </div>
              <form onSubmit={handleApply} className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-sm space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input required type="text" placeholder="Registered NPO Name" value={applyForm.name} onChange={e=>setApplyForm({...applyForm, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-blue-500" />
                  <input required type="text" placeholder="Gov Tax / Reg ID" value={applyForm.taxId} onChange={e=>setApplyForm({...applyForm, taxId: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-blue-500" />
                  <input required type="text" placeholder="Sector (e.g., Education, Health)" value={applyForm.sector} onChange={e=>setApplyForm({...applyForm, sector: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-blue-500" />
                  <input required type="text" placeholder="Primary Operating Country" value={applyForm.country} onChange={e=>setApplyForm({...applyForm, country: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-blue-500" />
                </div>
                <input required type="text" placeholder="Estimated Annual Capital Need (e.g., $50,000)" value={applyForm.estimated_volume} onChange={e=>setApplyForm({...applyForm, estimated_volume: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-blue-500" />
                <textarea required placeholder="What is your organization's mission?" value={applyForm.mission} onChange={e=>setApplyForm({...applyForm, mission: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-blue-500 h-32" />
                
                {/* 🔴 LIVE TELEMETRY UI REPLACES BUTTON WHEN PROCESSING */}
                {isApplying ? (
                  <div className="w-full bg-slate-900 rounded-2xl p-6 shadow-xl border border-slate-800 text-left">
                    <div className="flex items-center gap-3 mb-2">
                      <BrainCircuit size={18} className="text-emerald-400 animate-pulse" />
                      <span className="text-white font-black text-xs uppercase tracking-widest">Live Telemetry</span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-500 font-mono text-sm pl-7">
                      <Loader2 size={14} className="animate-spin shrink-0" />
                      <span className="animate-pulse">{liveAiStatus || 'Processing...'}</span>
                    </div>
                  </div>
                ) : (
                  <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl">
                    Submit Application to I3P Compliance
                  </button>
                )}
              </form>
            </div>
          )}

          {/* Sub-view: Pending AI/Human Approval */}
          {npoData && (npoData.program_tier === 'Pending_AI_Review' || npoData.program_tier === 'Pending') && (
            <div className="max-w-2xl mx-auto text-center py-20">
              <div className="w-24 h-24 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><Loader2 size={48} className="animate-spin"/></div>
              <h2 className="text-3xl font-black text-slate-800 mb-2">Application Under Review</h2>
              <p className="text-slate-500 max-w-md mx-auto">IFB AI Compliance is verifying your organization. Once approved, you will be assigned to a Network Cluster and your gateway will activate.</p>
            </div>
          )}

          {/* Sub-view: INCUBATOR (Support Cluster) */}
          {npoData && npoData.program_tier === 'Support_Cluster' && (
            <div className="max-w-3xl mx-auto">
               <div className="bg-amber-50 border border-amber-200 p-10 rounded-[3rem] text-center shadow-sm relative overflow-hidden mb-8">
                 <AlertTriangle size={100} className="absolute -right-4 -top-4 opacity-10 text-amber-500" />
                 <h2 className="text-2xl font-black text-amber-900 mb-2 relative z-10">Welcome to the I3P Incubator</h2>
                 <p className="text-sm text-amber-800 font-medium relative z-10">Based on your operating history, we have assigned you to the <strong className="text-amber-950">{npoData.assigned_support_cluster || 'Global Support Cluster'}</strong>.</p>
               </div>
               <div className="bg-white border border-slate-200 rounded-[2rem] p-8 text-center shadow-sm">
                  <HeartHandshake className="mx-auto text-amber-500 mb-4" size={32}/>
                  <h3 className="text-lg font-black text-slate-800 mb-2">Build Your Capacity</h3>
                  <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">Your global routing gateway is currently locked. To unlock live capital deployment, complete the cluster training modules and provide advanced tax documentation to IFB Compliance.</p>
                  <button className="px-6 py-3 bg-amber-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-amber-500 transition-colors shadow-lg">Access Cluster Training</button>
               </div>
            </div>
          )}

          {/* Sub-view: Verified NPO Dashboard (I3P Elite/Active View) */}
          {npoData && (npoData.program_tier === 'Elite' || npoData.program_tier === 'Cluster') && (
            <div className="space-y-8">
              {/* I3P Metrics Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={`md:col-span-2 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden flex flex-col justify-center ${npoData.program_tier === 'Elite' ? 'bg-emerald-900' : 'bg-slate-900'}`}>
                  <Globe2 size={160} className="absolute right-0 bottom-0 opacity-10 text-white translate-x-4 translate-y-4" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-3xl font-black tracking-tight">{npoData.npo_name}</h2>
                      <ShieldCheck className={npoData.program_tier === 'Elite' ? 'text-emerald-400' : 'text-blue-400'} size={24}/>
                    </div>
                    <p className="text-sm text-slate-300 mb-6 font-medium">Verified I3P <strong className={npoData.program_tier === 'Elite' ? 'text-emerald-400' : 'text-blue-400'}>{npoData.program_tier}</strong> Partner</p>
                    
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Global Routing Link</p>
                    <div className="flex items-center gap-2 bg-black/40 p-2 rounded-xl border border-white/10 w-fit">
                      <span className="text-sm font-bold text-white pl-3 pr-2">{window.location.origin}/donate?npo={session.user.id}</span>
                      <button onClick={copyLink} className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-colors">
                        {copied ? <CheckCircle2 size={18} className="text-emerald-400"/> : <Copy size={18}/>}
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white border border-slate-200 rounded-[2rem] p-8 text-center flex flex-col justify-center shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Total Capital Flow</p>
                  <p className="text-4xl font-black text-slate-800 mb-4">{formatCurrency(npoData.total_raised)}</p>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-left">
                     <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Active Float</p>
                     <p className="font-bold text-slate-700">{formatCurrency(npoData.current_float_usd)}</p>
                  </div>
                </div>
              </div>

              {/* Infrastructure Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
                  <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2"><LinkIcon className="text-slate-400"/> Configure Gateway</h3>
                  <form onSubmit={handleSaveConfig} className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Public Donor Message</label>
                      <textarea 
                        required value={configForm.message} onChange={e=>setConfigForm({...configForm, message: e.target.value})} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-blue-500 h-24" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Preset Routing Amounts (USD)</label>
                      <input 
                        required type="text" value={configForm.amounts} onChange={e=>setConfigForm({...configForm, amounts: e.target.value})} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-blue-500" 
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-slate-800">Email Alerts on Deposit</p>
                      <button 
                        type="button" onClick={() => setConfigForm({...configForm, notify: !configForm.notify})} 
                        className={`w-12 h-6 rounded-full transition-colors relative ${configForm.notify ? 'bg-emerald-500' : 'bg-slate-300'}`}
                      >
                        <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${configForm.notify ? 'translate-x-6' : ''}`}></div>
                      </button>
                    </div>
                    <button type="submit" disabled={isSaving} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all disabled:opacity-50">
                      {isSaving ? <Loader2 className="animate-spin mx-auto" size={16}/> : 'Sync Configuration'}
                    </button>
                  </form>
                </div>

                {/* Transparency / Network Fees block */}
                <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-8">
                  <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2"><Network className="text-blue-500"/> Infrastructure & Scale</h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-6">As an I3P partner, your organization operates on the IFB Sovereign Ledger. This ensures transparency, instant cross-border settlement, and float yield optimization.</p>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Network Cost</span>
                      <span className="text-sm font-black text-slate-800">1-3% Flow Fee</span>
                    </div>
                    <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Shared to IFB</span>
                      <span className="text-sm font-black text-emerald-600">{formatCurrency(npoData.ifb_revenue_generated)}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Global Status</span>
                      <span className="text-sm font-black text-blue-600">{npoData.program_tier} Partnership</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* VIEW 3: COMMAND (ADMIN ONLY)                                      */}
      {/* ================================================================= */}
      {viewTab === 'COMMAND' && isAdmin && (
        <div className="animate-in fade-in space-y-8 bg-[#0B0F19] -mx-6 md:-mx-10 -mt-6 p-6 md:p-10 min-h-screen text-white">
          <div className="max-w-6xl mx-auto space-y-8 pb-20">
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem]">
                <HeartHandshake className="text-blue-500 mb-4" size={24}/>
                <p className="text-3xl font-black text-white">{formatCurrency(allNpos.reduce((sum, n) => sum + Number(n.total_raised || 0), 0))}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Total Global Flow</p>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-[2rem]">
                <ShieldCheck className="text-emerald-500 mb-4" size={24}/>
                <p className="text-3xl font-black text-emerald-400">{formatCurrency(allNpos.reduce((sum, n) => sum + Number(n.ifb_revenue_generated || 0), 0))}</p>
                <p className="text-[10px] font-bold text-emerald-500/70 uppercase tracking-widest mt-1">IFB Network Rev</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem]">
                <Building2 className="text-indigo-500 mb-4" size={24}/>
                <p className="text-3xl font-black text-white">{allNpos.filter(n => n.program_tier === 'Elite').length}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Elite NPOs</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem]">
                <Users className="text-amber-500 mb-4" size={24}/>
                <p className="text-3xl font-black text-white">{allNpos.filter(n => n.program_tier === 'Cluster').length}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Active Clusters</p>
              </div>
            </div>

            {/* AI I3P COPILOT */}
            <div className="bg-gradient-to-br from-emerald-900/20 to-black border border-emerald-500/30 rounded-[2rem] p-8 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/50"><BrainCircuit size={20} className="text-emerald-400"/></div>
                <div>
                  <h3 className="font-black text-white text-lg">Impact Oracle (AI)</h3>
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Query your global NPO network</p>
                </div>
              </div>
              <form onSubmit={handleAskCopilot} className="relative flex items-center mb-4">
                <input 
                  value={aiQuery} onChange={(e) => setAiQuery(e.target.value)}
                  placeholder="e.g., 'Which NPO has raised the most capital?'" 
                  className="w-full bg-black/60 border border-white/10 rounded-2xl py-5 pl-6 pr-20 text-sm font-medium outline-none focus:border-emerald-500 text-white placeholder:text-slate-600"
                  disabled={isAiLoading}
                />
                <button type="submit" disabled={!aiQuery.trim() || isAiLoading} className="absolute right-3 bg-emerald-600 text-white p-3 rounded-xl disabled:opacity-50 hover:bg-emerald-500">
                  {isAiLoading ? <Loader2 size={18} className="animate-spin"/> : <ChevronRight size={18}/>}
                </button>
              </form>
              {aiResponse && (
                <div className="p-6 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl text-sm text-emerald-50 leading-relaxed">
                  {aiResponse}
                </div>
              )}
            </div>

            {/* Admin NPO List with AI Risk Scores */}
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 border-b border-white/10 pb-3">I3P Application & Network Routing</h3>
              <div className="grid grid-cols-1 gap-4">
                {allNpos.map(npo => (
                  <div key={npo.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div className="flex-1 w-full">
                      <div className="flex flex-wrap items-center gap-3 mb-1">
                        <h4 className="font-black text-white text-xl">{npo.npo_name}</h4>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                          npo.program_tier === 'Elite' ? 'bg-emerald-500/20 text-emerald-400' :
                          npo.program_tier === 'Cluster' ? 'bg-blue-500/20 text-blue-400' : 
                          npo.program_tier === 'Support_Cluster' ? 'bg-amber-500/20 text-amber-400' :
                          npo.program_tier === 'Banned' ? 'bg-red-500/20 text-red-400' :
                          'bg-slate-500/20 text-slate-400'
                        }`}>{npo.program_tier.replace('_', ' ')}</span>
                        
                        {/* Display AI Risk Score if evaluated */}
                        {npo.ai_risk_score && (
                           <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                             npo.ai_risk_score === 'High' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                             npo.ai_risk_score === 'Medium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                             'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                           }`}>Risk: {npo.ai_risk_score}</span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-slate-400 mb-3">{npo.country || 'Global'} • {npo.sector || 'N/A'} • Est. Volume: {npo.estimated_volume || 'Unknown'}</p>
                      
                      {npo.ai_compliance_notes && (
                        <div className="bg-black/40 border border-white/5 p-3 rounded-xl mb-3 text-xs text-slate-300">
                          <strong className="text-blue-400 block mb-1">AI Compliance Note:</strong>
                          {npo.ai_compliance_notes}
                        </div>
                      )}
                      
                      <div className="flex gap-6 mt-2">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Total Flow</p>
                          <p className="font-bold text-white text-sm">{formatCurrency(npo.total_raised)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500">IFB Rev Cut</p>
                          <p className="font-bold text-emerald-400 text-sm">{formatCurrency(npo.ifb_revenue_generated)}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Admin Controls */}
                    <div className="flex flex-wrap gap-2 w-full lg:w-auto bg-black/40 p-2 rounded-xl border border-white/5">
                      <button 
                        onClick={() => handleUpdateTier(npo.id, 'Cluster')} 
                        className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-colors ${npo.program_tier === 'Cluster' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                      >
                        Set Cluster
                      </button>
                      <button 
                        onClick={() => handleUpdateTier(npo.id, 'Support_Cluster')} 
                        className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-colors ${npo.program_tier === 'Support_Cluster' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                      >
                        Set Incubator
                      </button>
                      <button 
                        onClick={() => handleUpdateTier(npo.id, 'Elite')} 
                        className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-colors ${npo.program_tier === 'Elite' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                      >
                        Set Elite
                      </button>
                      <button 
                        onClick={() => handleUpdateTier(npo.id, 'Banned')} 
                        className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-colors ${npo.program_tier === 'Banned' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                      >
                        Ban
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}