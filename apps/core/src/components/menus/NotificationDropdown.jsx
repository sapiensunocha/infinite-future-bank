import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Zap } from 'lucide-react';

const LEVEL_COLORS = {
  1: 'text-red-400 bg-red-900/30 border-red-700/40',
  2: 'text-orange-400 bg-orange-900/30 border-orange-700/40',
  3: 'text-amber-400 bg-amber-900/30 border-amber-700/40',
  4: 'text-blue-400 bg-blue-900/30 border-blue-700/40',
  5: 'text-emerald-400 bg-emerald-900/30 border-emerald-700/40',
};

function ProgressReportCard({ notif, onPay, markAsRead }) {
  const [expanded, setExpanded] = useState(false);
  const meta = notif.metadata || {};
  const level = meta.level || 1;
  const pct   = meta.pct || 0;
  const missing = meta.missing_count || 0;
  const costMin = meta.cost_min || 0;
  const costMax = meta.cost_max || 0;

  return (
    <div className={`rounded-2xl border overflow-hidden ${notif.is_read ? 'bg-slate-800/40 border-slate-700/40' : 'bg-violet-950/30 border-violet-700/40'}`}>
      <div className="p-3">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-violet-400 mb-0.5">Capital Readiness Report</p>
            <p className="text-xs font-bold text-white leading-tight truncate">{notif.title}</p>
          </div>
          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full border shrink-0 ${LEVEL_COLORS[level] || LEVEL_COLORS[3]}`}>Lv.{level}/5</span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }}/>
        </div>
        <p className="text-[9px] text-slate-400 mb-3">{pct}% ready · {missing} item{missing !== 1 ? 's' : ''} still required{costMin > 0 ? ` · IFB support: $${costMin.toLocaleString()}–$${costMax.toLocaleString()}` : ''}</p>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => { setExpanded(e => !e); if (!notif.is_read) markAsRead(notif.id); }}
            className="flex-1 flex items-center justify-center gap-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-black text-[9px] uppercase rounded-lg"
          >
            {expanded ? <ChevronUp size={10}/> : <ChevronDown size={10}/>}
            {expanded ? 'Hide' : 'View Report'}
          </button>
          {costMin > 0 && (
            <button
              onClick={() => { onPay(notif); if (!notif.is_read) markAsRead(notif.id); }}
              className="flex-1 flex items-center justify-center gap-1 py-2 bg-violet-600 hover:bg-violet-500 text-white font-black text-[9px] uppercase rounded-lg shadow-sm shadow-violet-900/40"
            >
              <Zap size={10}/> Pay & Start
            </button>
          )}
        </div>
      </div>

      {/* Expanded message */}
      {expanded && (
        <div className="border-t border-slate-700/50 px-3 pb-3 pt-2 max-h-48 overflow-y-auto">
          <pre className="text-[10px] text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">{notif.message}</pre>
        </div>
      )}
    </div>
  );
}

export default function NotificationDropdown({
  isNotificationMenuOpen, setIsNotificationMenuOpen, visibleNotifications,
  handleConfirmRequest, handleDeclineRequest, handleAcceptP2PWithdrawal, markAsRead,
  onPayReport,
}) {
  if (!isNotificationMenuOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 cursor-pointer" onClick={(e) => { e.preventDefault(); setIsNotificationMenuOpen(false); }} onTouchEnd={(e) => { e.preventDefault(); setIsNotificationMenuOpen(false); }}/>
      <div className="absolute top-full mt-4 right-0 md:right-auto w-80 bg-slate-900/95 backdrop-blur-2xl border border-slate-700/60 shadow-2xl rounded-3xl p-4 z-50 animate-in fade-in slide-in-from-top-4">
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="font-black text-sm uppercase tracking-widest text-white">Notifications</span>
          {visibleNotifications.filter(n => !n.is_read).length > 0 && (
            <span className="text-[9px] font-black text-violet-400">{visibleNotifications.filter(n => !n.is_read).length} unread</span>
          )}
        </div>
        <div className="space-y-2 max-h-[70vh] overflow-y-auto no-scrollbar scroll-container">
          {visibleNotifications.length > 0 ? visibleNotifications.map((notif) => {

            if (notif.type === 'progress_report') {
              return (
                <ProgressReportCard
                  key={notif.id}
                  notif={notif}
                  onPay={onPayReport}
                  markAsRead={markAsRead}
                />
              );
            }

            return (
              <div key={notif.id} className={`p-4 rounded-2xl ${notif.is_read || notif.read ? 'bg-slate-800/50 border border-slate-700/30' : 'bg-blue-950/40 border border-blue-700/30'}`}>
                <p className="text-sm text-slate-200 font-medium leading-tight mb-2">{notif.message || notif.title}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{new Date(notif.created_at).toLocaleDateString()}</p>

                {notif.type === 'payment_request' && notif.status === 'pending' && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handleConfirmRequest(notif)} className="flex-1 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest py-2 rounded-lg hover:bg-emerald-500 transition-colors">Confirm</button>
                    <button onClick={() => handleDeclineRequest(notif)} className="flex-1 bg-slate-700 border border-slate-600 text-slate-300 text-[10px] font-black uppercase tracking-widest py-2 rounded-lg hover:bg-slate-600 transition-colors">Decline</button>
                  </div>
                )}

                {notif.type === 'p2p_withdrawal_request' && notif.status === 'pending' && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handleAcceptP2PWithdrawal(notif)} className="flex-1 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest py-2 rounded-lg hover:bg-emerald-500 transition-colors">Accept</button>
                    <button onClick={() => handleDeclineRequest(notif)} className="flex-1 bg-slate-700 border border-slate-600 text-slate-300 text-[10px] font-black uppercase tracking-widest py-2 rounded-lg hover:bg-slate-600 transition-colors">Decline</button>
                  </div>
                )}

                {!(notif.is_read || notif.read) && notif.type !== 'payment_request' && notif.type !== 'p2p_withdrawal_request' && (
                  <button onClick={() => markAsRead(notif.id)} className="text-blue-400 text-[10px] font-black uppercase tracking-widest mt-2 hover:underline">Mark as read</button>
                )}
              </div>
            );
          }) : <p className="text-sm text-slate-500 text-center py-6">No notifications</p>}
        </div>
      </div>
    </>
  );
}
