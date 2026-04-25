import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // 🔴 FIX: Declare npoId OUTSIDE the try block so the catch block can use it
  let npoId: string | null = null;

  try {
    const body = await req.json();
    npoId = body.npoId;
    
    if (!npoId) throw new Error("Missing npoId");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Helper function to push live telemetry to the database
    const updateStatus = async (status: string) => {
      await supabaseAdmin.from('npo_profiles').update({ live_ai_status: status }).eq('id', npoId);
    };

    await updateStatus("Initializing AI Compliance Pipeline...");

    const { data: npo, error: fetchError } = await supabaseAdmin
      .from('npo_profiles')
      .select('*')
      .eq('id', npoId)
      .single();

    if (fetchError || !npo) throw new Error("NPO not found in database.");

    await updateStatus("Constructing parameter matrices...");

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

    try {
      await updateStatus("Attempting primary connection to Grok Neural Net...");
      
      const grokResponse = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${Deno.env.get('GROK_API_KEY')}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          model: 'grok-beta', 
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: 'Analyze this NPO and return the JSON.' }
          ]
        })
      });

      if (!grokResponse.ok) throw new Error(`Grok failed with status: ${grokResponse.status}`);
      await updateStatus("Grok analysis received. Parsing neural data...");
      
      const data = await grokResponse.json();
      aiResponseText = data.choices[0].message.content;

    } catch (grokError) {
      await updateStatus(`Grok unavailable. Initiating Fallback to Gemini Core...`);
      
      const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt + "\n\nAnalyze this NPO and return the JSON." }] }]
        })
      });

      if (!geminiResponse.ok) throw new Error(`Gemini Fallback failed: ${geminiResponse.statusText}`);
      await updateStatus("Gemini analysis received. Parsing core data...");
      
      const data = await geminiResponse.json();
      aiResponseText = data.candidates[0].content.parts[0].text;
    }

    await updateStatus("Sanitizing and executing decision payload...");
    const cleanJsonString = aiResponseText.match(/\{[\s\S]*\}/)?.[0] || "{}";
    const result = JSON.parse(cleanJsonString);

    if (!result.decision) throw new Error("AI returned invalid structure.");

    await updateStatus("Finalizing ledger insertion...");

    const { error: updateError } = await supabaseAdmin
      .from('npo_profiles')
      .update({
        program_tier: result.decision,
        verification_status: result.decision === 'Banned' ? 'rejected' : 'verified',
        ai_risk_score: result.risk_score,
        ai_compliance_notes: result.notes,
        assigned_support_cluster: result.cluster_name,
        live_ai_status: 'COMPLETE'
      })
      .eq('id', npoId);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true, routing: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("AI Pipeline Failed:", error);
    
    // 🔴 FIX: Now we correctly use npoId to flag the failure back to the specific user's screen
    if (npoId) {
      const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
      await supabaseAdmin.from('npo_profiles').update({ 
        live_ai_status: 'FAILED: ' + (error.message || 'Network Error'),
        program_tier: 'Pending_AI_Review'
      }).eq('id', npoId);
    }
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});