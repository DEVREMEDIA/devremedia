import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpc = vi.fn();
vi.mock('@/lib/auth-helpers', () => ({
  requireUser: vi.fn(async () => ({ supabase: { rpc }, user: { id: 'u1' }, error: null })),
}));
vi.mock('@/lib/notification-helpers', () => ({
  getAdminUserIds: vi.fn(async () => []),
  createNotificationForMany: vi.fn(async () => {}),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { bookFilming } from './book-slot';

const valid = { date: '2026-07-01', start_time: '09:00', duration_minutes: 60 };

beforeEach(() => rpc.mockReset());

describe('bookFilming', () => {
  it('returns the new id on success', async () => {
    rpc.mockResolvedValue({ data: 'hold-1', error: null });
    const r = await bookFilming(valid);
    expect(r).toEqual({ data: { id: 'hold-1' }, error: null });
    expect(rpc).toHaveBeenCalledWith('book_filming', {
      p_date: '2026-07-01',
      p_start: '09:00',
      p_duration: 60,
      p_location: undefined,
      p_note: undefined,
    });
  });
  it('maps capacity_full to a friendly message', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'capacity_full' } });
    expect((await bookFilming(valid)).error).toMatch(/no longer available/i);
  });
  it('maps outside_hours and day_closed', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'outside_hours' } });
    expect((await bookFilming(valid)).error).toMatch(/outside/i);
    rpc.mockResolvedValue({ data: null, error: { message: 'day_closed' } });
    expect((await bookFilming(valid)).error).toMatch(/closed/i);
  });
  it('rejects an invalid window at the schema boundary', async () => {
    expect(
      (await bookFilming({ date: 'nope', start_time: '99:99', duration_minutes: 0 })).error,
    ).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });
});
