// backend/src/utils/__tests__/pin.test.js
import { describe, it, expect } from 'vitest';
import { hashPin, verifyPin } from '../pin.js';

describe('pin helpers', () => {
  it('produces a salt:key formatted hash', () => {
    const stored = hashPin('1234');
    expect(stored).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
  });

  it('produces a different hash each time for the same pin', () => {
    expect(hashPin('1234')).not.toBe(hashPin('1234'));
  });

  it('verifies a correct pin', () => {
    const stored = hashPin('4821');
    expect(verifyPin('4821', stored)).toBe(true);
  });

  it('rejects an incorrect pin', () => {
    const stored = hashPin('4821');
    expect(verifyPin('0000', stored)).toBe(false);
  });

  it('rejects when no pin has been configured', () => {
    expect(verifyPin('1234', null)).toBe(false);
    expect(verifyPin('1234', '')).toBe(false);
  });

  it('rejects a malformed stored value without throwing', () => {
    expect(verifyPin('1234', 'garbage')).toBe(false);
    expect(verifyPin('1234', 'onlysalt:')).toBe(false);
  });
});
