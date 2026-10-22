// Single source of truth for the deployed app URL & backend defaults.
// window.location.origin returns "capacitor://localhost" inside the APK/IPA
// which breaks share links, QR codes, Stripe return URLs, and auth redirects.

export const APP_URL = import.meta.env.VITE_APP_URL || 'https://app.infinitefuturebank.org';
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://nfztdpyygfrpbjbhidxe.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5menRkcHl5Z2ZycGJqYmhpZHhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MzcxOTEsImV4cCI6MjA4NzExMzE5MX0.Ydo6vduICdQwBrygEN1e5JswVVaATLChNLtq7whqf7I';
export const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_live_51QlhX1DV4GGUfngRRIJi02QYB2pTZg2bbX9T4xwM0i6FflEPt2FtV7ydZfNks9I9vOAcmwsLGM1U7tzbpmaP454C00qsme0XJ8';
