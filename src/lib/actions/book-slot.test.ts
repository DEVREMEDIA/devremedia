import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth-helpers', () => ({
  requireUser: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/actions/notifications', () => ({
  getAdminUserIds: vi.fn(() => Promise.resolve(['admin-1', 'admin-2'])),
  createNotificationForMany: vi.fn(() => Promise.resolve()),
}));

import type { SupabaseClient, User } from '@supabase/supabase-js';
import { requireUser } from '@/lib/auth-helpers';
import { getAdminUserIds, createNotificationForMany } from '@/lib/actions/notifications';
import { bookSlot } from './book-slot';

const mockRequireUser = vi.mocked(requireUser);
const mockCreateNotificationForMany = vi.mocked(createNotificationForMany);

type RpcResult = { data: unknown; error: { message: string } | null };

/** A fake Supabase client whose rpc() resolves the supplied result. */
function makeClient(rpcResult: RpcResult) {
  const rpc = vi.fn(() => Promise.resolve(rpcResult));
  return { client: { rpc } as unknown as SupabaseClient, rpc };
}

function asUser(client: SupabaseClient) {
  mockRequireUser.mockResolvedValue({
    supabase: client,
    user: { id: 'user-1' } as User,
    error: null,
  });
}

const VALID = {
  date: '2099-01-15',
  slot_id: '11111111-1111-4111-8111-111111111111',
  location: 'Studio A',
  note: 'Bring the drone',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('bookSlot', () => {
  it('calls the book_slot RPC with the booking inputs and returns the new Hold id', async () => {
    const { client, rpc } = makeClient({ data: 'hold-123', error: null });
    asUser(client);

    const result = await bookSlot(VALID);

    expect(result.error).toBeNull();
    expect(result.data).toEqual({ id: 'hold-123' });
    expect(rpc).toHaveBeenCalledWith('book_slot', {
      p_date: VALID.date,
      p_slot_id: VALID.slot_id,
      p_location: VALID.location,
      p_note: VALID.note,
    });
  });

  it('notifies admins after a successful booking', async () => {
    const { client } = makeClient({ data: 'hold-123', error: null });
    asUser(client);

    await bookSlot(VALID);

    expect(getAdminUserIds).toHaveBeenCalled();
    expect(mockCreateNotificationForMany).toHaveBeenCalledWith(
      ['admin-1', 'admin-2'],
      expect.objectContaining({ type: 'booking_submitted' }),
    );
  });

  it('rejects a booking that would exceed the remaining Allowance with a clear message', async () => {
    const { client, rpc } = makeClient({
      data: null,
      error: { message: 'allowance_exceeded' },
    });
    asUser(client);

    const result = await bookSlot(VALID);

    expect(result.data).toBeNull();
    expect(result.error).toMatch(/allowance/i);
    expect(rpc).toHaveBeenCalled();
    expect(mockCreateNotificationForMany).not.toHaveBeenCalled();
  });

  it('reports a clear message when the slot is already at Capacity', async () => {
    const { client } = makeClient({
      data: null,
      error: { message: 'capacity_full' },
    });
    asUser(client);

    const result = await bookSlot(VALID);

    expect(result.data).toBeNull();
    expect(result.error).toMatch(/capacity|full|no longer available/i);
    expect(mockCreateNotificationForMany).not.toHaveBeenCalled();
  });

  it('validates input and does not call the RPC when the slot id is missing', async () => {
    const { client, rpc } = makeClient({ data: null, error: null });
    asUser(client);

    const result = await bookSlot({ date: '2099-01-15' });

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('forbids unauthenticated callers', async () => {
    mockRequireUser.mockResolvedValue({
      supabase: {} as SupabaseClient,
      user: null,
      error: 'Unauthorized',
    });

    const result = await bookSlot(VALID);

    expect(result.data).toBeNull();
    expect(result.error).toBe('Unauthorized');
  });
});
