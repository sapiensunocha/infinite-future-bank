import React, { useState } from 'react';
import { supabase } from './services/supabaseClient';
import { AlertTriangle, Trash2, ArrowLeft, CheckCircle2, ShieldAlert, Loader2, Lock, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DeleteAccountPage({ session }) {
  const [email, setEmail] = useState(session?.user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async (e) => {
    e.preventDefault();
    setError(null);

    if (confirmText !== 'DELETE') {
      setError('Please type DELETE in capital letters to confirm.');
      return;
    }

    setLoading(true);

    try {
      let headers = {};
      let body = {};

      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      } else {
        if (!email || !password) {
          throw new Error('Please enter your email and password to verify account ownership.');
        }
        body = { email: email.trim().toLowerCase(), password };
      }

      const { data, error: fnError } = await supabase.functions.invoke('delete-account', {
        headers,
        body,
      });

      if (fnError) throw new Error(fnError.message || 'Failed to delete account');
      if (data?.error) throw new Error(data.error);

      // Sign out locally
      await supabase.auth.signOut().catch(() => {});
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'An error occurred while deleting your account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col justify-between p-6">
      <header className="max-w-2xl mx-auto w-full pt-6 pb-4 flex items-center justify-between border-b border-slate-800">
        <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider">
          <ArrowLeft size={16} /> Back to DEUS
        </Link>
        <div className="flex items-center gap-1 font-black text-lg">
          <span className="text-blue-500">D</span>
          <span className="text-blue-600">E</span>
          <span className="text-teal-500">U</span>
          <span className="text-emerald-500">S</span>
        </div>
      </header>

      <main className="max-w-xl mx-auto w-full my-auto py-8">
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-6">
            <Trash2 size={28} />
          </div>

          <h1 className="text-2xl font-black mb-2">Delete Your Account</h1>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            In compliance with Apple App Store and Google Play Store data safety standards, you can permanently delete your account and personal data at any time.
          </p>

          {success ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center space-y-4 animate-in fade-in">
              <CheckCircle2 size={40} className="text-emerald-400 mx-auto" />
              <h2 className="text-lg font-bold text-white">Account Deletion Processed</h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                Your login credentials, profile, identity documents, and active sessions have been permanently removed.
              </p>
              <Link
                to="/"
                className="inline-block mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-black text-xs uppercase tracking-widest text-white transition-colors"
              >
                Return to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleDelete} className="space-y-6">
              {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold flex items-center gap-3">
                  <AlertTriangle size={18} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Data retention disclosure */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 text-xs space-y-2 text-slate-300">
                <p className="font-bold text-slate-200 flex items-center gap-2">
                  <ShieldAlert size={14} className="text-amber-400" /> What happens to your data:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                  <li><span className="text-red-400 font-semibold">Deleted immediately:</span> Passwords, phone numbers, KYC identity documents, selfies, and device tokens.</li>
                  <li><span className="text-amber-400 font-semibold">Retained per legal regulation:</span> Financial ledger records and completed transaction receipts are retained for 5 years strictly to comply with global Anti-Money Laundering (AML) laws.</li>
                </ul>
              </div>

              {!session && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">Registered Email</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-sm text-white outline-none focus:border-red-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">Account Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-sm text-white outline-none focus:border-red-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Type <span className="text-red-400 font-black">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  required
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-black text-red-400 outline-none focus:border-red-500 uppercase tracking-widest"
                />
              </div>

              <button
                type="submit"
                disabled={loading || confirmText !== 'DELETE'}
                className="w-full py-4 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-red-900/20 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Permanently Delete My Account
              </button>
            </form>
          )}
        </div>
      </main>

      <footer className="max-w-2xl mx-auto w-full py-4 text-center text-xs text-slate-600 border-t border-slate-800">
        &copy; {new Date().getFullYear()} Infinite Future Bank. Compliant with Apple App Store & Google Play Console policies.
      </footer>
    </div>
  );
}
