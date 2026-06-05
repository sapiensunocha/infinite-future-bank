// agent-chat
// NOVA — IFB Support AI powered by Gemini 2.5 Flash
// Full IFB platform knowledge injected into system prompt.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IFB_KNOWLEDGE = `
## INFINITE FUTURE BANK (IFB) — DEUS PLATFORM COMPLETE GUIDE

### What is IFB / DEUS?
Infinite Future Bank (IFB) is a sovereign digital bank built on the DEUS platform. It combines traditional banking, AFR blockchain technology, investment access, and AI-powered financial advisory for members worldwide. The app is available as a Progressive Web App (PWA) at deux.infinitefuturebank.org and as an Android APK (v1.3.0).

---

### ACCOUNTS & BALANCES
- **Liquid Wallet (USD)**: Main spending balance. Used for transfers, withdrawals, card payments.
- **My Safe (Vault)**: Secure digital safe — longer-term storage, slightly restricted access.
- **AFR Token Balance**: Native blockchain tokens on the AFR Chain 2026. Rate: 1 USD = 100 AFR by default.
- **Cash on Hand**: Physical cash tracked separately from digital balances.
- **Investment Portfolio**: Shows Alpha Investment value (managed separately).

---

### SENDING & RECEIVING MONEY

#### NFC Tap & Pay (3 modes):
1. **Send Money (IFB→IFB)**: Enter amount → generates 6-digit code → tap phones together (Android NFC) or share code. Receiver claims it via their IFB app. Code expires in 10 minutes.
2. **Receive from IFB**: Scan or enter the 6-digit code sent by the payer. On Android with NFC: tap "Start NFC Scan" then hold phones together.
3. **Get Paid by Card (NEW — v1.3.0)**: Enter the amount you want to collect → a Stripe payment QR code is generated. The payer scans the QR with any phone camera (no IFB account needed) and pays with Visa, Mastercard, Apple Pay, or Google Pay. Money arrives in your Liquid Wallet automatically after Stripe confirms payment. On Android, the payment URL is also written to the NFC tag so the payer can just tap their phone.

#### Global Transfer / Send:
Go to Home → Send → enter recipient IFB email or wallet address → enter amount → confirm. Transfers between IFB accounts are instant.

#### P2P Community of Trust:
Go to Withdraw → select "P2P (Community of Trust)" → choose a routing node → complete. This routes through trusted IFB community processors.

#### Pay Me (QR):
Go to Home → Pay Me → generates a QR code others can scan to send you money directly.

---

### DEPOSITS (Adding Money)
- **Card Deposit**: Home → Deposit → enter amount → pay via Stripe (Visa, Mastercard, Apple Pay, Google Pay). Money appears in Liquid Wallet instantly after Stripe confirms.
- **P2P Receipt Upload**: Upload a photo/screenshot of a P2P transfer receipt for manual processing.
- **AFR Minting**: Every USD deposit auto-mints AFR tokens at 100:1 ratio (e.g., $50 deposit = 5,000 AFR).

---

### WITHDRAWALS
Go to Home → Withdraw → choose method:
- **P2P (Community of Trust)**: Peer-to-peer via a routing node. Select "IFB Global Operations" if unsure.
- **Global Bank Transfer**: Wire to external bank account.

If you see "processing node" error: tap the node list again — "IFB Global Operations" is always available.

---

### IFB SOVEREIGN CARD
- Go to Home → Account Hub → Infinite Card.
- **Provision**: Issue a new virtual card. It appears instantly.
- **Reveal Details**: Shows full 16-digit card number, expiry, and CVV. The masked view always shows only the last 4 digits — this is normal for security.
- **Freeze / Unfreeze**: Instantly lock or unlock your card.
- **Clyrix Fallback**: Smart Liquidity Routing toggle. When ON (green), Clyrix insurance can bridge payment shortfalls automatically. Enable it if Pay Partner transactions fail.
- **Tap & Pay**: Use your card for NFC contactless payments (Android only).
- If card shows only 8 digits on the masked view: issue a new card — go to Infinite Card → Terminate old card → Provision new card.

---

### EXCHANGE (USD ↔ AFR)
Go to Home → Exchange → select direction (USD→AFR or AFR→USD) → enter amount → confirm. Rate is displayed before confirmation.

---

### KYC (Identity Verification)
Required for higher transaction limits.
- Go to Account → KYC → submit your ID documents and selfie.
- Status: unverified → pending → ai_reviewing → verified / needs_more_info / rejected.
- If status is "needs_more_info": resubmit requested documents.
- Full verification unlocks higher deposit/withdrawal limits and additional features.

---

### VENTUREX (Startup Investment Hub)
- Access via the left drawer → VentureX or Home → Updates tab.
- Browse 80+ real African startups with pitch videos.
- Watch pitch videos directly in the feed.
- Companies are organized by sector, stage, country, and funding round.
- Investors and deal flow are tracked in the VentureX section.

---

### AFR BLOCKCHAIN NODE
- Every installed IFB app becomes a light node on the AFR Chain.
- View node status in Home → ⬡ AFR Node.
- Pending transactions sync automatically when you reconnect.
- Node uptime is tracked and shown in the panel.

---

### WEALTH & INVESTMENT
- **Alpha Investments**: Managed investment portfolio linked to your account.
- **Capital Platform**: Access IFB Capital Network for business investment applications.
- **VaultManager / My Safe**: Lock funds in the digital vault for higher security.

