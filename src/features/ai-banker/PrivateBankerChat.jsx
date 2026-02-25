import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User, ShieldCheck, Zap, Activity } from 'lucide-react';

import GlassCard from '@/components/ui/GlassCard';
import DeusOrchestrator from '@/deus/orchestrator';

export default function PrivateBankerChat() {
  const scrollRef = useRef(null);
  
  // 🧭 State Management
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Initialize the chat with a proactive, hyper-personalized greeting from DEUS
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'deus',
      text: "DEUS Core online. I am monitoring your whole-wealth portfolio. Global markets are experiencing 1.2% volatility today, but your Lombard line remains highly overcollateralized. How may I deploy your capital or optimize your tax strategy today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // Quick prompt chips to eliminate user friction
  const quickActions = [
    "Analyze my tax exposure",
    "Deploy $50k to Treasury",
    "Show me pre-IPO deals"
  ];

  // =========================================================================
  // ⚙️ THE CHAT ENGINE (Connecting to the Orchestrator)
  // =========================================================================
  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputValue;
    if (!text.trim()) return;

    // 1. Add User Message
    const newUserMsg = {
      id: Date.now(),
      sender: 'user',
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, newUserMsg]);
    setInputValue('');
    setIsTyping(true);

    // 2. Pass to DEUS Orchestrator (Simulated Mock Portfolio for context)
    const mockPortfolioContext = { netWorth: 1245890, idleCash: 345000, riskTolerance: 'Aggressive' };
    
    // In a fully live environment with your API key, this talks to Gemini.
    // If the API key isn't set yet, the Orchestrator's catch block returns a safe fallback.
    const response = await DeusOrchestrator.consultBanker(text, mockPortfolioContext);

    // 3. Add AI Response
    const newAiMsg = {
      id: Date.now() + 1,
      sender: 'deus',
      text: response.message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newAiMsg]);
    setIsTyping(false);
  };

  // Auto-scroll to the latest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col lg:flex-row gap-6 animate-in fade-in duration-500">
      
      {/* 🗂️ LEFT PANEL: The Chat Interface (Takes up main space) */}
      <GlassCard className="flex-1 flex flex-col p-0 overflow-hidden relative border-ifb-accent/20">
        
        {/* Header element within the chat */}
        <div className="bg-white/5 border-b border-white/10 p-4 flex justify-between items-center z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-ifb-accent/20 flex items-center justify-center border border-ifb-accent/50 shadow-glow">
                <Sparkles size={20} className="text-ifb-accent" />
              </div>
              {/* Online pulsing indicator */}
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-ifb-success rounded-full border-2 border-[#0B0F19] animate-pulse"></span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-none">DEUS</h2>
              <span className="text-xs text-ifb-accent uppercase tracking-widest font-semibold">Chief Financial Intelligence</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-ifb-muted bg-[#0B0F19]/50 px-3 py-1.5 rounded-full border border-white/5">
            <ShieldCheck size={14} className="text-ifb-success" /> End-to-End Encrypted
          </div>
        </div>

        {/* The Chat History Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 relative z-10"
        >
          {messages.map((msg) => (
            <div key={msg.id} className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              
              <div className={`flex max-w-[85%] sm:max-w-[75%] gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                
                {/* Avatar */}
                <div className="shrink-0 mt-1">
                  {msg.sender === 'user' ? (
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                      <User size={14} className="text-white" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-ifb-accent/20 flex items-center justify-center border border-ifb-accent/50 shadow-glow">
                      <Sparkles size={14} className="text-ifb-accent" />
                    </div>
                  )}
                </div>

                {/* Message Bubble */}
                <div className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <div 
                    className={`px-5 py-3.5 rounded-2xl text-sm leading-relaxed backdrop-blur-md shadow-lg
                      ${msg.sender === 'user' 
                        ? 'bg-ifb-primary/20 border border-ifb-primary/30 text-white rounded-tr-none' 
                        : 'bg-[#0B0F19]/80 border border-ifb-accent/20 text-white rounded-tl-none relative overflow-hidden'
                      }
                    `}
                  >
                    {/* Subtle glow for AI messages */}
                    {msg.sender === 'deus' && <div className="absolute inset-0 bg-ifb-accent/5 pointer-events-none"></div>}
                    <span className="relative z-10 whitespace-pre-wrap">{msg.text}</span>
                  </div>
                  <span className="text-[10px] text-ifb-muted mt-1.5 px-1">{msg.timestamp}</span>
                </div>
              </div>

            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start w-full">
              <div className="flex max-w-[85%] gap-3">
                <div className="shrink-0 mt-1">
                  <div className="w-8 h-8 rounded-full bg-ifb-accent/20 flex items-center justify-center border border-ifb-accent/50 shadow-glow">
                    <Sparkles size={14} className="text-ifb-accent" />
                  </div>
                </div>
                <div className="px-5 py-4 rounded-2xl rounded-tl-none bg-[#0B0F19]/80 border border-ifb-accent/20 flex items-center gap-1.5 w-20">
                  <div className="w-1.5 h-1.5 bg-ifb-accent rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-ifb-accent rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-ifb-accent rounded-full animate-bounce"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white/5 border-t border-white/10 backdrop-blur-md z-10">
          
          {/* Quick Action Chips */}
          <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar pb-1">
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(action)}
                className="whitespace-nowrap px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-ifb-muted hover:text-white hover:bg-white/10 hover:border-white/20 transition-colors flex items-center gap-1.5"
              >
                <Zap size={12} className="text-ifb-accent" /> {action}
              </button>
            ))}
          </div>

          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
            className="relative flex items-center"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask DEUS to analyze, allocate, or move capital..."
              className="w-full bg-[#0B0F19]/80 border border-white/20 rounded-xl py-3.5 pl-4 pr-12 text-sm text-white focus:outline-none focus:border-ifb-accent focus:ring-1 focus:ring-ifb-accent transition-all shadow-inner"
              disabled={isTyping}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              className="absolute right-2 p-2 rounded-lg bg-ifb-primary/20 text-ifb-primary hover:bg-ifb-primary hover:text-white transition-colors disabled:opacity-50 disabled:hover:bg-ifb-primary/20 disabled:hover:text-ifb-primary"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </GlassCard>

      {/* 📈 RIGHT PANEL: The Live DEUS Brain Metrics */}
      <div className="hidden lg:flex flex-col gap-6 w-80 shrink-0">
        
        <GlassCard padding="p-5" className="bg-ifb-accent/5 border-ifb-accent/20">
          <h3 className="text-xs font-bold text-ifb-muted uppercase tracking-widest mb-4 flex items-center gap-2">
            <Activity size={14} className="text-ifb-accent" /> Neural Link Status
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-white">Market Data Latency</span>
                <span className="text-ifb-success font-mono">12ms</span>
              </div>
              <div className="w-full h-1 bg-white/10 rounded-full"><div className="h-full bg-ifb-success w-[95%] rounded-full"></div></div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-white">Predictive Confidence</span>
                <span className="text-ifb-accent font-mono">99.4%</span>
              </div>
              <div className="w-full h-1 bg-white/10 rounded-full"><div className="h-full bg-ifb-accent w-[99%] rounded-full shadow-glow"></div></div>
            </div>
            <div className="pt-3 border-t border-white/10">
              <p className="text-[10px] text-ifb-muted leading-relaxed">
                DEUS is currently analyzing 4,209 global market vectors to optimize your tax-loss harvesting strategy.
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard padding="p-5">
           <h3 className="text-xs font-bold text-ifb-muted uppercase tracking-widest mb-4">Active AI Mandates</h3>
           <div className="space-y-3">
             <div className="bg-white/5 border border-white/10 rounded-lg p-3">
               <span className="block text-xs font-semibold text-white mb-1">Auto-Yield Sweep</span>
               <span className="text-[10px] text-ifb-muted">Checking liquidity above $50k is auto-routed to 5.25% Treasury.</span>
             </div>
             <div className="bg-white/5 border border-white/10 rounded-lg p-3">
               <span className="block text-xs font-semibold text-white mb-1">Lombard Protection</span>
               <span className="text-[10px] text-ifb-muted">Alerting user if portfolio drops below 45% LTV margin threshold.</span>
             </div>
           </div>
        </GlassCard>
      </div>

    </div>
  );
}