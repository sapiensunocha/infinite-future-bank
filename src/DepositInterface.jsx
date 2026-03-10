import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { supabase } from './services/supabaseClient';
import { ShieldCheck, Loader2, X, ArrowLeft } from 'lucide-react';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = ({ amount, onBack }) => {
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
        return_url: `${window.location.origin}/?status=success`,
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      <button type="button" onClick={onBack} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white flex items-center gap-2 mb-2">
        <ArrowLeft size={14}/> Back to amount
      </button>
      
      <div className="p-4 bg-black/40 border border-white/10 rounded-2xl">
        <PaymentElement />
      </div>
      
      {errorMessage && (
        <div className="p-4 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
          {errorMessage}
        </div>
      )}

      <button 
        disabled={isProcessing || !stripe || !elements}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-sm uppercase tracking-widest p-5 rounded-2xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isProcessing ? <Loader2 className="animate-spin" size={18} /> : `CONFIRM $${amount} DEPOSIT`}
      </button>
    </form>
  );
};

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
      console.error(err);
      alert("System could not securely connect to clearing house.");
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-[#0B0F19] rounded-[3rem] shadow-2xl overflow-hidden relative border border-white/10 p-10 animate-in zoom-in-95 duration-300">
      
      {/* 🔴 THE FIX: Explicit Close Button inside the card */}
      <button 
        onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
        }} 
        className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors bg-white/5 p-2 rounded-xl border border-white/10 z-[210] cursor-pointer active:scale-90"
      >
        <X size={20} />
      </button>

      <div className="relative z-10">
        <h2 className="text-3xl font-black text-white mb-1 tracking-tight">Deposit Funds</h2>
        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-10 flex items-center gap-2">
          <ShieldCheck size={14} />
          Military-Grade Encryption
        </p>

        {!clientSecret ? (
          <div className="space-y-6 animate-in fade-in">
            <div className="relative">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 font-black text-2xl">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-black/50 border border-white/10 rounded-2xl pl-12 pr-6 py-8 text-4xl font-black outline-none focus:border-blue-500 transition-all text-white placeholder:text-slate-800"
                autoFocus
              />
            </div>
            <button 
              onClick={handleInitialize}
              disabled={!amount || isInitializing}
              className="w-full bg-white text-slate-900 font-black text-xs uppercase tracking-widest p-6 rounded-2xl hover:bg-blue-50 transition-all disabled:opacity-50 flex items-center justify-center shadow-xl"
            >
              {isInitializing ? <Loader2 className="animate-spin" size={20} /> : 'INITIALIZE CLEARING'}
            </button>
            <p className="text-[9px] text-center text-slate-500 font-bold uppercase tracking-widest">Funds are settled via Stripe Secure Network</p>
          </div>
        ) : (
          <Elements 
            stripe={stripePromise} 
            options={{ 
              clientSecret, 
              appearance: { 
                theme: 'night', 
                variables: { 
                  colorPrimary: '#2563EB', 
                  colorBackground: '#0B0F19',
                  colorText: '#F8FAFC'
                } 
              } 
            }}
          >
            <CheckoutForm amount={amount} onBack={() => setClientSecret(null)} />
          </Elements>
        )}
      </div>
    </div>
  );
}