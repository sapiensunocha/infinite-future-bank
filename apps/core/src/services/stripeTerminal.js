import { Capacitor } from '@capacitor/core';
import { supabase } from './supabaseClient';

const isNative = () => Capacitor.isNativePlatform();
const plugin   = () => Capacitor.Plugins.StripeTerminal;

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5menRkcHl5Z2ZycGJqYmhpZHhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MzcxOTEsImV4cCI6MjA4NzExMzE5MX0.Ydo6vduICdQwBrygEN1e5JswVVaATLChNLtq7whqf7I',
  };
}

const BASE = (import.meta.env.VITE_SUPABASE_URL || 'https://nfztdpyygfrpbjbhidxe.supabase.co') + '/functions/v1';

let _locationId = null;

export async function initTerminal() {
  if (!isNative()) throw new Error('Tap to Pay requires the Android app.');
  const headers = await authHeaders();
  const res  = await fetch(`${BASE}/stripe-terminal-token`, { method: 'POST', headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not get connection token');
  _locationId = data.locationId ?? null;
  await plugin().initialize({ connectionToken: data.secret });
}

export async function connectReader() {
  if (!isNative()) throw new Error('Tap to Pay requires the Android app.');
  return plugin().discoverAndConnect({ locationId: _locationId });
}

export async function collectPayment(amountUSD, note) {
  if (!isNative()) throw new Error('Tap to Pay requires the Android app.');
  const headers = await authHeaders();
  const res  = await fetch(`${BASE}/stripe-terminal-charge`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ amount: amountUSD, note }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not create payment');
  return plugin().collectPayment({ clientSecret: data.client_secret });
}

export async function cancelPayment() {
  if (!isNative()) return;
  try { await plugin().cancelCollection({}); } catch (_) {}
}
