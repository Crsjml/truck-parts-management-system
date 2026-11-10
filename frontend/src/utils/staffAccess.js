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

// Page names as the sidebar shows them, for copy that explains access changes.
const PAGE_NAMES = {
  dashboard: 'Dashboard',
  catalog: 'Parts Inventory',
  pos: 'Sales POS',
  analytics: 'Sales Analytics',
  categories: 'Categories',
  purchasing: 'Purchasing',
  customers: 'Customers',
  staff: 'Staff Management',
  settings: 'System Settings'
};

const rolePages = (role) => STAFF_ROLES.find(item => item.value === role)?.pages ?? [];

// Pages someone gains and loses when moved from one role to another.
export const accessDiff = (from, to) => {
  const before = rolePages(from);
  const after = rolePages(to);
  return {
    gained: after.filter(page => !before.includes(page)).map(page => PAGE_NAMES[page]),
    lost: before.filter(page => !after.includes(page)).map(page => PAGE_NAMES[page])
  };
};

// Every page a role opens, by sidebar name, e.g. for "they lose access to …".
export const rolePageNames = (role) => rolePages(role).map(page => PAGE_NAMES[page]);

// "A", "A and B", "A, B and C".
export const formatList = (items) =>
  items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
