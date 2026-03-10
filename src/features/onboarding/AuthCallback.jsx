import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';
import { ShieldCheck, ShieldAlert, RefreshCw } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('DECRYPTING CLEARANCE...');
  const [isError, setIsError] = useState(false);

  // =========================================================================
  // 🔐 DEUS NATIVE: Fingerprint / FaceID Check
  // =========================================================================
  const triggerBiometrics = async () => {
    try {
      // 1. CRITICAL FIX: Are we in Safari/Chrome from an email link?
      if (!Capacitor.isNativePlatform()) {
        setStatus('WEB CLEARANCE VERIFIED. ROUTING...');
        setTimeout(() => navigate('/'), 1000);
        return; // Exit here. Do not try to scan fingerprints on a web browser!
      }

      // 2. We are in the native APK/iOS app. Proceed with biometrics.
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
        // Fallback if the specific Android phone doesn't have a fingerprint scanner
        setStatus('DEVICE VERIFIED. ROUTING...');
        setTimeout(() => navigate('/'), 500);
      }
    } catch (error) {
      console.error("Biometric authentication failed or cancelled:", error);
      setIsError(true);
      setStatus('AUTH CANCELLED. ACCESS DENIED.');
      // After a couple of seconds, send them back to login to try again
      setTimeout(() => navigate('/'), 2500);
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (session) {
        // Session found! Run the platform-aware biometric check
        triggerBiometrics();
      } else if (error || !window.location.hash) {
        setIsError(true);
        setStatus('LINK EXPIRED OR INVALID.');
        setTimeout(() => navigate('/'), 2000);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || session) && status !== 'VAULT DECRYPTED. ROUTING...') {
        triggerBiometrics();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500 relative overflow-hidden">
      
      {/* Subtle Ambient Background */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] blur-[100px] rounded-full pointer-events-none transition-colors duration-500 ${isError ? 'bg-red-600/10' : 'bg-blue-600/10'}`}></div>

      <div className="relative z-10 flex flex-col items-center">
        <div className={`w-24 h-24 backdrop-blur-xl border rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl transition-colors duration-500 ${isError ? 'bg-red-900/50 border-red-500/30 text-red-500 shadow-red-500/20' : 'bg-slate-900/50 border-blue-500/30 text-blue-500 shadow-blue-500/20'}`}>
          {isError ? (
            <ShieldAlert size={40} className="animate-in zoom-in" />
          ) : status.includes('ROUTING') ? (
            <ShieldCheck size={40} className="text-emerald-400 animate-in zoom-in" />
          ) : (
            <RefreshCw size={40} className="animate-spin" />
          )}
        </div>
        
        <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-4">
          Terminal Activation
        </h2>
        
        <div className="bg-slate-900/80 backdrop-blur-md px-6 py-3 rounded-full border border-slate-800 shadow-xl">
          <p className={`text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 justify-center ${isError ? 'text-red-400' : 'text-emerald-400'}`}>
            {status}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;