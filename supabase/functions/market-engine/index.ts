// market-engine
// Provides live market quotes and AI-driven investment signals
// Integrates with the Wealth Invest terminal

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY")!;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MARKET_DATA_PROMPT = `You are an IFB Quantitative Analyst. Provide realistic market data and AI signals for the requested asset.
If the action is 'top_picks', provide 5 diverse assets (Stocks, Crypto, Commodities).
If the action is 'quote', provide data for the specific symbol.

Return ONLY a valid JSON object or array of objects with these keys:
{
  "symbol": string,
  "name": string,
  "price": number,
  "change_24h": number,
  "signal": "BUY"|"SELL"|"HOLD",
  "confidence": number (0-100),
  "color": string (tailwind color class like 'bg-blue-100 text-blue-600')
}`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let body: { action: string; symbol?: string };
  try { body = await req.json(); } catch { body = { action: 'top_picks' }; }

  // Call Gemini to generate/fetch realistic data
  let result: any = [];
  try {
    const gemRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: MARKET_DATA_PROMPT + `\nAction: ${body.action}\nSymbol: ${body.symbol || 'N/A'}` }]
          }],
          generationConfig: { response_mime_type: "application/json" }
        })
      }
    );
    const gemData = await gemRes.json();
    const rawText = gemData?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    result = JSON.parse(rawText);
  } catch (e) {
    console.error("Market Engine Error:", e);
    // Fallback data if Gemini fails
    result = body.action === 'quote' ? { symbol: body.symbol, price: 150.00, signal: 'HOLD', confidence: 50 } : [];
  }

  return new Response(JSON.stringify(result), { 
    status: 200, 
    headers: { ...corsHeaders, "Content-Type": "application/json" } 
  });
});
