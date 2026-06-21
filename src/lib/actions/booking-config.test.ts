import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth-helpers', () => ({
  requireAdmin: vi.fn(),
  requireUser: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import type { SupabaseClient, User } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth-helpers';
import {
  getBookingConfig,
  createDuration,
  removeDuration,
  reorderDurations,
  setSlotInterval,
  setCapacity,
  getWeeklyTemplate,
  setWeekdayHours,
  getMonthAvailability,
  applyTemplateToMonth,
  setDayAvailability,
} from './booking-config';

const mockRequireAdmin = vi.mocked(requireAdmin);

type Result = { data: unknown; error: { message: string; code?: string } | null };

// A chainable, awaitable Supabase query stub.
function makeQuery(result: Result) {
  const q: Record<string, unknown> = {};
  for (const m of [
    'select',
    'insert',
    'update',
    'delete',
    'upsert',
    'eq',
    'order',
    'limit',
    'gte',
    'lt',
  ]) {
    q[m] = vi.fn(() => q);
  }
  q.single = vi.fn(() => Promise.resolve(result));
  q.maybeSingle = vi.fn(() => Promise.resolve(result));
  q.then = (resolve: (r: Result) => unknown) => resolve(result);
  return q;
}

// Returns a fake client whose nth `from()` call resolves the nth supplied result.
function makeClient(resultsByCall: Result[]) {
  const calls: Array<{ table: string; q: Record<string, unknown> }> = [];
  const from = vi.fn((table: string) => {
    const result = resultsByCall[calls.length] ?? { data: null, error: null };
    const q = makeQuery(result);
    calls.push({ table, q });
    return q;
  });
  return { client: { from }, calls };
}

