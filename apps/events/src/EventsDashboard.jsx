import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import {
  CalendarDays, Ticket, DollarSign, Users,
  Plus, ScanLine, BarChart3, ArrowRight,
  RefreshCw, ChevronRight, Clock, MapPin, Music
} from 'lucide-react';

const HOUR = new Date().getHours();
const GREET = HOUR < 12 ? 'Good morning' : HOUR < 18 ? 'Good afternoon' : 'Good evening';

function KpiCard({ icon: Icon, label, value, sub, accent = 'amber' }) {
  const colors = {
    amber:   { ring: 'border-amber-800/60',   bg: 'bg-amber-900/20',   text: 'text-amber-400'   },
    orange:  { ring: 'border-orange-800/60',  bg: 'bg-orange-900/20',  text: 'text-orange-400'  },
    cyan:    { ring: 'border-cyan-800/60',     bg: 'bg-cyan-900/20',    text: 'text-cyan-400'    },
    emerald: { ring: 'border-emerald-800/60', bg: 'bg-emerald-900/20', text: 'text-emerald-400' },
  };
  const c = colors[accent] || colors.amber;
  return (
    <div className={`bg-slate-900 border ${c.ring} rounded-2xl p-5`}>
      <div className={`w-9 h-9 ${c.bg} rounded-xl flex items-center justify-center mb-4`}>
        <Icon size={16} className={c.text} />
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">{label}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function QuickAction({ icon: Icon, label, desc, onClick, accent = 'amber' }) {
  const c = {
    amber:   'bg-amber-600 hover:bg-amber-500',
    orange:  'bg-orange-600 hover:bg-orange-500',
    cyan:    'bg-cyan-600 hover:bg-cyan-500',
    emerald: 'bg-emerald-600 hover:bg-emerald-500',
  }[accent] || 'bg-amber-600 hover:bg-amber-500';
  return (
    <button onClick={onClick}
      className="bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-2xl p-4 text-left transition-all group flex items-start gap-3">
      <div className={`w-9 h-9 ${c} rounded-xl flex items-center justify-center shrink-0 transition-colors`}>
        <Icon size={15} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">{label}</p>
        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{desc}</p>
      </div>
      <ChevronRight size={14} className="text-slate-600 group-hover:text-amber-400 ml-auto mt-0.5 transition-colors shrink-0" />
    </button>
  );
}

export default function EventsDashboard() {
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [stats, setStats] = useState({ upcoming: 0, tickets: 0, revenue: 0, checkins: 0 });
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [profileRes, eventsRes, ticketsRes] = await Promise.all([
          supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
          supabase.from('events')
            .select('id,title,date,location,ticket_price,capacity')
            .gte('date', new Date().toISOString())
            .order('date', { ascending: true })
            .limit(4),
          supabase.from('event_tickets')
            .select('id,price,checked_in,event_id')
            .eq('user_id', user.id),
        ]);

        setName(profileRes.data?.full_name?.split(' ')[0] || 'there');

        const events = eventsRes.data || [];
        const tickets = ticketsRes.data || [];
        const revenue = tickets.reduce((s, t) => s + Number(t.price || 0), 0);
        const checkins = tickets.filter(t => t.checked_in).length;

        setStats({ upcoming: events.length, tickets: tickets.length, revenue, checkins });
        setUpcomingEvents(events);
      } catch (_) {}
      setLoading(false);
    }
    load();
  }, []);

  const fmtDate = d => {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-500 text-sm font-medium">{GREET}{name ? `, ${name}` : ''}.</p>
          <h1 className="text-3xl font-black text-white mt-0.5">Box Office</h1>
          <p className="text-slate-500 text-sm mt-1">Create events, sell tickets, scan check-ins at the door.</p>
        </div>
        <button onClick={() => window.location.reload()} disabled={loading}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={CalendarDays} label="Upcoming Events" value={loading ? '—' : stats.upcoming} sub="next in schedule" accent="amber" />
        <KpiCard icon={Ticket} label="Tickets Sold" value={loading ? '—' : stats.tickets} sub="across all events" accent="orange" />
        <KpiCard icon={DollarSign} label="Revenue" value={loading ? '—' : `$${Number(stats.revenue).toLocaleString()}`} sub="ticket sales" accent="emerald" />
        <KpiCard icon={Users} label="Check-ins" value={loading ? '—' : stats.checkins} sub="scanned at gate" accent="cyan" />
      </div>

      {/* Quick Actions */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Box Office Actions</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <QuickAction icon={Plus} label="Create Event" desc="Set up a new event with ticketing" onClick={() => nav('/')} accent="amber" />
          <QuickAction icon={ScanLine} label="Scan Ticket" desc="Gate check-in scanner" onClick={() => nav('/gate/0')} accent="orange" />
          <QuickAction icon={CalendarDays} label="All Events" desc="Browse the full event calendar" onClick={() => nav('/')} accent="cyan" />
          <QuickAction icon={BarChart3} label="Analytics" desc="Attendance & revenue breakdown" onClick={() => nav('/')} accent="emerald" />
        </div>
      </div>

      {/* Upcoming Events */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Upcoming Events</p>
          <button onClick={() => nav('/')}
            className="flex items-center gap-1 text-[10px] font-bold text-amber-400 hover:text-amber-300 transition-colors uppercase tracking-widest">
            View All <ArrowRight size={11} />
          </button>
        </div>
        {loading ? (
          <div className="py-8 text-center">
            <div className="w-6 h-6 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mx-auto" />
          </div>
        ) : upcomingEvents.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl py-12 text-center">
            <CalendarDays size={32} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-semibold">No upcoming events</p>
            <button onClick={() => nav('/')}
              className="mt-3 px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors">
              Create Your First Event
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingEvents.map(ev => (
              <div key={ev.id}
                className="bg-slate-900 border border-slate-800 hover:border-amber-800/60 rounded-2xl p-4 transition-colors flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-900/30 border border-amber-800/40 rounded-xl flex items-center justify-center shrink-0">
                  <Music size={18} className="text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-white truncate">{ev.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-[10px] text-slate-500">
                      <Clock size={10} /> {fmtDate(ev.date)}
                    </span>
                    {ev.location && (
                      <span className="flex items-center gap-1 text-[10px] text-slate-500">
                        <MapPin size={10} /> {ev.location}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-amber-400">
                    {ev.ticket_price > 0 ? `$${Number(ev.ticket_price).toFixed(0)}` : 'Free'}
                  </p>
                  {ev.capacity && <p className="text-[10px] text-slate-600">{ev.capacity} cap</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Gate scanner CTA */}
      <div className="bg-gradient-to-r from-amber-900/40 to-slate-900 border border-amber-800/40 rounded-2xl p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center shrink-0">
            <ScanLine size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-black text-white">Ticket Gate Scanner</p>
            <p className="text-[11px] text-slate-400">Scan QR codes at the venue entrance</p>
          </div>
        </div>
        <button onClick={() => nav('/gate/0')}
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors shrink-0">
          Open Gate <ScanLine size={12} />
        </button>
      </div>
    </div>
  );
}
