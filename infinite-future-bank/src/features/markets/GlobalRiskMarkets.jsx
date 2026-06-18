import React, { useState, useEffect, useCallback } from 'react';
import {
  Waves, ShieldAlert, TrendingDown, Stethoscope, Leaf, Building2,
  TrendingUp, TrendingDown as TDown, Clock, Globe, Zap, RefreshCw,
  ChevronRight, X, Info, BarChart3, Trophy, AlertTriangle, CheckCircle2,
  Activity, DollarSign, Users, Target, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

const MICHAEL_BASE = 'https://michael-api-382117221028.us-central1.run.app';
const MICHAEL_KEY  = import.meta.env.VITE_MICHAEL_API_KEY;

const FETCH_CATS = ['environmental','security','financial','epidemic','food+security','infrastructure'];

const CAT_META = {
  environmental:    { label: 'Environmental',  Icon: Waves,       color: 'blue',   emoji: '🌊' },
  security:         { label: 'Security',        Icon: ShieldAlert, color: 'red',    emoji: '🛡️' },
  financial:        { label: 'Financial',       Icon: TrendingDown,color: 'amber',  emoji: '💰' },
  epidemic:         { label: 'Epidemic',        Icon: Stethoscope, color: 'purple', emoji: '🦠' },
  'food+security':  { label: 'Food Crisis',     Icon: Leaf,        color: 'orange', emoji: '🌾' },
  infrastructure:   { label: 'Infrastructure',  Icon: Building2,   color: 'yellow', emoji: '⚡' },
};

const COLOR = {
  blue:   { bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/20',   badge: 'bg-blue-500/20 text-blue-300',   bar: 'bg-blue-500'   },
  red:    { bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/20',    badge: 'bg-red-500/20 text-red-300',    bar: 'bg-red-500'    },
  amber:  { bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/20',  badge: 'bg-amber-500/20 text-amber-300',  bar: 'bg-amber-500'  },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', badge: 'bg-purple-500/20 text-purple-300', bar: 'bg-purple-500' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', badge: 'bg-orange-500/20 text-orange-300', bar: 'bg-orange-500' },
  yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20', badge: 'bg-yellow-500/20 text-yellow-300', bar: 'bg-yellow-500' },
  slate:  { bg: 'bg-slate-500/10',  text: 'text-slate-400',  border: 'border-slate-500/20',  badge: 'bg-slate-500/20 text-slate-300',  bar: 'bg-slate-500'  },
};

function generateQuestion(event) {
  const loc = (event.location_name && event.location_name !== 'Unknown') ? event.location_name : 'the affected region';
  const q = {
    'Flood':                `Will flooding in ${loc} escalate to critical severity within 7 days?`,
    'Earthquake':           `Will seismic activity near ${loc} produce a magnitude 5.5+ aftershock within 14 days?`,
    'Wildfire':             `Will the active wildfire near ${loc} expand beyond current boundaries within 10 days?`,
    'Hurricane':            `Will tropical storm activity near ${loc} intensify into a major hurricane within 7 days?`,
    'Volcanic Eruption':    `Will volcanic activity near ${loc} escalate to a Level 3 alert within 14 days?`,
    'Severe Storm':         `Will severe storm conditions in ${loc} reach peak intensity within 5 days?`,
    'Tsunami':              `Will authorities issue a tsunami warning for ${loc} within 30 days?`,
    'Drought':              `Will drought conditions in ${loc} worsen to an emergency level this month?`,
    'Glacial Lake Outburst':`Will authorities issue flood alerts related to glacial conditions near ${loc} within 21 days?`,
    'War':                  `Will armed conflict activity in ${loc} intensify or expand territory within 7 days?`,
    'Terrorism':            `Will a major security incident be confirmed in ${loc} within 14 days?`,
    'Cyber Threat':         `Will a confirmed critical infrastructure cyberattack impact ${loc} within 14 days?`,
    'Civil Unrest':         `Will civil unrest in ${loc} escalate to a state of emergency within 7 days?`,
    'Coup / Instability':   `Will a government transition occur in ${loc} within the next 30 days?`,
    'Humanitarian Crisis':  `Will UN emergency relief operations expand in ${loc} within 14 days?`,
    'Maritime Piracy':      `Will a maritime piracy incident be confirmed near ${loc} within 21 days?`,
    'Mass Kidnapping':      `Will authorities confirm a hostage situation in ${loc} within 14 days?`,
    'Nuclear Threat':       `Will international agencies raise a nuclear threat alert for ${loc} within 30 days?`,
    'Sovereign Default':    `Will ${loc} miss a scheduled sovereign debt payment within 30 days?`,
    'Currency Crisis':      `Will ${loc} currency depreciate more than 10% against the USD this month?`,
    'Banking Crisis':       `Will a bank failure or emergency bailout be declared in ${loc} within 30 days?`,
    'Energy Crisis':        `Will energy rationing measures be implemented in ${loc} within 21 days?`,
    'Sanctions Crisis':     `Will new international sanctions be imposed on ${loc} within 30 days?`,
    'Liquidity Crunch':     `Will ${loc} access emergency IMF liquidity support within 30 days?`,
    'Ebola':                `Will the Ebola outbreak near ${loc} spread to a new province within 21 days?`,
    'Cholera':              `Will WHO issue an emergency response for the Cholera crisis in ${loc} within 14 days?`,
    'Dengue Fever':         `Will dengue cases in ${loc} surpass the regional outbreak threshold within 21 days?`,
    'Disease Outbreak':     `Will the disease outbreak in ${loc} exceed 1,000 confirmed cases within 30 days?`,
    'Pandemic':             `Will WHO raise a pandemic alert level within the next 60 days?`,
    'Mpox':                 `Will Mpox case counts in ${loc} double within the next 14 days?`,
    'Famine':               `Will the UN formally declare famine conditions in ${loc} within 60 days?`,
    'Food Crisis':          `Will food crisis conditions in ${loc} be classified as Phase 4 Emergency within 30 days?`,
    'Locust Infestation':   `Will locust swarms near ${loc} destroy cropland beyond the current containment zone within 21 days?`,
    'Crop Failure':         `Will ${loc} declare a national agricultural emergency within 30 days?`,
    'Dam Failure':          `Will emergency evacuation orders be issued downstream of ${loc} within 48 hours?`,
    'Power Grid Failure':   `Will power restoration reach 80%+ of affected areas near ${loc} within 7 days?`,
    'Health System Collapse':`Will WHO deploy emergency medical teams to ${loc} within 30 days?`,
    'Transport Disaster':   `Will authorities confirm additional casualties in the ${loc} transport incident within 7 days?`,
  };
  return q[event.event_type] || `Will the ${event.event_type} situation in ${loc} worsen within 14 days?`;
}

function getStartingPrice(event) {
  let price = 45;
  const sev = event.severity_level || 3;
  if (sev >= 5) price += 20;
  else if (sev >= 4) price += 12;
  else if (sev >= 3) price += 5;
  if (event.is_forecast) price += 12;
  price += (Math.random() * 14 - 7);
  return Math.min(92, Math.max(8, Math.round(price)));
}

function getResolvesAt(event) {
  const days = {
    'Flood': 7, 'Earthquake': 14, 'Hurricane': 5, 'Wildfire': 10, 'Severe Storm': 5,
    'Volcanic Eruption': 14, 'Tsunami': 30, 'Drought': 30, 'War': 7, 'Terrorism': 14,
    'Cyber Threat': 14, 'Civil Unrest': 7, 'Coup / Instability': 30, 'Sovereign Default': 30,
    'Currency Crisis': 30, 'Banking Crisis': 30, 'Energy Crisis': 21, 'Ebola': 21,
    'Cholera': 14, 'Disease Outbreak': 30, 'Pandemic': 60, 'Famine': 60, 'Food Crisis': 30,
    'Locust Infestation': 21, 'Dam Failure': 2, 'Power Grid Failure': 7,
  };
  const d = new Date();
  d.setDate(d.getDate() + (days[event.event_type] || 14));
  return d.toISOString();
}

function fmtCountdown(dateStr) {
  const diff = new Date(dateStr) - new Date();
  if (diff <= 0) return 'Expired';
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  if (d > 0) return `${d}d ${h}h`;
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function fmtUSD(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);
}

export default function GlobalRiskMarkets({ session, balances, fetchAllData }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeView, setActiveView]         = useState('markets');
  const [contracts, setContracts]           = useState([]);
  const [positions, setPositions]           = useState([]);
  const [isLoading, setIsLoading]           = useState(true);
  const [isGenerating, setIsGenerating]     = useState(false);
  const [buyModal, setBuyModal]             = useState(null);
  const [betAmount, setBetAmount]           = useState('10');
  const [isBuying, setIsBuying]             = useState(false);
  const [toast, setToast]                   = useState('');
  const [stats, setStats]                   = useState({ totalContracts: 0, totalVolume: 0, myPositions: 0 });

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadContracts = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('risk_market_contracts')
      .select('*')
      .in('status', ['open', 'closed'])
      .order('created_at', { ascending: false });
    setContracts(data || []);
    setIsLoading(false);
  }, []);

  const loadPositions = useCallback(async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from('risk_market_positions')
      .select('*, risk_market_contracts(question, category, event_type, yes_price, status, outcome)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    setPositions(data || []);
  }, [session]);

  useEffect(() => {
    Promise.all([loadContracts(), loadPositions()]);
  }, [loadContracts, loadPositions]);

  useEffect(() => {
    const vol = contracts.reduce((s, c) => s + (c.total_yes_volume || 0) + (c.total_no_volume || 0), 0);
    setStats({ totalContracts: contracts.length, totalVolume: vol, myPositions: positions.filter(p => p.status === 'open').length });
  }, [contracts, positions]);

  async function generateFromMICHAEL() {
    setIsGenerating(true);
    try {
      const allEvents = [];
      await Promise.all(FETCH_CATS.map(async cat => {
        try {
          const res = await fetch(`${MICHAEL_BASE}/api/v1/events?category=${cat}&limit=25`, { headers: { 'X-API-Key': MICHAEL_KEY } });
          const data = await res.json();
          (data.events || []).slice(0, 6).forEach(e => allEvents.push({ ...e, _cat: cat }));
        } catch {}
      }));

      if (!allEvents.length) { showToast('Could not reach MICHAEL API'); return; }

      // Deduplicate by event_type+category — one contract per type per category
      const seen = new Set();
      const selected = allEvents.filter(e => {
        const key = `${e._cat}:${e.event_type}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 24);

      const toInsert = selected.map(e => ({
        question:         generateQuestion(e),
        description:      (e.short_description || e.alert_message || '').slice(0, 280),
        category:         e._cat,
        event_type:       e.event_type,
        region:           (e.location_name && e.location_name !== 'Unknown') ? e.location_name : null,
        yes_price:        getStartingPrice(e),
        closes_at:        new Date(new Date(getResolvesAt(e)).getTime() - 86400000).toISOString(),
        resolves_at:      getResolvesAt(e),
        status:           'open',
        michael_event_id: e.event_id || null,
        source_data:      { lat: e.latitude, lng: e.longitude, severity: e.severity_level, source: e.source, is_forecast: e.is_forecast },
      }));

      const { error } = await supabase.from('risk_market_contracts').insert(toInsert);
      if (error) throw error;
      showToast(`${toInsert.length} new markets generated from MICHAEL live events`);
      await loadContracts();
    } catch (err) {
      showToast('Generation failed: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleBuy() {
    if (!buyModal || !betAmount) return;
    const amount = parseFloat(betAmount);
    if (amount < 1) { showToast('Minimum bet is $1'); return; }
    if (amount > (balances?.liquid_usd || 0)) { showToast('Insufficient liquid balance'); return; }

    setIsBuying(true);
    const { contract, side } = buyModal;
    const price     = side === 'yes' ? contract.yes_price : (100 - contract.yes_price);
    const shares    = (amount / price) * 100;
    const potential = shares * 1; // $1 per share if win

    try {
      const { error: posErr } = await supabase.from('risk_market_positions').insert({
        contract_id:  contract.id,
        user_id:      session.user.id,
        side,
        shares:       parseFloat(shares.toFixed(4)),
        entry_price:  price,
        amount_paid:  amount,
        status:       'open',
      });
      if (posErr) throw posErr;

      // Price impact: each $10 bet moves price by ~1 cent
      const shift = side === 'yes' ? Math.min(amount / 10, 8) : -Math.min(amount / 10, 8);
      const newYes = Math.min(95, Math.max(5, parseFloat((contract.yes_price + shift).toFixed(2))));

      await supabase.from('risk_market_contracts').update({
        yes_price:       newYes,
        pool_size:       parseFloat(((contract.pool_size || 0) + amount).toFixed(2)),
        total_yes_volume: side === 'yes' ? parseFloat(((contract.total_yes_volume || 0) + amount).toFixed(2)) : contract.total_yes_volume,
        total_no_volume:  side === 'no'  ? parseFloat(((contract.total_no_volume || 0) + amount).toFixed(2)) : contract.total_no_volume,
      }).eq('id', contract.id);

      setBuyModal(null);
      setBetAmount('10');
      showToast(`Position opened — ${shares.toFixed(2)} ${side.toUpperCase()} shares · Potential payout: ${fmtUSD(potential)}`);
      await Promise.all([loadContracts(), loadPositions()]);
      if (fetchAllData) fetchAllData();
    } catch (err) {
      showToast('Transaction failed: ' + err.message);
    } finally {
      setIsBuying(false);
    }
  }

  const filtered = activeCategory === 'all' ? contracts : contracts.filter(c => c.category === activeCategory);

  const catColor = (cat) => COLOR[CAT_META[cat]?.color || 'slate'];

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">

      {/* ── TOAST ── */}
      {toast && (
        <div className="fixed top-6 right-6 z-[9999] bg-slate-900 border border-slate-700 text-white text-sm font-bold px-5 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-top-4 duration-300">
          {toast}
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-8 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-slate-900 to-indigo-900/10 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Powered by MICHAEL Global Ops API</span>
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">IFB Risk Markets</h1>
              <p className="text-sm text-slate-400 mt-1 max-w-md">Binary prediction contracts on real-world events. YES wins at $1/share. Data resolved via MICHAEL live event intelligence.</p>
            </div>
            <button
              onClick={generateFromMICHAEL}
              disabled={isGenerating}
              className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
            >
              {isGenerating ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} />}
              {isGenerating ? 'Generating...' : 'Pull Live Events'}
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Active Markets', value: stats.totalContracts, Icon: BarChart3, color: 'text-blue-400' },
              { label: 'Total Volume',   value: fmtUSD(stats.totalVolume), Icon: DollarSign, color: 'text-emerald-400' },
              { label: 'My Positions',   value: stats.myPositions, Icon: Trophy, color: 'text-amber-400' },
            ].map(({ label, value, Icon, color }) => (
              <div key={label} className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 text-center">
                <Icon size={18} className={`${color} mx-auto mb-2`} />
                <p className="text-lg font-black text-white">{value}</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── VIEW TABS ── */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'markets',   label: 'Markets',     Icon: Globe },
          { id: 'positions', label: 'My Positions', Icon: Trophy },
          { id: 'info',      label: 'How It Works', Icon: Info },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveView(id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeView === id ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Icon size={13} /> {label}
            {id === 'positions' && positions.filter(p => p.status === 'open').length > 0 && (
              <span className="bg-amber-500 text-black text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">{positions.filter(p => p.status === 'open').length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ══ MARKETS VIEW ══ */}
      {activeView === 'markets' && (
        <>
          {/* Category filter */}
          <div className="flex gap-2 flex-wrap mb-6">
            {[{ id: 'all', label: 'All', emoji: '🌐' }, ...FETCH_CATS.map(id => ({ id, ...CAT_META[id] }))].map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeCategory === cat.id
                    ? 'bg-white text-slate-900 shadow-md'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span>{cat.emoji || '🌐'}</span> {cat.label || 'All'}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <RefreshCw size={32} className="animate-spin text-blue-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 bg-slate-900 border border-slate-800 rounded-[2rem]">
              <Activity size={40} className="text-slate-600 mx-auto mb-4" />
              <p className="text-white font-black text-lg mb-2">No markets yet</p>
              <p className="text-slate-500 text-sm mb-6">Pull live events from MICHAEL to generate prediction contracts</p>
              <button onClick={generateFromMICHAEL} disabled={isGenerating} className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all">
                {isGenerating ? 'Generating...' : '⚡ Generate Markets from Live Events'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map(contract => {
                const cat  = contract.category;
                const meta = CAT_META[cat] || {};
                const c    = catColor(cat);
                const yes  = parseFloat(contract.yes_price) || 50;
                const no   = 100 - yes;
                const vol  = (contract.total_yes_volume || 0) + (contract.total_no_volume || 0);
                const isResolved = contract.status !== 'open';

                return (
                  <div key={contract.id} className={`bg-slate-900 border ${c.border} rounded-[2rem] p-5 relative overflow-hidden group transition-all hover:border-opacity-60`}>
                    {isResolved && (
                      <div className="absolute top-3 right-3 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-700 text-slate-300">
                        {contract.status === 'resolved_yes' ? '✅ YES Won' : contract.status === 'resolved_no' ? '❌ NO Won' : contract.status.toUpperCase()}
                      </div>
                    )}

                    {/* Category + type badges */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${c.badge}`}>
                        {meta.emoji} {meta.label || cat}
                      </span>
                      <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-slate-800 text-slate-400">
                        {contract.event_type}
                      </span>
                      {contract.region && (
                        <span className="text-[9px] text-slate-500 font-bold truncate max-w-[100px]">📍 {contract.region}</span>
                      )}
                    </div>

                    {/* Question */}
                    <p className="text-white font-bold text-sm leading-snug mb-4">{contract.question}</p>

                    {/* Probability bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-1.5">
                        <span className="text-emerald-400">YES {yes}¢</span>
                        <span className="text-red-400">NO {no}¢</span>
                      </div>
                      <div className="h-2 bg-slate-700/60 rounded-full overflow-hidden flex">
                        <div className="bg-emerald-500 h-full transition-all duration-700" style={{ width: `${yes}%` }} />
                        <div className="bg-red-500 h-full transition-all duration-700" style={{ width: `${no}%` }} />
                      </div>
                      <div className="flex justify-between text-[8px] text-slate-600 font-bold mt-1">
                        <span>Implied probability</span>
                        <span>Vol: {fmtUSD(vol)}</span>
                      </div>
                    </div>

                    {/* Expiry */}
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-bold mb-4">
                      <Clock size={11} />
                      Resolves in {fmtCountdown(contract.resolves_at)}
                    </div>

                    {/* Buy buttons */}
                    {!isResolved ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setBuyModal({ contract, side: 'yes' }); setBetAmount('10'); }}
                          className="flex-1 py-2.5 bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/30 hover:border-emerald-500 text-emerald-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                        >
                          <ArrowUpRight size={12} /> Buy YES · {yes}¢
                        </button>
                        <button
                          onClick={() => { setBuyModal({ contract, side: 'no' }); setBetAmount('10'); }}
                          className="flex-1 py-2.5 bg-red-600/20 hover:bg-red-600 border border-red-500/30 hover:border-red-500 text-red-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                        >
                          <ArrowDownRight size={12} /> Buy NO · {no}¢
                        </button>
                      </div>
                    ) : (
                      <div className="text-center text-[10px] font-black uppercase tracking-widest text-slate-600">Contract Settled</div>
                    )}
                  </div>
                );
              })}
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
              <p className="text-white font-black text-lg mb-2">No positions yet</p>
              <p className="text-slate-500 text-sm">Open a market and buy YES or NO to get started</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { label: 'Open',   value: positions.filter(p => p.status === 'open').length,   color: 'text-blue-400'   },
                  { label: 'Won',    value: positions.filter(p => p.status === 'won').length,    color: 'text-emerald-400'},
                  { label: 'Lost',   value: positions.filter(p => p.status === 'lost').length,   color: 'text-red-400'    },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                    <p className={`text-2xl font-black ${color}`}>{value}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</p>
                  </div>
                ))}
              </div>

              {positions.map(pos => {
                const contract = pos.risk_market_contracts;
                const isYes    = pos.side === 'yes';
                const cat      = contract?.category || 'environmental';
                const c        = catColor(cat);
                const curPrice = isYes
                  ? parseFloat(contract?.yes_price || 50)
                  : 100 - parseFloat(contract?.yes_price || 50);
                const curValue = (pos.shares * curPrice) / 100;
                const pnl      = curValue - pos.amount_paid;
                const pnlPct   = ((pnl / pos.amount_paid) * 100).toFixed(1);
                const statusColor = pos.status === 'won' ? 'text-emerald-400' : pos.status === 'lost' ? 'text-red-400' : 'text-slate-400';

                return (
                  <div key={pos.id} className={`bg-slate-900 border ${c.border} rounded-2xl p-5`}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <p className="text-white font-bold text-sm leading-snug flex-1">{contract?.question || 'Unknown market'}</p>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${isYes ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                          {pos.side.toUpperCase()}
                        </span>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${statusColor}`}>{pos.status}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      {[
                        { label: 'Shares',   value: pos.shares.toFixed(2) },
                        { label: 'Paid',     value: fmtUSD(pos.amount_paid) },
                        { label: 'Cur Value',value: fmtUSD(curValue) },
                        { label: 'P&L',      value: `${pnl >= 0 ? '+' : ''}${fmtUSD(pnl)}` },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-slate-800/60 rounded-xl p-2">
                          <p className={`text-xs font-black ${label === 'P&L' ? (pnl >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-white'}`}>{value}</p>
                          <p className="text-[8px] font-black uppercase tracking-widest text-slate-600">{label}</p>
                        </div>
                      ))}
                    </div>
                    {pos.status === 'open' && (
                      <p className="text-[9px] text-slate-600 font-bold text-right mt-2">
                        Potential win: {fmtUSD(pos.shares)} · Entry: {pos.entry_price}¢/share
                      </p>
                    )}
                    {pos.payout != null && (
                      <p className="text-[10px] font-black text-emerald-400 text-right mt-2">Settled payout: {fmtUSD(pos.payout)}</p>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* ══ HOW IT WORKS VIEW ══ */}
      {activeView === 'info' && (
        <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 space-y-8">
          <div>
            <h3 className="text-xl font-black text-white mb-2">IFB Risk Markets — How It Works</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Binary prediction contracts on real-world events, powered by MICHAEL Global Ops API live intelligence. Buy YES or NO on whether a specific global risk event will happen or escalate within a defined timeframe.</p>
          </div>
          {[
            { step: '01', title: 'Binary Contracts', body: 'Each market asks a single YES/NO question about a real-world event. "Will a Category 5 flood hit this region within 7 days?" You bet on the outcome.' },
            { step: '02', title: 'Share Pricing', body: 'Contract prices range from 1¢ to 99¢ per share, representing the market\'s implied probability. YES at 70¢ means the crowd thinks there\'s a 70% chance the event happens.' },
            { step: '03', title: 'Buy YES or NO', body: 'Enter a dollar amount. You receive shares at the current price. Winning shares pay $1.00 each. If you buy YES at 60¢ and the event happens, your shares are worth $1.00 — a 67% gain.' },
            { step: '04', title: 'MICHAEL Resolution', body: 'Contracts resolve based on MICHAEL API live event data. If MICHAEL records the event as confirmed within the timeframe, YES wins. Otherwise, NO wins.' },
            { step: '05', title: 'Payout & Fees', body: 'Winning positions are paid out automatically at $1/share. IFB takes a 2% fee on gross winnings. Losing positions are worth $0.' },
            { step: '06', title: 'Price Discovery', body: 'Each trade moves the price slightly — buying YES pushes the probability up, buying NO pushes it down. The market price reflects collective intelligence.' },
          ].map(({ step, title, body }) => (
            <div key={step} className="flex gap-4">
              <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/20 text-blue-400 text-[10px] font-black flex items-center justify-center shrink-0">{step}</div>
              <div>
                <p className="text-white font-black mb-1">{title}</p>
                <p className="text-slate-400 text-sm leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
            <p className="text-amber-400 text-[10px] font-black uppercase tracking-widest mb-1">Risk Disclosure</p>
            <p className="text-slate-400 text-xs leading-relaxed">Prediction markets involve financial risk. You may lose your entire stake. Past price movement is not indicative of future outcomes. Only bet amounts you can afford to lose. IFB Risk Markets are for educational and entertainment purposes.</p>
          </div>
        </div>
      )}

      {/* ══ BUY MODAL ══ */}
      {buyModal && (
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 sm:p-6">
          <div className="bg-slate-900 border border-slate-700 rounded-[2rem] w-full max-w-md p-6 animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${buyModal.side === 'yes' ? 'text-emerald-400' : 'text-red-400'}`}>
                  Buy {buyModal.side.toUpperCase()} Position
                </p>
                <p className="text-white font-bold text-sm leading-snug max-w-[280px]">{buyModal.contract.question}</p>
              </div>
              <button onClick={() => setBuyModal(null)} className="w-9 h-9 bg-slate-800 hover:bg-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            {(() => {
              const yes     = parseFloat(buyModal.contract.yes_price);
              const price   = buyModal.side === 'yes' ? yes : (100 - yes);
              const amount  = parseFloat(betAmount) || 0;
              const shares  = amount > 0 ? ((amount / price) * 100).toFixed(2) : '0';
              const payout  = parseFloat(shares);
              const profit  = payout - amount;
              const profPct = amount > 0 ? ((profit / amount) * 100).toFixed(0) : 0;
              return (
                <>
                  {/* Price info */}
                  <div className={`rounded-2xl p-4 mb-4 ${buyModal.side === 'yes' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                    <div className="flex justify-between text-sm font-black">
                      <span className="text-slate-400">Current price</span>
                      <span className={buyModal.side === 'yes' ? 'text-emerald-400' : 'text-red-400'}>{price}¢ / share</span>
                    </div>
                    <div className="flex justify-between text-sm font-black mt-1">
                      <span className="text-slate-400">Win payout</span>
                      <span className="text-white">$1.00 / share</span>
                    </div>
                    <div className="flex justify-between text-sm font-black mt-1">
                      <span className="text-slate-400">If you win</span>
                      <span className="text-emerald-400">+{profPct}% return</span>
                    </div>
                  </div>

                  {/* Amount input */}
                  <div className="mb-4">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Bet Amount (USD)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">$</span>
                      <input
                        type="number"
                        min="1"
                        max={balances?.liquid_usd || 999999}
                        step="1"
                        value={betAmount}
                        onChange={e => setBetAmount(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-8 pr-4 py-4 font-black text-white text-lg outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      {[5, 10, 25, 50, 100].map(v => (
                        <button key={v} onClick={() => setBetAmount(String(v))} className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-[9px] font-black text-slate-400 hover:text-white transition-colors">${v}</button>
                      ))}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="bg-slate-800/60 rounded-2xl p-4 mb-5 space-y-2">
                    {[
                      ['You pay', fmtUSD(amount)],
                      ['You receive', `${shares} shares`],
                      ['If you win', fmtUSD(payout)],
                      ['Net profit', fmtUSD(profit)],
                      ['Available balance', fmtUSD(balances?.liquid_usd || 0)],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between text-xs font-bold">
                        <span className="text-slate-400">{label}</span>
                        <span className={`font-black ${label === 'Net profit' ? (profit > 0 ? 'text-emerald-400' : 'text-slate-400') : 'text-white'}`}>{value}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleBuy}
                    disabled={isBuying || amount <= 0 || amount > (balances?.liquid_usd || 0)}
                    className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-40 ${
                      buyModal.side === 'yes'
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-red-600 hover:bg-red-500 text-white'
                    }`}
                  >
                    {isBuying ? <RefreshCw size={16} className="animate-spin mx-auto" /> : `Confirm — Buy ${buyModal.side.toUpperCase()} · ${fmtUSD(amount)}`}
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
