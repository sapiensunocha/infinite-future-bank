import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper to fetch real live data from Yahoo Finance API
async function fetchLiveQuote(symbol: string) {
  // Map standard crypto symbols to Yahoo's format
  let cleanSymbol = symbol.toUpperCase().trim();
  if (cleanSymbol === 'BTC' || cleanSymbol === 'BTC/USD') cleanSymbol = 'BTC-USD';
  if (cleanSymbol === 'ETH' || cleanSymbol === 'ETH/USD') cleanSymbol = 'ETH-USD';

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${cleanSymbol}?interval=1d&range=1d`;
  const response = await fetch(url);
  const data = await response.json();

  if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
    throw new Error(`Asset ${symbol} not found or market data unavailable.`);
  }

  const meta = data.chart.result[0].meta;
  const currentPrice = meta.regularMarketPrice;
  const previousClose = meta.previousClose;

  // REAL MATH: Calculate actual momentum for the AI Signal
  const percentChange = ((currentPrice - previousClose) / previousClose) * 100;
  
  let signal = 'HOLD';
  let confidence = 50.0;
  let color = 'bg-slate-200 text-slate-800';

  if (percentChange > 1.0) {
      signal = 'BUY';
      confidence = Math.min(60 + (percentChange * 10), 99.9);
      color = 'bg-emerald-100 text-emerald-700';
  } else if (percentChange < -1.0) {
      signal = 'SELL';
      confidence = Math.min(60 + (Math.abs(percentChange) * 10), 99.9);
      color = 'bg-red-100 text-red-700';
  }

  return {
    symbol: cleanSymbol,
    name: cleanSymbol, // Yahoo doesn't return full company name in this specific fast-quote endpoint
    price: currentPrice,
    signal: signal,
    confidence: parseFloat(confidence.toFixed(1)),
    color: color
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, symbol } = await req.json();

    // ACTION 1: Get top market picks for the dashboard (REAL DATA)
    if (action === 'top_picks') {
      const symbolsToFetch = ['NVDA', 'BTC-USD', 'AAPL', 'TSLA'];
      const picks = await Promise.all(symbolsToFetch.map(sym => fetchLiveQuote(sym)));
      
      // Add formatting names manually since we know the core basket
      picks[0].name = 'NVIDIA Corp.';
      picks[1].name = 'Bitcoin';
      picks[2].name = 'Apple Inc.';
      picks[3].name = 'Tesla Inc.';

      return new Response(JSON.stringify(picks), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ACTION 2: User searched for a specific symbol (REAL DATA)
    if (action === 'quote') {
      if (!symbol) throw new Error("Symbol is required");
      const quote = await fetchLiveQuote(symbol);
      return new Response(JSON.stringify(quote), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    throw new Error("Invalid action specified.");

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})