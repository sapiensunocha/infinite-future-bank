import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { messages, userId } = await req.json()

    // 1. Initialize Admin Database Access
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Define the Tools Grok is allowed to use
    const tools = [
      {
        type: "function",
        function: {
          name: "get_pending_companies",
          description: "Fetch all commercial profiles currently waiting for Pascaline AI underwriting.",
          parameters: { type: "object", properties: {}, required: [] }
        }
      },
      {
        type: "function",
        function: {
          name: "underwrite_company",
          description: "Approve or reject a company for the IFB Dark Pool based on telemetry. Updates the database.",
          parameters: {
            type: "object",
            properties: {
              companyId: { type: "string", description: "The UUID of the company" },
              decision: { type: "string", enum: ["eligible_for_funding", "rejected"], description: "The final underwriting decision" },
              riskScore: { type: "number", description: "Calculated risk score (1-99)" },
              growthScore: { type: "number", description: "Calculated growth score (1-99)" }
            },
            required: ["companyId", "decision", "riskScore", "growthScore"]
          }
        }
      }
    ];

    // 3. System Prompt to define Pascaline's Personality and Rules
    const systemPrompt = {
      role: "system",
      content: `You are Pascaline, the elite AI Chief Underwriter and Concierge for Infinite Future Bank (IFB). 
      Your job is to assist the user, analyze financial telemetry, and underwrite private companies.
      If the user asks you to check for pending companies, use your 'get_pending_companies' tool.
      If you see a pending company, analyze their annual revenue and burn rate. If Revenue > Burn Rate * 12, underwrite them using 'underwrite_company' with 'eligible_for_funding'. Otherwise, 'rejected'. Keep responses extremely professional, concise, and institutional.`
    };

    // 4. Call Grok API (xAI)
    const grokApiKey = Deno.env.get('GROK_API_KEY');
    if (!grokApiKey) throw new Error("Missing GROK_API_KEY");

    let payload = {
      model: "grok-3",
      messages: [systemPrompt, ...messages],
      tools: tools,
      tool_choice: "auto"
    };

    const grokRes = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${grokApiKey}`
      },
      body: JSON.stringify(payload)
    });

    let grokData = await grokRes.json();
    if (!grokData.choices || grokData.choices.length === 0) {
      throw new Error(grokData.error || grokData.message || 'Grok API returned no response.');
    }
    let responseMessage = grokData.choices[0].message;

    // 5. Handle Grok using a Tool (e.g. touching the database)
    if (responseMessage.tool_calls) {
      const toolCalls = responseMessage.tool_calls;
      messages.push(responseMessage); // Save Grok's tool request to history

      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        let toolResult = "";

        // Execute Database Logic based on what Grok chose to do
        try {
          if (functionName === "get_pending_companies") {
            const { data } = await supabase.from('commercial_profiles').select('*').eq('pascaline_status', 'pending_review');
            toolResult = JSON.stringify(data);
          } 
          else if (functionName === "underwrite_company") {
            const { data } = await supabase.from('commercial_profiles').update({
              pascaline_status: args.decision,
              ai_risk_score: args.riskScore,
              ai_growth_score: args.growthScore
            }).eq('id', args.companyId).select();
            toolResult = `Successfully updated company ${args.companyId} to ${args.decision}`;
          }
        } catch (err) {
          toolResult = `Error: ${err.message}`;
        }

        // Add the database result to the message history so Grok can read it
        messages.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: functionName,
          content: toolResult
        });
      }

      // 6. Send the database data BACK to Grok so it can summarize it for the user
      const finalGrokRes = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${grokApiKey}` },
        body: JSON.stringify({
          model: "grok-3",
          messages: [systemPrompt, ...messages]
        })
      });

      grokData = await finalGrokRes.json();
      if (!grokData.choices || grokData.choices.length === 0) {
        throw new Error(grokData.error || grokData.message || 'Grok API returned no final response.');
      }
      responseMessage = grokData.choices[0].message;
    }

    // 7. Return the final text to the React Frontend
    return new Response(
      JSON.stringify({ role: "assistant", content: responseMessage.content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})