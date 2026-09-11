// kyc-admin-reextract
// Admin-only: re-runs Gemini extraction for a user's KYC submission
// Uses service role to download from private storage, then Gemini File API to avoid base64 payload limits
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY")!;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROMPT = `You are a KYC compliance officer. Analyze all provided document images (front and back of ID, selfie, proof of address) and extract every piece of information visible.

Return ONLY a valid JSON object with these exact keys (null for fields not found):
{
  "legal_first_name": string|null,
  "legal_middle_name": string|null,
  "legal_last_name": string|null,
  "legal_full_name": string|null,
  "date_of_birth": "YYYY-MM-DD"|null,
  "gender": string|null,
  "nationality": string|null,
  "country_of_birth": string|null,
  "id_type": "passport"|"national_id"|"drivers_license"|"voters_card"|"other"|null,
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
  "ai_id_verified": boolean,
  "ai_confidence_score": number,
  "ai_face_match_score": number|null,
  "ai_flags": string[],
  "ai_recommendation": "approve"|"reject"|"manual_review"
}

Important for Nigerian documents:
- NIN (National Identification Number) is 11 digits, often on the back of the NIN card
- Voters card has VIN number
- Look at ALL text carefully including small print
- ai_confidence_score: 0-100
- ai_id_verified: true only if document is clearly genuine
- ai_recommendation: approve if all looks good, manual_review if uncertain`;

function mimeFromPath(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

// Upload a blob to Gemini File API; returns the file URI for use in inference
async function uploadToGeminiFiles(blob: Blob, mime: string, name: string): Promise<string | null> {
  // Step 1: Start resumable upload
  const initRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: {
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": String(blob.size),
        "X-Goog-Upload-Header-Content-Type": mime,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ file: { displayName: name } }),
    }
  );
  if (!initRes.ok) {
    const err = await initRes.text();
    console.error("Gemini upload init failed:", initRes.status, err.slice(0, 200));
    return null;
  }
  const uploadUrl = initRes.headers.get("X-Goog-Upload-URL");
  if (!uploadUrl) return null;

  // Step 2: Upload the file
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": String(blob.size),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: blob,
  });
  if (!uploadRes.ok) {
    console.error("Gemini upload body failed:", uploadRes.status);
    return null;
  }
  const fileInfo = await uploadRes.json();
  return fileInfo?.file?.uri ?? null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const adminSb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: { user_id?: string; admin_key?: string };
  try { body = await req.json(); } catch { body = {}; }

  const ADMIN_SECRET = Deno.env.get("ADMIN_REEXTRACT_SECRET") ?? "ifb-admin-reextract-2026";
  if (body.admin_key !== ADMIN_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403, headers: corsHeaders });
  }

  if (!body.user_id) {
    return new Response(JSON.stringify({ error: "user_id required" }), { status: 400, headers: corsHeaders });
  }

  // Get submission
  const { data: sub, error: subErr } = await adminSb
    .from("kyc_submissions")
    .select("id, id_front_url, id_back_url, selfie_url, selfie_with_id_url, proof_of_address_url")
    .eq("user_id", body.user_id)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .single();

  if (subErr || !sub) {
    return new Response(JSON.stringify({ error: "Submission not found" }), { status: 404, headers: corsHeaders });
  }

  const pathFrom = (url: string | null) =>
    url?.match(/\/object\/(?:public\/|sign\/)?kyc_documents\/(.+?)(?:\?|$)/)?.[1] ?? null;

  const docPaths = [
    { label: "id_front",         path: pathFrom(sub.id_front_url) },
    { label: "id_back",          path: pathFrom(sub.id_back_url) },
    { label: "selfie_with_id",   path: pathFrom(sub.selfie_with_id_url) },
    { label: "proof_of_address", path: pathFrom(sub.proof_of_address_url) },
  ].filter(d => d.path);

  if (docPaths.length === 0) {
    return new Response(JSON.stringify({ error: "No documents found" }), { status: 400, headers: corsHeaders });
  }

  // Download from Supabase + upload to Gemini File API in parallel
  await adminSb.from("kyc_submissions").update({
    ai_extraction_status: "processing",
    updated_at: new Date().toISOString(),
  }).eq("id", sub.id);

  const parts: any[] = [{ text: PROMPT }];
  const downloaded: string[] = [];

  await Promise.all(docPaths.map(async ({ label, path }) => {
    const { data: fileData, error: dlErr } = await adminSb.storage
      .from("kyc_documents")
      .download(path!);
    if (dlErr || !fileData) { console.error(`Download failed for ${label}:`, dlErr?.message); return; }

    const mime = mimeFromPath(path!);
    const fileUri = await uploadToGeminiFiles(fileData, mime, `${label}_${sub.id}`);
    if (fileUri) {
      parts.push({ file_data: { mime_type: mime, file_uri: fileUri } });
      downloaded.push(label!);
    }
  }));

  if (parts.length === 1) {
    return new Response(JSON.stringify({ error: "Could not upload any documents to Gemini" }), { status: 400, headers: corsHeaders });
  }

  // Call Gemini inference (small request — files already uploaded via File API)
  let extracted: Record<string, unknown> = {};
  try {
    let gemData: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, attempt * 2000));
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
          }),
        }
      );
      const d = await res.json();
      if (res.ok) { gemData = d; break; }
      if (res.status !== 503) break;
    }
    if (gemData) {
      const outParts: any[] = gemData?.candidates?.[0]?.content?.parts ?? [];
      const rawText = outParts.map((p: any) => p.text ?? "").join("") || "{}";
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) extracted = JSON.parse(match[0]);
    }
  } catch (e: any) {
    console.error("Gemini inference error:", e.message);
  }

  // Build DB update
  const update: Record<string, unknown> = {
    ai_extraction_status: "completed",
    ai_data_extracted: extracted,
    ai_confidence_score: extracted.ai_confidence_score ?? null,
    ai_id_verified: extracted.ai_id_verified ?? null,
    ai_face_match_score: extracted.ai_face_match_score ?? null,
    ai_flags: extracted.ai_flags ?? [],
    ai_recommendation: extracted.ai_recommendation ?? "manual_review",
    ai_reviewed_at: new Date().toISOString(),
    ai_model_version: "gemini-3.5-flash",
    updated_at: new Date().toISOString(),
  };

  const directFields = [
    "legal_first_name","legal_middle_name","legal_last_name","legal_full_name",
    "date_of_birth","gender","nationality","country_of_birth",
    "id_type","id_number","id_expiry","id_issuing_country","id_issuing_authority",
    "residential_address_line1","residential_address_line2","residential_city",
    "residential_state","residential_postal_code","residential_country",
  ];
  for (const f of directFields) {
    if (extracted[f] != null) update[f] = extracted[f];
  }

  if (extracted.ai_recommendation === "approve" && (extracted.ai_confidence_score as number) >= 80) {
    update.status = "approved";
    await adminSb.from("profiles").update({ kyc_status: "verified", kyc_state: "APPROVED" }).eq("id", body.user_id);
    await adminSb.from("notifications").insert([{
      user_id: body.user_id, type: "system", read: false, status: "completed",
      message: "KYC Approved — Your identity has been verified.",
    }]);
  } else {
    update.status = "p2p_review";
    update.p2p_review_status = "pending";
    await adminSb.from("profiles").update({ kyc_status: "needs_more_info", kyc_state: "PENDING" }).eq("id", body.user_id);
  }

  await adminSb.from("kyc_submissions").update(update).eq("id", sub.id);

  return new Response(JSON.stringify({
    ok: true,
    documents_processed: downloaded,
    ai_recommendation: extracted.ai_recommendation ?? "manual_review",
    ai_confidence: extracted.ai_confidence_score ?? 0,
    extracted_fields: directFields.filter(f => extracted[f] != null),
    flags: extracted.ai_flags ?? [],
    extracted,
  }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
