import React, { useState, useEffect, useMemo } from 'react';
import { Sun, Moon, ArrowRight, Zap, Wallet, RefreshCw, Activity, MapPin } from 'lucide-react';
import { supabase } from './services/supabaseClient';

// 🏙️ PURE, BEAUTIFUL LIGHT-THEME IMAGES (No artificial darkening/lightening)
const FALLBACK_BACKGROUNDS = [
  "https://images.unsplash.com/photo-1600607686527-6fb886090705?q=80&w=2000&auto=format&fit=crop", // Beautiful bright glass architecture
  "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2000&auto=format&fit=crop", // Bright airy corporate interior
  "https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=2000&auto=format&fit=crop", // Luxury bright lounge
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2000&auto=format&fit=crop", // Beautiful bright morning coast
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2000&auto=format&fit=crop"  // Luxury minimal estate daylight
];

export default function HeroBanner({ profile, balances, transactions = [], formatCurrency, showBalances, setShowBalances, setActiveModal }) {
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState({ city: 'Global Network', temp: '--', condition: 0 });
  const [insight, setInsight] = useState("Synchronizing institutional telemetry...");
  const [isLoadingInsight, setIsLoadingInsight] = useState(true);
  
  const [celebration, setCelebration] = useState("Global Institutional Growth Day");
  const [bgImage, setBgImage] = useState("");
  const [imageError, setImageError] = useState(false);

  const firstName = profile?.full_name?.split(' ')[0] || 'Client';

  // 🕒 REAL-TIME CLOCK (Updates every second for accurate flip animations)
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Time-based Greetings
  const hour = time.getHours();
  let greeting = "Good Evening";
  let TimeIcon = Moon;
  let iconColor = "text-indigo-600"; 

  if (hour >= 5 && hour < 12) {
    greeting = "Good Morning";
    TimeIcon = Sun;
    iconColor = "text-orange-500";
  } else if (hour >= 12 && hour < 18) {
    greeting = "Good Afternoon";
    TimeIcon = Sun;
    iconColor = "text-amber-600";
  }

  // 📈 7-DAY LINE CHART GENERATOR
  const { sparklinePoints, sparklineFill, recentTxCount } = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });
    const counts = last7Days.map(dateStr => transactions.filter(t => t.created_at?.startsWith(dateStr)).length);
    const maxCount = Math.max(...counts, 2);
    const points = counts.map((count, index) => {
      const x = (index / 6) * 100;
      const y = 30 - ((count / maxCount) * 30);
      return `${x},${y}`;
    });
    const pointsStr = points.join(' ');
    return {
      sparklinePoints: pointsStr,
      sparklineFill: `0,30 ${pointsStr} 100,30`,
      recentTxCount: transactions.slice(0, 5).length
    };
  }, [transactions]);

  // 1. CELEBRATION FETCH
  useEffect(() => {
    const fetchCelebration = async () => {
      const todayKey = `${String(time.getMonth() + 1).padStart(2, '0')}-${String(time.getDate()).padStart(2, '0')}`;
      const { data } = await supabase.from('global_celebrations').select('name, image_url').eq('month_day', todayKey).maybeSingle();
      if (data) { setCelebration(data.name); setBgImage(data.image_url); setImageError(false); } 
      else { setImageError(true); }
    };
    fetchCelebration();
  }, [time.getDate()]); 

  // 🌤️ 2. WEATHER FETCH
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const geoRes = await fetch('https://ipapi.co/json/');
        const geoData = await geoRes.json();
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${geoData.latitude}&longitude=${geoData.longitude}&current_weather=true&temperature_unit=fahrenheit`);
        const weatherData = await weatherRes.json();
        setWeather({ city: geoData.city, temp: Math.round(weatherData.current_weather.temperature), condition: weatherData.current_weather.weathercode });
      } catch (err) { console.error(err); }
    };
    fetchWeather();
  }, []);

  // 🧠 3. HIGHLY CONTEXTUAL AI INSIGHT FETCH
  useEffect(() => {
    const fetchInsight = async () => {
        setIsLoadingInsight(true);
        try {
            // Strict prompt to force the AI to combine reality + friendliness
            const contextualPrompt = `You are a sophisticated, friendly, and highly intelligent digital private banker for ${firstName}. 
            Right now it is ${time.toLocaleTimeString()} in ${weather.city}, and the temperature is ${weather.temp} degrees. 
            Today is ${celebration}. The client's main digital wealth token (AFR) is currently at ${parseFloat(balances?.afr_balance || 0).toFixed(2)}. 
            Write a 2-sentence greeting that dynamically weaves all these elements together naturally. Make it sound human, encouraging, and tailored exactly to this moment. Do NOT use placeholders.`;

            const res = await fetch('https://ifb-intelligence-core-382117221028.us-central1.run.app/api/network/daily-hero', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  profile, 
                  balances, 
                  celebration, 
                  weather,
                  system_prompt: contextualPrompt
                })
            });
            
            const data = await res.json();
            let cleanText = data.text.replace(/Here is your greeting:/i, '').replace(/Good Morning,/i, '').trim();
            setInsight(cleanText);
        } catch (err) {
            setInsight(`Happy ${celebration}, ${firstName}. The weather in ${weather.city} is looking good, and your AFR assets are securely compounding in the background.`);
        } finally { setIsLoadingInsight(false); }
    };
    
    if (profile && weather.temp !== '--') {
      fetchInsight();
    }
  }, [profile, weather.city, celebration, balances?.afr_balance]);

  const fallbackImage = FALLBACK_BACKGROUNDS[time.getDay() % 5];
  const finalImage = (imageError || !bgImage) ? fallbackImage : bgImage;

  return (
    <div className="relative w-full rounded-[3rem] overflow-hidden shadow-sm mb-8 bg-slate-100 border border-slate-200 animate-in fade-in zoom-in-95 duration-700">
      
      {/* BEAUTIFUL RAW BACKGROUND LAYER (No white wash overlay) */}
      <div className="absolute inset-0 z-0">
        <img 
          src={finalImage} 
          alt={celebration} 
          className="w-full h-full object-cover scale-105" 
          crossOrigin="anonymous" 
          onError={() => setImageError(true)}
        />
        {/* A barely-there gradient only at the very top/bottom just to ensure the edges don't clash with the main app body */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-white/20 pointer-events-none"></div>
      </div>

      <div className="relative z-10 p-6 md:p-10 flex flex-col min-h-[460px]">
        
        {/* TOP ROW: CELEBRATION & REAL-TIME FLIP CLOCK */}
        <div className="flex justify-between items-start mb-auto gap-4">
          
          <div className="flex flex-col gap-2">
            <div className="bg-white/60 backdrop-blur-2xl px-5 py-2.5 rounded-full border border-white/50 flex items-center gap-2 w-max shadow-lg">
               <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_#3b82f6]"></div>
               <span className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">{celebration}</span>
            </div>
            
            <div className="overflow-hidden h-6 pl-3">
              <p key={time.getDate()} className="text-xs font-black text-slate-800 drop-shadow-[0_2px_4px_rgba(255,255,255,0.8)] uppercase tracking-widest animate-in slide-in-from-top-full duration-500">
                {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          
          {/* APPLE STYLE FLIP CLOCK (Glassmorphic) */}
          <div className="text-right flex items-center gap-4 bg-white/60 backdrop-blur-2xl p-4 px-6 rounded-[1.5rem] border border-white/60 shadow-xl active:scale-95 transition-transform cursor-pointer touch-manipulation">
            <div className="flex flex-col items-end">
              <div className="overflow-hidden h-7">
                <p key={time.getMinutes()} className="text-2xl font-black text-slate-900 leading-none animate-in slide-in-from-top-full duration-500 ease-out">
                  {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1 flex items-center justify-end gap-1">
                <MapPin size={10} className="text-blue-600"/> {weather.city}
              </p>
            </div>
            <div className="w-px h-8 bg-slate-300"></div>
            <div className="text-slate-900 font-black text-3xl tracking-tighter">{weather.temp}°</div>
          </div>
        </div>

        {/* MIDDLE: GREETING & INSIGHTS (Wrapped in frosted glass for perfect readability over the raw photo) */}
        <div className="max-w-3xl my-8 bg-white/40 backdrop-blur-2xl border border-white/60 p-8 rounded-[2.5rem] shadow-2xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-white">
              <TimeIcon className={iconColor} size={32} />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">
              {greeting}, {firstName}.
            </h1>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 mb-6 bg-white/60 backdrop-blur-xl p-5 rounded-[2rem] border border-white/80 w-fit shadow-md hover:shadow-lg transition-all duration-500 group touch-manipulation">
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
                <Activity size={12} className="text-blue-600"/>
                Network Velocity
              </p>
              <p className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                {parseFloat(balances?.afr_balance || 0).toFixed(2)} AFR <span className="text-slate-400 mx-2 font-light">|</span> {formatCurrency(balances?.liquid_usd)}
              </p>
            </div>

            <div className="w-px h-10 bg-slate-300 hidden sm:block"></div>

            <div className="flex flex-col justify-end w-32 h-10 relative">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest absolute -top-1 right-0">{recentTxCount} Tx Trajectory</p>
              <div className="absolute bottom-0 w-full h-8 opacity-70 group-hover:opacity-100 transition-opacity">
                <svg viewBox="0 0 100 30" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3"/>
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <polygon points={sparklineFill} fill="url(#lineGrad)" />
                  <polyline points={sparklinePoints} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>

          {isLoadingInsight ? (
            <div className="flex items-center gap-3 text-blue-600 font-bold animate-pulse mt-4">
               <RefreshCw size={18} className="animate-spin" /> <span className="text-xs uppercase tracking-widest">Consulting DEUS Engine...</span>
            </div>
          ) : (
            <p className="text-lg md:text-xl text-slate-800 font-medium leading-snug border-l-4 border-blue-500 pl-6 max-w-2xl animate-in fade-in slide-in-from-left-4 duration-1000">
              {insight}
            </p>
          )}
        </div>

        {/* BOTTOM: ACCOUNT OVERVIEW & ACTION BUTTON (Glassmorphic Pills) */}
        <div className="mt-auto flex flex-col md:flex-row justify-between items-end gap-6 pt-4">
          
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="flex items-center gap-4 bg-white/60 backdrop-blur-2xl border border-white/60 p-4 pr-8 rounded-[2rem] shadow-xl group cursor-pointer active:scale-95 transition-all touch-manipulation">
              <div className="w-12 h-12 bg-blue-50/80 rounded-2xl flex items-center justify-center text-blue-600 border border-blue-100 group-hover:scale-105 transition-transform"><Wallet size={20}/></div>
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Liquid USD</p>
                <p className="text-xl font-black text-slate-900 tracking-tight">{formatCurrency(balances?.liquid_usd)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 bg-white/60 backdrop-blur-2xl border border-white/60 p-4 pr-8 rounded-[2rem] shadow-xl group cursor-pointer active:scale-95 transition-all touch-manipulation">
              <div className="w-12 h-12 bg-emerald-50/80 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100 group-hover:scale-105 transition-transform"><Zap size={20}/></div>
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">AFR Asset</p>
                <p className="text-xl font-black text-slate-900 tracking-tight">{parseFloat(balances?.afr_balance || 0).toFixed(2)} <span className="text-sm text-slate-500">AFR</span></p>
              </div>
            </div>
          </div>

          <div className="w-full md:w-auto">
            <button 
              onClick={() => setActiveModal('ADVISOR')} 
              className="w-full md:w-auto px-10 py-6 bg-slate-900/90 backdrop-blur-xl border border-slate-700 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] hover:bg-blue-600 active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-3 group touch-manipulation"
            >
              Strategy Hub <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}