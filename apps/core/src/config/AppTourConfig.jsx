export const TOUR_CONTENT = [
  {
    target: 'body',
    placement: 'center',
    en: { title: "Welcome to DEUS", body: "Your institutional financial interface. Let's secure your capital." },
    es: { title: "Bienvenido a DEUS", body: "Su interfaz financiera institucional. Aseguremos su capital." }
  },
  {
    target: '#tour-quick-actions',
    en: { title: "Command Center", body: "Execute global transactions, transfers, and deposits instantly from here." },
    es: { title: "Centro de Comando", body: "Ejecute transacciones, transferencias y depósitos globales al instante." }
  },
  {
    target: '#tour-app-drawer',
    en: { title: "Corporate Tools", body: "Access Merchant Services, Payroll, and Smart Contracts." },
    es: { title: "Herramientas Corporativas", body: "Acceda a Servicios Comerciales, Nóminas y Contratos Inteligentes." }
  },
  {
    target: '#tour-ai-advisor',
    en: { title: "Financial AI", body: "Tap here anytime to consult your AI mentor for strategy and support." },
    es: { title: "IA Financiera", body: "Toque aquí en cualquier momento para consultar a su mentor de IA." }
  }
];

export const CustomTourTooltip = ({ index, backProps, closeProps, primaryProps, isLastStep, tooltipProps, tourLanguage, setTourLanguage, tourAudioEnabled, setTourAudioEnabled }) => {
  const step = TOUR_CONTENT[index] || TOUR_CONTENT[0];
  const safeLang = (tourLanguage && step[tourLanguage]) ? tourLanguage : 'en';
  const content = step[safeLang] || { title: '', body: '' };
  
  return (
    <div {...tooltipProps} className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 rounded-3xl w-80 shadow-sm border font-sans">
      <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-3">
         <div className="flex gap-2">
           <button onClick={() => setTourLanguage('en')} className={`text-xs font-bold tracking-widest px-2 py-1 rounded transition-colors ${tourLanguage === 'en' ? 'bg-blue-600' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>EN</button>
           <button onClick={() => setTourLanguage('es')} className={`text-xs font-bold tracking-widest px-2 py-1 rounded transition-colors ${tourLanguage === 'es' ? 'bg-blue-600' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>ES</button>
         </div>
         <button onClick={() => setTourAudioEnabled(!tourAudioEnabled)} className="text-slate-400 hover:text-white transition-colors" title="Toggle Voice">
           {/* Add appropriate Volume2/VolumeX icons if passing them, or handle audio state externally */}
         </button>
      </div>
      <h3 className="font-bold text-lg mb-2 leading-tight">{content.title}</h3>
      <p className="text-sm text-slate-300 mb-6 leading-relaxed">{content.body}</p>
      
      <div className="flex justify-between items-center">
        {index > 0 ? (
           <button {...backProps} className="text-sm font-semibold text-slate-500 hover:text-white transition-colors">Back</button>
        ) : <div/>}
        <div className="flex gap-4 items-center">
           <button {...closeProps} className="text-sm font-semibold text-slate-500 hover:text-white transition-colors">Skip</button>
           <button {...primaryProps} className="ui-btn ui-btn-primary w-auto">
             {isLastStep ? (tourLanguage === 'es' ? 'Finalizar' : 'Finish') : (tourLanguage === 'es' ? 'Siguiente' : 'Next')}
           </button>
        </div>
      </div>
    </div>
  );
};