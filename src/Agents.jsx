import { useState, useRef, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import { 
  ShieldCheck, Zap, Crosshair, TrendingUp, ShieldAlert, 
  Globe, Landmark, Scale, Heart, Coins, Send, X, Bot, 
  Sparkles, User, Loader2, ChevronRight, Settings2, 
  CheckCircle2, Circle, Mail, Bell, Play, Pause, Activity, Plus, Target, CodeSquare, Square
} from 'lucide-react';

const CABINET = [
  { id: 'abraham', name: 'Abraham', title: 'IFB Mentor', icon: <Target className="text-teal-600"/>, scoreName: 'CRS', mission: 'Structured Entrepreneurial Infrastructure: Execute Founder Diagnostics, Business Blueprints, and Capital Readiness Scoring.' },
  { id: 'aurelius', name: 'Aurelius', title: 'Chief Capital Architect', icon: <Landmark className="text-blue-600"/>, scoreName: 'CRR', mission: 'Design and continuously optimize the user’s complete capital architecture across horizons.' },
  { id: 'vance', name: 'Vance', title: 'Enterprise Strategist', icon: <TrendingUp className="text-emerald-600"/>, scoreName: 'IGI', mission: 'Increase earning power and optimize business financial efficiency.' },
  { id: 'atlas', name: 'Atlas', title: 'Risk Sentinel', icon: <ShieldCheck className="text-indigo-600"/>, scoreName: 'Safety', mission: 'Preserve wealth and detect threats before they materialize.' },
  { id: 'cassian', name: 'Cassian', title: 'Liquidity Commander', icon: <Zap className="text-amber-500"/>, scoreName: 'LCR', mission: 'Ensure capital is never idle and never illiquid when needed.' },
  { id: 'octavia', name: 'Octavia', title: 'Tax Navigator', icon: <Scale className="text-slate-600"/>, scoreName: 'TES', mission: 'Minimize tax leakage while maintaining full legal compliance.' },
  { id: 'orion', name: 'Orion', title: 'Opportunity Scout', icon: <Crosshair className="text-rose-500"/>, scoreName: 'OCS', mission: 'Scan for asymmetric upside aligned with user goals.' },
  { id: 'sentinel', name: 'Sentinel Prime', title: 'Crisis Officer', icon: <ShieldAlert className="text-red-600"/>, scoreName: 'ESI', mission: 'Absorb financial shocks instantly and protect user stability.' },
  { id: 'leonidas', name: 'Leonidas', title: 'Credit Strategist', icon: <Coins className="text-yellow-600"/>, scoreName: 'LPS', mission: 'Turn credit into strategic leverage rather than reactive debt.' },
  { id: 'elena', name: 'Elena', title: 'Global Mobility', icon: <Globe className="text-cyan-600"/>, scoreName: 'GPI', mission: 'Optimize financial positioning across jurisdictions.' },
  { id: 'augustus', name: 'Augustus', title: 'Legacy Designer', icon: <Heart className="text-purple-600"/>, scoreName: 'LCS', mission: 'Ensure capital continuity beyond the user’s lifetime.' },
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

  // 🔥 TRANSPARENCY EXECUTION TRACKER STATES
  const [executionPlan, setExecutionPlan] = useState({
    isActive: false,
    title: '',
    steps: [], // { id, text, status: 'pending' | 'active' | 'completed' }
    currentDetail: '',
    progressPct: 0
  });

  const GCP_NODE_URL = 'https://afr-blockchain-node-382117221028.us-central1.run.app';

  useEffect(() => { 
    if (profile?.id) fetchDeployments();
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [chatHistory, isAiTyping, executionPlan.isActive, profile?.id]);

  const fetchDeployments = async () => {
    if (!profile?.id) return;
    const { data } = await supabase.from('agent_deployments').select('*').eq('user_id', profile.id);
    if (data) setDeployments(data);
    setIsLoading(false);
  };

  const getDeploymentStatus = (id) => deployments.find(d => d.agent_id === id);

  const deployAgent = async () => {
    if (!profile?.id) return;
    const { error } = await supabase.from('agent_deployments').upsert({ 
      user_id: profile.id, agent_id: selectedAgent.id, authority_level: authorityLevel, is_active: true 
    }, { onConflict: 'user_id, agent_id' });

    if (!error) {
      fetchDeployments();
      setIsConfiguring(false);
      triggerNotification('success', `${selectedAgent.name} successfully deployed with ${authorityLevel} clearance.`);
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
    setTimeout(() => setNotification(null), 6000);
  };

  // --- STANDARD CHAT API ---
  const callAgentAPI = async (agent, messages) => {
    try {
      const authLevel = getDeploymentStatus(agent.id)?.authority_level || 'ADVISORY';
      const response = await fetch(`${GCP_NODE_URL}/api/agent-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agent.id, userId: profile.id, authorityLevel: authLevel, messages: messages })
      });
      if (!response.ok) throw new Error("GCP Engine Offline");
      return await response.json();
    } catch (err) {
      console.error(err);
      return { text: "⚠️ Network interference detected. Secure connection to DEUS mainframe failed.", executedAction: null };
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
    let finalChat = [...newChat, { role: 'ai', text: aiResponse.text }];
    if (aiResponse.executedAction) {
      finalChat.push({ role: 'system', text: `⚡ EXECUTED: ${aiResponse.executedAction}` });
      triggerNotification('success', 'Blockchain Execution Confirmed.');
    }

    setChatHistory(finalChat);
    setIsAiTyping(false);
  };

  // 🔥 TRANSPARENT TASK EXECUTION (MOCKING GCP SSE STREAM)
  const handleAssignTask = async (e) => {
    e.preventDefault();
    if (!taskInput.trim() || !taskModalAgent) return;
    
    // 1. Setup Chat & Close Modal
    setSelectedAgent(taskModalAgent);
    const initialChat = [{ role: 'user', text: `DIRECTIVE ASSIGNED: ${taskInput}` }];
    setChatHistory(initialChat);
    const agentName = taskModalAgent.name;
    setTaskModalAgent(null);
    setTaskInput('');

    // 2. Initialize the Transparent Tracker based on the directive
    const planTitle = `IFB ${agentName} Operations Plan`;
    let mockSteps = [
      { id: 1, text: "Establish secure connection to IFB Cloud Core.", status: "active" },
      { id: 2, text: "Query live market data and user telemetry.", status: "pending" },
      { id: 3, text: "Evaluate regulatory constraints and risk parameters.", status: "pending" },
      { id: 4, text: "Synthesize operational blueprint and execute.", status: "pending" }
    ];

    setExecutionPlan({
      isActive: true,
      title: planTitle,
      steps: mockSteps,
      currentDetail: "Initializing neural handshake...",
      progressPct: 5
    });

    // 3. Simulate the Server-Sent Events (SSE) from GCP MCP Server
    // In production, you will replace this block with an EventSource listening to /api/agent-stream
    
    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    // Step 1 Finish
    await delay(1500);
    mockSteps[0].status = "completed";
    mockSteps[1].status = "active";
    setExecutionPlan(prev => ({ ...prev, steps: [...mockSteps], currentDetail: "Fetching Tier-1 institutional reports...", progressPct: 30 }));
    triggerNotification('success', `[${agentName}] Secure connection established.`);

    // Step 2 Finish
    await delay(2500);
    mockSteps[1].status = "completed";
    mockSteps[2].status = "active";
    setExecutionPlan(prev => ({ ...prev, steps: [...mockSteps], currentDetail: "Analyzing lombard, private credit, and asset-backed structures...", progressPct: 60 }));
    triggerNotification('success', `[${agentName}] Telemetry acquired.`);

    // Step 3 Finish
    await delay(2500);
    mockSteps[2].status = "completed";
    mockSteps[3].status = "active";
    setExecutionPlan(prev => ({ ...prev, steps: [...mockSteps], currentDetail: "Drafting final architecture...", progressPct: 85 }));
    triggerNotification('success', `[${agentName}] Risk evaluation complete.`);

    // Step 4 Finish
    await delay(2000);
    mockSteps[3].status = "completed";
    setExecutionPlan(prev => ({ ...prev, steps: [...mockSteps], currentDetail: "Directive fulfilled.", progressPct: 100 }));
    triggerNotification('success', `[${agentName}] Operational blueprint executed successfully.`);

    // 4. Conclude Task and append to chat
    await delay(1000);
    setExecutionPlan(prev => ({ ...prev, isActive: false }));
    setChatHistory([...initialChat, { 
      role: 'ai', 
      text: `Task Completed. I have analyzed the data and constructed the requested framework. All parameters are within acceptable risk thresholds. Awaiting further directives.` 
    }, {
      role: 'system',
      text: `⚡ EXECUTED: Generated Comprehensive Research Plan.`
    }]);
  };

  const activeAgentCount = deployments.filter(d => d.is_active).length;

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 text-slate-800 relative">
      
      {/* 🏛️ Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white border border-slate-200 p-6 rounded-[2.5rem] shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Agent Cabinet</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mt-1">Specialized Institutional Intelligence</p>
        </div>
        <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-sm w-full md:w-auto">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 border border-blue-200">
            <Activity size={18} className={activeAgentCount > 0 ? "animate-pulse" : ""} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Network Status</p>
            <p className="text-sm font-black text-slate-800">{activeAgentCount} Agents Online</p>
          </div>
        </div>
      </div>

      {/* 🤖 Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CABINET.map((agent) => {
          const status = getDeploymentStatus(agent.id);
          const isActive = status?.is_active;

          return (
            <div key={agent.id} className={`bg-white border p-8 rounded-[2.5rem] shadow-sm transition-all relative flex flex-col justify-between group ${isActive ? 'border-blue-500 bg-blue-50/30' : 'border-slate-200 hover:border-slate-300 hover:shadow-md'}`}>
              
              {isActive && (
                <div className={`absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 border rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${status.authority_level === 'AUTONOMOUS' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                  <Play size={10} fill="currentColor"/> {status.authority_level}
                </div>
              )}
              
              <div>
                <div className="flex items-start gap-5 mb-6">
                  <div className={`p-4 rounded-2xl shadow-sm border ${isActive ? 'bg-white border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                    {agent.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800">{agent.name}</h3>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{agent.title}</p>
                  </div>
                </div>
                <p className="text-xs font-medium text-slate-600 leading-relaxed mb-8">{agent.mission}</p>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {isActive ? (
                  <>
                    <button onClick={() => { setSelectedAgent(agent); setChatHistory([{ role: 'ai', text: `Connection established. I am ${agent.name}. How may I optimize your position today?` }]); }} className="flex-1 py-3 bg-blue-600 text-white border border-blue-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md">Consult</button>
                    <button onClick={() => setTaskModalAgent(agent)} className="flex-1 py-3 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all shadow-sm">Assign Task</button>
                    <button onClick={() => deactivateAgent(agent.id)} className="p-3 bg-red-50 text-red-500 rounded-xl border border-red-100 hover:bg-red-100 transition-all"><Pause size={18}/></button>
                  </>
                ) : (
                  <button onClick={() => { setSelectedAgent(agent); setIsConfiguring(true); }} className="w-full py-4 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 hover:text-blue-600 transition-all flex items-center justify-center gap-2 shadow-sm">
                    <Plus size={14}/> Enroll to Roster
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ⚙️ Deployment Modal (Unchanged) */}
      {isConfiguring && selectedAgent && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-6 backdrop-blur-sm bg-slate-900/60 animate-in fade-in duration-300">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-[3.5rem] max-w-lg w-full p-10 relative overflow-hidden">
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-50 blur-[60px] pointer-events-none"></div>
            <div className="relative z-10">
              <h2 className="text-2xl font-black text-slate-800 mb-2">Deploy {selectedAgent.name}</h2>
              <p className="text-xs text-slate-500 mb-8">Select the autonomy level for this intelligence unit.</p>
              
              <div className="space-y-4 mb-10">
                {[
                  { id: 'ADVISORY', desc: 'Provides analysis. Requires manual approval for all actions.' },
                  { id: 'SEMI', desc: 'Can stage transactions. Requires 1-tap approval.' },
                  { id: 'AUTONOMOUS', desc: 'Full authority to execute strategy on GCP without asking.' }
                ].map((lvl) => (
                  <div key={lvl.id} onClick={() => setAuthorityLevel(lvl.id)} className={`p-5 rounded-3xl border cursor-pointer transition-all ${authorityLevel === lvl.id ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}>
                    <span className="text-xs font-black uppercase tracking-widest text-slate-800 block mb-1">{lvl.id} Authority</span>
                    <span className="text-[10px] text-slate-500">{lvl.desc}</span>
                  </div>
                ))}
              </div>
              <button onClick={deployAgent} className="w-full py-6 bg-blue-600 text-white border border-blue-700 rounded-[2rem] font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg hover:bg-blue-700 transition-colors">Authorize Deployment <Play size={14} fill="currentColor"/></button>
              <button onClick={() => setIsConfiguring(false)} className="w-full mt-4 text-[10px] font-black text-slate-500 uppercase hover:text-slate-800 transition-colors">Cancel Protocol</button>
            </div>
          </div>
        </div>
      )}

      {/* 🎯 Assign Task Modal */}
      {taskModalAgent && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-6 backdrop-blur-sm bg-slate-900/60 animate-in fade-in duration-300">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-[3.5rem] max-w-lg w-full p-10 relative">
            <h2 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-2"><Target size={20} className="text-blue-600"/> Assign Directive</h2>
            <p className="text-xs text-slate-500 mb-8">Dispatch {taskModalAgent.name} to execute operations on GCP.</p>
            
            <form onSubmit={handleAssignTask}>
              <textarea 
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                placeholder="e.g., Analyze the impact of new Swiss banking regulations and adjust my portfolio."
                className="w-full h-32 bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white transition-colors resize-none mb-6 shadow-inner"
                autoFocus
              />
              <button type="submit" disabled={!taskInput.trim()} className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg hover:bg-blue-700 transition-colors disabled:opacity-50">Dispatch Intelligence <Globe size={14}/></button>
              <button type="button" onClick={() => setTaskModalAgent(null)} className="w-full mt-4 text-[10px] font-black text-slate-500 uppercase hover:text-slate-800 transition-colors">Cancel</button>
            </form>
          </div>
        </div>
      )}

      {/* 💬 Agent Chat Terminal & Execution Tracker */}
      {!isConfiguring && !taskModalAgent && selectedAgent && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6 backdrop-blur-sm bg-slate-900/60 animate-in fade-in duration-300">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-[3rem] max-w-3xl w-full h-[85vh] flex flex-col overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500"></div>
            
            <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 backdrop-blur-md z-10">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-sm">{selectedAgent.icon}</div> 
                <div>
                  <span className="font-black text-sm text-slate-800 block">{selectedAgent.name}</span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-1">
                    Secure Neural Link Established <CheckCircle2 size={10}/>
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedAgent(null)} className="text-slate-400 hover:text-slate-800 bg-white p-2 rounded-full border border-slate-200 shadow-sm"><X size={20}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar">
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'system' ? (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-black uppercase tracking-widest w-full flex items-center gap-2 shadow-sm">
                      <CodeSquare size={16} /> {msg.text}
                    </div>
                  ) : (
                    <div className={`p-5 rounded-3xl text-sm max-w-[85%] leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white shadow-md rounded-tr-sm' : 'bg-slate-100 border border-slate-200 text-slate-800 rounded-tl-sm'}`}>
                      {msg.text}
                    </div>
                  )}
                </div>
              ))}
              
              {/* 🔥 THE TRANSPARENT EXECUTION TRACKER UI */}
              {executionPlan.isActive && (
                <div className="w-full max-w-[85%] bg-[#111111] text-slate-200 rounded-[2rem] p-6 shadow-2xl border border-slate-800 animate-in slide-in-from-bottom-4">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="text-sm font-black text-white">{executionPlan.title}</h4>
                    <button className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full text-[10px] border border-slate-700 font-bold transition-colors">
                      Update
                    </button>
                  </div>
                  
                  <div className="space-y-4 mb-8">
                    {executionPlan.steps.map(step => (
                      <div key={step.id} className="flex items-center gap-4">
                        {step.status === 'completed' && <CheckCircle2 size={18} className="text-white shrink-0"/>}
                        {step.status === 'active' && <Loader2 size={18} className="text-blue-500 animate-spin shrink-0"/>}
                        {step.status === 'pending' && <Circle size={18} className="text-slate-600 shrink-0"/>}
                        
                        <span className={`text-sm font-medium ${step.status === 'pending' ? 'text-slate-500' : 'text-slate-200'}`}>
                          {step.text}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-800/50">
                    <p className="text-sm text-slate-400 mb-4">{executionPlan.currentDetail}</p>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-white transition-all duration-500 ease-out" 
                          style={{ width: `${executionPlan.progressPct}%` }}
                        ></div>
                      </div>
                      <button className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center border border-slate-700 hover:bg-slate-700">
                        <Square size={10} fill="currentColor" className="text-slate-400"/>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {isAiTyping && !executionPlan.isActive && (
                <div className="flex justify-start">
                   <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 text-blue-600 text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-inner">
                     <Loader2 size={14} className="animate-spin" /> Processing Neural Request...
                   </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50/50">
              <form onSubmit={handleConsultation} className="relative flex items-center">
                <input 
                  type="text" 
                  value={userInput} 
                  onChange={(e) => setUserInput(e.target.value)} 
                  placeholder="Transmit directive in English, Français, or Kiswahili..." 
                  className="w-full bg-white border-2 border-slate-200 rounded-full py-5 pl-6 pr-16 outline-none focus:border-blue-500 transition-colors text-slate-800 placeholder:text-slate-400 shadow-sm text-sm font-medium" 
                />
                <button type="submit" disabled={!userInput.trim() || isAiTyping || executionPlan.isActive} className="absolute right-3 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50"><Send size={16}/></button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 🟢 GLOBAL NOTIFICATION LAYER */}
      {notification && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[500] animate-in slide-in-from-top-10 duration-500">
           <div className={`px-8 py-5 rounded-3xl shadow-2xl border-2 backdrop-blur-2xl flex items-center gap-4 ${notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
             <div className={`w-3 h-3 rounded-full animate-pulse ${notification.type === 'success' ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]' : 'bg-red-400 shadow-[0_0_10px_#f87171]'}`}></div>
             <p className="font-black text-[11px] uppercase tracking-[0.2em]">{notification.text}</p>
           </div>
        </div>
      )}
    </div>
  );
}