// =========================================================================
// 💱 CURRENCY FORMATTER UTILITY
// =========================================================================
// Instantly and flawlessly localizes numbers into highly readable currency formats.
// =========================================================================

/**
 * Formats a raw number into a localized currency string.
 * * @param {number} amount - The raw integer or float (e.g., 1245890.5)
 * @param {string} currencyCode - The ISO 4217 code (e.g., 'USD', 'EUR', 'GBP')
 * @param {number} decimals - How many decimal places to show (default: 2)
 * @returns {string} - The formatted string (e.g., "$1,245,890.50")
 */
export const formatCurrency = (amount, currencyCode = 'USD', decimals = 2) => {
    if (isNaN(amount) || amount === null) return '$0.00';
  
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  };
  
  /**
   * Formats large numbers compactly for clean UI (e.g., 1,500,000 -> "1.5M")
   */
  export const formatCompact = (amount) => {
    if (isNaN(amount) || amount === null) return '0';
    
    return new Intl.NumberFormat('en-US', {
      notation: "compact",
      compactDisplay: "short",
      maximumFractionDigits: 1
    }).format(amount);
  };