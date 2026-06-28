import { useState } from 'react';
import {
  ChevronLeft, ChevronRight, X, Award, CheckCircle2,
  Send, QrCode, Download, Plus, Landmark, Wifi, Shield,
  ArrowRightLeft, BarChart2, Compass, Bell, Menu, CreditCard,
  Copy, FileText, Lock, Globe, Users, MapPin, Check, Zap,
  ArrowLeft, MoreHorizontal
} from 'lucide-react';

// ─── SLIDE DATA ───────────────────────────────────────────────────────────────
const SLIDES = [
  {
    id: 'dashboard', noTap: true,
    title:   { en: 'Your DEUS Dashboard', fr: 'Votre Tableau de Bord DEUS', es: 'Tu Panel DEUS' },
    path:    { en: 'Home → Dashboard', fr: 'Accueil → Tableau de bord', es: 'Inicio → Panel' },
    prompt:  { en: '', fr: '', es: '' },
    explain: {
      en: 'This is the heart of DEUS OS. Your live balance sits at the top. Below it are 9 Quick Action buttons — each opens a dedicated flow. The bottom nav lets you jump between Home, Transactions, Tap to Pay (center), Alerts, and More.',
      fr: 'C\'est le cœur de DEUS OS. Votre solde en direct est en haut. En dessous se trouvent 9 boutons d\'action rapide — chacun ouvre un flux dédié. La barre de navigation inférieure vous permet de naviguer entre Accueil, Transactions, Tap to Pay (centre), Alertes et Plus.',
      es: 'Este es el corazón de DEUS OS. Tu saldo en vivo está en la parte superior. Debajo hay 9 botones de Acción Rápida — cada uno abre un flujo dedicado. La barra de navegación inferior te permite saltar entre Inicio, Transacciones, Tap to Pay (centro), Alertas y Más.',
    },
    tip: { en: 'Swipe down on the balance to refresh.', fr: 'Glissez vers le bas sur le solde pour rafraîchir.', es: 'Desliza hacia abajo en el saldo para actualizar.' },
  },
  {
    id: 'deposit', hl: 'cot',
    title:   { en: 'Add Funds — Community of Trust', fr: 'Ajouter des Fonds — Communauté de Confiance', es: 'Agregar Fondos — Comunidad de Confianza' },
    path:    { en: 'Home → Add', fr: 'Accueil → Ajouter', es: 'Inicio → Agregar' },
    prompt:  { en: 'Tap the Community of Trust card to select it', fr: 'Appuyez sur la carte Communauté de Confiance pour la sélectionner', es: 'Toca la tarjeta Comunidad de Confianza para seleccionarla' },
    explain: {
      en: 'DEUS offers two deposit methods. Community of Trust charges just 1% IFB Fee + 2% Processor Reward — the lowest cost route. Global Card Network uses Stripe and charges 2.9%. Choose CoT for everyday top-ups.',
      fr: 'DEUS propose deux méthodes de dépôt. La Communauté de Confiance facture seulement 1% de frais IFB + 2% de récompense — la voie la moins chère. Le Réseau Global de Cartes utilise Stripe et facture 2,9%. Choisissez CoT pour les recharges quotidiennes.',
      es: 'DEUS ofrece dos métodos de depósito. Comunidad de Confianza cobra solo 1% de tarifa IFB + 2% de Recompensa — la ruta de menor costo. Red Global de Tarjetas usa Stripe y cobra 2.9%. Elige CoT para recargas del día a día.',
    },
    tip: { en: 'CoT deposits settle in minutes via peer network.', fr: 'Les dépôts CoT se règlent en quelques minutes.', es: 'Los depósitos CoT se liquidan en minutos.' },
  },
  {
    id: 'send', hl: 'sendBtn',
    title:   { en: 'Send Money', fr: 'Envoyer de l\'Argent', es: 'Enviar Dinero' },
    path:    { en: 'Home → Send', fr: 'Accueil → Envoyer', es: 'Inicio → Enviar' },
    prompt:  { en: 'Tap Send Now to confirm the transfer', fr: 'Appuyez sur Envoyer Maintenant pour confirmer le transfert', es: 'Toca Enviar Ahora para confirmar la transferencia' },
    explain: {
      en: 'The Send flow opens a bottom sheet. Select USD or AFR, pick a contact, enter the amount and a note, then hit Send Now. The funds move instantly within the IFB network.',
      fr: 'Le flux Envoyer ouvre une feuille du bas. Sélectionnez USD ou AFR, choisissez un contact, entrez le montant et une note, puis appuyez sur Envoyer Maintenant. Les fonds se déplacent instantanément dans le réseau IFB.',
      es: 'El flujo de Envío abre una hoja inferior. Selecciona USD o AFR, elige un contacto, ingresa el monto y una nota, luego presiona Enviar Ahora. Los fondos se mueven instantáneamente dentro de la red IFB.',
    },
    tip: { en: 'You can search contacts by name or account ID.', fr: 'Vous pouvez rechercher des contacts par nom ou ID de compte.', es: 'Puedes buscar contactos por nombre o ID de cuenta.' },
  },
  {
    id: 'withdraw-global', hl: 'globalBtn',
    title:   { en: 'Withdraw — Global Bank/Card', fr: 'Retrait — Banque/Carte Mondiale', es: 'Retirar — Banco/Tarjeta Global' },
    path:    { en: 'Home → Withdraw → Global Bank/Card', fr: 'Accueil → Retirer → Banque/Carte Mondiale', es: 'Inicio → Retirar → Banco/Tarjeta Global' },
    prompt:  { en: 'Tap Global Bank/Card to select this withdrawal method', fr: 'Appuyez sur Banque/Carte Mondiale pour sélectionner cette méthode de retrait', es: 'Toca Banco/Tarjeta Global para seleccionar este método de retiro' },
    explain: {
      en: 'Global Bank/Card withdrawal routes funds via International Wire or ACH. IFB handles the transfer on your behalf — ideal for sending to a traditional bank account anywhere in the world.',
      fr: 'Le retrait Banque/Carte Mondiale achemine les fonds via virement international ou ACH. IFB gère le transfert en votre nom — idéal pour envoyer vers un compte bancaire traditionnel partout dans le monde.',
      es: 'El retiro de Banco/Tarjeta Global enruta fondos vía Wire Internacional o ACH. IFB gestiona la transferencia en tu nombre — ideal para enviar a una cuenta bancaria tradicional en cualquier parte del mundo.',
    },
    tip: { en: '"IFB Handled" means the team verifies and processes your wire.', fr: '"IFB Géré" signifie que l\'équipe vérifie et traite votre virement.', es: '"IFB Gestionado" significa que el equipo verifica y procesa tu transferencia.' },
  },
  {
    id: 'receive', hl: 'genLink',
    title:   { en: 'Request / Receive Funds', fr: 'Demander / Recevoir des Fonds', es: 'Solicitar / Recibir Fondos' },
    path:    { en: 'Home → Receive', fr: 'Accueil → Recevoir', es: 'Inicio → Recibir' },
    prompt:  { en: 'Tap Generate Link to create your payment request', fr: 'Appuyez sur Générer le Lien pour créer votre demande de paiement', es: 'Toca Generar Enlace para crear tu solicitud de pago' },
    explain: {
      en: 'Fill in what the payment is for, the payer\'s email, and the amount. Generate Link creates a shareable payment URL. You can also tap Send Invoice by Email to send a formal invoice directly.',
      fr: 'Remplissez l\'objet du paiement, l\'email du payeur et le montant. Générer le Lien crée une URL de paiement partageable. Vous pouvez aussi appuyer sur Envoyer la Facture par Email pour envoyer une facture formelle.',
      es: 'Completa para qué es el pago, el correo del pagador y el monto. Generar Enlace crea una URL de pago compartible. También puedes tocar Enviar Factura por Email para enviar una factura formal.',
    },
    tip: { en: 'Payment links expire after 72 hours.', fr: 'Les liens de paiement expirent après 72 heures.', es: 'Los enlaces de pago expiran después de 72 horas.' },
  },
  {
    id: 'qr', hl: 'qrCode',
    title:   { en: 'Pay Me — QR Code', fr: 'Payez-Moi — Code QR', es: 'Págame — Código QR' },
    path:    { en: 'Home → Pay Me → QR Code tab', fr: 'Accueil → Payez-Moi → Onglet Code QR', es: 'Inicio → Págame → Pestaña Código QR' },
    prompt:  { en: 'Tap the QR code to confirm you know where it is', fr: 'Appuyez sur le code QR pour confirmer que vous savez où il se trouve', es: 'Toca el código QR para confirmar que sabes dónde está' },
    explain: {
      en: 'Your personal Pay Me QR is unique to your account. Any DEUS user — or anyone with the app — can scan it to send you money instantly. It encodes your account ID and currency preference.',
      fr: 'Votre QR Payez-Moi personnel est unique à votre compte. Tout utilisateur DEUS peut le scanner pour vous envoyer de l\'argent instantanément. Il encode votre ID de compte et votre préférence de devise.',
      es: 'Tu QR personal de Págame es único para tu cuenta. Cualquier usuario DEUS puede escanearlo para enviarte dinero al instante. Codifica tu ID de cuenta y preferencia de moneda.',
    },
    tip: { en: 'Tap "Share" to send your QR code via any messaging app.', fr: 'Appuyez sur "Partager" pour envoyer votre QR via toute application de messagerie.', es: 'Toca "Compartir" para enviar tu QR a través de cualquier app de mensajería.' },
  },
  {
    id: 'link', hl: 'copyLink',
    title:   { en: 'Pay Me — Payment Link', fr: 'Payez-Moi — Lien de Paiement', es: 'Págame — Enlace de Pago' },
    path:    { en: 'Home → Pay Me → Link tab', fr: 'Accueil → Payez-Moi → Onglet Lien', es: 'Inicio → Págame → Pestaña Enlace' },
    prompt:  { en: 'Tap Copy Link to copy your payment URL', fr: 'Appuyez sur Copier le Lien pour copier votre URL de paiement', es: 'Toca Copiar Enlace para copiar tu URL de pago' },
    explain: {
      en: 'The Link tab shows your persistent IFB payment URL. Copy it and paste anywhere — WhatsApp, email, social media. The payer opens the link and enters their card details. Funds land in your account.',
      fr: 'L\'onglet Lien affiche votre URL de paiement IFB persistante. Copiez-la et collez-la n\'importe où — WhatsApp, email, réseaux sociaux. Le payeur ouvre le lien et saisit ses coordonnées bancaires.',
      es: 'La pestaña Enlace muestra tu URL de pago IFB persistente. Cópiala y pégala en cualquier lugar — WhatsApp, correo, redes sociales. El pagador abre el enlace e ingresa sus datos de tarjeta.',
    },
    tip: { en: 'Your payment link never changes — bookmark it.', fr: 'Votre lien de paiement ne change jamais — mettez-le en signet.', es: 'Tu enlace de pago nunca cambia — guárdalo como favorito.' },
  },
  {
    id: 'payme-card', hl: 'freezeBtn',
    title:   { en: 'Pay Me — Virtual Card', fr: 'Payez-Moi — Carte Virtuelle', es: 'Págame — Tarjeta Virtual' },
    path:    { en: 'Home → Pay Me → Card tab', fr: 'Accueil → Payez-Moi → Onglet Carte', es: 'Inicio → Págame → Pestaña Tarjeta' },
    prompt:  { en: 'Tap Freeze Card to see card controls', fr: 'Appuyez sur Geler la Carte pour voir les contrôles de carte', es: 'Toca Congelar Tarjeta para ver los controles de tarjeta' },
    explain: {
      en: 'Your IFB virtual card can be used anywhere Visa/Mastercard is accepted online. The Card tab shows your card details, spend limit, and quick controls. Freeze it instantly if lost or compromised.',
      fr: 'Votre carte virtuelle IFB peut être utilisée partout où Visa/Mastercard est acceptée en ligne. L\'onglet Carte affiche vos détails de carte, limite de dépenses et contrôles rapides. Gelez-la instantanément si perdue ou compromise.',
      es: 'Tu tarjeta virtual IFB se puede usar en cualquier lugar donde Visa/Mastercard sea aceptada en línea. La pestaña Tarjeta muestra detalles de tu tarjeta, límite de gasto y controles rápidos. Congélala al instante si se pierde o compromete.',
    },
    tip: { en: 'Freezing takes effect in under 1 second.', fr: 'Le gel prend effet en moins d\'1 seconde.', es: 'El congelamiento surte efecto en menos de 1 segundo.' },
  },
  {
    id: 'nfc', hl: 'nfcSend',
    title:   { en: 'NFC — Tap & Pay', fr: 'NFC — Appuyez & Payez', es: 'NFC — Toca y Paga' },
    path:    { en: 'Bottom Nav → Tap to Pay (center button)', fr: 'Barre de navigation → Tap to Pay (bouton central)', es: 'Barra de navegación → Tap to Pay (botón central)' },
    prompt:  { en: 'Tap Send Money to activate NFC payment mode', fr: 'Appuyez sur Envoyer de l\'Argent pour activer le mode paiement NFC', es: 'Toca Enviar Dinero para activar el modo de pago NFC' },
    explain: {
      en: 'The center button in the bottom nav opens NFC Tap & Pay. Choose Send Money (violet) to pay another device, Receive from IFB (emerald) to collect at a terminal, or Get Paid by Card (blue) to accept card payments.',
      fr: 'Le bouton central de la barre de navigation ouvre NFC Tap & Pay. Choisissez Envoyer de l\'Argent (violet) pour payer un autre appareil, Recevoir d\'IFB (emeraude) pour encaisser à un terminal, ou Être Payé par Carte (bleu) pour accepter des paiements par carte.',
      es: 'El botón central de la barra de navegación abre NFC Tap & Pay. Elige Enviar Dinero (violeta) para pagar otro dispositivo, Recibir de IFB (esmeralda) para cobrar en una terminal, o Cobrar con Tarjeta (azul) para aceptar pagos con tarjeta.',
    },
    tip: { en: 'Hold your phone within 5 cm of the other device.', fr: 'Tenez votre téléphone à moins de 5 cm de l\'autre appareil.', es: 'Mantén tu teléfono a menos de 5 cm del otro dispositivo.' },
  },
  {
    id: 'swift', hl: 'swiftBtn',
    title:   { en: 'International Wire — SWIFT', fr: 'Virement International — SWIFT', es: 'Wire Internacional — SWIFT' },
    path:    { en: 'Home → Exchange → SWIFT', fr: 'Accueil → Échange → SWIFT', es: 'Inicio → Cambio → SWIFT' },
    prompt:  { en: 'Tap SWIFT / Wire Transfer to select international routing', fr: 'Appuyez sur SWIFT / Virement pour sélectionner le routage international', es: 'Toca SWIFT / Wire para seleccionar el enrutamiento internacional' },
    explain: {
      en: 'For sending large amounts internationally, DEUS supports SWIFT wire transfers. Enter the beneficiary IBAN, BIC/SWIFT code, bank name and country. IFB confirms within 1–3 business days.',
      fr: 'Pour envoyer de grandes sommes à l\'international, DEUS prend en charge les virements SWIFT. Saisissez l\'IBAN du bénéficiaire, le code BIC/SWIFT, le nom et le pays de la banque. IFB confirme sous 1 à 3 jours ouvrables.',
      es: 'Para enviar grandes cantidades internacionalmente, DEUS soporta transferencias SWIFT. Ingresa el IBAN del beneficiario, código BIC/SWIFT, nombre del banco y país. IFB confirma en 1–3 días hábiles.',
    },
    tip: { en: 'Double-check the SWIFT code — errors cause costly returns.', fr: 'Vérifiez le code SWIFT — les erreurs causent des retours coûteux.', es: 'Verifica el código SWIFT — los errores causan devoluciones costosas.' },
  },
  {
    id: 'invoice', hl: 'invoiceBtn',
    title:   { en: 'Invoicing', fr: 'Facturation', es: 'Facturación' },
    path:    { en: 'Home → Receive → Send Invoice by Email', fr: 'Accueil → Recevoir → Envoyer la Facture par Email', es: 'Inicio → Recibir → Enviar Factura por Email' },
    prompt:  { en: 'Tap Send Invoice by Email to send the invoice', fr: 'Appuyez sur Envoyer la Facture par Email pour envoyer la facture', es: 'Toca Enviar Factura por Email para enviar la factura' },
    explain: {
      en: 'After generating a payment link, tap Send Invoice by Email. DEUS composes a professional invoice with your business name, logo, and payment details, and emails it directly to your client.',
      fr: 'Après avoir généré un lien de paiement, appuyez sur Envoyer la Facture par Email. DEUS compose une facture professionnelle avec votre nom d\'entreprise, logo et détails de paiement, et l\'envoie directement à votre client.',
      es: 'Después de generar un enlace de pago, toca Enviar Factura por Email. DEUS compone una factura profesional con tu nombre de empresa, logo y detalles de pago, y la envía directamente a tu cliente.',
    },
    tip: { en: 'Invoices are PDF-ready and branded with the IFB seal.', fr: 'Les factures sont prêtes en PDF et brandées avec le sceau IFB.', es: 'Las facturas están listas en PDF y con el sello IFB.' },
  },
  {
    id: 'withdraw-cot', hl: 'cotBtn',
    title:   { en: 'Withdraw — Community of Trust P2P', fr: 'Retrait — Communauté de Confiance P2P', es: 'Retirar — Comunidad de Confianza P2P' },
    path:    { en: 'Home → Withdraw → Community of Trust P2P', fr: 'Accueil → Retirer → Communauté de Confiance P2P', es: 'Inicio → Retirar → Comunidad de Confianza P2P' },
    prompt:  { en: 'Tap Community of Trust P2P to choose peer-to-peer withdrawal', fr: 'Appuyez sur Communauté de Confiance P2P pour choisir le retrait pair-à-pair', es: 'Toca Comunidad de Confianza P2P para elegir retiro peer-to-peer' },
    explain: {
      en: 'CoT P2P connects you with a verified local peer who physically hands you cash or mobile money. Options include Local Bank, Mobile Money, and Cash. Best for fast local withdrawals with minimal fees.',
      fr: 'CoT P2P vous connecte avec un pair local vérifié qui vous remet physiquement de l\'argent liquide ou mobile. Les options incluent Banque Locale, Mobile Money et Espèces. Idéal pour les retraits locaux rapides avec des frais minimaux.',
      es: 'CoT P2P te conecta con un par local verificado que te entrega físicamente efectivo o dinero móvil. Las opciones incluyen Banco Local, Dinero Móvil y Efectivo. Ideal para retiros locales rápidos con tarifas mínimas.',
    },
    tip: { en: 'Always meet your P2P peer in a public location.', fr: 'Rencontrez toujours votre pair P2P dans un lieu public.', es: 'Siempre reúnete con tu par P2P en un lugar público.' },
  },
  {
    id: 'ledger', hl: 'exportBtn',
    title:   { en: 'Transaction History & Export', fr: 'Historique des Transactions et Export', es: 'Historial de Transacciones y Exportar' },
    path:    { en: 'Bottom Nav → Transactions', fr: 'Barre de navigation → Transactions', es: 'Barra de navegación → Transacciones' },
    prompt:  { en: 'Tap Export to download your statement', fr: 'Appuyez sur Exporter pour télécharger votre relevé', es: 'Toca Exportar para descargar tu estado de cuenta' },
    explain: {
      en: 'The Transactions screen shows a complete ledger of all your activity. Filter by date range, type, or amount. Tap Export to download a PDF or CSV statement — useful for tax filings and audits.',
      fr: 'L\'écran Transactions affiche un grand livre complet de toute votre activité. Filtrez par plage de dates, type ou montant. Appuyez sur Exporter pour télécharger un relevé PDF ou CSV — utile pour les déclarations fiscales et les audits.',
      es: 'La pantalla de Transacciones muestra un libro mayor completo de toda tu actividad. Filtra por rango de fechas, tipo o monto. Toca Exportar para descargar un estado de cuenta PDF o CSV — útil para declaraciones de impuestos y auditorías.',
    },
    tip: { en: 'CSV exports open directly in Excel or Google Sheets.', fr: 'Les exports CSV s\'ouvrent directement dans Excel ou Google Sheets.', es: 'Los exports CSV se abren directamente en Excel o Google Sheets.' },
  },
  {
    id: 'summary', noTap: true,
    title:   { en: 'You\'re Ready!', fr: 'Vous êtes Prêt!', es: '¡Estás Listo!' },
    path:    { en: 'Course Complete', fr: 'Cours Terminé', es: 'Curso Completado' },
    prompt:  { en: '', fr: '', es: '' },
    explain: {
      en: 'You\'ve learned all 13 core DEUS transaction flows — from depositing funds to international wires, QR payments, NFC, invoicing, and exporting statements. Take the assessment to earn your certificate.',
      fr: 'Vous avez appris les 13 flux de transactions DEUS principaux — des dépôts de fonds aux virements internationaux, paiements QR, NFC, facturation et export de relevés. Passez l\'évaluation pour obtenir votre certificat.',
      es: 'Aprendiste los 13 flujos de transacciones principales de DEUS — desde depositar fondos hasta wires internacionales, pagos QR, NFC, facturación y exportar estados de cuenta. Realiza la evaluación para obtener tu certificado.',
    },
    tip: { en: '', fr: '', es: '' },
  },
];

