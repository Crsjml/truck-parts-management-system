// Single source of truth for the Slow-Moving Stock wording and stock value,
// shared by the on-screen report and its PDF so the two cannot drift.

export const NEVER_SOLD_LABEL = 'Never sold';

export function lastSaleText(days) {
  if (days === null || days === undefined) return NEVER_SOLD_LABEL;
  return days === 0 ? 'Today' : `${days} days ago`;
}

// Part.price is the base cost (see utils/markup.js), so stock value = stock x price.
// Returns null when the part has no usable cost.
export function stockValueOf(part) {
  return typeof part.price === 'number' && Number.isFinite(part.price) ? (part.stock || 0) * part.price : null;
}
