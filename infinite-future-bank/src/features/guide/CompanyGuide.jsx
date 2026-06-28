import { useState } from 'react';
import {
  ChevronLeft, ChevronRight, X, Award, CheckCircle2,
  Building2, Globe, ShieldCheck, Landmark, CreditCard, TrendingUp,
  Users, BarChart3, Leaf, FileText, Shield, Wifi, ArrowLeft,
  Check, Star, Rocket, Zap, Clock, DollarSign, Lock,
  Compass, Bell, Menu, ArrowRightLeft, Download, Plus
} from 'lucide-react';

// ─── SLIDE DATA ───────────────────────────────────────────────────────────────
const SLIDES = [
  {
    id: 'overview', noTap: true,
    title: { en: 'The IFB Business Suite', fr: 'La Suite Entreprise IFB', es: 'El Suite de Negocios IFB' },
    path:  { en: 'Menu → Business', fr: 'Menu → Entreprise', es: 'Menú → Negocio' },
    prompt: { en: '', fr: '', es: '' },
    explain: {
      en: 'DEUS gives every business 14 integrated tools — from legal formation and KYC to banking, capital raising, insurance, payroll, and an IPO pipeline. Everything runs inside one app, with no third-party logins.',
      fr: 'DEUS offre à chaque entreprise 14 outils intégrés — de la formation juridique et KYC à la banque, la levée de fonds, l\'assurance, la paie et un pipeline d\'introduction en bourse. Tout fonctionne dans une seule application.',
      es: 'DEUS le da a cada empresa 14 herramientas integradas — desde formación legal y KYC hasta banca, captación de capital, seguros, nómina y un pipeline de IPO. Todo funciona dentro de una sola app.',
    },
    tip: { en: 'Access Business tools via Menu → Business Hub.', fr: 'Accédez aux outils Entreprise via Menu → Hub Entreprise.', es: 'Accede a herramientas de Negocio vía Menú → Hub de Negocios.' },
  },
  {
    id: 'formation', hl: 'formBtn',
    title: { en: 'Company Formation', fr: 'Création d\'Entreprise', es: 'Constitución de Empresa' },
    path:  { en: 'Menu → Business → Formation', fr: 'Menu → Entreprise → Formation', es: 'Menú → Negocio → Constitución' },
    prompt: { en: 'Tap Start Formation to begin the process', fr: 'Appuyez sur Commencer la Formation pour démarrer', es: 'Toca Iniciar Constitución para comenzar' },
    explain: {
      en: 'IFB can form your company in 20+ jurisdictions — Wyoming LLC, Delaware C-Corp, UK Ltd, UAE Free Zone, Singapore, and more. Select your country, choose the entity type, and pay online. Documents are filed on your behalf within the stated timeline.',
      fr: 'IFB peut former votre entreprise dans plus de 20 juridictions — Wyoming LLC, Delaware C-Corp, UK Ltd, Zone Franche UAE, Singapour et plus. Sélectionnez votre pays, choisissez le type d\'entité et payez en ligne.',
      es: 'IFB puede constituir tu empresa en más de 20 jurisdicciones — Wyoming LLC, Delaware C-Corp, UK Ltd, Zona Franca UAE, Singapur y más. Selecciona tu país, elige el tipo de entidad y paga en línea.',
    },
    tip: { en: 'Wyoming LLC: $699, no residency required, same-week formation.', fr: 'Wyoming LLC: 699$, pas de résidence requise, formation en une semaine.', es: 'Wyoming LLC: $699, sin requisito de residencia, constitución en una semana.' },
  },
  {
    id: 'kyc', hl: 'kycBtn',
    title: { en: 'KYC — Identity Verification', fr: 'KYC — Vérification d\'Identité', es: 'KYC — Verificación de Identidad' },
    path:  { en: 'Menu → Business → KYC', fr: 'Menu → Entreprise → KYC', es: 'Menú → Negocio → KYC' },
    prompt: { en: 'Tap Start Verification to begin KYC', fr: 'Appuyez sur Démarrer la Vérification pour commencer le KYC', es: 'Toca Iniciar Verificación para comenzar el KYC' },
    explain: {
      en: 'Know Your Customer (KYC) is required for full banking access. DEUS guides you through: ID document upload, selfie capture, and business document submission. The whole flow takes under 10 minutes. You\'ll see a pending banner until approval.',
      fr: 'Le KYC est requis pour l\'accès bancaire complet. DEUS vous guide à travers: téléchargement de document d\'identité, capture de selfie et soumission de documents d\'entreprise. Le flux complet prend moins de 10 minutes.',
      es: 'El KYC es requerido para acceso bancario completo. DEUS te guía a través de: carga de documento de identidad, captura de selfie y envío de documentos empresariales. El flujo completo toma menos de 10 minutos.',
    },
    tip: { en: 'Use natural lighting for the selfie — dark photos cause rejections.', fr: 'Utilisez la lumière naturelle pour le selfie — les photos sombres causent des rejets.', es: 'Usa luz natural para el selfie — las fotos oscuras causan rechazos.' },
  },
  {
    id: 'banking', hl: 'openAcctBtn',
    title: { en: 'Business Banking Account', fr: 'Compte Bancaire d\'Entreprise', es: 'Cuenta Bancaria Empresarial' },
    path:  { en: 'Menu → Business → Banking', fr: 'Menu → Entreprise → Banque', es: 'Menú → Negocio → Banca' },
    prompt: { en: 'Tap Open Business Account to activate', fr: 'Appuyez sur Ouvrir Compte Entreprise pour activer', es: 'Toca Abrir Cuenta Empresarial para activar' },
    explain: {
      en: 'Once KYC is approved, open your IFB Business Account. You get a multi-currency IBAN (USD, EUR, GBP), a dedicated business routing number, team sub-accounts, and a corporate virtual card — all tied to your registered entity.',
      fr: 'Une fois le KYC approuvé, ouvrez votre Compte Entreprise IFB. Vous obtenez un IBAN multi-devises (USD, EUR, GBP), un numéro de routage dédié, des sous-comptes d\'équipe et une carte virtuelle d\'entreprise.',
      es: 'Una vez aprobado el KYC, abre tu Cuenta Empresarial IFB. Obtienes un IBAN multi-moneda (USD, EUR, GBP), número de enrutamiento dedicado, subcuentas de equipo y una tarjeta virtual corporativa.',
    },
    tip: { en: 'Business accounts come with a free $10,000 SWIFT tier per month.', fr: 'Les comptes d\'entreprise incluent un niveau SWIFT gratuit de 10 000$/mois.', es: 'Las cuentas empresariales incluyen un nivel SWIFT gratuito de $10,000/mes.' },
  },
  {
    id: 'capital', hl: 'listBtn',
    title: { en: 'Capital Raising — VentureX', fr: 'Levée de Fonds — VentureX', es: 'Captación de Capital — VentureX' },
    path:  { en: 'Menu → Business → VentureX', fr: 'Menu → Entreprise → VentureX', es: 'Menú → Negocio → VentureX' },
    prompt: { en: 'Tap List Company to publish your raise', fr: 'Appuyez sur Inscrire l\'Entreprise pour publier votre levée', es: 'Toca Listar Empresa para publicar tu captación' },
    explain: {
      en: 'VentureX is IFB\'s private capital marketplace. List your company to connect with angel investors, venture capital firms, and strategic partners from the IFB network. You set the raise amount, equity offered, and valuation.',
      fr: 'VentureX est le marché de capital privé d\'IFB. Inscrivez votre entreprise pour vous connecter avec des investisseurs providentiels, des sociétés de capital-risque et des partenaires stratégiques.',
      es: 'VentureX es el mercado de capital privado de IFB. Lista tu empresa para conectarte con inversores ángel, firmas de capital de riesgo y socios estratégicos de la red IFB.',
    },
    tip: { en: 'Complete your company profile and attach a pitch deck before listing.', fr: 'Complétez votre profil d\'entreprise et joignez un pitch deck avant de vous inscrire.', es: 'Completa tu perfil de empresa y adjunta un pitch deck antes de listar.' },
  },
  {
    id: 'insurance', hl: 'quoteBtn',
    title: { en: 'Business Insurance', fr: 'Assurance Entreprise', es: 'Seguro Empresarial' },
    path:  { en: 'Menu → Business → Insurance', fr: 'Menu → Entreprise → Assurance', es: 'Menú → Negocio → Seguro' },
    prompt: { en: 'Tap Get Quote to see your insurance options', fr: 'Appuyez sur Obtenir un Devis pour voir vos options d\'assurance', es: 'Toca Obtener Cotización para ver tus opciones de seguro' },
    explain: {
      en: 'IFB partners with global insurers to offer E&O (Errors & Omissions), General Liability, D&O (Directors & Officers), and Cyber insurance — all quoted inside the app. Coverage activates within 24 hours of payment.',
      fr: 'IFB s\'associe à des assureurs mondiaux pour offrir l\'assurance Erreurs & Omissions, Responsabilité Civile, Administrateurs & Dirigeants, et Cyber — tout est devisé dans l\'application.',
      es: 'IFB se asocia con aseguradoras globales para ofrecer seguros E&O (Errores y Omisiones), Responsabilidad General, D&O (Directores y Funcionarios) y Ciberseguro — todos cotizados dentro de la app.',
    },
    tip: { en: 'E&O coverage is required before you can raise capital on VentureX.', fr: 'La couverture E&O est requise avant de pouvoir lever des fonds sur VentureX.', es: 'La cobertura E&O es requerida antes de poder captar capital en VentureX.' },
  },
  {
    id: 'payroll', hl: 'addEmpBtn',
    title: { en: 'Payroll & Team Payments', fr: 'Paie & Paiements d\'Équipe', es: 'Nómina y Pagos de Equipo' },
    path:  { en: 'Menu → Business → Payroll', fr: 'Menu → Entreprise → Paie', es: 'Menú → Negocio → Nómina' },
    prompt: { en: 'Tap Add Employee to register a team member', fr: 'Appuyez sur Ajouter un Employé pour enregistrer un membre', es: 'Toca Agregar Empleado para registrar un miembro del equipo' },
    explain: {
      en: 'DEUS Payroll lets you add employees or contractors, set their salary in any currency, and schedule automatic monthly or bi-weekly disbursements from your business account. Full pay-slip generation included.',
      fr: 'DEUS Paie vous permet d\'ajouter des employés ou sous-traitants, de définir leur salaire dans n\'importe quelle devise et de planifier des versements automatiques mensuels ou bimensuels depuis votre compte d\'entreprise.',
      es: 'DEUS Nómina te permite agregar empleados o contratistas, establecer su salario en cualquier moneda y programar desembolsos automáticos mensuales o quincenales desde tu cuenta empresarial.',
    },
    tip: { en: 'Payroll uses the Community of Trust network — fees under 1%.', fr: 'La paie utilise le réseau Communauté de Confiance — frais inférieurs à 1%.', es: 'La nómina usa la red Comunidad de Confianza — tarifas menores al 1%.' },
  },
  {
    id: 'analytics', hl: 'reportBtn',
    title: { en: 'Business Analytics', fr: 'Analytique Entreprise', es: 'Analítica Empresarial' },
    path:  { en: 'Menu → Business → Analytics', fr: 'Menu → Entreprise → Analytique', es: 'Menú → Negocio → Analítica' },
    prompt: { en: 'Tap View Report to open analytics dashboard', fr: 'Appuyez sur Voir le Rapport pour ouvrir le tableau de bord', es: 'Toca Ver Reporte para abrir el panel de analítica' },
    explain: {
      en: 'The Analytics dashboard shows revenue trends, expense breakdowns, payroll costs, and cash-flow forecasts. Data updates in real-time from your transaction history. Export any report as CSV or PDF.',
      fr: 'Le tableau de bord Analytique montre les tendances de revenus, la répartition des dépenses, les coûts de paie et les prévisions de trésorerie. Les données se mettent à jour en temps réel.',
      es: 'El panel de Analítica muestra tendencias de ingresos, desglose de gastos, costos de nómina y proyecciones de flujo de caja. Los datos se actualizan en tiempo real desde tu historial de transacciones.',
    },
    tip: { en: 'Use the Revenue Forecast chart before applying for a business loan.', fr: 'Utilisez le graphique de Prévision des Revenus avant de demander un prêt d\'entreprise.', es: 'Usa el gráfico de Pronóstico de Ingresos antes de solicitar un préstamo empresarial.' },
  },
  {
    id: 'documents', hl: 'dlBtn',
    title: { en: 'Corporate Documents', fr: 'Documents d\'Entreprise', es: 'Documentos Corporativos' },
    path:  { en: 'Menu → Business → Documents', fr: 'Menu → Entreprise → Documents', es: 'Menú → Negocio → Documentos' },
    prompt: { en: 'Tap Download to retrieve your corporate docs', fr: 'Appuyez sur Télécharger pour récupérer vos documents', es: 'Toca Descargar para obtener tus documentos corporativos' },
    explain: {
      en: 'All formation documents — Certificate of Incorporation, Operating Agreement, EIN letter, registered agent confirmation — are stored securely in the Documents vault. Download or share them anytime, signed and notarized.',
      fr: 'Tous les documents de formation — Certificat d\'Incorporation, Accord d\'Exploitation, lettre EIN, confirmation d\'agent enregistré — sont stockés en sécurité dans le coffre Documents.',
      es: 'Todos los documentos de constitución — Certificado de Incorporación, Acuerdo Operativo, carta EIN, confirmación de agente registrado — se almacenan de forma segura en el bóveda de Documentos.',
    },
    tip: { en: 'Share documents directly from the app for banking or investor due diligence.', fr: 'Partagez des documents directement depuis l\'application pour les due diligences.', es: 'Comparte documentos directamente desde la app para due diligence bancaria o de inversores.' },
  },
  {
    id: 'vault', hl: 'lockBtn',
    title: { en: 'Business Vault', fr: 'Coffre d\'Entreprise', es: 'Bóveda Empresarial' },
    path:  { en: 'Home → Vault', fr: 'Accueil → Coffre', es: 'Inicio → Bóveda' },
    prompt: { en: 'Tap Lock Funds to move capital into the vault', fr: 'Appuyez sur Verrouiller les Fonds pour transférer du capital dans le coffre', es: 'Toca Bloquear Fondos para mover capital a la bóveda' },
    explain: {
      en: 'The Vault is a ring-fenced reserve account within your business account. Lock funds for payroll reserves, tax obligations, or investor escrow. Vaulted funds earn yield and can only be released by authorized signatories.',
      fr: 'Le Coffre est un compte de réserve isolé dans votre compte d\'entreprise. Bloquez des fonds pour les réserves de paie, les obligations fiscales ou les escrows investisseurs. Les fonds du coffre génèrent des rendements.',
      es: 'La Bóveda es una cuenta de reserva aislada dentro de tu cuenta empresarial. Bloquea fondos para reservas de nómina, obligaciones fiscales o escrow de inversores. Los fondos en bóveda generan rendimiento.',
    },
    tip: { en: 'Set up auto-lock rules: e.g. lock 15% of every incoming payment for taxes.', fr: 'Configurez des règles de verrouillage automatique: ex. bloquez 15% de chaque paiement entrant pour les impôts.', es: 'Configura reglas de bloqueo automático: ej. bloquea 15% de cada pago entrante para impuestos.' },
  },
  {
    id: 'ipo', hl: 'ipoBtn',
    title: { en: 'IPO — Stock Exchange Listing', fr: 'IPO — Introduction en Bourse', es: 'IPO — Cotización en Bolsa' },
    path:  { en: 'Menu → Business → IPO Launchpad', fr: 'Menu → Entreprise → Launchpad IPO', es: 'Menú → Negocio → Launchpad IPO' },
    prompt: { en: 'Tap Submit IPO Application to start your listing', fr: 'Appuyez sur Soumettre la Demande IPO pour démarrer votre cotisation', es: 'Toca Enviar Solicitud IPO para iniciar tu cotización' },
    explain: {
      en: 'IFB\'s Venture Stock Exchange lets qualified companies list shares and raise public capital. Submit your financials, prospectus, and compliance documents via the IPO Launchpad. The IFB board reviews applications within 30 days.',
      fr: 'La Bourse d\'Actions Venture d\'IFB permet aux entreprises qualifiées de coter des actions et de lever des capitaux publics. Soumettez vos états financiers, prospectus et documents de conformité via le Launchpad IPO.',
      es: 'La Bolsa de Valores Venture de IFB permite a empresas calificadas listar acciones y captar capital público. Envía tus estados financieros, prospecto y documentos de cumplimiento vía el Launchpad IPO.',
    },
    tip: { en: 'Minimum $1M audited revenue required for IPO eligibility.', fr: 'Revenus audités minimum de 1M$ requis pour l\'éligibilité à l\'IPO.', es: 'Se requieren ingresos auditados mínimos de $1M para elegibilidad de IPO.' },
  },
  {
    id: 'card', hl: 'cardBtn',
    title: { en: 'Corporate Card', fr: 'Carte d\'Entreprise', es: 'Tarjeta Corporativa' },
    path:  { en: 'Menu → Business → Corporate Card', fr: 'Menu → Entreprise → Carte d\'Entreprise', es: 'Menú → Negocio → Tarjeta Corporativa' },
    prompt: { en: 'Tap Request Card to issue a corporate card', fr: 'Appuyez sur Demander une Carte pour émettre une carte d\'entreprise', es: 'Toca Solicitar Tarjeta para emitir una tarjeta corporativa' },
    explain: {
      en: 'Issue virtual or physical corporate cards to your team. Each card has its own spending limit, merchant category controls, and real-time alerts. All charges flow directly into your business analytics dashboard.',
      fr: 'Émettez des cartes d\'entreprise virtuelles ou physiques à votre équipe. Chaque carte a sa propre limite de dépenses, des contrôles de catégorie de marchands et des alertes en temps réel.',
      es: 'Emite tarjetas corporativas virtuales o físicas a tu equipo. Cada tarjeta tiene su propio límite de gasto, controles de categoría de comerciante y alertas en tiempo real.',
    },
    tip: { en: 'Virtual cards are issued instantly; physical cards ship in 5–7 business days.', fr: 'Les cartes virtuelles sont émises instantanément; les cartes physiques sont expédiées en 5 à 7 jours ouvrables.', es: 'Las tarjetas virtuales se emiten al instante; las físicas se envían en 5–7 días hábiles.' },
  },
  {
    id: 'compliance', hl: 'compBtn',
    title: { en: 'Compliance & Reporting', fr: 'Conformité & Reporting', es: 'Cumplimiento e Informes' },
    path:  { en: 'Menu → Business → Compliance', fr: 'Menu → Entreprise → Conformité', es: 'Menú → Negocio → Cumplimiento' },
    prompt: { en: 'Tap Run Compliance Check to audit your status', fr: 'Appuyez sur Lancer la Vérification de Conformité pour auditer votre statut', es: 'Toca Ejecutar Verificación de Cumplimiento para auditar tu estado' },
    explain: {
      en: 'DEUS continuously monitors your account against AML and FATF standards. The Compliance module shows your current score, any open action items, annual filing deadlines, and auto-generates required reports for your jurisdiction.',
      fr: 'DEUS surveille continuellement votre compte selon les normes AML et GAFI. Le module de Conformité affiche votre score actuel, les actions ouvertes, les délais de dépôt annuels et génère automatiquement les rapports requis.',
      es: 'DEUS monitorea continuamente tu cuenta contra estándares AML y FATF. El módulo de Cumplimiento muestra tu puntuación actual, elementos de acción abiertos, plazos de presentación anuales y genera automáticamente los informes requeridos.',
    },
    tip: { en: 'A green compliance score unlocks higher transaction limits.', fr: 'Un score de conformité vert débloque des limites de transaction plus élevées.', es: 'Un puntaje de cumplimiento verde desbloquea límites de transacción más altos.' },
  },
  {
    id: 'summary', noTap: true,
    title: { en: 'Your Business is Ready!', fr: 'Votre Entreprise est Prête!', es: '¡Tu Negocio está Listo!' },
    path:  { en: 'Course Complete', fr: 'Cours Terminé', es: 'Curso Completado' },
    prompt: { en: '', fr: '', es: '' },
    explain: {
      en: 'You\'ve completed all 13 business stages — from company formation to IPO. DEUS is the only platform where a single account covers legal setup, banking, capital raising, payroll, insurance, and a stock exchange listing. Take the assessment to earn your certificate.',
      fr: 'Vous avez complété les 13 étapes d\'entreprise — de la formation à l\'introduction en bourse. DEUS est la seule plateforme où un seul compte couvre la configuration juridique, la banque, la levée de fonds, la paie, l\'assurance et une cotation boursière.',
      es: 'Completaste las 13 etapas empresariales — desde la constitución hasta la IPO. DEUS es la única plataforma donde una sola cuenta cubre configuración legal, banca, captación de capital, nómina, seguros y una cotización bursátil.',
    },
    tip: { en: '', fr: '', es: '' },
  },
];

