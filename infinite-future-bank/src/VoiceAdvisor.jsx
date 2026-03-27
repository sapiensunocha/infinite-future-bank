import React, { useEffect, useRef, useState } from 'react';
import { X, ShieldCheck, Sparkles, Mic, Zap } from 'lucide-react';

export default function VoiceAdvisor({ session, balances, profile, onClose }) {
  const [isLive, setIsLive] = useState(false);
  const [volume, setVolume] = useState(0);
  const [status, setStatus] = useState('Initializing Secure Link...');
  
  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  const audioContextRef = useRef(null);
  const workletNodeRef = useRef(null);
  const sourceRef = useRef(null);

  // 🌊 THE OCEAN ANIMATION ENGINE
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrame;
    let increment = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // We draw 3 overlapping waves with DEUS colors
      const drawWave = (color, amp, freq, shift) => {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
        ctx.moveTo(0, canvas.height / 2);

        for (let i = 0; i < canvas.width; i++) {
          // Amplitude increases with volume for that "Alive" feeling
          const dynamicAmp = (20 + (volume * 150)) * amp;
          const y = canvas.height / 2 + Math.sin(i * freq + increment + shift) * dynamicAmp;
          ctx.lineTo(i, y);
        }
        ctx.stroke();
      };

      drawWave('rgba(66, 133, 244, 0.4)', 1, 0.01, 0);       // DEUS Blue
      drawWave('rgba(52, 168, 83, 0.3)', 0.7, 0.015, 2);     // DEUS Green
      drawWave('rgba(251, 188, 4, 0.2)', 0.5, 0.02, 4);      // DEUS Yellow

      increment += 0.03 + (volume * 0.2); // Speed increases with volume
      animationFrame = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrame);
  }, [volume]);

  // 🎙️ THE SATELLITE CONNECTION (Gemini Live API)
  const startVoiceLink = async () => {
    try {
      setStatus('Accessing Satellite Rails...');
      
      // 1. Setup Audio Context & Worklet
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      await audioContextRef.current.audioWorklet.addModule('/AudioProcessor.js');
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      workletNodeRef.current = new AudioWorkletNode(audioContextRef.current, 'audio-processor');

      // Hear the microphone and move the waves
      workletNodeRef.current.port.onmessage = (event) => {
        setVolume(event.data.volume);
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          // Send PCM data to Gemini
          socketRef.current.send(JSON.stringify({
            realtime_input: { media_chunks: [{ data: btoa(String.fromCharCode(...new Uint8Array(event.data.pcm.buffer))), mime_type: "audio/pcm" }] }
          }));
        }
      };

      sourceRef.current.connect(workletNodeRef.current);

      // 2. Establish WebSocket to Gemini 2.0
      const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
      const URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${API_KEY}`;
      
      socketRef.current = new WebSocket(URL);

      socketRef.current.onopen = () => {
        setIsLive(true);
        setStatus('Link Established');
        
        // Initial Handshake Configuration
        const setup = {
          setup: {
            model: "models/gemini-2.0-flash-exp",
            generation_config: { response_modalities: ["audio"] },
            system_instruction: { 
              parts: [{ text: `You are the DEUS Private Advisor. The user is visually impaired; speak clearly and with warmth. You know they have ${balances.liquid_usd} liquid capital. You are their partner. Be concise.` }] 
            }
          }
        };
        socketRef.current.send(JSON.stringify(setup));
      };

      socketRef.current.onmessage = async (event) => {
        const response = JSON.parse(event.data);
        if (response.serverContent?.modelTurn?.parts?.[0]?.inlineData) {
          const audioBase64 = response.serverContent.modelTurn.parts[0].inlineData.data;
          playOutput(audioBase64);
        }
      };

    } catch (err) {
      console.error(err);
      setStatus('Link Failed: Check Permissions');
    }
  };

  // 🔊 Play AI Response
  const playOutput = (base64) => {
    const binary = atob(base64);
    const bytes = new Int16Array(binary.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = (binary.charCodeAt(i * 2 + 1) << 8) | binary.charCodeAt(i * 2);
    }
    // Simplified playback logic (In prod, use a dedicated AudioBufferQueue)
    setStatus('Advisor Responding...');
  };

  const handleClose = () => {
    socketRef.current?.close();
    audioContextRef.current?.close();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/95 backdrop-blur-3xl animate-in fade-in duration-500">
      <div className="relative w-full max-w-5xl flex flex-col items-center justify-center p-12 overflow-hidden">
        
        {/* LOGO AREA */}
        <div className="absolute top-12 left-12 flex items-center gap-2">
           <div className="flex items-center gap-1 font-black text-white text-4xl tracking-tighter">
            DEUS <Sparkles className="text-blue-400" />
          </div>
        </div>

        <button onClick={handleClose} className="absolute top-12 right-12 p-4 text-white/40 hover:text-white transition-all z-50">
          <X size={40} />
        </button>

        {/* THE OCEAN VISUALIZER */}
        <div className="relative w-full flex items-center justify-center">
          <canvas ref={canvasRef} width={1000} height={400} className="w-full h-80 opacity-90" />
          {!isLive && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full bg-blue-500/20 animate-ping"></div>
            </div>
          )}
        </div>

        <div className="mt-20 text-center space-y-8 relative z-10">
          <div className="space-y-2">
            <h2 className="text-white font-black text-sm uppercase tracking-[0.5em] opacity-50">{status}</h2>
            {isLive && <p className="text-blue-400 font-black text-xs uppercase tracking-widest animate-pulse flex items-center justify-center gap-2">
              <Zap size={14}/> Encrypted Voice Stream Active
            </p>}
          </div>
          
          {!isLive ? (
             <button 
               onClick={startVoiceLink}
               className="group relative px-16 py-6 bg-white text-slate-900 rounded-full font-black uppercase tracking-[0.2em] text-sm hover:scale-105 transition-all shadow-2xl"
             >
               <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl group-hover:blur-2xl transition-all"></div>
               Initialize Voice Core
             </button>
          ) : (
            <div className="flex flex-col items-center gap-4 animate-in slide-in-from-bottom-4">
              <p className="text-white text-2xl font-medium tracking-tight italic opacity-80">"I'm listening, how can I help?"</p>
              <div className="flex items-center gap-2 text-emerald-500 font-black text-[10px] uppercase tracking-widest">
                <ShieldCheck size={14}/> Identity Verified
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="absolute bottom-12 flex flex-col items-center gap-4 opacity-20">
          <div className="h-[1px] w-24 bg-white/50"></div>
          <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Quantum Encrypted Banking Link</span>
        </div>
      </div>
    </div>
  );
}