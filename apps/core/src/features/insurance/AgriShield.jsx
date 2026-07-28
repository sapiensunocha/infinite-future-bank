import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
  Leaf, ShieldCheck, CloudRain, Thermometer, Droplets, Bug, Waves,
  Plus, FileText, Clock, CheckCircle, XCircle, AlertCircle,
  MapPin, Calendar, ChevronRight, ChevronDown, BarChart3, DollarSign
} from 'lucide-react';

const CROPS = [
  'Maize (Corn)', 'Wheat', 'Rice', 'Cassava', 'Sorghum', 'Millet',
  'Coffee', 'Cocoa', 'Cotton', 'Soybean', 'Sunflower', 'Groundnut',
  'Banana', 'Plantain', 'Tomato', 'Onion', 'Potato', 'Sweet Potato',
];

const TRIGGER_TYPES = [
  { id: 'rainfall',    Icon: CloudRain,   label: 'Rainfall Deficit',  desc: 'Pays out when rainfall drops below threshold' },
  { id: 'drought',     Icon: Droplets,    label: 'Drought Index',     desc: 'Pays out during prolonged dry conditions' },
  { id: 'flood',       Icon: Waves,       label: 'Flood Event',       desc: 'Pays out when flooding affects farm region' },
  { id: 'temperature', Icon: Thermometer, label: 'Extreme Temperature', desc: 'Pays out when temps exceed safe range' },
  { id: 'pest',        Icon: Bug,         label: 'Pest Outbreak',     desc: 'Pays out during declared pest emergencies' },
];

const AFRICAN_COUNTRIES = [
  'Nigeria', 'Kenya', 'Ethiopia', 'Ghana', 'Tanzania', 'Uganda', 'Cameroon',
  'Ivory Coast', 'Mozambique', 'Zimbabwe', 'Zambia', 'Malawi', 'Rwanda',
  'Senegal', 'Mali', 'Burkina Faso', 'Niger', 'Chad', 'South Africa', 'Egypt',
  'Sudan', 'DRC', 'Angola', 'Botswana', 'Namibia', 'Madagascar', 'Other',
];

const STATUS_CONFIG = {
  active:          { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle, label: 'Active' },
  expired:         { color: 'bg-slate-100 text-slate-600',     icon: Clock,       label: 'Expired' },
  cancelled:       { color: 'bg-red-100 text-red-700',         icon: XCircle,     label: 'Cancelled' },
  claimed:         { color: 'bg-blue-100 text-blue-700',       icon: ShieldCheck, label: 'Claimed' },
  pending_payment: { color: 'bg-amber-100 text-amber-700',     icon: AlertCircle, label: 'Payment Due' },
};

function calcPremium(cropType, farmSizeHa, coverageAmount) {
  // Base rate ~1.8% of coverage per year, adjusted for crop risk
  const riskMultiplier = ['Coffee', 'Cocoa', 'Cotton'].some(c => cropType.startsWith(c)) ? 1.4 : 1.0;
  const annual = coverageAmount * 0.018 * riskMultiplier;
  const sizeAdj = Math.min(farmSizeHa / 10, 2); // cap at 2x for large farms
  return Math.max(5, Math.round((annual * (1 + sizeAdj * 0.1)) / 12 * 100) / 100);
}

function fmt(val) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(val || 0);
}

