import React from 'react';
import { Clock, ShieldAlert } from 'lucide-react';
import { getFeatureStatus, STATUS } from '../../config/featureAvailability';

// Shown in place of a feature's screen while it is gated.
export default function ComingSoonPanel({ id }) {
  const entry = getFeatureStatus(id);
  if (!entry) return null;
  const licence = entry.status === STATUS.LICENCE;
  const Icon = licence ? ShieldAlert : Clock;

  return (
    <div className="max-w-md mx-auto my-10 bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-sm">
      <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center ${licence ? 'bg-violet-50 text-violet-600' : 'bg-amber-50 text-amber-600'}`}>
        <Icon size={26} />
      </div>
      <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${licence ? 'text-violet-600' : 'text-amber-600'}`}>
        {licence ? 'Licence pending' : 'Coming soon'}
      </p>
      <h2 className="text-xl font-black text-slate-900 mb-2">{entry.title}</h2>
      <p className="text-sm text-slate-500 leading-relaxed">{entry.reason}</p>
      <p className="text-xs text-slate-400 mt-4">
        {licence
          ? 'This service will open once the required licence or a licensed partner is in place.'
          : 'We will let you know as soon as it is available.'}
      </p>
    </div>
  );
}
