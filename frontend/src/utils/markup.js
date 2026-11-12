/**
 * `Part.price` is the COST (base price before markup). The selling price is
 * cost x (1 + markup%), where markup is the part's override or the global rate.
 */

// Empty markup field means "use the global rate" (null), matching what Save sends.
export const parseMarkupOverride = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

// "Sells at ₱X" for a cost/markup pair typed into a form. `formatCurrency`
// comes from useSettings() and applies the override, else the global markup.
export const sellsAtText = (formatCurrency, cost, markupOverrideInput) =>
  `Sells at ${formatCurrency(Number(cost) || 0, { markupOverride: parseMarkupOverride(markupOverrideInput) })}`;
