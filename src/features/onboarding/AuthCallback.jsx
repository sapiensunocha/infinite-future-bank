import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase automatically detects the #access_token in the URL and establishes the session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || session) {
        console.log("Clearance Verified. Routing to Command Center.");
        navigate('/'); // Routes them back to the main App which will now show the Dashboard
      }
    });

    // Fallback if the URL has no token
    if (!window.location.hash.includes('access_token')) {
       navigate('/');
    }

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50 text-emerald-500 font-mono">
      <div className="flex flex-col items-center space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-500"></div>
        <p className="tracking-widest text-xs font-black uppercase">Verifying Clearance...</p>
      </div>
    </div>
  );
};

export default AuthCallback;