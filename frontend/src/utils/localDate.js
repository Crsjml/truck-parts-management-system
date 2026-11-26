// Local-timezone date helpers. Avoid toISOString()/new Date('YYYY-MM-DD'),
// which are UTC-based and shift the calendar day in non-UTC zones.
const pad = (n) => String(n).padStart(2, '0');

export function toLocalDateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseLocalDateKey(key) {
  if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addLocalDays(key, n) {
  const d = parseLocalDateKey(key);
  d.setDate(d.getDate() + n);
  return toLocalDateKey(d);
}
