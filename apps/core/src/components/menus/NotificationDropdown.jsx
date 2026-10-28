import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Zap } from 'lucide-react';

const LEVEL_COLORS = {
  1: 'text-red-600 bg-red-50 border-red-200',
  2: 'text-orange-600 bg-orange-50 border-orange-200',
  3: 'text-amber-600 bg-amber-50 border-amber-200',
  4: 'text-blue-600 bg-blue-50 border-blue-200',
  5: 'text-emerald-600 bg-emerald-50 border-emerald-200',
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
    <div className={`rounded-xl border overflow-hidden ${notif.is_read ? 'bg-slate-50 border-slate-200' : 'bg-blue-50/50 border-blue-200'}`}>
      <div className="p-3">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-0.5">Capital Readiness Report</p>
            <p className="text-xs font-semibold text-slate-800 leading-tight truncate">{notif.title}</p>
          </div>
          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border shrink-0 ${LEVEL_COLORS[level] || LEVEL_COLORS[3]}`}>Lv.{level}/5</span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mb-1.5">
          <div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }}/>
        </div>
        <p className="text-[10px] text-slate-500 mb-2.5">{pct}% ready · {missing} item{missing !== 1 ? 's' : ''} required</p>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => { setExpanded(e => !e); if (!notif.is_read) markAsRead(notif.id); }}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[10px] uppercase rounded-lg transition-colors"
          >
            {expanded ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
            {expanded ? 'Hide' : 'View Report'}
          </button>
          {costMin > 0 && (
            <button
              onClick={() => { onPay(notif); if (!notif.is_read) markAsRead(notif.id); }}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[10px] uppercase rounded-lg shadow-sm transition-colors"
            >
              <Zap size={12}/> Pay & Start
            </button>
          )}
        </div>
      </div>

      {/* Expanded message */}
      {expanded && (
        <div className="border-t border-slate-200 px-3 pb-3 pt-2 max-h-48 overflow-y-auto">
          <pre className="text-[11px] text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">{notif.message}</pre>
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
      <div className="absolute top-full mt-2 right-0 w-80 sm:w-96 bg-white border border-slate-200 shadow-xl rounded-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="font-bold text-sm text-slate-900">Notifications</span>
          {visibleNotifications.filter(n => !n.is_read).length > 0 && (
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{visibleNotifications.filter(n => !n.is_read).length} new</span>
          )}
        </div>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto no-scrollbar scroll-container">
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
              <div key={notif.id} className={`p-3.5 rounded-xl border transition-colors ${notif.is_read || notif.read ? 'bg-slate-50 border-slate-100' : 'bg-blue-50/60 border-blue-100'}`}>
                <p className="text-xs text-slate-800 font-medium leading-relaxed mb-1.5">{notif.message || notif.title}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-medium">{new Date(notif.created_at).toLocaleDateString()}</span>
                  {!(notif.is_read || notif.read) && notif.type !== 'payment_request' && notif.type !== 'p2p_withdrawal_request' && (
                    <button onClick={() => markAsRead(notif.id)} className="text-blue-600 text-[10px] font-bold hover:underline">Mark as read</button>
                  )}
                </div>

                {notif.type === 'payment_request' && notif.status === 'pending' && (
                  <div className="flex gap-2 mt-2.5">
                    <button onClick={() => handleConfirmRequest(notif)} className="flex-1 bg-blue-600 text-white text-[10px] font-bold py-1.5 rounded-lg hover:bg-blue-500 transition-colors">Confirm</button>
                    <button onClick={() => handleDeclineRequest(notif)} className="flex-1 bg-slate-100 text-slate-600 text-[10px] font-bold py-1.5 rounded-lg hover:bg-slate-200 transition-colors">Decline</button>
                  </div>
                )}

                {notif.type === 'p2p_withdrawal_request' && notif.status === 'pending' && (
                  <div className="flex gap-2 mt-2.5">
                    <button onClick={() => handleAcceptP2PWithdrawal(notif)} className="flex-1 bg-blue-600 text-white text-[10px] font-bold py-1.5 rounded-lg hover:bg-blue-500 transition-colors">Accept</button>
                    <button onClick={() => handleDeclineRequest(notif)} className="flex-1 bg-slate-100 text-slate-600 text-[10px] font-bold py-1.5 rounded-lg hover:bg-slate-200 transition-colors">Decline</button>
                  </div>
                )}
              </div>
            );
          }) : <p className="text-xs text-slate-400 text-center py-6">No notifications</p>}
        </div>
      </div>
    </>
  );
}
