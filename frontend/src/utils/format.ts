/**
 * Utility functions for consistent financial number and currency formatting.
 */

/**
 * Format fees and commissions with high precision for micro crypto amounts.
 * Example: 0.00039606 -> $0.000396
 *          0.0049447  -> $0.00494
 *          0.0570     -> $0.0570
 *          1.25       -> $1.25
 */
export const formatFee = (val: number | undefined | null): string => {
  if (val === undefined || val === null || isNaN(val)) return '$0.00';
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs === 0) return '$0.00';
  if (abs < 0.001) return `${sign}$${abs.toFixed(6)}`;
  if (abs < 0.01) return `${sign}$${abs.toFixed(5)}`;
  if (abs < 1) return `${sign}$${abs.toFixed(4)}`;
  return `${sign}$${abs.toFixed(2)}`;
};

/**
 * Standard dollar currency format with thousands separator.
 */
export const formatCurrency = (val: number | undefined | null, decimals: number = 2): string => {
  if (val === undefined || val === null || isNaN(val)) return '$0.00';
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  return `${sign}$${abs.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
};

/**
 * Format PNL with explicit +/- sign.
 */
export const formatPNL = (val: number | undefined | null, decimals: number = 2): string => {
  if (val === undefined || val === null || isNaN(val)) return '$0.00';
  const prefix = val > 0 ? '+' : val < 0 ? '-' : '';
  const abs = Math.abs(val);
  return `${prefix}$${abs.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
};
