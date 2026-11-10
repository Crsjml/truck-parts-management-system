import { describe, it, expect } from 'vitest';
import {
  skuPrefixFor,
  formatSku,
  formatDocNumber,
  nextDocNumber,
  dateKey,
  mapLegacyPoStatus,
  roundMoney,
  roundUpTender,
  mpnFromSeed,
  LEGACY,
  createSequencer,
  parseSku,
  parseDocNumber,
  normalizeOemNumber,
  normalizeOemNumbers
} from '../recordFormats.js';

describe('skuPrefixFor', () => {
  it('returns the mapped CAT-PRT code for a known subcategory', () => {
    expect(skuPrefixFor('Leaf Springs')).toBe('SPR-LEF');
    expect(skuPrefixFor('Brake Pads/Linings')).toBe('BRK-PAD');
  });

  it('derives a 3+3 letter code for an unknown category', () => {
    expect(skuPrefixFor('Exhaust Systems')).toBe('EXH-GEN');
  });

  it('pads very short category names', () => {
    expect(skuPrefixFor('AC')).toBe('ACX-GEN');
  });
});

describe('formatSku', () => {
  it('zero-pads the sequence to five digits', () => {
    expect(formatSku('BRK-PAD', 1)).toBe('BRK-PAD-00001');
    expect(formatSku('ENG-TRB', 123)).toBe('ENG-TRB-00123');
  });
});

describe('dateKey / formatDocNumber', () => {
  it('formats the Philippine calendar day as YYYYMMDD', () => {
    expect(dateKey(new Date('2026-09-05T10:00:00Z'))).toBe('20260905');
  });

  it('rolls over at Manila midnight, not UTC or server-local midnight', () => {
    // 23:30 UTC on Sep 4 is 07:30 on Sep 5 in Manila (UTC+8).
    expect(dateKey(new Date('2026-09-04T23:30:00Z'))).toBe('20260905');
    // 15:59 UTC is 23:59 Manila, still the same day.
    expect(dateKey(new Date('2026-09-05T15:59:00Z'))).toBe('20260905');
    expect(dateKey(new Date('2026-09-05T16:00:00Z'))).toBe('20260906');
  });

  it('builds TYPE-YYYYMMDD-#### numbers', () => {
    expect(formatDocNumber('PO', new Date('2026-09-25T04:00:00Z'), 3)).toBe('PO-20260925-0003');
    expect(formatDocNumber('INV', new Date('2026-09-29T04:00:00Z'), 1)).toBe('INV-20260929-0001');
  });
});

describe('nextDocNumber', () => {
  const day = new Date('2026-11-10T02:00:00Z');

  it('starts at 0001 when nothing exists for the day', () => {
    expect(nextDocNumber('INV', day, null)).toBe('INV-20261110-0001');
  });

  it('continues after the latest number for the day', () => {
    expect(nextDocNumber('PO', day, 'PO-20261110-0041')).toBe('PO-20261110-0042');
  });

  it('starts fresh when the latest number is unparseable', () => {
    expect(nextDocNumber('SA', day, 'SA-garbage')).toBe('SA-20261110-0001');
  });
});

describe('legacy patterns', () => {
  it('match only seed-era formats, never the new ones', () => {
    expect(LEGACY.sku.test('SKU-A1B2C3D4')).toBe(true);
    expect(LEGACY.sku.test('BRK-PAD-00001')).toBe(false);
    expect(LEGACY.poNumber.test('PO-X7K2QF')).toBe(true);
    expect(LEGACY.poNumber.test('PO-20260925-0003')).toBe(false);
    expect(LEGACY.invoice.test('INV-1759123456789-123')).toBe(true);
    expect(LEGACY.invoice.test('WEB-1759123456789-123')).toBe(true);
    expect(LEGACY.invoice.test('WEB-1759123456789')).toBe(false); // live checkout
    expect(LEGACY.invoice.test('TTP-6789-1234')).toBe(false); // live POS
    expect(LEGACY.oem.test('OEM-12345')).toBe(true);
    expect(LEGACY.oem.test('17801-2340')).toBe(false);
  });
});

describe('mapLegacyPoStatus', () => {
  it('maps seed-only statuses onto the app lifecycle', () => {
    expect(mapLegacyPoStatus('Acknowledged')).toBe('Confirmed');
    expect(mapLegacyPoStatus('Ready for Pickup')).toBe('Confirmed');
    expect(mapLegacyPoStatus('Delayed')).toBe('Confirmed');
    expect(mapLegacyPoStatus('Completed')).toBe('Received');
  });

  it('leaves valid statuses untouched', () => {
    expect(mapLegacyPoStatus('Draft')).toBe('Draft');
    expect(mapLegacyPoStatus('RFQ Sent')).toBe('RFQ Sent');
  });
});

describe('money helpers', () => {
  it('rounds to centavos', () => {
    expect(roundMoney(1234.5678)).toBe(1234.57);
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });

  it('rounds tendered cash up to the next 100 (or exact if already round)', () => {
    expect(roundUpTender(1234.5)).toBe(1300);
    expect(roundUpTender(1300)).toBe(1300);
  });
});

describe('mpnFromSeed', () => {
  it('is deterministic and shaped #####-####', () => {
    const a = mpnFromSeed('part-uuid-1');
    expect(a).toMatch(/^\d{5}-\d{4}$/);
    expect(mpnFromSeed('part-uuid-1')).toBe(a);
    expect(mpnFromSeed('part-uuid-2')).not.toBe(a);
  });
});

describe('createSequencer', () => {
  it('continues after numbers already in use, per key', () => {
    const next = createSequencer(['PO-20260925-0003', 'PO-20260925-0001', 'PO-X7K2QF'], parseDocNumber);
    expect(next('PO-20260925')).toBe(4);
    expect(next('PO-20260925')).toBe(5);
    expect(next('PO-20260926')).toBe(1);
  });

  it('works for SKUs and ignores legacy ones', () => {
    const next = createSequencer(['BRK-PAD-00007', 'SKU-A1B2C3D4'], parseSku);
    expect(next('BRK-PAD')).toBe(8);
    expect(next('ENG-TRB')).toBe(1);
  });
});

describe('normalizeOemNumber', () => {
  it.each([
    [' oem: 17801-2340 ', '17801-2340'],
    ['mpn-8-97 x', '8-97 X'],
    ['p/n 1-87610-059-0', '1-87610-059-0'],
    ['Part No. ME-220437', 'ME-220437'],
    ['OEM-12345', '12345'],
    ['  me220437   a ', 'ME220437 A'],
    ['PN12345', 'PN12345'],        // no separator after the label: a real number
    ['OEMX-100', 'OEMX-100'],      // label must be a whole word
    ['', ''],
    [null, '']
  ])('normalizes %j to %j', (input, expected) => {
    expect(normalizeOemNumber(input)).toBe(expected);
  });
});

describe('normalizeOemNumbers', () => {
  it('normalizes, drops blanks and de-duplicates while keeping order', () => {
    expect(normalizeOemNumbers(['a1', ' A1 ', 'oem: b2', '', '  '])).toEqual(['A1', 'B2']);
  });

  it('returns an empty list for non-arrays', () => {
    expect(normalizeOemNumbers(undefined)).toEqual([]);
  });
});
