/**
 * capital-matchmaker
 *
 * REST API for IFB capital matching engine.
 * Scores every capital instrument against an entrepreneur's profile
 * and returns ranked, weighted matches with full instrument data.
 *
 * POST /capital-matchmaker
 * Body: {
 *   user_id: string,
 *   profile?: CapitalMatchProfile,   // override DB profile
 *   limit?: number,                  // default 20
 *   type?: 'funding'|'loan'|'bond'|'equity',
 *   min_score?: number,              // default 0
 *   amount_usd?: number,             // filter by capital need
 * }
 *
 * GET /capital-matchmaker?user_id=xxx&type=loan&limit=10
 * Returns: { matches: MatchResult[], profile: CapitalMatchProfile, summary: MatchSummary }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SVC_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface CapitalMatchProfile {
  user_id: string;
  entity_type: string;
  country: string;
  region: string;
  sector: string[];
  years_in_business: number;
  annual_revenue_usd: number;
  capital_need_usd: number;
  capital_purpose: string[];
  preferred_capital_types: string[];
  can_offer_collateral: boolean;
  collateral_value_usd: number;
  max_interest_rate_pct: number;
  is_kyc_verified: boolean;
  has_audited_financials: boolean;
  has_registration: boolean;
  credit_score: number;
  company_stage: string;
  employees_count: number;
  is_women_led: boolean;
  is_youth_led: boolean;
  is_impact_focused: boolean;
  climate_sector: boolean;
  investor_risk_appetite: string;
  preferred_tenor_months: number;
}

interface MatchResult {
  id: string;
  type: 'funding' | 'loan' | 'bond' | 'equity';
  score: number;                    // 0–100
  tier: 'strong' | 'good' | 'partial';
  instrument: Record<string, unknown>;
  provider_name: string;
  reasons: string[];
  disqualifiers: string[];
  amount_recommended_usd: number | null;
  pathway: string;                  // action the user should take
}

// ── Region mapping ────────────────────────────────────────────────────────────
const COUNTRY_TO_REGION: Record<string, string> = {
  NG:'West Africa', GH:'West Africa', SN:'West Africa', CI:'West Africa', ML:'West Africa',
  BF:'West Africa', TG:'West Africa', BJ:'West Africa', NE:'West Africa', GM:'West Africa',
  GN:'West Africa', GW:'West Africa', LR:'West Africa', SL:'West Africa', CV:'West Africa',
  MR:'West Africa',
  KE:'East Africa', TZ:'East Africa', UG:'East Africa', RW:'East Africa', ET:'East Africa',
  SS:'East Africa', BI:'East Africa', DJ:'East Africa', ER:'East Africa', SO:'East Africa',
  MG:'East Africa',
  ZA:'Southern Africa', ZM:'Southern Africa', ZW:'Southern Africa', MZ:'Southern Africa',
  BW:'Southern Africa', NA:'Southern Africa', LS:'Southern Africa', SZ:'Southern Africa',
  MW:'Southern Africa',
  EG:'North Africa', MA:'North Africa', TN:'North Africa', DZ:'North Africa', LY:'North Africa',
  SD:'North Africa',
  CM:'Central Africa', GA:'Central Africa', CG:'Central Africa', CD:'Central Africa',
  CF:'Central Africa', TD:'Central Africa', GQ:'Central Africa',
  US:'North America', CA:'North America', GB:'Europe', DE:'Europe', FR:'Europe',
  IN:'South Asia', PK:'South Asia', BD:'South Asia',
  CN:'East Asia', JP:'East Asia', KR:'East Asia',
};

function countryToRegion(country: string): string {
  return COUNTRY_TO_REGION[country?.toUpperCase()] || 'Global';
}

function regionMatch(userRegion: string, eligibleRegions: string[]): boolean {
  if (!eligibleRegions || eligibleRegions.length === 0) return true;
  const regions = eligibleRegions.map(r => r.toLowerCase());
  return regions.includes('global') ||
    regions.includes(userRegion.toLowerCase()) ||
    regions.some(r => userRegion.toLowerCase().includes(r) || r.includes(userRegion.toLowerCase()));
}

function sectorMatch(userSectors: string[], eligibleSectors: string[]): boolean {
  if (!eligibleSectors || eligibleSectors.length === 0) return true;
  const el = eligibleSectors.map(s => s.toLowerCase());
  if (el.includes('all')) return true;
  return userSectors.some(s => el.some(e => e.includes(s.toLowerCase()) || s.toLowerCase().includes(e)));
}

function entityMatch(userEntity: string, eligibleEntities: string[]): boolean {
  if (!eligibleEntities || eligibleEntities.length === 0) return true;
  return eligibleEntities.includes(userEntity);
}

// ── Scoring: Fundings ─────────────────────────────────────────────────────────
function scoreFunding(f: Record<string, unknown>, p: CapitalMatchProfile): { score: number; reasons: string[]; disqualifiers: string[] } {
  const reasons: string[] = [];
  const disqualifiers: string[] = [];
  let score = 0;

  // Hard disqualifiers
  if (f.status === 'closed') {
    disqualifiers.push('Application window is closed');
    return { score: 0, reasons, disqualifiers };
  }
  if (f.deadline_date && new Date(f.deadline_date as string) < new Date()) {
    disqualifiers.push(`Deadline passed: ${f.deadline_date}`);
    return { score: 0, reasons, disqualifiers };
  }
  if (f.women_led_preference === 'required' && !p.is_women_led) {
    disqualifiers.push('Requires women-led organisation');
    return { score: 0, reasons, disqualifiers };
  }
  if ((f.for_profit_eligible === false) && p.entity_type !== 'npo') {
    disqualifiers.push('For non-profits only');
    return { score: 0, reasons, disqualifiers };
  }
  if ((f.non_profit_eligible === false) && p.entity_type === 'npo') {
    disqualifiers.push('For-profit only');
    return { score: 0, reasons, disqualifiers };
  }
  if (f.min_years_operating && (p.years_in_business < (f.min_years_operating as number))) {
    disqualifiers.push(`Requires ${f.min_years_operating}+ years operating (you have ${p.years_in_business})`);
    return { score: 0, reasons, disqualifiers };
  }
  if (f.max_years_operating && (p.years_in_business > (f.max_years_operating as number))) {
    disqualifiers.push(`For businesses <${f.max_years_operating} years old`);
    return { score: 0, reasons, disqualifiers };
  }
  if (f.min_annual_revenue_usd && p.annual_revenue_usd < (f.min_annual_revenue_usd as number)) {
    disqualifiers.push(`Min revenue $${((f.min_annual_revenue_usd as number)/1000).toFixed(0)}K required`);
    return { score: 0, reasons, disqualifiers };
  }

  // Region (40 pts)
  if (regionMatch(p.region, f.eligible_regions as string[])) {
    score += 40;
    reasons.push(`Eligible region: ${p.region}`);
  } else {
    disqualifiers.push(`Not available in ${p.region}`);
    return { score: 0, reasons, disqualifiers };
  }

  // Entity type (20 pts)
  if (entityMatch(p.entity_type, f.eligible_entity_types as string[])) {
    score += 20;
    reasons.push(`Eligible entity type: ${p.entity_type}`);
  } else {
    disqualifiers.push(`Entity type "${p.entity_type}" not eligible`);
    return { score: 0, reasons, disqualifiers };
  }

  // Sector (20 pts)
  if (sectorMatch(p.sector, f.eligible_sectors as string[])) {
    score += 20;
    reasons.push('Sector match');
  } else {
    score -= 10;
    disqualifiers.push('Sector may not qualify — verify eligibility');
  }

  // Amount fit (10 pts)
  const amMin = f.amount_min_usd as number | null;
  const amMax = f.amount_max_usd as number | null;
  if (p.capital_need_usd && amMin !== null && amMax !== null) {
    if (p.capital_need_usd >= amMin && p.capital_need_usd <= amMax) {
      score += 10;
      reasons.push('Capital need fits funding range');
    } else if (p.capital_need_usd > amMax) {
      score += 3;
      reasons.push(`Max grant $${(amMax/1000).toFixed(0)}K — may cover part of need`);
    }
  }

  // KYC verified bonus (5 pts)
  if (f.requires_kyc && p.is_kyc_verified) { score += 5; reasons.push('KYC verified'); }

  // Audited financials (3 pts)
  if (f.requires_audited_financials && p.has_audited_financials) { score += 3; reasons.push('Audited financials available'); }

  // Women-led preference bonus (2 pts)
  if (f.women_led_preference === 'preferred' && p.is_women_led) {
    score += 2;
    reasons.push('Women-led preference — higher chance of selection');
  }

  // Climate alignment bonus (2 pts)
  if (f.climate_category && f.climate_category !== 'none' && p.climate_sector) {
    score += 2;
    reasons.push('Climate sector alignment');
  }

  return { score: Math.min(100, Math.max(0, score)), reasons, disqualifiers };
}

// ── Scoring: Loans ────────────────────────────────────────────────────────────
function scoreLoan(l: Record<string, unknown>, p: CapitalMatchProfile): { score: number; reasons: string[]; disqualifiers: string[] } {
  const reasons: string[] = [];
  const disqualifiers: string[] = [];
  let score = 0;

  if (l.status === 'closed' || l.status === 'paused') {
    disqualifiers.push('Loan product currently unavailable');
    return { score: 0, reasons, disqualifiers };
  }
  if (l.min_annual_revenue_usd && p.annual_revenue_usd < (l.min_annual_revenue_usd as number)) {
    disqualifiers.push(`Min revenue $${((l.min_annual_revenue_usd as number)/1000).toFixed(0)}K required`);
    return { score: 0, reasons, disqualifiers };
  }
  if (l.min_years_in_business && p.years_in_business < (l.min_years_in_business as number)) {
    disqualifiers.push(`Min ${l.min_years_in_business} years in business required`);
    return { score: 0, reasons, disqualifiers };
  }
  if (l.collateral_required && !p.can_offer_collateral) {
    disqualifiers.push('Collateral required — you indicated none available');
    score -= 20;
  }
  if (p.max_interest_rate_pct && l.total_rate_min_pct && (l.total_rate_min_pct as number) > p.max_interest_rate_pct) {
    disqualifiers.push(`Rate ${l.total_rate_min_pct}% exceeds your max ${p.max_interest_rate_pct}%`);
    score -= 30;
  }

  // Region (35 pts)
  if (regionMatch(p.region, l.eligible_regions as string[])) {
    score += 35; reasons.push(`Available in ${p.region}`);
  } else { disqualifiers.push(`Not offered in ${p.region}`); return { score: 0, reasons, disqualifiers }; }

  // Entity (20 pts)
  if (entityMatch(p.entity_type, l.eligible_entity_types as string[])) {
    score += 20; reasons.push(`${p.entity_type} eligible`);
  } else { disqualifiers.push(`Entity type not supported`); return { score: 0, reasons, disqualifiers }; }

  // Sector (15 pts)
  if (sectorMatch(p.sector, l.eligible_sectors as string[])) {
    score += 15; reasons.push('Sector eligible');
  }

  // Amount fit (15 pts)
  const lMin = l.amount_min_usd as number;
  const lMax = l.amount_max_usd as number;
  if (p.capital_need_usd >= lMin && p.capital_need_usd <= lMax) {
    score += 15; reasons.push(`Loan range $${(lMin/1e6).toFixed(1)}M–$${(lMax/1e6).toFixed(1)}M fits need`);
  } else if (p.capital_need_usd > lMax) {
    score += 5; reasons.push(`Max $${(lMax/1e6).toFixed(1)}M — consider partial`);
  }

  // Rate affordable (10 pts)
  if (!p.max_interest_rate_pct || !l.total_rate_min_pct || (l.total_rate_min_pct as number) <= p.max_interest_rate_pct) {
    score += 10; reasons.push(`Rate ${l.total_rate_min_pct || '?'}% within budget`);
  }

  // Collateral available when required (5 pts)
  if (l.collateral_required && p.can_offer_collateral) {
    score += 5; reasons.push('Collateral available');
  }

  // KYC & financials
  if (l.requires_kyc && p.is_kyc_verified) score += 3;
  if (l.requires_audited_financials && p.has_audited_financials) score += 3;

  // Green bonus
  if (l.green_loan && p.climate_sector) { score += 2; reasons.push('Green loan available for climate sector'); }

  return { score: Math.min(100, Math.max(0, score)), reasons, disqualifiers };
}

// ── Scoring: Bonds ────────────────────────────────────────────────────────────
function scoreBond(b: Record<string, unknown>, p: CapitalMatchProfile): { score: number; reasons: string[]; disqualifiers: string[] } {
  const reasons: string[] = [];
  const disqualifiers: string[] = [];
  let score = 0;

  if (b.status === 'matured' || b.status === 'called' || b.status === 'defaulted') {
    disqualifiers.push(`Bond is ${b.status}`);
    return { score: 0, reasons, disqualifiers };
  }
  if (b.maturity_date && new Date(b.maturity_date as string) < new Date()) {
    disqualifiers.push('Bond has matured');
    return { score: 0, reasons, disqualifiers };
  }

  const minInv = (b.min_investment_usd || b.minimum_denomination || 200000) as number;
  if (p.capital_need_usd < minInv) {
    disqualifiers.push(`Min investment $${(minInv/1000).toFixed(0)}K exceeds capital need`);
    return { score: 0, reasons, disqualifiers };
  }

  // Regional affinity (30 pts) — bonds relevant to user's region
  const bCountry = (b.issuer_country || b.country || '') as string;
  const bRegion  = countryToRegion(bCountry);
  if (bRegion === p.region || bCountry === p.country) {
    score += 30; reasons.push(`Issued by ${bCountry} (${bRegion}) — home market`);
  } else if (bRegion === 'Global' || b.issuer_type === 'supranational') {
    score += 20; reasons.push('Supranational / globally accessible');
  } else {
    score += 5; reasons.push('International bond — cross-border access possible');
  }

  // Yield / return profile (25 pts)
  const ytm = (b.yield_to_maturity || b.coupon_rate_pct || 0) as number;
  if (ytm >= 8) { score += 25; reasons.push(`High yield: ${ytm}% YTM`); }
  else if (ytm >= 4) { score += 18; reasons.push(`Moderate yield: ${ytm}% YTM`); }
  else { score += 10; reasons.push(`Conservative yield: ${ytm}% YTM (capital preservation)`); }

  // Credit quality (20 pts)
  const rating = (b.credit_rating_sp || b.credit_rating_moodys || '') as string;
  if (['AAA','Aaa','AA+','AA','Aa1','Aa2'].includes(rating)) {
    score += 20; reasons.push(`${rating} — investment grade, highest quality`);
  } else if (['AA-','A+','A','A-','A1','A2','A3'].includes(rating)) {
    score += 16; reasons.push(`${rating} — strong investment grade`);
  } else if (['BBB+','BBB','BBB-','Baa1','Baa2','Baa3'].includes(rating)) {
    score += 12; reasons.push(`${rating} — investment grade`);
  } else if (rating) {
    score += 6;
    if (p.investor_risk_appetite !== 'aggressive') {
      disqualifiers.push(`${rating} is below investment grade — higher risk`);
    }
  }

  // Duration match (15 pts)
  const maturityYrs = b.maturity_date ?
    (new Date(b.maturity_date as string).getTime() - Date.now()) / (365.25 * 24 * 3600 * 1000) : 5;
  const prefTenorYrs = p.preferred_tenor_months ? p.preferred_tenor_months / 12 : 5;
  if (Math.abs(maturityYrs - prefTenorYrs) < 2) {
    score += 15; reasons.push(`Maturity matches investment horizon (~${maturityYrs.toFixed(0)} years)`);
  } else {
    score += 5;
  }

  // Green / ESG bonus (10 pts)
  if (b.is_green_bond && p.climate_sector) {
    score += 10; reasons.push('Green bond — aligns with climate mission');
  }

  // Risk appetite check
  if (rating && ['B','B+','B-','CCC','CC','C','D'].some(r => rating.startsWith(r)) && p.investor_risk_appetite === 'conservative') {
    disqualifiers.push(`High-yield rating ${rating} mismatches conservative risk appetite`);
    score -= 15;
  }

  return { score: Math.min(100, Math.max(0, score)), reasons, disqualifiers };
}

// ── Scoring: Equities ─────────────────────────────────────────────────────────
function scoreEquity(e: Record<string, unknown>, p: CapitalMatchProfile): { score: number; reasons: string[]; disqualifiers: string[] } {
  const reasons: string[] = [];
  const disqualifiers: string[] = [];
  let score = 0;

  const minInv = (e.min_investment_usd || 1) as number;
  if (p.capital_need_usd < minInv) {
    disqualifiers.push(`Min investment $${minInv} required`);
    return { score: 0, reasons, disqualifiers };
  }
  if (p.investor_risk_appetite === 'conservative' && e.asset_type === 'stock') {
    disqualifiers.push('Individual stocks may be too volatile for conservative risk appetite');
    score -= 10;
  }

  // Regional relevance (30 pts)
  const eCountry = (e.country || '') as string;
  const eRegion  = countryToRegion(eCountry);
  if (eRegion === p.region || eCountry === p.country) {
    score += 30; reasons.push(`${e.ticker} listed in your market (${eRegion})`);
  } else if ((e.is_africa_listed && p.region.toLowerCase().includes('africa')) || e.asset_type === 'etf') {
    score += 20; reasons.push('Africa-listed or Africa-focused ETF');
  } else {
    score += 8;
  }

  // Sector alignment (25 pts)
  const eSector = ((e.gics_sector || e.sector || '') as string).toLowerCase();
  if (p.sector.some(s => eSector.includes(s.toLowerCase()) || s.toLowerCase().includes(eSector.split(' ')[0]))) {
    score += 25; reasons.push(`${e.gics_sector || e.sector} sector matches your business`);
  } else {
    score += 5; reasons.push('Diversification opportunity');
  }

  // Analyst consensus (20 pts)
  const consensus = e.analyst_consensus as string;
  if (consensus === 'strong_buy') { score += 20; reasons.push('Analyst: Strong Buy'); }
  else if (consensus === 'buy')   { score += 15; reasons.push('Analyst: Buy'); }
  else if (consensus === 'hold')  { score += 8;  reasons.push('Analyst: Hold'); }
  else if (consensus === 'sell')  { score += 2; disqualifiers.push('Analyst: Sell'); }

  // Dividend yield (15 pts)
  const dyield = (e.dividend_yield_pct || 0) as number;
  if (dyield >= 6) { score += 15; reasons.push(`High dividend yield: ${dyield}%`); }
  else if (dyield >= 3) { score += 10; reasons.push(`Moderate dividend: ${dyield}%`); }
  else if (dyield > 0) { score += 5; reasons.push(`Dividend: ${dyield}%`); }

  // Valuation / risk (10 pts)
  const pe = (e.pe_ratio || 0) as number;
  if (pe > 0 && pe < 12) { score += 10; reasons.push(`Low P/E: ${pe}x — potentially undervalued`); }
  else if (pe >= 12 && pe < 25) { score += 7; reasons.push(`Fair P/E: ${pe}x`); }
  else if (pe >= 25) { score += 3; }

  // ETF bonus for diversification preference
  if (e.asset_type === 'etf') { score += 5; reasons.push('ETF — instant diversification'); }

  // Impact investing alignment
  if (e.is_impact_investment && p.is_impact_focused) {
    score += 5; reasons.push('Impact investment theme aligns with your mission');
  }

  return { score: Math.min(100, Math.max(0, score)), reasons, disqualifiers };
}

// ── Pathway generator ─────────────────────────────────────────────────────────
function generatePathway(type: string, instrument: Record<string, unknown>, score: number): string {
  const url = (instrument.application_url || instrument.source_url || '') as string;
  if (type === 'funding') {
    if (score >= 75) return `Apply now: ${url || 'visit provider website'}`;
    if (score >= 50) return `Prepare your business plan and register with ${instrument.provider_name || 'provider'}, then apply`;
    return `Review eligibility criteria before applying`;
  }
  if (type === 'loan') {
    if (score >= 75) return `Contact your nearest branch or apply online: ${url}`;
    if (score >= 50) return `Gather: audited financials, 6-month bank statements, collateral valuation, then apply`;
    return `Build your financial history and credit profile first`;
  }
  if (type === 'bond') {
    return `Purchase through a licensed broker or your IFB investment account. Min investment: $${((instrument.min_investment_usd as number || 1000) / 1000).toFixed(0)}K`;
  }
  if (type === 'equity') {
    const exch = instrument.exchange as string;
    return `Buy ${instrument.ticker} on ${exch} via a stockbroker or IFB investment account`;
  }
  return 'Contact provider for more details';
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const db = createClient(SUPABASE_URL, SUPABASE_SVC_KEY);

  // Parse request
  let userId: string | null = null;
  let filterType: string | null = null;
  let limit = 20;
  let minScore = 0;

  try {
    if (req.method === 'POST') {
      const body = await req.json();
      userId     = body.user_id;
      filterType = body.type || null;
      limit      = body.limit || 20;
      minScore   = body.min_score || 0;
    } else {
      const url = new URL(req.url);
      userId     = url.searchParams.get('user_id');
      filterType = url.searchParams.get('type');
      limit      = parseInt(url.searchParams.get('limit') || '20');
      minScore   = parseInt(url.searchParams.get('min_score') || '0');
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400, headers: CORS });
  }

  if (!userId) {
    return new Response(JSON.stringify({ error: 'user_id required' }), { status: 400, headers: CORS });
  }

  // Fetch user's match profile
  const { data: profile, error: profileErr } = await db
    .from('capital_match_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (profileErr || !profile) {
    // Auto-sync profile from existing user data
    await db.rpc('sync_capital_match_profile', { p_user_id: userId });
    const { data: freshProfile } = await db
      .from('capital_match_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!freshProfile) {
      return new Response(JSON.stringify({ error: 'No capital profile found. Complete your business profile first.' }), { status: 404, headers: CORS });
    }
    Object.assign(profile || {}, freshProfile);
  }

  const p = profile as CapitalMatchProfile;
  p.region = p.region || countryToRegion(p.country);

  // Fetch all capital instruments
  const queries: Promise<{ type: string; data: Record<string, unknown>[] }>[] = [];

  if (!filterType || filterType === 'funding') {
    queries.push(
      db.from('capital_fundings')
        .select('*, capital_providers(name, short_name, website, provider_type)')
        .eq('status', 'open')
        .then(({ data }) => ({ type: 'funding', data: data || [] }))
    );
  }
  if (!filterType || filterType === 'loan') {
    queries.push(
      db.from('capital_loans')
        .select('*, capital_providers(name, short_name, website, provider_type)')
        .eq('status', 'active')
        .then(({ data }) => ({ type: 'loan', data: data || [] }))
    );
  }
  if (!filterType || filterType === 'bond') {
    queries.push(
      db.from('capital_bonds')
        .select('*, capital_providers(name, short_name, website)')
        .eq('status', 'active')
        .then(({ data }) => ({ type: 'bond', data: data || [] }))
    );
  }
  if (!filterType || filterType === 'equity') {
    queries.push(
      db.from('capital_equities')
        .select('*, capital_providers(name, short_name, website)')
        .eq('status', 'active')
        .then(({ data }) => ({ type: 'equity', data: data || [] }))
    );
  }

  const results = await Promise.all(queries);

  // Score everything
  const allMatches: MatchResult[] = [];

  for (const { type, data } of results) {
    for (const instrument of data) {
      let scored: { score: number; reasons: string[]; disqualifiers: string[] };

      if      (type === 'funding') scored = scoreFunding(instrument, p);
      else if (type === 'loan')    scored = scoreLoan(instrument, p);
      else if (type === 'bond')    scored = scoreBond(instrument, p);
      else                          scored = scoreEquity(instrument, p);

      if (scored.score < minScore) continue;

      const provider = (instrument.capital_providers as Record<string, string> | null);
      const providerName = provider?.name || instrument.issuer_name as string || 'Unknown Provider';

      const instrumentName =
        (instrument.program_name || instrument.product_name || instrument.bond_name ||
         instrument.company_name || instrument.ticker || 'Unknown') as string;

      const amountRecommended =
        type === 'funding' ? Math.min(p.capital_need_usd || 0, (instrument.amount_max_usd as number) || 0) :
        type === 'loan'    ? Math.min(p.capital_need_usd || 0, (instrument.amount_max_usd as number) || 0) :
        null;

      allMatches.push({
        id: instrument.id as string,
        type: type as 'funding' | 'loan' | 'bond' | 'equity',
        score: scored.score,
        tier: scored.score >= 75 ? 'strong' : scored.score >= 50 ? 'good' : 'partial',
        instrument: {
          ...instrument,
          capital_providers: undefined,         // avoid circular noise
          _provider: provider,
        },
        provider_name: providerName,
        reasons: scored.reasons,
        disqualifiers: scored.disqualifiers,
        amount_recommended_usd: amountRecommended,
        pathway: generatePathway(type, { ...instrument, provider_name: providerName }, scored.score),
      });
    }
  }

  // Sort by score descending, take top N
  allMatches.sort((a, b) => b.score - a.score);
  const topMatches = allMatches.slice(0, limit);

  // Summary
  const summary = {
    total_scored:    allMatches.length,
    returned:        topMatches.length,
    strong:          allMatches.filter(m => m.tier === 'strong').length,
    good:            allMatches.filter(m => m.tier === 'good').length,
    partial:         allMatches.filter(m => m.tier === 'partial').length,
    by_type: {
      funding: allMatches.filter(m => m.type === 'funding').length,
      loan:    allMatches.filter(m => m.type === 'loan').length,
      bond:    allMatches.filter(m => m.type === 'bond').length,
      equity:  allMatches.filter(m => m.type === 'equity').length,
    },
    max_accessible_usd: allMatches.reduce((sum, m) => sum + (m.amount_recommended_usd || 0), 0),
    top_match_score:    topMatches[0]?.score || 0,
    top_match_name:     topMatches[0]?.instrument?.program_name as string ||
                        topMatches[0]?.instrument?.product_name as string ||
                        topMatches[0]?.instrument?.bond_name as string ||
                        topMatches[0]?.instrument?.company_name as string || null,
  };

  // Persist top matches to capital_matches table
  if (topMatches.length > 0) {
    const rows = topMatches.slice(0, 50).map(m => ({
      user_id:               userId,
      capital_type:          m.type,
      capital_id:            m.id,
      match_score:           m.score,
      score_breakdown:       { tier: m.tier, reasons_count: m.reasons.length },
      match_reasons:         m.reasons,
      disqualifiers:         m.disqualifiers,
      amount_recommended_usd: m.amount_recommended_usd,
      priority:              m.tier === 'strong' ? 'high' : m.tier === 'good' ? 'medium' : 'low',
      status:                'new',
      generated_at:          new Date().toISOString(),
      expires_at:            new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    }));

    await db.from('capital_matches').upsert(rows, { onConflict: 'user_id,capital_type,capital_id' });
  }

  return new Response(
    JSON.stringify({ ok: true, profile: p, summary, matches: topMatches }),
    { headers: { ...CORS, 'Content-Type': 'application/json' } }
  );
});