// ─── ASSESSMENT ───────────────────────────────────────────────────────────────
const QUESTIONS = {
  en: [
    { q: 'Which entity type is preferred by VCs for equity financing?', opts: ['Wyoming LLC', 'UK Ltd', 'Delaware C-Corp', 'UAE Free Zone'], ans: 2 },
    { q: 'What does KYC stand for?', opts: ['Keep Your Capital', 'Know Your Customer', 'Key Yield Certificate', 'Know Your Compliance'], ans: 1 },
    { q: 'Where do you access the IPO Launchpad?', opts: ['Home → Pay Me', 'Menu → Business → IPO Launchpad', 'Settings → Advanced', 'Analytics → Reports'], ans: 1 },
    { q: 'What insurance type is required before listing on VentureX?', opts: ['D&O (Directors & Officers)', 'E&O (Errors & Omissions)', 'Cyber insurance', 'Property insurance'], ans: 1 },
    { q: 'How long does IFB review an IPO application?', opts: ['7 days', '14 days', '30 days', '90 days'], ans: 2 },
    { q: 'What does the Business Vault do?', opts: ['Stores files', 'Ring-fences reserves for taxes, payroll, or escrow', 'Issues virtual cards', 'Processes payroll'], ans: 1 },
    { q: 'What is the minimum audited revenue for IPO eligibility?', opts: ['$100,000', '$500,000', '$1,000,000', '$5,000,000'], ans: 2 },
    { q: 'Where do you issue a corporate card to a team member?', opts: ['Home → Add', 'Menu → Business → Corporate Card → Request Card', 'Settings → Team', 'Alerts → Cards'], ans: 1 },
  ],
  fr: [
    { q: 'Quel type d\'entité est préféré par les VC pour le financement en capital?', opts: ['Wyoming LLC', 'UK Ltd', 'Delaware C-Corp', 'Zone Franche UAE'], ans: 2 },
    { q: 'Que signifie KYC?', opts: ['Gardez Votre Capital', 'Connaissez Votre Client', 'Certificat de Rendement Clé', 'Connaissez Votre Conformité'], ans: 1 },
    { q: 'Où accédez-vous au Launchpad IPO?', opts: ['Accueil → Payez-Moi', 'Menu → Entreprise → Launchpad IPO', 'Paramètres → Avancé', 'Analytique → Rapports'], ans: 1 },
    { q: 'Quelle assurance est requise avant de s\'inscrire sur VentureX?', opts: ['D&O (Administrateurs & Dirigeants)', 'E&O (Erreurs & Omissions)', 'Assurance Cyber', 'Assurance Propriété'], ans: 1 },
    { q: 'Combien de temps IFB examine-t-il une demande d\'IPO?', opts: ['7 jours', '14 jours', '30 jours', '90 jours'], ans: 2 },
    { q: 'Que fait le Coffre d\'Entreprise?', opts: ['Stocke des fichiers', 'Isole les réserves pour les impôts, la paie ou l\'escrow', 'Émet des cartes virtuelles', 'Traite la paie'], ans: 1 },
    { q: 'Quel est le revenu audité minimum pour l\'éligibilité à l\'IPO?', opts: ['100 000$', '500 000$', '1 000 000$', '5 000 000$'], ans: 2 },
    { q: 'Où émettez-vous une carte d\'entreprise à un membre de l\'équipe?', opts: ['Accueil → Ajouter', 'Menu → Entreprise → Carte → Demander une Carte', 'Paramètres → Équipe', 'Alertes → Cartes'], ans: 1 },
  ],
  es: [
    { q: '¿Qué tipo de entidad prefieren los VCs para financiamiento de capital?', opts: ['Wyoming LLC', 'UK Ltd', 'Delaware C-Corp', 'Zona Franca UAE'], ans: 2 },
    { q: '¿Qué significa KYC?', opts: ['Mantén Tu Capital', 'Conoce a Tu Cliente', 'Certificado de Rendimiento Clave', 'Conoce Tu Cumplimiento'], ans: 1 },
    { q: '¿Dónde accedes al Launchpad IPO?', opts: ['Inicio → Págame', 'Menú → Negocio → Launchpad IPO', 'Ajustes → Avanzado', 'Analítica → Reportes'], ans: 1 },
    { q: '¿Qué seguro se requiere antes de listar en VentureX?', opts: ['D&O (Directores y Funcionarios)', 'E&O (Errores y Omisiones)', 'Seguro Cibernético', 'Seguro de Propiedad'], ans: 1 },
    { q: '¿Cuánto tiempo revisa IFB una solicitud de IPO?', opts: ['7 días', '14 días', '30 días', '90 días'], ans: 2 },
    { q: '¿Qué hace la Bóveda Empresarial?', opts: ['Almacena archivos', 'Aísla reservas para impuestos, nómina o escrow', 'Emite tarjetas virtuales', 'Procesa nómina'], ans: 1 },
    { q: '¿Cuál es el ingreso auditado mínimo para elegibilidad de IPO?', opts: ['$100,000', '$500,000', '$1,000,000', '$5,000,000'], ans: 2 },
    { q: '¿Dónde emites una tarjeta corporativa a un miembro del equipo?', opts: ['Inicio → Agregar', 'Menú → Negocio → Tarjeta → Solicitar Tarjeta', 'Ajustes → Equipo', 'Alertas → Tarjetas'], ans: 1 },
  ],
};

