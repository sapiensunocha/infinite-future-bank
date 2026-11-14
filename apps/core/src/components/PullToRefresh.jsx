// Pull down to refresh, for touch screens. Attach to the scrolling element with a ref:
//   <PullToRefresh targetRef={scrollRef} onRefresh={fetchAllData} />
// It only starts when the list is already at the top, and never from inside a modal.
import React, { useEffect, useRef, useState } from 'react';
import { Loader2, ArrowDown } from 'lucide-react';

const TRIGGER = 72;   // px of pull needed to refresh
const MAX = 110;      // px the indicator can travel

/** Pure: finger travel → indicator travel (resisted so it feels attached). */
export const pullDistance = (dy) => (dy <= 0 ? 0 : Math.min(MAX, Math.round(dy * 0.5)));

export default function PullToRefresh({ targetRef, onRefresh, disabled = false }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const start = useRef(null);
  const pullRef = useRef(0);
  const busy = useRef(false);

  useEffect(() => {
    const el = targetRef?.current;
    if (!el || disabled) return undefined;

    const onStart = (e) => {
      start.current = null;
      if (busy.current || e.touches.length !== 1 || el.scrollTop > 0) return;
      // Leave overlays, horizontal scrollers, maps and form fields alone.
      if (e.target.closest?.('input, textarea, select, [data-no-ptr], [role="dialog"], [aria-modal="true"], .fixed.inset-0, .leaflet-container, canvas, .overflow-x-auto')) return;
      start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onMove = (e) => {
      if (!start.current) return;
      const dy = e.touches[0].clientY - start.current.y;
      const dx = e.touches[0].clientX - start.current.x;
      if (el.scrollTop > 0 || (pullRef.current === 0 && Math.abs(dx) > Math.abs(dy))) { start.current = null; pullRef.current = 0; setPull(0); return; }
      const d = pullDistance(dy);
      if (d > 0 && e.cancelable) e.preventDefault(); // stop the page itself from bouncing
      pullRef.current = d;
      setPull(d);
    };
    const onEnd = async () => {
      if (!start.current) return;
      start.current = null;
      const d = pullRef.current;
      pullRef.current = 0;
      if (d < TRIGGER) { setPull(0); return; }
      busy.current = true;
      setRefreshing(true);
      setPull(TRIGGER);
      const t0 = Date.now();
      try { await onRefresh?.(); } catch { /* the screen shows its own errors */ }
      // Keep the spinner visible briefly so a fast refresh is still noticeable.
      const wait = 500 - (Date.now() - t0);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      busy.current = false;
      setRefreshing(false);
      setPull(0);
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd, { passive: true });
    el.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [targetRef, onRefresh, disabled]);

  if (pull === 0 && !refreshing) return null;
  const ready = pull >= TRIGGER;
  return (
    <div className="pointer-events-none absolute left-0 right-0 top-0 z-30 flex justify-center" style={{ transform: `translateY(${Math.max(0, pull - 36)}px)`, transition: start.current ? 'none' : 'transform 160ms ease-out' }} aria-live="polite">
      <div className="mt-2 flex items-center gap-2 rounded-full bg-white border border-slate-200 shadow-md px-3 py-2 text-xs font-medium text-slate-600">
        {refreshing
          ? <><Loader2 size={14} className="animate-spin text-blue-600" /> Refreshing…</>
          : <><ArrowDown size={14} className={`transition-transform ${ready ? 'rotate-180 text-blue-600' : ''}`} /> {ready ? 'Release to refresh' : 'Pull to refresh'}</>}
      </div>
    </div>
  );
}
