import { useState } from 'react';

const APPS = [
  {
    key: 'core',
    name: 'IFB Banking',
    url: 'https://app.infinitefuturebank.org',
    color: 'bg-violet-600',
    textColor: 'text-violet-400',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
        <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 10v11M12 10v11M16 10v11" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'business',
    name: 'Business',
    url: 'https://business.infinitefuturebank.org',
    color: 'bg-cyan-600',
    textColor: 'text-cyan-400',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'wealth',
    name: 'Wealth',
    url: 'https://wealth.infinitefuturebank.org',
    color: 'bg-emerald-600',
    textColor: 'text-emerald-400',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="16 7 22 7 22 13" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'ventures',
    name: 'Ventures',
    url: 'https://ventures.infinitefuturebank.org',
    color: 'bg-blue-600',
    textColor: 'text-blue-400',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
        <path d="M12 2L8 8H2l4 4-2 6 8-4 8 4-2-6 4-4h-6L12 2z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'npo',
    name: 'NPO Hub',
    url: 'https://npo.infinitefuturebank.org',
    color: 'bg-rose-600',
    textColor: 'text-rose-400',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'events',
    name: 'Events',
    url: 'https://tickets.infinitefuturebank.org',
    color: 'bg-amber-600',
    textColor: 'text-amber-400',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
        <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" strokeLinecap="round" />
        <line x1="9" y1="4" x2="9" y2="20" strokeDasharray="2 2" />
      </svg>
    ),
  },
  {
    key: 'admin',
    name: 'Admin',
    url: 'https://admin.infinitefuturebank.org',
    color: 'bg-red-700',
    textColor: 'text-red-400',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

async function bridgeAndGo(supabase, url) {
  try {
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const target = new URL(url);
        target.hash = [
          `access_token=${session.access_token}`,
          `refresh_token=${session.refresh_token}`,
          `expires_in=3600`,
          `token_type=bearer`,
        ].join('&');
        window.location.href = target.toString();
        return;
      }
    }
  } catch (_) {}
  window.location.href = url;
}

export default function AppSwitcher({ currentApp, supabase, light = false }) {
  const [open, setOpen] = useState(false);

  const border  = light ? 'border-slate-200/60' : 'border-slate-800';
  const btnBase = light
    ? 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
    : 'text-slate-400 hover:text-white hover:bg-slate-800';
  const menuBg  = light ? 'bg-white border border-slate-200 shadow-lg' : 'bg-slate-800 border border-slate-700';
  const itemHover = light ? 'hover:bg-slate-50' : 'hover:bg-slate-700';

  return (
    <div className={`relative mt-auto pt-4 border-t ${border}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${btnBase}`}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0">
          <rect x="3" y="3" width="4" height="4" rx="1" />
          <rect x="10" y="3" width="4" height="4" rx="1" />
          <rect x="17" y="3" width="4" height="4" rx="1" />
          <rect x="3" y="10" width="4" height="4" rx="1" />
          <rect x="10" y="10" width="4" height="4" rx="1" />
          <rect x="17" y="10" width="4" height="4" rx="1" />
          <rect x="3" y="17" width="4" height="4" rx="1" />
          <rect x="10" y="17" width="4" height="4" rx="1" />
          <rect x="17" y="17" width="4" height="4" rx="1" />
        </svg>
        <span className="text-xs font-semibold uppercase tracking-widest">IFB Apps</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`w-3 h-3 ml-auto transition-transform ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className={`mt-1 rounded-lg overflow-hidden ${menuBg}`}>
          {APPS.filter(a => a.key !== currentApp).map(app => (
            <button
              key={app.key}
              onClick={() => bridgeAndGo(supabase, app.url)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors group ${itemHover}`}
            >
              <span className={`${app.color} rounded-md p-1 text-white shrink-0`}>
                {app.icon}
              </span>
              <span className={`text-xs font-semibold ${light ? 'text-slate-600 group-hover:text-slate-900' : `${app.textColor} group-hover:text-white`} transition-colors`}>
                {app.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
