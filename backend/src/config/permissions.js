// Explicit grants: cashier and warehouse are separate jobs, not a role hierarchy.
export const ROLE_PERMISSIONS = Object.freeze({
  CASHIER: ['pos', 'customers'],
  WAREHOUSE: ['catalog', 'categories', 'purchasing'],
  ADMIN: ['dashboard', 'catalog', 'pos', 'analytics', 'categories', 'purchasing', 'customers'],
  SUPERADMIN: ['dashboard', 'catalog', 'pos', 'analytics', 'categories', 'purchasing', 'customers', 'staff', 'settings']
});

export const hasPermission = (role, permission) =>
  Object.hasOwn(ROLE_PERMISSIONS, role) && ROLE_PERMISSIONS[role].includes(permission);
