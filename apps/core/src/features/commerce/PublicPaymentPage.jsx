import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import {
  ArrowLeft, ShieldCheck, Loader2, CheckCircle2, XCircle, Clock, CreditCard,
  Smartphone, Wallet, Landmark, AlertTriangle, Link2Off, RefreshCw, Lock
} from 'lucide-react';
import PaymentFormRenderer from './PaymentFormRenderer';
import { callPaymentPages, formatCents, safeHttpsUrl, initialAnswers, buildAnswers } from './paymentPagesApi';

// Public Payment Page: /p/:slug — works logged out.
// The browser NEVER computes the charged amount: totals shown here come from the
// server's `quote` action and are display-only; `checkout` re-prices on the server.

const SLUG_RE = /^[a-z0-9-]{3,60}$/;
const ORDER_ID_RE = /^[A-Za-z0-9-]{8,64}$/;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const POLL_INTERVAL_MS = 3000;
const POLL_MAX_MS = 2 * 60 * 1000;

const inputCls = 'w-full p-4 rounded-xl border border-slate-200 bg-white font-bold text-sm text-slate-800 outline-none focus:border-blue-500 transition-colors disabled:opacity-60';

/** Redirect only to https hosts of the expected provider. */
function isAllowedProviderUrl(raw, method) {
  const href = safeHttpsUrl(raw);
  if (!href) return false;
  const host = new URL(href).hostname.toLowerCase();
  const allowed = method === 'mobile_money' ? ['flutterwave.com'] : ['paystack.co', 'paystack.com'];
  return allowed.some((d) => host === d || host.endsWith(`.${d}`));
}

// ------------------------------------------
// Cloudflare Turnstile (only when a site key is configured)
// ------------------------------------------
let turnstileScriptPromise = null;
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!turnstileScriptPromise) {
    turnstileScriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = TURNSTILE_SRC;
      s.async = true;
      s.defer = true;
      s.onload = () => {
        // The global may attach a tick after onload.
        const start = Date.now();
        const wait = () => {
          if (window.turnstile) resolve(window.turnstile);
          else if (Date.now() - start > 5000) reject(new Error('Turnstile unavailable'));
          else setTimeout(wait, 50);
        };
        wait();
      };
      s.onerror = () => { turnstileScriptPromise = null; reject(new Error('Turnstile failed to load')); };
      document.head.appendChild(s);
    });
  }
  return turnstileScriptPromise;
}

function TurnstileWidget({ siteKey, onToken, resetKey }) {
  const ref = useRef(null);
  const widgetId = useRef(null);
  const [loadError, setLoadError] = useState(false);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    let cancelled = false;
    loadTurnstile().then((ts) => {
      if (cancelled || !ref.current || widgetId.current !== null) return;
      widgetId.current = ts.render(ref.current, {
        sitekey: siteKey,
        callback: (t) => onTokenRef.current(t),
        'expired-callback': () => onTokenRef.current(''),
        'error-callback': () => onTokenRef.current(''),
      });
    }).catch(() => { if (!cancelled) setLoadError(true); });
    return () => {
      cancelled = true;
      if (widgetId.current !== null && window.turnstile) {
        try { window.turnstile.remove(widgetId.current); } catch { /* ignore */ }
      }
      widgetId.current = null;
    };
  }, [siteKey]);

  // Tokens are single-use: reset after each checkout attempt.
  useEffect(() => {
    if (resetKey && widgetId.current !== null && window.turnstile) {
      try { window.turnstile.reset(widgetId.current); } catch { /* ignore */ }
      onTokenRef.current('');
    }
  }, [resetKey]);

  return (
    <div>
      <div ref={ref} className="flex justify-center min-h-[65px]" />
      {loadError && <p className="text-[11px] text-red-500 font-bold text-center mt-2">Security check failed to load. Disable blockers and reload.</p>}
    </div>
  );
}

// ------------------------------------------
// Shared shells
// ------------------------------------------
const Shell = ({ children }) => (
  <div className="min-h-screen w-full bg-slate-50 flex flex-col items-center px-4 py-6 sm:py-12">
    {children}
    <p className="mt-6 text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
      <Lock size={12} /> Secured by Infinite Future Bank
    </p>
  </div>
);

