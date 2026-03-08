import { 
  BookOpen, Target, ShieldCheck, Lock, Landmark, TrendingUp, Zap
} from 'lucide-react';

export const TRAINING_MODULES = [
  // ... [Your existing modules: Cash Flow, Debt/Equity, AML, Burn Rate, Phishing, Banker Node]
  // (I am keeping one here as an example, but you will paste your original ones here too)
  {
    id: 'TRK6_MOD1',
    track: 'Network Operations',
    title: 'Banker Node Certification',
    icon: <Landmark size={18}/>,
    points: 50,
    metricTarget: 'compliance_score',
    screens: [
      { type: 'statement', text: 'To become an IFB Banker is to become a vital pillar of local financial infrastructure. You are the bridge between digital wealth and physical reality.' },
      { type: 'explanation', title: 'The Escrow Mechanism', text: 'As a Banker, your primary role is fulfilling cash withdrawal requests for nearby users. When a user requests $100 from you, IFB immediately locks that $100 in an Escrow Smart Contract. The money cannot be spent or reversed by the user once locked. It is guaranteed by the protocol.' },
      { type: 'explanation', title: 'Physical Hand-off & Safety', text: 'You will arrange to meet the user in a safe, public location, or transfer the equivalent amount via local mobile money (like Airtel Money or M-Pesa). Never hand over the physical cash or mobile money until you have visually verified the user\'s identity matches their IFB profile.' },
      { type: 'example', title: 'The Release Protocol', text: 'Scenario: You meet John. He requested $50. You verify his face. You hand him a $50 bill. HE must then click "Confirm Receipt" on his phone. Instantly, the $50 in the Escrow contract is transferred permanently into your IFB Liquid Balance.' },
      { type: 'explanation', title: 'Dispute Resolution', text: 'If a user receives the cash but refuses to click "Confirm Receipt", do not panic. The funds remain locked in Escrow. You must file an immediate dispute with IFB Support. If you used Mobile Money, provide the transaction receipt. If you met in person, IFB will review GPS logs and chat history. If fraud is detected, the user is permanently banned and your funds are released.' },
      { type: 'quiz', question: 'What must happen before you hand over physical cash to a user?', options: ['A) You must wait 24 hours', 'B) You must verify their identity matches their IFB profile', 'C) You must ask for a 10% fee'], answer: 1 },
      { type: 'quiz', question: 'If a user takes your cash and runs without clicking "Confirm", what happens to the money?', options: ['A) It is lost forever', 'B) It returns to the user automatically', 'C) It remains locked in Escrow pending IFB Dispute Resolution'], answer: 2 }
    ]
  },
  
  // 🔥 NEW: THE MASSIVE AFR BLOCKCHAIN TRAINING
  {
    id: 'TRK7_MOD1',
    track: 'Blockchain Infrastructure',
    title: 'The Sovereign AFR Ecosystem',
    icon: <Zap size={18}/>,
    points: 100,
    metricTarget: 'financial_intelligence',
    screens: [
      { type: 'statement', text: 'Welcome, friend. Let us take a journey into the beating heart of the IFB Network: The AFR Token.' },
      { type: 'explanation', title: 'A Warm Welcome to True Ownership', text: 'Grab a seat and let\'s talk about money. For decades, the money in your bank account hasn\'t truly been yours; it\'s an IOU from an institution that can freeze it, lend it, or delay it. The AFR (African Financial Reserve) token changes this dynamic entirely. It is not just a cryptocurrency; it is a stabilized, AI-governed unit of trust that lives directly in your pocket.' },
      { type: 'explanation', title: 'The 1:1 Peg Mechanics', text: 'You might be wondering, "Is this volatile like Bitcoin?" Absolutely not. Every single AFR in circulation is backed 1:1 by institutional assets in the IFB Treasury. When you convert $100 USD into AFR, the system locks your USD and mathematically mints exactly 100 AFR. It is a digital reflection of your real-world wealth, designed for absolute stability.' },
      { type: 'example', title: 'The Nairobi-London Handshake', text: 'Imagine our friend Sarah in Nairobi. She needs to pay a supplier in London. Using SWIFT, this takes 3 days, involves 3 intermediary banks, and costs a 4% fee. Using AFR, she initiates the transfer. The AI Council verifies her balance, signs the transaction, and the supplier receives the AFR in exactly 4.2 seconds. Total fee: Zero. This is the power of borderless capital.' },
      { type: 'quiz', question: 'Why is the AFR Token protected from wild price swings?', options: ['A) Because IFB tells people not to sell it', 'B) Because it is mathematically pegged 1:1 to institutional Treasury assets', 'C) Because it is traded on the stock market'], answer: 1 },
      { type: 'explanation', title: 'Meet The AI Council', text: 'Now, who runs this blockchain? Instead of relying on human bankers who sleep and make errors, AFR is governed by the "Council of Three" – our autonomous AI Validators (Alpha, Beta, and Gamma). Every time you move AFR, at least two of these independent AI agents must review your trust score, verify your balance, and cryptographically sign the transaction. We call this 2-of-3 Consensus.' },
      { type: 'explanation', title: 'The Smart Contract Shield', text: 'Because AFR is blockchain-native, it allows us to build "Smart Contracts." When you fund a loan or use the Emergency SOS fund, your AFR isn\'t just moving; it\'s being programmed. It sits in a secure digital vault (Escrow) that automatically releases funds only when the specific rules of the agreement are met. It is money that obeys code, ensuring no one can cheat the system.' },
      { type: 'quiz', question: 'How does the AFR Network ensure a transaction is legitimate before it settles?', options: ['A) A human manager at IFB reviews every transaction manually', 'B) The user has to upload their ID every time they send money', 'C) It requires a 2-of-3 consensus vote from our independent AI Validators'], answer: 2 },
      { type: 'statement', text: 'Congratulations. You now understand the architecture of sovereign wealth. You are ready to wield AFR.' }
    ]
  }
];