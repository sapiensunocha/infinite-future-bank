import { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, X, Award, CheckCircle2,
  ArrowDownCircle, ArrowUpCircle, Send, QrCode, Link as LinkIcon,
  CreditCard, Smartphone, Globe, FileText, History, ShieldCheck,
  Star, Banknote, Wifi, Receipt, Search, Download, RefreshCw,
  AlertCircle, ArrowRight, Lock, Zap
} from 'lucide-react';

// ─── CONTENT (14 slides × 3 languages) ───────────────────────────────────────

const CONTENT = {
  en: {
    prev: 'Previous', next: 'Next',
    slides: [
      {
        stage: 'Overview', icon: 'star',
        title: 'The Complete DEUS Transaction Guide',
        subtitle: 'From your first deposit to international withdrawals — every transaction type explained in full detail.',
        body: 'DEUS gives you a complete financial toolkit: receive money, pay anyone, issue invoices, accept card payments, send internationally, and manage your full transaction history — all from one platform.',
        features: [
          'Deposit via bank transfer, card, or mobile money',
          'Send instantly to any DEUS account, or externally via SWIFT',
          'Receive via IBAN, QR code, or payment link',
          'Accept payments with Tap to Pay or virtual terminal',
          'Withdraw to any bank account worldwide',
          'Full transaction history with PDF/CSV export',
        ],
      },
      {
        stage: 'Stage 1 · Deposit', icon: 'deposit',
        title: 'Depositing Funds Into Your DEUS Account',
        subtitle: 'Add money to your account via bank transfer, debit/credit card, or mobile money.',
        features: [
          'Bank transfer (SWIFT / local rails) — free, 1–3 business days',
          'Card deposit (Visa / Mastercard) — instant, 1.5% fee',
          'Mobile money integration in supported markets',
          'Minimum deposit: $10 USD equivalent',
        ],
        details: [
          'Open DEUS → Banking → tap "Deposit"',
          'Choose your funding method: Bank Transfer, Card, or Mobile Money',
          'Enter the amount and currency you wish to deposit',
          'For bank transfer: use your dedicated DEUS IBAN as the destination',
          'For card: enter card details securely — funds appear instantly',
          'Confirmation email and in-app notification sent on receipt',
        ],
        scenario: 'Aminata wired $2,000 from her Citibank account to her DEUS IBAN on Monday morning — the funds appeared in DEUS by Tuesday afternoon.',
        tip: 'Bank transfers are always free. Save your DEUS IBAN in your external bank as a frequent payee to make future deposits in seconds.',
      },
      {
        stage: 'Stage 2 · Send (IFB to IFB)', icon: 'send',
        title: 'Sending Money Between DEUS Accounts',
        subtitle: 'Instant, fee-free transfers to any other IFB account holder — 24/7, including weekends.',
        features: [
          'Instant settlement — recipient sees funds in real-time',
          'Zero fees for IFB-to-IFB transfers',
          'Search by name, email address, or IFB ID',
          'Optional reference note and receipt generation',
        ],
        details: [
          'Go to Payments → Send Money',
          'Search the recipient by name, email, or their IFB ID',
          'Enter the amount and an optional note (e.g. "Invoice #045")',
          'Review the transfer summary — check name and amount carefully',
          'Confirm with your PIN or biometric (Face ID / fingerprint)',
          'Transfer completes instantly — both parties receive a notification',
        ],
        scenario: 'Kofi needed to pay his Lagos-based supplier Jean-Pierre $850 at 11pm on a Sunday. Jean-Pierre\'s DEUS account was credited within 3 seconds.',
        tip: 'Always verify the recipient\'s name displayed before confirming. Once sent, instant transfers cannot be reversed.',
      },
      {
        stage: 'Stage 3 · Send (External Bank)', icon: 'external',
        title: 'Sending to Any External Bank Account',
        subtitle: 'Transfer funds from DEUS to any bank account worldwide using SWIFT or local payment rails.',
        features: [
          'SWIFT wire transfers to 180+ countries',
          'Local rails for faster domestic transfers in supported markets',
          'Multi-currency: send in 30+ currencies',
          'Transparent fee and exchange rate shown before you confirm',
        ],
        details: [
          'Go to Payments → Bank Transfer',
          'Enter recipient bank details: name, IBAN or account number, SWIFT/BIC code',
          'Select the destination currency and amount',
          'DEUS shows the exact exchange rate and total fee upfront',
          'Review and confirm — processing takes 1–3 business days',
          'Save the recipient as a "Beneficiary" for faster future transfers',
        ],
        scenario: 'A Dakar-based trading company sent €12,000 to their German supplier via SWIFT — the transfer was confirmed within 2 business days with a full receipt in DEUS.',
        tip: 'Save frequently-used external accounts as Beneficiaries. For large or recurring FX transfers, contact support to negotiate a fixed exchange rate.',
      },
      {
        stage: 'Stage 4 · Receive Money', icon: 'receive',
        title: 'Receiving Money From Anyone, Anywhere',
        subtitle: 'Your DEUS account has a unique IBAN, QR code, and shareable payment link — share whichever is most convenient.',
        features: [
          'Dedicated IBAN accepted by all banks worldwide (SWIFT)',
          'Personal QR code for instant in-person payments',
          'Shareable payment link — payer does not need a DEUS account',
          'Real-time notification when funds arrive',
        ],
        details: [
          'Find your IBAN: Banking → Account Details → copy or share IBAN',
          'For QR payments: Payments → Receive → Show QR Code',
          'For payment links: Payments → Payment Links → Create Link (set amount + expiry)',
          'Share your link via WhatsApp, email, or any channel',
          'All incoming transfers appear instantly in your transaction history',
          'Download a PDF receipt for any incoming payment',
        ],
        scenario: 'Maria attended a trade fair in Abidjan. She displayed her DEUS QR code on her phone — 12 buyers paid her a total of $4,800 during the day without any cash exchanged.',
        tip: 'Your DEUS IBAN works exactly like any regular bank account. Anyone with a bank account — regardless of country — can wire money to it.',
      },
      {
        stage: 'Stage 5 · QR Code Payments', icon: 'qr',
        title: 'Pay and Get Paid with One Scan',
        subtitle: 'Generate a QR code to request payment, or scan any DEUS QR to pay instantly — no cash, no card required.',
        features: [
          'Static QR (no amount set) — payer enters amount',
          'Dynamic QR (pre-set amount) — one scan confirms exact payment',
          'Works between any two DEUS accounts in seconds',
          'Automatic receipt generated after each QR payment',
        ],
        details: [
          'To receive: Payments → Receive → QR Code → optionally set a fixed amount',
          'Display QR on screen or print it for your counter/stall',
          'To pay: Payments → Scan QR → point camera at the merchant\'s QR code',
          'Amount and recipient name are confirmed on screen before payment',
          'Tap "Pay" — confirmed with PIN or biometric',
          'Both parties receive an instant receipt notification',
        ],
        scenario: 'A market vendor in Dakar printed her QR code and taped it to her stall. Customers scan and pay for produce in seconds — she ends each day with zero cash handling.',
        tip: 'Use dynamic QR codes (with a pre-set amount) for fixed-price products — it eliminates errors and speeds up checkout to under 5 seconds.',
      },
      {
        stage: 'Stage 6 · Payment Links', icon: 'link',
        title: 'Request Money with a Shareable Link',
        subtitle: 'Create a secure payment link and share it anywhere. Your client pays with their own card — no DEUS account needed.',
        features: [
          'Payer uses any Visa / Mastercard — no DEUS account required',
          'Set a specific amount, description, and expiry date',
          'Share via WhatsApp, email, SMS, or social media',
          'Funds credited to your DEUS account instantly on payment',
        ],
        details: [
          'Go to Payments → Payment Links → New Link',
          'Enter the amount, a description (e.g. "Web design — Invoice 12"), and expiry date',
          'Tap "Generate Link" — a unique secure URL is created',
          'Copy and share the link via any channel you prefer',
          'Payer opens the link in any browser, enters their card details, and pays',
          'You receive instant notification and the funds appear in your balance',
        ],
        scenario: 'A Lagos-based freelancer sent a $3,500 payment link via WhatsApp to a UK client. The client paid with their Barclays card in 2 minutes — no bank details shared, no waiting.',
        tip: 'Always set an expiry date on payment links for security. Create a new link for each transaction rather than reusing old ones.',
      },
      {
        stage: 'Stage 7 · PayMe Card', icon: 'card',
        title: 'Your DEUS Debit Card — Virtual & Physical',
        subtitle: 'Spend your DEUS balance anywhere Visa/Mastercard is accepted — online or in-store, anywhere in the world.',
        features: [
          'Virtual card: available instantly after KYC — use for online purchases',
          'Physical card: delivered in 5–7 business days',
          'Freeze / unfreeze instantly from the app',
          'Set daily spending limits and merchant-category controls',
        ],
        details: [
          'Request your card: Banking → Cards → Request Card',
          'Virtual card details (number, expiry, CVV) appear immediately after approval',
          'Use virtual card on any website — copy details or add to Apple/Google Pay',
          'Physical card arrives by post — activate it in the app on arrival',
          'To freeze: Banking → Cards → select card → Freeze',
          'View all card transactions separately under Banking → Cards → History',
        ],
        scenario: 'An entrepreneur used her virtual DEUS card to pay for AWS cloud hosting, a Canva subscription, and a hotel booking in Dubai — all charged in their local currencies, converted automatically.',
        tip: 'Freeze your card immediately in the app if you suspect it has been compromised. This takes 2 seconds and blocks all new transactions instantly.',
      },
      {
        stage: 'Stage 8 · Tap to Pay', icon: 'nfc',
        title: 'Accept Card Payments — Phone as Terminal',
        subtitle: 'Turn your smartphone into a professional payment terminal. Accept any contactless card or mobile wallet — no hardware needed.',
        features: [
          'Accepts Visa, Mastercard, Apple Pay, Google Pay',
          'No external hardware — uses your phone\'s NFC chip',
          'Available on NFC-enabled Android phones and iPhone (iOS 17+)',
          'Funds settled to your DEUS account next business day',
        ],
        details: [
          'Enable Tap to Pay: Payments → Terminal → Enable Tap to Pay',
          'Enter the charge amount and tap "Ready to Accept Payment"',
          'Ask the customer to tap their card, phone, or watch on the back of your device',
          'DEUS confirms the payment — a receipt is sent to both parties',
          'Transaction appears in your history under Payments → Terminal History',
          'Funds batch-settle to your DEUS account each business day',
        ],
        scenario: 'A food truck operator in Nairobi disabled his cash-only policy. He now accepts all card payments on his Android phone — turnover increased 40% in the first month.',
        tip: 'Tap to Pay works best when the customer holds their card flat and still against the back of your phone for 1–2 seconds. Encourage them to keep the card in place until they hear the confirmation sound.',
      },
      {
        stage: 'Stage 9 · International Transfers', icon: 'globe',
        title: 'Send and Receive in 30+ Currencies',
        subtitle: 'Cross-border payments with transparent exchange rates, low fees, and real-time tracking — to 180+ countries.',
        features: [
          'Send in the recipient\'s local currency — DEUS handles conversion',
          'Mid-market exchange rate shown before you confirm',
          'SWIFT and local network routing for fastest delivery',
          'Track transfer status in real-time from your history',
        ],
        details: [
          'Go to Payments → International Transfer',
          'Select the destination country and recipient currency',
          'Enter amount — DEUS instantly shows converted amount, exchange rate, and fee',
          'Add recipient bank details or select a saved Beneficiary',
          'Confirm — DEUS routes via SWIFT or local rail for fastest settlement',
          'Receive status updates: Initiated → Processing → Delivered',
        ],
        scenario: 'A Kenyan importer paid a Chinese supplier CNY 280,000. DEUS converted from KES at the mid-market rate with a 0.5% fee — saving $800 compared to their previous bank\'s spread.',
        tip: 'For recurring international payments (e.g. monthly supplier payments), save the beneficiary and the recurring amount — each future transfer takes under 30 seconds.',
      },
      {
        stage: 'Stage 10 · Invoicing', icon: 'invoice',
        title: 'Create and Send Professional Invoices',
        subtitle: 'Generate branded invoices inside DEUS, send to clients by email or link, and track payment status in real-time.',
        features: [
          'Branded invoices with your company logo and details',
          'Add line items, quantities, taxes, and discount codes',
          'Send by email or shareable link — client pays online',
          'Track status: Draft → Sent → Viewed → Paid → Overdue',
        ],
        details: [
          'Go to Payments → Invoices → New Invoice',
          'Add your client\'s name, email, and billing address',
          'Add line items: description, quantity, unit price, tax rate',
          'Set payment due date and optional late fee',
          'Send directly by email — DEUS attaches a PDF and a "Pay Now" button',
          'Client pays online with card — funds deposited to your DEUS balance instantly',
        ],
        scenario: 'A consulting firm in Lagos sends 60 invoices per month through DEUS. Clients click "Pay Now" and settle online — the team receives payment 3x faster than with traditional bank invoicing.',
        tip: 'Set up recurring invoices for monthly retainer clients — DEUS automatically sends and tracks them every billing cycle without any manual action.',
      },
      {
        stage: 'Stage 11 · Withdrawal', icon: 'withdraw',
        title: 'Withdraw Your Balance to Any Bank Account',
        subtitle: 'Move your DEUS funds to any external bank account — locally or internationally — quickly and securely.',
        features: [
          'Withdraw to any saved or new bank account',
          'Free for most local withdrawals; small fee for international',
          'Processing time: 1–2 business days (local), 2–3 (international)',
          'Minimum withdrawal: $10 USD equivalent',
        ],
        details: [
          'Go to Banking → Withdraw',
          'Select a saved bank account or add a new one (IBAN, sort code, or account number)',
          'Enter the withdrawal amount in your preferred currency',
          'DEUS shows the exact fee and estimated arrival date',
          'Confirm with your PIN or biometric — withdrawal is submitted',
          'Track status under Banking → History — you\'ll receive an alert on completion',
        ],
        scenario: 'After receiving a $9,000 client payment, David withdrew $7,500 to his Standard Chartered account in Accra. Funds arrived in 2 business days with a $4 flat fee.',
        tip: 'Save your primary bank account as a "Default Withdrawal Account" — future withdrawals pre-fill the details and are confirmed in one tap.',
      },
      {
        stage: 'Stage 12 · Transaction History', icon: 'history',
        title: 'Track, Search, and Export Every Transaction',
        subtitle: 'Your complete financial record — filter by date, type, amount, or currency, and export for accounting in seconds.',
        features: [
          'Full history: deposits, sends, receives, card payments, withdrawals',
          'Filter by date range, transaction type, currency, or amount',
          'Click any transaction for full details, receipt, and reference number',
          'Export as PDF (statement) or CSV (for accounting software)',
        ],
        details: [
          'Go to Banking → Transaction History',
          'Use filters: Date Range, Type (deposit/send/receive/withdrawal), Currency, Amount',
          'Search by recipient name, reference number, or amount',
          'Click any entry to view full details — amount, exchange rate, fees, timestamp, status',
          'Tap "Download Receipt" to save a PDF receipt for a specific transaction',
          'Tap "Export Statement" to download the full period as PDF or CSV',
        ],
        scenario: 'An auditor asked for 12 months of transaction records. The CFO opened DEUS History, set the date range, and downloaded a complete CSV in 45 seconds — no bank branch visit required.',
        tip: 'Tag transactions with internal categories (Payroll, Supplier, Marketing, Tax) as they happen — monthly reconciliation becomes 10× faster.',
      },
      {
        stage: 'Summary', icon: 'check',
        title: 'You Now Know Every Transaction on DEUS',
        subtitle: 'From your first deposit to cross-border withdrawals — you have the complete picture.',
        body: 'Take the assessment below to test your knowledge across all 12 transaction modules. Earn your IFB Transaction Guide certificate on completion.',
        features: [
          'Deposit: bank transfer (free), card (instant), mobile money',
          'Send: IFB-to-IFB (instant, free) · External bank (SWIFT, 1–3 days)',
          'Receive: IBAN · QR code · payment link',
          'Pay: QR code · card · Tap to Pay NFC terminal',
          'International: 30+ currencies, transparent rates, 180+ countries',
          'Invoicing: branded, trackable, online payment button',
          'Withdrawal: any bank, 1–3 days, low fees',
          'History: full records, filters, PDF/CSV export',
        ],
        cta: true,
        buttons: ['Download App', 'Open DEUS', 'Contact Support'],
      },
    ],
  },

  fr: {
    prev: 'Précédent', next: 'Suivant',
    slides: [
      {
        stage: 'Aperçu', icon: 'star',
        title: 'Le Guide Complet des Transactions DEUS',
        subtitle: 'Du premier dépôt aux virements internationaux — chaque type de transaction expliqué en détail.',
        body: 'DEUS vous offre une boîte à outils financière complète : recevoir de l\'argent, payer n\'importe qui, émettre des factures, accepter les paiements par carte, envoyer à l\'international et gérer votre historique — tout depuis une seule plateforme.',
        features: [
          'Dépôt par virement bancaire, carte ou mobile money',
          'Envoi instantané vers tout compte DEUS ou via SWIFT',
          'Réception via IBAN, QR code ou lien de paiement',
          'Accepter les paiements par Tap to Pay ou terminal virtuel',
          'Retrait vers tout compte bancaire mondial',
          'Historique complet avec export PDF/CSV',
        ],
      },
      {
        stage: 'Étape 1 · Dépôt', icon: 'deposit',
        title: 'Déposer des Fonds sur Votre Compte DEUS',
        subtitle: 'Ajoutez de l\'argent via virement bancaire, carte ou mobile money.',
        features: [
          'Virement bancaire (SWIFT / rails locaux) — gratuit, 1–3 jours ouvrés',
          'Dépôt par carte (Visa / Mastercard) — instantané, frais de 1,5 %',
          'Intégration mobile money dans les marchés pris en charge',
          'Dépôt minimum : 10 USD équivalent',
        ],
        details: [
          'Ouvrez DEUS → Banque → appuyez sur "Déposer"',
          'Choisissez la méthode : Virement bancaire, Carte ou Mobile Money',
          'Entrez le montant et la devise souhaitée',
          'Pour virement : utilisez votre IBAN DEUS comme destination',
          'Pour carte : saisissez les informations de façon sécurisée — fonds immédiats',
          'Confirmation par email et notification in-app à la réception',
        ],
        scenario: 'Aminata a viré 2 000 $ depuis son compte Citibank vers son IBAN DEUS un lundi matin — les fonds sont apparus dans DEUS le mardi après-midi.',
        tip: 'Les virements bancaires sont toujours gratuits. Enregistrez votre IBAN DEUS dans votre banque externe comme bénéficiaire fréquent pour des dépôts futurs en quelques secondes.',
      },
      {
        stage: 'Étape 2 · Envoi (IFB à IFB)', icon: 'send',
        title: 'Envoyer de l\'Argent entre Comptes DEUS',
        subtitle: 'Transferts instantanés et sans frais vers tout titulaire de compte IFB — 24h/24, 7j/7.',
        features: [
          'Règlement instantané — le destinataire voit les fonds en temps réel',
          'Zéro frais pour les transferts IFB-à-IFB',
          'Recherche par nom, adresse email ou identifiant IFB',
          'Note de référence optionnelle et génération de reçu',
        ],
        details: [
          'Allez dans Paiements → Envoyer de l\'argent',
          'Recherchez le destinataire par nom, email ou identifiant IFB',
          'Entrez le montant et une note optionnelle (ex. : "Facture #045")',
          'Vérifiez le récapitulatif — vérifiez le nom et le montant attentivement',
          'Confirmez avec votre code PIN ou biométrique (Face ID / empreinte)',
          'Le transfert s\'effectue instantanément — les deux parties reçoivent une notification',
        ],
        scenario: 'Kofi a dû payer son fournisseur basé à Lagos, Jean-Pierre, 850 $ à 23h un dimanche. Le compte DEUS de Jean-Pierre a été crédité en 3 secondes.',
        tip: 'Vérifiez toujours le nom du destinataire affiché avant de confirmer. Une fois envoyés, les transferts instantanés ne peuvent pas être annulés.',
      },
      {
        stage: 'Étape 3 · Envoi (Banque Externe)', icon: 'external',
        title: 'Envoyer vers Tout Compte Bancaire Externe',
        subtitle: 'Transférez des fonds depuis DEUS vers n\'importe quel compte bancaire mondial via SWIFT ou rails locaux.',
        features: [
          'Virements SWIFT vers plus de 180 pays',
          'Rails locaux pour des transferts domestiques plus rapides',
          'Multi-devises : envoi dans plus de 30 devises',
          'Frais et taux de change affichés avant confirmation',
        ],
        details: [
          'Allez dans Paiements → Virement Bancaire',
          'Saisissez les coordonnées bancaires : nom, IBAN ou numéro de compte, code SWIFT/BIC',
          'Sélectionnez la devise de destination et le montant',
          'DEUS affiche le taux de change exact et les frais totaux à l\'avance',
          'Vérifiez et confirmez — traitement sous 1 à 3 jours ouvrés',
          'Enregistrez le destinataire comme "Bénéficiaire" pour les prochains transferts',
        ],
        scenario: 'Une société commerciale de Dakar a envoyé 12 000 € à son fournisseur allemand via SWIFT — le transfert a été confirmé en 2 jours ouvrés avec un reçu complet dans DEUS.',
        tip: 'Enregistrez les comptes externes fréquents comme Bénéficiaires. Pour des virements FX importants ou récurrents, contactez le support pour négocier un taux fixe.',
      },
      {
        stage: 'Étape 4 · Recevoir de l\'Argent', icon: 'receive',
        title: 'Recevoir de l\'Argent de N\'importe Où',
        subtitle: 'Votre compte DEUS possède un IBAN unique, un QR code et un lien de paiement partageable.',
        features: [
          'IBAN dédié accepté par toutes les banques mondiales (SWIFT)',
          'QR code personnel pour les paiements instantanés en personne',
          'Lien de paiement partageable — le payeur n\'a pas besoin de compte DEUS',
          'Notification en temps réel à l\'arrivée des fonds',
        ],
        details: [
          'Trouvez votre IBAN : Banque → Détails du Compte → copier ou partager',
          'Pour paiements QR : Paiements → Recevoir → Afficher QR Code',
          'Pour liens de paiement : Paiements → Liens de Paiement → Créer un lien',
          'Partagez via WhatsApp, email ou tout canal',
          'Tous les transferts entrants apparaissent instantanément dans votre historique',
          'Téléchargez un reçu PDF pour tout paiement entrant',
        ],
        scenario: 'Maria participait à un salon commercial à Abidjan. Elle affichait son QR code DEUS — 12 acheteurs lui ont payé un total de 4 800 $ dans la journée sans aucun échange d\'espèces.',
        tip: 'Votre IBAN DEUS fonctionne exactement comme un compte bancaire ordinaire. Quiconque possède un compte bancaire peut vous virer de l\'argent, quel que soit le pays.',
      },
      {
        stage: 'Étape 5 · Paiements QR', icon: 'qr',
        title: 'Payer et Être Payé d\'un Simple Scan',
        subtitle: 'Générez un QR code pour demander un paiement, ou scannez celui d\'un autre compte DEUS pour payer instantanément.',
        features: [
          'QR statique (sans montant) — le payeur saisit le montant',
          'QR dynamique (montant prédéfini) — un scan confirme le paiement exact',
          'Fonctionne entre deux comptes DEUS en quelques secondes',
          'Reçu automatique généré après chaque paiement QR',
        ],
        details: [
          'Pour recevoir : Paiements → Recevoir → QR Code → définir un montant fixe (optionnel)',
          'Affichez le QR sur écran ou imprimez-le pour votre comptoir/stand',
          'Pour payer : Paiements → Scanner QR → pointez l\'appareil photo sur le QR du marchand',
          'Le montant et le nom du destinataire sont confirmés à l\'écran avant le paiement',
          'Appuyez sur "Payer" — confirmé avec PIN ou biométrique',
          'Les deux parties reçoivent une notification de reçu instantanée',
        ],
        scenario: 'Une vendeuse à Dakar a imprimé son QR code et l\'a affiché sur son stand. Les clients scannent et paient en quelques secondes — elle termine chaque journée sans manipulation d\'espèces.',
        tip: 'Utilisez des QR dynamiques (avec montant prédéfini) pour les produits à prix fixe — cela élimine les erreurs et réduit le temps de caisse à moins de 5 secondes.',
      },
      {
        stage: 'Étape 6 · Liens de Paiement', icon: 'link',
        title: 'Demander de l\'Argent via un Lien Partageable',
        subtitle: 'Créez un lien de paiement sécurisé et partagez-le n\'importe où. Votre client paie avec sa propre carte — sans compte DEUS requis.',
        features: [
          'Le payeur utilise n\'importe quelle Visa / Mastercard — sans compte DEUS',
          'Définissez un montant précis, une description et une date d\'expiration',
          'Partagez via WhatsApp, email, SMS ou réseaux sociaux',
          'Fonds crédités instantanément sur votre compte DEUS',
        ],
        details: [
          'Allez dans Paiements → Liens de Paiement → Nouveau Lien',
          'Entrez le montant, une description (ex. : "Design Web — Facture 12") et la date d\'expiration',
          'Appuyez sur "Générer le Lien" — une URL sécurisée unique est créée',
          'Copiez et partagez le lien via le canal de votre choix',
          'Le payeur ouvre le lien dans n\'importe quel navigateur, saisit ses coordonnées de carte et paie',
          'Vous recevez une notification instantanée et les fonds apparaissent dans votre solde',
        ],
        scenario: 'Une freelance de Lagos a envoyé un lien de paiement de 3 500 $ via WhatsApp à un client anglais. Le client a payé avec sa carte Barclays en 2 minutes — aucune coordonnée bancaire partagée.',
        tip: 'Définissez toujours une date d\'expiration sur les liens de paiement pour la sécurité. Créez un nouveau lien pour chaque transaction plutôt que de réutiliser les anciens.',
      },
      {
        stage: 'Étape 7 · Carte PayMe', icon: 'card',
        title: 'Votre Carte de Débit DEUS — Virtuelle et Physique',
        subtitle: 'Utilisez votre solde DEUS partout où Visa/Mastercard est accepté — en ligne ou en magasin, dans le monde entier.',
        features: [
          'Carte virtuelle : disponible immédiatement après le KYC',
          'Carte physique : livrée en 5 à 7 jours ouvrés',
          'Gel / dégel instantané depuis l\'application',
          'Définissez des plafonds de dépenses et des contrôles par catégorie de marchand',
        ],
        details: [
          'Demandez votre carte : Banque → Cartes → Demander une Carte',
          'Les détails de la carte virtuelle (numéro, expiration, CVV) apparaissent immédiatement',
          'Utilisez la carte virtuelle sur tout site web — copiez les détails ou ajoutez à Apple/Google Pay',
          'La carte physique arrive par courrier — activez-la dans l\'application à réception',
          'Pour geler : Banque → Cartes → sélectionnez la carte → Geler',
          'Consultez toutes les transactions par carte sous Banque → Cartes → Historique',
        ],
        scenario: 'Une entrepreneuse a utilisé sa carte DEUS virtuelle pour payer l\'hébergement AWS, un abonnement Canva et une réservation d\'hôtel à Dubaï — tout facturé en devises locales, converti automatiquement.',
        tip: 'Gelez votre carte immédiatement dans l\'application si vous pensez qu\'elle a été compromise. Cela prend 2 secondes et bloque instantanément toutes les nouvelles transactions.',
      },
      {
        stage: 'Étape 8 · Tap to Pay', icon: 'nfc',
        title: 'Accepter les Paiements — Votre Téléphone comme Terminal',
        subtitle: 'Transformez votre smartphone en terminal de paiement professionnel. Acceptez toute carte ou portefeuille mobile sans matériel supplémentaire.',
        features: [
          'Accepte Visa, Mastercard, Apple Pay, Google Pay',
          'Aucun matériel externe — utilise la puce NFC de votre téléphone',
          'Disponible sur Android NFC et iPhone (iOS 17+)',
          'Fonds réglés sur votre compte DEUS le prochain jour ouvré',
        ],
        details: [
          'Activez Tap to Pay : Paiements → Terminal → Activer Tap to Pay',
          'Saisissez le montant à facturer et appuyez sur "Prêt à accepter le paiement"',
          'Demandez au client de toucher sa carte, son téléphone ou sa montre au dos de votre appareil',
          'DEUS confirme le paiement — un reçu est envoyé aux deux parties',
          'La transaction apparaît dans votre historique sous Paiements → Historique Terminal',
          'Les fonds sont réglés par lot sur votre compte DEUS chaque jour ouvré',
        ],
        scenario: 'Un gérant de food truck à Nairobi a abandonné sa politique espèces uniquement. Il accepte désormais tous les paiements par carte sur son Android — son chiffre d\'affaires a augmenté de 40 % le premier mois.',
        tip: 'Tap to Pay fonctionne mieux quand le client tient sa carte à plat et immobile contre le dos de votre téléphone pendant 1 à 2 secondes jusqu\'au son de confirmation.',
      },
      {
        stage: 'Étape 9 · Transferts Internationaux', icon: 'globe',
        title: 'Envoyer et Recevoir dans Plus de 30 Devises',
        subtitle: 'Paiements transfrontaliers avec taux de change transparents, faibles frais et suivi en temps réel — vers plus de 180 pays.',
        features: [
          'Envoyez dans la devise locale du destinataire — DEUS gère la conversion',
          'Taux de change affiché avant confirmation',
          'Routage SWIFT et réseau local pour livraison la plus rapide',
          'Suivi du statut du transfert en temps réel',
        ],
        details: [
          'Allez dans Paiements → Transfert International',
          'Sélectionnez le pays de destination et la devise du destinataire',
          'Entrez le montant — DEUS affiche instantanément le montant converti, le taux et les frais',
          'Ajoutez les coordonnées bancaires ou sélectionnez un Bénéficiaire enregistré',
          'Confirmez — DEUS route via SWIFT ou rail local pour un règlement optimal',
          'Recevez des mises à jour de statut : Initié → En cours → Livré',
        ],
        scenario: 'Un importateur kényan a payé 280 000 CNY à un fournisseur chinois. DEUS a converti depuis KES au taux mid-market avec 0,5 % de frais — économisant 800 $ par rapport aux frais de sa banque précédente.',
        tip: 'Pour les paiements internationaux récurrents (ex. : fournisseur mensuel), enregistrez le bénéficiaire et le montant récurrent — chaque futur transfert prend moins de 30 secondes.',
      },
      {
        stage: 'Étape 10 · Facturation', icon: 'invoice',
        title: 'Créer et Envoyer des Factures Professionnelles',
        subtitle: 'Générez des factures avec votre marque dans DEUS, envoyez-les par email ou lien, et suivez le statut de paiement en temps réel.',
        features: [
          'Factures à votre image avec logo et coordonnées',
          'Ajoutez des lignes, quantités, taxes et remises',
          'Envoyez par email ou lien partageable — le client paie en ligne',
          'Suivez : Brouillon → Envoyée → Vue → Payée → En retard',
        ],
        details: [
          'Allez dans Paiements → Factures → Nouvelle Facture',
          'Ajoutez le nom du client, email et adresse de facturation',
          'Ajoutez des lignes : description, quantité, prix unitaire, taux de TVA',
          'Définissez la date d\'échéance et les pénalités de retard optionnelles',
          'Envoyez par email — DEUS joint un PDF et un bouton "Payer maintenant"',
          'Le client paie en ligne par carte — fonds déposés sur votre solde DEUS instantanément',
        ],
        scenario: 'Un cabinet de conseil à Lagos envoie 60 factures par mois via DEUS. Les clients cliquent sur "Payer maintenant" — le cabinet reçoit les paiements 3× plus vite qu\'avec la facturation bancaire classique.',
        tip: 'Mettez en place des factures récurrentes pour vos clients sous contrat de retainer — DEUS les envoie et les suit automatiquement à chaque cycle de facturation.',
      },
      {
        stage: 'Étape 11 · Retrait', icon: 'withdraw',
        title: 'Retirer Votre Solde vers Tout Compte Bancaire',
        subtitle: 'Transférez vos fonds DEUS vers tout compte bancaire externe — localement ou internationalement.',
        features: [
          'Retrait vers tout compte bancaire enregistré ou nouveau',
          'Gratuit pour la plupart des retraits locaux ; petits frais à l\'international',
          'Délai : 1 à 2 jours ouvrés (local), 2 à 3 (international)',
          'Retrait minimum : 10 USD équivalent',
        ],
        details: [
          'Allez dans Banque → Retirer',
          'Sélectionnez un compte bancaire enregistré ou ajoutez-en un nouveau',
          'Entrez le montant du retrait dans la devise de votre choix',
          'DEUS affiche les frais exacts et la date d\'arrivée estimée',
          'Confirmez avec votre PIN ou biométrique — le retrait est soumis',
          'Suivez le statut sous Banque → Historique — alerte à la réception',
        ],
        scenario: 'Après avoir reçu 9 000 $ d\'un client, David a retiré 7 500 $ sur son compte Standard Chartered à Accra. Les fonds sont arrivés en 2 jours ouvrés avec des frais fixes de 4 $.',
        tip: 'Enregistrez votre compte bancaire principal comme "Compte de Retrait par Défaut" — les futurs retraits sont préremplis et confirmés en un seul appui.',
      },
      {
        stage: 'Étape 12 · Historique', icon: 'history',
        title: 'Suivre, Rechercher et Exporter Chaque Transaction',
        subtitle: 'Votre dossier financier complet — filtrez par date, type, montant ou devise, et exportez pour la comptabilité en quelques secondes.',
        features: [
          'Historique complet : dépôts, envois, réceptions, paiements, retraits',
          'Filtrez par plage de dates, type, devise ou montant',
          'Cliquez sur n\'importe quelle transaction pour les détails et le reçu',
          'Exportez en PDF (relevé) ou CSV (pour logiciel comptable)',
        ],
        details: [
          'Allez dans Banque → Historique des Transactions',
          'Utilisez les filtres : Plage de Dates, Type, Devise, Montant',
          'Recherchez par nom du destinataire, numéro de référence ou montant',
          'Cliquez sur une entrée pour voir tous les détails — montant, taux, frais, horodatage, statut',
          'Appuyez sur "Télécharger le Reçu" pour un reçu PDF d\'une transaction spécifique',
          'Appuyez sur "Exporter le Relevé" pour télécharger la période complète en PDF ou CSV',
        ],
        scenario: 'Un auditeur a demandé 12 mois de transactions. La DG a ouvert l\'Historique DEUS, défini la plage de dates et téléchargé un CSV complet en 45 secondes — sans visite en agence bancaire.',
        tip: 'Étiquetez les transactions avec des catégories internes (Salaires, Fournisseur, Marketing, Taxe) au fur et à mesure — le rapprochement mensuel devient 10 fois plus rapide.',
      },
      {
        stage: 'Résumé', icon: 'check',
        title: 'Vous Maîtrisez Désormais Toutes les Transactions DEUS',
        subtitle: 'Du premier dépôt aux retraits transfrontaliers — vous avez une vision complète.',
        body: 'Passez l\'évaluation ci-dessous pour tester vos connaissances sur les 12 modules de transaction. Obtenez votre certificat IFB à la fin.',
        features: [
          'Dépôt : virement bancaire (gratuit), carte (instantané), mobile money',
          'Envoi : IFB-à-IFB (instantané, gratuit) · Banque externe (SWIFT, 1–3 jours)',
          'Réception : IBAN · QR code · lien de paiement',
          'Paiement : QR code · carte · Terminal Tap to Pay NFC',
          'International : 30+ devises, taux transparents, 180+ pays',
          'Facturation : à votre image, traçable, bouton de paiement en ligne',
          'Retrait : toute banque, 1–3 jours, faibles frais',
          'Historique : records complets, filtres, export PDF/CSV',
        ],
        cta: true,
        buttons: ['Télécharger l\'App', 'Ouvrir DEUS', 'Contacter le Support'],
      },
    ],
  },

  es: {
    prev: 'Anterior', next: 'Siguiente',
    slides: [
      {
        stage: 'Descripción General', icon: 'star',
        title: 'La Guía Completa de Transacciones DEUS',
        subtitle: 'Desde tu primer depósito hasta retiros internacionales — cada tipo de transacción explicado con todo detalle.',
        body: 'DEUS te ofrece un conjunto completo de herramientas financieras: recibir dinero, pagar a cualquiera, emitir facturas, aceptar pagos con tarjeta, enviar internacionalmente y gestionar tu historial completo — todo desde una sola plataforma.',
        features: [
          'Depósito por transferencia bancaria, tarjeta o dinero móvil',
          'Envío instantáneo a cualquier cuenta DEUS o por SWIFT',
          'Recepción por IBAN, código QR o enlace de pago',
          'Aceptar pagos con Tap to Pay o terminal virtual',
          'Retiro a cualquier cuenta bancaria del mundo',
          'Historial completo de transacciones con exportación PDF/CSV',
        ],
      },
      {
        stage: 'Etapa 1 · Depósito', icon: 'deposit',
        title: 'Depositar Fondos en Tu Cuenta DEUS',
        subtitle: 'Añade dinero a tu cuenta por transferencia bancaria, tarjeta de débito/crédito o dinero móvil.',
        features: [
          'Transferencia bancaria (SWIFT / redes locales) — gratuita, 1–3 días hábiles',
          'Depósito con tarjeta (Visa / Mastercard) — instantáneo, comisión del 1,5 %',
          'Integración de dinero móvil en mercados compatibles',
          'Depósito mínimo: 10 USD equivalente',
        ],
        details: [
          'Abre DEUS → Banca → toca "Depositar"',
          'Elige tu método de financiación: Transferencia bancaria, Tarjeta o Dinero Móvil',
          'Ingresa el monto y la moneda que deseas depositar',
          'Para transferencia: usa tu IBAN DEUS dedicado como destino',
          'Para tarjeta: ingresa los datos de forma segura — fondos disponibles al instante',
          'Se envía confirmación por email y notificación en la app al recibirse los fondos',
        ],
        scenario: 'Aminata transfirió $2,000 desde su cuenta Citibank a su IBAN DEUS un lunes por la mañana — los fondos aparecieron en DEUS el martes por la tarde.',
        tip: 'Las transferencias bancarias siempre son gratuitas. Guarda tu IBAN DEUS en tu banco externo como beneficiario frecuente para hacer depósitos futuros en segundos.',
      },
      {
        stage: 'Etapa 2 · Envío (IFB a IFB)', icon: 'send',
        title: 'Enviar Dinero entre Cuentas DEUS',
        subtitle: 'Transferencias instantáneas y sin comisiones a cualquier titular de cuenta IFB — 24/7, incluso fines de semana.',
        features: [
          'Liquidación instantánea — el destinatario ve los fondos en tiempo real',
          'Sin comisiones para transferencias IFB a IFB',
          'Busca por nombre, correo electrónico o ID de IFB',
          'Nota de referencia opcional y generación de recibo',
        ],
        details: [
          'Ve a Pagos → Enviar Dinero',
          'Busca al destinatario por nombre, email o ID IFB',
          'Ingresa el monto y una nota opcional (ej. "Factura #045")',
          'Revisa el resumen de la transferencia — verifica nombre y monto cuidadosamente',
          'Confirma con tu PIN o biométrico (Face ID / huella)',
          'La transferencia se completa al instante — ambas partes reciben una notificación',
        ],
        scenario: 'Kofi necesitaba pagar a su proveedor en Lagos, Jean-Pierre, $850 a las 11pm de un domingo. La cuenta DEUS de Jean-Pierre fue acreditada en 3 segundos.',
        tip: 'Siempre verifica el nombre del destinatario mostrado antes de confirmar. Una vez enviadas, las transferencias instantáneas no pueden revertirse.',
      },
      {
        stage: 'Etapa 3 · Envío (Banco Externo)', icon: 'external',
        title: 'Enviar a Cualquier Cuenta Bancaria Externa',
        subtitle: 'Transfiere fondos desde DEUS a cualquier cuenta bancaria del mundo usando SWIFT o redes de pago locales.',
        features: [
          'Transferencias SWIFT a más de 180 países',
          'Redes locales para transferencias domésticas más rápidas',
          'Multidivisa: envía en más de 30 monedas',
          'Comisión y tipo de cambio exactos mostrados antes de confirmar',
        ],
        details: [
          'Ve a Pagos → Transferencia Bancaria',
          'Ingresa los datos bancarios del destinatario: nombre, IBAN o número de cuenta, código SWIFT/BIC',
          'Selecciona la moneda de destino y el monto',
          'DEUS muestra el tipo de cambio exacto y la comisión total por anticipado',
          'Revisa y confirma — procesamiento en 1 a 3 días hábiles',
          'Guarda al destinatario como "Beneficiario" para futuras transferencias rápidas',
        ],
        scenario: 'Una empresa comercial de Dakar envió €12,000 a su proveedor alemán vía SWIFT — la transferencia fue confirmada en 2 días hábiles con un recibo completo en DEUS.',
        tip: 'Guarda las cuentas externas frecuentes como Beneficiarios. Para transferencias FX grandes o recurrentes, contacta al soporte para negociar un tipo de cambio fijo.',
      },
      {
        stage: 'Etapa 4 · Recibir Dinero', icon: 'receive',
        title: 'Recibir Dinero de Cualquier Persona, en Cualquier Lugar',
        subtitle: 'Tu cuenta DEUS tiene un IBAN único, código QR y enlace de pago compartible — comparte el más conveniente.',
        features: [
          'IBAN dedicado aceptado por todos los bancos del mundo (SWIFT)',
          'Código QR personal para pagos instantáneos en persona',
          'Enlace de pago compartible — el pagador no necesita cuenta DEUS',
          'Notificación en tiempo real cuando lleguen los fondos',
        ],
        details: [
          'Encuentra tu IBAN: Banca → Datos de Cuenta → copiar o compartir',
          'Para pagos QR: Pagos → Recibir → Mostrar Código QR',
          'Para enlaces de pago: Pagos → Enlaces de Pago → Crear Enlace',
          'Comparte por WhatsApp, email o cualquier canal',
          'Todas las transferencias entrantes aparecen al instante en tu historial',
          'Descarga un recibo PDF de cualquier pago entrante',
        ],
        scenario: 'María asistió a una feria comercial en Abidján. Mostró su código QR DEUS — 12 compradores le pagaron un total de $4,800 durante el día sin intercambiar efectivo.',
        tip: 'Tu IBAN DEUS funciona exactamente como cualquier cuenta bancaria normal. Cualquier persona con una cuenta bancaria — independientemente del país — puede transferirte dinero.',
      },
      {
        stage: 'Etapa 5 · Pagos con Código QR', icon: 'qr',
        title: 'Pagar y Cobrar con un Solo Escaneo',
        subtitle: 'Genera un código QR para solicitar un pago, o escanea el de cualquier cuenta DEUS para pagar al instante.',
        features: [
          'QR estático (sin monto) — el pagador ingresa el monto',
          'QR dinámico (monto preestablecido) — un escaneo confirma el pago exacto',
          'Funciona entre dos cuentas DEUS en segundos',
          'Recibo automático generado tras cada pago QR',
        ],
        details: [
          'Para recibir: Pagos → Recibir → Código QR → definir monto fijo (opcional)',
          'Muestra el QR en pantalla o imprímelo para tu mostrador/puesto',
          'Para pagar: Pagos → Escanear QR → apunta la cámara al QR del comerciante',
          'Monto y nombre del destinatario confirmados en pantalla antes del pago',
          'Toca "Pagar" — confirmado con PIN o biométrico',
          'Ambas partes reciben una notificación de recibo instantánea',
        ],
        scenario: 'Una vendedora en Dakar imprimió su código QR y lo pegó en su puesto. Los clientes escanean y pagan productos en segundos — termina cada día sin manipular efectivo.',
        tip: 'Usa códigos QR dinámicos (con monto preestablecido) para productos de precio fijo — elimina errores y reduce el tiempo de cobro a menos de 5 segundos.',
      },
      {
        stage: 'Etapa 6 · Enlaces de Pago', icon: 'link',
        title: 'Solicitar Dinero con un Enlace Compartible',
        subtitle: 'Crea un enlace de pago seguro y compártelo donde quieras. Tu cliente paga con su propia tarjeta — sin necesidad de cuenta DEUS.',
        features: [
          'El pagador usa cualquier Visa / Mastercard — sin cuenta DEUS requerida',
          'Define un monto específico, descripción y fecha de vencimiento',
          'Comparte por WhatsApp, email, SMS o redes sociales',
          'Fondos acreditados al instante en tu cuenta DEUS',
        ],
        details: [
          'Ve a Pagos → Enlaces de Pago → Nuevo Enlace',
          'Ingresa el monto, descripción (ej. "Diseño web — Factura 12") y fecha de vencimiento',
          'Toca "Generar Enlace" — se crea una URL segura única',
          'Copia y comparte el enlace por el canal que prefieras',
          'El pagador abre el enlace en cualquier navegador, ingresa sus datos de tarjeta y paga',
          'Recibes notificación instantánea y los fondos aparecen en tu saldo',
        ],
        scenario: 'Una freelancer de Lagos envió un enlace de pago de $3,500 por WhatsApp a un cliente en el Reino Unido. El cliente pagó con su tarjeta Barclays en 2 minutos — sin compartir datos bancarios.',
        tip: 'Siempre establece una fecha de vencimiento en los enlaces de pago por seguridad. Crea un nuevo enlace para cada transacción en vez de reutilizar los anteriores.',
      },
      {
        stage: 'Etapa 7 · Tarjeta PayMe', icon: 'card',
        title: 'Tu Tarjeta de Débito DEUS — Virtual y Física',
        subtitle: 'Usa tu saldo DEUS en cualquier lugar donde se acepte Visa/Mastercard — en línea o en tienda, en todo el mundo.',
        features: [
          'Tarjeta virtual: disponible inmediatamente tras el KYC',
          'Tarjeta física: entregada en 5 a 7 días hábiles',
          'Congelar / descongelar al instante desde la app',
          'Establece límites de gasto y controles por categoría de comercio',
        ],
        details: [
          'Solicita tu tarjeta: Banca → Tarjetas → Solicitar Tarjeta',
          'Los datos de la tarjeta virtual (número, vencimiento, CVV) aparecen inmediatamente',
          'Usa la tarjeta virtual en cualquier sitio web — copia los datos o añade a Apple/Google Pay',
          'La tarjeta física llega por correo — actívala en la app al recibirla',
          'Para congelar: Banca → Tarjetas → selecciona la tarjeta → Congelar',
          'Consulta todas las transacciones con tarjeta en Banca → Tarjetas → Historial',
        ],
        scenario: 'Una empresaria usó su tarjeta virtual DEUS para pagar el hosting de AWS, una suscripción a Canva y una reserva de hotel en Dubái — todo facturado en monedas locales, convertido automáticamente.',
        tip: 'Congela tu tarjeta inmediatamente en la app si sospechas que ha sido comprometida. Esto tarda 2 segundos y bloquea al instante todas las nuevas transacciones.',
      },
      {
        stage: 'Etapa 8 · Tap to Pay', icon: 'nfc',
        title: 'Aceptar Pagos — Tu Teléfono como Terminal',
        subtitle: 'Convierte tu smartphone en un terminal de pago profesional. Acepta cualquier tarjeta o billetera móvil — sin hardware adicional.',
        features: [
          'Acepta Visa, Mastercard, Apple Pay, Google Pay',
          'Sin hardware externo — usa el chip NFC de tu teléfono',
          'Disponible en Android con NFC e iPhone (iOS 17+)',
          'Fondos liquidados en tu cuenta DEUS el siguiente día hábil',
        ],
        details: [
          'Activa Tap to Pay: Pagos → Terminal → Activar Tap to Pay',
          'Ingresa el monto a cobrar y toca "Listo para aceptar pago"',
          'Pide al cliente que acerque su tarjeta, teléfono o reloj a la parte trasera de tu dispositivo',
          'DEUS confirma el pago — se envía recibo a ambas partes',
          'La transacción aparece en tu historial en Pagos → Historial Terminal',
          'Los fondos se liquidan por lotes en tu cuenta DEUS cada día hábil',
        ],
        scenario: 'Un operador de food truck en Nairobi eliminó su política de solo efectivo. Ahora acepta todos los pagos con tarjeta en su Android — su facturación aumentó un 40 % en el primer mes.',
        tip: 'Tap to Pay funciona mejor cuando el cliente mantiene su tarjeta plana e inmóvil contra la parte trasera de tu teléfono durante 1 a 2 segundos hasta escuchar el sonido de confirmación.',
      },
      {
        stage: 'Etapa 9 · Transferencias Internacionales', icon: 'globe',
        title: 'Enviar y Recibir en Más de 30 Monedas',
        subtitle: 'Pagos transfronterizos con tipos de cambio transparentes, bajas comisiones y seguimiento en tiempo real — a más de 180 países.',
        features: [
          'Envía en la moneda local del destinatario — DEUS gestiona la conversión',
          'Tipo de cambio de mercado mostrado antes de confirmar',
          'Enrutamiento SWIFT y red local para entrega más rápida',
          'Sigue el estado de la transferencia en tiempo real',
        ],
        details: [
          'Ve a Pagos → Transferencia Internacional',
          'Selecciona el país de destino y la moneda del destinatario',
          'Ingresa el monto — DEUS muestra al instante el monto convertido, tipo y comisión',
          'Añade datos bancarios del destinatario o selecciona un Beneficiario guardado',
          'Confirma — DEUS enruta por SWIFT o red local para liquidación óptima',
          'Recibe actualizaciones de estado: Iniciada → En proceso → Entregada',
        ],
        scenario: 'Un importador keniata pagó CNY 280,000 a un proveedor chino. DEUS convirtió desde KES al tipo de cambio de mercado con un 0,5 % de comisión — ahorrando $800 comparado con su banco anterior.',
        tip: 'Para pagos internacionales recurrentes (ej. proveedor mensual), guarda el beneficiario y el monto recurrente — cada transferencia futura tarda menos de 30 segundos.',
      },
      {
        stage: 'Etapa 10 · Facturación', icon: 'invoice',
        title: 'Crear y Enviar Facturas Profesionales',
        subtitle: 'Genera facturas con tu marca dentro de DEUS, envíalas por email o enlace, y sigue el estado de pago en tiempo real.',
        features: [
          'Facturas con tu logo y datos de empresa',
          'Añade líneas, cantidades, impuestos y descuentos',
          'Envía por email o enlace compartible — el cliente paga en línea',
          'Sigue el estado: Borrador → Enviada → Vista → Pagada → Vencida',
        ],
        details: [
          'Ve a Pagos → Facturas → Nueva Factura',
          'Añade nombre del cliente, email y dirección de facturación',
          'Añade líneas: descripción, cantidad, precio unitario, tasa de impuesto',
          'Establece fecha de vencimiento y penalización por mora opcional',
          'Envía por email — DEUS adjunta un PDF y un botón "Pagar Ahora"',
          'El cliente paga en línea con tarjeta — fondos depositados en tu saldo DEUS al instante',
        ],
        scenario: 'Una firma consultora en Lagos envía 60 facturas al mes por DEUS. Los clientes hacen clic en "Pagar Ahora" — la firma recibe pagos 3 veces más rápido que con la facturación bancaria tradicional.',
        tip: 'Configura facturas recurrentes para clientes con contrato de retención — DEUS las envía y rastrea automáticamente en cada ciclo de facturación sin acción manual.',
      },
      {
        stage: 'Etapa 11 · Retiro', icon: 'withdraw',
        title: 'Retirar Tu Saldo a Cualquier Cuenta Bancaria',
        subtitle: 'Mueve tus fondos DEUS a cualquier cuenta bancaria externa — local o internacionalmente — de forma rápida y segura.',
        features: [
          'Retiro a cualquier cuenta bancaria guardada o nueva',
          'Gratuito para la mayoría de retiros locales; pequeña comisión internacional',
          'Tiempo de procesamiento: 1 a 2 días hábiles (local), 2 a 3 (internacional)',
          'Retiro mínimo: 10 USD equivalente',
        ],
        details: [
          'Ve a Banca → Retirar',
          'Selecciona una cuenta bancaria guardada o añade una nueva (IBAN, código de clasificación o número de cuenta)',
          'Ingresa el monto del retiro en tu moneda preferida',
          'DEUS muestra la comisión exacta y la fecha de llegada estimada',
          'Confirma con tu PIN o biométrico — el retiro es enviado',
          'Sigue el estado en Banca → Historial — recibirás una alerta al completarse',
        ],
        scenario: 'Tras recibir un pago de cliente de $9,000, David retiró $7,500 a su cuenta Standard Chartered en Accra. Los fondos llegaron en 2 días hábiles con una comisión fija de $4.',
        tip: 'Guarda tu cuenta bancaria principal como "Cuenta de Retiro Predeterminada" — los futuros retiros se rellenan previamente y se confirman con un solo toque.',
      },
      {
        stage: 'Etapa 12 · Historial', icon: 'history',
        title: 'Rastrear, Buscar y Exportar Cada Transacción',
        subtitle: 'Tu registro financiero completo — filtra por fecha, tipo, monto o moneda, y exporta para contabilidad en segundos.',
        features: [
          'Historial completo: depósitos, envíos, recepciones, pagos, retiros',
          'Filtra por rango de fechas, tipo, moneda o monto',
          'Haz clic en cualquier transacción para ver detalles y recibo',
          'Exporta como PDF (estado de cuenta) o CSV (para software contable)',
        ],
        details: [
          'Ve a Banca → Historial de Transacciones',
          'Usa filtros: Rango de Fechas, Tipo, Moneda, Monto',
          'Busca por nombre del destinatario, número de referencia o monto',
          'Haz clic en una entrada para ver todos los detalles — monto, tipo de cambio, comisiones, marca de tiempo, estado',
          'Toca "Descargar Recibo" para guardar un recibo PDF de una transacción específica',
          'Toca "Exportar Estado de Cuenta" para descargar el período completo como PDF o CSV',
        ],
        scenario: 'Un auditor solicitó 12 meses de registros de transacciones. La CFO abrió el Historial de DEUS, configuró el rango de fechas y descargó un CSV completo en 45 segundos — sin visitar ninguna sucursal bancaria.',
        tip: 'Etiqueta las transacciones con categorías internas (Nómina, Proveedor, Marketing, Impuesto) a medida que ocurren — la conciliación mensual se vuelve 10 veces más rápida.',
      },
      {
        stage: 'Resumen', icon: 'check',
        title: 'Ahora Conoces Todas las Transacciones de DEUS',
        subtitle: 'Desde tu primer depósito hasta retiros transfronterizos — tienes el panorama completo.',
        body: 'Realiza la evaluación a continuación para poner a prueba tus conocimientos en los 12 módulos de transacciones. Obtén tu certificado IFB de la Guía de Transacciones al completarla.',
        features: [
          'Depósito: transferencia bancaria (gratuita), tarjeta (instantánea), dinero móvil',
          'Envío: IFB a IFB (instantáneo, gratuito) · Banco externo (SWIFT, 1–3 días)',
          'Recepción: IBAN · código QR · enlace de pago',
          'Pago: código QR · tarjeta · Terminal Tap to Pay NFC',
          'Internacional: más de 30 monedas, tarifas transparentes, más de 180 países',
          'Facturación: con marca, rastreable, botón de pago en línea',
          'Retiro: cualquier banco, 1–3 días, bajas comisiones',
          'Historial: registros completos, filtros, exportación PDF/CSV',
        ],
        cta: true,
        buttons: ['Descargar App', 'Abrir DEUS', 'Contactar Soporte'],
      },
    ],
  },
};

