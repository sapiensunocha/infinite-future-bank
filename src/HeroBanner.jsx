import React, { useState, useEffect, useMemo } from 'react';
import { Sun, Moon, ArrowRight, Zap, Wallet, RefreshCw, Activity, MapPin } from 'lucide-react';
import { supabase } from './services/supabaseClient';

// 🏙️ LIGHT-THEME PREMIUM FALLBACK IMAGES (Bright, airy, architectural)
const FALLBACK_BACKGROUNDS = [
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=2000&auto=format&fit=crop", // Bright Snow Mountains
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2000&auto=format&fit=crop", // Modern White Corporate Architecture
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2000&auto=format&fit=crop", // Bright Coastline/Morning
  "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2000&auto=format&fit=crop", // Bright Minimalist Office
  "https://images.unsplash.com/photo-1503387762-592dea58ef23?q=80&w=2000&auto=format&fit=crop"  // Light Modern Interior
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
  let iconColor = "text-indigo-600"; // Darker for light background

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
  }, [time.getDate()]); // Only refresh on new day

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
            // Clean up any weird AI conversational prefixes just in case
            let cleanText = data.text.replace(/Here is your greeting:/i, '').replace(/Good Morning,/i, '').trim();
            setInsight(cleanText);
        } catch (err) {
            // Friendly, real fallback if the API times out
            setInsight(`Happy ${celebration}, ${firstName}. The weather in ${weather.city} is looking good, and your AFR assets are securely compounding in the background.`);
        } finally { setIsLoadingInsight(false); }
    };
    
    // Only run when we have enough real data to make the prompt interesting
    if (profile && weather.temp !== '--') {
      fetchInsight();
    }
  }, [profile, weather.city, celebration, balances?.afr_balance]);

  const fallbackImage = FALLBACK_BACKGROUNDS[time.getDay() % 5];
  const finalImage = (imageError || !bgImage) ? fallbackImage : bgImage;

  return (
    <div className="relative w-full rounded-[3rem] overflow-hidden shadow-sm mb-8 bg-white border border-slate-200 animate-in fade-in zoom-in-95 duration-700">
      
      {/* LIGHT/BRIGHT BACKGROUND LAYER */}
      <div className="absolute inset-0 z-0 bg-slate-100">
        <img 
          src={finalImage} 
          alt={celebration} 
          className="w-full h-full object-cover opacity-50 scale-105 transition-opacity duration-1000 mix-blend-multiply" 
          crossOrigin="anonymous" 
          onError={() => setImageError(true)}
        />
        {/* White to transparent gradient for perfect text readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/95 via-white/80 to-transparent"></div>
      </div>

      <div className="relative z-10 p-8 md:p-12 flex flex-col min-h-[420px]">
        
        {/* TOP ROW: CELEBRATION & REAL-TIME FLIP CLOCK */}
        <div className="flex justify-between items-start mb-auto gap-4">
          <div className="flex flex-col gap-2">
            <div className="bg-white/60 backdrop-blur-xl px-4 py-2 rounded-full border border-slate-200 flex items-center gap-2 w-max shadow-sm">
               <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_#3b82f6]"></div>
               <span className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em]">{celebration}</span>
            </div>
            
            {/* DAY/DATE FLIP ANIMATION */}
            <div className="overflow-hidden h-5 pl-2">
              <p key={time.getDate()} className="text-xs font-black text-slate-500 uppercase tracking-widest animate-in slide-in-from-top-full duration-500">
                {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          
          {/* APPLE STYLE FLIP CLOCK & WEATHER (Mobile optimized touch target) */}
          <div className="text-right flex items-center gap-4 bg-white/70 backdrop-blur-2xl p-3 px-5 rounded-2xl border border-slate-200 shadow-md active:scale-95 transition-transform cursor-pointer touch-manipulation">
            <div className="flex flex-col items-end">
              {/* This specific div handles the mechanical "flip down" effect when the minute changes */}
              <div className="overflow-hidden h-7">
                <p key={time.getMinutes()} className="text-2xl font-black text-slate-900 leading-none animate-in slide-in-from-top-full duration-500 ease-out">
                  {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1 flex items-center justify-end gap-1">
                <MapPin size={10} className="text-blue-500"/> {weather.city}
              </p>
            </div>
            <div className="w-px h-8 bg-slate-300"></div>
            <div className="text-slate-900 font-black text-2xl tracking-tighter">{weather.temp}°</div>
          </div>
        </div>

        {/* MIDDLE: GREETING & SPARKLINE */}
        <div className="max-w-3xl my-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200">
              <TimeIcon className={iconColor} size={32} />
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter drop-shadow-sm">
              {greeting}, {firstName}.
            </h1>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 mb-6 bg-white/60 backdrop-blur-xl p-5 rounded-[2rem] border border-slate-200 w-fit shadow-lg hover:shadow-xl transition-all duration-500 group touch-manipulation">
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
                <Activity size={12} className="text-blue-500"/>
                Network Velocity
              </p>
              <p className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                {parseFloat(balances?.afr_balance || 0).toFixed(2)} AFR <span className="text-slate-300 mx-2 font-light">|</span> {formatCurrency(balances?.liquid_usd)}
              </p>
            </div>

            <div className="w-px h-10 bg-slate-200 hidden sm:block"></div>

            <div className="flex flex-col justify-end w-32 h-10 relative">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest absolute -top-1 right-0">{recentTxCount} Tx Trajectory</p>
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
            <p className="text-lg md:text-2xl text-slate-700 font-medium leading-snug border-l-4 border-blue-500 pl-6 max-w-2xl animate-in fade-in slide-in-from-left-4 duration-1000 drop-shadow-sm">
              {insight}
            </p>
          )}
        </div>

        {/* BOTTOM: INTERACTIVE ACCOUNT OVERVIEW (Mobile Optimized) */}
        <div className="mt-auto grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-slate-200">
          
          <div className="flex items-center gap-4 group cursor-pointer active:opacity-50 active:scale-95 transition-all touch-manipulation">
            <div className="w-14 h-14 bg-blue-50/80 backdrop-blur-md rounded-2xl flex items-center justify-center text-blue-600 border border-blue-100 shadow-sm group-hover:scale-105 transition-transform"><Wallet size={24}/></div>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Liquid USD</p>
              <p className="text-2xl font-black text-slate-900 tracking-tight">{formatCurrency(balances?.liquid_usd)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 group cursor-pointer active:opacity-50 active:scale-95 transition-all touch-manipulation">
            <div className="w-14 h-14 bg-emerald-50/80 backdrop-blur-md rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-sm group-hover:scale-105 transition-transform"><Zap size={24}/></div>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">AFR Asset</p>
              <p className="text-2xl font-black text-slate-900 tracking-tight">{parseFloat(balances?.afr_balance || 0).toFixed(2)} <span className="text-sm text-slate-400">AFR</span></p>
            </div>
          </div>

          <div className="flex items-center md:justify-end mt-4 md:mt-0">
            <button 
              onClick={() => setActiveModal('ADVISOR')} 
              className="w-full md:w-auto px-8 py-5 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-blue-600 active:scale-95 active:bg-blue-700 transition-all shadow-xl flex items-center justify-center gap-3 group touch-manipulation"
            >
              Strategy Hub <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}