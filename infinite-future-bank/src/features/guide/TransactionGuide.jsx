import { useState } from 'react';
import {
  ChevronLeft, ChevronRight, X, Award, CheckCircle2,
  Send, QrCode, Download, Plus, Landmark, Wifi, Shield,
  ArrowRightLeft, Compass, Bell, Menu, CreditCard,
  Copy, FileText, Lock, Globe, Users, Check, Zap,
  RefreshCw, Filter, AlertTriangle, Scan, Wallet,
  TrendingUp, DollarSign, Clock, Upload, Camera, Receipt
} from 'lucide-react';

const SLIDES = [
  {
    id: 'dashboard', noTap: true,
    title:   { en: 'Your DEUS Dashboard', fr: 'Votre Tableau de Bord', es: 'Tu Panel DEUS' },
    path:    { en: 'Home', fr: 'Accueil', es: 'Inicio' },
    prompt:  { en: '', fr: '', es: '' },
    explain: { en: 'The DEUS home screen shows your live balance at the top and 9 quick-action buttons below. The bottom nav (Home · Transactions · Tap to Pay · Alerts · More) is always visible.', fr: 'L\'écran DEUS affiche votre solde en direct en haut et 9 boutons d\'action rapide. La barre de navigation inférieure est toujours visible.', es: 'La pantalla de inicio DEUS muestra tu saldo en vivo arriba y 9 botones de acción rápida. La barra de navegación inferior siempre es visible.' },
    tip: { en: 'Pull down on the balance to refresh.', fr: 'Tirez sur le solde pour actualiser.', es: 'Desliza el saldo para actualizar.' },
  },
  {
    id: 'deposit-cot', hl: 'cotCard',
    title:   { en: 'Add Funds — Community of Trust', fr: 'Ajouter des Fonds — CoT', es: 'Agregar Fondos — CoT' },
    path:    { en: 'Home → Add Funds', fr: 'Accueil → Ajouter', es: 'Inicio → Agregar' },
    prompt:  { en: 'Tap the Community of Trust card to select it', fr: 'Appuyez sur la carte Communauté de Confiance', es: 'Toca la tarjeta Comunidad de Confianza' },
    explain: { en: 'Community of Trust (CoT) is IFB\'s peer-funded deposit network. It charges only 1% IFB Fee + 2% Processor Reward — the cheapest top-up route. Funds settle in minutes.', fr: 'La Communauté de Confiance est le réseau de dépôt pair-à-pair d\'IFB. Elle facture 1% de frais IFB + 2% de récompense — le meilleur tarif. Les fonds arrivent en quelques minutes.', es: 'La Comunidad de Confianza es la red de depósito entre pares de IFB. Cobra solo 1% de tarifa IFB + 2% de recompensa. Los fondos llegan en minutos.' },
    tip: { en: 'CoT is best for regular top-ups over $50.', fr: 'CoT est idéal pour les recharges régulières.', es: 'CoT es ideal para recargas regulares.' },
  },
  {
    id: 'deposit-stripe', hl: 'stripeCard',
    title:   { en: 'Add Funds — Global Card Network', fr: 'Ajouter — Réseau de Cartes', es: 'Agregar — Red de Tarjetas' },
    path:    { en: 'Home → Add Funds', fr: 'Accueil → Ajouter', es: 'Inicio → Agregar' },
    prompt:  { en: 'Tap the Global Card Network card', fr: 'Appuyez sur Réseau de Cartes Global', es: 'Toca Red de Tarjetas Global' },
    explain: { en: 'Global Card Network uses Stripe to accept Visa, Mastercard, and Amex. It charges 2.9% + $0.30 per transaction. Use this when you need to load funds instantly from a debit or credit card.', fr: 'Le Réseau Global de Cartes utilise Stripe pour accepter Visa, Mastercard et Amex. Il facture 2,9% + 0,30$. Utilisez ceci pour un chargement instantané.', es: 'La Red Global de Tarjetas usa Stripe para aceptar Visa, Mastercard y Amex. Cobra 2.9% + $0.30. Úsalo para cargar fondos al instante.' },
    tip: { en: 'Stripe deposits appear instantly in your balance.', fr: 'Les dépôts Stripe apparaissent instantanément.', es: 'Los depósitos Stripe aparecen al instante.' },
  },
  {
    id: 'send', hl: 'sendBtn',
    title:   { en: 'Send Money', fr: 'Envoyer de l\'Argent', es: 'Enviar Dinero' },
    path:    { en: 'Home → Send', fr: 'Accueil → Envoyer', es: 'Inicio → Enviar' },
    prompt:  { en: 'Tap Send Now to confirm the transfer', fr: 'Appuyez sur Envoyer Maintenant', es: 'Toca Enviar Ahora' },
    explain: { en: 'Select USD or AFR, pick a contact, enter the amount and an optional note, then tap Send Now. Transfers within the IFB network are instant and free.', fr: 'Sélectionnez USD ou AFR, choisissez un contact, entrez le montant et une note, puis appuyez sur Envoyer Maintenant. Les transferts sont instantanés.', es: 'Selecciona USD o AFR, elige un contacto, ingresa el monto y una nota, luego toca Enviar Ahora. Las transferencias son instantáneas.' },
    tip: { en: 'Search contacts by name or @username.', fr: 'Recherchez des contacts par nom ou @identifiant.', es: 'Busca contactos por nombre o @usuario.' },
  },
  {
    id: 'receive-link', hl: 'copyBtn',
    title:   { en: 'Receive via Payment Link', fr: 'Recevoir via Lien de Paiement', es: 'Recibir via Enlace' },
    path:    { en: 'Home → Receive', fr: 'Accueil → Recevoir', es: 'Inicio → Recibir' },
    prompt:  { en: 'Tap Copy Link to share your payment link', fr: 'Appuyez sur Copier le Lien', es: 'Toca Copiar Enlace' },
    explain: { en: 'Your personal IFB payment link lets anyone send you money — even without an IFB account. Share it via SMS, email, or social. The link pre-fills your account details automatically.', fr: 'Votre lien de paiement IFB permet à n\'importe qui de vous envoyer de l\'argent, même sans compte IFB. Partagez-le par SMS, email ou réseaux sociaux.', es: 'Tu enlace de pago IFB permite a cualquiera enviarte dinero, incluso sin cuenta IFB. Compártelo por SMS, correo o redes sociales.' },
    tip: { en: 'Add ?amount=50 to the link to pre-fill the amount.', fr: 'Ajoutez ?amount=50 au lien pour pré-remplir le montant.', es: 'Agrega ?amount=50 al enlace para pre-llenar el monto.' },
  },
  {
    id: 'invoice', hl: 'emailBtn',
    title:   { en: 'Invoice by Email', fr: 'Facturation par Email', es: 'Factura por Correo' },
    path:    { en: 'Home → Invoice', fr: 'Accueil → Facture', es: 'Inicio → Factura' },
    prompt:  { en: 'Tap Send Invoice to dispatch the invoice', fr: 'Appuyez sur Envoyer la Facture', es: 'Toca Enviar Factura' },
    explain: { en: 'DEUS generates a professional PDF invoice with your business details, line items, and payment button. The recipient gets an email with a secure link to pay instantly.', fr: 'DEUS génère une facture PDF professionnelle avec vos coordonnées et un bouton de paiement. Le destinataire reçoit un email avec un lien sécurisé.', es: 'DEUS genera una factura PDF profesional con tus datos y un botón de pago. El destinatario recibe un correo con un enlace seguro.' },
    tip: { en: 'Invoices are auto-tracked in your Ledger.', fr: 'Les factures sont suivies automatiquement dans le Grand Livre.', es: 'Las facturas se rastrean automáticamente en tu Libro.' },
  },
  {
    id: 'qr-code', hl: 'qrIcon',
    title:   { en: 'QR Code Payment', fr: 'Paiement par QR Code', es: 'Pago por Código QR' },
    path:    { en: 'Home → QR', fr: 'Accueil → QR', es: 'Inicio → QR' },
    prompt:  { en: 'Tap the QR icon to generate your code', fr: 'Appuyez sur l\'icône QR', es: 'Toca el ícono QR' },
    explain: { en: 'Your personal QR encodes your IFB account ID. Any payer scans it to instantly fill your details. You can set a fixed amount or leave it open for the payer to enter.', fr: 'Votre QR personnel encode votre identifiant IFB. N\'importe quel payeur le scanne pour remplir vos coordonnées. Vous pouvez définir un montant fixe.', es: 'Tu QR personal codifica tu ID de cuenta IFB. Cualquier pagador lo escanea para llenar tus datos. Puedes establecer un monto fijo.' },
    tip: { en: 'Screenshot your QR to use it offline.', fr: 'Faites une capture de votre QR pour l\'utiliser hors ligne.', es: 'Haz captura de tu QR para usarlo sin conexión.' },
  },
  {
    id: 'payment-link', hl: 'shareBtn',
    title:   { en: 'Payment Link Share', fr: 'Partager le Lien de Paiement', es: 'Compartir Enlace de Pago' },
    path:    { en: 'Home → Pay Me → Share', fr: 'Accueil → Payer → Partager', es: 'Inicio → Pagar → Compartir' },
    prompt:  { en: 'Tap Share to send your payment link', fr: 'Appuyez sur Partager', es: 'Toca Compartir' },
    explain: { en: 'The Share sheet lets you send your payment link via any installed app — WhatsApp, Telegram, email, or a direct copy. The link shows a branded checkout page with your name and photo.', fr: 'La feuille de partage vous permet d\'envoyer votre lien via n\'importe quelle application installée. Le lien affiche une page de paiement avec votre nom et photo.', es: 'La hoja de compartir permite enviar tu enlace vía cualquier app instalada. El enlace muestra una página de pago con tu nombre y foto.' },
    tip: { en: 'Links are unique to each transaction if you set an amount.', fr: 'Les liens sont uniques si vous définissez un montant.', es: 'Los enlaces son únicos si estableces un monto.' },
  },
  {
    id: 'payme-view', hl: 'cardView',
    title:   { en: 'Pay Me Card', fr: 'Carte Pay Me', es: 'Tarjeta Pay Me' },
    path:    { en: 'Home → Pay Me', fr: 'Accueil → Payer', es: 'Inicio → Pagar' },
    prompt:  { en: 'Tap the Pay Me card to view details', fr: 'Appuyez sur la carte Pay Me', es: 'Toca la tarjeta Pay Me' },
    explain: { en: 'Pay Me is a virtual card that others can tap with NFC or scan to pay you directly. It shows your name, IFB account number, and available balance. It works like a contactless receiving card.', fr: 'Pay Me est une carte virtuelle que les autres peuvent scanner ou taper pour vous payer directement. Elle affiche votre nom, numéro de compte et solde.', es: 'Pay Me es una tarjeta virtual que otros pueden escanear o tocar para pagarte directamente. Muestra tu nombre, número de cuenta y saldo.' },
    tip: { en: 'Pin the Pay Me screen at checkout for faster payments.', fr: 'Épinglez l\'écran Pay Me à la caisse pour des paiements plus rapides.', es: 'Fija la pantalla Pay Me en la caja para pagos más rápidos.' },
  },
  {
    id: 'payme-freeze', hl: 'freezeToggle',
    title:   { en: 'Freeze Pay Me Card', fr: 'Bloquer la Carte Pay Me', es: 'Congelar Tarjeta Pay Me' },
    path:    { en: 'Home → Pay Me → Settings', fr: 'Accueil → Pay Me → Paramètres', es: 'Inicio → Pay Me → Ajustes' },
    prompt:  { en: 'Tap the Freeze toggle to freeze your card', fr: 'Appuyez sur le bouton Bloquer', es: 'Toca el interruptor de Congelación' },
    explain: { en: 'Freezing your Pay Me card instantly blocks all incoming NFC and QR payments. No one can charge you while frozen. Unfreeze anytime in one tap — your settings and history are preserved.', fr: 'Bloquer votre carte Pay Me bloque instantanément tous les paiements NFC et QR entrants. Débloquez à tout moment en un tap.', es: 'Congelar tu tarjeta Pay Me bloquea instantáneamente todos los pagos NFC y QR entrantes. Descongela en cualquier momento.' },
    tip: { en: 'Freeze before lending your phone to avoid accidental charges.', fr: 'Bloquez avant de prêter votre téléphone.', es: 'Congela antes de prestar tu teléfono.' },
  },
  {
    id: 'withdraw-global', hl: 'globalBtn',
    title:   { en: 'Withdraw — Global Bank/Card', fr: 'Retrait — Banque/Carte Mondiale', es: 'Retiro — Banco/Tarjeta Global' },
    path:    { en: 'Home → Withdraw', fr: 'Accueil → Retirer', es: 'Inicio → Retirar' },
    prompt:  { en: 'Tap Global Bank/Card to select this method', fr: 'Appuyez sur Banque/Carte Mondiale', es: 'Toca Banco/Tarjeta Global' },
    explain: { en: 'Global withdrawal sends funds to any Visa/Mastercard debit or linked bank account worldwide. Processing takes 1-3 business days. Fees are 1.5% + $1 per transaction.', fr: 'Le retrait mondial envoie des fonds vers toute carte Visa/Mastercard ou compte bancaire lié. Délai de traitement: 1-3 jours ouvrables.', es: 'El retiro global envía fondos a cualquier débito Visa/Mastercard o cuenta bancaria vinculada. Proceso: 1-3 días hábiles.' },
    tip: { en: 'Add your bank once in Settings to avoid re-entering details.', fr: 'Ajoutez votre banque une fois dans Paramètres.', es: 'Agrega tu banco una vez en Ajustes para no volver a ingresarlo.' },
  },
  {
    id: 'withdraw-cot', hl: 'cotBtn',
    title:   { en: 'Withdraw — Community of Trust', fr: 'Retrait — Communauté de Confiance', es: 'Retiro — Comunidad de Confianza' },
    path:    { en: 'Home → Withdraw → CoT', fr: 'Accueil → Retirer → CoT', es: 'Inicio → Retirar → CoT' },
    prompt:  { en: 'Tap CoT to select peer withdrawal', fr: 'Appuyez sur CoT pour le retrait pair', es: 'Toca CoT para retiro entre pares' },
    explain: { en: 'CoT withdrawal connects you with trusted community members who hold cash. They pay you cash locally; DEUS deducts the equivalent from your balance. Fastest method with lowest fees.', fr: 'Le retrait CoT vous connecte avec des membres de la communauté qui détiennent des espèces. Ils vous paient en espèces localement.', es: 'El retiro CoT te conecta con miembros de la comunidad que tienen efectivo. Te pagan en efectivo localmente con las tarifas más bajas.' },
    tip: { en: 'Rate CoT members after each transaction to build trust scores.', fr: 'Évaluez les membres CoT après chaque transaction.', es: 'Califica a los miembros CoT después de cada transacción.' },
  },
  {
    id: 'nfc-send', hl: 'nfcBtn',
    title:   { en: 'NFC — Tap to Pay', fr: 'NFC — Payer par Contact', es: 'NFC — Pago por Contacto' },
    path:    { en: 'Home → Tap to Pay', fr: 'Accueil → Payer par Contact', es: 'Inicio → Pago Contacto' },
    prompt:  { en: 'Tap the NFC button to initiate payment', fr: 'Appuyez sur le bouton NFC', es: 'Toca el botón NFC' },
    explain: { en: 'Tap to Pay uses your phone\'s NFC chip to send payment to any contactless terminal or IFB device. Hold your phone within 4cm of the reader. Amount is set before tapping.', fr: 'Tap to Pay utilise la puce NFC de votre téléphone pour payer tout terminal sans contact. Tenez votre téléphone à 4 cm du lecteur.', es: 'Tap to Pay usa el chip NFC de tu teléfono para pagar cualquier terminal sin contacto. Mantén el teléfono a 4 cm del lector.' },
    tip: { en: 'Keep your screen on and unlocked before tapping.', fr: 'Gardez votre écran allumé et déverrouillé avant de taper.', es: 'Mantén la pantalla encendida y desbloqueada antes de tocar.' },
  },
  {
    id: 'nfc-receive', hl: 'receiveMode',
    title:   { en: 'NFC — Receive Payment', fr: 'NFC — Recevoir un Paiement', es: 'NFC — Recibir Pago' },
    path:    { en: 'Tap to Pay → Receive Mode', fr: 'Payer → Mode Réception', es: 'Pago → Modo Recepción' },
    prompt:  { en: 'Tap Receive Mode to switch modes', fr: 'Appuyez sur Mode Réception', es: 'Toca Modo Recepción' },
    explain: { en: 'Switch to Receive Mode to accept NFC payments from other IFB users. Your phone becomes a payment terminal. Set the requested amount and the payer taps their device to yours.', fr: 'Passez en Mode Réception pour accepter les paiements NFC d\'autres utilisateurs IFB. Votre téléphone devient un terminal de paiement.', es: 'Cambia a Modo Recepción para aceptar pagos NFC de otros usuarios IFB. Tu teléfono se convierte en un terminal de pago.' },
    tip: { en: 'Both devices need NFC enabled in phone settings.', fr: 'Les deux appareils doivent avoir le NFC activé.', es: 'Ambos dispositivos necesitan NFC activado en ajustes.' },
  },
  {
    id: 'nfc-card', hl: 'cardMode',
    title:   { en: 'NFC — Get Paid Card Mode', fr: 'NFC — Mode Carte Encaissement', es: 'NFC — Modo Tarjeta de Cobro' },
    path:    { en: 'Tap to Pay → Card Mode', fr: 'Payer → Mode Carte', es: 'Pago → Modo Tarjeta' },
    prompt:  { en: 'Tap Card Mode to activate it', fr: 'Appuyez sur Mode Carte', es: 'Toca Modo Tarjeta' },
    explain: { en: 'Card Mode emulates a physical payment card. Customers can tap their NFC-enabled phone or card reader to pay you, just like swiping a card at a POS machine.', fr: 'Le Mode Carte émule une carte de paiement physique. Les clients peuvent taper leur téléphone ou lecteur NFC pour vous payer, comme une carte à un terminal.', es: 'El Modo Tarjeta emula una tarjeta de pago física. Los clientes pueden tocar su teléfono o lector NFC para pagarte, como una tarjeta en un terminal.' },
    tip: { en: 'Card Mode works at any standard contactless POS.', fr: 'Le Mode Carte fonctionne sur tout terminal NFC standard.', es: 'El Modo Tarjeta funciona en cualquier terminal NFC estándar.' },
  },
  {
    id: 'swift', hl: 'swiftBtn',
    title:   { en: 'SWIFT International Transfer', fr: 'Virement International SWIFT', es: 'Transferencia Internacional SWIFT' },
    path:    { en: 'Home → More → SWIFT', fr: 'Accueil → Plus → SWIFT', es: 'Inicio → Más → SWIFT' },
    prompt:  { en: 'Tap SWIFT Transfer to start', fr: 'Appuyez sur Virement SWIFT', es: 'Toca Transferencia SWIFT' },
    explain: { en: 'SWIFT transfers move money to any bank worldwide using the global SWIFT network. Enter the recipient\'s IBAN, BIC/SWIFT code, and bank address. Processing is 1-5 business days. Minimum transfer: $100.', fr: 'Les virements SWIFT envoient de l\'argent vers toute banque mondiale. Entrez l\'IBAN, le code BIC/SWIFT et l\'adresse bancaire. Délai: 1-5 jours ouvrables.', es: 'Las transferencias SWIFT mueven dinero a cualquier banco mundial. Ingresa el IBAN, código BIC/SWIFT y dirección bancaria. Procesamiento: 1-5 días hábiles.' },
    tip: { en: 'Double-check the SWIFT/BIC code to avoid rejected transfers.', fr: 'Vérifiez le code SWIFT/BIC pour éviter les rejets.', es: 'Verifica el código SWIFT/BIC para evitar rechazos.' },
  },
  {
    id: 'ach', hl: 'achBtn',
    title:   { en: 'ACH Domestic Transfer', fr: 'Virement ACH National', es: 'Transferencia ACH Nacional' },
    path:    { en: 'Home → More → ACH', fr: 'Accueil → Plus → ACH', es: 'Inicio → Más → ACH' },
    prompt:  { en: 'Tap ACH Transfer to begin', fr: 'Appuyez sur Virement ACH', es: 'Toca Transferencia ACH' },
    explain: { en: 'ACH transfers send money to any US bank account using routing and account numbers. Standard ACH settles in 1-2 business days. Same-day ACH is available for an additional $2 fee.', fr: 'Les virements ACH envoient de l\'argent vers tout compte bancaire américain via le numéro de routage. Le délai standard est de 1-2 jours ouvrables.', es: 'Las transferencias ACH envían dinero a cualquier cuenta bancaria de EE.UU. El ACH estándar liquida en 1-2 días hábiles. ACH del mismo día disponible por $2 adicionales.' },
    tip: { en: 'Save recipient bank details to reuse for future ACH payments.', fr: 'Sauvegardez les coordonnées bancaires pour les réutiliser.', es: 'Guarda los datos bancarios del destinatario para reutilizarlos.' },
  },
  {
    id: 'afr-exchange', hl: 'exchangeBtn',
    title:   { en: 'AFR Exchange Rate', fr: 'Taux de Change AFR', es: 'Tipo de Cambio AFR' },
    path:    { en: 'Home → More → Exchange', fr: 'Accueil → Plus → Échange', es: 'Inicio → Más → Cambio' },
    prompt:  { en: 'Tap Exchange Now to convert currency', fr: 'Appuyez sur Échanger Maintenant', es: 'Toca Cambiar Ahora' },
    explain: { en: 'AFR (African Reserve) is IFB\'s community currency pegged to a basket of African economies. Convert USD to AFR (or vice versa) at the live IFB rate. AFR has zero cross-border fees within the network.', fr: 'AFR (Réserve Africaine) est la monnaie communautaire d\'IFB. Convertissez USD en AFR au taux IFB en temps réel. AFR a zéro frais transfrontaliers.', es: 'AFR (Reserva Africana) es la moneda comunitaria de IFB anclada a economías africanas. Convierte USD a AFR al tipo de cambio en vivo. AFR tiene cero tarifas transfronterizas.' },
    tip: { en: 'AFR is accepted by all IFB merchants and members.', fr: 'AFR est accepté par tous les marchands et membres IFB.', es: 'AFR es aceptado por todos los comerciantes y miembros IFB.' },
  },
  {
    id: 'recurring', hl: 'recurringBtn',
    title:   { en: 'Set Up Recurring Payment', fr: 'Configurer un Paiement Récurrent', es: 'Configurar Pago Recurrente' },
    path:    { en: 'Home → Send → Recurring', fr: 'Accueil → Envoyer → Récurrent', es: 'Inicio → Enviar → Recurrente' },
    prompt:  { en: 'Tap Enable Recurring to activate', fr: 'Appuyez sur Activer Récurrent', es: 'Toca Activar Recurrente' },
    explain: { en: 'Set any transfer to repeat daily, weekly, or monthly. Choose start date, end date (or leave open), and DEUS auto-sends on schedule. Pause or cancel anytime from Scheduled Payments.', fr: 'Définissez tout transfert pour qu\'il se répète quotidiennement, hebdomadairement ou mensuellement. Choisissez les dates et DEUS envoie automatiquement.', es: 'Configura cualquier transferencia para que se repita diaria, semanal o mensualmente. DEUS envía automáticamente según el horario.' },
    tip: { en: 'Enable notifications to get alerts before each recurring payment.', fr: 'Activez les notifications pour recevoir des alertes.', es: 'Activa notificaciones para recibir alertas antes de cada pago.' },
  },
  {
    id: 'billpay', hl: 'billBtn',
    title:   { en: 'Bill Pay', fr: 'Paiement de Factures', es: 'Pago de Facturas' },
    path:    { en: 'Home → More → Bill Pay', fr: 'Accueil → Plus → Factures', es: 'Inicio → Más → Facturas' },
    prompt:  { en: 'Tap Pay Bill on a due bill', fr: 'Appuyez sur Payer sur une facture', es: 'Toca Pagar en una factura vencida' },
    explain: { en: 'Bill Pay lets you link utility, telecom, and service accounts. DEUS shows upcoming due dates and amounts. Pay in one tap or set auto-pay. Supported: electricity, water, internet, subscriptions.', fr: 'Bill Pay vous permet de relier vos comptes de services publics et d\'abonnements. DEUS affiche les échéances. Payez en un tap ou configurez le paiement automatique.', es: 'Bill Pay permite vincular cuentas de servicios y suscripciones. DEUS muestra las fechas de vencimiento. Paga con un toque o configura pago automático.' },
    tip: { en: 'Set bill auto-pay 3 days before due to avoid late fees.', fr: 'Configurez le paiement automatique 3 jours avant l\'échéance.', es: 'Configura pago automático 3 días antes del vencimiento.' },
  },
  {
    id: 'splitbill', hl: 'splitBtn',
    title:   { en: 'Split Bill', fr: 'Partager la Facture', es: 'Dividir la Factura' },
    path:    { en: 'Home → More → Split', fr: 'Accueil → Plus → Partager', es: 'Inicio → Más → Dividir' },
    prompt:  { en: 'Tap Split Equally to divide the amount', fr: 'Appuyez sur Diviser Également', es: 'Toca Dividir en Partes Iguales' },
    explain: { en: 'Split Bill divides any amount among multiple IFB contacts. Choose equal split or set custom amounts for each person. DEUS sends each person a payment request they can pay instantly.', fr: 'Partager divise n\'importe quel montant entre plusieurs contacts IFB. Choisissez un partage égal ou définissez des montants personnalisés. DEUS envoie une demande de paiement à chacun.', es: 'Dividir reparte cualquier monto entre múltiples contactos IFB. Elige partes iguales o montos personalizados. DEUS envía una solicitud de pago a cada persona.' },
    tip: { en: 'Add a bill photo so everyone sees what they\'re splitting.', fr: 'Ajoutez une photo de facture pour que chacun voie ce qu\'il paie.', es: 'Agrega una foto de factura para que todos vean qué están dividiendo.' },
  },
  {
    id: 'dispute', hl: 'disputeBtn',
    title:   { en: 'Dispute a Transaction', fr: 'Contester une Transaction', es: 'Disputar una Transacción' },
    path:    { en: 'Transactions → Detail → Dispute', fr: 'Transactions → Détail → Contester', es: 'Transacciones → Detalle → Disputar' },
    prompt:  { en: 'Tap Dispute Transaction to file a claim', fr: 'Appuyez sur Contester', es: 'Toca Disputar Transacción' },
    explain: { en: 'If a charge is unauthorized or incorrect, tap Dispute in the transaction detail. Select the reason (wrong amount, not received, fraud), add notes, and submit. IFB\'s team responds within 3 business days.', fr: 'Si un débit est non autorisé, appuyez sur Contester dans le détail. Sélectionnez la raison, ajoutez des notes et soumettez. L\'équipe IFB répond sous 3 jours ouvrables.', es: 'Si un cargo es incorrecto, toca Disputar en el detalle. Selecciona la razón, agrega notas y envía. El equipo IFB responde en 3 días hábiles.' },
    tip: { en: 'Screenshot the transaction before disputing as evidence.', fr: 'Capturez la transaction avant de contester comme preuve.', es: 'Captura la transacción antes de disputar como evidencia.' },
  },
  {
    id: 'merchant-scan', hl: 'scanBtn',
    title:   { en: 'Scan Merchant QR', fr: 'Scanner le QR Commerçant', es: 'Escanear QR del Comerciante' },
    path:    { en: 'Home → Scan', fr: 'Accueil → Scanner', es: 'Inicio → Escanear' },
    prompt:  { en: 'Tap Scan to Pay to open the camera', fr: 'Appuyez sur Scanner pour Payer', es: 'Toca Escanear para Pagar' },
    explain: { en: 'Point your camera at any IFB merchant QR. The app reads the code, fills in the merchant details and requested amount, then asks you to confirm. Payment is instant.', fr: 'Pointez votre caméra vers n\'importe quel QR de commerçant IFB. L\'application lit le code, remplit les détails et demande confirmation. Le paiement est instantané.', es: 'Apunta tu cámara a cualquier QR de comerciante IFB. La app lee el código, llena los detalles y pide confirmación. El pago es instantáneo.' },
    tip: { en: 'Works under low light — no flash needed.', fr: 'Fonctionne en faible luminosité — pas besoin de flash.', es: 'Funciona con poca luz — no se necesita flash.' },
  },
  {
    id: 'multicurrency', hl: 'walletBtn',
    title:   { en: 'Multi-currency Wallet', fr: 'Portefeuille Multi-devises', es: 'Billetera Multimoneda' },
    path:    { en: 'Home → Wallet', fr: 'Accueil → Portefeuille', es: 'Inicio → Billetera' },
    prompt:  { en: 'Tap the Wallet tab to switch currencies', fr: 'Appuyez sur l\'onglet Portefeuille', es: 'Toca la pestaña Billetera' },
    explain: { en: 'Your DEUS wallet holds multiple currencies simultaneously — USD, EUR, GBP, AFR, and more. Switch between them instantly. Each currency has its own balance and transaction history.', fr: 'Votre portefeuille DEUS contient plusieurs devises simultanément — USD, EUR, GBP, AFR et plus. Passez de l\'une à l\'autre instantanément.', es: 'Tu billetera DEUS contiene múltiples monedas simultáneamente — USD, EUR, GBP, AFR y más. Cambia entre ellas al instante.' },
    tip: { en: 'Auto-convert when paying: DEUS uses best rate.', fr: 'Conversion automatique lors du paiement au meilleur taux.', es: 'Conversión automática al pagar al mejor tipo de cambio.' },
  },
  {
    id: 'bulk-transfer', hl: 'bulkBtn',
    title:   { en: 'Bulk Transfer', fr: 'Transfert en Masse', es: 'Transferencia Masiva' },
    path:    { en: 'Home → More → Bulk Transfer', fr: 'Accueil → Plus → Transfert en Masse', es: 'Inicio → Más → Transferencia Masiva' },
    prompt:  { en: 'Tap Send to All to execute the bulk payment', fr: 'Appuyez sur Envoyer à Tous', es: 'Toca Enviar a Todos' },
    explain: { en: 'Bulk Transfer lets you pay multiple recipients at once — perfect for payroll, dividends, or group refunds. Upload a CSV or select contacts, set individual amounts, and send in one transaction.', fr: 'Le transfert en masse vous permet de payer plusieurs destinataires en même temps. Importez un CSV ou sélectionnez des contacts, définissez les montants et envoyez.', es: 'La transferencia masiva permite pagar múltiples destinatarios a la vez. Sube un CSV o selecciona contactos, establece montos individuales y envía en una transacción.' },
    tip: { en: 'CSV format: name, account_id, amount on each row.', fr: 'Format CSV : nom, account_id, montant sur chaque ligne.', es: 'Formato CSV: nombre, account_id, monto en cada fila.' },
  },
  {
    id: 'tax-statement', hl: 'taxBtn',
    title:   { en: 'Tax Statement', fr: 'Relevé Fiscal', es: 'Declaración de Impuestos' },
    path:    { en: 'More → Reports → Tax', fr: 'Plus → Rapports → Fiscal', es: 'Más → Reportes → Impuestos' },
    prompt:  { en: 'Tap Generate Tax Report to create it', fr: 'Appuyez sur Générer le Rapport Fiscal', es: 'Toca Generar Informe Fiscal' },
    explain: { en: 'DEUS generates a complete tax report covering all income, payments, fees, and interest for any date range. Export as PDF for your accountant. Includes 1099-K equivalent for freelancers.', fr: 'DEUS génère un rapport fiscal complet couvrant tous les revenus, paiements, frais et intérêts pour toute période. Exportez en PDF pour votre comptable.', es: 'DEUS genera un informe fiscal completo que cubre todos los ingresos, pagos, tarifas e intereses para cualquier período. Exporta como PDF para tu contador.' },
    tip: { en: 'Generate before Jan 31 for the previous tax year.', fr: 'Générez avant le 31 janvier pour l\'année fiscale précédente.', es: 'Genera antes del 31 de enero para el año fiscal anterior.' },
  },
  {
    id: 'filter', hl: 'filterBtn',
    title:   { en: 'Filter Transactions', fr: 'Filtrer les Transactions', es: 'Filtrar Transacciones' },
    path:    { en: 'Transactions → Filter', fr: 'Transactions → Filtrer', es: 'Transacciones → Filtrar' },
    prompt:  { en: 'Tap the Filter icon to open filters', fr: 'Appuyez sur l\'icône Filtrer', es: 'Toca el ícono Filtrar' },
    explain: { en: 'Filter your transaction history by date range, type (incoming/outgoing), currency, amount range, or status (pending/completed/failed). Combine multiple filters for precise reports.', fr: 'Filtrez votre historique par période, type (entrant/sortant), devise, montant ou statut (en attente/complété/échoué). Combinez plusieurs filtres.', es: 'Filtra tu historial por rango de fechas, tipo (entrante/saliente), moneda, rango de monto o estado (pendiente/completado/fallido).' },
    tip: { en: 'Save a filter as a preset for monthly reporting.', fr: 'Sauvegardez un filtre comme préréglage pour les rapports mensuels.', es: 'Guarda un filtro como preajuste para informes mensuales.' },
  },
  {
    id: 'export-pdf', hl: 'pdfBtn',
    title:   { en: 'Export PDF Statement', fr: 'Exporter Relevé PDF', es: 'Exportar Extracto PDF' },
    path:    { en: 'Transactions → Export → PDF', fr: 'Transactions → Exporter → PDF', es: 'Transacciones → Exportar → PDF' },
    prompt:  { en: 'Tap Export PDF to generate the statement', fr: 'Appuyez sur Exporter PDF', es: 'Toca Exportar PDF' },
    explain: { en: 'PDF statements are formatted bank-style documents with your IFB logo, account details, and transaction table. They are accepted by banks, landlords, and visa offices as proof of funds.', fr: 'Les relevés PDF sont des documents au format bancaire avec votre logo IFB. Ils sont acceptés par les banques, propriétaires et ambassades comme preuve de fonds.', es: 'Los extractos PDF son documentos con formato bancario con tu logo IFB. Son aceptados por bancos, arrendadores y oficinas de visa como prueba de fondos.' },
    tip: { en: 'Choose the full-year range for visa applications.', fr: 'Choisissez l\'année complète pour les demandes de visa.', es: 'Elige el rango de año completo para solicitudes de visa.' },
  },
  {
    id: 'export-csv', hl: 'csvBtn',
    title:   { en: 'Export CSV Data', fr: 'Exporter Données CSV', es: 'Exportar Datos CSV' },
    path:    { en: 'Transactions → Export → CSV', fr: 'Transactions → Exporter → CSV', es: 'Transacciones → Exportar → CSV' },
    prompt:  { en: 'Tap Export CSV to download the data file', fr: 'Appuyez sur Exporter CSV', es: 'Toca Exportar CSV' },
    explain: { en: 'CSV export gives you raw transaction data compatible with Excel, Google Sheets, and accounting software like QuickBooks. Each row is one transaction with date, amount, type, and memo.', fr: 'L\'export CSV donne des données brutes compatibles avec Excel, Google Sheets et les logiciels de comptabilité. Chaque ligne est une transaction.', es: 'La exportación CSV te da datos brutos compatibles con Excel, Google Sheets y software de contabilidad. Cada fila es una transacción.' },
    tip: { en: 'Import CSV into QuickBooks via File → Import → CSV.', fr: 'Importez CSV dans QuickBooks via Fichier → Importer.', es: 'Importa CSV en QuickBooks vía Archivo → Importar → CSV.' },
  },
  {
    id: 'summary', noTap: true,
    title:   { en: 'You\'re a Transaction Pro!', fr: 'Vous Êtes un Pro des Transactions!', es: '¡Eres un Experto en Transacciones!' },
    path:    { en: 'Guide Complete', fr: 'Guide Terminé', es: 'Guía Completa' },
    prompt:  { en: '', fr: '', es: '' },
    explain: { en: 'You\'ve mastered all 30 DEUS transaction types — from basic deposits to bulk transfers, SWIFT, ACH, NFC, and tax exports. Take the assessment to earn your certificate.', fr: 'Vous avez maîtrisé les 30 types de transactions DEUS — des dépôts de base aux transferts en masse, SWIFT, ACH, NFC et exports fiscaux. Passez l\'évaluation.', es: 'Has dominado los 30 tipos de transacciones DEUS — desde depósitos básicos hasta transferencias masivas, SWIFT, ACH, NFC y exportaciones fiscales. Toma la evaluación.' },
    tip: { en: 'Assessment requires 9/12 to pass.', fr: 'L\'évaluation nécessite 9/12 pour réussir.', es: 'La evaluación requiere 9/12 para aprobar.' },
  },
];

