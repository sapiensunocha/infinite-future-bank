// HeroBanner.jsx
// FULL UPDATED FILE — AUTOMATIC EID EXPIRATION & REAL-TIME LOCAL RISK INTELLIGENCE (VIA GCP)

import React, { useState, useEffect, useMemo } from 'react';
import { Sun, Moon, ArrowRight, Zap, Wallet, RefreshCw, Activity, AlertTriangle, Waves, Flame, ShieldAlert } from 'lucide-react';
import { supabase } from './services/supabaseClient';

// 🌙 EID MUBARAK EXCLUSIVE IMAGE (Majestic Mosque at Dusk)
const EID_IMAGE = "https://images.unsplash.com/photo-1533633310920-cc9bf1e7f9b0?auto=format&fit=crop&q=80&w=2000";

// Fallbacks just in case
const FALLBACK_BACKGROUNDS = [
  "https://images.unsplash.com/photo-1509803874385-db7c23652552?auto=format&fit=crop&q=80&w=2000", 
  "https://picsum.photos/id/1016/2000/1200", 
  "https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?auto=format&fit=crop&q=80&w=2000",
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=2000",
  "https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?auto=format&fit=crop&q=80&w=2000"
];

export default function HeroBanner({ profile, balances, transactions = [], formatCurrency, showBalances, setShowBalances, setActiveModal }) {
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState({ city: 'Global Network', temp: '--', condition: 0 });
  const [localRisk, setLocalRisk] = useState({ score: 1, colorText: 'text-yellow-400', colorBorder: 'border-yellow-400/30', topRisks: [], isLoaded: false });
  const [insight, setInsight] = useState("Synchronizing institutional telemetry and regional threat data...");
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

  // 1. SUPABASE DATABASE FETCH (WITH AUTOMATIC EID BYPASS)
  useEffect(() => {
    const fetchCelebration = async () => {
      const todayKey = `${String(time.getMonth() + 1).padStart(2, '0')}-${String(time.getDate()).padStart(2, '0')}`;
      
      if (todayKey === '03-20') {
        setCelebration("Eid Mubarak");
        setBgImage(EID_IMAGE);
        setImageError(false);
        return; 
      }

      const { data, error } = await supabase
        .from('global_celebrations')
        .select('name, image_url')
        .eq('month_day', todayKey)
        .maybeSingle();

      if (data && data.name) {
        setCelebration(data.name);
        setBgImage(data.image_url); 
        setImageError(false);
      } else {
        setImageError(true); 
      }
    };
    fetchCelebration();
  }, [time]);

  // 🌤️ 2. REAL WEATHER, LOCATION & GCP RISK INTELLIGENCE
  useEffect(() => {
    const fetchEnvironmentData = async () => {
      try {
        // A. Get User Location
        const geoRes = await fetch('https://ipapi.co/json/');
        const geoData = await geoRes.json();
        
        // B. Get Weather
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${geoData.latitude}&longitude=${geoData.longitude}&current_weather=true&temperature_unit=fahrenheit`);
        const weatherData = await weatherRes.json();
        setWeather({ city: geoData.city, temp: Math.round(weatherData.current_weather.temperature), condition: weatherData.current_weather.weathercode });

        // C. Fetch Real Disasters from PUBLIC GCP BUCKET
        const gcpUrl = 'https://storage.googleapis.com/wdc-dc-flood-vault/latest_alerts.json';
        let nearbyRisks = [];
        
        try {
          const alertsRes = await fetch(gcpUrl);
          if (alertsRes.ok) {
            const alerts = await alertsRes.json();
            // Filter risks within ~500 miles (8 degrees lat/lon) of user
            nearbyRisks = alerts.filter(a =>
                a.latitude && a.longitude &&
                Math.abs(a.latitude - geoData.latitude) < 8 &&
                Math.abs(a.longitude - geoData.longitude) < 8
            );
          }
        } catch (e) {
          console.warn("GCP Alerts file not yet available or empty.");
        }

        // Sort by most severe first
        nearbyRisks.sort((a, b) => b.severity_level - a.severity_level);

        // Extract Top 3 Unique Hazard Types
        const uniqueRisks = [];
        const seenTypes = new Set();

        for (const risk of nearbyRisks) {
            const genericType = (risk.event_type || '').toLowerCase();
            let typeCat = 'Alert';
            let Icon = AlertTriangle;

            if (genericType.includes('flood')) { typeCat = 'Flood'; Icon = Waves; }
            else if (genericType.includes('fire') || genericType.includes('wildfire')) { typeCat = 'Fire'; Icon = Flame; }
            else if (genericType.includes('earthquake')) { typeCat = 'Earthquake'; Icon = Activity; }
            else if (genericType.includes('conflict')) { typeCat = 'Conflict'; Icon = ShieldAlert; }
            else if (genericType.includes('storm')) { typeCat = 'Storm'; Icon = Zap; }

            if (!seenTypes.has(typeCat) && uniqueRisks.length < 3) {
                seenTypes.add(typeCat);
                // Convert 1-5 scale to 1-10 scale
                const level10 = Math.min(10, risk.severity_level * 2);
                uniqueRisks.push({ name: typeCat, level: level10, Icon });
            }
        }

        // Default if no risks found nearby
        if (uniqueRisks.length === 0) {
            uniqueRisks.push({ name: 'All Clear', level: 1, Icon: ShieldAlert });
        }

        const overallScore = uniqueRisks[0].level;
        let colorText = 'text-yellow-400';
        let colorBorder = 'border-yellow-400/30';

        if (overallScore >= 8) {
            colorText = 'text-red-500'; colorBorder = 'border-red-500/50';
        } else if (overallScore >= 5) {
            colorText = 'text-orange-400'; colorBorder = 'border-orange-400/50';
        }

        setLocalRisk({ score: overallScore, colorText, colorBorder, topRisks: uniqueRisks, isLoaded: true });

      } catch (err) { console.error("Environment Data Error:", err); }
    };
    fetchEnvironmentData();
  }, []);

  // 🧠 3. REAL GROK AI INSIGHT FETCH (NOW INCLUDES RISK DATA)
  useEffect(() => {
    const fetchInsight = async () => {
        setIsLoadingInsight(true);
        try {
            const res = await fetch('https://ifb-intelligence-core-382117221028.us-central1.run.app/api/network/daily-hero', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Sending localRisk allows Grok to comment on their physical safety + finances
                body: JSON.stringify({ profile, balances, celebration, weather, localRisk })
            });
            const data = await res.json();
            let cleanText = data.text.replace(/Good Morning, .*?\./g, '').replace(/Welcome back, .*?\./g, '').trim();
            setInsight(cleanText);
        } catch (err) {
            setInsight(`Institutional telemetry indicates operations are nominal. Regional threat level in ${weather.city} is assessed at ${localRisk.score}/10. Your assets remain secure.`);
        } finally { setIsLoadingInsight(false); }
    };
    if (profile && weather.temp !== '--' && localRisk.isLoaded) fetchInsight();
  }, [profile, weather.city, celebration, localRisk.isLoaded]);

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Determine final background image
  const fallbackImage = FALLBACK_BACKGROUNDS[time.getDay() % 5];
  const finalImage = (imageError || !bgImage) ? fallbackImage : bgImage;
  const isEid = celebration === "Eid Mubarak";

  return (
    <div className="relative w-full rounded-[3rem] overflow-hidden shadow-2xl mb-8 bg-slate-900 border border-white/10 animate-in fade-in zoom-in-95 duration-700">
      
      <div className="absolute inset-0 z-0 bg-slate-900">
        <img 
          src={finalImage} 
          alt={celebration} 
          className="w-full h-full object-cover opacity-80 scale-105 transition-opacity duration-1000" 
          crossOrigin="anonymous" 
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "https://picsum.photos/id/1016/2000/1200";
            setImageError(true);
          }}
        />
        <div className={`absolute inset-0 bg-gradient-to-br ${isEid ? 'from-slate-950/70 via-slate-900/40' : 'from-slate-950/50 via-slate-900/20'} to-transparent`}></div>
      </div>

      <div className="relative z-10 p-8 md:p-12 flex flex-col min-h-[420px]">
        
        {/* TOP ROW: CELEBRATION, RISK, & WEATHER */}
        <div className="flex justify-between items-start mb-auto">
          <div className="flex flex-col gap-2">
            <div className={`bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 flex items-center gap-2 w-max ${isEid ? 'shadow-lg' : ''}`}>
               <div className={`w-2 h-2 rounded-full ${isEid ? 'bg-yellow-400' : 'bg-emerald-400'} animate-pulse`}></div>
               <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{celebration}</span>
            </div>
            <p className={`text-xs font-black ${isEid ? 'text-slate-200' : 'text-slate-300'} uppercase tracking-widest pl-2 drop-shadow-md`}>
              {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          
          <div className="text-right flex items-start gap-4 hidden sm:flex">
            
            {/* 🚨 NEW: LOCAL RISK INTELLIGENCE WIDGET (FETCHES FROM GCP) */}
            {localRisk.isLoaded && (
              <div className={`flex flex-col gap-2 p-3 rounded-2xl border ${localRisk.colorBorder} bg-black/40 backdrop-blur-xl shadow-lg`}>
                <div className="flex items-center justify-between gap-4">
                   <span className="text-[9px] text-slate-300 uppercase tracking-widest font-black">{weather.city} Risk</span>
                   <span className={`text-lg font-black ${localRisk.colorText} drop-shadow-md`}>{localRisk.score}/10</span>
                </div>
                <div className="flex justify-between gap-3 mt-1 pt-2 border-t border-white/10">
                   {localRisk.topRisks.map((RiskObj, i) => (
                      <div key={i} className="flex flex-col items-center gap-1" title={RiskObj.name}>
                         <RiskObj.Icon size={14} className={localRisk.colorText} />
                         <span className={`text-[8px] font-bold ${localRisk.colorText}`}>{RiskObj.level}/10</span>
                      </div>
                   ))}
                </div>
              </div>
            )}

            {/* Weather & Time */}
            <div className="flex items-center gap-4 bg-black/40 backdrop-blur-xl p-3 rounded-2xl border border-white/10 shadow-lg h-full">
              <div>
                <p className="text-xl font-black text-white leading-none">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                <p className={`text-[9px] font-black ${isEid ? 'text-slate-300' : 'text-slate-400'} uppercase tracking-widest mt-1`}>{weather.city}</p>
              </div>
              <div className="w-px h-8 bg-white/20"></div>
              <div className="text-white font-black text-lg">{weather.temp}°</div>
            </div>

          </div>
        </div>

        {/* MIDDLE: GREETING & LINE CHART */}
        <div className="max-w-3xl my-8 mt-12">
          
          <div className="flex items-center gap-3 mb-6">
            <TimeIcon className={iconColor} size={32} />
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter drop-shadow-lg">
              {greeting}, {firstName}.
            </h1>
          </div>
          
          <div className={`flex flex-col sm:flex-row sm:items-center gap-5 mb-6 ${isEid ? 'bg-black/20' : 'bg-white/5'} backdrop-blur-md p-4 pr-6 rounded-3xl border border-white/10 w-fit shadow-2xl`}>
            <div>
              <p className={`text-[10px] font-black ${isEid ? 'text-slate-300' : 'text-slate-400'} uppercase tracking-[0.2em] mb-1 flex items-center gap-2`}>
                <Activity size={12} className="text-emerald-400"/>
                Network Velocity
              </p>
              <p className="text-base sm:text-lg font-black text-white tracking-wide drop-shadow-md">
                {parseFloat(balances?.afr_balance || 0).toFixed(2)} AFR <span className="text-slate-400 mx-2 font-medium">⇌</span> {formatCurrency(balances?.liquid_usd)}
              </p>
            </div>

            <div className="w-px h-10 bg-white/10 hidden sm:block"></div>

            <div className="flex flex-col justify-end w-32 h-10 relative group">
              <p className={`text-[8px] font-black ${isEid ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-widest absolute -top-1 right-0 transition-colors group-hover:text-emerald-400`}>{recentTxCount} Tx Trajectory</p>
              
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
            <div className={`flex items-center gap-3 ${isEid ? 'text-blue-300' : 'text-blue-400'} font-bold animate-pulse mt-4 ${isEid ? 'bg-black/20 w-fit px-4 py-2 rounded-full backdrop-blur-sm' : ''}`}>
               <RefreshCw size={18} className="animate-spin" /> <span className="text-sm">Consulting Network Intelligence...</span>
            </div>
          ) : (
            <p className={`text-lg md:text-xl ${isEid ? 'text-white' : 'text-slate-200'} font-medium leading-relaxed drop-shadow-2xl border-l-2 ${isEid ? 'border-yellow-400' : 'border-blue-500'} pl-4 max-w-2xl ${isEid ? 'bg-black/10 backdrop-blur-sm p-2 rounded-r-xl' : ''}`}>
              {insight}
            </p>
          )}
        </div>

        {/* BOTTOM: REAL ACCOUNT OVERVIEW */}
        <div className={`mt-auto grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t ${isEid ? 'border-white/20' : 'border-white/10'}`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 ${isEid ? 'bg-blue-500/30 border-blue-400/40' : 'bg-blue-500/20 border-blue-500/30'} rounded-2xl flex items-center justify-center ${isEid ? 'text-blue-200' : 'text-blue-400'} border backdrop-blur-md ${isEid ? 'shadow-lg' : ''}`}><Wallet size={20}/></div>
            <div>
              <p className={`text-[9px] font-black ${isEid ? 'text-slate-300' : 'text-slate-400'} uppercase tracking-[0.2em] drop-shadow-md`}>Liquid USD</p>
              <p className="text-xl font-black text-white drop-shadow-lg">{formatCurrency(balances?.liquid_usd)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 ${isEid ? 'bg-emerald-500/30 border-emerald-400/40' : 'bg-emerald-500/20 border-emerald-500/30'} rounded-2xl flex items-center justify-center ${isEid ? 'text-emerald-200' : 'text-emerald-400'} border backdrop-blur-md ${isEid ? 'shadow-lg' : ''}`}><Zap size={20}/></div>
            <div>
              <p className={`text-[9px] font-black ${isEid ? 'text-slate-300' : 'text-slate-400'} uppercase tracking-[0.2em] drop-shadow-md`}>AFR Asset</p>
              <p className="text-xl font-black text-white drop-shadow-lg">{parseFloat(balances?.afr_balance || 0).toFixed(2)} <span className={`text-xs ${isEid ? 'text-slate-200' : 'text-slate-400'}`}>AFR</span></p>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button onClick={() => setActiveModal('ADVISOR')} className={`px-6 py-3 ${isEid ? 'bg-white/90 hover:bg-white shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] backdrop-blur-md' : 'bg-white hover:bg-blue-50 shadow-lg hover:shadow-white/20'} text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 group`}>
              Financial Strategy <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}