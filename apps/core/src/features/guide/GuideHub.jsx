import { useState, lazy, Suspense } from 'react';
import { X, BookOpen, ArrowRight, CreditCard, Building2 } from 'lucide-react';

const CompanyGuide     = lazy(() => import('./CompanyGuide'));
const TransactionGuide = lazy(() => import('./TransactionGuide'));

const PageLoader = () => (
  <div className="fixed inset-0 z-[9999] bg-[#0a0f1e] flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
  </div>
);

const GUIDES = [
  {
    id: 'business',
    icon: Building2,
    color: 'blue',
    title: { en: 'Business Guide', fr: 'Guide Entreprise', es: 'Guía Empresarial' },
    desc: {
      en: 'Complete company journey — formation, KYC, banking, capital raising, insurance, and more. 14 stages · Assessment · Certificate',
      fr: 'Parcours complet — formation, KYC, banque, levée de fonds, assurance et plus. 14 étapes · Évaluation · Certificat',
      es: 'Recorrido completo — formación, KYC, banca, captación de capital, seguros y más. 14 etapas · Evaluación · Certificado',
    },
    slides: 14,
  },
  {
    id: 'transactions',
    icon: CreditCard,
    color: 'emerald',
    title: { en: 'Transaction Guide', fr: 'Guide des Transactions', es: 'Guía de Transacciones' },
    desc: {
      en: 'Every transaction explained — deposits, transfers, QR payments, Tap to Pay, withdrawals, invoicing, and statements. 14 modules · Assessment · Certificate',
      fr: 'Chaque transaction expliquée — dépôts, virements, paiements QR, Tap to Pay, retraits, facturation et relevés. 14 modules · Évaluation · Certificat',
      es: 'Cada transacción explicada — depósitos, transferencias, pagos QR, Tap to Pay, retiros, facturación y estados. 14 módulos · Evaluación · Certificado',
    },
    slides: 14,
  },
];

const colorMap = {
  blue:    { bg: 'bg-blue-600/10',    border: 'border-blue-600/30',    icon: 'text-blue-400',    btn: 'bg-blue-600 hover:bg-blue-700' },
  emerald: { bg: 'bg-emerald-600/10', border: 'border-emerald-600/30', icon: 'text-emerald-400', btn: 'bg-emerald-600 hover:bg-emerald-700' },
};

export default function GuideHub({ onClose }) {
  const [active, setActive] = useState(null); // null | 'business' | 'transactions'
  const [lang, setLang] = useState('en');

  if (active === 'business')
    return (
      <Suspense fallback={<PageLoader />}>
        <CompanyGuide onClose={() => setActive(null)} />
      </Suspense>
    );

  if (active === 'transactions')
    return (
      <Suspense fallback={<PageLoader />}>
        <TransactionGuide onClose={() => setActive(null)} />
      </Suspense>
    );

  const hubTitle = { en: 'Guides', fr: 'Guides', es: 'Guías' };
  const hubSub   = { en: 'Choose a guide to start learning', fr: 'Choisissez un guide pour commencer', es: 'Elige una guía para comenzar' };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0a0f1e] flex flex-col">
      {/* Top bar */}
      <div className="bg-[#0a0f1e] border-b border-slate-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black">
            <span className="text-[#4285F4]">D</span>
            <span className="text-[#EA4335]">E</span>
            <span className="text-[#FBBC04]">U</span>
            <span className="text-[#34A853]">S</span>
          </span>
          <span className="text-slate-400 text-xs font-black uppercase tracking-widest">{hubTitle[lang]}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-800 rounded-xl p-1">
            {['en', 'fr', 'es'].map((l) => (
              <button key={l} onClick={() => setLang(l)}
                className={`text-[10px] font-black px-2 py-1 rounded-lg transition-colors ${lang === l ? 'bg-white text-slate-900' : 'text-white'}`}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
        <BookOpen size={32} className="text-slate-600 mb-4" />
        <h1 className="text-2xl font-black text-white mb-1">{hubTitle[lang]}</h1>
        <p className="text-slate-400 text-sm mb-10">{hubSub[lang]}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-2xl">
          {GUIDES.map((g) => {
            const c = colorMap[g.color];
            const Icon = g.icon;
            return (
              <button key={g.id} onClick={() => setActive(g.id)}
                className={`text-left ${c.bg} border ${c.border} rounded-3xl p-6 hover:scale-[1.02] transition-transform group`}>
                <div className={`w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mb-4 ${c.icon}`}>
                  <Icon size={22} />
                </div>
                <h2 className="text-white font-black text-lg mb-2 leading-tight">{g.title[lang]}</h2>
                <p className="text-slate-400 text-xs leading-relaxed mb-4">{g.desc[lang]}</p>
                <div className={`inline-flex items-center gap-2 ${c.btn} text-white text-xs font-black px-4 py-2 rounded-xl transition-colors`}>
                  {lang === 'fr' ? 'Commencer' : lang === 'es' ? 'Comenzar' : 'Start Guide'}
                  <ArrowRight size={13} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
