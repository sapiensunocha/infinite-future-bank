import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './services/supabaseClient';

const TicketingSystem  = lazy(() => import('@core/TicketingSystem'));
const PublicEventPage  = lazy(() => import('@core/PublicEventPage'));
const TicketGate       = lazy(() => import('@core/features/commerce/TicketGate'));

const Spinner = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
  </div>
);

export default function App() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return <Spinner />;
  if (!session) window.location.href = 'https://app.infinitefuturebank.org';

  return (
    <Router>
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="/"          element={<TicketingSystem />} />
          <Route path="/event/:id" element={<PublicEventPage />} />
          <Route path="/gate/:id"  element={<TicketGate />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
