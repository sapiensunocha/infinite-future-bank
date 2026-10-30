import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { TranslationProvider } from './i18n/TranslationContext';
import { supabase, supabaseUrl, supabaseAnonKey } from './services/supabaseClient';
import { APP_URL } from './config/constants';
import { Mail, Sparkles, ChevronRight, Lock, Eye, EyeOff, Smartphone, DownloadCloud, Monitor, User, RefreshCw, ShieldAlert, Share2, Plus, GraduationCap, Building2 } from 'lucide-react';
import PhoneField from './components/PhoneField';

// When a chunk 404s (stale browser cache after a new deploy), force a full reload
// so the browser fetches the new index.html with correct chunk references.
function lazyLoad(importFn) {
  return lazy(() =>
    importFn().catch((err) => {
      const isChunkError = err?.message?.includes('Failed to fetch dynamically imported module')
        || err?.message?.includes('Importing a module script failed')
        || err?.name === 'ChunkLoadError';
      if (isChunkError && !sessionStorage.getItem('ifb_chunk_reload')) {
        sessionStorage.setItem('ifb_chunk_reload', '1');
        window.location.reload();
        return new Promise(() => {});
      }
      throw err;
    })
  );
}

// Heavy modules — only downloaded after the user logs in
const DEUSAcademy      = lazyLoad(() => import('./features/learning/DEUSAcademy'));
const Dashboard        = lazyLoad(() => import('./Dashboard'));
const AuthCallback     = lazyLoad(() => import('./features/onboarding/AuthCallback'));
const PaymentPortal    = lazyLoad(() => import('./PaymentPortal'));
const FeedbackForm     = lazyLoad(() => import('./FeedbackForm'));
const AdminSupportDesk = lazyLoad(() => import('./AdminSupportDesk'));
const ExecutiveCrm     = lazyLoad(() => import('./ExecutiveCrm'));
const PublicEventPage  = lazyLoad(() => import('./PublicEventPage'));
const CompanyGuide     = lazyLoad(() => import('./features/guide/CompanyGuide'));
const GuideHub         = lazyLoad(() => import('./features/guide/GuideHub'));
const AdminKYCPortal      = lazyLoad(() => import('./features/kyc/AdminKYCPortal'));
const ProcessorDashboard  = lazyLoad(() => import('./ProcessorDashboard'));
const DeleteAccountPage   = lazyLoad(() => import('./DeleteAccountPage'));

// --- MODALS ---
import InfoModal from './components/modals/InfoModal';

const PageLoader = () => (
  <div className="min-h-[100dvh] bg-slate-950 flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"/>
  </div>
);

// ==========================================
// REUSABLE COMPONENTS
// ==========================================
const PasswordInput = ({ value, onChange, placeholder, autoFocus = false, minLength, showPassword, togglePassword }) => (
  <div className="relative group w-full">
    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none" size={18} />
    <input 
      type={showPassword ? "text" : "password"} 
      required 
      minLength={minLength}
      autoFocus={autoFocus}
      value={value} 
      onChange={onChange} 
      placeholder={placeholder} 
      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-11 py-3.5 text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 transition-all" 
    />
    <button 
      type="button"
      onClick={togglePassword}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
    >
      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  </div>
);

const PW_RULES = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'Uppercase letter (A–Z)',  test: (p) => /[A-Z]/.test(p) },
  { label: 'Lowercase letter (a–z)',  test: (p) => /[a-z]/.test(p) },
  { label: 'Number (0–9)',            test: (p) => /\d/.test(p) },
];

