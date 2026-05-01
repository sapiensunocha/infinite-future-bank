// kyc-ai-extract
// Uses Gemini Vision to extract 150 KYC data points from uploaded documents
// Called when user uploads ID, proof of address, income documents
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY")!;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const KYC_EXTRACTION_PROMPT = `You are an IFB AI Compliance Officer. Analyze the provided document image and extract ALL available information. Return ONLY a valid JSON object with these exact keys (use null for fields not found):

{
  "legal_first_name": string|null,
  "legal_middle_name": string|null,
  "legal_last_name": string|null,
  "legal_full_name": string|null,
  "date_of_birth": "YYYY-MM-DD"|null,
  "gender": string|null,
  "nationality": string|null,
  "country_of_birth": string|null,
  "id_type": "passport"|"national_id"|"drivers_license"|"other"|null,
  "id_number": string|null,
  "id_expiry": "YYYY-MM-DD"|null,
  "id_issuing_country": string|null,
  "id_issuing_authority": string|null,
  "residential_address_line1": string|null,
  "residential_address_line2": string|null,
  "residential_city": string|null,
  "residential_state": string|null,
  "residential_postal_code": string|null,
  "residential_country": string|null,
  "employer_name": string|null,
  "job_title": string|null,
  "monthly_income_usd": number|null,
  "primary_bank_name": string|null,
  "ai_id_verified": boolean,
  "ai_confidence_score": number,
  "ai_face_match_score": number|null,
  "ai_flags": string[],
  "ai_recommendation": "approve"|"reject"|"manual_review",
  "document_quality": "high"|"medium"|"low",
  "document_authentic_indicators": string[],
  "document_fraud_indicators": string[]
}

Rules:
- ai_confidence_score: 0-100, how confident you are in the extraction
- ai_id_verified: true only if document appears genuine and all security features are visible
- ai_flags: list any concerns (e.g., "document_expired", "blurry_photo", "address_mismatch")
- ai_recommendation: "approve" if clean, "manual_review" if uncertain, "reject" if fraud indicators
- Be conservative: when in doubt, use manual_review`;

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

  const adminSb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let body: { document_url?: string; document_type?: string; kyc_submission_id?: string };
  try { body = await req.json(); } catch { body = {}; }

  if (!body.document_url) {
    return new Response(JSON.stringify({ error: "document_url required" }), { status: 400, headers: corsHeaders });
  }

  // Get or create KYC submission
  let submissionId = body.kyc_submission_id;
  if (!submissionId) {
    const { data: existing } = await adminSb.from("kyc_submissions").select("id").eq("user_id", user.id).maybeSingle();
    if (existing) {
      submissionId = existing.id;
    } else {
      const { data: newSub } = await adminSb.from("kyc_submissions").insert([{
        user_id: user.id, status: "ai_reviewing", ai_extraction_status: "processing"
      }]).select().single();
      submissionId = newSub?.id;
    }
  }

  // Update status to processing
  await adminSb.from("kyc_submissions").update({
    status: "ai_reviewing",
    ai_extraction_status: "processing",
    updated_at: new Date().toISOString(),
  }).eq("id", submissionId);

  // Fetch document as base64 for Gemini Vision
  let imageBase64 = "";
  let mimeType = "image/jpeg";
  try {
    const imgRes = await fetch(body.document_url);
    const imgBuf = await imgRes.arrayBuffer();
    const bytes = new Uint8Array(imgBuf);
    const binStr = bytes.reduce((acc, b) => acc + String.fromCharCode(b), "");
    imageBase64 = btoa(binStr);
    const ct = imgRes.headers.get("content-type") || "image/jpeg";
    if (ct.includes("png")) mimeType = "image/png";
    else if (ct.includes("pdf")) mimeType = "application/pdf";
    else if (ct.includes("webp")) mimeType = "image/webp";
  } catch {
    return new Response(JSON.stringify({ error: "Could not fetch document" }), { status: 400, headers: corsHeaders });
  }

  // Call Gemini Vision API
  let extracted: Record<string, unknown> = {};
  try {
    const gemRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: KYC_EXTRACTION_PROMPT },
              { inline_data: { mime_type: mimeType, data: imageBase64 } }
            ]
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 2000 }
        })
      }
    );
    const gemData = await gemRes.json();
    const rawText = gemData?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) extracted = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error("Gemini extraction error:", e);
  }

  // Determine document-type-specific URL field
  const docTypeField: Record<string, string> = {
    id_front: "id_front_url", id_back: "id_back_url", selfie: "selfie_url",
    selfie_with_id: "selfie_with_id_url", proof_of_address: "proof_of_address_url",
    proof_of_income: "proof_of_income_url", bank_statement: "bank_statement_url",
  };
  const urlField = docTypeField[body.document_type || ""] || "additional_doc_1_url";

  // Build update payload from extracted data
  const update: Record<string, unknown> = {
    [urlField]: body.document_url,
    ai_extraction_status: "completed",
    ai_data_extracted: extracted,
    ai_confidence_score: extracted.ai_confidence_score ?? null,
    ai_id_verified: extracted.ai_id_verified ?? null,
    ai_face_match_score: extracted.ai_face_match_score ?? null,
    ai_flags: extracted.ai_flags ?? [],
    ai_recommendation: extracted.ai_recommendation ?? "manual_review",
    ai_reviewed_at: new Date().toISOString(),
    ai_model_version: "gemini-1.5-flash",
    updated_at: new Date().toISOString(),
  };

  // Map extracted identity fields directly to KYC submission columns
  const directFields = [
    "legal_first_name","legal_middle_name","legal_last_name","legal_full_name",
    "date_of_birth","gender","nationality","country_of_birth","id_type","id_number",
    "id_expiry","id_issuing_country","id_issuing_authority",
    "residential_address_line1","residential_city","residential_state",
    "residential_postal_code","residential_country",
  ];
  for (const f of directFields) {
    if (extracted[f] != null) update[f] = extracted[f];
  }

  // Set status based on AI recommendation
  if (extracted.ai_recommendation === "approve") update.status = "approved";
  else if (extracted.ai_recommendation === "reject") update.status = "p2p_review"; // don't auto-reject, send to human
  else update.status = "p2p_review";

  await adminSb.from("kyc_submissions").update(update).eq("id", submissionId);

  // If AI approved, update profiles.kyc_status
  if (extracted.ai_recommendation === "approve" && (extracted.ai_confidence_score as number) >= 80) {
    await adminSb.from("profiles").update({ kyc_status: "verified" }).eq("id", user.id);
    // Notify user
    await adminSb.from("notifications").insert([{
      user_id: user.id, type: "system", read: false, status: "completed",
      message: "KYC Approved — Your identity has been verified by our AI compliance system.",
    }]);
  } else {
    // Queue for P2P human review
    await adminSb.from("kyc_submissions").update({ p2p_review_status: "pending" }).eq("id", submissionId);
    await adminSb.from("notifications").insert([{
      user_id: user.id, type: "system", read: false, status: "completed",
      message: "KYC Under Review — Your documents are being reviewed by our compliance team. Usually 24-48 hours.",
    }]);
  }

  return new Response(JSON.stringify({
    submission_id: submissionId,
    status: update.status,
    ai_recommendation: extracted.ai_recommendation ?? "manual_review",
    ai_confidence: extracted.ai_confidence_score ?? 0,
    flags: extracted.ai_flags ?? [],
  }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
