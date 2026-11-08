import { useState, useEffect, useRef } from 'react';
import { supabase } from './services/supabaseClient';
import { Search, Send, CheckCircle2, AlertCircle, ShieldAlert, ShieldCheck, User, Landmark, Clock, Lock, Unlock, Zap } from 'lucide-react';

export default function AdminSupportDesk({ session, adminProfile }) {
  const [tickets, setTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [targetUser, setTargetUser] = useState(null);
  const [targetBalances, setTargetBalances] = useState(null);
  
  const [reply, setReply] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  // 1. Fetch Open Tickets
  const fetchTickets = async () => {
    const { data } = await supabase
      .from('support_tickets')
      .select('*, profiles!support_tickets_user_id_fkey(full_name, email, avatar_url, kyc_status)')
      .in('status', ['open', 'agent_assigned'])
      .order('created_at', { ascending: false });
    
    if (data) setTickets(data);
  };

  useEffect(() => {
    fetchTickets();
    
    // Real-time listener for new tickets
    const ticketChannel = supabase.channel('admin_tickets')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_tickets' }, fetchTickets)
      .subscribe();

    return () => supabase.removeChannel(ticketChannel);
  }, []);

  // 2. Load Active Ticket Context & 360 View
  useEffect(() => {
    if (!activeTicket) return;

    const loadTicketContext = async () => {
      // Fetch Messages
      const { data: msgData } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', activeTicket.id)
        .order('created_at', { ascending: true });
      if (msgData) setMessages(msgData);

      // Fetch 360 User Context
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', activeTicket.user_id).single();
      const { data: balanceData } = await supabase.from('balances').select('*').eq('user_id', activeTicket.user_id).single();
      
      setTargetUser(profileData);
      setTargetBalances(balanceData);

      // Mark ticket as assigned to this agent
      if (activeTicket.status === 'open') {
        await supabase.from('support_tickets').update({ status: 'agent_assigned' }).eq('id', activeTicket.id);
        fetchTickets();
      }
    };

    loadTicketContext();

    // Real-time listener for user typing back
    const msgChannel = supabase.channel(`admin_chat_${activeTicket.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${activeTicket.id}` }, (payload) => {
        if (payload.new.sender_type === 'user') {
          setMessages(prev => [...prev, payload.new]);
        }
      })
      .subscribe();

    return () => supabase.removeChannel(msgChannel);
  }, [activeTicket]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 3. Agent Actions
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setIsTyping(true);

    const newMsg = {
      ticket_id: activeTicket.id,
      sender_id: session.user.id,
      sender_type: 'agent',
      message: reply.trim()
    };

    try {
      const { data, error } = await supabase.from('support_messages').insert([newMsg]).select().single();
      if (error) throw error;
      setMessages(prev => [...prev, data]);
      setReply('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsTyping(false);
    }
  };

  const handleResolveTicket = async () => {
    await supabase.from('support_tickets').update({ status: 'resolved' }).eq('id', activeTicket.id);
    setActiveTicket(null);
    setTargetUser(null);
    setTargetBalances(null);
    fetchTickets();
  };

  // --- TIER 2 & 3 ACTIONS ---
  const handleForceKycVerify = async () => {
    if (!['advisor_l2', 'admin_l3'].includes(adminProfile.role)) return;
    await supabase.from('profiles').update({ kyc_status: 'verified' }).eq('id', targetUser.id);
    setTargetUser({ ...targetUser, kyc_status: 'verified' });
  };

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

  return (
    <div className="min-h-screen bg-white text-slate-600 font-sans flex overflow-hidden selection:bg-blue-500/30">
      
      {/* LEFT: TICKET QUEUE */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col h-screen">
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="text-blue-500" /> Command Center
          </h2>
          <p className="text-xs text-slate-500 mt-1">Role: {adminProfile?.role?.replace('_', ' ').toUpperCase()}</p>
        </div>
        
        <div className="p-4 border-b border-slate-200 relative">
          <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input 
            type="text" 
            placeholder="Search tickets..." 
            className="ui-input pl-10 pr-4"
          />
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {tickets.map(ticket => (
            <button 
              key={ticket.id} 
              onClick={() => setActiveTicket(ticket)}
              className={`w-full text-left p-5 border-b border-slate-200 hover:bg-slate-100 transition-colors flex items-start gap-4 ${activeTicket?.id === ticket.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}
            >
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0">
                {ticket.profiles?.avatar_url ? <img src={ticket.profiles.avatar_url} className="w-full h-full rounded-full object-cover"/> : <User size={18}/>}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-slate-900 truncate">{ticket.profiles?.full_name || 'Unknown Client'}</p>
                <p className="text-xs text-slate-500 mt-1">Ticket #{ticket.id.split('-')[0]}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${ticket.status === 'open' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                    {ticket.status === 'open' ? 'New' : 'Assigned'}
                  </span>
                  <span className="text-xs text-slate-600 flex items-center gap-1"><Clock size={10}/> {new Date(ticket.created_at).toLocaleTimeString()}</span>
                </div>
              </div>
            </button>
          ))}
          {tickets.length === 0 && (
            <div className="p-8 text-center text-slate-600 flex flex-col items-center">
              <CheckCircle2 size={32} className="mb-2 opacity-50" />
              <p className="text-xs font-bold">Queue is Empty</p>
            </div>
          )}
        </div>
      </div>

      {/* MIDDLE: CHAT TERMINAL */}
      <div className="flex-1 flex flex-col h-screen relative bg-white">
        {activeTicket ? (
          <>
            {/* Chat Header */}
            <div className="h-20 border-b border-slate-200 bg-slate-50 flex items-center justify-between px-8 shrink-0 backdrop-blur-md relative z-10">
              <div>
                <h3 className="text-slate-900 font-bold text-lg">Secure Session: {targetUser?.full_name}</h3>
                <p className="text-xs text-slate-500">End-to-End Encrypted Advisory Link</p>
              </div>
              <button onClick={handleResolveTicket} className="px-5 py-2.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl text-sm font-semibold hover:bg-emerald-50 transition-all flex items-center gap-2">
                <CheckCircle2 size={14}/> Resolve & Close
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              {messages.map((msg, i) => {
                const isAgent = msg.sender_type === 'agent';
                return (
                  <div key={i} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] p-5 rounded-2xl text-sm leading-relaxed ${
                      isAgent 
                        ? 'bg-blue-600 text-white rounded-tr-none shadow-[0_0_20px_rgba(37,99,235,0.2)]' 
                        : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-none'
                    }`}>
                      {!isAgent && <p className="text-xs font-semibold text-slate-500 mb-2 border-b border-slate-200 pb-2">Client</p>}
                      {msg.message}
                    </div>
                  </div>
                )
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Input Box */}
            <div className="p-6 bg-slate-50 border-t border-slate-200 backdrop-blur-md">
              <form onSubmit={handleSendReply} className="relative">
                <input 
                  type="text" 
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Transmit message to client terminal..." 
                  className="ui-input pl-6 pr-16"
                  disabled={isTyping}
                />
                <button type="submit" disabled={!reply.trim() || isTyping} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-500 transition-all disabled:opacity-50">
                  <Send size={16} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-600">
            <ShieldCheck size={64} className="mb-4 opacity-20" />
            <h3 className="text-xl font-bold text-slate-500 mb-1">Monitoring Network</h3>
            <p className="text-xs">Select a ticket to establish a secure link</p>
          </div>
        )}
      </div>

      {/* RIGHT: 360 CUSTOMER CONTEXT (Only visible when ticket is selected) */}
      {activeTicket && targetUser && (
        <div className="w-80 xl:w-96 bg-white border-l border-slate-200 h-screen overflow-y-auto custom-scrollbar flex flex-col">
          
          {/* Profile Snapshot */}
          <div className="p-8 border-b border-slate-200 text-center flex flex-col items-center bg-slate-50">
            <div className="w-24 h-24 rounded-3xl bg-slate-50 border-2 border-slate-200 overflow-hidden mb-4 shadow-lg">
              {targetUser.avatar_url ? <img src={targetUser.avatar_url} className="w-full h-full object-cover"/> : <User size={48} className="m-6 text-slate-600"/>}
            </div>
            <h3 className="text-xl font-bold text-slate-900">{targetUser.full_name}</h3>
            <p className="text-xs text-slate-500 mt-1">{targetUser.email}</p>
            
            <div className={`mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              targetUser.kyc_status === 'verified' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-amber-50 border-amber-200 text-amber-600'
            }`}>
              {targetUser.kyc_status === 'verified' ? <ShieldCheck size={14}/> : <ShieldAlert size={14}/>}
              KYC: {targetUser.kyc_status || 'Unverified'}
            </div>
          </div>

          {/* Institutional Balances */}
          <div className="p-6 border-b border-slate-200 space-y-4">
            <h4 className="text-xs font-semibold text-slate-500">Live Balances</h4>
            
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Landmark size={16}/></div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Liquid Cash</p>
                  <p className="text-xs text-slate-500">Operational USD</p>
                </div>
              </div>
              <p className="font-bold text-slate-900">{formatCurrency(targetBalances?.liquid_usd)}</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Lock size={16}/></div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Digital Safe</p>
                  <p className="text-xs text-slate-500">Vaulted Assets</p>
                </div>
              </div>
              <p className="font-bold text-slate-900">{formatCurrency(targetBalances?.mysafe_digital_usd)}</p>
            </div>
          </div>

          {/* Action Hub (Role Based) */}
          <div className="p-6">
            <h4 className="text-xs font-semibold text-slate-500 mb-4">Command Actions</h4>
            <div className="space-y-3">
              
              {/* TIER 2 & 3 ACTIONS */}
              {['advisor_l2', 'admin_l3'].includes(adminProfile.role) && (
                <>
                  <button 
                    onClick={handleForceKycVerify}
                    disabled={targetUser.kyc_status === 'verified'}
                    className="w-full p-4 rounded-xl text-xs font-semibold text-left transition-all border disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                  >
                    Force KYC Verification {targetUser.kyc_status === 'verified' && <CheckCircle2 size={16}/>}
                  </button>

                  <button className="w-full p-4 rounded-xl text-xs font-semibold text-left transition-all border flex items-center justify-between bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-50">
                    <Unlock size={16}/> Override Vault Lock
                  </button>
                </>
              )}

              {/* TIER 3 (ADMIN) ONLY */}
              {adminProfile.role === 'admin_l3' && (
                <button className="w-full p-4 rounded-xl text-xs font-semibold text-left transition-all border flex items-center justify-between bg-red-50 text-red-600 border-red-200 hover:bg-red-50 mt-4">
                  <Zap size={16}/> Adjust Core Ledger
                </button>
              )}

              <p className="text-xs text-slate-600 text-center mt-6 leading-relaxed">
                All actions are cryptographically logged and subject to Institutional Audit under IFB Operations Protocol.
              </p>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}