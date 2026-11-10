// frontend/src/utils/__tests__/staffState.test.js
import { describe, it, expect } from 'vitest';
import { staffState, relativeTime } from '../staffState';

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

describe('staffState', () => {
  it('treats a null last-seen as pending (allowlisted, never signed in)', () => {
    expect(staffState(null)).toBe('pending');
    expect(staffState(undefined)).toBe('pending');
  });

  it('treats a recent sign-in as active', () => {
    expect(staffState(daysAgo(1))).toBe('active');
    expect(staffState(daysAgo(59))).toBe('active');
  });

  it('treats a sign-in older than 60 days as dormant', () => {
    expect(staffState(daysAgo(61))).toBe('dormant');
    expect(staffState(daysAgo(400))).toBe('dormant');
  });

  it('treats an unparseable value as pending rather than throwing', () => {
    expect(staffState('not-a-date')).toBe('pending');
  });
});

describe('relativeTime', () => {
  it('reports never for a null value', () => {
    expect(relativeTime(null)).toBe('never signed in');
  });

  it('reports hours for a same-day value', () => {
    expect(relativeTime(new Date(Date.now() - 2 * 3600000).toISOString())).toMatch(/hour/);
  });

  it('reports days for an older value', () => {
    expect(relativeTime(daysAgo(3))).toMatch(/day/);
  });
});
