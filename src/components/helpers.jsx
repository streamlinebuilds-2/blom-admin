export function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function calcSpecialPrice(price, type, value) {
  if (type === 'percent') {
    return Math.max(1, Math.floor(price * (1 - value / 100)));
  }
  if (type === 'amount_off') {
    return Math.max(1, price - Math.floor(value * 100));
  }
  return Math.max(1, Math.floor(value * 100));
}

export function safeParseInt(value, defaultValue = 0) {
  const parsed = parseInt(value);
  return isNaN(parsed) ? defaultValue : parsed;
}