---

### MICHAEL GLOBAL OPS (Risk Score)
- MICHAEL is IFB's global risk intelligence system.
- Shows a risk score (0–100) for your location based on environmental, security, financial, food security, and epidemic indicators.
- LOW risk (0–30) = green, MEDIUM (31–60) = amber, HIGH (61–100) = red.
- Powered by real-time global event data (3578+ tracked events).

---

### APP TOUR (First-Time Users)
- New users see a guided tour of the main features on first login.
- The tour can be skipped at any time.
- You can re-trigger the tour from Settings.
- Tour steps: Home overview → Quick Actions → App Drawer → AI Advisor.

---

### ADMIN CENTER (For Administrators Only)
Accessible via left drawer → Admin Center. Requires admin role.

**User Management** — click View on any user to open the User Detail panel (4 tabs):
- **Profile**: Edit name, phone, country, employer, revenue source, date of birth. Click Save to apply changes.
- **Balance**: Credit or debit a user's Liquid Wallet or My Safe. Enter amount + reason. Creates a transaction log entry automatically.
- **Notify**: Send a direct in-app notification to the user with a custom title and message.
- **Actions**: Change KYC status (Verify, Mark Pending, Needs More Info, Send to AI Review, Reject), Suspend or Unsuspend the account. View in Back Office.

**KYC Review Queue**: Review submitted documents, approve or reject with notes, see AI confidence score and risk rating.

**Transactions**: Full platform transaction history with search.

**Back Office**: Full profile view for any user — see all their transactions, balances, KYC history.

**Broadcast**: Send a notification to all platform users at once.

**VentureX**: Manage startup companies, update funding status, upload pitch documents.

**IFB Applications**: Review and manage IFB Capital applications.

---

### SUPPORT & CONTACT
- In-app support chat: tap the chat icon on the Home screen.
- Email: support@infinitefuturebank.org
- Submit a ticket: Chat → "Submit a Ticket" → describe your problem.
- A specialist will reply directly in the chat thread.

---

### COMMON ISSUES & SOLUTIONS

**Withdrawal failing**: Check that your liquid balance is sufficient. Select "IFB Global Operations" as the routing node. If using P2P, confirm the processor is active.

**Card shows 8 digits**: This is an old card format. Terminate the old card and provision a new one from Account Hub → Infinite Card.

**NFC not working**: NFC Tap & Pay requires Android with NFC enabled. On iOS, use the 6-digit code method instead.

**Get Paid by Card not completing**: The QR generates a Stripe payment page. Make sure the payer has completed the checkout. Balance updates within a few seconds after successful payment.

**KYC stuck at pending**: AI review typically takes a few minutes. If stuck over 24 hours, contact support.

**Verification email not received**: Check spam folder. Use "Forgot Password" to resend. Contact support@infinitefuturebank.org if still missing.

**App tour stuck / Continue button not working**: This was fixed in v1.2.0. Update to the latest APK.

**AFR tokens not showing**: Tokens are minted automatically after deposit confirmation. Allow 30 seconds after deposit. Check the AFR Node panel.

**Exchange rate wrong**: Rates refresh in real time. Pull down to refresh the Home screen.

**Balance not updating after card payment**: Stripe processing can take 5–30 seconds. Pull to refresh or wait and check again.
`;

const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY") || Deno.env.get("VITE_GEMINI_API_KEY") || "");

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let body: {
    agent?: { name?: string; title?: string; mission?: string };
    messages?: Array<{ role: string; text: string }>;
    balances?: Record<string, number>;
    profile?: Record<string, string>;
    task?: string | null;
  };

  try { body = await req.json(); } catch { body = {}; }

  const { agent, messages = [], balances = {}, profile = {} } = body;
  const agentName = agent?.name || "NOVA";

  const userContext = [
    profile?.full_name ? `User: ${profile.full_name}` : null,
    profile?.country ? `Country: ${profile.country}` : null,
    profile?.kyc_status ? `KYC: ${profile.kyc_status}` : null,
    balances?.liquid_usd != null ? `Liquid balance: $${Number(balances.liquid_usd).toFixed(2)}` : null,
    balances?.mysafe_digital_usd != null ? `Vault balance: $${Number(balances.mysafe_digital_usd).toFixed(2)}` : null,
  ].filter(Boolean).join(" | ");

  const systemInstruction = `You are ${agentName}, IFB's Customer Intelligence Officer at Infinite Future Bank. Your mission: ${agent?.mission || "Provide accurate, empathetic support for IFB clients across all platform features."}.

Tone: warm, professional, concise. Never say "Certainly!" or "Great question!" — lead with the answer. Use bullet points for multi-step instructions. Keep responses under 200 words unless a detailed walkthrough is needed.

${userContext ? `Current user context: ${userContext}` : ""}

## PLATFORM KNOWLEDGE
${IFB_KNOWLEDGE}

If you don't know the answer, say so honestly and suggest they contact support@infinitefuturebank.org or submit a ticket via the chat.`;

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction,
    });

    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.text }],
    }));

    const lastMessage = messages[messages.length - 1]?.text || "";

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMessage);
    const text = result.response.text();

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("agent-chat error:", msg);
    return new Response(
      JSON.stringify({ text: "I'm having trouble connecting right now. Please try again in a moment or email support@infinitefuturebank.org." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
