// =========================================================================
// 🏦 PRODUCTION PLAID API SERVICE
// =========================================================================

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

/**
 * 1. Fetches the secure Link Token from your real backend
 */
export const createPlaidLinkToken = async (userId) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/plaid/create-link-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    const data = await response.json();
    return data.link_token;
  } catch (error) {
    console.error('[PLAID NETWORK ERROR]: Failed to generate Link Token', error);
    throw error;
  }
};

/**
 * 2. Exchanges the public token after the user logs into their real bank
 */
export const exchangePublicToken = async (publicToken, userId) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/plaid/exchange-public-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicToken, userId })
    });
    return await response.json();
  } catch (error) {
    console.error('[PLAID NETWORK ERROR]: Token exchange failed', error);
    throw error;
  }
};

/**
 * 3. Fetches live, real-time balances from the user's connected accounts
 */
export const fetchExternalBalances = async (userId) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/plaid/balances/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch live balances');
    return await response.json();
  } catch (error) {
    console.error('[PLAID NETWORK ERROR]:', error);
    return null; // Returns null so the UI knows to show $0.00 or an error state
  }
};