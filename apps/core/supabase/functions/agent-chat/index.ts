import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const IFB_KNOWLEDGE = `
=== INFINITE FUTURE BANK (IFB / DEUS) — COMPLETE PLATFORM KNOWLEDGE BASE ===

COMPANY:
- Name: Infinite Future Bank (IFB), brand "DEUS"
- Registrations: US EIN 33-1869013 | Austria 91 323/2005 | Canada CRA 721487825 RC 0001
- Support: support@infinitefuturebank.org | Website: deus.infinitefuturebank.org

APP NAVIGATION (left sidebar):
Home, History, Planner, Accounts, Organize, Invest, Business, Lifestyle, Training, My Team, Insurance, Loans & Credit, AFR Node, Settings, Admin Center

BALANCE POCKETS:
- Liquid USD (Cash on Hand): primary balance for transfers, withdrawals, card recharges
- Alpha Investments: equity portfolio (cannot be used directly for transfers)
- MySafe Digital: encrypted vault (locked until released)
- AFR Tokens: Ariel Franc blockchain tokens
- Card Balance: on the virtual card itself (separate from liquid USD; topped up via Recharge)

INFINITE CARD (Accounts → Infinite Card):
- Issue virtual Sovereign Cards: Obsidian (dark), Silver (titanium), Gold (sovereign)
- One card per style; tap card to flip and see back
- Reveal Details button: shows full 16-digit PAN, expiry, CVV
- Default view: only last 4 digits shown for security
- Card Balance: separate pool from liquid USD — must be recharged
- RECHARGE: enter amount → tap "Recharge" → transfers from liquid USD to card balance
- Freeze / Unfreeze: toggles card active/frozen
- Terminate: permanently deletes the card
- Pay Partner: test card at Elite Global Medical Partner simulation
- Clyrix Fallback toggle: when ON (green), insurance bridges payment shortfalls automatically
- Auto-Sweep AFR toggle: liquidates AFR tokens to cover card payments
- Ledger tab: shows all card transaction history

USING CARD ON EXTERNAL PLATFORMS (Alibaba, Amazon, Shopify, etc.):
- IFB Sovereign Cards are virtual Visa-equivalent cards usable on any online merchant
- First recharge the card from your liquid USD (Accounts → Infinite Card → Card tab)
- Use the 16-digit number, expiry, and CVV found under "Reveal Details"
- Card must be active (not frozen) and have sufficient balance

USD ↔ AFR EXCHANGE (Accounts → Balances tab):
- Exchange between USD and AFR at 0.25% network spread
- Arrow button toggles direction (USD→AFR or AFR→USD)
- Enter amount → Confirm Exchange
- AFR is IFB's own blockchain token (Ariel Franc, launched 2026)

SEND MONEY (Home → Send):
- Select saved recipient from dropdown
- IFB-to-IFB: instant atomic transfer, both balances update live
- External: debit sender only, manual external processing
- Scheduled: set future date, queued with pending status
- Requires sufficient liquid USD balance

WITHDRAWAL (Home → Withdraw):
- Methods: P2P via Community of Trust (COT) | Global Bank Wire
- Select routing processor — "IFB Global Operations" always available
- Amount must be within liquid USD balance (not card balance)
- Funds go into escrow, processor confirms delivery, escrow releases
- P2P typically settles within 15 min to 4 hours

DEPOSIT (Home → Deposit):
- Upload proof of payment (bank receipt, mobile money screenshot, crypto TX)
- AI verifies and credits liquid USD balance
- Supported: bank wire, mobile money, USDC/crypto

TAP & PAY / NFC (Home → Tap & Pay):
- SEND: enter amount → Send mode → hold phones back-to-back (Android NFC)
- RECEIVE: Receive mode → share 6-digit one-time code (works on iOS too)
- Real-time P2P, instant settlement
- Requires NFC enabled on Android; iOS uses code method

ANALYTICS (Home → Analytics): portfolio performance charts and spending breakdown

VAULT (Home → Vault): MySafe digital safe — lock and unlock digital assets

COMMUNITY OF TRUST (COT) — Accounts → COT tab:
- P2P processor network; trusted members process withdrawals and earn COT fees
- Become a processor: stake reputation, select order types, earn percentage on completions
- Orders matched by geography and trust tier

KYC / COMPLIANCE (Accounts → Compliance tab):
- Upload 4 documents: ID front, ID back, selfie, proof of address
- AI-powered OCR extraction and confidence scoring
- Verification levels: unverified → pending_review → verified
- Verified status required for higher transaction limits and COT access

IDENTITY BADGING (Accounts → Badging tab):
- Investor badge: has capital in Alpha Investments
- Founder badge: active entrepreneur commercial profile
- Impact badge: registered NPO/NGO on IFB
- Protected badge: active Clyrix insurance policy
- Reputation Score (0–1000 pts) influences interest rates and insurance premiums

MICHAEL RISK SCORE (Dashboard top):
- Real-time global risk intel per user location
- Sub-scores: Environmental, Security, Financial, Food Security, Epidemic (each 0–100)
- MICHAEL Score 0–100 overall
- Low = safe | Medium = caution | High = alert

VENTURE X (Business → Franchise Hub):
- Browse franchise opportunities by category and geography
- Apply for franchises via in-app flow
- Track applications and manage active franchise operations

CAPITAL UNIVERSE (Invest):
- IFB Dark Pool investment deals
- Portfolio tracking and deal applications
- AFR Network participation

NPO HUB (Business → NPO):
- Non-profit registration and management
- Document compliance uploads
- I3P Copilot: AI for NPO grant writing and compliance

ENTREPRENEUR PACKAGE (Business):
- 4-step onboarding: profile → business plan → payment → activation
- Paid via wallet (liquid USD); unlocks mentorship and IFB capital access

INSURANCE — CLYRIX (Insurance section):
- Hybrid insurance product underwriting card payments
- Auto-bridges shortfalls: if card balance low, Clyrix covers the gap
- Enable in Accounts → Infinite Card → Card tab → Smart Liquidity Routing
- Contact support for claims or policy questions

LOANS & CREDIT (Loans & Credit section):
- Credit line based on: balance history, reputation score, KYC status
- SOS Advance: instant micro-advance against next deposit
- Application via in-app flow with AI assessment

AFR BLOCKCHAIN NODE (AFR Node section):
- Participate in Ariel Franc consensus network
- Earn AFR tokens through block validation
- Monitor node health and earnings

TRAINING — IFB ACADEMY (Training section):
- Financial literacy modules
- IFB platform certification
- Entrepreneurship courses

TROUBLESHOOTING GUIDE:

[WITHDRAWAL NOT WORKING]
Step 1: Confirm amount ≤ liquid USD balance (not card balance, not investments)
Step 2: Home → Withdraw Capital
Step 3: Choose method (P2P or Global Bank)
Step 4: If "processor not found" — select "IFB Global Operations" which is always online
Step 5: Fill payment details and confirm
If still failing: email support@infinitefuturebank.org with account email + amount + error message

[CARD SHOWING WRONG DIGITS]
- The app masks PAN for security — shows only last 4 digits by default
- Tap "Reveal Details" button to see full 16-digit PAN, expiry, and CVV
- If card was provisioned before May 2026 and still shows 8 digits: terminate it and provision a new one

[CARD RECHARGE NOT WORKING]
- Card balance is separate from liquid USD
- Path: Accounts → Infinite Card → Card tab → enter amount in recharge field → tap Recharge
- Requires liquid USD balance ≥ recharge amount
- If error: check liquid USD balance in Accounts → Balances

[PAY PARTNER REJECTED]
- Card must be active (not frozen)
- Enable Clyrix Fallback toggle (Smart Liquidity Routing section)
- Ensure liquid USD > $0 OR Clyrix coverage is active
- If rejected with error: check card status and balance

[NFC TRANSFER ISSUES]
- Android: enable NFC in phone Settings → Connections → NFC
- Both users must have app open simultaneously
- SEND: amount → Send mode → hold phones back-to-back ≤ 5cm
- iOS: use 6-digit code (no NFC chip support) — RECEIVE mode on one device, SEND mode on other
- Code expires in 60 seconds

[EXCHANGE FAILING]
- USD→AFR: requires liquid_usd > 0
- AFR→USD: requires afr_balance > 0
- Amount must be > 0 and ≤ source balance
- 0.25% fee is deducted from the received amount (not the sent amount)

[BALANCE SHOWING ZERO / WRONG]
- Refresh page (F5 or pull-to-refresh on mobile)
- Check History tab for recent transactions
- Realtime subscription may lag — wait 30 seconds and refresh
- If balance is genuinely missing after refresh: contact support immediately

[KYC STUCK IN PENDING]
- Processing: 1–24 hours
- Ensure: photos clear, full document visible, not expired
- After 24 hours with no change: email support with submission timestamp

[ESCROW FUNDS LOCKED]
- Withdrawal escrow holds until processor confirms delivery
- Normal release: 15 min to 4 hours P2P | up to 3 days for bank wire
- After 24+ hours no release: email support with order ID from History

[VERIFICATION EMAIL NOT RECEIVED]
1. Check spam/junk folder
2. Try "Forgot Password" — resends confirmation
3. Email support@infinitefuturebank.org with signup email for manual trigger

[SEND MONEY NOT CREDITING RECIPIENT]
- Only IFB-registered recipients receive instant credit
- External recipients (no IFB account) require manual processing
- Confirm recipient has an IFB account in your saved recipients list
`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { agent, messages, balances, profile, task } = await req.json()
    const apiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('VITE_GEMINI_API_KEY')

    if (!apiKey) throw new Error('GEMINI_API_KEY not configured.')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const agentName = agent?.name || 'NOVA'
    const agentId = agent?.id || 'support'
    const userName = profile?.full_name || 'Client'

    await supabaseClient.from('system_audit_ledger').insert({
      user_id: profile?.id,
      action_type: task ? 'AGENT_DIRECTIVE_ASSIGNED' : 'AGENT_CONSULTATION',
      metadata: { agent_name: agentName, input: task || messages[messages.length - 1]?.text || messages[messages.length - 1]?.content }
    }).then(() => {}).catch(() => {})

    let systemInstruction = `You are ${agentName}, ${agent?.title || 'Customer Intelligence Officer'} at DEUS (Infinite Future Bank).
Your mandate: ${agent?.mission || 'Provide instant, accurate, empathetic support for IFB clients.'}

COMPLIANCE: US EIN 33-1869013 | Austria 91 323/2005 | Canada CRA 721487825 RC 0001.
Never advise illegal tax evasion, money laundering, or guarantee financial returns.
Communicate in English, French, or Swahili — match the user's language.
Tone: Institutional, intelligent, warm, precise. No emojis. Never break character. Never claim to be an AI.

Client: ${userName}
Liquid Cash: $${balances?.liquid_usd || 0}
Invested Equity: $${balances?.alpha_equity_usd || 0}
AFR Balance: ${balances?.afr_balance || 0} AFR`

    // NOVA — IFB SUPPORT AGENT
    if (agentId === 'support' || agentId === 'nova' || agentName === 'NOVA') {
      systemInstruction += `

NOVA SUPPORT DIRECTIVE:
You are NOVA, IFB's AI Customer Intelligence Officer. You have total knowledge of every IFB feature, policy, and troubleshooting path. Use the knowledge base injected below to give precise answers.

Response format for issues:
- Name the feature/issue clearly
- Numbered step-by-step resolution
- End with: "If this doesn't resolve it, email support@infinitefuturebank.org with your account email and a brief description."

Response format for feature questions:
- Clear explanation of what it does
- How to access it (menu path)
- Any requirements (KYC, balance, etc.)

${IFB_KNOWLEDGE}`
    }

    // ABRAHAM — ENTREPRENEURIAL ARCHITECT
    if (agentName === 'Abraham' || agentId === 'abraham') {
      systemInstruction += `

ABRAHAM PROTOCOL — ENTREPRENEURIAL INFRASTRUCTURE:
You are the primary funnel for IFB Capital. Act as a strict institutional startup architect. Guide through 5 pillars:
1. FOUNDER DIAGNOSTIC: Assess skills, risk appetite, financial literacy. Issue Founder Profile Score.
2. BUSINESS BLUEPRINT: Market validation checklist, revenue model, risk identification. No vague ideas accepted.
3. DOCUMENT REVIEW LITE: Sharp structural feedback on pitch decks. Point out investor-visible flaws.
4. EXECUTION CHECKLIST: Incorporation, banking setup, tax compliance, licensing steps.
5. CAPITAL READINESS SCORE (CRS): Rate readiness for IFB institutional capital. Tell them exactly what to fix.
Use institutional headings. Be authoritative, data-driven, capital-focused.`
    }

    if (task) {
      systemInstruction += `\n\nTASK DIRECTIVE: "${task}". Confirm compliance, acknowledge, state execution protocol, provide preliminary strategic thought.`
    }

    const formattedMessages = messages
      .map((m: any) => ({
        role: m.role === 'ai' ? 'model' : 'user',
        parts: [{ text: m.text || m.content || '' }]
      }))
      .filter((m: any) => m.parts[0].text.trim())

    if (formattedMessages.length === 0) throw new Error('No messages to process.')

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: formattedMessages
        })
      }
    )

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Gemini ${response.status}: ${errText}`)
    }

    const data = await response.json()
    const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Connection relay disrupted. Please retry.'

    await supabaseClient.from('system_audit_ledger').insert({
      user_id: profile?.id,
      action_type: 'AGENT_RESPONSE_EXECUTED',
      metadata: { agent_name: agentName, output: aiText.slice(0, 500) }
    }).then(() => {}).catch(() => {})

    return new Response(
      JSON.stringify({ text: aiText.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#+\s/g, '').trim() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
