import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nfztdpyygfrpbjbhidxe.supabase.co';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5menRkcHl5Z2ZycGJqYmhpZHhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MzcxOTEsImV4cCI6MjA4NzExMzE5MX0.Ydo6vduICdQwBrygEN1e5JswVVaATLChNLtq7whqf7I';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'ifb-auth-token',
    persistSession: true,
    detectSessionInUrl: true,
    autoRefreshToken: true,
  },
});
