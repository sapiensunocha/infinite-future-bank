import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const adminSb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const USER_IDS = [
    "1cf1ceea-3bcc-4b71-a77a-5e1f3dbd62db",
    "40fbda53-32ae-4592-933e-72a99353585f",
    "db4701d8-0286-4c45-9340-bebde7dcdcf5",
    "9c43e21b-5ba0-4e02-9cb9-f3ac02b42773",
    "8fd6d5cc-42cc-4e08-9770-2ef5bc5a06e2",
    "2c5d1832-48b9-4df6-b75e-62123a1a7026",
    "82e0e4ec-e989-4228-854f-cb530c4d4239",
    "d7f51c16-c027-492a-8eaf-aec9084d70c4",
    "44f29e46-04ec-479d-88f0-6b534e7e5bc7",
  ];

  const { data: subs } = await adminSb
    .from("kyc_submissions")
    .select("user_id,status,ai_recommendation,ai_confidence_score,risk_rating,ai_flags,reviewer_notes,ai_reviewed_at,legal_first_name,legal_last_name,email_primary")
    .in("user_id", USER_IDS);

  const { data: profiles } = await adminSb
    .from("profiles")
    .select("id,full_name,email")
    .in("id", USER_IDS);

  const nameMap = Object.fromEntries((profiles || []).map((p: { id: string; full_name: string; email: string }) => [p.id, p]));

  const report = (subs || []).map((s: Record<string, unknown>) => {
    const p = nameMap[s.user_id as string] || {};
    return {
      name: (p as Record<string,string>).full_name || `${s.legal_first_name} ${s.legal_last_name}`,
      email: (p as Record<string,string>).email || s.email_primary,
      user_id: s.user_id,
      decision: s.ai_recommendation || s.status,
      confidence: s.ai_confidence_score,
      risk: s.risk_rating,
      flags: s.ai_flags,
      notes: s.reviewer_notes,
      reviewed_at: s.ai_reviewed_at,
    };
  });

  return new Response(JSON.stringify(report, null, 2), { headers: { ...cors, "Content-Type": "application/json" } });
});
