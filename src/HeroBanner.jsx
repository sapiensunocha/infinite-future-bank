import React, { useState, useEffect, useMemo } from 'react';
import { Sun, Moon, ArrowRight, Zap, Wallet, RefreshCw, Activity } from 'lucide-react';
import { supabase } from './services/supabaseClient';

// 🏙️ BEAUTIFUL LIGHT SKY FALLBACK IMAGES
const FALLBACK_BACKGROUNDS = [
  "https://images.unsplash.com/photo-1513622470522-26c31154c1bb?auto=format&fit=crop&q=80&w=2000", // Bright blue sky with scattered clouds
  "https://images.unsplash.com/photo-1495932591221-efa85f12e2fb?auto=format&fit=crop&q=80&w=2000", // Beautiful clear pastel morning sky
  "https://images.unsplash.com/photo-1506260408121-e353d10b87c7?auto=format&fit=crop&q=80&w=2000", // Majestic bright sunset/sunrise sky
  "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?auto=format&fit=crop&q=80&w=2000", // Light twilight sky over mountains
  "https://images.unsplash.com/photo-1536147116438-ce266420568a?auto=format&fit=crop&q=80&w=2000"  // Clean bright sky over calm water
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

  // Time-based Greetings & Icons
  const hour = time.getHours();
  let greeting = "Good Evening";
  let TimeIcon = Moon;
  let iconColor = "text-indigo-300";

  if (hour >= 5 && hour < 12) {
    greeting = "Good Morning";
    TimeIcon = Sun;
    iconColor = "text-yellow-400";
  } else if (hour >= 12 && hour < 18) {
    greeting = "Good Afternoon";
    TimeIcon = Sun;
    iconColor = "text-amber-400";
  }

  // 📈 7-DAY LINE CHART (SPARKLINE) GENERATOR
  const { sparklinePoints, sparklineFill, recentTxCount } = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    const counts = last7Days.map(dateStr => 
      transactions.filter(t => t.created_at?.startsWith(dateStr)).length
    );
    
    const maxCount = Math.max(...counts, 2); // Prevent flatline if zero
    
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

  // 1. SUPABASE DATABASE FETCH (Links & Name)
  useEffect(() => {
    const fetchCelebration = async () => {
      const todayKey = `${String(time.getMonth() + 1).padStart(2, '0')}-${String(time.getDate()).padStart(2, '0')}`;
      
      const { data, error } = await supabase
        .from('global_celebrations')
        .select('name, image_url')
        .eq('month_day', todayKey)
        .maybeSingle();

      if (data && data.name) {
        setCelebration(data.name);
        setBgImage(data.image_url); 
        setImageError(false); // Reset error state on new fetch
      } else {
        setImageError(true); 
      }
    };
    fetchCelebration();
  }, [time]);

  // 🌤️ 2. SILENT WEATHER & LOCATION
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

  // 🧠 3. REAL GROK AI INSIGHT FETCH (With strict context prompt)
  useEffect(() => {
    const fetchInsight = async () => {
        setIsLoadingInsight(true);
        try {
            // Force the AI to be dynamic and read the actual data
            const contextualPrompt = `You are a sophisticated, friendly digital private banker for ${firstName}. Right now it is ${time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} in ${weather.city}, and the temperature is ${weather.temp} degrees. Today is ${celebration}. The client's AFR token balance is ${parseFloat(balances?.afr_balance || 0).toFixed(2)}. Write a friendly, realistic 1 to 2 sentence greeting weaving these elements together to show their wealth is growing. Do NOT use placeholders.`;

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
            // Clean up name repetitions from AI response
            let cleanText = data.text.replace(/Good Morning, .*?\./ig, '').replace(/Welcome back, .*?\./ig, '').replace(/Here is your greeting:/i, '').trim();
            setInsight(cleanText);
        } catch (err) {
            setInsight(`Happy ${celebration}, ${firstName}. The weather in ${weather.city} is looking good, and your AFR assets are securely compounding in the background.`);
        } finally { setIsLoadingInsight(false); }
    };
    if (profile && weather.temp !== '--') fetchInsight();
  }, [profile, weather.city, celebration, balances?.afr_balance]);

  // Real-time clock update (Set to 1 second for exact flip animations)
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Determine final background image
  const fallbackImage = FALLBACK_BACKGROUNDS[time.getDay() % 5];
  const finalImage = (imageError || !bgImage) ? fallbackImage : bgImage;

  return (
    <div className="relative w-full rounded-[3rem] overflow-hidden shadow-2xl mb-8 bg-slate-900 border border-white/10 animate-in fade-in zoom-in-95 duration-700">
      
      <div className="absolute inset-0 z-0 bg-slate-900">
        <img 
          src={finalImage} 
          alt={celebration} 
          className="w-full h-full object-cover opacity-40 scale-105 transition-opacity duration-1000" 
          crossOrigin="anonymous" 
          onError={() => setImageError(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900/60 to-transparent"></div>
      </div>

      <div className="relative z-10 p-8 md:p-12 flex flex-col min-h-[420px]">
        
        {/* TOP ROW: CELEBRATION, DATE & WEATHER */}
        <div className="flex justify-between items-start mb-auto">
          <div className="flex flex-col gap-2">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2 w-max">
               <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
               <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{celebration}</span>
            </div>
            
            {/* Date Flip Clock */}
            <div className="overflow-hidden h-4 pl-2">
              <p key={time.getDate()} className="text-xs font-black text-slate-300 uppercase tracking-widest drop-shadow-md animate-in slide-in-from-top-full duration-500">
                {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          
          <div className="text-right flex items-center gap-4 bg-black/30 backdrop-blur-xl p-3 rounded-2xl border border-white/10 shadow-lg hidden sm:flex">
            <div>
              {/* Apple-Style Minute Flip Animation */}
              <div className="overflow-hidden h-6">
                <p key={time.getMinutes()} className="text-xl font-black text-white leading-none animate-in slide-in-from-top-full duration-500">
                  {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{weather.city}</p>
            </div>
            <div className="w-px h-8 bg-white/20"></div>
            <div className="text-white font-black text-lg">{weather.temp}°</div>
          </div>
        </div>

        {/* MIDDLE: GREETING & LINE CHART */}
        <div className="max-w-3xl my-8">
          
          <div className="flex items-center gap-3 mb-6">
            <TimeIcon className={iconColor} size={32} />
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter drop-shadow-lg">
              {greeting}, {firstName}.
            </h1>
          </div>
          
          {/* GLASSMORPHIC HEALTH BAR & SVG LINE CHART */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 mb-6 bg-white/5 backdrop-blur-md p-4 pr-6 rounded-3xl border border-white/10 w-fit shadow-2xl">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
                <Activity size={12} className="text-emerald-400"/>
                Network Velocity
              </p>
              <p className="text-base sm:text-lg font-black text-white tracking-wide">
                {parseFloat(balances?.afr_balance || 0).toFixed(2)} AFR <span className="text-slate-400 mx-2 font-medium">⇌</span> {formatCurrency(balances?.liquid_usd)}
              </p>
            </div>

            <div className="w-px h-10 bg-white/10 hidden sm:block"></div>

            <div className="flex flex-col justify-end w-32 h-10 relative group">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest absolute -top-1 right-0 transition-colors group-hover:text-emerald-400">{recentTxCount} Tx Trajectory</p>
              
              <div className="absolute bottom-0 w-full h-6 opacity-80 group-hover:opacity-100 transition-opacity">
                <svg viewBox="0 0 100 30" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity="0.4"/>
                      <stop offset="100%" stopColor="#34d399" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <polygon points={sparklineFill} fill="url(#lineGrad)" />
                  <polyline points={sparklinePoints} fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>

          {isLoadingInsight ? (
            <div className="flex items-center gap-3 text-blue-400 font-bold animate-pulse mt-4">
               <RefreshCw size={18} className="animate-spin" /> <span>Consulting Network Intelligence...</span>
            </div>
          ) : (
            <p className="text-lg md:text-xl text-slate-200 font-medium leading-relaxed drop-shadow-xl border-l-2 border-blue-500 pl-4 max-w-2xl animate-in fade-in">
              {insight}
            </p>
          )}
        </div>

        {/* BOTTOM: REAL ACCOUNT OVERVIEW */}
        <div className="mt-auto grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-white/10">
          <div className="flex items-center gap-4 group cursor-pointer active:scale-95 touch-manipulation transition-transform">
            <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/30 backdrop-blur-md"><Wallet size={20}/></div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Liquid USD</p>
              <p className="text-xl font-black text-white">{formatCurrency(balances?.liquid_usd)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 group cursor-pointer active:scale-95 touch-manipulation transition-transform">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/30 backdrop-blur-md"><Zap size={20}/></div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">AFR Asset</p>
              <p className="text-xl font-black text-white">{parseFloat(balances?.afr_balance || 0).toFixed(2)} <span className="text-xs text-slate-400">AFR</span></p>
            </div>
          </div>

          <div className="flex items-center justify-end">
            {/* Added active:scale-95 and touch-manipulation for phone taps */}
            <button onClick={() => setActiveModal('ADVISOR')} className="px-6 py-3 bg-white text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 active:scale-95 touch-manipulation transition-all shadow-lg hover:shadow-white/20 flex items-center gap-2 group">
              Financial Strategy <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}