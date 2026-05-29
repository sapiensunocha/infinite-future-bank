/**
 * IFB — Company Formation Feature Announcement
 * Fetches all real confirmed users from Supabase auth, gets their name from
 * profiles, then sends a personalised email via Resend.
 */

import { execSync } from 'child_process';

const RESEND_KEY = 're_Xhui4Sma_6C33MU1cWQ3sA8USVMTJPgHr';
const FROM       = 'IFB <sapiens@infinitefuturebank.org>';
const DELAY_MS   = 300;

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── 1. Fetch real users via Supabase CLI (SQL query) ─────────────────────────

function fetchRealUsers() {
  const sql = `
    SELECT au.email,
           COALESCE(p.full_name, au.raw_user_meta_data->>'full_name', split_part(au.email,'@',1)) AS full_name
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.id = au.id
    WHERE au.email IS NOT NULL
      AND au.email_confirmed_at IS NOT NULL
      AND (au.is_anonymous IS NULL OR au.is_anonymous = false)
      AND au.email NOT LIKE '%@ifbplatform.com'
    ORDER BY au.created_at DESC;
  `;

  const out = execSync(
    `npx supabase db query "${sql.replace(/\n/g,' ').replace(/"/g,"'")}" --linked`,
    { cwd: '/Users/sapiensndatabaye/Desktop/INFINITE FUTURE BANK/DEUS/infinite-future-bank', encoding: 'utf8' }
  );

  // parse JSON rows from CLI output
  const match = out.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Could not parse CLI output:\n' + out);
  const { rows } = JSON.parse(match[0]);

  return rows.map(r => ({
    email: r.email,
    name:  (r.full_name || r.email.split('@')[0]).split(' ')[0].trim(), // first name
  }));
}

// ── 3. Build personalised HTML email ─────────────────────────────────────────

