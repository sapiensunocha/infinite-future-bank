import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { supabase } from './services/supabaseClient';
import { ShieldCheck, Loader2, Lock, ArrowRight, Sparkles } from 'lucide-react';

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
      <div className="p-5 bg-[#0B0F19]/80 backdrop-blur-2xl shadow-glass border border-white/10 rounded-3xl">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>
      
      {errorMessage && (
        <div className="p-4 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/30 rounded-2xl text-center">
          {errorMessage}
        </div>
      )}

      <button 
        disabled={isProcessing || !stripe || !elements}
        className="w-full bg-ifb-primary text-white font-black text-sm uppercase tracking-widest p-5 rounded-2xl shadow-glow-blue hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 group border border-blue-400/30"
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
      <div className="min-h-screen bg-ifb-background flex items-center justify-center">
        <Loader2 className="animate-spin text-ifb-primary" size={32} />
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-ifb-background text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-ifb-success/20 rounded-full blur-[120px]"></div>
        </div>
        
        <div className="z-10 w-24 h-24 bg-ifb-success/20 border border-ifb-success/30 text-ifb-success rounded-full flex items-center justify-center mb-6 shadow-glow animate-in zoom-in duration-500">
          <ShieldCheck size={48} />
        </div>
        <h1 className="z-10 text-3xl font-black text-white tracking-tight mb-2">Transfer Complete</h1>
        <p className="z-10 text-slate-300 font-medium text-center max-w-sm mb-12">The funds have been securely routed and settled into the recipient's DEUS account.</p>
        
        <div className="z-10 flex items-center gap-2 text-slate-500 font-black text-[10px] uppercase tracking-widest">
          Powered by <span className="text-white">INFINITE FUTURE BANK</span>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-ifb-background text-white flex items-center justify-center p-4 text-center">
        <div>
          <Lock className="mx-auto text-slate-500 mb-4" size={32} />
          <h1 className="text-xl font-black text-white mb-2">Invalid or Expired Link</h1>
          <p className="text-slate-400 text-sm">This secure payment routing link is no longer active.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ifb-background text-white flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-ifb-primary/15 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-ifb-accent/10 rounded-full blur-[120px]"></div>
      </div>

      <header className="py-6 px-8 flex justify-center border-b border-white/10 bg-[#0B0F19]/40 backdrop-blur-2xl z-10 sticky top-0">
        <div className="flex items-center gap-1 opacity-70">
          <span className="text-xl font-black text-ifb-logoI">D</span>
          <span className="text-xl font-black text-ifb-logoF">E</span>
          <span className="text-xl font-black text-ifb-logoB">U</span>
          <span className="text-xl font-black text-ifb-logoG">S</span>
          <Sparkles size={16} className="text-ifb-primary ml-1" />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 z-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 animate-in slide-in-from-top-4 duration-500">
            <p className="text-[10px] font-black uppercase tracking-widest text-ifb-accent mb-2 flex items-center justify-center gap-1">
              <Lock size={12} /> SECURE EXTERNAL ROUTING
            </p>
            <h1 className="text-4xl font-black text-white mb-2">${paymentDetails.amount.toFixed(2)}</h1>
            <p className="text-slate-300 font-medium bg-white/10 border border-white/10 inline-block px-4 py-1.5 rounded-full text-sm">
              For: {paymentDetails.reason}
            </p>
          </div>

          <Elements 
            stripe={stripePromise} 
            options={{ 
              clientSecret, 
              appearance: { 
                theme: 'night', // Forces dark mode for Stripe Elements
                variables: { 
                  colorPrimary: '#2563EB', 
                  colorBackground: '#0B0F19',
                  colorText: '#F8FAFC',
                  colorDanger: '#ef4444',
                  fontFamily: 'system-ui, sans-serif',
                  borderRadius: '16px',
                  spacingUnit: '4px'
                } 
              } 
            }}
          >
            <CheckoutForm amount={paymentDetails.amount} targetUserId={paymentDetails.targetId} />
          </Elements>
        </div>
      </main>

      <footer className="py-8 text-center text-[10px] font-black uppercase tracking-widest text-slate-500 z-10">
        Bank-Grade Encryption • Secure Settlement via Stripe
      </footer>
    </div>
  );
}