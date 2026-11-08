import { useState, useEffect, useCallback } from 'react';
import { supabase } from './services/supabaseClient';
import { useRef } from 'react';
import {
  CheckCircle2, Send, AlertTriangle, Loader2, RefreshCw,
  Clock, ArrowDownLeft, ArrowUpRight, Star,
  DollarSign, Zap, Trophy, TrendingUp
} from 'lucide-react';

async function sendUserDepositConfirmEmail(userEmail, userName, amountUsd, network) {
  const first = (userName || 'there').split(' ')[0];
  try {
    await supabase.functions.invoke('send-email', { body: {
        to: userEmail,
        subject: `Deposit confirmed — $${Number(amountUsd).toFixed(2)} added to your IFB account`,
        html: `
          <div style="font-family:sans-serif;background:#0f172a;color:#e2e8f0;padding:32px">
            <div style="max-width:520px;margin:0 auto;background:#1e293b;border-radius:16px;padding:32px;border:1px solid #334155">
              <h1 style="color:#10b981;font-size:22px;margin:0 0 8px">Deposit Confirmed</h1>
              <p style="color:#94a3b8;margin:0 0 24px">Hi ${first}, your deposit has been confirmed.</p>
              <div style="background:#0f172a;border-radius:12px;padding:20px;margin-bottom:20px;text-align:center">
                <p style="margin:0;font-size:32px;font-weight:900;color:#10b981">+$${Number(amountUsd).toFixed(2)}</p>
                <p style="margin:4px 0 0;color:#64748b;font-size:12px">${network} deposit · Now in your IFB wallet</p>
              </div>
              <p style="color:#94a3b8;font-size:13px">Your funds are ready to use. Log in to your IFB account to view your balance.</p>
              <a href="https://app.infinitefuturebank.org" style="display:block;text-align:center;background:#10b981;color:#fff;padding:14px;border-radius:12px;text-decoration:none;font-weight:900;font-size:13px;margin-top:20px">
                Open IFB App →
              </a>
            </div>
          </div>`,
      } });
  } catch (_) {}
}

async function sendUserWithdrawalConfirmEmail(userEmail, userName, amountUsd, network, mobile) {
  const first = (userName || 'there').split(' ')[0];
  try {
    await supabase.functions.invoke('send-email', { body: {
        to: userEmail,
        subject: `Withdrawal sent — $${Number(amountUsd).toFixed(2)} via ${network}`,
        html: `
          <div style="font-family:sans-serif;background:#0f172a;color:#e2e8f0;padding:32px">
            <div style="max-width:520px;margin:0 auto;background:#1e293b;border-radius:16px;padding:32px;border:1px solid #334155">
              <h1 style="color:#3b82f6;font-size:22px;margin:0 0 8px">Withdrawal Sent</h1>
              <p style="color:#94a3b8;margin:0 0 24px">Hi ${first}, your withdrawal has been processed.</p>
              <div style="background:#0f172a;border-radius:12px;padding:20px;margin-bottom:20px;text-align:center">
                <p style="margin:0;font-size:32px;font-weight:900;color:#3b82f6">$${Number(amountUsd).toFixed(2)}</p>
                <p style="margin:4px 0 0;color:#64748b;font-size:12px">${network} · Sent to ${mobile}</p>
              </div>
              <p style="color:#94a3b8;font-size:13px">Funds have been sent to your mobile money account. Check your ${network} balance.</p>
              <a href="https://app.infinitefuturebank.org" style="display:block;text-align:center;background:#3b82f6;color:#fff;padding:14px;border-radius:12px;text-decoration:none;font-weight:900;font-size:13px;margin-top:20px">
                Open IFB App →
              </a>
            </div>
          </div>`,
      } });
  } catch (_) {}
}

