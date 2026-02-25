import React from 'react';
import { Sparkles, Search } from 'lucide-react';

export default function Header({ activeFeature, setActiveFeature }) {
  
  const navItems = [
    { id: 'dashboard', label: 'Wealth Overview' },
    { id: 'treasury', label: 'Allocators' },
    { id: 'lending', label: 'Credit Lines' },
    { id: 'marketplace', label: 'War Room Assets' },
  ];

  return (
    <header className="bg-white/60 backdrop-blur-2xl border-b border-white/60 sticky top-0 z-[60] px-10 py-6 shadow-sm">
      <div className="max-w-[1800px] mx-auto flex flex-col xl:flex-row justify-between items-center gap-10">
        
        {/* YOUR EXACT LOGO FROM MI DASHBOARD */}
        <div 
          className="flex flex-col gap-1 cursor-pointer" 
          onClick={() => setActiveFeature('dashboard')}
        >
          <div className="flex items-center gap-1 drop-shadow-sm">
            <span className="text-5xl font-black text-ifb-logoI">I</span>
            <span className="text-5xl font-black text-ifb-logoF">F</span>
            <span className="text-5xl font-black text-ifb-logoB">B</span>
            <Sparkles className="text-ifb-logoG ml-3 drop-shadow-md" size={32} />
          </div>
          <span className="text-sm font-bold text-slate-500 uppercase tracking-widest ml-1">DEUS CORE BANKING</span>
        </div>

        {/* GLASS PILL NAVIGATION */}
        <nav className="flex items-center bg-white/40 backdrop-blur-md p-1.5 rounded-[1rem] border border-white/60 shadow-inner">
          {navItems.map((item) => {
            const isActive = activeFeature === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveFeature(item.id)}
                className={`
                  flex items-center gap-2 px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300
                  ${isActive 
                    ? 'bg-white/90 text-ifb-logoI shadow-md border border-white/50' 
                    : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'
                  }
                `}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* DEUS AI CHAT BUTTON */}
        <button 
          onClick={() => setActiveFeature('ai-banker')}
          className="bg-ifb-blue/90 text-white px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-ifb-blue hover:shadow-lg transition-all border border-white/30"
        >
          <Sparkles size={14} /> Wake DEUS AI
        </button>

      </div>
    </header>
  );
}