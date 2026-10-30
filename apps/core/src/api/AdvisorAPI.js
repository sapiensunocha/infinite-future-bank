// src/api/AdvisorAPI.js
import { supabase } from '../services/supabaseClient';

export const DeusAdvisor = {
  askQuestion: async (userMessage) => {
    try {
      // 1. Preferred & Secure: Call Supabase Edge Function so API keys remain server-side
      const { data, error } = await supabase.functions.invoke('agent-chat', {
        body: {
          message: userMessage,
          agentName: 'DEUS Elite Advisor',
          customPrompt: `You are DEUS, the elite private AI financial advisor for Infinite Future Bank (IFB). 
          You speak to High-Net-Worth individuals. Your tone is concise, highly analytical, confident, and slightly futuristic. 
          Manage their physical cash vaults (MySafe) and their digital liquidity. 
          Never give generic retail banking advice. Assume the user operates in institutional numbers.`
        }
      });

      if (!error && data?.text) {
        return data.text;
      }

      // SECURITY: the client-side Gemini fallback (VITE_GEMINI_API_KEY) was removed — any VITE_*
      // value ships to every browser. agent-chat is the only path to the model.

      return data?.error || "DEUS Advisor is currently synchronizing with global markets. Please retry shortly.";
    } catch (error) {
      console.warn("[DEUS ERROR]:", error);
      return "I am currently syncing with the global liquidity network. Please try again in a moment.";
    }
  }
};
