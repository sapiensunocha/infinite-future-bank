import React from 'react';
import { X, QrCode, ScanLine, ShieldCheck, Sparkles, User } from 'lucide-react';
import QRCode from 'react-qr-code';

export default function PayMeCard({ profile, onClose }) {
  // If profile isn't loaded yet, don't crash
  if (!profile) return null;

  // The universal IFB routing link for this specific user
  const payLink = `${window.location.origin}/pay?to=${profile.id}`;

  const userName = profile.full_name || 'IFB Member';
  const tier = profile.active_tier || 'Personal';

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      
      {/* THE VERTICAL DIGITAL CARD */}
      <div className="w-full max-w-[340px] bg-gradient-to-b from-slate-800 to-slate-950 rounded-[2.5rem] p-1 shadow-2xl relative animate-in zoom-in-95 duration-500 overflow-hidden">
        
        {/* Animated Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-blue-500/20 blur-[80px] rounded-full pointer-events-none"></div>

        <div className="bg-slate-900/50 backdrop-blur-xl rounded-[2.3rem] p-8 flex flex-col items-center border border-white/10 relative z-10">
          
          {/* Close Button */}
          <button 
            onClick={onClose} 
            className="absolute top-6 right-6 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
          >
            <X size={16} strokeWidth={3} />
          </button>

          {/* Header Branding */}
          <div className="w-full flex items-center justify-between mb-8 opacity-80">
            <div className="flex items-center gap-1">
              <span className="font-black text-white text-lg tracking-tight">IFB</span>
              <Sparkles size={14} className="text-blue-400" />
            </div>
            <ScanLine size={20} className="text-white" />
          </div>

          {/* User Avatar */}
          <div className="w-24 h-24 rounded-full bg-slate-800 border-4 border-slate-700 shadow-xl overflow-hidden mb-4 flex items-center justify-center relative">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={userName} className="w-full h-full object-cover" />
            ) : (
              <User size={40} className="text-slate-400" />
            )}
            <div className="absolute bottom-0 right-0 w-6 h-6 bg-emerald-500 border-2 border-slate-800 rounded-full"></div>
          </div>

          {/* User Identity */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-white tracking-tight">{userName}</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mt-1">{tier} Account</p>
          </div>

          {/* The QR Code (The Magic) */}
          <div className="bg-white p-4 rounded-3xl shadow-[0_0_40px_rgba(59,130,246,0.3)] mb-8 transform transition-transform hover:scale-105 duration-300">
            <QRCode 
              value={payLink} 
              size={180} 
              fgColor="#0f172a" // Slate 900
              bgColor="#ffffff"
              level="H" // High error correction so it scans easily on cracked screens
            />
          </div>

          {/* Footer Info */}
          <div className="w-full bg-slate-800/50 rounded-2xl p-4 flex items-start gap-3 border border-white/5">
            <ShieldCheck className="text-emerald-400 shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-xs font-bold text-white">Scan to Pay Me</p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">Anyone can scan this code using their camera to route funds directly to your IFB account.</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}