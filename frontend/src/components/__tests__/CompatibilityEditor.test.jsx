import { describe, expect, it } from 'vitest';
import { normalizeCompatibilityRows, fitmentSummary } from '../../utils/compatibilityModels';

describe('compatibilityModels', () => {
  it('normalizes compatibility rows into a shared inventory shape', () => {
    expect(normalizeCompatibilityRows('Isuzu ELF NPR, Forward, 1998-2005')).toEqual([
      { brand: 'Isuzu', series: 'ELF NPR', year: '' }
    ]);
  });
});

describe('fitmentSummary', () => {
  it('groups series under the first make and counts the other makes as +N', () => {
    const summary = fitmentSummary({
      compatibleWith: [
        { brand: 'Isuzu', series: 'Forward', year: '2010' },
        { brand: 'Isuzu', series: 'Giga', year: '' },
        { brand: 'Hino', series: '500', year: '' },
      ],
    });
    expect(summary).toEqual({ label: 'Isuzu Forward/Giga', more: 1, full: 'Isuzu Forward 2010, Isuzu Giga, Hino 500' });
  });

  it('falls back to the legacy compatibility text when there are no fitment rows', () => {
    expect(fitmentSummary({ compatibleWith: [], compatibility: 'Mitsubishi Canter, Fuso Fighter' }))
      .toEqual({ label: 'Mitsubishi Canter', more: 1, full: 'Mitsubishi Canter, Fuso Fighter' });
  });

  it('returns null when a part has no fitment at all', () => {
    expect(fitmentSummary({ compatibleWith: [{ brand: '', series: '', year: '' }], compatibility: '  ' })).toBeNull();
    expect(fitmentSummary({})).toBeNull();
  });
});
