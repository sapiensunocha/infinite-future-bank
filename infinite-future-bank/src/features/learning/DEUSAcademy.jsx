import { useState } from 'react';
import {
  Wallet, ArrowDownCircle, ArrowUpCircle, RefreshCw, Send, CreditCard,
  TrendingUp, Heart, Bot, Shield, BookOpen, FileText, Users, Globe,
  AlertTriangle, X, ChevronRight, CheckCircle2, XCircle, ArrowLeft,
  GraduationCap, Sparkles
} from 'lucide-react';

const MODULES = [
  {
    id: 'wallet',
    icon: Wallet,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    name: 'Wallet & Balance',
    tagline: 'Your global bank account, anywhere',
    tab: 'ACCOUNTS',
    what: 'Your DEUS wallet is a multi-currency digital account that holds, sends, and receives money across borders instantly. Think of it as a bank account that works everywhere without the bureaucracy.',
    who: 'Freelancers, remote workers, diaspora families',
    scenario: `I'm a developer in Kinshasa working for a startup in San Francisco. Every month my employer sends $3,000 to my DEUS wallet. I see the balance update in seconds, no SWIFT delay, no correspondent bank. I tap "Accounts" to track every movement in real time.`,
    steps: ['Open the Accounts tab', 'View your balance in any currency', 'See incoming and outgoing transactions', 'Tap a transaction for full details'],
    solution: 'Supabase stores your balances in real time. Stripe handles incoming fiat. The system auto-reconciles across currencies using live FX rates.',
    quiz: {
      question: 'What makes a DEUS wallet different from a traditional bank account?',
      options: ['It earns no interest', 'It works globally with no SWIFT delays', 'It only works in USD'],
      answer: 1,
    },
  },
  {
    id: 'deposit',
    icon: ArrowDownCircle,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    name: 'Deposit',
    tagline: 'Top up instantly via card',
    tab: 'ACCOUNTS',
    what: `Add funds to your DEUS wallet using any Visa or Mastercard through Stripe's secure checkout. Funds appear within seconds and are ready to use immediately.`,
    who: 'Anyone needing to fund their wallet before a transfer or payment',
    scenario: `I'm about to pay a contractor in Nigeria. My wallet balance is low, so I tap Deposit, enter $500, and complete Stripe checkout on my phone. The balance updates instantly. I then send the payment without any interruption.`,
    steps: ['Go to Accounts → Deposit', 'Enter the amount in your chosen currency', 'Complete Stripe card checkout', 'Confirm the balance update in your wallet'],
    solution: 'Stripe Checkout handles PCI-compliant card processing. A Supabase Edge Function listens to the Stripe webhook and credits your wallet the moment payment succeeds.',
    quiz: {
      question: 'What payment processor powers DEUS deposits?',
      options: ['PayPal', 'Stripe', 'Square'],
      answer: 1,
    },
  },
  {
    id: 'withdraw',
    icon: ArrowUpCircle,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    name: 'Withdraw',
    tagline: 'Move money to your bank',
    tab: 'ACCOUNTS',
    what: 'Transfer funds from your DEUS wallet to any bank account worldwide. Ideal for converting digital balance into spendable cash or paying personal expenses.',
    who: 'Entrepreneurs, freelancers, NGO finance officers',
    scenario: 'My consulting firm invoiced a client through DEUS last week. The $2,000 payment landed in my wallet. Today I tap Withdraw, enter my local bank IBAN, and confirm. The transfer arrives in my bank in 1–2 business days with a clear reference.',
    steps: ['Open Accounts → Withdraw', 'Enter the destination bank account details', 'Specify the amount and currency', 'Review fees and confirm the transfer', 'Track status in your transaction history'],
    solution: 'Withdrawals route through Stripe payouts or local banking rails depending on the destination country. Supabase records the pending withdrawal and updates status via webhook.',
    quiz: {
      question: 'Where does a withdrawal send your money?',
      options: ['To another DEUS user', 'To your bank account', 'To crypto exchange'],
      answer: 1,
    },
  },
  {
    id: 'p2p',
    icon: RefreshCw,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    name: 'P2P Exchange',
    tagline: 'Swap currencies at live rates, peer-to-peer',
    tab: 'NETWORK',
    what: 'Exchange currencies directly with other DEUS users at real-time market rates — no bank markup, no hidden spread. You post what you want to swap, and a peer matches your offer.',
    who: 'Importers, exporters, diaspora, traders',
    scenario: 'I have $1,000 USD but need Congolese Francs to pay suppliers in Kinshasa. I open P2P Exchange, post an offer to swap $1,000 USD for CDF at the live rate. A peer in Congo accepts. We both get better rates than any bank or bureau de change would offer.',
    steps: ['Open P2P Exchange', 'Choose currency pair (e.g. USD → CDF)', 'Post your offer or accept an existing one', 'Confirm the swap — funds transfer instantly on match'],
    solution: 'DEUS maintains an order book in Supabase. When two orders match, a server-side function atomically debits one wallet and credits the other, with zero float risk.',
    quiz: {
      question: 'What is the main advantage of P2P currency exchange over a bank?',
      options: ['Slower processing', 'No bank markup on the exchange rate', 'Requires a credit check'],
      answer: 1,
    },
  },
  {
    id: 'pay',
    icon: Send,
    color: 'text-sky-600',
    bg: 'bg-sky-50',
    name: 'Pay / Send Money',
    tagline: 'Pay anyone, anywhere by email or link',
    tab: 'ACCOUNTS',
    what: 'Send money instantly to any DEUS user by their email address, or via a unique payment link you share. No bank details needed — just an email or a tap.',
    who: 'Freelancers splitting costs, families supporting relatives, businesses paying contractors',
    scenario: `My team of four split the cost of a co-working space. I tap Pay, enter each person's email, split the $400 bill equally, and confirm. Each teammate gets $100 deducted or credited in seconds — no cash collection, no awkward chasing.`,
    steps: ['Open Pay / Send Money', 'Enter recipient email or paste a payment link', 'Enter amount and optional note', 'Review and confirm — money moves instantly'],
    solution: 'Supabase resolves the recipient email to a wallet ID. The transaction is recorded atomically — debit sender, credit receiver — with a push notification to both parties.',
    quiz: {
      question: 'What do you need to send money via the Pay feature?',
      options: ['Bank account number and SWIFT code', 'Recipient\'s DEUS email or payment link', 'A physical check'],
      answer: 1,
    },
  },
  {
    id: 'payme',
    icon: CreditCard,
    color: 'text-pink-600',
    bg: 'bg-pink-50',
    name: 'PayMe Card',
    tagline: 'Your personal payment request link',
    tab: 'ACCOUNTS',
    what: `Generate a shareable payment link or QR code that lets anyone pay you instantly — no account required on their end. It's your digital invoice page.`,
    who: 'Freelancers, small businesses, event organizers, tutors',
    scenario: `I'm a graphic designer and just finished a logo for a client. Instead of emailing a bank transfer form, I open PayMe Card, set the amount to $350, add a note "Logo Design – April", and copy the link. I paste it in WhatsApp. The client clicks, pays by card. Done.`,
    steps: ['Open PayMe Card', 'Enter the amount and a description', 'Generate your payment link or QR code', 'Share via WhatsApp, email, or any channel', 'Get notified and see funds in your wallet'],
    solution: 'Each PayMe link is a unique Stripe Payment Link tied to your DEUS wallet. When the payer completes checkout, the webhook credits your wallet and marks the request fulfilled.',
    quiz: {
      question: 'Does the person paying via a PayMe Card link need a DEUS account?',
      options: ['Yes, mandatory', 'No, they can pay by card directly', 'Only if they use a phone'],
      answer: 1,
    },
  },
  {
    id: 'venturex',
    icon: TrendingUp,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    name: 'VentureX',
    tagline: 'Raise capital or invest in startups',
    tab: 'INVEST',
    what: 'VentureX is a deal marketplace where entrepreneurs post investment opportunities and investors browse, commit capital, and track returns — all within DEUS. A Virtual CFO AI agent assists with deal structuring.',
    who: 'Startup founders, angel investors, venture-minded individuals',
    scenario: `I'm building an agri-tech platform in Rwanda and need $50,000 in seed funding. I create a VentureX deal listing with my pitch deck, financials, and equity offer. Three investors on the platform review it and commit a combined $45,000. The Virtual CFO agent helps me structure the term sheet and model the cap table.`,
    steps: ['Open VentureX under Invest', 'Entrepreneurs: post a deal with pitch details and funding target', 'Investors: browse deals, filter by sector/stage', 'Commit funds and sign digital term sheet', 'Track capital raises and portfolio returns in your dashboard'],
    solution: 'Deals are stored in Supabase with row-level security per investor. Commitments trigger escrow logic. The Virtual CFO is powered by an AI agent that reads deal data and gives structured financial advice.',
    quiz: {
      question: 'Which of these is a use case for VentureX?',
      options: ['Paying a utility bill', 'An entrepreneur raising seed funding from investors', 'Buying foreign currency'],
      answer: 1,
    },
  },
  {
    id: 'npo',
    icon: Heart,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    name: 'NPO Hub',
    tagline: 'Run your nonprofit, receive donations, report impact',
    tab: 'ORGANIZE',
    what: 'NPO Hub gives nonprofits a financial home: accept donations, manage program budgets, publish impact reports, and engage donors — all inside DEUS with full audit trails.',
    who: 'NGO directors, community foundations, humanitarian organizations',
    scenario: 'I run an education NGO in DRC. Through NPO Hub I publish our school-feeding program page with photos and goals. A donor in Belgium clicks "Donate $100." The funds land in our NPO wallet tagged to that program. I post a monthly impact report showing 200 meals served. The donor gets notified and donates again.',
    steps: ['Open NPO Hub under Organize', 'Create your NPO profile and program pages', 'Share your donation link with supporters', 'Receive and track donations by program', 'Post impact updates to keep donors engaged'],
    solution: 'Supabase stores NPO profiles, programs, and transactions with full audit logs. Stripe handles donation checkout. An AI assistant helps draft impact summaries from program data.',
    quiz: {
      question: 'What can donors see after giving through NPO Hub?',
      options: ['Nothing — donations are anonymous', 'Impact reports published by the NPO', 'The NPO\'s private bank statements'],
      answer: 1,
    },
  },
  {
    id: 'pascaline',
    icon: Bot,
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    name: 'Pascaline AI',
    tagline: 'Your AI private banker, available 24/7',
    tab: 'ACCOUNTS',
    what: 'Pascaline is an AI financial advisor built into DEUS. She analyzes your wallet, cash flow, and goals to give personalized advice on savings, investments, and financial decisions — like having a private banker in your pocket.',
    who: 'Anyone making financial decisions: first-time investors, business owners, families',
    scenario: `I have $5,000 sitting in my wallet and I'm unsure whether to invest in bonds or real estate. I open Pascaline, type my question. She reviews my transaction history, asks two follow-up questions about my risk appetite and time horizon, then gives a detailed recommendation with pros, cons, and suggested next steps.`,
    steps: ['Open the Pascaline AI chat', 'Ask any financial question in plain language', 'Share context: goals, timeline, risk tolerance', 'Receive a personalized, structured recommendation', 'Follow up to refine the plan'],
    solution: 'Pascaline combines a large language model with access to your DEUS financial data (with permission). She can also underwrite loan applications and flag cash flow risks before they become problems.',
    quiz: {
      question: 'What makes Pascaline AI different from a generic chatbot?',
      options: ['She only answers yes/no questions', 'She has access to your actual DEUS financial data to give personalized advice', 'She requires a monthly subscription'],
      answer: 1,
    },
  },
  {
    id: 'insurance',
    icon: Shield,
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    name: 'Insurance',
    tagline: 'Protect your income and contracts',
    tab: 'ORGANIZE',
    what: 'Access financial protection products directly inside DEUS — from contract insurance to income protection. Coverage is tied to your DEUS activity, making underwriting faster and fairer.',
    who: 'Freelancers, small business owners, project-based workers',
    scenario: 'I landed a $20,000 contract and the client wants a performance bond to prove I can deliver. Through DEUS Insurance, I apply for contract insurance, submit my DEUS transaction history as proof of track record, and receive a policy in 24 hours. Both parties sign digitally and the deal closes.',
    steps: ['Open Insurance under Organize', 'Browse available protection products', 'Select a plan and submit your application', 'Your DEUS history is used for fast underwriting', 'Download your policy and share it as needed'],
    solution: 'Insurance products are sourced from partner insurers integrated via API. Your DEUS transaction history serves as a verified financial passport, reducing underwriting time from weeks to hours.',
    quiz: {
      question: 'How does your DEUS activity help when applying for insurance?',
      options: ['It has no effect', 'It serves as a financial track record for faster underwriting', 'It automatically pays your premiums'],
      answer: 1,
    },
  },
  {
    id: 'training',
    icon: BookOpen,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    name: 'Training',
    tagline: 'Build your financial literacy',
    tab: 'ORGANIZE',
    what: 'The Training section offers structured financial education — from budgeting basics to advanced investment theory. Courses are short, practical, and tied to real DEUS features.',
    who: 'First-time investors, students, anyone new to formal finance',
    scenario: `I'm 24 and just started my first job. I heard about stocks but have no idea where to start. I open Training, pick "Investing 101", and complete 5 short lessons over my lunch breaks. By the end I understand P/E ratios, diversification, and how to read a fund factsheet. I feel confident opening a VentureX investor account.`,
    steps: ['Open Training under Organize', 'Browse courses by topic or skill level', 'Complete lessons at your own pace', 'Take short quizzes to test understanding', 'Earn a completion badge for each course'],
    solution: 'Course content is curated by IFB financial experts and stored in Supabase. Progress syncs across devices. Completion badges are recorded on your DEUS profile as a verified credential.',
    quiz: {
      question: 'What type of content does the Training section provide?',
      options: ['Movies and entertainment', 'Structured financial education courses', 'Legal advice'],
      answer: 1,
    },
  },
  {
    id: 'contracts',
    icon: FileText,
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
    name: 'Smart Contracts',
    tagline: 'Milestone-based escrow payment agreements',
    tab: 'ORGANIZE',
    what: 'Create legally structured payment agreements where funds are held in escrow and released automatically when agreed milestones are confirmed — protecting both parties in any transaction.',
    who: 'Freelancers, clients, project managers, service providers',
    scenario: `I'm a web developer hired to build a platform in three phases. Instead of chasing payments, my client and I create a Smart Contract: $3,000 locked in escrow, released in thirds after each phase I mark complete and the client approves. Phase 1 done? $1,000 releases instantly. No disputes, no delays.`,
    steps: ['Open Smart Contracts', 'Define the parties, milestones, and amounts', 'Client funds the escrow', 'Complete each milestone and request release', 'Client confirms → funds released automatically'],
    solution: 'DEUS escrow is managed server-side in Supabase with immutable audit logs. Each milestone release requires dual confirmation (provider + client). Dispute resolution routes to DEUS support with full evidence trail.',
    quiz: {
      question: 'When are funds released in a DEUS Smart Contract?',
      options: ['Immediately when the contract is created', 'When agreed milestones are confirmed by both parties', 'Only after 30 days'],
      answer: 1,
    },
  },
  {
    id: 'payroll',
    icon: Users,
    color: 'text-lime-600',
    bg: 'bg-lime-50',
    name: 'Payroll',
    tagline: 'Pay your team on schedule, automatically',
    tab: 'ORGANIZE',
    what: 'Set up recurring payroll runs for your team — contractors, employees, or partners. Define amounts, currencies, and schedules, then let DEUS handle the rest.',
    who: 'Startup founders, SME owners, project managers',
    scenario: 'I run a 5-person remote startup. Every 1st of the month I used to manually send five separate transfers. Now I set up payroll in DEUS: each team member, their amount, currency, and the 1st-of-month schedule. DEUS runs payroll automatically. My team gets paid on time, I get a summary report, and I never forget.',
    steps: ['Open Payroll under Organize', 'Add team members with wallet or email', 'Set salary, currency, and payment frequency', 'Fund your payroll wallet', 'Review auto-generated payroll runs and approve'],
    solution: 'Payroll schedules are stored in Supabase and triggered by a cron job on the scheduled date. Each run is an atomic batch of wallet transfers with per-person receipts generated automatically.',
    quiz: {
      question: 'What does DEUS Payroll automate?',
      options: ['Hiring decisions', 'Recurring salary transfers on a set schedule', 'Employee performance reviews'],
      answer: 1,
    },
  },
  {
    id: 'capital',
    icon: TrendingUp,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    name: 'Capital Network',
    tagline: 'Borrow and lend, peer to peer',
    tab: 'NETWORK',
    what: 'The Capital Network is a P2P lending marketplace where individuals and businesses can borrow from or lend to the DEUS community — with transparent terms and AI-assisted credit scoring.',
    who: 'Entrepreneurs needing short-term capital, savers wanting yield',
    scenario: 'I need $2,000 to stock inventory before a big order ships. My bank loan would take 3 weeks. I post a Capital Network request: $2,000 at 8% for 60 days. Three lenders fund it within 48 hours. I get the capital, ship the order, and repay with interest. Lenders earn a return, I get the cash I need.',
    steps: ['Open Capital Network under Network', 'Post a borrowing request with amount, rate, and purpose', 'Lenders review and fund your request', 'Funds arrive in your wallet', 'Repay on schedule — tracked automatically'],
    solution: 'DEUS uses your transaction history and Pascaline AI to generate a credit risk score shown to lenders. Repayments are scheduled as automatic wallet debits. Defaults are flagged and escalated per the loan agreement.',
    quiz: {
      question: 'How does DEUS assess creditworthiness for Capital Network loans?',
      options: ['By your social media followers', 'Using your transaction history and AI-generated credit score', 'By your physical collateral only'],
      answer: 1,
    },
  },
  {
    id: 'lifestyle',
    icon: Globe,
    color: 'text-fuchsia-600',
    bg: 'bg-fuchsia-50',
    name: 'Global Lifestyle',
    tagline: 'Access services wherever you are in the world',
    tab: 'NETWORK',
    what: 'Global Lifestyle connects DEUS users to curated global services — travel, accommodation, professional services — payable directly from their DEUS wallet in any currency.',
    who: 'Frequent travelers, digital nomads, expats',
    scenario: `I'm in Dubai for a week and need to book a co-working space and a translator for a business meeting. Through Global Lifestyle I find verified providers, compare prices in my home currency, and pay directly from my DEUS wallet. No currency conversion headache, no foreign card fees.`,
    steps: ['Open Global Lifestyle under Network', 'Browse services by category and location', 'Select a provider and see pricing in your currency', 'Pay from your DEUS wallet', 'Access booking confirmation and provider contact'],
    solution: 'Lifestyle services are sourced from a verified partner network. Payments route through the DEUS wallet with real-time FX conversion. All bookings generate a Supabase record for dispute resolution.',
    quiz: {
      question: 'Which currency do you use to pay for Global Lifestyle services?',
      options: ['Only USD', 'Whatever currency is in your DEUS wallet', 'Cash only'],
      answer: 1,
    },
  },
  {
    id: 'sos',
    icon: AlertTriangle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    name: 'Emergency SOS',
    tagline: 'Emergency financial assistance when it matters',
    tab: 'ORGANIZE',
    what: 'Emergency SOS provides rapid financial assistance for genuine emergencies — stranded travelers, medical crises, disaster relief. Requests are reviewed by AI for immediate triage and human agents for approval.',
    who: 'Travelers, families with relatives abroad, anyone facing a sudden financial crisis',
    scenario: `My passport and wallet were stolen in Nairobi. I'm stuck with no cash and a flight in 6 hours. I open DEUS SOS, submit an emergency request with my situation and ID. An AI agent triages it as genuine within minutes. A human agent approves an emergency advance of $200. Funds hit my wallet. I take the flight home.`,
    steps: ['Open Emergency SOS', 'Describe your emergency and submit supporting details', 'AI agent triages and prioritizes your request', 'Human agent reviews and approves', 'Emergency funds arrive in your wallet'],
    solution: `SOS requests are routed to a priority queue in Supabase. Pascaline AI pre-screens for authenticity and urgency. Approved advances are funded from an IFB emergency reserve and repaid against the user's next deposit.`,
    quiz: {
      question: 'Who reviews and approves Emergency SOS requests?',
      options: ['Only automated bots with no human oversight', 'An AI agent for triage plus a human agent for final approval', 'Other DEUS users voting on your case'],
      answer: 1,
    },
  },
];

