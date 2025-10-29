export function moneyZAR(cents) {
  if (typeof cents !== 'number') return 'R 0.00';
  return 'R ' + (cents / 100).toFixed(2);
}

export function dateShort(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function dateTime(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function shortId(id) {
  if (!id || typeof id !== 'string') return '—';
  return id.slice(0, 8);
}