import React, { useState } from 'react';
import { X, QrCode, ScanLine, ShieldCheck, Sparkles, User, ArrowDownToLine, AlertCircle } from 'lucide-react';
import QRCode from 'react-qr-code';
import { Scanner } from '@yudiel/react-qr-scanner';

export default function PayMeCard({ profile, onClose }) {
  const [mode, setMode] = useState('receive'); // 'receive' or 'scan'
  const [scanError, setScanError] = useState('');

  // If profile isn't loaded yet, don't crash
  if (!profile) return null;

  // The universal IFB routing link for this specific user
  const payLink = `${window.location.origin}/pay?to=${profile.id}`;

  const userName = profile.full_name || 'IFB Member';
  const tier = profile.active_tier || 'Personal';

  const handleScan = (text) => {
    if (text) {
      // Check if it's a valid IFB routing link
      if (text.includes('/pay?to=')) {
        // Redirect the user to the payment execution page
        window.location.href = text;
      } else {
        setScanError('Invalid IFB QR Code');
        setTimeout(() => setScanError(''), 3000);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      
      {/* INVISIBLE BACKDROP (Clicking outside closes the modal) */}
      <div className="absolute inset-0 cursor-pointer" onClick={onClose}></div>

      {/* THE VERTICAL DIGITAL CARD */}
      <div className="w-full max-w-[340px] bg-gradient-to-b from-slate-800 to-slate-950 rounded-[2.5rem] p-1 shadow-2xl relative animate-in zoom-in-95 duration-500 overflow-hidden flex flex-col">
        
        {/* Animated Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-blue-500/20 blur-[80px] rounded-full pointer-events-none"></div>

        <div className="bg-slate-900/50 backdrop-blur-xl rounded-[2.3rem] p-8 flex flex-col items-center border border-white/10 relative z-10">
          
          {/* Close Button (Fixed z-index so it's always clickable) */}
          <button 
            type="button"
            onClick={onClose} 
            className="absolute top-6 right-6 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors z-50 cursor-pointer"
          >
            <X size={16} strokeWidth={3} />
          </button>

          {/* Header Branding */}
          <div className="w-full flex items-center justify-between mb-6 opacity-80">
            <div className="flex items-center gap-1">
              <span className="font-black text-white text-lg tracking-tight">IFB</span>
              <Sparkles size={14} className="text-blue-400" />
            </div>
            {mode === 'receive' ? <QrCode size={20} className="text-white" /> : <ScanLine size={20} className="text-emerald-400" />}
          </div>

          {/* MODE TOGGLE SWITCH */}
          <div className="flex bg-slate-800/80 p-1 rounded-2xl w-full mb-6 border border-white/5 relative z-20">
            <button 
              onClick={() => setMode('receive')} 
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${mode === 'receive' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              <ArrowDownToLine size={14}/> Receive
            </button>
            <button 
              onClick={() => setMode('scan')} 
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${mode === 'scan' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              <ScanLine size={14}/> Scan
            </button>
          </div>

          {/* --- VIEW: RECEIVE (SHOW QR) --- */}
          {mode === 'receive' && (
            <div className="flex flex-col items-center w-full animate-in fade-in slide-in-from-left-4">
              {/* User Avatar */}
              <div className="w-20 h-20 rounded-full bg-slate-800 border-4 border-slate-700 shadow-xl overflow-hidden mb-3 flex items-center justify-center relative">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={userName} className="w-full h-full object-cover" />
                ) : (
                  <User size={32} className="text-slate-400" />
                )}
                <div className="absolute bottom-0 right-0 w-5 h-5 bg-emerald-500 border-2 border-slate-800 rounded-full"></div>
              </div>

              {/* User Identity */}
              <div className="text-center mb-6">
                <h2 className="text-xl font-black text-white tracking-tight">{userName}</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mt-1">{tier} Account</p>
              </div>

              {/* The QR Code */}
              <div className="bg-white p-4 rounded-3xl shadow-[0_0_40px_rgba(59,130,246,0.3)] mb-6 transform transition-transform hover:scale-105 duration-300">
                <QRCode 
                  value={payLink} 
                  size={160} 
                  fgColor="#0f172a" 
                  bgColor="#ffffff"
                  level="H" 
                />
              </div>

              <div className="w-full bg-slate-800/50 rounded-2xl p-4 flex items-start gap-3 border border-white/5">
                <ShieldCheck className="text-emerald-400 shrink-0 mt-0.5" size={16} />
                <div>
                  <p className="text-xs font-bold text-white">Scan to Pay Me</p>
                  <p className="text-[9px] text-slate-400 mt-0.5 leading-relaxed">Anyone can scan this code to route funds directly to your IFB account.</p>
                </div>
              </div>
            </div>
          )}

          {/* --- VIEW: SCAN (CAMERA) --- */}
          {mode === 'scan' && (
            <div className="flex flex-col items-center w-full animate-in fade-in slide-in-from-right-4">
              <div className="w-full bg-slate-900 rounded-3xl overflow-hidden border-2 border-slate-700 shadow-2xl relative mb-6">
                
                {/* The Camera Scanner */}
                <div className="w-full aspect-square relative">
                  <Scanner 
                    onResult={(text) => handleScan(text)} 
                    onError={(error) => console.log(error?.message)} 
                    options={{ delayBetweenScanAttempts: 1000 }}
                  />
                  {/* Visual Target Box */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-emerald-500/50 rounded-2xl animate-pulse"></div>
                  </div>
                </div>

                {/* Scan Error Message */}
                {scanError && (
                  <div className="absolute bottom-4 left-4 right-4 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest py-2 px-4 rounded-xl text-center shadow-lg animate-in slide-in-from-bottom-2">
                    {scanError}
                  </div>
                )}
              </div>

              <div className="w-full bg-slate-800/50 rounded-2xl p-4 flex items-start gap-3 border border-white/5 text-left">
                <AlertCircle className="text-blue-400 shrink-0 mt-0.5" size={16} />
                <div>
                  <p className="text-xs font-bold text-white">Point at QR Code</p>
                  <p className="text-[9px] text-slate-400 mt-0.5 leading-relaxed">Align another user's IFB code inside the frame to instantly authorize a payment.</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}