function asAdmin(client: unknown) {
  mockRequireAdmin.mockResolvedValue({
    supabase: client as SupabaseClient,
    user: { id: 'admin' } as User,
    error: null,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getBookingConfig', () => {
  it('returns durations ordered by position, capacity, and interval', async () => {
    const durations = [
      { id: 'd1', minutes: 30, position: 0 },
      { id: 'd2', minutes: 60, position: 1 },
    ];
    const { client, calls } = makeClient([
      { data: durations, error: null },
      { data: { capacity: 3, slot_interval_minutes: 15 }, error: null },
    ]);
    asAdmin(client);

    const result = await getBookingConfig();

    expect(result.error).toBeNull();
    expect(result.data).toEqual({ durations, capacity: 3, interval: 15 });
    expect(calls[0].table).toBe('booking_durations');
    expect(calls[0].q.order).toHaveBeenCalledWith('position', { ascending: true });
    expect(calls[1].table).toBe('booking_settings');
  });

  it('defaults capacity to 1, interval to 30, and durations to [] when nothing configured', async () => {
    const { client } = makeClient([
      { data: [], error: null },
      { data: null, error: { message: 'not found', code: 'PGRST116' } },
    ]);
    asAdmin(client);

    const result = await getBookingConfig();

    expect(result.error).toBeNull();
    expect(result.data).toEqual({ durations: [], capacity: 1, interval: 30 });
  });

  it('forbids non-admins', async () => {
    mockRequireAdmin.mockResolvedValue({
      supabase: {} as SupabaseClient,
      user: null,
      error: 'Forbidden: admin access required',
    });

    const result = await getBookingConfig();
    expect(result.data).toBeNull();
    expect(result.error).toBe('Forbidden: admin access required');
  });
});

describe('createDuration', () => {
  it('inserts minutes at the next position after the current max', async () => {
    const created = { id: 'd3', minutes: 90, position: 2 };
    const { client, calls } = makeClient([
      { data: { position: 1 }, error: null },
      { data: created, error: null },
    ]);
    asAdmin(client);

    const result = await createDuration({ minutes: 90 });

    expect(result.error).toBeNull();
    expect(result.data).toEqual(created);
    expect(calls[1].q.insert).toHaveBeenCalledWith({ minutes: 90, position: 2 });
  });

  it('uses position 0 for the first duration', async () => {
    const { client, calls } = makeClient([
      { data: null, error: null },
      { data: { id: 'd1', minutes: 30, position: 0 }, error: null },
    ]);
    asAdmin(client);

    await createDuration({ minutes: 30 });

    expect(calls[1].q.insert).toHaveBeenCalledWith({ minutes: 30, position: 0 });
  });

  it('rejects minutes < 1 without inserting', async () => {
    const { client, calls } = makeClient([{ data: null, error: null }]);
    asAdmin(client);

    const result = await createDuration({ minutes: 0 });

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
    expect(calls.length).toBe(0);
  });
});

describe('removeDuration', () => {
  it('deletes the duration by id', async () => {
    const { client, calls } = makeClient([{ data: null, error: null }]);
    asAdmin(client);

    const result = await removeDuration('d1');

    expect(result.error).toBeNull();
    expect(result.data).toEqual({ id: 'd1' });
    expect(calls[0].q.delete).toHaveBeenCalled();
    expect(calls[0].q.eq).toHaveBeenCalledWith('id', 'd1');
  });
});

describe('reorderDurations', () => {
  const uuidA = '11111111-1111-4111-8111-111111111111';
  const uuidB = '22222222-2222-4222-8222-222222222222';

  it('writes each id position by index and returns the reordered list', async () => {
    const reordered = [
      { id: uuidB, minutes: 60, position: 0 },
      { id: uuidA, minutes: 30, position: 1 },
    ];
    const { client, calls } = makeClient([
      { data: null, error: null }, // update B -> 0
      { data: null, error: null }, // update A -> 1
      { data: reordered, error: null }, // re-read
    ]);
    asAdmin(client);

    const result = await reorderDurations({ ordered_ids: [uuidB, uuidA] });

    expect(result.error).toBeNull();
    expect(result.data).toEqual(reordered);
    expect(calls[0].q.update).toHaveBeenCalledWith({ position: 0 });
    expect(calls[0].q.eq).toHaveBeenCalledWith('id', uuidB);
    expect(calls[1].q.update).toHaveBeenCalledWith({ position: 1 });
    expect(calls[1].q.eq).toHaveBeenCalledWith('id', uuidA);
    expect(calls[2].q.order).toHaveBeenCalledWith('position', { ascending: true });
  });

  it('rejects an empty order without writing', async () => {
    const { client, calls } = makeClient([{ data: null, error: null }]);
    asAdmin(client);

    const result = await reorderDurations({ ordered_ids: [] });

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
    expect(calls.length).toBe(0);
  });
});

describe('setSlotInterval', () => {
  it('upserts slot_interval_minutes and returns interval', async () => {
    const { client, calls } = makeClient([{ data: { slot_interval_minutes: 15 }, error: null }]);
    asAdmin(client);

    const result = await setSlotInterval({ interval: 15 });

    expect(result.error).toBeNull();
    expect(result.data).toEqual({ interval: 15 });
    expect(calls[0].table).toBe('booking_settings');
    expect(calls[0].q.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, slot_interval_minutes: 15 }),
    );
  });

  it.each([4, 241, 'abc'])('rejects invalid interval %p without writing', async (bad) => {
    const { client, calls } = makeClient([{ data: null, error: null }]);
    asAdmin(client);

    const result = await setSlotInterval({ interval: bad });

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
    expect(calls.length).toBe(0);
  });
});

describe('setCapacity', () => {
  it('upserts the singleton row with the new capacity', async () => {
    const { client, calls } = makeClient([{ data: { capacity: 5 }, error: null }]);
    asAdmin(client);

    const result = await setCapacity({ capacity: 5 });

    expect(result.error).toBeNull();
    expect(result.data).toEqual({ capacity: 5 });
    expect(calls[0].table).toBe('booking_settings');
    expect(calls[0].q.upsert).toHaveBeenCalledWith(expect.objectContaining({ id: 1, capacity: 5 }));
  });

  it('coerces a numeric string from a form input', async () => {
    const { client, calls } = makeClient([{ data: { capacity: 3 }, error: null }]);
    asAdmin(client);

    const result = await setCapacity({ capacity: '3' });

    expect(result.error).toBeNull();
    expect(calls[0].q.upsert).toHaveBeenCalledWith(expect.objectContaining({ capacity: 3 }));
  });

  it.each([0, -1, 1.5, 'abc'])('rejects invalid capacity %p without writing', async (bad) => {
    const { client, calls } = makeClient([{ data: null, error: null }]);
    asAdmin(client);

    const result = await setCapacity({ capacity: bad });

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
    expect(calls.length).toBe(0);
  });
});

describe('getWeeklyTemplate', () => {
  it('returns weekday rows ordered by weekday', async () => {
    const rows = [
      { weekday: 1, is_open: true, open_time: '09:00', close_time: '17:00' },
      { weekday: 2, is_open: false, open_time: null, close_time: null },
    ];
    const { client, calls } = makeClient([{ data: rows, error: null }]);
    asAdmin(client);

    const result = await getWeeklyTemplate();

    expect(result.error).toBeNull();
    expect(result.data).toEqual(rows);
    expect(calls[0].table).toBe('booking_weekly_template');
    expect(calls[0].q.order).toHaveBeenCalledWith('weekday', { ascending: true });
  });
});

