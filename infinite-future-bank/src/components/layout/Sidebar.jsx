import React from 'react';
import {
  Sparkles, X, Compass, ArrowDownUp, Target, Landmark, Folder, Briefcase,
  Building, Globe, BookOpen, Users, ShieldCheck, Share2, Settings, LogOut
} from 'lucide-react';

export default function Sidebar({ isSidebarOpen, setIsSidebarOpen, activeTab, setActiveTab, onSignOut, t }) {
  const tabs = [
    { id: 'NET_POSITION',    icon: <Compass size={18} />,    label: t('nav.home') },
    { id: 'TRANSACTIONS',    icon: <ArrowDownUp size={18} />, label: t('nav.transactions') },
    { id: 'PLANNER',         icon: <Target size={18} />,      label: t('nav.planner') },
    { id: 'ACCOUNTS',        icon: <Landmark size={18} />,    label: t('nav.accounts') },
    { id: 'ORGANIZE',        icon: <Folder size={18} />,      label: t('nav.organize') },
    { id: 'INVEST',          icon: <Briefcase size={18} />,   label: t('nav.wealth') },
    { id: 'COMMERCIAL_HUB', icon: <Building size={18} />,    label: t('nav.commercial') },
    { id: 'LIFESTYLE',       icon: <Globe size={18} />,       label: t('nav.lifestyle') },
    { id: 'TRAINING',        icon: <BookOpen size={18} />,    label: t('nav.training') },
    { id: 'AGENTS',          icon: <Users size={18} />,       label: t('nav.team') },
    { id: 'INSURANCE',       icon: <ShieldCheck size={18} />, label: t('nav.insurance') },
    { id: 'NETWORK',         icon: <Share2 size={18} />,      label: t('nav.network') },
    { id: 'SETTINGS',        icon: <Settings size={18} />,    label: t('nav.settings') },
  ];

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden cursor-pointer"
          onClick={() => setIsSidebarOpen(false)}
          onTouchEnd={(e) => { e.preventDefault(); setIsSidebarOpen(false); }}
        />
      )}

      <aside className={`
        fixed md:static inset-y-0 left-0 z-[150] w-64
        bg-slate-100/90 backdrop-blur-xl border-r border-slate-200/60
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        flex flex-col
        pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]
      `}>
        {/* Brand header */}
        <div className="p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1">
            <span className="text-4xl font-black text-[#4285F4]">D</span>
            <span className="text-4xl font-black text-[#EA4335]">E</span>
            <span className="text-4xl font-black text-[#FBBC04]">U</span>
            <span className="text-4xl font-black text-[#34A853]">S</span>
            <Sparkles size={18} className="text-blue-500 ml-1" />
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden text-slate-400 hover:text-slate-800 p-2 rounded-xl hover:bg-white/50 transition-colors"
          >
            <X size={22} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-4 space-y-1 no-scrollbar scroll-container">
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                activeTab === item.id
                  ? 'bg-blue-600/10 text-blue-600 shadow-inner'
                  : 'text-slate-500 hover:bg-white/60 hover:text-slate-800 active:bg-white/80'
              }`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>

        {/* Sign out */}
        <div className="p-4 border-t border-slate-200/60 shrink-0">
          <button
            onClick={onSignOut}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-200/60 hover:text-slate-800 transition-all"
          >
            <LogOut size={16} /> {t('nav.signOut')}
          </button>
        </div>
      </aside>
    </>
  );
}
