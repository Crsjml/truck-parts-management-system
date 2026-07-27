// backend/src/middleware/__tests__/authMiddleware.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

const findUnique = vi.fn();

vi.mock('../../config/prisma.js', () => ({
  prisma: { staffRole: { findUnique: (...args) => findUnique(...args) } }
}));

vi.mock('../../config/supabase.js', () => ({
  supabase: { auth: { getUser: vi.fn() } }
}));

const { requireRole } = await import('../authMiddleware.js');

const mockRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

describe('requireRole', () => {
  beforeEach(() => {
    findUnique.mockReset();
  });

  it('returns 401 when the request is not authenticated', async () => {
    const res = mockRes();
    const next = vi.fn();

    await requireRole('ADMIN')({}, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when the email has no staff row', async () => {
    findUnique.mockResolvedValue(null);
    const res = mockRes();
    const next = vi.fn();

    await requireRole('ADMIN')({ auth: { email: 'nobody@ttp.com' } }, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows an ADMIN through an ADMIN gate', async () => {
    findUnique.mockResolvedValue({ id: '1', email: 'a@ttp.com', role: 'ADMIN' });
    const req = { auth: { email: 'a@ttp.com' } };
    const res = mockRes();
    const next = vi.fn();

    await requireRole('ADMIN')(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.staff.role).toBe('ADMIN');
  });

  it('blocks an ADMIN at a SUPERADMIN gate', async () => {
    findUnique.mockResolvedValue({ id: '1', email: 'a@ttp.com', role: 'ADMIN' });
    const res = mockRes();
    const next = vi.fn();

    await requireRole('SUPERADMIN')({ auth: { email: 'a@ttp.com' } }, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows a SUPERADMIN through both gates', async () => {
    findUnique.mockResolvedValue({ id: '2', email: 's@ttp.com', role: 'SUPERADMIN' });

    for (const gate of ['ADMIN', 'SUPERADMIN']) {
      const res = mockRes();
      const next = vi.fn();
      await requireRole(gate)({ auth: { email: 's@ttp.com' } }, res, next);
      expect(next).toHaveBeenCalled();
    }
  });

  it('lowercases the email before lookup', async () => {
    findUnique.mockResolvedValue({ id: '1', email: 'a@ttp.com', role: 'ADMIN' });

    await requireRole('ADMIN')({ auth: { email: 'A@TTP.com' } }, mockRes(), vi.fn());

    expect(findUnique).toHaveBeenCalledWith({ where: { email: 'a@ttp.com' } });
  });

  it('returns 500 when the lookup throws', async () => {
    findUnique.mockRejectedValue(new Error('db down'));
    const res = mockRes();
    const next = vi.fn();

    await requireRole('ADMIN')({ auth: { email: 'a@ttp.com' } }, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(next).not.toHaveBeenCalled();
  });
});
