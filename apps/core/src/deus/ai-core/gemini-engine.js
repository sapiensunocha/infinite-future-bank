// =========================================================================
// 🧠 DEUS AI CORE (Powered by Google Gemini)
// =========================================================================
// This module handles all direct communication with the Gemini API.
// It injects strict financial guardrails and persona instructions 
// before sending any user data to the language model.
// =========================================================================

import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini Engine using the secure key from our .env file
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

// We use the Gemini 1.5 Flash or Pro model for lightning-fast reasoning
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * 🤖 1. The Elite Private Banker Chat
 * @param {string} userMessage - What the user typed in the chat
 * @param {object} currentPortfolio - The user's live wealth data
 */
export async function askGeminiBanker(userMessage, currentPortfolio) {
  try {
    // We create a "System Prompt" that invisible wraps around the user's message.
    // This forces the AI to behave exactly how we want it to.
    const systemPrompt = `
      You are DEUS, the elite AI Private Banker for Infinite Future Bank (IFB).
      Your tone is highly professional, concise, reassuring, and brilliant. 
      You are speaking to a high-net-worth individual. 
      Do not use emojis. Do not use generic greetings. 
      
      Here is the user's current live portfolio context:
      ${JSON.stringify(currentPortfolio)}

      The user asks: "${userMessage}"
      
      Provide a strategic, actionable, and sophisticated financial response.
    `;

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    return response.text();
    
  } catch (error) {
    console.error("[DEUS AI ERROR] Communication failure:", error);
    return "DEUS Core is currently analyzing market volatility. I will be back online momentarily.";
  }
}

/**
 * 🛡️ 2. The AI Risk Assessment Engine
 * @param {number} amount - The amount of money being moved
 * @param {string} destination - Where the money is going
 */
export async function analyzeRiskProfile(amount, destination) {
  try {
    // In a real banking environment, this would cross-reference massive AML databases.
    // For DEUS, we ask the AI to evaluate the sheer logic of the transaction.
    const riskPrompt = `
      Analyze the risk of this financial transfer from 0 to 100 (where 100 is maximum fraud risk).
      Amount: $${amount}
      Destination: ${destination}
      
      Return ONLY a JSON object in this format: {"riskScore": number, "reason": "short explanation"}
    `;

    const result = await model.generateContent(riskPrompt);
    const responseText = await result.response.text();
    
    // Clean the output to ensure we parse the JSON correctly
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedRisk = JSON.parse(cleanJson);
    
    return parsedRisk.riskScore; // Returns a number like 12 or 89

  } catch (error) {
    console.error("[DEUS RISK ERROR] Defaulting to maximum security lockdown.", error);
    return 100; // If the AI fails, we block the transaction to be safe.
  }
}