import React from 'react';
import { LayoutGrid, Search, Bell } from 'lucide-react';
import AppDrawerMenu from '../menus/AppDrawerMenu';
import NotificationDropdown from '../menus/NotificationDropdown';
import ProfileDropdown from '../menus/ProfileDropdown';

export default function TopHeader({ 
  setIsSidebarOpen, tabTitles, activeTab, isAppDrawerOpen, setIsAppDrawerOpen, 
  setActiveAppPopup, isSearchExpanded, setIsSearchExpanded, searchQuery, setSearchQuery, 
  searchResults, formatCurrency, isNotificationMenuOpen, setIsNotificationMenuOpen, unreadCount, 
  isProfileMenuOpen, setIsProfileMenuOpen, profile, userName, visibleNotifications, 
  handleConfirmRequest, handleDeclineRequest, handleAcceptP2PWithdrawal, handleAcceptP2PDeposit, markAsRead, setActiveTab, 
  setSubTab, onSignOut, session, balances, fetchAllData, commercialProfile, activeAppPopup
}) {
  return (
    <header className="border-b border-slate-200/50 bg-white/80 backdrop-blur-xl flex items-center justify-between px-4 md:px-6 z-[100] sticky top-0 pt-[env(safe-area-inset-top)] min-h-[calc(4rem+env(safe-area-inset-top))]">
      <div className="flex items-center gap-3">
        {/* Mobile: DEUS logo mark; Desktop: hamburger + title */}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); setIsSidebarOpen(true); }}
          className="md:hidden flex items-center gap-1 -ml-1"
          aria-label="Open menu"
        >
          <span className="text-2xl font-black text-[#4285F4]">D</span>
          <span className="text-2xl font-black text-[#EA4335]">E</span>
          <span className="text-2xl font-black text-[#FBBC04]">U</span>
          <span className="text-2xl font-black text-[#34A853]">S</span>
        </button>
        <h2 className="hidden md:block font-black text-lg text-slate-800 tracking-tight">
          {tabTitles[activeTab]}
        </h2>
      </div>
      
      {/* RIGHT SIDE ICONS & PROFILE — outer div is the positioning root for AppDrawerMenu */}
      <div className="flex items-center gap-4 md:gap-6 relative">

        {/* App Drawer button — no inner relative wrapper so AppDrawerMenu uses the outer div */}
        <button
          id="tour-app-drawer"
          onClick={() => setIsAppDrawerOpen(!isAppDrawerOpen)}
          className="text-slate-400 hover:text-blue-600 transition-colors p-2 focus:outline-none cursor-pointer"
        >
          <LayoutGrid size={22} />
        </button>
        <AppDrawerMenu
          isAppDrawerOpen={isAppDrawerOpen}
          setIsAppDrawerOpen={setIsAppDrawerOpen}
          setActiveAppPopup={setActiveAppPopup}
        />

        {/* Search Bar */}
        <div className={`relative transition-all duration-300 ease-in-out hidden sm:block ${isSearchExpanded ? 'w-80' : 'w-40'}`}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchExpanded(true)}
            onBlur={() => { setTimeout(() => setIsSearchExpanded(false), 200); }}
            className="w-full pl-10 pr-4 py-2 bg-white/50 border border-white/60 rounded-full outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium text-slate-700 shadow-sm"
          />
          {isSearchExpanded && searchQuery.length > 0 && (
            <div className="absolute top-full mt-2 left-0 w-80 bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Search Results</p>
              {searchResults.transactions.length > 0 && (
                <div className="mb-3">
                  <span className="text-xs font-bold text-slate-600">Transactions</span>
                  {searchResults.transactions.slice(0, 3).map(t => (
                    <div key={t.id} className="text-sm text-slate-800 py-1 hover:text-blue-600 cursor-pointer">{t.transaction_type} • {formatCurrency(Math.abs(t.amount))}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notifications */}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); setIsNotificationMenuOpen(!isNotificationMenuOpen); }}
          className="text-slate-400 hover:text-blue-500 active:text-blue-600 transition-colors relative p-2 cursor-pointer z-50"
        >
          <Bell size={22} />
          {unreadCount > 0 && <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
        </button>
        <NotificationDropdown 
          isNotificationMenuOpen={isNotificationMenuOpen}
          setIsNotificationMenuOpen={setIsNotificationMenuOpen}
          visibleNotifications={visibleNotifications}
          handleConfirmRequest={handleConfirmRequest}
          handleDeclineRequest={handleDeclineRequest}
          handleAcceptP2PWithdrawal={handleAcceptP2PWithdrawal}
          handleAcceptP2PDeposit={handleAcceptP2PDeposit} 
          markAsRead={markAsRead}
        />

        {/* PROFILE DROPDOWN */}
        <ProfileDropdown 
          isProfileMenuOpen={isProfileMenuOpen}
          setIsProfileMenuOpen={setIsProfileMenuOpen}
          profile={profile}
          userName={userName}
          setActiveTab={setActiveTab}
          setSubTab={setSubTab}
          onSignOut={onSignOut}
        />

      </div>
    </header>
  );
}