function Phone({ children, dark = false }) {
  return (
    <div className="relative w-[252px] h-[496px] rounded-[40px] bg-slate-900 shadow-2xl border-2 border-slate-700 overflow-hidden flex flex-col">
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-4 bg-black rounded-full z-20" />
      <div className={`flex-shrink-0 h-8 ${dark ? 'bg-[#0a0f1e]' : 'bg-slate-100'} flex items-center justify-between px-4 pt-2 text-[8px] font-black ${dark ? 'text-white' : 'text-slate-700'}`}>
        <span>9:41</span><span>●●●</span>
      </div>
      <div className="flex-1 overflow-hidden relative">{children}</div>
    </div>
  );
}

function HL({ children, onTap, done, radius = 'rounded-xl', labelPos = 'top' }) {
  return (
    <div className="relative inline-block cursor-pointer" onClick={onTap}>
      {children}
      {!done && (
        <>
          <span className={`absolute inset-0 ${radius} border-2 border-yellow-400 animate-ping opacity-75`} />
          <span className={`absolute inset-0 ${radius} border-2 border-yellow-400`} />
          <span className={`absolute ${labelPos === 'top' ? '-top-5' : '-bottom-5'} left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-[8px] font-black px-1.5 py-0.5 rounded-full whitespace-nowrap z-30`}>TAP!</span>
        </>
      )}
      {done && (
        <span className="absolute -top-2 -right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center z-30">
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
        </span>
      )}
    </div>
  );
}

