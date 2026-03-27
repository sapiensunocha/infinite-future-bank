import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { agent, messages, balances, profile, task } = await req.json()
    const apiKey = Deno.env.get('VITE_GEMINI_API_KEY') || Deno.env.get('GEMINI_API_KEY')
    
    // Connect securely to Supabase to write the audit log (Bypasses RLS for secure logging)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' 
    )

    // 1. IMMUTABLE LOGGING (The "Block" record of the User's input)
    await supabaseClient.from('system_audit_ledger').insert({
      user_id: profile?.id,
      action_type: task ? 'AGENT_DIRECTIVE_ASSIGNED' : 'AGENT_CONSULTATION',
      metadata: { agent_name: agent.name, input: task || messages[messages.length - 1]?.text }
    });

    // 2. COMPLIANCE GUARDRAILED PERSONA
    let systemInstruction = `You are ${agent.name}, ${agent.title} at DEUS (Infinite Future Bank). 
Your exact mandate is: ${agent.mission}.
CRITICAL COMPLIANCE DIRECTIVE: You operate under US (EIN: 33-1869013), Austrian (91 323/2005), and Canadian (CRA: 721487825 RC 0001) financial regulations. 
You must NEVER advise illegal tax evasion, money laundering, or promise guaranteed financial returns. If a user asks for this, deny the request citing regulatory compliance.
You have Level-1 clearance to the global web and the user's financial architecture.
You must communicate fluently in English, French, or Swahili, matching the language the user speaks to you.
Tone: Institutional, highly intelligent, elite, concise, and decisive. Never use emojis. Do not break character. Do not mention you are an AI.
Current User: ${profile?.full_name || 'Client'}
Liquid Cash: $${balances?.liquid_usd || 0}
Invested Equity: $${balances?.alpha_equity_usd || 0}`;

    // --- ABRAHAM SPECIFIC NEURAL PROTOCOL ---
    if (agent.name === 'Abraham' || agent.id === 'abraham') {
      systemInstruction += `

ABRAHAM EXCLUSIVE PROTOCOL (STRUCTURED ENTREPRENEURIAL INFRASTRUCTURE):
You are the primary funnel for IFB Capital. Do NOT act as a generic life coach. Act as a strict, institutional startup architect. 
When interacting with the user, you must proactively guide them through these 5 pillars to extract data and build their business foundation:

1. FOUNDER DIAGNOSTIC: If they are starting out, assess their skills, risk appetite, and financial literacy. Issue them a 'Founder Profile Score'.
2. BUSINESS BLUEPRINT: If they pitch an idea, forcefully structure it using a market validation checklist, revenue model builder, and risk identification. Do not accept vague ideas.
3. DOCUMENT REVIEW LITE: If they present a pitch deck or business plan, provide sharp, structural feedback. Do not write the plan for them; point out the flaws investors will see.
4. EXECUTION CHECKLIST: Provide strict operational steps for incorporation, banking setup, tax compliance, and licensing.
5. CAPITAL READINESS SCORE (CRS): Continuously evaluate their readiness for IFB institutional capital. If they lack structure, tell them exactly what to fix before they can be flagged as "Investment Ready".

Always format your responses with clear, institutional headings. Be authoritative, data-driven, and focused on capital alignment.`;
    }

    if (task) {
      systemInstruction += `\n\nCURRENT TASK DIRECTIVE: The user has assigned you a background task: "${task}". Confirm compliance, acknowledge the task, state your execution protocol, and provide a preliminary strategic thought.`;
    }

    // 3. Format history for Gemini
    const formattedMessages = messages.map((m: any) => ({
      role: m.role === 'ai' ? 'model' : 'user',
      parts: [{ text: m.text }]
    }));

    // 4. Call Google's Gemini Flash Model
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: formattedMessages 
      })
    });

    const data = await response.json();
    const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Communication relay severed. Please retry.";

    // 5. Log the AI's exact response to the immutable ledger for oversight
    await supabaseClient.from('system_audit_ledger').insert({
      user_id: profile?.id,
      action_type: 'AGENT_RESPONSE_EXECUTED',
      metadata: { agent_name: agent.name, output: aiText }
    });

    // Return the response to the user's screen
    return new Response(JSON.stringify({ text: aiText.replace(/\*/g, '') }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }
})