function StockBar({ balanceUsd, thresholdUsd }) {
  const pct = Math.min(100, (balanceUsd / Math.max(thresholdUsd * 4, 1)) * 100);
  const color = balanceUsd < thresholdUsd ? 'bg-red-500' : balanceUsd < thresholdUsd * 2 ? 'bg-amber-400' : 'bg-emerald-500';
  return (
    <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden mt-1">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function commissionForSeconds(s) {
  if (s <= 60)   return { pct: 2.5, label: 'MAX BONUS', color: 'text-emerald-600' };
  if (s <= 300)  return { pct: 2.0, label: 'GOOD',      color: 'text-blue-600'   };
  if (s <= 900)  return { pct: 1.5, label: 'OK',        color: 'text-amber-600'  };
  if (s <= 1800) return { pct: 1.0, label: 'SLOW',      color: 'text-orange-600' };
  return               { pct: 0.5, label: 'MIN',        color: 'text-red-600'    };
}

function LiveTimer({ startAt }) {
  const [elapsed, setElapsed] = useState(
    Math.floor((Date.now() - new Date(startAt).getTime()) / 1000)
  );
  const ref = useRef(null);

  useEffect(() => {
    ref.current = setInterval(() =>
      setElapsed(Math.floor((Date.now() - new Date(startAt).getTime()) / 1000))
    , 1000);
    return () => clearInterval(ref.current);
  }, [startAt]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  const comm = commissionForSeconds(elapsed);
  const urgent = elapsed < 60;

  return (
    <div className={`rounded-xl p-2 text-center ${urgent ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50'}`}>
      <p className={`text-xs font-semibold ${urgent ? 'text-emerald-600' : 'text-slate-500'}`}>
        {urgent ? '⚡ ACT NOW' : 'Elapsed'}
      </p>
      <p className={`text-lg font-bold font-mono ${urgent ? 'text-emerald-600' : 'text-slate-500'}`}>
        {mm}:{ss}
      </p>
      <p className={`text-xs font-bold ${comm.color}`}>{comm.pct}% · {comm.label}</p>
    </div>
  );
}

function OrderCard({ order, type, onAction, loading }) {
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState(null);
  const isDeposit = type === 'deposit';
  const startAt = order.assigned_at || order.created_at;

  async function handleAction() {
    setConfirming(true);
    const res = await onAction(order);
    if (res) setResult(res);
    setConfirming(false);
  }

  if (result) return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center space-y-1">
      <CheckCircle2 size={28} className="text-emerald-600 mx-auto" />
      <p className="font-bold text-emerald-600">Done!</p>
      <p className="text-2xl font-bold text-emerald-600">+${Number(result.commission_usd || 0).toFixed(3)}</p>
      <p className="text-xs text-slate-500">{result.commission_pct}% · {result.response_time_s}s</p>
    </div>
  );

  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${isDeposit ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200'}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {isDeposit ? <ArrowDownLeft size={16} className="text-emerald-600" /> : <ArrowUpRight size={16} className="text-blue-600" />}
          <div>
            <p className="font-bold text-slate-900 text-sm">{order.user_name || 'Unknown User'}</p>
            <p className="text-xs text-slate-500">{new Date(order.created_at).toLocaleString()}</p>
          </div>
        </div>
        <p className={`text-xl font-bold ${isDeposit ? 'text-emerald-600' : 'text-blue-600'}`}>
          ${Number(order.amount_usd).toFixed(2)}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-50 rounded-xl p-2">
          <p className="text-xs text-slate-500">Network</p>
          <p className="text-xs font-bold text-slate-900">{order.network || '—'}</p>
        </div>
        {isDeposit ? (
          <div className="bg-slate-50 rounded-xl p-2">
            <p className="text-xs text-slate-500">Ref</p>
            <p className="text-xs font-bold text-amber-600 font-mono">{order.reference_code || '—'}</p>
          </div>
        ) : (
          <div className="bg-slate-50 rounded-xl p-2">
            <p className="text-xs text-slate-500">Send To</p>
            <p className="text-xs font-bold text-slate-900 font-mono">{order.user_mobile || '—'}</p>
          </div>
        )}
        <LiveTimer startAt={startAt} />
      </div>

      {isDeposit && order.proof_image_url && (
        <a href={order.proof_image_url} target="_blank" rel="noreferrer"
          className="text-xs text-blue-600 underline font-bold block">View proof image</a>
      )}

      <button onClick={handleAction} disabled={confirming || loading}
        className={`w-full py-3 rounded-xl font-semibold text-[11px] flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
          isDeposit ? 'bg-emerald-500 hover:bg-emerald-400 text-white' : 'bg-blue-500 hover:bg-blue-400 text-white'
        }`}>
        {confirming ? <Loader2 size={13} className="animate-spin" /> : isDeposit ? <CheckCircle2 size={13} /> : <Send size={13} />}
        {isDeposit ? 'Confirm Receipt' : 'Mark as Sent'}
      </button>
    </div>
  );
}

export default function ProcessorDashboard({ session }) {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [actioning, setActioning] = useState(false);
  const [toast, setToast]       = useState(null);
  const [tab, setTab]           = useState('deposits');

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const { data: res } = await supabase.rpc('get_processor_dashboard');
    setData(res);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Real-time: subscribe to p2p_orders updates
  useEffect(() => {
    const chan = supabase
      .channel('processor-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'p2p_orders' }, load)
      .subscribe();
    return () => supabase.removeChannel(chan);
  }, [load]);

  async function confirmDeposit(order) {
    setActioning(true);
    const { data, error } = await supabase.rpc('confirm_p2p_receipt', { p_order_id: order.id });
    if (error) { showToast('Failed: ' + error.message, false); setActioning(false); return null; }
    showToast(`✅ +$${Number(data?.commission_usd || 0).toFixed(3)} earned · ${data?.response_time_s}s`);
    await sendUserDepositConfirmEmail(order.user_email, order.user_name, order.amount_usd, order.network);
    setActioning(false);
    load();
    return data;
  }

  async function markWithdrawalSent(order) {
    setActioning(true);
    const { data, error } = await supabase.rpc('mark_p2p_withdrawal_sent', { p_order_id: order.id });
    if (error) { showToast('Failed: ' + error.message, false); setActioning(false); return null; }
    showToast(`📤 +$${Number(data?.commission_usd || 0).toFixed(3)} earned · ${data?.response_time_s}s`);
    await sendUserWithdrawalConfirmEmail(order.user_email, order.user_name, order.amount_usd, order.network, order.user_mobile);
    setActioning(false);
    load();
    return data;
  }

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <Loader2 className="animate-spin text-blue-600" size={32} />
    </div>
  );

  if (!data || data.error) return (
    <div className="min-h-screen bg-white flex items-center justify-center text-slate-900 font-bold">
      You are not registered as an active processor.
    </div>
  );

  const { processor, stock, deposits, withdrawals, this_month, recent_orders } = data;
  const deps       = deposits   || [];
  const withs      = withdrawals || [];
  const totalStock = (stock || []).reduce((s, x) => s + (x.balance_usd || 0), 0);
  const hasLow     = (stock || []).some(s => s.balance_usd < s.low_threshold_usd);
  const monthEarnings = this_month?.earnings_usd || 0;
  const monthOrders   = this_month?.order_count  || 0;

  const tierColor = {
    platinum: 'text-purple-600 bg-purple-50 border-purple-200',
    gold:     'text-amber-600  bg-amber-50  border-amber-200',
    silver:   'text-slate-600  bg-slate-50  border-slate-500/30',
    bronze:   'text-orange-600 bg-orange-50 border-orange-200',
  }[processor.tier] ?? 'text-orange-600 bg-orange-50 border-orange-200';

  const tierIcon = { platinum: '💎', gold: '🥇', silver: '🥈', bronze: '🥉' }[processor.tier] ?? '🥉';

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl font-bold text-sm shadow-xl flex items-center gap-2 ${toast.ok ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.ok ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="border-b border-slate-200 bg-white backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold text-blue-600">D</span>
              <span className="text-lg font-bold text-red-600">E</span>
              <span className="text-lg font-bold text-amber-600">U</span>
              <span className="text-lg font-bold text-emerald-600">S</span>
            </div>
            <p className="text-xs font-semibold text-slate-500">Processor Portal</p>
          </div>
          <div className="flex items-center gap-3">
            {hasLow && (
              <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertTriangle size={11} className="text-amber-600" />
                <span className="text-xs font-semibold text-amber-600">Low Stock</span>
              </div>
            )}
            <button onClick={load} className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all">
              <RefreshCw size={14} className={loading ? 'animate-spin text-blue-600' : 'text-slate-500'} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Profile + Tier */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center font-bold text-xl">
              {(processor.full_name || '?').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-bold text-slate-900 text-base">{processor.full_name}</p>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${tierColor}`}>
                  {tierIcon} {processor.tier}
                </span>
              </div>
              <p className="text-xs text-slate-500">{processor.country} · {processor.city}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-amber-600 font-bold">{Number(processor.cot_rating).toFixed(1)}</span>
                <span className="text-xs text-slate-500">{processor.completed_orders || 0} completed</span>
                {processor.avg_response_time_s > 0 && (
                  <span className="text-xs text-slate-500">avg {processor.avg_response_time_s}s</span>
                )}
              </div>
            </div>
          </div>

          {/* Earnings stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2 text-center">
              <p className="text-xs text-emerald-400/60">This Month</p>
              <p className="text-lg font-bold text-emerald-600">${monthEarnings.toFixed(2)}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-2 text-center">
              <p className="text-xs text-slate-500">Total Earned</p>
              <p className="text-lg font-bold text-slate-900">${Number(processor.total_earned_usd || 0).toFixed(2)}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-2 text-center">
              <p className="text-xs text-slate-500">Fast Orders</p>
              <p className="text-lg font-bold text-amber-600">{processor.fast_orders_count || 0}</p>
            </div>
          </div>

          {/* Commission guide */}
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs font-semibold text-slate-500 mb-2">Speed = Higher Earnings</p>
            <div className="grid grid-cols-5 gap-1 text-center">
              {[
                { t: '<1 min', p: '2.5%', c: 'text-emerald-600' },
                { t: '1–5 min', p: '2.0%', c: 'text-blue-600' },
                { t: '5–15 min', p: '1.5%', c: 'text-amber-600' },
                { t: '15–30 min', p: '1.0%', c: 'text-orange-600' },
                { t: '>30 min', p: '0.5%', c: 'text-red-600' },
              ].map(r => (
                <div key={r.t}>
                  <p className={`text-sm font-bold ${r.c}`}>{r.p}</p>
                  <p className="text-xs text-slate-500">{r.t}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stock levels */}
        {(stock || []).length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2">Your Stock</p>
            <div className="grid grid-cols-2 gap-2">
              {(stock || []).map(s => (
                <div key={`${s.network}-${s.country}`} className={`p-3 rounded-xl border ${s.balance_usd < s.low_threshold_usd ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">{s.network}</span>
                    <span className={`text-xs font-bold ${s.balance_usd < s.low_threshold_usd ? 'text-red-600' : 'text-emerald-600'}`}>
                      ${s.balance_usd.toFixed(0)}
                    </span>
                  </div>
                  <StockBar balanceUsd={s.balance_usd} thresholdUsd={s.low_threshold_usd} />
                  {s.balance_usd < s.low_threshold_usd && (
                    <p className="text-xs text-red-600 font-bold mt-1">Low — contact admin</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Queue tabs */}
        <div>
          <div className="flex gap-2 mb-4">
            {[
              { key: 'deposits',    label: 'Deposits',    count: deps.length  },
              { key: 'withdrawals', label: 'Withdrawals', count: withs.length },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                  tab === t.key ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}>
                {t.label}
                {t.count > 0 && (
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${tab === t.key ? 'bg-slate-50' : 'bg-blue-600 text-white'}`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {tab === 'deposits' && (
            <div className="space-y-3">
              {deps.length === 0 ? (
                <div className="text-center py-12 text-slate-500 font-bold">No pending deposits</div>
              ) : deps.map(order => (
                <OrderCard key={order.id} order={order} type="deposit" onAction={confirmDeposit} loading={actioning} />
              ))}
            </div>
          )}

          {tab === 'withdrawals' && (
            <div className="space-y-3">
              {withs.length === 0 ? (
                <div className="text-center py-12 text-slate-500 font-bold">No pending withdrawals</div>
              ) : withs.map(order => (
                <OrderCard key={order.id} order={order} type="withdrawal" onAction={markWithdrawalSent} loading={actioning} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
