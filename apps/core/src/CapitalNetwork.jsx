import React, { useState } from 'react';
import { Share2, Users, Copy, ShieldCheck, Zap, Network } from 'lucide-react';
import { supabase } from './services/supabaseClient';
import { APP_URL } from './config/constants';

export default function CapitalNetwork({ session, profile, balances, formatCurrency, fetchAllData }) {
  const [isCopied, setIsCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [localReferralCode, setLocalReferralCode] = useState(profile?.referral_code || null);

  const handleGenerateCode = async () => {
    setIsGenerating(true);
    const newCode = `IFB-${(profile.full_name || 'USR').substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 10000)}`;
    try {
      const { error } = await supabase.from('profiles').update({ referral_code: newCode }).eq('id', session.user.id);
      if (error) throw error;
      setLocalReferralCode(newCode);
      if (fetchAllData) await fetchAllData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const activeCode = localReferralCode || profile?.referral_code;
  const inviteLink = `${APP_URL}/?ref=${activeCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink).catch(() => {});
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* 🏛️ HEADER */}
      <div className="bg-slate-900 rounded-[3rem] p-10 relative overflow-hidden shadow-2xl text-white">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 opacity-10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h2 className="text-3xl font-black tracking-tight mb-2 flex items-center gap-3">
              <Network className="text-blue-400" /> Capital Protocol
            </h2>
            <p className="text-sm text-slate-400 max-w-lg leading-relaxed">
              Introduce verified capital to the Infinite Future Bank network and earn a lifetime passive yield of up to 10% on your entire 4-tier ancestry lineage.
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Your Total Network Yield</p>
            <p className="text-4xl font-black text-emerald-400 tracking-tight">{formatCurrency(balances?.liquid_usd * 0.05 || 0.00)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: The Invite Link */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
            <h3 className="font-black text-slate-800 text-lg mb-2">Your Invite Link</h3>
            <p className="text-xs text-slate-500 mb-6">Share this cryptographic link. When someone joins and funds their account, they are permanently locked to your ancestry tree.</p>
            
            {!activeCode ? (
              <button onClick={handleGenerateCode} disabled={isGenerating} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                {isGenerating ? 'Generating...' : <><Zap size={14}/> Activate Protocol</>}
              </button>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl break-all">
                  <p className="text-sm font-bold text-blue-600 selection:bg-blue-200 break-all">
                    {inviteLink}
                  </p>
                </div>
                <button onClick={handleCopyLink} className="w-full py-4 bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-slate-700 transition-all flex items-center justify-center gap-2">
                  {isCopied ? <><ShieldCheck size={14} className="text-emerald-400"/> Copied to Clipboard</> : <><Copy size={14}/> Copy Network Link</>}
                </button>
              </div>
            )}
          </div>

          {/* Title Status */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-8 rounded-3xl text-white shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 opacity-20 rounded-full blur-2xl"></div>
             <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-2">Current Title</p>
             <h4 className="text-2xl font-black tracking-tight mb-4">Capital Builder</h4>
             <div className="w-full bg-slate-800 rounded-full h-2 mb-2">
               <div className="bg-indigo-500 h-full rounded-full w-[45%]"></div>
             </div>
             <p className="text-[10px] font-bold text-slate-400 text-right">45% to Network Architect</p>
          </div>
        </div>

        {/* RIGHT COLUMN: The 4-Tier Matrix */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
            <h3 className="font-black text-slate-800 text-lg mb-6 flex items-center justify-between">
              Ancestry Matrix
              <span className="text-[10px] bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full border border-emerald-100">10% Total Distribution</span>
            </h3>
            
            <div className="space-y-4">
              {/* TIER 1 */}
              <div className="p-5 border border-slate-100 rounded-2xl flex items-center justify-between hover:border-blue-200 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black">L1</div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Direct Invites</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Your direct network</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-blue-600 text-lg">5.0%</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Net Yield</p>
                </div>
              </div>

              {/* TIER 2 */}
              <div className="p-5 border border-slate-100 rounded-2xl flex items-center justify-between hover:border-indigo-200 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black">L2</div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Second Degree</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Invited by your L1</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-indigo-600 text-lg">3.0%</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Net Yield</p>
                </div>
              </div>

              {/* TIER 3 */}
              <div className="p-5 border border-slate-100 rounded-2xl flex items-center justify-between hover:border-purple-200 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center font-black">L3</div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Third Degree</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Deep network</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-purple-600 text-lg">1.5%</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Net Yield</p>
                </div>
              </div>

              {/* TIER 4 */}
              <div className="p-5 border border-slate-100 rounded-2xl flex items-center justify-between hover:border-emerald-200 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-black">L4</div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Echo Degree</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Maximum depth</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-emerald-600 text-lg">0.5%</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Net Yield</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}