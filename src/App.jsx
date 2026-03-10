import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import { Mail, Sparkles, ChevronRight, ShieldCheck, Lock, Eye, EyeOff, Smartphone, DownloadCloud, User, RefreshCw } from 'lucide-react';
import Dashboard from './Dashboard';
import AuthCallback from './features/onboarding/AuthCallback';
import PayInterface from './PayInterface';

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

// Helper for formatting K, M, B
const formatCount = (num) => {
  if (num >= 1e9) return (num / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return num.toString();
};

// ==========================================
// MAIN DEUS APP
// ==========================================
function MainApp() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [session, setSession] = useState(null);
  
  const [currentView, setCurrentView] = useState('enter_email'); 
  const [emailValue, setEmailValue] = useState('');
  const [passwordValue, setPasswordValue] = useState('');
  const [nameValue, setNameValue] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showApkPrompt, setShowApkPrompt] = useState(false);

  // Live Network Stats State
  const [networkStats, setNetworkStats] = useState({ users: 0, orgs: 0, countries: 0 });

  // 1. CAPTURE REFERRAL LINK IMMEDIATELY ON LOAD
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) {
      sessionStorage.setItem('ifb_ref_code', ref);
    }
  }, []);

  // 2. FETCH REAL-TIME NETWORK STATS VIA SECURE RPC (Bypasses RLS)
  useEffect(() => {
    const loadStats = async () => {
      try {
        const { data, error } = await supabase.rpc('get_network_stats');
        
        if (data && !error) {
          setNetworkStats({
            users: data.users || 0,
            orgs: data.orgs || 0,
            countries: data.countries || 0
          });
        }
      } catch (err) {
        console.error("Failed to sync network stats.");
      }
    };
    loadStats();
  }, []);

  // Smart Device Detection
  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isAndroid = /android/i.test(userAgent);
    const isNativeApp = window?.Capacitor?.isNativePlatform?.() || window?.Capacitor?.isNative;
    if (isAndroid && !isNativeApp) setShowApkPrompt(true);
  }, []);

  useEffect(() => {
    setShowPassword(false);
  }, [currentView]);

  // CRITICAL FIX: SECURE PROVISIONING (Bypasses Intruder Alert)
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
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentSession.user.id)
          .maybeSingle(); 
          
        if (profile) {
          document.documentElement.setAttribute('data-theme', profile.theme_preference || 'system');
        } else {
          // ==========================================
          // 🧬 CAPITAL INTRODUCTION: SECURE ANCESTRY LOCK
          // ==========================================
          const generatedName = currentSession.user.user_metadata?.full_name || currentSession.user.email?.split('@')[0] || 'Client';
          const refCode = sessionStorage.getItem('ifb_ref_code') || null;

          // Use backend RPC to securely provision without triggering frontend RLS blocks
          const { error: provisionError } = await supabase.rpc('provision_new_user', {
            p_user_id: currentSession.user.id,
            p_full_name: generatedName,
            p_ref_code: refCode
          });

          if (provisionError) throw provisionError;
        }
      } catch (err) {
        console.error("Profile initialization error:", err);
      } finally {
        if (mounted) setIsAppReady(true);
      }
    };
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      initializeUser(session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setCurrentView('update_password');
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        initializeUser(session);
      }
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
    } catch (err) {
      setCurrentView('welcome_back'); 
    } finally {
      setIsLoading(false);
    }
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
      const { data, error } = await supabase.auth.signUp({
        email: emailValue.trim().toLowerCase(), password: passwordValue,
        options: { data: { full_name: nameValue }, emailRedirectTo: `${window.location.origin}/auth/callback` }
      });
      if (error) throw error;
      if (data?.user && !data?.session) setCurrentView('check_email');
    } catch (error) { showMessage(error.message, 'error'); } finally { setIsLoading(false); }
  };

  // 🔑 NEW: Send Password Reset Email
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailValue.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (error) throw error;
      showMessage('Recovery link dispatched to your inbox.', 'success');
      setCurrentView('check_email');
    } catch (error) { 
      showMessage(error.message, 'error'); 
    } finally { 
      setIsLoading(false); 
    }
  };

  // 🔑 Save New Password
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordValue });
      if (error) throw error;
      setCurrentView('welcome_back');
      showMessage('Security updated successfully.', 'success');
    } catch (error) { showMessage(error.message, 'error'); } finally { setIsLoading(false); }
  };

  // APP BOOTING STATE
  if (!isAppReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <RefreshCw size={32} className="animate-spin text-blue-500 mb-4" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Connecting to Network...</p>
      </div>
    );
  }

  // DASHBOARD ROUTING
  if (session && currentView !== 'update_password') {
    return <Dashboard session={session} onSignOut={() => { supabase.auth.signOut(); setCurrentView('enter_email'); setEmailValue(''); setPasswordValue(''); }} />;
  }

  // LOGIN UI (Beautiful Glassmorphism)
  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-800 relative overflow-hidden flex flex-col items-center justify-center p-6 py-12 overflow-y-auto">
      
      {/* Ambient Background Glows */}
      <div className="fixed top-[-10%] left-[-5%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-blue-200/40 to-indigo-300/20 blur-3xl pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-gradient-to-tl from-emerald-200/30 to-teal-300/10 blur-3xl pointer-events-none"></div>
      
      <div className="relative z-10 w-full max-w-[480px]">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 cursor-pointer hover:scale-105 transition-transform" onClick={() => setCurrentView('enter_email')}>
          <div className="flex items-center gap-1">
            <span className="text-6xl font-black text-[#4285F4]">D</span>
            <span className="text-6xl font-black text-[#EA4335]">E</span>
            <span className="text-6xl font-black text-[#FBBC04]">U</span>
            <span className="text-6xl font-black text-[#34A853]">S</span>
            <Sparkles className="text-blue-500 ml-3 drop-shadow-md" size={32} />
          </div>
        </div>

        {/* Main Glass Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[3rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-10 relative overflow-hidden">
          
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-50"></div>

          {message.text && (
            <div className={`p-4 mb-6 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center border backdrop-blur-md ${message.type === 'error' ? 'bg-red-50/80 text-red-600 border-red-200/50' : 'bg-green-50/80 text-green-600 border-green-200/50'}`}>
              {message.text}
            </div>
          )}

          {/* VIEW 1: ENTER EMAIL */}
          {currentView === 'enter_email' && (
            <div className="animate-in fade-in duration-300 text-center">
              <h2 className="text-2xl font-black tracking-tight mb-8 text-slate-800">Access Portal</h2>
              <form onSubmit={handleCheckEmail} className="space-y-6">
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

          {/* VIEW 2: WELCOME BACK (Now with Forgot Password button) */}
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
              <div className="mt-8 flex flex-col gap-3">
                <button onClick={() => setCurrentView('enter_email')} className="text-[10px] font-black uppercase text-slate-400 hover:text-blue-600 transition-colors">Switch Account</button>
              </div>
            </div>
          )}

          {/* VIEW 2.5: RECOVER PASSWORD (NEW) */}
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

          {/* VIEW 3: IDENTIFY YOURSELF */}
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

          {/* VIEW 4: CHECK EMAIL */}
          {currentView === 'check_email' && (
            <div className="animate-in slide-in-from-bottom-4 duration-300 text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 animate-pulse mb-6 shadow-inner"><Mail size={40}/></div>
              <h2 className="text-2xl font-black mb-2 text-slate-800">Check Inbox</h2>
              <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest mb-8">{emailValue}</p>
              <button onClick={() => setCurrentView('enter_email')} className="text-[10px] font-black uppercase text-slate-500 hover:text-blue-600 transition-colors">Back to Login</button>
            </div>
          )}

          {/* VIEW 5: UPDATE PASSWORD */}
          {currentView === 'update_password' && (
            <div className="animate-in slide-in-from-bottom-4 duration-300 text-center">
              <h2 className="text-2xl font-black mb-8 text-slate-800">New Vault Key</h2>
              <form onSubmit={handleUpdatePassword} className="space-y-6">
                <PasswordInput value={passwordValue} onChange={(e) => setPasswordValue(e.target.value)} placeholder="New Password" autoFocus={true} minLength={6} showPassword={showPassword} togglePassword={() => setShowPassword(!showPassword)} />
                <button type="submit" disabled={isLoading} className="relative w-full bg-blue-600 rounded-2xl p-5 shadow-xl hover:shadow-blue-500/20 hover:-translate-y-0.5 transition-all disabled:opacity-50 group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-90 group-hover:opacity-100 transition-opacity"></div>
                  <span className="relative z-10 text-white font-black text-sm uppercase tracking-widest">Save Password</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* 🌐 MINIMAL TRUST SENTENCE */}
        <div className="mt-8 text-center text-xs font-medium text-slate-500/80 px-4 animate-in fade-in duration-700 delay-100 leading-relaxed">
          Trusted by <span className="font-black text-slate-700">{formatCount(networkStats.users)}</span> customers and <span className="font-black text-slate-700">{formatCount(networkStats.orgs)}</span> organizations in <span className="font-black text-slate-700">{formatCount(networkStats.countries)}</span> countries.<br/>
          <span className="flex items-center justify-center gap-1.5 mt-2">
            <ShieldCheck size={14} className="text-emerald-500" /> 
            Regulated by US and Canadian governments.
          </span>
        </div>

        {/* ANDROID APK PROMPT */}
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

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/pay" element={<PayInterface />} />
      </Routes>
    </Router>
  );
}