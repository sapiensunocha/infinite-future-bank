import React from 'react';
import { Compass, ArrowDownUp, LayoutGrid, Bell, Menu } from 'lucide-react';

const PRIMARY_TABS = ['NET_POSITION', 'TRANSACTIONS'];

export default function BottomNav({ activeTab, setActiveTab, setIsAppDrawerOpen, unreadCount, setIsSidebarOpen, t }) {
  const items = [
    { id: 'NET_POSITION', Icon: Compass,     label: t('nav.home') },
    { id: 'TRANSACTIONS', Icon: ArrowDownUp,  label: t('nav.transactions') },
    { id: 'APPS',         Icon: LayoutGrid,   label: t('nav.apps') },
    { id: 'ALERTS',       Icon: Bell,         label: t('nav.alerts'), badge: unreadCount },
    { id: 'MORE',         Icon: Menu,         label: t('nav.more') },
  ];

  const handlePress = (id) => {
    if (id === 'APPS')   return setIsAppDrawerOpen(true);
    if (id === 'MORE')   return setIsSidebarOpen(true);
    if (id === 'ALERTS') return; // handled separately via header dropdown
    setActiveTab(id);
  };

  const isActive = (id) => {
    if (id === 'APPS' || id === 'ALERTS') return false;
    if (id === 'MORE') return !PRIMARY_TABS.includes(activeTab) && activeTab !== 'SETTINGS';
    return activeTab === id;
  };

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-[120] md:hidden bg-white/95 backdrop-blur-xl border-t border-slate-200/70 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 4px)' }}
    >
      <div className="flex items-stretch">
        {items.map(({ id, Icon, label, badge }) => {
          const active = isActive(id);
          return (
            <button
              key={id}
              onClick={() => handlePress(id)}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 relative transition-colors ${active ? 'text-blue-600' : 'text-slate-400 active:text-slate-600'}`}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-b-full" />
              )}
              <div className="relative">
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                {badge > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[16px] h-4 bg-red-500 text-white rounded-full text-[8px] font-black flex items-center justify-center px-0.5 border border-white">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span className={`text-[9px] font-black uppercase tracking-wide leading-none ${active ? 'text-blue-600' : ''}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