// ─── ASSESSMENT ───────────────────────────────────────────────────────────────
const QUESTIONS = {
  en: [
    { q: 'Which deposit method charges the lowest combined fee?', opts: ['Global Card Network (Stripe)', 'Community of Trust (CoT)', 'Bank Wire', 'Cash Deposit'], ans: 1 },
    { q: 'Where do you find the NFC Tap & Pay feature?', opts: ['Home → More', 'Bottom Nav center button', 'Home → Receive', 'Settings → Payments'], ans: 1 },
    { q: 'What does "IFB Handled" mean on the Withdrawal screen?', opts: ['Instant transfer', 'IFB verifies and processes the wire manually', 'No fee applies', 'ATM withdrawal'], ans: 1 },
    { q: 'How do you send a formal invoice to a client?', opts: ['Export → PDF', 'Home → Receive → Generate Link → Send Invoice by Email', 'Home → Send → Invoice mode', 'Transactions → New Invoice'], ans: 1 },
    { q: 'Your Pay Me QR code is…', opts: ['Different every day', 'Unique and permanent to your account', 'Shared across all IFB users', 'Only valid for USD'], ans: 1 },
    { q: 'Which export formats does DEUS support for statements?', opts: ['PDF only', 'CSV only', 'PDF and CSV', 'XLS only'], ans: 2 },
    { q: 'How long do payment links (from Generate Link) stay active?', opts: ['24 hours', '48 hours', '72 hours', '7 days'], ans: 2 },
    { q: 'For fast local cash withdrawal with minimal fees, you should use…', opts: ['SWIFT wire', 'Global Bank/Card', 'Community of Trust P2P', 'ATM Card'], ans: 2 },
  ],
  fr: [
    { q: 'Quelle méthode de dépôt a les frais combinés les plus bas?', opts: ['Réseau Global de Cartes (Stripe)', 'Communauté de Confiance (CoT)', 'Virement Bancaire', 'Dépôt en Espèces'], ans: 1 },
    { q: 'Où trouvez-vous la fonctionnalité NFC Tap & Pay?', opts: ['Accueil → Plus', 'Bouton central de la barre de navigation', 'Accueil → Recevoir', 'Paramètres → Paiements'], ans: 1 },
    { q: 'Que signifie "IFB Géré" sur l\'écran de retrait?', opts: ['Transfert instantané', 'IFB vérifie et traite le virement manuellement', 'Aucun frais applicable', 'Retrait ATM'], ans: 1 },
    { q: 'Comment envoyer une facture formelle à un client?', opts: ['Export → PDF', 'Accueil → Recevoir → Générer Lien → Envoyer Facture par Email', 'Accueil → Envoyer → Mode Facture', 'Transactions → Nouvelle Facture'], ans: 1 },
    { q: 'Votre code QR Payez-Moi est…', opts: ['Différent chaque jour', 'Unique et permanent pour votre compte', 'Partagé entre tous les utilisateurs IFB', 'Valide uniquement en USD'], ans: 1 },
    { q: 'Quels formats d\'export DEUS supporte-t-il pour les relevés?', opts: ['PDF seulement', 'CSV seulement', 'PDF et CSV', 'XLS seulement'], ans: 2 },
    { q: 'Combien de temps les liens de paiement restent-ils actifs?', opts: ['24 heures', '48 heures', '72 heures', '7 jours'], ans: 2 },
    { q: 'Pour un retrait local rapide en espèces avec des frais minimaux, utilisez…', opts: ['Virement SWIFT', 'Banque/Carte Mondiale', 'Communauté de Confiance P2P', 'Carte ATM'], ans: 2 },
  ],
  es: [
    { q: '¿Qué método de depósito cobra la tarifa combinada más baja?', opts: ['Red Global de Tarjetas (Stripe)', 'Comunidad de Confianza (CoT)', 'Wire Bancario', 'Depósito en Efectivo'], ans: 1 },
    { q: '¿Dónde encuentras la función NFC Tap & Pay?', opts: ['Inicio → Más', 'Botón central de la barra de navegación', 'Inicio → Recibir', 'Ajustes → Pagos'], ans: 1 },
    { q: '¿Qué significa "IFB Gestionado" en la pantalla de Retiro?', opts: ['Transferencia instantánea', 'IFB verifica y procesa el wire manualmente', 'No aplica tarifa', 'Retiro ATM'], ans: 1 },
    { q: '¿Cómo envías una factura formal a un cliente?', opts: ['Exportar → PDF', 'Inicio → Recibir → Generar Enlace → Enviar Factura por Email', 'Inicio → Enviar → Modo Factura', 'Transacciones → Nueva Factura'], ans: 1 },
    { q: 'Tu código QR de Págame es…', opts: ['Diferente cada día', 'Único y permanente para tu cuenta', 'Compartido entre todos los usuarios IFB', 'Solo válido en USD'], ans: 1 },
    { q: '¿Qué formatos de exportación soporta DEUS para estados de cuenta?', opts: ['Solo PDF', 'Solo CSV', 'PDF y CSV', 'Solo XLS'], ans: 2 },
    { q: '¿Cuánto tiempo permanecen activos los enlaces de pago?', opts: ['24 horas', '48 horas', '72 horas', '7 días'], ans: 2 },
    { q: 'Para retiro local rápido en efectivo con tarifas mínimas, usa…', opts: ['Wire SWIFT', 'Banco/Tarjeta Global', 'Comunidad de Confianza P2P', 'Tarjeta ATM'], ans: 2 },
  ],
};

