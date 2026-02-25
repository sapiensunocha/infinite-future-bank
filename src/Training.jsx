import { useState, useRef, useEffect } from 'react';
import { 
  BookOpen, BrainCircuit, Play, CheckCircle2, 
  ChevronRight, Send, Loader2, Bot, Sparkles, User
} from 'lucide-react';

export default function Training() {
  const [activeTab, setActiveTab] = useState('MICRO'); // MICRO, AI_MENTOR
  const [selectedModule, setSelectedModule] = useState(null);
  
  // AI Chat States
  const [chatHistory, setChatHistory] = useState([
    { role: 'ai', text: 'Welcome to your personal training session. What financial concept would you like to master today? (e.g., "Explain Alpha Equity", "How do I build a safety net?")' }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatEndRef = useRef(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isAiTyping]);

  // Mock Micro-Learning Data
  const microModules = [
    { 
      id: 1, 
      title: 'The Sovereign Foundation', 
      duration: '2 min', 
      category: 'Basics', 
      completed: true,
      content: 'A Sovereign Foundation is built on absolute liquidity and security. It means having at least 6 months of operational capital stored in a zero-risk, instantly accessible environment. In IFB, your Liquid Cash combined with the Emergency SOS Shield forms this baseline.'
    },
    { 
      id: 2, 
      title: 'Mastering Alpha Equity', 
      duration: '3 min', 
      category: 'Investing', 
      completed: false,
      content: 'Alpha Equity represents capital deployed into high-yield, algorithmically managed pools. Unlike traditional savings, Alpha Equity aims to outpace inflation by leveraging global market inefficiencies. The golden rule: Only deploy capital you do not need for the next 12-24 months.'
    },
    { 
      id: 3, 
      title: 'The Psychology of Pockets', 
      duration: '1 min', 
      category: 'Organization', 
      completed: false,
      content: 'Mental accounting is powerful. By splitting your wealth into specific "Pockets" (e.g., Tax Reserve, Travel Fund), you remove financial anxiety. You no longer look at one large number and wonder what is safe to spend; the system tells you exactly what is allocated where.'
    }
  ];

  // 🧠 AI MENTOR API CALL
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const newChat = [...chatHistory, { role: 'user', text: userInput }];
    setChatHistory(newChat);
    setUserInput('');
    setIsAiTyping(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const prompt = `You are the DEUS Training Mentor, an elite financial educator. 
      The user is asking to learn about: "${userInput}". 
      Provide a concise, highly educational answer focused on micro-learning. Keep it under 2 paragraphs. 
      Use clear, professional, and encouraging language. Make them feel capable and smart. Do not use asterisks or markdown bolding.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      const data = await response.json();
      const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "I'm currently updating my training models. Please ask again in a moment.";

      setChatHistory([...newChat, { role: 'ai', text: aiText.replace(/\*/g, '') }]);
    } catch (err) {
      setChatHistory([...newChat, { role: 'ai', text: "Training system temporarily offline for maintenance. Please check your connection." }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      
      {/* 🏛️ Header & Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/60 backdrop-blur-2xl border border-white/60 p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/40">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <BookOpen size={24} className="text-blue-500" /> Training Center
          </h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Master your financial sovereignty</p>
        </div>
        
        <div className="flex bg-white/50 p-2 rounded-2xl border border-white/40 shadow-inner w-full md:w-auto overflow-x-auto">
          {[
            { id: 'MICRO', label: 'Micro-Learning' },
            { id: 'AI_MENTOR', label: 'AI Mentor' }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedModule(null); }}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 📈 DYNAMIC CONTENT */}

      {/* MODE 1: MICRO-LEARNING */}
      {activeTab === 'MICRO' && !selectedModule && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-left-4">
          {microModules.map((mod) => (
            <div 
              key={mod.id} 
              onClick={() => setSelectedModule(mod)}
              className="bg-white/60 backdrop-blur-2xl border border-white/60 p-8 rounded-[2.5rem] shadow-xl hover:-translate-y-1 transition-transform cursor-pointer group flex flex-col justify-between h-full min-h-[220px]"
            >
              <div>
                <div className="flex justify-between items-start mb-6">
                  <span className="text-[9px] font-black uppercase tracking-widest text-blue-500 bg-blue-50 px-3 py-1 rounded-lg">
                    {mod.category}
                  </span>
                  {mod.completed ? <CheckCircle2 size={18} className="text-emerald-500"/> : <Play size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors"/>}
                </div>
                <h3 className="text-lg font-black text-slate-800 leading-tight">{mod.title}</h3>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-6">
                <BookOpen size={12}/> {mod.duration} read
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODULE READER (Expanded Micro-Learning) */}
      {activeTab === 'MICRO' && selectedModule && (
        <div className="bg-white/60 backdrop-blur-2xl border border-white/60 p-10 md:p-12 rounded-[3.5rem] shadow-2xl max-w-3xl mx-auto animate-in zoom-in-95">
          <button 
            onClick={() => setSelectedModule(null)}
            className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-500 flex items-center gap-1 mb-8 transition-colors"
          >
            <ChevronRight size={14} className="rotate-180"/> Back to Modules
          </button>
          
          <div className="mb-8">
            <span className="text-[9px] font-black uppercase tracking-widest text-blue-500 mb-2 block">{selectedModule.category} • {selectedModule.duration}</span>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">{selectedModule.title}</h2>
          </div>
          
          <div className="prose prose-slate max-w-none text-slate-600 font-medium leading-relaxed mb-10">
            <p className="text-sm md:text-base">{selectedModule.content}</p>
          </div>

          <button 
            onClick={() => setSelectedModule(null)}
            className="w-full md:w-auto px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={16}/> Complete Module
          </button>
        </div>
      )}

      {/* MODE 2: AI MENTOR (Interactive Training) */}
      {activeTab === 'AI_MENTOR' && (
        <div className="bg-white/60 backdrop-blur-2xl border border-white/60 rounded-[3rem] shadow-xl overflow-hidden flex flex-col h-[600px] animate-in slide-in-from-right-4">
          
          {/* Chat Header */}
          <div className="p-6 bg-slate-50/50 border-b border-white/60 flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shadow-inner">
              <BrainCircuit size={20}/>
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800">DEUS Training Mentor</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Sparkles size={10} className="text-indigo-400"/> AI-Driven Learning
              </p>
            </div>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-indigo-500 text-white'}`}>
                  {msg.role === 'user' ? <User size={14}/> : <Bot size={14}/>}
                </div>
                <div className={`p-5 rounded-3xl text-sm font-medium leading-relaxed ${msg.role === 'user' ? 'bg-slate-900 text-white rounded-tr-sm' : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm shadow-sm'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            
            {isAiTyping && (
              <div className="flex gap-4 max-w-[85%]">
                <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Bot size={14}/>
                </div>
                <div className="p-5 rounded-3xl bg-white border border-slate-100 text-slate-400 rounded-tl-sm shadow-sm flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin"/> Formulating lesson...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white/80 border-t border-white/60">
            <form onSubmit={handleSendMessage} className="relative flex items-center">
              <input 
                type="text" 
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Ask a question or request a topic..." 
                className="w-full bg-slate-50 border border-slate-200 rounded-full py-4 pl-6 pr-16 text-sm font-medium text-slate-800 outline-none focus:border-indigo-300 transition-colors shadow-inner"
                disabled={isAiTyping}
              />
              <button 
                type="submit" 
                disabled={!userInput.trim() || isAiTyping}
                className="absolute right-2 w-10 h-10 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 text-white rounded-full flex items-center justify-center transition-colors shadow-md"
              >
                <Send size={16} className="ml-0.5"/>
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}