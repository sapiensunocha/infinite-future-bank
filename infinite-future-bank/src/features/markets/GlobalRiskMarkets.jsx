import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  RefreshCw, X, Info, Trophy, Globe, BarChart3, Zap, Clock,
  TrendingUp, TrendingDown, AlertTriangle, ChevronRight, DollarSign,
  ShieldCheck, Activity, Brain, Flame, ArrowUpRight, ArrowDownRight,
  Star, Lock, Target, CheckCircle2, XCircle
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

// ─── APIs ───────────────────────────────────────────────────────────────────
const MICHAEL_BASE = 'https://michael-api-382117221028.us-central1.run.app';
const MICHAEL_KEY  = import.meta.env.VITE_MICHAEL_API_KEY;
const GEMINI_KEY   = import.meta.env.VITE_GEMINI_API_KEY;
const ESPN         = 'https://site.api.espn.com/apis/site/v2/sports';

// ─── SPORT SOURCES ──────────────────────────────────────────────────────────
const SPORT_SOURCES = [
  { id: 'nfl',    label: 'NFL',          emoji: '🏈', url: `${ESPN}/football/nfl/scoreboard` },
  { id: 'nba',    label: 'NBA',          emoji: '🏀', url: `${ESPN}/basketball/nba/scoreboard` },
  { id: 'mlb',    label: 'MLB',          emoji: '⚾', url: `${ESPN}/baseball/mlb/scoreboard` },
  { id: 'nhl',    label: 'NHL',          emoji: '🏒', url: `${ESPN}/hockey/nhl/scoreboard` },
  { id: 'epl',    label: 'Premier League', emoji: '⚽', url: `${ESPN}/soccer/eng.1/scoreboard` },
  { id: 'ucl',    label: 'Champions League', emoji: '🏆', url: `${ESPN}/soccer/uefa.champions/scoreboard` },
  { id: 'mls',    label: 'MLS',          emoji: '⚽', url: `${ESPN}/soccer/usa.1/scoreboard` },
  { id: 'ufc',    label: 'UFC / MMA',    emoji: '🥊', url: `${ESPN}/mma/ufc/scoreboard` },
  { id: 'f1',     label: 'Formula 1',    emoji: '🏎️', url: `${ESPN}/racing/f1/scoreboard` },
  { id: 'tennis', label: 'Tennis ATP',   emoji: '🎾', url: `${ESPN}/tennis/atp/scoreboard` },
  { id: 'golf',   label: 'PGA Golf',     emoji: '⛳', url: `${ESPN}/golf/pga/scoreboard` },
  { id: 'ncaafb', label: 'College Football', emoji: '🏈', url: `${ESPN}/football/college-football/scoreboard` },
  { id: 'ncaabb', label: 'College Basketball', emoji: '🏀', url: `${ESPN}/basketball/mens-college-basketball/scoreboard` },
  { id: 'laliga', label: 'La Liga',      emoji: '⚽', url: `${ESPN}/soccer/esp.1/scoreboard` },
  { id: 'bundesliga', label: 'Bundesliga', emoji: '⚽', url: `${ESPN}/soccer/ger.1/scoreboard` },
];

const WORLD_CATS = [
  { id: 'environmental', label: 'Environmental', emoji: '🌊' },
  { id: 'security',      label: 'Security',      emoji: '🛡️' },
  { id: 'financial',     label: 'Financial Risk', emoji: '💰' },
  { id: 'epidemic',      label: 'Epidemic',       emoji: '🦠' },
  { id: 'food+security', label: 'Food Crisis',    emoji: '🌾' },
  { id: 'infrastructure',label: 'Infrastructure', emoji: '⚡' },
];

const CRYPTO_COINS = [
  { id: 'bitcoin',       symbol: 'BTC', name: 'Bitcoin',  emoji: '₿'  },
  { id: 'ethereum',      symbol: 'ETH', name: 'Ethereum', emoji: '⟠'  },
  { id: 'solana',        symbol: 'SOL', name: 'Solana',   emoji: '◎'  },
  { id: 'binancecoin',   symbol: 'BNB', name: 'BNB',      emoji: '🟡' },
  { id: 'xrp',          symbol: 'XRP', name: 'XRP',      emoji: '✕'  },
  { id: 'dogecoin',      symbol: 'DOGE',name: 'Dogecoin', emoji: '🐕' },
  { id: 'cardano',       symbol: 'ADA', name: 'Cardano',  emoji: '₳'  },
  { id: 'avalanche-2',   symbol: 'AVAX',name: 'Avalanche',emoji: '🔺' },
];

// ─── CATEGORY DISPLAY ────────────────────────────────────────────────────────
const ALL_CATS = [
  { id: 'all',     label: 'All Markets', emoji: '🌐', color: 'slate' },
  { id: 'sports',  label: 'Sports',      emoji: '🏆', color: 'blue'  },
  { id: 'crypto',  label: 'Crypto',      emoji: '💹', color: 'amber' },
  { id: 'world',   label: 'World Events',emoji: '🌍', color: 'red'   },
];

const CAT_COLOR = {
  sports: { text: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   badge: 'bg-blue-500/20 text-blue-300',   bar: 'bg-blue-500'   },
  crypto: { text: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  badge: 'bg-amber-500/20 text-amber-300',  bar: 'bg-amber-500'  },
  world:  { text: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    badge: 'bg-red-500/20 text-red-300',    bar: 'bg-red-500'    },
  default:{ text: 'text-slate-400',  bg: 'bg-slate-500/10',  border: 'border-slate-500/20',  badge: 'bg-slate-500/20 text-slate-300',  bar: 'bg-slate-500'  },
};

