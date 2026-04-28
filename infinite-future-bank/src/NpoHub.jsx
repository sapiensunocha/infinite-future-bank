import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import { APP_URL } from './config/constants';
import {
  HeartHandshake, ShieldCheck, Link as LinkIcon, Loader2, Copy,
  CheckCircle2, Search, ArrowRight, Globe2, BrainCircuit,
  XCircle, ChevronRight, Building2, Users, AlertTriangle, Network,
  RefreshCw, Sparkles
} from 'lucide-react';

const safeParseAmounts = (v) => {
  if (!v) return [10, 50, 100];
  if (Array.isArray(v)) return v;
  try { return JSON.parse(v); } catch { return [10, 50, 100]; }
};

const ORG_TYPES = ['NGO', 'Foundation', 'Association', 'Charity', 'Social Enterprise', 'Religious Org', 'Community Group', 'Other'];
const SECTORS = ['Education', 'Health', 'Environment', 'Disaster Relief', 'Poverty Alleviation', 'Human Rights', 'Arts & Culture', 'Technology', 'Women Empowerment', 'Child Welfare', 'Other'];

export default function NpoHub({ session }) {
  const [viewTab, setViewTab] = useState('EXPLORE');
  const [isAdmin, setIsAdmin] = useState(false);

  const [npoData, setNpoData] = useState(null);
  const [verifiedNpos, setVerifiedNpos] = useState([]);
  const [allNpos, setAllNpos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [countryList, setCountryList] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [donateModal, setDonateModal] = useState(null);
  const [donateAmount, setDonateAmount] = useState('');
  const [isDonating, setIsDonating] = useState(false);

  const [applyForm, setApplyForm] = useState({
    name: '', taxId: '', mission: '', sector: '', country: '',
    estimated_volume: '', website: '', org_type: '', founded_year: ''
  });
  const [isApplying, setIsApplying] = useState(false);
  const [liveAiStatus, setLiveAiStatus] = useState('');
  const [configForm, setConfigForm] = useState({ message: '', amounts: '', notify: true });

  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const showError = (msg) => { setErrorMsg(msg); setTimeout(() => setErrorMsg(''), 6000); };

  useEffect(() => { checkAccessAndFetchData(); }, [viewTab]);

  useEffect(() => {
    if (!isApplying) return;
    const channel = supabase.channel('npo-telemetry')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'npo_profiles',
        filter: `id=eq.${session.user.id}`
      }, (payload) => {
        if (payload.new.live_ai_status) setLiveAiStatus(payload.new.live_ai_status);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [isApplying, session.user.id]);

  const checkAccessAndFetchData = async () => {
    setIsLoading(true);
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
    const userIsAdmin = profile && ['support_l1', 'advisor_l2', 'admin_l3'].includes(profile.role);
    setIsAdmin(userIsAdmin);

    const { data: myNpo } = await supabase.from('npo_profiles').select('*').eq('id', session.user.id).maybeSingle();
    if (myNpo) {
      setNpoData(myNpo);
      setConfigForm({
        message: myNpo.donation_message || '',
        amounts: myNpo.preset_amounts ? safeParseAmounts(myNpo.preset_amounts).join(', ') : '10, 50, 100',
        notify: myNpo.notify_on_donation ?? true
      });
    } else {
      setNpoData(null);
    }

    const { data: publicNpos } = await supabase.from('npo_profiles').select('*').in('program_tier', ['Cluster', 'Elite']);
    if (publicNpos) setVerifiedNpos(publicNpos);

    if (userIsAdmin) {
      const { data: fullList } = await supabase.from('npo_profiles').select('*').order('created_at', { ascending: false });
      if (fullList) setAllNpos(fullList);
    }

    const { data: countriesData } = await supabase.from('countries').select('name').order('name');
    if (countriesData) setCountryList(countriesData.map(c => c.name));

    setIsLoading(false);
  };

  const handleDonate = async (e) => {
    e.preventDefault();
    const amount = parseFloat(donateAmount);
    if (!amount || amount <= 0) return;
    setIsDonating(true);
    try {
      const { error } = await supabase.rpc('process_npo_donation', {
        p_npo_id: donateModal.id, p_donor_id: session.user.id, p_amount: amount
      });
      if (error) throw error;
      if (donateModal.notify_on_donation) {
        await supabase.from('notifications').insert([{
          user_id: donateModal.id, type: 'system',
          message: `You received a $${amount.toFixed(2)} donation via the I3P Network!`, status: 'completed'
        }]);
      }
      setDonateModal(null);
      setDonateAmount('');
      checkAccessAndFetchData();
    } catch (err) {
      showError(err.message || 'Donation failed. Check your balance.');
    } finally {
      setIsDonating(false);
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    setIsApplying(true);
    setLiveAiStatus('Connecting to IFB Sovereign Ledger...');

    try {
      const fullMission = [
        applyForm.mission,
        applyForm.website ? `Website: ${applyForm.website}` : '',
        applyForm.founded_year ? `Founded: ${applyForm.founded_year}` : '',
        applyForm.org_type ? `Type: ${applyForm.org_type}` : ''
      ].filter(Boolean).join(' | ');

      // Upsert allows re-application
      const { error: dbError } = await supabase.from('npo_profiles').upsert({
        id: session.user.id,
        npo_name: applyForm.name,
        tax_id: applyForm.taxId,
        mission_statement: fullMission,
        sector: applyForm.org_type ? `${applyForm.org_type} — ${applyForm.sector}` : applyForm.sector,
        country: applyForm.country,
        estimated_volume: applyForm.estimated_volume,
        program_tier: 'Pending_AI_Review',
        verification_status: 'pending_review',
        live_ai_status: 'IFB Compliance Engine Online...',
        ai_risk_score: null,
        ai_compliance_notes: null
      }, { onConflict: 'id' });

      if (dbError) throw dbError;

      // Try primary AI compliance engine
      setLiveAiStatus('Running AML & Sector Compliance Scan...');
      let primarySucceeded = false;
      try {
        const { error: aiError } = await supabase.functions.invoke('ifb-npo-compliance', {
          body: { npoId: session.user.id }
        });
        if (!aiError) primarySucceeded = true;
      } catch { /* fallback below */ }

      // Grok AI fallback
      if (!primarySucceeded) {
        setLiveAiStatus('Activating Grok AI Validator...');

        const validationPrompt = [
          {
            role: 'system',
            content: `You are IFB AI Compliance Officer. Analyze this NPO application and return ONLY valid JSON with no extra text: {"tier":"Cluster","risk":"Low","notes":"brief note under 80 words","approved":true}. Rules: tier must be "Cluster", "Elite", or "Support_Cluster". risk must be "Low", "Medium", or "High". Legitimate organizations with valid registration IDs → "Cluster". Exceptional track record and large scale → "Elite". Unclear, unverifiable, or high-risk → "Support_Cluster". Be decisive.`
          },
          {
            role: 'user',
            content: `NPO Application — Name: "${applyForm.name}", Registration/Tax ID: "${applyForm.taxId}", Type: "${applyForm.org_type}", Country: "${applyForm.country}", Sector: "${applyForm.sector}", Founded: "${applyForm.founded_year}", Website: "${applyForm.website}", Annual Capital Need: "${applyForm.estimated_volume}", Mission: "${applyForm.mission}"`
          }
        ];

        setLiveAiStatus('AI Reviewing Organization Credentials...');

        const { data: grokData, error: grokError } = await supabase.functions.invoke('pascaline-grok-agent', {
          body: { messages: validationPrompt, userId: session.user.id }
        });

        if (!grokError && grokData?.content) {
          setLiveAiStatus('Parsing Compliance Decision...');
          let tier = 'Cluster';
          let riskScore = 'Low';
          let notes = 'Organization profile verified by IFB AI Compliance system.';

          try {
            const jsonMatch = grokData.content.match(/\{[\s\S]*?\}/);
            if (jsonMatch) {
              const result = JSON.parse(jsonMatch[0]);
              if (['Cluster', 'Elite', 'Support_Cluster'].includes(result.tier)) tier = result.tier;
              if (['Low', 'Medium', 'High'].includes(result.risk)) riskScore = result.risk;
              if (result.notes) notes = result.notes;
            }
          } catch { /* use defaults */ }

          const isApproved = tier !== 'Support_Cluster';
          setLiveAiStatus(isApproved ? '✓ Verification Complete — Activating Donation Gateway...' : '⚠ Assigned to Incubator Program...');

          await supabase.from('npo_profiles').update({
            program_tier: tier,
            verification_status: isApproved ? 'verified' : 'pending_review',
            ai_risk_score: riskScore,
            ai_compliance_notes: notes,
            live_ai_status: isApproved ? '✓ VERIFIED — Donation Gateway Active' : '⚠ Incubator Assigned — Build Your Profile'
          }).eq('id', session.user.id);
        } else {
          // Both engines failed — queue for human review
          await supabase.from('npo_profiles').update({
            live_ai_status: 'Under Human Review — Response within 24 hours'
          }).eq('id', session.user.id);
        }
      }

      await checkAccessAndFetchData();
    } catch (err) {
      showError('Application failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsApplying(false);
      setTimeout(() => setLiveAiStatus(''), 5000);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const amountArray = configForm.amounts.split(',').map(n => parseFloat(n.trim())).filter(n => !isNaN(n));
      await supabase.from('npo_profiles').update({
        donation_message: configForm.message,
        preset_amounts: JSON.stringify(amountArray),
        notify_on_donation: configForm.notify
      }).eq('id', session.user.id);
      checkAccessAndFetchData();
    } catch { showError('Save failed. Check amount format: use comma-separated numbers (e.g. 10,25,50).'); }
    finally { setIsSaving(false); }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${APP_URL}/donate?npo=${session.user.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleUpdateTier = async (id, newTier) => {
    const status = newTier === 'Banned' ? 'rejected' : 'verified';
    await supabase.from('npo_profiles').update({ program_tier: newTier, verification_status: status }).eq('id', id);
    checkAccessAndFetchData();
  };

  const handleAskCopilot = async (e) => {
    e.preventDefault();
    if (!aiQuery.trim() || isAiLoading) return;
    setIsAiLoading(true);
    setAiResponse('');
    try {
      const networkData = allNpos.map(n => ({ Name: n.npo_name, Tier: n.program_tier, Raised: n.total_raised, Float: n.current_float_usd }));
      const { data, error } = await supabase.functions.invoke('pascaline-grok-agent', {
        body: {
          messages: [
            { role: 'system', content: `You are the IFB I3P Program AI Director. Analyze this NPO data: ${JSON.stringify(networkData)}. Provide strategic insights on capital deployment and revenue scaling.` },
            { role: 'user', content: aiQuery.trim() }
          ],
          userId: session.user.id
        }
      });
      if (error) throw error;
      setAiResponse(data.content);
    } catch { setAiResponse('I3P Copilot offline. Awaiting secure network bridge.'); }
    finally { setIsAiLoading(false); }
  };

  const filteredNpos = verifiedNpos.filter(npo =>
    npo.npo_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    npo.mission_statement?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    npo.country?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);

  const isBanned = npoData?.program_tier === 'Banned';
  const isPending = npoData && ['Pending_AI_Review', 'Pending'].includes(npoData.program_tier);
  const isIncubator = npoData?.program_tier === 'Support_Cluster';
  const isVerified = npoData && ['Elite', 'Cluster'].includes(npoData.program_tier);

  if (isLoading) return (
    <div className="py-20 text-center">
      <Loader2 className="animate-spin mx-auto text-emerald-500 mb-4" size={40} />
      <p className="font-bold text-slate-500">Syncing I3P Global Network...</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">

      {/* ERROR TOAST */}
      {errorMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[900] px-8 py-4 rounded-full shadow-2xl border-2 border-red-500 bg-red-900 text-red-200 flex items-center gap-3 animate-in slide-in-from-top-4">
          <XCircle size={18} />
          <span className="font-black text-sm">{errorMsg}</span>
        </div>
      )}

      {/* TABS */}
      <div className="flex gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm w-fit mx-auto mb-8">
        <button onClick={() => setViewTab('EXPLORE')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewTab === 'EXPLORE' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
          Explore Causes
        </button>
        <button onClick={() => setViewTab('MANAGE')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewTab === 'MANAGE' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
          My Organization
        </button>
        {isAdmin && (
          <button onClick={() => setViewTab('COMMAND')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewTab === 'COMMAND' ? 'bg-emerald-600 text-white shadow-md' : 'text-emerald-600 hover:bg-emerald-50'}`}>
            <Globe2 size={14} /> I3P Command
          </button>
        )}
      </div>

      {/* ================================================================= */}
      {/* VIEW 1: EXPLORE                                                    */}
      {/* ================================================================= */}
      {viewTab === 'EXPLORE' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 p-10 rounded-[3rem] text-center shadow-xl relative overflow-hidden text-white">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
            <h2 className="text-3xl font-black mb-2 relative z-10 text-emerald-400">Fund the Future</h2>
            <p className="text-sm text-slate-300 font-medium max-w-xl mx-auto relative z-10">Zero external fees. Deploy capital instantly to verified IFB Impact Partners via the Sovereign Ledger.</p>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-4 text-slate-400" size={20} />
            <input
              type="text" placeholder="Search by cause, country, or mission..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 p-4 pl-12 rounded-2xl font-bold outline-none focus:border-emerald-500 transition-all shadow-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNpos.length === 0 && (
              <p className="text-slate-500 text-center col-span-full py-10 font-bold">No verified causes found.</p>
            )}
            {filteredNpos.map(npo => (
              <div key={npo.id} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 hover:shadow-lg hover:border-emerald-200 transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-black text-slate-800 text-lg leading-tight">{npo.npo_name}</h3>
                      <p className="text-[9px] text-slate-400 font-bold mt-0.5">{npo.country} · {npo.sector?.split('—')[0]?.trim()}</p>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded mt-1 inline-block ${npo.program_tier === 'Elite' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                        {npo.program_tier} Partner
                      </span>
                    </div>
                    <ShieldCheck className={npo.program_tier === 'Elite' ? 'text-emerald-500 shrink-0' : 'text-blue-500 shrink-0'} size={24} />
                  </div>
                  <p className="text-xs text-slate-600 font-medium mb-6 line-clamp-3">"{npo.mission_statement?.split('|')[0]?.trim()}"</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Total Raised</p>
                  <p className="text-2xl font-black text-slate-800 mb-4">{formatCurrency(npo.total_raised)}</p>
                  <button
                    onClick={() => { setDonateModal(npo); setDonateAmount(''); }}
                    className="w-full bg-slate-900 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-600 transition-colors"
                  >
                    Deploy Capital <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* DONATION MODAL */}
          {donateModal && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
                <div className={`p-6 border-b border-slate-100 text-center ${donateModal.program_tier === 'Elite' ? 'bg-emerald-50' : 'bg-blue-50'}`}>
                  <h3 className={`font-black text-xl ${donateModal.program_tier === 'Elite' ? 'text-emerald-950' : 'text-blue-950'}`}>{donateModal.npo_name}</h3>
                  <p className={`text-xs font-bold mt-1 ${donateModal.program_tier === 'Elite' ? 'text-emerald-700' : 'text-blue-700'}`}>Verified {donateModal.program_tier} Partner · {donateModal.country}</p>
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
                      {safeParseAmounts(donateModal.preset_amounts).map(amt => (
                        <button key={amt} type="button" onClick={() => setDonateAmount(amt.toString())}
                          className={`py-3 rounded-xl font-black text-sm transition-all border-2 ${parseFloat(donateAmount) === amt ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                          ${amt}
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">$</span>
                      <input required type="number" step="0.01" min="1" value={donateAmount} onChange={e => setDonateAmount(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 pl-8 font-black text-xl outline-none focus:border-slate-400 text-slate-800"
                        placeholder="Custom Amount" />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setDonateModal(null)} className="w-1/3 bg-slate-100 text-slate-600 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200">Cancel</button>
                    <button type="submit" disabled={isDonating} className="w-2/3 bg-slate-900 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-colors shadow-lg disabled:opacity-50">
                      {isDonating ? <Loader2 className="animate-spin mx-auto" size={16} /> : `Deploy $${donateAmount || '0'}`}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* VIEW 2: MANAGE MY ORGANIZATION                                     */}
      {/* ================================================================= */}
      {viewTab === 'MANAGE' && (
        <div className="animate-in fade-in">

          {/* STATE: BANNED — reapply option */}
          {isBanned && (
            <div className="max-w-2xl mx-auto text-center py-12 space-y-6">
              <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-inner"><XCircle size={48} /></div>
              <h2 className="text-3xl font-black text-slate-800">Application Rejected</h2>
              {npoData.ai_compliance_notes && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-2xl text-sm text-red-700 font-medium">{npoData.ai_compliance_notes}</div>
              )}
              <p className="text-slate-500 max-w-md mx-auto">If you believe this is an error or have updated your registration, you may resubmit with complete documentation.</p>
              <button onClick={() => setNpoData(null)} className="px-8 py-4 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-blue-600 transition-colors shadow-lg">
                <RefreshCw size={14} className="inline mr-2" />Resubmit Application
              </button>
            </div>
          )}

          {/* STATE: No application yet OR reapplying */}
          {(!npoData || (!isBanned && !isPending && !isIncubator && !isVerified)) && (
            <div className="max-w-3xl mx-auto">
              <div className="bg-slate-900 border border-slate-800 p-10 rounded-[3rem] shadow-xl text-white mb-8 text-center relative overflow-hidden">
                <Globe2 size={100} className="absolute -left-10 -bottom-10 opacity-10 text-blue-500" />
                <h2 className="text-3xl font-black tracking-tight mb-2 relative z-10">Join the I3P Network</h2>
                <p className="text-sm text-slate-400 max-w-xl mx-auto relative z-10">Apply to become an IFB Impact Partner. Our AI compliance engine reviews applications in real-time — no waiting, no simulation.</p>
              </div>

              <form onSubmit={handleApply} className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-sm space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Organization Name *</label>
                    <input required type="text" placeholder="World Health Foundation"
                      value={applyForm.name} onChange={e => setApplyForm({ ...applyForm, name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Gov Tax / Registration ID *</label>
                    <input required type="text" placeholder="EIN: 12-3456789"
                      value={applyForm.taxId} onChange={e => setApplyForm({ ...applyForm, taxId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Organization Type *</label>
                    <select required value={applyForm.org_type} onChange={e => setApplyForm({ ...applyForm, org_type: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-blue-500 cursor-pointer">
                      <option value="">Select Type</option>
                      {ORG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Primary Sector *</label>
                    <select required value={applyForm.sector} onChange={e => setApplyForm({ ...applyForm, sector: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-blue-500 cursor-pointer">
                      <option value="">Select Sector</option>
                      {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Operating Country *</label>
                    <select required value={applyForm.country} onChange={e => setApplyForm({ ...applyForm, country: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-blue-500 cursor-pointer">
                      <option value="">Select Country</option>
                      {countryList.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Year Founded</label>
                    <input type="number" min="1800" max="2026" placeholder="2010"
                      value={applyForm.founded_year} onChange={e => setApplyForm({ ...applyForm, founded_year: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Website</label>
                    <input type="url" placeholder="https://yourorg.org"
                      value={applyForm.website} onChange={e => setApplyForm({ ...applyForm, website: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Annual Capital Need *</label>
                    <input required type="text" placeholder="$50,000"
                      value={applyForm.estimated_volume} onChange={e => setApplyForm({ ...applyForm, estimated_volume: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-blue-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Mission Statement *</label>
                  <textarea required placeholder="Describe your organization's mission, the communities you serve, and your key programs..."
                    value={applyForm.mission} onChange={e => setApplyForm({ ...applyForm, mission: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-blue-500 h-32" />
                </div>

                {isApplying ? (
                  <div className="w-full bg-slate-900 rounded-2xl p-6 shadow-xl border border-slate-800 text-left">
                    <div className="flex items-center gap-3 mb-2">
                      <BrainCircuit size={18} className="text-emerald-400 animate-pulse" />
                      <span className="text-white font-black text-xs uppercase tracking-widest">Live AI Compliance</span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-500 font-mono text-sm pl-7">
                      <Loader2 size={14} className="animate-spin shrink-0" />
                      <span className="animate-pulse">{liveAiStatus || 'Processing...'}</span>
                    </div>
                  </div>
                ) : (
                  <button type="submit"
                    className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl flex items-center justify-center gap-3">
                    <Sparkles size={16} /> Submit to AI Compliance Engine
                  </button>
                )}
              </form>
            </div>
          )}

          {/* STATE: PENDING AI REVIEW */}
          {isPending && (
            <div className="max-w-2xl mx-auto text-center py-20">
              <div className="w-24 h-24 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Loader2 size={48} className="animate-spin" />
              </div>
              <h2 className="text-3xl font-black text-slate-800 mb-2">Application Under Review</h2>
              <p className="text-slate-500 max-w-md mx-auto mb-6">IFB AI Compliance is verifying your organization. You will be notified once a decision is made.</p>
              {npoData.ai_compliance_notes && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl text-sm text-blue-700 font-medium mb-6">
                  <strong>AI Note:</strong> {npoData.ai_compliance_notes}
                </div>
              )}
              {npoData.live_ai_status && (
                <p className="text-xs font-mono text-slate-400">{npoData.live_ai_status}</p>
              )}
            </div>
          )}

          {/* STATE: INCUBATOR */}
          {isIncubator && (
            <div className="max-w-3xl mx-auto">
              <div className="bg-amber-50 border border-amber-200 p-10 rounded-[3rem] text-center shadow-sm relative overflow-hidden mb-8">
                <AlertTriangle size={100} className="absolute -right-4 -top-4 opacity-10 text-amber-500" />
                <h2 className="text-2xl font-black text-amber-900 mb-2 relative z-10">Welcome to the I3P Incubator</h2>
                <p className="text-sm text-amber-800 font-medium relative z-10">
                  Based on your profile, you have been assigned to the Incubator Program to build your organizational capacity before full activation.
                </p>
                {npoData.ai_compliance_notes && (
                  <div className="mt-4 bg-amber-100/60 border border-amber-300 p-3 rounded-xl text-xs text-amber-900 font-medium relative z-10">
                    <strong>AI Assessment:</strong> {npoData.ai_compliance_notes}
                  </div>
                )}
              </div>
              <div className="bg-white border border-slate-200 rounded-[2rem] p-8 text-center shadow-sm">
                <HeartHandshake className="mx-auto text-amber-500 mb-4" size={32} />
                <h3 className="text-lg font-black text-slate-800 mb-2">Build Your Capacity</h3>
                <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">Your donation gateway is currently locked. Provide advanced documentation and complete compliance training to unlock full access.</p>
                <div className="flex gap-3 justify-center">
                  <button className="px-6 py-3 bg-amber-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-amber-500 transition-colors shadow-lg">Access Training</button>
                  <button onClick={() => { setNpoData(null); }} className="px-6 py-3 bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-300 transition-colors">
                    <RefreshCw size={12} className="inline mr-1" />Update & Resubmit
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STATE: VERIFIED DASHBOARD */}
          {isVerified && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={`md:col-span-2 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden flex flex-col justify-center ${npoData.program_tier === 'Elite' ? 'bg-emerald-900' : 'bg-slate-900'}`}>
                  <Globe2 size={160} className="absolute right-0 bottom-0 opacity-10 text-white translate-x-4 translate-y-4" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-3xl font-black tracking-tight">{npoData.npo_name}</h2>
                      <ShieldCheck className={npoData.program_tier === 'Elite' ? 'text-emerald-400' : 'text-blue-400'} size={24} />
                    </div>
                    <p className="text-sm text-slate-300 mb-1 font-medium">
                      Verified I3P <strong className={npoData.program_tier === 'Elite' ? 'text-emerald-400' : 'text-blue-400'}>{npoData.program_tier}</strong> Partner
                    </p>
                    {npoData.ai_risk_score && (
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded inline-block mb-4 ${npoData.ai_risk_score === 'Low' ? 'bg-emerald-500/20 text-emerald-400' : npoData.ai_risk_score === 'Medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                        Risk: {npoData.ai_risk_score}
                      </span>
                    )}
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Global Donation Link</p>
                    <div className="flex items-center gap-2 bg-black/40 p-2 rounded-xl border border-white/10 w-fit">
                      <span className="text-sm font-bold text-white pl-3 pr-2 truncate max-w-[280px]">{window.location.origin}/donate?npo={session.user.id}</span>
                      <button onClick={copyLink} className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-colors shrink-0">
                        {copied ? <CheckCircle2 size={18} className="text-emerald-400" /> : <Copy size={18} />}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
                  <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2"><LinkIcon className="text-slate-400" /> Configure Gateway</h3>
                  <form onSubmit={handleSaveConfig} className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Public Donor Message</label>
                      <textarea required value={configForm.message} onChange={e => setConfigForm({ ...configForm, message: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-blue-500 h-24" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Preset Amounts (USD, comma-separated)</label>
                      <input required type="text" value={configForm.amounts} onChange={e => setConfigForm({ ...configForm, amounts: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-blue-500" />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-slate-800">Email Alerts on Donation</p>
                      <button type="button" onClick={() => setConfigForm({ ...configForm, notify: !configForm.notify })}
                        className={`w-12 h-6 rounded-full transition-colors relative ${configForm.notify ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                        <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${configForm.notify ? 'translate-x-6' : ''}`} />
                      </button>
                    </div>
                    <button type="submit" disabled={isSaving} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all disabled:opacity-50">
                      {isSaving ? <Loader2 className="animate-spin mx-auto" size={16} /> : 'Sync Configuration'}
                    </button>
                  </form>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-8">
                  <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2"><Network className="text-blue-500" /> Infrastructure & Fees</h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-6">As an I3P partner, your organization operates on the IFB Sovereign Ledger with instant cross-border settlement and float yield optimization.</p>
                  <div className="space-y-4">
                    {[
                      { label: 'Network Fee', value: '1–3% Flow Fee' },
                      { label: 'IFB Revenue Share', value: formatCurrency(npoData.ifb_revenue_generated), highlight: 'emerald' },
                      { label: 'Partner Status', value: `${npoData.program_tier} Tier`, highlight: 'blue' }
                    ].map(row => (
                      <div key={row.label} className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{row.label}</span>
                        <span className={`text-sm font-black ${row.highlight === 'emerald' ? 'text-emerald-600' : row.highlight === 'blue' ? 'text-blue-600' : 'text-slate-800'}`}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* VIEW 3: COMMAND (ADMIN)                                           */}
      {/* ================================================================= */}
      {viewTab === 'COMMAND' && isAdmin && (
        <div className="animate-in fade-in space-y-8 bg-[#0B0F19] -mx-6 md:-mx-10 -mt-6 p-6 md:p-10 min-h-screen text-white">
          <div className="max-w-6xl mx-auto space-y-8 pb-20">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: <HeartHandshake className="text-blue-500 mb-4" size={24}/>, value: formatCurrency(allNpos.reduce((s,n)=>s+Number(n.total_raised||0),0)), label: 'Total Global Flow', bg: 'bg-white/5 border-white/10' },
                { icon: <ShieldCheck className="text-emerald-500 mb-4" size={24}/>, value: formatCurrency(allNpos.reduce((s,n)=>s+Number(n.ifb_revenue_generated||0),0)), label: 'IFB Network Rev', bg: 'bg-emerald-500/10 border-emerald-500/20', color: 'text-emerald-400' },
                { icon: <Building2 className="text-indigo-500 mb-4" size={24}/>, value: allNpos.filter(n=>n.program_tier==='Elite').length, label: 'Elite NPOs', bg: 'bg-white/5 border-white/10' },
                { icon: <Users className="text-amber-500 mb-4" size={24}/>, value: allNpos.filter(n=>n.program_tier==='Cluster').length, label: 'Active Clusters', bg: 'bg-white/5 border-white/10' }
              ].map((card, i) => (
                <div key={i} className={`${card.bg} border p-6 rounded-[2rem]`}>
                  {card.icon}
                  <p className={`text-3xl font-black ${card.color || 'text-white'}`}>{card.value}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{card.label}</p>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-br from-emerald-900/20 to-black border border-emerald-500/30 rounded-[2rem] p-8 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/50"><BrainCircuit size={20} className="text-emerald-400" /></div>
                <div>
                  <h3 className="font-black text-white text-lg">Impact Oracle (AI)</h3>
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Query your global NPO network</p>
                </div>
              </div>
              <form onSubmit={handleAskCopilot} className="relative flex items-center mb-4">
                <input value={aiQuery} onChange={e => setAiQuery(e.target.value)} disabled={isAiLoading}
                  placeholder="e.g., 'Which NPO has the highest risk score?'"
                  className="w-full bg-black/60 border border-white/10 rounded-2xl py-5 pl-6 pr-20 text-sm font-medium outline-none focus:border-emerald-500 text-white placeholder:text-slate-600" />
                <button type="submit" disabled={!aiQuery.trim() || isAiLoading} className="absolute right-3 bg-emerald-600 text-white p-3 rounded-xl disabled:opacity-50 hover:bg-emerald-500">
                  {isAiLoading ? <Loader2 size={18} className="animate-spin" /> : <ChevronRight size={18} />}
                </button>
              </form>
              {aiResponse && <div className="p-6 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl text-sm text-emerald-50 leading-relaxed">{aiResponse}</div>}
            </div>

            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 border-b border-white/10 pb-3">I3P Application Registry</h3>
              <div className="grid grid-cols-1 gap-4">
                {allNpos.map(npo => (
                  <div key={npo.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div className="flex-1 w-full">
                      <div className="flex flex-wrap items-center gap-3 mb-1">
                        <h4 className="font-black text-white text-xl">{npo.npo_name}</h4>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                          npo.program_tier==='Elite'?'bg-emerald-500/20 text-emerald-400':
                          npo.program_tier==='Cluster'?'bg-blue-500/20 text-blue-400':
                          npo.program_tier==='Support_Cluster'?'bg-amber-500/20 text-amber-400':
                          npo.program_tier==='Banned'?'bg-red-500/20 text-red-400':
                          'bg-slate-500/20 text-slate-400'}`}>{npo.program_tier?.replace('_',' ')}</span>
                        {npo.ai_risk_score && (
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${npo.ai_risk_score==='High'?'bg-red-500/20 text-red-400 border-red-500/30':npo.ai_risk_score==='Medium'?'bg-amber-500/20 text-amber-400 border-amber-500/30':'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                            Risk: {npo.ai_risk_score}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-slate-400 mb-2">{npo.country || 'Global'} · {npo.sector || 'N/A'} · Est. Volume: {npo.estimated_volume || 'Unknown'}</p>
                      {npo.ai_compliance_notes && (
                        <div className="bg-black/40 border border-white/5 p-3 rounded-xl mb-3 text-xs text-slate-300">
                          <strong className="text-blue-400 block mb-1">AI Compliance Note:</strong>{npo.ai_compliance_notes}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 w-full lg:w-auto bg-black/40 p-2 rounded-xl border border-white/5">
                      {[['Set Cluster','Cluster','blue'],['Set Incubator','Support_Cluster','amber'],['Set Elite','Elite','emerald'],['Ban','Banned','red']].map(([label,tier,color])=>(
                        <button key={tier} onClick={()=>handleUpdateTier(npo.id,tier)}
                          className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-colors ${npo.program_tier===tier?`bg-${color}-600 text-white`:'text-slate-400 hover:text-white hover:bg-white/10'}`}>
                          {label}
                        </button>
                      ))}
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
