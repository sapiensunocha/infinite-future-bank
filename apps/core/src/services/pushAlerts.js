// Browser push for transaction alerts. Works in browsers and installed web apps that
// support the Push API. The Android app's built-in web view does not, so there the
// switch is shown as unavailable until native push is set up.
import { supabase } from './supabaseClient';

const b64ToBytes = (b64) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

/** Asks permission, subscribes this device and saves it. Returns { ok, reason }. */
export async function enablePush() {
  if (!pushSupported()) return { ok: false, reason: 'unsupported' };
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return { ok: false, reason: 'denied' };
  const { data, error } = await supabase.functions.invoke('transaction-alerts', { body: { action: 'vapid_key' } });
  if (error || !data?.key) return { ok: false, reason: 'not_configured' };
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(data.key) });
  const { error: saveErr } = await supabase.functions.invoke('transaction-alerts', { body: { action: 'subscribe', subscription: sub.toJSON() } });
  return saveErr ? { ok: false, reason: 'save_failed' } : { ok: true };
}

/** Removes this device's subscription (best effort). */
export async function disablePush() {
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    await supabase.functions.invoke('transaction-alerts', { body: { action: 'unsubscribe', endpoint: sub.endpoint } });
    await sub.unsubscribe();
  } catch { /* nothing to clean up */ }
}