const CERT = {
  en: { title: 'Business Mastery Certificate', sub: 'has successfully completed the DEUS Business Guide', issuer: 'Infinite Future Bank · DEUS OS' },
  fr: { title: 'Certificat de Maîtrise des Affaires', sub: 'a réussi le Guide Entreprise DEUS', issuer: 'Infinite Future Bank · DEUS OS' },
  es: { title: 'Certificado de Dominio Empresarial', sub: 'ha completado exitosamente la Guía de Negocios DEUS', issuer: 'Infinite Future Bank · DEUS OS' },
};

// ─── PHONE FRAME ─────────────────────────────────────────────────────────────
function Phone({ children, dark = false }) {
  return (
    <div className="relative mx-auto" style={{ width: 252, height: 496 }}>
      <div className={`absolute inset-0 rounded-[36px] ${dark ? 'bg-slate-900' : 'bg-white'} shadow-2xl border-2 ${dark ? 'border-slate-700' : 'border-slate-200'}`} />
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full z-10" />
      <div className={`absolute top-8 left-4 right-4 flex justify-between items-center z-10 ${dark ? 'text-white' : 'text-slate-800'}`} style={{ fontSize: 8, fontWeight: 700 }}>
        <span>9:41</span>
        <div className="flex items-center gap-1"><span>●●●</span><span>WiFi</span><span>🔋</span></div>
      </div>
      <div className="absolute top-14 left-1 right-1 bottom-1 rounded-b-[32px] overflow-hidden">
        {children}
      </div>
    </div>
  );
}