// ─── UTILS ───────────────────────────────────────────────────────────────────
const fmtUSD = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);

function fmtCountdown(dateStr) {
  const diff = new Date(dateStr) - new Date();
  if (diff <= 0) return 'Expired';
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function parseWinPct(record) {
  if (!record) return 0.5;
  const [w, l] = record.split('-').map(Number);
  if (isNaN(w) || isNaN(l) || w + l === 0) return 0.5;
  return w / (w + l);
}

function calcSportsOdds(awayRec, homeRec) {
  const awayPct = parseWinPct(awayRec);
  const homePct = parseWinPct(homeRec);
  const homeAdj = Math.min(0.94, homePct + 0.05); // home advantage
  const total = awayPct + homeAdj;
  const awayWinProb = total > 0 ? awayPct / total : 0.5;
  return Math.min(91, Math.max(9, Math.round(awayWinProb * 100)));
}

function addHouseEdge(trueProb, edge = 3) {
  const yes = Math.min(96, Math.round(trueProb + edge));
  const no  = Math.min(96, Math.round((100 - trueProb) + edge));
  return { yes, no };
}

// ─── ORACLE AI ENGINE ────────────────────────────────────────────────────────
async function callOracle(question, category, context) {
  try {
    const prompt = `You are ORACLE, IFB Risk Markets' prediction intelligence engine. Your job is to set precise, calibrated odds for prediction market contracts.

CONTRACT: "${question}"
CATEGORY: ${category}
LIVE DATA: ${JSON.stringify(context)}

Analyze carefully and return calibrated probability:
- Use all available data signals
- Apply base rates and historical patterns
- Account for uncertainty
- For sports: use win records, home advantage, current form
- For crypto: use price momentum, 24h/7d change, market sentiment
- For world events: use severity, source reliability, historical base rates

Return ONLY valid JSON (no markdown):
{
  "true_probability": 0.67,
  "confidence": 0.82,
  "yes_price": 70,
  "no_price": 33,
  "reasoning": "concise explanation under 120 chars",
  "key_signals": ["signal1", "signal2"],
  "resolution_criteria": "what must happen for YES"
}

Rules:
- yes_price = true_probability*100 + 3 (house edge), clamped 5-95
- no_price = (1-true_probability)*100 + 3, clamped 5-95
- confidence between 0.50 and 0.98`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.15, maxOutputTokens: 512 } }) }
    );
    const data = await res.json();
    const raw  = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch {}
  return null;
}

// ─── DATA FETCHERS ───────────────────────────────────────────────────────────
async function fetchESPNGames(sport) {
  try {
    const res  = await fetch(sport.url);
    const data = await res.json();
    return (data.events || []).map(game => {
      const comp = game.competitions?.[0];
      if (!comp) return null;
      const home = comp.competitors?.find(c => c.homeAway === 'home');
      const away = comp.competitors?.find(c => c.homeAway === 'away');
      if (!home || !away) return null;
      const isCompleted = game.status?.type?.completed;
      const isLive = game.status?.type?.state === 'in';
      if (isCompleted) return null;
      return {
        sport: sport.id, sportLabel: sport.label, sportEmoji: sport.emoji,
        gameId: game.id, gameName: game.name, gameDate: game.date,
        status: game.status?.type?.description || 'Scheduled',
        isLive,
        home: { name: home.team.displayName, short: home.team.abbreviation, logo: home.team.logo, record: home.records?.[0]?.summary || '', score: home.score },
        away: { name: away.team.displayName, short: away.team.abbreviation, logo: away.team.logo, record: away.records?.[0]?.summary || '', score: away.score },
      };
    }).filter(Boolean);
  } catch { return []; }
}

