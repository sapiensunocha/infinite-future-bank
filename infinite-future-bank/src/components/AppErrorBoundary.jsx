import React from 'react';
import { supabase } from '../services/supabaseClient';

const APP_SCHEMA_VERSION = '2.5.0';
const SCHEMA_KEY = 'deus_schema_v';
const CRASH_KEY = 'deus_crash_count';
const FORCE_KEY = 'deus_force_reset_v';
const BOOT_TIMEOUT_MS = 5000;

export function clearAllCaches() {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(k => { if (!k.startsWith('sb-')) localStorage.removeItem(k); });
    sessionStorage.clear();
    if ('caches' in window) {
      caches.keys().then(names => names.forEach(n => caches.delete(n)));
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
    }
  } catch { /* ignore */ }
}

async function trackBootEvent(event, meta = {}) {
  try {
    await supabase.from('app_telemetry').insert([{
      event,
      app_version: APP_SCHEMA_VERSION,
      platform: navigator.platform || 'unknown',
      user_agent: navigator.userAgent?.substring(0, 120),
      metadata: meta,
    }]);
  } catch { /* non-critical */ }
}

// ── Hard fallback UI — always renders even if React tree is dead ──────────────
const FallbackUI = ({ onReload, isRecovering, isTimeout }) => (
  <div style={{ minHeight:'100vh', background:'#fff', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'32px', textAlign:'center', fontFamily:'system-ui,sans-serif' }}>
    <div style={{ width:80, height:80, borderRadius:'50%', background:'#EFF6FF', border:'4px solid #DBEAFE', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:24 }}>
      <span style={{ fontSize:32, fontWeight:900, color:'#2563EB' }}>{isTimeout ? '⏱' : '!'}</span>
    </div>
    <h2 style={{ fontSize:22, fontWeight:900, color:'#1e293b', margin:'0 0 8px' }}>
      {isTimeout ? 'Taking longer than expected' : 'Updating your experience'}
    </h2>
    <p style={{ fontSize:14, color:'#94a3b8', marginBottom:32, maxWidth:300 }}>
      {isTimeout
        ? 'The app took too long to start. Tap below for a clean reload.'
        : 'A brief interruption occurred. Tap Reload to continue safely.'}
    </p>
    <button
      onClick={onReload}
      disabled={isRecovering}
      style={{ padding:'16px 40px', background: isRecovering ? '#94a3b8' : '#2563EB', color:'#fff', borderRadius:16, fontWeight:900, fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', border:'none', cursor:'pointer', boxShadow:'0 4px 20px rgba(37,99,235,0.3)' }}>
      {isRecovering ? 'Reloading…' : 'Reload Securely'}
    </button>
    {!isRecovering && (
      <button
        onClick={() => { localStorage.clear(); sessionStorage.clear(); window.location.reload(); }}
        style={{ marginTop:12, padding:'10px 28px', background:'transparent', color:'#94a3b8', border:'1px solid #e2e8f0', borderRadius:12, fontWeight:700, fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase', cursor:'pointer' }}>
        Full Reset (clear all data)
      </button>
    )}
  </div>
);

export class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, isRecovering: false, isTimeout: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  async componentDidCatch(error, info) {
    const crashes = parseInt(localStorage.getItem(CRASH_KEY) || '0', 10);
    localStorage.setItem(CRASH_KEY, String(crashes + 1));
    trackBootEvent('crash_caught', { message: error.message, component: info.componentStack?.substring(0, 200) });

    if (crashes >= 2) {
      clearAllCaches();
      localStorage.removeItem(CRASH_KEY);
      window.location.reload();
    }
  }

  handleReload = () => {
    this.setState({ isRecovering: true });
    clearAllCaches();
    setTimeout(() => window.location.reload(), 400);
  };

  render() {
    if (!this.state.hasError && !this.state.isTimeout) return this.props.children;
    return (
      <FallbackUI
        onReload={this.handleReload}
        isRecovering={this.state.isRecovering}
        isTimeout={this.state.isTimeout}
      />
    );
  }
}

// ── Boot Manager — MUST resolve in under BOOT_TIMEOUT_MS no matter what ───────
export async function runBootChecks() {
  const bootWork = async () => {
    // 1. Schema version check — wipe stale cache
    const storedVersion = localStorage.getItem(SCHEMA_KEY);
    if (storedVersion !== APP_SCHEMA_VERSION) {
      clearAllCaches();
      localStorage.setItem(SCHEMA_KEY, APP_SCHEMA_VERSION);
      localStorage.removeItem(CRASH_KEY);
      trackBootEvent('cache_reset_triggered', { from: storedVersion, to: APP_SCHEMA_VERSION });
    }

    // 2. Remote force-reset — fetch from app_config (non-blocking on failure)
    try {
      const { data: cfg } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'force_reset_version')
        .maybeSingle();
      const remoteVersion = cfg?.value;
      if (remoteVersion && remoteVersion !== 'none') {
        const localForceV = localStorage.getItem(FORCE_KEY);
        if (localForceV !== String(remoteVersion)) {
          clearAllCaches();
          localStorage.setItem(FORCE_KEY, String(remoteVersion));
          trackBootEvent('remote_force_reset', { version: remoteVersion });
        }
      }
    } catch { /* non-critical — app still boots */ }

    // 3. Auth sanity check
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        await supabase.auth.signOut();
        trackBootEvent('auth_dead_state_cleared');
      }
      trackBootEvent('boot_success', { has_session: !!session, version: APP_SCHEMA_VERSION });
    } catch {
      trackBootEvent('boot_success', { has_session: false });
    }
  };

  // Hard 5-second ceiling — app renders no matter what
  await Promise.race([
    bootWork(),
    new Promise(resolve => setTimeout(resolve, BOOT_TIMEOUT_MS)),
  ]);
}
