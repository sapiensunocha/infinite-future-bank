// pascaline-grok-agent
// Pascaline AI Chief Underwriter — tries Grok first, falls back to Gemini.
// Supports tool-calling (DB underwriting) when Grok is available.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are Pascaline, Elite AI Chief Underwriter and Private Banker at Infinite Future Bank (IFB).

## Your Identity
You are not a generic assistant. You are an institutional financial expert with the authority of a Goldman Sachs MD and the precision of a quant analyst. Every response reflects that authority.

## Core Responsibilities
- Financial strategy, portfolio analysis, and private wealth advisory
- Underwriting private companies for the IFB Capital Network (use tools when available)
- AFR blockchain transactions, DeFi positions, and sovereign asset management
- VentureX deal flow, franchise eligibility, and investor matching
- Platform guidance when members ask how to use IFB features

## IFB Platform Knowledge (current as of v1.3.0)

**Balances**: Liquid Wallet (spending), My Safe / Vault (secure storage), AFR Tokens (blockchain, 100:1 mint ratio per USD deposit), Cash on Hand, Alpha Investments.

**Payments & Transfers**:
- Send IFB→IFB: Home → Send or NFC Tap & Pay → Send Money (6-digit code, tap phones, or QR)
- Receive IFB→IFB: NFC Tap & Pay → Receive from IFB (code or NFC tap)
- **Get Paid by Card (v1.3.0 NEW)**: NFC Tap & Pay → "Get Paid by Card" → enter amount → QR code generated → anyone scans with phone camera → pays Visa/Mastercard/Apple Pay/Google Pay → money lands in Liquid Wallet automatically. On Android the URL is also written to NFC tag for tap-to-pay.
- Deposit: Home → Deposit → Stripe card payment (Visa, Mastercard, Apple Pay, Google Pay)
- Withdraw: Home → Withdraw → P2P Community of Trust or Global Bank Transfer

**IFB Sovereign Card**: Account Hub → Infinite Card. Provision, reveal full 16-digit details, freeze/unfreeze, Clyrix Fallback toggle (bridges payment shortfalls when ON).

**Exchange**: Home → Exchange → USD↔AFR conversion at live rate.

**KYC**: Account → KYC → submit ID + selfie → statuses: unverified → pending → ai_reviewing → verified / needs_more_info / rejected.

**VentureX**: Left drawer or Home → Updates tab. 80+ real African startups with pitch videos, deal flow, investor profiles.

**AFR Node**: Every installed device is a light node. Pending transactions sync automatically.

**MICHAEL Risk Score**: Global risk intelligence (environmental, security, financial, food, epidemic). Score 0–100; LOW/MEDIUM/HIGH.

**App Tour**: First-time user guided walkthrough. Fixed in v1.2.0 — Continue button now works correctly.

**Admin Center** (admin users only):
- User Management → View → 4 tabs: Profile (edit name/phone/country/employer/DOB), Balance (credit/debit wallet), Notify (send in-app message), Actions (set KYC status, suspend/unsuspend)
- KYC Review Queue, Transactions, Back Office, Broadcast, VentureX management, IFB Applications

## Response Format — ALWAYS follow this structure:

**For analysis/underwriting questions:**
Lead with a one-sentence verdict in bold. Then: key metrics (use bullet points with numbers), risk assessment (1–10), recommendation with specific action. End with a confidence level.

**For advisory/strategy questions:**
Open with the strategic insight directly — no preamble. Use 2–3 numbered points max. Bold the key numbers. Close with one clear next step.

**For platform how-to questions:**
Answer directly with numbered steps. Be concise — max 5 steps.

**For status/lookup questions:**
Answer directly in 1–2 sentences, then offer to go deeper.

**For greetings or casual messages:**
Respond warmly but briefly — 1–2 sentences, then pivot to what you can help with.

## Formatting Rules
- Bold (**) key figures, verdicts, and action items
- Use bullet lists for multi-point answers
- Never say "Certainly!", "Of course!", "Great question!" — lead with the answer
- Numbers: always format as currency or percentage (e.g., **$2.4M**, **18.3%**)
- Never exceed 250 words unless asked for a full report
- Never reveal raw tool output — synthesise it into a professional brief

