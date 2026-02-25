import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { supabase } from './services/supabaseClient';
import { ShieldCheck, Loader2, Lock, ArrowRight } from 'lucide-react';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = ({ amount, targetUserId }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/pay?status=success`,
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-5 bg-white shadow-sm border border-slate-100 rounded-3xl">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>
      
      {errorMessage && (
        <div className="p-4 text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-2xl text-center">
          {errorMessage}
        </div>
      )}

      <button 
        disabled={isProcessing || !stripe || !elements}
        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-sm uppercase tracking-widest p-5 rounded-2xl shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 group"
      >
        {isProcessing ? <Loader2 className="animate-spin" size={18} /> : (
          <>AUTHORIZE SECURE TRANSFER <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /></>
        )}
      </button>
    </form>
  );
};

export default function PayInterface() {
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState({ amount: 0, reason: '', targetId: '' });
  const [isInitializing, setIsInitializing] = useState(true);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    const initPayment = async () => {
      const params = new URLSearchParams(window.location.search);
      
      // If returning from Stripe success redirect
      if (params.get('status') === 'success') {
        setPaymentSuccess(true);
        setIsInitializing(false);
        return;
      }

      const to = params.get('to');
      const amountParam = parseFloat(params.get('amount'));
      const reasonParam = params.get('reason') || 'Secure Transfer';

      if (!to || isNaN(amountParam) || amountParam <= 0) {
        setIsInitializing(false);
        return; // Invalid link
      }

      setPaymentDetails({ amount: amountParam, reason: reasonParam, targetId: to });

      try {
        // Re-using your exact create-payment-intent edge function!
        // The webhook will automatically route this money to the 'to' user.
        const { data, error } = await supabase.functions.invoke('create-payment-intent', {
          body: { userId: to, amount: amountParam }
        });

        if (error) throw error;
        setClientSecret(data.clientSecret);
      } catch (err) {
        console.error("Failed to initialize secure link:", err);
      } finally {
        setIsInitializing(false);
      }
    };

    initPayment();
  }, []);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-inner animate-in zoom-in duration-500">
          <ShieldCheck size={48} />
        </div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Transfer Complete</h1>
        <p className="text-slate-500 font-medium text-center max-w-sm mb-12">The funds have been securely routed and settled into the recipient's DEUS account.</p>
        
        <div className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest">
          Powered by <span className="text-slate-800">INFINITE FUTURE BANK</span>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-center">
        <div>
          <Lock className="mx-auto text-slate-400 mb-4" size={32} />
          <h1 className="text-xl font-black text-slate-800 mb-2">Invalid or Expired Link</h1>
          <p className="text-slate-500 text-sm">This secure payment routing link is no longer active.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="py-6 px-8 flex justify-center border-b border-slate-200/50 bg-white/40 backdrop-blur-md">
        <div className="flex items-center gap-1 opacity-50">
          <span className="text-xl font-black text-[#4285F4]">D</span>
          <span className="text-xl font-black text-[#EA4335]">E</span>
          <span className="text-xl font-black text-[#FBBC04]">U</span>
          <span className="text-xl font-black text-[#34A853]">S</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 animate-in slide-in-from-top-4 duration-500">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2 flex items-center justify-center gap-1">
              <Lock size={12} /> SECURE EXTERNAL ROUTING
            </p>
            <h1 className="text-4xl font-black text-slate-800 mb-2">${paymentDetails.amount.toFixed(2)}</h1>
            <p className="text-slate-500 font-medium bg-slate-200/50 inline-block px-4 py-1.5 rounded-full text-sm">
              For: {paymentDetails.reason}
            </p>
          </div>

          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#0f172a', borderRadius: '16px' } } }}>
            <CheckoutForm amount={paymentDetails.amount} targetUserId={paymentDetails.targetId} />
          </Elements>
        </div>
      </main>

      <footer className="py-8 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
        Bank-Grade Encryption • Secure Settlement via Stripe
      </footer>
    </div>
  );
}