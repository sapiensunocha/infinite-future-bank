import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import QRCode from "react-qr-code";
import { Ticket, QrCode, Users, Trash2, ShieldCheck, Plus, CheckCircle, XCircle, AlertCircle, Camera, Loader2, Search } from 'lucide-react';

export default function TicketingSystem({ session }) {
  const [activeTab, setActiveTab] = useState('events'); // 'events', 'create', 'manage'
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // Create Event Form
  const [newEvent, setNewEvent] = useState({ name: '', price: 0, capacity: 100, message: '' });
  
  // Manage Event State
  const [tickets, setTickets] = useState([]);
  const [issueEmail, setIssueEmail] = useState('');
  const [scanHash, setScanHash] = useState('');
  const [generatedTicket, setGeneratedTicket] = useState(null);
  
  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // --- 1. REAL DATABASE FETCHING ---
  const fetchEvents = async () => {
    if (!session?.user?.id) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('ifb_events')
      .select('*')
      .eq('organizer_id', session.user.id)
      .order('created_at', { ascending: false });
      
    if (!error && data) setEvents(data);
    setIsLoading(false);
  };

  const fetchTickets = async (eventId) => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('ifb_tickets')
      .select('*')
      .eq('event_id', eventId)
      .order('purchased_at', { ascending: false });
      
    if (!error && data) setTickets(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, [session]);

  // --- 2. REAL EVENT CREATION ---
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    const { data, error } = await supabase.from('ifb_events').insert([{
      organizer_id: session.user.id,
      event_name: newEvent.name,
      ticket_price: newEvent.price,
      total_slots: newEvent.capacity,
      custom_message: newEvent.message
    }]).select().single();

    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast('Event successfully forged in the network.');
      setNewEvent({ name: '', price: 0, capacity: 100, message: '' });
      setActiveTab('events');
      fetchEvents();
    }
    setIsLoading(false);
  };

  // --- 3. REAL TICKET ISSUANCE ---
  const handleIssueTicket = async (e) => {
    e.preventDefault();
    if (!selectedEvent) return;
    setIsLoading(true);

    // Generate a unique cryptographic hash for the QR code
    const uniqueHash = `IFB-${crypto.randomUUID()}`;

    const { data, error } = await supabase.from('ifb_tickets').insert([{
      event_id: selectedEvent.id,
      buyer_email: issueEmail, // Assuming you added buyer_email to your DB, or repurpose buyer_id
      qr_code_hash: uniqueHash,
      status: 'active'
    }]).select().single();

    if (error) {
      showToast('Failed to issue ticket. Capacity may be reached.', 'error');
    } else {
      showToast('Ticket generated successfully.');
      setGeneratedTicket(data);
      setIssueEmail('');
      fetchTickets(selectedEvent.id);
    }
    setIsLoading(false);
  };

  // --- 4. REAL TICKET REVOCATION ---
  const handleCancelTicket = async (ticketId) => {
    setIsLoading(true);
    const { error } = await supabase
      .from('ifb_tickets')
      .update({ status: 'cancelled' })
      .eq('id', ticketId);

    if (error) {
      showToast('Failed to revoke ticket.', 'error');
    } else {
      showToast('Ticket cryptographically revoked.');
      fetchTickets(selectedEvent.id);
    }
    setIsLoading(false);
  };

  // --- 5. REAL BOX OFFICE SCANNER ---
  const handleScanTicket = async (e) => {
    e.preventDefault();
    if (!scanHash) return;
    setIsLoading(true);

    // 1. Find the ticket
    const { data: ticket, error: findError } = await supabase
      .from('ifb_tickets')
      .select('*')
      .eq('qr_code_hash', scanHash.trim())
      .eq('event_id', selectedEvent.id)
      .single();

    if (findError || !ticket) {
      showToast('INVALID TICKET: Hash not found in registry.', 'error');
      setScanHash('');
      setIsLoading(false);
      return;
    }

    if (ticket.status === 'cancelled') {
      showToast('DENIED: This ticket was revoked.', 'error');
    } else if (ticket.is_scanned) {
      showToast(`DENIED: Already scanned on ${new Date(ticket.scanned_at).toLocaleString()}`, 'error');
    } else {
      // 2. Mark as scanned
      const { error: updateError } = await supabase
        .from('ifb_tickets')
        .update({ is_scanned: true, scanned_at: new Date() })
        .eq('id', ticket.id);

      if (updateError) {
        showToast('System error during validation.', 'error');
      } else {
        showToast('ACCESS GRANTED: Ticket Validated.', 'success');
        fetchTickets(selectedEvent.id);
      }
    }
    setScanHash('');
    setIsLoading(false);
  };

  // UI RENDERERS
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER & TOASTS */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <Ticket className="text-indigo-600"/> Box Office Control
        </h2>
        {isLoading && <Loader2 className="animate-spin text-indigo-600" size={24} />}
      </div>

      {notification && (
        <div className={`p-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-md border ${notification.type === 'error' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
          {notification.type === 'error' ? <XCircle size={18}/> : <CheckCircle size={18}/>}
          {notification.msg}
        </div>
      )}

      {/* TABS */}
      <div className="flex gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm w-fit">
        <button onClick={() => { setActiveTab('events'); setSelectedEvent(null); }} className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'events' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>My Events</button>
        <button onClick={() => setActiveTab('create')} className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'create' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>Create Event</button>
      </div>

      {/* VIEW: CREATE EVENT */}
      {activeTab === 'create' && (
        <form onSubmit={handleCreateEvent} className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-xl max-w-2xl">
          <h3 className="text-xl font-black mb-6">Forge a New Event</h3>
          <div className="space-y-5">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Event Name</label>
              <input required type="text" value={newEvent.name} onChange={e => setNewEvent({...newEvent, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold outline-none focus:border-indigo-500" placeholder="e.g., Founder's Gala 2026"/>
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Capacity (Tickets)</label>
                <input required type="number" min="1" value={newEvent.capacity} onChange={e => setNewEvent({...newEvent, capacity: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold outline-none focus:border-indigo-500"/>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Price (USD)</label>
                <input required type="number" min="0" step="0.01" value={newEvent.price} onChange={e => setNewEvent({...newEvent, price: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold outline-none focus:border-indigo-500"/>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Ticket Message</label>
              <textarea value={newEvent.message} onChange={e => setNewEvent({...newEvent, message: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold outline-none focus:border-indigo-500 h-24" placeholder="Instructions for attendees..."></textarea>
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 text-white p-5 rounded-xl font-black uppercase tracking-widest shadow-lg hover:bg-indigo-500 transition-all disabled:opacity-50">
              Deploy Smart Event
            </button>
          </div>
        </form>
      )}

      {/* VIEW: MY EVENTS LIST */}
      {activeTab === 'events' && !selectedEvent && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.length === 0 && !isLoading && (
            <div className="col-span-full py-12 text-center bg-white rounded-[2rem] border border-dashed border-slate-300">
              <Ticket size={40} className="mx-auto text-slate-300 mb-4"/>
              <p className="font-bold text-slate-500">No active events found.</p>
            </div>
          )}
          {events.map(ev => (
            <div key={ev.id} className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-md hover:shadow-xl transition-all cursor-pointer group" onClick={() => { setSelectedEvent(ev); fetchTickets(ev.id); }}>
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Users size={24}/>
              </div>
              <h4 className="font-black text-lg text-slate-800 mb-1">{ev.event_name}</h4>
              <p className="text-xs font-bold text-slate-400 mb-4">${parseFloat(ev.ticket_price).toFixed(2)} per ticket</p>
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500 border-t border-slate-100 pt-4">
                <span>Capacity: {ev.total_slots}</span>
                <span className="text-indigo-600 flex items-center gap-1">Manage <Plus size={12}/></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW: EVENT MANAGEMENT (Scanner, Issuance, List) */}
      {activeTab === 'events' && selectedEvent && (
        <div className="space-y-6 animate-in slide-in-from-right-8">
          
          <button onClick={() => setSelectedEvent(null)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 flex items-center gap-2">
            ← Back to Events
          </button>

          {/* Event Stats Header */}
          <div className="bg-slate-900 text-white rounded-[2rem] p-8 shadow-xl flex flex-wrap justify-between items-center gap-6">
            <div>
              <h2 className="text-3xl font-black mb-1">{selectedEvent.event_name}</h2>
              <p className="text-xs text-indigo-300 font-bold uppercase tracking-widest">Live Operations Deck</p>
            </div>
            <div className="flex gap-6 text-center">
               <div className="bg-white/10 px-6 py-3 rounded-2xl backdrop-blur-md">
                 <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Tickets Issued</p>
                 <p className="text-2xl font-black">{tickets.length} / {selectedEvent.total_slots}</p>
               </div>
               <div className="bg-indigo-500/20 border border-indigo-500/30 px-6 py-3 rounded-2xl backdrop-blur-md">
                 <p className="text-[10px] uppercase tracking-widest text-indigo-300 mb-1">Checked In</p>
                 <p className="text-2xl font-black text-emerald-400">{tickets.filter(t => t.is_scanned).length}</p>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LEFT COLUMN: ISSUANCE & SCANNER */}
            <div className="space-y-6">
              
              {/* TERMINAL: SCAN TICKET */}
              <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <QrCode className="text-indigo-600"/> <h3 className="font-black text-slate-800">Gate Scanner</h3>
                </div>
                <form onSubmit={handleScanTicket} className="space-y-4">
                  <input type="text" autoFocus value={scanHash} onChange={e => setScanHash(e.target.value)} placeholder="Click here & scan QR..." className="w-full bg-slate-50 border-2 border-indigo-100 p-4 rounded-xl text-center font-mono text-sm outline-none focus:border-indigo-500 focus:bg-indigo-50 transition-colors shadow-inner" />
                  <button type="submit" disabled={!scanHash || isLoading} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md hover:bg-indigo-500 disabled:opacity-50 flex items-center justify-center gap-2">
                    <Camera size={14}/> Validate Entry
                  </button>
                </form>
                <p className="text-[9px] text-center text-slate-400 mt-4 font-bold uppercase tracking-widest">Connect USB Barcode Scanner or type hash directly.</p>
              </div>

              {/* TERMINAL: ISSUE TICKET */}
              <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-lg">
                <h3 className="font-black text-slate-800 mb-4">Issue New Ticket</h3>
                <form onSubmit={handleIssueTicket} className="space-y-4">
                  <input required type="email" value={issueEmail} onChange={e => setIssueEmail(e.target.value)} placeholder="Guest Email" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-sm outline-none focus:border-indigo-500" />
                  <button type="submit" disabled={isLoading} className="w-full bg-slate-900 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2">
                    <Plus size={14}/> Generate Crypto-Ticket
                  </button>
                </form>

                {generatedTicket && (
                  <div className="mt-6 p-4 bg-indigo-50 border border-indigo-200 rounded-2xl text-center animate-in zoom-in">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-4">Success: Ticket Ready</p>
                    <div className="bg-white p-2 rounded-xl inline-block shadow-sm">
                      <QRCode value={generatedTicket.qr_code_hash} size={120} fgColor="#4f46e5" />
                    </div>
                    <p className="text-[8px] font-mono text-slate-500 mt-2 break-all">{generatedTicket.qr_code_hash}</p>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: GUEST LIST */}
            <div className="lg:col-span-2 bg-white rounded-[2rem] p-6 border border-slate-100 shadow-lg flex flex-col h-[600px]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-slate-800">Live Guest Masterlist</h3>
                <div className="bg-slate-50 p-2 rounded-xl flex items-center gap-2 border border-slate-200">
                  <Search size={14} className="text-slate-400 ml-2"/>
                  <input type="text" placeholder="Search..." className="bg-transparent text-xs font-bold outline-none border-none" />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto no-scrollbar border border-slate-100 rounded-xl">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="p-4">Ticket / Email</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-bold divide-y divide-slate-50">
                    {tickets.length === 0 ? (
                      <tr><td colSpan="3" className="p-8 text-center text-slate-400">No tickets issued yet.</td></tr>
                    ) : (
                      tickets.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4">
                            <p className="text-slate-800">{t.buyer_email || 'Walk-in Guest'}</p>
                            <p className="text-[9px] text-slate-400 font-mono mt-1">{t.qr_code_hash.substring(0,18)}...</p>
                          </td>
                          <td className="p-4">
                            {t.status === 'cancelled' ? (
                               <span className="text-[9px] uppercase tracking-widest bg-red-50 text-red-600 px-2 py-1 rounded-md border border-red-100">Revoked</span>
                            ) : t.is_scanned ? (
                               <span className="text-[9px] uppercase tracking-widest bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md border border-emerald-100">Checked In</span>
                            ) : (
                               <span className="text-[9px] uppercase tracking-widest bg-blue-50 text-blue-600 px-2 py-1 rounded-md border border-blue-100">Pending Entry</span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            {t.status !== 'cancelled' && !t.is_scanned && (
                              <button onClick={() => handleCancelTicket(t.id)} className="text-red-400 hover:text-red-600 transition-colors p-2 bg-white rounded-lg shadow-sm border border-slate-100 hover:border-red-200" title="Revoke Ticket">
                                <Trash2 size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}