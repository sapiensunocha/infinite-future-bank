import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Instantly check if Supabase already processed the URL and created a session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/'); // Handoff to main App/Dashboard
      }
    });

    // 2. Listen for the exact moment the URL is parsed and the user is logged in
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || session) {
        navigate('/');
      }
    });

    // 3. Failsafe: If the link is expired or broken, send them back to login
    if (window.location.hash.includes('error_description')) {
      navigate('/');
    }

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50 text-emerald-500 font-sans">
      <div className="flex flex-col items-center space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-500"></div>
        <p className="tracking-widest text-xs font-black uppercase">Decrypting Clearance...</p>
      </div>
    </div>
  );
};

export default AuthCallback;