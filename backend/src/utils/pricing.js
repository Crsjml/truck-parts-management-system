// Single source of truth for the customer-facing selling price.
// Part.price is the supplier COST. Selling price = cost x (1 + markup%), where
// the markup is the part's markupOverride when set (0 counts), else the global
// Setting.active_markup. Mirrored on the client by SettingsContext.formatCurrency.

export function computeSellingPrice(basePrice, markupPercent) {
  const markup = Number(markupPercent) || 0;
  return Math.round(basePrice * (1 + markup / 100) * 100) / 100;
}

export function sellingPriceForPart(part, globalMarkup) {
  return computeSellingPrice(Number(part.price) || 0, part.markupOverride ?? globalMarkup);
}
