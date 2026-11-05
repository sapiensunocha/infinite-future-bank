import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import FeatureBadge from '../components/ui/FeatureBadge';
import { SERVICE_GROUPS } from '../config/services';

// Full-page list of every service (opened from "More" on the home Services row).
export default function ServicesPage({ setActiveTab, setActiveAppPopup }) {
  return (
    <div className="ui-page space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setActiveTab('NET_POSITION')}
          className="md:hidden w-10 h-10 -ml-1 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100"
          aria-label="Back to home"
        >
          <ChevronLeft size={22} />
        </button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Services</h1>
          <p className="text-sm text-slate-500 mt-0.5">Everything you can do with IFB</p>
        </div>
      </div>

      {SERVICE_GROUPS.map((group) => (
        <section key={group.id} className="space-y-2.5">
          <h2 className="text-sm font-semibold text-slate-500 px-1">{group.title}</h2>
          <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden md:grid md:grid-cols-2 md:divide-y-0 md:gap-px md:bg-slate-100">
            {group.items.map(({ id, Icon, label, desc }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveAppPopup(id)}
                className="w-full flex items-center gap-3.5 px-4 py-3.5 bg-white text-left hover:bg-slate-50 active:bg-slate-100 transition-colors"
              >
                <span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Icon size={20} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2 flex-wrap">
                    <span className="text-[15px] font-semibold text-slate-900">{label}</span>
                    <FeatureBadge id={id} compact />
                  </span>
                  <span className="block text-sm text-slate-500 truncate">{desc}</span>
                </span>
                <ChevronRight size={18} className="text-slate-300 shrink-0" />
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
