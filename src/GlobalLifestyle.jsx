import { useState } from 'react';
import { 
  Plane, Wifi, ShieldPlus, Gift, 
  Coffee, Compass, HeartHandshake, Gem,
  ArrowRight, ChevronRight, TicketPercent
} from 'lucide-react';

export default function GlobalLifestyle() {
  const [activePortal, setActivePortal] = useState('TRAVEL'); // TRAVEL, LIFESTYLE, CONCIERGE

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 text-white">
      
      {/* 🏛️ Top Header & Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/5 backdrop-blur-2xl border border-white/10 p-6 rounded-[2.5rem] shadow-glass">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Sovereign Lifestyle</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-ifb-primary mt-1">Global access and institutional perks</p>
        </div>
        
        <div className="flex bg-black/40 p-2 rounded-2xl border border-white/5 shadow-inner w-full md:w-auto overflow-x-auto custom-scrollbar">
          {[
            { id: 'TRAVEL', label: 'Global Travel' },
            { id: 'LIFESTYLE', label: 'Lifestyle & Perks' },
            { id: 'CONCIERGE', label: 'Private Concierge' }
          ].map((portal) => (
            <button 
              key={portal.id}
              onClick={() => setActivePortal(portal.id)}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activePortal === portal.id ? 'bg-ifb-primary text-white shadow-glow-blue' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
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
          <div className="bg-gradient-to-br from-black to-[#0B0F19] text-white p-10 md:p-12 rounded-[3.5rem] shadow-glass border border-white/10 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 group">
            <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-ifb-primary/10 rounded-full blur-[80px] group-hover:bg-ifb-primary/20 transition-all pointer-events-none"></div>
            <div className="relative z-10 max-w-lg">
              <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-ifb-primary mb-6 shadow-inner"><Coffee size={28}/></div>
              <h3 className="text-3xl font-black tracking-tight mb-4">1,000+ Global Lounges</h3>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mb-8">
                Bypass the terminal chaos. Your DEUS identity grants you and a guest complimentary access to premium airport lounges worldwide.
              </p>
              <button className="px-6 py-4 bg-ifb-primary text-white border border-blue-400/30 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-glow-blue hover:-translate-y-1 transition-transform flex items-center gap-2">
                Generate Access Pass <ArrowRight size={16}/>
              </button>
            </div>
            <div className="relative z-10 opacity-10 hidden md:block text-white"><Plane size={180}/></div>
          </div>

          {/* Secondary Travel Perks */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-glass hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer group">
               <div className="w-10 h-10 rounded-full bg-ifb-success/20 border border-ifb-success/30 flex items-center justify-center text-ifb-success mb-6 shadow-glow"><Compass size={20}/></div>
               <h4 className="text-sm font-black text-white mb-2">Fast Track Security</h4>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Skip the queues at participating global airports.</p>
               <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-ifb-success group-hover:translate-x-1 transition-transform">Activate <ChevronRight size={14}/></div>
            </div>
            
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-glass hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer group">
               <div className="w-10 h-10 rounded-full bg-ifb-primary/20 border border-ifb-primary/30 flex items-center justify-center text-ifb-primary mb-6 shadow-glow-blue"><Plane size={20}/></div>
               <h4 className="text-sm font-black text-white mb-2">Airline Miles Sync</h4>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Convert IFB RevPoints directly into partner airline miles.</p>
               <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-ifb-primary group-hover:translate-x-1 transition-transform">Transfer <ChevronRight size={14}/></div>
            </div>

            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-glass hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer group">
               <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6 shadow-glow"><Gem size={20}/></div>
               <h4 className="text-sm font-black text-white mb-2">Curated Experiences</h4>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Book private villas and VIP travel activities.</p>
               <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-indigo-400 group-hover:translate-x-1 transition-transform">Explore <ChevronRight size={14}/></div>
            </div>
          </div>
        </div>
      )}

      {/* PORTAL 2: LIFESTYLE & PERKS */}
      {activePortal === 'LIFESTYLE' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-left-4">
          
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-10 rounded-[3rem] shadow-glass group hover:border-ifb-primary/30 transition-colors">
            <div className="w-14 h-14 rounded-2xl bg-ifb-primary/20 border border-ifb-primary/30 flex items-center justify-center text-ifb-primary mb-8 shadow-glow-blue"><Wifi size={28}/></div>
            <h3 className="text-2xl font-black text-white tracking-tight mb-2">Global Data eSIM</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mb-8">
              Never pay roaming fees again. Install your DEUS Global eSIM for high-speed connectivity in over 150 countries. Automatically activates upon landing.
            </p>
            <button className="w-full py-4 bg-black/40 border border-white/10 text-ifb-primary rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-inner hover:bg-black/60 transition-colors">
              Install Profile (Free)
            </button>
          </div>

          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-10 rounded-[3rem] shadow-glass group hover:border-ifb-logoB/30 transition-colors">
            <div className="w-14 h-14 rounded-2xl bg-ifb-logoB/20 border border-ifb-logoB/30 flex items-center justify-center text-ifb-logoB mb-8 shadow-glow"><TicketPercent size={28}/></div>
            <h3 className="text-2xl font-black text-white tracking-tight mb-2">Institutional Subscriptions</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mb-8">
              Access up to €4,300 in annual value. Includes FT Premium, ClassPass, MasterClass, and high-end VPNs, fully covered by your IFB tier.
            </p>
            <button className="w-full py-4 bg-ifb-primary border border-blue-400/30 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-glow-blue hover:bg-blue-600 transition-colors">
              Manage Subscriptions
            </button>
          </div>

          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-10 rounded-[3rem] shadow-glass hover:bg-white/10 transition-colors cursor-pointer group">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-full bg-ifb-success/20 border border-ifb-success/30 flex items-center justify-center text-ifb-success shadow-glow"><ShieldPlus size={20}/></div>
              <div>
                <h3 className="text-sm font-black text-white">Comprehensive Insurance</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Travel, Device, & Purchase</p>
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Your purchases and journeys are automatically covered up to $100,000.</p>
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-ifb-success group-hover:translate-x-1 transition-transform">View Policy <ChevronRight size={14}/></div>
          </div>

          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-10 rounded-[3rem] shadow-glass hover:bg-white/10 transition-colors cursor-pointer group">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shadow-glow"><HeartHandshake size={20}/></div>
               <div>
                <h3 className="text-sm font-black text-white">Philanthropy</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Support Global Causes</p>
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Seamlessly round up spare change or donate direct to vetted global charities.</p>
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-red-400 group-hover:translate-x-1 transition-transform">Make a Difference <ChevronRight size={14}/></div>
          </div>
        </div>
      )}

      {/* PORTAL 3: CONCIERGE */}
      {activePortal === 'CONCIERGE' && (
        <div className="bg-gradient-to-b from-white/5 to-transparent backdrop-blur-3xl border border-white/10 p-12 rounded-[3.5rem] shadow-glass relative overflow-hidden animate-in slide-in-from-left-4 text-center">
           <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-ifb-accent/10 blur-[80px] pointer-events-none"></div>
           <div className="relative z-10 max-w-2xl mx-auto space-y-8">
              <div className="w-24 h-24 bg-black/50 border border-ifb-accent/30 rounded-full flex items-center justify-center text-ifb-accent mx-auto shadow-glow">
                <Gem size={40}/>
              </div>
              <div>
                <h3 className="text-3xl font-black text-white tracking-tight mb-4">Your Private Concierge</h3>
                <p className="text-sm font-medium text-slate-400 leading-relaxed">
                  Connect instantly with our dedicated global lifestyle managers. Whether securing impossible dinner reservations, sourcing luxury goods, or chartering flights, your concierge is available 24/7.
                </p>
              </div>
              <button className="w-full py-6 bg-ifb-primary border border-blue-400/30 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-glow-blue hover:bg-blue-600 hover:-translate-y-1 transition-all active:scale-95">
                Initiate Secure Request
              </button>
           </div>
        </div>
      )}

    </div>
  );
}