import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';
import { Sparkles, Lock } from 'lucide-react';

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

    // 1. Immediately listen for the Supabase Auth Event
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

    // 2. Check the session, but give the event listener a tiny delay to catch the recovery flag first
    const initAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      setTimeout(() => {
        if (!isMounted) return;

        // If a recovery was detected, STOP here and show the password form.
        if (recoveryDetected || currentURL.includes('recovery')) {
          setIsRecoveryMode(true);
          setStatus('VAULT RECOVERY VERIFIED. AWAITING NEW CIPHER.');
          return;
        }

        // Otherwise, proceed with normal login/signup routing
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
      }, 300); // 300ms delay stops the race condition dead in its tracks
    };

    initAuth();

    // 3. FAIL-SAFE: Stuck timeout
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
    <div className="relative flex h-screen w-full items-center justify-center bg-slate-50 text-emerald-500 font-sans overflow-hidden">
      
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

      {/* STANDARD / COUNTDOWN / RECOVERY UI */}
      <div className={`relative z-10 flex flex-col items-center space-y-4 transition-opacity duration-300 ${showBoom ? 'opacity-0' : 'opacity-100'}`}>
        
        {isRecoveryMode && !status.includes('ROUTING') ? (
          <form onSubmit={handlePasswordUpdate} className="flex flex-col items-center space-y-4 w-full max-w-xs animate-in fade-in slide-in-from-bottom-4">
            <div className="h-12 w-12 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center shadow-inner">
               <Lock className="text-emerald-600" size={24} />
            </div>
            <input 
              type="password" 
              placeholder="ENTER NEW PASSWORD" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isUpdating}
              className="w-full text-center px-4 py-3 bg-white border-2 border-emerald-200 rounded-lg text-slate-800 font-bold focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-300"
            />
            <button 
              type="submit" 
              disabled={isUpdating || !newPassword}
              className="w-full bg-emerald-500 text-white font-black py-3 rounded-lg uppercase tracking-widest hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
            >
              {isUpdating ? 'SECURING...' : 'CONFIRM CIPHER'}
            </button>
          </form>
        ) : isFirstTime && countdown > 0 ? (
          <div className="h-16 w-16 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center shadow-inner animate-in zoom-in">
             <span className="text-3xl font-black text-emerald-600 animate-pulse">{countdown}</span>
          </div>
        ) : status.includes('DENIED') || status.includes('EXPIRED') || status.includes('CANCELLED') || status.includes('USED') ? (
          <div className="h-8 w-8 rounded-full bg-red-500 flex items-center justify-center text-white font-black text-lg shadow-md">X</div>
        ) : status.includes('ROUTING') ? (
          <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-black text-lg shadow-md">✓</div>
        ) : (
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-500"></div>
        )}

        <p className={`tracking-widest text-xs font-black uppercase text-center max-w-[280px] leading-relaxed transition-all ${isError ? 'text-red-500' : ''}`}>
          {status}
        </p>

      </div>
    </div>
  );
};

export default AuthCallback;