export default function DEUSAcademy({ onClose }) {
  const [activeModule, setActiveModule] = useState(null);
  const [quizAnswer, setQuizAnswer] = useState(null);

  const handleClose = () => onClose && onClose(null);
  const handleTryIt = (tab) => onClose && onClose(tab);

  const openModule = (mod) => {
    setActiveModule(mod);
    setQuizAnswer(null);
  };

  const backToGrid = () => {
    setActiveModule(null);
    setQuizAnswer(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl p-4">
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            {activeModule && (
              <button
                onClick={backToGrid}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors mr-1"
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4 text-slate-600" />
              </button>
            )}
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 leading-tight">DEUS Academy</h1>
              <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Learn · Practice · Master</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {!activeModule ? (
            <GridView modules={MODULES} onSelect={openModule} />
          ) : (
            <DetailView module={activeModule} quizAnswer={quizAnswer} setQuizAnswer={setQuizAnswer} onTryIt={handleTryIt} />
          )}
        </div>
      </div>
    </div>
  );
}

function GridView({ modules, onSelect }) {
  return (
    <div className="p-8">
      <div className="mb-6">
        <p className="text-slate-500 font-bold text-sm">
          <span className="text-blue-600 font-black">{modules.length} features</span> — tap any to learn how it works with real-life context.
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <button
              key={mod.id}
              onClick={() => onSelect(mod)}
              className="group text-left bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-200"
            >
              <div className={`w-10 h-10 ${mod.bg} rounded-2xl flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${mod.color}`} />
              </div>
              <p className="font-black text-slate-900 text-sm leading-tight mb-1">{mod.name}</p>
              <p className="text-xs font-bold text-slate-400 leading-snug mb-3">{mod.tagline}</p>
              <span className="inline-flex items-center gap-1 text-xs font-black text-blue-600 group-hover:gap-2 transition-all">
                Explore <ChevronRight className="w-3 h-3" />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DetailView({ module, quizAnswer, setQuizAnswer, onTryIt }) {
  const Icon = module.icon;
  const isCorrect = quizAnswer === module.quiz.answer;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Feature header */}
      <div className="flex items-center gap-4 mb-8">
        <div className={`w-14 h-14 ${module.bg} rounded-3xl flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-7 h-7 ${module.color}`} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900">{module.name}</h2>
          <p className="text-sm font-bold text-slate-400">{module.tagline}</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* What it is */}
        <Section title="What it is">
          <p className="text-slate-700 font-bold text-sm leading-relaxed">{module.what}</p>
        </Section>

        {/* Who uses it */}
        <Section title="Who uses it">
          <span className="inline-block bg-slate-100 text-slate-700 font-black text-xs px-3 py-1 rounded-full">
            {module.who}
          </span>
        </Section>

        {/* Real-life scenario */}
        <Section title="Real-life scenario">
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <div className="flex gap-3">
              <Sparkles className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-slate-700 font-bold text-sm leading-relaxed italic">"{module.scenario}"</p>
            </div>
          </div>
        </Section>

        {/* How to use it */}
        <Section title="How to use it">
          <ol className="space-y-2">
            {module.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-slate-700 font-bold text-sm leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </Section>

        {/* The solution behind it */}
        <Section title="The solution behind it">
          <p className="text-slate-600 font-bold text-sm leading-relaxed">{module.solution}</p>
        </Section>

        {/* Try it button */}
        <button
          onClick={() => onTryIt(module.tab)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-sm py-4 rounded-2xl transition-colors flex items-center justify-center gap-2"
        >
          Try {module.name} now
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Quiz */}
        <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6">
          <p className="font-black text-slate-900 text-sm mb-4">
            Quick check: {module.quiz.question}
          </p>
          <div className="space-y-2">
            {module.quiz.options.map((opt, i) => {
              const selected = quizAnswer === i;
              const correct = i === module.quiz.answer;
              let style = 'bg-white border border-slate-200 text-slate-700';
              if (quizAnswer !== null) {
                if (correct) style = 'bg-emerald-50 border border-emerald-300 text-emerald-800';
                else if (selected) style = 'bg-red-50 border border-red-300 text-red-700';
              }
              return (
                <button
                  key={i}
                  disabled={quizAnswer !== null}
                  onClick={() => setQuizAnswer(i)}
                  className={`w-full text-left px-4 py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-between gap-2 ${style} ${quizAnswer === null ? 'hover:border-blue-300 hover:bg-blue-50' : ''}`}
                >
                  <span>{opt}</span>
                  {quizAnswer !== null && correct && <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                  {quizAnswer !== null && selected && !correct && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
          {quizAnswer !== null && (
            <p className={`mt-4 text-sm font-black ${isCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
              {isCorrect ? 'Correct! You got it.' : `Not quite — the correct answer is: "${module.quiz.options[module.quiz.answer]}"`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{title}</h3>
      {children}
    </div>
  );
}
