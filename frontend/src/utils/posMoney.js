/**
 * Money arithmetic for the walk-in POS.
 *
 * Two spaces exist in this codebase and confusing them is the bug this module
 * was written to end:
 *
 *   base space    - `Part.price` as stored, the wholesale cost.
 *   selling space - base price multiplied by `Setting.active_markup`. This is
 *                   the shelf price the customer actually pays.
 *
 * Every function here operates in SELLING space. Convert once, at the moment a
 * part enters the cart, with `toSellingPrice`. Never convert twice.
 *
 * VAT is inclusive: the shelf price already contains it, per PH retail practice.
 * It is extracted for the receipt, never added to the total.
 */

export const VAT_RATE = 0.12;

const round2 = (n) => Math.round(n * 100) / 100;

export function toSellingPrice(basePrice, markupFactor) {
  return round2(basePrice * markupFactor);
}

export function computePosTotals({ cart, discount = 0, vatRate = VAT_RATE }) {
  const lineSum = round2(
    cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  );

  // A discount can never exceed the sale, or change would be owed on a
  // negative total.
  const appliedDiscount = round2(Math.min(Math.max(discount, 0), lineSum));
  const total = round2(lineSum - appliedDiscount);

  const vatableSale = round2(total / (1 + vatRate));
  // Derived by subtraction rather than multiplication so the two parts always
  // sum back to the total exactly, with no rounding gap on the receipt.
  const vatAmount = round2(total - vatableSale);

  return { lineSum, discount: appliedDiscount, total, vatableSale, vatAmount };
}
