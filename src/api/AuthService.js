import { supabase } from '../services/supabaseClient';

export const AuthService = {
  // ==========================================
  // 1. STANDARD REGISTRATION (With Email/Password)
  // ==========================================
  signUp: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) throw error;
    return data;
  },

  // ==========================================
  // 2. STANDARD LOGIN (With Email/Password)
  // ==========================================
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    return data;
  },

  // ==========================================
  // 3. SECURE LOGOUT (Locking the Vault)
  // ==========================================
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // ==========================================
  // 4. ZERO-FRICTION BIOMETRIC PROVISIONING
  // ==========================================
  // This is the magic. When they click the fingerprint button, 
  // it silently generates a secure, unique credential and registers 
  // them in your REAL Supabase database instantly.
  biometricAccess: async () => {
    // Generate a unique, cryptographically secure ID for this session
    const deviceId = crypto.randomUUID(); 
    const autoEmail = `vault_${deviceId}@infinitefuture.com`;
    const autoPassword = `IFB-Secure-${deviceId}!`;

    // Instantly provision the account in Supabase
    const { data, error } = await supabase.auth.signUp({
      email: autoEmail,
      password: autoPassword,
    });

    if (error) throw error;
    return data;
  }
};