import React from 'react';
import {
  Sparkles, X, Compass, ArrowDownUp, Target, Landmark, Folder, Briefcase,
  Building, Globe, BookOpen, Users, ShieldCheck, Share2, Settings, LogOut, Shield,
  Building2, LifeBuoy
} from 'lucide-react';
import AppSwitcher from '../AppSwitcher';
import FeatureBadge from '../ui/FeatureBadge';

export default function Sidebar({ isSidebarOpen, setIsSidebarOpen, activeTab, setActiveTab, onSignOut, onOpenAdmin, t, commercialProfile, supabase }) {
  const isCapitalEligible = commercialProfile?.pascaline_status === 'eligible_for_funding';
  const tabs = [
    { id: 'NET_POSITION',    icon: <Compass size={18} />,    label: t('nav.home') },
    { id: 'TRANSACTIONS',    icon: <ArrowDownUp size={18} />, label: t('nav.transactions') },
    { id: 'PLANNER',         icon: <Target size={18} />,      label: t('nav.planner') },
    { id: 'ACCOUNTS',        icon: <Landmark size={18} />,    label: t('nav.accounts') },
    { id: 'ORGANIZE',        icon: <Folder size={18} />,      label: t('nav.organize') },
    { id: 'INVEST',          icon: <Briefcase size={18} />,   label: t('nav.wealth') },
    { id: 'LISTINGS',        icon: <Building2 size={18} />,  label: 'Company Listings' },
    { id: 'COMMERCIAL_HUB', icon: <Building size={18} />,    label: t('nav.commercial') },
    { id: 'LIFESTYLE',       icon: <Globe size={18} />,       label: t('nav.lifestyle') },
    { id: 'TRAINING',        icon: <BookOpen size={18} />,    label: t('nav.training') },
    { id: 'AGENTS',          icon: <Users size={18} />,       label: t('nav.team') },
    { id: 'INSURANCE',       icon: <ShieldCheck size={18} />, label: t('nav.insurance') },
    { id: 'NETWORK',         icon: <Share2 size={18} />,      label: 'AFR Node' },
    { id: 'HELP',            icon: <LifeBuoy size={18} />,    label: 'Help & support' },
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
        fixed md:static inset-y-0 left-0 z-[150] w-64 bg-slate-100/90 backdrop-blur-xl border-r border-slate-200/60 transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]
      `}>
        {/* Brand header */}
        <div className="p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-3xl font-bold text-slate-900 tracking-tight">DEUS</span>
            <span className="px-1.5 py-0.5 text-xs font-bold rounded bg-blue-100 text-blue-700">OS</span>
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
              onClick={() => { if (item.id === 'HELP') window.dispatchEvent(new CustomEvent('ifb:open-help')); else setActiveTab(item.id); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[15px] font-medium transition-colors ${
                activeTab === item.id
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="flex-1 min-w-0 text-left truncate">{item.label}</span>
              <FeatureBadge id={item.id} compact className="shrink-0" />
            </button>
          ))}
        </nav>

        {/* App switcher */}
        <div className="px-4 pb-2">
          <AppSwitcher currentApp="core" supabase={supabase} light />
        </div>

        {/* Sign out + Admin */}
        <div className="p-4 border-t border-slate-200/60 shrink-0 space-y-2">
          {onOpenAdmin && (
            <button
              onClick={() => { onOpenAdmin(); setIsSidebarOpen(false); }}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-[15px] font-medium text-red-600 hover:bg-red-50 border border-red-100 hover:border-red-200 transition-all"
            >
              <Shield size={14}/> Admin Center
            </button>
          )}
          <button
            onClick={onSignOut}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-[15px] font-medium text-slate-600 hover:bg-slate-200/60 hover:text-slate-800 transition-all"
          >
            <LogOut size={16} /> {t('nav.signOut')}
          </button>
        </div>
      </aside>
    </>
  );
}
