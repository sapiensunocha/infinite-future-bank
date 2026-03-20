// src/Training.jsx
import { useState, useRef, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import { 
  BrainCircuit, Play, CheckCircle2, 
  Send, Loader2, Bot, Sparkles, User, Target, ArrowLeft, X,
  Volume2, VolumeX
} from 'lucide-react';

// 🔥 IMPORT THE SEPARATED DATA
import { TRAINING_MODULES } from './data/trainingData'; 

export default function Training({ session }) {
  const [activeTab, setActiveTab] = useState('ACADEMY'); 
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // User Progress States
  const [userProfile, setUserProfile] = useState({
    financial_intelligence: 0,
    capital_readiness: 0,
    compliance_score: 0,
    completed_modules: []
  });

  // Engine & Audio States
  const [activeModule, setActiveModule] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [quizStatus, setQuizStatus] = useState(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false); // TTS Toggle

  // AI Mentor States
  const [chatHistory, setChatHistory] = useState([
    { role: 'ai', text: 'Welcome. I am your Institutional Training Mentor. How can I clarify your financial operations today?' }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatEndRef = useRef(null);

  const triggerGlobalActionNotification = (type, message) => {
    setNotification({ type, text: message });
    setTimeout(() => setNotification(null), 6000);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isAiTyping]);

  // ==========================================
  // TEXT-TO-SPEECH (TTS) ENGINE
  // ==========================================
  useEffect(() => {
    // Safety check for browser support
    if (!('speechSynthesis' in window)) return;
    
    // Stop any currently playing audio when step changes
    window.speechSynthesis.cancel();

    if (isAudioEnabled && activeModule) {
      const screen = activeModule.screens[currentStep];
      let textToRead = "";
      
      // Format text smoothly for the AI voice reader
      if (screen.type === 'statement') textToRead = screen.text;
      if (screen.type === 'explanation') textToRead = `${screen.title}... ${screen.text}`;
      if (screen.type === 'example') textToRead = `Case Study... ${screen.title}... ${screen.text}`;
      if (screen.type === 'quiz') textToRead = `Verification Required... ${screen.question}... Option 1: ${screen.options[0]}... Option 2: ${screen.options[1]}... Option 3: ${screen.options[2]}`;

      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.rate = 0.95; // Slightly slower for professional tone
      utterance.pitch = 1;
      utterance.volume = 1;
      
      // Try to use a high-quality English voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.lang.includes('en-') && (v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel')));
      if (preferredVoice) utterance.voice = preferredVoice;

      window.speechSynthesis.speak(utterance);
    }
  }, [currentStep, activeModule, isAudioEnabled]);

  // Clean up audio when module closes
  useEffect(() => {
    if (!activeModule && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      // Optional: Auto-disable audio when they close the module
      // setIsAudioEnabled(false); 
    }
  }, [activeModule]);

  // ==========================================
  // SUPABASE DATA FETCHING
  // ==========================================
  const fetchUserTrainingData = async () => {
    if (!session?.user?.id) return;
    try {
      const { data, error } = await supabase
        .from('user_training_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setUserProfile(data);
      } else {
        const { data: newProfile, error: insertError } = await supabase
          .from('user_training_profiles')
          .insert([{ user_id: session.user.id }])
          .select()
          .single();
        if (!insertError && newProfile) setUserProfile(newProfile);
      }
    } catch (err) {
      console.error("Error loading training profile", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchUserTrainingData(); }, [session?.user?.id]);

  const handleNextStep = () => {
    const currentScreen = activeModule.screens[currentStep];

    if (currentScreen.type === 'quiz') {
      if (selectedAnswer === null) return;
      if (selectedAnswer === currentScreen.answer) {
        setQuizStatus('correct');
        
        // Stop audio immediately upon correct answer
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        
        if (currentStep < activeModule.screens.length - 1) {
             setTimeout(() => {
                 setQuizStatus(null);
                 setSelectedAnswer(null);
                 setCurrentStep(prev => prev + 1);
             }, 1500);
        } else {
             setTimeout(() => completeModule(), 1500);
        }
      } else {
        setQuizStatus('incorrect');
        if (isAudioEnabled) {
            const errorUtterance = new SpeechSynthesisUtterance("Protocol Violation. Try Again.");
            window.speechSynthesis.speak(errorUtterance);
        }
        setTimeout(() => setQuizStatus(null), 2000);
      }
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const completeModule = async () => {
    if (userProfile.completed_modules.includes(activeModule.id)) {
      setActiveModule(null);
      return;
    }

    try {
      const newScore = userProfile[activeModule.metricTarget] + activeModule.points;
      const newCompleted = [...userProfile.completed_modules, activeModule.id];

      const { error } = await supabase
        .from('user_training_profiles')
        .update({
          [activeModule.metricTarget]: Math.min(100, newScore),
          completed_modules: newCompleted
        })
        .eq('user_id', session.user.id);

      if (error) throw error;

      setUserProfile(prev => ({
        ...prev,
        [activeModule.metricTarget]: Math.min(100, newScore),
        completed_modules: newCompleted
      }));

      triggerGlobalActionNotification('success', `Intelligence Protocol Completed. +${activeModule.points} Points applied.`);
    } catch (err) {
      console.error("Failed to save progress", err);
    } finally {
      setActiveModule(null);
    }
  };

  const startModule = (mod) => {
    setActiveModule(mod);
    setCurrentStep(0);
    setSelectedAnswer(null);
    setQuizStatus(null);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const newChat = [...chatHistory, { role: 'user', text: userInput }];
    setChatHistory(newChat);
    setUserInput('');
    setIsAiTyping(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const prompt = `You are the IFB Institutional Mentor. The user is asking: "${userInput}". Keep it under 2 paragraphs. Do not use markdown bolding.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      const data = await response.json();
      const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Protocol temporarily offline.";

      setChatHistory([...newChat, { role: 'ai', text: aiText.replace(/\*/g, '') }]);
    } catch (err) {
      setChatHistory([...newChat, { role: 'ai', text: "Connection to Intelligence Core interrupted." }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={32}/></div>;

  const totalAvailable = TRAINING_MODULES.length;
  const completedCount = userProfile.completed_modules.length;
  const overallProgress = totalAvailable === 0 ? 0 : Math.round((completedCount / totalAvailable) * 100);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 text-slate-800">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white border border-slate-200 p-6 rounded-[2.5rem] shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">IFB Academy</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mt-1">Institutional Intelligence Protocols</p>
        </div>
        
        <div className="flex bg-slate-100 p-2 rounded-2xl border border-slate-200 shadow-inner w-full md:w-auto overflow-x-auto no-scrollbar">
          {[
            { id: 'ACADEMY', label: 'Curriculum' },
            { id: 'AI_MENTOR', label: 'AI Mentor' }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setActiveModule(null); }}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'ACADEMY' && !activeModule && (
        <div className="space-y-8 animate-in slide-in-from-left-4">
          <div className="bg-slate-900 text-white p-8 md:p-10 rounded-[3rem] shadow-xl border border-slate-800 flex flex-col md:flex-row gap-10">
            <div className="flex-1 border-b md:border-b-0 md:border-r border-slate-700 pb-8 md:pb-0 md:pr-8">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Behavioral Analysis</h3>
              <div className="flex items-end gap-4 mb-2">
                <span className="text-6xl font-black tracking-tighter text-blue-400">{overallProgress}%</span>
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sovereign Foundation Mastered</p>
            </div>

            <div className="flex-1 space-y-6 flex flex-col justify-center">
              {[
                { label: 'Financial Intelligence', score: userProfile.financial_intelligence, color: 'bg-blue-500' },
                { label: 'Capital Readiness', score: userProfile.capital_readiness, color: 'bg-emerald-500' },
                { label: 'Compliance Index', score: userProfile.compliance_score, color: 'bg-indigo-500' }
              ].map((metric, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-300">
                    <span>{metric.label}</span>
                    <span>{metric.score}/100</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden shadow-inner">
                    <div className={`${metric.color} h-full rounded-full transition-all duration-1000`} style={{ width: `${Math.min(100, metric.score)}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TRAINING_MODULES.map((mod) => {
              const isCompleted = userProfile.completed_modules.includes(mod.id);
              return (
                <div 
                  key={mod.id} 
                  onClick={() => startModule(mod)}
                  className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-slate-300 transition-all cursor-pointer group flex flex-col justify-between min-h-[220px] relative overflow-hidden"
                >
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-blue-600 shadow-sm group-hover:bg-blue-50 transition-colors">
                        {mod.icon}
                      </div>
                      {isCompleted ? <CheckCircle2 size={18} className="text-emerald-500"/> : <Play size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors"/>}
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">{mod.track}</span>
                    <h3 className="text-lg font-black text-slate-800 leading-tight">{mod.title}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-6 relative z-10">
                    Reward: +{mod.points} PTs
                  </div>
                  {isCompleted && <div className="absolute inset-0 border-4 border-emerald-500/10 rounded-[2.5rem] pointer-events-none"></div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'ACADEMY' && activeModule && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden relative border border-slate-100 h-[600px] flex flex-col">
            
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <button onClick={() => setActiveModule(null)} className="p-2 text-slate-400 hover:text-slate-800 bg-white rounded-xl shadow-sm"><ArrowLeft size={16}/></button>
              
              <div className="flex-1 px-6 flex items-center gap-1">
                {activeModule.screens.map((_, i) => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= currentStep ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
                ))}
              </div>

              {/* 🔥 AUDIO TOGGLE BUTTON */}
              <button 
                onClick={() => setIsAudioEnabled(!isAudioEnabled)} 
                className={`p-2 rounded-xl shadow-sm transition-colors mr-2 ${isAudioEnabled ? 'bg-blue-100 text-blue-600 border border-blue-200' : 'bg-white text-slate-400 hover:text-slate-800'}`}
                title="Toggle AI Mentor Audio"
              >
                {isAudioEnabled ? <Volume2 size={16}/> : <VolumeX size={16}/>}
              </button>
              
              <button onClick={() => setActiveModule(null)} className="p-2 text-slate-400 hover:text-slate-800 bg-white rounded-xl shadow-sm"><X size={16}/></button>
            </div>
            
            <div className="flex-1 p-8 md:p-10 overflow-y-auto flex flex-col justify-center animate-in slide-in-from-right-4 duration-300" key={currentStep}>
              
              {activeModule.screens[currentStep].type === 'statement' && (
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner border border-blue-100">
                    {activeModule.icon}
                  </div>
                  <h2 className="text-3xl font-black text-slate-800 tracking-tighter leading-tight">
                    {activeModule.screens[currentStep].text}
                  </h2>
                </div>
              )}

              {activeModule.screens[currentStep].type === 'explanation' && (
                <div className="space-y-4 text-left">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-md inline-block">The Protocol</span>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">{activeModule.screens[currentStep].title}</h2>
                  <p className="text-slate-600 font-medium leading-relaxed text-sm">
                    {activeModule.screens[currentStep].text}
                  </p>
                </div>
              )}

              {activeModule.screens[currentStep].type === 'example' && (
                <div className="space-y-4 text-left p-6 bg-slate-50 border border-slate-200 rounded-3xl shadow-sm">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><Target size={12}/> Case Study</span>
                  <h2 className="text-lg font-black text-slate-800">{activeModule.screens[currentStep].title}</h2>
                  <p className="text-slate-600 font-medium leading-relaxed text-sm italic border-l-2 border-slate-300 pl-4">
                    "{activeModule.screens[currentStep].text}"
                  </p>
                </div>
              )}

              {activeModule.screens[currentStep].type === 'quiz' && (
                <div className="space-y-6 text-left">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-md inline-block">Verification Required</span>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">{activeModule.screens[currentStep].question}</h2>
                  
                  <div className="space-y-3 pt-4">
                    {activeModule.screens[currentStep].options.map((opt, i) => {
                      const isSelected = selectedAnswer === i;
                      const isCorrect = i === activeModule.screens[currentStep].answer;
                      let btnStyle = "bg-white border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50";
                      
                      if (quizStatus) {
                        if (isSelected && isCorrect) btnStyle = "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-inner ring-2 ring-emerald-500/20";
                        else if (isSelected && !isCorrect) btnStyle = "bg-red-50 border-red-500 text-red-700 shadow-inner";
                        else if (isCorrect) btnStyle = "bg-emerald-50 border-emerald-500 text-emerald-700 opacity-50";
                        else btnStyle = "bg-white border-slate-200 opacity-50";
                      } else if (isSelected) {
                        btnStyle = "bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500/20";
                      }

                      return (
                        <button 
                          key={i}
                          disabled={quizStatus !== null}
                          onClick={() => setSelectedAnswer(i)}
                          className={`w-full text-left p-4 rounded-2xl border-2 font-bold text-sm transition-all ${btnStyle}`}
                        >
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                  {quizStatus === 'incorrect' && <p className="text-xs font-black text-red-500 uppercase tracking-widest text-center animate-pulse">Protocol Violation. Try Again.</p>}
                </div>
              )}

            </div>

            <div className="p-6 border-t border-slate-100 bg-white">
              <button 
                onClick={handleNextStep}
                disabled={activeModule.screens[currentStep].type === 'quiz' && selectedAnswer === null}
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {activeModule.screens[currentStep].type === 'quiz' ? (quizStatus === 'correct' ? 'Verifying...' : 'Submit Action') : 'Acknowledge & Proceed'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: AI MENTOR */}
      {activeTab === 'AI_MENTOR' && (
        <div className="bg-white border border-slate-200 rounded-[3rem] shadow-sm overflow-hidden flex flex-col h-[600px] animate-in slide-in-from-right-4">
          
          <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 border border-blue-100 text-blue-600 rounded-full flex items-center justify-center shadow-sm">
              <BrainCircuit size={20}/>
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800">Intelligence Core</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Sparkles size={10} className="text-blue-400"/> Operational Protocol Support
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 bg-white">
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border ${msg.role === 'user' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-blue-600'}`}>
                  {msg.role === 'user' ? <User size={14}/> : <Bot size={14}/>}
                </div>
                <div className={`p-5 rounded-3xl text-sm font-medium leading-relaxed ${msg.role === 'user' ? 'bg-slate-900 text-white rounded-tr-sm shadow-md' : 'bg-slate-50 border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            
            {isAiTyping && (
              <div className="flex gap-4 max-w-[85%]">
                <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 text-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Bot size={14}/>
                </div>
                <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 text-slate-400 rounded-tl-sm shadow-sm flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-blue-500"/> Retrieving protocol...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-100">
            <form onSubmit={handleSendMessage} className="relative flex items-center">
              <input 
                type="text" 
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Query institutional protocols..." 
                className="w-full bg-white border border-slate-200 rounded-2xl py-5 pl-6 pr-16 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 transition-colors shadow-sm"
                disabled={isAiTyping}
              />
              <button 
                type="submit" 
                disabled={!userInput.trim() || isAiTyping}
                className="absolute right-2 w-12 h-12 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white rounded-xl flex items-center justify-center transition-colors shadow-md"
              >
                <Send size={18} className="ml-0.5"/>
              </button>
            </form>
          </div>
        </div>
      )}

      {notification && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[500] animate-in slide-in-from-top-10 duration-500">
           <div className={`px-8 py-5 rounded-3xl shadow-2xl border-2 backdrop-blur-2xl flex items-center gap-4 ${notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
             <div className={`w-3 h-3 rounded-full animate-pulse ${notification.type === 'success' ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]' : 'bg-red-400 shadow-[0_0_10px_#f87171]'}`}></div>
             <p className="font-black text-[11px] uppercase tracking-[0.2em]">{notification.text}</p>
           </div>
        </div>
      )}

    </div>
  );
}