function buildEmail(firstName) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>IFB — Register Your Company in 57 Countries</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1e1b4b,#312e81);border-radius:24px 24px 0 0;padding:40px 40px 32px;text-align:center;">
          <p style="margin:0 0 16px;font-size:11px;font-weight:900;letter-spacing:0.2em;text-transform:uppercase;color:#a5b4fc;">
            🌍 IFB Platform Update
          </p>
          <h1 style="margin:0 0 12px;font-size:28px;font-weight:900;color:#ffffff;line-height:1.2;">
            Register Your Company<br/>in <span style="color:#818cf8;">57 Countries.</span><br/>We Handle Everything.
          </h1>
          <p style="margin:0;font-size:15px;color:#94a3b8;line-height:1.6;">
            No lawyers. No government portals. No guesswork.
          </p>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#1e293b;padding:40px;">

          <p style="margin:0 0 20px;font-size:15px;color:#cbd5e1;line-height:1.7;">
            Hi <strong style="color:#ffffff;">${firstName}</strong>,
          </p>

          <p style="margin:0 0 20px;font-size:15px;color:#cbd5e1;line-height:1.7;">
            We just launched something big. <strong style="color:#ffffff;">IFB Global Company Formation</strong> is now live — and it lets you incorporate a legal business entity in <strong style="color:#818cf8;">57 countries</strong> directly from your IFB dashboard, starting from just <strong style="color:#34d399;">$599</strong>.
          </p>

          <!-- Flag strip -->
          <div style="background:#0f172a;border-radius:16px;padding:20px 24px;margin:0 0 28px;text-align:center;font-size:22px;letter-spacing:4px;">
            🇺🇸 🇬🇧 🇦🇪 🇸🇬 🇪🇪 🇰🇾 🇷🇼 🇳🇬 🇯🇵 🇮🇳 🇦🇺 🇳🇿
          </div>

          <p style="margin:0 0 12px;font-size:11px;font-weight:900;letter-spacing:0.15em;text-transform:uppercase;color:#64748b;">
            What's covered
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
            ${[
              ['🌎 Americas', 'US (Wyoming LLC, Delaware C-Corp), Canada, Cayman Islands, BVI, Panama, Brazil, Colombia + 7 more'],
              ['🌍 Africa', 'Nigeria, Kenya, South Africa, Rwanda, Mauritius, Seychelles, Ghana, Morocco + 2 more'],
              ['🌏 Asia', 'Singapore, Hong Kong, India, Japan, Malaysia, Vietnam, Indonesia, South Korea + 2 more'],
              ['🇪🇺 Europe', 'UK, Ireland, Estonia e-Residency, Germany, Switzerland, Malta, Cyprus, Portugal + 9 more'],
              ['🕌 Middle East', 'UAE (SHAMS & IFZA), Bahrain, Qatar, Saudi Arabia, Oman'],
            ].map(([region, desc]) => `
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #334155;vertical-align:top;">
                <p style="margin:0 0 3px;font-size:13px;font-weight:900;color:#e2e8f0;">${region}</p>
                <p style="margin:0;font-size:12px;color:#64748b;line-height:1.5;">${desc}</p>
              </td>
            </tr>`).join('')}
          </table>

          <p style="margin:0 0 12px;font-size:11px;font-weight:900;letter-spacing:0.15em;text-transform:uppercase;color:#64748b;">
            Three service tiers
          </p>
          <table width="100%" cellpadding="0" cellspacing="8" style="margin:0 0 28px;">
            ${[
              ['🚀 IFB LAUNCH', 'Included', 'Full filing, registered agent, EIN, certificate, IFB wallet', '#10b981'],
              ['⚡ IFB SCALE', '+$299', 'Virtual address, banking setup (Mercury/Wise), compliance calendar, priority processing', '#3b82f6'],
              ['👑 IFB ELITE', '+$799', 'Dedicated advisor, same-day filing, cap table guidance + VentureX investor profile created automatically', '#8b5cf6'],
            ].map(([name, price, desc, color]) => `
            <tr><td style="background:#0f172a;border-radius:12px;padding:14px 16px;margin-bottom:8px;display:block;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td><p style="margin:0;font-size:13px;font-weight:900;color:${color};">${name}</p></td>
                  <td align="right"><p style="margin:0;font-size:13px;font-weight:900;color:#ffffff;">${price}</p></td>
                </tr>
                <tr><td colspan="2"><p style="margin:4px 0 0;font-size:12px;color:#64748b;line-height:1.5;">${desc}</p></td></tr>
              </table>
            </td></tr>`).join('')}
          </table>

          <p style="margin:0 0 28px;font-size:15px;color:#cbd5e1;line-height:1.7;">
            The entire submission takes under <strong style="color:#ffffff;">10 minutes</strong>. Pay from your IFB wallet. Your reference number is generated instantly — and a dedicated handler is assigned within 24 hours.
          </p>

          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
            <tr><td align="center">
              <a href="https://infinitefuturebank.org" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:0.12em;text-decoration:none;padding:16px 40px;border-radius:14px;">
                Register Your Company Now →
              </a>
            </td></tr>
          </table>

          <p style="margin:0;font-size:13px;color:#475569;line-height:1.6;">
            Find it under <strong style="color:#94a3b8;">Invest → 🏢 Incorporate</strong> or <strong style="color:#94a3b8;">Business Hub → Register New Company</strong>.
          </p>

        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#0f172a;border-radius:0 0 24px 24px;padding:28px 40px;text-align:center;">
          <p style="margin:0 0 8px;font-size:12px;color:#334155;">
            Infinite Future Bank · <a href="https://infinitefuturebank.org" style="color:#4f46e5;text-decoration:none;">infinitefuturebank.org</a>
          </p>
          <p style="margin:0;font-size:11px;color:#1e293b;">
            Questions? Reply to this email or contact <a href="mailto:sapiens@infinitefuturebank.org" style="color:#334155;">sapiens@infinitefuturebank.org</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── 4. Send via Resend ────────────────────────────────────────────────────────

async function sendEmail(to, firstName) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from:    FROM,
      to:      [to],
      subject: `${firstName}, you can now register a company in 57 countries — inside IFB`,
      html:    buildEmail(firstName),
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || JSON.stringify(data));
  return data.id;
}

// ── 5. Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('━━━ IFB Formation Announcement Email Blast ━━━\n');

  console.log('📥 Fetching real confirmed users via SQL…');
  const users = fetchRealUsers();
  console.log(`   Found ${users.length} real users.\n`);

  console.log(`📧 Sending to ${users.length} users...\n`);

  let sent = 0, failed = 0;
  for (const user of users) {
    try {
      const id = await sendEmail(user.email, user.name);
      console.log(`  ✅  ${user.name} <${user.email}> — ${id}`);
      sent++;
    } catch (e) {
      console.log(`  ❌  ${user.email} — ${e.message}`);
      failed++;
    }
    await sleep(DELAY_MS);
  }

  console.log(`\n━━━ Done ━━━`);
  console.log(`✅  Sent:   ${sent}`);
  console.log(`❌  Failed: ${failed}`);
}

main().catch(console.error);
