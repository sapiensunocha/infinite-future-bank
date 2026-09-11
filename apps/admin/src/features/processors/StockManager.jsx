import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
  Wifi, WifiOff, AlertTriangle, CheckCircle, Plus, RefreshCw,
  TrendingUp, TrendingDown, Users, DollarSign, Activity, ChevronDown,
  ChevronUp, Edit2, Ban, UserCheck, X, Loader2, Package, Send
} from 'lucide-react';

const NETWORKS = ['MTN', 'Airtel', 'M-Pesa', 'Orange', 'Wave', 'Moov', 'TNM', 'Vodacom'];
const COUNTRIES = [
  { code: 'NG', name: 'Nigeria',        currency: 'NGN', rate: 1580 },
  { code: 'KE', name: 'Kenya',          currency: 'KES', rate: 129  },
  { code: 'UG', name: 'Uganda',         currency: 'UGX', rate: 3720 },
  { code: 'GH', name: 'Ghana',          currency: 'GHS', rate: 15.5 },
  { code: 'TZ', name: 'Tanzania',       currency: 'TZS', rate: 2650 },
  { code: 'RW', name: 'Rwanda',         currency: 'RWF', rate: 1320 },
  { code: 'CD', name: 'DR Congo',       currency: 'CDF', rate: 2780 },
  { code: 'CM', name: 'Cameroon',       currency: 'XAF', rate: 610  },
  { code: 'SN', name: 'Senegal',        currency: 'XOF', rate: 610  },
  { code: 'CI', name: "Côte d'Ivoire",  currency: 'XOF', rate: 610  },
  { code: 'ML', name: 'Mali',           currency: 'XOF', rate: 610  },
  { code: 'ZM', name: 'Zambia',         currency: 'ZMW', rate: 26.5 },
  { code: 'MZ', name: 'Mozambique',     currency: 'MZN', rate: 63.5 },
  { code: 'MW', name: 'Malawi',         currency: 'MWK', rate: 1730 },
  { code: 'SL', name: 'Sierra Leone',   currency: 'SLL', rate: 22400},
  { code: 'GN', name: 'Guinea',         currency: 'GNF', rate: 8650 },
  { code: 'GA', name: 'Gabon',          currency: 'XAF', rate: 610  },
  { code: 'LS', name: 'Lesotho',        currency: 'LSL', rate: 18.5 },
];

const RESEND_KEY = import.meta.env.VITE_RESEND_API_KEY;

async function sendProcessorWelcomeEmail(email, name) {
  if (!RESEND_KEY) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_KEY}` },
      body: JSON.stringify({
        from: 'IFB Network <noreply@infinitefuturebank.org>',
        to: email,
        subject: 'Welcome to the IFB Liquidity Processor Network',
        html: `
          <div style="font-family:sans-serif;background:#0f172a;color:#e2e8f0;padding:32px">
            <div style="max-width:520px;margin:0 auto;background:#1e293b;border-radius:16px;padding:32px;border:1px solid #334155">
              <h1 style="color:#3b82f6;font-size:22px;margin:0 0 8px">Welcome, ${name.split(' ')[0]}!</h1>
              <p style="color:#94a3b8;margin:0 0 24px">You have been activated as an IFB Liquidity Processor.</p>
              <p>You will receive an email every time a user sends a deposit or withdrawal request to your queue.</p>
              <p>Log in at <a href="https://app.infinitefuturebank.org/processor" style="color:#3b82f6">app.infinitefuturebank.org/processor</a> to manage your orders.</p>
              <p style="color:#475569;font-size:12px;margin-top:24px">IFB Liquidity Network</p>
            </div>
          </div>`,
      }),
    });
  } catch (_) {}
}

function StockBar({ balanceUsd, thresholdUsd }) {
  const pct = Math.min(100, (balanceUsd / Math.max(thresholdUsd * 4, 1)) * 100);
  const color = balanceUsd < thresholdUsd
    ? 'bg-red-500'
    : balanceUsd < thresholdUsd * 2
    ? 'bg-amber-400'
    : 'bg-emerald-500';
  return (
    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mt-1">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    active:    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    pending:   'bg-amber-500/20   text-amber-400   border-amber-500/30',
    suspended: 'bg-red-500/20     text-red-400     border-red-500/30',
    inactive:  'bg-slate-500/20   text-slate-400   border-slate-500/30',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${map[status] ?? map.inactive}`}>
      {status}
    </span>
  );
}

