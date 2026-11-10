import { beforeEach, describe, expect, it, vi } from 'vitest';

const setting = vi.hoisted(() => ({ findFirst: vi.fn(), create: vi.fn(), update: vi.fn() }));
vi.mock('../../config/prisma.js', () => ({ prisma: { setting, staffRole: { findUnique: vi.fn() } } }));
vi.mock('../../config/supabase.js', () => ({ supabase: { auth: { getUser: vi.fn() } } }));

const settings = (await import('../settings_routes.js')).default;

const putSettings = async (body) => {
  const route = settings.stack.find(e => e.route?.path === '/' && e.route.methods.post).route;
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  await route.stack[route.stack.length - 1].handle({ auth: { email: 'owner@ttp.test' }, body }, res);
  return res;
};

describe('POST /api/settings markup validation', () => {
  beforeEach(() => {
    Object.values(setting).forEach(fn => fn.mockReset());
    setting.findFirst.mockResolvedValue({ id: 's1', base_currency: 'PHP', active_markup: 20 });
    setting.update.mockImplementation(async ({ data }) => ({ id: 's1', base_currency: 'PHP', active_markup: 20, ...data }));
  });

  it('accepts a decimal markup within range', async () => {
    await putSettings({ active_markup: 12.5 });
    expect(setting.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ active_markup: 12.5 }) }));
  });

  it('saves a markup within 0–100', async () => {
    const res = await putSettings({ active_markup: 25 });
    expect(setting.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ active_markup: 25 }) }));
    expect(res.status).not.toHaveBeenCalledWith(400);
  });

  it.each([-5, 101, 'abc', null, '', true])('rejects markup %j with 400 and saves nothing', async (value) => {
    const res = await putSettings({ active_markup: value });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(setting.update).not.toHaveBeenCalled();
    expect(setting.create).not.toHaveBeenCalled();
  });
});
