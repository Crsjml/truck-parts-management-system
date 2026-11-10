import { describe, it, expect, vi } from 'vitest';

const findUnique = vi.hoisted(() => vi.fn());
vi.mock('../../config/prisma.js', () => ({ prisma: { staffRole: { findUnique } } }));
vi.mock('../../config/supabase.js', () => ({ supabase: { auth: { getUser: vi.fn() } } }));

const parts = (await import('../parts.js')).default;
const categories = (await import('../categories.js')).default;
const purchases = (await import('../purchaseOrders.js')).default;
const suppliers = (await import('../suppliers.js')).default;
const customers = (await import('../customers.js')).default;
const transactions = (await import('../transactions.js')).default;
const staff = (await import('../staffRoutes.js')).default;
const settings = (await import('../settings_routes.js')).default;

const protectedRoutes = [
  ['parts', parts, 'catalog', route => !route.methods.get || route.path.includes('adjustments')],
  ['categories', categories, 'categories', route => !route.methods.get],
  ['purchases', purchases, 'purchasing', () => true],
  ['suppliers', suppliers, 'purchasing', () => true],
  ['customers', customers, 'customers', route => route.path !== '/me' && !route.path.startsWith('/saved-parts')],
  ['transactions', transactions, 'pos', route => route.path !== '/mine'],
  ['staff', staff, 'staff', route => route.path !== '/check'],
  ['settings', settings, 'settings', route => route.path === '/' && !route.methods.get],
  ['settings', settings, 'pos', route => route.path === '/override-pin/verify']
];
const allowed = {
  CASHIER: ['pos', 'customers'],
  WAREHOUSE: ['catalog', 'categories', 'purchasing'],
  ADMIN: ['catalog', 'categories', 'purchasing', 'customers', 'pos'],
  SUPERADMIN: ['catalog', 'categories', 'purchasing', 'customers', 'pos', 'staff', 'settings']
};

describe('admin endpoint access', () => {
  for (const [name, router, permission, include] of protectedRoutes) {
    const routes = router.stack.filter(entry => entry.route && include(entry.route));
    for (const { route } of routes) {
      for (const [role, grants] of Object.entries(allowed)) {
        const method = Object.keys(route.methods)[0];
        it(`${role}: ${method} ${name}${route.path}`, async () => {
          findUnique.mockResolvedValue({ id: 'staff-1', email: 'staff@ttp.test', role });
          const next = vi.fn();
          const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
          // Execute the real authorization middleware, before any controller or validation.
          await route.stack[1].handle({ auth: { email: 'staff@ttp.test' } }, res, next);
          if (grants.includes(permission)) expect(next).toHaveBeenCalledOnce();
          else {
            expect(res.status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
          }
        });
      }
    }
  }

  it('does not let a customer check another person’s staff role', async () => {
    const route = staff.stack.find(entry => entry.route?.path === '/check').route;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await route.stack[1].handle({ auth: { email: 'customer@ttp.test' }, body: { email: 'owner@ttp.test' } }, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
