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

      // 2. Client-side fallback if edge function is unavailable but client key is configured
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (apiKey) {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(userMessage);
        const response = await result.response;
        return response.text();
      }

      return data?.error || "DEUS Advisor is currently synchronizing with global markets. Please retry shortly.";
    } catch (error) {
      console.warn("[DEUS ERROR]:", error);
      return "I am currently syncing with the global liquidity network. Please try again in a moment.";
    }
  }
};