// ─── HIGHLIGHT WRAPPER ────────────────────────────────────────────────────────
function HL({ children, onTap, done, radius = 'rounded-xl', labelPos = 'top' }) {
  return (
    <div className="relative inline-block" onClick={!done ? onTap : undefined} style={{ cursor: done ? 'default' : 'pointer' }}>
      {children}
      {!done && (
        <>
          <span className={`absolute inset-0 ${radius} border-2 border-yellow-400 animate-ping opacity-75`} />
          <span className={`absolute inset-0 ${radius} border-2 border-yellow-400`} />
          <span className={`absolute ${labelPos === 'top' ? '-top-5' : '-bottom-5'} left-1/2 -translate-x-1/2 text-yellow-400 font-black whitespace-nowrap`} style={{ fontSize: 8 }}>TAP!</span>
        </>
      )}
      {done && (
        <span className="absolute -top-2 -right-2 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
          <Check size={9} className="text-white" strokeWidth={3} />
        </span>
      )}
    </div>
  );
}

// ─── SCREEN COMPONENTS ────────────────────────────────────────────────────────

function BusinessMenuScreen({ hl, onTap, done }) {
  const items = [
    { id: 'formation', icon: Building2, label: 'Formation', color: 'bg-blue-600' },
    { id: 'kyc',       icon: ShieldCheck, label: 'KYC',      color: 'bg-violet-600' },
    { id: 'banking',   icon: Landmark,   label: 'Banking',   color: 'bg-emerald-600' },
    { id: 'venturex',  icon: TrendingUp, label: 'VentureX',  color: 'bg-indigo-600' },
    { id: 'insurance', icon: Shield,     label: 'Insurance', color: 'bg-slate-600' },
    { id: 'payroll',   icon: Users,      label: 'Payroll',   color: 'bg-blue-500' },
    { id: 'analytics', icon: BarChart3,  label: 'Analytics', color: 'bg-slate-500' },
    { id: 'documents', icon: FileText,   label: 'Documents', color: 'bg-amber-600' },
    { id: 'vault',     icon: Shield,     label: 'Vault',     color: 'bg-indigo-700' },
  ];

  return (
    <div className="w-full h-full bg-[#0a0f1e] flex flex-col">
      <div className="px-3 pt-2 pb-2">
        <div className="text-slate-400" style={{ fontSize: 8 }}>IFB Business Suite</div>
        <div className="text-white font-black" style={{ fontSize: 13 }}>Business Hub</div>
      </div>
      <div className="px-3 grid grid-cols-3 gap-2 flex-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isHL = hl === item.id;
          const card = (
            <div key={item.id} className="flex flex-col items-center gap-1">
              <div className={`w-12 h-12 rounded-2xl ${item.color} flex items-center justify-center`}>
                <Icon size={18} className="text-white" />
              </div>
              <span className="text-slate-300 text-center leading-tight" style={{ fontSize: 7 }}>{item.label}</span>
            </div>
          );
          return isHL
            ? <HL key={item.id} onTap={onTap} done={done} radius="rounded-2xl" labelPos="top">{card}</HL>
            : card;
        })}
      </div>
    </div>
  );
}

function FormationScreen({ onTap, done }) {
  return (
    <div className="w-full h-full bg-white flex flex-col">
      <div className="flex items-center gap-2 px-3 pt-2 pb-2 border-b border-slate-100">
        <ArrowLeft size={13} className="text-slate-800" />
        <span className="text-slate-900 font-black" style={{ fontSize: 11 }}>Company Formation</span>
      </div>
      {/* Jurisdiction cards */}
      <div className="px-3 pt-2 flex flex-col gap-2 flex-1">
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 flex items-center gap-2">
          <span style={{ fontSize: 16 }}>🇺🇸</span>
          <div className="flex-1">
            <div className="text-slate-900 font-bold" style={{ fontSize: 9 }}>United States</div>
            <div className="text-slate-500" style={{ fontSize: 7 }}>Wyoming LLC · Delaware C-Corp</div>
            <div className="text-blue-600 font-bold" style={{ fontSize: 6 }}>From $699 · 3–5 days</div>
          </div>
          <span className="bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5 font-bold" style={{ fontSize: 6 }}>Popular</span>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center gap-2">
          <span style={{ fontSize: 16 }}>🇦🇪</span>
          <div className="flex-1">
            <div className="text-slate-900 font-bold" style={{ fontSize: 9 }}>UAE Free Zone</div>
            <div className="text-slate-500" style={{ fontSize: 7 }}>SHAMS · IFZA · DMCC</div>
            <div className="text-emerald-600 font-bold" style={{ fontSize: 6 }}>0% tax · From $2,499</div>
          </div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center gap-2">
          <span style={{ fontSize: 16 }}>🇬🇧</span>
          <div className="flex-1">
            <div className="text-slate-900 font-bold" style={{ fontSize: 9 }}>United Kingdom</div>
            <div className="text-slate-500" style={{ fontSize: 7 }}>Private Limited (Ltd)</div>
            <div className="text-violet-600 font-bold" style={{ fontSize: 6 }}>Same-day · From $799</div>
          </div>
        </div>
      </div>
      {/* CTA */}
      <div className="px-3 pb-3">
        <HL onTap={onTap} done={done} radius="rounded-xl" labelPos="top">
          <div className="w-full bg-blue-600 rounded-xl text-center text-white font-black" style={{ fontSize: 10, padding: '7px' }}>
            Start Formation
          </div>
        </HL>
      </div>
    </div>
  );
}

function KYCScreen({ onTap, done }) {
  return (
    <div className="w-full h-full bg-[#0a0f1e] flex flex-col">
      <div className="flex items-center gap-2 px-3 pt-2 pb-2">
        <ArrowLeft size={13} className="text-white" />
        <span className="text-white font-black" style={{ fontSize: 11 }}>Identity Verification</span>
      </div>
      {/* KYC steps */}
      <div className="px-3 flex flex-col gap-2 flex-1 pt-1">
        {[
          { step: 1, label: 'ID Document', sub: 'Passport, National ID, or Driver\'s License', done: false },
          { step: 2, label: 'Selfie Capture', sub: 'Front-facing camera required', done: false },
          { step: 3, label: 'Business Docs', sub: 'Proof of address + company cert', done: false },
        ].map((item) => (
          <div key={item.step} className="flex items-start gap-3 bg-slate-800/60 rounded-2xl p-3">
            <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-black" style={{ fontSize: 9 }}>{item.step}</span>
            </div>
            <div>
              <div className="text-white font-bold" style={{ fontSize: 9 }}>{item.label}</div>
              <div className="text-slate-400" style={{ fontSize: 7 }}>{item.sub}</div>
            </div>
          </div>
        ))}
        {/* Pending banner */}
        <div className="flex items-center gap-2 bg-amber-900/30 border border-amber-500/40 rounded-xl p-2">
          <Clock size={12} className="text-amber-400 flex-shrink-0" />
          <span className="text-amber-300" style={{ fontSize: 7 }}>Under review · Usually &lt; 24 hours</span>
        </div>
      </div>
      {/* CTA */}
      <div className="px-3 pb-3">
        <HL onTap={onTap} done={done} radius="rounded-xl" labelPos="top">
          <div className="w-full bg-violet-600 rounded-xl text-center text-white font-black" style={{ fontSize: 10, padding: '7px' }}>
            Start Verification
          </div>
        </HL>
      </div>
    </div>
  );
}

