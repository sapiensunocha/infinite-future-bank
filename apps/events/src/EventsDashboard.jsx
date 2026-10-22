import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import {
  CalendarDays, Ticket, DollarSign, Users,
  Plus, ScanLine, BarChart3, ArrowRight,
  RefreshCw, Clock, MapPin, Music
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, color = 'text-amber-600', bg = 'bg-amber-50' }) {
  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-4`}>
        <Icon size={18} className={color} />
      </div>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

const QUICK = [
  { icon: Plus,         label: 'Create Event',  desc: 'Set up with ticketing',    path: '/events', color: 'from-amber-600 to-orange-600'  },
  { icon: ScanLine,     label: 'Scan Ticket',   desc: 'Gate check-in scanner',    path: '/gate/0', color: 'from-orange-600 to-red-600'    },
  { icon: CalendarDays, label: 'All Events',    desc: 'Full event calendar',      path: '/events', color: 'from-cyan-600 to-blue-600'     },
  { icon: BarChart3,    label: 'Analytics',     desc: 'Attendance & revenue',     path: '/events', color: 'from-emerald-600 to-teal-600'  },
];

export default function EventsDashboard() {
  const nav = useNavigate();
  const [stats, setStats]       = useState({ upcoming: 0, tickets: 0, revenue: 0, checkins: 0 });
  const [events, setEvents]     = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const [ev, tix] = await Promise.all([
          supabase.from('events').select('id,title,date,location,ticket_price,capacity').gte('date', new Date().toISOString()).order('date', { ascending: true }).limit(4),
          supabase.from('event_tickets').select('id,price,checked_in').eq('user_id', user.id),
        ]);
        const t = tix.data || [];
        setStats({
          upcoming: (ev.data || []).length,
          tickets:  t.length,
          revenue:  t.reduce((s, x) => s + Number(x.price || 0), 0),
          checkins: t.filter(x => x.checked_in).length,
        });
        setEvents(ev.data || []);
      } catch (_) {}
      setLoading(false);
    })();
  }, []);

  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '—';

  return (
    <div className="space-y-8">

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-900">Events Overview</h2>
        <button onClick={() => window.location.reload()} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-xl transition-colors border border-slate-200 shadow-sm">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={CalendarDays} label="Upcoming"   value={loading ? '—' : stats.upcoming} sub="events scheduled" color="text-amber-600"   bg="bg-amber-50"   />
        <StatCard icon={Ticket}       label="Tickets"    value={loading ? '—' : stats.tickets}  sub="sold across all"  color="text-orange-600"  bg="bg-orange-50"  />
        <StatCard icon={DollarSign}   label="Revenue"    value={loading ? '—' : `$${Number(stats.revenue).toLocaleString()}`} sub="ticket sales" color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard icon={Users}        label="Check-ins"  value={loading ? '—' : stats.checkins} sub="scanned at gate"  color="text-cyan-600"    bg="bg-cyan-50"    />
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Box Office Actions</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK.map(({ icon: Icon, label, desc, path, color }) => (
            <button key={label} onClick={() => nav(path)}
              className="bg-white border border-slate-200 hover:border-blue-200 hover:shadow-md rounded-2xl p-5 text-left transition-all group shadow-sm">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                <Icon size={16} className="text-white" />
              </div>
              <p className="text-sm font-black text-slate-900">{label}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Upcoming Events</p>
          <button onClick={() => nav('/events')} className="flex items-center gap-1 text-[10px] font-bold text-amber-600 hover:text-amber-700 uppercase tracking-widest transition-colors">
            View All <ArrowRight size={11} />
          </button>
        </div>
        {loading ? (
          <div className="py-8 flex justify-center"><div className="w-6 h-6 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" /></div>
        ) : events.length === 0 ? (
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl py-12 text-center">
            <CalendarDays size={28} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-semibold">No upcoming events</p>
            <button onClick={() => nav('/events')} className="mt-3 px-5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all hover:shadow-lg">
              Create Your First Event
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map(ev => (
              <div key={ev.id} className="bg-white border border-slate-200 hover:border-amber-200 hover:shadow-md rounded-2xl p-4 transition-all flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center shrink-0">
                  <Music size={18} className="text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-900 truncate">{ev.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-[10px] text-slate-500"><Clock size={10} /> {fmtDate(ev.date)}</span>
                    {ev.location && <span className="flex items-center gap-1 text-[10px] text-slate-500"><MapPin size={10} /> {ev.location}</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-amber-600">{ev.ticket_price > 0 ? `$${Number(ev.ticket_price).toFixed(0)}` : 'Free'}</p>
                  {ev.capacity && <p className="text-[10px] text-slate-400">{ev.capacity} cap.</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="relative bg-white border border-slate-200 shadow-sm rounded-2xl p-5 overflow-hidden flex items-center justify-between gap-4">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-50 to-transparent pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-600 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
            <ScanLine size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-black text-slate-900">Ticket Gate Scanner</p>
            <p className="text-[11px] text-slate-500">Scan QR codes at the venue entrance</p>
          </div>
        </div>
        <button onClick={() => nav('/gate/0')}
          className="relative flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-xs font-black uppercase tracking-widest rounded-xl shrink-0 hover:shadow-lg hover:shadow-amber-200 transition-all">
          Open Gate <ScanLine size={12} />
        </button>
      </div>

    </div>
  );
}
