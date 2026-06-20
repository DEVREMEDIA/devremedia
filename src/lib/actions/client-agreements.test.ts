import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth-helpers', () => ({
  requireAdmin: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import type { SupabaseClient, User } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth-helpers';
import {
  getClientAgreement,
  saveClientAgreement,
  getClientAgreementPrefill,
} from './client-agreements';

const mockRequireAdmin = vi.mocked(requireAdmin);

const CLIENT_ID = '11111111-1111-4111-8111-111111111111';
const PACKAGE_ID = '22222222-2222-4222-8222-222222222222';

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

function asForbidden() {
  mockRequireAdmin.mockResolvedValue({
    supabase: {} as SupabaseClient,
    user: null,
    error: 'Forbidden: admin access required',
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getClientAgreement', () => {
  it('returns the active agreement with its package', async () => {
    const row = {
      id: 'a1',
      client_id: CLIENT_ID,
      package_id: PACKAGE_ID,
      agreed_monthly_price: 1170,
      active: true,
      created_by: 'admin',
      created_at: 'now',
      updated_at: 'now',
      package: { id: PACKAGE_ID, name: 'Pack A', allowance_count: 2, allowance_unit: 'days' },
    };
    const { client, calls } = makeClient([{ data: row, error: null }]);
    asAdmin(client);

    const result = await getClientAgreement(CLIENT_ID);

    expect(result.error).toBeNull();
    expect(result.data).toEqual(row);
    expect(calls[0].table).toBe('client_agreements');
    expect(calls[0].q.eq).toHaveBeenCalledWith('client_id', CLIENT_ID);
    expect(calls[0].q.eq).toHaveBeenCalledWith('active', true);
  });

  it('returns null when the client has no active agreement', async () => {
    const { client } = makeClient([{ data: null, error: null }]);
    asAdmin(client);

    const result = await getClientAgreement(CLIENT_ID);

    expect(result.error).toBeNull();
    expect(result.data).toBeNull();
  });

  it('forbids non-admins', async () => {
    asForbidden();
    const result = await getClientAgreement(CLIENT_ID);
    expect(result.data).toBeNull();
    expect(result.error).toBe('Forbidden: admin access required');
  });
});

describe('saveClientAgreement', () => {
  const VALID = { client_id: CLIENT_ID, package_id: PACKAGE_ID, agreed_monthly_price: 1170 };

  it('inserts a new active agreement when the client has none', async () => {
    const inserted = { id: 'a1', ...VALID, active: true, package: null };
    const { client, calls } = makeClient([
      { data: null, error: null }, // no existing active
      { data: inserted, error: null }, // insert
    ]);
    asAdmin(client);

    const result = await saveClientAgreement(VALID);

    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({ id: 'a1', package_id: PACKAGE_ID });
    expect(calls[1].q.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: CLIENT_ID,
        package_id: PACKAGE_ID,
        agreed_monthly_price: 1170,
        active: true,
        created_by: 'admin',
      }),
    );
  });

  it('updates the existing active agreement in place (one active per client)', async () => {
    const updated = { id: 'a1', ...VALID, agreed_monthly_price: 1360, active: true, package: null };
    const { client, calls } = makeClient([
      { data: { id: 'a1' }, error: null }, // existing active
      { data: updated, error: null }, // update
    ]);
    asAdmin(client);

    const result = await saveClientAgreement({ ...VALID, agreed_monthly_price: 1360 });

    expect(result.error).toBeNull();
    expect(calls[1].q.update).toHaveBeenCalledWith(
      expect.objectContaining({ package_id: PACKAGE_ID, agreed_monthly_price: 1360, active: true }),
    );
    expect(calls[1].q.eq).toHaveBeenCalledWith('id', 'a1');
    // No insert should happen when updating
    expect(calls[1].q.insert).not.toHaveBeenCalled();
  });

  it('rejects invalid input without writing', async () => {
    const { client, calls } = makeClient([{ data: null, error: null }]);
    asAdmin(client);

    const result = await saveClientAgreement({ ...VALID, agreed_monthly_price: -5 });

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
    expect(calls.length).toBe(0);
  });

  it('forbids non-admins', async () => {
    asForbidden();
    const result = await saveClientAgreement(VALID);
    expect(result.data).toBeNull();
    expect(result.error).toBe('Forbidden: admin access required');
  });
});

describe('getClientAgreementPrefill', () => {
  it('returns price and the matched package from the latest signed contract', async () => {
    const { client, calls } = makeClient([
      {
        data: { id: 'c1', service_type: 'Pack A', agreed_amount: 1170, signed_at: 'd' },
        error: null,
      },
      {
        data: [
          { id: PACKAGE_ID, name: 'Pack A' },
          { id: 'other', name: 'Pack B' },
        ],
        error: null,
      },
    ]);
    asAdmin(client);

    const result = await getClientAgreementPrefill(CLIENT_ID);

    expect(result.error).toBeNull();
    expect(result.data).toEqual({
      agreed_monthly_price: 1170,
      package_id: PACKAGE_ID,
      service_type: 'Pack A',
    });
    expect(calls[0].table).toBe('contracts');
    expect(calls[0].q.eq).toHaveBeenCalledWith('status', 'signed');
  });

  it('returns price with a null package when the service matches no package', async () => {
    const { client } = makeClient([
      {
        data: { id: 'c1', service_type: 'Mystery', agreed_amount: 999, signed_at: 'd' },
        error: null,
      },
      { data: [{ id: PACKAGE_ID, name: 'Pack A' }], error: null },
    ]);
    asAdmin(client);

    const result = await getClientAgreementPrefill(CLIENT_ID);

    expect(result.error).toBeNull();
    expect(result.data).toEqual({
      agreed_monthly_price: 999,
      package_id: null,
      service_type: 'Mystery',
    });
  });

  it('returns null when the client has no signed contract', async () => {
    const { client, calls } = makeClient([{ data: null, error: null }]);
    asAdmin(client);

    const result = await getClientAgreementPrefill(CLIENT_ID);

    expect(result.error).toBeNull();
    expect(result.data).toBeNull();
    // Should not query packages when there is no contract
    expect(calls.length).toBe(1);
  });

  it('forbids non-admins', async () => {
    asForbidden();
    const result = await getClientAgreementPrefill(CLIENT_ID);
    expect(result.data).toBeNull();
    expect(result.error).toBe('Forbidden: admin access required');
  });
});
