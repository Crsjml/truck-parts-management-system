import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn()
}));
vi.mock('../../config/prisma.js', () => ({ prisma: { staffRole: db } }));
vi.mock('../../config/supabase.js', () => ({ supabase: { auth: { getUser: vi.fn() } } }));

const staff = (await import('../staffRoutes.js')).default;

// Run only the route's own handler (auth/role middleware is covered in access.test.js).
const call = async (method, path, req) => {
  const route = staff.stack.find(e => e.route?.path === path && e.route.methods[method]).route;
  const handler = route.stack[route.stack.length - 1].handle;
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  await handler({ auth: { email: 'owner@ttp.test' }, params: {}, body: {}, ...req }, res);
  return res;
};
const VALID_ID = '7cbb7e1f-aacf-4ea5-be6e-581c894e421d';

describe('staff routes input validation', () => {
  beforeEach(() => {
    Object.values(db).forEach(fn => fn.mockReset());
    db.create.mockImplementation(async ({ data }) => ({ id: VALID_ID, ...data }));
  });

  it('trims and lowercases the email before saving', async () => {
    const res = await call('post', '/', { body: { email: '  Juan.Cruz@Example.COM ', role: 'CASHIER' } });

    expect(db.findUnique).toHaveBeenCalledWith({ where: { email: 'juan.cruz@example.com' } });
    expect(db.create).toHaveBeenCalledWith({ data: expect.objectContaining({ email: 'juan.cruz@example.com' }) });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it.each(['not-an-email', 'a@b', '   ', 'two words@x.com'])('rejects an invalid email %j with 400', async (email) => {
    const res = await call('post', '/', { body: { email, role: 'CASHIER' } });

    expect(res.status).toHaveBeenCalledWith(400);
    expect(db.create).not.toHaveBeenCalled();
  });

  it.each([['put', { role: 'ADMIN' }], ['delete', {}]])('returns 404 (not 500) for a malformed id on %s', async (method, body) => {
    const res = await call(method, '/:id', { params: { id: 'not-a-uuid' }, body });

    expect(res.status).toHaveBeenCalledWith(404);
    expect(db.findUnique).not.toHaveBeenCalled();
  });
});
