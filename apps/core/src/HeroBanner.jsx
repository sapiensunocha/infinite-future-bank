import React, { useState, useEffect, useMemo } from 'react';
import {
  Sun, Moon, Eye, EyeOff, ArrowRight, Wallet, RefreshCw,
  AlertTriangle, Waves, ShieldAlert, ChevronDown,
  Globe, TrendingDown, Leaf, Stethoscope, ShieldCheck,
  Building2, MapPin
} from 'lucide-react';
import { supabase } from './services/supabaseClient';
import { useTranslation } from './i18n/useTranslation';

const EID_IMAGE = "/eid-mubarak.png";
const FALLBACK_BACKGROUNDS = [
  "https://images.unsplash.com/photo-1509803874385-db7c23652552?auto=format&fit=crop&q=80&w=2000",
  "https://picsum.photos/id/1016/2000/1200",
  "https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?auto=format&fit=crop&q=80&w=2000"
];

// MICHAEL API is reached only through the `michael-proxy` edge function (see
// michaelFetch below). The API key lives server-side; never ship it to the client.

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
  Environmental:  { Icon: Waves,       color: 'text-blue-400',    border: 'border-blue-400/30',    bg: 'bg-blue-400/10'    },
  Security:       { Icon: ShieldAlert,  color: 'text-red-400',     border: 'border-red-400/30',     bg: 'bg-red-400/10'     },
  Financial:      { Icon: TrendingDown, color: 'text-amber-400',   border: 'border-amber-400/30',   bg: 'bg-amber-400/10'   },
  'Food Security':{ Icon: Leaf,         color: 'text-orange-400',  border: 'border-orange-400/30',  bg: 'bg-orange-400/10'  },
  Epidemic:       { Icon: Stethoscope,  color: 'text-purple-400',  border: 'border-purple-400/30',  bg: 'bg-purple-400/10'  },
  Infrastructure: { Icon: Building2,    color: 'text-yellow-400',  border: 'border-yellow-400/30',  bg: 'bg-yellow-400/10'  },
  Micro:          { Icon: MapPin,       color: 'text-slate-400',   border: 'border-slate-400/30',   bg: 'bg-slate-400/10'   },
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

        const CATEGORIES = ['environmental','security','financial','food+security','epidemic','infrastructure','micro'];

        const michaelFetch = async (path, params = {}) => {
          try {
            const { data, error } = await supabase.functions.invoke('michael-proxy', { body: { path, params } });
            return error ? null : data;
          } catch { return null; }
        };

        // Fetch all in parallel: weather + country risk + category event slices
        const [weatherRes, riskRes, ...catResults] = await Promise.all([
          fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&temperature_unit=fahrenheit`)
            .then(r => r.ok ? r.json() : null).catch(() => null),
          michaelFetch(`/api/v1/risk/country/${ISO2_TO_ISO3[iso2] || 'USA'}`),
          ...CATEGORIES.map(cat => michaelFetch('/api/v1/events', { category: cat, limit: '40' })),
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
          const rawCat = (e.category || '').trim().toLowerCase();
          const cat =
            rawCat === 'environmental'  ? 'Environmental'  :
            rawCat === 'security'       ? 'Security'       :
            rawCat === 'financial'      ? 'Financial'      :
            rawCat === 'food security'  ? 'Food Security'  :
            rawCat === 'epidemic'       ? 'Epidemic'       :
            rawCat === 'infrastructure' ? 'Infrastructure' :
            rawCat === 'micro'          ? 'Micro'          : null;

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
        const rawText = data?.text || data?.insight || '';
        if (!rawText) throw new Error('empty insight');
        const cleanText = rawText.replace(/Good Morning, .*?\./g, '').replace(/Welcome back, .*?\./g, '').trim();
        setInsight(cleanText);
      } catch {
        setInsight(`Institutional telemetry indicates operations are nominal. Regional threat level in ${weather.city} is assessed at ${localRisk.score}/10 — ${localRisk.label}. Your assets remain secure.`);
      } finally { setIsLoadingInsight(false); }
    };
    if (profile && weather.temp !== '--' && localRisk.isLoaded) {
      fetchInsight();
    } else {
      const fallbackTimer = setTimeout(() => {
        setIsLoadingInsight(false);
        setInsight(`Institutional telemetry indicates operations are nominal. Regional network status is verified secure and all accounts are active.`);
      }, 2000);
      return () => clearTimeout(fallbackTimer);
    }
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
            <span className="text-xs text-slate-300 font-semibold">{weather.city} Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold ${localRisk.colorText} ${localRisk.bgGlow} px-2 py-0.5 rounded-lg`}>
              {localRisk.label}
            </span>
            <span className={`text-sm font-bold ${localRisk.colorText}`}>{localRisk.score}/10</span>
            <ChevronDown size={13} className={`text-slate-400 transition-transform duration-300 ${showRiskDetails ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {/* Expanded detail */}
        <div className={`mt-3 pt-3 border-t border-white/10 space-y-3 transition-opacity duration-300 ${showRiskDetails ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>

          {/* MICHAEL directive */}
          <p className="text-xs font-semibold text-slate-500 text-center">
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
                      <span className="text-xs font-semibold text-slate-300 truncate">{cat}</span>
                      <span className={`text-xs font-bold ${d.count > 0 ? meta.color : 'text-slate-600'}`}>{d.count}</span>
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
                  <p className={`text-xs font-bold ${localRisk.colorText}`}>{(val || 0).toFixed(1)}</p>
                  <p className="text-xs text-slate-500 font-bold leading-tight">{label}</p>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-slate-500 text-center font-bold pt-1">
            Powered by MICHAEL Global Ops API
          </p>

          {/* IFB Green Finance — SDG Alignment strip */}
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="text-xs font-semibold text-emerald-400 mb-2">IFB Green Finance · SDG Alignment</p>
            <div className="flex flex-wrap gap-1">
              {['SDG 1','SDG 2','SDG 7','SDG 8','SDG 9','SDG 10','SDG 12','SDG 13','SDG 14','SDG 15'].map(sdg => (
                <span key={sdg} className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-full">{sdg}</span>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1.5">Just Transition Intermediary · IFC Green Bond Principles (ICMA 2025) · Paris Aligned</p>
          </div>
        </div>
      </div>
    );
  };

  // One balance card for mobile and web (it used to be a blue card on phones and a
  // dark photo banner on desktop). The only place on Home where balances appear.
  const short = (v) => (showBalances
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: Math.abs(v || 0) >= 10000 ? 'compact' : 'standard', maximumFractionDigits: Math.abs(v || 0) >= 10000 ? 1 : 0 }).format(v || 0)
    : '••••');
  const pills = [
    { label: t('home.cash'),     val: short(balances?.liquid_usd) },
    { label: t('home.invested'), val: short(balances?.alpha_equity_usd) },
    { label: t('home.vault'),    val: short(balances?.mysafe_digital_usd) },
    { label: 'AFR',              val: showBalances ? new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(balances?.afr_balance || 0)) : '••••' },
  ];

  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-[0_12px_32px_-12px_rgba(37,99,235,0.55)]">
      <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      <div className="relative p-5 md:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm text-blue-100">
              <TimeIcon size={15} className="text-amber-300" /> {greeting}, {firstName}
            </p>
            <p className="text-sm text-blue-100/80 mt-4">Total balance</p>
            <p className="ui-amount text-[2.25rem] md:text-5xl leading-tight mt-0.5">
              {showBalances
                ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(totalPortfolio)
                : '••••••'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowBalances(!showBalances)}
            className="w-10 h-10 shrink-0 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center"
            aria-label={showBalances ? 'Hide balances' : 'Show balances'}
          >
            {showBalances ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        </div>

        <div className="grid grid-cols-4 gap-1.5 md:gap-2 mt-5">
          {pills.map(({ label, val }) => (
            <div key={label} className="rounded-2xl bg-white/10 px-2 md:px-3 py-2.5 min-w-0 text-center md:text-left">
              <p className="text-xs text-blue-100 whitespace-nowrap overflow-hidden text-ellipsis">{label}</p>
              <p className="text-[13px] md:text-base font-semibold tabular-nums tracking-tight whitespace-nowrap mt-0.5">{val}</p>
            </div>
          ))}
        </div>

        <div className="hidden md:flex items-center justify-between gap-6 mt-5 pt-4 border-t border-white/15">
          <p className="text-sm text-blue-50/90 line-clamp-2 max-w-2xl">
            {isLoadingInsight ? 'Loading your daily insight…' : insight}
          </p>
          <button
            type="button"
            onClick={() => setActiveModal('CONVERT_FUNDS')}
            className="shrink-0 h-10 px-4 rounded-xl bg-white text-blue-700 text-sm font-semibold hover:bg-blue-50 flex items-center gap-1.5"
          >
            Global transfer <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