const CERT = {
  en: { title: 'Transaction Mastery Certificate', sub: 'has successfully completed the DEUS Transaction Guide', issuer: 'Infinite Future Bank · DEUS OS' },
  fr: { title: 'Certificat de Maîtrise des Transactions', sub: 'a réussi le Guide des Transactions DEUS', issuer: 'Infinite Future Bank · DEUS OS' },
  es: { title: 'Certificado de Dominio de Transacciones', sub: 'ha completado exitosamente la Guía de Transacciones DEUS', issuer: 'Infinite Future Bank · DEUS OS' },
};

// ─── PHONE FRAME ─────────────────────────────────────────────────────────────
function Phone({ children, dark = false }) {
  return (
    <div className="relative mx-auto" style={{ width: 252, height: 496 }}>
      {/* Outer shell */}
      <div className={`absolute inset-0 rounded-[36px] ${dark ? 'bg-slate-900' : 'bg-white'} shadow-2xl border-2 ${dark ? 'border-slate-700' : 'border-slate-200'}`} />
      {/* Dynamic island */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full z-10" />
      {/* Status bar */}
      <div className={`absolute top-8 left-4 right-4 flex justify-between items-center z-10 ${dark ? 'text-white' : 'text-slate-800'}`} style={{ fontSize: 8, fontWeight: 700 }}>
        <span>9:41</span>
        <div className="flex items-center gap-1">
          <span>●●●</span>
          <span>WiFi</span>
          <span>🔋</span>
        </div>
      </div>
      {/* Screen content */}
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

function DashboardScreen({ hl, onTap, done }) {
  const actions = [
    { id: 'SEND',     icon: Send,          label: 'Send',     color: 'bg-blue-600' },
    { id: 'REQUEST',  icon: Download,      label: 'Receive',  color: 'bg-emerald-600' },
    { id: 'PAY_ME',   icon: QrCode,        label: 'Pay Me',   color: 'bg-blue-500' },
    { id: 'DEPOSIT',  icon: Plus,          label: 'Add',      color: 'bg-emerald-500' },
    { id: 'WITHDRAW', icon: Landmark,      label: 'Withdraw', color: 'bg-slate-600' },
    { id: 'NFC',      icon: Wifi,          label: 'Tap & Pay',color: 'bg-violet-600' },
    { id: 'VAULT',    icon: Shield,        label: 'Vault',    color: 'bg-indigo-700' },
    { id: 'TRANSFER', icon: ArrowRightLeft,label: 'Exchange', color: 'bg-indigo-600' },
    { id: 'ANALYTICS',icon: BarChart2,     label: 'Analytics',color: 'bg-slate-500' },
  ];

  return (
    <div className="w-full h-full bg-[#0a0f1e] flex flex-col">
      {/* Header */}
      <div className="px-3 pt-2 pb-1">
        <div className="text-slate-400" style={{ fontSize: 8 }}>IFB Account · USD</div>
        <div className="text-white font-black" style={{ fontSize: 20 }}>$12,450.00</div>
        <div className="text-emerald-400" style={{ fontSize: 7 }}>▲ +$320 today</div>
      </div>

      {/* Quick actions grid */}
      <div className="px-2 mt-1">
        <div className="text-slate-400 mb-1" style={{ fontSize: 7 }}>Quick Actions</div>
        <div className="grid grid-cols-5 gap-1">
          {actions.slice(0, 5).map((a) => {
            const Icon = a.icon;
            const isHL = hl === a.id;
            const btn = (
              <div key={a.id} className="flex flex-col items-center gap-0.5">
                <div className={`w-9 h-9 rounded-xl ${a.color} flex items-center justify-center`}>
                  <Icon size={14} className="text-white" />
                </div>
                <span className="text-slate-400 text-center leading-tight" style={{ fontSize: 6 }}>{a.label}</span>
              </div>
            );
            return isHL ? <HL key={a.id} onTap={onTap} done={done} radius="rounded-xl" labelPos="top">{btn}</HL> : btn;
          })}
        </div>
        <div className="grid grid-cols-4 gap-1 mt-1">
          {actions.slice(5).map((a) => {
            const Icon = a.icon;
            const isHL = hl === a.id;
            const btn = (
              <div key={a.id} className="flex flex-col items-center gap-0.5">
                <div className={`w-9 h-9 rounded-xl ${a.color} flex items-center justify-center`}>
                  <Icon size={14} className="text-white" />
                </div>
                <span className="text-slate-400 text-center leading-tight" style={{ fontSize: 6 }}>{a.label}</span>
              </div>
            );
            return isHL ? <HL key={a.id} onTap={onTap} done={done} radius="rounded-xl" labelPos="top">{btn}</HL> : btn;
          })}
        </div>
      </div>

      {/* Recent tx stub */}
      <div className="px-2 mt-2 flex-1">
        <div className="text-slate-400 mb-1" style={{ fontSize: 7 }}>Recent</div>
        {[{ label: 'Maria Santos', amt: '-$50.00', color: 'text-red-400' }, { label: 'Deposit CoT', amt: '+$200.00', color: 'text-emerald-400' }].map((t, i) => (
          <div key={i} className="flex justify-between items-center py-1 border-b border-slate-800">
            <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center">
              <span className="text-white" style={{ fontSize: 6 }}>{t.label[0]}</span>
            </div>
            <span className="text-white flex-1 ml-1" style={{ fontSize: 7 }}>{t.label}</span>
            <span className={`font-bold ${t.color}`} style={{ fontSize: 7 }}>{t.amt}</span>
          </div>
        ))}
      </div>

      {/* Bottom nav */}
      <div className="bg-[#0a0f1e] border-t border-slate-800 flex items-center justify-around px-2 py-1.5 relative">
        <div className="flex flex-col items-center">
          <Compass size={13} className="text-blue-400" strokeWidth={2.5} />
          <div className="absolute top-0 left-[17px] w-6 h-0.5 bg-blue-500 rounded" />
          <span className="text-blue-400" style={{ fontSize: 5 }}>Home</span>
        </div>
        <div className="flex flex-col items-center">
          <ArrowRightLeft size={13} className="text-slate-400" />
          <span className="text-slate-400" style={{ fontSize: 5 }}>Transactions</span>
        </div>
        {/* Center CreditCard */}
        <div className="-mt-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg">
            <CreditCard size={16} className="text-white" />
          </div>
        </div>
        <div className="flex flex-col items-center">
          <Bell size={13} className="text-slate-400" />
          <span className="text-slate-400" style={{ fontSize: 5 }}>Alerts</span>
        </div>
        <div className="flex flex-col items-center">
          <Menu size={13} className="text-slate-400" />
          <span className="text-slate-400" style={{ fontSize: 5 }}>More</span>
        </div>
      </div>
    </div>
  );
}

function DepositScreen({ onTap, done }) {
  return (
    <div className="w-full h-full bg-[#0B0F19] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 pt-2 pb-2">
        <ArrowLeft size={14} className="text-white" />
        <span className="text-white font-black" style={{ fontSize: 12 }}>Add Funds</span>
      </div>
      {/* Tabs */}
      <div className="flex mx-3 bg-slate-800 rounded-xl p-0.5 mb-3">
        <div className="flex-1 bg-white rounded-lg text-center text-slate-900 font-bold" style={{ fontSize: 8, padding: '3px 0' }}>New Deposit</div>
        <div className="flex-1 text-center text-slate-400" style={{ fontSize: 8, padding: '3px 0' }}>Records</div>
      </div>
      {/* Amount */}
      <div className="text-center py-2">
        <div className="text-slate-400" style={{ fontSize: 8 }}>Enter Amount</div>
        <div className="text-white font-black" style={{ fontSize: 26 }}>$0.00</div>
      </div>
      {/* Method cards */}
      <div className="px-3 flex flex-col gap-2 flex-1">
        {/* Global Card Network */}
        <div className="bg-blue-900/30 border border-blue-600/40 rounded-2xl p-3 flex items-start gap-2">
          <div className="w-7 h-7 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
            <CreditCard size={13} className="text-white" />
          </div>
          <div>
            <div className="text-white font-bold" style={{ fontSize: 9 }}>Global Card Network</div>
            <div className="text-slate-400" style={{ fontSize: 7 }}>Stripe Gateway · 2.9% Fee</div>
          </div>
        </div>
        {/* Community of Trust */}
        <HL onTap={onTap} done={done} radius="rounded-2xl" labelPos="top">
          <div className="bg-emerald-900/30 border-2 border-emerald-400 rounded-2xl p-3 flex items-start gap-2">
            <div className="w-7 h-7 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0">
              <Users size={13} className="text-white" />
            </div>
            <div>
              <div className="text-white font-bold" style={{ fontSize: 9 }}>Community of Trust</div>
              <div className="text-emerald-300" style={{ fontSize: 7 }}>1% IFB Fee · 2% Processor Reward</div>
            </div>
          </div>
        </HL>
      </div>
    </div>
  );
}

function SendScreen({ onTap, done }) {
  return (
    <div className="w-full h-full bg-[#0a0f1e] flex flex-col justify-end">
      <div className="h-24 flex items-center justify-center">
        <div className="text-slate-600" style={{ fontSize: 9 }}>Dashboard (dimmed)</div>
      </div>
      {/* Bottom sheet */}
      <div className="bg-white rounded-t-[20px] flex flex-col gap-2 p-4 flex-1">
        <div className="text-slate-900 font-black mb-1" style={{ fontSize: 11 }}>Send Money</div>
        {/* Currency */}
        <div>
          <div className="text-slate-500" style={{ fontSize: 7 }}>Currency</div>
          <div className="flex gap-1 mt-0.5">
            <div className="flex-1 bg-blue-50 border border-blue-300 rounded-lg text-center text-blue-700 font-bold" style={{ fontSize: 8, padding: '3px' }}>USD</div>
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg text-center text-slate-500" style={{ fontSize: 8, padding: '3px' }}>AFR</div>
          </div>
        </div>
        {/* Contact */}
        <div>
          <div className="text-slate-500" style={{ fontSize: 7 }}>Recipient</div>
          <div className="bg-slate-100 rounded-lg p-1.5 mt-0.5 flex items-center gap-1">
            <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center">
              <span style={{ fontSize: 7 }}>M</span>
            </div>
            <span className="text-slate-700" style={{ fontSize: 8 }}>Maria Santos</span>
          </div>
        </div>
        {/* Amount */}
        <div>
          <div className="text-slate-500" style={{ fontSize: 7 }}>Amount</div>
          <div className="bg-slate-100 rounded-lg p-1.5 mt-0.5">
            <span className="text-slate-900 font-bold" style={{ fontSize: 12 }}>$50.00</span>
          </div>
        </div>
        {/* Note */}
        <div>
          <div className="text-slate-500" style={{ fontSize: 7 }}>Note (optional)</div>
          <div className="bg-slate-100 rounded-lg p-1.5 mt-0.5">
            <span className="text-slate-400" style={{ fontSize: 8 }}>Lunch split</span>
          </div>
        </div>
        {/* Send Now */}
        <HL onTap={onTap} done={done} radius="rounded-xl" labelPos="top">
          <div className="w-full bg-blue-600 rounded-xl text-center text-white font-black" style={{ fontSize: 10, padding: '7px' }}>
            Send Now
          </div>
        </HL>
      </div>
    </div>
  );
}

function WithdrawScreen({ variant, onTap, done }) {
  // variant: 'GLOBAL' | 'COT'
  return (
    <div className="w-full h-full bg-white flex flex-col">
      <div className="flex items-center gap-2 px-3 pt-2 pb-2 border-b border-slate-100">
        <ArrowLeft size={13} className="text-slate-800" />
        <span className="text-slate-900 font-black" style={{ fontSize: 11 }}>Withdraw Capital</span>
      </div>
      {/* Tabs */}
      <div className="flex mx-3 mt-2 bg-slate-100 rounded-xl p-0.5 mb-2">
        <div className="flex-1 bg-white rounded-lg text-center text-slate-900 font-bold" style={{ fontSize: 7, padding: '3px 0' }}>Withdraw</div>
        <div className="flex-1 text-center text-slate-400" style={{ fontSize: 7, padding: '3px 0' }}>History</div>
      </div>
      {/* Amount */}
      <div className="text-center py-2">
        <div className="text-slate-400" style={{ fontSize: 8 }}>Amount</div>
        <div className="text-slate-900 font-black" style={{ fontSize: 22 }}>$0.00</div>
      </div>
      {/* Methods */}
      <div className="px-3 flex flex-col gap-2 flex-1">
        {/* CoT P2P */}
        {variant === 'COT' ? (
          <HL onTap={onTap} done={done} radius="rounded-2xl" labelPos="top">
            <div className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-3 flex items-start gap-2">
              <div className="w-7 h-7 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0">
                <MapPin size={13} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <span className="text-slate-900 font-bold" style={{ fontSize: 9 }}>Community of Trust P2P</span>
                  <span className="bg-emerald-100 text-emerald-700 font-bold rounded-full px-1" style={{ fontSize: 6 }}>Peer Network</span>
                </div>
                <div className="text-slate-500" style={{ fontSize: 7 }}>Local Bank · Mobile Money · Cash</div>
              </div>
            </div>
          </HL>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-start gap-2">
            <div className="w-7 h-7 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0">
              <MapPin size={13} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1">
                <span className="text-slate-900 font-bold" style={{ fontSize: 9 }}>Community of Trust P2P</span>
                <span className="bg-emerald-100 text-emerald-700 font-bold rounded-full px-1" style={{ fontSize: 6 }}>Peer Network</span>
              </div>
              <div className="text-slate-500" style={{ fontSize: 7 }}>Local Bank · Mobile Money · Cash</div>
            </div>
          </div>
        )}
        {/* Global Bank/Card */}
        {variant === 'GLOBAL' ? (
          <HL onTap={onTap} done={done} radius="rounded-2xl" labelPos="top">
            <div className="bg-blue-50 border-2 border-blue-400 rounded-2xl p-3 flex items-start gap-2">
              <div className="w-7 h-7 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                <Landmark size={13} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <span className="text-slate-900 font-bold" style={{ fontSize: 9 }}>Global Bank / Card</span>
                  <span className="bg-blue-100 text-blue-700 font-bold rounded-full px-1" style={{ fontSize: 6 }}>IFB Handled</span>
                </div>
                <div className="text-slate-500" style={{ fontSize: 7 }}>International Wire · ACH</div>
              </div>
            </div>
          </HL>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 flex items-start gap-2">
            <div className="w-7 h-7 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Landmark size={13} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1">
                <span className="text-slate-900 font-bold" style={{ fontSize: 9 }}>Global Bank / Card</span>
                <span className="bg-blue-100 text-blue-700 font-bold rounded-full px-1" style={{ fontSize: 6 }}>IFB Handled</span>
              </div>
              <div className="text-slate-500" style={{ fontSize: 7 }}>International Wire · ACH</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReceiveScreen({ onTap, done }) {
  return (
    <div className="w-full h-full bg-white flex flex-col p-4 gap-2">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
        <ArrowLeft size={13} className="text-slate-800" />
        <span className="text-slate-900 font-black" style={{ fontSize: 11 }}>Request Funds</span>
      </div>
      <div>
        <div className="text-slate-500" style={{ fontSize: 7 }}>Purpose</div>
        <div className="bg-slate-100 rounded-lg p-1.5 mt-0.5">
          <span className="text-slate-700" style={{ fontSize: 8 }}>Freelance design work</span>
        </div>
      </div>
      <div>
        <div className="text-slate-500" style={{ fontSize: 7 }}>Client email</div>
        <div className="bg-slate-100 rounded-lg p-1.5 mt-0.5">
          <span className="text-slate-700" style={{ fontSize: 8 }}>client@company.com</span>
        </div>
      </div>
      <div>
        <div className="text-slate-500" style={{ fontSize: 7 }}>Amount</div>
        <div className="bg-slate-100 rounded-lg p-1.5 mt-0.5">
          <span className="text-slate-900 font-bold" style={{ fontSize: 11 }}>$350.00</span>
        </div>
      </div>
      <HL onTap={onTap} done={done} radius="rounded-xl" labelPos="top">
        <div className="w-full bg-emerald-600 rounded-xl text-center text-white font-black" style={{ fontSize: 9, padding: '6px' }}>
          Generate Link
        </div>
      </HL>
      <div className="text-center text-slate-400" style={{ fontSize: 7 }}>or</div>
      <div className="w-full border border-slate-300 rounded-xl text-center text-slate-600 font-bold" style={{ fontSize: 8, padding: '5px' }}>
        Send Invoice by Email
      </div>
    </div>
  );
}

function QRScreen({ onTap, done }) {
  return (
    <div className="w-full h-full bg-slate-900 flex flex-col">
      <div className="flex items-center gap-2 px-3 pt-2 pb-2">
        <ArrowLeft size={13} className="text-white" />
        <span className="text-white font-black" style={{ fontSize: 11 }}>Pay Me</span>
      </div>
      {/* Tabs */}
      <div className="flex mx-3 bg-slate-800 rounded-xl p-0.5 mb-3">
        <div className="flex-1 bg-white rounded-lg text-center text-slate-900 font-bold" style={{ fontSize: 7, padding: '3px 0' }}>QR Code</div>
        <div className="flex-1 text-center text-slate-400" style={{ fontSize: 7, padding: '3px 0' }}>Link</div>
        <div className="flex-1 text-center text-slate-400" style={{ fontSize: 7, padding: '3px 0' }}>Card</div>
      </div>
      <div className="flex flex-col items-center flex-1 pt-2">
        <HL onTap={onTap} done={done} radius="rounded-xl" labelPos="top">
          {/* QR code SVG */}
          <div className="bg-white p-2 rounded-xl">
            <svg width="96" height="96" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
              {/* top-left finder */}
              <rect x="1" y="1" width="7" height="7" rx="1" fill="black"/>
              <rect x="2" y="2" width="5" height="5" rx="0.5" fill="white"/>
              <rect x="3" y="3" width="3" height="3" fill="black"/>
              {/* top-right finder */}
              <rect x="13" y="1" width="7" height="7" rx="1" fill="black"/>
              <rect x="14" y="2" width="5" height="5" rx="0.5" fill="white"/>
              <rect x="15" y="3" width="3" height="3" fill="black"/>
              {/* bottom-left finder */}
              <rect x="1" y="13" width="7" height="7" rx="1" fill="black"/>
              <rect x="2" y="14" width="5" height="5" rx="0.5" fill="white"/>
              <rect x="3" y="15" width="3" height="3" fill="black"/>
              {/* data modules */}
              <rect x="9" y="1" width="1" height="1" fill="black"/>
              <rect x="11" y="1" width="1" height="1" fill="black"/>
              <rect x="9" y="3" width="2" height="1" fill="black"/>
              <rect x="9" y="5" width="1" height="1" fill="black"/>
              <rect x="11" y="4" width="1" height="2" fill="black"/>
              <rect x="9" y="9" width="3" height="1" fill="black"/>
              <rect x="13" y="9" width="2" height="1" fill="black"/>
              <rect x="16" y="9" width="4" height="1" fill="black"/>
              <rect x="9" y="11" width="1" height="1" fill="black"/>
              <rect x="11" y="11" width="3" height="1" fill="black"/>
              <rect x="15" y="11" width="2" height="1" fill="black"/>
              <rect x="18" y="11" width="2" height="1" fill="black"/>
              <rect x="9" y="13" width="2" height="1" fill="black"/>
              <rect x="12" y="13" width="1" height="1" fill="black"/>
              <rect x="14" y="13" width="3" height="1" fill="black"/>
              <rect x="9" y="15" width="1" height="3" fill="black"/>
              <rect x="11" y="15" width="2" height="1" fill="black"/>
              <rect x="14" y="15" width="1" height="1" fill="black"/>
              <rect x="16" y="15" width="4" height="1" fill="black"/>
              <rect x="11" y="17" width="3" height="1" fill="black"/>
              <rect x="15" y="17" width="1" height="1" fill="black"/>
              <rect x="17" y="17" width="1" height="1" fill="black"/>
              <rect x="9" y="19" width="2" height="1" fill="black"/>
              <rect x="12" y="19" width="2" height="1" fill="black"/>
              <rect x="15" y="19" width="3" height="1" fill="black"/>
              <rect x="19" y="19" width="1" height="1" fill="black"/>
            </svg>
          </div>
        </HL>
        <div className="text-slate-400 mt-2" style={{ fontSize: 8 }}>Scan to pay · IFB Account</div>
        <div className="text-white font-bold mt-1" style={{ fontSize: 9 }}>sapiens.ifb</div>
        <div className="mt-3 bg-slate-800 px-4 py-2 rounded-xl flex items-center gap-2">
          <FileText size={11} className="text-slate-300" />
          <span className="text-slate-300 font-bold" style={{ fontSize: 8 }}>Share QR</span>
        </div>
      </div>
    </div>
  );
}

function LinkScreen({ onTap, done }) {
  return (
    <div className="w-full h-full bg-slate-900 flex flex-col">
      <div className="flex items-center gap-2 px-3 pt-2 pb-2">
        <ArrowLeft size={13} className="text-white" />
        <span className="text-white font-black" style={{ fontSize: 11 }}>Pay Me</span>
      </div>
      {/* Tabs */}
      <div className="flex mx-3 bg-slate-800 rounded-xl p-0.5 mb-3">
        <div className="flex-1 text-center text-slate-400" style={{ fontSize: 7, padding: '3px 0' }}>QR Code</div>
        <div className="flex-1 bg-white rounded-lg text-center text-slate-900 font-bold" style={{ fontSize: 7, padding: '3px 0' }}>Link</div>
        <div className="flex-1 text-center text-slate-400" style={{ fontSize: 7, padding: '3px 0' }}>Card</div>
      </div>
      <div className="flex flex-col items-center flex-1 px-3 gap-3">
        <div className="text-slate-400 text-center" style={{ fontSize: 8 }}>Your permanent payment URL</div>
        <div className="w-full bg-slate-800 rounded-xl p-3">
          <div className="text-emerald-400 font-mono text-center" style={{ fontSize: 7 }}>pay.infinitefuturebank.org/</div>
          <div className="text-white font-mono font-bold text-center" style={{ fontSize: 9 }}>@sapiens.ifb</div>
        </div>
        <HL onTap={onTap} done={done} radius="rounded-xl" labelPos="top">
          <div className="flex items-center gap-2 bg-blue-600 rounded-xl px-4 py-2">
            <Copy size={12} className="text-white" />
            <span className="text-white font-black" style={{ fontSize: 9 }}>Copy Link</span>
          </div>
        </HL>
        <div className="w-full bg-slate-800 rounded-xl p-2 flex flex-col gap-1.5">
          {['WhatsApp', 'Email', 'SMS'].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-slate-600" />
              <span className="text-slate-300" style={{ fontSize: 8 }}>Share via {s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PayMeCardScreen({ onTap, done }) {
  return (
    <div className="w-full h-full bg-slate-900 flex flex-col">
      <div className="flex items-center gap-2 px-3 pt-2 pb-2">
        <ArrowLeft size={13} className="text-white" />
        <span className="text-white font-black" style={{ fontSize: 11 }}>Pay Me</span>
      </div>
      {/* Tabs */}
      <div className="flex mx-3 bg-slate-800 rounded-xl p-0.5 mb-3">
        <div className="flex-1 text-center text-slate-400" style={{ fontSize: 7, padding: '3px 0' }}>QR Code</div>
        <div className="flex-1 text-center text-slate-400" style={{ fontSize: 7, padding: '3px 0' }}>Link</div>
        <div className="flex-1 bg-white rounded-lg text-center text-slate-900 font-bold" style={{ fontSize: 7, padding: '3px 0' }}>Card</div>
      </div>
      {/* Virtual card */}
      <div className="mx-3 rounded-2xl p-4 mb-3" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2a4a 100%)' }}>
        <div className="flex justify-between items-start">
          <div>
            <div className="text-slate-400" style={{ fontSize: 6 }}>VIRTUAL CARD</div>
            <div className="text-white font-bold" style={{ fontSize: 8 }}>IFB · Infinite Future Bank</div>
          </div>
          <div className="text-blue-400 font-black" style={{ fontSize: 10 }}>VISA</div>
        </div>
        <div className="text-white font-mono mt-2" style={{ fontSize: 9, letterSpacing: 2 }}>•••• •••• •••• 4821</div>
        <div className="flex justify-between mt-2">
          <div>
            <div className="text-slate-400" style={{ fontSize: 5 }}>VALID THRU</div>
            <div className="text-white font-mono" style={{ fontSize: 8 }}>12/28</div>
          </div>
          <div>
            <div className="text-slate-400" style={{ fontSize: 5 }}>LIMIT</div>
            <div className="text-white font-mono" style={{ fontSize: 8 }}>$5,000</div>
          </div>
        </div>
      </div>
      {/* Controls */}
      <div className="px-3 flex flex-col gap-2">
        <HL onTap={onTap} done={done} radius="rounded-xl" labelPos="top">
          <div className="w-full flex items-center gap-2 bg-slate-700 rounded-xl px-3 py-2">
            <Lock size={12} className="text-yellow-400" />
            <span className="text-white font-bold" style={{ fontSize: 9 }}>Freeze Card</span>
          </div>
        </HL>
        <div className="flex gap-2">
          <div className="flex-1 bg-slate-800 rounded-xl flex items-center gap-1.5 px-2 py-1.5">
            <Globe size={10} className="text-blue-400" />
            <span className="text-slate-300" style={{ fontSize: 7 }}>Online Use: ON</span>
          </div>
          <div className="flex-1 bg-slate-800 rounded-xl flex items-center gap-1.5 px-2 py-1.5">
            <Zap size={10} className="text-emerald-400" />
            <span className="text-slate-300" style={{ fontSize: 7 }}>Limit</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function NFCScreen({ onTap, done }) {
  return (
    <div className="w-full h-full bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="flex flex-col items-center pt-3 pb-2 border-b border-slate-800">
        <Wifi size={20} className="text-violet-400" />
        <div className="text-white font-black mt-1" style={{ fontSize: 11 }}>NFC Tap &amp; Pay</div>
        <div className="text-slate-400" style={{ fontSize: 7 }}>Hold phone near device to transact</div>
      </div>
      {/* Mode buttons */}
      <div className="flex flex-col gap-2 p-3 flex-1">
        <HL onTap={onTap} done={done} radius="rounded-2xl" labelPos="top">
          <div className="w-full bg-violet-900/40 border-2 border-violet-400 rounded-2xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center flex-shrink-0">
              <Send size={14} className="text-white" />
            </div>
            <div>
              <div className="text-white font-bold" style={{ fontSize: 9 }}>Send Money</div>
              <div className="text-slate-400" style={{ fontSize: 7 }}>Tap another DEUS device to pay</div>
            </div>
          </div>
        </HL>
        <div className="w-full bg-slate-800/60 border border-slate-700 rounded-2xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0">
            <Download size={14} className="text-white" />
          </div>
          <div>
            <div className="text-white font-bold" style={{ fontSize: 9 }}>Receive from IFB</div>
            <div className="text-slate-400" style={{ fontSize: 7 }}>Collect at IFB terminal</div>
          </div>
        </div>
        <div className="w-full bg-slate-800/60 border border-slate-700 rounded-2xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
            <CreditCard size={14} className="text-white" />
          </div>
          <div>
            <div className="text-white font-bold" style={{ fontSize: 9 }}>Get Paid by Card</div>
            <div className="text-slate-400" style={{ fontSize: 7 }}>Accept card payments</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SwiftScreen({ onTap, done }) {
  return (
    <div className="w-full h-full bg-white flex flex-col">
      <div className="flex items-center gap-2 px-3 pt-2 pb-2 border-b border-slate-100">
        <ArrowLeft size={13} className="text-slate-800" />
        <span className="text-slate-900 font-black" style={{ fontSize: 11 }}>International Transfer</span>
      </div>
      {/* Routing methods */}
      <div className="px-3 pt-3 flex flex-col gap-2">
        <HL onTap={onTap} done={done} radius="rounded-2xl" labelPos="top">
          <div className="bg-blue-50 border-2 border-blue-400 rounded-2xl p-3 flex items-start gap-2">
            <div className="w-7 h-7 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Globe size={13} className="text-white" />
            </div>
            <div>
              <div className="text-slate-900 font-bold" style={{ fontSize: 9 }}>SWIFT / Wire Transfer</div>
              <div className="text-slate-500" style={{ fontSize: 7 }}>IBAN · BIC · International routing</div>
              <div className="text-blue-600 font-bold mt-0.5" style={{ fontSize: 6 }}>1–3 business days</div>
            </div>
          </div>
        </HL>
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-start gap-2">
          <div className="w-7 h-7 rounded-xl bg-indigo-500 flex items-center justify-center flex-shrink-0">
            <ArrowRightLeft size={13} className="text-white" />
          </div>
          <div>
            <div className="text-slate-900 font-bold" style={{ fontSize: 9 }}>ACH Transfer</div>
            <div className="text-slate-500" style={{ fontSize: 7 }}>US domestic · Routing + Account</div>
            <div className="text-indigo-600 font-bold mt-0.5" style={{ fontSize: 6 }}>1–2 business days</div>
          </div>
        </div>
        {/* SWIFT form preview */}
        <div className="bg-slate-50 rounded-xl p-2 flex flex-col gap-1">
          <div className="text-slate-500" style={{ fontSize: 6 }}>Beneficiary IBAN</div>
          <div className="bg-white border border-slate-200 rounded-lg p-1"><span className="text-slate-400" style={{ fontSize: 7 }}>GB29 NWBK 6016 1331 9268 19</span></div>
          <div className="text-slate-500" style={{ fontSize: 6 }}>BIC / SWIFT Code</div>
          <div className="bg-white border border-slate-200 rounded-lg p-1"><span className="text-slate-400" style={{ fontSize: 7 }}>NWBKGB2L</span></div>
        </div>
      </div>
    </div>
  );
}

function InvoiceScreen({ onTap, done }) {
  return (
    <div className="w-full h-full bg-white flex flex-col p-4 gap-2">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
        <ArrowLeft size={13} className="text-slate-800" />
        <span className="text-slate-900 font-black" style={{ fontSize: 11 }}>Request Funds</span>
      </div>
      {/* payment link generated banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2 flex items-center gap-2">
        <Check size={12} className="text-emerald-600" />
        <div>
          <div className="text-emerald-800 font-bold" style={{ fontSize: 8 }}>Payment link generated</div>
          <div className="text-emerald-600 font-mono" style={{ fontSize: 6 }}>pay.ifb.org/req/8a2f...</div>
        </div>
        <div className="ml-auto">
          <div className="bg-blue-100 text-blue-700 font-bold rounded-lg px-2 py-0.5" style={{ fontSize: 7 }}>Copy</div>
        </div>
      </div>
      {/* Summary */}
      <div className="bg-slate-50 rounded-xl p-2">
        <div className="flex justify-between">
          <span className="text-slate-500" style={{ fontSize: 7 }}>For:</span>
          <span className="text-slate-800 font-bold" style={{ fontSize: 7 }}>Freelance design work</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500" style={{ fontSize: 7 }}>To:</span>
          <span className="text-slate-800 font-bold" style={{ fontSize: 7 }}>client@company.com</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500" style={{ fontSize: 7 }}>Amount:</span>
          <span className="text-slate-900 font-black" style={{ fontSize: 9 }}>$350.00</span>
        </div>
      </div>
      <HL onTap={onTap} done={done} radius="rounded-xl" labelPos="top">
        <div className="w-full flex items-center justify-center gap-2 bg-slate-800 rounded-xl text-white font-black" style={{ fontSize: 9, padding: '7px' }}>
          <FileText size={12} />
          Send Invoice by Email
        </div>
      </HL>
    </div>
  );
}

function LedgerScreen({ onTap, done }) {
  const txs = [
    { label: 'Maria Santos', type: 'Send', amt: '-$50.00', color: 'text-red-500', date: 'Today' },
    { label: 'CoT Deposit', type: 'Deposit', amt: '+$200.00', color: 'text-emerald-500', date: 'Today' },
    { label: 'SWIFT Wire', type: 'Wire', amt: '-$1,200.00', color: 'text-red-500', date: 'Yesterday' },
    { label: 'Pay Me QR', type: 'Receive', amt: '+$75.00', color: 'text-emerald-500', date: 'Yesterday' },
  ];
  return (
    <div className="w-full h-full bg-[#0a0f1e] flex flex-col">
      {/* Header row */}
      <div className="flex items-center justify-between px-3 pt-2 pb-2">
        <span className="text-white font-black" style={{ fontSize: 11 }}>Transactions</span>
        <HL onTap={onTap} done={done} radius="rounded-lg" labelPos="top">
          <div className="flex items-center gap-1 bg-slate-700 rounded-lg px-2 py-1">
            <Download size={11} className="text-white" />
            <span className="text-white font-bold" style={{ fontSize: 8 }}>Export</span>
          </div>
        </HL>
      </div>
      {/* Filter chips */}
      <div className="flex gap-1 px-3 mb-2">
        {['All', 'Send', 'Receive', 'Deposit'].map((f, i) => (
          <div key={f} className={`rounded-full px-2 py-0.5 font-bold ${i === 0 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`} style={{ fontSize: 6 }}>{f}</div>
        ))}
      </div>
      {/* Transactions */}
      <div className="flex-1 px-3 flex flex-col gap-1">
        {txs.map((t, i) => (
          <div key={i} className="bg-slate-800/50 rounded-xl p-2 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
              <span className="text-white" style={{ fontSize: 7 }}>{t.label[0]}</span>
            </div>
            <div className="flex-1">
              <div className="text-white font-bold" style={{ fontSize: 8 }}>{t.label}</div>
              <div className="text-slate-400" style={{ fontSize: 6 }}>{t.type} · {t.date}</div>
            </div>
            <span className={`font-black ${t.color}`} style={{ fontSize: 9 }}>{t.amt}</span>
          </div>
        ))}
      </div>
      {/* Bottom nav */}
      <div className="bg-[#0a0f1e] border-t border-slate-800 flex items-center justify-around px-2 py-1.5 relative">
        <div className="flex flex-col items-center">
          <Compass size={13} className="text-slate-400" />
          <span className="text-slate-400" style={{ fontSize: 5 }}>Home</span>
        </div>
        <div className="flex flex-col items-center relative">
          <ArrowRightLeft size={13} className="text-blue-400" strokeWidth={2.5} />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-blue-500 rounded" style={{ top: -6 }} />
          <span className="text-blue-400" style={{ fontSize: 5 }}>Transactions</span>
        </div>
        <div className="-mt-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg">
            <CreditCard size={16} className="text-white" />
          </div>
        </div>
        <div className="flex flex-col items-center">
          <Bell size={13} className="text-slate-400" />
          <span className="text-slate-400" style={{ fontSize: 5 }}>Alerts</span>
        </div>
        <div className="flex flex-col items-center">
          <Menu size={13} className="text-slate-400" />
          <span className="text-slate-400" style={{ fontSize: 5 }}>More</span>
        </div>
      </div>
    </div>
  );
}

function SummaryScreen() {
  return (
    <div className="w-full h-full bg-[#0a0f1e] flex flex-col items-center justify-center p-4">
      <div className="w-14 h-14 rounded-full bg-emerald-600/20 border-2 border-emerald-500 flex items-center justify-center mb-3">
        <CheckCircle2 size={28} className="text-emerald-400" />
      </div>
      <div className="text-white font-black text-center mb-1" style={{ fontSize: 13 }}>All 13 Flows Complete!</div>
      <div className="text-slate-400 text-center" style={{ fontSize: 8 }}>Take the assessment to earn{'\n'}your Transaction Certificate</div>
      <div className="mt-4 grid grid-cols-3 gap-1 w-full">
        {['Deposit', 'Send', 'Withdraw', 'Receive', 'QR Pay', 'Link Pay', 'Virtual Card', 'NFC', 'SWIFT', 'Invoice', 'P2P', 'Ledger', 'Export'].map((l) => (
          <div key={l} className="flex items-center gap-1">
            <Check size={8} className="text-emerald-400 flex-shrink-0" />
            <span className="text-slate-300" style={{ fontSize: 6 }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getScreen(idx, done, onTap) {
  switch (idx) {
    case 0:  return <DashboardScreen onTap={onTap} done={done} />;
    case 1:  return <DepositScreen onTap={onTap} done={done} />;
    case 2:  return <SendScreen onTap={onTap} done={done} />;
    case 3:  return <WithdrawScreen variant="GLOBAL" onTap={onTap} done={done} />;
    case 4:  return <ReceiveScreen onTap={onTap} done={done} />;
    case 5:  return <QRScreen onTap={onTap} done={done} />;
    case 6:  return <LinkScreen onTap={onTap} done={done} />;
    case 7:  return <PayMeCardScreen onTap={onTap} done={done} />;
    case 8:  return <NFCScreen onTap={onTap} done={done} />;
    case 9:  return <SwiftScreen onTap={onTap} done={done} />;
    case 10: return <InvoiceScreen onTap={onTap} done={done} />;
    case 11: return <WithdrawScreen variant="COT" onTap={onTap} done={done} />;
    case 12: return <LedgerScreen onTap={onTap} done={done} />;
    case 13: return <SummaryScreen />;
    default: return null;
  }
}

const isDark = (idx) => [1, 5, 6, 7, 8, 12, 13].includes(idx);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function TransactionGuide({ onClose }) {
  const [slide, setSlide]       = useState(0);
  const [tapped, setTapped]     = useState({});
  const [mode, setMode]         = useState('course'); // 'course' | 'assessment' | 'cert'
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
        {/* Top bar */}
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
        <div className="w-full max-w-sm bg-gradient-to-b from-emerald-900/40 to-slate-900 border-2 border-emerald-500/40 rounded-3xl p-8 flex flex-col items-center">
          <div className="flex gap-1 mb-4">
            <span className="text-2xl font-black text-[#4285F4]">D</span>
            <span className="text-2xl font-black text-[#EA4335]">E</span>
            <span className="text-2xl font-black text-[#FBBC04]">U</span>
            <span className="text-2xl font-black text-[#34A853]">S</span>
          </div>
          <Award size={48} className="text-emerald-400 mb-3" />
          <div className="text-emerald-400 font-black text-center text-lg mb-2">{c.title}</div>
          <div className="text-slate-400 text-xs text-center mb-4">{lang === 'fr' ? 'Ceci certifie que' : lang === 'es' ? 'Esto certifica que' : 'This certifies that'}</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={lang === 'fr' ? 'Votre nom complet' : lang === 'es' ? 'Tu nombre completo' : 'Your full name'}
            className="w-full bg-slate-800 text-white text-center font-black text-lg rounded-xl px-4 py-2 mb-4 border border-emerald-500/40 focus:outline-none focus:border-emerald-400"
          />
          <div className="text-slate-300 text-xs text-center mb-2">{c.sub}</div>
          <div className="bg-emerald-600/20 border border-emerald-500/30 rounded-xl px-4 py-2 mb-6">
            <div className="text-emerald-300 font-black text-center" style={{ fontSize: 11 }}>{lang === 'fr' ? 'Score' : lang === 'es' ? 'Puntaje' : 'Score'}: {QUESTIONS[lang].length}/{QUESTIONS[lang].length}</div>
          </div>
          <div className="text-slate-500 text-xs text-center mb-6">{c.issuer}</div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm">
              {lang === 'fr' ? 'Fermer' : lang === 'es' ? 'Cerrar' : 'Done'}
            </button>
          </div>
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
            {lang === 'fr' ? 'Guide Transactions' : lang === 'es' ? 'Guía Transacciones' : 'Transaction Guide'}
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

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col lg:flex-row items-start justify-center gap-6 p-4 max-w-5xl mx-auto">

          {/* Left: phone mockup */}
          <div className="flex-shrink-0 w-full flex justify-center lg:justify-start lg:sticky lg:top-4">
            <div className="flex flex-col items-center gap-2">
              {/* Path label */}
              <div className="text-slate-500 text-xs font-mono bg-slate-900 border border-slate-700 rounded-lg px-3 py-1 mb-1">
                {s.path[lang]}
              </div>
              <Phone dark={isDark(slide)}>
                {getScreen(slide, !!tapped[slide], handleTap)}
              </Phone>
              {/* TAP prompt */}
              {!s.noTap && !tapped[slide] && (
                <div className="mt-2 flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/30 rounded-xl px-4 py-2">
                  <span className="text-yellow-400 text-xs font-black animate-pulse">👆</span>
                  <span className="text-yellow-300 text-xs font-bold">{s.prompt[lang]}</span>
                </div>
              )}
              {!s.noTap && tapped[slide] && (
                <div className="mt-2 flex items-center gap-2 bg-emerald-400/10 border border-emerald-400/30 rounded-xl px-4 py-2">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  <span className="text-emerald-300 text-xs font-bold">
                    {lang === 'fr' ? 'Bien! Lisez l\'explication.' : lang === 'es' ? '¡Bien! Lee la explicación.' : 'Great! Read the explanation.'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right: explanation */}
          <div className="flex-1 flex flex-col gap-4 max-w-lg">
            <div>
              <h2 className="text-white font-black text-xl leading-tight mb-1">{s.title[lang]}</h2>
            </div>

            {showExplain ? (
              <>
                <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4">
                  <p className="text-slate-200 text-sm leading-relaxed">{s.explain[lang]}</p>
                </div>
                {s.tip && s.tip[lang] && (
                  <div className="bg-blue-600/10 border border-blue-600/20 rounded-2xl p-4 flex gap-3">
                    <span className="text-blue-400 text-lg flex-shrink-0">💡</span>
                    <p className="text-blue-200 text-xs leading-relaxed">{s.tip[lang]}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-slate-800/40 border border-dashed border-slate-600 rounded-2xl p-6 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-yellow-400/10 border-2 border-yellow-400/40 flex items-center justify-center animate-pulse">
                  <span className="text-2xl">👆</span>
                </div>
                <p className="text-slate-400 text-sm text-center">
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
      <div className="bg-[#0a0f1e] border-t border-slate-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <button onClick={goPrev} disabled={slide === 0}
          className={`flex items-center gap-1 px-4 py-2 rounded-xl font-black text-sm transition-colors ${slide === 0 ? 'text-slate-600 cursor-not-allowed' : 'text-white bg-slate-800 hover:bg-slate-700'}`}>
          <ChevronLeft size={16} /> {lang === 'fr' ? 'Préc.' : lang === 'es' ? 'Ant.' : 'Prev'}
        </button>

        {/* Dot indicators */}
        <div className="flex gap-1">
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => { if (i <= slide || tapped[i] || SLIDES[i].noTap) setSlide(i); }}
              className={`rounded-full transition-all ${i === slide ? 'w-4 h-2 bg-blue-500' : tapped[i] || SLIDES[i].noTap ? 'w-2 h-2 bg-emerald-500' : 'w-2 h-2 bg-slate-700'}`} />
          ))}
        </div>

        {slide === SLIDES.length - 1 ? (
          <button onClick={() => setMode('assessment')}
            className="flex items-center gap-1 px-4 py-2 rounded-xl font-black text-sm bg-emerald-600 hover:bg-emerald-700 text-white">
            {lang === 'fr' ? 'Évaluation' : lang === 'es' ? 'Evaluación' : 'Assessment'} <ChevronRight size={16} />
          </button>
        ) : (
          <button onClick={goNext} disabled={!canNext}
            className={`flex items-center gap-1 px-4 py-2 rounded-xl font-black text-sm transition-colors ${!canNext ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
            {lang === 'fr' ? 'Suiv.' : lang === 'es' ? 'Sig.' : 'Next'} <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
