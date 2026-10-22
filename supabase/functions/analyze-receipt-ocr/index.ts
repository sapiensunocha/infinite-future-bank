// analyze-receipt-ocr
// Uses Gemini Vision to extract transaction details from bank receipts, mobile money screenshots, etc.
// Used by P2P Exchange and Deposit Interface to verify transfers.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY")!;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RECEIPT_EXTRACTION_PROMPT = `You are an IFB AI Financial Auditor. Analyze the provided receipt/screenshot and extract transaction details. 
Return ONLY a valid JSON object with these exact keys:

{
  "extracted_ref_id": string|null,
  "extracted_amount": number|null,
  "extracted_date": "YYYY-MM-DD"|null,
  "sender_name": string|null,
  "receiver_name": string|null,
  "payment_method": string|null,
  "is_authentic": boolean,
  "confidence_score": number,
  "flags": string[]
}

Rules:
- confidence_score: 0-100
- is_authentic: true if it looks like a real transaction receipt
- flags: list any issues like "amount_mismatch", "date_too_old", "suspicious_font"
- If it's a mobile money screenshot (M-Pesa, Wave, etc.), look for the unique Transaction ID.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  let body: { imageUrl?: string; expectedAmount?: number };
  try { body = await req.json(); } catch { body = {}; }

  if (!body.imageUrl) {
    return new Response(JSON.stringify({ error: "imageUrl required" }), { status: 400, headers: corsHeaders });
  }

  // Fetch image as base64
  let imageBase64 = "";
  let mimeType = "image/jpeg";
  try {
    const imgRes = await fetch(body.imageUrl);
    const imgBuf = await imgRes.arrayBuffer();
    const bytes = new Uint8Array(imgBuf);
    const binStr = bytes.reduce((acc, b) => acc + String.fromCharCode(b), "");
    imageBase64 = btoa(binStr);
    mimeType = imgRes.headers.get("content-type") || "image/jpeg";
  } catch {
    return new Response(JSON.stringify({ error: "Could not fetch image" }), { status: 400, headers: corsHeaders });
  }

  // Call Gemini Vision API
  let extracted: any = {};
  try {
    const gemRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: RECEIPT_EXTRACTION_PROMPT + (body.expectedAmount ? `\nExpected Amount: $${body.expectedAmount}` : "") },
              { inline_data: { mime_type: mimeType, data: imageBase64 } }
            ]
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1000 }
        })
      }
    );
    const gemData = await gemRes.json();
    const rawText = gemData?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) extracted = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error("Gemini OCR error:", e);
    return new Response(JSON.stringify({ error: "AI Engine processing failed" }), { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify(extracted), { 
    status: 200, 
    headers: { ...corsHeaders, "Content-Type": "application/json" } 
  });
});
