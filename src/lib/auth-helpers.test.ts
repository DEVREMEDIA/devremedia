import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));

import { createClient } from '@/lib/supabase/server';
import { requireUser } from './auth-helpers';

const mockCreateClient = vi.mocked(createClient);

function makeChainable(finalValue: { data: unknown }) {
  const chain: Record<string, unknown> = {};
  chain['select'] = () => chain;
  chain['eq'] = () => chain;
  chain['single'] = () => Promise.resolve(finalValue);
  chain['maybeSingle'] = () => Promise.resolve(finalValue);
  return chain;
}

function makeSupabase(user: unknown, profileData?: unknown) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    from: vi.fn(() => makeChainable({ data: profileData ?? null })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

import { requireAdmin, requireRole } from './auth-helpers';

describe('requireUser', () => {
  it('returns error Unauthorized when no session exists', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase(null) as never);

    const result = await requireUser();

    expect(result.error).toBe('Unauthorized');
    expect(result.user).toBeNull();
  });

  it('returns the user and supabase client when session exists', async () => {
    const user = { id: 'user-1', email: 'a@b.com' };
    mockCreateClient.mockResolvedValue(makeSupabase(user) as never);

    const result = await requireUser();

    expect(result.error).toBeNull();
    expect(result.user).toEqual(user);
  });
});

describe('requireAdmin', () => {
  it('returns error Unauthorized when no session exists', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase(null) as never);

    const result = await requireAdmin();

    expect(result.error).toBe('Unauthorized');
    expect(result.user).toBeNull();
  });

  it('returns Forbidden when user has employee role', async () => {
    const user = { id: 'user-2', email: 'emp@b.com' };
    mockCreateClient.mockResolvedValue(makeSupabase(user, { role: 'employee' }) as never);

    const result = await requireAdmin();

    expect(result.error).toBe('Forbidden: admin access required');
    expect(result.user).toBeNull();
  });

  it('returns Forbidden when user has client role', async () => {
    const user = { id: 'user-3', email: 'cli@b.com' };
    mockCreateClient.mockResolvedValue(makeSupabase(user, { role: 'client' }) as never);

    const result = await requireAdmin();

    expect(result.error).toBe('Forbidden: admin access required');
  });

  it('returns Forbidden when no profile row exists', async () => {
    const user = { id: 'user-4', email: 'x@b.com' };
    mockCreateClient.mockResolvedValue(makeSupabase(user, null) as never);

    const result = await requireAdmin();

    expect(result.error).toBe('Forbidden: admin access required');
  });

  it('returns user and supabase for admin role', async () => {
    const user = { id: 'user-5', email: 'adm@b.com' };
    mockCreateClient.mockResolvedValue(makeSupabase(user, { role: 'admin' }) as never);

    const result = await requireAdmin();

    expect(result.error).toBeNull();
    expect(result.user).toEqual(user);
  });

  it('returns user and supabase for super_admin role', async () => {
    const user = { id: 'user-6', email: 'sa@b.com' };
    mockCreateClient.mockResolvedValue(makeSupabase(user, { role: 'super_admin' }) as never);

    const result = await requireAdmin();

    expect(result.error).toBeNull();
    expect(result.user).toEqual(user);
  });
});

describe('requireRole', () => {
  it('returns error Unauthorized when no session exists', async () => {
    mockCreateClient.mockResolvedValue(makeSupabase(null) as never);

    const result = await requireRole(['salesman']);

    expect(result.error).toBe('Unauthorized');
    expect(result.user).toBeNull();
  });

  it('returns Forbidden when the role is not in the allowed list', async () => {
    const user = { id: 'user-7', email: 'cli@b.com' };
    mockCreateClient.mockResolvedValue(makeSupabase(user, { role: 'client' }) as never);

    const result = await requireRole(['salesman']);

    expect(result.error).toBe('Forbidden: insufficient permissions');
    expect(result.user).toBeNull();
  });

  it('returns Forbidden when no profile row exists', async () => {
    const user = { id: 'user-8', email: 'x@b.com' };
    mockCreateClient.mockResolvedValue(makeSupabase(user, null) as never);

    const result = await requireRole(['salesman']);

    expect(result.error).toBe('Forbidden: insufficient permissions');
  });

  it('returns the user when the role is allowed', async () => {
    const user = { id: 'user-9', email: 'sales@b.com' };
    mockCreateClient.mockResolvedValue(makeSupabase(user, { role: 'salesman' }) as never);

    const result = await requireRole(['salesman']);

    expect(result.error).toBeNull();
    expect(result.user).toEqual(user);
  });

  it('always allows admin and super_admin without listing them', async () => {
    for (const role of ['admin', 'super_admin']) {
      const user = { id: `user-${role}`, email: `${role}@b.com` };
      mockCreateClient.mockResolvedValue(makeSupabase(user, { role }) as never);

      const result = await requireRole(['salesman']);

      expect(result.error).toBeNull();
      expect(result.user).toEqual(user);
    }
  });
});
