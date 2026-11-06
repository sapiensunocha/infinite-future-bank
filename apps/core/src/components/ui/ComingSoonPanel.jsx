import React from 'react';
import { Clock } from 'lucide-react';
import { getFeatureStatus } from '../../config/featureAvailability';

// Shown in place of a feature's screen while it is gated. Always "Coming soon".
export default function ComingSoonPanel({ id }) {
  const entry = getFeatureStatus(id);
  if (!entry) return null;
  return (
    <div className="max-w-md mx-auto my-10 ui-card p-8 text-center">
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-amber-50 text-amber-600">
        <Clock size={26} />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-amber-700">Coming soon</p>
      <h2 className="text-xl font-semibold text-slate-900 mb-2">{entry.title}</h2>
      <p className="text-sm text-slate-600 leading-relaxed">{entry.reason}</p>
      <p className="text-sm text-slate-400 mt-4">We will let you know as soon as it is available.</p>
    </div>
  );
}