async function fetchCryptoPrices() {
  try {
    const ids = CRYPTO_COINS.map(c => c.id).join(',');
    const res  = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_7d_change=true`);
    return await res.json();
  } catch { return {}; }
}

async function fetchMICHAELEvents() {
  const all = [];
  await Promise.all(WORLD_CATS.map(async cat => {
    try {
      const res  = await fetch(`${MICHAEL_BASE}/api/v1/events?category=${cat.id}&limit=15`, { headers: { 'X-API-Key': MICHAEL_KEY } });
      const data = await res.json();
      (data.events || []).slice(0, 4).forEach(e => all.push({ ...e, _cat: cat.id, _catLabel: cat.label, _emoji: cat.emoji }));
    } catch {}
  }));
  return all;
}

// ─── CONTRACT GENERATORS ─────────────────────────────────────────────────────
function sportsToContracts(games) {
  const contracts = [];
  for (const g of games) {
    const awayWinProb = calcSportsOdds(g.away.record, g.home.record);
    const { yes, no }  = addHouseEdge(awayWinProb);
    const resolveDate  = new Date(new Date(g.gameDate).getTime() + 5 * 3600000).toISOString();
    contracts.push({
      question:    `Will ${g.away.name} beat ${g.home.name}?`,
      description: `${g.away.name} (${g.away.record || 'N/A'}) vs ${g.home.name} (${g.home.record || 'N/A'}) · ${g.status}`,
      category:    'sports',
      sub_category: g.sport,
      event_type:  `${g.sportLabel} — Game Winner`,
      region:      g.gameName,
      yes_price:   yes,
      closes_at:   g.gameDate,
      resolves_at: resolveDate,
      status:      g.isLive ? 'live' : 'open',
      game_status: g.status,
      home_team:   g.home.name,  away_team:  g.away.name,
      home_logo:   g.home.logo,  away_logo:  g.away.logo,
      home_record: g.home.record, away_record: g.away.record,
      live_score:  g.isLive ? `${g.away.score ?? ''} - ${g.home.score ?? ''}` : null,
      espn_game_id: g.gameId,
      source_data: { sport: g.sport, sportEmoji: g.sportEmoji, sportLabel: g.sportLabel, awayWinProb, homeWinProb: 100 - awayWinProb, gameDate: g.gameDate },
    });
  }
  return contracts;
}

function cryptoToContracts(prices) {
  const contracts = [];
  for (const coin of CRYPTO_COINS) {
    const p = prices[coin.id];
    if (!p?.usd) continue;
    const price   = p.usd;
    const ch24    = p.usd_24h_change || 0;
    const ch7d    = p.usd_7d_change  || 0;

    // Contract: Will price be HIGHER than current in 7 days?
    const momentum = (ch24 * 0.4 + (ch7d / 7) * 0.6);
    const bullProb = Math.min(92, Math.max(8, Math.round(50 + momentum * 2)));
    const { yes: yesB, no: noB } = addHouseEdge(bullProb);

    const target7d = parseFloat((price * (1 + (ch24 > 0 ? 0.05 : -0.03))).toFixed(2));
    const eow = new Date(); eow.setDate(eow.getDate() + 7);

    contracts.push({
      question:    `Will ${coin.name} (${coin.symbol}) be above ${fmtUSD(target7d)} by end of week?`,
      description: `Current: ${fmtUSD(price)} · 24h: ${ch24 >= 0 ? '+' : ''}${ch24.toFixed(2)}% · 7d: ${ch7d >= 0 ? '+' : ''}${(ch7d || 0).toFixed(2)}%`,
      category:    'crypto',
      sub_category: coin.id,
      event_type:  `${coin.symbol} Price Target`,
      region:      'Global Crypto Markets',
      yes_price:   yesB,
      closes_at:   eow.toISOString(),
      resolves_at: eow.toISOString(),
      status:      'open',
      coin_symbol: coin.symbol,
      coin_price:  price,
      coin_target: target7d,
      expires_label: '7 days',
      source_data:  { coin: coin.id, symbol: coin.symbol, emoji: coin.emoji, currentPrice: price, change24h: ch24, change7d: ch7d, target: target7d },
    });

    // Contract 2: Will BTC/ETH hit a round number?
    if (['bitcoin','ethereum','solana'].includes(coin.id)) {
      const roundTarget = coin.id === 'bitcoin'
        ? Math.round(price / 5000) * 5000 + (ch24 > 0 ? 5000 : -5000)
        : coin.id === 'ethereum'
        ? Math.round(price / 500) * 500 + (ch24 > 0 ? 500 : -500)
        : Math.round(price / 50) * 50 + (ch24 > 0 ? 50 : -50);

      const pctNeeded = Math.abs((roundTarget - price) / price * 100);
      const prob2 = Math.min(88, Math.max(12, Math.round(50 + momentum * 3 - pctNeeded * 2)));
      const { yes: yR, no: nR } = addHouseEdge(prob2);
      const d14 = new Date(); d14.setDate(d14.getDate() + 14);

      contracts.push({
        question:    `Will ${coin.symbol} reach ${fmtUSD(roundTarget)} within 14 days?`,
        description: `Current: ${fmtUSD(price)} · Target: ${fmtUSD(roundTarget)} (${pctNeeded.toFixed(1)}% away)`,
        category:    'crypto',
        sub_category: coin.id,
        event_type:  `${coin.symbol} Level Break`,
        region:      'Global Crypto Markets',
        yes_price:   yR,
        closes_at:   d14.toISOString(),
        resolves_at: d14.toISOString(),
        status:      'open',
        coin_symbol: coin.symbol,
        coin_price:  price,
        coin_target: roundTarget,
        expires_label: '14 days',
        source_data:  { coin: coin.id, symbol: coin.symbol, emoji: coin.emoji, currentPrice: price, target: roundTarget },
      });
    }
  }
  return contracts;
}

const WORLD_Q_TEMPLATES = {
  'Flood':               (loc) => `Will flooding in ${loc} escalate to critical severity within 7 days?`,
  'Earthquake':          (loc) => `Will seismic activity near ${loc} produce a M5.5+ aftershock within 14 days?`,
  'Wildfire':            (loc) => `Will wildfire near ${loc} expand beyond current boundaries within 10 days?`,
  'Hurricane':           (loc) => `Will tropical storm activity near ${loc} intensify into a Category 3+ hurricane within 7 days?`,
  'Volcanic Eruption':   (loc) => `Will volcanic activity near ${loc} escalate to Level 3 alert within 14 days?`,
  'Severe Storm':        (loc) => `Will severe storm conditions in ${loc} reach peak intensity within 5 days?`,
  'War':                 (loc) => `Will armed conflict in ${loc} intensify or expand territory within 7 days?`,
  'Terrorism':           (loc) => `Will a major terrorist incident be confirmed in ${loc} within 14 days?`,
  'Cyber Threat':        (loc) => `Will a critical infrastructure cyberattack impact ${loc} within 14 days?`,
  'Coup / Instability':  (loc) => `Will a government transition occur in ${loc} within 30 days?`,
  'Sovereign Default':   (loc) => `Will ${loc} miss a scheduled debt payment within 30 days?`,
  'Currency Crisis':     (loc) => `Will ${loc} currency depreciate 10%+ vs USD this month?`,
  'Banking Crisis':      (loc) => `Will a bank failure or bailout be declared in ${loc} within 30 days?`,
  'Ebola':               (loc) => `Will the Ebola outbreak near ${loc} spread to a new province within 21 days?`,
  'Cholera':             (loc) => `Will WHO issue emergency response for Cholera in ${loc} within 14 days?`,
  'Famine':              (loc) => `Will UN formally declare famine conditions in ${loc} within 60 days?`,
  'Dam Failure':         (loc) => `Will emergency evacuations be ordered downstream of ${loc} within 48 hours?`,
  'Power Grid Failure':  (loc) => `Will power restoration reach 80%+ of ${loc} within 7 days?`,
};

const WORLD_DAYS = {
  'Flood': 7, 'Earthquake': 14, 'Hurricane': 5, 'Wildfire': 10, 'Severe Storm': 5,
  'War': 7, 'Terrorism': 14, 'Cyber Threat': 14, 'Coup / Instability': 30,
  'Sovereign Default': 30, 'Currency Crisis': 30, 'Banking Crisis': 30,
  'Ebola': 21, 'Cholera': 14, 'Famine': 60, 'Dam Failure': 2, 'Power Grid Failure': 7,
};

function worldToContracts(events) {
  const seen = new Set();
  return events.filter(e => {
    const key = `${e._cat}:${e.event_type}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).map(e => {
    const loc  = (e.location_name && e.location_name !== 'Unknown') ? e.location_name : `${e._catLabel} zone`;
    const tmpl = WORLD_Q_TEMPLATES[e.event_type];
    const q    = tmpl ? tmpl(loc) : `Will the ${e.event_type} situation in ${loc} worsen within 14 days?`;
    const days = WORLD_DAYS[e.event_type] || 14;
    let prob = 50;
    if (e.severity_level >= 5) prob += 20;
    else if (e.severity_level >= 4) prob += 12;
    if (e.is_forecast) prob += 10;
    prob = Math.min(88, Math.max(12, Math.round(prob + (Math.random() * 10 - 5))));
    const { yes, no } = addHouseEdge(prob);
    const resolves = new Date(); resolves.setDate(resolves.getDate() + days);
    return {
      question:    q,
      description: (e.short_description || e.alert_message || '').slice(0, 240),
      category:    'world',
      sub_category: e._cat,
      event_type:   e.event_type,
      region:       loc,
      yes_price:    yes,
      closes_at:    resolves.toISOString(),
      resolves_at:  resolves.toISOString(),
      status:       'open',
      michael_event_id: e.event_id || null,
      expires_label: `${days}d`,
      source_data:  { cat: e._cat, catLabel: e._catLabel, emoji: e._emoji, severity: e.severity_level, is_forecast: e.is_forecast, lat: e.latitude, lng: e.longitude },
    };
  });
}

