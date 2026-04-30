import React, { useState, useEffect, useMemo } from 'react';
import { Sun, Moon, Eye, EyeOff, ArrowRight, Zap, Wallet, RefreshCw, Activity, AlertTriangle, Waves, Flame, ShieldAlert, ChevronDown, Globe } from 'lucide-react';
import { supabase } from './services/supabaseClient';
import { useTranslation } from './i18n/useTranslation';

const EID_IMAGE = "/eid-mubarak.png";
const FALLBACK_BACKGROUNDS = [
  "https://images.unsplash.com/photo-1509803874385-db7c23652552?auto=format&fit=crop&q=80&w=2000",
  "https://picsum.photos/id/1016/2000/1200",
  "https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?auto=format&fit=crop&q=80&w=2000"
];

export default function HeroBanner({ 
  profile, 
  balances, 
  wallets = [], 
  transactions = [], 
  formatCurrency, 
  showBalances, 
  setShowBalances, 
  setActiveModal 
}) {
  const { t } = useTranslation();
  
  // ─── STATE MANAGEMENT ──────────────────────────────────────────
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState({ city: 'Global Network', temp: '--', condition: 0 });
  const [localRisk, setLocalRisk] = useState({ 
    score: 1, colorText: 'text-yellow-400', colorBorder: 'border-yellow-400/30', topRisks: [], totalEvents: 0, isLoaded: false 
  });
  const [showRiskDetails, setShowRiskDetails] = useState(false);
  const [insight, setInsight] = useState("Synchronizing institutional telemetry and regional threat data...");
  const [isLoadingInsight, setIsLoadingInsight] = useState(true);
  const [celebration, setCelebration] = useState("Global Institutional Growth Day");
  const [bgImage, setBgImage] = useState("");
  const [imageError, setImageError] = useState(false);

  // ─── DERIVED DATA ──────────────────────────────────────────────
  const firstName = profile?.full_name?.split(' ')[0] || 'Client';
  const hour = time.getHours();
  
  let greeting = t('home.goodEvening');
  let TimeIcon = Moon;
  let iconColor = "text-indigo-300";
  
  if (hour >= 5 && hour < 12) { 
    greeting = t('home.goodMorning'); 
    TimeIcon = Sun; 
    iconColor = "text-yellow-400"; 
  } else if (hour >= 12 && hour < 18) { 
    greeting = t('home.goodAfternoon'); 
    TimeIcon = Sun; 
    iconColor = "text-amber-400"; 
  }

  const activeWallets = wallets.length > 0 ? wallets : [{ currency_code: 'USD', balance: balances?.liquid_usd || 0 }];
  const primaryUsdBalance = activeWallets.find(w => w.currency_code === 'USD')?.balance || balances?.liquid_usd || 0;
  const totalPortfolio = (balances?.liquid_usd || 0) + (balances?.alpha_equity_usd || 0) + (balances?.mysafe_digital_usd || 0);

  const { sparklinePoints, sparklineFill, recentTxCount } = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); 
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });
    const counts = last7Days.map(dateStr => transactions.filter(t => t.created_at?.startsWith(dateStr)).length);
    const maxCount = Math.max(...counts, 2);
    const points = counts.map((count, index) => `${(index / 6) * 100},${30 - ((count / maxCount) * 30)}`);
    return { 
      sparklinePoints: points.join(' '), 
      sparklineFill: `0,30 ${points.join(' ')} 100,30`, 
      recentTxCount: transactions.slice(0, 5).length 
    };
  }, [transactions]);

  // ─── EFFECTS (DATA FETCHING) ───────────────────────────────────
  useEffect(() => {
    const fetchCelebration = async () => {
      const todayKey = `${String(time.getMonth() + 1).padStart(2, '0')}-${String(time.getDate()).padStart(2, '0')}`;
      if (todayKey === '03-20') { 
        setCelebration("Eid Mubarak"); setBgImage(EID_IMAGE); setImageError(false); return; 
      }
      const { data } = await supabase.from('global_celebrations').select('name, image_url').eq('month_day', todayKey).maybeSingle();
      if (data?.name) { 
        setCelebration(data.name); setBgImage(data.image_url); setImageError(false); 
      } else { 
        setImageError(true); 
      }
    };
    fetchCelebration();
  }, []);

  useEffect(() => {
    const fetchEnvironmentData = async () => {
      try {
        const geoRes = await fetch('https://ipapi.co/json/');
        const geoData = await geoRes.json();
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${geoData.latitude}&longitude=${geoData.longitude}&current_weather=true&temperature_unit=fahrenheit`);
        const weatherData = await weatherRes.json();
        setWeather({ city: geoData.city, temp: Math.round(weatherData.current_weather.temperature), condition: weatherData.current_weather.weathercode });
        
        let nearbyRisks = [];
        try {
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          const { data: alerts, error } = await supabase.from('sentinel_events').select('*').gte('event_timestamp', thirtyDaysAgo);
          if (alerts && !error) {
            nearbyRisks = alerts.filter(a => a.latitude && a.longitude && Math.abs(a.latitude - geoData.latitude) < 0.5 && Math.abs(a.longitude - geoData.longitude) < 0.5);
          }
        } catch (e) { 
          console.warn("Supabase intelligence fetch failed."); 
        }

        const totalEvents = nearbyRisks.length;
        const riskCounts = {};
        
        nearbyRisks.forEach(risk => {
          const genericType = (risk.event_type || '').toLowerCase();
          const cat = (risk.event_category || '').toLowerCase();
          let typeCat = 'Alert'; 
          let Icon = AlertTriangle;
          
          if (genericType.includes('flood') || genericType.includes('tsunami') || genericType.includes('water')) { typeCat = 'Water / Flood'; Icon = Waves; }
          else if (genericType.includes('fire') || genericType.includes('wildfire') || genericType.includes('thermal')) { typeCat = 'Fire / Thermal'; Icon = Flame; }
          else if (genericType.includes('earthquake') || genericType.includes('seismic')) { typeCat = 'Seismic'; Icon = Activity; }
          else if (genericType.includes('storm') || genericType.includes('hurricane') || genericType.includes('cyclone')) { typeCat = 'Severe Weather'; Icon = Zap; }
          else if (cat === 'security' || genericType.includes('conflict') || genericType.includes('war') || genericType.includes('cyber')) { typeCat = 'Security Threat'; Icon = ShieldAlert; }
          
          if (risk.is_forecast || cat === 'forecast') typeCat = `Predicted ${typeCat}`;
          
          const level10 = Math.min(10, (risk.event_severity || risk.severity_level || 1) * 2);
          if (!riskCounts[typeCat]) riskCounts[typeCat] = { count: 0, Icon, name: typeCat, maxLevel: level10 };
          riskCounts[typeCat].count += 1;
          if (level10 > riskCounts[typeCat].maxLevel) riskCounts[typeCat].maxLevel = level10;
        });

        const topRisks = Object.values(riskCounts).sort((a, b) => b.maxLevel - a.maxLevel).slice(0, 3);
        if (topRisks.length === 0) topRisks.push({ name: 'All Clear', maxLevel: 1, count: 0, Icon: ShieldAlert });
        
        const overallScore = topRisks[0].maxLevel;
        let colorText = 'text-yellow-400', colorBorder = 'border-yellow-400/30', bgGlow = 'bg-yellow-400/10';
        
        if (overallScore >= 8) { colorText = 'text-red-500'; colorBorder = 'border-red-500/50'; bgGlow = 'bg-red-500/10'; }
        else if (overallScore >= 5) { colorText = 'text-orange-400'; colorBorder = 'border-orange-400/50'; bgGlow = 'bg-orange-400/10'; }
        
        setLocalRisk({ score: overallScore, colorText, colorBorder, bgGlow, topRisks, totalEvents, isLoaded: true });
      } catch (err) { 
        console.error("Environment Data Error:", err); 
      }
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

  // ─── HELPERS & THEME LOGIC ─────────────────────────────────────
  const fallbackImage = FALLBACK_BACKGROUNDS[time.getDay() % 3];
  const finalImage = (imageError || !bgImage) ? fallbackImage : bgImage;
  const isEid = celebration === "Eid Mubarak";

  const theme = {
    badgeBg: isEid ? 'bg-black/60 shadow-lg border-yellow-400/30' : 'bg-white/10 backdrop-blur-md border-white/20',
    pulseDot: isEid ? 'bg-yellow-400' : 'bg-emerald-400',
    dateText: isEid ? 'text-slate-200' : 'text-slate-300',
    statsPanel: isEid ? 'bg-black/50 border-yellow-400/20' : 'bg-white/5 border-white/10',
    statsLabel: isEid ? 'text-yellow-400' : 'text-emerald-400',
    insightBorder: isEid ? 'border-yellow-400' : 'border-blue-500',
    insightText: isEid ? 'text-white' : 'text-slate-200',
    walletBg: isEid ? 'bg-black/40 border-yellow-400/20' : 'bg-white/5 border-white/10',
    walletIcon: isEid ? 'bg-yellow-500/20 text-yellow-300 border-yellow-400/40' : 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    buttonBg: isEid ? 'bg-white/90 hover:bg-white text-slate-900' : 'bg-white hover:bg-blue-50 text-slate-900',
  };

  const fmtCompact = (val) => {
    if (!showBalances) return '••••';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);
  };

  return (
    <>
      {/* ════════════════════════════════════════════════════════ */}
      {/* MOBILE HERO — Revolut-style clean balance card         */}
      {/* ════════════════════════════════════════════════════════ */}
      <div className="md:hidden relative w-full rounded-[2.2rem] overflow-hidden mb-5 shadow-2xl animate-in fade-in zoom-in-95 duration-500 border border-white/10">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-950" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-60">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-indigo-500/20 rounded-full blur-2xl" />
        </div>

        <div className="relative z-10 p-6 pt-7 pb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <TimeIcon size={14} className={iconColor} />
                <p className="text-blue-200/80 text-[10px] font-black uppercase tracking-[0.2em]">{greeting}</p>
              </div>
              <h1 className="text-white text-3xl font-black tracking-tight leading-none">{firstName}</h1>
            </div>
            <button
              onClick={() => setShowBalances(!showBalances)}
              className="w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center transition-all border border-white/10 shadow-lg mt-1"
            >
              {showBalances ? <Eye size={18} className="text-white" /> : <EyeOff size={18} className="text-white" />}
            </button>
          </div>

          <div className="mb-6">
            <p className="text-blue-200/60 text-[10px] font-black uppercase tracking-[0.2em] mb-1.5">Total Portfolio</p>
            <p className="text-white font-black tracking-tighter leading-none" style={{ fontSize: '2.8rem' }}>
              {showBalances
                ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(totalPortfolio)
                : '••••••'}
            </p>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full shadow-inner">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">{celebration}</span>
            </div>
            <span className="text-blue-200/60 text-[10px] font-bold tracking-wide">
              {time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>

          <div className="flex gap-3">
            {[
              { label: t('home.cash'),    val: balances?.liquid_usd || 0,          gradient: 'from-white/10 to-transparent' },
              { label: t('home.invested'),val: balances?.alpha_equity_usd || 0,    gradient: 'from-blue-500/20 to-transparent' },
              { label: t('home.vault'),   val: balances?.mysafe_digital_usd || 0,  gradient: 'from-indigo-500/20 to-transparent' },
            ].map(({ label, val, gradient }) => (
              <div key={label} className={`flex-1 bg-gradient-to-b ${gradient} backdrop-blur-md rounded-2xl p-3.5 border border-white/10 shadow-lg`}>
                <p className="text-blue-200/60 text-[9px] font-black uppercase tracking-widest mb-1.5">{label}</p>
                <p className="text-white text-sm font-black leading-tight tracking-wide">{fmtCompact(val)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* DESKTOP HERO — Full Glassmorphism Experience           */}
      {/* ════════════════════════════════════════════════════════ */}
      <div className="hidden md:block relative w-full rounded-[2.5rem] overflow-hidden shadow-2xl mb-8 border border-white/10 animate-in fade-in zoom-in-95 duration-700">
        
        {/* Background Layer */}
        <div className="absolute inset-0 z-0 bg-slate-900">
          <img 
            src={finalImage} 
            alt={celebration} 
            className="w-full h-full object-cover opacity-70 scale-105 transition-transform duration-1000 ease-out hover:scale-100" 
            crossOrigin="anonymous" 
          />
          <div className={`absolute inset-0 bg-gradient-to-br ${isEid ? 'from-slate-950/90 via-slate-900/60' : 'from-slate-950/80 via-slate-900/40'} to-transparent`} />
        </div>

        {/* Content Layer */}
        <div className="relative z-10 p-10 md:p-14 flex flex-col min-h-[440px]">
          
          {/* Top Bar: Date & Environment */}
          <div className="flex justify-between items-start mb-auto">
            <div className="flex flex-col gap-2.5">
              <div className={`${theme.badgeBg} px-4 py-2 rounded-full border flex items-center gap-2.5 w-max`}>
                <div className={`w-2 h-2 rounded-full ${theme.pulseDot} animate-pulse shadow-[0_0_10px_currentColor]`} />
                <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{celebration}</span>
              </div>
              <p className={`text-xs font-black ${theme.dateText} uppercase tracking-[0.15em] pl-2 drop-shadow-md`}>
                {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>

            {/* Weather & Risk Widget */}
            <div className="relative hidden sm:block z-20">
              <div className="flex items-center gap-5 bg-black/40 backdrop-blur-xl p-3.5 rounded-2xl border border-white/10 shadow-xl relative z-30 transition-colors hover:bg-black/50">
                <div className="text-right">
                  <p className="text-xl font-black text-white leading-none tracking-tight">
                    {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{weather.city}</p>
                </div>
                <div className="w-px h-8 bg-white/20" />
                <div className="text-white font-black text-xl tracking-tighter">{weather.temp}°</div>
              </div>

              {localRisk.isLoaded && (
                <div
                  onClick={() => setShowRiskDetails(!showRiskDetails)}
                  className={`absolute top-[calc(100%+12px)] right-0 flex flex-col p-4 rounded-2xl border ${localRisk.colorBorder} bg-black/50 backdrop-blur-2xl shadow-2xl w-[240px] cursor-pointer hover:bg-black/60 transition-all duration-400 ease-in-out overflow-hidden z-20 ${showRiskDetails ? 'max-h-72 opacity-100 translate-y-0' : 'max-h-[56px] opacity-90 -translate-y-1'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <ShieldAlert size={16} className={localRisk.colorText} />
                      <span className="text-[10px] text-slate-300 uppercase tracking-[0.15em] font-black">{weather.city} Risk</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-black ${localRisk.colorText} drop-shadow-md`}>{localRisk.score}/10</span>
                      <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${showRiskDetails ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                  
                  <div className={`mt-4 pt-4 border-t border-white/10 transition-all duration-300 ${showRiskDetails ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                    <p className="text-[10px] text-slate-400 font-bold mb-3 tracking-widest text-center uppercase">
                      {localRisk.totalEvents} Hazards within 35mi
                    </p>
                    <div className="flex justify-between items-end gap-2">
                      {localRisk.topRisks.map((RiskObj, i) => (
                        <div key={i} className={`flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl ${localRisk.bgGlow} border ${localRisk.colorBorder} flex-1 shadow-inner`} title={RiskObj.name}>
                          <RiskObj.Icon size={16} className={localRisk.colorText} />
                          <span className={`text-xs font-black ${localRisk.colorText}`}>{RiskObj.count > 0 ? `${RiskObj.count}` : '0'}</span>
                          <span className="text-[8px] font-bold text-slate-300 uppercase text-center leading-tight">{RiskObj.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content: Greeting & Intelligence */}
          <div className="max-w-3xl my-10">
            <div className="flex items-center gap-4 mb-8">
              <TimeIcon className={`${iconColor} drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]`} size={36} />
              <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter drop-shadow-2xl">
                {greeting}, {firstName}.
              </h1>
            </div>

            {/* Liquidity & Trajectory Panel */}
            <div className={`flex flex-col sm:flex-row sm:items-center gap-6 mb-8 ${theme.statsPanel} backdrop-blur-xl p-5 pr-8 rounded-3xl border shadow-2xl w-fit transition-all hover:bg-white/10`}>
              <div>
                <p className={`text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 flex items-center gap-2`}>
                  <Globe size={14} className={theme.statsLabel} /> Global Liquidity (USD)
                </p>
                <p className="text-lg sm:text-xl font-black text-white tracking-wide drop-shadow-md">
                  {formatCurrency(primaryUsdBalance)}
                </p>
              </div>
              <div className="w-px h-12 bg-white/10 hidden sm:block" />
              <div className="flex flex-col justify-end w-36 h-12 relative group cursor-crosshair">
                <p className={`text-[9px] font-black text-slate-500 uppercase tracking-widest absolute -top-1 right-0 transition-colors group-hover:${theme.statsLabel}`}>
                  {recentTxCount} Tx Trajectory
                </p>
                <div className="absolute bottom-0 w-full h-8 opacity-70 group-hover:opacity-100 transition-opacity duration-300">
                  <svg viewBox="0 0 100 30" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <polygon points={sparklineFill} fill="url(#lineGrad)" />
                    <polyline points={sparklinePoints} fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>

            {/* AI Insight Feed */}
            {isLoadingInsight ? (
              <div className="flex items-center gap-3 text-blue-400 font-bold animate-pulse mt-4 bg-black/20 w-fit px-4 py-2 rounded-lg backdrop-blur-sm">
                <RefreshCw size={18} className="animate-spin" /> 
                <span className="text-xs uppercase tracking-widest">Consulting Network Intelligence...</span>
              </div>
            ) : (
              <p className={`text-lg md:text-xl ${theme.insightText} font-medium leading-relaxed drop-shadow-2xl border-l-4 ${theme.insightBorder} pl-5 max-w-2xl bg-black/10 py-2 pr-4 rounded-r-xl backdrop-blur-sm`}>
                {insight}
              </p>
            )}
          </div>

          {/* Bottom Bar: Wallets & Quick Actions */}
          <div className={`mt-auto flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-8 border-t border-white/10`}>
            
            <div className="flex gap-4 overflow-x-auto pb-2 sm:pb-0 no-scrollbar w-full sm:w-auto mask-fade-edges">
              {activeWallets.map((wallet) => (
                <div key={wallet.currency_code} className={`flex items-center gap-4 ${theme.walletBg} backdrop-blur-md border p-3.5 rounded-2xl min-w-[150px] shadow-lg transition-transform hover:-translate-y-1`}>
                  <div className={`w-11 h-11 ${theme.walletIcon} rounded-xl flex items-center justify-center border shadow-inner`}>
                    <Wallet size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                      {wallet.currency_code} Account
                    </p>
                    <p className="text-base font-black text-white tracking-tight">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: wallet.currency_code }).format(wallet.balance)}
                    </p>
                  </div>
                </div>
              ))}
              
              <button onClick={() => setActiveModal('OPEN_ACCOUNT')} className="flex items-center gap-3 bg-black/20 hover:bg-white/10 border-white/10 transition-all duration-300 backdrop-blur-md border border-dashed p-3.5 rounded-2xl min-w-[150px] group">
                <div className="w-11 h-11 bg-slate-800/50 text-slate-400 group-hover:text-white group-hover:bg-slate-700/50 rounded-xl flex items-center justify-center transition-colors">
                  <span className="text-2xl font-light mb-1">+</span>
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black text-slate-400 group-hover:text-white uppercase tracking-widest transition-colors">Open</p>
                  <p className="text-xs font-bold text-slate-500 group-hover:text-slate-300 transition-colors">New Currency</p>
                </div>
              </button>
            </div>

            <div className="flex items-center justify-end shrink-0">
              <button onClick={() => setActiveModal('CONVERT_FUNDS')} className={`px-7 py-4 ${theme.buttonBg} rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all duration-300 flex items-center gap-3 group shadow-xl hover:shadow-2xl`}>
                Global Transfer 
                <ArrowRight size={16} className="group-hover:translate-x-1.5 transition-transform" />
              </button>
            </div>
          </div>
          
        </div>
      </div>
    </>
  );
}