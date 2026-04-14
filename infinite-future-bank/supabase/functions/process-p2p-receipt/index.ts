import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to fetch image and convert to Base64 (needed for Gemini fallback)
async function fetchImageAsBase64(url: string) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { orderId, imageUrl, expectedAmount } = await req.json();

    if (!orderId || !imageUrl || !expectedAmount) {
      throw new Error("Missing critical telemetry (orderId, imageUrl, or expectedAmount).");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const grokKey = Deno.env.get('GROK_API_KEY');
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    
    if (!grokKey && !geminiKey) throw new Error("AI Core Offline: Missing both Grok and Gemini API Keys.");

    const systemPrompt = "You are an institutional financial AI auditor. Extract transaction data from the receipt image. Return ONLY a raw JSON object with keys: 'extracted_amount' (number), 'extracted_ref_id' (string), 'extracted_date' (string YYYY-MM-DD), 'sender_name' (string or null), 'receiver_name' (string or null). Do NOT wrap in markdown like ```json.";
    let rawContent = "";

    // ==========================================
    // ENGINE 1: GROK (Primary)
    // ==========================================
    try {
      console.log("Attempting Grok Vision Engine...");
      const grokResponse = await fetch('[https://api.x.ai/v1/chat/completions](https://api.x.ai/v1/chat/completions)', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${grokKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "grok-vision-beta", // xAI's vision model
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: [
                { type: "text", text: "Extract the financial telemetry from this receipt." },
                { type: "image_url", image_url: { url: imageUrl } }
              ]
            }
          ],
          temperature: 0.0,
        }),
      });

      if (!grokResponse.ok) throw new Error(`Grok failed with status ${grokResponse.status}`);
      const grokData = await grokResponse.json();
      rawContent = grokData.choices[0].message.content.trim();
      console.log("Grok Extraction Successful.");

    } catch (grokError) {
      console.log(`Grok Engine Failed: ${grokError.message}. Switching to Gemini Fallback...`);
      
      // ==========================================
      // ENGINE 2: GEMINI (Fallback)
      // ==========================================
      const base64Image = await fetchImageAsBase64(imageUrl);
      const mimeType = imageUrl.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

      const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: systemPrompt },
              { inline_data: { mime_type: mimeType, data: base64Image } }
            ]
          }],
          generationConfig: { temperature: 0.0 }
        })
      });

      if (!geminiResponse.ok) throw new Error("Gemini Fallback also failed.");
      const geminiData = await geminiResponse.json();
      rawContent = geminiData.candidates[0].content.parts[0].text.trim();
      console.log("Gemini Extraction Successful.");
    }

    // 3. Parse the AI JSON Output
    let extractedData;
    try {
      // Clean markdown just in case the AI added it anyway
      rawContent = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
      extractedData = JSON.parse(rawContent);
    } catch (e) {
      throw new Error("AI OCR returned malformed data. Verification failed.");
    }

    // 4. Mathematical Verification (1% Threshold)
    const detectedAmount = parseFloat(extractedData.extracted_amount);
    const targetAmount = parseFloat(expectedAmount);
    const isAmountValid = detectedAmount >= (targetAmount * 0.99) && detectedAmount <= (targetAmount * 1.01);

    const aiStatus = isAmountValid ? 'verified' : 'disputed';
    const nextOrderStatus = isAmountValid ? 'proof_verified' : 'disputed';

    // 5. Secure Ledger Update
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

    return new Response(JSON.stringify({ 
      success: true, 
      match: isAmountValid,
      extracted_data: extractedData,
      status: aiStatus
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400
    });
  }
});