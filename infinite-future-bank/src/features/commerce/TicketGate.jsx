import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode, Camera, Ticket, Check, XCircle, Loader2, Users,
  AlertCircle, ShieldCheck, Plus, Calendar, DollarSign, X,
  Download, MapPin, Trash2, Share2, Edit2, Save, Link as LinkIcon,
  Globe2, Search, ChevronLeft, Wallet, Tag
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import QRCode from 'react-qr-code';

const APP_DOMAIN = 'https://deus.infinitefuturebank.org';

const EVENT_CATEGORIES = [
  'Conference', 'Concert', 'Workshop', 'Networking',
  'Sports', 'Arts & Culture', 'Gala', 'Summit', 'Exhibition', 'Community', 'Other'
];

const parseCategory = (requiredFields) => {
  if (!requiredFields) return null;
  try {
    const obj = typeof requiredFields === 'string' ? JSON.parse(requiredFields) : requiredFields;
    return obj?.category || null;
  } catch {
    return typeof requiredFields === 'string' ? requiredFields : null;
  }
};

const formatDate = (d) => {
  if (!d) return 'TBA';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatTime = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

export default function TicketGate({ session, balances, fetchAllData }) {
  const [mainTab, setMainTab] = useState('EXPLORE'); // 'EXPLORE' | 'BOX_OFFICE'

  // ─── EXPLORE STATE ───────────────────────────────────────────────────────────
  const [allEvents, setAllEvents] = useState([]);
  const [exploreSearch, setExploreSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [exploreLoading, setExploreLoading] = useState(false);
  const [allLocations, setAllLocations] = useState([]);

  // Buy ticket state
  const [buyModal, setBuyModal] = useState(null);
  const [isBuying, setIsBuying] = useState(false);
  const [boughtTicket, setBoughtTicket] = useState(null); // { qrHash, eventName, eventDate }

  // ─── BOX OFFICE STATE ─────────────────────────────────────────────────────────
  const [myEvents, setMyEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [profile, setProfile] = useState(null);
  const [boView, setBoView] = useState('LIST'); // LIST, SCANNER, DESIGNER

  const [isCreating, setIsCreating] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [newEvent, setNewEvent] = useState({ name: '', price: '', slots: '', message: '', location: '', date: '', image: '', category: '' });

  const [editTicketId, setEditTicketId] = useState(null);
  const [editTicketEmail, setEditTicketEmail] = useState('');
  const [confirmModal, setConfirmModal] = useState(null); // { type, id, label }

  const [scanInput, setScanInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const scannerRef = useRef(null);

  // ─────────────────────────────────────────────────────────────────────────────

  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // ─── EXPLORE: Fetch all public events ────────────────────────────────────────
  const fetchAllEvents = async () => {
    setExploreLoading(true);
    const { data } = await supabase
      .from('ifb_events')
      .select('*, profiles!organizer_id(full_name, avatar_url)')
      .order('event_date', { ascending: true });

    if (data) {
      setAllEvents(data);
      const locs = [...new Set(data.map(e => e.location_name).filter(Boolean))].sort();
      setAllLocations(locs);
    }
    setExploreLoading(false);
  };

  // ─── BOX OFFICE: Fetch my events ─────────────────────────────────────────────
  const fetchMyEvents = async () => {
    setIsLoading(true);
    const { data: evData } = await supabase.from('ifb_events').select('*').eq('organizer_id', session.user.id).order('created_at', { ascending: false });
    const { data: profData } = await supabase.from('profiles').select('avatar_url, full_name').eq('id', session.user.id).single();
    setMyEvents(evData || []);
    if (profData) setProfile(profData);
    setIsLoading(false);
  };

  const loadTickets = async (eventId) => {
    setIsLoading(true);
    const { data } = await supabase.from('ifb_tickets').select('*').eq('event_id', eventId).order('purchased_at', { ascending: false });
    setTickets(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAllEvents();
    fetchMyEvents();
  }, [session]);

  // ─── EXPLORE: Filtered events ─────────────────────────────────────────────────
  const filteredEvents = allEvents.filter(ev => {
    const matchSearch = !exploreSearch ||
      ev.event_name?.toLowerCase().includes(exploreSearch.toLowerCase()) ||
      ev.location_name?.toLowerCase().includes(exploreSearch.toLowerCase()) ||
      ev.custom_message?.toLowerCase().includes(exploreSearch.toLowerCase());

    const matchLocation = !locationFilter || ev.location_name === locationFilter;
    const matchCategory = !categoryFilter || parseCategory(ev.required_fields) === categoryFilter;
    const isFuture = !ev.event_date || new Date(ev.event_date) >= new Date(Date.now() - 86400000);

    return matchSearch && matchLocation && matchCategory && isFuture;
  });

  // ─── BUY TICKET WITH IFB BALANCE ─────────────────────────────────────────────
  const handleBuyWithBalance = async () => {
    if (!buyModal) return;
    const price = parseFloat(buyModal.ticket_price) || 0;
    const currentBalance = balances?.liquid_usd || 0;

    if (price > 0 && currentBalance < price) {
      showToast(`Insufficient balance. Need $${price.toFixed(2)}, have $${currentBalance.toFixed(2)}.`, 'error');
      return;
    }

    const soldCount = buyModal.tickets_sold || 0;
    const totalSlots = buyModal.total_slots || buyModal.capacity_limit || 999;
    if (soldCount >= totalSlots) {
      showToast('This event is sold out.', 'error');
      return;
    }

    // Prevent buying own event
    if (buyModal.organizer_id === session.user.id) {
      showToast('You cannot buy a ticket for your own event.', 'error');
      return;
    }

    setIsBuying(true);
    try {
      const qrHash = `IFB-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      const newBalance = parseFloat((currentBalance - price).toFixed(2));

      // 1. Deduct buyer balance
      if (price > 0) {
        const { data: balUpdate } = await supabase
          .from('balances')
          .update({ liquid_usd: newBalance })
          .eq('user_id', session.user.id)
          .select();

        if (!balUpdate || balUpdate.length === 0) {
          throw new Error('Balance update failed. Please refresh and try again.');
        }
      }

      // 2. Create ticket
      const { error: ticketError } = await supabase.from('ifb_tickets').insert([{
        event_id: buyModal.id,
        buyer_email: session.user.email,
        qr_code_hash: qrHash,
        status: 'active',
        purchased_at: new Date().toISOString()
      }]);

      if (ticketError) {
        // Rollback balance
        if (price > 0) await supabase.from('balances').update({ liquid_usd: currentBalance }).eq('user_id', session.user.id);
        throw ticketError;
      }

      // 3. Increment tickets_sold
      await supabase.from('ifb_events').update({ tickets_sold: soldCount + 1 }).eq('id', buyModal.id);

      // 4. Buyer transaction record
      if (price > 0) {
        await supabase.from('transactions').insert([{
          user_id: session.user.id,
          type: 'event_ticket',
          amount: -price,
          description: `Ticket: ${buyModal.event_name}`,
          status: 'completed'
        }]);

        // 5. Credit organizer (best effort — 95% after 5% platform fee)
        const organizerCut = parseFloat((price * 0.95).toFixed(2));
        const { data: orgBal } = await supabase.from('balances').select('liquid_usd').eq('user_id', buyModal.organizer_id).single();
        if (orgBal) {
          await supabase.from('balances').update({ liquid_usd: orgBal.liquid_usd + organizerCut }).eq('user_id', buyModal.organizer_id);
          await supabase.from('transactions').insert([{
            user_id: buyModal.organizer_id,
            type: 'event_revenue',
            amount: organizerCut,
            description: `Ticket sold: ${buyModal.event_name}`,
            status: 'completed'
          }]);
        }
      }

      setBoughtTicket({ qrHash, eventName: buyModal.event_name, eventDate: buyModal.event_date });
      if (fetchAllData) fetchAllData();
      await fetchAllEvents();

    } catch (err) {
      showToast('Purchase failed: ' + (err.message || 'Try again'), 'error');
    } finally {
      setIsBuying(false);
    }
  };

  // ─── BOX OFFICE: Event CRUD ────────────────────────────────────────────────────
  const openCreateModal = () => {
    setEditingEvent(null);
    setNewEvent({ name: '', price: '', slots: '', message: '', location: '', date: '', image: '', category: '' });
    setIsCreating(true);
  };

  const openEditModal = (ev) => {
    setEditingEvent(ev);
    setNewEvent({
      name: ev.event_name,
      price: ev.ticket_price,
      slots: ev.total_slots,
      message: ev.custom_message || '',
      location: ev.location_name || '',
      date: ev.event_date ? new Date(ev.event_date).toISOString().slice(0, 16) : '',
      image: ev.event_image_url || '',
      category: parseCategory(ev.required_fields) || ''
    });
    setIsCreating(true);
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const payload = {
      event_name: newEvent.name,
      ticket_price: parseFloat(newEvent.price) || 0,
      total_slots: parseInt(newEvent.slots) || 100,
      location_name: newEvent.location,
      event_date: newEvent.date || null,
      event_image_url: newEvent.image || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=2000&auto=format&fit=crop',
      custom_message: newEvent.message,
      required_fields: newEvent.category ? JSON.stringify({ category: newEvent.category }) : null
    };

    let error;
    if (editingEvent) {
      ({ error } = await supabase.from('ifb_events').update(payload).eq('id', editingEvent.id));
      if (!error && selectedEvent?.id === editingEvent.id) setSelectedEvent({ ...selectedEvent, ...payload });
    } else {
      ({ error } = await supabase.from('ifb_events').insert([{ ...payload, organizer_id: session.user.id }]));
    }

    if (error) showToast(error.message, 'error');
    else {
      showToast(editingEvent ? 'Event Updated.' : 'Event Live on Network.');
      setIsCreating(false);
      setEditingEvent(null);
      fetchMyEvents();
      fetchAllEvents();
    }
    setIsLoading(false);
  };

  const deleteEvent = async (eventId) => {
    setIsLoading(true);
    const { error } = await supabase.from('ifb_events').delete().eq('id', eventId);
    if (error) showToast(error.message, 'error');
    else {
      showToast('Event Deleted.');
      if (selectedEvent?.id === eventId) setSelectedEvent(null);
      fetchMyEvents();
      fetchAllEvents();
    }
    setIsLoading(false);
    setConfirmModal(null);
  };

  const updateTicketEmail = async (ticketId) => {
    if (!editTicketEmail.trim()) return;
    setIsLoading(true);
    const { error } = await supabase.from('ifb_tickets').update({ buyer_email: editTicketEmail }).eq('id', ticketId);
    if (error) showToast(error.message, 'error');
    else { showToast('Ticket Reassigned.'); setEditTicketId(null); loadTickets(selectedEvent.id); }
    setIsLoading(false);
  };

  const deleteTicket = async (ticketId) => {
    setIsLoading(true);
    const { error } = await supabase.from('ifb_tickets').delete().eq('id', ticketId);
    if (error) showToast(error.message, 'error');
    else { showToast('Ticket Destroyed.'); loadTickets(selectedEvent.id); }
    setIsLoading(false);
    setConfirmModal(null);
  };

  const exportGuestList = () => {
    const rows = [['Email', 'Status', 'Checked In', 'Ref ID'], ...tickets.map(t => [t.buyer_email, t.status, t.scanned_at ? new Date(t.scanned_at).toLocaleString() : 'N/A', t.qr_code_hash])];
    const csv = 'data:text/csv;charset=utf-8,' + rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = encodeURI(csv);
    a.download = `${selectedEvent.event_name.replace(/\s+/g, '_')}_guests.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleScanInput = async (e) => {
    e.preventDefault();
    let hash = scanInput.trim();
    if (!hash) return;
    const match = hash.match(/(IFB-[a-zA-Z0-9-]+)/);
    if (match) hash = match[1];
    setScanInput('');

    const { data: ticket, error } = await supabase.from('ifb_tickets').select('*').eq('qr_code_hash', hash).eq('event_id', selectedEvent.id).single();
    if (error || !ticket) showToast('INVALID: Hash not found', 'error');
    else if (ticket.status === 'cancelled') showToast('DENIED: Ticket Revoked', 'error');
    else if (ticket.is_scanned) showToast(`ALREADY USED: ${new Date(ticket.scanned_at).toLocaleTimeString()}`, 'error');
    else {
      await supabase.from('ifb_tickets').update({ is_scanned: true, scanned_at: new Date() }).eq('id', ticket.id);
      showToast('AUTHORIZED: Access Granted', 'success');
      loadTickets(selectedEvent.id);
    }
  };

  const copyText = (text, msg) => {
    try { navigator.clipboard.writeText(text); } catch {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
    showToast(msg);
  };

  const getPreviewData = () => {
    if (tickets.length > 0) return { email: tickets[0].buyer_email, hash: tickets[0].qr_code_hash };
    return { email: session?.user?.email, hash: `IFB-PREV-${selectedEvent?.id?.substring(0, 8)}` };
  };

  const categoryColors = {
    'Conference': 'bg-blue-100 text-blue-700',
    'Concert': 'bg-purple-100 text-purple-700',
    'Workshop': 'bg-amber-100 text-amber-700',
    'Networking': 'bg-emerald-100 text-emerald-700',
    'Sports': 'bg-red-100 text-red-700',
    'Arts & Culture': 'bg-pink-100 text-pink-700',
    'Gala': 'bg-indigo-100 text-indigo-700',
    'Summit': 'bg-slate-100 text-slate-700',
    'Exhibition': 'bg-teal-100 text-teal-700',
    'Community': 'bg-lime-100 text-lime-700',
    'Other': 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-8">

      {/* TOAST */}
      {notification && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[800] px-8 py-4 rounded-full shadow-2xl border-2 flex items-center gap-3 animate-in slide-in-from-top-4 ${notification.type === 'error' ? 'bg-red-900 border-red-500 text-red-200' : 'bg-slate-900 border-emerald-500 text-emerald-300'}`}>
          {notification.type === 'error' ? <XCircle size={20} /> : <ShieldCheck size={20} />}
          <span className="font-black text-sm uppercase tracking-widest">{notification.msg}</span>
        </div>
      )}

      {/* MAIN TABS */}
      <div className="flex gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm w-fit">
        <button onClick={() => setMainTab('EXPLORE')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${mainTab === 'EXPLORE' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
          <Globe2 size={14} /> Explore Events
        </button>
        <button onClick={() => setMainTab('BOX_OFFICE')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${mainTab === 'BOX_OFFICE' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
          <Ticket size={14} /> My Box Office
        </button>
      </div>

      {/* ================================================================= */}
      {/* EXPLORE VIEW                                                       */}
      {/* ================================================================= */}
      {mainTab === 'EXPLORE' && (
        <div className="space-y-6 animate-in fade-in">

          {/* Header */}
          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
            <h2 className="text-3xl font-black mb-1 relative z-10">IFB Event Network</h2>
            <p className="text-sm text-slate-400 font-medium relative z-10">Buy tickets instantly with your IFB balance. No card needed.</p>
            {balances && (
              <div className="mt-4 inline-flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-2 rounded-xl relative z-10">
                <Wallet size={16} className="text-indigo-400" />
                <span className="text-sm font-black text-white">Balance: ${(balances.liquid_usd || 0).toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
              <input type="text" placeholder="Search events, locations..." value={exploreSearch} onChange={e => setExploreSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 p-3 pl-11 rounded-2xl font-bold text-sm outline-none focus:border-indigo-400 shadow-sm" />
            </div>
            <div className="relative">
              <MapPin className="absolute left-4 top-3.5 text-slate-400" size={16} />
              <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)}
                className="bg-white border border-slate-200 p-3 pl-10 pr-8 rounded-2xl font-bold text-sm outline-none focus:border-indigo-400 shadow-sm cursor-pointer appearance-none min-w-[160px]">
                <option value="">All Locations</option>
                {allLocations.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="relative">
              <Tag className="absolute left-4 top-3.5 text-slate-400" size={16} />
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                className="bg-white border border-slate-200 p-3 pl-10 pr-8 rounded-2xl font-bold text-sm outline-none focus:border-indigo-400 shadow-sm cursor-pointer appearance-none min-w-[160px]">
                <option value="">All Categories</option>
                {EVENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {(exploreSearch || locationFilter || categoryFilter) && (
              <button onClick={() => { setExploreSearch(''); setLocationFilter(''); setCategoryFilter(''); }}
                className="px-5 py-3 bg-slate-100 text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-colors shrink-0">
                Clear
              </button>
            )}
          </div>

          {/* Events Grid */}
          {exploreLoading ? (
            <div className="text-center py-16"><Loader2 className="animate-spin mx-auto text-indigo-500 mb-3" size={32} /><p className="font-bold text-slate-400">Loading events...</p></div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-[2rem] border border-dashed border-slate-300">
              <Ticket size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="font-bold text-slate-500">No events match your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredEvents.map(ev => {
                const category = parseCategory(ev.required_fields);
                const sold = ev.tickets_sold || 0;
                const total = ev.total_slots || ev.capacity_limit || 0;
                const spotsLeft = total - sold;
                const isSoldOut = spotsLeft <= 0 && total > 0;
                const isFree = !ev.ticket_price || parseFloat(ev.ticket_price) === 0;
                const isOwn = ev.organizer_id === session.user.id;

                return (
                  <div key={ev.id} className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all group flex flex-col">
                    <div className="h-36 bg-slate-100 relative overflow-hidden">
                      <img src={ev.event_image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=2000'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80" alt="" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      {category && (
                        <span className={`absolute top-3 left-3 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${categoryColors[category] || 'bg-slate-100 text-slate-600'}`}>
                          {category}
                        </span>
                      )}
                      {isSoldOut && (
                        <span className="absolute top-3 right-3 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg">Sold Out</span>
                      )}
                      {isOwn && (
                        <span className="absolute top-3 right-3 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg">Your Event</span>
                      )}
                      <div className="absolute bottom-3 left-3 flex items-center gap-1 text-white text-xs font-bold">
                        <Calendar size={12} /> {formatDate(ev.event_date)}
                        {ev.event_date && <span className="ml-1 opacity-70">{formatTime(ev.event_date)}</span>}
                      </div>
                    </div>

                    <div className="p-5 flex flex-col flex-1 justify-between">
                      <div>
                        <h3 className="font-black text-slate-800 text-base mb-1 leading-tight">{ev.event_name}</h3>
                        {ev.location_name && (
                          <p className="text-xs text-slate-400 font-bold flex items-center gap-1 mb-2">
                            <MapPin size={11} /> {ev.location_name}
                          </p>
                        )}
                        {ev['profiles'] && (
                          <p className="text-[10px] text-slate-400 font-bold mb-3">by {ev['profiles']?.full_name || 'IFB Member'}</p>
                        )}
                        {total > 0 && (
                          <div className="mb-3">
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                              <span>{spotsLeft} spots left</span>
                              <span>{sold}/{total}</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${isSoldOut ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(100, (sold / total) * 100)}%` }} />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Price</p>
                          <p className="text-xl font-black text-slate-800">{isFree ? 'Free' : `$${parseFloat(ev.ticket_price).toFixed(2)}`}</p>
                        </div>
                        <button
                          disabled={isSoldOut || isOwn}
                          onClick={() => { setBuyModal(ev); setBoughtTicket(null); }}
                          className={`px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-sm ${isSoldOut || isOwn ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-indigo-200 hover:shadow-md'}`}>
                          {isOwn ? 'Your Event' : isSoldOut ? 'Sold Out' : 'Get Ticket'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── BUY TICKET MODAL ─────────────────────────────────────────── */}
      {buyModal && mainTab === 'EXPLORE' && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">

            {/* Event header */}
            <div className="h-40 relative">
              <img src={buyModal.event_image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=2000'} className="w-full h-full object-cover" alt="" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/20" />
              <button onClick={() => setBuyModal(null)} className="absolute top-4 right-4 bg-white/20 backdrop-blur p-2 rounded-xl text-white hover:bg-white/40 transition-colors"><X size={18} /></button>
              <div className="absolute bottom-4 left-5">
                <h3 className="font-black text-white text-xl leading-tight">{buyModal.event_name}</h3>
                <p className="text-sm text-white/80 font-bold flex items-center gap-1 mt-0.5"><Calendar size={12} /> {formatDate(buyModal.event_date)} · {buyModal.location_name}</p>
              </div>
            </div>

            {boughtTicket ? (
              // Success — show QR ticket
              <div className="p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                  <Check size={32} className="text-emerald-600" />
                </div>
                <h4 className="text-xl font-black text-slate-800">Ticket Secured!</h4>
                <p className="text-sm text-slate-500">Your IFB balance has been debited. Present this QR at the gate.</p>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 inline-block">
                  <QRCode value={`${APP_DOMAIN}/ticket/${boughtTicket.qrHash}`} size={140} fgColor="#1e293b" />
                </div>
                <p className="font-mono text-xs text-slate-400">{boughtTicket.qrHash}</p>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setBuyModal(null)} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-colors">Done</button>
                </div>
              </div>
            ) : (
              // Confirm purchase
              <div className="p-8 space-y-5">
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ticket Price</p>
                      <p className="text-2xl font-black text-slate-800">{parseFloat(buyModal.ticket_price) === 0 ? 'Free' : `$${parseFloat(buyModal.ticket_price).toFixed(2)}`}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Your Balance</p>
                      <p className={`text-lg font-black ${(balances?.liquid_usd || 0) < parseFloat(buyModal.ticket_price) ? 'text-red-600' : 'text-emerald-600'}`}>
                        ${(balances?.liquid_usd || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 font-bold">Your Name</span>
                      <span className="font-black text-slate-800">{session?.user?.email?.split('@')[0] || 'IFB Member'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 font-bold">Email</span>
                      <span className="font-black text-slate-800 truncate max-w-[200px]">{session?.user?.email}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 font-bold">Payment</span>
                      <span className="font-black text-indigo-600 flex items-center gap-1"><Wallet size={12} /> IFB Balance</span>
                    </div>
                  </div>

                  {(balances?.liquid_usd || 0) < parseFloat(buyModal.ticket_price || 0) && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-bold">
                      <AlertCircle size={16} />Insufficient balance. Fund your account first.
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setBuyModal(null)} className="w-1/3 py-4 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200">Cancel</button>
                  <button
                    onClick={handleBuyWithBalance}
                    disabled={isBuying || (parseFloat(buyModal.ticket_price || 0) > 0 && (balances?.liquid_usd || 0) < parseFloat(buyModal.ticket_price))}
                    className="w-2/3 py-4 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 transition-colors shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                    {isBuying ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={14} />}
                    {isBuying ? 'Processing...' : parseFloat(buyModal.ticket_price) === 0 ? 'Get Free Ticket' : `Pay $${parseFloat(buyModal.ticket_price).toFixed(2)}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* BOX OFFICE VIEW                                                    */}
      {/* ================================================================= */}
      {mainTab === 'BOX_OFFICE' && (
        <div className="animate-in fade-in">

          {/* ── Event list / management ──────────────────────────────────── */}
          {!selectedEvent && (
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Event Management</h2>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Your IFB Box Office</p>
                </div>
                <button onClick={openCreateModal} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase flex items-center gap-2 shadow-xl hover:bg-indigo-500 transition-all">
                  <Plus size={16} /> Create Event
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {myEvents.length === 0 && !isLoading && (
                  <div className="col-span-full text-center py-12 bg-white rounded-3xl border border-dashed border-slate-300">
                    <Ticket size={40} className="mx-auto text-slate-300 mb-3" />
                    <p className="font-bold text-slate-500">No events yet. Create your first event.</p>
                  </div>
                )}
                {myEvents.map(ev => (
                  <div key={ev.id} className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all group relative">
                    <div className="absolute top-4 right-4 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); openEditModal(ev); }} className="p-2 bg-white/90 backdrop-blur rounded-xl text-slate-600 hover:text-blue-600 shadow-md"><Edit2 size={16} /></button>
                      <button onClick={(e) => { e.stopPropagation(); setConfirmModal({ type: 'event', id: ev.id, label: ev.event_name }); }} className="p-2 bg-white/90 backdrop-blur rounded-xl text-slate-600 hover:text-red-600 shadow-md"><Trash2 size={16} /></button>
                    </div>
                    <div className="h-32 bg-slate-100 relative overflow-hidden">
                      <img src={ev.event_image_url} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" alt="" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <span className="absolute bottom-3 left-4 text-white font-black text-xs uppercase tracking-widest flex items-center gap-1"><Calendar size={12} /> {formatDate(ev.event_date)}</span>
                      {parseCategory(ev.required_fields) && (
                        <span className={`absolute top-3 left-3 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${categoryColors[parseCategory(ev.required_fields)] || 'bg-slate-100 text-slate-600'}`}>
                          {parseCategory(ev.required_fields)}
                        </span>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="font-black text-base text-slate-800 mb-1 truncate">{ev.event_name}</h3>
                      <p className="text-xs text-slate-400 font-bold mb-1 flex items-center gap-1"><MapPin size={11} />{ev.location_name || 'No location set'}</p>
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500 border-t border-slate-100 mt-3 pt-3">
                        <span>{ev.tickets_sold || 0} / {ev.total_slots} sold</span>
                        <span className="text-indigo-600">${parseFloat(ev.ticket_price || 0).toFixed(2)}</span>
                      </div>
                      <button onClick={() => { setSelectedEvent(ev); loadTickets(ev.id); setBoView('LIST'); }}
                        className="w-full mt-4 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-colors">
                        Manage Operations
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Event Management Detail ───────────────────────────────────── */}
          {selectedEvent && (
            <div className="space-y-5 animate-in slide-in-from-right-4">
              <button onClick={() => setSelectedEvent(null)} className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-900 flex items-center gap-2">
                <ChevronLeft size={14} /> Back to Registry
              </button>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                  {[['LIST', 'Guest List'], ['SCANNER', 'Gate Scanner'], ['DESIGNER', 'Credential']].map(([v, label]) => (
                    <button key={v} onClick={() => setBoView(v)} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${boView === v ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>{label}</button>
                  ))}
                </div>
              </div>

              {/* Guest List */}
              {boView === 'LIST' && (
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
                  <div className="p-8 border-b border-slate-100 flex justify-between items-center flex-wrap gap-4">
                    <div>
                      <h3 className="text-2xl font-black text-slate-800 tracking-tighter">{selectedEvent.event_name}</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{tickets.length} / {selectedEvent.total_slots} Issued · {tickets.filter(t => t.is_scanned).length} Checked In</p>
                    </div>
                    <button onClick={exportGuestList} className="p-3 bg-slate-50 rounded-2xl hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition-all border border-slate-100 flex items-center gap-2">
                      <Download size={16} /><span className="text-[10px] font-black uppercase">Export CSV</span>
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50">
                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <th className="p-5">Identity / Email</th>
                          <th className="p-5">Status</th>
                          <th className="p-5">Date</th>
                          <th className="p-5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {tickets.length === 0 ? (
                          <tr><td colSpan="4" className="p-10 text-center text-sm font-bold text-slate-400">No tickets yet.</td></tr>
                        ) : tickets.map(t => (
                          <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-5">
                              {editTicketId === t.id ? (
                                <div className="flex items-center gap-2">
                                  <input type="email" value={editTicketEmail} onChange={e => setEditTicketEmail(e.target.value)}
                                    className="px-3 py-1.5 border border-blue-300 rounded-lg text-sm font-bold text-slate-900 outline-none w-48" autoFocus />
                                  <button onClick={() => updateTicketEmail(t.id)} className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"><Save size={14} /></button>
                                  <button onClick={() => setEditTicketId(null)} className="p-1.5 bg-slate-200 text-slate-600 rounded-lg"><X size={14} /></button>
                                </div>
                              ) : (
                                <>
                                  <p className="font-bold text-slate-800">{t.buyer_email}</p>
                                  <p className="text-[9px] font-mono text-slate-400">{t.qr_code_hash?.substring(0, 20)}...</p>
                                </>
                              )}
                            </td>
                            <td className="p-5">
                              {t.status === 'cancelled' ? <span className="text-[8px] bg-red-50 text-red-500 px-2 py-1 rounded-md font-black uppercase">Revoked</span> :
                                t.is_scanned ? <span className="text-[8px] bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md font-black uppercase">At Door</span> :
                                  <span className="text-[8px] bg-blue-50 text-blue-600 px-2 py-1 rounded-md font-black uppercase">Active</span>}
                            </td>
                            <td className="p-5 text-xs text-slate-400 font-bold">{new Date(t.purchased_at).toLocaleDateString()}</td>
                            <td className="p-5 text-right">
                              <div className="flex justify-end gap-2">
                                <button onClick={() => copyText(`${APP_DOMAIN}/ticket/${t.qr_code_hash}`, 'Link Copied!')} className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:text-emerald-600 hover:bg-emerald-50 transition-colors"><Share2 size={15} /></button>
                                <button onClick={() => { setEditTicketId(t.id); setEditTicketEmail(t.buyer_email); }} className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:text-blue-600 hover:bg-blue-50 transition-colors"><Edit2 size={15} /></button>
                                <button onClick={() => setConfirmModal({ type: 'ticket', id: t.id, label: t.buyer_email })} className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={15} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Gate Scanner */}
              {boView === 'SCANNER' && (
                <div className="bg-slate-900 rounded-[3rem] p-12 text-center border border-slate-800 shadow-2xl">
                  <div className="w-24 h-24 mx-auto rounded-[2rem] flex items-center justify-center mb-8 shadow-xl bg-white/5 text-slate-600">
                    <QrCode size={48} />
                  </div>
                  <h3 className="text-3xl font-black text-white mb-2">Gate Access Terminal</h3>
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-12">USB Scanner or Manual Entry</p>
                  <form onSubmit={handleScanInput} className="max-w-md mx-auto">
                    <input ref={scannerRef} autoFocus value={scanInput} onChange={e => setScanInput(e.target.value)}
                      className="w-full bg-white/5 border-2 border-white/10 p-6 rounded-2xl text-center text-white font-mono tracking-widest outline-none focus:border-indigo-500 mb-4"
                      placeholder="READY TO SCAN..." autoComplete="off" />
                    <button type="submit" disabled={!scanInput} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 transition-all disabled:opacity-50 flex items-center gap-2 mx-auto">
                      <Camera size={16} /> Validate Entry
                    </button>
                  </form>
                </div>
              )}

              {/* Credential Display */}
              {boView === 'DESIGNER' && (() => {
                const preview = getPreviewData();
                return (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h3 className="text-xl font-black text-slate-800 tracking-tight">Credential Preview</h3>
                      <div className="max-w-sm mx-auto bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
                        <div className="h-48 bg-slate-900 relative">
                          <img src={selectedEvent.event_image_url} className="w-full h-full object-cover opacity-60" alt="" />
                          <div className="absolute top-5 left-5 w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center border-2 border-white overflow-hidden">
                            {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover rounded-lg" /> : <span className="font-black text-slate-800 text-sm">IFB</span>}
                          </div>
                        </div>
                        <div className="p-7 space-y-5">
                          <div>
                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">{selectedEvent.location_name}</p>
                            <h4 className="text-xl font-black text-slate-900 leading-tight">{selectedEvent.event_name}</h4>
                            <p className="text-xs text-slate-400 font-bold mt-1">{formatDate(selectedEvent.event_date)}</p>
                          </div>
                          <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                            <div className="overflow-hidden">
                              <p className="text-[9px] font-black text-slate-400 uppercase">Guest</p>
                              <p className="font-bold text-slate-900 truncate">{preview.email}</p>
                            </div>
                            <div className="p-1.5 bg-white rounded-lg shadow-sm ml-2 shrink-0">
                              <QRCode value={`${APP_DOMAIN}/ticket/${preview.hash}`} size={52} />
                            </div>
                          </div>
                          <div className="flex justify-between border-t border-dashed border-slate-200 pt-5">
                            <div className="text-center flex-1"><p className="text-[8px] font-black text-slate-400 uppercase">Entry</p><p className="text-sm font-black text-slate-800">V-LEVEL</p></div>
                            <div className="w-px h-8 bg-slate-200" />
                            <div className="text-center flex-1"><p className="text-[8px] font-black text-slate-400 uppercase">Verified</p><p className="text-sm font-black text-emerald-600">DB-SYNCED</p></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col justify-center text-center">
                      <LinkIcon size={40} className="mx-auto text-indigo-600 mb-4" />
                      <h4 className="text-xl font-black text-slate-800">Public Event Link</h4>
                      <p className="text-sm text-slate-500 mt-2 mb-6">Share to allow IFB members to discover and buy tickets directly.</p>
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-xs text-slate-900 break-all mb-5 select-all">{APP_DOMAIN}/events/{selectedEvent.id}</div>
                      <button onClick={() => copyText(`${APP_DOMAIN}/events/${selectedEvent.id}`, 'Public Link Copied!')} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-md">
                        Copy Secure Link
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* ─── INLINE CONFIRM MODAL ────────────────────────────────────────── */}
      {confirmModal && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-8 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto">
              <Trash2 size={24} className="text-red-500" />
            </div>
            <h4 className="font-black text-slate-800 text-lg">Confirm Delete</h4>
            <p className="text-sm text-slate-500 font-bold leading-relaxed">
              {confirmModal.type === 'event'
                ? `Permanently delete "${confirmModal.label}" and all associated tickets?`
                : `Destroy ticket for "${confirmModal.label}"? This cannot be undone.`}
            </p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setConfirmModal(null)} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors">Cancel</button>
              <button
                onClick={() => confirmModal.type === 'event' ? deleteEvent(confirmModal.id) : deleteTicket(confirmModal.id)}
                disabled={isLoading}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-1">
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── EVENT CREATE / EDIT MODAL ────────────────────────────────────── */}
      {isCreating && mainTab === 'BOX_OFFICE' && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50/50 shrink-0">
              <h3 className="font-black text-xl text-slate-800">{editingEvent ? 'Edit Event' : 'Create New Event'}</h3>
              <button onClick={() => setIsCreating(false)} className="p-2 bg-white rounded-xl shadow-sm hover:bg-slate-100"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveEvent} className="p-8 grid grid-cols-2 gap-5 overflow-y-auto">
              <div className="col-span-2">
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Event Title *</label>
                <input required value={newEvent.name} onChange={e => setNewEvent({ ...newEvent, name: e.target.value })}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-indigo-500 text-slate-900" placeholder="Global Tech Summit 2026" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Category *</label>
                <select required value={newEvent.category} onChange={e => setNewEvent({ ...newEvent, category: e.target.value })}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-indigo-500 text-slate-900 cursor-pointer">
                  <option value="">Select Category</option>
                  {EVENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Venue / Location *</label>
                <input required value={newEvent.location} onChange={e => setNewEvent({ ...newEvent, location: e.target.value })}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-indigo-500 text-slate-900" placeholder="IFB Global HQ, New York" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Date & Time *</label>
                <input required type="datetime-local" value={newEvent.date} onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-indigo-500 text-slate-900" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Ticket Price ($)</label>
                <input required type="number" min="0" step="0.01" value={newEvent.price} onChange={e => setNewEvent({ ...newEvent, price: e.target.value })}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-indigo-500 text-slate-900" placeholder="0.00" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Total Capacity *</label>
                <input required type="number" min="1" value={newEvent.slots} onChange={e => setNewEvent({ ...newEvent, slots: e.target.value })}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-indigo-500 text-slate-900" placeholder="200" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Cover Image URL</label>
                <input value={newEvent.image} onChange={e => setNewEvent({ ...newEvent, image: e.target.value })}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-indigo-500 text-slate-900" placeholder="https://images.unsplash.com/..." />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Event Description / Message</label>
                <textarea value={newEvent.message} onChange={e => setNewEvent({ ...newEvent, message: e.target.value })}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-indigo-500 text-slate-900 h-20 resize-none" placeholder="Details, dress code, instructions..." />
              </div>
              <button type="submit" disabled={isLoading} className="col-span-2 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2">
                {isLoading ? <Loader2 className="animate-spin" size={18} /> : editingEvent ? 'Update Event' : 'Deploy Event to Network'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
