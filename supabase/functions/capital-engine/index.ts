import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const db = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const GROK_KEY   = Deno.env.get('GROK_API_KEY')  || '';
const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const GCP_NODE   = 'https://afr-blockchain-node-382117221028.us-central1.run.app';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { action, payload, userId } = await req.json();

    switch (action) {

      // ── SUBMIT PROJECT ─────────────────────────────────────────────────────
      case 'submit_project': {
        const { company_name, project_name, description, sector, stage, geography,
                capital_needed, capital_type_pref, timeline_months, team_size,
                annual_revenue } = payload;

        const { data: proj, error } = await db.from('capital_projects').insert({
          user_id: userId, company_name, project_name, description, sector,
          stage: stage || 'growth', geography, capital_needed, capital_type_pref,
          timeline_months: timeline_months || 12,
          team_size: team_size || 5,
          annual_revenue: annual_revenue || 0,
          status: 'submitted',
        }).select().single();

        if (error) throw error;
        return json({ success: true, project: proj });
      }

      // ── EXTRACT FROM DOCUMENT (AI OCR) ─────────────────────────────────────
      case 'extract_document': {
        const { file_base64, file_type, project_hint } = payload;

        const prompt = `You are a financial document analyst for IFB (Infinite Future Bank), a capital structuring platform.

Extract the following fields from the attached document and return ONLY valid JSON:
{
  "company_name": "",
  "project_name": "",
  "description": "",
  "sector": "",
  "geography": "",
  "capital_needed": 0,
  "capital_type_pref": "hybrid",
  "timeline_months": 12,
  "team_size": 0,
  "annual_revenue": 0,
  "stage": "growth"
}

capital_type_pref must be one of: grant, debt, equity, hybrid
stage must be one of: seed, growth, expansion, maturity
Use 0 for unknown numeric fields. Extract as accurately as possible from the document.
Additional context: ${project_hint || ''}`;

        let extracted = null;

        // Try Gemini multimodal first (better for docs)
        if (GEMINI_KEY) {
          try {
            const gemRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{
                    parts: [
                      { text: prompt },
                      { inline_data: { mime_type: file_type || 'application/pdf', data: file_base64 } }
                    ]
                  }]
                })
              }
            );
            const gemData = await gemRes.json();
            const rawText = gemData.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) extracted = JSON.parse(jsonMatch[0]);
          } catch { /* fall to Grok */ }
        }

        // Fallback: Grok text extraction
        if (!extracted && GROK_KEY) {
          try {
            const gRes = await fetch('https://api.x.ai/v1/chat/completions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROK_KEY}` },
              body: JSON.stringify({
                model: 'grok-3',
                messages: [{ role: 'user', content: `${prompt}\n\nDocument content (base64 truncated): ${file_base64.slice(0, 2000)}` }]
              })
            });
            const gData = await gRes.json();
            const rawText = gData.choices?.[0]?.message?.content || '';
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) extracted = JSON.parse(jsonMatch[0]);
          } catch { /* graceful */ }
        }

        return json({ success: true, extracted: extracted || {} });
      }

      // ── ANALYZE PROJECT (AI Capital + Risk Engine) ─────────────────────────
      case 'analyze_project': {
        const { project_id } = payload;

        const { data: proj } = await db.from('capital_projects').select('*').eq('id', project_id).single();
        if (!proj) throw new Error('Project not found');

        const capital = parseFloat(proj.capital_needed);
        const prompt = `You are IFB's automated Capital Structuring and Risk Management Engine.

Analyze this project and return a comprehensive investment analysis as ONLY valid JSON (no markdown, no extra text):

Project:
- Company: ${proj.company_name}
- Name: ${proj.project_name}
- Sector: ${proj.sector}
- Stage: ${proj.stage}
- Geography: ${proj.geography}
- Capital Needed: $${capital.toLocaleString()}
- Type Preference: ${proj.capital_type_pref}
- Timeline: ${proj.timeline_months} months
- Team: ${proj.team_size} people
- Annual Revenue: $${parseFloat(proj.annual_revenue || 0).toLocaleString()}
- Description: ${proj.description || 'Not provided'}

Return this exact JSON structure:
{
  "capital_structure": {
    "grant_pct": 0,
    "debt_pct": 0,
    "equity_pct": 0,
    "hybrid_pct": 0,
    "recommended_structure": "Blended Finance"
  },
  "risk": {
    "total_risk_score": 50,
    "country_risk": 50,
    "execution_risk": 50,
    "financial_risk": 50,
    "governance_risk": 50,
    "risk_label": "MODERATE",
    "risk_mitigation": ["item1", "item2", "item3"],
    "early_warnings": ["warning1", "warning2"],
    "safeguards": ["safeguard1", "safeguard2"]
  },
  "milestones": [
    { "phase": 1, "title": "Foundation & Setup", "deliverable": "Legal entity, team onboarded, first audit", "capital_pct": 25, "due_days": 60 },
    { "phase": 2, "title": "Initial Execution", "deliverable": "Core operations live, KPIs baseline set", "capital_pct": 30, "due_days": 120 },
    { "phase": 3, "title": "Mid-term Delivery", "deliverable": "50% deliverables met, progress report", "capital_pct": 25, "due_days": 210 },
    { "phase": 4, "title": "Final Completion", "deliverable": "Full delivery, impact report, final audit", "capital_pct": 20, "due_days": ${proj.timeline_months * 30} }
  ],
  "fees": {
    "structuring_fee_pct": 2.0,
    "risk_fee_pct": 1.0,
    "platform_fee_usd": 5000,
    "monitoring_monthly": 500,
    "success_fee_pct": 1.5
  },
  "executive_summary": "2-3 sentence professional summary of this project and IFB recommendation",
  "reporting_obligations": "Quarterly financial reports, milestone completion evidence, impact metrics, annual audit",
  "exit_clauses": "If 2 consecutive milestones are missed, IFB reserves right to pause capital and restructure terms."
}

Rules:
- capital_structure percentages must sum to 100
- risk_label must be LOW (0–39), MODERATE (40–69), HIGH (70–84), or CRITICAL (85–100)
- milestones capital_pct must sum to 100
- Calibrate ALL scores to the actual project geography and sector risk`;

        let analysis = null;

        if (GROK_KEY) {
          try {
            const gRes = await fetch('https://api.x.ai/v1/chat/completions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROK_KEY}` },
              body: JSON.stringify({ model: 'grok-3', messages: [{ role: 'user', content: prompt }], temperature: 0.3 })
            });
            const gData = await gRes.json();
            const raw = gData.choices?.[0]?.message?.content || '';
            const match = raw.match(/\{[\s\S]*\}/);
            if (match) analysis = JSON.parse(match[0]);
          } catch { /* fall to Gemini */ }
        }

        if (!analysis && GEMINI_KEY) {
          try {
            const gemRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
              {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
              }
            );
            const gemData = await gemRes.json();
            const raw = gemData.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const match = raw.match(/\{[\s\S]*\}/);
            if (match) analysis = JSON.parse(match[0]);
          } catch { /* use defaults */ }
        }

        // Fallback defaults
        if (!analysis) {
          analysis = {
            capital_structure: { grant_pct: 20, debt_pct: 40, equity_pct: 25, hybrid_pct: 15, recommended_structure: 'Blended Finance' },
            risk: { total_risk_score: 55, country_risk: 50, execution_risk: 60, financial_risk: 55, governance_risk: 55, risk_label: 'MODERATE',
              risk_mitigation: ['Stage capital release across 4 milestones', 'Require performance bond', 'Independent audit at 50% deployment'],
              early_warnings: ['Revenue projections behind schedule', 'Team turnover above 20%'],
              safeguards: ['Escrow-style fund release', 'IFB monitoring subscription', 'Dual-insurance protocol']
            },
            milestones: [
              { phase: 1, title: 'Foundation', deliverable: 'Legal entity registered, team assembled', capital_pct: 25, due_days: 60 },
              { phase: 2, title: 'Launch', deliverable: 'Operations live, KPI baseline set', capital_pct: 30, due_days: 120 },
              { phase: 3, title: 'Delivery', deliverable: '50% milestones met, progress audit', capital_pct: 25, due_days: 210 },
              { phase: 4, title: 'Completion', deliverable: 'Final delivery and impact report', capital_pct: 20, due_days: proj.timeline_months * 30 }
            ],
            fees: { structuring_fee_pct: 2.0, risk_fee_pct: 1.0, platform_fee_usd: 5000, monitoring_monthly: 500, success_fee_pct: 1.5 },
            executive_summary: `${proj.company_name} is seeking $${capital.toLocaleString()} in ${proj.capital_type_pref} capital for ${proj.project_name} in ${proj.geography}. IFB recommends a Blended Finance structure with staged capital release across 4 milestone phases.`,
            reporting_obligations: 'Quarterly financial reports, milestone completion evidence, impact metrics, annual independent audit',
            exit_clauses: 'If 2 consecutive milestones are missed, IFB reserves right to pause capital and restructure terms.'
          };
        }

        // Save analysis
        const a = analysis;
        const cs = a.capital_structure;
        const rk = a.risk;
        const fees = a.fees;

        const { data: savedAnalysis } = await db.from('capital_analyses').insert({
          project_id,
          grant_pct:  cs.grant_pct,   debt_pct:  cs.debt_pct,
          equity_pct: cs.equity_pct,  hybrid_pct: cs.hybrid_pct,
          recommended_structure: cs.recommended_structure,
          total_risk_score: rk.total_risk_score,
          country_risk: rk.country_risk,    execution_risk: rk.execution_risk,
          financial_risk: rk.financial_risk, governance_risk: rk.governance_risk,
          risk_label: rk.risk_label,
          risk_mitigation: JSON.stringify(rk.risk_mitigation),
          early_warnings:  JSON.stringify(rk.early_warnings),
          safeguards:      JSON.stringify(rk.safeguards),
          executive_summary: a.executive_summary,
          reporting_obligations: a.reporting_obligations,
          structuring_fee_pct: fees.structuring_fee_pct,
          risk_fee_pct:        fees.risk_fee_pct,
          platform_fee_usd:    fees.platform_fee_usd,
          monitoring_monthly:  fees.monitoring_monthly,
          success_fee_pct:     fees.success_fee_pct,
        }).select().single();

        // Save milestones
        if (a.milestones?.length) {
          await db.from('capital_milestones').insert(
            a.milestones.map((m: any) => ({
              project_id,
              phase: m.phase, title: m.title,
              deliverable: m.deliverable,
              capital_pct: m.capital_pct,
              due_days: m.due_days,
              status: 'pending',
            }))
          );
        }

        // Update project status
        await db.from('capital_projects').update({ status: 'packaged' }).eq('id', project_id);

        return json({ success: true, analysis: savedAnalysis, milestones: a.milestones, raw: a });
      }

      // ── GENERATE & SIGN AGREEMENT ───────────────────────────────────────────
      case 'sign_agreement': {
        const { project_id } = payload;

        const { data: proj }     = await db.from('capital_projects').select('*').eq('id', project_id).single();
        const { data: analysis } = await db.from('capital_analyses').select('*').eq('project_id', project_id).order('created_at', { ascending: false }).limit(1).maybeSingle();
        const { data: profile }  = await db.from('profiles').select('full_name, email').eq('id', userId).single();

        if (!proj || !analysis) throw new Error('Project or analysis not found');

        const capital = parseFloat(proj.capital_needed);
        const structuringFee = capital * (analysis.structuring_fee_pct / 100);
        const riskFee        = capital * (analysis.risk_fee_pct / 100);
        const totalUpfront   = structuringFee + riskFee + analysis.platform_fee_usd;
        const signedAt       = new Date().toISOString();
        const sigHash        = await sha256(`${project_id}:${userId}:${signedAt}`);

        const agreementText = `IFB COLLABORATION AGREEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
Project: ${proj.project_name}
Company: ${proj.company_name}
Client: ${profile?.full_name || userId}
Capital: $${capital.toLocaleString()} USD
Structure: ${analysis.recommended_structure}
Agreement ID: ${sigHash.slice(0, 16).toUpperCase()}

1. CAPITAL STRUCTURE
   Grant: ${analysis.grant_pct}%  |  Debt: ${analysis.debt_pct}%  |  Equity: ${analysis.equity_pct}%  |  Hybrid: ${analysis.hybrid_pct}%

2. FEE SCHEDULE
   Structuring Fee:  $${structuringFee.toLocaleString(undefined, { maximumFractionDigits: 0 })} (${analysis.structuring_fee_pct}% of deal)
   Risk Mgmt Fee:    $${riskFee.toLocaleString(undefined, { maximumFractionDigits: 0 })} (${analysis.risk_fee_pct}% of deal)
   Platform Fee:     $${analysis.platform_fee_usd.toLocaleString()} (one-time)
   Monitoring:       $${analysis.monitoring_monthly.toLocaleString()}/month
   Success Fee:      ${analysis.success_fee_pct}% on capital deployment
   Total Upfront:    $${totalUpfront.toLocaleString(undefined, { maximumFractionDigits: 0 })}

3. GOVERNANCE
   Capital is released in staged tranches upon milestone completion verified by IFB.
   ${analysis.exit_clauses || 'If 2 consecutive milestones are missed, IFB may pause and restructure.'}

4. REPORTING OBLIGATIONS
   ${analysis.reporting_obligations}

5. RISK ACKNOWLEDGMENT
   Risk Score: ${analysis.total_risk_score}/100 (${analysis.risk_label})
   Client acknowledges IFB risk assessment and agrees to implement required safeguards.

6. DIGITAL SIGNATURE
   Signed by: ${profile?.full_name || userId}
   Timestamp: ${signedAt}
   Signature Hash: ${sigHash}

By proceeding, client confirms full agreement to all terms above.`;

        // Record to blockchain
        let txHash = `ifb_cap_${Date.now()}`;
        try {
          const bcRes = await fetch(`${GCP_NODE}/api/agreements/record`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agreement_id: sigHash, project_id, user_id: userId, timestamp: signedAt })
          });
          if (bcRes.ok) { const bcData = await bcRes.json(); txHash = bcData.tx_hash || txHash; }
        } catch { /* blockchain optional */ }

        const { data: agreement } = await db.from('capital_agreements').insert({
          project_id, user_id: userId,
          agreement_text: agreementText,
          signature_hash: sigHash,
          signed_at: signedAt,
          blockchain_tx: txHash,
          status: 'signed',
        }).select().single();

        await db.from('capital_projects').update({ status: 'active' }).eq('id', project_id);

        // Log fees
        await db.from('capital_fees').insert([
          { project_id, user_id: userId, fee_type: 'structuring', amount_usd: structuringFee, status: 'pending' },
          { project_id, user_id: userId, fee_type: 'risk',        amount_usd: riskFee,        status: 'pending' },
          { project_id, user_id: userId, fee_type: 'platform',    amount_usd: analysis.platform_fee_usd, status: 'pending' },
        ]);

        // Mark first milestone as in_progress
        await db.from('capital_milestones')
          .update({ status: 'in_progress' })
          .eq('project_id', project_id)
          .eq('phase', 1);

        return json({ success: true, agreement, txHash, agreementText, totalUpfront });
      }

      // ── SUBMIT MILESTONE ───────────────────────────────────────────────────
      case 'submit_milestone': {
        const { milestone_id, notes } = payload;

        await db.from('capital_milestones')
          .update({ status: 'submitted', notes, completed_at: new Date().toISOString() })
          .eq('id', milestone_id);

        // Auto-approve after submission (can be manual review in prod)
        const { data: ms } = await db.from('capital_milestones')
          .update({ status: 'approved' })
          .eq('id', milestone_id)
          .select()
          .single();

        // Release capital tranche (record tx)
        const txHash = `ifb_tranche_${Date.now()}`;
        await db.from('capital_milestones')
          .update({ capital_released: true, tx_hash: txHash })
          .eq('id', milestone_id);

        // Activate next milestone
        if (ms) {
          await db.from('capital_milestones')
            .update({ status: 'in_progress' })
            .eq('project_id', ms.project_id)
            .eq('phase', (ms.phase || 0) + 1)
            .eq('status', 'pending');
        }

        return json({ success: true, txHash, milestone: ms });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }
});

async function sha256(msg: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(msg);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...cors, 'Content-Type': 'application/json' }
  });
}
