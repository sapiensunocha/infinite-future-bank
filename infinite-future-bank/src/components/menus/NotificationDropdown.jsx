import React from 'react';

export default function NotificationDropdown({ 
  isNotificationMenuOpen, setIsNotificationMenuOpen, visibleNotifications, 
  handleConfirmRequest, handleDeclineRequest, handleAcceptP2PWithdrawal, markAsRead 
}) {
  if (!isNotificationMenuOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 cursor-pointer" onClick={(e) => { e.preventDefault(); setIsNotificationMenuOpen(false); }} onTouchEnd={(e) => { e.preventDefault(); setIsNotificationMenuOpen(false); }}></div>
      <div className="absolute top-full mt-4 right-0 md:right-auto w-80 bg-white/90 backdrop-blur-2xl border border-white/60 shadow-2xl rounded-3xl p-4 z-50 animate-in fade-in slide-in-from-top-4">
        <div className="flex items-center justify-between mb-4 px-2">
          <span className="font-black text-sm uppercase tracking-widest text-slate-800">Notifications</span>
        </div>
        <div className="space-y-2 max-h-80 overflow-y-auto no-scrollbar scroll-container">
          {visibleNotifications.length > 0 ? visibleNotifications.map((notif) => (
            <div key={notif.id} className={`p-4 rounded-2xl ${notif.read ? 'bg-slate-50/50' : 'bg-blue-50/50 border border-blue-100'}`}>
              <p className="text-sm text-slate-700 font-medium leading-tight mb-2">{notif.message}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(notif.created_at).toLocaleDateString()}</p>
              
              {notif.type === 'payment_request' && notif.status === 'pending' && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleConfirmRequest(notif)} className="flex-1 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest py-2 rounded-lg hover:bg-emerald-500 transition-colors shadow-sm">Confirm</button>
                  <button onClick={() => handleDeclineRequest(notif)} className="flex-1 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">Decline</button>
                </div>
              )}

              {notif.type === 'p2p_withdrawal_request' && notif.status === 'pending' && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleAcceptP2PWithdrawal(notif)} className="flex-1 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest py-2 rounded-lg hover:bg-emerald-500 transition-colors shadow-sm">Accept Request</button>
                  <button onClick={() => handleDeclineRequest(notif)} className="flex-1 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">Decline</button>
                </div>
              )}

              {!notif.read && notif.type !== 'payment_request' && notif.type !== 'p2p_withdrawal_request' && <button onClick={() => markAsRead(notif.id)} className="text-blue-500 text-[10px] font-black uppercase tracking-widest mt-2 hover:underline">Mark as read</button>}
            </div>
          )) : <p className="text-sm text-slate-500 text-center py-4">No notifications</p>}
        </div>
      </div>
    </>
  );
}