export default function StockManager() {
  const [processors, setProcessors]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [expanded, setExpanded]       = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [refillModal, setRefillModal] = useState(null);
  const [saving, setSaving]           = useState(false);
  const [totals, setTotals]           = useState({ active: 0, total: 0, stockUsd: 0, lowStock: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc('admin_get_processor_network');
    const list = data || [];
    setProcessors(list);
    setTotals({
      total:    list.length,
      active:   list.filter(p => p.status === 'active').length,
      stockUsd: list.reduce((s, p) => s + (p.total_stock_usd || 0), 0),
      lowStock: list.reduce((s, p) => s + (p.low_stock_count || 0), 0),
    });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleStatus(proc) {
    const next = proc.status === 'active' ? 'suspended' : 'active';
    await supabase.from('processor_profiles').update({ status: next, updated_at: new Date().toISOString() }).eq('id', proc.id);
    load();
  }

  async function doRefill(e) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.target);
    await supabase.rpc('admin_refill_stock', {
      p_processor_id: refillModal.id,
      p_network:      fd.get('network'),
      p_country:      refillModal.country,
      p_amount_usd:   parseFloat(fd.get('amount')),
      p_notes:        fd.get('notes') || null,
    });
    setSaving(false);
    setRefillModal(null);
    load();
  }

  const stats = [
    { label: 'Total Processors', value: totals.total,               icon: Users,       color: 'text-blue-400'    },
    { label: 'Active',           value: totals.active,              icon: Wifi,        color: 'text-emerald-400' },
    { label: 'Total Stock',      value: `$${totals.stockUsd.toFixed(0)}`, icon: DollarSign, color: 'text-purple-400'  },
    { label: 'Low Stock Alerts', value: totals.lowStock,            icon: AlertTriangle, color: 'text-amber-400'  },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Liquidity Processor Network</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage processors, stock levels, and routing</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-all">
            <RefreshCw size={15} className={loading ? 'animate-spin text-blue-500' : 'text-slate-500'} />
          </button>
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">
            <Plus size={14} /> Add Processor
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon size={16} className={s.color} />
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{s.label}</p>
            </div>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Processor list */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={28} /></div>
      ) : processors.length === 0 ? (
        <div className="text-center py-20 text-slate-400 font-bold">No processors yet. Add your first one.</div>
      ) : (
        <div className="space-y-3">
          {processors.map(proc => {
            const isExpanded = expanded[proc.id];
            const stock = proc.stock || [];
            const hasLow = stock.some(s => s.balance_usd < s.low_threshold_usd);

            return (
              <div key={proc.id} className={`bg-white rounded-2xl border transition-all ${hasLow ? 'border-amber-300' : 'border-slate-200'}`}>
                {/* Header row */}
                <div className="flex items-center gap-4 p-4 cursor-pointer" onClick={() => setExpanded(e => ({ ...e, [proc.id]: !isExpanded }))}>
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center font-black text-blue-600 shrink-0">
                    {proc.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-slate-900 text-sm truncate">{proc.full_name}</p>
                      <StatusBadge status={proc.status} />
                      {hasLow && <AlertTriangle size={13} className="text-amber-500 shrink-0" />}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{proc.email} · {proc.country} · {proc.city}</p>
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-center">
                      <p className="text-[9px] text-slate-400 uppercase tracking-widest">Stock</p>
                      <p className="font-black text-sm text-emerald-600">${(proc.total_stock_usd || 0).toFixed(0)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-slate-400 uppercase tracking-widest">Active</p>
                      <p className="font-black text-sm text-blue-600">{proc.active_orders || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-slate-400 uppercase tracking-widest">Rating</p>
                      <p className="font-black text-sm text-amber-500">★ {Number(proc.cot_rating).toFixed(1)}</p>
                    </div>
                    {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </div>
                </div>

                {/* Expanded: stock + actions */}
                {isExpanded && (
                  <div className="border-t border-slate-100 p-4 space-y-4">
                    {/* Networks supported */}
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Networks</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(proc.supported_networks || []).map(n => (
                          <span key={n} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold">{n}</span>
                        ))}
                      </div>
                    </div>

                    {/* Stock per network */}
                    {stock.length > 0 && (
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Stock Levels</p>
                        <div className="grid grid-cols-2 gap-2">
                          {stock.map(s => (
                            <div key={`${s.network}-${s.country}`} className={`p-3 rounded-xl border ${s.balance_usd < s.low_threshold_usd ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-black text-slate-600">{s.network} · {s.country}</span>
                                <span className={`text-[10px] font-black ${s.balance_usd < s.low_threshold_usd ? 'text-red-500' : 'text-emerald-600'}`}>
                                  ${s.balance_usd.toFixed(0)}
                                </span>
                              </div>
                              <StockBar balanceUsd={s.balance_usd} thresholdUsd={s.low_threshold_usd} />
                              <p className="text-[9px] text-slate-400 mt-1">{s.balance_local.toFixed(0)} {s.currency_code}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setRefillModal(proc)}
                        className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all">
                        <Package size={12} /> Refill Stock
                      </button>
                      <button onClick={() => toggleStatus(proc)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${
                          proc.status === 'active'
                            ? 'bg-red-100 hover:bg-red-200 text-red-600'
                            : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-600'
                        }`}>
                        {proc.status === 'active' ? <><Ban size={12} /> Suspend</> : <><UserCheck size={12} /> Activate</>}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Processor Modal */}
      {showAddModal && (
        <AddProcessorModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); load(); }}
          sendWelcome={sendProcessorWelcomeEmail}
        />
      )}

      {/* Refill Modal */}
      {refillModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setRefillModal(null)}>
          <form onSubmit={doRefill} onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-slate-900">Refill Stock — {refillModal.full_name}</h2>
              <button type="button" onClick={() => setRefillModal(null)}><X size={18} className="text-slate-400" /></button>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Network</label>
              <select name="network" required className="w-full border border-slate-200 rounded-xl p-3 text-sm font-bold bg-white">
                {(refillModal.supported_networks || NETWORKS).map(n => <option key={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Amount (USD)</label>
              <input name="amount" type="number" step="0.01" min="1" required placeholder="100.00"
                className="w-full border border-slate-200 rounded-xl p-3 text-sm font-bold" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Notes (optional)</label>
              <input name="notes" type="text" placeholder="Bank transfer ref, etc."
                className="w-full border border-slate-200 rounded-xl p-3 text-sm" />
            </div>
            <button type="submit" disabled={saving}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm uppercase tracking-widest py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={14} />}
              Confirm Refill
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function AddProcessorModal({ onClose, onSaved, sendWelcome }) {
  const [saving, setSaving] = useState(false);
  const [selNetworks, setSelNetworks] = useState([]);
  const [stockRows, setStockRows] = useState([]);
  const [country, setCountry] = useState('');

  function toggleNetwork(n) {
    setSelNetworks(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]);
  }

  function addStockRow() {
    setStockRows(prev => [...prev, { network: selNetworks[0] || 'MTN', balance_usd: '', low_threshold_usd: '50' }]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.target);
    const countryInfo = COUNTRIES.find(c => c.code === country);

    const { data: proc, error } = await supabase
      .from('processor_profiles')
      .insert({
        full_name:          fd.get('full_name'),
        email:              fd.get('email'),
        phone:              fd.get('phone'),
        country:            country,
        city:               fd.get('city'),
        status:             'active',
        supported_networks: selNetworks,
        mobile_numbers:     selNetworks.reduce((acc, n) => {
          const val = fd.get(`mobile_${n}`);
          if (val) acc[n] = val;
          return acc;
        }, {}),
        max_order_usd:      parseFloat(fd.get('max_order_usd')) || 500,
        daily_limit_usd:    parseFloat(fd.get('daily_limit_usd')) || 2000,
        kyc_verified:       true,
      })
      .select('id')
      .single();

    if (error || !proc) { setSaving(false); return; }

    // Insert stock rows
    if (stockRows.length > 0 && countryInfo) {
      await supabase.from('processor_stock').insert(
        stockRows.map(r => ({
          processor_id:     proc.id,
          network:          r.network,
          country:          country,
          currency_code:    countryInfo.currency,
          exchange_rate:    countryInfo.rate,
          balance_usd:      parseFloat(r.balance_usd) || 0,
          balance_local:    (parseFloat(r.balance_usd) || 0) * countryInfo.rate,
          low_threshold_usd: parseFloat(r.low_threshold_usd) || 50,
        }))
      );
    }

    await sendWelcome(fd.get('email'), fd.get('full_name'));
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <form onSubmit={handleSubmit} onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 my-8">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-slate-900 text-lg">Add Processor</h2>
          <button type="button" onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label-xs">Full Name</label>
            <input name="full_name" required placeholder="Jean-Pierre Nkosi"
              className="input-field" />
          </div>
          <div>
            <label className="label-xs">Email</label>
            <input name="email" type="email" required placeholder="jean@example.com"
              className="input-field" />
          </div>
          <div>
            <label className="label-xs">Phone</label>
            <input name="phone" placeholder="+256 700 000 000"
              className="input-field" />
          </div>
          <div>
            <label className="label-xs">Country</label>
            <select required value={country} onChange={e => setCountry(e.target.value)} className="input-field">
              <option value="">— Select —</option>
              {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label-xs">City</label>
            <input name="city" placeholder="Kampala" className="input-field" />
          </div>
          <div>
            <label className="label-xs">Max Order (USD)</label>
            <input name="max_order_usd" type="number" defaultValue="500" className="input-field" />
          </div>
          <div>
            <label className="label-xs">Daily Limit (USD)</label>
            <input name="daily_limit_usd" type="number" defaultValue="2000" className="input-field" />
          </div>
        </div>

        {/* Networks */}
        <div>
          <label className="label-xs mb-2 block">Supported Networks</label>
          <div className="flex flex-wrap gap-2">
            {NETWORKS.map(n => (
              <button key={n} type="button" onClick={() => toggleNetwork(n)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                  selNetworks.includes(n) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile numbers per network */}
        {selNetworks.length > 0 && (
          <div className="space-y-2">
            <label className="label-xs">Mobile Numbers</label>
            {selNetworks.map(n => (
              <div key={n} className="flex items-center gap-2">
                <span className="text-[10px] font-black w-16 text-slate-500">{n}</span>
                <input name={`mobile_${n}`} placeholder={`+256 7XX XXX XXX`}
                  className="flex-1 border border-slate-200 rounded-xl p-2.5 text-sm font-mono" />
              </div>
            ))}
          </div>
        )}

        {/* Initial stock */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label-xs">Initial Stock</label>
            <button type="button" onClick={addStockRow}
              className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 flex items-center gap-1">
              <Plus size={10} /> Add Row
            </button>
          </div>
          {stockRows.map((row, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <select value={row.network} onChange={e => setStockRows(prev => prev.map((r,j) => j===i ? {...r, network: e.target.value} : r))}
                className="border border-slate-200 rounded-xl p-2 text-xs w-24 font-bold bg-white">
                {selNetworks.map(n => <option key={n}>{n}</option>)}
              </select>
              <input type="number" placeholder="Balance (USD)" value={row.balance_usd}
                onChange={e => setStockRows(prev => prev.map((r,j) => j===i ? {...r, balance_usd: e.target.value} : r))}
                className="flex-1 border border-slate-200 rounded-xl p-2 text-xs" />
              <input type="number" placeholder="Low alert $" value={row.low_threshold_usd}
                onChange={e => setStockRows(prev => prev.map((r,j) => j===i ? {...r, low_threshold_usd: e.target.value} : r))}
                className="w-20 border border-slate-200 rounded-xl p-2 text-xs" />
              <button type="button" onClick={() => setStockRows(prev => prev.filter((_,j) => j!==i))}
                className="text-red-400 hover:text-red-600 transition-colors"><X size={14} /></button>
            </div>
          ))}
        </div>

        <button type="submit" disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-sm uppercase tracking-widest py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={14} />}
          Add & Activate Processor
        </button>
      </form>
    </div>
  );
}
