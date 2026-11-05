import React, { useEffect, useState } from 'react';
import {
  ShieldAlert, Lock, Loader2, Landmark, Send, Download, Plus, ArrowRightLeft, QrCode,
  ArrowDownRight, ArrowUpRight, Zap, CreditCard, Building, Wallet, ChevronRight,
  Wifi, Shield, RefreshCw, MoreHorizontal, X, LayoutGrid, BarChart2,
} from 'lucide-react';
import HeroBanner from '../HeroBanner';
import FeatureBadge from '../components/ui/FeatureBadge';
import { FEATURED_SERVICES } from '../config/services';
import { useTranslation } from '../i18n/useTranslation';

const txIcon = (tx) => {
  const t = (tx.transaction_type || '').toLowerCase();
  if (t.includes('deposit') || t.includes('topup')) return { Icon: ArrowDownRight, color: 'bg-emerald-50 text-emerald-600' };
  if (t.includes('withdraw') || t.includes('payout')) return { Icon: Building, color: 'bg-slate-100 text-slate-600' };
  if (t.includes('card') || t.includes('expense')) return { Icon: CreditCard, color: 'bg-blue-50 text-blue-600' };
  if (t.includes('send') || t.includes('p2p')) return { Icon: Zap, color: tx.amount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600' };
  return { Icon: Wallet, color: 'bg-slate-100 text-slate-500' };
};

const STATUS_STYLE = {
  completed: 'text-emerald-600',
  pending: 'text-amber-600',
};

function SectionHeader({ title, action, onAction }) {
  return (
    <div className="flex items-center justify-between px-1 mb-2.5">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {action && (
        <button type="button" onClick={onAction} className="flex items-center gap-0.5 text-sm font-semibold text-blue-600 hover:text-blue-700">
          {action} <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}

export default function NetPositionHome({
  profile, balances, transactions, totalNetWorth, formatCurrency,
  setActiveTab, activeEscrows, onRefreshEscrows,
  showBalances, setShowBalances, setActiveModal,
  setShowPayMe, setShowDepositUI, setIsWithdrawOpen,
  showAnalytics, setShowAnalytics,
  setShowVault, setShowNFC, setActiveAppPopup, onVerify,
}) {
  const { t } = useTranslation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (!activeEscrows?.length || !onRefreshEscrows) return;
    const interval = setInterval(() => onRefreshEscrows(), 30000);
    return () => clearInterval(interval);
  }, [activeEscrows?.length, onRefreshEscrows]);

  const handleCheckUpdates = async () => {
    if (!onRefreshEscrows || isRefreshing) return;
    setIsRefreshing(true);
    try { await onRefreshEscrows(); } finally { setIsRefreshing(false); }
  };

  const safeTotal = totalNetWorth || 1;
  const allocation = [
    { label: t('home.cash'),     value: balances.liquid_usd || 0,         bar: 'bg-blue-600' },
    { label: t('home.invested'), value: balances.alpha_equity_usd || 0,   bar: 'bg-indigo-400' },
    { label: t('home.vault'),    value: balances.mysafe_digital_usd || 0, bar: 'bg-emerald-500' },
  ];

  const validTxs = transactions.filter((tx) => tx.status !== 'failed' && tx.status !== 'pending');
  const now = new Date();
  const monthTxs = transactions.filter((tx) => { const d = new Date(tx.created_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const moneyIn  = monthTxs.filter((tx) => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0);
  const moneyOut = monthTxs.filter((tx) => tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0);
  const avgTx = validTxs.length ? validTxs.reduce((s, tx) => s + Math.abs(tx.amount), 0) / validTxs.length : 0;

  // Four everyday actions; everything else lives under "More" (no repeated buttons).
  const primaryActions = [
    { id: 'SEND',     Icon: Send,     label: t('actions.send'),     run: () => setActiveModal('SEND') },
    { id: 'REQUEST',  Icon: Download, label: t('actions.receive'),  run: () => setActiveModal('REQUEST') },
    { id: 'DEPOSIT',  Icon: Plus,     label: t('actions.add'),      run: () => setShowDepositUI(true) },
    { id: 'WITHDRAW', Icon: Landmark, label: t('actions.withdraw'), run: () => setIsWithdrawOpen(true) },
  ];
  const moreActions = [
    { id: 'PAY_ME',   Icon: QrCode,         label: t('actions.payMe'),    desc: 'Show your QR code to get paid', run: () => setShowPayMe(true) },
    { id: 'TRANSFER', Icon: ArrowRightLeft, label: t('actions.exchange'), desc: 'Move money between accounts',   run: () => setActiveModal('TRANSFER') },
    { id: 'NFC',      Icon: Wifi,           label: 'Tap & Pay',           desc: 'Pay with your phone',           run: () => setShowNFC && setShowNFC(true) },
    { id: 'VAULT',    Icon: Shield,         label: 'Vault',               desc: 'Lock money away safely',        run: () => setShowVault && setShowVault(true) },
  ];
  const runMore = (fn) => { setMoreOpen(false); fn(); };

  const recentTxs = transactions.slice(0, 5);
  const homeServices = FEATURED_SERVICES.slice(0, 7);

  return (
    <div className="ui-page space-y-6 animate-in fade-in duration-300">

      {/* ── Alerts ─────────────────────────────────────────── */}
      {profile && profile.kyc_status === 'pending_kyc' && (
        <div className="ui-card p-4 flex items-start gap-3 border-blue-200 bg-blue-50/60">
          <Loader2 size={20} className="text-blue-600 animate-spin shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-slate-900">Verification under review</p>
            <p className="text-sm text-slate-600 mt-0.5">We're checking your documents. This usually takes 24–48 hours.</p>
          </div>
        </div>
      )}
      {profile && !['verified', 'approved', 'pending_kyc'].includes(profile.kyc_status) && (
        <div className="ui-card p-4 flex flex-col sm:flex-row sm:items-center gap-3 border-amber-200 bg-amber-50/70">
          <div className="flex items-start gap-3 flex-1">
            <ShieldAlert size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-slate-900">{t('kyc.required')}</p>
              <p className="text-sm text-slate-600 mt-0.5">{t('kyc.desc')}</p>
            </div>
          </div>
          <button onClick={() => (onVerify ? onVerify() : setActiveTab('SETTINGS'))} className="ui-btn ui-btn-primary sm:w-auto">{t('kyc.cta')}</button>
        </div>
      )}
      {activeEscrows?.map((escrow) => (
        <div key={escrow.id} className="ui-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><Lock size={18} /></span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {escrow.order_type === 'deposit' ? 'P2P deposit' : 'P2P withdrawal'} · {formatCurrency(escrow.amount_usd)}
              </p>
              <p className="text-sm text-slate-500 capitalize">{String(escrow.status || '').replace(/_/g, ' ')}</p>
            </div>
          </div>
          <button onClick={handleCheckUpdates} disabled={isRefreshing} className="ui-btn ui-btn-secondary sm:w-auto">
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} /> {isRefreshing ? 'Refreshing…' : 'Check status'}
          </button>
        </div>
      ))}

      {/* ── Balance (the only place balances are shown) ───── */}
      <HeroBanner
        profile={profile}
        balances={balances}
        transactions={transactions}
        formatCurrency={formatCurrency}
        showBalances={showBalances}
        setShowBalances={setShowBalances}
        setActiveTab={setActiveTab}
        setActiveModal={setActiveModal}
      />

      {/* ── Actions ───────────────────────────────────────── */}
      <div id="tour-quick-actions" className="grid grid-cols-5 gap-2 md:flex md:flex-wrap md:gap-2.5">
        {primaryActions.map(({ id, Icon, label, run }) => (
          <button key={id} type="button" onClick={run} className="ui-action">
            <span className="ui-action-icon bg-blue-600 text-white"><Icon size={20} /></span>
            <span className="ui-action-label">{label}</span>
          </button>
        ))}
        <button type="button" onClick={() => setMoreOpen(true)} className="ui-action">
          <span className="ui-action-icon bg-white text-slate-700 border border-slate-200"><MoreHorizontal size={20} /></span>
          <span className="ui-action-label">More</span>
        </button>
      </div>

      {/* ── This month ────────────────────────────────────── */}
      <section>
        <SectionHeader
          title="This month"
          action={showAnalytics ? 'Hide insights' : 'Insights'}
          onAction={() => setShowAnalytics(!showAnalytics)}
        />
        <div className="grid grid-cols-2 gap-3">
          <div className="ui-card p-4">
            <p className="text-sm text-slate-500 flex items-center gap-1.5"><ArrowDownRight size={16} className="text-emerald-600" /> {t('home.moneyIn')}</p>
            <p className="ui-amount text-xl mt-1 text-emerald-600">{formatCurrency(moneyIn)}</p>
          </div>
          <div className="ui-card p-4">
            <p className="text-sm text-slate-500 flex items-center gap-1.5"><ArrowUpRight size={16} className="text-slate-500" /> {t('home.moneyOut')}</p>
            <p className="ui-amount text-xl mt-1 text-slate-900">{formatCurrency(moneyOut)}</p>
          </div>
        </div>
        {showAnalytics && (
          <div className="ui-card p-4 md:p-5 mt-3 space-y-4 animate-in fade-in duration-200">
            <div>
              <p className="text-sm font-semibold text-slate-900 flex items-center gap-2"><BarChart2 size={16} className="text-blue-600" /> Where your money is</p>
              <div className="w-full h-2.5 rounded-full flex overflow-hidden gap-0.5 mt-3 bg-slate-100">
                {allocation.map((a) => <div key={a.label} className={`${a.bar} h-full`} style={{ width: `${(a.value / safeTotal) * 100}%` }} />)}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                {allocation.map((a) => (
                  <div key={a.label} className="text-sm">
                    <span className="flex items-center gap-1.5 text-slate-500"><span className={`w-2 h-2 rounded-full ${a.bar}`} />{a.label}</span>
                    <span className="font-semibold text-slate-900">{((a.value / safeTotal) * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-sm">
              <div><p className="text-slate-500">Transactions</p><p className="font-semibold text-slate-900 text-base">{validTxs.length}</p></div>
              <div><p className="text-slate-500">Average amount</p><p className="font-semibold text-slate-900 text-base">{formatCurrency(avgTx)}</p></div>
            </div>
          </div>
        )}
      </section>

      {/* ── Recent activity (mobile and web) ─────────────── */}
      <section>
        <SectionHeader title={t('home.recentActivity')} action={recentTxs.length ? t('home.seeAll') : null} onAction={() => setActiveTab('TRANSACTIONS')} />
        <div className="ui-card divide-y divide-slate-100 overflow-hidden">
          {recentTxs.length === 0 && (
            <p className="px-4 py-8 text-sm text-slate-500 text-center">No transactions yet. Add money to get started.</p>
          )}
          {recentTxs.map((tx) => {
            const { Icon, color } = txIcon(tx);
            const isPos = tx.amount > 0;
            const label = tx.description || tx.transaction_type || 'Transaction';
            const dateStr = new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                <span className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shrink-0`}><Icon size={18} /></span>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-slate-900 truncate first-letter:uppercase">{label}</p>
                  <p className="text-sm text-slate-500">
                    {dateStr}
                    {tx.status && tx.status !== 'completed' && <span className={`ml-1.5 capitalize ${STATUS_STYLE[tx.status] || 'text-red-600'}`}>· {tx.status}</span>}
                  </p>
                </div>
                <p className={`ui-amount text-[15px] shrink-0 ${isPos ? 'text-emerald-600' : 'text-slate-900'}`}>
                  {isPos ? '+' : ''}{formatCurrency(tx.amount)}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Services: small row at the bottom, "More" opens the full page ── */}
      {setActiveAppPopup && (
        <section>
          <SectionHeader title="Services" action="See all" onAction={() => setActiveTab('SERVICES')} />
          <div className="ui-card p-3 grid grid-cols-4 md:grid-cols-8 gap-1">
            {homeServices.map(({ id, Icon, label }) => (
              <button key={id} type="button" onClick={() => setActiveAppPopup(id)} className="ui-tile">
                <span className="ui-tile-icon"><Icon size={20} /></span>
                <span className="ui-tile-label">{label}</span>
                <FeatureBadge id={id} compact />
              </button>
            ))}
            <button type="button" onClick={() => setActiveTab('SERVICES')} className="ui-tile">
              <span className="ui-tile-icon bg-slate-100 text-slate-700"><LayoutGrid size={20} /></span>
              <span className="ui-tile-label">More</span>
            </button>
          </div>
        </section>
      )}

      {/* ── "More" actions sheet ─────────────────────────── */}
      {moreOpen && (
        <div className="fixed inset-0 z-[300] flex items-end md:items-center justify-center" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-slate-900/40" aria-label="Close" onClick={() => setMoreOpen(false)} />
          <div className="relative w-full md:max-w-md bg-white rounded-t-3xl md:rounded-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))] animate-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-between px-1 pb-2">
              <h3 className="text-base font-semibold text-slate-900">More actions</h3>
              <button type="button" onClick={() => setMoreOpen(false)} className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100" aria-label="Close"><X size={18} /></button>
            </div>
            <div className="divide-y divide-slate-100">
              {moreActions.map(({ id, Icon, label, desc, run }) => (
                <button key={id} type="button" onClick={() => runMore(run)} className="w-full flex items-center gap-3.5 px-1 py-3 text-left hover:bg-slate-50 rounded-xl">
                  <span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><Icon size={20} /></span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] font-semibold text-slate-900">{label}</span>
                    <span className="block text-sm text-slate-500">{desc}</span>
                  </span>
                  <ChevronRight size={18} className="text-slate-300" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
