import { useState, useRef, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import { Send, PhoneCall, MessageSquare, X, ShieldCheck, Loader2, BrainCircuit, HeadphonesIcon, AlertCircle, ArrowRight } from 'lucide-react';

const QUICK_FAQS = [
  "How do I increase my withdrawal limits?",
  "What is the current AFR ecosystem yield?",
  "I need an official signed bank statement.",
  "How does the Pascaline Underwriting work?"
];

export default function Chat({ session, onClose, balances, profile }) {
  const [mode, setMode] = useState('CHOICE'); // 'CHOICE', 'CHAT', 'CALL_REQUESTED'
  const [isAgentMode, setIsAgentMode] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState(null);
  
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  const userName = profile?.full_name?.split('@')[0] || 'Client';
  const initialGreeting = `Identity confirmed. Welcome, ${userName}. I am Pascaline, your AI Chief Underwriter. I have analyzed your portfolio. How shall we optimize your capital today?`;

  const [messages, setMessages] = useState([
    { role: 'assistant', content: initialGreeting }
  ]);

  // Scroll to bottom automatically
  useEffect(() => {
    if (mode === 'CHAT') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, mode]);

  // Check if user already has an open ticket with a human
  useEffect(() => {
    const checkOpenTicket = async () => {
      try {
        const { data, error } = await supabase
          .from('support_tickets')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('status', 'open')
          .maybeSingle();

        if (data) {
          setActiveTicketId(data.id);
          setIsAgentMode(true);
          
          // Fetch previous messages for this ticket
          const { data: pastMessages } = await supabase
            .from('support_messages')
            .select('*')
            .eq('ticket_id', data.id)
            .order('created_at', { ascending: true });
            
          if (pastMessages && pastMessages.length > 0) {
            const formatted = pastMessages.map(m => ({
              role: m.sender_type === 'user' ? 'user' : 'agent',
              content: m.message
            }));
            setMessages([
              { role: 'system', content: 'Secure connection to Live Specialist restored.' },
              ...formatted
            ]);
          } else {
            setMessages([{ role: 'system', content: 'You are connected to the IFB Live Support Desk. An officer is reviewing your profile.' }]);
          }
          setMode('CHAT');
        }
      } catch (err) {
        console.error("No open tickets found.");
      }
    };
    checkOpenTicket();
  }, [session.user.id]);

  // Real-time listener for Agent replies
  useEffect(() => {
    if (!activeTicketId) return;

    const channel = supabase.channel(`ticket_${activeTicketId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'support_messages', 
        filter: `ticket_id=eq.${activeTicketId}` 
      }, (payload) => {
        // Only append if it's from the agent (to avoid duplicating the user's own sent message)
        if (payload.new.sender_type === 'agent') {
          setMessages(prev => [...prev, { role: 'agent', content: payload.new.message }]);
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [activeTicketId]);

  const handleRequestCall = async () => {
    try {
      await supabase.from('advisor_requests').insert([
        { user_id: session.user.id, request_type: 'CALLBACK' }
      ]);
    } catch (err) {
      console.warn("Call request recorded.");
    }
    setMode('CALL_REQUESTED');
  };

  const handleTalkToSpecialist = async () => {
    setIsTyping(true);
    try {
      // 1. Create a new support ticket
      const { data, error } = await supabase.from('support_tickets').insert([{
        user_id: session.user.id,
        status: 'open'
      }]).select().single();

      if (error) throw error;

      setActiveTicketId(data.id);
      setIsAgentMode(true);
      setMessages(prev => [
        ...prev, 
        { role: 'system', content: 'Pascaline AI deactivated. Routing secure connection to IFB Human Advisory Desk...' },
        { role: 'system', content: 'Connection Established. A specialist is reviewing your ledger and will reply shortly.' }
      ]);

    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Failed to connect to Live Desk. Please try again.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = async (e, textOverride = null) => {
    if (e) e.preventDefault();
    const textToSend = textOverride || input;
    
    if (!textToSend.trim() || isTyping) return;

    const userMessage = { role: 'user', content: textToSend.trim() };
    const newChat = [...messages, userMessage];
    
    setMessages(newChat);
    setInput('');
    setIsTyping(true);

    // ==========================================
    // MODE: LIVE AGENT (Supabase Database Insert)
    // ==========================================
    if (isAgentMode && activeTicketId) {
      try {
        await supabase.from('support_messages').insert([{
          ticket_id: activeTicketId,
          sender_id: session.user.id,
          sender_type: 'user',
          message: textToSend.trim()
        }]);
        // The message is already in the UI, we just wait for the Realtime subscription to push the agent's reply
      } catch (err) {
        console.error("Message send failed", err);
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // ==========================================
    // MODE: AI GROK AGENT (Edge Function)
    // ==========================================
    try {
      // Filter out 'system' messages so the API doesn't crash, it only wants 'user' or 'assistant'
      const payloadMessages = newChat
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content }));

      const { data, error } = await supabase.functions.invoke('pascaline-grok-agent', {
        body: { messages: payloadMessages, userId: session.user.id }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
      
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Institutional bridge to Pascaline Core interrupted. Please retry sequence." 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 md:p-10 backdrop-blur-3xl bg-black/80 animate-in fade-in duration-300">
      <div className="bg-[#0B0F19] border border-white/10 shadow-glass rounded-[3.5rem] w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-300">
        
        {/* Ambient Glow */}
        <div className={`absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[80px] pointer-events-none transition-colors duration-1000 ${isAgentMode ? 'bg-emerald-500/10' : 'bg-blue-500/10'}`}></div>

        {/* Header */}
        <div className="p-6 md:p-8 border-b border-white/10 flex justify-between items-center bg-white/5 relative z-10 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shadow-inner transition-colors ${isAgentMode ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-400' : 'bg-black/50 border-white/10 text-white'}`}>
               {isAgentMode ? <HeadphonesIcon size={24} /> : <BrainCircuit size={24} className="text-blue-400" />}
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                {isAgentMode ? 'Live Advisory Desk' : 'Pascaline Intelligence'} <ShieldCheck size={14} className="text-emerald-400"/>
              </h2>
              <p className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 mt-1 ${isAgentMode ? 'text-emerald-400' : 'text-blue-400'}`}>
                <span className={`w-1 h-1 rounded-full animate-pulse ${isAgentMode ? 'bg-emerald-400' : 'bg-blue-400'}`}></span>
                {isAgentMode ? 'Human Specialist Connected' : 'Active Grok Node'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!isAgentMode && mode === 'CHAT' && (
              <button onClick={handleTalkToSpecialist} className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs font-black uppercase tracking-widest text-slate-300 hover:text-white transition-all">
                <AlertCircle size={14} /> Talk to Human
              </button>
            )}
            <button onClick={onClose} className="p-3 hover:bg-white/10 text-slate-400 hover:text-white rounded-full transition-colors border border-transparent hover:border-white/10">
              <X size={24}/>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 relative z-10 no-scrollbar custom-scrollbar scroll-smooth">
          {mode === 'CHOICE' && (
            <div className="h-full flex flex-col items-center justify-center gap-8 animate-in fade-in duration-500">
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-white tracking-tight">Select Advisory Channel</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Institutional support is standing by</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                <button onClick={handleRequestCall} className="bg-black/40 border border-white/10 p-10 rounded-[2.5rem] flex flex-col items-center gap-4 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group shadow-glass">
                  <div className="w-20 h-20 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(59,130,246,0.3)]"><PhoneCall size={32}/></div>
                  <div className="text-center">
                    <span className="text-xs font-black uppercase tracking-widest block text-white mb-1">Request Callback</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Priority: 5 Minutes</span>
                  </div>
                </button>
                <button onClick={() => setMode('CHAT')} className="bg-black/40 border border-white/10 p-10 rounded-[2.5rem] flex flex-col items-center gap-4 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group shadow-glass">
                  <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(16,185,129,0.3)]"><MessageSquare size={32}/></div>
                  <div className="text-center">
                    <span className="text-xs font-black uppercase tracking-widest block text-white mb-1">Pascaline AI</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real-time Data Access</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {mode === 'CALL_REQUESTED' && (
            <div className="h-full flex flex-col items-center justify-center text-center animate-in zoom-in-95">
               <div className="w-24 h-24 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-[2rem] flex items-center justify-center mb-6 animate-pulse">
                 <ShieldCheck size={48} />
               </div>
               <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Routing to Advisor...</h3>
               <p className="text-sm font-medium text-slate-400 max-w-xs mx-auto leading-relaxed">Your request has been prioritized. An advisor will contact you on your registered secure line within 5 minutes.</p>
               <button onClick={() => setMode('CHOICE')} className="mt-10 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">Cancel Request</button>
            </div>
          )}

          {mode === 'CHAT' && (
            <div className="flex flex-col space-y-6 pb-20">
              {messages.map((msg, i) => {
                if (msg.role === 'system') {
                  return (
                    <div key={i} className="flex justify-center animate-in fade-in">
                      <span className="bg-white/5 border border-white/10 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-400 text-center max-w-sm">
                        {msg.content}
                      </span>
                    </div>
                  );
                }

                const isUser = msg.role === 'user';
                const isAgent = msg.role === 'agent';

                return (
                  <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                    <div className={`max-w-[90%] md:max-w-[75%] p-5 rounded-[2rem] text-sm font-medium leading-relaxed shadow-glass ${
                      isUser 
                        ? 'bg-blue-600 text-white border border-blue-400/30 rounded-tr-none' 
                        : isAgent
                          ? 'bg-emerald-950/80 border border-emerald-500/30 text-emerald-50 rounded-tl-none'
                          : 'bg-white/10 border border-white/10 text-slate-200 rounded-tl-none'
                    }`}>
                      {/* Name Plate for Agents */}
                      {isAgent && <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 border-b border-emerald-500/20 pb-2">IFB Specialist</p>}
                      
                      {msg.content.split('\n').map((line, i) => <span key={i} className="block min-h-[1rem]">{line}</span>)}
                    </div>
                  </div>
                )
              })}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="p-4 rounded-3xl bg-white/5 border border-white/10 text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-inner">
                    <Loader2 size={14} className="animate-spin text-blue-400" /> {isAgentMode ? 'Specialist is typing...' : 'Pascaline Core Processing...'}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} className="h-1" />
            </div>
          )}
        </div>

        {/* Quick FAQ Chips & Input Area */}
        {mode === 'CHAT' && (
          <div className="bg-white/5 border-t border-white/10 relative z-10 backdrop-blur-xl">
            
            {/* Quick Actions (Only show in AI mode when not typing) */}
            {!isAgentMode && !isTyping && messages.length < 3 && (
              <div className="flex overflow-x-auto gap-2 px-6 pt-4 pb-2 no-scrollbar">
                {QUICK_FAQS.map((faq, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleSendMessage(null, faq)}
                    className="whitespace-nowrap bg-blue-500/10 border border-blue-500/20 text-blue-300 hover:bg-blue-500/20 hover:text-white px-4 py-2 rounded-full text-xs font-bold transition-colors"
                  >
                    {faq}
                  </button>
                ))}
              </div>
            )}

            {/* Mobile "Talk to Human" trigger */}
            {!isAgentMode && (
               <div className="md:hidden px-6 pt-2 flex justify-end">
                 <button onClick={handleTalkToSpecialist} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white flex items-center gap-1">
                   <HeadphonesIcon size={12}/> Connect to Specialist
                 </button>
               </div>
            )}

            <form onSubmit={handleSendMessage} className="p-4 md:p-6 flex items-center relative">
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isAgentMode ? "Type your message to the specialist..." : "Ask Pascaline anything..."} 
                className="w-full bg-black/50 border border-white/10 rounded-full py-4 md:py-5 pl-6 pr-16 md:pr-20 text-sm font-medium outline-none focus:border-blue-500 transition-all shadow-inner text-white placeholder:text-slate-500"
                disabled={isTyping}
              />
              <button 
                type="submit" 
                disabled={!input.trim() || isTyping} 
                className={`absolute right-6 md:right-8 w-10 h-10 md:w-12 md:h-12 text-white rounded-full flex items-center justify-center transition-all disabled:opacity-50 border ${
                  isAgentMode 
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)] border-emerald-400/30' 
                    : 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)] border-blue-400/30'
                }`}
              >
                <ArrowRight size={18} className="md:hidden" />
                <Send size={18} className="hidden md:block" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}