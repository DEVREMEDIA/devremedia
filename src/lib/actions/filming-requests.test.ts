import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/actions/notifications', () => ({
  createNotificationForMany: vi.fn().mockResolvedValue(undefined),
  getAdminUserIds: vi.fn().mockResolvedValue(['admin-1']),
}));

import { createAdminClient } from '@/lib/supabase/admin';
import { createNotificationForMany, getAdminUserIds } from '@/lib/actions/notifications';
import { createPublicFilmingRequest } from './filming-requests';

const mockCreateAdminClient = vi.mocked(createAdminClient);

function makeAdminClient(insertResult: unknown) {
  const single = vi.fn().mockResolvedValue(insertResult);
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  return {
    client: { from: vi.fn().mockReturnValue({ insert }) },
    insert,
  };
}

describe('createPublicFilmingRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a lead from a contact-only submission and notifies admins', async () => {
    const { client, insert } = makeAdminClient({ data: { id: 'lead-1' }, error: null });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockCreateAdminClient.mockReturnValue(client as any);

    const result = await createPublicFilmingRequest({
      contact_name: 'Jane Doe',
      contact_email: 'jane@example.com',
      contact_phone: '+30 6900000000',
      contact_company: 'Acme',
      description: 'I would like a video.',
    });

    expect(result.error).toBeNull();
    expect(result.data).toEqual({ id: 'lead-1' });

    expect(client.from).toHaveBeenCalledWith('leads');
    const inserted = insert.mock.calls[0][0];
    expect(inserted).toMatchObject({
      contact_name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+30 6900000000',
      company_name: 'Acme',
      source: 'website',
      stage: 'new',
    });

    expect(getAdminUserIds).toHaveBeenCalled();
    expect(createNotificationForMany).toHaveBeenCalledWith(
      ['admin-1'],
      expect.objectContaining({ actionUrl: '/admin/leads' }),
    );
  });

  it('rejects an invalid submission without writing a lead', async () => {
    const { client, insert } = makeAdminClient({ data: { id: 'lead-1' }, error: null });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockCreateAdminClient.mockReturnValue(client as any);

    const result = await createPublicFilmingRequest({
      contact_name: '',
      contact_email: 'not-an-email',
    });

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
    expect(insert).not.toHaveBeenCalled();
  });
});