const PasswordStrength = ({ value }) => {
  if (!value) return null;
  const passed = PW_RULES.filter(r => r.test(value)).length;
  const pct = (passed / PW_RULES.length) * 100;
  const bar = pct <= 25 ? 'bg-red-400' : pct <= 50 ? 'bg-orange-400' : pct <= 75 ? 'bg-yellow-400' : 'bg-emerald-500';
  return (
    <div className="px-1 space-y-2 animate-in fade-in duration-200">
      <div className="flex gap-1 h-1">
        {PW_RULES.map((_, i) => (
          <div key={i} className={`flex-1 rounded-full transition-all duration-300 ${i < passed ? bar : 'bg-slate-200'}`} />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
        {PW_RULES.map(r => {
          const ok = r.test(value);
          return (
            <li key={r.label} className={`flex items-center gap-1.5 text-[10px] font-bold transition-colors ${ok ? 'text-emerald-600' : 'text-slate-400'}`}>
              <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 ${ok ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                {ok ? <svg viewBox="0 0 10 10" className="w-2 h-2"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                    : <span className="w-1 h-1 rounded-full bg-slate-400 block"/>}
              </span>
              {r.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const formatCount = (num) => {
  if (num >= 1e9) return (num / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return num.toString();
};

// ==========================================
// MAIN DEUS APP (USER FACING)
// ==========================================
function MainApp() {
  const [isAppReady, setIsAppReady] = useState(true);
  const [sessionChecking, setSessionChecking] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    if (!isAppReady) return;
    const splash = document.getElementById('splash');
    if (!splash) return;
    splash.classList.add('hide');
    const t = setTimeout(() => splash.parentNode?.removeChild(splash), 550);
    return () => clearTimeout(t);
  }, [isAppReady]);
  
  const [currentView, setCurrentView] = useState('enter_email'); 
  const [emailValue, setEmailValue] = useState('');
  const [passwordValue, setPasswordValue] = useState('');
  const [nameValue, setNameValue] = useState('');
  const [phoneValue, setPhoneValue] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [otpChannel, setOtpChannel] = useState('sms');
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' | 'phone'
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const pendingSessionRef = useRef(null);
  const otpAutoSentRef = useRef(false);
  const lastOtpSentRef = useRef(0);
  const [mobileOS, setMobileOS] = useState(null); // 'android' | 'ios' | null
  const [androidBannerDismissed, setAndroidBannerDismissed] = useState(false);
  const [showAcademy, setShowAcademy] = useState(false);
  const [showGuideHub, setShowGuideHub] = useState(false);


  const [activeModal, setActiveModal] = useState(null);
  const [networkStats, setNetworkStats] = useState({ users: 0, orgs: 0, countries: 0 });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) sessionStorage.setItem('ifb_ref_code', ref);

    // Persist return_to so the SSO redirect survives even if the URL changes
    const rt = urlParams.get('return_to');
    if (rt) sessionStorage.setItem('sso_return_to', rt);
    else sessionStorage.removeItem('sso_return_to');

    const hash = window.location.hash;
    if (hash && (hash.includes('type=invite') || hash.includes('type=recovery'))) {
      setCurrentView('update_password');
    }

    // Stripe redirect-back: confirm deposit so balance is credited even if webhook is delayed
    const piId = urlParams.get('payment_intent');
    const piStatus = urlParams.get('redirect_status');
    if (piId && piStatus === 'succeeded') {
      supabase.auth.getSession().then(async ({ data: { session: s } }) => {
        if (!s) return;
        try {
          await supabase.functions.invoke('confirm-deposit', { body: { payment_intent_id: piId } });
        } catch (e) {
          console.warn('confirm-deposit error:', e);
        }
        // Clean URL so refreshing doesn't re-trigger
        window.history.replaceState({}, '', window.location.pathname);
      });
    }
  }, []);

  useEffect(() => {
    // Defer stats fetch — don't block login page initial render
    const t = setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc('get_network_stats');
        if (data && !error) {
          setNetworkStats({ users: data.users || 0, orgs: data.orgs || 0, countries: data.countries || 0 });
        }
      } catch (err) { /* non-critical */ }
    }, 2000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    const isNative = window?.Capacitor?.isNativePlatform?.() || window?.Capacitor?.isNative;
    if (isNative) return;
    if (/android/i.test(ua)) setMobileOS('android');
    else if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) setMobileOS('ios');
    else if (/Mac/.test(ua) && !/iPhone|iPad|iPod/.test(ua)) setMobileOS('mac');
    else if (/Win/.test(ua)) setMobileOS('windows');
  }, []);

  useEffect(() => { setShowPassword(false); }, [currentView]);

  useEffect(() => {
    let mounted = true;

    const initializeUser = async (currentSession) => {
      if (!currentSession?.user) {
        if (mounted) { 
          setSession(null); 
          setIsAppReady(true); 
        }
        return;
      }

      setSession(currentSession);

      // If a scaffold app redirected here for cross-app SSO, bridge the session back.
      // Read from sessionStorage as fallback in case the URL query string was cleaned up.
      const returnTo = new URLSearchParams(window.location.search).get('return_to')
                    || sessionStorage.getItem('sso_return_to');
      if (returnTo) {
        sessionStorage.removeItem('sso_return_to');
        try {
          const params = new URLSearchParams({
            access_token: currentSession.access_token,
            refresh_token: currentSession.refresh_token,
            expires_in: '3600',
            token_type: 'bearer',
          });
          const target = new URL(returnTo);
          target.hash = params.toString();
          window.location.href = target.toString();
          return;
        } catch (_) {}
      }

      try {
        const { data: profile } = await supabase.from('profiles').select('id,theme_preference,kyc_status,role,full_name,phone_number,phone_verified').eq('id', currentSession.user.id).maybeSingle();
          
        if (profile) {
          document.documentElement.setAttribute('data-theme', profile.theme_preference || 'system');
        } else {
          const generatedName = currentSession.user.user_metadata?.full_name || currentSession.user.email?.split('@')[0] || 'Client';
          const refCode = sessionStorage.getItem('ifb_ref_code') || null;

          const { error: rpcErr } = await supabase.rpc('provision_new_user', {
            p_user_id: currentSession.user.id,
            p_full_name: generatedName,
            p_ref_code: refCode
          });

          if (rpcErr) {
            // RPC has stale schema — directly ensure the profile row exists
            await supabase.from('profiles').upsert({
              id: currentSession.user.id,
              email: currentSession.user.email,
              full_name: generatedName,
              kyc_status: 'not_started',
              role: 'user',
              theme_preference: 'system',
            }, { onConflict: 'id', ignoreDuplicates: true });
            // Best-effort wallet — ignore if schema differs
            supabase.from('wallets').upsert(
              { user_id: currentSession.user.id, currency: 'USD', balance: 0 },
              { onConflict: 'user_id', ignoreDuplicates: true }
            ).catch(() => {});
          }
        }
        // Phone verification gate — block dashboard until phone is verified
        if (profile && !profile.phone_verified) {
          if (mounted) {
            pendingSessionRef.current = currentSession;
            setPhoneValue(profile.phone_number || '');
            if (profile.phone_number) {
              // Guard: only auto-send once per app session to prevent Twilio from
              // cancelling an active verification on repeated SIGNED_IN events.
              if (!otpAutoSentRef.current) {
                otpAutoSentRef.current = true;
                lastOtpSentRef.current = Date.now();
                await supabase.functions.invoke('send-otp', { body: { phoneNumber: profile.phone_number } });
              }
              setCurrentView('verify_otp_sms');
            } else {
              setCurrentView('verify_phone');
            }
            setIsAppReady(true);
            setSessionChecking(false);
          }
          return;
        }

        // Silently reconcile any deposits that webhook may have missed
        supabase.functions.invoke('reconcile-deposits').catch(() => {});
      } catch (err) {
        console.error("Profile initialization error:", err);
      } finally {
        if (mounted) { setIsAppReady(true); setSessionChecking(false); }
      }
    };
    
    // Race getSession against an 8-second timeout — prevents the splash from
    // freezing forever when Supabase is unreachable (common on slow mobile networks).
    let initialized = false;
    const initOnce = (s) => { if (!initialized) { initialized = true; initializeUser(s); } };
    const fallbackTimer = setTimeout(() => { if (mounted) { initOnce(null); setSessionChecking(false); } }, 3000);

    supabase.auth.getSession()
      .then(({ data: { session } }) => { clearTimeout(fallbackTimer); initOnce(session); })
      .catch(() => { clearTimeout(fallbackTimer); if (mounted) { initOnce(null); setSessionChecking(false); } });

    sessionStorage.removeItem('ifb_chunk_reload');

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setCurrentView('update_password');
      if (event === 'TOKEN_REFRESH_FAILED') {
        // Stale or revoked token — wipe local session and return to login
        supabase.auth.signOut({ scope: 'local' });
        if (mounted) { setSession(null); setIsAppReady(true); }
        return;
      }
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') initializeUser(session);
    });

    return () => {
      mounted = false;
      clearTimeout(fallbackTimer);
      authListener.subscription.unsubscribe();
    };
  }, []);

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 6000);
  };

  const handleCheckEmail = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data: userExists } = await supabase.rpc('check_user_exists', { check_email: emailValue.trim().toLowerCase() });
      if (userExists) setCurrentView('welcome_back');
      else setCurrentView('identify_yourself');
    } catch (err) { setCurrentView('welcome_back'); } finally { setIsLoading(false); }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: emailValue.trim().toLowerCase(), password: passwordValue });
      if (error) throw error;
    } catch (error) {
      const msg = error.message?.toLowerCase() ?? '';
      if (msg.includes('not confirmed') || msg.includes('email not confirmed')) {
        // Account exists but unconfirmed — send a magic-link confirmation email
        await handleResend();
        return;
      }
      showMessage(error.message, 'error');
    } finally { setIsLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!phoneValue.trim()) { showMessage('Phone number required', 'error'); return; }
    setIsLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: emailValue.trim().toLowerCase(),
        password: passwordValue,
        options: {
          data: { full_name: nameValue, phone: phoneValue.trim() },
          emailRedirectTo: `${APP_URL}/auth/callback`,
        },
      });

      if (authError) {
        const msg = authError.message?.toLowerCase() ?? '';
        const isAlreadyRegistered = msg.includes('already registered') || msg.includes('already been registered') || authError.status === 422;
        if (isAlreadyRegistered) {
          showMessage('This email is already registered. Please log in.', 'error');
          setCurrentView('welcome_back');
          return;
        }

        // If Supabase internal SMTP failed (e.g. 500 "Error sending confirmation email"),
        // fallback to send-confirmation-email edge function which creates the user via Admin API
        // and sends the activation email reliably via Resend.
        if (msg.includes('confirmation email') || msg.includes('unexpected_failure') || authError.status === 500) {
          const res = await fetch(`${supabaseUrl}/functions/v1/send-confirmation-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseAnonKey,
              'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({
              email: emailValue.trim().toLowerCase(),
              password: passwordValue,
              name: nameValue,
              redirectTo: `${APP_URL}/auth/callback`,
            }),
          });
          const json = await res.json();
          if (res.ok) {
            if (phoneValue.trim()) {
              try {
                await supabase.functions.invoke('send-otp', {
                  body: { phoneNumber: phoneValue.trim(), channel: otpChannel },
                });
              } catch (_) { /* non-fatal */ }
            }
            setCurrentView('check_email');
            showMessage('Account created! Confirmation link sent to your email.', 'success');
            return;
          }
        }
        throw authError;
      }

      if (authData?.user && !authData.session) {
        // Email confirmation required: phone is verified after first sign-in (phone gate),
        // because verify-otp needs an authenticated session.
        setCurrentView('check_email');
        showMessage('Account created! Confirm your email, then sign in to verify your phone.', 'success');
        return;
      }

      if (authData?.user) {
        // Phone OTP verification with the fresh session
        pendingSessionRef.current = authData.session;
        const { data: otpData, error: otpErr } = await supabase.functions.invoke('send-otp', {
          body: { phoneNumber: phoneValue.trim(), channel: otpChannel },
        });
        if (otpErr) throw new Error(otpErr.message);
        if (otpData?.error) throw new Error(otpData.error);
        lastOtpSentRef.current = Date.now();
        setOtpValue('');
        setCurrentView('verify_otp_sms');
        showMessage('Verification code sent to your phone.', 'success');
      }
    } catch (err) {
      showMessage(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    try {
      // Use our own edge function — bypasses Supabase's 3/hour rate limit entirely.
      // Generates a fresh confirmation link via Admin API and sends it via Resend.
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${supabaseUrl}/functions/v1/send-confirmation-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${session?.access_token ?? supabaseAnonKey}`,
          },
          body: JSON.stringify({
            email: emailValue.trim().toLowerCase(),
            // Pass registration data so the edge function can create the user
            // if Supabase's signUp failed before inserting them into auth.users
            password: passwordValue || undefined,
            name: nameValue || undefined,
            redirectTo: `${APP_URL}/auth/callback`,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to send confirmation email');
      setCurrentView('check_email');
      showMessage('Confirmation email sent — check your inbox.', 'success');
    } catch (err) {
      // Always move to check_email — never leave user stranded on the form
      setCurrentView('check_email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Use Resend instead of Supabase's rate-limited default mailer.
      // admin.generateLink({type:'recovery'}) creates the token; we send the email.
      const res = await fetch(
        `${supabaseUrl}/functions/v1/send-password-reset-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({ email: emailValue.trim().toLowerCase() }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to send reset email');
      showMessage('Recovery link dispatched to your inbox.', 'success');
      setCurrentView('check_email');
    } catch (error) { showMessage(error.message, 'error'); } finally { setIsLoading(false); }
  };

  const handleSendLoginOTP = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    setIsLoading(true);
    try {
      const phone = phoneValue.trim();
      if (!phone) throw new Error('Phone number required');
      const { data: otpRes, error } = await supabase.functions.invoke('send-otp', { body: { phoneNumber: phone, channel: otpChannel } });
      if (error) throw new Error(error.message);
      if (otpRes?.error) throw new Error(otpRes.error);
      pendingSessionRef.current = { _loginMode: true };
      lastOtpSentRef.current = Date.now();
      setOtpValue('');
      setCurrentView('verify_otp_sms');
      showMessage('Verification code sent to your phone.', 'success');
    } catch (err) { showMessage(err.message, 'error'); } finally { setIsLoading(false); }
  };

  const handleSendOTP = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    const cooldown = 30_000;
    if (Date.now() - lastOtpSentRef.current < cooldown) {
      showMessage('Please wait 30 seconds before requesting another code.', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const phone = phoneValue.trim();
      if (!phone) throw new Error('Phone number required');
      const { data: otpRes2, error } = await supabase.functions.invoke('send-otp', { body: { phoneNumber: phone, channel: otpChannel } });
      if (error) throw new Error(error.message);
      if (otpRes2?.error) throw new Error(otpRes2.error);
      lastOtpSentRef.current = Date.now();
      setOtpValue('');
      setCurrentView('verify_otp_sms');
      showMessage('Verification code sent to your phone.', 'success');
    } catch (err) { showMessage(err.message, 'error'); } finally { setIsLoading(false); }
  };

  const handleVerifyOTP = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    setIsLoading(true);
    try {
      const pending = pendingSessionRef.current;
      const isLoginMode = pending?._loginMode === true;

      // Register mode is authenticated by the session JWT (sent automatically by invoke).
      const { data: result, error } = await supabase.functions.invoke('verify-otp', {
        body: {
          phoneNumber: phoneValue.trim(),
          code: otpValue.trim(),
          mode: isLoginMode ? 'login' : 'register',
        },
      });
      if (error) throw new Error(error.message);
      if (result?.error) throw new Error(result.error);

      pendingSessionRef.current = null;
      setOtpValue('');

      if (result?.hashed_token) {
        // Login mode returns a hashed_token to exchange for a session
        const { error: otpErr } = await supabase.auth.verifyOtp({
          token_hash: result.hashed_token,
          type: 'magiclink',
        });
        if (otpErr) throw otpErr;
        // onAuthStateChange fires SIGNED_IN → initializeUser handles the rest
      } else if (pending && !isLoginMode) {
        // Phone-gate with existing real session (pending = currentSession from initializeUser)
        setSession(pending);
        setIsAppReady(true);
      }
    } catch (err) { showMessage(err.message, 'error'); } finally { setIsLoading(false); }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordValue });
      if (error) throw error;
      setCurrentView('dashboard'); 
      showMessage('Vault Key secured. Access granted.', 'success');
    } catch (error) { showMessage(error.message, 'error'); } finally { setIsLoading(false); }
  };

  if (session && currentView !== 'update_password') {
    return (
      <Suspense fallback={<PageLoader />}>
        <Dashboard session={session} onSignOut={() => { supabase.auth.signOut(); setCurrentView('enter_email'); setEmailValue(''); setPasswordValue(''); }} />
      </Suspense>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50/80 text-slate-800 relative flex flex-col items-center justify-center p-6 py-12 overflow-y-auto">

      {/* ── Sticky Android Play Store banner ── */}
      {mobileOS === 'android' && !androidBannerDismissed && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-[#202124] border-b border-white/10 px-4 py-2.5 flex items-center gap-3 shadow-lg">
          <div className="w-8 h-8 flex-shrink-0 p-1.5 rounded-lg bg-white/10">
            <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
              <path d="M3.18 23.76c.28.16.6.2.9.12l11.46-11.45L12 9l-8.82 14.76z" fill="#EA4335"/>
              <path d="M22.82 10.5l-3.06-1.74L16.2 12l3.56 3.56 3.06-1.74c.87-.5.87-1.82 0-2.32z" fill="#FBBC04"/>
              <path d="M3.18.24C2.85.04 2.46.02 2.1.24 1.74.46 1.5.86 1.5 1.3v21.4c0 .44.24.84.6 1.06.36.22.75.2 1.08 0L15.63 12 3.18.24z" fill="#4285F4"/>
              <path d="M4.08.12L15.63 12l3.56-3.56L7.72.18C7.38-.02 6.96-.06 6.6.12L4.08.12z" fill="#34A853"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-black leading-none">Better on the Android app</p>
            <p className="text-slate-400 text-[10px] leading-none mt-0.5">Free on Google Play</p>
          </div>
          <a
            href="https://play.google.com/store/apps/details?id=org.infinitefuturebank.deus"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 bg-[#4285F4] text-white text-[11px] font-black px-4 py-1.5 rounded-full hover:bg-[#5a95f5] transition-colors"
          >
            Install
          </a>
          <button onClick={() => setAndroidBannerDismissed(true)} className="flex-shrink-0 text-slate-500 hover:text-slate-300 transition-colors p-1">
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>
          </button>
        </div>
      )}

      <InfoModal activeModal={activeModal} onClose={() => setActiveModal(null)} />

      <div className="relative z-10 w-full max-w-[440px]">
        {/* INSTITUTIONAL BRAND HEADER & SPOTLIGHT */}
        <div className="flex flex-col items-center mb-6 cursor-pointer select-none" onClick={() => setCurrentView('enter_email')}>
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-900 text-white mb-3 shadow-sm border border-slate-800">
            <Building2 size={22} className="text-blue-400" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black tracking-tight text-slate-900">DEUS</h1>
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-blue-50 text-blue-700 border border-blue-200">Institutional</span>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 mt-1">Infinite Future Bank</p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Sovereign Treasury & Impact Operating System</p>
        </div>

        <div className="w-full bg-white border border-slate-200/90 shadow-sm rounded-2xl p-6 sm:p-8 relative">

          {message.text && (
            <div className={`p-3.5 mb-5 rounded-xl text-xs font-semibold flex items-center justify-center border ${message.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
              {message.text}
            </div>
          )}

          {currentView === 'enter_email' && (
            <div className="animate-in fade-in duration-200 text-center">
              <h2 className="text-xl font-bold tracking-tight mb-1 text-slate-900">Access Portal</h2>
              {sessionChecking ? (
                <p className="text-xs text-blue-600 font-medium flex items-center justify-center gap-1.5 mb-5">
                  <RefreshCw size={12} className="animate-spin" /> Verifying secure session...
                </p>
              ) : (
                <p className="text-xs text-slate-500 mb-5">Sign in to manage your treasury, cards, and capital</p>
              )}

              {/* Login method toggle */}
              <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl mb-5">
                <button
                  type="button"
                  onClick={() => setLoginMethod('email')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${loginMethod === 'email' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <Mail size={13} /> Email
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMethod('phone')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${loginMethod === 'phone' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <Smartphone size={13} /> Phone
                </button>
              </div>

              {loginMethod === 'email' ? (
                <form onSubmit={handleCheckEmail} className="space-y-4">
                  <div className="relative group w-full text-left">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none" size={18} />
                    <input
                      type="email"
                      required
                      autoFocus
                      value={emailValue}
                      onChange={(e) => setEmailValue(e.target.value)}
                      placeholder="banker@deus.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3.5 text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || !emailValue}
                    className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm py-3.5 px-4 rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoading ? <RefreshCw size={16} className="animate-spin" /> : 'Continue'}
                    {!isLoading && <ChevronRight size={16} />}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSendLoginOTP} className="space-y-4">
                  <PhoneField value={phoneValue} onChange={setPhoneValue} autoFocus focusColor="blue" />
                  <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setOtpChannel('sms')}
                      className={`py-2 text-xs font-bold rounded-lg transition-all ${otpChannel === 'sms' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      SMS
                    </button>
                    <button
                      type="button"
                      onClick={() => setOtpChannel('whatsapp')}
                      className={`py-2 text-xs font-bold rounded-lg transition-all ${otpChannel === 'whatsapp' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      WhatsApp
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || !phoneValue}
                    className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm py-3.5 px-4 rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoading ? <RefreshCw size={16} className="animate-spin" /> : 'Send Verification Code'}
                    {!isLoading && <ChevronRight size={16} />}
                  </button>
                </form>
              )}
            </div>
          )}

          {currentView === 'welcome_back' && (
            <div className="animate-in slide-in-from-right-4 duration-200 text-center">
              <h2 className="text-xl font-bold tracking-tight mb-1 text-slate-900">Welcome Back</h2>
              <p className="text-xs font-semibold text-blue-600 mb-5">{emailValue}</p>
              <form onSubmit={handleLogin} className="space-y-4">
                <PasswordInput
                  value={passwordValue}
                  onChange={(e) => setPasswordValue(e.target.value)}
                  placeholder="Password"
                  autoFocus={true}
                  showPassword={showPassword}
                  togglePassword={() => setShowPassword(!showPassword)}
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setCurrentView('forgot_password')}
                    className="text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                
                <button
                  type="submit"
                  disabled={isLoading || !passwordValue}
                  className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm py-3.5 px-4 rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? <><RefreshCw size={16} className="animate-spin" /> Authenticating...</> : 'Sign In'}
                </button>
              </form>
              <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => setCurrentView('identify_yourself')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Don't have an account? Sign Up
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('enter_email')}
                  className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Use a different email or phone
                </button>
              </div>
            </div>
          )}

          {currentView === 'forgot_password' && (
            <div className="animate-in slide-in-from-left-4 duration-200 text-center">
              <h2 className="text-xl font-bold tracking-tight mb-1 text-slate-900">Reset Password</h2>
              <p className="text-xs text-slate-500 mb-5">Enter your email to receive password reset instructions.</p>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="relative group w-full text-left">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none" size={18} />
                  <input
                    type="email"
                    required
                    autoFocus
                    value={emailValue}
                    onChange={(e) => setEmailValue(e.target.value)}
                    placeholder="banker@deus.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3.5 text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !emailValue}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm py-3.5 px-4 rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? <RefreshCw size={16} className="animate-spin" /> : 'Send Reset Link'}
                </button>
              </form>
              <div className="mt-5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentView('welcome_back')}
                  className="text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
                >
                  Return to Sign In
                </button>
              </div>
            </div>
          )}

          {currentView === 'identify_yourself' && (
            <div className="animate-in slide-in-from-right-4 duration-200 text-center">
              <h2 className="text-xl font-bold tracking-tight mb-1 text-slate-900">Create Account</h2>
              <p className="text-xs text-slate-500 mb-5">Register your institutional identity</p>
              <form onSubmit={handleRegister} className="space-y-3.5 text-left">
                <div className="relative group w-full">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none" size={18} />
                  <input
                    type="text"
                    required
                    autoFocus
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    placeholder="Full Legal Name"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3.5 text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 transition-all"
                  />
                </div>
                <PhoneField value={phoneValue} onChange={setPhoneValue} focusColor="blue" />
                <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setOtpChannel('sms')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${otpChannel === 'sms' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    SMS
                  </button>
                  <button
                    type="button"
                    onClick={() => setOtpChannel('whatsapp')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${otpChannel === 'whatsapp' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    WhatsApp
                  </button>
                </div>
                <PasswordInput
                  value={passwordValue}
                  onChange={(e) => setPasswordValue(e.target.value)}
                  placeholder="Set Password (min 8 chars)"
                  minLength={8}
                  showPassword={showPassword}
                  togglePassword={() => setShowPassword(!showPassword)}
                />
                <PasswordStrength value={passwordValue} />
                <button
                  type="submit"
                  disabled={isLoading || !nameValue || !phoneValue || !PW_RULES.every(r => r.test(passwordValue))}
                  className="w-full mt-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm py-3.5 px-4 rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? <><RefreshCw size={16} className="animate-spin" /> Creating Account...</> : 'Create Identity'}
                </button>
              </form>
              <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => setCurrentView('welcome_back')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Already have an account? Log In
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('enter_email')}
                  className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Switch Email
                </button>
              </div>
            </div>
          )}

          {currentView === 'verify_phone' && (
            <div className="animate-in slide-in-from-right-4 duration-200 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4">
                <Smartphone size={26} />
              </div>
              <h2 className="text-xl font-bold tracking-tight mb-1 text-slate-900">Phone Verification</h2>
              <p className="text-xs text-slate-500 mb-5">Enter your phone number to receive your one-time verification code.</p>
              <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl mb-4">
                <button
                  type="button"
                  onClick={() => setOtpChannel('sms')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${otpChannel === 'sms' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  SMS
                </button>
                <button
                  type="button"
                  onClick={() => setOtpChannel('whatsapp')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${otpChannel === 'whatsapp' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  WhatsApp
                </button>
              </div>
              <form onSubmit={handleSendOTP} className="space-y-4">
                <PhoneField value={phoneValue} onChange={setPhoneValue} autoFocus focusColor="blue" />
                <button
                  type="submit"
                  disabled={isLoading || !phoneValue}
                  className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm py-3.5 px-4 rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? <RefreshCw size={16} className="animate-spin" /> : 'Send Code'}
                  {!isLoading && <ChevronRight size={16} />}
                </button>
              </form>
            </div>
          )}

          {currentView === 'verify_otp_sms' && (
            <div className="animate-in slide-in-from-right-4 duration-200 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
                <Smartphone size={26} />
              </div>
              <h2 className="text-xl font-bold tracking-tight mb-1 text-slate-900">Enter Verification Code</h2>
              <p className="text-xs font-semibold text-blue-600 mb-1">{phoneValue}</p>
              <p className="text-xs text-slate-500 mb-5">
                We sent a 6-digit code via <span className="font-bold text-slate-800">{otpChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'}</span>. Enter it below.
              </p>
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  autoFocus
                  value={otpValue}
                  onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-2xl font-black text-center tracking-[0.4em] font-mono outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/15 transition-all text-slate-900"
                />
                <button
                  type="submit"
                  disabled={isLoading || otpValue.length !== 6}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm py-3.5 px-4 rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? <><RefreshCw size={16} className="animate-spin" /> Verifying...</> : 'Verify & Access'}
                  {!isLoading && <ChevronRight size={16} />}
                </button>
              </form>
              <div className="mt-4 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={handleSendOTP}
                  disabled={isLoading}
                  className="text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
                >
                  Resend Code
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={() => setCurrentView('enter_email')}
                  className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {currentView === 'check_email' && (
            <div className="animate-in slide-in-from-bottom-4 duration-200 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4">
                <Mail size={26}/>
              </div>
              <h2 className="text-xl font-bold tracking-tight mb-1 text-slate-900">Check Your Inbox</h2>
              <p className="text-xs font-semibold text-blue-600 mb-2">{emailValue}</p>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                We sent a confirmation link. Click it to activate your account. Check your <span className="font-semibold text-slate-700">Spam</span> folder if you don't see it within a minute.
              </p>
              <button
                onClick={handleResend}
                disabled={isLoading}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all mb-3 cursor-pointer shadow-xs"
              >
                {isLoading ? <RefreshCw size={16} className="animate-spin"/> : <Mail size={16}/>}
                {isLoading ? 'Sending…' : 'Resend Confirmation Email'}
              </button>
              <button
                onClick={() => setCurrentView('enter_email')}
                className="text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
              >
                Back to Sign In
              </button>
            </div>
          )}

          {currentView === 'update_password' && (
            <div className="animate-in slide-in-from-bottom-4 duration-200 text-center">
              <h2 className="text-xl font-bold tracking-tight mb-1 text-slate-900">Update Password</h2>
              <p className="text-xs text-slate-500 mb-5">Enter your new secure account password</p>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <PasswordInput
                  value={passwordValue}
                  onChange={(e) => setPasswordValue(e.target.value)}
                  placeholder="New Password"
                  autoFocus={true}
                  minLength={6}
                  showPassword={showPassword}
                  togglePassword={() => setShowPassword(!showPassword)}
                />
                <button
                  type="submit"
                  disabled={isLoading || !passwordValue}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-3.5 px-4 rounded-xl shadow-xs transition-all disabled:opacity-50"
                >
                  Save New Password
                </button>
              </form>
            </div>
          )}
        </div>

        {/* CLEAN, UNIFIED FOOTER WITH NEW TRUST LINK */}
        <div className="mt-8 text-center text-[11px] font-medium text-slate-500 px-4 animate-in fade-in duration-700 delay-100 leading-relaxed">
          Trusted by <span className="font-bold text-slate-700">{formatCount(networkStats.users)}</span> customers and <span className="font-bold text-slate-700">{formatCount(networkStats.orgs)}</span> organizations in <span className="font-bold text-slate-700">{formatCount(networkStats.countries)}</span> countries. <span onClick={() => setActiveModal('registration')} className="font-bold underline cursor-pointer hover:text-blue-600 transition-colors">Infinite Future Bank LLC</span> is incorporated in the State of Delaware, United States (File No. 10649108), headquartered at 1717 Pennsylvania Ave NW, Washington DC. Discover how <span onClick={() => setActiveModal('about')} className="font-bold underline cursor-pointer hover:text-blue-600 transition-colors">IFB works</span>, the <span onClick={() => setActiveModal('about')} className="font-bold underline cursor-pointer hover:text-blue-600 transition-colors">AFR in its brain</span>, our <span onClick={() => setActiveModal('insurance')} className="font-bold underline cursor-pointer hover:text-blue-600 transition-colors">Insurance Protocol</span>, and explore our core <span onClick={() => setActiveModal('trust')} className="font-bold underline cursor-pointer hover:text-blue-600 transition-colors">Trust Framework</span>. Read our <span onClick={() => setActiveModal('policies')} className="font-bold underline cursor-pointer hover:text-blue-600 transition-colors">Policies</span> & <span onClick={() => setActiveModal('terms')} className="font-bold underline cursor-pointer hover:text-blue-600 transition-colors">Terms of Service</span>. Need assistance or want to share feedback so we can serve you better? <span onClick={() => setActiveModal('help')} className="font-bold underline cursor-pointer hover:text-blue-600 transition-colors">Get Help & FAQ</span>. Explore our <span onClick={() => setShowGuideHub(true)} className="font-bold underline cursor-pointer hover:text-blue-600 transition-colors">Guides</span>.
        </div>

        {/* DEUS ACADEMY LINK */}
        <div className="mt-5 flex justify-center animate-in fade-in duration-700 delay-200">
          <button
            onClick={() => setShowAcademy(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors text-indigo-700 font-bold text-[11px] uppercase tracking-widest shadow-sm hover:shadow-indigo-100"
          >
            <GraduationCap size={14} />
            Explore DEUS — Interactive Learning
          </button>
        </div>

        {showAcademy && <Suspense fallback={<PageLoader />}><DEUSAcademy onClose={() => setShowAcademy(false)} /></Suspense>}
        {showGuideHub && <Suspense fallback={<PageLoader />}><GuideHub onClose={() => setShowGuideHub(false)} /></Suspense>}


        {/* ── ANDROID: Play Store download ── */}
        {mobileOS === 'android' && (
          <div className="mt-6 animate-in slide-in-from-bottom-8 duration-500 delay-200">
            <a
              href="https://play.google.com/store/apps/details?id=org.infinitefuturebank.deus"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between bg-slate-900/80 backdrop-blur-2xl border border-slate-700/50 p-4 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:scale-[1.02] transition-transform group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-800/80 rounded-2xl flex items-center justify-center shadow-inner border border-slate-700/50 p-2.5">
                  <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                    <path d="M3.18 23.76c.28.16.6.2.9.12l11.46-11.45L12 9l-8.82 14.76z" fill="#EA4335"/>
                    <path d="M22.82 10.5l-3.06-1.74L16.2 12l3.56 3.56 3.06-1.74c.87-.5.87-1.82 0-2.32z" fill="#FBBC04"/>
                    <path d="M3.18.24C2.85.04 2.46.02 2.1.24 1.74.46 1.5.86 1.5 1.3v21.4c0 .44.24.84.6 1.06.36.22.75.2 1.08 0L15.63 12 3.18.24z" fill="#4285F4"/>
                    <path d="M4.08.12L15.63 12l3.56-3.56L7.72.18C7.38-.02 6.96-.06 6.6.12L4.08.12z" fill="#34A853"/>
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-white font-black text-sm tracking-wide leading-none mb-1">Get the Android App</p>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none">Google Play · v{__APP_VERSION__} · Free</p>
                </div>
              </div>
              <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all border border-emerald-500/30">
                <DownloadCloud size={18} />
              </div>
            </a>
          </div>
        )}

        {/* ── macOS: Download DMG ── */}
        {mobileOS === 'mac' && (
          <div className="mt-6 animate-in slide-in-from-bottom-8 duration-500 delay-200 space-y-3">
            <a
              href="/DEUS-mac-arm64.dmg"
              download="DEUS-mac-arm64.dmg"
              className="flex items-center justify-between bg-slate-900/80 backdrop-blur-2xl border border-slate-700/50 p-4 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:scale-[1.02] transition-transform group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-800/80 rounded-2xl flex items-center justify-center text-blue-400 group-hover:text-blue-300 transition-colors shadow-inner border border-slate-700/50">
                  <Monitor size={24} />
                </div>
                <div className="text-left">
                  <p className="text-white font-black text-sm tracking-wide leading-none mb-1">Download for Mac (Apple Silicon)</p>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none">macOS · v{__APP_VERSION__} · DMG · M1/M2/M3/M4</p>
                </div>
              </div>
              <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all border border-blue-500/30">
                <DownloadCloud size={18} />
              </div>
            </a>
            <a
              href="/DEUS-mac-x64.dmg"
              download="DEUS-mac-x64.dmg"
              className="flex items-center justify-between bg-slate-900/60 backdrop-blur-2xl border border-slate-700/30 p-4 rounded-[2rem] hover:scale-[1.02] transition-transform group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-800/60 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-blue-300 transition-colors border border-slate-700/30">
                  <Monitor size={24} />
                </div>
                <div className="text-left">
                  <p className="text-white font-black text-sm tracking-wide leading-none mb-1">Download for Mac (Intel)</p>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none">macOS · v{__APP_VERSION__} · DMG · x64</p>
                </div>
              </div>
              <div className="w-10 h-10 bg-slate-700/50 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-blue-500 group-hover:text-white transition-all border border-slate-600/30">
                <DownloadCloud size={18} />
              </div>
            </a>
            <p className="text-center text-[10px] text-slate-400 font-medium">Open the DMG and drag DEUS to Applications. Right-click → Open on first launch if macOS warns about the developer.</p>
          </div>
        )}

        {/* ── Windows: Download EXE ── */}
        {mobileOS === 'windows' && (
          <div className="mt-6 animate-in slide-in-from-bottom-8 duration-500 delay-200 space-y-3">
            <a
              href="/DEUS-win-x64.exe"
              download="DEUS-win-x64.exe"
              className="flex items-center justify-between bg-slate-900/80 backdrop-blur-2xl border border-slate-700/50 p-4 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:scale-[1.02] transition-transform group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-800/80 rounded-2xl flex items-center justify-center text-sky-400 group-hover:text-sky-300 transition-colors shadow-inner border border-slate-700/50">
                  <Monitor size={24} />
                </div>
                <div className="text-left">
                  <p className="text-white font-black text-sm tracking-wide leading-none mb-1">Download for Windows</p>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none">Windows 10/11 · v{__APP_VERSION__} · Installer · 64-bit</p>
                </div>
              </div>
              <div className="w-10 h-10 bg-sky-500/20 rounded-full flex items-center justify-center text-sky-400 group-hover:bg-sky-500 group-hover:text-white transition-all border border-sky-500/30">
                <DownloadCloud size={18} />
              </div>
            </a>
            <p className="text-center text-[10px] text-slate-400 font-medium">Run the installer. If Windows SmartScreen appears, click <span className="font-bold text-slate-300">"More info" → "Run anyway"</span>.</p>
          </div>
        )}

        {/* ── iOS: Add to Home Screen guide ── */}
        {mobileOS === 'ios' && (
          <div className="mt-6 animate-in slide-in-from-bottom-8 duration-500 delay-200">
            <div className="bg-slate-900/80 backdrop-blur-2xl border border-slate-700/50 p-5 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
                  <Smartphone size={20} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-black text-sm leading-none mb-1">Add DEUS to Home Screen</p>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">iOS · App-like experience</p>
                </div>
              </div>
              <ol className="space-y-2.5">
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                  <p className="text-slate-300 text-xs font-semibold leading-snug">
                    Tap the <Share2 size={12} className="inline text-blue-400 mx-0.5" /> <span className="text-white font-black">Share</span> button at the bottom of Safari
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                  <p className="text-slate-300 text-xs font-semibold leading-snug">
                    Scroll down and tap <span className="text-white font-black">"Add to Home Screen"</span> <Plus size={12} className="inline text-blue-400 mx-0.5" />
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                  <p className="text-slate-300 text-xs font-semibold leading-snug">
                    Tap <span className="text-white font-black">"Add"</span> — DEUS opens fullscreen like a native app
                  </p>
                </li>
              </ol>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ==========================================
// ADMIN GATEWAY COMPONENT (Support Desk)
// ==========================================
function AdminGateway() {
  const [session, setSession] = useState(null);
  const [adminProfile, setAdminProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) { window.location.href = '/'; return; }
      setSession(currentSession);
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', currentSession.user.id).single();
      if (profile && ['support_l1', 'advisor_l2', 'admin_l3'].includes(profile.role)) {
        setAdminProfile(profile);
      }
      setLoading(false);
    };
    checkAdminStatus();
  }, []);

  if (loading) return <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center"><RefreshCw className="animate-spin text-blue-500" size={32} /></div>;
  
  if (!adminProfile) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center text-white">
        <ShieldAlert size={64} className="text-red-500 mb-4" />
        <h2 className="text-2xl font-black uppercase tracking-widest">Access Denied</h2>
        <p className="text-slate-400 mt-2">You lack the necessary clearance for the Command Center.</p>
        <Link to="/" className="mt-8 px-6 py-3 bg-blue-600 rounded-xl font-bold text-sm">Return to Dashboard</Link>
      </div>
    );
  }
  return <Suspense fallback={<PageLoader />}><AdminSupportDesk session={session} adminProfile={adminProfile} /></Suspense>;
}

// ==========================================
// 🔥 NEW: HQ EXECUTIVE GATEWAY (The CRM)
// ==========================================
function HqGateway() {
  const [session, setSession] = useState(null);
  const [isHqAdmin, setIsHqAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkHqStatus = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) { window.location.href = '/'; return; }
      setSession(currentSession);
      
      // Strict check: Only Level 3 Admins (Founders/Execs) can access the HQ CRM
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', currentSession.user.id).single();
      if (profile && profile.role === 'admin_l3') {
        setIsHqAdmin(true);
      }
      setLoading(false);
    };
    checkHqStatus();
  }, []);

  if (loading) return <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center"><RefreshCw className="animate-spin text-blue-500" size={32} /></div>;
  
  if (!isHqAdmin) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center text-white">
        <ShieldAlert size={64} className="text-red-500 mb-4" />
        <h2 className="text-2xl font-black uppercase tracking-widest">Clearance Level Insufficient</h2>
        <p className="text-slate-400 mt-2">This sector is restricted to Level 3 Command Executives.</p>
        <Link to="/" className="mt-8 px-6 py-3 bg-blue-600 rounded-xl font-bold text-sm hover:bg-blue-500 transition-colors">Eject</Link>
      </div>
    );
  }
  return <Suspense fallback={<PageLoader />}><ExecutiveCrm session={session} /></Suspense>;
}

// ==========================================
// PRIVACY POLICY (public, no auth needed)
// ==========================================
function PrivacyPolicy() {
  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh', color: '#e0e0e8', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', lineHeight: 1.7 }}>
      <div style={{ background: '#12121a', borderBottom: '1px solid #2a2a3a', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>DEUS — Infinite Future Bank</span>
      </div>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 24px 80px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ fontSize: '0.875rem', color: '#7070a0', marginBottom: 40 }}>Effective date: September 1, 2026 | Last updated: September 27, 2026</p>
        <p style={{ color: '#b0b0c8', marginBottom: 14 }}>This Privacy Policy describes how Infinite Future Bank ("IFB", "we", "our", or "us"), operated by World Disaster Center WDC Inc., collects, uses, stores, and protects your personal information when you use the DEUS mobile application and related services (collectively, the "Service"). By using the Service, you agree to the practices described here.</p>
        {[
          ['1. Information We Collect', 'We collect: full name, date of birth, nationality, government-issued ID (KYC); email address, phone number, mailing address; bank account and payment details (tokenised via Stripe or Flutterwave — raw card numbers are never stored); IP address, device identifiers, OS, app version, feature interactions, crash logs; country of residence and, where permitted, approximate location; support messages and in-app chat content.'],
          ['2. How We Use Your Information', 'To create and manage your account and verify identity (KYC/AML). To process payments and transfers. To provide customer support. To detect and prevent fraud and money laundering. To comply with applicable laws and regulations. To improve and personalise the Service. To send transactional notifications. We do not send marketing emails without your consent.'],
          ['3. Legal Basis for Processing', 'Contract performance: delivering the financial services you requested. Legal obligation: KYC, AML, regulatory reporting. Legitimate interests: fraud prevention, security, service improvement. Consent: where you have explicitly opted in.'],
          ['4. Data Sharing', 'We do not sell your data. We may share it with: cloud infrastructure (Supabase / AWS), payment processors (Stripe, Flutterwave), identity verification partners — all bound by data processing agreements; regulatory authorities when legally required; acquirers in a merger or sale, subject to confidentiality protections.'],
          ['5. International Transfers', 'IFB operates across 91 countries. Your data may be transferred to the United States, European Union, or Canada. We apply Standard Contractual Clauses or equivalent safeguards for cross-border transfers.'],
          ['6. Data Retention', 'Data is retained while your account is active and for a minimum of 5 years after account closure as required by financial regulations. KYC documents may be retained for up to 7 years under anti-money-laundering laws.'],
          ['7. Security', 'We use AES-256 encryption at rest, TLS 1.2+ in transit, multi-factor authentication, role-based access controls, and regular security audits. No internet transmission is 100% secure; use a strong, unique password and enable two-factor authentication.'],
          ['8. Your Rights', 'Depending on your jurisdiction you may: access, correct, or delete your data; restrict or object to processing; receive your data in a portable format; withdraw consent; lodge a complaint with your local data protection authority. Email office@worlddisastercenter.org — we respond within 30 days.'],
          ['9. Children\'s Privacy', 'The Service is not directed to children under 18. We do not knowingly collect data from minors. Contact us immediately if you believe a minor has provided their data.'],
          ['10. Cookies', 'The DEUS web app uses essential cookies for session management and security only. No third-party advertising or tracking cookies are used. Analytics data is aggregated and anonymised.'],
          ['11. Changes to This Policy', 'We may update this Policy from time to time. We will notify you of material changes by email or in-app notice at least 14 days before they take effect.'],
        ].map(([title, body]) => (
          <div key={title}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#c0c0e8', marginTop: 32, marginBottom: 8 }}>{title}</h2>
            <p style={{ color: '#b0b0c8' }}>{body}</p>
          </div>
        ))}
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#c0c0e8', marginTop: 32, marginBottom: 8 }}>12. Contact Us</h2>
        <div style={{ background: '#1e1e30', border: '1px solid #2a2a4a', borderRadius: 6, padding: '12px 18px', fontSize: '0.875rem', color: '#9090c0' }}>
          <strong style={{ color: '#c0c0e8' }}>World Disaster Center WDC Inc.</strong><br />
          Data Controller — DEUS / Infinite Future Bank<br /><br />
          Email: <a href="mailto:office@worlddisastercenter.org" style={{ color: '#7b7bff' }}>office@worlddisastercenter.org</a><br />
          Support: <a href="https://app.infinitefuturebank.org" style={{ color: '#7b7bff' }}>app.infinitefuturebank.org</a>
        </div>
      </div>
      <div style={{ textAlign: 'center', padding: 32, fontSize: '0.8rem', color: '#505070', borderTop: '1px solid #1a1a28' }}>
        &copy; 2026 World Disaster Center WDC Inc. — Infinite Future Bank. All rights reserved.
      </div>
    </div>
  );
}

// ==========================================
// MAIN ROUTER
// ==========================================
export default function App() {
  const [session, setSession] = useState(null);

  // Hide splash on every route — not just MainApp
  useEffect(() => {
    const splash = document.getElementById('splash');
    if (!splash) return;
    splash.classList.add('hide');
    const t = setTimeout(() => splash.parentNode?.removeChild(splash), 550);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => { setSession(session); });
    return () => authListener.subscription.unsubscribe();
  }, []);

  return (
    <TranslationProvider>
    <Router>
      <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/pay" element={<PaymentPortal session={session} />} />
        <Route path="/admin" element={<AdminGateway />} />
        <Route path="/hq" element={<HqGateway />} />
        <Route path="/events/:id" element={<PublicEventPage />} />
        <Route path="/guide" element={<CompanyGuide />} />
        <Route path="/kyc-admin"   element={<AdminKYCPortal />} />
        <Route path="/processor"  element={<ProcessorDashboard session={session} />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/delete-account" element={<DeleteAccountPage session={session} />} />
        <Route
          path="/FeedbackForm"
          element={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
              <FeedbackForm session={session} onClose={() => window.location.href = '/'} />
            </div>
          }
        />
        <Route path="*" element={
          <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif', textAlign: 'center', padding: 32 }}>
            <p style={{ fontSize: 48, marginBottom: 12 }}>⬡</p>
            <p style={{ fontWeight: 900, fontSize: 18, color: '#0f172a', marginBottom: 8 }}>Page not found</p>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>This URL doesn't exist in DEUS.</p>
            <button onClick={() => window.location.href = '/'} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 28px', fontWeight: 900, fontSize: 13, cursor: 'pointer' }}>
              Back to DEUS
            </button>
          </div>
        } />
      </Routes>
      </Suspense>
    </Router>
    </TranslationProvider>
  );
}