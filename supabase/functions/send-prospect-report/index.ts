import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CHECKLIST_DEFAULTS = [
  { id: "legal_docs",   label: "Legal documentation uploaded",       ws: "A" },
  { id: "id_verified",  label: "Identity verified by IFB",           ws: "A" },
  { id: "org_profile",  label: "Organization profile complete",      ws: "C" },
  { id: "geography",    label: "Geographic scope defined",           ws: "C" },
  { id: "team",         label: "Team structure declared",            ws: "A" },
  { id: "pitch_deck",   label: "Pitch deck / project doc uploaded",  ws: "D" },
  { id: "financials",   label: "Financial statements uploaded",      ws: "B" },
  { id: "fin_verified", label: "Financials verified by IFB",        ws: "B" },
  { id: "kpis",         label: "KPIs & impact metrics defined",     ws: "E" },
  { id: "traction",     label: "Traction verified by IFB",          ws: "E" },
  { id: "budget",       label: "Budget & financial projections set", ws: "F" },
  { id: "funding_hist", label: "Funding history recorded",          ws: "B" },
  { id: "online",       label: "Online presence established",       ws: "G" },
  { id: "public",       label: "Listed on IFB marketplace",         ws: "G" },
];

const WS_META = [
  { id:"A", label:"Organizational Structuring & Documentation", hMin:15, hMax:25, cMin:450,  cMax:750,  complete:false },
  { id:"B", label:"Financial Review & Transparency Setup",      hMin:10, hMax:20, cMin:300,  cMax:600,  complete:false },
  { id:"C", label:"Mission Positioning & Strategic Alignment",  hMin:8,  hMax:15, cMin:240,  cMax:450,  complete:false },
  { id:"D", label:"Project Structuring & Documentation",       hMin:20, hMax:40, cMin:600,  cMax:1200, complete:false },
  { id:"E", label:"KPI Definition & Impact Framework",         hMin:10, hMax:15, cMin:300,  cMax:450,  complete:false },
  { id:"F", label:"Budgeting & Financial Planning",            hMin:15, hMax:25, cMin:450,  cMax:750,  complete:false },
  { id:"G", label:"Funding Readiness & Strategy",              hMin:20, hMax:35, cMin:600,  cMax:1050, complete:false },
  { id:"H", label:"Ongoing Advisory & Weekly Reviews (3mo)",   hMin:25, hMax:35, cMin:750,  cMax:1050, complete:false },
];

const COST_MIN = WS_META.reduce((s, w) => s + w.cMin, 0); // 3690
const COST_MAX = WS_META.reduce((s, w) => s + w.cMax, 0); // 6300

