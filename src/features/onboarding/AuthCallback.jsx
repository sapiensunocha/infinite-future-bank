import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';
import { Sparkles } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('DECRYPTING CLEARANCE...');
  const [isError, setIsError] = useState(false);

  // 🚀 NEW: Cinematic First-Time Setup States
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [showBoom, setShowBoom] = useState(false);

  // =========================================================================
  // 🎇 CINEMATIC COUNTDOWN LOGIC
  // =========================================================================
  useEffect(() => {
    if (isFirstTime && countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      
      // Cycle the text as the countdown drops
      if (countdown === 4) setStatus('INITIALIZING PRIVATE VAULT...');
      if (countdown === 3) setStatus('GENERATING SECURE LEDGER...');
      if (countdown === 2) setStatus('GIFTING 1 AFR WELCOME BONUS...');
      if (countdown === 1) setStatus('SECURING NETWORK PERIMETER...');
      
      return () => clearTimeout(timer);
    } 
    
    // When countdown hits 0, trigger the Firework Boom
    if (isFirstTime && countdown === 0 && !showBoom) {
      setShowBoom(true);
      setStatus('WELCOME TO DEUS');
      // Wait 1.5 seconds for the firework animation to play, then route to app
      setTimeout(() => navigate('/'), 1500);
    }
  }, [isFirstTime, countdown, showBoom, navigate]);

  // =========================================================================
  // 🔐 DEUS NATIVE: Fingerprint / FaceID Check (For Returning Users)
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
      console.error("Biometric authentication failed or cancelled:", error);
      setIsError(true);
      setStatus('AUTH CANCELLED. ACCESS DENIED.');
      setTimeout(() => navigate('/'), 2500);
    }
  };

  // =========================================================================
  // 🔗 INITIAL SESSION CHECK
  // =========================================================================
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      const currentURL = window.location.href;
      
      if (session) {
        // Detect if this is a brand new user verifying for the first time
        if (currentURL.includes('type=signup')) {
          setIsFirstTime(true);
          setStatus('ACTIVATING TERMINAL...');
        } else {
          // Normal returning user
          triggerBiometrics();
        }
      } else if (error || !window.location.hash) {
        setIsError(true);
        setStatus('LINK EXPIRED OR INVALID.');
        setTimeout(() => navigate('/'), 2000);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || session) && !status.includes('ROUTING') && !isFirstTime) {
        // Only trigger biometrics on state change if it's NOT a first-time signup
        triggerBiometrics();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, isFirstTime]); // added isFirstTime to dependencies

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

      {/* STANDARD / COUNTDOWN UI (Hidden when firework goes off) */}
      <div className={`relative z-10 flex flex-col items-center space-y-4 transition-opacity duration-300 ${showBoom ? 'opacity-0' : 'opacity-100'}`}>
        
        {/* Visual Indicator (Spinner, Check, X, or Countdown Number) */}
        {isFirstTime && countdown > 0 ? (
          <div className="h-16 w-16 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center shadow-inner animate-in zoom-in">
             <span className="text-3xl font-black text-emerald-600 animate-pulse">{countdown}</span>
          </div>
        ) : status.includes('DENIED') || status.includes('EXPIRED') || status.includes('CANCELLED') ? (
          <div className="h-8 w-8 rounded-full bg-red-500 flex items-center justify-center text-white font-black text-lg shadow-md">X</div>
        ) : status.includes('ROUTING') ? (
          <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-black text-lg shadow-md">✓</div>
        ) : (
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-500"></div>
        )}

        {/* Status Text */}
        <p className={`tracking-widest text-xs font-black uppercase text-center max-w-[280px] leading-relaxed transition-all ${status.includes('DENIED') || status.includes('CANCELLED') || status.includes('EXPIRED') ? 'text-red-500' : ''}`}>
          {status}
        </p>

      </div>
    </div>
  );
};

export default AuthCallback;