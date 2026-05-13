import React, { useState, useEffect, useMemo } from 'react';
import {
  Sun, Moon, Eye, EyeOff, ArrowRight, Wallet, RefreshCw,
  AlertTriangle, Waves, ShieldAlert, ChevronDown,
  Globe, TrendingDown, Leaf, Stethoscope, ShieldCheck
} from 'lucide-react';
import { supabase } from './services/supabaseClient';
import { useTranslation } from './i18n/useTranslation';

const EID_IMAGE = "/eid-mubarak.png";
const FALLBACK_BACKGROUNDS = [
  "https://images.unsplash.com/photo-1509803874385-db7c23652552?auto=format&fit=crop&q=80&w=2000",
  "https://picsum.photos/id/1016/2000/1200",
  "https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?auto=format&fit=crop&q=80&w=2000"
];

const MICHAEL_BASE = 'https://michael-api-382117221028.us-central1.run.app';
const MICHAEL_KEY  = import.meta.env.VITE_MICHAEL_API_KEY || 'michael-073ef5fe9d186dc4259e81e8d9cc928ee34f3f44';

// ISO-2 → ISO-3 mapping for MICHAEL API country risk endpoint
const ISO2_TO_ISO3 = {
  AF:'AFG',AL:'ALB',DZ:'DZA',AO:'AGO',AR:'ARG',AM:'ARM',AU:'AUS',AT:'AUT',AZ:'AZE',
  BD:'BGD',BE:'BEL',BZ:'BLZ',BJ:'BEN',BO:'BOL',BR:'BRA',BG:'BGR',BF:'BFA',BI:'BDI',
  CA:'CAN',CM:'CMR',CF:'CAF',TD:'TCD',CL:'CHL',CN:'CHN',CO:'COL',CD:'COD',CG:'COG',
  CR:'CRI',CI:'CIV',HR:'HRV',CU:'CUB',CZ:'CZE',DK:'DNK',DO:'DOM',EC:'ECU',EG:'EGY',
  SV:'SLV',ET:'ETH',FI:'FIN',FR:'FRA',DE:'DEU',GH:'GHA',GR:'GRC',GT:'GTM',GN:'GIN',
  HN:'HND',HT:'HTI',HU:'HUN',IN:'IND',ID:'IDN',IR:'IRN',IQ:'IRQ',IE:'IRL',IL:'ISR',
  IT:'ITA',JM:'JAM',JP:'JPN',JO:'JOR',KZ:'KAZ',KE:'KEN',KP:'PRK',KR:'KOR',KW:'KWT',
  LB:'LBN',LR:'LBR',LY:'LBY',ML:'MLI',MR:'MRT',MA:'MAR',MX:'MEX',MD:'MDA',MN:'MNG',
  MM:'MMR',MZ:'MOZ',NA:'NAM',NP:'NPL',NL:'NLD',NZ:'NZL',NI:'NIC',NE:'NER',NG:'NGA',
  NO:'NOR',PK:'PAK',PA:'PAN',PG:'PNG',PY:'PRY',PE:'PER',PH:'PHL',PL:'POL',PT:'PRT',
  RO:'ROU',RU:'RUS',RW:'RWA',SA:'SAU',SN:'SEN',RS:'SRB',SL:'SLE',SO:'SOM',ZA:'ZAF',
  SS:'SSD',ES:'ESP',LK:'LKA',SD:'SDN',SE:'SWE',CH:'CHE',SY:'SYR',TW:'TWN',TJ:'TJK',
  TZ:'TZA',TH:'THA',TL:'TLS',TN:'TUN',TR:'TUR',TM:'TKM',UG:'UGA',UA:'UKR',AE:'ARE',
  GB:'GBR',US:'USA',UY:'URY',UZ:'UZB',VE:'VEN',VN:'VNM',YE:'YEM',ZM:'ZMB',ZW:'ZWE',
  CQ:'CAQ',MK:'MKD',BA:'BIH',ME:'MNE',XK:'XKX',
};

