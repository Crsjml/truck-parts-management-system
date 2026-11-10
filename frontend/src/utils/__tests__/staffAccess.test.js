import { describe, it, expect } from 'vitest';
import { STAFF_ROLES, canAccessPage } from '../staffAccess';
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
