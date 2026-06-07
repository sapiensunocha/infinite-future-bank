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

    const { to_email, operation, error_message, error_code, context = {} } = await req.json();

    const opColor: Record<string, string> = {
      'Transfer':   '#ef4444',
      'Deposit':    '#f59e0b',
      'Withdrawal': '#f59e0b',
      'KYC':        '#6366f1',
      'Loan':       '#0ea5e9',
    };
    const color = opColor[operation] || '#ef4444';

    const contextRows = Object.entries(context)
      .map(([k, v]) => `
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #1e293b;">
          <span style="color:#64748b;font-size:12px;font-weight:600;">${k}</span>
          <span style="color:#e2e8f0;font-size:12px;font-weight:700;">${v}</span>
        </div>`).join('');

    const actionMap: Record<string, {title: string; steps: string[]}> = {
      'Transfer': {
        title: 'Your transfer did not go through',
        steps: [
          'Check your available balance in your IFB Dashboard',
          'Verify the recipient is linked to a valid IFB account',
          'Retry the transfer — if it fails again, contact IFB Support',
          'If you see unexpected deductions, open a support ticket immediately',
        ],
      },
      'Deposit': {
        title: 'Your deposit was not processed',
        steps: [
          'Check that your card or payment method is valid and has sufficient funds',
          'Retry the deposit with a different payment method',
          'Contact your bank if the charge appears but funds are missing',
          'Open a support ticket if the issue persists',
        ],
      },
      'Withdrawal': {
        title: 'Your withdrawal request failed',
        steps: [
          'Ensure your destination account details are correct',
          'Check your available balance (min. $3 required after withdrawal)',
          'Retry in a few minutes — temporary network issues can cause failures',
          'Contact IFB Support if your balance shows deducted funds',
        ],
      },
      'KYC': {
        title: 'There was an issue with your KYC submission',
        steps: [
          'Ensure all documents are clear, unexpired, and fully visible',
          'Re-upload your ID and selfie with good lighting',
          'Make sure your document matches your registration name exactly',
          'Contact support@infinitefuturebank.org for manual review',
        ],
      },
    };

    const info = actionMap[operation] || {
      title: 'An operation on your account failed',
      steps: [
        'Retry the operation — temporary issues are often resolved automatically',
        'Check your account balance and connection',
        'Contact IFB Support if the problem persists',
      ],
    };

    const stepsHtml = info.steps.map((s, i) => `
      <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:10px;">
        <div style="min-width:22px;height:22px;border-radius:50%;background:${color}20;border:1px solid ${color}40;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <span style="color:${color};font-size:10px;font-weight:900;">${i+1}</span>
        </div>
        <span style="color:#cbd5e1;font-size:12px;line-height:1.6;">${s}</span>
      </div>`).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>IFB — Operation Failed</title></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 16px;">

  <!-- HEADER -->
  <div style="text-align:center;margin-bottom:28px;">
    <p style="color:#6366f1;font-weight:900;font-size:10px;letter-spacing:4px;text-transform:uppercase;margin:0 0 10px;">Infinite Future Bank</p>
    <div style="display:inline-block;background:${color}15;border:1px solid ${color}40;border-radius:50px;padding:6px 18px;">
      <span style="color:${color};font-size:11px;font-weight:700;letter-spacing:2px;">⚠️ OPERATION FAILED</span>
    </div>
  </div>

  <!-- ALERT CARD -->
  <div style="background:#1e293b;border:2px solid ${color}40;border-radius:20px;padding:28px;margin-bottom:20px;">
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;">
      <div style="width:48px;height:48px;border-radius:14px;background:${color}20;border:1px solid ${color}40;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">⚠️</div>
      <div>
        <p style="color:#ffffff;font-size:15px;font-weight:900;margin:0 0 3px;">${info.title}</p>
        <p style="color:#64748b;font-size:11px;margin:0;">${operation} · ${new Date().toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' })} UTC</p>
      </div>
    </div>
    <div style="background:#0f172a;border-radius:12px;padding:14px 16px;">
      <p style="color:#94a3b8;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 6px;">Error Details</p>
      <p style="color:${color};font-size:13px;font-weight:700;margin:0;">${error_message}</p>
      ${error_code ? `<p style="color:#475569;font-size:10px;font-weight:600;margin:4px 0 0;">Code: ${error_code}</p>` : ''}
    </div>
  </div>

  ${contextRows ? `
  <!-- CONTEXT -->
  <div style="background:#1e293b;border-radius:16px;padding:20px 24px;margin-bottom:20px;">
    <p style="color:#94a3b8;font-weight:900;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin:0 0 12px;">Transaction Details</p>
    ${contextRows}
  </div>` : ''}

  <!-- WHAT TO DO -->
  <div style="background:#1e293b;border-radius:16px;padding:20px 24px;margin-bottom:20px;">
    <p style="color:#94a3b8;font-weight:900;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin:0 0 14px;">What To Do Next</p>
    ${stepsHtml}
  </div>

  <!-- TRANSPARENCY NOTE -->
  <div style="background:linear-gradient(135deg,#1e1b4b,#0f172a);border:1px solid #6366f130;border-radius:16px;padding:20px 24px;margin-bottom:24px;">
    <p style="color:#6366f1;font-weight:900;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px;">IFB Transparency Policy</p>
    <p style="color:#94a3b8;font-size:12px;line-height:1.7;margin:0;">
      We notify you of every failed operation in real-time — both in-app and by email. Your account data is unchanged unless this email explicitly states otherwise. No funds have been moved without your confirmation.
    </p>
  </div>

  <!-- CTA -->
  <div style="text-align:center;margin-bottom:32px;">
    <a href="https://deus.infinitefuturebank.org" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;font-weight:900;font-size:13px;text-decoration:none;padding:16px 42px;border-radius:12px;letter-spacing:1px;">
      Open IFB Dashboard →
    </a>
    <p style="color:#475569;font-size:11px;margin:12px 0 0;">Need help? Reply to this email or visit support in your dashboard.</p>
  </div>

  <!-- FOOTER -->
  <div style="border-top:1px solid #1e293b;padding-top:20px;text-align:center;">
    <p style="color:#6366f1;font-weight:900;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin:0 0 4px;">Infinite Future Bank</p>
    <p style="color:#475569;font-size:11px;margin:0;">sapiens@infinitefuturebank.org · infinitefuturebank.org</p>
  </div>

</div></body></html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_KEY}` },
      body: JSON.stringify({
        from: 'IFB Alerts <sapiens@infinitefuturebank.org>',
        to: [to_email],
        subject: `⚠️ ${operation} Failed — Action Required · IFB`,
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
