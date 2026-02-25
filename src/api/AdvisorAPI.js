// src/api/AdvisorAPI.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export const DeusAdvisor = {
  askQuestion: async (userMessage) => {
    try {
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        systemInstruction: `You are DEUS, the elite private AI financial advisor for Infinite Future Bank (IFB). 
        You speak to Ultra-High-Net-Worth individuals. Your tone is concise, highly analytical, confident, and slightly futuristic. 
        You manage their physical cash vaults (MySafe) and their digital liquidity. 
        Never give generic retail banking advice. Assume the user operates in millions.`
      });

      console.log(`[DEUS] Analyzing query: "${userMessage}"`);
      const result = await model.generateContent(userMessage);
      const response = await result.response;
      return response.text();
      
    } catch (error) {
      console.error("[DEUS ERROR]:", error);
      return "I am currently syncing with the global liquidity network. Please try again in a moment.";
    }
  }
};