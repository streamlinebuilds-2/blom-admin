export function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function calcSpecialPrice(priceCents, type, value) {
  // All prices should be in cents
  if (type === 'percent') {
    return Math.max(100, Math.floor(priceCents * (1 - value / 100)));
  }
  if (type === 'amount_off') {
    // value is in rands, convert to cents for subtraction
    return Math.max(100, priceCents - Math.floor(value * 100));
  }
  // fixed_price: value is in rands, convert to cents
  return Math.max(100, Math.floor(value * 100));
}

export function safeParseInt(value, defaultValue = 0) {
  const parsed = parseInt(value);
  return isNaN(parsed) ? defaultValue : parsed;
}