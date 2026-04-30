/**
 * useFaceAuth — unified face authentication hook
 *
 * Handles two paths:
 *  - Native (Capacitor iOS/Android): @capgo/capacitor-native-biometric
 *    Uses Face ID / Android face recognition + device keychain for token storage.
 *  - Web: face-api.js descriptor stored in Supabase (handled by FaceAuthManager component).
 *
 * The edge function `face-auth` issues a Supabase magic-link token on success.
 */
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';

const BIOMETRIC_SERVER = 'deus.infinitefuturebank.org';
const FACE_AUTH_FN = 'face-auth';

// Detect if running inside Capacitor native runtime
function isNative() {
  return !!(window?.Capacitor?.isNativePlatform?.() || window?.Capacitor?.isNative);
}

async function getNativeBiometric() {
  try {
    const mod = await import('@capgo/capacitor-native-biometric');
    return mod.NativeBiometric;
  } catch {
    return null;
  }
}

export function useFaceAuth(session) {
  const [faceEnabled, setFaceEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState(null); // 'faceId' | 'biometricStrong' | 'web'
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(true);

  // Check availability on mount
  useEffect(() => {
    (async () => {
      if (isNative()) {
        const NativeBiometric = await getNativeBiometric();
        if (NativeBiometric) {
          try {
            const result = await NativeBiometric.isAvailable();
            setBiometricAvailable(result.isAvailable);
            setBiometricType(result.biometryType || 'biometricStrong');
          } catch { setBiometricAvailable(false); }
        }
      } else {
        // Web: check camera availability
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const hasCamera = devices.some(d => d.kind === 'videoinput');
          setBiometricAvailable(hasCamera);
          setBiometricType('web');
        } catch { setBiometricAvailable(false); }
      }
      setIsCheckingAvailability(false);
    })();
  }, []);

  // Sync face_login_enabled from profile
  useEffect(() => {
    if (!session?.user?.id) return;
    supabase.from('profiles')
      .select('face_login_enabled')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => { if (data) setFaceEnabled(!!data.face_login_enabled); });
  }, [session?.user?.id]);

  // ─── ENROLL ─────────────────────────────────────────────────────────────────
  const enrollNative = useCallback(async () => {
    const NativeBiometric = await getNativeBiometric();
    if (!NativeBiometric) throw new Error('Native biometrics not available.');

    // Prompt biometric verification first (confirms the user owns the device)
    await NativeBiometric.verifyIdentity({
      reason: 'Enable Face Login for DEUS',
      title: 'Face Recognition',
      subtitle: 'Confirm your identity to enable Face Login',
      description: 'Your biometric is stored securely on-device only.',
      negativeButtonText: 'Cancel',
    });

    // Generate a strong random token
    const tokenArray = new Uint8Array(32);
    crypto.getRandomValues(tokenArray);
    const rawToken = Array.from(tokenArray).map(b => b.toString(16).padStart(2, '0')).join('');

    // Store encrypted in device keychain
    await NativeBiometric.setCredentials({
      username: session.user.email,
      password: rawToken,
      server: BIOMETRIC_SERVER,
    });

    // Hash the token (SHA-256) for storage in DB — we never store the raw token server-side
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawToken));
    const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    // Persist to Supabase
    const { error } = await supabase.from('profiles').update({
      face_login_enabled: true,
      face_auth_token_hash: tokenHash,
      face_descriptor: null, // not needed for native path
    }).eq('id', session.user.id);

    if (error) throw error;
    setFaceEnabled(true);
  }, [session]);

  // Web enrollment is handled by FaceAuthManager component; this just saves the descriptor
  const saveWebDescriptor = useCallback(async (descriptor) => {
    const { error } = await supabase.from('profiles').update({
      face_login_enabled: true,
      face_descriptor: descriptor,
      face_auth_token_hash: null,
    }).eq('id', session.user.id);
    if (error) throw error;
    setFaceEnabled(true);
  }, [session]);

  // ─── DISABLE ────────────────────────────────────────────────────────────────
  const disableFace = useCallback(async () => {
    if (isNative()) {
      const NativeBiometric = await getNativeBiometric();
      if (NativeBiometric) {
        try { await NativeBiometric.deleteCredentials({ server: BIOMETRIC_SERVER }); } catch { /* ignore */ }
      }
    }
    const { error } = await supabase.from('profiles').update({
      face_login_enabled: false,
      face_auth_token_hash: null,
      face_descriptor: null,
    }).eq('id', session.user.id);
    if (error) throw error;
    setFaceEnabled(false);
  }, [session]);

  // ─── NATIVE LOGIN ────────────────────────────────────────────────────────────
  // Called from the login screen. Returns { access_token, refresh_token, email } on success.
  const nativeFaceLogin = useCallback(async () => {
    const NativeBiometric = await getNativeBiometric();
    if (!NativeBiometric) throw new Error('Native biometrics not available.');

    // 1. Biometric challenge — device handles Face ID / face scan
    await NativeBiometric.verifyIdentity({
      reason: 'Log in to DEUS',
      title: 'Face Login',
      subtitle: 'Confirm your identity',
      description: 'Use Face ID or device biometric to sign in',
      negativeButtonText: 'Cancel',
    });

    // 2. Retrieve the stored token from device keychain
    const { username: email, password: rawToken } = await NativeBiometric.getCredentials({
      server: BIOMETRIC_SERVER,
    });

    // 3. Hash it so we can verify against the DB without sending the raw token over the network
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawToken));
    const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    // 4. Call edge function — it verifies the hash and issues a session
    const { data, error } = await supabase.functions.invoke(FACE_AUTH_FN, {
      body: { mode: 'native', email, tokenHash },
    });
    if (error) throw new Error(error.message || 'Face auth server error.');
    if (!data?.token_hash) throw new Error('No session token received.');

    // 5. Exchange the magic-link token for a real session
    const { data: authData, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: data.token_hash,
      type: 'magiclink',
    });
    if (verifyError) throw verifyError;
    return authData;
  }, []);

  // ─── WEB LOGIN (called after FaceAuthManager confirms match) ─────────────────
  const webFaceLogin = useCallback(async (email) => {
    const { data, error } = await supabase.functions.invoke(FACE_AUTH_FN, {
      body: { mode: 'web', email },
    });
    if (error) throw new Error(error.message || 'Face auth server error.');
    if (!data?.token_hash) throw new Error('No session token received.');

    const { data: authData, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: data.token_hash,
      type: 'magiclink',
    });
    if (verifyError) throw verifyError;
    return authData;
  }, []);

  // ─── FETCH stored descriptor for web verify ──────────────────────────────────
  const fetchStoredDescriptor = useCallback(async (email) => {
    const { data } = await supabase
      .from('profiles')
      .select('face_descriptor, face_login_enabled')
      .eq('email_lower', email.toLowerCase())
      .maybeSingle();
    return data;
  }, []);

  return {
    faceEnabled,
    biometricAvailable,
    biometricType,
    isCheckingAvailability,
    isNative: isNative(),
    enrollNative,
    saveWebDescriptor,
    disableFace,
    nativeFaceLogin,
    webFaceLogin,
    fetchStoredDescriptor,
  };
}
