import { describe, it, expect } from 'vitest';
import { groupNotificationsByDay } from './notifications-grouping';
import type { Notification } from '@/types';

const notification = (overrides: Partial<Notification>): Notification => ({
  id: 'n1',
  user_id: 'u1',
  type: 'project_updates',
  title: 'Title',
  body: null,
  read: false,
  action_url: null,
  action_type: null,
  action_data: null,
  created_at: '2026-06-21T10:00:00Z',
  ...overrides,
});

// Reference "now": 21 Jun 2026, 12:00 UTC = 15:00 Athens (summer, UTC+3).
const NOW = new Date('2026-06-21T12:00:00Z');

describe('groupNotificationsByDay', () => {
  it('returns an empty array for empty input', () => {
    expect(groupNotificationsByDay([], NOW)).toEqual([]);
  });

  it('puts same-Athens-day notifications in the today bucket', () => {
    const items = [
      notification({ id: 'a', created_at: '2026-06-21T05:00:00Z' }),
      notification({ id: 'b', created_at: '2026-06-21T20:00:00Z' }),
    ];
    const result = groupNotificationsByDay(items, NOW);
    expect(result).toEqual([{ key: 'today', notifications: items }]);
  });

  it('splits notifications across today, yesterday and earlier in order', () => {
    const today = notification({ id: 'today', created_at: '2026-06-21T08:00:00Z' });
    const yesterday = notification({ id: 'yesterday', created_at: '2026-06-20T08:00:00Z' });
    const earlier = notification({ id: 'earlier', created_at: '2026-06-10T08:00:00Z' });

    const result = groupNotificationsByDay([today, yesterday, earlier], NOW);

    expect(result).toEqual([
      { key: 'today', notifications: [today] },
      { key: 'yesterday', notifications: [yesterday] },
      { key: 'earlier', notifications: [earlier] },
    ]);
  });

  it('omits empty buckets', () => {
    const earlier = notification({ id: 'earlier', created_at: '2026-01-01T08:00:00Z' });
    expect(groupNotificationsByDay([earlier], NOW)).toEqual([
      { key: 'earlier', notifications: [earlier] },
    ]);
  });

  it('preserves input order within a bucket', () => {
    const first = notification({ id: 'first', created_at: '2026-06-21T18:00:00Z' });
    const second = notification({ id: 'second', created_at: '2026-06-21T05:00:00Z' });
    const result = groupNotificationsByDay([first, second], NOW);
    expect(result[0].notifications.map((n) => n.id)).toEqual(['first', 'second']);
  });

  it('uses Athens midnight, not UTC midnight, for the day boundary', () => {
    // 20 Jun 2026 21:30 UTC = 21 Jun 00:30 Athens (UTC+3) -> belongs to "today".
    const justAfterAthensMidnight = notification({
      id: 'after',
      created_at: '2026-06-20T21:30:00Z',
    });
    // 20 Jun 2026 20:30 UTC = 20 Jun 23:30 Athens -> still "yesterday".
    const justBeforeAthensMidnight = notification({
      id: 'before',
      created_at: '2026-06-20T20:30:00Z',
    });

    const result = groupNotificationsByDay(
      [justAfterAthensMidnight, justBeforeAthensMidnight],
      NOW,
    );

    expect(result).toEqual([
      { key: 'today', notifications: [justAfterAthensMidnight] },
      { key: 'yesterday', notifications: [justBeforeAthensMidnight] },
    ]);
  });

  it('handles the spring DST transition (Athens jumps UTC+2 -> UTC+3)', () => {
    // DST began 29 Mar 2026 03:00 Athens. "now" = 29 Mar 12:00 UTC = 15:00 Athens.
    const dstNow = new Date('2026-03-29T12:00:00Z');
    // 28 Mar 22:30 UTC = 29 Mar 00:30 Athens (still UTC+2 just after midnight) -> today.
    const today = notification({ id: 'today', created_at: '2026-03-28T22:30:00Z' });
    // 28 Mar 21:30 UTC = 28 Mar 23:30 Athens -> yesterday.
    const yesterday = notification({ id: 'yesterday', created_at: '2026-03-28T21:30:00Z' });

    const result = groupNotificationsByDay([today, yesterday], dstNow);

    expect(result).toEqual([
      { key: 'today', notifications: [today] },
      { key: 'yesterday', notifications: [yesterday] },
    ]);
  });
});
