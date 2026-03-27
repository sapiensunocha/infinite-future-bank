import React, { useState, useEffect } from 'react';
import { Search, MapPin, Briefcase, DollarSign, Activity, ShieldCheck, Cpu, CheckCircle, ArrowRight, Zap, Target, Lock, RefreshCw } from 'lucide-react';
import { supabase } from './services/supabaseClient';

export default function VentureExchange({ profile }) {
  // Toggle for testing both views. In production, this binds to profile.role
  const [viewMode, setViewMode] = useState('INVESTOR'); 
  
  // Investor State
  const [searchFilters, setSearchFilters] = useState({ location: '', sector: '', minTarget: '' });
  const [campaigns, setCampaigns] = useState([]);
  const [selectedDeal, setSelectedDeal] = useState(null);

  // Founder State
  const [myCampaign, setMyCampaign] = useState(null);
  const [coachingTracks, setCoachingTracks] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // --- REAL LIVE DATABASE CONNECTION ---
  const fetchMarketplaceData = async () => {
    try {
      // 1. Fetch all active campaigns for the Investor Market
      const { data: campaignData, error: campError } = await supabase
        .from('funding_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!campError && campaignData) setCampaigns(campaignData);

      // 2. Fetch the logged-in Founder's specific campaign (if they have one)
      if (profile?.id) {
        const { data: myCampData } = await supabase
          .from('funding_campaigns')
          .select('*')
          .eq('user_id', profile.id)
          .single();
        
        if (myCampData) {
          setMyCampaign(myCampData);
          
          // Fetch their milestones
          const { data: milestoneData } = await supabase
            .from('campaign_milestones')
            .select('*')
            .eq('campaign_id', myCampData.id)
            .order('created_at', { ascending: true });
          if (milestoneData) setMilestones(milestoneData);

          // Fetch their AI Coaching Tracks
          const { data: coachingData } = await supabase
            .from('founder_coaching_tracks')
            .select('*')
            .eq('campaign_id', myCampData.id)
            .order('created_at', { ascending: false });
          if (coachingData) setCoachingTracks(coachingData);
        }
      }
    } catch (err) {
      console.error("Error syncing venture telemetry:", err);
    }
  };

  useEffect(() => {
    fetchMarketplaceData();
  }, [profile]);

  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount || 0);

  // --- ACTION: COMMIT CAPITAL (INVESTOR) ---
  const handleCommitCapital = async (campaignId, amount) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/venture-engine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ action: 'commit_capital', payload: { campaign_id: campaignId, amount: amount } })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      
      alert(`Capital Locked: ${result.message}`);
      fetchMarketplaceData(); // Refresh UI to show updated escrow
    } catch (err) {
      alert(`Escrow Error: ${err.message}`);
    }
  };

  // --- ACTION: VERIFY API METRICS (FOUNDER) ---
  const handleVerifyMilestone = async (milestoneId, currentMetricValue) => {
    setIsSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/venture-engine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ action: 'verify_milestone', payload: { milestone_id: milestoneId, current_metric: currentMetricValue } })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      
      alert(`Milestone Status: ${result.message}`);
      fetchMarketplaceData(); // Refresh UI to show released funds and new AI advice
    } catch (err) {
      alert(`Verification Failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // ==========================================
  // VIEW 1: THE INVESTOR MARKETPLACE (AIRBNB STYLE)
  // ==========================================
  const renderInvestorView = () => (
    <div className="animate-in fade-in duration-500">
      {/* Search & Filter Bar */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-3xl shadow-2xl mb-8 flex flex-col md:flex-row gap-4 items-center sticky top-4 z-30">
        <div className="flex-1 w-full flex items-center gap-3 bg-black/20 px-4 py-3 rounded-2xl border border-white/5 focus-within:border-blue-500/50 transition-colors">
          <MapPin size={18} className="text-slate-400" />
          <input type="text" placeholder="Global Region (e.g., Nairobi, Dubai)" className="bg-transparent text-white w-full outline-none placeholder:text-slate-500 text-sm font-medium" onChange={(e) => setSearchFilters({...searchFilters, location: e.target.value})} />
        </div>
        <div className="w-px h-8 bg-white/10 hidden md:block"></div>
        <div className="flex-1 w-full flex items-center gap-3 bg-black/20 px-4 py-3 rounded-2xl border border-white/5 focus-within:border-blue-500/50 transition-colors">
          <Briefcase size={18} className="text-slate-400" />
          <input type="text" placeholder="Sector (e.g., Fintech, Clean Energy)" className="bg-transparent text-white w-full outline-none placeholder:text-slate-500 text-sm font-medium" onChange={(e) => setSearchFilters({...searchFilters, sector: e.target.value})} />
        </div>
        <div className="w-px h-8 bg-white/10 hidden md:block"></div>
        <button className="w-full md:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
          <Search size={16} /> Scan Market
        </button>
      </div>

      {/* Venture Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.length === 0 ? (
          <p className="text-slate-400 font-mono text-sm p-4 col-span-full">No active campaigns found in the global registry.</p>
        ) : (
          campaigns.map(camp => (
            <div key={camp.id} className="group bg-slate-800/50 border border-white/5 rounded-[2rem] overflow-hidden hover:border-blue-500/30 transition-all hover:-translate-y-1 shadow-xl flex flex-col">
              {/* Image Header */}
              <div className="h-48 relative overflow-hidden bg-slate-900">
                <img src={camp.document_url || "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800"} alt={camp.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-60" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
                <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <ShieldCheck size={12} className="text-emerald-400" />
                  <span className="text-[9px] font-black text-white uppercase tracking-widest">{camp.campaign_status}</span>
                </div>
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                  <div>
                    <h3 className="text-xl font-black text-white drop-shadow-lg">{camp.title}</h3>
                    <p className="text-xs text-slate-300 font-medium flex items-center gap-1 mt-1"><MapPin size={12}/> {camp.location || 'Global'}</p>
                  </div>
                </div>
              </div>
              {/* Body */}
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold flex items-center gap-1.5"><Briefcase size={12}/> {camp.sector || 'Technology'}</p>
                </div>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-end">
                    <p className="text-xs text-slate-400 font-medium">Target Raise</p>
                    <p className="text-lg text-white font-black">{formatCurrency(camp.target_amount)}</p>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(((camp.raised_amount || 0) / camp.target_amount) * 100, 100)}%` }}></div>
                  </div>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <p>{formatCurrency(camp.raised_amount)} Committed</p>
                    <p>{Math.round(((camp.raised_amount || 0) / camp.target_amount) * 100)}%</p>
                  </div>
                </div>
                
                {/* Action Button */}
                <button onClick={() => handleCommitCapital(camp.id, 50000)} className="mt-auto w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-black text-white uppercase tracking-widest transition-colors">
                  Commit $50k to Escrow
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // ==========================================
  // VIEW 2: THE FOUNDER COACHING TERMINAL
  // ==========================================
  const renderFounderView = () => {
    if (!myCampaign) {
      return (
        <div className="flex flex-col items-center justify-center p-12 bg-slate-900 border border-white/10 rounded-[2rem]">
          <Target size={48} className="text-slate-600 mb-4" />
          <h2 className="text-xl font-black text-white mb-2">No Active Campaign Found</h2>
          <p className="text-slate-400 text-sm mb-6">Initialize a new funding campaign to activate the IFB AI Sentinel.</p>
          <button className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-500 transition-colors">
            Initialize Campaign
          </button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
        
        {/* LEFT COLUMN: MILESTONES & ESCROW */}
        <div className="lg:col-span-2 space-y-6">
          {/* Campaign Hero */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-black text-white tracking-tight">{myCampaign.title}</h1>
                  <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{myCampaign.campaign_status}</span>
                </div>
                <p className="text-sm text-slate-400 font-medium flex items-center gap-2"><Target size={16}/> Series Seed Capital Raise</p>
              </div>
              <div className="text-left md:text-right bg-black/40 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Total Committed to Escrow</p>
                <p className="text-3xl font-black text-white">{formatCurrency(myCampaign.raised_amount)}</p>
                <p className="text-xs text-slate-500 font-medium mt-1">Target: {formatCurrency(myCampaign.target_amount)}</p>
              </div>
            </div>
          </div>

          {/* API Milestone Tracker */}
          <div className="bg-slate-900 border border-white/10 rounded-[2rem] p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-lg font-black text-white flex items-center gap-2"><Zap size={20} className="text-yellow-400"/> Automated Escrow Routing</h2>
              <button 
                onClick={fetchMarketplaceData}
                disabled={isSyncing} 
                className={`text-[10px] text-slate-400 hover:text-white uppercase tracking-widest font-black transition-colors flex items-center gap-1 ${isSyncing ? 'opacity-50' : ''}`}
              >
                <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} /> Refresh Ledger
              </button>
            </div>
            
            <div className="space-y-4">
              {milestones.length === 0 ? (
                <p className="text-slate-500 font-mono text-sm">No milestones configured for this campaign.</p>
              ) : (
                milestones.map((ms) => {
                  // Assuming a payout calculation based on percentage for UI display
                  const calculatedPayout = (ms.capital_release_pct / 100) * myCampaign.target_amount;
                  // For the sake of the UI demo, we simulate a 'current metric' if one isn't in DB
                  const mockCurrent = ms.status === 'Released' ? ms.target_api_metric : (ms.target_api_metric * 0.4);

                  return (
                    <div key={ms.id} className={`p-5 rounded-2xl border ${ms.status === 'Released' ? 'bg-emerald-500/5 border-emerald-500/20' : ms.status === 'Pending' ? 'bg-blue-500/5 border-blue-500/20' : 'bg-slate-800/50 border-white/5'} flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all`}>
                      <div className="flex items-start gap-4 w-full md:w-auto flex-1">
                        <div className={`mt-1 ${ms.status === 'Released' ? 'text-emerald-400' : ms.status === 'Pending' ? 'text-blue-400' : 'text-slate-600'}`}>
                          {ms.status === 'Released' ? <CheckCircle size={20} /> : <Lock size={20} />}
                        </div>
                        <div className="flex-1 w-full">
                          <p className={`text-sm font-black ${ms.status === 'Locked' ? 'text-slate-400' : 'text-white'}`}>{ms.title}</p>
                          
                          {/* Progress Bar for Pending/Locked */}
                          <div className="w-full max-w-xs h-1.5 bg-black/50 rounded-full overflow-hidden mt-3 mb-1">
                            <div className={`h-full rounded-full ${ms.status === 'Released' ? 'bg-emerald-400' : ms.status === 'Pending' ? 'bg-blue-400' : 'bg-slate-600'}`} style={{ width: `${Math.min((mockCurrent / ms.target_api_metric) * 100, 100)}%` }}></div>
                          </div>
                          <div className="flex justify-between max-w-xs items-center">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{mockCurrent >= ms.target_api_metric ? 'Target Met' : `${formatCurrency(mockCurrent)} / ${formatCurrency(ms.target_api_metric)} API Verified`}</p>
                            
                            {/* The Trigger Button for the Founder */}
                            {ms.status !== 'Released' && (
                              <button 
                                onClick={() => handleVerifyMilestone(ms.id, mockCurrent)}
                                className="text-[9px] bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded uppercase font-bold hover:bg-blue-600 hover:text-white transition-colors"
                              >
                                Trigger Verification
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-left md:text-right w-full md:w-auto bg-black/20 p-3 rounded-xl border border-white/5 shrink-0">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Tranche Payout</p>
                        <p className={`text-lg font-black ${ms.status === 'Released' ? 'text-emerald-400' : 'text-white'}`}>{formatCurrency(calculatedPayout)}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: AI ADVISORY TERMINAL */}
        <div className="bg-black border border-white/10 rounded-[2rem] p-6 shadow-2xl flex flex-col h-full min-h-[500px] relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>
          
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-white/10">
            <div className="bg-emerald-500/20 p-2 rounded-lg border border-emerald-500/30">
              <Cpu size={20} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-widest">Venture Intelligence</h2>
              <p className="text-[10px] text-emerald-400/70 font-mono flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span> SYSTEM ACTIVE
              </p>
            </div>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto hide-scrollbar">
            {coachingTracks.length === 0 ? (
               <p className="text-slate-500 font-mono text-xs text-center mt-10">Awaiting initial telemetry from AIVS...</p>
            ) : (
              coachingTracks.map((track) => (
                <div key={track.id} className="relative pl-4 border-l border-white/10">
                  <div className={`absolute -left-[5px] top-1.5 w-2 h-2 rounded-full ${track.action_required ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-emerald-500'}`}></div>
                  <p className="text-[9px] font-mono text-slate-500 mb-2">{new Date(track.created_at).toLocaleString()}</p>
                  <div className={`p-4 rounded-xl font-mono text-xs leading-relaxed border ${track.action_required ? 'bg-red-500/10 border-red-500/30 text-red-100' : 'bg-white/5 border-white/10 text-slate-300'}`}>
                    {track.ai_directive}
                  </div>
                  {track.action_required && (
                    <button className="mt-3 text-[10px] font-black text-red-400 hover:text-red-300 uppercase tracking-widest flex items-center gap-1 transition-colors">
                      Acknowledge Directive <ArrowRight size={10} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8">
      {/* Dev Toggle - Remove in Production if bound to user role */}
      <div className="flex justify-center mb-8">
        <div className="bg-black/40 backdrop-blur-md p-1 rounded-full border border-white/10 flex">
          <button onClick={() => setViewMode('INVESTOR')} className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'INVESTOR' ? 'bg-white text-black' : 'text-slate-400 hover:text-white'}`}>Capital Market</button>
          <button onClick={() => setViewMode('FOUNDER')} className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'FOUNDER' ? 'bg-white text-black' : 'text-slate-400 hover:text-white'}`}>Founder Hub</button>
        </div>
      </div>

      {viewMode === 'INVESTOR' ? renderInvestorView() : renderFounderView()}
    </div>
  );
}