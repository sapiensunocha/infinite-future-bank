import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import { Calendar, MapPin, Ticket, ShieldCheck, Loader2, Zap } from 'lucide-react';

export default function PublicEventPage() {
  const { id } = useParams(); // Grabs the event ID from the URL
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [email, setEmail] = useState('');
  const [isBuying, setIsBuying] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchEventData() {
      const { data } = await supabase.from('ifb_events').select('*').eq('id', id).single();
      setEvent(data);
      setIsLoading(false);
    }
    fetchEventData();
  }, [id]);

  const handlePurchase = async (e) => {
    e.preventDefault();
    setIsBuying(true);
    
    try {
      // Calls the same AI Edge function we built earlier to generate the ticket and email
      const { data, error } = await supabase.functions.invoke('issue-ticket', {
        body: { 
          eventId: event.id, 
          eventName: event.event_name, 
          prompt: email, 
          organizerEmail: 'Public Portal Registration' 
        }
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setSuccess(true);
    } catch (err) {
      alert(`Registration failed: ${err.message}`);
    } finally {
      setIsBuying(false);
    }
  };

  if (isLoading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={48}/></div>;
  
  if (!event) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-black text-2xl">Event Not Found on Ledger</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-200">
      {/* Top Nav */}
      <div className="bg-slate-900 px-6 py-4 flex items-center justify-between shadow-md">
         <div className="flex items-center gap-1">
           <span className="text-2xl font-black text-white">DEUS</span>
           <Zap size={14} className="text-blue-500 ml-1" />
         </div>
         <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border border-slate-700 px-3 py-1 rounded-full">Public Portal</span>
      </div>

      <div className="max-w-4xl mx-auto p-6 md:p-12 animate-in fade-in slide-in-from-bottom-8">
         <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col md:flex-row">
            
            {/* Event Image */}
            <div className="md:w-1/2 h-64 md:h-auto bg-slate-900 relative">
               <img src={event.event_image_url} className="w-full h-full object-cover opacity-70" alt="Event" />
               <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent"></div>
               <div className="absolute bottom-8 left-8 right-8 text-white">
                  <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">{event.event_name}</h1>
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2"><MapPin size={14}/> {event.location_name}</p>
               </div>
            </div>

            {/* Registration Form */}
            <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
               {success ? (
                 <div className="text-center animate-in zoom-in-95">
                   <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                     <ShieldCheck size={40}/>
                   </div>
                   <h2 className="text-2xl font-black text-slate-800 mb-2">Ticket Secured</h2>
                   <p className="text-sm text-slate-500 font-medium">Your cryptographic ticket has been dispatched to <strong>{email}</strong>.</p>
                 </div>
               ) : (
                 <>
                   <div className="flex items-center gap-3 mb-8">
                     <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Calendar size={24}/></div>
                     <div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date & Time</p>
                       <p className="font-bold text-slate-800">{new Date(event.event_date).toLocaleString()}</p>
                     </div>
                   </div>

                   <div className="flex items-center gap-3 mb-10 pb-8 border-b border-slate-100">
                     <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><Ticket size={24}/></div>
                     <div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Entry Price</p>
                       <p className="font-black text-2xl text-slate-800">${event.ticket_price}</p>
                     </div>
                   </div>

                   <form onSubmit={handlePurchase} className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Secure Your Entry</label>
                        <input 
                          type="email" 
                          required 
                          value={email} 
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email address" 
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-blue-500 transition-all"
                        />
                      </div>
                      <button 
                        type="submit" 
                        disabled={isBuying}
                        className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl disabled:opacity-50"
                      >
                        {isBuying ? <Loader2 className="animate-spin mx-auto" size={18}/> : 'Purchase Ticket'}
                      </button>
                   </form>
                   <p className="text-center text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-6 flex items-center justify-center gap-1"><ShieldCheck size={12}/> Verified by IFB Protocol</p>
                 </>
               )}
            </div>
         </div>
      </div>
    </div>
  );
}