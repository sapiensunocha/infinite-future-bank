import { useState, useRef, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import { 
  ShieldCheck, Zap, Crosshair, TrendingUp, ShieldAlert, 
  Globe, Landmark, Scale, Heart, Coins, Send, X, Bot, 
  Sparkles, User, Loader2, ChevronRight, Settings2, 
  CheckCircle2, Mail, Bell, Play, Pause, Activity
} from 'lucide-react';

const CABINET = [
  { id: 'aurelius', name: 'Aurelius', title: 'Chief Capital Architect', icon: <Landmark className="text-ifb-primary"/>, scoreName: 'CRR', mission: 'Design and continuously optimize the user’s complete capital architecture across horizons.' },
  { id: 'vance', name: 'Vance', title: 'Enterprise Strategist', icon: <TrendingUp className="text-ifb-success"/>, scoreName: 'IGI', mission: 'Increase earning power and optimize business financial efficiency.' },
  { id: 'atlas', name: 'Atlas', title: 'Risk Sentinel', icon: <ShieldCheck className="text-indigo-400"/>, scoreName: 'Safety', mission: 'Preserve wealth and detect threats before they materialize.' },
  { id: 'cassian', name: 'Cassian', title: 'Liquidity Commander', icon: <Zap className="text-amber-400"/>, scoreName: 'LCR', mission: 'Ensure capital is never idle and never illiquid when needed.' },
  { id: 'octavia', name: 'Octavia', title: 'Tax Navigator', icon: <Scale className="text-slate-300"/>, scoreName: 'TES', mission: 'Minimize tax leakage while maintaining full legal compliance.' },
  { id: 'orion', name: 'Orion', title: 'Opportunity Scout', icon: <Crosshair className="text-rose-400"/>, scoreName: 'OCS', mission: 'Scan for asymmetric upside aligned with user goals.' },
  { id: 'sentinel', name: 'Sentinel Prime', title: 'Crisis Officer', icon: <ShieldAlert className="text-red-500"/>, scoreName: 'ESI', mission: 'Absorb financial shocks instantly and protect user stability.' },
  { id: 'leonidas', name: 'Leonidas', title: 'Credit Strategist', icon: <Coins className="text-yellow-500"/>, scoreName: 'LPS', mission: 'Turn credit into strategic leverage rather than reactive debt.' },
  { id: 'elena', name: 'Elena', title: 'Global Mobility', icon: <Globe className="text-ifb-accent"/>, scoreName: 'GPI', mission: 'Optimize financial positioning across jurisdictions.' },
  { id: 'augustus', name: 'Augustus', title: 'Legacy Designer', icon: <Heart className="text-purple-400"/>, scoreName: 'LCS', mission: 'Ensure capital continuity beyond the user’s lifetime.' },
];

export default function Agents({ session, profile, balances }) {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [deployments, setDeployments] = useState([]); 
  const [authorityLevel, setAuthorityLevel] = useState('ADVISORY');
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  
  // Task States
  const [taskModalAgent, setTaskModalAgent] = useState(null);
  const [taskInput, setTaskInput] = useState('');

  // Chat States
  const [chatHistory, setChatHistory] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => { 
    if (profile?.id) fetchDeployments();
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [chatHistory, isAiTyping, profile?.id]);

  const fetchDeployments = async () => {
    if (!profile?.id) return;
    const { data } = await supabase.from('agent_deployments').select('*').eq('user_id', profile.id);
    if (data) setDeployments(data);
    setIsLoading(false);
  };

  const deployAgent = async () => {
    if (!profile?.id) return;
    const { error } = await supabase.from('agent_deployments').upsert({ 
      user_id: profile.id, agent_id: selectedAgent.id, authority_level: authorityLevel, is_active: true 
    }, { onConflict: 'user_id, agent_id' });

    if (!error) {
      fetchDeployments();
      setIsConfiguring(false);
      triggerNotification('success', `${selectedAgent.name} successfully deployed to active roster.`);
    }
  };

  const deactivateAgent = async (agentId) => {
    if (!profile?.id) return; 
    await supabase.from('agent_deployments').update({ is_active: false }).eq('user_id', profile.id).eq('agent_id', agentId);
    fetchDeployments();
    triggerNotification('error', `Agent connection suspended.`);
  };

  const triggerNotification = async (type, msg) => {
    setNotification({ type, text: msg });
    setTimeout(() => setNotification(null), 5000);
    // Push to DEUS global notifications table so it shows on dashboard bell
    if (profile?.id) {
      await supabase.from('notifications').insert([{ user_id: profile.id, message: msg }]);
    }
  };

  // The Master Brain Connection
  const callAgentAPI = async (agent, messages, taskStr = null) => {
    try {
      const { data, error } = await supabase.functions.invoke('agent-chat', {
        body: { agent, messages, balances, profile, task: taskStr }
      });
      if (error) throw error;
      return data.text;
    } catch (err) {
      console.error(err);
      return "Network interference detected. Secure connection to DEUS mainframe failed.";
    }
  };

  const handleConsultation = async (e) => {
    e.preventDefault();
    if (!userInput.trim() || !selectedAgent) return;

    const newChat = [...chatHistory, { role: 'user', text: userInput }];
    setChatHistory(newChat);
    setUserInput('');
    setIsAiTyping(true);

    const aiResponse = await callAgentAPI(selectedAgent, newChat);
    setChatHistory([...newChat, { role: 'ai', text: aiResponse }]);
    setIsAiTyping(false);
  };

  const handleAssignTask = async (e) => {
    e.preventDefault();
    if (!taskInput.trim() || !taskModalAgent) return;
    
    setIsAiTyping(true);
    triggerNotification('success', `Directive dispatched to ${taskModalAgent.name}. Analyzing global data...`);
    
    // Switch to chat view to see the agent's response to the task
    setSelectedAgent(taskModalAgent);
    const initialChat = [{ role: 'user', text: `DIRECTIVE ASSIGNED: ${taskInput}` }];
    setChatHistory(initialChat);
    setTaskModalAgent(null);
    setTaskInput('');

    const aiResponse = await callAgentAPI(taskModalAgent, initialChat, taskInput);
    setChatHistory([...initialChat, { role: 'ai', text: aiResponse }]);
    setIsAiTyping(false);
  };

  const getDeploymentStatus = (id) => deployments.find(d => d.agent_id === id);
  const activeAgentCount = deployments.filter(d => d.is_active).length;

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 text-white relative">
      
      {/* 🏛️ Header & Task Center */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/5 backdrop-blur-2xl border border-white/10 p-6 rounded-[2.5rem] shadow-glass">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Agent Cabinet</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-ifb-primary mt-1">Specialized Institutional Intelligence</p>
        </div>
        
        <div className="flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-white/5 shadow-inner w-full md:w-auto">
          <div className="w-10 h-10 rounded-full bg-ifb-primary/20 flex items-center justify-center text-ifb-primary border border-ifb-primary/30">
            <Activity size={18} className="animate-pulse" />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Network Status</p>
            <p className="text-sm font-black text-white">{activeAgentCount} Agents Online</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CABINET.map((agent) => {
          const status = getDeploymentStatus(agent.id);
          const isActive = status?.is_active;

          return (
            <div key={agent.id} className={`bg-white/5 backdrop-blur-2xl border p-8 rounded-[2.5rem] shadow-glass transition-all relative flex flex-col justify-between group ${isActive ? 'border-ifb-primary/50 bg-ifb-primary/5' : 'border-white/10 hover:border-white/20'}`}>
              
              {isActive && (
                <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 bg-ifb-primary/20 text-ifb-primary border border-ifb-primary/30 rounded-full text-[9px] font-black uppercase tracking-widest shadow-glow-blue">
                  <Play size={10} fill="currentColor"/> {status.authority_level}
                </div>
              )}
              
              <div>
                <div className="flex items-start gap-5 mb-6">
                  <div className={`p-4 rounded-2xl shadow-inner border ${isActive ? 'bg-black/60 border-ifb-primary/30' : 'bg-white/5 border-white/5'}`}>
                    {agent.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">{agent.name}</h3>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{agent.title}</p>
                  </div>
                </div>
                <p className="text-xs font-medium text-slate-400 leading-relaxed mb-8">{agent.mission}</p>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {isActive ? (
                  <>
                    <button onClick={() => { setSelectedAgent(agent); setChatHistory([{ role: 'ai', text: `Connection established. I am ${agent.name}. English, Français, au Kiswahili. How may I optimize your position today?` }]); }} className="flex-1 py-3 bg-ifb-primary text-white border border-blue-400/30 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-glow-blue">Consult</button>
                    <button onClick={() => setTaskModalAgent(agent)} className="flex-1 py-3 bg-white/10 text-white border border-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all">Assign Task</button>
                    <button onClick={() => deactivateAgent(agent.id)} className="p-3 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 hover:bg-red-500/20 transition-all"><Pause size={18}/></button>
                  </>
                ) : (
                  <button onClick={() => { setSelectedAgent(agent); setIsConfiguring(true); }} className="w-full py-4 bg-white/5 border border-white/10 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2">
                    <Plus size={14}/> Enroll to Roster
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CONFIGURATION (ENROLL) MODAL */}
      {isConfiguring && selectedAgent && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-6 backdrop-blur-3xl bg-black/80 animate-in fade-in duration-300">
          <div className="bg-[#0B0F19] border border-white/10 shadow-glass rounded-[3.5rem] max-w-lg w-full p-10 relative overflow-hidden">
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-ifb-primary/10 blur-[60px] pointer-events-none"></div>
            
            <div className="relative z-10">
              <h2 className="text-2xl font-black text-white mb-2">Deploy {selectedAgent.name}</h2>
              <p className="text-xs text-slate-400 mb-8">Select the autonomy level for this intelligence unit.</p>
              
              <div className="space-y-4 mb-10">
                {[
                  { id: 'ADVISORY', desc: 'Provides analysis. Requires manual approval for all actions.' },
                  { id: 'SEMI', desc: 'Can stage transactions. Requires 1-tap approval.' },
                  { id: 'AUTONOMOUS', desc: 'Full authority to execute strategy based on parameters.' }
                ].map((lvl) => (
                  <div key={lvl.id} onClick={() => setAuthorityLevel(lvl.id)} className={`p-5 rounded-3xl border cursor-pointer transition-all ${authorityLevel === lvl.id ? 'border-ifb-primary bg-ifb-primary/10 shadow-glow-blue' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                    <span className="text-xs font-black uppercase tracking-widest text-white block mb-1">{lvl.id} Authority</span>
                    <span className="text-[10px] text-slate-400">{lvl.desc}</span>
                  </div>
                ))}
              </div>
              <button onClick={deployAgent} className="w-full py-6 bg-ifb-primary text-white border border-blue-400/30 rounded-[2rem] font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-glow-blue hover:bg-blue-600 transition-colors">Authorize Deployment <Play size={14} fill="currentColor"/></button>
              <button onClick={() => setIsConfiguring(false)} className="w-full mt-4 text-[10px] font-black text-slate-500 uppercase hover:text-white transition-colors">Cancel Protocol</button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN TASK MODAL */}
      {taskModalAgent && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-6 backdrop-blur-3xl bg-black/80 animate-in fade-in duration-300">
          <div className="bg-[#0B0F19] border border-white/10 shadow-glass rounded-[3.5rem] max-w-lg w-full p-10 relative">
            <h2 className="text-xl font-black text-white mb-2 flex items-center gap-2"><Target size={20} className="text-ifb-accent"/> Assign Directive</h2>
            <p className="text-xs text-slate-400 mb-8">Dispatch {taskModalAgent.name} to analyze global data networks.</p>
            
            <form onSubmit={handleAssignTask}>
              <textarea 
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                placeholder="e.g., Analyze the impact of new Swiss banking regulations on my portfolio."
                className="w-full h-32 bg-black/50 border border-white/10 rounded-2xl p-5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-ifb-accent transition-colors resize-none mb-6 shadow-inner"
                autoFocus
              />
              <button type="submit" disabled={!taskInput.trim()} className="w-full py-5 bg-ifb-accent text-[#0B0F19] rounded-[2rem] font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-glow hover:bg-cyan-400 transition-colors disabled:opacity-50">Dispatch Intelligence <Globe size={14}/></button>
              <button type="button" onClick={() => setTaskModalAgent(null)} className="w-full mt-4 text-[10px] font-black text-slate-500 uppercase hover:text-white transition-colors">Cancel</button>
            </form>
          </div>
        </div>
      )}

      {/* CONSULTATION CHAT TERMINAL */}
      {!isConfiguring && !taskModalAgent && selectedAgent && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6 backdrop-blur-3xl bg-black/80 animate-in fade-in duration-300">
          <div className="bg-[#0B0F19] border border-white/10 shadow-glass rounded-[3rem] max-w-2xl w-full h-[80vh] flex flex-col overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-ifb-primary via-ifb-accent to-ifb-success"></div>
            
            <div className="p-6 md:p-8 border-b border-white/10 flex justify-between items-center bg-white/5 backdrop-blur-md z-10">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-black/50 rounded-xl border border-white/10">{selectedAgent.icon}</div> 
                <div>
                  <span className="font-black text-sm text-white block">{selectedAgent.name}</span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-ifb-primary">Secure Neural Link Established</span>
                </div>
              </div>
              <button onClick={() => setSelectedAgent(null)} className="text-slate-400 hover:text-white bg-black/40 p-2 rounded-full border border-white/10"><X size={20}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar">
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-5 rounded-3xl text-sm max-w-[85%] leading-relaxed ${msg.role === 'user' ? 'bg-ifb-primary text-white shadow-glow-blue rounded-tr-sm' : 'bg-white/10 border border-white/10 text-slate-200 rounded-tl-sm'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isAiTyping && (
                <div className="flex justify-start">
                   <div className="p-5 rounded-3xl bg-white/5 border border-white/10 text-ifb-accent text-xs font-black uppercase tracking-widest flex items-center gap-2">
                     <Loader2 size={14} className="animate-spin" /> Processing Neural Request...
                   </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            
            <div className="p-6 border-t border-white/10 bg-white/5">
              <form onSubmit={handleConsultation} className="relative flex items-center">
                <input 
                  type="text" 
                  value={userInput} 
                  onChange={(e) => setUserInput(e.target.value)} 
                  placeholder="Transmit directive in English, Français, or Kiswahili..." 
                  className="w-full bg-black/50 border border-white/10 rounded-full py-5 pl-6 pr-16 outline-none focus:border-ifb-primary transition-colors text-white placeholder:text-slate-500 shadow-inner text-sm" 
                />
                <button type="submit" disabled={!userInput.trim() || isAiTyping} className="absolute right-3 w-10 h-10 bg-ifb-primary text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors shadow-glow-blue disabled:opacity-50"><Send size={16}/></button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 🟢 IN-APP NOTIFICATION */}
      {notification && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[300] animate-in slide-in-from-top-4 fade-in duration-300">
          <div className={`px-6 py-4 rounded-2xl shadow-glass border backdrop-blur-2xl flex items-center gap-3 ${
            notification.type === 'success' ? 'bg-ifb-primary/10 border-ifb-primary/30 text-ifb-primary' : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${notification.type === 'success' ? 'bg-ifb-primary' : 'bg-red-400'}`}></div>
            <p className="font-black text-sm uppercase tracking-widest">{notification.text}</p>
          </div>
        </div>
      )}
    </div>
  );
}