import { useState, useRef, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import { Send, PhoneCall, MessageSquare, X, Bot, User, Sparkles, ShieldCheck, Loader2, BrainCircuit } from 'lucide-react';

export default function Chat({ session, onClose, balances, profile }) {
  const [mode, setMode] = useState('CHOICE'); // 'CHOICE', 'CHAT', 'CALL_REQUESTED'
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  const initialGreeting = `Identity confirmed. Welcome, ${profile?.full_name?.split('@')[0] || 'Client'}. I am Pascaline, your AI Chief Underwriter. I have analyzed your portfolio and our internal Dark Pool. How shall we optimize your capital today?`;

  const [messages, setMessages] = useState([
    { role: 'assistant', content: initialGreeting }
  ]);

  useEffect(() => {
    if (mode === 'CHAT') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, mode]);

  const handleRequestCall = async () => {
    try {
      await supabase.from('advisor_requests').insert([
        { user_id: session.user.id, request_type: 'CALLBACK' }
      ]);
    } catch (err) {
      console.warn("Call request recorded (Simulated).");
    }
    setMode('CALL_REQUESTED');
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = { role: 'user', content: input.trim() };
    const newChat = [...messages, userMessage];
    
    setMessages(newChat);
    setInput('');
    setIsTyping(true);

    try {
      // FORMAT: Role must be 'user' or 'assistant' for the Grok function
      const payloadMessages = newChat.map(m => ({
        role: m.role,
        content: m.content
      }));

      // CALLING THE GROK AGENT (Pascaline Core)
      const { data, error } = await supabase.functions.invoke('pascaline-grok-agent', {
        body: { 
          messages: payloadMessages, 
          userId: session.user.id 
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Add Grok's response to the UI
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
      <div className="bg-[#0B0F19] border border-white/10 shadow-glass rounded-[3.5rem] w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-300">
        
        {/* Ambient Glow */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/10 blur-[80px] pointer-events-none"></div>

        {/* Header */}
        <div className="p-8 border-b border-white/10 flex justify-between items-center bg-white/5 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-center text-white shadow-inner">
               <BrainCircuit size={24} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                Pascaline Intelligence <ShieldCheck size={14} className="text-emerald-400"/>
              </h2>
              <p className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest flex items-center gap-1">
                <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></span>
                Active Grok Node
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white/10 text-slate-400 hover:text-white rounded-full transition-colors border border-transparent hover:border-white/10">
            <X size={24}/>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 relative z-10 no-scrollbar custom-scrollbar">
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
            <>
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                  <div className={`max-w-[85%] p-6 rounded-[2rem] text-sm font-medium leading-relaxed shadow-glass ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white border border-blue-400/30 rounded-tr-none' 
                      : 'bg-white/10 border border-white/10 text-slate-200 rounded-tl-none'
                  }`}>
                    {msg.content.split('\n').map((line, i) => <span key={i} className="block min-h-[1rem]">{line}</span>)}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="p-5 rounded-3xl bg-white/5 border border-white/10 text-blue-400 text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-inner">
                    <Loader2 size={14} className="animate-spin" /> Pascaline Core Processing...
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
              placeholder="Ask about underwriting, liquidity, or portfolio protection..." 
              className="w-full bg-black/50 border border-white/10 rounded-full py-5 pl-6 pr-20 text-sm font-medium outline-none focus:border-blue-500 transition-all shadow-inner text-white placeholder:text-slate-500"
              disabled={isTyping}
            />
            <button type="submit" disabled={!input.trim() || isTyping} className="absolute right-8 md:right-10 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-500 transition-all shadow-[0_0_15px_rgba(59,130,246,0.4)] disabled:opacity-50 border border-blue-400/30">
              <Send size={18} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}