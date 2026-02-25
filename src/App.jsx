import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import { Mail, Sparkles, ChevronRight, ShieldCheck } from 'lucide-react';
import Dashboard from './Dashboard';
import AuthCallback from './features/onboarding/AuthCallback';
import PayInterface from './PayInterface';

// ==========================================
// MAIN DEUS APP & LOGIN UI (MAGIC LINK ONLY)
// ==========================================
function MainApp() {
  const [session, setSession] = useState(null);
  const [currentView, setCurrentView] = useState('enter_email');
  const [contactValue, setContactValue] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const initializeUser = async (currentSession) => {
      setSession(currentSession);
      if (currentSession?.user) {
        // FIXED: Now we select the full_name so the dashboard can actually use it
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('id', currentSession.user.id)
          .maybeSingle(); 
          
        if (!profile) {
          // FIXED: We grab the text before the '@' in the email to use as their name
          const generatedName = currentSession.user.email?.split('@')[0] || 'Client';

          await supabase.from('profiles').insert([{
            id: currentSession.user.id,
            full_name: generatedName
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
    const cleanEmail = contactValue.trim().toLowerCase();
    
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo: 'https://deux.infinitefuturebank.org/auth/callback'
        }
      });

      if (error) throw error;

      setCurrentView('check_email');
      showMessage('Clearance link dispatched.', 'success');
    } catch (error) {
      console.error(error);
      showMessage(`Routing failed: ${error.message}`, 'error');
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
          setCurrentView('enter_email');
          setContactValue('');
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
        <div className="flex flex-col items-center justify-center mb-10 drop-shadow-sm cursor-pointer" onClick={() => setCurrentView('enter_email')}>
          <div className="flex items-center gap-1">
            <span className="text-6xl font-black text-[#4285F4]">D</span>
            <span className="text-6xl font-black text-[#EA4335]">E</span>
            <span className="text-6xl font-black text-[#FBBC04]">U</span>
            <span className="text-6xl font-black text-[#34A853]">S</span>
            <Sparkles className="text-blue-500 ml-3" size={32} />
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-2xl rounded-[3rem] border border-white/60 shadow-2xl shadow-slate-200/40 p-10 relative overflow-hidden">
          
          {/* VIEW 1: ENTER EMAIL */}
          {currentView === 'enter_email' && (
            <div className="animate-in fade-in zoom-in-95 duration-300 text-center">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <Mail size={32}/>
                </div>
              </div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">
                Access Portal
              </h2>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-8">
                Enter your secure routing email
              </p>
              
              <form onSubmit={handleSendCode} className="space-y-6">
                <input
                  type="email"
                  required
                  autoFocus
                  value={contactValue}
                  onChange={(e) => setContactValue(e.target.value)}
                  placeholder="banker@deus.com"
                  className="w-full bg-white/50 backdrop-blur-md border border-white/60 rounded-2xl px-6 py-5 text-center text-lg font-black outline-none focus:border-emerald-400 focus:bg-white/80 transition-all shadow-inner text-slate-800 placeholder-slate-300"
                />
                
                {message.text && (
                  <div className={`p-4 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center backdrop-blur-sm border ${message.type === 'error' ? 'bg-red-50/50 text-red-600 border-red-200' : 'bg-green-50/50 text-green-600 border-green-200'}`}>
                    {message.text}
                  </div>
                )}

                <button type="submit" disabled={isLoading || !contactValue} className="relative w-full overflow-hidden bg-emerald-600/90 hover:bg-emerald-500 rounded-2xl p-4 flex items-center justify-center group disabled:opacity-50 transition-all duration-300 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500 ease-out"></div>
                  <div className="relative z-10 flex items-center gap-3 text-white font-black text-sm uppercase tracking-widest">
                    {isLoading ? 'Routing...' : 'Slide to Deploy'} <ChevronRight className="animate-pulse" />
                  </div>
                </button>
              </form>
            </div>
          )}

          {/* VIEW 2: CHECK EMAIL */}
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
              <button onClick={() => { setCurrentView('enter_email'); setContactValue(''); }} className="mt-10 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-600 transition-colors">Start Over</button>
            </div>
          )}

        </div>
        <div className="mt-8 text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
            <ShieldCheck size={14} className="text-emerald-400" />
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
        <Route path="/pay" element={<PayInterface />} />
      </Routes>
    </Router>
  );
}