// ─── ORACLE BATCH PRICING ────────────────────────────────────────────────────
async function applyOraclePricing(contracts) {
  // Use ORACLE on the first 8 contracts (rate limit friendly)
  const withOracle = contracts.slice(0, 8);
  const results = await Promise.all(withOracle.map(async c => {
    const oracle = await callOracle(c.question, c.category, c.source_data);
    if (!oracle) return c;
    return {
      ...c,
      yes_price:          oracle.yes_price  || c.yes_price,
      oracle_probability: oracle.true_probability ? parseFloat((oracle.true_probability * 100).toFixed(2)) : null,
      oracle_confidence:  oracle.confidence  ? parseFloat((oracle.confidence * 100).toFixed(2)) : null,
      oracle_reasoning:   oracle.reasoning   || null,
    };
  }));
  return [...results, ...contracts.slice(8)];
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function GlobalRiskMarkets({ session, balances, fetchAllData }) {
  const [activeTab,     setActiveTab]     = useState('all');
  const [activeSport,   setActiveSport]   = useState(null);
  const [activeView,    setActiveView]    = useState('markets');
  const [contracts,     setContracts]     = useState([]);
  const [positions,     setPositions]     = useState([]);
  const [isLoading,     setIsLoading]     = useState(true);
  const [isGenerating,  setIsGenerating]  = useState(false);
  const [buyModal,      setBuyModal]      = useState(null);
  const [betAmount,     setBetAmount]     = useState('25');
  const [isBuying,      setIsBuying]      = useState(false);
  const [toast,         setToast]         = useState('');
  const [oracleRunning, setOracleRunning] = useState(false);
  const [totalVolume,   setTotalVolume]   = useState(0);
  const toastRef = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(''), 4000);
  };

  const loadContracts = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('risk_market_contracts')
      .select('*')
      .in('status', ['open', 'live'])
      .order('created_at', { ascending: false })
      .limit(200);
    setContracts(data || []);
    const vol = (data || []).reduce((s, c) => s + (c.total_yes_volume || 0) + (c.total_no_volume || 0), 0);
    setTotalVolume(vol);
    setIsLoading(false);
  }, []);

  const loadPositions = useCallback(async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from('risk_market_positions')
      .select('*, risk_market_contracts(question, category, sub_category, event_type, yes_price, status, home_team, away_team, coin_symbol, source_data)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    setPositions(data || []);
  }, [session]);

  useEffect(() => {
    Promise.all([loadContracts(), loadPositions()]);
  }, [loadContracts, loadPositions]);

  async function generateAllMarkets() {
    setIsGenerating(true);
    showToast('ORACLE is scanning all live data sources...');
    try {
      // 1. Fetch all data in parallel
      const [sportGames, cryptoPrices, worldEvents] = await Promise.all([
        Promise.all(SPORT_SOURCES.map(fetchESPNGames)).then(results => results.flat()),
        fetchCryptoPrices(),
        fetchMICHAELEvents(),
      ]);

      // 2. Generate raw contracts from each source
      const rawSports = sportsToContracts(sportGames);
      const rawCrypto = cryptoToContracts(cryptoPrices);
      const rawWorld  = worldToContracts(worldEvents);

      const allRaw = [...rawSports, ...rawCrypto, ...rawWorld];
      if (!allRaw.length) { showToast('No live events found'); setIsGenerating(false); return; }

      // 3. Apply ORACLE pricing to top contracts
      showToast(`ORACLE is pricing ${allRaw.length} contracts...`);
      setOracleRunning(true);
      const priced = await applyOraclePricing(allRaw);
      setOracleRunning(false);

      // 4. Clear old open contracts and insert new batch
      await supabase.from('risk_market_contracts')
        .update({ status: 'voided' })
        .in('status', ['open', 'live'])
        .lt('created_at', new Date(Date.now() - 6 * 3600000).toISOString()); // void contracts > 6h old

      const { error } = await supabase.from('risk_market_contracts').insert(priced);
      if (error) throw error;

      showToast(`✅ ${priced.length} markets live — Sports: ${rawSports.length} · Crypto: ${rawCrypto.length} · World: ${rawWorld.length}`);
      await loadContracts();
    } catch (err) {
      showToast('Generation error: ' + err.message);
    } finally {
      setIsGenerating(false);
      setOracleRunning(false);
    }
  }

  async function handleBuy() {
    if (!buyModal) return;
    const amount = parseFloat(betAmount);
    if (!amount || amount < 1) { showToast('Minimum bet is $1'); return; }
    if (amount > (balances?.liquid_usd || 0)) { showToast('Insufficient liquid balance'); return; }

    setIsBuying(true);
    const { contract, side } = buyModal;
    const price   = side === 'yes' ? contract.yes_price : (100 - contract.yes_price);
    const shares  = parseFloat(((amount / price) * 100).toFixed(4));
    const payout  = parseFloat(shares.toFixed(4));

    try {
      const { error } = await supabase.from('risk_market_positions').insert({
        contract_id: contract.id, user_id: session.user.id,
        side, shares, entry_price: price, amount_paid: amount, status: 'open',
      });
      if (error) throw error;

      // Price impact: $10 = 1¢ shift
      const shift  = side === 'yes' ? Math.min(amount / 10, 12) : -Math.min(amount / 10, 12);
      const newYes = Math.min(96, Math.max(4, parseFloat((contract.yes_price + shift).toFixed(2))));
      await supabase.from('risk_market_contracts').update({
        yes_price: newYes,
        pool_size: parseFloat(((contract.pool_size || 0) + amount).toFixed(2)),
        total_yes_volume: side === 'yes' ? parseFloat(((contract.total_yes_volume || 0) + amount).toFixed(2)) : contract.total_yes_volume,
        total_no_volume:  side === 'no'  ? parseFloat(((contract.total_no_volume  || 0) + amount).toFixed(2)) : contract.total_no_volume,
      }).eq('id', contract.id);

      setBuyModal(null); setBetAmount('25');
      showToast(`Position opened · ${shares.toFixed(2)} ${side.toUpperCase()} shares · Win: ${fmtUSD(payout)}`);
      await Promise.all([loadContracts(), loadPositions()]);
      if (fetchAllData) fetchAllData();
    } catch (err) {
      showToast('Error: ' + err.message);
    } finally {
      setIsBuying(false);
    }
  }

  // ─── FILTERING ──────────────────────────────────────────────────────────────
  let filtered = contracts;
  if (activeTab === 'sports') {
    filtered = activeSport ? contracts.filter(c => c.category === 'sports' && c.sub_category === activeSport) : contracts.filter(c => c.category === 'sports');
  } else if (activeTab === 'crypto') {
    filtered = contracts.filter(c => c.category === 'crypto');
  } else if (activeTab === 'world') {
    filtered = contracts.filter(c => c.category === 'world');
  }

  const catC = (cat) => CAT_COLOR[cat] || CAT_COLOR.default;

  // ─── CONTRACT CARD ──────────────────────────────────────────────────────────
  function ContractCard({ contract: c }) {
    const yes  = parseFloat(c.yes_price) || 50;
    const no   = 100 - yes;
    const vol  = (c.total_yes_volume || 0) + (c.total_no_volume || 0);
    const cc   = catC(c.category);
    const sd   = c.source_data || {};
    const isLive = c.status === 'live';

    return (
      <div className={`bg-slate-900 border ${cc.border} rounded-[1.8rem] p-5 flex flex-col gap-3 hover:border-opacity-70 transition-all group`}>
        {/* Top row: badges + live indicator */}
        <div className="flex items-center gap-2 flex-wrap">
          {isLive && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500/20 border border-red-500/30 rounded-full text-red-400 text-[9px] font-black uppercase tracking-widest animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />LIVE
            </span>
          )}
          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${cc.badge}`}>
            {sd.sportEmoji || sd.emoji || (c.category === 'crypto' ? '💹' : '🌍')} {c.sub_category?.toUpperCase() || c.category}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[9px] font-black uppercase">
            {c.event_type}
          </span>
          {c.oracle_confidence && (
            <span className="ml-auto flex items-center gap-1 text-[9px] font-black text-purple-400">
              <Brain size={10} /> {c.oracle_confidence.toFixed(0)}%
            </span>
          )}
        </div>

        {/* Team logos for sports */}
        {c.category === 'sports' && c.home_team && (
          <div className="flex items-center gap-2 py-1">
            {c.away_logo && <img src={c.away_logo} alt={c.away_team} className="w-8 h-8 object-contain rounded" onError={e=>e.target.style.display='none'} />}
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-black leading-tight truncate">{c.away_team}</p>
              <p className="text-slate-500 text-[9px] font-bold">{c.away_record || ''}</p>
            </div>
            <span className="text-slate-500 text-[10px] font-black px-2">vs</span>
            <div className="flex-1 min-w-0 text-right">
              <p className="text-white text-xs font-black leading-tight truncate">{c.home_team}</p>
              <p className="text-slate-500 text-[9px] font-bold">{c.home_record || ''}</p>
            </div>
            {c.home_logo && <img src={c.home_logo} alt={c.home_team} className="w-8 h-8 object-contain rounded" onError={e=>e.target.style.display='none'} />}
          </div>
        )}

        {/* Coin info for crypto */}
        {c.category === 'crypto' && c.coin_price && (
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-slate-400 text-[9px] font-black uppercase">Current</p>
              <p className="text-white text-sm font-black">{fmtUSD(c.coin_price)}</p>
            </div>
            <ChevronRight size={14} className="text-slate-600" />
            <div className="text-right">
              <p className="text-slate-400 text-[9px] font-black uppercase">Target</p>
              <p className={`text-sm font-black ${c.coin_target > c.coin_price ? 'text-emerald-400' : 'text-red-400'}`}>{fmtUSD(c.coin_target)}</p>
            </div>
          </div>
        )}

        {/* Question */}
        <p className="text-white font-bold text-sm leading-snug">{c.question}</p>

        {/* ORACLE reasoning */}
        {c.oracle_reasoning && (
          <p className="text-[10px] text-purple-400/80 italic leading-relaxed border-l-2 border-purple-500/30 pl-2">
            ORACLE: {c.oracle_reasoning}
          </p>
        )}

        {/* Probability bar */}
        <div>
          <div className="flex justify-between text-[9px] font-black mb-1">
            <span className="text-emerald-400">YES {yes}¢</span>
            <span className="text-red-400">NO {no}¢</span>
          </div>
          <div className="h-2 bg-slate-700/60 rounded-full overflow-hidden flex">
            <div className="bg-emerald-500 h-full transition-all duration-700" style={{ width: `${yes}%` }} />
            <div className="bg-red-500   h-full transition-all duration-700" style={{ width: `${no}%` }}  />
          </div>
          <div className="flex justify-between text-[8px] text-slate-600 font-bold mt-1">
            <span className="flex items-center gap-1"><Clock size={9} /> {fmtCountdown(c.resolves_at)}</span>
            <span>Vol: {fmtUSD(vol)}</span>
          </div>
        </div>

        {/* Buy buttons */}
        <div className="flex gap-2 mt-1">
          <button
            onClick={() => { setBuyModal({ contract: c, side: 'yes' }); setBetAmount('25'); }}
            className="flex-1 py-2.5 bg-emerald-600/15 hover:bg-emerald-600 border border-emerald-500/30 hover:border-emerald-500 text-emerald-400 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1"
          >
            <ArrowUpRight size={11} /> YES · {yes}¢
          </button>
          <button
            onClick={() => { setBuyModal({ contract: c, side: 'no' }); setBetAmount('25'); }}
            className="flex-1 py-2.5 bg-red-600/15 hover:bg-red-600 border border-red-500/30 hover:border-red-500 text-red-400 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1"
          >
            <ArrowDownRight size={11} /> NO · {no}¢
          </button>
        </div>
      </div>
    );
  }

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-500">

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-[9999] bg-slate-900 border border-slate-700 text-white text-sm font-bold px-5 py-3 rounded-2xl shadow-2xl max-w-sm animate-in slide-in-from-top-4 duration-300">
          {toast}
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-7 mb-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/15 via-slate-900 to-purple-900/10 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">ORACLE Intelligence · Powered by MICHAEL + ESPN + CoinGecko</span>
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">IFB Risk Markets</h1>
              <p className="text-sm text-slate-400 mt-1 max-w-lg">Bet YES or NO against IFB on any event — sports, crypto, global risk. ORACLE AI sets the odds. You win, IFB pays. IFB wins, house keeps.</p>
            </div>
            <button
              onClick={generateAllMarkets}
              disabled={isGenerating}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-60 shadow-lg"
            >
              {isGenerating ? <RefreshCw size={13} className="animate-spin" /> : <Brain size={13} />}
              {oracleRunning ? 'ORACLE Pricing...' : isGenerating ? 'Scanning...' : 'Generate All Markets'}
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Active Markets', value: contracts.length, Icon: BarChart3, color: 'text-blue-400' },
              { label: 'Total Volume',   value: fmtUSD(totalVolume), Icon: DollarSign, color: 'text-emerald-400' },
              { label: 'My Positions',   value: positions.filter(p => p.status === 'open').length, Icon: Trophy, color: 'text-amber-400' },
              { label: 'Sports Live',    value: contracts.filter(c => c.status === 'live').length, Icon: Flame, color: 'text-red-400' },
            ].map(({ label, value, Icon, color }) => (
              <div key={label} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-3 text-center">
                <Icon size={16} className={`${color} mx-auto mb-1.5`} />
                <p className="text-base font-black text-white">{value}</p>
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── VIEW TABS ── */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[
          { id: 'markets',   label: 'Markets',     Icon: Globe  },
          { id: 'positions', label: 'My Bets',     Icon: Trophy },
          { id: 'info',      label: 'How It Works', Icon: Info   },
        ].map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setActiveView(id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeView === id ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'}`}>
            <Icon size={13} /> {label}
            {id === 'positions' && positions.filter(p=>p.status==='open').length > 0 && (
              <span className="bg-amber-500 text-black text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">{positions.filter(p=>p.status==='open').length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ══ MARKETS VIEW ══ */}
      {activeView === 'markets' && (
        <>
          {/* Main category tabs */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {ALL_CATS.map(cat => (
              <button key={cat.id} onClick={() => { setActiveTab(cat.id); setActiveSport(null); }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === cat.id ? 'bg-white text-slate-900 shadow-md' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'}`}>
                {cat.emoji} {cat.label}
                <span className={`text-[8px] rounded-full px-1.5 py-0.5 ${activeTab === cat.id ? 'bg-slate-200' : 'bg-slate-800'}`}>
                  {cat.id === 'all' ? contracts.length : contracts.filter(c => cat.id === 'world' ? c.category === 'world' : c.category === cat.id).length}
                </span>
              </button>
            ))}
          </div>

          {/* Sport sub-tabs (only when sports tab active) */}
          {activeTab === 'sports' && (
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
              <button onClick={() => setActiveSport(null)}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${!activeSport ? 'bg-blue-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'}`}>
                All Sports
              </button>
              {SPORT_SOURCES.map(s => {
                const cnt = contracts.filter(c => c.category === 'sports' && c.sub_category === s.id).length;
                if (!cnt) return null;
                return (
                  <button key={s.id} onClick={() => setActiveSport(s.id)}
                    className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeSport === s.id ? 'bg-blue-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'}`}>
                    {s.emoji} {s.label} <span className="opacity-60">{cnt}</span>
                  </button>
                );
              })}
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <RefreshCw size={32} className="animate-spin text-blue-500" />
              <p className="text-slate-400 text-sm font-bold">Loading markets...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 bg-slate-900 border border-slate-800 rounded-[2rem]">
              <Brain size={40} className="text-slate-600 mx-auto mb-4" />
              <p className="text-white font-black text-lg mb-2">No markets yet</p>
              <p className="text-slate-500 text-sm mb-6 max-w-xs mx-auto">Click "Generate All Markets" to let ORACLE scan ESPN, CoinGecko, and MICHAEL simultaneously</p>
              <button onClick={generateAllMarkets} disabled={isGenerating}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all">
                {isGenerating ? 'Generating...' : '⚡ Generate All Markets'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map(c => <ContractCard key={c.id} contract={c} />)}
            </div>
          )}
        </>
      )}

      {/* ══ POSITIONS VIEW ══ */}
      {activeView === 'positions' && (
        <div className="space-y-4">
          {positions.length === 0 ? (
            <div className="text-center py-24 bg-slate-900 border border-slate-800 rounded-[2rem]">
              <Trophy size={40} className="text-slate-600 mx-auto mb-4" />
              <p className="text-white font-black text-lg mb-2">No bets yet</p>
              <p className="text-slate-500 text-sm">Go to Markets and buy YES or NO on any contract</p>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3 mb-2">
                {[
                  { l: 'Open', v: positions.filter(p=>p.status==='open').length,  c:'text-blue-400'   },
                  { l: 'Won',  v: positions.filter(p=>p.status==='won').length,   c:'text-emerald-400'},
                  { l: 'Lost', v: positions.filter(p=>p.status==='lost').length,  c:'text-red-400'    },
                ].map(({l,v,c}) => (
                  <div key={l} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                    <p className={`text-2xl font-black ${c}`}>{v}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{l}</p>
                  </div>
                ))}
              </div>

              {positions.map(pos => {
                const c = pos.risk_market_contracts;
                const cc = catC(c?.category || 'default');
                const curPrice = pos.side === 'yes' ? parseFloat(c?.yes_price||50) : 100-parseFloat(c?.yes_price||50);
                const curVal = (pos.shares * curPrice) / 100;
                const pnl = curVal - pos.amount_paid;
                return (
                  <div key={pos.id} className={`bg-slate-900 border ${cc.border} rounded-2xl p-5`}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <p className="text-white font-bold text-sm leading-snug flex-1">{c?.question || '—'}</p>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${pos.side==='yes'?'bg-emerald-500/20 text-emerald-400':'bg-red-500/20 text-red-400'}`}>{pos.side.toUpperCase()}</span>
                        <span className={`text-[9px] font-black uppercase ${pos.status==='won'?'text-emerald-400':pos.status==='lost'?'text-red-400':'text-slate-400'}`}>{pos.status}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      {[['Shares',pos.shares.toFixed(2)],['Paid',fmtUSD(pos.amount_paid)],['Value',fmtUSD(curVal)],['P&L',`${pnl>=0?'+':''}${fmtUSD(pnl)}`]].map(([lbl,val])=>(
                        <div key={lbl} className="bg-slate-800/60 rounded-xl p-2">
                          <p className={`text-xs font-black ${lbl==='P&L'?(pnl>=0?'text-emerald-400':'text-red-400'):'text-white'}`}>{val}</p>
                          <p className="text-[8px] font-black uppercase tracking-widest text-slate-600">{lbl}</p>
                        </div>
                      ))}
                    </div>
                    {pos.payout != null && <p className="text-[10px] font-black text-emerald-400 text-right mt-2">Settled: {fmtUSD(pos.payout)}</p>}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* ══ INFO VIEW ══ */}
      {activeView === 'info' && (
        <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Brain size={20} className="text-purple-400" />
              <h3 className="text-xl font-black text-white">ORACLE — The Prediction Engine</h3>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">ORACLE is IFB's AI prediction intelligence. It analyzes live data from ESPN (sports), CoinGecko (crypto), and MICHAEL API (global risk events) to generate calibrated probability estimates. ORACLE uses Gemini AI with structured prompts to reason about outcomes and set fair odds with a small house edge.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { emoji: '🏆', title: 'Sports', body: 'Win records, home advantage, current form, live scores from ESPN' },
              { emoji: '💹', title: 'Crypto', body: '24h/7d price momentum, market sentiment, round-number targets via CoinGecko' },
              { emoji: '🌍', title: 'World Events', body: 'Event severity, AI forecasts, historical base rates via MICHAEL Global Ops API' },
            ].map(({emoji,title,body}) => (
              <div key={title} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4">
                <p className="text-2xl mb-2">{emoji}</p>
                <p className="text-white font-black mb-1">{title}</p>
                <p className="text-slate-400 text-xs leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
          {[
            ['01','House Book Model','You bet against IFB — not other users. IFB accepts all bets and pays winners directly from the risk pool. No liquidity issues, always instantly matched.'],
            ['02','Share Pricing','Each YES share costs P¢ where P = ORACLE\'s probability estimate + 3¢ house edge. If YES wins, each share pays $1.00. NO shares cost (100-P)¢ and also pay $1.00 if NO wins.'],
            ['03','Example Trade','ORACLE says 70% chance Team A wins. YES price = 73¢. You bet $73. If Team A wins, you receive $100 (+$27 profit, +37% return). If they lose, IFB keeps your $73.'],
            ['04','ORACLE Accuracy','ORACLE uses live data + AI reasoning to minimize house edge while maintaining positive expected value for IFB. High confidence = narrower spread. Lower confidence = wider spread.'],
            ['05','Resolution','Contracts resolve automatically when MICHAEL records the event, when the game ends (ESPN), or when the price window closes (CoinGecko). Admin manually triggers settlement and payout.'],
          ].map(({0:step,1:title,2:body}) => (
            <div key={step} className="flex gap-4">
              <div className="w-10 h-10 rounded-2xl bg-purple-600/20 border border-purple-500/20 text-purple-400 text-[10px] font-black flex items-center justify-center shrink-0">{step}</div>
              <div>
                <p className="text-white font-black mb-1">{title}</p>
                <p className="text-slate-400 text-sm leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
            <p className="text-amber-400 text-[10px] font-black uppercase tracking-widest mb-1">Risk Disclosure</p>
            <p className="text-slate-400 text-xs">Prediction markets carry financial risk. You may lose your entire stake. For educational and entertainment purposes only. IFB maintains a risk pool and may void contracts if data sources are unavailable.</p>
          </div>
        </div>
      )}

      {/* ══ BUY MODAL ══ */}
      {buyModal && (() => {
        const { contract: c, side } = buyModal;
        const price   = side === 'yes' ? c.yes_price : (100 - c.yes_price);
        const amount  = parseFloat(betAmount) || 0;
        const shares  = amount > 0 ? ((amount / price) * 100).toFixed(2) : '0';
        const profit  = parseFloat(shares) - amount;
        const profPct = amount > 0 ? ((profit / amount) * 100).toFixed(0) : '0';
        return (
          <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-[2rem] w-full max-w-md p-6 animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${side==='yes'?'text-emerald-400':'text-red-400'}`}>Buy {side.toUpperCase()} — IFB Risk Markets</p>
                  <p className="text-white font-bold text-sm leading-snug max-w-[280px]">{c.question}</p>
                  {c.oracle_reasoning && <p className="text-purple-400/70 text-[10px] italic mt-1.5">ORACLE: {c.oracle_reasoning}</p>}
                </div>
                <button onClick={()=>setBuyModal(null)} className="w-9 h-9 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-white"><X size={16}/></button>
              </div>

              <div className={`rounded-2xl p-4 mb-4 ${side==='yes'?'bg-emerald-500/10 border border-emerald-500/20':'bg-red-500/10 border border-red-500/20'}`}>
                {[['Current price',`${price}¢ / share`],['Win payout','$1.00 / share'],['If you win',`+${profPct}% return`],['ORACLE confidence',c.oracle_confidence?`${c.oracle_confidence.toFixed(0)}%`:'N/A']].map(([l,v])=>(
                  <div key={l} className="flex justify-between text-sm font-bold mt-1 first:mt-0">
                    <span className="text-slate-400">{l}</span>
                    <span className={`font-black ${l==='If you win'?(side==='yes'?'text-emerald-400':'text-red-400'):'text-white'}`}>{v}</span>
                  </div>
                ))}
              </div>

              <div className="mb-4">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Bet Amount (USD)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">$</span>
                  <input type="number" min="1" step="1" value={betAmount} onChange={e=>setBetAmount(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-8 pr-4 py-4 font-black text-white text-lg outline-none focus:border-blue-500"/>
                </div>
                <div className="flex gap-2 mt-2">
                  {[5,10,25,50,100,250].map(v=>(
                    <button key={v} onClick={()=>setBetAmount(String(v))} className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-[9px] font-black text-slate-400 hover:text-white transition-colors">${v}</button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-800/60 rounded-2xl p-4 mb-5 space-y-1.5">
                {[['You pay',fmtUSD(amount)],['You receive',`${shares} shares`],['If you win',fmtUSD(parseFloat(shares))],['Net profit',fmtUSD(profit)],['Balance after',fmtUSD((balances?.liquid_usd||0)-amount)]].map(([l,v])=>(
                  <div key={l} className="flex justify-between text-xs font-bold">
                    <span className="text-slate-400">{l}</span>
                    <span className={`font-black ${l==='Net profit'?(profit>0?'text-emerald-400':'text-red-400'):l==='Balance after'?(((balances?.liquid_usd||0)-amount)<0?'text-red-400':'text-slate-400'):'text-white'}`}>{v}</span>
                  </div>
                ))}
              </div>

              <button onClick={handleBuy} disabled={isBuying||amount<=0||amount>(balances?.liquid_usd||0)}
                className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-40 ${side==='yes'?'bg-emerald-600 hover:bg-emerald-500':'bg-red-600 hover:bg-red-500'} text-white`}>
                {isBuying ? <RefreshCw size={16} className="animate-spin mx-auto"/> : `Confirm — Bet ${side.toUpperCase()} · ${fmtUSD(amount)}`}
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
