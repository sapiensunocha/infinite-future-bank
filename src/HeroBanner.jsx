// HeroBanner.jsx
// RESTORED DESIGN + CLICKABLE RISK DETAILS + CORS/GCP READY

import React, { useState, useEffect, useMemo } from 'react';
import { Sun, Moon, ArrowRight, Zap, Wallet, RefreshCw, Activity, AlertTriangle, Waves, Flame, ShieldAlert, ChevronDown } from 'lucide-react';
import { supabase } from './services/supabaseClient';

// 🌟 REPLACED WITH A BEAUTIFUL, NEUTRAL, ELEGANT GOLDEN/ABSTRACT LIGHT BACKGROUND
const EID_IMAGE = "https://images.unsplash.com/photo-1548625361-ecacbd0ebf19?auto=format&fit=crop&q=80&w=2000";

const FALLBACK_BACKGROUNDS = [
  "https://images.unsplash.com/photo-1509803874385-db7c23652552?auto=format&fit=crop&q=80&w=2000", 
  "https://picsum.photos/id/1016/2000/1200", 
  "https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?auto=format&fit=crop&q=80&w=2000"
];

export default function HeroBanner({ profile, balances, transactions = [], formatCurrency, showBalances, setShowBalances, setActiveModal }) {
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState({ city: 'Global Network', temp: '--', condition: 0 });
  const [localRisk, setLocalRisk] = useState({ score: 1, colorText: 'text-yellow-400', colorBorder: 'border-yellow-400/30', topRisks: [], totalEvents: 0, isLoaded: false });
  const [showRiskDetails, setShowRiskDetails] = useState(false);
  const [insight, setInsight] = useState("Synchronizing institutional telemetry and regional threat data...");
  const [isLoadingInsight, setIsLoadingInsight] = useState(true);
  
  const [celebration, setCelebration] = useState("Global Institutional Growth Day");
  const [bgImage, setBgImage] = useState("");
  const [imageError, setImageError] = useState(false);

  const firstName = profile?.full_name?.split(' ')[0] || 'Client';

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

  const { sparklinePoints, sparklineFill, recentTxCount } = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });
    const counts = last7Days.map(dateStr => transactions.filter(t => t.created_at?.startsWith(dateStr)).length);
    const maxCount = Math.max(...counts, 2); 
    const points = counts.map((count, index) => `${(index / 6) * 100},${30 - ((count / maxCount) * 30)}`);
    const pointsStr = points.join(' ');
    
    return {
      sparklinePoints: pointsStr,
      sparklineFill: `0,30 ${pointsStr} 100,30`, 
      recentTxCount: transactions.slice(0, 5).length
    };
  }, [transactions]);

  useEffect(() => {
    const fetchCelebration = async () => {
      const todayKey = `${String(time.getMonth() + 1).padStart(2, '0')}-${String(time.getDate()).padStart(2, '0')}`;
      if (todayKey === '03-20') {
        setCelebration("Eid Mubarak");
        setBgImage(EID_IMAGE);
        setImageError(false);
        return; 
      }
      const { data } = await supabase.from('global_celebrations').select('name, image_url').eq('month_day', todayKey).maybeSingle();
      if (data && data.name) { setCelebration(data.name); setBgImage(data.image_url); setImageError(false); } 
      else { setImageError(true); }
    };
    fetchCelebration();
  }, [time]);

  // 🌤️ GCP RISK & WEATHER INTELLIGENCE
  useEffect(() => {
    const fetchEnvironmentData = async () => {
      try {
        const geoRes = await fetch('https://ipapi.co/json/');
        const geoData = await geoRes.json();
        
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${geoData.latitude}&longitude=${geoData.longitude}&current_weather=true&temperature_unit=fahrenheit`);
        const weatherData = await weatherRes.json();
        setWeather({ city: geoData.city, temp: Math.round(weatherData.current_weather.temperature), condition: weatherData.current_weather.weathercode });

        // Fetch from Public GCP Bucket
        const gcpUrl = 'https://storage.googleapis.com/wdc-dc-flood-vault/latest_alerts.json';
        let nearbyRisks = [];
        
        try {
          const alertsRes = await fetch(gcpUrl);
          if (alertsRes.ok) {
            const alerts = await alertsRes.json();
            nearbyRisks = alerts.filter(a => a.latitude && a.longitude && Math.abs(a.latitude - geoData.latitude) < 8 && Math.abs(a.longitude - geoData.longitude) < 8);
          }
        } catch (e) { console.warn("GCP Alerts file not yet available."); }

        const totalEvents = nearbyRisks.length;
        const riskCounts = {};
        const riskMaxLevels = {};

        nearbyRisks.forEach(risk => {
            const genericType = (risk.event_type || '').toLowerCase();
            let typeCat = 'Alert';
            let Icon = AlertTriangle;

            if (genericType.includes('flood')) { typeCat = 'Flood'; Icon = Waves; }
            else if (genericType.includes('fire') || genericType.includes('wildfire')) { typeCat = 'Fire'; Icon = Flame; }
            else if (genericType.includes('earthquake')) { typeCat = 'Earthquake'; Icon = Activity; }
            else if (genericType.includes('conflict')) { typeCat = 'Conflict'; Icon = ShieldAlert; }
            else if (genericType.includes('storm')) { typeCat = 'Storm'; Icon = Zap; }

            const level10 = Math.min(10, risk.severity_level * 2);
            
            if (!riskCounts[typeCat]) {
                riskCounts[typeCat] = { count: 0, Icon, name: typeCat, maxLevel: level10 };
            }
            riskCounts[typeCat].count += 1;
            if (level10 > riskCounts[typeCat].maxLevel) riskCounts[typeCat].maxLevel = level10;
        });

        // Sort to get top 3 highest threats
        const topRisks = Object.values(riskCounts)
            .sort((a, b) => b.maxLevel - a.maxLevel)
            .slice(0, 3);

        if (topRisks.length === 0) {
            topRisks.push({ name: 'All Clear', maxLevel: 1, count: 0, Icon: ShieldAlert });
        }

        const overallScore = topRisks[0].maxLevel;
        let colorText = 'text-yellow-400';
        let colorBorder = 'border-yellow-400/30';
        let bgGlow = 'bg-yellow-400/10';

        if (overallScore >= 8) {
            colorText = 'text-red-500'; colorBorder = 'border-red-500/50'; bgGlow = 'bg-red-500/10';
        } else if (overallScore >= 5) {
            colorText = 'text-orange-400'; colorBorder = 'border-orange-400/50'; bgGlow = 'bg-orange-400/10';
        }

        setLocalRisk({ score: overallScore, colorText, colorBorder, bgGlow, topRisks, totalEvents, isLoaded: true });

      } catch (err) { console.error("Environment Data Error:", err); }
    };
    fetchEnvironmentData();
  }, []);

  useEffect(() => {
    const fetchInsight = async () => {
        setIsLoadingInsight(true);
        try {
            const res = await fetch('https://ifb-intelligence-core-382117221028.us-central1.run.app/api/network/daily-hero', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
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

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fallbackImage = FALLBACK_BACKGROUNDS[time.getDay() % 5];
  const finalImage = (imageError || !bgImage) ? fallbackImage : bgImage;
  const isEid = celebration === "Eid Mubarak";

  return (
    <div className="relative w-full rounded-[3rem] overflow-hidden shadow-2xl mb-8 bg-slate-900 border border-white/10 animate-in fade-in zoom-in-95 duration-700">
      
      <div className="absolute inset-0 z-0 bg-slate-900">
        <img src={finalImage} alt={celebration} className="w-full h-full object-cover opacity-80 scale-105 transition-opacity duration-1000" crossOrigin="anonymous" onError={(e) => { e.target.onerror = null; e.target.src = "https://picsum.photos/id/1016/2000/1200"; setImageError(true); }}/>
        <div className={`absolute inset-0 bg-gradient-to-br ${isEid ? 'from-slate-950/80 via-slate-900/50' : 'from-slate-950/50 via-slate-900/20'} to-transparent`}></div>
      </div>

      <div className="relative z-10 p-8 md:p-12 flex flex-col min-h-[420px]">
        
        {/* TOP ROW: CELEBRATION & WIDGETS */}
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
          
          {/* RIGHT SIDE WIDGETS (STACKED STRATEGICALLY) */}
          <div className="flex flex-col items-end gap-3 hidden sm:flex z-20">
            
            {/* Weather & Time Box */}
            <div className="flex items-center gap-4 bg-black/40 backdrop-blur-xl p-3 rounded-2xl border border-white/10 shadow-lg">
              <div>
                <p className="text-xl font-black text-white leading-none">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 text-right">{weather.city}</p>
              </div>
              <div className="w-px h-8 bg-white/20"></div>
              <div className="text-white font-black text-lg">{weather.temp}°</div>
            </div>

            {/* Expandable Risk Widget (Directly underneath) */}
            {localRisk.isLoaded && (
              <div 
                onClick={() => setShowRiskDetails(!showRiskDetails)}
                className={`flex flex-col p-3 rounded-2xl border ${localRisk.colorBorder} bg-black/40 backdrop-blur-xl shadow-lg w-full min-w-[210px] cursor-pointer hover:bg-black/50 transition-all duration-300 overflow-hidden ${showRiskDetails ? 'max-h-64' : 'max-h-16'}`}
              >
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <ShieldAlert size={14} className={localRisk.colorText} />
                     <span className="text-[9px] text-slate-300 uppercase tracking-widest font-black">{weather.city} Risk</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <span className={`text-sm font-black ${localRisk.colorText} drop-shadow-md`}>{localRisk.score}/10</span>
                     <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${showRiskDetails ? 'rotate-180' : ''}`} />
                   </div>
                </div>

                {/* Expanded Details Section */}
                <div className={`mt-3 pt-3 border-t border-white/10 transition-opacity duration-300 ${showRiskDetails ? 'opacity-100' : 'opacity-0'}`}>
                    <p className="text-[10px] text-slate-400 font-bold mb-2 tracking-wide text-center">
                        {localRisk.totalEvents} Hazards within 500mi
                    </p>
                    <div className="flex justify-around items-end gap-2">
                       {localRisk.topRisks.map((RiskObj, i) => (
                          <div key={i} className={`flex flex-col items-center gap-1 p-2 rounded-lg ${localRisk.bgGlow} border ${localRisk.colorBorder} flex-1`} title={RiskObj.name}>
                             <RiskObj.Icon size={14} className={localRisk.colorText} />
                             <span className={`text-[10px] font-black ${localRisk.colorText}`}>{RiskObj.count > 0 ? `${RiskObj.count} ${RiskObj.name}s` : 'Clear'}</span>
                             <span className={`text-[8px] font-bold text-slate-300`}>Lvl {RiskObj.maxLevel}</span>
                          </div>
                       ))}
                    </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* MIDDLE: GREETING & CHART */}
        <div className="max-w-3xl my-8 mt-12">
          <div className="flex items-center gap-3 mb-6">
            <TimeIcon className={iconColor} size={32} />
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter drop-shadow-lg">
              {greeting}, {firstName}.
            </h1>
          </div>
          
          <div className={`flex flex-col sm:flex-row sm:items-center gap-5 mb-6 ${isEid ? 'bg-black/40' : 'bg-white/5'} backdrop-blur-md p-4 pr-6 rounded-3xl border border-white/10 w-fit shadow-2xl`}>
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
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity="0.4"/><stop offset="100%" stopColor="#34d399" stopOpacity="0"/></linearGradient>
                  </defs>
                  <polygon points={sparklineFill} fill="url(#lineGrad)" />
                  <polyline points={sparklinePoints} fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>

          {isLoadingInsight ? (
            <div className={`flex items-center gap-3 ${isEid ? 'text-yellow-300' : 'text-blue-400'} font-bold animate-pulse mt-4 ${isEid ? 'bg-black/20 w-fit px-4 py-2 rounded-full backdrop-blur-sm' : ''}`}>
               <RefreshCw size={18} className="animate-spin" /> <span className="text-sm">Consulting Network Intelligence...</span>
            </div>
          ) : (
            <p className={`text-lg md:text-xl ${isEid ? 'text-white' : 'text-slate-200'} font-medium leading-relaxed drop-shadow-2xl border-l-2 ${isEid ? 'border-yellow-400' : 'border-blue-500'} pl-4 max-w-2xl ${isEid ? 'bg-black/20 backdrop-blur-md p-3 rounded-r-xl' : ''}`}>
              {insight}
            </p>
          )}
        </div>

        {/* BOTTOM: REAL ACCOUNT OVERVIEW */}
        <div className={`mt-auto grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t ${isEid ? 'border-white/20' : 'border-white/10'}`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 ${isEid ? 'bg-yellow-500/20 border-yellow-400/40 text-yellow-300' : 'bg-blue-500/20 border-blue-500/30 text-blue-400'} rounded-2xl flex items-center justify-center border backdrop-blur-md shadow-lg`}><Wallet size={20}/></div>
            <div>
              <p className={`text-[9px] font-black ${isEid ? 'text-slate-300' : 'text-slate-400'} uppercase tracking-[0.2em] drop-shadow-md`}>Liquid USD</p>
              <p className="text-xl font-black text-white drop-shadow-lg">{formatCurrency(balances?.liquid_usd)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 ${isEid ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300' : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'} rounded-2xl flex items-center justify-center border backdrop-blur-md shadow-lg`}><Zap size={20}/></div>
            <div>
              <p className={`text-[9px] font-black ${isEid ? 'text-slate-300' : 'text-slate-400'} uppercase tracking-[0.2em] drop-shadow-md`}>AFR Asset</p>
              <p className="text-xl font-black text-white drop-shadow-lg">{parseFloat(balances?.afr_balance || 0).toFixed(2)} <span className={`text-xs ${isEid ? 'text-slate-200' : 'text-slate-400'}`}>AFR</span></p>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button onClick={() => setActiveModal('ADVISOR')} className={`px-6 py-3 ${isEid ? 'bg-white/90 hover:bg-white shadow-[0_0_20px_rgba(255,255,255,0.2)] text-slate-900' : 'bg-white hover:bg-blue-50 shadow-lg text-slate-900'} rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 group`}>
              Financial Strategy <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}