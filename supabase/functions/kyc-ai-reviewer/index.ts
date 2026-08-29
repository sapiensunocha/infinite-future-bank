// kyc-ai-reviewer
// ARIA — Autonomous Regulatory Intelligence Agent.
// Reads the full 150-field KYC submission, makes a binding compliance decision
// via Groq (llama-3.3-70b-versatile), writes it back, and emails the user.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const GROQ_KEY     = Deno.env.get("GROQ_API_KEY")!;
const RESEND_KEY   = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Helpers ────────────────────────────────────────────────────────────────

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// Returns null for falsy / "null" / empty strings so the prompt stays clean
function clean(v: unknown): string | null {
  if (v === null || v === undefined || v === "" || v === "null") return null;
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function field(label: string, value: unknown): string {
  const v = clean(value);
  return v ? `  ${label}: ${v}` : "";
}

// ── KYC status emails via Resend ───────────────────────────────────────────

const FROM = "DEUS · Infinite Future Bank <noreply@infinitefuturebank.org>";
const APP  = "https://app.infinitefuturebank.org";

const BASE_STYLE = `
  body{margin:0;padding:0;background:#060912;font-family:'Helvetica Neue',Arial,sans-serif;}
  .wrap{max-width:580px;margin:0 auto;padding:48px 24px;}
  .logo{text-align:center;margin-bottom:40px;font-size:22px;font-weight:900;letter-spacing:.12em;color:#fff;}
  .card{background:#0f172a;border:1px solid #1e293b;border-radius:16px;padding:36px;}
  .badge{display:inline-block;padding:6px 16px;border-radius:100px;font-size:11px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;margin-bottom:24px;}
  h2{margin:0 0 12px;font-size:22px;font-weight:900;color:#f1f5f9;}
  p{margin:0 0 16px;font-size:15px;line-height:1.65;color:#94a3b8;}
  .btn{display:inline-block;margin-top:8px;padding:14px 32px;background:#2563eb;color:#fff;font-weight:900;font-size:13px;letter-spacing:.08em;text-transform:uppercase;border-radius:12px;text-decoration:none;}
  .list{margin:16px 0;padding:0 0 0 20px;color:#94a3b8;font-size:14px;line-height:2;}
  .footer{text-align:center;margin-top:32px;font-size:11px;color:#334155;}
`;

function emailHtml(badge: string, badgeColor: string, heading: string, body: string, cta?: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${heading}</title><style>${BASE_STYLE}</style></head>
<body><div class="wrap">
  <div class="logo">⬡ DEUS</div>
  <div class="card">
    <span class="badge" style="background:${badgeColor}20;color:${badgeColor};border:1px solid ${badgeColor}40">${badge}</span>
    <h2>${heading}</h2>
    ${body}
    ${cta ? `<a href="${APP}" class="btn">${cta}</a>` : ""}
  </div>
  <div class="footer">Infinite Future Bank · This is an automated compliance notification.<br/>
  Do not reply to this email · <a href="${APP}" style="color:#475569;">app.infinitefuturebank.org</a></div>
</div></body></html>`;
}

function kycApprovedHtml(firstName: string): string {
  return emailHtml(
    "KYC Approved", "#22c55e",
    `Welcome aboard, ${firstName}.`,
    `<p>Your identity has been verified and your IFB account is now fully activated.</p>
     <p>You now have access to:</p>
     <ul class="list">
       <li>Higher deposit &amp; withdrawal limits</li>
       <li>VentureX investment platform</li>
       <li>IFB Sovereign Card</li>
       <li>Cross-border transfers &amp; MySafe vault</li>
     </ul>
     <p>Log in to explore your full account.</p>`,
    "Open DEUS App"
  );
}

function kycNeedsMoreInfoHtml(firstName: string, notes: string, missing: string[]): string {
  const missingList = missing.length
    ? `<p>Please provide the following:</p><ul class="list">${missing.map(m => `<li>${m}</li>`).join("")}</ul>`
    : "";
  return emailHtml(
    "Action Required", "#f59e0b",
    `${firstName}, we need a little more from you.`,
    `<p>Your KYC application is almost there — our compliance system flagged a few items that need attention before we can verify your account.</p>
     ${notes ? `<p style="background:#1e293b;padding:16px;border-radius:10px;color:#cbd5e1;font-size:13px;">${notes}</p>` : ""}
     ${missingList}
     <p>Log in to your account and resubmit the requested information. Your progress is saved.</p>`,
    "Complete KYC Now"
  );
}

function kycRejectedHtml(firstName: string, notes: string): string {
  return emailHtml(
    "KYC Unsuccessful", "#ef4444",
    `${firstName}, we were unable to verify your identity.`,
    `<p>After a thorough review, our compliance team was unable to approve your KYC application at this time.</p>
     ${notes ? `<p style="background:#1e293b;padding:16px;border-radius:10px;color:#cbd5e1;font-size:13px;">${notes}</p>` : ""}
     <p>If you believe this decision is incorrect or have questions, please contact our compliance team directly at <a href="mailto:compliance@infinitefuturebank.org" style="color:#60a5fa;">compliance@infinitefuturebank.org</a>.</p>`,
    "Contact Support"
  );
}

async function sendKycEmail(
  toEmail: string,
  toName: string,
  decision: "approved" | "needs_more_info" | "rejected",
  notes: string,
  missing: string[],
) {
  if (!RESEND_KEY) return;
  const firstName = toName?.split(" ")[0] || "there";

  const subjects: Record<string, string> = {
    approved:        "Your IFB account is verified ✓",
    needs_more_info: "Action required — complete your KYC",
    rejected:        "IFB KYC — application update",
  };
  const htmlMap: Record<string, string> = {
    approved:        kycApprovedHtml(firstName),
    needs_more_info: kycNeedsMoreInfoHtml(firstName, notes, missing),
    rejected:        kycRejectedHtml(firstName, notes),
  };

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_KEY}`,
      },
      body: JSON.stringify({
        from:    FROM,
        to:      toEmail,
        subject: subjects[decision],
        html:    htmlMap[decision],
      }),
    });
  } catch (e) {
    console.error("[ARIA EMAIL ERROR]", e);
  }
}

