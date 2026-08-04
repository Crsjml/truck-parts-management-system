import { describe, expect, it } from 'vitest';
import { normalizeCompatibilityRows } from '../../utils/compatibilityModels';

describe('compatibilityModels', () => {
  it('normalizes compatibility rows into a shared inventory shape', () => {
    expect(normalizeCompatibilityRows('Isuzu ELF NPR, Forward, 1998-2005')).toEqual([
      { brand: 'Isuzu', series: 'ELF NPR', year: '' }
    ]);
  });
});
