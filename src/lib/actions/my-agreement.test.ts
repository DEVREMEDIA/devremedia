import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth-helpers', () => ({
  requireUser: vi.fn(),
}));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import type { SupabaseClient, User } from '@supabase/supabase-js';
import { requireUser } from '@/lib/auth-helpers';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMyAgreement } from './my-agreement';

const mockRequireUser = vi.mocked(requireUser);
const mockCreateAdminClient = vi.mocked(createAdminClient);

const CLIENT_ID = '11111111-1111-4111-8111-111111111111';

type Result = { data: unknown; error: { message: string } | null };

// A chainable, awaitable Supabase query stub.
function makeQuery(result: Result) {
  const q: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'order', 'limit']) {
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

function asUser(userClient: unknown) {
  mockRequireUser.mockResolvedValue({
    supabase: userClient as SupabaseClient,
    user: { id: 'user-1' } as User,
    error: null,
  });
}

function asUnauthorized() {
  mockRequireUser.mockResolvedValue({
    supabase: {} as SupabaseClient,
    user: null,
    error: 'Unauthorized',
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getMyAgreement', () => {
  it("returns the client's package, inclusions, price and remaining allowance", async () => {
    const { client: userClient } = makeClient([{ data: { id: CLIENT_ID }, error: null }]);
    asUser(userClient);

    const { client: admin } = makeClient([
      {
        data: {
          agreed_monthly_price: 1170,
          package: {
            name: 'Pack A - 8 videos',
            inclusions: ['2 ημέρες γυρίσματα', '8 ready to use videos'],
            allowance_count: 2,
            allowance_unit: 'days',
          },
        },
        error: null,
      },
    ]);
    mockCreateAdminClient.mockReturnValue(admin as unknown as ReturnType<typeof createAdminClient>);

    const result = await getMyAgreement();

    expect(result.error).toBeNull();
    expect(result.data).toEqual({
      package_name: 'Pack A - 8 videos',
      inclusions: ['2 ημέρες γυρίσματα', '8 ready to use videos'],
      agreed_monthly_price: 1170,
      allowance: { count: 2, unit: 'days' },
      remaining_allowance: 2,
    });
  });

  it('returns null when the client has no active agreement (contact prompt)', async () => {
    const { client: userClient } = makeClient([{ data: { id: CLIENT_ID }, error: null }]);
    asUser(userClient);

    const { client: admin } = makeClient([{ data: null, error: null }]);
    mockCreateAdminClient.mockReturnValue(admin as unknown as ReturnType<typeof createAdminClient>);

    const result = await getMyAgreement();

    expect(result.error).toBeNull();
    expect(result.data).toBeNull();
  });

  it('returns null when the signed-in user is not a client', async () => {
    const { client: userClient } = makeClient([{ data: null, error: null }]);
    asUser(userClient);

    const result = await getMyAgreement();

    expect(result.error).toBeNull();
    expect(result.data).toBeNull();
    // No need to reach for the agreement when the user is not a client.
    expect(mockCreateAdminClient).not.toHaveBeenCalled();
  });

  it('only reads this client own active agreement', async () => {
    const { client: userClient } = makeClient([{ data: { id: CLIENT_ID }, error: null }]);
    asUser(userClient);

    const { client: admin, calls } = makeClient([
      {
        data: {
          agreed_monthly_price: 500,
          package: {
            name: 'Pack B',
            inclusions: [],
            allowance_count: 4,
            allowance_unit: 'slots',
          },
        },
        error: null,
      },
    ]);
    mockCreateAdminClient.mockReturnValue(admin as unknown as ReturnType<typeof createAdminClient>);

    await getMyAgreement();

    expect(calls[0].table).toBe('client_agreements');
    expect(calls[0].q.eq).toHaveBeenCalledWith('client_id', CLIENT_ID);
    expect(calls[0].q.eq).toHaveBeenCalledWith('active', true);
  });

  it('is unauthorized when there is no signed-in user', async () => {
    asUnauthorized();

    const result = await getMyAgreement();

    expect(result.data).toBeNull();
    expect(result.error).toBe('Unauthorized');
  });
});
