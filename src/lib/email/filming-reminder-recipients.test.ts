import { describe, it, expect, vi } from 'vitest';

import type { SupabaseClient } from '@supabase/supabase-js';
import { getFilmingReminderRecipients } from './filming-reminder-recipients';

type Result = { data: unknown; error: unknown };

// Chainable, awaitable Supabase query stub. Every builder method returns the
// same object; awaiting it resolves `result`.
function makeQuery(result: Result) {
  const q: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'in', 'order']) {
    q[m] = vi.fn(() => q);
  }
  q.then = (resolve: (r: Result) => unknown) => resolve(result);
  return q;
}

// nth `from()` call resolves the nth supplied result.
function makeClient(resultsByCall: Result[]) {
  const calls: Array<{ table: string; q: Record<string, unknown> }> = [];
  const from = vi.fn((table: string) => {
    const result = resultsByCall[calls.length] ?? { data: null, error: null };
    const q = makeQuery(result);
    calls.push({ table, q });
    return q;
  });
  return { client: { from } as unknown as SupabaseClient, calls };
}

const CLIENT_ID = '11111111-1111-4111-8111-111111111111';
const PACKAGE_ID = '22222222-2222-4222-8222-222222222222';

describe('getFilmingReminderRecipients', () => {
  it('returns a recipient with package content for an active client with an active agreement', async () => {
    const { client, calls } = makeClient([
      {
        data: [
          {
            client_id: CLIENT_ID,
            package: { id: PACKAGE_ID, name: 'Pack A', inclusions: ['8 videos', '2 days'] },
          },
        ],
        error: null,
      },
      {
        data: [
          {
            id: CLIENT_ID,
            email: 'a@example.com',
            contact_name: 'Acme',
            preferred_locale: 'en',
            status: 'active',
          },
        ],
        error: null,
      },
    ]);

    const recipients = await getFilmingReminderRecipients(client);

    expect(recipients).toEqual([
      {
        clientId: CLIENT_ID,
        email: 'a@example.com',
        contactName: 'Acme',
        locale: 'en',
        packageId: PACKAGE_ID,
        packageName: 'Pack A',
        packageDeliverables: '8 videos, 2 days',
      },
    ]);
    // Source of truth is agreements, not contracts.
    expect(calls[0].table).toBe('client_agreements');
    expect(calls[0].q.eq).toHaveBeenCalledWith('active', true);
    // Only active clients are fetched.
    expect(calls[1].table).toBe('clients');
    expect(calls[1].q.eq).toHaveBeenCalledWith('status', 'active');
  });

  it('returns no recipients when there are no active agreements', async () => {
    const { client, calls } = makeClient([{ data: [], error: null }]);

    const recipients = await getFilmingReminderRecipients(client);

    expect(recipients).toEqual([]);
    // Should not query clients when there are no agreements.
    expect(calls.length).toBe(1);
  });

  it('excludes a client whose active agreement exists but who is no longer active', async () => {
    const { client } = makeClient([
      {
        data: [
          {
            client_id: CLIENT_ID,
            package: { id: PACKAGE_ID, name: 'Pack A', inclusions: ['8 videos'] },
          },
        ],
        error: null,
      },
      // The `status = active` filter means an inactive client is simply absent.
      { data: [], error: null },
    ]);

    const recipients = await getFilmingReminderRecipients(client);

    expect(recipients).toEqual([]);
  });
});
