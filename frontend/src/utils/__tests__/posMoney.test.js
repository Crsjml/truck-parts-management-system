import { describe, it, expect } from 'vitest';
import { toSellingPrice, computePosTotals, VAT_RATE } from '../posMoney';

describe('toSellingPrice', () => {
  it('applies the markup factor to a wholesale base price', () => {
    expect(toSellingPrice(1000, 1.2)).toBe(1200);
  });

  it('returns the base price unchanged when there is no markup', () => {
    expect(toSellingPrice(1000, 1)).toBe(1000);
  });

  it('rounds to two decimals so cents never drift', () => {
    expect(toSellingPrice(333.33, 1.15)).toBe(383.33);
  });
});

describe('computePosTotals', () => {
  const cart = [
    { price: 1200, quantity: 1 },
    { price: 500, quantity: 2 }
  ];

  it('sums selling-space line totals', () => {
    expect(computePosTotals({ cart, discount: 0, vatRate: VAT_RATE }).lineSum).toBe(2200);
  });

  it('treats the total as VAT-inclusive, never adding tax on top', () => {
    const { total } = computePosTotals({ cart, discount: 0, vatRate: VAT_RATE });
    expect(total).toBe(2200);
  });

  it('splits VAT out of the total so the parts sum back to it', () => {
    const { total, vatableSale, vatAmount } = computePosTotals({
      cart, discount: 0, vatRate: VAT_RATE
    });
    expect(vatableSale).toBe(1964.29);
    expect(vatAmount).toBe(235.71);
    expect(Number((vatableSale + vatAmount).toFixed(2))).toBe(total);
  });

  it('subtracts the discount before splitting VAT', () => {
    const { total, vatableSale, vatAmount } = computePosTotals({
      cart, discount: 200, vatRate: VAT_RATE
    });
    expect(total).toBe(2000);
    expect(Number((vatableSale + vatAmount).toFixed(2))).toBe(2000);
  });

  it('caps the discount at the line sum so a total can never go negative', () => {
    expect(computePosTotals({ cart, discount: 99999, vatRate: VAT_RATE }).total).toBe(0);
  });

  it('returns zeroes for an empty cart', () => {
    const result = computePosTotals({ cart: [], discount: 0, vatRate: VAT_RATE });
    expect(result).toEqual({ lineSum: 0, discount: 0, total: 0, vatableSale: 0, vatAmount: 0 });
  });
});
