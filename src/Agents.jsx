import { useState, useRef, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import { 
  ShieldCheck, Zap, Crosshair, TrendingUp, ShieldAlert, 
  Globe, Landmark, Scale, Heart, Coins, Send, X, Bot, 
  Sparkles, User, Loader2, ChevronRight, Settings2, 
  CheckCircle2, Mail, Bell, Play, Pause
} from 'lucide-react';

const CABINET = [
  { id: 'aurelius', name: 'Aurelius', title: 'Chief Capital Architect', icon: <Landmark className="text-blue-500"/>, scoreName: 'CRR', mission: 'Design and continuously optimize the user’s complete capital architecture across horizons.' },
  { id: 'vance', name: 'Vance', title: 'Enterprise Strategist', icon: <TrendingUp className="text-emerald-500"/>, scoreName: 'IGI', mission: 'Increase earning power and optimize business financial efficiency.' },
  { id: 'atlas', name: 'Atlas', title: 'Risk Sentinel', icon: <ShieldCheck className="text-indigo-500"/>, scoreName: 'Safety', mission: 'Preserve wealth and detect threats before they materialize.' },
  { id: 'cassian', name: 'Cassian', title: 'Liquidity Commander', icon: <Zap className="text-amber-500"/>, scoreName: 'LCR', mission: 'Ensure capital is never idle and never illiquid when needed.' },
  { id: 'octavia', name: 'Octavia', title: 'Tax Navigator', icon: <Scale className="text-slate-500"/>, scoreName: 'TES', mission: 'Minimize tax leakage while maintaining full legal compliance.' },
  { id: 'orion', name: 'Orion', title: 'Opportunity Scout', icon: <Crosshair className="text-rose-500"/>, scoreName: 'OCS', mission: 'Scan for asymmetric upside aligned with user goals.' },
  { id: 'sentinel', name: 'Sentinel Prime', title: 'Crisis Officer', icon: <ShieldAlert className="text-red-500"/>, scoreName: 'ESI', mission: 'Absorb financial shocks instantly and protect user stability.' },
  { id: 'leonidas', name: 'Leonidas', title: 'Credit Strategist', icon: <Coins className="text-yellow-600"/>, scoreName: 'LPS', mission: 'Turn credit into strategic leverage rather than reactive debt.' },
  { id: 'elena', name: 'Elena', title: 'Global Mobility', icon: <Globe className="text-cyan-500"/>, scoreName: 'GPI', mission: 'Optimize financial positioning across jurisdictions.' },
  { id: 'augustus', name: 'Augustus', title: 'Legacy Designer', icon: <Heart className="text-purple-500"/>, scoreName: 'LCS', mission: 'Ensure capital continuity beyond the user’s lifetime.' },
];

export default function Agents({ profile, balances }) {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [deployments, setDeployments] = useState([]); 
  const [authorityLevel, setAuthorityLevel] = useState('ADVISORY');
  const [isLoading, setIsLoading] = useState(true);
  
  // Chat States
  const [chatHistory, setChatHistory] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => { 
    if (profile?.id) {
      fetchDeployments();
    }
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [chatHistory, isAiTyping, profile?.id]);

  const fetchDeployments = async () => {
    if (!profile?.id) return;
    const { data } = await supabase
      .from('agent_deployments')
      .select('*')
      .eq('user_id', profile.id); // Locked strictly to the active user

    if (data) setDeployments(data);
    setIsLoading(false);
  };

  const handleConsultation = async (e) => {
    e.preventDefault();
    if (!userInput.trim() || !selectedAgent) return;

    const newChat = [...chatHistory, { role: 'user', text: userInput }];
    setChatHistory(newChat);
    setUserInput('');
    setIsAiTyping(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const prompt = `You are ${selectedAgent.name}, the ${selectedAgent.title}. Mandate: ${selectedAgent.mission}. Response must be institutional, strategic, and concise (3 sentences). User Balance: $${balances.liquid_usd}. Question: "${userInput}"`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      const data = await response.json();
      const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Link severed.";
      setChatHistory([...newChat, { role: 'ai', text: aiText.replace(/\*/g, '') }]);
    } catch (err) {
      setChatHistory([...newChat, { role: 'ai', text: "Agent unavailable." }]);
    } finally { setIsAiTyping(false); }
  };

  const deployAgent = async () => {
    if (!profile?.id) return; // Safety check before writing to DB

    const { error } = await supabase
      .from('agent_deployments')
      .upsert({ 
        user_id: profile.id, 
        agent_id: selectedAgent.id, 
        authority_level: authorityLevel, 
        is_active: true 
      }, { onConflict: 'user_id, agent_id' });

    if (!error) {
      fetchDeployments();
      setIsConfiguring(false);
    }
  };

  const deactivateAgent = async (agentId) => {
    if (!profile?.id) return; // Safety check
    
    await supabase
      .from('agent_deployments')
      .update({ is_active: false })
      .eq('user_id', profile.id)
      .eq('agent_id', agentId);
      
    fetchDeployments();
  };

  const getDeploymentStatus = (id) => deployments.find(d => d.agent_id === id);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      
      <div className="bg-white/60 backdrop-blur-2xl border border-white/60 p-8 rounded-[3rem] shadow-xl">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Agent Cabinet</h2>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Specialized Institutional Intelligence</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CABINET.map((agent) => {
          const status = getDeploymentStatus(agent.id);
          return (
            <div key={agent.id} className={`bg-white/60 backdrop-blur-2xl border border-white/60 p-8 rounded-[2.5rem] shadow-xl transition-all relative ${status?.is_active ? 'ring-2 ring-emerald-500/30' : ''}`}>
              {status?.is_active && (
                <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest">
                  <Play size={10} fill="currentColor"/> {status.authority_level}
                </div>
              )}
              <div className="flex items-start gap-5 mb-6">
                <div className="p-4 bg-white rounded-2xl shadow-inner">{agent.icon}</div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">{agent.name}</h3>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{agent.title}</p>
                </div>
              </div>
              <p className="text-xs font-medium text-slate-500 leading-relaxed mb-8">{agent.mission}</p>
              
              <div className="flex gap-3">
                <button onClick={() => { setSelectedAgent(agent); setChatHistory([{ role: 'ai', text: `Systems online. I am ${agent.name}.` }]); }} className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all">Consult</button>
                <button onClick={() => { setSelectedAgent(agent); setIsConfiguring(true); }} className="p-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all"><Settings2 size={18}/></button>
                {status?.is_active && <button onClick={() => deactivateAgent(agent.id)} className="p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 hover:bg-red-100"><Pause size={18}/></button>}
              </div>
            </div>
          );
        })}
      </div>

      {/* CONFIGURATION MODAL */}
      {isConfiguring && selectedAgent && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-6 backdrop-blur-3xl bg-slate-900/60">
          <div className="bg-white border border-white/60 shadow-2xl rounded-[3.5rem] max-w-lg w-full p-10 relative">
            <h2 className="text-2xl font-black text-slate-800 mb-8">Deploy {selectedAgent.name}</h2>
            <div className="space-y-4 mb-10">
              {['ADVISORY', 'SEMI', 'AUTONOMOUS'].map((lvl) => (
                <div key={lvl} onClick={() => setAuthorityLevel(lvl)} className={`p-5 rounded-3xl border-2 cursor-pointer transition-all ${authorityLevel === lvl ? 'border-blue-500 bg-blue-50' : 'border-slate-100'}`}>
                  <span className="text-xs font-black uppercase tracking-widest">{lvl} Authority</span>
                </div>
              ))}
            </div>
            <button onClick={deployAgent} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3">Deploy Agent <Play size={14} fill="currentColor"/></button>
            <button onClick={() => setIsConfiguring(false)} className="w-full mt-4 text-[10px] font-black text-slate-400 uppercase">Cancel</button>
          </div>
        </div>
      )}

      {/* CONSULTATION MODAL */}
      {!isConfiguring && selectedAgent && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-3xl bg-slate-900/60">
          <div className="bg-white border border-white/60 shadow-2xl rounded-[3rem] max-w-2xl w-full h-[650px] flex flex-col overflow-hidden">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-4">{selectedAgent.icon} <span className="font-black text-sm">{selectedAgent.name}</span></div>
              <button onClick={() => setSelectedAgent(null)}><X size={24}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-5 rounded-3xl text-sm max-w-[80%] ${msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-800'}`}>{msg.text}</div>
                </div>
              ))}
              {isAiTyping && <div className="text-slate-400 text-xs animate-pulse font-black uppercase">Thinking...</div>}
              <div ref={chatEndRef} />
            </div>
            <div className="p-6 border-t">
              <form onSubmit={handleConsultation} className="relative">
                <input type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder="Type command..." className="w-full bg-slate-50 border rounded-full py-5 px-8 outline-none" />
                <button type="submit" className="absolute right-3 top-2.5 w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center"><Send size={18}/></button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}