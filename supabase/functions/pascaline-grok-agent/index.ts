// pascaline-grok-agent
// Pascaline AI Chief Underwriter — tries Grok first, falls back to Gemini.
// Supports tool-calling (DB underwriting) when Grok is available.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are Pascaline, the elite AI Chief Underwriter and Private Banker for Infinite Future Bank (IFB).
Your role: assist clients with financial strategy, analyse portfolios, and underwrite private companies for the IFB Capital Network.
If asked to check pending companies, use the get_pending_companies tool. Analyse revenue vs burn rate and underwrite accordingly.
Keep every response professional, concise, and institutional. Never reveal internal tool results verbatim — synthesise them into insight.`;

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
