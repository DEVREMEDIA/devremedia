import type { Notification } from '@/types';

// All day-bucketing logic for the Notifications page lives here so server
// actions and components stay free of date math. Days are computed in
// Europe/Athens (consistent with migration 00046's Athens convention).

const ATHENS_TZ = 'Europe/Athens';

export type NotificationDayGroupKey = 'today' | 'yesterday' | 'earlier';

export interface NotificationDayGroup {
  key: NotificationDayGroupKey;
  notifications: Notification[];
}

// 'YYYY-MM-DD' calendar date in Europe/Athens for the given instant.
function athensDateKey(date: Date): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ATHENS_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

// The calendar date before the given 'YYYY-MM-DD' key. Treating the key as
// noon UTC keeps the subtraction DST-safe (offset shifts never cross noon).
function previousDateKey(key: string): string {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Groups notifications into ordered Today / Yesterday / Earlier buckets using
// Europe/Athens day boundaries. `now` is injected for testability. Input order
// is preserved within and across groups (the caller orders by created_at desc),
// and empty buckets are omitted.
export function groupNotificationsByDay(
  notifications: Notification[],
  now: Date,
): NotificationDayGroup[] {
  const todayKey = athensDateKey(now);
  const yesterdayKey = previousDateKey(todayKey);

  const today: Notification[] = [];
  const yesterday: Notification[] = [];
  const earlier: Notification[] = [];

  for (const notification of notifications) {
    const key = athensDateKey(new Date(notification.created_at));
    if (key === todayKey) today.push(notification);
    else if (key === yesterdayKey) yesterday.push(notification);
    else earlier.push(notification);
  }

  const groups: NotificationDayGroup[] = [];
  if (today.length) groups.push({ key: 'today', notifications: today });
  if (yesterday.length) groups.push({ key: 'yesterday', notifications: yesterday });
  if (earlier.length) groups.push({ key: 'earlier', notifications: earlier });
  return groups;
}
