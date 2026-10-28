import React from 'react';
import { User, Briefcase, Users, Settings, ShieldCheck, LogOut } from 'lucide-react';

export default function ProfileDropdown({ 
  isProfileMenuOpen, setIsProfileMenuOpen, profile, userName, 
  setActiveTab, setSubTab, onSignOut 
}) {

  return (
    <div className="relative group ml-2">
      {/* THE BUTTON (YOUR NAME AND AVATAR) */}
      <button
        type="button"
        onClick={(e) => { 
          e.preventDefault(); 
          e.stopPropagation();
          setIsProfileMenuOpen(!isProfileMenuOpen); 
        }}
        className="flex items-center gap-3 w-full text-left group px-3 py-2 rounded-2xl hover:bg-white/40 active:bg-slate-200 transition-colors border border-transparent hover:border-white/60 cursor-pointer focus:outline-none z-50 relative"
      >
        <div className="text-right hidden sm:block pointer-events-none">
          <p className="font-black text-sm text-slate-800 leading-none">{userName}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
            {profile?.active_tier || 'Personal'}
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center overflow-hidden pointer-events-none">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <span className="font-black text-slate-400 text-lg">
              {profile?.full_name?.charAt(0).toUpperCase() || <User size={20} />}
            </span>
          )}
        </div>
      </button>

      {/* THE DROPDOWN MENU */}
      {isProfileMenuOpen && (
        <>
          <div 
            className="fixed inset-0 z-40 cursor-default" 
            onClick={(e) => { 
              e.preventDefault();
              e.stopPropagation();
              setIsProfileMenuOpen(false); 
            }}
          ></div>
          <div className="absolute top-full mt-2 right-0 w-64 bg-white border border-slate-200 shadow-xl rounded-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 origin-top-right">
            <div className="p-3.5 flex items-center gap-3 border-b border-slate-100 mb-1.5">
              <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-slate-500 text-base">
                    {profile?.full_name?.charAt(0).toUpperCase() || <User size={18} />}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-slate-900 truncate">{userName}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {profile?.active_tier || 'Personal'}
                </p>
              </div>
            </div>
            
            <div className="space-y-0.5">
              <button onClick={() => { setActiveTab('COMMERCIAL_HUB'); setIsProfileMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                <Briefcase size={15} className="text-slate-400" /> Switch to Commercial
              </button>
              <button onClick={() => { setActiveTab('ACCOUNTS'); setIsProfileMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                <Users size={15} className="text-slate-400" /> Link Joint Account
              </button>
              <button onClick={() => { setActiveTab('SETTINGS'); setSubTab('PROFILE'); setIsProfileMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                <Settings size={15} className="text-slate-400" /> Settings & Identity
              </button>
              <button onClick={() => { setActiveTab('SOS'); setIsProfileMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors">
                <ShieldCheck size={15} className="text-red-500" /> Emergency SOS
              </button>
              <div className="border-t border-slate-100 my-1"></div>
              <button onClick={onSignOut} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors">
                <LogOut size={15} className="text-slate-400" /> Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}