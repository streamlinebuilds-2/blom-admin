/**
 * Format a number as South African Rand currency
 * @param amount - The amount in ZAR (number)
 * @returns Formatted string like "R 1,234.56"
 */
export function formatZAR(amount: number | string | null | undefined): string {
  if (amount == null || amount === '') return 'R 0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return 'R 0.00';
  return `R ${num.toFixed(2)}`;
}

/**
 * Parse currency string to number (removes "R", commas, spaces)
 */
export function parseZAR(currencyString: string): number {
  const cleaned = currencyString.replace(/[R\s,]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

