export const STAFF_ROLES = [
  { value: 'CASHIER', label: 'Cashier', description: 'Sales POS and customer management', pages: ['pos', 'customers'] },
  { value: 'WAREHOUSE', label: 'Warehouse', description: 'Parts inventory, categories and purchasing', pages: ['catalog', 'categories', 'purchasing'] },
  { value: 'ADMIN', label: 'Admin', description: 'All operational pages and sales analytics', pages: ['dashboard', 'catalog', 'pos', 'analytics', 'categories', 'purchasing', 'customers'] },
  { value: 'SUPERADMIN', label: 'Superadmin', description: 'Full access, including staff and system settings', pages: ['dashboard', 'catalog', 'pos', 'analytics', 'categories', 'purchasing', 'customers', 'staff', 'settings'] }
];

// Cashier and Warehouse are peers; each tier up reaches more of the shop.
const ROLE_TIER = { CASHIER: 1, WAREHOUSE: 1, ADMIN: 2, SUPERADMIN: 3 };

// A promotion widens what someone can do, so it is confirmed before saving.
export const isPromotion = (from, to) => (ROLE_TIER[to] ?? 0) > (ROLE_TIER[from] ?? 0);

export const canAccessPage = (role, page) => {
  const access = STAFF_ROLES.find(item => item.value === role);
  return Boolean(access && (page === 'account' || access.pages.includes(page)));
};

export const defaultStaffPage = (role) => STAFF_ROLES.find(item => item.value === role)?.pages[0] ?? null;
export const staffRoleLabel = (role) => STAFF_ROLES.find(item => item.value === role)?.label ?? 'Unknown role';
