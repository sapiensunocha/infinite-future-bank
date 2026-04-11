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
  const content = TOUR_CONTENT[index][tourLanguage];
  
  return (
    <div {...tooltipProps} className="bg-slate-900 text-white p-6 rounded-3xl w-80 shadow-2xl border border-slate-700 font-sans">
      <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-3">
         <div className="flex gap-2">
           <button onClick={() => setTourLanguage('en')} className={`text-[10px] font-black tracking-widest px-2 py-1 rounded transition-colors ${tourLanguage === 'en' ? 'bg-blue-600' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>EN</button>
           <button onClick={() => setTourLanguage('es')} className={`text-[10px] font-black tracking-widest px-2 py-1 rounded transition-colors ${tourLanguage === 'es' ? 'bg-blue-600' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>ES</button>
         </div>
         <button onClick={() => setTourAudioEnabled(!tourAudioEnabled)} className="text-slate-400 hover:text-white transition-colors" title="Toggle Voice">
           {/* Add appropriate Volume2/VolumeX icons if passing them, or handle audio state externally */}
         </button>
      </div>
      <h3 className="font-black text-lg mb-2 leading-tight">{content.title}</h3>
      <p className="text-sm text-slate-300 mb-6 leading-relaxed">{content.body}</p>
      
      <div className="flex justify-between items-center">
        {index > 0 ? (
           <button {...backProps} className="text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-widest transition-colors">Back</button>
        ) : <div/>}
        <div className="flex gap-4 items-center">
           <button {...closeProps} className="text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-widest transition-colors">Skip</button>
           <button {...primaryProps} className="bg-blue-600 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 shadow-lg hover:-translate-y-0.5 transition-all">
             {isLastStep ? (tourLanguage === 'es' ? 'Finalizar' : 'Finish') : (tourLanguage === 'es' ? 'Siguiente' : 'Next')}
           </button>
        </div>
      </div>
    </div>
  );
};