// ─── ASSESSMENT QUESTIONS (8 × 3 languages) ───────────────────────────────────

const QUESTIONS = {
  en: [
    {
      q: 'You want to add $5,000 to your DEUS account from your external bank. What is the correct path in the app?',
      options: ['Payments → Send Money', 'Banking → Deposit → Bank Transfer', 'Banking → Withdraw', 'Payments → Payment Links'],
      answer: 1,
      explanation: 'To deposit funds, go to Banking → Deposit and select Bank Transfer. You\'ll see your DEUS IBAN to use as the destination in your external bank.',
    },
    {
      q: 'Your client has a DEUS account. You send them $1,000 at midnight on Saturday. When do they receive it?',
      options: ['Next business day (Monday)', 'Within 3 business days', 'Instantly — IFB-to-IFB transfers are 24/7 real-time', 'Within 24 hours'],
      answer: 2,
      explanation: 'IFB-to-IFB transfers are instant and operate 24/7 — including weekends and holidays. Your client sees the funds within seconds, regardless of the time.',
    },
    {
      q: 'A walk-in customer wants to pay you in person but does not have the DEUS app. What is the most practical method?',
      options: ['Ask them to open a DEUS account first', 'Show your DEUS QR code — they scan and pay from their own banking app', 'Send them a payment link via email on the spot', 'Accept only cash and deposit later'],
      answer: 2,
      explanation: 'The fastest in-person option when the payer doesn\'t have DEUS is to send them a Payment Link on the spot — they pay with their own Visa/Mastercard from any browser, no account needed.',
    },
    {
      q: 'You realise your physical DEUS card may have been stolen. What should you do FIRST?',
      options: ['Call your bank and wait on hold', 'Report to police before anything else', 'Send a message to DEUS support by email', 'Open DEUS → Banking → Cards → select the card → Freeze instantly'],
      answer: 3,
      explanation: 'Freezing the card in the app takes 2 seconds and immediately blocks all new transactions. Do this first — then report to support and request a replacement card.',
    },
    {
      q: 'A supplier abroad needs to receive funds in EUR, but your DEUS account is in USD. What happens when you send via International Transfer?',
      options: ['The transfer is rejected — currency mismatch', 'You must open a separate EUR account first', 'DEUS converts from USD to EUR at the shown rate and delivers EUR to the recipient', 'The recipient receives USD and converts themselves'],
      answer: 2,
      explanation: 'DEUS handles multi-currency conversion automatically. You send in your account currency (USD), DEUS converts at the rate shown before you confirm, and the recipient receives EUR in their account.',
    },
    {
      q: 'A merchant wants to accept contactless payments using ONLY their smartphone — no card reader hardware. Which DEUS feature enables this?',
      options: ['Payment Links', 'QR Code — Generate', 'Tap to Pay (NFC Terminal)', 'Virtual Card'],
      answer: 2,
      explanation: 'Tap to Pay uses your phone\'s built-in NFC chip to act as a card reader. No external hardware is needed — customers tap their card or phone and payment is confirmed instantly.',
    },
    {
      q: 'A company\'s accountant needs the last 12 months of transactions as a CSV file for their accounting software. Where do they go?',
      options: ['Banking → Transaction History → set date range → Export as CSV', 'Payments → Invoices → Download', 'Banking → Cards → History', 'Settings → Data Export'],
      answer: 0,
      explanation: 'Go to Banking → Transaction History, set the date range to the last 12 months, and tap Export Statement → CSV. The file includes all transaction types with full details.',
    },
    {
      q: 'You sent a bank transfer to an external account 2 business days ago. It still shows "Processing". This most likely means:',
      options: ['The transfer was cancelled — you must resend', 'Your account is locked — contact support', 'External bank transfers can take up to 3 business days — this is normal processing time', 'You entered the wrong account number'],
      answer: 2,
      explanation: 'External bank transfers via SWIFT can take 1–3 business days depending on the destination country and receiving bank. "Processing" after 2 days is normal — check again on day 3.',
    },
  ],
  fr: [
    {
      q: 'Vous voulez ajouter 5 000 $ sur votre compte DEUS depuis votre banque externe. Quel est le bon chemin dans l\'application?',
      options: ['Paiements → Envoyer de l\'argent', 'Banque → Déposer → Virement Bancaire', 'Banque → Retirer', 'Paiements → Liens de Paiement'],
      answer: 1,
      explanation: 'Pour déposer des fonds, allez dans Banque → Déposer et sélectionnez Virement Bancaire. Vous verrez votre IBAN DEUS à utiliser comme destination dans votre banque externe.',
    },
    {
      q: 'Votre client a un compte DEUS. Vous lui envoyez 1 000 $ à minuit un samedi. Quand le reçoit-il?',
      options: ['Le prochain jour ouvré (lundi)', 'Sous 3 jours ouvrés', 'Instantanément — les transferts IFB-à-IFB sont en temps réel 24h/24', 'Sous 24 heures'],
      answer: 2,
      explanation: 'Les transferts IFB-à-IFB sont instantanés et fonctionnent 24h/24, 7j/7 — y compris les week-ends et jours fériés. Votre client voit les fonds en quelques secondes, quelle que soit l\'heure.',
    },
    {
      q: 'Un client se présentant en personne veut vous payer mais n\'a pas l\'application DEUS. Quelle est la méthode la plus pratique?',
      options: ['Lui demander d\'ouvrir d\'abord un compte DEUS', 'Afficher votre QR code DEUS — il scanne et paie depuis son application bancaire', 'Lui envoyer un lien de paiement par email sur-le-champ', 'N\'accepter que du liquide et déposer ensuite'],
      answer: 2,
      explanation: 'L\'option en personne la plus rapide quand le payeur n\'a pas DEUS est de lui envoyer un Lien de Paiement sur-le-champ — il paie avec sa propre Visa/Mastercard depuis n\'importe quel navigateur, sans compte requis.',
    },
    {
      q: 'Vous réalisez que votre carte DEUS physique a peut-être été volée. Que devez-vous faire EN PREMIER?',
      options: ['Appeler votre banque et attendre en ligne', 'Signaler à la police avant tout', 'Envoyer un message au support DEUS par email', 'Ouvrez DEUS → Banque → Cartes → sélectionnez la carte → Geler instantanément'],
      answer: 3,
      explanation: 'Geler la carte dans l\'application prend 2 secondes et bloque immédiatement toutes les nouvelles transactions. Faites cela en premier — puis signalez au support et demandez une carte de remplacement.',
    },
    {
      q: 'Un fournisseur à l\'étranger doit recevoir des fonds en EUR, mais votre compte DEUS est en USD. Que se passe-t-il lors d\'un Transfert International?',
      options: ['Le transfert est rejeté — incompatibilité de devises', 'Vous devez d\'abord ouvrir un compte EUR séparé', 'DEUS convertit de USD en EUR au taux affiché et livre des EUR au destinataire', 'Le destinataire reçoit des USD et convertit lui-même'],
      answer: 2,
      explanation: 'DEUS gère automatiquement la conversion multi-devises. Vous envoyez dans la devise de votre compte (USD), DEUS convertit au taux affiché avant confirmation, et le destinataire reçoit des EUR.',
    },
    {
      q: 'Un marchand veut accepter des paiements sans contact en utilisant UNIQUEMENT son smartphone — sans terminal de carte externe. Quelle fonctionnalité DEUS permet cela?',
      options: ['Liens de Paiement', 'QR Code — Générer', 'Tap to Pay (Terminal NFC)', 'Carte Virtuelle'],
      answer: 2,
      explanation: 'Tap to Pay utilise la puce NFC intégrée de votre téléphone pour agir comme un lecteur de carte. Aucun matériel externe n\'est nécessaire — les clients tapent leur carte ou téléphone et le paiement est confirmé instantanément.',
    },
    {
      q: 'Le comptable d\'une entreprise a besoin des 12 derniers mois de transactions sous forme de fichier CSV pour son logiciel comptable. Où va-t-il?',
      options: ['Banque → Historique des Transactions → définir plage de dates → Exporter en CSV', 'Paiements → Factures → Télécharger', 'Banque → Cartes → Historique', 'Paramètres → Export de Données'],
      answer: 0,
      explanation: 'Allez dans Banque → Historique des Transactions, définissez la plage des 12 derniers mois, et appuyez sur Exporter le Relevé → CSV. Le fichier inclut tous les types de transactions avec tous les détails.',
    },
    {
      q: 'Vous avez envoyé un virement bancaire vers un compte externe il y a 2 jours ouvrés. Il indique encore "En cours de traitement". Cela signifie très probablement:',
      options: ['Le transfert a été annulé — vous devez le renvoyer', 'Votre compte est bloqué — contactez le support', 'Les virements bancaires externes peuvent prendre jusqu\'à 3 jours ouvrés — c\'est normal', 'Vous avez saisi un mauvais numéro de compte'],
      answer: 2,
      explanation: 'Les virements bancaires externes via SWIFT peuvent prendre 1 à 3 jours ouvrés selon le pays de destination et la banque destinataire. "En cours de traitement" après 2 jours est normal — vérifiez à nouveau le 3e jour.',
    },
  ],
  es: [
    {
      q: 'Quieres añadir $5,000 a tu cuenta DEUS desde tu banco externo. ¿Cuál es el camino correcto en la app?',
      options: ['Pagos → Enviar Dinero', 'Banca → Depositar → Transferencia Bancaria', 'Banca → Retirar', 'Pagos → Enlaces de Pago'],
      answer: 1,
      explanation: 'Para depositar fondos, ve a Banca → Depositar y selecciona Transferencia Bancaria. Verás tu IBAN DEUS para usar como destino en tu banco externo.',
    },
    {
      q: 'Tu cliente tiene una cuenta DEUS. Le envías $1,000 a medianoche el sábado. ¿Cuándo lo recibe?',
      options: ['El siguiente día hábil (lunes)', 'En 3 días hábiles', 'Al instante — las transferencias IFB a IFB son en tiempo real 24/7', 'En 24 horas'],
      answer: 2,
      explanation: 'Las transferencias IFB a IFB son instantáneas y operan 24/7 — incluyendo fines de semana y festivos. Tu cliente ve los fondos en segundos, independientemente de la hora.',
    },
    {
      q: 'Un cliente que llega en persona quiere pagarte pero no tiene la app de DEUS. ¿Cuál es el método más práctico?',
      options: ['Pedirle que abra primero una cuenta DEUS', 'Mostrar tu código QR DEUS — escanea y paga desde su app bancaria', 'Enviarle un enlace de pago por email en el momento', 'Aceptar solo efectivo y depositar después'],
      answer: 2,
      explanation: 'La opción en persona más rápida cuando el pagador no tiene DEUS es enviarle un Enlace de Pago en el momento — paga con su propia Visa/Mastercard desde cualquier navegador, sin cuenta requerida.',
    },
    {
      q: 'Te das cuenta de que tu tarjeta DEUS física puede haber sido robada. ¿Qué debes hacer PRIMERO?',
      options: ['Llamar a tu banco y esperar en espera', 'Reportar a la policía antes de nada', 'Enviar un mensaje al soporte de DEUS por email', 'Abre DEUS → Banca → Tarjetas → selecciona la tarjeta → Congelar al instante'],
      answer: 3,
      explanation: 'Congelar la tarjeta en la app tarda 2 segundos y bloquea inmediatamente todas las nuevas transacciones. Haz esto primero — luego reporta al soporte y solicita una tarjeta de reemplazo.',
    },
    {
      q: 'Un proveedor en el extranjero necesita recibir fondos en EUR, pero tu cuenta DEUS está en USD. ¿Qué sucede al enviar por Transferencia Internacional?',
      options: ['La transferencia es rechazada — incompatibilidad de moneda', 'Primero debes abrir una cuenta EUR separada', 'DEUS convierte de USD a EUR al tipo mostrado y entrega EUR al destinatario', 'El destinatario recibe USD y convierte por su cuenta'],
      answer: 2,
      explanation: 'DEUS gestiona la conversión multidivisa automáticamente. Envías en la moneda de tu cuenta (USD), DEUS convierte al tipo mostrado antes de confirmar, y el destinatario recibe EUR en su cuenta.',
    },
    {
      q: 'Un comerciante quiere aceptar pagos sin contacto usando SOLO su smartphone — sin terminal de tarjeta externa. ¿Qué función de DEUS lo permite?',
      options: ['Enlaces de Pago', 'Código QR — Generar', 'Tap to Pay (Terminal NFC)', 'Tarjeta Virtual'],
      answer: 2,
      explanation: 'Tap to Pay usa el chip NFC integrado de tu teléfono para actuar como lector de tarjetas. No se necesita hardware externo — los clientes acercan su tarjeta o teléfono y el pago se confirma al instante.',
    },
    {
      q: 'El contable de una empresa necesita los últimos 12 meses de transacciones como archivo CSV para su software contable. ¿Dónde va?',
      options: ['Banca → Historial de Transacciones → configurar rango de fechas → Exportar como CSV', 'Pagos → Facturas → Descargar', 'Banca → Tarjetas → Historial', 'Configuración → Exportar Datos'],
      answer: 0,
      explanation: 'Ve a Banca → Historial de Transacciones, establece el rango de los últimos 12 meses y toca Exportar Estado de Cuenta → CSV. El archivo incluye todos los tipos de transacciones con detalles completos.',
    },
    {
      q: 'Enviaste una transferencia bancaria a una cuenta externa hace 2 días hábiles. Aún aparece como "En proceso". Esto probablemente significa:',
      options: ['La transferencia fue cancelada — debes reenviarla', 'Tu cuenta está bloqueada — contacta al soporte', 'Las transferencias bancarias externas pueden tardar hasta 3 días hábiles — es tiempo de procesamiento normal', 'Ingresaste el número de cuenta incorrecto'],
      answer: 2,
      explanation: 'Las transferencias bancarias externas por SWIFT pueden tardar 1 a 3 días hábiles según el país de destino y el banco receptor. "En proceso" tras 2 días es normal — vuelve a verificar el día 3.',
    },
  ],
};

