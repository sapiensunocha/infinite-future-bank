import React from 'react';
import QRCode from "react-qr-code";
import { X, ShieldCheck, ArrowDownToLine, Loader2, Plus } from 'lucide-react';

export default function TransactionModal({ 
  activeModal, setActiveModal, isLoading, sendAsset, setSendAsset, formatCurrency, balances,
  sendRecipient, setSendRecipient, recipients, setActiveTab, isScheduled, setIsScheduled, 
  scheduleDate, setScheduleDate, requestLink, setRequestLink, requestEmail, setRequestEmail, 
  requestReason, setRequestReason, showQR, setShowQR, isSendingEmail, handleSendEmailInvoice, handleSubmit 
}) {
  if (!activeModal || activeModal === 'ADVISOR') return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100 mt-[env(safe-area-inset-top)] mb-[env(safe-area-inset-bottom)] max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 z-20">
          <h3 className="font-semibold text-lg text-slate-800 tracking-tight">{activeModal}</h3>
          <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-800 transition-colors bg-white p-2 rounded-xl shadow-sm">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6 relative z-10 text-center">
          {!requestLink ? (
            <>
              {activeModal === 'SEND' && (
                <div className="space-y-4 mb-6 text-left animate-in fade-in">
                  <div>
                    <label className="ui-label">Asset to Send</label>
                    <select name="asset" value={sendAsset} onChange={(e) => setSendAsset(e.target.value)} className="ui-select">
                      <option value="USD">Fiat USD (Internal)</option>
                      <option value="AFR">AFR (Sovereign Ledger)</option>
                    </select>
                  </div>

                  {sendAsset === 'USD' ? (
                    <>
                      <div>
                        <label className="ui-label">Select Recipient</label>
                        <div className="flex gap-2">
                          <select value={sendRecipient} onChange={(e) => setSendRecipient(e.target.value)} className="ui-select flex-1">
                            <option value="">Choose contact...</option>
                            {recipients.map(r => <option key={r.id} value={r.id}>{r.recipient_name} ({r.role})</option>)}
                          </select>
                          <button type="button" onClick={() => { setActiveModal(null); setActiveTab('ORGANIZE'); }} className="px-4 bg-slate-100 text-blue-600 font-bold rounded-2xl border-2 border-slate-200 hover:bg-slate-200 transition-colors shadow-sm"><Plus size={20}/></button>
                        </div>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 mt-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" checked={isScheduled} onChange={(e) => setIsScheduled(e.target.checked)} className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300" />
                          <span className="text-sm font-bold text-slate-700">Schedule Auto-Transfer</span>
                        </label>
                        {isScheduled && (
                          <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                            <label className="ui-label">Execution Date</label>
                            <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="ui-input" />
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="ui-label">Recipient AFR Address</label>
                      <input type="text" name="receiverAddress" placeholder="0x..." className="ui-input font-mono" required={sendAsset === 'AFR'} />
                      <p className="text-xs font-bold text-emerald-600 mt-2 flex items-center gap-1"><ShieldCheck size={12}/> Settles instantly on the Sovereign Go Node</p>
                    </div>
                  )}
                </div>
              )}

              {activeModal === 'TRANSFER' && (
                <div className="space-y-4 mb-6 text-left">
                  <div>
                    <label className="ui-label">From Account</label>
                    <select name="fromAccount" className="ui-select">
                      <option value="liquid_usd">Cash on Hand ({formatCurrency(balances.liquid_usd)})</option>
                      <option value="alpha_equity_usd">Alpha Equity ({formatCurrency(balances.alpha_equity_usd)})</option>
                      <option value="mysafe_digital_usd">Digital Safe ({formatCurrency(balances.mysafe_digital_usd)})</option>
                    </select>
                  </div>
                  <div className="flex justify-center -my-2 relative z-10"><div className="bg-blue-50 text-blue-500 p-2 rounded-full border border-blue-100"><ArrowDownToLine size={16}/></div></div>
                  <div>
                    <label className="ui-label">To Account</label>
                    <select name="toAccount" defaultValue="alpha_equity_usd" className="ui-select">
                      <option value="liquid_usd">Cash on Hand</option>
                      <option value="alpha_equity_usd">Alpha Equity</option>
                      <option value="mysafe_digital_usd">Digital Safe</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="ui-label text-left">Amount ({sendAsset === 'AFR' && activeModal === 'SEND' ? 'AFR' : 'USD'})</label>
                <input type="number" step="0.01" name="amount" required className="ui-input text-4xl text-center h-16" placeholder="0.00" autoFocus />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="ui-btn ui-btn-primary"
              >
                {isLoading ? 'TRANSMITTING...' : activeModal === 'REQUEST' ? 'GENERATE SECURE LINK' : `CONFIRM ${activeModal}`}
              </button>
            </>
          ) : (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner">
                <ShieldCheck size={32} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-xl">Payment Portal Ready</h4>
                <p className="text-xs font-bold text-slate-500 mt-1">Ready for external routing via Card or ACH.</p>
              </div>
              {showQR ? (
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-center inline-block mx-auto animate-in fade-in zoom-in">
                  <QRCode value={requestLink} size={180} fgColor="#0f172a" />
                </div>
              ) : (
                <button type="button" className="w-full text-left bg-slate-50 border-2 border-slate-100 p-4 rounded-xl break-all relative group cursor-pointer" onClick={() => {
                  navigator.clipboard.writeText(requestLink);
                  /* Note: Toast notification handled in parent */
                }}>
                  <p className="text-sm font-bold text-blue-600 group-hover:text-blue-700 transition-colors">{requestLink}</p>
                  <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center backdrop-blur-[1px]">
                    <span className="font-semibold text-blue-700 text-xs bg-white px-3 py-1 rounded-full shadow-sm">Click to Copy</span>
                  </div>
                </button>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowQR(!showQR)}
                  className="flex-1 bg-slate-100 text-slate-700 rounded-xl py-4 font-semibold text-sm hover:bg-slate-200 transition-all"
                >
                  {showQR ? 'SHOW LINK' : 'SHOW QR CODE'}
                </button>
                <button
                  type="button"
                  onClick={handleSendEmailInvoice}
                  disabled={isSendingEmail}
                  className="ui-btn ui-btn-primary flex-1"
                >
                  {isSendingEmail ? <Loader2 className="animate-spin" size={14} /> : 'EMAIL INVOICE'}
                </button>
              </div>
              <button
                type="button"
                onClick={() => { setActiveModal(null); setRequestLink(null); setRequestEmail(''); setRequestReason(''); setShowQR(false); }}
                className="w-full text-slate-500 font-semibold text-sm hover:text-slate-800 transition-all pt-2"
              >
                Close Window
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}