import { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { CreditCard, Wifi, CheckCircle2, AlertTriangle, Loader2, ArrowLeft, RefreshCw, X } from 'lucide-react';
import { initTerminal, connectReader, collectPayment, cancelPayment } from '../../services/stripeTerminal';

const fmtUSD = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
const TERMINAL_FEE_PCT = 0.015; // 1.5% IFB merchant processing fee

// step: 'amount' | 'connecting' | 'waiting' | 'processing' | 'success' | 'error'
export default function TapToPay({ balances, onClose, onSuccess }) {
  const [step, setStep]       = useState('amount');
  const [amount, setAmount]   = useState('');
  const [note, setNote]       = useState('');
  const [err, setErr]         = useState(null);
  const [result, setResult]   = useState(null);
  const cancelRef             = useRef(false);
  const isNative              = Capacitor.isNativePlatform();

  useEffect(() => () => { cancelRef.current = true; cancelPayment(); }, []);

  const reset = () => {
    cancelPayment();
    setStep('amount'); setAmount(''); setNote(''); setErr(null); setResult(null);
    cancelRef.current = false;
  };

  const start = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 0.5) return;
    cancelRef.current = false;
    setErr(null);

    try {
      setStep('connecting');
      await initTerminal();
      await connectReader();

      if (cancelRef.current) return;
      setStep('waiting');

      const res = await collectPayment(amt, note || undefined);
      if (cancelRef.current) return;

      setStep('processing');
      setResult({ amount: amt, paymentIntentId: res.paymentIntentId });
      setStep('success');
      if (onSuccess) onSuccess();
    } catch (e) {
      if (cancelRef.current) return;
      setErr(e.message || 'Payment failed');
      setStep('error');
    }
  };

  const cancel = () => {
    cancelRef.current = true;
    cancelPayment();
    reset();
  };

  if (!isNative) {
    return (
      <div className="space-y-5 max-w-sm mx-auto text-center py-8">
        <div className="w-16 h-16 mx-auto rounded-full bg-amber-900/30 border border-amber-700/40 flex items-center justify-center">
          <CreditCard size={28} className="text-amber-400"/>
        </div>
        <p className="font-black text-white text-lg">Android App Required</p>
        <p className="text-slate-400 text-sm">Tap to Pay only works on the Android APK — it uses the phone's NFC chip as a card reader. Not available in the browser.</p>
        {onClose && <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xs font-bold">Close</button>}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-sm mx-auto">

      {/* Header */}
      <div className="flex items-center gap-4">
        {step === 'amount' && onClose && (
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 transition-colors">
            <ArrowLeft size={16}/>
          </button>
        )}
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-xl bg-violet-900/40 border border-violet-700/40 flex items-center justify-center">
            <CreditCard size={18} className="text-violet-400"/>
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Tap to Pay</h2>
            <p className="text-[10px] text-slate-400">Hold card to phone · Visa · MC · Amex</p>
          </div>
        </div>
      </div>

      {/* ── AMOUNT ── */}
      {step === 'amount' && (
        <div className="space-y-5 animate-in fade-in">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xl">$</span>
            <input
              type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0.00" min="0.5" step="0.01" autoFocus
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-10 pr-4 py-4 text-2xl font-black text-white outline-none focus:border-violet-500 transition-colors text-center"
            />
          </div>
          <div className="flex gap-2">
            {[10, 20, 50, 100].map(v => (
              <button key={v} onClick={() => setAmount(String(v))}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] font-black rounded-xl transition-all">
                ${v}
              </button>
            ))}
          </div>
          <input value={note} onChange={e => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-white outline-none focus:border-violet-500 transition-colors placeholder-slate-600"/>
          {amount && parseFloat(amount) >= 0.5 && (
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Charged to card</span>
                <span className="font-bold text-white">{fmtUSD(parseFloat(amount))}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>IFB Processing (1.5%)</span>
                <span className="font-bold text-amber-400">−{fmtUSD(parseFloat(amount) * TERMINAL_FEE_PCT)}</span>
              </div>
              <div className="flex justify-between text-slate-300 border-t border-slate-700 pt-1.5 font-black">
                <span>Net to your wallet</span>
                <span className="text-emerald-400">{fmtUSD(parseFloat(amount) * (1 - TERMINAL_FEE_PCT))}</span>
              </div>
            </div>
          )}
          <button onClick={start}
            disabled={!amount || parseFloat(amount) < 0.5}
            className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 text-white font-black rounded-2xl text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-900/30">
            <CreditCard size={16}/> Start — Charge {amount ? fmtUSD(parseFloat(amount)) : ''}
          </button>
          <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 font-bold">
            <Wifi size={11}/> Tap card to back of phone after next screen
          </div>
        </div>
      )}

      {/* ── CONNECTING ── */}
      {step === 'connecting' && (
        <div className="space-y-6 animate-in fade-in text-center py-4">
          <Loader2 size={48} className="text-violet-400 animate-spin mx-auto"/>
          <div>
            <p className="font-black text-white text-lg">Initialising reader…</p>
            <p className="text-slate-400 text-sm mt-1">Activating NFC card reader</p>
          </div>
          <button onClick={cancel} className="text-slate-500 hover:text-red-400 text-xs font-bold transition-colors">Cancel</button>
        </div>
      )}

      {/* ── WAITING FOR TAP ── */}
      {step === 'waiting' && (
        <div className="space-y-6 animate-in fade-in text-center py-4">
          <div className="relative mx-auto w-32 h-32">
            <div className="absolute inset-0 rounded-full border-4 border-violet-500/30 animate-ping"/>
            <div className="absolute inset-3 rounded-full border-4 border-violet-500/50 animate-ping" style={{ animationDelay: '0.3s' }}/>
            <div className="absolute inset-0 rounded-full bg-violet-900/30 border-2 border-violet-600 flex items-center justify-center">
              <CreditCard size={40} className="text-violet-400"/>
            </div>
          </div>
          <div>
            <p className="font-black text-white text-xl">Hold card to phone</p>
            <p className="text-violet-300 font-black text-2xl mt-1">{fmtUSD(parseFloat(amount))}</p>
            <p className="text-slate-400 text-sm mt-2">Place your Visa, Mastercard, or Amex<br/>against the back of the phone</p>
          </div>
          <button onClick={cancel} className="text-slate-500 hover:text-red-400 text-xs font-bold transition-colors flex items-center gap-1 mx-auto">
            <X size={12}/> Cancel
          </button>
        </div>
      )}

      {/* ── PROCESSING ── */}
      {step === 'processing' && (
        <div className="space-y-6 animate-in fade-in text-center py-4">
          <Loader2 size={48} className="text-emerald-400 animate-spin mx-auto"/>
          <div>
            <p className="font-black text-white text-lg">Processing…</p>
            <p className="text-slate-400 text-sm mt-1">Confirming payment with Stripe</p>
          </div>
        </div>
      )}

      {/* ── SUCCESS ── */}
      {step === 'success' && result && (
        <div className="space-y-5 text-center animate-in zoom-in-95 py-4">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-b from-emerald-900 to-slate-900 border border-emerald-700 flex items-center justify-center">
            <CheckCircle2 size={48} className="text-emerald-400"/>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2">Payment Accepted</p>
            <p className="text-4xl font-black text-white">{fmtUSD(result.amount)}</p>
            <p className="text-slate-400 text-sm mt-2">Money is on its way to your Liquid Wallet</p>
          </div>
          <div className="flex gap-3">
            <button onClick={reset}
              className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white font-black rounded-2xl text-xs uppercase tracking-widest transition-all">
              <RefreshCw size={12} className="inline mr-1"/> New Charge
            </button>
            {onClose && (
              <button onClick={onClose}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black rounded-2xl text-xs uppercase tracking-widest transition-all">
                Done
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── ERROR ── */}
      {step === 'error' && (
        <div className="space-y-5 text-center animate-in fade-in py-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-red-900/30 border border-red-700/40 flex items-center justify-center">
            <AlertTriangle size={36} className="text-red-400"/>
          </div>
          <div>
            <p className="font-black text-white text-lg">Payment Failed</p>
            <p className="text-red-300 text-sm mt-1">{err}</p>
          </div>
          <button onClick={reset}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black rounded-2xl text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2">
            <RefreshCw size={12}/> Try Again
          </button>
        </div>
      )}
    </div>
  );
}
