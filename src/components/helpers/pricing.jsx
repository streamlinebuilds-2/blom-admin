// Price calculation utilities - single source of truth

export const cents = (n) => Math.max(0, Math.round(n));

export function calcSpecialPrice(base, type, value) {
  if (type === 'percent') {
    return Math.max(1, Math.floor(base * (1 - value / 100)));
  }
  if (type === 'amount_off') {
    return Math.max(1, base - Math.floor(value * 100));
  }
  // fixed_price
  return Math.max(1, Math.floor(value * 100));
}

export function discountLabel(base, final) {
  const diff = base - final;
  if (diff <= 0) return null;
  const pct = Math.round((diff / base) * 100);
  return { pct, amountCents: diff };
}