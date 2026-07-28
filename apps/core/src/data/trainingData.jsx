// src/data/trainingData.jsx
import React from 'react';
import { 
  BookOpen, Target, ShieldCheck, Lock, Landmark, TrendingUp, Zap, Network, Globe, ShieldAlert, RefreshCw
} from 'lucide-react';

export const TRAINING_MODULES = [
  // ==========================================
  // MODULE 1: INFINITE BANKING FOUNDATION
  // ==========================================
  {
    id: 'TRK1_MOD1',
    track: 'Foundations',
    title: 'Infinite Banking: The Paradigm Shift',
    icon: <BookOpen size={24}/>,
    points: 150,
    metricTarget: 'capital_readiness',
    screens: [
      { 
        type: 'statement', 
        text: 'Welcome to Infinite Banking. You are about to master financial control in the modern economy.' 
      },
      { 
        type: 'explanation', 
        title: 'What Is Infinite Banking?', 
        text: 'Infinite Banking is the absolute ability to control your money at any time, from anywhere, without restriction. It represents a massive psychological shift: moving from waiting to acting, from requesting to deciding, and from merely accessing money to truly owning control. Infinite Banking is not just about having money; it is about having control over it, at all times.' 
      },
      { 
        type: 'explanation', 
        title: 'The Failure of Traditional Systems', 
        text: 'Traditional banking systems were built for a different era. They are painfully slow, highly restricted, entirely dependent on intermediaries, and severely limited by geography. In these legacy systems, moving money is expensive, credit is unavailable to the masses, and opportunities are lost due to institutional friction. The problem is not money. The problem is access, speed, and control.' 
      },
      { 
        type: 'explanation', 
        title: 'The Shift to User-Controlled Finance', 
        text: 'We are entering a new era where individuals are no longer passive users. They are becoming operators of their own capital, participants in global economies, and decision-makers in real time. Technology now allows instant transactions and intelligent financial tools. This shift means you are no longer just a customer. You are becoming your own financial system.' 
      },
      { 
        type: 'explanation', 
        title: 'The Four Core Principles', 
        text: 'To operate effectively, Infinite Banking is built on four core principles. One: Liquidity. Your money must be available when you need it, with no delays. Two: Speed. Transactions must happen in real time, because opportunities do not wait. Three: Control. You decide how and when your money moves, not institutions. Four: Growth. Your money should never sit idle; it should continuously create value. Control, plus speed, plus liquidity, equals financial power.' 
      },
      { 
        type: 'quiz', 
        question: 'What are the four core principles of Infinite Banking?', 
        options: [
          'Waiting, Requesting, Accessing, and Saving.', 
          'Liquidity, Speed, Control, and Growth.', 
          'Credit, Debt, Interest, and Intermediaries.'
        ], 
        answer: 1 
      },
      { 
        type: 'explanation', 
        title: 'Infinite Future Bank (IFB)', 
        text: 'Infinite Future Bank is the financial infrastructure designed to operationalize Infinite Banking. Through the DEUS application, users can send and receive money instantly, interact with marketplaces, and execute agreements through smart contracts. IFB functions across borders, in real time, with full user control. IFB is not the concept; it is the physical execution of Infinite Banking.' 
      },
      { 
        type: 'explanation', 
        title: 'Your Role in the Ecosystem', 
        text: 'You are not early by chance; you are early by position. You are a participant, a connector, and a builder of a new financial reality. Every transaction strengthens the system. This system grows because you use it. To ensure long-term strength, the ecosystem operates on Trust through real activity, Transparency through clear actions, Responsibility with intention, and Growth through continuous participation.' 
      },
      { 
        type: 'quiz', 
        question: 'What is your true role within the Infinite Future Bank ecosystem?', 
        options: [
          'You are a passive customer waiting for a bank manager to approve your transactions.', 
          'You are an active participant, a connector, and a builder of a new financial reality.', 
          'You are simply a spectator holding funds in a digital wallet.'
        ], 
        answer: 1 
      },
      { 
        type: 'statement', 
        text: 'The future of finance is not something you wait for. It is something you enter, use, and shape. You are not outside the system anymore. You are inside it.' 
      }
    ]
  },

  // ==========================================
  // MODULE 2: BANKER NODE CERTIFICATION
  // ==========================================
  {
    id: 'TRK6_MOD1',
    track: 'Network Operations',
    title: 'Banker Node Certification',
    icon: <Landmark size={24}/>,
    points: 50,
    metricTarget: 'compliance_score',
    screens: [
      { 
        type: 'statement', 
        text: 'To become an IFB Banker is to become a vital pillar of local financial infrastructure. You are the bridge between digital wealth and physical reality.' 
      },
      { 
        type: 'explanation', 
        title: 'The Escrow Mechanism', 
        text: 'As a Banker, your primary role is fulfilling cash withdrawal requests for nearby users. When a user requests $100 from you, IFB immediately locks that $100 in an Escrow Smart Contract. The money cannot be spent, moved, or reversed by the user once it is locked. It is mathematically guaranteed by the protocol.' 
      },
      { 
        type: 'explanation', 
        title: 'Physical Hand-off & Safety', 
        text: 'You will arrange to meet the user in a safe, public location, or transfer the equivalent amount via local mobile money. Never, under any circumstances, hand over the physical cash until you have visually verified the user\'s identity matches their official IFB profile.' 
      },
      { 
        type: 'quiz', 
        question: 'If a user takes your cash and runs without clicking "Confirm", what happens to the digital money?', 
        options: [
          'It is lost forever in the blockchain.', 
          'It returns to the user automatically after one hour.', 
          'It remains locked in Escrow pending IFB Dispute Resolution.'
        ], 
        answer: 2 
      }
    ]
  },

  // ==========================================
  // MODULE 3: BLOCKCHAIN FUNDAMENTALS
  // ==========================================
  {
    id: 'TRK2_MOD1',
    track: 'Blockchain Foundations',
    title: 'The Architecture of Trust: Blockchain',
    icon: <Network size={24}/>,
    points: 100,
    metricTarget: 'financial_intelligence',
    screens: [
      { 
        type: 'statement', 
        text: 'Welcome to the foundation of the new internet. Let us demystify Blockchain technology.' 
      },
      { 
        type: 'explanation', 
        title: 'The Distributed Ledger', 
        text: 'Traditional banks use a centralized database. If their main server goes down, or gets hacked, your money is at risk. A blockchain, however, is a distributed ledger. This means thousands of independent computers globally, known as nodes, all hold an exact, synchronized copy of the same database. There is no single point of failure.' 
      },
      { 
        type: 'explanation', 
        title: 'Cryptography and Blocks', 
        text: 'When a transaction happens, it is mathematically sealed using advanced cryptography. It is then bundled with other transactions into a digital container called a block. This new block is permanently chained to the previous block. If a hacker tries to alter a past transaction, the mathematical link breaks, and the entire network immediately rejects the fraud.' 
      },
      { 
        type: 'example', 
        title: 'The Immutable Truth', 
        text: 'Imagine a financial record carved into stone, but duplicated ten thousand times around the world in real-time. Once a transaction is confirmed on a blockchain, it cannot be erased, edited, or hidden by any government, corporation, or CEO. This concept is called immutability. It provides the first truly trustless system of truth in human history.' 
      },
      { 
        type: 'quiz', 
        question: 'What makes a blockchain network nearly impossible to hack, alter, or shut down?', 
        options: [
          'It is protected by traditional bank security guards and locked vaults.', 
          'Transactions are cryptographically sealed and distributed across thousands of independent nodes.', 
          'The entire database is kept completely offline so hackers cannot reach it.'
        ], 
        answer: 1 
      },
      { 
        type: 'statement', 
        text: 'Protocol Mastered. You now understand the indestructible engine that powers the Infinite Future Bank.' 
      }
    ]
  },
  
  // ==========================================
  // MODULE 4: THE AFR BLOCKCHAIN 
  // ==========================================
  {
    id: 'TRK7_MOD1',
    track: 'Blockchain Infrastructure',
    title: 'The Sovereign AFR Ecosystem',
    icon: <Zap size={24}/>,
    points: 100,
    metricTarget: 'financial_intelligence',
    screens: [
      { 
        type: 'statement', 
        text: 'Welcome, friend. Let us take a journey into the beating heart of the Infinite Future Bank Network: The AFR Token.' 
      },
      { 
        type: 'explanation', 
        title: 'A Warm Welcome to True Ownership', 
        text: 'For decades, the money in your bank account hasn\'t truly been yours; it has been an IOU from an institution that can freeze it or delay your transfers. The African Financial Reserve, or AFR token, changes this entirely. It is a stabilized, AI-governed unit of absolute trust that lives directly in your pocket.' 
      },
      { 
        type: 'explanation', 
        title: 'The 1:1 Peg Mechanics', 
        text: 'Every single AFR in circulation is backed one-to-one by institutional assets held in the IFB Treasury. When you convert $100 USD into AFR, the system locks your USD in a secure vault and mathematically mints exactly 100 AFR. It is a digital reflection of your real-world wealth, designed for absolute, unwavering stability.' 
      },
      { 
        type: 'explanation', 
        title: '2-of-3 Consensus Mechanism', 
        text: 'To prevent any single point of failure or corruption, the AI Council uses a 2-of-3 Consensus mechanism. When you initiate a transfer, at least two of these independent AI agents must review your trust score, verify your ledger balance, and cryptographically sign the transaction. This ensures military-grade security without human delay.' 
      },
      { 
        type: 'quiz', 
        question: 'How does the AFR Network ensure a transaction is legitimate before it settles permanently?', 
        options: [
          'A human manager at IFB reviews every transaction manually during business hours.', 
          'The user has to upload their government ID every single time they send money.', 
          'It requires a 2-of-3 consensus vote from our independent AI Validators.'
        ], 
        answer: 2 
      }
    ]
  },

  // ==========================================
  // MODULE 5: INSTITUTIONAL FINANCE & YIELD
  // ==========================================
  {
    id: 'TRK8_MOD1',
    track: 'Financial Intelligence',
    title: 'Advanced Yield Engineering',
    icon: <TrendingUp size={24}/>,
    points: 75,
    metricTarget: 'financial_intelligence',
    screens: [
      { 
        type: 'statement', 
        text: 'Initiating Financial Intelligence Protocol. You will now learn how idle capital is engineered to grow autonomously within decentralized markets.' 
      },
      { 
        type: 'explanation', 
        title: 'The Flaw of Fractional Reserve Banking', 
        text: 'Traditional banks operate on a fractional reserve system. If you deposit $1,000, they keep $100 in the vault and lend $900 out to risk-heavy borrowers. If those borrowers default, your money is gone. Furthermore, they keep 99 percent of the interest generated. IFB fundamentally rejects this model.' 
      },
      { 
        type: 'explanation', 
        title: 'Over-Collateralized Decentralized Lending', 
        text: 'IFB utilizes Decentralized Finance lending pools. In these pools, borrowers must deposit MORE value than they borrow. If a borrower wants a $1,000 loan, they must lock up $1,500 worth of digital assets. This absolute mathematical guarantee means the lender—which is you—never loses capital.' 
      },
      { 
        type: 'quiz', 
        question: 'How do decentralized lending pools mathematically guarantee the safety of your deposited funds?', 
        options: [
          'They rely entirely on government FDIC insurance to cover any potential losses.', 
          'They require borrowers to provide over-collateralization, locking up more value than they borrow.', 
          'They hire private investigators to check the borrower\'s credit score.'
        ], 
        answer: 1 
      }
    ]
  },

  // ==========================================
  // MODULE 6: GLOBAL RISK & CRISIS MANAGEMENT
  // ==========================================
  {
    id: 'TRK9_MOD1',
    track: 'Network Security',
    title: 'Geopolitical Asset Shielding',
    icon: <ShieldAlert size={24}/>,
    points: 100,
    metricTarget: 'capital_readiness',
    screens: [
      { 
        type: 'statement', 
        text: 'Welcome to Geopolitical Asset Shielding. Physical borders and local governments should never dictate the safety of your wealth.' 
      },
      { 
        type: 'explanation', 
        title: 'The Inflation Trap', 
        text: 'In emerging markets, citizens are often forced to hold their wealth in rapidly depreciating local fiat currencies. When a government prints too much money, or when geopolitical conflict arises, the purchasing power of your life savings can evaporate in a single day. IFB provides an escape hatch. By holding AFR, your wealth is decoupled from the failures of local economic policy.' 
      },
      { 
        type: 'explanation', 
        title: 'Real-Time Threat Telemetry', 
        text: 'Through our integration with the World Disaster Center and global intelligence APIs, the IFB network constantly monitors your geographic perimeter. Whether it is a Category 4 Cyclone, civil unrest, or a sudden currency devaluation, your IFB dashboard will alert you with a 1 to 10 Risk Score.' 
      },
      { 
        type: 'example', 
        title: 'The Digital Evacuation', 
        text: 'Consider a scenario where severe political instability hits a region. Banks close their doors, and ATMs run out of physical cash. IFB users are unaffected. Because your AFR balance exists on an immutable blockchain ledger, you can cross a border with nothing but your memorized recovery phrase, log into IFB from a new country, and your wealth will be waiting for you, entirely untouched.' 
      },
      { 
        type: 'quiz', 
        question: 'Why does holding AFR protect you during a local geopolitical crisis or bank run?', 
        options: [
          'Because IFB sends physical cash to your house via armored trucks.', 
          'Because your wealth is stored on an immutable ledger, completely decoupled from local banks and physical borders.', 
          'Because AFR is legally considered a charity donation.'
        ], 
        answer: 1 
      }
    ]
  },

  // ==========================================
  // MODULE 7: AUTONOMOUS COMPLIANCE
  // ==========================================
  {
    id: 'TRK10_MOD1',
    track: 'Regulatory Infrastructure',
    title: 'AI-Driven Compliance & AML',
    icon: <ShieldCheck size={24}/>,
    points: 80,
    metricTarget: 'compliance_score',
    screens: [
      { 
        type: 'statement', 
        text: 'Initiating Regulatory Infrastructure Protocol. Discover how IFB maintains absolute legality while protecting your civil right to financial privacy.' 
      },
      { 
        type: 'explanation', 
        title: 'Anti-Money Laundering (AML)', 
        text: 'To protect the ecosystem from bad actors, IFB employs an autonomous Anti-Money Laundering engine. Unlike traditional banks that freeze accounts based on human suspicion or bias, IFB uses neural networks to scan for mathematically verifiable patterns of illicit activity, such as terror financing or human trafficking. Honest capital moves freely; corrupted capital is instantly quarantined.' 
      },
      { 
        type: 'explanation', 
        title: 'Zero-Knowledge Identity', 
        text: 'You may wonder, "If IFB monitors for crime, are they spying on my purchases?" No. IFB utilizes advanced cryptography known as Zero-Knowledge Proofs. This allows the network to mathematically verify that your funds are clean and your identity is legitimate, without actually revealing your personal data to the AI. We verify the truth of the data, without exposing the data itself.' 
      },
      { 
        type: 'quiz', 
        question: 'What technology does IFB use to ensure your funds are legal without invading your personal privacy?', 
        options: [
          'Zero-Knowledge Proofs, which verify data mathematically without exposing it.', 
          'Manual audits performed by IFB employees reading your chat history.', 
          'Publicly broadcasting all your transactions on a social media feed.'
        ], 
        answer: 0 
      }
    ]
  },

  // ==========================================
  // MODULE 8: THE WEALTH FLYWHEEL
  // ==========================================
  {
    id: 'TRK11_MOD1',
    track: 'Financial Intelligence',
    title: 'The Infinite Wealth Flywheel',
    icon: <RefreshCw size={24}/>,
    points: 120,
    metricTarget: 'financial_intelligence',
    screens: [
      { 
        type: 'statement', 
        text: 'Welcome to the final masterclass. It is time to engineer your own Infinite Wealth Flywheel.' 
      },
      { 
        type: 'explanation', 
        title: 'The Mathematics of Compounding', 
        text: 'Albert Einstein reportedly called compound interest the eighth wonder of the world. He who understands it, earns it; he who does not, pays it. When you deposit assets into the IFB Yield Engine, you do not just earn interest on your principal. You earn interest on your interest. As the algorithmic APY pays you daily, your baseline capital expands perpetually.' 
      },
      { 
        type: 'explanation', 
        title: 'Time Preference & Capital Allocation', 
        text: 'Wealth is a measurement of time preference. High time preference means spending money today on depreciating liabilities. Low time preference means locking capital in IFB Vaults today, allowing the protocol to lend it out to over-collateralized borrowers, so you can purchase assets tomorrow with the pure yield generated. The goal is to never spend your principal.' 
      },
      { 
        type: 'example', 
        title: 'The Flywheel in Motion', 
        text: 'You deposit 5,000 AFR. It generates an 8 percent yield. Over the year, it produces 400 AFR passively. Instead of withdrawing your 5,000 AFR to pay a bill, you only withdraw the 400 AFR generated by the protocol. Your original 5,000 remains untouched, working 24/7 to produce more capital for you next year. The flywheel spins forever.' 
      },
      { 
        type: 'quiz', 
        question: 'What is the core philosophy of the Infinite Wealth Flywheel?', 
        options: [
          'To spend your principal balance as fast as possible to avoid inflation.', 
          'To rely entirely on IFB Banker Nodes to give you free cash.', 
          'To never spend your principal, and only consume the yield generated by your assets.'
        ], 
        answer: 2 
      },
      { 
        type: 'statement', 
        text: 'Curriculum Mastered. You have now acquired the intelligence of a sovereign institution. The future is yours.' 
      }
    ]
  }
];