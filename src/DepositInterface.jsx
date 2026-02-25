import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { supabase } from './services/supabaseClient';
import { ShieldCheck, Loader2 } from 'lucide-react';

// Initialize Stripe outside of component renders to avoid recreating the object
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// -------------------------------------------------------------------------
// THE SECURE FORM (Only renders AFTER we have the secret key)
// -------------------------------------------------------------------------
const CheckoutForm = ({ amount }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage(null);

    // This securely sends the card data directly to Stripe, then redirects back to DEUS
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/?status=success`,
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 bg-white/50 border border-slate-200 rounded-2xl">
        <PaymentElement />
      </div>
      
      {errorMessage && (
        <div className="p-3 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl text-center">
          {errorMessage}
        </div>
      )}

      <button 
        disabled={isProcessing || !stripe || !elements}
        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm uppercase tracking-widest p-4 rounded-2xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isProcessing ? <Loader2 className="animate-spin" size={18} /> : `AUTHORIZE $${amount} DEPOSIT`}
      </button>
    </form>
  );
};

// -------------------------------------------------------------------------
// MAIN WRAPPER (Handles the amount and fetches the key)
// -------------------------------------------------------------------------
export default function DepositInterface({ session, onClose }) {
  const [amount, setAmount] = useState('');
  const [clientSecret, setClientSecret] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const handleInitialize = async () => {
    if (!amount || amount <= 0) return;
    setIsInitializing(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: { userId: session.user.id, amount: parseFloat(amount) }
      });

      if (error) throw error;
      setClientSecret(data.clientSecret);
    } catch (err) {
      console.error("Failed to initialize payment:", err);
      alert("System could not securely connect to clearing house.");
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden relative border border-slate-100 p-8">
        
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-800 font-bold text-xs uppercase tracking-widest">
          Close
        </button>

        <h2 className="text-2xl font-black text-slate-800 mb-1">Inject Capital</h2>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-1">
          <ShieldCheck size={14} className="text-emerald-500" />
          256-bit AES Encrypted
        </p>

        {!clientSecret ? (
          <div className="space-y-4">
            <div className="relative">
              <span className="absolute left-6 top-5 text-slate-400 font-black text-xl">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-6 py-5 text-xl font-black outline-none focus:border-emerald-400 focus:bg-white transition-all text-slate-800"
              />
            </div>
            <button 
              onClick={handleInitialize}
              disabled={!amount || isInitializing}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black text-sm uppercase tracking-widest p-4 rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center"
            >
              {isInitializing ? <Loader2 className="animate-spin" size={18} /> : 'SECURE CONNECTION'}
            </button>
          </div>
        ) : (
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
            <CheckoutForm amount={amount} />
          </Elements>
        )}
      </div>
    </div>
  );
}