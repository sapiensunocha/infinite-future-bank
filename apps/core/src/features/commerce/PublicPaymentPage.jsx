import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import {
  ArrowLeft, ShieldCheck, Loader2, CheckCircle2, XCircle, Clock, CreditCard,
  Smartphone, Wallet, Landmark, AlertTriangle, Link2Off, RefreshCw, Lock, BadgeCheck, Check
} from 'lucide-react';
import PaymentFormRenderer, { inputCls, FieldLabel } from './PaymentFormRenderer';
import {
  callPaymentPages, formatCents, safeHttpsUrl, initialAnswers, buildAnswers,
  safeBrandColor, onBrandColor, initialsOf, DEFAULT_BRAND,
} from './paymentPagesApi';

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
const Shell = ({ children, brand = DEFAULT_BRAND }) => (
  <div className="min-h-screen w-full bg-slate-100 flex flex-col items-center" style={{ '--brand': safeBrandColor(brand) }}>
    {children}
    <footer className="mt-auto w-full py-6 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
      <Lock size={12} /> Secure checkout by Infinite Future Bank
    </footer>
  </div>
);

const primaryBtn =
  'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-[15px] transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed';

const StateCard = ({ tone = 'slate', Icon, title, children, action }) => {
  const tones = {
    slate: 'bg-slate-100 text-slate-500',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  };
  return (
    <Shell>
      <div className="w-full max-w-md mx-4 mt-10 sm:mt-20 bg-white border border-slate-200 rounded-3xl shadow-sm p-8 text-center animate-in fade-in">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 ${tones[tone]}`}><Icon size={30} /></div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{title}</h2>
        <div className="text-[15px] text-slate-600 leading-relaxed">{children}</div>
        {action && <div className="mt-7">{action}</div>}
      </div>
    </Shell>
  );
};

const darkBtn = `${primaryBtn} bg-slate-900 hover:bg-slate-800 text-white`;

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
      <StateCard tone="emerald" Icon={CheckCircle2} title="Payment received">
        {total && <p className="text-3xl font-black text-emerald-700 mb-3">{total}</p>}
        <p className="whitespace-pre-line">{state.data?.success_message || 'Thank you! A receipt has been sent to your email.'}</p>
        <p className="text-xs text-slate-400 mt-6 break-all">Order reference: {orderId}</p>
      </StateCard>
    );
  }
  if (state.phase === 'failed') {
    return (
      <StateCard tone="red" Icon={XCircle} title={state.data?.status === 'expired' ? 'Order expired' : 'Payment failed'}
        action={<a href={backHref} className={darkBtn}>Try Again</a>}>
        Your payment was not completed and you have not been charged by IFB. You can start a new payment.
      </StateCard>
    );
  }
  if (state.phase === 'notfound') {
    return (
      <StateCard tone="red" Icon={AlertTriangle} title="Order not found"
        action={<a href={backHref} className={darkBtn}>Back to payment page</a>}>
        We could not find this order.
      </StateCard>
    );
  }
  if (state.phase === 'timeout') {
    return (
      <StateCard tone="amber" Icon={Clock} title="Payment pending"
        action={<button onClick={() => setAttempt((a) => a + 1)} className={darkBtn}><RefreshCw size={14} /> Check again</button>}>
        Your payment is still being confirmed by the provider. You will receive an email receipt once it clears. Please do not pay twice.
        <p className="text-xs text-slate-400 mt-4 break-all">Order reference: {orderId}</p>
      </StateCard>
    );
  }
  return (
    <StateCard tone="slate" Icon={Loader2} title="Confirming payment">
      <div className="flex items-center justify-center gap-2 mb-2"><Loader2 size={16} className="animate-spin text-blue-500" /> Waiting for confirmation from the payment provider...</div>
      {total && <p className="font-semibold text-slate-800">{total}</p>}
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
      <button type="button" onClick={onBack} disabled={isProcessing} className="text-sm font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1.5 transition-colors">
        <ArrowLeft size={14} /> Change payment method
      </button>
      <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-2xl">
        <PaymentElement />
      </div>
      {errorMessage && (
        <div role="alert" className="p-3.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">{errorMessage}</div>
      )}
      <button disabled={isProcessing || !stripe || !elements} className={`${primaryBtn} w-full py-4 bg-[var(--brand)] hover:brightness-95 text-[var(--on-brand)]`}>
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
  const [method, setMethod] = useState('card');
  const formRef = useRef(null);
  const summaryRef = useRef(null);

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
        <StateCard tone="amber" Icon={Clock} title="Please slow down"
          action={<button onClick={() => setReloadKey((k) => k + 1)} className={darkBtn}><RefreshCw size={14} /> Retry</button>}>
          Too many requests from your network. Please wait a moment and try again.
        </StateCard>
      );
    }
    if (loadState.status === 404 || loadState.status === 409 || loadState.status === 400) {
      return (
        <StateCard tone="red" Icon={Link2Off} title="Link unavailable"
          action={<a href="/" className={darkBtn}>Return home</a>}>
          This payment link is inactive, has expired, or has already been used. Please contact the merchant for a new link.
        </StateCard>
      );
    }
    return (
      <StateCard tone="red" Icon={AlertTriangle} title="Something went wrong"
        action={<button onClick={() => setReloadKey((k) => k + 1)} className={darkBtn}><RefreshCw size={14} /> Retry</button>}>
        {loadState.message || 'We could not load this payment page.'}
      </StateCard>
    );
  }

  if (walletPaid) {
    return (
      <StateCard tone="emerald" Icon={CheckCircle2} title="Payment complete">
        {quote && <p className="text-3xl font-black text-emerald-700 mb-3">{formatCents(quote.total_cents, quote.currency)}</p>}
        <p className="whitespace-pre-line">{page.success_message || 'Thank you! Your payment was sent from your IFB wallet.'}</p>
        <p className="text-xs text-slate-400 mt-6 break-all">Order reference: {walletPaid.orderId}</p>
      </StateCard>
    );
  }

  const logo = safeHttpsUrl(page.logo_url);
  const brand = safeBrandColor(page.brand_color);
  const onBrand = onBrandColor(brand);
  const currency = quote?.currency || page.currency || 'USD';
  const totalLabel = quote ? formatCents(quote.total_cents, currency) : '';
  const busy = busyMethod !== null;
  const canPay = !!quote && !isQuoting && !busy;
  const ca = page.pricing?.customer_amount;

  const methods = [
    { id: 'card', Icon: CreditCard, label: 'Card', hint: 'Visa, Mastercard, Apple Pay, Google Pay' },
    { id: 'mobile_money', Icon: Smartphone, label: 'Mobile money', hint: 'MTN, M-Pesa, Airtel, Orange and more' },
    ...(paystackAvailable ? [{ id: 'paystack', Icon: Landmark, label: 'Paystack', hint: 'Card, bank transfer or USSD' }] : []),
    ...(session ? [{ id: 'wallet', Icon: Wallet, label: 'IFB wallet', hint: 'Pay from your IFB balance' }] : []),
  ];
  const activeMethod = methods.some((m) => m.id === method) ? method : 'card';

  const section = 'bg-white border border-slate-200 rounded-2xl p-5 sm:p-6';
  const sectionTitle = 'text-base font-bold text-slate-900 mb-4';

  return (
    <Shell brand={brand}>
      <div className="w-full" style={{ '--on-brand': onBrand }}>
        {/* Branded header */}
        <div className="w-full h-28 sm:h-36" style={{ background: `linear-gradient(135deg, ${brand}, color-mix(in srgb, ${brand} 70%, #0f172a))` }} />
        <div className="max-w-5xl mx-auto px-4 -mt-10 sm:-mt-12">
          <div className="flex items-end gap-4 mb-6">
            {logo ? (
              <img src={logo} alt="" referrerPolicy="no-referrer"
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-4 border-white bg-white shadow-sm"
                onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-white shadow-sm flex items-center justify-center text-2xl font-bold"
                style={{ background: brand, color: onBrand }} aria-hidden="true">
                {initialsOf(page.merchant_name || page.title)}
              </div>
            )}
            {page.merchant_name && (
              <div className="pb-1 min-w-0">
                <p className="text-[15px] font-semibold text-slate-900 truncate">{page.merchant_name}</p>
                <p className="text-xs font-medium text-emerald-700 flex items-center gap-1"><BadgeCheck size={14} /> Verified business</p>
              </div>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 break-words">{page.title}</h1>
          {page.description && <p className="text-[15px] text-slate-600 mt-2 max-w-2xl whitespace-pre-line break-words">{page.description}</p>}
        </div>

        <div className="max-w-5xl mx-auto px-4 py-6 pb-28 lg:pb-10">
          {cardStep ? (
            <div className="max-w-lg">
              <Elements stripe={cardStep.stripePromise} options={{ clientSecret: cardStep.clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: brand, borderRadius: '12px' } } }}>
                <div className={section}>
                  <div className="mb-5 flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-500">Total to pay</span>
                    <span className="text-2xl font-bold text-slate-900">{totalLabel}</span>
                  </div>
                  <CardPaymentForm slug={slug} orderId={cardStep.orderId} totalLabel={totalLabel} email={email.trim()} onBack={() => setCardStep(null)} />
                </div>
              </Elements>
            </div>
          ) : (
            <form ref={formRef} onSubmit={(e) => e.preventDefault()} noValidate={false}
              className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
              {/* Left: the form */}
              <div className="space-y-6">
                <section className={section}>
                  <h2 className={sectionTitle}>Your details</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <FieldLabel htmlFor="pp-name" label="Full name" required />
                      <input id="pp-name" required maxLength={120} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} disabled={busy} className={inputCls} />
                    </div>
                    <div>
                      <FieldLabel htmlFor="pp-email" label="Email" required />
                      <input id="pp-email" type="email" required maxLength={254} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} className={inputCls} />
                      <p className="text-[13px] text-slate-500 mt-1.5">Your receipt will be sent here.</p>
                    </div>
                  </div>
                </section>

                {(page.fields.length > 0 || isCustomerAmount) && (
                  <section className={section}>
                    <h2 className={sectionTitle}>{isCustomerAmount && !page.fields.length ? 'Amount' : 'Details'}</h2>
                    <div className="space-y-5">
                      <PaymentFormRenderer fields={page.fields} values={values} onChange={onFieldChange} disabled={busy} idPrefix="pp" currency={currency} />
                      {isCustomerAmount && (
                        <div>
                          <FieldLabel htmlFor="pp-amount" label={`Amount (${page.currency || 'USD'})`} required />
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-slate-400">$</span>
                            <input id="pp-amount" type="text" inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value)} disabled={busy} placeholder="0.00" className={`${inputCls} pl-9 text-lg font-semibold`} />
                          </div>
                          {ca && <p className="text-[13px] text-slate-500 mt-1.5">Between {formatCents(ca.min_cents, currency)} and {formatCents(ca.max_cents, currency)}</p>}
                        </div>
                      )}
                    </div>
                  </section>
                )}
              </div>

              {/* Right: summary + payment (sticky on desktop) */}
              <aside ref={summaryRef} className="lg:sticky lg:top-6 space-y-4">
                <section className={section} aria-live="polite">
                  <h2 className={sectionTitle}>Order summary</h2>
                  {quote ? (
                    <div className={`space-y-2.5 transition-opacity ${isQuoting ? 'opacity-50' : ''}`}>
                      {(quote.line_items || []).map((li, i) => (
                        <div key={i} className="flex justify-between gap-3 text-sm text-slate-600">
                          <span className="break-words">{li.label}{li.quantity > 1 ? ` × ${li.quantity}` : ''}</span>
                          <span className="shrink-0 font-medium text-slate-800">{formatCents(li.total_cents, currency)}</span>
                        </div>
                      ))}
                      {/* A customer-paid fee already arrives as a "Processing fee" line item from the server */}
                      <div className="flex justify-between items-baseline pt-3 mt-1 border-t border-slate-200">
                        <span className="text-sm font-semibold text-slate-700">Total</span>
                        <span className="text-2xl font-bold text-slate-900">{totalLabel}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 flex items-center gap-2 min-h-[24px]">
                      {isQuoting ? <><Loader2 size={15} className="animate-spin" /> Calculating your total…</> : (quoteError || 'Fill in the form to see your total.')}
                    </p>
                  )}
                </section>

                <section className={section}>
                  <h2 className={sectionTitle}>Pay with</h2>
                  <div className="space-y-2.5" role="radiogroup" aria-label="Payment method">
                    {methods.map(({ id, Icon, label, hint }) => {
                      const selected = activeMethod === id;
                      return (
                        <button key={id} type="button" role="radio" aria-checked={selected} disabled={busy}
                          onClick={() => setMethod(id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition ${
                            selected ? 'border-[var(--brand)] bg-[color-mix(in_srgb,var(--brand)_6%,white)]' : 'border-slate-200 hover:border-slate-300'
                          }`}>
                          <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${selected ? 'bg-[var(--brand)] text-[var(--on-brand)]' : 'bg-slate-100 text-slate-500'}`}><Icon size={18} /></span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[15px] font-semibold text-slate-900">{label}</span>
                            <span className="block text-xs text-slate-500 truncate">{hint}</span>
                          </span>
                          {selected && <Check size={18} className="text-[var(--brand)] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {TURNSTILE_SITE_KEY && <div className="mt-4"><TurnstileWidget siteKey={TURNSTILE_SITE_KEY} onToken={setTurnstileToken} resetKey={turnstileReset} /></div>}

                  {checkoutError && (
                    <div role="alert" className="mt-4 p-3.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">{checkoutError}</div>
                  )}

                  <button type="button" onClick={() => checkout(activeMethod)} disabled={!canPay}
                    className={`${primaryBtn} w-full mt-4 py-4 bg-[var(--brand)] hover:brightness-95 text-[var(--on-brand)] shadow-sm`}>
                    {busy ? <Loader2 size={18} className="animate-spin" /> : <><Lock size={16} /> {totalLabel ? `Pay ${totalLabel}` : 'Pay'}</>}
                  </button>
                  <p className="text-xs text-slate-500 text-center mt-3 flex items-center justify-center gap-1.5">
                    <ShieldCheck size={13} /> The amount is checked and confirmed by IFB before you pay.
                  </p>
                </section>
              </aside>

              {/* Mobile: total + pay bar */}
              <div className="lg:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-slate-200 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-3 shadow-[0_-4px_16px_rgba(15,23,42,0.06)]">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500">Total</p>
                  <p className="text-lg font-bold text-slate-900 truncate">{totalLabel || '—'}</p>
                </div>
                <button type="button" onClick={() => summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className={`${primaryBtn} bg-[var(--brand)] text-[var(--on-brand)]`}>
                  Review &amp; pay
                </button>
              </div>
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
      <StateCard tone="red" Icon={Link2Off} title="Link unavailable"
        action={<a href="/" className={darkBtn}>Return home</a>}>
        This payment link is not valid. Please check the address and try again.
      </StateCard>
    );
  }
  if (orderId) {
    if (!ORDER_ID_RE.test(orderId)) {
      return <StateCard tone="red" Icon={AlertTriangle} title="Order not found">The order reference in this link is not valid.</StateCard>;
    }
    return <OrderStatusView slug={slug} orderId={orderId} />;
  }
  return <PaymentPageForm slug={slug} session={session} />;
}
