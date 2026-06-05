import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
      to_email, to_name, company_name,
      level, pct, checklist, workstreams,
      cost_min, cost_max, funding_phase,
      app_url = 'https://deux.infinitefuturebank.org',
    } = await req.json();

    const firstName = (to_name || 'there').split(' ')[0];
    const doneItems  = (checklist || []).filter((c: any) => c.met);
    const missingItems = (checklist || []).filter((c: any) => !c.met);
    const incompleteWS = (workstreams || []).filter((ws: any) => !ws.complete);

    const levelColors: Record<number,string> = {
      1: '#ef4444', 2: '#f97316', 3: '#f59e0b', 4: '#3b82f6', 5: '#10b981',
    };
    const levelColor = levelColors[level] || '#6366f1';

    const checkRow = (label: string, met: boolean) =>
      `<tr><td style="padding:6px 0;"><span style="color:${met?'#10b981':'#ef4444'};font-weight:900;margin-right:8px;">${met?'✓':'✗'}</span><span style="color:${met?'#d1fae5':'#fca5a5'};font-size:13px;">${label}</span></td></tr>`;

    const wsRow = (ws: any) =>
      `<tr style="border-bottom:1px solid #1e293b;">
        <td style="padding:10px 0;">
          <span style="background:${ws.complete?'#10b981':'#374151'};color:#fff;font-weight:900;font-size:11px;padding:3px 8px;border-radius:6px;margin-right:10px;">${ws.id}</span>
          <span style="color:${ws.complete?'#6ee7b7':'#cbd5e1'};font-size:13px;font-weight:600;">${ws.label}</span>
        </td>
        <td style="text-align:right;padding:10px 0;white-space:nowrap;">
          ${ws.complete
            ? '<span style="color:#10b981;font-weight:900;font-size:12px;">✓ Complete</span>'
            : `<span style="color:#94a3b8;font-size:12px;">${ws.hMin}–${ws.hMax}h · <strong style="color:#e2e8f0;">$${ws.cMin.toLocaleString()}–$${ws.cMax.toLocaleString()}</strong></span>`
          }
        </td>
      </tr>`;

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <p style="color:#6366f1;font-weight:900;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px;">Infinite Future Bank</p>
      <h1 style="color:#ffffff;font-size:24px;font-weight:900;margin:0;">Capital Readiness Report</h1>
      <p style="color:#94a3b8;font-size:14px;margin:8px 0 0;">${company_name}</p>
    </div>

    <!-- Level Card -->
    <div style="background:linear-gradient(135deg,#1e1b4b,#1e293b);border:1px solid ${levelColor}40;border-radius:16px;padding:24px;margin-bottom:24px;text-align:center;">
      <div style="display:inline-block;background:${levelColor}20;border:1px solid ${levelColor}50;border-radius:50px;padding:8px 20px;margin-bottom:12px;">
        <span style="color:${levelColor};font-weight:900;font-size:13px;text-transform:uppercase;letter-spacing:2px;">LEVEL ${level}/5</span>
      </div>
      <h2 style="color:#fff;font-size:20px;font-weight:900;margin:0 0 8px;">${['','Just Started','Foundation','In Progress','Advanced','Funding Ready'][level]}</h2>
      <div style="background:#1e293b;border-radius:8px;height:10px;overflow:hidden;margin:12px 0;">
        <div style="background:${levelColor};height:100%;width:${pct}%;border-radius:8px;"></div>
      </div>
      <p style="color:#94a3b8;font-size:13px;margin:0;">${pct}% complete · ${missingItems.length} items remaining</p>
    </div>

    <!-- Greeting -->
    <div style="background:#1e293b;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="color:#e2e8f0;font-size:14px;line-height:1.7;margin:0;">Dear <strong style="color:#fff;">${firstName}</strong>,<br><br>
      Thank you for your commitment and for taking the first step with IFB. Below is your current Capital Readiness Report. We are here to support you at every stage — from structuring your organization to securing and managing funding.</p>
    </div>

    ${doneItems.length > 0 ? `
    <!-- Completed -->
    <div style="background:#052e16;border:1px solid #166534;border-radius:12px;padding:20px;margin-bottom:16px;">
      <p style="color:#86efac;font-weight:900;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">Completed (${doneItems.length}/${checklist.length})</p>
      <table style="width:100%;border-collapse:collapse;">
        ${doneItems.map((c: any) => checkRow(c.label, true)).join('')}
      </table>
    </div>` : ''}

    ${missingItems.length > 0 ? `
    <!-- Missing -->
    <div style="background:#450a0a;border:1px solid #7f1d1d;border-radius:12px;padding:20px;margin-bottom:16px;">
      <p style="color:#fca5a5;font-weight:900;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">Still Required (${missingItems.length} items)</p>
      <table style="width:100%;border-collapse:collapse;">
        ${missingItems.map((c: any) => checkRow(c.label, false)).join('')}
      </table>
    </div>` : ''}

    ${incompleteWS.length > 0 ? `
    <!-- Workstreams -->
    <div style="background:#1e293b;border-radius:12px;padding:20px;margin-bottom:16px;">
      <p style="color:#94a3b8;font-weight:900;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">IFB Support Workstreams · $30/hr</p>
      <table style="width:100%;border-collapse:collapse;">
        ${incompleteWS.map(wsRow).join('')}
      </table>
      <div style="margin-top:16px;padding-top:16px;border-top:1px solid #334155;">
        <p style="color:#94a3b8;font-size:12px;margin:0 0 4px;">Estimated remaining investment:</p>
        <p style="color:#fff;font-size:18px;font-weight:900;margin:0;">$${cost_min.toLocaleString()} – $${cost_max.toLocaleString()}</p>
        <p style="color:#64748b;font-size:11px;margin:4px 0 0;">You choose which parts IFB handles and which your team completes independently.</p>
      </div>
    </div>` : ''}

    <!-- Funding Timeline -->
    <div style="background:#1e1b4b;border:1px solid #4338ca40;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="color:#818cf8;font-weight:900;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px;">Funding Timeline</p>
      <p style="color:#e2e8f0;font-size:14px;font-weight:600;margin:0;">${funding_phase}</p>
    </div>

    <!-- CTA Button -->
    ${incompleteWS.length > 0 ? `
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${app_url}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;font-weight:900;font-size:14px;text-decoration:none;padding:16px 40px;border-radius:12px;letter-spacing:1px;">
        Pay & Start Your IFB Journey →
      </a>
      <p style="color:#64748b;font-size:11px;margin:12px 0 0;">Open your IFB app and tap the notification to choose your starting amount.</p>
    </div>` : `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="background:#052e16;border:1px solid #166534;border-radius:12px;padding:20px;">
        <p style="color:#10b981;font-weight:900;font-size:16px;margin:0;">🎉 All requirements complete — you are Funding Ready!</p>
      </div>
    </div>`}

    <!-- Footer -->
    <div style="border-top:1px solid #1e293b;padding-top:20px;text-align:center;">
      <p style="color:#475569;font-size:12px;margin:0 0 4px;">Infinite Future Bank · IFB DEUS Platform</p>
      <p style="color:#334155;font-size:11px;margin:0;">This report was generated by your IFB advisor. Reply to this email to discuss next steps.</p>
    </div>

  </div>
</body>
</html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_KEY}` },
      body: JSON.stringify({
        from: 'IFB Advisor <noreply@infinitefuturebank.org>',
        to: [to_email],
        subject: `Your Capital Readiness Report — Level ${level}/5 · ${pct}% Complete`,
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
