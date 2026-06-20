import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth-helpers', () => ({
  requireAdmin: vi.fn(),
}));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/actions/notifications', () => ({
  createNotification: vi.fn(() => Promise.resolve()),
  getClientUserIdFromClientId: vi.fn(() => Promise.resolve('client-user-1')),
}));

import type { SupabaseClient, User } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth-helpers';
import { createNotification, getClientUserIdFromClientId } from '@/lib/actions/notifications';
import { approveHold, rejectHold } from './filming-requests';

const mockRequireAdmin = vi.mocked(requireAdmin);
const mockCreateNotification = vi.mocked(createNotification);

const HOLD = {
  id: 'hold-1',
  client_id: 'client-1',
  title: 'Booking 2099-03-10',
  description: 'Bring the drone',
  booking_date: '2099-03-10',
  slot_id: 'slot-1',
  location: 'Studio A',
  status: 'pending',
  project_type: null,
  converted_project_id: null,
};

/**
 * A chainable Supabase mock. `single()` resolves a per-table "row" result, while
 * awaiting the chain directly (e.g. update().eq()) resolves a per-table "write"
 * result — this lets one table back both a fetch and an update.
 */
function makeSupabase(tables: Record<string, { row?: unknown; write?: unknown }>) {
  const calls: Record<string, { inserts: unknown[]; updates: unknown[] }> = {};
  const from = vi.fn((table: string) => {
    calls[table] ??= { inserts: [], updates: [] };
    const write = tables[table]?.write ?? { error: null };
    const row = tables[table]?.row ?? { data: null, error: null };
    const chain: Record<string, unknown> = {
      select: vi.fn(() => chain),
      insert: vi.fn((v: unknown) => {
        calls[table].inserts.push(v);
        return chain;
      }),
      update: vi.fn((v: unknown) => {
        calls[table].updates.push(v);
        return chain;
      }),
      eq: vi.fn(() => chain),
      single: vi.fn(() => Promise.resolve(row)),
      maybeSingle: vi.fn(() => Promise.resolve(row)),
      then: (resolve: (v: unknown) => unknown) => resolve(write),
    };
    return chain;
  });
  return { client: { from } as unknown as SupabaseClient, from, calls };
}

function asAdmin(client: SupabaseClient) {
  mockRequireAdmin.mockResolvedValue({
    supabase: client,
    user: { id: 'admin-1' } as User,
    error: null,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('approveHold', () => {
  it('creates one Production from the Hold, confirms it, and notifies the client', async () => {
    const { client, calls } = makeSupabase({
      filming_requests: { row: { data: HOLD, error: null } },
      booking_time_slots: { row: { data: { name: 'Morning' }, error: null } },
      projects: { row: { data: { id: 'project-1', client_id: 'client-1' }, error: null } },
    });
    asAdmin(client);

    const result = await approveHold('hold-1');

    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({ id: 'project-1' });

    // One Production created per Filming, carrying the Hold's date + location.
    expect(calls.projects.inserts).toHaveLength(1);
    expect(calls.projects.inserts[0]).toMatchObject({
      client_id: 'client-1',
      filming_date: '2099-03-10',
      location: 'Studio A',
    });

    // The Hold is confirmed (status 'converted' still counts toward Capacity/Allowance).
    expect(calls.filming_requests.updates[0]).toMatchObject({
      status: 'converted',
      converted_project_id: 'project-1',
    });

    expect(getClientUserIdFromClientId).toHaveBeenCalledWith('client-1');
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'client-user-1' }),
    );
  });

  it('puts the confirmed Filming on the calendar', async () => {
    const { client, calls } = makeSupabase({
      filming_requests: { row: { data: HOLD, error: null } },
      booking_time_slots: { row: { data: { name: 'Morning' }, error: null } },
      projects: { row: { data: { id: 'project-1', client_id: 'client-1' }, error: null } },
    });
    asAdmin(client);

    await approveHold('hold-1');

    expect(calls.calendar_events.inserts).toHaveLength(1);
    expect(calls.calendar_events.inserts[0]).toMatchObject({
      event_type: 'filming',
      start_date: '2099-03-10',
    });
  });
});

describe('Hold resolution guards', () => {
  it('approveHold forbids non-admin callers', async () => {
    mockRequireAdmin.mockResolvedValue({
      supabase: {} as SupabaseClient,
      user: null,
      error: 'Forbidden: admin access required',
    });

    const result = await approveHold('hold-1');

    expect(result.data).toBeNull();
    expect(result.error).toBe('Forbidden: admin access required');
  });

  it('rejectHold forbids non-admin callers', async () => {
    mockRequireAdmin.mockResolvedValue({
      supabase: {} as SupabaseClient,
      user: null,
      error: 'Forbidden: admin access required',
    });

    const result = await rejectHold('hold-1');

    expect(result.data).toBeNull();
    expect(result.error).toBe('Forbidden: admin access required');
  });

  it('approveHold refuses a Hold that is not pending', async () => {
    const { client } = makeSupabase({
      filming_requests: { row: { data: { ...HOLD, status: 'converted' }, error: null } },
    });
    asAdmin(client);

    const result = await approveHold('hold-1');

    expect(result.data).toBeNull();
    expect(result.error).toMatch(/pending/i);
  });
});

describe('rejectHold', () => {
  it('declines a pending Hold and notifies the client', async () => {
    const { client, calls } = makeSupabase({
      filming_requests: { row: { data: HOLD, error: null } },
    });
    asAdmin(client);

    const result = await rejectHold('hold-1');

    expect(result.error).toBeNull();
    expect(calls.filming_requests.updates[0]).toMatchObject({ status: 'declined' });
    expect(getClientUserIdFromClientId).toHaveBeenCalledWith('client-1');
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'client-user-1' }),
    );
  });
});