function BankingScreen({ onTap, done }) {
  return (
    <div className="w-full h-full bg-white flex flex-col">
      <div className="flex items-center gap-2 px-3 pt-2 pb-2 border-b border-slate-100">
        <ArrowLeft size={13} className="text-slate-800" />
        <span className="text-slate-900 font-black" style={{ fontSize: 11 }}>Business Banking</span>
      </div>
      <div className="px-3 pt-3 flex flex-col gap-2 flex-1">
        {/* IBAN card */}
        <div className="rounded-2xl p-3 flex flex-col gap-1" style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f2a4a)' }}>
          <div className="text-slate-400" style={{ fontSize: 7 }}>IFB Business IBAN</div>
          <div className="text-white font-mono font-bold" style={{ fontSize: 9 }}>GB29 IFB0 6016 1331 9268</div>
          <div className="flex gap-2 mt-1">
            {['USD', 'EUR', 'GBP'].map((c) => (
              <span key={c} className="bg-white/10 text-white rounded-full px-2 py-0.5 font-bold" style={{ fontSize: 6 }}>{c}</span>
            ))}
          </div>
        </div>
        {/* Features */}
        {['Multi-currency IBAN', 'Team sub-accounts', 'Corporate virtual card', '$10K SWIFT free tier/mo'].map((f) => (
          <div key={f} className="flex items-center gap-2 bg-slate-50 rounded-xl p-2">
            <Check size={10} className="text-emerald-500 flex-shrink-0" />
            <span className="text-slate-700" style={{ fontSize: 8 }}>{f}</span>
          </div>
        ))}
      </div>
      <div className="px-3 pb-3">
        <HL onTap={onTap} done={done} radius="rounded-xl" labelPos="top">
          <div className="w-full bg-emerald-600 rounded-xl text-center text-white font-black" style={{ fontSize: 10, padding: '7px' }}>
            Open Business Account
          </div>
        </HL>
      </div>
    </div>
  );
}

