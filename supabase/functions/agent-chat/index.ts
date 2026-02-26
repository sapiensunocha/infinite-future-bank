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