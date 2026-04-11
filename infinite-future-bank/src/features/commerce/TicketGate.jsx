import React, { useState, useEffect, useRef } from 'react';
import { 
  QrCode, Camera, Ticket, Check, XCircle, Loader2, Users, 
  AlertCircle, ShieldCheck, Plus, Calendar, DollarSign, X, 
  Download, Image as ImageIcon, MapPin, Trash2, Share2, Edit2, Save, Link as LinkIcon
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import QRCode from "react-qr-code";

export default function TicketGate({ session }) {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [profile, setProfile] = useState(null);
  const [view, setView] = useState('LIST'); // LIST, SCANNER, DESIGNER

  // Creation/Design State
  const [isCreating, setIsCreating] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [newEvent, setNewEvent] = useState({ name: '', price: '', slots: '', message: '', location: '', date: '', image: '' });

  // Ticket Editing State
  const [editTicketId, setEditTicketId] = useState(null);
  const [editTicketEmail, setEditTicketEmail] = useState('');

  // Scanner/UI States
  const [scanning, setScanning] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const scannerRef = useRef(null);

  // PRODUCTION APP SETTINGS
  const APP_DOMAIN = "https://deus.infinitefuturebank.org";
  const userEmail = session?.user?.email || 'sovereign.user@deus.network';

  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchEventsAndProfile = async () => {
    setIsLoading(true);
    const { data: evData } = await supabase.from('ifb_events').select('*').eq('organizer_id', session.user.id).order('created_at', { ascending: false });
    const { data: profData } = await supabase.from('profiles').select('avatar_url, full_name').eq('id', session.user.id).single();
    setEvents(evData || []);
    if (profData) setProfile(profData);
    setIsLoading(false);
  };

  useEffect(() => { fetchEventsAndProfile(); }, [session]);

  const loadTickets = async (eventId) => {
    setIsLoading(true);
    const { data } = await supabase.from('ifb_tickets').select('*').eq('event_id', eventId).order('purchased_at', { ascending: false });
    setTickets(data || []);
    setIsLoading(false);
  };

  // --- REAL DATABASE ACTIONS (CRUD) ---

  const openCreateModal = () => {
    setEditingEvent(null);
    setNewEvent({ name: '', price: '', slots: '', message: '', location: '', date: '', image: '' });
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
      image: ev.event_image_url || '' 
    });
    setIsCreating(true);
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    const payload = {
      event_name: newEvent.name,
      ticket_price: parseFloat(newEvent.price),
      total_slots: parseInt(newEvent.slots),
      location_name: newEvent.location,
      event_date: newEvent.date,
      event_image_url: newEvent.image || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=2000&auto=format&fit=crop',
      custom_message: newEvent.message
    };

    let error;
    if (editingEvent) {
      const { error: updateError } = await supabase.from('ifb_events').update(payload).eq('id', editingEvent.id);
      error = updateError;
      if (!error && selectedEvent?.id === editingEvent.id) {
        setSelectedEvent({ ...selectedEvent, ...payload });
      }
    } else {
      const { error: insertError } = await supabase.from('ifb_events').insert([{ ...payload, organizer_id: session.user.id }]);
      error = insertError;
    }

    if (error) showToast(error.message, 'error');
    else { 
      showToast(editingEvent ? 'Event Updated Successfully.' : 'Event Live on Ledger.'); 
      setIsCreating(false); 
      setEditingEvent(null);
      fetchEventsAndProfile(); 
    }
    setIsLoading(false);
  };

  const deleteEvent = async (eventId) => {
    if (!window.confirm("WARNING: This will permanently delete the event and destroy all associated tickets. Proceed?")) return;
    setIsLoading(true);
    const { error } = await supabase.from('ifb_events').delete().eq('id', eventId);
    if (error) showToast(error.message, 'error');
    else { 
      showToast('Event Permanently Deleted.', 'success'); 
      if (selectedEvent && selectedEvent.id === eventId) setSelectedEvent(null);
      fetchEventsAndProfile(); 
    }
    setIsLoading(false);
  };

  const updateTicketEmail = async (ticketId) => {
    if (!editTicketEmail.trim()) return;
    setIsLoading(true);
    const { error } = await supabase.from('ifb_tickets').update({ buyer_email: editTicketEmail }).eq('id', ticketId);
    if (error) showToast(error.message, 'error');
    else {
      showToast('Ticket Reassigned.', 'success');
      setEditTicketId(null);
      loadTickets(selectedEvent.id);
    }
    setIsLoading(false);
  };

  const deleteTicket = async (ticketId) => {
    if (!window.confirm("Destroy this ticket permanently? This will erase it from the ledger.")) return;
    setIsLoading(true);
    const { error } = await supabase.from('ifb_tickets').delete().eq('id', ticketId);
    if (error) showToast(error.message, 'error');
    else { 
      showToast('Ticket Destroyed.', 'success'); 
      loadTickets(selectedEvent.id); 
    }
    setIsLoading(false);
  };

  const exportGuestList = () => {
    const csvRows = [
      ["Email", "Status", "Scanned At", "Ref ID"],
      ...tickets.map(t => [t.buyer_email, t.status, t.scanned_at ? new Date(t.scanned_at).toLocaleString() : 'N/A', t.qr_code_hash])
    ];
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `${selectedEvent.event_name.replace(/\s+/g, '_')}_guests.csv`);
    document.body.appendChild(link);
    link.click();
  };

  // REAL SCANNER VALIDATION
  const handleScanInput = async (e) => {
    e.preventDefault();
    let hash = scanInput.trim();
    if (!hash) return;

    const hashMatch = hash.match(/(IFB-[a-zA-Z0-9-]+)/);
    if (hashMatch) hash = hashMatch[1]; 

    setScanInput('');
    const { data: ticket, error } = await supabase.from('ifb_tickets').select('*').eq('qr_code_hash', hash).eq('event_id', selectedEvent.id).single();

    if (error || !ticket) showToast('INVALID TICKET: Hash not found in DB', 'error');
    else if (ticket.status === 'cancelled') showToast('DENIED: Ticket Revoked', 'error');
    else if (ticket.is_scanned) showToast(`ALREADY USED: ${new Date(ticket.scanned_at).toLocaleTimeString()}`, 'error');
    else {
      await supabase.from('ifb_tickets').update({ is_scanned: true, scanned_at: new Date() }).eq('id', ticket.id);
      showToast('AUTHORIZED: Access Granted', 'success');
      loadTickets(selectedEvent.id);
    }
  };

  const copyToClipboard = (text, successMsg) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text);
    } else {
      let textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      textArea.remove();
    }
    showToast(successMsg);
  };

  const getPreviewData = () => {
    if (tickets.length > 0) return { email: tickets[0].buyer_email, hash: tickets[0].qr_code_hash };
    return { email: session?.user?.email, hash: `IFB-PREV-${selectedEvent.id.substring(0, 8)}` };
  };

  if (!selectedEvent) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Event Management</h2>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Institutional Ticket Engine</p>
          </div>
          <button onClick={openCreateModal} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase flex items-center gap-2 shadow-xl hover:bg-indigo-500 transition-all"><Plus size={16}/> Forge Event</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {events.length === 0 && !isLoading && (
            <div className="col-span-full text-center py-12 bg-white rounded-3xl border border-slate-200">
               <p className="text-sm font-bold text-slate-500">No active events found. Forge a new event to begin selling.</p>
            </div>
          )}
          {events.map(ev => (
            <div key={ev.id} className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all group relative">
               
               {/* Edit & Delete Overlay */}
               <div className="absolute top-4 right-4 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button onClick={(e) => { e.stopPropagation(); openEditModal(ev); }} className="p-2 bg-white/90 backdrop-blur rounded-xl text-slate-600 hover:text-blue-600 shadow-md transition-colors" title="Edit Event"><Edit2 size={16}/></button>
                 <button onClick={(e) => { e.stopPropagation(); deleteEvent(ev.id); }} className="p-2 bg-white/90 backdrop-blur rounded-xl text-slate-600 hover:text-red-600 shadow-md transition-colors" title="Delete Event"><Trash2 size={16}/></button>
               </div>

               <div className="h-32 bg-slate-100 relative">
                  <img src={ev.event_image_url} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" alt=""/>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <span className="absolute bottom-4 left-4 text-white font-black text-xs uppercase tracking-widest flex items-center gap-2"><Calendar size={14}/> {new Date(ev.event_date).toLocaleDateString()}</span>
               </div>
               <div className="p-6">
                 <h3 className="font-black text-lg text-slate-800 mb-4 truncate">{ev.event_name}</h3>
                 <button onClick={() => { setSelectedEvent(ev); loadTickets(ev.id); }} className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-colors">Manage Operations</button>
               </div>
            </div>
          ))}
        </div>

        {isCreating && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
            <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden border border-white/20">
              <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
                <h3 className="font-black text-xl text-slate-800">{editingEvent ? 'Edit Event Details' : 'Event Creator'}</h3>
                <button onClick={() => setIsCreating(false)} className="p-2 bg-white rounded-xl shadow-sm hover:bg-slate-100 transition-colors"><X size={20}/></button>
              </div>
              <form onSubmit={handleSaveEvent} className="p-10 grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Event Title</label>
                  <input required value={newEvent.name} onChange={e=>setNewEvent({...newEvent, name: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-indigo-500 text-slate-900" placeholder="Global Tech Summit 2026"/>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Venue/Location</label>
                  <input required value={newEvent.location} onChange={e=>setNewEvent({...newEvent, location: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-indigo-500 text-slate-900" placeholder="IFB Global HQ"/>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Date & Time</label>
                  <input required type="datetime-local" value={newEvent.date} onChange={e=>setNewEvent({...newEvent, date: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-indigo-500 text-slate-900"/>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Ticket Price ($)</label>
                  <input required type="number" step="0.01" value={newEvent.price} onChange={e=>setNewEvent({...newEvent, price: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-indigo-500 text-slate-900" placeholder="0.00"/>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Total Capacity</label>
                  <input required type="number" value={newEvent.slots} onChange={e=>setNewEvent({...newEvent, slots: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-indigo-500 text-slate-900" placeholder="100"/>
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest flex items-center justify-between">
                    <span>Cover Image URL</span>
                    <span className="text-indigo-500">Logo is auto-pulled from your Profile</span>
                  </label>
                  <input value={newEvent.image} onChange={e=>setNewEvent({...newEvent, image: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-indigo-500 text-slate-900" placeholder="https://..."/>
                </div>
                <button type="submit" disabled={isLoading} className="col-span-2 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl disabled:opacity-50">
                  {isLoading ? <Loader2 className="animate-spin mx-auto"/> : editingEvent ? 'Update Event Data' : 'Deploy Secure Event'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  const preview = getPreviewData();

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 pb-20">
      {notification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[700] animate-in slide-in-from-top-4">
           <div className={`px-10 py-5 rounded-full shadow-2xl border-4 backdrop-blur-2xl flex items-center gap-4 ${notification.type === 'success' ? 'bg-emerald-900 border-emerald-500 text-emerald-400' : 'bg-red-900 border-red-500 text-red-400'}`}>
             {notification.type === 'success' ? <ShieldCheck size={28}/> : <XCircle size={28}/>}
             <p className="font-black text-sm uppercase tracking-[0.2em] text-white">{notification.msg}</p>
           </div>
        </div>
      )}

      {/* Control Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <button onClick={() => setSelectedEvent(null)} className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-900 flex items-center gap-2">← Back to Registry</button>
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-full md:w-auto">
          <button onClick={() => setView('LIST')} className={`flex-1 px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${view === 'LIST' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>Guest List</button>
          <button onClick={() => setView('SCANNER')} className={`flex-1 px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${view === 'SCANNER' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>Gate Scanner</button>
          <button onClick={() => setView('DESIGNER')} className={`flex-1 px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${view === 'DESIGNER' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>Credential Display</button>
        </div>
      </div>

      {/* VIEW: GUEST MASTERLIST */}
      {view === 'LIST' && (
        <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden animate-in fade-in">
           <div className="p-10 border-b border-slate-100 flex justify-between items-center flex-wrap gap-4">
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tighter">{selectedEvent.event_name}</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{tickets.length} / {selectedEvent.total_slots} Issued • {tickets.filter(t=>t.is_scanned).length} Checked In</p>
              </div>
              <button onClick={exportGuestList} className="p-4 bg-slate-50 rounded-2xl hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition-all border border-slate-100 flex items-center gap-2"><Download size={18}/> <span className="text-[10px] font-black uppercase">Export CSV</span></button>
           </div>
           <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left">
                <thead className="bg-slate-50">
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="p-6">Identity / Email</th>
                    <th className="p-6">Status</th>
                    <th className="p-6">Purchase Date</th>
                    <th className="p-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {tickets.length === 0 ? (
                    <tr><td colSpan="4" className="p-10 text-center text-sm font-bold text-slate-400">No tickets issued yet.</td></tr>
                  ) : tickets.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-6">
                        {editTicketId === t.id ? (
                          <div className="flex items-center gap-2">
                            <input 
                              type="email" 
                              value={editTicketEmail} 
                              onChange={(e) => setEditTicketEmail(e.target.value)}
                              className="px-3 py-1.5 border border-blue-300 rounded-lg text-sm font-bold text-slate-900 outline-none w-48"
                              autoFocus
                            />
                            <button onClick={() => updateTicketEmail(t.id)} className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"><Save size={14}/></button>
                            <button onClick={() => setEditTicketId(null)} className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors"><X size={14}/></button>
                          </div>
                        ) : (
                          <>
                            <p className="font-bold text-slate-800">{t.buyer_email}</p>
                            <p className="text-[9px] font-mono text-slate-400">HASH: {t.qr_code_hash.substring(0,18)}...</p>
                          </>
                        )}
                      </td>
                      <td className="p-6">
                        {t.status === 'cancelled' ? <span className="text-[8px] bg-red-50 text-red-500 px-2 py-1 rounded-md font-black uppercase">Revoked</span> :
                         t.is_scanned ? <span className="text-[8px] bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md font-black uppercase">At Door</span> :
                         <span className="text-[8px] bg-blue-50 text-blue-600 px-2 py-1 rounded-md font-black uppercase">Active</span>}
                      </td>
                      <td className="p-6 text-xs text-slate-400 font-bold">{new Date(t.purchased_at).toLocaleDateString()}</td>
                      <td className="p-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => copyToClipboard(`${APP_DOMAIN}/ticket/${t.qr_code_hash}`, 'Ticket Link Copied!')} className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Copy Ticket Link"><Share2 size={16}/></button>
                          <button onClick={() => { setEditTicketId(t.id); setEditTicketEmail(t.buyer_email); }} className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit Email"><Edit2 size={16}/></button>
                          <button onClick={() => deleteTicket(t.id)} className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:text-red-600 hover:bg-red-50 transition-colors" title="Destroy"><Trash2 size={16}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
        </div>
      )}

      {/* VIEW: GATE SCANNER */}
      {view === 'SCANNER' && (
        <div className="bg-slate-900 rounded-[3rem] p-12 text-center border border-slate-800 shadow-2xl animate-in zoom-in-95">
           <div className={`w-24 h-24 mx-auto rounded-[2rem] flex items-center justify-center mb-8 shadow-xl transition-all ${scanning ? 'bg-indigo-600 text-white rotate-12 scale-110 shadow-indigo-500/20' : 'bg-white/5 text-slate-600'}`}>
              <QrCode size={48} />
           </div>
           <h3 className="text-3xl font-black text-white mb-2">Gate Access Terminal</h3>
           <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-12">Connect USB Scanner or Focus Input</p>
           
           <form onSubmit={handleScanInput} className="max-w-md mx-auto">
              <input 
                ref={scannerRef}
                autoFocus 
                value={scanInput}
                onChange={e=>setScanInput(e.target.value)}
                className="w-full bg-white/5 border-2 border-white/10 p-6 rounded-2xl text-center text-white font-mono tracking-widest outline-none focus:border-indigo-500 focus:bg-white/10 transition-all mb-4"
                placeholder="READY TO SCAN..."
                autoComplete='off'
              />
              <p className="text-[9px] text-slate-500 font-bold uppercase">System will auto-process on scan completion. Live verification against DB.</p>
           </form>
        </div>
      )}

      {/* VIEW: DIGITAL CARD DESIGNER (Visual Credential) */}
      {view === 'DESIGNER' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 animate-in slide-in-from-bottom-6">
           <div className="space-y-6">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Institutional Credential Display</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Live preview. Your personal organization logo is automatically rendered on every ticket.
              </p>
              
              <div className="max-w-sm mx-auto bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
                <div className="h-48 bg-slate-900 relative">
                   <img src={selectedEvent.event_image_url} className="w-full h-full object-cover opacity-60" alt="Event Cover"/>
                   <div className="absolute top-6 left-6 w-14 h-14 bg-white rounded-xl shadow-lg flex items-center justify-center border-2 border-white overflow-hidden p-1">
                      {profile?.avatar_url ? (
                         <img src={profile.avatar_url} alt="Org Logo" className="w-full h-full object-cover rounded-lg" />
                      ) : (
                         <span className="text-slate-800 font-black text-lg">IFB</span>
                      )}
                   </div>
                </div>
                <div className="p-8 flex-1 space-y-6">
                   <div>
                     <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">{selectedEvent.location_name}</p>
                     <h4 className="text-2xl font-black text-slate-900 leading-tight">{selectedEvent.event_name}</h4>
                   </div>
                   
                   <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div className="w-full overflow-hidden">
                        <p className="text-[9px] font-black text-slate-400 uppercase">Guest Identity</p>
                        <p className="font-bold text-slate-900 truncate" title={preview.email}>{preview.email}</p>
                      </div>
                      <div className="p-2 bg-white rounded-lg shadow-sm ml-2 shrink-0">
                        <QRCode value={`${APP_DOMAIN}/ticket/${preview.hash}`} size={50} />
                      </div>
                   </div>

                   <div className="flex justify-between border-t border-dashed border-slate-200 pt-6">
                      <div className="text-center flex-1">
                         <p className="text-[8px] font-black text-slate-400 uppercase">Gate Entry</p>
                         <p className="text-sm font-black text-slate-800">V-LEVEL</p>
                      </div>
                      <div className="w-px h-8 bg-slate-200"></div>
                      <div className="text-center flex-1">
                         <p className="text-[8px] font-black text-slate-400 uppercase">Verification</p>
                         <p className="text-sm font-black text-emerald-600">DB-SYNCED</p>
                      </div>
                   </div>
                </div>
              </div>
           </div>

           <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col justify-center text-center">
              <LinkIcon size={48} className="mx-auto text-indigo-600 mb-6"/>
              <h4 className="text-xl font-black text-slate-800">Live Portal URL</h4>
              <p className="text-sm text-slate-500 mt-2 mb-8">Share this exact link to allow guests to view details and purchase tickets.</p>
              
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-xs text-slate-900 break-all mb-6 select-all">
                {APP_DOMAIN}/events/{selectedEvent.id}
              </div>
              
              <button onClick={() => copyToClipboard(`${APP_DOMAIN}/events/${selectedEvent.id}`, 'Public Link Copied!')} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-md">
                Copy Secure Link
              </button>
           </div>
        </div>
      )}
    </div>
  );
}