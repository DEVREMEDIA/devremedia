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
  createTimeSlot,
  renameTimeSlot,
  removeTimeSlot,
  reorderTimeSlots,
  setCapacity,
} from './booking-config';

const mockRequireAdmin = vi.mocked(requireAdmin);

type Result = { data: unknown; error: { message: string; code?: string } | null };

// A chainable, awaitable Supabase query stub. Every builder method returns the
// same object; awaiting it (or calling single/maybeSingle) resolves `result`.
function makeQuery(result: Result) {
  const q: Record<string, unknown> = {};
  for (const m of ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'order', 'limit']) {
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
  it('returns time slots ordered by position and the capacity', async () => {
    const slots = [
      { id: 's1', name: 'Πρωί', position: 0 },
      { id: 's2', name: 'Απόγευμα', position: 1 },
    ];
    const { client, calls } = makeClient([
      { data: slots, error: null },
      { data: { capacity: 3 }, error: null },
    ]);
    asAdmin(client);

    const result = await getBookingConfig();

    expect(result.error).toBeNull();
    expect(result.data).toEqual({ time_slots: slots, capacity: 3 });
    expect(calls[0].table).toBe('booking_time_slots');
    expect(calls[0].q.order).toHaveBeenCalledWith('position', { ascending: true });
    expect(calls[1].table).toBe('booking_settings');
  });

  it('defaults capacity to 1 and slots to [] when nothing is configured yet', async () => {
    const { client } = makeClient([
      { data: [], error: null },
      { data: null, error: { message: 'not found', code: 'PGRST116' } },
    ]);
    asAdmin(client);

    const result = await getBookingConfig();

    expect(result.error).toBeNull();
    expect(result.data).toEqual({ time_slots: [], capacity: 1 });
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

describe('createTimeSlot', () => {
  it('inserts a trimmed name at the next position after the current max', async () => {
    const created = { id: 's3', name: 'Βράδυ', position: 2 };
    const { client, calls } = makeClient([
      { data: { position: 1 }, error: null },
      { data: created, error: null },
    ]);
    asAdmin(client);

    const result = await createTimeSlot({ name: '  Βράδυ  ' });

    expect(result.error).toBeNull();
    expect(result.data).toEqual(created);
    expect(calls[1].q.insert).toHaveBeenCalledWith({ name: 'Βράδυ', position: 2 });
  });

  it('uses position 0 for the first slot', async () => {
    const { client, calls } = makeClient([
      { data: null, error: null },
      { data: { id: 's1', name: 'Πρωί', position: 0 }, error: null },
    ]);
    asAdmin(client);

    await createTimeSlot({ name: 'Πρωί' });

    expect(calls[1].q.insert).toHaveBeenCalledWith({ name: 'Πρωί', position: 0 });
  });

  it('rejects an empty name without inserting', async () => {
    const { client, calls } = makeClient([{ data: null, error: null }]);
    asAdmin(client);

    const result = await createTimeSlot({ name: '   ' });

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
    expect(calls.length).toBe(0);
  });
});

describe('renameTimeSlot', () => {
  it('updates the slot name by id', async () => {
    const updated = { id: 's1', name: 'Νέο', position: 0 };
    const { client, calls } = makeClient([{ data: updated, error: null }]);
    asAdmin(client);

    const result = await renameTimeSlot('s1', { name: '  Νέο  ' });

    expect(result.error).toBeNull();
    expect(result.data).toEqual(updated);
    expect(calls[0].q.update).toHaveBeenCalledWith({ name: 'Νέο' });
    expect(calls[0].q.eq).toHaveBeenCalledWith('id', 's1');
  });

  it('rejects an empty name without updating', async () => {
    const { client, calls } = makeClient([{ data: null, error: null }]);
    asAdmin(client);

    const result = await renameTimeSlot('s1', { name: '' });

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
    expect(calls.length).toBe(0);
  });
});

describe('removeTimeSlot', () => {
  it('deletes the slot by id', async () => {
    const { client, calls } = makeClient([{ data: null, error: null }]);
    asAdmin(client);

    const result = await removeTimeSlot('s1');

    expect(result.error).toBeNull();
    expect(result.data).toEqual({ id: 's1' });
    expect(calls[0].q.delete).toHaveBeenCalled();
    expect(calls[0].q.eq).toHaveBeenCalledWith('id', 's1');
  });
});

describe('reorderTimeSlots', () => {
  const uuidA = '11111111-1111-4111-8111-111111111111';
  const uuidB = '22222222-2222-4222-8222-222222222222';

  it('writes each id position by index and returns the reordered list', async () => {
    const reordered = [
      { id: uuidB, name: 'Απόγευμα', position: 0 },
      { id: uuidA, name: 'Πρωί', position: 1 },
    ];
    const { client, calls } = makeClient([
      { data: null, error: null }, // update B -> 0
      { data: null, error: null }, // update A -> 1
      { data: reordered, error: null }, // re-read
    ]);
    asAdmin(client);

    const result = await reorderTimeSlots({ ordered_ids: [uuidB, uuidA] });

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

    const result = await reorderTimeSlots({ ordered_ids: [] });

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
