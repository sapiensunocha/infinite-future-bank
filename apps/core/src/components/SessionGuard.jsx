// Signs the customer out after a period with no activity, and when the app comes back
// from the background after too long. A warning with a countdown appears first so an
// active customer can stay signed in.
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock } from 'lucide-react';

export const IDLE_LIMIT_MS = 10 * 60 * 1000;   // sign out after 10 minutes without activity
export const WARN_BEFORE_MS = 60 * 1000;       // warn during the last minute
const KEY = 'ifb:last-activity';
const EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart'];

const now = () => Date.now();
const readLast = () => { try { return Number(localStorage.getItem(KEY)) || 0; } catch { return 0; } };
const writeLast = (t) => { try { localStorage.setItem(KEY, String(t)); } catch { /* private mode */ } };

/** Pure: what to do given the time since the last activity. */
export function idleState(idleMs, limit = IDLE_LIMIT_MS, warn = WARN_BEFORE_MS) {
  if (idleMs >= limit) return { expired: true, warning: false, secondsLeft: 0 };
  if (idleMs >= limit - warn) return { expired: false, warning: true, secondsLeft: Math.ceil((limit - idleMs) / 1000) };
  return { expired: false, warning: false, secondsLeft: Math.ceil((limit - idleMs) / 1000) };
}

export default function SessionGuard({ active, onExpire }) {
  const [secondsLeft, setSecondsLeft] = useState(null); // null = no warning showing
  const last = useRef(now());
  const expired = useRef(false);
  // Keep the latest callback without restarting the timer each time the parent re-renders.
  const onExpireRef = useRef(onExpire);
  useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);

  useEffect(() => {
    if (!active) return undefined;
    expired.current = false;
    last.current = now();
    writeLast(last.current);

    let lastWrite = 0;
    const bump = () => {
      if (expired.current) return;
      last.current = now();
      // Shared across tabs; throttled so scrolling does not hammer storage.
      if (last.current - lastWrite > 5000) { lastWrite = last.current; writeLast(last.current); }
    };
    const check = () => {
      if (expired.current) return;
      const seen = Math.max(last.current, readLast());
      const s = idleState(now() - seen);
      if (s.expired) {
        expired.current = true;
        setSecondsLeft(null);
        onExpireRef.current?.();
      } else {
        setSecondsLeft(s.warning ? s.secondsLeft : null);
      }
    };
    // Timers pause while a phone app is in the background, so re-check the moment it returns.
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };

    EVENTS.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', check);
    const timer = setInterval(check, 1000);
    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, bump));
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', check);
      clearInterval(timer);
    };
  }, [active]);

  if (!active || secondsLeft === null) return null;

  const stay = () => { last.current = now(); writeLast(last.current); setSecondsLeft(null); };
  return createPortal(
    <div className="fixed inset-0 z-[3100] bg-slate-900/60 flex items-end sm:items-center justify-center p-0 sm:p-4" data-no-dismiss role="alertdialog" aria-modal="true" aria-label="Session about to end">
      <div className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
        <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4"><Clock size={20} /></div>
        <h3 className="ui-sheet-title">Still there?</h3>
        <p className="text-sm text-slate-600 mt-2">For your security you will be signed out in <span className="font-semibold text-slate-900" aria-live="polite">{secondsLeft} seconds</span> because the app has not been used.</p>
        <div className="grid grid-cols-2 gap-3 mt-6">
          <button type="button" onClick={() => { expired.current = true; setSecondsLeft(null); onExpireRef.current?.(); }} className="ui-btn ui-btn-secondary">Sign out</button>
          <button type="button" onClick={stay} className="ui-btn ui-btn-primary">Stay signed in</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