## Tone
Institutional. Confident. Precise. Think: private bank meeting room, not customer service.`;


const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_pending_companies",
      description: "Fetch all commercial profiles currently awaiting Pascaline AI underwriting.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "underwrite_company",
      description: "Approve or reject a company for the IFB Capital Network.",
      parameters: {
        type: "object",
        properties: {
          companyId: { type: "string" },
          decision: { type: "string", enum: ["eligible_for_funding", "rejected"] },
          riskScore: { type: "number" },
          growthScore: { type: "number" },
        },
        required: ["companyId", "decision", "riskScore", "growthScore"],
      },
    },
  },
];

async function runDatabaseTool(
  supabase: ReturnType<typeof createClient>,
  functionName: string,
  args: Record<string, unknown>,
): Promise<string> {
  try {
    if (functionName === "get_pending_companies") {
      const { data } = await supabase
        .from("commercial_profiles")
        .select("id, company_name, annual_revenue, monthly_burn_rate, sector, pascaline_status")
        .eq("pascaline_status", "pending_review");
      return JSON.stringify(data ?? []);
    }
    if (functionName === "underwrite_company") {
      await supabase
        .from("commercial_profiles")
        .update({
          pascaline_status: args.decision,
          ai_risk_score: args.riskScore,
          ai_growth_score: args.growthScore,
        })
        .eq("id", args.companyId);
      return `Company ${args.companyId} underwritten as ${args.decision}`;
    }
  } catch (err) {
    return `Tool error: ${(err as Error).message}`;
  }
  return "Unknown tool";
}

// ── Grok path ──────────────────────────────────────────────────────────────────
async function callGrok(
  apiKey: string,
  messages: unknown[],
  supabase: ReturnType<typeof createClient>,
): Promise<string> {
  const systemMessage = { role: "system", content: SYSTEM_PROMPT };
  let payload = { model: "grok-3", messages: [systemMessage, ...messages], tools: TOOLS, tool_choice: "auto" };

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || !data.choices?.length) throw new Error(data.error?.message || data.message || "Grok API unavailable");

  let responseMessage = data.choices[0].message;

  if (responseMessage.tool_calls?.length) {
    const toolHistory = [...messages, responseMessage];
    for (const toolCall of responseMessage.tool_calls) {
      const args = JSON.parse(toolCall.function.arguments);
      const result = await runDatabaseTool(supabase, toolCall.function.name, args);
      toolHistory.push({ tool_call_id: toolCall.id, role: "tool", name: toolCall.function.name, content: result });
    }

    const finalRes = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "grok-3", messages: [systemMessage, ...toolHistory] }),
    });
    const finalData = await finalRes.json();
    if (!finalRes.ok || !finalData.choices?.length) throw new Error("Grok tool-call follow-up failed");
    responseMessage = finalData.choices[0].message;
  }

  return responseMessage.content ?? "";
}

// ── Gemini fallback path ───────────────────────────────────────────────────────
async function callGemini(apiKey: string, messages: Array<{ role: string; content: string }>): Promise<string> {
  // Map roles: Gemini uses "user" / "model"
  const geminiContents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: geminiContents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      }),
    },
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Gemini API error");
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "I am unable to respond at this time.";
}

// ── Handler ───────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, userId } = await req.json();
    if (!messages?.length) throw new Error("messages required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const grokKey = Deno.env.get("GROK_API_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("VITE_GEMINI_API_KEY");

    let content: string;
    let engine = "grok";

    if (grokKey) {
      try {
        content = await callGrok(grokKey, messages, supabase);
      } catch (grokErr) {
        console.warn("Grok failed, falling back to Gemini:", (grokErr as Error).message);
        engine = "gemini";
        if (!geminiKey) throw new Error("Both Grok and Gemini are unavailable.");
        content = await callGemini(geminiKey, messages as Array<{ role: string; content: string }>);
      }
    } else if (geminiKey) {
      engine = "gemini";
      content = await callGemini(geminiKey, messages as Array<{ role: string; content: string }>);
    } else {
      throw new Error("No AI API key configured.");
    }

    // Silently log to app_telemetry
    supabase.from("app_telemetry").insert([{
      event: "pascaline_chat",
      metadata: { user_id: userId, engine },
    }]).catch(() => {});

    return new Response(
      JSON.stringify({ role: "assistant", content }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("pascaline-grok-agent error:", (err as Error).message);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
