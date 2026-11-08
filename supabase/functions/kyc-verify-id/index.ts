// kyc-verify-id — checks an ID number with Smile ID (Enhanced KYC, job type 5) and compares
// the registered name / date of birth with what the user typed.
//   POST { country: "NG", id_type: "NIN_V2" | "BVN" | ..., id_number, first_name, last_name, dob?: "YYYY-MM-DD", phone? }
//     → { verified, result_text, name_match, dob_match }
// Secrets: SMILE_PARTNER_ID, SMILE_API_KEY, SMILE_ENV ("sandbox" default | "production").
// Only the last 4 digits of the ID number are stored (kyc_id_checks). Max 5 checks per user per day.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, errorResponse, getAuthedUser, HttpError, jsonResponse } from "../_shared/auth.ts";
import { parseSmileResult, SMILE_ID_TYPES, smileSignature } from "../_shared/money-rails.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });
  try {
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
    const user = await getAuthedUser(req);
    const partnerId = Deno.env.get("SMILE_PARTNER_ID");
    const apiKey = Deno.env.get("SMILE_API_KEY");
    if (!partnerId || !apiKey) throw new HttpError(503, "ID verification is not configured yet");
    const base = (Deno.env.get("SMILE_ENV") ?? "sandbox") === "production"
      ? "https://api.smileidentity.com/v1" : "https://testapi.smileidentity.com/v1";

    const b = await req.json().catch(() => ({}));
    const country = String(b.country ?? "").toUpperCase();
    const idType = String(b.id_type ?? "").toUpperCase();
    const idNumber = String(b.id_number ?? "").trim();
    const first = String(b.first_name ?? "").trim();
    const last = String(b.last_name ?? "").trim();
    if (!SMILE_ID_TYPES[country]?.includes(idType)) throw new HttpError(400, "This ID type isn't supported for automatic checks");
    if (!/^[A-Za-z0-9-]{5,30}$/.test(idNumber)) throw new HttpError(400, "Enter the ID number as printed");
    if (!first || !last) throw new HttpError(400, "Enter your first and last name first");
    const dob = /^\d{4}-\d{2}-\d{2}$/.test(String(b.dob ?? "")) ? String(b.dob) : undefined;

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await admin.from("kyc_id_checks").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).gte("created_at", since);
    if ((count ?? 0) >= 5) throw new HttpError(429, "Too many ID checks today. Please try again tomorrow.");

    const timestamp = new Date().toISOString();
    const jobId = crypto.randomUUID();
    const res = await fetch(`${base}/id_verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_sdk: "rest_api", source_sdk_version: "1.0.0",
        partner_id: partnerId, timestamp, signature: await smileSignature(apiKey, partnerId, timestamp),
        country, id_type: idType, id_number: idNumber, first_name: first, last_name: last,
        ...(dob ? { dob } : {}), ...(b.phone ? { phone_number: String(b.phone) } : {}),
        partner_params: { job_id: jobId, user_id: user.id, job_type: 5 },
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const j = await res.json().catch(() => null);
    if (!res.ok || !j) throw new HttpError(502, "The ID service did not respond. Please try again.");
    const out = parseSmileResult(j);

    await admin.from("kyc_id_checks").insert({
      user_id: user.id, provider: "smile_id", country, id_type: idType, id_last4: idNumber.slice(-4), job_id: jobId,
      result_code: out.result_code, result_text: out.result_text.slice(0, 300), verified: out.verified,
      name_match: out.name_match, dob_match: out.dob_match,
    });

    return jsonResponse(req, { verified: out.verified, result_text: out.result_text, name_match: out.name_match, dob_match: out.dob_match });
  } catch (e) {
    return errorResponse(req, e);
  }
});
