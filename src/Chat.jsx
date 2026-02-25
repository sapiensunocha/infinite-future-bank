import { useState, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import { Send, PhoneCall, MessageSquare, X, Bot, User, Sparkles, ShieldCheck } from 'lucide-react';

export default function Chat({ session, onClose, balances, profile }) {
  const [mode, setMode] = useState('CHOICE'); // 'CHOICE', 'CHAT', 'CALL_REQUESTED'
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Identity confirmed. Welcome, ${profile?.full_name?.split('@')[0]}. I have analyzed your ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(balances.liquid_usd + balances.alpha_equity_usd)} portfolio. How shall we optimize your capital today?` }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const handleRequestCall = async () => {
    const { error } = await supabase.from('advisor_requests').insert([
      { user_id: session.user.id, request_type: 'CALLBACK' }
    ]);
    if (!error) setMode('CALL_REQUESTED');
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // AI SIMULATION: In production, you'd call your AI API here
    setTimeout(() => {
      let response = "I am processing your request against current market volatility.";
      if (input.toLowerCase().includes('liquid')) {
        response = `Your current liquidity is ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(balances.liquid_usd)}. I recommend keeping 15% for immediate motion and sweeping the rest to increase your blended yield.`;
      }
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-10 backdrop-blur-xl bg-slate-900/40">
      <div className="bg-white/90 backdrop-blur-3xl border border-white/60 shadow-2xl rounded-[3.5rem] w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-8 border-b border-white/40 flex justify-between items-center bg-white/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
               <Bot size={24} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                DEUS Advisor Core <Sparkles size={14} className="text-blue-500"/>
              </h2>
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">End-to-End Encrypted</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-full transition-colors"><X size={24}/></button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/30">
          {mode === 'CHOICE' && (
            <div className="h-full flex flex-col items-center justify-center gap-8 animate-in fade-in duration-500">
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-slate-800">Select Advisory Channel</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Institutional support is standing by</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                <button onClick={handleRequestCall} className="bg-white/60 border border-white/80 p-10 rounded-[2.5rem] flex flex-col items-center gap-4 hover:shadow-2xl hover:-translate-y-1 transition-all group shadow-xl">
                  <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform"><PhoneCall size={32}/></div>
                  <div className="text-center">
                    <span className="text-xs font-black uppercase tracking-widest block text-slate-800">Request Callback</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Priority: 5 Minutes</span>
                  </div>
                </button>
                <button onClick={() => setMode('CHAT')} className="bg-white/60 border border-white/80 p-10 rounded-[2.5rem] flex flex-col items-center gap-4 hover:shadow-2xl hover:-translate-y-1 transition-all group shadow-xl">
                  <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform"><MessageSquare size={32}/></div>
                  <div className="text-center">
                    <span className="text-xs font-black uppercase tracking-widest block text-slate-800">Intelligence Chat</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real-time Data Access</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {mode === 'CALL_REQUESTED' && (
            <div className="h-full flex flex-col items-center justify-center text-center animate-in zoom-in-95">
               <div className="w-24 h-24 bg-blue-500 text-white rounded-[2rem] flex items-center justify-center mb-6 shadow-blue-500/50 shadow-2xl animate-pulse">
                 <ShieldCheck size={48} />
               </div>
               <h3 className="text-2xl font-black text-slate-800 mb-2">Routing to Advisor...</h3>
               <p className="text-sm font-medium text-slate-500 max-w-xs mx-auto">Your request has been prioritized. An advisor will contact you on your registered secure line within 5 minutes.</p>
               <button onClick={() => setMode('CHOICE')} className="mt-10 text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-700">Cancel Request</button>
            </div>
          )}

          {mode === 'CHAT' && messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
              <div className={`max-w-[80%] p-6 rounded-[2rem] ${msg.role === 'user' ? 'bg-slate-900 text-white shadow-xl rounded-tr-none' : 'bg-white border border-white/60 shadow-md text-slate-700 rounded-tl-none'}`}>
                <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}
          {isTyping && <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Core Intelligence is thinking...</div>}
        </div>

        {/* Input area for Chat */}
        {mode === 'CHAT' && (
          <form onSubmit={handleSendMessage} className="p-8 bg-white/50 border-t border-white/40 flex gap-4">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your yield, liquidity, or asset protection..." 
              className="flex-1 bg-white/50 border border-white/60 rounded-2xl px-6 py-4 text-sm font-medium outline-none focus:bg-white transition-all shadow-inner"
            />
            <button type="submit" className="bg-slate-900 text-white p-4 rounded-2xl shadow-lg hover:bg-slate-800 transition-all">
              <Send size={20} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}