import { describe, it, expect } from 'vitest';
import { displayNameFor, FALLBACK_DISPLAY_NAME } from './displayName';

describe('displayNameFor', () => {
  it('uses the full name when the user has one', () => {
    expect(displayNameFor({ fullName: 'Ana Reyes', email: 'ana@shop.ph' })).toBe('Ana Reyes');
  });

  it('reads full_name from Supabase user_metadata', () => {
    expect(displayNameFor({ user_metadata: { full_name: 'Ben Cruz' }, email: 'ben@shop.ph' })).toBe('Ben Cruz');
  });

  it('falls back to the email when there is no full name', () => {
    expect(displayNameFor({ fullName: '   ', email: 'owner@shop.ph' })).toBe('owner@shop.ph');
  });

  it('falls back to a neutral label when there is neither name nor email', () => {
    expect(displayNameFor({})).toBe('Staff member');
    expect(displayNameFor(null)).toBe('Staff member');
    expect(FALLBACK_DISPLAY_NAME).toBe('Staff member');
  });

  it('never invents a person', () => {
    for (const u of [undefined, null, {}, { fullName: '' }, { email: '' }]) {
      expect(displayNameFor(u)).not.toMatch(/Cris Dela Cruz/);
    }
  });
});
