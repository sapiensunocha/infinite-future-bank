import React from 'react';
import { Compass, ArrowDownUp, LayoutGrid, Bell, Menu } from 'lucide-react';

const PRIMARY_TABS = ['NET_POSITION', 'TRANSACTIONS'];

export default function BottomNav({
  activeTab, setActiveTab, setIsAppDrawerOpen,
  unreadCount, setIsSidebarOpen, setIsNotificationMenuOpen, t
}) {
  const items = [
    { id: 'NET_POSITION', Icon: Compass,    label: t('nav.home') },
    { id: 'TRANSACTIONS', Icon: ArrowDownUp, label: t('nav.transactions') },
    { id: 'APPS',         Icon: LayoutGrid,  label: t('nav.apps') },
    { id: 'ALERTS',       Icon: Bell,        label: t('nav.alerts'), badge: unreadCount },
    { id: 'MORE',         Icon: Menu,        label: t('nav.more') },
  ];

  const handlePress = (id) => {
    if (id === 'APPS')   { setIsAppDrawerOpen(prev => !prev); return; }
    if (id === 'MORE')   { setIsSidebarOpen(true); return; }
    if (id === 'ALERTS') { setIsNotificationMenuOpen(prev => !prev); return; }
    setActiveTab(id);
  };

  const isActive = (id) => {
    if (id === 'APPS' || id === 'ALERTS') return false;
    if (id === 'MORE') return !PRIMARY_TABS.includes(activeTab) && activeTab !== 'NET_POSITION';
    return activeTab === id;
  };

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-[120] md:hidden bg-white/97 backdrop-blur-2xl border-t border-slate-200/60 shadow-[0_-8px_32px_rgba(0,0,0,0.08)]"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 6px)' }}
    >
      <div className="flex items-stretch max-w-lg mx-auto">
        {items.map(({ id, Icon, label, badge }) => {
          const active = isActive(id);
          return (
            <button
              key={id}
              onClick={() => handlePress(id)}
              className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 relative transition-all duration-200 ${
                active ? 'text-blue-600' : 'text-slate-400 active:text-slate-600 active:scale-90'
              }`}
            >
              {/* Active pill indicator */}
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-blue-600 rounded-b-full transition-all duration-300" />
              )}

              <div className="relative">
                <div className={`transition-transform duration-200 ${active ? 'scale-110' : ''}`}>
                  <Icon size={21} strokeWidth={active ? 2.5 : 1.8} />
                </div>
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] bg-red-500 text-white rounded-full text-[8px] font-black flex items-center justify-center px-1 border-2 border-white shadow-sm">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>

              <span className={`text-[9px] font-black uppercase tracking-wide leading-none transition-colors ${active ? 'text-blue-600' : 'text-slate-400'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
