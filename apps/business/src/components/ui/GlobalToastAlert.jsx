import React from 'react';

export default function GlobalToastAlert({ notification }) {
  if (!notification) return null;

  return (
    <div className="fixed top-2 left-1/2 transform -translate-x-1/2 z-[300] animate-in slide-in-from-top-4 fade-in duration-300 mt-[env(safe-area-inset-top)]">
      <div className={`px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl flex items-center gap-3 ${
        notification.type === 'success'
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          : 'bg-red-500/10 border-red-500/20 text-red-400'
      }`}>
        <div className={`w-2 h-2 rounded-full animate-pulse ${notification.type === 'success' ? 'bg-emerald-400' : 'bg-red-400'}`}></div>
        <p className="font-black text-sm uppercase tracking-widest">{notification.text}</p>
      </div>
    </div>
  );
}