const CAT_META = {
  Environmental:  { Icon: Waves,       color: 'text-blue-400',   border: 'border-blue-400/30',   bg: 'bg-blue-400/10'   },
  Security:       { Icon: ShieldAlert,  color: 'text-red-400',    border: 'border-red-400/30',    bg: 'bg-red-400/10'    },
  Financial:      { Icon: TrendingDown, color: 'text-amber-400',  border: 'border-amber-400/30',  bg: 'bg-amber-400/10'  },
  'Food Security':{ Icon: Leaf,         color: 'text-orange-400', border: 'border-orange-400/30', bg: 'bg-orange-400/10' },
  Epidemic:       { Icon: Stethoscope,  color: 'text-purple-400', border: 'border-purple-400/30', bg: 'bg-purple-400/10' },
};

function michaelScoreToColor(score) {
  if (score >= 85) return { text: 'text-red-500',    border: 'border-red-500/50',    glow: 'bg-red-500/10',    label: 'CRITICAL' };
  if (score >= 70) return { text: 'text-orange-400', border: 'border-orange-400/50', glow: 'bg-orange-400/10', label: 'HIGH' };
  if (score >= 40) return { text: 'text-amber-400',  border: 'border-amber-400/30',  glow: 'bg-amber-400/10',  label: 'MODERATE' };
  return                  { text: 'text-emerald-400', border: 'border-emerald-400/30', glow: 'bg-emerald-400/10', label: 'LOW' };
}

