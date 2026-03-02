import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('DECRYPTING CLEARANCE...');

  // =========================================================================
  // 🔐 DEUS NATIVE: Fingerprint / FaceID Check
  // =========================================================================
  const triggerBiometrics = async () => {
    try {
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
          setStatus('INTRUDER ALERT. ACCESS DENIED.');
        }
      } else {
        // Fallback if the specific Android phone doesn't have a fingerprint scanner
        setStatus('VERIFIED. ROUTING...');
        setTimeout(() => navigate('/'), 500);
      }
    } catch (error) {
      console.error("Biometric authentication failed or cancelled:", error);
      setStatus('AUTH CANCELLED. ACCESS DENIED.');
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (session) {
        // Session found! Now force hardware biometrics.
        triggerBiometrics();
      } else if (error || !window.location.hash) {
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
    <div className="flex h-screen w-full items-center justify-center bg-slate-50 text-emerald-500 font-sans">
      <div className="flex flex-col items-center space-y-4">
        {status.includes('DENIED') || status.includes('EXPIRED') ? (
          <div className="h-8 w-8 rounded-full bg-red-500 flex items-center justify-center text-white font-black text-lg">X</div>
        ) : status.includes('ROUTING') ? (
          <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-black text-lg">✓</div>
        ) : (
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-500"></div>
        )}
        <p className={`tracking-widest text-xs font-black uppercase ${status.includes('DENIED') ? 'text-red-500' : ''}`}>
          {status}
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;