function CapitalScreen({ onTap, done }) {
  return (
    <div className="w-full h-full bg-[#0a0f1e] flex flex-col">
      <div className="flex items-center gap-2 px-3 pt-2 pb-2">
        <ArrowLeft size={13} className="text-white" />
        <span className="text-white font-black" style={{ fontSize: 11 }}>VentureX</span>
      </div>
      <div className="px-3 flex flex-col gap-2 flex-1 pt-1">
        {/* Stats row */}
        <div className="flex gap-2">
          {[{ label: 'Active Listings', val: '234' }, { label: 'Total Raised', val: '$12.4M' }, { label: 'Investors', val: '1,840' }].map((s) => (
            <div key={s.label} className="flex-1 bg-slate-800 rounded-xl p-2 text-center">
              <div className="text-white font-black" style={{ fontSize: 10 }}>{s.val}</div>
              <div className="text-slate-400" style={{ fontSize: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>
        {/* Sample listing */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-xl bg-blue-600 flex items-center justify-center">
              <Rocket size={10} className="text-white" />
            </div>
            <div>
              <div className="text-white font-bold" style={{ fontSize: 9 }}>Your Company</div>
              <div className="text-slate-400" style={{ fontSize: 6 }}>Draft · Not listed yet</div>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="bg-slate-700 rounded-lg px-2 py-0.5"><span className="text-slate-300" style={{ fontSize: 6 }}>Seeking $500K</span></div>
            <div className="bg-slate-700 rounded-lg px-2 py-0.5"><span className="text-slate-300" style={{ fontSize: 6 }}>10% equity</span></div>
          </div>
        </div>
      </div>
      <div className="px-3 pb-3">
        <HL onTap={onTap} done={done} radius="rounded-xl" labelPos="top">
          <div className="w-full bg-indigo-600 rounded-xl text-center text-white font-black" style={{ fontSize: 10, padding: '7px' }}>
            List Company
          </div>
        </HL>
      </div>
    </div>
  );
}

function InsuranceScreen({ onTap, done }) {
  return (
    <div className="w-full h-full bg-white flex flex-col">
      <div className="flex items-center gap-2 px-3 pt-2 pb-2 border-b border-slate-100">
        <ArrowLeft size={13} className="text-slate-800" />
        <span className="text-slate-900 font-black" style={{ fontSize: 11 }}>Business Insurance</span>
      </div>
      <div className="px-3 pt-3 flex flex-col gap-2 flex-1">
        {[
          { label: 'E&O (Errors & Omissions)', price: 'From $30/mo', color: 'bg-red-50 border-red-200', badge: 'Required for VentureX' },
          { label: 'General Liability', price: 'From $25/mo', color: 'bg-blue-50 border-blue-200', badge: '' },
          { label: 'D&O Coverage', price: 'From $60/mo', color: 'bg-violet-50 border-violet-200', badge: '' },
          { label: 'Cyber Insurance', price: 'From $40/mo', color: 'bg-slate-50 border-slate-200', badge: '' },
        ].map((ins) => (
          <div key={ins.label} className={`flex items-center gap-2 border rounded-xl p-2 ${ins.color}`}>
            <Shield size={12} className="text-slate-500 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-slate-800 font-bold" style={{ fontSize: 8 }}>{ins.label}</div>
              {ins.badge && <div className="text-red-600 font-bold" style={{ fontSize: 6 }}>{ins.badge}</div>}
            </div>
            <div className="text-slate-600 font-bold" style={{ fontSize: 7 }}>{ins.price}</div>
          </div>
        ))}
      </div>
      <div className="px-3 pb-3">
        <HL onTap={onTap} done={done} radius="rounded-xl" labelPos="top">
          <div className="w-full bg-slate-800 rounded-xl text-center text-white font-black" style={{ fontSize: 10, padding: '7px' }}>
            Get Quote
          </div>
        </HL>
      </div>
    </div>
  );
}

function PayrollScreen({ onTap, done }) {
  return (
    <div className="w-full h-full bg-[#0a0f1e] flex flex-col">
      <div className="flex items-center gap-2 px-3 pt-2 pb-2">
        <ArrowLeft size={13} className="text-white" />
        <span className="text-white font-black" style={{ fontSize: 11 }}>Payroll</span>
      </div>
      <div className="px-3 flex flex-col gap-2 flex-1 pt-1">
        {/* Summary */}
        <div className="flex gap-2">
          {[{ label: 'Employees', val: '3' }, { label: 'Next Run', val: 'Jul 1' }, { label: 'Total', val: '$4,200' }].map((s) => (
            <div key={s.label} className="flex-1 bg-slate-800 rounded-xl p-2 text-center">
              <div className="text-white font-black" style={{ fontSize: 11 }}>{s.val}</div>
              <div className="text-slate-400" style={{ fontSize: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>
        {/* Team list */}
        {[{ name: 'Alice M.', role: 'Engineer', salary: '$2,000/mo' }, { name: 'Bob K.', role: 'Designer', salary: '$1,200/mo' }].map((e) => (
          <div key={e.name} className="bg-slate-800/60 rounded-2xl p-3 flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-black" style={{ fontSize: 9 }}>{e.name[0]}</span>
            </div>
            <div className="flex-1">
              <div className="text-white font-bold" style={{ fontSize: 9 }}>{e.name}</div>
              <div className="text-slate-400" style={{ fontSize: 7 }}>{e.role}</div>
            </div>
            <div className="text-emerald-400 font-bold" style={{ fontSize: 8 }}>{e.salary}</div>
          </div>
        ))}
      </div>
      <div className="px-3 pb-3">
        <HL onTap={onTap} done={done} radius="rounded-xl" labelPos="top">
          <div className="w-full bg-blue-600 rounded-xl text-center text-white font-black" style={{ fontSize: 10, padding: '7px' }}>
            Add Employee
          </div>
        </HL>
      </div>
    </div>
  );
}

function AnalyticsScreen({ onTap, done }) {
  return (
    <div className="w-full h-full bg-white flex flex-col">
      <div className="flex items-center gap-2 px-3 pt-2 pb-2 border-b border-slate-100">
        <ArrowLeft size={13} className="text-slate-800" />
        <span className="text-slate-900 font-black" style={{ fontSize: 11 }}>Analytics</span>
      </div>
      <div className="px-3 pt-2 flex flex-col gap-2 flex-1">
        {/* Revenue chart stub */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
          <div className="text-slate-500 mb-1" style={{ fontSize: 7 }}>Revenue — Last 6 months</div>
          <div className="flex items-end gap-1 h-12">
            {[30, 50, 40, 70, 60, 85].map((h, i) => (
              <div key={i} className="flex-1 bg-blue-500 rounded-t" style={{ height: `${h}%`, opacity: i === 5 ? 1 : 0.5 }} />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((m) => (
              <span key={m} className="text-slate-400" style={{ fontSize: 5 }}>{m}</span>
            ))}
          </div>
        </div>
        {/* KPIs */}
        <div className="flex gap-2">
          {[{ label: 'Revenue', val: '$18.2K', color: 'text-emerald-600' }, { label: 'Expenses', val: '$6.4K', color: 'text-red-500' }, { label: 'Net', val: '$11.8K', color: 'text-blue-600' }].map((k) => (
            <div key={k.label} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2 text-center">
              <div className={`font-black ${k.color}`} style={{ fontSize: 10 }}>{k.val}</div>
              <div className="text-slate-400" style={{ fontSize: 6 }}>{k.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="px-3 pb-3">
        <HL onTap={onTap} done={done} radius="rounded-xl" labelPos="top">
          <div className="w-full bg-slate-800 rounded-xl text-center text-white font-black" style={{ fontSize: 10, padding: '7px' }}>
            View Full Report
          </div>
        </HL>
      </div>
    </div>
  );
}

function DocumentsScreen({ onTap, done }) {
  return (
    <div className="w-full h-full bg-[#0a0f1e] flex flex-col">
      <div className="flex items-center gap-2 px-3 pt-2 pb-2">
        <ArrowLeft size={13} className="text-white" />
        <span className="text-white font-black" style={{ fontSize: 11 }}>Corporate Documents</span>
      </div>
      <div className="px-3 flex flex-col gap-2 flex-1 pt-1">
        {[
          { name: 'Certificate of Incorporation', tag: 'PDF', ready: true },
          { name: 'Operating Agreement', tag: 'PDF', ready: true },
          { name: 'EIN Confirmation Letter', tag: 'PDF', ready: true },
          { name: 'Registered Agent Confirmation', tag: 'PDF', ready: true },
          { name: 'Share Register', tag: 'PDF', ready: false },
        ].map((doc) => (
          <div key={doc.name} className={`flex items-center gap-2 bg-slate-800/60 rounded-2xl p-2.5 ${!doc.ready ? 'opacity-50' : ''}`}>
            <FileText size={14} className="text-amber-400 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-white font-bold" style={{ fontSize: 8 }}>{doc.name}</div>
              <div className="text-slate-400" style={{ fontSize: 6 }}>{doc.tag} · {doc.ready ? 'Ready' : 'Pending'}</div>
            </div>
            {doc.ready ? (
              <HL onTap={onTap} done={done} radius="rounded-lg" labelPos="top">
                <div className="flex items-center gap-1 bg-slate-700 rounded-lg px-2 py-0.5">
                  <Download size={9} className="text-white" />
                  <span className="text-white font-bold" style={{ fontSize: 7 }}>DL</span>
                </div>
              </HL>
            ) : (
              <div className="flex items-center gap-1 bg-slate-700/50 rounded-lg px-2 py-0.5">
                <Clock size={9} className="text-slate-500" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function VaultScreen({ onTap, done }) {
  return (
    <div className="w-full h-full bg-[#0a0f1e] flex flex-col">
      <div className="flex items-center gap-2 px-3 pt-2 pb-2">
        <ArrowLeft size={13} className="text-white" />
        <span className="text-white font-black" style={{ fontSize: 11 }}>Business Vault</span>
      </div>
      <div className="px-3 flex flex-col gap-2 flex-1 pt-1">
        {/* Vault balance */}
        <div className="bg-indigo-900/40 border border-indigo-500/40 rounded-2xl p-4 text-center">
          <Lock size={18} className="text-indigo-400 mx-auto mb-1" />
          <div className="text-slate-400" style={{ fontSize: 7 }}>Vaulted Balance</div>
          <div className="text-white font-black" style={{ fontSize: 22 }}>$3,200.00</div>
          <div className="text-indigo-300" style={{ fontSize: 7 }}>Earning 2.5% APY</div>
        </div>
        {/* Allocation rows */}
        {[{ label: 'Tax Reserve (15%)', val: '$1,920', color: 'bg-red-500' }, { label: 'Payroll Buffer', val: '$800', color: 'bg-blue-500' }, { label: 'Investor Escrow', val: '$480', color: 'bg-emerald-500' }].map((r) => (
          <div key={r.label} className="flex items-center gap-2 bg-slate-800/60 rounded-xl p-2">
            <div className={`w-2 h-2 rounded-full ${r.color}`} />
            <span className="text-slate-300 flex-1" style={{ fontSize: 8 }}>{r.label}</span>
            <span className="text-white font-bold" style={{ fontSize: 8 }}>{r.val}</span>
          </div>
        ))}
      </div>
      <div className="px-3 pb-3">
        <HL onTap={onTap} done={done} radius="rounded-xl" labelPos="top">
          <div className="w-full bg-indigo-600 rounded-xl text-center text-white font-black" style={{ fontSize: 10, padding: '7px' }}>
            Lock Funds
          </div>
        </HL>
      </div>
    </div>
  );
}

function IPOScreen({ onTap, done }) {
  return (
    <div className="w-full h-full bg-white flex flex-col">
      <div className="flex items-center gap-2 px-3 pt-2 pb-2 border-b border-slate-100">
        <ArrowLeft size={13} className="text-slate-800" />
        <span className="text-slate-900 font-black" style={{ fontSize: 11 }}>IPO Launchpad</span>
      </div>
      <div className="px-3 pt-3 flex flex-col gap-2 flex-1">
        {/* Requirements checklist */}
        <div className="text-slate-500 font-bold mb-1" style={{ fontSize: 7 }}>Eligibility Requirements</div>
        {[
          { label: '$1M+ audited revenue', met: false },
          { label: 'KYC fully approved', met: true },
          { label: 'E&O insurance active', met: true },
          { label: 'Prospectus submitted', met: false },
          { label: 'Share register complete', met: false },
        ].map((r) => (
          <div key={r.label} className={`flex items-center gap-2 rounded-xl p-2 ${r.met ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-slate-200'}`}>
            {r.met ? <Check size={10} className="text-emerald-500 flex-shrink-0" /> : <div className="w-2.5 h-2.5 rounded-full border-2 border-slate-300 flex-shrink-0" />}
            <span className={r.met ? 'text-emerald-700' : 'text-slate-500'} style={{ fontSize: 8 }}>{r.label}</span>
          </div>
        ))}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-2 flex items-center gap-2">
          <Clock size={10} className="text-amber-500 flex-shrink-0" />
          <span className="text-amber-700" style={{ fontSize: 7 }}>Board review: 30 days after submission</span>
        </div>
      </div>
      <div className="px-3 pb-3">
        <HL onTap={onTap} done={done} radius="rounded-xl" labelPos="top">
          <div className="w-full bg-slate-800 rounded-xl text-center text-white font-black" style={{ fontSize: 10, padding: '7px' }}>
            Submit IPO Application
          </div>
        </HL>
      </div>
    </div>
  );
}

function CorporateCardScreen({ onTap, done }) {
  return (
    <div className="w-full h-full bg-[#0a0f1e] flex flex-col">
      <div className="flex items-center gap-2 px-3 pt-2 pb-2">
        <ArrowLeft size={13} className="text-white" />
        <span className="text-white font-black" style={{ fontSize: 11 }}>Corporate Cards</span>
      </div>
      <div className="px-3 flex flex-col gap-2 flex-1 pt-1">
        {/* Card preview */}
        <div className="rounded-2xl p-4 flex flex-col gap-1" style={{ background: 'linear-gradient(135deg, #312e81, #1e1b4b)' }}>
          <div className="flex justify-between items-start">
            <div>
              <div className="text-slate-400" style={{ fontSize: 6 }}>CORPORATE CARD</div>
              <div className="text-white font-bold" style={{ fontSize: 8 }}>My Company Ltd</div>
            </div>
            <div className="text-blue-300 font-black" style={{ fontSize: 10 }}>VISA</div>
          </div>
          <div className="text-white font-mono mt-1" style={{ fontSize: 9, letterSpacing: 2 }}>•••• •••• •••• 7742</div>
          <div className="flex justify-between mt-1">
            <div><div className="text-slate-400" style={{ fontSize: 5 }}>LIMIT</div><div className="text-white font-mono" style={{ fontSize: 8 }}>$10,000</div></div>
            <div><div className="text-slate-400" style={{ fontSize: 5 }}>SPENT</div><div className="text-white font-mono" style={{ fontSize: 8 }}>$2,340</div></div>
          </div>
        </div>
        {/* Cardholder list */}
        {[{ name: 'Alice M.', limit: '$3,000', spent: '$780' }, { name: 'Bob K.', limit: '$2,000', spent: '$450' }].map((c) => (
          <div key={c.name} className="flex items-center gap-2 bg-slate-800/60 rounded-xl p-2">
            <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center">
              <span className="text-white font-black" style={{ fontSize: 8 }}>{c.name[0]}</span>
            </div>
            <div className="flex-1">
              <div className="text-white font-bold" style={{ fontSize: 8 }}>{c.name}</div>
              <div className="text-slate-400" style={{ fontSize: 6 }}>Limit: {c.limit}</div>
            </div>
            <div className="text-slate-300" style={{ fontSize: 7 }}>{c.spent}</div>
          </div>
        ))}
      </div>
      <div className="px-3 pb-3">
        <HL onTap={onTap} done={done} radius="rounded-xl" labelPos="top">
          <div className="w-full bg-indigo-600 rounded-xl text-center text-white font-black" style={{ fontSize: 10, padding: '7px' }}>
            Request Card
          </div>
        </HL>
      </div>
    </div>
  );
}

function ComplianceScreen({ onTap, done }) {
  return (
    <div className="w-full h-full bg-white flex flex-col">
      <div className="flex items-center gap-2 px-3 pt-2 pb-2 border-b border-slate-100">
        <ArrowLeft size={13} className="text-slate-800" />
        <span className="text-slate-900 font-black" style={{ fontSize: 11 }}>Compliance</span>
      </div>
      <div className="px-3 pt-3 flex flex-col gap-2 flex-1">
        {/* Score */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-center">
          <div className="text-slate-500" style={{ fontSize: 7 }}>Compliance Score</div>
          <div className="text-emerald-600 font-black" style={{ fontSize: 26 }}>87</div>
          <div className="text-emerald-600 font-bold" style={{ fontSize: 7 }}>Green · Limits unlocked</div>
        </div>
        {/* Items */}
        {[
          { label: 'AML screening', status: 'Pass', color: 'text-emerald-600' },
          { label: 'FATF compliance', status: 'Pass', color: 'text-emerald-600' },
          { label: 'Annual filing', status: 'Due Jul 15', color: 'text-amber-600' },
          { label: 'Beneficial owner update', status: 'Action needed', color: 'text-red-500' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2">
            <ShieldCheck size={12} className="text-slate-400 flex-shrink-0" />
            <span className="text-slate-700 flex-1" style={{ fontSize: 8 }}>{item.label}</span>
            <span className={`font-bold ${item.color}`} style={{ fontSize: 7 }}>{item.status}</span>
          </div>
        ))}
      </div>
      <div className="px-3 pb-3">
        <HL onTap={onTap} done={done} radius="rounded-xl" labelPos="top">
          <div className="w-full bg-blue-600 rounded-xl text-center text-white font-black" style={{ fontSize: 10, padding: '7px' }}>
            Run Compliance Check
          </div>
        </HL>
      </div>
    </div>
  );
}

function SummaryScreen() {
  return (
    <div className="w-full h-full bg-[#0a0f1e] flex flex-col items-center justify-center p-4">
      <div className="w-14 h-14 rounded-full bg-blue-600/20 border-2 border-blue-500 flex items-center justify-center mb-3">
        <Building2 size={28} className="text-blue-400" />
      </div>
      <div className="text-white font-black text-center mb-1" style={{ fontSize: 13 }}>All 13 Business Stages!</div>
      <div className="text-slate-400 text-center mb-3" style={{ fontSize: 8 }}>Take the assessment to earn your Business Certificate</div>
      <div className="grid grid-cols-3 gap-1 w-full">
        {['Formation', 'KYC', 'Banking', 'Capital', 'Insurance', 'Payroll', 'Analytics', 'Documents', 'Vault', 'IPO', 'Corp Card', 'Compliance', 'Business Hub'].map((l) => (
          <div key={l} className="flex items-center gap-1">
            <Check size={8} className="text-blue-400 flex-shrink-0" />
            <span className="text-slate-300" style={{ fontSize: 6 }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getScreen(idx, done, onTap) {
  switch (idx) {
    case 0:  return <BusinessMenuScreen onTap={onTap} done={done} />;
    case 1:  return <FormationScreen onTap={onTap} done={done} />;
    case 2:  return <KYCScreen onTap={onTap} done={done} />;
    case 3:  return <BankingScreen onTap={onTap} done={done} />;
    case 4:  return <CapitalScreen onTap={onTap} done={done} />;
    case 5:  return <InsuranceScreen onTap={onTap} done={done} />;
    case 6:  return <PayrollScreen onTap={onTap} done={done} />;
    case 7:  return <AnalyticsScreen onTap={onTap} done={done} />;
    case 8:  return <DocumentsScreen onTap={onTap} done={done} />;
    case 9:  return <VaultScreen onTap={onTap} done={done} />;
    case 10: return <IPOScreen onTap={onTap} done={done} />;
    case 11: return <CorporateCardScreen onTap={onTap} done={done} />;
    case 12: return <ComplianceScreen onTap={onTap} done={done} />;
    case 13: return <SummaryScreen />;
    default: return null;
  }
}

const isDark = (idx) => [0, 2, 4, 6, 8, 9, 11, 13].includes(idx);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function CompanyGuide({ onClose }) {
  const [slide, setSlide]       = useState(0);
  const [tapped, setTapped]     = useState({});
  const [mode, setMode]         = useState('course');
  const [lang, setLang]         = useState('en');
  const [answers, setAnswers]   = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [name, setName]         = useState('');

  const s = SLIDES[slide];
  const showExplain = s.noTap || tapped[slide];
  const canNext     = showExplain;

  function handleTap() {
    setTapped((prev) => ({ ...prev, [slide]: true }));
  }

  function goNext() {
    if (!canNext) return;
    if (slide < SLIDES.length - 1) setSlide(slide + 1);
    else setMode('assessment');
  }

  function goPrev() {
    if (slide > 0) setSlide(slide - 1);
  }

  // ── ASSESSMENT ──
  if (mode === 'assessment') {
    const qs = QUESTIONS[lang];
    const score = submitted ? qs.filter((q, i) => answers[i] === q.ans).length : 0;
    const passed = submitted && score >= 6;

    return (
      <div className="fixed inset-0 z-[9999] bg-[#0a0f1e] flex flex-col">
        <div className="bg-[#0a0f1e] border-b border-slate-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => setMode('course')} className="text-slate-400 hover:text-white">
              <ChevronLeft size={18} />
            </button>
            <span className="text-white font-black text-sm">
              {lang === 'fr' ? 'Évaluation' : lang === 'es' ? 'Evaluación' : 'Assessment'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-800 rounded-xl p-1">
              {['en', 'fr', 'es'].map((l) => (
                <button key={l} onClick={() => setLang(l)}
                  className={`text-[10px] font-black px-2 py-1 rounded-lg transition-colors ${lang === l ? 'bg-white text-slate-900' : 'text-white'}`}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {submitted ? (
            <div className="flex flex-col items-center py-8">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${passed ? 'bg-emerald-600/20 border-2 border-emerald-500' : 'bg-red-600/20 border-2 border-red-500'}`}>
                {passed ? <Award size={36} className="text-emerald-400" /> : <X size={36} className="text-red-400" />}
              </div>
              <div className="text-white font-black text-2xl mb-1">{score}/8</div>
              <div className={`text-sm font-bold mb-6 ${passed ? 'text-emerald-400' : 'text-red-400'}`}>
                {passed ? (lang === 'fr' ? 'Réussi!' : lang === 'es' ? '¡Aprobado!' : 'Passed!') : (lang === 'fr' ? 'Réessayez' : lang === 'es' ? 'Intenta de nuevo' : 'Try again')}
              </div>
              {qs.map((q, i) => (
                <div key={i} className="w-full max-w-lg bg-slate-800 rounded-2xl p-4 mb-3">
                  <div className="text-slate-300 text-sm mb-2">{i + 1}. {q.q}</div>
                  {q.opts.map((o, j) => (
                    <div key={j} className={`text-xs px-3 py-1.5 rounded-lg mb-1 ${j === q.ans ? 'bg-emerald-600/20 text-emerald-300 font-bold' : answers[i] === j && j !== q.ans ? 'bg-red-600/20 text-red-300' : 'text-slate-400'}`}>
                      {j === q.ans ? '✓ ' : answers[i] === j ? '✗ ' : ''}{o}
                    </div>
                  ))}
                </div>
              ))}
              <div className="flex gap-3 mt-4">
                <button onClick={() => { setAnswers({}); setSubmitted(false); }}
                  className="px-5 py-2 rounded-xl bg-slate-700 text-white font-black text-sm">
                  {lang === 'fr' ? 'Réessayer' : lang === 'es' ? 'Reintentar' : 'Retake'}
                </button>
                {passed && (
                  <button onClick={() => setMode('cert')}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm">
                    {lang === 'fr' ? 'Voir le Certificat' : lang === 'es' ? 'Ver Certificado' : 'Get Certificate'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-lg mx-auto">
              <p className="text-slate-400 text-xs mb-6 text-center">
                {lang === 'fr' ? '8 questions · 6/8 pour réussir' : lang === 'es' ? '8 preguntas · 6/8 para aprobar' : '8 questions · Score 6/8 to pass'}
              </p>
              {qs.map((q, i) => (
                <div key={i} className="bg-slate-800 rounded-2xl p-4 mb-4">
                  <div className="text-white font-bold text-sm mb-3">{i + 1}. {q.q}</div>
                  {q.opts.map((o, j) => (
                    <button key={j} onClick={() => setAnswers((a) => ({ ...a, [i]: j }))}
                      className={`w-full text-left text-xs px-3 py-2 rounded-xl mb-1.5 transition-colors ${answers[i] === j ? 'bg-blue-600 text-white font-bold' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                      {o}
                    </button>
                  ))}
                </div>
              ))}
              <button
                disabled={Object.keys(answers).length < qs.length}
                onClick={() => setSubmitted(true)}
                className={`w-full py-3 rounded-2xl font-black text-white transition-colors ${Object.keys(answers).length < qs.length ? 'bg-slate-700 cursor-not-allowed opacity-50' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {lang === 'fr' ? 'Soumettre' : lang === 'es' ? 'Enviar' : 'Submit'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── CERTIFICATE ──
  if (mode === 'cert') {
    const c = CERT[lang];
    return (
      <div className="fixed inset-0 z-[9999] bg-[#0a0f1e] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm bg-gradient-to-b from-blue-900/40 to-slate-900 border-2 border-blue-500/40 rounded-3xl p-8 flex flex-col items-center">
          <div className="flex gap-1 mb-4">
            <span className="text-2xl font-black text-[#4285F4]">D</span>
            <span className="text-2xl font-black text-[#EA4335]">E</span>
            <span className="text-2xl font-black text-[#FBBC04]">U</span>
            <span className="text-2xl font-black text-[#34A853]">S</span>
          </div>
          <Award size={48} className="text-blue-400 mb-3" />
          <div className="text-blue-400 font-black text-center text-lg mb-2">{c.title}</div>
          <div className="text-slate-400 text-xs text-center mb-4">{lang === 'fr' ? 'Ceci certifie que' : lang === 'es' ? 'Esto certifica que' : 'This certifies that'}</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={lang === 'fr' ? 'Votre nom complet' : lang === 'es' ? 'Tu nombre completo' : 'Your full name'}
            className="w-full bg-slate-800 text-white text-center font-black text-lg rounded-xl px-4 py-2 mb-4 border border-blue-500/40 focus:outline-none focus:border-blue-400"
          />
          <div className="text-slate-300 text-xs text-center mb-2">{c.sub}</div>
          <div className="bg-blue-600/20 border border-blue-500/30 rounded-xl px-4 py-2 mb-6">
            <div className="text-blue-300 font-black text-center" style={{ fontSize: 11 }}>{lang === 'fr' ? 'Score' : lang === 'es' ? 'Puntaje' : 'Score'}: {QUESTIONS[lang].length}/{QUESTIONS[lang].length}</div>
          </div>
          <div className="text-slate-500 text-xs text-center mb-6">{c.issuer}</div>
          <button onClick={onClose} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm">
            {lang === 'fr' ? 'Fermer' : lang === 'es' ? 'Cerrar' : 'Done'}
          </button>
        </div>
      </div>
    );
  }

  // ── COURSE ──
  return (
    <div className="fixed inset-0 z-[9999] bg-[#0a0f1e] flex flex-col">
      {/* Top bar */}
      <div className="bg-[#0a0f1e] border-b border-slate-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black">
            <span className="text-[#4285F4]">D</span>
            <span className="text-[#EA4335]">E</span>
            <span className="text-[#FBBC04]">U</span>
            <span className="text-[#34A853]">S</span>
          </span>
          <span className="text-slate-400 text-xs font-black uppercase tracking-widest">
            {lang === 'fr' ? 'Guide Entreprise' : lang === 'es' ? 'Guía Empresarial' : 'Business Guide'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-800 rounded-xl p-1">
            {['en', 'fr', 'es'].map((l) => (
              <button key={l} onClick={() => setLang(l)}
                className={`text-[10px] font-black px-2 py-1 rounded-lg transition-colors ${lang === l ? 'bg-white text-slate-900' : 'text-white'}`}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-slate-900 h-1 flex-shrink-0">
        <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${((slide + 1) / SLIDES.length) * 100}%` }} />
      </div>

      {/* Slide counter */}
      <div className="text-center text-slate-500 text-xs py-1 flex-shrink-0">
        {slide + 1} / {SLIDES.length}
      </div>

      {/* Main content — responsive: column on mobile, row on md+ */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col md:flex-row items-start justify-center gap-4 md:gap-8 p-4 md:p-8 max-w-5xl mx-auto">

          {/* Phone column */}
          <div className="flex-shrink-0 w-full md:w-auto flex flex-col items-center gap-2">
            <div className="text-slate-500 text-[10px] font-mono bg-slate-900 border border-slate-700 rounded-lg px-3 py-1 text-center">
              {s.path[lang]}
            </div>
            {/* Scale phone to 80% on mobile, full size on md+ */}
            <div className="scale-[0.80] -mb-[99px] origin-top md:scale-100 md:mb-0">
              <Phone dark={isDark(slide)}>
                {getScreen(slide, !!tapped[slide], handleTap)}
              </Phone>
            </div>
            {!s.noTap && !tapped[slide] && (
              <div className="flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/30 rounded-xl px-3 py-2 max-w-[252px] text-center">
                <span className="text-yellow-400 text-xs font-black animate-pulse flex-shrink-0">👆</span>
                <span className="text-yellow-300 text-xs font-bold leading-tight">{s.prompt[lang]}</span>
              </div>
            )}
            {!s.noTap && tapped[slide] && (
              <div className="flex items-center gap-2 bg-emerald-400/10 border border-emerald-400/30 rounded-xl px-3 py-2">
                <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
                <span className="text-emerald-300 text-xs font-bold">
                  {lang === 'fr' ? 'Bien! Lisez l\'explication.' : lang === 'es' ? '¡Bien! Lee la explicación.' : 'Great! Read the explanation.'}
                </span>
              </div>
            )}
          </div>

          {/* Explanation column — fills remaining space on desktop, full-width on mobile */}
          <div className="flex-1 w-full flex flex-col gap-4">
            <h2 className="text-white font-black text-lg md:text-xl leading-tight">{s.title[lang]}</h2>

            {showExplain ? (
              <>
                <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4">
                  <p className="text-slate-200 text-sm leading-relaxed">{s.explain[lang]}</p>
                </div>
                {s.tip && s.tip[lang] && (
                  <div className="bg-blue-600/10 border border-blue-600/20 rounded-2xl p-4 flex gap-3">
                    <span className="text-blue-400 text-base flex-shrink-0">💡</span>
                    <p className="text-blue-200 text-xs leading-relaxed">{s.tip[lang]}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-slate-800/40 border border-dashed border-slate-600 rounded-2xl p-5 flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-400/10 border-2 border-yellow-400/40 flex items-center justify-center animate-pulse">
                  <span className="text-xl">👆</span>
                </div>
                <p className="text-slate-400 text-sm text-center leading-relaxed">
                  {lang === 'fr' ? 'Appuyez sur l\'élément surligné dans l\'écran du téléphone pour déverrouiller l\'explication.'
                    : lang === 'es' ? 'Toca el elemento resaltado en la pantalla del teléfono para desbloquear la explicación.'
                    : 'Tap the highlighted element on the phone screen to unlock the explanation.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-[#0a0f1e] border-t border-slate-800 px-3 md:px-4 py-2 md:py-3 flex items-center justify-between gap-2 flex-shrink-0">
        <button onClick={goPrev} disabled={slide === 0}
          className={`flex items-center gap-1 px-3 md:px-4 py-2 rounded-xl font-black text-xs md:text-sm transition-colors flex-shrink-0 ${slide === 0 ? 'text-slate-600 cursor-not-allowed' : 'text-white bg-slate-800 hover:bg-slate-700'}`}>
          <ChevronLeft size={14} /> {lang === 'fr' ? 'Préc.' : lang === 'es' ? 'Ant.' : 'Prev'}
        </button>

        {/* Dots — compact on mobile */}
        <div className="flex gap-0.5 md:gap-1 flex-wrap justify-center max-w-[140px] md:max-w-none">
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => { if (i <= slide || tapped[i] || SLIDES[i].noTap) setSlide(i); }}
              className={`rounded-full transition-all ${i === slide ? 'w-3 h-1.5 md:w-4 md:h-2 bg-blue-500' : tapped[i] || SLIDES[i].noTap ? 'w-1.5 h-1.5 bg-emerald-500' : 'w-1.5 h-1.5 bg-slate-700'}`} />
          ))}
        </div>

        {slide === SLIDES.length - 1 ? (
          <button onClick={() => setMode('assessment')}
            className="flex items-center gap-1 px-3 md:px-4 py-2 rounded-xl font-black text-xs md:text-sm bg-emerald-600 hover:bg-emerald-700 text-white flex-shrink-0">
            {lang === 'fr' ? 'Éval.' : lang === 'es' ? 'Eval.' : 'Quiz'} <ChevronRight size={14} />
          </button>
        ) : (
          <button onClick={goNext} disabled={!canNext}
            className={`flex items-center gap-1 px-3 md:px-4 py-2 rounded-xl font-black text-xs md:text-sm transition-colors flex-shrink-0 ${!canNext ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
            {lang === 'fr' ? 'Suiv.' : lang === 'es' ? 'Sig.' : 'Next'} <ChevronRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
