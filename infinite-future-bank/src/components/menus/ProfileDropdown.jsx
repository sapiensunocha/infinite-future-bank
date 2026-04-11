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
          <div className="absolute top-full mt-2 right-0 w-64 bg-white/90 backdrop-blur-2xl border border-white/60 shadow-2xl rounded-3xl p-2 z-50 animate-in fade-in slide-in-from-top-4 origin-top-right">
            <div className="p-4 flex items-center gap-4 border-b border-slate-100 mb-2">
              <div className="w-12 h-12 rounded-xl bg-slate-200 overflow-hidden flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-black text-slate-400 text-xl">
                    {profile?.full_name?.charAt(0).toUpperCase() || <User size={24} />}
                  </span>
                )}
              </div>
              <div>
                <p className="font-black text-slate-800">{userName}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {profile?.active_tier || 'Personal'}
                </p>
              </div>
            </div>
            
            <div className="space-y-1">
              <button onClick={() => { setActiveTab('COMMERCIAL_HUB'); setIsProfileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 transition-all">
                <Briefcase size={16} /> Switch to Commercial
              </button>
              <button onClick={() => { setActiveTab('ACCOUNTS'); setIsProfileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:bg-indigo-50 transition-all">
                <Users size={16} /> Link Joint Account
              </button>
              <button onClick={() => { setActiveTab('SETTINGS'); setSubTab('PROFILE'); setIsProfileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-all">
                <Settings size={16} /> Identity & Legal
              </button>
              <button onClick={() => { setActiveTab('SOS'); setIsProfileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 hover:text-red-600 transition-all">
                <ShieldCheck size={16} /> Emergency SOS
              </button>
              <button onClick={onSignOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all">
                <LogOut size={16} /> Secure Exit
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}