import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';

// =========================================================================
// 🧠 PRODUCTION APP STORE (Powered by Zustand & Supabase)
// =========================================================================
// This acts as the central nervous system. It listens for the user's secure 
// login session and automatically fetches their real-time balances directly 
// from the PostgreSQL vault.
// =========================================================================

export const useAppStore = create((set, get) => ({
  // 1. Core State
  user: null, // Holds the authenticated user session
  balances: {
    liquidCash: 0,
    alphaEquity: 0,
    mySafeDigital: 0,
    externalLinked: 0,
  },
  isSyncing: false,
  lastSynced: null,
  notifications: [],

  // =========================================================================
  // 🔐 2. AUTHENTICATION LISTENER
  // =========================================================================
  // Call this once in your App.jsx to start listening to login/logout events
  initializeAuth: () => {
    // Check initial session on boot
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ user: session?.user ?? null });
      if (session?.user) get().syncLiveWealth(session.user.id);
    });

    // Listen for real-time login/logout changes (e.g., FaceID success)
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null });
      
      if (session?.user) {
        get().syncLiveWealth(session.user.id);
      } else {
        // Purge data instantly if user logs out
        set({ 
          balances: { liquidCash: 0, alphaEquity: 0, mySafeDigital: 0, externalLinked: 0 },
          lastSynced: null 
        });
      }
    });
  },

  // =========================================================================
  // 📊 3. THE VAULT SYNC PROTOCOL
  // =========================================================================
  // Fetches exact numeric values from the public.balances table
  syncLiveWealth: async (userId) => {
    if (!userId) return;
    set({ isSyncing: true });
    
    try {
      const { data, error } = await supabase
        .from('balances')
        .select('*')
        .eq('user_id', userId)
        .single(); // We only expect one row per user

      if (error) throw error;

      if (data) {
        // Map the database columns (snake_case) to our frontend state (camelCase)
        set({ 
          balances: {
            liquidCash: Number(data.liquid_usd) || 0,
            alphaEquity: Number(data.alpha_equity_usd) || 0,
            mySafeDigital: Number(data.mysafe_digital_usd) || 0,
            externalLinked: Number(data.external_linked_usd) || 0,
          },
          lastSynced: data.last_synced,
          isSyncing: false 
        });
      } else {
        // If user is new and has no balance row yet, stop loading
        set({ isSyncing: false });
      }
    } catch (error) {
      console.error('[SUPABASE LEDGER ERROR]: Failed to sync live wealth.', error.message);
      set({ isSyncing: false });
    }
  },

  // =========================================================================
  // 🔔 4. UI NOTIFICATIONS
  // =========================================================================
  addNotification: (message, type = 'info') => set((state) => ({
    notifications: [...state.notifications, { id: Date.now(), message, type }]
  })),

  clearNotifications: () => set({ notifications: [] })
}));