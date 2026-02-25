import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import { Mail, Smartphone, Sparkles, ChevronRight, KeyRound, ShieldCheck } from 'lucide-react';
import Dashboard from './Dashboard';
import AuthCallback from './features/onboarding/AuthCallback';

// ==========================================
// MAIN DEUS APP & LOGIN UI
// ==========================================
function MainApp() {
  const [session, setSession] = useState(null);
  const [currentView, setCurrentView] = useState('choose_auth');
  const [authType, setAuthType] = useState('');
  const [contactValue, setContactValue] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const initializeUser = async (currentSession) => {
      setSession(currentSession);
      if (currentSession) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', currentSession.user.id)
          .maybeSingle(); 
          
        if (!profile) {
          await supabase.from('profiles').insert([{
            id: currentSession.user.id,
            full_name: currentSession.user.email || currentSession.user.phone || 'DEUS User'
          }]);
          await supabase.from('balances').insert([{
            user_id: currentSession.user.id,
            liquid_usd: 0,
            alpha_equity_usd: 0,
            mysafe_digital_usd: 0,
            external_linked_usd: 0
          }]);
        }
      }
    };
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      initializeUser(session);
    });
    
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      initializeUser(session);
    });
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ text: '', type: '' });
    const cleanContact = contactValue.trim().toLowerCase();
    
    try {
      const { error } = await supabase.auth.signInWithOtp({
        [currentView === 'enter_email' ? 'email' : 'phone']: cleanContact,
        options: {
          // This is critical: it tells Supabase where to send the user after they click the email!
          emailRedirectTo: 'https://deux.infinitefuturebank.org/auth/callback'
        }
      });

      if (error) throw error;

      setAuthType(currentView);
      // If it's email, show the check email screen. If phone, show the code input screen.
      if (currentView === 'enter_email') {
        setCurrentView('check_email');
      } else {
        setCurrentView('verify_code');
      }
      
      showMessage('Clearance initiated.', 'success');
    } catch (error) {
      console.error(error);
      showMessage(`Routing failed: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ text: '', type: '' });
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: contactValue.trim(),
        token: otpCode.trim(),
        type: 'sms'
      });
      if (error) throw error;
    } catch (error) {
      showMessage(`Invalid clearance code: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (session) {
    return (
      <Dashboard
        session={session}
        onSignOut={() => {
          supabase.auth.signOut();
          setCurrentView('choose_auth');
          setContactValue('');
          setOtpCode('');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-800 relative overflow-hidden font-sans selection:bg-blue-500/30 flex flex-col items-center justify-center p-6">
      <div className="fixed top-[-10%] left-[-5%] w-[50vw] h-[50vw] rounded-full bg-blue-300/20 blur-[120px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] right-[-5%] w-[50vw] h-[50vw] rounded-full bg-indigo-300/20 blur-[120px] pointer-events-none z-0"></div>
      <div className="fixed top-[30%] right-[10%] w-[30vw] h-[30vw] rounded-full bg-emerald-300/10 blur-[120px] pointer-events-none z-0"></div>
      
      <div className="relative z-10 w-full max-w-[480px]">
        {/* Logo */}
        <div className="flex flex-col items-center justify-center mb-10 drop-shadow-sm cursor-pointer" onClick={() => setCurrentView('choose_auth')}>
          <div className="flex items-center gap-1">
            <span className="text-6xl font-black text-[#4285F4]">D</span>
            <span className="text-6xl font-black text-[#EA4335]">E</span>
            <span className="text-6xl font-black text-[#FBBC04]">U</span>
            <span className="text-6xl font-black text-[#34A853]">S</span>
            <Sparkles className="text-blue-500 ml-3" size={32} />
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-2xl rounded-[3rem] border border-white/60 shadow-2xl shadow-slate-200/40 p-10 relative overflow-hidden">
          
          {/* VIEW 1: CHOOSE AUTH */}
          {currentView === 'choose_auth' && (
            <div className="animate-in fade-in zoom-in-95 duration-300 text-center">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Access Portal</h2>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-10">Select your secure routing method.</p>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => { setCurrentView('enter_phone'); setContactValue(''); }} className="flex flex-col items-center justify-center gap-4 bg-white/50 hover:bg-white/80 backdrop-blur-md border border-white/60 rounded-3xl p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group">
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform"><Smartphone size={32}/></div>
                  <span className="text-xs font-black uppercase tracking-widest text-slate-700">Phone</span>
                </button>
                <button onClick={() => { setCurrentView('enter_email'); setContactValue(''); }} className="flex flex-col items-center justify-center gap-4 bg-white/50 hover:bg-white/80 backdrop-blur-md border border-white/60 rounded-3xl p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform"><Mail size={32}/></div>
                  <span className="text-xs font-black uppercase tracking-widest text-slate-700">Email</span>
                </button>
              </div>
            </div>
          )}

          {/* VIEW 2: ENTER EMAIL OR PHONE */}
          {(currentView === 'enter_email' || currentView === 'enter_phone') && (
            <div className="animate-in slide-in-from-right-8 duration-300 text-center">
              <div className="flex justify-center mb-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${currentView === 'enter_phone' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  {currentView === 'enter_phone' ? <Smartphone size={32}/> : <Mail size={32}/>}
                </div>
              </div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-8">
                Enter {currentView === 'enter_phone' ? 'Phone Number' : 'Email Address'}
              </h2>
              <form onSubmit={handleSendCode} className="space-y-6">
                <input
                  type={currentView === 'enter_phone' ? 'tel' : 'email'}
                  required
                  autoFocus
                  value={contactValue}
                  onChange={(e) => setContactValue(e.target.value)}
                  placeholder={currentView === 'enter_phone' ? '+1 234 567 8900' : 'you@example.com'}
                  className="w-full bg-white/50 backdrop-blur-md border border-white/60 rounded-2xl px-6 py-5 text-center text-lg font-black outline-none focus:border-blue-400 focus:bg-white/80 transition-all shadow-inner text-slate-800 placeholder-slate-300"
                />
                <button type="submit" disabled={isLoading || !contactValue} className="relative w-full overflow-hidden bg-blue-600/90 hover:bg-blue-500 rounded-2xl p-4 flex items-center justify-center group disabled:opacity-50 transition-all duration-300 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500 ease-out"></div>
                  <div className="relative z-10 flex items-center gap-3 text-white font-black text-sm uppercase tracking-widest">
                    {isLoading ? 'Routing...' : 'Slide to Deploy'} <ChevronRight className="animate-pulse" />
                  </div>
                </button>
              </form>
              <button onClick={() => setCurrentView('choose_auth')} className="mt-8 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Change Routing Method</button>
            </div>
          )}

          {/* VIEW 3A: CHECK EMAIL (For Magic Links) */}
          {currentView === 'check_email' && (
            <div className="animate-in zoom-in duration-300 text-center">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 animate-bounce">
                  <Mail size={40}/>
                </div>
              </div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Check Your Email</h2>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-8 leading-relaxed">
                Clearance link dispatched to:<br/>
                <span className="text-emerald-600 font-bold">{contactValue}</span>
              </p>
              <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-200 text-[11px] text-slate-500 font-medium leading-relaxed italic">
                Click the "Initialize Connection" button in your inbox to unlock your DEUS terminal automatically.
              </div>
              <button onClick={() => setCurrentView('choose_auth')} className="mt-10 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors">Abort & Return</button>
            </div>
          )}

          {/* VIEW 3B: VERIFY SMS CODE (For Phone) */}
          {currentView === 'verify_code' && (
            <div className="animate-in slide-in-from-right-8 duration-300 text-center">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <KeyRound size={32}/>
                </div>
              </div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">
                Verify Clearance
              </h2>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-8">
                Enter the 6-digit code sent to<br/> <span className="text-slate-600">{contactValue}</span>
              </p>
              <form onSubmit={handleVerifyCode} className="space-y-6">
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full bg-white/50 backdrop-blur-md border border-white/60 rounded-2xl px-6 py-5 text-center text-3xl tracking-[0.5em] font-black outline-none focus:border-indigo-400 focus:bg-white/80 transition-all shadow-inner text-slate-800 placeholder-slate-300"
                />
                {message.text && (
                  <div className={`p-4 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center backdrop-blur-sm border ${message.type === 'error' ? 'bg-red-50/50 text-red-600 border-red-200' : 'bg-green-50/50 text-green-600 border-green-200'}`}>
                    {message.text}
                  </div>
                )}
                <button type="submit" disabled={isLoading || otpCode.length !== 6} className="w-full flex items-center justify-center gap-2 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-2xl px-6 py-4 text-sm font-black uppercase tracking-widest shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all duration-300 disabled:opacity-50">
                  {isLoading ? 'Verifying...' : 'Unlock DEUS'}
                </button>
              </form>
              <button onClick={() => setCurrentView('choose_auth')} className="mt-8 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Start Over</button>
            </div>
          )}
        </div>
        <div className="mt-8 text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
            <ShieldCheck size={14} className="text-blue-400" />
            Powered by Infinite Future Bank
          </p>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// ROOT ROUTER PROVIDER
// ==========================================
export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
      </Routes>
    </Router>
  );
}