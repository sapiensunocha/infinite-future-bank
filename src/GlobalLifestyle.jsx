import { useState } from 'react';
import { 
  Plane, Wifi, ShieldPlus, Gift, 
  Coffee, Compass, HeartHandshake, Gem,
  ArrowRight, ChevronRight, TicketPercent
} from 'lucide-react';

export default function GlobalLifestyle() {
  const [activePortal, setActivePortal] = useState('TRAVEL'); // TRAVEL, LIFESTYLE, CONCIERGE

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      
      {/* 🏛️ Top Header & Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/60 backdrop-blur-2xl border border-white/60 p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/40">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Sovereign Lifestyle</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Global access and institutional perks</p>
        </div>
        
        <div className="flex bg-white/50 p-2 rounded-2xl border border-white/40 shadow-inner w-full md:w-auto overflow-x-auto">
          {[
            { id: 'TRAVEL', label: 'Global Travel' },
            { id: 'LIFESTYLE', label: 'Lifestyle & Perks' },
            { id: 'CONCIERGE', label: 'Private Concierge' }
          ].map((portal) => (
            <button 
              key={portal.id}
              onClick={() => setActivePortal(portal.id)}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activePortal === portal.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}
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
          
          {/* Hero Banner: Lounges */}
          <div className="bg-slate-900 text-white p-10 md:p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 group">
            <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-[80px] group-hover:bg-blue-500/30 transition-all"></div>
            <div className="relative z-10 max-w-lg">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-blue-400 mb-6 backdrop-blur-md border border-white/20"><Coffee size={28}/></div>
              <h3 className="text-3xl font-black tracking-tight mb-4">1,000+ Global Lounges</h3>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mb-8">
                Bypass the terminal chaos. Your DEUS identity grants you and a guest complimentary access to premium airport lounges worldwide.
              </p>
              <button className="px-6 py-4 bg-white text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 transition-transform flex items-center gap-2">
                Generate Access Pass <ArrowRight size={16}/>
              </button>
            </div>
            <div className="relative z-10 opacity-20 hidden md:block"><Plane size={180}/></div>
          </div>

          {/* Secondary Travel Perks */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/60 backdrop-blur-2xl border border-white/60 p-8 rounded-[2.5rem] shadow-xl hover:-translate-y-1 transition-transform cursor-pointer">
               <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-6"><Compass size={20}/></div>
               <h4 className="text-sm font-black text-slate-800 mb-2">Fast Track Security</h4>
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">Skip the queues at participating global airports.</p>
               <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-[#34A853]">Activate <ChevronRight size={14}/></div>
            </div>
            
            <div className="bg-white/60 backdrop-blur-2xl border border-white/60 p-8 rounded-[2.5rem] shadow-xl hover:-translate-y-1 transition-transform cursor-pointer">
               <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-6"><Plane size={20}/></div>
               <h4 className="text-sm font-black text-slate-800 mb-2">Airline Miles Sync</h4>
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">Convert IFB RevPoints directly into partner airline miles.</p>
               <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-[#4285F4]">Transfer <ChevronRight size={14}/></div>
            </div>

            <div className="bg-white/60 backdrop-blur-2xl border border-white/60 p-8 rounded-[2.5rem] shadow-xl hover:-translate-y-1 transition-transform cursor-pointer">
               <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mb-6"><Gem size={20}/></div>
               <h4 className="text-sm font-black text-slate-800 mb-2">Curated Experiences</h4>
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">Book private villas and VIP travel activities.</p>
               <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-indigo-600">Explore <ChevronRight size={14}/></div>
            </div>
          </div>
        </div>
      )}

      {/* PORTAL 2: LIFESTYLE & PERKS */}
      {activePortal === 'LIFESTYLE' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-left-4">
          
          <div className="bg-white/60 backdrop-blur-2xl border border-white/60 p-10 rounded-[3rem] shadow-xl group">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-[#4285F4] mb-8 shadow-inner"><Wifi size={28}/></div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Global Data eSIM</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed mb-8">
              Never pay roaming fees again. Install your DEUS Global eSIM for high-speed connectivity in over 150 countries. Automatically activates upon landing.
            </p>
            <button className="w-full py-4 bg-white border border-blue-200 text-[#4285F4] rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:bg-blue-50 transition-colors">
              Install Profile (Free)
            </button>
          </div>

          <div className="bg-white/60 backdrop-blur-2xl border border-white/60 p-10 rounded-[3rem] shadow-xl group">
            <div className="w-14 h-14 rounded-2xl bg-[#FBBC04]/20 flex items-center justify-center text-[#FBBC04] mb-8 shadow-inner"><TicketPercent size={28}/></div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Institutional Subscriptions</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed mb-8">
              Access up to €4,300 in annual value. Includes FT Premium, ClassPass, MasterClass, and high-end VPNs, fully covered by your IFB tier.
            </p>
            <button className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-colors">
              Manage Subscriptions
            </button>
          </div>

          <div className="bg-white/60 backdrop-blur-2xl border border-white/60 p-10 rounded-[3rem] shadow-xl">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><ShieldPlus size={20}/></div>
              <div>
                <h3 className="text-sm font-black text-slate-800">Comprehensive Insurance</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Travel, Device, & Purchase</p>
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">Your purchases and journeys are automatically covered up to $100,000.</p>
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-[#34A853] cursor-pointer">View Policy <ChevronRight size={14}/></div>
          </div>

          <div className="bg-white/60 backdrop-blur-2xl border border-white/60 p-10 rounded-[3rem] shadow-xl">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-500"><HeartHandshake size={20}/></div>
              <div>
                <h3 className="text-sm font-black text-slate-800">Philanthropy</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Support Global Causes</p>
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">Seamlessly round up spare change or donate direct to vetted global charities.</p>
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-red-500 cursor-pointer">Make a Difference <ChevronRight size={14}/></div>
          </div>
        </div>
      )}

      {/* PORTAL 3: CONCIERGE */}
      {activePortal === 'CONCIERGE' && (
        <div className="bg-white/60 backdrop-blur-3xl border border-white/60 p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden animate-in slide-in-from-left-4 text-center">
           <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-300/20 blur-[80px]"></div>
           <div className="relative z-10 max-w-2xl mx-auto space-y-8">
              <div className="w-24 h-24 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-indigo-600 mx-auto shadow-xl border border-white">
                <Gem size={40}/>
              </div>
              <div>
                <h3 className="text-3xl font-black text-slate-800 tracking-tight mb-4">Your Private Concierge</h3>
                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                  Connect instantly with our dedicated global lifestyle managers. Whether securing impossible dinner reservations, sourcing luxury goods, or chartering flights, your concierge is available 24/7.
                </p>
              </div>
              <button className="w-full py-6 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-indigo-500/30 hover:-translate-y-1 transition-all active:scale-95">
                Initiate Secure Request
              </button>
           </div>
        </div>
      )}

    </div>
  );
}