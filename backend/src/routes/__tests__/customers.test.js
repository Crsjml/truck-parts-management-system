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
  requireRole: () => (_req, _res, next) => next()
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
});
