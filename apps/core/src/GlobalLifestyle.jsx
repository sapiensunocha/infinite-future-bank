import { useState, useEffect, useRef } from 'react';
import { supabase } from './services/supabaseClient';
import { 
  Plane, Wifi, ShieldPlus, Gift, 
  Coffee, Compass, HeartHandshake, Gem,
  ArrowRight, ChevronRight, TicketPercent,
  Briefcase, Plus, Search, FileText, Loader2, X, Target
} from 'lucide-react';

export default function GlobalLifestyle({ session, profile, balances }) {
  const [activePortal, setActivePortal] = useState('TRAVEL'); // TRAVEL, LIFESTYLE, CONCIERGE, RAISE
  
  // States for Capital Raise Feature
  const [campaigns, setCampaigns] = useState([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [supportCampaign, setSupportCampaign] = useState(null); // Holds the campaign object being supported
  const [supportAmount, setSupportAmount] = useState('');
  
  // Creation Form State
  const [campaignForm, setCampaignForm] = useState({ title: '', description: '', targetAmount: '' });
  const [campaignDoc, setCampaignDoc] = useState(null);
  const docInputRef = useRef(null);

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
  const ifbCardId = profile?.id ? `IFB-${profile.id.split('-')[0].toUpperCase()}` : 'IFB-PENDING';

  // --- REQUIREMENT: GLOBAL NOTIFICATION RULE ---
  const triggerGlobalActionNotification = (type, message) => {
    setNotification({ type, text: message });
    console.log(`System Event: ${message}. Dispatching In-App Alert and Email to ${session?.user?.email}`);
    setTimeout(() => setNotification(null), 6000);
  };

  // --- FETCH REAL OPPORTUNITIES ---
  const fetchCampaigns = async () => {
    setIsLoadingCampaigns(true);
    try {
      const { data, error } = await supabase
        .from('funding_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCampaigns(data || []);
    } catch (err) {
      console.error("Failed to load opportunities", err);
    } finally {
      setIsLoadingCampaigns(false);
    }
  };

  useEffect(() => {
    if (activePortal === 'RAISE') {
      fetchCampaigns();
    }
  }, [activePortal]);

  // --- CREATE NEW RAISE / OPPORTUNITY ---
  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    if (!campaignForm.title || !campaignForm.targetAmount) return;
    setIsLoading(true);

    try {
      let documentUrl = null;
      
      // 1. Upload Prospectus/Document if provided
      if (campaignDoc) {
        const filePath = `${session.user.id}/campaign_${Date.now()}`;
        const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, campaignDoc);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath);
        documentUrl = publicUrl;
      }

      // 2. Insert Campaign into Database
      const { error: dbError } = await supabase.from('funding_campaigns').insert([{
        user_id: session.user.id,
        creator_name: profile?.full_name || session.user.email,
        creator_ifb_id: ifbCardId,
        title: campaignForm.title,
        description: campaignForm.description,
        target_amount: parseFloat(campaignForm.targetAmount),
        raised_amount: 0,
        document_url: documentUrl
      }]);

      if (dbError) throw dbError;

      triggerGlobalActionNotification('success', `Campaign '${campaignForm.title}' is now live on the global network.`);
      setShowCreateModal(false);
      setCampaignForm({ title: '', description: '', targetAmount: '' });
      setCampaignDoc(null);
      fetchCampaigns();

    } catch (err) {
      triggerGlobalActionNotification('error', `Failed to create campaign: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- SUPPORT / INVEST IN AN OPPORTUNITY ---
  const handleSupportCampaign = async (e) => {
    e.preventDefault();
    const amount = parseFloat(supportAmount);
    
    if (!amount || amount <= 0) return;
    if (amount > (balances?.liquid_usd || 0)) {
      triggerGlobalActionNotification('error', 'INSUFFICIENT LIQUIDITY: Funding Aborted.');
      return;
    }

    setIsLoading(true);
    try {
      // Calls a secure Supabase RPC to move money from liquid_usd to the campaign's raised_amount
      const { error } = await supabase.rpc('support_campaign', {
        p_user_id: session.user.id,
        p_campaign_id: supportCampaign.id,
        p_amount: amount
      });

      if (error) throw error;

      triggerGlobalActionNotification('success', `Successfully allocated ${formatCurrency(amount)} to ${supportCampaign.title}.`);
      setSupportCampaign(null);
      setSupportAmount('');
      fetchCampaigns(); // Refresh the progress bars
    } catch (err) {
      triggerGlobalActionNotification('error', err.message || "Failed to route funds.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 text-slate-800">
      
      {/* 🏛️ Top Header & Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white border border-slate-200 p-6 rounded-[2.5rem] shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Sovereign Lifestyle</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mt-1 flex items-center gap-2">
            <ShieldPlus size={12}/> Access ID: {ifbCardId}
          </p>
        </div>
        
        <div className="flex bg-slate-100 p-2 rounded-2xl border border-slate-200 shadow-inner w-full md:w-auto overflow-x-auto no-scrollbar">
          {[
            { id: 'TRAVEL', label: 'Global Travel' },
            { id: 'LIFESTYLE', label: 'Lifestyle & Perks' },
            { id: 'CONCIERGE', label: 'Private Concierge' },
            { id: 'RAISE', label: 'Opportunities' }
          ].map((portal) => (
            <button 
              key={portal.id}
              onClick={() => setActivePortal(portal.id)}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activePortal === portal.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}
            >
              {portal.label}
            </button>
          ))}
        </div>
      </div>

      {/* 📈 DYNAMIC PORTAL CONTENT */}

      {/* PORTAL 1: GLOBAL TRAVEL */}
      {activePortal === 'TRAVEL' && (
        <div className="space-y-8 animate-in slide-in-from-left-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-10 md:p-12 rounded-[3.5rem] shadow-xl border border-slate-700 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 group">
            <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-[80px] group-hover:bg-blue-500/30 transition-all pointer-events-none"></div>
            <div className="relative z-10 max-w-lg">
              <div className="w-14 h-14 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center text-blue-400 mb-6 shadow-sm"><Coffee size={28}/></div>
              <h3 className="text-3xl font-black tracking-tight mb-4 text-white">1,000+ Global Lounges</h3>
              <p className="text-[11px] font-bold text-slate-300 uppercase tracking-widest leading-relaxed mb-8">
                Bypass the terminal chaos. Your IFB identity grants you and a guest complimentary access to premium airport lounges worldwide.
              </p>
              <button onClick={() => triggerGlobalActionNotification('success', 'Lounge access QR generated.')} className="px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-blue-500 hover:-translate-y-1 transition-all flex items-center gap-2">
                Generate Access Pass <ArrowRight size={16}/>
              </button>
            </div>
            <div className="relative z-10 opacity-10 hidden md:block text-white"><Plane size={180}/></div>
          </div>
          {/* Rest of Travel Portal... */}
        </div>
      )}

      {/* PORTAL 2: LIFESTYLE & PERKS */}
      {activePortal === 'LIFESTYLE' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-left-4">
          <div className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-sm group hover:border-blue-200 transition-colors">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-8"><Wifi size={28}/></div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Global Data eSIM</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed mb-8">Never pay roaming fees again. High-speed connectivity in over 150 countries.</p>
            <button onClick={() => triggerGlobalActionNotification('success', 'eSIM installation profile sent to device.')} className="w-full py-4 bg-slate-50 border border-slate-200 text-blue-600 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:bg-slate-100 transition-colors">Install Profile</button>
          </div>
        </div>
      )}

      {/* PORTAL 3: CONCIERGE */}
      {activePortal === 'CONCIERGE' && (
        <div className="bg-gradient-to-b from-slate-50 to-white border border-slate-200 p-12 rounded-[3.5rem] shadow-sm relative overflow-hidden animate-in slide-in-from-left-4 text-center">
           <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-50 blur-[80px] pointer-events-none"></div>
           <div className="relative z-10 max-w-2xl mx-auto space-y-8">
              <div className="w-24 h-24 bg-white border border-indigo-100 rounded-full flex items-center justify-center text-indigo-500 mx-auto shadow-sm"><Gem size={40}/></div>
              <div>
                <h3 className="text-3xl font-black text-slate-800 tracking-tight mb-4">Your Private Concierge</h3>
                <p className="text-sm font-medium text-slate-500 leading-relaxed">Connect instantly with our dedicated global lifestyle managers. Available 24/7 for IFB members.</p>
              </div>
              <button onClick={() => triggerGlobalActionNotification('success', 'Secure connection established with Concierge Desk.')} className="w-full py-6 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg hover:bg-slate-800 hover:-translate-y-1 transition-all active:scale-95">
                Initiate Secure Request
              </button>
           </div>
        </div>
      )}

      {/* PORTAL 4: OPPORTUNITIES & RAISING (NEW) */}
      {activePortal === 'RAISE' && (
        <div className="space-y-8 animate-in slide-in-from-left-4">
          <div className="flex justify-between items-end px-2">
            <div>
              <h3 className="text-lg font-black uppercase tracking-widest text-slate-800 flex items-center gap-3">Global Opportunities</h3>
              <p className="text-xs font-bold text-slate-500 mt-1">Invest in projects or raise capital using your IFB Identity.</p>
            </div>
            <button onClick={() => setShowCreateModal(true)} className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-blue-700 transition-all flex items-center gap-2">
              <Plus size={14}/> Start a Raise
            </button>
          </div>

          {isLoadingCampaigns ? (
            <div className="py-20 text-center text-slate-400 flex flex-col items-center">
              <Loader2 className="animate-spin mb-4" size={32}/>
              <p className="text-[10px] font-black uppercase tracking-widest">Syncing Global Network...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-[3rem] p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
               <Target size={48} className="text-slate-300 mb-4"/>
               <h4 className="text-lg font-black text-slate-800 mb-2">No Active Rounds</h4>
               <p className="text-sm text-slate-500 max-w-sm mb-6">Be the first to raise capital or gather donations from the global IFB network.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {campaigns.map((camp) => {
                const progress = Math.min(100, (camp.raised_amount / camp.target_amount) * 100);
                const isFunded = camp.raised_amount >= camp.target_amount;
                
                return (
                  <div key={camp.id} className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-600">
                          <ShieldPlus size={10} className="text-blue-500"/> {camp.creator_ifb_id || 'IFB-VERIFIED'}
                        </div>
                        {camp.document_url && (
                          <a href={camp.document_url} target="_blank" rel="noreferrer" className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center hover:bg-blue-100 transition-colors" title="View Prospectus/Document">
                            <FileText size={14}/>
                          </a>
                        )}
                      </div>
                      <h4 className="text-xl font-black text-slate-800 leading-tight mb-2">{camp.title}</h4>
                      <p className="text-xs font-medium text-slate-500 leading-relaxed mb-6 line-clamp-3">{camp.description}</p>
                    </div>

                    <div>
                      <div className="space-y-2 mb-6">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                          <span>Raised: <span className="text-slate-800">{formatCurrency(camp.raised_amount)}</span></span>
                          <span className="text-slate-400">Target: {formatCurrency(camp.target_amount)}</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 border border-slate-200 rounded-full overflow-hidden shadow-inner">
                          <div className={`h-full ${isFunded ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }}></div>
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">{progress.toFixed(1)}% Funded</p>
                      </div>

                      <button 
                        onClick={() => setSupportCampaign(camp)}
                        disabled={isFunded || camp.user_id === session?.user?.id}
                        className="w-full py-4 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-100 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isFunded ? 'Fully Funded' : camp.user_id === session?.user?.id ? 'Your Campaign' : 'Support / Invest'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* 1. CREATE CAMPAIGN MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden relative border border-slate-100 p-8">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-black text-xl text-slate-800 tracking-tight uppercase">Start a Raise</h3>
              <X onClick={() => setShowCreateModal(false)} className="cursor-pointer text-slate-400 hover:text-slate-800"/>
            </div>
            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <input required type="text" value={campaignForm.title} onChange={e => setCampaignForm({...campaignForm, title: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border-2 border-slate-100 outline-none focus:border-blue-500 font-bold" placeholder="Project / Cause Title"/>
              <textarea required rows="3" value={campaignForm.description} onChange={e => setCampaignForm({...campaignForm, description: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border-2 border-slate-100 outline-none focus:border-blue-500 font-medium text-sm resize-none" placeholder="Explain what you are raising capital for..."/>
              <input required type="number" value={campaignForm.targetAmount} onChange={e => setCampaignForm({...campaignForm, targetAmount: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border-2 border-slate-100 outline-none focus:border-blue-500 font-bold" placeholder="Target Amount ($)"/>
              
              <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => docInputRef.current.click()}>
                {campaignDoc ? (
                  <p className="text-xs font-black text-emerald-600 flex items-center justify-center gap-2"><ShieldPlus size={14}/> Document Attached</p>
                ) : (
                  <>
                    <FileText className="mx-auto text-slate-400 mb-2" size={24}/>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Attach Pitch Deck or Document (Optional)</p>
                  </>
                )}
                <input type="file" ref={docInputRef} className="hidden" onChange={e => setCampaignDoc(e.target.files[0])} accept=".pdf,.doc,.docx,.png,.jpg"/>
              </div>

              <button type="submit" disabled={isLoading} className="w-full py-5 mt-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex justify-center hover:bg-blue-700 transition-all">
                {isLoading ? <Loader2 className="animate-spin" size={16}/> : 'Launch Opportunity'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. SUPPORT CAMPAIGN MODAL */}
      {supportCampaign && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden relative border border-slate-100">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center relative z-10">
              <h3 className="font-black text-lg text-slate-800 tracking-tight uppercase">Support Project</h3>
              <button onClick={() => { setSupportCampaign(null); setSupportAmount(''); }} className="text-slate-400 hover:text-slate-800 transition-colors bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSupportCampaign} className="p-8 space-y-6 relative z-10">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Target</p>
                <p className="text-lg font-black text-slate-800 mb-6">{supportCampaign.title}</p>

                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Available Liquidity (Cash)</label>
                <p className="text-xl font-black text-emerald-600 mb-6">{formatCurrency(balances?.liquid_usd)}</p>

                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 text-left">Funding Amount (USD)</label>
                <input type="number" step="0.01" required value={supportAmount} onChange={(e) => setSupportAmount(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 font-black text-4xl text-center text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-300 shadow-inner" placeholder="0.00" autoFocus />
              </div>
              <button type="submit" disabled={isLoading} className="w-full bg-slate-900 text-white rounded-2xl py-5 font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center border-none">
                {isLoading ? <Loader2 className="animate-spin" size={18} /> : 'CONFIRM FUNDING'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* GLOBAL NOTIFICATION LAYER */}
      {notification && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[500] animate-in slide-in-from-top-4 fade-in duration-300">
          <div className={`px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl flex items-center gap-3 ${
            notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-red-500/10 border-red-500/20 text-red-600'
          }`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${notification.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
            <p className="font-black text-[11px] uppercase tracking-[0.1em]">{notification.text}</p>
          </div>
        </div>
      )}

    </div>
  );
}