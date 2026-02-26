import { useState } from 'react';
import { 
  Plane, Wifi, ShieldPlus, Gift, 
  Coffee, Compass, HeartHandshake, Gem,
  ArrowRight, ChevronRight, TicketPercent
} from 'lucide-react';

export default function GlobalLifestyle() {
  const [activePortal, setActivePortal] = useState('TRAVEL'); // TRAVEL, LIFESTYLE, CONCIERGE

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 text-slate-800">
      
      {/* 🏛️ Top Header & Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white border border-slate-200 p-6 rounded-[2.5rem] shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Sovereign Lifestyle</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mt-1">Global access and institutional perks</p>
        </div>
        
        <div className="flex bg-slate-100 p-2 rounded-2xl border border-slate-200 shadow-inner w-full md:w-auto overflow-x-auto no-scrollbar">
          {[
            { id: 'TRAVEL', label: 'Global Travel' },
            { id: 'LIFESTYLE', label: 'Lifestyle & Perks' },
            { id: 'CONCIERGE', label: 'Private Concierge' }
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
          
          {/* Hero Banner: Lounges - Kept dark for premium contrast */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-10 md:p-12 rounded-[3.5rem] shadow-xl border border-slate-700 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 group">
            <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-[80px] group-hover:bg-blue-500/30 transition-all pointer-events-none"></div>
            <div className="relative z-10 max-w-lg">
              <div className="w-14 h-14 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center text-blue-400 mb-6 shadow-sm"><Coffee size={28}/></div>
              <h3 className="text-3xl font-black tracking-tight mb-4 text-white">1,000+ Global Lounges</h3>
              <p className="text-[11px] font-bold text-slate-300 uppercase tracking-widest leading-relaxed mb-8">
                Bypass the terminal chaos. Your DEUS identity grants you and a guest complimentary access to premium airport lounges worldwide.
              </p>
              <button className="px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-blue-500 hover:-translate-y-1 transition-all flex items-center gap-2">
                Generate Access Pass <ArrowRight size={16}/>
              </button>
            </div>
            <div className="relative z-10 opacity-10 hidden md:block text-white"><Plane size={180}/></div>
          </div>

          {/* Secondary Travel Perks */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer group">
               <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-6"><Compass size={20}/></div>
               <h4 className="text-sm font-black text-slate-800 mb-2">Fast Track Security</h4>
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">Skip the queues at participating global airports.</p>
               <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-emerald-600 group-hover:translate-x-1 transition-transform">Activate <ChevronRight size={14}/></div>
            </div>
            
            <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group">
               <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-6"><Plane size={20}/></div>
               <h4 className="text-sm font-black text-slate-800 mb-2">Airline Miles Sync</h4>
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">Convert IFB RevPoints directly into partner airline miles.</p>
               <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-blue-600 group-hover:translate-x-1 transition-transform">Transfer <ChevronRight size={14}/></div>
            </div>

            <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group">
               <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 mb-6"><Gem size={20}/></div>
               <h4 className="text-sm font-black text-slate-800 mb-2">Curated Experiences</h4>
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">Book private villas and VIP travel activities.</p>
               <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-indigo-500 group-hover:translate-x-1 transition-transform">Explore <ChevronRight size={14}/></div>
            </div>
          </div>
        </div>
      )}

      {/* PORTAL 2: LIFESTYLE & PERKS */}
      {activePortal === 'LIFESTYLE' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-left-4">
          
          <div className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-sm group hover:border-blue-200 transition-colors">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-8"><Wifi size={28}/></div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Global Data eSIM</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed mb-8">
              Never pay roaming fees again. Install your DEUS Global eSIM for high-speed connectivity in over 150 countries. Automatically activates upon landing.
            </p>
            <button className="w-full py-4 bg-slate-50 border border-slate-200 text-blue-600 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:bg-slate-100 transition-colors">
              Install Profile (Free)
            </button>
          </div>

          <div className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-sm group hover:border-indigo-200 transition-colors">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 mb-8"><TicketPercent size={28}/></div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Institutional Subscriptions</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed mb-8">
              Access up to €4,300 in annual value. Includes FT Premium, ClassPass, MasterClass, and high-end VPNs, fully covered by your IFB tier.
            </p>
            <button className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-colors">
              Manage Subscriptions
            </button>
          </div>

          <div className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-sm hover:shadow-md transition-all cursor-pointer group">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600"><ShieldPlus size={20}/></div>
              <div>
                <h3 className="text-sm font-black text-slate-800">Comprehensive Insurance</h3>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Travel, Device, & Purchase</p>
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">Your purchases and journeys are automatically covered up to $100,000.</p>
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-emerald-600 group-hover:translate-x-1 transition-transform">View Policy <ChevronRight size={14}/></div>
          </div>

          <div className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-sm hover:shadow-md transition-all cursor-pointer group">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-500"><HeartHandshake size={20}/></div>
               <div>
                <h3 className="text-sm font-black text-slate-800">Philanthropy</h3>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Support Global Causes</p>
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">Seamlessly round up spare change or donate direct to vetted global charities.</p>
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-red-500 group-hover:translate-x-1 transition-transform">Make a Difference <ChevronRight size={14}/></div>
          </div>
        </div>
      )}

      {/* PORTAL 3: CONCIERGE */}
      {activePortal === 'CONCIERGE' && (
        <div className="bg-gradient-to-b from-slate-50 to-white border border-slate-200 p-12 rounded-[3.5rem] shadow-sm relative overflow-hidden animate-in slide-in-from-left-4 text-center">
           <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-50 blur-[80px] pointer-events-none"></div>
           <div className="relative z-10 max-w-2xl mx-auto space-y-8">
              <div className="w-24 h-24 bg-white border border-indigo-100 rounded-full flex items-center justify-center text-indigo-500 mx-auto shadow-sm">
                <Gem size={40}/>
              </div>
              <div>
                <h3 className="text-3xl font-black text-slate-800 tracking-tight mb-4">Your Private Concierge</h3>
                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                  Connect instantly with our dedicated global lifestyle managers. Whether securing impossible dinner reservations, sourcing luxury goods, or chartering flights, your concierge is available 24/7.
                </p>
              </div>
              <button className="w-full py-6 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg hover:bg-slate-800 hover:-translate-y-1 transition-all active:scale-95">
                Initiate Secure Request
              </button>
           </div>
        </div>
      )}

    </div>
  );
}