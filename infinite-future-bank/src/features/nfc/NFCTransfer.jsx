import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabaseClient';
import QRCode from 'react-qr-code';
import {
  Wifi, Send, QrCode, CheckCircle2, AlertTriangle,
  Loader2, UserPlus, Copy, Check, ArrowLeft, RefreshCw,
  Smartphone, Signal, CreditCard, ExternalLink
} from 'lucide-react';

const fmtUSD = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

// ── NFC write helper (Android Web NFC API) ────────────────────────────────────
async function writeNFCToken(token) {
  if (!('NDEFReader' in window)) return false;
  try {
    const ndef = new window.NDEFReader();
    await ndef.write({ records: [{ recordType: 'text', data: `IFB:${token}` }] });
    return true;
  } catch { return false; }
}

async function writeNFCUrl(url) {
  if (!('NDEFReader' in window)) return false;
  try {
    const ndef = new window.NDEFReader();
    await ndef.write({ records: [{ recordType: 'url', data: url }] });
    return true;
  } catch { return false; }
}

// ── NFC scan helper (Android Web NFC API) ─────────────────────────────────────
function startNFCScan(onToken, onError) {
  if (!('NDEFReader' in window)) { onError('NFC not supported on this device'); return null; }
  const ndef = new window.NDEFReader();
  ndef.scan().then(() => {
    ndef.onreading = (event) => {
      for (const record of event.message.records) {
        if (record.recordType === 'text') {
          const decoder = new TextDecoder();
          const text = decoder.decode(record.data);
          if (text.startsWith('IFB:')) {
            onToken(text.replace('IFB:', '').trim());
          }
        }
      }
    };
    ndef.onreadingerror = () => onError('NFC read failed — hold phones closer');
  }).catch(onError);
  return ndef;
}

