import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import { Calendar, MapPin, Ticket, ShieldCheck, Loader2, Globe2, Lock } from 'lucide-react';

export default function PublicEventPage() {
  const { id } = useParams(); 
  const [event, setEvent] = useState(null);
  const [orgProfile, setOrgProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [email, setEmail] = useState('');
  const [isBuying, setIsBuying] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchEventData() {
      const { data: eventData } = await supabase.from('ifb_events').select('*').eq('id', id).single();
      if (eventData) {
        setEvent(eventData);
        const { data: profileData } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', eventData.organizer_id).single();
        if (profileData) setOrgProfile(profileData);
      }
      setIsLoading(false);
    }
    fetchEventData();
  }, [id]);

  const handlePurchase = async (e) => {
    e.preventDefault();
    setIsBuying(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('issue-ticket', {
        body: { eventId: event.id, eventName: event.event_name, prompt: email, organizerEmail: 'Public Portal Registration' }
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
    <div className="min-h-screen bg-slate-100 font-sans selection:bg-blue-200 flex flex-col">
      {/* INSTITUTIONAL NAV */}
      <div className="bg-slate-900 px-6 md:px-12 py-5 flex items-center justify-between shadow-md border-b border-slate-800">
         <div className="flex items-center gap-3">
           <Globe2 className="text-blue-500" size={24}/>
           <div>
             <span className="text-lg font-black text-white leading-none block">Infinite Future Bank</span>
             <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Institutional Commerce Engine</span>
           </div>
         </div>
         <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 bg-slate-800 px-3 py-1.5 rounded-md border border-slate-700 hidden md:block">Powered by DEUS App</span>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 md:p-12 animate-in fade-in slide-in-from-bottom-8">
         <div className="w-full max-w-5xl bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-200 flex flex-col md:flex-row">
            
            {/* LEFT: Event Display */}
            <div className="md:w-1/2 min-h-[300px] md:min-h-[600px] bg-slate-900 relative p-10 flex flex-col justify-between">
               <img src={event.event_image_url} className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay" alt="Event" />
               <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent"></div>
               
               {/* Organization Logo Top Left */}
               <div className="relative z-10 flex items-center gap-4">
                 <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center border-4 border-white overflow-hidden">
                    {orgProfile?.avatar_url ? (
                       <img src={orgProfile.avatar_url} className="w-full h-full object-cover" alt="Org Logo" />
                    ) : (
                       <span className="text-slate-900 font-black text-xl">IFB</span>
                    )}
                 </div>
                 <div>
                   <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Presented By</p>
                   <p className="text-white font-bold text-sm">{orgProfile?.full_name || 'Verified Merchant'}</p>
                 </div>
               </div>

               <div className="relative z-10 mt-auto">
                  <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-white leading-tight">{event.event_name}</h1>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-300 flex items-center gap-2"><MapPin size={16} className="text-blue-500"/> {event.location_name}</p>
               </div>
            </div>

            {/* RIGHT: Transaction Form */}
            <div className="md:w-1/2 p-10 md:p-14 flex flex-col justify-center bg-white">
               {success ? (
                 <div className="text-center animate-in zoom-in-95">
                   <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                     <ShieldCheck size={48}/>
                   </div>
                   <h2 className="text-3xl font-black text-slate-800 mb-2">Entry Secured</h2>
                   <p className="text-sm text-slate-500 font-medium max-w-xs mx-auto">Your cryptographic ticket and QR hash have been successfully dispatched to <strong className="text-slate-800">{email}</strong>.</p>
                 </div>
               ) : (
                 <>
                   <div className="space-y-8 mb-10">
                     <div className="flex items-center gap-4">
                       <div className="p-4 bg-slate-50 text-slate-600 rounded-2xl border border-slate-100 shadow-sm"><Calendar size={24}/></div>
                       <div>
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date & Time</p>
                         <p className="font-bold text-slate-800 text-lg">{new Date(event.event_date).toLocaleString()}</p>
                       </div>
                     </div>

                     <div className="flex items-center gap-4 pb-8 border-b border-slate-100">
                       <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 shadow-sm"><Ticket size={24}/></div>
                       <div>
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ledger Entry Price</p>
                         <p className="font-black text-3xl text-slate-900">${event.ticket_price}</p>
                       </div>
                     </div>
                   </div>

                   <form onSubmit={handlePurchase} className="space-y-5">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 block">Secure Your Entry</label>
                        {/* 🔥 FIXED WHITE TEXT BUG: EXPLICITLY SETTING text-slate-900 */}
                        <input 
                          type="email" 
                          required 
                          value={email} 
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email address" 
                          className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
                        />
                      </div>
                      <button 
                        type="submit" 
                        disabled={isBuying || !email}
                        className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-[0_8px_30px_rgb(37,99,235,0.3)] disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                      >
                        {isBuying ? <Loader2 className="animate-spin" size={20}/> : <><ShieldCheck size={20}/> Purchase Ticket</>}
                      </button>
                   </form>
                   
                   <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-8 flex items-center justify-center gap-1.5"><Lock size={12}/> Secure Transaction via IFB Network</p>
                 </>
               )}
            </div>
         </div>
      </div>
    </div>
  );
}