function buildEmail(opts: {
  firstName: string; companyName: string; costMin: number; costMax: number;
  appUrl: string; isNewUser: boolean; loginLink?: string;
}) {
  const { firstName, companyName, costMin, costMax, appUrl, isNewUser, loginLink } = opts;
  const wsRows = WS_META.map(ws =>
    `<tr style="border-bottom:1px solid #1e293b;">
      <td style="padding:10px 0;">
        <span style="background:#374151;color:#fff;font-weight:900;font-size:11px;padding:3px 8px;border-radius:6px;margin-right:10px;">${ws.id}</span>
        <span style="color:#cbd5e1;font-size:13px;font-weight:600;">${ws.label}</span>
      </td>
      <td style="text-align:right;padding:10px 0;white-space:nowrap;">
        <span style="color:#94a3b8;font-size:12px;">${ws.hMin}–${ws.hMax}h · <strong style="color:#e2e8f0;">$${ws.cMin.toLocaleString()}–$${ws.cMax.toLocaleString()}</strong></span>
      </td>
    </tr>`
  ).join('');

  const missingRows = CHECKLIST_DEFAULTS.map(c =>
    `<tr><td style="padding:5px 0;"><span style="color:#ef4444;font-weight:900;margin-right:8px;">✗</span><span style="color:#fca5a5;font-size:13px;">${c.label}</span></td></tr>`
  ).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 16px;">

  <div style="text-align:center;margin-bottom:32px;">
    <p style="color:#6366f1;font-weight:900;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px;">Infinite Future Bank</p>
    <h1 style="color:#ffffff;font-size:24px;font-weight:900;margin:0;">Capital Readiness Report</h1>
    <p style="color:#94a3b8;font-size:14px;margin:8px 0 0;">${companyName}</p>
  </div>

  <div style="background:linear-gradient(135deg,#1e1b4b,#1e293b);border:1px solid #ef444440;border-radius:16px;padding:24px;margin-bottom:24px;text-align:center;">
    <div style="display:inline-block;background:#ef444420;border:1px solid #ef444450;border-radius:50px;padding:8px 20px;margin-bottom:12px;">
      <span style="color:#ef4444;font-weight:900;font-size:13px;text-transform:uppercase;letter-spacing:2px;">LEVEL 1/5</span>
    </div>
    <h2 style="color:#fff;font-size:20px;font-weight:900;margin:0 0 8px;">Just Started</h2>
    <div style="background:#1e293b;border-radius:8px;height:10px;overflow:hidden;margin:12px 0;">
      <div style="background:#ef4444;height:100%;width:0%;border-radius:8px;"></div>
    </div>
    <p style="color:#94a3b8;font-size:13px;margin:0;">0% complete · 14 items to prepare</p>
  </div>

  <div style="background:#1e293b;border-radius:12px;padding:20px;margin-bottom:24px;">
    <p style="color:#e2e8f0;font-size:14px;line-height:1.7;margin:0;">
      Dear <strong style="color:#fff;">${firstName}</strong>,<br><br>
      Thank you again for your commitment and for taking the first step. IFB will accompany you end-to-end, from structuring your organization to securing and managing funding.<br><br>
      Below is your personalized Capital Readiness Report. It shows exactly what needs to be prepared and what IFB can handle on your behalf.
    </p>
  </div>

  ${isNewUser ? `
  <div style="background:#052e16;border:1px solid #166534;border-radius:12px;padding:20px;margin-bottom:24px;">
    <p style="color:#86efac;font-weight:900;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px;">Your IFB Account is Ready</p>
    <p style="color:#d1fae5;font-size:13px;margin:0 0 12px;">We have created your IFB DEUS account. Click below to access your dashboard and track your progress in real time.</p>
    ${loginLink ? `<a href="${loginLink}" style="display:inline-block;background:#10b981;color:#fff;font-weight:900;font-size:13px;text-decoration:none;padding:10px 24px;border-radius:10px;">Access My IFB Account →</a>` : `<a href="${appUrl}" style="display:inline-block;background:#10b981;color:#fff;font-weight:900;font-size:13px;text-decoration:none;padding:10px 24px;border-radius:10px;">Log In to IFB →</a>`}
  </div>` : ''}

  <div style="background:#450a0a;border:1px solid #7f1d1d;border-radius:12px;padding:20px;margin-bottom:16px;">
    <p style="color:#fca5a5;font-weight:900;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">Still Required (14 items)</p>
    <table style="width:100%;border-collapse:collapse;">${missingRows}</table>
  </div>

  <div style="background:#1e293b;border-radius:12px;padding:20px;margin-bottom:16px;">
    <p style="color:#94a3b8;font-weight:900;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">IFB Support Workstreams · $30/hr</p>
    <table style="width:100%;border-collapse:collapse;">${wsRows}</table>
    <div style="margin-top:16px;padding-top:16px;border-top:1px solid #334155;">
      <p style="color:#94a3b8;font-size:12px;margin:0 0 4px;">Estimated total investment:</p>
      <p style="color:#fff;font-size:20px;font-weight:900;margin:0;">$${costMin.toLocaleString()} – $${costMax.toLocaleString()}</p>
      <p style="color:#64748b;font-size:11px;margin:4px 0 0;">You choose which parts IFB handles and which your team completes independently.</p>
    </div>
  </div>

  <div style="background:#1e1b4b;border:1px solid #4338ca40;border-radius:12px;padding:20px;margin-bottom:24px;">
    <p style="color:#818cf8;font-weight:900;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px;">Funding Timeline</p>
    <p style="color:#e2e8f0;font-size:14px;margin:0 0 4px;font-weight:600;">Weeks 1–3: Structuring & documentation</p>
    <p style="color:#94a3b8;font-size:12px;margin:0;">Initial funding can realistically begin between Weeks 6–10, depending on readiness and responsiveness.</p>
  </div>

  <div style="text-align:center;margin-bottom:24px;">
    <a href="${appUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;font-weight:900;font-size:14px;text-decoration:none;padding:16px 40px;border-radius:12px;letter-spacing:1px;">
      Pay & Start Your IFB Journey →
    </a>
    <p style="color:#64748b;font-size:11px;margin:12px 0 0;">Open your IFB app, go to Notifications, and tap "Pay & Start" to choose your starting amount.</p>
  </div>

  <div style="border-top:1px solid #1e293b;padding-top:20px;text-align:center;">
    <p style="color:#475569;font-size:12px;margin:0 0 4px;">Infinite Future Bank · IFB DEUS Platform</p>
    <p style="color:#334155;font-size:11px;margin:0;">Reply to this email to discuss next steps with your IFB advisor.</p>
  </div>
</div>
</body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });

  const callerSb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user: caller } } = await callerSb.auth.getUser();
  if (!caller) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });

  const adminSb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: callerProfile } = await adminSb.from("profiles").select("role").eq("id", caller.id).maybeSingle();
  if (!["admin", "admin_l3", "superadmin"].includes(callerProfile?.role || "")) {
    return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: cors });
  }

  const {
    full_name, email, company_name, sector = "General", country = "",
    cost_min = COST_MIN, cost_max = COST_MAX,
    app_url = "https://deux.infinitefuturebank.org",
  } = await req.json();

  if (!full_name || !email || !company_name) {
    return new Response(JSON.stringify({ error: "full_name, email, and company_name are required" }), { status: 400, headers: cors });
  }

  const result: Record<string, unknown> = { email, full_name, company_name };

  // ── 1. Find or create user ──────────────────────────────────────────────────
  let userId: string;
  let isNewUser = false;
  let loginLink: string | undefined;

  const { data: existingProfile } = await adminSb.from("profiles").select("id").eq("email", email).maybeSingle();

  if (existingProfile?.id) {
    userId = existingProfile.id;
    result.created_user = false;
  } else {
    const tempPassword = `IFB-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const { data: newUser, error: createErr } = await adminSb.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (createErr || !newUser?.user) {
      return new Response(JSON.stringify({ error: createErr?.message || "Failed to create user" }), { status: 400, headers: cors });
    }
    userId = newUser.user.id;
    isNewUser = true;
    result.created_user = true;

    await adminSb.from("profiles").upsert([{
      id: userId, full_name, email, country, kyc_status: "unverified", role: "user",
      created_at: new Date().toISOString(),
    }]);
    await adminSb.from("wallets").upsert([
      { user_id: userId, currency_code: "USD", balance: 0 },
      { user_id: userId, currency_code: "AFR", balance: 0 },
    ], { onConflict: "user_id,currency_code" }).catch(() => {});

    // Generate magic link for first login
    const { data: linkData } = await adminSb.auth.admin.generateLink({ type: "magiclink", email });
    loginLink = linkData?.properties?.action_link;
  }

  result.user_id = userId;

  // ── 2. Find or create company ───────────────────────────────────────────────
  let companyId: string;
  const { data: existingCo } = await adminSb.from("venturex_companies").select("id").eq("user_id", userId).maybeSingle();

  if (existingCo?.id) {
    companyId = existingCo.id;
    result.created_company = false;
  } else {
    const { data: newCo, error: coErr } = await adminSb.rpc("admin_create_venturex_company", {
      p_user_id: userId,
      p_legal_name: company_name,
      p_sector: sector,
      p_country: country,
      p_product_stage: "idea",
      p_funding_goal: cost_max,
      p_current_round: "pre-seed",
      p_status: "draft",
    });
    if (coErr) {
      return new Response(JSON.stringify({ error: "Company creation failed: " + coErr.message, user_id: userId }), { status: 400, headers: cors });
    }
    companyId = newCo;
    result.created_company = true;
  }

  result.company_id = companyId;

  // ── 3. Insert in-app notification ───────────────────────────────────────────
  const firstName = full_name.split(" ")[0];
  const message = `Dear ${firstName},\n\nWelcome to IFB. Your Capital Readiness Report has been prepared for ${company_name}.\n\nCurrent Level: 1/5 — Just Started (0% complete)\n\nAll 14 readiness items are pending. IFB is ready to support you end-to-end.\n\nEstimated total: $${cost_min.toLocaleString()} – $${cost_max.toLocaleString()}\n\nTap "Pay & Start" to begin your journey.\n\nWarm regards,\nIFB Team`;

  await adminSb.from("venturex_notifications").insert({
    user_id: userId, type: "progress_report",
    title: `Capital Readiness Report — Level 1/5 · 0% Complete`,
    message, is_read: false,
    metadata: {
      company_id: companyId, company_name, level: 1, pct: 0,
      missing_count: 14, cost_min, cost_max,
    },
  });

  // ── 4. Send email ────────────────────────────────────────────────────────────
  const RESEND_KEY = Deno.env.get("VITE_RESEND_API_KEY") || Deno.env.get("RESEND_API_KEY");
  let emailSent = false;
  if (RESEND_KEY) {
    const html = buildEmail({ firstName, companyName: company_name, costMin: cost_min, costMax: cost_max, appUrl: app_url, isNewUser, loginLink });
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${RESEND_KEY}` },
      body: JSON.stringify({
        from: "IFB Advisor <noreply@infinitefuturebank.org>",
        to: [email],
        subject: `${company_name} — Your IFB Capital Readiness Report`,
        html,
      }),
    });
    emailSent = res.ok;
  }

  result.email_sent = emailSent;
  result.message = `Report sent to ${full_name}${isNewUser ? " (new account created)" : " (existing account)"}${result.created_company ? " + company created" : " (existing company)"}.`;

  return new Response(JSON.stringify(result), {
    headers: { ...cors, "Content-Type": "application/json" },
    status: 200,
  });
});