const CERT_LABELS = {
  en: { title: 'Certificate of Completion', program: 'Transaction Mastery Program', issuer: 'Issued by Infinite Future Bank LLC · Washington DC', nameLabel: 'Enter your name', score: 'Assessment Score', retake: 'Retake Assessment', returnGuide: 'Return to Guide', perfect: 'Outstanding — Perfect Score!', great: 'Excellent Result', pass: 'Assessment Passed', retry: 'Keep Practising', date: 'Completion Date' },
  fr: { title: 'Certificat de Réussite', program: 'Programme de Maîtrise des Transactions', issuer: 'Délivré par Infinite Future Bank LLC · Washington DC', nameLabel: 'Entrez votre nom', score: 'Score d\'Évaluation', retake: 'Reprendre l\'Évaluation', returnGuide: 'Retour au Guide', perfect: 'Excellent — Score Parfait!', great: 'Excellent Résultat', pass: 'Évaluation Réussie', retry: 'Continuez à Pratiquer', date: 'Date de Réussite' },
  es: { title: 'Certificado de Finalización', program: 'Programa de Dominio de Transacciones', issuer: 'Emitido por Infinite Future Bank LLC · Washington DC', nameLabel: 'Ingrese su nombre', score: 'Puntuación de Evaluación', retake: 'Repetir Evaluación', returnGuide: 'Volver a la Guía', perfect: '¡Sobresaliente — Puntuación Perfecta!', great: 'Excelente Resultado', pass: 'Evaluación Aprobada', retry: 'Sigue Practicando', date: 'Fecha de Finalización' },
};

