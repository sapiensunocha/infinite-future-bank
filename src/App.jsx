import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import { Mail, Sparkles, ChevronRight, ShieldCheck, Lock, Eye, EyeOff, Smartphone, DownloadCloud, User, RefreshCw, Building, Globe, Users } from 'lucide-react';
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
  const [networkStats, setNetworkStats] = useState({ users: 0, orgs: 0, countries: 1 });

  // 1. CAPTURE REFERRAL LINK IMMEDIATELY ON LOAD
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) {
      sessionStorage.setItem('ifb_ref_code', ref);
    }
  }, []);

  // 2. FETCH REAL-TIME NETWORK STATS FOR TRUST BUILDING
  useEffect(() => {
    const loadStats = async () => {
      try {
        // Count Retail Users
        const { count: users } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        
        // Count Corporate Orgs
        const { count: orgs } = await supabase.from('commercial_profiles').select('*', { count: 'exact', head: true });
        
        // Count Unique Countries
        const { data: countryData } = await supabase.from('profiles').select('country').not('country', 'is', null);
        const uniqueCountries = countryData ? new Set(countryData.map(d => d.country)).size : 1;

        setNetworkStats({
          users: users || 0,
          orgs: orgs || 0,
          countries: uniqueCountries > 0 ? uniqueCountries : 1
        });
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

  // CRITICAL FIX: Optimized Auth initialization & ANCESTRY LOCK
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
          // 🧬 CAPITAL INTRODUCTION: ANCESTRY LOCK
          // ==========================================
          const generatedName = currentSession.user.user_metadata?.full_name || currentSession.user.email?.split('@')[0] || 'Client';
          
          const refCode = sessionStorage.getItem('ifb_ref_code');
          let lineage = {};
          
          if (refCode) {
             const { data: referrer } = await supabase
                .from('profiles')
                .select('id, l1_parent, l2_parent, l3_parent')
                .eq('referral_code', refCode)
                .maybeSingle();

             if (referrer) {
                lineage = {
                   l1_parent: referrer.id,             
                   l2_parent: referrer.l1_parent,      
                   l3_parent: referrer.l2_parent,      
                   l4_parent: referrer.l3_parent       
                };
                console.log("[NETWORK] Ancestry Lineage Locked Successfully.");
             }
          }

          await supabase.from('profiles').insert([{ 
            id: currentSession.user.id, 
            full_name: generatedName,
            ...lineage
          }]);
          
          await supabase.from('balances').insert([{ 
            user_id: currentSession.user.id, 
            liquid_usd: 0, 
            alpha_equity_usd: 0, 
            mysafe_digital_usd: 0, 
            external_linked_usd: 0 
          }]);
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

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordValue });
      if (error) throw error;
      setCurrentView('welcome_back');
      showMessage('Security updated.', 'success');
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

          {/* VIEW 2: WELCOME BACK */}
          {currentView === 'welcome_back' && (
            <div className="animate-in slide-in-from-right-4 duration-300 text-center">
              <h2 className="text-2xl font-black tracking-tight mb-2 text-slate-800">Welcome Back</h2>
              <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest mb-8">{emailValue}</p>
              <form onSubmit={handleLogin} className="space-y-6">
                <PasswordInput value={passwordValue} onChange={(e) => setPasswordValue(e.target.value)} placeholder="Password" autoFocus={true} showPassword={showPassword} togglePassword={() => setShowPassword(!showPassword)} />
                <button type="submit" disabled={isLoading || !passwordValue} className="relative w-full bg-blue-600 rounded-2xl p-5 flex items-center justify-center shadow-xl hover:shadow-blue-500/20 hover:-translate-y-0.5 transition-all disabled:opacity-50 group overflow-hidden">
                   <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-90 group-hover:opacity-100 transition-opacity"></div>
                   <span className="relative z-10 text-white font-black text-sm uppercase tracking-widest">{isLoading ? 'Authenticating...' : 'Confirm Access'}</span>
                </button>
              </form>
              <div className="mt-8 flex flex-col gap-3">
                <button onClick={() => setCurrentView('enter_email')} className="text-[10px] font-black uppercase text-slate-400 hover:text-blue-600 transition-colors">Switch Account</button>
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

        {/* 📊 LIVE NETWORK STATS */}
        <div className="mt-6 grid grid-cols-3 gap-3 w-full animate-in slide-in-from-bottom-6 duration-700 delay-100">
          <div className="bg-white/60 backdrop-blur-xl border border-white/60 p-4 rounded-3xl text-center shadow-lg">
            <Users size={20} className="mx-auto mb-2 text-blue-600" />
            <p className="text-xl font-black text-slate-800">{formatCount(networkStats.users)}</p>
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Retail</p>
          </div>
          <div className="bg-white/60 backdrop-blur-xl border border-white/60 p-4 rounded-3xl text-center shadow-lg">
            <Building size={20} className="mx-auto mb-2 text-indigo-600" />
            <p className="text-xl font-black text-slate-800">{formatCount(networkStats.orgs)}</p>
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Corporate</p>
          </div>
          <div className="bg-white/60 backdrop-blur-xl border border-white/60 p-4 rounded-3xl text-center shadow-lg">
            <Globe size={20} className="mx-auto mb-2 text-emerald-600" />
            <p className="text-xl font-black text-slate-800">{formatCount(networkStats.countries)}</p>
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Regions</p>
          </div>
        </div>

        {/* 🏛️ GOVERNMENT CERTIFICATIONS */}
        <div className="mt-4 w-full bg-slate-900/90 backdrop-blur-2xl border border-slate-700/50 p-6 rounded-3xl shadow-xl animate-in slide-in-from-bottom-8 duration-700 delay-200">
          <div className="flex items-center justify-center gap-2 mb-4">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest">Government Regulated</span>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
            <div className="flex-1 w-full bg-white/5 p-3 rounded-2xl border border-white/5">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">United States</p>
              <p className="text-xs font-bold text-slate-200 mt-1 mb-2">Dept. of Treasury</p>
              <p className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-400/10 px-3 py-1.5 rounded-lg inline-block w-full text-center">EIN: 33-1869013</p>
            </div>
            <div className="flex-1 w-full bg-white/5 p-3 rounded-2xl border border-white/5">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Canada</p>
              <p className="text-xs font-bold text-slate-200 mt-1 mb-2">Revenue Agency</p>
              <p className="text-[10px] font-mono text-indigo-400 font-bold bg-indigo-400/10 px-3 py-1.5 rounded-lg inline-block w-full text-center">721487825 RC 0001</p>
            </div>
          </div>
        </div>

        {/* ANDROID APK PROMPT */}
        {showApkPrompt && (
          <div className="mt-4 animate-in slide-in-from-bottom-8 duration-500 delay-300">
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

        <div className="mt-8 mb-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
           <ShieldCheck size={14} className="text-slate-400" /> Powered by Infinite Future Bank
        </div>
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