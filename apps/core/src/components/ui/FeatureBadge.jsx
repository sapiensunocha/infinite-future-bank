import React from 'react';
import { getFeatureStatus } from '../../config/featureAvailability';

// Small "Coming soon" pill next to a menu item that is not live yet (whatever the
// internal reason it is gated). `compact` uses a short label for narrow places.
export default function FeatureBadge({ id, compact = false, className = '' }) {
  const entry = getFeatureStatus(id);
  if (!entry) return null;
  return (
    <span
      title={entry.reason}
      className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-semibold whitespace-nowrap border bg-amber-50 text-amber-700 border-amber-200 ${className}`}
    >
      {compact ? 'Soon' : 'Coming soon'}
    </span>
  );
}
