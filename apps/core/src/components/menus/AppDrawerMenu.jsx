import React from 'react';
import { X, ArrowRight } from 'lucide-react';
import FeatureBadge from '../ui/FeatureBadge';
import { SERVICE_GROUPS } from '../../config/services';

// Desktop quick menu of services (the header grid button). On mobile, services
// live at the bottom of Home and on the full Services page instead.
export default function AppDrawerMenu({ isAppDrawerOpen, setIsAppDrawerOpen, setActiveAppPopup, onSeeAll }) {
  if (!isAppDrawerOpen) return null;
  const open = (id) => { setActiveAppPopup(id); setIsAppDrawerOpen(false); };

  return (
    <>
      <div className="fixed inset-0 z-[9998]" onClick={() => setIsAppDrawerOpen(false)} />
      <div className="absolute top-full mt-2 right-0 w-[26rem] bg-white border border-slate-200 shadow-xl rounded-2xl z-[9999] max-h-[80vh] overflow-y-auto no-scrollbar animate-in slide-in-from-top-2 fade-in duration-150 p-4">
        <div className="flex items-center justify-between pb-3 mb-1">
          <h3 className="text-base font-semibold text-slate-900">Services</h3>
          <button onClick={() => setIsAppDrawerOpen(false)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        {SERVICE_GROUPS.map((group) => (
          <div key={group.id} className="pt-3 first:pt-0">
            <h4 className="text-xs font-semibold text-slate-500 mb-2">{group.title}</h4>
            <div className="grid grid-cols-2 gap-2">
              {group.items.map(({ id, Icon, label }) => (
                <button
                  key={id}
                  onClick={() => open(id)}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 border border-slate-200/70 text-left"
                >
                  <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><Icon size={16} /></span>
                  <span className="min-w-0 flex flex-col items-start gap-1">
                    <span className="text-sm font-medium text-slate-800 truncate">{label}</span>
                    <FeatureBadge id={id} compact />
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
        {onSeeAll && (
          <button
            onClick={() => { setIsAppDrawerOpen(false); onSeeAll(); }}
            className="mt-4 w-full h-11 rounded-xl bg-slate-50 hover:bg-slate-100 text-sm font-semibold text-blue-600 flex items-center justify-center gap-1.5"
          >
            Open Services page <ArrowRight size={15} />
          </button>
        )}
      </div>
    </>
  );
}
