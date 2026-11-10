import { describe, it, expect } from 'vitest';
import { STAFF_ROLES, canAccessPage, accessDiff, formatList } from '../staffAccess';
import { ROLE_PERMISSIONS } from '../../../../backend/src/config/permissions';

describe('staff access contract', () => {
  it('keeps frontend navigation and backend grants consistent', () => {
    expect(STAFF_ROLES.map(role => role.value).sort()).toEqual(Object.keys(ROLE_PERMISSIONS).sort());
    for (const role of STAFF_ROLES) {
      expect(role.pages).toEqual(ROLE_PERMISSIONS[role.value]);
      expect(canAccessPage(role.value, 'account')).toBe(true);
    }
  });
});

describe('accessDiff', () => {
  it('lists every page a Superadmin loses when made a Cashier', () => {
    const { gained, lost } = accessDiff('SUPERADMIN', 'CASHIER');
    expect(lost).toEqual(['Dashboard', 'Parts Inventory', 'Sales Analytics', 'Categories', 'Purchasing', 'Staff Management', 'System Settings']);
    expect(gained).toEqual([]);
  });

  it('lists both sides of a sideways Cashier to Warehouse move', () => {
    expect(accessDiff('CASHIER', 'WAREHOUSE')).toEqual({
      lost: ['Sales POS', 'Customers'],
      gained: ['Parts Inventory', 'Categories', 'Purchasing']
    });
  });

  it('lists what a Cashier gains when promoted to Admin', () => {
    const { gained, lost } = accessDiff('CASHIER', 'ADMIN');
    expect(gained).toEqual(expect.arrayContaining(['Dashboard', 'Sales Analytics']));
    expect(lost).toEqual([]);
  });

  it('returns empty lists for unknown roles', () => {
    expect(accessDiff('NOPE', 'NOPE')).toEqual({ gained: [], lost: [] });
  });
});

describe('formatList', () => {
  it('joins names naturally', () => {
    expect(formatList([])).toBe('');
    expect(formatList(['A'])).toBe('A');
    expect(formatList(['A', 'B'])).toBe('A and B');
    expect(formatList(['A', 'B', 'C'])).toBe('A, B and C');
  });
});
