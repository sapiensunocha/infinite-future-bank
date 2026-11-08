import React, { useState } from 'react';
import { Share2, Users, Copy, ShieldCheck, Zap, Network } from 'lucide-react';
import { supabase } from './services/supabaseClient';
import { APP_URL } from './config/constants';

const defaultFormatCurrency = (val) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(val) || 0);

// Both callers (AppPopupModal, CommercialUnderwriting) open this without a formatter,
// which crashed the Referrals screen — fall back to a USD formatter.
export default function CapitalNetwork({ session, profile, balances, formatCurrency = defaultFormatCurrency, fetchAllData }) {
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
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-sm text-white">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 opacity-10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
              <Network className="text-white" /> Referral rewards
            </h2>
            <p className="text-sm text-blue-100 max-w-lg leading-relaxed">
              Invite people and businesses to IFB and earn rewards when they use their account. Reward levels are shown below.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-blue-100 mb-1">Rewards earned</p>
            <p className="text-4xl font-bold text-emerald-400 tracking-tight">{formatCurrency(balances?.liquid_usd * 0.05 || 0.00)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: The Invite Link */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
            <h3 className="font-bold text-slate-800 text-lg mb-2">Your invite link</h3>
            <p className="text-xs text-slate-500 mb-6">Share your link. When someone joins IFB with it and adds money, you earn rewards on their activity.</p>
            
            {!activeCode ? (
              <button onClick={handleGenerateCode} disabled={isGenerating} className="ui-btn ui-btn-primary">
                {isGenerating ? 'Generating...' : <><Zap size={14}/> Get my invite link</>}
              </button>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl break-all">
                  <p className="text-sm font-bold text-blue-600 selection:bg-blue-200 break-all">
                    {inviteLink}
                  </p>
                </div>
                <button onClick={handleCopyLink} className="ui-btn ui-btn-primary">
                  {isCopied ? <><ShieldCheck size={14} className="text-emerald-400"/> Copied to Clipboard</> : <><Copy size={14}/> Copy Network Link</>}
                </button>
              </div>
            )}
          </div>

          {/* Title Status */}
          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 opacity-20 rounded-full blur-2xl"></div>
             <p className="text-xs font-semibold text-slate-500 mb-2">Your level</p>
             <h4 className="text-2xl font-bold tracking-tight mb-4">Capital Builder</h4>
             <div className="w-full bg-slate-100 rounded-full h-2 mb-2">
               <div className="bg-blue-600 h-full rounded-full w-[45%]"></div>
             </div>
             <p className="text-xs font-medium text-slate-500 text-right">45% to Network Architect</p>
          </div>
        </div>

        {/* RIGHT COLUMN: The 4-Tier Matrix */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
            <h3 className="font-bold text-slate-800 text-lg mb-6 flex items-center justify-between">
              Ancestry Matrix
              <span className="text-xs bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full border border-emerald-100">10% Total Distribution</span>
            </h3>
            
            <div className="space-y-4">
              {/* TIER 1 */}
              <div className="p-5 border border-slate-100 rounded-2xl flex items-center justify-between hover:border-blue-200 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">L1</div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Direct Invites</p>
                    <p className="text-xs font-semibold text-slate-500">Your direct network</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-blue-600 text-lg">5.0%</p>
                  <p className="text-xs font-bold text-slate-500">Net Yield</p>
                </div>
              </div>

              {/* TIER 2 */}
              <div className="p-5 border border-slate-100 rounded-2xl flex items-center justify-between hover:border-indigo-200 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">L2</div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Second Degree</p>
                    <p className="text-xs font-semibold text-slate-500">Invited by your L1</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-indigo-600 text-lg">3.0%</p>
                  <p className="text-xs font-bold text-slate-500">Net Yield</p>
                </div>
              </div>

              {/* TIER 3 */}
              <div className="p-5 border border-slate-100 rounded-2xl flex items-center justify-between hover:border-purple-200 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center font-bold">L3</div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Third Degree</p>
                    <p className="text-xs font-semibold text-slate-500">Deep network</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-purple-600 text-lg">1.5%</p>
                  <p className="text-xs font-bold text-slate-500">Net Yield</p>
                </div>
              </div>

              {/* TIER 4 */}
              <div className="p-5 border border-slate-100 rounded-2xl flex items-center justify-between hover:border-emerald-200 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">L4</div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Echo Degree</p>
                    <p className="text-xs font-semibold text-slate-500">Maximum depth</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-600 text-lg">0.5%</p>
                  <p className="text-xs font-bold text-slate-500">Net Yield</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}