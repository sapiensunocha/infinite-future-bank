import { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, Globe, Building2, ShieldCheck, Landmark,
  Wallet, CreditCard, TrendingUp, Users, Handshake, BarChart3,
  Leaf, Network, GraduationCap, CheckCircle2, Clock, AlertTriangle,
  Copy, Play, ArrowRight, Star, Lock, Unlock, Zap, RefreshCw,
  FileText, Package, Ticket, Smartphone, PieChart, BookOpen,
  Award, ChevronDown, X, Circle
} from 'lucide-react';

// ─── CONTENT ────────────────────────────────────────────────────────────────

const CONTENT = {
  en: {
    brand: 'DEUS',
    langLabel: 'EN',
    prev: 'Previous',
    next: 'Next',
    slides: [
      {
        stage: 'Overview',
        title: 'IFB DEUS — Your Complete Business Operating System',
        subtitle: 'From company registration to global capital raising — everything a modern business needs, in one platform.',
        body: 'IFB DEUS is an all-in-one digital financial infrastructure for companies: banking, payroll, lending, capital raising, insurance, smart contracts and investment tools — built for African and global businesses.',
        features: [
          'Formation, Banking, Payments, Lending, Payroll',
          'Capital Raising, Insurance, Investment, NPO',
          'Network, Academy — 12 integrated stages',
          'Designed for African and global businesses',
          'No legacy banking required — start in minutes',
        ],
        badges: ['Formation','Banking','Payments','Lending','Payroll','Capital Raising','Insurance','Investment','NPO','Network','Academy'],
      },
      {
        stage: 'Stage 1',
        title: 'Stage 1 — Company Formation',
        subtitle: 'Register your legal entity in 7 jurisdictions from within the app.',
        features: [
          'Choose from 7 international jurisdictions',
          'Pricing from $199 — same-day available',
          'Tax implications and legal structure explained',
          'Documents generated automatically post-formation',
          'Formation status tracked in real-time',
        ],
        steps: ['Choose Jurisdiction', 'Configure Entity', 'Submit Documents'],
      },
      {
        stage: 'Stage 2',
        title: 'Stage 2 — Corporate KYC & Underwriting',
        subtitle: 'Pascaline AI audits your company in minutes — no paperwork queues.',
        features: [
          'Submit 6 financial telemetry points',
          'Pascaline AI cross-references public databases',
          'Typical decision: 24–72 hours',
          'Status: pending_review → eligible_for_funding',
          'Unlocks: Payroll, Lending, Capital Tools, VentureX listings',
        ],
      },
      {
        stage: 'Stage 3',
        title: 'Stage 3 — Multi-Currency Business Banking',
        subtitle: 'Four dedicated balance buckets — each with a specific role in your financial architecture.',
        features: [
          'Liquid USD: daily operating cash',
          'Alpha Equity: equity and stock portfolio value',
          'MyS Safe Vault: locked reserves and savings goals',
          'AFR Balance: network token for platform transactions',
          'Full transaction ledger with export',
          'Real-time balance updates on every transaction',
        ],
      },
      {
        stage: 'Stage 4',
        title: 'Stage 4 — Treasury & Organization',
        subtitle: 'Structure your company\'s cash with intelligent sub-accounts, budgets and automatic routing.',
        features: [
          'Pockets: named sub-accounts with targets (Payroll, Marketing, R&D…)',
          'Budgets: monthly spending limits per category with alert thresholds',
          'Income Protocol: auto-split every deposit across Cash/Equity/Vault (must total 100%)',
          'Recipients: trusted payee directory — search any IFB user, add, send instantly',
          'All treasury moves logged with full audit trail',
        ],
      },
      {
        stage: 'Stage 5',
        title: 'Stage 5 — Payments & Commerce',
        subtitle: 'Receive payments, lock funds in escrow, sell tickets — all with one platform fee.',
        features: [
          'Billing Terminal: create invoices, auto-generate secure payment links, 1% IFB fee on settlement',
          'Smart Contract Escrow: lock funds for any service or milestone — 0.5% fee, atomic release on both-party confirmation',
          'Ticket Gate: create events, set ticket tiers, generate QR codes, scan on entry, export reports',
          'NFC Transfer: tap-to-pay contactless between phones',
          'Tap to Pay: accept physical card payments on your phone',
        ],
      },
      {
        stage: 'Stage 6',
        title: 'Stage 6 — Lending & Credit Network',
        subtitle: 'Borrow from the community or earn yield by funding other businesses.',
        features: [
          'Issue smart loan contracts directly to the AFR liquidity pool',
          'Set amount, term (3/6/12/24 months) and yield offered (1–20%)',
          'AI Trust Score determines priority and approval speed',
          'Browse marketplace: fund any active contract and earn APY',
          'Loan deployed on AFR blockchain — transparent, auditable',
          'Portfolio tracker: active yields, issued contracts, repayment status',
        ],
      },
      {
        stage: 'Stage 7',
        title: 'Stage 7 — Payroll & HR',
        subtitle: 'Pay your entire team in one click — compliant, atomic, logged.',
        features: [
          'Add employees: name, email, monthly salary',
          'IFB service fee: 2% of gross payroll',
          'One-click monthly payroll execution via secure RPC',
          'Funds deducted atomically — no partial failures',
          'Payroll log maintained for tax compliance',
          'Each employee receives salary directly to their IFB balance',
          'Requires: company status = eligible_for_funding',
        ],
      },
      {
        stage: 'Stage 8',
        title: 'Stage 8 — Capital Raising & VentureX',
        subtitle: 'Three advisory packages + direct access to the IFB Venture Exchange capital raise directory.',
        features: [
          'IFB ACCESS ($650): business validation and basic pitch support',
          'IFB GROWTH ($2,750): full financial model, investor pitch deck, data room',
          'IFB ELITE ($6,000): term sheet negotiation, institutional investor network',
          'VentureX Listing: pay $500–$2,000 to list your raise — IFB Verified badge on approval',
          'Success fee: 3–6% of capital raised at closing',
          'Investor matchmaking: IFB connects you within 3 business days of interest',
          'Annual renewal: $300–$1,000/yr to keep listing active',
        ],
      },
      {
        stage: 'Stage 9',
        title: 'Stage 9 — Business Insurance (Clyrix)',
        subtitle: 'Community-backed protection pools with AI-validated claims.',
        features: [
          'Join any protection pool: Health, Income, Life, Agriculture',
          'Coverage = 10× monthly contribution',
          'Submit claims anytime: title, description, amount',
          'AI trust score (60–100%) determines auto-approval',
          'AgriShield: specialized crop and weather-parameterized insurance',
          'Claims paid from pool reserves — IFB maintains a reserve buffer',
          'Partners network: access verified external insurance providers',
        ],
      },
      {
        stage: 'Stage 10',
        title: 'Stage 10 — Investment & Wealth',
        subtitle: 'Put surplus capital to work with curated investment opportunities and portfolio tools.',
        features: [
          'Portfolio overview: real-time allocation across 4 balance types',
          'Financial Planner: projections, scenario modeling, goal tracking',
          'Alpha Deals: pre-vetted investment opportunities with data rooms',
          'Wealth Invest: structured portfolio management and rebalancing',
          'Minimum tickets from $1,000 — accessible to growing businesses',
          'All investments tracked in one dashboard',
        ],
      },
      {
        stage: 'Stage 11',
        title: 'Stage 11 — Non-Profit & Social Impact (NPO Hub)',
        subtitle: 'A dedicated track for NGOs, foundations and social enterprises.',
        features: [
          'Apply as NGO: submit legal name, tax ID, mission, charter',
          'Two tracks: Emerging Academy (cohorts, micro-grants) or Enterprise Hub (loans, compliance)',
          'Notarize impact reports on blockchain — immutable proof of impact',
          'Social feed: post updates, follow organizations, monetized likes',
          'Visibility on verified NPO directory with transparency score',
          'Community loans and scaling capital for mission-driven organizations',
        ],
      },
      {
        stage: 'Stage 12',
        title: 'Stage 12 — Network, Referrals & Academy',
        subtitle: 'Grow your business network, earn from referrals, and upskill your team.',
        features: [
          'AFR Network Node: join the decentralized IFB financial network, build B2B connections',
          'Capital Network: generate your referral link, earn commission on every referred transaction',
          'Track referral conversions and lifetime earnings in real-time',
          'DEUS Academy: financial literacy, pitch skills, compliance training',
          'Courses completed on-platform with certificates',
          'Network liquidity opportunities available to active nodes',
        ],
      },
      {
        stage: 'Summary',
        title: 'Your Business Journey — Complete',
        subtitle: 'IFB DEUS covers every stage from legal incorporation to global capital markets.',
        body: 'Join 1,020,000+ users across 40 countries who use IFB DEUS to run, fund and grow their businesses.',
        cta: 'Ready to start? Download the app or access via web browser.',
        features: [
          '12 integrated business stages in one platform',
          'Legal formation in 7 jurisdictions',
          'Banking, lending, payroll, insurance, investment',
          'Capital raising via VentureX Exchange',
          'AI-powered underwriting and claims',
        ],
        buttons: ['Download APK', 'Open Web App', 'Contact Us'],
      },
    ],
  },
  fr: {
    brand: 'DEUS',
    langLabel: 'FR',
    prev: 'Précédent',
    next: 'Suivant',
    slides: [
      {
        stage: 'Aperçu',
        title: 'IFB DEUS — Votre Système d\'Exploitation Complet pour Entreprises',
        subtitle: 'De l\'enregistrement de l\'entreprise à la levée de fonds mondiale — tout ce qu\'une entreprise moderne nécessite, sur une seule plateforme.',
        body: 'IFB DEUS est une infrastructure financière numérique tout-en-un pour les entreprises : bancaire, paie, prêts, levée de fonds, assurance, contrats intelligents et outils d\'investissement — conçue pour les entreprises africaines et mondiales.',
        features: [
          'Création, Bancaire, Paiements, Prêts, Paie',
          'Levée de Fonds, Assurance, Investissement, ONG',
          'Réseau, Académie — 12 étapes intégrées',
          'Conçu pour les entreprises africaines et mondiales',
          'Aucune banque traditionnelle requise — démarrez en quelques minutes',
        ],
        badges: ['Création','Bancaire','Paiements','Prêts','Paie','Levée de Fonds','Assurance','Investissement','ONG','Réseau','Académie'],
      },
      {
        stage: 'Étape 1',
        title: 'Étape 1 — Création d\'Entreprise',
        subtitle: 'Enregistrez votre entité légale dans 7 juridictions depuis l\'application.',
        features: [
          'Choisissez parmi 7 juridictions internationales',
          'Tarifs à partir de 199$ — disponible le jour même',
          'Implications fiscales et structure juridique expliquées',
          'Documents générés automatiquement après la création',
          'Statut de création suivi en temps réel',
        ],
        steps: ['Choisir la Juridiction', 'Configurer l\'Entité', 'Soumettre les Documents'],
      },
      {
        stage: 'Étape 2',
        title: 'Étape 2 — KYC Entreprise & Souscription',
        subtitle: 'Pascaline IA audite votre entreprise en quelques minutes — sans files d\'attente administratives.',
        features: [
          'Soumettez 6 points de télémétrie financière',
          'Pascaline IA croise les bases de données publiques',
          'Décision typique : 24–72 heures',
          'Statut : pending_review → eligible_for_funding',
          'Déverrouille : Paie, Prêts, Outils Capital, Listings VentureX',
        ],
      },
      {
        stage: 'Étape 3',
        title: 'Étape 3 — Bancaire Multi-Devises',
        subtitle: 'Quatre compartiments de solde dédiés — chacun avec un rôle spécifique dans votre architecture financière.',
        features: [
          'USD Liquide : trésorerie opérationnelle quotidienne',
          'Alpha Equity : valeur du portefeuille actions',
          'MyS Safe Vault : réserves bloquées et objectifs d\'épargne',
          'Solde AFR : jeton réseau pour les transactions plateforme',
          'Grand livre de transactions complet avec export',
          'Mises à jour de solde en temps réel à chaque transaction',
        ],
      },
      {
        stage: 'Étape 4',
        title: 'Étape 4 — Trésorerie & Organisation',
        subtitle: 'Structurez la trésorerie de votre entreprise avec des sous-comptes intelligents, des budgets et un routage automatique.',
        features: [
          'Poches : sous-comptes nommés avec objectifs (Paie, Marketing, R&D…)',
          'Budgets : limites de dépenses mensuelles par catégorie avec seuils d\'alerte',
          'Protocole Revenus : répartition automatique de chaque dépôt entre Liquidités/Equity/Coffre (total 100%)',
          'Destinataires : annuaire de bénéficiaires de confiance — recherchez tout utilisateur IFB',
          'Tous les mouvements de trésorerie consignés avec piste d\'audit complète',
        ],
      },
      {
        stage: 'Étape 5',
        title: 'Étape 5 — Paiements & Commerce',
        subtitle: 'Recevez des paiements, bloquez des fonds en séquestre, vendez des billets — avec des frais de plateforme uniques.',
        features: [
          'Terminal de Facturation : créez des factures, générez des liens de paiement sécurisés, frais IFB 1%',
          'Séquestre Contrat Intelligent : bloquez les fonds pour tout service — frais 0.5%, libération atomique',
          'Ticket Gate : créez des événements, définissez les niveaux de billets, codes QR, scan à l\'entrée',
          'Transfert NFC : paiement sans contact entre téléphones',
          'Tap to Pay : acceptez les paiements par carte physique sur votre téléphone',
        ],
      },
      {
        stage: 'Étape 6',
        title: 'Étape 6 — Prêts & Réseau de Crédit',
        subtitle: 'Empruntez auprès de la communauté ou gagnez un rendement en finançant d\'autres entreprises.',
        features: [
          'Émettez des contrats de prêt intelligents directement dans le pool de liquidité AFR',
          'Définissez montant, durée (3/6/12/24 mois) et rendement offert (1–20%)',
          'Score de Confiance IA détermine la priorité et la rapidité d\'approbation',
          'Parcourez le marché : financez tout contrat actif et gagnez un APY',
          'Prêt déployé sur la blockchain AFR — transparent, auditable',
          'Suivi de portefeuille : rendements actifs, contrats émis, statut de remboursement',
        ],
      },
      {
        stage: 'Étape 7',
        title: 'Étape 7 — Paie & RH',
        subtitle: 'Payez toute votre équipe en un clic — conforme, atomique, consigné.',
        features: [
          'Ajoutez des employés : nom, email, salaire mensuel',
          'Frais de service IFB : 2% de la masse salariale brute',
          'Exécution mensuelle de la paie en un clic via RPC sécurisé',
          'Fonds déduits atomiquement — pas de défaillances partielles',
          'Journal de paie maintenu pour la conformité fiscale',
          'Chaque employé reçoit son salaire directement sur son solde IFB',
          'Requiert : statut entreprise = eligible_for_funding',
        ],
      },
      {
        stage: 'Étape 8',
        title: 'Étape 8 — Levée de Fonds & VentureX',
        subtitle: 'Trois packages de conseil + accès direct au répertoire de levée de fonds IFB Venture Exchange.',
        features: [
          'IFB ACCESS (650$) : validation commerciale et support pitch basique',
          'IFB GROWTH (2 750$) : modèle financier complet, pitch deck investisseur, data room',
          'IFB ELITE (6 000$) : négociation term sheet, réseau investisseurs institutionnels',
          'Listing VentureX : payez 500$–2 000$ pour lister votre levée — badge IFB Vérifié',
          'Commission succès : 3–6% des fonds levés à la clôture',
          'Mise en relation investisseurs : IFB vous connecte sous 3 jours ouvrables',
          'Renouvellement annuel : 300$–1 000$/an pour maintenir le listing actif',
        ],
      },
      {
        stage: 'Étape 9',
        title: 'Étape 9 — Assurance Entreprise (Clyrix)',
        subtitle: 'Pools de protection soutenus par la communauté avec validations de sinistres par IA.',
        features: [
          'Rejoignez tout pool de protection : Santé, Revenus, Vie, Agriculture',
          'Couverture = 10× contribution mensuelle',
          'Soumettez des sinistres à tout moment : titre, description, montant',
          'Score de confiance IA (60–100%) détermine l\'approbation automatique',
          'AgriShield : assurance agricole spécialisée et paramétrée météo',
          'Sinistres payés depuis les réserves du pool — IFB maintient un tampon de réserve',
          'Réseau de partenaires : accès aux fournisseurs d\'assurance externes vérifiés',
        ],
      },
      {
        stage: 'Étape 10',
        title: 'Étape 10 — Investissement & Patrimoine',
        subtitle: 'Mettez les capitaux excédentaires au travail avec des opportunités d\'investissement sélectionnées.',
        features: [
          'Aperçu du portefeuille : allocation en temps réel sur 4 types de soldes',
          'Planificateur Financier : projections, modélisation de scénarios, suivi des objectifs',
          'Alpha Deals : opportunités d\'investissement pré-vérifiées avec data rooms',
          'Wealth Invest : gestion de portefeuille structurée et rééquilibrage',
          'Tickets minimum à partir de 1 000$ — accessible aux entreprises en croissance',
          'Tous les investissements suivis dans un tableau de bord unique',
        ],
      },
      {
        stage: 'Étape 11',
        title: 'Étape 11 — ONG & Impact Social (Hub ONG)',
        subtitle: 'Une voie dédiée aux ONG, fondations et entreprises sociales.',
        features: [
          'Postulez comme ONG : soumettez nom légal, numéro fiscal, mission, charte',
          'Deux voies : Académie Émergente (cohortes, micro-subventions) ou Hub Entreprise (prêts, conformité)',
          'Notariez les rapports d\'impact sur blockchain — preuve d\'impact immuable',
          'Fil social : publiez des mises à jour, suivez des organisations, likes monétisés',
          'Visibilité dans l\'annuaire ONG vérifié avec score de transparence',
          'Prêts communautaires et capital de croissance pour organisations à mission',
        ],
      },
      {
        stage: 'Étape 12',
        title: 'Étape 12 — Réseau, Parrainages & Académie',
        subtitle: 'Développez votre réseau d\'affaires, gagnez grâce aux parrainages et formez votre équipe.',
        features: [
          'Nœud Réseau AFR : rejoignez le réseau financier décentralisé IFB, développez des connexions B2B',
          'Réseau Capital : générez votre lien de parrainage, gagnez une commission sur chaque transaction',
          'Suivez les conversions de parrainage et les gains à vie en temps réel',
          'Académie DEUS : littératie financière, compétences pitch, formation conformité',
          'Cours complétés sur plateforme avec certificats',
          'Opportunités de liquidité réseau disponibles pour les nœuds actifs',
        ],
      },
      {
        stage: 'Résumé',
        title: 'Votre Parcours Entreprise — Complet',
        subtitle: 'IFB DEUS couvre chaque étape de l\'incorporation légale aux marchés de capitaux mondiaux.',
        body: 'Rejoignez plus de 1 020 000 utilisateurs dans 40 pays qui utilisent IFB DEUS pour gérer, financer et développer leurs entreprises.',
        cta: 'Prêt à commencer ? Téléchargez l\'application ou accédez via navigateur web.',
        features: [
          '12 étapes métier intégrées dans une seule plateforme',
          'Création légale dans 7 juridictions',
          'Bancaire, prêts, paie, assurance, investissement',
          'Levée de fonds via VentureX Exchange',
          'Souscription et sinistres alimentés par l\'IA',
        ],
        buttons: ['Télécharger APK', 'Ouvrir l\'App Web', 'Nous Contacter'],
      },
    ],
  },
  es: {
    brand: 'DEUS',
    langLabel: 'ES',
    prev: 'Anterior',
    next: 'Siguiente',
    slides: [
      {
        stage: 'Resumen',
        title: 'IFB DEUS — Su Sistema Operativo Empresarial Completo',
        subtitle: 'Desde el registro de empresa hasta la captación de capital global — todo lo que un negocio moderno necesita, en una sola plataforma.',
        body: 'IFB DEUS es una infraestructura financiera digital todo-en-uno para empresas: banca, nómina, préstamos, captación de capital, seguros, contratos inteligentes y herramientas de inversión — construida para empresas africanas y globales.',
        features: [
          'Formación, Banca, Pagos, Préstamos, Nómina',
          'Captación de Capital, Seguros, Inversión, ONG',
          'Red, Academia — 12 etapas integradas',
          'Diseñado para empresas africanas y globales',
          'Sin banca tradicional requerida — empiece en minutos',
        ],
        badges: ['Formación','Banca','Pagos','Préstamos','Nómina','Capital','Seguros','Inversión','ONG','Red','Academia'],
      },
      {
        stage: 'Etapa 1',
        title: 'Etapa 1 — Formación de Empresa',
        subtitle: 'Registre su entidad legal en 7 jurisdicciones desde la aplicación.',
        features: [
          'Elija entre 7 jurisdicciones internacionales',
          'Precios desde $199 — disponible el mismo día',
          'Implicaciones fiscales y estructura legal explicadas',
          'Documentos generados automáticamente tras la formación',
          'Estado de formación rastreado en tiempo real',
        ],
        steps: ['Elegir Jurisdicción', 'Configurar Entidad', 'Enviar Documentos'],
      },
      {
        stage: 'Etapa 2',
        title: 'Etapa 2 — KYC Corporativo y Suscripción',
        subtitle: 'Pascaline IA audita su empresa en minutos — sin colas de papeleo.',
        features: [
          'Envíe 6 puntos de telemetría financiera',
          'Pascaline IA cruza bases de datos públicas',
          'Decisión típica: 24–72 horas',
          'Estado: pending_review → eligible_for_funding',
          'Desbloquea: Nómina, Préstamos, Herramientas Capital, Listings VentureX',
        ],
      },
      {
        stage: 'Etapa 3',
        title: 'Etapa 3 — Banca Empresarial Multi-Divisa',
        subtitle: 'Cuatro compartimentos de saldo dedicados — cada uno con un rol específico en su arquitectura financiera.',
        features: [
          'USD Líquido: efectivo operativo diario',
          'Alpha Equity: valor del portafolio de acciones',
          'MyS Safe Vault: reservas bloqueadas y metas de ahorro',
          'Saldo AFR: token de red para transacciones de plataforma',
          'Libro mayor de transacciones completo con exportación',
          'Actualizaciones de saldo en tiempo real en cada transacción',
        ],
      },
      {
        stage: 'Etapa 4',
        title: 'Etapa 4 — Tesorería y Organización',
        subtitle: 'Estructure el efectivo de su empresa con subcuentas inteligentes, presupuestos y enrutamiento automático.',
        features: [
          'Bolsillos: subcuentas con nombre y objetivos (Nómina, Marketing, I+D…)',
          'Presupuestos: límites de gasto mensuales por categoría con umbrales de alerta',
          'Protocolo de Ingresos: división automática de cada depósito entre Efectivo/Equity/Bóveda (total 100%)',
          'Destinatarios: directorio de beneficiarios de confianza — busque cualquier usuario IFB',
          'Todos los movimientos de tesorería registrados con pista de auditoría completa',
        ],
      },
      {
        stage: 'Etapa 5',
        title: 'Etapa 5 — Pagos y Comercio',
        subtitle: 'Reciba pagos, bloquee fondos en custodia, venda entradas — todo con una tarifa de plataforma.',
        features: [
          'Terminal de Facturación: cree facturas, genere links de pago seguros, tarifa IFB 1%',
          'Custodia de Contrato Inteligente: bloquee fondos para cualquier servicio — tarifa 0.5%, liberación atómica',
          'Ticket Gate: cree eventos, niveles de entradas, códigos QR, escaneo en entrada',
          'Transferencia NFC: pago sin contacto entre teléfonos',
          'Tap to Pay: acepte pagos físicos con tarjeta en su teléfono',
        ],
      },
      {
        stage: 'Etapa 6',
        title: 'Etapa 6 — Préstamos y Red de Crédito',
        subtitle: 'Pida prestado a la comunidad o gane rendimiento financiando otros negocios.',
        features: [
          'Emita contratos de préstamo inteligentes directamente al pool de liquidez AFR',
          'Establezca monto, plazo (3/6/12/24 meses) y rendimiento ofrecido (1–20%)',
          'Puntuación de Confianza IA determina prioridad y velocidad de aprobación',
          'Explore el mercado: financie cualquier contrato activo y gane APY',
          'Préstamo desplegado en blockchain AFR — transparente, auditable',
          'Seguimiento de portafolio: rendimientos activos, contratos emitidos, estado de reembolso',
        ],
      },
      {
        stage: 'Etapa 7',
        title: 'Etapa 7 — Nómina y RR.HH.',
        subtitle: 'Pague a todo su equipo en un clic — conforme, atómico, registrado.',
        features: [
          'Añada empleados: nombre, email, salario mensual',
          'Tarifa de servicio IFB: 2% de la nómina bruta',
          'Ejecución mensual de nómina en un clic vía RPC seguro',
          'Fondos deducidos atómicamente — sin fallos parciales',
          'Registro de nómina mantenido para cumplimiento fiscal',
          'Cada empleado recibe salario directamente en su saldo IFB',
          'Requiere: estado empresa = eligible_for_funding',
        ],
      },
      {
        stage: 'Etapa 8',
        title: 'Etapa 8 — Captación de Capital y VentureX',
        subtitle: 'Tres paquetes de asesoría + acceso directo al directorio de captación IFB Venture Exchange.',
        features: [
          'IFB ACCESS ($650): validación comercial y soporte básico de pitch',
          'IFB GROWTH ($2,750): modelo financiero completo, pitch deck para inversores, data room',
          'IFB ELITE ($6,000): negociación de term sheet, red de inversores institucionales',
          'Listing VentureX: pague $500–$2,000 para listar su captación — badge IFB Verificado',
          'Comisión de éxito: 3–6% del capital captado al cierre',
          'Emparejamiento con inversores: IFB le conecta en 3 días hábiles',
          'Renovación anual: $300–$1,000/año para mantener el listing activo',
        ],
      },
      {
        stage: 'Etapa 9',
        title: 'Etapa 9 — Seguros Empresariales (Clyrix)',
        subtitle: 'Pools de protección respaldados por la comunidad con reclamaciones validadas por IA.',
        features: [
          'Únase a cualquier pool de protección: Salud, Ingresos, Vida, Agricultura',
          'Cobertura = 10× contribución mensual',
          'Envíe reclamaciones en cualquier momento: título, descripción, monto',
          'Puntuación de confianza IA (60–100%) determina aprobación automática',
          'AgriShield: seguro agrícola especializado y parametrizado por clima',
          'Reclamaciones pagadas desde reservas del pool — IFB mantiene un buffer de reserva',
          'Red de socios: acceso a proveedores externos de seguros verificados',
        ],
      },
      {
        stage: 'Etapa 10',
        title: 'Etapa 10 — Inversión y Patrimonio',
        subtitle: 'Ponga el capital excedente a trabajar con oportunidades de inversión seleccionadas.',
        features: [
          'Resumen de portafolio: asignación en tiempo real en 4 tipos de saldo',
          'Planificador Financiero: proyecciones, modelado de escenarios, seguimiento de metas',
          'Alpha Deals: oportunidades de inversión preseleccionadas con data rooms',
          'Wealth Invest: gestión estructurada de portafolio y rebalanceo',
          'Tickets mínimos desde $1,000 — accesible para empresas en crecimiento',
          'Todas las inversiones rastreadas en un panel único',
        ],
      },
      {
        stage: 'Etapa 11',
        title: 'Etapa 11 — ONG e Impacto Social (Hub ONG)',
        subtitle: 'Una vía dedicada para ONGs, fundaciones y empresas sociales.',
        features: [
          'Solicite como ONG: envíe nombre legal, ID fiscal, misión, estatutos',
          'Dos vías: Academia Emergente (cohortes, micro-subvenciones) o Hub Empresarial (préstamos, cumplimiento)',
          'Notarice informes de impacto en blockchain — prueba inmutable de impacto',
          'Feed social: publique actualizaciones, siga organizaciones, likes monetizados',
          'Visibilidad en directorio ONG verificado con puntuación de transparencia',
          'Préstamos comunitarios y capital de crecimiento para organizaciones con misión',
        ],
      },
      {
        stage: 'Etapa 12',
        title: 'Etapa 12 — Red, Referencias y Academia',
        subtitle: 'Haga crecer su red empresarial, gane con referencias y capacite a su equipo.',
        features: [
          'Nodo Red AFR: únase a la red financiera descentralizada IFB, construya conexiones B2B',
          'Red Capital: genere su enlace de referidos, gane comisión en cada transacción referida',
          'Rastree conversiones de referidos y ganancias de por vida en tiempo real',
          'Academia DEUS: educación financiera, habilidades de pitch, formación en cumplimiento',
          'Cursos completados en plataforma con certificados',
          'Oportunidades de liquidez en red disponibles para nodos activos',
        ],
      },
      {
        stage: 'Resumen',
        title: 'Su Viaje Empresarial — Completo',
        subtitle: 'IFB DEUS cubre cada etapa desde la incorporación legal hasta los mercados de capital globales.',
        body: 'Únase a más de 1,020,000 usuarios en 40 países que usan IFB DEUS para gestionar, financiar y hacer crecer sus negocios.',
        cta: 'Listo para empezar? Descargue la app o acceda vía navegador web.',
        features: [
          '12 etapas empresariales integradas en una plataforma',
          'Formación legal en 7 jurisdicciones',
          'Banca, préstamos, nómina, seguros, inversión',
          'Captación de capital vía VentureX Exchange',
          'Suscripción y reclamaciones impulsadas por IA',
        ],
        buttons: ['Descargar APK', 'Abrir App Web', 'Contáctenos'],
      },
    ],
  },
};

