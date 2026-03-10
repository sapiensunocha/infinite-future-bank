import React, { useState, useEffect, useMemo } from 'react';
import { Cloud, CloudRain, Sun, Moon, MapPin, Eye, EyeOff, ArrowRight, Zap, Wallet, RefreshCw, Activity } from 'lucide-react';

// 🗓️ EXPANDED GLOBAL CELEBRATION REGISTRY (UN & Global Days)
const CELEBRATIONS = {
  "01-01": "New Year's Day", "01-24": "International Day of Education", "02-14": "Valentine's Day", 
  "02-20": "World Day of Social Justice", "03-08": "International Women's Day", "03-20": "International Day of Happiness", 
  "03-22": "World Water Day", "04-22": "Earth Day", "05-01": "International Labour Day", 
  "05-03": "World Press Freedom Day", "06-05": "World Environment Day", "06-08": "World Oceans Day", 
  "07-18": "Nelson Mandela International Day", "08-12": "International Youth Day", "09-21": "International Day of Peace", 
  "10-24": "United Nations Day", "11-20": "World Children's Day", "12-10": "Human Rights Day", 
  "12-25": "Christmas Day", "12-31": "New Year's Eve"
};

export default function HeroBanner({ profile, balances, transactions = [], formatCurrency, showBalances, setShowBalances, setActiveModal }) {
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState({ city: 'Global Network', temp: '--', condition: 0 });
  const [insight, setInsight] = useState("Securing your financial perimeter...");
  const [isLoadingInsight, setIsLoadingInsight] = useState(true);
  const [bgImage, setBgImage] = useState("");

  const totalNetWorth = (balances?.liquid_usd || 0) + (balances?.alpha_equity_usd || 0) + (balances?.mysafe_digital_usd || 0);
  const todayKey = `${String(time.getMonth() + 1).padStart(2, '0')}-${String(time.getDate()).padStart(2, '0')}`;
  const celebration = CELEBRATIONS[todayKey] || "Global Institutional Growth Day";

  // Time-based Greetings & Icons
  const hour = time.getHours();
  let greeting = "Good Evening";
  let TimeIcon = Moon;
  let iconColor = "text-yellow-200";

  if (hour >= 5 && hour < 12) {
    greeting = "Good Morning";
    TimeIcon = Sun;
    iconColor = "text-yellow-400";
  } else if (hour >= 12 && hour < 18) {
    greeting = "Good Afternoon";
    TimeIcon = Sun;
    iconColor = "text-yellow-500";
  }

  // 7-Day Histogram Logic
  const histogramData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    const counts = last7Days.map(dateStr => 
      transactions.filter(t => t.created_at?.startsWith(dateStr)).length
    );
    
    const maxCount = Math.max(...counts, 1); // Avoid division by zero
    return counts.map(count => (count / maxCount) * 100);
  }, [transactions]);

  const recentTxCount = transactions.slice(0, 5).length;

  // 1. DYNAMIC THEMATIC IMAGE ENGINE
  useEffect(() => {
    // Unsplash Source was shut down, so we use a generative AI endpoint for perfectly themed images
    const prompt = encodeURIComponent(`Cinematic dark minimal abstract background representing ${celebration}`);
    setBgImage(`https://image.pollinations.ai/prompt/${prompt}?width=1600&height=900&nologo=true&dark=true`);
  }, [celebration]);

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

  // 🧠 3. REAL GROK AI INSIGHT FETCH
  useEffect(() => {
    const fetchInsight = async () => {
        setIsLoadingInsight(true);
        try {
            const res = await fetch('https://ifb-intelligence-core-382117221028.us-central1.run.app/api/network/daily-hero', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profile, balances, celebration, weather })
            });
            const data = await res.json();
            setInsight(data.text);
        } catch (err) {
            setInsight(`Your safety net is perfectly secure and your accounts are thriving today.`);
        } finally { setIsLoadingInsight(false); }
    };
    if (profile && weather.temp !== '--') fetchInsight();
  }, [profile, weather.city]);

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full rounded-[3rem] overflow-hidden shadow-2xl mb-8 bg-slate-900 border border-white/10 animate-in fade-in zoom-in-95 duration-700">
      
      {/* 🖼️ REAL DYNAMIC BACKGROUND */}
      <div className="absolute inset-0 z-0">
        <img src={bgImage} alt={celebration} className="w-full h-full object-cover opacity-40 scale-105 transition-opacity duration-1000" crossOrigin="anonymous" />
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
            <p className="text-xs font-black text-slate-300 uppercase tracking-widest pl-2 drop-shadow-md">
              {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          
          <div className="text-right flex items-center gap-4 bg-black/30 backdrop-blur-xl p-3 rounded-2xl border border-white/10 shadow-lg">
            <div>
              <p className="text-xl font-black text-white leading-none">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{weather.city}</p>
            </div>
            <div className="w-px h-8 bg-white/20"></div>
            <div className="text-white font-black text-lg">{weather.temp}°</div>
          </div>
        </div>

        {/* MIDDLE: GREETING, HEALTH LINE & HISTOGRAM */}
        <div className="max-w-3xl my-8">
          <div className="flex items-center gap-3 mb-2">
            <TimeIcon className={iconColor} size={32} />
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter drop-shadow-lg">
              {greeting}, {profile?.full_name?.split(' ')[0]}.
            </h1>
          </div>
          
          {/* Account Health Line & Histogram */}
          <div className="flex items-end gap-6 mb-6">
            <p className="text-sm font-black text-slate-300 uppercase tracking-widest bg-white/5 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/10 inline-block">
              <Activity size={14} className="inline mr-2 text-emerald-400" />
              Health: {parseFloat(balances?.afr_balance || 0).toFixed(2)} AFR ⇌ {formatCurrency(balances?.liquid_usd)} • {recentTxCount} Recent Activities
            </p>
            
            {/* 7-Day Transparent Histogram */}
            <div className="flex items-end gap-1.5 h-8 opacity-70" title="Last 7 Days Activity">
              {histogramData.map((heightPercent, idx) => (
                <div key={idx} className="w-2 bg-white/40 rounded-t-sm transition-all hover:bg-white/80" style={{ height: `${Math.max(heightPercent, 15)}%` }}></div>
              ))}
            </div>
          </div>

          {isLoadingInsight ? (
            <div className="flex items-center gap-3 text-blue-400 font-bold animate-pulse mt-4">
               <RefreshCw size={18} className="animate-spin" /> <span>Consulting Network Intelligence...</span>
            </div>
          ) : (
            <p className="text-lg md:text-xl text-slate-200 font-medium leading-relaxed drop-shadow-xl border-l-2 border-blue-500 pl-4">
              {insight}
            </p>
          )}
        </div>

        {/* BOTTOM: REAL ACCOUNT OVERVIEW */}
        <div className="mt-auto grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/30 backdrop-blur-md"><Wallet size={20}/></div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Liquid USD</p>
              <p className="text-xl font-black text-white">{formatCurrency(balances?.liquid_usd)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/30 backdrop-blur-md"><Zap size={20}/></div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">AFR Asset</p>
              <p className="text-xl font-black text-white">{parseFloat(balances?.afr_balance || 0).toFixed(2)} <span className="text-xs text-slate-400">AFR</span></p>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button onClick={() => setActiveModal('ADVISOR')} className="px-6 py-3 bg-white text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 transition-all shadow-lg hover:shadow-white/20 flex items-center gap-2 group">
              Financial Strategy <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}