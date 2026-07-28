import { useAppStore } from '../store/appStore';

// =========================================================================
// 📈 PRODUCTION HOOK: usePortfolio
// =========================================================================
// Strictly calculates net worth based on live network data.
// =========================================================================

export function usePortfolio() {
  const { balances, isSyncing } = useAppStore();
  
  // Safely sum all balances, ensuring they are numbers. If network fails, defaults to 0.
  const liveNetWorth = Object.values(balances).reduce((acc, val) => acc + (Number(val) || 0), 0);

  // In a live production environment, historical daily change must be fetched 
  // from a time-series database on your backend. We initialize at 0.
  const dailyChange = 0; 
  const dailyChangePercent = 0;

  return {
    liveNetWorth,
    balances,
    isSyncing,
    dailyChange,
    dailyChangePercent
  };
}