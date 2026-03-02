import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
// 1. Added Eye and EyeOff icons
import { Mail, Sparkles, ChevronRight, ShieldCheck, Lock, KeyRound, User, Eye, EyeOff } from 'lucide-react';
import Dashboard from './Dashboard';
import AuthCallback from './features/onboarding/AuthCallback';
import PayInterface from './PayInterface';

// ==========================================
// MAIN DEUS APP & LOGIN UI (PROGRESSIVE FLOW)
// ==========================================
function MainApp() {
  const [session, setSession] = useState(null);
  const [currentView, setCurrentView] = useState('enter_email'); 
  const [emailValue, setEmailValue] = useState('');
  const [passwordValue, setPasswordValue] = useState('');
  const [nameValue, setNameValue] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);
  
  // 2. State for password visibility
  const [showPassword, setShowPassword] = useState(false);

  // Reset password visibility when changing views
  useEffect(() => {
    setShowPassword(false);
  }, [currentView]);

  useEffect(() => {
    const initializeUser = async (currentSession) => {
      setSession(currentSession);
      if (currentSession?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentSession.user.id)
          .maybeSingle(); 
          
        if (profile) {
          document.documentElement.setAttribute('data-theme', profile.theme_preference || 'system');
        } else {
          const generatedName = currentSession.user.user_metadata?.full_name || currentSession.user.email?.split('@')[0] || 'Client';
          await supabase.from('profiles').insert([{ id: currentSession.user.id, full_name: generatedName }]);
          await supabase.from('balances').insert([{ user_id: currentSession.user.id, liquid_usd: 0, alpha_equity_usd: 0, mysafe_digital_usd: 0, external_linked_usd: 0 }]);
        }
      }
    };
    
    supabase.auth.getSession().then(({ data: { session } }) => initializeUser(session));
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setCurrentView('update_password');
      initializeUser(session);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 6000);
  };

  const handleCheckEmail = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data: userExists, error } = await supabase.rpc('check_user_exists', { check_email: emailValue.trim().toLowerCase() });
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
      const { error } = await supabase.auth.signInWithPassword({
        email: emailValue.trim().toLowerCase(),
        password: passwordValue,
      });
      if (error) throw error;
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: emailValue.trim().toLowerCase(),
        password: passwordValue,
        options: {
          data: { full_name: nameValue },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      });
      if (error) throw error;
      if (data?.user && !data?.session) setCurrentView('check_email');
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetRequest = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailValue.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/auth/callback`, 
      });
      if (error) throw error;
      setCurrentView('check_email');
      showMessage('Recovery link dispatched.', 'success');
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordValue });
      if (error) throw error;
      setCurrentView('welcome_back');
      showMessage('Security updated.', 'success');
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. REUSABLE PASSWORD COMPONENT
  const PasswordInput = ({ value, onChange, placeholder, autoFocus = false, minLength }) => (
    <div className="relative">
      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
      <input 
        type={showPassword ? "text" : "password"} 
        required 
        minLength={minLength}
        autoFocus={autoFocus}
        value={value} 
        onChange={onChange} 
        placeholder={placeholder} 
        className="w-full bg-white/50 border border-white/60 rounded-2xl pl-14 pr-14 py-5 text-lg font-black outline-none focus:border-blue-400 focus:bg-white transition-all shadow-inner" 
      />
      <button 
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
      >
        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>
    </div>
  );

  if (session && currentView !== 'update_password') {
    return <Dashboard session={session} onSignOut={() => { supabase.auth.signOut(); setCurrentView('enter_email'); setEmailValue(''); setPasswordValue(''); }} />;
  }

  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-800 relative overflow-hidden flex flex-col items-center justify-center p-6">
      <div className="fixed top-[-10%] left-[-5%] w-[50vw] h-[50vw] rounded-full bg-blue-300/20 blur-[120px] pointer-events-none"></div>
      
      <div className="relative z-10 w-full max-w-[480px]">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10 cursor-pointer" onClick={() => setCurrentView('enter_email')}>
          <div className="flex items-center gap-1">
            <span className="text-6xl font-black text-[#4285F4]">D</span>
            <span className="text-6xl font-black text-[#EA4335]">E</span>
            <span className="text-6xl font-black text-[#FBBC04]">U</span>
            <span className="text-6xl font-black text-[#34A853]">S</span>
            <Sparkles className="text-blue-500 ml-3" size={32} />
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-2xl rounded-[3rem] border border-white shadow-2xl p-10 relative overflow-hidden">
          
          {message.text && (
            <div className={`p-4 mb-6 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center border ${message.type === 'error' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}`}>
              {message.text}
            </div>
          )}

          {/* VIEW 1: ENTER EMAIL */}
          {currentView === 'enter_email' && (
            <div className="animate-in fade-in zoom-in-95 duration-300 text-center">
              <h2 className="text-2xl font-black tracking-tight mb-8">Access Portal</h2>
              <form onSubmit={handleCheckEmail} className="space-y-6">
                <div className="relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input type="email" required autoFocus value={emailValue} onChange={(e) => setEmailValue(e.target.value)} placeholder="banker@deus.com" className="w-full bg-white/50 border border-white/60 rounded-2xl pl-14 pr-6 py-5 text-lg font-black outline-none focus:border-blue-400 focus:bg-white transition-all shadow-inner" />
                </div>
                {/* BLUE GRADIENT BUTTON */}
                <button type="submit" disabled={isLoading || !emailValue} className="relative w-full overflow-hidden bg-blue-600 rounded-2xl p-5 flex items-center justify-center group disabled:opacity-50 transition-all shadow-xl">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                  <div className="relative z-10 flex items-center gap-3 text-white font-black text-sm uppercase tracking-widest">
                    {isLoading ? 'Scanning...' : 'Continue'} <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              </form>
            </div>
          )}

          {/* VIEW 2: WELCOME BACK */}
          {currentView === 'welcome_back' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 text-center">
              <h2 className="text-2xl font-black tracking-tight mb-2">Welcome Back</h2>
              <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest mb-8">{emailValue}</p>
              <form onSubmit={handleLogin} className="space-y-6">
                {/* 4. REPLACED WITH PASSWORD COMPONENT */}
                <PasswordInput 
                  value={passwordValue} 
                  onChange={(e) => setPasswordValue(e.target.value)} 
                  placeholder="Password" 
                  autoFocus={true} 
                />
                {/* BLUE GRADIENT BUTTON */}
                <button type="submit" disabled={isLoading || !passwordValue} className="relative w-full bg-blue-600 rounded-2xl p-5 flex items-center justify-center shadow-xl">
                   <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                   <span className="relative z-10 text-white font-black text-sm uppercase tracking-widest">Confirm Access</span>
                </button>
              </form>
              <div className="mt-8 flex flex-col gap-3">
                <button onClick={() => setCurrentView('forgot_password')} className="text-[10px] font-black uppercase text-slate-400 hover:text-blue-600">Forgot Password?</button>
                <button onClick={() => setCurrentView('enter_email')} className="text-[10px] font-black uppercase text-slate-400 hover:text-blue-600">Switch Account</button>
              </div>
            </div>
          )}

          {/* VIEW 3: IDENTIFY YOURSELF */}
          {currentView === 'identify_yourself' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 text-center">
              <h2 className="text-2xl font-black tracking-tight mb-8">Identify Yourself</h2>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="relative">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input type="text" required autoFocus value={nameValue} onChange={(e) => setNameValue(e.target.value)} placeholder="Given Name" className="w-full bg-white/50 border border-white/60 rounded-2xl pl-14 pr-6 py-5 text-lg font-black outline-none focus:border-emerald-400 shadow-inner" />
                </div>
                {/* 4. REPLACED WITH PASSWORD COMPONENT */}
                <PasswordInput 
                  value={passwordValue} 
                  onChange={(e) => setPasswordValue(e.target.value)} 
                  placeholder="Set Password" 
                  minLength={6} 
                />
                {/* EMERALD GRADIENT BUTTON */}
                <button type="submit" disabled={isLoading || !nameValue || !passwordValue} className="relative w-full overflow-hidden bg-emerald-600 rounded-2xl p-5 flex items-center justify-center shadow-xl">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600"></div>
                  <span className="relative z-10 text-white font-black text-sm uppercase tracking-widest">Create Vault</span>
                </button>
              </form>
            </div>
          )}

          {/* VIEW 4: CHECK EMAIL */}
          {currentView === 'check_email' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-blue-100 flex items-center justify-center text-blue-600 animate-pulse mb-6">
                <Mail size={40}/>
              </div>
              <h2 className="text-2xl font-black mb-2">Check Inbox</h2>
              <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest mb-8">{emailValue}</p>
              <button onClick={() => setCurrentView('enter_email')} className="text-[10px] font-black uppercase text-slate-800 hover:text-blue-600">Back to Login</button>
            </div>
          )}

          {/* VIEW 5: UPDATE PASSWORD */}
          {currentView === 'update_password' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 text-center">
              <h2 className="text-2xl font-black mb-8">New Vault Key</h2>
              <form onSubmit={handleUpdatePassword} className="space-y-6">
                {/* 4. REPLACED WITH PASSWORD COMPONENT */}
                <PasswordInput 
                  value={passwordValue} 
                  onChange={(e) => setPasswordValue(e.target.value)} 
                  placeholder="New Password" 
                  autoFocus={true} 
                  minLength={6} 
                />
                <button type="submit" className="relative w-full bg-blue-600 rounded-2xl p-5 shadow-xl">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                  <span className="relative z-10 text-white font-black text-sm uppercase tracking-widest">Save Password</span>
                </button>
              </form>
            </div>
          )}

        </div>
        <div className="mt-8 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
           <ShieldCheck size={14} className="text-emerald-400" /> Powered by Infinite Future Bank
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