// ─── MOCKUP COMPONENTS ───────────────────────────────────────────────────────

function MockupShell({ children }) {
  return (
    <div className="bg-slate-800 rounded-[2rem] p-4 shadow-2xl w-full max-w-sm mx-auto">
      <div className="bg-slate-50 rounded-[1.5rem] overflow-hidden min-h-[480px] flex flex-col">
        {children}
      </div>
    </div>
  );
}

function AppHeader({ title }) {
  return (
    <div className="bg-[#0a0f1e] px-4 py-3 flex items-center justify-between flex-shrink-0">
      <span className="text-white font-black text-sm">
        <span className="text-[#4285F4]">D</span>
        <span className="text-[#EA4335]">E</span>
        <span className="text-[#FBBC04]">U</span>
        <span className="text-[#34A853]">S</span>
      </span>
      {title && <span className="text-slate-400 text-xs">{title}</span>}
    </div>
  );
}

// Slide 0 Mockup
function Slide0Mockup({ lang }) {
  const badges = CONTENT[lang].slides[0].badges;
  const stageIcons = [Building2, Landmark, CreditCard, TrendingUp, Users, BarChart3, ShieldCheck, PieChart, Leaf, Network, GraduationCap];
  return (
    <MockupShell>
      <AppHeader />
      <div className="flex-1 p-4 flex flex-col gap-3 overflow-hidden">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
          <div className="text-2xl font-black mb-1">
            <span className="text-[#4285F4]">D</span>
            <span className="text-[#EA4335]">E</span>
            <span className="text-[#FBBC04]">U</span>
            <span className="text-[#34A853]">S</span>
          </div>
          <p className="text-[9px] text-slate-500 font-medium">Business Operating System</p>
          <div className="mt-2 inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[8px] font-black px-2 py-0.5 rounded-full">
            <Zap size={8} /> 12 Integrated Stages
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {badges.slice(0, 9).map((b, i) => {
            const Icon = stageIcons[i];
            return (
              <div key={b} className="bg-white rounded-xl border border-slate-200 p-2 flex flex-col items-center gap-1">
                <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Icon size={12} className="text-blue-600" />
                </div>
                <span className="text-[7px] font-black text-slate-600 text-center leading-tight">{b}</span>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {badges.slice(9).map((b, i) => {
            const Icon = stageIcons[9 + i];
            return (
              <div key={b} className="bg-white rounded-xl border border-slate-200 p-2 flex flex-col items-center gap-1">
                <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Icon size={12} className="text-blue-600" />
                </div>
                <span className="text-[7px] font-black text-slate-600 text-center">{b}</span>
              </div>
            );
          })}
        </div>
      </div>
    </MockupShell>
  );
}

// Slide 1 Mockup
function Slide1Mockup({ lang }) {
  const jurisdictions = [
    { flag: '🇺🇸', name: 'Wyoming LLC', price: '$199', time: '1-3 days', note: 'Zero state tax', selected: false },
    { flag: '🇺🇸', name: 'Delaware LLC', price: '$299', time: '1-3 days', note: 'VC-friendly', selected: false },
    { flag: '🇺🇸', name: 'Delaware C-Corp', price: '$499', time: '1-3 days', note: 'IPO-ready', selected: true },
    { flag: '🇬🇧', name: 'UK Ltd', price: '$299', time: '1-2 days', note: 'EU access', selected: false },
    { flag: '🇦🇪', name: 'UAE (SHAMS)', price: '$1,499', time: 'Same-day', note: '0% tax', selected: false },
    { flag: '🇸🇬', name: 'Singapore Pte', price: '$899', time: '2-5 days', note: 'Asian hub', selected: false },
    { flag: '🇨🇦', name: 'Canada Corp', price: '$399', time: '3-5 days', note: 'G7 credibility', selected: false },
  ];
  const steps = CONTENT[lang].slides[1].steps;
  return (
    <MockupShell>
      <AppHeader title="Formation" />
      <div className="flex-1 p-3 flex flex-col gap-2 overflow-hidden">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Select Jurisdiction</p>
        <div className="flex flex-col gap-1.5 flex-1 overflow-hidden">
          {jurisdictions.slice(0, 5).map((j) => (
            <div key={j.name} className={`flex items-center gap-2 p-2 rounded-xl border ${j.selected ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white'}`}>
              <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${j.selected ? 'border-blue-600' : 'border-slate-300'}`}>
                {j.selected && <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
              </div>
              <span className="text-sm">{j.flag}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className={`text-[9px] font-black truncate ${j.selected ? 'text-blue-700' : 'text-slate-800'}`}>{j.name}</span>
                  {j.selected && <span className="text-[7px] bg-amber-100 text-amber-700 font-black px-1 rounded">⭐</span>}
                </div>
                <span className="text-[8px] text-slate-500">{j.note}</span>
              </div>
              <div className="text-right flex-shrink-0">
                <div className={`text-[9px] font-black ${j.selected ? 'text-blue-700' : 'text-slate-700'}`}>{j.price}</div>
                <div className="text-[7px] text-slate-400">{j.time}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-0 mt-1">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black ${i === 0 ? 'bg-blue-600 text-white' : i === 1 ? 'bg-blue-200 text-blue-700' : 'bg-slate-200 text-slate-500'}`}>{i + 1}</div>
                <span className="text-[6px] text-slate-500 text-center mt-0.5 leading-tight">{s}</span>
              </div>
              {i < steps.length - 1 && <div className={`h-px w-4 mb-3 flex-shrink-0 ${i === 0 ? 'bg-blue-400' : 'bg-slate-300'}`} />}
            </div>
          ))}
        </div>
      </div>
    </MockupShell>
  );
}

// Slide 2 Mockup
function Slide2Mockup() {
  return (
    <MockupShell>
      <AppHeader title="KYC & Underwriting" />
      <div className="flex-1 p-3 flex flex-col gap-2 overflow-hidden">
        <div className="bg-white rounded-2xl border border-slate-200 p-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Company Profile</p>
          {[
            ['Company Name', 'Simandou Minerals Ltd'],
            ['Sector', 'Mining'],
            ['Registration Country', 'Guinea'],
            ['Annual Revenue', '$4.2M'],
            ['Monthly Burn Rate', '$180K'],
            ['Debt-to-Equity', '0.42'],
          ].map(([label, val]) => (
            <div key={label} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
              <span className="text-[8px] text-slate-500">{label}</span>
              <span className="text-[9px] font-black text-slate-800">{val}</span>
            </div>
          ))}
          <button className="mt-2 w-full bg-blue-600 text-white text-[9px] font-black py-2 rounded-xl">Submit for AI Audit</button>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Review Status</p>
          {[
            { label: 'Document Review', done: true, active: false },
            { label: 'Pascaline AI Analysis', done: false, active: true },
            { label: 'Underwriting Decision', done: false, active: false },
          ].map((step, i) => (
            <div key={step.label} className="flex items-center gap-2 py-1.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black flex-shrink-0 ${step.done ? 'bg-emerald-100 text-emerald-700' : step.active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                {step.done ? '✓' : step.active ? <RefreshCw size={8} className="animate-spin" /> : i + 1}
              </div>
              <span className={`text-[9px] font-black ${step.done ? 'text-emerald-700' : step.active ? 'text-blue-700' : 'text-slate-400'}`}>{step.label}</span>
              {step.active && <span className="text-[7px] bg-blue-100 text-blue-700 px-1 rounded font-black ml-auto">Active</span>}
              {step.done && <span className="text-[7px] bg-emerald-100 text-emerald-700 px-1 rounded font-black ml-auto">Done</span>}
            </div>
          ))}
        </div>
        <div className="bg-slate-100 rounded-xl p-2">
          <p className="text-[8px] font-black text-slate-500 mb-1.5">Unlocks after approval:</p>
          <div className="flex gap-1 flex-wrap">
            {['Payroll', 'Lending', 'Capital Tools', 'VentureX'].map(f => (
              <span key={f} className="flex items-center gap-0.5 text-[7px] bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full font-black">
                <Lock size={6} /> {f}
              </span>
            ))}
          </div>
        </div>
      </div>
    </MockupShell>
  );
}

// Slide 3 Mockup
function Slide3Mockup() {
  const cards = [
    { label: 'Liquid USD', amount: '$124,800.00', sub: 'Operating Cash', color: 'bg-blue-600' },
    { label: 'Alpha Equity', amount: '$48,350.00', sub: 'Stock Holdings', color: 'bg-purple-600' },
    { label: 'MyS Safe Vault', amount: '$95,000.00', sub: 'Locked Savings', color: 'bg-slate-700' },
    { label: 'AFR Balance', amount: '12,450 AFR', sub: 'Network Token', color: 'bg-amber-500' },
  ];
  const txns = [
    { name: 'Kouyaté Mining', amt: '+$8,200', date: 'Jun 20', credit: true },
    { name: 'AWS Services', amt: '-$340', date: 'Jun 19', credit: false },
    { name: 'Client Invoice #14', amt: '+$22,000', date: 'Jun 18', credit: true },
    { name: 'Payroll Run', amt: '-$14,688', date: 'Jun 15', credit: false },
    { name: 'AFR Pool Yield', amt: '+$1,240 AFR', date: 'Jun 14', credit: true },
  ];
  return (
    <MockupShell>
      <AppHeader title="Banking" />
      <div className="flex-1 p-3 flex flex-col gap-2 overflow-hidden">
        <div className="grid grid-cols-2 gap-2">
          {cards.map((c) => (
            <div key={c.label} className={`${c.color} rounded-2xl p-3 text-white`}>
              <p className="text-[8px] font-black opacity-80">{c.label}</p>
              <p className="text-[11px] font-black mt-1 leading-tight">{c.amount}</p>
              <p className="text-[7px] opacity-70 mt-0.5">{c.sub}</p>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-3 flex-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Recent Transactions</p>
          <div className="flex flex-col gap-1.5">
            {txns.map((t) => (
              <div key={t.name} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className={`w-4 h-4 rounded-full ${t.credit ? 'bg-emerald-100' : 'bg-red-100'} flex items-center justify-center flex-shrink-0`}>
                    <span className={`text-[8px] font-black ${t.credit ? 'text-emerald-600' : 'text-red-600'}`}>{t.credit ? '↑' : '↓'}</span>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-700">{t.name}</p>
                    <p className="text-[7px] text-slate-400">{t.date}</p>
                  </div>
                </div>
                <span className={`text-[9px] font-black ${t.credit ? 'text-emerald-600' : 'text-red-600'}`}>{t.amt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MockupShell>
  );
}

// Slide 4 Mockup
function Slide4Mockup() {
  const pockets = [
    { name: 'Payroll Fund', current: 45000, target: 50000, pct: 90, color: 'bg-blue-500' },
    { name: 'Marketing', current: 8200, target: 15000, pct: 55, color: 'bg-purple-500' },
    { name: 'R&D Reserve', current: 12000, target: 30000, pct: 40, color: 'bg-amber-500' },
  ];
  return (
    <MockupShell>
      <AppHeader title="Treasury" />
      <div className="flex-1 p-3 flex flex-col gap-2 overflow-hidden">
        <div className="flex gap-1">
          {['Pockets', 'Budgets', 'Income Protocol'].map((t, i) => (
            <button key={t} className={`text-[8px] font-black px-2 py-1 rounded-lg flex-1 ${i === 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{t}</button>
          ))}
        </div>
        <div className="flex flex-col gap-2 flex-1">
          {pockets.map((p) => (
            <div key={p.name} className="bg-white rounded-2xl border border-slate-200 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-black text-slate-800">{p.name}</span>
                <button className="text-[7px] bg-blue-50 text-blue-700 font-black px-2 py-0.5 rounded-lg">Add Funds</button>
              </div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[8px] text-slate-500">${p.current.toLocaleString()}</span>
                <span className="text-[8px] text-slate-400">/ ${p.target.toLocaleString()} target</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div className={`${p.color} rounded-full h-1.5 transition-all`} style={{ width: `${p.pct}%` }} />
              </div>
              <span className="text-[7px] text-slate-400 mt-0.5 block">{p.pct}% funded</span>
            </div>
          ))}
        </div>
        <button className="w-full border-2 border-dashed border-slate-300 text-slate-500 text-[9px] font-black py-2 rounded-xl">+ New Pocket</button>
      </div>
    </MockupShell>
  );
}

// Slide 5 Mockup
function Slide5Mockup() {
  const invoices = [
    { ref: 'INV-0041', client: 'Geita Gold Ltd', amt: '$18,500', status: 'Paid', color: 'bg-emerald-100 text-emerald-700' },
    { ref: 'INV-0042', client: 'Sahel AgriCo', amt: '$7,200', status: 'Pending', color: 'bg-amber-100 text-amber-700' },
    { ref: 'INV-0043', client: 'Lagos FinHub', amt: '$3,400', status: 'Overdue', color: 'bg-red-100 text-red-700' },
  ];
  return (
    <MockupShell>
      <AppHeader title="Payments" />
      <div className="flex-1 p-3 flex flex-col gap-2 overflow-hidden">
        <div className="flex gap-1">
          {['Invoices', 'Escrow', 'Tickets', 'NFC'].map((t, i) => (
            <button key={t} className={`text-[7px] font-black px-1.5 py-1 rounded-lg flex-1 ${i === 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{t}</button>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">New Invoice</p>
          {[
            ['Customer Email', 'contact@geita.com'],
            ['Amount', '$12,500'],
            ['Description', 'Mining survey — Phase 1'],
            ['Due Date', '2026-07-30'],
          ].map(([label, val]) => (
            <div key={label} className="mb-1.5">
              <p className="text-[7px] text-slate-400 mb-0.5">{label}</p>
              <div className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                <span className="text-[9px] font-black text-slate-700">{val}</span>
              </div>
            </div>
          ))}
          <button className="mt-1 w-full bg-blue-600 text-white text-[9px] font-black py-1.5 rounded-xl">Generate Payment Link</button>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-3 flex-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Recent Invoices</p>
          {invoices.map((inv) => (
            <div key={inv.ref} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
              <div>
                <p className="text-[8px] font-black text-slate-800">{inv.client}</p>
                <p className="text-[7px] text-slate-400">{inv.ref}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black text-slate-700">{inv.amt}</span>
                <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full ${inv.color}`}>{inv.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MockupShell>
  );
}

// Slide 6 Mockup
function Slide6Mockup() {
  const contracts = [
    { name: 'Geita Minerals', amt: '30,000 AFR', apy: '9.2% APY', pct: 68, active: false },
    { name: 'Lagos FinHub', amt: '15,000 AFR', apy: '7.5% APY', pct: 100, active: true },
    { name: 'Cape AgriCo', amt: '22,000 AFR', apy: '11.0% APY', pct: 23, active: false },
  ];
  return (
    <MockupShell>
      <AppHeader title="Lending" />
      <div className="flex-1 p-3 flex flex-col gap-2 overflow-hidden">
        <div className="bg-white rounded-2xl border border-slate-200 p-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Request Capital</p>
          {[
            ['Amount', '50,000 AFR'],
            ['Term', '12 months ▾'],
            ['Yield Offered', '8.5%'],
            ['Purpose', 'Equipment — ore crusher'],
          ].map(([label, val]) => (
            <div key={label} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
              <span className="text-[8px] text-slate-500">{label}</span>
              <span className="text-[9px] font-black text-slate-800">{val}</span>
            </div>
          ))}
          <button className="mt-2 w-full bg-blue-600 text-white text-[9px] font-black py-1.5 rounded-xl">Issue Smart Contract</button>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-3 flex-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Marketplace</p>
          <div className="flex flex-col gap-2">
            {contracts.map((c) => (
              <div key={c.name} className="border border-slate-100 rounded-xl p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-black text-slate-800">{c.name}</span>
                  {c.active
                    ? <span className="text-[7px] bg-emerald-100 text-emerald-700 font-black px-1.5 py-0.5 rounded-full">Active</span>
                    : <button className="text-[7px] bg-blue-600 text-white font-black px-2 py-0.5 rounded-full">Fund</button>
                  }
                </div>
                <div className="flex items-center gap-2 text-[7px] text-slate-500 mb-1">
                  <span>{c.amt}</span><span className="text-emerald-600 font-black">{c.apy}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1">
                  <div className="bg-blue-500 rounded-full h-1" style={{ width: `${c.pct}%` }} />
                </div>
                <span className="text-[6px] text-slate-400">{c.pct}% funded</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MockupShell>
  );
}

// Slide 7 Mockup
function Slide7Mockup() {
  const employees = [
    { name: 'Ibrahim Kouyaté', role: 'Mining Engineer', salary: '$3,800' },
    { name: 'Grace Mwangi', role: 'Finance Manager', salary: '$4,200' },
    { name: 'Amadou Bah', role: 'Field Geologist', salary: '$2,900' },
    { name: 'Nthabiseng Mohale', role: 'HR Director', salary: '$3,500' },
  ];
  return (
    <MockupShell>
      <AppHeader title="Payroll & HR" />
      <div className="flex-1 p-3 flex flex-col gap-2 overflow-hidden">
        <div className="bg-white rounded-2xl border border-slate-200 p-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Employee Registry</p>
          <div className="flex text-[7px] font-black text-slate-400 pb-1 border-b border-slate-100">
            <span className="flex-1">Name / Role</span>
            <span className="w-14 text-right">Salary</span>
            <span className="w-10 text-right">Status</span>
          </div>
          {employees.map((e) => (
            <div key={e.name} className="flex items-center py-1.5 border-b border-slate-50 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-[8px] font-black text-slate-800 truncate">{e.name}</p>
                <p className="text-[7px] text-slate-400 truncate">{e.role}</p>
              </div>
              <span className="text-[8px] font-black text-slate-700 w-14 text-right">{e.salary}</span>
              <span className="text-[7px] bg-emerald-100 text-emerald-700 font-black px-1 py-0.5 rounded-full w-10 text-center ml-1">Active</span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 mt-1">
            <span className="text-[7px] text-slate-500">4 employees · $14,400 gross</span>
            <span className="text-[7px] font-black text-blue-600">$288 IFB fee (2%)</span>
          </div>
        </div>
        <button className="w-full bg-blue-600 text-white text-[9px] font-black py-2 rounded-xl">Run Monthly Payroll</button>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
          <p className="text-[8px] font-black text-amber-800 mb-2">Confirm Payroll Deduction</p>
          <p className="text-[8px] text-amber-700">Deduct <span className="font-black">$14,688</span> from Liquid balance?</p>
          <div className="flex gap-2 mt-2">
            <button className="flex-1 bg-white border border-slate-200 text-slate-600 text-[8px] font-black py-1.5 rounded-xl">Cancel</button>
            <button className="flex-1 bg-blue-600 text-white text-[8px] font-black py-1.5 rounded-xl">Confirm</button>
          </div>
        </div>
      </div>
    </MockupShell>
  );
}

// Slide 8 Mockup
function Slide8Mockup() {
  const plans = [
    { name: 'IFB ACCESS', price: '$650', hours: '20–36 hrs', popular: false, features: ['Business diagnosis', 'Market validation', 'Basic pitch deck', '2–4 advisory sessions'] },
    { name: 'IFB GROWTH', price: '$2,750', hours: '65–110 hrs', popular: true, features: ['Financial modeling', 'Investor-grade pitch deck', 'Data room prep', 'Weekly advisory'] },
    { name: 'IFB ELITE', price: '$6,000', hours: '100–160 hrs', popular: false, features: ['Capital strategy design', 'Term sheet negotiation', 'Legal docs prep', 'Institutional network'] },
  ];
  return (
    <MockupShell>
      <AppHeader title="VentureX" />
      <div className="flex-1 p-3 flex flex-col gap-2 overflow-hidden">
        <div className="flex gap-1.5">
          {plans.map((p) => (
            <div key={p.name} className={`flex-1 rounded-2xl border p-2 relative ${p.popular ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-white'}`}>
              {p.popular && <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[6px] bg-amber-400 text-white font-black px-1.5 py-0.5 rounded-full whitespace-nowrap">POPULAR</span>}
              <p className="text-[7px] font-black text-slate-800 mt-1">{p.name}</p>
              <p className={`text-[11px] font-black mt-0.5 ${p.popular ? 'text-amber-600' : 'text-blue-600'}`}>{p.price}</p>
              <p className="text-[6px] text-slate-400 mb-1">{p.hours}</p>
              {p.features.map(f => (
                <div key={f} className="flex items-start gap-0.5 mb-0.5">
                  <span className="text-emerald-500 text-[7px] flex-shrink-0">✓</span>
                  <span className="text-[6px] text-slate-600 leading-tight">{f}</span>
                </div>
              ))}
              <button className={`mt-1.5 w-full text-[7px] font-black py-1 rounded-lg ${p.popular ? 'bg-amber-400 text-white' : 'bg-blue-600 text-white'}`}>Select Plan</button>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-3">
          <p className="text-[8px] font-black text-slate-500 mb-2">Already have a listing?</p>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={14} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[8px] font-black text-slate-800 truncate">Simandou East Resources Corp</p>
              <p className="text-[7px] text-slate-500">$120M raise · 14% equity</p>
            </div>
            <span className="text-[6px] bg-blue-100 text-blue-700 font-black px-1 py-0.5 rounded-full flex-shrink-0">IFB Verified</span>
          </div>
        </div>
      </div>
    </MockupShell>
  );
}

// Slide 9 Mockup
function Slide9Mockup() {
  const pools = [
    { name: 'Health Protection Pool', price: '$85/mo', coverage: '$850', status: 'Active', members: '1,240', active: true, emoji: '🏥' },
    { name: 'Income Continuity Pool', price: '$45/mo', coverage: '$450', status: 'Join', members: '892', active: false, emoji: '💼' },
    { name: 'Life Safety Pool', price: '$120/mo', coverage: '$1,200', status: 'Join', members: '543', active: false, emoji: '🛡️' },
    { name: 'AgriShield Crop Pool', price: '$60/mo', coverage: '$600', status: 'Join', members: '2,100', active: false, emoji: '🌾' },
  ];
  return (
    <MockupShell>
      <AppHeader title="Clyrix Insurance" />
      <div className="flex-1 p-3 flex flex-col gap-2 overflow-hidden">
        <div className="grid grid-cols-2 gap-2">
          {pools.map((p) => (
            <div key={p.name} className={`bg-white rounded-2xl border p-2 ${p.active ? 'border-emerald-300' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-base">{p.emoji}</span>
                {p.active
                  ? <span className="text-[7px] bg-emerald-100 text-emerald-700 font-black px-1 py-0.5 rounded-full">Active</span>
                  : <button className="text-[7px] bg-blue-600 text-white font-black px-1.5 py-0.5 rounded-full">Join</button>
                }
              </div>
              <p className="text-[7px] font-black text-slate-800 leading-tight">{p.name}</p>
              <p className="text-[8px] font-black text-blue-600 mt-0.5">{p.price}</p>
              <p className="text-[6px] text-slate-500">Coverage: {p.coverage}</p>
              <p className="text-[6px] text-slate-400">{p.members} members</p>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Submit Claim</p>
          {[['Claim Title', 'Equipment breakdown — crusher'], ['Amount', '$12,000']].map(([l, v]) => (
            <div key={l} className="mb-1.5">
              <p className="text-[7px] text-slate-400">{l}</p>
              <div className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1"><span className="text-[8px] font-black text-slate-700">{v}</span></div>
            </div>
          ))}
          <button className="w-full bg-blue-600 text-white text-[8px] font-black py-1.5 rounded-xl mb-2">Submit Claim</button>
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-2">
            <CheckCircle2 size={12} className="text-emerald-600 flex-shrink-0" />
            <span className="text-[7px] text-emerald-700 font-black">87% trust score — Auto-approved</span>
          </div>
        </div>
      </div>
    </MockupShell>
  );
}

// Slide 10 Mockup
function Slide10Mockup() {
  const deals = [
    { name: 'Nairobi Tech Fund', min: '$2,500 min', irr: '18% IRR' },
    { name: 'West Africa Agri REIT', min: '$5,000 min', irr: '14% IRR' },
    { name: 'Sahel Solar Bond', min: '$1,000 min', irr: '12% IRR' },
  ];
  const segments = [
    { label: 'Liquid Capital', pct: 40, color: '#3b82f6', textColor: 'text-blue-600' },
    { label: 'Alpha Equity', pct: 25, color: '#a855f7', textColor: 'text-purple-600' },
    { label: 'AFR Tokens', pct: 20, color: '#f59e0b', textColor: 'text-amber-600' },
    { label: 'Safe Vault', pct: 15, color: '#64748b', textColor: 'text-slate-600' },
  ];
  // Build conic-gradient for donut
  let cumulativePct = 0;
  const gradientParts = segments.map(s => {
    const start = cumulativePct * 3.6;
    cumulativePct += s.pct;
    const end = cumulativePct * 3.6;
    return `${s.color} ${start}deg ${end}deg`;
  });
  const gradient = `conic-gradient(${gradientParts.join(', ')})`;
  return (
    <MockupShell>
      <AppHeader title="Investment" />
      <div className="flex-1 p-3 flex flex-col gap-2 overflow-hidden">
        <div className="bg-white rounded-2xl border border-slate-200 p-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div style={{ background: gradient, borderRadius: '50%', width: 72, height: 72 }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 bg-white rounded-full" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-[8px] text-slate-500">Total Portfolio</p>
              <p className="text-sm font-black text-slate-900">$278,150</p>
              <div className="mt-1 flex flex-col gap-0.5">
                {segments.map(s => (
                  <div key={s.label} className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-[7px] text-slate-600">{s.label}</span>
                    <span className={`text-[7px] font-black ml-auto ${s.textColor}`}>{s.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Alpha Deals</p>
        <div className="flex flex-col gap-1.5 flex-1">
          {deals.map(d => (
            <div key={d.name} className="bg-white rounded-xl border border-slate-200 p-2.5 flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <TrendingUp size={12} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[8px] font-black text-slate-800 truncate">{d.name}</p>
                <p className="text-[7px] text-slate-500">{d.min}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-[7px] font-black text-emerald-600">{d.irr}</span>
                <button className="text-[7px] bg-blue-600 text-white font-black px-1.5 py-0.5 rounded-lg">View</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MockupShell>
  );
}

// Slide 11 Mockup
function Slide11Mockup() {
  return (
    <MockupShell>
      <AppHeader title="NPO Hub" />
      <div className="flex-1 p-3 flex flex-col gap-2 overflow-hidden">
        <div className="bg-white rounded-2xl border border-slate-200 p-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">NGO Application</p>
          {[
            ['Legal Name', 'Sahel Reforestation Initiative'],
            ['Tax ID', 'NG-TIN-20240892'],
            ['Mission', 'Reforestation & climate action'],
            ['Sector', 'Environment'],
          ].map(([l, v]) => (
            <div key={l} className="mb-1.5">
              <p className="text-[7px] text-slate-400">{l}</p>
              <div className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1"><span className="text-[8px] font-black text-slate-700">{v}</span></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { name: 'Emerging Academy', desc: 'Cohorts · Mentorship · Micro-grants', selected: true },
            { name: 'Enterprise Hub', desc: 'Financial arch · Scaling loans · Compliance', selected: false },
          ].map(t => (
            <div key={t.name} className={`rounded-xl border p-2 ${t.selected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}>
              <div className={`w-3.5 h-3.5 rounded-full border-2 mb-1 flex items-center justify-center ${t.selected ? 'border-blue-600' : 'border-slate-300'}`}>
                {t.selected && <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
              </div>
              <p className={`text-[8px] font-black ${t.selected ? 'text-blue-700' : 'text-slate-700'}`}>{t.name}</p>
              <p className="text-[6px] text-slate-500 mt-0.5 leading-tight">{t.desc}</p>
            </div>
          ))}
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <ShieldCheck size={12} className="text-emerald-600" />
            <p className="text-[8px] font-black text-emerald-800">Impact Notarization</p>
          </div>
          <div className="bg-white border border-emerald-200 rounded-xl p-2">
            <p className="text-[8px] font-black text-slate-800">3,400 trees planted — Q1 2026</p>
            <div className="flex items-center gap-1 mt-1">
              <div className="bg-emerald-100 rounded-lg px-1.5 py-0.5 flex items-center gap-0.5">
                <span className="text-[6px] text-emerald-700 font-black">⛓ 0xb4f2...a8c1</span>
              </div>
              <span className="text-[6px] text-slate-400">Jun 1, 2026</span>
            </div>
          </div>
        </div>
      </div>
    </MockupShell>
  );
}

// Slide 12 Mockup
function Slide12Mockup() {
  const courses = [
    { name: 'Financial Modeling Basics', pct: 68, color: 'bg-blue-500' },
    { name: 'Investor Pitch Masterclass', pct: 0, color: 'bg-purple-500' },
    { name: 'IFB Compliance & KYC', pct: 100, color: 'bg-emerald-500' },
  ];
  return (
    <MockupShell>
      <AppHeader title="Network & Academy" />
      <div className="flex-1 p-3 flex flex-col gap-2 overflow-hidden">
        {/* Network Node */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">AFR Network Node</p>
          <svg viewBox="0 0 120 60" className="w-full h-16">
            {[[60,30],[20,10],[95,10],[10,45],[105,45],[30,55],[90,55]].slice(1).map(([x,y],i) => (
              <line key={i} x1="60" y1="30" x2={x} y2={y} stroke="#3b82f6" strokeWidth="0.8" strokeOpacity="0.5" />
            ))}
            {[[60,30],[20,10],[95,10],[10,45],[105,45],[30,55],[90,55]].map(([x,y],i) => (
              <circle key={i} cx={x} cy={y} r={i===0?7:4} fill={i===0?"#3b82f6":"#dbeafe"} stroke={i===0?"#1d4ed8":"#93c5fd"} strokeWidth="1" />
            ))}
            <text x="60" y="33" textAnchor="middle" fontSize="4" fill="white" fontWeight="bold">S</text>
          </svg>
          <div className="flex items-center justify-between">
            <span className="text-[8px] text-slate-500">Simandou Minerals Ltd</span>
            <span className="text-[7px] bg-emerald-100 text-emerald-700 font-black px-1.5 py-0.5 rounded-full">Node Active · 6 connections</span>
          </div>
        </div>
        {/* Referrals */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Capital Network (Referrals)</p>
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 mb-1.5">
            <span className="text-[8px] font-black text-blue-700 flex-1">deus.ifb.org/r/SMDMN24</span>
            <Copy size={10} className="text-slate-400 flex-shrink-0" />
          </div>
          <div className="flex gap-3">
            <div className="text-center"><p className="text-sm font-black text-slate-900">12</p><p className="text-[7px] text-slate-500">Referrals</p></div>
            <div className="text-center"><p className="text-sm font-black text-emerald-600">$4,800</p><p className="text-[7px] text-slate-500">Earned</p></div>
            <div className="flex items-end gap-0.5 ml-auto">
              {[20, 35, 25, 45, 30, 60].map((h, i) => (
                <div key={i} className="w-3 bg-blue-200 rounded-sm" style={{ height: h * 0.5 }} />
              ))}
            </div>
          </div>
        </div>
        {/* Academy */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3 flex-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">DEUS Academy</p>
          {courses.map((c) => (
            <div key={c.name} className="flex items-center gap-2 mb-2 last:mb-0">
              <div className="flex-1 min-w-0">
                <p className="text-[8px] font-black text-slate-800 truncate">{c.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="flex-1 bg-slate-100 rounded-full h-1">
                    <div className={`${c.color} rounded-full h-1`} style={{ width: `${c.pct}%` }} />
                  </div>
                  <span className="text-[7px] text-slate-500 flex-shrink-0 w-6 text-right">{c.pct}%</span>
                </div>
              </div>
              {c.pct === 100
                ? <span className="text-[7px] bg-emerald-100 text-emerald-700 font-black px-1.5 py-0.5 rounded-full flex-shrink-0">✓ Done</span>
                : c.pct === 0
                  ? <button className="text-[7px] bg-blue-600 text-white font-black px-1.5 py-0.5 rounded-lg flex-shrink-0">Start</button>
                  : <button className="text-[7px] bg-slate-100 text-slate-600 font-black px-1.5 py-0.5 rounded-lg flex-shrink-0">Resume</button>
              }
            </div>
          ))}
        </div>
      </div>
    </MockupShell>
  );
}

// Slide 13 Mockup
function Slide13Mockup({ lang }) {
  const slide = CONTENT[lang].slides[13];
  const stageLabels = [
    'Formation', 'KYC', 'Banking', 'Treasury', 'Payments',
    'Lending', 'Payroll', 'VentureX', 'Insurance', 'Investment',
    'NPO Hub', 'Network',
  ];
  return (
    <MockupShell>
      <AppHeader />
      <div className="flex-1 p-3 flex gap-2 overflow-hidden">
        {/* Timeline */}
        <div className="flex flex-col gap-0 w-24 flex-shrink-0">
          {stageLabels.map((s, i) => (
            <div key={s} className="flex items-start gap-1.5 relative">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[6px] font-black z-10 ${i < 6 ? 'bg-emerald-500 text-white' : i === 6 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {i < 6 ? '✓' : i + 1}
                </div>
                {i < stageLabels.length - 1 && <div className={`w-px flex-1 min-h-3 ${i < 6 ? 'bg-emerald-300' : 'bg-slate-200'}`} />}
              </div>
              <span className={`text-[7px] font-black mt-0.5 leading-tight ${i < 6 ? 'text-emerald-700' : i === 6 ? 'text-blue-700' : 'text-slate-400'}`}>{s}</span>
            </div>
          ))}
        </div>
        {/* CTA Card */}
        <div className="flex-1 flex flex-col gap-2">
          <div className="bg-white rounded-2xl border border-slate-200 p-3 text-center">
            <div className="text-lg font-black mb-0.5">
              <span className="text-[#4285F4]">D</span>
              <span className="text-[#EA4335]">E</span>
              <span className="text-[#FBBC04]">U</span>
              <span className="text-[#34A853]">S</span>
            </div>
            <p className="text-[7px] text-slate-500 mb-2">Download or access via web</p>
            {/* QR placeholder */}
            <div className="w-14 h-14 mx-auto mb-2 border-2 border-slate-200 rounded-lg overflow-hidden grid" style={{ gridTemplateColumns: 'repeat(7,1fr)', gap: 1, padding: 2 }}>
              {Array.from({ length: 49 }).map((_, i) => (
                <div key={i} className={`rounded-sm ${[0,1,2,3,4,5,6,7,13,14,20,21,22,23,24,25,26,27,28,35,36,42,43,44,45,46,47,48,10,16,30,38].includes(i) ? 'bg-slate-800' : 'bg-white'}`} />
              ))}
            </div>
            <p className="text-[6px] text-blue-600 font-black">deus.infinitefuturebank.org</p>
            <p className="text-[6px] text-slate-400">support@infinitefuturebank.org</p>
          </div>
          <div className="flex flex-col gap-1">
            {(slide.buttons || ['Download APK', 'Open Web App', 'Contact Us']).map((btn, i) => (
              <button key={btn} className={`w-full text-[8px] font-black py-1.5 rounded-xl ${i === 0 ? 'bg-blue-600 text-white' : i === 1 ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'}`}>{btn}</button>
            ))}
          </div>
        </div>
      </div>
    </MockupShell>
  );
}

// ─── SLIDE MOCKUP ROUTER ─────────────────────────────────────────────────────

function SlideMockup({ index, lang }) {
  switch (index) {
    case 0: return <Slide0Mockup lang={lang} />;
    case 1: return <Slide1Mockup lang={lang} />;
    case 2: return <Slide2Mockup />;
    case 3: return <Slide3Mockup />;
    case 4: return <Slide4Mockup />;
    case 5: return <Slide5Mockup />;
    case 6: return <Slide6Mockup />;
    case 7: return <Slide7Mockup />;
    case 8: return <Slide8Mockup />;
    case 9: return <Slide9Mockup />;
    case 10: return <Slide10Mockup />;
    case 11: return <Slide11Mockup />;
    case 12: return <Slide12Mockup />;
    case 13: return <Slide13Mockup lang={lang} />;
    default: return null;
  }
}

// ─── ASSESSMENT QUESTIONS ────────────────────────────────────────────────────

const QUESTIONS = {
  en: [
    {
      q: 'A startup wants to officially register their company and receive a digital incorporation certificate. Which DEUS stage handles this?',
      options: ['KYC Verification', 'Company Formation', 'Capital Raising', 'Banking Setup'],
      answer: 1,
      explanation: 'Stage 1 — Company Formation — lets you register your business digitally in minutes, generating articles of incorporation and a digital certificate recognised across jurisdictions.'
    },
    {
      q: 'Before a company can open a bank account or access financial services on DEUS, what must be completed first?',
      options: ['Payroll setup', 'KYC & Compliance verification', 'Insurance enrollment', 'Network profile creation'],
      answer: 1,
      explanation: 'KYC (Know Your Customer) verification is mandatory before any financial services are unlocked. DEUS verifies identity via ID documents, facial recognition, and director checks.'
    },
    {
      q: 'A company with 80 employees across 5 countries needs to pay salaries, generate payslips, and schedule deductions automatically each month. Which feature is used?',
      options: ['Organization Suite', 'Lending Module', 'Payroll Manager', 'Payment Links'],
      answer: 2,
      explanation: 'The Payroll Manager handles multi-country salary disbursement, automatic deductions, payslip generation, and scheduled payments — all compliant with local regulations.'
    },
    {
      q: 'An SME wants to raise $1.5 million privately from accredited investors without listing on a public exchange. Which DEUS option is most appropriate?',
      options: ['Capital Raising – Private Placement', 'VentureX Public Listing', 'NPO Hub Grant', 'Lending Credit Line'],
      answer: 0,
      explanation: 'Capital Raising – Private Placement lets companies raise funds from verified accredited investors through a secure due-diligence portal, without the requirements of a public listing.'
    },
    {
      q: 'A growth-stage company wants retail investors — including ordinary individuals — to buy shares publicly through IFB\'s marketplace. Which feature enables this?',
      options: ['Private Placement', 'Organization Suite', 'Clyrix Insurance', 'VentureX Public Listing'],
      answer: 3,
      explanation: 'VentureX is IFB\'s Venture Stock Exchange. Companies that graduate from private capital raising can list publicly, allowing retail and institutional investors to trade their shares.'
    },
    {
      q: 'A logistics company needs to protect its fleet, warehouse, and operations against theft, accidents, and natural disasters. Which IFB service covers this?',
      options: ['Lending Module', 'Clyrix Insurance Protocol', 'NPO Hub', 'Banking Sub-Accounts'],
      answer: 1,
      explanation: 'Clyrix is IFB\'s integrated insurance protocol. It provides asset protection, operational risk cover, employee health plans, and custom business policies — all managed inside DEUS.'
    },
    {
      q: 'A registered nonprofit organisation wants to receive and track donations, manage projects, and report impact metrics to its donors transparently. Which feature is purpose-built for this?',
      options: ['VentureX Listing', 'NPO Hub', 'Investment Portfolio', 'PayMe Card'],
      answer: 1,
      explanation: 'NPO Hub is designed specifically for nonprofits and NGOs — it manages donations, grant tracking, project reporting, and donor portals with full transparency and audit trails.'
    },
    {
      q: 'A company has successfully completed all 12 stages on IFB DEUS — from Formation through Network & Academy. What does this represent?',
      options: ['Eligibility to close the company', 'A pending KYC review', 'Access to one additional loan product', 'A complete digital business operating system — banking, capital, payments, insurance, and more'],
      answer: 3,
      explanation: 'Completing all 12 stages means the company has its full financial infrastructure in place: legal entity, verified identity, banking, payments, payroll, capital, insurance, investments, and global network access.'
    },
  ],
  fr: [
    {
      q: 'Une startup veut enregistrer officiellement sa société et recevoir un certificat d\'incorporation numérique. Quelle étape DEUS gère cela?',
      options: ['Vérification KYC', 'Formation de Société', 'Levée de Capitaux', 'Configuration Bancaire'],
      answer: 1,
      explanation: 'L\'étape 1 — Formation de Société — permet d\'enregistrer une entreprise numériquement en quelques minutes, générant statuts et certificat reconnus dans plusieurs juridictions.'
    },
    {
      q: 'Avant qu\'une entreprise puisse ouvrir un compte bancaire ou accéder aux services financiers sur DEUS, que doit-elle compléter en premier?',
      options: ['Configuration de la paie', 'Vérification KYC & Conformité', 'Souscription d\'assurance', 'Création de profil réseau'],
      answer: 1,
      explanation: 'La vérification KYC est obligatoire avant de débloquer tout service financier. DEUS vérifie l\'identité via documents, reconnaissance faciale et vérification des dirigeants.'
    },
    {
      q: 'Une entreprise de 80 employés dans 5 pays doit verser les salaires, générer les bulletins de paie et planifier les déductions automatiquement chaque mois. Quelle fonctionnalité est utilisée?',
      options: ['Suite Organisation', 'Module de Prêt', 'Gestionnaire de Paie', 'Liens de Paiement'],
      answer: 2,
      explanation: 'Le Gestionnaire de Paie gère les versements de salaires multi-pays, les déductions automatiques, la génération des bulletins de paie et les paiements planifiés.'
    },
    {
      q: 'Une PME veut lever 1,5 million $ en privé auprès d\'investisseurs accrédités sans s\'inscrire en bourse. Quelle option DEUS est la plus appropriée?',
      options: ['Levée de Capitaux – Placement Privé', 'Cotation Publique VentureX', 'Subvention NPO Hub', 'Ligne de Crédit'],
      answer: 0,
      explanation: 'Le Placement Privé permet de lever des fonds auprès d\'investisseurs accrédités vérifiés via un portail de due diligence sécurisé, sans les exigences d\'une cotation publique.'
    },
    {
      q: 'Une entreprise en croissance veut que des investisseurs particuliers puissent acheter ses actions publiquement via la place de marché d\'IFB. Quelle fonctionnalité permet cela?',
      options: ['Placement Privé', 'Suite Organisation', 'Assurance Clyrix', 'Cotation Publique VentureX'],
      answer: 3,
      explanation: 'VentureX est la Bourse de Valeurs d\'IFB. Les entreprises peuvent y coter leurs actions et permettre à des investisseurs particuliers et institutionnels d\'y accéder.'
    },
    {
      q: 'Une société de logistique veut protéger sa flotte, son entrepôt et ses opérations contre le vol, les accidents et les catastrophes naturelles. Quel service IFB couvre cela?',
      options: ['Module de Prêt', 'Protocole d\'Assurance Clyrix', 'NPO Hub', 'Sous-Comptes Bancaires'],
      answer: 1,
      explanation: 'Clyrix est le protocole d\'assurance intégré d\'IFB. Il offre la protection des actifs, la couverture des risques opérationnels, les plans de santé des employés et des polices sur mesure.'
    },
    {
      q: 'Une ONG enregistrée veut recevoir et suivre les dons, gérer ses projets et rapporter ses indicateurs d\'impact à ses donateurs de manière transparente. Quelle fonctionnalité est conçue pour cela?',
      options: ['Cotation VentureX', 'NPO Hub', 'Portefeuille d\'Investissement', 'Carte PayMe'],
      answer: 1,
      explanation: 'NPO Hub est conçu spécifiquement pour les ONG — il gère les dons, le suivi des subventions, les rapports de projets et les portails donateurs avec une transparence totale.'
    },
    {
      q: 'Une entreprise a complété avec succès les 12 étapes sur IFB DEUS — de la Formation au Réseau & Académie. Qu\'est-ce que cela représente?',
      options: ['L\'éligibilité à fermer l\'entreprise', 'Un examen KYC en attente', 'L\'accès à un prêt supplémentaire', 'Un système d\'exploitation d\'entreprise numérique complet'],
      answer: 3,
      explanation: 'Compléter les 12 étapes signifie que l\'entreprise dispose d\'une infrastructure financière complète: entité légale, identité vérifiée, banque, paiements, paie, capital, assurance, investissements et réseau mondial.'
    },
  ],
  es: [
    {
      q: 'Una startup quiere registrar oficialmente su empresa y recibir un certificado de incorporación digital. ¿Qué etapa de DEUS maneja esto?',
      options: ['Verificación KYC', 'Formación de Empresa', 'Captación de Capital', 'Configuración Bancaria'],
      answer: 1,
      explanation: 'La Etapa 1 — Formación de Empresa — permite registrar un negocio digitalmente en minutos, generando estatutos y un certificado reconocido en múltiples jurisdicciones.'
    },
    {
      q: 'Antes de que una empresa pueda abrir una cuenta bancaria o acceder a servicios financieros en DEUS, ¿qué debe completar primero?',
      options: ['Configuración de nómina', 'Verificación KYC & Cumplimiento', 'Inscripción en seguros', 'Creación de perfil de red'],
      answer: 1,
      explanation: 'La verificación KYC es obligatoria antes de desbloquear cualquier servicio financiero. DEUS verifica la identidad mediante documentos, reconocimiento facial y verificación de directores.'
    },
    {
      q: 'Una empresa con 80 empleados en 5 países necesita pagar salarios, generar recibos de sueldo y programar deducciones automáticamente cada mes. ¿Qué función se usa?',
      options: ['Suite de Organización', 'Módulo de Préstamos', 'Gestor de Nómina', 'Enlaces de Pago'],
      answer: 2,
      explanation: 'El Gestor de Nómina maneja el pago de salarios multinacional, deducciones automáticas, generación de recibos de sueldo y pagos programados, todo conforme a regulaciones locales.'
    },
    {
      q: 'Una PYME quiere recaudar $1.5 millones de forma privada de inversores acreditados sin cotizar en bolsa pública. ¿Qué opción de DEUS es más apropiada?',
      options: ['Captación de Capital – Colocación Privada', 'Cotización Pública VentureX', 'Subvención NPO Hub', 'Línea de Crédito'],
      answer: 0,
      explanation: 'La Colocación Privada permite recaudar fondos de inversores acreditados verificados a través de un portal de due diligence seguro, sin los requisitos de una cotización pública.'
    },
    {
      q: 'Una empresa en crecimiento quiere que inversores minoristas — incluyendo particulares — compren acciones públicamente a través del mercado de IFB. ¿Qué función lo permite?',
      options: ['Colocación Privada', 'Suite de Organización', 'Seguro Clyrix', 'Cotización Pública VentureX'],
      answer: 3,
      explanation: 'VentureX es la Bolsa de Valores de IFB. Las empresas pueden cotizar allí y permitir que inversores minoristas e institucionales negocien sus acciones públicamente.'
    },
    {
      q: 'Una empresa de logística necesita proteger su flota, almacén y operaciones contra robo, accidentes y desastres naturales. ¿Qué servicio de IFB cubre esto?',
      options: ['Módulo de Préstamos', 'Protocolo de Seguro Clyrix', 'NPO Hub', 'Subcuentas Bancarias'],
      answer: 1,
      explanation: 'Clyrix es el protocolo de seguros integrado de IFB. Ofrece protección de activos, cobertura de riesgos operativos, planes de salud para empleados y pólizas personalizadas.'
    },
    {
      q: 'Una ONG registrada quiere recibir y rastrear donaciones, gestionar proyectos e informar métricas de impacto a sus donantes de forma transparente. ¿Qué función está diseñada para esto?',
      options: ['Cotización VentureX', 'NPO Hub', 'Portafolio de Inversión', 'Tarjeta PayMe'],
      answer: 1,
      explanation: 'NPO Hub está diseñado específicamente para ONG — gestiona donaciones, seguimiento de subvenciones, reportes de proyectos y portales de donantes con total transparencia.'
    },
    {
      q: 'Una empresa ha completado con éxito las 12 etapas en IFB DEUS — desde Formación hasta Red & Academia. ¿Qué representa esto?',
      options: ['Elegibilidad para cerrar la empresa', 'Una revisión KYC pendiente', 'Acceso a un préstamo adicional', 'Un sistema operativo empresarial digital completo — banca, capital, pagos, seguros y más'],
      answer: 3,
      explanation: 'Completar las 12 etapas significa que la empresa tiene toda su infraestructura financiera: entidad legal, identidad verificada, banca, pagos, nómina, capital, seguros, inversiones y red global.'
    },
  ],
};

const CERT_LABELS = {
  en: { title: 'Certificate of Completion', program: 'Business Operations Program', issuer: 'Issued by Infinite Future Bank LLC · Washington DC', nameLabel: 'Enter your name', score: 'Assessment Score', retake: 'Retake Assessment', returnGuide: 'Return to Guide', perfect: 'Outstanding — Perfect Score!', great: 'Excellent Result', pass: 'Assessment Passed', retry: 'Keep Practising', date: 'Completion Date' },
  fr: { title: 'Certificat de Réussite', program: 'Programme des Opérations d\'Entreprise', issuer: 'Délivré par Infinite Future Bank LLC · Washington DC', nameLabel: 'Entrez votre nom', score: 'Score d\'Évaluation', retake: 'Reprendre l\'Évaluation', returnGuide: 'Retour au Guide', perfect: 'Excellent — Score Parfait!', great: 'Excellent Résultat', pass: 'Évaluation Réussie', retry: 'Continuez à Pratiquer', date: 'Date de Réussite' },
  es: { title: 'Certificado de Finalización', program: 'Programa de Operaciones Empresariales', issuer: 'Emitido por Infinite Future Bank LLC · Washington DC', nameLabel: 'Ingrese su nombre', score: 'Puntuación de Evaluación', retake: 'Repetir Evaluación', returnGuide: 'Volver a la Guía', perfect: '¡Sobresaliente — Puntuación Perfecta!', great: 'Excelente Resultado', pass: 'Evaluación Aprobada', retry: 'Sigue Practicando', date: 'Fecha de Finalización' },
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function CompanyGuide({ onClose } = {}) {
  const [slide, setSlide] = useState(0);
  const [mode, setMode] = useState('course'); // 'course' | 'assessment' | 'certificate'
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [certName, setCertName] = useState('');
  const [lang, setLang] = useState('en');
  const [touchStart, setTouchStart] = useState(null);

  const TOTAL = 14;

  const goNext = useCallback(() => setSlide(s => Math.min(s + 1, TOTAL - 1)), []);
  const goPrev = useCallback(() => setSlide(s => Math.max(s - 1, 0)), []);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev]);

  // Touch / swipe
  const handleTouchStart = (e) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e) => {
    if (touchStart === null) return;
    const delta = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 50) {
      if (delta > 0) goNext();
      else goPrev();
    }
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
  const nextQuestion = () => {
    if (qIndex < totalQ - 1) setQIndex(q => q + 1);
    else setMode('certificate');
  };
  const retakeAssessment = () => { setMode('assessment'); setQIndex(0); setAnswers({}); };
  const returnToGuide = () => { setMode('course'); setSlide(0); setQIndex(0); setAnswers({}); };

  const counterLabel =
    mode === 'assessment' ? `Q${qIndex + 1} / ${totalQ}`
    : mode === 'certificate' ? (certLabels.title)
    : `${slide + 1} / ${TOTAL}`;

  const topLangToggle = (
    <div className="flex items-center gap-1 bg-slate-800 rounded-xl p-1 flex-shrink-0">
      {(['en', 'fr', 'es']).map((l) => (
        <button key={l} onClick={() => setLang(l)}
          className={`text-[10px] font-black px-2 py-1 rounded-lg transition-colors ${lang === l ? 'bg-white text-slate-900' : 'text-white'}`}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );

  return (
    <div
      className={`bg-[#0a0f1e] flex flex-col select-none ${onClose ? 'fixed inset-0 z-[9999]' : 'min-h-screen'}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── TOP BAR ── */}
      <div className="bg-[#0a0f1e] border-b border-slate-800 px-4 py-3 flex items-center justify-between flex-shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl font-black flex-shrink-0">
            <span className="text-[#4285F4]">D</span>
            <span className="text-[#EA4335]">E</span>
            <span className="text-[#FBBC04]">U</span>
            <span className="text-[#34A853]">S</span>
          </span>
          <span className="hidden sm:inline text-slate-500 text-xs font-medium truncate">
            {mode === 'certificate' ? 'Certificate' : mode === 'assessment' ? 'Assessment' : 'Business Guide'}
          </span>
        </div>
        <span className="text-slate-400 text-xs font-black flex-shrink-0">{counterLabel}</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {topLangToggle}
          {onClose && (
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ══════════ CERTIFICATE MODE ══════════ */}
      {mode === 'certificate' && (() => {
        const passed = score >= 6;
        const perfect = score === totalQ;
        const badge = perfect ? 'bg-yellow-500 text-slate-900' : passed ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-slate-900';
        const verdict = perfect ? certLabels.perfect : passed ? certLabels.great : score >= 5 ? certLabels.pass : certLabels.retry;
        const today = new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : lang === 'es' ? 'es-ES' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        return (
          <div className="flex-1 overflow-y-auto flex items-center justify-center p-4 sm:p-8">
            <div className="w-full max-w-xl">
              {/* Certificate card */}
              <div className="relative bg-slate-900 rounded-3xl p-6 sm:p-10 border-2 border-amber-500/40 shadow-[0_0_60px_rgba(245,158,11,0.15)]">
                <div className="absolute inset-0 rounded-3xl border border-amber-400/10 m-1 pointer-events-none" />
                {/* Header */}
                <div className="text-center mb-6">
                  <div className="text-3xl font-black mb-1">
                    <span className="text-[#4285F4]">D</span><span className="text-[#EA4335]">E</span><span className="text-[#FBBC04]">U</span><span className="text-[#34A853]">S</span>
                  </div>
                  <p className="text-amber-400 text-[10px] font-black uppercase tracking-[0.2em]">Infinite Future Bank</p>
                </div>
                <div className="text-center mb-6">
                  <Award size={40} className="text-amber-400 mx-auto mb-3" />
                  <h2 className="text-xl sm:text-2xl font-black text-white mb-1">{certLabels.title}</h2>
                  <p className="text-slate-400 text-sm font-medium">{certLabels.program}</p>
                </div>
                {/* Name input */}
                <div className="mb-6">
                  <input
                    type="text"
                    value={certName}
                    onChange={(e) => setCertName(e.target.value)}
                    placeholder={certLabels.nameLabel}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-center text-white font-black text-lg placeholder:text-slate-500 outline-none focus:border-amber-400 transition-colors"
                  />
                  {certName && (
                    <p className="text-center text-amber-300 font-black text-sm mt-2">{certName}</p>
                  )}
                </div>
                {/* Score */}
                <div className={`${badge} rounded-2xl py-3 px-5 text-center mb-4`}>
                  <p className="text-sm font-black">{certLabels.score}: {score} / {totalQ}</p>
                  <p className="text-xs font-bold mt-0.5 opacity-80">{verdict}</p>
                </div>
                {/* Date & issuer */}
                <div className="text-center text-slate-500 text-[11px] font-medium mb-6">
                  <p>{certLabels.date}: {today}</p>
                  <p className="mt-1">{certLabels.issuer}</p>
                </div>
                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={retakeAssessment}
                    className="flex-1 py-3 rounded-2xl border border-slate-600 text-slate-300 text-sm font-black hover:bg-slate-800 transition-colors">
                    {certLabels.retake}
                  </button>
                  <button onClick={returnToGuide}
                    className="flex-1 py-3 rounded-2xl bg-blue-600 text-white text-sm font-black hover:bg-blue-700 transition-colors">
                    {certLabels.returnGuide}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══════════ ASSESSMENT MODE ══════════ */}
      {mode === 'assessment' && (
        <div className="flex-1 overflow-y-auto flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-xl">
            {/* Progress dots */}
            <div className="flex gap-1.5 mb-6 justify-center">
              {questions.map((_, i) => (
                <div key={i}
                  className={`h-1.5 rounded-full transition-all ${i < qIndex ? 'bg-blue-500 w-6' : i === qIndex ? 'bg-blue-400 w-8' : 'bg-slate-700 w-4'}`} />
              ))}
            </div>
            {/* Question */}
            <h2 className="text-white font-black text-lg sm:text-xl mb-6 leading-snug">{currentQ.q}</h2>
            {/* Options */}
            <div className="flex flex-col gap-3 mb-6">
              {currentQ.options.map((opt, i) => {
                let cls = 'border-slate-700 text-slate-300 hover:border-blue-500 hover:bg-slate-800';
                if (isAnswered) {
                  if (i === currentQ.answer) cls = 'border-emerald-500 bg-emerald-500/10 text-emerald-300';
                  else if (i === selectedAnswer) cls = 'border-red-500 bg-red-500/10 text-red-300';
                  else cls = 'border-slate-800 text-slate-600';
                }
                return (
                  <button key={i} onClick={() => selectAnswer(i)}
                    className={`text-left border rounded-2xl px-5 py-4 text-sm font-bold transition-all flex items-center gap-3 ${cls}`}>
                    <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-[10px] font-black flex-shrink-0">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>
            {/* Explanation */}
            {isAnswered && (
              <div className={`rounded-2xl p-4 mb-6 text-sm font-medium leading-relaxed ${selectedAnswer === currentQ.answer ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/10 text-red-300 border border-red-500/30'}`}>
                {currentQ.explanation}
              </div>
            )}
            {/* Next */}
            {isAnswered && (
              <button onClick={nextQuestion}
                className="w-full py-4 rounded-2xl bg-blue-600 text-white font-black text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                {qIndex < totalQ - 1 ? (<><span>{content.next}</span><ChevronRight size={16} /></>) : (<><Award size={16} /><span>{lang === 'fr' ? 'Voir le Certificat' : lang === 'es' ? 'Ver Certificado' : 'View Certificate'}</span></>)}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ══════════ COURSE MODE ══════════ */}
      {mode === 'course' && (
        <>
          <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
            {/* Left panel */}
            <div className="flex-1 flex flex-col justify-center px-5 py-6 lg:px-12 lg:py-12 order-2 lg:order-1">
              <div className="max-w-xl">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{currentSlide.stage}</span>
                  {slide > 0 && slide < 13 && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">· Stage {slide} of 12</span>
                  )}
                </div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white leading-tight mb-3">
                  {currentSlide.title}
                </h1>
                <p className="text-slate-300 text-sm lg:text-base font-medium mb-4 leading-relaxed">
                  {currentSlide.subtitle}
                </p>
                {currentSlide.body && (
                  <p className="text-slate-400 text-sm mb-4 leading-relaxed">{currentSlide.body}</p>
                )}
                {currentSlide.features && (
                  <ul className="flex flex-col gap-2 mb-4">
                    {currentSlide.features.map((f) => (
                      <li key={f} className="flex items-start gap-3">
                        <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <CheckCircle2 size={9} className="text-white" />
                        </div>
                        <span className="text-slate-300 text-sm leading-relaxed">{f}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {currentSlide.details && (
                  <div className="bg-slate-800/60 rounded-2xl p-4 mb-4 border border-slate-700/50">
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">How it works</p>
                    <ul className="flex flex-col gap-1.5">
                      {currentSlide.details.map((d, i) => (
                        <li key={i} className="flex items-start gap-2 text-slate-300 text-xs leading-relaxed">
                          <span className="text-blue-400 font-black flex-shrink-0">{i + 1}.</span>
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {currentSlide.scenario && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-3 mb-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-1">Real-world example</p>
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
                    {(currentSlide.buttons || ['Download APK', 'Open Web App', 'Contact Us']).map((btn, i) => (
                      <a key={btn}
                        href={i === 0 ? '#' : i === 1 ? 'https://deus.infinitefuturebank.org' : 'mailto:support@infinitefuturebank.org'}
                        className={`px-5 py-2.5 rounded-xl text-sm font-black transition-opacity hover:opacity-90 ${i === 0 ? 'bg-blue-600 text-white' : i === 1 ? 'bg-white text-slate-900' : 'border border-slate-600 text-white'}`}>
                        {btn}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* Right panel — hidden on mobile */}
            <div className="hidden lg:flex lg:w-[440px] xl:w-[500px] items-center justify-center px-6 py-8 order-1 lg:order-2 bg-slate-900 lg:bg-transparent flex-shrink-0">
              <div className="w-full">
                <SlideMockup index={slide} lang={lang} />
              </div>
            </div>
          </div>

          {/* ── BOTTOM NAV ── */}
          <div className="bg-[#0a0f1e] border-t border-slate-800 px-4 py-3 flex items-center justify-between flex-shrink-0 gap-2">
            <button onClick={goPrev} disabled={slide === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-700 text-slate-300 text-sm font-black hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0">
              <ChevronLeft size={15} />
              <span className="hidden sm:inline">{content.prev}</span>
            </button>
            <div className="flex items-center gap-1 flex-wrap justify-center">
              {Array.from({ length: TOTAL }).map((_, i) => (
                <button key={i} onClick={() => setSlide(i)}
                  className={`rounded-full transition-all ${i === slide ? 'w-4 h-2 bg-blue-500' : 'w-2 h-2 bg-slate-600 hover:bg-slate-500'}`}
                  aria-label={`Slide ${i + 1}`} />
              ))}
            </div>
            {slide < TOTAL - 1 ? (
              <button onClick={goNext}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-black hover:bg-blue-700 transition-colors flex-shrink-0">
                <span className="hidden sm:inline">{content.next}</span>
                <ChevronRight size={15} />
              </button>
            ) : (
              <button onClick={startAssessment}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 text-slate-900 text-sm font-black hover:bg-amber-400 transition-colors flex-shrink-0">
                <Award size={14} />
                <span className="hidden xs:inline sm:inline">{lang === 'fr' ? 'Évaluation' : lang === 'es' ? 'Evaluación' : 'Assessment'}</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
