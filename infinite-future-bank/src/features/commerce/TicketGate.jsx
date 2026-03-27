import React, { useState, useEffect, useRef } from 'react';
import { 
  QrCode, Camera, Ticket, Check, XCircle, Loader2, Users, 
  AlertCircle, ShieldCheck, Plus, Calendar, DollarSign, X, 
  Download, Image as ImageIcon, MapPin, Trash2, Share2, Printer
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import QRCode from "react-qr-code";

export default function TicketGate({ session }) {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [view, setView] = useState('LIST'); // LIST, SCANNER, DESIGNER

  // Creation/Design State
  const [isCreating, setIsCreating] = useState(false);
  const [newEvent, setNewEvent] = useState({ name: '', price: '', slots: '', message: '', location: '', date: '', image: '' });

  // Scanner/UI States
  const [scanning, setScanning] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const scannerRef = useRef(null);

  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchEvents = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('ifb_events').select('*').eq('organizer_id', session.user.id).order('created_at', { ascending: false });
    setEvents(data || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchEvents(); }, [session]);

  const loadTickets = async (eventId) => {
    setIsLoading(true);
    const { data } = await supabase.from('ifb_tickets').select('*').eq('event_id', eventId).order('purchased_at', { ascending: false });
    setTickets(data || []);
    setIsLoading(false);
  };

  // --- ACTIONS ---
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await supabase.from('ifb_events').insert([{
      organizer_id: session.user.id,
      event_name: newEvent.name,
      ticket_price: parseFloat(newEvent.price),
      total_slots: parseInt(newEvent.slots),
      location_name: newEvent.location,
      event_date: newEvent.date,
      event_image_url: newEvent.image || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=2000&auto=format&fit=crop',
      custom_message: newEvent.message
    }]);
    if (error) showToast(error.message, 'error');
    else { showToast('Event Live.'); setIsCreating(false); fetchEvents(); }
    setIsLoading(false);
  };

  const cancelTicket = async (ticketId) => {
    if (!window.confirm("Are you sure? This will cryptographically revoke entry.")) return;
    const { error } = await supabase.from('ifb_tickets').update({ status: 'cancelled' }).eq('id', ticketId);
    if (!error) { showToast('Ticket Revoked.'); loadTickets(selectedEvent.id); }
  };

  const exportGuestList = () => {
    const csvRows = [
      ["Email", "Status", "Scanned At", "Ref ID"],
      ...tickets.map(t => [t.buyer_email, t.status, t.scanned_at || 'N/A', t.qr_code_hash])
    ];
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `${selectedEvent.event_name}_guests.csv`);
    document.body.appendChild(link);
    link.click();
  };

  // SCANNER HANDLER
  const handleScanInput = async (e) => {
    e.preventDefault();
    const hash = scanInput.trim();
    if (!hash) return;
    setScanInput('');
    const { data: ticket, error } = await supabase.from('ifb_tickets').select('*').eq('qr_code_hash', hash).eq('event_id', selectedEvent.id).single();

    if (error || !ticket) showToast('INVALID TICKET', 'error');
    else if (ticket.status === 'cancelled') showToast('REVOKED', 'error');
    else if (ticket.is_scanned) showToast('ALREADY USED', 'error');
    else {
      await supabase.from('ifb_tickets').update({ is_scanned: true, scanned_at: new Date() }).eq('id', ticket.id);
      showToast('AUTHORIZED', 'success');
      loadTickets(selectedEvent.id);
    }
  };

  if (!selectedEvent) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Event Management</h2>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Institutional Ticket Engine</p>
          </div>
          <button onClick={() => setIsCreating(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase flex items-center gap-2 shadow-xl hover:bg-indigo-500 transition-all"><Plus size={16}/> Forge Event</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {events.map(ev => (
            <div key={ev.id} className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all group">
               <div className="h-32 bg-slate-100 relative">
                  <img src={ev.event_image_url} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" alt=""/>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <span className="absolute bottom-4 left-4 text-white font-black text-xs uppercase tracking-widest flex items-center gap-2"><Calendar size={14}/> {new Date(ev.event_date).toLocaleDateString()}</span>
               </div>
               <div className="p-6">
                 <h3 className="font-black text-lg text-slate-800 mb-4">{ev.event_name}</h3>
                 <button onClick={() => { setSelectedEvent(ev); loadTickets(ev.id); }} className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-colors">Manage Operations</button>
               </div>
            </div>
          ))}
        </div>

        {isCreating && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
            <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden border border-white/20">
              <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
                <h3 className="font-black text-xl text-slate-800">Event Creator</h3>
                <button onClick={() => setIsCreating(false)} className="p-2 bg-white rounded-xl shadow-sm"><X size={20}/></button>
              </div>
              <form onSubmit={handleCreateEvent} className="p-10 grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Event Title</label>
                  <input required value={newEvent.name} onChange={e=>setNewEvent({...newEvent, name: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold" placeholder="Gala 2026"/>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Venue/Location</label>
                  <input required value={newEvent.location} onChange={e=>setNewEvent({...newEvent, location: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold" placeholder="IFB Global HQ"/>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Date & Time</label>
                  <input required type="datetime-local" value={newEvent.date} onChange={e=>setNewEvent({...newEvent, date: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold"/>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Ticket Price ($)</label>
                  <input required type="number" value={newEvent.price} onChange={e=>setNewEvent({...newEvent, price: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold" placeholder="0.00"/>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Total Slots</label>
                  <input required type="number" value={newEvent.slots} onChange={e=>setNewEvent({...newEvent, slots: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold" placeholder="100"/>
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Cover Image URL</label>
                  <input value={newEvent.image} onChange={e=>setNewEvent({...newEvent, image: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold" placeholder="https://..."/>
                </div>
                <button type="submit" className="col-span-2 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl">Deploy Secure Event</button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 pb-20">
      {/* Dynamic Scan Alerts */}
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
          <button onClick={() => setView('DESIGNER')} className={`flex-1 px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${view === 'DESIGNER' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>Design Card</button>
        </div>
      </div>

      {/* VIEW: GUEST MASTERLIST */}
      {view === 'LIST' && (
        <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden animate-in fade-in">
           <div className="p-10 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tighter">{selectedEvent.event_name}</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{tickets.length} Issued • {tickets.filter(t=>t.is_scanned).length} Checked In</p>
              </div>
              <button onClick={exportGuestList} className="p-4 bg-slate-50 rounded-2xl hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition-all border border-slate-100 flex items-center gap-2"><Download size={18}/> <span className="text-[10px] font-black uppercase">Export CSV</span></button>
           </div>
           <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left">
                <thead className="bg-slate-50">
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="p-6">Identity</th>
                    <th className="p-6">Status</th>
                    <th className="p-6">Purchase Date</th>
                    <th className="p-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {tickets.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-6"><p className="font-bold text-slate-800">{t.buyer_email}</p><p className="text-[9px] font-mono text-slate-400">HASH: {t.qr_code_hash.substring(0,12)}</p></td>
                      <td className="p-6">
                        {t.status === 'cancelled' ? <span className="text-[8px] bg-red-50 text-red-500 px-2 py-1 rounded-md font-black uppercase">Revoked</span> :
                         t.is_scanned ? <span className="text-[8px] bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md font-black uppercase">At Door</span> :
                         <span className="text-[8px] bg-blue-50 text-blue-600 px-2 py-1 rounded-md font-black uppercase">Active</span>}
                      </td>
                      <td className="p-6 text-xs text-slate-400 font-bold">{new Date(t.purchased_at).toLocaleDateString()}</td>
                      <td className="p-6 text-right">
                        {t.status !== 'cancelled' && <button onClick={() => cancelTicket(t.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>}
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
           
           <form onSubmit={handleScanInput} className="max-w-xs mx-auto">
              <input 
                ref={scannerRef}
                autoFocus 
                value={scanInput}
                onChange={e=>setScanInput(e.target.value)}
                className="w-full bg-white/5 border-2 border-white/10 p-6 rounded-2xl text-center text-white font-mono tracking-widest outline-none focus:border-indigo-500 focus:bg-white/10 transition-all mb-4"
                placeholder="READY TO SCAN..."
                autoComplete='off'
              />
              <p className="text-[9px] text-slate-500 font-bold uppercase">System will auto-process on scan completion</p>
           </form>
        </div>
      )}

      {/* VIEW: DIGITAL CARD DESIGNER (Visual Credential) */}
      {view === 'DESIGNER' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 animate-in slide-in-from-bottom-6">
           <div className="space-y-6">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Institutional Credential Preview</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">This is how attendees see their ticket. Every ticket includes a dynamic QR hash verified against the IFB Ledger.</p>
              
              {/* THE TICKET DESIGN */}
              <div className="max-w-sm mx-auto bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
                <div className="h-48 bg-slate-900 relative">
                   <img src={selectedEvent.event_image_url} className="w-full h-full object-cover opacity-60" alt=""/>
                   <div className="absolute top-6 left-6 w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
                      <span className="text-white font-black text-lg">IFB</span>
                   </div>
                </div>
                <div className="p-8 flex-1 space-y-6">
                   <div>
                     <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">{selectedEvent.location_name}</p>
                     <h4 className="text-2xl font-black text-slate-900 leading-tight">{selectedEvent.event_name}</h4>
                   </div>
                   
                   <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase">Guest Member</p>
                        <p className="font-bold text-slate-800">member@ifb.net</p>
                      </div>
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <QRCode value="SAMPLE_HASH" size={50} />
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
                         <p className="text-sm font-black text-emerald-600">SIGNED</p>
                      </div>
                   </div>
                </div>
              </div>
           </div>

           <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col justify-center text-center">
              <Share2 size={48} className="mx-auto text-indigo-600 mb-6"/>
              <h4 className="text-xl font-black text-slate-800">Public Portal URL</h4>
              <p className="text-sm text-slate-500 mt-2 mb-8">Share this link to allow guests to purchase tickets using their IFB Liquid USD balance.</p>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-xs text-indigo-600 break-all mb-6 select-all">
                https://ifb.bank/events/{selectedEvent.id}
              </div>
              <button className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all">Copy Management Link</button>
           </div>
        </div>
      )}
    </div>
  );
}