export default function HeroBanner({ profile, balances, wallets = [], transactions = [], formatCurrency, showBalances, setShowBalances, setActiveModal }) {
  const { t } = useTranslation();
  const [time, setTime]           = useState(new Date());
  const [weather, setWeather]     = useState({ city: 'Global Network', temp: '--', condition: 0 });
  const [localRisk, setLocalRisk] = useState({
    score: 0, michaelScore: 0, directive: '—', label: 'LOW',
    colorText: 'text-emerald-400', colorBorder: 'border-emerald-400/30', bgGlow: 'bg-emerald-400/10',
    topRisks: [], totalEvents: 0, nearbyCount: 0,
    categories: {}, components: {}, isLoaded: false
  });
  const [showRiskDetails, setShowRiskDetails] = useState(false);
  const [insight, setInsight]               = useState("Synchronizing institutional telemetry and regional threat data...");
  const [isLoadingInsight, setIsLoadingInsight] = useState(true);
  const [celebration, setCelebration]       = useState("Global Institutional Growth Day");
  const [bgImage, setBgImage]               = useState("");
  const [imageError, setImageError]         = useState(false);

  const firstName = profile?.full_name?.split(' ')[0] || 'Client';
  const hour      = time.getHours();
  let greeting = t('home.goodEvening');
  let TimeIcon = Moon, iconColor = "text-indigo-300";
  if (hour >= 5  && hour < 12) { greeting = t('home.goodMorning');   TimeIcon = Sun; iconColor = "text-yellow-400"; }
  else if (hour >= 12 && hour < 18) { greeting = t('home.goodAfternoon'); TimeIcon = Sun; iconColor = "text-amber-400"; }

  const activeWallets    = wallets.length > 0 ? wallets : [{ currency_code: 'USD', balance: balances?.liquid_usd || 0 }];
  const primaryUsdBalance = activeWallets.find(w => w.currency_code === 'USD')?.balance || balances?.liquid_usd || 0;
  const totalPortfolio   = (balances?.liquid_usd || 0) + (balances?.alpha_equity_usd || 0) + (balances?.mysafe_digital_usd || 0);

  const { sparklinePoints, sparklineFill, recentTxCount } = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });
    const counts  = last7Days.map(dateStr => transactions.filter(t => t.created_at?.startsWith(dateStr)).length);
    const maxCount = Math.max(...counts, 2);
    const points  = counts.map((count, index) => `${(index / 6) * 100},${30 - ((count / maxCount) * 30)}`);
    return { sparklinePoints: points.join(' '), sparklineFill: `0,30 ${points.join(' ')} 100,30`, recentTxCount: transactions.slice(0, 5).length };
  }, [transactions]);

  // ── CELEBRATION ────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchCelebration = async () => {
      const todayKey = `${String(time.getMonth() + 1).padStart(2, '0')}-${String(time.getDate()).padStart(2, '0')}`;
      if (todayKey === '03-20') { setCelebration("Eid Mubarak"); setBgImage(EID_IMAGE); setImageError(false); return; }
      const { data } = await supabase.from('global_celebrations').select('name, image_url').eq('month_day', todayKey).maybeSingle();
      if (data?.name) { setCelebration(data.name); setBgImage(data.image_url); setImageError(false); }
      else { setImageError(true); }
    };
    fetchCelebration();
  }, []);

  // ── MICHAEL RISK ENGINE ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchRisk = async () => {
      try {
        // 1 — Geolocation (IP-based or profile lat/lng)
        let lat, lng, city, iso2;
        if (profile?.latitude && profile?.longitude) {
          lat = profile.latitude; lng = profile.longitude; city = profile.city || 'Your Location';
        } else {
          const geoRes  = await fetch('https://ipapi.co/json/');
          const geoData = await geoRes.json();
          lat  = geoData.latitude; lng = geoData.longitude;
          city = geoData.city || geoData.country_name || 'Global';
          iso2 = geoData.country_code;
        }
        if (!iso2) iso2 = profile?.country || 'US';

        const CATEGORIES = ['environmental','security','financial','food+security','epidemic'];
        const mHeaders = { 'X-API-Key': MICHAEL_KEY };

        // Fetch all in parallel: weather + country risk + 5 category event slices
        const [weatherRes, riskRes, ...catResults] = await Promise.all([
          fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&temperature_unit=fahrenheit`)
            .then(r => r.json()).catch(() => null),
          fetch(`${MICHAEL_BASE}/api/v1/risk/country/${ISO2_TO_ISO3[iso2] || 'USA'}`, { headers: mHeaders })
            .then(r => r.json()).catch(() => null),
          ...CATEGORIES.map(cat =>
            fetch(`${MICHAEL_BASE}/api/v1/events?category=${cat}&limit=40`, { headers: mHeaders })
              .then(r => r.json()).catch(() => null)
          ),
        ]);

        if (weatherRes?.current_weather) {
          setWeather({ city, temp: Math.round(weatherRes.current_weather.temperature), condition: weatherRes.current_weather.weathercode });
        } else {
          setWeather(p => ({ ...p, city }));
        }

        // 2 — MICHAEL country risk score
        const riskProfile  = riskRes?.risk_profile || {};
        const michaelScore = riskProfile.total_risk_score || 0;
        const directive    = riskProfile.directive || 'CLEAR';
        const components   = riskProfile.components || {};

        // 3 — Merge all category events, filter near user (8-degree box ≈ ~900km)
        const allEvents = catResults.flatMap(r => r?.events || []);
        const totalCount = catResults.reduce((s, r) => s + (r?.total || 0), 0);
        const nearby = allEvents.filter(e =>
          e.latitude != null && e.longitude != null &&
          Math.abs(e.latitude  - lat) < 8 &&
          Math.abs(e.longitude - lng) < 8
        );
        // If fewer than 3 nearby, show global context
        const workingSet = nearby.length >= 3 ? nearby : allEvents;

        // 4 — Aggregate by MICHAEL category (5 categories)
        const catCounts = {};
        for (const [key] of Object.entries(CAT_META)) catCounts[key] = { count: 0, maxSeverity: 0, events: [] };

        workingSet.forEach(e => {
          // Normalise category name (API sometimes returns lowercase)
          const rawCat = (e.category || '').trim();
          const cat =
            rawCat === 'Environmental' || rawCat.toLowerCase() === 'environmental' ? 'Environmental' :
            rawCat === 'Security'      || rawCat.toLowerCase() === 'security'      ? 'Security' :
            rawCat === 'Financial'     || rawCat.toLowerCase() === 'financial'     ? 'Financial' :
            rawCat === 'Food Security' || rawCat.toLowerCase() === 'food security' ? 'Food Security' :
            rawCat === 'Epidemic'      || rawCat.toLowerCase() === 'epidemic'      ? 'Epidemic' : null;

          if (!cat) return;
          catCounts[cat].count++;
          const sev = e.severity_level || 1;
          if (sev > catCounts[cat].maxSeverity) catCounts[cat].maxSeverity = sev;
          if (catCounts[cat].events.length < 3) catCounts[cat].events.push(e);
        });

        // 5 — Build topRisks array for compact view (top 3 by combined count+severity)
        const topRisks = Object.entries(catCounts)
          .map(([name, d]) => ({
            name,
            count: d.count,
            maxLevel: Math.min(10, (d.maxSeverity || 1) * 2),
            Icon: CAT_META[name]?.Icon || AlertTriangle,
          }))
          .filter(r => r.count > 0)
          .sort((a, b) => b.maxLevel - a.maxLevel || b.count - a.count)
          .slice(0, 3);

        if (topRisks.length === 0) topRisks.push({ name: 'All Clear', maxLevel: 1, count: 0, Icon: ShieldCheck });

        const colors = michaelScoreToColor(michaelScore);

        setLocalRisk({
          score:       Math.round(michaelScore / 10),
          michaelScore,
          directive,
          label:       colors.label,
          colorText:   colors.text,
          colorBorder: colors.border,
          bgGlow:      colors.glow,
          topRisks,
          totalEvents: totalCount || allEvents.length,
          nearbyCount: nearby.length,
          categories:  catCounts,
          components,
          isLoaded:    true,
        });
      } catch (err) {
        console.error("MICHAEL Risk fetch error:", err);
        setLocalRisk(p => ({ ...p, isLoaded: true }));
      }
    };
    fetchRisk();
  }, [profile?.country, profile?.latitude, profile?.longitude]);

  // ── AI INSIGHT ─────────────────────────────────────────────────────────────
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
      } catch {
        setInsight(`Institutional telemetry indicates operations are nominal. Regional threat level in ${weather.city} is assessed at ${localRisk.score}/10 — ${localRisk.label}. Your assets remain secure.`);
      } finally { setIsLoadingInsight(false); }
    };
    if (profile && weather.temp !== '--' && localRisk.isLoaded) fetchInsight();
  }, [profile, weather.city, celebration, localRisk.isLoaded]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fallbackImage = FALLBACK_BACKGROUNDS[time.getDay() % 3];
  const finalImage    = (imageError || !bgImage) ? fallbackImage : bgImage;
  const isEid         = celebration === "Eid Mubarak";

  const fmtCompact = (val) => {
    if (!showBalances) return '••••';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);
  };

  // ── RISK PANEL (shared sub-component) ──────────────────────────────────────
  const RiskPanel = () => {
    if (!localRisk.isLoaded) return null;
    return (
      <div
        onClick={() => setShowRiskDetails(!showRiskDetails)}
        className={`flex flex-col p-3 rounded-2xl border ${localRisk.colorBorder} bg-black/40 backdrop-blur-xl shadow-lg w-[240px] cursor-pointer hover:bg-black/50 transition-all duration-300 overflow-hidden z-20`}
        style={{ maxHeight: showRiskDetails ? '420px' : '50px', transition: 'max-height 0.35s ease' }}
      >
        {/* Compact row — always visible */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ShieldAlert size={14} className={localRisk.colorText} />
            <span className="text-[9px] text-slate-300 uppercase tracking-widest font-black">{weather.city} Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black uppercase tracking-widest ${localRisk.colorText} ${localRisk.bgGlow} px-2 py-0.5 rounded-lg`}>
              {localRisk.label}
            </span>
            <span className={`text-sm font-black ${localRisk.colorText}`}>{localRisk.score}/10</span>
            <ChevronDown size={13} className={`text-slate-400 transition-transform duration-300 ${showRiskDetails ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {/* Expanded detail */}
        <div className={`mt-3 pt-3 border-t border-white/10 space-y-3 transition-opacity duration-300 ${showRiskDetails ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>

          {/* MICHAEL directive */}
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">
            MICHAEL Score: <span className={localRisk.colorText}>{Math.round(localRisk.michaelScore)}</span>/100
            · {localRisk.nearbyCount > 0 ? `${localRisk.nearbyCount} nearby` : `${localRisk.totalEvents} global`} events
          </p>

          {/* 5-category breakdown */}
          <div className="space-y-1.5">
            {Object.entries(localRisk.categories).map(([cat, d]) => {
              const meta = CAT_META[cat] || { Icon: AlertTriangle, color: 'text-slate-400', border: 'border-slate-400/20', bg: 'bg-slate-400/10' };
              const pct  = Math.min(100, (d.maxSeverity / 5) * 100);
              return (
                <div key={cat} className="flex items-center gap-2">
                  <meta.Icon size={11} className={meta.color} />
                  <div className="flex-1">
                    <div className="flex justify-between mb-0.5">
                      <span className="text-[8px] font-black text-slate-300 uppercase tracking-wide truncate">{cat}</span>
                      <span className={`text-[8px] font-black ${d.count > 0 ? meta.color : 'text-slate-600'}`}>{d.count}</span>
                    </div>
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${d.count > 0 ? meta.color.replace('text-', 'bg-') : 'bg-slate-700'}`}
                        style={{ width: d.count > 0 ? `${pct}%` : '4%' }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* MICHAEL components */}
          {localRisk.components?.hazard_score != null && (
            <div className="pt-2 border-t border-white/10 grid grid-cols-3 gap-1 text-center">
              {[
                ['Hazard',      localRisk.components.hazard_score],
                ['Vulnerability', localRisk.components.vulnerability_score],
                ['Coping',      localRisk.components.lack_of_coping_capacity],
              ].map(([label, val]) => (
                <div key={label} className={`${localRisk.bgGlow} rounded-lg p-1.5 border ${localRisk.colorBorder}`}>
                  <p className={`text-[10px] font-black ${localRisk.colorText}`}>{(val || 0).toFixed(1)}</p>
                  <p className="text-[7px] text-slate-400 font-bold uppercase leading-tight">{label}</p>
                </div>
              ))}
            </div>
          )}

          <p className="text-[8px] text-slate-500 text-center font-bold pt-1">
            Powered by MICHAEL Global Ops API
          </p>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* ══════════════════════════════════════════════════════════ */}
      {/*  MOBILE HERO                                               */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="md:hidden relative w-full rounded-[2.2rem] overflow-hidden mb-5 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-indigo-300/15 rounded-full blur-2xl" />
        </div>
        <div className="relative z-10 p-6 pt-7 pb-6">
          {/* Top row */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <TimeIcon size={13} className={iconColor} />
                <p className="text-blue-200/80 text-[10px] font-black uppercase tracking-[0.18em]">{greeting}</p>
              </div>
              <h1 className="text-white text-2xl font-black tracking-tight leading-none">{firstName}</h1>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <button
                onClick={() => setShowBalances(!showBalances)}
                className="w-10 h-10 bg-white/15 rounded-2xl flex items-center justify-center active:scale-90 transition-transform border border-white/20 shadow-sm"
              >
                {showBalances ? <Eye size={17} className="text-white" /> : <EyeOff size={17} className="text-white" />}
              </button>
              {localRisk.isLoaded && (
                <div className={`flex items-center gap-1.5 ${localRisk.bgGlow} border ${localRisk.colorBorder} px-2.5 py-1 rounded-full`}>
                  <ShieldAlert size={10} className={localRisk.colorText} />
                  <span className={`text-[9px] font-black uppercase tracking-widest ${localRisk.colorText}`}>{localRisk.label}</span>
                </div>
              )}
            </div>
          </div>

          {/* Balance */}
          <div className="mb-2">
            <p className="text-blue-200/60 text-[9px] font-black uppercase tracking-widest mb-1">Total Portfolio</p>
            <p className="text-white font-black tracking-tight leading-none" style={{ fontSize: '2.6rem' }}>
              {showBalances
                ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(totalPortfolio)
                : '••••••'}
            </p>
          </div>

          {/* Celebration + date */}
          <div className="flex items-center gap-2 mb-5">
            <div className="flex items-center gap-1.5 bg-white/15 border border-white/20 px-2.5 py-1 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[9px] font-black text-white uppercase tracking-widest">{celebration}</span>
            </div>
            <span className="text-blue-200/50 text-[9px] font-bold">
              {time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>

          {/* Balance pills */}
          <div className="flex gap-2">
            {[
              { label: t('home.cash'),     val: balances?.liquid_usd || 0,         gradient: 'from-white/20 to-white/8' },
              { label: t('home.invested'), val: balances?.alpha_equity_usd || 0,   gradient: 'from-blue-400/30 to-blue-400/8' },
              { label: t('home.vault'),    val: balances?.mysafe_digital_usd || 0, gradient: 'from-indigo-400/30 to-indigo-400/8' },
            ].map(({ label, val, gradient }) => (
              <div key={label} className={`flex-1 bg-gradient-to-b ${gradient} backdrop-blur-sm rounded-2xl p-3 border border-white/10`}>
                <p className="text-blue-200/70 text-[8px] font-black uppercase tracking-wide mb-1">{label}</p>
                <p className="text-white text-sm font-black leading-tight">{fmtCompact(val)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/*  DESKTOP HERO                                              */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="hidden md:block relative w-full rounded-[3rem] overflow-hidden shadow-2xl mb-8 bg-slate-900 border border-white/10 animate-in fade-in zoom-in-95 duration-700">
        <div className="absolute inset-0 z-0 bg-slate-900">
          <img src={finalImage} alt={celebration} className="w-full h-full object-cover opacity-80 scale-105 transition-opacity duration-1000"
            crossOrigin="anonymous"
            onError={(e) => { e.target.onerror = null; e.target.src = "https://picsum.photos/id/1016/2000/1200"; setImageError(true); }} />
          <div className={`absolute inset-0 bg-gradient-to-br ${isEid ? 'from-slate-950/80 via-slate-900/50' : 'from-slate-950/50 via-slate-900/20'} to-transparent`} />
        </div>

        <div className="relative z-10 p-8 md:p-12 flex flex-col min-h-[420px]">
          <div className="flex justify-between items-start mb-auto">
            <div className="flex flex-col gap-2">
              <div className={`bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 flex items-center gap-2 w-max ${isEid ? 'shadow-lg' : ''}`}>
                <div className={`w-2 h-2 rounded-full ${isEid ? 'bg-yellow-400' : 'bg-emerald-400'} animate-pulse`} />
                <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{celebration}</span>
              </div>
              <p className={`text-xs font-black ${isEid ? 'text-slate-200' : 'text-slate-300'} uppercase tracking-widest pl-2 drop-shadow-md`}>
                {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>

            <div className="relative hidden sm:block z-20">
              {/* Clock + weather */}
              <div className="flex items-center gap-4 bg-black/40 backdrop-blur-xl p-3 rounded-2xl border border-white/10 shadow-lg relative z-30">
                <div className="text-right">
                  <p className="text-xl font-black text-white leading-none">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{weather.city}</p>
                </div>
                <div className="w-px h-8 bg-white/20" />
                <div className="text-white font-black text-lg">{weather.temp}°</div>
              </div>

              {/* MICHAEL Risk Panel */}
              <div className="absolute top-[calc(100%+12px)] right-0">
                <RiskPanel />
              </div>
            </div>
          </div>

          <div className="max-w-3xl my-8">
            <div className="flex items-center gap-3 mb-6">
              <TimeIcon className={iconColor} size={32} />
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter drop-shadow-lg">
                {greeting}, {firstName}.
              </h1>
            </div>

            <div className={`flex flex-col sm:flex-row sm:items-center gap-5 mb-6 ${isEid ? 'bg-black/40' : 'bg-white/5'} backdrop-blur-md p-4 pr-6 rounded-3xl border border-white/10 w-fit shadow-2xl`}>
              <div>
                <p className={`text-[10px] font-black ${isEid ? 'text-slate-300' : 'text-slate-400'} uppercase tracking-[0.2em] mb-1 flex items-center gap-2`}>
                  <Globe size={12} className={isEid ? 'text-yellow-400' : 'text-emerald-400'} /> Global Liquidity (USD Eq.)
                </p>
                <p className="text-base sm:text-lg font-black text-white tracking-wide drop-shadow-md">{formatCurrency(primaryUsdBalance)}</p>
              </div>
              <div className="w-px h-10 bg-white/10 hidden sm:block" />
              <div className="flex flex-col justify-end w-32 h-10 relative group">
                <p className={`text-[8px] font-black ${isEid ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-widest absolute -top-1 right-0 transition-colors group-hover:text-emerald-400`}>{recentTxCount} Tx Trajectory</p>
                <div className="absolute bottom-0 w-full h-6 opacity-80 group-hover:opacity-100 transition-opacity">
                  <svg viewBox="0 0 100 30" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <polygon points={sparklineFill} fill="url(#lineGrad)" />
                    <polyline points={sparklinePoints} fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>

            {isLoadingInsight ? (
              <div className={`flex items-center gap-3 ${isEid ? 'text-yellow-300' : 'text-blue-400'} font-bold animate-pulse mt-4`}>
                <RefreshCw size={18} className="animate-spin" />
                <span className="text-sm">Consulting Network Intelligence...</span>
              </div>
            ) : (
              <p className={`text-lg md:text-xl ${isEid ? 'text-white' : 'text-slate-200'} font-medium leading-relaxed drop-shadow-2xl border-l-2 ${isEid ? 'border-yellow-400' : 'border-blue-500'} pl-4 max-w-2xl`}>
                {insight}
              </p>
            )}
          </div>

          <div className={`mt-auto flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-6 border-t ${isEid ? 'border-white/20' : 'border-white/10'}`}>
            <div className="flex gap-4 overflow-x-auto pb-2 sm:pb-0 no-scrollbar w-full sm:w-auto">
              {activeWallets.map((wallet) => (
                <div key={wallet.currency_code} className={`flex items-center gap-3 ${isEid ? 'bg-black/30 border-yellow-400/20' : 'bg-white/5 border-white/10'} backdrop-blur-sm border p-3 rounded-2xl min-w-[140px]`}>
                  <div className={`w-10 h-10 ${isEid ? 'bg-yellow-500/20 border-yellow-400/40 text-yellow-300' : 'bg-blue-500/20 border-blue-500/30 text-blue-400'} rounded-xl flex items-center justify-center border shadow-lg`}>
                    <Wallet size={16} />
                  </div>
                  <div>
                    <p className={`text-[9px] font-black ${isEid ? 'text-slate-300' : 'text-slate-400'} uppercase tracking-widest`}>{wallet.currency_code} Account</p>
                    <p className="text-sm font-black text-white">{new Intl.NumberFormat('en-US', { style: 'currency', currency: wallet.currency_code }).format(wallet.balance)}</p>
                  </div>
                </div>
              ))}
              <button onClick={() => setActiveModal('OPEN_ACCOUNT')} className={`flex items-center gap-3 ${isEid ? 'bg-black/40 hover:bg-black/60 border-yellow-400/30' : 'bg-black/20 hover:bg-white/10 border-white/10'} transition-colors backdrop-blur-sm border border-dashed p-3 rounded-2xl min-w-[140px] group`}>
                <div className={`w-10 h-10 ${isEid ? 'bg-yellow-500/10 text-yellow-500' : 'bg-slate-800/50 text-slate-400'} group-hover:text-white rounded-xl flex items-center justify-center transition-colors`}>
                  <span className="text-2xl font-light mb-1">+</span>
                </div>
                <div className="text-left">
                  <p className={`text-[10px] font-black ${isEid ? 'text-yellow-400' : 'text-slate-400'} group-hover:text-white uppercase tracking-widest transition-colors`}>Open</p>
                  <p className={`text-xs font-bold ${isEid ? 'text-yellow-200' : 'text-slate-500'} group-hover:text-slate-300`}>New Currency</p>
                </div>
              </button>
            </div>
            <div className="flex items-center justify-end shrink-0">
              <button onClick={() => setActiveModal('CONVERT_FUNDS')} className={`px-6 py-3 ${isEid ? 'bg-white/90 hover:bg-white text-slate-900' : 'bg-white hover:bg-blue-50 text-slate-900'} rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 group shadow-lg`}>
                Global Transfer <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
