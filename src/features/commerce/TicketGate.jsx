import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Camera, Ticket, Check, XCircle, Loader2, Users, AlertCircle, ShieldCheck } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

export default function TicketGate({ session }) {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [tickets, setTickets] = useState([]);
  
  // Scanner State
  const [scanning, setScanning] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const scannerRef = useRef(null);

  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // 1. Fetch Organizer's Events
  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true);
      const { data } = await supabase.from('ifb_events').select('*').eq('organizer_id', session.user.id).order('created_at', { ascending: false });
      setEvents(data || []);
      setIsLoading(false);
    };
    fetchEvents();
  }, [session]);

  // 2. Fetch Tickets when Event Selected
  const loadTickets = async (eventId) => {
    setIsLoading(true);
    const { data } = await supabase.from('ifb_tickets').select('*').eq('event_id', eventId).order('scanned_at', { ascending: false, nullsFirst: false });
    setTickets(data || []);
    setIsLoading(false);
  };

  // 3. Keep scanner input focused when active (Hardware scanners act as keyboards)
  useEffect(() => {
    if (scanning && scannerRef.current) {
      scannerRef.current.focus();
    }
  }, [scanning]);

  // 4. Handle Hardware QR Scan (Triggers on Enter)
  const handleScanSubmit = async (e) => {
    e.preventDefault();
    if (!scanInput.trim()) return;
    
    setIsLoading(true);
    const hash = scanInput.trim();
    setScanInput(''); // Clear instantly for next scan

    // Validate the ticket against the database
    const { data: ticket, error } = await supabase
      .from('ifb_tickets')
      .select('*')
      .eq('qr_code_hash', hash)
      .eq('event_id', selectedEvent.id)
      .single();

    if (error || !ticket) {
      showToast('ACCESS DENIED: Invalid or Fake Ticket', 'error');
    } else if (ticket.status === 'cancelled') {
      showToast('ACCESS DENIED: Ticket Revoked', 'error');
    } else if (ticket.is_scanned) {
      showToast('ACCESS DENIED: Already Checked In!', 'error');
    } else {
      // Mark as scanned
      await supabase.from('ifb_tickets').update({ is_scanned: true, scanned_at: new Date() }).eq('id', ticket.id);
      showToast('ACCESS GRANTED: Valid Ticket', 'success');
      loadTickets(selectedEvent.id); // Refresh guest list
    }
    setIsLoading(false);
    if (scannerRef.current) scannerRef.current.focus(); // Keep focus for next person
  };

  // UI Setup
  if (!selectedEvent) {
    return (
      <div className="animate-in fade-in space-y-6">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3"><Ticket className="text-indigo-600"/> Box Office Operations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isLoading && <Loader2 className="animate-spin text-blue-500 mx-auto col-span-full"/>}
          {events.map(ev => (
            <button key={ev.id} onClick={() => { setSelectedEvent(ev); loadTickets(ev.id); }} className="text-left bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all group">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><Users size={24}/></div>
              <h3 className="font-black text-xl text-slate-800">{ev.event_name}</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">Capacity: {ev.total_slots}</p>
            </button>
          ))}
          {events.length === 0 && !isLoading && (
             <div className="col-span-full text-center py-12 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
               <AlertCircle size={40} className="mx-auto text-slate-300 mb-4"/>
               <p className="font-bold text-slate-500">No events found.</p>
               <p className="text-xs text-slate-400 mt-1">Create an event in the database to manage tickets.</p>
             </div>
          )}
        </div>
      </div>
    );
  }

  const checkedInCount = tickets.filter(t => t.is_scanned).length;

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
      
      {/* Dynamic Toast Layer for Scans */}
      {notification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[500] animate-in slide-in-from-top-4">
           <div className={`px-8 py-5 rounded-3xl shadow-2xl border-4 backdrop-blur-2xl flex items-center gap-4 ${notification.type === 'success' ? 'bg-emerald-900 border-emerald-500 text-emerald-400' : 'bg-red-900 border-red-500 text-red-400'}`}>
             {notification.type === 'success' ? <ShieldCheck size={28}/> : <XCircle size={28}/>}
             <p className="font-black text-sm uppercase tracking-[0.2em] text-white">{notification.msg}</p>
           </div>
        </div>
      )}

      {/* Back Button */}
      <button onClick={() => { setSelectedEvent(null); setScanning(false); }} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors">
        ← Back to Events
      </button>

      {/* Event Live Dashboard */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-end gap-6">
          <div>
            <h2 className="text-3xl font-black mb-2 tracking-tight">{selectedEvent.event_name}</h2>
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Live Gate Telemetry</p>
          </div>
          <div className="flex gap-4">
             <div className="bg-white/10 px-6 py-4 rounded-2xl backdrop-blur-sm border border-white/10">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tickets Sold</p>
               <p className="text-2xl font-black">{tickets.length} <span className="text-sm text-slate-500">/ {selectedEvent.total_slots}</span></p>
             </div>
             <div className="bg-emerald-500/20 px-6 py-4 rounded-2xl backdrop-blur-sm border border-emerald-500/30">
               <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">At Door</p>
               <p className="text-2xl font-black text-emerald-400">{checkedInCount}</p>
             </div>
          </div>
        </div>
        <Ticket className="absolute right-[-20px] bottom-[-20px] text-white/5 rotate-12" size={180} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ACTION: HARDWARE SCANNER TERMINAL */}
        <div className="lg:col-span-1">
          <div className={`border-4 rounded-[2.5rem] p-8 text-center transition-all duration-300 relative overflow-hidden ${scanning ? 'bg-indigo-50 border-indigo-500 shadow-[0_0_40px_rgba(99,102,241,0.2)]' : 'bg-white border-dashed border-slate-200 hover:border-slate-300'}`}>
            {scanning && <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 animate-pulse"></div>}
            
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 transition-colors ${scanning ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
              <QrCode size={40} />
            </div>
            
            <h3 className={`font-black text-xl mb-2 ${scanning ? 'text-indigo-900' : 'text-slate-800'}`}>
              {scanning ? "Gate is Open" : "Gate is Closed"}
            </h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-8 max-w-[200px] mx-auto leading-relaxed">
              {scanning ? "Plug in USB Barcode Scanner. Ready for input." : "Click below to activate hardware scanner."}
            </p>

            {scanning ? (
              <form onSubmit={handleScanSubmit}>
                <input 
                  ref={scannerRef}
                  type="text" 
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  className="w-full bg-white border border-indigo-200 text-center font-mono text-sm p-4 rounded-xl outline-none focus:border-indigo-500 shadow-inner mb-4"
                  placeholder="Waiting for scan..."
                  autoComplete="off"
                />
                <button type="button" onClick={() => setScanning(false)} className="w-full bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-widest py-4 rounded-xl hover:bg-slate-300">Close Gate</button>
              </form>
            ) : (
              <button onClick={() => setScanning(true)} className="w-full bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest py-5 rounded-2xl hover:bg-slate-800 transition-all shadow-xl flex items-center justify-center gap-2">
                <Camera size={16}/> Activate Scanner
              </button>
            )}
          </div>
        </div>

        {/* GUEST LIST MASTER LEDGER */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 flex flex-col h-[500px]">
          <h3 className="font-black text-lg text-slate-800 mb-6 flex items-center gap-2"><Users size={20} className="text-blue-600"/> Master Guest List</h3>
          
          <div className="flex-1 overflow-y-auto no-scrollbar border border-slate-100 rounded-2xl">
            {tickets.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-slate-400">
                 <Ticket size={32} className="mb-2 opacity-30"/>
                 <p className="text-xs font-bold uppercase tracking-widest">No tickets sold yet</p>
               </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-slate-50 sticky top-0">
                  <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="p-4 rounded-tl-2xl">Guest Identity</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right rounded-tr-2xl">Time</th>
                  </tr>
                </thead>
                <tbody className="text-sm font-bold divide-y divide-slate-50">
                  {tickets.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <p className="text-slate-800">{t.buyer_email}</p>
                        <p className="text-[8px] text-slate-400 font-mono mt-1">{t.qr_code_hash.substring(0, 16)}...</p>
                      </td>
                      <td className="p-4">
                        {t.is_scanned ? (
                           <span className="text-[9px] uppercase tracking-widest bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg border border-emerald-200 inline-flex items-center gap-1"><Check size={10}/> Checked In</span>
                        ) : (
                           <span className="text-[9px] uppercase tracking-widest bg-slate-100 text-slate-500 px-3 py-1.5 rounded-lg border border-slate-200">Pending</span>
                        )}
                      </td>
                      <td className="p-4 text-right text-xs text-slate-500">
                        {t.scanned_at ? new Date(t.scanned_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}