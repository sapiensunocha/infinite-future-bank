import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { supabase } from './services/supabaseClient';
import { ShieldCheck, Loader2, X, ArrowLeft } from 'lucide-react';

// Initialize Stripe outside of component renders to avoid recreating the object
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// -------------------------------------------------------------------------
// THE SECURE FORM (Only renders AFTER we have the secret key)
// -------------------------------------------------------------------------
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
    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <button type="button" onClick={onBack} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white flex items-center gap-2 mb-2 transition-colors">
        <ArrowLeft size={14}/> Back to amount
      </button>

      <div className="p-5 bg-black/40 border border-white/10 rounded-2xl shadow-inner">
        <PaymentElement />
      </div>
      
      {errorMessage && (
        <div className="p-4 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl text-center shadow-inner">
          {errorMessage}
        </div>
      )}

      <button 
        disabled={isProcessing || !stripe || !elements}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-sm uppercase tracking-widest p-5 rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all disabled:opacity-50 flex items-center justify-center gap-2 border border-blue-400/30"
      >
        {isProcessing ? <Loader2 className="animate-spin" size={18} /> : `AUTHORIZE $${amount} DEPOSIT`}
      </button>
    </form>
  );
};

// -------------------------------------------------------------------------
// MAIN WRAPPER 
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
    // The fixed background that covers the whole screen. Clicking it triggers onClose.
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
      onClick={onClose} 
    >
      {/* The main card. e.stopPropagation prevents clicks inside the card from closing it */}
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="w-full max-w-md bg-[#0B0F19] rounded-[2.5rem] shadow-2xl overflow-hidden relative border border-white/10 p-8"
      >
        
        {/* Subtle Ambient Glow */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/20 blur-[60px] pointer-events-none"></div>

        {/* The X Close Button */}
        <button 
          onClick={(e) => { e.preventDefault(); onClose(); }} 
          className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors bg-white/5 p-2 rounded-xl border border-white/10 z-50 cursor-pointer"
        >
          <X size={20} />
        </button>

        <div className="relative z-10">
          <h2 className="text-2xl font-black text-white mb-1">Inject Capital</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-500" />
            256-bit AES Encrypted
          </p>

          {!clientSecret ? (
            <div className="space-y-6">
              <div className="relative">
                <span className="absolute left-6 top-6 text-slate-500 font-black text-xl">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-black/30 border border-white/10 rounded-2xl pl-12 pr-6 py-6 text-3xl font-black outline-none focus:border-blue-500 focus:bg-black/50 transition-all text-white placeholder:text-slate-600 shadow-inner"
                  autoFocus
                />
              </div>
              <button 
                onClick={handleInitialize}
                disabled={!amount || isInitializing}
                className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-black text-xs uppercase tracking-widest p-5 rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center"
              >
                {isInitializing ? <Loader2 className="animate-spin" size={18} /> : 'ESTABLISH SECURE CONNECTION'}
              </button>
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
                    colorText: '#F8FAFC',
                    colorDanger: '#ef4444',
                    fontFamily: 'system-ui, sans-serif',
                    borderRadius: '16px',
                    spacingUnit: '4px'
                  } 
                } 
              }}
            >
              <CheckoutForm amount={amount} onBack={() => setClientSecret(null)} />
            </Elements>
          )}
        </div>
      </div>
    </div>
  );
}