const StateCard = ({ tone = 'slate', Icon, title, children, action }) => {
  const tones = {
    slate: 'bg-slate-100 text-slate-500',
    red: 'bg-red-100 text-red-500',
    amber: 'bg-amber-100 text-amber-600',
    emerald: 'bg-emerald-100 text-emerald-600',
  };
  return (
    <Shell>
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-[2.5rem] shadow-xl p-8 text-center animate-in fade-in">
        <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 ${tones[tone]}`}><Icon size={32} /></div>
        <h2 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">{title}</h2>
        <div className="text-sm text-slate-500 font-medium">{children}</div>
        {action && <div className="mt-8">{action}</div>}
      </div>
    </Shell>
  );
};

// ------------------------------------------
// Order status (after returning from a provider: ?order=<id>)
// ------------------------------------------
function OrderStatusView({ slug, orderId }) {
  const [state, setState] = useState({ phase: 'loading', data: null, message: '' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer = null;
    const started = Date.now();

    const tick = async () => {
      const { data, error } = await callPaymentPages({ action: 'order_status', order_id: orderId });
      if (cancelled) return;
      if (error) {
        if (error.status === 404) { setState({ phase: 'notfound', data: null, message: error.message }); return; }
        // 429 / transient: keep polling until the deadline.
      } else if (data) {
        if (data.status === 'paid') { setState({ phase: 'paid', data, message: '' }); return; }
        if (data.status === 'failed' || data.status === 'expired') { setState({ phase: 'failed', data, message: '' }); return; }
        setState({ phase: 'pending', data, message: '' });
      }
      if (Date.now() - started >= POLL_MAX_MS) { setState((s) => ({ ...s, phase: 'timeout' })); return; }
      timer = setTimeout(tick, POLL_INTERVAL_MS);
    };
    setState({ phase: 'loading', data: null, message: '' });
    tick();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [orderId, attempt]);

  const backHref = `/p/${encodeURIComponent(slug)}`;
  const total = state.data ? formatCents(state.data.total_cents, state.data.currency) : null;

  if (state.phase === 'paid') {
    return (
      <StateCard tone="emerald" Icon={CheckCircle2} title="Payment Received">
        {total && <p className="text-3xl font-black text-emerald-700 mb-3">{total}</p>}
        <p className="whitespace-pre-line">{state.data?.success_message || 'Thank you! A receipt has been sent to your email.'}</p>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-6 break-all">Order {orderId}</p>
      </StateCard>
    );
  }
  if (state.phase === 'failed') {
    return (
      <StateCard tone="red" Icon={XCircle} title={state.data?.status === 'expired' ? 'Order Expired' : 'Payment Failed'}
        action={<a href={backHref} className="inline-block px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest">Try Again</a>}>
        Your payment was not completed and you have not been charged by IFB. You can start a new payment.
      </StateCard>
    );
  }
  if (state.phase === 'notfound') {
    return (
      <StateCard tone="red" Icon={AlertTriangle} title="Order Not Found"
        action={<a href={backHref} className="inline-block px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest">Back to Payment Page</a>}>
        We could not find this order.
      </StateCard>
    );
  }
  if (state.phase === 'timeout') {
    return (
      <StateCard tone="amber" Icon={Clock} title="Payment Pending"
        action={<button onClick={() => setAttempt((a) => a + 1)} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest inline-flex items-center gap-2"><RefreshCw size={14} /> Check Again</button>}>
        Your payment is still being confirmed by the provider. You will receive an email receipt once it clears. Please do not pay twice.
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-4 break-all">Order {orderId}</p>
      </StateCard>
    );
  }
  return (
    <StateCard tone="slate" Icon={Loader2} title="Confirming Payment">
      <div className="flex items-center justify-center gap-2 mb-2"><Loader2 size={16} className="animate-spin text-blue-500" /> Waiting for confirmation from the payment provider...</div>
      {total && <p className="font-black text-slate-700">{total}</p>}
      <p className="text-xs mt-3">This usually takes a few seconds. Please keep this page open.</p>
    </StateCard>
  );
}

// ------------------------------------------
// Stripe card step
// ------------------------------------------
function CardPaymentForm({ slug, orderId, totalLabel, email, onBack }) {
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
        return_url: `${window.location.origin}/p/${encodeURIComponent(slug)}?order=${encodeURIComponent(orderId)}`,
        receipt_email: email || undefined,
      },
    });
    // Only reached on immediate errors; success redirects to return_url.
    if (error) {
      setErrorMessage(error.message || 'Payment could not be completed.');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
      <button type="button" onClick={onBack} disabled={isProcessing} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 flex items-center gap-2 transition-colors">
        <ArrowLeft size={14} /> Change payment method
      </button>
      <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-2xl shadow-inner">
        <PaymentElement />
      </div>
      {errorMessage && (
        <div role="alert" className="p-4 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl text-center">{errorMessage}</div>
      )}
      <button disabled={isProcessing || !stripe || !elements} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-sm uppercase tracking-widest p-5 rounded-2xl shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
        {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <><Lock size={16} /> Pay {totalLabel}</>}
      </button>
    </form>
  );
}

// ------------------------------------------
// Main page
// ------------------------------------------
function PaymentPageForm({ slug, session }) {
  const [loadState, setLoadState] = useState({ phase: 'loading', status: 0, message: '' });
  const [page, setPage] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [name, setName] = useState('');
  const [email, setEmail] = useState(session?.user?.email || '');
  const [values, setValues] = useState({});
  const [amount, setAmount] = useState('');

  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState('');
  const [isQuoting, setIsQuoting] = useState(false);
  const quoteSeq = useRef(0);

  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [paystackAvailable, setPaystackAvailable] = useState(true);
  const [busyMethod, setBusyMethod] = useState(null);
  const [checkoutError, setCheckoutError] = useState('');
  const [cardStep, setCardStep] = useState(null); // { orderId, clientSecret, stripePromise }
  const [walletPaid, setWalletPaid] = useState(null); // { orderId }
  const formRef = useRef(null);

  // Load page definition
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadState({ phase: 'loading', status: 0, message: '' });
      const { data, error } = await callPaymentPages({ action: 'get_page', slug });
      if (cancelled) return;
      if (error || !data?.page) {
        setLoadState({ phase: 'error', status: error ? error.status : 404, message: error?.message || 'This payment link is not available.' });
        return;
      }
      const p = data.page;
      const fields = Array.isArray(p.fields) ? p.fields : [];
      setPage({ ...p, fields, pricing: p.pricing || { mode: 'fixed' } });
      setValues(initialAnswers(fields, p.pricing?.quantity_field));
      setLoadState({ phase: 'ready', status: 200, message: '' });
    })();
    return () => { cancelled = true; };
  }, [slug, reloadKey]);

  const isCustomerAmount = page?.pricing?.mode === 'customer_amount';
  const answers = useMemo(() => buildAnswers(page?.fields || [], values), [page, values]);
  const answersKey = JSON.stringify(answers);

  // amount_cents is the customer's own input (not a computed total); the server validates it.
  const amountCents = useMemo(() => {
    if (!isCustomerAmount) return undefined;
    const t = String(amount).trim();
    if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
    return Math.round(parseFloat(t) * 100);
  }, [amount, isCustomerAmount]);

  // Debounced server quote
  useEffect(() => {
    if (loadState.phase !== 'ready' || !page) return undefined;
    if (isCustomerAmount && amountCents == null) {
      quoteSeq.current += 1; // drop any in-flight quote
      setIsQuoting(false);
      setQuote(null);
      setQuoteError(String(amount).trim() ? 'Enter a valid amount (e.g. 25 or 25.50).' : '');
      return undefined;
    }
    const seq = ++quoteSeq.current;
    setIsQuoting(true);
    const t = setTimeout(async () => {
      const body = { action: 'quote', slug, answers: JSON.parse(answersKey) };
      if (isCustomerAmount) body.amount_cents = amountCents;
      const { data, error } = await callPaymentPages(body);
      if (seq !== quoteSeq.current) return;
      setIsQuoting(false);
      if (error) {
        setQuote(null);
        setQuoteError(error.status === 429 ? 'Too many price checks. Pausing for a moment...' : error.message);
      } else {
        setQuote(data);
        setQuoteError('');
      }
    }, 400);
    return () => clearTimeout(t);
  }, [answersKey, amountCents, amount, isCustomerAmount, loadState.phase, page, slug]);

  const onFieldChange = useCallback((id, v) => setValues((prev) => ({ ...prev, [id]: v })), []);

  const checkout = async (method) => {
    setCheckoutError('');
    if (formRef.current && !formRef.current.reportValidity()) return;
    if (!name.trim()) { setCheckoutError('Please enter your name.'); return; }
    if (!EMAIL_RE.test(email.trim())) { setCheckoutError('Please enter a valid email address.'); return; }
    if (isCustomerAmount && amountCents == null) { setCheckoutError('Please enter a valid amount.'); return; }
    if (TURNSTILE_SITE_KEY && !turnstileToken) { setCheckoutError('Please complete the security check.'); return; }
    if (method === 'wallet' && !session) { setCheckoutError('Sign in to pay with your IFB wallet.'); return; }

    setBusyMethod(method);
    const body = {
      action: 'checkout', slug, method,
      name: name.trim(), email: email.trim(),
      answers,
    };
    if (isCustomerAmount) body.amount_cents = amountCents;
    if (TURNSTILE_SITE_KEY) body.turnstile_token = turnstileToken;

    const { data, error } = await callPaymentPages(body);
    if (TURNSTILE_SITE_KEY) setTurnstileReset((n) => n + 1);

    if (error) {
      setBusyMethod(null);
      if (method === 'paystack' && /not available|not enabled|not configured/i.test(error.message)) {
        setPaystackAvailable(false);
        setCheckoutError('Paystack is not available for this page. Please choose another method.');
        return;
      }
      if (error.status === 404 || error.status === 409) { setCheckoutError(`This link can no longer accept payments. ${error.message}`); return; }
      if (error.status === 429) { setCheckoutError('Too many attempts. Please wait a minute and try again.'); return; }
      if (error.status === 401 && method === 'wallet') { setCheckoutError('Your session expired. Sign in again to pay with your wallet.'); return; }
      setCheckoutError(error.message);
      return;
    }

    if (method === 'card') {
      const pk = data?.publishable_key;
      if (!data?.client_secret || !data?.order_id || typeof pk !== 'string' || !pk.startsWith('pk_')) {
        setBusyMethod(null);
        setCheckoutError('Card payments are unavailable right now. Please try another method.');
        return;
      }
      setCardStep({ orderId: data.order_id, clientSecret: data.client_secret, stripePromise: loadStripe(pk) });
      setBusyMethod(null);
      return;
    }

    if (method === 'mobile_money' || method === 'paystack') {
      if (!isAllowedProviderUrl(data?.redirect_url, method)) {
        setBusyMethod(null);
        setCheckoutError('Received an unexpected payment redirect. Payment was not started.');
        return;
      }
      window.location.assign(data.redirect_url);
      return; // keep the spinner while navigating away
    }

    if (method === 'wallet') {
      setBusyMethod(null);
      if (data?.status === 'paid') setWalletPaid({ orderId: data.order_id });
      else setCheckoutError('Wallet payment was not completed.');
    }
  };

  // ---------- Render states ----------
  if (loadState.phase === 'loading') {
    return <div className="h-screen w-full flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-500" size={40} /></div>;
  }

  if (loadState.phase === 'error') {
    if (loadState.status === 429) {
      return (
        <StateCard tone="amber" Icon={Clock} title="Slow Down"
          action={<button onClick={() => setReloadKey((k) => k + 1)} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest inline-flex items-center gap-2"><RefreshCw size={14} /> Retry</button>}>
          Too many requests from your network. Please wait a moment and try again.
        </StateCard>
      );
    }
    if (loadState.status === 404 || loadState.status === 409 || loadState.status === 400) {
      return (
        <StateCard tone="red" Icon={Link2Off} title="Link Unavailable"
          action={<a href="/" className="inline-block px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest">Return Home</a>}>
          This payment link is inactive, has expired, or has already been used. Please contact the merchant for a new link.
        </StateCard>
      );
    }
    return (
      <StateCard tone="red" Icon={AlertTriangle} title="Something Went Wrong"
        action={<button onClick={() => setReloadKey((k) => k + 1)} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest inline-flex items-center gap-2"><RefreshCw size={14} /> Retry</button>}>
        {loadState.message || 'We could not load this payment page.'}
      </StateCard>
    );
  }

  if (walletPaid) {
    return (
      <StateCard tone="emerald" Icon={CheckCircle2} title="Payment Complete">
        {quote && <p className="text-3xl font-black text-emerald-700 mb-3">{formatCents(quote.total_cents, quote.currency)}</p>}
        <p className="whitespace-pre-line">{page.success_message || 'Thank you! Your payment was sent from your IFB wallet.'}</p>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-6 break-all">Order {walletPaid.orderId}</p>
      </StateCard>
    );
  }

  const logo = safeHttpsUrl(page.logo_url);
  const currency = quote?.currency || page.currency || 'USD';
  const totalLabel = quote ? formatCents(quote.total_cents, currency) : '';
  const busy = busyMethod !== null;
  const canPay = !!quote && !isQuoting && !busy;
  const ca = page.pricing?.customer_amount;

  return (
    <Shell>
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-[2.5rem] shadow-xl overflow-hidden animate-in slide-in-from-bottom-8">
        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-slate-100 text-center">
          {logo && (
            <img src={logo} alt="" referrerPolicy="no-referrer" className="w-16 h-16 rounded-2xl object-cover mx-auto mb-4 border border-slate-100 bg-slate-50"
              onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          )}
          {page.merchant_name && <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2">{page.merchant_name}</p>}
          <h1 className="text-2xl font-black text-slate-800 tracking-tight break-words">{page.title}</h1>
          {page.description && <p className="text-sm text-slate-500 font-medium mt-3 whitespace-pre-line break-words">{page.description}</p>}
        </div>

        <div className="p-6 sm:p-8">
          {cardStep ? (
            <Elements stripe={cardStep.stripePromise} options={{ clientSecret: cardStep.clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#2563EB', borderRadius: '12px' } } }}>
              <div className="mb-5 flex justify-between items-center bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total</span>
                <span className="text-xl font-black text-slate-900">{totalLabel}</span>
              </div>
              <CardPaymentForm slug={slug} orderId={cardStep.orderId} totalLabel={totalLabel} email={email.trim()} onBack={() => setCardStep(null)} />
            </Elements>
          ) : (
            <form ref={formRef} onSubmit={(e) => e.preventDefault()} noValidate={false} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="pp-name" className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Full name<span className="text-red-500 ml-1">*</span></label>
                  <input id="pp-name" required maxLength={120} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} disabled={busy} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="pp-email" className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Email<span className="text-red-500 ml-1">*</span></label>
                  <input id="pp-email" type="email" required maxLength={254} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} className={inputCls} />
                </div>
              </div>

              <PaymentFormRenderer fields={page.fields} values={values} onChange={onFieldChange} disabled={busy} idPrefix="pp" currency={currency} />

              {isCustomerAmount && (
                <div>
                  <label htmlFor="pp-amount" className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Amount ({page.currency || 'USD'})<span className="text-red-500 ml-1">*</span></label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">$</span>
                    <input id="pp-amount" type="text" inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value)} disabled={busy} placeholder="0.00" className={`${inputCls} pl-9 text-lg`} />
                  </div>
                  {ca && <p className="text-[11px] text-slate-400 font-medium mt-1.5">Between {formatCents(ca.min_cents, currency)} and {formatCents(ca.max_cents, currency)}</p>}
                </div>
              )}

              {/* Server quote (display only) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4" aria-live="polite">
                {quote ? (
                  <div className={`space-y-2 transition-opacity ${isQuoting ? 'opacity-50' : ''}`}>
                    {(quote.line_items || []).map((li, i) => (
                      <div key={i} className="flex justify-between gap-3 text-xs font-bold text-slate-600">
                        <span className="break-words">{li.label}{li.quantity > 1 ? ` x ${li.quantity}` : ''}</span>
                        <span className="shrink-0">{formatCents(li.total_cents, currency)}</span>
                      </div>
                    ))}
                    {/* A customer-paid fee already arrives as a "Processing fee" line item from the server */}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total</span>
                      <span className="text-2xl font-black text-slate-900">{totalLabel}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs font-bold text-slate-400 flex items-center gap-2 min-h-[24px]">
                    {isQuoting ? <><Loader2 size={14} className="animate-spin" /> Calculating total...</> : (quoteError || 'Complete the form to see your total.')}
                  </div>
                )}
              </div>

              {TURNSTILE_SITE_KEY && <TurnstileWidget siteKey={TURNSTILE_SITE_KEY} onToken={setTurnstileToken} resetKey={turnstileReset} />}

              {checkoutError && (
                <div role="alert" className="p-4 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl text-center">{checkoutError}</div>
              )}

              {/* Payment methods */}
              <div className="space-y-3">
                <button type="button" onClick={() => checkout('card')} disabled={!canPay}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest p-5 rounded-2xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]">
                  {busyMethod === 'card' ? <Loader2 size={18} className="animate-spin" /> : <><CreditCard size={18} /> Pay {totalLabel} with Card</>}
                </button>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button type="button" onClick={() => checkout('mobile_money')} disabled={!canPay}
                    className="w-full bg-white border-2 border-slate-200 hover:border-orange-400 text-slate-800 font-black text-[10px] uppercase tracking-widest p-4 rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {busyMethod === 'mobile_money' ? <Loader2 size={16} className="animate-spin" /> : <><Smartphone size={16} className="text-orange-500" /> Mobile Money</>}
                  </button>
                  {paystackAvailable && (
                    <button type="button" onClick={() => checkout('paystack')} disabled={!canPay}
                      className="w-full bg-white border-2 border-slate-200 hover:border-sky-400 text-slate-800 font-black text-[10px] uppercase tracking-widest p-4 rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                      {busyMethod === 'paystack' ? <Loader2 size={16} className="animate-spin" /> : <><Landmark size={16} className="text-sky-500" /> Paystack</>}
                    </button>
                  )}
                </div>
                {session && (
                  <button type="button" onClick={() => checkout('wallet')} disabled={!canPay}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest p-4 rounded-2xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {busyMethod === 'wallet' ? <Loader2 size={16} className="animate-spin" /> : <><Wallet size={16} /> Pay with IFB Wallet</>}
                  </button>
                )}
              </div>

              <p className="text-[10px] text-slate-400 font-bold text-center flex items-center justify-center gap-1.5">
                <ShieldCheck size={12} /> The final amount is calculated and verified by IFB at checkout.
              </p>
            </form>
          )}
        </div>
      </div>
    </Shell>
  );
}

export default function PublicPaymentPage({ session }) {
  const { slug: rawSlug } = useParams();
  const slug = String(rawSlug || '').toLowerCase();
  const orderId = new URLSearchParams(window.location.search).get('order');

  if (!SLUG_RE.test(slug)) {
    return (
      <StateCard tone="red" Icon={Link2Off} title="Link Unavailable"
        action={<a href="/" className="inline-block px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest">Return Home</a>}>
        This payment link is not valid. Please check the address and try again.
      </StateCard>
    );
  }
  if (orderId) {
    if (!ORDER_ID_RE.test(orderId)) {
      return <StateCard tone="red" Icon={AlertTriangle} title="Order Not Found">The order reference in this link is not valid.</StateCard>;
    }
    return <OrderStatusView slug={slug} orderId={orderId} />;
  }
  return <PaymentPageForm slug={slug} session={session} />;
}
