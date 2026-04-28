import React, { useState } from 'react';
import {
  X, QrCode, ScanLine, ShieldCheck, Sparkles, User,
  ArrowDownToLine, AlertCircle, Palette, Hexagon, Star,
  Circle as CircleIcon, Square as SquareIcon, Check, Share2, CheckCircle2
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { Scanner } from '@yudiel/react-qr-scanner';
import { APP_URL } from './config/constants';

// --- CONFIGURATION DICTIONARIES ---
const THEMES = {
  midnight: { 
    id: 'midnight', name: 'Midnight', bg: 'from-slate-800 to-slate-950', 
    glow: 'bg-blue-500/30', cardBg: 'bg-slate-900/60', textMain: 'text-white', textSub: 'text-blue-400',
    colorHex: '#1e293b'
  },
  cyberpunk: { 
    id: 'cyberpunk', name: 'Neon', bg: 'from-purple-700 to-fuchsia-950', 
    glow: 'bg-fuchsia-400/50', cardBg: 'bg-fuchsia-950/50', textMain: 'text-white', textSub: 'text-fuchsia-300',
    colorHex: '#c026d3'
  },
  bubblegum: { 
    id: 'bubblegum', name: 'Kids Play', bg: 'from-pink-400 to-cyan-500', 
    glow: 'bg-white/40', cardBg: 'bg-white/20', textMain: 'text-white', textSub: 'text-pink-100',
    colorHex: '#f472b6'
  },
  gold: { 
    id: 'gold', name: 'Prestige', bg: 'from-amber-200 to-orange-500', 
    glow: 'bg-orange-500/30', cardBg: 'bg-white/40', textMain: 'text-slate-900', textSub: 'text-orange-900',
    colorHex: '#fbbf24'
  },
  forest: { 
    id: 'forest', name: 'Wealth', bg: 'from-emerald-400 to-teal-900', 
    glow: 'bg-emerald-300/40', cardBg: 'bg-teal-950/50', textMain: 'text-white', textSub: 'text-emerald-200',
    colorHex: '#10b981'
  }
};

const SHAPES = {
  circle: { id: 'circle', icon: <CircleIcon size={20}/>, cssClass: 'rounded-full', style: {} },
  square: { id: 'square', icon: <SquareIcon size={20}/>, cssClass: 'rounded-3xl', style: {} },
  hexagon: { id: 'hexagon', icon: <Hexagon size={20}/>, cssClass: 'rounded-none', style: { clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' } },
  star: { id: 'star', icon: <Star size={20}/>, cssClass: 'rounded-none', style: { clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' } }
};

export default function PayMeCard({ profile, onClose }) {
  const [mode, setMode] = useState('receive');
  const [scanError, setScanError] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTheme, setActiveTheme] = useState(() => localStorage.getItem('ifb_card_theme') || 'midnight');
  const [activeShape, setActiveShape] = useState(() => localStorage.getItem('ifb_card_shape') || 'circle');

  if (!profile) return null;

  const payLink = `${APP_URL}/pay/${profile.id}`;
  const userName = profile.full_name || 'IFB Member';
  const tier = profile.active_tier || 'Personal';

  const currentTheme = THEMES[activeTheme];
  const currentShape = SHAPES[activeShape];

  const handleScan = (text) => {
    if (text) {
      if (text.includes('/pay/') || text.includes(APP_URL)) {
        // Open the pay link in the device browser so the recipient can pay
        window.open(text, '_blank');
        onClose();
      } else {
        setScanError('Not a valid DEUS payment code');
        setTimeout(() => setScanError(''), 3000);
      }
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(payLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const saveDesign = () => {
    localStorage.setItem('ifb_card_theme', activeTheme);
    localStorage.setItem('ifb_card_shape', activeShape);
    setMode('receive');
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      
      {/* INVISIBLE BACKDROP */}
      <div className="absolute inset-0 cursor-pointer" onClick={onClose}></div>

      {/* THE DYNAMIC DIGITAL CARD */}
      <div className={`w-full max-w-[340px] bg-gradient-to-br ${currentTheme.bg} rounded-[2.5rem] p-1 shadow-2xl relative animate-in zoom-in-95 duration-500 overflow-hidden flex flex-col transition-colors`}>
        
        {/* Animated Background Glow */}
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 ${currentTheme.glow} blur-[80px] rounded-full pointer-events-none transition-colors duration-500`}></div>

        <div className={`${currentTheme.cardBg} backdrop-blur-xl rounded-[2.3rem] p-8 flex flex-col items-center border border-white/20 relative z-10 transition-colors duration-500`}>
          
          {/* Close Button */}
          <button 
            type="button"
            onClick={onClose} 
            className={`absolute top-6 right-6 w-8 h-8 bg-black/10 hover:bg-black/20 rounded-full flex items-center justify-center ${currentTheme.textMain} transition-colors z-50 cursor-pointer`}
          >
            <X size={16} strokeWidth={3} />
          </button>

          {/* Header Branding */}
          <div className={`w-full flex items-center justify-between mb-6 opacity-90 ${currentTheme.textMain}`}>
            <div className="flex items-center gap-1">
              <span className="font-black text-lg tracking-tight">IFB</span>
              <Sparkles size={14} className={currentTheme.id === 'gold' ? 'text-slate-900' : 'text-white'} />
            </div>
            {mode === 'receive' && <QrCode size={20} />}
            {mode === 'scan' && <ScanLine size={20} />}
            {mode === 'design' && <Palette size={20} />}
          </div>

          {/* MODE TOGGLE SWITCH */}
          <div className="flex bg-black/20 p-1 rounded-2xl w-full mb-6 border border-white/10 relative z-20 backdrop-blur-sm">
            <button 
              onClick={() => setMode('receive')} 
              className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all ${mode === 'receive' ? 'bg-white text-slate-900 shadow-sm' : 'text-white/60 hover:text-white'}`}
            >
              <ArrowDownToLine size={12}/> Receive
            </button>
            <button 
              onClick={() => setMode('scan')} 
              className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all ${mode === 'scan' ? 'bg-white text-slate-900 shadow-sm' : 'text-white/60 hover:text-white'}`}
            >
              <ScanLine size={12}/> Scan
            </button>
            <button 
              onClick={() => setMode('design')} 
              className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all ${mode === 'design' ? 'bg-white text-slate-900 shadow-sm' : 'text-white/60 hover:text-white'}`}
            >
              <Palette size={12}/> Look
            </button>
          </div>

          {/* --- VIEW: RECEIVE (SHOW QR) --- */}
          {mode === 'receive' && (
            <div className="flex flex-col items-center w-full animate-in fade-in slide-in-from-left-4">
              
              {/* User Dynamic Avatar */}
              <div 
                className={`w-20 h-20 bg-slate-800 shadow-xl overflow-hidden mb-3 flex items-center justify-center relative transition-all duration-500 ${currentShape.cssClass}`}
                style={currentShape.style}
              >
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={userName} className="w-full h-full object-cover" />
                ) : (
                  <User size={32} className="text-slate-400" />
                )}
              </div>

              {/* User Identity */}
              <div className="text-center mb-6">
                <h2 className={`text-xl font-black tracking-tight ${currentTheme.textMain}`}>{userName}</h2>
                <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${currentTheme.textSub}`}>{tier} Account</p>
              </div>

              {/* The QR Code */}
              <div className="bg-white p-4 rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.1)] mb-6 transform transition-transform hover:scale-105 duration-300">
                <QRCode 
                  value={payLink} 
                  size={160} 
                  fgColor={currentTheme.id === 'gold' ? '#0f172a' : currentTheme.colorHex} 
                  bgColor="#ffffff"
                  level="H" 
                />
              </div>

              <div className="w-full bg-black/10 rounded-2xl p-4 flex items-start gap-3 border border-white/10 backdrop-blur-sm">
                <ShieldCheck className={`${currentTheme.textMain} shrink-0 mt-0.5 opacity-80`} size={16} />
                <div>
                  <p className={`text-xs font-bold ${currentTheme.textMain}`}>Scan to Pay Me</p>
                  <p className={`text-[9px] mt-0.5 leading-relaxed ${currentTheme.textMain} opacity-70`}>Anyone can scan this code to route funds directly to your IFB account.</p>
                </div>
              </div>

              {/* Share / Copy Link Button */}
              <button
                onClick={handleCopyLink}
                className="w-full mt-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                {copied
                  ? <><CheckCircle2 size={16} className="text-emerald-400" /><span className={`text-[10px] font-black uppercase tracking-widest ${currentTheme.textMain}`}>Link Copied!</span></>
                  : <><Share2 size={16} className={currentTheme.textMain} /><span className={`text-[10px] font-black uppercase tracking-widest ${currentTheme.textMain}`}>Copy Pay Link</span></>}
              </button>
            </div>
          )}

          {/* --- VIEW: SCAN (CAMERA) --- */}
          {mode === 'scan' && (
            <div className="flex flex-col items-center w-full animate-in fade-in slide-in-from-right-4">
              <div className="w-full bg-slate-900 rounded-3xl overflow-hidden border-4 border-white/20 shadow-2xl relative mb-6">
                
                <div className="w-full aspect-square relative">
                  <Scanner 
                    onResult={(text) => handleScan(text)} 
                    onError={() => setScanError('Camera access required — check permissions')} 
                    options={{ delayBetweenScanAttempts: 1000 }}
                  />
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-emerald-400/80 rounded-2xl animate-pulse shadow-[0_0_15px_rgba(52,211,153,0.5)]"></div>
                  </div>
                </div>

                {scanError && (
                  <div className="absolute bottom-4 left-4 right-4 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest py-2 px-4 rounded-xl text-center shadow-lg animate-in slide-in-from-bottom-2">
                    {scanError}
                  </div>
                )}
              </div>

              <div className="w-full bg-black/10 rounded-2xl p-4 flex items-start gap-3 border border-white/10 backdrop-blur-sm text-left">
                <AlertCircle className={`${currentTheme.textMain} shrink-0 mt-0.5 opacity-80`} size={16} />
                <div>
                  <p className={`text-xs font-bold ${currentTheme.textMain}`}>Point at QR Code</p>
                  <p className={`text-[9px] mt-0.5 leading-relaxed ${currentTheme.textMain} opacity-70`}>Align another user's IFB code inside the frame to instantly authorize a payment.</p>
                </div>
              </div>
            </div>
          )}

          {/* --- VIEW: DESIGN / CUSTOMIZE --- */}
          {mode === 'design' && (
            <div className="flex flex-col items-center w-full animate-in fade-in slide-in-from-bottom-4">
              
              {/* Live Preview Avatar */}
              <div 
                className={`w-16 h-16 bg-slate-800 shadow-xl overflow-hidden mb-6 flex items-center justify-center relative transition-all duration-500 ${currentShape.cssClass}`}
                style={currentShape.style}
              >
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={userName} className="w-full h-full object-cover" />
                ) : (
                  <User size={24} className="text-slate-400" />
                )}
              </div>

              <div className="w-full space-y-6">
                {/* Theme Selector */}
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${currentTheme.textMain} opacity-80`}>Select Theme</p>
                  <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                    {Object.values(THEMES).map(t => (
                      <button
                        key={t.id}
                        onClick={() => setActiveTheme(t.id)}
                        className={`w-10 h-10 rounded-full flex-shrink-0 border-2 transition-transform hover:scale-110 flex items-center justify-center shadow-md ${activeTheme === t.id ? 'border-white scale-110' : 'border-transparent'}`}
                        style={{ background: t.colorHex }}
                      >
                        {activeTheme === t.id && <Check size={14} className={t.id === 'bubblegum' ? 'text-white' : 'text-slate-900'}/>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Shape Selector */}
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${currentTheme.textMain} opacity-80`}>Avatar Shape</p>
                  <div className="flex gap-3">
                    {Object.values(SHAPES).map(s => (
                      <button
                        key={s.id}
                        onClick={() => setActiveShape(s.id)}
                        className={`w-12 h-12 flex-shrink-0 flex items-center justify-center transition-all bg-black/20 backdrop-blur-sm hover:bg-black/30 ${activeShape === s.id ? 'text-white shadow-inner bg-black/40' : `${currentTheme.textMain} opacity-50`} ${s.cssClass}`}
                        style={s.style}
                      >
                        {s.icon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button 
                onClick={saveDesign}
                className="w-full mt-8 py-4 bg-white text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 transition-all"
              >
                Save My Look
              </button>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}