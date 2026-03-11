import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';
import { Sparkles, Lock, Eye, EyeOff, RefreshCw, ChevronRight } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('DECRYPTING CLEARANCE...');
  const [isError, setIsError] = useState(false);

  // 🚀 Cinematic First-Time Setup States
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [showBoom, setShowBoom] = useState(false);

  // 🔐 Password Recovery States
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // =========================================================================
  // 🎇 CINEMATIC COUNTDOWN LOGIC
  // =========================================================================
  useEffect(() => {
    if (isFirstTime && countdown > 0 && !isRecoveryMode) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      
      if (countdown === 4) setStatus('INITIALIZING PRIVATE VAULT...');
      if (countdown === 3) setStatus('GENERATING SECURE LEDGER...');
      if (countdown === 2) setStatus('GIFTING 1 AFR WELCOME BONUS...');
      if (countdown === 1) setStatus('SECURING NETWORK PERIMETER...');
      
      return () => clearTimeout(timer);
    } 
    
    if (isFirstTime && countdown === 0 && !showBoom && !isRecoveryMode) {
      setShowBoom(true);
      setStatus('WELCOME TO DEUS');
      setTimeout(() => navigate('/'), 1500);
    }
  }, [isFirstTime, countdown, showBoom, isRecoveryMode, navigate]);

  // =========================================================================
  // 🔐 DEUS NATIVE: Fingerprint / FaceID Check
  // =========================================================================
  const triggerBiometrics = async () => {
    try {
      if (!Capacitor.isNativePlatform()) {
        setStatus('WEB CLEARANCE VERIFIED. ROUTING...');
        setTimeout(() => navigate('/'), 1000);
        return; 
      }

      setStatus('AWAITING BIOMETRICS...');
      const { isAvailable } = await NativeBiometric.isAvailable();
      
      if (isAvailable) {
        const verified = await NativeBiometric.verifyIdentity({
          reason: "Authenticate to unlock the DEUS Capital Engine",
          title: "Log In to DEUS",
          subtitle: "Military-Grade Security",
        });

        if (verified) {
          setStatus('VAULT DECRYPTED. ROUTING...');
          setTimeout(() => navigate('/'), 500);
        } else {
          setIsError(true);
          setStatus('INTRUDER ALERT. ACCESS DENIED.');
        }
      } else {
        setStatus('DEVICE VERIFIED. ROUTING...');
        setTimeout(() => navigate('/'), 500);
      }
    } catch (error) {
      console.error("Biometric auth failed:", error);
      setIsError(true);
      setStatus('AUTH CANCELLED. ACCESS DENIED.');
      setTimeout(() => navigate('/'), 2500);
    }
  };

  // =========================================================================
  // 🔗 INITIAL SESSION CHECK & FAIL-SAFES (RACE-CONDITION SECURED)
  // =========================================================================
  useEffect(() => {
    let isMounted = true;
    let recoveryDetected = false;
    const currentURL = window.location.href;

    if (currentURL.includes('error')) {
      setIsError(true);
      setStatus('LINK EXPIRED OR USED.');
      setTimeout(() => navigate('/'), 2500);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || currentURL.includes('type=recovery') || currentURL.includes('recovery')) {
         recoveryDetected = true;
         if (isMounted) {
           setIsRecoveryMode(true);
           setStatus('VAULT RECOVERY VERIFIED. AWAITING NEW CIPHER.');
         }
         return;
      }

      if (event === 'SIGNED_IN' && session && !recoveryDetected) {
         if (currentURL.includes('type=signup') && isMounted) {
            setIsFirstTime(true);
            setStatus('ACTIVATING TERMINAL...');
         }
      }
    });

    const initAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      setTimeout(() => {
        if (!isMounted) return;
        if (recoveryDetected || currentURL.includes('recovery')) {
          setIsRecoveryMode(true);
          setStatus('VAULT RECOVERY VERIFIED. AWAITING NEW CIPHER.');
          return;
        }

        if (session) {
          if (currentURL.includes('type=signup')) {
            setIsFirstTime(true);
            setStatus('ACTIVATING TERMINAL...');
          } else {
            triggerBiometrics();
          }
        } else if (error) {
          setIsError(true);
          setStatus('LINK EXPIRED OR INVALID.');
          setTimeout(() => navigate('/'), 2000);
        }
      }, 300);
    };

    initAuth();

    const stuckTimeout = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session && !recoveryDetected && isMounted) {
        setIsError(true);
        setStatus('LINK EXPIRED OR USED.');
        setTimeout(() => navigate('/'), 2000);
      }
    }, 4000);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearTimeout(stuckTimeout);
    };
  }, [navigate]);

  // =========================================================================
  // 💾 SAVE NEW PASSWORD HANDLER
  // =========================================================================
  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setIsError(true);
      setStatus('CIPHER TOO WEAK. MIN 6 CHARACTERS.');
      return;
    }

    setIsUpdating(true);
    setStatus('ENCRYPTING NEW CREDENTIALS...');
    setIsError(false);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setIsError(true);
      setStatus('ENCRYPTION FAILED. TRY AGAIN.');
      setIsUpdating(false);
    } else {
      setStatus('VAULT SECURED. ROUTING...');
      setIsError(false);
      setTimeout(() => navigate('/'), 1500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-800 relative overflow-hidden flex flex-col items-center justify-center p-6">
      
      {/* Ambient Background Glows (Matching App.jsx) */}
      <div className="fixed top-[-10%] left-[-5%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-blue-200/40 to-indigo-300/20 blur-3xl pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-gradient-to-tl from-emerald-200/30 to-teal-300/10 blur-3xl pointer-events-none"></div>

      {/* 🎇 FIREWORK EXPLOSION OVERLAY 🎇 */}
      <div 
        className="absolute z-40 bg-emerald-500 rounded-full"
        style={{ 
          width: '20px', 
          height: '20px', 
          transform: showBoom ? 'scale(300)' : 'scale(0)', 
          transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          opacity: showBoom ? 1 : 0,
          pointerEvents: 'none'
        }}
      />
      
      {/* 🎇 FIREWORK TEXT 🎇 */}
      {showBoom && (
        <div className="absolute z-50 flex flex-col items-center animate-in zoom-in-50 duration-700 delay-150">
           <Sparkles size={64} className="text-white mb-4 animate-pulse" />
           <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter drop-shadow-2xl">
             WELCOME TO DEUS
           </h1>
        </div>
      )}

      {/* STANDARD / RECOVERY UI */}
      <div className={`relative z-10 w-full max-w-[440px] flex flex-col items-center transition-opacity duration-300 ${showBoom ? 'opacity-0' : 'opacity-100'}`}>
        
        {isRecoveryMode && !status.includes('ROUTING') ? (
          <div className="w-full bg-white/80 backdrop-blur-xl rounded-[3rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4 shadow-inner">
                <Lock size={32} />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-slate-800">New Vault Key</h2>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-2 text-center">Identity Verified via Secure Link</p>
            </div>

            <form onSubmit={handlePasswordUpdate} className="space-y-6">
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  autoFocus
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  placeholder="NEW PASSWORD" 
                  className="w-full bg-white/50 backdrop-blur-md border border-white/60 rounded-2xl pl-14 pr-14 py-5 text-lg font-black outline-none focus:border-blue-400 focus:bg-white/80 transition-all shadow-inner hover:bg-white/60" 
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <button 
                type="submit" 
                disabled={isUpdating || newPassword.length < 6} 
                className="relative w-full overflow-hidden bg-blue-600 rounded-2xl p-5 flex items-center justify-center group disabled:opacity-50 transition-all shadow-xl hover:shadow-blue-500/20 hover:-translate-y-0.5"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-90 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10 flex items-center gap-3 text-white font-black text-sm uppercase tracking-widest">
                  {isUpdating ? <RefreshCw size={18} className="animate-spin" /> : 'Confirm Cipher'} 
                  {!isUpdating && <ChevronRight className="group-hover:translate-x-1 transition-transform" />}
                </div>
              </button>
            </form>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-6">
            {isFirstTime && countdown > 0 ? (
              <div className="h-20 w-20 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shadow-inner animate-in zoom-in">
                 <span className="text-4xl font-black text-emerald-600 animate-pulse">{countdown}</span>
              </div>
            ) : status.includes('DENIED') || status.includes('EXPIRED') || status.includes('INVALID') || status.includes('USED') ? (
              <div className="h-12 w-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-500 font-black text-xl shadow-md">X</div>
            ) : status.includes('ROUTING') ? (
              <div className="h-12 w-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500 font-black text-xl shadow-md">✓</div>
            ) : (
              <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500 shadow-sm"></div>
            )}
          </div>
        )}

        <p className={`mt-6 tracking-widest text-[10px] font-black uppercase text-center max-w-[280px] leading-relaxed transition-all ${isError ? 'text-red-500' : 'text-slate-400'}`}>
          {status}
        </p>

      </div>
    </div>
  );
};

export default AuthCallback;