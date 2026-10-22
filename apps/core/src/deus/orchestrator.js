// =========================================================================
// 🧠 PRODUCTION DEUS ORCHESTRATOR 
// =========================================================================

import { askGeminiBanker, analyzeRiskProfile } from './ai-core/gemini-engine';
import { recordTransaction } from './blockchain/ledger-sync';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

class DeusOrchestrator {
  
  static async consultBanker(userMessage, currentPortfolio) {
    try {
      // Direct pass-through to Gemini Engine
      const response = await askGeminiBanker(userMessage, currentPortfolio);
      return { success: true, message: response };
    } catch (error) {
      console.error('[DEUS AI ERROR]:', error);
      return { success: false, message: "DEUS Core connection failed." };
    }
  }

  static async executeSmartTransfer(amount, currency, destination, userId) {
    // 1. Live AI Risk Check
    const riskScore = await analyzeRiskProfile(amount, destination);
    if (riskScore > 85) return { status: 'REJECTED', reason: 'High risk anomalous pattern detected.' };

    // 2. Real API Call to your Backend to process the movement
    try {
      const response = await fetch(`${BACKEND_URL}/api/transactions/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency, destination, userId })
      });
      
      if (!response.ok) throw new Error('Backend transaction failed');
      const data = await response.json();

      return { status: 'APPROVED', txHash: data.txHash, message: 'Transfer executed.' };
    } catch (error) {
      console.error('[TRANSFER ERROR]:', error);
      return { status: 'FAILED', message: 'Network execution error.' };
    }
  }

  static async processHardwareDeposit(physicalAmount, userId, hardwareId) {
    try {
      // Sends physical deposit signal to your secure backend
      const response = await fetch(`${BACKEND_URL}/api/mysafe/mint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: physicalAmount, userId, hardwareId })
      });
      
      if (!response.ok) throw new Error('Minting protocol rejected by server');
      return await response.json();
    } catch (error) {
      console.error('[HARDWARE MINT ERROR]:', error);
      return { status: 'FAILED' };
    }
  }
}

export default DeusOrchestrator;