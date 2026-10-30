import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders, getAuthedUser, HttpError, jsonResponse, errorResponse } from "../_shared/auth.ts";

// Receipts are only read from our own storage bucket via the service client.
// Arbitrary URLs are never fetched (SSRF) and never forwarded to third parties.
const RECEIPTS_BUCKET = Deno.env.get('RECEIPTS_BUCKET') ?? 'receipts';
const SAFE_PATH = /^[A-Za-z0-9_\-]+(\/[A-Za-z0-9_\-]+)*\.(png|jpe?g|webp)$/i;

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });

  try {
    const user = await getAuthedUser(req);
    // expectedAmount from the client is ignored; the order row is the source of truth.
    const { orderId, receiptPath } = await req.json();

    if (!orderId || typeof receiptPath !== 'string') {
      throw new HttpError(400, "Missing critical telemetry (orderId or receiptPath).");
    }
    if (!SAFE_PATH.test(receiptPath) || receiptPath.includes('..')) {
      throw new HttpError(400, "receiptPath must be an image path inside the receipts bucket.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: order, error: orderErr } = await supabaseAdmin
      .from('p2p_orders')
      .select('id, processor_id, amount_usd, status, metadata')
      .eq('id', orderId)
      .maybeSingle();
    if (orderErr || !order) throw new HttpError(404, "Order not found");
    if (order.processor_id !== user.id) throw new HttpError(403, "Not your order");
    if (order.status === 'completed') throw new HttpError(400, "Order already completed");

    const expectedAmount = Number(order.amount_usd);

    const { data: file, error: dlErr } = await supabaseAdmin.storage.from(RECEIPTS_BUCKET).download(receiptPath);
    if (dlErr || !file) throw new HttpError(404, "Receipt not found");
    if (file.size > 10 * 1024 * 1024) throw new HttpError(413, "Receipt too large");
    const mimeType = receiptPath.toLowerCase().endsWith('.png') ? 'image/png'
      : receiptPath.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/jpeg';
    const base64Image = bytesToBase64(new Uint8Array(await file.arrayBuffer()));
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

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
      const grokResponse = await fetch('https://api.x.ai/v1/chat/completions', {
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
                { type: "image_url", image_url: { url: dataUrl } }
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
    const targetAmount = expectedAmount;
    const isAmountValid = Number.isFinite(detectedAmount) && Number.isFinite(targetAmount) && targetAmount > 0 &&
      detectedAmount >= (targetAmount * 0.99) && detectedAmount <= (targetAmount * 1.01);

    const aiStatus = isAmountValid ? 'verified' : 'disputed';
    const nextOrderStatus = isAmountValid ? 'proof_verified' : 'disputed';

    // 5. Secure Ledger Update
    const { error: dbError } = await supabaseAdmin
      .from('p2p_orders')
      .update({
        status: nextOrderStatus,
        ai_verification_status: aiStatus,
        proof_image_url: `${RECEIPTS_BUCKET}/${receiptPath}`,
        metadata: {
          ...(order.metadata ?? {}),
          ocr: extractedData,
          ai_confidence: "high",
          expected_amount: expectedAmount,
          match_successful: isAmountValid
        }
      })
      .eq('id', orderId)
      .neq('status', 'completed');

    if (dbError) throw new Error(dbError.message);

    return jsonResponse(req, {
      success: true,
      match: isAmountValid,
      extracted_data: extractedData,
      status: aiStatus
    });

  } catch (error) {
    return errorResponse(req, error);
  }
});
