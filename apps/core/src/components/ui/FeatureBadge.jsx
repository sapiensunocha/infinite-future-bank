import React from 'react';
import { getFeatureStatus, STATUS } from '../../config/featureAvailability';

// Small pill shown next to a menu item that is not live yet.
// `compact` uses short labels for narrow places like the sidebar.
export default function FeatureBadge({ id, compact = false, className = '' }) {
  const entry = getFeatureStatus(id);
  if (!entry) return null;
  const licence = entry.status === STATUS.LICENCE;
  return (
    <span
      title={entry.reason}
      className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider whitespace-nowrap border ${
        licence
          ? 'bg-violet-50 text-violet-700 border-violet-200'
          : 'bg-amber-50 text-amber-700 border-amber-200'
      } ${className}`}
    >
      {compact ? (licence ? 'Licence' : 'Soon') : (licence ? 'Licence pending' : 'Coming soon')}
    </span>
  );
}
