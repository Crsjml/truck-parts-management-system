import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const customerFindMany = vi.fn();
const customerFindUnique = vi.fn();
const transactionFindMany = vi.fn();

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    customer: {
      findMany: (...args) => customerFindMany(...args),
      findUnique: (...args) => customerFindUnique(...args)
    },
    transaction: {
      findMany: (...args) => transactionFindMany(...args)
    }
  }
}));

vi.mock('../../middleware/authMiddleware.js', () => ({
  requireAuth: (req, _res, next) => {
    req.auth = { userId: 'admin-1', email: 'admin@ttp.test' };
    next();
  },
  requirePermission: () => (_req, _res, next) => next()
}));

const customersRouter = (await import('../customers.js')).default;

const mockRes = () => {
  const res = {};
  res.statusCode = 200;
  res.status = vi.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = vi.fn((body) => {
    res.body = body;
    return res;
  });
  return res;
};

const invokeRoute = async (method, path, req = {}) => {
  const layer = customersRouter.stack.find((entry) => (
    entry.route?.path === path && entry.route?.methods?.[method]
  ));
  if (!layer) throw new Error(`Route not found: ${method.toUpperCase()} ${path}`);

  const res = mockRes();
  const handlers = layer.route.stack.map((entry) => entry.handle);

  for (const handler of handlers) {
    let nextCalled = false;
    await handler(
      { params: {}, query: {}, body: {}, ...req },
      res,
      () => { nextCalled = true; }
    );
    if (res.body !== undefined || (!nextCalled && handler.length >= 3)) break;
  }

  return { status: res.statusCode, body: res.body };
};

describe('customers admin routes', () => {
  beforeEach(() => {
    customerFindMany.mockReset();
    customerFindUnique.mockReset();
    transactionFindMany.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('counts temp walk-in customer transactions once in the admin customer summary', async () => {
    customerFindMany.mockResolvedValue([
      {
        id: 'customer-1',
        authId: 'temp-abc',
        email: 'driver@example.com',
        displayName: 'Driver One',
        companyName: '',
        phoneNumber: '09171234567',
        createdAt: '2026-08-01T00:00:00.000Z'
      }
    ]);
    transactionFindMany.mockResolvedValue([
      {
        userId: 'temp-abc',
        total: 1500,
        transactionDate: '2026-08-04T00:00:00.000Z',
        customerName: 'Driver One',
        customerContact: '09171234567',
        customerEmail: 'driver@example.com'
      }
    ]);

    const { status, body } = await invokeRoute('get', '/');

    expect(status).toBe(200);
    expect(body.ftf).toHaveLength(1);
    expect(body.ftf[0]).toMatchObject({
      id: 'customer-1',
      authId: 'temp-abc',
      orderCount: 1,
      totalSpend: 1500
    });
  });

  it('limits synthetic FTF purchase history by email to walk-in transactions', async () => {
    transactionFindMany.mockResolvedValue([]);

    const { status } = await invokeRoute('get', '/:id/transactions', {
      params: { id: 'driver@example.com' }
    });

    expect(status).toBe(200);
    expect(transactionFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        AND: [
          { customerEmail: { equals: 'driver@example.com', mode: 'insensitive' } },
          {
            OR: [
              { userId: null },
              { userId: { startsWith: 'temp-' } }
            ]
          }
        ]
      }
    }));
  });

  it('uses the same stored walk-in identity for summary counts and purchase history', async () => {
    customerFindUnique.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      authId: 'temp-ftf-driver',
      email: 'driver@example.com',
      displayName: 'Driver One',
      phoneNumber: '09171234567'
    });
    transactionFindMany.mockResolvedValue([]);

    const { status } = await invokeRoute('get', '/:id/transactions', {
      params: { id: '11111111-1111-4111-8111-111111111111' }
    });

    expect(status).toBe(200);
    expect(transactionFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        OR: [
          { userId: 'temp-ftf-driver' },
          {
            AND: [
              { customerEmail: { equals: 'driver@example.com', mode: 'insensitive' } },
              {
                OR: [
                  { userId: null },
                  { userId: { startsWith: 'temp-' } }
                ]
              }
            ]
          }
        ]
      }
    }));
  });

  describe('cancelled orders in the customer summary', () => {
    const baseTx = {
      customerName: 'Driver One', customerContact: '09171234567', customerEmail: 'driver@example.com'
    };

    it('leaves cancelled orders out of order count, spend and last order date', async () => {
      customerFindMany.mockResolvedValue([
        { id: 'c1', authId: 'auth-1', email: 'a@example.com', displayName: 'Online', createdAt: '2026-08-01T00:00:00.000Z' },
        { id: 'c2', authId: 'temp-abc', email: 'driver@example.com', displayName: 'Driver One', phoneNumber: '09171234567', createdAt: '2026-08-01T00:00:00.000Z' }
      ]);
      transactionFindMany.mockResolvedValue([
        { ...baseTx, userId: 'auth-1', total: 100, status: 'COMPLETED', transactionDate: '2026-08-02T00:00:00.000Z' },
        { ...baseTx, userId: 'auth-1', total: 900, status: 'CANCELLED', transactionDate: '2026-08-09T00:00:00.000Z' },
        { ...baseTx, userId: 'temp-abc', total: 200, status: 'COMPLETED', transactionDate: '2026-08-03T00:00:00.000Z' },
        { ...baseTx, userId: 'temp-abc', total: 800, status: 'Cancelled', transactionDate: '2026-08-10T00:00:00.000Z' }
      ]);

      const { body } = await invokeRoute('get', '/');

      expect(body.online[0]).toMatchObject({ orderCount: 1, totalSpend: 100, lastOrderDate: '2026-08-02T00:00:00.000Z' });
      expect(body.ftf[0]).toMatchObject({ orderCount: 1, totalSpend: 200, lastOrderDate: '2026-08-03T00:00:00.000Z' });
    });

    it('still lists a walk-in whose only order was cancelled, with zero orders and spend', async () => {
      customerFindMany.mockResolvedValue([]);
      transactionFindMany.mockResolvedValue([
        { ...baseTx, userId: null, total: 500, status: 'CANCELLED', transactionDate: '2026-08-05T00:00:00.000Z' }
      ]);

      const { body } = await invokeRoute('get', '/');

      expect(body.ftf).toHaveLength(1);
      expect(body.ftf[0]).toMatchObject({ orderCount: 0, totalSpend: 0, lastOrderDate: null });
    });
  });
});
