import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import QRCode from "react-qr-code";
import { Ticket, QrCode, Users, Trash2, Plus, CheckCircle, XCircle, Camera, Loader2, Search, Link as LinkIcon, Copy, Sparkles } from 'lucide-react';

export default function TicketingSystem({ session }) {
  const [activeTab, setActiveTab] = useState('events'); 
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  const [newEvent, setNewEvent] = useState({ name: '', price: 0, capacity: 100, message: '' });
  
  const [tickets, setTickets] = useState([]);
  const [scanHash, setScanHash] = useState('');
  
  // AI Smart Issuance State
  const [smartPrompt, setSmartPrompt] = useState('');
  const [generatedTickets, setGeneratedTickets] = useState([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const APP_DOMAIN = "https://deus.infinitefuturebank.org";

  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 6000);
  };

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

  useEffect(() => { fetchEvents(); }, [session]);

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    const { error } = await supabase.from('ifb_events').insert([{
      organizer_id: session.user.id,
      event_name: newEvent.name,
      ticket_price: newEvent.price,
      total_slots: newEvent.capacity,
      custom_message: newEvent.message
    }]);

    if (error) showToast(error.message, 'error');
    else {
      showToast('Event successfully forged in the network.');
      setNewEvent({ name: '', price: 0, capacity: 100, message: '' });
      setActiveTab('events');
      fetchEvents();
    }
    setIsLoading(false);
  };

  // --- EDGE-FUNCTION POWERED AI TICKET ISSUANCE ---
  const handleSmartIssue = async (e) => {
    e.preventDefault();
    if (!selectedEvent || !smartPrompt) return;
    setIsLoading(true);
    setGeneratedTickets([]);

    try {
      // Send the prompt to the Edge Brain
      const { data, error } = await supabase.functions.invoke('issue-ticket', {
        body: { 
          eventId: selectedEvent.id, 
          eventName: selectedEvent.event_name,
          prompt: smartPrompt,
          organizerEmail: session?.user?.email || 'DEUS Admin'
        }
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      showToast(`Success: ${data.tickets.length} ticket(s) generated and emails dispatched.`);
      setGeneratedTickets(data.tickets);
      setSmartPrompt('');
      fetchTickets(selectedEvent.id);

    } catch (err) {
      showToast(`Issuance Failed: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelTicket = async (ticketId) => {
    setIsLoading(true);
    const { error } = await supabase.from('ifb_tickets').update({ status: 'cancelled' }).eq('id', ticketId);
    if (error) showToast('Failed to revoke ticket.', 'error');
    else { showToast('Ticket cryptographically revoked.'); fetchTickets(selectedEvent.id); }
    setIsLoading(false);
  };

  const handleScanTicket = async (e) => {
    e.preventDefault();
    if (!scanHash) return;
    setIsLoading(true);

    let extractedHash = scanHash.trim();
    const hashMatch = extractedHash.match(/(IFB-[a-zA-Z0-9-]+)/);
    if (hashMatch) extractedHash = hashMatch[1]; 

    const { data: ticket, error: findError } = await supabase
      .from('ifb_tickets')
      .select('*')
      .eq('qr_code_hash', extractedHash)
      .eq('event_id', selectedEvent.id)
      .single();

    if (findError || !ticket) {
      showToast('INVALID TICKET: Hash not found in registry.', 'error');
    } else if (ticket.status === 'cancelled') {
      showToast('DENIED: This ticket was revoked.', 'error');
    } else if (ticket.is_scanned) {
      showToast(`DENIED: Already scanned on ${new Date(ticket.scanned_at).toLocaleString()}`, 'error');
    } else {
      const { error: updateError } = await supabase.from('ifb_tickets').update({ is_scanned: true, scanned_at: new Date() }).eq('id', ticket.id);
      if (updateError) showToast('System error during validation.', 'error');
      else { showToast('ACCESS GRANTED: Ticket Validated.', 'success'); fetchTickets(selectedEvent.id); }
    }
    setScanHash('');
    setIsLoading(false);
  };

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

      {/* VIEW: EVENT MANAGEMENT */}
      {activeTab === 'events' && selectedEvent && (
        <div className="space-y-6 animate-in slide-in-from-right-8">
          
          <button onClick={() => setSelectedEvent(null)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 flex items-center gap-2">
            ← Back to Events
          </button>

          <div className="bg-slate-900 text-white rounded-[2rem] p-8 shadow-xl flex flex-wrap justify-between items-center gap-6">
            <div>
              <h2 className="text-3xl font-black mb-2">{selectedEvent.event_name}</h2>
              <button onClick={() => { navigator.clipboard.writeText(`${APP_DOMAIN}/events/${selectedEvent.id}`); showToast('Event Link copied!'); }} className="flex items-center gap-2 text-xs text-indigo-300 font-bold uppercase tracking-widest hover:text-white transition-colors bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                <LinkIcon size={14}/> Copy Event Link
              </button>
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
            
            <div className="space-y-6">
              
              {/* SMART ISSUANCE TERMINAL */}
              <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles size={40} className="text-indigo-600"/></div>
                <h3 className="font-black text-slate-800 mb-2">Smart Issuance</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Paste emails OR type a command (e.g. "Create 10 tickets")</p>
                
                <form onSubmit={handleSmartIssue} className="space-y-4 relative z-10">
                  <textarea 
                    required 
                    value={smartPrompt} 
                    onChange={e => setSmartPrompt(e.target.value)} 
                    placeholder="john@email.com, jane@email.com&#10;OR&#10;Generate 5 generic tickets" 
                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 h-32 resize-none" 
                  />
                  <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-md hover:bg-indigo-500 disabled:opacity-50 flex items-center justify-center gap-2">
                    {isLoading ? <Loader2 size={16} className="animate-spin"/> : <Sparkles size={16}/>} 
                    {isLoading ? 'Processing...' : 'Run Command'}
                  </button>
                </form>

                {generatedTickets.length > 0 && (
                  <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center animate-in zoom-in">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2">Generated {generatedTickets.length} Ticket(s)</p>
                    <p className="text-[10px] font-bold text-slate-500 mb-4">Emails have been dispatched automatically.</p>
                    {generatedTickets.length === 1 && (
                      <div className="bg-white p-2 rounded-xl inline-block shadow-sm">
                        <QRCode value={`${APP_DOMAIN}/ticket/${generatedTickets[0].qr_code_hash}`} size={120} fgColor="#059669" />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* GATE SCANNER */}
              <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <QrCode className="text-slate-800"/> <h3 className="font-black text-slate-800">Gate Scanner</h3>
                </div>
                <form onSubmit={handleScanTicket} className="space-y-4">
                  <input type="text" value={scanHash} onChange={e => setScanHash(e.target.value)} placeholder="Scan QR..." className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-xl text-center font-mono text-sm outline-none focus:border-slate-400 focus:bg-white transition-colors" />
                  <button type="submit" disabled={!scanHash || isLoading} className="w-full bg-slate-900 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2">
                    <Camera size={14}/> Validate Entry
                  </button>
                </form>
              </div>

            </div>

            {/* GUEST LIST */}
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