import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const RESEND_KEY = Deno.env.get('RESEND_API_KEY') || Deno.env.get('VITE_RESEND_API_KEY');
    if (!RESEND_KEY) throw new Error('RESEND_API_KEY not set');

    const {
      to_email,
      cc_email,
      first_name,
      npo_name,
      country,
      sector,
      tier,
      invoice_number,
      invoice_date,
      due_date,
      line_items,
      evaluation,
      payment_instructions,
      app_url = 'https://deus.infinitefuturebank.org',
    } = await req.json();

    const tierColor: Record<string, string> = {
      'Emerging_Academy': '#f59e0b',
      'Cluster_Partner': '#6366f1',
      'Enterprise_NGO': '#0ea5e9',
      'Strategic_Global': '#10b981',
    };
    const tc = tierColor[tier] || '#6366f1';

    const total = (line_items || []).reduce((sum: number, item: any) => sum + (item.amount || 0), 0);

    const lineItemsHtml = (line_items || []).map((item: any) => `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #1e293b;">
          <div style="color:#e2e8f0;font-size:13px;font-weight:600;">${item.description}</div>
          ${item.note ? `<div style="color:#64748b;font-size:11px;margin-top:2px;">${item.note}</div>` : ''}
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #1e293b;text-align:right;white-space:nowrap;">
          <span style="color:#ffffff;font-size:14px;font-weight:900;">USD ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </td>
      </tr>`).join('');

    const evalScore = evaluation?.readiness_score || 72;
    const evalColor = evalScore >= 70 ? '#10b981' : evalScore >= 40 ? '#f59e0b' : '#ef4444';

    const strengthsHtml = (evaluation?.strengths || []).map((s: string) => `
      <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;">
        <span style="color:#10b981;font-size:14px;margin-top:1px;">✓</span>
        <span style="color:#cbd5e1;font-size:12px;line-height:1.5;">${s}</span>
      </div>`).join('');

    const gapsHtml = (evaluation?.gaps || []).map((g: string) => `
      <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;">
        <span style="color:#f59e0b;font-size:14px;margin-top:1px;">△</span>
        <span style="color:#cbd5e1;font-size:12px;line-height:1.5;">${g}</span>
      </div>`).join('');

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>IFB — Invoice & Evaluation</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:640px;margin:0 auto;padding:32px 16px;">

  <!-- HEADER -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;flex-wrap:wrap;gap:16px;">
    <div>
      <p style="color:${tc};font-weight:900;font-size:10px;letter-spacing:4px;text-transform:uppercase;margin:0 0 4px;">Infinite Future Bank</p>
      <h1 style="color:#ffffff;font-size:24px;font-weight:900;margin:0;">Invoice & Evaluation</h1>
      <p style="color:#475569;font-size:12px;margin:4px 0 0;">sapiens@infinitefuturebank.org · infinitefuturebank.org</p>
    </div>
    <div style="text-align:right;">
      <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:12px 20px;">
        <p style="color:#64748b;font-size:10px;font-weight:600;margin:0 0 2px;">INVOICE</p>
        <p style="color:${tc};font-size:16px;font-weight:900;margin:0 0 6px;">${invoice_number}</p>
        <p style="color:#64748b;font-size:10px;margin:0;">Issued: ${invoice_date}</p>
        <p style="color:#f59e0b;font-size:10px;font-weight:700;margin:2px 0 0;">Due: ${due_date}</p>
      </div>
    </div>
  </div>

  <!-- BILLED TO -->
  <div style="background:#1e293b;border-radius:16px;padding:20px 24px;margin-bottom:24px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:16px;">
    <div>
      <p style="color:#64748b;font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px;">Billed To</p>
      <p style="color:#ffffff;font-size:15px;font-weight:900;margin:0 0 2px;">${npo_name}</p>
      <p style="color:#94a3b8;font-size:12px;margin:0 0 2px;">${first_name}</p>
      <p style="color:#94a3b8;font-size:12px;margin:0;">${sector} · ${country}</p>
    </div>
    <div style="text-align:right;">
      <p style="color:#64748b;font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px;">IFB Partner Status</p>
      <div style="display:inline-block;background:${tc}20;border:1px solid ${tc}50;border-radius:50px;padding:4px 14px;">
        <span style="color:${tc};font-size:11px;font-weight:900;">Cluster Partner ✦</span>
      </div>
      <p style="color:#64748b;font-size:11px;margin:6px 0 0;">Verified — June 2026</p>
    </div>
  </div>

  <!-- LINE ITEMS -->
  <div style="background:#1e293b;border-radius:16px;overflow:hidden;margin-bottom:8px;">
    <div style="padding:16px 20px;background:#0f1f35;border-bottom:1px solid #334155;">
      <p style="color:#94a3b8;font-weight:900;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin:0;">IFB Advisory Services</p>
    </div>
    <table style="width:100%;border-collapse:collapse;">
      ${lineItemsHtml}
    </table>
    <!-- TOTAL -->
    <div style="padding:16px 20px;background:linear-gradient(135deg,${tc}15,#0f172a);border-top:2px solid ${tc}40;display:flex;justify-content:space-between;align-items:center;">
      <span style="color:#94a3b8;font-size:13px;font-weight:600;">Total Due</span>
      <span style="color:#ffffff;font-size:22px;font-weight:900;">USD ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
    </div>
  </div>

  <!-- PAYMENT INSTRUCTIONS -->
  <div style="background:#052e16;border:1px solid #166534;border-radius:16px;padding:20px 24px;margin-bottom:24px;">
    <p style="color:#86efac;font-weight:900;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin:0 0 12px;">Payment Instructions</p>
    ${(payment_instructions || []).map((line: string) => `
    <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;">
      <span style="color:#4ade80;font-size:12px;">→</span>
      <span style="color:#bbf7d0;font-size:12px;line-height:1.5;">${line}</span>
    </div>`).join('')}
    <p style="color:#6ee7b7;font-size:11px;margin:12px 0 0;padding-top:10px;border-top:1px solid #166534;">
      Once payment is confirmed, your IFB advisor will schedule your first working session within 24 hours.
    </p>
  </div>

  <!-- EVALUATION HEADER -->
  <div style="text-align:center;margin:32px 0 20px;">
    <p style="color:${tc};font-weight:900;font-size:10px;letter-spacing:4px;text-transform:uppercase;margin:0 0 6px;">IFB Business Plan Evaluation</p>
    <h2 style="color:#ffffff;font-size:18px;font-weight:900;margin:0;">How Did FAMO Foundation Perform?</h2>
  </div>

  <!-- READINESS SCORE CARD -->
  <div style="background:#1e293b;border-radius:16px;padding:24px;margin-bottom:20px;text-align:center;">
    <div style="width:80px;height:80px;border-radius:50%;background:${evalColor}15;border:4px solid ${evalColor};margin:0 auto 12px;display:flex;align-items:center;justify-content:center;">
      <span style="color:${evalColor};font-weight:900;font-size:24px;">${evalScore}</span>
    </div>
    <p style="color:#ffffff;font-size:16px;font-weight:900;margin:0 0 4px;">${evalScore}/100 — ${evalScore >= 70 ? 'Fondation Solide' : evalScore >= 40 ? 'Bon Début' : 'Phase Initiale'}</p>
    <p style="color:#64748b;font-size:12px;margin:0 0 16px;">IFB Capital Readiness Score</p>
    <div style="background:#0f172a;border-radius:8px;height:10px;overflow:hidden;margin-bottom:4px;">
      <div style="background:linear-gradient(90deg,${evalColor},${evalColor}cc);height:100%;width:${evalScore}%;border-radius:8px;"></div>
    </div>
    <p style="color:#475569;font-size:11px;margin:4px 0 0;">Risk Score: <strong style="color:#10b981;">Low</strong> · Tier: <strong style="color:${tc};">Cluster Partner</strong></p>
  </div>

  <!-- VERDICT -->
  ${evaluation?.verdict ? `
  <div style="background:linear-gradient(135deg,#1e1b4b,#0f172a);border:1px solid ${tc}40;border-radius:16px;padding:20px 24px;margin-bottom:20px;">
    <p style="color:${tc};font-weight:900;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin:0 0 10px;">IFB Verdict</p>
    <p style="color:#e2e8f0;font-size:13px;line-height:1.7;margin:0;">${evaluation.verdict}</p>
  </div>` : ''}

  <!-- STRENGTHS & GAPS -->
  <div style="display:grid;gap:16px;margin-bottom:24px;">
    <div style="background:#1e293b;border-radius:16px;padding:20px 24px;">
      <p style="color:#10b981;font-weight:900;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin:0 0 14px;">Points Forts</p>
      ${strengthsHtml}
    </div>
    <div style="background:#1e293b;border-radius:16px;padding:20px 24px;">
      <p style="color:#f59e0b;font-weight:900;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin:0 0 14px;">Points à Améliorer</p>
      ${gapsHtml}
    </div>
  </div>

  <!-- CTA -->
  <div style="text-align:center;margin-bottom:32px;">
    <a href="${app_url}" style="display:inline-block;background:linear-gradient(135deg,${tc},${tc}cc);color:#fff;font-weight:900;font-size:14px;text-decoration:none;padding:18px 48px;border-radius:14px;letter-spacing:1px;box-shadow:0 8px 24px ${tc}40;">
      Open My IFB Dashboard →
    </a>
    <p style="color:#475569;font-size:11px;margin:14px 0 0;">Questions? Reply to this email or contact sapiens@infinitefuturebank.org</p>
  </div>

  <!-- FOOTER -->
  <div style="border-top:1px solid #1e293b;padding-top:24px;text-align:center;">
    <p style="color:#6366f1;font-weight:900;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin:0 0 6px;">Infinite Future Bank</p>
    <p style="color:#475569;font-size:11px;margin:0 0 4px;">sapiens@infinitefuturebank.org · infinitefuturebank.org</p>
    <p style="color:#334155;font-size:10px;margin:0;">Connecting people, capital, and opportunity across borders.</p>
  </div>

</div>
</body>
</html>`;

    const toList = [to_email];
    if (cc_email) toList.push(cc_email);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_KEY}`,
      },
      body: JSON.stringify({
        from: 'Sapiens @ IFB <sapiens@infinitefuturebank.org>',
        to: toList,
        subject: `Invoice & Evaluation — ${npo_name} · IFB Advisory Services`,
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
