// Single source of truth for the Slow-Moving Stock wording and stock value,
// shared by the on-screen report and its PDF so the two cannot drift.

export const NEVER_SOLD_LABEL = 'Never sold';

// Placeholder for a missing value (no SKU, no cost). WinAnsi encodes it, so the PDF can print it too.
export const EM_DASH = '\u2014';

export function lastSaleText(days) {
  if (days === null || days === undefined) return NEVER_SOLD_LABEL;
  return days === 0 ? 'Today' : `${days} days ago`;
}

// Part.price is the base cost (see utils/markup.js), so stock value = stock x price.
// Returns null when the part has no usable cost.
export function stockValueOf(part) {
  return typeof part.price === 'number' && Number.isFinite(part.price) ? (part.stock || 0) * part.price : null;
}

// Stock idle for at least this many days is flagged in the Last sale column.
export const OLD_SALE_DAYS = 90;

// Every row in the report was already idle for the whole look-back window, so a
// fixed cutoff would flag everything on wide windows. Flag stock idle for at
// least twice the window, and never less than OLD_SALE_DAYS.
export function oldSaleThreshold(windowDays) {
  return Math.max(OLD_SALE_DAYS, 2 * (Number(windowDays) || 0));
}

// 'never' (no sale on record), 'old' (idle `threshold`+ days), or 'recent'.
export function lastSaleSeverity(days, threshold = OLD_SALE_DAYS) {
  if (days === null || days === undefined) return 'never';
  return days >= threshold ? 'old' : 'recent';
}
