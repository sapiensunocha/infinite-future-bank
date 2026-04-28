import React, { useState } from 'react';
import QRCode from "react-qr-code";
import { X, ShieldCheck, ArrowDownToLine, Loader2, Plus, Send, Download, ArrowRightLeft, Mail, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { APP_URL } from '../../config/constants';

const MODAL_META = {
  SEND:     { title: 'Send Money',                icon: Send,           color: 'text-blue-600',    bg: 'bg-blue-50' },
  REQUEST:  { title: 'Request Payment',           icon: Download,       color: 'text-emerald-600', bg: 'bg-emerald-50' },
  TRANSFER: { title: 'Move Between Accounts',     icon: ArrowRightLeft, color: 'text-indigo-600',  bg: 'bg-indigo-50' },
};

export default function TransactionModal({
  activeModal, setActiveModal, isLoading, sendAsset, setSendAsset, formatCurrency, balances,
  sendRecipient, setSendRecipient, recipients, setActiveTab, isScheduled, setIsScheduled,
  scheduleDate, setScheduleDate, requestLink, setRequestLink, requestEmail, setRequestEmail,
  requestReason, setRequestReason, showQR, setShowQR, isSendingEmail,
  triggerGlobalActionNotification, session, fetchAllData, setIsLoading
}) {
  const [emailSent, setEmailSent] = useState(false);
  const [isSendingInvoice, setIsSendingInvoice] = useState(false);

  if (!activeModal || activeModal === 'ADVISOR') return null;

  const meta = MODAL_META[activeModal] || { title: activeModal, icon: Send, color: 'text-blue-600', bg: 'bg-blue-50' };
  const MetaIcon = meta.icon;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // ── TRANSFER between internal accounts ──
    if (activeModal === 'TRANSFER') {
      const amount = parseFloat(e.target.amount.value);
      const fromAcct = e.target.fromAccount.value;
      const toAcct = e.target.toAccount.value;
      if (fromAcct === toAcct) {
        triggerGlobalActionNotification('error', 'Choose two different accounts.');
        setIsLoading(false); return;
      }
      try {
        const { error } = await supabase.rpc('process_internal_transfer', { p_user_id: session.user.id, p_from: fromAcct, p_to: toAcct, p_amount: amount });
        if (error) throw error;
        triggerGlobalActionNotification('success', `${formatCurrency(amount)} moved successfully.`);
        await fetchAllData();
        setActiveModal(null);
      } catch (err) { triggerGlobalActionNotification('error', err.message); }
      finally { setIsLoading(false); }
      return;
    }

    // ── SEND money ──
    if (activeModal === 'SEND') {
      const amount = parseFloat(e.target.amount.value);
      const asset = e.target.asset?.value || 'USD';

      if (asset === 'AFR') {
        const receiverAddress = e.target.receiverAddress.value;
        if (!receiverAddress) {
          triggerGlobalActionNotification('error', 'Enter a valid wallet address.');
          setIsLoading(false); return;
        }
        try {
          const { data, error } = await supabase.functions.invoke('process-afr-transfer', { body: { receiver_address: receiverAddress, amount } });
          if (error) throw new Error(error.message);
          if (data?.error) throw new Error(data.error);
          triggerGlobalActionNotification('success', `Transfer settled. Reference: ${data.tx_hash?.slice(0, 10)}…`);
          await fetchAllData();
          setActiveModal(null);
        } catch (err) { triggerGlobalActionNotification('error', err.message); }
        finally { setIsLoading(false); }
        return;
      }

      if (!sendRecipient) {
        triggerGlobalActionNotification('error', 'Please choose a recipient.');
        setIsLoading(false); return;
      }

      try {
        const msg = isScheduled
          ? `Transfer of ${formatCurrency(amount)} scheduled for ${new Date(scheduleDate).toLocaleDateString()}.`
          : `${formatCurrency(amount)} sent successfully.`;
        if (!isScheduled) {
          const { error } = await supabase.from('transactions').insert([{
            user_id: session.user.id,
            amount: -amount,
            transaction_type: 'send',
            description: `Transfer to contact`,
            status: 'completed',
          }]);
          if (error) throw error;
        }
        triggerGlobalActionNotification('success', msg);
        await fetchAllData();
        setActiveModal(null);
      } catch (err) { triggerGlobalActionNotification('error', err.message); }
      finally { setIsLoading(false); }
      return;
    }

    // ── REQUEST payment — generate a secure link ──
    if (activeModal === 'REQUEST') {
      const amount = parseFloat(e.target.amount.value);
      const reason = e.target.reason?.value || requestReason || '';
      const email  = e.target.email?.value  || requestEmail  || '';
      const link   = `${APP_URL}/pay?to=${session.user.id}&amount=${amount}&reason=${encodeURIComponent(reason)}`;
      setRequestLink(link);
      setRequestReason(reason);
      setRequestEmail(email);
      setIsLoading(false);
    }
  };

  const handleEmailInvoice = async () => {
    if (!requestEmail) {
      triggerGlobalActionNotification('error', 'Add the recipient email address first.');
      return;
    }
    setIsSendingInvoice(true);
    try {
      const { error } = await supabase.functions.invoke('send-invoice-email', {
        body: {
          to: requestEmail,
          from_name: session?.user?.user_metadata?.full_name || 'Your contact',
          amount: requestLink ? new URL(requestLink).searchParams.get('amount') : '0',
          reason: requestReason,
          pay_link: requestLink,
        },
      });
      if (error) throw error;
      setEmailSent(true);
      triggerGlobalActionNotification('success', `Invoice emailed to ${requestEmail}!`);
    } catch (err) {
      triggerGlobalActionNotification('error', 'Email sending failed. Copy the link and share it manually.');
    } finally {
      setIsSendingInvoice(false);
    }
  };

  const handleClose = () => {
    setActiveModal(null);
    setRequestLink(null);
    setRequestEmail('');
    setRequestReason('');
    setShowQR(false);
    setEmailSent(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full md:max-w-md md:rounded-3xl rounded-t-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 animate-in slide-in-from-bottom-4 md:zoom-in-95 duration-300 max-h-[92vh] flex flex-col">

        {/* Mobile drag handle */}
        <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-2xl ${meta.bg} flex items-center justify-center ${meta.color}`}>
              <MetaIcon size={18} />
            </div>
            <h3 className="font-black text-base text-slate-800 tracking-tight">{meta.title}</h3>
          </div>
          <button onClick={handleClose} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl flex items-center justify-center transition-colors active:scale-90">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {!requestLink ? (
              <>
                {/* ── SEND inputs ── */}
                {activeModal === 'SEND' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Currency / Asset</label>
                      <select name="asset" value={sendAsset} onChange={(e) => setSendAsset(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-sm text-slate-800 outline-none focus:border-blue-500">
                        <option value="USD">USD — Standard Transfer</option>
                        <option value="AFR">AFR — Network Token</option>
                      </select>
                    </div>

                    {sendAsset === 'USD' ? (
                      <>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Send To</label>
                          <div className="flex gap-2">
                            <select value={sendRecipient} onChange={(e) => setSendRecipient(e.target.value)} className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-sm text-slate-800 outline-none focus:border-blue-500">
                              <option value="">Choose from contacts…</option>
                              {recipients.map(r => <option key={r.id} value={r.id}>{r.recipient_name} ({r.role})</option>)}
                            </select>
                            <button type="button" onClick={() => { setActiveModal(null); setActiveTab('ORGANIZE'); }} className="px-4 bg-slate-100 text-blue-600 font-black rounded-2xl border-2 border-slate-200 hover:bg-blue-50 transition-colors">
                              <Plus size={18} />
                            </button>
                          </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={isScheduled} onChange={(e) => setIsScheduled(e.target.checked)} className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300" />
                            <span className="text-sm font-bold text-slate-700">Schedule for later</span>
                          </label>
                          {isScheduled && (
                            <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                              <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-500" />
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Recipient Wallet Address</label>
                        <input type="text" name="receiverAddress" placeholder="0x…" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-mono text-sm text-slate-800 outline-none focus:border-blue-500" required={sendAsset === 'AFR'} />
                        <p className="text-[10px] font-bold text-emerald-600 mt-2 flex items-center gap-1"><ShieldCheck size={12} /> Settles instantly on the network</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── TRANSFER inputs ── */}
                {activeModal === 'TRANSFER' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">From</label>
                      <select name="fromAccount" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-bold text-slate-800 outline-none focus:border-blue-500">
                        <option value="liquid_usd">Cash ({formatCurrency(balances.liquid_usd)})</option>
                        <option value="alpha_equity_usd">Investments ({formatCurrency(balances.alpha_equity_usd)})</option>
                        <option value="mysafe_digital_usd">Safe Vault ({formatCurrency(balances.mysafe_digital_usd)})</option>
                      </select>
                    </div>
                    <div className="flex justify-center"><div className="bg-indigo-50 text-indigo-500 p-2 rounded-full border border-indigo-100"><ArrowDownToLine size={16} /></div></div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">To</label>
                      <select name="toAccount" defaultValue="alpha_equity_usd" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-bold text-slate-800 outline-none focus:border-blue-500">
                        <option value="liquid_usd">Cash</option>
                        <option value="alpha_equity_usd">Investments</option>
                        <option value="mysafe_digital_usd">Safe Vault</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* ── REQUEST inputs ── */}
                {activeModal === 'REQUEST' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">What is this for? (optional)</label>
                      <input type="text" name="reason" defaultValue={requestReason} placeholder="e.g. Dinner split, Rent, Invoice #45" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-medium text-sm text-slate-800 outline-none focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Send link to email (optional)</label>
                      <div className="relative">
                        <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="email" name="email" defaultValue={requestEmail} placeholder="friend@email.com" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pl-10 font-medium text-sm text-slate-800 outline-none focus:border-emerald-500" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Amount */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                    Amount {sendAsset === 'AFR' && activeModal === 'SEND' ? '(AFR)' : '(USD)'}
                  </label>
                  <input
                    type="number" step="0.01" name="amount" required min="0.01"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 font-black text-4xl text-center text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-300 shadow-inner"
                    placeholder="0.00" autoFocus
                  />
                </div>

                <button type="submit" disabled={isLoading} className="w-full bg-blue-700 text-white rounded-2xl py-5 font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-600 active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {isLoading ? <><Loader2 size={16} className="animate-spin" /> Processing…</> : (
                    activeModal === 'REQUEST' ? 'Generate Payment Link' :
                    activeModal === 'TRANSFER' ? 'Move Funds' : 'Send Now'
                  )}
                </button>
              </>
            ) : (
              /* ── Payment link ready ── */
              <div className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center shadow-inner">
                    <CheckCircle2 size={28} />
                  </div>
                  <h4 className="font-black text-slate-800 text-lg">Your payment link is ready</h4>
                  <p className="text-xs font-medium text-slate-500 text-center">Share this link with anyone — they can pay you by card or bank transfer.</p>
                </div>

                {showQR ? (
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-center animate-in fade-in zoom-in">
                    <QRCode value={requestLink} size={180} fgColor="#0f172a" />
                  </div>
                ) : (
                  <button type="button" className="w-full text-left bg-slate-50 border-2 border-slate-100 p-4 rounded-xl break-all relative group cursor-pointer" onClick={() => {
                    navigator.clipboard.writeText(requestLink).catch(() => {});
                    triggerGlobalActionNotification('success', 'Link copied!');
                  }}>
                    <p className="text-sm font-bold text-blue-600 group-hover:text-blue-700 transition-colors leading-relaxed">{requestLink}</p>
                    <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                      <span className="font-black text-blue-700 text-xs uppercase tracking-widest bg-white px-3 py-1 rounded-full shadow-sm">Tap to Copy</span>
                    </div>
                  </button>
                )}

                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowQR(!showQR)} className="flex-1 bg-slate-100 text-slate-700 rounded-xl py-4 font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">
                    {showQR ? 'Show Link' : 'Show QR Code'}
                  </button>
                  <button
                    type="button"
                    onClick={handleEmailInvoice}
                    disabled={isSendingInvoice || emailSent}
                    className="flex-1 bg-slate-800 text-white rounded-xl py-4 font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-slate-700 transition-all disabled:opacity-60 flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    {isSendingInvoice ? <Loader2 size={13} className="animate-spin" /> :
                     emailSent ? <><CheckCircle2 size={13} /> Sent!</> : <><Mail size={13} /> Email Link</>}
                  </button>
                </div>

                <button type="button" onClick={handleClose} className="w-full text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-700 transition-all pt-1">
                  Done
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
