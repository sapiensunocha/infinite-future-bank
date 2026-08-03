import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { TranslationProvider } from './i18n/TranslationContext';
import { supabase } from './services/supabaseClient';
import { APP_URL } from './config/constants';
import { Mail, Sparkles, ChevronRight, Lock, Eye, EyeOff, Smartphone, DownloadCloud, Monitor, User, RefreshCw, ShieldAlert, Share2, Plus, GraduationCap, Building2 } from 'lucide-react';

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
const AdminKYCPortal   = lazyLoad(() => import('./features/kyc/AdminKYCPortal'));

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
  <div className="relative group">
    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
    <input 
      type={showPassword ? "text" : "password"} 
      required 
      minLength={minLength}
      autoFocus={autoFocus}
      value={value} 
      onChange={onChange} 
      placeholder={placeholder} 
      className="w-full bg-white/50 backdrop-blur-md border border-white/60 rounded-2xl pl-14 pr-14 py-5 text-lg font-black outline-none focus:border-blue-400 focus:bg-white/80 transition-all shadow-inner hover:bg-white/60" 
    />
    <button 
      type="button"
      onClick={togglePassword}
      className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
    >
      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
    </button>
  </div>
);

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
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mobileOS, setMobileOS] = useState(null); // 'android' | 'ios' | null
  const [showAcademy, setShowAcademy] = useState(false);
  const [showGuideHub, setShowGuideHub] = useState(false);


  const [activeModal, setActiveModal] = useState(null);
  const [networkStats, setNetworkStats] = useState({ users: 0, orgs: 0, countries: 0 });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) sessionStorage.setItem('ifb_ref_code', ref);

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

      // If a scaffold app redirected here for cross-app SSO, bridge the session back
      const returnTo = new URLSearchParams(window.location.search).get('return_to');
      if (returnTo) {
        try {
          const params = new URLSearchParams({
            access_token: currentSession.access_token,
            refresh_token: currentSession.refresh_token,
            expires_in: '3600',
            token_type: 'bearer',
          });
          const target = new URL(decodeURIComponent(returnTo));
          target.hash = params.toString();
          window.location.replace(target.toString());
          return;
        } catch (_) {}
      }

      try {
        const { data: profile } = await supabase.from('profiles').select('id,theme_preference,kyc_status,role,full_name').eq('id', currentSession.user.id).maybeSingle();
          
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
    } catch (error) { showMessage(error.message, 'error'); } finally { setIsLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: emailValue.trim().toLowerCase(),
        password: passwordValue,
        options: {
          data: { full_name: nameValue },
          emailRedirectTo: `${APP_URL}/auth/callback`,
        },
      });

      // Email already registered but unconfirmed — resend the confirmation
      if (authError) {
        const msg = authError.message?.toLowerCase() ?? '';
        const isEmailError = msg.includes('sending') || msg.includes('confirmation') || msg.includes('email');
        const isAlreadyRegistered = msg.includes('already registered') || msg.includes('already been registered') || authError.status === 422;
        if (isEmailError || isAlreadyRegistered) {
          await handleResend();
          return;
        }
        throw authError;
      }

      if (authData?.user && !authData?.session) setCurrentView('check_email');
      else showMessage('Identity Secured. Welcome to IFB.', 'success');
    } catch (err) {
      showMessage(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: emailValue.trim().toLowerCase(),
        options: { emailRedirectTo: `${APP_URL}/auth/callback` },
      });
      if (error) throw error;
      setCurrentView('check_email');
      showMessage('Confirmation email resent — check your inbox.', 'success');
    } catch (err) {
      // Even if resend fails, move to check_email so user knows to look in inbox
      setCurrentView('check_email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailValue.trim().toLowerCase(), {
        redirectTo: `${APP_URL}/auth/callback?type=recovery`,
      });
      if (error) throw error;
      showMessage('Recovery link dispatched to your inbox.', 'success');
      setCurrentView('check_email');
    } catch (error) { showMessage(error.message, 'error'); } finally { setIsLoading(false); }
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
      
      <InfoModal activeModal={activeModal} onClose={() => setActiveModal(null)} />

      <div className="fixed top-[-10%] left-[-5%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-blue-200/40 to-indigo-300/20 blur-3xl pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-gradient-to-tl from-emerald-200/30 to-teal-300/10 blur-3xl pointer-events-none"></div>
      
      <div className="relative z-10 w-full max-w-[480px]">
        <div className="flex flex-col items-center mb-8 cursor-pointer group" onClick={() => setCurrentView('enter_email')}>
          <div className="flex items-center gap-1 transition-transform duration-300 group-hover:scale-105">
            {['D','E','U','S'].map((letter, i) => (
              <span
                key={letter}
                className="text-6xl font-black drop-shadow-sm"
                style={{
                  color: ['#4285F4','#EA4335','#FBBC04','#34A853'][i],
                  animation: `loginLetterPop 0.5s cubic-bezier(0.34,1.56,0.64,1) both`,
                  animationDelay: `${i * 0.08}s`
                }}
              >{letter}</span>
            ))}
            <Sparkles className="text-blue-500 ml-3 drop-shadow-md" size={28} style={{ animation: 'loginLetterPop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.36s both' }} />
          </div>
          <style>{`
            @keyframes loginLetterPop {
              from { opacity:0; transform: translateY(16px) scale(0.8); }
              to   { opacity:1; transform: translateY(0) scale(1); }
            }
          `}</style>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-[3rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-10 relative overflow-hidden">
          
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-50"></div>

          {message.text && (
            <div className={`p-4 mb-6 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center border backdrop-blur-md ${message.type === 'error' ? 'bg-red-50/80 text-red-600 border-red-200/50' : 'bg-green-50/80 text-green-600 border-green-200/50'}`}>
              {message.text}
            </div>
          )}

          {currentView === 'enter_email' && (
            <div className="animate-in fade-in duration-300 text-center">
              <h2 className="text-2xl font-black tracking-tight mb-2 text-slate-800">Access Portal</h2>
              {sessionChecking && (
                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest flex items-center justify-center gap-1 mb-6">
                  <RefreshCw size={10} className="animate-spin" /> Connecting to network...
                </p>
              )}
              {!sessionChecking && <div className="mb-8" />}
              <form onSubmit={handleCheckEmail} className="space-y-4">
                <div className="relative group">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                  <input type="email" required autoFocus value={emailValue} onChange={(e) => setEmailValue(e.target.value)} placeholder="banker@deus.com" className="w-full bg-white/50 backdrop-blur-md border border-white/60 rounded-2xl pl-14 pr-6 py-5 text-lg font-black outline-none focus:border-blue-400 focus:bg-white/80 transition-all shadow-inner hover:bg-white/60" />
                </div>
                <button type="submit" disabled={isLoading || !emailValue} className="relative w-full overflow-hidden bg-blue-600 rounded-2xl p-5 flex items-center justify-center group disabled:opacity-50 transition-all shadow-xl hover:shadow-blue-500/20 hover:-translate-y-0.5">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-90 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative z-10 flex items-center gap-3 text-white font-black text-sm uppercase tracking-widest">
                    {isLoading ? <RefreshCw size={18} className="animate-spin" /> : 'Continue'}
                    {!isLoading && <ChevronRight className="group-hover:translate-x-1 transition-transform" />}
                  </div>
                </button>
              </form>
            </div>
          )}

          {currentView === 'welcome_back' && (
            <div className="animate-in slide-in-from-right-4 duration-300 text-center">
              <h2 className="text-2xl font-black tracking-tight mb-2 text-slate-800">Welcome Back</h2>
              <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest mb-8">{emailValue}</p>
              <form onSubmit={handleLogin}>
                <div className="space-y-2">
                  <PasswordInput value={passwordValue} onChange={(e) => setPasswordValue(e.target.value)} placeholder="Password" autoFocus={true} showPassword={showPassword} togglePassword={() => setShowPassword(!showPassword)} />
                  <div className="flex justify-end px-2">
                    <button type="button" onClick={() => setCurrentView('forgot_password')} className="text-[10px] font-black text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-widest py-2">
                      Forgot Vault Key?
                    </button>
                  </div>
                </div>
                
                <button type="submit" disabled={isLoading || !passwordValue} className="relative w-full mt-4 bg-blue-600 rounded-2xl p-5 flex items-center justify-center shadow-xl hover:shadow-blue-500/20 hover:-translate-y-0.5 transition-all disabled:opacity-50 group overflow-hidden">
                   <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-90 group-hover:opacity-100 transition-opacity"></div>
                   <span className="relative z-10 text-white font-black text-sm uppercase tracking-widest">{isLoading ? 'Authenticating...' : 'Confirm Access'}</span>
                </button>
              </form>
              <div className="mt-6 flex flex-col gap-3">
                <button onClick={() => setCurrentView('enter_email')} className="text-[10px] font-black uppercase text-slate-400 hover:text-blue-600 transition-colors">Switch Account</button>
              </div>
            </div>
          )}

          {currentView === 'forgot_password' && (
            <div className="animate-in slide-in-from-left-4 duration-300 text-center">
              <h2 className="text-2xl font-black tracking-tight mb-2 text-slate-800">Vault Recovery</h2>
              <p className="text-xs font-bold text-slate-500 mb-8">Confirm your email to receive a secure reset link.</p>
              <form onSubmit={handleResetPassword} className="space-y-6">
                <div className="relative group">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                  <input type="email" required autoFocus value={emailValue} onChange={(e) => setEmailValue(e.target.value)} placeholder="banker@deus.com" className="w-full bg-white/50 backdrop-blur-md border border-white/60 rounded-2xl pl-14 pr-6 py-5 text-lg font-black outline-none focus:border-blue-400 focus:bg-white/80 transition-all shadow-inner hover:bg-white/60" />
                </div>
                <button type="submit" disabled={isLoading || !emailValue} className="relative w-full overflow-hidden bg-slate-900 rounded-2xl p-5 flex items-center justify-center shadow-xl hover:shadow-slate-500/20 hover:-translate-y-0.5 transition-all disabled:opacity-50 group">
                  <span className="relative z-10 text-white font-black text-sm uppercase tracking-widest">{isLoading ? <RefreshCw size={18} className="animate-spin" /> : 'Dispatch Recovery Key'}</span>
                </button>
              </form>
              <div className="mt-8 flex flex-col gap-3">
                <button onClick={() => setCurrentView('welcome_back')} className="text-[10px] font-black uppercase text-slate-400 hover:text-blue-600 transition-colors">Return to Login</button>
              </div>
            </div>
          )}

          {currentView === 'identify_yourself' && (
            <div className="animate-in slide-in-from-right-4 duration-300 text-center">
              <h2 className="text-2xl font-black tracking-tight mb-8 text-slate-800">Identify Yourself</h2>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="relative group">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
                  <input type="text" required autoFocus value={nameValue} onChange={(e) => setNameValue(e.target.value)} placeholder="Given Name" className="w-full bg-white/50 backdrop-blur-md border border-white/60 rounded-2xl pl-14 pr-6 py-5 text-lg font-black outline-none focus:border-emerald-400 focus:bg-white/80 transition-all shadow-inner hover:bg-white/60" />
                </div>
                <PasswordInput value={passwordValue} onChange={(e) => setPasswordValue(e.target.value)} placeholder="Set Password" minLength={6} showPassword={showPassword} togglePassword={() => setShowPassword(!showPassword)} />
                <button type="submit" disabled={isLoading || !nameValue || !passwordValue} className="relative w-full overflow-hidden bg-emerald-600 rounded-2xl p-5 flex items-center justify-center shadow-xl hover:shadow-emerald-500/20 hover:-translate-y-0.5 transition-all disabled:opacity-50 group">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 opacity-90 group-hover:opacity-100 transition-opacity"></div>
                  <span className="relative z-10 text-white font-black text-sm uppercase tracking-widest flex items-center gap-2">
                    {isLoading ? <><RefreshCw size={16} className="animate-spin" /> Creating Account...</> : 'Register Identity'}
                  </span>
                </button>
              </form>
            </div>
          )}


          {currentView === 'check_email' && (
            <div className="animate-in slide-in-from-bottom-4 duration-300 text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 animate-pulse mb-6 shadow-inner"><Mail size={40}/></div>
              <h2 className="text-2xl font-black mb-2 text-slate-800">Check Your Inbox</h2>
              <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest mb-2">{emailValue}</p>
              <p className="text-xs text-slate-500 font-medium mb-8 px-4">We sent a confirmation link. Click it to activate your account. Check your <span className="font-bold text-slate-700">Spam</span> or <span className="font-bold text-slate-700">Junk</span> folder if you don't see it.</p>
              <button
                onClick={handleResend}
                disabled={isLoading}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black rounded-2xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all mb-4">
                {isLoading ? <RefreshCw size={14} className="animate-spin"/> : <Mail size={14}/>}
                {isLoading ? 'Sending…' : 'Resend Confirmation Email'}
              </button>
              <button onClick={() => setCurrentView('enter_email')} className="text-[10px] font-black uppercase text-slate-400 hover:text-blue-600 transition-colors">Back to Login</button>
            </div>
          )}

          {currentView === 'update_password' && (
            <div className="animate-in slide-in-from-bottom-4 duration-300 text-center">
              <h2 className="text-2xl font-black mb-8 text-slate-800">New Vault Key</h2>
              <form onSubmit={handleUpdatePassword} className="space-y-6">
                <PasswordInput value={passwordValue} onChange={(e) => setPasswordValue(e.target.value)} placeholder="New Password" autoFocus={true} minLength={6} showPassword={showPassword} togglePassword={() => setShowPassword(!showPassword)} />
                <button type="submit" disabled={isLoading || !passwordValue} className="relative w-full bg-blue-600 rounded-2xl p-5 shadow-xl hover:shadow-blue-500/20 hover:-translate-y-0.5 transition-all disabled:opacity-50 group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-90 group-hover:opacity-100 transition-opacity"></div>
                  <span className="relative z-10 text-white font-black text-sm uppercase tracking-widest">Save Password</span>
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


        {/* ── ANDROID: APK download ── */}
        {mobileOS === 'android' && (
          <div className="mt-6 animate-in slide-in-from-bottom-8 duration-500 delay-200">
            <a
              href="/DEUS-latest.apk"
              download="DEUS.apk"
              className="flex items-center justify-between bg-slate-900/80 backdrop-blur-2xl border border-slate-700/50 p-4 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:scale-[1.02] transition-transform group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-800/80 rounded-2xl flex items-center justify-center text-emerald-400 group-hover:text-emerald-300 transition-colors shadow-inner border border-slate-700/50">
                  <Smartphone size={24} />
                </div>
                <div className="text-left">
                  <p className="text-white font-black text-sm tracking-wide leading-none mb-1">Install Android App</p>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none">Signed · v{__APP_VERSION__} · Free</p>
                </div>
              </div>
              <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all border border-emerald-500/30">
                <DownloadCloud size={18} />
              </div>
            </a>
            <p className="mt-2 text-center text-[10px] text-slate-400 font-medium">
              Allow <span className="font-bold text-slate-300">Install unknown apps</span> in Android settings if prompted.
            </p>
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
        <Route path="/kyc-admin" element={<AdminKYCPortal />} />
        <Route
          path="/FeedbackForm"
          element={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
              <FeedbackForm session={session} onClose={() => window.location.href = '/'} />
            </div>
          }
        />
      </Routes>
      </Suspense>
    </Router>
    </TranslationProvider>
  );
}