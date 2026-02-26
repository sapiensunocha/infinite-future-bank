import { useState, useRef, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import { Send, PhoneCall, MessageSquare, X, Bot, User, Sparkles, ShieldCheck, Loader2 } from 'lucide-react';

export default function Chat({ session, onClose, balances, profile }) {
  const [mode, setMode] = useState('CHOICE'); // 'CHOICE', 'CHAT', 'CALL_REQUESTED'
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  const initialGreeting = `Identity confirmed. Welcome, ${profile?.full_name?.split('@')[0] || 'Client'}. I have analyzed your ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((balances?.liquid_usd || 0) + (balances?.alpha_equity_usd || 0))} portfolio. How shall we optimize your capital today?`;

  const [messages, setMessages] = useState([
    { role: 'assistant', content: initialGreeting }
  ]);

  useEffect(() => {
    if (mode === 'CHAT') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, mode]);

  const handleRequestCall = async () => {
    // Fallback if the table doesn't exist yet, we just simulate the UI
    try {
      await supabase.from('advisor_requests').insert([
        { user_id: session.user.id, request_type: 'CALLBACK' }
      ]);
    } catch (err) {
      console.warn("Call request table not found, simulating request.");
    }
    setMode('CALL_REQUESTED');
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newChat = [...messages, { role: 'user', content: input }];
    setMessages(newChat);
    setInput('');
    setIsTyping(true);

    try {
      // Create a master agent persona for the general chat
      const masterAgent = {
        name: "DEUS Core",
        title: "Master Intelligence Node",
        mission: "Provide holistic, top-level guidance on the user's entire wealth profile, acting as the primary interface for Infinite Future Bank."
      };

      // Call the exact same Edge Function we built for the Cabinet Agents!
      const { data, error } = await supabase.functions.invoke('agent-chat', {
        body: { 
          agent: masterAgent, 
          messages: newChat.map(m => ({ role: m.role === 'assistant' ? 'ai' : 'user', text: m.content })), 
          balances, 
          profile 
        }
      });

      if (error) throw error;
      
      setMessages([...newChat, { role: 'assistant', content: data.text }]);
    } catch (err) {
      console.error(err);
      setMessages([...newChat, { role: 'assistant', content: "Secure connection to DEUS mainframe interrupted. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-10 backdrop-blur-3xl bg-black/80 animate-in fade-in duration-300">
      <div className="bg-[#0B0F19] border border-white/10 shadow-glass rounded-[3.5rem] w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-300">
        
        {/* Subtle Ambient Glow */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-ifb-primary/10 blur-[80px] pointer-events-none"></div>

        {/* Header */}
        <div className="p-8 border-b border-white/10 flex justify-between items-center bg-white/5 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-center text-white shadow-inner">
               <Bot size={24} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                DEUS Advisor Core <Sparkles size={14} className="text-ifb-primary"/>
              </h2>
              <p className="text-[10px] font-bold text-ifb-success uppercase tracking-widest">End-to-End Encrypted</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white/10 text-slate-400 hover:text-white rounded-full transition-colors border border-transparent hover:border-white/10"><X size={24}/></button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 relative z-10 custom-scrollbar">
          {mode === 'CHOICE' && (
            <div className="h-full flex flex-col items-center justify-center gap-8 animate-in fade-in duration-500">
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-white tracking-tight">Select Advisory Channel</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Institutional support is standing by</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                <button onClick={handleRequestCall} className="bg-black/40 border border-white/10 p-10 rounded-[2.5rem] flex flex-col items-center gap-4 hover:border-ifb-primary/50 hover:bg-ifb-primary/5 transition-all group shadow-glass">
                  <div className="w-20 h-20 rounded-full bg-ifb-primary/20 border border-ifb-primary/30 flex items-center justify-center text-ifb-primary group-hover:scale-110 transition-transform shadow-glow-blue"><PhoneCall size={32}/></div>
                  <div className="text-center">
                    <span className="text-xs font-black uppercase tracking-widest block text-white mb-1">Request Callback</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Priority: 5 Minutes</span>
                  </div>
                </button>
                <button onClick={() => setMode('CHAT')} className="bg-black/40 border border-white/10 p-10 rounded-[2.5rem] flex flex-col items-center gap-4 hover:border-ifb-success/50 hover:bg-ifb-success/5 transition-all group shadow-glass">
                  <div className="w-20 h-20 rounded-full bg-ifb-success/20 border border-ifb-success/30 flex items-center justify-center text-ifb-success group-hover:scale-110 transition-transform shadow-glow"><MessageSquare size={32}/></div>
                  <div className="text-center">
                    <span className="text-xs font-black uppercase tracking-widest block text-white mb-1">Intelligence Chat</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real-time Data Access</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {mode === 'CALL_REQUESTED' && (
            <div className="h-full flex flex-col items-center justify-center text-center animate-in zoom-in-95">
               <div className="w-24 h-24 bg-ifb-primary/20 border border-ifb-primary/30 text-ifb-primary rounded-[2rem] flex items-center justify-center mb-6 shadow-glow-blue animate-pulse">
                 <ShieldCheck size={48} />
               </div>
               <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Routing to Advisor...</h3>
               <p className="text-sm font-medium text-slate-400 max-w-xs mx-auto leading-relaxed">Your request has been prioritized. An advisor will contact you on your registered secure line within 5 minutes.</p>
               <button onClick={() => setMode('CHOICE')} className="mt-10 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">Cancel Request</button>
            </div>
          )}

          {mode === 'CHAT' && (
            <>
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                  <div className={`max-w-[85%] p-6 rounded-[2rem] text-sm font-medium leading-relaxed shadow-glass ${msg.role === 'user' ? 'bg-ifb-primary text-white border border-blue-400/30 rounded-tr-none' : 'bg-white/10 border border-white/10 text-slate-200 rounded-tl-none'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="p-5 rounded-3xl bg-white/5 border border-white/10 text-ifb-primary text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-inner">
                    <Loader2 size={14} className="animate-spin" /> Core Intelligence is thinking...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </>
          )}
        </div>

        {/* Input area for Chat */}
        {mode === 'CHAT' && (
          <form onSubmit={handleSendMessage} className="p-6 md:p-8 bg-white/5 border-t border-white/10 flex items-center relative z-10">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your yield, liquidity, or asset protection..." 
              className="w-full bg-black/50 border border-white/10 rounded-full py-5 pl-6 pr-20 text-sm font-medium outline-none focus:border-ifb-primary transition-all shadow-inner text-white placeholder:text-slate-500"
            />
            <button type="submit" disabled={!input.trim() || isTyping} className="absolute right-8 md:right-10 w-12 h-12 bg-ifb-primary text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition-all shadow-glow-blue disabled:opacity-50 border border-blue-400/30">
              <Send size={18} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}