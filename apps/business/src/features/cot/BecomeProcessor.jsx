import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useTranslation } from '../../i18n/useTranslation';
import {
  Users, Shield, Star, CheckCircle, ChevronRight, Loader2,
  Landmark, Smartphone, Wallet, HandCoins, MapPin, TrendingUp,
  AlertCircle, Clock, Award, DollarSign, BarChart2,
} from 'lucide-react';

const PAYMENT_OPTIONS = [
  { id: 'bank_transfer', icon: Landmark, label: 'Bank Transfer' },
  { id: 'mobile_money', icon: Smartphone, label: 'Mobile Money' },
  { id: 'digital_wallet', icon: Wallet, label: 'Digital Wallet' },
  { id: 'physical_cash', icon: HandCoins, label: 'Physical Cash' },
];

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function BecomeProcessor({ session, profile }) {
  const { t } = useTranslation();
  const [view, setView] = useState('loading'); // loading | apply | pending | active | dashboard
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [cotProfile, setCotProfile] = useState(null);
  const [earnings, setEarnings] = useState([]);

  const [form, setForm] = useState({
    payment_methods: [],
    min_amount: '10',
    max_amount: '500',
    service_radius_km: '10',
    agreed: false,
  });

  useEffect(() => {
    loadCotStatus();
  }, []);

  const loadCotStatus = async () => {
    try {
      const { data: p } = await supabase
        .from('profiles')
        .select('is_cot_processor, cot_rating, cot_completed_tx, cot_payment_methods, latitude, longitude')
        .eq('id', session.user.id)
        .single();

      const { data: app } = await supabase
        .from('cot_applications')
        .select('status, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .maybeSingle();

      setCotProfile({ ...p, application: app });

      if (p?.is_cot_processor) setView('dashboard');
      else if (app?.status === 'pending') setView('pending');
      else if (app?.status === 'rejected') setView('apply');
      else setView('apply');
    } catch {
      setView('apply');
    }
  };

  const loadEarnings = async () => {
    const { data } = await supabase
      .from('p2p_orders')
      .select('amount_usd, cot_fee_earned, created_at, status, order_type')
      .eq('processor_id', session.user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(20);
    setEarnings(data || []);
  };

  useEffect(() => {
    if (view === 'dashboard') loadEarnings();
  }, [view]);

  const togglePaymentMethod = (id) => {
    setForm(f => ({
      ...f,
      payment_methods: f.payment_methods.includes(id)
        ? f.payment_methods.filter(m => m !== id)
        : [...f.payment_methods, id],
    }));
  };

  const handleSubmit = async () => {
    if (!form.agreed) { setError(t('cot.agreedTerms')); return; }
    if (form.payment_methods.length === 0) { setError(t('cot.paymentMethods')); return; }
    setIsSubmitting(true);
    setError('');
    try {
      await supabase.from('cot_applications').insert([{
        user_id: session.user.id,
        status: 'pending',
        payment_methods: form.payment_methods,
        min_amount_usd: parseFloat(form.min_amount),
        max_amount_usd: parseFloat(form.max_amount),
        service_radius_km: parseFloat(form.service_radius_km),
        full_name: profile?.full_name,
        email: session.user.email,
      }]);
      setView('pending');
    } catch (e) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateLocation = async () => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          await supabase.from('profiles').update({
            latitude: coords.latitude,
            longitude: coords.longitude,
          }).eq('id', session.user.id);
          resolve(coords);
        },
        reject,
        { enableHighAccuracy: true }
      );
    });
  };

  const handleUpdateLocation = async () => {
    try {
      await updateLocation();
      alert('Location updated!');
    } catch {
      alert('Could not get location.');
    }
  };

  const totalEarned = earnings.reduce((s, e) => s + (e.cot_fee_earned || 0), 0);

  // ─── VIEWS ────────────────────────────────────────────────

  if (view === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  if (view === 'pending') {
    return (
      <div className="max-w-lg mx-auto text-center py-16 px-6 space-y-6">
        <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
          <Clock size={36} className="text-amber-600" />
        </div>
        <h2 className="text-2xl font-black text-slate-800">{t('cot.applicationPending')}</h2>
        <p className="text-slate-500 text-sm leading-relaxed">
          {t('lang') === 'fr'
            ? 'Votre candidature est en cours d\'examen par notre équipe. Vous serez notifié dans 24-48 heures.'
            : 'Your application is being reviewed. You\'ll be notified within 24–48 hours.'}
        </p>
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-left space-y-2">
          <p className="text-xs font-black uppercase tracking-widest text-amber-700">{t('cot.requirements')}</p>
          <p className="text-xs text-amber-600">{t('cot.requirementsDesc')}</p>
        </div>
      </div>
    );
  }

  if (view === 'dashboard') {
    return (
      <div className="space-y-6">
        {/* Status badge */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-800">{t('cot.myProfile')}</h2>
            <p className="text-xs text-slate-500">{t('cot.earningRate')}</p>
          </div>
          <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest">
            {t('cot.active')}
          </span>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-4 text-center">
            <DollarSign size={18} className="text-emerald-600 mx-auto mb-1" />
            <p className="text-lg font-black text-emerald-700">${totalEarned.toFixed(2)}</p>
            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">{t('cot.totalEarned')}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 text-center">
            <BarChart2 size={18} className="text-blue-600 mx-auto mb-1" />
            <p className="text-lg font-black text-blue-700">{cotProfile?.cot_completed_tx || 0}</p>
            <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">{t('cot.totalTrades')}</p>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-4 text-center">
            <Star size={18} className="text-amber-600 mx-auto mb-1" />
            <p className="text-lg font-black text-amber-700">{cotProfile?.cot_rating || 100}%</p>
            <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">{t('cot.rating')}</p>
          </div>
        </div>

        {/* Location update */}
        <button
          onClick={handleUpdateLocation}
          className="w-full flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-2xl hover:bg-blue-100 transition-all"
        >
          <MapPin size={18} className="text-blue-600" />
          <div className="text-left">
            <p className="text-xs font-black text-blue-700">Update My Location</p>
            <p className="text-[10px] text-blue-500">
              {cotProfile?.latitude ? `${cotProfile.latitude.toFixed(4)}, ${cotProfile.longitude.toFixed(4)}` : 'No location set'}
            </p>
          </div>
        </button>

        {/* Recent earnings */}
        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">{t('cot.earnings')}</p>
          {earnings.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-sm">{t('cot.noEarnings')}</div>
          ) : (
            <div className="space-y-2">
              {earnings.map(e => (
                <div key={e.id || e.created_at} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
                  <div>
                    <p className="text-xs font-bold text-slate-700 capitalize">{e.order_type} — ${e.amount_usd}</p>
                    <p className="text-[10px] text-slate-400">{new Date(e.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="text-sm font-black text-emerald-600">+${(e.cot_fee_earned || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── APPLICATION FLOW ────────────────────────────────────

  const steps = [
    t('cot.step1Title'), t('cot.step2Title'),
    t('cot.step3Title'), t('cot.step4Title'),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center mx-auto shadow-lg">
          <Users size={28} className="text-white" />
        </div>
        <h2 className="text-xl font-black text-slate-800">{t('cot.becomeTitle')}</h2>
        <p className="text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">{t('cot.becomeDesc')}</p>
      </div>

      {/* Step indicator */}
      <div className="flex gap-1.5">
        {steps.map((s, i) => (
          <div
            key={i}
            className={`flex-1 h-1.5 rounded-full transition-all ${i + 1 <= step ? 'bg-blue-500' : 'bg-slate-200'}`}
          />
        ))}
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
        {t('common.of') ? `${step} ${t('common.of')} ${steps.length}` : `Step ${step}/${steps.length}`} — {steps[step - 1]}
      </p>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Step 1: Requirements check */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-blue-700">{t('cot.requirements')}</p>
            {[
              { ok: profile?.kyc_status === 'approved', label: t('cot.requirementsDesc').split('·')[0].trim() },
              { ok: true, label: 'Compte actif' },
              { ok: true, label: 'Aucune violation signalée' },
            ].map((req, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${req.ok ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                  <CheckCircle size={12} className="text-white" />
                </div>
                <span className={`text-xs font-bold ${req.ok ? 'text-slate-700' : 'text-slate-400'}`}>{req.label}</span>
              </div>
            ))}
          </div>
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
            <p className="text-xs font-black text-amber-700 flex items-center gap-2">
              <TrendingUp size={14} /> {t('cot.earningRate')}
            </p>
          </div>
          <button
            onClick={() => setStep(2)}
            className="w-full bg-blue-600 text-white font-black text-sm uppercase tracking-widest py-4 rounded-2xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
          >
            {t('common.next')} <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Step 2: Payment methods */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">{t('cot.paymentMethods')}</p>
          <div className="grid grid-cols-2 gap-3">
            {PAYMENT_OPTIONS.map(opt => {
              const Icon = opt.icon;
              const selected = form.payment_methods.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => togglePaymentMethod(opt.id)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    selected
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Icon size={20} className="mb-2" />
                  <p className="text-xs font-black">{opt.label}</p>
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep(1)} className="flex-1 py-4 rounded-2xl border border-slate-200 text-slate-600 text-sm font-black hover:bg-slate-50 transition-all">{t('common.previous')}</button>
            <button
              onClick={() => form.payment_methods.length > 0 ? setStep(3) : setError(t('cot.paymentMethods'))}
              className="flex-2 flex-1 bg-blue-600 text-white font-black text-sm uppercase tracking-widest py-4 rounded-2xl hover:bg-blue-700 transition-all"
            >
              {t('common.next')}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Area & limits */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="space-y-3">
            {[
              { key: 'min_amount', label: t('cot.minAmount'), placeholder: '10' },
              { key: 'max_amount', label: t('cot.maxAmount'), placeholder: '500' },
              { key: 'service_radius_km', label: t('cot.serviceRadius'), placeholder: '10' },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">{field.label}</label>
                <input
                  type="number"
                  value={form[field.key]}
                  onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-400 transition-all"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep(2)} className="flex-1 py-4 rounded-2xl border border-slate-200 text-slate-600 text-sm font-black hover:bg-slate-50 transition-all">{t('common.previous')}</button>
            <button onClick={() => setStep(4)} className="flex-1 bg-blue-600 text-white font-black text-sm uppercase tracking-widest py-4 rounded-2xl hover:bg-blue-700 transition-all">{t('common.next')}</button>
          </div>
        </div>
      )}

      {/* Step 4: Agreement */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 leading-relaxed space-y-3 max-h-48 overflow-y-auto">
            <p className="font-black text-slate-800">COT Terms of Service</p>
            <p>By becoming a COT Processor, you agree to: handle all transactions honestly and transparently; meet clients only in safe, public locations; never charge fees outside the IFB platform; maintain your availability status accurately; and comply with local financial regulations in your jurisdiction.</p>
            <p>IFB reserves the right to suspend or terminate your COT status for violations. Your 1% fee is credited automatically upon transaction confirmation by both parties.</p>
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <div
              onClick={() => setForm(f => ({ ...f, agreed: !f.agreed }))}
              className={`w-5 h-5 rounded flex-shrink-0 mt-0.5 border-2 flex items-center justify-center transition-all ${
                form.agreed ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
              }`}
            >
              {form.agreed && <CheckCircle size={12} className="text-white" />}
            </div>
            <span className="text-xs text-slate-600">{t('cot.agreedTerms')}</span>
          </label>
          <div className="flex gap-2">
            <button onClick={() => setStep(3)} className="flex-1 py-4 rounded-2xl border border-slate-200 text-slate-600 text-sm font-black hover:bg-slate-50 transition-all">{t('common.previous')}</button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !form.agreed}
              className="flex-1 bg-emerald-600 text-white font-black text-sm uppercase tracking-widest py-4 rounded-2xl hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Award size={16} />}
              {t('cot.submitApplication')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
