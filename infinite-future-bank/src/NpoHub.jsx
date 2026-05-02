/**
 * NpoHub — Global Impact Engine & Humanitarian Funding Infrastructure
 * Sustainable non-profits through Enterprise optimization & Academy cohorts.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './services/supabaseClient';
import {
  HeartHandshake, ShieldCheck, Link as LinkIcon, Loader2, Copy,
  CheckCircle2, Search, ArrowRight, Globe2, BrainCircuit,
  XCircle, ChevronRight, Building2, Users, AlertTriangle, Network,
  RefreshCw, Sparkles, Rocket, BookOpen, BarChart3, Activity,
  Database, FileText, Landmark, PieChart, GraduationCap, Upload, Zap
} from 'lucide-react';

const safeParseAmounts = (v) => {
  if (!v) return [10, 50, 100];
  if (Array.isArray(v)) return v;
  try { return JSON.parse(v); } catch { return [10, 50, 100]; }
};

const TIERS = {
  EMERGING: 'Emerging_Academy',
  CLUSTER: 'Cluster_Partner',
  ENTERPRISE: 'Enterprise_NGO',
  STRATEGIC: 'Strategic_Global'
};

const SECTORS = ['Education', 'Health', 'Environment', 'Disaster Relief', 'Poverty Alleviation', 'Human Rights', 'Arts & Culture', 'Technology', 'Women Empowerment', 'Child Welfare', 'Circular Economy', 'Infrastructure', 'Other'];

export default function NpoHub({ session }) {
  const [viewTab, setViewTab] = useState('EXPLORE');
  const [isAdmin, setIsAdmin] = useState(false);
  const [npoData, setNpoData] = useState(null);
  const [verifiedNpos, setVerifiedNpos] = useState([]);
  const [allNpos, setAllNpos] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [impactReports, setImpactReports] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState('');
  const showError = (msg) => { setErr(msg); setTimeout(()=>setErr(''), 5000); };

  // Form States
  const [applyForm, setApplyForm] = useState({ name: '', taxId: '', mission: '', sector: '', country: '', website: '', founded_year: '', target_tier: TIERS.EMERGING });
  const [isApplying, setIsApplying] = useState(false);
  const [liveAiStatus, setLiveAiStatus] = useState('');
  const [impactForm, setImpactReportsForm] = useState({ title: '', summary: '', metrics: {}, file: null });

  // Social Feed States
  const [feedPosts, setFeedPosts] = useState([]);
  const [followingMap, setFollowingMap] = useState({});
  const [postForm, setPostForm] = useState({ content: '', file: null, fileType: '' });
  const [isPosting, setIsPosting] = useState(false);
  const [myLikeValue, setMyLikeValue] = useState(0);
  const [showSpecialLike, setShowSpecialLike] = useState(null);
  const [specialAmount, setSpecialAmount] = useState(10);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    const uid = session?.user?.id;
    
    try {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', uid).single();
      const userIsAdmin = ['support_l1', 'advisor_l2', 'admin_l3'].includes(profile?.role);
      setIsAdmin(userIsAdmin);

      const results = await Promise.all([
        uid ? supabase.from('npo_profiles').select('*').eq('id', uid).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from('npo_profiles').select('*').in('program_tier', [TIERS.CLUSTER, TIERS.ENTERPRISE, TIERS.STRATEGIC]).order('total_raised', { ascending: false }),
        supabase.from('npo_cohorts').select('*').eq('status', 'active'),
        uid ? supabase.from('npo_impact_reports').select('*').eq('npo_id', uid).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
        supabase.from('social_feed_view').select('*').order('created_at', { ascending: false }),
        uid ? supabase.from('social_follows').select('following_id').eq('follower_id', uid) : Promise.resolve({ data: [] }),
        uid ? supabase.from('profiles').select('default_like_value').eq('id', uid).single() : Promise.resolve({ data: null })
      ]);

      const [myNpo, publicNpos, myCohorts, myReports, socialData, followsData, myProf] = results;

      if (myNpo?.data) {
        setNpoData(myNpo.data);
      }
      if (publicNpos?.data) setVerifiedNpos(publicNpos.data);
      if (myCohorts?.data) setCohorts(myCohorts.data);
      if (myReports?.data) setImpactReports(myReports.data);
      if (socialData?.data) setFeedPosts(socialData.data);
      if (myProf?.data) setMyLikeValue(myProf.data.default_like_value || 0);
      
      if (followsData?.data) {
        const map = {};
        followsData.data.forEach(f => { map[f.following_id] = true; });
        setFollowingMap(map);
      }

      if (userIsAdmin) {
        const { data: fullList } = await supabase.from('npo_profiles').select('*').order('created_at', { ascending: false });
        setAllNpos(fullList || []);
      }
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Social Feed Handlers ─────────────────────────────────────────────
  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!postForm.content) return;
    setIsPosting(true);
    let mediaUrls = [];
    let mediaTypes = [];
    if (postForm.file) {
       mediaUrls = ['https://ifb-cdn.local/' + postForm.file.name];
       mediaTypes = [postForm.fileType];
    }
    const { error } = await supabase.from('social_posts').insert([{
      author_id: session.user.id,
      content: postForm.content,
      media_urls: mediaUrls,
      media_types: mediaTypes
    }]);
    if (error) showError(error.message);
    else {
      setPostForm({ content: '', file: null, fileType: '' });
      fetchAll();
    }
    setIsPosting(false);
  };

  const toggleFollow = async (targetUserId) => {
    if (!targetUserId || targetUserId === session.user.id) return;
    if (followingMap[targetUserId]) {
      await supabase.from('social_follows').delete().eq('follower_id', session.user.id).eq('following_id', targetUserId);
      setFollowingMap(prev => { const n = {...prev}; delete n[targetUserId]; return n; });
    } else {
      await supabase.from('social_follows').insert([{ follower_id: session.user.id, following_id: targetUserId }]);
      setFollowingMap(prev => ({ ...prev, [targetUserId]: true }));
    }
  };

  const handleLike = async (postId, type = 'like', customAmount = null) => {
    try {
      const { data, error } = await supabase.rpc('process_monetized_interaction', {
        p_post_id: postId,
        p_user_id: session.user.id,
        p_interaction_type: customAmount ? 'special' : type,
        p_custom_amount: customAmount
      });

      if (error) throw error;
      if (data?.ok) {
        if (data.amount > 0) showError(`Support Transferred! You sent $${data.amount.toFixed(2)}.`);
        fetchAll();
        setShowSpecialLike(null);
      } else {
        showError(data?.error || 'Interaction failed.');
      }
    } catch (err) {
      showError(err.message);
    }
  };

  const updateLikeValue = async (val) => {
    setMyLikeValue(val);
    const { error } = await supabase.from('profiles').update({ default_like_value: val }).eq('id', session.user.id);
    if (error) showError(error.message);
  };

  const handleApply = async (e) => {
    e.preventDefault();
    setIsApplying(true);
    setLiveAiStatus('Extracting values from NGO Charter...');

    try {
      const { error: dbError } = await supabase.from('npo_profiles').upsert({
        id: session.user.id,
        npo_name: applyForm.name,
        tax_id: applyForm.taxId,
        mission_statement: applyForm.mission,
        sector: applyForm.sector,
        country: applyForm.country,
        website: applyForm.website,
        founded_year: applyForm.founded_year,
        program_tier: 'Pending_AI_Review',
        verification_status: 'pending_review',
        live_ai_status: 'IFB Sovereign Compliance Online...'
      });

      if (dbError) throw dbError;

      // Simulate AI Tier Assignment based on intent
      setLiveAiStatus('Verifying Financial Sustainability Model...');
      await new Promise(r => setTimeout(r, 2000));
      
      const isEnterprise = applyForm.target_tier === TIERS.ENTERPRISE;
      const assignedTier = isEnterprise ? TIERS.ENTERPRISE : TIERS.EMERGING;
      
      await supabase.from('npo_profiles').update({
        program_tier: assignedTier,
        verification_status: 'verified',
        live_ai_status: assignedTier === TIERS.ENTERPRISE ? '✓ ENTERPRISE STATUS GRANTED — Financial Optimization Tools Unlocked' : '✓ ACADEMY ENROLLMENT COMPLETE — Cohort Assigned'
      }).eq('id', session.user.id);

      fetchAll();
    } catch (err) {
      setErr(err.message);
    } finally {
      setIsApplying(false);
    }
  };

  const notarizeImpact = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { error } = await supabase.from('npo_impact_reports').insert([{
        npo_id: npoData.id,
        title: impactForm.title,
        summary: impactForm.summary,
        data_points: impactForm.metrics,
        file_hash: 'notary_' + Math.random().toString(36).slice(2, 10) // Placeholder for actual SHA-256
      }]);
      if (error) throw error;
      setImpactReportsForm({ title: '', summary: '', metrics: {}, file: null });
      fetchAll();
    } catch (err) { setErr(err.message); }
    finally { setIsSaving(false); }
  };

  if (isLoading) return <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-500 mb-4" size={40} /><p className="font-black text-[10px] uppercase tracking-widest text-slate-500">Syncing Global Impact Network...</p></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20 relative">
      
      {err && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[1000] bg-red-900 text-red-100 px-6 py-3 rounded-full shadow-2xl font-black text-xs flex items-center gap-2">
          <AlertTriangle size={14}/> {err}
        </div>
      )}

      {/* 🏛️ INSTITUTIONAL HEADER */}
      <div className="bg-white border border-slate-200 p-8 rounded-[3rem] shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <HeartHandshake className="text-blue-600" size={24}/>
             <h2 className="text-3xl font-black text-slate-800 tracking-tighter">IFB Global Impact Engine</h2>
          </div>
          <p className="text-sm font-medium text-slate-500">Bridges social impact with robust institutional capital models.</p>
        </div>
        <div className="flex gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
           {['EXPLORE','UPDATES','MANAGE', isAdmin && 'COMMAND'].filter(Boolean).map(t => (
             <button key={t} onClick={()=>setViewTab(t)}
               className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewTab === t ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800 hover:bg-white'}`}>
               {t}
             </button>
           ))}
        </div>
      </div>

      {/* ================================================================= */}
      {/* SOCIAL FEED / UPDATES */}
      {/* ================================================================= */}
      {viewTab === 'UPDATES' && (
        <div className="space-y-8 animate-in fade-in max-w-3xl mx-auto">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">Global Updates</h2>
              <p className="text-sm font-medium text-slate-500 mt-1">Follow NPOs, companies, and investors to receive their latest news.</p>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
               <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Your Reaction Value</p>
               <div className="flex items-center gap-2">
                 <span className="font-black text-sm text-slate-800">$</span>
                 <input type="number" step="0.5" className="w-16 bg-slate-50 border border-slate-100 rounded-lg p-1 font-black text-sm outline-none" value={myLikeValue} onChange={e => updateLikeValue(+e.target.value)}/>
               </div>
            </div>
          </div>

          {/* Create Post */}
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-sm">
            <form onSubmit={handlePostSubmit}>
              <textarea 
                required 
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-bold text-sm outline-none focus:border-blue-500 resize-none h-24 mb-4" 
                placeholder="Share a milestone, post a video update, or announce a new program..."
                value={postForm.content} 
                onChange={e => setPostForm(p => ({...p, content: e.target.value}))}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer text-slate-400 hover:text-blue-600 transition-colors flex items-center gap-1">
                    <input type="file" className="hidden" accept="image/*,video/*" onChange={e => {
                      const file = e.target.files[0];
                      if(file) setPostForm(p => ({...p, file, fileType: file.type.startsWith('video') ? 'video' : 'image'}));
                    }}/>
                    <Upload size={18}/> <span className="text-[10px] font-black uppercase tracking-widest">{postForm.file ? 'Media Attached' : 'Attach Media'}</span>
                  </label>
                </div>
                <button type="submit" disabled={isPosting} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 disabled:opacity-50 shadow-md">
                  {isPosting ? <Loader2 size={14} className="animate-spin"/> : 'Publish Update'}
                </button>
              </div>
            </form>
          </div>

          {/* Feed List */}
          <div className="space-y-6">
            {feedPosts.filter(post => followingMap[post.author_id] || post.author_id === session?.user?.id).length === 0 ? (
              <div className="text-center py-16 bg-slate-50 border border-slate-200 rounded-[2.5rem]">
                <Activity size={40} className="mx-auto text-slate-300 mb-4"/>
                <p className="text-slate-500 font-bold">Your feed is empty.</p>
                <p className="text-xs text-slate-400 mt-1">Follow organizations to see their updates here.</p>
              </div>
            ) : (
              feedPosts.filter(post => followingMap[post.author_id] || post.author_id === session?.user?.id).map(post => (
                <div key={post.id} className="bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-black">{post.author_name.charAt(0)}</div>
                      <div>
                        <p className="font-black text-slate-800 leading-tight">{post.author_name}</p>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{post.author_role} • {new Date(post.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-slate-600 font-medium mb-4 whitespace-pre-wrap">{post.content}</p>
                  
                  {post.media_urls && post.media_urls.length > 0 && (
                    <div className="mb-4 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
                      {post.media_types[0] === 'video' ? (
                        <div className="aspect-video bg-slate-900 flex items-center justify-center text-white"><span className="text-xs font-black tracking-widest uppercase">Video Player (Simulated)</span></div>
                      ) : (
                        <div className="aspect-video bg-slate-200 flex items-center justify-center text-slate-400"><span className="text-xs font-black tracking-widest uppercase">Image Attachment (Simulated)</span></div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-6 border-t border-slate-50 pt-4">
                    <button onClick={() => handleLike(post.id, 'like')} className="flex items-center gap-1 text-slate-400 hover:text-blue-600 transition-colors group">
                      <HeartHandshake size={18}/> 
                      <div className="flex flex-col items-start">
                        <span className="text-xs font-black">{post.like_count}</span>
                        <span className="text-[8px] font-bold uppercase text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">Cost: ${myLikeValue}</span>
                      </div>
                    </button>

                    <button onClick={() => setShowSpecialLike(post.id)} className="flex items-center gap-1 text-emerald-600 hover:text-emerald-500 transition-colors">
                      <Zap size={18}/> <span className="text-[10px] font-black uppercase tracking-widest">Special Like</span>
                    </button>

                    <div className="ml-auto text-right">
                       <p className="text-[9px] font-black uppercase text-slate-400">Raised via Post</p>
                       <p className="text-sm font-black text-emerald-600">${Number(post.total_revenue).toLocaleString()}</p>
                    </div>
                  </div>

                  {showSpecialLike === post.id && (
                    <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between animate-in zoom-in-95">
                       <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-emerald-800">Support Amount:</span>
                          <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl border border-emerald-200">
                             <span className="font-black text-emerald-600">$</span>
                             <input type="number" className="w-16 bg-transparent font-black text-sm outline-none text-emerald-800" value={specialAmount} onChange={e=>setSpecialAmount(+e.target.value)}/>
                          </div>
                       </div>
                       <button onClick={() => handleLike(post.id, 'special', specialAmount)} className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 shadow-md">Deploy Support</button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* EXPLORE CAUSES */}
      {/* ================================================================= */}
      {viewTab === 'EXPLORE' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {verifiedNpos.map(npo => (
                <div key={npo.id} className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl transition-all group relative">
                   <div className="absolute top-6 right-6">
                     <button onClick={() => toggleFollow(npo.id)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-colors ${followingMap[npo.id] ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>
                       {followingMap[npo.id] ? 'Following' : 'Follow'}
                     </button>
                   </div>
                   <div className="flex justify-between items-start mb-6">
                      <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Rocket size={24}/>
                      </div>
                   </div>
                   <div>
                     <div className="flex items-center gap-1 text-[9px] font-black uppercase text-emerald-500 tracking-widest mb-1">
                       <ShieldCheck size={10}/> Verified {npo.program_tier.replace('_',' ')}
                     </div>
                     <p className="text-lg font-black text-slate-800 mb-4">{npo.npo_name}</p>
                   </div>
                   <p className="text-sm text-slate-600 font-medium mb-8 line-clamp-3">"{npo.mission_statement}"</p>
                   
                   <div className="space-y-4 mb-8">
                      <div className="flex justify-between items-end border-b border-slate-50 pb-2">
                         <span className="text-[10px] font-black uppercase text-slate-400">Impact Transparency</span>
                         <span className="text-sm font-black text-slate-800">{npo.transparency_score}%</span>
                      </div>
                      <div className="flex justify-between items-end border-b border-slate-50 pb-2">
                         <span className="text-[10px] font-black uppercase text-slate-400">Global Flow</span>
                         <span className="text-sm font-black text-blue-600">${Number(npo.total_raised).toLocaleString()}</span>
                      </div>
                   </div>

                   <button className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 shadow-lg">
                     Deploy Capital <ArrowRight size={14}/>
                   </button>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MANAGE MY ORGANIZATION */}
      {/* ================================================================= */}
      {viewTab === 'MANAGE' && (
        <div className="animate-in slide-in-from-bottom-4">
           {!npoData ? (
             <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-center space-y-4">
                   <h3 className="text-4xl font-black text-slate-800 tracking-tighter">Transition to Sustainable Impact</h3>
                   <p className="text-slate-500 max-w-xl mx-auto font-medium">Select your organizational track to begin Smart Onboarding.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   {/* Track 1: Academy */}
                   <div onClick={()=>setApplyForm(p=>({...p, target_tier: TIERS.EMERGING}))} 
                     className={`p-10 rounded-[3rem] border-4 cursor-pointer transition-all ${applyForm.target_tier === TIERS.EMERGING ? 'border-blue-600 bg-blue-50/50 shadow-xl' : 'border-slate-100 bg-white hover:border-blue-200'}`}>
                      <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg"><BookOpen size={32}/></div>
                      <h4 className="text-2xl font-black text-slate-800 mb-2">Emerging NGO Academy</h4>
                      <p className="text-sm text-slate-500 leading-relaxed font-medium mb-6">Designed for local community groups. Get structural guidance, cohort collaboration, and micro-funding access.</p>
                      <ul className="space-y-2">
                        {['Collaborative Cohorts', 'Structural Mentorship', 'Micro-Grant Network'].map(i => <li key={i} className="text-[10px] font-black uppercase text-blue-700 flex items-center gap-2"><CheckCircle2 size={12}/> {i}</li>)}
                      </ul>
                   </div>

                   {/* Track 2: Enterprise */}
                   <div onClick={()=>setApplyForm(p=>({...p, target_tier: TIERS.ENTERPRISE}))} 
                     className={`p-10 rounded-[3rem] border-4 cursor-pointer transition-all ${applyForm.target_tier === TIERS.ENTERPRISE ? 'border-indigo-600 bg-indigo-50/50 shadow-xl' : 'border-slate-100 bg-white hover:border-indigo-200'}`}>
                      <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg"><Building2 size={32}/></div>
                      <h4 className="text-2xl font-black text-slate-800 mb-2">Enterprise NGO Hub</h4>
                      <p className="text-sm text-slate-500 leading-relaxed font-medium mb-6">For large organizations requiring institutional financial architecture, scaling loans, and self-sustaining models.</p>
                      <ul className="space-y-2">
                        {['Financial Architecture', 'Institutional Scaling Loans', 'Sovereign Compliance'].map(i => <li key={i} className="text-[10px] font-black uppercase text-indigo-700 flex items-center gap-2"><CheckCircle2 size={12}/> {i}</li>)}
                      </ul>
                   </div>
                </div>

                <form onSubmit={handleApply} className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-sm space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Legal Org Name</label>
                      <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-blue-500" value={applyForm.name} onChange={e=>setApplyForm({...applyForm, name: e.target.value})} placeholder="e.g., Global Green Infrastructure"/>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tax / Registration ID</label>
                      <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-blue-500" value={applyForm.taxId} onChange={e=>setApplyForm({...applyForm, taxId: e.target.value})} placeholder="EIN or Gov ID"/>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Primary Sector</label>
                      <select required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-blue-500" value={applyForm.sector} onChange={e=>setApplyForm({...applyForm, sector: e.target.value})}>
                        <option value="">Select Sector</option>
                        {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Operating Region</label>
                      <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-blue-500" value={applyForm.country} onChange={e=>setApplyForm({...applyForm, country: e.target.value})} placeholder="e.g., Sub-Saharan Africa"/>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mission & Program Proposal</label>
                    <textarea required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-blue-500 h-32" value={applyForm.mission} onChange={e=>setApplyForm({...applyForm, mission: e.target.value})} placeholder="Describe your community program and how it survives leadership dry spells..."/>
                  </div>

                  <div className="p-6 bg-blue-50 border-2 border-dashed border-blue-200 rounded-3xl text-center group hover:bg-blue-100 transition-colors cursor-pointer">
                    <Upload size={32} className="mx-auto text-blue-500 mb-2 group-hover:scale-110 transition-transform"/>
                    <p className="font-black text-[10px] uppercase tracking-widest text-blue-700">Drag & Drop NGO Charter / Financials</p>
                    <p className="text-[9px] text-blue-400 font-bold mt-1">PDF, DOCX, or Excel files accepted for AI Extraction</p>
                  </div>

                  {isApplying ? (
                    <div className="p-6 bg-slate-900 rounded-2xl text-emerald-400 font-mono text-xs flex items-center gap-3">
                      <Loader2 size={16} className="animate-spin"/>
                      <span className="animate-pulse">{liveAiStatus}</span>
                    </div>
                  ) : (
                    <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl flex items-center justify-center gap-3">
                      <Sparkles size={16}/> Activate Smart Onboarding
                    </button>
                  )}
                </form>
             </div>
           ) : (
             <div className="space-y-8">
                {/* NGO DASHBOARD */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                   {/* Left: Info Card */}
                   <div className="lg:col-span-2 space-y-8">
                      <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-xl relative overflow-hidden">
                         <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
                         <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-2">
                               <h3 className="text-4xl font-black tracking-tight">{npoData.npo_name}</h3>
                               <ShieldCheck className="text-emerald-400" size={24}/>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-8">
                               <span className="px-2 py-1 bg-white/10 text-white text-[9px] font-black uppercase tracking-widest rounded-lg border border-white/10">{npoData.program_tier.replace('_',' ')}</span>
                               <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-[9px] font-black uppercase tracking-widest rounded-lg border border-blue-500/20">{npoData.sector}</span>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                               <div><p className="text-[10px] font-black uppercase text-slate-500 mb-1">Total Impact Capital</p><p className="text-2xl font-black">${Number(npoData.total_raised).toLocaleString()}</p></div>
                               <div><p className="text-[10px] font-black uppercase text-slate-500 mb-1">Network Float</p><p className="text-2xl font-black">${Number(npoData.current_float_usd).toLocaleString()}</p></div>
                               <div><p className="text-[10px] font-black uppercase text-slate-500 mb-1">Transparency Score</p><p className="text-2xl font-black text-emerald-400">{npoData.transparency_score}%</p></div>
                            </div>
                         </div>
                      </div>

                      {/* TIER SPECIFIC ACTIONS */}
                      {npoData.program_tier === TIERS.EMERGING && (
                         <div className="bg-white border border-slate-200 p-8 rounded-[3rem] shadow-sm">
                            <h4 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-6 flex items-center gap-2"><GraduationCap className="text-blue-600"/> Academy Cohort Management</h4>
                            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 flex justify-between items-center">
                               <div>
                                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Current Cohort</p>
                                  <p className="font-black text-slate-800">Q2 Masterclass: Sustainable Food Systems</p>
                               </div>
                               <button className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 shadow-md">Enter Classroom</button>
                            </div>
                         </div>
                      )}

                      {npoData.program_tier === TIERS.ENTERPRISE && (
                         <div className="bg-white border border-slate-200 p-8 rounded-[3rem] shadow-sm">
                            <h4 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-6 flex items-center gap-2"><Zap className="text-indigo-600"/> Institutional Scaling Tools</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <div className="p-6 bg-slate-900 text-white rounded-3xl">
                                  <Landmark className="text-indigo-400 mb-4" size={24}/>
                                  <h5 className="font-black text-lg mb-1">Scaling Loan Eligibility</h5>
                                  <p className="text-xs text-slate-400 mb-4">Request capital to transition to a self-sustaining model.</p>
                                  <button className="w-full py-3 bg-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest">Review Terms</button>
                               </div>
                               <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl">
                                  <BarChart3 className="text-slate-400 mb-4" size={24}/>
                                  <h5 className="font-black text-lg text-slate-800 mb-1">Financial Architecture</h5>
                                  <p className="text-xs text-slate-500 mb-4">Optimization tools for cross-border currency conversion.</p>
                                  <button className="w-full py-3 border border-slate-300 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-600">Open Analytics</button>
                               </div>
                            </div>
                         </div>
                      )}
                   </div>

                   {/* Right: Impact Notary */}
                   <div className="space-y-8">
                      <div className="bg-white border border-slate-200 p-8 rounded-[3rem] shadow-sm">
                         <h4 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-6 flex items-center gap-2"><ShieldCheck className="text-emerald-500"/> Notarize Impact</h4>
                         <form onSubmit={notarizeImpact} className="space-y-4">
                            <div className="space-y-1">
                               <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Report Title</label>
                               <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-xs" value={impactForm.title} onChange={e=>setImpactReportsForm({...impactForm, title: e.target.value})} placeholder="e.g., 500 Books Distributed"/>
                            </div>
                            <div className="space-y-1">
                               <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Impact Units</label>
                               <input className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-xs" onChange={e=>setImpactReportsForm({...impactForm, metrics: { units: e.target.value }})} placeholder="e.g., 500"/>
                            </div>
                            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-center">
                               <p className="text-[9px] font-bold text-emerald-800 mb-2">Immutable Verification Required</p>
                               <button type="submit" disabled={isSaving} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 shadow-sm flex items-center justify-center gap-2">
                                  {isSaving ? <Loader2 size={12} className="animate-spin"/> : <><Network size={12}/> Sign & Notarize</>}
                               </button>
                            </div>
                         </form>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 p-8 rounded-[3rem]">
                         <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Verifiable Ledger</h4>
                         <div className="space-y-4 max-h-64 overflow-y-auto no-scrollbar">
                            {impactReports.map(report => (
                               <div key={report.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                                  <ShieldCheck size={14} className="absolute top-2 right-2 text-emerald-400 opacity-20 group-hover:opacity-100 transition-opacity"/>
                                  <p className="font-black text-xs text-slate-800">{report.title}</p>
                                  <p className="text-[9px] font-mono text-slate-400 truncate mt-1">SIG: {report.chain_tx_hash}</p>
                                  <p className="text-[8px] font-black uppercase text-slate-300 mt-2">{new Date(report.created_at).toLocaleDateString()}</p>
                               </div>
                            ))}
                         </div>
                      </div>
                   </div>
                </div>
             </div>
           )}
        </div>
      )}

      {/* ================================================================= */}
      {/* COMMAND DASHBOARD */}
      {/* ================================================================= */}
      {viewTab === 'COMMAND' && isAdmin && (
        <div className="animate-in fade-in space-y-8">
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total NGO Flow', value: `$${allNpos.reduce((s,n)=>s+Number(n.total_raised||0),0).toLocaleString()}`, color: 'text-blue-600' },
                { label: 'Network Float', value: `$${allNpos.reduce((s,n)=>s+Number(n.current_float_usd||0),0).toLocaleString()}`, color: 'text-indigo-600' },
                { label: 'Academy Members', value: allNpos.filter(n=>n.program_tier===TIERS.EMERGING).length, color: 'text-amber-600' },
                { label: 'Verified Partners', value: allNpos.filter(n=>[TIERS.CLUSTER, TIERS.ENTERPRISE].includes(n.program_tier)).length, color: 'text-emerald-600' }
              ].map(card => (
                <div key={card.label} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm text-center">
                   <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{card.label}</p>
                   <p className={`text-3xl font-black ${card.color}`}>{card.value}</p>
                </div>
              ))}
           </div>

           <div className="bg-white border border-slate-200 rounded-[3rem] shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                   <tr>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Organization</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Track</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Country</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Raised</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Actions</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                   {allNpos.map(npo => (
                     <tr key={npo.id}>
                        <td className="px-6 py-4 font-black text-slate-800">{npo.npo_name}</td>
                        <td className="px-6 py-4">
                           <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                             npo.program_tier === TIERS.EMERGING ? 'bg-amber-50 text-amber-600 border-amber-100' :
                             npo.program_tier === TIERS.ENTERPRISE ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                             'bg-emerald-50 text-emerald-600 border-emerald-100'
                           }`}>{npo.program_tier.replace('_',' ')}</span>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-500">{npo.country}</td>
                        <td className="px-6 py-4 font-black text-slate-800">${Number(npo.total_raised).toLocaleString()}</td>
                        <td className="px-6 py-4">
                           <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><ChevronRight size={18}/></button>
                        </td>
                     </tr>
                   ))}
                </tbody>
              </table>
           </div>
        </div>
      )}

    </div>
  );
}
