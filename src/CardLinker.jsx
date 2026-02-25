import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { supabase } from './services/supabaseClient';
import { ShieldCheck, Loader2, X, CreditCard, Lock } from 'lucide-react';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CardForm = ({ session, onClose, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage(null);

    // 1. Securely tokenize the card directly with Stripe
    const cardElement = elements.getElement(CardElement);
    const { error, token } = await stripe.createToken(cardElement, {
      currency: 'usd',
    });

    if (error) {
      setErrorMessage(error.message);
      setIsProcessing(false);
      return;
    }

    // 2. Send the safe Token ID to your DEUS backend to attach it to their account
    try {
      const { data, error: backendError } = await supabase.functions.invoke('link-external-card', {
        body: { 
          userId: session.user.id, 
          stripeToken: token.id,
          last4: token.card.last4,
          brand: token.card.brand
        }
      });

      if (backendError || data?.error) throw new Error(data?.error || backendError.message);
      
      onSuccess(token.card);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || "Failed to vault card securely.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 shadow-inner">
        {/* The Stripe Card Element iframe */}
        <CardElement 
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#1e293b',
                fontFamily: '"JetBrains Mono", "Courier New", Courier, monospace',
                fontSmoothing: 'antialiased',
                '::placeholder': { color: '#94a3b8', fontWeight: 'bold' },
                iconColor: '#3b82f6',
              },
              invalid: {
                color: '#ef4444',
                iconColor: '#ef4444',
              },
            },
            hidePostalCode: true, // Assuming you collect this elsewhere or don't need it for payouts
          }}
        />
      </div>

      {errorMessage && (
        <div className="p-3 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl text-center">
          {errorMessage}
        </div>
      )}

      <button 
        disabled={isProcessing || !stripe || !elements}
        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest p-5 rounded-2xl shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isProcessing ? <Loader2 className="animate-spin" size={18} /> : 'VAULT DEBIT CARD'}
      </button>
    </form>
  );
};

export default function CardLinker({ session, onClose, onSuccess }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden relative border border-slate-100 animate-in zoom-in-95 duration-300">
        
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2">
            <CreditCard className="text-blue-600" size={20} />
            <h3 className="font-black text-lg text-slate-800 tracking-tight uppercase">Link Debit Card</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-800 transition-colors bg-white p-2 rounded-xl shadow-sm">
            <X size={20} />
          </button>
        </div>

        <div className="p-8">
          <div className="flex items-center justify-center gap-2 mb-6 text-emerald-500 bg-emerald-50 py-2 rounded-xl border border-emerald-100">
            <ShieldCheck size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">PCI-DSS Compliant • 256-Bit AES</span>
          </div>

          <p className="text-xs font-bold text-slate-500 mb-6 text-center">
            Link a debit card to unlock <span className="text-slate-800">Instant Payouts</span>. Your card data is encrypted and vaulted directly by the clearing house.
          </p>

          <Elements stripe={stripePromise}>
            <CardForm session={session} onClose={onClose} onSuccess={onSuccess} />
          </Elements>

          <div className="mt-8 flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <Lock size={12} /> SECURED BY STRIPE
          </div>
        </div>
      </div>
    </div>
  );
}