// ── Build the compliance dossier prompt ────────────────────────────────────

function buildPrompt(sub: Record<string, unknown>): string {
  const lines: string[] = [];

  const add = (...items: string[]) => {
    for (const i of items) if (i) lines.push(i);
  };

  add(
    "=== IDENTITY ===",
    field("Full legal name",     sub.legal_full_name   || `${sub.legal_first_name} ${sub.legal_middle_name ?? ""} ${sub.legal_last_name}`.trim()),
    field("Date of birth",       sub.date_of_birth),
    field("Gender",              sub.gender),
    field("Nationality",         sub.nationality),
    field("Country of birth",    sub.country_of_birth),
    field("Second nationality",  sub.second_nationality),
    field("Marital status",      sub.marital_status),
    field("Dependants",          sub.number_of_dependents),
    field("Primary language",    sub.primary_language),
    field("Religion",            sub.religion),
    field("Ethnicity",           sub.ethnicity),

    "=== ID DOCUMENT ===",
    field("ID type",             sub.id_type),
    field("ID number",           sub.id_number),
    field("Expiry",              sub.id_expiry),
    field("Issuing country",     sub.id_issuing_country),
    field("Issuing authority",   sub.id_issuing_authority),
    field("AI verified",         sub.ai_id_verified),
    field("AI confidence",       sub.ai_confidence_score != null ? `${sub.ai_confidence_score}/100` : null),
    field("Face match score",    sub.ai_face_match_score != null ? `${sub.ai_face_match_score}/100` : null),
    field("AI doc flags",        Array.isArray(sub.ai_flags) && sub.ai_flags.length ? (sub.ai_flags as string[]).join(", ") : null),
    field("Prior AI recommendation", sub.ai_recommendation),

    "=== CONTACT ===",
    field("Email (primary)",     sub.email_primary),
    field("Email (secondary)",   sub.email_secondary),
    field("Phone (primary)",     sub.phone_primary),
    field("WhatsApp",            sub.whatsapp_number),
    field("Address line 1",      sub.residential_address_line1),
    field("City",                sub.residential_city),
    field("State",               sub.residential_state),
    field("Postal code",         sub.residential_postal_code),
    field("Country",             sub.residential_country),
    field("Years at address",    sub.years_at_address),
    field("Home ownership",      sub.home_ownership),
    field("Previous address 1",  sub.previous_address_1),
    field("Previous address 2",  sub.previous_address_2),
    field("Emergency contact",   sub.emergency_contact_name),
    field("Emergency phone",     sub.emergency_contact_phone),

    "=== EMPLOYMENT & INCOME ===",
    field("Employment status",   sub.employment_status),
    field("Employer",            sub.employer_name),
    field("Employer address",    sub.employer_address),
    field("Job title",           sub.job_title),
    field("Industry",            sub.industry),
    field("Years employed",      sub.years_employed),
    field("Monthly income (USD)", sub.monthly_income_usd),
    field("Annual income (USD)", sub.annual_income_usd),
    field("Other income sources", sub.other_income_sources),
    field("Other income amount", sub.other_income_amount_usd),

    "=== ASSETS & NET WORTH ===",
    field("Total net worth (USD)",  sub.total_net_worth_usd),
    field("Liquid assets (USD)",    sub.liquid_assets_usd),
    field("Real estate value (USD)", sub.real_estate_value_usd),
    field("Crypto holdings",         sub.crypto_holdings),
    field("Investment accounts",     sub.has_investment_accounts),
    field("Investment types",        sub.investment_types),
    field("Primary bank",            sub.primary_bank_name),
    field("Monthly expenses (USD)",  sub.monthly_expenses_usd),
    field("Monthly savings (USD)",   sub.monthly_savings_usd),
    field("Existing loans",          sub.existing_loans),
    field("Total debt (USD)",        sub.total_debt_usd),
    field("Credit score",            sub.credit_score),
    field("Credit bureau",           sub.credit_bureau),
    field("Tax ID",                  sub.tax_id),

    "=== SOURCE OF FUNDS ===",
    field("Source of funds",                 sub.source_of_funds),
    field("Source details",                  sub.source_of_funds_details),
    field("Expected monthly deposits (USD)", sub.expected_monthly_deposits_usd),
    field("Expected monthly withdrawals (USD)", sub.expected_monthly_withdrawals_usd),
    field("Transaction purpose",             sub.expected_transaction_purpose),
    field("Purpose of account",              sub.purpose_of_account),

    "=== AML / COMPLIANCE DECLARATIONS ===",
    field("Politically exposed person (PEP)", sub.politically_exposed_person),
    field("PEP role",                         sub.pep_role),
    field("PEP country",                      sub.pep_country),
    field("Criminal record",                  sub.criminal_record),
    field("Criminal record details",          sub.criminal_record_details),
    field("FATCA applicable",                 sub.fatca_applicable),
    field("FATCA W-8BEN completed",           sub.fatca_w8ben_completed),
    field("FATCA W-9 completed",              sub.fatca_w9_completed),
    field("CRS applicable",                   sub.crs_applicable),
    field("Tax residency countries",          Array.isArray(sub.tax_residency_countries) ? (sub.tax_residency_countries as string[]).join(", ") : null),
    field("TIN per country",                  sub.tin_per_country),
    field("Dual nationality",                 sub.dual_nationality),
    field("Interpol check clear",             sub.interpol_check_clear),
    field("FATF blacklist clear",             sub.fatf_blacklist_clear),

    "=== INVESTOR PROFILE ===",
    field("Investment experience",  sub.investment_experience),
    field("Risk appetite",          sub.risk_appetite),
    field("Investment horizon",     sub.investment_horizon),
    field("Regulatory category",    sub.regulatory_category),
    field("Investor classification", sub.investor_classification),

    "=== CORPORATE KYC ===",
    field("Is corporate entity",             sub.is_corporate),
    field("Company legal name",              sub.company_legal_name),
    field("Company registration number",     sub.company_registration_number),
    field("Company registration country",    sub.company_registration_country),
    field("Company type",                    sub.company_type),
    field("Company industry",                sub.company_industry),
    field("UBO full name",                   sub.ubo_full_name),
    field("UBO nationality",                 sub.ubo_nationality),
    field("UBO ownership %",                 sub.ubo_ownership_percentage),
    field("UBO declaration",                 sub.ubo_declaration),

    "=== DOCUMENTS UPLOADED ===",
    field("ID front",                        sub.id_front_url        ? "YES" : "MISSING"),
    field("ID back",                         sub.id_back_url         ? "YES" : "MISSING"),
    field("Selfie",                          sub.selfie_url          ? "YES" : "MISSING"),
    field("Selfie with ID",                  sub.selfie_with_id_url  ? "YES" : "MISSING"),
    field("Proof of address",                sub.proof_of_address_url    ? "YES" : "MISSING"),
    field("Proof of income",                 sub.proof_of_income_url     ? "YES" : "MISSING"),
    field("Bank statement",                  sub.bank_statement_url      ? "YES" : "MISSING"),
    field("Tax return",                      sub.tax_return_url          ? "YES" : "MISSING"),
    field("Business license",                sub.business_license_url    ? "YES" : "MISSING"),
    field("Employment letter",               sub.employment_letter_url   ? "YES" : "MISSING"),
    field("Certificate of incorporation",    sub.certificate_of_incorporation_url ? "YES" : "MISSING"),
    field("Board resolution",                sub.board_resolution_url    ? "YES" : "MISSING"),
    field("UBO ID document",                 sub.ubo_id_document_url     ? "YES" : "MISSING"),
  );

  return lines.filter(Boolean).join("\n");
}