export default function AgriShield({ session, balances, fetchAllData }) {
  const [view, setView] = useState('HOME');
  const [policies, setPolicies] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const [form, setForm] = useState({
    crop_type: '',
    farm_country: '',
    farm_region: '',
    farm_size_ha: '',
    coverage_amount_usd: '',
    trigger_type: 'rainfall',
    trigger_threshold: '',
    coverage_start: '',
    coverage_end: '',
  });

  const notify = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: pol }, { data: clm }] = await Promise.all([
      supabase.from('insurance_policies').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
      supabase.from('insurance_claims').select('*').eq('user_id', session.user.id).order('filed_at', { ascending: false }),
    ]);
    setPolicies(pol || []);
    setClaims(clm || []);
    setLoading(false);
  }, [session.user.id]);

  useEffect(() => { load(); }, [load]);

  const premium = form.coverage_amount_usd && form.crop_type && form.farm_size_ha
    ? calcPremium(form.crop_type, parseFloat(form.farm_size_ha), parseFloat(form.coverage_amount_usd))
    : null;

  const handleNewPolicy = async (e) => {
    e.preventDefault();
    if (!premium) return;
    if ((balances?.liquid_usd || 0) < premium) return notify('Insufficient balance for first premium', 'error');
    setSubmitting(true);
    try {
      // Create policy
      const { data: policy, error: polErr } = await supabase.from('insurance_policies').insert({
        user_id: session.user.id,
        crop_type: form.crop_type,
        farm_country: form.farm_country,
        farm_region: form.farm_region,
        farm_size_ha: parseFloat(form.farm_size_ha),
        coverage_amount_usd: parseFloat(form.coverage_amount_usd),
        premium_monthly_usd: premium,
        trigger_type: form.trigger_type,
        trigger_threshold: form.trigger_threshold,
        coverage_start: form.coverage_start,
        coverage_end: form.coverage_end,
        next_premium_due: new Date(new Date(form.coverage_start).setMonth(new Date(form.coverage_start).getMonth() + 1)).toISOString().split('T')[0],
      }).select().single();
      if (polErr) throw polErr;

      // Charge first premium
      const { data: res, error: rpcErr } = await supabase.rpc('pay_insurance_premium', {
        p_user_id: session.user.id,
        p_policy_id: policy.id,
        p_amount: premium,
        p_period: form.coverage_start,
      });
      if (rpcErr) throw rpcErr;
      if (res?.error) throw new Error(res.error);

      notify(`Policy created! First premium of ${fmt(premium)} charged.`);
      setForm({ crop_type:'', farm_country:'', farm_region:'', farm_size_ha:'', coverage_amount_usd:'', trigger_type:'rainfall', trigger_threshold:'', coverage_start:'', coverage_end:'' });
      await Promise.all([load(), fetchAllData()]);
      setView('POLICIES');
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const payPremium = async (policy) => {
    if ((balances?.liquid_usd || 0) < policy.premium_monthly_usd) return notify('Insufficient balance', 'error');
    setSubmitting(true);
    try {
      const { data: res, error } = await supabase.rpc('pay_insurance_premium', {
        p_user_id: session.user.id,
        p_policy_id: policy.id,
        p_amount: policy.premium_monthly_usd,
        p_period: new Date().toISOString().split('T')[0],
      });
      if (error) throw error;
      if (res?.error) throw new Error(res.error);
      notify(`Premium of ${fmt(policy.premium_monthly_usd)} paid`);
      await Promise.all([load(), fetchAllData()]);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const activeCount = policies.filter(p => p.status === 'active').length;
  const totalCoverage = policies.filter(p => p.status === 'active').reduce((s, p) => s + p.coverage_amount_usd, 0);

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl text-white text-sm font-bold shadow-xl animate-in slide-in-from-top-2 ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
          {toast.msg}
        </div>
      )}

      {/* HERO */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-green-800 to-teal-900 rounded-[2rem] p-8 text-white shadow-2xl">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/5 rounded-full" />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-white/5 rounded-full" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
              <Leaf size={22} className="text-emerald-200" />
            </div>
            <div>
              <p className="text-emerald-200 text-[10px] font-black uppercase tracking-widest">AgriShield</p>
              <p className="text-emerald-300 text-[9px]">Parametric Agricultural Insurance</p>
            </div>
          </div>
          <h2 className="text-2xl font-black mt-2 leading-tight">Protect your harvest.<br />Secure your income.</h2>
          <p className="text-emerald-300 text-sm mt-3 leading-relaxed">
            Automatic payouts triggered by satellite weather data — no claims process, no paperwork, no delays.
          </p>
          {activeCount > 0 && (
            <div className="flex gap-4 mt-5 pt-5 border-t border-white/10">
              <div>
                <p className="text-emerald-300 text-[10px]">Active Policies</p>
                <p className="text-xl font-black">{activeCount}</p>
              </div>
              <div className="w-px bg-white/10" />
              <div>
                <p className="text-emerald-300 text-[10px]">Total Coverage</p>
                <p className="text-xl font-black">{fmt(totalCoverage)}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* NAV TABS */}
      <div className="flex bg-slate-100 rounded-2xl p-1 gap-1">
        {[
          { id: 'HOME',     label: 'Overview' },
          { id: 'NEW',      label: 'New Policy' },
          { id: 'POLICIES', label: `Policies${policies.length ? ` (${policies.length})` : ''}` },
          { id: 'CLAIMS',   label: `Claims${claims.length ? ` (${claims.length})` : ''}` },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
              view === t.id ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {view === 'HOME' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: ShieldCheck, title: 'Parametric Payouts', body: 'Triggered automatically by verified satellite and weather station data — no assessor visit needed.' },
              { icon: CloudRain,   title: '5 Trigger Types',    body: 'Rainfall, drought, flood, temperature extremes, and declared pest outbreaks.' },
              { icon: Calendar,    title: 'Seasonal Coverage',  body: 'Match your coverage window to your planting and harvest cycle.' },
              { icon: DollarSign,  title: 'From $5/month',      body: 'Premiums scale with farm size and coverage amount. Affordable for smallholders.' },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm p-5">
                <Icon size={20} className="text-emerald-600 mb-2" />
                <p className="text-xs font-black text-slate-800">{title}</p>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>

          <div className="bg-emerald-50 border border-emerald-100 rounded-[1.5rem] p-5">
            <h4 className="text-sm font-black text-emerald-900 mb-2">How it works</h4>
            {[
              { n: '1', t: 'Choose your crop, region, and coverage amount' },
              { n: '2', t: 'Set your trigger type and threshold (e.g. rainfall < 80mm/month)' },
              { n: '3', t: 'Pay monthly premium automatically from your IFB balance' },
              { n: '4', t: 'If the trigger fires, payout credited to your account instantly' },
            ].map(({ n, t }) => (
              <div key={n} className="flex items-start gap-3 mb-2 last:mb-0">
                <span className="w-5 h-5 bg-emerald-600 text-white text-[10px] font-black rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">{n}</span>
                <p className="text-xs text-emerald-800">{t}</p>
              </div>
            ))}
          </div>

          <button
            onClick={() => setView('NEW')}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Get Covered Now
          </button>
        </div>
      )}

      {/* ── NEW POLICY ── */}
      {view === 'NEW' && (
        <form onSubmit={handleNewPolicy} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 space-y-5">
          <h3 className="text-lg font-black text-slate-800">New AgriShield Policy</h3>

          {/* Crop */}
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2 block">Crop Type *</label>
            <select
              required value={form.crop_type}
              onChange={e => setForm(p => ({ ...p, crop_type: e.target.value }))}
              className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 font-medium focus:outline-none focus:border-emerald-400 bg-white"
            >
              <option value="">Select crop…</option>
              {CROPS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2 block">Country *</label>
              <select
                required value={form.farm_country}
                onChange={e => setForm(p => ({ ...p, farm_country: e.target.value }))}
                className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 font-medium focus:outline-none focus:border-emerald-400 bg-white"
              >
                <option value="">Country…</option>
                {AFRICAN_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2 block">Region / State *</label>
              <input
                required value={form.farm_region}
                onChange={e => setForm(p => ({ ...p, farm_region: e.target.value }))}
                placeholder="e.g. Ogun State"
                className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 font-medium focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50"
              />
            </div>
          </div>

          {/* Farm size + coverage */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2 block">Farm Size (ha) *</label>
              <input
                required type="number" min="0.1" step="0.1" value={form.farm_size_ha}
                onChange={e => setForm(p => ({ ...p, farm_size_ha: e.target.value }))}
                placeholder="2.5"
                className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 font-medium focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2 block">Coverage Amount ($) *</label>
              <input
                required type="number" min="100" step="100" value={form.coverage_amount_usd}
                onChange={e => setForm(p => ({ ...p, coverage_amount_usd: e.target.value }))}
                placeholder="1000"
                className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 font-medium focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50"
              />
            </div>
          </div>

          {/* Trigger type */}
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2 block">Trigger Type *</label>
            <div className="grid grid-cols-1 gap-2">
              {TRIGGER_TYPES.map(({ id, Icon, label, desc }) => (
                <button
                  key={id} type="button"
                  onClick={() => setForm(p => ({ ...p, trigger_type: id }))}
                  className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${
                    form.trigger_type === id
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                      : 'border-slate-100 hover:border-slate-200 text-slate-700'
                  }`}
                >
                  <Icon size={18} className={form.trigger_type === id ? 'text-emerald-600' : 'text-slate-400'} />
                  <div>
                    <p className="text-xs font-black">{label}</p>
                    <p className="text-[10px] text-slate-500">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Trigger threshold */}
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2 block">Trigger Threshold *</label>
            <input
              required value={form.trigger_threshold}
              onChange={e => setForm(p => ({ ...p, trigger_threshold: e.target.value }))}
              placeholder={
                form.trigger_type === 'rainfall' ? 'e.g. Below 80mm/month for 3 consecutive months' :
                form.trigger_type === 'temperature' ? 'e.g. Above 45°C for 5+ days' :
                form.trigger_type === 'flood' ? 'e.g. Government flood declaration in my region' :
                form.trigger_type === 'drought' ? 'e.g. SPI drought index < -1.5' :
                'e.g. Government pest emergency declaration'
              }
              className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 font-medium focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50"
            />
          </div>

          {/* Coverage period */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2 block">Coverage Start *</label>
              <input
                required type="date" value={form.coverage_start}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setForm(p => ({ ...p, coverage_start: e.target.value }))}
                className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 font-medium focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2 block">Coverage End *</label>
              <input
                required type="date" value={form.coverage_end}
                min={form.coverage_start || new Date().toISOString().split('T')[0]}
                onChange={e => setForm(p => ({ ...p, coverage_end: e.target.value }))}
                className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 font-medium focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          {/* Premium preview */}
          {premium && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-emerald-600 font-medium">Monthly Premium</p>
                  <p className="text-3xl font-black text-emerald-700">{fmt(premium)}<span className="text-base text-emerald-500">/mo</span></p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-emerald-600 font-medium">Coverage</p>
                  <p className="text-xl font-black text-emerald-700">{fmt(parseFloat(form.coverage_amount_usd))}</p>
                </div>
              </div>
              <p className="text-[10px] text-emerald-600 mt-3">First premium charged on activation. Rate: ~1.8% of coverage/year + risk adjustment.</p>
            </div>
          )}

          <button
            type="submit" disabled={submitting || !premium}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl transition-colors disabled:opacity-50"
          >
            {submitting ? 'Activating Policy…' : `Activate Policy — ${premium ? fmt(premium) + '/mo' : ''}`}
          </button>
        </form>
      )}

      {/* ── MY POLICIES ── */}
      {view === 'POLICIES' && (
        <div className="space-y-4">
          {policies.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
              <Leaf size={40} className="text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">No policies yet</p>
              <button onClick={() => setView('NEW')} className="mt-4 text-emerald-600 font-black text-sm">Get covered →</button>
            </div>
          ) : policies.map(policy => {
            const sc = STATUS_CONFIG[policy.status] || STATUS_CONFIG.active;
            const isOpen = expanded === policy.id;
            return (
              <div key={policy.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : policy.id)}
                  className="w-full p-6 text-left flex items-start justify-between"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <Leaf size={22} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-black text-slate-800 text-sm">{policy.crop_type}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <MapPin size={10} />{policy.farm_region}, {policy.farm_country}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{policy.policy_number}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${sc.color}`}>{sc.label}</span>
                    {isOpen ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 space-y-4 border-t border-slate-50 pt-4">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Coverage', value: fmt(policy.coverage_amount_usd) },
                        { label: 'Monthly Premium', value: fmt(policy.premium_monthly_usd) },
                        { label: 'Farm Size', value: `${policy.farm_size_ha} ha` },
                        { label: 'Trigger', value: policy.trigger_type.replace('_', ' ') },
                        { label: 'Start', value: new Date(policy.coverage_start).toLocaleDateString() },
                        { label: 'End', value: new Date(policy.coverage_end).toLocaleDateString() },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p className="text-[9px] text-slate-400 uppercase font-black">{label}</p>
                          <p className="text-xs font-bold text-slate-700 capitalize">{value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-3">
                      <p className="text-[9px] text-slate-400 uppercase font-black mb-1">Trigger Threshold</p>
                      <p className="text-xs text-slate-700">{policy.trigger_threshold}</p>
                    </div>
                    {policy.status === 'pending_payment' && (
                      <button
                        onClick={() => payPremium(policy)} disabled={submitting}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-3 rounded-2xl text-sm transition-colors disabled:opacity-50"
                      >
                        Pay Premium {fmt(policy.premium_monthly_usd)}
                      </button>
                    )}
                    {policy.next_premium_due && policy.status === 'active' && (
                      <p className="text-[10px] text-slate-400 text-center">
                        Next premium due: {new Date(policy.next_premium_due).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── CLAIMS ── */}
      {view === 'CLAIMS' && (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-xs text-emerald-800">
            <strong>Parametric claims are automatic.</strong> When satellite or weather data confirms a trigger event in your region, your payout is processed within 48 hours — no action required from you.
          </div>
          {claims.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
              <ShieldCheck size={40} className="text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">No claims on record</p>
              <p className="text-slate-400 text-xs mt-1">Claims appear here when a trigger event is detected</p>
            </div>
          ) : claims.map(claim => {
            const isPaid = claim.status === 'paid';
            return (
              <div key={claim.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-black text-slate-800 text-sm capitalize">{claim.trigger_type.replace('_', ' ')} Event</p>
                    <p className="text-[10px] text-slate-400">{new Date(claim.filed_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${
                    isPaid ? 'bg-emerald-100 text-emerald-700' :
                    claim.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {claim.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-slate-500">Payout Amount</p>
                  <p className={`text-lg font-black ${isPaid ? 'text-emerald-600' : 'text-slate-600'}`}>{fmt(claim.payout_amount)}</p>
                </div>
                {claim.admin_notes && (
                  <p className="text-[10px] text-slate-500 mt-3 bg-slate-50 rounded-xl p-3">{claim.admin_notes}</p>
                )}
                {isPaid && claim.paid_at && (
                  <p className="text-[10px] text-emerald-600 mt-2">Paid on {new Date(claim.paid_at).toLocaleDateString()}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
