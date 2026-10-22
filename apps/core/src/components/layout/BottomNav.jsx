import React from 'react';
import { Compass, ArrowDownUp, CreditCard, Bell, Menu } from 'lucide-react';

const PRIMARY_TABS = ['NET_POSITION', 'TRANSACTIONS'];

export default function BottomNav({
  activeTab, setActiveTab, setIsAppDrawerOpen,
  unreadCount, setIsSidebarOpen, setIsNotificationMenuOpen,
  setShowNFC, setShowTapToPay, t
}) {
  const left = [
    { id: 'NET_POSITION', Icon: Compass,     label: t('nav.home') },
    { id: 'TRANSACTIONS', Icon: ArrowDownUp, label: t('nav.transactions') },
  ];
  const right = [
    { id: 'ALERTS', Icon: Bell,  label: t('nav.alerts'), badge: unreadCount },
    { id: 'MORE',   Icon: Menu,  label: t('nav.more') },
  ];

  const handlePress = (id) => {
    if (id === 'MORE')   { setIsSidebarOpen(true); return; }
    if (id === 'ALERTS') { setIsNotificationMenuOpen(prev => !prev); return; }
    setActiveTab(id);
  };

  const isActive = (id) => PRIMARY_TABS.includes(id) ? activeTab === id : false;

  const NavBtn = ({ id, Icon, label, badge }) => {
    const active = isActive(id);
    return (
      <button
        onClick={() => handlePress(id)}
        className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 relative transition-all duration-200 ${
          active ? 'text-blue-600' : 'text-slate-400 active:text-slate-600 active:scale-90'
        }`}
      >
        {active && (
          <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-blue-600 rounded-b-full" />
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
        <span className={`text-[9px] font-black uppercase tracking-wide leading-none ${active ? 'text-blue-600' : 'text-slate-400'}`}>
          {label}
        </span>
      </button>
    );
  };

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-[120] md:hidden bg-white/97 backdrop-blur-2xl border-t border-slate-200/60 shadow-[0_-8px_32px_rgba(0,0,0,0.08)]"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 6px)' }}
    >
      <div className="flex items-end max-w-lg mx-auto">
        {left.map(item => <NavBtn key={item.id} {...item} />)}

        {/* Centre NFC button — elevated above the bar */}
        <div className="flex flex-col items-center justify-end pb-2 px-3" style={{ marginBottom: 0 }}>
          <button
            onClick={() => setShowTapToPay && setShowTapToPay(true)}
            className="w-14 h-14 -mt-6 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-900/40 flex items-center justify-center active:scale-90 transition-transform border-4 border-white"
            style={{ marginTop: '-20px' }}
          >
            <CreditCard size={22} className="text-white" />
          </button>
          <span className="text-[9px] font-black uppercase tracking-wide text-violet-500 mt-1 leading-none">Tap Card</span>
        </div>

        {right.map(item => <NavBtn key={item.id} {...item} />)}
      </div>
    </nav>
  );
}