export default function NFCTransfer({ session, balances, profile, onClose, onSuccess }) {
  const [mode, setMode]           = useState(null);         // null | 'send' | 'receive'
  const [step, setStep]           = useState(1);
  const [amount, setAmount]       = useState('');
  const [note, setNote]           = useState('');
  const [token, setToken]         = useState(null);
  const [manualToken, setManualToken] = useState('');
  const [loading, setLoading]     = useState(false);
  const [nfcWriting, setNfcWriting] = useState(false);
  const [nfcScanning, setNfcScanning] = useState(false);
  const [copied, setCopied]       = useState(false);
  const [result, setResult]       = useState(null);
  const [err, setErr]             = useState(null);
  const [inputMethod, setInputMethod] = useState('nfc'); // 'nfc' | 'code' | 'qr'
  const [contactAdded, setContactAdded] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const nfcRef    = useRef(null);
  const pollRef   = useRef(null);
  const liquid    = balances?.liquid_usd || 0;
  const nfcSupported = 'NDEFReader' in window;

  // ── Auto-poll for claim once token is shared ─────────────────────────────────
  useEffect(() => {
    if (mode === 'send' && step === 3 && token) {
      pollRef.current = setInterval(async () => {
        const { data } = await supabase
          .from('nfc_transfer_requests')
          .select('status, receiver_id')
          .eq('token', token)
          .single();
        if (data?.status === 'completed') {
          clearInterval(pollRef.current);
          setResult({ auto: true, amount: parseFloat(amount), receiver_id: data.receiver_id });
          setStep(4);
          if (onSuccess) onSuccess();
        }
        if (data?.status === 'expired') {
          clearInterval(pollRef.current);
          setErr('Transfer expired. Create a new one.');
          setStep(2);
        }
      }, 2000);
    }
    return () => clearInterval(pollRef.current);
  }, [mode, step, token]);

  // ── Cleanup NFC on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (nfcRef.current) nfcRef.current = null;
      clearInterval(pollRef.current);
    };
  }, []);

  // ── Create transfer token ─────────────────────────────────────────────────────
  const handleCreateTransfer = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || amt > liquid) return;
    setLoading(true); setErr(null);
    try {
      const { data, error } = await supabase.rpc('create_nfc_transfer', {
        p_amount: amt,
        p_note:   note || null,
      });
      if (error) throw error;
      setToken(data.token);
      setStep(3);
      // Attempt NFC write on Android
      if (nfcSupported) {
        setNfcWriting(true);
        await writeNFCToken(data.token);
        setNfcWriting(false);
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Claim transfer ────────────────────────────────────────────────────────────
  const handleClaim = async (claimToken) => {
    const t = (claimToken || manualToken).toUpperCase().trim();
    if (!t) return;
    setLoading(true); setErr(null);
    try {
      const { data, error } = await supabase.rpc('claim_nfc_transfer', { p_token: t });
      if (error) throw error;
      setResult(data);
      setStep(4);
      if (onSuccess) onSuccess();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Start NFC scan (receive mode) ─────────────────────────────────────────────
  const startScan = () => {
    setNfcScanning(true); setErr(null);
    nfcRef.current = startNFCScan(
      (scannedToken) => { setNfcScanning(false); handleClaim(scannedToken); },
      (e)            => { setNfcScanning(false); setErr(typeof e === 'string' ? e : 'NFC scan failed'); }
    );
  };

  // ── Add contact ───────────────────────────────────────────────────────────────
  const handleAddContact = async () => {
    if (!result?.sender_id && !result?.receiver_id) return;
    const contactId = mode === 'receive' ? result.sender_id : result.receiver_id;
    if (!contactId) return;
    try {
      await supabase.rpc('add_contact', { p_contact_id: contactId, p_via: 'nfc' });
      setContactAdded(true);
    } catch (e) { setErr(e.message); }
  };

  const copyToken = () => {
    navigator.clipboard.writeText(token).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Create Stripe Checkout for card receive ───────────────────────────────────
  const handleCreateCheckout = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    setCheckoutLoading(true); setErr(null);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-nfc-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ amount: amt, note: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create payment link');
      setCheckoutUrl(data.url);
      setStep(3);
      // Write the Stripe URL to NFC tag so payer can tap
      if (nfcSupported) {
        setNfcWriting(true);
        await writeNFCUrl(data.url);
        setNfcWriting(false);
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const reset = () => {
    setMode(null); setStep(1); setAmount(''); setNote(''); setToken(null);
    setManualToken(''); setResult(null); setErr(null); setContactAdded(false);
    setNfcScanning(false); setNfcWriting(false); setCheckoutUrl(null);
    clearInterval(pollRef.current);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-sm mx-auto">

      {/* Header */}
      <div className="flex items-center gap-4">
        {mode && step < 4 && (
          <button onClick={reset} className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 transition-colors">
            <ArrowLeft size={16}/>
          </button>
        )}
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-xl bg-violet-900/40 border border-violet-700/40 flex items-center justify-center">
            <Wifi size={18} className="text-violet-400"/>
          </div>
          <div>
            <h2 className="text-lg font-black text-white">NFC Tap & Pay</h2>
            <p className="text-[10px] text-slate-400">Tap phones · Send money instantly</p>
          </div>
        </div>
        {nfcSupported
          ? <span className="flex items-center gap-1 px-2 py-1 bg-emerald-900/30 border border-emerald-700/30 rounded-full text-[9px] font-black text-emerald-400 uppercase tracking-widest"><Signal size={9}/>NFC Ready</span>
          : <span className="flex items-center gap-1 px-2 py-1 bg-amber-900/30 border border-amber-700/30 rounded-full text-[9px] font-black text-amber-400 uppercase tracking-widest">Code Mode</span>
        }
      </div>

      {/* ── MODE SELECT ─────────────────────────────────────────────────────────── */}
      {!mode && (
        <div className="space-y-3 animate-in fade-in">
          <p className="text-sm text-slate-400 text-center">What would you like to do?</p>
          <button onClick={() => { setMode('send'); setStep(2); }}
            className="w-full p-5 rounded-2xl border border-slate-700 bg-slate-800/40 hover:border-violet-500 hover:bg-violet-900/10 text-left flex items-center gap-4 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-violet-900/40 border border-violet-700/40 flex items-center justify-center group-hover:bg-violet-600/30 transition-colors">
              <Send size={20} className="text-violet-400"/>
            </div>
            <div>
              <p className="font-black text-white">Send Money</p>
              <p className="text-xs text-slate-400 mt-0.5">IFB-to-IFB · tap phones · share code</p>
            </div>
          </button>
          <button onClick={() => { setMode('receive'); setStep(2); }}
            className="w-full p-5 rounded-2xl border border-slate-700 bg-slate-800/40 hover:border-emerald-500 hover:bg-emerald-900/10 text-left flex items-center gap-4 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-emerald-900/40 border border-emerald-700/40 flex items-center justify-center group-hover:bg-emerald-600/30 transition-colors">
              <Wifi size={20} className="text-emerald-400"/>
            </div>
            <div>
              <p className="font-black text-white">Receive from IFB</p>
              <p className="text-xs text-slate-400 mt-0.5">Tap phones · scan QR · enter code</p>
            </div>
          </button>
          <button onClick={() => { setMode('card'); setStep(2); }}
            className="w-full p-5 rounded-2xl border border-slate-700 bg-slate-800/40 hover:border-blue-500 hover:bg-blue-900/10 text-left flex items-center gap-4 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-blue-900/40 border border-blue-700/40 flex items-center justify-center group-hover:bg-blue-600/30 transition-colors">
              <CreditCard size={20} className="text-blue-400"/>
            </div>
            <div>
              <p className="font-black text-white">Get Paid by Card</p>
              <p className="text-xs text-slate-400 mt-0.5">Visa · Mastercard · Apple Pay · Google Pay</p>
            </div>
          </button>
        </div>
      )}

      {/* Error */}
      {err && (
        <div className="bg-red-950/40 border border-red-800/40 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in">
          <AlertTriangle size={16} className="text-red-400 shrink-0"/>
          <p className="text-sm text-red-300 font-bold flex-1">{err}</p>
          <button onClick={() => setErr(null)} className="text-slate-500 hover:text-slate-300 text-xs">✕</button>
        </div>
      )}

      {/* ── SEND: STEP 2 — Amount ───────────────────────────────────────────────── */}
      {mode === 'send' && step === 2 && (
        <div className="space-y-5 animate-in fade-in">
          <h3 className="font-black text-white text-base">How much to send?</h3>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xl">$</span>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0.00" min="0.01" step="0.01"
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-10 pr-4 py-4 text-2xl font-black text-white outline-none focus:border-violet-500 transition-colors text-center"/>
          </div>
          <p className="text-[10px] text-slate-500 text-center">Available: {fmtUSD(liquid)}</p>
          <div className="flex gap-2">
            {[10, 20, 50, 100].map(v => (
              <button key={v} onClick={() => setAmount(String(v))}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] font-black rounded-xl transition-all">
                ${v}
              </button>
            ))}
          </div>
          <input value={note} onChange={e => setNote(e.target.value)}
            placeholder="Add a note (optional)"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-white outline-none focus:border-violet-500 transition-colors placeholder-slate-600"/>
          <button onClick={handleCreateTransfer}
            disabled={loading || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > liquid}
            className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 text-white font-black rounded-2xl text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-900/30">
            {loading
              ? <><Loader2 size={16} className="animate-spin"/>Creating...</>
              : <><Zap size={16}/>Generate Transfer Code</>}
          </button>
        </div>
      )}

      {/* ── SEND: STEP 3 — Share Token ──────────────────────────────────────────── */}
      {mode === 'send' && step === 3 && token && (
        <div className="space-y-5 animate-in fade-in">
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-violet-400 mb-2">Transfer Code Ready</p>
            <p className="text-slate-400 text-xs">Share this with the recipient — 3 ways to do it</p>
          </div>

          {/* The token display */}
          <div className="bg-slate-900 border-2 border-violet-700/50 rounded-2xl p-6 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-900/10 to-indigo-900/10 pointer-events-none"/>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">6-digit code</p>
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-5xl font-black text-white tracking-[0.3em] font-mono">{token}</span>
            </div>
            <p className="text-violet-400 font-black text-sm">{fmtUSD(parseFloat(amount))}</p>
            {note && <p className="text-slate-500 text-xs mt-1">"{note}"</p>}
          </div>

          {/* Share options */}
          <div className="grid grid-cols-3 gap-3">
            {/* NFC tap */}
            <button onClick={async () => {
              setNfcWriting(true);
              const ok = await writeNFCToken(token);
              setNfcWriting(false);
              if (!ok) setErr('NFC not available — use code or QR');
            }}
              className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                nfcSupported ? 'border-violet-700/50 bg-violet-900/20 hover:bg-violet-900/30 text-violet-400' : 'border-slate-700 bg-slate-800/30 text-slate-600 opacity-50 cursor-not-allowed'
              }`}
              disabled={!nfcSupported}>
              {nfcWriting ? <Loader2 size={20} className="animate-spin"/> : <Smartphone size={20}/>}
              <span className="text-[9px] font-black uppercase tracking-widest">Tap NFC</span>
            </button>
            {/* Copy code */}
            <button onClick={copyToken}
              className="p-4 rounded-2xl border border-slate-700 bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white flex flex-col items-center gap-2 transition-all">
              {copied ? <Check size={20} className="text-emerald-400"/> : <Copy size={20}/>}
              <span className="text-[9px] font-black uppercase tracking-widest">{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
            {/* QR placeholder */}
            <div className="p-4 rounded-2xl border border-slate-700 bg-slate-800/40 flex flex-col items-center gap-2 text-slate-500">
              <QrCode size={20}/>
              <span className="text-[9px] font-black uppercase tracking-widest">QR Code</span>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-800/40 rounded-2xl p-4 border border-slate-700/50">
            <Loader2 size={16} className="text-violet-400 animate-spin shrink-0"/>
            <p className="text-xs text-slate-400">Waiting for recipient to claim… Code expires in 10 minutes.</p>
          </div>

          <button onClick={reset}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 font-black rounded-2xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
            <RefreshCw size={12}/> Cancel & Create New
          </button>
        </div>
      )}

      {/* ── RECEIVE: STEP 2 — Scan or Enter ─────────────────────────────────────── */}
      {mode === 'receive' && step === 2 && (
        <div className="space-y-5 animate-in fade-in">
          <h3 className="font-black text-white text-base">Claim a Transfer</h3>

          {/* Method tabs */}
          <div className="flex gap-2 bg-slate-900 p-1 rounded-2xl">
            {[
              { id: 'nfc',  label: '📱 NFC Tap', disabled: !nfcSupported },
              { id: 'code', label: '🔢 Enter Code' },
            ].map(({ id, label, disabled }) => (
              <button key={id} onClick={() => !disabled && setInputMethod(id)}
                disabled={disabled}
                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  inputMethod === id ? 'bg-emerald-600 text-white' : disabled ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-white'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* NFC Scan */}
          {inputMethod === 'nfc' && (
            <div className="space-y-4">
              <div className={`rounded-3xl border-2 p-10 flex flex-col items-center gap-4 transition-all ${
                nfcScanning ? 'border-emerald-500 bg-emerald-900/10' : 'border-slate-700 bg-slate-800/20'
              }`}>
                <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                  nfcScanning ? 'bg-emerald-500/20 border-2 border-emerald-500' : 'bg-slate-700/40 border-2 border-slate-600'
                }`}>
                  <Wifi size={36} className={nfcScanning ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}/>
                </div>
                <div className="text-center">
                  <p className="font-black text-white">{nfcScanning ? 'Hold phones back-to-back…' : 'Ready to scan'}</p>
                  <p className="text-xs text-slate-500 mt-1">{nfcScanning ? 'Keep phones close until transfer completes' : 'Tap the button below, then touch phones'}</p>
                </div>
              </div>
              <button onClick={nfcScanning ? () => { setNfcScanning(false); } : startScan}
                className={`w-full py-4 font-black rounded-2xl text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                  nfcScanning
                    ? 'bg-red-900/40 border border-red-700/50 text-red-400 hover:bg-red-900/60'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-900/30'
                }`}>
                {nfcScanning ? <><Loader2 size={16} className="animate-spin"/>Scanning — tap to cancel</> : <><Wifi size={16}/>Start NFC Scan</>}
              </button>
            </div>
          )}

          {/* Manual code entry */}
          {inputMethod === 'code' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Enter 6-digit Code</label>
                <input
                  value={manualToken}
                  onChange={e => setManualToken(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="ABC123"
                  maxLength={6}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-4 text-3xl font-black text-white outline-none focus:border-emerald-500 transition-colors text-center tracking-[0.4em] font-mono uppercase"
                />
              </div>
              <button onClick={() => handleClaim(manualToken)}
                disabled={loading || manualToken.length < 4}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white font-black rounded-2xl text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/30">
                {loading ? <><Loader2 size={16} className="animate-spin"/>Claiming...</> : <><CheckCircle2 size={16}/>Claim Transfer</>}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── CARD: STEP 2 — Amount ───────────────────────────────────────────────── */}
      {mode === 'card' && step === 2 && (
        <div className="space-y-5 animate-in fade-in">
          <div>
            <h3 className="font-black text-white text-base">How much to collect?</h3>
            <p className="text-xs text-slate-400 mt-1">A Stripe payment link will be created. The payer pays with any card — money goes straight into your IFB balance.</p>
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xl">$</span>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0.00" min="1" step="0.01"
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-10 pr-4 py-4 text-2xl font-black text-white outline-none focus:border-blue-500 transition-colors text-center"/>
          </div>
          <div className="flex gap-2">
            {[10, 25, 50, 100].map(v => (
              <button key={v} onClick={() => setAmount(String(v))}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] font-black rounded-xl transition-all">
                ${v}
              </button>
            ))}
          </div>
          <input value={note} onChange={e => setNote(e.target.value)}
            placeholder="What's this for? (optional)"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-white outline-none focus:border-blue-500 transition-colors placeholder-slate-600"/>
          <button onClick={handleCreateCheckout}
            disabled={checkoutLoading || !amount || parseFloat(amount) < 1}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 text-white font-black rounded-2xl text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/30">
            {checkoutLoading
              ? <><Loader2 size={16} className="animate-spin"/>Generating link…</>
              : <><CreditCard size={16}/>Generate Payment QR</>}
          </button>
          <div className="flex items-center gap-2 p-3 bg-slate-800/40 rounded-xl border border-slate-700/50">
            <div className="flex gap-1 shrink-0">
              {['VISA','MC','AMEX'].map(b => (
                <span key={b} className="text-[8px] font-black px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">{b}</span>
              ))}
            </div>
            <p className="text-[10px] text-slate-500">Apple Pay & Google Pay also accepted</p>
          </div>
        </div>
      )}

      {/* ── CARD: STEP 3 — QR + NFC ─────────────────────────────────────────────── */}
      {mode === 'card' && step === 3 && checkoutUrl && (
        <div className="space-y-5 animate-in fade-in">
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Payment Link Ready</p>
            <p className="text-white font-black text-lg">{fmtUSD(parseFloat(amount))}</p>
            {note && <p className="text-slate-500 text-xs">"{note}"</p>}
          </div>

          {/* QR Code */}
          <div className="bg-white rounded-2xl p-5 flex flex-col items-center gap-3">
            <QRCode value={checkoutUrl} size={180} level="M"/>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 text-center">Payer scans with any camera app</p>
          </div>

          {/* NFC write + open link buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={async () => {
              if (!nfcSupported) { setErr('NFC not available on this device'); return; }
              setNfcWriting(true);
              const ok = await writeNFCUrl(checkoutUrl);
              setNfcWriting(false);
              if (!ok) setErr('NFC write failed — use QR instead');
            }}
              className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                nfcSupported ? 'border-blue-700/50 bg-blue-900/20 hover:bg-blue-900/30 text-blue-400' : 'border-slate-700 bg-slate-800/30 text-slate-600 opacity-50 cursor-not-allowed'
              }`}
              disabled={!nfcSupported}>
              {nfcWriting ? <Loader2 size={20} className="animate-spin"/> : <Smartphone size={20}/>}
              <span className="text-[9px] font-black uppercase tracking-widest">{nfcWriting ? 'Writing…' : 'Write to NFC'}</span>
            </button>
            <a href={checkoutUrl} target="_blank" rel="noopener noreferrer"
              className="p-4 rounded-2xl border border-slate-700 bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white flex flex-col items-center gap-2 transition-all">
              <ExternalLink size={20}/>
              <span className="text-[9px] font-black uppercase tracking-widest">Open Link</span>
            </a>
          </div>

          <div className="p-4 bg-blue-950/30 border border-blue-800/30 rounded-2xl">
            <p className="text-[10px] text-blue-300 font-bold text-center">
              Once the payer completes checkout, the amount will appear in your IFB balance automatically — no action needed.
            </p>
          </div>

          <button onClick={reset}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 font-black rounded-2xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
            <RefreshCw size={12}/> Generate New Link
          </button>
        </div>
      )}

      {/* ── STEP 4: SUCCESS ─────────────────────────────────────────────────────── */}
      {step === 4 && result && (
        <div className="space-y-5 text-center animate-in zoom-in-95 duration-400">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-b from-emerald-900 to-slate-900 border border-emerald-700 flex items-center justify-center">
            <CheckCircle2 size={40} className="text-emerald-400"/>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2">Transfer Complete</p>
            <p className="text-3xl font-black text-white">{fmtUSD(result.amount)}</p>
            <p className="text-slate-400 text-sm mt-1">
              {mode === 'receive'
                ? `Received from ${result.sender_name || 'IFB Member'}`
                : `Sent via NFC Tap${result.auto ? ' — auto-detected' : ''}`}
            </p>
            {result.note && <p className="text-slate-500 text-xs mt-1">"{result.note}"</p>}
          </div>

          {/* Add recipient */}
          {(result.sender_id || result.receiver_id) && !contactAdded && (
            <button onClick={handleAddContact}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-black rounded-2xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
              <UserPlus size={14}/> Add {result.sender_name || 'Recipient'} to Contacts
            </button>
          )}
          {contactAdded && (
            <p className="text-emerald-400 text-xs font-black flex items-center justify-center gap-1">
              <Check size={12}/> Added to your contacts
            </p>
          )}

          <button onClick={reset}
            className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-black rounded-2xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
            <RefreshCw size={12}/> New Transfer
          </button>
          {onClose && (
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xs font-bold transition-colors">
              Close
            </button>
          )}
        </div>
      )}
    </div>
  );
}
