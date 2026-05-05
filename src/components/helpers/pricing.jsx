// Price calculation utilities - single source of truth

export const cents = (n) => Math.max(0, Math.round(n));

export function calcSpecialPrice(baseCents, type, value) {
  // All prices should be in cents, minimum 1 rand (100 cents)
  if (type === 'percent') {
    return Math.max(100, Math.floor(baseCents * (1 - value / 100)));
  }
  if (type === 'amount_off') {
    // value is in rands, convert to cents for subtraction
    return Math.max(100, baseCents - Math.floor(value * 100));
  }
  // fixed_price: value is in rands, convert to cents
  return Math.max(100, Math.floor(value * 100));
}

export function discountLabel(base, final) {
  const diff = base - final;
  if (diff <= 0) return null;
  const pct = Math.round((diff / base) * 100);
  return { pct, amountCents: diff };
}