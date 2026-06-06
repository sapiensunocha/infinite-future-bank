import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const RESEND_KEY = Deno.env.get('VITE_RESEND_API_KEY') || Deno.env.get('RESEND_API_KEY');
    if (!RESEND_KEY) throw new Error('RESEND_API_KEY not set');

    const {
      to_email,
      first_name,
      npo_name,
      country,
      sector,
      tier,
      readiness_score,
      funding_ask,
      bp_summary,
      next_steps,
      app_url = 'https://deus.infinitefuturebank.org',
    } = await req.json();

    const tierLabel: Record<string, string> = {
      'Emerging_Academy': 'Emerging Academy',
      'Cluster_Partner': 'Cluster Partner ✦',
      'Enterprise_NGO': 'Enterprise NGO',
      'Strategic_Global': 'Strategic Global',
    };

    const tierColor: Record<string, string> = {
      'Emerging_Academy': '#f59e0b',
      'Cluster_Partner': '#6366f1',
      'Enterprise_NGO': '#0ea5e9',
      'Strategic_Global': '#10b981',
    };

    const tc = tierColor[tier] || '#6366f1';
    const tl = tierLabel[tier] || tier;
    const score = readiness_score || 72;
    const scoreColor = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';

    const stepsHtml = (next_steps || [])
      .map((s: string, i: number) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #1e293b;">
            <div style="display:flex;align-items:flex-start;gap:12px;">
              <div style="min-width:24px;height:24px;border-radius:50%;background:${tc}20;border:1px solid ${tc}50;display:flex;align-items:center;justify-content:center;">
                <span style="color:${tc};font-weight:900;font-size:11px;">${i + 1}</span>
              </div>
              <span style="color:#cbd5e1;font-size:13px;line-height:1.6;">${s}</span>
            </div>
          </td>
        </tr>`)
      .join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>IFB — NPO Verified</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:620px;margin:0 auto;padding:32px 16px;">

  <!-- ── HEADER ── -->
  <div style="text-align:center;margin-bottom:32px;">
    <div style="display:inline-block;background:linear-gradient(135deg,#1e1b4b,#1e293b);border:1px solid ${tc}40;border-radius:20px;padding:20px 32px;margin-bottom:16px;">
      <p style="color:${tc};font-weight:900;font-size:10px;letter-spacing:4px;text-transform:uppercase;margin:0 0 6px;">Infinite Future Bank</p>
      <h1 style="color:#ffffff;font-size:22px;font-weight:900;margin:0;letter-spacing:-0.5px;">NPO Verification Confirmed</h1>
    </div>
  </div>

  <!-- ── HERO BADGE ── -->
  <div style="background:linear-gradient(135deg,#1e1b4b 0%,#0f172a 100%);border:2px solid ${tc}60;border-radius:24px;padding:32px;text-align:center;margin-bottom:24px;position:relative;overflow:hidden;">
    <div style="width:64px;height:64px;border-radius:50%;background:${tc}20;border:2px solid ${tc};margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
      <span style="font-size:28px;">✦</span>
    </div>
    <div style="display:inline-block;background:${tc}20;border:1px solid ${tc}50;border-radius:50px;padding:6px 18px;margin-bottom:14px;">
      <span style="color:${tc};font-weight:900;font-size:11px;letter-spacing:2px;text-transform:uppercase;">${tl}</span>
    </div>
    <h2 style="color:#ffffff;font-size:20px;font-weight:900;margin:0 0 6px;">${npo_name}</h2>
    <p style="color:#94a3b8;font-size:13px;margin:0;">${sector} · ${country}</p>
  </div>

  <!-- ── GREETING ── -->
  <div style="background:#1e293b;border-radius:16px;padding:24px;margin-bottom:20px;">
    <p style="color:#e2e8f0;font-size:15px;line-height:1.8;margin:0;">
      Dear <strong style="color:#ffffff;">${first_name}</strong>,<br><br>
      We are pleased to inform you that <strong style="color:${tc};">${npo_name}</strong> has been
      <strong style="color:#ffffff;">officially reviewed and verified</strong> by the IFB team as a
      <strong style="color:${tc};">${tl}</strong> on the Infinite Future Bank network.<br><br>
      Your business plan has been analyzed. Your organization is now visible to IFB advisors,
      capital partners, and the global IFB community. This is the beginning of your structured
      funding and development journey with IFB.
    </p>
  </div>

  <!-- ── READINESS SCORE ── -->
  <div style="background:#1e293b;border-radius:16px;padding:24px;margin-bottom:20px;">
    <p style="color:#94a3b8;font-weight:900;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px;">IFB Capital Readiness Score</p>
    <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
      <div style="width:64px;height:64px;border-radius:50%;background:${scoreColor}20;border:3px solid ${scoreColor};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <span style="color:${scoreColor};font-weight:900;font-size:20px;">${score}</span>
      </div>
      <div style="flex:1;min-width:200px;">
        <div style="background:#0f172a;border-radius:8px;height:8px;overflow:hidden;margin-bottom:8px;">
          <div style="background:${scoreColor};height:100%;width:${score}%;border-radius:8px;"></div>
        </div>
        <p style="color:#94a3b8;font-size:12px;margin:0;">
          ${score}/100 · ${score >= 70 ? 'Strong foundation — ready for funding outreach' : score >= 40 ? 'Good start — documentation gaps to close' : 'Early stage — structuring work required'}
        </p>
      </div>
    </div>
  </div>

  <!-- ── BP SUMMARY ── -->
  ${bp_summary ? `
  <div style="background:#1e293b;border-radius:16px;padding:24px;margin-bottom:20px;">
    <p style="color:#94a3b8;font-weight:900;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px;">Business Plan — IFB Assessment</p>
    <div style="display:grid;gap:10px;">
      ${Object.entries(bp_summary).map(([k, v]) => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #334155;">
        <span style="color:#64748b;font-size:12px;font-weight:600;">${k}</span>
        <span style="color:#e2e8f0;font-size:13px;font-weight:700;text-align:right;max-width:55%;">${v}</span>
      </div>`).join('')}
    </div>
  </div>` : ''}

  <!-- ── NEXT STEPS ── -->
  ${stepsHtml ? `
  <div style="background:#1e293b;border-radius:16px;padding:24px;margin-bottom:20px;">
    <p style="color:#94a3b8;font-weight:900;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px;">Your IFB Roadmap — Next Steps</p>
    <table style="width:100%;border-collapse:collapse;">${stepsHtml}</table>
  </div>` : ''}

  <!-- ── FUNDING TIMELINE ── -->
  <div style="background:linear-gradient(135deg,#1e1b4b,#0f172a);border:1px solid ${tc}30;border-radius:16px;padding:24px;margin-bottom:24px;">
    <p style="color:${tc};font-weight:900;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin:0 0 12px;">Indicative Funding Timeline</p>
    <div style="display:flex;gap:0;flex-wrap:wrap;">
      ${[
        { label: 'Weeks 1–3', desc: 'Legal structuring & documentation' },
        { label: 'Weeks 4–6', desc: 'Financial alignment & project docs' },
        { label: 'Weeks 6–10', desc: 'Funding outreach & first capital' },
      ].map((step, i) => `
      <div style="flex:1;min-width:140px;padding:12px;${i < 2 ? 'border-right:1px solid ' + tc + '20;' : ''}">
        <p style="color:${tc};font-weight:900;font-size:11px;margin:0 0 4px;">${step.label}</p>
        <p style="color:#94a3b8;font-size:11px;margin:0;line-height:1.4;">${step.desc}</p>
      </div>`).join('')}
    </div>
  </div>

  <!-- ── FUNDING REQUEST ── -->
  <div style="background:#052e16;border:1px solid #166534;border-radius:16px;padding:24px;text-align:center;margin-bottom:24px;">
    <p style="color:#86efac;font-weight:900;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px;">Phase I Funding Target</p>
    <p style="color:#ffffff;font-size:28px;font-weight:900;margin:0;">${funding_ask || 'USD 100,000 – 150,000'}</p>
    <p style="color:#6ee7b7;font-size:12px;margin:6px 0 0;">IFB will actively support your funding outreach once documentation is complete.</p>
  </div>

  <!-- ── CTA ── -->
  <div style="text-align:center;margin-bottom:32px;">
    <a href="${app_url}" style="display:inline-block;background:linear-gradient(135deg,${tc},${tc}cc);color:#fff;font-weight:900;font-size:14px;text-decoration:none;padding:18px 48px;border-radius:14px;letter-spacing:1px;box-shadow:0 8px 24px ${tc}40;">
      Open My IFB Dashboard →
    </a>
    <p style="color:#475569;font-size:11px;margin:14px 0 0;">Your IFB advisor will contact you within 24 hours to schedule your first working session.</p>
  </div>

  <!-- ── FOOTER ── -->
  <div style="border-top:1px solid #1e293b;padding-top:24px;text-align:center;">
    <p style="color:#6366f1;font-weight:900;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin:0 0 6px;">Infinite Future Bank</p>
    <p style="color:#475569;font-size:11px;margin:0 0 4px;">sapiens@infinitefuturebank.org · infinitefuturebank.org</p>
    <p style="color:#334155;font-size:10px;margin:0;">Connecting people, capital, and opportunity across borders.</p>
  </div>

</div>
</body>
</html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_KEY}`,
      },
      body: JSON.stringify({
        from: 'Sapiens @ IFB <sapiens@infinitefuturebank.org>',
        to: [to_email],
        subject: `✦ ${npo_name} — Verified by IFB · Welcome to the Network`,
        html,
      }),
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { ...cors, 'Content-Type': 'application/json' },
      status: res.ok ? 200 : 400,
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