// ── AI decision schema ─────────────────────────────────────────────────────

interface ReviewDecision {
  decision: "approved" | "needs_more_info" | "rejected";
  confidence: number;          // 0–100
  risk_rating: "low" | "medium" | "high" | "critical";
  reviewer_notes: string;      // plain-English reasoning (shown to admin)
  user_message: string;        // shown directly to the user in the notification
  flags: string[];             // short machine-readable flags
  missing_fields: string[];    // fields that must be supplied if needs_more_info
  missing_documents: string[]; // docs that must be uploaded if needs_more_info
}

// ── Main handler ───────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  // Accept calls from: user (post-wizard), admin (manual trigger), pg_net trigger (service role)
  const adminSb = createClient(SUPABASE_URL, SERVICE_KEY);

  let body: { user_id?: string };
  try { body = await req.json(); } catch { body = {}; }

  if (!body.user_id) return json({ error: "user_id required" }, 400);
  const userId = body.user_id;

  // ── Fetch full submission ───────────────────────────────────────────────
  const { data: sub, error: fetchErr } = await adminSb
    .from("kyc_submissions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchErr || !sub) return json({ error: "KYC submission not found" }, 404);

  // Mark as being reviewed so the admin queue shows correct state
  await adminSb.from("kyc_submissions")
    .update({ status: "ai_reviewing", updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  // ── Build prompt ───────────────────────────────────────────────────────
  const dossier = buildPrompt(sub as Record<string, unknown>);

  const systemPrompt = `You are ARIA — IFB's Autonomous Regulatory Intelligence Agent. You are a senior compliance officer specialising in international AML/KYC for emerging and frontier markets — Africa, Middle East, South/Southeast Asia, Latin America, and the Pacific. You review KYC submissions for Infinite Future Bank, a global digital bank serving individuals and businesses outside Western financial systems.

Your decisions are FINAL and immediately applied to the user's account. Apply proportionate, risk-based compliance — not Western-centric box-ticking.

INTERNATIONAL CONTEXT — READ CAREFULLY:
- Most users are from Africa, South/Southeast Asia, or the Middle East. Apply standards appropriate to their financial and regulatory environment.
- Tax returns are NOT required for individuals in countries with informal or low-documentation tax systems (most of sub-Saharan Africa, parts of MENA, South Asia). Do not flag their absence as a red flag.
- Bank statements may be unavailable for users who primarily use mobile money (M-Pesa, MTN Mobile Money, Airtel Money, OPay, etc.). Mobile money account statements or screenshots are acceptable alternatives.
- Credit scores / credit bureau reports do not exist in most of our target markets. Never require them.
- FATCA applies ONLY to US persons (US citizens, green card holders, or US tax residents). For non-US users, FATCA fields being empty or false is CORRECT — do not flag this.
- CRS applies broadly but self-certification by the user is sufficient for standard-risk accounts. Missing formal CRS paperwork alone is not a rejection reason.
- Document scan quality may be lower for older national IDs, passports from certain countries, or photos taken on low-resolution phones. Do NOT fail a submission purely on AI scan confidence < 70 if the identity fields are internally consistent and there are no fraud signals.
- Employment letters and formal payslips are rare in informal economies. Accept self-employment declarations, business ownership descriptions, or verbal income descriptions supported by reasonable asset/income figures.
- Proof of address: utility bills, tenancy agreements, mobile money statements showing a residential address, or a signed declaration are all acceptable for users in countries without formal postal addresses.

DECISION FRAMEWORK:
- "approved": Core identity confirmed (name, DOB, nationality consistent), minimum ID document present (ID front or passport), selfie or selfie-with-ID present, no active fraud signals, income/deposit figures are plausible given the user's country and context, AML/PEP clear or manageable.
- "needs_more_info": Submission is genuine but has addressable gaps — a key document is missing that the user can realistically provide, or a specific field needs clarification. Only request documents that actually exist in the user's country.
- "rejected": Active fraud indicators (tampered documents, face mismatch confirmed, contradictory identity claims), FATF-blacklisted country with no mitigating context, criminal record involving financial crimes with no explanation, or severe implausible inconsistencies suggesting deliberate deception.

MINIMUM REQUIREMENTS FOR APPROVAL (flexible, risk-based):
1. At least one government-issued ID (front) — passport, national ID, driver's license, voter ID.
2. At least one photo of the person (selfie OR selfie-with-ID). Both preferred but not mandatory.
3. Name and date of birth present and internally consistent.
4. A plausible source of funds for the stated transaction volume — does not need to be formally documented for low-value accounts.
5. No active PEP flags without context, no confirmed fraud signals.

ONLY request the following if genuinely missing AND the user is in a country where it is realistic to obtain:
- Proof of address: only if the user's country has formal addressing systems AND the account risk warrants it.
- Bank statement: only if the user does not use mobile money and the income claim needs corroboration.
- Proof of income: only for high-value accounts (expected monthly deposits > USD 5,000) or when the income claim is implausible for the user's stated country/profession.
- Corporate docs: only if is_corporate = true.

RISK RATING:
- low: Clean individual, consistent identity, plausible income for their country, no flags
- medium: Minor documentation gaps, self-employed in informal economy, higher transaction volume
- high: PEP, complex corporate structure, high-value transactions, sanctions-adjacent country
- critical: Active fraud signals, confirmed document tampering, face mismatch, FATF-blacklisted country, financial crimes criminal record

RESPONSE FORMAT: Return ONLY a valid JSON object, no markdown, no explanation outside the JSON:
{
  "decision": "approved" | "needs_more_info" | "rejected",
  "confidence": <0-100>,
  "risk_rating": "low" | "medium" | "high" | "critical",
  "reviewer_notes": "<detailed internal notes for compliance team — mention country context, max 400 chars>",
  "user_message": "<warm, clear message shown directly to the user, max 200 chars>",
  "flags": ["<short_flag_code>"],
  "missing_fields": ["<field_name>"],
  "missing_documents": ["<only documents realistic for this user's country>"]
}`;

  const userPrompt = `Review this KYC submission and return your compliance decision:\n\n${dossier}`;

  // ── Call Groq (llama-3.3-70b-versatile) ───────────────────────────────
  let decision: ReviewDecision | null = null;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        temperature: 0,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userPrompt },
        ],
      }),
    });
    const groqData = await res.json();
    if (!res.ok) throw new Error(`Groq ${res.status}: ${JSON.stringify(groqData?.error)}`);
    const rawText = groqData?.choices?.[0]?.message?.content ?? "";
    const match = rawText.match(/\{[\s\S]*\}/);
    if (match) decision = JSON.parse(match[0]) as ReviewDecision;
  } catch (e) {
    console.error("[ARIA ERROR]", String(e));
  }
  // ── Fetch user email + name for notifications ──────────────────────────
  const { data: profile } = await adminSb
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .maybeSingle();
  const userEmail = profile?.email ?? sub.email_primary;
  const userName  = profile?.full_name ?? sub.legal_full_name ?? "there";

  if (!decision) {
    // AI unavailable — reset status so user isn't stuck at ai_reviewing
    await adminSb.from("kyc_submissions")
      .update({ status: "p2p_review", updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    await adminSb.from("profiles")
      .update({ kyc_status: "pending_kyc" })
      .eq("id", userId);
    await adminSb.from("notifications").insert({
      user_id: userId, type: "system", read: false,
      message: "Your KYC is being reviewed by our compliance team. We'll update you within 24–48 hours.",
    });
    return json({ status: "p2p_review", reason: "AI unavailable — queued for human review" });
  }

  // ── Map decision to DB status ──────────────────────────────────────────
  // submission status values allowed by the DB CHECK constraint
  const submissionStatus: Record<string, string> = {
    approved:        "approved",
    needs_more_info: "needs_more_info",
    rejected:        "rejected",
  };
  // ai_recommendation CHECK constraint allows: 'approve','reject','manual_review'
  const aiRecMap: Record<string, string> = {
    approved:        "approve",
    needs_more_info: "manual_review",
    rejected:        "reject",
  };
  // profiles.kyc_status values
  const profileStatusMap: Record<string, string> = {
    approved:        "approved",
    needs_more_info: "needs_more_info",
    rejected:        "rejected",
  };

  const dbSubmissionStatus = submissionStatus[decision.decision] ?? "p2p_review";
  const dbAiRec            = aiRecMap[decision.decision] ?? "manual_review";
  const dbProfileStatus    = profileStatusMap[decision.decision] ?? "pending_kyc";

  // ── Write AI review metadata to submission ─────────────────────────────
  const { error: subUpdateErr } = await adminSb.from("kyc_submissions").update({
    status:              dbSubmissionStatus,
    ai_recommendation:   dbAiRec,
    ai_confidence_score: decision.confidence,
    risk_rating:         decision.risk_rating,
    ai_flags:            decision.flags ?? [],
    ai_reviewed_at:      new Date().toISOString(),
    ai_model_version:    "openai/gpt-oss-120b",
    reviewer_notes:      decision.reviewer_notes,
    reviewed_at:         new Date().toISOString(),
    updated_at:          new Date().toISOString(),
  }).eq("user_id", userId);
  // ── Sync kyc_status to profiles ────────────────────────────────────────
  const { error: profUpdateErr } = await adminSb.from("profiles")
    .update({ kyc_status: dbProfileStatus })
    .eq("id", userId);

  // ── Insert ARIA decision notification ──────────────────────────────────
  const { error: notifErr } = await adminSb.from("notifications").insert({
    user_id: userId,
    type:    "system",
    read:    false,
    message: `ARIA Review: ${decision.user_message}`,
  });

  if (subUpdateErr)  console.error("[ARIA SUB ERROR]",   subUpdateErr);
  if (profUpdateErr) console.error("[ARIA PROF ERROR]",  profUpdateErr);
  if (notifErr)      console.error("[ARIA NOTIF ERROR]", notifErr);

  // ── Send email ─────────────────────────────────────────────────────────
  if (userEmail) {
    await sendKycEmail(
      userEmail,
      userName,
      decision.decision as "approved" | "needs_more_info" | "rejected",
      decision.reviewer_notes,
      [
        ...(decision.missing_fields ?? []),
        ...(decision.missing_documents ?? []),
      ],
    );
  }

  return json({
    decision:       decision.decision,
    confidence:     decision.confidence,
    risk_rating:    decision.risk_rating,
    flags:          decision.flags,
    missing_fields: decision.missing_fields,
    missing_docs:   decision.missing_documents,
    reviewer_notes: decision.reviewer_notes,
  });
});
