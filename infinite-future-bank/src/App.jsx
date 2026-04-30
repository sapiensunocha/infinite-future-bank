import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import { APP_URL } from './config/constants';
import { Mail, Sparkles, ChevronRight, Lock, Eye, EyeOff, Smartphone, DownloadCloud, User, RefreshCw, ShieldAlert, ScanFace } from 'lucide-react';

import Dashboard from './Dashboard';
import AuthCallback from './features/onboarding/AuthCallback';
import PaymentPortal from './PaymentPortal';
import FeedbackForm from './FeedbackForm';
import AdminSupportDesk from './AdminSupportDesk';
import ExecutiveCrm from './ExecutiveCrm';
import PublicEventPage from './PublicEventPage';

// --- MODALS ---
import InfoModal from './components/modals/InfoModal';

// --- FACE AUTH ---
import FaceAuthManager from './features/auth/FaceAuthManager';

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
  const [isAppReady, setIsAppReady] = useState(false);
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
  const [showApkPrompt, setShowApkPrompt] = useState(false);

  // Face login state
  const [showFaceLogin, setShowFaceLogin] = useState(false);
  const [faceLoginEmail, setFaceLoginEmail] = useState('');
  const [faceStoredDescriptor, setFaceStoredDescriptor] = useState(null);
  const [faceLoginError, setFaceLoginError] = useState('');
  const [isFaceLoginLoading, setIsFaceLoginLoading] = useState(false);
  const [hasFaceLoginAvailable, setHasFaceLoginAvailable] = useState(false);

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
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const { data, error } = await supabase.rpc('get_network_stats');
        if (data && !error) {
          setNetworkStats({ users: data.users || 0, orgs: data.orgs || 0, countries: data.countries || 0 });
        }
      } catch (err) { console.error("Failed to sync network stats."); }
    };
    loadStats();
  }, []);

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isAndroid = /android/i.test(userAgent);
    const isNativeApp = window?.Capacitor?.isNativePlatform?.() || window?.Capacitor?.isNative;
    if (isAndroid && !isNativeApp) setShowApkPrompt(true);
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

      try {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', currentSession.user.id).maybeSingle(); 
          
        if (profile) {
          document.documentElement.setAttribute('data-theme', profile.theme_preference || 'system');
        } else {
          const generatedName = currentSession.user.user_metadata?.full_name || currentSession.user.email?.split('@')[0] || 'Client';
          const refCode = sessionStorage.getItem('ifb_ref_code') || null;

          await supabase.rpc('provision_new_user', {
            p_user_id: currentSession.user.id,
            p_full_name: generatedName,
            p_ref_code: refCode
          });
        }
      } catch (err) {
        console.error("Profile initialization error:", err);
      } finally {
        if (mounted) setIsAppReady(true);
      }
    };
    
    supabase.auth.getSession().then(({ data: { session } }) => { initializeUser(session); });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setCurrentView('update_password');
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') initializeUser(session);
    });

    return () => {
      mounted = false;
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
      sessionStorage.setItem('deus_just_registered', 'true'); 
      const { data, error } = await supabase.auth.signUp({
        email: emailValue.trim().toLowerCase(), password: passwordValue,
        options: { data: { full_name: nameValue }, emailRedirectTo: `${APP_URL}/auth/callback` }
      });
      if (error) throw error;
      if (data?.user && !data?.session) setCurrentView('check_email');
    } catch (error) { showMessage(error.message, 'error'); } finally { setIsLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailValue.trim().toLowerCase(), {
        redirectTo: `${APP_URL}/auth/callback`,
      });
      if (error) throw error;
      showMessage('Recovery link dispatched to your inbox.', 'success');
      setCurrentView('check_email');
    } catch (error) { showMessage(error.message, 'error'); } finally { setIsLoading(false); }
  };

  // ── Face Login helpers ─────────────────────────────────────────────────────
  const isNativeCapacitor = !!(window?.Capacitor?.isNativePlatform?.() || window?.Capacitor?.isNative);

  // Check if native biometrics are available for the face login button
  useEffect(() => {
    (async () => {
      if (isNativeCapacitor) {
        try {
          const { NativeBiometric } = await import('@capgo/capacitor-native-biometric');
          const { isAvailable } = await NativeBiometric.isAvailable();
          setHasFaceLoginAvailable(isAvailable);
        } catch { setHasFaceLoginAvailable(false); }
      } else {
        // Web: show face button if camera is accessible
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          setHasFaceLoginAvailable(devices.some(d => d.kind === 'videoinput'));
        } catch { setHasFaceLoginAvailable(false); }
      }
    })();
  }, []);

  const handleNativeFaceLogin = async () => {
    setIsFaceLoginLoading(true);
    setFaceLoginError('');
    try {
      const { NativeBiometric } = await import('@capgo/capacitor-native-biometric');
      await NativeBiometric.verifyIdentity({
        reason: 'Log in to DEUS',
        title: 'Face Login',
        subtitle: 'Confirm your identity',
        negativeButtonText: 'Cancel',
      });
      const { username: email, password: rawToken } = await NativeBiometric.getCredentials({
        server: 'deus.infinitefuturebank.org',
      });
      const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawToken));
      const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      const { data, error } = await supabase.functions.invoke('face-auth', {
        body: { mode: 'native', email, tokenHash },
      });
      if (error || !data?.token_hash) throw new Error(error?.message || 'Authentication failed.');
      const { error: verifyErr } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: 'magiclink' });
      if (verifyErr) throw verifyErr;
    } catch (err) {
      if (err.message && !err.message.includes('cancel')) {
        setFaceLoginError(err.message || 'Face login failed. Try your password.');
      }
    } finally { setIsFaceLoginLoading(false); }
  };

  const handleWebFaceLoginStart = async () => {
    const emailToUse = emailValue.trim().toLowerCase();
    if (!emailToUse) {
      setFaceLoginError('Enter your email first so we can load your face profile.');
      return;
    }
    setIsFaceLoginLoading(true);
    setFaceLoginError('');
    try {
      const { data } = await supabase.from('profiles')
        .select('face_login_enabled, face_descriptor')
        .eq('email_lower', emailToUse)
        .maybeSingle();
      if (!data?.face_login_enabled) throw new Error('Face login is not enabled for this account.');
      if (!data?.face_descriptor) throw new Error('No face profile found. Please set up Face Login in Settings.');
      setFaceStoredDescriptor(data.face_descriptor);
      setFaceLoginEmail(emailToUse);
      setShowFaceLogin(true);
    } catch (err) {
      setFaceLoginError(err.message);
    } finally { setIsFaceLoginLoading(false); }
  };

  const handleWebFaceVerified = async (matched) => {
    setShowFaceLogin(false);
    if (!matched) { setFaceLoginError('Face not recognised. Try again or use your password.'); return; }
    setIsFaceLoginLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('face-auth', {
        body: { mode: 'web', email: faceLoginEmail },
      });
      if (error || !data?.token_hash) throw new Error(error?.message || 'Session error.');
      const { error: verifyErr } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: 'magiclink' });
      if (verifyErr) throw verifyErr;
    } catch (err) {
      setFaceLoginError(err.message || 'Authentication failed. Try your password.');
    } finally { setIsFaceLoginLoading(false); }
  };
  // ──────────────────────────────────────────────────────────────────────────

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

  if (!isAppReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <RefreshCw size={32} className="animate-spin text-blue-500 mb-4" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Connecting to Network...</p>
      </div>
    );
  }

  if (session && currentView !== 'update_password') {
    return <Dashboard session={session} onSignOut={() => { supabase.auth.signOut(); setCurrentView('enter_email'); setEmailValue(''); setPasswordValue(''); }} />;
  }

  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-800 relative overflow-hidden flex flex-col items-center justify-center p-6 py-12 overflow-y-auto">
      
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
              <h2 className="text-2xl font-black tracking-tight mb-8 text-slate-800">Access Portal</h2>
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

              {/* Face Login */}
              {hasFaceLoginAvailable && (
                <div className="mt-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 h-px bg-slate-200"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">or</span>
                    <div className="flex-1 h-px bg-slate-200"></div>
                  </div>
                  <button
                    type="button"
                    onClick={isNativeCapacitor ? handleNativeFaceLogin : handleWebFaceLoginStart}
                    disabled={isFaceLoginLoading}
                    className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg disabled:opacity-50 group"
                  >
                    {isFaceLoginLoading
                      ? <RefreshCw size={20} className="animate-spin" />
                      : <ScanFace size={20} className="group-hover:scale-110 transition-transform" />
                    }
                    {isFaceLoginLoading ? 'Recognising...' : 'Sign in with Face'}
                  </button>
                  {faceLoginError && (
                    <p className="mt-3 text-[11px] font-bold text-red-500 text-center">{faceLoginError}</p>
                  )}
                </div>
              )}

              {/* Face camera modal (web) */}
              {showFaceLogin && (
                <FaceAuthManager
                  mode="verify"
                  storedDescriptor={faceStoredDescriptor}
                  onVerified={handleWebFaceVerified}
                  onCancel={() => { setShowFaceLogin(false); setFaceLoginError(''); }}
                />
              )}
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
                {hasFaceLoginAvailable && (
                  <button
                    type="button"
                    onClick={isNativeCapacitor ? handleNativeFaceLogin : () => { setFaceLoginEmail(emailValue.trim().toLowerCase()); handleWebFaceLoginStart(); }}
                    disabled={isFaceLoginLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all disabled:opacity-50"
                  >
                    <ScanFace size={16} /> Use Face Login
                  </button>
                )}
                <button onClick={() => setCurrentView('enter_email')} className="text-[10px] font-black uppercase text-slate-400 hover:text-blue-600 transition-colors">Switch Account</button>
              </div>
              {faceLoginError && (
                <p className="mt-2 text-[11px] font-bold text-red-500 text-center">{faceLoginError}</p>
              )}
              {showFaceLogin && (
                <FaceAuthManager
                  mode="verify"
                  storedDescriptor={faceStoredDescriptor}
                  onVerified={handleWebFaceVerified}
                  onCancel={() => { setShowFaceLogin(false); setFaceLoginError(''); }}
                />
              )}
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
                  <span className="relative z-10 text-white font-black text-sm uppercase tracking-widest">{isLoading ? 'Creating...' : 'Create Vault'}</span>
                </button>
              </form>
            </div>
          )}

          {currentView === 'check_email' && (
            <div className="animate-in slide-in-from-bottom-4 duration-300 text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 animate-pulse mb-6 shadow-inner"><Mail size={40}/></div>
              <h2 className="text-2xl font-black mb-2 text-slate-800">Check Inbox</h2>
              <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest mb-8">{emailValue}</p>
              <button onClick={() => setCurrentView('enter_email')} className="text-[10px] font-black uppercase text-slate-500 hover:text-blue-600 transition-colors">Back to Login</button>
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
          Trusted by <span className="font-bold text-slate-700">{formatCount(networkStats.users)}</span> customers and <span className="font-bold text-slate-700">{formatCount(networkStats.orgs)}</span> organizations in <span className="font-bold text-slate-700">{formatCount(networkStats.countries)}</span> countries. Regulated by US and Canadian governments. Discover how <span onClick={() => setActiveModal('about')} className="font-bold underline cursor-pointer hover:text-blue-600 transition-colors">IFB works</span>, the <span onClick={() => setActiveModal('about')} className="font-bold underline cursor-pointer hover:text-blue-600 transition-colors">AFR in its brain</span>, our <span onClick={() => setActiveModal('insurance')} className="font-bold underline cursor-pointer hover:text-blue-600 transition-colors">Insurance Protocol</span>, and explore our core <span onClick={() => setActiveModal('trust')} className="font-bold underline cursor-pointer hover:text-blue-600 transition-colors">Trust Framework</span>. Read our <span onClick={() => setActiveModal('policies')} className="font-bold underline cursor-pointer hover:text-blue-600 transition-colors">Policies</span> & <span onClick={() => setActiveModal('terms')} className="font-bold underline cursor-pointer hover:text-blue-600 transition-colors">Terms of Service</span>. Need assistance or want to share feedback so we can serve you better? <span onClick={() => setActiveModal('help')} className="font-bold underline cursor-pointer hover:text-blue-600 transition-colors">Get Help & FAQ</span>.
        </div>

        {showApkPrompt && (
          <div className="mt-6 animate-in slide-in-from-bottom-8 duration-500 delay-200">
            <a href="https://drive.google.com/file/d/1hMZPScVf1uak-BiL312HEXLwYo9DZPC1/view?usp=drive_link" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between bg-slate-900/80 backdrop-blur-2xl border border-slate-700/50 p-4 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:scale-[1.02] transition-transform group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-800/80 rounded-2xl flex items-center justify-center text-emerald-400 group-hover:text-emerald-300 transition-colors shadow-inner border border-slate-700/50"><Smartphone size={24} /></div>
                <div className="text-left">
                  <p className="text-white font-black text-sm tracking-wide leading-none mb-1">Native Android App</p>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none">Optimized & Secure</p>
                </div>
              </div>
              <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all border border-emerald-500/30"><DownloadCloud size={18} /></div>
            </a>
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
  return <AdminSupportDesk session={session} adminProfile={adminProfile} />;
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
  return <ExecutiveCrm session={session} />;
}

// ==========================================
// MAIN ROUTER
// ==========================================
export default function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => { setSession(session); });
    return () => authListener.subscription.unsubscribe();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        
        {/* 🔥 UPDATED: This route is now public and session-aware */}
        <Route path="/pay" element={<PaymentPortal session={session} />} />
        
        {/* SECURE ROUTES */}
        <Route path="/admin" element={<AdminGateway />} />
        <Route path="/hq" element={<HqGateway />} />
        
        {/* 🔥 NEW ROUTE: PUBLIC EVENT PAGE */}
        <Route path="/events/:id" element={<PublicEventPage />} />
        
        <Route 
          path="/FeedbackForm" 
          element={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
              <FeedbackForm session={session} onClose={() => window.location.href = '/'} />
            </div>
          } 
        />
      </Routes>
    </Router>
  );
}