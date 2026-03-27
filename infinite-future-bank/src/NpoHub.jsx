import React, { useState, useEffect } from 'react';
import { HeartHandshake, ShieldCheck, Link as LinkIcon, Loader2, Copy, CheckCircle2, Search, Heart, ArrowRight } from 'lucide-react';
import { supabase } from './services/supabaseClient';

export default function NpoHub({ session }) {
  const [viewTab, setViewTab] = useState('EXPLORE'); // 'EXPLORE' or 'MANAGE'
  const [npoData, setNpoData] = useState(null);
  const [verifiedNpos, setVerifiedNpos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Donation Modal States
  const [donateModal, setDonateModal] = useState(null); // Holds the NPO object being donated to
  const [donateAmount, setDonateAmount] = useState('');
  const [isDonating, setIsDonating] = useState(false);

  // Application & Config States
  const [applyForm, setApplyForm] = useState({ name: '', taxId: '', mission: '' });
  const [configForm, setConfigForm] = useState({ message: '', amounts: '', notify: true });

  useEffect(() => {
    fetchNpoData();
  }, [viewTab]);

  const fetchNpoData = async () => {
    setIsLoading(true);
    
    // Fetch personal NPO data
    const { data: myNpo } = await supabase.from('npo_profiles').select('*').eq('id', session.user.id).maybeSingle();
    if (myNpo) {
      setNpoData(myNpo);
      setConfigForm({
        message: myNpo.donation_message,
        amounts: JSON.parse(myNpo.preset_amounts).join(', '),
        notify: myNpo.notify_on_donation
      });
    }

    // Fetch all verified NPOs for the Explore tab
    const { data: publicNpos } = await supabase.from('npo_profiles').select('*').eq('verification_status', 'verified');
    if (publicNpos) setVerifiedNpos(publicNpos);
    
    setIsLoading(false);
  };

  // --- ACTIONS: EXPLORE & DONATE ---
  const handleDonate = async (e) => {
    e.preventDefault();
    const amount = parseFloat(donateAmount);
    if (!amount || amount <= 0) return alert("Please enter a valid donation amount.");
    
    setIsDonating(true);
    try {
      // 1. Fire the secure SQL RPC
      const { error } = await supabase.rpc('process_npo_donation', {
        p_npo_id: donateModal.id,
        p_donor_id: session.user.id,
        p_amount: amount
      });
      if (error) throw error;

      // 2. Send Email/App Notification if NPO configured it
      if (donateModal.notify_on_donation) {
        await supabase.from('notifications').insert([{
          user_id: donateModal.id,
          type: 'system',
          message: `You received a $${amount.toFixed(2)} donation!`,
          status: 'completed'
        }]);
      }

      alert(`Successfully donated $${amount.toFixed(2)} to ${donateModal.npo_name}!`);
      setDonateModal(null);
      setDonateAmount('');
      fetchNpoData();
    } catch (err) {
      alert(err.message || "Donation failed. Please check your liquid balance.");
    } finally {
      setIsDonating(false);
    }
  };

  // --- ACTIONS: MANAGE NPO ---
  const handleApply = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await supabase.from('npo_profiles').insert([{
      id: session.user.id,
      npo_name: applyForm.name,
      tax_id: applyForm.taxId,
      mission_statement: applyForm.mission,
      verification_status: 'pending_review'
    }]);
    if (error) alert("Failed to submit application.");
    else fetchNpoData();
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
      
      alert("Donation page configured successfully!");
      fetchNpoData();
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

  const filteredNpos = verifiedNpos.filter(npo => 
    npo.npo_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    npo.mission_statement.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) return <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-rose-500 mb-4" size={40} /><p className="font-bold text-slate-500">Loading Philanthropy Hub...</p></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* TABS CONTROLLER */}
      <div className="flex gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm w-fit mx-auto mb-8">
        <button onClick={() => setViewTab('EXPLORE')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewTab === 'EXPLORE' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
          Explore Causes
        </button>
        <button onClick={() => setViewTab('MANAGE')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewTab === 'MANAGE' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
          My Organization
        </button>
      </div>

      {/* ================================================================= */}
      {/* VIEW 1: EXPLORE & DONATE (PUBLIC MARKET)                          */}
      {/* ================================================================= */}
      {viewTab === 'EXPLORE' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-rose-50 border border-rose-100 p-8 rounded-[2rem] text-center shadow-sm relative overflow-hidden">
            <Heart size={100} className="absolute -left-4 -top-4 opacity-10 text-rose-500" />
            <h2 className="text-2xl font-black text-rose-950 mb-2 relative z-10">Fund the Future</h2>
            <p className="text-sm text-rose-800 font-medium max-w-lg mx-auto relative z-10">Zero fees. 100% of your donation is routed instantly to these verified IFB Philanthropic Partners.</p>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-4 text-slate-400" size={20}/>
            <input 
              type="text" placeholder="Search causes or organizations..." 
              value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} 
              className="w-full bg-white border border-slate-200 p-4 pl-12 rounded-2xl font-bold outline-none focus:border-rose-500 transition-all shadow-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNpos.length === 0 && <p className="text-slate-500 text-center col-span-full py-10 font-bold">No causes found.</p>}
            {filteredNpos.map(npo => (
              <div key={npo.id} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 hover:shadow-lg transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-black text-slate-800 text-lg leading-tight">{npo.npo_name}</h3>
                    <ShieldCheck className="text-emerald-500 shrink-0" size={20}/>
                  </div>
                  <p className="text-xs text-slate-600 font-medium mb-6 line-clamp-3">"{npo.mission_statement}"</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-1">Total Raised</p>
                  <p className="text-2xl font-black text-slate-800 mb-4">${npo.total_raised}</p>
                  <button 
                    onClick={() => { setDonateModal(npo); setDonateAmount(''); }} 
                    className="w-full bg-slate-900 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800"
                  >
                    Donate <ArrowRight size={14}/>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* DONATION OVERLAY (PayPal Style) */}
          {donateModal && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden relative">
                <div className="p-6 border-b border-slate-100 text-center bg-rose-50">
                  <h3 className="font-black text-xl text-rose-950">{donateModal.npo_name}</h3>
                  <p className="text-xs font-bold text-rose-700 mt-1">Verified Partner</p>
                </div>
                <form onSubmit={handleDonate} className="p-8 space-y-6">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                    <p className="text-sm font-medium text-slate-700 italic">"{donateModal.donation_message}"</p>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Select Amount</label>
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {JSON.parse(donateModal.preset_amounts).map(amt => (
                        <button 
                          key={amt} type="button" 
                          onClick={() => setDonateAmount(amt.toString())}
                          className={`py-3 rounded-xl font-black text-sm transition-all border-2 ${parseFloat(donateAmount) === amt ? 'bg-rose-100 border-rose-500 text-rose-700' : 'bg-white border-slate-200 text-slate-600 hover:border-rose-300'}`}
                        >
                          ${amt}
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">$</span>
                      <input 
                        required type="number" step="0.01" value={donateAmount} onChange={e => setDonateAmount(e.target.value)} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 pl-8 font-black text-xl outline-none focus:border-rose-500 text-slate-800" 
                        placeholder="Custom Amount" 
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setDonateModal(null)} className="w-1/3 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200">Cancel</button>
                    <button type="submit" disabled={isDonating} className="w-2/3 bg-rose-600 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-500 transition-all shadow-lg">
                      {isDonating ? <Loader2 className="animate-spin mx-auto" size={16}/> : `Donate $${donateAmount || '0'}`}
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
                <HeartHandshake size={100} className="absolute -left-10 -bottom-10 opacity-10 text-rose-500" />
                <h2 className="text-3xl font-black tracking-tight mb-2 relative z-10">Register your Non-Profit</h2>
                <p className="text-sm text-slate-400 max-w-xl mx-auto relative z-10">Apply for IFB Philanthropy status to generate a customized, zero-fee global donation link for your cause.</p>
              </div>
              <form onSubmit={handleApply} className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-sm space-y-6">
                <input required type="text" placeholder="Registered NPO Name" value={applyForm.name} onChange={e=>setApplyForm({...applyForm, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-rose-500" />
                <input required type="text" placeholder="Government Tax / Registration ID" value={applyForm.taxId} onChange={e=>setApplyForm({...applyForm, taxId: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-rose-500" />
                <textarea required placeholder="What is your organization's mission?" value={applyForm.mission} onChange={e=>setApplyForm({...applyForm, mission: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-rose-500 h-32" />
                <button type="submit" className="w-full py-5 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-500 transition-all shadow-xl">Submit Application to Compliance</button>
              </form>
            </div>
          )}

          {/* Sub-view: Pending Approval */}
          {npoData && npoData.verification_status === 'pending_review' && (
            <div className="max-w-2xl mx-auto text-center py-20">
              <div className="w-24 h-24 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><Loader2 size={48} className="animate-spin"/></div>
              <h2 className="text-3xl font-black text-slate-800 mb-2">Application Under Review</h2>
              <p className="text-slate-500 max-w-md mx-auto">IFB Compliance is verifying your tax ID and non-profit status. Once approved, your custom donation link will be activated.</p>
            </div>
          )}

          {/* Sub-view: Verified NPO Dashboard */}
          {npoData && npoData.verification_status === 'verified' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-slate-900 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden flex flex-col justify-center">
                  <HeartHandshake size={120} className="absolute right-0 bottom-0 opacity-10 text-rose-500 translate-x-4 translate-y-4" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="text-3xl font-black tracking-tight">{npoData.npo_name}</h2>
                      <ShieldCheck className="text-emerald-400" size={24}/>
                    </div>
                    <p className="text-sm text-slate-400 mb-6">Verified IFB Philanthropic Partner</p>
                    
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Your Universal Donation Link</p>
                    <div className="flex items-center gap-2 bg-slate-800/80 p-2 rounded-xl border border-white/10 w-fit">
                      <span className="text-sm font-bold text-rose-400 pl-3 pr-2">{window.location.origin}/donate?npo={session.user.id}</span>
                      <button onClick={copyLink} className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-colors">
                        {copied ? <CheckCircle2 size={18} className="text-emerald-400"/> : <Copy size={18}/>}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="bg-rose-50 border border-rose-100 rounded-[2rem] p-8 text-center flex flex-col justify-center shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-2">Total Funds Raised</p>
                  <p className="text-5xl font-black text-rose-900">${npoData.total_raised}</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
                <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><LinkIcon className="text-slate-400"/> Configure Donation Page</h3>
                <form onSubmit={handleSaveConfig} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Public Thank You Message</label>
                    <textarea 
                      required value={configForm.message} onChange={e=>setConfigForm({...configForm, message: e.target.value})} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-rose-500 h-24" 
                      placeholder="What supporters will see when they click your link..." 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Preset Donation Amounts (USD)</label>
                    <input 
                      required type="text" value={configForm.amounts} onChange={e=>setConfigForm({...configForm, amounts: e.target.value})} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-rose-500" 
                      placeholder="e.g. 10, 25, 50, 100" 
                    />
                    <p className="text-xs text-slate-500 mt-2 font-medium">Separate amounts with commas. Donors can also enter a custom amount.</p>
                  </div>
                  <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-800">Donation Email Alerts</p>
                      <p className="text-xs text-slate-500 mt-1">Receive an instant email every time someone contributes to your cause.</p>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setConfigForm({...configForm, notify: !configForm.notify})} 
                      className={`w-12 h-6 rounded-full transition-colors relative ${configForm.notify ? 'bg-rose-500' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${configForm.notify ? 'translate-x-6' : ''}`}></div>
                    </button>
                  </div>
                  <button type="submit" disabled={isSaving} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50">
                    {isSaving ? <Loader2 className="animate-spin mx-auto" size={16}/> : 'Save Page Configuration'}
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}