function DashboardScreen() {
  const actions = [
    { icon: Plus, label: 'Add', color: 'text-blue-400' },
    { icon: Send, label: 'Send', color: 'text-emerald-400' },
    { icon: Download, label: 'Withdraw', color: 'text-purple-400' },
    { icon: QrCode, label: 'QR', color: 'text-yellow-400' },
    { icon: Receipt, label: 'Invoice', color: 'text-orange-400' },
    { icon: Landmark, label: 'SWIFT', color: 'text-blue-300' },
    { icon: Scan, label: 'Scan', color: 'text-pink-400' },
    { icon: Wallet, label: 'Wallet', color: 'text-teal-400' },
    { icon: FileText, label: 'Ledger', color: 'text-slate-300' },
  ];
  return (
    <div className="h-full bg-[#0a0f1e] flex flex-col px-3 py-2 overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-black"><span className="text-blue-400">D</span><span className="text-red-400">E</span><span className="text-yellow-400">U</span><span className="text-green-400">S</span></span>
        <Bell size={10} className="text-slate-400" />
      </div>
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-3 mb-3">
        <p className="text-[7px] text-blue-200 font-black uppercase tracking-widest">Total Balance</p>
        <p className="text-xl font-black text-white">$12,480.50</p>
        <p className="text-[7px] text-blue-200">IFB Account · **** 4821</p>
      </div>
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {actions.map((a) => (
          <div key={a.label} className="bg-slate-800/60 rounded-xl flex flex-col items-center justify-center py-2 gap-1">
            <a.icon size={12} className={a.color} />
            <span className="text-[7px] text-slate-300 font-black">{a.label}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-around border-t border-slate-800 pt-2">
        {[{ icon: Compass, label: 'Home' }, { icon: ArrowRightLeft, label: 'Txn' }, { icon: Wifi, label: 'Tap' }, { icon: Bell, label: 'Alerts' }, { icon: Menu, label: 'More' }].map((n) => (
          <div key={n.label} className="flex flex-col items-center gap-0.5">
            <n.icon size={10} className={n.label === 'Home' ? 'text-blue-400' : 'text-slate-500'} />
            <span className="text-[6px] text-slate-500">{n.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DepositScreen({ variant, done, onTap }) {
  return (
    <div className="h-full bg-[#0a0f1e] flex flex-col p-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center"><Plus size={10} className="text-white" /></div>
        <span className="text-[10px] font-black text-white">Add Funds</span>
      </div>
      <p className="text-[7px] text-slate-400 mb-3">Choose deposit method:</p>
      <div className="flex flex-col gap-2">
        <HL done={done && variant === 'cot'} onTap={variant === 'cot' ? onTap : undefined} radius="rounded-2xl">
          <div className={`bg-slate-800 rounded-2xl p-3 border ${variant === 'cot' ? 'border-yellow-400/30' : 'border-slate-700'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Users size={10} className="text-blue-400" />
              <span className="text-[9px] font-black text-white">Community of Trust</span>
            </div>
            <p className="text-[7px] text-slate-400">1% IFB Fee + 2% Processor</p>
            <span className="text-[7px] bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded-full font-black">LOWEST COST</span>
          </div>
        </HL>
        <HL done={done && variant === 'stripe'} onTap={variant === 'stripe' ? onTap : undefined} radius="rounded-2xl">
          <div className={`bg-slate-800 rounded-2xl p-3 border ${variant === 'stripe' ? 'border-yellow-400/30' : 'border-slate-700'}`}>
            <div className="flex items-center gap-2 mb-1">
              <CreditCard size={10} className="text-purple-400" />
              <span className="text-[9px] font-black text-white">Global Card Network</span>
            </div>
            <p className="text-[7px] text-slate-400">2.9% + $0.30 · Visa · Mastercard</p>
            <span className="text-[7px] bg-purple-600/20 text-purple-400 px-1.5 py-0.5 rounded-full font-black">INSTANT</span>
          </div>
        </HL>
      </div>
    </div>
  );
}

function SendScreen({ done, onTap }) {
  return (
    <div className="h-full bg-[#0a0f1e] flex flex-col p-3">
      <div className="flex items-center gap-2 mb-3">
        <Send size={10} className="text-emerald-400" />
        <span className="text-[10px] font-black text-white">Send Money</span>
      </div>
      <div className="bg-slate-800 rounded-xl p-2 mb-2 flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[7px] font-black text-white">JD</div>
        <div><p className="text-[8px] font-black text-white">Jane Doe</p><p className="text-[6px] text-slate-400">@janedoe · IFB</p></div>
      </div>
      <div className="bg-slate-800/50 rounded-xl p-2 mb-2">
        <p className="text-[6px] text-slate-400 mb-0.5">Amount</p>
        <p className="text-lg font-black text-white">$250.00</p>
        <p className="text-[6px] text-slate-500">USD · IFB Network</p>
      </div>
      <div className="bg-slate-800/50 rounded-xl p-2 mb-3">
        <p className="text-[6px] text-slate-400 mb-0.5">Note</p>
        <p className="text-[8px] text-white">Dinner split 🍕</p>
      </div>
      <HL done={done} onTap={onTap} radius="rounded-xl" labelPos="top">
        <div className="w-full bg-emerald-600 rounded-xl py-2 text-center text-[9px] font-black text-white">Send Now</div>
      </HL>
    </div>
  );
}

function ReceiveScreen({ done, onTap }) {
  return (
    <div className="h-full bg-white flex flex-col p-3">
      <div className="flex items-center gap-2 mb-3">
        <Download size={10} className="text-blue-600" />
        <span className="text-[10px] font-black text-slate-800">Receive Money</span>
      </div>
      <div className="bg-blue-50 rounded-2xl p-3 mb-3 text-center">
        <p className="text-[7px] text-slate-500 mb-1">Your Payment Link</p>
        <p className="text-[8px] font-black text-blue-600 break-all">pay.ifb.com/u/janedoe</p>
      </div>
      <HL done={done} onTap={onTap} radius="rounded-xl">
        <div className="bg-blue-600 rounded-xl p-2 flex items-center justify-center gap-1.5">
          <Copy size={10} className="text-white" />
          <span className="text-[9px] font-black text-white">Copy Link</span>
        </div>
      </HL>
      <div className="mt-3 bg-slate-50 rounded-xl p-2">
        <p className="text-[7px] text-slate-500 text-center">Share via</p>
        <div className="flex justify-around mt-1">
          {['SMS', 'Email', 'App'].map((m) => (
            <span key={m} className="text-[7px] bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-600 font-black">{m}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function InvoiceScreen({ done, onTap }) {
  return (
    <div className="h-full bg-white flex flex-col p-3">
      <div className="flex items-center gap-2 mb-2">
        <Receipt size={10} className="text-orange-500" />
        <span className="text-[10px] font-black text-slate-800">New Invoice</span>
      </div>
      <div className="flex flex-col gap-1.5 mb-3">
        <div className="bg-slate-50 rounded-lg p-2"><p className="text-[7px] text-slate-400">To</p><p className="text-[8px] font-black text-slate-800">Acme Corp · acme@corp.com</p></div>
        <div className="bg-slate-50 rounded-lg p-2"><p className="text-[7px] text-slate-400">Item</p><p className="text-[8px] font-black text-slate-800">Web Design · $1,200.00</p></div>
        <div className="bg-slate-50 rounded-lg p-2"><p className="text-[7px] text-slate-400">Due Date</p><p className="text-[8px] font-black text-slate-800">Jul 15, 2026</p></div>
      </div>
      <HL done={done} onTap={onTap} radius="rounded-xl">
        <div className="bg-orange-500 rounded-xl p-2 flex items-center justify-center gap-1.5">
          <Send size={10} className="text-white" />
          <span className="text-[9px] font-black text-white">Send Invoice</span>
        </div>
      </HL>
    </div>
  );
}

function QRScreen({ done, onTap }) {
  return (
    <div className="h-full bg-[#0a0f1e] flex flex-col items-center p-3">
      <span className="text-[10px] font-black text-white mb-3">My QR Code</span>
      <HL done={done} onTap={onTap} radius="rounded-2xl">
        <div className="w-28 h-28 bg-white rounded-2xl flex items-center justify-center">
          <QrCode size={80} className="text-slate-900" />
        </div>
      </HL>
      <p className="text-[7px] text-slate-400 mt-3 text-center">Scan to pay @janedoe</p>
      <div className="mt-2 bg-slate-800 rounded-xl px-3 py-1.5">
        <p className="text-[7px] text-slate-300 font-black">Fixed: $50.00 USD</p>
      </div>
    </div>
  );
}

function PaymentLinkScreen({ done, onTap }) {
  return (
    <div className="h-full bg-white flex flex-col p-3">
      <span className="text-[10px] font-black text-slate-800 mb-3">Share Payment Link</span>
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 mb-3">
        <p className="text-[7px] text-slate-500">Link</p>
        <p className="text-[8px] font-black text-blue-600">pay.ifb.com/u/janedoe?amt=50</p>
      </div>
      <div className="flex flex-col gap-2">
        <HL done={done} onTap={onTap} radius="rounded-xl">
          <div className="bg-blue-600 rounded-xl p-2 flex items-center justify-center gap-1.5">
            <Send size={10} className="text-white" />
            <span className="text-[9px] font-black text-white">Share Link</span>
          </div>
        </HL>
        <div className="bg-slate-50 rounded-xl p-2 flex items-center justify-center gap-1.5">
          <Copy size={10} className="text-slate-500" />
          <span className="text-[9px] text-slate-500">Copy to Clipboard</span>
        </div>
      </div>
    </div>
  );
}

function PayMeScreen({ variant, done, onTap }) {
  return (
    <div className="h-full bg-white flex flex-col p-3">
      <span className="text-[10px] font-black text-slate-800 mb-3">Pay Me Card</span>
      <HL done={done && variant === 'view'} onTap={variant === 'view' ? onTap : undefined} radius="rounded-2xl">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 mb-3">
          <p className="text-[7px] text-slate-400 mb-1">IFB PAY ME</p>
          <p className="text-[11px] font-black text-white">Jane Doe</p>
          <p className="text-[7px] text-blue-300 mb-2">**** **** **** 4821</p>
          <p className="text-[9px] font-black text-emerald-400">$12,480.50</p>
        </div>
      </HL>
      {variant === 'freeze' && (
        <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
          <div>
            <p className="text-[8px] font-black text-slate-800">Freeze Card</p>
            <p className="text-[6px] text-slate-500">Block all incoming payments</p>
          </div>
          <HL done={done} onTap={onTap} radius="rounded-full">
            <div className={`w-10 h-5 rounded-full flex items-center px-0.5 ${done ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'}`}>
              <div className="w-4 h-4 bg-white rounded-full shadow" />
            </div>
          </HL>
        </div>
      )}
    </div>
  );
}

function WithdrawScreen({ variant, done, onTap }) {
  return (
    <div className="h-full bg-[#0a0f1e] flex flex-col p-3">
      <div className="flex items-center gap-2 mb-3">
        <Download size={10} className="text-purple-400" />
        <span className="text-[10px] font-black text-white">Withdraw</span>
      </div>
      <div className="flex flex-col gap-2">
        <HL done={done && variant === 'global'} onTap={variant === 'global' ? onTap : undefined} radius="rounded-2xl">
          <div className="bg-slate-800 rounded-2xl p-3 border border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <Globe size={10} className="text-purple-400" />
              <span className="text-[9px] font-black text-white">Global Bank / Card</span>
            </div>
            <p className="text-[7px] text-slate-400">1.5% + $1.00 · 1-3 business days</p>
          </div>
        </HL>
        <HL done={done && variant === 'cot'} onTap={variant === 'cot' ? onTap : undefined} radius="rounded-2xl">
          <div className="bg-slate-800 rounded-2xl p-3 border border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <Users size={10} className="text-emerald-400" />
              <span className="text-[9px] font-black text-white">Community of Trust</span>
            </div>
            <p className="text-[7px] text-slate-400">Lowest fees · Minutes · Local cash</p>
          </div>
        </HL>
      </div>
    </div>
  );
}

function NFCScreen({ variant, done, onTap }) {
  const modes = ['Send', 'Receive', 'Card'];
  return (
    <div className="h-full bg-[#0a0f1e] flex flex-col items-center p-3">
      <span className="text-[10px] font-black text-white mb-2">Tap to Pay</span>
      <div className="flex gap-1 bg-slate-800 rounded-xl p-0.5 mb-4">
        {modes.map((m) => {
          const isActive = (variant === 'send' && m === 'Send') || (variant === 'receive' && m === 'Receive') || (variant === 'card' && m === 'Card');
          const isTarget = (variant === 'receive' && m === 'Receive') || (variant === 'card' && m === 'Card');
          if (isTarget) return (
            <HL key={m} done={done} onTap={onTap} radius="rounded-lg">
              <span className="bg-blue-600 text-white text-[7px] font-black px-2 py-1 rounded-lg">{m}</span>
            </HL>
          );
          return <span key={m} className={`text-[7px] font-black px-2 py-1 rounded-lg ${isActive ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>{m}</span>;
        })}
      </div>
      <div className="relative flex items-center justify-center">
        <div className="w-24 h-24 rounded-full border-2 border-blue-500/30 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border-2 border-blue-500/50 flex items-center justify-center">
            {variant === 'send' ? (
              <HL done={done} onTap={onTap} radius="rounded-full">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                  <Wifi size={18} className="text-white" />
                </div>
              </HL>
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                <Wifi size={18} className="text-white" />
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="text-[7px] text-slate-400 mt-3 text-center">
        {variant === 'send' ? 'Hold near reader' : variant === 'receive' ? 'Accepting payments' : 'Emulating card'}
      </p>
    </div>
  );
}

function SwiftScreen({ done, onTap }) {
  return (
    <div className="h-full bg-[#0a0f1e] flex flex-col p-3">
      <div className="flex items-center gap-2 mb-3">
        <Landmark size={10} className="text-blue-400" />
        <span className="text-[10px] font-black text-white">SWIFT Transfer</span>
      </div>
      <div className="flex flex-col gap-1.5 mb-3">
        {[['Recipient', 'Klaus Müller'], ['IBAN', 'DE89 3704 0044 0532 0130 00'], ['BIC', 'COBADEFFXXX'], ['Amount', '$5,000 USD']].map(([l, v]) => (
          <div key={l} className="bg-slate-800/60 rounded-lg p-2">
            <p className="text-[6px] text-slate-500">{l}</p>
            <p className="text-[8px] font-black text-white">{v}</p>
          </div>
        ))}
      </div>
      <HL done={done} onTap={onTap} radius="rounded-xl">
        <div className="bg-blue-600 rounded-xl py-2 text-center text-[9px] font-black text-white">SWIFT Transfer</div>
      </HL>
    </div>
  );
}

function ACHScreen({ done, onTap }) {
  return (
    <div className="h-full bg-white flex flex-col p-3">
      <div className="flex items-center gap-2 mb-3">
        <Landmark size={10} className="text-blue-600" />
        <span className="text-[10px] font-black text-slate-800">ACH Transfer</span>
      </div>
      <div className="flex flex-col gap-1.5 mb-3">
        {[['Account Name', 'John Smith'], ['Routing #', '021000021'], ['Account #', '****7890'], ['Amount', '$1,500.00']].map(([l, v]) => (
          <div key={l} className="bg-slate-50 rounded-lg p-2 border border-slate-100">
            <p className="text-[6px] text-slate-400">{l}</p>
            <p className="text-[8px] font-black text-slate-800">{v}</p>
          </div>
        ))}
      </div>
      <HL done={done} onTap={onTap} radius="rounded-xl">
        <div className="bg-blue-600 rounded-xl py-2 text-center text-[9px] font-black text-white">ACH Transfer</div>
      </HL>
    </div>
  );
}

function ExchangeScreen({ done, onTap }) {
  return (
    <div className="h-full bg-[#0a0f1e] flex flex-col p-3">
      <div className="flex items-center gap-2 mb-3">
        <ArrowRightLeft size={10} className="text-yellow-400" />
        <span className="text-[10px] font-black text-white">AFR Exchange</span>
      </div>
      <div className="bg-slate-800 rounded-2xl p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <div><p className="text-[6px] text-slate-400">From</p><p className="text-[11px] font-black text-white">$500 USD</p></div>
          <ArrowRightLeft size={12} className="text-yellow-400" />
          <div><p className="text-[6px] text-slate-400">To</p><p className="text-[11px] font-black text-yellow-400">₳ 1,250 AFR</p></div>
        </div>
        <p className="text-[7px] text-slate-500">Rate: 1 USD = 2.50 AFR</p>
      </div>
      <HL done={done} onTap={onTap} radius="rounded-xl">
        <div className="bg-yellow-400 rounded-xl py-2 text-center text-[9px] font-black text-slate-900">Exchange Now</div>
      </HL>
    </div>
  );
}

function RecurringScreen({ done, onTap }) {
  return (
    <div className="h-full bg-white flex flex-col p-3">
      <span className="text-[10px] font-black text-slate-800 mb-3">Recurring Payment</span>
      <div className="bg-slate-50 rounded-xl p-2 mb-2">
        <p className="text-[7px] text-slate-500">Sending to</p>
        <p className="text-[9px] font-black text-slate-800">@landlord · $800/mo</p>
      </div>
      <div className="flex gap-1 mb-3">
        {['Daily', 'Weekly', 'Monthly'].map((f) => (
          <span key={f} className={`text-[7px] font-black px-2 py-1 rounded-lg ${f === 'Monthly' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{f}</span>
        ))}
      </div>
      <HL done={done} onTap={onTap} radius="rounded-xl">
        <div className="bg-blue-600 rounded-xl py-2 text-center text-[9px] font-black text-white">Enable Recurring</div>
      </HL>
    </div>
  );
}

function BillPayScreen({ done, onTap }) {
  const bills = [{ name: 'Electricity', due: 'Jul 5', amount: '$87.40', color: 'text-yellow-500' }, { name: 'Internet', due: 'Jul 8', amount: '$59.99', color: 'text-blue-500' }, { name: 'Netflix', due: 'Jul 12', amount: '$15.99', color: 'text-red-500' }];
  return (
    <div className="h-full bg-white flex flex-col p-3">
      <span className="text-[10px] font-black text-slate-800 mb-3">Bill Pay</span>
      <div className="flex flex-col gap-2">
        {bills.map((b, i) => (
          <div key={b.name} className="flex items-center justify-between bg-slate-50 rounded-xl p-2">
            <div><p className="text-[8px] font-black text-slate-800">{b.name}</p><p className="text-[6px] text-slate-400">Due {b.due}</p></div>
            <div className="flex items-center gap-2">
              <span className={`text-[8px] font-black ${b.color}`}>{b.amount}</span>
              {i === 0 ? (
                <HL done={done} onTap={onTap} radius="rounded-lg" labelPos="top">
                  <div className="bg-blue-600 rounded-lg px-2 py-1 text-[7px] font-black text-white">Pay</div>
                </HL>
              ) : (
                <div className="bg-slate-200 rounded-lg px-2 py-1 text-[7px] font-black text-slate-500">Pay</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SplitScreen({ done, onTap }) {
  const people = [{ init: 'JD', name: 'Jane', amount: '$25.00' }, { init: 'MK', name: 'Mike', amount: '$25.00' }, { init: 'SA', name: 'Sara', amount: '$25.00' }];
  return (
    <div className="h-full bg-white flex flex-col p-3">
      <span className="text-[10px] font-black text-slate-800 mb-1">Split Bill</span>
      <p className="text-[7px] text-slate-400 mb-3">Total: $75.00 · 3 people</p>
      <div className="flex flex-col gap-2 mb-3">
        {people.map((p) => (
          <div key={p.name} className="flex items-center gap-2 bg-slate-50 rounded-xl p-2">
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[7px] font-black text-white">{p.init}</div>
            <span className="text-[8px] font-black text-slate-800 flex-1">{p.name}</span>
            <span className="text-[8px] font-black text-slate-600">{p.amount}</span>
          </div>
        ))}
      </div>
      <HL done={done} onTap={onTap} radius="rounded-xl">
        <div className="bg-blue-600 rounded-xl py-2 text-center text-[9px] font-black text-white">Split Equally</div>
      </HL>
    </div>
  );
}

function DisputeScreen({ done, onTap }) {
  return (
    <div className="h-full bg-white flex flex-col p-3">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={10} className="text-red-500" />
        <span className="text-[10px] font-black text-slate-800">Transaction Detail</span>
      </div>
      <div className="bg-red-50 rounded-2xl p-3 mb-3">
        <p className="text-[7px] text-slate-500">Unknown charge</p>
        <p className="text-[13px] font-black text-slate-900">-$149.99</p>
        <p className="text-[7px] text-slate-400">Jun 25, 2026 · *Online Merchant*</p>
      </div>
      <div className="flex flex-col gap-1.5 mb-3">
        {['Wrong amount', 'Not received', 'Fraud / Unauthorized'].map((r) => (
          <div key={r} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
            <div className="w-3 h-3 rounded-full border-2 border-slate-300 flex-shrink-0" />
            <span className="text-[7px] text-slate-600">{r}</span>
          </div>
        ))}
      </div>
      <HL done={done} onTap={onTap} radius="rounded-xl">
        <div className="bg-red-500 rounded-xl py-2 text-center text-[9px] font-black text-white">Dispute Transaction</div>
      </HL>
    </div>
  );
}

function MerchantScanScreen({ done, onTap }) {
  return (
    <div className="h-full bg-white flex flex-col p-3">
      <span className="text-[10px] font-black text-slate-800 mb-3">Scan to Pay</span>
      <div className="flex-1 bg-slate-900 rounded-2xl flex items-center justify-center relative mb-3">
        <div className="w-24 h-24 border-2 border-white/50 rounded-xl flex items-center justify-center">
          <QrCode size={40} className="text-white/30" />
        </div>
        <div className="absolute inset-x-6 top-6 h-0.5 bg-blue-400 animate-pulse" />
      </div>
      <HL done={done} onTap={onTap} radius="rounded-xl">
        <div className="bg-blue-600 rounded-xl py-2 flex items-center justify-center gap-1.5">
          <Scan size={10} className="text-white" />
          <span className="text-[9px] font-black text-white">Scan to Pay</span>
        </div>
      </HL>
    </div>
  );
}

function WalletScreen({ done, onTap }) {
  const currencies = [{ code: 'USD', name: 'US Dollar', bal: '$12,480.50', color: 'text-green-400' }, { code: 'EUR', name: 'Euro', bal: '€3,200.00', color: 'text-blue-400' }, { code: 'GBP', name: 'British Pound', bal: '£1,800.00', color: 'text-purple-400' }, { code: 'AFR', name: 'Afri Reserve', bal: '₳ 8,500', color: 'text-yellow-400' }];
  return (
    <div className="h-full bg-[#0a0f1e] flex flex-col p-3">
      <div className="flex items-center gap-2 mb-3">
        <Wallet size={10} className="text-teal-400" />
        <span className="text-[10px] font-black text-white">Multi-currency Wallet</span>
      </div>
      <div className="flex flex-col gap-2">
        {currencies.map((c, i) => (
          i === 0 ? (
            <HL key={c.code} done={done} onTap={onTap} radius="rounded-xl">
              <div className="bg-slate-800 rounded-xl p-2.5 flex items-center justify-between border border-yellow-400/20">
                <div><p className="text-[9px] font-black text-white">{c.code}</p><p className="text-[6px] text-slate-400">{c.name}</p></div>
                <span className={`text-[8px] font-black ${c.color}`}>{c.bal}</span>
              </div>
            </HL>
          ) : (
            <div key={c.code} className="bg-slate-800 rounded-xl p-2.5 flex items-center justify-between">
              <div><p className="text-[9px] font-black text-white">{c.code}</p><p className="text-[6px] text-slate-400">{c.name}</p></div>
              <span className={`text-[8px] font-black ${c.color}`}>{c.bal}</span>
            </div>
          )
        ))}
      </div>
    </div>
  );
}

function BulkTransferScreen({ done, onTap }) {
  const recipients = [{ init: 'AL', name: 'Alice Lee', amount: '$500' }, { init: 'BM', name: 'Bob Martin', amount: '$500' }, { init: 'CR', name: 'Clara R.', amount: '$500' }];
  return (
    <div className="h-full bg-[#0a0f1e] flex flex-col p-3">
      <div className="flex items-center gap-2 mb-2">
        <Users size={10} className="text-blue-400" />
        <span className="text-[10px] font-black text-white">Bulk Transfer</span>
      </div>
      <p className="text-[7px] text-slate-400 mb-2">3 recipients · Total: $1,500</p>
      <div className="flex flex-col gap-1.5 mb-3">
        {recipients.map((r) => (
          <div key={r.name} className="flex items-center gap-2 bg-slate-800 rounded-xl p-2">
            <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[6px] font-black text-white">{r.init}</div>
            <span className="text-[7px] text-white flex-1">{r.name}</span>
            <span className="text-[7px] font-black text-emerald-400">{r.amount}</span>
          </div>
        ))}
      </div>
      <HL done={done} onTap={onTap} radius="rounded-xl">
        <div className="bg-blue-600 rounded-xl py-2 text-center text-[9px] font-black text-white">Send to All</div>
      </HL>
    </div>
  );
}

function TaxScreen({ done, onTap }) {
  return (
    <div className="h-full bg-white flex flex-col p-3">
      <div className="flex items-center gap-2 mb-3">
        <FileText size={10} className="text-blue-600" />
        <span className="text-[10px] font-black text-slate-800">Tax Statement</span>
      </div>
      <div className="bg-slate-50 rounded-2xl p-3 mb-3">
        <p className="text-[7px] text-slate-400 mb-1">Fiscal Year 2025</p>
        <div className="grid grid-cols-2 gap-2">
          {[['Total Income', '$48,200'], ['Total Paid', '$31,400'], ['Fees Paid', '$820'], ['Net', '$16,800']].map(([l, v]) => (
            <div key={l}><p className="text-[6px] text-slate-400">{l}</p><p className="text-[9px] font-black text-slate-800">{v}</p></div>
          ))}
        </div>
      </div>
      <HL done={done} onTap={onTap} radius="rounded-xl">
        <div className="bg-blue-600 rounded-xl py-2 text-center text-[9px] font-black text-white">Generate Tax Report</div>
      </HL>
    </div>
  );
}

function FilterScreen({ done, onTap }) {
  return (
    <div className="h-full bg-white flex flex-col p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-black text-slate-800">Transactions</span>
        <HL done={done} onTap={onTap} radius="rounded-lg">
          <div className="flex items-center gap-1 bg-blue-600 rounded-lg px-2 py-1">
            <Filter size={8} className="text-white" />
            <span className="text-[7px] font-black text-white">Filter</span>
          </div>
        </HL>
      </div>
      <div className="flex flex-col gap-2">
        {[{ label: 'Sent to Jane', amount: '-$250', date: 'Jun 28', type: 'out' }, { label: 'Received - Bob', amount: '+$500', date: 'Jun 25', type: 'in' }, { label: 'CoT Deposit', amount: '+$1,000', date: 'Jun 20', type: 'in' }, { label: 'SWIFT - Klaus', amount: '-$5,000', date: 'Jun 15', type: 'out' }].map((t) => (
          <div key={t.label} className="flex items-center justify-between bg-slate-50 rounded-xl p-2">
            <div><p className="text-[8px] font-black text-slate-800">{t.label}</p><p className="text-[6px] text-slate-400">{t.date}</p></div>
            <span className={`text-[8px] font-black ${t.type === 'in' ? 'text-emerald-600' : 'text-red-500'}`}>{t.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExportScreen({ variant, done, onTap }) {
  return (
    <div className="h-full bg-white flex flex-col p-3">
      <div className="flex items-center gap-2 mb-3">
        <Download size={10} className="text-blue-600" />
        <span className="text-[10px] font-black text-slate-800">Export Statement</span>
      </div>
      <div className="bg-slate-50 rounded-2xl p-3 mb-3">
        <p className="text-[7px] text-slate-400 mb-1">Date Range</p>
        <p className="text-[9px] font-black text-slate-800">Jan 1, 2026 – Jun 28, 2026</p>
        <p className="text-[7px] text-slate-400 mt-1">184 transactions</p>
      </div>
      <div className="flex flex-col gap-2">
        <HL done={done && variant === 'pdf'} onTap={variant === 'pdf' ? onTap : undefined} radius="rounded-xl">
          <div className={`rounded-xl py-2 flex items-center justify-center gap-1.5 ${variant === 'pdf' ? 'bg-red-500' : 'bg-slate-100'}`}>
            <FileText size={10} className={variant === 'pdf' ? 'text-white' : 'text-slate-400'} />
            <span className={`text-[9px] font-black ${variant === 'pdf' ? 'text-white' : 'text-slate-400'}`}>Export PDF</span>
          </div>
        </HL>
        <HL done={done && variant === 'csv'} onTap={variant === 'csv' ? onTap : undefined} radius="rounded-xl">
          <div className={`rounded-xl py-2 flex items-center justify-center gap-1.5 ${variant === 'csv' ? 'bg-emerald-500' : 'bg-slate-100'}`}>
            <TrendingUp size={10} className={variant === 'csv' ? 'text-white' : 'text-slate-400'} />
            <span className={`text-[9px] font-black ${variant === 'csv' ? 'text-white' : 'text-slate-400'}`}>Export CSV</span>
          </div>
        </HL>
      </div>
    </div>
  );
}

function SummaryScreen() {
  return (
    <div className="h-full bg-[#0a0f1e] flex flex-col items-center justify-center p-4 text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mb-4">
        <CheckCircle2 size={28} className="text-emerald-400" />
      </div>
      <p className="text-white font-black text-base mb-1">Transaction Pro!</p>
      <p className="text-slate-400 text-[8px] mb-4">30 modules completed</p>
      <div className="flex gap-1 flex-wrap justify-center">
        {['CoT', 'Stripe', 'Send', 'SWIFT', 'ACH', 'AFR', 'NFC', 'QR', 'Split', 'Bulk'].map((t) => (
          <span key={t} className="text-[6px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded-full">{t}</span>
        ))}
      </div>
    </div>
  );
}

function getScreen(idx, done, onTap) {
  switch (idx) {
    case 0:  return <DashboardScreen />;
    case 1:  return <DepositScreen variant="cot" done={done} onTap={onTap} />;
    case 2:  return <DepositScreen variant="stripe" done={done} onTap={onTap} />;
    case 3:  return <SendScreen done={done} onTap={onTap} />;
    case 4:  return <ReceiveScreen done={done} onTap={onTap} />;
    case 5:  return <InvoiceScreen done={done} onTap={onTap} />;
    case 6:  return <QRScreen done={done} onTap={onTap} />;
    case 7:  return <PaymentLinkScreen done={done} onTap={onTap} />;
    case 8:  return <PayMeScreen variant="view" done={done} onTap={onTap} />;
    case 9:  return <PayMeScreen variant="freeze" done={done} onTap={onTap} />;
    case 10: return <WithdrawScreen variant="global" done={done} onTap={onTap} />;
    case 11: return <WithdrawScreen variant="cot" done={done} onTap={onTap} />;
    case 12: return <NFCScreen variant="send" done={done} onTap={onTap} />;
    case 13: return <NFCScreen variant="receive" done={done} onTap={onTap} />;
    case 14: return <NFCScreen variant="card" done={done} onTap={onTap} />;
    case 15: return <SwiftScreen done={done} onTap={onTap} />;
    case 16: return <ACHScreen done={done} onTap={onTap} />;
    case 17: return <ExchangeScreen done={done} onTap={onTap} />;
    case 18: return <RecurringScreen done={done} onTap={onTap} />;
    case 19: return <BillPayScreen done={done} onTap={onTap} />;
    case 20: return <SplitScreen done={done} onTap={onTap} />;
    case 21: return <DisputeScreen done={done} onTap={onTap} />;
    case 22: return <MerchantScanScreen done={done} onTap={onTap} />;
    case 23: return <WalletScreen done={done} onTap={onTap} />;
    case 24: return <BulkTransferScreen done={done} onTap={onTap} />;
    case 25: return <TaxScreen done={done} onTap={onTap} />;
    case 26: return <FilterScreen done={done} onTap={onTap} />;
    case 27: return <ExportScreen variant="pdf" done={done} onTap={onTap} />;
    case 28: return <ExportScreen variant="csv" done={done} onTap={onTap} />;
    case 29: return <SummaryScreen />;
    default: return <DashboardScreen />;
  }
}

const isDark = (idx) => [0, 1, 2, 3, 6, 10, 11, 12, 13, 14, 15, 17, 23, 24, 29].includes(idx);

const QUESTIONS = [
  { q: { en: 'What fee does Community of Trust charge?', fr: 'Quel frais facture la Communauté de Confiance?', es: '¿Qué tarifa cobra la Comunidad de Confianza?' }, opts: { en: ['1% IFB + 2% Processor', '2.9% + $0.30', '0% always', '5% flat'], fr: ['1% IFB + 2% Processeur', '2,9% + 0,30$', '0% toujours', '5% fixe'], es: ['1% IFB + 2% Procesador', '2.9% + $0.30', '0% siempre', '5% fijo'] }, ans: 0 },
  { q: { en: 'Which network does Global Card Network use?', fr: 'Quel réseau utilise le Réseau Global de Cartes?', es: '¿Qué red usa la Red Global de Tarjetas?' }, opts: { en: ['PayPal', 'Stripe', 'Square', 'Braintree'], fr: ['PayPal', 'Stripe', 'Square', 'Braintree'], es: ['PayPal', 'Stripe', 'Square', 'Braintree'] }, ans: 1 },
  { q: { en: 'How long does a SWIFT transfer take?', fr: 'Combien de temps prend un virement SWIFT?', es: '¿Cuánto tiempo tarda una transferencia SWIFT?' }, opts: { en: ['Instant', '1-5 business days', '1 month', '3 hours'], fr: ['Instantané', '1-5 jours ouvrables', '1 mois', '3 heures'], es: ['Instantáneo', '1-5 días hábiles', '1 mes', '3 horas'] }, ans: 1 },
  { q: { en: 'What does freezing your Pay Me card do?', fr: 'Que fait le blocage de votre carte Pay Me?', es: '¿Qué hace congelar tu tarjeta Pay Me?' }, opts: { en: ['Blocks outgoing payments', 'Closes your account', 'Blocks incoming NFC/QR payments', 'Converts to USD'], fr: ['Bloque les paiements sortants', 'Ferme votre compte', 'Bloque les paiements NFC/QR entrants', 'Convertit en USD'], es: ['Bloquea pagos salientes', 'Cierra tu cuenta', 'Bloquea pagos NFC/QR entrantes', 'Convierte a USD'] }, ans: 2 },
  { q: { en: 'What is AFR?', fr: 'Qu\'est-ce que AFR?', es: '¿Qué es AFR?' }, opts: { en: ['A bank name', 'IFB\'s community currency', 'A loan product', 'A debit card'], fr: ['Un nom de banque', 'La monnaie communautaire d\'IFB', 'Un produit de prêt', 'Une carte de débit'], es: ['Un nombre de banco', 'La moneda comunitaria de IFB', 'Un producto de préstamo', 'Una tarjeta de débito'] }, ans: 1 },
  { q: { en: 'Where can you find the Dispute option?', fr: 'Où trouver l\'option Contester?', es: '¿Dónde está la opción Disputar?' }, opts: { en: ['Home screen', 'Transaction detail view', 'Settings', 'Profile'], fr: ['Écran d\'accueil', 'Vue détail de transaction', 'Paramètres', 'Profil'], es: ['Pantalla de inicio', 'Vista de detalle de transacción', 'Ajustes', 'Perfil'] }, ans: 1 },
  { q: { en: 'What does ACH stand for (functionally)?', fr: 'Que signifie ACH (fonctionnellement)?', es: '¿Qué significa ACH funcionalmente?' }, opts: { en: ['International wire', 'US domestic bank transfer', 'Crypto transfer', 'Card payment'], fr: ['Virement international', 'Virement bancaire américain', 'Transfert crypto', 'Paiement par carte'], es: ['Transferencia internacional', 'Transferencia bancaria de EE.UU.', 'Transferencia cripto', 'Pago con tarjeta'] }, ans: 1 },
  { q: { en: 'What format does Bulk Transfer accept for uploading recipients?', fr: 'Quel format le transfert en masse accepte-t-il?', es: '¿Qué formato acepta la transferencia masiva?' }, opts: { en: ['PDF', 'CSV', 'XLSX only', 'JSON'], fr: ['PDF', 'CSV', 'XLSX seulement', 'JSON'], es: ['PDF', 'CSV', 'Solo XLSX', 'JSON'] }, ans: 1 },
  { q: { en: 'Which export format is compatible with QuickBooks?', fr: 'Quel format d\'export est compatible avec QuickBooks?', es: '¿Qué formato de exportación es compatible con QuickBooks?' }, opts: { en: ['PDF', 'CSV', 'Both PDF and CSV', 'Neither'], fr: ['PDF', 'CSV', 'PDF et CSV', 'Ni l\'un ni l\'autre'], es: ['PDF', 'CSV', 'PDF y CSV', 'Ninguno'] }, ans: 1 },
  { q: { en: 'How does NFC Card Mode work?', fr: 'Comment fonctionne le Mode Carte NFC?', es: '¿Cómo funciona el Modo Tarjeta NFC?' }, opts: { en: ['Scans merchant QR', 'Emulates a physical payment card', 'Sends SWIFT wire', 'Takes a photo of the bill'], fr: ['Scanne le QR du commerçant', 'Émule une carte de paiement physique', 'Envoie un virement SWIFT', 'Prend une photo de la facture'], es: ['Escanea QR del comerciante', 'Emula una tarjeta de pago física', 'Envía transferencia SWIFT', 'Toma foto de la factura'] }, ans: 1 },
  { q: { en: 'What does the PDF bank statement prove?', fr: 'Que prouve le relevé bancaire PDF?', es: '¿Qué prueba el extracto bancario PDF?' }, opts: { en: ['Identity only', 'Proof of funds (accepted by banks/visa offices)', 'Crypto ownership', 'Insurance coverage'], fr: ['Identité seulement', 'Preuve de fonds (acceptée par banques/ambassades)', 'Propriété crypto', 'Couverture d\'assurance'], es: ['Solo identidad', 'Prueba de fondos (aceptada por bancos/embajadas)', 'Propiedad cripto', 'Cobertura de seguro'] }, ans: 1 },
  { q: { en: 'How many transaction modules does DEUS offer?', fr: 'Combien de modules de transaction DEUS propose-t-il?', es: '¿Cuántos módulos de transacción ofrece DEUS?' }, opts: { en: ['14', '20', '30', '50'], fr: ['14', '20', '30', '50'], es: ['14', '20', '30', '50'] }, ans: 2 },
];

export default function TransactionGuide({ onClose }) {
  const [slide, setSlide] = useState(0);
  const [tapped, setTapped] = useState({});
  const [mode, setMode] = useState('course');
  const [lang, setLang] = useState('en');
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [certName, setCertName] = useState('');

  const s = SLIDES[slide];
  const showExplain = s.noTap || tapped[slide];
  const canNext = showExplain;

  const handleTap = () => setTapped((p) => ({ ...p, [slide]: true }));
  const goNext = () => { if (slide < SLIDES.length - 1) setSlide((p) => p + 1); else setMode('assessment'); };
  const goPrev = () => { if (slide > 0) setSlide((p) => p - 1); };

  const handleSubmit = () => {
    let sc = 0;
    QUESTIONS.forEach((q, i) => { if (answers[i] === q.ans) sc++; });
    setScore(sc);
    setSubmitted(true);
    if (sc >= 9) setTimeout(() => setMode('cert'), 1200);
  };

  const labels = {
    back: { en: 'Back', fr: 'Retour', es: 'Atrás' },
    next: { en: 'Next', fr: 'Suivant', es: 'Siguiente' },
    tapFirst: { en: 'Tap the highlighted element first', fr: 'Appuyez sur l\'élément mis en évidence', es: 'Toca el elemento resaltado primero' },
    tip: { en: 'Tip', fr: 'Conseil', es: 'Consejo' },
    assessment: { en: 'Take Assessment', fr: 'Passer l\'Évaluation', es: 'Tomar Evaluación' },
    submit: { en: 'Submit Answers', fr: 'Soumettre les Réponses', es: 'Enviar Respuestas' },
    score: { en: 'Your Score', fr: 'Votre Score', es: 'Tu Puntuación' },
    pass: { en: 'Congratulations! You passed!', fr: 'Félicitations! Vous avez réussi!', es: '¡Felicidades! ¡Aprobaste!' },
    fail: { en: 'Score 9/12 to pass. Try again!', fr: 'Obtenez 9/12 pour réussir.', es: 'Necesitas 9/12 para aprobar.' },
    retry: { en: 'Retry', fr: 'Réessayer', es: 'Reintentar' },
    cert: { en: 'Get Certificate', fr: 'Obtenir le Certificat', es: 'Obtener Certificado' },
    yourName: { en: 'Your full name', fr: 'Votre nom complet', es: 'Tu nombre completo' },
    certTitle: { en: 'Certificate of Achievement', fr: 'Certificat de Réussite', es: 'Certificado de Logro' },
    certBody: { en: 'has successfully completed the DEUS Transaction Guide and demonstrated mastery of all 30 transaction modules.', fr: 'a complété avec succès le Guide des Transactions DEUS et a démontré la maîtrise des 30 modules.', es: 'ha completado exitosamente la Guía de Transacciones DEUS y ha demostrado dominio de los 30 módulos.' },
    certFooter: { en: 'Infinite Future Bank · DEUS OS', fr: 'Infinite Future Bank · DEUS OS', es: 'Infinite Future Bank · DEUS OS' },
    download: { en: 'Download Certificate', fr: 'Télécharger le Certificat', es: 'Descargar Certificado' },
  };

  if (mode === 'assessment') {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#0a0f1e] flex flex-col">
        <div className="bg-[#0a0f1e] border-b border-slate-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black"><span className="text-[#4285F4]">D</span><span className="text-[#EA4335]">E</span><span className="text-[#FBBC04]">U</span><span className="text-[#34A853]">S</span></span>
            <span className="text-slate-400 text-xs font-black uppercase tracking-widest">Assessment</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-800 rounded-xl p-1">
              {['en', 'fr', 'es'].map((l) => (
                <button key={l} onClick={() => setLang(l)} className={`text-[10px] font-black px-2 py-1 rounded-lg transition-colors ${lang === l ? 'bg-white text-slate-900' : 'text-white'}`}>{l.toUpperCase()}</button>
              ))}
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400"><X size={16} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full">
          {!submitted ? (
            <>
              <p className="text-white font-black text-lg mb-1">Transaction Assessment</p>
              <p className="text-slate-400 text-xs mb-6">12 questions · Pass: 9/12</p>
              {QUESTIONS.map((q, qi) => (
                <div key={qi} className="mb-5">
                  <p className="text-white text-sm font-black mb-2">{qi + 1}. {q.q[lang]}</p>
                  <div className="grid grid-cols-1 gap-2">
                    {q.opts[lang].map((opt, oi) => (
                      <button key={oi} onClick={() => setAnswers((p) => ({ ...p, [qi]: oi }))}
                        className={`text-left px-4 py-2 rounded-xl text-sm font-black transition-colors ${answers[qi] === oi ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button onClick={handleSubmit} disabled={Object.keys(answers).length < QUESTIONS.length}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-black py-3 rounded-2xl transition-colors">
                {labels.submit[lang]}
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center text-center py-8">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${score >= 9 ? 'bg-emerald-500/20 border-2 border-emerald-500' : 'bg-red-500/20 border-2 border-red-500'}`}>
                {score >= 9 ? <CheckCircle2 size={36} className="text-emerald-400" /> : <X size={36} className="text-red-400" />}
              </div>
              <p className="text-white font-black text-2xl mb-1">{score}/12</p>
              <p className="text-slate-400 text-sm mb-4">{score >= 9 ? labels.pass[lang] : labels.fail[lang]}</p>
              {score < 9 && (
                <button onClick={() => { setAnswers({}); setSubmitted(false); }}
                  className="bg-slate-700 text-white font-black px-6 py-2 rounded-xl">{labels.retry[lang]}</button>
              )}
              {score >= 9 && (
                <button onClick={() => setMode('cert')} className="bg-emerald-600 text-white font-black px-6 py-2 rounded-xl">{labels.cert[lang]}</button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (mode === 'cert') {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#0a0f1e] flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Award size={32} className="text-white" />
          </div>
          <p className="text-xs font-black uppercase tracking-widest text-blue-600 mb-2">{labels.certTitle[lang]}</p>
          <input value={certName} onChange={(e) => setCertName(e.target.value)} placeholder={labels.yourName[lang]}
            className="w-full border-b-2 border-blue-600 text-center text-xl font-black text-slate-900 outline-none mb-3 pb-1" />
          <p className="text-slate-500 text-xs leading-relaxed mb-4">{labels.certBody[lang]}</p>
          <div className="bg-blue-50 rounded-2xl px-4 py-2 mb-4">
            <p className="text-blue-600 font-black text-2xl">{score}/12</p>
            <p className="text-slate-500 text-xs">Transaction Expert</p>
          </div>
          <p className="text-slate-400 text-[10px] mb-4">{labels.certFooter[lang]}</p>
          <button className="w-full bg-blue-600 text-white font-black py-3 rounded-2xl">{labels.download[lang]}</button>
        </div>
        <button onClick={onClose} className="mt-6 text-slate-400 font-black text-sm"><X size={14} className="inline mr-1" />Close</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0a0f1e] flex flex-col">
      <div className="bg-[#0a0f1e] border-b border-slate-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black"><span className="text-[#4285F4]">D</span><span className="text-[#EA4335]">E</span><span className="text-[#FBBC04]">U</span><span className="text-[#34A853]">S</span></span>
          <span className="text-slate-400 text-xs font-black uppercase tracking-widest">Transactions</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-800 rounded-xl p-1">
            {['en', 'fr', 'es'].map((l) => (
              <button key={l} onClick={() => setLang(l)} className={`text-[10px] font-black px-2 py-1 rounded-lg transition-colors ${lang === l ? 'bg-white text-slate-900' : 'text-white'}`}>{l.toUpperCase()}</button>
            ))}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"><X size={16} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col md:flex-row items-start justify-center gap-4 md:gap-8 p-4 md:p-8 max-w-5xl mx-auto">
          <div className="flex-shrink-0 w-full md:w-auto flex flex-col items-center gap-2">
            <div className="scale-[0.80] -mb-[99px] origin-top md:scale-100 md:mb-0">
              <Phone dark={isDark(slide)}>
                {getScreen(slide, !!tapped[slide], handleTap)}
              </Phone>
            </div>
            {!s.noTap && !tapped[slide] && (
              <p className="text-yellow-400 text-[10px] font-black animate-pulse mt-1 md:mt-0 text-center px-4 md:px-0">
                {s.prompt[lang]}
              </p>
            )}
          </div>

          <div className="flex-1 w-full flex flex-col gap-4">
            <div>
              <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-1">{s.path[lang]}</p>
              <h2 className="text-white font-black text-xl leading-tight">{s.title[lang]}</h2>
              <p className="text-xs text-slate-500 mt-1">{slide + 1} / {SLIDES.length}</p>
            </div>

            {showExplain ? (
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
                <p className="text-slate-200 text-sm leading-relaxed">{s.explain[lang]}</p>
              </div>
            ) : (
              <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0">
                  <span className="text-black font-black text-xs">!</span>
                </div>
                <p className="text-yellow-300 text-sm font-black">{labels.tapFirst[lang]}</p>
              </div>
            )}

            {showExplain && (
              <div className="bg-blue-600/10 border border-blue-600/20 rounded-2xl p-3 flex gap-2">
                <Zap size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-blue-400 text-[10px] font-black uppercase tracking-wide mb-0.5">{labels.tip[lang]}</p>
                  <p className="text-slate-300 text-xs">{s.tip[lang]}</p>
                </div>
              </div>
            )}

            {slide === SLIDES.length - 1 && showExplain && (
              <button onClick={() => setMode('assessment')} className="bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-2xl transition-colors text-sm">
                {labels.assessment[lang]}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-[#0a0f1e] border-t border-slate-800 px-3 md:px-4 py-2 md:py-3 flex items-center justify-between gap-2 flex-shrink-0">
        <button onClick={goPrev} disabled={slide === 0}
          className="flex items-center gap-1 px-3 md:px-4 py-2 rounded-xl font-black text-xs md:text-sm bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft size={14} />{labels.back[lang]}
        </button>

        <div className="flex gap-0.5 md:gap-1 flex-wrap justify-center max-w-[140px] md:max-w-none">
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => setSlide(i)}
              className={`rounded-full transition-all ${i === slide ? 'w-3 h-1.5 md:w-4 md:h-2 bg-blue-500' : 'w-1.5 h-1.5 bg-slate-600 hover:bg-slate-400'}`} />
          ))}
        </div>

        <button onClick={goNext} disabled={!canNext}
          className="flex items-center gap-1 px-3 md:px-4 py-2 rounded-xl font-black text-xs md:text-sm bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          {labels.next[lang]}<ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
