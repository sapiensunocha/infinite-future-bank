import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { npoId } = await req.json();
    
    // 1. Initialize Supabase Admin (bypasses RLS to write the AI decision)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 2. Fetch the Pending Application Data
    const { data: npo, error: fetchError } = await supabaseAdmin
      .from('npo_profiles')
      .select('*')
      .eq('id', npoId)
      .single();

    if (fetchError || !npo) throw new Error("NPO not found in database.");

    // 3. Construct the Strict AI Prompt
    const systemPrompt = `You are the IFB Chief Compliance Officer. Evaluate this NPO application:
    Name: ${npo.npo_name}
    Tax ID: ${npo.tax_id}
    Sector: ${npo.sector}
    Country: ${npo.country}
    Volume: ${npo.estimated_volume}
    Mission: ${npo.mission_statement}

    Rules:
    1. If the country is under heavy international sanctions (e.g., North Korea, Iran) or mission is illegal: HARD REJECT.
    2. If estimated volume > $500k and highly professional: Route to 'Elite'.
    3. If estimated volume $50k-$500k: Route to 'Cluster'.
    4. If estimated volume is very low, missing details, or seems like an amateur/startup: Route to 'Support_Cluster' and assign a relevant cluster name (e.g., 'LATAM Education Incubator').

    Respond ONLY in strict JSON format. Do not include markdown formatting:
    {
      "decision": "Elite" | "Cluster" | "Support_Cluster" | "Banned",
      "risk_score": "Low" | "Medium" | "High",
      "cluster_name": "[Assigned Support Cluster Name or null]",
      "notes": "[1 sentence reasoning]"
    }`;

    let aiResponseText = "";

    // 4. DUAL-ENGINE AI ARCHITECTURE
    try {
      // PRIMARY ENGINE: Grok (xAI)
      console.log("Attempting Primary Engine: Grok...");
      const grokResponse = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${Deno.env.get('GROK_API_KEY')}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          model: 'grok-beta', 
          messages: [{ role: 'system', content: systemPrompt }],
          response_format: { type: "json_object" }
        })
      });

      if (!grokResponse.ok) throw new Error(`Grok failed with status: ${grokResponse.status}`);
      const data = await grokResponse.json();
      aiResponseText = data.choices[0].message.content;

    } catch (grokError) {
      // FALLBACK ENGINE: Gemini (Google)
      console.log(`Grok unavailable (${grokError.message}). Initiating Fallback Engine: Gemini...`);
      const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: { response_mime_type: "application/json" }
        })
      });

      if (!geminiResponse.ok) throw new Error(`Gemini Fallback failed: ${geminiResponse.statusText}`);
      const data = await geminiResponse.json();
      aiResponseText = data.candidates[0].content.parts[0].text;
    }

    // 5. Clean and Parse the JSON Output
    // Strips out potential markdown backticks that some LLMs stubbornly include
    const cleanJsonString = aiResponseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanJsonString);

    // 6. Execute the AI's Decision in the Database
    const { error: updateError } = await supabaseAdmin
      .from('npo_profiles')
      .update({
        program_tier: result.decision,
        verification_status: result.decision === 'Banned' ? 'rejected' : 'verified',
        ai_risk_score: result.risk_score,
        ai_compliance_notes: result.notes,
        assigned_support_cluster: result.cluster_name
      })
      .eq('id', npoId);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true, routing: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("AI Routing Pipeline Failed:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});