describe('setWeekdayHours', () => {
  it('updates an open weekday with hours', async () => {
    const updated = { weekday: 1, is_open: true, open_time: '09:00', close_time: '17:00' };
    const { client, calls } = makeClient([{ data: updated, error: null }]);
    asAdmin(client);

    const result = await setWeekdayHours({
      weekday: 1,
      is_open: true,
      open_time: '09:00',
      close_time: '17:00',
    });

    expect(result.error).toBeNull();
    expect(result.data).toEqual(updated);
    expect(calls[0].q.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_open: true, open_time: '09:00', close_time: '17:00' }),
    );
    expect(calls[0].q.eq).toHaveBeenCalledWith('weekday', 1);
  });

  it('nulls times when is_open is false', async () => {
    const updated = { weekday: 0, is_open: false, open_time: null, close_time: null };
    const { client, calls } = makeClient([{ data: updated, error: null }]);
    asAdmin(client);

    await setWeekdayHours({ weekday: 0, is_open: false, open_time: null, close_time: null });

    expect(calls[0].q.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_open: false, open_time: null, close_time: null }),
    );
  });
});

describe('getMonthAvailability', () => {
  it('queries the correct date range for a given month', async () => {
    const rows = [{ date: '2025-03-01', is_open: true, open_time: '09:00', close_time: '17:00' }];
    const { client, calls } = makeClient([{ data: rows, error: null }]);
    asAdmin(client);

    const result = await getMonthAvailability('2025-03');

    expect(result.error).toBeNull();
    expect(result.data).toEqual(rows);
    expect(calls[0].q.gte).toHaveBeenCalledWith('date', '2025-03-01');
    expect(calls[0].q.lt).toHaveBeenCalledWith('date', '2025-04-01');
  });

  it('handles December → January boundary correctly', async () => {
    const { client, calls } = makeClient([{ data: [], error: null }]);
    asAdmin(client);

    await getMonthAvailability('2025-12');

    expect(calls[0].q.gte).toHaveBeenCalledWith('date', '2025-12-01');
    expect(calls[0].q.lt).toHaveBeenCalledWith('date', '2026-01-01');
  });

  it('rejects invalid month format', async () => {
    const { client } = makeClient([{ data: null, error: null }]);
    asAdmin(client);

    const result = await getMonthAvailability('2025/03');

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });
});

describe('setDayAvailability', () => {
  it('upserts a day row by date', async () => {
    const row = { date: '2025-03-15', is_open: true, open_time: '09:00', close_time: '17:00' };
    const { client, calls } = makeClient([{ data: row, error: null }]);
    asAdmin(client);

    const result = await setDayAvailability({
      date: '2025-03-15',
      is_open: true,
      open_time: '09:00',
      close_time: '17:00',
    });

    expect(result.error).toBeNull();
    expect(result.data).toEqual(row);
    expect(calls[0].q.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ date: '2025-03-15', is_open: true }),
      { onConflict: 'date' },
    );
  });

  it('rejects when open_time >= close_time', async () => {
    const { client, calls } = makeClient([{ data: null, error: null }]);
    asAdmin(client);

    const result = await setDayAvailability({
      date: '2025-03-15',
      is_open: true,
      open_time: '17:00',
      close_time: '09:00',
    });

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
    expect(calls.length).toBe(0);
  });
});

describe('applyTemplateToMonth', () => {
  it('skips closed weekdays and uses ignoreDuplicates', async () => {
    // template: Mon open, Tue closed
    const template = [
      { weekday: 1, is_open: true, open_time: '09:00', close_time: '17:00' },
      { weekday: 2, is_open: false, open_time: null, close_time: null },
    ];
    const { client, calls } = makeClient([
      { data: template, error: null },
      { data: null, error: null },
    ]);
    asAdmin(client);

    const result = await applyTemplateToMonth('2025-01');

    expect(result.error).toBeNull();
    // January 2025 has 5 Mondays → 5 rows written
    expect(result.data?.written).toBe(5);
    expect(calls[1].q.upsert).toHaveBeenCalledWith(expect.any(Array), {
      onConflict: 'date',
      ignoreDuplicates: true,
    });
  });
});
