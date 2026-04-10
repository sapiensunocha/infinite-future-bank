import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { orderId, imageUrl, expectedAmount } = await req.json();

    if (!orderId || !imageUrl || !expectedAmount) {
      throw new Error("Missing critical telemetry (orderId, imageUrl, or expectedAmount).");
    }

    // 1. Initialize Supabase Admin Client (Bypasses RLS to securely update the ledger)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 2. Call OpenAI Vision API to extract the data
    const openAiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAiKey) throw new Error("AI Core Offline: Missing API Key.");

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a strict, institutional financial AI auditor for Infinite Future Bank. Extract transaction data from the provided receipt image. You must return ONLY a raw, valid JSON object with the following keys: 'extracted_amount' (number), 'extracted_ref_id' (string), 'extracted_date' (string, YYYY-MM-DD), 'sender_name' (string or null), 'receiver_name' (string or null). Do not wrap the JSON in markdown blocks like ```json."
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract the financial telemetry from this receipt." },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ],
        max_tokens: 300,
        temperature: 0.0, // Zero creativity, strict facts only
      }),
    });

    const aiData = await aiResponse.json();
    if (aiData.error) throw new Error(aiData.error.message);

    // 3. Parse the AI JSON Output
    const rawContent = aiData.choices[0].message.content.trim();
    let extractedData;
    try {
      extractedData = JSON.parse(rawContent);
    } catch (e) {
      throw new Error("AI OCR returned malformed data. Verification failed.");
    }

    // 4. Mathematical Verification (Threshold matching)
    // We allow a 1% margin of error for currency conversion edge cases, but mostly it should be exact.
    const detectedAmount = parseFloat(extractedData.extracted_amount);
    const targetAmount = parseFloat(expectedAmount);
    
    // Check if the receipt amount matches what was requested
    const isAmountValid = detectedAmount >= (targetAmount * 0.99) && detectedAmount <= (targetAmount * 1.01);

    // Determine the next status for the Blockchain/Ledger
    const aiStatus = isAmountValid ? 'verified' : 'disputed';
    const nextOrderStatus = isAmountValid ? 'proof_verified' : 'disputed';

    // 5. Update the Database securely from the backend
    const { error: dbError } = await supabaseAdmin
      .from('p2p_orders')
      .update({
        status: nextOrderStatus,
        ai_verification_status: aiStatus,
        proof_image_url: imageUrl,
        metadata: {
          ...extractedData,
          ai_confidence: "high",
          expected_amount: expectedAmount,
          match_successful: isAmountValid
        }
      })
      .eq('id', orderId);

    if (dbError) throw dbError;

    // 6. Return the finalized payload to the client
    return new Response(JSON.stringify({ 
      success: true, 
      match: isAmountValid,
      extracted_data: extractedData,
      status: aiStatus,
      message: isAmountValid 
        ? "AI Verification Complete. Data prepped for Blockchain settlement." 
        : "AI Discrepancy Detected. The receipt amount does not match the order."
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});