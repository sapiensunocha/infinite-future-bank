import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('DECRYPTING CLEARANCE...');

  useEffect(() => {
    // 1. Immediately check if Supabase parsed the valid token
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (session) {
        setStatus('VERIFIED. ROUTING...');
        setTimeout(() => navigate('/'), 500); // Exactly half a second delay
      } else if (error || !window.location.hash) {
        setStatus('LINK EXPIRED OR INVALID.');
        setTimeout(() => navigate('/'), 2000);
      }
    };

    checkSession();

    // 2. Failsafe listener for the moment the token is accepted
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || session) {
        setStatus('VERIFIED. ROUTING...');
        setTimeout(() => navigate('/'), 500);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50 text-emerald-500 font-sans">
      <div className="flex flex-col items-center space-y-4">
        {status === 'DECRYPTING CLEARANCE...' ? (
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-500"></div>
        ) : (
          <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-black text-lg">✓</div>
        )}
        <p className="tracking-widest text-xs font-black uppercase">{status}</p>
      </div>
    </div>
  );
};

export default AuthCallback;