// Transaction PIN sheet. Mounted once at the app root; opened through services/pin.js.
//   • No PIN yet → create one (enter, confirm), then it is verified automatically.
//   • PIN set    → enter it. 5 wrong tries lock it for 15 minutes (enforced by the server).
//   • mode 'change' → current PIN, new PIN, confirm.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Lock, ShieldCheck, X } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { PIN_EVENT } from '../../services/pin';

const DIGITS = /^[0-9]{4,6}$/;

export default function PinGateHost() {
  const [req, setReq] = useState(null);          // { resolve, mode }
  const [step, setStep] = useState('loading');   // loading | enter | create | confirm | current | locked
  const [pin, setPin] = useState('');
  const [first, setFirst] = useState('');
  const [current, setCurrent] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  const finish = useCallback((ok) => {
    setReq((r) => { r?.resolve(ok); return null; });
    setPin(''); setFirst(''); setCurrent(''); setError(''); setBusy(false);
  }, []);

  useEffect(() => {
    const onOpen = async (e) => {
      const d = e.detail || {};
      d.ack?.();
      setReq({ resolve: d.resolve, mode: d.mode || 'verify' });
      setStep('loading'); setPin(''); setFirst(''); setCurrent(''); setError('');
      const { data, error: err } = await supabase.rpc('transaction_pin_status');
      if (err) {
        // PIN feature not on the server yet: do not block the customer.
        if (err.code === 'PGRST202' || err.code === '42883') { d.resolve(true); setReq(null); return; }
        setError('Could not check your PIN. Please try again.'); setStep('enter'); return;
      }
      if (data?.locked_until) { setStep('locked'); return; }
      if (!data?.has_pin) { setStep('create'); return; }
      setStep(d.mode === 'change' ? 'current' : 'enter');
    };
    window.addEventListener(PIN_EVENT, onOpen);
    return () => window.removeEventListener(PIN_EVENT, onOpen);
  }, []);

  useEffect(() => { if (req && step !== 'loading' && step !== 'locked') setTimeout(() => inputRef.current?.focus(), 50); }, [req, step]);

  if (!req) return null;

  const submit = async (e) => {
    e?.preventDefault();
    if (busy) return;
    setError('');
    if (!DIGITS.test(pin)) { setError('Enter 4 to 6 digits.'); return; }

    if (step === 'current') { setCurrent(pin); setPin(''); setStep('create'); return; }
    if (step === 'create') { setFirst(pin); setPin(''); setStep('confirm'); return; }

    setBusy(true);
    try {
      if (step === 'confirm') {
        if (pin !== first) { setError('The two PINs do not match. Start again.'); setPin(''); setFirst(''); setStep('create'); return; }
        const { data, error: err } = await supabase.rpc('set_transaction_pin', { p_new: pin, p_current: current || null });
        if (err) throw err;
        if (!data?.ok) {
          setError(data?.error || 'Could not save your PIN.');
          setPin(''); setFirst('');
          setStep(data?.locked ? 'locked' : (current ? 'current' : 'create'));
          if (current) setCurrent('');
          return;
        }
        if (req.mode === 'change') { finish(true); return; }
        // New PIN: verify straight away so the action the customer started can continue.
        const { data: v, error: vErr } = await supabase.rpc('verify_transaction_pin', { p_pin: pin });
        if (vErr || !v?.ok) throw vErr || new Error(v?.error || 'Could not verify your PIN.');
        finish(true);
        return;
      }
      // step === 'enter'
      const { data, error: err } = await supabase.rpc('verify_transaction_pin', { p_pin: pin });
      if (err) throw err;
      if (data?.ok) { finish(true); return; }
      setPin('');
      if (data?.reason === 'locked') { setStep('locked'); return; }
      if (data?.reason === 'no_pin') { setStep('create'); return; }
      setError(data?.error || 'Wrong PIN. Please try again.');
    } catch (ex) {
      setError(ex?.message && !/PGRST|JWT/i.test(ex.message) ? ex.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const copy = {
    enter:   { title: 'Enter your transaction PIN', sub: 'This confirms it is you before money leaves your wallet.', cta: 'Confirm' },
    create:  { title: req.mode === 'change' ? 'Choose a new PIN' : 'Create a transaction PIN', sub: '4 to 6 digits. You will enter it each time you send or withdraw money. Avoid 1234 or repeated digits.', cta: 'Continue' },
    confirm: { title: 'Confirm your PIN', sub: 'Enter the same PIN again.', cta: 'Save PIN' },
    current: { title: 'Enter your current PIN', sub: 'Then you can choose a new one.', cta: 'Continue' },
  }[step];

  return createPortal(
    <div className="fixed inset-0 z-[3000] bg-slate-900/60 flex items-end sm:items-center justify-center p-0 sm:p-4" data-no-dismiss role="dialog" aria-modal="true" aria-label="Transaction PIN">
      <div className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
        <div className="flex items-start justify-between mb-4">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">{step === 'locked' ? <Lock size={20} /> : <ShieldCheck size={20} />}</div>
          <button type="button" onClick={() => finish(false)} aria-label="Close" className="p-2 -m-2 text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </div>

        {step === 'loading' && <div className="py-10 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div>}

        {step === 'locked' && (
          <div>
            <h3 className="ui-sheet-title">PIN locked</h3>
            <p className="text-sm text-slate-600 mt-2">Too many wrong tries. For your safety the PIN is locked for 15 minutes. If you forgot it, contact support from Help.</p>
            <button type="button" onClick={() => finish(false)} className="ui-btn ui-btn-primary w-full mt-6">OK</button>
          </div>
        )}

        {copy && (
          <form onSubmit={submit}>
            <h3 className="ui-sheet-title">{copy.title}</h3>
            <p className="text-sm text-slate-600 mt-2">{copy.sub}</p>
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              maxLength={6}
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
              aria-label={copy.title}
              className="ui-input mt-5 text-center text-2xl tracking-[0.6em] font-bold"
              placeholder="••••"
            />
            {error && <p className="text-sm text-red-600 mt-3" role="alert">{error}</p>}
            <button type="submit" disabled={busy || pin.length < 4} className="ui-btn ui-btn-primary w-full mt-5">
              {busy ? <Loader2 size={16} className="animate-spin" /> : copy.cta}
            </button>
            {step === 'enter' && <p className="text-xs text-slate-500 mt-4 text-center">Forgot your PIN? Open Help and contact support to reset it.</p>}
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