// ─── SLIDE MOCKUP ─────────────────────────────────────────────────────────────

const iconMap = {
  deposit:  <ArrowDownCircle size={28} className="text-emerald-400" />,
  send:     <Send size={28} className="text-blue-400" />,
  external: <ArrowUpCircle size={28} className="text-violet-400" />,
  receive:  <ArrowDownCircle size={28} className="text-teal-400" />,
  qr:       <QrCode size={28} className="text-amber-400" />,
  link:     <LinkIcon size={28} className="text-pink-400" />,
  card:     <CreditCard size={28} className="text-blue-300" />,
  nfc:      <Wifi size={28} className="text-cyan-400" />,
  globe:    <Globe size={28} className="text-indigo-400" />,
  invoice:  <FileText size={28} className="text-orange-400" />,
  withdraw: <Banknote size={28} className="text-red-400" />,
  history:  <History size={28} className="text-slate-300" />,
  check:    <CheckCircle2 size={28} className="text-emerald-400" />,
  star:     <Star size={28} className="text-yellow-400" />,
};

function SlideMockup({ slide }) {
  const s = slide;
  const icon = s?.icon ? iconMap[s.icon] : null;

  if (!s) return null;

  if (s.icon === 'star') return (
    <div className="bg-slate-800 rounded-[2rem] p-4 shadow-2xl max-w-[280px] mx-auto">
      <div className="bg-slate-900 rounded-[1.5rem] overflow-hidden">
        <div className="bg-[#0a0f1e] px-4 py-3 flex items-center gap-2 border-b border-slate-800">
          <div className="w-2 h-2 rounded-full bg-slate-600" />
          <span className="text-white text-xs font-black">DEUS Banking</span>
        </div>
        <div className="p-4 space-y-2">
          {[['Deposit', 'emerald'], ['Send', 'blue'], ['Receive', 'teal'], ['QR Pay', 'amber'], ['Tap to Pay', 'cyan'], ['Withdraw', 'red']].map(([label, color]) => (
            <div key={label} className={`bg-${color}-500/10 border border-${color}-500/20 rounded-xl px-3 py-2 flex items-center gap-2`}>
              <div className={`w-2 h-2 rounded-full bg-${color}-400`} />
              <span className={`text-${color}-300 text-xs font-bold`}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (s.icon === 'deposit') return (
    <div className="bg-slate-800 rounded-[2rem] p-4 shadow-2xl max-w-[280px] mx-auto">
      <div className="bg-slate-900 rounded-[1.5rem] overflow-hidden">
        <div className="bg-emerald-600 px-4 py-3 flex items-center gap-2">
          <ArrowDownCircle size={14} className="text-white" />
          <span className="text-white text-xs font-black">Deposit Funds</span>
        </div>
        <div className="p-4 space-y-3">
          <div className="bg-slate-800 rounded-xl p-3 text-center">
            <p className="text-slate-400 text-[10px] mb-1">Amount</p>
            <p className="text-white font-black text-2xl">$2,000.00</p>
            <p className="text-slate-500 text-[10px]">USD</p>
          </div>
          {['Bank Transfer (Free)', 'Card — 1.5% fee', 'Mobile Money'].map((m, i) => (
            <div key={m} className={`rounded-xl px-3 py-2.5 flex items-center gap-2 ${i === 0 ? 'bg-emerald-500/20 border border-emerald-500/40' : 'bg-slate-800'}`}>
              <div className={`w-3 h-3 rounded-full border-2 ${i === 0 ? 'border-emerald-400 bg-emerald-400' : 'border-slate-600'}`} />
              <span className="text-slate-300 text-xs font-bold">{m}</span>
            </div>
          ))}
          <button className="w-full bg-emerald-600 rounded-xl py-2 text-white text-xs font-black">Confirm Deposit</button>
        </div>
      </div>
    </div>
  );

  if (s.icon === 'send') return (
    <div className="bg-slate-800 rounded-[2rem] p-4 shadow-2xl max-w-[280px] mx-auto">
      <div className="bg-slate-900 rounded-[1.5rem] overflow-hidden">
        <div className="bg-blue-600 px-4 py-3 flex items-center gap-2">
          <Send size={14} className="text-white" />
          <span className="text-white text-xs font-black">Send Money</span>
        </div>
        <div className="p-4 space-y-3">
          <div className="bg-slate-800 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-black">KF</div>
            <div>
              <p className="text-white text-xs font-black">Kofi Mensah</p>
              <p className="text-slate-400 text-[10px]">IFB · @kofi.mensah</p>
            </div>
            <CheckCircle2 size={14} className="text-emerald-400 ml-auto" />
          </div>
          <div className="bg-slate-800 rounded-xl p-3 text-center">
            <p className="text-slate-400 text-[10px] mb-1">Amount</p>
            <p className="text-white font-black text-2xl">$850.00</p>
          </div>
          <div className="bg-slate-800 rounded-xl px-3 py-2 flex justify-between text-xs">
            <span className="text-slate-400">Fee</span>
            <span className="text-emerald-400 font-black">Free</span>
          </div>
          <button className="w-full bg-blue-600 rounded-xl py-2 text-white text-xs font-black">Send Instantly ⚡</button>
        </div>
      </div>
    </div>
  );

  if (s.icon === 'qr') return (
    <div className="bg-slate-800 rounded-[2rem] p-4 shadow-2xl max-w-[280px] mx-auto">
      <div className="bg-slate-900 rounded-[1.5rem] overflow-hidden">
        <div className="bg-amber-500 px-4 py-3 flex items-center gap-2">
          <QrCode size={14} className="text-slate-900" />
          <span className="text-slate-900 text-xs font-black">QR Code Payment</span>
        </div>
        <div className="p-4 flex flex-col items-center gap-3">
          <div className="bg-white rounded-xl p-3 w-28 h-28 grid grid-cols-3 gap-1">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className={`rounded-sm ${[0,1,3,5,7,8,4].includes(i) ? 'bg-slate-900' : 'bg-white'}`} />
            ))}
          </div>
          <div className="text-center">
            <p className="text-white font-black text-sm">Market Vendor</p>
            <p className="text-emerald-400 font-black">Fixed: $25.00</p>
            <p className="text-slate-500 text-[10px]">Scan to pay instantly</p>
          </div>
          <button className="w-full bg-amber-500 rounded-xl py-2 text-slate-900 text-xs font-black">Share QR</button>
        </div>
      </div>
    </div>
  );

  if (s.icon === 'nfc') return (
    <div className="bg-slate-800 rounded-[2rem] p-4 shadow-2xl max-w-[280px] mx-auto">
      <div className="bg-slate-900 rounded-[1.5rem] overflow-hidden">
        <div className="bg-cyan-600 px-4 py-3 flex items-center gap-2">
          <Wifi size={14} className="text-white" />
          <span className="text-white text-xs font-black">Tap to Pay</span>
        </div>
        <div className="p-4 flex flex-col items-center gap-3">
          <div className="text-center">
            <p className="text-slate-400 text-[10px] mb-1">Charge Amount</p>
            <p className="text-white font-black text-3xl">$48.50</p>
          </div>
          <div className="w-24 h-24 rounded-full border-4 border-cyan-500 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border-4 border-cyan-400/50 flex items-center justify-center">
              <Wifi size={32} className="text-cyan-400" />
            </div>
          </div>
          <p className="text-cyan-300 text-xs font-black animate-pulse">Hold card or phone here</p>
          <p className="text-slate-500 text-[10px]">Visa · Mastercard · Apple Pay · Google Pay</p>
        </div>
      </div>
    </div>
  );

  if (s.icon === 'history') return (
    <div className="bg-slate-800 rounded-[2rem] p-4 shadow-2xl max-w-[280px] mx-auto">
      <div className="bg-slate-900 rounded-[1.5rem] overflow-hidden">
        <div className="bg-slate-700 px-4 py-3 flex items-center justify-between">
          <span className="text-white text-xs font-black">Transaction History</span>
          <Download size={12} className="text-slate-400" />
        </div>
        <div className="p-3 space-y-2">
          {[
            { label: 'Kofi Mensah', sub: 'IFB Transfer', amt: '-$850', color: 'text-red-400' },
            { label: 'Client Payment', sub: 'Payment Link', amt: '+$3,500', color: 'text-emerald-400' },
            { label: 'Bank Transfer', sub: 'Deposit', amt: '+$2,000', color: 'text-emerald-400' },
            { label: 'AWS Hosting', sub: 'Card Payment', amt: '-$120', color: 'text-red-400' },
          ].map((t) => (
            <div key={t.label} className="bg-slate-800 rounded-xl px-3 py-2 flex items-center justify-between">
              <div>
                <p className="text-white text-xs font-bold">{t.label}</p>
                <p className="text-slate-500 text-[10px]">{t.sub}</p>
              </div>
              <span className={`text-xs font-black ${t.color}`}>{t.amt}</span>
            </div>
          ))}
        </div>
        <div className="px-3 pb-3">
          <button className="w-full bg-slate-700 rounded-xl py-2 text-slate-300 text-[10px] font-black flex items-center justify-center gap-1">
            <Download size={10} /> Export CSV / PDF
          </button>
        </div>
      </div>
    </div>
  );

  // Generic mockup for remaining slides
  return (
    <div className="bg-slate-800 rounded-[2rem] p-4 shadow-2xl max-w-[280px] mx-auto">
      <div className="bg-slate-900 rounded-[1.5rem] overflow-hidden">
        <div className="bg-slate-700 px-4 py-3 flex items-center gap-2">
          {icon}
          <span className="text-white text-xs font-black">{s.stage}</span>
        </div>
        <div className="p-4 space-y-2">
          {(s.features || []).slice(0, 4).map((f) => (
            <div key={f} className="bg-slate-800 rounded-xl px-3 py-2 flex items-start gap-2">
              <CheckCircle2 size={12} className="text-emerald-400 mt-0.5 flex-shrink-0" />
              <span className="text-slate-300 text-[10px] leading-snug">{f}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function TransactionGuide({ onClose } = {}) {
  const [slide, setSlide] = useState(0);
  const [lang, setLang] = useState('en');
  const [mode, setMode] = useState('course');
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [certName, setCertName] = useState('');
  const [touchStart, setTouchStart] = useState(null);

  const TOTAL = 14;
  const goNext = useCallback(() => setSlide(s => Math.min(s + 1, TOTAL - 1)), []);
  const goPrev = useCallback(() => setSlide(s => Math.max(s - 1, 0)), []);

  useEffect(() => {
    if (mode !== 'course') return;
    const handler = (e) => {
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev, mode]);

  const handleTouchStart = (e) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e) => {
    if (touchStart === null) return;
    const delta = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 50) { delta > 0 ? goNext() : goPrev(); }
    setTouchStart(null);
  };

  const content = CONTENT[lang];
  const currentSlide = content.slides[slide];
  const questions = QUESTIONS[lang];
  const certLabels = CERT_LABELS[lang];
  const currentQ = questions[qIndex];
  const selectedAnswer = answers[qIndex];
  const isAnswered = selectedAnswer !== undefined;
  const totalQ = questions.length;
  const score = Object.values(answers).reduce((acc, a, i) => acc + (a === questions[i]?.answer ? 1 : 0), 0);

  const startAssessment = () => { setMode('assessment'); setQIndex(0); setAnswers({}); };
  const selectAnswer = (idx) => { if (!isAnswered) setAnswers(prev => ({ ...prev, [qIndex]: idx })); };
  const nextQuestion = () => { if (qIndex < totalQ - 1) setQIndex(q => q + 1); else setMode('certificate'); };
  const retakeAssessment = () => { setMode('assessment'); setQIndex(0); setAnswers({}); };
  const returnToGuide = () => { setMode('course'); setSlide(0); setQIndex(0); setAnswers({}); };

  const counterLabel = mode === 'assessment' ? `Q${qIndex + 1} / ${totalQ}` : mode === 'certificate' ? certLabels.title : `${slide + 1} / ${TOTAL}`;

  const topBar = (
    <div className="bg-[#0a0f1e] border-b border-slate-800 px-4 py-3 flex items-center justify-between flex-shrink-0 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xl font-black flex-shrink-0">
          <span className="text-[#4285F4]">D</span><span className="text-[#EA4335]">E</span><span className="text-[#FBBC04]">U</span><span className="text-[#34A853]">S</span>
        </span>
        <span className="hidden sm:inline text-slate-500 text-xs font-medium truncate">
          {mode === 'certificate' ? 'Certificate' : mode === 'assessment' ? 'Assessment' : 'Transaction Guide'}
        </span>
      </div>
      <span className="text-slate-400 text-xs font-black flex-shrink-0">{counterLabel}</span>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center gap-1 bg-slate-800 rounded-xl p-1">
          {(['en', 'fr', 'es']).map((l) => (
            <button key={l} onClick={() => setLang(l)}
              className={`text-[10px] font-black px-2 py-1 rounded-lg transition-colors ${lang === l ? 'bg-white text-slate-900' : 'text-white'}`}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        {onClose && (
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div
      className={`bg-[#0a0f1e] flex flex-col select-none ${onClose ? 'fixed inset-0 z-[9999]' : 'min-h-screen'}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {topBar}

      {/* ══ CERTIFICATE ══ */}
      {mode === 'certificate' && (() => {
        const passed = score >= 6;
        const perfect = score === totalQ;
        const badge = perfect ? 'bg-yellow-500 text-slate-900' : passed ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-slate-900';
        const verdict = perfect ? certLabels.perfect : passed ? certLabels.great : score >= 5 ? certLabels.pass : certLabels.retry;
        const today = new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : lang === 'es' ? 'es-ES' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        return (
          <div className="flex-1 overflow-y-auto flex items-center justify-center p-4 sm:p-8">
            <div className="w-full max-w-xl">
              <div className="relative bg-slate-900 rounded-3xl p-6 sm:p-10 border-2 border-emerald-500/40 shadow-[0_0_60px_rgba(16,185,129,0.12)]">
                <div className="absolute inset-0 rounded-3xl border border-emerald-400/10 m-1 pointer-events-none" />
                <div className="text-center mb-6">
                  <div className="text-3xl font-black mb-1">
                    <span className="text-[#4285F4]">D</span><span className="text-[#EA4335]">E</span><span className="text-[#FBBC04]">U</span><span className="text-[#34A853]">S</span>
                  </div>
                  <p className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em]">Infinite Future Bank</p>
                </div>
                <div className="text-center mb-6">
                  <Award size={40} className="text-emerald-400 mx-auto mb-3" />
                  <h2 className="text-xl sm:text-2xl font-black text-white mb-1">{certLabels.title}</h2>
                  <p className="text-slate-400 text-sm font-medium">{certLabels.program}</p>
                </div>
                <div className="mb-6">
                  <input type="text" value={certName} onChange={(e) => setCertName(e.target.value)}
                    placeholder={certLabels.nameLabel}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-center text-white font-black text-lg placeholder:text-slate-500 outline-none focus:border-emerald-400 transition-colors" />
                  {certName && <p className="text-center text-emerald-300 font-black text-sm mt-2">{certName}</p>}
                </div>
                <div className={`${badge} rounded-2xl py-3 px-5 text-center mb-4`}>
                  <p className="text-sm font-black">{certLabels.score}: {score} / {totalQ}</p>
                  <p className="text-xs font-bold mt-0.5 opacity-80">{verdict}</p>
                </div>
                <div className="text-center text-slate-500 text-[11px] font-medium mb-6">
                  <p>{certLabels.date}: {today}</p>
                  <p className="mt-1">{certLabels.issuer}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={retakeAssessment} className="flex-1 py-3 rounded-2xl border border-slate-600 text-slate-300 text-sm font-black hover:bg-slate-800 transition-colors">{certLabels.retake}</button>
                  <button onClick={returnToGuide} className="flex-1 py-3 rounded-2xl bg-emerald-600 text-white text-sm font-black hover:bg-emerald-700 transition-colors">{certLabels.returnGuide}</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══ ASSESSMENT ══ */}
      {mode === 'assessment' && (
        <div className="flex-1 overflow-y-auto flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-xl">
            <div className="flex gap-1.5 mb-6 justify-center">
              {questions.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${i < qIndex ? 'bg-emerald-500 w-6' : i === qIndex ? 'bg-emerald-400 w-8' : 'bg-slate-700 w-4'}`} />
              ))}
            </div>
            <h2 className="text-white font-black text-lg sm:text-xl mb-6 leading-snug">{currentQ.q}</h2>
            <div className="flex flex-col gap-3 mb-6">
              {currentQ.options.map((opt, i) => {
                let cls = 'border-slate-700 text-slate-300 hover:border-emerald-500 hover:bg-slate-800';
                if (isAnswered) {
                  if (i === currentQ.answer) cls = 'border-emerald-500 bg-emerald-500/10 text-emerald-300';
                  else if (i === selectedAnswer) cls = 'border-red-500 bg-red-500/10 text-red-300';
                  else cls = 'border-slate-800 text-slate-600';
                }
                return (
                  <button key={i} onClick={() => selectAnswer(i)}
                    className={`text-left border rounded-2xl px-5 py-4 text-sm font-bold transition-all flex items-center gap-3 ${cls}`}>
                    <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-[10px] font-black flex-shrink-0">{String.fromCharCode(65 + i)}</span>
                    {opt}
                  </button>
                );
              })}
            </div>
            {isAnswered && (
              <div className={`rounded-2xl p-4 mb-6 text-sm font-medium leading-relaxed ${selectedAnswer === currentQ.answer ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/10 text-red-300 border border-red-500/30'}`}>
                {currentQ.explanation}
              </div>
            )}
            {isAnswered && (
              <button onClick={nextQuestion}
                className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-black text-sm hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2">
                {qIndex < totalQ - 1 ? (<><span>{content.next}</span><ChevronRight size={16} /></>) : (<><Award size={16} /><span>{lang === 'fr' ? 'Voir le Certificat' : lang === 'es' ? 'Ver Certificado' : 'View Certificate'}</span></>)}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ══ COURSE ══ */}
      {mode === 'course' && (
        <>
          <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
            <div className="flex-1 flex flex-col justify-center px-5 py-6 lg:px-12 lg:py-12 order-2 lg:order-1">
              <div className="max-w-xl">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{currentSlide.stage}</span>
                </div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white leading-tight mb-3">{currentSlide.title}</h1>
                <p className="text-slate-300 text-sm lg:text-base font-medium mb-4 leading-relaxed">{currentSlide.subtitle}</p>
                {currentSlide.body && <p className="text-slate-400 text-sm mb-4 leading-relaxed">{currentSlide.body}</p>}
                {currentSlide.features && (
                  <ul className="flex flex-col gap-2 mb-4">
                    {currentSlide.features.map((f) => (
                      <li key={f} className="flex items-start gap-3">
                        <div className="w-4 h-4 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <CheckCircle2 size={9} className="text-white" />
                        </div>
                        <span className="text-slate-300 text-sm leading-relaxed">{f}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {currentSlide.details && (
                  <div className="bg-slate-800/60 rounded-2xl p-4 mb-4 border border-slate-700/50">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2">Step by step</p>
                    <ul className="flex flex-col gap-1.5">
                      {currentSlide.details.map((d, i) => (
                        <li key={i} className="flex items-start gap-2 text-slate-300 text-xs leading-relaxed">
                          <span className="text-emerald-400 font-black flex-shrink-0">{i + 1}.</span>
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {currentSlide.scenario && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-3 mb-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-1">Real example</p>
                    <p className="text-amber-100 text-xs leading-relaxed">{currentSlide.scenario}</p>
                  </div>
                )}
                {currentSlide.tip && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-4 py-3 mb-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">Pro tip</p>
                    <p className="text-emerald-100 text-xs leading-relaxed">{currentSlide.tip}</p>
                  </div>
                )}
                {currentSlide.cta && (
                  <div className="flex flex-wrap gap-3 mt-2">
                    {(currentSlide.buttons || []).map((btn, i) => (
                      <a key={btn}
                        href={i === 0 ? '#' : i === 1 ? 'https://deus.infinitefuturebank.org' : 'mailto:support@infinitefuturebank.org'}
                        className={`px-5 py-2.5 rounded-xl text-sm font-black transition-opacity hover:opacity-90 ${i === 0 ? 'bg-emerald-600 text-white' : i === 1 ? 'bg-white text-slate-900' : 'border border-slate-600 text-white'}`}>
                        {btn}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="hidden lg:flex lg:w-[380px] xl:w-[440px] items-center justify-center px-6 py-8 order-1 lg:order-2 bg-slate-900 lg:bg-transparent flex-shrink-0">
              <div className="w-full">
                <SlideMockup slide={currentSlide} />
              </div>
            </div>
          </div>

          <div className="bg-[#0a0f1e] border-t border-slate-800 px-4 py-3 flex items-center justify-between flex-shrink-0 gap-2">
            <button onClick={goPrev} disabled={slide === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-700 text-slate-300 text-sm font-black hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0">
              <ChevronLeft size={15} />
              <span className="hidden sm:inline">{content.prev}</span>
            </button>
            <div className="flex items-center gap-1 flex-wrap justify-center">
              {Array.from({ length: TOTAL }).map((_, i) => (
                <button key={i} onClick={() => setSlide(i)}
                  className={`rounded-full transition-all ${i === slide ? 'w-4 h-2 bg-emerald-500' : 'w-2 h-2 bg-slate-600 hover:bg-slate-500'}`}
                  aria-label={`Slide ${i + 1}`} />
              ))}
            </div>
            {slide < TOTAL - 1 ? (
              <button onClick={goNext}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-black hover:bg-emerald-700 transition-colors flex-shrink-0">
                <span className="hidden sm:inline">{content.next}</span>
                <ChevronRight size={15} />
              </button>
            ) : (
              <button onClick={startAssessment}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 text-slate-900 text-sm font-black hover:bg-amber-400 transition-colors flex-shrink-0">
                <Award size={14} />
                <span className="hidden sm:inline">{lang === 'fr' ? 'Évaluation' : lang === 'es' ? 'Evaluación' : 'Assessment'}</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
