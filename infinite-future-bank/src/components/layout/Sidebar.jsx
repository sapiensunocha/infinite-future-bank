import React from 'react';
import { 
  Sparkles, X, Compass, ArrowDownUp, Target, Landmark, Folder, Briefcase, 
  Building, Globe, BookOpen, Users, ShieldCheck, Share2, Settings, LogOut 
} from 'lucide-react';

export default function Sidebar({ isSidebarOpen, setIsSidebarOpen, activeTab, setActiveTab, tabTitles, onSignOut }) {
  const tabs = [
    { id: 'NET_POSITION', icon: <Compass size={18} />, label: 'Home' },
    { id: 'TRANSACTIONS', icon: <ArrowDownUp size={18} />, label: 'Transactions' },
    { id: 'PLANNER', icon: <Target size={18} />, label: 'Planner' },
    { id: 'ACCOUNTS', icon: <Landmark size={18} />, label: 'Accounts' },
    { id: 'ORGANIZE', icon: <Folder size={18} />, label: 'Organize' },
    { id: 'INVEST', icon: <Briefcase size={18} />, label: 'Wealth' },
    { id: 'COMMERCIAL_HUB', icon: <Building size={18} />, label: 'Commercial' },
    { id: 'LIFESTYLE', icon: <Globe size={18} />, label: 'Lifestyle' },
    { id: 'TRAINING', icon: <BookOpen size={18} />, label: 'Training' },
    { id: 'AGENTS', icon: <Users size={18} />, label: 'Your Team' },
    { id: 'INSURANCE', icon: <ShieldCheck size={18} />, label: 'Insurance' },
    { id: 'NETWORK', icon: <Share2 size={18} />, label: 'Capital Network' },
    { id: 'SETTINGS', icon: <Settings size={18} />, label: 'Settings' },
  ];

  return (
    <>
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden cursor-pointer" onClick={(e) => { e.preventDefault(); setIsSidebarOpen(false); }} onTouchEnd={(e) => { e.preventDefault(); setIsSidebarOpen(false); }}></div>
      )}
      <aside className={`fixed md:static inset-y-0 left-0 z-[150] w-64 bg-slate-100/80 backdrop-blur-xl border-r border-slate-200/60 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]`}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-4xl font-black text-[#4285F4]">D</span>
            <span className="text-4xl font-black text-[#EA4335]">E</span>
            <span className="text-4xl font-black text-[#FBBC04]">U</span>
            <span className="text-4xl font-black text-[#34A853]">S</span>
            <Sparkles size={18} className="text-blue-500 ml-1" />
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-slate-800 p-2">
            <X size={24} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-4 space-y-2 no-scrollbar scroll-container">
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === item.id ? 'bg-blue-600/10 text-blue-600 shadow-inner' : 'text-slate-500 hover:bg-white/50 hover:text-slate-800'}`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-200/60">
          <button onClick={onSignOut} className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-200/50 hover:text-slate-800 transition-all">
            <LogOut size={16} /> SECURE EXIT
          </button>
        </div>
      </aside>
    </>
  );
}