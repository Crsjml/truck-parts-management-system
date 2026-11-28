import { describe, it, expect } from 'vitest';
import { toLocalDateKey, parseLocalDateKey, addLocalDays } from './localDate';

describe('localDate', () => {
  it('toLocalDateKey uses local calendar date at 07:00 local', () => {
    expect(toLocalDateKey(new Date(2026, 10, 26, 7, 0, 0))).toBe('2026-11-26');
  });

  it('toLocalDateKey does not roll back before 08:00 local', () => {
    expect(toLocalDateKey(new Date(2026, 10, 26, 0, 30))).toBe('2026-11-26');
    expect(toLocalDateKey(new Date(2026, 10, 26, 23, 59))).toBe('2026-11-26');
  });

  it('pads single-digit month and day', () => {
    expect(toLocalDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('parseLocalDateKey returns local midnight', () => {
    const d = parseLocalDateKey('2026-11-26');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 10, 26]);
    expect([d.getHours(), d.getMinutes(), d.getSeconds()]).toEqual([0, 0, 0]);
  });

  it('addLocalDays steps one calendar day each way', () => {
    expect(addLocalDays('2026-11-26', -1)).toBe('2026-11-25');
    expect(addLocalDays('2026-11-26', 1)).toBe('2026-11-27');
  });

  it('addLocalDays crosses month and year boundaries', () => {
    expect(addLocalDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addLocalDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addLocalDays('2026-11-26', -30)).toBe('2026-10-27');
  });

  it('parseLocalDateKey returns null for malformed input', () => {
    expect(parseLocalDateKey('')).toBeNull();
    expect(parseLocalDateKey('2026-1-5')).toBeNull();
    expect(parseLocalDateKey('2026-11-26T00:00:00Z')).toBeNull();
    expect(parseLocalDateKey(undefined)).toBeNull();
  });
});
