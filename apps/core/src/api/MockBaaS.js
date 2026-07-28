// MockBaaS.js - Temporary Banking & Minting API

export const MockBankingAPI = {
  
    // 1. Simulates Currencycloud / Visa Fiat Ledger
    verifyPhysicalDeposit: async (amount) => {
      console.log(`[BANK] Verifying $${amount} physical deposit...`);
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            status: "cleared",
            fiat_tx_id: `cc_visa_${Math.floor(Math.random() * 888888)}`,
            cleared_amount: amount
          });
        }, 1200); // 1.2 second artificial bank delay
      });
    },
  
    // 2. Simulates Circle USDC Minting API
    mintDigitalAsset: async (fiatAmount) => {
      console.log(`[BLOCKCHAIN] Minting ${fiatAmount} USDC...`);
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            status: "minted",
            on_chain_hash: `0xabc123def456${Math.floor(Math.random() * 999999)}`,
            asset: "USDC",
            amount: fiatAmount,
            network_fee: 0.00
          });
        }, 2000); // 2 second artificial blockchain delay
      });
    }
  };