import React, { useState } from 'react';
import { Sparkles, Phone, MessageSquare, X, Mic, Globe, Zap } from 'lucide-react';

export default function DeusNexus() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCalling, setIsCalling] = useState(false);

  return (
    <div className="fixed bottom-10 right-10 z-[200] flex flex-col items-end gap-4">
      
      {/* 📞 THE CALL INTERFACE (Appears when morphing) */}
      {isOpen && (
        <div className="mb-4 w-80 bg-white/70 backdrop-blur-3xl rounded-[2.5rem] border border-white/60 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
          <div className="bg-slate-900/80 p-6 text-white flex flex-col items-center text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 border-2 ${isCalling ? 'border-green-400 animate-pulse' : 'border-blue-400'}`}>
               {isCalling ? <Mic size={32} className="text-green-400" /> : <Sparkles size={32} className="text-blue-400" />}
            </div>
            <h3 className="text-xl font-black">{isCalling ? "Direct Satellite Link" : "IFB Nexus Agent"}</h3>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">
              {isCalling ? "Connected via Starlink-V" : "Global 24/7 Presence"}
            </p>
          </div>

          <div className="p-6 space-y-3 bg-transparent">
            {!isCalling ? (
              <>
                <button 
                  onClick={() => setIsCalling(true)}
                  className="w-full py-4 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-700 transition-all"
                >
                  <Phone size={18} /> Initiate Voice Link
                </button>
                <button className="w-full py-4 rounded-2xl bg-white/60 border border-slate-200 text-slate-800 font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-white/80 transition-all">
                  <MessageSquare size={18} /> Open Secure Chat
                </button>
              </>
            ) : (
              <button 
                onClick={() => setIsCalling(false)}
                className="w-full py-4 rounded-2xl bg-red-500 text-white font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-red-600 transition-all"
              >
                <X size={18} /> Terminate Link
              </button>
            )}
            
            <div className="pt-4 flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
              <span className="flex items-center gap-1"><Globe size={10}/> Orbit Status: Active</span>
              <span className="flex items-center gap-1"><Zap size={10}/> Low Latency</span>
            </div>
          </div>
        </div>
      )}

      {/* 🔮 THE MAIN ORB (The Floating Button) */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl border-2
          ${isOpen 
            ? 'bg-slate-900 border-white/20 rotate-90 scale-90' 
            : 'bg-white/40 backdrop-blur-xl border-blue-500/50 hover:scale-110 hover:shadow-blue-500/20'
          }
        `}
      >
        {isOpen ? (
          <X size={32} className="text-white" />
        ) : (
          <div className="relative">
            <Sparkles size={32} className="text-blue-600 drop-shadow-md" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
          </div>
        )}
      </button>

    </div>
  );
}