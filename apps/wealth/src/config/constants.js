// Single source of truth for the deployed app URL.
// window.location.origin returns "capacitor://localhost" inside the APK
// which breaks all share links, QR codes, Stripe return URLs, and auth redirects.
export const APP_URL = 'https://deus.infinitefuturebank.org';
