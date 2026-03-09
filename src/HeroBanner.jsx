import React, { useState, useEffect } from 'react';
import { Cloud, CloudRain, Sun, Moon, MapPin, Eye, EyeOff, ArrowRight, Zap, Wallet, RefreshCw } from 'lucide-react';

// 🗓️ THE GLOBAL CELEBRATION REGISTRY (Partial list - covers current period)
const CELEBRATIONS = {
  "01-01": "New Year's Day", "02-14": "Valentine's Day", "03-08": "International Women's Day",
  "03-17": "St. Patrick's Day", "03-20": "International Day of Happiness", "03-22": "World Water Day",
  "04-22": "Earth Day", "05-01": "International Labour Day", "06-08": "World Oceans Day",
  "12-25": "Christmas Day", "12-31": "New Year's Eve"
};

export default function HeroBanner({ profile, balances, transactions, formatCurrency, showBalances, setShowBalances, setActiveModal }) {
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState({ city: 'Global Network', temp: '--', condition: 0 });
  const [insight, setInsight] = useState("Securing your financial perimeter...");
  const [isLoadingInsight, setIsLoadingInsight] = useState(true);
  const [bgImage, setBgImage] = useState("");

  const totalNetWorth = (balances?.liquid_usd || 0) + (balances?.alpha_equity_usd || 0) + (balances?.mysafe_digital_usd || 0);
  const todayKey = `${String(time.getMonth() + 1).padStart(2, '0')}-${String(time.getDate()).padStart(2, '0')}`;
  const celebration = CELEBRATIONS[todayKey] || "Institutional Growth Day";

  // 1. DYNAMIC THEMATIC IMAGE ENGINE
  useEffect(() => {
    const searchTerm = celebration.replace(" ", "+");
    // Using Source Unsplash to get a high-quality, relevant, darker cinematic image
    setBgImage(`https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=2570&auto=format&fit=crop`); // Fallback base
    // Dynamic update based on celebration
    if (CELEBRATIONS[todayKey]) {
        setBgImage(`https://source.unsplash.com/featured/1600x900?${searchTerm},dark,minimal`);
    }
  }, [todayKey]);

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
            setInsight(`Welcome back, ${profile?.full_name?.split(' ')[0]}. Your safety net is perfectly secure and your accounts are thriving.`);
        } finally { setIsLoadingInsight(false); }
    };
    if (profile && weather.temp !== '--') fetchInsight();
  }, [profile, weather.city]);

  return (
    <div className="relative w-full rounded-[3rem] overflow-hidden shadow-2xl mb-8 bg-slate-900 border border-white/10 animate-in fade-in zoom-in-95 duration-700">
      
      {/* 🖼️ REAL DYNAMIC BACKGROUND */}
      <div className="absolute inset-0 z-0">
        <img src={bgImage} alt="Celebration" className="w-full h-full object-cover opacity-50 scale-105" />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900/40 to-transparent"></div>
      </div>

      <div className="relative z-10 p-8 md:p-12 flex flex-col min-h-[380px]">
        
        {/* TOP ROW: LOGO & WEATHER */}
        <div className="flex justify-between items-start mb-auto">
          <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
             <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{celebration}</span>
          </div>
          
          <div className="text-right flex items-center gap-4 bg-black/20 backdrop-blur-xl p-3 rounded-2xl border border-white/5">
            <div>
              <p className="text-xl font-black text-white leading-none">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{weather.city}</p>
            </div>
            <div className="w-px h-8 bg-white/10"></div>
            <div className="text-white font-black text-lg">{weather.temp}°</div>
          </div>
        </div>

        {/* MIDDLE: THE REAL AI INSIGHT */}
        <div className="max-w-2xl my-8">
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-4">
            Hello, {profile?.full_name?.split(' ')[0]}.
          </h1>
          {isLoadingInsight ? (
            <div className="flex items-center gap-3 text-blue-400 font-bold animate-pulse">
               <RefreshCw size={18} className="animate-spin" /> <span>Consulting Grok AI...</span>
            </div>
          ) : (
            <p className="text-lg md:text-xl text-slate-200 font-medium leading-relaxed drop-shadow-lg">
              {insight}
            </p>
          )}
        </div>

        {/* BOTTOM: REAL ACCOUNT OVERVIEW */}
        <div className="mt-auto grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/20"><Wallet size={20}/></div>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Liquid USD</p>
              <p className="text-xl font-black text-white">{formatCurrency(balances?.liquid_usd)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/20"><Zap size={20}/></div>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">AFR Asset</p>
              <p className="text-xl font-black text-white">{parseFloat(balances?.afr_balance || 0).toFixed(2)} <span className="text-xs text-slate-400">AFR</span></p>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button onClick={() => setActiveModal('ADVISOR')} className="px-6 py-3 bg-white text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 transition-all flex items-center gap-2 group">
              Financial Strategy <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}